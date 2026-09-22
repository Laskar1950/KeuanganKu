import { useMemo, useState } from "react";
import { useApp } from "@/context/AppContext";
import { DonutChart, TrendBars } from "@/components/ReportCharts";
import { DONUT_PALETTE } from "@/utils/chartPalette";
import { cn } from "@/lib/utils";
import {
  formatBudgetCycleRange,
  getBudgetCycleRange,
  getCurrentBudgetCycle,
  isDateInBudgetCycle,
} from "@/utils/budgetCycle";
import type { Account, Budget, Transaction } from "@/types";

const MONTHS = [
  { value: 1, label: "Januari" },
  { value: 2, label: "Februari" },
  { value: 3, label: "Maret" },
  { value: 4, label: "April" },
  { value: 5, label: "Mei" },
  { value: 6, label: "Juni" },
  { value: 7, label: "Juli" },
  { value: 8, label: "Agustus" },
  { value: 9, label: "September" },
  { value: 10, label: "Oktober" },
  { value: 11, label: "November" },
  { value: 12, label: "Desember" },
];

type FlexibleBudget = Budget & { account_id?: string | null };
type FlexibleTransaction = Transaction & { account_id?: string; budget_id?: string | null };

function formatCurrency(value: number) {
  return `Rp ${Number(value || 0).toLocaleString("id-ID")}`;
}

function getTransactionDate(transaction: FlexibleTransaction) {
  return transaction?.transactionDate || (transaction as { created_at?: string }).createdAt || "";
}

