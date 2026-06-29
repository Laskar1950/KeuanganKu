export const ROLE_LABELS = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
};

export const ROLE_DESCRIPTIONS = {
  owner: 'Pemilik keluarga dengan akses penuh.',
  admin: 'Pengelola keluarga yang bisa membantu mengatur data keuangan.',
  member: 'Anggota keluarga yang dapat mencatat transaksi dan melihat laporan.',
};

export const ROLE_ACCESS_MATRIX = [
  { key: 'addTransaction', label: 'Tambah transaksi', owner: true, admin: true, member: true },
  { key: 'editOwnTransaction', label: 'Edit transaksi sendiri', owner: true, admin: true, member: true },
  { key: 'manageAllTransactions', label: 'Edit transaksi semua anggota', owner: true, admin: true, member: false },
  { key: 'deleteTransactions', label: 'Hapus transaksi', owner: true, admin: true, member: false },
  { key: 'manageWallets', label: 'Kelola dompet', owner: true, admin: true, member: false },
  { key: 'manageBudgets', label: 'Kelola alokasi', owner: true, admin: true, member: false },
  { key: 'manageCategories', label: 'Kelola kategori', owner: true, admin: true, member: false },
  { key: 'manageSavingGoals', label: 'Kelola target tabungan', owner: true, admin: true, member: false },
  { key: 'addMembers', label: 'Tambah anggota', owner: true, admin: 'Member saja', member: false },
  { key: 'changeMemberRoles', label: 'Ubah role anggota', owner: true, admin: false, member: false },
  { key: 'removeMembers', label: 'Hapus anggota', owner: true, admin: 'Member saja', member: false },
  { key: 'viewReports', label: 'Lihat laporan', owner: true, admin: true, member: true },
  { key: 'manageFamilySettings', label: 'Ubah data keluarga', owner: true, admin: false, member: false },
];

export function getRole(memberOrRole) {
  if (typeof memberOrRole === 'string') return memberOrRole;
  return memberOrRole?.role || 'member';
}

export function isOwnerRole(memberOrRole) {
  return getRole(memberOrRole) === 'owner';
}

export function isAdminRole(memberOrRole) {
  return getRole(memberOrRole) === 'admin';
}

export function isManagerRole(memberOrRole) {
  return ['owner', 'admin'].includes(getRole(memberOrRole));
}

export function getPermissions(memberOrRole) {
  const role = getRole(memberOrRole);
  const isOwner = role === 'owner';
  const isAdmin = role === 'admin';
  const isManager = isOwner || isAdmin;

  return {
    role,
    isOwner,
    isAdmin,
    isMember: role === 'member',
    isManager,
    canAddTransaction: true,
    canEditOwnTransaction: true,
    canManageAllTransactions: isManager,
    canDeleteTransactions: isManager,
    canManageWallets: isManager,
    canManageBudgets: isManager,
    canManageCategories: isManager,
    canManageSavingGoals: isManager,
    canManageMembers: isManager,
    canAddAdmin: isOwner,
    canChangeMemberRoles: isOwner,
    canRemoveAdmins: isOwner,
    canRemoveMembers: isManager,
    canViewReports: true,
    canManageFamilySettings: isOwner,
  };
}

export function canAccess(memberOrRole, permissionKey) {
  return Boolean(getPermissions(memberOrRole)[permissionKey]);
}
