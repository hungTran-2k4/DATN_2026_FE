import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { MenuItem, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { MenuModule } from 'primeng/menu';
import { ToastModule } from 'primeng/toast';
import {
  ApiBaseService,
  UpdateProfileRequest,
} from '../../../api/generated/api-service-base.service';
import { AuthSessionService } from '../../../../core/services/auth-session.service';

interface AdminNavItem {
  label: string;
  icon: string;
  route: string;
}

interface AdminProfileForm {
  fullName: string;
  avatarUrl: string;
}

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    ButtonModule,
    DialogModule,
    InputTextModule,
    MenuModule,
    ToastModule,
  ],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.scss',
})
export class AdminLayoutComponent implements OnInit {
  readonly lastSyncLabel = new Date().toLocaleString('vi-VN');

  readonly navItems: AdminNavItem[] = [
    { label: 'Dashboard', icon: 'pi pi-chart-line', route: '/admin/dashboard' },
    { label: 'Nguoi dung', icon: 'pi pi-users', route: '/admin/users' },
    { label: 'Shop', icon: 'pi pi-shop', route: '/admin/shops' },
    { label: 'San pham', icon: 'pi pi-box', route: '/admin/products' },
    { label: 'Danh muc', icon: 'pi pi-tags', route: '/admin/catalog' },
  ];

  adminName = 'Admin';
  adminEmail = '';
  adminAvatarUrl = '';

  profileDialogVisible = false;
  savingProfile = false;
  loggingOut = false;

  readonly profileForm: AdminProfileForm = {
    fullName: '',
    avatarUrl: '',
  };

  readonly userMenuItems: MenuItem[] = [
    {
      label: 'Quan ly thong tin',
      icon: 'pi pi-user-edit',
      command: () => this.openProfileDialog(),
    },
    {
      separator: true,
    },
    {
      label: 'Dang xuat',
      icon: 'pi pi-sign-out',
      command: () => this.logout(),
    },
  ];

  constructor(
    private readonly api: ApiBaseService,
    private readonly authSession: AuthSessionService,
    private readonly messageService: MessageService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.bindFromSession();
    this.loadMyProfile();
  }

  get adminInitials(): string {
    const seed = (this.adminName || this.adminEmail || 'AD').trim();
    return seed
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('')
      .slice(0, 2);
  }

  openProfileDialog(): void {
    this.profileForm.fullName = this.adminName;
    this.profileForm.avatarUrl = this.adminAvatarUrl;
    this.profileDialogVisible = true;
  }

  saveProfile(): void {
    if (this.savingProfile) {
      return;
    }

    const fullName = this.profileForm.fullName.trim();
    if (!fullName) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Thieu du lieu',
        detail: 'Vui long nhap ho ten.',
      });
      return;
    }

    this.savingProfile = true;
    const payload = new UpdateProfileRequest({
      fullName,
      avatarUrl: this.profileForm.avatarUrl.trim() || undefined,
    });

    this.api.profilePUT(payload).subscribe({
      next: (res) => {
        this.savingProfile = false;
        if (res?.data) {
          this.bindProfile(
            res.data.fullName,
            res.data.email,
            res.data.avatarUrl,
          );
        } else {
          this.bindProfile(
            fullName,
            this.adminEmail,
            this.profileForm.avatarUrl,
          );
        }
        this.profileDialogVisible = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Thanh cong',
          detail: 'Da cap nhat thong tin admin.',
        });
      },
      error: () => {
        this.savingProfile = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Loi',
          detail: 'Khong cap nhat duoc thong tin. Thu lai sau.',
        });
      },
    });
  }

  logout(): void {
    if (this.loggingOut) {
      return;
    }

    this.loggingOut = true;
    this.api.logout().subscribe({
      next: () => this.finishLogout(),
      error: () => this.finishLogout(),
    });
  }

  private finishLogout(): void {
    this.loggingOut = false;
    this.authSession.clearSession();
    this.messageService.add({
      severity: 'info',
      summary: 'Da dang xuat',
      detail: 'Phien lam viec da ket thuc.',
    });
    void this.router.navigate(['/auth/login']);
  }

  private loadMyProfile(): void {
    this.api.profileGET().subscribe({
      next: (res) => {
        if (!res?.data) {
          return;
        }
        this.bindProfile(res.data.fullName, res.data.email, res.data.avatarUrl);
      },
      error: () => {
        // Keep session fallback values when profile endpoint is unavailable.
      },
    });
  }

  private bindFromSession(): void {
    const session = this.authSession.getSession();
    this.bindProfile(session?.userName, session?.userEmail, undefined);
  }

  private bindProfile(
    fullName?: string,
    email?: string,
    avatarUrl?: string,
  ): void {
    this.adminName = (fullName ?? '').trim() || 'Admin';
    this.adminEmail = (email ?? '').trim();
    this.adminAvatarUrl = (avatarUrl ?? '').trim();
  }
}
