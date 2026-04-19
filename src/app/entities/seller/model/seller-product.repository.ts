import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import {
  ApiBaseService,
  CreateProductCommand,
  GetProductsQuery,
  ProductDto,
  UpdateProductCommand,
} from '../../../shared/api/generated/api-service-base.service';
import { PagedResult, unwrapPaged } from '../../admin/model/admin-response.util';

@Injectable({ providedIn: 'root' })
export class SellerProductRepository {
  constructor(private readonly api: ApiBaseService) {}

  getProducts(shopId: string, search?: string, page = 1, pageSize = 10): Observable<PagedResult<ProductDto>> {
    const query = new GetProductsQuery({ shopId, search, page, pageSize });
    return this.api.paging(query).pipe(map((res) => unwrapPaged(res)));
  }

  getProductById(id: string, shopId: string): Observable<ProductDto | undefined> {
    return this.api.productsGET(id, shopId).pipe(map((res) => res.data ?? undefined));
  }

  createProduct(payload: CreateProductCommand): Observable<string | undefined> {
    return this.api.productsPOST(payload).pipe(map((res) => res.data));
  }

  updateProduct(id: string, shopId: string, payload: UpdateProductCommand): Observable<boolean | undefined> {
    return this.api.productsPUT(id, shopId, payload).pipe(map((res) => res.data));
  }

  deleteProduct(id: string, shopId: string): Observable<boolean | undefined> {
    return this.api.productsDELETE(id, shopId).pipe(map((res) => res.data));
  }
}
