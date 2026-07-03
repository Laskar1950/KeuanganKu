import { describe, it, expect } from 'vitest';
import {
  getMonthTransactions,
  sumByType,
  calculateAccountBalance,
  getTotalBalance,
  getExpenseByCategory,
  getBudgetUsage,
} from './calculations.js';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const ACCOUNT_CASH = { id: 'acc-1', initialBalance: 500000, isActive: true };
const ACCOUNT_BANK = { id: 'acc-2', initialBalance: 2000000, isActive: true };
const ACCOUNT_INACTIVE = { id: 'acc-3', initialBalance: 1000000, isActive: false };

const TRANSACTIONS = [
  { id: 't-1', accountId: 'acc-1', categoryId: 'cat-gaji',  type: 'income',  amount: 3000000, transactionDate: '2026-06-01' },
  { id: 't-2', accountId: 'acc-1', categoryId: 'cat-makan', type: 'expense', amount: 150000,  transactionDate: '2026-06-05' },
  { id: 't-3', accountId: 'acc-1', categoryId: 'cat-trans', type: 'expense', amount: 50000,   transactionDate: '2026-06-10' },
  { id: 't-4', accountId: 'acc-2', categoryId: 'cat-gaji',  type: 'income',  amount: 1000000, transactionDate: '2026-05-15' },
  { id: 't-5', accountId: 'acc-2', categoryId: 'cat-makan', type: 'expense', amount: 75000,   transactionDate: '2026-05-20' },
];

const CATEGORIES = [
  { id: 'cat-gaji',  name: 'Gaji' },
  { id: 'cat-makan', name: 'Makan di Luar' },
  { id: 'cat-trans', name: 'Transportasi' },
];

const BUDGET_MAKAN = { id: 'budget-1', categoryId: 'cat-makan', amount: 400000 };

// ─── getMonthTransactions ────────────────────────────────────────────────────

describe('getMonthTransactions', () => {
  it('mengembalikan transaksi sesuai bulan dan tahun', () => {
    const result = getMonthTransactions(TRANSACTIONS, 6, 2026);
    expect(result).toHaveLength(3);
    expect(result.map((t) => t.id)).toEqual(['t-1', 't-2', 't-3']);
  });

  it('mengembalikan array kosong jika tidak ada transaksi di bulan tersebut', () => {
    const result = getMonthTransactions(TRANSACTIONS, 3, 2026);
    expect(result).toHaveLength(0);
  });

  it('memfilter berdasarkan tahun dengan benar', () => {
    const result = getMonthTransactions(TRANSACTIONS, 5, 2025);
    expect(result).toHaveLength(0);
  });

  it('menangani array kosong', () => {
    expect(getMonthTransactions([], 6, 2026)).toHaveLength(0);
  });
});

// ─── sumByType ───────────────────────────────────────────────────────────────

describe('sumByType', () => {
  const juniTrx = TRANSACTIONS.filter((t) => t.transactionDate.startsWith('2026-06'));

  it('menjumlahkan pemasukan dengan benar', () => {
    expect(sumByType(juniTrx, 'income')).toBe(3000000);
  });

  it('menjumlahkan pengeluaran dengan benar', () => {
    expect(sumByType(juniTrx, 'expense')).toBe(200000);
  });

  it('mengembalikan 0 jika tidak ada transaksi bertipe tersebut', () => {
    expect(sumByType(juniTrx, 'transfer')).toBe(0);
  });

  it('menangani nilai amount yang berupa string angka', () => {
    const trx = [{ type: 'income', amount: '500000' }];
    expect(sumByType(trx, 'income')).toBe(500000);
  });

  it('menangani amount undefined / null tanpa crash', () => {
    const trx = [{ type: 'expense', amount: null }, { type: 'expense', amount: undefined }];
    expect(sumByType(trx, 'expense')).toBe(0);
  });
});

// ─── calculateAccountBalance ─────────────────────────────────────────────────

describe('calculateAccountBalance', () => {
  it('menghitung saldo = saldo awal + income - expense', () => {
    // acc-1: 500000 + 3000000 - 150000 - 50000 = 3300000
    expect(calculateAccountBalance(ACCOUNT_CASH, TRANSACTIONS)).toBe(3300000);
  });

  it('menghitung saldo akun lain secara independen', () => {
    // acc-2: 2000000 + 1000000 - 75000 = 2925000
    expect(calculateAccountBalance(ACCOUNT_BANK, TRANSACTIONS)).toBe(2925000);
  });

  it('mengembalikan saldo awal jika tidak ada transaksi untuk akun tersebut', () => {
    const account = { id: 'acc-kosong', initialBalance: 100000, isActive: true };
    expect(calculateAccountBalance(account, TRANSACTIONS)).toBe(100000);
  });

  it('menangani initialBalance 0', () => {
    const account = { id: 'acc-1', initialBalance: 0, isActive: true };
    // 0 + 3000000 - 150000 - 50000 = 2800000
    expect(calculateAccountBalance(account, TRANSACTIONS)).toBe(2800000);
  });

  it('saldo bisa negatif jika pengeluaran melebihi saldo awal', () => {
    const account = { id: 'acc-1', initialBalance: 0, isActive: true };
    const trx = [{ accountId: 'acc-1', type: 'expense', amount: 100000 }];
    expect(calculateAccountBalance(account, trx)).toBe(-100000);
  });
});

