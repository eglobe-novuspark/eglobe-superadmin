import { inject } from "@angular/core";
import { catchError, throwError } from "rxjs";
import { AuthService } from "../services/auth.service";
import { Router } from "@angular/router";
import { ToastrService } from "ngx-toastr";
import { HttpInterceptorFn } from "@angular/common/http";

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const toastr = inject(ToastrService);

  const token = authService.getUserToken();

  let authReq = req;
  if (token) {
    authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(authReq).pipe(
    catchError((error) => {
      // IMPORTANT: Only handle REAL HTTP errors (status >= 100)
      // Do NOT catch status 0 (network/CORS failure)
      if (error.status >= 100 && (error.status === 401 || error.status === 403)) {
        toastr.error('Session expired or unauthorized access', 'Authentication Error');
        authService.logOut();
        router.navigate(['/signin']);
      }

      return throwError(() => error);
    })
  );
};