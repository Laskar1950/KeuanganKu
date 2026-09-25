import type { Account, Budget, FamilyMember, SavingGoal, Transaction } from "@/types";
import { getBudgetCycleRange } from "@/utils/budgetCycle";

// Dummy dev-only — identik dengan preview/app.js agar export langsung berisi data saat VITE_ENABLE_DUMMY_REPORT=true
export const dummyAccounts: Account[] = [
  { id: "dummy-w1", name: "Bank Mandiri", type: "bank", initialBalance: 4850000, isActive: true, familyId: "dummy" },
  { id: "dummy-w2", name: "Tunai Rumah", type: "cash", initialBalance: 850000, isActive: true, familyId: "dummy" },
  { id: "dummy-w3", name: "OVO", type: "ewallet", initialBalance: 320000, isActive: true, familyId: "dummy" },
  { id: "dummy-w4", name: "Tabungan Sekolah", type: "saving", initialBalance: 2000000, isActive: true, familyId: "dummy" },
  { id: "dummy-w5", name: "Dana Darurat", type: "saving", initialBalance: 7500000, isActive: true, familyId: "dummy" },
];

export const dummyBudgets: Budget[] = [
  { id: "dummy-b1", name: "Belanja Rumah", month: 9, year: 2026, amount: 3000000, accountId: "dummy-w1", note: "Sembako, listrik, kebutuhan rumah." },
  { id: "dummy-b2", name: "Transportasi", month: 9, year: 2026, amount: 800000, accountId: "dummy-w2", note: "" },
  { id: "dummy-b3", name: "Sekolah Anak", month: 9, year: 2026, amount: 1500000, accountId: "dummy-w4", note: "SPP dan kebutuhan sekolah." },
  { id: "dummy-b4", name: "Makan di Luar", month: 9, year: 2026, amount: 1000000, accountId: "dummy-w3", note: "" },
  { id: "dummy-b5", name: "Kebutuhan Bulanan", month: 9, year: 2026, amount: 2000000, accountId: "dummy-w1", note: "" },
  { id: "dummy-b6", name: "Belanja Rumah", month: 8, year: 2026, amount: 2800000, accountId: "dummy-w1", note: "" },
  { id: "dummy-b7", name: "Transportasi", month: 8, year: 2026, amount: 750000, accountId: "dummy-w2", note: "" },
];

export const dummySavingGoals: SavingGoal[] = [
  { id: "dummy-g1", name: "Dana Darurat", targetAmount: 20000000, currentAmount: 14500000, familyId: "dummy", status: "active" },
  { id: "dummy-g2", name: "Tabungan Liburan", targetAmount: 6000000, currentAmount: 3800000, familyId: "dummy", status: "active" },
  { id: "dummy-g3", name: "Renovasi Rumah", targetAmount: 15000000, currentAmount: 4500000, familyId: "dummy", status: "active" },
];

export const dummyFamilyMembers: FamilyMember[] = [
  { id: "fm1", familyId: "dummy", userId: "u1", role: "owner", profile: { id: "u1", name: "Afrizal Rizki", email: "afrizal@email.com" } },
  { id: "fm2", familyId: "dummy", userId: "u2", role: "admin", profile: { id: "u2", name: "Rina Maulida", email: "rina@email.com" } },
  { id: "fm3", familyId: "dummy", userId: "u3", role: "member", profile: { id: "u3", name: "Bima Pratama", email: "bima@email.com" } },
];

function cycleDate(month: number, year: number, day: number): string {
  const d = getBudgetCycleRange(month, year);
  // pick a day inside cycle: start + day offset (clamp)
  const start = new Date(d.startDate);
  start.setDate(start.getDate() + Math.min(day, 20));
  return start.toISOString().slice(0, 10);
}

