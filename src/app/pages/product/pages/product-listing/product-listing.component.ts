import { Component, OnDestroy, OnInit, ChangeDetectorRef, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { SliderModule } from 'primeng/slider';
import { CheckboxModule } from 'primeng/checkbox';
import { DropdownModule } from 'primeng/dropdown';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { RippleModule } from 'primeng/ripple';
import { TooltipModule } from 'primeng/tooltip';
import {
  BrandDto,
  CategoryDto,
  GetProductsQuery,
  ProductDto,
} from '../../../../shared/api/generated/api-service-base.service';
import { PagedResult } from '../../../../shared/api/admin-response.util';
import { ProductCardComponent, ProductCardData } from '../../../../shared/ui/molecules/product-card/product-card.component';
import { ProductFacade } from '../../services/product.facade';
import { MessageService } from 'primeng/api';

interface SortOption {
  label: string;
  value: string;
}

@Component({
  selector: 'app-product-listing',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    ButtonModule,
    SkeletonModule,
    SliderModule,
    CheckboxModule,
    DropdownModule,
    PaginatorModule,
    RippleModule,
    TooltipModule,
    ProductCardComponent,
  ],
  templateUrl: './product-listing.component.html',
  styleUrl: './product-listing.component.scss',
})
export class ProductListingComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly searchSubject = new Subject<string>();

  // Data
  result: PagedResult<ProductDto> = {
    items: [],
    pageNumber: 1,
    pageSize: 12,
    totalPages: 0,
    totalRecords: 0,
  };
  categories: CategoryDto[] = [];
  brands: BrandDto[] = [];

  // State
  isLoading = true;
  viewMode: 'grid' | 'list' = 'grid';
  isSidebarOpen = false;

  // Filters
  searchKeyword = '';
  selectedCategoryIds: string[] = [];
  selectedBrandIds: string[] = [];
  priceRange: [number, number] = [0, 50000000];
  priceRangeValues: number[] = [0, 50000000];
  currentPage = 1;
  pageSize = 12;

  sortOptions: SortOption[] = [
    { label: 'Mới nhất', value: 'newest' },
    { label: 'Giá tăng dần', value: 'price_asc' },
    { label: 'Giá giảm dần', value: 'price_desc' },
    { label: 'Phổ biến nhất', value: 'popular' },
  ];
  selectedSort: SortOption = this.sortOptions[0];

  skeletonItems = Array(12).fill(null);
  readonly skeletonCount = 12;

  constructor(
    private readonly productFacade: ProductFacade,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private readonly platformId: Object,
  ) {}

  ngOnInit(): void {
    // Read query params on init
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      this.searchKeyword = params['q'] ?? '';
      this.currentPage = +(params['page'] ?? 1);
      this.pageSize = +(params['pageSize'] ?? 12);
      this.loadProducts();
    });

    // Debounce search input
    this.searchSubject
      .pipe(debounceTime(400), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        this.currentPage = 1;
        this.syncUrlAndLoad();
      });

    this.loadFilters();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadProducts(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.isLoading = true;
    const query = new GetProductsQuery({
      search: this.searchKeyword || undefined,
      page: this.currentPage,
      pageSize: this.pageSize,
    });

    this.productFacade
      .getProducts(query)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.result = res;
          this.isLoading = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.isLoading = false;
          this.cdr.detectChanges();
        },
      });
  }

  private loadFilters(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.productFacade
      .getCategories()
      .pipe(takeUntil(this.destroy$))
      .subscribe((cats) => (this.categories = cats));

    this.productFacade
      .getBrands()
      .pipe(takeUntil(this.destroy$))
      .subscribe((brands) => (this.brands = brands));
  }

  onSearchInput(): void {
    this.searchSubject.next(this.searchKeyword);
  }

  onSearchSubmit(): void {
    this.currentPage = 1;
    this.syncUrlAndLoad();
  }

  onSortChange(): void {
    this.currentPage = 1;
    this.loadProducts();
  }

  onPageChange(event: PaginatorState): void {
    this.currentPage = (event.page ?? 0) + 1;
    this.pageSize = event.rows ?? 12;
    this.syncUrlAndLoad();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  toggleCategory(id: string): void {
    const idx = this.selectedCategoryIds.indexOf(id);
    if (idx >= 0) {
      this.selectedCategoryIds.splice(idx, 1);
    } else {
      this.selectedCategoryIds.push(id);
    }
    this.currentPage = 1;
    this.loadProducts();
  }

  toggleBrand(id: string): void {
    const idx = this.selectedBrandIds.indexOf(id);
    if (idx >= 0) {
      this.selectedBrandIds.splice(idx, 1);
    } else {
      this.selectedBrandIds.push(id);
    }
    this.currentPage = 1;
    this.loadProducts();
  }

  clearFilters(): void {
    this.selectedCategoryIds = [];
    this.selectedBrandIds = [];
    this.priceRangeValues = [0, 50000000];
    this.searchKeyword = '';
    this.currentPage = 1;
    this.syncUrlAndLoad();
  }

  hasActiveFilters(): boolean {
    return (
      this.selectedCategoryIds.length > 0 ||
      this.selectedBrandIds.length > 0 ||
      !!this.searchKeyword
    );
  }

  private syncUrlAndLoad(): void {
    const queryParams: any = {};
    if (this.searchKeyword) queryParams['q'] = this.searchKeyword;
    if (this.currentPage > 1) queryParams['page'] = this.currentPage;
    this.router.navigate([], { queryParams, replaceUrl: true });
    this.loadProducts();
  }

  getMainImage(product: ProductDto): string {
    const main = product.images?.find((img) => img.isMain);
    return (
      main?.imageUrl ??
      product.images?.[0]?.imageUrl ??
      'https://placehold.co/400x400/f3f4f6/9ca3af?text=No+Image'
    );
  }

  getMinPrice(product: ProductDto): number | null {
    // baseAttributes may contain price info; fallback to 0
    return null;
  }

  formatPrice(price: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(price);
  }

  isCategorySelected(id: string): boolean {
    return this.selectedCategoryIds.includes(id);
  }

  isBrandSelected(id: string): boolean {
    return this.selectedBrandIds.includes(id);
  }

  getCategoryName(id: string): string {
    return this.categories.find((c) => c.id === id)?.name ?? id;
  }

  getBrandName(id: string): string {
    return this.brands.find((b) => b.id === id)?.name ?? id;
  }

  get totalActiveFilters(): number {
    return this.selectedCategoryIds.length + this.selectedBrandIds.length;
  }

  mapToCardData(product: ProductDto): ProductCardData {
    const variant = product.variants?.[0];
    const categoryName = this.categories.find(c => c.id === product.categoryId)?.name;
    
    return {
      id: product.id!,
      name: product.name!,
      price: variant?.price ?? 0,
      image: this.getMainImage(product),
      category: categoryName || product.categoryId, // Fallback to ID if name not found
      variantId: variant?.id
    };
  }
}
