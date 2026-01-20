import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../shared/services/auth.service';
import { ToastrService } from 'ngx-toastr';
import { DashboardService } from '../../../shared/services/dashboard.service';

interface SchoolSubscription {
  _id: string;
  schoolName: string;
  adminName: string;
  planType: string;
  status: string;
  expiresAt: string;
  daysRemaining: number;
  isTrial: boolean;
  revenue: number;
  createdAt: string;
}
@Component({
  selector: 'app-superadmin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './superadmin-dashboard.component.html',
  styleUrl: './superadmin-dashboard.component.css'
})
export class SuperadminDashboardComponent {
  private dashboardService = inject(DashboardService);
  private authService = inject(AuthService);
  private toastr = inject(ToastrService);

  schools: SchoolSubscription[] = [];
  totalSchools = 0;
  activeTrials = 0;
  activePaid = 0;
  totalRevenue = 0;
  loading = true;

  ngOnInit() {
    if (this.authService.getUserRole() !== 'superadmin') {
      this.toastr.error('Access denied');
      return;
    }
    this.loadSuperadminData();
  }

  loadSuperadminData() {
    this.loading = true;
    this.dashboardService.getSuperadminDashboard().subscribe({
      next: (data: any) => {
        this.schools = data.schools;
        this.totalSchools = data.totalSchools;
        this.activeTrials = data.activeTrials;
        this.activePaid = data.activePaid;
        this.totalRevenue = data.totalRevenue;
        this.loading = false;
      },
      error: () => {
        this.toastr.error('Failed to load data');
        this.loading = false;
      }
    });
  }

  activateTrial(schoolId: string) {
    if (confirm('Activate 14-day trial for this school?')) {
      this.dashboardService.activateTrial(schoolId).subscribe({
        next: () => {
          this.toastr.success('Trial activated');
          this.loadSuperadminData();
        },
        error: () => this.toastr.error('Failed')
      });
    }
  }

  formatDate(date: string) {
    return new Date(date).toLocaleDateString('en-IN');
  }

}
