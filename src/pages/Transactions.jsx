import React, { useMemo, useState } from 'react';
import { ListFilter, Search } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import { Card } from '../components/UI.jsx';
import TransactionList from '../components/TransactionList.jsx';

export default function Transactions({ onEdit }) {
  const { transactions, categories, accountBalances, deleteTransaction, notify } = useApp();
  const [query, setQuery] = useState('');
  const [type, setType] = useState('all');
  const filtered = useMemo(() => {
    return transactions.filter((trx) => {
      const category = categories.find((cat) => cat.id === trx.categoryId);
      const matchType = type === 'all' || trx.type === type;
      const text = `${trx.note} ${category?.name}`.toLowerCase();
      return matchType && text.includes(query.toLowerCase());
    });
  }, [transactions, categories, query, type]);
  return (
    <div className="page">
      <header><p className="eyebrow">Riwayat</p><h1>Transaksi</h1></header>
      <div className="row-between">
        <label className="searchbar" style={{ flex: 1 }}><Search size={18} /><input placeholder="Cari transaksi..." value={query} onChange={(e) => setQuery(e.target.value)} /></label>
        <button className="icon-btn"><ListFilter size={18} /></button>
      </div>
      <div className="filter-row">
        {[['all','Semua'],['income','Pemasukan'],['expense','Pengeluaran']].map(([id,label]) => <button key={id} className={`filter-chip ${type===id?'active':''}`} onClick={() => setType(id)}>{label}</button>)}
      </div>
      <Card><TransactionList transactions={filtered} categories={categories} accounts={accountBalances} onEdit={onEdit} onDelete={async (id) => { try { await deleteTransaction(id); } catch (error) { notify(error.message); } }} /></Card>
    </div>
  );
}
