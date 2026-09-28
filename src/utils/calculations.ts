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

/**
 * Menghitung total pengeluaran per kategori.
 * Sekarang akurat karena semua expense sudah punya category_id (setelah migrasi).
 * Expense tanpa kategori (data lama sebelum migrasi) masuk bucket "Tanpa Kategori".
 */
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
    .filter((item) => item.amount > 0)
    .sort((a, b) => b.amount - a.amount);
}

/**
 * Menghitung total pemasukan per kategori.
 */
export function getIncomeByCategory(transactions: Transaction[], categories: Category[]): CategoryExpense[] {
  const incomeTransactions = transactions.filter((trx) => trx.type === "income");
  const grouped = incomeTransactions.reduce<Record<string, number>>((acc, trx) => {
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
    .filter((item) => item.amount > 0)
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

/**
 * Menghitung pemakaian alokasi anggaran.
 *
 * Model baru: transaksi expense bisa punya budget_id (jika user memilih alokasi)
 * atau tidak (pengeluaran tanpa alokasi). Penggunaan dihitung dari transaksi
 * yang secara eksplisit terhubung ke budget ini via budget_id.
 *
 * Jika budget punya category_id, kita juga menghitung transaksi pada kategori
 * yang sama yang tidak terhubung ke alokasi manapun (unallocated expenses)
 * sebagai insight tambahan — tapi itu disimpan terpisah di usedUnallocated.
 */
export function getBudgetUsage(budget: Budget, transactions: Transaction[]): BudgetUsage {
  const used = transactions
    .filter((trx) => {
      if (trx.type !== "expense") return false;
      if (budget.categoryId && trx.categoryId === budget.categoryId) return true;
      if (trx.budgetId === budget.id) return true;
      return false;
    })
    .reduce((total, trx) => total + Number(trx.amount || 0), 0);

  const percentage = budget.amount > 0 ? Math.round((used / budget.amount) * 100) : 0;
  let status = "Aman";
  if (percentage >= 100) status = "Melebihi";
  else if (percentage >= 80) status = "Mendekati";

  return { used, remaining: Number(budget.amount || 0) - used, percentage, status };
}

/**
 * Menghitung total pengeluaran pada kategori tertentu,
 * termasuk yang tidak punya alokasi (budget_id null).
 * Berguna untuk laporan "anggaran vs aktual per kategori".
 */
export function getCategoryTotalExpense(categoryId: string, transactions: Transaction[]): number {
  return transactions
    .filter((trx) => trx.type === "expense" && trx.categoryId === categoryId)
    .reduce((total, trx) => total + Number(trx.amount || 0), 0);
}

export function makeId(prefix = "id"): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function getExpenseIncomeStatus(income: number, expense: number): { label: string; tone: "surplus" | "balanced" | "deficit"; description: string } {
  const inc = Number(income || 0);
  const exp = Number(expense || 0);
  if (inc === 0 && exp === 0) return { label: "Belum Ada Aktivitas", tone: "balanced", description: "Belum ada pencatatan pada periode ini" };
  if (inc === 0 && exp > 0) return { label: "Defisit Penuh", tone: "deficit", description: "Tidak ada pemasukan, hanya pengeluaran" };
  if (exp === 0 && inc > 0) return { label: "Surplus Maksimal", tone: "surplus", description: "Tidak ada pengeluaran, pemasukan utuh" };
  const diff = Math.abs(inc - exp);
  const max = Math.max(inc, exp);
  const ratio = diff / max;
  if (ratio < 0.1) return { label: "Seimbang", tone: "balanced", description: "Pemasukan dan pengeluaran relatif seimbang" };
  if (exp > inc) {
    if (exp > inc * 1.5) return { label: "Defisit Signifikan", tone: "deficit", description: "Pengeluaran jauh melampaui pemasukan" };
    return { label: "Defisit", tone: "deficit", description: "Pengeluaran melebihi pemasukan" };
  }
  if (exp < inc * 0.5) return { label: "Surplus Signifikan", tone: "surplus", description: "Pemasukan jauh melampaui pengeluaran" };
  return { label: "Surplus", tone: "surplus", description: "Pemasukan lebih besar dari pengeluaran" };
}
