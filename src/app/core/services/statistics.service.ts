import { Injectable } from '@angular/core';
import { ApiBaseService } from '../../shared/api/generated/api-service-base.service';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AdminDashboardStats, SellerDashboardStats } from '../models/statistics.model';
import { ApiResponse } from '../models/api.model';

@Injectable({
  providedIn: 'root'
})
export class StatisticsService {


  constructor(private api: ApiBaseService) {}

  getAdminStats(): Observable<AdminDashboardStats> {
    return this.api.admin().pipe(
      map(res => res.data as AdminDashboardStats)
    );
  }

  getSellerStats(shopId: string): Observable<SellerDashboardStats> {
    return this.api.seller(shopId).pipe(
      map(res => res.data as SellerDashboardStats)
    );
  }
}
