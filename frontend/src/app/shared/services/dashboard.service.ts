import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environments';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  constructor(private http: HttpClient) { }

  getSuperadminDashboard(): Observable<any> {
    return this.http.get(`${environment.apiUrl}/api/superadmin/dashboard`);
  }

  activateTrial(schoolId: string): Observable<any> {
    return this.http.post(`${environment.apiUrl}/api/superadmin/activate-trial`, { schoolId });
  }
}