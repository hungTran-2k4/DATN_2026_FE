import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ShopDto } from '../../../data-access/api/api-service-base.service';
import { ShopAdminRepository } from '../../../data-access/repositories/admin/shop-admin.repository';

@Injectable({ providedIn: 'root' })
export class AdminShopsFacade {
  constructor(private readonly shopRepository: ShopAdminRepository) {}

  /**
   * Nap danh sach shop va fallback mang rong neu API loi de khong vo layout trang.
   */
  getShops(): Observable<ShopDto[]> {
    return this.shopRepository.getShops().pipe(catchError(() => of([])));
  }
}
