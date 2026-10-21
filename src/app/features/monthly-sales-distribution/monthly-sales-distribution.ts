import { Component, OnInit, computed, effect, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PageHeader } from '../../shared/ui/page-header/page-header';
import { RegionPicker } from '../weekly-sales-distribution/components/region-picker/region-picker';
import { MonthPicker } from '../sales-target/components/month-picker/month-picker';
import { MonthBranchTable } from './components/month-branch-table/month-branch-table';
import { MonthlySalesDistributionService } from '../../core/services/monthly-sales-distribution.service';
import { DayOfWeek } from '../../core/models/monthly-sales-distribution.model';
import { TableSkeleton } from '../../shared/ui/skeleton/table-skeleton';
import { EmptyState } from '../../shared/ui/empty-state/empty-state';

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export interface DailyWeightEdit {
  branchId: string;
  weekIndex: number;
  day: DayOfWeek;
  percent: number;
}

@Component({
  selector: 'app-monthly-sales-distribution',
  imports: [PageHeader, RegionPicker, MonthPicker, MonthBranchTable, FormsModule, TableSkeleton, EmptyState],
  templateUrl: './monthly-sales-distribution.html',
})
export class MonthlySalesDistribution implements OnInit {
  private readonly store = inject(MonthlySalesDistributionService);

  readonly months = MONTHS;
  readonly month = this.store.month;
  readonly year = this.store.year;

  readonly regions = this.store.regions;
  readonly selectedRegionId = this.store.selectedRegionId;
  readonly selectedRegionName = computed(
    () => this.regions().find((r) => r.regionId === this.selectedRegionId())?.name ?? '',
  );
  readonly regionNames = computed(() => this.regions().map((r) => r.name));

  readonly branchTables = this.store.branchTables;
  readonly regionTotalTable = this.store.regionTotalTable;
  readonly loading = this.store.loading;
  readonly saving = this.store.saving;
  readonly saveError = this.store.saveError;
  readonly justSaved = this.store.justSaved;

  private defaultRegionApplied = false;

  constructor() {
    effect(() => {
      const regions = this.regions();
      if (this.defaultRegionApplied || regions.length === 0) return;

      const caracas = regions.find((r) => r.name.toLowerCase() === 'caracas');
      if (caracas) {
        this.defaultRegionApplied = true;
        this.store.selectRegion(caracas.regionId);
      }
    });
  }

  ngOnInit(): void {
    this.store.loadRegions();
  }

  onRegionSelected(name: string): void {
    const region = this.regions().find((r) => r.name === name);
    if (region) this.store.selectRegion(region.regionId);
  }

  onMonthChanged(month: number): void {
    this.store.setMonth(month);
  }

  onYearChanged(year: number): void {
    this.store.setYear(year);
  }

  onDailyWeightEdited(edit: DailyWeightEdit): void {
    this.store.updateDailyWeight(edit.branchId, edit.weekIndex, edit.day, edit.percent);
  }
}
