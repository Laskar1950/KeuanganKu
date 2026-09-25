import { desc, sql } from 'drizzle-orm';
import { authUsers, authenticatedRole } from 'drizzle-orm/supabase';
import {
  boolean,
  check,
  date,
  foreignKey,
  index,
  integer,
  numeric,
  pgEnum,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export const familyRole = pgEnum('family_role', ['owner', 'admin', 'member']);
export const accountType = pgEnum('account_type', ['cash', 'bank', 'ewallet', 'saving', 'other']);
export const transactionType = pgEnum('transaction_type', ['income', 'expense']);
export const savingGoalStatus = pgEnum('saving_goal_status', ['active', 'completed']);

export const profiles = pgTable(
  'profiles',
  {
    id: uuid('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull(),
    username: text('username').notNull(),
    avatarUrl: text('avatar_url'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({ name: 'profiles_id_fkey', columns: [table.id], foreignColumns: [authUsers.id] }).onDelete('cascade'),
    uniqueIndex('profiles_username_unique_idx').on(sql`lower(${table.username})`),
    check('profiles_name_check', sql`length(btrim(${table.name})) > 0`),
    check('profiles_username_check', sql`length(btrim(${table.username})) >= 3`),
    pgPolicy('profiles_select_own_or_family_peers', {
      for: 'select',
      to: authenticatedRole,
      using: sql`${table.id} = auth.uid() or exists (select 1 from public.family_members mine join public.family_members peer on peer.family_id = mine.family_id where mine.user_id = auth.uid() and peer.user_id = ${table.id})`,
    }),
    pgPolicy('profiles_insert_own', {
      for: 'insert',
      to: authenticatedRole,
      withCheck: sql`${table.id} = auth.uid()`,
    }),
    pgPolicy('profiles_update_own', {
      for: 'update',
      to: authenticatedRole,
      using: sql`${table.id} = auth.uid()`,
      withCheck: sql`${table.id} = auth.uid()`,
    }),
  ]
).enableRLS();

export const families = pgTable(
  'families',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    ownerUserId: uuid('owner_user_id').notNull(),
    inviteCode: text('invite_code')
      .notNull()
      .default(sql`upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))`),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({ name: 'families_owner_user_id_fkey', columns: [table.ownerUserId], foreignColumns: [profiles.id] }).onDelete('cascade'),
    uniqueIndex('families_invite_code_unique_idx').on(sql`upper(${table.inviteCode})`),
    check('families_name_check', sql`length(btrim(${table.name})) > 0`),
    check('families_check', sql`length(btrim(${table.inviteCode})) = 8`),
    pgPolicy('families_select_member', {
      for: 'select',
      to: authenticatedRole,
      using: sql`public.is_family_member(${table.id})`,
    }),
    pgPolicy('families_insert_owner', {
      for: 'insert',
      to: authenticatedRole,
      withCheck: sql`${table.ownerUserId} = auth.uid()`,
    }),
    pgPolicy('families_update_owner', {
      for: 'update',
      to: authenticatedRole,
      using: sql`public.is_family_admin_or_owner(${table.id})`,
      withCheck: sql`public.is_family_admin_or_owner(${table.id})`,
    }),
  ]
).enableRLS();

export const familyMembers = pgTable(
  'family_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    familyId: uuid('family_id').notNull(),
    userId: uuid('user_id').notNull(),
    role: familyRole('role').notNull().default('member'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({ name: 'family_members_family_id_fkey', columns: [table.familyId], foreignColumns: [families.id] }).onDelete('cascade'),
    foreignKey({ name: 'family_members_user_id_fkey', columns: [table.userId], foreignColumns: [profiles.id] }).onDelete('cascade'),
    unique('family_members_family_id_user_id_key').on(table.familyId, table.userId),
    index('family_members_user_id_idx').on(table.userId),
    index('family_members_family_role_idx').on(table.familyId, table.role),
    pgPolicy('family_members_select_member', {
      for: 'select',
      to: authenticatedRole,
      using: sql`public.is_family_member(${table.familyId})`,
    }),
    pgPolicy('family_members_insert_owner_self', {
      for: 'insert',
      to: authenticatedRole,
      withCheck: sql`${table.userId} = auth.uid() and ${table.role} = 'owner' and public.is_family_owner(${table.familyId})`,
    }),
  ]
).enableRLS();

export const accounts = pgTable(
  'accounts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    familyId: uuid('family_id').notNull(),
    name: text('name').notNull(),
    type: accountType('type').notNull().default('cash'),
    initialBalance: numeric('initial_balance', { precision: 14, scale: 2 }).notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    createdBy: uuid('created_by').references(() => profiles.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({ name: 'accounts_family_id_fkey', columns: [table.familyId], foreignColumns: [families.id] }).onDelete('cascade'),
    index('accounts_family_id_idx').on(table.familyId),
    index('accounts_created_by_idx').on(table.createdBy),
    index('accounts_family_created_by_idx').on(table.familyId, table.createdBy),
    check('accounts_name_check', sql`length(btrim(${table.name})) > 0`),
    check('accounts_initial_balance_check', sql`${table.initialBalance} >= 0`),
    pgPolicy('accounts_select_member', {
      for: 'select',
      to: authenticatedRole,
      using: sql`public.is_family_member(${table.familyId})`,
    }),
    pgPolicy('accounts_insert_manager', {
      for: 'insert',
      to: authenticatedRole,
      withCheck: sql`public.is_family_admin_or_owner(${table.familyId})`,
    }),
    pgPolicy('accounts_update_manager', {
      for: 'update',
      to: authenticatedRole,
      using: sql`public.is_family_admin_or_owner(${table.familyId})`,
      withCheck: sql`public.is_family_admin_or_owner(${table.familyId})`,
    }),
    pgPolicy('accounts_delete_manager', {
      for: 'delete',
      to: authenticatedRole,
      using: sql`public.is_family_admin_or_owner(${table.familyId})`,
    }),
  ]
).enableRLS();

export const categories = pgTable(
  'categories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    familyId: uuid('family_id'),
    name: text('name').notNull(),
    type: transactionType('type').notNull(),
    isDefault: boolean('is_default').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({ name: 'categories_family_id_fkey', columns: [table.familyId], foreignColumns: [families.id] }).onDelete('cascade'),
    unique('categories_family_id_name_type_key').on(table.familyId, table.name, table.type),
    index('categories_family_id_idx').on(table.familyId),
    check('categories_name_check', sql`length(btrim(${table.name})) > 0`),
    check('categories_check', sql`(${table.familyId} is null) = ${table.isDefault}`),
    pgPolicy('categories_select_default_or_member', {
      for: 'select',
      to: authenticatedRole,
      using: sql`${table.familyId} is null or public.is_family_member(${table.familyId})`,
    }),
    pgPolicy('categories_insert_manager_custom', {
      for: 'insert',
      to: authenticatedRole,
      withCheck: sql`${table.familyId} is not null and ${table.isDefault} = false and public.is_family_admin_or_owner(${table.familyId})`,
    }),
    pgPolicy('categories_update_manager_custom', {
      for: 'update',
      to: authenticatedRole,
      using: sql`${table.familyId} is not null and ${table.isDefault} = false and public.is_family_admin_or_owner(${table.familyId})`,
      withCheck: sql`${table.familyId} is not null and ${table.isDefault} = false and public.is_family_admin_or_owner(${table.familyId})`,
    }),
    pgPolicy('categories_delete_manager_custom', {
      for: 'delete',
      to: authenticatedRole,
      using: sql`${table.familyId} is not null and ${table.isDefault} = false and public.is_family_admin_or_owner(${table.familyId})`,
    }),
  ]
).enableRLS();

export const budgets = pgTable(
  'budgets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    familyId: uuid('family_id').notNull(),
    name: text('name').notNull(),
    accountId: uuid('account_id').notNull(),
    categoryId: uuid('category_id'),
    month: integer('month').notNull(),
    year: integer('year').notNull(),
    amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
    note: text('note'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({ name: 'budgets_family_id_fkey', columns: [table.familyId], foreignColumns: [families.id] }).onDelete('cascade'),
    foreignKey({ name: 'budgets_account_id_fkey', columns: [table.accountId], foreignColumns: [accounts.id] }).onDelete('restrict'),
    foreignKey({ name: 'budgets_category_id_fkey', columns: [table.categoryId], foreignColumns: [categories.id] }).onDelete('restrict'),
    index('budgets_family_month_year_idx').on(table.familyId, table.month, table.year),
    index('budgets_account_id_idx').on(table.accountId),
    uniqueIndex('budgets_family_named_allocation_unique_idx').on(
      table.familyId,
      table.month,
      table.year,
      sql`lower(btrim(${table.name}))`
    ),
    check('budgets_name_check', sql`length(btrim(${table.name})) > 0`),
    check('budgets_month_check', sql`${table.month} between 1 and 12`),
    check('budgets_year_check', sql`${table.year} >= 2000`),
    check('budgets_amount_check', sql`${table.amount} > 0`),
    pgPolicy('budgets_select_member', {
      for: 'select',
      to: authenticatedRole,
      using: sql`public.is_family_member(${table.familyId})`,
    }),
    pgPolicy('budgets_insert_manager_matching_refs', {
      for: 'insert',
      to: authenticatedRole,
      withCheck: sql`public.is_family_admin_or_owner(${table.familyId}) and exists (select 1 from public.accounts a where a.id = ${table.accountId} and a.family_id = ${table.familyId}) and (${table.categoryId} is null or exists (select 1 from public.categories c where c.id = ${table.categoryId} and (c.family_id = ${table.familyId} or c.family_id is null)))`,
    }),
    pgPolicy('budgets_update_manager_matching_refs', {
      for: 'update',
      to: authenticatedRole,
      using: sql`public.is_family_admin_or_owner(${table.familyId})`,
      withCheck: sql`public.is_family_admin_or_owner(${table.familyId}) and exists (select 1 from public.accounts a where a.id = ${table.accountId} and a.family_id = ${table.familyId}) and (${table.categoryId} is null or exists (select 1 from public.categories c where c.id = ${table.categoryId} and (c.family_id = ${table.familyId} or c.family_id is null)))`,
    }),
    pgPolicy('budgets_delete_manager', {
      for: 'delete',
      to: authenticatedRole,
      using: sql`public.is_family_admin_or_owner(${table.familyId})`,
    }),
  ]
).enableRLS();

export const transactions = pgTable(
  'transactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    familyId: uuid('family_id').notNull(),
    accountId: uuid('account_id').notNull(),
    categoryId: uuid('category_id'),
    budgetId: uuid('budget_id'),
    createdBy: uuid('created_by').notNull(),
    type: transactionType('type').notNull(),
    amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
    transactionDate: date('transaction_date').notNull(),
    note: text('note'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({ name: 'transactions_family_id_fkey', columns: [table.familyId], foreignColumns: [families.id] }).onDelete('cascade'),
    foreignKey({ name: 'transactions_account_id_fkey', columns: [table.accountId], foreignColumns: [accounts.id] }).onDelete('restrict'),
    foreignKey({ name: 'transactions_category_id_fkey', columns: [table.categoryId], foreignColumns: [categories.id] }).onDelete('restrict'),
    foreignKey({ name: 'transactions_budget_id_fkey', columns: [table.budgetId], foreignColumns: [budgets.id] }).onDelete('set null'),
    foreignKey({ name: 'transactions_created_by_fkey', columns: [table.createdBy], foreignColumns: [profiles.id] }).onDelete('restrict'),
    index('transactions_family_date_idx').on(table.familyId, desc(table.transactionDate)),
    index('transactions_budget_id_idx').on(table.budgetId),
    check('transactions_amount_check', sql`${table.amount} > 0`),
    check(
      'transactions_check',
      sql`(${table.type} = 'income' and ${table.categoryId} is not null and ${table.budgetId} is null) or (${table.type} = 'expense' and ${table.categoryId} is null and ${table.budgetId} is not null)`
    ),
    pgPolicy('transactions_select_member', {
      for: 'select',
      to: authenticatedRole,
      using: sql`public.is_family_member(${table.familyId})`,
    }),
    pgPolicy('transactions_insert_member_matching_refs', {
      for: 'insert',
      to: authenticatedRole,
      withCheck: sql`public.is_family_member(${table.familyId}) and ${table.createdBy} = auth.uid() and exists (select 1 from public.accounts a where a.id = ${table.accountId} and a.family_id = ${table.familyId}) and (${table.categoryId} is null or exists (select 1 from public.categories c where c.id = ${table.categoryId} and (c.family_id = ${table.familyId} or c.family_id is null))) and (${table.budgetId} is null or exists (select 1 from public.budgets b where b.id = ${table.budgetId} and b.family_id = ${table.familyId} and b.account_id = ${table.accountId}))`,
    }),
    pgPolicy('transactions_update_manager_or_creator_matching_refs', {
      for: 'update',
      to: authenticatedRole,
      using: sql`public.is_family_admin_or_owner(${table.familyId}) or ${table.createdBy} = auth.uid()`,
      withCheck: sql`public.is_family_member(${table.familyId}) and (${table.createdBy} = auth.uid() or public.is_family_admin_or_owner(${table.familyId})) and exists (select 1 from public.accounts a where a.id = ${table.accountId} and a.family_id = ${table.familyId}) and (${table.categoryId} is null or exists (select 1 from public.categories c where c.id = ${table.categoryId} and (c.family_id = ${table.familyId} or c.family_id is null))) and (${table.budgetId} is null or exists (select 1 from public.budgets b where b.id = ${table.budgetId} and b.family_id = ${table.familyId} and b.account_id = ${table.accountId}))`,
    }),
    pgPolicy('transactions_delete_manager', {
      for: 'delete',
      to: authenticatedRole,
      using: sql`public.is_family_admin_or_owner(${table.familyId})`,
    }),
  ]
).enableRLS();

export const savingGoals = pgTable(
  'saving_goals',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    familyId: uuid('family_id').notNull(),
    name: text('name').notNull(),
    targetAmount: numeric('target_amount', { precision: 14, scale: 2 }).notNull(),
    currentAmount: numeric('current_amount', { precision: 14, scale: 2 }).notNull().default(0),
    targetDate: date('target_date'),
    note: text('note'),
    status: savingGoalStatus('status').notNull().default('active'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({ name: 'saving_goals_family_id_fkey', columns: [table.familyId], foreignColumns: [families.id] }).onDelete('cascade'),
    index('saving_goals_family_id_idx').on(table.familyId),
    check('saving_goals_name_check', sql`length(btrim(${table.name})) > 0`),
    check('saving_goals_target_amount_check', sql`${table.targetAmount} > 0`),
    check('saving_goals_current_amount_check', sql`${table.currentAmount} >= 0`),
    pgPolicy('saving_goals_select_member', {
      for: 'select',
      to: authenticatedRole,
      using: sql`public.is_family_member(${table.familyId})`,
    }),
    pgPolicy('saving_goals_insert_manager', {
      for: 'insert',
      to: authenticatedRole,
      withCheck: sql`public.is_family_admin_or_owner(${table.familyId})`,
    }),
    pgPolicy('saving_goals_update_manager', {
      for: 'update',
      to: authenticatedRole,
      using: sql`public.is_family_admin_or_owner(${table.familyId})`,
      withCheck: sql`public.is_family_admin_or_owner(${table.familyId})`,
    }),
    pgPolicy('saving_goals_delete_manager', {
      for: 'delete',
      to: authenticatedRole,
      using: sql`public.is_family_admin_or_owner(${table.familyId})`,
    }),
  ]
).enableRLS();

export const savingGoalTransactions = pgTable(
  'saving_goal_transactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    savingGoalId: uuid('saving_goal_id').notNull(),
    amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
    transactionDate: date('transaction_date').notNull(),
    note: text('note'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({ name: 'saving_goal_transactions_saving_goal_id_fkey', columns: [table.savingGoalId], foreignColumns: [savingGoals.id] }).onDelete('cascade'),
    check('saving_goal_transactions_amount_check', sql`${table.amount} > 0`),
    pgPolicy('saving_goal_transactions_select_member', {
      for: 'select',
      to: authenticatedRole,
      using: sql`exists (select 1 from public.saving_goals sg where sg.id = ${table.savingGoalId} and public.is_family_member(sg.family_id))`,
    }),
    pgPolicy('saving_goal_transactions_insert_manager', {
      for: 'insert',
      to: authenticatedRole,
      withCheck: sql`exists (select 1 from public.saving_goals sg where sg.id = ${table.savingGoalId} and public.is_family_admin_or_owner(sg.family_id))`,
    }),
    pgPolicy('saving_goal_transactions_update_manager', {
      for: 'update',
      to: authenticatedRole,
      using: sql`exists (select 1 from public.saving_goals sg where sg.id = ${table.savingGoalId} and public.is_family_admin_or_owner(sg.family_id))`,
      withCheck: sql`exists (select 1 from public.saving_goals sg where sg.id = ${table.savingGoalId} and public.is_family_admin_or_owner(sg.family_id))`,
    }),
    pgPolicy('saving_goal_transactions_delete_manager', {
      for: 'delete',
      to: authenticatedRole,
      using: sql`exists (select 1 from public.saving_goals sg where sg.id = ${table.savingGoalId} and public.is_family_admin_or_owner(sg.family_id))`,
    }),
  ]
).enableRLS();

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    familyId: uuid('family_id').notNull(),
    userId: uuid('user_id'),
    type: text('type').notNull().default('general'),
    title: text('title').notNull(),
    message: text('message'),
    target: text('target').notNull().default('dashboard'),
    readAt: timestamp('read_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({ name: 'notifications_family_id_fkey', columns: [table.familyId], foreignColumns: [families.id] }).onDelete('cascade'),
    foreignKey({ name: 'notifications_user_id_fkey', columns: [table.userId], foreignColumns: [profiles.id] }).onDelete('cascade'),
    index('notifications_family_created_idx').on(table.familyId, desc(table.createdAt)),
    index('notifications_user_read_idx').on(table.userId, table.readAt),
    check('notifications_title_check', sql`length(btrim(${table.title})) > 0`),
    pgPolicy('notifications_select_member', {
      for: 'select',
      to: authenticatedRole,
      using: sql`public.is_family_member(${table.familyId}) and (${table.userId} is null or ${table.userId} = auth.uid())`,
    }),
    pgPolicy('notifications_insert_member', {
      for: 'insert',
      to: authenticatedRole,
      withCheck: sql`public.is_family_member(${table.familyId}) and (${table.userId} is null or exists (select 1 from public.family_members fm where fm.family_id = ${table.familyId} and fm.user_id = ${table.userId}))`,
    }),
    pgPolicy('notifications_update_recipient', {
      for: 'update',
      to: authenticatedRole,
      using: sql`public.is_family_member(${table.familyId}) and (${table.userId} is null or ${table.userId} = auth.uid())`,
      withCheck: sql`public.is_family_member(${table.familyId}) and (${table.userId} is null or ${table.userId} = auth.uid())`,
    }),
  ]
).enableRLS();

