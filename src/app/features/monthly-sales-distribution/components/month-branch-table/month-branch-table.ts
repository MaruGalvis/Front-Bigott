import { Component, input, output } from '@angular/core';
import {
  DAY_LABELS_ES,
  DAY_ORDER,
  DayOfWeek,
  MonthlyBranchTable,
  MonthlyBrandRow,
} from '../../../../core/models/monthly-sales-distribution.model';
import { NumberEsPipe } from '../../../../shared/pipes/number-es.pipe';

export interface DailyWeightCellEdit {
  branchId: string;
  weekIndex: number;
  day: DayOfWeek;
  percent: number;
}

@Component({
  selector: 'app-month-branch-table',
  imports: [NumberEsPipe],
  templateUrl: './month-branch-table.html',
})
export class MonthBranchTable {
  private readonly numberEs = new NumberEsPipe();

  table = input.required<MonthlyBranchTable>();
  readonlyMode = input(false);
  isTotalRow = input(false);
  dailyWeightEdited = output<DailyWeightCellEdit>();

  readonly dayLabels = DAY_LABELS_ES;

  formatDate(date: Date): string {
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    return `${d}/${m}/${date.getFullYear()}`;
  }

  onDailyWeightInput(weekIndex: number, day: DayOfWeek, raw: string, inputEl: HTMLInputElement): void {
    const percent = Number(raw.replace(/\./g, '').replace(',', '.')) || 0;
    inputEl.value = percent ? this.numberEs.transform(percent) : '';
    this.dailyWeightEdited.emit({ branchId: this.table().branchId, weekIndex, day, percent });
  }

  weekProductSubtotal(row: MonthlyBrandRow, weekIndex: number): number {
    return DAY_ORDER.reduce((sum, day) => sum + (row.cells[`${weekIndex}-${day}`]?.quantity ?? 0), 0);
  }
}
