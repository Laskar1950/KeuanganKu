import { describe, it, expect } from 'vitest';
import {
  getBudgetCycle,
  getBudgetCycleRange,
  getBudgetCycleTransactions,
  getBudgetCycleLabel,
  getBudgetCycleShortLabel,
  isDateInBudgetCycle,
  SALARY_CYCLE_START_DAY,
} from './budgetCycle.js';

// Cycle start hari ke-25 setiap bulan.
// Cycle Juni 2026 = 25 Mei 2026 s/d 24 Juni 2026.
// Cycle Mei 2026  = 25 Apr 2026 s/d 24 Mei 2026.

describe('SALARY_CYCLE_START_DAY', () => {
  it('bernilai 25', () => {
    expect(SALARY_CYCLE_START_DAY).toBe(25);
  });
});

// --- getBudgetCycleRange --------------------------------------------------

describe('getBudgetCycleRange', () => {
  it('menghasilkan startKey dan endKey yang benar untuk Juni 2026', () => {
    const cycle = getBudgetCycleRange(6, 2026);
    expect(cycle.startKey).toBe('2026-05-25');
    expect(cycle.endKey).toBe('2026-06-24');
  });

  it('menghasilkan range yang benar untuk Januari 2026 (lintas tahun)', () => {
    const cycle = getBudgetCycleRange(1, 2026);
    expect(cycle.startKey).toBe('2025-12-25');
    expect(cycle.endKey).toBe('2026-01-24');
  });

  it('menerima argumen berupa object { month, year }', () => {
    const cycle = getBudgetCycleRange({ month: 6, year: 2026 });
    expect(cycle.startKey).toBe('2026-05-25');
    expect(cycle.endKey).toBe('2026-06-24');
  });

  it('cycle.month dan cycle.year sesuai argumen', () => {
    const cycle = getBudgetCycleRange(8, 2026);
    expect(cycle.month).toBe(8);
    expect(cycle.year).toBe(2026);
  });
});

// --- getBudgetCycle (dari tanggal) ----------------------------------------

describe('getBudgetCycle', () => {
  it('tanggal setelah hari-25 masuk ke cycle bulan berjalan', () => {
    // 28 Juni 2026 -> cycle Juni 2026 (25 Mei - 24 Jun) -> SALAH
    // 28 Juni 2026 -> tanggal >= 25, jadi cycle Juli 2026
    const cycle = getBudgetCycle('2026-06-28');
    expect(cycle.month).toBe(7);
    expect(cycle.year).toBe(2026);
  });

  it('tanggal sebelum hari-25 masuk ke cycle bulan sebelumnya', () => {
    // 10 Juni 2026 -> < 25, jadi cycle Juni 2026 (25 Mei - 24 Jun)
    const cycle = getBudgetCycle('2026-06-10');
    expect(cycle.month).toBe(6);
    expect(cycle.year).toBe(2026);
  });

  it('tepat hari-25 masuk ke cycle bulan berjalan', () => {
    // 25 Juni 2026 -> >= 25, jadi cycle Juli 2026
    const cycle = getBudgetCycle('2026-06-25');
    expect(cycle.month).toBe(7);
    expect(cycle.year).toBe(2026);
  });

  it('1 Januari masuk ke cycle Januari (bukan Desember tahun lalu)', () => {
    const cycle = getBudgetCycle('2026-01-01');
    expect(cycle.month).toBe(1);
    expect(cycle.year).toBe(2026);
  });
});

// --- isDateInBudgetCycle --------------------------------------------------

describe('isDateInBudgetCycle', () => {
  // Cycle Juni 2026: 25 Mei - 24 Jun
  it('tanggal di dalam range mengembalikan true', () => {
    expect(isDateInBudgetCycle('2026-06-01', 6, 2026)).toBe(true);
    expect(isDateInBudgetCycle('2026-05-25', 6, 2026)).toBe(true); // startKey
    expect(isDateInBudgetCycle('2026-06-24', 6, 2026)).toBe(true); // endKey
  });

  it('tanggal di luar range mengembalikan false', () => {
    expect(isDateInBudgetCycle('2026-05-24', 6, 2026)).toBe(false); // sebelum start
    expect(isDateInBudgetCycle('2026-06-25', 6, 2026)).toBe(false); // setelah end
  });

  it('dateValue null/undefined mengembalikan false tanpa crash', () => {
    expect(isDateInBudgetCycle(null, 6, 2026)).toBe(false);
    expect(isDateInBudgetCycle(undefined, 6, 2026)).toBe(false);
  });
});

// --- getBudgetCycleTransactions -------------------------------------------

describe('getBudgetCycleTransactions', () => {
  const transactions = [
    { id: 't-1', transactionDate: '2026-05-25' }, // masuk cycle Juni 2026
    { id: 't-2', transactionDate: '2026-06-15' }, // masuk cycle Juni 2026
    { id: 't-3', transactionDate: '2026-06-24' }, // masuk cycle Juni 2026 (endKey)
    { id: 't-4', transactionDate: '2026-06-25' }, // masuk cycle Juli 2026
    { id: 't-5', transactionDate: '2026-05-24' }, // masuk cycle Mei 2026
  ];

  it('mengembalikan transaksi yang masuk ke cycle Juni 2026', () => {
    const result = getBudgetCycleTransactions(transactions, 6, 2026);
    expect(result.map((t) => t.id)).toEqual(['t-1', 't-2', 't-3']);
  });

  it('mengembalikan array kosong jika tidak ada transaksi di cycle tersebut', () => {
    const result = getBudgetCycleTransactions(transactions, 3, 2025);
    expect(result).toHaveLength(0);
  });

  it('menangani input transactions null/undefined tanpa crash', () => {
    expect(getBudgetCycleTransactions(null, 6, 2026)).toHaveLength(0);
    expect(getBudgetCycleTransactions(undefined, 6, 2026)).toHaveLength(0);
  });

  it('juga membaca field transaction_date (snake_case)', () => {
    const snakeTrx = [{ id: 'sx-1', transaction_date: '2026-06-10' }];
    const result = getBudgetCycleTransactions(snakeTrx, 6, 2026);
    expect(result).toHaveLength(1);
  });
});

// --- Label helpers --------------------------------------------------------

describe('getBudgetCycleLabel', () => {
  it('menghasilkan label panjang yang benar untuk Juni 2026', () => {
    const label = getBudgetCycleLabel(6, 2026);
    // '25 Mei 2026 - 24 Juni 2026'
    expect(label).toContain('25');
    expect(label).toContain('Mei');
    expect(label).toContain('24');
    expect(label).toContain('Juni');
    expect(label).toContain('2026');
  });
});

describe('getBudgetCycleShortLabel', () => {
  it('menghasilkan label pendek dalam satu tahun', () => {
    const label = getBudgetCycleShortLabel(6, 2026);
    // 'Mei-Jun 2026'
    expect(label).toContain('Mei');
    expect(label).toContain('Jun');
    expect(label).toContain('2026');
  });

  it('menghasilkan label pendek lintas tahun untuk Januari', () => {
    const label = getBudgetCycleShortLabel(1, 2026);
    // 'Des 2025-Jan 2026'
    expect(label).toContain('2025');
    expect(label).toContain('2026');
  });
});
