import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient.js';
import { toAccount, toBudget, toCategory, toHousehold, toProfile, toSavingGoal, toTransaction } from '../lib/mappers.js';
import { calculateAccountBalance } from '../utils/calculations.js';

const AppContext = createContext(null);

const emptyState = {
  session: null,
  user: null,
  household: null,
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

export function AppProvider({ children }) {
  const [state, setState] = useState(emptyState);
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 2800);
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

  const refreshData = useCallback(async (sessionOverride = null) => {
    requireSupabaseEnv();
    setLoading(true);
    try {
      const session = sessionOverride ?? (await supabase.auth.getSession()).data.session;
      if (!session?.user) {
        setState(emptyState);
        return;
      }

      const user = await fetchProfile(session.user);
      const household = await fetchHousehold();

      if (!household) {
        setState({ ...emptyState, session, user });
        return;
      }

      const [categoriesRes, accountsRes, transactionsRes, budgetsRes, goalsRes] = await Promise.all([
        supabase
          .from('categories')
          .select('*')
          .or(`family_id.eq.${household.id},family_id.is.null`)
          .order('is_default', { ascending: false })
          .order('name', { ascending: true }),
        supabase.from('accounts').select('*').eq('family_id', household.id).order('created_at', { ascending: true }),
        supabase.from('transactions').select('*').eq('family_id', household.id).order('transaction_date', { ascending: false }).order('created_at', { ascending: false }),
        supabase.from('budgets').select('*').eq('family_id', household.id).order('year', { ascending: false }).order('month', { ascending: false }),
        supabase.from('saving_goals').select('*').eq('family_id', household.id).order('created_at', { ascending: false }),
      ]);

      const error = categoriesRes.error || accountsRes.error || transactionsRes.error || budgetsRes.error || goalsRes.error;
      if (error) throw error;

      setState({
        session,
        user,
        household,
        categories: categoriesRes.data.map(toCategory),
        accounts: accountsRes.data.map(toAccount),
        transactions: transactionsRes.data.map(toTransaction),
        budgets: budgetsRes.data.map(toBudget),
        savingGoals: goalsRes.data.map(toSavingGoal),
      });
    } finally {
      setLoading(false);
    }
  }, [fetchHousehold, fetchProfile]);

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

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    if (error) throw error;

    if (data.user) {
      await supabase.from('profiles').upsert({ id: data.user.id, name, email });
    }

    notify('Registrasi berhasil. Jika email confirmation aktif, cek email Anda sebelum login.');
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

    const { data: family, error: familyError } = await supabase
      .from('families')
      .insert({ name: householdName, owner_user_id: state.user.id })
      .select('*')
      .single();
    if (familyError) throw familyError;

    const { error: memberError } = await supabase
      .from('family_members')
      .insert({ family_id: family.id, user_id: state.user.id, role: 'owner' });
    if (memberError) throw memberError;

    const { error: accountError } = await supabase.from('accounts').insert({
      family_id: family.id,
      name: accountName,
      type: accountType || 'cash',
      initial_balance: Number(initialBalance || 0),
      is_active: true,
    });
    if (accountError) throw accountError;

    notify('Onboarding selesai. Data awal tersimpan di Supabase.');
    await refreshData();
  };

  const addTransaction = async (payload) => {
    if (!payload.amount || Number(payload.amount) <= 0) throw new Error('Nominal transaksi wajib lebih besar dari 0.');
    if (!payload.transactionDate || !payload.categoryId || !payload.accountId) throw new Error('Tanggal, kategori, dan akun/dompet wajib dipilih.');
    const { error } = await supabase.from('transactions').insert({
      family_id: state.household.id,
      account_id: payload.accountId,
      category_id: payload.categoryId,
      created_by: state.user.id,
      type: payload.type,
      amount: Number(payload.amount),
      transaction_date: payload.transactionDate,
      note: payload.note || null,
    });
    if (error) throw error;
    notify('Transaksi berhasil disimpan.');
    await refreshData();
  };

  const updateTransaction = async (id, payload) => {
    if (!payload.amount || Number(payload.amount) <= 0) throw new Error('Nominal transaksi wajib lebih besar dari 0.');
    const { error } = await supabase.from('transactions').update({
      account_id: payload.accountId,
      category_id: payload.categoryId,
      type: payload.type,
      amount: Number(payload.amount),
      transaction_date: payload.transactionDate,
      note: payload.note || null,
    }).eq('id', id);
    if (error) throw error;
    notify('Transaksi berhasil diperbarui.');
    await refreshData();
  };

  const deleteTransaction = async (id) => {
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) throw error;
    notify('Transaksi berhasil dihapus.');
    await refreshData();
  };

  const addAccount = async (payload) => {
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

  const toggleAccount = async (id) => {
    const account = state.accounts.find((item) => item.id === id);
    const { error } = await supabase.from('accounts').update({ is_active: !account?.isActive }).eq('id', id);
    if (error) throw error;
    notify('Status akun/dompet diperbarui.');
    await refreshData();
  };

  const addBudget = async (payload) => {
    if (!payload.categoryId || !payload.amount) throw new Error('Kategori dan nominal anggaran wajib diisi.');
    const { error } = await supabase.from('budgets').insert({
      family_id: state.household.id,
      category_id: payload.categoryId,
      month: Number(payload.month),
      year: Number(payload.year),
      amount: Number(payload.amount),
    });
    if (error) throw error;
    notify('Anggaran berhasil dibuat.');
    await refreshData();
  };

  const deleteBudget = async (id) => {
    const { error } = await supabase.from('budgets').delete().eq('id', id);
    if (error) throw error;
    notify('Anggaran berhasil dihapus.');
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

    const { error: goalError } = await supabase.from('saving_goals').update({
      current_amount: nextAmount,
      status: nextAmount >= Number(goal.targetAmount) ? 'completed' : goal.status,
    }).eq('id', id);
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
    toast,
    notify,
    refreshData,
    register,
    login,
    loginDemo,
    logout,
    completeOnboarding,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    addAccount,
    toggleAccount,
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
