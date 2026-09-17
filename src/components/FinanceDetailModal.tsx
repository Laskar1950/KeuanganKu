import { useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays, CreditCard, PiggyBank, TrendingDown, TrendingUp, Wallet, X } from "lucide-react";
import { ProgressBar } from "./UI";
import { cn } from "@/lib/utils";
import { formatRupiah } from "@/utils/format";
import { getBudgetUsage } from "@/utils/calculations";
import { getBudgetCycleTransactions, formatBudgetCycleRange } from "@/utils/budgetCycle";
import type { Account, Budget, Transaction } from "@/types";

interface FinanceDetailModalProps {
  open: boolean;
  type: string;
  item: (Account & { month?: number; year?: number }) | Budget | null;
  transactions?: Transaction[];
  budgets?: Budget[];
  accountBalances?: Account[];
  onClose: () => void;
}

function totalByType(transactions: Transaction[], type: "income" | "expense") {
  return transactions.filter((trx) => trx.type === type).reduce((sum, trx) => sum + Number(trx.amount || 0), 0);
}

function formatDate(value?: string) {
  if (!value) return "-";
  try {
    return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
  } catch {
    return value;
  }
}

function TransactionRow({
  transaction,
  account,
  budget,
}: {
  transaction: Transaction;
  account?: Account | { name: string };
  budget?: Budget;
}) {
  const isIncome = transaction.type === "income";
  return (
    <div className="flex items-center gap-2.5 rounded-2xl border border-line bg-soft p-2.5">
      <span
        className={cn(
          "grid size-8 shrink-0 place-items-center rounded-xl",
          isIncome ? "bg-green-bg text-green" : "bg-red-bg text-red"
        )}
      >
        {isIncome ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
      </span>
      <div className="min-w-0 flex-1">
        <strong className="block truncate text-xs font-black text-ink">
          {transaction.note || (isIncome ? "Pemasukan" : "Pengeluaran")}
        </strong>
        <small className="block truncate text-[10.5px] font-semibold text-muted-foreground">
          {formatDate(transaction.transactionDate)}
          {account?.name ? ` • ${account.name}` : ""}
          {budget?.name ? ` • ${budget.name}` : ""}
        </small>
      </div>
      <strong className={cn("shrink-0 text-xs font-black", isIncome ? "text-green" : "text-red")}>
        {isIncome ? "+" : "-"}
        {formatRupiah(transaction.amount)}
      </strong>
    </div>
  );
}

export default function FinanceDetailModal({
  open,
  type,
  item,
  transactions = [],
  budgets = [],
  accountBalances = [],
  onClose,
}: FinanceDetailModalProps) {
  const data = useMemo(() => {
    if (!item) {
      return {
        title: "",
        subtitle: "",
        income: 0,
        expense: 0,
        transactions: [] as Transaction[],
        relatedBudgets: [] as Budget[],
        usage: null as ReturnType<typeof getBudgetUsage> | null,
        sourceIncome: [] as Transaction[],
      };
    }

    if (type === "wallet") {
      const wallet = item as Account;
      const walletTransactions = transactions
        .filter((trx) => trx.accountId === wallet.id)
        .sort(
          (a, b) =>
            String(b.transactionDate).localeCompare(String(a.transactionDate)) ||
            String(b.createdAt).localeCompare(String(a.createdAt))
        );
      const relatedBudgets = budgets.filter((budget) => budget.accountId === wallet.id);

      return {
        title: wallet.name,
        subtitle: "Detail dompet keluarga",
        income: totalByType(walletTransactions, "income"),
        expense: totalByType(walletTransactions, "expense"),
        transactions: walletTransactions,
        relatedBudgets,
        usage: null,
        sourceIncome: [],
      };
    }

    const budgetItem = item as Budget & { month: number; year: number };
    const budgetTransactions = transactions
      .filter((trx) => trx.budgetId === budgetItem.id)
      .sort(
        (a, b) =>
          String(b.transactionDate).localeCompare(String(a.transactionDate)) ||
          String(b.createdAt).localeCompare(String(a.createdAt))
      );
    const sourceAccount = accountBalances.find((account) => account.id === budgetItem.accountId);
    const sameMonthTransactions = getBudgetCycleTransactions(transactions, budgetItem.month, budgetItem.year);
    const sourceIncome = sameMonthTransactions.filter(
      (trx) => trx.type === "income" && trx.accountId === budgetItem.accountId
    );
    const usage = getBudgetUsage(budgetItem, sameMonthTransactions);

    return {
      title: budgetItem.name,
      subtitle: `${formatBudgetCycleRange(budgetItem.month, budgetItem.year)} • ${sourceAccount?.name || "Dompet tidak ditemukan"}`,
      income: totalByType(sourceIncome, "income"),
      expense: totalByType(budgetTransactions, "expense"),
      transactions: [...budgetTransactions],
      relatedBudgets: [] as Budget[],
      usage,
      sourceIncome,
    };
  }, [accountBalances, budgets, item, transactions, type]);

  const accountName = (accountId?: string | null) => accountBalances.find((account) => account.id === accountId)?.name || "";
  const budgetName = (budgetId?: string | null) => budgets.find((budget) => budget.id === budgetId)?.name || "";

  return (
    <AnimatePresence>
      {open && item && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-backdrop p-3 backdrop-blur-[10px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.section
            className="max-h-[85vh] w-full max-w-[430px] overflow-y-auto rounded-[32px] border border-sheet-border bg-sheet-bg p-4 shadow-[0_-26px_70px_rgba(0,0,0,0.18)]"
            initial={{ y: 48, opacity: 0.98 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 48, opacity: 0.98 }}
            transition={{ type: "spring", stiffness: 260, damping: 28 }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-black tracking-[0.13em] text-muted-foreground uppercase">
                  {type === "wallet" ? "Dompet" : "Alokasi Anggaran"}
                </p>
                <h2 className="truncate font-display text-lg tracking-tight text-ink">{data.title}</h2>
                <small className="block text-[11px] font-semibold text-muted-foreground">{data.subtitle}</small>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Tutup detail"
                className="grid size-10 shrink-0 place-items-center rounded-[16px] border border-line bg-panel text-rose-dark transition hover:bg-rose-bg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2.5">
              <div className="grid gap-1 rounded-[20px] border border-green-border bg-green-bg p-3">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold text-muted-foreground">
                  <TrendingUp size={15} className="text-green" /> Pemasukan
                </span>
                <strong className="text-[12.5px] font-black text-green">{formatRupiah(data.income)}</strong>
              </div>
              <div className="grid gap-1 rounded-[20px] border border-red-border bg-red-bg p-3">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold text-muted-foreground">
                  <TrendingDown size={15} className="text-red" /> Pengeluaran
                </span>
                <strong className="text-[12.5px] font-black text-red">{formatRupiah(data.expense)}</strong>
              </div>
              {type === "wallet" ? (
                <div className="grid gap-1 rounded-[20px] border border-line bg-soft p-3">
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold text-muted-foreground">
                    <Wallet size={15} /> Saldo saat ini
                  </span>
                  <strong className="text-[12.5px] font-black text-ink">
                    {formatRupiah((item as Account).currentBalance ?? (item as Account).initialBalance ?? 0)}
                  </strong>
                </div>
              ) : (
                <div className="grid gap-1 rounded-[20px] border border-line bg-soft p-3">
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold text-muted-foreground">
                    <PiggyBank size={15} /> Sisa alokasi
                  </span>
                  <strong className="text-[12.5px] font-black text-ink">{formatRupiah(data.usage?.remaining || 0)}</strong>
                </div>
              )}
            </div>

            {type === "wallet" && (
              <div className="mt-4 grid gap-2.5">
                <div className="flex items-center gap-2 text-xs font-black text-ink">
                  <PiggyBank size={16} className="text-rose-dark" />
                  <strong>Alokasi dari dompet ini</strong>
                </div>
                {data.relatedBudgets.length ? (
                  <div className="grid gap-2">
                    {data.relatedBudgets.map((budget) => {
                      const usage = getBudgetUsage(budget, getBudgetCycleTransactions(transactions, budget.month, budget.year));
                      const progress = budget.amount > 0 ? Math.min(100, Math.round((usage.used / budget.amount) * 100)) : 0;
                      return (
                        <div key={budget.id} className="grid gap-2 rounded-2xl border border-line bg-soft p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <strong className="block truncate text-xs font-black text-ink">{budget.name}</strong>
                              <small className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-muted-foreground">
                                <CalendarDays size={12} /> {String(budget.month).padStart(2, "0")}/{budget.year}
                              </small>
                            </div>
                            <div className="text-right">
                              <strong className="block text-xs font-black text-ink">{formatRupiah(usage.remaining)}</strong>
                              <small className="block text-[10.5px] font-semibold text-muted-foreground">
                                Sisa dari {formatRupiah(budget.amount)}
                              </small>
                            </div>
                          </div>
                          <ProgressBar value={progress} variant={usage.remaining < 0 ? "red" : ""} />
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="rounded-2xl border border-line bg-soft p-4 text-center text-xs font-semibold text-muted-foreground">
                    Belum ada alokasi yang memakai dompet ini.
                  </p>
                )}
              </div>
            )}

            {type === "budget" && data.sourceIncome.length > 0 && (
              <div className="mt-4 grid gap-2.5">
                <div className="flex items-center gap-2 text-xs font-black text-ink">
                  <CreditCard size={16} className="text-rose-dark" />
                  <strong>Pemasukan ke dompet sumber pada periode alokasi</strong>
                </div>
                <div className="grid gap-2">
                  {data.sourceIncome.map((trx) => (
                    <TransactionRow key={trx.id} transaction={trx} account={{ name: accountName(trx.accountId) }} />
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4 grid gap-2.5">
              <div className="flex items-center gap-2 text-xs font-black text-ink">
                <CreditCard size={16} className="text-rose-dark" />
                <strong>{type === "wallet" ? "Transaksi pada dompet ini" : "Pengeluaran pada alokasi ini"}</strong>
              </div>
              {data.transactions.length ? (
                <div className="grid gap-2">
                  {data.transactions.map((trx) => (
                    <TransactionRow
                      key={trx.id}
                      transaction={trx}
                      account={{ name: accountName(trx.accountId) }}
                      budget={{ name: budgetName(trx.budgetId) } as Budget}
                    />
                  ))}
                </div>
              ) : (
                <p className="rounded-2xl border border-line bg-soft p-4 text-center text-xs font-semibold text-muted-foreground">
                  Belum ada transaksi terkait.
                </p>
              )}
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
