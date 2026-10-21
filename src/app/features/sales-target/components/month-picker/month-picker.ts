import { Component, ElementRef, HostListener, inject, input, output, signal } from '@angular/core';

@Component({
  selector: 'app-month-picker',
  imports: [],
  templateUrl: './month-picker.html',
})
export class MonthPicker {
  months = input.required<string[]>();
  selected = input.required<number>();
  selectedChange = output<number>();

  private readonly elementRef = inject(ElementRef);
  open = signal(false);

  toggle(): void {
    this.open.set(!this.open());
  }

  select(index: number): void {
    this.selectedChange.emit(index + 1);
    this.open.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.open.set(false);
    }
  }
}
