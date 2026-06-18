import React, { useMemo, useState } from 'react';
import {
  Banknote,
  Bell,
  ChevronRight,
  Copy,
  Eye,
  EyeOff,
  Landmark,
  PiggyBank,
  ReceiptText,
  Smartphone,
  Target,
  UserPlus,
  UsersRound,
  Wallet,
} from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import { Card, ProgressBar, SectionHead, StatusPill } from '../components/UI.jsx';
import TransactionList from '../components/TransactionList.jsx';
import { currentMonthYear, formatDate, formatRupiah } from '../utils/format.js';
import { getBudgetUsage, getMonthTransactions, getTotalBalance, sumByType } from '../utils/calculations.js';

const accountTypeLabel = {
  cash: 'Cash keluarga',
  bank: 'Bank keluarga',
  ewallet: 'E-Wallet',
  saving: 'Tabungan',
  other: 'Dompet lainnya',
};

const walletAccent = {
  cash: 'amber',
  bank: 'blue',
  ewallet: 'green',
  saving: 'rose',
  other: 'violet',
};

function maskMoney() {
  return 'Rp •••••••';
}

function AccountIcon({ type }) {
  const icons = {
    cash: Banknote,
    bank: Landmark,
    ewallet: Smartphone,
    saving: PiggyBank,
    other: Wallet,
  };
  const Icon = icons[type] || Wallet;
  return <Icon size={18} />;
}

function NotificationIcon({ type }) {
  if (type === 'member') return <UserPlus size={16} />;
  return <ReceiptText size={16} />;
}

