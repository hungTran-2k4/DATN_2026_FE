import { Component, OnInit, OnDestroy, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { ToastModule } from 'primeng/toast';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { TextareaModule } from 'primeng/textarea';
import { OrderSummaryDto, OrderDto } from '../../../../shared/api/generated/api-service-base.service';
import { SellerFacade } from '../../../../features/seller/seller.facade';
import { SellerRegistrationService } from '../../../../features/seller-registration/model/seller-registration.service';
import { OrderPagedResult } from '../../../../entities/order/model/seller-order.repository';

@Component({
  selector: 'app-seller-orders',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink,
    ButtonModule, SkeletonModule, ToastModule,
    PaginatorModule, DialogModule, DropdownModule, TextareaModule,
  ],
  providers: [MessageService],
  templateUrl: './seller-orders.component.html',
  styleUrl: './seller-orders.component.scss',
})
export class SellerOrdersComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  shopId = '';
  result: OrderPagedResult = { items: [], pageNumber: 1, pageSize: 20, totalPages: 0, totalRecords: 0 };
  isLoading = true;
  selectedStatus = '';
  currentPage = 1;
  pageSize = 20;
  skeletons = Array(5).fill(null);

  // Detail dialog
  showDetail = false;
  selectedOrder: OrderDto | null = null;
  isLoadingDetail = false;

  // Status update
  showStatusDialog = false;
  updatingOrderId = '';
  newStatus = '';
  statusNote = '';
  isUpdating = false;

  readonly statusTabs = [
    { label: 'Tất cả', value: '' },
    { label: 'Chờ xác nhận', value: 'PENDING' },
    { label: 'Đang xử lý', value: 'PROCESSING' },
    { label: 'Đang giao', value: 'SHIPPED' },
    { label: 'Đã giao', value: 'DELIVERED' },
    { label: 'Đã hủy', value: 'CANCELLED' },
  ];

  readonly nextStatusOptions: Record<string, { label: string; value: string }[]> = {
    PENDING: [{ label: 'Xác nhận đơn', value: 'PROCESSING' }, { label: 'Hủy đơn', value: 'CANCELLED' }],
    PROCESSING: [{ label: 'Giao cho shipper', value: 'SHIPPED' }],
    SHIPPED: [{ label: 'Xác nhận đã giao', value: 'DELIVERED' }],
  };

  constructor(
    private readonly sellerFacade: SellerFacade,
    private readonly sellerService: SellerRegistrationService,
    private readonly messageService: MessageService,
    private readonly route: ActivatedRoute,
    @Inject(PLATFORM_ID) private readonly platformId: Object,
  ) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    // Read status from query params
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      this.selectedStatus = params['status'] ?? '';
    });

    this.sellerService.shopInfo$.pipe(takeUntil(this.destroy$)).subscribe((shop) => {
      if (shop?.id) { this.shopId = shop.id; this.loadOrders(); }
    });
    this.sellerService.initState();
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  loadOrders(): void {
    if (!this.shopId) return;
    this.isLoading = true;
    this.sellerFacade.getOrders(this.shopId, this.selectedStatus || undefined, this.currentPage, this.pageSize)
      .pipe(takeUntil(this.destroy$))
      .subscribe({ next: (r) => { this.result = r; this.isLoading = false; }, error: () => { this.isLoading = false; } });
  }

  onTabChange(status: string): void {
    this.selectedStatus = status;
    this.currentPage = 1;
    this.loadOrders();
  }

  onPageChange(e: PaginatorState): void {
    this.currentPage = (e.page ?? 0) + 1;
    this.pageSize = e.rows ?? 20;
    this.loadOrders();
  }

  openDetail(order: OrderSummaryDto): void {
    this.showDetail = true;
    this.selectedOrder = null;
    this.isLoadingDetail = true;
    this.sellerFacade.getOrderDetail(order.id!).subscribe({
      next: (o) => { this.selectedOrder = o ?? null; this.isLoadingDetail = false; },
      error: () => { this.isLoadingDetail = false; },
    });
  }

  openStatusUpdate(order: OrderSummaryDto): void {
    this.updatingOrderId = order.id!;
    this.newStatus = '';
    this.statusNote = '';
    this.showStatusDialog = true;
  }

  updateStatus(): void {
    if (!this.newStatus || !this.updatingOrderId) return;
    this.isUpdating = true;
    this.sellerFacade.updateOrderStatus(this.updatingOrderId, this.newStatus, this.statusNote || undefined).subscribe({
      next: (ok) => {
        this.isUpdating = false;
        this.showStatusDialog = false;
        if (ok) {
          this.messageService.add({ severity: 'success', summary: 'Cập nhật thành công', detail: 'Trạng thái đơn hàng đã được cập nhật.' });
          this.loadOrders();
        }
      },
      error: () => { this.isUpdating = false; this.messageService.add({ severity: 'error', summary: 'Lỗi', detail: 'Không thể cập nhật trạng thái.' }); },
    });
  }

  getStatusLabel(status?: string): string {
    const map: Record<string, string> = { PENDING: 'Chờ xác nhận', PROCESSING: 'Đang xử lý', SHIPPED: 'Đang giao', DELIVERED: 'Đã giao', CANCELLED: 'Đã hủy' };
    return map[status ?? ''] ?? status ?? '';
  }

  getStatusClass(status?: string): string {
    const map: Record<string, string> = { PENDING: 'badge-warning', PROCESSING: 'badge-info', SHIPPED: 'badge-primary', DELIVERED: 'badge-success', CANCELLED: 'badge-danger' };
    return map[status ?? ''] ?? 'badge-default';
  }

  formatPrice(price?: number): string {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price ?? 0);
  }

  getNextStatusOptions(currentStatus?: string): { label: string; value: string }[] {
    return this.nextStatusOptions[currentStatus ?? ''] ?? [];
  }

  getOrderCurrentStatus(orderId: string): string {
    return this.result.items.find((o: OrderSummaryDto) => o.id === orderId)?.orderStatus ?? '';
  }

  canUpdateStatus(status?: string): boolean {
    return ['PENDING', 'PROCESSING', 'SHIPPED'].includes(status ?? '');
  }

  getPaymentStatusLabel(status?: string): string {
    const map: Record<string, string> = { 
      'Pending': 'Chờ thanh toán', 'PENDING': 'Chờ thanh toán',
      'Paid': 'Đã thanh toán', 'PAID': 'Đã thanh toán',
      'Failed': 'Thất bại', 'FAILED': 'Thất bại',
      'Refunded': 'Đã hoàn tiền', 'REFUNDED': 'Đã hoàn tiền',
      'Unpaid': 'Chưa thanh toán', 'UNPAID': 'Chưa thanh toán',
      'Processing': 'Đang xử lý', 'PROCESSING': 'Đang xử lý'
    };
    return map[status ?? ''] ?? status ?? 'Chưa rõ';
  }

  getPaymentStatusClass(status?: string): string {
    const map: Record<string, string> = { 
      'Pending': 'badge-warning', 'PENDING': 'badge-warning',
      'Paid': 'badge-success', 'PAID': 'badge-success',
      'Failed': 'badge-danger', 'FAILED': 'badge-danger',
      'Refunded': 'badge-info', 'REFUNDED': 'badge-info',
      'Unpaid': 'badge-warning', 'UNPAID': 'badge-warning',
      'Processing': 'badge-info', 'PROCESSING': 'badge-info'
    };
    return map[status ?? ''] ?? 'badge-default';
  }
}
