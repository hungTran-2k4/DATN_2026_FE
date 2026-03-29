import { Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';
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
