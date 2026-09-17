import { lazy, Suspense, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus } from "lucide-react";
import { AppProvider, useApp } from "./context/AppContext";
import BottomNav from "./components/BottomNav";
import TransactionSheet from "./components/TransactionSheet";
import { GlassLoading, Toast } from "./components/UI";
import type { Transaction } from "./types";

const AuthPage = lazy(() => import("./pages/AuthPage"));
const OnboardingPage = lazy(() => import("./pages/OnboardingPage"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Transactions = lazy(() => import("./pages/Transactions"));
const Budgets = lazy(() => import("./pages/Budgets"));
const Reports = lazy(() => import("./pages/Reports"));
const Settings = lazy(() => import("./pages/Settings"));

function AppContent() {
  const { user, household, toast, loading } = useApp();
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
        <button
          className="absolute right-7 bottom-24 z-[25] grid size-[58px] place-items-center rounded-[22px] border border-white/50 text-on-accent shadow-[var(--accent-glow),inset_0_1px_0_rgba(255,255,255,0.4)] transition [background-image:var(--gradient-brand)] hover:[transform:translateY(-3px)_scale(1.03)] hover:shadow-[var(--shadow-hover),var(--accent-glow)] max-[390px]:right-5 max-[390px]:bottom-[92px]"
          onClick={openAdd}
          aria-label="Tambah transaksi"
        >
          <Plus size={28} />
        </button>
        <BottomNav activeTab={activeTab} onChange={setActiveTab} />
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
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
