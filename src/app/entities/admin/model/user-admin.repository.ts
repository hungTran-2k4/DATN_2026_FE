import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  AssignRoleRequest,
  ApiBaseService,
  RoleDto,
  UpdateUserRolesRequest,
  UserDtoIEnumerablePagedResponse,
  GetUsersQuery,
  LockUserRequest,
  AuditLogDtoIEnumerablePagedResponse,
  UserSessionDto
} from '../../../shared/api/generated/api-service-base.service';

@Injectable({ providedIn: 'root' })
export class UserAdminRepository {
  constructor(private readonly apiBase: ApiBaseService) {}

  createUser(payload: { email: string; fullName: string; phoneNumber?: string; roleIds?: string[] }): Observable<any> {
    // Gọi method từ ApiBaseService sau khi gen NSwag (tạm gọi là createAdminUser)
    // Cần kiểm tra lại chính xác tên method sau khi dev gen lại API
    return (this.apiBase as any).create(payload);
  }

  /**
   * Lay danh sach user phuc vu bo loc, phan quyen va theo doi tai khoan.
   */
  getUsers(
    search?: string,
    page?: number,
    pageSize?: number,
  ): Observable<UserDtoIEnumerablePagedResponse> {
    const query = new GetUsersQuery({ page, pageSize });

    if (search && search.trim()) {
      // Define a basic filter descriptor structure manually as the api generated models
      // expect any matching filter object.
      (query as any).filter = {
        logic: 'or',
        filters: [
          { field: 'email', operator: 'contains', value: search },
          { field: 'fullName', operator: 'contains', value: search },
          { field: 'id', operator: 'eq', value: search }
        ]
      };
    }

    return this.apiBase.paging2(query);
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

  lockUser(userId: string, reason: string = 'Admin Action'): Observable<void> {
    return this.apiBase.lock(userId, new LockUserRequest({ reason }));
  }

  unlockUser(userId: string): Observable<void> {
    return this.apiBase.unlock(userId);
  }

  deactivateUser(userId: string, reason: string = 'Admin Action'): Observable<void> {
    return this.apiBase.deactivate(userId, new LockUserRequest({ reason }));
  }

  activateUser(userId: string): Observable<void> {
    return this.apiBase.activate(userId);
  }

  resetUserPassword(userId: string): Observable<void> {
    return this.apiBase.resetPassword2(userId);
  }

  getUserSessions(userId: string): Observable<UserSessionDto[]> {
    return this.apiBase.sessionsAll(userId);
  }

  revokeAllSessions(userId: string): Observable<void> {
    return this.apiBase.sessions(userId);
  }

  revokeSession(userId: string, sessionId: string): Observable<void> {
    return this.apiBase.sessions2(userId, sessionId);
  }

  getUserAuditLogs(userId: string, page?: number, pageSize?: number): Observable<AuditLogDtoIEnumerablePagedResponse> {
    return this.apiBase.auditLogs(userId, page, pageSize);
  }
}
