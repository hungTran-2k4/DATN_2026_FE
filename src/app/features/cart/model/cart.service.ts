import { Injectable, PLATFORM_ID, Inject, signal, computed } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import {
  AddToCartCommand,
  ApiBaseService,
  CartDto,
  UpdateCartItemRequest,
} from '../../../shared/api/generated/api-service-base.service';

@Injectable({ providedIn: 'root' })
export class CartService {
  // ── State (Signals) ──
  private readonly cartState = signal<CartDto | null>(null);
  
  /** Signal cho phép truy cập dữ liệu giỏ hàng (readonly) */
  readonly cart = this.cartState.asReadonly();

  /** Signal tính toán tổng số item trong giỏ */
  readonly totalItems = computed(() => this.cartState()?.totalItems ?? 0);

  constructor(
    private readonly api: ApiBaseService,
    @Inject(PLATFORM_ID) private readonly platformId: Object,
  ) {}

  /** 
   * Load dữ liệu giỏ hàng từ API và cập nhật state
   */
  loadCart(): Observable<CartDto | null> {
    if (!isPlatformBrowser(this.platformId)) return of(null);
    return this.api.cartGET().pipe(
      map((res) => res.data ?? null),
      tap((cart) => this.cartState.set(cart)),
      catchError(() => {
        this.cartState.set(null);
        return of(null);
      }),
    );
  }

  /**
   * Thêm sản phẩm vào giỏ hàng
   */
  addToCart(variantId: string, quantity = 1): Observable<boolean> {
    const cmd = new AddToCartCommand({ variantId, quantity });
    return this.api.itemsPOST(cmd).pipe(
      map((res) => res.success ?? false),
      tap((ok) => { 
        if (ok) this.loadCart().subscribe(); 
      }),
      catchError(() => of(false)),
    );
  }

  /**
   * Cập nhật số lượng item trong giỏ
   */
  updateQuantity(cartItemId: string, quantity: number): Observable<boolean> {
    const req = new UpdateCartItemRequest({ quantity });
    return this.api.itemsPUT(cartItemId, req).pipe(
      map((res) => res.data ?? false),
      tap((ok) => { 
        if (ok) this.loadCart().subscribe(); 
      }),
      catchError(() => of(false)),
    );
  }

  /**
   * Xóa một item khỏi giỏ
   */
  removeItem(cartItemId: string): Observable<boolean> {
    return this.api.itemsDELETE(cartItemId).pipe(
      map((res) => res.data ?? false),
      tap((ok) => { 
        if (ok) this.loadCart().subscribe(); 
      }),
      catchError(() => of(false)),
    );
  }

  /**
   * Xóa sạch giỏ hàng
   */
  clearCart(): Observable<boolean> {
    return this.api.cartDELETE().pipe(
      map((res) => res.data ?? false),
      tap((ok) => { 
        if (ok) this.cartState.set(null); 
      }),
      catchError(() => of(false)),
    );
  }

  /**
   * Lấy giá trị hiện tại của giỏ hàng (tiện ích cho logic cũ)
   */
  getCurrentCart(): CartDto | null {
    return this.cartState();
  }
}
