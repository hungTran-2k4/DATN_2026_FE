import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import {
  ApiBaseService,
  OrderSummaryDto,
  OrderDto,
  UpdateStatusRequest,
} from '../../../shared/api/generated/api-service-base.service';

export interface OrderPagedResult {
  items: OrderSummaryDto[];
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  totalRecords: number;
}

@Injectable({ providedIn: 'root' })
export class SellerOrderRepository {
  constructor(private readonly api: ApiBaseService) {}

  getShopOrders(shopId: string, status?: string, page = 1, pageSize = 20): Observable<OrderPagedResult> {
    return this.api.orders2(shopId, status, page, pageSize).pipe(
      map((res) => ({
        items: res.data ?? [],
        pageNumber: res.pageNumber ?? 1,
        pageSize: res.pageSize ?? 20,
        totalPages: res.totalPages ?? 0,
        totalRecords: res.totalRecords ?? 0,
      })),
    );
  }

  getOrderDetail(orderId: string): Observable<OrderDto | undefined> {
    return this.api.orders(orderId).pipe(map((res) => res.data ?? undefined));
  }

  updateOrderStatus(orderId: string, newStatus: string, note?: string): Observable<boolean> {
    const req = new UpdateStatusRequest({ newStatus, note });
    return this.api.statusPATCH(orderId, req).pipe(map((res) => res.data ?? false));
  }
}
