import React, { useMemo, useState } from 'react';
import { CalendarDays, ChevronDown, Edit3, PiggyBank, Plus, Trash2, Wallet, X } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import { Card, ProgressBar } from '../components/UI.jsx';
import { formatRupiah } from '../utils/format.js';
import { getBudgetUsage } from '../utils/calculations.js';
import {
  formatBudgetCycleLabel,
  formatBudgetCycleRange,
  getBudgetCycleTransactions,
  getCurrentBudgetCycle,
} from '../utils/budgetCycle.js';
import FinanceDetailModal from '../components/FinanceDetailModal.jsx';

const createEmptyBudgetForm = (cycle = getCurrentBudgetCycle()) => ({
  name: '',
  amount: '',
  accountId: '',
  month: Number(cycle.month),
  year: Number(cycle.year),
  note: '',
});

function getProgressTone(progressRaw, isOverBudget = false) {
  if (isOverBudget || progressRaw >= 100) return 'red';
  if (progressRaw >= 75) return 'amber';
  return 'green';
}

function getUsageMeta(budget, transactions) {
  const usage = getBudgetUsage(budget, transactions);
  const progressRaw = Number(budget.amount || 0) > 0 ? Math.round((Number(usage.used || 0) / Number(budget.amount || 0)) * 100) : 0;
  const overBudgetAmount = Math.max(0, Math.abs(Math.min(Number(usage.remaining || 0), 0)));

  return {
    usage,
    progressRaw,
    progress: Math.min(100, progressRaw),
    overBudget: overBudgetAmount > 0,
    overBudgetAmount,
    tone: getProgressTone(progressRaw, overBudgetAmount > 0),
  };
}

