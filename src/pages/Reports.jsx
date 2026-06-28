import React, { useMemo, useState } from 'react';
import { AlertTriangle, CalendarDays, PiggyBank, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import { Card, ProgressBar } from '../components/UI.jsx';
import { formatRupiah } from '../utils/format.js';
import { getBudgetUsage, getMonthTransactions } from '../utils/calculations.js';

const currentMonth = () => new Date().getMonth() + 1;
const currentYear = () => new Date().getFullYear();

function sumByType(transactions, type) {
  return transactions
    .filter((transaction) => transaction.type === type)
    .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
}

export default function Reports() {
  const { transactions, budgets, accountBalances } = useApp();
  const [cycle, setCycle] = useState({ month: currentMonth(), year: currentYear() });

  const monthTransactions = useMemo(
    () => getMonthTransactions(transactions, cycle.month, cycle.year),
    [transactions, cycle.month, cycle.year]
  );

  const monthBudgets = useMemo(
    () => budgets
      .filter((budget) => Number(budget.month) === Number(cycle.month) && Number(budget.year) === Number(cycle.year))
      .sort((a, b) => a.name.localeCompare(b.name, 'id')),
    [budgets, cycle.month, cycle.year]
  );

  const budgetRows = useMemo(() => monthBudgets.map((budget) => {
    const usage = getBudgetUsage(budget, monthTransactions);
    const account = accountBalances.find((wallet) => wallet.id === budget.accountId);
    const overBudget = Number(usage.remaining || 0) < 0;
    const progressRaw = budget.amount > 0 ? Math.round((usage.used / budget.amount) * 100) : 0;
    return {
      budget,
      account,
      usage,
      overBudget,
      overBudgetAmount: overBudget ? Math.abs(usage.remaining) : 0,
      progress: Math.min(100, progressRaw),
      progressRaw,
    };
  }), [accountBalances, monthBudgets, monthTransactions]);

  const income = sumByType(monthTransactions, 'income');
  const expense = sumByType(monthTransactions, 'expense');
  const totalBudget = monthBudgets.reduce((sum, budget) => sum + Number(budget.amount || 0), 0);
  const usedBudget = budgetRows.reduce((sum, row) => sum + Number(row.usage.used || 0), 0);
  const overBudgetRows = budgetRows.filter((row) => row.overBudget);
  const overBudgetTotal = overBudgetRows.reduce((sum, row) => sum + row.overBudgetAmount, 0);
  const biggestOverBudget = [...overBudgetRows].sort((a, b) => b.overBudgetAmount - a.overBudgetAmount)[0];
  const budgetUsageProgress = totalBudget > 0 ? Math.min(100, Math.round((usedBudget / totalBudget) * 100)) : 0;

  return (
    <div className="page reports-page budget-card-page">
      <header className="header playful-page-header">
        <div>
          <p className="eyebrow">Laporan</p>
          <h1>Insight keuangan keluarga</h1>
          <small>Pantau pemasukan, pengeluaran, dan alokasi yang over budget.</small>
        </div>
      </header>

      <Card className="budget-cycle-card">
        <div className="budget-cycle-row">
          <div>
            <p className="section-kicker">Periode laporan</p>
            <h2>{String(cycle.month).padStart(2, '0')}/{cycle.year}</h2>
          </div>
          <div className="budget-cycle-fields">
            <label>
              <span>Bulan</span>
              <select value={cycle.month} onChange={(event) => setCycle((prev) => ({ ...prev, month: Number(event.target.value) }))}>
                {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => <option key={month} value={month}>{String(month).padStart(2, '0')}</option>)}
              </select>
            </label>
            <label>
              <span>Tahun</span>
              <input type="number" value={cycle.year} onChange={(event) => setCycle((prev) => ({ ...prev, year: Number(event.target.value) }))} />
            </label>
          </div>
        </div>
      </Card>

      <div className="budget-total-row">
        <Card><small>Pemasukan</small><strong>{formatRupiah(income)}</strong></Card>
        <Card><small>Pengeluaran</small><strong>{formatRupiah(expense)}</strong></Card>
        <Card><small>Total alokasi</small><strong>{formatRupiah(totalBudget)}</strong></Card>
        <Card className={overBudgetTotal > 0 ? 'report-over-budget-card' : ''}><small>Over budget</small><strong className={overBudgetTotal > 0 ? 'danger-text' : ''}>{formatRupiah(overBudgetTotal)}</strong></Card>
      </div>

      <Card className="dashboard-budget-summary-card">
        <div className="row-between">
          <div>
            <p className="muted tiny">Dipakai {formatRupiah(usedBudget)} dari {formatRupiah(totalBudget)}</p>
            <h3>{overBudgetTotal > 0 ? `Total over budget ${formatRupiah(overBudgetTotal)}` : `${budgetUsageProgress}% alokasi digunakan`}</h3>
          </div>
          <PiggyBank size={22} />
        </div>
        <ProgressBar value={budgetUsageProgress} variant="orange" />
      </Card>

      <Card>
        <div className="finance-detail-section-title">
          <AlertTriangle size={16} />
          <strong>Insight otomatis</strong>
        </div>
        <div className="report-insight-list">
          {overBudgetTotal > 0 ? (
            <>
              <div className="report-insight-item danger">
                <TrendingDown size={18} />
                <div>
                  <strong>{overBudgetRows.length} alokasi melewati budget</strong>
                  <small>Total kelebihan pengeluaran adalah {formatRupiah(overBudgetTotal)}. Ini tetap diperbolehkan selama saldo dompet sumber mencukupi.</small>
                </div>
              </div>
              {biggestOverBudget && (
                <div className="report-insight-item danger">
                  <PiggyBank size={18} />
                  <div>
                    <strong>Alokasi paling over budget: {biggestOverBudget.budget.name}</strong>
                    <small>Kelebihan {formatRupiah(biggestOverBudget.overBudgetAmount)} dari dompet {biggestOverBudget.account?.name || 'tidak ditemukan'}.</small>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="report-insight-item">
              <TrendingUp size={18} />
              <div>
                <strong>Belum ada alokasi over budget</strong>
                <small>Pengeluaran masih berada dalam batas alokasi untuk periode ini.</small>
              </div>
            </div>
          )}
          <div className="report-insight-item">
            <Wallet size={18} />
            <div>
              <strong>Batas utama pengeluaran adalah saldo dompet</strong>
              <small>Alokasi boleh minus sebagai tanda over budget, tetapi transaksi tetap harus memiliki saldo dompet yang cukup.</small>
            </div>
          </div>
        </div>
      </Card>

      <section className="budget-list-section">
        <div className="section-heading-row">
          <div>
            <p className="section-kicker">Detail alokasi</p>
            <h2>{budgetRows.length} alokasi</h2>
          </div>
          <small>Over budget ditandai merah.</small>
        </div>
        <div className="budget-card-list">
          {budgetRows.length ? budgetRows.map((row) => (
            <Card key={row.budget.id} className={`budget-management-card report-budget-row ${row.overBudget ? 'over-budget' : ''}`}>
              <span className="budget-card-topline">
                <span className="budget-card-icon"><PiggyBank size={18} /></span>
                <span>
                  <strong>{row.budget.name}</strong>
                  <small><Wallet size={12} /> {row.account?.name || 'Dompet tidak ditemukan'}</small>
                </span>
              </span>
              <span className="budget-card-amount-grid">
                <span><small>Total</small><strong>{formatRupiah(row.budget.amount)}</strong></span>
                <span><small>Terpakai</small><strong>{formatRupiah(row.usage.used)}</strong></span>
                <span><small>{row.overBudget ? 'Over budget' : 'Sisa'}</small><strong className={row.overBudget ? 'danger-text' : ''}>{row.overBudget ? formatRupiah(row.overBudgetAmount) : formatRupiah(row.usage.remaining)}</strong></span>
              </span>
              <span className="budget-card-footer"><small><CalendarDays size={12} /> {String(row.budget.month).padStart(2, '0')}/{row.budget.year}</small></span>
              <ProgressBar value={row.progress} variant="orange" />
            </Card>
          )) : <Card className="empty-soft-card">Belum ada alokasi untuk periode ini.</Card>}
        </div>
      </section>
    </div>
  );
}
