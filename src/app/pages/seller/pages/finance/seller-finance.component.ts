import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-seller-finance',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex flex-col items-center justify-center py-20 text-center">
      <div class="w-20 h-20 bg-purple-50 rounded-full flex items-center justify-center mb-6">
        <i class="pi pi-wallet text-3xl text-purple-500"></i>
      </div>
      <h2 class="text-xl font-black text-gray-900 mb-2">Tài chính</h2>
      <p class="text-gray-500 text-sm max-w-sm">Tính năng quản lý doanh thu và thanh toán đang được phát triển.</p>
    </div>
  `,
})
export class SellerFinanceComponent {}
