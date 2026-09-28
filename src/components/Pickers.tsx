import { useMemo, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Building2,
  Check,
  ChevronRight,
  Coins,
  Plus,
  Search,
  Smartphone,
  Sparkles,
  Tag,
  Wallet,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRupiah } from "@/utils/format";
import { useDebounce } from "@/utils/useDebounce";
import type { Account, Category, FamilyMember } from "@/types";

function normalize(str = "") {
  return String(str).toLowerCase().trim();
}

const accountTypeIcons: Record<string, typeof Wallet> = {
  cash: Coins,
  bank: Building2,
  ewallet: Smartphone,
  saving: Wallet,
  other: Wallet,
};

const accountTypeLabels: Record<string, string> = {
  cash: "Tunai",
  bank: "Bank",
  ewallet: "E-Wallet",
  saving: "Tabungan",
  other: "Lainnya",
};

// ---------------------------------------------------------------------------
// Category Picker Modal
// ---------------------------------------------------------------------------

export interface CategoryPickerModalProps {
  open: boolean;
  title?: string;
  type: "expense" | "income";
  categories: Category[];
  selectedCategoryId: string;
  onSelect: (categoryId: string) => void;
  onClose: () => void;
  canAddCategory?: boolean;
  onAddCategory?: (name: string, type: "expense" | "income") => Promise<Category | null>;
}

