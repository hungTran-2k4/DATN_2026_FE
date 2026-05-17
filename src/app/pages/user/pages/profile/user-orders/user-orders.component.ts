import { Component, OnInit, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { RouterModule } from '@angular/router';
import { PaginatorModule } from 'primeng/paginator';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { DialogModule } from 'primeng/dialog';
import { RatingModule } from 'primeng/rating';
import { InputTextarea } from 'primeng/inputtextarea';
import {
  ApiBaseService,
  CreatePaymentUrlRequest,
  OrderSummaryDto,
  BooleanApiResponse,
  FileParameter,
} from '../../../../../shared/api/generated/api-service-base.service';
import { MessageService } from 'primeng/api';

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
    RatingModule,
    InputTextarea,
    FormsModule,
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
  
  // Detail Dialog
  showDetail = false;
  selectedOrder: any = null;
  isLoadingDetail = false;

  statusTabs = [
    { label: 'Tất cả', value: undefined },
    { label: 'Chờ xác nhận', value: 'PENDING' },
    { label: 'Chờ lấy hàng', value: 'PROCESSING' },
    { label: 'Đang giao', value: 'SHIPPED' },
    { label: 'Đã giao', value: 'DELIVERED' },
    { label: 'Hoàn thành', value: 'COMPLETED' },
    { label: 'Trả hàng', value: 'RETURNED' },
    { label: 'Đã hủy', value: 'CANCELLED' },
  ];

  // Shipment tracking
  shipmentInfo: any = null;

  // Review Dialog
  showReviewDialog = false;
  reviewItem: any = null;
  reviewRating = 5;
  reviewComment = '';
  isSubmittingReview = false;
  reviewOrder: any = null;
  reviewFiles: File[] = [];
  reviewImagePreviews: string[] = [];

  // Map theo dõi trạng thái đã đánh giá hết của các đơn hàng: orderId -> true (đã đánh giá xong toàn bộ)
  orderReviewStatusMap: Record<string, boolean> = {};

  constructor(
    private apiService: ApiBaseService,
    @Inject(PLATFORM_ID) private readonly platformId: Object,
  ) {}

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.loadOrders();
    }
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

          // Kiểm tra ngầm trạng thái đánh giá cho các đơn hàng COMPLETED để ẩn nút Đánh giá ngoài danh sách
          this.orders.forEach(order => {
            if (order.orderStatus === 'COMPLETED' && order.id) {
              this.apiService.orders(order.id).subscribe({
                next: (detailRes) => {
                  if (detailRes.data && detailRes.data.items) {
                    const allReviewed = detailRes.data.items.every((item: any) => item.isReviewed);
                    this.orderReviewStatusMap[order.id!] = allReviewed;
                  }
                }
              });
            }
          });
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

  parseAddress(addressJson?: string): any {
    if (!addressJson) return { fullName: 'N/A', phoneNumber: '', detailedAddress: 'N/A' };
    try {
      const addr = typeof addressJson === 'string' && addressJson.startsWith('{') 
        ? JSON.parse(addressJson) 
        : addressJson;
      
      if (typeof addr === 'object') {
        return {
          fullName: addr.FullName || addr.fullName || 'N/A',
          phoneNumber: addr.PhoneNumber || addr.phoneNumber || '',
          detailedAddress: addr.DetailedAddress || addr.detailedAddress || 'N/A'
        };
      }
      return { fullName: 'N/A', phoneNumber: '', detailedAddress: addressJson };
    } catch (e) {
      return { fullName: 'N/A', phoneNumber: '', detailedAddress: addressJson };
    }
  }

  openDetail(order: OrderSummaryDto) {
    this.showDetail = true;
    this.selectedOrder = null;
    this.isLoadingDetail = true;
    this.shipmentInfo = null;
    this.apiService.orders(order.id!).subscribe({
      next: (res) => {
        this.selectedOrder = res.data;
        this.isLoadingDetail = false;
        // Load tracking info nếu đơn đang giao hoặc đã giao
        const status = res.data?.orderStatus;
        if (status === 'SHIPPED' || status === 'DELIVERED') {
          this.loadShipmentTracking(order.id!);
        }
      },
      error: () => {
        this.isLoadingDetail = false;
      }
    });
  }

  loadShipmentTracking(orderId: string) {
    this.apiService.tracking(orderId).subscribe({
      next: (res) => { if (res.success) this.shipmentInfo = res.data; },
    });
  }

  getStatusLabel(status?: string): string {
    const map: Record<string, string> = {
      PENDING: 'Chờ xác nhận',
      PROCESSING: 'Chờ lấy hàng',
      SHIPPED: 'Đang giao',
      DELIVERED: 'Đã giao',
      COMPLETED: 'Hoàn thành',
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
      COMPLETED: 'bg-emerald-100 text-emerald-700',
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

  confirmReceived(order: OrderSummaryDto) {
    if (!order.id) return;
    
    if (confirm('Bạn xác nhận đã nhận được hàng và hài lòng với sản phẩm? Thao tác này sẽ giải phóng tiền cho người bán và không thể hoàn tác.')) {
      this.isLoading = true;
      this.apiService.confirmReceived(order.id).subscribe({
        next: (res) => {
          if (res.success) {
            this.loadOrders();
          } else {
            alert(res.message || 'Không thể xác nhận nhận hàng.');
            this.isLoading = false;
          }
        },
        error: (err) => {
          alert('Lỗi hệ thống khi xác nhận nhận hàng.');
          this.isLoading = false;
        }
      });
    }
  }

  directReview(order: OrderSummaryDto) {
    if (!order.id) return;
    this.isLoading = true;
    this.apiService.orders(order.id).subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res.data && res.data.items && res.data.items.length > 0) {
          // Lọc ra danh sách các sản phẩm CHƯA được đánh giá
          const unreviewedItems = res.data.items.filter((i: any) => !i.isReviewed);
          
          if (unreviewedItems.length > 0) {
            // Mở dialog đánh giá cho sản phẩm chưa đánh giá đầu tiên
            const firstItem = unreviewedItems[0];
            this.openReviewDialog(firstItem, res.data);
          } else {
            alert('Tất cả sản phẩm trong đơn hàng này đã được bạn đánh giá rồi!');
          }
        } else {
          alert('Không tìm thấy sản phẩm nào trong đơn hàng để đánh giá.');
        }
      },
      error: () => {
        this.isLoading = false;
        alert('Không thể tải thông tin đơn hàng để đánh giá.');
      }
    });
  }

  // ─── REVIEW LOGIC ───
  openReviewDialog(item: any, order: any) {
    this.reviewItem = item;
    this.reviewOrder = order;
    this.reviewRating = 5;
    this.reviewComment = '';
    this.reviewFiles = [];
    this.reviewImagePreviews = [];
    this.showReviewDialog = true;
  }

  getRatingText(rating: number): string {
    const texts: Record<number, string> = {
      1: 'Tệ: Rất không hài lòng',
      2: 'Kém: Không hài lòng',
      3: 'Bình thường: Tạm được',
      4: 'Tốt: Hài lòng',
      5: 'Tuyệt vời: Rất hài lòng'
    };
    return texts[rating] || '';
  }

  submitReview() {
    if (!this.reviewItem || !this.reviewOrder) return;

    this.isSubmittingReview = true;

    // Convert File[] to FileParameter[]
    const fileParams: FileParameter[] = this.reviewFiles.length > 0
        ? this.reviewFiles.map(f => ({ data: f, fileName: f.name }))
        : [];

    // NSwag generated: reviewsPOST(variantId, orderId, rating, comment, imageUrls, images)
    this.apiService.reviewsPOST(
        this.reviewItem.variantId,
        this.reviewOrder.id,
        this.reviewRating,
        this.reviewComment || '',
        [],         // imageUrls (empty array, not null)
        fileParams  // images (file upload)
    ).subscribe({
        next: (res) => {
            this.isSubmittingReview = false;
            if (res.success) {
                alert('Cảm ơn bạn đã đánh giá sản phẩm!');
                this.showReviewDialog = false;
                
                const currentOrderId = this.reviewOrder.id;
                
                // Nếu đang mở dialog Chi tiết đơn hàng, reload lại dữ liệu của nó
                if (this.showDetail && this.selectedOrder && this.selectedOrder.id === currentOrderId) {
                  this.openDetail(this.selectedOrder);
                }
                
                // Load lại danh sách đơn hàng để kiểm tra & cập nhật trạng thái mới nhất
                this.loadOrders();
            } else {
                alert(res.message || 'Không thể gửi đánh giá lúc này.');
            }
        },
        error: (err) => {
            this.isSubmittingReview = false;
            const msg = err?.result?.message || err?.message || 'Có lỗi xảy ra khi gửi đánh giá.';
            alert(msg);
        }
    });
  }

  onReviewImagesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;

    const remaining = 5 - this.reviewFiles.length;
    const files = Array.from(input.files).slice(0, remaining);

    files.forEach(file => {
      this.reviewFiles.push(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        this.reviewImagePreviews.push(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    });

    // Reset input
    input.value = '';
  }

  removeReviewImage(index: number) {
    this.reviewFiles.splice(index, 1);
    this.reviewImagePreviews.splice(index, 1);
  }
}
