import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { UserDto } from '../../../data-access/api/api-service-base.service';
import { UserAdminRepository } from '../../../data-access/repositories/admin/user-admin.repository';

@Injectable({ providedIn: 'root' })
export class AdminUsersFacade {
  constructor(private readonly userRepository: UserAdminRepository) {}

  /**
   * Tra ve danh sach user cho man hinh quan tri; loi se duoc fallback de UI van render an toan.
   */
  getUsers(): Observable<UserDto[]> {
    return this.userRepository.getUsers().pipe(catchError(() => of([])));
  }
}
