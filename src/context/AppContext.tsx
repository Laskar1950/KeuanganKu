import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import { copyToClipboard } from "@/lib/utils";
import {
  toAccount,
  toBudget,
  toCategory,
  toFamilyMember,
  toHousehold,
  toNotification,
  toProfile,
  toSavingGoal,
  toTransaction,
} from "@/lib/mappers";
import { calculateAccountBalance, getBudgetUsage } from "@/utils/calculations";
import { getBudgetCycle, getBudgetCycleTransactions } from "@/utils/budgetCycle";
import { toLocalDateKey } from "@/utils/format";
import { getPermissions, isManagerRole, type Permissions } from "@/utils/permissions";
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

const TRANSACTION_WINDOW = 500;

const TRANSACTION_COLUMNS =
  "id, family_id, account_id, category_id, budget_id, created_by, type, amount, transaction_date, note, created_at, updated_at, profiles(id, name, username, email, avatar_url, created_at)";

export interface AppState {
  session: Session | null;
  user: UserProfile | null;
  household: Household | null;
  familyMembers: FamilyMember[];
  categories: Category[];
  accounts: Account[];
  transactions: Transaction[];
  transactionsHasMore: boolean;
  accountBalanceMap: Record<string, number>;
  budgets: Budget[];
  savingGoals: SavingGoal[];
  notifications: AppNotification[];
}

export interface AccountBalance extends Account {
  currentBalance: number;
}

export interface TransactionPayload {
  type: "income" | "expense";
  amount: number | string;
  transactionDate: string;
  note?: string | null;
  accountId?: string | null;
  categoryId?: string | null;
  budgetId?: string | null;
}

export interface BudgetPayload {
  name: string;
  amount: number | string;
  accountId: string;
  month: number | string;
  year: number | string;
  note?: string | null;
}

export interface AccountPayload {
  name: string;
  type?: string;
  initialBalance?: number | string;
}

export interface OnboardingPayload {
  householdName: string;
  accountName: string;
  accountType?: string;
  initialBalance?: number | string;
}

export interface SavingGoalPayload {
  name: string;
  targetAmount: number | string;
  currentAmount?: number | string;
  targetDate?: string | null;
  note?: string | null;
}

export interface NotificationPayload {
  type?: string;
  title: string;
  message?: string;
  target?: string;
  userId?: string | null;
}

export interface AppContextValue extends AppState {
  loading: boolean;
  toast: string;
  accountBalances: AccountBalance[];
  currentMember: FamilyMember | null;
  permissions: Permissions;
  notify: (message: string) => void;
  refreshData: (sessionOverride?: Session | null, options?: { silent?: boolean }) => Promise<void>;
  requestNotificationPermission: () => Promise<NotificationPermission | "unsupported">;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  login: (payload: { email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  completeOnboarding: (payload: OnboardingPayload) => Promise<void>;
  joinFamilyByInviteCode: (inviteCode: string) => Promise<void>;
  copyInviteCode: () => Promise<void>;
  addTransaction: (payload: TransactionPayload) => Promise<void>;
  updateTransaction: (id: string, payload: TransactionPayload) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  addFamilyMemberByIdentifier: (payload: { identifier: string; role?: string }) => Promise<void>;
  updateFamilyMemberRole: (memberId: string, role: string) => Promise<void>;
  removeFamilyMember: (memberId: string) => Promise<void>;
  addAccount: (payload: AccountPayload) => Promise<void>;
  updateAccount: (id: string, payload: AccountPayload) => Promise<void>;
  toggleAccount: (id: string) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  addCategory: (payload: { name: string; type?: string }) => Promise<Category | null>;
  deleteCategory: (id: string) => Promise<void>;
  addBudget: (payload: BudgetPayload) => Promise<void>;
  updateBudget: (id: string, payload: BudgetPayload) => Promise<void>;
  deleteBudget: (id: string) => Promise<void>;
  addSavingGoal: (payload: SavingGoalPayload) => Promise<void>;
  depositSavingGoal: (id: string, amount: number | string) => Promise<void>;
  loadMoreTransactions: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

const emptyState: AppState = {
  session: null,
  user: null,
  household: null,
  familyMembers: [],
  categories: [],
  accounts: [],
  transactions: [],
  transactionsHasMore: false,
  accountBalanceMap: {},
  budgets: [],
  savingGoals: [],
  notifications: [],
};

function getErrorMessage(error: unknown, fallback = "Terjadi kesalahan. Coba lagi.") {
  return error instanceof Error ? error.message : fallback;
}

function isInvalidSessionError(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  return error.code === "PGRST301" || /jwt|token is expired|invalid.*token/i.test(error.message || "");
}

function requireSupabaseEnv() {
  if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
    throw new Error("Konfigurasi Supabase belum lengkap. Isi file .env.local terlebih dahulu.");
  }
}

function assertOwnerOrAdmin(member: FamilyMember | null) {
  if (!isManagerRole(member)) {
    throw new Error("Aksi ini hanya bisa dilakukan oleh owner atau admin keluarga.");
  }
}

type TransactionCreatorFields = Partial<Transaction> & {
  created_by?: string;
  user_id?: string;
  userId?: string;
};

function getTransactionCreatorId(transaction?: TransactionCreatorFields | null) {
  return transaction?.createdBy || transaction?.created_by || transaction?.userId || transaction?.user_id || null;
}

function assertCanUpdateTransaction(
  member: FamilyMember | null,
  transaction: Transaction | undefined,
  userId?: string
) {
  if (!transaction) throw new Error("Transaksi tidak ditemukan.");
  if (isManagerRole(member)) return;
  if (getTransactionCreatorId(transaction) === userId) return;
  throw new Error("Anda hanya bisa mengubah transaksi yang Anda buat sendiri.");
}

function assertCanDeleteTransaction(member: FamilyMember | null) {
  if (!isManagerRole(member)) {
    throw new Error("Hanya owner atau admin yang bisa menghapus transaksi.");
  }
}

function getTransactionCycle(dateString: string) {
  return getBudgetCycle(dateString);
}

function formatCurrency(amount: number | string) {
  return `Rp${Number(amount || 0).toLocaleString("id-ID")}`;
}

function tryPlayNotificationSound() {
  try {
    const raw = localStorage.getItem("keuanganku-notif-sound");
    const enabled = raw === null ? true : raw !== "0" && raw !== "false";
    if (!enabled) {
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        try { (navigator as unknown as { vibrate: (p: number[]) => void }).vibrate([90, 40, 90]); } catch { /* noop */ }
      }
      return;
    }
    // Inline lightweight chime (mirrors @/utils/notificationSound) to avoid circular deps
    const AudioCtx =
      (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (AudioCtx) {
      const ctx = new AudioCtx();
      if (ctx.state === "suspended") ctx.resume().catch(() => {});
      const now = ctx.currentTime;
      const master = ctx.createGain();
      master.gain.value = 0.72;
      master.connect(ctx.destination);
      const tone = (freq: number, offset: number, dur: number, type: OscillatorType, peak: number) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = type;
        o.frequency.value = freq;
        g.gain.setValueAtTime(0, now + offset);
        g.gain.linearRampToValueAtTime(peak, now + offset + 0.02);
        g.gain.exponentialRampToValueAtTime(0.01, now + offset + dur);
        o.connect(g);
        g.connect(master);
        o.start(now + offset);
        o.stop(now + offset + dur + 0.05);
      };
      tone(880, 0, 0.24, "sine", 0.9);
      tone(659.25, 0.14, 0.32, "triangle", 0.68);
      try { if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate([90, 40, 90]); } catch { /* noop */ }
      window.setTimeout(() => { try { ctx.close().catch(() => {}); } catch { /* noop */ } }, 1100);
    } else if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try { navigator.vibrate([90, 40, 90]); } catch { /* noop */ }
    }
  } catch {
    // ignore sound failures entirely
  }
}

