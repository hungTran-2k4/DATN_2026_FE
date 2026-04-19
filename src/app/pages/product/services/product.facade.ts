import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import {
  BrandDto,
  CategoryDto,
  GetProductsQuery,
  ProductDto,
} from '../../../shared/api/generated/api-service-base.service';
import { PagedResult } from '../../../entities/admin/model/admin-response.util';
import { ProductRepository } from '../../../entities/product/model/product.repository';

@Injectable({ providedIn: 'root' })
export class ProductFacade {
  constructor(private readonly productRepository: ProductRepository) {}

  getProducts(query: GetProductsQuery): Observable<PagedResult<ProductDto>> {
    return this.productRepository.getProducts(query).pipe(
      catchError(() =>
        of({ items: [], pageNumber: 1, pageSize: 12, totalPages: 0, totalRecords: 0 }),
      ),
    );
  }

  getProductById(id: string): Observable<ProductDto | undefined> {
    return this.productRepository
      .getProductById(id)
      .pipe(catchError(() => of(undefined)));
  }

  getCategories(): Observable<CategoryDto[]> {
    return this.productRepository
      .getCategories()
      .pipe(catchError(() => of([])));
  }

  getBrands(): Observable<BrandDto[]> {
    return this.productRepository.getBrands().pipe(catchError(() => of([])));
  }
}
