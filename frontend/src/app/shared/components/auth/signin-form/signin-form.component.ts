import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { LabelComponent } from '../../form/label/label.component';
import { InputFieldComponent } from '../../form/input/input-field.component';
import { Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-signin-form',
  imports: [
    CommonModule,
    LabelComponent,
    InputFieldComponent,
    RouterModule,
    ReactiveFormsModule,
    FormsModule,
  ],
  templateUrl: './signin-form.component.html',
  styles: [`
    .error-text { @apply mt-1 text-xs text-red-500 dark:text-red-400; }
    .form-input { @apply w-full; }  /* Fallback for host classes */
    .login-btn { @apply w-full h-11 rounded-lg bg-indigo-600 text-white font-medium text-sm px-4 py-2.5 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors; }
    .forgot-link, .back-link { @apply text-sm text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors; }
  `]
})
export class SigninFormComponent {
  serverErrors: any = {};
  public loginForm: FormGroup;
  showPassword = false;
  public forgotPasswordForm: FormGroup;
  validationError = false;
  isLoading = false;
  isDisable = false;
  showForgotPassword = false;

  // Toastr config for professional look (top-center, subtle)
  private toastrConfig = {
    positionClass: 'toast-top-center',
    timeOut: 5000,
    progressBar: true,
    closeButton: true,
    tapToDismiss: true,
    toastClass: 'ngx-toastr toast toast-success shadow-lg rounded-lg'  // Custom classes for styling
  };

  constructor(
    private fb: FormBuilder,
    public router: Router,
    private authService: AuthService,
    private toastrService: ToastrService
  ) {
    this.toastrService.success(
  'Login successful! Welcome back.',
  'Success',
  { positionClass: 'toast-top-center', timeOut: 120000 }
);
    this.loginForm = this.fb.group({
      email: ['', Validators.required],  // email only (no email validation for superadmin)
      password: ['', Validators.required],
    });

    this.forgotPasswordForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
    });
  }

  toggleForgotPassword() {
    this.showForgotPassword = !this.showForgotPassword;
    this.serverErrors = {};
    this.forgotPasswordForm.reset();
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  loaderBtn: any;

  onLoggedin(e: Event) {
    e.preventDefault();
    this.isLoading = true;
    this.isDisable = true;

    const { email, password } = this.loginForm.value;
    this.authService.login(email, password).subscribe({
      next: (response) => {
        const role = this.authService.getUserRole();
        if (role === 'superadmin') {
          this.router.navigate(['/dashboard']);
        } else {
          // Fallback for non-superadmin (though superadmin-only app)
          this.router.navigate(['//auth/register']);
        }
        this.toastrService.success('Login Success', 'Welcome!', this.toastrConfig);
        this.isLoading = false;
        this.isDisable = false;
      },
      error: (errorResponse) => {
        // Extract message correctly: backend sends { error: "msg" } or { message: "msg" }
        let errorMessage = errorResponse.error?.error || errorResponse.error?.message || 'Login Failed';
        
        // Normalize to structured errors for consistency
        this.serverErrors = errorResponse.error?.errors || { email: errorMessage };  // Assume backend might send {errors: {email: 'msg'}}

        if (errorResponse.status === 400) {
          this.toastrService.error(errorMessage, 'Invalid Credentials', this.toastrConfig);
        } else if (errorResponse.status === 0) {
          this.toastrService.error('Network Error', 'Connection Failed', this.toastrConfig);
        } else if (errorResponse.status === 500) {
          this.toastrService.error('Server Error', 'Please try again later', this.toastrConfig);
        } else {
          this.toastrService.error(errorMessage, 'Login Failed', this.toastrConfig);
        }

        this.isLoading = false;
        this.isDisable = false;
      }
    });
  }

  onForgotPassword() {
    if (this.forgotPasswordForm.invalid) {
      this.forgotPasswordForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.isDisable = true;

    const { email } = this.forgotPasswordForm.value;
    this.authService.forgotPassword(email.trim()).subscribe({
      next: (res: any) => {
        this.toastrService.success('Password reset link sent to your email', 'Success', this.toastrConfig);
        this.isLoading = false;
        this.isDisable = false;
        this.toggleForgotPassword();
      },
      error: (errorResponse) => {
        // Extract message correctly
        const errorMessage = errorResponse.error?.error || errorResponse.error?.message || 'Failed to send reset link';

        if (errorResponse.status === 404) {
          this.toastrService.error('Email not found in our records', 'Error', this.toastrConfig);
          this.serverErrors = { email: 'Email not found in our records' };
        } else if (errorResponse.status === 400) {
          this.toastrService.error(errorMessage, 'Invalid Input', this.toastrConfig);
          this.serverErrors = { email: errorMessage };
        } else if (errorResponse.status === 429) {
          this.toastrService.error('Too many requests, please try again later', 'Rate Limit Exceeded', this.toastrConfig);
          this.serverErrors = { email: 'Too many requests, please try again later' };
        } else if (errorResponse.status === 0) {
          this.toastrService.error('Network Error', 'Connection Failed', this.toastrConfig);
          this.serverErrors = { email: 'Network error, please check your connection' };
        } else {
          this.toastrService.error('An unexpected error occurred', 'Error', this.toastrConfig);
          this.serverErrors = { email: 'An unexpected error occurred' };
        }

        this.isLoading = false;
        this.isDisable = false;
      }
    });
  }

  // Helper to get error hint for inputs
  getErrorHint(controlName: string, form: FormGroup, serverKey?: string): string | undefined {
    const control = form.get(controlName);
    if (control?.touched && control.errors?.['required']) {
      return `${controlName.charAt(0).toUpperCase() + controlName.slice(1)} is required`;
    }
    if (control?.touched && control.errors?.['email']) {
      return 'Please enter a valid email';
    }
    if (this.serverErrors[serverKey || controlName]) {
      return this.serverErrors[serverKey || controlName];
    }
    return undefined;  // Changed from null to undefined
  }

  getFieldErrorState(controlName: string, form: FormGroup): boolean {
    const control = form.get(controlName);
    return !!(control?.touched && control.invalid) || !!this.serverErrors[controlName];
  }

  getFieldSuccessState(controlName: string, form: FormGroup): boolean {
    const control = form.get(controlName);
    return !!(control?.touched && control.valid && !this.serverErrors[controlName]);
  }
}