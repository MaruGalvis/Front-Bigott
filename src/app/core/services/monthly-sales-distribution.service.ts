import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, forkJoin } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CalendarWeek,
  DAY_LABELS_ES,
  DAY_ORDER,
  DayOfWeek,
  MonthlyBranchTable,
  MonthlyBrandRow,
  computeCalendarWeeks,
} from '../models/monthly-sales-distribution.model';
import { RegionService } from './region.service';
import { BranchService } from './branch.service';
import { ProductService } from './product.service';
import { sortByBrandOrder } from '../utils/brand-order';
import { ToastService } from '../../shared/ui/toast/toast.service';

interface WeeklyRow {
  weeklySalesDistributionId: string;
  branchId: string;
  productId: string;
  month: number;
  year: number;
  workingWeeks: string;
  weeklyQuantity: number;
}

interface MonthlyRow {
  monthlySalesDistributionId: string;
  branchId: string;
  productId: string;
  weeklySalesDistributionId: string;
  dayOfWeek: string;
  dailyWeight: number;
  monthlyQuantity: number;
}

interface PaginatedResult<T> {
  data: T[];
}

const WEEK_LABELS = ['W1', 'W2', 'W3', 'W4', 'W5'];
const REGION_ORDER = ['caracas', 'oriente', 'centro', 'occidente'];

@Injectable({ providedIn: 'root' })
export class MonthlySalesDistributionService {
  private readonly http = inject(HttpClient);
  private readonly regionService = inject(RegionService);
  private readonly branchService = inject(BranchService);
  private readonly productService = inject(ProductService);
  private readonly toast = inject(ToastService);
  private readonly weeklyUrl = `${environment.apiUrl}/weekly-sales-distribution`;
  private readonly monthlyUrl = `${environment.apiUrl}/monthly-sales-distribution`;

  readonly regions = this.regionService.items;

  readonly selectedRegionId = signal<string | null>(null);
  readonly branches = computed(() =>
    this.branchService
      .items()
      .filter((b) => b.regionId === this.selectedRegionId())
      .sort((a, b) => a.name.localeCompare(b.name)),
  );

