import { Inject, Injectable, Optional } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import {
  API_BASE_URL,
  ApiBaseService,
  FileParameter,
  PagedRequest,
  ShopDto,
  UpdateShopCommand,
} from '../../../shared/api/generated/api-service-base.service';
import { unwrapData } from '../../../shared/api/admin-response.util';

@Injectable({ providedIn: 'root' })
export class ShopAdminRepository {
  private readonly baseUrl: string;

  constructor(
    private readonly apiBase: ApiBaseService,
    private readonly http: HttpClient,
    @Optional() @Inject(API_BASE_URL) baseUrl?: string
  ) {
    this.baseUrl = baseUrl ?? '';
  }

  getShopsPaging(search?: string, filter?: any, page: number = 1, pageSize: number = 10): Observable<any> {
    const body = new PagedRequest({ search, filter, page, pageSize });
    return this.apiBase.paging2(body);
  }

  changeStatus(id: string, status: number): Observable<any> {
    const url = `${this.baseUrl}/api/Shops/${id}/status`;
    // Backend mong đợi body là enum ShopApprovalStatus (int)
    return this.http.put(url, status, { 
      withCredentials: true,
      headers: { 'Content-Type': 'application/json' }
    });
  }

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
