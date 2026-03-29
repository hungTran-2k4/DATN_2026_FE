import { AsyncPipe, CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { map, Observable, take } from 'rxjs';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { UserDto } from '../../../../data-access/api/api-service-base.service';
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
  ],
  templateUrl: './users.component.html',
  styleUrl: './users.component.scss',
})
export class AdminUsersPageComponent {
  keyword = '';

  users$: Observable<UserDto[]>;
  filteredUsers$!: Observable<UserDto[]>;
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
    this.users$ = this.usersFacade.getUsers();
    this.rebindStreams();
  }

  /**
   * Lam moi du lieu nguoi dung de dong bo voi trang thai API moi nhat.
   */
  reloadUsers(): void {
    this.users$ = this.usersFacade.getUsers();
    this.rebindStreams();

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
    this.filteredUsers$.pipe(take(1)).subscribe((users) => {
      this.exportUsers(users);
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

  private rebindStreams(): void {
    this.filteredUsers$ = this.users$.pipe(
      map((users) => this.applySearch(users)),
    );
    this.userStats$ = this.users$.pipe(
      map((users) => ({
        total: users.length,
        adminUsers: users.filter((u) =>
          u.roles?.some((role) => role.toLowerCase().includes('admin')),
        ).length,
        noRoleUsers: users.filter((u) => !u.roles?.length).length,
      })),
    );
  }

  /**
   * Lam moi danh sach user bang cach reset bo loc de quan tri vien quan sat lai du lieu goc.
   */
  resetFilter(): void {
    this.keyword = '';
    this.filteredUsers$ = this.users$;
  }

  /**
   * Ap bo loc keyword theo email, ho ten va so dien thoai de tim user nhanh hon.
   */
  onKeywordChange(): void {
    this.filteredUsers$ = this.users$.pipe(
      map((users) => this.applySearch(users)),
    );
  }

  private applySearch(users: UserDto[]): UserDto[] {
    const keyword = this.keyword.trim().toLowerCase();
    if (!keyword) {
      return users;
    }

    return users.filter((user) => {
      return (
        user.email?.toLowerCase().includes(keyword) ||
        user.fullName?.toLowerCase().includes(keyword) ||
        user.id?.toLowerCase().includes(keyword)
      );
    });
  }

  /**
   * Chuyen danh sach role sang chuoi de table hien thi gon gang.
   */
  formatRoles(roles?: string[]): string {
    return roles?.length ? roles.join(', ') : 'Chua gan role';
  }
}
