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
  const monthBudgets = useMemo(
    () => budgets.filter((budget) => budget.month === month && budget.year === year),
    [budgets, month, year]
  );
  const expenseCategories = categories.filter((cat) => cat.type === 'expense');
  const availableCategories = expenseCategories.filter((category) => !monthBudgets.some((budget) => budget.categoryId === category.id));
  const budgetUsages = monthBudgets.map((budget) => ({ budget, usage: getBudgetUsage(budget, monthTransactions) }));
  const totalBudget = monthBudgets.reduce((total, budget) => total + Number(budget.amount || 0), 0);
  const totalUsed = budgetUsages.reduce((total, item) => total + Number(item.usage.used || 0), 0);
  const totalRemaining = totalBudget - totalUsed;

  const submit = async (event) => {
    event.preventDefault();
    try {
      await addBudget({ ...form, month, year });
      setForm({ categoryId: '', amount: '' });
      setShowForm(false);
    } catch (error) {
      notify(error.message);
    }
  };

  return (
    <div className="page budget-allocation-page">
      <header className="header">
        <div>
          <p className="eyebrow">Kontrol pengeluaran</p>
          <h1>Alokasi Anggaran</h1>
        </div>
        <button className="small-btn" onClick={() => setShowForm(!showForm)}>+ Baru</button>
      </header>

      <Card className="budget-allocation-card">
        <div className="row-between" style={{ marginBottom: 14 }}>
          <div>
            <p className="section-kicker">Bulan berjalan</p>
            <h2>{monthLabel(month, year)}</h2>
          </div>
          <CalendarDays size={18} className="muted" />
        </div>

        <div className="allocation-summary-grid">
          <div className="allocation-stat"><span>Total alokasi</span><strong>{formatRupiah(totalBudget)}</strong></div>
          <div className="allocation-stat"><span>Terpakai</span><strong>{formatRupiah(totalUsed)}</strong></div>
          <div className="allocation-stat"><span>Sisa</span><strong>{formatRupiah(totalRemaining)}</strong></div>
        </div>

        {showForm && (
          <form className="form-grid allocation-form" onSubmit={submit}>
            <div className="field">
              <label>Kategori Pengeluaran</label>
              <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
                <option value="">Pilih kategori</option>
                {availableCategories.map((cat) => <option value={cat.id} key={cat.id}>{cat.name}</option>)}
              </select>
              {availableCategories.length === 0 && <p className="budget-hint">Semua kategori pengeluaran sudah memiliki alokasi untuk bulan ini.</p>}
            </div>
            <div className="field">
              <label>Nominal Alokasi</label>
              <input type="number" min="1" inputMode="numeric" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="Contoh: 1000000" />
            </div>
            <button className="primary-btn">Simpan Alokasi</button>
          </form>
        )}

        {monthBudgets.length === 0 ? (
          <EmptyState emoji="🎯" title="Belum ada alokasi" description="Buat alokasi agar setiap pengeluaran bisa langsung mengambil sisa anggaran yang sesuai." />
        ) : budgetUsages.map(({ budget, usage }) => {
          const category = categories.find((cat) => cat.id === budget.categoryId);
          return (
            <div className="budget-row allocation-row" key={budget.id}>
              <div className="budget-row-header">
                <div>
                  <h3>{category?.name}</h3>
                  <p className="item-sub">Terpakai {formatRupiah(usage.used)} dari {formatRupiah(budget.amount)}</p>
                </div>
                <StatusPill status={usage.status} />
              </div>
              <ProgressBar value={usage.percentage} variant={usage.status === 'Aman' ? 'green' : usage.status === 'Mendekati' ? 'amber' : 'red'} />
              <div className="row-between tiny muted">
                <span className="budget-remaining">Sisa {formatRupiah(usage.remaining)}</span>
                <span>{usage.percentage}%</span>
              </div>
              <button className="link-btn tiny" onClick={async () => { try { await deleteBudget(budget.id); } catch (error) { notify(error.message); } }}>Hapus alokasi</button>
            </div>
          );
        })}
      </Card>
    </div>
  );
}
