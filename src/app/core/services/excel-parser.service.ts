import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import { SalesTargetGrid, SalesTargetRow } from '../models/sales-target.model';

function toNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const cleaned = value.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '');
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function isTotalLabel(label: string): boolean {
  return label.trim().toLowerCase() === 'total';
}

function valuesEqual(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((v, i) => Math.abs(v - b[i]) < 0.5);
}

function sumRows(rows: { values: number[] }[], regionCount: number): number[] {
  const sums = new Array(regionCount).fill(0);
  for (const row of rows) {
    row.values.forEach((v, i) => (sums[i] += v));
  }
  return sums;
}

/** Groups a flat list of rows into parent/children using the "parent value = sum of the
 * following rows" pattern that this workbook's brand-family rows follow. */
function groupRows(flat: { brand: string; values: number[]; sop: number }[], regionCount: number): SalesTargetRow[] {
  const result: SalesTargetRow[] = [];
  let i = 0;
  while (i < flat.length) {
    const candidate = flat[i];
    let matchedChildren: typeof flat | null = null;

    for (let lookahead = 1; i + lookahead <= flat.length && lookahead <= 6; lookahead++) {
      const slice = flat.slice(i + 1, i + 1 + lookahead);
      if (slice.length === 0) break;
      if (valuesEqual(sumRows(slice, regionCount), candidate.values)) {
        matchedChildren = slice;
        break;
      }
    }

    if (matchedChildren) {
      result.push({ ...candidate, children: matchedChildren.map((c) => ({ ...c, children: [] })) });
      i += 1 + matchedChildren.length;
    } else {
      result.push({ ...candidate, children: [] });
      i += 1;
    }
  }
  return result;
}

@Injectable({ providedIn: 'root' })
export class ExcelParserService {
  async parseSalesTarget(file: File): Promise<SalesTargetGrid> {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });

    if (!rawRows.length) {
      throw new Error('The file is empty.');
    }

    const [headerRow, ...dataRows] = rawRows;
    const regions = headerRow.slice(1, -1).map((h) => String(h).trim());
    const regionCount = regions.length;

    const flat: { brand: string; values: number[]; sop: number }[] = [];
    let totalValues: number[] = new Array(regionCount).fill(0);
    let totalSop = 0;

    for (const row of dataRows) {
      const brand = String(row[0] ?? '').trim();
      if (!brand) continue;

      const values = row.slice(1, 1 + regionCount).map(toNumber);
      const sop = toNumber(row[1 + regionCount]);

      if (isTotalLabel(brand)) {
        totalValues = values;
        totalSop = sop;
        continue;
      }
      flat.push({ brand, values, sop });
    }

    if (!flat.length) {
      throw new Error('No brand rows were recognized in the file.');
    }

    const rows = groupRows(flat, regionCount);

    if (!totalValues.some((v) => v > 0)) {
      totalValues = sumRows(rows, regionCount);
      totalSop = totalValues.reduce((s, v) => s + v, 0);
    }

    return {
      regions,
      rows,
      totalValues,
      totalSop,
      uploadedAt: new Date().toISOString(),
      fileName: file.name,
    };
  }
}
