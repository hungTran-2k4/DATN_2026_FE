import { CommonModule } from '@angular/common';
import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { NgxEchartsDirective } from 'ngx-echarts';
import { EChartsOption } from 'echarts';
import { AdminExportService } from '../../../../core/services/admin-export.service';
import { StatisticsService } from '../../../../core/services/statistics.service';
import { AdminDashboardStats } from '../../../../core/models/statistics.model';

interface KpiCard {
  title: string;
  value: string | number;
  icon: string;
  iconBg: string;
}

@Component({
  selector: 'app-admin-dashboard-page',
  standalone: true,
  imports: [CommonModule, CardModule, ButtonModule, TagModule, NgxEchartsDirective],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class AdminDashboardPageComponent implements OnInit {
  lastUpdatedLabel = this.buildTimestampLabel();
  stats?: AdminDashboardStats;
  kpiCards: KpiCard[] = [];
  isBrowser = false;

  revenueChartOption: EChartsOption = {};
  orderStatusChartOption: EChartsOption = {};
  topShopsChartOption: EChartsOption = {};

  constructor(
    private readonly exportService: AdminExportService,
    private readonly messageService: MessageService,
    private readonly statisticsService: StatisticsService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    if (this.isBrowser) {
      this.loadStats();
    }
  }

  loadStats(): void {
    this.statisticsService.getAdminStats().subscribe({
      next: (data) => {
        this.stats = data;
        this.updateKpiCards(data);
        this.initCharts(data);
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Lỗi',
          detail: 'Không thể tải dữ liệu thống kê hệ thống.'
        });
      }
    });
  }

  private updateKpiCards(data: AdminDashboardStats): void {
    this.kpiCards = [
      {
        title: 'Lợi nhuận sàn',
        value: new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(data.totalRevenue),
        icon: 'pi pi-percentage',
        iconBg: '#ecfdf5',
      },
      {
        title: 'Tổng doanh số (GMV)',
        value: new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(data.totalSales),
        icon: 'pi pi-money-bill',
        iconBg: '#f0fdf4',
      },
      {
        title: 'Người dùng',
        value: data.totalUsers,
        icon: 'pi pi-users',
        iconBg: '#eff6ff',
      },
      {
        title: 'Cửa hàng',
        value: data.totalShops,
        icon: 'pi pi-shop',
        iconBg: '#fef2f2',
      },
      {
        title: 'Sản phẩm',
        value: data.totalProducts,
        icon: 'pi pi-box',
        iconBg: '#fffbeb',
      },
    ];
  }

  private initCharts(data: AdminDashboardStats): void {
    // 1. Revenue Chart
    this.revenueChartOption = {
      tooltip: { trigger: 'axis' },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: { type: 'category', data: data.monthlyRevenue.map(m => m.month) },
      yAxis: { type: 'value' },
      series: [
        {
          name: 'Doanh thu',
          type: 'line',
          smooth: true,
          data: data.monthlyRevenue.map(m => m.revenue),
          areaStyle: { opacity: 0.1 },
          itemStyle: { color: '#10b981' }
        }
      ]
    };

    // 2. Order Status Chart
    this.orderStatusChartOption = {
      tooltip: { trigger: 'item' },
      legend: { bottom: '0', left: 'center' },
      series: [
        {
          name: 'Trạng thái',
          type: 'pie',
          radius: ['40%', '70%'],
          avoidLabelOverlap: false,
          itemStyle: { borderRadius: 10, borderColor: '#fff', borderWidth: 2 },
          label: { show: false, position: 'center' },
          emphasis: { label: { show: true, fontSize: 20, fontWeight: 'bold' } },
          data: data.orderStatusDistribution.map(s => ({ name: s.status, value: s.count }))
        }
      ]
    };

    // 3. Top Shops Chart
    this.topShopsChartOption = {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      xAxis: { type: 'value' },
      yAxis: { type: 'category', data: data.topShops.map(s => s.shopName) },
      series: [
        {
          name: 'Doanh thu',
          type: 'bar',
          data: data.topShops.map(s => s.revenue),
          itemStyle: {
            color: '#3b82f6',
            borderRadius: [0, 5, 5, 0]
          }
        }
      ]
    };
  }

  refreshDashboard(): void {
    this.loadStats();
    this.lastUpdatedLabel = this.buildTimestampLabel();
    this.messageService.add({
      severity: 'success',
      summary: 'Đã làm mới',
      detail: 'Bộ chỉ số dashboard đã được cập nhật mới nhất.',
    });
  }

  exportDashboardReport(): void {
    if (!this.stats) return;
    const rows = this.kpiCards.map((card) => ({
      metric: card.title,
      value: card.value.toString(),
    }));

    this.exportService.exportCsv('admin-dashboard-kpi', rows, [
      { header: 'Chỉ số', value: (row) => row.metric },
      { header: 'Giá trị', value: (row) => row.value },
    ]);
  }

  private buildTimestampLabel(): string {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    return `Cập nhật lúc ${hh}:${mm}`;
  }
}
