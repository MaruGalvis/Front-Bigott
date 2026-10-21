import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, forkJoin } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  BrandComputed,
  RegionComputed,
  SiteComputed,
  WEEK_LABELS,
} from '../models/weekly-sales-distribution.model';
import { RegionService } from './region.service';
import { BranchService } from './branch.service';
import { ProductService } from './product.service';
import { sortByBrandOrder } from '../utils/brand-order';
import { ToastService } from '../../shared/ui/toast/toast.service';

interface WsdRow {
  weeklySalesDistributionId: string;
  branchId: string;
  productId: string;
  month: number;
  year: number;
  workingWeeks: string;
  workingDays: number;
  totalWorkingDays: number;
  weight: number;
  dailySalesAverage: number;
  sop: number;
  weeklyQuantity: number;
}

interface PaginatedResult<T> {
  data: T[];
}

interface UpsertPatch {
  weight: number;
  workingDays: number;
  totalWorkingDays: number;
  dailySalesAverage: number;
}

@Injectable({ providedIn: 'root' })
export class WeeklySalesDistributionService {
  private readonly http = inject(HttpClient);
  private readonly regionService = inject(RegionService);
  private readonly branchService = inject(BranchService);
  private readonly productService = inject(ProductService);
  private readonly toast = inject(ToastService);
  private readonly baseUrl = `${environment.apiUrl}/weekly-sales-distribution`;

  /** Sentinel branch id selecting the read-only, client-computed sum across
   * every branch in the current region (nothing is persisted for this view). */
  readonly TOTAL_ID = '__TOTAL__';

  readonly regions = this.regionService.items;
  readonly loadingRegions = this.regionService.loading;

  readonly selectedRegionId = signal<string | null>(null);
  readonly branches = computed(() =>
    this.branchService
      .items()
      .filter((b) => b.regionId === this.selectedRegionId())
      .sort((a, b) => a.name.localeCompare(b.name)),
  );

  readonly selectedBranchId = signal<string | null>(null);
  readonly loadingBranchData = signal(false);

