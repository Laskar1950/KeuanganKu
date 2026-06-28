import React, { useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarDays, CreditCard, PiggyBank, TrendingDown, TrendingUp, Wallet, X } from 'lucide-react';
import { formatRupiah } from '../utils/format.js';
import { getBudgetUsage, getMonthTransactions } from '../utils/calculations.js';

function sameCycle(transaction, month, year) {
  const [trxYear, trxMonth] = String(transaction.transactionDate || '').split('-').map(Number);
  return Number(trxMonth) === Number(month) && Number(trxYear) === Number(year);
}

function totalByType(transactions, type) {
  return transactions.filter((trx) => trx.type === type).reduce((sum, trx) => sum + Number(trx.amount || 0), 0);
}

function formatDate(value) {
  if (!value) return '-';
  try {
    return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
  } catch {
    return value;
  }
}

function TransactionRow({ transaction, account, budget }) {
  const isIncome = transaction.type === 'income';
  return (
    <div className="finance-detail-transaction-row">
      <span className={`finance-detail-icon ${isIncome ? 'income' : 'expense'}`}>
        {isIncome ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
      </span>
      <div className="finance-detail-transaction-main">
        <strong>{transaction.note || (isIncome ? 'Pemasukan' : 'Pengeluaran')}</strong>
        <small>
          {formatDate(transaction.transactionDate)}
          {account?.name ? ` • ${account.name}` : ''}
          {budget?.name ? ` • ${budget.name}` : ''}
        </small>
      </div>
      <strong className={isIncome ? 'amount-income' : 'amount-expense'}>
        {isIncome ? '+' : '-'}{formatRupiah(transaction.amount)}
      </strong>
    </div>
  );
}

export default function FinanceDetailModal({ open, type, item, transactions = [], budgets = [], accountBalances = [], onClose }) {
  const data = useMemo(() => {
    if (!item) {
      return {
        title: '', subtitle: '', income: 0, expense: 0, transactions: [], relatedBudgets: [], usage: null,
      };
    }

    if (type === 'wallet') {
      const walletTransactions = transactions
        .filter((trx) => trx.accountId === item.id)
        .sort((a, b) => String(b.transactionDate).localeCompare(String(a.transactionDate)) || String(b.createdAt).localeCompare(String(a.createdAt)));
      const relatedBudgets = budgets.filter((budget) => budget.accountId === item.id);

      return {
        title: item.name,
        subtitle: 'Detail dompet keluarga',
        income: totalByType(walletTransactions, 'income'),
        expense: totalByType(walletTransactions, 'expense'),
        transactions: walletTransactions,
        relatedBudgets,
        usage: null,
      };
    }

    const budgetTransactions = transactions
      .filter((trx) => trx.budgetId === item.id)
      .sort((a, b) => String(b.transactionDate).localeCompare(String(a.transactionDate)) || String(b.createdAt).localeCompare(String(a.createdAt)));
    const sourceAccount = accountBalances.find((account) => account.id === item.accountId);
    const sameMonthTransactions = getMonthTransactions(transactions, item.month, item.year);
    const sourceIncome = sameMonthTransactions.filter((trx) => trx.type === 'income' && trx.accountId === item.accountId);
    const usage = getBudgetUsage(item, sameMonthTransactions);

    return {
      title: item.name,
      subtitle: `${String(item.month).padStart(2, '0')}/${item.year} • ${sourceAccount?.name || 'Dompet tidak ditemukan'}`,
      income: totalByType(sourceIncome, 'income'),
      expense: totalByType(budgetTransactions, 'expense'),
      transactions: [...budgetTransactions],
      relatedBudgets: [],
      usage,
      sourceIncome,
    };
  }, [accountBalances, budgets, item, transactions, type]);

  const accountName = (accountId) => accountBalances.find((account) => account.id === accountId)?.name || '';
  const budgetName = (budgetId) => budgets.find((budget) => budget.id === budgetId)?.name || '';

  return (
    <AnimatePresence>
      {open && item && (
        <motion.div className="finance-detail-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.section
            className="finance-detail-modal"
            initial={{ y: 48, opacity: 0.98 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 48, opacity: 0.98 }}
            transition={{ type: 'spring', stiffness: 260, damping: 28 }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="finance-detail-header">
              <div>
                <p className="section-kicker">{type === 'wallet' ? 'Dompet' : 'Alokasi Anggaran'}</p>
                <h2>{data.title}</h2>
                <small>{data.subtitle}</small>
              </div>
              <button className="icon-btn" type="button" onClick={onClose} aria-label="Tutup detail"><X size={18} /></button>
            </div>

            <div className="finance-detail-summary-grid">
              <div className="finance-detail-summary-card income">
                <span><TrendingUp size={16} /></span>
                <small>Pemasukan</small>
                <strong>{formatRupiah(data.income)}</strong>
              </div>
              <div className="finance-detail-summary-card expense">
                <span><TrendingDown size={16} /></span>
                <small>Pengeluaran</small>
                <strong>{formatRupiah(data.expense)}</strong>
              </div>
              {type === 'wallet' ? (
                <div className="finance-detail-summary-card neutral">
                  <span><Wallet size={16} /></span>
                  <small>Saldo saat ini</small>
                  <strong>{formatRupiah(item.currentBalance ?? item.initialBalance ?? 0)}</strong>
                </div>
              ) : (
                <div className="finance-detail-summary-card neutral">
                  <span><PiggyBank size={16} /></span>
                  <small>{Number(data.usage?.remaining || 0) < 0 ? 'Over budget' : 'Sisa alokasi'}</small>
                  <strong className={Number(data.usage?.remaining || 0) < 0 ? 'danger-text' : ''}>{Number(data.usage?.remaining || 0) < 0 ? formatRupiah(Math.abs(data.usage?.remaining || 0)) : formatRupiah(data.usage?.remaining || 0)}</strong>
                </div>
              )}
            </div>

            {type === 'wallet' && (
              <div className="finance-detail-section">
                <div className="finance-detail-section-title">
                  <PiggyBank size={16} />
                  <strong>Alokasi dari dompet ini</strong>
                </div>
                {data.relatedBudgets.length ? (
                  <div className="finance-detail-budget-list">
                    {data.relatedBudgets.map((budget) => {
                      const usage = getBudgetUsage(budget, getMonthTransactions(transactions, budget.month, budget.year));
                      const progressRaw = budget.amount > 0 ? Math.round((usage.used / budget.amount) * 100) : 0;
                      const progress = Math.min(100, progressRaw);
                      const overBudget = Number(usage.remaining || 0) < 0;
                      return (
                        <div className={`finance-detail-budget-card ${overBudget ? 'over-budget' : ''}`} key={budget.id}>
                          <div>
                            <strong>{budget.name}</strong>
                            <small><CalendarDays size={12} /> {String(budget.month).padStart(2, '0')}/{budget.year}</small>
                          </div>
                          <div>
                            <strong className={overBudget ? 'danger-text' : ''}>{overBudget ? formatRupiah(Math.abs(usage.remaining)) : formatRupiah(usage.remaining)}</strong>
                            <small>{overBudget ? 'Over budget dari' : 'Sisa dari'} {formatRupiah(budget.amount)}</small>
                          </div>
                          <span className="finance-detail-progress"><i style={{ width: `${progress}%` }} /></span>
                        </div>
                      );
                    })}
                  </div>
                ) : <p className="finance-detail-empty">Belum ada alokasi yang memakai dompet ini.</p>}
              </div>
            )}

            {type === 'budget' && data.sourceIncome?.length > 0 && (
              <div className="finance-detail-section">
                <div className="finance-detail-section-title">
                  <CreditCard size={16} />
                  <strong>Pemasukan ke dompet sumber pada periode alokasi</strong>
                </div>
                <div className="finance-detail-transaction-list compact">
                  {data.sourceIncome.map((trx) => (
                    <TransactionRow
                      key={trx.id}
                      transaction={trx}
                      account={{ name: accountName(trx.accountId) }}
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="finance-detail-section">
              <div className="finance-detail-section-title">
                <CreditCard size={16} />
                <strong>{type === 'wallet' ? 'Transaksi pada dompet ini' : 'Pengeluaran pada alokasi ini'}</strong>
              </div>
              {data.transactions.length ? (
                <div className="finance-detail-transaction-list">
                  {data.transactions.map((trx) => (
                    <TransactionRow
                      key={trx.id}
                      transaction={trx}
                      account={{ name: accountName(trx.accountId) }}
                      budget={{ name: budgetName(trx.budgetId) }}
                    />
                  ))}
                </div>
              ) : <p className="finance-detail-empty">Belum ada transaksi terkait.</p>}
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
