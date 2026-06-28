import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import {
  formatBudgetCycleRange,
  getBudgetCycleRange,
  getCurrentBudgetCycle,
  isDateInBudgetCycle,
} from '../utils/budgetCycle.js';
import '../report-analytics.css';

const MONTH_OPTIONS = [
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

const TABS = [
  { id: 'cashflow', label: 'Arus Kas' },
  { id: 'allocation', label: 'Alokasi' },
  { id: 'wallet', label: 'Dompet' },
];

function formatCurrency(value) {
  const amount = Math.abs(Number(value || 0));
  const prefix = Number(value || 0) < 0 ? '-Rp ' : 'Rp ';
  return `${prefix}${amount.toLocaleString('id-ID')}`;
}

function formatShortCurrency(value) {
  const amount = Math.abs(Number(value || 0));
  const prefix = Number(value || 0) < 0 ? '-Rp ' : 'Rp ';

  if (amount >= 1_000_000_000) return `${prefix}${(amount / 1_000_000_000).toFixed(1).replace('.0', '')}M`;
  if (amount >= 1_000_000) return `${prefix}${(amount / 1_000_000).toFixed(1).replace('.0', '')}jt`;
  if (amount >= 1_000) return `${prefix}${Math.round(amount / 1000)}rb`;

  return `${prefix}${amount.toLocaleString('id-ID')}`;
}

function getTransactionDate(transaction) {
  return transaction?.transactionDate || transaction?.transaction_date || transaction?.date || transaction?.createdAt || transaction?.created_at;
}

function getTransactionCreatedAt(transaction) {
  return transaction?.createdAt || transaction?.created_at || getTransactionDate(transaction);
}

function getDayLabel(dateValue) {
  const date = new Date(getTransactionDate({ transactionDate: dateValue }));
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
}

function getDateTimeLabel(transaction) {
  const date = new Date(getTransactionCreatedAt(transaction));
  if (Number.isNaN(date.getTime())) {
    const fallback = new Date(getTransactionDate(transaction));
    if (Number.isNaN(fallback.getTime())) return '-';
    return fallback.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  return date.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function buildLinePoints(rows, key, width = 320, height = 118) {
  const maxValue = Math.max(...rows.map((row) => Number(row[key] || 0)), 1);
  const gap = rows.length > 1 ? width / (rows.length - 1) : width;
  const points = rows.map((row, index) => {
    const x = index * gap;
    const y = height - (Number(row[key] || 0) / maxValue) * height;
    return `${x.toFixed(1)},${Math.max(4, Math.min(height - 4, y)).toFixed(1)}`;
  });

  return points.join(' ');
}

function sumBy(items, predicate) {
  return items.reduce((total, item) => total + (predicate(item) ? Number(item.amount || 0) : 0), 0);
}

function groupTotals(items, keyGetter) {
  return items.reduce((map, item) => {
    const key = keyGetter(item) || 'Tanpa kategori';
    map.set(key, (map.get(key) || 0) + Number(item.amount || 0));
    return map;
  }, new Map());
}

function StatCard({ label, value, note, tone = 'neutral' }) {
  return (
    <article className={`report-stat-card report-tone-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {note ? <small>{note}</small> : null}
    </article>
  );
}

function HorizontalBarList({ items, emptyText = 'Belum ada data untuk periode ini.' }) {
  if (!items.length) {
    return <div className="report-empty-state">{emptyText}</div>;
  }

  const maxValue = Math.max(...items.map((item) => Number(item.value || 0)), 1);

  return (
    <div className="report-bar-list">
      {items.map((item) => {
        const width = Math.max(5, Math.min(100, (Number(item.value || 0) / maxValue) * 100));
        return (
          <div className="report-bar-row" key={item.id || item.name}>
            <div className="report-bar-row-head">
              <span>{item.name}</span>
              <strong>{formatCurrency(item.value)}</strong>
            </div>
            {item.meta ? <p>{item.meta}</p> : null}
            <div className="report-mini-track" aria-hidden="true">
              <div className={`report-mini-fill ${item.tone || ''}`} style={{ width: `${width}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function Reports() {
  const { transactions = [], accounts = [], budgets = [], categories = [] } = useApp();
  const activeCycle = getCurrentBudgetCycle();

  const [month, setMonth] = useState(activeCycle.month);
  const [year, setYear] = useState(activeCycle.year);
  const [accountId, setAccountId] = useState('all');
  const [budgetId, setBudgetId] = useState('all');
  const [activeTab, setActiveTab] = useState('cashflow');

  const selectedCycle = useMemo(() => getBudgetCycleRange(Number(month), Number(year)), [month, year]);
  const accountById = useMemo(() => new Map(accounts.map((account) => [account.id, account])), [accounts]);
  const budgetById = useMemo(() => new Map(budgets.map((budget) => [budget.id, budget])), [budgets]);
  const categoryById = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);

  const yearOptions = useMemo(() => {
    const values = new Set([activeCycle.year, Number(year)]);
    budgets.forEach((budget) => values.add(Number(budget.year)));
    transactions.forEach((transaction) => {
      const cycle = getCurrentBudgetCycle(getTransactionDate(transaction));
      values.add(Number(cycle.year));
    });

    return Array.from(values)
      .filter(Boolean)
      .sort((a, b) => b - a);
  }, [activeCycle.year, budgets, transactions, year]);

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

  const incomeTransactions = useMemo(() => filteredTransactions.filter((transaction) => transaction.type === 'income'), [filteredTransactions]);
  const expenseTransactions = useMemo(() => filteredTransactions.filter((transaction) => transaction.type === 'expense'), [filteredTransactions]);

  const incomeTotal = useMemo(() => sumBy(filteredTransactions, (transaction) => transaction.type === 'income'), [filteredTransactions]);
  const expenseTotal = useMemo(() => sumBy(filteredTransactions, (transaction) => transaction.type === 'expense'), [filteredTransactions]);
  const allocationTotal = useMemo(() => periodBudgets.reduce((total, budget) => total + Number(budget.amount || 0), 0), [periodBudgets]);
  const netTotal = incomeTotal - expenseTotal;

  const budgetUsage = useMemo(() => {
    return periodBudgets
      .map((budget) => {
        const used = expenseTransactions
          .filter((transaction) => (transaction.budgetId || transaction.budget_id) === budget.id)
          .reduce((total, transaction) => total + Number(transaction.amount || 0), 0);
        const amount = Number(budget.amount || 0);
        const percentage = amount > 0 ? (used / amount) * 100 : 0;
        const over = Math.max(0, used - amount);

        return {
          id: budget.id,
          name: budget.name || 'Tanpa nama alokasi',
          amount,
          used,
          percentage,
          over,
        };
      })
      .sort((a, b) => b.used - a.used);
  }, [expenseTransactions, periodBudgets]);

  const overBudgetTotal = useMemo(() => budgetUsage.reduce((total, item) => total + item.over, 0), [budgetUsage]);

  const walletUsage = useMemo(() => {
    const grouped = groupTotals(expenseTransactions, (transaction) => {
      const wallet = accountById.get(transaction.accountId || transaction.account_id);
      return wallet?.name || 'Dompet tidak ditemukan';
    });

    return Array.from(grouped, ([name, value]) => ({ id: name, name, value })).sort((a, b) => b.value - a.value);
  }, [accountById, expenseTransactions]);

  const incomeSources = useMemo(() => {
    const grouped = groupTotals(incomeTransactions, (transaction) => {
      const category = categoryById.get(transaction.categoryId || transaction.category_id);
      return category?.name || transaction.note || 'Pemasukan';
    });

    return Array.from(grouped, ([name, value]) => ({ id: name, name, value })).sort((a, b) => b.value - a.value);
  }, [categoryById, incomeTransactions]);

  const dailyTrend = useMemo(() => {
    const dateMap = new Map();
    const start = new Date(selectedCycle.startDate);
    const end = new Date(selectedCycle.endDate);

    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      const key = date.toISOString().slice(0, 10);
      dateMap.set(key, {
        id: key,
        label: date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }),
        income: 0,
        expense: 0,
      });
    }

    filteredTransactions.forEach((transaction) => {
      const dateKey = String(getTransactionDate(transaction) || '').slice(0, 10);
      const row = dateMap.get(dateKey);
      if (!row) return;
      if (transaction.type === 'income') row.income += Number(transaction.amount || 0);
      if (transaction.type === 'expense') row.expense += Number(transaction.amount || 0);
    });

    return Array.from(dateMap.values());
  }, [filteredTransactions, selectedCycle]);

  const topExpenses = useMemo(() => {
    return [...expenseTransactions]
      .sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0))
      .slice(0, 6);
  }, [expenseTransactions]);

  const largestBudget = budgetUsage.find((item) => item.used > 0) || null;
  const largestWallet = walletUsage[0] || null;
  const largestTransaction = topExpenses[0] || null;
  const savingRate = incomeTotal > 0 ? (netTotal / incomeTotal) * 100 : null;

  const allocationItems = budgetUsage
    .filter((item) => item.used > 0)
    .slice(0, 7)
    .map((item) => ({
      id: item.id,
      name: item.name,
      value: item.used,
      meta: `${Math.min(999, Math.round(item.percentage))}% dari alokasi ${formatCurrency(item.amount)}`,
      tone: item.over > 0 ? 'danger' : item.percentage >= 80 ? 'warning' : '',
    }));

  const walletItems = walletUsage.slice(0, 7).map((item) => ({
    ...item,
    meta: `${expenseTotal > 0 ? Math.round((item.value / expenseTotal) * 100) : 0}% dari total pengeluaran`,
  }));

  const incomeItems = incomeSources.slice(0, 5).map((item) => ({
    ...item,
    meta: `${incomeTotal > 0 ? Math.round((item.value / incomeTotal) * 100) : 0}% dari total pemasukan`,
  }));

  const cashflowMax = Math.max(...dailyTrend.map((row) => Math.max(row.income, row.expense)), 1);
  const incomePoints = buildLinePoints(dailyTrend, 'income');
  const expensePoints = buildLinePoints(dailyTrend, 'expense');

  const resetFilters = () => {
    const current = getCurrentBudgetCycle();
    setMonth(current.month);
    setYear(current.year);
    setAccountId('all');
    setBudgetId('all');
  };

  const renderActiveChart = () => {
    if (activeTab === 'allocation') {
      return (
        <div className="report-panel-content">
          <div className="report-section-title">
            <span>Top alokasi</span>
            <small>Urutan berdasarkan nominal terpakai</small>
          </div>
          <HorizontalBarList items={allocationItems} />
        </div>
      );
    }

    if (activeTab === 'wallet') {
      return (
        <div className="report-panel-content">
          <div className="report-section-title">
            <span>Pengeluaran per dompet</span>
            <small>Dompet yang paling sering menjadi sumber dana</small>
          </div>
          <HorizontalBarList items={walletItems} />
        </div>
      );
    }

    return (
      <div className="report-panel-content">
        <div className="report-section-title">
          <span>Arus kas harian</span>
          <small>Pemasukan dan pengeluaran selama periode gajian</small>
        </div>

        <div className="report-line-chart">
          <svg viewBox="0 0 320 128" preserveAspectRatio="none" role="img" aria-label="Grafik arus kas harian">
            <defs>
              <linearGradient id="incomeLineGradient" x1="0" x2="1" y1="0" y2="0">
                <stop offset="0%" stopColor="#22c55e" />
                <stop offset="100%" stopColor="#14b8a6" />
              </linearGradient>
              <linearGradient id="expenseLineGradient" x1="0" x2="1" y1="0" y2="0">
                <stop offset="0%" stopColor="#fb7185" />
                <stop offset="100%" stopColor="#f97316" />
              </linearGradient>
            </defs>
            <line x1="0" x2="320" y1="124" y2="124" />
            <line x1="0" x2="320" y1="64" y2="64" />
            <polyline className="income-line" points={incomePoints} />
            <polyline className="expense-line" points={expensePoints} />
          </svg>
          <div className="report-chart-legend">
            <span><i className="legend-income" /> Pemasukan</span>
            <span><i className="legend-expense" /> Pengeluaran</span>
            <strong>Maks. harian {formatShortCurrency(cashflowMax)}</strong>
          </div>
        </div>
      </div>
    );
  };

  return (
    <main className="page report-v2-page">
      <section className="report-v2-hero">
        <div>
          <p className="report-eyebrow">Laporan Keuangan</p>
          <h1>Analisa keluarga</h1>
          <p className="report-period">{formatBudgetCycleRange(selectedCycle)}</p>
        </div>

        <div className={`report-net-pill ${netTotal < 0 ? 'is-minus' : 'is-plus'}`}>
          <span>Net periode</span>
          <strong>{formatCurrency(netTotal)}</strong>
          <small>{filteredTransactions.length} transaksi dianalisa</small>
        </div>
      </section>

      <section className="report-filter-card">
        <div className="report-section-title">
          <span>Filter laporan</span>
          <small>Pilih periode, dompet, atau alokasi tertentu</small>
        </div>

        <div className="report-filter-grid">
          <label>
            Bulan
            <select value={month} onChange={(event) => setMonth(Number(event.target.value))}>
              {MONTH_OPTIONS.map((item) => (
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

        <button className="report-reset-button" type="button" onClick={resetFilters}>
          Reset filter
        </button>
      </section>

      <section className="report-stat-grid">
        <StatCard label="Pemasukan" value={formatCurrency(incomeTotal)} note={`${incomeTransactions.length} transaksi masuk`} tone="income" />
        <StatCard label="Pengeluaran" value={formatCurrency(expenseTotal)} note={`${expenseTransactions.length} transaksi keluar`} tone="expense" />
        <StatCard label="Total alokasi" value={formatCurrency(allocationTotal)} note={`${periodBudgets.length} alokasi periode ini`} />
        <StatCard
          label="Over budget"
          value={formatCurrency(overBudgetTotal)}
          note={overBudgetTotal > 0 ? 'Perlu perhatian' : `Sisa aman ${formatCurrency(Math.max(0, allocationTotal - expenseTotal))}`}
          tone={overBudgetTotal > 0 ? 'expense' : 'income'}
        />
      </section>

      <section className="report-analysis-card">
        <div className="report-tabs" role="tablist" aria-label="Jenis analisa">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={activeTab === tab.id ? 'active' : ''}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {renderActiveChart()}
      </section>

      <section className="report-two-column">
        <article className="report-compact-card">
          <div className="report-section-title">
            <span>Penggunaan terbesar</span>
            <small>Alokasi yang paling banyak dipakai</small>
          </div>
          <HorizontalBarList items={allocationItems.slice(0, 6)} />
        </article>

        <article className="report-compact-card">
          <div className="report-section-title">
            <span>Insight otomatis</span>
            <small>Kesimpulan dari periode berjalan</small>
          </div>

          <ul className="report-insight-list">
            <li>
              {largestBudget
                ? `Pengeluaran terbesar berasal dari alokasi ${largestBudget.name} sebesar ${formatCurrency(largestBudget.used)}.`
                : 'Belum ada pengeluaran pada alokasi periode ini.'}
            </li>
            <li>
              {largestWallet
                ? `Dompet paling aktif: ${largestWallet.name} dengan total keluar ${formatCurrency(largestWallet.value)}.`
                : 'Belum ada dompet yang digunakan untuk pengeluaran periode ini.'}
            </li>
            <li>
              {overBudgetTotal > 0
                ? `Ada over budget sebesar ${formatCurrency(overBudgetTotal)} dan perlu ditinjau.`
                : 'Tidak ada alokasi yang melewati batas pada periode ini.'}
            </li>
            <li>
              {savingRate === null
                ? 'Saving rate belum tersedia karena pemasukan periode ini Rp 0.'
                : `Saving rate periode ini ${savingRate.toFixed(1)}%.`}
            </li>
          </ul>
        </article>
      </section>

      <section className="report-two-column">
        <article className="report-compact-card">
          <div className="report-section-title">
            <span>Sumber pemasukan</span>
            <small>Komposisi pemasukan pada periode ini</small>
          </div>
          <HorizontalBarList items={incomeItems} emptyText="Belum ada pemasukan pada periode ini." />
        </article>

        <article className="report-compact-card">
          <div className="report-section-title">
            <span>Transaksi terbesar</span>
            <small>Pengeluaran nominal terbesar</small>
          </div>

          {topExpenses.length ? (
            <div className="report-transaction-list">
              {topExpenses.map((transaction) => {
                const budget = budgetById.get(transaction.budgetId || transaction.budget_id);
                const account = accountById.get(transaction.accountId || transaction.account_id);
                return (
                  <div className="report-transaction-item" key={transaction.id}>
                    <div>
                      <strong>{budget?.name || transaction.note || 'Pengeluaran'}</strong>
                      <span>{getDateTimeLabel(transaction)} · {account?.name || 'Dompet'}</span>
                    </div>
                    <b>{formatCurrency(transaction.amount)}</b>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="report-empty-state">Belum ada pengeluaran pada periode ini.</div>
          )}
        </article>
      </section>
    </main>
  );
}
