import { useMemo, useState, type FormEvent, type MouseEvent } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  ChevronDown,
  Copy,
  Edit3,
  PiggyBank,
  Plus,
  ShieldCheck,
  Sparkles,
  Tag,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import ConfirmDialog from "@/components/ConfirmDialog";
import FinanceDetailModal from "@/components/FinanceDetailModal";
import { cn } from "@/lib/utils";
import { formatRupiah, sanitizeNumericInput } from "@/utils/format";
import { getBudgetUsage } from "@/utils/calculations";
import {
  formatBudgetCycleLabel,
  formatBudgetCycleRange,
  getBudgetCycleRange,
  getBudgetCycleTransactions,
  getCurrentBudgetCycle,
  isDateInBudgetCycle,
} from "@/utils/budgetCycle";
import {
  CategoryPickerModal,
  CategoryTriggerButton,
  WalletPickerModal,
  WalletTriggerButton,
} from "@/components/Pickers";
import type { Account, Budget, Category, Transaction } from "@/types";

interface BudgetForm {
  name: string;
  amount: string;
  accountId: string;
  categoryId: string;
  month: number;
  year: number;
  note: string;
}

const createEmptyBudgetForm = (cycle: { month: number; year: number } = getCurrentBudgetCycle()): BudgetForm => ({
  name: "",
  amount: "",
  accountId: "",
  categoryId: "",
  month: Number(cycle.month),
  year: Number(cycle.year),
  note: "",
});

function getProgressTone(progressRaw: number, isOverBudget = false) {
  if (isOverBudget || progressRaw >= 100) return "red";
  if (progressRaw >= 75) return "amber";
  return "green";
}

function getUsageMeta(budget: Budget, transactions: Transaction[]) {
  const usage = getBudgetUsage(budget, transactions);
  const progressRaw =
    Number(budget.amount || 0) > 0 ? Math.round((Number(usage.used || 0) / Number(budget.amount || 0)) * 100) : 0;
  const overBudgetAmount = Math.max(0, Math.abs(Math.min(Number(usage.remaining || 0), 0)));

  return {
    usage,
    progressRaw,
    progress: Math.min(100, progressRaw),
    overBudget: overBudgetAmount > 0,
    overBudgetAmount,
    tone: getProgressTone(progressRaw, overBudgetAmount > 0),
  };
}

const fieldClassName =
  "h-12 w-full rounded-2xl border border-field-border bg-field-bg px-4 text-sm font-semibold text-ink outline-none placeholder:font-medium focus:border-rose-strong focus:ring-4 focus:ring-rose-bg";

const labelClassName = "text-xs font-extrabold tracking-wide text-muted-foreground";

