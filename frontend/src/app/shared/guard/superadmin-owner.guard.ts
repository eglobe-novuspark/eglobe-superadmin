// src/app/shared/guard/superadmin-owner.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ToastrService } from 'ngx-toastr';

export const SuperAdminOwnerGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const toastr = inject(ToastrService);

  // Must be logged in
  if (!authService.getUserToken()) {
    toastr.error('Login required');
    router.navigate(['/signin']);
    return false;
  }

  // Must be superadmin
  if (authService.getUserRole() !== 'superadmin') {
    toastr.error('Access denied');
    router.navigate(['/']);
    return false;
  }

  // FINAL CHECK: Only real owner with correct device + master key
  if (!authService.isRealOwner()) {
    toastr.error('Forbidden: Only the owner can access this page', 'Unauthorized Device');
    authService.logOut();
    return false;
  }
  return true;
};