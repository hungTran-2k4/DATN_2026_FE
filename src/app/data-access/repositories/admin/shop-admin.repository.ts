import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import {
  DATNServiceBase,
  FileParameter,
  ShopDto,
  UpdateShopCommand,
} from '../../api/api-service-base.service';
import { unwrapData } from './admin-response.util';

@Injectable({ providedIn: 'root' })
export class ShopAdminRepository {
  constructor(private readonly apiBase: DATNServiceBase) {}

  /**
   * Lay tat ca shop de hien thi bang quan tri tong quan.
   */
  getShops(): Observable<ShopDto[]> {
    return this.apiBase
      .shopsGET()
      .pipe(map((response) => unwrapData(response, [])));
  }

  /**
   * Lay chi tiet 1 shop theo id.
   */
  getShopById(id: string): Observable<ShopDto | undefined> {
    return this.apiBase
      .shopsGET2(id)
      .pipe(map((response) => unwrapData(response, undefined)));
  }

  /**
   * Cap nhat thong tin shop tu man hinh admin.
   */
  updateShop(
    id: string,
    payload: UpdateShopCommand,
  ): Observable<boolean | undefined> {
    return this.apiBase
      .shopsPUT(id, payload)
      .pipe(map((response) => response.data));
  }

  /**
   * Xoa shop theo id khi admin xac nhan thao tac.
   */
  deleteShop(id: string): Observable<boolean | undefined> {
    return this.apiBase.shopsDELETE(id).pipe(map((response) => response.data));
  }

  /**
   * Upload logo moi cho shop.
   */
  uploadLogo(id: string, file: FileParameter): Observable<ShopDto | undefined> {
    return this.apiBase
      .logo(id, file)
      .pipe(map((response) => unwrapData(response, undefined)));
  }

  /**
   * Upload cover moi cho shop.
   */
  uploadCover(
    id: string,
    file: FileParameter,
  ): Observable<ShopDto | undefined> {
    return this.apiBase
      .cover(id, file)
      .pipe(map((response) => unwrapData(response, undefined)));
  }
}
