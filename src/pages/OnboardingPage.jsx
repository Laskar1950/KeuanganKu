import React, { useState } from 'react';
import { Home, Users } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';

export default function OnboardingPage() {
  const { completeOnboarding, joinFamilyByInviteCode, notify } = useApp();

  const [mode, setMode] = useState('create');

  const [form, setForm] = useState({
    householdName: '',
    accountName: 'Tunai',
    accountType: 'cash',
    initialBalance: 0,
  });

  const [inviteCode, setInviteCode] = useState('');

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const submitCreate = async (event) => {
    event.preventDefault();

    try {
      await completeOnboarding(form);
    } catch (error) {
      notify(error.message);
    }
  };

  const submitJoin = async (event) => {
    event.preventDefault();

    try {
      await joinFamilyByInviteCode(inviteCode);
    } catch (error) {
      notify(error.message);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card form-grid">
        <div className="brand-icon">
          {mode === 'create' ? <Home /> : <Users />}
        </div>

        <h1 className="auth-title">Setup keluarga</h1>

        <p className="auth-sub">
          Buat keluarga baru sebagai owner, atau gabung ke keluarga yang sudah ada memakai kode undangan.
        </p>

        <div className="segment enhanced">
          <button
            type="button"
            className={mode === 'create' ? 'active' : ''}
            onClick={() => setMode('create')}
          >
            <span>Buat Keluarga</span>
            <small>Untuk owner</small>
          </button>

          <button
            type="button"
            className={mode === 'join' ? 'active' : ''}
            onClick={() => setMode('join')}
          >
            <span>Gabung</span>
            <small>Untuk anggota</small>
          </button>
        </div>

        {mode === 'create' ? (
          <form className="form-grid" onSubmit={submitCreate}>
            <div className="field">
              <label>Nama keluarga</label>
              <input
                value={form.householdName}
                onChange={(e) => setField('householdName', e.target.value)}
                placeholder="Contoh: Keluarga Rizki"
              />
            </div>

            <div className="field">
              <label>Nama akun/dompet awal</label>
              <input
                value={form.accountName}
                onChange={(e) => setField('accountName', e.target.value)}
                placeholder="Contoh: Bank Mandiri"
              />
            </div>

            <div className="grid-2">
              <div className="field">
                <label>Jenis akun</label>
                <select
                  value={form.accountType}
                  onChange={(e) => setField('accountType', e.target.value)}
                >
                  <option value="cash">Cash</option>
                  <option value="bank">Bank</option>
                  <option value="ewallet">E-Wallet</option>
                  <option value="saving">Tabungan</option>
                  <option value="other">Lainnya</option>
                </select>
              </div>

              <div className="field">
                <label>Saldo awal</label>
                <input
                  inputMode="numeric"
                  type="number"
                  value={form.initialBalance}
                  onChange={(e) => setField('initialBalance', e.target.value)}
                />
              </div>
            </div>

            <button className="primary-btn">Buat Keluarga</button>
          </form>
        ) : (
          <form className="form-grid" onSubmit={submitJoin}>
            <div className="field">
              <label>Kode undangan keluarga</label>
              <input
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="Contoh: A1B2C3D4"
              />
            </div>

            <p className="muted tiny">
              Minta kode undangan dari owner keluarga. Setelah bergabung, transaksi yang Anda buat akan masuk ke data keluarga tersebut.
            </p>

            <button className="primary-btn">Gabung Keluarga</button>
          </form>
        )}
      </div>
    </div>
  );
}
