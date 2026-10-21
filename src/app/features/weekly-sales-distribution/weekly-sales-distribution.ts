import { Component, OnInit, computed, effect, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PageHeader } from '../../shared/ui/page-header/page-header';
import { SiteTable, DsaSopEdit, WeekMetaEdit } from './components/site-table/site-table';
import { RegionPicker } from './components/region-picker/region-picker';
import { MonthPicker } from '../sales-target/components/month-picker/month-picker';
import { WeeklySalesDistributionService } from '../../core/services/weekly-sales-distribution.service';
import { TableSkeleton } from '../../shared/ui/skeleton/table-skeleton';
import { EmptyState } from '../../shared/ui/empty-state/empty-state';

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

@Component({
  selector: 'app-weekly-sales-distribution',
  imports: [PageHeader, SiteTable, RegionPicker, MonthPicker, FormsModule, TableSkeleton, EmptyState],
  templateUrl: './weekly-sales-distribution.html',
})
export class WeeklySalesDistribution implements OnInit {
  private readonly store = inject(WeeklySalesDistributionService);

  readonly months = MONTHS;
  readonly month = this.store.month;
  readonly year = this.store.year;

  readonly regions = this.store.regions;
  readonly selectedRegionId = this.store.selectedRegionId;
  readonly selectedRegionName = computed(
    () => this.regions().find((r) => r.regionId === this.selectedRegionId())?.name ?? '',
  );
  readonly regionNames = computed(() => this.regions().map((r) => r.name));

  readonly branches = this.store.branches;
  readonly selectedBranchId = this.store.selectedBranchId;
  readonly selectedBranchName = computed(
    () => this.branches().find((b) => b.branchId === this.selectedBranchId())?.name ?? '',
  );
  readonly branchNames = computed(() => this.branches().map((b) => b.name));

  readonly TOTAL_ID = this.store.TOTAL_ID;
  readonly isTotalSelected = computed(() => this.selectedBranchId() === this.TOTAL_ID);

  readonly loadingBranchData = this.store.loadingBranchData;
  readonly currentSite = this.store.currentSite;

  readonly saving = this.store.saving;
  readonly saveError = this.store.saveError;
  readonly justSaved = this.store.justSaved;

  private defaultRegionApplied = false;

  constructor() {
    // Default to the "Caracas" region as soon as the region list loads.
    effect(() => {
      const regions = this.regions();
      if (this.defaultRegionApplied || regions.length === 0) return;

      const caracas = regions.find((r) => r.name.toLowerCase() === 'caracas');
      if (caracas) {
        this.defaultRegionApplied = true;
        this.store.selectRegion(caracas.regionId);
      }
    });

    // Auto-select the first branch whenever the branch list for the active region
    // becomes available and nothing is selected yet (covers async load timing).
    effect(() => {
      const branches = this.branches();
      if (branches.length > 0 && !this.selectedBranchId()) {
        this.store.selectBranch(branches[0].branchId);
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

  onBranchSelected(name: string): void {
    const branch = this.branches().find((b) => b.name === name);
    if (branch) this.store.selectBranch(branch.branchId);
  }

  onTotalSelected(): void {
    this.store.selectBranch(this.TOTAL_ID);
  }

  onMonthChanged(month: number): void {
    this.store.setMonth(month);
  }

  onYearChanged(year: number): void {
    this.store.setYear(year);
  }

  onWeekMetaEdited(edit: WeekMetaEdit): void {
    this.store.updateWeekMeta(edit.weekIndex, edit.patch);
  }

  onDsaSopEdited(edit: DsaSopEdit): void {
    this.store.updateDsaSop(edit.productId, edit.value);
  }
}
