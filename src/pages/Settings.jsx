import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Copy,
  KeyRound,
  LogOut,
  Pencil,
  PiggyBank,
  Save,
  ShieldCheck,
  Tags,
  Trash2,
  Upload,
  UserPlus,
  UserRound,
  UsersRound,
  Wallet,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import { Card, ProgressBar } from '../components/UI.jsx';
import { supabase } from '../lib/supabaseClient.js';
import { formatRupiah } from '../utils/format.js';
import '../role-management.css';

const roleLabel = { owner: 'Owner', admin: 'Admin', member: 'Member' };
const accountTypeLabel = { cash: 'Cash', bank: 'Bank', ewallet: 'E-Wallet', saving: 'Tabungan', other: 'Lainnya' };
const emptyAccountForm = { name: '', type: 'cash', initialBalance: '' };
const emptyMemberForm = { identifier: '', role: 'member' };

const roleAccessRows = [
  { label: 'Tambah transaksi', owner: 'Ya', admin: 'Ya', member: 'Ya' },
  { label: 'Edit transaksi sendiri', owner: 'Ya', admin: 'Ya', member: 'Ya' },
  { label: 'Edit transaksi semua anggota', owner: 'Ya', admin: 'Ya', member: 'Tidak' },
  { label: 'Hapus transaksi', owner: 'Ya', admin: 'Ya', member: 'Tidak' },
  { label: 'Kelola dompet', owner: 'Ya', admin: 'Ya', member: 'Tidak' },
  { label: 'Kelola alokasi', owner: 'Ya', admin: 'Ya', member: 'Tidak' },
  { label: 'Kelola kategori', owner: 'Ya', admin: 'Ya', member: 'Tidak' },
  { label: 'Kelola target tabungan', owner: 'Ya', admin: 'Ya', member: 'Tidak' },
  { label: 'Tambah anggota', owner: 'Admin/Member', admin: 'Member saja', member: 'Tidak' },
  { label: 'Ubah role anggota', owner: 'Ya', admin: 'Tidak', member: 'Tidak' },
  { label: 'Hapus anggota', owner: 'Admin/Member', admin: 'Member saja', member: 'Tidak' },
  { label: 'Lihat laporan', owner: 'Ya', admin: 'Ya', member: 'Ya' },
  { label: 'Ubah data keluarga', owner: 'Ya', admin: 'Tidak', member: 'Tidak' },
];


function initials(name = 'Pengguna') {
  return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'P';
}

function normalizeUsername(value = '') {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'user';
}

function ProfileAvatar({ user, size = 'large' }) {
  return <div className={`profile-avatar ${size}`}>{user?.avatarUrl ? <img src={user.avatarUrl} alt={user?.name || 'Foto profil'} /> : <span>{initials(user?.name)}</span>}</div>;
}

function MemberAvatar({ member }) {
  if (member.profile?.avatarUrl) return <div className="avatar member-photo"><img src={member.profile.avatarUrl} alt={member.profile.name || 'Anggota'} /></div>;
  return <div className="avatar member-initials"><span>{initials(member.profile?.name || 'Anggota')}</span></div>;
}

function SettingsMenuButton({ icon: Icon, title, description, badge, onClick }) {
  return (
    <button className="settings-menu-button" type="button" onClick={onClick}>
      <span className="settings-menu-icon"><Icon size={18} /></span>
      <span className="settings-menu-copy">
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
      {badge && <em>{badge}</em>}
      <ChevronRight size={17} />
    </button>
  );
}

