import React, { useState } from 'react';
import { ArrowLeft, Eye, EyeOff, KeyRound, Mail, ShieldCheck, UserPlus } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import { supabase } from '../lib/supabaseClient.js';

const initialForm = { name: '', identifier: '', email: '', password: '' };

function normalizeUsername(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export default function AuthPage() {
  const { login, notify } = useApp();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const changeMode = (nextMode) => {
    setMode(nextMode);
    setShowPassword(false);
    if (nextMode === 'login') setForm(initialForm);
  };

  const resolveLoginEmail = async () => {
    const identifier = form.identifier.trim();
    if (!identifier) throw new Error('Email atau username wajib diisi.');
    if (identifier.includes('@')) return identifier;

    const { data, error } = await supabase.rpc('get_login_email', { p_identifier: identifier });
    if (error) throw error;
    if (!data) throw new Error('Username tidak ditemukan. Coba masuk menggunakan email.');
    return data;
  };

  const registerAccount = async () => {
    const name = form.name.trim();
    const email = form.email.trim();
    const username = normalizeUsername(form.identifier || email.split('@')[0]);

    if (!name || !email || !form.password) throw new Error('Nama, email, dan password wajib diisi.');
    if (!username || username.length < 3) throw new Error('Username minimal 3 karakter.');
    if (form.password.length < 6) throw new Error('Password minimal 6 karakter.');

    const { data, error } = await supabase.auth.signUp({
      email,
      password: form.password,
      options: { data: { name, username } },
    });
    if (error) throw error;

    if (data.user) {
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: data.user.id,
        name,
        email,
        username,
      });
      if (profileError && profileError.code !== '42501') throw profileError;
    }

    notify('Registrasi berhasil. Silakan login atau cek email jika konfirmasi email aktif.');
  };

  const submit = async (event) => {
    event.preventDefault();
    try {
      setLoading(true);

      if (mode === 'register') {
        await registerAccount();
        setMode('login');
        return;
      }

      if (mode === 'forgot') {
        const email = await resolveLoginEmail();
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        });
        if (error) throw error;
        notify('Link reset password sudah dikirim ke email jika akun terdaftar.');
        setMode('login');
        return;
      }

      const email = await resolveLoginEmail();
      await login({ email, password: form.password });
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
                ? 'Masukkan email atau username. Kami akan mengirim tautan reset password melalui email.'
                : isHelp
                  ? 'Jika mengalami kendala login, cek email, username, dan password terlebih dahulu atau hubungi pengelola keluarga.'
                  : 'Pantau dompet, alokasi, transaksi, dan laporan keluarga dari satu aplikasi yang ringan.'}
          </p>
        </div>

        <div className="auth-soft-card">
          {isHelp ? (
            <div className="auth-help-panel">
              <div className="auth-form-title no-badge">
                <strong>Bantuan Login</strong>
              </div>
              <div className="auth-help-list">
                <div><Mail size={16} /><p>Masuk bisa menggunakan email atau username akun.</p></div>
                <div><KeyRound size={16} /><p>Gunakan menu Lupa Password jika tidak ingat password.</p></div>
                <div><ShieldCheck size={16} /><p>Jika belum punya akun, pilih Daftar akun baru.</p></div>
              </div>
              <button className="auth-soft-secondary" type="button" onClick={() => changeMode('login')}>
                <ArrowLeft size={15} /> Kembali ke Login
              </button>
            </div>
          ) : (
            <form className="auth-soft-form" onSubmit={submit}>
              <div className="auth-form-title no-badge">
                <strong>{isRegister ? 'Daftar' : isForgot ? 'Lupa Password' : 'Login'}</strong>
              </div>

              {isRegister && (
                <div className="field auth-soft-field">
                  <label>Nama</label>
                  <input value={form.name} onChange={(e) => setField('name', e.target.value)} placeholder="Nama lengkap" />
                </div>
              )}

              {isRegister ? (
                <>
                  <div className="field auth-soft-field">
                    <label>Username</label>
                    <input value={form.identifier} onChange={(e) => setField('identifier', e.target.value)} placeholder="contoh: rizki_afrizal" autoCapitalize="none" />
                  </div>
                  <div className="field auth-soft-field">
                    <label>Email</label>
                    <input type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} placeholder="nama@email.com" autoCapitalize="none" />
                  </div>
                </>
              ) : (
                <div className="field auth-soft-field">
                  <label>{isForgot ? 'Email atau Username' : 'Email / Username'}</label>
                  <input type="text" value={form.identifier} onChange={(e) => setField('identifier', e.target.value)} placeholder="email atau username" autoCapitalize="none" />
                </div>
              )}

              {!isForgot && (
                <div className="field auth-soft-field auth-password-field">
                  <label>Password</label>
                  <div className="auth-password-control">
                    <input type={showPassword ? 'text' : 'password'} value={form.password} onChange={(e) => setField('password', e.target.value)} placeholder="Minimal 6 karakter" autoComplete={isRegister ? 'new-password' : 'current-password'} />
                    <button type="button" className="auth-password-toggle" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}>
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              )}

              <button className="auth-soft-primary" type="submit" disabled={loading}>
                {loading ? 'Memproses...' : isRegister ? 'Daftar Akun' : isForgot ? 'Kirim Link Reset' : 'Masuk'}
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
