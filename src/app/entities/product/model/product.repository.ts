import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import {
  ApiBaseService,
  BrandDto,
  CategoryDto,
  GetProductsQuery,
  ProductDto,
} from '../../../shared/api/generated/api-service-base.service';
import {
  PagedResult,
  unwrapPaged,
} from '../../../shared/api/admin-response.util';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ProductRepository {
  constructor(
    private readonly api: ApiBaseService,
    private readonly http: HttpClient,
  ) {}

  getProducts(query: GetProductsQuery): Observable<PagedResult<ProductDto>> {
    return this.api.paging(query).pipe(map((res) => unwrapPaged(res)));
  }

  getProductById(id: string): Observable<ProductDto | undefined> {
    return this.api
      .productsGET(id, undefined)
      .pipe(map((res) => res.data ?? undefined));
  }

  getCategories(): Observable<CategoryDto[]> {
    return this.api
      .categoriesGET(true)
      .pipe(map((res) => res.data ?? []));
  }

  getBrands(search?: string, page = 1, pageSize = 100): Observable<BrandDto[]> {
    return this.api
      .brandsGET(search, page, pageSize)
      .pipe(map((res) => res.data ?? []));
  }
}
