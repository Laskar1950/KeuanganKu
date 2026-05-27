import React, { useMemo, useState } from 'react';
import { Bell, ChevronRight, Copy, Eye, EyeOff, TrendingDown, TrendingUp, UserPlus, UsersRound, Wallet } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import { Card, SectionHead } from '../components/UI.jsx';
import TransactionList from '../components/TransactionList.jsx';
import { currentMonthYear, formatDate, formatRupiah } from '../utils/format.js';
import { getMonthTransactions, getTotalBalance, sumByType } from '../utils/calculations.js';

const accountTypeLabel = {
  cash: 'Akun Tunai Keluarga',
  bank: 'Akun Bank Keluarga',
  ewallet: 'Akun E-Wallet',
  saving: 'Akun Tabungan',
  other: 'Akun Lainnya',
};

function maskMoney() {
  return 'Rp •••••••';
}

function buildNotifications({ transactions, familyMembers }) {
  const transactionNotifications = transactions.slice(0, 4).map((trx) => ({
    id: `trx-${trx.id}`,
    type: 'transaction',
    title: trx.type === 'income' ? 'Pemasukan baru dicatat' : 'Pengeluaran baru dicatat',
    description: `${trx.createdByProfile?.name || 'Anggota keluarga'} mencatat ${trx.note || 'transaksi'} pada ${formatDate(trx.transactionDate)}.`,
    target: 'transactions',
    createdAt: trx.createdAt || trx.transactionDate,
  }));

  const memberNotifications = familyMembers.slice(-3).reverse().map((member) => ({
    id: `member-${member.id}`,
    type: 'member',
    title: 'Anggota keluarga bergabung',
    description: `${member.profile?.name || 'Anggota keluarga'} sekarang tergabung sebagai ${member.role}.`,
    target: 'family',
    createdAt: member.createdAt,
  }));

  return [...transactionNotifications, ...memberNotifications]
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .slice(0, 6);
}

export default function Dashboard({ goTo }) {
  const { household, familyMembers, transactions, categories, accountBalances, copyInviteCode } = useApp();
  const { month, year } = currentMonthYear();
  const [showBalance, setShowBalance] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);

  const monthTransactions = useMemo(() => getMonthTransactions(transactions, month, year), [transactions, month, year]);
  const income = sumByType(monthTransactions, 'income');
  const expense = sumByType(monthTransactions, 'expense');
  const totalBalance = getTotalBalance(accountBalances, transactions);
  const activeAccounts = accountBalances.filter((acc) => acc.isActive);
  const notifications = useMemo(() => buildNotifications({ transactions, familyMembers }), [transactions, familyMembers]);
  const unreadCount = notifications.length;

  const money = (value) => (showBalance ? formatRupiah(value) : maskMoney());

  const openNotification = (notification) => {
    setNotificationOpen(false);
    goTo(notification.target);
  };

  return (
    <div className="page dashboard-preview-page">
      <header className="header preview-header">
        <button className="family-title-btn" type="button" onClick={() => goTo('family')}>
          <span>{household?.name || 'Keuangan Keluarga'}</span>
          <ChevronRight size={15} />
        </button>

        <div className="notification-wrap">
          <button
            className="icon-btn notification-btn"
            aria-label="Notifikasi"
            type="button"
            onClick={() => setNotificationOpen((value) => !value)}
          >
            <Bell size={18} />
            {unreadCount > 0 && <span className="notif-dot">{Math.min(unreadCount, 9)}</span>}
          </button>

          {notificationOpen && (
            <div className="notification-popover">
              <div className="notification-head">
                <strong>Notifikasi</strong>
                <span>{unreadCount} baru</span>
              </div>

              {notifications.length === 0 ? (
                <p className="muted tiny notification-empty">Belum ada notifikasi.</p>
              ) : (
                <div className="notification-list">
                  {notifications.map((notification) => (
                    <button
                      className="notification-item"
                      key={notification.id}
                      type="button"
                      onClick={() => openNotification(notification)}
                    >
                      <span className={`notification-icon ${notification.type}`}>
                        {notification.type === 'member' ? <UserPlus size={16} /> : <Wallet size={16} />}
                      </span>
                      <span>
                        <strong>{notification.title}</strong>
                        <small>{notification.description}</small>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      <section className="hero-card preview-balance-card">
        <div className="row-between">
          <div>
            <p className="label">Total Saldo Keluarga</p>
            <p className={`balance ${!showBalance ? 'masked-balance' : ''}`}>{money(totalBalance)}</p>
            <p className="hero-caption">Diperbarui hari ini</p>
          </div>
          <button
            className="soft-round-btn"
            type="button"
            aria-label={showBalance ? 'Sembunyikan saldo' : 'Tampilkan saldo'}
            onClick={() => setShowBalance((value) => !value)}
          >
            {showBalance ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </section>

      <section className="hero-grid">
        <div className="glass metric-glass income-glass">
          <div className="metric-icon income"><TrendingUp size={17} /></div>
          <p>Pemasukan</p>
          <strong className={!showBalance ? 'masked-amount' : ''}>{money(income)}</strong>
          <span>+12% dari bulan lalu</span>
        </div>

        <div className="glass metric-glass expense-glass">
          <div className="metric-icon expense"><TrendingDown size={17} /></div>
          <p>Pengeluaran</p>
          <strong className={!showBalance ? 'masked-amount' : ''}>{money(expense)}</strong>
          <span>-8% dari bulan lalu</span>
        </div>
      </section>

      <section className="grid-2 family-code-grid">
        <button className="glass info-glass" type="button" onClick={copyInviteCode}>
          <p>Kode Undangan</p>
          <strong>{household?.inviteCode || '-'}</strong>
          <Copy size={15} />
        </button>

        <button className="glass info-glass" type="button" onClick={() => goTo('family')}>
          <p>Anggota</p>
          <strong>{familyMembers.length} orang</strong>
          <UsersRound size={15} />
        </button>
      </section>

      <Card className="preview-section-card">
        <SectionHead
          title="Saldo per Akun / Dompet"
          action={<button className="link-chip" type="button" onClick={() => goTo('family')}>Lihat semua</button>}
        />

        <div className="wallet-summary-list preview-wallet-list">
          {activeAccounts.slice(0, 4).map((account) => (
            <div className="wallet-summary-item preview-wallet-row" key={account.id}>
              <div className={`wallet-summary-icon wallet-${account.type}`}>
                <Wallet size={17} />
              </div>

              <div>
                <p>{account.name}</p>
                <span>{accountTypeLabel[account.type] || 'Akun Keluarga'}</span>
              </div>

              <strong className={!showBalance ? 'masked-amount' : ''}>{money(account.currentBalance)}</strong>
            </div>
          ))}
        </div>
      </Card>

      <Card className="preview-section-card">
        <SectionHead
          title="Transaksi Terbaru"
          action={<button className="link-chip" type="button" onClick={() => goTo('transactions')}>Lihat semua</button>}
        />
        <TransactionList transactions={transactions.slice(0, 3)} categories={categories} accounts={accountBalances} compact hideAmounts={!showBalance} />
      </Card>
    </div>
  );
}
