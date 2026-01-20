import { Injectable, signal } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LoadingService {
  private loadingSubject = new BehaviorSubject<boolean>(false);
  public loading$ = this.loadingSubject.asObservable();
  private _isLoading = signal<boolean>(false);
  isLoading = this._isLoading.asReadonly(); // Expose as readonly signal

  constructor() {
    // Sync the BehaviorSubject with the signal
    this.loading$.subscribe(isLoading => {
      this._isLoading.set(isLoading);
    });
  }

  show() {
    this.loadingSubject.next(true);
  }

  hide() {
    this.loadingSubject.next(false);
  }
}