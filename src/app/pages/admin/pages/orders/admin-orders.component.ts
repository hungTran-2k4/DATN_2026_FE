import {
  Component,
  OnInit,
  OnDestroy,
  PLATFORM_ID,
  Inject,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Subject, takeUntil } from 'rxjs';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { ToastModule } from 'primeng/toast';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { TextareaModule } from 'primeng/textarea';
import {
  OrderSummaryDto,
  OrderDto,
  ApiBaseService,
  UpdateStatusRequest,
  OrderSummaryDtoIEnumerablePagedResponse,
} from '../../../../shared/api/generated/api-service-base.service';

export type OrderPagedResult = OrderSummaryDtoIEnumerablePagedResponse;

@Component({
  selector: 'app-admin-orders',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    SkeletonModule,
    ToastModule,
    PaginatorModule,
    DialogModule,
    DropdownModule,
    TextareaModule,
  ],
  providers: [MessageService],
  templateUrl: './admin-orders.component.html',
  styleUrl: './admin-orders.component.scss',
})
export class AdminOrdersComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  result: OrderPagedResult = new OrderSummaryDtoIEnumerablePagedResponse({
    data: [],
    pageNumber: 1,
    pageSize: 20,
    totalPages: 0,
    totalRecords: 0,
  });
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
    { label: 'Chờ lấy hàng', value: 'PROCESSING' },
    { label: 'Đang giao', value: 'SHIPPED' },
    { label: 'Đã giao', value: 'DELIVERED' },
    { label: 'Hoàn thành', value: 'COMPLETED' },
    { label: 'Trả hàng', value: 'RETURNED' },
    { label: 'Đã hủy', value: 'CANCELLED' },
  ];

  readonly nextStatusOptions: Record<
    string,
    { label: string; value: string }[]
  > = {
    PENDING: [{ label: 'Hủy đơn hàng (Admin)', value: 'CANCELLED' }],
    PROCESSING: [
      { label: 'Shipper đã lấy hàng (Simulate Webhook)', value: 'SHIPPED' },
      { label: 'Hủy đơn hàng (Admin)', value: 'CANCELLED' },
    ],
    SHIPPED: [
      { label: 'Giao hàng thành công (Simulate Webhook)', value: 'DELIVERED' },
    ],
    DELIVERED: [{ label: 'Yêu cầu Trả hàng/Hoàn tiền', value: 'RETURNED' }],
  };

  constructor(
    private readonly messageService: MessageService,
    private readonly api: ApiBaseService,
    @Inject(PLATFORM_ID) private readonly platformId: Object,
  ) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.loadOrders();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadOrders(): void {
    this.isLoading = true;
    this.api
      .all(this.selectedStatus || undefined, this.currentPage, this.pageSize)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: OrderSummaryDtoIEnumerablePagedResponse) => {
          this.result = res;
          this.isLoading = false;
        },
        error: () => {
          this.isLoading = false;
        },
      });
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
    this.api.orders(order.id!).subscribe({
      next: (res) => {
        this.selectedOrder = res.data ?? null;
        this.isLoadingDetail = false;
      },
      error: () => {
        this.isLoadingDetail = false;
      },
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
    const req = new UpdateStatusRequest({
      newStatus: this.newStatus,
      note: this.statusNote || undefined,
    });
    this.api.statusPATCH(this.updatingOrderId, req).subscribe({
      next: (res) => {
        this.isUpdating = false;
        this.showStatusDialog = false;
        if (res.data) {
          this.messageService.add({
            severity: 'success',
            summary: 'Cập nhật thành công',
            detail: 'Trạng thái đơn hàng đã được cập nhật.',
          });
          this.loadOrders();
        }
      },
      error: () => {
        this.isUpdating = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Lỗi',
          detail: 'Không thể cập nhật trạng thái.',
        });
      },
    });
  }

  getStatusLabel(status?: string): string {
    const map: Record<string, string> = {
      PENDING: 'Chờ xác nhận',
      PROCESSING: 'Đang chuẩn bị hàng',
      SHIPPED: 'Đang giao hàng',
      DELIVERED: 'Đã giao hàng',
      COMPLETED: 'Hoàn thành',
      RETURNED: 'Trả hàng',
      CANCELLED: 'Đã hủy',
    };
    return map[status ?? ''] ?? status ?? '';
  }

  getStatusClass(status?: string): string {
    const map: Record<string, string> = {
      PENDING: 'badge-warning',
      PROCESSING: 'badge-info',
      SHIPPED: 'badge-primary',
      DELIVERED: 'badge-success',
      COMPLETED: 'badge-success',
      RETURNED: 'badge-warning',
      CANCELLED: 'badge-danger',
    };
    return map[status ?? ''] ?? 'badge-default';
  }

  formatPrice(price?: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(price ?? 0);
  }

  parseAddress(addressJson?: string): any {
    if (!addressJson)
      return { fullName: 'N/A', phoneNumber: '', detailedAddress: 'N/A' };
    try {
      const addr =
        typeof addressJson === 'string' && addressJson.startsWith('{')
          ? JSON.parse(addressJson)
          : addressJson;

      if (typeof addr === 'object') {
        return {
          fullName: addr.FullName || addr.fullName || 'N/A',
          phoneNumber: addr.PhoneNumber || addr.phoneNumber || '',
          detailedAddress:
            addr.DetailedAddress || addr.detailedAddress || 'N/A',
        };
      }
      return { fullName: 'N/A', phoneNumber: '', detailedAddress: addressJson };
    } catch (e) {
      return { fullName: 'N/A', phoneNumber: '', detailedAddress: addressJson };
    }
  }

  getNextStatusOptions(
    currentStatus?: string,
  ): { label: string; value: string }[] {
    return this.nextStatusOptions[currentStatus ?? ''] ?? [];
  }

  getOrderCurrentStatus(orderId: string): string {
    return (
      this.result.data?.find((o: OrderSummaryDto) => o.id === orderId)
        ?.orderStatus ?? ''
    );
  }

  canUpdateStatus(status?: string): boolean {
    return ['PENDING', 'PROCESSING', 'SHIPPED'].includes(status ?? '');
  }

  getPaymentStatusLabel(status?: string): string {
    const map: Record<string, string> = {
      Pending: 'Chờ thanh toán',
      PENDING: 'Chờ thanh toán',
      Paid: 'Đã thanh toán',
      PAID: 'Đã thanh toán',
      Failed: 'Thất bại',
      FAILED: 'Thất bại',
      Refunded: 'Đã hoàn tiền',
      REFUNDED: 'Đã hoàn tiền',
      Unpaid: 'Chưa thanh toán',
      UNPAID: 'Chưa thanh toán',
      Processing: 'Đang xử lý',
      PROCESSING: 'Đang xử lý',
    };
    return map[status ?? ''] ?? status ?? 'Chưa rõ';
  }

  getPaymentStatusClass(status?: string): string {
    const map: Record<string, string> = {
      Pending: 'badge-warning',
      PENDING: 'badge-warning',
      Paid: 'badge-success',
      PAID: 'badge-success',
      Failed: 'badge-danger',
      FAILED: 'badge-danger',
      Refunded: 'badge-info',
      REFUNDED: 'badge-info',
      Unpaid: 'badge-warning',
      UNPAID: 'badge-warning',
      Processing: 'badge-info',
      PROCESSING: 'badge-info',
    };
    return map[status ?? ''] ?? 'badge-default';
  }
}
