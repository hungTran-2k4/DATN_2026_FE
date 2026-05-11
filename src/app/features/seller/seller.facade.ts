import { Injectable } from '@angular/core';
import { Observable, of, forkJoin } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import {
  CreateProductCommand,
  GetProductsQuery,
  OrderSummaryDto,
  ProductDto,
  UpdateProductCommand,
  UpdateStatusRequest,
} from '../../shared/api/generated/api-service-base.service';
import { PagedResult } from '../../shared/api/admin-response.util';
import { SellerProductRepository } from '../../entities/product/model/seller-product.repository';
import { SellerOrderRepository, OrderPagedResult } from '../../entities/order/model/seller-order.repository';
import { SellerRepository } from '../../entities/seller/model/seller.repository';
import { SellerShopInfo } from '../../entities/seller/model/seller.model';

import { StatisticsService } from '../../core/services/statistics.service';
import { WalletService, WalletBalance, WalletLedger } from '../../core/services/wallet.service';
import { SellerDashboardStats as StatsModel } from '../../core/models/statistics.model';

export interface SellerDashboardStats extends StatsModel {
  recentOrders: OrderSummaryDto[];
}

@Injectable({ providedIn: 'root' })
export class SellerFacade {
  constructor(
    private readonly productRepo: SellerProductRepository,
    private readonly orderRepo: SellerOrderRepository,
    private readonly sellerRepo: SellerRepository,
    private readonly statisticsService: StatisticsService,
    private readonly walletService: WalletService,
  ) {}

  // ── Shop ──

  getMyShop(): Observable<SellerShopInfo | null> {
    return this.sellerRepo.getMyShop();
  }

  // ── Dashboard ──

  getDashboardStats(shopId: string): Observable<SellerDashboardStats> {
    return forkJoin({
      stats: this.statisticsService.getSellerStats(shopId),
      recentOrders: this.orderRepo.getShopOrders(shopId, undefined, 1, 5).pipe(catchError(() => of({ items: [], totalRecords: 0, pageNumber: 1, pageSize: 5, totalPages: 0 }))),
    }).pipe(
      map(({ stats, recentOrders }) => ({
        ...stats,
        recentOrders: recentOrders.items,
      })),
    );
  }

  getWalletBalance(shopId: string): Observable<WalletBalance> {
    return this.walletService.getBalance(shopId);
  }

  getWalletHistory(shopId: string, limit: number = 50): Observable<WalletLedger[]> {
    return this.walletService.getHistory(shopId, limit);
  }


  // ── Products ──

  getProducts(shopId: string, search?: string, page = 1, pageSize = 10): Observable<PagedResult<ProductDto>> {
    return this.productRepo.getProducts(shopId, search, page, pageSize).pipe(
      catchError(() => of({ items: [], pageNumber: 1, pageSize, totalPages: 0, totalRecords: 0 })),
    );
  }

  createProduct(payload: CreateProductCommand): Observable<string | undefined> {
    return this.productRepo.createProduct(payload).pipe(catchError(() => of(undefined)));
  }

  updateProduct(id: string, shopId: string, payload: UpdateProductCommand): Observable<boolean> {
    return this.productRepo.updateProduct(id, shopId, payload).pipe(
      map((r) => r ?? false),
      catchError(() => of(false)),
    );
  }

  deleteProduct(id: string, shopId: string): Observable<boolean> {
    return this.productRepo.deleteProduct(id, shopId).pipe(
      map((r) => r ?? false),
      catchError(() => of(false)),
    );
  }

  // ── Orders ──

  getOrders(shopId: string, status?: string, page = 1, pageSize = 20): Observable<OrderPagedResult> {
    return this.orderRepo.getShopOrders(shopId, status, page, pageSize).pipe(
      catchError(() => of({ items: [], pageNumber: 1, pageSize, totalPages: 0, totalRecords: 0 })),
    );
  }

  getOrderDetail(orderId: string) {
    return this.orderRepo.getOrderDetail(orderId).pipe(catchError(() => of(undefined)));
  }

  updateOrderStatus(orderId: string, newStatus: string, note?: string): Observable<boolean> {
    return this.orderRepo.updateOrderStatus(orderId, newStatus, note).pipe(catchError(() => of(false)));
  }
}
