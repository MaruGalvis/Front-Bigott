import { Component, inject } from '@angular/core';
import { ConfirmService } from './confirm.service';

@Component({
  selector: 'app-confirm-dialog',
  imports: [],
  templateUrl: './confirm-dialog.html',
})
export class ConfirmDialog {
  private readonly confirmService = inject(ConfirmService);

  readonly request = this.confirmService.request;

  cancel(): void {
    this.confirmService.resolve(false);
  }

  confirm(): void {
    this.confirmService.resolve(true);
  }
}
