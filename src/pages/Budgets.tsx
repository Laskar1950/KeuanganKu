import { useMemo, useState, type FormEvent, type MouseEvent } from "react";
import { motion } from "framer-motion";
import { CalendarDays, ChevronDown, Edit3, PiggyBank, Plus, Sparkles, Trash2, Wallet, X } from "lucide-react";
import { useApp } from "@/context/AppContext";
import ConfirmDialog from "@/components/ConfirmDialog";
import FinanceDetailModal from "@/components/FinanceDetailModal";
import { cn } from "@/lib/utils";
import { formatRupiah, sanitizeNumericInput } from "@/utils/format";
import { getBudgetUsage } from "@/utils/calculations";
import {
  formatBudgetCycleLabel,
  formatBudgetCycleRange,
  getBudgetCycleTransactions,
  getCurrentBudgetCycle,
} from "@/utils/budgetCycle";
import type { Account, Budget, Transaction } from "@/types";

interface BudgetForm {
  name: string;
  amount: string;
  accountId: string;
  month: number;
  year: number;
  note: string;
}

const createEmptyBudgetForm = (cycle: { month: number; year: number } = getCurrentBudgetCycle()): BudgetForm => ({
  name: "",
  amount: "",
  accountId: "",
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
    currentMember,
    addBudget,
    updateBudget,
    deleteBudget: deleteBudgetFromContext,
    notify,
  } = useApp();

  const initialCycle = useMemo(() => getCurrentBudgetCycle(), []);
  const [selectedCycle, setSelectedCycle] = useState({ month: Number(initialCycle.month), year: Number(initialCycle.year) });
  const [form, setForm] = useState<BudgetForm>(() => createEmptyBudgetForm(initialCycle));
  const [formOpen, setFormOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [detailBudget, setDetailBudget] = useState<Budget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Budget | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showAllWallets, setShowAllWallets] = useState(false);

  const canManageBudget = ["owner", "admin"].includes(currentMember?.role);
  const isManager = ["owner", "admin"].includes(currentMember?.role || "");
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

  const budgetWalletOptions = useMemo(() => {
    const base = (accountBalances as Account[]).filter((a) => a.isActive !== false);
    return base.filter((acc) => {
      if ((acc as Account & { createdBy?: string | null }).createdBy == null) return true;
      if ((acc as Account & { createdBy?: string | null }).createdBy === currentUserId) return true;
      if (isManager && showAllWallets) return true;
      if (acc.id === form.accountId) return true;
      return false;
    });
  }, [accountBalances, currentUserId, isManager, showAllWallets, form.accountId]);

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

  const setField = (key: keyof BudgetForm, value: string | number) => setForm((prev) => ({ ...prev, [key]: value }));

  const openCreateForm = () => {
    setEditingBudget(null);
    setForm(createEmptyBudgetForm(selectedCycle));
    setFormOpen(true);
  };

  const closeForm = () => {
    setEditingBudget(null);
    setForm(createEmptyBudgetForm(selectedCycle));
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
      if (!canManageBudget) throw new Error("Hanya owner atau admin yang bisa mengelola alokasi.");
      if (!form.name.trim()) throw new Error("Nama alokasi wajib diisi.");
      if (!form.accountId) throw new Error("Sumber dompet wajib dipilih.");
      if (Number(form.amount || 0) <= 0) throw new Error("Nominal alokasi harus lebih dari 0.");

      const payload = {
        name: form.name.trim(),
        amount: Number(form.amount || 0),
        accountId: form.accountId,
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
      ? `Alokasi "${deleteTarget.name}" sudah memiliki pengeluaran ${formatRupiah(usage.used)}. Tetap hapus?`
      : `Hapus alokasi "${deleteTarget.name}"?`;
  })();

  return (
    <div className="flex flex-col gap-4">
      <motion.header
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        className="px-0.5"
      >
        <p className="text-xs font-extrabold text-muted-foreground">Alokasi Anggaran</p>
        <h1 className="font-display text-[clamp(22px,6.4vw,28px)] leading-tight tracking-tight text-ink">Anggaran keluarga</h1>
        <small className="text-[11px] text-muted-foreground">Anggaran otomatis mengikuti siklus gajian: reset setiap tanggal 25.</small>
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
            <span className="block text-[10px] font-extrabold text-muted-foreground">Total alokasi</span>
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
            {totalProgressRaw}% terpakai · {totals.overBudget > 0 ? "ada alokasi melewati anggaran" : "masih dalam batas anggaran"}
          </small>
        </div>
      </section>

      {canManageBudget && formOpen && (
        <section className="grid gap-4 rounded-[28px] border border-line-strong bg-panel-strong/90 p-4 shadow-soft backdrop-blur-xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black tracking-[0.13em] text-muted-foreground uppercase">
                {editingBudget ? "Edit alokasi" : "Alokasi baru"}
              </p>
              <h2 className="font-display text-lg tracking-tight text-ink">
                {editingBudget ? editingBudget.name : "Tambah alokasi"}
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
              <label className={labelClassName}>Nama alokasi</label>
              <input
                value={form.name}
                onChange={(event) => setField("name", event.target.value)}
                placeholder="Contoh: Belanja rumah"
                className={fieldClassName}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <label className={labelClassName}>Nominal</label>
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
                <div className="flex items-center justify-between gap-2">
                  <label className={labelClassName}>Sumber dompet</label>
                  {isManager && (
                    <button
                      type="button"
                      onClick={() => setShowAllWallets((v) => !v)}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-[10px] font-black transition",
                        showAllWallets ? "border-rose-strong bg-rose-bg text-rose-dark" : "border-line bg-soft text-muted-foreground"
                      )}
                    >
                      {showAllWallets ? "Semua" : "Milik saya"}
                    </button>
                  )}
                </div>
                <select
                  value={form.accountId}
                  onChange={(event) => setField("accountId", event.target.value)}
                  className={cn(fieldClassName, "appearance-none")}
                >
                  <option value="">Pilih dompet</option>
                  {budgetWalletOptions.map((account) => (
                    <option value={account.id} key={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>
                {budgetWalletOptions.length === 0 && (
                  <small className="text-[11px] font-semibold text-muted-foreground">Belum ada dompet milik Anda. Buat di Pengaturan → Dompet.</small>
                )}
                {!isManager && budgetWalletOptions.length > 0 && (
                  <small className="text-[10px] font-semibold text-muted-foreground">Hanya dompet milik Anda</small>
                )}
              </div>
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
                {submitting ? "Menyimpan..." : editingBudget ? "Simpan Perubahan" : "Simpan Alokasi"}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="grid gap-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-black tracking-[0.13em] text-muted-foreground uppercase">Daftar Alokasi</p>
            <h2 className="font-display text-lg tracking-tight text-ink">{filteredBudgets.length} alokasi</h2>
          </div>
          <small className="text-[11px] text-muted-foreground">Ketuk card untuk melihat transaksi periode ini.</small>
        </div>

        <div className="grid gap-3">
          {filteredBudgets.length ? (
            filteredBudgets.map((budget, idx) => {
              const account = (accountBalances as Account[]).find((item) => item.id === budget.accountId);
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
                      <small className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
                        <Wallet size={12} /> {account?.name || "Dompet tidak ditemukan"}
                      </small>
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
                    <small className="text-[11px] font-semibold text-muted-foreground">{meta.progressRaw}% terpakai</small>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <small className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
                      <CalendarDays size={12} /> {formatBudgetCycleRange(budget.month, budget.year)}
                    </small>
                    {canManageBudget && (
                      <span className="flex gap-2">
                        <button
                          type="button"
                          onClick={(event) => startEditBudget(budget, event)}
                          aria-label={`Edit alokasi ${budget.name}`}
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
                          aria-label={`Hapus alokasi ${budget.name}`}
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
          ) : (
            <section className="rounded-[28px] border border-dashed border-line-strong bg-panel-strong/90 p-6 text-center shadow-soft">
              <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-rose-bg text-rose-dark">
                <Sparkles size={20} />
              </div>
              <h3 className="mt-3 font-display text-sm font-black text-ink">Belum ada alokasi</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Mulai atur keuangan gajian 25–24 dengan menambah alokasi pertama. Biar pengeluaran lebih terkendali.
              </p>
              {canManageBudget ? (
                <p className="mt-2 text-[11px] font-semibold text-muted-foreground">Tap tombol di bawah untuk menambah.</p>
              ) : (
                <p className="mt-2 text-[11px] font-semibold text-muted-foreground">Minta owner/admin untuk menambah alokasi.</p>
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
            <Plus size={18} /> Tambah Alokasi
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
        title="Hapus alokasi ini?"
        message={deleteMessage}
        confirmLabel="Hapus Alokasi"
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
