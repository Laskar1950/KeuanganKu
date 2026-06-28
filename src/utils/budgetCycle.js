export const BUDGET_CYCLE_START_DAY = 25;

function pad(value) {
  return String(value).padStart(2, '0');
}

function parseDate(value = new Date()) {
  if (value instanceof Date) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate(), 12, 0, 0, 0);
  }

  const [year, month, day] = String(value || '').split('-').map(Number);
  if (!year || !month || !day) {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0);
  }

  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

function addMonths(month, year, delta) {
  const date = new Date(year, month - 1 + delta, 1, 12, 0, 0, 0);
  return { month: date.getMonth() + 1, year: date.getFullYear() };
}

export function getBudgetCycle(dateInput = new Date()) {
  const date = parseDate(dateInput);
  const month = date.getMonth() + 1;
  const year = date.getFullYear();

  if (date.getDate() < BUDGET_CYCLE_START_DAY) {
    return addMonths(month, year, -1);
  }

  return { month, year };
}

export function getCurrentBudgetCycle() {
  return getBudgetCycle(new Date());
}

export function getBudgetCycleRange(month, year) {
  const safeMonth = Number(month);
  const safeYear = Number(year);
  const next = addMonths(safeMonth, safeYear, 1);

  return {
    start: `${safeYear}-${pad(safeMonth)}-${BUDGET_CYCLE_START_DAY}`,
    end: `${next.year}-${pad(next.month)}-${BUDGET_CYCLE_START_DAY - 1}`,
  };
}

export function formatBudgetCycleRange(month, year) {
  const { start, end } = getBudgetCycleRange(month, year);
  const formatter = new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return `${formatter.format(parseDate(start))} - ${formatter.format(parseDate(end))}`;
}

export function formatBudgetCycleLabel(month, year) {
  return `${pad(month)}/${year}`;
}

export function isDateInBudgetCycle(dateInput, month, year) {
  const cycle = getBudgetCycle(dateInput);
  return Number(cycle.month) === Number(month) && Number(cycle.year) === Number(year);
}

export function getBudgetCycleTransactions(transactions = [], month, year) {
  return transactions.filter((transaction) => isDateInBudgetCycle(transaction.transactionDate, month, year));
}