export default function Dashboard({ goTo }) {
  const {
    household,
    familyMembers,
    transactions,
    categories,
    accountBalances,
    budgets,
    notifications,
    copyInviteCode,
    requestNotificationPermission,
    markNotificationRead,
    markAllNotificationsRead,
  } = useApp();
  const { month, year } = currentMonthYear();
  const [showBalance, setShowBalance] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);

  const monthTransactions = useMemo(() => getMonthTransactions(transactions, month, year), [transactions, month, year]);
  const income = sumByType(monthTransactions, 'income');
  const expense = sumByType(monthTransactions, 'expense');
  const totalBalance = getTotalBalance(accountBalances, transactions);
  const activeAccounts = accountBalances.filter((acc) => acc.isActive);
  const unreadCount = notifications.filter((notification) => !notification.readAt).length;

  const monthBudgets = useMemo(
    () => budgets.filter((budget) => budget.month === month && budget.year === year),
    [budgets, month, year]
  );

  const budgetUsages = useMemo(
    () => monthBudgets.map((budget) => ({ budget, usage: getBudgetUsage(budget, monthTransactions) })),
    [monthBudgets, monthTransactions]
  );

  const totalBudget = monthBudgets.reduce((total, budget) => total + Number(budget.amount || 0), 0);
  const totalUsed = budgetUsages.reduce((total, item) => total + Number(item.usage.used || 0), 0);
  const totalRemaining = totalBudget - totalUsed;

  const openNotification = async (notification) => {
    setNotificationOpen(false);
    if (!notification.readAt) await markNotificationRead(notification.id);
    goTo(notification.target || 'dashboard');
  };

  return (
    <div className="page playful-dashboard-page">
      <header className="header playful-topbar">
        <button className="playful-brand" type="button" onClick={() => goTo('family')}>
          <span className="brand-mark">K</span>
          <span className="brand-copy">
            <small>KeuanganKu</small>
            <strong>{household?.name || 'Dashboard'}</strong>
          </span>
          <ChevronRight size={15} />
        </button>

        <div className="notification-wrap">
          <button
            className="icon-btn notification-btn playful-icon-btn"
            aria-label="Notifikasi"
            type="button"
            onClick={() => setNotificationOpen((value) => !value)}
          >
            <Bell size={18} />
            {unreadCount > 0 && <span className="notif-dot">{Math.min(unreadCount, 9)}</span>}
          </button>

          {notificationOpen && (
            <div className="notification-popover playful-notification-popover">
              <div className="notification-head">
                <strong>Notifikasi</strong>
                <span>{unreadCount} belum dibaca</span>
              </div>

              <div className="notification-actions-row">
                <button type="button" className="small-btn" onClick={requestNotificationPermission}>Aktifkan push</button>
                {unreadCount > 0 && <button type="button" className="small-btn" onClick={markAllNotificationsRead}>Tandai dibaca</button>}
              </div>

              {notifications.length === 0 ? (
                <p className="muted tiny notification-empty">Belum ada notifikasi.</p>
              ) : (
                <div className="notification-list">
                  {notifications.map((notification) => (
                    <button
                      className={`notification-item ${notification.readAt ? 'read' : 'unread'}`}
                      key={notification.id}
                      type="button"
                      onClick={() => openNotification(notification)}
                    >
                      <span className={`notification-icon ${notification.type}`}>
                        <NotificationIcon type={notification.type} />
                      </span>
                      <span>
                        <strong>{notification.title}</strong>
                        <small>{notification.message || formatDate(notification.createdAt)}</small>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      <section className="playful-balance-card">
        <div className="playful-balance-top">
          <div>
            <p>Total saldo keluarga</p>
            <strong>Semua dompet aktif</strong>
          </div>
          <button
            className="balance-toggle-btn"
            type="button"
            aria-label={showBalance ? 'Sembunyikan saldo' : 'Tampilkan saldo'}
            onClick={() => setShowBalance((value) => !value)}
          >
            {showBalance ? <EyeOff size={17} /> : <Eye size={17} />}
            <span>{showBalance ? 'Sembunyikan' : 'Tampilkan'}</span>
          </button>
        </div>
        <p className={`playful-balance-amount ${!showBalance ? 'masked-balance' : ''}`}>
          {showBalance ? formatRupiah(totalBalance) : maskMoney()}
        </p>
        <div className="playful-balance-metrics">
          <div>
            <span>Pemasukan bulan ini</span>
            <strong>{formatRupiah(income)}</strong>
          </div>
          <div>
            <span>Pengeluaran bulan ini</span>
            <strong>{formatRupiah(expense)}</strong>
          </div>
        </div>
      </section>

      <section className="playful-wallet-section">
        <SectionHead
          title="Saldo Dompet"
          action={<span className="section-link">Geser untuk melihat</span>}
        />
        <div className="playful-wallet-carousel">
          {activeAccounts.length === 0 ? (
            <div className="playful-wallet-card empty-wallet">
              <strong>Belum ada dompet aktif</strong>
              <p>Tambahkan dompet dari halaman Profil agar saldo bisa dipantau.</p>
            </div>
          ) : activeAccounts.map((account) => (
            <article className={`playful-wallet-card ${walletAccent[account.type] || 'violet'}`} key={account.id}>
              <div className="playful-wallet-top">
                <span className="playful-wallet-icon"><AccountIcon type={account.type} /></span>
                <span className="wallet-type-pill">{accountTypeLabel[account.type] || 'Dompet'}</span>
              </div>
              <h3>{account.name}</h3>
              <strong>{formatRupiah(account.currentBalance)}</strong>
              <p>{account.isActive ? 'Dompet aktif keluarga' : 'Dompet nonaktif'}</p>
            </article>
          ))}
        </div>
        {activeAccounts.length > 1 && <div className="wallet-scroll-hint"><span className="active" /><span /><span /></div>}
      </section>

      <section>
        <SectionHead
          title="Alokasi Anggaran"
          action={<button className="section-link" type="button" onClick={() => goTo('budgets')}>Kelola</button>}
        />
        <Card className="playful-budget-card">
          <div className="playful-budget-summary">
            <div><span>Total alokasi</span><strong>{formatRupiah(totalBudget)}</strong></div>
            <div><span>Terpakai</span><strong>{formatRupiah(totalUsed)}</strong></div>
            <div><span>Sisa</span><strong>{formatRupiah(totalRemaining)}</strong></div>
          </div>

          {budgetUsages.length === 0 ? (
            <div className="playful-empty-inline">
              <Target size={18} />
              <span>Belum ada alokasi bulan ini.</span>
            </div>
          ) : budgetUsages.slice(0, 3).map(({ budget, usage }) => {
            const account = accountBalances.find((item) => item.id === budget.accountId);
            const variant = usage.status === 'Aman' ? 'green' : usage.status === 'Mendekati' ? 'amber' : 'red';
            return (
              <div className="budget-row playful-budget-row" key={budget.id}>
                <div className="budget-row-header">
                  <div>
                    <h3>{budget.name}</h3>
                    <p className="item-sub">{account?.name || 'Dompet'} • Sisa {formatRupiah(usage.remaining)}</p>
                  </div>
                  <StatusPill status={usage.status} />
                </div>
                <ProgressBar value={usage.percentage} variant={variant} />
              </div>
            );
          })}
        </Card>
      </section>

      <section className="grid-2 family-code-grid playful-info-grid">
        <button className="glass info-glass" type="button" onClick={copyInviteCode}>
          <p>Kode Keluarga</p>
          <strong>{household?.inviteCode || '-'}</strong>
          <Copy size={15} />
        </button>

        <button className="glass info-glass" type="button" onClick={() => goTo('family')}>
          <p>Anggota</p>
          <strong>{familyMembers.length} orang</strong>
          <UsersRound size={15} />
        </button>
      </section>

      <Card className="playful-section-card">
        <SectionHead
          title="Aktivitas Terakhir"
          action={<button className="section-link" type="button" onClick={() => goTo('transactions')}>Lihat semua</button>}
        />
        <TransactionList transactions={transactions.slice(0, 3)} categories={categories} budgets={budgets} accounts={accountBalances} compact />
      </Card>
    </div>
  );
}
