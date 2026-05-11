import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AdminDashboardStats, SellerDashboardStats } from '../models/statistics.model';
import { ApiResponse } from '../models/api.model';

@Injectable({
  providedIn: 'root'
})
export class StatisticsService {
  private apiUrl = `${environment.apiUrl}/api/statistics`;

  constructor(private http: HttpClient) {}

  getAdminStats(): Observable<AdminDashboardStats> {
    return this.http.get<ApiResponse<AdminDashboardStats>>(`${this.apiUrl}/admin`).pipe(
      map(res => res.data)
    );
  }

  getSellerStats(shopId: string): Observable<SellerDashboardStats> {
    return this.http.get<ApiResponse<SellerDashboardStats>>(`${this.apiUrl}/seller/${shopId}`).pipe(
      map(res => res.data)
    );
  }
}
