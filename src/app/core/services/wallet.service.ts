import { Injectable } from '@angular/core';
import { ApiBaseService } from '../../shared/api/generated/api-service-base.service';
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
   createdAt: string | Date;
}

@Injectable({ providedIn: 'root' })
export class WalletService {


  constructor(private readonly api: ApiBaseService) {}

  getBalance(shopId: string): Observable<WalletBalance> {
    return this.api.balance(shopId).pipe(
      map(res => res.data as WalletBalance)
    );
  }

  getHistory(shopId: string, limit: number = 50): Observable<WalletLedger[]> {
    return this.api.history(shopId, limit).pipe(
      map(res => res.data as WalletLedger[])
    );
  }
}
