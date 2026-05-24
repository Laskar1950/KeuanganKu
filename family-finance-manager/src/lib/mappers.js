export const toProfile = (row, authUser) => ({
  id: row?.id || authUser?.id,
  name: row?.name || authUser?.user_metadata?.name || authUser?.email?.split('@')[0] || 'Pengguna',
  email: row?.email || authUser?.email || '',
  createdAt: row?.created_at || authUser?.created_at,
});

export const toHousehold = (row) => row ? ({
  id: row.id,
  name: row.name,
  ownerUserId: row.owner_user_id,
  createdAt: row.created_at,
}) : null;

export const toCategory = (row) => ({
  id: row.id,
  familyId: row.family_id,
  name: row.name,
  type: row.type,
  isDefault: row.is_default,
  createdAt: row.created_at,
});

export const toAccount = (row) => ({
  id: row.id,
  familyId: row.family_id,
  name: row.name,
  type: row.type,
  initialBalance: Number(row.initial_balance || 0),
  isActive: row.is_active,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const toTransaction = (row) => ({
  id: row.id,
  familyId: row.family_id,
  accountId: row.account_id,
  categoryId: row.category_id,
  createdBy: row.created_by,
  type: row.type,
  amount: Number(row.amount || 0),
  transactionDate: row.transaction_date,
  note: row.note || '',
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const toBudget = (row) => ({
  id: row.id,
  familyId: row.family_id,
  categoryId: row.category_id,
  month: Number(row.month),
  year: Number(row.year),
  amount: Number(row.amount || 0),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const toSavingGoal = (row) => ({
  id: row.id,
  familyId: row.family_id,
  name: row.name,
  targetAmount: Number(row.target_amount || 0),
  currentAmount: Number(row.current_amount || 0),
  targetDate: row.target_date || '',
  note: row.note || '',
  status: row.status,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});
