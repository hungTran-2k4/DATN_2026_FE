import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ShopDto } from '../../../shared/api/generated/api-service-base.service';
import { ShopAdminRepository } from '../../../entities/admin/model/shop-admin.repository';

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
