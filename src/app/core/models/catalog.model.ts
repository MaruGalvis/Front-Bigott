export type PackType = 'pack_of_10' | 'pack_of_20';

export const PACK_TYPE_OPTIONS: { value: PackType; label: string }[] = [
  { value: 'pack_of_10', label: 'Cajetilla de 10' },
  { value: 'pack_of_20', label: 'Cajetilla de 20' },
];

export interface Product {
  productId: string;
  name: string;
  description: string;
  type: PackType;
  isActive: boolean;
}

export interface Region {
  regionId: string;
  name: string;
  isActive: boolean;
}

export interface Branch {
  branchId: string;
  name: string;
  regionId: string;
  region?: Region;
  isActive: boolean;
}
