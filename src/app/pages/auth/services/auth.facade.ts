import { Injectable } from '@angular/core';
import { catchError, map, Observable, of, tap } from 'rxjs';
import { AuthResponse } from '../../../shared/api/generated/api-service-base.service';
import { AuthRepository } from '../../../entities/auth/model/auth.repository';
import { AuthSessionService } from '../../../core/services/auth-session.service';
import { Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class AuthFacade {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly sessionService: AuthSessionService,
    private readonly router: Router,
  ) {}
 
  get isLoggedIn$(): Observable<boolean> {
    return this.sessionService.currentUser$.pipe(map(user => !!user));
  }
 
  initializeAuth(): Observable<boolean> {
    const session = this.sessionService.getSession();
    
    // Always call getProfile to verify cookies and get latest user data
    return this.authRepository.getProfile().pipe(
      tap((result) => {
        if (result) {
          this.sessionService.saveSession(result);
        }
      }),
      map(() => true),
      catchError(() => {
        // If we have local session but API fails (cookie expired), clear everything
        if (session) {
          this.sessionService.clearSession();
        }
        return of(false);
      })
    );
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.authRepository
      .login(email, password)
      .pipe(tap((result) => this.sessionService.saveSession(result)));
  }

  register(input: {
    email: string;
    password: string;
    fullName: string;
  }): Observable<AuthResponse> {
    return this.authRepository
      .register(input)
      .pipe(tap((result) => this.sessionService.saveSession(result)));
  }

  navigateAfterLogin(): void {
    // Hiện tại app chỉ có layout admin, nên mặc định đều vào /admin/dashboard
    // Khi có thêm layout khác (seller, customer), sẽ mở rộng logic ở đây
    this.router.navigateByUrl('/admin/dashboard');
  }
}
