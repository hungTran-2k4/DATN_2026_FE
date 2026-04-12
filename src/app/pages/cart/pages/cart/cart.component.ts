import { Component } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { RippleModule } from 'primeng/ripple';
import { DialogModule } from 'primeng/dialog';

interface CartItem {
  id: string;
  name: string;
  image: string;
  variant: string;
  price: number;
  originalPrice?: number;
  quantity: number;
  stock: number;
  selected: boolean;
  isDeal: boolean;
  outOfStock: boolean;
}

interface CartShop {
  id: string;
  name: string;
  icon: string; // Mall, normal
  promoBadge?: string;
  selected: boolean;
  items: CartItem[];
}

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    CheckboxModule,
    RippleModule,
    DialogModule,
    NgOptimizedImage,
  ],
  templateUrl: './cart.component.html',
  styleUrl: './cart.component.scss',
})
export class CartComponent {
  // Mock Data mimicking the image content
  shops: CartShop[] = [
    {
      id: 'shop1',
      name: 'Moon Shoes Store',
      icon: 'pi-shopping-bag',
      selected: true,
      items: [
        {
          id: 'item1',
          name: 'Giày Thể Thao Nam Nữ Dễ Phối Đồ, Bền Đẹp, Êm Chân',
          variant: 'Đồng xu box bill, 41',
          image:
            'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&q=80&w=200',
          price: 320000,
          originalPrice: 450000,
          quantity: 1,
          stock: 100,
          selected: true,
          isDeal: true,
          outOfStock: false,
        },
      ],
    },
    {
      id: 'shop2',
      name: 'Roas Max',
      icon: 'pi-shop',
      selected: false,
      items: [
        {
          id: 'item2',
          name: 'Giày Sneaker Panda Đen Trắng Cổ Thấp Thời Trang',
          variant: 'JA Panda Trắng, 41',
          image:
            'https://images.unsplash.com/photo-1595950653106-6c9ebd614c3a?auto=format&fit=crop&q=80&w=200',
          price: 299000,
          quantity: 1,
          stock: 0,
          selected: false,
          isDeal: false,
          outOfStock: true,
        },
      ],
    },
    {
      id: 'shop3',
      name: 'Sidotech Official Store',
      icon: 'pi-star-fill text-red-500', // Mocking Mall
      promoBadge: 'Mua Kèm Deal Sốc với mức giá ưu đãi',
      selected: false,
      items: [
        {
          id: 'item3',
          name: 'Bàn phím máy tính không dây SIDOTECH XKB02 nhỏ gọn',
          variant: 'XKB02 - Trắng',
          image:
            'https://images.unsplash.com/photo-1595225476474-87563907a212?auto=format&fit=crop&q=80&w=200',
          price: 149000,
          quantity: 1,
          stock: 0,
          selected: false,
          isDeal: false,
          outOfStock: true,
        },
      ],
    },
    {
      id: 'shop4',
      name: 'Áo thun bán lẻ giá sỉ',
      icon: 'pi-box',
      promoBadge: 'Mua thêm 3 sản phẩm chỉ với 129.000đ',
      selected: false,
      items: [
        {
          id: 'item4',
          name: 'BST 50 - Áo thun nam nữ form rộng vải dày mịn cá tính',
          variant: 'Mẫu 1, Size XS',
          image:
            'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&q=80&w=200',
          price: 20900,
          originalPrice: 40000,
          quantity: 1,
          stock: 50,
          selected: false,
          isDeal: true,
          outOfStock: false,
        },
      ],
    },
  ];

  selectAll: boolean = false;

  constructor() {
    this.checkIfAllSelected();
  }

  // --- Logic Selection ---
  toggleSelectAll() {
    this.shops.forEach((shop) => {
      // Only select shops that have at least one in-stock item
      const hasInStock = shop.items.some((k) => !k.outOfStock);
      if (hasInStock) {
        shop.selected = this.selectAll;
        shop.items.forEach((item) => {
          if (!item.outOfStock) {
            item.selected = this.selectAll;
          }
        });
      }
    });
  }

  toggleShopSelection(shop: CartShop) {
    shop.items.forEach((item) => {
      if (!item.outOfStock) {
        item.selected = shop.selected;
      }
    });
    this.checkIfAllSelected();
  }

  toggleItemSelection(shop: CartShop, item: CartItem) {
    if (item.outOfStock) {
      item.selected = false;
      return;
    }
    shop.selected = shop.items
      .filter((i) => !i.outOfStock)
      .every((i) => i.selected);
    this.checkIfAllSelected();
  }

  checkIfAllSelected() {
    // True if every shop (that has available items) is selected
    const availableShops = this.shops.filter((s) =>
      s.items.some((i) => !i.outOfStock),
    );
    if (availableShops.length === 0) {
      this.selectAll = false;
      return;
    }
    this.selectAll = availableShops.every((s) => s.selected);
  }

  // --- Logic Quantity ---
  increaseQty(item: CartItem) {
    if (!item.outOfStock && item.quantity < item.stock) {
      item.quantity++;
    }
  }

  decreaseQty(item: CartItem) {
    if (!item.outOfStock && item.quantity > 1) {
      item.quantity--;
    }
  }

  removeItem(shop: CartShop, item: CartItem) {
    shop.items = shop.items.filter((i) => i.id !== item.id);
    if (shop.items.length === 0) {
      this.shops = this.shops.filter((s) => s.id !== shop.id);
    }
    this.checkIfAllSelected();
  }

  proceedToCheckout() {
    console.log('Proceeding to checkout with selected items');
  }

  // --- Computations ---
  getSelectedCount(): number {
    let count = 0;
    this.shops.forEach((s) => {
      count += s.items.filter((i) => i.selected && !i.outOfStock).length;
    });
    return count;
  }

  getTotalPrice(): number {
    let total = 0;
    this.shops.forEach((s) => {
      s.items.forEach((i) => {
        if (i.selected && !i.outOfStock) {
          total += i.price * i.quantity;
        }
      });
    });
    return total;
  }

  getSavedAmount(): number {
    let saved = 0;
    this.shops.forEach((s) => {
      s.items.forEach((i) => {
        if (i.selected && !i.outOfStock && i.originalPrice) {
          saved += (i.originalPrice - i.price) * i.quantity;
        }
      });
    });
    return saved;
  }

  // Helper formatting
  formatPrice(price: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(price);
  }
}
