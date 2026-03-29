import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
  HttpClient,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  BehaviorSubject,
  Observable,
  catchError,
  filter,
  switchMap,
  take,
  throwError,
} from 'rxjs';
import { AuthSessionService } from '../services/auth-session.service';
import { environment } from '../../../environments/environment';

let isRefreshing = false;
let refreshTokenSubject = new BehaviorSubject<any>(null);

export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<any>,
  next: HttpHandlerFn
): Observable<HttpEvent<any>> => {
  const router = inject(Router);
  const sessionService = inject(AuthSessionService);
  const http = inject(HttpClient); // We can inject HttpClient for the refresh token call to avoid circular dep with DATNServiceBase

  return next(req).pipe(
    catchError((error) => {
      // Don't intercept refresh-token call itself to prevent loops
      if (req.url.includes('/api/Auth/refresh-token')) {
        return throwError(() => error);
      }

      if (error instanceof HttpErrorResponse && error.status === 401) {
        return handle401Error(req, next, http, router, sessionService);
      }
      return throwError(() => error);
    })
  );
};

const handle401Error = (
  request: HttpRequest<any>,
  next: HttpHandlerFn,
  http: HttpClient,
  router: Router,
  sessionService: AuthSessionService
) => {
  if (!isRefreshing) {
    isRefreshing = true;
    refreshTokenSubject.next(null);

    // Call the refresh token endpoint directly (withCredentials sends the refresh cookie)
    return http
      .post(`${environment.apiUrl}/api/Auth/refresh-token`, {}, { withCredentials: true })
      .pipe(
        switchMap((response: any) => {
          isRefreshing = false;
          // Update the localized session data (roles, etc.)
          if (response?.data) {
            sessionService.saveSession(response.data);
          }
          refreshTokenSubject.next(response);

          // Retry the original request
          return next(request);
        }),
        catchError((err) => {
          isRefreshing = false;
          sessionService.clearSession();
          router.navigate(['/auth/login']);
          return throwError(() => err);
        })
      );
  } else {
    // Wait until refresh is done, then retry
    return refreshTokenSubject.pipe(
      filter((result) => result !== null),
      take(1),
      switchMap(() => next(request))
    );
  }
};
