import { AsyncPipe, CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Observable } from 'rxjs';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { UserDto } from '../../../../data-access/api/api-service-base.service';
import { AdminUsersFacade } from '../../services/admin-users.facade';

@Component({
  selector: 'app-admin-users-page',
  standalone: true,
  imports: [CommonModule, AsyncPipe, TableModule, TagModule],
  templateUrl: './users.component.html',
  styleUrl: './users.component.scss',
})
export class AdminUsersPageComponent {
  readonly users$: Observable<UserDto[]>;

  constructor(private readonly usersFacade: AdminUsersFacade) {
    this.users$ = this.usersFacade.getUsers();
  }

  /**
   * Chuyen danh sach role sang chuoi de table hien thi gon gang.
   */
  formatRoles(roles?: string[]): string {
    return roles?.length ? roles.join(', ') : 'Chua gan role';
  }
}
