import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-seller-reviews',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex flex-col items-center justify-center py-20 text-center">
      <div class="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mb-6">
        <i class="pi pi-star text-3xl text-amber-500"></i>
      </div>
      <h2 class="text-xl font-black text-gray-900 mb-2">Quản lý đánh giá</h2>
      <p class="text-gray-500 text-sm max-w-sm">Tính năng xem và phản hồi đánh giá từ khách hàng đang được phát triển.</p>
    </div>
  `,
})
export class SellerReviewsComponent {}