  readonly month = signal(new Date().getMonth() + 1);
  readonly year = signal(new Date().getFullYear());

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);
  readonly justSaved = signal(false);
  private savedPulseTimeout: ReturnType<typeof setTimeout> | null = null;

  private readonly weeklyRows = signal<WeeklyRow[]>([]);
  private readonly monthlyRows = signal<MonthlyRow[]>([]);

  readonly loadingAllRegions = signal(false);
  private readonly allWeeklyRows = signal<WeeklyRow[]>([]);
  private readonly allMonthlyRows = signal<MonthlyRow[]>([]);

  readonly calendarWeeks = computed<CalendarWeek[]>(() => computeCalendarWeeks(this.month(), this.year()));

  readonly branchTables = computed<MonthlyBranchTable[]>(() => {
    const branches = this.branches();
    if (branches.length === 0) return [];

    const products = sortByBrandOrder(this.productService.items(), (p) => p.name);
    const weeks = this.calendarWeeks();
    const weekly = this.weeklyRows().filter((r) => r.month === this.month() && r.year === this.year());
    const monthly = this.monthlyRows();

    return branches.map((branch) => this.buildBranchTable(branch.branchId, branch.name, products, weeks, weekly, monthly));
  });

  /** Client-side sum of every branch's table in the current region — nothing is
   * fetched or persisted here beyond the per-branch rows already loaded above. */
  readonly TOTAL_ID = '__TOTAL__';
  readonly regionTotalTable = computed<MonthlyBranchTable | null>(() => {
    const tables = this.branchTables();
    if (tables.length === 0) return null;

    const regionName = this.regions().find((r) => r.regionId === this.selectedRegionId())?.name ?? '';
    const weeks = this.calendarWeeks();

    const brandRows: MonthlyBrandRow[] = tables[0].brandRows.map((row) => {
      const cells: MonthlyBrandRow['cells'] = {};
      let total = 0;

      weeks.forEach((_week, weekIndex) => {
        DAY_ORDER.forEach((day) => {
          const key = `${weekIndex}-${day}`;
          const quantity = tables.reduce(
            (sum, t) => sum + (t.brandRows.find((r) => r.productId === row.productId)?.cells[key]?.quantity ?? 0),
            0,
          );
          cells[key] = { quantity, dailyWeight: 0 };
          total += quantity;
        });
      });

      return { productId: row.productId, brand: row.brand, cells, total };
    });

    const weekTotals: Record<string, number> = {};
    weeks.forEach((_week, weekIndex) => {
      DAY_ORDER.forEach((day) => {
        const key = `${weekIndex}-${day}`;
        weekTotals[key] = tables.reduce((sum, t) => sum + (t.weekTotals[key] ?? 0), 0);
      });
    });

    const weekSubtotals = weeks.map((_week, weekIndex) => tables.reduce((sum, t) => sum + t.weekSubtotals[weekIndex], 0));
    const grandTotal = weekSubtotals.reduce((s, v) => s + v, 0);
    const dayWeights: Record<string, number> = {};

    return {
      branchId: this.TOTAL_ID,
      branchName: regionName ? `Total ${regionName}` : 'Total',
      weeks,
      brandRows,
      weekTotals,
      dayWeights,
      weekSubtotals,
      grandTotal,
    };
  });

  /** Every region's branch tables for the current month/year, read-only — used by
   * the cross-region export view. Loaded separately from the single-region flow above. */
  readonly regionReports = computed<{ regionId: string; regionName: string; branchTables: MonthlyBranchTable[] }[]>(() => {
    const regions = this.regions();
    if (regions.length === 0) return [];

    const products = sortByBrandOrder(this.productService.items(), (p) => p.name);
    const weeks = this.calendarWeeks();
    const weekly = this.allWeeklyRows().filter((r) => r.month === this.month() && r.year === this.year());
    const monthly = this.allMonthlyRows();
    const branches = this.branchService.items();

    return regions
      .slice()
      .sort((a, b) => {
        const ai = REGION_ORDER.indexOf(a.name.toLowerCase());
        const bi = REGION_ORDER.indexOf(b.name.toLowerCase());
        if (ai === -1 && bi === -1) return a.name.localeCompare(b.name);
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
      })
      .map((region) => {
        const regionBranches = branches
          .filter((b) => b.regionId === region.regionId)
          .sort((a, b) => a.name.localeCompare(b.name));
        const branchTables = regionBranches.map((b) =>
          this.buildBranchTable(b.branchId, b.name, products, weeks, weekly, monthly),
        );
        return { regionId: region.regionId, regionName: region.name, branchTables };
      })
      .filter((r) => r.branchTables.length > 0);
  });

  loadAllRegions(): void {
    this.regionService.load();
    this.branchService.load();
    this.productService.load();
    this.loadingAllRegions.set(true);

    forkJoin({
      weekly: this.http.get<PaginatedResult<WeeklyRow>>(this.weeklyUrl, { params: { limit: '5000' } }),
      monthly: this.http.get<PaginatedResult<MonthlyRow>>(this.monthlyUrl, { params: { limit: '20000' } }),
    }).subscribe({
      next: ({ weekly, monthly }) => {
        this.allWeeklyRows.set(weekly.data);
        this.allMonthlyRows.set(monthly.data);
        this.loadingAllRegions.set(false);
      },
      error: () => this.loadingAllRegions.set(false),
    });
  }

  private buildBranchTable(
    branchId: string,
    branchName: string,
    products: { productId: string; name: string }[],
    weeks: CalendarWeek[],
    weekly: WeeklyRow[],
    monthly: MonthlyRow[],
  ): MonthlyBranchTable {
    const brandRows: MonthlyBrandRow[] = products.map((p) => {
      const cells: MonthlyBrandRow['cells'] = {};
      let total = 0;

      weeks.forEach((week, weekIndex) => {
        const weekLabel = WEEK_LABELS[weekIndex];
        const weeklyRow = weekly.find((r) => r.branchId === branchId && r.productId === p.productId && r.workingWeeks === weekLabel);

        DAY_ORDER.forEach((day) => {
          const key = `${weekIndex}-${day}`;
          const monthlyRow = weeklyRow
            ? monthly.find((r) => r.weeklySalesDistributionId === weeklyRow.weeklySalesDistributionId && r.dayOfWeek === day)
            : undefined;
          const quantity = monthlyRow?.monthlyQuantity ?? 0;
          cells[key] = { quantity, dailyWeight: monthlyRow?.dailyWeight ?? 0 };
          total += quantity;
        });
      });

      return { productId: p.productId, brand: p.name, cells, total };
    });

    const weekTotals: Record<string, number> = {};
    weeks.forEach((week, weekIndex) => {
      DAY_ORDER.forEach((day) => {
        const key = `${weekIndex}-${day}`;
        weekTotals[key] = brandRows.reduce((sum, row) => sum + (row.cells[key]?.quantity ?? 0), 0);
      });
    });

    const weekSubtotals = weeks.map((week, weekIndex) =>
      DAY_ORDER.reduce((sum, day) => sum + (weekTotals[`${weekIndex}-${day}`] ?? 0), 0),
    );
    const grandTotal = weekSubtotals.reduce((s, v) => s + v, 0);

    const dayWeights: Record<string, number> = {};
    weeks.forEach((_week, weekIndex) => {
      const weekLabel = WEEK_LABELS[weekIndex];
      DAY_ORDER.forEach((day) => {
        const key = `${weekIndex}-${day}`;
        const anyWeeklyRow = weekly.find((r) => r.branchId === branchId && r.workingWeeks === weekLabel);
        const monthlyRow = anyWeeklyRow
          ? monthly.find((r) => r.weeklySalesDistributionId === anyWeeklyRow.weeklySalesDistributionId && r.dayOfWeek === day)
          : undefined;
        dayWeights[key] = monthlyRow?.dailyWeight ?? 0;
      });
    });

    return { branchId, branchName, weeks, brandRows, weekTotals, dayWeights, weekSubtotals, grandTotal };
  }

  loadRegions(): void {
    this.regionService.load();
    this.branchService.load();
    this.productService.load();
  }

  setMonth(month: number): void {
    this.month.set(month);
  }

  setYear(year: number): void {
    this.year.set(year);
  }

  selectRegion(regionId: string): void {
    this.selectedRegionId.set(regionId);
    this.weeklyRows.set([]);
    this.monthlyRows.set([]);
    this.loading.set(true);

    forkJoin({
      weekly: this.http.get<PaginatedResult<WeeklyRow>>(this.weeklyUrl, { params: { limit: '2000' } }),
      monthly: this.http.get<PaginatedResult<MonthlyRow>>(this.monthlyUrl, { params: { limit: '5000' } }),
    }).subscribe({
      next: ({ weekly, monthly }) => {
        const branchIds = new Set(this.branches().map((b) => b.branchId));
        this.weeklyRows.set(weekly.data.filter((r) => branchIds.has(r.branchId)));
        this.monthlyRows.set(monthly.data.filter((r) => branchIds.has(r.branchId)));
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  /** Updates the Mon-Fri weight split for one calendar day, applied to every product
   * in the branch that already has a Weekly Distribution row for that week. */
  updateDailyWeight(branchId: string, weekIndex: number, day: DayOfWeek, percent: number): void {
    const weekLabel = WEEK_LABELS[weekIndex];
    const weeklyRowsForWeek = this.weeklyRows().filter(
      (r) => r.branchId === branchId && r.workingWeeks === weekLabel && r.month === this.month() && r.year === this.year(),
    );

    if (weeklyRowsForWeek.length === 0) {
      this.saveError.set(
        `Configura primero la Distribución Semanal de ${weekLabel} para esta sucursal antes de repartir sus días.`,
      );
      return;
    }

    this.saving.set(true);
    this.saveError.set(null);
    const value = percent / 100;

    const calls: Observable<MonthlyRow>[] = weeklyRowsForWeek.map((weeklyRow) => {
      const existing = this.monthlyRows().find(
        (r) => r.weeklySalesDistributionId === weeklyRow.weeklySalesDistributionId && r.dayOfWeek === day,
      );

      return existing
        ? this.http.patch<MonthlyRow>(`${this.monthlyUrl}/${existing.monthlySalesDistributionId}`, { dailyWeight: value })
        : this.http.post<MonthlyRow>(this.monthlyUrl, {
            branchId,
            productId: weeklyRow.productId,
            weeklySalesDistributionId: weeklyRow.weeklySalesDistributionId,
            dayOfWeek: day,
            dailyWeight: value,
            month: this.month(),
            year: this.year(),
          });
    });

    const branchName = this.branchService.items().find((b) => b.branchId === branchId)?.name;
    const dayLabel = DAY_LABELS_ES[day] ?? day;

    forkJoin(calls).subscribe({
      next: (rows) => {
        this.monthlyRows.update((current) => {
          const next = [...current];
          for (const row of rows) {
            const idx = next.findIndex((r) => r.monthlySalesDistributionId === row.monthlySalesDistributionId);
            if (idx >= 0) next[idx] = row;
            else next.push(row);
          }
          return next;
        });
        this.saving.set(false);
        this.pulseSaved();
        this.toast.success(
          '¡Distribución actualizada!',
          branchName ? `${dayLabel} de ${branchName} quedó al ${(value * 100).toFixed(0)}%.` : undefined,
        );
      },
      error: () => {
        this.saving.set(false);
        const message = 'Verifica tu conexión e intenta de nuevo.';
        this.saveError.set(`No se pudo guardar la distribución diaria. ${message}`);
        this.toast.error('No pudimos guardar tu distribución mensual', message);
      },
    });
  }

  private pulseSaved(): void {
    this.justSaved.set(true);
    if (this.savedPulseTimeout) clearTimeout(this.savedPulseTimeout);
    this.savedPulseTimeout = setTimeout(() => this.justSaved.set(false), 2200);
  }
}
