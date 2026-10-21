import { Component, input, output } from '@angular/core';
import { SiteComputed } from '../../../../core/models/weekly-sales-distribution.model';
import { NumberEsPipe } from '../../../../shared/pipes/number-es.pipe';
import { WeekStrip } from '../week-strip/week-strip';

export interface DsaSopEdit {
  productId: string;
  value: number;
}

export interface WeekMetaEdit {
  weekIndex: number;
  patch: Partial<{ weightPercent: number; days: number }>;
}

@Component({
  selector: 'app-site-table',
  imports: [NumberEsPipe, WeekStrip],
  templateUrl: './site-table.html',
})
export class SiteTable {
  private readonly numberEs = new NumberEsPipe();

  site = input.required<SiteComputed>();
  readonlyMode = input(false);

  readonly weekTints = ['#e7f1fb', '#e7f1fb', '#e7f1fb', '#e7f1fb', '#e7f1fb'];

  dsaSopEdited = output<DsaSopEdit>();
  weekMetaEdited = output<WeekMetaEdit>();

  onDsaSopInput(productId: string, raw: string, inputEl: HTMLInputElement): void {
    const value = Number(raw.replace(/\./g, '').replace(',', '.')) || 0;
    inputEl.value = value ? this.numberEs.transform(value) : '';
    this.dsaSopEdited.emit({ productId, value });
  }

  onWeightChanged(e: { weekIndex: number; value: number }): void {
    this.weekMetaEdited.emit({ weekIndex: e.weekIndex, patch: { weightPercent: e.value } });
  }

  onDaysChanged(e: { weekIndex: number; value: number }): void {
    this.weekMetaEdited.emit({ weekIndex: e.weekIndex, patch: { days: e.value } });
  }
}
