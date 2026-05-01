import { Component, OnInit, OnDestroy, PLATFORM_ID, Inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject, forkJoin, takeUntil } from 'rxjs';
import { catchError, of } from 'rxjs';
import { MessageService } from 'primeng/api';
import { SkeletonModule } from 'primeng/skeleton';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import {
  ApiBaseService,
  GetProductsQuery,
  ProductDto,
  ProductImageDto,
  ProductVariantDto,
  ReviewDto,
} from '../../../../shared/api/generated/api-service-base.service';
import { CartService } from '../../../../features/cart/model/cart.service';
import { AuthSessionService } from '../../../../core/services/auth-session.service';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink,
    SkeletonModule, ToastModule, TooltipModule,
  ],
  providers: [MessageService],
  templateUrl: './product-detail.component.html',
  styleUrl: './product-detail.component.scss',
})
export class ProductDetailComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  product: ProductDto | null = null;
  variants: ProductVariantDto[] = [];
  reviews: ReviewDto[] = [];
  relatedProducts: ProductDto[] = [];

  isLoading = true;
  isAddingToCart = false;
  reviewsTotal = 0;
  reviewPage = 1;

  // UI state
  mainImage = '';
  selectedVariant: ProductVariantDto | null = null;
  quantity = 1;
  activeTab: 'description' | 'specs' | 'reviews' = 'description';

  // Attribute selection (e.g. Color, Size)
  attributeKeys: string[] = [];
  selectedAttributes: Record<string, string> = {};

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly api: ApiBaseService,
    private readonly cartService: CartService,
    public readonly authSession: AuthSessionService,
    private readonly messageService: MessageService,
    private readonly cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private readonly platformId: Object,
  ) {}

  ngOnInit(): void {
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const id = params['id'];
      if (id) this.loadProduct(id);
    });
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  private loadProduct(id: string): void {
    this.isLoading = true;
    forkJoin({
      product: this.api.productsGET(id, undefined).pipe(catchError(() => of({ data: null }))),
      reviews: this.api.reviewsGET(id, 1, 10).pipe(catchError(() => of({ data: [], totalRecords: 0 }))),
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: ({ product, reviews }) => {
        this.product = (product as any).data ?? null;
        this.variants = this.product?.variants ?? [];
        this.reviews = (reviews as any).data ?? [];
        this.reviewsTotal = (reviews as any).totalRecords ?? 0;

        if (this.product) {
          // Set main image
          const mainImg = this.product.images?.find((i) => i.isMain) ?? this.product.images?.[0];
          this.mainImage = mainImg?.imageUrl ?? '';

          // Build attribute keys from variants
          this.buildAttributeKeys();

          // Auto-select first variant
          if (this.variants.length > 0) {
            this.selectVariant(this.variants[0]);
          }

          // Load related products (same category)
          if (this.product.categoryId) {
            this.loadRelated(this.product.categoryId, id);
          }
        }

        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => { this.isLoading = false; },
    });
  }

  private loadRelated(categoryId: string, excludeId: string): void {
    const query = new GetProductsQuery({ page: 1, pageSize: 8 });
    this.api.paging(query).pipe(
      catchError(() => of({ data: [] })),
      takeUntil(this.destroy$),
    ).subscribe((res: any) => {
      this.relatedProducts = (res.data ?? []).filter((p: ProductDto) => p.id !== excludeId).slice(0, 6);
    });
  }

  private buildAttributeKeys(): void {
    const keys = new Set<string>();
    this.variants.forEach((v) => {
      if (v.variantAttributes) {
        Object.keys(v.variantAttributes).forEach((k) => keys.add(k));
      }
    });
    this.attributeKeys = [...keys];
  }

  // ── Variant selection ──

  selectVariant(variant: ProductVariantDto | null): void {
    this.selectedVariant = variant;
    if (variant) {
      if (variant.variantAttributes) {
        this.selectedAttributes = { ...variant.variantAttributes };
      }
      if (variant.imageUrl) {
        this.mainImage = variant.imageUrl;
      }
    }
    this.quantity = 1;
  }

  selectAttribute(key: string, value: string): void {
    if (this.selectedAttributes[key] === value) {
      delete this.selectedAttributes[key];
    } else {
      this.selectedAttributes[key] = value;
    }

    // Check if we have selected all necessary attributes
    const isFullySelected = this.attributeKeys.every(k => !!this.selectedAttributes[k]);

    if (isFullySelected) {
      const match = this.variants.find((v) => {
        if (!v.variantAttributes) return false;
        return this.attributeKeys.every(k => v.variantAttributes![k] === this.selectedAttributes[k]);
      });
      if (match) {
        this.selectedVariant = match;
        if (match.imageUrl) this.mainImage = match.imageUrl;
      } else {
        this.selectedVariant = null;
      }
    } else {
      this.selectedVariant = null;
    }
    
    this.quantity = 1;
    this.cdr.detectChanges();
  }

  getAttributeValues(key: string): string[] {
    const vals = new Set<string>();
    this.variants.forEach((v) => {
      if (v.variantAttributes?.[key]) vals.add(v.variantAttributes[key]);
    });
    return [...vals];
  }

  isAttributeSelected(key: string, value: string): boolean {
    return this.selectedAttributes[key] === value;
  }

  /**
   * Smart logic: Is this specific attribute value available GIVEN the other currently selected attributes?
   */
  isAttributeAvailable(key: string, value: string): boolean {
    // A value is available if there exists at least one variant that:
    // 1. Has this [key: value]
    // 2. Matches ALL OTHER selected attributes
    // 3. Has stock > 0
    return this.variants.some(v => {
      if (!v.variantAttributes || (v.stockQty ?? 0) <= 0) return false;
      if (v.variantAttributes[key] !== value) return false;
      
      // Must match other selections
      return Object.entries(this.selectedAttributes).every(([sKey, sVal]) => {
        if (sKey === key) return true; // Skip current key
        return v.variantAttributes![sKey] === sVal;
      });
    });
  }

  // ── Images ──

  setMainImage(img: ProductImageDto): void {
    this.mainImage = img.imageUrl ?? '';
  }

  get productImages(): ProductImageDto[] {
    return this.product?.images ?? [];
  }

  // ── Quantity ──

  get maxQty(): number { return this.selectedVariant?.stockQty ?? 99; }

  increaseQty(): void { if (this.quantity < this.maxQty) this.quantity++; }
  decreaseQty(): void { if (this.quantity > 1) this.quantity--; }

  // ── Cart ──

  addToCart(): void {
    const isFullySelected = this.attributeKeys.every(k => !!this.selectedAttributes[k]);
    
    if (this.attributeKeys.length > 0 && !isFullySelected) {
      this.messageService.add({ severity: 'warn', summary: 'Chưa chọn đủ thông tin', detail: 'Vui lòng chọn đầy đủ các tùy chọn sản phẩm.' });
      return;
    }

    if (!this.selectedVariant?.id) {
      this.messageService.add({ severity: 'warn', summary: 'Chưa chọn phân loại', detail: 'Vui lòng chọn phân loại sản phẩm để tiếp tục.' });
      return;
    }
    if (!this.authSession.getSession()) {
      this.messageService.add({ severity: 'info', summary: 'Chưa đăng nhập', detail: 'Vui lòng đăng nhập để thêm vào giỏ hàng.' });
      return;
    }
    this.isAddingToCart = true;
    this.cartService.addToCart(this.selectedVariant.id, this.quantity).subscribe({
      next: (ok) => {
        this.isAddingToCart = false;
        if (ok) {
          this.messageService.add({ severity: 'success', summary: 'Đã thêm vào giỏ', detail: `${this.product?.name} × ${this.quantity}` });
        } else {
          this.messageService.add({ severity: 'error', summary: 'Lỗi', detail: 'Không thể thêm vào giỏ hàng.' });
        }
      },
      error: () => { this.isAddingToCart = false; },
    });
  }

  buyNow(): void {
    const isFullySelected = this.attributeKeys.every(k => !!this.selectedAttributes[k]);
    
    if (this.attributeKeys.length > 0 && !isFullySelected) {
      this.messageService.add({ severity: 'warn', summary: 'Chưa chọn đủ thông tin', detail: 'Vui lòng chọn đầy đủ các tùy chọn sản phẩm.' });
      return;
    }

    if (!this.selectedVariant?.id) {
      this.messageService.add({ severity: 'warn', summary: 'Chưa chọn phân loại', detail: 'Vui lòng chọn phân loại sản phẩm để tiếp tục.' });
      return;
    }
    if (!this.authSession.getSession()) {
      this.messageService.add({ severity: 'info', summary: 'Chưa đăng nhập', detail: 'Vui lòng đăng nhập để tiếp tục.' });
      return;
    }
    this.isAddingToCart = true;
    this.cartService.addToCart(this.selectedVariant.id, this.quantity).subscribe({
      next: (ok) => {
        this.isAddingToCart = false;
        if (ok) {
           this.router.navigate(['/checkout']);
        } else {
          this.messageService.add({ severity: 'error', summary: 'Lỗi', detail: 'Không thể xử lý yêu cầu.' });
        }
      },
      error: () => { this.isAddingToCart = false; },
    });
  }

  // ── Reviews ──

  get averageRating(): number {
    if (!this.reviews.length) return 0;
    return this.reviews.reduce((sum, r) => sum + (r.rating ?? 0), 0) / this.reviews.length;
  }

  getRatingStars(rating: number): number[] {
    return Array.from({ length: 5 }, (_, i) => i + 1);
  }

  // ── Helpers ──

  formatPrice(price?: number): string {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price ?? 0);
  }

  getPriceDisplay(): string {
    if (this.selectedVariant) {
      return this.formatPrice(this.selectedVariant.price);
    }
    if (this.variants.length === 0) return this.formatPrice(0);
    
    const prices = this.variants.map(v => v.price ?? 0);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    
    if (min === max) return this.formatPrice(min);
    return `${this.formatPrice(min)} - ${this.formatPrice(max)}`;
  }

  getMainImageUrl(): string {
    return this.mainImage || 'https://placehold.co/600x600/f3f4f6/9ca3af?text=No+Image';
  }

  getRelatedMainImage(p: ProductDto): string {
    return p.images?.find((i) => i.isMain)?.imageUrl ?? p.images?.[0]?.imageUrl ?? 'https://placehold.co/300x300/f3f4f6/9ca3af?text=No+Image';
  }

  get isOutOfStock(): boolean {
    if (this.variants.length === 0) return false;
    if (this.selectedVariant) return (this.selectedVariant.stockQty ?? 0) <= 0;
    return this.variants.every((v) => (v.stockQty ?? 0) <= 0);
  }
}
