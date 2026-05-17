import {
  Component,
  OnInit,
  OnDestroy,
  PLATFORM_ID,
  Inject,
  Optional,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
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
  API_BASE_URL,
  CreateShipmentPayload,
} from '../../../../shared/api/generated/api-service-base.service';
import { SellerFacade } from '../../../../features/seller/seller.facade';
import { SellerRegistrationService } from '../../../../features/seller-registration/model/seller-registration.service';
import { OrderPagedResult } from '../../../../entities/order/model/seller-order.repository';

@Component({
  selector: 'app-seller-orders',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    ButtonModule,
    SkeletonModule,
    ToastModule,
    PaginatorModule,
    DialogModule,
    DropdownModule,
    TextareaModule,
  ],
  providers: [MessageService],
  templateUrl: './seller-orders.component.html',
  styleUrl: './seller-orders.component.scss',
})
export class SellerOrdersComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  shopId = '';
  result: OrderPagedResult = {
    items: [],
    pageNumber: 1,
    pageSize: 20,
    totalPages: 0,
    totalRecords: 0,
  };
  isLoading = true;
  selectedStatus = '';
  currentPage = 1;
  pageSize = 20;
  skeletons = Array(5).fill(null);

  searchKeyword = '';

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

  // Shipment tracking
  shipmentInfo: any = null;
  isCreatingShipment = false;

  // GHN Pick Shifts
  pickShifts: any[] = [];
  selectedPickShiftId: number | null = null;
  isLoadingShifts = false;

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
    PENDING: [
      { label: 'Xác nhận đơn & Chuẩn bị hàng', value: 'PROCESSING' },
      { label: 'Hủy đơn', value: 'CANCELLED' },
    ],
    PROCESSING: [
      { label: 'Bàn giao cho đơn vị vận chuyển', value: 'SHIPPED' },
      { label: 'Hủy đơn', value: 'CANCELLED' },
    ],
    SHIPPED: [{ label: 'Xác nhận đã giao (Mô phỏng)', value: 'DELIVERED' }],
    DELIVERED: [{ label: 'Trả hàng/Hoàn tiền', value: 'RETURNED' }],
  };

  constructor(
    private readonly sellerFacade: SellerFacade,
    private readonly sellerService: SellerRegistrationService,
    private readonly messageService: MessageService,
    private readonly route: ActivatedRoute,
    private readonly api: ApiBaseService,
    private readonly http: HttpClient,
    @Optional() @Inject(API_BASE_URL) private readonly baseUrl: string,
    @Inject(PLATFORM_ID) private readonly platformId: Object,
  ) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    // Read status from query params
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe((params) => {
        this.selectedStatus = params['status'] ?? '';
      });

    this.sellerService.shopInfo$
      .pipe(takeUntil(this.destroy$))
      .subscribe((shop) => {
        if (shop?.id) {
          this.shopId = shop.id;
          this.loadOrders();
        }
      });
    this.sellerService.initState();

    // Fallback: Nếu sau 3s vẫn không có shopId thì ẩn loading để tránh kẹt skeletons
    setTimeout(() => {
      if (!this.shopId) this.isLoading = false;
    }, 3000);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadOrders(): void {
    if (!this.shopId) return;
    this.isLoading = true;
    this.sellerFacade
      .getOrders(
        this.shopId,
        this.selectedStatus || undefined,
        this.currentPage,
        this.pageSize,
        this.searchKeyword.trim() || undefined,
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (r) => {
          this.result = r;
          this.isLoading = false;
        },
        error: () => {
          this.isLoading = false;
        },
      });
  }

  onSearch(): void {
    this.currentPage = 1;
    this.loadOrders();
  }

  clearSearch(): void {
    this.searchKeyword = '';
    this.currentPage = 1;
    this.loadOrders();
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
      next: (o) => {
        this.selectedOrder = o ?? null;
        this.isLoadingDetail = false;
      },
      error: () => {
        this.isLoadingDetail = false;
      },
    });
  }

  loadPickShifts(): void {
    this.isLoadingShifts = true;
    this.pickShifts = [];
    const url = `${this.baseUrl || ''}/api/Shipping/pick-shifts`;
    this.http.get<any>(url).subscribe({
      next: (res) => {
        this.isLoadingShifts = false;
        if (res.success && res.data) {
          this.pickShifts = res.data.map((shift: any) => ({
            label: `${shift.title} (${new Date(shift.from_time * 1000).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - ${new Date(shift.to_time * 1000).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })})`,
            value: shift.id
          }));
        }
      },
      error: () => {
        this.isLoadingShifts = false;
      }
    });
  }

  openStatusUpdate(order: OrderSummaryDto): void {
    this.updatingOrderId = order.id!;
    this.newStatus = '';
    this.statusNote = '';
    this.selectedPickShiftId = null;
    this.showStatusDialog = true;
    
    // Nếu đơn hàng đang PENDING thì sẽ chuẩn bị tạo vận đơn (chuyển sang PROCESSING), lấy các ca của GHN
    if (order.orderStatus === 'PENDING') {
      this.loadPickShifts();
    }
  }

  updateStatus(): void {
    if (!this.newStatus || !this.updatingOrderId) return;

    // ── Nếu chuyển sang PROCESSING → Gọi GHN tạo vận đơn ──
    if (this.newStatus === 'PROCESSING') {
      this.isCreatingShipment = true;
      this.isUpdating = true;
      
      // Tạo payload kèm theo ca lấy hàng nếu chọn
      const payload: any = {
        note: this.statusNote ? this.statusNote : undefined,
        weight: 500,
      };
      
      if (this.selectedPickShiftId) {
        payload.pickShift = [this.selectedPickShiftId];
      }

      this.api.createShipment(this.updatingOrderId, payload).subscribe({
        next: (res) => {
          this.isCreatingShipment = false;
          this.isUpdating = false;
          this.showStatusDialog = false;
          if (res.success) {
            this.messageService.add({
              severity: 'success',
              summary: 'Tạo vận đơn thành công',
              detail: `Mã vận đơn GHN: ${res.data?.trackingCode || 'N/A'}`,
              life: 5000,
            });
            this.loadOrders();
          } else {
            this.messageService.add({
              severity: 'error',
              summary: 'Lỗi',
              detail: res.message || 'Không thể tạo vận đơn GHN.',
            });
          }
        },
        error: (err) => {
          this.isCreatingShipment = false;
          this.isUpdating = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Lỗi',
            detail: 'Không thể kết nối GHN. Vui lòng thử lại.',
          });
        },
      });
      return;
    }

    // ── Các trạng thái khác: Cập nhật bình thường ──
    this.isUpdating = true;
    this.sellerFacade
      .updateOrderStatus(
        this.updatingOrderId,
        this.newStatus,
        this.statusNote || undefined,
      )
      .subscribe({
        next: (ok) => {
          this.isUpdating = false;
          this.showStatusDialog = false;
          if (ok) {
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

  // ── MÔ PHỎNG GHN WEBHOOK ──
  simulateGhnDelivery(order: OrderSummaryDto): void {
    const payload = {
      ClientOrderCode: order.orderCode,
      Status: 'delivered',
      Type: 'switch_status',
    };

    this.isLoading = true;
    const url = `${this.baseUrl}/api/Shipping/webhook/ghn`;

    this.http.post(url, payload).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Mô phỏng thành công',
          detail:
            'Đã gửi tín hiệu Delivered giả lập cho đơn ' + order.orderCode,
        });
        this.loadOrders();
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Simulate error:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Lỗi',
          detail: 'Không thể gửi tín hiệu giả lập. Kiểm tra console.',
        });
      },
    });
  }

  // ── Xem tracking GHN ──
  loadShipmentInfo(orderId: string): void {
    this.shipmentInfo = null;
    this.api.tracking(orderId).subscribe({
      next: (res) => {
        if (res.success) this.shipmentInfo = res.data;
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
      // Handle potential double encoding or raw string
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
      this.result.items.find((o: OrderSummaryDto) => o.id === orderId)
        ?.orderStatus ?? ''
    );
  }

  canUpdateStatus(status?: string): boolean {
    return ['PENDING', 'PROCESSING'].includes(status ?? '');
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
