import React, { useMemo, useState } from 'react';
import { CalendarDays, Edit3, PiggyBank, Plus, Trash2, Wallet, X } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import { Card, ProgressBar } from '../components/UI.jsx';
import { supabase } from '../lib/supabaseClient.js';
import { formatRupiah } from '../utils/format.js';
import { getBudgetUsage, getMonthTransactions } from '../utils/calculations.js';
import FinanceDetailModal from '../components/FinanceDetailModal.jsx';

const currentMonth = () => new Date().getMonth() + 1;
const currentYear = () => new Date().getFullYear();
const emptyBudgetForm = () => ({
  name: '',
  amount: '',
  accountId: '',
  month: currentMonth(),
  year: currentYear(),
  note: '',
});

function toDbPayload(form) {
  return {
    name: form.name.trim(),
    amount: Number(form.amount || 0),
    account_id: form.accountId,
    month: Number(form.month),
    year: Number(form.year),
    note: form.note?.trim() || null,
  };
}

export default function Budgets() {
  const {
    budgets,
    transactions,
    accountBalances,
    currentMember,
    addBudget,
    notify,
    refreshData,
  } = useApp();

  const [form, setForm] = useState(emptyBudgetForm);
  const [editingBudget, setEditingBudget] = useState(null);
  const [selectedCycle, setSelectedCycle] = useState({ month: currentMonth(), year: currentYear() });
  const [detailBudget, setDetailBudget] = useState(null);

  const canManageBudget = ['owner', 'admin'].includes(currentMember?.role);
  const monthTransactions = useMemo(
    () => getMonthTransactions(transactions, selectedCycle.month, selectedCycle.year),
    [selectedCycle.month, selectedCycle.year, transactions]
  );
  const filteredBudgets = useMemo(
    () => budgets
      .filter((budget) => Number(budget.month) === Number(selectedCycle.month) && Number(budget.year) === Number(selectedCycle.year))
      .sort((a, b) => a.name.localeCompare(b.name, 'id')),
    [budgets, selectedCycle.month, selectedCycle.year]
  );

  const totals = filteredBudgets.reduce((acc, budget) => {
    const usage = getBudgetUsage(budget, monthTransactions);
    acc.total += Number(budget.amount || 0);
    acc.used += Number(usage.used || 0);
    acc.remaining += Number(usage.remaining || 0);
    acc.overBudget += Math.max(0, Math.abs(Math.min(usage.remaining, 0)));
    return acc;
  }, { total: 0, used: 0, remaining: 0, overBudget: 0 });
  const totalProgressRaw = totals.total > 0 ? Math.round((totals.used / totals.total) * 100) : 0;
  const totalProgress = Math.min(100, totalProgressRaw);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const resetForm = () => {
    setEditingBudget(null);
    setForm({ ...emptyBudgetForm(), month: selectedCycle.month, year: selectedCycle.year });
  };

  const submitBudget = async (event) => {
    event.preventDefault();
    try {
      if (!canManageBudget) throw new Error('Hanya owner atau admin yang bisa mengelola alokasi.');
      if (!form.name.trim()) throw new Error('Nama alokasi wajib diisi.');
      if (!form.accountId) throw new Error('Sumber dompet wajib dipilih.');
      if (Number(form.amount || 0) <= 0) throw new Error('Nominal alokasi harus lebih dari 0.');

      if (editingBudget) {
        const confirmed = window.confirm(`Simpan perubahan alokasi "${editingBudget.name}"?`);
        if (!confirmed) return;
        const { error } = await supabase.from('budgets').update(toDbPayload(form)).eq('id', editingBudget.id);
        if (error) throw error;
        notify('Alokasi berhasil diperbarui.');
      } else {
        await addBudget({
          name: form.name,
          amount: Number(form.amount || 0),
          accountId: form.accountId,
          month: Number(form.month),
          year: Number(form.year),
          note: form.note,
        });
      }

      setSelectedCycle({ month: Number(form.month), year: Number(form.year) });
      resetForm();
      await refreshData?.();
    } catch (error) {
      notify(error.message);
    }
  };

  const startEditBudget = (budget, event) => {
    event?.stopPropagation();
    const confirmed = window.confirm(`Edit alokasi "${budget.name}"?`);
    if (!confirmed) return;
    setEditingBudget(budget);
    setForm({
      name: budget.name || '',
      amount: String(budget.amount || ''),
      accountId: budget.accountId || '',
      month: Number(budget.month),
      year: Number(budget.year),
      note: budget.note || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteBudget = async (budget, event) => {
    event?.stopPropagation();
    try {
      if (!canManageBudget) throw new Error('Hanya owner atau admin yang bisa menghapus alokasi.');
      const usage = getBudgetUsage(budget, monthTransactions);
      const message = usage.used > 0
        ? `Alokasi "${budget.name}" sudah memiliki pengeluaran ${formatRupiah(usage.used)}. Jika database menolak hapus, gunakan opsi arsip pada pengembangan berikutnya. Tetap hapus?`
        : `Hapus alokasi "${budget.name}"?`;
      const confirmed = window.confirm(message);
      if (!confirmed) return;

      const { error } = await supabase.from('budgets').delete().eq('id', budget.id);
      if (error) throw error;
      notify('Alokasi berhasil dihapus.');
      if (editingBudget?.id === budget.id) resetForm();
      await refreshData?.();
    } catch (error) {
      notify(error.message || 'Alokasi gagal dihapus. Jika sudah dipakai transaksi, hapus transaksi terkait lebih dulu atau ubah menjadi fitur arsip.');
    }
  };

  const changeCycle = (key, value) => {
    const next = { ...selectedCycle, [key]: Number(value) };
    setSelectedCycle(next);
    if (!editingBudget) setForm((prev) => ({ ...prev, [key]: Number(value) }));
  };

  return (
    <div className="page budget-page budget-card-page">
      <header className="header playful-page-header">
        <div>
          <p className="eyebrow">Alokasi Anggaran</p>
          <h1>Budget keluarga</h1>
          <small>Kelola alokasi per bulan dan pantau pemakaiannya.</small>
        </div>
      </header>

      <Card className="budget-cycle-card">
        <div className="budget-cycle-row">
          <div>
            <p className="section-kicker">Periode</p>
            <h2>{String(selectedCycle.month).padStart(2, '0')}/{selectedCycle.year}</h2>
          </div>
          <div className="budget-cycle-fields">
            <label>
              <span>Bulan</span>
              <select value={selectedCycle.month} onChange={(event) => changeCycle('month', event.target.value)}>
                {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => <option key={month} value={month}>{String(month).padStart(2, '0')}</option>)}
              </select>
            </label>
            <label>
              <span>Tahun</span>
              <input type="number" value={selectedCycle.year} onChange={(event) => changeCycle('year', event.target.value)} />
            </label>
          </div>
        </div>
        <div className="budget-total-row">
          <div><small>Total alokasi</small><strong>{formatRupiah(totals.total)}</strong></div>
          <div><small>Terpakai</small><strong>{formatRupiah(totals.used)}</strong></div>
          <div><small>Sisa bersih</small><strong>{formatRupiah(totals.remaining)}</strong></div>
          <div><small>Over budget</small><strong className={totals.overBudget > 0 ? 'danger-text' : ''}>{formatRupiah(totals.overBudget)}</strong></div>
        </div>
        <ProgressBar value={totalProgress} variant="orange" />
        {totals.overBudget > 0 ? <p className="over-budget-insight">Ada pemakaian melebihi alokasi sebesar {formatRupiah(totals.overBudget)}. Pengeluaran tetap valid selama saldo dompet sumber mencukupi.</p> : null}
      </Card>

      {canManageBudget && (
        <Card className="budget-form-card">
          <div className="row-between">
            <div>
              <p className="section-kicker">{editingBudget ? 'Edit alokasi' : 'Alokasi baru'}</p>
              <h2>{editingBudget ? editingBudget.name : 'Tambah alokasi anggaran'}</h2>
            </div>
            {editingBudget && <button className="small-btn" type="button" onClick={resetForm}><X size={14} /> Batal edit</button>}
          </div>
          <form className="form-grid" onSubmit={submitBudget}>
            <div className="field">
              <label>Nama alokasi</label>
              <input value={form.name} onChange={(event) => setField('name', event.target.value)} placeholder="Contoh: Belanja bulanan" />
            </div>
            <div className="grid-2">
              <div className="field">
                <label>Nominal</label>
                <input type="number" min="1" value={form.amount} onChange={(event) => setField('amount', event.target.value)} placeholder="Contoh: 1000000" />
              </div>
              <div className="field">
                <label>Sumber dompet</label>
                <select value={form.accountId} onChange={(event) => setField('accountId', event.target.value)}>
                  <option value="">Pilih dompet</option>
                  {accountBalances.filter((account) => account.isActive !== false).map((account) => <option value={account.id} key={account.id}>{account.name}</option>)}
                </select>
              </div>
            </div>
            <div className="grid-2">
              <div className="field">
                <label>Bulan</label>
                <select value={form.month} onChange={(event) => setField('month', Number(event.target.value))}>
                  {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => <option key={month} value={month}>{String(month).padStart(2, '0')}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Tahun</label>
                <input type="number" value={form.year} onChange={(event) => setField('year', Number(event.target.value))} />
              </div>
            </div>
            <div className="field">
              <label>Keterangan</label>
              <textarea value={form.note} onChange={(event) => setField('note', event.target.value)} placeholder="Opsional" />
            </div>
            <button className="primary-btn" type="submit">{editingBudget ? 'Simpan Perubahan' : 'Tambah Alokasi'}</button>
          </form>
        </Card>
      )}

      <section className="budget-list-section">
        <div className="section-heading-row">
          <div>
            <p className="section-kicker">Daftar Alokasi</p>
            <h2>{filteredBudgets.length} alokasi</h2>
          </div>
          <small>Klik card untuk melihat detail transaksi.</small>
        </div>

        <div className="budget-card-list">
          {filteredBudgets.length ? filteredBudgets.map((budget) => {
            const account = accountBalances.find((item) => item.id === budget.accountId);
            const usage = getBudgetUsage(budget, monthTransactions);
            const progressRaw = budget.amount > 0 ? Math.round((usage.used / budget.amount) * 100) : 0;
            const progress = Math.min(100, progressRaw);
            const overBudget = Number(usage.remaining || 0) < 0;
            return (
              <div className={`budget-management-card ${overBudget ? 'over-budget' : ''}`} role="button" tabIndex={0} key={budget.id} onClick={() => setDetailBudget(budget)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') setDetailBudget(budget); }}>
                <span className="budget-card-topline">
                  <span className="budget-card-icon"><PiggyBank size={18} /></span>
                  <span>
                    <strong>{budget.name}</strong>
                    <small><Wallet size={12} /> {account?.name || 'Dompet tidak ditemukan'}</small>
                  </span>
                </span>
                {budget.note ? <p className="budget-card-note">{budget.note}</p> : null}
                <span className="budget-card-amount-grid">
                  <span><small>Total</small><strong>{formatRupiah(budget.amount)}</strong></span>
                  <span><small>Terpakai</small><strong>{formatRupiah(usage.used)}</strong></span>
                  <span><small>{overBudget ? 'Over budget' : 'Sisa'}</small><strong className={overBudget ? 'danger-text' : ''}>{overBudget ? formatRupiah(Math.abs(usage.remaining)) : formatRupiah(usage.remaining)}</strong></span>
                </span>
                <ProgressBar value={progress} variant="orange" />
                {overBudget ? <span className="budget-over-pill">Over budget {formatRupiah(Math.abs(usage.remaining))}</span> : null}
                <span className="budget-card-footer">
                  <small><CalendarDays size={12} /> {String(budget.month).padStart(2, '0')}/{budget.year}</small>
                  {canManageBudget && (
                    <span className="budget-card-actions">
                      <button className="action-btn edit" type="button" onClick={(event) => startEditBudget(budget, event)}><Edit3 size={13} /> Edit</button>
                      <button className="action-btn danger" type="button" onClick={(event) => deleteBudget(budget, event)}><Trash2 size={13} /> Hapus</button>
                    </span>
                  )}
                </span>
              </div>
            );
          }) : <Card className="empty-soft-card">Belum ada alokasi pada periode ini.</Card>}
        </div>
      </section>

      <FinanceDetailModal
        open={Boolean(detailBudget)}
        type="budget"
        item={detailBudget}
        transactions={transactions}
        budgets={budgets}
        accountBalances={accountBalances}
        onClose={() => setDetailBudget(null)}
      />
    </div>
  );
}
