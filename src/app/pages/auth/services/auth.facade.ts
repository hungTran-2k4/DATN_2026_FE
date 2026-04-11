import { isPlatformBrowser } from '@angular/common';
import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { catchError, map, Observable, of, tap, throwError } from 'rxjs';
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
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  get isLoggedIn$(): Observable<boolean> {
    return this.sessionService.currentUser$.pipe(map((user) => !!user));
  }

  initializeAuth(): Observable<boolean> {
    if (!isPlatformBrowser(this.platformId)) {
      return of(false);
    }

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
      }),
    );
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.authRepository.login(email, password).pipe(
      tap((result) => this.sessionService.saveSession(result)),
      catchError((error: unknown) =>
        throwError(
          () =>
            new Error(
              this.extractErrorMessage(
                error,
                'Đăng nhập thất bại. Vui lòng thử lại.',
              ),
            ),
        ),
      ),
    );
  }

  register(input: {
    email: string;
    password: string;
    fullName: string;
  }): Observable<AuthResponse> {
    return this.authRepository.register(input).pipe(
      tap((result) => this.sessionService.saveSession(result)),
      catchError((error: unknown) =>
        throwError(
          () =>
            new Error(
              this.extractErrorMessage(
                error,
                'Đăng ký thất bại. Vui lòng thử lại.',
              ),
            ),
        ),
      ),
    );
  }

  navigateAfterLogin(): void {
    if (this.sessionService.isAdmin()) {
      this.router.navigateByUrl('/admin/dashboard');
    } else {
      this.router.navigateByUrl('/home');
    }
  }

  private extractErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      return (
        this.extractFromPayload(error.error) ??
        this.extractFromPayload(error) ??
        fallback
      );
    }

    // Handle NSwag ApiException or similar wrapped errors
    const customError = error as any;
    if (customError && typeof customError === 'object') {
      if (customError.response) {
        const fromResponse = this.extractFromPayload(customError.response);
        if (fromResponse) return fromResponse;
      }
      if (customError.result) {
        const fromResult = this.extractFromPayload(customError.result);
        if (fromResult) return fromResult;
      }
    }

    if (error instanceof Error && error.message) {
      const fromMessage = this.extractFromPayload(error.message);
      return fromMessage ?? error.message;
    }

    return this.extractFromPayload(error) ?? fallback;
  }

  private extractFromPayload(payload: unknown): string | null {
    if (!payload) {
      return null;
    }

    if (typeof payload === 'string') {
      const trimmed = payload.trim();
      if (!trimmed) {
        return null;
      }

      try {
        const parsed = JSON.parse(trimmed) as unknown;
        const parsedMessage = this.extractFromPayload(parsed);
        if (parsedMessage) {
          return parsedMessage;
        }
      } catch {
        // Keep raw string when parsing fails.
      }

      return trimmed;
    }

    if (typeof payload !== 'object') {
      return null;
    }

    const data = payload as {
      message?: unknown;
      title?: unknown;
      detail?: unknown;
      response?: unknown;
      error?: unknown;
      errors?: unknown;
    };

    const directMessage = [
      data.message,
      data.title,
      data.detail,
      data.response,
      data.error,
    ]
      .map((item) => this.extractFromPayload(item))
      .find((item) => !!item);

    if (directMessage) {
      return directMessage;
    }

    if (data.errors && typeof data.errors === 'object') {
      const validationErrors = Object.values(
        data.errors as Record<string, unknown>,
      )
        .flatMap((entry) => {
          if (Array.isArray(entry)) {
            return entry;
          }
          return [entry];
        })
        .map((entry) => String(entry).trim())
        .filter((entry) => !!entry);

      if (validationErrors.length) {
        return validationErrors[0];
      }
    }

    return null;
  }
}
