import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { RoleDto, UserDtoIEnumerablePagedResponse, UserSessionDto, AuditLogDtoIEnumerablePagedResponse } from '../../../shared/api/generated/api-service-base.service';
import { UserAdminRepository } from '../../../entities/user/model/user-admin.repository';

@Injectable({ providedIn: 'root' })
export class AdminUsersFacade {
  constructor(private readonly userRepository: UserAdminRepository) {}

  /**
   * Tra ve danh sach user co phan trang cho man hinh quan tri
   */
  getUsers(search?: string, page?: number, pageSize?: number): Observable<UserDtoIEnumerablePagedResponse | null> {
    return this.userRepository.getUsers(search, page, pageSize).pipe(catchError(() => of(null)));
  }

  createUser(payload: { email: string; fullName: string; phoneNumber?: string; roleIds?: string[] }): Observable<any> {
    return this.userRepository.createUser(payload);
  }

  /**
   * Truy xuat toan bo cac roles co the the hien tren he thong.
   */
  getRoles(): Observable<RoleDto[]> {
    return this.userRepository.getRoles().pipe(catchError(() => of([])));
  }

  /**
   * Dat lai roles cho mot user.
   */
  replaceRoles(userId: string, roleIds: string[]): Observable<void> {
    return this.userRepository.replaceRoles(userId, roleIds);
  }

  lockUser(userId: string): Observable<void> {
    return this.userRepository.lockUser(userId, 'Admin lock request');
  }

  unlockUser(userId: string): Observable<void> {
    return this.userRepository.unlockUser(userId);
  }

  deactivateUser(userId: string): Observable<void> {
    return this.userRepository.deactivateUser(userId, 'Admin deactivate request');
  }

  activateUser(userId: string): Observable<void> {
    return this.userRepository.activateUser(userId);
  }

  resetUserPassword(userId: string): Observable<void> {
    return this.userRepository.resetUserPassword(userId);
  }

  getUserSessions(userId: string): Observable<UserSessionDto[]> {
    return this.userRepository.getUserSessions(userId).pipe(catchError(() => of([])));
  }

  revokeAllSessions(userId: string): Observable<void> {
    return this.userRepository.revokeAllSessions(userId);
  }

  revokeSession(userId: string, sessionId: string): Observable<void> {
    return this.userRepository.revokeSession(userId, sessionId);
  }

  getUserAuditLogs(userId: string, page?: number, pageSize?: number): Observable<AuditLogDtoIEnumerablePagedResponse | null> {
    return this.userRepository.getUserAuditLogs(userId, page, pageSize).pipe(catchError(() => of(null)));
  }
}
