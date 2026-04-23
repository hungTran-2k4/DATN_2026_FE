import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import {
  AddToCartCommand,
  ApiBaseService,
  CartDto,
  CartGroupDto,
  UpdateCartItemRequest,
} from '../../../shared/api/generated/api-service-base.service';

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly cartSubject = new BehaviorSubject<CartDto | null>(null);
  readonly cart$ = this.cartSubject.asObservable();

  constructor(
    private readonly api: ApiBaseService,
    @Inject(PLATFORM_ID) private readonly platformId: Object,
  ) {}

  /** Tổng số item trong giỏ (dùng cho badge header) */
  get totalItems$(): Observable<number> {
    return this.cart$.pipe(map((c) => c?.totalItems ?? 0));
  }

  loadCart(): Observable<CartDto | null> {
    if (!isPlatformBrowser(this.platformId)) return of(null);
    return this.api.cartGET().pipe(
      map((res) => res.data ?? null),
      tap((cart) => this.cartSubject.next(cart)),
      catchError(() => of(null)),
    );
  }

  addToCart(variantId: string, quantity = 1): Observable<boolean> {
    const cmd = new AddToCartCommand({ variantId, quantity });
    return this.api.itemsPOST(cmd).pipe(
      map((res) => res.success ?? false),
      tap((ok) => { if (ok) this.loadCart().subscribe(); }),
      catchError(() => of(false)),
    );
  }

  updateQuantity(cartItemId: string, quantity: number): Observable<boolean> {
    const req = new UpdateCartItemRequest({ quantity });
    return this.api.itemsPUT(cartItemId, req).pipe(
      map((res) => res.data ?? false),
      tap((ok) => { if (ok) this.loadCart().subscribe(); }),
      catchError(() => of(false)),
    );
  }

  removeItem(cartItemId: string): Observable<boolean> {
    return this.api.itemsDELETE(cartItemId).pipe(
      map((res) => res.data ?? false),
      tap((ok) => { if (ok) this.loadCart().subscribe(); }),
      catchError(() => of(false)),
    );
  }

  clearCart(): Observable<boolean> {
    return this.api.cartDELETE().pipe(
      map((res) => res.data ?? false),
      tap((ok) => { if (ok) this.cartSubject.next(null); }),
      catchError(() => of(false)),
    );
  }

  getCurrentCart(): CartDto | null {
    return this.cartSubject.getValue();
  }
}
