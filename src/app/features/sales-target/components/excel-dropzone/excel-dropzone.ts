import { Component, input, output, signal } from '@angular/core';

@Component({
  selector: 'app-excel-dropzone',
  imports: [],
  templateUrl: './excel-dropzone.html',
})
export class ExcelDropzone {
  loading = input(false);
  fileName = input<string | null>(null);

  fileSelected = output<File>();
  cleared = output<void>();

  isDragging = signal(false);

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(true);
  }

  onDragLeave(): void {
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) this.fileSelected.emit(file);
  }

  onFileInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.fileSelected.emit(file);
    input.value = '';
  }
}
