import React from 'react';
import { ChartNoAxesColumn, Home, ReceiptText, Settings, Target } from 'lucide-react';

const tabs = [
  { id: 'dashboard', label: 'Home', icon: Home },
  { id: 'transactions', label: 'Catat', icon: ReceiptText },
  { id: 'budgets', label: 'Budget', icon: Target },
  { id: 'reports', label: 'Laporan', icon: ChartNoAxesColumn },
  { id: 'settings', label: 'Profil', icon: Settings },
];

export default function BottomNav({ activeTab, onChange }) {
  return (
    <nav className="bottom-nav" aria-label="Navigasi utama">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            className={`nav-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => onChange(tab.id)}
            type="button"
          >
            <Icon size={18} />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
