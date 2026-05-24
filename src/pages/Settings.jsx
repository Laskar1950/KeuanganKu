import React, { useState } from 'react';
import { Copy, LogOut, UserRound, Wallet } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import { Card, ProgressBar } from '../components/UI.jsx';
import { formatRupiah } from '../utils/format.js';

const roleLabel = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
};

export default function Settings() {
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
  } = useApp();

  const [accountForm, setAccountForm] = useState({
    name: '',
    type: 'cash',
    initialBalance: '',
  });

  const [goalForm, setGoalForm] = useState({
    name: '',
    targetAmount: '',
    currentAmount: '',
    targetDate: '',
    note: '',
  });

  const [deposit, setDeposit] = useState({
    id: '',
    amount: '',
  });

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
      setGoalForm({
        name: '',
        targetAmount: '',
        currentAmount: '',
        targetDate: '',
        note: '',
      });
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

  return (
    <div className="page">
      <header className="header">
        <div>
          <p className="eyebrow">Kelola data</p>
          <h1>Pengaturan</h1>
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
        >
          <LogOut size={18} />
        </button>
      </header>

      <Card>
        <p className="section-kicker">Profil</p>
        <h2>{user?.name}</h2>
        <p className="muted tiny">
          {user?.email} • {household?.name} • {roleLabel[currentMember?.role] || 'Member'}
        </p>
      </Card>

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
              <div className="avatar">
                <UserRound size={18} />
              </div>

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
              <div className="avatar">
                <Wallet size={18} />
              </div>

              <div className="item-main">
                <p className="item-title">{account.name}</p>
                <p className="item-sub">
                  {account.type} • {account.isActive ? 'Aktif' : 'Nonaktif'}
                </p>
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
              onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })}
              placeholder="Contoh: Bank Mandiri"
            />
          </div>

          <div className="grid-2">
            <div className="field">
              <label>Jenis</label>

              <select
                value={accountForm.type}
                onChange={(e) => setAccountForm({ ...accountForm, type: e.target.value })}
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
                onChange={(e) => setAccountForm({ ...accountForm, initialBalance: e.target.value })}
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
                    <p className="item-sub">
                      {formatRupiah(goal.currentAmount)} dari {formatRupiah(goal.targetAmount)}
                    </p>
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

              <select
                value={deposit.id}
                onChange={(e) => setDeposit({ ...deposit, id: e.target.value })}
              >
                <option value="">Pilih</option>
                {savingGoals.map((goal) => (
                  <option value={goal.id} key={goal.id}>
                    {goal.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Setoran</label>
              <input
                type="number"
                value={deposit.amount}
                onChange={(e) => setDeposit({ ...deposit, amount: e.target.value })}
              />
            </div>
          </div>

          <button className="secondary-btn">Tambah Setoran</button>
        </form>

        <form className="form-grid" onSubmit={submitGoal} style={{ marginTop: 18 }}>
          <div className="field">
            <label>Nama target baru</label>
            <input
              value={goalForm.name}
              onChange={(e) => setGoalForm({ ...goalForm, name: e.target.value })}
              placeholder="Contoh: Dana darurat"
            />
          </div>

          <div className="grid-2">
            <div className="field">
              <label>Nominal target</label>
              <input
                type="number"
                value={goalForm.targetAmount}
                onChange={(e) => setGoalForm({ ...goalForm, targetAmount: e.target.value })}
              />
            </div>

            <div className="field">
              <label>Terkumpul</label>
              <input
                type="number"
                value={goalForm.currentAmount}
                onChange={(e) => setGoalForm({ ...goalForm, currentAmount: e.target.value })}
              />
            </div>
          </div>

          <button className="secondary-btn">Buat Target Tabungan</button>
        </form>
      </Card>
    </div>
  );
}
