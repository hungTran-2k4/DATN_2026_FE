import { Component, OnInit, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Observable, of } from 'rxjs';
import { SkeletonModule } from 'primeng/skeleton';
import { NgxEchartsDirective } from 'ngx-echarts';
import { EChartsOption } from 'echarts';
import { AuthSessionService } from '../../../../core/services/auth-session.service';
import { SellerRegistrationService } from '../../../../features/seller-registration/model/seller-registration.service';
import { SellerFacade, SellerDashboardStats } from '../../../../features/seller/seller.facade';
import { SellerShopInfo } from '../../../../entities/seller/model/seller.model';
import { OrderSummaryDto } from '../../../../shared/api/generated/api-service-base.service';

@Component({
  selector: 'app-seller-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, SkeletonModule, NgxEchartsDirective],
  templateUrl: './seller-dashboard.component.html',
  styleUrl: './seller-dashboard.component.scss',
})
export class SellerDashboardComponent implements OnInit {
  sellerName = '';
  shopInfo$!: Observable<SellerShopInfo | null>;
  stats: SellerDashboardStats | null = null;
  isLoadingStats = true;
  isBrowser = false;

  revenueChartOption: EChartsOption = {};
  statusChartOption: EChartsOption = {};
  topProductsChartOption: EChartsOption = {};

  constructor(
    private readonly authSession: AuthSessionService,
    private readonly sellerService: SellerRegistrationService,
    private readonly sellerFacade: SellerFacade,
    @Inject(PLATFORM_ID) private readonly platformId: Object,
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

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
        this.initCharts(stats);
        this.isLoadingStats = false;
      },
      error: () => { this.isLoadingStats = false; },
    });
  }

  private initCharts(data: SellerDashboardStats): void {
    // 1. Daily Revenue Chart
    this.revenueChartOption = {
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: data.dailyRevenue.map(d => d.date) },
      yAxis: { type: 'value' },
      series: [{
        name: 'Doanh thu',
        type: 'line',
        smooth: true,
        data: data.dailyRevenue.map(d => d.revenue),
        itemStyle: { color: '#3b82f6' },
        areaStyle: { opacity: 0.1 }
      }]
    };

    // 2. Order Status Summary
    this.statusChartOption = {
      tooltip: { trigger: 'item' },
      series: [{
        type: 'pie',
        radius: ['50%', '70%'],
        data: data.orderStatusSummary.map(s => ({ name: this.getOrderStatusLabel(s.status), value: s.count })),
        itemStyle: { borderRadius: 8, borderColor: '#fff', borderWidth: 2 }
      }]
    };

    // 3. Top Products
    this.topProductsChartOption = {
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'value' },
      yAxis: { type: 'category', data: data.topProducts.map(p => p.productName.substring(0, 20) + '...') },
      series: [{
        type: 'bar',
        data: data.topProducts.map(p => p.quantitySold),
        itemStyle: { color: '#8b5cf6', borderRadius: [0, 4, 4, 0] }
      }]
    };
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
