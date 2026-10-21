import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PageHeader } from '../../shared/ui/page-header/page-header';
import { ExcelDropzone } from './components/excel-dropzone/excel-dropzone';
import { SalesTargetTable } from './components/sales-target-table/sales-target-table';
import { MonthPicker } from './components/month-picker/month-picker';
import { SalesTargetService } from '../../core/services/sales-target.service';
import { ExcelParserService } from '../../core/services/excel-parser.service';
import { ImportSalesTargetSummary, SalesTargetGrid } from '../../core/models/sales-target.model';
import { ToastService } from '../../shared/ui/toast/toast.service';

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function translateApiError(message: string | undefined): string | null {
  if (!message) return null;
  if (/validation failed/i.test(message) && /file type/i.test(message)) {
    return 'El archivo no tiene un formato válido. Formatos permitidos: .xlsx, .xls, .csv';
  }
  return message;
}

@Component({
  selector: 'app-sales-target',
  imports: [PageHeader, ExcelDropzone, SalesTargetTable, MonthPicker, FormsModule],
  templateUrl: './sales-target.html',
})
export class SalesTarget {
  private readonly salesTargetService = inject(SalesTargetService);
  private readonly parser = inject(ExcelParserService);
  private readonly toast = inject(ToastService);

  readonly months = MONTHS;
  private readonly today = new Date();

  month = signal(this.today.getMonth() + 1);
  year = signal(this.today.getFullYear());

  readonly savedGrid = this.salesTargetService.grid;

  pendingGrid = signal<SalesTargetGrid | null>(null);
  selectedFile = signal<File | null>(null);
  importSummary = signal<ImportSalesTargetSummary | null>(null);

  loading = signal(false);
  saving = signal(false);
  error = signal<string | null>(null);

  displayedGrid = computed(() => this.pendingGrid() ?? this.savedGrid());

  constructor() {
    this.salesTargetService.getLatestPeriod().subscribe({
      next: (latest) => {
        if (latest) {
          this.month.set(latest.month);
          this.year.set(latest.year);
        }
        this.reloadPivot();
      },
      error: () => this.reloadPivot(),
    });
  }

  onPeriodChange(): void {
    if (this.pendingGrid()) return;
    this.reloadPivot();
  }

  private reloadPivot(): void {
    this.loading.set(true);
    this.salesTargetService.loadPivot(this.month(), this.year()).subscribe({
      next: () => this.loading.set(false),
      error: () => this.loading.set(false),
    });
  }

  async onFileSelected(file: File): Promise<void> {
    this.error.set(null);
    this.importSummary.set(null);
    this.selectedFile.set(file);
    this.loading.set(true);
    try {
      const grid = await this.parser.parseSalesTarget(file);
      this.pendingGrid.set(grid);
    } catch (err) {
      this.pendingGrid.set(null);
      this.error.set(err instanceof Error ? err.message : 'No se pudo leer el archivo.');
    } finally {
      this.loading.set(false);
    }
  }

  onDiscard(): void {
    this.pendingGrid.set(null);
    this.selectedFile.set(null);
    this.error.set(null);
    this.importSummary.set(null);
  }

  onConfirm(): void {
    const file = this.selectedFile();
    if (!file) return;

    this.saving.set(true);
    this.error.set(null);
    this.salesTargetService.importFile(file, this.month(), this.year()).subscribe({
      next: (summary) => {
        this.importSummary.set(summary);
        this.pendingGrid.set(null);
        this.selectedFile.set(null);
        this.saving.set(false);
        this.reloadPivot();
        this.toast.success(
          '¡Objetivos al día!',
          `${summary.rowsImported} valores actualizados para ${this.months[this.month() - 1]} ${this.year()}.`,
        );
      },
      error: (err) => {
        const message = err?.error?.message;
        const raw = Array.isArray(message) ? message.join(' ') : message;
        const finalMessage = translateApiError(raw) ?? 'No se pudo guardar en el servidor.';
        this.error.set(finalMessage);
        this.saving.set(false);
        this.toast.error('No pudimos guardar tus objetivos', finalMessage);
      },
    });
  }
}
