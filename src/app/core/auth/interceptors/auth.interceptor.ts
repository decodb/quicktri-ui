import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment'
import { AuthService } from '../auth.service';  

// 401s from these endpoints are expected (wrong password, no session yet),
// so they must not trigger the "session expired" redirect.
const PUBLIC_AUTH_PATHS = [
  '/auth/login',
  '/auth/register',
  '/auth/me',
  '/auth/verify-email',
  '/auth/resend-verification',
  '/auth/forgot-password',
  '/auth/reset-password',
];

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Only talk cookies to our own API, never to third-party hosts
  const isApiRequest = req.url.startsWith(environment.apiUrl);
  const request = isApiRequest ? req.clone({ withCredentials: true }) : req;

  return next(request).pipe(
    catchError((err: HttpErrorResponse) => {
      const isPublicAuthCall = PUBLIC_AUTH_PATHS.some((path) => req.url.includes(path));

      if (isApiRequest && err.status === 401 && !isPublicAuthCall) {
        authService.clearSession();
        router.navigate(['/sign-in'], { queryParams: { returnUrl: router.url } });
      }

      return throwError(() => err);
    }),
  );
};