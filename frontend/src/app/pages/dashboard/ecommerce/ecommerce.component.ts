import { Component, inject } from '@angular/core';
import { EcommerceMetricsComponent } from '../../../shared/components/ecommerce/ecommerce-metrics/ecommerce-metrics.component';
import { MonthlySalesChartComponent } from '../../../shared/components/ecommerce/monthly-sales-chart/monthly-sales-chart.component';
import { MonthlyTargetComponent } from '../../../shared/components/ecommerce/monthly-target/monthly-target.component';
import { StatisticsChartComponent } from '../../../shared/components/ecommerce/statics-chart/statics-chart.component';
import { DemographicCardComponent } from '../../../shared/components/ecommerce/demographic-card/demographic-card.component';
import { RecentOrdersComponent } from '../../../shared/components/ecommerce/recent-orders/recent-orders.component';
import { RecentSchoolsComponent } from '../../../shared/components/ecommerce/recent-schools.component';
import { SuperadminMetricsComponent } from '../../../shared/components/ecommerce/superadmin-metrics/superadmin-metrics.component';
import { DashboardService } from '../../../shared/services/dashboard.service';
import { AuthService } from '../../../shared/services/auth.service';
import { ToastrService } from 'ngx-toastr';
import { HttpClient } from '@angular/common/http';
@Component({
  selector: 'app-ecommerce',
  imports: [
    // EcommerceMetricsComponent,
    // MonthlySalesChartComponent,
    // MonthlyTargetComponent,
    // StatisticsChartComponent,
    // DemographicCardComponent,
    // RecentOrdersComponent,
    SuperadminMetricsComponent, RecentSchoolsComponent
  ],
  templateUrl: './ecommerce.component.html',
})
export class EcommerceComponent {
  metricsData = { totalSchools: 0, activeTrials: 0, activePaid: 0, totalRevenue: 0 };
 private dashboardService = inject(DashboardService);
  private authService = inject(AuthService);
  private toastr = inject(ToastrService);

  schools: any[] = [];
  totalSchools = 0;
  activeTrials = 0;
  activePaid = 0;
  totalRevenue = 0;
  loading = true;

  constructor(private http: HttpClient) {}
  ngOnInit() {
    this.loadSuperadminData();
   
  }

  loadSuperadminData() {
    this.loading = true;
    this.dashboardService.getSuperadminDashboard().subscribe({
      next: (data: any) => {
        this.schools = data.schools;
        this.metricsData = {
          totalSchools: data.totalSchools,
          activeTrials: data.activeTrials,
          activePaid: data.activePaid,
          totalRevenue: data.totalRevenue
        };
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }
  activateTrial(data:any){
    
  }
}
