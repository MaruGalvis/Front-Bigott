export interface SalesTargetRow {
  brand: string;
  values: number[];
  sop: number;
  children: SalesTargetRow[];
}

export interface SalesTargetGrid {
  regions: string[];
  rows: SalesTargetRow[];
  totalValues: number[];
  totalSop: number;
  uploadedAt: string;
  fileName: string;
}

export interface ImportSalesTargetSummary {
  rowsImported: number;
  skippedLabels: string[];
}
