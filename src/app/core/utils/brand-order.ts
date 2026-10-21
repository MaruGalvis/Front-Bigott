const BRAND_ORDER = [
  'Belmont 20',
  'Belmont 10',
  'Pall Mall',
  'Lucky Strike Red',
  'Lucky Strike Nova',
  'Lucky Strike Eclipse',
  'Lucky Strike Cosmic',
  'Viceroy',
  'Universal',
  'Consul',
];

export function sortByBrandOrder<T>(items: T[], nameOf: (item: T) => string): T[] {
  return [...items].sort((a, b) => {
    const indexA = BRAND_ORDER.indexOf(nameOf(a));
    const indexB = BRAND_ORDER.indexOf(nameOf(b));
    if (indexA === -1 && indexB === -1) return nameOf(a).localeCompare(nameOf(b));
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });
}
