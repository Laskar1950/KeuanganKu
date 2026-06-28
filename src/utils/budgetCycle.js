const SALARY_CYCLE_START_DAY = 25;

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const MONTH_LONG = [
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

function toDate(value) {
  if (value instanceof Date) return new Date(value.getFullYear(), value.getMonth(), value.getDate());

  if (typeof value === 'string') {
    const [datePart] = value.split('T');
    const [year, month, day] = datePart.split('-').map(Number);

    if (year && month && day) {
      return new Date(year, month - 1, day);
    }
  }

  const parsed = new Date(value || Date.now());
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

function toISODate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeMonthYear(month, year) {
  let normalizedMonth = Number(month);
  let normalizedYear = Number(year);

  while (normalizedMonth < 1) {
    normalizedMonth += 12;
    normalizedYear -= 1;
  }

  while (normalizedMonth > 12) {
    normalizedMonth -= 12;
    normalizedYear += 1;
  }

  return { month: normalizedMonth, year: normalizedYear };
}

function buildCycle(month, year) {
  const normalized = normalizeMonthYear(month, year);
  const start = new Date(normalized.year, normalized.month - 1, SALARY_CYCLE_START_DAY);
  const end = new Date(normalized.year, normalized.month, SALARY_CYCLE_START_DAY - 1);

  return {
    month: normalized.month,
    year: normalized.year,
    start,
    end,
    startDate: toISODate(start),
    endDate: toISODate(end),
    startDay: SALARY_CYCLE_START_DAY,
    endDay: SALARY_CYCLE_START_DAY - 1,
    label: getBudgetCycleLabel(normalized.month, normalized.year),
    shortLabel: getBudgetCycleShortLabel(normalized.month, normalized.year),
  };
}

function getMonthName(month, variant = 'short') {
  const index = Number(month) - 1;
  return variant === 'long' ? MONTH_LONG[index] : MONTH_SHORT[index];
}

/**
 * Mengembalikan periode budget aktif dari sebuah tanggal.
 * Aturan:
 * - Tanggal 25 s/d akhir bulan masuk periode bulan berjalan.
 * - Tanggal 1 s/d 24 masuk periode bulan sebelumnya.
 */
export function getBudgetCyclePeriod(dateValue = new Date()) {
  const date = toDate(dateValue);
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();

  if (day >= SALARY_CYCLE_START_DAY) {
    return buildCycle(month, year);
  }

  const previous = normalizeMonthYear(month - 1, year);
  return buildCycle(previous.month, previous.year);
}

/**
 * Alias fleksibel agar kompatibel dengan beberapa file patch.
 * Bisa dipanggil:
 * - getBudgetCycle('2026-07-01')
 * - getBudgetCycle(6, 2026)
 */
export function getBudgetCycle(input = new Date(), year = null) {
  if (typeof input === 'number' && year !== null) {
    return buildCycle(input, year);
  }

  if (typeof input === 'object' && input?.month && input?.year) {
    return buildCycle(input.month, input.year);
  }

  return getBudgetCyclePeriod(input);
}

/**
 * Mengembalikan range periode berdasarkan bulan/tahun budget.
 * Contoh 06/2026 = 2026-06-25 s/d 2026-07-24.
 */
export function getBudgetCycleRange(monthOrCycle, year = null) {
  if (typeof monthOrCycle === 'object' && monthOrCycle?.month && monthOrCycle?.year) {
    return buildCycle(monthOrCycle.month, monthOrCycle.year);
  }

  return buildCycle(monthOrCycle, year);
}

export function getBudgetCycleLabel(monthOrCycle, year = null) {
  const cycle =
    typeof monthOrCycle === 'object' && monthOrCycle?.month && monthOrCycle?.year
      ? buildCycle(monthOrCycle.month, monthOrCycle.year)
      : year
        ? buildCycle(monthOrCycle, year)
        : null;

  const startMonth = cycle ? cycle.month : Number(monthOrCycle);
  const startYear = cycle ? cycle.year : Number(year);
  const endInfo = normalizeMonthYear(startMonth + 1, startYear);

  return `25 ${getMonthName(startMonth, 'long')} ${startYear} - 24 ${getMonthName(endInfo.month, 'long')} ${endInfo.year}`;
}

export function getBudgetCycleShortLabel(monthOrCycle, year = null) {
  const cycle =
    typeof monthOrCycle === 'object' && monthOrCycle?.month && monthOrCycle?.year
      ? buildCycle(monthOrCycle.month, monthOrCycle.year)
      : year
        ? buildCycle(monthOrCycle, year)
        : null;

  const startMonth = cycle ? cycle.month : Number(monthOrCycle);
  const startYear = cycle ? cycle.year : Number(year);
  const endInfo = normalizeMonthYear(startMonth + 1, startYear);

  const sameYear = startYear === endInfo.year;
  return sameYear
    ? `25 ${getMonthName(startMonth)} - 24 ${getMonthName(endInfo.month)} ${startYear}`
    : `25 ${getMonthName(startMonth)} ${startYear} - 24 ${getMonthName(endInfo.month)} ${endInfo.year}`;
}

export function formatBudgetCycleRange(monthOrCycle, year = null) {
  const cycle =
    typeof monthOrCycle === 'object' && monthOrCycle?.month && monthOrCycle?.year
      ? buildCycle(monthOrCycle.month, monthOrCycle.year)
      : year
        ? buildCycle(monthOrCycle, year)
        : getBudgetCycle(monthOrCycle || new Date());

  return cycle.shortLabel;
}

export function isDateInBudgetCycle(dateValue, monthOrCycle, year = null) {
  if (!dateValue) return false;

  const date = toDate(dateValue);
  const cycle =
    typeof monthOrCycle === 'object' && monthOrCycle?.startDate && monthOrCycle?.endDate
      ? {
          start: toDate(monthOrCycle.startDate),
          end: toDate(monthOrCycle.endDate),
        }
      : typeof monthOrCycle === 'object' && monthOrCycle?.month && monthOrCycle?.year
        ? buildCycle(monthOrCycle.month, monthOrCycle.year)
        : buildCycle(monthOrCycle, year);

  return date >= cycle.start && date <= cycle.end;
}

export function getBudgetCycleTransactions(transactions = [], monthOrCycle, year = null) {
  const cycle =
    typeof monthOrCycle === 'object' && monthOrCycle?.month && monthOrCycle?.year
      ? buildCycle(monthOrCycle.month, monthOrCycle.year)
      : buildCycle(monthOrCycle, year);

  return transactions.filter((transaction) => isDateInBudgetCycle(transaction.transactionDate, cycle));
}

export function getCurrentBudgetCycle() {
  return getBudgetCyclePeriod(new Date());
}

export function getBudgetCycleOptionFromDate(dateValue = new Date()) {
  const cycle = getBudgetCyclePeriod(dateValue);
  return { month: cycle.month, year: cycle.year };
}

export { SALARY_CYCLE_START_DAY };

export default {
  SALARY_CYCLE_START_DAY,
  getBudgetCycle,
  getBudgetCycleTransactions,
  getBudgetCyclePeriod,
  getBudgetCycleRange,
  getBudgetCycleLabel,
  getBudgetCycleShortLabel,
  formatBudgetCycleRange,
  isDateInBudgetCycle,
  getCurrentBudgetCycle,
  getBudgetCycleOptionFromDate,
};
