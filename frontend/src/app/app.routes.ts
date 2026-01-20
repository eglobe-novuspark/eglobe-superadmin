import { Routes } from '@angular/router';
import { NotFoundComponent } from './pages/other-page/not-found/not-found.component';
import { AppLayoutComponent } from './shared/layout/app-layout/app-layout.component';
import { SignInComponent } from './pages/auth-pages/sign-in/sign-in.component';
import { RegisterSchoolComponent } from './shared/components/ui/register-school/register-school.component';
import { ResetPasswordComponent } from './shared/components/reset-password/reset-password.component';
import { SuperAdminOwnerGuard } from './shared/guard/superadmin-owner.guard';
import { EcommerceComponent } from './pages/dashboard/ecommerce/ecommerce.component';

export const routes: Routes = [
  // IF USER HITS localhost:4200 → check if logged in
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },

  {
    path: '',
    component: AppLayoutComponent,
    children: [
      {
        path: 'dashboard',
        component: EcommerceComponent,
        canActivate: [SuperAdminOwnerGuard],
        title: 'Superadmin Dashboard'
      },
      {
        path: 'register-school',
        component: RegisterSchoolComponent,
        canActivate: [SuperAdminOwnerGuard],
        title: 'Create New School'
      }
    ]
  },

  // AUTH PAGES
  {
    path: 'signin',
    component: SignInComponent,
    title: 'Sign In'
  },
  {
    path: 'auth/reset-password',
    component: ResetPasswordComponent
  },

  // 404
  {
    path: '**',
    component: NotFoundComponent
  }
];