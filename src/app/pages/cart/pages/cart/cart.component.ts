import { Component, OnInit, OnDestroy, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { SkeletonModule } from 'primeng/skeleton';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { CartDto, CartGroupDto, CartItemDto } from '../../../../shared/api/generated/api-service-base.service';
import { CartService } from '../../services/cart.service';
import { AuthSessionService } from '../../../../core/services/auth-session.service';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink,
    ButtonModule, CheckboxModule, SkeletonModule, ToastModule, TooltipModule,
  ],
  providers: [MessageService],
  templateUrl: './cart.component.html',
  styleUrl: './cart.component.scss',
})
export class CartComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  cart: CartDto | null = null;
  isLoading = true;
  updatingItemId = ''; // ID item đang update (spinner)

  // Selection state (client-side)
  selectedItemIds = new Set<string>();

  constructor(
    private readonly cartService: CartService,
    public readonly authSession: AuthSessionService,
    private readonly messageService: MessageService,
    private readonly router: Router,
    @Inject(PLATFORM_ID) private readonly platformId: Object,
  ) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    if (!this.authSession.getSession()) {
      this.isLoading = false;
      return;
    }

    this.cartService.cart$.pipe(takeUntil(this.destroy$)).subscribe((cart) => {
      this.cart = cart;
      // Auto-select all in-stock items on first load
      if (cart && this.selectedItemIds.size === 0) {
        cart.groups?.forEach((g) =>
          g.items?.forEach((item) => {
            if ((item.stockAvailable ?? 0) > 0) {
              this.selectedItemIds.add(item.id!);
            }
          }),
        );
      }
      this.isLoading = false;
    });

    this.cartService.loadCart().subscribe();
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  // ── Selection ──

  isItemSelected(id?: string): boolean { return !!id && this.selectedItemIds.has(id); }

  isGroupSelected(group: CartGroupDto): boolean {
    const available = group.items?.filter((i) => (i.stockAvailable ?? 0) > 0) ?? [];
    return available.length > 0 && available.every((i) => this.selectedItemIds.has(i.id!));
  }

  isAllSelected(): boolean {
    const all = this.allAvailableItems;
    return all.length > 0 && all.every((i) => this.selectedItemIds.has(i.id!));
  }

  toggleItem(item: CartItemDto): void {
    if ((item.stockAvailable ?? 0) <= 0) return;
    if (this.selectedItemIds.has(item.id!)) {
      this.selectedItemIds.delete(item.id!);
    } else {
      this.selectedItemIds.add(item.id!);
    }
  }

  toggleGroup(group: CartGroupDto): void {
    const available = group.items?.filter((i) => (i.stockAvailable ?? 0) > 0) ?? [];
    const allSelected = available.every((i) => this.selectedItemIds.has(i.id!));
    available.forEach((i) => {
      if (allSelected) this.selectedItemIds.delete(i.id!);
      else this.selectedItemIds.add(i.id!);
    });
  }

  toggleAll(): void {
    const all = this.allAvailableItems;
    if (this.isAllSelected()) {
      all.forEach((i) => this.selectedItemIds.delete(i.id!));
    } else {
      all.forEach((i) => this.selectedItemIds.add(i.id!));
    }
  }

  // ── Quantity ──

  updateQty(item: CartItemDto, delta: number): void {
    const newQty = (item.quantity ?? 1) + delta;
    if (newQty < 1 || newQty > (item.stockAvailable ?? 99)) return;
    this.updatingItemId = item.id!;
    this.cartService.updateQuantity(item.id!, newQty).subscribe({
      next: () => { this.updatingItemId = ''; },
      error: () => { this.updatingItemId = ''; },
    });
  }

  setQty(item: CartItemDto, qty: number): void {
    if (qty < 1 || qty > (item.stockAvailable ?? 99)) return;
    this.updatingItemId = item.id!;
    this.cartService.updateQuantity(item.id!, qty).subscribe({
      next: () => { this.updatingItemId = ''; },
      error: () => { this.updatingItemId = ''; },
    });
  }

  // ── Remove ──

  removeItem(item: CartItemDto): void {
    this.cartService.removeItem(item.id!).subscribe({
      next: (ok) => {
        if (ok) {
          this.selectedItemIds.delete(item.id!);
          this.messageService.add({ severity: 'success', summary: 'Đã xóa', detail: `"${item.productName}" đã được xóa khỏi giỏ.` });
        }
      },
    });
  }

  removeSelected(): void {
    const ids = [...this.selectedItemIds];
    if (!ids.length) return;
    // Remove sequentially
    let removed = 0;
    ids.forEach((id) => {
      this.cartService.removeItem(id).subscribe((ok) => {
        if (ok) { this.selectedItemIds.delete(id); removed++; }
        if (removed === ids.length) {
          this.messageService.add({ severity: 'success', summary: 'Đã xóa', detail: `${removed} sản phẩm đã được xóa.` });
        }
      });
    });
  }

  // ── Checkout ──

  proceedToCheckout(): void {
    if (this.selectedCount === 0) return;
    this.router.navigate(['/checkout']);
  }

  // ── Computed ──

  get allAvailableItems(): CartItemDto[] {
    return this.cart?.groups?.flatMap((g) => g.items?.filter((i) => (i.stockAvailable ?? 0) > 0) ?? []) ?? [];
  }

  get selectedItems(): CartItemDto[] {
    return this.allAvailableItems.filter((i) => this.selectedItemIds.has(i.id!));
  }

  get selectedCount(): number { return this.selectedItems.length; }

  get totalPrice(): number {
    return this.selectedItems.reduce((sum, i) => sum + (i.lineTotal ?? 0), 0);
  }

  get totalItems(): number {
    return this.cart?.totalItems ?? 0;
  }

  isOutOfStock(item: CartItemDto): boolean {
    return (item.stockAvailable ?? 0) <= 0;
  }

  getVariantAttrsText(item: CartItemDto): string {
    if (!item.variantAttributes) return item.variantName ?? '';
    return Object.entries(item.variantAttributes).map(([k, v]) => `${k}: ${v}`).join(', ');
  }

  formatPrice(price?: number): string {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price ?? 0);
  }
}
