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

  getShopsPaging(search?: string, filter?: any, page: number = 1, pageSize: number = 10): Observable<any> {
    return this.shopRepository.getShopsPaging(search, filter, page, pageSize).pipe(catchError(() => of(null)));
  }

  getShopById(id: string): Observable<ShopDto | undefined> {
    return this.shopRepository.getShopById(id);
  }

  changeStatus(id: string, status: number): Observable<boolean> {
    return this.shopRepository.changeStatus(id, status);
  }

  deleteShop(id: string): Observable<boolean | undefined> {
    return this.shopRepository.deleteShop(id);
  }
}
