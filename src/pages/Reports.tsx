import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Download, Filter, Loader2 } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { DonutChart, TrendBars, type Granularity, getExpenseIncomeStatus } from "@/components/ReportCharts";
import ReportFilterSheet from "@/components/ReportFilterSheet";
import {
  dummyAccounts,
  dummyBudgets,
  dummyFamilyMembers,
  dummySavingGoals,
  dummyTransactions,
} from "@/mocks/reportDummy";
import { DONUT_PALETTE } from "@/utils/chartPalette";
import { cn } from "@/lib/utils";
import {
  formatBudgetCycleRange,
  getBudgetCycleRange,
  getCurrentBudgetCycle,
  isDateInBudgetCycle,
} from "@/utils/budgetCycle";
import { useTrendPeriods, useBalancePoints } from "@/hooks/useTrend";
import type { Account, Budget, Category, FamilyMember, SavingGoal, Transaction } from "@/types";

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
type FlexibleTransaction = Transaction & { account_id?: string; budget_id?: string | null; category_id?: string | null; user_id?: string };

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
  return transactions
    .filter((transaction) => transaction.type === type)
    .reduce((total, transaction) => total + Number(transaction.amount || 0), 0);
}

interface SummaryCardProps {
  label: string;
  value: string;
  note?: string;
  badge?: string;
  tone?: "income" | "expense" | "allocation" | "alert";
}

function SummaryCard({ label, value, note, badge, tone = "allocation" }: SummaryCardProps) {
  const toneStyles = {
    income: {
      valueColor: "text-green",
      badgeBorder: "border-green-border/80 bg-green-bg text-green",
    },
    expense: {
      valueColor: "text-red",
      badgeBorder: "border-red-border/80 bg-red-bg text-red",
    },
    allocation: {
      valueColor: "text-ink",
      badgeBorder: "border-line bg-soft text-muted-foreground",
    },
    alert: {
      valueColor: "text-rose-dark",
      badgeBorder: "border-rose-border/80 bg-rose-bg text-rose-dark",
    },
  }[tone];

  return (
    <article className="group relative flex flex-col justify-between rounded-[24px] border border-line bg-panel-strong/95 p-4 shadow-soft transition-all duration-200 hover:border-line-strong">
      <div>
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-[10.5px] font-black tracking-wider text-muted-foreground uppercase">
            {label}
          </span>
          {badge && (
            <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-extrabold", toneStyles.badgeBorder)}>
              {badge}
            </span>
          )}
        </div>
        <strong
          className={cn(
            "mt-2.5 block font-display text-[clamp(1.15rem,3.8vw,1.45rem)] font-black tracking-tight leading-tight",
            toneStyles.valueColor
          )}
        >
          {value}
        </strong>
      </div>
      {note && (
        <div className="mt-2.5 flex items-center gap-1.5 border-t border-line/50 pt-2 text-[11px] font-semibold text-muted-foreground">
          <span className="truncate">{note}</span>
        </div>
      )}
    </article>
  );
}

