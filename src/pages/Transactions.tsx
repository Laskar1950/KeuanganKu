import { useEffect, useMemo, useState } from "react";
import { ListFilter, Plus, RotateCcw, Search } from "lucide-react";
import { useApp } from "@/context/AppContext";
import TransactionList from "@/components/TransactionList";
import ConfirmDialog from "@/components/ConfirmDialog";
import { cn } from "@/lib/utils";
import { formatRupiah } from "@/utils/format";
import { useDebounce } from "@/utils/useDebounce";
import type { Account, Budget, Category, FamilyMember, Transaction } from "@/types";

const PAGE_SIZE = 20;

interface TransactionsProps {
  onEdit: (trx: Transaction) => void;
  onAdd: () => void;
}

interface TransactionFilters {
  creatorId: string;
  accountId: string;
  categoryId: string;
  budgetId: string;
  startDate: string;
  endDate: string;
}

const emptyFilters: TransactionFilters = {
  creatorId: "all",
  accountId: "all",
  categoryId: "all",
  budgetId: "all",
  startDate: "",
  endDate: "",
};

const selectClassName =
  "h-12 w-full rounded-2xl border border-field-border bg-field-bg px-4 text-sm font-semibold text-ink outline-none focus:border-rose-strong focus:ring-4 focus:ring-rose-bg";

const dateInputClassName =
  "h-12 w-full rounded-2xl border border-field-border bg-field-bg px-4 text-sm font-semibold text-ink outline-none focus:border-rose-strong focus:ring-4 focus:ring-rose-bg";

const labelClassName = "text-xs font-extrabold tracking-wide text-muted-foreground";

