import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { environment } from '../../../environments/environments';

@Injectable({
  providedIn: 'root'
})
export class RazorpayService {
  private razorpayLoaded = new BehaviorSubject<boolean>(false);
  razorpayLoaded$ = this.razorpayLoaded.asObservable();
  
  constructor() { }
  loadRazorpayScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if ((window as any).Razorpay) {
        this.razorpayLoaded.next(true);
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => {
        this.razorpayLoaded.next(true);
        resolve();
      };
      script.onerror = () => {
        this.razorpayLoaded.next(false);
        reject(new Error('Failed to load Razorpay SDK'));
      };
      document.body.appendChild(script);
    });
  }

  getRazorpayKey(): string {
    return environment.razorpayKey;
  }
}
