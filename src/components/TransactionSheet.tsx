import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Target, Wallet, X } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { cn } from "@/lib/utils";
import { formatRupiah, sanitizeNumericInput, todayKey } from "@/utils/format";
import { getBudgetUsage } from "@/utils/calculations";
import { getBudgetCycle, getBudgetCycleTransactions } from "@/utils/budgetCycle";
import { useBodyScrollLock } from "@/utils/useBodyScrollLock";
import { parseMBankingText, type ParsedMBanking } from "@/utils/mBankParser";
import {
  CategoryPickerModal,
  CategoryTriggerButton,
  WalletPickerModal,
  WalletTriggerButton,
} from "@/components/Pickers";
import type { Account, Budget, Category, Transaction } from "@/types";

interface TransactionForm {
  type: "income" | "expense";
  amount: string;
  categoryId: string;
  budgetId: string;
  accountId: string;
  transactionDate: string;
  note: string;
}

const emptyForm = (): TransactionForm => ({
  type: "expense",
  amount: "",
  categoryId: "",
  budgetId: "",
  accountId: "",
  transactionDate: todayKey(),
  note: "",
});

const fieldClassName =
  "h-12 w-full rounded-2xl border border-field-border bg-field-bg px-4 text-sm font-semibold text-ink outline-none placeholder:font-medium focus:border-rose-strong focus:ring-4 focus:ring-rose-bg";

const labelClassName = "text-xs font-extrabold tracking-wide text-muted-foreground";

interface TransactionSheetProps {
  open: boolean;
  onClose: () => void;
  editingTransaction?: Transaction | null;
  onClearEdit?: () => void;
}

