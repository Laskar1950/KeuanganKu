import type {
  Account,
  AppNotification,
  Budget,
  Category,
  FamilyMember,
  Household,
  SavingGoal,
  Transaction,
  UserProfile,
} from "@/types";

interface ProfileRow {
  id?: string;
  name?: string;
  email?: string;
  username?: string;
  avatar_url?: string;
  created_at?: string;
}

interface AuthUserLike {
  id?: string;
  email?: string;
  created_at?: string;
  user_metadata?: {
    name?: string;
    username?: string;
    avatar_url?: string;
  };
}

interface HouseholdRow {
  id: string;
  name: string;
  owner_user_id?: string;
  invite_code?: string;
  created_at?: string;
}

interface FamilyMemberRow {
  id: string;
  family_id: string;
  user_id: string;
  role: string;
  created_at?: string;
  profiles?: ProfileRow | null;
}

interface CategoryRow {
  id: string;
  family_id?: string | null;
  name: string;
  type: "income" | "expense";
  is_default?: boolean;
  created_at?: string;
}

interface AccountRow {
  id: string;
  family_id: string;
  name: string;
  type: string;
  initial_balance?: number | string;
  is_active?: boolean;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface TransactionRow {
  id: string;
  family_id: string;
  account_id: string;
  category_id?: string | null;
  budget_id?: string | null;
  created_by?: string;
  type: "income" | "expense";
  amount?: number | string;
  transaction_date: string;
  note?: string | null;
  created_at?: string;
  updated_at?: string;
  profiles?: ProfileRow | null;
}

interface BudgetRow {
  id: string;
  family_id: string;
  name?: string | null;
  account_id?: string | null;
  category_id?: string | null;
  month: number | string;
  year: number | string;
  amount?: number | string;
  note?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface NotificationRow {
  id: string;
  family_id: string;
  user_id?: string | null;
  type?: string;
  title?: string;
  message?: string | null;
  target?: string;
  read_at?: string | null;
  created_at?: string;
}

interface SavingGoalRow {
  id: string;
  family_id: string;
  name: string;
  target_amount?: number | string;
  current_amount?: number | string;
  target_date?: string | null;
  note?: string | null;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

export const toProfile = (row?: ProfileRow | null, authUser?: AuthUserLike | null): UserProfile => ({
  id: row?.id || authUser?.id || "",
  name: row?.name || authUser?.user_metadata?.name || authUser?.email?.split("@")[0] || "Pengguna",
  email: row?.email || authUser?.email || "",
  username: row?.username || authUser?.user_metadata?.username || authUser?.email?.split("@")[0] || "",
  avatarUrl: row?.avatar_url || authUser?.user_metadata?.avatar_url || "",
});

export const toHousehold = (row?: HouseholdRow | null): Household | null =>
  row
    ? {
        id: row.id,
        name: row.name,
        ownerUserId: row.owner_user_id,
        inviteCode: row.invite_code || "",
      }
    : null;

export const toFamilyMember = (row: FamilyMemberRow): FamilyMember => ({
  id: row.id,
  familyId: row.family_id,
  userId: row.user_id,
  role: row.role,
  profile: row.profiles ? toProfile(row.profiles) : null,
});

export const toCategory = (row: CategoryRow): Category => ({
  id: row.id,
  familyId: row.family_id || null,
  name: row.name,
  type: row.type,
  isDefault: row.is_default,
});

export const toAccount = (row: AccountRow): Account => ({
  id: row.id,
  familyId: row.family_id,
  name: row.name,
  type: row.type,
  initialBalance: Number(row.initial_balance || 0),
  isActive: row.is_active !== false,
  createdBy: row.created_by || null,
});

export const toTransaction = (row: TransactionRow): Transaction => ({
  id: row.id,
  familyId: row.family_id,
  accountId: row.account_id,
  categoryId: row.category_id || null,
  budgetId: row.budget_id || null,
  createdBy: row.created_by,
  createdByProfile: row.profiles ? toProfile(row.profiles) : null,
  type: row.type,
  amount: Number(row.amount || 0),
  transactionDate: row.transaction_date,
  note: row.note || "",
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const toBudget = (row: BudgetRow): Budget => ({
  id: row.id,
  familyId: row.family_id,
  name: row.name || "Alokasi Anggaran",
  accountId: row.account_id || null,
  categoryId: row.category_id || null,
  month: Number(row.month),
  year: Number(row.year),
  amount: Number(row.amount || 0),
  note: row.note || "",
});

export const toNotification = (row: NotificationRow): AppNotification => ({
  id: row.id,
  familyId: row.family_id,
  userId: row.user_id || null,
  type: row.type || "general",
  title: row.title || "Notifikasi",
  message: row.message || "",
  target: row.target || "dashboard",
  readAt: row.read_at || null,
  createdAt: row.created_at,
});

export const toSavingGoal = (row: SavingGoalRow): SavingGoal => ({
  id: row.id,
  familyId: row.family_id,
  name: row.name,
  targetAmount: Number(row.target_amount || 0),
  currentAmount: Number(row.current_amount || 0),
  targetDate: row.target_date || "",
  note: row.note || "",
  status: row.status,
});
