import { Component, OnInit, inject, signal } from '@angular/core';
import { PageHeader } from '../../shared/ui/page-header/page-header';
import { MonthPicker } from '../sales-target/components/month-picker/month-picker';
import { MonthBranchTable } from '../monthly-sales-distribution/components/month-branch-table/month-branch-table';
import { MonthlySalesDistributionService } from '../../core/services/monthly-sales-distribution.service';
import { MonthlyDistributionExportService } from '../../core/services/monthly-distribution-export.service';
import { TableSkeleton } from '../../shared/ui/skeleton/table-skeleton';
import { EmptyState } from '../../shared/ui/empty-state/empty-state';

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

@Component({
  selector: 'app-monthly-distribution-report',
  imports: [PageHeader, MonthPicker, MonthBranchTable, TableSkeleton, EmptyState],
  templateUrl: './monthly-distribution-report.html',
})
export class MonthlyDistributionReport implements OnInit {
  private readonly store = inject(MonthlySalesDistributionService);
  private readonly exportService = inject(MonthlyDistributionExportService);

  readonly months = MONTHS;
  readonly month = this.store.month;
  readonly year = this.store.year;

  readonly regionReports = this.store.regionReports;
  readonly loading = this.store.loadingAllRegions;
  readonly exporting = signal(false);

  ngOnInit(): void {
    this.store.loadAllRegions();
  }

  onMonthChanged(month: number): void {
    this.store.setMonth(month);
  }

  onYearChanged(year: number): void {
    this.store.setYear(year);
  }

  async exportToExcel(): Promise<void> {
    this.exporting.set(true);
    try {
      await this.exportService.export(this.regionReports(), this.store.calendarWeeks(), this.month(), this.year());
    } finally {
      this.exporting.set(false);
    }
  }
}
