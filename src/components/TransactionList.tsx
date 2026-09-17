import { Pencil, Trash2, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate, formatRupiah } from "@/utils/format";
import { EmptyState } from "./UI";
import type { Account, Budget, Category, Transaction } from "@/types";

const accountTypeLabel: Record<string, string> = {
  cash: "Tunai",
  bank: "Bank",
  ewallet: "E-Wallet",
  saving: "Tabungan",
  other: "Lainnya",
};

interface TransactionListProps {
  transactions: Transaction[];
  categories: Category[];
  budgets?: Budget[];
  accounts: Account[];
  onEdit?: (trx: Transaction) => void;
  onDelete?: (id: string) => void;
  canEdit?: (trx: Transaction) => boolean;
  canDelete?: (trx: Transaction) => boolean;
  compact?: boolean;
  hideAmounts?: boolean;
}

function getTransactionTitle(trx: Transaction, category?: Category, budget?: Budget) {
  const note = trx.note?.trim();
  if (note) return note;
  if (trx.type === "expense" && budget?.name) return budget.name;
  return category?.name || (trx.type === "income" ? "Pemasukan" : "Pengeluaran");
}

export default function TransactionList({
  transactions,
  categories,
  budgets = [],
  accounts,
  onEdit,
  onDelete,
  canEdit,
  canDelete,
  compact = false,
  hideAmounts = false,
}: TransactionListProps) {
  if (!transactions.length) {
    return (
      <EmptyState
        emoji="🧾"
        title="Belum ada transaksi"
        description="Tambahkan transaksi pertama Anda agar dashboard mulai terisi."
      />
    );
  }

  return (
    <div className="grid gap-2.5">
      {transactions.map((trx) => {
        const category = categories.find((cat) => cat.id === trx.categoryId);
        const budget = budgets.find((item) => item.id === trx.budgetId);
        const account = accounts.find((acc) => acc.id === trx.accountId);
        const isIncome = trx.type === "income";
        const title = getTransactionTitle(trx, category, budget);
        const creatorName = trx.createdByProfile?.name || "Anggota keluarga";
        const transactionGroup = isIncome ? category?.name || "Pemasukan" : budget?.name || "Tanpa Alokasi";
        const allowEdit = Boolean(onEdit) && (typeof canEdit === "function" ? canEdit(trx) : true);
        const allowDelete = Boolean(onDelete) && (typeof canDelete === "function" ? canDelete(trx) : true);

        return (
          <article
            key={trx.id}
            className={cn(
              "flex items-start gap-3 rounded-3xl border bg-panel shadow-soft backdrop-blur-xl",
              compact ? "p-2.5" : "p-3",
              isIncome ? "border-green-border" : "border-red-border"
            )}
          >
            <div
              className={cn(
                "grid size-[42px] shrink-0 place-items-center rounded-[17px] border border-line shadow-soft",
                isIncome ? "bg-green-bg text-green" : "bg-red-bg text-red"
              )}
            >
              {isIncome ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <h3 className="line-clamp-2 text-[13.5px] leading-snug font-black text-ink">{title}</h3>

                <span
                  className={cn(
                    "shrink-0 rounded-full border border-line px-2 py-1 text-[10px] font-black",
                    isIncome ? "bg-green-bg text-green" : "bg-red-bg text-red"
                  )}
                >
                  {isIncome ? "Masuk" : "Keluar"}
                </span>
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] font-bold text-muted-foreground">
                <span>{formatDate(trx.transactionDate)}</span>
                <span>•</span>
                <span>{transactionGroup}</span>
                <span>•</span>
                <span>Oleh {creatorName}</span>
              </div>

              <div className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-full border border-line bg-soft px-2.5 py-1.5 text-[11px] font-black text-muted-foreground">
                <Wallet size={13} />
                <span className="min-w-0 truncate">{account?.name || "Dompet tidak ditemukan"}</span>
                {account?.type && <em className="font-extrabold not-italic">{accountTypeLabel[account.type] || account.type}</em>}
              </div>

              {(allowEdit || allowDelete) && (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {allowEdit && (
                    <button
                      type="button"
                      onClick={() => onEdit?.(trx)}
                      className="inline-flex items-center gap-1 rounded-full border border-line bg-blue-bg px-2.5 py-1.5 text-[11px] font-black text-blue transition hover:opacity-80"
                    >
                      <Pencil size={13} /> Edit
                    </button>
                  )}

                  {allowDelete && (
                    <button
                      type="button"
                      onClick={() => onDelete?.(trx.id)}
                      className="inline-flex items-center gap-1 rounded-full border border-line bg-red-bg px-2.5 py-1.5 text-[11px] font-black text-red transition hover:opacity-80"
                    >
                      <Trash2 size={13} /> Hapus
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="max-w-[38%] shrink-0 pt-1 text-right">
              <p
                className={cn(
                  "text-[12.5px] leading-snug font-black whitespace-nowrap",
                  isIncome ? "text-green" : "text-red"
                )}
              >
                {hideAmounts ? "••••••" : `${isIncome ? "+" : "-"}${formatRupiah(trx.amount)}`}
              </p>
            </div>
          </article>
        );
      })}
    </div>
  );
}
