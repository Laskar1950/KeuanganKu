import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Download, Filter, Loader2 } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { BalanceLineChart, DonutChart, TrendBars, type Granularity, getExpenseIncomeStatus } from "@/components/ReportCharts";
import ReportFilterSheet from "@/components/ReportFilterSheet";
import { dummyAccounts, dummyBudgets, dummyTransactions } from "@/mocks/reportDummy";
import { DONUT_PALETTE } from "@/utils/chartPalette";
import { cn } from "@/lib/utils";
import {
  formatBudgetCycleRange,
  getBudgetCycleRange,
  getCurrentBudgetCycle,
  isDateInBudgetCycle,
} from "@/utils/budgetCycle";
import { useTrendPeriods, useBalancePoints } from "@/hooks/useTrend";
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
  const {
    transactions: rawTransactions = [],
    accounts: rawAccounts = [],
    budgets: rawBudgets = [],
    household,
    notify,
    familyMembers = [],
  } = useApp() as {
    transactions?: FlexibleTransaction[];
    accounts?: Account[];
    budgets?: FlexibleBudget[];
    household?: { name?: string } | null;
    notify?: (msg: string) => void;
    familyMembers?: import("@/types").FamilyMember[];
  };
  const currentCycle = getCurrentBudgetCycle();

  const enableDummy =
    import.meta.env.DEV && (import.meta.env.VITE_ENABLE_DUMMY_REPORT ?? "true") !== "false" && rawAccounts.length === 0 && rawBudgets.length === 0;

  const transactions = enableDummy ? (dummyTransactions as FlexibleTransaction[]) : rawTransactions;
  const accounts = enableDummy ? (dummyAccounts as Account[]) : rawAccounts;
  const budgets = enableDummy ? (dummyBudgets as FlexibleBudget[]) : rawBudgets;

  const [month, setMonth] = useState(Number(currentCycle.month));
  const [year, setYear] = useState(Number(currentCycle.year));
  const [accountId, setAccountId] = useState("all");
  const [budgetId, setBudgetId] = useState("all");
  const [granularity, setGranularity] = useState<Granularity>("6months");

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

  const trendPeriods = useTrendPeriods(granularity, transactions as Transaction[], Number(month), Number(year));
  const balancePoints = useBalancePoints(trendPeriods);

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
    setGranularity("6months");
  };

  const netTotal = incomeTotal - expenseTotal;

  const [exporting, setExporting] = useState(false);
  const [showFilter, setShowFilter] = useState(false);

  const activeFilterCount = (() => {
    let c = 0;
    if (month !== Number(currentCycle.month) || year !== Number(currentCycle.year)) c += 1;
    if (accountId !== "all") c += 1;
    if (budgetId !== "all") c += 1;
    if (granularity !== "6months") c += 1;
    return c;
  })();

  const handleExportExcel = async () => {
    if (exporting) return;
    try {
      setExporting(true);
      const { exportReportsExcel } = await import("@/utils/exportExcel");
      const accountNameById = new Map(accounts.map((a) => [a.id, a.name]));
      const budgetNameById = new Map(budgets.map((b) => [b.id, b.name]));
      const memberNameById = new Map((familyMembers as import("@/types").FamilyMember[]).map((m) => [m.userId, m.profile?.name || m.profile?.email || ""]));
      const monthLabel = MONTHS.find((m) => m.value === Number(month))?.label || String(month);
      const accountLabel = accountId === "all" ? "Semua dompet" : accountNameById.get(accountId) || accountId;
      const budgetLabel = budgetId === "all" ? "Semua alokasi" : budgetNameById.get(budgetId) || budgetId;
      const filterSummary = `Bulan: ${monthLabel} ${year} • Dompet: ${accountLabel} • Alokasi: ${budgetLabel}`;

      await exportReportsExcel({
        householdName: household?.name || "Keluarga",
        periodLabel: formatBudgetCycleRange(selectedCycle),
        periodStartKey: selectedCycle.startKey,
        periodEndKey: selectedCycle.endKey,
        filterSummary,
        month: Number(month),
        year: Number(year),
        accountNameById,
        budgetNameById,
        memberNameById,
        incomeTotal,
        expenseTotal,
        netTotal,
        allocationTotal,
        overBudgetTotal,
        periodBudgetsCount: periodBudgets.length,
        filteredTransactionsCount: filteredTransactions.length,
        allocationRows,
        trendPeriods,
        balancePoints,
        filteredTransactions: filteredTransactions as unknown as never,
        latestTransactions: latestTransactions as unknown as never,
      });
      notify?.(`Laporan diekspor — ${filteredTransactions.length} transaksi, ${periodBudgets.length} alokasi.`);
    } catch (error) {
      notify?.(error instanceof Error ? error.message : "Gagal mengekspor Excel.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <main className="flex flex-col gap-4 pb-28">
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col gap-4 rounded-[30px] border border-line-strong bg-[image:var(--gradient-frame)] p-5 shadow-soft backdrop-blur-xl"
      >
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
      </motion.section>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setShowFilter(true)}
          aria-expanded={showFilter}
          aria-controls="report-filter-sheet"
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border border-line bg-panel-strong px-4 py-3 text-xs font-black text-ink shadow-soft transition hover:bg-soft"
        >
          <Filter size={16} /> Filter
          {activeFilterCount > 0 && <span className="rounded-full bg-rose-bg px-2 py-0.5 text-[11px] font-black text-rose-dark">•{activeFilterCount}</span>}
        </button>
        <button
          type="button"
          onClick={handleExportExcel}
          disabled={exporting}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border border-white/40 bg-[image:var(--gradient-brand)] px-4 py-3 text-xs font-black text-white shadow-accent transition hover:opacity-95 disabled:opacity-50"
          aria-busy={exporting}
        >
          {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
          {exporting ? "Mempersiapkan..." : "Export Excel"}
        </button>
      </div>

      <section className="grid grid-cols-2 gap-3">
        {[0, 1, 2, 3].map((idx) => {
          const cards = [
            { label: "Pemasukan", value: formatCurrency(incomeTotal), note: "Total transaksi masuk", tone: "income" as const },
            { label: "Pengeluaran", value: formatCurrency(expenseTotal), note: "Total transaksi keluar", tone: "expense" as const },
            { label: "Total alokasi", value: formatCurrency(allocationTotal), note: `${periodBudgets.length} alokasi`, tone: "default" as const },
            { label: "Over anggaran", value: formatCurrency(overBudgetTotal), note: overBudgetTotal > 0 ? "Melewati batas" : "Masih aman", tone: (overBudgetTotal > 0 ? "expense" : "income") as const },
          ];
          const c = cards[idx];
          return (
            <motion.div key={c.label} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: idx * 0.05, duration: 0.32 }}>
              <SummaryCard label={c.label} value={c.value} note={c.note} tone={c.tone} />
            </motion.div>
          );
        })}
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

      <section className="rounded-[28px] border border-line-strong bg-panel-strong/90 p-4 sm:p-5 shadow-soft backdrop-blur-xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-lg tracking-tight text-ink">Tren Arus Kas</h2>
              <span className="rounded-full border border-green-border bg-green-bg px-2 py-0.5 text-[10px] font-black text-green">Live</span>
            </div>
            <p className="mt-0.5 text-xs font-semibold text-muted-foreground">
              {granularity === "daily"
                ? `Harian (Siklus ${formatBudgetCycleRange(selectedCycle)})`
                : granularity === "weekly"
                  ? "Mingguan (8 minggu terakhir)"
                  : granularity === "monthly"
                    ? "Bulanan (6 bulan kalender)"
                    : granularity === "6months"
                      ? "6 Siklus Gajian (25–24)"
                      : "Tahunan (5 tahun terakhir)"}
            </p>
          </div>

          {/* 3 default + More (Filter trigger) */}
          <div className="flex items-center gap-1 rounded-2xl border border-line bg-soft p-1">
            <button
              type="button"
              onClick={() => setGranularity("6months")}
              className={cn(
                "rounded-xl px-2.5 py-1.5 text-[11px] font-black transition",
                granularity === "6months" ? "bg-panel-strong text-ink shadow-soft border border-line" : "text-muted-foreground hover:text-ink"
              )}
            >
              6 Siklus
            </button>
            <button
              type="button"
              onClick={() => setGranularity("monthly")}
              className={cn(
                "rounded-xl px-2.5 py-1.5 text-[11px] font-black transition",
                granularity === "monthly" ? "bg-panel-strong text-ink shadow-soft border border-line" : "text-muted-foreground hover:text-ink"
              )}
            >
              Bulanan
            </button>
            <button
              type="button"
              onClick={() => setGranularity("yearly")}
              className={cn(
                "rounded-xl px-2.5 py-1.5 text-[11px] font-black transition",
                granularity === "yearly" ? "bg-panel-strong text-ink shadow-soft border border-line" : "text-muted-foreground hover:text-ink"
              )}
            >
              Tahunan
            </button>
            <button
              type="button"
              onClick={() => setShowFilter(true)}
              className={cn(
                "flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-[11px] font-black transition border",
                (granularity === "daily" || granularity === "weekly")
                  ? "border-rose-strong bg-rose-bg text-rose-dark"
                  : "border-transparent text-muted-foreground hover:text-ink"
              )}
            >
              <Filter size={11} />
              <span>{granularity === "daily" ? "Harian" : granularity === "weekly" ? "Mingguan" : "Lainnya"}</span>
            </button>
          </div>
        </div>

        {(() => {
          const totalIncome = trendPeriods.reduce((s, p) => s + p.income, 0);
          const totalExpense = trendPeriods.reduce((s, p) => s + p.expense, 0);
          const status = getExpenseIncomeStatus(totalIncome, totalExpense);
          const net = totalIncome - totalExpense;
          return (
            <div className={cn(
              "mb-4 rounded-[22px] border p-3.5 shadow-soft transition",
              status.tone === "surplus"
                ? "border-green-border bg-green-bg/60"
                : status.tone === "deficit"
                  ? "border-red-border bg-red-bg/60"
                  : "border-line bg-soft"
            )}>
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={cn(
                    "inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-[10.5px] font-black uppercase tracking-wider",
                    status.tone === "surplus"
                      ? "bg-green text-white"
                      : status.tone === "deficit"
                        ? "bg-red text-white"
                        : "bg-muted-foreground text-white"
                  )}>
                    {status.label}
                  </span>
                  <span className="text-[11px] font-semibold text-muted-foreground truncate">
                    {status.description}
                  </span>
                </div>
                <span className="text-[10px] font-black text-muted-foreground shrink-0 uppercase tracking-wider">
                  {granularity === "daily" ? "Siklus Ini" : granularity === "weekly" ? "8 Minggu" : granularity === "yearly" ? "5 Tahun" : "6 Periode"}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 border-t border-line/60 pt-2.5">
                <div>
                  <span className="block text-[10px] font-bold text-muted-foreground">Pemasukan</span>
                  <strong className="text-xs sm:text-[13px] font-black text-green tracking-tight">
                    {formatCurrency(totalIncome)}
                  </strong>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-muted-foreground">Pengeluaran</span>
                  <strong className="text-xs sm:text-[13px] font-black text-red tracking-tight">
                    {formatCurrency(totalExpense)}
                  </strong>
                </div>
                <div className="text-right">
                  <span className="block text-[10px] font-bold text-muted-foreground">Selisih Bersih</span>
                  <strong className={cn(
                    "text-xs sm:text-[13px] font-black tracking-tight",
                    net >= 0 ? "text-green" : "text-red"
                  )}>
                    {net >= 0 ? "+" : ""}{formatCurrency(net)}
                  </strong>
                </div>
              </div>
            </div>
          );
        })()}

        <TrendBars periods={trendPeriods} />
      </section>

      <section className="rounded-[28px] border border-line-strong bg-panel-strong/90 p-4 sm:p-5 shadow-soft backdrop-blur-xl">
        <div className="mb-3.5 flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-lg tracking-tight text-ink">Tren Saldo (Realtime)</h2>
              <span className="rounded-full border border-green-border bg-green-bg px-2 py-0.5 text-[10px] font-black text-green">Live</span>
            </div>
            <p className="mt-0.5 text-xs font-semibold text-muted-foreground">
              Akumulasi saldo relatif dari 0 • {granularity === "daily" ? "Harian" : granularity === "weekly" ? "Mingguan" : granularity === "monthly" ? "Bulanan" : granularity === "6months" ? "6 Siklus" : "Tahunan"}
            </p>
          </div>
        </div>
        <BalanceLineChart points={balancePoints} />
        <p className="mt-2 text-[10.5px] font-semibold text-muted-foreground">
          Garis saldo kumulatif (pemasukan dikurang pengeluaran) pada periode terpilih.
        </p>
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

      <ReportFilterSheet
        open={showFilter}
        onClose={() => setShowFilter(false)}
        month={Number(month)}
        year={Number(year)}
        accountId={accountId}
        budgetId={budgetId}
        granularity={granularity}
        yearOptions={yearOptions}
        accounts={accounts as { id: string; name: string }[]}
        budgets={budgets as { id: string; name: string; month: number; year: number }[]}
        onChangeMonth={(v) => setMonth(v)}
        onChangeYear={(v) => setYear(v)}
        onChangeAccount={(v) => setAccountId(v)}
        onChangeBudget={(v) => setBudgetId(v)}
        onChangeGranularity={(v) => setGranularity(v)}
        onReset={resetFilter}
        onApply={() => setShowFilter(false)}
        activeCount={activeFilterCount}
      />
    </main>
  );
}
