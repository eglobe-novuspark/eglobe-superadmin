import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot, Router, CanActivateFn } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { ToastrService } from 'ngx-toastr';

export const AuthGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
): Observable<boolean> | boolean => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const toastr = inject(ToastrService);

  return authService.isLoggedIn$.pipe(
    take(1),
    map(isLoggedIn => {
      if (!isLoggedIn) {
        toastr.error('Please log in to access this page');
        router.navigate(['/auth/login'], { queryParams: { returnUrl: state.url } });
        return false;
      }

      const userRole = authService.getUserRole();
      if (!userRole) {
        toastr.error('User role not found');
        router.navigate(['/dashboard/default']);
        return false;
      }

      const requiredRoles = route.data?.['roles'] as string[] | undefined;
      if (requiredRoles && !requiredRoles.includes(userRole)) {
        toastr.error('You do not have permission to access this page');
        router.navigate(['/dashboard/default']);
        return false;
      }

      return true;
    }),
    catchError(error => {
      console.error('Authorization error:', error);
      toastr.error('An error occurred during authorization');
      router.navigate(['/error']); // Add error page if needed
      return of(false);
    })
  );
};