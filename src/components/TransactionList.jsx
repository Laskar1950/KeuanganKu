import React from 'react';
import { formatDate, formatRupiah } from '../utils/format.js';
import { EmptyState } from './UI.jsx';

export default function TransactionList({ transactions, categories, accounts, onEdit, onDelete }) {
  if (!transactions.length) {
    return <EmptyState emoji="🧾" title="Belum ada transaksi" description="Tambahkan transaksi pertama Anda agar dashboard mulai terisi." />;
  }
  return (
    <div className="transaction-list">
      {transactions.map((trx) => {
        const category = categories.find((cat) => cat.id === trx.categoryId);
        const account = accounts.find((acc) => acc.id === trx.accountId);
        return (
          <div className="transaction-item" key={trx.id}>
            <div className="avatar">{category?.icon || '📦'}</div>
            <div className="item-main">
              <p className="item-title">{trx.note || category?.name || 'Transaksi'}</p>
              <p className="item-sub">{formatDate(trx.transactionDate)} • {category?.name || '-'} • {account?.name || '-'}</p>
              {(onEdit || onDelete) && (
                <p className="tiny" style={{ margin: '5px 0 0' }}>
                  {onEdit && <button className="link-btn" onClick={() => onEdit(trx)}>Edit</button>}
                  {onEdit && onDelete && <span className="muted"> · </span>}
                  {onDelete && <button className="link-btn" onClick={() => onDelete(trx.id)}>Hapus</button>}
                </p>
              )}
            </div>
            <div style={{ textAlign: 'right' }}>
              <p className={`amount ${trx.type}`}>{trx.type === 'income' ? '+' : '-'}{formatRupiah(trx.amount)}</p>
              <p className="item-sub">{trx.createdBy}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
