import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import {
  BrandDto,
  CategoryDto,
  CreateCategoryCommand,
  UpdateCategoryCommand,
} from '../../../shared/api/generated/api-service-base.service';
import { CatalogAdminRepository } from '../../../entities/admin/model/catalog-admin.repository';

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

  createCategory(command: CreateCategoryCommand): Observable<boolean> {
    return this.catalogRepository.createCategory(command).pipe(
      map(res => !!res),
      catchError(() => of(false))
    );
  }

  updateCategory(id: string, command: UpdateCategoryCommand): Observable<boolean> {
    return this.catalogRepository.updateCategory(id, command).pipe(
      map(res => !!res),
      catchError(() => of(false))
    );
  }

  deactivateCategory(id: string): Observable<boolean> {
    return this.catalogRepository.deleteCategory(id).pipe(
      map(res => !!res),
      catchError(() => of(false))
    );
  }
}
