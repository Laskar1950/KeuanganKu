import type { Transaction } from "@/types";

const SALARY_CYCLE_START_DAY = 25;

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const MONTH_LONG = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

export interface BudgetCycle {
  month: number;
  year: number;
}

export interface BudgetCycleRange extends BudgetCycle {
  startDate: Date;
  endDate: Date;
  startKey: string;
  endKey: string;
}

function toLocalDate(value: Date | string = new Date()): Date {
  if (value instanceof Date) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  if (typeof value === "string") {
    const [datePart] = value.split("T");
    const [year, month, day] = datePart.split("-").map(Number);
    if (year && month && day) return new Date(year, month - 1, day);
  }

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  }

  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), today.getDate());
}

function createDate(year: number, month: number, day: number): Date {
  return new Date(Number(year), Number(month) - 1, Number(day));
}

function addMonths(year: number, month: number, amount: number): BudgetCycle {
  const date = new Date(Number(year), Number(month) - 1 + Number(amount || 0), 1);
  return {
    month: date.getMonth() + 1,
    year: date.getFullYear(),
  };
}

function toDateKey(date: Date | string): string {
  const normalized = toLocalDate(date);
  const year = normalized.getFullYear();
  const month = String(normalized.getMonth() + 1).padStart(2, "0");
  const day = String(normalized.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getCycleMonthYearFromDate(dateValue: Date | string = new Date()): BudgetCycle {
  const date = toLocalDate(dateValue);
  let month = date.getMonth() + 1;
  let year = date.getFullYear();

  if (date.getDate() < SALARY_CYCLE_START_DAY) {
    const previous = addMonths(year, month, -1);
    month = previous.month;
    year = previous.year;
  }

  return { month, year };
}

function normalizeCycleArg(
  monthOrCycle?: number | BudgetCycle | BudgetCycleRange | null,
  year?: number
): BudgetCycle {
  if (monthOrCycle && typeof monthOrCycle === "object") {
    return {
      month: Number(monthOrCycle.month),
      year: Number(monthOrCycle.year),
    };
  }

  if (monthOrCycle && year) {
    return {
      month: Number(monthOrCycle),
      year: Number(year),
    };
  }

  return getCycleMonthYearFromDate();
}

export function getBudgetCycle(dateValue: Date | string = new Date()): BudgetCycleRange {
  const cycle = getCycleMonthYearFromDate(dateValue);
  return getBudgetCycleRange(cycle.month, cycle.year);
}

export function getCurrentBudgetCycle(dateValue: Date | string = new Date()): BudgetCycleRange {
  return getBudgetCycle(dateValue);
}

export function getBudgetCyclePeriod(dateValue: Date | string = new Date()): BudgetCycleRange {
  return getBudgetCycle(dateValue);
}

export function getBudgetCycleRange(
  monthOrCycle?: number | BudgetCycle | BudgetCycleRange | null,
  year?: number
): BudgetCycleRange {
  const cycle = normalizeCycleArg(monthOrCycle, year);
  const startDate = createDate(cycle.year, cycle.month, SALARY_CYCLE_START_DAY);
  const nextMonth = addMonths(cycle.year, cycle.month, 1);
  const endDate = createDate(nextMonth.year, nextMonth.month, SALARY_CYCLE_START_DAY - 1);

  return {
    month: cycle.month,
    year: cycle.year,
    startDate,
    endDate,
    startKey: toDateKey(startDate),
    endKey: toDateKey(endDate),
  };
}

export function isDateInBudgetCycle(
  dateValue: Date | string | undefined,
  monthOrCycle?: number | BudgetCycle | BudgetCycleRange | null,
  year?: number
): boolean {
  if (!dateValue) return false;

  const cycle = getBudgetCycleRange(monthOrCycle, year);
  const dateKey = toDateKey(dateValue);

  return dateKey >= cycle.startKey && dateKey <= cycle.endKey;
}

export function getBudgetCycleTransactions(
  transactions: Transaction[] = [],
  monthOrCycle?: number | BudgetCycle | BudgetCycleRange | null,
  year?: number
): Transaction[] {
  const cycle = getBudgetCycleRange(monthOrCycle, year);

  return (transactions || []).filter((transaction) => {
    const dateValue = transaction?.transactionDate;
    return isDateInBudgetCycle(dateValue, cycle);
  });
}

export function getBudgetCycleLabel(
  monthOrCycle?: number | BudgetCycle | BudgetCycleRange | null,
  year?: number
): string {
  const cycle = getBudgetCycleRange(monthOrCycle, year);
  const startMonth = MONTH_LONG[cycle.startDate.getMonth()];
  const endMonth = MONTH_LONG[cycle.endDate.getMonth()];

  return `${SALARY_CYCLE_START_DAY} ${startMonth} ${cycle.startDate.getFullYear()} - ${SALARY_CYCLE_START_DAY - 1} ${endMonth} ${cycle.endDate.getFullYear()}`;
}

export function getBudgetCycleShortLabel(
  monthOrCycle?: number | BudgetCycle | BudgetCycleRange | null,
  year?: number
): string {
  const cycle = getBudgetCycleRange(monthOrCycle, year);
  const startMonth = MONTH_SHORT[cycle.startDate.getMonth()];
  const endMonth = MONTH_SHORT[cycle.endDate.getMonth()];
  const startYear = cycle.startDate.getFullYear();
  const endYear = cycle.endDate.getFullYear();

  return startYear === endYear
    ? `${startMonth}-${endMonth} ${startYear}`
    : `${startMonth} ${startYear}-${endMonth} ${endYear}`;
}

export function formatBudgetCycleRange(
  monthOrCycle?: number | BudgetCycle | BudgetCycleRange | null,
  year?: number
): string {
  return getBudgetCycleLabel(monthOrCycle, year);
}

export function formatBudgetCycleLabel(
  monthOrCycle?: number | BudgetCycle | BudgetCycleRange | null,
  year?: number
): string {
  return getBudgetCycleShortLabel(monthOrCycle, year);
}

export { SALARY_CYCLE_START_DAY };

export default {
  SALARY_CYCLE_START_DAY,
  getBudgetCycle,
  getCurrentBudgetCycle,
  getBudgetCyclePeriod,
  getBudgetCycleRange,
  getBudgetCycleTransactions,
  getBudgetCycleLabel,
  getBudgetCycleShortLabel,
  formatBudgetCycleRange,
  formatBudgetCycleLabel,
  isDateInBudgetCycle,
};
