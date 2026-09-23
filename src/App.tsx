import { lazy, Suspense, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { WifiOff } from "lucide-react";
import { AppProvider, useApp } from "./context/AppContext";
import BottomNav from "./components/BottomNav";
import TransactionSheet from "./components/TransactionSheet";
import { GlassLoading, Toast } from "./components/UI";
import { hasSupabaseEnv } from "./lib/supabaseClient";
import { useOnlineStatus } from "./utils/useOnlineStatus";
import type { Transaction } from "./types";

function ConfigErrorScreen() {
  return (
    <div className="grid min-h-screen place-items-center p-5 [background:var(--gradient-bg)]">
      <div className="grid w-full max-w-[430px] gap-3 rounded-[34px] border border-line-strong bg-panel-strong/90 p-6 shadow-soft backdrop-blur-xl">
        <div className="grid size-12 place-items-center rounded-2xl text-xl font-black text-on-accent shadow-accent [background-image:var(--gradient-brand)]">
          !
        </div>
        <h1 className="font-display text-2xl leading-tight tracking-tight text-ink">Konfigurasi belum lengkap</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Aplikasi tidak bisa terhubung ke Supabase karena environment variable belum diisi.
        </p>
        <div className="grid gap-2 rounded-2xl border border-line bg-soft p-3.5 text-xs leading-relaxed font-semibold text-muted-foreground">
          <span className="font-mono text-[11px] text-ink">VITE_SUPABASE_URL</span>
          <span className="font-mono text-[11px] text-ink">VITE_SUPABASE_ANON_KEY</span>
          <p className="mt-1">
            Tambahkan keduanya di pengaturan deployment (Vercel → Settings → Environment Variables) atau file{" "}
            <span className="font-mono text-[11px] text-ink">.env.local</span>, lalu build/deploy ulang.
          </p>
        </div>
      </div>
    </div>
  );
}

const AuthPage = lazy(() => import("./pages/AuthPage"));
const OnboardingPage = lazy(() => import("./pages/OnboardingPage"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Transactions = lazy(() => import("./pages/Transactions"));
const Budgets = lazy(() => import("./pages/Budgets"));
const Reports = lazy(() => import("./pages/Reports"));
const Settings = lazy(() => import("./pages/Settings"));

function AppContent() {
  const { user, household, toast, loading } = useApp();
  const isOnline = useOnlineStatus();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  if (loading) {
    return (
      <>
        <Toast message={toast} />
        <GlassLoading />
      </>
    );
  }

  if (!user) {
    return (
      <>
        <Toast message={toast} />
        <Suspense fallback={<GlassLoading />}>
          <AuthPage />
        </Suspense>
      </>
    );
  }

  if (!household) {
    return (
      <>
        <Toast message={toast} />
        <Suspense fallback={<GlassLoading />}>
          <OnboardingPage />
        </Suspense>
      </>
    );
  }

  const openAdd = () => {
    setEditingTransaction(null);
    setSheetOpen(true);
  };

  const openEdit = (trx: Transaction) => {
    setEditingTransaction(trx);
    setSheetOpen(true);
  };

  const renderPage = () => {
    if (activeTab === "transactions") return <Transactions onEdit={openEdit} onAdd={openAdd} />;
    if (activeTab === "family") return <Settings view="family" />;
    if (activeTab === "profile") return <Settings view="profile" />;
    if (activeTab === "wallets") return <Settings view="wallets" />;
    if (activeTab === "budgets") return <Budgets />;
    if (activeTab === "reports") return <Reports />;
    if (activeTab === "settings") return <Settings view="menu" />;
    return <Dashboard onAddTransaction={openAdd} goTo={setActiveTab} />;
  };

  return (
    <div className="flex min-h-screen justify-center [background:var(--gradient-bg)]">
      <Toast message={toast} />
      <div className="relative min-h-screen w-full max-w-[430px] overflow-hidden [background:var(--gradient-frame)] min-[520px]:my-5 min-[520px]:max-h-[844px] min-[520px]:min-h-[844px] min-[520px]:rounded-[42px] min-[520px]:border-[10px] min-[520px]:border-panel-strong min-[520px]:shadow-[var(--shadow-hover),inset_0_0_0_1px_var(--line)] min-[520px]:[backdrop-filter:var(--blur)] min-[520px]:[outline:1px_solid_var(--line-strong)]">
        {!isOnline && (
          <div className="flex items-center justify-center gap-1.5 border-b border-amber-500/30 bg-amber-500/15 px-3 py-1.5 text-center text-[11px] font-black text-amber-600 dark:text-amber-400">
            <WifiOff size={13} /> Sedang offline. Menampilkan data tersimpan.
          </div>
        )}
        <main className="h-screen overflow-y-auto px-4 pt-6 pb-[116px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden min-[520px]:h-[824px] min-[520px]:pt-[34px] max-[390px]:px-3.5">
          <Suspense fallback={<GlassLoading />}>
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.18 }}
              >
                {renderPage()}
              </motion.div>
            </AnimatePresence>
          </Suspense>
        </main>
        <BottomNav activeTab={activeTab} onChange={setActiveTab} onAdd={openAdd} />
        <TransactionSheet
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          editingTransaction={editingTransaction}
          onClearEdit={() => setEditingTransaction(null)}
        />
      </div>
    </div>
  );
}

export default function App() {
  if (!hasSupabaseEnv) return <ConfigErrorScreen />;

  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
