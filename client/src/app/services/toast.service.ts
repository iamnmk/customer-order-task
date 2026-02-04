import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  private toasts$ = new Subject<Toast>();
  private toastCounter = 0;

  getToasts() {
    return this.toasts$.asObservable();
  }

  success(message: string, duration = 3000) {
    this.show(message, 'success', duration);
  }

  error(message: string, duration = 5000) {
    this.show(message, 'error', duration);
  }

  info(message: string, duration = 3000) {
    this.show(message, 'info', duration);
  }

  warning(message: string, duration = 4000) {
    this.show(message, 'warning', duration);
  }

  private show(message: string, type: Toast['type'], duration: number) {
    const toast: Toast = {
      id: ++this.toastCounter,
      message,
      type,
      duration,
    };
    this.toasts$.next(toast);
  }
}
