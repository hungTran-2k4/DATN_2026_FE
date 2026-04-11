import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { Observable } from 'rxjs';
import { AuthSessionService } from '../../../../core/services/auth-session.service';
import { ApiBaseService, CreateShopCommand, UpdateProfileRequest } from '../../../../shared/api/generated/api-service-base.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    ToastModule
  ],
  providers: [MessageService],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss'
})
export class ProfileComponent implements OnInit {
  activeMenu: 'profile' | 'shop' = 'profile';

  profileForm!: FormGroup;
  shopForm!: FormGroup;

  isSavingProfile = false;
  isSavingShop = false;

  userName = '';
  userEmail = '';
  avatarInitials = '';
  avatarUrl = '';

  constructor(
    private readonly fb: FormBuilder,
    private readonly api: ApiBaseService,
    public readonly authSession: AuthSessionService,
    private readonly messageService: MessageService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    const session = this.authSession.getSession();
    if (session) {
      this.userName = session.userName || 'Tài khoản';
      this.userEmail = session.userEmail || '';
      this.avatarInitials = (this.userName || this.userEmail || 'U')[0].toUpperCase();
    }

    this.profileForm = this.fb.group({
      fullName: [this.userName, Validators.required],
      avatarUrl: ['']
    });

    this.shopForm = this.fb.group({
      name: ['', Validators.required],
      slug: ['', Validators.required],
      description: ['']
    });

    this.loadProfile();
  }

  loadProfile(): void {
    this.api.profileGET().subscribe({
      next: (res: any) => {
        if (res.data) {
          this.userName = res.data.fullName || 'Tài khoản';
          this.userEmail = res.data.email || '';
          this.avatarInitials = (this.userName || this.userEmail || 'U')[0].toUpperCase();
          this.avatarUrl = res.data.avatarUrl || '';

          this.profileForm.patchValue({
            fullName: res.data.fullName,
            avatarUrl: res.data.avatarUrl
          });
        }
      }
    });
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
      avatarUrl: formValue.avatarUrl || undefined
    });

    this.api.profilePUT(request).subscribe({
      next: (res: any) => {
        this.isSavingProfile = false;
        this.messageService.add({ severity: 'success', summary: 'Thành công', detail: 'Đã cập nhật thông tin cá nhân.' });
        // Cập nhật session local
        const session = this.authSession.getSession();
        if (session && res.data) {
          session.userName = res.data.fullName;
          // Note: we can't fully construct AuthResponse here safely without token, 
          // but we can mutate local storage manually or trigger a profile reload in authFacade.
          // For now, simpler to just trigger full reload or partially update session.
        }
        this.loadProfile();
      },
      error: () => {
        this.isSavingProfile = false;
        this.messageService.add({ severity: 'error', summary: 'Lỗi', detail: 'Không thể cập nhật hồ sơ.' });
      }
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
      description: formValue.description
    });

    this.api.shopsPOST(request).subscribe({
      next: () => {
        this.isSavingShop = false;
        this.messageService.add({ severity: 'success', summary: 'Đăng ký thành công', detail: 'Cửa hàng của bạn đã được tạo!' });
        this.shopForm.reset();
        
        // Wait a bit and redirect the user back or to admin/seller dashboard
        setTimeout(() => {
           // We might need them to log in again to get Seller roles, or force refresh token.
           // For now just notify stringly.
        }, 1500);
      },
      error: () => {
        this.isSavingShop = false;
        this.messageService.add({ severity: 'error', summary: 'Lỗi', detail: 'Không thể tạo cửa hàng lúc này.' });
      }
    });
  }
}