  readonly month = signal(new Date().getMonth() + 1);
  readonly year = signal(new Date().getFullYear());

  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);
  readonly justSaved = signal(false);
  private savedPulseTimeout: ReturnType<typeof setTimeout> | null = null;

  private readonly rowsSignal = signal<WsdRow[]>([]);

  readonly currentSite = computed<SiteComputed | null>(() => {
    const branchId = this.selectedBranchId();
    if (branchId === this.TOTAL_ID) return this.buildTotalSite();

    const branch = this.branchService.items().find((b) => b.branchId === branchId);
    if (!branch) return null;

    const rows = this.rowsSignal().filter((r) => r.branchId === branchId && r.month === this.month() && r.year === this.year());
    const products = sortByBrandOrder(this.productService.items(), (p) => p.name);

    const weeks = WEEK_LABELS.map((label) => {
      const row = rows.find((r) => r.workingWeeks === label);
      return {
        label,
        weightPercent: row ? Math.round(row.weight * 100) : 0,
        days: row?.workingDays ?? 0,
      };
    });

    const brandRows: BrandComputed[] = products.map((p) => {
      const productRows = WEEK_LABELS.map((label) => rows.find((r) => r.productId === p.productId && r.workingWeeks === label));
      const values = productRows.map((r) => r?.weeklyQuantity ?? 0);
      const dsaSop = productRows.find((r) => r?.dailySalesAverage)?.dailySalesAverage ?? 0;
      const sop = values.reduce((sum, v) => sum + v, 0);
      return { productId: p.productId, brand: p.name, values, dsaSop, sop };
    });

    const totalValues = WEEK_LABELS.map((_, i) => brandRows.reduce((sum, r) => sum + r.values[i], 0));
    const totalDsaSop = brandRows.reduce((sum, r) => sum + r.dsaSop, 0);
    const totalRow: BrandComputed = {
      productId: '',
      brand: 'TOTAL',
      values: totalValues,
      dsaSop: totalDsaSop,
      sop: totalValues.reduce((s, v) => s + v, 0),
    };

    const totalDays = weeks.reduce((sum, w) => sum + w.days, 0);

    return { branchId: branch.branchId, site: branch.name, weeks, brands: brandRows, brandRows, totalRow, totalDays };
  });

  readonly currentRegion = computed<RegionComputed | null>(() => {
    const site = this.currentSite();
    if (!site) return null;
    return { region: site.site, sites: [site], summary: site };
  });

  /** Client-side sum of every branch in the current region — nothing is fetched
   * or persisted here beyond the per-branch rows already loaded in selectRegion. */
  private buildTotalSite(): SiteComputed | null {
    const branches = this.branches();
    if (branches.length === 0) return null;

    const regionName = this.regions().find((r) => r.regionId === this.selectedRegionId())?.name ?? '';
    const branchIds = new Set(branches.map((b) => b.branchId));
    const rows = this.rowsSignal().filter(
      (r) => branchIds.has(r.branchId) && r.month === this.month() && r.year === this.year(),
    );
    const products = sortByBrandOrder(this.productService.items(), (p) => p.name);

    const brandRows: BrandComputed[] = products.map((p) => {
      const productRows = rows.filter((r) => r.productId === p.productId);
      const values = WEEK_LABELS.map((label) =>
        productRows.filter((r) => r.workingWeeks === label).reduce((sum, r) => sum + r.weeklyQuantity, 0),
      );

      // One DSA value per branch (it's replicated across that branch's 5 weeks), summed across branches.
      const dsaByBranch = new Map<string, number>();
      for (const r of productRows) {
        if (r.dailySalesAverage) dsaByBranch.set(r.branchId, r.dailySalesAverage);
      }
      const dsaSop = [...dsaByBranch.values()].reduce((sum, v) => sum + v, 0);

      return { productId: p.productId, brand: p.name, values, dsaSop, sop: values.reduce((s, v) => s + v, 0) };
    });

    const totalValues = WEEK_LABELS.map((_, i) => brandRows.reduce((sum, r) => sum + r.values[i], 0));
    const grandTotal = totalValues.reduce((s, v) => s + v, 0);
    const totalDsaSop = brandRows.reduce((sum, r) => sum + r.dsaSop, 0);
    const totalRow: BrandComputed = {
      productId: '',
      brand: 'TOTAL',
      values: totalValues,
      dsaSop: totalDsaSop,
      sop: totalValues.reduce((s, v) => s + v, 0),
    };

    const weeks = WEEK_LABELS.map((label, i) => ({
      label,
      weightPercent: grandTotal ? Math.round((totalValues[i] / grandTotal) * 100) : 0,
      days: rows.find((r) => r.workingWeeks === label)?.workingDays ?? 0,
    }));

    return {
      branchId: this.TOTAL_ID,
      site: regionName ? `Total ${regionName}` : 'Total',
      weeks,
      brands: brandRows,
      brandRows,
      totalRow,
      totalDays: weeks.reduce((sum, w) => sum + w.days, 0),
    };
  }

  loadRegions(): void {
    this.regionService.load();
    this.branchService.load();
    this.productService.load();
  }

  selectRegion(regionId: string): void {
    this.selectedRegionId.set(regionId);
    this.selectedBranchId.set(null);
    this.rowsSignal.set([]);
    this.loadingBranchData.set(true);

    this.http.get<PaginatedResult<WsdRow>>(this.baseUrl, { params: { limit: '5000' } }).subscribe({
      next: (res) => {
        const branchIds = new Set(this.branches().map((b) => b.branchId));
        this.rowsSignal.set(res.data.filter((r) => branchIds.has(r.branchId)));
        this.loadingBranchData.set(false);
      },
      error: () => this.loadingBranchData.set(false),
    });
  }

  selectBranch(branchId: string): void {
    this.selectedBranchId.set(branchId);
  }

  setMonth(month: number): void {
    this.month.set(month);
  }

  setYear(year: number): void {
    this.year.set(year);
  }

  updateWeekMeta(weekIndex: number, patch: Partial<{ weightPercent: number; days: number }>): void {
    const site = this.currentSite();
    const branchId = this.selectedBranchId();
    if (!site || !branchId || branchId === this.TOTAL_ID) return;

    const newWeeks = site.weeks.map((w, i) => (i === weekIndex ? { ...w, ...patch } : w));
    const week = newWeeks[weekIndex];
    const label = WEEK_LABELS[weekIndex];
    const totalWorkingDays = newWeeks.reduce((sum, w) => sum + w.days, 0);

    const calls: Observable<WsdRow>[] = site.brands.map((brand) =>
      this.upsertRow(branchId, brand.productId, label, {
        weight: week.weightPercent / 100,
        workingDays: week.days,
        totalWorkingDays,
        dailySalesAverage: brand.dsaSop,
      }),
    );

    this.runSave(calls, `Actualizamos ${label}`);
  }

  updateDsaSop(productId: string, value: number): void {
    const site = this.currentSite();
    const branchId = this.selectedBranchId();
    if (!site || !branchId || branchId === this.TOTAL_ID) return;

    const productName = site.brands.find((b) => b.productId === productId)?.brand;
    const totalWorkingDays = site.weeks.reduce((sum, w) => sum + w.days, 0);

    const calls: Observable<WsdRow>[] = WEEK_LABELS.map((label, i) =>
      this.upsertRow(branchId, productId, label, {
        weight: site.weeks[i].weightPercent / 100,
        workingDays: site.weeks[i].days,
        totalWorkingDays,
        dailySalesAverage: value,
      }),
    );

    this.runSave(calls, productName ? `Actualizamos el DSA de ${productName}` : 'Actualizamos el DSA');
  }

  private runSave(calls: Observable<WsdRow>[], successMessage: string): void {
    this.saving.set(true);
    this.saveError.set(null);

    forkJoin(calls).subscribe({
      next: (updatedRows) => {
        this.mergeRows(updatedRows);
        this.saving.set(false);
        this.pulseSaved();
        this.toast.success(successMessage);
      },
      error: () => {
        this.saving.set(false);
        const message = 'Verifica tu conexión e intenta de nuevo.';
        this.saveError.set(`No se pudo guardar el cambio. ${message}`);
        this.toast.error('No pudimos guardar tu distribución semanal', message);
      },
    });
  }

  private pulseSaved(): void {
    this.justSaved.set(true);
    if (this.savedPulseTimeout) clearTimeout(this.savedPulseTimeout);
    this.savedPulseTimeout = setTimeout(() => this.justSaved.set(false), 2200);
  }

  private upsertRow(branchId: string, productId: string, week: string, patch: UpsertPatch): Observable<WsdRow> {
    const month = this.month();
    const year = this.year();
    const existing = this.rowsSignal().find(
      (r) => r.branchId === branchId && r.productId === productId && r.workingWeeks === week && r.month === month && r.year === year,
    );

    if (existing) {
      return this.http.patch<WsdRow>(`${this.baseUrl}/${existing.weeklySalesDistributionId}`, patch);
    }

    return this.http.post<WsdRow>(this.baseUrl, {
      branchId,
      productId,
      month,
      year,
      workingWeeks: week,
      ...patch,
    });
  }

  private mergeRows(updated: WsdRow[]): void {
    this.rowsSignal.update((rows) => {
      const next = [...rows];
      for (const row of updated) {
        const idx = next.findIndex((r) => r.weeklySalesDistributionId === row.weeklySalesDistributionId);
        if (idx >= 0) next[idx] = row;
        else next.push(row);
      }
      return next;
    });
  }
}
