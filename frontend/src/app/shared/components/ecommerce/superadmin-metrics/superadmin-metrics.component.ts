import { Component, Input } from '@angular/core';
import { BadgeComponent } from '../../ui/badge/badge.component';
import { SafeHtmlPipe } from '../../../pipe/safe-html.pipe';
import { CommonModule } from '@angular/common';

interface Metric {
  title: string;
  value: number | string;
  change: number;
  icon: string;
  color: 'success' | 'error' | 'warning' | 'info';
}

@Component({
  selector: 'app-superadmin-metrics',
  standalone: true,
  imports: [BadgeComponent, SafeHtmlPipe,CommonModule],
  template: `
  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
  <div *ngFor="let m of metrics"
       class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
    <div class="flex items-center justify-center w-12 h-12 rounded-xl"
         [ngClass]="{
           'bg-blue-100 text-blue-600': m.color === 'info',
           'bg-green-100 text-green-600': m.color === 'success',
           'bg-yellow-100 text-yellow-600': m.color === 'warning',
           'bg-red-100 text-red-600': m.color === 'error'
         }"
         [innerHTML]="m.icon | safeHtml">
    </div>
    <div class="flex items-end justify-between mt-5">
      <div>
        <span class="text-sm text-gray-500 dark:text-gray-400">{{ m.title }}</span>
        <h4 class="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">{{ m.value }}</h4>
      </div>
      <app-badge [color]="m.change > 0 ? 'success' : 'error'">
        <span [innerHTML]="m.change > 0 ? icons.arrowUp : icons.arrowDown | safeHtml"></span>
        {{ m.change > 0 ? '+' : '' }}{{ m.change }}%
      </app-badge>
    </div>
  </div>
</div>
  `
})
export class SuperadminMetricsComponent {
  @Input() data!: any;

  // icons = {
 
  // };

  metrics: Metric[] = [];

  ngOnChanges() {
    this.metrics = [
      { title: 'Total Schools', value: this.data.totalSchools, change: 0, color: 'info', icon: this.icons.groupIcon },
      { title: 'Active Trials', value: this.data.activeTrials, change: 15, color: 'warning', icon: this.icons.trialIcon },
      { title: 'Paid Plans', value: this.data.activePaid, change: 8, color: 'success', icon: this.icons.paidIcon },
      { title: 'Total Revenue', value: `₹${this.data.totalRevenue}`, change: 12, color: 'info', icon: this.icons.revenueIcon }
    ];
  }

  icons = {
     arrowUp: `<svg class="fill-current" width="1em" height="1em" viewBox="0 0 13 12"><path fill-rule="evenodd" clip-rule="evenodd" d="M6.06462 1.62393C6.20193 1.47072 6.40135 1.37432 6.62329 1.37432C6.6236 1.37432 6.62391 1.37432 6.62422 1.37432C6.81631 1.37415 7.00845 1.44731 7.15505 1.5938L10.1551 4.5918C10.4481 4.88459 10.4483 5.35946 10.1555 5.65246C9.86273 5.94546 9.38785 5.94562 9.09486 5.65283L7.37329 3.93247L7.37329 10.125C7.37329 10.5392 7.03751 10.875 6.62329 10.875C6.20908 10.875 5.87329 10.5392 5.87329 10.125L5.87329 3.93578L4.15516 5.65281C3.86218 5.94561 3.3873 5.94546 3.0945 5.65248C2.8017 5.35949 2.80185 4.88462 3.09484 4.59182L6.06462 1.62393Z" fill=""></path></svg>`,
    arrowDown: `<svg class="fill-current" width="1em" height="1em" viewBox="0 0 12 12"><path fill-rule="evenodd" clip-rule="evenodd" d="M5.31462 10.3761C5.45194 10.5293 5.65136 10.6257 5.87329 10.6257C5.8736 10.6257 5.8739 10.6257 5.87421 10.6257C6.0663 10.6259 6.25845 10.5527 6.40505 10.4062L9.40514 7.4082C9.69814 7.11541 9.69831 6.64054 9.40552 6.34754C9.11273 6.05454 8.63785 6.05438 8.34486 6.34717L6.62329 8.06753L6.62329 1.875C6.62329 1.46079 6.28751 1.125 5.87329 1.125C5.45908 1.125 5.12329 1.46079 5.12329 1.875L5.12329 8.06422L3.40516 6.34719C3.11218 6.05439 2.6373 6.05454 2.3445 6.34752C2.0517 6.64051 2.05185 7.11538 2.34484 7.40818L5.31462 10.3761Z" fill=""></path></svg>`,
    groupIcon: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none"><path fill-rule="evenodd" clip-rule="evenodd" d="M8.80443 5.60156C7.59109 5.60156 6.60749 6.58517 6.60749 7.79851C6.60749 9.01185 7.59109 9.99545 8.80443 9.99545C10.0178 9.99545 11.0014 9.01185 11.0014 7.79851C11.0014 6.58517 10.0178 5.60156 8.80443 5.60156ZM5.10749 7.79851C5.10749 5.75674 6.76267 4.10156 8.80443 4.10156C10.8462 4.10156 12.5014 5.75674 12.5014 7.79851C12.5014 9.84027 10.8462 11.4955 8.80443 11.4955C6.76267 11.4955 5.10749 9.84027 5.10749 7.79851ZM4.86252 15.3208C4.08769 16.0881 3.70377 17.0608 3.51705 17.8611C3.48384 18.0034 3.5211 18.1175 3.60712 18.2112C3.70161 18.3141 3.86659 18.3987 4.07591 18.3987H13.4249C13.6343 18.3987 13.7992 18.3141 13.8937 18.2112C13.9797 18.1175 14.017 18.0034 13.9838 17.8611C13.7971 17.0608 13.4132 16.0881 12.6383 15.3208C11.8821 14.572 10.6899 13.955 8.75042 13.955C6.81096 13.955 5.61877 14.572 4.86252 15.3208ZM3.8071 14.2549C4.87163 13.2009 6.45602 12.455 8.75042 12.455C11.0448 12.455 12.6292 13.2009 13.6937 14.2549C14.7397 15.2906 15.2207 16.5607 15.4446 17.5202C15.7658 18.8971 14.6071 19.8987 13.4249 19.8987H4.07591C2.89369 19.8987 1.73504 18.8971 2.05628 17.5202C2.28015 16.5607 2.76117 15.2906 3.8071 14.2549Z" fill="currentColor"></path></svg>`,
    trialIcon: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z" fill="currentColor"></path></svg>`,
    paidIcon: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="currentColor"></path></svg>`,
    revenueIcon: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="currentColor"></path></svg>`
  };
}