export default function Settings() {
  const {
    user, household, familyMembers, currentMember, accountBalances, categories, savingGoals,
    addAccount, updateAccount, toggleAccount, addCategory, deleteCategory,
    addSavingGoal, depositSavingGoal, copyInviteCode, logout, notify, refreshData,
  } = useApp();

  const fileInputRef = useRef(null);
  const [activePanel, setActivePanel] = useState('menu');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', avatarUrl: '' });
  const [passwordForm, setPasswordForm] = useState({ password: '', confirmPassword: '' });
  const [accountForm, setAccountForm] = useState(emptyAccountForm);
  const [editingAccountId, setEditingAccountId] = useState(null);
  const [categoryForm, setCategoryForm] = useState({ name: '', type: 'income' });
  const [goalForm, setGoalForm] = useState({ name: '', targetAmount: '', currentAmount: '', targetDate: '', note: '' });
  const [deposit, setDeposit] = useState({ id: '', amount: '' });

  const [memberForm, setMemberForm] = useState(emptyMemberForm);
  const [roleDrafts, setRoleDrafts] = useState({});
  const [addingMember, setAddingMember] = useState(false);
  const [processingMemberId, setProcessingMemberId] = useState('');

  const isOwner = currentMember?.role === 'owner';
  const isAdmin = currentMember?.role === 'admin';
  const canManageMembers = isOwner || isAdmin;
  const canManageWallets = isOwner || isAdmin;
  const canManageCategories = isOwner || isAdmin;
  const canManageSavingGoals = isOwner || isAdmin;
  const incomeCategories = categories.filter((category) => category.type === 'income');
  const familyIncomeCategories = incomeCategories.filter((category) => category.familyId);
  const defaultIncomeCategories = incomeCategories.filter((category) => !category.familyId);

  useEffect(() => {
    setProfileForm({ name: user?.name || '', avatarUrl: user?.avatarUrl || '' });
  }, [user?.name, user?.avatarUrl]);

  useEffect(() => {
    const drafts = {};
    familyMembers.forEach((member) => {
      drafts[member.id] = member.role === 'owner' ? 'member' : member.role || 'member';
    });
    setRoleDrafts(drafts);
  }, [familyMembers]);

  const goMenu = () => setActivePanel('menu');

  const saveProfileData = async ({ name, avatarUrl }) => {
    const username = user?.username || normalizeUsername(user?.email?.split('@')[0] || name);
    const payload = {
      id: user.id,
      name: name.trim(),
      email: user.email,
      username,
      avatar_url: avatarUrl?.trim() || null,
    };
    const { error: profileError } = await supabase.from('profiles').upsert(payload);
    if (profileError) throw profileError;
    const { error: authError } = await supabase.auth.updateUser({
      data: { name: payload.name, username: payload.username, avatar_url: payload.avatar_url },
    });
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
      await addCategory({ name: categoryForm.name, type: 'income' });
      setCategoryForm({ name: '', type: 'income' });
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

  const submitAddMember = async (event) => {
    event.preventDefault();
    try {
      if (!canManageMembers) throw new Error('Hanya owner atau admin yang bisa menambahkan anggota.');
      if (isAdmin && memberForm.role !== 'member') throw new Error('Admin hanya bisa menambahkan anggota sebagai member.');
      if (!memberForm.identifier.trim()) throw new Error('Email atau username anggota wajib diisi.');
      setAddingMember(true);
      const { error } = await supabase.rpc('add_family_member_by_identifier', {
        p_identifier: memberForm.identifier.trim(),
        p_role: isAdmin ? 'member' : memberForm.role,
      });
      if (error) throw error;
      setMemberForm(emptyMemberForm);
      notify('Anggota berhasil ditambahkan ke keluarga.');
      await refreshData();
    } catch (error) { notify(error.message); }
    finally { setAddingMember(false); }
  };

  const saveMemberRole = async (member) => {
    try {
      if (!canManageMembers) throw new Error('Hanya owner atau admin yang bisa mengubah role anggota.');
      if (member.userId === user?.id) throw new Error('Anda tidak bisa mengubah role akun sendiri.');
      if (isAdmin && member.role !== 'member') throw new Error('Admin tidak bisa mengubah role owner atau admin lain.');
      const nextRole = roleDrafts[member.id] || member.role;
      if (!nextRole || nextRole === 'owner') throw new Error('Role tidak valid.');
      if (isAdmin && nextRole !== 'member') throw new Error('Admin tidak bisa mengangkat anggota menjadi admin.');
      if (nextRole === member.role) {
        notify('Role anggota tidak berubah.');
        return;
      }
      setProcessingMemberId(member.id);
      const { error } = await supabase.rpc('update_family_member_role', {
        p_member_id: member.id,
        p_role: nextRole,
      });
      if (error) throw error;
      notify('Role anggota berhasil diperbarui.');
      await refreshData();
    } catch (error) { notify(error.message); }
    finally { setProcessingMemberId(''); }
  };

  const removeMember = async (member) => {
    try {
      if (!canManageMembers) throw new Error('Hanya owner atau admin yang bisa menghapus anggota.');
      if (member.userId === user?.id) throw new Error('Anda tidak bisa menghapus akun sendiri.');
      if (isAdmin && member.role !== 'member') throw new Error('Admin tidak bisa menghapus owner atau admin lain.');
      const memberName = member.profile?.name || member.profile?.email || 'anggota ini';
      if (!window.confirm(`Hapus ${memberName} dari keluarga?`)) return;
      setProcessingMemberId(member.id);
      const { error } = await supabase.rpc('remove_family_member', { p_member_id: member.id });
      if (error) throw error;
      notify('Anggota berhasil dihapus dari keluarga.');
      await refreshData();
    } catch (error) { notify(error.message); }
    finally { setProcessingMemberId(''); }
  };

  const handleLogout = async () => { try { await logout(); } catch (error) { notify(error.message); } };

  const renderPanelHeader = (title, kicker = 'Pengaturan') => (
    <header className="header settings-panel-header">
      <button className="icon-btn" type="button" onClick={goMenu} aria-label="Kembali ke menu"><ChevronLeft size={18} /></button>
      <div>
        <p className="eyebrow">{kicker}</p>
        <h1>{title}</h1>
      </div>
    </header>
  );

  const renderMenu = () => (
    <>
      <header className="header playful-page-header">
        <div>
          <p className="eyebrow">Pengaturan</p>
          <h1>Profil & Keluarga</h1>
        </div>
        <button className="icon-btn playful-icon-btn" onClick={handleLogout} type="button" aria-label="Logout"><LogOut size={18} /></button>
      </header>

      <Card className="settings-profile-summary">
        <div className="profile-hero-top">
          <ProfileAvatar user={{ ...user, avatarUrl: profileForm.avatarUrl }} />
          <div className="profile-hero-info">
            <p className="section-kicker">Akun aktif</p>
            <h2>{user?.name || 'Pengguna'}</h2>
            <p className="muted tiny">{user?.email}</p>
            {user?.username && <p className="muted tiny">@{user.username}</p>}
            <span className={`role-pill ${currentMember?.role || 'member'}`}>{roleLabel[currentMember?.role] || 'Member'}</span>
          </div>
        </div>
      </Card>

      <section className="settings-menu-section">
        <p className="section-kicker">Profil Saya</p>
        <div className="settings-menu-list">
          <SettingsMenuButton icon={UserRound} title="Profil Akun" description="Ubah nama dan foto profil." onClick={() => setActivePanel('profile')} />
          <SettingsMenuButton icon={KeyRound} title="Ganti Password" description="Perbarui password login akun." onClick={() => setActivePanel('password')} />
        </div>
      </section>

      <section className="settings-menu-section">
        <p className="section-kicker">Keluarga</p>
        <div className="settings-menu-list">
          <SettingsMenuButton icon={UsersRound} title="Anggota Keluarga" description="Kelola anggota, tambah anggota, dan ubah role." badge={`${familyMembers.length} orang`} onClick={() => setActivePanel('family')} />
          <SettingsMenuButton icon={ShieldCheck} title="Hak Akses Role" description="Lihat batas akses Owner, Admin, dan Member." onClick={() => setActivePanel('access')} />
          <SettingsMenuButton icon={Wallet} title="Dompet Keluarga" description="Kelola dompet dan saldo awal." badge={`${accountBalances.length} dompet`} onClick={() => setActivePanel('wallets')} />
        </div>
      </section>

      <section className="settings-menu-section">
        <p className="section-kicker">Keuangan</p>
        <div className="settings-menu-list">
          <SettingsMenuButton icon={Tags} title="Kategori Pemasukan" description="Kategori untuk transaksi pemasukan." badge={`${incomeCategories.length} kategori`} onClick={() => setActivePanel('categories')} />
          <SettingsMenuButton icon={PiggyBank} title="Target Tabungan" description="Kelola target dan setoran tabungan." badge={`${savingGoals.length} target`} onClick={() => setActivePanel('goals')} />
        </div>
      </section>
    </>
  );

  const renderProfilePanel = () => (
    <>
      {renderPanelHeader('Profil Akun', 'Profil Saya')}
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
            <p className="section-kicker">Informasi Akun</p>
            <h2>{user?.name || 'Pengguna'}</h2>
            <p className="muted tiny">{user?.email}</p>
            {user?.username && <p className="muted tiny">@{user.username}</p>}
            <span className={`role-pill ${currentMember?.role || 'member'}`}>{roleLabel[currentMember?.role] || 'Member'}</span>
          </div>
        </div>
        <form className="form-grid profile-edit-form" onSubmit={submitProfile}>
          <div className="field"><label>Nama profil</label><input value={profileForm.name} onChange={(event) => setProfileForm({ ...profileForm, name: event.target.value })} placeholder="Nama Anda" /></div>
          <div className="field"><label>Email</label><input value={user?.email || ''} disabled readOnly /></div>
          <div className="field"><label>Username</label><input value={user?.username ? `@${user.username}` : '-'} disabled readOnly /></div>
          <div className="field"><label>Foto profil</label><button className="upload-photo-btn" type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingAvatar}><Upload size={16} /> {uploadingAvatar ? 'Mengupload...' : 'Pilih Foto dari Perangkat'}</button></div>
          <p className="muted tiny">Format yang didukung: JPG, PNG, WEBP, atau GIF. Maksimal 5MB.</p>
          <button className="primary-btn" type="submit"><Save size={16} /> Simpan Profil</button>
        </form>
      </Card>
    </>
  );

  const renderPasswordPanel = () => (
    <>
      {renderPanelHeader('Ganti Password', 'Keamanan')}
      <Card className="password-card">
        <p className="section-kicker">Keamanan Akun</p><h2>Password Login</h2>
        <p className="muted tiny password-help">Gunakan password minimal 6 karakter agar akun tetap aman.</p>
        <form className="form-grid" onSubmit={submitPassword}>
          <div className="field"><label>Password baru</label><input type="password" value={passwordForm.password} onChange={(event) => setPasswordForm({ ...passwordForm, password: event.target.value })} placeholder="Masukkan password baru" autoComplete="new-password" /></div>
          <div className="field"><label>Konfirmasi password</label><input type="password" value={passwordForm.confirmPassword} onChange={(event) => setPasswordForm({ ...passwordForm, confirmPassword: event.target.value })} placeholder="Ulangi password baru" autoComplete="new-password" /></div>
          <button className="secondary-btn password-submit-btn" type="submit"><KeyRound size={16} /> Ganti Password</button>
        </form>
      </Card>
    </>
  );

  const renderFamilyPanel = () => (
    <>
      {renderPanelHeader('Anggota Keluarga', 'Keluarga')}
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

      {canManageMembers && (
        <Card className="role-management-card add-member-card">
          <div className="row-between">
            <div>
              <p className="section-kicker">Role Management</p>
              <h2>Tambah Anggota</h2>
            </div>
            <span className={`role-pill ${currentMember?.role || 'member'}`}>{roleLabel[currentMember?.role] || 'Member'}</span>
          </div>
          <p className="muted tiny role-management-help">Owner dapat menambahkan anggota sebagai admin atau member. Admin dapat menambahkan anggota sebagai member dan mengelola anggota yang bukan owner/admin.</p>
          <form className="form-grid add-member-form" onSubmit={submitAddMember}>
            <div className="field">
              <label>Email atau Username</label>
              <input
                value={memberForm.identifier}
                onChange={(event) => setMemberForm({ ...memberForm, identifier: event.target.value })}
                placeholder="contoh: anggota@email.com atau username"
                autoCapitalize="none"
              />
            </div>
            <div className="field">
              <label>Role</label>
              <select value={memberForm.role} onChange={(event) => setMemberForm({ ...memberForm, role: event.target.value })}>
                <option value="member">Member</option>
                {isOwner && <option value="admin">Admin</option>}
              </select>
            </div>
            <button className="secondary-btn" type="submit" disabled={addingMember}>
              <UserPlus size={16} /> {addingMember ? 'Menambahkan...' : 'Tambah Anggota'}
            </button>
          </form>
        </Card>
      )}

      <Card className="family-members-card role-management-card">
        <div className="row-between">
          <div><p className="section-kicker">Daftar Anggota</p><h2>{familyMembers.length} Anggota</h2></div>
          <span className={`role-pill ${currentMember?.role || 'member'}`}>{roleLabel[currentMember?.role] || 'Member'}</span>
        </div>

        {!canManageMembers && <p className="muted tiny role-management-help">Hanya owner atau admin keluarga yang bisa menambahkan anggota, mengubah role, dan menghapus anggota.</p>}

        <div className="drawer-list role-member-list">
          {familyMembers.map((member) => {
            const isSelf = member.userId === user?.id;
            const isLockedOwner = member.role === 'owner';
            const canChangeRole = isOwner && !isSelf && !isLockedOwner;
            const canRemoveMember = canManageMembers && !isSelf && !isLockedOwner && (isOwner || member.role === 'member');
            const isProcessing = processingMemberId === member.id;
            return (
              <div className={`member-row role-member-row ${isLockedOwner ? 'locked-owner' : ''}`} key={member.id}>
                <MemberAvatar member={member} />
                <div className="item-main">
                  <p className="item-title">{member.profile?.name || 'Anggota keluarga'}</p>
                  <p className="item-sub">{member.profile?.email || 'Email tidak tersedia'}</p>
                  {member.profile?.username && <p className="item-sub">@{member.profile.username}</p>}
                </div>

                <div className="role-member-actions">
                  <span className={`role-pill ${member.role}`}>{roleLabel[member.role] || member.role}</span>

                  {canChangeRole && (
                    <select
                      className="role-select"
                      value={roleDrafts[member.id] || member.role}
                      onChange={(event) => setRoleDrafts((drafts) => ({ ...drafts, [member.id]: event.target.value }))}
                      disabled={isProcessing}
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                  )}

                  {(canChangeRole || canRemoveMember) && (
                    <div className="role-action-row">
                      {canChangeRole && (
                        <button className="action-btn edit" type="button" onClick={() => saveMemberRole(member)} disabled={isProcessing}>
                          <Save size={12} /> Simpan
                        </button>
                      )}
                      {canRemoveMember && (
                        <button className="action-btn danger" type="button" onClick={() => removeMember(member)} disabled={isProcessing}>
                          <Trash2 size={12} /> Hapus
                        </button>
                      )}
                    </div>
                  )}

                  {canManageMembers && isSelf && <p className="muted tiny role-note">Akun Anda</p>}
                  {canManageMembers && isLockedOwner && !isSelf && <p className="muted tiny role-note">Owner utama</p>}
                  {isAdmin && member.role === 'admin' && !isSelf && <p className="muted tiny role-note">Admin lain</p>}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </>
  );

  const renderAccessPanel = () => (
    <>
      {renderPanelHeader('Hak Akses Role', 'Role Management')}
      <Card className="role-access-card">
        <div className="row-between">
          <div>
            <p className="section-kicker">Hak Akses</p>
            <h2>Owner, Admin, dan Member</h2>
          </div>
          <span className={`role-pill ${currentMember?.role || 'member'}`}>{roleLabel[currentMember?.role] || 'Member'}</span>
        </div>
        <p className="muted tiny role-management-help">Hak akses dibuat tetap agar penggunaan aplikasi keluarga tetap sederhana. Owner mengatur role anggota pada menu Anggota Keluarga.</p>

        <div className="role-access-table" role="table" aria-label="Hak akses role">
          <div className="role-access-row role-access-head" role="row">
            <span>Fitur</span>
            <b>Owner</b>
            <b>Admin</b>
            <b>Member</b>
          </div>
          {roleAccessRows.map((item) => (
            <div className="role-access-row" role="row" key={item.label}>
              <span>{item.label}</span>
              <b className={item.owner === 'Tidak' ? 'no' : 'yes'}>{item.owner}</b>
              <b className={item.admin === 'Tidak' ? 'no' : 'yes'}>{item.admin}</b>
              <b className={item.member === 'Tidak' ? 'no' : 'yes'}>{item.member}</b>
            </div>
          ))}
        </div>
      </Card>
    </>
  );

  const renderWalletPanel = () => (
    <>
      {renderPanelHeader('Dompet Keluarga', 'Keuangan')}
      <Card>
        <div className="row-between"><div><p className="section-kicker">Akun & Dompet</p><h2>Kelola Dompet</h2></div>{!canManageWallets && <span className="role-pill member">Read only</span>}</div>
        <div className="drawer-list" style={{ marginTop: 12 }}>
          {accountBalances.map((account) => (
            <div className="wallet-row wallet-management-row" key={account.id}>
              <div className="avatar"><Wallet size={18} /></div>
              <div className="item-main"><p className="item-title">{account.name}</p><p className="item-sub">{accountTypeLabel[account.type] || account.type} • {account.isActive ? 'Aktif' : 'Nonaktif'}</p></div>
              <div className="wallet-actions"><p className="amount">{formatRupiah(account.currentBalance)}</p>{canManageWallets && <div className="inline-actions"><button className="action-btn edit" type="button" onClick={() => startEditAccount(account)}><Pencil size={12} /> Edit</button><button className="link-btn tiny" type="button" onClick={() => toggleAccount(account.id)}>{account.isActive ? 'Nonaktifkan' : 'Aktifkan'}</button></div>}</div>
            </div>
          ))}
        </div>
        {canManageWallets ? <form className="form-grid" onSubmit={submitAccount} style={{ marginTop: 16 }}>
          <div className="row-between"><p className="section-kicker">{editingAccountId ? 'Edit Dompet' : 'Tambah Dompet'}</p>{editingAccountId && <button className="small-btn" type="button" onClick={cancelEditAccount}><X size={13} /> Batal</button>}</div>
          <div className="field"><label>Nama akun/dompet</label><input value={accountForm.name} onChange={(event) => setAccountForm({ ...accountForm, name: event.target.value })} placeholder="Contoh: Bank Mandiri" /></div>
          <div className="grid-2"><div className="field"><label>Jenis</label><select value={accountForm.type} onChange={(event) => setAccountForm({ ...accountForm, type: event.target.value })}>{Object.entries(accountTypeLabel).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></div><div className="field"><label>Saldo awal</label><input type="number" value={accountForm.initialBalance} onChange={(event) => setAccountForm({ ...accountForm, initialBalance: event.target.value })} /></div></div>
          <button className="secondary-btn">{editingAccountId ? 'Simpan Perubahan Dompet' : 'Tambah Akun/Dompet'}</button>
        </form> : <p className="muted tiny owner-only-note">Hanya owner atau admin keluarga yang bisa menambah, mengedit, atau menonaktifkan dompet.</p>}
      </Card>
    </>
  );

  const renderCategoryPanel = () => (
    <>
      {renderPanelHeader('Kategori Pemasukan', 'Keuangan')}
      <Card className="category-management-card">
        <div className="row-between"><div><p className="section-kicker">Kategori Transaksi</p><h2>Pemasukan</h2></div>{!canManageCategories && <span className="role-pill member">Read only</span>}</div>
        <p className="muted tiny" style={{ lineHeight: 1.6 }}>Kategori pengeluaran sudah digantikan oleh Alokasi Anggaran. Kategori di menu ini khusus untuk transaksi pemasukan.</p>
        {canManageCategories && <form className="form-grid" onSubmit={submitCategory} style={{ marginTop: 14 }}><div className="field"><label>Nama kategori pemasukan</label><input value={categoryForm.name} onChange={(event) => setCategoryForm({ ...categoryForm, name: event.target.value, type: 'income' })} placeholder="Contoh: Gaji, Bonus, Usaha" /></div><button className="secondary-btn">Tambah Kategori Pemasukan</button></form>}
        <div className="category-section"><p className="mini-label">Kategori custom keluarga</p><div className="category-chip-grid">{familyIncomeCategories.length ? familyIncomeCategories.map((category) => <span className="category-chip income" key={category.id}>{category.name}<em>Pemasukan</em>{canManageCategories && <button type="button" onClick={() => deleteCategory(category.id)} aria-label="Hapus kategori"><Trash2 size={12} /></button>}</span>) : <p className="muted tiny">Belum ada kategori pemasukan custom.</p>}</div></div>
        <div className="category-section"><p className="mini-label">Kategori bawaan</p><div className="category-chip-grid compact">{defaultIncomeCategories.map((category) => <span className="category-chip readonly income" key={category.id}>{category.name}</span>)}</div></div>
      </Card>
    </>
  );

  const renderGoalsPanel = () => (
    <>
      {renderPanelHeader('Target Tabungan', 'Keuangan')}
      <Card>
        <div className="row-between"><p className="section-kicker">Target Tabungan</p>{!canManageSavingGoals && <span className="role-pill member">Read only</span>}</div>
        <div className="drawer-list" style={{ marginTop: 12 }}>{savingGoals.map((goal) => { const pct = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100)); return <div className="wallet-row" key={goal.id} style={{ alignItems: 'stretch', flexDirection: 'column' }}><div className="row-between"><div><p className="item-title">{goal.name}</p><p className="item-sub">{formatRupiah(goal.currentAmount)} dari {formatRupiah(goal.targetAmount)}</p></div><strong>{pct}%</strong></div><ProgressBar value={pct} variant="green" /></div>; })}</div>
        {canManageSavingGoals ? (
          <>
            <form className="form-grid" onSubmit={submitDeposit} style={{ marginTop: 16 }}><div className="grid-2"><div className="field"><label>Target</label><select value={deposit.id} onChange={(event) => setDeposit({ ...deposit, id: event.target.value })}><option value="">Pilih</option>{savingGoals.map((goal) => <option value={goal.id} key={goal.id}>{goal.name}</option>)}</select></div><div className="field"><label>Setoran</label><input type="number" value={deposit.amount} onChange={(event) => setDeposit({ ...deposit, amount: event.target.value })} /></div></div><button className="secondary-btn">Tambah Setoran</button></form>
            <form className="form-grid" onSubmit={submitGoal} style={{ marginTop: 18 }}><div className="field"><label>Nama target baru</label><input value={goalForm.name} onChange={(event) => setGoalForm({ ...goalForm, name: event.target.value })} placeholder="Contoh: Dana darurat" /></div><div className="grid-2"><div className="field"><label>Nominal target</label><input type="number" value={goalForm.targetAmount} onChange={(event) => setGoalForm({ ...goalForm, targetAmount: event.target.value })} /></div><div className="field"><label>Terkumpul</label><input type="number" value={goalForm.currentAmount} onChange={(event) => setGoalForm({ ...goalForm, currentAmount: event.target.value })} /></div></div><button className="secondary-btn">Buat Target Tabungan</button></form>
          </>
        ) : <p className="muted tiny owner-only-note">Hanya owner atau admin yang bisa membuat target dan menambah setoran tabungan.</p>}
      </Card>
    </>
  );

  const panelMap = {
    menu: renderMenu,
    profile: renderProfilePanel,
    password: renderPasswordPanel,
    family: renderFamilyPanel,
    access: renderAccessPanel,
    wallets: renderWalletPanel,
    categories: renderCategoryPanel,
    goals: renderGoalsPanel,
  };

  return (
    <div className="page settings-preview-page settings-menu-page">
      {(panelMap[activePanel] || renderMenu)()}
    </div>
  );
}
