import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import {
  GetProductsQuery,
  ProductDto,
} from '../../../data-access/api/api-service-base.service';
import { ProductAdminRepository } from '../../../data-access/repositories/admin/product-admin.repository';

@Injectable({ providedIn: 'root' })
export class AdminProductsFacade {
  constructor(private readonly productRepository: ProductAdminRepository) {}

  /**
   * Tra ve danh sach product da bo envelope de table dung truc tiep.
   */
  getProducts(query: GetProductsQuery): Observable<ProductDto[]> {
    return this.productRepository.getProducts(query).pipe(
      map((result) => result.items),
      catchError(() => of([])),
    );
  }
}
