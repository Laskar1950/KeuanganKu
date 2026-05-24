import React from 'react';
import { Pencil, Trash2, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { formatDate, formatRupiah } from '../utils/format.js';
import { EmptyState } from './UI.jsx';

const accountTypeLabel = {
  cash: 'Tunai',
  bank: 'Bank',
  ewallet: 'E-Wallet',
  saving: 'Tabungan',
  other: 'Lainnya',
};

function getTransactionTitle(trx, category) {
  const note = trx.note?.trim();
  if (note) return note;
  return category?.name || (trx.type === 'income' ? 'Pemasukan' : 'Pengeluaran');
}

export default function TransactionList({
  transactions,
  categories,
  accounts,
  onEdit,
  onDelete,
  compact = false,
}) {
  if (!transactions.length) {
    return (
      <EmptyState
        emoji="🧾"
        title="Belum ada transaksi"
        description="Tambahkan transaksi pertama Anda agar dashboard mulai terisi."
      />
    );
  }

  return (
    <div className={`transaction-list ${compact ? 'compact' : ''}`}>
      {transactions.map((trx) => {
        const category = categories.find((cat) => cat.id === trx.categoryId);
        const account = accounts.find((acc) => acc.id === trx.accountId);
        const isIncome = trx.type === 'income';
        const title = getTransactionTitle(trx, category);
        const creatorName = trx.createdByProfile?.name || 'Anggota keluarga';

        return (
          <article className={`transaction-item ${isIncome ? 'income' : 'expense'}`} key={trx.id}>
            <div className={`transaction-icon ${isIncome ? 'income' : 'expense'}`}>
              {isIncome ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
            </div>

            <div className="item-main">
              <div className="transaction-title-row">
                <h3 className="item-title">{title}</h3>

                <span className={`type-badge ${isIncome ? 'income' : 'expense'}`}>
                  {isIncome ? 'Masuk' : 'Keluar'}
                </span>
              </div>

              <div className="transaction-meta">
                <span>{formatDate(trx.transactionDate)}</span>
                <span>•</span>
                <span>{category?.name || 'Tanpa kategori'}</span>
                <span>•</span>
                <span>Oleh {creatorName}</span>
              </div>

              <div className="wallet-chip">
                <Wallet size={13} />
                <span>{account?.name || 'Dompet tidak ditemukan'}</span>
                {account?.type && <em>{accountTypeLabel[account.type] || account.type}</em>}
              </div>

              {(onEdit || onDelete) && (
                <div className="transaction-actions">
                  {onEdit && (
                    <button className="action-btn edit" onClick={() => onEdit(trx)} type="button">
                      <Pencil size={13} /> Edit
                    </button>
                  )}

                  {onDelete && (
                    <button className="action-btn delete" onClick={() => onDelete(trx.id)} type="button">
                      <Trash2 size={13} /> Hapus
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="transaction-amount-wrap">
              <p className={`amount ${isIncome ? 'income' : 'expense'}`}>
                {isIncome ? '+' : '-'}
                {formatRupiah(trx.amount)}
              </p>
            </div>
          </article>
        );
      })}
    </div>
  );
}
