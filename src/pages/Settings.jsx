import React, { useEffect, useRef, useState } from 'react';
import { Camera, Copy, LogOut, Save, Upload, UserRound, Wallet } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import { Card, ProgressBar } from '../components/UI.jsx';
import { supabase } from '../lib/supabaseClient.js';
import { formatRupiah } from '../utils/format.js';

const roleLabel = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
};

function initials(name = 'Pengguna') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'P';
}

function ProfileAvatar({ user, size = 'large' }) {
  return (
    <div className={`profile-avatar ${size}`}>
      {user?.avatarUrl ? (
        <img src={user.avatarUrl} alt={user?.name || 'Foto profil'} />
      ) : (
        <span>{initials(user?.name)}</span>
      )}
    </div>
  );
}

export default function Settings({ view = 'family' }) {
  const {
    user,
    household,
    familyMembers,
    currentMember,
    accountBalances,
    savingGoals,
    addAccount,
    toggleAccount,
    addSavingGoal,
    depositSavingGoal,
    copyInviteCode,
    logout,
    notify,
    refreshData,
  } = useApp();

  const fileInputRef = useRef(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', avatarUrl: '' });
  const [accountForm, setAccountForm] = useState({ name: '', type: 'cash', initialBalance: '' });
  const [goalForm, setGoalForm] = useState({ name: '', targetAmount: '', currentAmount: '', targetDate: '', note: '' });
  const [deposit, setDeposit] = useState({ id: '', amount: '' });

  useEffect(() => {
    setProfileForm({
      name: user?.name || '',
      avatarUrl: user?.avatarUrl || '',
    });
  }, [user?.name, user?.avatarUrl]);

  const saveProfileData = async ({ name, avatarUrl }) => {
    const payload = {
      id: user.id,
      name: name.trim(),
      email: user.email,
      avatar_url: avatarUrl?.trim() || null,
    };

    const { error: profileError } = await supabase.from('profiles').upsert(payload);
    if (profileError) throw profileError;

    const { error: authError } = await supabase.auth.updateUser({
      data: {
        name: payload.name,
        avatar_url: payload.avatar_url,
      },
    });

    if (authError) throw authError;
  };

  const submitProfile = async (event) => {
    event.preventDefault();

    try {
      if (!profileForm.name.trim()) {
        throw new Error('Nama profil wajib diisi.');
      }

      await saveProfileData({ name: profileForm.name, avatarUrl: profileForm.avatarUrl });
      notify('Profil berhasil diperbarui.');
      await refreshData();
    } catch (error) {
      notify(error.message);
    }
  };

  const uploadAvatar = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      if (!user?.id) throw new Error('Sesi login tidak ditemukan. Silakan login ulang.');
      if (!file.type.startsWith('image/')) throw new Error('File harus berupa gambar.');
      if (file.size > 5 * 1024 * 1024) throw new Error('Ukuran foto maksimal 5MB.');

      setUploadingAvatar(true);

      const extension = file.name.split('.').pop() || 'jpg';
      const filePath = `${user.id}/profile-${Date.now()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type,
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const publicUrl = data.publicUrl;

      setProfileForm((prev) => ({ ...prev, avatarUrl: publicUrl }));
      await saveProfileData({ name: profileForm.name || user.name || 'Pengguna', avatarUrl: publicUrl });
      notify('Foto profil berhasil diupload.');
      await refreshData();
    } catch (error) {
      notify(error.message);
    } finally {
      setUploadingAvatar(false);
      if (event.target) event.target.value = '';
    }
  };

  const submitAccount = async (event) => {
    event.preventDefault();
    try {
      await addAccount(accountForm);
      setAccountForm({ name: '', type: 'cash', initialBalance: '' });
    } catch (error) {
      notify(error.message);
    }
  };

  const submitGoal = async (event) => {
    event.preventDefault();
    try {
      await addSavingGoal(goalForm);
      setGoalForm({ name: '', targetAmount: '', currentAmount: '', targetDate: '', note: '' });
    } catch (error) {
      notify(error.message);
    }
  };

  const submitDeposit = async (event) => {
    event.preventDefault();
    try {
      await depositSavingGoal(deposit.id, deposit.amount);
      setDeposit({ id: '', amount: '' });
    } catch (error) {
      notify(error.message);
    }
  };

  const showProfileOnly = view === 'profile';

  return (
    <div className="page settings-preview-page">
      <header className="header">
        <div>
          <p className="eyebrow">{showProfileOnly ? 'Akun pengguna' : 'Kelola keluarga'}</p>
          <h1>{showProfileOnly ? 'Profil' : 'Pengaturan Keluarga'}</h1>
        </div>

        <button
          className="icon-btn"
          onClick={async () => {
            try {
              await logout();
            } catch (error) {
              notify(error.message);
            }
          }}
          type="button"
          aria-label="Logout"
        >
          <LogOut size={18} />
        </button>
      </header>

      <Card className="profile-hero-card">
        <div className="profile-hero-top">
          <div className="avatar-upload-wrap">
            <ProfileAvatar user={{ ...user, avatarUrl: profileForm.avatarUrl }} />
            <button
              className="avatar-upload-btn"
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              aria-label="Upload foto profil"
            >
              {uploadingAvatar ? '...' : <Camera size={16} />}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={uploadAvatar}
              hidden
            />
          </div>

          <div className="profile-hero-info">
            <p className="section-kicker">Profil</p>
            <h2>{user?.name || 'Pengguna'}</h2>
            <p className="muted tiny">{user?.email}</p>
            <span className={`role-pill ${currentMember?.role || 'member'}`}>
              {roleLabel[currentMember?.role] || 'Member'}
            </span>
          </div>
        </div>

        <form className="form-grid profile-edit-form" onSubmit={submitProfile}>
          <div className="field">
            <label>Nama profil</label>
            <input
              value={profileForm.name}
              onChange={(event) => setProfileForm({ ...profileForm, name: event.target.value })}
              placeholder="Nama Anda"
            />
          </div>

          <div className="field">
            <label>Foto profil</label>
            <button
              className="upload-photo-btn"
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
            >
              <Upload size={16} /> {uploadingAvatar ? 'Mengupload...' : 'Pilih Foto dari Perangkat'}
            </button>
          </div>

          <p className="muted tiny">
            Format yang didukung: JPG, PNG, WEBP, atau GIF. Maksimal 5MB.
          </p>

          <button className="primary-btn" type="submit">
            <Save size={16} /> Simpan Profil
          </button>
        </form>
      </Card>

      {!showProfileOnly && (
        <>
          <Card>
            <p className="section-kicker">Keluarga</p>
            <h2>{household?.name}</h2>

            <div className="invite-box">
              <div>
                <p className="mini-label">Kode undangan</p>
                <strong>{household?.inviteCode || '-'}</strong>
              </div>

              <button className="small-btn" onClick={copyInviteCode} type="button">
                <Copy size={14} /> Salin
              </button>
            </div>

            <p className="muted tiny" style={{ marginTop: 10 }}>
              Bagikan kode ini ke anggota keluarga agar mereka bisa bergabung dan mencatat transaksi bersama.
            </p>

            <div className="drawer-list" style={{ marginTop: 14 }}>
              {familyMembers.map((member) => (
                <div className="member-row" key={member.id}>
                  {member.profile?.avatarUrl ? (
                    <div className="avatar member-photo"><img src={member.profile.avatarUrl} alt={member.profile.name || 'Anggota'} /></div>
                  ) : (
                    <div className="avatar"><UserRound size={18} /></div>
                  )}

                  <div className="item-main">
                    <p className="item-title">{member.profile?.name || 'Anggota keluarga'}</p>
                    <p className="item-sub">{member.profile?.email || 'Email tidak tersedia'}</p>
                  </div>

                  <span className={`role-pill ${member.role}`}>
                    {roleLabel[member.role] || member.role}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <p className="section-kicker">Akun & Dompet Keluarga</p>

            <div className="drawer-list" style={{ marginTop: 12 }}>
              {accountBalances.map((account) => (
                <div className="wallet-row" key={account.id}>
                  <div className="avatar"><Wallet size={18} /></div>
                  <div className="item-main">
                    <p className="item-title">{account.name}</p>
                    <p className="item-sub">{account.type} • {account.isActive ? 'Aktif' : 'Nonaktif'}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p className="amount">{formatRupiah(account.currentBalance)}</p>
                    <button
                      className="link-btn tiny"
                      onClick={async () => {
                        try {
                          await toggleAccount(account.id);
                        } catch (error) {
                          notify(error.message);
                        }
                      }}
                      type="button"
                    >
                      {account.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <form className="form-grid" onSubmit={submitAccount} style={{ marginTop: 16 }}>
              <div className="field">
                <label>Nama akun baru</label>
                <input
                  value={accountForm.name}
                  onChange={(event) => setAccountForm({ ...accountForm, name: event.target.value })}
                  placeholder="Contoh: Bank Mandiri"
                />
              </div>

              <div className="grid-2">
                <div className="field">
                  <label>Jenis</label>
                  <select
                    value={accountForm.type}
                    onChange={(event) => setAccountForm({ ...accountForm, type: event.target.value })}
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
                    type="number"
                    value={accountForm.initialBalance}
                    onChange={(event) => setAccountForm({ ...accountForm, initialBalance: event.target.value })}
                  />
                </div>
              </div>

              <button className="secondary-btn">Tambah Akun/Dompet</button>
            </form>
          </Card>

          <Card>
            <p className="section-kicker">Target Tabungan</p>

            <div className="drawer-list" style={{ marginTop: 12 }}>
              {savingGoals.map((goal) => {
                const pct = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));
                return (
                  <div className="wallet-row" key={goal.id} style={{ alignItems: 'stretch', flexDirection: 'column' }}>
                    <div className="row-between">
                      <div>
                        <p className="item-title">{goal.name}</p>
                        <p className="item-sub">{formatRupiah(goal.currentAmount)} dari {formatRupiah(goal.targetAmount)}</p>
                      </div>
                      <strong>{pct}%</strong>
                    </div>
                    <ProgressBar value={pct} variant="green" />
                  </div>
                );
              })}
            </div>

            <form className="form-grid" onSubmit={submitDeposit} style={{ marginTop: 16 }}>
              <div className="grid-2">
                <div className="field">
                  <label>Target</label>
                  <select value={deposit.id} onChange={(event) => setDeposit({ ...deposit, id: event.target.value })}>
                    <option value="">Pilih</option>
                    {savingGoals.map((goal) => <option value={goal.id} key={goal.id}>{goal.name}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Setoran</label>
                  <input type="number" value={deposit.amount} onChange={(event) => setDeposit({ ...deposit, amount: event.target.value })} />
                </div>
              </div>
              <button className="secondary-btn">Tambah Setoran</button>
            </form>

            <form className="form-grid" onSubmit={submitGoal} style={{ marginTop: 18 }}>
              <div className="field">
                <label>Nama target baru</label>
                <input value={goalForm.name} onChange={(event) => setGoalForm({ ...goalForm, name: event.target.value })} placeholder="Contoh: Dana darurat" />
              </div>
              <div className="grid-2">
                <div className="field">
                  <label>Nominal target</label>
                  <input type="number" value={goalForm.targetAmount} onChange={(event) => setGoalForm({ ...goalForm, targetAmount: event.target.value })} />
                </div>
                <div className="field">
                  <label>Terkumpul</label>
                  <input type="number" value={goalForm.currentAmount} onChange={(event) => setGoalForm({ ...goalForm, currentAmount: event.target.value })} />
                </div>
              </div>
              <button className="secondary-btn">Buat Target Tabungan</button>
            </form>
          </Card>
        </>
      )}
    </div>
  );
}
