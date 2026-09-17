import { useMemo, useState } from "react";
import { Bell, Eye, EyeOff, Wallet } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { ProgressBar } from "@/components/UI";
import FinanceDetailModal from "@/components/FinanceDetailModal";
import { cn } from "@/lib/utils";
import { formatRupiah } from "@/utils/format";
import { getBudgetUsage } from "@/utils/calculations";
import { getBudgetCycleTransactions, getCurrentBudgetCycle, formatBudgetCycleRange } from "@/utils/budgetCycle";
import type { Account, AppNotification, Budget, Transaction } from "@/types";

interface DashboardProps {
  goTo?: (tab: string) => void;
  onNavigate?: (tab: string) => void;
}

const walletGradients = [
  "bg-[linear-gradient(135deg,var(--blue),var(--violet))]",
  "bg-[linear-gradient(135deg,var(--green),var(--teal))]",
  "bg-[linear-gradient(135deg,var(--amber),var(--orange))]",
  "bg-[linear-gradient(135deg,var(--rose-strong),var(--rose))]",
  "bg-[linear-gradient(135deg,var(--violet),var(--rose-strong))]",
];

function initials(name = "Pengguna") {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "P"
  );
}

function getProgressVariant(progressRaw: number, isOverBudget = false) {
  if (isOverBudget || progressRaw >= 100) return "red";
  if (progressRaw >= 75) return "amber";
  return "green";
}

