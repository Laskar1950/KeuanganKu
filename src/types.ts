export interface UserProfile {
  id: string;
  name: string;
  email?: string;
  username?: string;
  avatarUrl?: string;
}

export interface Household {
  id: string;
  name: string;
  ownerUserId?: string;
  inviteCode?: string;
}

export interface Account {
  id: string;
  name: string;
  type: string;
  initialBalance: number;
  currentBalance?: number;
  isActive: boolean;
  familyId?: string;
}

export interface Transaction {
  id: string;
  familyId?: string;
  type: "income" | "expense";
  amount: number;
  transactionDate: string;
  note?: string | null;
  accountId: string;
  categoryId?: string | null;
  budgetId?: string | null;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
  createdByProfile?: UserProfile | null;
}

export interface Budget {
  id: string;
  familyId?: string;
  name: string;
  accountId?: string | null;
  categoryId?: string | null;
  month: number;
  year: number;
  amount: number;
  note?: string | null;
}

export interface Category {
  id: string;
  name: string;
  type: "income" | "expense";
  isDefault?: boolean;
  familyId?: string | null;
}

export interface FamilyMember {
  id: string;
  familyId?: string;
  userId: string;
  role: string;
  profile?: UserProfile | null;
}

export interface AppNotification {
  id: string;
  familyId?: string;
  title: string;
  message?: string;
  target?: string;
  userId?: string | null;
  readAt?: string | null;
}

export interface SavingGoal {
  id: string;
  familyId?: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: string;
  note?: string;
  status?: string;
}
