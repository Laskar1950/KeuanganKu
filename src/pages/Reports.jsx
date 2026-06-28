import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { formatBudgetCycleRange, getBudgetCycleRange, getCurrentBudgetCycle, isDateInBudgetCycle } from '../utils/budgetCycle.js';
import '../report-analytics.css';

const MONTHS = [
  { value: 1, label: 'Januari' },
  { value: 2, label: 'Februari' },
  { value: 3, label: 'Maret' },
  { value: 4, label: 'April' },
  { value: 5, label: 'Mei' },
  { value: 6, label: 'Juni' },
  { value: 7, label: 'Juli' },
  { value: 8, label: 'Agustus' },
  { value: 9, label: 'September' },
  { value: 10, label: 'Oktober' },
  { value: 11, label: 'November' },
  { value: 12, label: 'Desember' },
];

function formatCurrency(value) {
  return `Rp ${Number(value || 0).toLocaleString('id-ID')}`;
}

function getTransactionDate(transaction) {
  return transaction?.transactionDate || transaction?.transaction_date || transaction?.date || transaction?.createdAt || transaction?.created_at;
}

function getTransactionTime(transaction) {
  const rawDate = transaction?.createdAt || transaction?.created_at || getTransactionDate(transaction);
  const date = new Date(rawDate);

  if (Number.isNaN(date.getTime())) return '-';

  return date.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function amountByType(transactions, type) {
  return transactions
    .filter((transaction) => transaction.type === type)
    .reduce((total, transaction) => total + Number(transaction.amount || 0), 0);
}

function SummaryCard({ label, value, note, type = 'default' }) {
  return (
    <article className={`reports-basic-summary-card reports-basic-${type}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {note ? <small>{note}</small> : null}
    </article>
  );
}

export default function Reports() {
  const { transactions = [], accounts = [], budgets = [] } = useApp();
  const currentCycle = getCurrentBudgetCycle();

  const [month, setMonth] = useState(currentCycle.month);
  const [year, setYear] = useState(currentCycle.year);
  const [accountId, setAccountId] = useState('all');
  const [budgetId, setBudgetId] = useState('all');

  const selectedCycle = useMemo(() => getBudgetCycleRange(Number(month), Number(year)), [month, year]);
  const accountById = useMemo(() => new Map(accounts.map((account) => [account.id, account])), [accounts]);
  const budgetById = useMemo(() => new Map(budgets.map((budget) => [budget.id, budget])), [budgets]);

  const yearOptions = useMemo(() => {
    const years = new Set([currentCycle.year, Number(year)]);

    budgets.forEach((budget) => {
      if (budget.year) years.add(Number(budget.year));
    });

    transactions.forEach((transaction) => {
      const date = new Date(getTransactionDate(transaction));
      if (!Number.isNaN(date.getTime())) years.add(date.getFullYear());
    });

    return Array.from(years).filter(Boolean).sort((a, b) => b - a);
  }, [budgets, currentCycle.year, transactions, year]);

  const periodBudgets = useMemo(() => {
    return budgets.filter((budget) => {
      const isSamePeriod = Number(budget.month) === Number(month) && Number(budget.year) === Number(year);
      const isSameAccount = accountId === 'all' || budget.accountId === accountId || budget.account_id === accountId;
      const isSameBudget = budgetId === 'all' || budget.id === budgetId;
      return isSamePeriod && isSameAccount && isSameBudget;
    });
  }, [accountId, budgetId, budgets, month, year]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((transaction) => {
      const inCycle = isDateInBudgetCycle(getTransactionDate(transaction), selectedCycle);
      const sameAccount = accountId === 'all' || transaction.accountId === accountId || transaction.account_id === accountId;
      const sameBudget = budgetId === 'all' || transaction.budgetId === budgetId || transaction.budget_id === budgetId;
      return inCycle && sameAccount && sameBudget;
    });
  }, [accountId, budgetId, selectedCycle, transactions]);

  const incomeTotal = useMemo(() => amountByType(filteredTransactions, 'income'), [filteredTransactions]);
  const expenseTotal = useMemo(() => amountByType(filteredTransactions, 'expense'), [filteredTransactions]);
  const allocationTotal = useMemo(() => {
    return periodBudgets.reduce((total, budget) => total + Number(budget.amount || 0), 0);
  }, [periodBudgets]);

  const allocationRows = useMemo(() => {
    return periodBudgets
      .map((budget) => {
        const used = filteredTransactions
          .filter((transaction) => transaction.type === 'expense' && (transaction.budgetId || transaction.budget_id) === budget.id)
          .reduce((total, transaction) => total + Number(transaction.amount || 0), 0);
        const amount = Number(budget.amount || 0);
        const remaining = amount - used;
        const percentage = amount > 0 ? Math.min(100, (used / amount) * 100) : 0;

        return {
          ...budget,
          used,
          remaining,
          percentage,
        };
      })
      .sort((a, b) => b.used - a.used);
  }, [filteredTransactions, periodBudgets]);

  const overBudgetTotal = useMemo(() => {
    return allocationRows.reduce((total, budget) => total + Math.max(0, Math.abs(Number(budget.remaining || 0)) * (Number(budget.remaining || 0) < 0 ? 1 : 0)), 0);
  }, [allocationRows]);

  const latestTransactions = useMemo(() => {
    return [...filteredTransactions]
      .sort((a, b) => new Date(getTransactionDate(b)).getTime() - new Date(getTransactionDate(a)).getTime())
      .slice(0, 8);
  }, [filteredTransactions]);

  const resetFilter = () => {
    const nextCycle = getCurrentBudgetCycle();
    setMonth(nextCycle.month);
    setYear(nextCycle.year);
    setAccountId('all');
    setBudgetId('all');
  };

  const netTotal = incomeTotal - expenseTotal;

  return (
    <main className="page reports-basic-page">
      <section className="reports-basic-header">
        <div>
          <p>Laporan Keuangan</p>
          <h1>Ringkasan laporan</h1>
          <span>Periode gajian: {formatBudgetCycleRange(selectedCycle)}</span>
        </div>

        <div className={`reports-basic-net ${netTotal < 0 ? 'is-minus' : 'is-plus'}`}>
          <small>Net periode</small>
          <strong>{netTotal < 0 ? '-' : ''}{formatCurrency(Math.abs(netTotal))}</strong>
          <span>{filteredTransactions.length} transaksi</span>
        </div>
      </section>

      <section className="reports-basic-card">
        <div className="reports-basic-card-title">
          <div>
            <h2>Filter laporan</h2>
            <p>Pilih periode, dompet, atau alokasi tertentu.</p>
          </div>
          <button type="button" onClick={resetFilter}>Reset</button>
        </div>

        <div className="reports-basic-filter-grid">
          <label>
            Bulan
            <select value={month} onChange={(event) => setMonth(Number(event.target.value))}>
              {MONTHS.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </label>

          <label>
            Tahun
            <select value={year} onChange={(event) => setYear(Number(event.target.value))}>
              {yearOptions.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>

          <label>
            Dompet
            <select value={accountId} onChange={(event) => setAccountId(event.target.value)}>
              <option value="all">Semua dompet</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>{account.name}</option>
              ))}
            </select>
          </label>

          <label>
            Alokasi
            <select value={budgetId} onChange={(event) => setBudgetId(event.target.value)}>
              <option value="all">Semua alokasi</option>
              {budgets
                .filter((budget) => Number(budget.month) === Number(month) && Number(budget.year) === Number(year))
                .map((budget) => (
                  <option key={budget.id} value={budget.id}>{budget.name}</option>
                ))}
            </select>
          </label>
        </div>
      </section>

      <section className="reports-basic-summary-grid">
        <SummaryCard label="Pemasukan" value={formatCurrency(incomeTotal)} note="Total transaksi masuk" type="income" />
        <SummaryCard label="Pengeluaran" value={formatCurrency(expenseTotal)} note="Total transaksi keluar" type="expense" />
        <SummaryCard label="Total alokasi" value={formatCurrency(allocationTotal)} note={`${periodBudgets.length} alokasi`} />
        <SummaryCard label="Over budget" value={formatCurrency(overBudgetTotal)} note={overBudgetTotal > 0 ? 'Melewati batas' : 'Masih aman'} type={overBudgetTotal > 0 ? 'expense' : 'income'} />
      </section>

      <section className="reports-basic-card">
        <div className="reports-basic-card-title">
          <div>
            <h2>Penggunaan alokasi</h2>
            <p>Ringkasan pemakaian alokasi pada periode ini.</p>
          </div>
        </div>

        <div className="reports-basic-allocation-list">
          {allocationRows.length ? allocationRows.map((budget) => {
            const isOver = Number(budget.remaining || 0) < 0;
            return (
              <article className="reports-basic-allocation-row" key={budget.id}>
                <div className="reports-basic-allocation-head">
                  <div>
                    <strong>{budget.name}</strong>
                    <span>{accountById.get(budget.accountId || budget.account_id)?.name || 'Tanpa dompet'}</span>
                  </div>
                  <b>{formatCurrency(budget.used)}</b>
                </div>

                <div className="reports-basic-track">
                  <div className={isOver ? 'is-over' : ''} style={{ width: `${budget.percentage}%` }} />
                </div>

                <div className="reports-basic-allocation-foot">
                  <span>Alokasi {formatCurrency(budget.amount)}</span>
                  <span className={isOver ? 'is-over-text' : ''}>
                    {isOver ? `Over ${formatCurrency(Math.abs(budget.remaining))}` : `Sisa ${formatCurrency(budget.remaining)}`}
                  </span>
                </div>
              </article>
            );
          }) : (
            <div className="reports-basic-empty">Belum ada alokasi pada periode ini.</div>
          )}
        </div>
      </section>

      <section className="reports-basic-card">
        <div className="reports-basic-card-title">
          <div>
            <h2>Transaksi periode ini</h2>
            <p>Daftar transaksi terbaru sesuai filter laporan.</p>
          </div>
        </div>

        <div className="reports-basic-transaction-list">
          {latestTransactions.length ? latestTransactions.map((transaction) => {
            const isExpense = transaction.type === 'expense';
            const budget = budgetById.get(transaction.budgetId || transaction.budget_id);
            const account = accountById.get(transaction.accountId || transaction.account_id);

            return (
              <article className="reports-basic-transaction-row" key={transaction.id}>
                <div>
                  <strong>{budget?.name || transaction.note || (isExpense ? 'Pengeluaran' : 'Pemasukan')}</strong>
                  <span>{getTransactionTime(transaction)} · {account?.name || 'Dompet'}</span>
                </div>
                <b className={isExpense ? 'is-expense' : 'is-income'}>
                  {isExpense ? '-' : '+'}{formatCurrency(transaction.amount)}
                </b>
              </article>
            );
          }) : (
            <div className="reports-basic-empty">Belum ada transaksi pada periode ini.</div>
          )}
        </div>
      </section>
    </main>
  );
}
