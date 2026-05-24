import React, { useState } from 'react';
import { Home } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';

export default function OnboardingPage() {
  const { completeOnboarding, notify } = useApp();
  const [form, setForm] = useState({ householdName: '', accountName: 'Tunai', accountType: 'cash', initialBalance: 0 });
  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const submit = async (event) => {
    event.preventDefault();
    try { await completeOnboarding(form); } catch (error) { notify(error.message); }
  };
  return (
    <div className="auth-wrap">
      <form className="auth-card form-grid" onSubmit={submit}>
        <div className="brand-icon"><Home /></div>
        <h1 className="auth-title">Setup awal keluarga</h1>
        <p className="auth-sub">Buat keluarga dan akun/dompet pertama. Kategori default akan disiapkan otomatis.</p>
        <div className="field">
          <label>Nama keluarga</label>
          <input value={form.householdName} onChange={(e) => setField('householdName', e.target.value)} placeholder="Contoh: Keluarga Rina" />
        </div>
        <div className="field">
          <label>Nama akun/dompet awal</label>
          <input value={form.accountName} onChange={(e) => setField('accountName', e.target.value)} placeholder="Contoh: Tunai" />
        </div>
        <div className="grid-2">
          <div className="field">
            <label>Jenis akun</label>
            <select value={form.accountType} onChange={(e) => setField('accountType', e.target.value)}>
              <option value="cash">Cash</option>
              <option value="bank">Bank</option>
              <option value="ewallet">E-Wallet</option>
              <option value="saving">Tabungan</option>
            </select>
          </div>
          <div className="field">
            <label>Saldo awal</label>
            <input inputMode="numeric" type="number" value={form.initialBalance} onChange={(e) => setField('initialBalance', e.target.value)} />
          </div>
        </div>
        <button className="primary-btn">Mulai Kelola Keuangan</button>
      </form>
    </div>
  );
}
