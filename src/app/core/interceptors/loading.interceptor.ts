import {
  HttpEvent,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, finalize } from 'rxjs';
import { LoadingOverlayService } from '../services/loading-overlay.service';

export const loadingInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> => {
  if (!isApiRequest(req.url)) {
    return next(req);
  }

  const loadingOverlay = inject(LoadingOverlayService);
  loadingOverlay.show();

  return next(req).pipe(finalize(() => loadingOverlay.hide()));
};

function isApiRequest(url: string): boolean {
  return url.includes('/api/');
}
