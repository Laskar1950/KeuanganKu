export const formatRupiah = (value: number | string | null | undefined = 0): string =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

export const formatDate = (isoDate?: string | null): string => {
  if (!isoDate) return "-";

  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

export const toLocalDateKey = (value: Date | string = new Date()): string => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const todayKey = (): string => toLocalDateKey(new Date());

export const currentMonthYear = (): { month: number; year: number } => {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
};

export const sanitizeNumericInput = (value: string): string => String(value || "").replace(/\D/g, "");

export const monthLabel = (month: number, year: number): string =>
  new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(new Date(year, month - 1, 1));
