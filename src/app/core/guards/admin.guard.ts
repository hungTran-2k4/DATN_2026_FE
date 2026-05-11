import { CanActivateFn, Router } from '@angular/router';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AuthSessionService } from '../services/auth-session.service';

export const adminGuard: CanActivateFn = () => {
  const platformId = inject(PLATFORM_ID);
  const sessionService = inject(AuthSessionService);
  const router = inject(Router);

  if (!isPlatformBrowser(platformId)) {
    return true; // Cho phép đi tiếp ở phía Server, Client sẽ kiểm tra lại
  }

  const session = sessionService.getSession();
  if (!session) {
    router.navigateByUrl('/auth/login');
    return false;
  }

  if (sessionService.isAdmin()) {
    return true;
  }

  router.navigateByUrl('/home');
  return false;
};
