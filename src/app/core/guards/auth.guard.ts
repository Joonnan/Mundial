// src/app/core/guards/auth.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // Esperar a que cargue la sesión
  await waitForLoad(auth);

  if (auth.isLoggedIn()) return true;
  return router.createUrlTree(['/auth']);
};

// src/app/core/guards/admin.guard.ts
export const adminGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await waitForLoad(auth);

  if (auth.isAdmin()) return true;
  return router.createUrlTree(['/']);
};

function waitForLoad(auth: AuthService): Promise<void> {
  return new Promise(resolve => {
    if (!auth.loading()) { resolve(); return; }
    const interval = setInterval(() => {
      if (!auth.loading()) { clearInterval(interval); resolve(); }
    }, 50);
  });
}