function showBrowserNotification(title: string, message?: string) {
  // Always attempt sound/vibrate even if Notification blocked, to satisfy "test with sound" expectation
  tryPlayNotificationSound();
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (window.Notification.permission !== "granted") return;
  try {
    new window.Notification(title, {
      body: message || "Ada aktivitas baru di KeuanganKu.",
      icon: "/pwa-192x192.png",
      badge: "/pwa-192x192.png",
      tag: "keuanganku-activity",
    });
  } catch {
    // Browser notification is optional. Ignore failures silently.
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(emptyState);
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(true);
  const refreshInFlightRef = useRef(false);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(""), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const notify = (message: string) => setToast(message);

  const fetchProfile = useCallback(async (authUser: User): Promise<UserProfile> => {
    const { data, error } = await supabase.from("profiles").select("*").eq("id", authUser.id).maybeSingle();
    if (error) throw error;
    return toProfile(data, authUser);
  }, []);

  const fetchHousehold = useCallback(async (): Promise<Household | null> => {
    const { data: membership, error: membershipError } = await supabase
      .from("family_members")
      .select("family_id, families(*)")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (membershipError) throw membershipError;
    return membership?.families ? toHousehold(membership.families) : null;
  }, []);

  const clearInvalidSession = useCallback(async () => {
    await supabase.auth.signOut();
    setState(emptyState);
  }, []);

  const refreshData = useCallback(
    async (sessionOverride: Session | null = null, { silent = false }: { silent?: boolean } = {}) => {
      requireSupabaseEnv();
      if (!silent) setLoading(true);
      refreshInFlightRef.current = true;

      try {
        const session = sessionOverride ?? (await supabase.auth.getSession()).data.session;

        if (!session?.user) {
          setState(emptyState);
          return;
        }

        const authUser = session.user;
        const [user, household] = await Promise.all([fetchProfile(authUser), fetchHousehold()]);

        if (!household) {
          setState({ ...emptyState, session, user });
          return;
        }

        const [membersRes, categoriesRes, accountsRes, transactionsRes, budgetsRes, goalsRes, notificationsRes, balancesRes] =
          await Promise.all([
            supabase
              .from("family_members")
              .select("id, family_id, user_id, role, created_at, profiles(id, name, username, email, avatar_url, created_at)")
              .eq("family_id", household.id)
              .order("created_at", { ascending: true }),

            supabase
              .from("categories")
              .select("id, family_id, name, type, is_default, created_at")
              .or(`family_id.eq.${household.id},family_id.is.null`)
              .order("is_default", { ascending: false })
              .order("name", { ascending: true }),

            supabase
              .from("accounts")
              .select("id, family_id, name, type, initial_balance, is_active, created_by, created_at, updated_at")
              .eq("family_id", household.id)
              .order("created_at", { ascending: true }),

            supabase
              .from("transactions")
              .select(TRANSACTION_COLUMNS)
              .eq("family_id", household.id)
              .order("transaction_date", { ascending: false })
              .order("created_at", { ascending: false })
              .limit(TRANSACTION_WINDOW),

            supabase
              .from("budgets")
              .select("id, family_id, name, account_id, category_id, month, year, amount, note, created_at, updated_at")
              .eq("family_id", household.id)
              .order("year", { ascending: false })
              .order("month", { ascending: false }),

            supabase
              .from("saving_goals")
              .select("id, family_id, name, target_amount, current_amount, target_date, note, status, created_at, updated_at")
              .eq("family_id", household.id)
              .order("created_at", { ascending: false }),

            supabase
              .from("notifications")
              .select("id, family_id, user_id, type, title, message, target, read_at, created_at")
              .eq("family_id", household.id)
              .or(`user_id.is.null,user_id.eq.${authUser.id}`)
              .order("created_at", { ascending: false })
              .limit(50),

            supabase.rpc("get_account_balances"),
          ]);

        const error =
          membersRes.error || categoriesRes.error || transactionsRes.error || budgetsRes.error || goalsRes.error;
        if (error) {
          if (isInvalidSessionError(error)) {
            await clearInvalidSession();
            return;
          }
          throw error;
        }

        if (notificationsRes.error && notificationsRes.error.code !== "42P01") throw notificationsRes.error;

        const accountBalanceMap: Record<string, number> = {};
        if (!balancesRes.error && Array.isArray(balancesRes.data)) {
          for (const row of balancesRes.data as { account_id: string; balance: number | string }[]) {
            accountBalanceMap[row.account_id] = Number(row.balance || 0);
          }
        }

        setState({
          session,
          user,
          household,
          familyMembers: membersRes.data.map(toFamilyMember),
          categories: categoriesRes.data.map(toCategory),
          accounts: accountsRes.data.map(toAccount),
          transactions: transactionsRes.data.map(toTransaction),
          transactionsHasMore: (transactionsRes.data?.length || 0) >= TRANSACTION_WINDOW,
          accountBalanceMap,
          budgets: budgetsRes.data.map(toBudget),
          savingGoals: goalsRes.data.map(toSavingGoal),
          notifications: notificationsRes.error ? [] : notificationsRes.data.map(toNotification),
        });
      } finally {
        refreshInFlightRef.current = false;
        if (!silent) setLoading(false);
      }
    },
    [clearInvalidSession, fetchHousehold, fetchProfile]
  );

  useEffect(() => {
    let mounted = true;

    const boot = async () => {
      try {
        requireSupabaseEnv();
        const { data } = await supabase.auth.getSession();
        if (mounted) await refreshData(data.session);
      } catch (error) {
        setLoading(false);
        notify(getErrorMessage(error));
      }
    };

    boot();

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED") return;

      if (event === "SIGNED_OUT") {
        setState(emptyState);
        return;
      }

      if (refreshInFlightRef.current) return;
      refreshData(session).catch((error) => notify(getErrorMessage(error)));
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [refreshData]);

  useEffect(() => {
    if (!state.household?.id || !state.user?.id) return undefined;

    const channel = supabase
      .channel(`family-notifications-${state.household.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `family_id=eq.${state.household.id}` },
        (payload) => {
          const notification = toNotification(payload.new);
          if (notification.userId && notification.userId !== state.user?.id) return;

          setState((prev) => ({
            ...prev,
            notifications: [notification, ...prev.notifications.filter((item) => item.id !== notification.id)].slice(0, 50),
          }));

          notify(notification.title);
          showBrowserNotification(notification.title, notification.message);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [state.household?.id, state.user?.id]);

  useEffect(() => {
    if (!state.household?.id || !state.user?.id) return undefined;

    let refreshTimer: number | undefined;

    const scheduleSilentRefresh = () => {
      window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => {
        refreshData(null, { silent: true }).catch((error) => notify(getErrorMessage(error)));
      }, 900);
    };

    const channel = supabase
      .channel(`family-finance-${state.household.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "transactions", filter: `family_id=eq.${state.household.id}` },
        scheduleSilentRefresh
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "budgets", filter: `family_id=eq.${state.household.id}` },
        scheduleSilentRefresh
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "accounts", filter: `family_id=eq.${state.household.id}` },
        scheduleSilentRefresh
      )
      .subscribe();

    return () => {
      window.clearTimeout(refreshTimer);
      supabase.removeChannel(channel);
    };
  }, [state.household?.id, state.user?.id, refreshData]);

  const requestNotificationPermission = async (): Promise<NotificationPermission | "unsupported"> => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      notify("Browser ini belum mendukung notifikasi.");
      return "unsupported";
    }

    const permission = await window.Notification.requestPermission();
    notify(permission === "granted" ? "Notifikasi browser diaktifkan." : "Izin notifikasi belum diberikan.");
    return permission;
  };

  const createNotification = async ({
    type = "general",
    title,
    message,
    target = "dashboard",
    userId = null,
  }: NotificationPayload): Promise<AppNotification | null> => {
    if (!state.household?.id || !title) return null;

    const { data, error } = await supabase
      .from("notifications")
      .insert({
        family_id: state.household.id,
        user_id: userId,
        type,
        title,
        message: message || null,
        target,
      })
      .select("*")
      .single();

    if (error) {
      // Keep core transaction flow safe if notification migration has not been run yet.
      console.warn("Notification insert skipped:", error.message);
      return null;
    }

    const notification = toNotification(data);
    setState((prev) => ({
      ...prev,
      notifications: [notification, ...prev.notifications.filter((item) => item.id !== notification.id)].slice(0, 50),
    }));
    showBrowserNotification(notification.title, notification.message);
    return notification;
  };

  const markNotificationRead = async (id: string) => {
    const readAt = new Date().toISOString();
    setState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((item) => (item.id === id ? { ...item, readAt } : item)),
    }));

    const { error } = await supabase.from("notifications").update({ read_at: readAt }).eq("id", id);
    if (error) console.warn("Mark notification read skipped:", error.message);
  };

  const markAllNotificationsRead = async () => {
    const readAt = new Date().toISOString();
    const ids = state.notifications.filter((item) => !item.readAt).map((item) => item.id);
    if (!ids.length) return;

    setState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((item) => (ids.includes(item.id) ? { ...item, readAt } : item)),
    }));

    const { error } = await supabase.from("notifications").update({ read_at: readAt }).in("id", ids);
    if (error) console.warn("Mark all notifications read skipped:", error.message);
  };

  const login = async ({ email, password }: { email: string; password: string }) => {
    requireSupabaseEnv();
    if (!email || !password) throw new Error("Email dan password wajib diisi.");

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    await refreshData(data.session);
    notify("Login berhasil.");
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;

    setState(emptyState);
    notify("Anda berhasil logout.");
  };

  const completeOnboarding = async ({ householdName, accountName, accountType, initialBalance }: OnboardingPayload) => {
    if (!state.user?.id) throw new Error("Sesi login tidak ditemukan. Silakan login ulang.");
    if (!householdName || !accountName) throw new Error("Nama keluarga dan akun/dompet wajib diisi.");

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;

    const authUser = authData.user;
    if (!authUser?.id) throw new Error("Sesi login tidak ditemukan. Silakan login ulang.");

    const { error: profileError } = await supabase.from("profiles").upsert({
      id: authUser.id,
      name: state.user?.name || authUser.user_metadata?.name || authUser.email?.split("@")[0] || "Pengguna",
      username: state.user?.username || authUser.user_metadata?.username || authUser.email?.split("@")[0] || "pengguna",
      email: authUser.email,
    });
    if (profileError) throw profileError;

    const { error: rpcError } = await supabase.rpc("create_family_with_onboarding", {
      p_family_name: householdName,
      p_account_name: accountName,
      p_account_type: accountType || "cash",
      p_initial_balance: Number(initialBalance || 0),
    });
    if (rpcError) throw rpcError;

    notify("Keluarga berhasil dibuat. Anda sekarang menjadi owner keluarga.");
    await refreshData();
  };

  const joinFamilyByInviteCode = async (inviteCode: string) => {
    if (!state.user?.id) throw new Error("Sesi login tidak ditemukan. Silakan login ulang.");
    if (!inviteCode?.trim()) throw new Error("Kode undangan wajib diisi.");

    const { error } = await supabase.rpc("join_family_by_invite_code", { p_invite_code: inviteCode.trim() });
    if (error) throw error;

    notify("Berhasil bergabung ke keluarga.");
    await refreshData();
  };

  const copyInviteCode = async () => {
    const code = state.household?.inviteCode;
    if (!code) {
      notify("Kode undangan belum tersedia. Pastikan migration invite sudah dijalankan.");
      return;
    }
    const success = await copyToClipboard(code);
    if (success) {
      notify("Kode undangan keluarga berhasil disalin.");
    } else {
      notify(`Gagal menyalin otomatis. Kode: ${code}`);
    }
  };

  const getAllocationForTransaction = (payload: TransactionPayload): Budget | null => {
    if (payload.type !== "expense") return null;
    if (!payload.budgetId) throw new Error("Pengeluaran wajib memilih alokasi anggaran.");

    const budget = state.budgets.find((item) => item.id === payload.budgetId);
    if (!budget) throw new Error("Alokasi anggaran tidak ditemukan. Pilih ulang alokasi.");
    if (!budget.accountId) throw new Error("Alokasi belum memiliki sumber dompet. Edit atau buat ulang alokasi.");

    const trxCycle = getTransactionCycle(payload.transactionDate);
    if (budget.month !== trxCycle.month || budget.year !== trxCycle.year) {
      throw new Error(
        "Alokasi anggaran tidak sesuai dengan periode gajian transaksi. Periode budget berjalan dari tanggal 25 sampai 24 bulan berikutnya."
      );
    }

    // Penting:
    // Alokasi anggaran boleh menjadi minus/over budget.
    // Batas validasi transaksi pengeluaran adalah saldo dompet sumber, bukan sisa alokasi.
    return budget;
  };

  const getAccountBalanceForValidation = (accountId: string, ignoreTransactionId: string | null = null) => {
    const account = state.accounts.find((item) => item.id === accountId);
    if (!account) throw new Error("Akun/dompet tidak ditemukan. Pilih ulang dompet atau alokasi.");

    const mapBalance = state.accountBalanceMap[accountId];
    if (typeof mapBalance === "number" && !ignoreTransactionId) {
      return { account, balance: mapBalance };
    }

    const transactionsForBalance = ignoreTransactionId
      ? state.transactions.filter((trx) => trx.id !== ignoreTransactionId)
      : state.transactions;

    return {
      account,
      balance: calculateAccountBalance(account, transactionsForBalance),
    };
  };

  const getBudgetProjection = (budget: Budget | null, amount: number | string, ignoreTransactionId: string | null = null) => {
    if (!budget) return { overBudget: false, remainingAfter: 0, overBudgetAmount: 0 };

    const monthTransactions = getBudgetCycleTransactions(state.transactions, budget.month, budget.year).filter(
      (trx) => trx.id !== ignoreTransactionId
    );

    const usage = getBudgetUsage(budget, monthTransactions);
    const remainingAfter = Number(usage.remaining || 0) - Number(amount || 0);

    return {
      overBudget: remainingAfter < 0,
      remainingAfter,
      overBudgetAmount: Math.abs(Math.min(remainingAfter, 0)),
    };
  };

  const validateExpenseSourceBalance = ({
    accountId,
    amount,
    ignoreTransactionId = null,
  }: {
    accountId: string;
    amount: number | string;
    ignoreTransactionId?: string | null;
  }) => {
    const { account, balance } = getAccountBalanceForValidation(accountId, ignoreTransactionId);
    const nominal = Number(amount || 0);
    const isNegative = nominal > Number(balance || 0);
    const deficit = isNegative ? nominal - Number(balance || 0) : 0;

    return { account, balance, isNegative, deficit };
  };

  const addTransaction = async (payload: TransactionPayload) => {
    if (!payload.amount || Number(payload.amount) <= 0) throw new Error("Nominal transaksi wajib lebih besar dari 0.");
    if (!payload.transactionDate) throw new Error("Tanggal transaksi wajib dipilih.");

    const isExpense = payload.type === "expense";
    const budget = getAllocationForTransaction(payload);
    const accountId = isExpense ? budget?.accountId : payload.accountId;
    const categoryId = isExpense ? null : payload.categoryId;

    if (!accountId) throw new Error("Akun/dompet wajib dipilih.");
    if (!isExpense && !categoryId) throw new Error("Kategori pemasukan wajib dipilih.");

    const projection = isExpense ? getBudgetProjection(budget, payload.amount) : null;
    const sourceCheck = isExpense ? validateExpenseSourceBalance({ accountId, amount: payload.amount }) : null;

    const { error } = await supabase.from("transactions").insert({
      family_id: state.household!.id,
      account_id: accountId,
      category_id: categoryId,
      budget_id: isExpense ? budget?.id : null,
      created_by: state.user!.id,
      type: payload.type,
      amount: Number(payload.amount),
      transaction_date: payload.transactionDate,
      note: payload.note || null,
    });
    if (error) throw error;

    await createNotification({
      type: "transaction",
      title: isExpense ? "Pengeluaran baru dicatat" : "Pemasukan baru dicatat",
      message: `${state.user?.name || "Anggota keluarga"} mencatat ${isExpense ? "pengeluaran" : "pemasukan"} ${formatCurrency(
        payload.amount
      )}${isExpense && budget?.name ? ` dari alokasi ${budget.name}` : ""}${
        projection?.overBudget ? ` dan membuat over budget ${formatCurrency(projection.overBudgetAmount)}` : ""
      }${sourceCheck?.isNegative ? ` (saldo dompet minus ${formatCurrency(sourceCheck.deficit)})` : ""}.`,
      target: "transactions",
    });

    notify(
      isExpense && sourceCheck?.isNegative
        ? `Pengeluaran disimpan. Saldo dompet ${sourceCheck.account.name} minus ${formatCurrency(sourceCheck.deficit)}.`
        : isExpense && projection?.overBudget
          ? `Pengeluaran berhasil disimpan sebagai over budget ${formatCurrency(projection.overBudgetAmount)}.`
          : isExpense
            ? "Pengeluaran berhasil disimpan. Saldo dompet otomatis berkurang."
            : "Transaksi berhasil disimpan."
    );
    await refreshData();
  };

  const updateTransaction = async (id: string, payload: TransactionPayload) => {
    const existingTransaction = state.transactions.find((item) => item.id === id);
    assertCanUpdateTransaction(currentMember, existingTransaction, state.user?.id);

    if (!payload.amount || Number(payload.amount) <= 0) throw new Error("Nominal transaksi wajib lebih besar dari 0.");
    if (!payload.transactionDate) throw new Error("Tanggal transaksi wajib dipilih.");

    const isExpense = payload.type === "expense";
    const budget = getAllocationForTransaction(payload);
    const accountId = isExpense ? budget?.accountId : payload.accountId;
    const categoryId = isExpense ? null : payload.categoryId;

    if (!accountId) throw new Error("Akun/dompet wajib dipilih.");
    if (!isExpense && !categoryId) throw new Error("Kategori pemasukan wajib dipilih.");

    const projection = isExpense ? getBudgetProjection(budget, payload.amount, id) : null;
    const sourceCheck = isExpense ? validateExpenseSourceBalance({ accountId, amount: payload.amount, ignoreTransactionId: id }) : null;

    const { error } = await supabase
      .from("transactions")
      .update({
        account_id: accountId,
        category_id: categoryId,
        budget_id: isExpense ? budget?.id : null,
        type: payload.type,
        amount: Number(payload.amount),
        transaction_date: payload.transactionDate,
        note: payload.note || null,
      })
      .eq("id", id);
    if (error) throw error;

    await createNotification({
      type: "transaction",
      title: "Transaksi diperbarui",
      message: `${state.user?.name || "Anggota keluarga"} memperbarui transaksi ${formatCurrency(payload.amount)}${
        projection?.overBudget ? ` dan alokasi menjadi over budget ${formatCurrency(projection.overBudgetAmount)}` : ""
      }${sourceCheck?.isNegative ? ` (saldo dompet minus ${formatCurrency(sourceCheck.deficit)})` : ""}.`,
      target: "transactions",
    });

    notify(
      isExpense && sourceCheck?.isNegative
        ? `Pengeluaran diperbarui. Saldo dompet ${sourceCheck.account.name} minus ${formatCurrency(sourceCheck.deficit)}.`
        : isExpense && projection?.overBudget
          ? `Pengeluaran berhasil diperbarui sebagai over budget ${formatCurrency(projection.overBudgetAmount)}.`
          : isExpense
            ? "Pengeluaran berhasil diperbarui. Saldo dompet ikut disesuaikan."
            : "Transaksi berhasil diperbarui."
    );
    await refreshData();
  };

  const deleteTransaction = async (id: string) => {
    const existingTransaction = state.transactions.find((item) => item.id === id);
    if (!existingTransaction) throw new Error("Transaksi tidak ditemukan.");
    assertCanDeleteTransaction(currentMember);

    const { error } = await supabase.from("transactions").delete().eq("id", id).eq("family_id", state.household!.id);
    if (error) throw error;

    await createNotification({
      type: "transaction",
      title: "Transaksi dihapus",
      message: `${state.user?.name || "Anggota keluarga"} menghapus transaksi.`,
      target: "transactions",
    });

    notify("Transaksi berhasil dihapus.");
    await refreshData();
  };

  const currentMember = useMemo(() => {
    return state.familyMembers.find((member) => member.userId === state.user?.id) || null;
  }, [state.familyMembers, state.user?.id]);

  const permissions = useMemo(() => getPermissions(currentMember), [currentMember]);

  const addFamilyMemberByIdentifier = async ({ identifier, role = "member" }: { identifier: string; role?: string }) => {
    assertOwnerOrAdmin(currentMember);
    if (!identifier?.trim()) throw new Error("Email atau username anggota wajib diisi.");

    const effectiveRole = role || "member";
    if (!["admin", "member"].includes(effectiveRole)) {
      throw new Error("Role anggota hanya boleh admin atau member.");
    }

    const { error } = await supabase.rpc("add_family_member_by_identifier", {
      p_identifier: identifier.trim(),
      p_role: effectiveRole,
    });
    if (error) throw error;

    await createNotification({
      type: "member",
      title: "Anggota keluarga ditambahkan",
      message: `${state.user?.name || "Owner/Admin"} menambahkan anggota baru sebagai ${effectiveRole}.`,
      target: "settings",
    });

    notify("Anggota keluarga berhasil ditambahkan.");
    await refreshData();
  };

  const updateFamilyMemberRole = async (memberId: string, role: string) => {
    assertOwnerOrAdmin(currentMember);
    if (!memberId) throw new Error("Anggota belum dipilih.");
    if (!["admin", "member"].includes(role)) throw new Error("Role hanya boleh admin atau member.");

    const targetMember = state.familyMembers.find((member) => member.id === memberId);
    if (!targetMember) throw new Error("Anggota tidak ditemukan.");
    if (targetMember.userId === state.user?.id) throw new Error("Anda tidak bisa mengubah role diri sendiri.");
    if (targetMember.role === "owner") throw new Error("Role owner tidak bisa diubah dari menu ini.");

    const { error } = await supabase.rpc("update_family_member_role", {
      p_member_id: memberId,
      p_role: role,
    });
    if (error) throw error;

    notify("Role anggota berhasil diperbarui.");
    await refreshData();
  };

  const removeFamilyMember = async (memberId: string) => {
    assertOwnerOrAdmin(currentMember);
    if (!memberId) throw new Error("Anggota belum dipilih.");

    const targetMember = state.familyMembers.find((member) => member.id === memberId);
    if (!targetMember) throw new Error("Anggota tidak ditemukan.");
    if (targetMember.userId === state.user?.id) throw new Error("Anda tidak bisa menghapus diri sendiri dari keluarga.");
    if (targetMember.role === "owner") throw new Error("Owner tidak bisa dihapus dari menu ini.");

    const { error } = await supabase.rpc("remove_family_member", { p_member_id: memberId });
    if (error) throw error;

    notify("Anggota berhasil dihapus dari keluarga.");
    await refreshData();
  };

  const addAccount = async (payload: AccountPayload) => {
    assertOwnerOrAdmin(currentMember);
    if (!payload.name) throw new Error("Nama akun/dompet wajib diisi.");

    const { error } = await supabase.from("accounts").insert({
      family_id: state.household!.id,
      name: payload.name,
      type: payload.type || "cash",
      initial_balance: Number(payload.initialBalance || 0),
      is_active: true,
      created_by: state.user!.id,
    });
    if (error) throw error;

    await createNotification({
      type: "account",
      title: "Dompet baru ditambahkan",
      message: `${state.user?.name || "Owner/Admin"} menambahkan dompet ${payload.name}.`,
      target: "settings",
    });

    notify("Akun/dompet berhasil ditambahkan.");
    await refreshData();
  };

  const updateAccount = async (id: string, payload: AccountPayload) => {
    assertOwnerOrAdmin(currentMember);
    if (!payload.name) throw new Error("Nama akun/dompet wajib diisi.");

    const { error } = await supabase
      .from("accounts")
      .update({ name: payload.name, type: payload.type || "cash", initial_balance: Number(payload.initialBalance || 0) })
      .eq("id", id)
      .eq("family_id", state.household!.id);
    if (error) throw error;

    notify("Akun/dompet berhasil diperbarui.");
    await refreshData();
  };

  const toggleAccount = async (id: string) => {
    assertOwnerOrAdmin(currentMember);
    const account = state.accounts.find((item) => item.id === id);

    const { error } = await supabase
      .from("accounts")
      .update({ is_active: !account?.isActive })
      .eq("id", id)
      .eq("family_id", state.household!.id);
    if (error) throw error;

    notify("Status akun/dompet diperbarui.");
    await refreshData();
  };

  const deleteAccount = async (id: string) => {
    assertOwnerOrAdmin(currentMember);
    const account = state.accounts.find((item) => item.id === id);
    if (!account) throw new Error("Dompet tidak ditemukan.");

    const relatedTransactions = state.transactions.filter((trx) => trx.accountId === id);
    const relatedBudgets = state.budgets.filter((budget) => budget.accountId === id);

    if (relatedTransactions.length || relatedBudgets.length) {
      throw new Error("Dompet ini sudah memiliki transaksi atau alokasi. Nonaktifkan dompet agar histori tetap aman.");
    }

    const { error } = await supabase.from("accounts").delete().eq("id", id).eq("family_id", state.household!.id);
    if (error) throw error;

    notify("Dompet berhasil dihapus.");
    await refreshData();
  };

  const addCategory = async (payload: { name: string; type?: string }): Promise<Category | null> => {
    assertOwnerOrAdmin(currentMember);
    if (!payload.name?.trim()) throw new Error("Nama kategori wajib diisi.");

    const { data, error } = await supabase
      .from("categories")
      .insert({
        family_id: state.household!.id,
        name: payload.name.trim(),
        type: payload.type || "expense",
        is_default: false,
      })
      .select("*")
      .single();
    if (error) throw error;

    const category = toCategory(data);
    notify("Kategori berhasil ditambahkan.");
    await refreshData();
    return category;
  };

  const deleteCategory = async (id: string) => {
    assertOwnerOrAdmin(currentMember);
    const category = state.categories.find((item) => item.id === id);
    if (!category) throw new Error("Kategori tidak ditemukan.");
    if (category.isDefault || !category.familyId) throw new Error("Kategori bawaan tidak bisa dihapus.");

    const { error } = await supabase
      .from("categories")
      .delete()
      .eq("id", id)
      .eq("family_id", state.household!.id)
      .eq("is_default", false);
    if (error) throw error;

    notify("Kategori berhasil dihapus.");
    await refreshData();
  };

  const addBudget = async (payload: BudgetPayload) => {
    assertOwnerOrAdmin(currentMember);
    if (!payload.name?.trim()) throw new Error("Nama alokasi wajib diisi.");
    if (!payload.amount || Number(payload.amount) <= 0) throw new Error("Nominal alokasi wajib lebih besar dari 0.");
    if (!payload.accountId) throw new Error("Sumber anggaran/dompet wajib dipilih.");

    const account = state.accounts.find((item) => item.id === payload.accountId && item.isActive);
    if (!account) throw new Error("Sumber anggaran/dompet tidak aktif atau tidak ditemukan.");

    const duplicate = state.budgets.find(
      (budget) =>
        budget.name?.trim().toLowerCase() === payload.name.trim().toLowerCase() &&
        budget.month === Number(payload.month) &&
        budget.year === Number(payload.year)
    );
    if (duplicate) throw new Error("Nama alokasi ini sudah digunakan untuk bulan tersebut.");

    const { error } = await supabase.from("budgets").insert({
      family_id: state.household!.id,
      name: payload.name.trim(),
      account_id: payload.accountId,
      category_id: null,
      month: Number(payload.month),
      year: Number(payload.year),
      amount: Number(payload.amount),
      note: payload.note || null,
    });
    if (error) {
      if (error.code === "23505") {
        throw new Error("Nama alokasi ini sudah digunakan untuk periode bulan tersebut.");
      }
      throw error;
    }

    await createNotification({
      type: "budget",
      title: "Alokasi baru dibuat",
      message: `${state.user?.name || "Anggota keluarga"} membuat alokasi ${payload.name} sebesar ${formatCurrency(
        payload.amount
      )} dari ${account.name}.`,
      target: "budgets",
    });

    notify("Alokasi anggaran berhasil dibuat.");
    await refreshData();
  };

  const updateBudget = async (id: string, payload: BudgetPayload) => {
    assertOwnerOrAdmin(currentMember);
    if (!id) throw new Error("Alokasi belum dipilih.");
    if (!payload.name?.trim()) throw new Error("Nama alokasi wajib diisi.");
    if (!payload.amount || Number(payload.amount) <= 0) throw new Error("Nominal alokasi wajib lebih besar dari 0.");
    if (!payload.accountId) throw new Error("Sumber anggaran/dompet wajib dipilih.");

    const account = state.accounts.find((item) => item.id === payload.accountId && item.isActive);
    if (!account) throw new Error("Sumber anggaran/dompet tidak aktif atau tidak ditemukan.");

    const duplicate = state.budgets.find(
      (budget) =>
        budget.id !== id &&
        budget.name?.trim().toLowerCase() === payload.name.trim().toLowerCase() &&
        budget.month === Number(payload.month) &&
        budget.year === Number(payload.year)
    );
    if (duplicate) throw new Error("Nama alokasi ini sudah digunakan untuk bulan tersebut.");

    const { error } = await supabase
      .from("budgets")
      .update({
        name: payload.name.trim(),
        account_id: payload.accountId,
        category_id: null,
        month: Number(payload.month),
        year: Number(payload.year),
        amount: Number(payload.amount),
        note: payload.note || null,
      })
      .eq("id", id)
      .eq("family_id", state.household!.id);
    if (error) {
      if (error.code === "23505") {
        throw new Error("Nama alokasi ini sudah digunakan untuk periode bulan tersebut.");
      }
      throw error;
    }

    await createNotification({
      type: "budget",
      title: "Alokasi diperbarui",
      message: `${state.user?.name || "Anggota keluarga"} memperbarui alokasi ${payload.name}.`,
      target: "budgets",
    });

    notify("Alokasi anggaran berhasil diperbarui.");
    await refreshData();
  };

  const deleteBudget = async (id: string) => {
    assertOwnerOrAdmin(currentMember);
    const usedByTransactions = state.transactions.some((trx) => trx.budgetId === id);
    if (usedByTransactions) {
      throw new Error(
        "Alokasi ini sudah dipakai transaksi. Untuk menjaga histori, sebaiknya edit nominal/catatan atau buat alokasi baru."
      );
    }

    const { error } = await supabase.from("budgets").delete().eq("id", id).eq("family_id", state.household!.id);
    if (error) throw error;

    await createNotification({
      type: "budget",
      title: "Alokasi dihapus",
      message: `${state.user?.name || "Anggota keluarga"} menghapus alokasi anggaran.`,
      target: "budgets",
    });

    notify("Alokasi anggaran berhasil dihapus.");
    await refreshData();
  };

  const addSavingGoal = async (payload: SavingGoalPayload) => {
    assertOwnerOrAdmin(currentMember);
    if (!payload.name || !payload.targetAmount) throw new Error("Nama target dan nominal target wajib diisi.");

    const { error } = await supabase.from("saving_goals").insert({
      family_id: state.household!.id,
      name: payload.name,
      target_amount: Number(payload.targetAmount),
      current_amount: Number(payload.currentAmount || 0),
      target_date: payload.targetDate || null,
      note: payload.note || null,
      status: "active",
    });
    if (error) throw error;

    await createNotification({
      type: "goal",
      title: "Target tabungan baru",
      message: `${state.user?.name || "Anggota keluarga"} membuat target ${payload.name} sebesar ${formatCurrency(
        payload.targetAmount
      )}.`,
      target: "settings",
    });

    notify("Target tabungan berhasil dibuat.");
    await refreshData();
  };

  const depositSavingGoal = async (id: string, amount: number | string) => {
    assertOwnerOrAdmin(currentMember);
    if (!id) throw new Error("Pilih target tabungan terlebih dahulu.");
    if (!amount || Number(amount) <= 0) throw new Error("Nominal setoran wajib lebih besar dari 0.");

    const goal = state.savingGoals.find((item) => item.id === id);
    if (!goal) throw new Error("Target tabungan tidak ditemukan.");
    const nextAmount = Number(goal.currentAmount) + Number(amount);

    const { error: depositError } = await supabase.from("saving_goal_transactions").insert({
      saving_goal_id: id,
      amount: Number(amount),
      transaction_date: toLocalDateKey(),
      note: "Setoran dari aplikasi",
    });
    if (depositError) throw depositError;

    const { error: goalError } = await supabase
      .from("saving_goals")
      .update({ current_amount: nextAmount, status: nextAmount >= Number(goal.targetAmount) ? "completed" : goal.status })
      .eq("id", id);
    if (goalError) throw goalError;

    await createNotification({
      type: "goal",
      title: "Setoran tabungan masuk",
      message: `${state.user?.name || "Anggota keluarga"} menyetor ${formatCurrency(amount)} ke target ${goal.name}.`,
      target: "settings",
    });

    notify("Setoran tabungan berhasil ditambahkan.");
    await refreshData();
  };

  const accountBalances = useMemo<AccountBalance[]>(() => {
    return state.accounts.map((account) => ({
      ...account,
      currentBalance: state.accountBalanceMap[account.id] ?? calculateAccountBalance(account, state.transactions),
    }));
  }, [state.accounts, state.accountBalanceMap, state.transactions]);

  const loadMoreTransactions = useCallback(async () => {
    if (!state.household?.id || !state.transactionsHasMore) return;

    const from = state.transactions.length;
    const { data, error } = await supabase
      .from("transactions")
      .select(TRANSACTION_COLUMNS)
      .eq("family_id", state.household.id)
      .order("transaction_date", { ascending: false })
      .order("created_at", { ascending: false })
      .range(from, from + TRANSACTION_WINDOW - 1);

    if (error) throw error;

    const next = data.map(toTransaction);
    setState((prev) => ({
      ...prev,
      transactions: [...prev.transactions, ...next],
      transactionsHasMore: next.length >= TRANSACTION_WINDOW,
    }));
  }, [state.household?.id, state.transactions.length, state.transactionsHasMore]);

  const value: AppContextValue = {
    ...state,
    loading,
    accountBalances,
    currentMember,
    permissions,
    toast,
    notify,
    refreshData,
    requestNotificationPermission,
    markNotificationRead,
    markAllNotificationsRead,
    login,
    logout,
    completeOnboarding,
    joinFamilyByInviteCode,
    copyInviteCode,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    addFamilyMemberByIdentifier,
    updateFamilyMemberRole,
    removeFamilyMember,
    addAccount,
    updateAccount,
    toggleAccount,
    deleteAccount,
    addCategory,
    deleteCategory,
    addBudget,
    updateBudget,
    deleteBudget,
    addSavingGoal,
    depositSavingGoal,
    loadMoreTransactions,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp harus digunakan di dalam AppProvider.");
  return ctx;
}
