const MONTH_NAMES = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

function makeDate(year, month, day) {
  return new Date(Number(year), Number(month) - 1, Number(day));
}

function toIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

function parseDate(dateString) {
  if (!dateString) return null;
  const date = new Date(`${dateString}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function getBudgetCyclePeriod(dateInput = new Date()) {
  const date = dateInput instanceof Date ? dateInput : parseDate(dateInput);
  const safeDate = date && !Number.isNaN(date.getTime()) ? date : new Date();

  let month = safeDate.getMonth() + 1;
  let year = safeDate.getFullYear();

  if (safeDate.getDate() < 25) {
    month -= 1;
    if (month === 0) {
      month = 12;
      year -= 1;
    }
  }

  return { month, year };
}

export function getBudgetCycleRange(month, year) {
  const startDate = makeDate(year, month, 25);
  const endDate = makeDate(year, month, 24);
  endDate.setMonth(endDate.getMonth() + 1);

  return {
    startDate,
    endDate,
    startIso: toIsoDate(startDate),
    endIso: toIsoDate(endDate),
    label: `${startDate.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })} - ${endDate.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}`,
  };
}

export function isDateInBudgetCycle(dateString, month, year) {
  const date = parseDate(dateString);
  if (!date) return false;

  const { startDate, endDate } = getBudgetCycleRange(month, year);
  return date >= startDate && date <= endDate;
}

export function getBudgetCycleLabel(month, year) {
  const { label } = getBudgetCycleRange(month, year);
  return `${MONTH_NAMES[Number(month) - 1]} ${year} (${label})`;
}

export function getBudgetCycleShortLabel(month, year) {
  return `${String(month).padStart(2, '0')}/${year}`;
}

export function getBudgetCyclePeriodFromDate(dateString) {
  return getBudgetCyclePeriod(dateString);
}
