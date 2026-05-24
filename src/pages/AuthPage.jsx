import React, { useState } from 'react';
import { Wallet } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';

export default function AuthPage() {
  const { register, login, loginDemo, notify } = useApp();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async (event) => {
    event.preventDefault();
    try {
      if (mode === 'register') await register(form);
      else await login(form);
    } catch (error) {
      notify(error.message);
    }
  };

  return (
    <div className="auth-wrap">
      <form className="auth-card form-grid" onSubmit={submit}>
        <div className="brand-icon"><Wallet /></div>
        <h1 className="auth-title">Family Finance Manager</h1>
        <p className="auth-sub">Kelola pemasukan, pengeluaran, anggaran, dan target tabungan keluarga dari satu tempat yang nyaman di mobile.</p>

        {mode === 'register' && (
          <div className="field">
            <label>Nama</label>
            <input value={form.name} onChange={(e) => setField('name', e.target.value)} placeholder="Contoh: Ibu Rina" />
          </div>
        )}
        <div className="field">
          <label>Email</label>
          <input type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} placeholder="nama@email.com" />
        </div>
        <div className="field">
          <label>Password</label>
          <input type="password" value={form.password} onChange={(e) => setField('password', e.target.value)} placeholder="Minimal 6 karakter" />
        </div>

        <button className="primary-btn" type="submit">{mode === 'register' ? 'Daftar Akun' : 'Masuk'}</button>
        <button className="secondary-btn" type="button" onClick={loginDemo}>Info Supabase Auth</button>

        <p className="muted tiny" style={{ textAlign: 'center', margin: 0 }}>
          {mode === 'register' ? 'Sudah punya akun?' : 'Belum punya akun?'}{' '}
          <button type="button" className="link-btn" onClick={() => setMode(mode === 'register' ? 'login' : 'register')}>
            {mode === 'register' ? 'Masuk' : 'Daftar'}
          </button>
        </p>
      </form>
    </div>
  );
}