export default function Reports() {
  const {
    transactions: rawTransactions = [],
    accounts: rawAccounts = [],
    budgets: rawBudgets = [],
    savingGoals: rawSavingGoals = [],
    categories: rawCategories = [],
    household,
    notify,
    familyMembers = [],
  } = useApp() as {
    transactions?: FlexibleTransaction[];
    accounts?: Account[];
    budgets?: FlexibleBudget[];
    savingGoals?: SavingGoal[];
    categories?: Category[];
    household?: { name?: string } | null;
    notify?: (msg: string) => void;
    familyMembers?: FamilyMember[];
  };

  const currentCycle = getCurrentBudgetCycle();

  const enableDummy =
    import.meta.env.DEV &&
    (import.meta.env.VITE_ENABLE_DUMMY_REPORT ?? "true") !== "false" &&
    rawAccounts.length === 0 &&
    rawBudgets.length === 0;

  const transactions = enableDummy ? (dummyTransactions as FlexibleTransaction[]) : rawTransactions;
  const accounts = enableDummy ? (dummyAccounts as Account[]) : rawAccounts;
  const budgets = enableDummy ? (dummyBudgets as FlexibleBudget[]) : rawBudgets;
  const savingGoals = useMemo(() => {
    return enableDummy && rawSavingGoals.length === 0 ? dummySavingGoals : rawSavingGoals;
  }, [enableDummy, rawSavingGoals]);

  const [month, setMonth] = useState(Number(currentCycle.month));
  const [year, setYear] = useState(Number(currentCycle.year));
  const [accountId, setAccountId] = useState("all");
  const [budgetId, setBudgetId] = useState("all");
  const [granularity, setGranularity] = useState<Granularity>("semester");

  const selectedCycle = useMemo(() => getBudgetCycleRange(Number(month), Number(year)), [month, year]);
  const accountById = useMemo(() => new Map(accounts.map((account) => [account.id, account])), [accounts]);
  const budgetById = useMemo(() => new Map(budgets.map((budget) => [budget.id, budget])), [budgets]);

  const memberNameById = useMemo(() => {
    const map = new Map<string, string>();
    const members = (enableDummy && familyMembers.length === 0 ? dummyFamilyMembers : familyMembers) as FamilyMember[];
    members.forEach((m) => {
      const name = m.profile?.name || m.profile?.email || m.userId;
      if (m.userId) map.set(m.userId, name);
      if (m.id) map.set(m.id, name);
    });
    return map;
  }, [familyMembers, enableDummy]);

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

  // Target Tabungan Metrics
  const totalSavingTarget = useMemo(() => savingGoals.reduce((sum, g) => sum + Number(g.targetAmount || 0), 0), [savingGoals]);
  const totalSavingCurrent = useMemo(() => savingGoals.reduce((sum, g) => sum + Number(g.currentAmount || 0), 0), [savingGoals]);
  const savingProgressPercent = totalSavingTarget > 0 ? Math.min(100, Math.round((totalSavingCurrent / totalSavingTarget) * 100)) : 0;
  const savingRemaining = Math.max(0, totalSavingTarget - totalSavingCurrent);

  // Pengeluaran Makan per Akun
  const foodKeywords = useMemo(
    () => ["makan", "food", "kuliner", "resto", "restoran", "konsumsi", "warung", "cafe", "kopi", "jajan", "gofood", "grabfood", "shopeefood"],
    []
  );

  const foodTransactions = useMemo(() => {
    return filteredTransactions.filter((t) => {
      if (t.type !== "expense") return false;
      const budget = budgetById.get(t.budgetId || t.budget_id || "");
      const cat = (rawCategories as Category[]).find((c) => c.id === (t.categoryId || t.category_id));
      const text = `${t.note || ""} ${budget?.name || ""} ${cat?.name || ""}`.toLowerCase();
      return foodKeywords.some((kw) => text.includes(kw));
    });
  }, [filteredTransactions, budgetById, rawCategories, foodKeywords]);

  const foodTotal = useMemo(() => amountByType(foodTransactions, "expense"), [foodTransactions]);

  const foodByAccount = useMemo(() => {
    const map = new Map<string, number>();
    foodTransactions.forEach((t) => {
      const accId = t.accountId || t.account_id || "unknown";
      map.set(accId, (map.get(accId) || 0) + Number(t.amount || 0));
    });
    return Array.from(map.entries())
      .map(([accId, amount]) => {
        const acc = accountById.get(accId);
        return {
          id: accId,
          name: acc?.name || "Dompet Lain",
          type: acc?.type || "cash",
          amount,
          percentage: foodTotal > 0 ? Math.round((amount / foodTotal) * 100) : 0,
        };
      })
      .sort((a, b) => b.amount - a.amount);
  }, [foodTransactions, foodTotal, accountById]);

  // Pengeluaran Terbanyak Siapa (Top Spender)
  const memberExpenses = useMemo(() => {
    const map = new Map<string, { id: string; name: string; amount: number; count: number }>();
    filteredTransactions
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        const id = t.createdBy || t.createdByProfile?.id || t.user_id || "unknown";
        const name = t.createdByProfile?.name || memberNameById.get(id) || "Anggota Keluarga";
        const cur = map.get(id) || { id, name, amount: 0, count: 0 };
        cur.amount += Number(t.amount || 0);
        cur.count += 1;
        map.set(id, cur);
      });
    return Array.from(map.values())
      .map((item) => ({
        ...item,
        percentage: expenseTotal > 0 ? Math.round((item.amount / expenseTotal) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [filteredTransactions, expenseTotal, memberNameById]);

  const topSpender = memberExpenses[0] || null;

  // Saving Terbanyak Siapa (Top Saver)
  const memberSavings = useMemo(() => {
    const explicitMap = new Map<string, number>();
    const netMap = new Map<string, { income: number; expense: number }>();

    filteredTransactions.forEach((t) => {
      const id = t.createdBy || t.createdByProfile?.id || t.user_id || "unknown";
      const acc = accountById.get(t.accountId || t.account_id || "");
      const budget = budgetById.get(t.budgetId || t.budget_id || "");
      const text = `${t.note || ""} ${budget?.name || ""}`.toLowerCase();
      const isSavingTx =
        acc?.type === "saving" ||
        ["tabungan", "saving", "investasi", "deposito", "dana darurat"].some((kw) => text.includes(kw));

      if (isSavingTx && t.type === "expense") {
        explicitMap.set(id, (explicitMap.get(id) || 0) + Number(t.amount || 0));
      }

      const cur = netMap.get(id) || { income: 0, expense: 0 };
      if (t.type === "income") cur.income += Number(t.amount || 0);
      if (t.type === "expense") cur.expense += Number(t.amount || 0);
      netMap.set(id, cur);
    });

    const hasExplicit = Array.from(explicitMap.values()).some((v) => v > 0);
    const memberIds = new Set([...explicitMap.keys(), ...netMap.keys()]);

    return Array.from(memberIds)
      .map((id) => {
        const name =
          memberNameById.get(id) ||
          filteredTransactions.find((t) => (t.createdBy || t.createdByProfile?.id) === id)?.createdByProfile?.name ||
          "Anggota Keluarga";
        const explicitAmount = explicitMap.get(id) || 0;
        const net = netMap.get(id) || { income: 0, expense: 0 };
        const surplus = Math.max(0, net.income - net.expense);
        const amount = hasExplicit && explicitAmount > 0 ? explicitAmount : surplus;
        return {
          id,
          name,
          amount,
          explicitAmount,
          surplus,
          isExplicit: hasExplicit && explicitAmount > 0,
        };
      })
      .filter((m) => m.amount > 0)
      .sort((a, b) => b.amount - a.amount);
  }, [filteredTransactions, accountById, budgetById, memberNameById]);

  const topSaver = memberSavings[0] || null;

  const resetFilter = () => {
    const nextCycle = getCurrentBudgetCycle();
    setMonth(Number(nextCycle.month));
    setYear(Number(nextCycle.year));
    setAccountId("all");
    setBudgetId("all");
    setGranularity("semester");
  };

  const netTotal = incomeTotal - expenseTotal;

  const [exporting, setExporting] = useState(false);
  const [showFilter, setShowFilter] = useState(false);

  const activeFilterCount = (() => {
    let c = 0;
    if (month !== Number(currentCycle.month) || year !== Number(currentCycle.year)) c += 1;
    if (accountId !== "all") c += 1;
    if (budgetId !== "all") c += 1;
    if (granularity !== "semester" && granularity !== "6months") c += 1;
    return c;
  })();

  const handleExportExcel = async () => {
    if (exporting) return;
    try {
      setExporting(true);
      const { exportReportsExcel } = await import("@/utils/exportExcel");
      const accountNameById = new Map(accounts.map((a) => [a.id, a.name]));
      const budgetNameById = new Map(budgets.map((b) => [b.id, b.name]));
      const memberNameExportMap = new Map(
        (familyMembers as FamilyMember[]).map((m) => [m.userId, m.profile?.name || m.profile?.email || ""])
      );
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
        memberNameById: memberNameExportMap,
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
      {/* Header Banner */}
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
              "min-w-[190px] rounded-3xl border p-4 shadow-soft",
              netTotal < 0 ? "border-red-border bg-red-bg/80" : "border-green-border bg-green-bg/80"
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <small className="block font-extrabold text-muted-foreground">Net periode</small>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider",
                  netTotal < 0 ? "bg-red text-white" : "bg-green text-white"
                )}
              >
                {netTotal < 0 ? "Defisit" : "Surplus"}
              </span>
            </div>
            <strong
              className={cn(
                "my-1.5 block font-display text-[1.65rem] leading-none font-black tracking-tight",
                netTotal < 0 ? "text-red" : "text-green"
              )}
            >
              {netTotal < 0 ? "-" : "+"}
              {formatCurrency(Math.abs(netTotal))}
            </strong>
            <span className="block text-xs font-bold text-muted-foreground">
              {filteredTransactions.length} transaksi · {periodBudgets.length} alokasi
            </span>
          </div>
        </div>
      </motion.section>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setShowFilter(true)}
          aria-expanded={showFilter}
          aria-controls="report-filter-sheet"
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border border-line bg-panel-strong px-4 py-3 text-xs font-black text-ink shadow-soft transition hover:bg-soft"
        >
          <Filter size={16} /> Filter
          {activeFilterCount > 0 && (
            <span className="rounded-full bg-rose-bg px-2 py-0.5 text-[11px] font-black text-rose-dark">•{activeFilterCount}</span>
          )}
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

      {/* 4 Cards Ringkasan Keuangan (Design Taste Elevated) */}
      <section className="grid grid-cols-2 gap-3">
        <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0, duration: 0.32 }}>
          <SummaryCard
            label="Pemasukan"
            value={formatCurrency(incomeTotal)}
            note="Total arus masuk periode ini"
            tone="income"
            badge={`${filteredTransactions.filter((t) => t.type === "income").length} trx`}
          />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.05, duration: 0.32 }}>
          <SummaryCard
            label="Pengeluaran"
            value={formatCurrency(expenseTotal)}
            note={incomeTotal > 0 ? `${Math.round((expenseTotal / incomeTotal) * 100)}% dari pemasukan` : "Belum ada pemasukan"}
            tone="expense"
            badge={`${filteredTransactions.filter((t) => t.type === "expense").length} trx`}
          />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1, duration: 0.32 }}>
          <SummaryCard
            label="Total alokasi"
            value={formatCurrency(allocationTotal)}
            note={`${allocationRows.filter((r) => r.used > 0).length} dari ${periodBudgets.length} aktif`}
            tone="allocation"
            badge={allocationTotal > 0 ? `${Math.min(100, Math.round((expenseTotal / allocationTotal) * 100))}% terpakai` : "0%"}
          />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.15, duration: 0.32 }}>
          <SummaryCard
            label="Over anggaran"
            value={formatCurrency(overBudgetTotal)}
            note={overBudgetTotal > 0 ? "Melewati batas plafon" : "Semua alokasi aman"}
            tone={overBudgetTotal > 0 ? "alert" : "income"}
            badge={overBudgetTotal > 0 ? "Perlu pantau" : "Terkendali"}
          />
        </motion.div>
      </section>

      {/* Target Tabungan (Pencapaian Finansial) */}
      <section className="rounded-[28px] border border-line-strong bg-panel-strong/90 p-4 sm:p-5 shadow-soft backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="block text-[10px] font-black uppercase tracking-wider text-muted-foreground">Target Tabungan</span>
            <h2 className="font-display text-lg tracking-tight text-ink font-black">Pencapaian Tabungan</h2>
            <p className="text-xs font-semibold text-muted-foreground">Akumulasi tabungan & dana impian keluarga.</p>
          </div>
          <div className="rounded-2xl border border-green-border bg-green-bg/70 px-3.5 py-1.5 text-right">
            <span className="block text-[10px] font-black uppercase tracking-wider text-muted-foreground">Pencapaian</span>
            <strong className="font-display text-xl font-black tracking-tight text-green">
              {savingProgressPercent}%
            </strong>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-line bg-soft p-4">
          <div className="flex items-end justify-between gap-2">
            <div>
              <span className="text-[11px] font-bold text-muted-foreground">Terkumpul saat ini</span>
              <p className="font-display text-lg font-black tracking-tight text-ink">
                {formatCurrency(totalSavingCurrent)}
              </p>
            </div>
            <div className="text-right">
              <span className="text-[11px] font-bold text-muted-foreground">Target total</span>
              <p className="text-sm font-black text-muted-foreground">
                {formatCurrency(totalSavingTarget)}
              </p>
            </div>
          </div>

          <div className="my-3 h-3 overflow-hidden rounded-full border border-line bg-panel">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${savingProgressPercent}%` }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="h-full rounded-full bg-[linear-gradient(90deg,var(--green),var(--teal))]"
            />
          </div>

          <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
            <span>Progress: {savingProgressPercent}%</span>
            <span>{savingRemaining > 0 ? `Sisa target: ${formatCurrency(savingRemaining)}` : "Target tercapai sempurna!"}</span>
          </div>
        </div>

        {savingGoals.length > 0 && (
          <div className="mt-3.5 grid gap-2">
            {savingGoals.slice(0, 3).map((goal) => {
              const current = Number(goal.currentAmount || 0);
              const target = Number(goal.targetAmount || 0);
              const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
              return (
                <div key={goal.id} className="flex items-center justify-between gap-3 rounded-[18px] border border-line bg-panel p-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-xs font-black text-ink">{goal.name}</span>
                      <span className="text-xs font-black text-green">{pct}%</span>
                    </div>
                    <div className="my-1.5 h-1.5 overflow-hidden rounded-full bg-soft">
                      <div className="h-full rounded-full bg-green" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="flex justify-between text-[10px] font-semibold text-muted-foreground">
                      <span>{formatCurrency(current)}</span>
                      <span>Target {formatCurrency(target)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Pengeluaran Makan per Akun */}
      <section className="rounded-[28px] border border-line-strong bg-panel-strong/90 p-4 sm:p-5 shadow-soft backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <span className="block text-[10px] font-black uppercase tracking-wider text-muted-foreground">Konsumsi & Kuliner</span>
            <h2 className="font-display text-lg tracking-tight text-ink font-black">Pengeluaran Makan per Akun</h2>
            <p className="text-xs font-semibold text-muted-foreground">Rincian belanja makan dan jajan per dompet.</p>
          </div>
          <div className="rounded-2xl border border-orange-border bg-orange-bg/70 px-3.5 py-1.5 text-right">
            <span className="block text-[10px] font-black uppercase tracking-wider text-muted-foreground">Total Makan</span>
            <strong className="font-display text-base sm:text-lg font-black tracking-tight text-orange-dark">
              {formatCurrency(foodTotal)}
            </strong>
          </div>
        </div>

        {foodByAccount.length ? (
          <div className="grid gap-2.5">
            {foodByAccount.map((item) => (
              <div key={item.id} className="rounded-[20px] border border-line bg-soft p-3.5 transition hover:bg-panel">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <strong className="block truncate text-xs sm:text-sm font-black text-ink">{item.name}</strong>
                    <span className="block text-[10.5px] font-semibold text-muted-foreground">
                      {item.percentage}% dari total pengeluaran makan
                    </span>
                  </div>
                  <strong className="shrink-0 font-display text-sm font-black text-ink">
                    {formatCurrency(item.amount)}
                  </strong>
                </div>
                <div className="mt-2.5 h-1.5 overflow-hidden rounded-full border border-line/60 bg-panel">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,var(--orange),var(--rose))]"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-line bg-soft p-5 text-center text-xs font-semibold text-muted-foreground">
            Tidak ada transaksi kategori makan/kuliner yang tercatat pada periode ini.
          </div>
        )}
      </section>

      {/* Grid: Pengeluaran Terbanyak & Saving Terbanyak */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {/* Card: Pengeluaran Terbanyak */}
        <article className="flex flex-col justify-between rounded-[26px] border border-line-strong bg-panel-strong/90 p-4 sm:p-5 shadow-soft backdrop-blur-xl">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <div>
                <span className="block text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                  Pengeluaran Terbanyak
                </span>
                <h3 className="font-display text-sm sm:text-base font-black text-ink">Spender Terbesar</h3>
              </div>
              <span className="rounded-full border border-red-border/70 bg-red-bg/60 px-2.5 py-0.5 text-[10px] font-black text-red">
                Top Spender
              </span>
            </div>

            {topSpender ? (
              <div className="rounded-[20px] border border-line bg-soft/70 p-3.5">
                {/* Member Profile Row */}
                <div className="flex items-center gap-2.5">
                  <div className="grid size-8 shrink-0 place-items-center rounded-full border border-line bg-panel font-display text-xs font-black text-ink">
                    {topSpender.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <strong className="block truncate text-xs sm:text-sm font-black text-ink">{topSpender.name}</strong>
                    <span className="block text-[10.5px] font-semibold text-muted-foreground">
                      {topSpender.count} transaksi dicatat
                    </span>
                  </div>
                </div>

                {/* Amount Row - Dedicated Line to Avoid Collision */}
                <div className="mt-3 border-t border-line/60 pt-2.5">
                  <strong className="block font-display text-xl sm:text-2xl font-black tracking-tight text-red">
                    {formatCurrency(topSpender.amount)}
                  </strong>
                  <span className="mt-0.5 block text-[11px] font-semibold text-muted-foreground">
                    {topSpender.percentage}% dari total belanja keluarga
                  </span>
                </div>

                {memberExpenses.length > 1 && (
                  <div className="mt-3 border-t border-line/60 pt-2 space-y-1">
                    {memberExpenses.slice(1, 3).map((m) => (
                      <div key={m.id} className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span className="truncate max-w-[130px]">{m.name}</span>
                        <span className="font-bold text-ink">{formatCurrency(m.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-line bg-soft p-4 text-center text-xs font-semibold text-muted-foreground">
                Belum ada transaksi pengeluaran.
              </div>
            )}
          </div>
        </article>

        {/* Card: Saving Terbanyak */}
        <article className="flex flex-col justify-between rounded-[26px] border border-line-strong bg-panel-strong/90 p-4 sm:p-5 shadow-soft backdrop-blur-xl">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <div>
                <span className="block text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                  Saving Terbanyak
                </span>
                <h3 className="font-display text-sm sm:text-base font-black text-ink">Kontributor Tabungan</h3>
              </div>
              <span className="rounded-full border border-green-border/70 bg-green-bg/60 px-2.5 py-0.5 text-[10px] font-black text-green">
                Top Saver
              </span>
            </div>

            {topSaver ? (
              <div className="rounded-[20px] border border-line bg-soft/70 p-3.5">
                {/* Member Profile Row */}
                <div className="flex items-center gap-2.5">
                  <div className="grid size-8 shrink-0 place-items-center rounded-full border border-line bg-panel font-display text-xs font-black text-ink">
                    {topSaver.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <strong className="block truncate text-xs sm:text-sm font-black text-ink">{topSaver.name}</strong>
                    <span className="block text-[10.5px] font-semibold text-muted-foreground">
                      {topSaver.isExplicit ? "Setoran tabungan langsung" : "Surplus pendapatan"}
                    </span>
                  </div>
                </div>

                {/* Amount Row - Dedicated Line to Avoid Collision */}
                <div className="mt-3 border-t border-line/60 pt-2.5">
                  <strong className="block font-display text-xl sm:text-2xl font-black tracking-tight text-green">
                    {formatCurrency(topSaver.amount)}
                  </strong>
                  <span className="mt-0.5 block text-[11px] font-semibold text-muted-foreground">
                    Dana tersimpan periode ini
                  </span>
                </div>

                {memberSavings.length > 1 && (
                  <div className="mt-3 border-t border-line/60 pt-2 space-y-1">
                    {memberSavings.slice(1, 3).map((m) => (
                      <div key={m.id} className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span className="truncate max-w-[130px]">{m.name}</span>
                        <span className="font-bold text-ink">{formatCurrency(m.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-line bg-soft p-4 text-center text-xs font-semibold text-muted-foreground">
                Belum ada kontribusi tabungan atau surplus pada periode ini.
              </div>
            )}
          </div>
        </article>
      </section>

      {/* Grafik Pengeluaran */}
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

      {/* Tren Arus Kas */}
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
                  : granularity === "yearly"
                    ? "Tahunan (5 tahun terakhir)"
                    : "Semester (6 siklus gajian)"}
            </p>
          </div>

          {/* 4 Pilihan Granularitas: Harian, Mingguan, Semester, Tahunan */}
          <div className="flex items-center gap-1 rounded-2xl border border-line bg-soft p-1">
            <button
              type="button"
              onClick={() => setGranularity("daily")}
              className={cn(
                "rounded-xl px-2.5 py-1.5 text-[11px] font-black transition",
                granularity === "daily" ? "bg-panel-strong text-ink shadow-soft border border-line" : "text-muted-foreground hover:text-ink"
              )}
            >
              Harian
            </button>
            <button
              type="button"
              onClick={() => setGranularity("weekly")}
              className={cn(
                "rounded-xl px-2.5 py-1.5 text-[11px] font-black transition",
                granularity === "weekly" ? "bg-panel-strong text-ink shadow-soft border border-line" : "text-muted-foreground hover:text-ink"
              )}
            >
              Mingguan
            </button>
            <button
              type="button"
              onClick={() => setGranularity("semester")}
              className={cn(
                "rounded-xl px-2.5 py-1.5 text-[11px] font-black transition",
                granularity === "semester" || granularity === "6months" ? "bg-panel-strong text-ink shadow-soft border border-line" : "text-muted-foreground hover:text-ink"
              )}
            >
              Semester
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
          </div>
        </div>

        {(() => {
          const totalIncome = trendPeriods.reduce((s, p) => s + p.income, 0);
          const totalExpense = trendPeriods.reduce((s, p) => s + p.expense, 0);
          const status = getExpenseIncomeStatus(totalIncome, totalExpense);
          const net = totalIncome - totalExpense;
          return (
            <div
              className={cn(
                "mb-4 rounded-[22px] border p-3.5 shadow-soft transition",
                status.tone === "surplus"
                  ? "border-green-border bg-green-bg/60"
                  : status.tone === "deficit"
                    ? "border-red-border bg-red-bg/60"
                    : "border-line bg-soft"
              )}
            >
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={cn(
                      "inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-[10.5px] font-black uppercase tracking-wider",
                      status.tone === "surplus"
                        ? "bg-green text-white"
                        : status.tone === "deficit"
                          ? "bg-red text-white"
                          : "bg-muted-foreground text-white"
                    )}
                  >
                    {status.label}
                  </span>
                  <span className="text-[11px] font-semibold text-muted-foreground truncate">
                    {status.description}
                  </span>
                </div>
                <span className="text-[10px] font-black text-muted-foreground shrink-0 uppercase tracking-wider">
                  {granularity === "daily" ? "Siklus Ini" : granularity === "weekly" ? "8 Minggu" : granularity === "yearly" ? "5 Tahun" : "1 Semester"}
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
                  <strong
                    className={cn(
                      "text-xs sm:text-[13px] font-black tracking-tight",
                      net >= 0 ? "text-green" : "text-red"
                    )}
                  >
                    {net >= 0 ? "+" : ""}
                    {formatCurrency(net)}
                  </strong>
                </div>
              </div>
            </div>
          );
        })()}

        <TrendBars periods={trendPeriods} />
      </section>

      {/* Penggunaan Alokasi */}
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

      {/* Transaksi Periode Ini */}
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

      {/* Filter Sheet Modal */}
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
