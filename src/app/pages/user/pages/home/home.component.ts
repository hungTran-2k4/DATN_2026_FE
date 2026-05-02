import { CommonModule, NgOptimizedImage, isPlatformBrowser } from '@angular/common';
import { Component, OnInit, OnDestroy, PLATFORM_ID, Inject } from '@angular/core';
import { RouterLink, RouterModule } from '@angular/router';
import { Subject, forkJoin, interval, takeUntil } from 'rxjs';
import { catchError, of, map } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { CarouselModule } from 'primeng/carousel';
import { RippleModule } from 'primeng/ripple';
import { SkeletonModule } from 'primeng/skeleton';
import { ProductCardComponent, ProductCardData } from '../../../../shared/ui/molecules/product-card/product-card.component';
import {
  ApiBaseService,
  CategoryDto,
  GetProductsQuery,
  ProductDto,
} from '../../../../shared/api/generated/api-service-base.service';

interface CountdownTime { hours: string; minutes: string; seconds: string; }

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule, CarouselModule, ButtonModule, RippleModule,
    RouterModule, RouterLink, NgOptimizedImage, SkeletonModule,
    ProductCardComponent,
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  // ── Data ──
  categories: CategoryDto[] = [];
  weeklyDeals: ProductDto[] = [];
  trendingProducts: ProductDto[] = [];
  newArrivals: ProductDto[] = [];

  // ── Loading states ──
  isLoadingDeals = true;
  isLoadingTrending = true;
  isLoadingNew = true;
  isLoadingCategories = true;
  isLoadingAll = false;

  // ── All Products (Pagination) ──
  allProducts: ProductDto[] = [];
  allProductsPage = 1;
  allProductsPageSize = 10;
  hasMoreProducts = true;

  // ── Countdown ──
  countdown: CountdownTime = { hours: '00', minutes: '00', seconds: '00' };

  // ── Tabs ──
  tabs = ['Theo xu hướng', 'Sản phẩm mới', 'Bán chạy nhất'];
  activeTab = 'Theo xu hướng';

  // ── Carousel ──
  responsiveOptions = [
    { breakpoint: '1400px', numVisible: 4, numScroll: 1 },
    { breakpoint: '1199px', numVisible: 3, numScroll: 1 },
    { breakpoint: '991px', numVisible: 2, numScroll: 1 },
    { breakpoint: '767px', numVisible: 2, numScroll: 1 },
    { breakpoint: '575px', numVisible: 1, numScroll: 1 },
  ];

  // ── Static hero categories (UI only) ──
  heroCategories = [
    { name: 'Điện thoại', icon: 'pi pi-mobile', color: 'bg-purple-50 text-purple-600' },
    { name: 'Laptop', icon: 'pi pi-desktop', color: 'bg-blue-50 text-blue-600' },
    { name: 'Tai nghe', icon: 'pi pi-headphones', color: 'bg-orange-50 text-orange-600' },
    { name: 'Gaming', icon: 'pi pi-play', color: 'bg-green-50 text-green-600' },
    { name: 'Camera', icon: 'pi pi-camera', color: 'bg-red-50 text-red-600' },
    { name: 'Đồng hồ', icon: 'pi pi-clock', color: 'bg-teal-50 text-teal-600' },
    { name: 'Loa', icon: 'pi pi-volume-up', color: 'bg-yellow-50 text-yellow-600' },
    { name: 'TV', icon: 'pi pi-tv', color: 'bg-indigo-50 text-indigo-600' },
  ];

  constructor(
    private readonly api: ApiBaseService,
    @Inject(PLATFORM_ID) private readonly platformId: Object,
  ) {}

  ngOnInit(): void {
    this.loadData();
    this.startCountdown();
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  private loadData(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    // Load categories
    this.api.categoriesGET(true).pipe(
      catchError(() => of({ data: [] })),
      takeUntil(this.destroy$),
    ).subscribe((res: any) => {
      const allRootCats = res.data ?? [];
      // Filter: Only root categories (no parent)
      this.categories = allRootCats.filter((c: any) => !c.parentId).slice(0, 10);
      this.isLoadingCategories = false;
    });

    // Load weekly deals (newest products)
    this.api.paging(new GetProductsQuery({ page: 1, pageSize: 8 })).pipe(
      catchError(() => of({ data: [] })),
      takeUntil(this.destroy$),
    ).subscribe((res: any) => {
      this.weeklyDeals = res.data ?? [];
      this.isLoadingDeals = false;
    });

    // Load trending (page 2 for variety)
    this.api.paging(new GetProductsQuery({ page: 1, pageSize: 6 })).pipe(
      catchError(() => of({ data: [] })),
      takeUntil(this.destroy$),
    ).subscribe((res: any) => {
      this.trendingProducts = res.data ?? [];
      this.isLoadingTrending = false;
    });

    // Load new arrivals (page 3)
    this.api.paging(new GetProductsQuery({ page: 2, pageSize: 10 })).pipe(
      catchError(() => of({ data: [] })),
      takeUntil(this.destroy$),
    ).subscribe((res: any) => {
      this.newArrivals = res.data ?? [];
      this.isLoadingNew = false;
    });

    this.loadAllProducts();
  }

  loadAllProducts(): void {
    if (this.isLoadingAll || !this.hasMoreProducts) return;
    this.isLoadingAll = true;

    this.api.paging(new GetProductsQuery({
      page: this.allProductsPage,
      pageSize: this.allProductsPageSize
    })).pipe(
      catchError(() => of({ data: [], totalRecords: 0 })),
      takeUntil(this.destroy$),
    ).subscribe((res: any) => {
      const newItems = res.data ?? [];
      this.allProducts = [...this.allProducts, ...newItems];
      this.isLoadingAll = false;
      
      if (newItems.length < this.allProductsPageSize || this.allProducts.length >= (res.totalRecords ?? 0)) {
        this.hasMoreProducts = false;
      }
    });
  }

  loadMore(): void {
    if (this.hasMoreProducts) {
      this.allProductsPage++;
      this.loadAllProducts();
    }
  }

  private startCountdown(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const updateCountdown = () => {
      const now = new Date();
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      const diff = endOfDay.getTime() - now.getTime();

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      this.countdown = {
        hours: String(hours).padStart(2, '0'),
        minutes: String(minutes).padStart(2, '0'),
        seconds: String(seconds).padStart(2, '0'),
      };
    };

    updateCountdown();
    interval(1000).pipe(takeUntil(this.destroy$)).subscribe(updateCountdown);
  }

  // ── Map to ProductCardData ──

  mapToCard(product: ProductDto): ProductCardData {
    const mainImg = product.images?.find((i) => i.isMain)?.imageUrl
      ?? product.images?.[0]?.imageUrl
      ?? 'https://placehold.co/400x400/f3f4f6/9ca3af?text=No+Image';

    const minVariant = product.variants?.length
      ? product.variants.reduce((prev, curr) => ((prev.price ?? 0) < (curr.price ?? 0) ? prev : curr))
      : null;

    const price = minVariant?.price ?? 0;
    const originalPrice = minVariant?.originalPrice;
    const discount = (price > 0 && originalPrice && originalPrice > price) 
      ? Math.round(((originalPrice - price) / originalPrice) * 100)
      : undefined;

    return {
      id: product.id ?? '',
      name: product.name ?? '',
      price: price,
      originalPrice: originalPrice,
      discount: discount,
      image: mainImg,
      category: product.categoryId ?? '',
      rating: 4.5, // TODO: Map actual rating from ProductRatingDto if available
    };
  }

  mapTrending(product: ProductDto): ProductCardData {
    const card = this.mapToCard(product);
    const stock = product.variants?.reduce((s, v) => s + (v.stockQty ?? 0), 0) ?? 100;
    return {
      ...card,
      soldCount: Math.floor(stock * 0.7),
      totalStock: stock,
    };
  }

  formatPrice(price: number): string {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  }

  get displayCategories() {
    return this.categories.length > 0 ? this.categories : this.heroCategories;
  }

  get skeletonItems() { return Array(8).fill(null); }
  get skeletonTrending() { return Array(6).fill(null); }
  get skeletonNew() { return Array(5).fill(null); }
}
