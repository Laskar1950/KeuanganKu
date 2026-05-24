import React, { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useApp } from '../context/AppContext.jsx';
import { Card, EmptyState, ProgressBar } from '../components/UI.jsx';
import { currentMonthYear, formatRupiah, monthLabel } from '../utils/format.js';
import { getExpenseByCategory, getMonthTransactions, sumByType } from '../utils/calculations.js';

export default function Reports() {
  const { transactions, categories } = useApp();
  const { month, year } = currentMonthYear();
  const monthTransactions = useMemo(() => getMonthTransactions(transactions, month, year), [transactions, month, year]);
  const income = sumByType(monthTransactions, 'income');
  const expense = sumByType(monthTransactions, 'expense');
  const categoryData = getExpenseByCategory(monthTransactions, categories);
  const chartData = categoryData.slice(0, 5).map((item) => ({ name: item.name, total: item.amount }));
  const top = categoryData[0];

  return (
    <div className="page">
      <header><p className="eyebrow">Analisis bulanan</p><h1>Laporan</h1></header>
      <Card>
        <div className="section-head"><div><p className="section-kicker">Periode</p><h2>{monthLabel(month, year)}</h2></div></div>
        <div className="grid-2">
          <div className="metric-card"><p className="metric-title">Pemasukan</p><p className="metric-value">{formatRupiah(income)}</p></div>
          <div className="metric-card"><p className="metric-title">Pengeluaran</p><p className="metric-value">{formatRupiah(expense)}</p></div>
        </div>
      </Card>
      <Card>
        <p className="section-kicker">Grafik</p>
        <h2 style={{ marginBottom: 14 }}>Pengeluaran per Kategori</h2>
        {chartData.length === 0 ? <EmptyState emoji="📊" title="Belum ada data laporan" description="Tambahkan transaksi pengeluaran untuk melihat grafik." /> : (
          <div className="report-chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 12, right: 12 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={90} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value) => formatRupiah(value)} />
                <Bar dataKey="total" fill="#0f172a" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>
      <Card>
        <p className="section-kicker">Detail Kategori</p>
        {categoryData.length === 0 ? <p className="muted tiny">Belum ada pengeluaran bulan ini.</p> : categoryData.map((item) => {
          const pct = expense ? Math.round((item.amount / expense) * 100) : 0;
          return <div className="budget-row" key={item.categoryId}><div className="row-between"><h3>{item.name}</h3><strong>{pct}%</strong></div><p className="item-sub">{formatRupiah(item.amount)}</p><ProgressBar value={pct} /></div>;
        })}
      </Card>
      <Card className="flat" style={{ background: '#0f172a', color: 'white' }}>
        <p className="section-kicker" style={{ color: 'rgba(255,255,255,.55)' }}>Insight</p>
        <h2>{top ? `${top.name} paling dominan` : 'Belum ada insight'}</h2>
        <p style={{ color: 'rgba(255,255,255,.7)', lineHeight: 1.5, marginBottom: 0 }}>
          {top ? `Pengeluaran terbesar bulan ini adalah ${top.name} sebesar ${formatRupiah(top.amount)}.` : 'Input transaksi terlebih dahulu agar sistem dapat menampilkan insight bulanan.'}
        </p>
      </Card>
    </div>
  );
}
