export const defaultCategories = [
  { id: 'cat-income-salary', name: 'Gaji', type: 'income', isDefault: true, icon: '💼' },
  { id: 'cat-income-bonus', name: 'Bonus', type: 'income', isDefault: true, icon: '🎁' },
  { id: 'cat-income-business', name: 'Usaha Sampingan', type: 'income', isDefault: true, icon: '🏪' },
  { id: 'cat-expense-grocery', name: 'Belanja Dapur', type: 'expense', isDefault: true, icon: '🛒' },
  { id: 'cat-expense-transport', name: 'Transportasi', type: 'expense', isDefault: true, icon: '🛵' },
  { id: 'cat-expense-education', name: 'Pendidikan', type: 'expense', isDefault: true, icon: '🎓' },
  { id: 'cat-expense-health', name: 'Kesehatan', type: 'expense', isDefault: true, icon: '🏥' },
  { id: 'cat-expense-installment', name: 'Cicilan', type: 'expense', isDefault: true, icon: '🏦' },
  { id: 'cat-expense-entertainment', name: 'Hiburan', type: 'expense', isDefault: true, icon: '🎬' },
  { id: 'cat-expense-bills', name: 'Tagihan', type: 'expense', isDefault: true, icon: '⚡' },
  { id: 'cat-expense-food', name: 'Makan di Luar', type: 'expense', isDefault: true, icon: '🍜' },
  { id: 'cat-expense-other', name: 'Lainnya', type: 'expense', isDefault: true, icon: '📦' },
];

export const seedAccounts = [
  { id: 'acc-bca', name: 'Bank BCA', type: 'bank', initialBalance: 8500000, isActive: true },
  { id: 'acc-cash', name: 'Tunai', type: 'cash', initialBalance: 1200000, isActive: true },
  { id: 'acc-gopay', name: 'GoPay', type: 'ewallet', initialBalance: 650000, isActive: true },
];

export const seedTransactions = [
  { id: 'trx-1', accountId: 'acc-cash', categoryId: 'cat-expense-grocery', type: 'expense', amount: 185000, transactionDate: '2026-05-24', note: 'Belanja dapur mingguan', createdBy: 'Ibu Rina' },
  { id: 'trx-2', accountId: 'acc-bca', categoryId: 'cat-income-salary', type: 'income', amount: 8500000, transactionDate: '2026-05-23', note: 'Gaji bulanan', createdBy: 'Pak Budi' },
  { id: 'trx-3', accountId: 'acc-bca', categoryId: 'cat-expense-education', type: 'expense', amount: 750000, transactionDate: '2026-05-22', note: 'SPP Anak', createdBy: 'Ibu Rina' },
  { id: 'trx-4', accountId: 'acc-gopay', categoryId: 'cat-expense-bills', type: 'expense', amount: 300000, transactionDate: '2026-05-21', note: 'Token listrik', createdBy: 'Pak Budi' },
  { id: 'trx-5', accountId: 'acc-cash', categoryId: 'cat-expense-food', type: 'expense', amount: 215000, transactionDate: '2026-05-20', note: 'Makan keluarga', createdBy: 'Ibu Rina' },
  { id: 'trx-6', accountId: 'acc-cash', categoryId: 'cat-expense-transport', type: 'expense', amount: 115000, transactionDate: '2026-05-19', note: 'Bensin dan parkir', createdBy: 'Pak Budi' },
];

export const seedBudgets = [
  { id: 'budget-1', categoryId: 'cat-expense-grocery', month: 5, year: 2026, amount: 3000000 },
  { id: 'budget-2', categoryId: 'cat-expense-transport', month: 5, year: 2026, amount: 1000000 },
  { id: 'budget-3', categoryId: 'cat-expense-entertainment', month: 5, year: 2026, amount: 500000 },
  { id: 'budget-4', categoryId: 'cat-expense-education', month: 5, year: 2026, amount: 1000000 },
];

export const seedSavingGoals = [
  { id: 'goal-1', name: 'Dana Darurat', targetAmount: 10000000, currentAmount: 7200000, targetDate: '2026-12-31', note: 'Minimal 3 bulan biaya hidup', status: 'active' },
  { id: 'goal-2', name: 'Liburan Keluarga', targetAmount: 6000000, currentAmount: 2500000, targetDate: '2026-08-20', note: 'Liburan akhir tahun', status: 'active' },
];
