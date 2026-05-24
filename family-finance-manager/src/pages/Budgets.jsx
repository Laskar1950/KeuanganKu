import React, { useMemo, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import { Card, EmptyState, ProgressBar, StatusPill } from '../components/UI.jsx';
import { currentMonthYear, formatRupiah, monthLabel } from '../utils/format.js';
import { getBudgetUsage, getMonthTransactions } from '../utils/calculations.js';

export default function Budgets() {
  const { budgets, categories, transactions, addBudget, deleteBudget, notify } = useApp();
  const { month, year } = currentMonthYear();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ categoryId: '', amount: '' });
  const monthTransactions = useMemo(() => getMonthTransactions(transactions, month, year), [transactions, month, year]);
  const monthBudgets = budgets.filter((budget) => budget.month === month && budget.year === year);
  const expenseCategories = categories.filter((cat) => cat.type === 'expense');
  const submit = async (event) => {
    event.preventDefault();
    try { await addBudget({ ...form, month, year }); setForm({ categoryId: '', amount: '' }); setShowForm(false); } catch (error) { notify(error.message); }
  };
  return (
    <div className="page">
      <header className="header"><div><p className="eyebrow">Kontrol pengeluaran</p><h1>Anggaran</h1></div><button className="small-btn" onClick={() => setShowForm(!showForm)}>+ Baru</button></header>
      <Card>
        <div className="row-between" style={{ marginBottom: 14 }}><h2>{monthLabel(month, year)}</h2><CalendarDays size={18} className="muted" /></div>
        {showForm && <form className="form-grid" onSubmit={submit} style={{ marginBottom: 18 }}>
          <div className="field"><label>Kategori</label><select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}><option value="">Pilih kategori</option>{expenseCategories.map((cat) => <option value={cat.id} key={cat.id}>{cat.name}</option>)}</select></div>
          <div className="field"><label>Nominal Anggaran</label><input type="number" inputMode="numeric" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
          <button className="primary-btn">Simpan Anggaran</button>
        </form>}
        {monthBudgets.length === 0 ? <EmptyState emoji="🎯" title="Belum ada anggaran" description="Buat anggaran agar pengeluaran lebih terkontrol." /> : monthBudgets.map((budget) => {
          const usage = getBudgetUsage(budget, monthTransactions);
          const category = categories.find((cat) => cat.id === budget.categoryId);
          return <div className="budget-row" key={budget.id}><div className="row-between"><div><h3>{category?.name}</h3><p className="item-sub">Sisa {formatRupiah(usage.remaining)}</p></div><StatusPill status={usage.status} /></div><ProgressBar value={usage.percentage} variant={usage.status === 'Aman' ? 'green' : usage.status === 'Mendekati' ? 'amber' : 'red'} /><div className="row-between tiny muted"><span>{formatRupiah(usage.used)}</span><span>{usage.percentage}%</span></div><button className="link-btn tiny" onClick={async () => { try { await deleteBudget(budget.id); } catch (error) { notify(error.message); } }}>Hapus anggaran</button></div>;
        })}
      </Card>
    </div>
  );
}
