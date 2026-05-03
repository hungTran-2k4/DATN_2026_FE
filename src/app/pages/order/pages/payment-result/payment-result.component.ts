import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { ButtonModule } from 'primeng/button';
import { filter, take } from 'rxjs/operators';
import {
  ApiBaseService,
  CreatePaymentUrlRequest,
} from '../../../../shared/api/generated/api-service-base.service';

@Component({
  selector: 'app-payment-result',
  standalone: true,
  imports: [CommonModule, RouterModule, ButtonModule],
  templateUrl: './payment-result.component.html',
  styleUrl: './payment-result.component.scss',
  host: { ngSkipHydration: 'true' },
})
export class PaymentResultComponent implements OnInit {
  status: 'loading' | 'success' | 'failed' = 'loading';
  isProcessing: boolean = true;
  message: string = 'Đang xử lý kết quả thanh toán...';
  amount: string = '';
  orderId: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private apiService: ApiBaseService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.isProcessing = true;
    this.status = 'loading';
    this.message = 'Đang nhận thông tin giao dịch...';

    this.route.queryParams
      .pipe(
        filter((params) => !!(params['vnp_ResponseCode'] || params['vnp_TxnRef'])),
        take(1)
      )
      .subscribe((params) => {
        this.isProcessing = true;
        this.status = 'loading';
        this.message = 'Đang xác thực giao dịch với hệ thống...';

        const queryString = new URLSearchParams(params as any).toString();
        this.orderId = params['vnp_TxnRef'] || '';
        const vnpAmount = params['vnp_Amount'];

        if (vnpAmount) {
          this.amount = new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
          }).format(Number(vnpAmount) / 100);
        }

        this.http
          .get(`${environment.apiUrl}/api/payments/vnpay-return?${queryString}`, {
            withCredentials: true,
          })
          .subscribe({
            next: (res: any) => {
              this.isProcessing = false;
              if (res.isSuccess) {
                this.status = 'success';
                this.message = 'Thanh toán thành công!';
              } else {
                this.status = 'failed';
                this.message = res.message || 'Thanh toán không thành công.';
              }
            },
            error: (err) => {
              this.isProcessing = false;
              this.status = 'failed';
              this.message = 'Thanh toán không thành công hoặc giao dịch bị huỷ.';
            },
          });
      });
  }

  goToOrder() {
    this.router.navigate(['/profile'], { queryParams: { tab: 'purchases' } });
  }

  goToHome() {
    this.router.navigate(['/']);
  }

  retryPayment() {
    this.status = 'loading';
    this.message = 'Đang tạo lại liên kết thanh toán...';
    const request = new CreatePaymentUrlRequest({ orderId: this.orderId });
    this.apiService.createPaymentUrl(request).subscribe({
      next: (res) => {
        if (res.success && res.paymentUrl) {
          window.location.href = res.paymentUrl;
        } else {
          this.status = 'failed';
          this.message = 'Lỗi tạo liên kết thanh toán.';
        }
      },
      error: (err) => {
        this.status = 'failed';
        this.message = 'Lỗi kết nối khi tạo liên kết thanh toán.';
      },
    });
  }
}