export function CategoryPickerModal({
  open,
  title,
  type,
  categories,
  selectedCategoryId,
  onSelect,
  onClose,
  canAddCategory,
  onAddCategory,
}: CategoryPickerModalProps) {
  const [search, setSearch] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [savingCat, setSavingCat] = useState(false);
  const debouncedSearch = useDebounce(search, 180);

  const filteredCategories = useMemo(() => {
    const keyword = normalize(debouncedSearch);
    if (!keyword) return categories;
    return categories.filter((cat) => normalize(cat.name).includes(keyword));
  }, [categories, debouncedSearch]);

  const handleQuickAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim() || !onAddCategory) return;
    try {
      setSavingCat(true);
      const created = await onAddCategory(newCatName.trim(), type);
      if (created) {
        onSelect(created.id);
        setNewCatName("");
        setShowAddForm(false);
        onClose();
      }
    } finally {
      setSavingCat(false);
    }
  };

  const modalTitle = title || (type === "expense" ? "Pilih Kategori Pengeluaran" : "Pilih Kategori Pemasukan");

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
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-black tracking-[0.13em] text-muted-foreground uppercase">
                  Kategori {type === "expense" ? "Pengeluaran" : "Pemasukan"}
                </p>
                <h3 className="font-display text-base tracking-tight text-ink">{modalTitle}</h3>
                <small className="block text-[11px] font-semibold text-muted-foreground">
                  {categories.length} kategori tersedia
                </small>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Tutup pilihan kategori"
                className="grid size-10 shrink-0 place-items-center rounded-[16px] border border-line bg-panel text-rose-dark transition hover:bg-rose-bg"
              >
                <X size={18} />
              </button>
            </div>

            {/* Quick Add Form / Toggle */}
            {canAddCategory && onAddCategory && (
              <div className="mt-3">
                {showAddForm ? (
                  <form onSubmit={handleQuickAdd} className="flex gap-2">
                    <input
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      placeholder={`Nama kategori ${type === "expense" ? "pengeluaran" : "pemasukan"} baru...`}
                      autoFocus
                      className="h-11 flex-1 rounded-2xl border border-field-border bg-field-bg px-3.5 text-xs font-semibold text-ink outline-none placeholder:text-muted-foreground focus:border-rose-strong focus:ring-2 focus:ring-rose-bg"
                    />
                    <button
                      type="submit"
                      disabled={savingCat || !newCatName.trim()}
                      className="h-11 rounded-2xl px-4 text-xs font-black text-on-accent shadow-accent transition disabled:opacity-60 [background-image:var(--gradient-brand)]"
                    >
                      {savingCat ? "..." : "Simpan"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddForm(false);
                        setNewCatName("");
                      }}
                      className="grid h-11 size-11 place-items-center rounded-2xl border border-line bg-soft text-muted-foreground hover:bg-panel"
                    >
                      <X size={15} />
                    </button>
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowAddForm(true)}
                    className="flex w-full items-center justify-center gap-1.5 rounded-[18px] border border-dashed border-line bg-soft/60 px-3 py-2 text-xs font-black text-rose-dark transition hover:bg-rose-bg"
                  >
                    <Plus size={14} /> Tambah Kategori Baru
                  </button>
                )}
              </div>
            )}

            {/* Search */}
            <label className="mt-3 flex items-center gap-2.5 rounded-[20px] border border-field-border bg-field-bg px-3.5 py-2.5 focus-within:border-rose-strong focus-within:ring-4 focus-within:ring-rose-bg">
              <Search size={16} className="shrink-0 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari kategori..."
                className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-muted-foreground"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="grid size-5 place-items-center rounded-full text-muted-foreground hover:text-ink"
                >
                  <X size={13} />
                </button>
              )}
            </label>

            {/* List */}
            <div className="mt-3 grid gap-2 overflow-y-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:thin]">
              {filteredCategories.length ? (
                filteredCategories.map((category) => {
                  const isSelected = selectedCategoryId === category.id;
                  return (
                    <button
                      type="button"
                      key={category.id}
                      onClick={() => {
                        onSelect(category.id);
                        onClose();
                      }}
                      className={cn(
                        "grid grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 rounded-[22px] border bg-panel p-3 text-left shadow-soft transition hover:-translate-y-0.5",
                        isSelected ? "border-rose-strong ring-4 ring-rose-bg" : "border-line"
                      )}
                    >
                      <span
                        className={cn(
                          "grid size-9 place-items-center rounded-[16px] border",
                          isSelected
                            ? "border-rose-strong bg-rose-bg text-rose-dark"
                            : "border-line bg-soft text-muted-foreground"
                        )}
                      >
                        <Tag size={16} />
                      </span>

                      <div className="min-w-0">
                        <strong className="block truncate text-[13.5px] font-black text-ink">{category.name}</strong>
                        <div className="mt-0.5 flex items-center gap-1.5">
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[9.5px] font-black uppercase",
                              category.isDefault
                                ? "border border-line bg-soft text-muted-foreground"
                                : "border border-rose-border bg-rose-bg text-rose-dark"
                            )}
                          >
                            {category.isDefault ? "Bawaan" : "Keluarga"}
                          </span>
                        </div>
                      </div>

                      <span
                        className={cn(
                          "grid size-7 place-items-center rounded-full border",
                          isSelected
                            ? "border-transparent text-on-accent [background-image:var(--gradient-brand)]"
                            : "border-line text-transparent"
                        )}
                      >
                        {isSelected ? <Check size={14} /> : null}
                      </span>
                    </button>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-line bg-soft p-5 text-center">
                  <strong className="block text-sm font-black text-ink">Kategori tidak ditemukan</strong>
                  <p className="mt-1 text-xs font-semibold text-muted-foreground">
                    Coba kata kunci lain atau gunakan tombol tambah di atas.
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

// ---------------------------------------------------------------------------
// Wallet Picker Modal
// ---------------------------------------------------------------------------

export interface WalletPickerModalProps {
  open: boolean;
  title?: string;
  accounts: Account[];
  selectedAccountId: string;
  onSelect: (accountId: string) => void;
  onClose: () => void;
  currentUserId: string;
  familyMembers?: FamilyMember[];
  filterMode?: "mine" | "all";
  onFilterModeChange?: (mode: "mine" | "all") => void;
}

export function WalletPickerModal({
  open,
  title = "Pilih Dompet",
  accounts,
  selectedAccountId,
  onSelect,
  onClose,
  currentUserId,
  familyMembers = [],
  filterMode: controlledFilterMode,
  onFilterModeChange,
}: WalletPickerModalProps) {
  const [internalFilterMode, setInternalFilterMode] = useState<"mine" | "all">("mine");
  const filterMode = controlledFilterMode ?? internalFilterMode;
  const setFilterMode = onFilterModeChange ?? setInternalFilterMode;

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 180);

  const activeAccounts = useMemo(() => accounts.filter((acc) => acc.isActive), [accounts]);

  const filteredAccounts = useMemo(() => {
    let list = activeAccounts;

    if (filterMode === "mine") {
      list = list.filter((acc) => {
        if (acc.createdBy === currentUserId) return true;
        if (acc.id === selectedAccountId) return true;
        return false;
      });
    }

    const keyword = normalize(debouncedSearch);
    if (keyword) {
      list = list.filter((acc) => {
        const typeLabel = accountTypeLabels[acc.type] || acc.type;
        return [acc.name, typeLabel].some((v) => normalize(v).includes(keyword));
      });
    }

    return list;
  }, [activeAccounts, filterMode, currentUserId, selectedAccountId, debouncedSearch]);

  const myWalletsCount = useMemo(
    () => activeAccounts.filter((acc) => acc.createdBy === currentUserId).length,
    [activeAccounts, currentUserId]
  );

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
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-black tracking-[0.13em] text-muted-foreground uppercase">Dompet & Akun</p>
                <h3 className="font-display text-base tracking-tight text-ink">{title}</h3>
                <small className="block text-[11px] font-semibold text-muted-foreground">
                  {filteredAccounts.length} dari {activeAccounts.length} dompet aktif
                </small>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Tutup pilihan dompet"
                className="grid size-10 shrink-0 place-items-center rounded-[16px] border border-line bg-panel text-rose-dark transition hover:bg-rose-bg"
              >
                <X size={18} />
              </button>
            </div>

            {/* Segmented Filter: Dompet Saya vs Semua Dompet */}
            <div className="mt-3 grid grid-cols-2 gap-1.5 rounded-[20px] border border-line bg-soft/70 p-1">
              <button
                type="button"
                onClick={() => setFilterMode("mine")}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-[16px] py-2 text-xs font-black transition",
                  filterMode === "mine"
                    ? "bg-panel text-rose-dark shadow-soft"
                    : "text-muted-foreground hover:text-ink"
                )}
              >
                <span>Dompet Saya</span>
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.2 text-[10px] font-extrabold",
                    filterMode === "mine" ? "bg-rose-bg text-rose-dark" : "bg-panel text-muted-foreground"
                  )}
                >
                  {myWalletsCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFilterMode("all")}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-[16px] py-2 text-xs font-black transition",
                  filterMode === "all"
                    ? "bg-panel text-rose-dark shadow-soft"
                    : "text-muted-foreground hover:text-ink"
                )}
              >
                <span>Semua Dompet</span>
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.2 text-[10px] font-extrabold",
                    filterMode === "all" ? "bg-rose-bg text-rose-dark" : "bg-panel text-muted-foreground"
                  )}
                >
                  {activeAccounts.length}
                </span>
              </button>
            </div>

            {/* Search */}
            <label className="mt-3 flex items-center gap-2.5 rounded-[20px] border border-field-border bg-field-bg px-3.5 py-2.5 focus-within:border-rose-strong focus-within:ring-4 focus-within:ring-rose-bg">
              <Search size={16} className="shrink-0 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama atau jenis dompet..."
                className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-muted-foreground"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="grid size-5 place-items-center rounded-full text-muted-foreground hover:text-ink"
                >
                  <X size={13} />
                </button>
              )}
            </label>

            {/* List */}
            <div className="mt-3 grid gap-2 overflow-y-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:thin]">
              {filteredAccounts.length ? (
                filteredAccounts.map((account) => {
                  const isSelected = selectedAccountId === account.id;
                  const Icon = accountTypeIcons[account.type] || Wallet;
                  const typeLabel = accountTypeLabels[account.type] || account.type;
                  const isMine = account.createdBy === currentUserId;
                  const isShared = !account.createdBy;
                  const owner = familyMembers.find((m) => m.userId === account.createdBy);

                  return (
                    <button
                      type="button"
                      key={account.id}
                      onClick={() => {
                        onSelect(account.id);
                        onClose();
                      }}
                      className={cn(
                        "grid grid-cols-[38px_minmax(0,1fr)_auto] items-center gap-3 rounded-[22px] border bg-panel p-3 text-left shadow-soft transition hover:-translate-y-0.5",
                        isSelected ? "border-rose-strong ring-4 ring-rose-bg" : "border-line"
                      )}
                    >
                      <span
                        className={cn(
                          "grid size-10 place-items-center rounded-[16px] border",
                          isSelected
                            ? "border-rose-strong bg-rose-bg text-rose-dark"
                            : "border-line bg-soft text-muted-foreground"
                        )}
                      >
                        <Icon size={18} />
                      </span>

                      <div className="min-w-0">
                        <strong className="block truncate text-[13.5px] font-black text-ink">{account.name}</strong>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                          <span className="rounded-full border border-line bg-soft px-2 py-0.5 text-[9.5px] font-black text-muted-foreground uppercase">
                            {typeLabel}
                          </span>
                          {isMine ? (
                            <span className="rounded-full border border-green-border bg-green-bg px-2 py-0.5 text-[9.5px] font-black text-green">
                              Milik Anda
                            </span>
                          ) : isShared ? (
                            <span className="rounded-full border border-line bg-soft px-2 py-0.5 text-[9.5px] font-black text-muted-foreground">
                              Bersama
                            </span>
                          ) : (
                            <span className="rounded-full border border-blue-border bg-blue-bg px-2 py-0.5 text-[9.5px] font-black text-blue">
                              {owner?.profile?.name || "Anggota"}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="grid shrink-0 justify-items-end gap-1 text-right">
                        <strong className="text-[13px] font-black text-ink">
                          {formatRupiah(account.currentBalance ?? account.initialBalance ?? 0)}
                        </strong>
                        <span
                          className={cn(
                            "grid size-6 place-items-center rounded-full border",
                            isSelected
                              ? "border-transparent text-on-accent [background-image:var(--gradient-brand)]"
                              : "border-line text-transparent"
                          )}
                        >
                          {isSelected ? <Check size={12} /> : null}
                        </span>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-line bg-soft p-5 text-center">
                  <strong className="block text-sm font-black text-ink">
                    {filterMode === "mine" ? "Tidak ada dompet pribadi" : "Dompet tidak ditemukan"}
                  </strong>
                  <p className="mt-1 text-xs font-semibold text-muted-foreground">
                    {filterMode === "mine"
                      ? "Belum ada dompet khusus milik Anda (semua dompet berstatus Bersama atau milik anggota lain). Klik tombol di bawah untuk melihat semua dompet."
                      : "Coba ubah kata kunci pencarian."}
                  </p>
                  {filterMode === "mine" && (
                    <button
                      type="button"
                      onClick={() => setFilterMode("all")}
                      className="mt-3 rounded-2xl border border-line bg-panel px-3.5 py-1.5 text-xs font-black text-rose-dark transition hover:bg-rose-bg"
                    >
                      Buka Semua Dompet ({activeAccounts.length})
                    </button>
                  )}
                </div>
              )}
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------------------
// Trigger Buttons
// ---------------------------------------------------------------------------

export function CategoryTriggerButton({
  category,
  placeholder = "Pilih kategori",
  onClick,
  hasError = false,
}: {
  category?: Category | null;
  placeholder?: string;
  onClick: () => void;
  hasError?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-12 w-full items-center justify-between gap-3 rounded-2xl border px-3.5 text-left transition",
        category
          ? "border-rose-strong/50 bg-rose-bg/30 hover:border-rose-strong hover:bg-rose-bg/50"
          : hasError
            ? "border-red-border bg-red-bg/20"
            : "border-field-border bg-field-bg hover:border-line"
      )}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <span
          className={cn(
            "grid size-7 shrink-0 place-items-center rounded-xl border text-xs",
            category
              ? "border-rose-border bg-rose-bg text-rose-dark"
              : "border-line bg-soft text-muted-foreground"
          )}
        >
          {category ? <Tag size={14} /> : <Sparkles size={14} />}
        </span>
        <span className="truncate text-sm font-semibold text-ink">
          {category ? category.name : <span className="font-normal text-muted-foreground">{placeholder}</span>}
        </span>
      </div>

      <span className="flex shrink-0 items-center gap-1 text-xs font-black text-rose-dark">
        {category ? "Ganti" : "Pilih"}
        <ChevronRight size={14} />
      </span>
    </button>
  );
}

export function WalletTriggerButton({
  account,
  placeholder = "Pilih dompet",
  onClick,
  hasError = false,
}: {
  account?: Account | null;
  placeholder?: string;
  onClick: () => void;
  hasError?: boolean;
}) {
  const Icon = account ? accountTypeIcons[account.type] || Wallet : Wallet;
  const typeLabel = account ? accountTypeLabels[account.type] || account.type : "";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-12 w-full items-center justify-between gap-3 rounded-2xl border px-3.5 text-left transition",
        account
          ? "border-rose-strong/50 bg-rose-bg/30 hover:border-rose-strong hover:bg-rose-bg/50"
          : hasError
            ? "border-red-border bg-red-bg/20"
            : "border-field-border bg-field-bg hover:border-line"
      )}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <span
          className={cn(
            "grid size-7 shrink-0 place-items-center rounded-xl border text-xs",
            account
              ? "border-rose-border bg-rose-bg text-rose-dark"
              : "border-line bg-soft text-muted-foreground"
          )}
        >
          <Icon size={14} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink">
            {account ? account.name : <span className="font-normal text-muted-foreground">{placeholder}</span>}
          </p>
          {account && (
            <p className="truncate text-[10px] font-semibold text-muted-foreground">
              {typeLabel} · Saldo {formatRupiah(account.currentBalance ?? account.initialBalance ?? 0)}
            </p>
          )}
        </div>
      </div>

      <span className="flex shrink-0 items-center gap-1 text-xs font-black text-rose-dark">
        {account ? "Ganti" : "Pilih"}
        <ChevronRight size={14} />
      </span>
    </button>
  );
}
