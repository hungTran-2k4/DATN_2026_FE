import { CanActivateFn, Router } from '@angular/router';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AuthSessionService } from '../services/auth-session.service';

export const sellerGuard: CanActivateFn = () => {
  const platformId = inject(PLATFORM_ID);
  const sessionService = inject(AuthSessionService);
  const router = inject(Router);

  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  const session = sessionService.getSession();
  if (!session) {
    router.navigateByUrl('/auth/login');
    return false;
  }

  // Seller hoặc Admin đều được vào Seller Center
  if (sessionService.isSeller() || sessionService.isAdmin()) {
    return true;
  }

  // Customer chưa đăng ký → về onboarding (nằm trong UserLayout, không cần guard)
  router.navigateByUrl('/seller/onboarding');
  return false;
};
