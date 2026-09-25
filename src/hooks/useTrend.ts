import { useMemo } from "react";
import type { Transaction } from "@/types";
import { getBudgetCycleRange, isDateInBudgetCycle } from "@/utils/budgetCycle";
import type { Granularity } from "@/components/ReportCharts";

const MONTHS = [
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

function amountByType(transactions: Transaction[], type: "income" | "expense") {
  return transactions.filter((t) => t.type === type).reduce((s, t) => s + Number(t.amount || 0), 0);
}

function toKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isInRange(txDate: string, start: Date, end: Date) {
  if (!txDate) return false;
  const k = toKey(new Date(txDate));
  return k >= toKey(start) && k <= toKey(end);
}

function getTxDate(t: Transaction) {
  return (t as unknown as { transactionDate?: string; transaction_date?: string }).transactionDate || (t as unknown as { transaction_date?: string }).transaction_date || "";
}

export function useTrendPeriods(
  granularity: Granularity,
  transactions: Transaction[],
  selectedMonth: number,
  selectedYear: number
) {
  return useMemo(() => {
    const txs = transactions as Transaction[];

    if (granularity === "daily") {
      // Harian dalam siklus 25-24 terpilih (sekitar 30 hari)
      const cycle = getBudgetCycleRange(selectedMonth, selectedYear);
      const days: { date: Date; label: string; fullLabel: string; key: string }[] = [];
      const cur = new Date(cycle.startDate);
      while (cur <= cycle.endDate) {
        const d = new Date(cur);
        const label = d.toLocaleDateString("id-ID", { day: "2-digit" });
        const fullLabel = d.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
        days.push({ date: new Date(d), label, fullLabel, key: toKey(d) });
        cur.setDate(cur.getDate() + 1);
      }
      return days.map((p, idx) => {
        const pts = txs.filter((t) => toKey(new Date(getTxDate(t))) === p.key);
        return {
          month: p.date.getMonth() + 1,
          year: p.date.getFullYear(),
          label: p.label,
          fullLabel: p.fullLabel,
          key: p.key,
          startKey: p.key,
          endKey: p.key,
          isActive: idx === days.length - 1,
          income: amountByType(pts, "income"),
          expense: amountByType(pts, "expense"),
        };
      });
    }

    if (granularity === "weekly") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dayOfWeek = (today.getDay() + 6) % 7;
      const mondayThisWeek = new Date(today);
      mondayThisWeek.setDate(today.getDate() - dayOfWeek);
      const periods: { start: Date; end: Date; label: string; fullLabel: string; key: string }[] = [];
      for (let offset = 7; offset >= 0; offset -= 1) {
        const start = new Date(mondayThisWeek);
        start.setDate(mondayThisWeek.getDate() - offset * 7);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        const label = `W${8 - offset}`;
        const fullLabel = `${start.toLocaleDateString("id-ID", { day: "2-digit", month: "short" })} - ${end.toLocaleDateString("id-ID", { day: "2-digit", month: "short" })}`;
        periods.push({ start, end, label, fullLabel, key: `${toKey(start)}_${toKey(end)}` });
      }
      return periods.map((p, idx) => {
        const pts = txs.filter((t) => isInRange(getTxDate(t), p.start, p.end));
        return {
          month: p.start.getMonth() + 1,
          year: p.start.getFullYear(),
          label: p.label,
          fullLabel: p.fullLabel,
          key: p.key,
          startKey: toKey(p.start),
          endKey: toKey(p.end),
          isActive: idx === periods.length - 1,
          income: amountByType(pts, "income"),
          expense: amountByType(pts, "expense"),
        };
      });
    }

    if (granularity === "monthly") {
      const base = new Date(selectedYear, selectedMonth - 1, 1);
      const periods: { month: number; year: number }[] = [];
      for (let offset = 5; offset >= 0; offset -= 1) {
        const d = new Date(base);
        d.setMonth(base.getMonth() - offset);
        periods.push({ month: d.getMonth() + 1, year: d.getFullYear() });
      }
      return periods.map((period) => {
        const start = new Date(period.year, period.month - 1, 1);
        const end = new Date(period.year, period.month, 0);
        const pts = txs.filter((t) => isInRange(getTxDate(t), start, end));
        return {
          ...period,
          key: `${period.year}-${period.month}`,
          label: MONTHS[period.month - 1].slice(0, 3),
          fullLabel: `${MONTHS[period.month - 1]} ${period.year}`,
          isActive: period.month === selectedMonth && period.year === selectedYear,
          income: amountByType(pts, "income"),
          expense: amountByType(pts, "expense"),
        };
      });
    }

    if (granularity === "yearly") {
      const currentYear = new Date().getFullYear();
      const periods: { year: number }[] = [];
      for (let offset = 4; offset >= 0; offset -= 1) periods.push({ year: currentYear - offset });
      return periods.map((period) => {
        const start = new Date(period.year, 0, 1);
        const end = new Date(period.year, 11, 31);
        const pts = txs.filter((t) => isInRange(getTxDate(t), start, end));
        return {
          month: 1,
          year: period.year,
          label: String(period.year),
          fullLabel: String(period.year),
          key: String(period.year),
          startKey: toKey(start),
          endKey: toKey(end),
          isActive: period.year === currentYear,
          income: amountByType(pts, "income"),
          expense: amountByType(pts, "expense"),
        };
      });
    }

    // 6months: 6 siklus gajian 25-24
    const periods: { month: number; year: number }[] = [];
    for (let offset = 5; offset >= 0; offset -= 1) {
      const date = new Date(selectedYear, selectedMonth - 1 - offset, 1);
      periods.push({ month: date.getMonth() + 1, year: date.getFullYear() });
    }
    return periods.map((period) => {
      const cycle = getBudgetCycleRange(period.month, period.year);
      const pts = txs.filter((t) => isDateInBudgetCycle(getTxDate(t), cycle));
      return {
        ...period,
        key: `${period.year}-${period.month}`,
        label: MONTHS[period.month - 1].slice(0, 3),
        fullLabel: `${MONTHS[period.month - 1]} ${period.year}`,
        isActive: period.month === selectedMonth && period.year === selectedYear,
        income: amountByType(pts, "income"),
        expense: amountByType(pts, "expense"),
      };
    });
  }, [granularity, transactions, selectedMonth, selectedYear]);
}

export function useBalancePoints(periods: ReturnType<typeof useTrendPeriods>) {
  return useMemo(() => {
    let running = 0;
    return periods.map((p) => {
      running += p.income - p.expense;
      return { label: p.label, fullLabel: p.fullLabel, isActive: p.isActive, balance: running };
    });
  }, [periods]);
}
