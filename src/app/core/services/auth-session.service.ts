import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { AuthResponse } from '../../shared/api/generated/api-service-base.service';

interface StoredAuthSession {
  userId?: string;
  userEmail?: string;
  userName?: string;
  avatarUrl?: string;
  roles?: string[];
}

@Injectable({ providedIn: 'root' })
export class AuthSessionService {
  private readonly sessionKey = 'datn_auth_session';

  private userSubject = new BehaviorSubject<StoredAuthSession | null>(
    this.getSession(),
  );
  public currentUser$ = this.userSubject.asObservable();

  saveSession(auth: AuthResponse): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    const current = this.getSession();
    const normalizedRoles = this.extractRoles(auth, current);

    const payload: StoredAuthSession = {
      userId: auth.user?.id ?? current?.userId,
      userEmail: auth.user?.email ?? current?.userEmail,
      userName: auth.user?.fullName ?? current?.userName,
      avatarUrl: (auth.user as any)?.avatarUrl ?? current?.avatarUrl,
      roles: normalizedRoles,
    };

    localStorage.setItem(this.sessionKey, JSON.stringify(payload));
    this.userSubject.next(payload);
  }

  updateUserSession(userData: any): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    const current = this.getSession();
    if (!current) return;

    const payload: StoredAuthSession = {
      ...current,
      userEmail: userData.email ?? current.userEmail,
      userName: userData.fullName ?? userData.username ?? current.userName,
      avatarUrl: userData.avatarUrl ?? current.avatarUrl,
      roles: Array.isArray(userData.roles) ? userData.roles : current.roles,
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
    // Rely on HttpOnly cookies now
    return null;
  }

  getRoles(): string[] {
    const session = this.getSession();
    return session?.roles ?? [];
  }

  isAdmin(): boolean {
    return this.getRoles().some(role => role.toLowerCase() === 'admin');
  }

  isSeller(): boolean {
    return this.getRoles().some(role => role.toLowerCase() === 'seller');
  }

  isCustomer(): boolean {
    const roles = this.getRoles().map(r => r.toLowerCase());
    return roles.includes('customer') || roles.includes('user') || (!this.isAdmin() && !this.isSeller());
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

  private extractRoles(
    auth: AuthResponse,
    current: StoredAuthSession | null,
  ): string[] {
    const rawRoles = (auth.user as any)?.roles;

    if (Array.isArray(rawRoles) && rawRoles.length > 0) {
      return rawRoles
        .map((role) => {
          if (typeof role === 'string') {
            return role.trim();
          }
          if (role && typeof role === 'object') {
            const roleName =
              (role as { name?: unknown; roleName?: unknown }).name ??
              (role as { name?: unknown; roleName?: unknown }).roleName;
            return typeof roleName === 'string' ? roleName.trim() : '';
          }
          return '';
        })
        .filter((role) => !!role);
    }

    return current?.roles ?? [];
  }
}