export default function TransactionSheet({ open, onClose, editingTransaction = null, onClearEdit }: TransactionSheetProps) {
  const {
    user,
    categories,
    budgets,
    transactions,
    accountBalances,
    familyMembers,
    currentMember,
    addTransaction,
    updateTransaction,
    addCategory,
    notify,
  } = useApp();

  const [form, setForm] = useState<TransactionForm>(emptyForm);
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const [walletPickerOpen, setWalletPickerOpen] = useState(false);
  const [walletFilterMode, setWalletFilterMode] = useState<"mine" | "all">("mine");
  const [submitting, setSubmitting] = useState(false);
  const [showMBImport, setShowMBImport] = useState(false);
  const [mbText, setMbText] = useState("");
  const [mbParsed, setMbParsed] = useState<ParsedMBanking | null>(null);

  useBodyScrollLock(open);

  useEffect(() => {
    if (editingTransaction) {
      setForm({
        type: editingTransaction.type,
        amount: String(editingTransaction.amount ?? ""),
        categoryId: editingTransaction.categoryId || "",
        budgetId: editingTransaction.budgetId || "",
        accountId: editingTransaction.accountId || "",
        transactionDate: editingTransaction.transactionDate,
        note: editingTransaction.note || "",
      });
    } else if (open) {
      setForm(emptyForm());
    }
    setCategoryPickerOpen(false);
    setWalletPickerOpen(false);
  }, [editingTransaction, open]);

  const canAddCategory = ["owner", "admin"].includes(currentMember?.role);
  const currentUserId = user?.id || "";
  const incomeCategories = useMemo(
    () => (categories as Category[]).filter((category) => category.type === "income"),
    [categories]
  );

  const expenseCategories = useMemo(
    () => (categories as Category[]).filter((category) => category.type === "expense"),
    [categories]
  );

  const selectedCategory = useMemo(
    () => (categories as Category[]).find((cat) => cat.id === form.categoryId) || null,
    [categories, form.categoryId]
  );

  const selectedAccount = useMemo(
    () => (accountBalances as Account[]).find((acc) => acc.id === form.accountId) || null,
    [accountBalances, form.accountId]
  );

  const handleAddCategory = async (name: string, catType: "expense" | "income"): Promise<Category | null> => {
    try {
      const category = await addCategory({ name, type: catType });
      if (category) {
        setForm((prev) => ({ ...prev, categoryId: category.id }));
      }
      return category;
    } catch (error) {
      notify(error instanceof Error ? error.message : "Gagal menambah kategori.");
      return null;
    }
  };

  const cycle = useMemo(() => getBudgetCycle(form.transactionDate), [form.transactionDate]);
  const monthTransactions = useMemo(
    () => getBudgetCycleTransactions(transactions, cycle.month, cycle.year).filter((trx) => trx.id !== editingTransaction?.id),
    [transactions, cycle.month, cycle.year, editingTransaction?.id]
  );

  const matchedBudget = useMemo(() => {
    if (form.type !== "expense" || !form.categoryId) return null;
    return (
      (budgets as Budget[]).find(
        (b) =>
          b.categoryId === form.categoryId &&
          Number(b.month) === Number(cycle.month) &&
          Number(b.year) === Number(cycle.year)
      ) || null
    );
  }, [budgets, form.type, form.categoryId, cycle.month, cycle.year]);

  const matchedBudgetUsage = useMemo(() => {
    if (!matchedBudget) return null;
    return getBudgetUsage(matchedBudget, monthTransactions);
  }, [matchedBudget, monthTransactions]);

  const projectedRemaining = matchedBudgetUsage
    ? matchedBudgetUsage.remaining - Number(form.amount || 0)
    : null;

  const setField = (key: keyof TransactionForm, value: string) => setForm((prev) => ({ ...prev, [key]: value }));
  const setType = (type: "income" | "expense") =>
    setForm((prev) => ({ ...prev, type, categoryId: "", budgetId: "", accountId: "" }));

  // mBanking import helpers
  const handleParseMB = () => {
    const parsed = parseMBankingText(mbText);
    setMbParsed(parsed);
    if (parsed.type) {
      setForm((prev) => ({
        ...prev,
        type: parsed.type!,
        categoryId: "",
        budgetId: "",
        accountId: "",
        amount: parsed.amount != null ? String(parsed.amount) : prev.amount,
        note: parsed.note ? parsed.note.slice(0, 90) : prev.note,
      }));
    } else {
      if (parsed.amount != null) setField("amount", String(parsed.amount));
      if (parsed.note) setField("note", parsed.note.slice(0, 90));
    }
    if (parsed.amount || parsed.type) {
      notify(parsed.confidence === "high" ? `Terdeteksi ${parsed.bank || "Bank"} Rp${parsed.amount?.toLocaleString("id-ID")} — cek lagi sebelum simpan` : "Terisi dari notifikasi — silakan cek");
    } else {
      notify(parsed.hint || "Nominal tidak terdeteksi. Isi manual ya.");
    }
  };

  const handleApplyMB = () => {
    if (!mbParsed) return;
    setForm((prev) => ({
      ...prev,
      ...(mbParsed.type ? { type: mbParsed.type, categoryId: "", budgetId: "", accountId: "" } : {}),
      ...(mbParsed.amount != null ? { amount: String(mbParsed.amount) } : {}),
      ...(mbParsed.note ? { note: mbParsed.note.slice(0, 90) } : {}),
    }));
  };

  // Auto-handle Web Share Target: ?text=... or ?title=... when sheet opens
  useEffect(() => {
    if (!open) return;
    try {
      const params = new URLSearchParams(window.location.search);
      const shared = params.get("text") || params.get("title") || params.get("url") || "";
      if (shared && shared.length > 8) {
        setShowMBImport(true);
        setMbText((prev) => (prev ? prev : shared));
        const parsed = parseMBankingText(shared);
        setMbParsed(parsed);
        // clean URL without reload
        const url = new URL(window.location.href);
        url.searchParams.delete("text");
        url.searchParams.delete("title");
        url.searchParams.delete("url");
        window.history.replaceState({}, "", url.toString());
      }
    } catch {
      // ignore
    }
  }, [open]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    try {
      setSubmitting(true);
      const isExpense = form.type === "expense";

      // Kategori wajib untuk semua jenis transaksi
      if (!form.categoryId) {
        throw new Error(`Pilih kategori ${isExpense ? "pengeluaran" : "pemasukan"} terlebih dahulu.`);
      }

      const accountId = form.accountId || accountBalances.find((a: Account) => a.isActive)?.id || "";

      if (!accountId) {
        throw new Error("Pilih dompet terlebih dahulu.");
      }

      const payload = {
        ...form,
        amount: Number(form.amount),
        categoryId: form.categoryId,
        accountId,
        budgetId: isExpense && matchedBudget ? matchedBudget.id : null,
      };

      if (editingTransaction) await updateTransaction(editingTransaction.id, payload);
      else await addTransaction(payload);
      setForm(emptyForm());
      onClearEdit?.();
      onClose();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Gagal menyimpan transaksi.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-backdrop p-3 backdrop-blur-[10px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.form
            className="grid max-h-[88vh] w-full max-w-[430px] gap-3 overflow-y-auto rounded-[32px] border border-sheet-border bg-sheet-bg p-4 shadow-[0_-26px_70px_rgba(0,0,0,0.18)]"
            onSubmit={submit}
            initial={{ y: 420 }}
            animate={{ y: 0 }}
            exit={{ y: 420 }}
            transition={{ type: "spring", stiffness: 250, damping: 28 }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black tracking-[0.13em] text-muted-foreground uppercase">Transaksi</p>
                <h2 className="font-display text-lg tracking-tight text-ink">
                  {editingTransaction ? "Edit transaksi" : "Catat cepat"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClearEdit?.();
                  onClose();
                }}
                aria-label="Tutup form"
                className="grid size-10 shrink-0 place-items-center rounded-[16px] border border-line bg-panel text-rose-dark transition hover:bg-rose-bg"
              >
                <X size={18} />
              </button>
            </div>

            {/* mBanking import — paste/share notifikasi */}
            <div className="grid gap-2">
              <button
                type="button"
                onClick={() => setShowMBImport((v) => !v)}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-2xl border px-3.5 py-2.5 text-left transition",
                  showMBImport ? "border-rose-strong bg-rose-bg" : "border-dashed border-line bg-soft hover:bg-panel"
                )}
              >
                <span className="grid gap-0.5">
                  <strong className="text-xs font-black text-ink flex items-center gap-1.5">
                    <Wallet size={14} className="text-rose-dark" /> Impor dari Notifikasi mBanking
                  </strong>
                  <small className="text-[11px] font-semibold text-muted-foreground">Tempel teks notifikasi BCA/Mandiri/BRI/OVO dll — auto isi nominal</small>
                </span>
                <span className={cn("rounded-full px-2.5 py-1 text-[10px] font-black border", showMBImport ? "bg-panel border-line text-rose-dark" : "bg-panel border-line text-muted-foreground")}>
                  {showMBImport ? "Tutup" : "Tempel"}
                </span>
              </button>

              {showMBImport && (
                <div className="grid gap-2 rounded-[22px] border border-line bg-panel p-3">
                  <p className="text-[11px] font-semibold text-muted-foreground">
                    PWA tidak bisa baca notifikasi otomatis (keamanan Android/iOS). Silakan <b>copy</b> teks notifikasi mBanking lalu <b>paste</b> di sini, atau gunakan <b>Share</b> → KeuanganKu jika ada. iOS wajib paste manual.
                  </p>
                  <textarea
                    value={mbText}
                    onChange={(e) => setMbText(e.target.value)}
                    placeholder="Contoh: BCA mobile - TRF E-BANKING DB Rp 150.000 dari Rek ... atau OVO Cash Rp 50.000 diterima"
                    className={cn(fieldClassName, "h-auto min-h-[84px] py-3")}
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleParseMB}
                      disabled={!mbText.trim()}
                      className="flex-1 rounded-2xl border border-line bg-panel-strong px-3 py-2.5 text-xs font-black text-rose-dark shadow-soft transition hover:bg-rose-bg disabled:opacity-50"
                    >
                      Deteksi & Isi Form
                    </button>
                    <button
                      type="button"
                      onClick={() => { setMbText(""); setMbParsed(null); }}
                      className="rounded-2xl border border-line bg-soft px-3 py-2.5 text-xs font-black text-muted-foreground"
                    >
                      Bersihkan
                    </button>
                  </div>
                  {mbParsed && (
                    <div className={cn("rounded-2xl border p-2.5 text-xs", mbParsed.confidence === "high" ? "border-green-border bg-green-bg text-green" : mbParsed.confidence === "medium" ? "border-amber-500/20 bg-amber-500/10 text-amber-700" : "border-red-border bg-red-bg text-red")}>
                      <p className="font-black">
                        {mbParsed.bank ? `[${mbParsed.bank}] ` : ""}Rp{mbParsed.amount != null ? mbParsed.amount.toLocaleString("id-ID") : "?"} {mbParsed.type ? `· ${mbParsed.type === "income" ? "Pemasukan" : "Pengeluaran"}` : ""} · {mbParsed.confidence}
                      </p>
                      {mbParsed.note && <p className="mt-1 font-semibold">Catatan: {mbParsed.note}</p>}
                      {mbParsed.hint && <p className="mt-1 font-semibold opacity-80">{mbParsed.hint}</p>}
                      {mbParsed.amount != null && (
                        <button type="button" onClick={handleApplyMB} className="mt-2 w-full rounded-xl bg-panel border border-line px-3 py-1.5 text-[11px] font-black text-ink">
                          Terapkan ke form
                        </button>
                      )}
                    </div>
                  )}
                  <p className="text-[10px] font-semibold text-muted-foreground">
                    Parser lokal (on-device), nominal & catatan hanya saran — <b>wajib cek kategori & dompet</b> sebelum Simpan. Alokasi bersifat opsional.
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 rounded-2xl border border-field-border bg-field-bg p-1">
              <button
                type="button"
                onClick={() => setType("income")}
                className={cn(
                  "rounded-xl bg-transparent px-4 py-2.5 text-sm font-black transition",
                  form.type === "income"
                    ? "text-on-accent shadow-accent [background-image:var(--gradient-brand)]"
                    : "text-muted-foreground hover:text-ink"
                )}
              >
                Pemasukan
              </button>
              <button
                type="button"
                onClick={() => setType("expense")}
                className={cn(
                  "rounded-xl bg-transparent px-4 py-2.5 text-sm font-black transition",
                  form.type === "expense"
                    ? "text-on-accent shadow-accent [background-image:var(--gradient-brand)]"
                    : "text-muted-foreground hover:text-ink"
                )}
              >
                Pengeluaran
              </button>
            </div>

            <div className="grid gap-2">
              <label className={labelClassName}>Nominal</label>
              <input
                inputMode="numeric"
                type="text"
                placeholder="Contoh: 150000"
                value={form.amount}
                onChange={(event) => setField("amount", sanitizeNumericInput(event.target.value))}
                className={fieldClassName}
              />
            </div>

            {form.type === "expense" ? (
              <div className="grid gap-3">
                {/* KATEGORI — wajib untuk expense */}
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
                    canAddCategory={canAddCategory}
                    onAddCategory={handleAddCategory}
                  />

                  {matchedBudget && matchedBudgetUsage && (
                    <div
                      className={cn(
                        "rounded-[20px] border p-3 transition",
                        projectedRemaining !== null && projectedRemaining < 0
                          ? "border-red-border bg-red-bg/50 text-red"
                          : "border-line bg-soft/70 text-ink"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5 text-xs font-black">
                          <Target size={14} className={projectedRemaining !== null && projectedRemaining < 0 ? "text-red" : "text-rose-dark"} />
                          Anggaran: {matchedBudget.name || selectedCategory?.name}
                        </span>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-black uppercase",
                            matchedBudgetUsage.percentage >= 100
                              ? "bg-red text-white"
                              : matchedBudgetUsage.percentage >= 80
                                ? "bg-amber text-ink"
                                : "bg-green text-white"
                          )}
                        >
                          {matchedBudgetUsage.percentage}% terpakai
                        </span>
                      </div>

                      <div className="mt-2 flex items-center justify-between gap-2 text-[11px] font-semibold">
                        <span className="text-muted-foreground">
                          Sisa: <strong>{formatRupiah(matchedBudgetUsage.remaining)}</strong> dari {formatRupiah(matchedBudget.amount)}
                        </span>
                        <span className={cn("font-black", projectedRemaining !== null && projectedRemaining < 0 ? "text-red" : "text-ink")}>
                          Setelah trx: {formatRupiah(projectedRemaining ?? 0)}
                        </span>
                      </div>

                      {projectedRemaining !== null && projectedRemaining < 0 && (
                        <p className="mt-1 text-[10.5px] font-bold text-red">
                          Pengeluaran ini melebihi anggaran kategori ({formatRupiah(Math.abs(projectedRemaining))} over budget).
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* DOMPET — Bebas dari dompet mana saja */}
                <div className="grid gap-2">
                  <label className={labelClassName}>
                    Bayar dari Dompet <span className="text-red">*</span>
                  </label>
                  <WalletTriggerButton
                    account={selectedAccount}
                    placeholder="Pilih dompet pembayaran..."
                    onClick={() => setWalletPickerOpen(true)}
                  />
                  <WalletPickerModal
                    open={walletPickerOpen}
                    title="Pilih Dompet Pembayaran"
                    accounts={accountBalances}
                    selectedAccountId={form.accountId}
                    onSelect={(id) => setField("accountId", id)}
                    onClose={() => setWalletPickerOpen(false)}
                    currentUserId={currentUserId}
                    familyMembers={familyMembers}
                    filterMode={walletFilterMode}
                    onFilterModeChange={setWalletFilterMode}
                  />
                </div>
              </div>
            ) : (
              <div className="grid gap-3">
                <div className="grid gap-2">
                  <label className={labelClassName}>
                    Kategori Pemasukan <span className="text-red">*</span>
                  </label>
                  <CategoryTriggerButton
                    category={selectedCategory}
                    placeholder="Pilih kategori pemasukan..."
                    onClick={() => setCategoryPickerOpen(true)}
                  />
                  <CategoryPickerModal
                    open={categoryPickerOpen}
                    title="Pilih Kategori Pemasukan"
                    type="income"
                    categories={incomeCategories}
                    selectedCategoryId={form.categoryId}
                    onSelect={(id) => setField("categoryId", id)}
                    onClose={() => setCategoryPickerOpen(false)}
                    canAddCategory={canAddCategory}
                    onAddCategory={handleAddCategory}
                  />
                </div>

                <div className="grid gap-2">
                  <label className={labelClassName}>
                    Dompet Tujuan <span className="text-red">*</span>
                  </label>
                  <WalletTriggerButton
                    account={selectedAccount}
                    placeholder="Pilih dompet tujuan..."
                    onClick={() => setWalletPickerOpen(true)}
                  />
                  <WalletPickerModal
                    open={walletPickerOpen}
                    title="Pilih Dompet Tujuan"
                    accounts={accountBalances}
                    selectedAccountId={form.accountId}
                    onSelect={(id) => setField("accountId", id)}
                    onClose={() => setWalletPickerOpen(false)}
                    currentUserId={currentUserId}
                    familyMembers={familyMembers}
                    filterMode={walletFilterMode}
                    onFilterModeChange={setWalletFilterMode}
                  />
                </div>
              </div>
            )}

            <div className="grid gap-2">
              <label className={labelClassName}>Tanggal</label>
              <input
                type="date"
                value={form.transactionDate}
                onChange={(event) => setForm((prev) => ({ ...prev, transactionDate: event.target.value, budgetId: "" }))}
                className={fieldClassName}
              />
            </div>

            <div className="grid gap-2">
              <label className={labelClassName}>Catatan</label>
              <textarea
                placeholder="Opsional"
                value={form.note}
                onChange={(event) => setField("note", event.target.value)}
                className={cn(fieldClassName, "h-auto min-h-[76px] py-3")}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="h-12 w-full rounded-2xl border border-white/40 text-sm font-black text-on-accent shadow-accent transition hover:opacity-95 disabled:opacity-60 [background-image:var(--gradient-brand)]"
            >
              {submitting ? "Menyimpan..." : "Simpan Transaksi"}
            </button>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
