import React, { useMemo, useState } from 'react';
import { Bell, Eye, EyeOff, PiggyBank, Plus, Wallet } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import { Card, ProgressBar } from '../components/UI.jsx';
import { formatRupiah } from '../utils/format.js';
import { getBudgetUsage, getMonthTransactions } from '../utils/calculations.js';
import FinanceDetailModal from '../components/FinanceDetailModal.jsx';

const monthNow = () => new Date().getMonth() + 1;
const yearNow = () => new Date().getFullYear();
const walletColors = ['blue', 'green', 'amber', 'rose', 'violet'];

function initials(name = 'Pengguna') {
  return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'P';
}

function Avatar({ user }) {
  return (
    <div className="dashboard-user-avatar">
      {user?.avatarUrl ? <img src={user.avatarUrl} alt={user?.name || 'Foto profil'} /> : <span>{initials(user?.name)}</span>}
    </div>
  );
}

function getProgressVariant(progressRaw, isOverBudget = false) {
  if (isOverBudget || progressRaw >= 100) return 'red';
  if (progressRaw >= 75) return 'amber';
  return 'green';
}

function formatDateTime(value) {
  if (!value) return '-';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export default function Dashboard({ onAddTransaction, goTo, onNavigate, onQuickAdd }) {
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
  const [detail, setDetail] = useState({ open: false, type: '', item: null });
  const [showNotifications, setShowNotifications] = useState(false);

  const navigate = goTo || onNavigate;
  const quickAdd = onAddTransaction || onQuickAdd;

  const currentMonthTransactions = useMemo(() => getMonthTransactions(transactions, monthNow(), yearNow()), [transactions]);
  const currentBudgets = useMemo(() => budgets.filter((budget) => Number(budget.month) === monthNow() && Number(budget.year) === yearNow()), [budgets]);
  const unreadNotifications = notifications.filter((item) => !item.readAt);
  const latestTransactions = useMemo(() => [...transactions].slice(0, 4), [transactions]);

  const totalBalance = accountBalances.reduce((sum, account) => sum + Number(account.currentBalance || 0), 0);
  const monthlyIncome = currentMonthTransactions.filter((trx) => trx.type === 'income').reduce((sum, trx) => sum + Number(trx.amount || 0), 0);
  const monthlyExpense = currentMonthTransactions.filter((trx) => trx.type === 'expense').reduce((sum, trx) => sum + Number(trx.amount || 0), 0);
  const totalBudget = currentBudgets.reduce((sum, budget) => sum + Number(budget.amount || 0), 0);
  const usedBudget = currentBudgets.reduce((sum, budget) => sum + getBudgetUsage(budget, currentMonthTransactions).used, 0);
  const budgetProgressRaw = totalBudget > 0 ? Math.round((usedBudget / totalBudget) * 100) : 0;
  const budgetProgress = Math.min(100, budgetProgressRaw);
  const overBudgetAmount = currentBudgets.reduce((sum, budget) => {
    const usage = getBudgetUsage(budget, currentMonthTransactions);
    return sum + Math.max(0, Math.abs(Math.min(usage.remaining, 0)));
  }, 0);
  const budgetVariant = getProgressVariant(budgetProgressRaw, overBudgetAmount > 0);

  const openWalletDetail = (wallet) => setDetail({ open: true, type: 'wallet', item: wallet });
  const openBudgetDetail = (budget) => setDetail({ open: true, type: 'budget', item: budget });
  const closeDetail = () => setDetail({ open: false, type: '', item: null });

  const handleNotificationClick = async (notification) => {
    if (!notification.readAt) await markNotificationRead?.(notification.id);
    if (notification.target && typeof navigate === 'function') navigate(notification.target);
    setShowNotifications(false);
  };

  return (
    <div className="page dashboard-page">
      <header className="header playful-page-header dashboard-modern-header">
        <div className="playful-brand dashboard-user-block">
          <Avatar user={user} />
          <div className="brand-copy">
            <small>KeuanganKu</small>
            <strong>Halo, {user?.name || 'Pengguna'}</strong>
            <p className="item-sub">{household?.name || 'Keluarga belum dipilih'}</p>
          </div>
        </div>
        <div className="dashboard-header-actions">
          <button className="icon-btn playful-icon-btn" type="button" onClick={() => setShowNotifications((value) => !value)} aria-label="Notifikasi">
            <Bell size={18} />
            {unreadNotifications.length > 0 && <span className="notification-dot">{unreadNotifications.length}</span>}
          </button>
        </div>
      </header>

      {showNotifications && (
        <Card className="dashboard-notification-panel">
          <div className="row-between">
            <div>
              <p className="section-kicker">Notifikasi</p>
              <h2>Aktivitas terbaru</h2>
            </div>
            <div className="inline-actions">
              <button className="small-btn" type="button" onClick={requestNotificationPermission}>Aktifkan push</button>
              {unreadNotifications.length > 0 && <button className="small-btn" type="button" onClick={markAllNotificationsRead}>Semua dibaca</button>}
            </div>
          </div>
          <div className="dashboard-notification-list">
            {notifications.length ? notifications.slice(0, 8).map((notification) => (
              <button className={`notification-row ${notification.readAt ? 'read' : ''}`} type="button" key={notification.id} onClick={() => handleNotificationClick(notification)}>
                <strong>{notification.title}</strong>
                <small>{notification.message || 'Ada aktivitas baru.'}</small>
              </button>
            )) : <p className="muted tiny">Belum ada notifikasi.</p>}
          </div>
        </Card>
      )}

      <section className="playful-balance-card dashboard-gradient-balance-card">
        <div className="playful-balance-top">
          <div>
            <p>Total Saldo Keluarga</p>
            <span>{accountBalances.length} dompet aktif/terdaftar</span>
          </div>
          <button className="balance-toggle-btn" type="button" onClick={() => setShowBalance((value) => !value)}>
            {showBalance ? <EyeOff size={15} /> : <Eye size={15} />}
            {showBalance ? 'Sembunyikan' : 'Tampilkan'}
          </button>
        </div>

        <strong className="playful-balance-amount">{showBalance ? formatRupiah(totalBalance) : 'Rp••••••••'}</strong>

        <div className="playful-balance-metrics">
          <div>
            <span>Pemasukan bulan ini</span>
            <strong>{formatRupiah(monthlyIncome)}</strong>
          </div>
          <div>
            <span>Pengeluaran bulan ini</span>
            <strong>{formatRupiah(monthlyExpense)}</strong>
          </div>
        </div>

        <button className="primary-btn playful-primary-btn" type="button" onClick={quickAdd} style={{ marginTop: 14, position: 'relative', zIndex: 1 }}>
          <Plus size={16} /> Catat Transaksi
        </button>
      </section>

      <section>
        <div className="section-head">
          <div>
            <p className="section-kicker">Dompet</p>
            <h2>Saldo per dompet</h2>
          </div>
          <button className="section-link" type="button" onClick={() => navigate?.('profile')}>Kelola</button>
        </div>

        <div className="playful-wallet-carousel">
          {accountBalances.length ? accountBalances.map((wallet, index) => (
            <button
              className={`playful-wallet-card ${walletColors[index % walletColors.length]}`}
              type="button"
              key={wallet.id}
              onClick={() => openWalletDetail(wallet)}
              style={{ width: '100%', textAlign: 'left', font: 'inherit', cursor: 'pointer' }}
            >
              <div className="playful-wallet-top">
                <span className="playful-wallet-icon"><Wallet size={18} /></span>
                <span className="wallet-type-pill">{wallet.type || 'Dompet'}</span>
              </div>
              <h3>{wallet.name}</h3>
              <strong>{showBalance ? formatRupiah(wallet.currentBalance) : 'Rp••••••'}</strong>
              <p>{wallet.isActive ? 'Aktif' : 'Nonaktif'} • klik untuk detail transaksi & alokasi</p>
            </button>
          )) : <Card>Belum ada dompet keluarga.</Card>}
        </div>
        {accountBalances.length > 1 && <div className="wallet-scroll-hint"><span className="active" /><span /><span /></div>}
      </section>

      <section>
        <div className="section-head">
          <div>
            <p className="section-kicker">Alokasi Bulan Ini</p>
            <h2>Ringkasan budget</h2>
          </div>
          <button className="section-link" type="button" onClick={() => navigate?.('budgets')}>Lihat semua</button>
        </div>

        <Card>
          <div className="playful-budget-summary">
            <div>
              <span>Total</span>
              <strong>{formatRupiah(totalBudget)}</strong>
            </div>
            <div>
              <span>Terpakai</span>
              <strong>{formatRupiah(usedBudget)}</strong>
            </div>
            <div>
              <span>{overBudgetAmount > 0 ? 'Over budget' : 'Progress'}</span>
              <strong>{overBudgetAmount > 0 ? formatRupiah(overBudgetAmount) : `${budgetProgressRaw}%`}</strong>
            </div>
          </div>
          <ProgressBar value={budgetProgress} variant={budgetVariant} />

          <div style={{ marginTop: 12 }}>
            {currentBudgets.length ? currentBudgets.slice(0, 4).map((budget) => {
              const usage = getBudgetUsage(budget, currentMonthTransactions);
              const wallet = accountBalances.find((account) => account.id === budget.accountId);
              const progressRaw = budget.amount > 0 ? Math.round((usage.used / budget.amount) * 100) : 0;
              const progress = Math.min(100, progressRaw);
              const overBudget = Number(usage.remaining || 0) < 0;
              const variant = getProgressVariant(progressRaw, overBudget);

              return (
                <button
                  className={`playful-budget-row ${overBudget ? 'over-budget' : ''}`}
                  type="button"
                  key={budget.id}
                  onClick={() => openBudgetDetail(budget)}
                  style={{ width: '100%', textAlign: 'left', font: 'inherit', background: 'transparent', border: 0, padding: '12px 0', cursor: 'pointer' }}
                >
                  <div className="budget-row-header">
                    <div>
                      <h3>{budget.name}</h3>
                      <p className="item-sub">{wallet?.name || 'Dompet tidak ditemukan'}</p>
                    </div>
                    <strong className={overBudget ? 'amount expense' : ''}>{overBudget ? `Over ${formatRupiah(Math.abs(usage.remaining))}` : formatRupiah(usage.remaining)}</strong>
                  </div>
                  <ProgressBar value={progress} variant={variant} />
                </button>
              );
            }) : <p className="playful-empty-inline">Belum ada alokasi untuk bulan ini.</p>}
          </div>
        </Card>
      </section>

      <section>
        <div className="section-head">
          <div>
            <p className="section-kicker">Aktivitas</p>
            <h2>Transaksi terbaru</h2>
          </div>
          <button className="section-link" type="button" onClick={() => navigate?.('transactions')}>Semua</button>
        </div>

        <div className="transaction-list">
          {latestTransactions.length ? latestTransactions.map((trx) => (
            <div className="transaction-item" key={trx.id}>
              <span className={`transaction-icon ${trx.type}`}>{trx.type === 'income' ? '+' : '-'}</span>
              <div>
                <strong>{trx.note || (trx.type === 'income' ? 'Pemasukan' : 'Pengeluaran')}</strong>
                <p className="item-sub">{formatDateTime(trx.createdAt || trx.updatedAt || trx.transactionDate)}</p>
                {trx.transactionDate && <p className="item-sub">Tanggal transaksi: {trx.transactionDate}</p>}
              </div>
              <strong className={`amount ${trx.type}`}>{trx.type === 'income' ? '+' : '-'}{formatRupiah(trx.amount)}</strong>
            </div>
          )) : <Card>Belum ada transaksi.</Card>}
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
