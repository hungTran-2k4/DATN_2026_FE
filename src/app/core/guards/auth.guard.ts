import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthSessionService } from '../services/auth-session.service';

export const authGuard: CanActivateFn = () => {
  const sessionService = inject(AuthSessionService);
  const router = inject(Router);

  const token = sessionService.getAccessToken();
  if (!token) {
    router.navigateByUrl('/auth/login');
    return false;
  }

  return true;
};
