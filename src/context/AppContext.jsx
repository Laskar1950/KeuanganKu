import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient.js';
import {
  toAccount,
  toBudget,
  toCategory,
  toFamilyMember,
  toHousehold,
  toProfile,
  toSavingGoal,
  toTransaction,
} from '../lib/mappers.js';
import { calculateAccountBalance, getBudgetUsage, getMonthTransactions } from '../utils/calculations.js';

const AppContext = createContext(null);

const emptyState = {
  session: null,
  user: null,
  household: null,
  familyMembers: [],
  categories: [],
  accounts: [],
  transactions: [],
  budgets: [],
  savingGoals: [],
};

function requireSupabaseEnv() {
  if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
    throw new Error('Konfigurasi Supabase belum lengkap. Isi file .env.local terlebih dahulu.');
  }
}

function assertOwner(member) {
  if (member?.role !== 'owner') {
    throw new Error('Aksi ini hanya bisa dilakukan oleh owner keluarga.');
  }
}

function getTransactionCycle(dateString) {
  const [year, month] = String(dateString || '').split('-').map(Number);
  return { month, year };
}

export function AppProvider({ children }) {
  const [state, setState] = useState(emptyState);
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const notify = (message) => setToast(message);

  const fetchProfile = useCallback(async (authUser) => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', authUser.id).maybeSingle();
    if (error) throw error;
    return toProfile(data, authUser);
  }, []);

  const fetchHousehold = useCallback(async () => {
    const { data: membership, error: membershipError } = await supabase
      .from('family_members')
      .select('family_id, families(*)')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (membershipError) throw membershipError;
    return membership?.families ? toHousehold(membership.families) : null;
  }, []);

  const clearInvalidSession = useCallback(async () => {
    await supabase.auth.signOut();
    setState(emptyState);
  }, []);

  const refreshData = useCallback(async (sessionOverride = null) => {
    requireSupabaseEnv();
    setLoading(true);

    try {
      const session = sessionOverride ?? (await supabase.auth.getSession()).data.session;

      if (!session?.user) {
        setState(emptyState);
        return;
      }

      const { data: authUserData, error: authUserError } = await supabase.auth.getUser();

      if (authUserError || !authUserData?.user?.id) {
        await clearInvalidSession();
        return;
      }

      const authUser = authUserData.user;
      const user = await fetchProfile(authUser);
      const household = await fetchHousehold();

      if (!household) {
        setState({ ...emptyState, session, user });
        return;
      }

      const [membersRes, categoriesRes, accountsRes, transactionsRes, budgetsRes, goalsRes] = await Promise.all([
        supabase
          .from('family_members')
          .select('*, profiles(id, name, email, avatar_url, created_at)')
          .eq('family_id', household.id)
          .order('created_at', { ascending: true }),

        supabase
          .from('categories')
          .select('*')
          .or(`family_id.eq.${household.id},family_id.is.null`)
          .order('is_default', { ascending: false })
          .order('name', { ascending: true }),

        supabase
          .from('accounts')
          .select('*')
          .eq('family_id', household.id)
          .order('created_at', { ascending: true }),

        supabase
          .from('transactions')
          .select('*, profiles(id, name, email, avatar_url, created_at)')
          .eq('family_id', household.id)
          .order('transaction_date', { ascending: false })
          .order('created_at', { ascending: false }),

        supabase
          .from('budgets')
          .select('*')
          .eq('family_id', household.id)
          .order('year', { ascending: false })
          .order('month', { ascending: false }),

        supabase
          .from('saving_goals')
          .select('*')
          .eq('family_id', household.id)
          .order('created_at', { ascending: false }),
      ]);

      const error = membersRes.error || categoriesRes.error || accountsRes.error || transactionsRes.error || budgetsRes.error || goalsRes.error;
      if (error) throw error;

      setState({
        session,
        user,
        household,
        familyMembers: membersRes.data.map(toFamilyMember),
        categories: categoriesRes.data.map(toCategory),
        accounts: accountsRes.data.map(toAccount),
        transactions: transactionsRes.data.map(toTransaction),
        budgets: budgetsRes.data.map(toBudget),
        savingGoals: goalsRes.data.map(toSavingGoal),
      });
    } finally {
      setLoading(false);
    }
  }, [clearInvalidSession, fetchHousehold, fetchProfile]);

  useEffect(() => {
    let mounted = true;

    const boot = async () => {
      try {
        requireSupabaseEnv();
        const { data } = await supabase.auth.getSession();
        if (mounted) await refreshData(data.session);
      } catch (error) {
        setLoading(false);
        notify(error.message);
      }
    };

    boot();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      refreshData(session).catch((error) => notify(error.message));
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [refreshData]);

  const register = async ({ name, email, password }) => {
    requireSupabaseEnv();

    if (!name || !email || !password) throw new Error('Nama, email, dan password wajib diisi.');
    if (password.length < 6) throw new Error('Password minimal 6 karakter.');

    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name } } });
    if (error) throw error;

    if (data.user) await supabase.from('profiles').upsert({ id: data.user.id, name, email });
    notify('Registrasi berhasil. Silakan login atau cek email jika konfirmasi email aktif.');
  };

  const login = async ({ email, password }) => {
    requireSupabaseEnv();
    if (!email || !password) throw new Error('Email dan password wajib diisi.');

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    await refreshData(data.session);
    notify('Login berhasil.');
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;

    setState(emptyState);
    notify('Anda berhasil logout.');
  };

  const loginDemo = async () => {
    notify('Mode demo lokal sudah diganti ke Supabase. Silakan register/login dengan akun Supabase.');
  };

  const completeOnboarding = async ({ householdName, accountName, accountType, initialBalance }) => {
    if (!state.user?.id) throw new Error('Sesi login tidak ditemukan. Silakan login ulang.');
    if (!householdName || !accountName) throw new Error('Nama keluarga dan akun/dompet wajib diisi.');

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;

    const authUser = authData.user;
    if (!authUser?.id) throw new Error('Sesi login tidak ditemukan. Silakan login ulang.');

    const { error: profileError } = await supabase.from('profiles').upsert({
      id: authUser.id,
      name: state.user?.name || authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'Pengguna',
      email: authUser.email,
    });
    if (profileError) throw profileError;

    const { data: family, error: familyError } = await supabase
      .from('families')
      .insert({ name: householdName, owner_user_id: authUser.id })
      .select('*')
      .single();
    if (familyError) throw familyError;

    const { error: memberError } = await supabase.from('family_members').insert({
      family_id: family.id,
      user_id: authUser.id,
      role: 'owner',
    });
    if (memberError) throw memberError;

    const { error: accountError } = await supabase.from('accounts').insert({
      family_id: family.id,
      name: accountName,
      type: accountType || 'cash',
      initial_balance: Number(initialBalance || 0),
      is_active: true,
    });
    if (accountError) throw accountError;

    notify('Keluarga berhasil dibuat. Anda sekarang menjadi owner keluarga.');
    await refreshData();
  };

  const joinFamilyByInviteCode = async (inviteCode) => {
    if (!state.user?.id) throw new Error('Sesi login tidak ditemukan. Silakan login ulang.');
    if (!inviteCode?.trim()) throw new Error('Kode undangan wajib diisi.');

    const { error } = await supabase.rpc('join_family_by_invite_code', { p_invite_code: inviteCode.trim() });
    if (error) throw error;

    notify('Berhasil bergabung ke keluarga.');
    await refreshData();
  };

  const copyInviteCode = async () => {
    const code = state.household?.inviteCode;
    if (!code) {
      notify('Kode undangan belum tersedia. Pastikan migration invite sudah dijalankan.');
      return;
    }
    await navigator.clipboard.writeText(code);
    notify('Kode undangan keluarga berhasil disalin.');
  };

  const getAllocationForTransaction = (payload, ignoreTransactionId = null) => {
    if (payload.type !== 'expense') return null;
    if (!payload.budgetId) throw new Error('Pengeluaran wajib memilih alokasi anggaran.');

    const budget = state.budgets.find((item) => item.id === payload.budgetId);
    if (!budget) throw new Error('Alokasi anggaran tidak ditemukan. Pilih ulang alokasi.');
    if (!budget.accountId) throw new Error('Alokasi belum memiliki sumber dompet. Edit atau buat ulang alokasi.');

    const trxCycle = getTransactionCycle(payload.transactionDate);
    if (budget.month !== trxCycle.month || budget.year !== trxCycle.year) {
      throw new Error('Alokasi anggaran tidak sesuai dengan bulan transaksi. Pilih alokasi atau tanggal yang sesuai.');
    }

    const monthTransactions = getMonthTransactions(state.transactions, budget.month, budget.year)
      .filter((trx) => trx.id !== ignoreTransactionId);
    const usage = getBudgetUsage(budget, monthTransactions);
    const remaining = Number(usage.remaining || 0);
    const amount = Number(payload.amount || 0);

    if (amount > remaining) {
      throw new Error(`Nominal melebihi sisa alokasi. Sisa alokasi saat ini Rp${remaining.toLocaleString('id-ID')}.`);
    }

    return budget;
  };

  const addTransaction = async (payload) => {
    if (!payload.amount || Number(payload.amount) <= 0) throw new Error('Nominal transaksi wajib lebih besar dari 0.');
    if (!payload.transactionDate) throw new Error('Tanggal transaksi wajib dipilih.');

    const budget = getAllocationForTransaction(payload);
    const isExpense = payload.type === 'expense';
    const accountId = isExpense ? budget.accountId : payload.accountId;
    const categoryId = isExpense ? null : payload.categoryId;

    if (!accountId) throw new Error('Akun/dompet wajib dipilih.');
    if (!isExpense && !categoryId) throw new Error('Kategori pemasukan wajib dipilih.');

    const { error } = await supabase.from('transactions').insert({
      family_id: state.household.id,
      account_id: accountId,
      category_id: categoryId,
      budget_id: isExpense ? budget.id : null,
      created_by: state.user.id,
      type: payload.type,
      amount: Number(payload.amount),
      transaction_date: payload.transactionDate,
      note: payload.note || null,
    });
    if (error) throw error;

    notify(isExpense ? 'Pengeluaran berhasil disimpan, alokasi dan saldo dompet otomatis berkurang.' : 'Transaksi berhasil disimpan.');
    await refreshData();
  };

  const updateTransaction = async (id, payload) => {
    if (!payload.amount || Number(payload.amount) <= 0) throw new Error('Nominal transaksi wajib lebih besar dari 0.');
    if (!payload.transactionDate) throw new Error('Tanggal transaksi wajib dipilih.');

    const budget = getAllocationForTransaction(payload, id);
    const isExpense = payload.type === 'expense';
    const accountId = isExpense ? budget.accountId : payload.accountId;
    const categoryId = isExpense ? null : payload.categoryId;

    if (!accountId) throw new Error('Akun/dompet wajib dipilih.');
    if (!isExpense && !categoryId) throw new Error('Kategori pemasukan wajib dipilih.');

    const { error } = await supabase
      .from('transactions')
      .update({
        account_id: accountId,
        category_id: categoryId,
        budget_id: isExpense ? budget.id : null,
        type: payload.type,
        amount: Number(payload.amount),
        transaction_date: payload.transactionDate,
        note: payload.note || null,
      })
      .eq('id', id);
    if (error) throw error;

    notify(isExpense ? 'Pengeluaran berhasil diperbarui, alokasi dan saldo dompet ikut disesuaikan.' : 'Transaksi berhasil diperbarui.');
    await refreshData();
  };

  const deleteTransaction = async (id) => {
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) throw error;

    notify('Transaksi berhasil dihapus.');
    await refreshData();
  };

  const currentMember = useMemo(() => {
    return state.familyMembers.find((member) => member.userId === state.user?.id) || null;
  }, [state.familyMembers, state.user?.id]);

  const addAccount = async (payload) => {
    assertOwner(currentMember);
    if (!payload.name) throw new Error('Nama akun/dompet wajib diisi.');

    const { error } = await supabase.from('accounts').insert({
      family_id: state.household.id,
      name: payload.name,
      type: payload.type || 'cash',
      initial_balance: Number(payload.initialBalance || 0),
      is_active: true,
    });
    if (error) throw error;

    notify('Akun/dompet berhasil ditambahkan.');
    await refreshData();
  };

  const updateAccount = async (id, payload) => {
    assertOwner(currentMember);
    if (!payload.name) throw new Error('Nama akun/dompet wajib diisi.');

    const { error } = await supabase
      .from('accounts')
      .update({ name: payload.name, type: payload.type || 'cash', initial_balance: Number(payload.initialBalance || 0) })
      .eq('id', id)
      .eq('family_id', state.household.id);
    if (error) throw error;

    notify('Akun/dompet berhasil diperbarui.');
    await refreshData();
  };

  const toggleAccount = async (id) => {
    assertOwner(currentMember);
    const account = state.accounts.find((item) => item.id === id);

    const { error } = await supabase
      .from('accounts')
      .update({ is_active: !account?.isActive })
      .eq('id', id)
      .eq('family_id', state.household.id);
    if (error) throw error;

    notify('Status akun/dompet diperbarui.');
    await refreshData();
  };

  const addCategory = async (payload) => {
    assertOwner(currentMember);
    if (!payload.name?.trim()) throw new Error('Nama kategori wajib diisi.');

    const { data, error } = await supabase
      .from('categories')
      .insert({
        family_id: state.household.id,
        name: payload.name.trim(),
        type: payload.type || 'expense',
        is_default: false,
      })
      .select('*')
      .single();
    if (error) throw error;

    const category = toCategory(data);
    notify('Kategori berhasil ditambahkan.');
    await refreshData();
    return category;
  };

  const deleteCategory = async (id) => {
    assertOwner(currentMember);
    const category = state.categories.find((item) => item.id === id);
    if (!category) throw new Error('Kategori tidak ditemukan.');
    if (category.isDefault || !category.familyId) throw new Error('Kategori bawaan tidak bisa dihapus.');

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id)
      .eq('family_id', state.household.id)
      .eq('is_default', false);
    if (error) throw error;

    notify('Kategori berhasil dihapus.');
    await refreshData();
  };

  const addBudget = async (payload) => {
    if (!payload.name?.trim()) throw new Error('Nama alokasi wajib diisi.');
    if (!payload.amount || Number(payload.amount) <= 0) throw new Error('Nominal alokasi wajib lebih besar dari 0.');
    if (!payload.accountId) throw new Error('Sumber anggaran/dompet wajib dipilih.');

    const account = state.accounts.find((item) => item.id === payload.accountId && item.isActive);
    if (!account) throw new Error('Sumber anggaran/dompet tidak aktif atau tidak ditemukan.');

    const duplicate = state.budgets.find((budget) =>
      budget.name?.trim().toLowerCase() === payload.name.trim().toLowerCase() &&
      budget.month === Number(payload.month) &&
      budget.year === Number(payload.year)
    );
    if (duplicate) throw new Error('Nama alokasi ini sudah digunakan untuk bulan tersebut.');

    const { error } = await supabase.from('budgets').insert({
      family_id: state.household.id,
      name: payload.name.trim(),
      account_id: payload.accountId,
      category_id: null,
      month: Number(payload.month),
      year: Number(payload.year),
      amount: Number(payload.amount),
      note: payload.note || null,
    });
    if (error) throw error;

    notify('Alokasi anggaran berhasil dibuat.');
    await refreshData();
  };

  const deleteBudget = async (id) => {
    const { error } = await supabase.from('budgets').delete().eq('id', id);
    if (error) throw error;

    notify('Alokasi anggaran berhasil dihapus.');
    await refreshData();
  };

  const addSavingGoal = async (payload) => {
    if (!payload.name || !payload.targetAmount) throw new Error('Nama target dan nominal target wajib diisi.');

    const { error } = await supabase.from('saving_goals').insert({
      family_id: state.household.id,
      name: payload.name,
      target_amount: Number(payload.targetAmount),
      current_amount: Number(payload.currentAmount || 0),
      target_date: payload.targetDate || null,
      note: payload.note || null,
      status: 'active',
    });
    if (error) throw error;

    notify('Target tabungan berhasil dibuat.');
    await refreshData();
  };

  const depositSavingGoal = async (id, amount) => {
    if (!id) throw new Error('Pilih target tabungan terlebih dahulu.');
    if (!amount || Number(amount) <= 0) throw new Error('Nominal setoran wajib lebih besar dari 0.');

    const goal = state.savingGoals.find((item) => item.id === id);
    if (!goal) throw new Error('Target tabungan tidak ditemukan.');
    const nextAmount = Number(goal.currentAmount) + Number(amount);

    const { error: depositError } = await supabase.from('saving_goal_transactions').insert({
      saving_goal_id: id,
      amount: Number(amount),
      transaction_date: new Date().toISOString().slice(0, 10),
      note: 'Setoran dari aplikasi',
    });
    if (depositError) throw depositError;

    const { error: goalError } = await supabase
      .from('saving_goals')
      .update({ current_amount: nextAmount, status: nextAmount >= Number(goal.targetAmount) ? 'completed' : goal.status })
      .eq('id', id);
    if (goalError) throw goalError;

    notify('Setoran tabungan berhasil ditambahkan.');
    await refreshData();
  };

  const accountBalances = useMemo(() => {
    return state.accounts.map((account) => ({ ...account, currentBalance: calculateAccountBalance(account, state.transactions) }));
  }, [state.accounts, state.transactions]);

  const value = {
    ...state,
    loading,
    accountBalances,
    currentMember,
    toast,
    notify,
    refreshData,
    register,
    login,
    loginDemo,
    logout,
    completeOnboarding,
    joinFamilyByInviteCode,
    copyInviteCode,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    addAccount,
    updateAccount,
    toggleAccount,
    addCategory,
    deleteCategory,
    addBudget,
    deleteBudget,
    addSavingGoal,
    depositSavingGoal,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp harus digunakan di dalam AppProvider.');
  return ctx;
}
