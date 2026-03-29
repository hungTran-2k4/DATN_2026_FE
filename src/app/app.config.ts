import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import { MessageService } from 'primeng/api';
import Aura from '@primeuix/themes/aura';

import { routes } from './app.routes';
import { provideClientHydration } from '@angular/platform-browser';

import { environment } from '../environments/environment';
import { API_BASE_URL } from './data-access/api/api-service-base.service';
import { authInterceptor } from './core/interceptors/auth.interceptor';

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