// ─── getTotalBalance ─────────────────────────────────────────────────────────

describe('getTotalBalance', () => {
  const accounts = [ACCOUNT_CASH, ACCOUNT_BANK, ACCOUNT_INACTIVE];

  it('hanya menjumlahkan akun yang aktif', () => {
    // acc-1: 3300000, acc-2: 2925000, acc-3 (inactive): diabaikan
    expect(getTotalBalance(accounts, TRANSACTIONS)).toBe(6225000);
  });

  it('mengembalikan 0 jika tidak ada akun aktif', () => {
    expect(getTotalBalance([ACCOUNT_INACTIVE], TRANSACTIONS)).toBe(0);
  });

  it('mengembalikan 0 jika array akun kosong', () => {
    expect(getTotalBalance([], TRANSACTIONS)).toBe(0);
  });
});

// ─── getExpenseByCategory ────────────────────────────────────────────────────

describe('getExpenseByCategory', () => {
  it('mengelompokkan pengeluaran berdasarkan kategori', () => {
    const result = getExpenseByCategory(TRANSACTIONS, CATEGORIES);
    // makan: 150000 + 75000 = 225000, transportasi: 50000
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ categoryId: 'cat-makan', name: 'Makan di Luar', amount: 225000 });
    expect(result[1]).toMatchObject({ categoryId: 'cat-trans', name: 'Transportasi', amount: 50000 });
  });

  it('diurutkan dari pengeluaran terbesar ke terkecil', () => {
    const result = getExpenseByCategory(TRANSACTIONS, CATEGORIES);
    expect(result[0].amount).toBeGreaterThanOrEqual(result[1].amount);
  });

  it('tidak memasukkan transaksi income', () => {
    const result = getExpenseByCategory(TRANSACTIONS, CATEGORIES);
    expect(result.find((r) => r.name === 'Gaji')).toBeUndefined();
  });

  it('mengembalikan array kosong jika tidak ada transaksi', () => {
    expect(getExpenseByCategory([], CATEGORIES)).toHaveLength(0);
  });
});

// ─── getBudgetUsage ───────────────────────────────────────────────────────────

describe('getBudgetUsage', () => {
  // budget-1 untuk cat-makan, amount 400000
  // Transaksi expense yang punya budgetId 'budget-1'
  const trxWithBudget = [
    { type: 'expense', budgetId: 'budget-1', amount: 100000 },
    { type: 'expense', budgetId: 'budget-1', amount: 80000 },
    { type: 'expense', budgetId: 'other-budget', amount: 50000 },
    { type: 'income',  budgetId: 'budget-1', amount: 999999 }, // income tidak dihitung
  ];

  it('menghitung used dengan benar', () => {
    const { used } = getBudgetUsage(BUDGET_MAKAN, trxWithBudget);
    expect(used).toBe(180000);
  });

  it('menghitung remaining dengan benar', () => {
    const { remaining } = getBudgetUsage(BUDGET_MAKAN, trxWithBudget);
    expect(remaining).toBe(220000);
  });

  it('menghitung persentase dengan benar', () => {
    const { percentage } = getBudgetUsage(BUDGET_MAKAN, trxWithBudget);
    expect(percentage).toBe(45); // 180000 / 400000 * 100 = 45%
  });

  it('status Aman jika persentase < 80%', () => {
    expect(getBudgetUsage(BUDGET_MAKAN, trxWithBudget).status).toBe('Aman');
  });

  it('status Mendekati jika persentase >= 80%', () => {
    const trxBesar = [{ type: 'expense', budgetId: 'budget-1', amount: 320000 }];
    expect(getBudgetUsage(BUDGET_MAKAN, trxBesar).status).toBe('Mendekati');
  });

  it('status Melebihi jika persentase >= 100%', () => {
    const trxMeledak = [{ type: 'expense', budgetId: 'budget-1', amount: 500000 }];
    const { status, remaining } = getBudgetUsage(BUDGET_MAKAN, trxMeledak);
    expect(status).toBe('Melebihi');
    expect(remaining).toBe(-100000); // saldo negatif
  });

  it('percentage 0 jika budget.amount adalah 0', () => {
    const emptyBudget = { id: 'budget-1', amount: 0 };
    expect(getBudgetUsage(emptyBudget, trxWithBudget).percentage).toBe(0);
  });
});
