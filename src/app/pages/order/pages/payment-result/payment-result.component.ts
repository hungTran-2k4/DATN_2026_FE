import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { ButtonModule } from 'primeng/button';
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
})
export class PaymentResultComponent implements OnInit {
  status: 'loading' | 'success' | 'failed' = 'loading';
  message: string = 'Đang xử lý kết quả thanh toán...';
  amount: string = '';
  orderId: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private apiService: ApiBaseService,
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      // Build query string
      const queryString = new URLSearchParams(params).toString();
      if (!queryString) {
        this.status = 'failed';
        this.message = 'Không tìm thấy thông tin thanh toán.';
        return;
      }

      this.orderId = params['vnp_TxnRef'] || '';
      const vnpAmount = params['vnp_Amount'];
      if (vnpAmount) {
        this.amount = new Intl.NumberFormat('vi-VN', {
          style: 'currency',
          currency: 'VND',
        }).format(Number(vnpAmount) / 100);
      }

      // Call backend to verify vnpayReturn
      this.http
        .get(`${environment.apiUrl}/api/payments/vnpay-return?${queryString}`, {
          withCredentials: true,
        })
        .subscribe({
          next: (res: any) => {
            if (res.isSuccess) {
              this.status = 'success';
              this.message = 'Thanh toán thành công!';
            } else {
              this.status = 'failed';
              this.message = res.message || 'Thanh toán không thành công.';
            }
          },
          error: (err) => {
            this.status = 'failed';
            this.message = 'Thanh toán thất bại hoặc giao dịch bị huỷ.';
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
