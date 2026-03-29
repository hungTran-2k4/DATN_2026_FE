import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthSessionService } from '../services/auth-session.service';

export const adminGuard: CanActivateFn = () => {
  const sessionService = inject(AuthSessionService);
  const router = inject(Router);

  const token = sessionService.getAccessToken();
  if (token) {
    return true;
  }

  router.navigateByUrl('/auth/login');
  return false;
};