function formatDateTime(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function Avatar({ user }: { user?: { name?: string; avatarUrl?: string } | null }) {
  return (
    <div className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-[17px] border border-line bg-panel-strong text-base font-black text-rose-dark">
      {user?.avatarUrl ? <img src={user.avatarUrl} alt={user?.name || "Foto profil"} className="size-full object-cover" /> : <span>{initials(user?.name)}</span>}
    </div>
  );
}

export default function Dashboard({ goTo, onNavigate }: DashboardProps) {
  const {
    user,
    household,
    accountBalances,
    transactions,
    budgets,
    notifications = [],
    markNotificationRead,
    markAllNotificationsRead,
    requestNotificationPermission,
  } = useApp();

  const [showBalance, setShowBalance] = useState(true);
  const [detail, setDetail] = useState<{ open: boolean; type: string; item: unknown }>({ open: false, type: "", item: null });
  const [showNotifications, setShowNotifications] = useState(false);

  const navigate = goTo || onNavigate;

  const activeCycle = useMemo(() => getCurrentBudgetCycle(), []);
  const currentMonthTransactions = useMemo(
    () => getBudgetCycleTransactions(transactions, activeCycle.month, activeCycle.year),
    [transactions, activeCycle.month, activeCycle.year]
  );
  const currentBudgets = useMemo(
    () => budgets.filter((budget: Budget) => Number(budget.month) === Number(activeCycle.month) && Number(budget.year) === Number(activeCycle.year)),
    [budgets, activeCycle.month, activeCycle.year]
  );
  const unreadNotifications = notifications.filter((item: AppNotification) => !item.readAt);
  const latestTransactions = useMemo(() => [...transactions].slice(0, 4), [transactions]);

  const totalBalance = accountBalances.reduce((sum: number, account: Account) => sum + Number(account.currentBalance || 0), 0);
  const monthlyIncome = currentMonthTransactions
    .filter((trx: Transaction) => trx.type === "income")
    .reduce((sum: number, trx: Transaction) => sum + Number(trx.amount || 0), 0);
  const monthlyExpense = currentMonthTransactions
    .filter((trx: Transaction) => trx.type === "expense")
    .reduce((sum: number, trx: Transaction) => sum + Number(trx.amount || 0), 0);
  const totalBudget = currentBudgets.reduce((sum: number, budget: Budget) => sum + Number(budget.amount || 0), 0);
  const usedBudget = currentBudgets.reduce((sum: number, budget: Budget) => sum + getBudgetUsage(budget, currentMonthTransactions).used, 0);
  const budgetProgressRaw = totalBudget > 0 ? Math.round((usedBudget / totalBudget) * 100) : 0;
  const budgetProgress = Math.min(100, budgetProgressRaw);
  const overBudgetAmount = currentBudgets.reduce((sum: number, budget: Budget) => {
    const usage = getBudgetUsage(budget, currentMonthTransactions);
    return sum + Math.max(0, Math.abs(Math.min(usage.remaining, 0)));
  }, 0);
  const budgetVariant = getProgressVariant(budgetProgressRaw, overBudgetAmount > 0);

  const openWalletDetail = (wallet: unknown) => setDetail({ open: true, type: "wallet", item: wallet });
  const openBudgetDetail = (budget: unknown) => setDetail({ open: true, type: "budget", item: budget });
  const closeDetail = () => setDetail({ open: false, type: "", item: null });

  const handleNotificationClick = async (notification: AppNotification) => {
    if (!notification.readAt) await markNotificationRead?.(notification.id);
    if (notification.target && typeof navigate === "function") navigate(notification.target);
    setShowNotifications(false);
  };

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center justify-between gap-3 px-0.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <Avatar user={user} />
          <div className="min-w-0 text-left">
            <small className="block text-[11px] font-black tracking-[0.12em] text-muted-foreground uppercase">KeuanganKu</small>
            <strong className="block truncate font-display text-xl tracking-tight text-ink">
              Halo, {user?.name || "Pengguna"}
            </strong>
            <p className="truncate text-[11px] text-muted-foreground">{household?.name || "Keluarga belum dipilih"}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowNotifications((value) => !value)}
          aria-label="Notifikasi"
          className="relative grid size-11 shrink-0 place-items-center rounded-[18px] border border-line bg-panel text-rose-dark shadow-soft transition hover:bg-rose-bg"
        >
          <Bell size={18} />
          {unreadNotifications.length > 0 && (
            <span className="absolute -top-1 -right-1 grid size-5 place-items-center rounded-full bg-red text-[10px] font-black text-white">
              {unreadNotifications.length}
            </span>
          )}
        </button>
      </header>

      {showNotifications && (
        <section className="rounded-[28px] border border-line-strong bg-panel-strong/90 p-4 shadow-soft backdrop-blur-xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black tracking-[0.13em] text-muted-foreground uppercase">Notifikasi</p>
              <h2 className="font-display text-lg tracking-tight text-ink">Aktivitas terbaru</h2>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={requestNotificationPermission}
                className="rounded-full border border-line bg-panel-strong px-3 py-2 text-[11px] font-black text-rose-dark transition hover:bg-rose-bg"
              >
                Aktifkan push
              </button>
              {unreadNotifications.length > 0 && (
                <button
                  type="button"
                  onClick={markAllNotificationsRead}
                  className="rounded-full border border-line bg-panel-strong px-3 py-2 text-[11px] font-black text-rose-dark transition hover:bg-rose-bg"
                >
                  Semua dibaca
                </button>
              )}
            </div>
          </div>

          <div className="mt-3 grid gap-2">
            {notifications.length ? (
              notifications.slice(0, 8).map((notification: AppNotification) => (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => handleNotificationClick(notification)}
                  className={cn(
                    "rounded-2xl border border-line bg-soft p-3 text-left transition hover:border-line-strong",
                    notification.readAt && "opacity-65"
                  )}
                >
                  <strong className="mb-0.5 block text-[13px] font-black text-ink">{notification.title}</strong>
                  <small className="text-[11px] text-muted-foreground">{notification.message || "Ada aktivitas baru."}</small>
                </button>
              ))
            ) : (
              <p className="text-xs text-muted-foreground">Belum ada notifikasi.</p>
            )}
          </div>
        </section>
      )}

      <section className="relative overflow-hidden rounded-[32px] p-5 text-white shadow-accent [background-image:var(--gradient-brand)]">
        <span className="pointer-events-none absolute -right-16 -bottom-20 size-44 rounded-full border-[28px] border-white/15" />
        <div className="relative z-10 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="mb-1 text-xs font-extrabold text-white/80">Total Saldo Keluarga</p>
            <strong className="block font-display text-[clamp(26px,7.2vw,36px)] leading-none font-black tracking-[-0.06em] text-white">
              {showBalance ? formatRupiah(totalBalance) : "Rp••••••••"}
            </strong>
          </div>
          <button
            type="button"
            onClick={() => setShowBalance((value) => !value)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/25 bg-white/15 px-3 py-1.5 text-[11px] font-black text-white transition hover:bg-white/25"
          >
            {showBalance ? <EyeOff size={14} /> : <Eye size={14} />}
            {showBalance ? "Sembunyikan" : "Tampilkan"}
          </button>
        </div>

        <div className="relative z-10 mt-4 grid grid-cols-2 gap-2.5">
          <div className="rounded-[20px] border border-white/20 bg-white/15 p-3">
            <span className="mb-1 block text-[10px] font-extrabold text-white/75">Pemasukan bulan ini</span>
            <strong className="text-sm font-black tracking-tight text-white">{formatRupiah(monthlyIncome)}</strong>
          </div>
          <div className="rounded-[20px] border border-white/20 bg-white/15 p-3">
            <span className="mb-1 block text-[10px] font-extrabold text-white/75">Pengeluaran bulan ini</span>
            <strong className="text-sm font-black tracking-tight text-white">{formatRupiah(monthlyExpense)}</strong>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black tracking-[0.13em] text-muted-foreground uppercase">Dompet</p>
            <h2 className="font-display text-lg tracking-tight text-ink">Saldo per dompet</h2>
          </div>
          <button
            type="button"
            onClick={() => navigate?.("wallets")}
            className="bg-transparent text-xs font-black text-rose-dark transition hover:opacity-80"
          >
            Kelola
          </button>
        </div>

        {accountBalances.length ? (
          <div className="flex snap-x gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {accountBalances.map((wallet: Account, index: number) => (
              <button
                key={wallet.id}
                type="button"
                onClick={() => openWalletDetail(wallet)}
                className={cn(
                  "min-w-[230px] snap-start rounded-[26px] p-4 text-left text-white shadow-soft transition hover:-translate-y-0.5",
                  walletGradients[index % walletGradients.length],
                  !wallet.isActive && "opacity-70"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="grid size-9 place-items-center rounded-xl bg-white/20">
                    <Wallet size={18} />
                  </span>
                  <span className="rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-black uppercase">{wallet.type || "Dompet"}</span>
                </div>
                <h3 className="mt-3 truncate text-sm font-black">{wallet.name}</h3>
                <strong className="mt-0.5 block font-display text-2xl font-black tracking-tight">
                  {showBalance ? formatRupiah(wallet.currentBalance) : "Rp••••••"}
                </strong>
                <p className="mt-1 text-[10px] font-bold text-white/75">
                  {wallet.isActive ? "Aktif" : "Nonaktif"} · ketuk untuk detail & alokasi
                </p>
              </button>
            ))}
          </div>
        ) : (
          <section className="rounded-[28px] border border-line-strong bg-panel-strong/90 p-4 text-sm text-muted-foreground shadow-soft">
            Belum ada dompet keluarga.
          </section>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black tracking-[0.13em] text-muted-foreground uppercase">Alokasi Periode Ini</p>
            <h2 className="font-display text-lg tracking-tight text-ink">Ringkasan budget</h2>
            <small className="text-[11px] text-muted-foreground">{formatBudgetCycleRange(activeCycle.month, activeCycle.year)}</small>
          </div>
          <button
            type="button"
            onClick={() => navigate?.("budgets")}
            className="bg-transparent text-xs font-black text-rose-dark transition hover:opacity-80"
          >
            Lihat semua
          </button>
        </div>

        <section className="rounded-[28px] border border-line-strong bg-panel-strong/90 p-4 shadow-soft backdrop-blur-xl">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <span className="block text-[10px] font-extrabold text-muted-foreground">Total</span>
              <strong className="text-[13px] font-black text-ink">{formatRupiah(totalBudget)}</strong>
            </div>
            <div>
              <span className="block text-[10px] font-extrabold text-muted-foreground">Terpakai</span>
              <strong className="text-[13px] font-black text-ink">{formatRupiah(usedBudget)}</strong>
            </div>
            <div>
              <span className="block text-[10px] font-extrabold text-muted-foreground">
                {overBudgetAmount > 0 ? "Over budget" : "Progress"}
              </span>
              <strong className={cn("text-[13px] font-black", overBudgetAmount > 0 ? "text-red" : "text-ink")}>
                {overBudgetAmount > 0 ? formatRupiah(overBudgetAmount) : `${budgetProgressRaw}%`}
              </strong>
            </div>
          </div>

          <div className="mt-3">
            <ProgressBar value={budgetProgress} variant={budgetVariant} />
          </div>

          <div className="mt-3">
            {currentBudgets.length ? (
              currentBudgets.slice(0, 4).map((budget: Budget) => {
                const usage = getBudgetUsage(budget, currentMonthTransactions);
                const wallet = accountBalances.find((account: Account) => account.id === budget.accountId);
                const progressRaw = budget.amount > 0 ? Math.round((usage.used / budget.amount) * 100) : 0;
                const progress = Math.min(100, progressRaw);
                const overBudget = Number(usage.remaining || 0) < 0;
                const variant = getProgressVariant(progressRaw, overBudget);

                return (
                  <button
                    key={budget.id}
                    type="button"
                    onClick={() => openBudgetDetail(budget)}
                    className="block w-full border-b border-line bg-transparent py-3 text-left last:border-0 last:pb-0"
                  >
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="truncate text-[13.5px] font-black text-ink">{budget.name}</h3>
                        <p className="text-[11px] text-muted-foreground">{wallet?.name || "Dompet tidak ditemukan"}</p>
                      </div>
                      <strong className={cn("shrink-0 text-[12.5px] font-black", overBudget ? "text-red" : "text-ink")}>
                        {overBudget ? `Over ${formatRupiah(Math.abs(usage.remaining))}` : formatRupiah(usage.remaining)}
                      </strong>
                    </div>
                    <ProgressBar value={progress} variant={variant} />
                  </button>
                );
              })
            ) : (
              <p className="text-xs font-semibold text-muted-foreground">Belum ada alokasi untuk periode gajian ini.</p>
            )}
          </div>
        </section>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black tracking-[0.13em] text-muted-foreground uppercase">Aktivitas</p>
            <h2 className="font-display text-lg tracking-tight text-ink">Transaksi terbaru</h2>
          </div>
          <button
            type="button"
            onClick={() => navigate?.("transactions")}
            className="bg-transparent text-xs font-black text-rose-dark transition hover:opacity-80"
          >
            Semua
          </button>
        </div>

        <div className="grid gap-2.5">
          {latestTransactions.length ? (
            latestTransactions.map((trx: Transaction) => {
              const isIncome = trx.type === "income";
              return (
                <div key={trx.id} className="flex items-center gap-3 rounded-[22px] border border-line bg-panel p-3 shadow-soft">
                  <span
                    className={cn(
                      "grid size-10 shrink-0 place-items-center rounded-2xl text-lg font-black",
                      isIncome ? "bg-green-bg text-green" : "bg-red-bg text-red"
                    )}
                  >
                    {isIncome ? "+" : "-"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <strong className="block truncate text-[13px] font-black text-ink">
                      {trx.note || (isIncome ? "Pemasukan" : "Pengeluaran")}
                    </strong>
                    <p className="text-[11px] text-muted-foreground">{formatDateTime(trx.createdAt || trx.updatedAt || trx.transactionDate)}</p>
                  </div>
                  <strong className={cn("shrink-0 text-[12.5px] font-black", isIncome ? "text-green" : "text-red")}>
                    {isIncome ? "+" : "-"}
                    {formatRupiah(trx.amount)}
                  </strong>
                </div>
              );
            })
          ) : (
            <section className="rounded-[28px] border border-line-strong bg-panel-strong/90 p-4 text-sm text-muted-foreground shadow-soft">
              Belum ada transaksi.
            </section>
          )}
        </div>
      </section>

      <FinanceDetailModal
        open={detail.open}
        type={detail.type}
        item={detail.item}
        transactions={transactions}
        budgets={budgets}
        accountBalances={accountBalances}
        onClose={closeDetail}
      />
    </div>
  );
}
