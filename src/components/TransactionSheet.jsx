import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, PlusCircle, Search, Wallet, X } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import { formatRupiah } from '../utils/format.js';
import { getBudgetUsage } from '../utils/calculations.js';
import { getBudgetCycle, getBudgetCycleTransactions, formatBudgetCycleRange } from '../utils/budgetCycle.js';

const today = () => new Date().toISOString().slice(0, 10);


const emptyForm = () => ({
  type: 'expense',
  amount: '',
  categoryId: '',
  budgetId: '',
  accountId: '',
  transactionDate: today(),
  note: '',
});

function normalizeText(value = '') {
  return String(value).toLowerCase().trim();
}

function AllocationPickerModal({
  open,
  budgets,
  transactions,
  accountBalances,
  selectedBudgetId,
  selectedTransactionId,
  onSelect,
  onClose,
  search,
  setSearch,
  cycle,
}) {
  const filteredBudgets = useMemo(() => {
    const keyword = normalizeText(search);
    if (!keyword) return budgets;

    return budgets.filter((budget) => {
      const account = accountBalances.find((item) => item.id === budget.accountId);
      return [budget.name, budget.note, account?.name]
        .some((value) => normalizeText(value).includes(keyword));
    });
  }, [accountBalances, budgets, search]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="allocation-picker-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.section
            className="allocation-picker-sheet"
            initial={{ y: 420, opacity: 0.98 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 420, opacity: 0.98 }}
            transition={{ type: 'spring', stiffness: 260, damping: 30 }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="allocation-picker-header">
              <div>
                <p className="section-kicker">Pilih alokasi</p>
                <h3>Periode gajian {String(cycle.month || '').padStart(2, '0')}/{cycle.year || '-'}</h3>
                <small>{formatBudgetCycleRange(cycle.month, cycle.year)} · {budgets.length} alokasi tersedia.</small>
              </div>
              <button type="button" className="icon-btn" onClick={onClose} aria-label="Tutup pilihan alokasi">
                <X size={18} />
              </button>
            </div>

            <label className="allocation-search-box">
              <Search size={17} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari nama alokasi atau dompet..."
                autoFocus
              />
            </label>

            <div className="allocation-picker-list">
              {filteredBudgets.length ? filteredBudgets.map((budget) => {
                const account = accountBalances.find((item) => item.id === budget.accountId);
                const usage = getBudgetUsage(
                  budget,
                  transactions.filter((trx) => trx.id !== selectedTransactionId)
                );
                const progress = budget.amount > 0 ? Math.min(100, Math.round((usage.used / budget.amount) * 100)) : 0;
                const isSelected = selectedBudgetId === budget.id;

                return (
                  <button
                    type="button"
                    className={`allocation-option-card ${isSelected ? 'selected' : ''}`}
                    key={budget.id}
                    onClick={() => onSelect(budget.id)}
                  >
                    <span className="allocation-option-check">
                      {isSelected ? <Check size={16} /> : null}
                    </span>
                    <span className="allocation-option-main">
                      <strong>{budget.name}</strong>
                      <span className="allocation-option-meta">
                        <Wallet size={14} /> {account?.name || 'Dompet tidak ditemukan'}
                      </span>
                      {budget.note ? <small>{budget.note}</small> : null}
                      <span className="allocation-option-progress"><i style={{ width: `${progress}%` }} /></span>
                    </span>
                    <span className="allocation-option-amounts">
                      <em>Sisa</em>
                      <strong className={usage.remaining <= 0 ? 'danger' : ''}>{formatRupiah(usage.remaining)}</strong>
                      <small>Dipakai {formatRupiah(usage.used)} dari {formatRupiah(budget.amount)}</small>
                    </span>
                  </button>
                );
              }) : (
                <div className="allocation-empty-state">
                  <strong>Alokasi tidak ditemukan.</strong>
                  <p>Coba ubah kata pencarian atau cek tanggal transaksi agar sesuai dengan bulan alokasi.</p>
                </div>
              )}
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function TransactionSheet({ open, onClose, editingTransaction = null, onClearEdit }) {
  const {
    categories,
    budgets,
    transactions,
    accountBalances,
    currentMember,
    addTransaction,
    updateTransaction,
    addCategory,
    notify,
  } = useApp();

  const [form, setForm] = useState(emptyForm);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [quickCategoryName, setQuickCategoryName] = useState('');
  const [savingCategory, setSavingCategory] = useState(false);
  const [allocationPickerOpen, setAllocationPickerOpen] = useState(false);
  const [allocationSearch, setAllocationSearch] = useState('');

  React.useEffect(() => {
    if (editingTransaction) {
      setForm({
        type: editingTransaction.type,
        amount: editingTransaction.amount,
        categoryId: editingTransaction.categoryId || '',
        budgetId: editingTransaction.budgetId || '',
        accountId: editingTransaction.accountId || '',
        transactionDate: editingTransaction.transactionDate,
        note: editingTransaction.note,
      });
    } else if (open) {
      setForm(emptyForm());
    }
    setShowCategoryForm(false);
    setQuickCategoryName('');
    setAllocationPickerOpen(false);
    setAllocationSearch('');
  }, [editingTransaction, open]);

  const isOwner = currentMember?.role === 'owner';
  const incomeCategories = useMemo(
    () => categories.filter((category) => category.type === 'income'),
    [categories]
  );

  const cycle = useMemo(() => getBudgetCycle(form.transactionDate), [form.transactionDate]);
  const monthTransactions = useMemo(
    () => getBudgetCycleTransactions(transactions, cycle.month, cycle.year).filter((trx) => trx.id !== editingTransaction?.id),
    [transactions, cycle.month, cycle.year, editingTransaction?.id]
  );

  const availableBudgets = useMemo(() => {
    if (form.type !== 'expense') return [];
    return budgets
      .filter((budget) => Number(budget.month) === Number(cycle.month) && Number(budget.year) === Number(cycle.year))
      .sort((a, b) => {
        const accountA = accountBalances.find((item) => item.id === a.accountId)?.name || '';
        const accountB = accountBalances.find((item) => item.id === b.accountId)?.name || '';
        return accountA.localeCompare(accountB, 'id') || a.name.localeCompare(b.name, 'id');
      });
  }, [accountBalances, budgets, cycle.month, cycle.year, form.type]);

  React.useEffect(() => {
    if (form.type !== 'expense') {
      if (form.budgetId) setForm((prev) => ({ ...prev, budgetId: '' }));
      return;
    }

    const selectedStillValid = availableBudgets.some((budget) => budget.id === form.budgetId);
    if (selectedStillValid) return;

    setForm((prev) => ({ ...prev, budgetId: availableBudgets.length === 1 ? availableBudgets[0].id : '' }));
  }, [availableBudgets, form.budgetId, form.type]);

  const selectedBudget = availableBudgets.find((budget) => budget.id === form.budgetId) || null;
  const selectedBudgetUsage = selectedBudget ? getBudgetUsage(selectedBudget, monthTransactions) : null;
  const selectedBudgetAccount = selectedBudget ? accountBalances.find((account) => account.id === selectedBudget.accountId) : null;
  const projectedRemaining = selectedBudgetUsage ? selectedBudgetUsage.remaining - Number(form.amount || 0) : null;

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const setType = (type) => setForm((prev) => ({ ...prev, type, categoryId: '', budgetId: '', accountId: '' }));

  const selectBudget = (budgetId) => {
    setField('budgetId', budgetId);
    setAllocationPickerOpen(false);
    setAllocationSearch('');
  };

  const submitQuickCategory = async (event) => {
    event.preventDefault();
    try {
      if (!quickCategoryName.trim()) throw new Error('Nama kategori wajib diisi.');
      setSavingCategory(true);
      const category = await addCategory({ name: quickCategoryName, type: 'income' });
      setForm((prev) => ({ ...prev, categoryId: category?.id || prev.categoryId }));
      setQuickCategoryName('');
      setShowCategoryForm(false);
    } catch (error) {
      notify(error.message);
    } finally {
      setSavingCategory(false);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    try {
      const isExpense = form.type === 'expense';
      const payload = {
        ...form,
        amount: Number(form.amount),
        categoryId: isExpense ? null : form.categoryId || incomeCategories[0]?.id,
        accountId: isExpense ? selectedBudget?.accountId || '' : form.accountId || accountBalances.find((account) => account.isActive)?.id,
        budgetId: isExpense ? form.budgetId || null : null,
      };
      if (editingTransaction) await updateTransaction(editingTransaction.id, payload);
      else await addTransaction(payload);
      setForm(emptyForm());
      onClearEdit?.();
      onClose();
    } catch (error) {
      notify(error.message);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="sheet-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.form className="sheet form-grid" onSubmit={submit} initial={{ y: 420 }} animate={{ y: 0 }} exit={{ y: 420 }} transition={{ type: 'spring', stiffness: 250, damping: 28 }}>
            <div className="row-between">
              <div>
                <p className="section-kicker">Transaksi</p>
                <h2>{editingTransaction ? 'Edit transaksi' : 'Catat cepat'}</h2>
              </div>
              <button type="button" className="icon-btn" onClick={() => { onClearEdit?.(); onClose(); }} aria-label="Tutup form">
                <X size={18} />
              </button>
            </div>

            <div className="segment">
              <button type="button" className={`${form.type === 'income' ? 'active income' : ''}`} onClick={() => setType('income')}>Pemasukan</button>
              <button type="button" className={`${form.type === 'expense' ? 'active expense' : ''}`} onClick={() => setType('expense')}>Pengeluaran</button>
            </div>

            <div className="field">
              <label>Nominal</label>
              <input inputMode="numeric" type="number" min="1" placeholder="Contoh: 150000" value={form.amount} onChange={(e) => setField('amount', e.target.value)} />
            </div>

            {form.type === 'expense' ? (
              <div className="field allocation-field allocation-picker-field">
                <label>Alokasi Anggaran</label>
                <button
                  type="button"
                  className={`allocation-select-button ${selectedBudget ? 'selected' : ''}`}
                  onClick={() => setAllocationPickerOpen(true)}
                >
                  {selectedBudget ? (
                    <>
                      <span>
                        <strong>{selectedBudget.name}</strong>
                        <small>{selectedBudgetAccount?.name || 'Dompet tidak ditemukan'}</small>
                      </span>
                      <em>{formatRupiah(selectedBudgetUsage?.remaining || 0)} tersisa</em>
                    </>
                  ) : (
                    <>
                      <span>
                        <strong>Pilih alokasi</strong>
                        <small>{availableBudgets.length} alokasi tersedia · {formatBudgetCycleRange(cycle.month, cycle.year)}</small>
                      </span>
                      <em>Pilih</em>
                    </>
                  )}
                </button>

                <AllocationPickerModal
                  open={allocationPickerOpen}
                  budgets={availableBudgets}
                  transactions={monthTransactions}
                  accountBalances={accountBalances}
                  selectedBudgetId={form.budgetId}
                  selectedTransactionId={editingTransaction?.id}
                  onSelect={selectBudget}
                  onClose={() => setAllocationPickerOpen(false)}
                  search={allocationSearch}
                  setSearch={setAllocationSearch}
                  cycle={cycle}
                />

                {selectedBudgetUsage ? (
                  <p className={`budget-hint ${projectedRemaining < 0 ? 'danger' : ''}`}>
                    Sumber: {selectedBudgetAccount?.name || 'Dompet tidak ditemukan'} · Sisa setelah transaksi: {formatRupiah(projectedRemaining)} dari alokasi {formatRupiah(selectedBudget.amount)}. Periode reset tiap tanggal 25.
                  </p>
                ) : (
                  <p className="budget-hint">Pengeluaran wajib memilih alokasi. Daftar mengikuti periode gajian: tanggal 25 sampai 24 bulan berikutnya.</p>
                )}
              </div>
            ) : (
              <div className="grid-2">
                <div className="field">
                  <label>Kategori Pemasukan</label>
                  <select value={form.categoryId} onChange={(e) => setField('categoryId', e.target.value)}>
                    <option value="">Pilih</option>
                    {incomeCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                  </select>
                  {isOwner && (
                    <button className="inline-add-btn" type="button" onClick={() => setShowCategoryForm((value) => !value)}>
                      <PlusCircle size={14} /> Tambah kategori pemasukan
                    </button>
                  )}
                </div>
                <div className="field">
                  <label>Dompet Tujuan</label>
                  <select value={form.accountId} onChange={(e) => setField('accountId', e.target.value)}>
                    <option value="">Pilih</option>
                    {accountBalances.filter((acc) => acc.isActive).map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
                  </select>
                </div>
              </div>
            )}

            {showCategoryForm && form.type === 'income' && (
              <div className="inline-category-form">
                <input value={quickCategoryName} onChange={(event) => setQuickCategoryName(event.target.value)} placeholder="Contoh: Bonus Project" />
                <button className="small-btn" type="button" disabled={savingCategory} onClick={submitQuickCategory}>{savingCategory ? 'Menyimpan...' : 'Simpan'}</button>
              </div>
            )}

            <div className="field">
              <label>Tanggal</label>
              <input type="date" value={form.transactionDate} onChange={(e) => setForm((prev) => ({ ...prev, transactionDate: e.target.value, budgetId: '' }))} />
            </div>

            <div className="field">
              <label>Catatan</label>
              <textarea placeholder="Opsional" value={form.note} onChange={(e) => setField('note', e.target.value)} />
            </div>

            <button className="primary-btn" type="submit">Simpan Transaksi</button>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
