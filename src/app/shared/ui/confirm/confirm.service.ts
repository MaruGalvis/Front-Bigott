import { Injectable, signal } from '@angular/core';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

interface ConfirmRequest extends ConfirmOptions {
  resolve: (confirmed: boolean) => void;
}

@Injectable({ providedIn: 'root' })
export class ConfirmService {
  private readonly requestSignal = signal<ConfirmRequest | null>(null);
  readonly request = this.requestSignal.asReadonly();

  confirm(options: ConfirmOptions): Promise<boolean> {
    return new Promise((resolve) => {
      this.requestSignal.set({ ...options, resolve });
    });
  }

  resolve(confirmed: boolean): void {
    this.requestSignal()?.resolve(confirmed);
    this.requestSignal.set(null);
  }
}
