import { CanActivateFn } from '@angular/router';

export const adminGuard: CanActivateFn = () => {
  // TODO: Thay logic mock nay bang kiem tra token/quyen admin tu auth service.
  return true;
};
