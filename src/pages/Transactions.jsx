import React, { useMemo, useState } from 'react';
import { ListFilter, Plus, RotateCcw, Search } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import TransactionList from '../components/TransactionList.jsx';
import { Card } from '../components/UI.jsx';
import { formatRupiah } from '../utils/format.js';

export default function Transactions({ onEdit, onAdd }) {
  const {
    transactions,
    categories,
    accountBalances,
    familyMembers,
    deleteTransaction,
    notify,
  } = useApp();

  const [query, setQuery] = useState('');
  const [type, setType] = useState('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    creatorId: 'all',
    accountId: 'all',
    categoryId: 'all',
    startDate: '',
    endDate: '',
  });

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return transactions.filter((trx) => {
      const category = categories.find((cat) => cat.id === trx.categoryId);
      const account = accountBalances.find((acc) => acc.id === trx.accountId);
      const creator = trx.createdByProfile?.name || '';
      const creatorEmail = trx.createdByProfile?.email || '';

      const matchType = type === 'all' || trx.type === type;
      const matchCreator = filters.creatorId === 'all' || trx.createdBy === filters.creatorId;
      const matchAccount = filters.accountId === 'all' || trx.accountId === filters.accountId;
      const matchCategory = filters.categoryId === 'all' || trx.categoryId === filters.categoryId;
      const matchStartDate = !filters.startDate || trx.transactionDate >= filters.startDate;
      const matchEndDate = !filters.endDate || trx.transactionDate <= filters.endDate;

      const text = [
        trx.note,
        trx.type === 'income' ? 'pemasukan' : 'pengeluaran',
        category?.name,
        account?.name,
        account?.type,
        creator,
        creatorEmail,
        trx.transactionDate,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchQuery = !normalizedQuery || text.includes(normalizedQuery);

      return (
        matchType &&
        matchCreator &&
        matchAccount &&
        matchCategory &&
        matchStartDate &&
        matchEndDate &&
        matchQuery
      );
    });
  }, [transactions, categories, accountBalances, query, type, filters]);

  const hasAdvancedFilter =
    filters.creatorId !== 'all' ||
    filters.accountId !== 'all' ||
    filters.categoryId !== 'all' ||
    filters.startDate ||
    filters.endDate;

  const filteredIncome = filtered.filter((trx) => trx.type === 'income').reduce((sum, trx) => sum + Number(trx.amount || 0), 0);
  const filteredExpense = filtered.filter((trx) => trx.type === 'expense').reduce((sum, trx) => sum + Number(trx.amount || 0), 0);

  const resetFilters = () => {
    setQuery('');
    setType('all');
    setFilters({
      creatorId: 'all',
      accountId: 'all',
      categoryId: 'all',
      startDate: '',
      endDate: '',
    });
  };

  const handleDelete = async (id) => {
    try {
      await deleteTransaction(id);
    } catch (error) {
      notify(error.message);
    }
  };

  return (
    <div className="page playful-transactions-page">
      <header className="header playful-page-header">
        <div>
          <p className="eyebrow">Transaksi keluarga</p>
          <h1>Catatan Keuangan</h1>
        </div>
        <button className="icon-btn playful-icon-btn" type="button" aria-label="Tambah transaksi" onClick={onAdd}>
          <Plus size={18} />
        </button>
      </header>

      <Card className="playful-quick-card">
        <div className="row-between">
          <div>
            <p className="section-kicker">Input cepat</p>
            <h2>Catat transaksi baru</h2>
          </div>
          <span className="role-pill owner">Alokasi otomatis</span>
        </div>
        <p className="muted tiny quick-copy">Pilih kategori pengeluaran dan alokasi anggaran dari bottom sheet agar sisa budget langsung terhitung.</p>
        <button className="primary-btn playful-primary-btn" type="button" onClick={onAdd}>
          <Plus size={16} /> Tambah Transaksi
        </button>
      </Card>

      <div className="playful-summary-grid">
        <div className="playful-stat-card income">
          <span>Pemasukan tampil</span>
          <strong>{formatRupiah(filteredIncome)}</strong>
        </div>
        <div className="playful-stat-card expense">
          <span>Pengeluaran tampil</span>
          <strong>{formatRupiah(filteredExpense)}</strong>
        </div>
      </div>

      <div className="row-between search-filter-row playful-search-row">
        <label className="searchbar preview-searchbar" style={{ flex: 1 }}>
          <Search size={18} />
          <input
            placeholder="Cari transaksi, catatan, dompet, anggota..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <button
          className={`icon-btn filter-icon-btn playful-icon-btn ${filterOpen || hasAdvancedFilter ? 'active' : ''}`}
          type="button"
          aria-label="Filter transaksi"
          onClick={() => setFilterOpen((value) => !value)}
        >
          <ListFilter size={18} />
        </button>
      </div>

      <div className="filter-row preview-filter-row playful-filter-row">
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

      {filterOpen && (
        <section className="advanced-filter-card playful-filter-card">
          <div className="advanced-filter-head">
            <div>
              <p className="section-kicker">Filter Detail</p>
              <h2>Saring Transaksi</h2>
            </div>
            <button className="small-btn" type="button" onClick={resetFilters}>
              <RotateCcw size={13} /> Reset
            </button>
          </div>

          <div className="form-grid">
            <div className="grid-2">
              <div className="field">
                <label>Anggota</label>
                <select
                  value={filters.creatorId}
                  onChange={(e) => setFilters({ ...filters, creatorId: e.target.value })}
                >
                  <option value="all">Semua anggota</option>
                  {familyMembers.map((member) => (
                    <option value={member.userId} key={member.id}>
                      {member.profile?.name || member.profile?.email || 'Anggota'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label>Dompet</label>
                <select
                  value={filters.accountId}
                  onChange={(e) => setFilters({ ...filters, accountId: e.target.value })}
                >
                  <option value="all">Semua dompet</option>
                  {accountBalances.map((account) => (
                    <option value={account.id} key={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="field">
              <label>Transaksi / Kategori</label>
              <select
                value={filters.categoryId}
                onChange={(e) => setFilters({ ...filters, categoryId: e.target.value })}
              >
                <option value="all">Semua kategori</option>
                {categories.map((category) => (
                  <option value={category.id} key={category.id}>
                    {category.name} · {category.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid-2">
              <div className="field">
                <label>Dari tanggal</label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                />
              </div>

              <div className="field">
                <label>Sampai tanggal</label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                />
              </div>
            </div>
          </div>

          <p className="muted tiny filter-result-note">
            Menampilkan {filtered.length} dari {transactions.length} transaksi.
          </p>
        </section>
      )}

      <section className="transactions-list-card playful-list-card">
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
