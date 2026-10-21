import { Component, inject, signal } from '@angular/core';
import { PageHeader } from '../../shared/ui/page-header/page-header';
import { SalesTargetTable } from '../sales-target/components/sales-target-table/sales-target-table';
import { TableSkeleton } from '../../shared/ui/skeleton/table-skeleton';
import { EmptyState } from '../../shared/ui/empty-state/empty-state';
import { MlForecastService } from '../../core/services/ml-forecast.service';
import { MlGenerateResponse } from '../../core/models/ml-forecast.model';
import { SalesTargetGrid } from '../../core/models/sales-target.model';
import { ToastService } from '../../shared/ui/toast/toast.service';
import { ConfirmService } from '../../shared/ui/confirm/confirm.service';

@Component({
  selector: 'app-ml-forecast',
  imports: [PageHeader, SalesTargetTable, TableSkeleton, EmptyState],
  templateUrl: './ml-forecast.html',
})
export class MlForecast {
  private readonly mlForecastService = inject(MlForecastService);
  private readonly toast = inject(ToastService);
  private readonly confirmService = inject(ConfirmService);

  response = signal<MlGenerateResponse | null>(null);
  grid = signal<SalesTargetGrid | null>(null);

  generating = signal(false);
  saving = signal(false);
  saved = signal(false);
  error = signal<string | null>(null);

  onGenerate(): void {
    this.generating.set(true);
    this.error.set(null);
    this.saved.set(false);

    this.mlForecastService.generate().subscribe({
      next: (response) => {
        this.response.set(response);
        this.grid.set(this.mlForecastService.buildGrid(response));
        this.generating.set(false);

        if (response.omitidos?.length) {
          this.toast.info(
            'Algunos productos se omitieron',
            `${response.omitidos.length} combinación(es) región/producto no tenían historial suficiente.`,
          );
        }
      },
      error: () => {
        this.error.set('No pudimos generar la proyección con IA en este momento. Intenta de nuevo en unos minutos.');
        this.generating.set(false);
      },
    });
  }

  async onSave(): Promise<void> {
    const response = this.response();
    if (!response) return;

    const confirmed = await this.confirmService.confirm({
      title: '¿Guardar esta predicción?',
      message: `Estás a punto de guardar los objetivos estimados por IA para ${this.formatPeriod(response.period).toLowerCase()}.`,
      confirmLabel: 'Guardar',
      cancelLabel: 'Cancelar',
    });
    if (!confirmed) return;

    this.saving.set(true);
    this.error.set(null);

    this.mlForecastService.save(response.objetivos).subscribe({
      next: (summary) => {
        this.saving.set(false);
        this.saved.set(true);
        this.toast.success(
          '¡Objetivos guardados!',
          `${summary.rowsSaved} valores guardados para ${this.formatPeriod(response.period)}.`,
        );
        if (summary.skipped.length) {
          this.toast.info(
            'Algunos valores no se guardaron',
            `${summary.skipped.length} combinación(es) región/producto no se encontraron en el catálogo.`,
          );
        }
      },
      error: (err) => {
        this.saving.set(false);
        const message = this.extractMessage(err) ?? 'No se pudo guardar en el servidor.';
        this.error.set(message);
        this.toast.error('No pudimos guardar los objetivos', message);
      },
    });
  }

  onDiscard(): void {
    this.response.set(null);
    this.grid.set(null);
    this.error.set(null);
    this.saved.set(false);
  }

  formatPeriod(period: string): string {
    const date = new Date(period);
    const formatted = date.toLocaleDateString('es-VE', { month: 'long', year: 'numeric', timeZone: 'UTC' });
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }

  private extractMessage(err: unknown): string | null {
    const message = (err as { error?: { message?: string | string[] } })?.error?.message;
    if (!message) return null;
    return Array.isArray(message) ? message.join(' ') : message;
  }
}
