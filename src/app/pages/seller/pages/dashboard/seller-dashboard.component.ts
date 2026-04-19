import { Component, OnInit, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Observable, of } from 'rxjs';
import { SkeletonModule } from 'primeng/skeleton';
import { AuthSessionService } from '../../../../core/services/auth-session.service';
import { SellerRegistrationService } from '../../../../features/seller-registration/model/seller-registration.service';
import { SellerFacade, SellerDashboardStats } from '../../../../features/seller/seller.facade';
import { SellerShopInfo } from '../../../../entities/seller/model/seller.model';
import { OrderSummaryDto } from '../../../../shared/api/generated/api-service-base.service';

@Component({
  selector: 'app-seller-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, SkeletonModule],
  templateUrl: './seller-dashboard.component.html',
  styleUrl: './seller-dashboard.component.scss',
})
export class SellerDashboardComponent implements OnInit {
  sellerName = '';
  shopInfo$!: Observable<SellerShopInfo | null>;
  stats: SellerDashboardStats | null = null;
  isLoadingStats = true;

  constructor(
    private readonly authSession: AuthSessionService,
    private readonly sellerService: SellerRegistrationService,
    private readonly sellerFacade: SellerFacade,
    @Inject(PLATFORM_ID) private readonly platformId: Object,
  ) {}

  ngOnInit(): void {
    const session = this.authSession.getSession();
    this.sellerName = session?.userName ?? 'Người bán';
    this.shopInfo$ = this.sellerService.shopInfo$;
    this.sellerService.initState();

    if (isPlatformBrowser(this.platformId)) {
      this.sellerService.shopInfo$.subscribe((shop) => {
        if (shop?.id) {
          this.loadStats(shop.id);
        } else {
          this.isLoadingStats = false;
        }
      });
    }
  }

  private loadStats(shopId: string): void {
    this.isLoadingStats = true;
    this.sellerFacade.getDashboardStats(shopId).subscribe({
      next: (stats) => {
        this.stats = stats;
        this.isLoadingStats = false;
      },
      error: () => { this.isLoadingStats = false; },
    });
  }

  formatPrice(price: number): string {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  }

  getOrderStatusLabel(status?: string): string {
    const map: Record<string, string> = {
      PENDING: 'Chờ xác nhận',
      PROCESSING: 'Đang xử lý',
      SHIPPED: 'Đang giao',
      DELIVERED: 'Đã giao',
      CANCELLED: 'Đã hủy',
    };
    return map[status ?? ''] ?? status ?? '';
  }

  getOrderStatusClass(status?: string): string {
    const map: Record<string, string> = {
      PENDING: 'badge-warning',
      PROCESSING: 'badge-info',
      SHIPPED: 'badge-primary',
      DELIVERED: 'badge-success',
      CANCELLED: 'badge-danger',
    };
    return map[status ?? ''] ?? 'badge-default';
  }
}
