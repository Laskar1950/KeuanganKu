import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import {
  getBudgetCycleLabel,
  getBudgetCyclePeriod,
  getBudgetCycleRange,
  getBudgetCycleShortLabel,
  isDateInBudgetCycle,
} from '../utils/budgetCycle.js';
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

function rupiah(value) {
  return `Rp ${Number(value || 0).toLocaleString('id-ID')}`;
}

function compactRupiah(value) {
  const amount = Number(value || 0);
  if (Math.abs(amount) >= 1000000000) return `Rp ${(amount / 1000000000).toFixed(1)}M`;
  if (Math.abs(amount) >= 1000000) return `Rp ${(amount / 1000000).toFixed(1)}jt`;
  if (Math.abs(amount) >= 1000) return `Rp ${(amount / 1000).toFixed(0)}rb`;
  return rupiah(amount);
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value) {
  const date = parseDate(value);
  if (!date) return '-';
  return date.toLocaleDateString('id-ID', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(transaction) {
  const dateText = formatDate(transaction.transactionDate);
  const created = transaction.createdAt ? new Date(transaction.createdAt) : null;
  const timeText = created && !Number.isNaN(created.getTime())
    ? created.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    : '';
  return timeText ? `${dateText} • ${timeText}` : dateText;
}

function formatDayLabel(value) {
  const date = parseDate(value);
  if (!date) return '-';
  return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
}

function getAccountName(accounts, accountId) {
  return accounts.find((account) => account.id === accountId)?.name || 'Dompet tidak diketahui';
}

function getBudgetName(budgets, budgetId) {
  return budgets.find((budget) => budget.id === budgetId)?.name || 'Tanpa alokasi';
}

function getCategoryName(categories, categoryId) {
  return categories.find((category) => category.id === categoryId)?.name || 'Tanpa kategori';
}

function getUsageTone(percent, overBudget) {
  if (overBudget > 0 || percent >= 100) return 'danger';
  if (percent >= 80) return 'warning';
  return 'safe';
}

function truncate(value, max = 18) {
  const text = String(value || '');
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function groupBySum(items, keyGetter) {
  return items.reduce((acc, item) => {
    const key = keyGetter(item);
    acc[key] = (acc[key] || 0) + Number(item.amount || 0);
    return acc;
  }, {});
}

function buildDateRows(startDate, endDate, transactions) {
  const rows = [];
  const cursor = new Date(startDate);

  while (cursor <= endDate) {
    const iso = cursor.toISOString().slice(0, 10);
    rows.push({ date: iso, label: formatDayLabel(iso), income: 0, expense: 0 });
    cursor.setDate(cursor.getDate() + 1);
  }

  const byDate = Object.fromEntries(rows.map((row) => [row.date, row]));
  transactions.forEach((trx) => {
    const row = byDate[trx.transactionDate];
    if (!row) return;
    if (trx.type === 'income') row.income += Number(trx.amount || 0);
    if (trx.type === 'expense') row.expense += Number(trx.amount || 0);
  });

  return rows;
}

function MiniTrendChart({ rows }) {
  const maxValue = Math.max(...rows.map((row) => Math.max(row.income, row.expense)), 1);
  const visibleRows = rows.filter((_, index) => index % 2 === 0 || rows.length <= 18);

  return (
    <div className="report-mini-trend" role="img" aria-label="Tren pemasukan dan pengeluaran harian">
      <div className="trend-legend">
        <span><i className="income-dot" /> Pemasukan</span>
        <span><i className="expense-dot" /> Pengeluaran</span>
      </div>
      <div className="trend-bars">
        {visibleRows.map((row) => (
          <div className="trend-day" key={row.date} title={`${row.label}: pemasukan ${rupiah(row.income)}, pengeluaran ${rupiah(row.expense)}`}>
            <div className="trend-column">
              <span className="income-bar" style={{ height: `${Math.max((row.income / maxValue) * 100, row.income ? 6 : 0)}%` }} />
              <span className="expense-bar" style={{ height: `${Math.max((row.expense / maxValue) * 100, row.expense ? 6 : 0)}%` }} />
            </div>
            <small>{row.label.split(' ')[0]}</small>
          </div>
        ))}
      </div>
    </div>
  );
}

function HorizontalBars({ rows, valueKey = 'amount', secondaryKey = null, emptyText }) {
  const maxValue = Math.max(...rows.map((row) => Math.max(Number(row[valueKey] || 0), Number(row[secondaryKey] || 0))), 1);

  if (!rows.length) return <div className="report-empty-state">{emptyText}</div>;

  return (
    <div className="report-horizontal-bars">
      {rows.map((row) => (
        <div className="report-hbar-row" key={row.id || row.name}>
          <div className="report-hbar-label">
            <strong>{row.name}</strong>
            <span>{rupiah(row[valueKey])}</span>
          </div>
          <div className="report-hbar-track">
            {secondaryKey && <span className="report-hbar-secondary" style={{ width: `${Math.min((Number(row[secondaryKey] || 0) / maxValue) * 100, 100)}%` }} />}
            <span className="report-hbar-primary" style={{ width: `${Math.min((Number(row[valueKey] || 0) / maxValue) * 100, 100)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function DonutComposition({ rows, total }) {
  if (!rows.length || !total) return <div className="report-empty-state">Belum ada pengeluaran pada periode ini.</div>;

  let current = 0;
  const colors = ['#fb7185', '#f97316', '#f59e0b', '#8b5cf6', '#06b6d4', '#22c55e'];
  const gradient = rows.map((row, index) => {
    const start = current;
    const end = current + (Number(row.amount || 0) / total) * 100;
    current = end;
    return `${colors[index % colors.length]} ${start}% ${end}%`;
  }).join(', ');

  return (
    <div className="report-donut-wrap">
      <div className="report-donut" style={{ background: `conic-gradient(${gradient})` }}>
        <div>
          <span>Total</span>
          <strong>{compactRupiah(total)}</strong>
        </div>
      </div>
      <div className="report-donut-list">
        {rows.map((row, index) => (
          <div key={row.id || row.name}>
            <i style={{ background: colors[index % colors.length] }} />
            <span>{row.name}</span>
            <strong>{Math.round((Number(row.amount || 0) / total) * 100)}%</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Reports() {
  const { transactions = [], accounts = [], budgets = [], categories = [] } = useApp();

  const activePeriod = useMemo(() => getBudgetCyclePeriod(new Date()), []);
  const [selectedMonth, setSelectedMonth] = useState(activePeriod.month);
  const [selectedYear, setSelectedYear] = useState(activePeriod.year);
  const [selectedAccount, setSelectedAccount] = useState('all');
  const [selectedBudget, setSelectedBudget] = useState('all');

  const years = useMemo(() => {
    const transactionYears = transactions.map((trx) => parseDate(trx.transactionDate)?.getFullYear()).filter(Boolean);
    const budgetYears = budgets.map((budget) => Number(budget.year)).filter(Boolean);
    const currentYear = new Date().getFullYear();
    return Array.from(new Set([...transactionYears, ...budgetYears, currentYear - 1, currentYear, currentYear + 1])).sort((a, b) => b - a);
  }, [budgets, transactions]);

  const cycleRange = useMemo(() => getBudgetCycleRange(selectedMonth, selectedYear), [selectedMonth, selectedYear]);
  const cycleLabel = useMemo(() => getBudgetCycleLabel(selectedMonth, selectedYear), [selectedMonth, selectedYear]);

  const filteredBudgetOptions = useMemo(() => {
    return budgets
      .filter((budget) => Number(budget.month) === Number(selectedMonth) && Number(budget.year) === Number(selectedYear))
      .filter((budget) => selectedAccount === 'all' || budget.accountId === selectedAccount)
      .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
  }, [budgets, selectedAccount, selectedMonth, selectedYear]);

  const filteredTransactions = useMemo(() => {
    return transactions
      .filter((trx) => isDateInBudgetCycle(trx.transactionDate, selectedMonth, selectedYear))
      .filter((trx) => selectedAccount === 'all' || trx.accountId === selectedAccount)
      .filter((trx) => selectedBudget === 'all' || trx.budgetId === selectedBudget)
      .sort((a, b) => String(a.transactionDate || '').localeCompare(String(b.transactionDate || '')));
  }, [transactions, selectedAccount, selectedBudget, selectedMonth, selectedYear]);

  const incomes = useMemo(() => filteredTransactions.filter((trx) => trx.type === 'income'), [filteredTransactions]);
  const expenses = useMemo(() => filteredTransactions.filter((trx) => trx.type === 'expense'), [filteredTransactions]);

  const totalIncome = incomes.reduce((sum, trx) => sum + Number(trx.amount || 0), 0);
  const totalExpense = expenses.reduce((sum, trx) => sum + Number(trx.amount || 0), 0);
  const netCashflow = totalIncome - totalExpense;

  const periodBudgets = useMemo(() => {
    return budgets
      .filter((budget) => Number(budget.month) === Number(selectedMonth) && Number(budget.year) === Number(selectedYear))
      .filter((budget) => selectedAccount === 'all' || budget.accountId === selectedAccount)
      .filter((budget) => selectedBudget === 'all' || budget.id === selectedBudget)
      .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
  }, [budgets, selectedAccount, selectedBudget, selectedMonth, selectedYear]);

  const allocationRows = useMemo(() => {
    return periodBudgets.map((budget) => {
      const relatedExpenses = transactions.filter((trx) =>
        trx.type === 'expense' &&
        trx.budgetId === budget.id &&
        isDateInBudgetCycle(trx.transactionDate, selectedMonth, selectedYear)
      );
      const spent = relatedExpenses.reduce((sum, trx) => sum + Number(trx.amount || 0), 0);
      const allocated = Number(budget.amount || 0);
      const remaining = allocated - spent;
      const overBudget = Math.max(spent - allocated, 0);
      const percent = allocated > 0 ? Math.round((spent / allocated) * 100) : 0;

      return {
        id: budget.id,
        name: budget.name || 'Alokasi tanpa nama',
        accountName: getAccountName(accounts, budget.accountId),
        allocated,
        spent,
        remaining,
        overBudget,
        percent,
        tone: getUsageTone(percent, overBudget),
      };
    }).sort((a, b) => b.spent - a.spent);
  }, [accounts, periodBudgets, selectedMonth, selectedYear, transactions]);

  const totalAllocated = allocationRows.reduce((sum, row) => sum + row.allocated, 0);
  const totalOverBudget = allocationRows.reduce((sum, row) => sum + row.overBudget, 0);
  const totalSafeRemaining = allocationRows.reduce((sum, row) => sum + Math.max(row.remaining, 0), 0);
  const savingRate = totalIncome > 0 ? Math.round((netCashflow / totalIncome) * 100) : null;

  const dailyTrend = useMemo(
    () => buildDateRows(cycleRange.startDate, cycleRange.endDate, filteredTransactions),
    [cycleRange.endDate, cycleRange.startDate, filteredTransactions]
  );

  const expenseByBudget = useMemo(() => {
    const grouped = groupBySum(expenses, (trx) => trx.budgetId || 'none');
    return Object.entries(grouped).map(([id, amount]) => ({
      id,
      name: id === 'none' ? 'Tanpa alokasi' : getBudgetName(budgets, id),
      amount,
    })).sort((a, b) => b.amount - a.amount);
  }, [budgets, expenses]);

  const expenseByWallet = useMemo(() => {
    const grouped = groupBySum(expenses, (trx) => trx.accountId || 'none');
    return Object.entries(grouped).map(([id, amount]) => ({
      id,
      name: id === 'none' ? 'Tanpa dompet' : getAccountName(accounts, id),
      amount,
    })).sort((a, b) => b.amount - a.amount);
  }, [accounts, expenses]);

  const incomeByCategory = useMemo(() => {
    const grouped = groupBySum(incomes, (trx) => trx.categoryId || 'none');
    return Object.entries(grouped).map(([id, amount]) => ({
      id,
      name: id === 'none' ? 'Tanpa kategori' : getCategoryName(categories, id),
      amount,
    })).sort((a, b) => b.amount - a.amount);
  }, [categories, incomes]);

  const topExpenses = useMemo(() => [...expenses].sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0)).slice(0, 6), [expenses]);
  const topAllocation = allocationRows[0] || null;
  const topWallet = expenseByWallet[0] || null;
  const highestTransaction = topExpenses[0] || null;

  const selectedAccountLabel = selectedAccount === 'all' ? 'Semua dompet' : getAccountName(accounts, selectedAccount);
  const selectedBudgetLabel = selectedBudget === 'all' ? 'Semua alokasi' : getBudgetName(budgets, selectedBudget);

  return (
    <div className="report-analytics-page">
      <section className="report-hero">
        <div>
          <p className="eyebrow">Laporan keuangan</p>
          <h1>Analisa keluarga</h1>
          <p>Periode gajian {cycleLabel}. Filter laporan berdasarkan bulan, dompet, dan alokasi untuk melihat pola keuangan yang paling penting.</p>
        </div>
        <div className="report-hero-card">
          <span>Net periode</span>
          <strong className={netCashflow < 0 ? 'negative' : 'positive'}>{rupiah(netCashflow)}</strong>
          <small>{filteredTransactions.length} transaksi dianalisa</small>
        </div>
      </section>

      <section className="report-filter-card">
        <div className="filter-title">
          <div>
            <p className="eyebrow">Filter interaktif</p>
            <h2>{getBudgetCycleShortLabel(selectedMonth, selectedYear)}</h2>
          </div>
          <span>{cycleRange.label}</span>
        </div>

        <div className="report-filters">
          <label>
            <span>Bulan</span>
            <select value={selectedMonth} onChange={(event) => { setSelectedMonth(Number(event.target.value)); setSelectedBudget('all'); }}>
              {MONTHS.map((month) => <option key={month.value} value={month.value}>{month.label}</option>)}
            </select>
          </label>

          <label>
            <span>Tahun</span>
            <select value={selectedYear} onChange={(event) => { setSelectedYear(Number(event.target.value)); setSelectedBudget('all'); }}>
              {years.map((year) => <option key={year} value={year}>{year}</option>)}
            </select>
          </label>

          <label>
            <span>Dompet</span>
            <select value={selectedAccount} onChange={(event) => { setSelectedAccount(event.target.value); setSelectedBudget('all'); }}>
              <option value="all">Semua dompet</option>
              {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
            </select>
          </label>

          <label>
            <span>Alokasi</span>
            <select value={selectedBudget} onChange={(event) => setSelectedBudget(event.target.value)}>
              <option value="all">Semua alokasi</option>
              {filteredBudgetOptions.map((budget) => <option key={budget.id} value={budget.id}>{budget.name}</option>)}
            </select>
          </label>
        </div>

        <div className="active-filter-pills">
          <span>{selectedAccountLabel}</span>
          <span>{selectedBudgetLabel}</span>
          <span>{cycleRange.label}</span>
        </div>
      </section>

      <section className="report-kpi-grid">
        <article className="report-kpi-card income"><span>Pemasukan</span><strong>{rupiah(totalIncome)}</strong><small>{incomes.length} transaksi masuk</small></article>
        <article className="report-kpi-card expense"><span>Pengeluaran</span><strong>{rupiah(totalExpense)}</strong><small>{expenses.length} transaksi keluar</small></article>
        <article className="report-kpi-card neutral"><span>Total alokasi</span><strong>{rupiah(totalAllocated)}</strong><small>{allocationRows.length} alokasi periode ini</small></article>
        <article className="report-kpi-card warning"><span>Over budget</span><strong>{rupiah(totalOverBudget)}</strong><small>Sisa aman {rupiah(totalSafeRemaining)}</small></article>
      </section>

      <section className="report-insight-grid">
        <article className="report-insight-card">
          <span>Penggunaan terbesar</span>
          <h3>{topAllocation ? topAllocation.name : 'Belum ada pengeluaran alokasi'}</h3>
          <p>{topAllocation ? `${topAllocation.name} sudah memakai ${rupiah(topAllocation.spent)} atau ${topAllocation.percent}% dari alokasi ${rupiah(topAllocation.allocated)}.` : 'Tambahkan pengeluaran untuk melihat alokasi paling banyak digunakan.'}</p>
        </article>
        <article className="report-insight-card">
          <span>Dompet paling aktif</span>
          <h3>{topWallet?.name || 'Belum ada data'}</h3>
          <p>{topWallet ? `Pengeluaran dari dompet ini mencapai ${rupiah(topWallet.amount)}.` : 'Belum ada pengeluaran dari dompet pada periode ini.'}</p>
        </article>
        <article className="report-insight-card">
          <span>Transaksi terbesar</span>
          <h3>{highestTransaction ? rupiah(highestTransaction.amount) : 'Belum ada data'}</h3>
          <p>{highestTransaction ? `${getBudgetName(budgets, highestTransaction.budgetId)} • ${formatDateTime(highestTransaction)}` : 'Transaksi terbesar akan muncul setelah ada pengeluaran.'}</p>
        </article>
        <article className="report-insight-card">
          <span>Saving rate</span>
          <h3 className={savingRate !== null && savingRate < 0 ? 'negative' : 'positive'}>{savingRate !== null ? `${savingRate}%` : '-'}</h3>
          <p>{savingRate !== null ? 'Perbandingan net cashflow terhadap pemasukan pada periode ini.' : 'Belum ada pemasukan pada periode ini.'}</p>
        </article>
      </section>

      <section className="report-chart-grid">
        <article className="report-chart-card wide">
          <div className="chart-heading"><div><span>Tren harian</span><h3>Arus kas periode gajian</h3></div><small>{cycleRange.label}</small></div>
          <MiniTrendChart rows={dailyTrend} />
        </article>

        <article className="report-chart-card">
          <div className="chart-heading"><div><span>Top alokasi</span><h3>Penggunaan paling besar</h3></div></div>
          <HorizontalBars rows={allocationRows.slice(0, 8).map((row) => ({ ...row, amount: row.spent, name: truncate(row.name, 24) }))} secondaryKey="allocated" emptyText="Belum ada alokasi untuk periode ini." />
        </article>

        <article className="report-chart-card">
          <div className="chart-heading"><div><span>Komposisi</span><h3>Pengeluaran per alokasi</h3></div></div>
          <DonutComposition rows={expenseByBudget.slice(0, 6).map((row) => ({ ...row, name: truncate(row.name, 22) }))} total={totalExpense} />
        </article>

        <article className="report-chart-card">
          <div className="chart-heading"><div><span>Dompet</span><h3>Pengeluaran per dompet</h3></div></div>
          <HorizontalBars rows={expenseByWallet.slice(0, 8).map((row) => ({ ...row, name: truncate(row.name, 22) }))} emptyText="Belum ada transaksi dompet pada periode ini." />
        </article>

        <article className="report-chart-card">
          <div className="chart-heading"><div><span>Pemasukan</span><h3>Sumber pemasukan</h3></div></div>
          <HorizontalBars rows={incomeByCategory.slice(0, 8).map((row) => ({ ...row, name: truncate(row.name, 22) }))} emptyText="Belum ada pemasukan pada periode ini." />
        </article>
      </section>

      <section className="report-list-grid">
        <article className="report-list-card">
          <div className="list-heading"><div><span>Ranking alokasi</span><h3>Pemakaian budget</h3></div><small>{allocationRows.length} alokasi</small></div>
          <div className="allocation-report-list">
            {allocationRows.length ? allocationRows.map((row) => (
              <div className={`allocation-report-item ${row.tone}`} key={row.id}>
                <div className="allocation-report-main">
                  <div><strong>{row.name}</strong><span>{row.accountName}</span></div>
                  <div className="allocation-report-number"><strong>{rupiah(row.spent)}</strong><span>{row.percent}% dari {rupiah(row.allocated)}</span></div>
                </div>
                <div className="allocation-progress"><span style={{ width: `${Math.min(row.percent, 120)}%` }} /></div>
                <div className="allocation-report-foot"><span>Sisa {rupiah(row.remaining)}</span>{row.overBudget > 0 && <strong>Over {rupiah(row.overBudget)}</strong>}</div>
              </div>
            )) : <div className="report-empty-state">Belum ada alokasi pada periode ini.</div>}
          </div>
        </article>

        <article className="report-list-card">
          <div className="list-heading"><div><span>Penggunaan terbesar</span><h3>Top transaksi keluar</h3></div><small>{topExpenses.length} transaksi</small></div>
          <div className="top-expense-list">
            {topExpenses.length ? topExpenses.map((trx) => (
              <div className="top-expense-item" key={trx.id}>
                <div>
                  <strong>{trx.note || getBudgetName(budgets, trx.budgetId)}</strong>
                  <span>{getBudgetName(budgets, trx.budgetId)} • {getAccountName(accounts, trx.accountId)}</span>
                  <small>{formatDateTime(trx)}</small>
                </div>
                <strong>{rupiah(trx.amount)}</strong>
              </div>
            )) : <div className="report-empty-state">Belum ada pengeluaran pada periode ini.</div>}
          </div>
        </article>
      </section>

      <section className="report-summary-note">
        <p>Catatan: laporan mengikuti siklus gajian tanggal 25 sampai 24 bulan berikutnya. Alokasi boleh over budget, tetapi transaksi tetap mengikuti saldo dompet.</p>
      </section>
    </div>
  );
}
