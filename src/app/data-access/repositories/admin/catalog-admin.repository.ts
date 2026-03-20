import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import {
  BrandDto,
  CategoryDto,
  CreateBrandCommand,
  CreateCategoryCommand,
  DATNServiceBase,
  UpdateBrandCommand,
  UpdateCategoryCommand,
} from '../../api/api-service-base.service';
import { PagedResult, unwrapData, unwrapPaged } from './admin-response.util';

@Injectable({ providedIn: 'root' })
export class CatalogAdminRepository {
  constructor(private readonly apiBase: DATNServiceBase) {}

  /**
   * Lay danh sach category dang hoat dong hoac tat ca de hien thi trong man hinh danh muc.
   */
  getCategories(activeOnly?: boolean): Observable<CategoryDto[]> {
    return this.apiBase
      .categoriesGET(activeOnly)
      .pipe(map((response) => unwrapData(response, [])));
  }

  /**
   * Tao category moi theo payload tu form admin.
   */
  createCategory(
    payload: CreateCategoryCommand,
  ): Observable<CategoryDto | undefined> {
    return this.apiBase
      .categoriesPOST(payload)
      .pipe(map((response) => unwrapData(response, undefined)));
  }

  /**
   * Cap nhat category theo id.
   */
  updateCategory(
    id: string,
    payload: UpdateCategoryCommand,
  ): Observable<boolean | undefined> {
    return this.apiBase
      .categoriesPUT(id, payload)
      .pipe(map((response) => response.data));
  }

  /**
   * Xoa category theo id.
   */
  deleteCategory(id: string): Observable<boolean | undefined> {
    return this.apiBase
      .categoriesDELETE(id)
      .pipe(map((response) => response.data));
  }

  /**
   * Lay danh sach brand co phan trang de toi uu table lon.
   */
  getBrands(
    search: string | undefined,
    page: number,
    pageSize: number,
  ): Observable<PagedResult<BrandDto>> {
    return this.apiBase
      .brandsGET(search, page, pageSize)
      .pipe(map((response) => unwrapPaged(response)));
  }

  /**
   * Tao brand moi theo payload tu form admin.
   */
  createBrand(payload: CreateBrandCommand): Observable<BrandDto | undefined> {
    return this.apiBase
      .brandsPOST(payload)
      .pipe(map((response) => unwrapData(response, undefined)));
  }

  /**
   * Cap nhat brand theo id.
   */
  updateBrand(
    id: string,
    payload: UpdateBrandCommand,
  ): Observable<boolean | undefined> {
    return this.apiBase
      .brandsPUT(id, payload)
      .pipe(map((response) => response.data));
  }

  /**
   * Xoa brand theo id.
   */
  deleteBrand(id: string): Observable<boolean | undefined> {
    return this.apiBase.brandsDELETE(id).pipe(map((response) => response.data));
  }
}
