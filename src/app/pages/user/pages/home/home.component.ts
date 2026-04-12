import { CommonModule, NgOptimizedImage } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CarouselModule } from 'primeng/carousel';
import { RippleModule } from 'primeng/ripple';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    CarouselModule,
    ButtonModule,
    RippleModule,
    RouterModule,
    NgOptimizedImage,
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements OnInit {
  categories = [
    {
      name: 'Computer',
      icon: 'pi pi-desktop',
      color: 'bg-blue-50 text-blue-600',
    },
    {
      name: 'Mobile',
      icon: 'pi pi-mobile',
      color: 'bg-purple-50 text-purple-600',
    },
    {
      name: 'Headphone',
      icon: 'pi pi-headphones',
      color: 'bg-orange-50 text-orange-600',
    },
    { name: 'Gaming', icon: 'pi pi-play', color: 'bg-green-50 text-green-600' },
    { name: 'Camera', icon: 'pi pi-camera', color: 'bg-red-50 text-red-600' },
    { name: 'Watch', icon: 'pi pi-clock', color: 'bg-teal-50 text-teal-600' },
    {
      name: 'Speaker',
      icon: 'pi pi-volume-up',
      color: 'bg-yellow-50 text-yellow-600',
    },
  ];

  weeklyDeals = [
    {
      name: 'Sony Alpha ILCE-7M4',
      originalPrice: 2800,
      price: 2399,
      image:
        'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&q=80&w=400',
      discount: 15,
      soldOut: 85,
      rating: 4.8,
    },
    {
      name: 'Apple iPhone 15 Pro Max',
      originalPrice: 1199,
      price: 1099,
      image:
        'https://images.unsplash.com/photo-1696446700622-affb858fc204?auto=format&fit=crop&q=80&w=400',
      discount: 8,
      soldOut: 90,
      rating: 4.9,
    },
    {
      name: 'Sony Headphones WH-CH520',
      originalPrice: 120,
      price: 89,
      image:
        'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?auto=format&fit=crop&q=80&w=400',
      discount: 25,
      soldOut: 60,
      rating: 4.5,
    },
    {
      name: 'MacBook Air M2',
      originalPrice: 1299,
      price: 1149,
      image:
        'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&q=80&w=400',
      discount: 12,
      soldOut: 75,
      rating: 4.9,
    },
    {
      name: 'Logitech G Pro X Superlight',
      originalPrice: 150,
      price: 119,
      image:
        'https://images.unsplash.com/photo-1527814050087-3793815479ea?auto=format&fit=crop&q=80&w=400',
      discount: 20,
      soldOut: 45,
      rating: 4.7,
    },
  ];

  trendingProducts = [
    {
      name: 'Apple Watch Series 9',
      price: 399,
      image:
        'https://images.unsplash.com/photo-1434493789847-2f02b0c48209?auto=format&fit=crop&q=80&w=300',
      sold: 450,
      total: 500,
      rating: 4.8,
    },
    {
      name: 'Samsung Galaxy S24 Ultra',
      price: 1299,
      image:
        'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?auto=format&fit=crop&q=80&w=300',
      sold: 120,
      total: 300,
      rating: 4.7,
    },
    {
      name: 'Nintendo Switch OLED',
      price: 349,
      image:
        'https://images.unsplash.com/photo-1605901309584-818e25960b8f?auto=format&fit=crop&q=80&w=300',
      sold: 300,
      total: 350,
      rating: 4.9,
    },
    {
      name: 'PlayStation 5 Console',
      price: 499,
      image:
        'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&q=80&w=300',
      sold: 800,
      total: 1000,
      rating: 4.9,
    },
    {
      name: 'AirPods Pro (2nd Gen)',
      price: 249,
      image:
        'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?auto=format&fit=crop&q=80&w=300',
      sold: 650,
      total: 700,
      rating: 4.8,
    },
    {
      name: 'Dyson V15 Detect',
      price: 749,
      image:
        'https://images.unsplash.com/photo-1558317374-067fb5f30001?auto=format&fit=crop&q=80&w=300',
      sold: 85,
      total: 150,
      rating: 4.6,
    },
  ];

  newArrivals = [
    {
      name: 'Dell XPS 15',
      price: 1499,
      image:
        'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&q=80&w=300',
      category: 'Laptop',
    },
    {
      name: 'Samsung Neo QLED 4K',
      price: 1999,
      image:
        'https://images.unsplash.com/photo-1593305841991-05c297ba4575?auto=format&fit=crop&q=80&w=300',
      category: 'TV',
    },
    {
      name: 'Bose QuietComfort 45',
      price: 329,
      image:
        'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&q=80&w=300',
      category: 'Audio',
    },
    {
      name: 'iPad Pro 12.9"',
      price: 1099,
      image:
        'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&q=80&w=300',
      category: 'Tablet',
    },
    {
      name: 'GoPro HERO12 Black',
      price: 399,
      image:
        'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&q=80&w=300',
      category: 'Camera',
    },
  ];

  tabs = ['Theo xu hướng', 'Sản phẩm mới', 'Bán chạy nhất'];
  activeTab = 'Theo xu hướng';

  responsiveOptions: any[] | undefined;

  constructor() {}

  ngOnInit() {
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
}
