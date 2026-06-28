import React, { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useApp } from '../context/AppContext.jsx';
import {
  getBudgetCycleRange,
  getBudgetCyclePeriod,
  getBudgetCycleLabel,
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

const PIE_COLORS = ['#fb7185', '#f97316', '#f59e0b', '#8b5cf6', '#06b6d4', '#22c55e', '#64748b'];

function rupiah(value) {
  return `Rp ${Number(value || 0).toLocaleString('id-ID')}`;
}

function compactRupiah(value) {
  const amount = Number(value || 0);
  if (Math.abs(amount) >= 1000000000) return `Rp ${(amount / 1000000000).toFixed(1)}M`;
  if (Math.abs(amount) >= 1000000) return `Rp ${(amount / 1000000).toFixed(1)}jt`;
  if (Math.abs(amount) >= 1000) return `Rp ${(amount / 1000).toFixed(0)}rb`;
  return `Rp ${amount.toLocaleString('id-ID')}`;
}

function parseDate(dateString) {
  if (!dateString) return null;
  const date = new Date(`${dateString}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatShortDate(dateString) {
  const date = parseDate(dateString);
  if (!date) return '-';
  return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
}

function formatFullDateTime(transaction) {
  const date = parseDate(transaction.transactionDate);
  const dateText = date
    ? date.toLocaleDateString('id-ID', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
    : '-';

  const created = transaction.createdAt ? new Date(transaction.createdAt) : null;
  const timeText = created && !Number.isNaN(created.getTime())
    ? created.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    : '';

  return timeText ? `${dateText} • ${timeText}` : dateText;
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

function groupBySum(items, keyGetter, valueGetter) {
  return items.reduce((acc, item) => {
    const key = keyGetter(item);
    acc[key] = (acc[key] || 0) + Number(valueGetter(item) || 0);
    return acc;
  }, {});
}

function buildDateRows(startDate, endDate) {
  const rows = [];
  const cursor = new Date(startDate);

  while (cursor <= endDate) {
    const iso = cursor.toISOString().slice(0, 10);
    rows.push({
      date: iso,
      label: formatShortDate(iso),
      income: 0,
      expense: 0,
      net: 0,
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  return rows;
}

function getUsageClass(percent, overBudget) {
  if (overBudget > 0 || percent >= 100) return 'danger';
  if (percent >= 80) return 'warning';
  return 'safe';
}

function chartCurrencyFormatter(value) {
  return compactRupiah(value);
}

export default function Reports() {
  const {
    transactions = [],
    accounts = [],
    budgets = [],
    categories = [],
    currentMember,
  } = useApp();

  const activePeriod = useMemo(() => getBudgetCyclePeriod(new Date()), []);
  const [selectedMonth, setSelectedMonth] = useState(activePeriod.month);
  const [selectedYear, setSelectedYear] = useState(activePeriod.year);
  const [selectedAccount, setSelectedAccount] = useState('all');
  const [selectedBudget, setSelectedBudget] = useState('all');

  const years = useMemo(() => {
    const fromTransactions = transactions
      .map((trx) => parseDate(trx.transactionDate)?.getFullYear())
      .filter(Boolean);
    const fromBudgets = budgets.map((budget) => Number(budget.year)).filter(Boolean);
    const currentYear = new Date().getFullYear();
    return Array.from(new Set([...fromTransactions, ...fromBudgets, currentYear - 1, currentYear, currentYear + 1]))
      .sort((a, b) => b - a);
  }, [transactions, budgets]);

  const cycleRange = useMemo(
    () => getBudgetCycleRange(selectedMonth, selectedYear),
    [selectedMonth, selectedYear]
  );

  const cycleLabel = useMemo(
    () => getBudgetCycleLabel(selectedMonth, selectedYear),
    [selectedMonth, selectedYear]
  );

  const periodBudgets = useMemo(() => {
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

  const totalIncome = useMemo(() => incomes.reduce((sum, trx) => sum + Number(trx.amount || 0), 0), [incomes]);
  const totalExpense = useMemo(() => expenses.reduce((sum, trx) => sum + Number(trx.amount || 0), 0), [expenses]);
  const netCashflow = totalIncome - totalExpense;

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
        accountId: budget.accountId,
        accountName: getAccountName(accounts, budget.accountId),
        allocated,
        spent,
        remaining,
        overBudget,
        percent,
        status: getUsageClass(percent, overBudget),
      };
    }).sort((a, b) => b.spent - a.spent);
  }, [accounts, periodBudgets, selectedMonth, selectedYear, transactions]);

  const totalAllocated = allocationRows.reduce((sum, row) => sum + row.allocated, 0);
  const totalOverBudget = allocationRows.reduce((sum, row) => sum + row.overBudget, 0);
  const totalRemainingBudget = allocationRows.reduce((sum, row) => sum + Math.max(row.remaining, 0), 0);

  const dailyTrend = useMemo(() => {
    const baseRows = buildDateRows(cycleRange.startDate, cycleRange.endDate);
    const rowsByDate = Object.fromEntries(baseRows.map((row) => [row.date, row]));

    filteredTransactions.forEach((trx) => {
      const row = rowsByDate[trx.transactionDate];
      if (!row) return;

      if (trx.type === 'income') {
        row.income += Number(trx.amount || 0);
      } else {
        row.expense += Number(trx.amount || 0);
      }
      row.net = row.income - row.expense;
    });

    let cumulative = 0;
    return baseRows.map((row) => {
      cumulative += row.net;
      return { ...row, cumulative };
    });
  }, [cycleRange.endDate, cycleRange.startDate, filteredTransactions]);

  const expenseByBudget = useMemo(() => {
    const grouped = groupBySum(expenses, (trx) => trx.budgetId || 'none', (trx) => trx.amount);
    return Object.entries(grouped)
      .map(([budgetId, amount]) => ({
        id: budgetId,
        name: budgetId === 'none' ? 'Tanpa alokasi' : getBudgetName(budgets, budgetId),
        amount,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [budgets, expenses]);

  const expenseByWallet = useMemo(() => {
    const grouped = groupBySum(expenses, (trx) => trx.accountId || 'none', (trx) => trx.amount);
    return Object.entries(grouped)
      .map(([accountId, amount]) => ({
        id: accountId,
        name: accountId === 'none' ? 'Tanpa dompet' : getAccountName(accounts, accountId),
        amount,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [accounts, expenses]);

  const incomeByCategory = useMemo(() => {
    const grouped = groupBySum(incomes, (trx) => trx.categoryId || 'none', (trx) => trx.amount);
    return Object.entries(grouped)
      .map(([categoryId, amount]) => ({
        id: categoryId,
        name: categoryId === 'none' ? 'Tanpa kategori' : getCategoryName(categories, categoryId),
        amount,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [categories, incomes]);

  const topExpenses = useMemo(() => {
    return [...expenses].sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0)).slice(0, 6);
  }, [expenses]);

  const topAllocation = allocationRows[0] || null;
  const topWallet = expenseByWallet[0] || null;
  const highestTransaction = topExpenses[0] || null;
  const savingRate = totalIncome > 0 ? Math.round((netCashflow / totalIncome) * 100) : 0;

  const allocationChartRows = allocationRows.slice(0, 8).map((row) => ({
    name: row.name.length > 18 ? `${row.name.slice(0, 18)}…` : row.name,
    terpakai: row.spent,
    alokasi: row.allocated,
  }));

  const walletChartRows = expenseByWallet.slice(0, 8).map((row) => ({
    name: row.name.length > 16 ? `${row.name.slice(0, 16)}…` : row.name,
    pengeluaran: row.amount,
  }));

  const pieRows = expenseByBudget.slice(0, 6).map((row) => ({
    name: row.name.length > 18 ? `${row.name.slice(0, 18)}…` : row.name,
    value: row.amount,
  }));

  const filteredBudgetOptions = useMemo(() => {
    return budgets
      .filter((budget) => Number(budget.month) === Number(selectedMonth) && Number(budget.year) === Number(selectedYear))
      .filter((budget) => selectedAccount === 'all' || budget.accountId === selectedAccount)
      .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
  }, [budgets, selectedAccount, selectedMonth, selectedYear]);

  return (
    <div className="report-analytics-page">
      <section className="report-hero">
        <div>
          <p className="eyebrow">Laporan keuangan</p>
          <h1>Analisa keluarga</h1>
          <p>Periode gajian {cycleLabel}. Pantau arus kas, dompet, alokasi, dan pengeluaran terbesar.</p>
        </div>
        <div className="report-hero-card">
          <span>Net periode ini</span>
          <strong className={netCashflow < 0 ? 'negative' : 'positive'}>{rupiah(netCashflow)}</strong>
          <small>{filteredTransactions.length} transaksi dianalisa</small>
        </div>
      </section>

      <section className="report-filter-card">
        <div className="filter-title">
          <div>
            <p className="eyebrow">Filter laporan</p>
            <h2>{getBudgetCycleShortLabel(selectedMonth, selectedYear)}</h2>
          </div>
          <span>{cycleRange.label}</span>
        </div>

        <div className="report-filters">
          <label>
            <span>Bulan</span>
            <select value={selectedMonth} onChange={(event) => {
              setSelectedMonth(Number(event.target.value));
              setSelectedBudget('all');
            }}>
              {MONTHS.map((month) => (
                <option key={month.value} value={month.value}>{month.label}</option>
              ))}
            </select>
          </label>

          <label>
            <span>Tahun</span>
            <select value={selectedYear} onChange={(event) => {
              setSelectedYear(Number(event.target.value));
              setSelectedBudget('all');
            }}>
              {years.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </label>

          <label>
            <span>Dompet</span>
            <select value={selectedAccount} onChange={(event) => {
              setSelectedAccount(event.target.value);
              setSelectedBudget('all');
            }}>
              <option value="all">Semua dompet</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>{account.name}</option>
              ))}
            </select>
          </label>

          <label>
            <span>Alokasi</span>
            <select value={selectedBudget} onChange={(event) => setSelectedBudget(event.target.value)}>
              <option value="all">Semua alokasi</option>
              {filteredBudgetOptions.map((budget) => (
                <option key={budget.id} value={budget.id}>{budget.name}</option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="report-kpi-grid">
        <article className="report-kpi-card income">
          <span>Pemasukan</span>
          <strong>{rupiah(totalIncome)}</strong>
          <small>{incomes.length} transaksi masuk</small>
        </article>
        <article className="report-kpi-card expense">
          <span>Pengeluaran</span>
          <strong>{rupiah(totalExpense)}</strong>
          <small>{expenses.length} transaksi keluar</small>
        </article>
        <article className="report-kpi-card neutral">
          <span>Total alokasi</span>
          <strong>{rupiah(totalAllocated)}</strong>
          <small>{allocationRows.length} alokasi periode ini</small>
        </article>
        <article className="report-kpi-card warning">
          <span>Over budget</span>
          <strong>{rupiah(totalOverBudget)}</strong>
          <small>Sisa aman {rupiah(totalRemainingBudget)}</small>
        </article>
      </section>

      <section className="report-insight-grid">
        <article className="report-insight-card">
          <span>Insight utama</span>
          <h3>{topAllocation ? `${topAllocation.name} paling besar terpakai` : 'Belum ada pengeluaran alokasi'}</h3>
          <p>
            {topAllocation
              ? `${topAllocation.name} memakai ${rupiah(topAllocation.spent)} dari alokasi ${rupiah(topAllocation.allocated)} (${topAllocation.percent}%).`
              : 'Tambahkan transaksi pengeluaran untuk melihat analisa alokasi terbesar.'}
          </p>
        </article>

        <article className="report-insight-card">
          <span>Dompet paling aktif</span>
          <h3>{topWallet?.name || 'Belum ada data dompet'}</h3>
          <p>{topWallet ? `Pengeluaran dari dompet ini mencapai ${rupiah(topWallet.amount)}.` : 'Belum ada transaksi pengeluaran pada periode ini.'}</p>
        </article>

        <article className="report-insight-card">
          <span>Transaksi terbesar</span>
          <h3>{highestTransaction ? rupiah(highestTransaction.amount) : 'Belum ada transaksi'}</h3>
          <p>
            {highestTransaction
              ? `${getBudgetName(budgets, highestTransaction.budgetId)} • ${formatFullDateTime(highestTransaction)}`
              : 'Transaksi terbesar akan muncul setelah ada pengeluaran.'}
          </p>
        </article>

        <article className="report-insight-card">
          <span>Saving rate</span>
          <h3 className={savingRate < 0 ? 'negative' : 'positive'}>{totalIncome > 0 ? `${savingRate}%` : '-'}</h3>
          <p>{totalIncome > 0 ? 'Perbandingan net cashflow terhadap pemasukan periode ini.' : 'Belum ada pemasukan pada periode ini.'}</p>
        </article>
      </section>

      <section className="report-chart-grid">
        <article className="report-chart-card wide">
          <div className="chart-heading">
            <div>
              <span>Tren harian</span>
              <h3>Arus kas periode gajian</h3>
            </div>
            <small>{cycleRange.label}</small>
          </div>
          <div className="chart-box">
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={dailyTrend}>
                <defs>
                  <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#fb7185" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#fb7185" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" minTickGap={22} />
                <YAxis tickFormatter={chartCurrencyFormatter} width={64} />
                <Tooltip formatter={(value) => rupiah(value)} />
                <Legend />
                <Area type="monotone" dataKey="income" name="Pemasukan" stroke="#22c55e" fill="url(#incomeGradient)" strokeWidth={3} />
                <Area type="monotone" dataKey="expense" name="Pengeluaran" stroke="#fb7185" fill="url(#expenseGradient)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="report-chart-card">
          <div className="chart-heading">
            <div>
              <span>Top alokasi</span>
              <h3>Penggunaan tertinggi</h3>
            </div>
          </div>
          <div className="chart-box">
            {allocationChartRows.length ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={allocationChartRows} layout="vertical" margin={{ left: 20, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tickFormatter={chartCurrencyFormatter} />
                  <YAxis type="category" dataKey="name" width={110} />
                  <Tooltip formatter={(value) => rupiah(value)} />
                  <Legend />
                  <Bar dataKey="alokasi" name="Alokasi" fill="#cbd5e1" radius={[0, 10, 10, 0]} />
                  <Bar dataKey="terpakai" name="Terpakai" fill="#fb7185" radius={[0, 10, 10, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-chart">Belum ada alokasi untuk periode ini.</div>
            )}
          </div>
        </article>

        <article className="report-chart-card">
          <div className="chart-heading">
            <div>
              <span>Komposisi</span>
              <h3>Pengeluaran per alokasi</h3>
            </div>
          </div>
          <div className="chart-box">
            {pieRows.length ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={pieRows} dataKey="value" nameKey="name" innerRadius={64} outerRadius={98} paddingAngle={3}>
                    {pieRows.map((entry, index) => (
                      <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => rupiah(value)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-chart">Belum ada pengeluaran pada periode ini.</div>
            )}
          </div>
        </article>

        <article className="report-chart-card">
          <div className="chart-heading">
            <div>
              <span>Dompet</span>
              <h3>Pengeluaran per dompet</h3>
            </div>
          </div>
          <div className="chart-box">
            {walletChartRows.length ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={walletChartRows}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" minTickGap={12} />
                  <YAxis tickFormatter={chartCurrencyFormatter} width={64} />
                  <Tooltip formatter={(value) => rupiah(value)} />
                  <Bar dataKey="pengeluaran" name="Pengeluaran" fill="#f97316" radius={[12, 12, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-chart">Belum ada transaksi dompet pada periode ini.</div>
            )}
          </div>
        </article>

        <article className="report-chart-card">
          <div className="chart-heading">
            <div>
              <span>Pemasukan</span>
              <h3>Sumber pemasukan</h3>
            </div>
          </div>
          <div className="chart-box">
            {incomeByCategory.length ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={incomeByCategory.slice(0, 8)}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" minTickGap={12} />
                  <YAxis tickFormatter={chartCurrencyFormatter} width={64} />
                  <Tooltip formatter={(value) => rupiah(value)} />
                  <Bar dataKey="amount" name="Pemasukan" fill="#22c55e" radius={[12, 12, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-chart">Belum ada pemasukan pada periode ini.</div>
            )}
          </div>
        </article>
      </section>

      <section className="report-list-grid">
        <article className="report-list-card">
          <div className="list-heading">
            <div>
              <span>Ranking alokasi</span>
              <h3>Pemakaian budget</h3>
            </div>
            <small>{allocationRows.length} alokasi</small>
          </div>

          <div className="allocation-report-list">
            {allocationRows.length ? allocationRows.map((row) => (
              <div className={`allocation-report-item ${row.status}`} key={row.id}>
                <div className="allocation-report-main">
                  <div>
                    <strong>{row.name}</strong>
                    <span>{row.accountName}</span>
                  </div>
                  <div className="allocation-report-number">
                    <strong>{rupiah(row.spent)}</strong>
                    <span>{row.percent}% dari {rupiah(row.allocated)}</span>
                  </div>
                </div>
                <div className="allocation-progress">
                  <span style={{ width: `${Math.min(row.percent, 120)}%` }} />
                </div>
                <div className="allocation-report-foot">
                  <span>Sisa {rupiah(row.remaining)}</span>
                  {row.overBudget > 0 && <strong>Over {rupiah(row.overBudget)}</strong>}
                </div>
              </div>
            )) : (
              <div className="empty-list">Belum ada alokasi pada periode ini.</div>
            )}
          </div>
        </article>

        <article className="report-list-card">
          <div className="list-heading">
            <div>
              <span>Penggunaan terbesar</span>
              <h3>Top transaksi keluar</h3>
            </div>
            <small>{topExpenses.length} transaksi</small>
          </div>

          <div className="top-expense-list">
            {topExpenses.length ? topExpenses.map((trx) => (
              <div className="top-expense-item" key={trx.id}>
                <div>
                  <strong>{trx.note || getBudgetName(budgets, trx.budgetId)}</strong>
                  <span>{getBudgetName(budgets, trx.budgetId)} • {getAccountName(accounts, trx.accountId)}</span>
                  <small>{formatFullDateTime(trx)}</small>
                </div>
                <strong>{rupiah(trx.amount)}</strong>
              </div>
            )) : (
              <div className="empty-list">Belum ada pengeluaran pada periode ini.</div>
            )}
          </div>
        </article>
      </section>

      <section className="report-summary-note">
        <p>
          Catatan: filter bulan memakai siklus gajian tanggal 25. Data periode {getBudgetCycleShortLabel(selectedMonth, selectedYear)}
          berarti transaksi dari {cycleRange.label}. Alokasi boleh over budget, tetapi transaksi tetap mengikuti saldo dompet.
        </p>
      </section>
    </div>
  );
}
