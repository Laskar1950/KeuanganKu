import React, { useState } from 'react';
import { ArrowLeft, KeyRound, Mail, ShieldCheck, UserPlus } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import { supabase } from '../lib/supabaseClient.js';

const initialForm = { name: '', email: '', password: '' };

export default function AuthPage() {
  const { register, login, notify } = useApp();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const changeMode = (nextMode) => {
    setMode(nextMode);
    if (nextMode === 'login') setForm(initialForm);
  };

  const submit = async (event) => {
    event.preventDefault();
    try {
      setLoading(true);

      if (mode === 'register') {
        await register(form);
        setMode('login');
        return;
      }

      if (mode === 'forgot') {
        if (!form.email) throw new Error('Masukkan email terlebih dahulu untuk reset password.');
        const { error } = await supabase.auth.resetPasswordForEmail(form.email, {
          redirectTo: window.location.origin,
        });
        if (error) throw error;
        notify('Link reset password sudah dikirim ke email jika akun terdaftar.');
        setMode('login');
        return;
      }

      await login(form);
    } catch (error) {
      notify(error.message);
    } finally {
      setLoading(false);
    }
  };

  const isRegister = mode === 'register';
  const isForgot = mode === 'forgot';
  const isHelp = mode === 'help';

  return (
    <div className="auth-soft-wrap">
      <section className="auth-soft-screen">
        <div className="auth-soft-brand">
          <div className="auth-soft-logo">K</div>
          <div>
            <small>KeuanganKu</small>
            <strong>Keuangan Keluarga</strong>
          </div>
        </div>

        <div className="auth-soft-copy">
          <span>Keuangan keluarga aman terkendali dengan KeuanganKu.</span>
          <h1>{isRegister ? 'Mulai kelola bersama.' : isForgot ? 'Pulihkan akses akun.' : isHelp ? 'Butuh bantuan?' : 'Masuk dengan nyaman.'}</h1>
          <p>
            {isRegister
              ? 'Daftar akun baru untuk membuat atau bergabung ke ruang keuangan keluarga.'
              : isForgot
                ? 'Masukkan email akun. Kami akan mengirim tautan reset password melalui email.'
                : isHelp
                  ? 'Jika mengalami kendala login, cek email dan password terlebih dahulu atau hubungi pengelola keluarga.'
                  : 'Pantau dompet, alokasi, transaksi, dan laporan keluarga dari satu aplikasi yang ringan.'}
          </p>
        </div>

        <div className="auth-soft-card">
          {isHelp ? (
            <div className="auth-help-panel">
              <div className="auth-form-title">
                <strong>Bantuan Login</strong>
                <span>Info</span>
              </div>
              <div className="auth-help-list">
                <div><Mail size={16} /><p>Pastikan email yang digunakan sama dengan email saat daftar.</p></div>
                <div><KeyRound size={16} /><p>Gunakan menu Lupa Password jika tidak ingat password.</p></div>
                <div><ShieldCheck size={16} /><p>Jika belum punya akun, pilih Daftar akun baru.</p></div>
              </div>
              <button className="auth-soft-secondary" type="button" onClick={() => changeMode('login')}>
                <ArrowLeft size={15} /> Kembali ke Login
              </button>
            </div>
          ) : (
            <form className="auth-soft-form" onSubmit={submit}>
              <div className="auth-form-title">
                <strong>{isRegister ? 'Daftar' : isForgot ? 'Lupa Password' : 'Login'}</strong>
                <span>{isRegister ? 'Baru' : isForgot ? 'Reset' : 'Aman'}</span>
              </div>

              {isRegister && (
                <div className="field auth-soft-field">
                  <label>Nama</label>
                  <input value={form.name} onChange={(e) => setField('name', e.target.value)} placeholder="Nama lengkap" />
                </div>
              )}

              <div className="field auth-soft-field">
                <label>Email</label>
                <input type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} placeholder="nama@email.com" />
              </div>

              {!isForgot && (
                <div className="field auth-soft-field">
                  <label>Password</label>
                  <input type="password" value={form.password} onChange={(e) => setField('password', e.target.value)} placeholder="Minimal 6 karakter" autoComplete={isRegister ? 'new-password' : 'current-password'} />
                </div>
              )}

              <button className="auth-soft-primary" type="submit" disabled={loading}>
                {loading ? 'Memproses...' : isRegister ? 'Daftar Akun' : isForgot ? 'Kirim Link Reset' : 'Masuk ke KeuanganKu'}
              </button>

              {!isForgot && !isRegister && (
                <div className="auth-soft-actions">
                  <button className="auth-soft-link" type="button" onClick={() => changeMode('forgot')}>Lupa password?</button>
                  <button className="auth-soft-link" type="button" onClick={() => changeMode('help')}>Butuh bantuan?</button>
                </div>
              )}

              {isForgot && (
                <button className="auth-soft-secondary" type="button" onClick={() => changeMode('login')}>
                  <ArrowLeft size={15} /> Kembali ke Login
                </button>
              )}

              {isRegister ? (
                <button className="auth-soft-secondary" type="button" onClick={() => changeMode('login')}>
                  <ArrowLeft size={15} /> Sudah punya akun? Masuk
                </button>
              ) : !isForgot && (
                <button className="auth-soft-register" type="button" onClick={() => changeMode('register')}>
                  <UserPlus size={15} /> Daftar akun baru
                </button>
              )}
            </form>
          )}
        </div>
      </section>
    </div>
  );
}
