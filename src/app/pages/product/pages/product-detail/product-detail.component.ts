import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { CarouselModule } from 'primeng/carousel';
import { NgOptimizedImage } from '@angular/common';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    RippleModule,
    CarouselModule,
    NgOptimizedImage,
  ],
  templateUrl: './product-detail.component.html',
  styleUrl: './product-detail.component.scss',
})
export class ProductDetailComponent implements OnInit {
  // Fake Product Data
  product = {
    id: 1,
    name: 'Loa Bluetooth Sony Extra Bass SRS-XB13',
    price: 990000,
    originalPrice: 1290000,
    rating: 4.8,
    reviews: 1250,
    stock: 50,
    shortDesc:
      'Tận hưởng âm thanh vòm đỉnh cao với pin cực trâu lên tới 16 giờ. Thiết kế siêu nhỏ gọn và tiện lợi để bạn có thể mang theo bất cứ đâu.',
    features: [
      'Chống nước, chống bụi chuẩn IP67',
      'Pin bền bỉ lên đến 16 giờ',
      'Dây đeo đa năng đi kèm',
      'Công nghệ Extra Bass mạnh mẽ',
    ],
    images: [
      'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&q=80&w=200',
      'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&q=80&w=200',
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=200',
    ],
    colors: ['#000000', '#3b82f6', '#ef4444', '#f59e0b'],
    sizes: [], // Not applicable for speaker, but leaving empty for logic
  };

  mainImage = this.product.images[0];
  selectedColor = this.product.colors[0];
  quantity = 1;
  activeTab = 'description';

  // Fake Bundle
  bundleProducts = [
    {
      name: 'Loa Bluetooth Sony Extra Bass SRS-XB13',
      price: 990000,
      isCurrent: true,
      image: this.product.images[0],
      checked: true,
    },
    {
      name: 'Dây Vải Sony Đeo Cổ Dù Cực Bền',
      price: 150000,
      image:
        'https://images.unsplash.com/photo-1560769629-975ec94e6a86?auto=format&fit=crop&q=80&w=150',
      checked: true,
    },
  ];

  // Related Products
  relatedProducts = [
    {
      name: 'Tai nghe chụp tai Sony WH-CH520',
      price: 1200000,
      originalPrice: 1500000,
      discount: 20,
      rating: 4.8,
      image:
        'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?auto=format&fit=crop&q=80&w=300',
    },
    {
      name: 'Apple AirPods Pro (2nd gen)',
      price: 4990000,
      originalPrice: 5500000,
      discount: 10,
      rating: 4.9,
      image:
        'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?auto=format&fit=crop&q=80&w=300',
    },
    {
      name: 'Bose QuietComfort 45',
      price: 6500000,
      originalPrice: 7000000,
      discount: 7,
      rating: 4.7,
      image:
        'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&q=80&w=300',
    },
    {
      name: 'JBL Charge 5 Bluetooth',
      price: 3490000,
      originalPrice: 3990000,
      discount: 12,
      rating: 4.8,
      image:
        'https://images.unsplash.com/photo-1589256469067-ea99122bbdc4?auto=format&fit=crop&q=80&w=300',
    },
    {
      name: 'Marshall Emberton II',
      price: 4290000,
      originalPrice: 4790000,
      discount: 10,
      rating: 4.9,
      image:
        'https://images.unsplash.com/photo-1612089851680-33bf3d762e55?auto=format&fit=crop&q=80&w=300',
    },
  ];

  responsiveOptions: any[] | undefined;

  constructor() {}

  ngOnInit(): void {
    this.responsiveOptions = [
      {
        breakpoint: '1199px',
        numVisible: 3,
        numScroll: 1,
      },
      {
        breakpoint: '991px',
        numVisible: 2,
        numScroll: 1,
      },
      {
        breakpoint: '767px',
        numVisible: 1,
        numScroll: 1,
      },
    ];
  }

  setMainImage(img: string) {
    this.mainImage = img;
  }

  selectColor(color: string) {
    this.selectedColor = color;
  }

  increaseQty() {
    if (this.quantity < this.product.stock) this.quantity++;
  }

  decreaseQty() {
    if (this.quantity > 1) this.quantity--;
  }

  getBundleTotal(): number {
    return this.bundleProducts
      .filter((p) => p.checked)
      .reduce((sum, p) => sum + p.price, 0);
  }

  formatPrice(price: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(price);
  }
}
