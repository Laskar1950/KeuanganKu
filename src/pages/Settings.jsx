import React, { useEffect, useRef, useState } from 'react';
import { Camera, Copy, KeyRound, LogOut, Pencil, Save, Trash2, Upload, UserRound, Wallet, X } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import { Card, ProgressBar } from '../components/UI.jsx';
import { supabase } from '../lib/supabaseClient.js';
import { formatRupiah } from '../utils/format.js';

const roleLabel = { owner: 'Owner', admin: 'Admin', member: 'Member' };
const accountTypeLabel = { cash: 'Cash', bank: 'Bank', ewallet: 'E-Wallet', saving: 'Tabungan', other: 'Lainnya' };
const emptyAccountForm = { name: '', type: 'cash', initialBalance: '' };

function initials(name = 'Pengguna') {
  return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'P';
}

function ProfileAvatar({ user, size = 'large' }) {
  return <div className={`profile-avatar ${size}`}>{user?.avatarUrl ? <img src={user.avatarUrl} alt={user?.name || 'Foto profil'} /> : <span>{initials(user?.name)}</span>}</div>;
}

function MemberAvatar({ member }) {
  if (member.profile?.avatarUrl) return <div className="avatar member-photo"><img src={member.profile.avatarUrl} alt={member.profile.name || 'Anggota'} /></div>;
  return <div className="avatar member-initials"><span>{initials(member.profile?.name || 'Anggota')}</span></div>;
}

