import { CommonModule, NgOptimizedImage } from '@angular/common';
import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { TooltipModule } from 'primeng/tooltip';
import { CartService } from '../../../../features/cart/model/cart.service';
import { MessageService } from 'primeng/api';

export interface ProductCardData {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  image: string;
  rating?: number;
  soldCount?: number;
  totalStock?: number;
  category?: string;
  variantId?: string; // For direct add to cart
}

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule, NgOptimizedImage, RouterLink, ButtonModule, RippleModule, TooltipModule],
  templateUrl: './product-card.component.html',
  styleUrl: './product-card.component.scss',
})
export class ProductCardComponent {
  @Input({ required: true }) data!: ProductCardData;
  @Input() viewMode: 'grid' | 'list' = 'grid';
  @Input() showProgressBar = false;
  
  @Output() quickView = new EventEmitter<string>();
  @Output() toggleFavorite = new EventEmitter<string>();

  private readonly cartService = inject(CartService);
  private readonly messageService = inject(MessageService);

  isFavorite = false;
  isAdding = false;

  onAddToCart(event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    if (!this.data.variantId) {
      this.messageService.add({ 
        severity: 'info', 
        summary: 'Thông báo', 
        detail: 'Vui lòng chọn phiên bản sản phẩm trong chi tiết.' 
      });
      return;
    }

    this.isAdding = true;
    this.cartService.addToCart(this.data.variantId, 1).subscribe({
      next: (ok) => {
        this.isAdding = false;
        if (ok) {
          this.messageService.add({ 
            severity: 'success', 
            summary: 'Thành công', 
            detail: `Đã thêm "${this.data.name}" vào giỏ hàng.` 
          });
        }
      },
      error: () => {
        this.isAdding = false;
      }
    });
  }

  onToggleFavorite(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.isFavorite = !this.isFavorite;
    this.toggleFavorite.emit(this.data.id);
  }

  onQuickView(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.quickView.emit(this.data.id);
  }

  formatPrice(price: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(price);
  }

  get soldPercentage(): number {
    if (!this.data.totalStock || !this.data.soldCount) return 0;
    return Math.min(100, (this.data.soldCount / this.data.totalStock) * 100);
  }

  isGuid(val?: string): boolean {
    if (!val) return false;
    const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return guidRegex.test(val);
  }
}