export const pushSubscriptions = pgTable(
  'push_subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(),
    familyId: uuid('family_id').notNull(),
    endpoint: text('endpoint').notNull(),
    p256dh: text('p256dh').notNull(),
    auth: text('auth').notNull(),
    expirationTime: timestamp('expirationTime', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({ name: 'push_subscriptions_user_id_fkey', columns: [table.userId], foreignColumns: [profiles.id] }).onDelete('cascade'),
    foreignKey({ name: 'push_subscriptions_family_id_fkey', columns: [table.familyId], foreignColumns: [families.id] }).onDelete('cascade'),
    uniqueIndex('push_subscriptions_endpoint_unique_idx').on(table.endpoint),
    index('push_subscriptions_user_id_idx').on(table.userId),
    index('push_subscriptions_family_id_idx').on(table.familyId),
    index('push_subscriptions_family_user_idx').on(table.familyId, table.userId),
    check('push_subscriptions_endpoint_check', sql`length(btrim(${table.endpoint})) > 0`),
    check('push_subscriptions_p256dh_check', sql`length(btrim(${table.p256dh})) > 0`),
    check('push_subscriptions_auth_check', sql`length(btrim(${table.auth})) > 0`),
    pgPolicy('push_subscriptions_select_own', {
      for: 'select',
      to: authenticatedRole,
      using: sql`${table.userId} = auth.uid()`,
    }),
    pgPolicy('push_subscriptions_insert_own', {
      for: 'insert',
      to: authenticatedRole,
      withCheck: sql`${table.userId} = auth.uid() and public.is_family_member(${table.familyId})`,
    }),
    pgPolicy('push_subscriptions_update_own', {
      for: 'update',
      to: authenticatedRole,
      using: sql`${table.userId} = auth.uid()`,
      withCheck: sql`${table.userId} = auth.uid()`,
    }),
    pgPolicy('push_subscriptions_delete_own', {
      for: 'delete',
      to: authenticatedRole,
      using: sql`${table.userId} = auth.uid()`,
    }),
  ]
).enableRLS();
