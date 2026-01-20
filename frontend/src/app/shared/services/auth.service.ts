import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { BehaviorSubject, catchError, map, Observable, Subject, takeUntil, throwError } from 'rxjs';
import { AuthResponse, UserResponse } from '../models/auth.models';
import { environment } from '../../../environments/environments';

@Injectable({
  providedIn: 'root'
})
export class AuthService implements OnDestroy {
  private http = inject(HttpClient);
  private toastr = inject(ToastrService);
  private router = inject(Router);
  private destroy$ = new Subject<void>();  // Lifecycle cleanup

  private baseUrl = environment.apiUrl;
  private isLoggedIn = new BehaviorSubject<boolean>(this.hasToken());
  private sessionTimeout: any;

  constructor() {
    this.updateAuthState();
    this.startSessionTimer();
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/api/auth/login`, { email, password }).pipe(
      takeUntil(this.destroy$),  // Unsubscribe on destroy
      map((response) => {
        if (response && response.token) {
          this.showToast('success', 'Welcome back, Owner!', 'Login Success');
          this.storeAuthData(response);
          this.resetSessionTimer();
          this.isLoggedIn.next(true);
          this.router.navigate(['/dashboard']);
        }
        return response;
      }),
      catchError(this.handleError.bind(this))
    );
  }

  // Centralized Toastr (production-friendly: silent in prod if env.prod)
  private showToast(type: 'success' | 'error' | 'warning' | 'info', title: string, message?: string): void {
    if (environment.production) {
      // In prod, log instead of toast (or customize)
      console.warn(`[${type.toUpperCase()}] ${title}: ${message || ''}`);
      return;
    }
    this.toastr[type](message, title, { enableHtml: true });
  }

  private resetSessionTimer(): void {
    if (this.sessionTimeout) clearTimeout(this.sessionTimeout);
    this.sessionTimeout = setTimeout(() => {
      this.showToast('warning', 'Session expired after 1 hour', 'Logging out...');
      this.forceLogout();
    }, 60 * 60 * 1000);  // 1 hour
  }

  private startSessionTimer(): void {
    if (this.hasToken()) this.resetSessionTimer();
  }

  private forceLogout(): void {
    localStorage.clear();
    sessionStorage.clear();
    this.isLoggedIn.next(false);
    this.router.navigate(['/signin']);
    this.showToast('info', 'You have been logged out');
  }

  logOut(): void {
    this.forceLogout();
  }

  // GETTERS
  getUserRole(): string | null {
    return localStorage.getItem('role');
  }

  getUserId(): string | null {
    return localStorage.getItem('userId');
  }

  getUserToken(): string | null {
    return localStorage.getItem('token');
  }

  get isLoggedIn$() {
    return this.isLoggedIn.asObservable();
  }

  isRealOwner(): boolean {
    const savedMaster = localStorage.getItem('__GOD_MASTER_KEY');
    const savedFp = localStorage.getItem('__GOD_DEVICE_FP');
    return savedMaster === environment.masterKey && savedFp === environment.deviceFp;
  }

  private hasToken(): boolean {
    return !!localStorage.getItem('token');
  }

  private storeAuthData(response: AuthResponse): void {
    localStorage.setItem('token', response.token);
    localStorage.setItem('role', response.user.role);
    localStorage.setItem('userId', response.user.id);
    localStorage.setItem('user', JSON.stringify(response.user));
    localStorage.setItem('__GOD_MASTER_KEY', environment.masterKey);
    localStorage.setItem('__GOD_DEVICE_FP', environment.deviceFp);
  }

  private updateAuthState(): void {
    this.isLoggedIn.next(this.hasToken());
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let msg = 'Something went wrong';
    if (error.status === 0) msg = 'Network error—check connection';
    else if (error.status === 401) {
      msg = 'Session expired';
      this.forceLogout();
    } else if (error.error?.error) msg = error.error.error;
    else if (error.error?.message) msg = error.error.message;

    this.showToast('error', 'Error', msg);
    return throwError(() => new Error(msg));
  }

  registerSchool(formData: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/auth/register-school`, formData).pipe(
      takeUntil(this.destroy$),
      catchError(this.handleError.bind(this))
    );
  }

  changePassword(data: { currentPassword: string; newPassword: string }): Observable<boolean> {
    return this.http.patch(`${this.baseUrl}/api/user/change-password`, data).pipe(
      takeUntil(this.destroy$),
      map(() => {
        this.showToast('success', 'Success', 'Password changed successfully');
        return true;
      }),
      catchError(this.handleError.bind(this))
    );
  }

  forgotPassword(email: string): Observable<boolean> {
    return this.http.post(`${this.baseUrl}/api/auth/user/forgot-password`, { email }).pipe(
      takeUntil(this.destroy$),
      map(() => {
        this.showToast('success', 'Success', 'Password reset link sent to your email');
        return true;
      }),
      catchError(this.handleError.bind(this))
    );
  }

  resetPassword(token: string, newPassword: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/auth/reset-password`, { token, newPassword }).pipe(
      takeUntil(this.destroy$),
      catchError(this.handleError.bind(this))
    );
  }

  getProfile(): Observable<UserResponse> {
    const userId = this.getUserId();
    if (!userId) throw new Error('User ID not found');
    return this.http.get<UserResponse>(`${this.baseUrl}/api/users/${userId}`).pipe(
      takeUntil(this.destroy$),
      map((response) => {
        this.showToast('success', 'Success', 'Profile retrieved successfully');
        return response;
      }),
      catchError(this.handleError.bind(this))
    );
  }

  updateProfile(data: { name: string; email: string; additionalInfo?: any }): Observable<UserResponse> {
    const userId = this.getUserId();
    if (!userId) throw new Error('User ID not found');
    return this.http.put<UserResponse>(`${this.baseUrl}/api/users/${userId}`, data).pipe(
      takeUntil(this.destroy$),
      map((response) => {
        this.showToast('success', 'Success', 'Profile updated successfully');
        return response;
      }),
      catchError(this.handleError.bind(this))
    );
  }

  setUser(user: AuthResponse): void {
    this.storeAuthData(user);
  }

  getUser(): AuthResponse | null {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.sessionTimeout) clearTimeout(this.sessionTimeout);
  }
}