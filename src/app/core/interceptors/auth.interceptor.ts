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
  const http = inject(HttpClient);

  // Skip URL check
  const skipUrls = ['/api/Auth/refresh-token', '/api/Auth/login', '/api/Auth/register', '/api/Auth/forgot-password', '/api/Auth/reset-password'];
  if (skipUrls.some(url => req.url.includes(url))) {
    return next(req);
  }

  return next(req).pipe(
    catchError((error) => {
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

    return http
      .post(`${environment.apiUrl}/api/Auth/refresh-token`, {}, { withCredentials: true })
      .pipe(
        switchMap((response: any) => {
          isRefreshing = false;
          
          if (response?.data) {
            sessionService.saveSession(response.data);
          }
          
          refreshTokenSubject.next(response);
          // Retry with the same request object. 
          // Browser will automatically use the updated HttpOnly cookies.
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
    // Other parallel requests wait here for the singleton refresh call to finish
    return refreshTokenSubject.pipe(
      filter((result) => result !== null),
      take(1),
      switchMap(() => next(request))
    );
  }
};
