// Utility siklus budget KeuanganKu.
// Konsep: budget/alokasi reset setiap tanggal 25.
// Periode 06/2026 berarti 25 Jun 2026 sampai 24 Jul 2026.

export const BUDGET_CYCLE_START_DAY = 25;

export const MONTH_OPTIONS = Array.from({ length: 12 }, (_, index) => ({
  value: index + 1,
  label: String(index + 1).padStart(2, '0'),
  name: new Intl.DateTimeFormat('id-ID', { month: 'long' }).format(new Date(2026, index, 1)),
}));

export const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

export const pad2 = (value) => String(value).padStart(2, '0');

export const formatDateInput = (date) => {
  const year = date.getFullYear();
  const month = pad2(date.getMonth() + 1);
  const day = pad2(date.getDate());
  return `${year}-${month}-${day}`;
};

export const parseDateInput = (value) => {
  if (value instanceof Date) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  if (!value) {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), today.getDate());
  }

  const [year, month, day] = String(value).slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
    }

    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), today.getDate());
  }

  return new Date(year, month - 1, day);
};

export const getMonthName = (month) => {
  const safeMonth = Math.min(Math.max(toNumber(month, 1), 1), 12);
  return new Intl.DateTimeFormat('id-ID', { month: 'long' }).format(new Date(2026, safeMonth - 1, 1));
};

export const normalizeBudgetMonthYear = (month, year) => {
  let normalizedMonth = toNumber(month, new Date().getMonth() + 1);
  let normalizedYear = toNumber(year, new Date().getFullYear());

  while (normalizedMonth < 1) {
    normalizedMonth += 12;
    normalizedYear -= 1;
  }

  while (normalizedMonth > 12) {
    normalizedMonth -= 12;
    normalizedYear += 1;
  }

  return { month: normalizedMonth, year: normalizedYear };
};

export const getBudgetCycleBounds = (month, year, startDay = BUDGET_CYCLE_START_DAY) => {
  const normalized = normalizeBudgetMonthYear(month, year);
  const startDateObj = new Date(normalized.year, normalized.month - 1, startDay);
  const endDateObj = new Date(normalized.year, normalized.month, startDay - 1);

  return {
    month: normalized.month,
    year: normalized.year,
    startDay,
    startDate: formatDateInput(startDateObj),
    endDate: formatDateInput(endDateObj),
    startDateObj,
    endDateObj,
  };
};

export const getBudgetCycle = (dateValue = new Date(), startDay = BUDGET_CYCLE_START_DAY) => {
  const date = parseDateInput(dateValue);
  let month = date.getMonth() + 1;
  let year = date.getFullYear();

  // Tanggal 1-24 masih masuk siklus bulan sebelumnya.
  // Contoh: 20 Jul 2026 masuk periode 06/2026 (25 Jun - 24 Jul).
  if (date.getDate() < startDay) {
    month -= 1;
    if (month < 1) {
      month = 12;
      year -= 1;
    }
  }

  return getBudgetCycleBounds(month, year, startDay);
};

export const getCurrentBudgetCycle = (startDay = BUDGET_CYCLE_START_DAY) => {
  return getBudgetCycle(new Date(), startDay);
};

export const isDateInBudgetCycle = (dateValue, month, year, startDay = BUDGET_CYCLE_START_DAY) => {
  const date = parseDateInput(dateValue);
  const cycle = getBudgetCycleBounds(month, year, startDay);
  return date >= cycle.startDateObj && date <= cycle.endDateObj;
};

export const getBudgetCycleTransactions = (
  transactions = [],
  monthOrCycle,
  year,
  startDay = BUDGET_CYCLE_START_DAY
) => {
  const cycle =
    typeof monthOrCycle === 'object' && monthOrCycle !== null
      ? getBudgetCycleBounds(monthOrCycle.month, monthOrCycle.year, monthOrCycle.startDay || startDay)
      : getBudgetCycleBounds(monthOrCycle, year, startDay);

  return transactions.filter((transaction) => {
    const dateValue =
      transaction?.transactionDate ||
      transaction?.transaction_date ||
      transaction?.date ||
      transaction?.createdAt ||
      transaction?.created_at;

    if (!dateValue) return false;
    return isDateInBudgetCycle(dateValue, cycle.month, cycle.year, cycle.startDay);
  });
};

export const filterBudgetsByCycle = (budgets = [], month, year) => {
  const normalized = normalizeBudgetMonthYear(month, year);
  return budgets.filter(
    (budget) => Number(budget?.month) === normalized.month && Number(budget?.year) === normalized.year
  );
};

export const formatShortDate = (dateValue) => {
  const date = parseDateInput(dateValue);
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
};

export const formatBudgetCycleRange = (monthOrCycle, year, startDay = BUDGET_CYCLE_START_DAY) => {
  const cycle =
    typeof monthOrCycle === 'object' && monthOrCycle !== null
      ? getBudgetCycleBounds(monthOrCycle.month, monthOrCycle.year, monthOrCycle.startDay || startDay)
      : getBudgetCycleBounds(monthOrCycle, year, startDay);

  return `${formatShortDate(cycle.startDate)} - ${formatShortDate(cycle.endDate)}`;
};

export const formatBudgetCycleLabel = (monthOrCycle, year) => {
  const normalized =
    typeof monthOrCycle === 'object' && monthOrCycle !== null
      ? normalizeBudgetMonthYear(monthOrCycle.month, monthOrCycle.year)
      : normalizeBudgetMonthYear(monthOrCycle, year);

  return `${getMonthName(normalized.month)} ${normalized.year}`;
};

export const getPreviousBudgetCycle = (month, year) => {
  const normalized = normalizeBudgetMonthYear(month - 1, year);
  return getBudgetCycleBounds(normalized.month, normalized.year);
};

export const getNextBudgetCycle = (month, year) => {
  const normalized = normalizeBudgetMonthYear(month + 1, year);
  return getBudgetCycleBounds(normalized.month, normalized.year);
};

export default {
  BUDGET_CYCLE_START_DAY,
  MONTH_OPTIONS,
  getBudgetCycle,
  getCurrentBudgetCycle,
  getBudgetCycleBounds,
  getBudgetCycleTransactions,
  isDateInBudgetCycle,
  filterBudgetsByCycle,
  formatBudgetCycleRange,
  formatBudgetCycleLabel,
  getPreviousBudgetCycle,
  getNextBudgetCycle,
};
