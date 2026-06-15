import React, { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, Download, LineChart, PiggyBank, TrendingUp } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import { Card, EmptyState, ProgressBar } from '../components/UI.jsx';
import { currentMonthYear, formatRupiah, monthLabel } from '../utils/format.js';
import { getBudgetUsage, getExpenseByCategory, getMonthTransactions, sumByType } from '../utils/calculations.js';

export default function Reports() {
  const { transactions, categories, budgets } = useApp();
  const { month, year } = currentMonthYear();
  const monthTransactions = useMemo(() => getMonthTransactions(transactions, month, year), [transactions, month, year]);
  const income = sumByType(monthTransactions, 'income');
  const expense = sumByType(monthTransactions, 'expense');
  const saving = income - expense;
  const savingRate = income ? Math.round((saving / income) * 100) : 0;
  const categoryData = getExpenseByCategory(monthTransactions, categories);
  const chartData = categoryData.slice(0, 5).map((item) => ({ name: item.name, total: item.amount }));
  const top = categoryData[0];
  const monthBudgets = budgets.filter((budget) => budget.month === month && budget.year === year);
  const criticalBudget = monthBudgets
    .map((budget) => {
      const usage = getBudgetUsage(budget, monthTransactions);
      const category = categories.find((cat) => cat.id === budget.categoryId);
      return { budget, usage, category };
    })
    .sort((a, b) => b.usage.percentage - a.usage.percentage)[0];

  return (
    <div className="page playful-reports-page">
      <header className="header playful-page-header">
        <div>
          <p className="eyebrow">Analisis bulanan</p>
          <h1>Laporan</h1>
        </div>
        <button className="icon-btn playful-icon-btn" type="button" aria-label="Export laporan">
          <Download size={18} />
        </button>
      </header>

      <section className="playful-report-hero">
        <div className="row-between">
          <div>
            <span>Periode laporan</span>
            <strong>{monthLabel(month, year)}</strong>
          </div>
          <LineChart size={22} />
        </div>
        <div className="playful-report-grid">
          <div><span>Pemasukan</span><b>{formatRupiah(income)}</b></div>
          <div><span>Pengeluaran</span><b>{formatRupiah(expense)}</b></div>
          <div><span>Net saving</span><b>{formatRupiah(saving)}</b></div>
        </div>
      </section>

      <Card className="playful-chart-card">
        <div className="section-head">
          <div>
            <p className="section-kicker">Grafik</p>
            <h2>Pengeluaran per Kategori</h2>
          </div>
          <span className="section-link">Top 5</span>
        </div>
        {chartData.length === 0 ? <EmptyState emoji="📊" title="Belum ada data laporan" description="Tambahkan transaksi pengeluaran untuk melihat grafik." /> : (
          <div className="report-chart playful-report-chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 12, right: 12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,.08)" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={92} tick={{ fontSize: 11, fill: '#718096' }} />
                <Tooltip formatter={(value) => formatRupiah(value)} />
                <Bar dataKey="total" fill="#fb7185" radius={[0, 12, 12, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <section className="playful-summary-grid reports-summary-grid">
        <div className="playful-stat-card income">
          <span>Pemasukan</span>
          <strong>{formatRupiah(income)}</strong>
        </div>
        <div className="playful-stat-card expense">
          <span>Pengeluaran</span>
          <strong>{formatRupiah(expense)}</strong>
        </div>
        <div className="playful-stat-card saving">
          <span>Saving rate</span>
          <strong>{savingRate}%</strong>
        </div>
      </section>

      <Card className="playful-section-card">
        <div className="section-head">
          <div>
            <p className="section-kicker">Detail Kategori</p>
            <h2>Komposisi pengeluaran</h2>
          </div>
        </div>
        {categoryData.length === 0 ? <p className="muted tiny">Belum ada pengeluaran bulan ini.</p> : categoryData.map((item) => {
          const pct = expense ? Math.round((item.amount / expense) * 100) : 0;
          return (
            <div className="budget-row playful-budget-row" key={item.categoryId}>
              <div className="row-between"><h3>{item.name}</h3><strong>{pct}%</strong></div>
              <p className="item-sub">{formatRupiah(item.amount)}</p>
              <ProgressBar value={pct} variant={pct >= 80 ? 'red' : pct >= 50 ? 'amber' : 'green'} />
            </div>
          );
        })}
      </Card>

      <Card className="playful-insight-card">
        <p className="section-kicker">Insight keluarga</p>
        <div className="playful-insight-item">
          <span><TrendingUp size={17} /></span>
          <div>
            <h2>{top ? `${top.name} paling dominan` : 'Belum ada insight'}</h2>
            <p>{top ? `Pengeluaran terbesar bulan ini adalah ${top.name} sebesar ${formatRupiah(top.amount)}.` : 'Input transaksi terlebih dahulu agar sistem dapat menampilkan insight bulanan.'}</p>
          </div>
        </div>
        <div className="playful-insight-item">
          <span><PiggyBank size={17} /></span>
          <div>
            <h2>Saving rate {savingRate}%</h2>
            <p>{income ? `Keluarga menyisihkan sekitar ${savingRate}% dari pemasukan bulan ini.` : 'Tambahkan pemasukan untuk menghitung saving rate.'}</p>
          </div>
        </div>
        {criticalBudget && (
          <div className="playful-insight-item warning">
            <span><AlertTriangle size={17} /></span>
            <div>
              <h2>{criticalBudget.category?.name || 'Alokasi'} perlu diperhatikan</h2>
              <p>Penggunaan sudah mencapai {criticalBudget.usage.percentage}% dengan sisa {formatRupiah(criticalBudget.usage.remaining)}.</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
