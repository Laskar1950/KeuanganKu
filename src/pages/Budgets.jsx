import React, { useMemo, useState } from 'react';
import { CalendarDays, Plus, Target, Trash2, Wallet } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import { Card, EmptyState, ProgressBar, StatusPill } from '../components/UI.jsx';
import { currentMonthYear, formatRupiah, monthLabel } from '../utils/format.js';
import { getBudgetUsage, getMonthTransactions } from '../utils/calculations.js';

export default function Budgets() {
  const { budgets, accountBalances, transactions, addBudget, deleteBudget, notify } = useApp();
  const { month, year } = currentMonthYear();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', amount: '', accountId: '', note: '' });

  const activeAccounts = accountBalances.filter((account) => account.isActive);
  const monthTransactions = useMemo(() => getMonthTransactions(transactions, month, year), [transactions, month, year]);
  const monthBudgets = useMemo(
    () => budgets.filter((budget) => budget.month === month && budget.year === year),
    [budgets, month, year]
  );
  const budgetUsages = monthBudgets.map((budget) => ({ budget, usage: getBudgetUsage(budget, monthTransactions) }));
  const totalBudget = monthBudgets.reduce((total, budget) => total + Number(budget.amount || 0), 0);
  const totalUsed = budgetUsages.reduce((total, item) => total + Number(item.usage.used || 0), 0);
  const totalRemaining = totalBudget - totalUsed;

  const submit = async (event) => {
    event.preventDefault();
    try {
      await addBudget({ ...form, month, year });
      setForm({ name: '', amount: '', accountId: '', note: '' });
      setShowForm(false);
    } catch (error) {
      notify(error.message);
    }
  };

  return (
    <div className="page playful-budget-page">
      <header className="header playful-page-header">
        <div>
          <p className="eyebrow">Kontrol pengeluaran</p>
          <h1>Alokasi Anggaran</h1>
        </div>
        <button className="icon-btn playful-icon-btn" onClick={() => setShowForm(!showForm)} type="button" aria-label="Tambah alokasi">
          <Plus size={18} />
        </button>
      </header>

      <section className="playful-budget-hero">
        <div className="row-between">
          <div>
            <span>Sisa alokasi {monthLabel(month, year)}</span>
            <strong>{formatRupiah(totalRemaining)}</strong>
          </div>
          <CalendarDays size={20} />
        </div>
        <div className="playful-budget-hero-grid">
          <div><span>Total alokasi</span><b>{formatRupiah(totalBudget)}</b></div>
          <div><span>Terpakai</span><b>{formatRupiah(totalUsed)}</b></div>
        </div>
      </section>

      {showForm && (
        <Card className="playful-form-card">
          <div className="row-between">
            <div>
              <p className="section-kicker">Tambah alokasi</p>
              <h2>Buat anggaran bulan ini</h2>
            </div>
            <span className="role-pill owner">Owner</span>
          </div>
          <form className="form-grid allocation-form" onSubmit={submit}>
            <div className="field">
              <label>Nama Alokasi</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Contoh: Belanja Dapur" />
            </div>
            <div className="field">
              <label>Nominal Alokasi</label>
              <input type="number" min="1" inputMode="numeric" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="Contoh: 1000000" />
            </div>
            <div className="field">
              <label>Sumber Anggaran / Dompet</label>
              <select value={form.accountId} onChange={(e) => setForm({ ...form, accountId: e.target.value })}>
                <option value="">Pilih dompet sumber</option>
                {activeAccounts.map((account) => <option value={account.id} key={account.id}>{account.name} • Saldo {formatRupiah(account.currentBalance)}</option>)}
              </select>
              <p className="budget-hint">Saat pengeluaran memakai alokasi ini, saldo dompet sumber akan otomatis berkurang.</p>
            </div>
            <div className="field">
              <label>Keterangan</label>
              <textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Opsional, contoh: kebutuhan dapur bulanan" />
            </div>
            <button className="primary-btn playful-primary-btn" type="submit">Simpan Alokasi</button>
          </form>
        </Card>
      )}

      <Card className="budget-allocation-card playful-budget-list-card">
        <div className="row-between" style={{ marginBottom: 14 }}>
          <div>
            <p className="section-kicker">Daftar alokasi</p>
            <h2>{monthBudgets.length} alokasi aktif</h2>
          </div>
          <Target size={18} className="muted" />
        </div>

        {monthBudgets.length === 0 ? (
          <EmptyState emoji="🎯" title="Belum ada alokasi" description="Buat alokasi dengan nama, nominal, dan sumber dompet agar pengeluaran bisa langsung mengurangi budget yang sesuai." />
        ) : budgetUsages.map(({ budget, usage }) => {
          const account = accountBalances.find((item) => item.id === budget.accountId);
          return (
            <div className="budget-row allocation-row playful-budget-row" key={budget.id}>
              <div className="budget-row-header">
                <div>
                  <h3>{budget.name}</h3>
                  <p className="item-sub">Sumber {account?.name || 'Dompet tidak ditemukan'} • Terpakai {formatRupiah(usage.used)} dari {formatRupiah(budget.amount)}</p>
                  {budget.note && <p className="item-sub">{budget.note}</p>}
                </div>
                <StatusPill status={usage.status} />
              </div>
              <ProgressBar value={usage.percentage} variant={usage.status === 'Aman' ? 'green' : usage.status === 'Mendekati' ? 'amber' : 'red'} />
              <div className="row-between tiny muted">
                <span className="budget-remaining">Sisa {formatRupiah(usage.remaining)}</span>
                <span>{usage.percentage}%</span>
              </div>
              <button className="link-btn tiny playful-delete-link" onClick={async () => { try { await deleteBudget(budget.id); } catch (error) { notify(error.message); } }} type="button">
                <Trash2 size={12} /> Hapus alokasi
              </button>
            </div>
          );
        })}
      </Card>

      <Card className="playful-section-card allocation-explain-card">
        <div className="row-between">
          <div>
            <p className="section-kicker">Alur pengeluaran</p>
            <h2>Kategori pengeluaran diganti oleh alokasi</h2>
          </div>
          <Wallet size={18} className="muted" />
        </div>
        <p className="muted tiny" style={{ lineHeight: 1.6, marginBottom: 0 }}>
          Untuk transaksi pengeluaran, user cukup memilih alokasi anggaran. Aplikasi akan memakai sumber dompet dari alokasi tersebut dan menghitung sisa alokasi secara otomatis.
        </p>
      </Card>
    </div>
  );
}
