import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { PlusCircle, X } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import { formatRupiah } from '../utils/format.js';
import { getBudgetUsage, getMonthTransactions } from '../utils/calculations.js';

const today = () => new Date().toISOString().slice(0, 10);

function getCycle(dateString) {
  const [year, month] = String(dateString || '').split('-').map(Number);
  return { month, year };
}

const emptyForm = () => ({
  type: 'expense',
  amount: '',
  categoryId: '',
  budgetId: '',
  accountId: '',
  transactionDate: today(),
  note: '',
});

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

  React.useEffect(() => {
    if (editingTransaction) {
      setForm({
        type: editingTransaction.type,
        amount: editingTransaction.amount,
        categoryId: editingTransaction.categoryId,
        budgetId: editingTransaction.budgetId || '',
        accountId: editingTransaction.accountId,
        transactionDate: editingTransaction.transactionDate,
        note: editingTransaction.note,
      });
    } else if (open) {
      setForm(emptyForm());
    }
    setShowCategoryForm(false);
    setQuickCategoryName('');
  }, [editingTransaction, open]);

  const isOwner = currentMember?.role === 'owner';
  const filteredCategories = useMemo(
    () => categories.filter((category) => category.type === form.type),
    [categories, form.type]
  );

  const cycle = useMemo(() => getCycle(form.transactionDate), [form.transactionDate]);
  const monthTransactions = useMemo(
    () => getMonthTransactions(transactions, cycle.month, cycle.year).filter((trx) => trx.id !== editingTransaction?.id),
    [transactions, cycle.month, cycle.year, editingTransaction?.id]
  );

  const availableBudgets = useMemo(() => {
    if (form.type !== 'expense') return [];
    return budgets.filter((budget) => {
      const samePeriod = budget.month === cycle.month && budget.year === cycle.year;
      const sameCategory = !form.categoryId || budget.categoryId === form.categoryId;
      return samePeriod && sameCategory;
    });
  }, [budgets, cycle.month, cycle.year, form.categoryId, form.type]);

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
  const projectedRemaining = selectedBudgetUsage ? selectedBudgetUsage.remaining - Number(form.amount || 0) : null;

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const setType = (type) => setForm((prev) => ({ ...prev, type, categoryId: '', budgetId: '' }));

  const submitQuickCategory = async (event) => {
    event.preventDefault();
    try {
      if (!quickCategoryName.trim()) throw new Error('Nama kategori wajib diisi.');
      setSavingCategory(true);
      const category = await addCategory({ name: quickCategoryName, type: form.type });
      setForm((prev) => ({ ...prev, categoryId: category?.id || prev.categoryId, budgetId: '' }));
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
      const payload = {
        ...form,
        amount: Number(form.amount),
        categoryId: form.categoryId || filteredCategories[0]?.id,
        accountId: form.accountId || accountBalances.find((account) => account.isActive)?.id,
        budgetId: form.type === 'expense' ? form.budgetId || null : null,
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

            <div className="grid-2">
              <div className="field">
                <label>Kategori</label>
                <select value={form.categoryId} onChange={(e) => setForm((prev) => ({ ...prev, categoryId: e.target.value, budgetId: '' }))}>
                  <option value="">Pilih</option>
                  {filteredCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
                {isOwner && (
                  <button className="inline-add-btn" type="button" onClick={() => setShowCategoryForm((value) => !value)}>
                    <PlusCircle size={14} /> Tambah kategori {form.type === 'expense' ? 'pengeluaran' : 'pemasukan'}
                  </button>
                )}
              </div>
              <div className="field">
                <label>Dompet</label>
                <select value={form.accountId} onChange={(e) => setField('accountId', e.target.value)}>
                  <option value="">Pilih</option>
                  {accountBalances.filter((acc) => acc.isActive).map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
                </select>
              </div>
            </div>

            {showCategoryForm && (
              <div className="inline-category-form">
                <input value={quickCategoryName} onChange={(event) => setQuickCategoryName(event.target.value)} placeholder="Contoh: Belanja Anak" />
                <button className="small-btn" type="button" disabled={savingCategory} onClick={submitQuickCategory}>{savingCategory ? 'Menyimpan...' : 'Simpan'}</button>
              </div>
            )}

            <div className="field">
              <label>Tanggal</label>
              <input type="date" value={form.transactionDate} onChange={(e) => setForm((prev) => ({ ...prev, transactionDate: e.target.value, budgetId: '' }))} />
            </div>

            {form.type === 'expense' && (
              <div className="field allocation-field">
                <label>Alokasi Anggaran</label>
                <select value={form.budgetId} onChange={(e) => setField('budgetId', e.target.value)}>
                  <option value="">Tanpa alokasi</option>
                  {availableBudgets.map((budget) => {
                    const category = categories.find((cat) => cat.id === budget.categoryId);
                    const usage = getBudgetUsage(budget, monthTransactions);
                    return <option value={budget.id} key={budget.id}>{category?.name || 'Kategori'} • Sisa {formatRupiah(usage.remaining)}</option>;
                  })}
                </select>
                {selectedBudgetUsage ? (
                  <p className={`budget-hint ${projectedRemaining < 0 ? 'danger' : ''}`}>
                    Sisa setelah transaksi: {formatRupiah(projectedRemaining)} dari alokasi {formatRupiah(selectedBudget.amount)}.
                  </p>
                ) : (
                  <p className="budget-hint">Pilih alokasi agar pengeluaran ini langsung mengurangi sisa anggaran bulan berjalan.</p>
                )}
              </div>
            )}

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
