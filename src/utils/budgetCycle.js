const SALARY_CYCLE_START_DAY = 25;

function toDateOnly(value) {
  if (!value) return null;
  if (value instanceof Date) return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  const [year, month, day] = String(value).slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

export function getBudgetCyclePeriod(dateInput = new Date()) {
  const date = toDateOnly(dateInput) || new Date();
  const day = date.getDate();
  const monthIndex = date.getMonth();
  const year = date.getFullYear();

  if (day >= SALARY_CYCLE_START_DAY) {
    return { month: monthIndex + 1, year };
  }

  const previous = new Date(year, monthIndex - 1, 1);
  return { month: previous.getMonth() + 1, year: previous.getFullYear() };
}

export function getBudgetCycleRange(month, year) {
  const startDate = new Date(Number(year), Number(month) - 1, SALARY_CYCLE_START_DAY);
  const endDate = new Date(Number(year), Number(month), SALARY_CYCLE_START_DAY - 1);

  const label = `${startDate.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })} - ${endDate.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}`;

  return {
    startDate,
    endDate,
    startISO: startDate.toISOString().slice(0, 10),
    endISO: endDate.toISOString().slice(0, 10),
    label,
  };
}

export function isDateInBudgetCycle(dateInput, month, year) {
  const date = toDateOnly(dateInput);
  if (!date) return false;
  const { startDate, endDate } = getBudgetCycleRange(month, year);
  return date >= startDate && date <= endDate;
}

export function getBudgetCycleShortLabel(month, year) {
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
}

export function getBudgetCycleLabel(month, year) {
  const date = new Date(Number(year), Number(month) - 1, 1);
  const monthName = date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  const { label } = getBudgetCycleRange(month, year);
  return `${monthName} (${label})`;
}