export default function Budgets() {
  const {
    user,
    budgets,
    transactions,
    accountBalances,
    categories,
    familyMembers,
    currentMember,
    addBudget,
    updateBudget,
    deleteBudget: deleteBudgetFromContext,
    addCategory,
    notify,
  } = useApp();

  const initialCycle = useMemo(() => getCurrentBudgetCycle(), []);
  const [selectedCycle, setSelectedCycle] = useState({ month: Number(initialCycle.month), year: Number(initialCycle.year) });
  const [form, setForm] = useState<BudgetForm>(() => createEmptyBudgetForm(initialCycle));
  const [formOpen, setFormOpen] = useState(false);
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const [walletPickerOpen, setWalletPickerOpen] = useState(false);
  const [walletFilterMode, setWalletFilterMode] = useState<"mine" | "all">("mine");
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [detailBudget, setDetailBudget] = useState<Budget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Budget | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const canManageBudget = ["owner", "admin"].includes(currentMember?.role);
  const currentUserId = user?.id || "";
  const cycleRange = formatBudgetCycleRange(selectedCycle.month, selectedCycle.year);
  const cycleTransactions = useMemo(
    () => getBudgetCycleTransactions(transactions, selectedCycle.month, selectedCycle.year) as Transaction[],
    [transactions, selectedCycle.month, selectedCycle.year]
  );

  const filteredBudgets = useMemo(
    () =>
      (budgets as Budget[])
        .filter(
          (budget) => Number(budget.month) === Number(selectedCycle.month) && Number(budget.year) === Number(selectedCycle.year)
        )
        .sort((a, b) => a.name.localeCompare(b.name, "id")),
    [budgets, selectedCycle.month, selectedCycle.year]
  );

  const expenseCategories = useMemo(
    () => (categories as Category[]).filter((c) => c.type === "expense"),
    [categories]
  );

  const selectedCategory = useMemo(
    () => (categories as Category[]).find((c) => c.id === form.categoryId) || null,
    [categories, form.categoryId]
  );

  const selectedAccount = useMemo(
    () => (accountBalances as Account[]).find((a) => a.id === form.accountId) || null,
    [accountBalances, form.accountId]
  );

  const handleAddCategory = async (name: string, type: "expense" | "income"): Promise<Category | null> => {
    try {
      const created = await addCategory({ name, type });
      if (created) {
        setForm((prev) => ({ ...prev, categoryId: created.id }));
      }
      return created;
    } catch (error) {
      notify(error instanceof Error ? error.message : "Gagal menambah kategori.");
      return null;
    }
  };

  const totals = filteredBudgets.reduce(
    (acc, budget) => {
      const { usage, overBudgetAmount } = getUsageMeta(budget, cycleTransactions);
      acc.total += Number(budget.amount || 0);
      acc.used += Number(usage.used || 0);
      acc.remaining += Number(usage.remaining || 0);
      acc.overBudget += overBudgetAmount;
      return acc;
    },
    { total: 0, used: 0, remaining: 0, overBudget: 0 }
  );

  const totalProgressRaw = totals.total > 0 ? Math.round((totals.used / totals.total) * 100) : 0;
  const totalProgress = Math.min(100, totalProgressRaw);
  const totalTone = getProgressTone(totalProgressRaw, totals.overBudget > 0);

  const [statusFilter, setStatusFilter] = useState<"all" | "attention" | "safe">("all");
  const [copying, setCopying] = useState(false);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const activeCycleRangeObj = useMemo(
    () => getBudgetCycleRange(selectedCycle.month, selectedCycle.year),
    [selectedCycle.month, selectedCycle.year]
  );

  const isCurrentCycle = useMemo(() => {
    return isDateInBudgetCycle(today, selectedCycle.month, selectedCycle.year);
  }, [today, selectedCycle.month, selectedCycle.year]);

  const daysLeftInCycle = useMemo(() => {
    const end = new Date(activeCycleRangeObj.endDate);
    end.setHours(0, 0, 0, 0);
    return Math.max(1, Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  }, [activeCycleRangeObj.endDate, today]);

  const prevCycle = useMemo(() => {
    return selectedCycle.month === 1
      ? { month: 12, year: selectedCycle.year - 1 }
      : { month: selectedCycle.month - 1, year: selectedCycle.year };
  }, [selectedCycle.month, selectedCycle.year]);

  const prevCycleBudgets = useMemo(() => {
    return (budgets as Budget[]).filter(
      (b) => Number(b.month) === prevCycle.month && Number(b.year) === prevCycle.year
    );
  }, [budgets, prevCycle.month, prevCycle.year]);

  const copiableBudgets = useMemo(() => {
    const currentCategoryIds = new Set(filteredBudgets.map((b) => b.categoryId).filter(Boolean));
    return prevCycleBudgets.filter((b) => b.categoryId && !currentCategoryIds.has(b.categoryId));
  }, [filteredBudgets, prevCycleBudgets]);

  const handleCopyFromPrevious = async () => {
    if (!canManageBudget || !copiableBudgets.length || copying) return;
    try {
      setCopying(true);
      const fallbackAccountId = (accountBalances as Account[]).find((a) => a.isActive)?.id || "";
      let copiedCount = 0;
      for (const b of copiableBudgets) {
        await addBudget({
          name: b.name,
          amount: b.amount,
          accountId: b.accountId || fallbackAccountId,
          categoryId: b.categoryId,
          month: selectedCycle.month,
          year: selectedCycle.year,
          note: b.note || "",
        });
        copiedCount += 1;
      }
      notify(`Berhasil menyalin ${copiedCount} anggaran dari periode sebelumnya.`);
    } catch (err) {
      notify(err instanceof Error ? err.message : "Gagal menyalin anggaran.");
    } finally {
      setCopying(false);
    }
  };

  const unbudgetedExpenses = useMemo(() => {
    const budgetedCategoryIds = new Set(filteredBudgets.map((b) => b.categoryId).filter(Boolean));
    const map = new Map<string, { categoryId: string; name: string; total: number; count: number }>();

    cycleTransactions.forEach((trx) => {
      if (trx.type !== "expense") return;
      const catId = trx.categoryId;
      if (catId && !budgetedCategoryIds.has(catId)) {
        const cat = (categories as Category[]).find((c) => c.id === catId);
        const current = map.get(catId) || {
          categoryId: catId,
          name: cat?.name || "Kategori Lain",
          total: 0,
          count: 0,
        };
        current.total += Number(trx.amount || 0);
        current.count += 1;
        map.set(catId, current);
      }
    });

    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [cycleTransactions, filteredBudgets, categories]);

  const totalUnbudgeted = useMemo(() => {
    return unbudgetedExpenses.reduce((sum, item) => sum + item.total, 0);
  }, [unbudgetedExpenses]);

  const openCreateForCategory = (catId: string, suggestedAmount?: number) => {
    const cat = (categories as Category[]).find((c) => c.id === catId);
    setEditingBudget(null);
    setForm({
      name: cat?.name || "",
      amount: suggestedAmount ? String(suggestedAmount) : "",
      accountId: (accountBalances as Account[]).find((a) => a.isActive)?.id || "",
      categoryId: catId,
      month: Number(selectedCycle.month),
      year: Number(selectedCycle.year),
      note: "",
    });
    setCategoryPickerOpen(false);
    setWalletPickerOpen(false);
    setFormOpen(true);
  };

  const statusCounts = useMemo(() => {
    let attention = 0;
    let safe = 0;
    filteredBudgets.forEach((b) => {
      const meta = getUsageMeta(b, cycleTransactions);
      if (meta.overBudget || meta.progressRaw >= 80) attention += 1;
      else safe += 1;
    });
    return { all: filteredBudgets.length, attention, safe };
  }, [filteredBudgets, cycleTransactions]);

  const displayedBudgets = useMemo(() => {
    if (statusFilter === "all") return filteredBudgets;
    return filteredBudgets.filter((b) => {
      const meta = getUsageMeta(b, cycleTransactions);
      if (statusFilter === "attention") return meta.overBudget || meta.progressRaw >= 80;
      return !meta.overBudget && meta.progressRaw < 80;
    });
  }, [filteredBudgets, statusFilter, cycleTransactions]);

  const setField = (key: keyof BudgetForm, value: string | number) => setForm((prev) => ({ ...prev, [key]: value }));

  const openCreateForm = () => {
    setEditingBudget(null);
    setForm(createEmptyBudgetForm(selectedCycle));
    setCategoryPickerOpen(false);
    setWalletPickerOpen(false);
    setFormOpen(true);
  };

  const closeForm = () => {
    setEditingBudget(null);
    setForm(createEmptyBudgetForm(selectedCycle));
    setCategoryPickerOpen(false);
    setWalletPickerOpen(false);
    setFormOpen(false);
  };

  const changeCycle = (key: "month" | "year", value: string) => {
    const next = { ...selectedCycle, [key]: Number(value) };
    setSelectedCycle(next);
    if (!editingBudget) setForm((prev) => ({ ...prev, [key]: Number(value) }));
  };

  const submitBudget = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    try {
      setSubmitting(true);
      if (!canManageBudget) throw new Error("Hanya owner atau admin yang bisa mengelola anggaran.");
      if (!form.categoryId) throw new Error("Kategori pengeluaran wajib dipilih.");
      if (Number(form.amount || 0) <= 0) throw new Error("Nominal anggaran harus lebih dari 0.");

      const fallbackAccountId = (accountBalances as Account[]).find((a) => a.isActive)?.id || "";
      const accountId = form.accountId || fallbackAccountId;

      const payload = {
        name: form.name.trim() || selectedCategory?.name || "Anggaran",
        amount: Number(form.amount || 0),
        accountId,
        categoryId: form.categoryId,
        month: Number(form.month),
        year: Number(form.year),
        note: form.note?.trim() || "",
      };

      if (editingBudget) {
        await updateBudget?.(editingBudget.id, payload);
      } else {
        await addBudget(payload);
      }

      setSelectedCycle({ month: Number(payload.month), year: Number(payload.year) });
      closeForm();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Gagal menyimpan alokasi.");
    } finally {
      setSubmitting(false);
    }
  };

  const startEditBudget = (budget: Budget, event: MouseEvent) => {
    event?.stopPropagation();
    setEditingBudget(budget);
    setForm({
      name: budget.name || "",
      amount: String(budget.amount || ""),
      accountId: budget.accountId || "",
      categoryId: budget.categoryId || "",
      month: Number(budget.month),
      year: Number(budget.year),
      note: budget.note || "",
    });
    setFormOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const confirmRemoveBudget = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      if (!canManageBudget) throw new Error("Hanya owner atau admin yang bisa menghapus alokasi.");
      await deleteBudgetFromContext?.(deleteTarget.id);
      if (editingBudget?.id === deleteTarget.id) closeForm();
      setDeleteTarget(null);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Alokasi gagal dihapus.");
    } finally {
      setDeleting(false);
    }
  };

  const deleteMessage = (() => {
    if (!deleteTarget) return "";
    const { usage } = getUsageMeta(deleteTarget, cycleTransactions);
    return usage.used > 0
      ? `Anggaran "${deleteTarget.name}" sudah memiliki pengeluaran ${formatRupiah(usage.used)}. Tetap hapus?`
      : `Hapus anggaran "${deleteTarget.name}"?`;
  })();

  return (
    <div className="flex flex-col gap-4">
      <motion.header
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        className="px-0.5"
      >
        <p className="text-xs font-extrabold text-muted-foreground">Anggaran Belanja</p>
        <h1 className="font-display text-[clamp(22px,6.4vw,28px)] leading-tight tracking-tight text-ink">Anggaran keluarga</h1>
        <small className="text-[11px] text-muted-foreground">Batas maksimal belanja per kategori untuk periode gajian (tgl 25–24).</small>
      </motion.header>

      <section className="grid gap-4 rounded-[28px] border border-line-strong bg-panel-strong/90 p-4 shadow-soft backdrop-blur-xl">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-black tracking-[0.13em] text-muted-foreground uppercase">Periode aktif</p>
            <h2 className="font-display text-lg tracking-tight text-ink">
              {formatBudgetCycleLabel(selectedCycle.month, selectedCycle.year)}
            </h2>
            <small className="text-[11px] text-muted-foreground">{cycleRange}</small>
          </div>
          <div className="flex items-end gap-2">
            <label className="grid gap-1.5">
              <span className={labelClassName}>Bulan</span>
              <div className="relative">
                <select
                  value={selectedCycle.month}
                  onChange={(event) => changeCycle("month", event.target.value)}
                  className={cn(fieldClassName, "w-24 appearance-none pr-9")}
                >
                  {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => (
                    <option key={month} value={month}>
                      {String(month).padStart(2, "0")}
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground" />
              </div>
            </label>
            <label className="grid gap-1.5">
              <span className={labelClassName}>Tahun</span>
              <input
                type="number"
                value={selectedCycle.year}
                onChange={(event) => changeCycle("year", event.target.value)}
                className={cn(fieldClassName, "w-28")}
              />
            </label>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-[20px] border border-line bg-soft p-3">
            <span className="block text-[10px] font-extrabold text-muted-foreground">Total anggaran</span>
            <strong className="text-[13px] font-black text-ink">{formatRupiah(totals.total)}</strong>
          </div>
          <div className="rounded-[20px] border border-line bg-soft p-3">
            <span className="block text-[10px] font-extrabold text-muted-foreground">Terpakai</span>
            <strong className="text-[13px] font-black text-ink">{formatRupiah(totals.used)}</strong>
          </div>
          <div className={cn("rounded-[20px] border p-3", totals.remaining < 0 ? "border-red-border bg-red-bg" : "border-line bg-soft")}>
            <span className="block text-[10px] font-extrabold text-muted-foreground">Sisa bersih</span>
            <strong className={cn("text-[13px] font-black", totals.remaining < 0 ? "text-red" : "text-ink")}>
              {formatRupiah(totals.remaining)}
            </strong>
          </div>
          <div className={cn("rounded-[20px] border p-3", totals.overBudget > 0 ? "border-red-border bg-red-bg" : "border-line bg-soft")}>
            <span className="block text-[10px] font-extrabold text-muted-foreground">Over anggaran</span>
            <strong className={cn("text-[13px] font-black", totals.overBudget > 0 ? "text-red" : "text-ink")}>
              {formatRupiah(totals.overBudget)}
            </strong>
          </div>
        </div>

        <div className="grid gap-2">
          <div className="h-2.5 overflow-hidden rounded-full border border-line bg-soft">
            <div
              className={cn(
                "h-full rounded-full transition-[width] duration-300",
                totalTone === "red"
                  ? "bg-[linear-gradient(90deg,var(--red),var(--rose))]"
                  : totalTone === "amber"
                    ? "bg-[linear-gradient(90deg,var(--amber),var(--orange))]"
                    : "bg-[linear-gradient(90deg,var(--green),var(--teal))]"
              )}
              style={{ width: `${totalProgress}%` }}
            />
          </div>
          <small className="text-[11px] font-semibold text-muted-foreground">
            {totalProgressRaw}% terpakai · {totals.overBudget > 0 ? "ada kategori melewati batas anggaran" : "masih dalam batas aman anggaran"}
          </small>
        </div>
      </section>

      {canManageBudget && formOpen && (
        <section className="grid gap-4 rounded-[28px] border border-line-strong bg-panel-strong/90 p-4 shadow-soft backdrop-blur-xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black tracking-[0.13em] text-muted-foreground uppercase">
                {editingBudget ? "Edit Anggaran" : "Anggaran Baru"}
              </p>
              <h2 className="font-display text-lg tracking-tight text-ink">
                {editingBudget ? editingBudget.name : "Tambah Anggaran Kategori"}
              </h2>
              <small className="text-[11px] text-muted-foreground">
                Periode form: {formatBudgetCycleRange(form.month, form.year)}
              </small>
            </div>
            <button
              type="button"
              onClick={closeForm}
              aria-label="Tutup form alokasi"
              className="grid size-11 shrink-0 place-items-center rounded-[18px] border border-line bg-panel text-rose-dark shadow-soft transition hover:bg-rose-bg"
            >
              <X size={18} />
            </button>
          </div>

          <form className="grid gap-3" onSubmit={submitBudget}>
            <div className="grid gap-2">
              <label className={labelClassName}>
                Kategori Pengeluaran <span className="text-red">*</span>
              </label>
              <CategoryTriggerButton
                category={selectedCategory}
                placeholder="Pilih kategori pengeluaran..."
                onClick={() => setCategoryPickerOpen(true)}
              />
              <CategoryPickerModal
                open={categoryPickerOpen}
                title="Pilih Kategori Pengeluaran"
                type="expense"
                categories={expenseCategories}
                selectedCategoryId={form.categoryId}
                onSelect={(id) => setField("categoryId", id)}
                onClose={() => setCategoryPickerOpen(false)}
                canAddCategory={canManageBudget}
                onAddCategory={handleAddCategory}
              />
              <small className="text-[11px] font-semibold text-muted-foreground">
                Satu kategori hanya boleh memiliki satu alokasi anggaran per bulan.
              </small>
            </div>

            <div className="grid gap-2">
              <label className={labelClassName}>Nama Anggaran</label>
              <input
                value={form.name}
                onChange={(event) => setField("name", event.target.value)}
                placeholder={selectedCategory ? `Contoh: ${selectedCategory.name}` : "Otomatis nama kategori jika kosong"}
                className={fieldClassName}
              />
            </div>

            <div className="grid gap-2">
              <label className={labelClassName}>Nominal Batas Anggaran <span className="text-red">*</span></label>
              <input
                inputMode="numeric"
                type="text"
                value={form.amount}
                onChange={(event) => setField("amount", sanitizeNumericInput(event.target.value))}
                placeholder="Contoh: 1000000"
                className={fieldClassName}
              />
            </div>

            <div className="grid gap-2">
              <label className={labelClassName}>
                Dompet Acuan <span className="text-[10.5px] font-normal text-muted-foreground">(Opsional)</span>
              </label>
              <WalletTriggerButton
                account={selectedAccount}
                placeholder="Pilih dompet acuan (opsional)..."
                onClick={() => setWalletPickerOpen(true)}
              />
              <WalletPickerModal
                open={walletPickerOpen}
                title="Pilih Dompet Acuan"
                accounts={accountBalances}
                selectedAccountId={form.accountId}
                onSelect={(id) => setField("accountId", id)}
                onClose={() => setWalletPickerOpen(false)}
                currentUserId={currentUserId}
                familyMembers={familyMembers}
                filterMode={walletFilterMode}
                onFilterModeChange={setWalletFilterMode}
              />
              <small className="text-[10.5px] font-semibold text-muted-foreground">
                Pengeluaran kategori ini dari dompet manapun akan otomatis memotong anggaran.
              </small>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <label className={labelClassName}>Bulan periode</label>
                <select
                  value={form.month}
                  onChange={(event) => setField("month", Number(event.target.value))}
                  className={cn(fieldClassName, "appearance-none")}
                >
                  {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => (
                    <option key={month} value={month}>
                      {String(month).padStart(2, "0")}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <label className={labelClassName}>Tahun</label>
                <input
                  type="number"
                  value={form.year}
                  onChange={(event) => setField("year", Number(event.target.value))}
                  className={fieldClassName}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <label className={labelClassName}>Keterangan</label>
              <textarea
                value={form.note}
                onChange={(event) => setField("note", event.target.value)}
                placeholder="Opsional"
                className={cn(fieldClassName, "h-auto min-h-[76px] py-3")}
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={closeForm}
                className="h-12 flex-1 rounded-2xl border border-line bg-panel-strong text-sm font-black text-rose-dark shadow-soft transition hover:bg-rose-bg"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="h-12 flex-1 rounded-2xl border border-white/40 text-sm font-black text-on-accent shadow-accent transition hover:opacity-95 disabled:opacity-60 [background-image:var(--gradient-brand)]"
              >
                {submitting ? "Menyimpan..." : editingBudget ? "Simpan Perubahan" : "Simpan Anggaran"}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Smart Action 1: Salin Anggaran dari Periode Lalu */}
      {canManageBudget && copiableBudgets.length > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-[24px] border border-rose-border bg-rose-bg/40 p-3.5 shadow-soft">
          <div className="flex items-start gap-2.5 min-w-0">
            <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-rose-bg text-rose-dark border border-rose-border">
              <Copy size={15} />
            </span>
            <div className="min-w-0">
              <strong className="block text-xs font-black text-ink">
                Salin dari Periode Sebelumnya
              </strong>
              <p className="text-[11px] text-muted-foreground truncate">
                Tersedia {copiableBudgets.length} target anggaran dari periode {formatBudgetCycleLabel(prevCycle.month, prevCycle.year)}.
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={copying}
            onClick={handleCopyFromPrevious}
            className="shrink-0 rounded-2xl border border-line bg-panel px-3 py-1.5 text-xs font-black text-rose-dark shadow-soft transition hover:bg-rose-bg disabled:opacity-60"
          >
            {copying ? "Menyalin..." : "Salin"}
          </button>
        </div>
      )}

      {/* Smart Action 2: Pengeluaran Tanpa Anggaran */}
      {unbudgetedExpenses.length > 0 && (
        <div className="grid gap-2 rounded-[24px] border border-amber-500/30 bg-amber-500/10 p-3.5 shadow-soft">
          <div className="flex items-start gap-2.5">
            <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300">
              <AlertTriangle size={15} />
            </span>
            <div className="min-w-0 flex-1">
              <strong className="block text-xs font-black text-ink">
                Pengeluaran Tanpa Anggaran ({formatRupiah(totalUnbudgeted)})
              </strong>
              <p className="text-[11px] text-muted-foreground">
                Ada pengeluaran pada {unbudgetedExpenses.length} kategori yang belum memiliki target batas anggaran di periode ini.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {unbudgetedExpenses.map((unb) => (
              <div
                key={unb.categoryId}
                className="flex items-center gap-1.5 rounded-full border border-line bg-panel px-2.5 py-1 text-[11px] font-bold text-ink shadow-soft"
              >
                <span>{unb.name}:</span>
                <span className="text-red font-black">{formatRupiah(unb.total)}</span>
                {canManageBudget && (
                  <button
                    type="button"
                    onClick={() => openCreateForCategory(unb.categoryId, unb.total)}
                    className="ml-0.5 inline-flex items-center gap-0.5 rounded-full bg-rose-bg px-2 py-0.5 text-[10px] font-black text-rose-dark transition hover:bg-rose-strong hover:text-white"
                  >
                    <span>+ Anggarkan</span>
                    <ArrowRight size={10} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <section className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black tracking-[0.13em] text-muted-foreground uppercase">Anggaran Kategori</p>
            <h2 className="font-display text-lg tracking-tight text-ink">{filteredBudgets.length} anggaran aktif</h2>
          </div>
          <small className="text-[11px] text-muted-foreground">Ketuk kartu untuk melihat rincian.</small>
        </div>

        {/* Smart Action 3: Status Filter Chips */}
        {filteredBudgets.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-black transition",
                statusFilter === "all"
                  ? "border-rose-strong bg-rose-bg text-rose-dark shadow-soft"
                  : "border-line bg-panel text-muted-foreground hover:text-ink"
              )}
            >
              <span>Semua</span>
              <span className="rounded-full bg-soft px-1.5 py-0.2 text-[10px]">{statusCounts.all}</span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter("attention")}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-black transition",
                statusFilter === "attention"
                  ? "border-red-border bg-red-bg text-red shadow-soft"
                  : "border-line bg-panel text-muted-foreground hover:text-ink"
              )}
            >
              <span>Perlu Perhatian</span>
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.2 text-[10px] font-bold",
                  statusCounts.attention > 0 ? "bg-red text-white" : "bg-soft text-muted-foreground"
                )}
              >
                {statusCounts.attention}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter("safe")}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-black transition",
                statusFilter === "safe"
                  ? "border-green-border bg-green-bg text-green shadow-soft"
                  : "border-line bg-panel text-muted-foreground hover:text-ink"
              )}
            >
              <span>Aman</span>
              <span className="rounded-full bg-soft px-1.5 py-0.2 text-[10px]">{statusCounts.safe}</span>
            </button>
          </div>
        )}

        <div className="grid gap-3">
          {displayedBudgets.length ? (
            displayedBudgets.map((budget, idx) => {
              const account = (accountBalances as Account[]).find((item) => item.id === budget.accountId);
              const categoryName = (categories as Category[]).find((c) => c.id === budget.categoryId)?.name;
              const meta = getUsageMeta(budget, cycleTransactions);

              return (
                <motion.article
                  key={budget.id}
                  role="button"
                  tabIndex={0}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.05, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => setDetailBudget(budget)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") setDetailBudget(budget);
                  }}
                  className={cn(
                    "grid cursor-pointer gap-3 rounded-[26px] border bg-panel p-4 shadow-soft transition hover:-translate-y-0.5 hover:shadow-soft-hover",
                    meta.overBudget ? "border-red-border" : "border-line"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={cn(
                        "grid size-10 shrink-0 place-items-center rounded-2xl",
                        meta.overBudget ? "bg-red-bg text-red" : "bg-rose-bg text-rose-dark"
                      )}
                    >
                      <PiggyBank size={18} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <strong className="block truncate text-sm font-black text-ink">{budget.name}</strong>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        {categoryName && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-rose-border bg-rose-bg px-2 py-0.5 text-[10px] font-black text-rose-dark">
                            <Tag size={10} /> {categoryName}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
                          <Wallet size={12} /> {account?.name || "Lintas dompet"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {budget.note ? <p className="text-xs leading-relaxed font-semibold text-muted-foreground">{budget.note}</p> : null}

                  <div className="grid grid-cols-3 gap-2">
                    <span className="rounded-2xl border border-line bg-soft p-2.5">
                      <small className="block text-[10px] font-extrabold text-muted-foreground">Total</small>
                      <strong className="text-[12.5px] font-black text-ink">{formatRupiah(budget.amount)}</strong>
                    </span>
                    <span className="rounded-2xl border border-line bg-soft p-2.5">
                      <small className="block text-[10px] font-extrabold text-muted-foreground">Terpakai</small>
                      <strong className="text-[12.5px] font-black text-ink">{formatRupiah(meta.usage.used)}</strong>
                    </span>
                    <span className={cn("rounded-2xl border p-2.5", meta.overBudget ? "border-red-border bg-red-bg" : "border-line bg-soft")}>
                      <small className="block text-[10px] font-extrabold text-muted-foreground">
                        {meta.overBudget ? "Over" : "Sisa"}
                      </small>
                      <strong className={cn("text-[12.5px] font-black", meta.overBudget ? "text-red" : "text-ink")}>
                        {meta.overBudget ? formatRupiah(meta.overBudgetAmount) : formatRupiah(meta.usage.remaining)}
                      </strong>
                    </span>
                  </div>

                  <div className="grid gap-1.5">
                    <div className="h-2.5 overflow-hidden rounded-full border border-line bg-soft">
                      <div
                        className={cn(
                          "h-full rounded-full transition-[width] duration-300",
                          meta.tone === "red"
                            ? "bg-[linear-gradient(90deg,var(--red),var(--rose))]"
                            : meta.tone === "amber"
                              ? "bg-[linear-gradient(90deg,var(--amber),var(--orange))]"
                              : "bg-[linear-gradient(90deg,var(--green),var(--teal))]"
                        )}
                        style={{ width: `${meta.progress}%` }}
                      />
                    </div>
                    {/* Smart Action 4: Laju Belanja Harian (Daily Safe Pace) */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                      <small className="text-[11px] font-semibold text-muted-foreground">{meta.progressRaw}% terpakai</small>
                      {meta.overBudget ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-red-border bg-red-bg px-2 py-0.5 text-[10.5px] font-black text-red">
                          <AlertTriangle size={11} /> Over {formatRupiah(meta.overBudgetAmount)}
                        </span>
                      ) : meta.usage.remaining > 0 && isCurrentCycle ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-green-border bg-green-bg px-2 py-0.5 text-[10.5px] font-black text-green">
                          <ShieldCheck size={12} /> Aman ~{formatRupiah(Math.floor(meta.usage.remaining / daysLeftInCycle))}/hari ({daysLeftInCycle} hr)
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-1">
                    <small className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
                      <CalendarDays size={12} /> {formatBudgetCycleRange(budget.month, budget.year)}
                    </small>
                    {canManageBudget && (
                      <span className="flex gap-2">
                        <button
                          type="button"
                          onClick={(event) => startEditBudget(budget, event)}
                          aria-label={`Edit anggaran ${budget.name}`}
                          className="inline-flex min-h-[32px] items-center gap-1 rounded-full border border-line bg-blue-bg px-3 py-1.5 text-[11px] font-black text-blue transition hover:opacity-80"
                        >
                          <Edit3 size={13} /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setDeleteTarget(budget);
                          }}
                          aria-label={`Hapus anggaran ${budget.name}`}
                          className="inline-flex min-h-[32px] items-center gap-1 rounded-full border border-line bg-red-bg px-3 py-1.5 text-[11px] font-black text-red transition hover:opacity-80"
                        >
                          <Trash2 size={13} /> Hapus
                        </button>
                      </span>
                    )}
                  </div>
                </motion.article>
              );
            })
          ) : filteredBudgets.length > 0 ? (
            <div className="rounded-[24px] border border-line bg-panel p-6 text-center shadow-soft">
              <p className="text-xs font-semibold text-muted-foreground">
                Tidak ada anggaran dengan status &quot;{statusFilter === "attention" ? "Perlu Perhatian" : "Aman"}&quot;.
              </p>
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className="mt-2 text-xs font-black text-rose-dark hover:underline"
              >
                Lihat Semua Anggaran ({filteredBudgets.length})
              </button>
            </div>
          ) : (
            <section className="rounded-[28px] border border-dashed border-line-strong bg-panel-strong/90 p-6 text-center shadow-soft">
              <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-rose-bg text-rose-dark">
                <Sparkles size={20} />
              </div>
              <h3 className="mt-3 font-display text-sm font-black text-ink">Belum ada anggaran</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Mulai atur keuangan gajian 25–24 dengan menentukan batas belanja kategori pertama agar pengeluaran keluarga lebih terencana.
              </p>
              {canManageBudget ? (
                <p className="mt-2 text-[11px] font-semibold text-muted-foreground">Tap tombol di bawah untuk menambah anggaran.</p>
              ) : (
                <p className="mt-2 text-[11px] font-semibold text-muted-foreground">Minta owner/admin untuk menambah anggaran.</p>
              )}
            </section>
          )}
        </div>
        {canManageBudget && (
          <button
            type="button"
            onClick={openCreateForm}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-white/40 text-sm font-black text-on-accent shadow-accent transition hover:opacity-95 [background-image:var(--gradient-brand)]"
          >
            <Plus size={18} /> Tambah Anggaran Kategori
          </button>
        )}
      </section>

      <FinanceDetailModal
        open={Boolean(detailBudget)}
        type="budget"
        item={detailBudget}
        transactions={transactions}
        budgets={budgets}
        accountBalances={accountBalances}
        onClose={() => setDetailBudget(null)}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Hapus anggaran ini?"
        message={deleteMessage}
        confirmLabel="Hapus Anggaran"
        busyLabel="Menghapus..."
        busy={deleting}
        onConfirm={confirmRemoveBudget}
        onCancel={() => {
          if (!deleting) setDeleteTarget(null);
        }}
      />
    </div>
  );
}
