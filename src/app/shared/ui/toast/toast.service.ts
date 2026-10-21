import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  type: ToastType;
  message: string;
  description?: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly toastsSignal = signal<Toast[]>([]);
  readonly toasts = this.toastsSignal.asReadonly();

  private nextId = 1;

  success(message: string, description?: string): void {
    this.show('success', message, description);
  }

  error(message: string, description?: string): void {
    this.show('error', message, description, 6000);
  }

  info(message: string, description?: string): void {
    this.show('info', message, description);
  }

  dismiss(id: number): void {
    this.toastsSignal.update((toasts) => toasts.filter((t) => t.id !== id));
  }

  private show(type: ToastType, message: string, description?: string, duration = 4000): void {
    const id = this.nextId++;
    this.toastsSignal.update((toasts) => [...toasts, { id, type, message, description }]);
    setTimeout(() => this.dismiss(id), duration);
  }
}
