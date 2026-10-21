import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { MlGenerateResponse, MlObjectiveItem, SaveMlObjectivesSummary } from '../models/ml-forecast.model';
import { SalesTargetGrid, SalesTargetRow } from '../models/sales-target.model';

@Injectable({ providedIn: 'root' })
export class MlForecastService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  generate(): Observable<MlGenerateResponse> {
    return this.http.post<MlGenerateResponse>(`${this.baseUrl}/ml-forecast/generate`, {});
  }

  save(objetivos: MlObjectiveItem[]): Observable<SaveMlObjectivesSummary> {
    return this.http.post<SaveMlObjectivesSummary>(`${this.baseUrl}/ml-forecast/save`, { objetivos });
  }

  /** Reshapes the flat prediction list into the same grid shape used by the
   * saved sales-target table, so both views share the SalesTargetTable component. */
  buildGrid(response: MlGenerateResponse): SalesTargetGrid {
    const regionNames = Array.from(new Set(response.objetivos.map((o) => o.region))).sort((a, b) =>
      a.localeCompare(b),
    );
    const productNames = Array.from(new Set(response.objetivos.map((o) => o.product))).sort((a, b) =>
      a.localeCompare(b),
    );

    const byProduct = new Map<string, Map<string, number>>();
    for (const item of response.objetivos) {
      if (!byProduct.has(item.product)) byProduct.set(item.product, new Map());
      byProduct.get(item.product)!.set(item.region, item.predicted_target);
    }

    const rows: SalesTargetRow[] = productNames.map((product) => {
      const values = regionNames.map((region) => byProduct.get(product)?.get(region) ?? 0);
      const sop = values.reduce((sum, value) => sum + value, 0);
      return { brand: product, values, sop, children: [] };
    });

    const totalValues = regionNames.map((_, colIndex) => rows.reduce((sum, row) => sum + row.values[colIndex], 0));
    const totalSop = totalValues.reduce((sum, value) => sum + value, 0);

    return {
      regions: regionNames,
      rows,
      totalValues,
      totalSop,
      uploadedAt: new Date().toISOString(),
      fileName: response.period,
    };
  }
}
