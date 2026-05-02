import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PaginatorModule } from 'primeng/paginator';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { DialogModule } from 'primeng/dialog';
import {
  ApiBaseService,
  CreatePaymentUrlRequest,
  OrderSummaryDto,
} from '../../../../../shared/api/generated/api-service-base.service';

@Component({
  selector: 'app-user-orders',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    PaginatorModule,
    ButtonModule,
    SkeletonModule,
    DialogModule,
  ],
  templateUrl: './user-orders.component.html',
  styleUrl: './user-orders.component.scss',
})
export class UserOrdersComponent implements OnInit {
  orders: OrderSummaryDto[] = [];
  isLoading = true;
  totalRecords = 0;
  currentPage = 1;
  pageSize = 10;
  selectedStatus: string | undefined = undefined;

  statusTabs = [
    { label: 'Tất cả', value: undefined },
    { label: 'Chờ xác nhận', value: 'PENDING' },
    { label: 'Chờ lấy hàng', value: 'PROCESSING' },
    { label: 'Đang giao', value: 'SHIPPED' },
    { label: 'Đã giao', value: 'DELIVERED' },
    { label: 'Trả hàng', value: 'RETURNED' },
    { label: 'Đã hủy', value: 'CANCELLED' },
  ];

  constructor(private apiService: ApiBaseService) {}

  ngOnInit() {
    this.loadOrders();
  }

  loadOrders() {
    this.isLoading = true;
    this.apiService
      .my(this.selectedStatus, this.currentPage, this.pageSize)
      .subscribe({
        next: (res) => {
          this.orders = res.data || [];
          this.totalRecords = res.totalRecords || 0;
          this.isLoading = false;
        },
        error: () => {
          this.isLoading = false;
        },
      });
  }

  onTabChange(status: string | undefined) {
    this.selectedStatus = status;
    this.currentPage = 1;
    this.loadOrders();
  }

  onPageChange(event: any) {
    this.currentPage = event.page + 1;
    this.pageSize = event.rows;
    this.loadOrders();
  }

  formatPrice(price: number | undefined): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(price || 0);
  }

  getStatusLabel(status?: string): string {
    const map: Record<string, string> = {
      PENDING: 'Chờ xác nhận',
      PROCESSING: 'Chờ lấy hàng',
      SHIPPED: 'Đang giao',
      DELIVERED: 'Đã giao',
      RETURNED: 'Trả hàng',
      CANCELLED: 'Đã hủy',
    };
    return map[status ?? ''] ?? status ?? '';
  }

  getStatusClass(status?: string): string {
    const map: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-700',
      PROCESSING: 'bg-blue-100 text-blue-700',
      SHIPPED: 'bg-indigo-100 text-indigo-700',
      DELIVERED: 'bg-green-100 text-green-700',
      RETURNED: 'bg-orange-100 text-orange-700',
      CANCELLED: 'bg-red-100 text-red-700',
    };
    return map[status ?? ''] ?? 'bg-gray-100 text-gray-700';
  }

  payNow(order: OrderSummaryDto) {
    if (order.id) {
      const request = new CreatePaymentUrlRequest({ orderId: order.id });
      this.apiService.createPaymentUrl(request).subscribe({
        next: (res) => {
          if (res.success && res.paymentUrl) {
            window.location.href = res.paymentUrl;
          } else {
            alert('Không thể tạo link thanh toán.');
          }
        },
        error: () => alert('Lỗi hệ thống khi tạo link thanh toán'),
      });
    }
  }
}
