export interface WeekMeta {
  label: string;
  weightPercent: number;
  days: number;
}

export interface BrandRow {
  productId: string;
  brand: string;
  values: number[];
  dsaSop: number;
}

export interface SiteBlock {
  branchId: string;
  site: string;
  weeks: WeekMeta[];
  brands: BrandRow[];
}

export interface RegionGroup {
  regionId: string;
  region: string;
  sites: SiteBlock[];
}

export interface BrandComputed extends BrandRow {
  sop: number;
}

export interface SiteComputed extends SiteBlock {
  brandRows: BrandComputed[];
  totalRow: BrandComputed;
  totalDays: number;
}

export interface RegionComputed {
  region: string;
  sites: SiteComputed[];
  summary: SiteComputed;
}

export const WEEK_LABELS: readonly string[] = ['W1', 'W2', 'W3', 'W4', 'W5'];
