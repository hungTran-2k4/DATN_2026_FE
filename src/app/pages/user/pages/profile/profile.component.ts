import { CommonModule, NgOptimizedImage } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  FormsModule,
  Validators,
} from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { RadioButtonModule } from 'primeng/radiobutton';
import { ToastModule } from 'primeng/toast';
import { AuthSessionService } from '../../../../core/services/auth-session.service';
import {
  ApiBaseService,
  CreateShopCommand,
  UpdateProfileRequest,
} from '../../../../shared/api/generated/api-service-base.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    ButtonModule,
    InputTextModule,
    RadioButtonModule,
    ToastModule,
    NgOptimizedImage,
  ],
  providers: [MessageService],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
})
export class ProfileComponent implements OnInit {
  activeMenu:
    | 'profile'
    | 'shop'
    | 'bank'
    | 'address'
    | 'password'
    | 'settings'
    | 'privacy'
    | 'purchases'
    | 'vouchers'
    | 'coins' = 'profile';
  activeGroup: 'account' | 'others' = 'account';

  profileForm!: FormGroup;
  shopForm!: FormGroup;

  isSavingProfile = false;
  isSavingShop = false;

  userName = '';
  userEmail = '';
  avatarInitials = '';
  avatarUrl = '';
  sessionUserName = '';

  constructor(
    private readonly fb: FormBuilder,
    private readonly api: ApiBaseService,
    public readonly authSession: AuthSessionService,
    private readonly messageService: MessageService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    const session = this.authSession.getSession();
    if (session) {
      this.sessionUserName = session.userName || '';
      this.userName = session.userName || 'Tài khoản';
      this.userEmail = session.userEmail || '';
      this.avatarInitials = (this.userName ||
        this.userEmail ||
        'U')[0].toUpperCase();
    }

    this.profileForm = this.fb.group({
      fullName: [this.userName, Validators.required],
      avatarUrl: [''],
      gender: ['Nam'],
    });

    this.profileForm.get('avatarUrl')?.valueChanges.subscribe((val) => {
      this.avatarUrl = val;
    });

    this.shopForm = this.fb.group({
      name: ['', Validators.required],
      slug: ['', Validators.required],
      description: [''],
    });

    this.loadProfile();
  }

  loadProfile(): void {
    this.api.profileGET().subscribe({
      next: (res: any) => {
        if (res.data) {
          this.userName = res.data.fullName || 'Tài khoản';
          this.userEmail = res.data.email || '';
          this.avatarInitials = (this.userName ||
            this.userEmail ||
            'U')[0].toUpperCase();
          this.avatarUrl = res.data.avatarUrl || '';

          this.profileForm.patchValue({
            fullName: res.data.fullName,
            avatarUrl: res.data.avatarUrl,
            gender: 'Nam', // Mock gender value
          });
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
    const obfuscatedName = name.substring(0, 2) + '*'.repeat(name.length - 2);
    return `${obfuscatedName}@${domain}`;
  }

  saveProfile(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    this.isSavingProfile = true;
    const formValue = this.profileForm.value;
    const request = new UpdateProfileRequest({
      fullName: formValue.fullName,
      avatarUrl: formValue.avatarUrl || undefined,
    });

    this.api.profilePUT(request).subscribe({
      next: (res: any) => {
        this.isSavingProfile = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Thành công',
          detail: 'Đã cập nhật thông tin cá nhân.',
        });
        const session = this.authSession.getSession();
        if (session && res.data) {
          session.userName = res.data.fullName;
          this.sessionUserName = res.data.fullName;
        }
        this.loadProfile();
      },
      error: () => {
        this.isSavingProfile = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Lỗi',
          detail: 'Không thể cập nhật hồ sơ.',
        });
      },
    });
  }

  registerShop(): void {
    if (this.shopForm.invalid) {
      this.shopForm.markAllAsTouched();
      return;
    }

    this.isSavingShop = true;
    const formValue = this.shopForm.value;
    const request = new CreateShopCommand({
      name: formValue.name,
      slug: formValue.slug,
      description: formValue.description,
    });

    this.api.shopsPOST(request).subscribe({
      next: () => {
        this.isSavingShop = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Đăng ký thành công',
          detail: 'Cửa hàng của bạn đã được tạo!',
        });
        this.shopForm.reset();
      },
      error: () => {
        this.isSavingShop = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Lỗi',
          detail: 'Không thể tạo cửa hàng lúc này.',
        });
      },
    });
  }

  uploadAvatar(): void {
    const newUrl = prompt('Nhập URL ảnh đại diện của bạn:', this.avatarUrl);
    if (newUrl !== null) {
      this.profileForm.patchValue({ avatarUrl: newUrl });
    }
  }

  setMenu(group: 'account' | 'others', menu: any) {
    this.activeGroup = group;
    this.activeMenu = menu;
  }
}
