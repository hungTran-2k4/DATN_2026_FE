import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { BehaviorSubject, EMPTY, Observable, catchError, map, tap } from 'rxjs';
import { MessageService } from 'primeng/api';
import { RegisterAsSellerCommand } from '../../../shared/api/generated/api-service-base.service';
import { AuthSessionService } from '../../../core/services/auth-session.service';
import { SellerRepository } from '../../../entities/seller/model/seller.repository';
import {
  SellerRegistrationFormValue,
  SellerRegistrationState,
  SellerShopInfo,
  ShopApprovalStatus,
} from '../../../entities/seller/model/seller.model';

@Injectable({ providedIn: 'root' })
export class SellerRegistrationService {
  private readonly stateSubject = new BehaviorSubject<SellerRegistrationState>('idle');
  private readonly slugErrorSubject = new BehaviorSubject<string | null>(null);
  private readonly shopInfoSubject = new BehaviorSubject<SellerShopInfo | null>(null);

  readonly state$ = this.stateSubject.asObservable();
  readonly slugError$ = this.slugErrorSubject.asObservable();
  readonly shopInfo$ = this.shopInfoSubject.asObservable();

  constructor(
    private readonly sellerRepo: SellerRepository,
    private readonly authSession: AuthSessionService,
    private readonly router: Router,
    private readonly messageService: MessageService,
    @Inject(PLATFORM_ID) private readonly platformId: Object,
  ) {}

  /**
   * Xác định state ban đầu dựa trên session và API.
   * Gọi trong ngOnInit của ProfileComponent.
   */
  initState(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    // Nếu đã có role Seller trong session → approved
    if (this.authSession.isSeller()) {
      this.stateSubject.next('approved');
      this.loadShopInfo();
      return;
    }

    // Nếu là Admin → không hiển thị section
    if (this.authSession.isAdmin()) {
      this.stateSubject.next('idle');
      return;
    }

    // Kiểm tra xem có shop pending/rejected không
    this.sellerRepo.getMyShop().subscribe({
      next: (shop) => {
        if (!shop) {
          this.stateSubject.next('idle');
          return;
        }
        this.shopInfoSubject.next(shop);
        switch (shop.approvalStatus) {
          case ShopApprovalStatus.Pending:
            this.stateSubject.next('pending');
            break;
          case ShopApprovalStatus.Approved:
            this.stateSubject.next('approved');
            break;
          case ShopApprovalStatus.Rejected:
            this.stateSubject.next('rejected');
            break;
          default:
            this.stateSubject.next('idle');
        }
      },
      error: () => {
        // 404 = chưa có shop → idle
        this.stateSubject.next('idle');
      },
    });
  }

  /**
   * Submit đăng ký bán hàng.
   */
  submitRegistration(formValue: SellerRegistrationFormValue): Observable<void> {
    this.stateSubject.next('loading');
    this.slugErrorSubject.next(null);

    const command = new RegisterAsSellerCommand({
      shopName: formValue.name,
      shopSlug: formValue.slug,
      description: formValue.description || undefined,
      provinceId: formValue.provinceId,
      districtId: formValue.districtId,
      wardId: formValue.wardId,
      pickupAddress: formValue.pickupAddress || undefined,
    });

    return this.sellerRepo.registerAsSeller(command).pipe(
      tap(() => {
        this.stateSubject.next('pending');
        this.messageService.add({
          severity: 'success',
          summary: 'Đăng ký thành công!',
          detail: 'Đơn của bạn đang chờ Admin duyệt. Chúng tôi sẽ thông báo khi có kết quả.',
          life: 6000,
        });
      }),
      map(() => void 0),
      catchError((error: any) => {
        this.stateSubject.next('idle');
        const errorCode = this.extractErrorCode(error);

        if (errorCode === 'SHOP_SLUG_EXISTS') {
          this.slugErrorSubject.next('Slug này đã được sử dụng, vui lòng chọn slug khác.');
          return EMPTY;
        }

        if (errorCode === 'SHOP_ALREADY_EXISTS') {
          this.messageService.add({
            severity: 'warn',
            summary: 'Đã có shop',
            detail: 'Bạn đã có shop đang hoạt động hoặc đang chờ duyệt.',
          });
          this.initState(); // Reload state
          return EMPTY;
        }

        if (error?.status === 401) {
          this.router.navigate(['/auth/login']);
          return EMPTY;
        }

        this.messageService.add({
          severity: 'error',
          summary: 'Lỗi',
          detail: 'Không thể đăng ký lúc này, vui lòng thử lại sau.',
        });
        return EMPTY;
      }),
    );
  }

  /**
   * Reset về idle để cho phép đăng ký lại sau khi bị từ chối.
   * Giữ lại shopInfo để pre-fill form.
   */
  resetToIdle(): void {
    this.stateSubject.next('idle');
    this.slugErrorSubject.next(null);
  }

  /**
   * Kiểm tra slug khả dụng (dùng cho async validator).
   */
  checkSlugAvailable(slug: string): Observable<boolean> {
    return this.sellerRepo.checkSlugAvailable(slug);
  }

  /**
   * Generate slug từ tên shop — xử lý tiếng Việt.
   * Regex đồng bộ với backend: ^[a-z0-9]+(?:-[a-z0-9]+)*$
   */
  generateSlug(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Xóa diacritics
      .replace(/đ/g, 'd') // Xử lý chữ đ tiếng Việt
      .replace(/[^a-z0-9]+/g, '-') // Thay ký tự không hợp lệ bằng gạch ngang
      .replace(/^-+|-+$/g, '') // Xóa gạch ngang đầu/cuối
      .substring(0, 50);
  }

  /**
   * Validate slug format — đồng bộ với backend regex.
   */
  isValidSlug(slug: string): boolean {
    return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
  }

  private loadShopInfo(): void {
    this.sellerRepo.getMyShop().subscribe({
      next: (shop) => {
        if (shop) this.shopInfoSubject.next(shop);
      },
      error: () => {},
    });
  }

  private extractErrorCode(error: any): string | null {
    // NSwag ApiException wraps response
    if (error?.result?.errorCode) return error.result.errorCode;
    if (error?.error?.errorCode) return error.error.errorCode;
    if (error?.errorCode) return error.errorCode;

    // Try parse JSON from response string
    try {
      const parsed = typeof error?.response === 'string' ? JSON.parse(error.response) : null;
      if (parsed?.errorCode) return parsed.errorCode;
    } catch {}

    return null;
  }
}
