function getDateParts(dateString) {
  const [year, month] = String(dateString || '').split('-').map(Number);
  return { month, year };
}

export function getMonthTransactions(transactions, month, year) {
  return transactions.filter((trx) => {
    const trxDate = getDateParts(trx.transactionDate);
    return trxDate.month === Number(month) && trxDate.year === Number(year);
  });
}

export function sumByType(transactions, type) {
  return transactions
    .filter((trx) => trx.type === type)
    .reduce((total, trx) => total + Number(trx.amount || 0), 0);
}

export function calculateAccountBalance(account, transactions) {
  return transactions
    .filter((trx) => trx.accountId === account.id)
    .reduce((balance, trx) => {
      return trx.type === 'income' ? balance + Number(trx.amount) : balance - Number(trx.amount);
    }, Number(account.initialBalance || 0));
}

export function getTotalBalance(accounts, transactions) {
  return accounts
    .filter((account) => account.isActive)
    .reduce((total, account) => total + calculateAccountBalance(account, transactions), 0);
}

export function getExpenseByCategory(transactions, categories) {
  const expenseTransactions = transactions.filter((trx) => trx.type === 'expense');
  const grouped = expenseTransactions.reduce((acc, trx) => {
    acc[trx.categoryId] = (acc[trx.categoryId] || 0) + Number(trx.amount || 0);
    return acc;
  }, {});
  return Object.entries(grouped)
    .map(([categoryId, amount]) => ({
      categoryId,
      name: categories.find((cat) => cat.id === categoryId)?.name || 'Tanpa Kategori',
      amount,
    }))
    .sort((a, b) => b.amount - a.amount);
}

export function getBudgetUsage(budget, transactions) {
  const used = transactions
    .filter((trx) => {
      if (trx.type !== 'expense') return false;
      if (trx.budgetId) return trx.budgetId === budget.id;
      return trx.categoryId === budget.categoryId;
    })
    .reduce((total, trx) => total + Number(trx.amount || 0), 0);

  const percentage = budget.amount > 0 ? Math.round((used / budget.amount) * 100) : 0;
  let status = 'Aman';
  if (percentage >= 100) status = 'Melebihi';
  else if (percentage >= 80) status = 'Mendekati';

  return { used, remaining: Number(budget.amount || 0) - used, percentage, status };
}

export function makeId(prefix = 'id') {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
