import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, PlusCircle, Search, Wallet, X } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { cn } from "@/lib/utils";
import { formatRupiah, sanitizeNumericInput, todayKey } from "@/utils/format";
import { getBudgetUsage } from "@/utils/calculations";
import { getBudgetCycle, getBudgetCycleTransactions, formatBudgetCycleRange } from "@/utils/budgetCycle";
import { useDebounce } from "@/utils/useDebounce";
import { useBodyScrollLock } from "@/utils/useBodyScrollLock";
import { parseMBankingText, type ParsedMBanking } from "@/utils/mBankParser";
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

function normalizeText(value = "") {
  return String(value).toLowerCase().trim();
}

const fieldClassName =
  "h-12 w-full rounded-2xl border border-field-border bg-field-bg px-4 text-sm font-semibold text-ink outline-none placeholder:font-medium focus:border-rose-strong focus:ring-4 focus:ring-rose-bg";

const labelClassName = "text-xs font-extrabold tracking-wide text-muted-foreground";

interface AllocationPickerModalProps {
  open: boolean;
  budgets: Budget[];
  transactions: Transaction[];
  accountBalances: Account[];
  selectedBudgetId: string;
  selectedTransactionId?: string;
  onSelect: (budgetId: string) => void;
  onClose: () => void;
  search: string;
  setSearch: (value: string) => void;
  cycle: { month: number; year: number };
}

