import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output } from "@angular/core";

@Component({
  selector: 'app-recent-schools',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] p-5 md:p-6">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-gray-800 dark:text-white/90">All Schools</h3>
        <button class="text-sm text-blue-600 hover:text-blue-700" (click)="refresh.emit()">
          Refresh
        </button>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-gray-500 border-b dark:border-gray-700">
              <th class="pb-2">School</th>
              <th class="pb-2">Plan</th>
              <th class="pb-2">Status</th>
              <th class="pb-2">Expires</th>
              <th class="pb-2">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let s of schools" class="border-b dark:border-gray-700">
              <td class="py-3">
                <div>
                  <div class="font-medium text-gray-800 dark:text-white/90">{{ s.schoolName }}</div>
                  <div class="text-xs text-gray-500">Joined {{ formatDate(s.createdAt) }}</div>
                </div>
              </td>
              <td class="py-3">
                <span class="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full"
                      [ngClass]="{
                        'bg-yellow-100 text-yellow-800': s.isTrial,
                        'bg-green-100 text-green-800': s.planType.includes('premium'),
                        'bg-blue-100 text-blue-800': s.planType.includes('basic')
                      }">
                  {{ s.planType | titlecase }} <span *ngIf="s.isTrial">(Trial)</span>
                </span>
              </td>
              <td class="py-3">
                <span class="inline-flex text-xs font-medium px-2 py-1 rounded-full"
                      [ngClass]="{
                        'bg-green-100 text-green-800': s.status === 'active',
                        'bg-red-100 text-red-800': s.status === 'expired'
                      }">
                  {{ s.status | titlecase }}
                </span>
              </td>
              <td class="py-3 text-sm">
                <span [class.text-red-600]="s.daysRemaining <= 0">
                  {{ s.daysRemaining > 0 ? s.daysRemaining + ' days' : 'Expired' }}
                </span>
              </td>
              <td class="py-3">
                <button *ngIf="s.status === 'none'"
                        class="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                        (click)="activateTrial.emit(s._id)">
                  Activate Trial
                </button>
                <span *ngIf="s.status !== 'none'" class="text-gray-400">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `
})
export class RecentSchoolsComponent {
  @Input() schools: any[] = [];
  @Output() refresh = new EventEmitter();
  @Output() activateTrial = new EventEmitter<string>();

  formatDate(date: string) {
    return new Date(date).toLocaleDateString('en-IN');
  }
}