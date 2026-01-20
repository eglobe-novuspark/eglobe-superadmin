import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule,ReactiveFormsModule],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.css'
})
export class ResetPasswordComponent {
form: FormGroup;
  token: string = '';
  loading = false;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private toastr: ToastrService
  ) {
    this.form = this.fb.group({
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    }, { validators: this.passwordMatch });

    this.route.queryParams.subscribe(params => {
      this.token = params['token'] || '';
      if (!this.token) {
        this.toastr.error('Invalid reset link');
        this.router.navigate(['/auth/login']);
      }
    });
  }

  passwordMatch(g: FormGroup) {
    return g.get('newPassword')?.value === g.get('confirmPassword')?.value
      ? null : { mismatch: true };
  }

  async onSubmit() {
    if (this.form.invalid) return;

    this.loading = true;
    const { newPassword } = this.form.value;

    this.authService.resetPassword(this.token, newPassword).subscribe({
      next: (res: any) => {
        this.toastr.success(res.message);
        this.router.navigate(['/auth/login']);
      },
      error: (err:any) => {
        this.toastr.error(err.error?.message || 'Reset failed');
        this.loading = false;
      }
    });
  }
}