export default function Settings({ view = 'family' }) {
  const {
    user, household, familyMembers, currentMember, accountBalances, categories, savingGoals,
    addAccount, updateAccount, toggleAccount, addCategory, deleteCategory,
    addSavingGoal, depositSavingGoal, copyInviteCode, logout, notify, refreshData,
  } = useApp();

  const fileInputRef = useRef(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', avatarUrl: '' });
  const [passwordForm, setPasswordForm] = useState({ password: '', confirmPassword: '' });
  const [accountForm, setAccountForm] = useState(emptyAccountForm);
  const [editingAccountId, setEditingAccountId] = useState(null);
  const [categoryForm, setCategoryForm] = useState({ name: '', type: 'expense' });
  const [goalForm, setGoalForm] = useState({ name: '', targetAmount: '', currentAmount: '', targetDate: '', note: '' });
  const [deposit, setDeposit] = useState({ id: '', amount: '' });

  const isProfilePage = view === 'profile';
  const isOwner = currentMember?.role === 'owner';
  const familyCategories = categories.filter((category) => category.familyId);
  const defaultCategories = categories.filter((category) => !category.familyId);

  useEffect(() => {
    setProfileForm({ name: user?.name || '', avatarUrl: user?.avatarUrl || '' });
  }, [user?.name, user?.avatarUrl]);

  const saveProfileData = async ({ name, avatarUrl }) => {
    const payload = { id: user.id, name: name.trim(), email: user.email, avatar_url: avatarUrl?.trim() || null };
    const { error: profileError } = await supabase.from('profiles').upsert(payload);
    if (profileError) throw profileError;
    const { error: authError } = await supabase.auth.updateUser({ data: { name: payload.name, avatar_url: payload.avatar_url } });
    if (authError) throw authError;
  };

  const submitProfile = async (event) => {
    event.preventDefault();
    try {
      if (!profileForm.name.trim()) throw new Error('Nama profil wajib diisi.');
      await saveProfileData({ name: profileForm.name, avatarUrl: profileForm.avatarUrl });
      notify('Profil berhasil diperbarui.');
      await refreshData();
    } catch (error) { notify(error.message); }
  };

  const submitPassword = async (event) => {
    event.preventDefault();
    try {
      if (!passwordForm.password || !passwordForm.confirmPassword) throw new Error('Password baru dan konfirmasi password wajib diisi.');
      if (passwordForm.password.length < 6) throw new Error('Password minimal 6 karakter.');
      if (passwordForm.password !== passwordForm.confirmPassword) throw new Error('Konfirmasi password tidak sama.');
      const { error } = await supabase.auth.updateUser({ password: passwordForm.password });
      if (error) throw error;
      setPasswordForm({ password: '', confirmPassword: '' });
      notify('Password berhasil diganti. Gunakan password baru saat login berikutnya.');
    } catch (error) { notify(error.message); }
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
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { cacheControl: '3600', upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const publicUrl = data.publicUrl;
      setProfileForm((prev) => ({ ...prev, avatarUrl: publicUrl }));
      await saveProfileData({ name: profileForm.name || user.name || 'Pengguna', avatarUrl: publicUrl });
      notify('Foto profil berhasil diupload.');
      await refreshData();
    } catch (error) { notify(error.message); }
    finally { setUploadingAvatar(false); if (event.target) event.target.value = ''; }
  };

  const submitAccount = async (event) => {
    event.preventDefault();
    try {
      if (editingAccountId) {
        await updateAccount(editingAccountId, accountForm);
        setEditingAccountId(null);
      } else {
        await addAccount(accountForm);
      }
      setAccountForm(emptyAccountForm);
    } catch (error) { notify(error.message); }
  };

  const startEditAccount = (account) => {
    setEditingAccountId(account.id);
    setAccountForm({ name: account.name, type: account.type, initialBalance: String(account.initialBalance || 0) });
  };

  const cancelEditAccount = () => {
    setEditingAccountId(null);
    setAccountForm(emptyAccountForm);
  };

  const submitCategory = async (event) => {
    event.preventDefault();
    try {
      await addCategory(categoryForm);
      setCategoryForm({ name: '', type: 'expense' });
    } catch (error) { notify(error.message); }
  };

  const submitGoal = async (event) => {
    event.preventDefault();
    try { await addSavingGoal(goalForm); setGoalForm({ name: '', targetAmount: '', currentAmount: '', targetDate: '', note: '' }); }
    catch (error) { notify(error.message); }
  };

  const submitDeposit = async (event) => {
    event.preventDefault();
    try { await depositSavingGoal(deposit.id, deposit.amount); setDeposit({ id: '', amount: '' }); }
    catch (error) { notify(error.message); }
  };

  const handleLogout = async () => { try { await logout(); } catch (error) { notify(error.message); } };

  return (
    <div className="page settings-preview-page">
      <header className="header">
        <div>
          <p className="eyebrow">{isProfilePage ? 'Akun pengguna' : 'Kelola keluarga'}</p>
          <h1>{isProfilePage ? 'Profil' : 'Pengaturan Keluarga'}</h1>
        </div>
        <button className="icon-btn" onClick={handleLogout} type="button" aria-label="Logout"><LogOut size={18} /></button>
      </header>

      {isProfilePage ? (
        <>
          <Card className="profile-hero-card">
            <div className="profile-hero-top">
              <div className="avatar-upload-wrap">
                <ProfileAvatar user={{ ...user, avatarUrl: profileForm.avatarUrl }} />
                <button className="avatar-upload-btn" type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingAvatar} aria-label="Upload foto profil">
                  {uploadingAvatar ? '...' : <Camera size={16} />}
                </button>
                <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={uploadAvatar} hidden />
              </div>
              <div className="profile-hero-info">
                <p className="section-kicker">Profil</p>
                <h2>{user?.name || 'Pengguna'}</h2>
                <p className="muted tiny">{user?.email}</p>
                <span className={`role-pill ${currentMember?.role || 'member'}`}>{roleLabel[currentMember?.role] || 'Member'}</span>
              </div>
            </div>
            <form className="form-grid profile-edit-form" onSubmit={submitProfile}>
              <div className="field"><label>Nama profil</label><input value={profileForm.name} onChange={(event) => setProfileForm({ ...profileForm, name: event.target.value })} placeholder="Nama Anda" /></div>
              <div className="field"><label>Foto profil</label><button className="upload-photo-btn" type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingAvatar}><Upload size={16} /> {uploadingAvatar ? 'Mengupload...' : 'Pilih Foto dari Perangkat'}</button></div>
              <p className="muted tiny">Format yang didukung: JPG, PNG, WEBP, atau GIF. Maksimal 5MB.</p>
              <button className="primary-btn" type="submit"><Save size={16} /> Simpan Profil</button>
            </form>
          </Card>
          <Card className="password-card">
            <p className="section-kicker">Keamanan</p><h2>Ganti Password</h2>
            <p className="muted tiny password-help">Gunakan password minimal 6 karakter agar akun tetap aman.</p>
            <form className="form-grid" onSubmit={submitPassword}>
              <div className="field"><label>Password baru</label><input type="password" value={passwordForm.password} onChange={(event) => setPasswordForm({ ...passwordForm, password: event.target.value })} placeholder="Masukkan password baru" autoComplete="new-password" /></div>
              <div className="field"><label>Konfirmasi password</label><input type="password" value={passwordForm.confirmPassword} onChange={(event) => setPasswordForm({ ...passwordForm, confirmPassword: event.target.value })} placeholder="Ulangi password baru" autoComplete="new-password" /></div>
              <button className="secondary-btn password-submit-btn" type="submit"><KeyRound size={16} /> Ganti Password</button>
            </form>
          </Card>
        </>
      ) : (
        <>
          <Card className="family-overview-card">
            <div className="family-cover-row">
              <div className="family-stack-avatars">
                {familyMembers.slice(0, 4).map((member, index) => (
                  <div className="family-stack-avatar" style={{ zIndex: 10 - index }} key={member.id}>{member.profile?.avatarUrl ? <img src={member.profile.avatarUrl} alt={member.profile.name || 'Anggota'} /> : <span>{initials(member.profile?.name)}</span>}</div>
                ))}
              </div>
              <div className="family-overview-text"><p className="section-kicker">Keluarga</p><h2>{household?.name}</h2><p className="muted tiny">{familyMembers.length} anggota tergabung</p></div>
            </div>
            <div className="invite-box family-invite-box"><div><p className="mini-label">Kode undangan keluarga</p><strong>{household?.inviteCode || '-'}</strong></div><button className="small-btn" onClick={copyInviteCode} type="button"><Copy size={14} /> Salin</button></div>
          </Card>

          <Card className="family-members-card">
            <div className="row-between"><div><p className="section-kicker">Anggota Keluarga</p><h2>{familyMembers.length} Anggota</h2></div><span className={`role-pill ${currentMember?.role || 'member'}`}>{roleLabel[currentMember?.role] || 'Member'}</span></div>
            <div className="drawer-list" style={{ marginTop: 14 }}>{familyMembers.map((member) => <div className="member-row" key={member.id}><MemberAvatar member={member} /><div className="item-main"><p className="item-title">{member.profile?.name || 'Anggota keluarga'}</p><p className="item-sub">{member.profile?.email || 'Email tidak tersedia'}</p></div><span className={`role-pill ${member.role}`}>{roleLabel[member.role] || member.role}</span></div>)}</div>
          </Card>

          <Card>
            <div className="row-between"><div><p className="section-kicker">Akun & Dompet Keluarga</p><h2>Kelola Dompet</h2></div>{!isOwner && <span className="role-pill member">Read only</span>}</div>
            <div className="drawer-list" style={{ marginTop: 12 }}>
              {accountBalances.map((account) => (
                <div className="wallet-row wallet-management-row" key={account.id}>
                  <div className="avatar"><Wallet size={18} /></div>
                  <div className="item-main"><p className="item-title">{account.name}</p><p className="item-sub">{accountTypeLabel[account.type] || account.type} • {account.isActive ? 'Aktif' : 'Nonaktif'}</p></div>
                  <div className="wallet-actions"><p className="amount">{formatRupiah(account.currentBalance)}</p>{isOwner && <div className="inline-actions"><button className="action-btn edit" type="button" onClick={() => startEditAccount(account)}><Pencil size={12} /> Edit</button><button className="link-btn tiny" type="button" onClick={() => toggleAccount(account.id)}>{account.isActive ? 'Nonaktifkan' : 'Aktifkan'}</button></div>}</div>
                </div>
              ))}
            </div>
            {isOwner ? <form className="form-grid" onSubmit={submitAccount} style={{ marginTop: 16 }}>
              <div className="row-between"><p className="section-kicker">{editingAccountId ? 'Edit Dompet' : 'Tambah Dompet'}</p>{editingAccountId && <button className="small-btn" type="button" onClick={cancelEditAccount}><X size={13} /> Batal</button>}</div>
              <div className="field"><label>Nama akun/dompet</label><input value={accountForm.name} onChange={(event) => setAccountForm({ ...accountForm, name: event.target.value })} placeholder="Contoh: Bank Mandiri" /></div>
              <div className="grid-2"><div className="field"><label>Jenis</label><select value={accountForm.type} onChange={(event) => setAccountForm({ ...accountForm, type: event.target.value })}>{Object.entries(accountTypeLabel).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></div><div className="field"><label>Saldo awal</label><input type="number" value={accountForm.initialBalance} onChange={(event) => setAccountForm({ ...accountForm, initialBalance: event.target.value })} /></div></div>
              <button className="secondary-btn">{editingAccountId ? 'Simpan Perubahan Dompet' : 'Tambah Akun/Dompet'}</button>
            </form> : <p className="muted tiny owner-only-note">Hanya owner keluarga yang bisa menambah, mengedit, atau menonaktifkan dompet.</p>}
          </Card>

          <Card className="category-management-card">
            <div className="row-between"><div><p className="section-kicker">Kategori Transaksi</p><h2>Kategori Manual</h2></div>{!isOwner && <span className="role-pill member">Read only</span>}</div>
            {isOwner && <form className="form-grid" onSubmit={submitCategory} style={{ marginTop: 14 }}><div className="grid-2"><div className="field"><label>Nama kategori</label><input value={categoryForm.name} onChange={(event) => setCategoryForm({ ...categoryForm, name: event.target.value })} placeholder="Contoh: Belanja Anak" /></div><div className="field"><label>Jenis</label><select value={categoryForm.type} onChange={(event) => setCategoryForm({ ...categoryForm, type: event.target.value })}><option value="expense">Pengeluaran</option><option value="income">Pemasukan</option></select></div></div><button className="secondary-btn">Tambah Kategori</button></form>}
            <div className="category-section"><p className="mini-label">Kategori custom keluarga</p><div className="category-chip-grid">{familyCategories.length ? familyCategories.map((category) => <span className={`category-chip ${category.type}`} key={category.id}>{category.name}<em>{category.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}</em>{isOwner && <button type="button" onClick={() => deleteCategory(category.id)} aria-label="Hapus kategori"><Trash2 size={12} /></button>}</span>) : <p className="muted tiny">Belum ada kategori custom.</p>}</div></div>
            <div className="category-section"><p className="mini-label">Kategori bawaan</p><div className="category-chip-grid compact">{defaultCategories.map((category) => <span className={`category-chip readonly ${category.type}`} key={category.id}>{category.name}</span>)}</div></div>
          </Card>

          <Card>
            <p className="section-kicker">Target Tabungan</p>
            <div className="drawer-list" style={{ marginTop: 12 }}>{savingGoals.map((goal) => { const pct = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100)); return <div className="wallet-row" key={goal.id} style={{ alignItems: 'stretch', flexDirection: 'column' }}><div className="row-between"><div><p className="item-title">{goal.name}</p><p className="item-sub">{formatRupiah(goal.currentAmount)} dari {formatRupiah(goal.targetAmount)}</p></div><strong>{pct}%</strong></div><ProgressBar value={pct} variant="green" /></div>; })}</div>
            <form className="form-grid" onSubmit={submitDeposit} style={{ marginTop: 16 }}><div className="grid-2"><div className="field"><label>Target</label><select value={deposit.id} onChange={(event) => setDeposit({ ...deposit, id: event.target.value })}><option value="">Pilih</option>{savingGoals.map((goal) => <option value={goal.id} key={goal.id}>{goal.name}</option>)}</select></div><div className="field"><label>Setoran</label><input type="number" value={deposit.amount} onChange={(event) => setDeposit({ ...deposit, amount: event.target.value })} /></div></div><button className="secondary-btn">Tambah Setoran</button></form>
            <form className="form-grid" onSubmit={submitGoal} style={{ marginTop: 18 }}><div className="field"><label>Nama target baru</label><input value={goalForm.name} onChange={(event) => setGoalForm({ ...goalForm, name: event.target.value })} placeholder="Contoh: Dana darurat" /></div><div className="grid-2"><div className="field"><label>Nominal target</label><input type="number" value={goalForm.targetAmount} onChange={(event) => setGoalForm({ ...goalForm, targetAmount: event.target.value })} /></div><div className="field"><label>Terkumpul</label><input type="number" value={goalForm.currentAmount} onChange={(event) => setGoalForm({ ...goalForm, currentAmount: event.target.value })} /></div></div><button className="secondary-btn">Buat Target Tabungan</button></form>
          </Card>
        </>
      )}
    </div>
  );
}
