import React from 'react';
import { Home, ReceiptText, UserRound, UsersRound } from 'lucide-react';

const tabs = [
  { id: 'dashboard', label: 'Dashboard', icon: Home },
  { id: 'transactions', label: 'Transaksi', icon: ReceiptText },
  { id: 'spacer', label: '', icon: null, spacer: true },
  { id: 'family', label: 'Keluarga', icon: UsersRound },
  { id: 'profile', label: 'Profil', icon: UserRound },
];

export default function BottomNav({ activeTab, onChange }) {
  return (
    <nav className="bottom-nav" aria-label="Navigasi utama">
      {tabs.map((tab) => {
        if (tab.spacer) return <div key={tab.id} className="nav-spacer" aria-hidden="true" />;

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
