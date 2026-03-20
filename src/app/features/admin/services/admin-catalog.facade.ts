import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import {
  BrandDto,
  CategoryDto,
} from '../../../data-access/api/api-service-base.service';
import { CatalogAdminRepository } from '../../../data-access/repositories/admin/catalog-admin.repository';

@Injectable({ providedIn: 'root' })
export class AdminCatalogFacade {
  constructor(private readonly catalogRepository: CatalogAdminRepository) {}

  /**
   * Lay danh sach category cho man hinh danh muc.
   */
  getCategories(): Observable<CategoryDto[]> {
    return this.catalogRepository
      .getCategories(undefined)
      .pipe(catchError(() => of([])));
  }

  /**
   * Lay danh sach brand (bo qua metadata phan trang o dashboard MVP).
   */
  getBrands(): Observable<BrandDto[]> {
    return this.catalogRepository.getBrands(undefined, 1, 20).pipe(
      map((result) => result.items),
      catchError(() => of([])),
    );
  }
}
