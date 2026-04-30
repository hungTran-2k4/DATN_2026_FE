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
  FilterDescriptor,
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
  currentCategory: CategoryDto | null = null;
  childCategories: CategoryDto[] = [];
  displayCategories: CategoryDto[] = [];

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
  pageSize = 20; // Initial load 20
  isInitialLoad = true;
  isLoadingMore = false;
  hasMore = true;

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
      
      const catId = params['cat'];
      if (catId) {
        this.selectedCategoryIds = [catId];
      } else {
        this.selectedCategoryIds = [];
      }
      
      this.loadProducts();
      this.updateCurrentCategory();
    });

    this.loadFilters();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadProducts(append: boolean = false): void {
    if (!isPlatformBrowser(this.platformId)) return;
    
    if (append) {
      this.isLoadingMore = true;
    } else {
      this.isLoading = true;
      this.currentPage = 1;
      this.pageSize = 20; // Reset to initial size for new searches/filters
    }

    // Build filter descriptors
    const categoryFilters = this.selectedCategoryIds.map(id => new FilterDescriptor({
      field: 'CategoryId',
      operator: 'eq',
      value: id
    }));

    const brandFilters = this.selectedBrandIds.map(id => new FilterDescriptor({
      field: 'BrandId',
      operator: 'eq',
      value: id
    }));

    const mainFilters: FilterDescriptor[] = [];
    
    if (categoryFilters.length > 0) {
      mainFilters.push(new FilterDescriptor({
        logic: 'or',
        filters: categoryFilters
      }));
    }

    if (brandFilters.length > 0) {
      mainFilters.push(new FilterDescriptor({
        logic: 'or',
        filters: brandFilters
      }));
    }

    const query = new GetProductsQuery({
      search: this.searchKeyword || undefined,
      page: this.currentPage,
      pageSize: this.pageSize,
      filter: mainFilters.length > 0 ? new FilterDescriptor({
        logic: 'and',
        filters: mainFilters
      }) : undefined
    });

    this.productFacade
      .getProducts(query)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          if (append) {
            this.result.items = [...this.result.items, ...res.items];
            this.result.totalRecords = res.totalRecords;
            this.isLoadingMore = false;
          } else {
            this.result = res;
            this.isLoading = false;
          }
          
          this.hasMore = this.result.items.length < this.result.totalRecords;
          this.cdr.detectChanges();
        },
        error: () => {
          this.isLoading = false;
          this.isLoadingMore = false;
          this.cdr.detectChanges();
        },
      });
  }

  private loadFilters(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.productFacade
      .getCategories()
      .pipe(takeUntil(this.destroy$))
      .subscribe((cats) => {
        this.categories = cats;
        this.updateCurrentCategory();
      });

    this.productFacade
      .getBrands()
      .pipe(takeUntil(this.destroy$))
      .subscribe((brands) => (this.brands = brands));
  }

  private updateCurrentCategory(): void {
    if (this.selectedCategoryIds.length === 1 && this.categories.length > 0) {
      const catId = this.selectedCategoryIds[0];
      this.currentCategory = this.findCategoryById(this.categories, catId);
      this.childCategories = this.currentCategory?.children || [];
      
      // Scoped categories: current + children
      if (this.currentCategory) {
        this.displayCategories = [this.currentCategory, ...this.childCategories];
      } else {
        this.displayCategories = this.categories;
      }
    } else {
      this.currentCategory = null;
      this.childCategories = [];
      this.displayCategories = this.categories;
    }
  }

  private findCategoryById(cats: CategoryDto[], id: string): CategoryDto | null {
    for (const cat of cats) {
      if (cat.id === id) return cat;
      if (cat.children && cat.children.length > 0) {
        const found = this.findCategoryById(cat.children, id);
        if (found) return found;
      }
    }
    return null;
  }

  onSearchSubmit(): void {
    this.currentPage = 1;
    this.syncUrlAndLoad();
  }

  onSortChange(): void {
    this.currentPage = 1;
    this.loadProducts();
  }

  loadMore(): void {
    if (this.isLoadingMore || !this.hasMore) return;
    
    if (this.currentPage === 1 && this.pageSize === 20) {
      this.currentPage = 3; // Start from offset 20
    } else {
      this.currentPage++;
    }
    
    this.pageSize = 10;
    this.loadProducts(true);
  }

  clearCategoryFilter(): void {
    this.selectedCategoryIds = [];
    this.syncUrlAndLoad();
    this.updateCurrentCategory();
  }

  toggleCategory(id: string): void {
    // Single selection for category in Shopee style
    if (this.selectedCategoryIds.includes(id)) {
      this.selectedCategoryIds = [];
    } else {
      this.selectedCategoryIds = [id];
    }
    this.currentPage = 1;
    this.syncUrlAndLoad();
    this.updateCurrentCategory();
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
    if (this.selectedCategoryIds.length === 1) queryParams['cat'] = this.selectedCategoryIds[0];
    
    this.router.navigate([], { queryParams, replaceUrl: true });
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
