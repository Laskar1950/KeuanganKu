import React, { useMemo } from 'react';
import { Bell, ChevronRight, Copy, Eye, TrendingDown, TrendingUp, UsersRound, Wallet } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import { Card, SectionHead } from '../components/UI.jsx';
import TransactionList from '../components/TransactionList.jsx';
import { currentMonthYear, formatRupiah } from '../utils/format.js';
import { getMonthTransactions, getTotalBalance, sumByType } from '../utils/calculations.js';

const accountTypeLabel = {
  cash: 'Akun Tunai Keluarga',
  bank: 'Akun Bank Keluarga',
  ewallet: 'Akun E-Wallet',
  saving: 'Akun Tabungan',
  other: 'Akun Lainnya',
};

export default function Dashboard({ goTo }) {
  const { user, household, familyMembers, transactions, categories, accountBalances, copyInviteCode } = useApp();
  const { month, year } = currentMonthYear();
  const monthTransactions = useMemo(() => getMonthTransactions(transactions, month, year), [transactions, month, year]);
  const income = sumByType(monthTransactions, 'income');
  const expense = sumByType(monthTransactions, 'expense');
  const totalBalance = getTotalBalance(accountBalances, transactions);
  const activeAccounts = accountBalances.filter((acc) => acc.isActive);

  return (
    <div className="page dashboard-preview-page">
      <header className="header preview-header">
        <button className="family-title-btn" type="button" onClick={() => goTo('family')}>
          <span>{household?.name || 'Keuangan Keluarga'}</span>
          <ChevronRight size={15} />
        </button>

        <button className="icon-btn notification-btn" aria-label="Notifikasi" type="button">
          <Bell size={18} />
          <span className="notif-dot">3</span>
        </button>
      </header>

      <section className="hero-card preview-balance-card">
        <div className="row-between">
          <div>
            <p className="label">Total Saldo Keluarga</p>
            <p className="balance">{formatRupiah(totalBalance)}</p>
            <p className="hero-caption">Diperbarui hari ini</p>
          </div>
          <button className="soft-round-btn" type="button" aria-label="Lihat saldo">
            <Eye size={18} />
          </button>
        </div>
      </section>

      <section className="hero-grid">
        <div className="glass metric-glass income-glass">
          <div className="metric-icon income"><TrendingUp size={17} /></div>
          <p>Pemasukan</p>
          <strong>{formatRupiah(income)}</strong>
          <span>+12% dari bulan lalu</span>
        </div>

        <div className="glass metric-glass expense-glass">
          <div className="metric-icon expense"><TrendingDown size={17} /></div>
          <p>Pengeluaran</p>
          <strong>{formatRupiah(expense)}</strong>
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

              <strong>{formatRupiah(account.currentBalance)}</strong>
            </div>
          ))}
        </div>
      </Card>

      <Card className="preview-section-card">
        <SectionHead
          title="Transaksi Terbaru"
          action={<button className="link-chip" type="button" onClick={() => goTo('transactions')}>Lihat semua</button>}
        />
        <TransactionList transactions={transactions.slice(0, 3)} categories={categories} accounts={accountBalances} compact />
      </Card>
    </div>
  );
}
