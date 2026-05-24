import React from 'react';
import { LayoutDashboard, PieChart, ReceiptText, Settings, Target } from 'lucide-react';

const tabs = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'transactions', label: 'Transaksi', icon: ReceiptText },
  { id: 'budgets', label: 'Anggaran', icon: Target },
  { id: 'reports', label: 'Laporan', icon: PieChart },
  { id: 'settings', label: 'Setting', icon: Settings },
];

export default function BottomNav({ activeTab, onChange }) {
  return (
    <nav className="bottom-nav" aria-label="Navigasi utama">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <button key={tab.id} className={`nav-btn ${activeTab === tab.id ? 'active' : ''}`} onClick={() => onChange(tab.id)}>
            <Icon size={18} />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
