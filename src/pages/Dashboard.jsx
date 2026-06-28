import React, { useMemo, useState } from 'react';
import { Bell, Eye, EyeOff, PiggyBank, Plus, UsersRound, Wallet } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import { Card, ProgressBar } from '../components/UI.jsx';
import { formatRupiah } from '../utils/format.js';
import { getBudgetUsage, getMonthTransactions } from '../utils/calculations.js';
import FinanceDetailModal from '../components/FinanceDetailModal.jsx';

const monthNow = () => new Date().getMonth() + 1;
const yearNow = () => new Date().getFullYear();

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

export default function Dashboard({ onNavigate, onQuickAdd }) {
  const {
    user,
    household,
    familyMembers,
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

  const currentMonthTransactions = useMemo(() => getMonthTransactions(transactions, monthNow(), yearNow()), [transactions]);
  const currentBudgets = useMemo(() => budgets.filter((budget) => Number(budget.month) === monthNow() && Number(budget.year) === yearNow()), [budgets]);
  const unreadNotifications = notifications.filter((item) => !item.readAt);

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

  const openWalletDetail = (wallet) => setDetail({ open: true, type: 'wallet', item: wallet });
  const openBudgetDetail = (budget) => setDetail({ open: true, type: 'budget', item: budget });
  const closeDetail = () => setDetail({ open: false, type: '', item: null });

  const handleNotificationClick = async (notification) => {
    if (!notification.readAt) await markNotificationRead?.(notification.id);
    if (notification.target && typeof onNavigate === 'function') onNavigate(notification.target);
    setShowNotifications(false);
  };

  return (
    <div className="page dashboard-page wallet-budget-dashboard">
      <header className="header playful-page-header dashboard-modern-header">
        <div className="dashboard-user-block">
          <Avatar user={user} />
          <div>
            <p className="eyebrow">KeuanganKu</p>
            <h1>Halo, {user?.name || 'Pengguna'}</h1>
            <small>{household?.name || 'Keluarga belum dipilih'}</small>
          </div>
        </div>
        <div className="dashboard-header-actions">
          <button className="icon-btn playful-icon-btn" type="button" onClick={() => setShowNotifications((value) => !value)} aria-label="Notifikasi">
            <Bell size={18} />
            {unreadNotifications.length > 0 && <span className="notification-dot">{unreadNotifications.length}</span>}
          </button>
          <button className="icon-btn playful-icon-btn" type="button" onClick={() => setShowBalance((value) => !value)} aria-label="Tampilkan saldo">
            {showBalance ? <Eye size={18} /> : <EyeOff size={18} />}
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

      <Card className="dashboard-balance-hero">
        <div className="row-between">
          <div>
            <p className="section-kicker">Total Saldo Keluarga</p>
            <h2>{showBalance ? formatRupiah(totalBalance) : 'Rp••••••••'}</h2>
            <small>{accountBalances.length} dompet aktif/terdaftar</small>
          </div>
          <button className="primary-btn compact" type="button" onClick={onQuickAdd}><Plus size={16} /> Catat</button>
        </div>
        <div className="dashboard-stats-grid">
          <div><span>Pemasukan bulan ini</span><strong>{formatRupiah(monthlyIncome)}</strong></div>
          <div><span>Pengeluaran bulan ini</span><strong>{formatRupiah(monthlyExpense)}</strong></div>
          <div><span>Net bulan ini</span><strong>{formatRupiah(monthlyIncome - monthlyExpense)}</strong></div>
        </div>
      </Card>

      <section className="dashboard-section">
        <div className="section-heading-row">
          <div>
            <p className="section-kicker">Dompet</p>
            <h2>Saldo per dompet</h2>
          </div>
          <small>Klik card untuk melihat transaksi & alokasi.</small>
        </div>
        <div className="wallet-card-grid">
          {accountBalances.length ? accountBalances.map((wallet) => (
            <button className="wallet-click-card" type="button" key={wallet.id} onClick={() => openWalletDetail(wallet)}>
              <span className="wallet-click-icon"><Wallet size={18} /></span>
              <span>
                <strong>{wallet.name}</strong>
                <small>{wallet.type || 'Dompet'} • {wallet.isActive ? 'Aktif' : 'Nonaktif'}</small>
              </span>
              <em>{showBalance ? formatRupiah(wallet.currentBalance) : 'Rp••••••'}</em>
            </button>
          )) : <Card className="empty-soft-card">Belum ada dompet keluarga.</Card>}
        </div>
      </section>

      <section className="dashboard-section">
        <div className="section-heading-row">
          <div>
            <p className="section-kicker">Alokasi Bulan Ini</p>
            <h2>Ringkasan budget</h2>
          </div>
          <button className="link-btn" type="button" onClick={() => onNavigate?.('budgets')}>Lihat semua</button>
        </div>
        <Card className="dashboard-budget-summary-card">
          <div className="row-between">
            <div>
              <p className="muted tiny">Dipakai {formatRupiah(usedBudget)} dari {formatRupiah(totalBudget)}</p>
              <h3>{overBudgetAmount > 0 ? `Over budget ${formatRupiah(overBudgetAmount)}` : `${budgetProgress}% digunakan`}</h3>
            </div>
            <PiggyBank size={22} />
          </div>
          <ProgressBar value={budgetProgress} variant="orange" />
        </Card>
        <div className="dashboard-budget-card-grid">
          {currentBudgets.length ? currentBudgets.map((budget) => {
            const usage = getBudgetUsage(budget, currentMonthTransactions);
            const wallet = accountBalances.find((account) => account.id === budget.accountId);
            const progressRaw = budget.amount > 0 ? Math.round((usage.used / budget.amount) * 100) : 0;
            const progress = Math.min(100, progressRaw);
            const overBudget = Number(usage.remaining || 0) < 0;
            return (
              <button className={`budget-click-card ${overBudget ? 'over-budget' : ''}`} type="button" key={budget.id} onClick={() => openBudgetDetail(budget)}>
                <span>
                  <strong>{budget.name}</strong>
                  <small>{wallet?.name || 'Dompet tidak ditemukan'}</small>
                </span>
                <em className={overBudget ? 'danger' : ''}>{overBudget ? `Over ${formatRupiah(Math.abs(usage.remaining))}` : `${formatRupiah(usage.remaining)} tersisa`}</em>
                <ProgressBar value={progress} variant="orange" />
              </button>
            );
          }) : <Card className="empty-soft-card">Belum ada alokasi untuk bulan ini.</Card>}
        </div>
      </section>

      <section className="dashboard-section">
        <div className="section-heading-row">
          <div>
            <p className="section-kicker">Aktivitas</p>
            <h2>Transaksi terbaru</h2>
          </div>
          <button className="link-btn" type="button" onClick={() => onNavigate?.('transactions')}>Semua</button>
        </div>
        <Card className="dashboard-activity-card">
          {transactions.length ? transactions.slice(0, 6).map((trx) => (
            <div className="activity-row" key={trx.id}>
              <span className={`activity-icon ${trx.type}`}>{trx.type === 'income' ? '+' : '-'}</span>
              <div>
                <strong>{trx.note || (trx.type === 'income' ? 'Pemasukan' : 'Pengeluaran')}</strong>
                <small>{trx.transactionDate}</small>
              </div>
              <em className={trx.type}>{trx.type === 'income' ? '+' : '-'}{formatRupiah(trx.amount)}</em>
            </div>
          )) : <p className="muted tiny">Belum ada transaksi.</p>}
        </Card>
      </section>

      <Card className="family-mini-card">
        <UsersRound size={18} />
        <div>
          <strong>{familyMembers.length} anggota keluarga</strong>
          <small>Kode keluarga: {household?.inviteCode || '-'}</small>
        </div>
      </Card>

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
