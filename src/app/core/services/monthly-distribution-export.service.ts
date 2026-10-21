import { Injectable, inject } from '@angular/core';
import ExcelJS from 'exceljs';
import { CalendarWeek, DAY_ORDER, MonthlyBranchTable } from '../models/monthly-sales-distribution.model';
import { ProductService } from './product.service';

export interface RegionReport {
  regionId: string;
  regionName: string;
  branchTables: MonthlyBranchTable[];
}

const FIXED_COLS = ['Producto', 'Descripción', 'Sucursal'];

/** Thousands-separated; zero renders as "-" instead of "0" (like an IFERROR blank). */
const NUMBER_FORMAT = '#,##0;-#,##0;"-"';

const NAVY = 'FF0B1F45';
const GROUP_BLUE = 'FF17406F';
const LIGHT_BLUE = 'FFE7EDF5';
const WHITE = 'FFFFFFFF';

function weekProductSubtotal(table: MonthlyBranchTable, productId: string, weekIndex: number): number {
  return DAY_ORDER.reduce(
    (sum, day) => sum + (table.brandRows.find((r) => r.productId === productId)?.cells[`${weekIndex}-${day}`]?.quantity ?? 0),
    0,
  );
}

function formatDate(date: Date): string {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${d}/${m}/${date.getFullYear()}`;
}

@Injectable({ providedIn: 'root' })
export class MonthlyDistributionExportService {
  private readonly productService = inject(ProductService);

  async export(reports: RegionReport[], weeks: CalendarWeek[], month: number, year: number): Promise<void> {
    const products = this.productService.items();
    const descriptionByProduct = new Map(products.map((p) => [p.productId, p.description]));

    const groupRow: (string | number)[] = [...FIXED_COLS.map(() => '')];
    const headerRow: (string | number)[] = [...FIXED_COLS];
    const weekColStart: number[] = [];

    weeks.forEach((week, weekIndex) => {
      weekColStart.push(headerRow.length);
      groupRow.push(`${weekIndex + 1}ª SEMANA`, ...week.days.slice(1).map(() => ''), '');
      week.days.forEach((day) => headerRow.push(formatDate(day.date)));
      headerRow.push('TOTAL SEM');
    });

    groupRow.push('');
    headerRow.push('TOTAL MES');
    const totalCols = headerRow.length;

    const dataRows: (string | number)[][] = [];
    for (const region of reports) {
      for (const table of region.branchTables) {
        for (const row of table.brandRows) {
          const line: (string | number)[] = [row.brand, descriptionByProduct.get(row.productId) ?? '', table.branchName];

          weeks.forEach((week, weekIndex) => {
            week.days.forEach((day) => line.push(row.cells[`${weekIndex}-${day.dayOfWeek}`]?.quantity ?? 0));
            line.push(weekProductSubtotal(table, row.productId, weekIndex));
          });

          line.push(row.total);
          dataRows.push(line);
        }
      }
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Consolidado');

    sheet.addRow(groupRow);
    sheet.addRow(headerRow);

    for (const [rowNumber, bg] of [[1, GROUP_BLUE] as const, [2, NAVY] as const]) {
      const row = sheet.getRow(rowNumber);
      row.height = 22;
      for (let c = 1; c <= totalCols; c++) {
        const cell = row.getCell(c);
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
        cell.font = { color: { argb: WHITE }, bold: true };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      }
    }

    weekColStart.forEach((startCol, weekIndex) => {
      const first = startCol + 1;
      const last = first + weeks[weekIndex].days.length;
      sheet.mergeCells(1, first, 1, last);
    });

    dataRows.forEach((line, ri) => {
      const row = sheet.addRow(line);
      for (let c = 1; c <= totalCols; c++) {
        const cell = row.getCell(c);
        if (c > FIXED_COLS.length) cell.numFmt = NUMBER_FORMAT;
        if (ri % 2 === 1) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT_BLUE } };
        }
      }
    });

    // Box in every "TOTAL SEM" / "TOTAL MES" column with thick borders on both sides, marking off week blocks.
    const lastRow = 2 + dataRows.length;
    const weekSeparatorCols = [...weekColStart.map((startCol, i) => startCol + weeks[i].days.length + 1), totalCols];
    for (const col of weekSeparatorCols) {
      for (let r = 1; r <= lastRow; r++) {
        const cell = sheet.getRow(r).getCell(col);
        cell.border = {
          ...cell.border,
          left: { style: 'medium', color: { argb: NAVY } },
          right: { style: 'medium', color: { argb: NAVY } },
        };
      }
    }
    for (let r = 1; r <= lastRow; r++) {
      const cell = sheet.getRow(r).getCell(FIXED_COLS.length);
      cell.border = { ...cell.border, right: { style: 'medium', color: { argb: NAVY } } };
    }
    for (let c = 1; c <= totalCols; c++) {
      const cell = sheet.getRow(2).getCell(c);
      cell.border = { ...cell.border, bottom: { style: 'medium', color: { argb: NAVY } } };
    }

    sheet.getColumn(1).width = 22;
    sheet.getColumn(2).width = 30;
    sheet.getColumn(3).width = 18;
    for (let c = FIXED_COLS.length + 1; c <= totalCols; c++) {
      sheet.getColumn(c).width = 11;
    }

    sheet.views = [{ state: 'frozen', xSplit: FIXED_COLS.length, ySplit: 2 }];

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Consolidado_Demanda_${String(month).padStart(2, '0')}_${year}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  }
}
