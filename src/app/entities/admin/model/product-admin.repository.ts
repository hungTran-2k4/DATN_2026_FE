import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import {
  ApiBaseService,
  CreateProductCommand,
  CreateVariantCommand,
  FileParameter,
  GetProductsQuery,
  ProductDto,
  ProductImageDto,
  ProductVariantDto,
  UpdateProductCommand,
  UpdateVariantCommand,
} from '../../../shared/api/generated/api-service-base.service';
import { PagedResult, unwrapData, unwrapPaged } from './admin-response.util';

@Injectable({ providedIn: 'root' })
export class ProductAdminRepository {
  constructor(private readonly apiBase: ApiBaseService) {}

  /**
   * Lay danh sach product theo bo loc va phan trang.
   */
  getProducts(query: GetProductsQuery): Observable<PagedResult<ProductDto>> {
    return this.apiBase
      .paging(query)
      .pipe(map((response) => unwrapPaged(response)));
  }

  /**
   * Lay chi tiet product theo id va shopId (neu co).
   */
  getProductById(
    id: string,
    shopId?: string,
  ): Observable<ProductDto | undefined> {
    return this.apiBase
      .productsGET(id, shopId)
      .pipe(map((response) => unwrapData(response, undefined)));
  }

  /**
   * Tao moi product.
   */
  createProduct(payload: CreateProductCommand): Observable<string | undefined> {
    return this.apiBase
      .productsPOST(payload)
      .pipe(map((response) => response.data));
  }

  /**
   * Cap nhat product hien tai.
   */
  updateProduct(
    id: string,
    payload: UpdateProductCommand,
    shopId?: string,
  ): Observable<boolean | undefined> {
    return this.apiBase
      .productsPUT(id, shopId, payload)
      .pipe(map((response) => response.data));
  }

  /**
   * Xoa product theo id.
   */
  deleteProduct(id: string, shopId?: string): Observable<boolean | undefined> {
    return this.apiBase
      .productsDELETE(id, shopId)
      .pipe(map((response) => response.data));
  }

  /**
   * Tao bien the cho product.
   */
  createVariant(
    productId: string,
    payload: CreateVariantCommand,
  ): Observable<ProductVariantDto | undefined> {
    return this.apiBase
      .variantsPOST(productId, payload)
      .pipe(map((response) => unwrapData(response, undefined)));
  }

  /**
   * Cap nhat bien the theo variantId.
   */
  updateVariant(
    productId: string,
    variantId: string,
    payload: UpdateVariantCommand,
  ): Observable<boolean | undefined> {
    return this.apiBase
      .variantsPUT(productId, variantId, payload)
      .pipe(map((response) => response.data));
  }

  /**
   * Xoa bien the theo variantId.
   */
  deleteVariant(
    productId: string,
    variantId: string,
    shopId?: string,
  ): Observable<boolean | undefined> {
    return this.apiBase
      .variantsDELETE(productId, variantId, shopId)
      .pipe(map((response) => response.data));
  }

  /**
   * Upload anh cho product.
   */
  uploadImage(
    productId: string,
    file: FileParameter,
    isMain?: boolean,
  ): Observable<ProductImageDto | undefined> {
    return this.apiBase
      .imagesPOST(productId, isMain, file)
      .pipe(map((response) => unwrapData(response, undefined)));
  }

  /**
   * Xoa anh theo imageId.
   */
  deleteImage(
    productId: string,
    imageId: string,
  ): Observable<boolean | undefined> {
    return this.apiBase
      .imagesDELETE(productId, imageId)
      .pipe(map((response) => response.data));
  }

  /**
   * Dat anh chinh cho product.
   */
  setMainImage(
    productId: string,
    imageId: string,
  ): Observable<boolean | undefined> {
    return this.apiBase
      .main(productId, imageId)
      .pipe(map((response) => response.data));
  }
}
