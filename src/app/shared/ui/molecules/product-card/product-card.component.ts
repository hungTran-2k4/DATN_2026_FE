import { CommonModule, NgOptimizedImage } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

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
  imports: [CommonModule, NgOptimizedImage, RouterLink],
  templateUrl: './product-card.component.html',
  styleUrl: './product-card.component.scss',
})
export class ProductCardComponent {
  @Input({ required: true }) data!: ProductCardData;
  @Input() viewMode: 'grid' | 'list' = 'grid';
  @Input() showProgressBar = false;
  

  isFavorite = false;
  isAdding = false;

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
