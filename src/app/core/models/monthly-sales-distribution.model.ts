export const DAY_LABELS_ES: Record<string, string> = {
  MONDAY: 'Lunes',
  TUESDAY: 'Martes',
  WEDNESDAY: 'Miércoles',
  THURSDAY: 'Jueves',
  FRIDAY: 'Viernes',
};

export const DAY_ORDER = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'] as const;
export type DayOfWeek = (typeof DAY_ORDER)[number];

export interface CalendarDay {
  date: Date;
  dayOfWeek: DayOfWeek;
  weekIndex: number; // 0-4 -> W1-W5
}

export interface CalendarWeek {
  label: string; // W1..W5
  days: CalendarDay[];
}

export interface MonthlyCell {
  quantity: number;
  dailyWeight: number; // fraction 0-1
}

export interface MonthlyBrandRow {
  productId: string;
  brand: string;
  // keyed by "weekIndex-dayOfWeek" e.g. "0-MONDAY"
  cells: Record<string, MonthlyCell>;
  total: number;
}

export interface MonthlyBranchTable {
  branchId: string;
  branchName: string;
  weeks: CalendarWeek[];
  brandRows: MonthlyBrandRow[];
  weekTotals: Record<string, number>; // keyed by "weekIndex-dayOfWeek" -> total across brands
  dayWeights: Record<string, number>; // keyed by "weekIndex-dayOfWeek" -> shared % applied to all SKUs
  weekSubtotals: number[]; // total per week (5)
  grandTotal: number;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Builds 5 business-day "fiscal weeks" starting on the 1st of the month.
 * Week 1 runs from day 1 through that calendar week's Friday (so it can be
 * shorter than 5 days); weeks 2-5 are always full Monday-Friday spans and
 * may spill into the next month, mirroring the source spreadsheet.
 */
export function computeCalendarWeeks(month: number, year: number): CalendarWeek[] {
  const first = new Date(year, month - 1, 1);
  const dow = first.getDay(); // 0=Sun..6=Sat
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  const weekMonday = addDays(first, mondayOffset);
  const day1IsWeekend = dow === 0 || dow === 6;

  const weeks: CalendarWeek[] = [];
  let mondayCursor = day1IsWeekend ? addDays(weekMonday, 7) : weekMonday;

  for (let w = 0; w < 5; w++) {
    const friday = addDays(mondayCursor, 4);
    const rangeStart = w === 0 && !day1IsWeekend ? first : mondayCursor;
    const days: CalendarDay[] = [];
    for (let d = new Date(rangeStart); d <= friday; d = addDays(d, 1)) {
      const wd = d.getDay();
      if (wd >= 1 && wd <= 5) {
        days.push({ date: new Date(d), dayOfWeek: DAY_ORDER[wd - 1], weekIndex: w });
      }
    }
    weeks.push({ label: `W${w + 1}`, days });
    mondayCursor = addDays(mondayCursor, 7);
  }

  return weeks;
}
