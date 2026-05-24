import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';

export default function TransactionSheet({ open, onClose, editingTransaction = null, onClearEdit }) {
  const { categories, accountBalances, addTransaction, updateTransaction, notify } = useApp();
  const [form, setForm] = useState({
    type: editingTransaction?.type || 'expense',
    amount: editingTransaction?.amount || '',
    categoryId: editingTransaction?.categoryId || '',
    accountId: editingTransaction?.accountId || '',
    transactionDate: editingTransaction?.transactionDate || new Date().toISOString().slice(0, 10),
    note: editingTransaction?.note || '',
  });

  React.useEffect(() => {
    if (editingTransaction) {
      setForm({
        type: editingTransaction.type,
        amount: editingTransaction.amount,
        categoryId: editingTransaction.categoryId,
        accountId: editingTransaction.accountId,
        transactionDate: editingTransaction.transactionDate,
        note: editingTransaction.note,
      });
    } else {
      setForm((prev) => ({ ...prev, transactionDate: new Date().toISOString().slice(0, 10) }));
    }
  }, [editingTransaction, open]);

  const filteredCategories = useMemo(
    () => categories.filter((category) => category.type === form.type),
    [categories, form.type]
  );

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async (event) => {
    event.preventDefault();
    try {
      const payload = {
        ...form,
        amount: Number(form.amount),
        categoryId: form.categoryId || filteredCategories[0]?.id,
        accountId: form.accountId || accountBalances[0]?.id,
      };
      if (editingTransaction) await updateTransaction(editingTransaction.id, payload);
      else await addTransaction(payload);
      setForm({ type: 'expense', amount: '', categoryId: '', accountId: '', transactionDate: new Date().toISOString().slice(0, 10), note: '' });
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
              <button type="button" className={`${form.type === 'income' ? 'active income' : ''}`} onClick={() => setField('type', 'income')}>Pemasukan</button>
              <button type="button" className={`${form.type === 'expense' ? 'active expense' : ''}`} onClick={() => setField('type', 'expense')}>Pengeluaran</button>
            </div>

            <div className="field">
              <label>Nominal</label>
              <input inputMode="numeric" type="number" min="1" placeholder="Contoh: 150000" value={form.amount} onChange={(e) => setField('amount', e.target.value)} />
            </div>

            <div className="grid-2">
              <div className="field">
                <label>Kategori</label>
                <select value={form.categoryId} onChange={(e) => setField('categoryId', e.target.value)}>
                  <option value="">Pilih</option>
                  {filteredCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Dompet</label>
                <select value={form.accountId} onChange={(e) => setField('accountId', e.target.value)}>
                  <option value="">Pilih</option>
                  {accountBalances.filter((acc) => acc.isActive).map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
                </select>
              </div>
            </div>

            <div className="field">
              <label>Tanggal</label>
              <input type="date" value={form.transactionDate} onChange={(e) => setField('transactionDate', e.target.value)} />
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
