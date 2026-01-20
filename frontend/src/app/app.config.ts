import { APP_INITIALIZER, ApplicationConfig, importProvidersFrom, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';

import { routes } from './app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { RazorpayService } from './shared/services/razorpay.services';
import { provideToastr } from 'ngx-toastr';
import { tokenInterceptor } from './shared/interceptor/token.interceptor';
import { loadingInterceptor } from './shared/interceptor/loading.interceptor';
import { authInterceptor } from './shared/interceptor/auth.interceptor';
import { environment } from '../environments/environments';
import { GoogleMapsModule } from '@angular/google-maps';

// const initializeRazorpay = (razorpayService: RazorpayService) => () =>
//   razorpayService.loadRazorpayScript().catch(err => console.error('Razorpay SDK failed to load:', err));

export const appConfig: ApplicationConfig = {
  providers: [
     provideAnimations(),
    provideToastr({
    timeOut: 5000,              // Auto-dismiss after 5s
    positionClass: 'toast-top-center',  // ← Changed to top-center (looks best)
    preventDuplicates: true,
    closeButton: true,
    progressBar: true,
    enableHtml: true,
    newestOnTop: true,          // Newest message on top of stack
    tapToDismiss: true,
    toastClass: 'ngx-toastr',   // Default class (keep)
    iconClasses: {
      error: 'toast-error',
      success: 'toast-success',
      warning: 'toast-warning',
      info: 'toast-info'
    }
  }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    importProvidersFrom(GoogleMapsModule),
    {
      provide: 'GOOGLE_MAPS_API_KEY',
      useValue: environment.googleMapsApiKey
    },
    // {
    //   provide: APP_INITIALIZER,
    //   useFactory: initializeRazorpay,
    //   deps: [RazorpayService],
    //   multi: true
    // }
  ]
};
