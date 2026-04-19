import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthSessionService } from '../services/auth-session.service';

export const sellerGuard: CanActivateFn = () => {
  const sessionService = inject(AuthSessionService);
  const router = inject(Router);

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
