import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, forkJoin, map, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ImportSalesTargetSummary, SalesTargetGrid, SalesTargetRow } from '../models/sales-target.model';

interface PivotSalesTargetRow {
  product: string;
  values: Record<string, number>;
}

interface RegionDto {
  regionId: string;
  name: string;
  isActive: boolean;
}

interface PaginatedResult<T> {
  data: T[];
}

const CACHE_KEY = 'bigott_sales_target_grid';

@Injectable({ providedIn: 'root' })
export class SalesTargetService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  private readonly gridSignal = signal<SalesTargetGrid | null>(this.readCache());
  readonly grid = this.gridSignal.asReadonly();

  /** Loads the saved sales-target pivot for a period (month/year) and reshapes it into
   * a SalesTargetGrid, falling back to the local cache if the API call fails. */
  loadPivot(month: number, year: number): Observable<SalesTargetGrid | null> {
    return forkJoin({
      regions: this.http.get<RegionDto[] | PaginatedResult<RegionDto>>(`${this.baseUrl}/region`, {
        params: { limit: '100' },
      }),
      pivot: this.http.get<PivotSalesTargetRow[]>(`${this.baseUrl}/sales-target/pivot`, {
        params: { month: String(month), year: String(year) },
      }),
    }).pipe(
      map(({ regions, pivot }) => {
        const regionList = Array.isArray(regions) ? regions : regions.data;
        const regionNames = this.resolveRegionNames(regionList, pivot);
        return this.buildGrid(regionNames, pivot, month, year);
      }),
      tap((grid) => this.setGrid(grid)),
      catchError(() => of(this.gridSignal())),
    );
  }

  /** The most recent month/year that has any saved sales-target data, so the
   * page can default to it instead of the current calendar month. */
  getLatestPeriod(): Observable<{ month: number; year: number } | null> {
    return this.http.get<{ month: number; year: number } | null>(`${this.baseUrl}/sales-target/latest-period`);
  }

  importFile(file: File, month: number, year: number): Observable<ImportSalesTargetSummary> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('month', String(month));
    formData.append('year', String(year));
    return this.http.post<ImportSalesTargetSummary>(`${this.baseUrl}/sales-target/import`, formData);
  }

  /** The regions catalog in this environment carries stray test entries
   * (e.g. "Centro Test", "Caracas Test"). Prefer real, active regions that
   * actually have targets for this period; fall back to the clean active
   * list when the period has no data yet. */
  private resolveRegionNames(regionList: RegionDto[], pivot: PivotSalesTargetRow[]): string[] {
    const cleanNames = regionList
      .filter((r) => r.isActive && !/test|\d/i.test(r.name))
      .map((r) => r.name)
      .sort((a, b) => a.localeCompare(b));

    const pivotNames = new Set<string>();
    pivot.forEach((row) => Object.keys(row.values).forEach((name) => pivotNames.add(name)));

    if (pivotNames.size === 0) return cleanNames;
    return cleanNames.filter((name) => pivotNames.has(name));
  }

  private buildGrid(
    regionNames: string[],
    pivot: PivotSalesTargetRow[],
    month: number,
    year: number,
  ): SalesTargetGrid {
    const rows: SalesTargetRow[] = pivot
      .map((row) => {
        const values = regionNames.map((name) => row.values[name] ?? 0);
        const sop = values.reduce((sum, value) => sum + value, 0);
        return { brand: row.product, values, sop, children: [] };
      })
      .sort((a, b) => a.brand.localeCompare(b.brand));

    const totalValues = regionNames.map((_, colIndex) =>
      rows.reduce((sum, row) => sum + row.values[colIndex], 0),
    );
    const totalSop = totalValues.reduce((sum, value) => sum + value, 0);

    return {
      regions: regionNames,
      rows,
      totalValues,
      totalSop,
      uploadedAt: new Date().toISOString(),
      fileName: `${String(month).padStart(2, '0')}/${year}`,
    };
  }

  private setGrid(grid: SalesTargetGrid | null): void {
    this.gridSignal.set(grid);
    if (grid) {
      localStorage.setItem(CACHE_KEY, JSON.stringify(grid));
    }
  }

  private readCache(): SalesTargetGrid | null {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as SalesTargetGrid;
    } catch {
      return null;
    }
  }
}