function getTransactionTime(transaction: FlexibleTransaction) {
  const rawDate = transaction?.createdAt || getTransactionDate(transaction);
  const date = new Date(rawDate);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function amountByType(transactions: FlexibleTransaction[], type: "income" | "expense") {
  return transactions.filter((transaction) => transaction.type === type).reduce((total, transaction) => total + Number(transaction.amount || 0), 0);
}

const selectClassName =
  "h-12 w-full rounded-2xl border border-field-border bg-field-bg px-4 text-sm font-semibold text-ink outline-none focus:border-rose-strong focus:ring-4 focus:ring-rose-bg";

const labelClassName = "text-xs font-extrabold tracking-wide text-muted-foreground";

interface SummaryCardProps {
  label: string;
  value: string;
  note?: string;
  tone?: "default" | "income" | "expense";
}

function SummaryCard({ label, value, note, tone = "default" }: SummaryCardProps) {
  return (
    <article className="min-w-0 rounded-[24px] border border-line bg-panel-strong/90 p-4 shadow-soft backdrop-blur-xl">
      <span className="block text-xs font-extrabold text-muted-foreground">{label}</span>
      <strong
        className={cn(
          "mt-2 block font-display text-[clamp(1.05rem,3.6vw,1.5rem)] leading-tight font-black tracking-tight break-words",
          tone === "income" ? "text-green" : tone === "expense" ? "text-red" : "text-ink"
        )}
      >
        {value}
      </strong>
      {note ? <small className="mt-2 block text-[11px] font-semibold text-muted-foreground">{note}</small> : null}
    </article>
  );
}

export default function Reports() {
  const { transactions = [], accounts = [], budgets = [] } = useApp() as {
    transactions?: FlexibleTransaction[];
    accounts?: Account[];
    budgets?: FlexibleBudget[];
  };
  const currentCycle = getCurrentBudgetCycle();

  const [month, setMonth] = useState(Number(currentCycle.month));
  const [year, setYear] = useState(Number(currentCycle.year));
  const [accountId, setAccountId] = useState("all");
  const [budgetId, setBudgetId] = useState("all");

  const selectedCycle = useMemo(() => getBudgetCycleRange(Number(month), Number(year)), [month, year]);
  const accountById = useMemo(() => new Map(accounts.map((account) => [account.id, account])), [accounts]);
  const budgetById = useMemo(() => new Map(budgets.map((budget) => [budget.id, budget])), [budgets]);

  const yearOptions = useMemo(() => {
    const years = new Set<number>([currentCycle.year, Number(year)]);
    budgets.forEach((budget) => {
      if (budget.year) years.add(Number(budget.year));
    });
    transactions.forEach((transaction) => {
      const date = new Date(getTransactionDate(transaction));
      if (!Number.isNaN(date.getTime())) years.add(date.getFullYear());
    });
    return Array.from(years).filter(Boolean).sort((a, b) => b - a);
  }, [budgets, currentCycle.year, transactions, year]);

  const periodBudgets = useMemo(() => {
    return budgets.filter((budget) => {
      const isSamePeriod = Number(budget.month) === Number(month) && Number(budget.year) === Number(year);
      const isSameAccount = accountId === "all" || budget.accountId === accountId || budget.account_id === accountId;
      const isSameBudget = budgetId === "all" || budget.id === budgetId;
      return isSamePeriod && isSameAccount && isSameBudget;
    });
  }, [accountId, budgetId, budgets, month, year]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((transaction) => {
      const inCycle = isDateInBudgetCycle(getTransactionDate(transaction), selectedCycle);
      const sameAccount = accountId === "all" || transaction.accountId === accountId || transaction.account_id === accountId;
      const sameBudget = budgetId === "all" || transaction.budgetId === budgetId || transaction.budget_id === budgetId;
      return inCycle && sameAccount && sameBudget;
    });
  }, [accountId, budgetId, selectedCycle, transactions]);

  const incomeTotal = useMemo(() => amountByType(filteredTransactions, "income"), [filteredTransactions]);
  const expenseTotal = useMemo(() => amountByType(filteredTransactions, "expense"), [filteredTransactions]);
  const allocationTotal = useMemo(() => periodBudgets.reduce((total, budget) => total + Number(budget.amount || 0), 0), [periodBudgets]);

  const allocationRows = useMemo(() => {
    return periodBudgets
      .map((budget) => {
        const used = filteredTransactions
          .filter((transaction) => transaction.type === "expense" && (transaction.budgetId || transaction.budget_id) === budget.id)
          .reduce((total, transaction) => total + Number(transaction.amount || 0), 0);
        const amount = Number(budget.amount || 0);
        const remaining = amount - used;
        const percentageRaw = amount > 0 ? Math.round((used / amount) * 100) : 0;
        const percentage = Math.min(100, percentageRaw);
        return { ...budget, used, remaining, percentage, percentageRaw };
      })
      .sort((a, b) => b.used - a.used);
  }, [filteredTransactions, periodBudgets]);

  const overBudgetTotal = useMemo(() => {
    return allocationRows.reduce(
      (total, budget) => total + Math.max(0, Math.abs(Number(budget.remaining || 0)) * (Number(budget.remaining || 0) < 0 ? 1 : 0)),
      0
    );
  }, [allocationRows]);

  const donutRows = useMemo(() => {
    const used = allocationRows.filter((budget) => budget.used > 0).sort((a, b) => b.used - a.used);
    const top = used.slice(0, 6).map((budget) => ({ id: budget.id, name: budget.name, value: budget.used }));
    const rest = used.slice(6);
    const restTotal = rest.reduce((total, budget) => total + budget.used, 0);
    if (restTotal > 0) top.push({ id: "others", name: `Alokasi lain (${rest.length})`, value: restTotal });
    return top;
  }, [allocationRows]);

  const donutTotal = useMemo(() => donutRows.reduce((total, row) => total + row.value, 0), [donutRows]);

  const trendPeriods = useMemo(() => {
    const periods: { month: number; year: number }[] = [];
    for (let offset = 5; offset >= 0; offset -= 1) {
      const date = new Date(Number(year), Number(month) - 1 - offset, 1);
      periods.push({ month: date.getMonth() + 1, year: date.getFullYear() });
    }

    return periods.map((period) => {
      const cycle = getBudgetCycleRange(period.month, period.year);
      const periodTransactions = transactions.filter((transaction) => {
        if (!isDateInBudgetCycle(getTransactionDate(transaction), cycle)) return false;
        if (accountId !== "all" && (transaction.accountId || transaction.account_id) !== accountId) return false;
        if (budgetId !== "all" && (transaction.budgetId || transaction.budget_id) !== budgetId) return false;
        return true;
      });

      return {
        ...period,
        label: MONTHS[period.month - 1].label.slice(0, 3),
        fullLabel: `${MONTHS[period.month - 1].label} ${period.year}`,
        isActive: period.month === Number(month) && period.year === Number(year),
        income: amountByType(periodTransactions, "income"),
        expense: amountByType(periodTransactions, "expense"),
      };
    });
  }, [accountId, budgetId, month, transactions, year]);

  const latestTransactions = useMemo(() => {
    return [...filteredTransactions]
      .sort((a, b) => new Date(getTransactionDate(b)).getTime() - new Date(getTransactionDate(a)).getTime())
      .slice(0, 8);
  }, [filteredTransactions]);

  const resetFilter = () => {
    const nextCycle = getCurrentBudgetCycle();
    setMonth(Number(nextCycle.month));
    setYear(Number(nextCycle.year));
    setAccountId("all");
    setBudgetId("all");
  };

  const netTotal = incomeTotal - expenseTotal;

  return (
    <main className="flex flex-col gap-4 pb-28">
      <section className="flex flex-col gap-4 rounded-[30px] border border-line-strong bg-[image:var(--gradient-frame)] p-5 shadow-soft backdrop-blur-xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-black tracking-[0.18em] text-rose-dark uppercase">Laporan Keuangan</p>
            <h1 className="mt-1 font-display text-[clamp(24px,7vw,34px)] leading-[1.02] font-black tracking-tight text-ink">
              Ringkasan laporan
            </h1>
            <span className="mt-2 block text-sm font-bold text-muted-foreground">
              Periode gajian: {formatBudgetCycleRange(selectedCycle)}
            </span>
          </div>

          <div
            className={cn(
              "min-w-[190px] rounded-3xl border p-4",
              netTotal < 0 ? "border-red-border bg-red-bg" : "border-green-border bg-green-bg"
            )}
          >
            <small className="block font-extrabold text-muted-foreground">Net periode</small>
            <strong
              className={cn(
                "my-1 block font-display text-[1.65rem] leading-none font-black tracking-tight",
                netTotal < 0 ? "text-red" : "text-green"
              )}
            >
              {netTotal < 0 ? "-" : ""}
              {formatCurrency(Math.abs(netTotal))}
            </strong>
            <span className="block text-xs font-bold text-muted-foreground">{filteredTransactions.length} transaksi</span>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-line-strong bg-panel-strong/90 p-4 shadow-soft backdrop-blur-xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-lg tracking-tight text-ink">Filter laporan</h2>
            <p className="mt-1 text-xs font-semibold text-muted-foreground">Pilih periode, dompet, atau alokasi tertentu.</p>
          </div>
          <button
            type="button"
            onClick={resetFilter}
            className="shrink-0 rounded-full border border-line bg-panel-strong px-3.5 py-2.5 text-xs font-black text-rose-dark transition hover:bg-rose-bg"
          >
            Reset
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <label className={labelClassName}>Bulan</label>
            <select value={month} onChange={(event) => setMonth(Number(event.target.value))} className={selectClassName}>
              {MONTHS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-2">
            <label className={labelClassName}>Tahun</label>
            <select value={year} onChange={(event) => setYear(Number(event.target.value))} className={selectClassName}>
              {yearOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-2">
            <label className={labelClassName}>Dompet</label>
            <select value={accountId} onChange={(event) => setAccountId(event.target.value)} className={selectClassName}>
              <option value="all">Semua dompet</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-2">
            <label className={labelClassName}>Alokasi</label>
            <select value={budgetId} onChange={(event) => setBudgetId(event.target.value)} className={selectClassName}>
              <option value="all">Semua alokasi</option>
              {budgets
                .filter((budget) => Number(budget.month) === Number(month) && Number(budget.year) === Number(year))
                .map((budget) => (
                  <option key={budget.id} value={budget.id}>
                    {budget.name}
                  </option>
                ))}
            </select>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <SummaryCard label="Pemasukan" value={formatCurrency(incomeTotal)} note="Total transaksi masuk" tone="income" />
        <SummaryCard label="Pengeluaran" value={formatCurrency(expenseTotal)} note="Total transaksi keluar" tone="expense" />
        <SummaryCard label="Total alokasi" value={formatCurrency(allocationTotal)} note={`${periodBudgets.length} alokasi`} />
        <SummaryCard
          label="Over budget"
          value={formatCurrency(overBudgetTotal)}
          note={overBudgetTotal > 0 ? "Melewati batas" : "Masih aman"}
          tone={overBudgetTotal > 0 ? "expense" : "income"}
        />
      </section>

      <section className="rounded-[28px] border border-line-strong bg-panel-strong/90 p-4 shadow-soft backdrop-blur-xl">
        <div className="mb-4">
          <h2 className="font-display text-lg tracking-tight text-ink">Grafik pengeluaran</h2>
          <p className="mt-1 text-xs font-semibold text-muted-foreground">Distribusi pengeluaran per alokasi pada periode ini.</p>
        </div>

        {donutRows.length ? (
          <div className="grid grid-cols-[150px_minmax(0,1fr)] items-center gap-4 max-[420px]:grid-cols-1 max-[420px]:justify-items-center">
            <DonutChart rows={donutRows} total={donutTotal} />
            <div className="grid min-w-0 gap-2 max-[420px]:w-full">
              {donutRows.map((row, index) => (
                <div className="grid grid-cols-[10px_minmax(0,1fr)_auto_auto] items-center gap-2 text-xs" key={row.id}>
                  <span
                    className="size-2.5 rounded-full"
                    style={{ background: DONUT_PALETTE[index % DONUT_PALETTE.length] }}
                  />
                  <span className="truncate font-extrabold text-ink">{row.name}</span>
                  <strong className="font-black whitespace-nowrap text-ink">{formatCurrency(row.value)}</strong>
                  <small className="min-w-9 text-right font-black text-muted-foreground">
                    {donutTotal > 0 ? Math.round((row.value / donutTotal) * 100) : 0}%
                  </small>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-line bg-soft p-5 text-center text-sm font-semibold text-muted-foreground">
            Belum ada pengeluaran pada periode ini.
          </div>
        )}
      </section>

      <section className="rounded-[28px] border border-line-strong bg-panel-strong/90 p-4 shadow-soft backdrop-blur-xl">
        <div className="mb-4">
          <h2 className="font-display text-lg tracking-tight text-ink">Tren arus kas</h2>
          <p className="mt-1 text-xs font-semibold text-muted-foreground">Perbandingan pemasukan dan pengeluaran 6 periode terakhir.</p>
        </div>
        <TrendBars periods={trendPeriods} />
      </section>

      <section className="rounded-[28px] border border-line-strong bg-panel-strong/90 p-4 shadow-soft backdrop-blur-xl">
        <div className="mb-4">
          <h2 className="font-display text-lg tracking-tight text-ink">Penggunaan alokasi</h2>
          <p className="mt-1 text-xs font-semibold text-muted-foreground">Ringkasan pemakaian alokasi pada periode ini.</p>
        </div>

        <div className="grid gap-3">
          {allocationRows.length ? (
            allocationRows.map((budget) => {
              const isOver = Number(budget.remaining || 0) < 0;
              return (
                <article key={budget.id} className="rounded-[20px] border border-line bg-soft p-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <strong className="block truncate text-sm font-black text-ink">{budget.name}</strong>
                      <span className="block text-[11px] font-semibold text-muted-foreground">
                        {accountById.get(budget.accountId || budget.account_id || "")?.name || "Tanpa dompet"}
                      </span>
                    </div>
                    <b className="shrink-0 text-sm font-black text-ink">{formatCurrency(budget.used)}</b>
                  </div>

                  <div className="my-2.5 h-2.5 overflow-hidden rounded-full border border-line bg-panel">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        isOver ? "bg-[linear-gradient(90deg,var(--red),var(--rose))]" : "bg-[image:var(--gradient-brand)]"
                      )}
                      style={{ width: `${budget.percentage}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between gap-3 text-[11px] font-semibold text-muted-foreground">
                    <span>Alokasi {formatCurrency(budget.amount)} ({budget.percentageRaw}%)</span>
                    <span className={isOver ? "font-black text-red" : ""}>
                      {isOver ? `Over ${formatCurrency(Math.abs(budget.remaining))}` : `Sisa ${formatCurrency(budget.remaining)}`}
                    </span>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="rounded-2xl border border-line bg-soft p-5 text-center text-sm font-semibold text-muted-foreground">
              Belum ada alokasi pada periode ini.
            </div>
          )}
        </div>
      </section>

      <section className="rounded-[28px] border border-line-strong bg-panel-strong/90 p-4 shadow-soft backdrop-blur-xl">
        <div className="mb-4">
          <h2 className="font-display text-lg tracking-tight text-ink">Transaksi periode ini</h2>
          <p className="mt-1 text-xs font-semibold text-muted-foreground">Daftar transaksi terbaru sesuai filter laporan.</p>
        </div>

        <div className="grid gap-3">
          {latestTransactions.length ? (
            latestTransactions.map((transaction) => {
              const isExpense = transaction.type === "expense";
              const budget = budgetById.get(transaction.budgetId || transaction.budget_id || "");
              const account = accountById.get(transaction.accountId || transaction.account_id || "");
              return (
                <article
                  key={transaction.id}
                  className="flex items-center justify-between gap-3 rounded-[20px] border border-line bg-soft p-3.5"
                >
                  <div className="min-w-0">
                    <strong className="block truncate text-sm font-black text-ink">
                      {budget?.name || transaction.note || (isExpense ? "Pengeluaran" : "Pemasukan")}
                    </strong>
                    <span className="block text-[11px] font-semibold text-muted-foreground">
                      {getTransactionTime(transaction)} · {account?.name || "Dompet"}
                    </span>
                  </div>
                  <b className={cn("shrink-0 text-sm font-black", isExpense ? "text-red" : "text-green")}>
                    {isExpense ? "-" : "+"}
                    {formatCurrency(transaction.amount)}
                  </b>
                </article>
              );
            })
          ) : (
            <div className="rounded-2xl border border-line bg-soft p-5 text-center text-sm font-semibold text-muted-foreground">
              Belum ada transaksi pada periode ini.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