export default function Transactions({ onEdit, onAdd }: TransactionsProps) {
  const {
    user,
    permissions,
    transactions,
    transactionsHasMore,
    loadMoreTransactions,
    categories,
    budgets,
    accountBalances,
    familyMembers,
    deleteTransaction,
    notify,
  } = useApp();

  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 250);
  const [type, setType] = useState("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState<TransactionFilters>(emptyFilters);
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loadingMore, setLoadingMore] = useState(false);

  const canEditTransaction = (trx: Transaction) => Boolean(permissions?.canManageAllTransactions || trx.createdBy === user?.id);
  const canDeleteTransaction = () => Boolean(permissions?.canDeleteTransactions);

  const filtered = useMemo(() => {
    const normalizedQuery = debouncedQuery.trim().toLowerCase();

    return (transactions as Transaction[]).filter((trx) => {
      const category = (categories as Category[]).find((cat) => cat.id === trx.categoryId);
      const budget = (budgets as Budget[]).find((item) => item.id === trx.budgetId);
      const account = (accountBalances as Account[]).find((acc) => acc.id === trx.accountId);
      const creator = trx.createdByProfile?.name || "";
      const creatorEmail = trx.createdByProfile?.email || "";

      const matchType = type === "all" || trx.type === type;
      const matchCreator = filters.creatorId === "all" || trx.createdBy === filters.creatorId;
      const matchAccount = filters.accountId === "all" || trx.accountId === filters.accountId;
      const matchCategory = filters.categoryId === "all" || trx.categoryId === filters.categoryId;
      const matchBudget = filters.budgetId === "all" || trx.budgetId === filters.budgetId;
      const matchStartDate = !filters.startDate || trx.transactionDate >= filters.startDate;
      const matchEndDate = !filters.endDate || trx.transactionDate <= filters.endDate;

      const text = [
        trx.note,
        trx.type === "income" ? "pemasukan" : "pengeluaran",
        category?.name,
        budget?.name,
        account?.name,
        account?.type,
        creator,
        creatorEmail,
        trx.transactionDate,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchQuery = !normalizedQuery || text.includes(normalizedQuery);

      return (
        matchType &&
        matchCreator &&
        matchAccount &&
        matchCategory &&
        matchBudget &&
        matchStartDate &&
        matchEndDate &&
        matchQuery
      );
    });
  }, [transactions, categories, budgets, accountBalances, debouncedQuery, type, filters]);

  const hasAdvancedFilter =
    filters.creatorId !== "all" ||
    filters.accountId !== "all" ||
    filters.categoryId !== "all" ||
    filters.budgetId !== "all" ||
    Boolean(filters.startDate) ||
    Boolean(filters.endDate);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [debouncedQuery, type, filters]);

  const visibleTransactions = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);
  const remainingTransactions = Math.max(0, filtered.length - visibleTransactions.length);

  const filteredIncome = filtered.filter((trx) => trx.type === "income").reduce((sum, trx) => sum + Number(trx.amount || 0), 0);
  const filteredExpense = filtered.filter((trx) => trx.type === "expense").reduce((sum, trx) => sum + Number(trx.amount || 0), 0);
  const incomeCategories = (categories as Category[]).filter((category) => category.type === "income");

  const resetFilters = () => {
    setQuery("");
    setType("all");
    setFilters(emptyFilters);
  };

  const handleLoadMore = async () => {
    try {
      setLoadingMore(true);
      await loadMoreTransactions();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Gagal memuat transaksi lama.");
    } finally {
      setLoadingMore(false);
    }
  };

  const handleDelete = (id: string) => {
    const target = (transactions as Transaction[]).find((trx) => trx.id === id) || null;
    setDeleteTarget(target);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await deleteTransaction(deleteTarget.id);
      setDeleteTarget(null);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Gagal menghapus transaksi.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center justify-between gap-3 px-0.5">
        <div>
          <p className="text-xs font-extrabold text-muted-foreground">Transaksi keluarga</p>
          <h1 className="font-display text-[clamp(22px,6.4vw,28px)] leading-tight tracking-tight text-ink">
            Riwayat Keuangan
          </h1>
        </div>
        <button
          type="button"
          aria-label="Tambah transaksi"
          onClick={onAdd}
          className="grid size-11 shrink-0 place-items-center rounded-[18px] border border-line bg-panel text-rose-dark shadow-soft transition hover:bg-rose-bg"
        >
          <Plus size={18} />
        </button>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-[24px] border border-green-border bg-green-bg p-3.5">
          <span className="block text-[11px] font-black text-muted-foreground">Pemasukan tampil</span>
          <strong className="mt-1 block font-display text-lg font-black tracking-tight text-green">
            {formatRupiah(filteredIncome)}
          </strong>
        </div>
        <div className="rounded-[24px] border border-red-border bg-red-bg p-3.5">
          <span className="block text-[11px] font-black text-muted-foreground">Pengeluaran tampil</span>
          <strong className="mt-1 block font-display text-lg font-black tracking-tight text-red">
            {formatRupiah(filteredExpense)}
          </strong>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        <label className="flex min-w-0 flex-1 items-center gap-2.5 rounded-[22px] border border-line bg-panel-strong/90 px-3.5 py-3 shadow-soft backdrop-blur-xl focus-within:border-rose-strong focus-within:ring-4 focus-within:ring-rose-bg">
          <Search size={18} className="shrink-0 text-muted-foreground" />
          <input
            placeholder="Cari transaksi, alokasi, catatan, dompet, anggota..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-muted-foreground"
          />
        </label>
        <button
          type="button"
          aria-label="Filter transaksi"
          onClick={() => setFilterOpen((value) => !value)}
          className={cn(
            "grid size-11 shrink-0 place-items-center rounded-[18px] border shadow-soft transition",
            filterOpen || hasAdvancedFilter
              ? "border-transparent text-on-accent [background-image:var(--gradient-brand)]"
              : "border-line bg-panel text-rose-dark hover:bg-rose-bg"
          )}
        >
          <ListFilter size={18} />
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {(
          [
            ["all", "Semua"],
            ["income", "Pemasukan"],
            ["expense", "Pengeluaran"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setType(id)}
            className={cn(
              "shrink-0 rounded-full border px-3.5 py-2.5 text-xs font-black transition",
              type === id
                ? "border-transparent text-on-accent shadow-accent [background-image:var(--gradient-brand)]"
                : "border-line bg-chip-bg text-muted-foreground hover:text-ink"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {filterOpen && (
        <section className="grid gap-4 rounded-[28px] border border-line-strong bg-panel-strong/90 p-4 shadow-soft backdrop-blur-xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black tracking-[0.13em] text-muted-foreground uppercase">Filter Detail</p>
              <h2 className="font-display text-lg tracking-tight text-ink">Saring Transaksi</h2>
            </div>
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-panel-strong px-3 py-2 text-[11px] font-black text-rose-dark transition hover:bg-rose-bg"
            >
              <RotateCcw size={13} /> Reset
            </button>
          </div>

          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <label className={labelClassName}>Anggota</label>
                <select
                  value={filters.creatorId}
                  onChange={(event) => setFilters({ ...filters, creatorId: event.target.value })}
                  className={selectClassName}
                >
                  <option value="all">Semua anggota</option>
                  {(familyMembers as FamilyMember[]).map((member) => (
                    <option value={member.userId} key={member.id}>
                      {member.profile?.name || member.profile?.email || "Anggota"}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-2">
                <label className={labelClassName}>Dompet</label>
                <select
                  value={filters.accountId}
                  onChange={(event) => setFilters({ ...filters, accountId: event.target.value })}
                  className={selectClassName}
                >
                  <option value="all">Semua dompet</option>
                  {(accountBalances as Account[]).map((account) => (
                    <option value={account.id} key={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <label className={labelClassName}>Alokasi Pengeluaran</label>
                <select
                  value={filters.budgetId}
                  onChange={(event) => setFilters({ ...filters, budgetId: event.target.value })}
                  className={selectClassName}
                >
                  <option value="all">Semua alokasi</option>
                  {(budgets as Budget[]).map((budget) => (
                    <option value={budget.id} key={budget.id}>
                      {budget.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-2">
                <label className={labelClassName}>Kategori Pemasukan</label>
                <select
                  value={filters.categoryId}
                  onChange={(event) => setFilters({ ...filters, categoryId: event.target.value })}
                  className={selectClassName}
                >
                  <option value="all">Semua kategori</option>
                  {incomeCategories.map((category) => (
                    <option value={category.id} key={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <label className={labelClassName}>Dari tanggal</label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(event) => setFilters({ ...filters, startDate: event.target.value })}
                  className={dateInputClassName}
                />
              </div>

              <div className="grid gap-2">
                <label className={labelClassName}>Sampai tanggal</label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(event) => setFilters({ ...filters, endDate: event.target.value })}
                  className={dateInputClassName}
                />
              </div>
            </div>
          </div>

          <p className="text-xs font-semibold text-muted-foreground">
            Menampilkan {filtered.length} dari {transactions.length} transaksi.
          </p>
        </section>
      )}

      <section className="grid gap-3">
        <TransactionList
          transactions={visibleTransactions}
          categories={categories}
          budgets={budgets}
          accounts={accountBalances}
          onEdit={onEdit}
          onDelete={handleDelete}
          canEdit={canEditTransaction}
          canDelete={canDeleteTransaction}
        />

        {remainingTransactions > 0 && (
          <button
            type="button"
            onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
            className="h-12 w-full rounded-2xl border border-line bg-panel-strong text-sm font-black text-rose-dark shadow-soft transition hover:bg-rose-bg"
          >
            Tampilkan lebih banyak ({remainingTransactions} transaksi tersisa)
          </button>
        )}

        {remainingTransactions === 0 && transactionsHasMore && (
          <button
            type="button"
            disabled={loadingMore}
            onClick={handleLoadMore}
            className="h-12 w-full rounded-2xl border border-line bg-panel-strong text-sm font-black text-rose-dark shadow-soft transition hover:bg-rose-bg disabled:opacity-60"
          >
            {loadingMore ? "Memuat..." : "Muat transaksi lama"}
          </button>
        )}
      </section>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Hapus transaksi ini?"
        message={
          deleteTarget
            ? `${deleteTarget.note || (deleteTarget.type === "income" ? "Pemasukan" : "Pengeluaran")} sebesar ${formatRupiah(deleteTarget.amount)} akan dihapus permanen dan saldo dompet ikut disesuaikan.`
            : ""
        }
        confirmLabel="Hapus Transaksi"
        busyLabel="Menghapus..."
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => {
          if (!deleting) setDeleteTarget(null);
        }}
      />
    </div>
  );
}