export const dummyTransactions: Transaction[] = [
  { id: "dummy-t1", type: "income", amount: 9500000, transactionDate: cycleDate(9, 2026, 0), note: "Gaji Bulanan", accountId: "dummy-w1", budgetId: null, categoryId: "c1", createdByProfile: { id: "u1", name: "Afrizal Rizki", email: "afrizal@email.com" } },
  { id: "dummy-t2", type: "expense", amount: 1250000, transactionDate: cycleDate(9, 2026, 2), note: "Belanja Pasar", accountId: "dummy-w1", budgetId: "dummy-b1", createdByProfile: { id: "u2", name: "Rina Maulida", email: "rina@email.com" } },
  { id: "dummy-t3", type: "expense", amount: 250000, transactionDate: cycleDate(9, 2026, 3), note: "Bensin", accountId: "dummy-w2", budgetId: "dummy-b2", createdByProfile: { id: "u1", name: "Afrizal Rizki", email: "afrizal@email.com" } },
  { id: "dummy-t4", type: "income", amount: 1200000, transactionDate: cycleDate(9, 2026, 5), note: "Bonus Project", accountId: "dummy-w1", budgetId: null, categoryId: "c2", createdByProfile: { id: "u1", name: "Afrizal Rizki", email: "afrizal@email.com" } },
  { id: "dummy-t5", type: "expense", amount: 900000, transactionDate: cycleDate(9, 2026, 6), note: "Token Listrik", accountId: "dummy-w1", budgetId: "dummy-b1", createdByProfile: { id: "u1", name: "Afrizal Rizki", email: "afrizal@email.com" } },
  { id: "dummy-t6", type: "expense", amount: 1650000, transactionDate: cycleDate(9, 2026, 7), note: "SPP Sekolah", accountId: "dummy-w4", budgetId: "dummy-b3", createdByProfile: { id: "u2", name: "Rina Maulida", email: "rina@email.com" } },
  { id: "dummy-t7", type: "expense", amount: 320000, transactionDate: cycleDate(9, 2026, 8), note: "Makan Keluarga", accountId: "dummy-w3", budgetId: "dummy-b4", createdByProfile: { id: "u3", name: "Bima Pratama", email: "bima@email.com" } },
  { id: "dummy-t8", type: "expense", amount: 240000, transactionDate: cycleDate(9, 2026, 9), note: "Jajan Anak", accountId: "dummy-w3", budgetId: "dummy-b4", createdByProfile: { id: "u2", name: "Rina Maulida", email: "rina@email.com" } },
  { id: "dummy-t17", type: "expense", amount: 180000, transactionDate: cycleDate(9, 2026, 11), note: "Makan Siang Warteg", accountId: "dummy-w2", budgetId: "dummy-b4", createdByProfile: { id: "u1", name: "Afrizal Rizki", email: "afrizal@email.com" } },
  { id: "dummy-t18", type: "expense", amount: 260000, transactionDate: cycleDate(9, 2026, 13), note: "Resto Weekend", accountId: "dummy-w1", budgetId: "dummy-b4", createdByProfile: { id: "u2", name: "Rina Maulida", email: "rina@email.com" } },
  { id: "dummy-t19", type: "expense", amount: 1000000, transactionDate: cycleDate(9, 2026, 4), note: "Setor Tabungan Darurat", accountId: "dummy-w5", budgetId: null, createdByProfile: { id: "u1", name: "Afrizal Rizki", email: "afrizal@email.com" } },
  // 6 periode back for trend realism
  { id: "dummy-t9", type: "income", amount: 8800000, transactionDate: cycleDate(8, 2026, 1), note: "Gaji Agustus", accountId: "dummy-w1", budgetId: null, categoryId: "c1", createdByProfile: { id: "u1", name: "Afrizal Rizki", email: "afrizal@email.com" } },
  { id: "dummy-t10", type: "expense", amount: 1100000, transactionDate: cycleDate(8, 2026, 4), note: "Belanja Mingguan", accountId: "dummy-w1", budgetId: "dummy-b6", createdByProfile: { id: "u2", name: "Rina Maulida", email: "rina@email.com" } },
  { id: "dummy-t11", type: "expense", amount: 480000, transactionDate: cycleDate(8, 2026, 8), note: "Service Motor", accountId: "dummy-w2", budgetId: "dummy-b7", createdByProfile: { id: "u1", name: "Afrizal Rizki", email: "afrizal@email.com" } },
  { id: "dummy-t12", type: "income", amount: 750000, transactionDate: cycleDate(8, 2026, 10), note: "Freelance", accountId: "dummy-w1", budgetId: null, categoryId: "c3", createdByProfile: { id: "u1", name: "Afrizal Rizki", email: "afrizal@email.com" } },
  { id: "dummy-t13", type: "expense", amount: 600000, transactionDate: cycleDate(7, 2026, 5), note: "Belanja Juni", accountId: "dummy-w1", budgetId: null, createdByProfile: { id: "u1", name: "Afrizal Rizki", email: "afrizal@email.com" } },
  { id: "dummy-t14", type: "income", amount: 9200000, transactionDate: cycleDate(7, 2026, 0), note: "Gaji Juli", accountId: "dummy-w1", budgetId: null, categoryId: "c1", createdByProfile: { id: "u1", name: "Afrizal Rizki", email: "afrizal@email.com" } },
  { id: "dummy-t15", type: "expense", amount: 750000, transactionDate: cycleDate(6, 2026, 10), note: "Arisan", accountId: "dummy-w2", budgetId: null, createdByProfile: { id: "u2", name: "Rina Maulida", email: "rina@email.com" } },
  { id: "dummy-t16", type: "income", amount: 500000, transactionDate: cycleDate(6, 2026, 12), note: "Bonus THR", accountId: "dummy-w1", budgetId: null, categoryId: "c1", createdByProfile: { id: "u1", name: "Afrizal Rizki", email: "afrizal@email.com" } },
];

export const dummyHouseholdName = "Keluarga Rizki (Contoh)";
