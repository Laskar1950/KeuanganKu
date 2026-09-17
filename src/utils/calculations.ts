import type { Account, Budget, Category, Transaction } from "@/types";

function getDateParts(dateString?: string) {
  const [year, month] = String(dateString || "").split("-").map(Number);
  return { month, year };
}

export function getMonthTransactions(transactions: Transaction[], month: number, year: number): Transaction[] {
  return transactions.filter((trx) => {
    const trxDate = getDateParts(trx.transactionDate);
    return trxDate.month === Number(month) && trxDate.year === Number(year);
  });
}

export function sumByType(transactions: Transaction[], type: Transaction["type"]): number {
  return transactions.filter((trx) => trx.type === type).reduce((total, trx) => total + Number(trx.amount || 0), 0);
}

export function calculateAccountBalance(account: Account, transactions: Transaction[]): number {
  return transactions
    .filter((trx) => trx.accountId === account.id)
    .reduce((balance, trx) => {
      return trx.type === "income" ? balance + Number(trx.amount) : balance - Number(trx.amount);
    }, Number(account.initialBalance || 0));
}

export function getTotalBalance(accounts: Account[], transactions: Transaction[]): number {
  return accounts
    .filter((account) => account.isActive)
    .reduce((total, account) => total + calculateAccountBalance(account, transactions), 0);
}

export interface CategoryExpense {
  categoryId: string;
  name: string;
  amount: number;
}

export function getExpenseByCategory(transactions: Transaction[], categories: Category[]): CategoryExpense[] {
  const expenseTransactions = transactions.filter((trx) => trx.type === "expense");
  const grouped = expenseTransactions.reduce<Record<string, number>>((acc, trx) => {
    const key = trx.categoryId || "uncategorized";
    acc[key] = (acc[key] || 0) + Number(trx.amount || 0);
    return acc;
  }, {});
  return Object.entries(grouped)
    .map(([categoryId, amount]) => ({
      categoryId,
      name: categories.find((cat) => cat.id === categoryId)?.name || "Tanpa Kategori",
      amount,
    }))
    .sort((a, b) => b.amount - a.amount);
}

export interface AllocationExpense {
  budgetId: string;
  name: string;
  amount: number;
}

export function getExpenseByAllocation(transactions: Transaction[], budgets: Budget[]): AllocationExpense[] {
  const expenseTransactions = transactions.filter((trx) => trx.type === "expense");
  const grouped = expenseTransactions.reduce<Record<string, number>>((acc, trx) => {
    const key = trx.budgetId || "no-allocation";
    acc[key] = (acc[key] || 0) + Number(trx.amount || 0);
    return acc;
  }, {});

  return Object.entries(grouped)
    .map(([budgetId, amount]) => ({
      budgetId,
      name: budgets.find((budget) => budget.id === budgetId)?.name || "Tanpa Alokasi",
      amount,
    }))
    .sort((a, b) => b.amount - a.amount);
}

export interface BudgetUsage {
  used: number;
  remaining: number;
  percentage: number;
  status: string;
}

export function getBudgetUsage(budget: Budget, transactions: Transaction[]): BudgetUsage {
  const used = transactions
    .filter((trx) => trx.type === "expense" && trx.budgetId === budget.id)
    .reduce((total, trx) => total + Number(trx.amount || 0), 0);

  const percentage = budget.amount > 0 ? Math.round((used / budget.amount) * 100) : 0;
  let status = "Aman";
  if (percentage >= 100) status = "Melebihi";
  else if (percentage >= 80) status = "Mendekati";

  return { used, remaining: Number(budget.amount || 0) - used, percentage, status };
}

export function makeId(prefix = "id"): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
