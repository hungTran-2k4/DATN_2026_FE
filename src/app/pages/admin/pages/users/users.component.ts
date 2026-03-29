import { AsyncPipe, CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { map, Observable, take } from 'rxjs';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { MultiSelectModule } from 'primeng/multiselect';
import { RoleDto, UserDto } from '../../../../shared/api/generated/api-service-base.service';
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
    MultiSelectModule
  ],
  templateUrl: './users.component.html',
  styleUrl: './users.component.scss',
})
export class AdminUsersPageComponent {
  keyword = '';
  
  users: UserDto[] = [];
  totalRecords = 0;
  loading = true;

  // Pagination config
  rows = 10;
  first = 0;

  // Dialog & state
  editDialogVisible = false;
  selectedUser: UserDto | null = null;
  selectedRoles: string[] = [];
  availableRoles: RoleDto[] = [];
  savingRoles = false;

  userStats$!: Observable<{
    total: number;
    adminUsers: number;
    noRoleUsers: number;
  }>;

  constructor(
    private readonly usersFacade: AdminUsersFacade,
    private readonly exportService: AdminExportService,
    private readonly messageService: MessageService,
  ) {
    this.rebindStats();
    this.loadRoles();
  }

  loadUsers(event?: TableLazyLoadEvent): void {
    this.loading = true;
    
    // Convert first skip parameter back to page number (1-indexed)
    const page = event ? Math.floor(event.first! / event.rows!) + 1 : 1;
    this.rows = event?.rows ?? this.rows;
    this.first = event?.first ?? 0;

    this.usersFacade.getUsers(this.keyword, page, this.rows).subscribe((res) => {
      this.loading = false;
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
    this.usersFacade.getRoles().subscribe(roles => {
      this.availableRoles = roles;
    });
  }

  reloadUsers(): void {
    this.loadUsers();
    this.rebindStats();

    this.messageService.add({
      severity: 'success',
      summary: 'Da lam moi',
      detail: 'Du lieu nguoi dung da duoc cap nhat.',
    });
  }

  /**
   * Xuat danh sach nguoi dung theo bo loc hien tai de doi soat nhanh.
   */
  exportUsers(users: UserDto[]): void {
    this.exportService.exportCsv('admin-users', users, [
      { header: 'ID', value: (u) => u.id },
      { header: 'Email', value: (u) => u.email },
      { header: 'Ho ten', value: (u) => u.fullName },
      { header: 'Roles', value: (u) => this.formatRoles(u.roles) },
    ]);

    this.messageService.add({
      severity: 'info',
      summary: 'Da xuat CSV',
      detail: `Da xuat ${users.length} dong du lieu nguoi dung.`,
    });
  }

  exportCurrentUsers(): void {
    this.usersFacade.getUsers(this.keyword, 1, 1000).subscribe(res => {
      if (res && res.data) {
        this.exportUsers(res.data);
      }
    });
  }

  /**
   * Sao chep user id de admin thao tac nhanh voi cac he thong noi bo.
   */
  copyUserId(userId?: string): void {
    if (!userId) {
      return;
    }

    navigator.clipboard.writeText(userId);
    this.messageService.add({
      severity: 'success',
      summary: 'Da sao chep',
      detail: 'User ID da duoc sao chep vao clipboard.',
    });
  }

  private rebindStats(): void {
    // For stats, we might fetch the first page up to 1000 size just to get counts for MVP, or just skip it if it's too much. For now, we simulate stats with just empty/mock values since getting full DB count requires a different API.
    this.userStats$ = this.usersFacade.getUsers('', 1, 1).pipe(map(res => ({
        total: res?.totalRecords ?? 0,
        adminUsers: 0, // In standard setups we should fetch total roles specifically. Mocking 0 for now.
        noRoleUsers: 0
    })));
  }

  resetFilter(): void {
    this.keyword = '';
    this.first = 0;
    this.loadUsers();
  }

  onKeywordChange(): void {
    this.first = 0; // Reset ve trang dau
    this.loadUsers();
  }

  openEditDialog(user: UserDto): void {
    this.selectedUser = user;
    if (user.roles && user.roles.length > 0) {
      this.selectedRoles = this.availableRoles
        .filter(r => r.name && user.roles!.includes(r.name))
        .map(r => r.id!);
    } else {
      this.selectedRoles = [];
    }
    this.editDialogVisible = true;
  }

  saveRoles(): void {
    if (!this.selectedUser?.id) return;
    
    this.savingRoles = true;
    
    // We map 'selectedRoles' which is array of role Names directly to the API if the API needs roleIds, wait, we need Role IDs array.
    // If the multiselect gives us RoleDto, we would extract IDs. Here we bind to role 'id' if we construct it properly in HTML.
    
    this.usersFacade.replaceRoles(this.selectedUser.id, this.selectedRoles).subscribe({
      next: () => {
         this.savingRoles = false;
         this.editDialogVisible = false;
         this.messageService.add({ severity: 'success', summary: 'Thanh cong', detail: 'Cap nhat vai tro thanh cong.' });
         this.loadUsers(); // refresh data
      },
      error: () => {
         this.savingRoles = false;
         this.messageService.add({ severity: 'error', summary: 'Loi', detail: 'Khong the cap nhat vai tro luc nay.' });
      }
    });
  }

  /**
   * Chuyen danh sach role sang chuoi de table hien thi gon gang.
   */
  formatRoles(roles?: string[]): string {
    return roles?.length ? roles.join(', ') : 'Chua gan role';
  }
}
