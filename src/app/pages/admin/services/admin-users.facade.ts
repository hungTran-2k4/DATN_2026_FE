import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { RoleDto, UserDtoIEnumerablePagedResponse } from '../../../shared/api/generated/api-service-base.service';
import { UserAdminRepository } from '../../../entities/admin/model/user-admin.repository';

@Injectable({ providedIn: 'root' })
export class AdminUsersFacade {
  constructor(private readonly userRepository: UserAdminRepository) {}

  /**
   * Tra ve danh sach user co phan trang cho man hinh quan tri
   */
  getUsers(search?: string, page?: number, pageSize?: number): Observable<UserDtoIEnumerablePagedResponse | null> {
    return this.userRepository.getUsers(search, page, pageSize).pipe(catchError(() => of(null)));
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
}
