import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface WalletBalance {
  availableBalance: number;
  lockedBalance: number;
}

export interface WalletLedger {
  id: string;
  shopId: string;
  transactionId?: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class WalletService {
  private readonly apiUrl = `${environment.apiUrl}/api/Wallet`;

  constructor(private readonly http: HttpClient) {}

  getBalance(shopId: string): Observable<WalletBalance> {
    return this.http.get<any>(`${this.apiUrl}/${shopId}/balance`).pipe(
      map(res => res.data)
    );
  }

  getHistory(shopId: string, limit: number = 50): Observable<WalletLedger[]> {
    return this.http.get<any>(`${this.apiUrl}/${shopId}/history?limit=${limit}`).pipe(
      map(res => res.data)
    );
  }
}