function AllocationPickerModal({
  open,
  budgets,
  transactions,
  accountBalances,
  selectedBudgetId,
  selectedTransactionId,
  onSelect,
  onClose,
  search,
  setSearch,
  cycle,
}: AllocationPickerModalProps) {
  const debouncedSearch = useDebounce(search, 200);

  const filteredBudgets = useMemo(() => {
    const keyword = normalizeText(debouncedSearch);
    if (!keyword) return budgets;

    return budgets.filter((budget) => {
      const account = accountBalances.find((item) => item.id === budget.accountId);
      return [budget.name, budget.note, account?.name].some((value) => normalizeText(value || "").includes(keyword));
    });
  }, [accountBalances, budgets, debouncedSearch]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[75] flex items-end justify-center bg-backdrop p-3 backdrop-blur-[10px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.section
            className="flex max-h-[82vh] w-full max-w-[430px] flex-col rounded-[32px] border border-sheet-border bg-sheet-bg p-4 shadow-[0_-26px_70px_rgba(0,0,0,0.18)]"
            initial={{ y: 420, opacity: 0.98 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 420, opacity: 0.98 }}
            transition={{ type: "spring", stiffness: 260, damping: 30 }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-black tracking-[0.13em] text-muted-foreground uppercase">Pilih alokasi</p>
                <h3 className="font-display text-base tracking-tight text-ink">
                  Periode gajian {String(cycle.month || "").padStart(2, "0")}/{cycle.year || "-"}
                </h3>
                <small className="block text-[11px] font-semibold text-muted-foreground">
                  {formatBudgetCycleRange(cycle.month, cycle.year)} · {budgets.length} alokasi tersedia.
                </small>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Tutup pilihan alokasi"
                className="grid size-10 shrink-0 place-items-center rounded-[16px] border border-line bg-panel text-rose-dark transition hover:bg-rose-bg"
              >
                <X size={18} />
              </button>
            </div>

            <label className="mt-3 flex items-center gap-2.5 rounded-[20px] border border-field-border bg-field-bg px-3.5 py-3 focus-within:border-rose-strong focus-within:ring-4 focus-within:ring-rose-bg">
              <Search size={17} className="shrink-0 text-muted-foreground" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari nama alokasi atau dompet..."
                autoFocus
                className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-muted-foreground"
              />
            </label>

            <div className="mt-3 grid gap-2 overflow-y-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:thin]">
              {filteredBudgets.length ? (
                filteredBudgets.map((budget) => {
                  const account = accountBalances.find((item) => item.id === budget.accountId);
                  const usage = getBudgetUsage(
                    budget,
                    transactions.filter((trx) => trx.id !== selectedTransactionId)
                  );
                  const progress = budget.amount > 0 ? Math.min(100, Math.round((usage.used / budget.amount) * 100)) : 0;
                  const isSelected = selectedBudgetId === budget.id;

                  return (
                    <button
                      type="button"
                      key={budget.id}
                      onClick={() => onSelect(budget.id)}
                      className={cn(
                        "grid grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-2.5 rounded-[22px] border bg-panel p-3 text-left shadow-soft transition hover:-translate-y-0.5",
                        isSelected ? "border-rose-strong ring-4 ring-rose-bg" : "border-line"
                      )}
                    >
                      <span
                        className={cn(
                          "grid size-8 place-items-center rounded-full border",
                          isSelected ? "border-transparent text-on-accent [background-image:var(--gradient-brand)]" : "border-line text-transparent"
                        )}
                      >
                        {isSelected ? <Check size={16} /> : null}
                      </span>

                      <span className="grid min-w-0 gap-1">
                        <strong className="truncate text-[13px] font-black text-ink">{budget.name}</strong>
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground">
                          <Wallet size={14} /> <span className="truncate">{account?.name || "Dompet tidak ditemukan"}</span>
                        </span>
                        {budget.note ? (
                          <small className="truncate text-[11px] font-semibold text-muted-foreground">{budget.note}</small>
                        ) : null}
                        <span className="block h-1.5 overflow-hidden rounded-full bg-soft">
                          <i
                            className={cn(
                              "block h-full rounded-full",
                              usage.remaining <= 0
                                ? "bg-[linear-gradient(90deg,var(--red),var(--rose))]"
                                : "bg-[image:var(--gradient-brand)]"
                            )}
                            style={{ width: `${progress}%` }}
                          />
                        </span>
                      </span>

                      <span className="grid shrink-0 justify-items-end gap-0.5 text-right">
                        <em className="text-[10px] font-extrabold text-muted-foreground not-italic">Sisa</em>
                        <strong className={cn("text-[13px] font-black", usage.remaining <= 0 ? "text-red" : "text-ink")}>
                          {formatRupiah(usage.remaining)}
                        </strong>
                        <small className="text-[10px] font-semibold text-muted-foreground">
                          Dipakai {formatRupiah(usage.used)} dari {formatRupiah(budget.amount)}
                        </small>
                      </span>
                    </button>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-line bg-soft p-5 text-center">
                  <strong className="block text-sm font-black text-ink">Alokasi tidak ditemukan.</strong>
                  <p className="mt-1 text-xs font-semibold text-muted-foreground">
                    Coba ubah kata pencarian atau cek tanggal transaksi agar sesuai dengan bulan alokasi.
                  </p>
                </div>
              )}
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

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
    currentMember,
    addTransaction,
    updateTransaction,
    addCategory,
    notify,
  } = useApp();

  const [form, setForm] = useState<TransactionForm>(emptyForm);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [quickCategoryName, setQuickCategoryName] = useState("");
  const [savingCategory, setSavingCategory] = useState(false);
  const [allocationPickerOpen, setAllocationPickerOpen] = useState(false);
  const [allocationSearch, setAllocationSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showAllWallets, setShowAllWallets] = useState(false);
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
    setShowCategoryForm(false);
    setQuickCategoryName("");
    setAllocationPickerOpen(false);
    setAllocationSearch("");
  }, [editingTransaction, open]);

  const canAddCategory = ["owner", "admin"].includes(currentMember?.role);
  const isManager = ["owner", "admin"].includes(currentMember?.role || "");
  const currentUserId = user?.id || "";
  const incomeCategories = useMemo(
    () => (categories as Category[]).filter((category) => category.type === "income"),
    [categories]
  );

  const cycle = useMemo(() => getBudgetCycle(form.transactionDate), [form.transactionDate]);
  const monthTransactions = useMemo(
    () => getBudgetCycleTransactions(transactions, cycle.month, cycle.year).filter((trx) => trx.id !== editingTransaction?.id),
    [transactions, cycle.month, cycle.year, editingTransaction?.id]
  );

  // Dompet untuk pemasukan: hanya milik sendiri + legacy shared (createdBy null) — manager bisa toggle lihat semua
  const incomeWalletOptions = useMemo(() => {
    const base = (accountBalances as Account[]).filter((acc) => acc.isActive);
    return base.filter((acc) => {
      if (acc.createdBy == null) return true; // legacy shared visible to all
      if (acc.createdBy === currentUserId) return true;
      if (isManager && showAllWallets) return true;
      // allow currently selected value to remain visible when editing other's transaction
      if (acc.id === form.accountId || acc.id === editingTransaction?.accountId) return true;
      return false;
    });
  }, [accountBalances, currentUserId, isManager, showAllWallets, form.accountId, editingTransaction?.accountId]);

  const availableBudgets = useMemo(() => {
    if (form.type !== "expense") return [] as Budget[];
    const filtered = (budgets as Budget[])
      .filter((budget) => Number(budget.month) === Number(cycle.month) && Number(budget.year) === Number(cycle.year))
      .filter((budget) => {
        const acct = accountBalances.find((item: Account) => item.id === budget.accountId) as Account | undefined;
        if (!acct) return false;
        if (acct.createdBy == null) return true; // legacy shared alokasi tampil untuk semua
        if (acct.createdBy === currentUserId) return true;
        if (isManager && showAllWallets) return true;
        // keep selected budget visible when editing
        if (budget.id === form.budgetId || budget.id === editingTransaction?.budgetId) return true;
        return false;
      })
      .sort((a, b) => {
        const accountA = accountBalances.find((item: Account) => item.id === a.accountId)?.name || "";
        const accountB = accountBalances.find((item: Account) => item.id === b.accountId)?.name || "";
        return accountA.localeCompare(accountB, "id") || a.name.localeCompare(b.name, "id");
      });
    return filtered;
  }, [accountBalances, budgets, cycle.month, cycle.year, form.type, currentUserId, isManager, showAllWallets, form.budgetId, editingTransaction?.budgetId]);

  useEffect(() => {
    if (form.type !== "expense") {
      if (form.budgetId) setForm((prev) => ({ ...prev, budgetId: "" }));
      return;
    }

    const selectedStillValid = availableBudgets.some((budget) => budget.id === form.budgetId);
    if (selectedStillValid) return;

    setForm((prev) => ({ ...prev, budgetId: availableBudgets.length === 1 ? availableBudgets[0].id : "" }));
  }, [availableBudgets, form.budgetId, form.type]);

  const selectedBudget = availableBudgets.find((budget) => budget.id === form.budgetId) || null;
  const selectedBudgetUsage = selectedBudget ? getBudgetUsage(selectedBudget, monthTransactions) : null;
  const selectedBudgetAccount = selectedBudget
    ? accountBalances.find((account: Account) => account.id === selectedBudget.accountId)
    : null;
  const projectedRemaining = selectedBudgetUsage ? selectedBudgetUsage.remaining - Number(form.amount || 0) : null;

  const setField = (key: keyof TransactionForm, value: string) => setForm((prev) => ({ ...prev, [key]: value }));
  const setType = (type: "income" | "expense") =>
    setForm((prev) => ({ ...prev, type, categoryId: "", budgetId: "", accountId: "" }));

  const selectBudget = (budgetId: string) => {
    setField("budgetId", budgetId);
    setAllocationPickerOpen(false);
    setAllocationSearch("");
  };

  // mBanking import helpers
  const handleParseMB = () => {
    const parsed = parseMBankingText(mbText);
    setMbParsed(parsed);
    if (parsed.amount != null) {
      setField("amount", String(parsed.amount));
    }
    if (parsed.type) {
      setType(parsed.type);
      // delay to allow type switch to clear fields then re-apply
      window.setTimeout(() => {
        if (parsed.amount != null) setField("amount", String(parsed.amount));
        if (parsed.note) setField("note", parsed.note.slice(0, 90));
      }, 50);
    } else if (parsed.note) {
      setField("note", parsed.note.slice(0, 90));
    }
    if (parsed.amount || parsed.type) {
      notify(parsed.confidence === "high" ? `Terdeteksi ${parsed.bank || "Bank"} Rp${parsed.amount?.toLocaleString("id-ID")} — cek lagi sebelum simpan` : "Terisi dari notifikasi — silakan cek");
    } else {
      notify(parsed.hint || "Nominal tidak terdeteksi. Isi manual ya.");
    }
  };

  const handleApplyMB = () => {
    if (!mbParsed) return;
    if (mbParsed.amount != null) setField("amount", String(mbParsed.amount));
    if (mbParsed.type) setType(mbParsed.type);
    if (mbParsed.note) setField("note", mbParsed.note.slice(0, 90));
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

  const submitQuickCategory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      if (!quickCategoryName.trim()) throw new Error("Nama kategori wajib diisi.");
      setSavingCategory(true);
      const category = await addCategory({ name: quickCategoryName, type: "income" });
      setForm((prev) => ({ ...prev, categoryId: category?.id || prev.categoryId }));
      setQuickCategoryName("");
      setShowCategoryForm(false);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Gagal menambah kategori.");
    } finally {
      setSavingCategory(false);
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    try {
      setSubmitting(true);
      const isExpense = form.type === "expense";
      if (!isExpense && !incomeCategories.length) {
        throw new Error("Kategori pemasukan belum ada. Tambahkan kategori terlebih dahulu.");
      }
      const categoryId = isExpense ? null : form.categoryId || incomeCategories[0]?.id;
      if (!isExpense && !categoryId) {
        throw new Error("Pilih kategori pemasukan terlebih dahulu.");
      }

      const payload = {
        ...form,
        amount: Number(form.amount),
        categoryId,
        accountId: isExpense
          ? selectedBudget?.accountId || ""
          : form.accountId || incomeWalletOptions.find((account: Account) => account.isActive)?.id || accountBalances.find((account: Account) => account.isActive)?.id,
        budgetId: isExpense ? form.budgetId || null : null,
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
                    Parser lokal (on-device), nominal & catatan hanya saran — <b>wajib cek alokasi/dompet</b> sebelum Simpan. Alokasi tetap wajib dipilih untuk pengeluaran.
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
              <div className="grid gap-2">
                <div className="flex items-center justify-between gap-2">
                  <label className={labelClassName}>Alokasi Anggaran</label>
                  {isManager && (
                    <button
                      type="button"
                      onClick={() => setShowAllWallets((v) => !v)}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-[10px] font-black transition",
                        showAllWallets ? "border-rose-strong bg-rose-bg text-rose-dark" : "border-line bg-soft text-muted-foreground"
                      )}
                    >
                      {showAllWallets ? "Semua dompet" : "Dompet saya"}
                    </button>
                  )}
                </div>
                {!isManager && availableBudgets.length > 0 && (
                  <small className="text-[10px] font-semibold text-muted-foreground">Hanya alokasi dari dompet milik Anda yang tampil</small>
                )}
                {availableBudgets.length === 0 && (
                  <small className="text-[11px] font-semibold text-muted-foreground">
                    Belum ada alokasi dari dompet milik Anda di periode ini. Buat alokasi dengan dompet Anda di Anggaran.
                  </small>
                )}
                <button
                  type="button"
                  onClick={() => setAllocationPickerOpen(true)}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-[20px] border p-3 text-left transition",
                    selectedBudget ? "border-rose-strong bg-rose-bg" : "border-field-border bg-field-bg"
                  )}
                >
                  {selectedBudget ? (
                    <>
                      <span className="grid min-w-0 gap-0.5">
                        <strong className="truncate text-[13px] font-black text-ink">{selectedBudget.name}</strong>
                        <small className="truncate text-[11px] font-semibold text-muted-foreground">
                          {selectedBudgetAccount?.name || "Dompet tidak ditemukan"}
                        </small>
                      </span>
                      <em className="shrink-0 text-xs font-black text-rose-dark not-italic">
                        {formatRupiah(selectedBudgetUsage?.remaining || 0)} tersisa
                      </em>
                    </>
                  ) : (
                    <>
                      <span className="grid min-w-0 gap-0.5">
                        <strong className="truncate text-[13px] font-black text-ink">Pilih alokasi</strong>
                        <small className="truncate text-[11px] font-semibold text-muted-foreground">
                          {availableBudgets.length} alokasi tersedia · {formatBudgetCycleRange(cycle.month, cycle.year)}
                        </small>
                      </span>
                      <em className="shrink-0 text-xs font-black text-rose-dark not-italic">Pilih</em>
                    </>
                  )}
                </button>

                <AllocationPickerModal
                  open={allocationPickerOpen}
                  budgets={availableBudgets}
                  transactions={monthTransactions}
                  accountBalances={accountBalances}
                  selectedBudgetId={form.budgetId}
                  selectedTransactionId={editingTransaction?.id}
                  onSelect={selectBudget}
                  onClose={() => setAllocationPickerOpen(false)}
                  search={allocationSearch}
                  setSearch={setAllocationSearch}
                  cycle={cycle}
                />

                {selectedBudgetUsage ? (
                  <p
                    className={cn(
                      "rounded-2xl border p-2.5 text-[11px] leading-relaxed font-semibold",
                      projectedRemaining !== null && projectedRemaining < 0
                        ? "border-red-border bg-red-bg text-red"
                        : "border-line bg-soft text-muted-foreground"
                    )}
                  >
                    Sumber: {selectedBudgetAccount?.name || "Dompet tidak ditemukan"} · Sisa setelah transaksi:{" "}
                    {formatRupiah(projectedRemaining || 0)} dari alokasi {formatRupiah(selectedBudget?.amount || 0)}. Periode reset
                    tiap tanggal 25.
                  </p>
                ) : (
                  <p className="text-[11px] leading-relaxed font-semibold text-muted-foreground">
                    Pengeluaran wajib memilih alokasi. Daftar mengikuti periode gajian: tanggal 25 sampai 24 bulan berikutnya.
                  </p>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <label className={labelClassName}>Kategori Pemasukan</label>
                  <select
                    value={form.categoryId}
                    onChange={(event) => setField("categoryId", event.target.value)}
                    className={cn(fieldClassName, "appearance-none")}
                  >
                    <option value="">Pilih</option>
                    {incomeCategories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  {canAddCategory && (
                    <button
                      type="button"
                      onClick={() => setShowCategoryForm((value) => !value)}
                      className="inline-flex items-center gap-1 bg-transparent text-[11px] font-black text-rose-dark transition hover:opacity-80"
                    >
                      <PlusCircle size={14} /> Tambah kategori pemasukan
                    </button>
                  )}
                </div>
                <div className="grid gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <label className={labelClassName}>Dompet Tujuan</label>
                    {isManager && (
                      <button
                        type="button"
                        onClick={() => setShowAllWallets((v) => !v)}
                        className={cn(
                          "rounded-full border px-2.5 py-1 text-[10px] font-black transition",
                          showAllWallets ? "border-rose-strong bg-rose-bg text-rose-dark" : "border-line bg-soft text-muted-foreground"
                        )}
                      >
                        {showAllWallets ? "Semua dompet" : "Dompet saya"}
                      </button>
                    )}
                  </div>
                  <select
                    value={form.accountId}
                    onChange={(event) => setField("accountId", event.target.value)}
                    className={cn(fieldClassName, "appearance-none")}
                  >
                    <option value="">Pilih</option>
                    {incomeWalletOptions.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    ))}
                  </select>
                  {incomeWalletOptions.length === 0 && (
                    <small className="text-[11px] font-semibold text-muted-foreground">
                      Belum ada dompet milik Anda. Buat dompet di Pengaturan → Dompet Keluarga.
                    </small>
                  )}
                  {!isManager && incomeWalletOptions.length > 0 && (
                    <small className="text-[10px] font-semibold text-muted-foreground">Hanya dompet milik Anda yang tampil</small>
                  )}
                </div>
              </div>
            )}

            {showCategoryForm && form.type === "income" && (
              <div className="flex gap-2">
                <input
                  value={quickCategoryName}
                  onChange={(event) => setQuickCategoryName(event.target.value)}
                  placeholder="Contoh: Bonus Project"
                  className={fieldClassName}
                />
                <button
                  type="button"
                  disabled={savingCategory}
                  onClick={(event) => submitQuickCategory(event as unknown as FormEvent<HTMLFormElement>)}
                  className="shrink-0 rounded-2xl border border-line bg-panel-strong px-4 text-xs font-black text-rose-dark transition hover:bg-rose-bg disabled:opacity-60"
                >
                  {savingCategory ? "Menyimpan..." : "Simpan"}
                </button>
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
