import { APP_INITIALIZER, ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import { MessageService } from 'primeng/api';
import Aura from '@primeuix/themes/aura';

import { routes } from './app.routes';
import { provideClientHydration } from '@angular/platform-browser';

import { environment } from '../environments/environment';
import { API_BASE_URL } from './shared/api/generated/api-service-base.service';
import { AuthFacade } from './pages/auth/services/auth.facade';
import { authInterceptor } from './core/interceptors/auth.interceptor';
 
export function initializeAuth(authFacade: AuthFacade) {
  return () => authFacade.initializeAuth();
}

// [CSRF] Tạm tắt cho môi trường dev local. Bật lại khi deploy production.
// export function initializeCsrfToken(http: HttpClient) {
//   return () => firstValueFrom(http.get(`${environment.apiUrl}/api/antiforgery/token`, { withCredentials: true })).catch(() => null);
// }

export const appConfig: ApplicationConfig = {
  providers: [
    { provide: API_BASE_URL, useValue: environment.apiUrl },
    // [CSRF] Tạm tắt cho môi trường dev local. Bật lại khi deploy production.
    // {
    //   provide: APP_INITIALIZER,
    //   useFactory: initializeCsrfToken,
    //   deps: [HttpClient],
    //   multi: true
    // },
    {
      provide: APP_INITIALIZER,
      useFactory: initializeAuth,
      deps: [AuthFacade],
      multi: true
    },
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideHttpClient(
      // [CSRF] Tạm tắt cho môi trường dev local. Bật lại khi deploy production.
      // withXsrfConfiguration({
      //   cookieName: 'XSRF-TOKEN',
      //   headerName: 'X-XSRF-TOKEN',
      // }),
      withInterceptors([authInterceptor])
    ),
    provideRouter(routes),
    provideClientHydration(),
    provideAnimationsAsync(),
    providePrimeNG({
      ripple: true,
      theme: {
        preset: Aura,
        options: {
          darkModeSelector: 'none',
        },
      },
    }),
    MessageService,
  ],
};
