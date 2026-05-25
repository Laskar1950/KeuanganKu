import React, { useMemo, useState } from 'react';
import { ListFilter, Search } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import TransactionList from '../components/TransactionList.jsx';

export default function Transactions({ onEdit }) {
  const { transactions, categories, accountBalances, deleteTransaction, notify } = useApp();
  const [query, setQuery] = useState('');
  const [type, setType] = useState('all');

  const filtered = useMemo(() => {
    return transactions.filter((trx) => {
      const category = categories.find((cat) => cat.id === trx.categoryId);
      const account = accountBalances.find((acc) => acc.id === trx.accountId);
      const creator = trx.createdByProfile?.name || '';
      const matchType = type === 'all' || trx.type === type;
      const text = `${trx.note} ${category?.name || ''} ${account?.name || ''} ${creator}`.toLowerCase();
      return matchType && text.includes(query.toLowerCase());
    });
  }, [transactions, categories, accountBalances, query, type]);

  const handleDelete = async (id) => {
    try {
      await deleteTransaction(id);
    } catch (error) {
      notify(error.message);
    }
  };

  return (
    <div className="page transactions-preview-page">
      <header className="header preview-page-header">
        <div>
          <p className="eyebrow">Daftar keluarga</p>
          <h1>Transaksi</h1>
        </div>
      </header>

      <div className="row-between search-filter-row">
        <label className="searchbar preview-searchbar" style={{ flex: 1 }}>
          <Search size={18} />
          <input
            placeholder="Cari transaksi, kategori, atau dompet..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <button className="icon-btn filter-icon-btn" type="button" aria-label="Filter transaksi">
          <ListFilter size={18} />
        </button>
      </div>

      <div className="filter-row preview-filter-row">
        {[
          ['all', 'Semua'],
          ['income', 'Pemasukan'],
          ['expense', 'Pengeluaran'],
        ].map(([id, label]) => (
          <button
            key={id}
            className={`filter-chip ${type === id ? 'active' : ''} ${id}`}
            onClick={() => setType(id)}
            type="button"
          >
            {label}
          </button>
        ))}
      </div>

      <section className="transactions-list-card">
        <TransactionList
          transactions={filtered}
          categories={categories}
          accounts={accountBalances}
          onEdit={onEdit}
          onDelete={handleDelete}
        />
      </section>
    </div>
  );
}