export default function Budgets() {
  const {
    budgets,
    transactions,
    accountBalances,
    currentMember,
    addBudget,
    updateBudget,
    deleteBudget: deleteBudgetFromContext,
    notify,
  } = useApp();

  const initialCycle = useMemo(() => getCurrentBudgetCycle(), []);
  const [selectedCycle, setSelectedCycle] = useState(initialCycle);
  const [form, setForm] = useState(() => createEmptyBudgetForm(initialCycle));
  const [formOpen, setFormOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);
  const [detailBudget, setDetailBudget] = useState(null);

  const canManageBudget = ['owner', 'admin'].includes(currentMember?.role);
  const cycleRange = formatBudgetCycleRange(selectedCycle.month, selectedCycle.year);
  const cycleTransactions = useMemo(
    () => getBudgetCycleTransactions(transactions, selectedCycle.month, selectedCycle.year),
    [transactions, selectedCycle.month, selectedCycle.year]
  );

  const filteredBudgets = useMemo(
    () => budgets
      .filter((budget) => Number(budget.month) === Number(selectedCycle.month) && Number(budget.year) === Number(selectedCycle.year))
      .sort((a, b) => a.name.localeCompare(b.name, 'id')),
    [budgets, selectedCycle.month, selectedCycle.year]
  );

  const totals = filteredBudgets.reduce((acc, budget) => {
    const { usage, overBudgetAmount } = getUsageMeta(budget, cycleTransactions);
    acc.total += Number(budget.amount || 0);
    acc.used += Number(usage.used || 0);
    acc.remaining += Number(usage.remaining || 0);
    acc.overBudget += overBudgetAmount;
    return acc;
  }, { total: 0, used: 0, remaining: 0, overBudget: 0 });

  const totalProgressRaw = totals.total > 0 ? Math.round((totals.used / totals.total) * 100) : 0;
  const totalProgress = Math.min(100, totalProgressRaw);
  const totalTone = getProgressTone(totalProgressRaw, totals.overBudget > 0);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const openCreateForm = () => {
    setEditingBudget(null);
    setForm(createEmptyBudgetForm(selectedCycle));
    setFormOpen(true);
  };

  const closeForm = () => {
    setEditingBudget(null);
    setForm(createEmptyBudgetForm(selectedCycle));
    setFormOpen(false);
  };

  const changeCycle = (key, value) => {
    const next = { ...selectedCycle, [key]: Number(value) };
    setSelectedCycle(next);
    if (!editingBudget) setForm((prev) => ({ ...prev, [key]: Number(value) }));
  };

  const submitBudget = async (event) => {
    event.preventDefault();
    try {
      if (!canManageBudget) throw new Error('Hanya owner atau admin yang bisa mengelola alokasi.');
      if (!form.name.trim()) throw new Error('Nama alokasi wajib diisi.');
      if (!form.accountId) throw new Error('Sumber dompet wajib dipilih.');
      if (Number(form.amount || 0) <= 0) throw new Error('Nominal alokasi harus lebih dari 0.');

      const payload = {
        name: form.name.trim(),
        amount: Number(form.amount || 0),
        accountId: form.accountId,
        month: Number(form.month),
        year: Number(form.year),
        note: form.note?.trim() || '',
      };

      if (editingBudget) {
        const confirmed = window.confirm(`Simpan perubahan alokasi "${editingBudget.name}"?`);
        if (!confirmed) return;
        await updateBudget?.(editingBudget.id, payload);
      } else {
        await addBudget(payload);
      }

      setSelectedCycle({ month: Number(payload.month), year: Number(payload.year) });
      closeForm();
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
    setFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const removeBudget = async (budget, event) => {
    event?.stopPropagation();
    try {
      if (!canManageBudget) throw new Error('Hanya owner atau admin yang bisa menghapus alokasi.');
      const { usage } = getUsageMeta(budget, cycleTransactions);
      const message = usage.used > 0
        ? `Alokasi "${budget.name}" sudah memiliki pengeluaran ${formatRupiah(usage.used)}. Tetap hapus?`
        : `Hapus alokasi "${budget.name}"?`;
      const confirmed = window.confirm(message);
      if (!confirmed) return;

      await deleteBudgetFromContext?.(budget.id);
      if (editingBudget?.id === budget.id) closeForm();
    } catch (error) {
      notify(error.message || 'Alokasi gagal dihapus. Jika sudah dipakai transaksi, hapus transaksi terkait lebih dulu atau ubah menjadi fitur arsip.');
    }
  };

  return (
    <div className="page budget-page salary-budget-page">
      <header className="salary-budget-hero">
        <div>
          <p className="eyebrow">Alokasi Anggaran</p>
          <h1>Budget keluarga</h1>
          <small>Budget otomatis mengikuti siklus gajian: reset setiap tanggal 25.</small>
        </div>
        {canManageBudget && (
          <button className="salary-budget-add-btn" type="button" onClick={openCreateForm}>
            <Plus size={18} /> Tambah
          </button>
        )}
      </header>

      <section className="salary-cycle-panel">
        <div className="salary-cycle-top">
          <div>
            <p className="section-kicker">Periode aktif</p>
            <h2>{formatBudgetCycleLabel(selectedCycle.month, selectedCycle.year)}</h2>
            <small>{cycleRange}</small>
          </div>
          <div className="salary-cycle-selectors">
            <label>
              <span>Bulan</span>
              <select value={selectedCycle.month} onChange={(event) => changeCycle('month', event.target.value)}>
                {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => (
                  <option key={month} value={month}>{String(month).padStart(2, '0')}</option>
                ))}
              </select>
              <ChevronDown size={16} />
            </label>
            <label>
              <span>Tahun</span>
              <input type="number" value={selectedCycle.year} onChange={(event) => changeCycle('year', event.target.value)} />
            </label>
          </div>
        </div>

        <div className="salary-budget-stat-grid">
          <div>
            <span>Total alokasi</span>
            <strong>{formatRupiah(totals.total)}</strong>
          </div>
          <div>
            <span>Terpakai</span>
            <strong>{formatRupiah(totals.used)}</strong>
          </div>
          <div className={totals.remaining < 0 ? 'danger' : ''}>
            <span>Sisa bersih</span>
            <strong>{formatRupiah(totals.remaining)}</strong>
          </div>
          <div className={totals.overBudget > 0 ? 'danger' : ''}>
            <span>Over budget</span>
            <strong>{formatRupiah(totals.overBudget)}</strong>
          </div>
        </div>
        <div className="salary-progress-wrap">
          <ProgressBar value={totalProgress} variant={totalTone} />
          <small>{totalProgressRaw}% terpakai · {totals.overBudget > 0 ? 'ada alokasi melewati budget' : 'masih dalam batas alokasi'}</small>
        </div>
      </section>

      {canManageBudget && formOpen && (
        <Card className="salary-budget-form-card">
          <div className="salary-form-header">
            <div>
              <p className="section-kicker">{editingBudget ? 'Edit alokasi' : 'Alokasi baru'}</p>
              <h2>{editingBudget ? editingBudget.name : 'Tambah alokasi'}</h2>
              <small>Periode form: {formatBudgetCycleRange(form.month, form.year)}</small>
            </div>
            <button className="icon-btn" type="button" onClick={closeForm} aria-label="Tutup form alokasi">
              <X size={18} />
            </button>
          </div>

          <form className="salary-budget-form" onSubmit={submitBudget}>
            <div className="field">
              <label>Nama alokasi</label>
              <input value={form.name} onChange={(event) => setField('name', event.target.value)} placeholder="Contoh: Belanja rumah" />
            </div>

            <div className="salary-form-grid-2">
              <div className="field">
                <label>Nominal</label>
                <input type="number" min="1" value={form.amount} onChange={(event) => setField('amount', event.target.value)} placeholder="Contoh: 1000000" />
              </div>
              <div className="field">
                <label>Sumber dompet</label>
                <select value={form.accountId} onChange={(event) => setField('accountId', event.target.value)}>
                  <option value="">Pilih dompet</option>
                  {accountBalances.filter((account) => account.isActive !== false).map((account) => (
                    <option value={account.id} key={account.id}>{account.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="salary-form-grid-2">
              <div className="field">
                <label>Bulan periode</label>
                <select value={form.month} onChange={(event) => setField('month', Number(event.target.value))}>
                  {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => (
                    <option key={month} value={month}>{String(month).padStart(2, '0')}</option>
                  ))}
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

            <div className="salary-form-actions">
              <button className="secondary-btn" type="button" onClick={closeForm}>Batal</button>
              <button className="primary-btn" type="submit">{editingBudget ? 'Simpan Perubahan' : 'Simpan Alokasi'}</button>
            </div>
          </form>
        </Card>
      )}

      <section className="salary-budget-list-section">
        <div className="section-heading-row">
          <div>
            <p className="section-kicker">Daftar Alokasi</p>
            <h2>{filteredBudgets.length} alokasi</h2>
          </div>
          <small>Klik card untuk melihat transaksi periode ini.</small>
        </div>

        <div className="salary-budget-card-list">
          {filteredBudgets.length ? filteredBudgets.map((budget) => {
            const account = accountBalances.find((item) => item.id === budget.accountId);
            const meta = getUsageMeta(budget, cycleTransactions);

            return (
              <article
                className={`salary-budget-card ${meta.overBudget ? 'over-budget' : ''}`}
                role="button"
                tabIndex={0}
                key={budget.id}
                onClick={() => setDetailBudget(budget)}
                onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') setDetailBudget(budget); }}
              >
                <div className="salary-budget-card-head">
                  <span className="salary-budget-icon"><PiggyBank size={18} /></span>
                  <div>
                    <strong>{budget.name}</strong>
                    <small><Wallet size={12} /> {account?.name || 'Dompet tidak ditemukan'}</small>
                  </div>
                </div>

                {budget.note ? <p className="salary-budget-note">{budget.note}</p> : null}

                <div className="salary-budget-card-metrics">
                  <span><small>Total</small><strong>{formatRupiah(budget.amount)}</strong></span>
                  <span><small>Terpakai</small><strong>{formatRupiah(meta.usage.used)}</strong></span>
                  <span className={meta.overBudget ? 'danger' : ''}><small>{meta.overBudget ? 'Over' : 'Sisa'}</small><strong>{meta.overBudget ? formatRupiah(meta.overBudgetAmount) : formatRupiah(meta.usage.remaining)}</strong></span>
                </div>

                <div className="salary-budget-card-progress">
                  <ProgressBar value={meta.progress} variant={meta.tone} />
                  <small>{meta.progressRaw}% terpakai</small>
                </div>

                <div className="salary-budget-card-footer">
                  <small><CalendarDays size={12} /> {formatBudgetCycleRange(budget.month, budget.year)}</small>
                  {canManageBudget && (
                    <span className="budget-card-actions">
                      <button className="action-btn edit" type="button" onClick={(event) => startEditBudget(budget, event)}><Edit3 size={13} /> Edit</button>
                      <button className="action-btn danger" type="button" onClick={(event) => removeBudget(budget, event)}><Trash2 size={13} /> Hapus</button>
                    </span>
                  )}
                </div>
              </article>
            );
          }) : (
            <Card className="empty-soft-card">Belum ada alokasi pada periode ini. Klik tombol Tambah untuk membuat alokasi pertama.</Card>
          )}
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
