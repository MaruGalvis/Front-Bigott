import { Component, ElementRef, HostListener, inject, input, output, signal } from '@angular/core';

@Component({
  selector: 'app-region-picker',
  imports: [],
  templateUrl: './region-picker.html',
})
export class RegionPicker {
  regions = input.required<string[]>();
  selected = input.required<string>();
  placeholder = input('Selecciona una región');
  icon = input('pi-map-marker');
  selectedChange = output<string>();

  private readonly elementRef = inject(ElementRef);
  open = signal(false);

  toggle(): void {
    this.open.set(!this.open());
  }

  select(region: string): void {
    this.selectedChange.emit(region);
    this.open.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.open.set(false);
    }
  }
}
