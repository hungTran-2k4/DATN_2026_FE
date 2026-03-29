import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  AssignRoleRequest,
  ApiBaseService,
  RoleDto,
  UpdateUserRolesRequest,
  UserDtoIEnumerablePagedResponse,
  GetUsersQuery
} from '../../../shared/api/generated/api-service-base.service';

@Injectable({ providedIn: 'root' })
export class UserAdminRepository {
  constructor(private readonly apiBase: ApiBaseService) {}

  /**
   * Lay danh sach user phuc vu bo loc, phan quyen va theo doi tai khoan.
   */
  getUsers(
    search?: string,
    page?: number,
    pageSize?: number,
  ): Observable<UserDtoIEnumerablePagedResponse> {
    return this.apiBase.paging2(new GetUsersQuery({ search, page, pageSize }));
  }

  /**
   * Lay danh sach tat ca cac Role he thong.
   */
  getRoles(): Observable<RoleDto[]> {
    return this.apiBase.roles();
  }

  /**
   * Gan nhanh 1 role cho user tu man hinh quan tri.
   */
  assignRole(userId: string, roleId: string): Observable<void> {
    return this.apiBase.rolesPOST(userId, new AssignRoleRequest({ roleId }));
  }

  /**
   * Cap nhat toan bo role cua user theo danh sach roleIds moi.
   */
  replaceRoles(userId: string, roleIds: string[]): Observable<void> {
    return this.apiBase.rolesPUT(
      userId,
      new UpdateUserRolesRequest({ roleIds }),
    );
  }
}
