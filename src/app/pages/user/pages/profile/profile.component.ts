import { CommonModule, NgOptimizedImage } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import {
  FormBuilder, FormGroup, ReactiveFormsModule, FormsModule, Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { RadioButtonModule } from 'primeng/radiobutton';
import { ToastModule } from 'primeng/toast';
import { AuthSessionService } from '../../../../core/services/auth-session.service';
import {
  ApiBaseService,
  UpdateProfileRequest,
} from '../../../../shared/api/generated/api-service-base.service';
import { SellerRegistrationService } from '../../../../features/seller-registration/model/seller-registration.service';
import { Observable } from 'rxjs';
import { SellerRegistrationState } from '../../../../entities/seller/model/seller.model';
import { UserOrdersComponent } from './user-orders/user-orders.component';


@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule,
    RouterLink, ButtonModule, InputTextModule, RadioButtonModule, ToastModule, NgOptimizedImage,
    UserOrdersComponent
  ],
  providers: [MessageService],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
})
export class ProfileComponent implements OnInit {
  activeMenu:
    | 'profile' | 'bank' | 'address' | 'password'
    | 'settings' | 'privacy' | 'purchases' | 'vouchers' | 'coins' = 'profile';
  activeGroup: 'account' | 'others' = 'account';

  profileForm!: FormGroup;
  isSavingProfile = false;

  userName = '';
  userEmail = '';
  avatarInitials = '';
  avatarUrl = '';
  sessionUserName = '';

  // Seller state — chỉ dùng để hiển thị badge/link trong sidebar
  sellerState$!: Observable<SellerRegistrationState>;

  constructor(
    private readonly fb: FormBuilder,
    private readonly api: ApiBaseService,
    public readonly authSession: AuthSessionService,
    private readonly messageService: MessageService,
    private readonly sellerService: SellerRegistrationService,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    // Read tab from query params
    this.route.queryParams.subscribe(params => {
      const tab = params['tab'];
      if (tab) {
        this.activeMenu = tab.toLowerCase() as any;
        // If tab is under 'others' group
        if (['purchases', 'vouchers', 'coins'].includes(tab)) {
           this.activeGroup = 'others';
        } else {
           this.activeGroup = 'account';
        }
      }
    });

    const session = this.authSession.getSession();
    if (session) {
      this.sessionUserName = session.userName || '';
      this.userName = session.userName || 'Tài khoản';
      this.userEmail = session.userEmail || '';
      this.avatarInitials = (this.userName || this.userEmail || 'U')[0].toUpperCase();
    }

    this.profileForm = this.fb.group({
      fullName: [this.userName, Validators.required],
      avatarUrl: [''],
      gender: ['Nam'],
    });

    this.profileForm.get('avatarUrl')?.valueChanges.subscribe((val) => {
      this.avatarUrl = val;
    });

    this.loadProfile();

    // Chỉ cần state để hiển thị badge trên menu item
    this.sellerState$ = this.sellerService.state$;
    this.sellerService.initState();
  }

  loadProfile(): void {
    this.api.profileGET().subscribe({
      next: (res: any) => {
        if (res.data) {
          this.userName = res.data.fullName || 'Tài khoản';
          this.userEmail = res.data.email || '';
          this.avatarInitials = (this.userName || this.userEmail || 'U')[0].toUpperCase();
          this.avatarUrl = res.data.avatarUrl || '';
          this.authSession.updateUserSession(res.data);
          this.profileForm.patchValue({ fullName: res.data.fullName, avatarUrl: res.data.avatarUrl, gender: 'Nam' });
        }
      },
    });
  }

  obfuscateEmail(email: string): string {
    if (!email) return '';
    const parts = email.split('@');
    if (parts.length !== 2) return email;
    const name = parts[0];
    const domain = parts[1];
    if (name.length <= 2) return `***@${domain}`;
    return name.substring(0, 2) + '*'.repeat(name.length - 2) + '@' + domain;
  }

  saveProfile(): void {
    if (this.profileForm.invalid) { this.profileForm.markAllAsTouched(); return; }
    this.isSavingProfile = true;
    const formValue = this.profileForm.value;
    this.api.profilePUT(new UpdateProfileRequest({ fullName: formValue.fullName, avatarUrl: formValue.avatarUrl || undefined })).subscribe({
      next: (res: any) => {
        this.isSavingProfile = false;
        this.messageService.add({ severity: 'success', summary: 'Thành công', detail: 'Đã cập nhật thông tin cá nhân.' });
        if (res.data) { this.authSession.updateUserSession(res.data); this.sessionUserName = res.data.fullName; }
        this.loadProfile();
      },
      error: () => {
        this.isSavingProfile = false;
        this.messageService.add({ severity: 'error', summary: 'Lỗi', detail: 'Không thể cập nhật hồ sơ.' });
      },
    });
  }

  /** Điều hướng đến Seller Center — tự động chọn đúng trang theo trạng thái */
  goToSellerCenter(): void {
    if (this.authSession.isSeller()) {
      this.router.navigateByUrl('/seller/dashboard');
    } else {
      this.router.navigateByUrl('/seller/onboarding');
    }
  }

  onFileSelected(event: any): void {
    const file: File = event.target.files[0];
    if (file) {
      if (file.size > 1024 * 1024) {
        this.messageService.add({ severity: 'error', summary: 'Lỗi', detail: 'Dung lượng file tối đa là 1MB.' });
        return;
      }
      
      this.api.avatar({ data: file, fileName: file.name }).subscribe({
        next: (res) => {
          if (res.data) {
            this.profileForm.patchValue({ avatarUrl: res.data.avatarUrl });
            this.avatarUrl = res.data.avatarUrl || '';
            this.authSession.updateUserSession(res.data);
            this.messageService.add({ severity: 'success', summary: 'Thành công', detail: 'Đã tải ảnh lên thành công.' });
          }
        },
        error: () => {
          this.messageService.add({ severity: 'error', summary: 'Lỗi', detail: 'Không thể tải ảnh lên.' });
        }
      });
    }
  }

  setMenu(group: 'account' | 'others', menu: any) {
    this.activeGroup = group;
    this.activeMenu = menu;
  }
}
