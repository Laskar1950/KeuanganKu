import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { AppProvider, useApp } from './context/AppContext.jsx';
import BottomNav from './components/BottomNav.jsx';
import TransactionSheet from './components/TransactionSheet.jsx';
import { GlassLoading, Toast } from './components/UI.jsx';
import AuthPage from './pages/AuthPage.jsx';
import OnboardingPage from './pages/OnboardingPage.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Transactions from './pages/Transactions.jsx';
import Budgets from './pages/Budgets.jsx';
import Reports from './pages/Reports.jsx';
import Settings from './pages/Settings.jsx';

function AppContent() {
  const { user, household, toast, loading } = useApp();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);

  if (loading) {
    return (
      <>
        <Toast message={toast} />
        <GlassLoading />
      </>
    );
  }

  if (!user) return <><Toast message={toast} /><AuthPage /></>;
  if (!household) return <><Toast message={toast} /><OnboardingPage /></>;

  const openEdit = (trx) => {
    setEditingTransaction(trx);
    setSheetOpen(true);
  };

  const renderPage = () => {
    if (activeTab === 'transactions') return <Transactions onEdit={openEdit} />;
    if (activeTab === 'family') return <Settings view="family" />;
    if (activeTab === 'profile') return <Settings view="profile" />;
    if (activeTab === 'budgets') return <Budgets />;
    if (activeTab === 'reports') return <Reports />;
    if (activeTab === 'settings') return <Settings />;
    return <Dashboard onAddTransaction={() => setSheetOpen(true)} goTo={setActiveTab} />;
  };

  return (
    <div className="app-shell">
      <Toast message={toast} />
      <div className="phone-frame">
        <main className="app-scroll">
          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.18 }}>
              {renderPage()}
            </motion.div>
          </AnimatePresence>
        </main>
        <button className="fab" onClick={() => { setEditingTransaction(null); setSheetOpen(true); }} aria-label="Tambah transaksi"><Plus size={28} /></button>
        <BottomNav activeTab={activeTab} onChange={setActiveTab} />
        <TransactionSheet open={sheetOpen} onClose={() => setSheetOpen(false)} editingTransaction={editingTransaction} onClearEdit={() => setEditingTransaction(null)} />
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
