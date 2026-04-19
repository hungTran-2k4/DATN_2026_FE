import { Injectable } from '@angular/core';
import { Observable, map, catchError, of } from 'rxjs';
import {
  ApiBaseService,
  GuidApiResponse,
  RegisterAsSellerCommand,
  ShopDto,
} from '../../../shared/api/generated/api-service-base.service';
import { SellerShopInfo, ShopApprovalStatus } from './seller.model';

@Injectable({ providedIn: 'root' })
export class SellerRepository {
  constructor(private readonly api: ApiBaseService) {}

  /**
   * Đăng ký làm người bán — POST /api/Auth/register-as-seller
   */
  registerAsSeller(command: RegisterAsSellerCommand): Observable<GuidApiResponse> {
    return this.api.registerAsSeller(command);
  }

  /**
   * Lấy shop của user hiện tại — GET /api/Shops/my-shop
   * Trả về null nếu chưa có shop (404)
   */
  getMyShop(): Observable<SellerShopInfo | null> {
    return this.api.myShop().pipe(
      map((res) => {
        if (!res.success || !res.data) return null;
        return this.mapToSellerShopInfo(res.data);
      }),
      catchError(() => of(null)),
    );
  }

  /**
   * Kiểm tra slug có khả dụng không — GET /api/Shops/check-slug?slug=xxx
   */
  checkSlugAvailable(slug: string): Observable<boolean> {
    return this.api.checkSlug(slug).pipe(
      map((res) => res.data ?? false),
      catchError(() => of(false)),
    );
  }

  private mapToSellerShopInfo(dto: ShopDto): SellerShopInfo {
    return {
      id: dto.id ?? '',
      name: dto.name ?? '',
      slug: dto.slug ?? '',
      description: dto.description,
      logoUrl: dto.logoUrl,
      coverUrl: dto.coverUrl,
      pickupAddress: dto.pickupAddress,
      approvalStatus: (dto.approvalStatus as unknown as number) ?? ShopApprovalStatus.Pending,
      isActive: dto.isActive ?? false,
      createdAt: dto.createdAt,
    };
  }
}
