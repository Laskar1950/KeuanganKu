const SALARY_CYCLE_START_DAY = 25;

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const MONTH_LONG = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

function toLocalDate(value = new Date()) {
  if (value instanceof Date) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  if (typeof value === 'string') {
    const [datePart] = value.split('T');
    const [year, month, day] = datePart.split('-').map(Number);
    if (year && month && day) return new Date(year, month - 1, day);
  }

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  }

  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), today.getDate());
}

function createDate(year, month, day) {
  return new Date(Number(year), Number(month) - 1, Number(day));
}

function addMonths(year, month, amount) {
  const date = new Date(Number(year), Number(month) - 1 + Number(amount || 0), 1);
  return {
    month: date.getMonth() + 1,
    year: date.getFullYear(),
  };
}

function toDateKey(date) {
  const normalized = toLocalDate(date);
  const year = normalized.getFullYear();
  const month = String(normalized.getMonth() + 1).padStart(2, '0');
  const day = String(normalized.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeCycleArg(monthOrCycle, year) {
  if (monthOrCycle && typeof monthOrCycle === 'object') {
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

  return getCurrentBudgetCycle();
}

export function getBudgetCycle(dateValue = new Date()) {
  const date = toLocalDate(dateValue);
  let month = date.getMonth() + 1;
  let year = date.getFullYear();

  if (date.getDate() < SALARY_CYCLE_START_DAY) {
    const previous = addMonths(year, month, -1);
    month = previous.month;
    year = previous.year;
  }

  return getBudgetCycleRange(month, year);
}

export function getCurrentBudgetCycle(dateValue = new Date()) {
  return getBudgetCycle(dateValue);
}

export function getBudgetCyclePeriod(dateValue = new Date()) {
  return getBudgetCycle(dateValue);
}

export function getBudgetCycleRange(monthOrCycle, year) {
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

export function isDateInBudgetCycle(dateValue, monthOrCycle, year) {
  if (!dateValue) return false;

  const cycle = getBudgetCycleRange(monthOrCycle, year);
  const dateKey = toDateKey(dateValue);

  return dateKey >= cycle.startKey && dateKey <= cycle.endKey;
}

export function getBudgetCycleTransactions(transactions = [], monthOrCycle, year) {
  const cycle = getBudgetCycleRange(monthOrCycle, year);

  return (transactions || []).filter((transaction) => {
    const dateValue = transaction?.transactionDate || transaction?.transaction_date || transaction?.date;
    return isDateInBudgetCycle(dateValue, cycle);
  });
}

export function getBudgetCycleLabel(monthOrCycle, year) {
  const cycle = getBudgetCycleRange(monthOrCycle, year);
  const startMonth = MONTH_LONG[cycle.startDate.getMonth()];
  const endMonth = MONTH_LONG[cycle.endDate.getMonth()];

  return `${SALARY_CYCLE_START_DAY} ${startMonth} ${cycle.startDate.getFullYear()} - ${SALARY_CYCLE_START_DAY - 1} ${endMonth} ${cycle.endDate.getFullYear()}`;
}

export function getBudgetCycleShortLabel(monthOrCycle, year) {
  const cycle = getBudgetCycleRange(monthOrCycle, year);
  const startMonth = MONTH_SHORT[cycle.startDate.getMonth()];
  const endMonth = MONTH_SHORT[cycle.endDate.getMonth()];
  const startYear = cycle.startDate.getFullYear();
  const endYear = cycle.endDate.getFullYear();

  return startYear === endYear
    ? `${startMonth}-${endMonth} ${startYear}`
    : `${startMonth} ${startYear}-${endMonth} ${endYear}`;
}

export function formatBudgetCycleRange(monthOrCycle, year) {
  return getBudgetCycleLabel(monthOrCycle, year);
}

export function formatBudgetCycleLabel(monthOrCycle, year) {
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
