import React, { useMemo } from 'react';
import { Bell, CreditCard, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import { Card, ProgressBar, SectionHead, StatusPill } from '../components/UI.jsx';
import TransactionList from '../components/TransactionList.jsx';
import { formatRupiah, monthLabel } from '../utils/format.js';
import { currentMonthYear } from '../utils/format.js';
import { getBudgetUsage, getExpenseByCategory, getMonthTransactions, getTotalBalance, sumByType } from '../utils/calculations.js';

export default function Dashboard({ onAddTransaction, goTo }) {
  const { user, household, transactions, categories, accountBalances, budgets, savingGoals } = useApp();
  const { month, year } = currentMonthYear();
  const monthTransactions = useMemo(() => getMonthTransactions(transactions, month, year), [transactions, month, year]);
  const income = sumByType(monthTransactions, 'income');
  const expense = sumByType(monthTransactions, 'expense');
  const net = income - expense;
  const totalBalance = getTotalBalance(accountBalances, transactions);
  const topExpenses = getExpenseByCategory(monthTransactions, categories);
  const activeGoal = savingGoals.find((goal) => goal.status === 'active');
  const monthBudgets = budgets.filter((budget) => budget.month === month && budget.year === year);

  return (
    <div className="page">
      <header className="header">
        <div>
          <p className="eyebrow">Selamat datang, {user?.name || 'Pengguna'}</p>
          <h1>{household?.name || 'Keuangan Keluarga'}</h1>
        </div>
        <button className="icon-btn" aria-label="Notifikasi"><Bell size={19} /></button>
      </header>

      <section className="hero-card">
        <div className="row-between">
          <div>
            <p className="label">Total saldo keluarga</p>
            <p className="balance">{formatRupiah(totalBalance)}</p>
          </div>
          <Wallet size={34} />
        </div>
        <div className="hero-grid">
          <div className="glass"><p>Pemasukan</p><p>{formatRupiah(income)}</p></div>
          <div className="glass"><p>Pengeluaran</p><p>{formatRupiah(expense)}</p></div>
        </div>
      </section>

      <section className="grid-2">
        <div className="metric-card"><p className="metric-title">Saldo Bersih</p><p className="metric-value">{formatRupiah(net)}</p><p className="metric-note"><TrendingUp size={14} /> Bulan berjalan</p></div>
        <div className="metric-card"><p className="metric-title">Dompet Aktif</p><p className="metric-value">{accountBalances.filter((acc) => acc.isActive).length}</p><p className="metric-note"><CreditCard size={14} /> Akun/dompet</p></div>
      </section>

      <Card>
        <SectionHead kicker="Anggaran" title={monthLabel(month, year)} action={<button className="small-btn" onClick={() => goTo('budgets')}>Lihat</button>} />
        {monthBudgets.length === 0 ? (
          <p className="muted tiny">Belum ada anggaran bulan ini.</p>
        ) : monthBudgets.slice(0, 4).map((budget) => {
          const usage = getBudgetUsage(budget, monthTransactions);
          const category = categories.find((cat) => cat.id === budget.categoryId);
          return (
            <div className="budget-row" key={budget.id}>
              <div className="row-between">
                <div><h3>{category?.name}</h3><p className="item-sub">{formatRupiah(usage.used)} dari {formatRupiah(budget.amount)}</p></div>
                <StatusPill status={usage.status} />
              </div>
              <ProgressBar value={usage.percentage} variant={usage.status === 'Aman' ? 'green' : usage.status === 'Mendekati' ? 'amber' : 'red'} />
            </div>
          );
        })}
      </Card>

      <section className="grid-2">
        <Card className="flat">
          <p className="section-kicker">Target</p>
          <h2>{activeGoal?.name || 'Belum ada target'}</h2>
          {activeGoal ? <><p className="muted tiny">{formatRupiah(activeGoal.currentAmount)} dari {formatRupiah(activeGoal.targetAmount)}</p><ProgressBar value={(activeGoal.currentAmount / activeGoal.targetAmount) * 100} /></> : <p className="muted tiny">Buat target tabungan pertama.</p>}
        </Card>
        <Card className="flat">
          <p className="section-kicker">Terbesar</p>
          <h2>{topExpenses[0]?.name || 'Belum ada data'}</h2>
          <p className="muted tiny">{topExpenses[0] ? formatRupiah(topExpenses[0].amount) : 'Input transaksi dahulu'}</p>
        </Card>
      </section>

      <Card>
        <SectionHead kicker="Transaksi" title="Terbaru" action={<button className="small-btn" onClick={() => goTo('transactions')}>Semua</button>} />
        <TransactionList transactions={transactions.slice(0, 5)} categories={categories} accounts={accountBalances} />
      </Card>
    </div>
  );
}
