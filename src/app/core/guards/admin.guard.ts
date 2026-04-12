import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthSessionService } from '../services/auth-session.service';

export const adminGuard: CanActivateFn = () => {
  const sessionService = inject(AuthSessionService);
  const router = inject(Router);

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
