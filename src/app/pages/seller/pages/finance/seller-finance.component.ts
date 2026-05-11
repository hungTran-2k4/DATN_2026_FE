import { Component, OnInit, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { SkeletonModule } from 'primeng/skeleton';
import {
  WalletService,
  WalletBalance,
  WalletLedger,
} from '../../../../core/services/wallet.service';
import { SellerRegistrationService } from '../../../../features/seller-registration/model/seller-registration.service';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-seller-finance',
  standalone: true,
  imports: [
    CommonModule,
    TableModule,
    ButtonModule,
    CardModule,
    TagModule,
    SkeletonModule,
  ],
  templateUrl: './seller-finance.component.html',
  styleUrl: './seller-finance.component.scss',
})
export class SellerFinanceComponent implements OnInit {
  balance: WalletBalance | null = null;
  history: WalletLedger[] = [];
  isLoading = true;
  isBrowser = false;

  constructor(
    private readonly walletService: WalletService,
    private readonly sellerService: SellerRegistrationService,
    @Inject(PLATFORM_ID) private readonly platformId: Object,
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    if (this.isBrowser) {
      this.sellerService.shopInfo$.subscribe((shop) => {
        if (shop?.id) {
          this.loadData(shop.id);
        }
      });
    }
  }

  loadData(shopId: string): void {
    this.isLoading = true;
    this.walletService.getBalance(shopId).subscribe((b) => (this.balance = b));
    this.walletService
      .getHistory(shopId)
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe((h) => (this.history = h));
  }

  formatPrice(price: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(price);
  }
}
