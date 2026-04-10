import { AsyncPipe, CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { map, Observable } from 'rxjs';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { MultiSelectModule } from 'primeng/multiselect';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';

import {
  RoleDto,
  UserDto,
} from '../../../../shared/api/generated/api-service-base.service';
import { AdminExportService } from '../../../../core/services/admin-export.service';
import { AdminUsersFacade } from '../../services/admin-users.facade';

@Component({
  selector: 'app-admin-users-page',
  standalone: true,
  imports: [
    CommonModule,
    AsyncPipe,
    FormsModule,
    ButtonModule,
    IconFieldModule,
    InputIconModule,
    InputTextModule,
    TableModule,
    TagModule,
    DialogModule,
    MultiSelectModule,
    ConfirmDialogModule,
    TooltipModule,
  ],
  providers: [ConfirmationService],
  templateUrl: './users.component.html',
  styleUrl: './users.component.scss',
})
export class AdminUsersPageComponent {
  keyword = '';

  users: UserDto[] = [];
  totalRecords = 0;

  // Pagination config for users
  rows = 10;
  first = 0;
  reportTemplate = 'Hiển thị {first} - {last} / {totalRecords} bản ghi';

  // Overview Stats
  userStats$!: Observable<{
    total: number;
    activeUsers: number;
    noRoleUsers: number;
  }>;

  // Menu for row actions
  rowUser: UserDto | null = null;

  // Dialog states
  detailDialogVisible = false;
  rolesDialogVisible = false;
  selectedUser: UserDto | null = null;

  selectedRoles: string[] = [];
  availableRoles: RoleDto[] = [];
  savingRoles = false;

  // Create User
  createDialogVisible = false;
  creatingUser = false;
  newUser = {
    email: '',
    fullName: '',
    phoneNumber: '',
    roleIds: [] as string[],
  };

  constructor(
    private readonly usersFacade: AdminUsersFacade,
    private readonly exportService: AdminExportService,
    private readonly messageService: MessageService,
    private readonly confirmationService: ConfirmationService,
  ) {
    this.rebindStats();
    this.loadRoles();
    this.loadUsers();
  }

  loadUsers(event?: TableLazyLoadEvent): void {
    this.rows = event?.rows ?? this.rows;
    this.first = event?.first ?? this.first;
    const page = Math.floor(this.first / this.rows) + 1;

    this.usersFacade
      .getUsers(this.keyword, page, this.rows)
      .subscribe((res) => {
        if (res) {
          this.users = res.data ?? [];
          this.totalRecords = res.totalRecords ?? 0;
        } else {
          this.users = [];
          this.totalRecords = 0;
        }
      });
  }

  loadRoles(): void {
    this.usersFacade.getRoles().subscribe((roles) => {
      this.availableRoles = roles;
    });
  }

  reloadUsers(): void {
    this.loadUsers();
    this.rebindStats();
    this.messageService.add({
      severity: 'success',
      summary: 'Thành công',
      detail: 'Dữ liệu người dùng đã được làm mới.',
    });
  }

  exportCurrentUsers(): void {
    this.usersFacade.getUsers(this.keyword, 1, 1000).subscribe((res) => {
      if (res && res.data) {
        this.exportService.exportCsv('admin-users', res.data, [
          { header: 'ID', value: (u) => u.id },
          { header: 'Email', value: (u) => u.email },
          { header: 'Họ tên', value: (u) => u.fullName },
          { header: 'Roles', value: (u) => this.formatRoles(u.roles) },
          { header: 'Trạng thái', value: (u) => u.status },
        ]);
        this.messageService.add({
          severity: 'info',
          summary: 'Đã xuất CSV',
          detail: `Đã xuất ${res.data.length} dòng dữ liệu người dùng.`,
        });
      }
    });
  }

  private rebindStats(): void {
    this.userStats$ = this.usersFacade.getUsers('', 1, 1000).pipe(
      map((res) => {
        const data = res?.data ?? [];

        return {
          total: res?.totalRecords ?? data.length,
          activeUsers: data.filter(
            (user) => (user.status ?? '').toLowerCase() === 'active',
          ).length,
          noRoleUsers: data.filter((user) => !user.roles?.length).length,
        };
      }),
    );
  }

  resetFilter(): void {
    this.keyword = '';
    this.first = 0;
    this.loadUsers();
  }

  onKeywordChange(): void {
    this.first = 0;
    this.loadUsers();
  }

  private normalizeStatus(status?: string): string {
    return (status ?? '').trim().toLowerCase();
  }

  isActive(user: UserDto): boolean {
    return this.normalizeStatus(user.status) === 'active';
  }

  isLocked(user: UserDto): boolean {
    return this.normalizeStatus(user.status) === 'locked';
  }

  isDeactivated(user: UserDto): boolean {
    return this.normalizeStatus(user.status) === 'deactivated';
  }

  openRolesDialog(user: UserDto): void {
    this.selectedUser = user;
    this.selectedRoles = this.availableRoles
      .filter((r) => r.name && user.roles?.includes(r.name))
      .map((r) => r.id!);
    this.rolesDialogVisible = true;
  }

  lockUser(user: UserDto): void {
    this.rowUser = user;
    this.confirmLockUser();
  }

  unlockUser(user: UserDto): void {
    this.rowUser = user;
    this.confirmUnlockUser();
  }

  deactivateUser(user: UserDto): void {
    this.rowUser = user;
    this.confirmDeactivateUser();
  }

  activateUser(user: UserDto): void {
    this.rowUser = user;
    this.confirmActivateUser();
  }

  resetPassword(user: UserDto): void {
    this.rowUser = user;
    this.confirmResetPassword();
  }

  // --- ACTIONS ---

  private confirmLockUser(): void {
    if (!this.rowUser) return;
    this.confirmationService.confirm({
      message: `Bạn có chắc chắn muốn khóa người dùng ${this.rowUser.email}?`,
      header: 'Xác nhận Khóa',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Đồng ý',
      rejectLabel: 'Hủy',
      accept: () => {
        this.usersFacade.lockUser(this.rowUser!.id!).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Thành công',
              detail: 'Đã khóa tài khoản.',
            });
            this.loadUsers();
          },
          error: () =>
            this.messageService.add({
              severity: 'error',
              summary: 'Lỗi',
              detail: 'Không thể khóa tài khoản lúc này.',
            }),
        });
      },
    });
  }

  private confirmUnlockUser(): void {
    if (!this.rowUser) return;
    this.usersFacade.unlockUser(this.rowUser.id!).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Thành công',
          detail: 'Đã mở khóa tài khoản.',
        });
        this.loadUsers();
      },
      error: () =>
        this.messageService.add({
          severity: 'error',
          summary: 'Lỗi',
          detail: 'Lỗi khi mở khóa.',
        }),
    });
  }

  private confirmDeactivateUser(): void {
    if (!this.rowUser) return;
    this.confirmationService.confirm({
      message: `Vô hiệu hóa sẽ làm mất mát phiên đăng nhập và khả năng truy cập của ${this.rowUser.email}. Tiếp tục?`,
      header: 'Vô hiệu hóa Tài khoản',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      acceptLabel: 'Đồng ý',
      rejectLabel: 'Hủy',
      accept: () => {
        this.usersFacade.deactivateUser(this.rowUser!.id!).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Thành công',
              detail: 'Đã vô hiệu hóa tài khoản.',
            });
            this.loadUsers();
          },
          error: () =>
            this.messageService.add({
              severity: 'error',
              summary: 'Lỗi',
              detail: 'Gặp sự cố khi vô hiệu hóa.',
            }),
        });
      },
    });
  }

  private confirmActivateUser(): void {
    if (!this.rowUser) return;
    this.usersFacade.activateUser(this.rowUser.id!).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Thành công',
          detail: 'Tài khoản đã được kích hoạt.',
        });
        this.loadUsers();
      },
      error: () =>
        this.messageService.add({
          severity: 'error',
          summary: 'Lỗi',
          detail: 'Không thể kích hoạt lúc này.',
        }),
    });
  }

  private confirmResetPassword(): void {
    if (!this.rowUser) return;
    this.confirmationService.confirm({
      message: `Bạn đang yêu cầu cấp lại mật khẩu cho ${this.rowUser.email}. Hệ thống sẽ sinh ngẫu nhiên và gửi vào email của người này. Tiếp tục?`,
      header: 'Xác nhận Đặt lại Mật Khẩu',
      icon: 'pi pi-info-circle',
      acceptLabel: 'Có, gửi đi',
      rejectLabel: 'Hủy bỏ',
      accept: () => {
        this.usersFacade.resetUserPassword(this.rowUser!.id!).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Tuyệt vời',
              detail: 'Đã gửi mật khẩu tạm thời vào email người dùng.',
            });
          },
          error: () =>
            this.messageService.add({
              severity: 'error',
              summary: 'Lỗi',
              detail: 'Tiến trình thiết lập mật khẩu gặp sự cố.',
            }),
        });
      },
    });
  }

  // --- DIALOG ---

  openDetailDialog(user: UserDto): void {
    this.selectedUser = user;
    this.detailDialogVisible = true;
  }

  saveRoles(): void {
    if (!this.selectedUser?.id) return;
    this.savingRoles = true;

    this.usersFacade
      .replaceRoles(this.selectedUser.id, this.selectedRoles)
      .subscribe({
        next: () => {
          this.savingRoles = false;
          this.messageService.add({
            severity: 'success',
            summary: 'Thành công',
            detail: 'Cập nhật phân quyền thành công.',
          });
          this.rolesDialogVisible = false;
          this.loadUsers();
        },
        error: () => {
          this.savingRoles = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Lỗi',
            detail: 'Không cập nhật được quyền.',
          });
        },
      });
  }

  // --- CREATE USER ---
  openCreateDialog(): void {
    this.newUser = { email: '', fullName: '', phoneNumber: '', roleIds: [] };
    this.createDialogVisible = true;
  }

  saveNewUser(): void {
    if (!this.newUser.email || !this.newUser.fullName) return;
    this.creatingUser = true;

    this.usersFacade.createUser(this.newUser).subscribe({
      next: () => {
        this.creatingUser = false;
        this.createDialogVisible = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Thành công',
          detail: 'Đã tạo tài khoản và gửi email thông báo.',
        });
        this.loadUsers();
      },
      error: () => {
        this.creatingUser = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Lỗi',
          detail: 'Không thể tạo tài khoản người dùng.',
        });
      },
    });
  }

  // --- FORMATTERS ---
  formatRoles(roles?: string[]): string {
    return roles?.length ? roles.join(', ') : 'Chưa phân quyền';
  }

  getStatusSeverity(status?: string): 'success' | 'warn' | 'danger' | 'info' {
    switch ((status ?? '').toLowerCase()) {
      case 'active':
        return 'success';
      case 'locked':
        return 'warn';
      case 'deactivated':
        return 'danger';
      default:
        return 'info';
    }
  }

  getStatusLabel(status?: string): string {
    switch ((status ?? '').toLowerCase()) {
      case 'active':
        return 'Hoạt động';
      case 'locked':
        return 'Đang khóa';
      case 'deactivated':
        return 'Vô hiệu hóa';
      default:
        return status || 'Không rõ';
    }
  }

  getUserInitials(user: UserDto): string {
    const fullName = (user.fullName ?? '').trim();
    const email = (user.email ?? '').trim();
    const seed = fullName || email || 'U';

    return seed
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('')
      .slice(0, 2);
  }

  getRolePreview(roles?: string[]): string[] {
    return (roles ?? []).slice(0, 2);
  }

  getRoleOverflowCount(roles?: string[]): number {
    const count = roles?.length ?? 0;
    return count > 2 ? count - 2 : 0;
  }

  hasLockedUntil(user: UserDto): boolean {
    return (user.status ?? '').toLowerCase() === 'locked' && !!user.lockoutEnd;
  }
}
