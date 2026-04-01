import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { AuthResponse } from '../../shared/api/generated/api-service-base.service';

interface StoredAuthSession {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  roles?: string[];
}

@Injectable({ providedIn: 'root' })
export class AuthSessionService {
  private readonly sessionKey = 'datn_auth_session';
  
  private userSubject = new BehaviorSubject<StoredAuthSession | null>(this.getSession());
  public currentUser$ = this.userSubject.asObservable();

  saveSession(auth: AuthResponse): void {
    if (typeof localStorage === 'undefined' || !auth.accessToken) {
      return;
    }

    const payload: StoredAuthSession = {
      accessToken: auth.accessToken,
      refreshToken: auth.refreshToken,
      expiresAt: auth.expiresAt?.toISOString(),
      userId: auth.user?.id,
      userEmail: auth.user?.email,
      userName: auth.user?.fullName,
      roles: auth.user?.roles,
    };

    localStorage.setItem(this.sessionKey, JSON.stringify(payload));
    this.userSubject.next(payload);
  }

  clearSession(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(this.sessionKey);
    }
    this.userSubject.next(null);
  }

  getAccessToken(): string | null {
    const session = this.getSession();
    return session?.accessToken ?? null;
  }

  getRoles(): string[] {
    const session = this.getSession();
    return session?.roles ?? [];
  }

  isAdmin(): boolean {
    return this.getRoles().includes('Admin');
  }

  isSeller(): boolean {
    return this.getRoles().includes('Seller');
  }

  isCustomer(): boolean {
    const roles = this.getRoles();
    // Assuming Customer if no admin/seller, or explicitly 'Customer'
    return roles.includes('Customer') || (!this.isAdmin() && !this.isSeller());
  }

  public getSession(): StoredAuthSession | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }
    
    const raw = localStorage.getItem(this.sessionKey);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as StoredAuthSession;
    } catch {
      this.clearSession();
      return null;
    }
  }
}
