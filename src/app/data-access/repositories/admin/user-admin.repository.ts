import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  AssignRoleRequest,
  DATNServiceBase,
  UpdateUserRolesRequest,
  UserDto,
} from '../../api/api-service-base.service';

@Injectable({ providedIn: 'root' })
export class UserAdminRepository {
  constructor(private readonly apiBase: DATNServiceBase) {}

  /**
   * Lay danh sach user phuc vu bo loc, phan quyen va theo doi tai khoan.
   */
  getUsers(): Observable<UserDto[]> {
    return this.apiBase.users();
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
