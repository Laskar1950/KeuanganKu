import { useEffect, useRef, useState, type ChangeEvent, type ComponentType, type FormEvent, type ReactNode } from "react";
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Copy,
  KeyRound,
  LogOut,
  Moon,
  Palette,
  Pencil,
  PiggyBank,
  Save,
  ShieldCheck,
  Sun,
  Tags,
  Trash2,
  Upload,
  UserPlus,
  UserRound,
  UsersRound,
  Wallet,
  X,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { supabase } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";
import { formatRupiah, sanitizeNumericInput } from "@/utils/format";
import { getThemePreference, setThemePreference, subscribeTheme } from "@/theme";
import type { Account, Category, FamilyMember, SavingGoal } from "@/types";

const roleLabel: Record<string, string> = { owner: "Owner", admin: "Admin", member: "Member" };
const accountTypeLabel: Record<string, string> = {
  cash: "Cash",
  bank: "Bank",
  ewallet: "E-Wallet",
  saving: "Tabungan",
  other: "Lainnya",
};
const emptyAccountForm = { name: "", type: "cash", initialBalance: "" as string | number };
const emptyMemberForm = { identifier: "", role: "member" };

const roleAccessRows = [
  { label: "Tambah transaksi", owner: "Ya", admin: "Ya", member: "Ya" },
  { label: "Edit transaksi sendiri", owner: "Ya", admin: "Ya", member: "Ya" },
  { label: "Edit transaksi semua anggota", owner: "Ya", admin: "Ya", member: "Tidak" },
  { label: "Hapus transaksi", owner: "Ya", admin: "Ya", member: "Tidak" },
  { label: "Kelola dompet", owner: "Ya", admin: "Ya", member: "Tidak" },
  { label: "Kelola alokasi", owner: "Ya", admin: "Ya", member: "Tidak" },
  { label: "Kelola kategori", owner: "Ya", admin: "Ya", member: "Tidak" },
  { label: "Kelola target tabungan", owner: "Ya", admin: "Ya", member: "Tidak" },
  { label: "Tambah anggota", owner: "Admin/Member", admin: "Member saja", member: "Tidak" },
  { label: "Ubah role anggota", owner: "Ya", admin: "Tidak", member: "Tidak" },
  { label: "Hapus anggota", owner: "Admin/Member", admin: "Member saja", member: "Tidak" },
  { label: "Lihat laporan", owner: "Ya", admin: "Ya", member: "Ya" },
  { label: "Ubah data keluarga", owner: "Ya", admin: "Tidak", member: "Tidak" },
];

const fieldClassName =
  "h-12 w-full rounded-2xl border border-field-border bg-field-bg px-4 text-sm font-semibold text-ink outline-none placeholder:font-medium focus:border-rose-strong focus:ring-4 focus:ring-rose-bg";

const labelClassName = "text-xs font-extrabold tracking-wide text-muted-foreground";

const cardClassName = "rounded-[28px] border border-line-strong bg-panel-strong/90 p-4 shadow-soft backdrop-blur-xl";

const primaryButtonClassName =
  "inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-white/40 text-sm font-black text-on-accent shadow-accent transition hover:opacity-95 [background-image:var(--gradient-brand)]";

const secondaryButtonClassName =
  "inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-line bg-panel-strong text-sm font-black text-rose-dark shadow-soft transition hover:bg-rose-bg";

function initials(name = "Pengguna") {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "P"
  );
}

function normalizeUsername(value = "") {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9_]+/g, "_")
      .replace(/^_+|_+$/g, "") || "user"
  );
}

function ProfileAvatar({ user, size = "large" }: { user?: { name?: string; avatarUrl?: string } | null; size?: "large" | "small" }) {
  const [error, setError] = useState(false);
  const showImg = user?.avatarUrl && !error;

  return (
    <div
      className={cn(
        "grid shrink-0 place-items-center overflow-hidden rounded-[22px] border border-line bg-panel-strong font-black text-rose-dark",
        size === "large" ? "size-16 text-xl" : "size-11 text-base"
      )}
    >
      {showImg ? (
        <img
          src={user.avatarUrl}
          alt={user?.name || "Foto profil"}
          onError={() => setError(true)}
          className="size-full object-cover"
        />
      ) : (
        <span>{initials(user?.name)}</span>
      )}
    </div>
  );
}

function MemberAvatar({ member }: { member: FamilyMember }) {
  const [error, setError] = useState(false);
  const showImg = member.profile?.avatarUrl && !error;

  if (showImg) {
    return (
      <div className="size-11 shrink-0 overflow-hidden rounded-[17px] border border-line bg-panel-strong">
        <img
          src={member.profile?.avatarUrl}
          alt={member.profile?.name || "Anggota"}
          onError={() => setError(true)}
          className="size-full object-cover"
        />
      </div>
    );
  }
  return (
    <div className="grid size-11 shrink-0 place-items-center rounded-[17px] border border-line bg-panel-strong text-base font-black text-rose-dark">
      <span>{initials(member.profile?.name || "Anggota")}</span>
    </div>
  );
}

function RolePill({ role }: { role?: string }) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-full border border-line px-2.5 py-1.5 text-[10px] font-black",
        role === "owner" ? "bg-violet-bg text-violet" : role === "admin" ? "bg-blue-bg text-blue" : "bg-soft text-muted-foreground"
      )}
    >
      {roleLabel[role || "member"] || "Member"}
    </span>
  );
}

interface SettingsMenuButtonProps {
  icon: ComponentType<{ size?: number }>;
  title: string;
  description: string;
  badge?: string;
  onClick: () => void;
}

function SettingsMenuButton({ icon: Icon, title, description, badge, onClick }: SettingsMenuButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-3 rounded-[22px] border border-line bg-panel p-3 text-left shadow-soft transition hover:-translate-y-0.5 hover:border-line-strong"
    >
      <span className="grid size-11 place-items-center rounded-[17px] border border-line bg-rose-bg text-rose-dark">
        <Icon size={18} />
      </span>
      <span className="grid min-w-0 gap-0.5">
        <strong className="truncate text-[13.5px] font-black text-ink">{title}</strong>
        <small className="truncate text-[11px] font-semibold text-muted-foreground">{description}</small>
      </span>
      {badge ? (
        <em className="rounded-full bg-soft px-2.5 py-1 text-[10px] font-black text-muted-foreground not-italic">{badge}</em>
      ) : null}
      <ChevronRight size={17} className="text-muted-foreground" />
    </button>
  );
}

interface SettingsProps {
  view?: string;
}

export default function Settings({ view = "menu" }: SettingsProps) {
  const {
    user,
    household,
    familyMembers,
    currentMember,
    accountBalances,
    transactions,
    categories,
    savingGoals,
    addAccount,
    updateAccount,
    toggleAccount,
    deleteAccount,
    addCategory,
    deleteCategory,
    addSavingGoal,
    depositSavingGoal,
    copyInviteCode,
    logout,
    notify,
    refreshData,
  } = useApp();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [activePanel, setActivePanel] = useState(view);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: "", avatarUrl: "" });
  const [passwordForm, setPasswordForm] = useState({ password: "", confirmPassword: "" });
  const [accountForm, setAccountForm] = useState(emptyAccountForm);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const editingAccountHasTransactions = Boolean(
    editingAccountId && transactions.some((trx) => trx.accountId === editingAccountId)
  );
  const [categoryForm, setCategoryForm] = useState({ name: "", type: "income" });
  const [goalForm, setGoalForm] = useState({ name: "", targetAmount: "", currentAmount: "", targetDate: "", note: "" });
  const [deposit, setDeposit] = useState({ id: "", amount: "" });

  const [memberForm, setMemberForm] = useState(emptyMemberForm);
  const [roleDrafts, setRoleDrafts] = useState<Record<string, string>>({});
  const [addingMember, setAddingMember] = useState(false);
  const [processingMemberId, setProcessingMemberId] = useState("");

  const isOwner = currentMember?.role === "owner";
  const isAdmin = currentMember?.role === "admin";
  const canManageMembers = isOwner || isAdmin;
  const canManageWallets = isOwner || isAdmin;
  const canManageCategories = isOwner || isAdmin;
  const canManageSavingGoals = isOwner || isAdmin;
  const incomeCategories = (categories as Category[]).filter((category) => category.type === "income");
  const familyIncomeCategories = incomeCategories.filter((category) => category.familyId);
  const defaultIncomeCategories = incomeCategories.filter((category) => !category.familyId);

  useEffect(() => {
    setProfileForm({ name: user?.name || "", avatarUrl: user?.avatarUrl || "" });
  }, [user?.name, user?.avatarUrl]);

  const [themePreference, setThemePreferenceState] = useState(() => getThemePreference());

  useEffect(() => subscribeTheme(({ preference }: { preference: string }) => setThemePreferenceState(preference)), []);

  const handleThemeChange = (preference: "light" | "dark" | "system") => {
    setThemePreference(preference);
    setThemePreferenceState(preference);
  };

  useEffect(() => {
    setActivePanel(view);
  }, [view]);

  useEffect(() => {
    const drafts: Record<string, string> = {};
    (familyMembers as FamilyMember[]).forEach((member) => {
      drafts[member.id] = member.role === "owner" ? "member" : member.role || "member";
    });
    setRoleDrafts(drafts);
  }, [familyMembers]);

  const goMenu = () => setActivePanel("menu");

  const saveProfileData = async ({ name, avatarUrl }: { name: string; avatarUrl?: string | null }) => {
    const username = user?.username || normalizeUsername(user?.email?.split("@")[0] || name);
    const payload = {
      id: user.id,
      name: name.trim(),
      email: user.email,
      username,
      avatar_url: avatarUrl?.trim() || null,
    };
    const { error: profileError } = await supabase.from("profiles").upsert(payload);
    if (profileError) throw profileError;
    const { error: authError } = await supabase.auth.updateUser({
      data: { name: payload.name, username: payload.username, avatar_url: payload.avatar_url },
    });
    if (authError) throw authError;
  };

  const submitProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      if (!profileForm.name.trim()) throw new Error("Nama profil wajib diisi.");
      await saveProfileData({ name: profileForm.name, avatarUrl: profileForm.avatarUrl });
      notify("Profil berhasil diperbarui.");
      await refreshData();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Gagal memperbarui profil.");
    }
  };

  const submitPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      if (!passwordForm.password || !passwordForm.confirmPassword) throw new Error("Password baru dan konfirmasi password wajib diisi.");
      if (passwordForm.password.length < 6) throw new Error("Password minimal 6 karakter.");
      if (passwordForm.password !== passwordForm.confirmPassword) throw new Error("Konfirmasi password tidak sama.");
      const { error } = await supabase.auth.updateUser({ password: passwordForm.password });
      if (error) throw error;
      setPasswordForm({ password: "", confirmPassword: "" });
      notify("Password berhasil diganti. Gunakan password baru saat login berikutnya.");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Gagal mengganti password.");
    }
  };

  const uploadAvatar = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      if (!user?.id) throw new Error("Sesi login tidak ditemukan. Silakan login ulang.");
      if (!file.type.startsWith("image/")) throw new Error("File harus berupa gambar.");
      if (file.size > 5 * 1024 * 1024) throw new Error("Ukuran foto maksimal 5MB.");
      setUploadingAvatar(true);
      const extension = file.name.split(".").pop() || "jpg";
      const filePath = `${user.id}/profile-${Date.now()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { cacheControl: "3600", upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
      const publicUrl = data.publicUrl;
      setProfileForm((prev) => ({ ...prev, avatarUrl: publicUrl }));
      await saveProfileData({ name: profileForm.name || user.name || "Pengguna", avatarUrl: publicUrl });
      notify("Foto profil berhasil diupload.");
      await refreshData();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Gagal mengupload foto.");
    } finally {
      setUploadingAvatar(false);
      if (event.target) event.target.value = "";
    }
  };

  const submitAccount = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      if (editingAccountId) {
        await updateAccount(editingAccountId, accountForm);
        setEditingAccountId(null);
      } else {
        await addAccount(accountForm);
      }
      setAccountForm(emptyAccountForm);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Gagal menyimpan dompet.");
    }
  };

  const startEditAccount = (account: Account) => {
    setEditingAccountId(account.id);
    setAccountForm({ name: account.name, type: account.type, initialBalance: String(account.initialBalance || 0) });
  };

  const cancelEditAccount = () => {
    setEditingAccountId(null);
    setAccountForm(emptyAccountForm);
  };

  const handleDeleteAccount = async (account: Account) => {
    try {
      if (!window.confirm(`Hapus dompet "${account.name}"? Dompet yang sudah dipakai transaksi atau alokasi tidak bisa dihapus.`)) return;
      await deleteAccount(account.id);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Gagal menghapus dompet.");
    }
  };

  const submitCategory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await addCategory({ name: categoryForm.name, type: "income" });
      setCategoryForm({ name: "", type: "income" });
    } catch (error) {
      notify(error instanceof Error ? error.message : "Gagal menambah kategori.");
    }
  };

  const submitGoal = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await addSavingGoal(goalForm);
      setGoalForm({ name: "", targetAmount: "", currentAmount: "", targetDate: "", note: "" });
    } catch (error) {
      notify(error instanceof Error ? error.message : "Gagal membuat target tabungan.");
    }
  };

  const submitDeposit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await depositSavingGoal(deposit.id, deposit.amount);
      setDeposit({ id: "", amount: "" });
    } catch (error) {
      notify(error instanceof Error ? error.message : "Gagal menambah setoran.");
    }
  };

  const submitAddMember = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      if (!canManageMembers) throw new Error("Hanya owner atau admin yang bisa menambahkan anggota.");
      if (isAdmin && memberForm.role !== "member") throw new Error("Admin hanya bisa menambahkan anggota sebagai member.");
      if (!memberForm.identifier.trim()) throw new Error("Email atau username anggota wajib diisi.");
      setAddingMember(true);
      const { error } = await supabase.rpc("add_family_member_by_identifier", {
        p_identifier: memberForm.identifier.trim(),
        p_role: isAdmin ? "member" : memberForm.role,
      });
      if (error) throw error;
      setMemberForm(emptyMemberForm);
      notify("Anggota berhasil ditambahkan ke keluarga.");
      await refreshData();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Gagal menambah anggota.");
    } finally {
      setAddingMember(false);
    }
  };

  const saveMemberRole = async (member: FamilyMember) => {
    try {
      if (!canManageMembers) throw new Error("Hanya owner atau admin yang bisa mengubah role anggota.");
      if (member.userId === user?.id) throw new Error("Anda tidak bisa mengubah role akun sendiri.");
      if (isAdmin && member.role !== "member") throw new Error("Admin tidak bisa mengubah role owner atau admin lain.");
      const nextRole = roleDrafts[member.id] || member.role;
      if (!nextRole || nextRole === "owner") throw new Error("Role tidak valid.");
      if (isAdmin && nextRole !== "member") throw new Error("Admin tidak bisa mengangkat anggota menjadi admin.");
      if (nextRole === member.role) {
        notify("Role anggota tidak berubah.");
        return;
      }
      setProcessingMemberId(member.id);
      const { error } = await supabase.rpc("update_family_member_role", {
        p_member_id: member.id,
        p_role: nextRole,
      });
      if (error) throw error;
      notify("Role anggota berhasil diperbarui.");
      await refreshData();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Gagal mengubah role.");
    } finally {
      setProcessingMemberId("");
    }
  };

  const removeMember = async (member: FamilyMember) => {
    try {
      if (!canManageMembers) throw new Error("Hanya owner atau admin yang bisa menghapus anggota.");
      if (member.userId === user?.id) throw new Error("Anda tidak bisa menghapus akun sendiri.");
      if (isAdmin && member.role !== "member") throw new Error("Admin tidak bisa menghapus owner atau admin lain.");
      const memberName = member.profile?.name || member.profile?.email || "anggota ini";
      if (!window.confirm(`Hapus ${memberName} dari keluarga?`)) return;
      setProcessingMemberId(member.id);
      const { error } = await supabase.rpc("remove_family_member", { p_member_id: member.id });
      if (error) throw error;
      notify("Anggota berhasil dihapus dari keluarga.");
      await refreshData();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Gagal menghapus anggota.");
    } finally {
      setProcessingMemberId("");
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Gagal logout.");
    }
  };

  const renderPanelHeader = (title: string, kicker = "Pengaturan") => (
    <header className="flex items-center gap-3 px-0.5">
      <button
        type="button"
        onClick={goMenu}
        aria-label="Kembali ke menu"
        className="grid size-11 shrink-0 place-items-center rounded-[18px] border border-line bg-panel text-rose-dark shadow-soft transition hover:bg-rose-bg"
      >
        <ChevronLeft size={18} />
      </button>
      <div>
        <p className="text-xs font-extrabold text-muted-foreground">{kicker}</p>
        <h1 className="font-display text-[clamp(20px,6vw,26px)] leading-tight tracking-tight text-ink">{title}</h1>
      </div>
    </header>
  );

  const renderMenu = () => (
    <>
      <header className="flex items-center justify-between gap-3 px-0.5">
        <div>
          <p className="text-xs font-extrabold text-muted-foreground">Pengaturan</p>
          <h1 className="font-display text-[clamp(22px,6.4vw,28px)] leading-tight tracking-tight text-ink">Profil & Keluarga</h1>
        </div>
        <button
          type="button"
          aria-label="Logout"
          onClick={handleLogout}
          className="grid size-11 shrink-0 place-items-center rounded-[18px] border border-line bg-panel text-rose-dark shadow-soft transition hover:bg-rose-bg"
        >
          <LogOut size={18} />
        </button>
      </header>

      <section className={cardClassName}>
        <div className="flex items-center gap-4">
          <ProfileAvatar user={{ ...user, avatarUrl: profileForm.avatarUrl }} />
          <div className="min-w-0">
            <p className="text-[10px] font-black tracking-[0.13em] text-muted-foreground uppercase">Akun aktif</p>
            <h2 className="truncate font-display text-lg tracking-tight text-ink">{user?.name || "Pengguna"}</h2>
            <p className="truncate text-[11px] font-semibold text-muted-foreground">{user?.email}</p>
            {user?.username && <p className="truncate text-[11px] font-semibold text-muted-foreground">@{user.username}</p>}
            <span className="mt-1.5 inline-flex">
              <RolePill role={currentMember?.role} />
            </span>
          </div>
        </div>
      </section>

      <section className="grid gap-2.5">
        <p className="text-[10px] font-black tracking-[0.13em] text-muted-foreground uppercase">Profil Saya</p>
        <div className="grid gap-2.5">
          <SettingsMenuButton icon={UserRound} title="Profil Akun" description="Ubah nama dan foto profil." onClick={() => setActivePanel("profile")} />
          <SettingsMenuButton icon={KeyRound} title="Ganti Password" description="Perbarui password login akun." onClick={() => setActivePanel("password")} />
        </div>
      </section>

      <section className="grid gap-2.5">
        <p className="text-[10px] font-black tracking-[0.13em] text-muted-foreground uppercase">Tampilan</p>
        <section className={cardClassName}>
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-[17px] border border-line bg-rose-bg text-rose-dark">
              <Palette size={18} />
            </span>
            <div className="min-w-0">
              <strong className="block text-[13.5px] font-black text-ink">Tema Aplikasi</strong>
              <small className="text-[11px] font-semibold text-muted-foreground">Pilih terang, gelap, atau ikuti sistem.</small>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {(
              [
                { id: "system", label: "Otomatis", icon: Palette },
                { id: "light", label: "Terang", icon: Sun },
                { id: "dark", label: "Gelap", icon: Moon },
              ] as const
            ).map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleThemeChange(option.id)}
                  className={cn(
                    "grid justify-items-center gap-1.5 rounded-2xl border px-3 py-3 text-[11px] font-black transition",
                    themePreference === option.id
                      ? "border-transparent text-on-accent shadow-accent [background-image:var(--gradient-brand)]"
                      : "border-field-border bg-field-bg text-muted-foreground hover:text-ink"
                  )}
                >
                  <Icon size={17} />
                  <small>{option.label}</small>
                </button>
              );
            })}
          </div>
        </section>
      </section>

      <section className="grid gap-2.5">
        <p className="text-[10px] font-black tracking-[0.13em] text-muted-foreground uppercase">Keluarga</p>
        <div className="grid gap-2.5">
          <SettingsMenuButton
            icon={UsersRound}
            title="Anggota Keluarga"
            description="Kelola anggota, tambah anggota, dan ubah role."
            badge={`${familyMembers.length} orang`}
            onClick={() => setActivePanel("family")}
          />
          <SettingsMenuButton
            icon={ShieldCheck}
            title="Hak Akses Role"
            description="Lihat batas akses Owner, Admin, dan Member."
            onClick={() => setActivePanel("access")}
          />
          <SettingsMenuButton
            icon={Wallet}
            title="Dompet Keluarga"
            description="Kelola dompet dan saldo awal."
            badge={`${accountBalances.length} dompet`}
            onClick={() => setActivePanel("wallets")}
          />
        </div>
      </section>

      <section className="grid gap-2.5">
        <p className="text-[10px] font-black tracking-[0.13em] text-muted-foreground uppercase">Keuangan</p>
        <div className="grid gap-2.5">
          <SettingsMenuButton
            icon={Tags}
            title="Kategori Pemasukan"
            description="Kategori untuk transaksi pemasukan."
            badge={`${incomeCategories.length} kategori`}
            onClick={() => setActivePanel("categories")}
          />
          <SettingsMenuButton
            icon={PiggyBank}
            title="Target Tabungan"
            description="Kelola target dan setoran tabungan."
            badge={`${savingGoals.length} target`}
            onClick={() => setActivePanel("goals")}
          />
        </div>
      </section>
    </>
  );

  const renderProfilePanel = () => (
    <>
      {renderPanelHeader("Profil Akun", "Profil Saya")}
      <section className={cardClassName}>
        <div className="flex items-center gap-4">
          <div className="relative">
            <ProfileAvatar user={{ ...user, avatarUrl: profileForm.avatarUrl }} />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              aria-label="Upload foto profil"
              className="absolute -right-1.5 -bottom-1.5 grid size-8 place-items-center rounded-full border border-white/40 text-white shadow-accent transition [background-image:var(--gradient-brand)]"
            >
              {uploadingAvatar ? "..." : <Camera size={14} />}
            </button>
            <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={uploadAvatar} hidden />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black tracking-[0.13em] text-muted-foreground uppercase">Informasi Akun</p>
            <h2 className="truncate font-display text-lg tracking-tight text-ink">{user?.name || "Pengguna"}</h2>
            <p className="truncate text-[11px] font-semibold text-muted-foreground">{user?.email}</p>
            {user?.username && <p className="truncate text-[11px] font-semibold text-muted-foreground">@{user.username}</p>}
            <span className="mt-1.5 inline-flex">
              <RolePill role={currentMember?.role} />
            </span>
          </div>
        </div>

        <form className="mt-4 grid gap-3" onSubmit={submitProfile}>
          <div className="grid gap-2">
            <label className={labelClassName}>Nama profil</label>
            <input
              value={profileForm.name}
              onChange={(event) => setProfileForm({ ...profileForm, name: event.target.value })}
              placeholder="Nama Anda"
              className={fieldClassName}
            />
          </div>
          <div className="grid gap-2">
            <label className={labelClassName}>Email</label>
            <input value={user?.email || ""} disabled readOnly className={cn(fieldClassName, "opacity-60")} />
          </div>
          <div className="grid gap-2">
            <label className={labelClassName}>Username</label>
            <input value={user?.username ? `@${user.username}` : "-"} disabled readOnly className={cn(fieldClassName, "opacity-60")} />
          </div>
          <div className="grid gap-2">
            <label className={labelClassName}>Foto profil</label>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className={secondaryButtonClassName}
            >
              <Upload size={16} /> {uploadingAvatar ? "Mengupload..." : "Pilih Foto dari Perangkat"}
            </button>
          </div>
          <p className="text-xs font-semibold text-muted-foreground">Format yang didukung: JPG, PNG, WEBP, atau GIF. Maksimal 5MB.</p>
          <button type="submit" className={primaryButtonClassName}>
            <Save size={16} /> Simpan Profil
          </button>
        </form>
      </section>
    </>
  );

  const renderPasswordPanel = () => (
    <>
      {renderPanelHeader("Ganti Password", "Keamanan")}
      <section className={cardClassName}>
        <p className="text-[10px] font-black tracking-[0.13em] text-muted-foreground uppercase">Keamanan Akun</p>
        <h2 className="font-display text-lg tracking-tight text-ink">Password Login</h2>
        <p className="mt-1 text-xs font-semibold text-muted-foreground">Gunakan password minimal 6 karakter agar akun tetap aman.</p>
        <form className="mt-4 grid gap-3" onSubmit={submitPassword}>
          <div className="grid gap-2">
            <label className={labelClassName}>Password baru</label>
            <input
              type="password"
              value={passwordForm.password}
              onChange={(event) => setPasswordForm({ ...passwordForm, password: event.target.value })}
              placeholder="Masukkan password baru"
              autoComplete="new-password"
              className={fieldClassName}
            />
          </div>
          <div className="grid gap-2">
            <label className={labelClassName}>Konfirmasi password</label>
            <input
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(event) => setPasswordForm({ ...passwordForm, confirmPassword: event.target.value })}
              placeholder="Ulangi password baru"
              autoComplete="new-password"
              className={fieldClassName}
            />
          </div>
          <button type="submit" className={secondaryButtonClassName}>
            <KeyRound size={16} /> Ganti Password
          </button>
        </form>
      </section>
    </>
  );

  const renderFamilyPanel = () => (
    <>
      {renderPanelHeader("Anggota Keluarga", "Keluarga")}
      <section className={cardClassName}>
        <div className="flex items-center gap-3">
          <div className="flex">
            {(familyMembers as FamilyMember[]).slice(0, 4).map((member, index) => (
              <div
                key={member.id}
                style={{ zIndex: 10 - index }}
                className={cn(
                  "grid size-10 place-items-center overflow-hidden rounded-full border-2 border-panel-strong bg-soft text-xs font-black text-rose-dark",
                  index > 0 && "-ml-2.5"
                )}
              >
                {member.profile?.avatarUrl ? (
                  <img src={member.profile.avatarUrl} alt={member.profile.name || "Anggota"} className="size-full object-cover" />
                ) : (
                  <span>{initials(member.profile?.name)}</span>
                )}
              </div>
            ))}
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black tracking-[0.13em] text-muted-foreground uppercase">Keluarga</p>
            <h2 className="truncate font-display text-lg tracking-tight text-ink">{household?.name}</h2>
            <p className="text-[11px] font-semibold text-muted-foreground">{familyMembers.length} anggota tergabung</p>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3 rounded-[20px] border border-line bg-soft p-3">
          <div className="min-w-0">
            <p className="text-[10px] font-black tracking-[0.13em] text-muted-foreground uppercase">Kode undangan keluarga</p>
            <strong className="block truncate font-mono text-lg font-black tracking-[0.1em] text-blue">{household?.inviteCode || "-"}</strong>
          </div>
          <button
            type="button"
            onClick={copyInviteCode}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line bg-panel-strong px-3 py-2 text-[11px] font-black text-rose-dark transition hover:bg-rose-bg"
          >
            <Copy size={14} /> Salin
          </button>
        </div>
      </section>

      {canManageMembers && (
        <section className={cardClassName}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black tracking-[0.13em] text-muted-foreground uppercase">Role Management</p>
              <h2 className="font-display text-lg tracking-tight text-ink">Tambah Anggota</h2>
            </div>
            <RolePill role={currentMember?.role} />
          </div>
          <p className="mt-2 text-xs leading-relaxed font-semibold text-muted-foreground">
            Owner dapat menambahkan anggota sebagai admin atau member. Admin dapat menambahkan anggota sebagai member dan
            mengelola anggota yang bukan owner/admin.
          </p>
          <form className="mt-4 grid gap-3" onSubmit={submitAddMember}>
            <div className="grid gap-2">
              <label className={labelClassName}>Email atau Username</label>
              <input
                value={memberForm.identifier}
                onChange={(event) => setMemberForm({ ...memberForm, identifier: event.target.value })}
                placeholder="contoh: anggota@email.com atau username"
                autoCapitalize="none"
                className={fieldClassName}
              />
            </div>
            <div className="grid gap-2">
              <label className={labelClassName}>Role</label>
              <select
                value={memberForm.role}
                onChange={(event) => setMemberForm({ ...memberForm, role: event.target.value })}
                className={cn(fieldClassName, "appearance-none")}
              >
                <option value="member">Member</option>
                {isOwner && <option value="admin">Admin</option>}
              </select>
            </div>
            <button type="submit" disabled={addingMember} className={secondaryButtonClassName}>
              <UserPlus size={16} /> {addingMember ? "Menambahkan..." : "Tambah Anggota"}
            </button>
          </form>
        </section>
      )}

      <section className={cardClassName}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black tracking-[0.13em] text-muted-foreground uppercase">Daftar Anggota</p>
            <h2 className="font-display text-lg tracking-tight text-ink">{familyMembers.length} Anggota</h2>
          </div>
          <RolePill role={currentMember?.role} />
        </div>

        {!canManageMembers && (
          <p className="mt-2 text-xs font-semibold text-muted-foreground">
            Hanya owner atau admin keluarga yang bisa menambahkan anggota, mengubah role, dan menghapus anggota.
          </p>
        )}

        <div className="mt-3 grid gap-2.5">
          {(familyMembers as FamilyMember[]).map((member) => {
            const isSelf = member.userId === user?.id;
            const isLockedOwner = member.role === "owner";
            const canChangeRole = isOwner && !isSelf && !isLockedOwner;
            const canRemoveMember = Boolean(canManageMembers && !isSelf && !isLockedOwner && (isOwner || member.role === "member"));
            const isProcessing = processingMemberId === member.id;

            return (
              <div key={member.id} className="flex items-start gap-3 rounded-[22px] border border-line bg-panel p-3 shadow-soft">
                <MemberAvatar member={member} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-black text-ink">{member.profile?.name || "Anggota keluarga"}</p>
                  <p className="truncate text-[11px] font-semibold text-muted-foreground">{member.profile?.email || "Email tidak tersedia"}</p>
                  {member.profile?.username && <p className="truncate text-[11px] font-semibold text-muted-foreground">@{member.profile.username}</p>}
                </div>

                <div className="grid shrink-0 justify-items-end gap-2">
                  <RolePill role={member.role} />

                  {canChangeRole && (
                    <select
                      value={roleDrafts[member.id] || member.role}
                      onChange={(event) => setRoleDrafts((drafts) => ({ ...drafts, [member.id]: event.target.value }))}
                      disabled={isProcessing}
                      className="h-9 rounded-xl border border-field-border bg-field-bg px-2 text-xs font-bold text-ink outline-none"
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                  )}

                  {(canChangeRole || canRemoveMember) && (
                    <div className="flex gap-1.5">
                      {canChangeRole && (
                        <button
                          type="button"
                          onClick={() => saveMemberRole(member)}
                          disabled={isProcessing}
                          className="inline-flex items-center gap-1 rounded-full border border-line bg-blue-bg px-2 py-1 text-[10px] font-black text-blue transition hover:opacity-80"
                        >
                          <Save size={12} /> Simpan
                        </button>
                      )}
                      {canRemoveMember && (
                        <button
                          type="button"
                          onClick={() => removeMember(member)}
                          disabled={isProcessing}
                          className="inline-flex items-center gap-1 rounded-full border border-line bg-red-bg px-2 py-1 text-[10px] font-black text-red transition hover:opacity-80"
                        >
                          <Trash2 size={12} /> Hapus
                        </button>
                      )}
                    </div>
                  )}

                  {canManageMembers && isSelf && <p className="text-[10px] font-semibold text-muted-foreground">Akun Anda</p>}
                  {canManageMembers && isLockedOwner && !isSelf && (
                    <p className="text-[10px] font-semibold text-muted-foreground">Owner utama</p>
                  )}
                  {isAdmin && member.role === "admin" && !isSelf && (
                    <p className="text-[10px] font-semibold text-muted-foreground">Admin lain</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );

  const renderAccessPanel = () => (
    <>
      {renderPanelHeader("Hak Akses Role", "Role Management")}
      <section className={cardClassName}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black tracking-[0.13em] text-muted-foreground uppercase">Hak Akses</p>
            <h2 className="font-display text-lg tracking-tight text-ink">Owner, Admin, dan Member</h2>
          </div>
          <RolePill role={currentMember?.role} />
        </div>
        <p className="mt-2 text-xs leading-relaxed font-semibold text-muted-foreground">
          Hak akses dibuat tetap agar penggunaan aplikasi keluarga tetap sederhana. Owner mengatur role anggota pada menu
          Anggota Keluarga.
        </p>

        <div className="mt-3 grid gap-1.5" role="table" aria-label="Hak akses role">
          <div className="grid grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,0.9fr))] gap-2 rounded-xl bg-soft p-2.5 text-[11px] font-black text-muted-foreground">
            <span>Fitur</span>
            <b className="text-right">Owner</b>
            <b className="text-right">Admin</b>
            <b className="text-right">Member</b>
          </div>
          {roleAccessRows.map((item) => (
            <div
              key={item.label}
              className="grid grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,0.9fr))] gap-2 border-b border-line p-2.5 text-[11px] font-semibold text-ink last:border-0"
            >
              <span>{item.label}</span>
              <b className={cn("text-right", item.owner === "Tidak" ? "text-red" : "text-green")}>{item.owner}</b>
              <b className={cn("text-right", item.admin === "Tidak" ? "text-red" : "text-green")}>{item.admin}</b>
              <b className={cn("text-right", item.member === "Tidak" ? "text-red" : "text-green")}>{item.member}</b>
            </div>
          ))}
        </div>
      </section>
    </>
  );

  const renderWalletPanel = () => (
    <>
      {renderPanelHeader("Dompet Keluarga", "Keuangan")}
      <section className={cardClassName}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black tracking-[0.13em] text-muted-foreground uppercase">Akun & Dompet</p>
            <h2 className="font-display text-lg tracking-tight text-ink">Kelola Dompet</h2>
          </div>
          {!canManageWallets && (
            <span className="rounded-full border border-line bg-soft px-2.5 py-1.5 text-[10px] font-black text-muted-foreground">
              Read only
            </span>
          )}
        </div>

        <div className="mt-3 grid gap-2.5">
          {(accountBalances as Account[]).map((account) => (
            <div key={account.id} className="rounded-[22px] border border-line bg-panel p-3 shadow-soft">
              <div className="flex items-center gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-[17px] border border-line bg-rose-bg text-rose-dark">
                  <Wallet size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-black text-ink">{account.name}</p>
                  <p className="text-[11px] font-semibold text-muted-foreground">
                    {accountTypeLabel[account.type] || account.type} • {account.isActive ? "Aktif" : "Nonaktif"}
                  </p>
                </div>
                <p className="shrink-0 text-[13px] font-black text-ink">{formatRupiah(account.currentBalance || 0)}</p>
              </div>

              {canManageWallets && (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => startEditAccount(account)}
                    className="inline-flex items-center gap-1 rounded-full border border-line bg-blue-bg px-2.5 py-1.5 text-[10px] font-black text-blue transition hover:opacity-80"
                  >
                    <Pencil size={12} /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteAccount(account)}
                    className="inline-flex items-center gap-1 rounded-full border border-line bg-red-bg px-2.5 py-1.5 text-[10px] font-black text-red transition hover:opacity-80"
                  >
                    <Trash2 size={12} /> Hapus
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleAccount(account.id)}
                    className="rounded-full border border-line bg-soft px-2.5 py-1.5 text-[10px] font-black text-muted-foreground transition hover:text-ink"
                  >
                    {account.isActive ? "Nonaktifkan" : "Aktifkan"}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {canManageWallets ? (
          <form className="mt-4 grid gap-3" onSubmit={submitAccount}>
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] font-black tracking-[0.13em] text-muted-foreground uppercase">
                {editingAccountId ? "Edit Dompet" : "Tambah Dompet"}
              </p>
              {editingAccountId && (
                <button
                  type="button"
                  onClick={cancelEditAccount}
                  className="inline-flex items-center gap-1 rounded-full border border-line bg-panel-strong px-2.5 py-1.5 text-[10px] font-black text-rose-dark transition hover:bg-rose-bg"
                >
                  <X size={13} /> Batal
                </button>
              )}
            </div>
            <div className="grid gap-2">
              <label className={labelClassName}>Nama akun/dompet</label>
              <input
                value={accountForm.name}
                onChange={(event) => setAccountForm({ ...accountForm, name: event.target.value })}
                placeholder="Contoh: Bank Mandiri"
                className={fieldClassName}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <label className={labelClassName}>Jenis</label>
                <select
                  value={accountForm.type}
                  onChange={(event) => setAccountForm({ ...accountForm, type: event.target.value })}
                  className={cn(fieldClassName, "appearance-none")}
                >
                  {Object.entries(accountTypeLabel).map(([value, label]) => (
                    <option value={value} key={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <label className={labelClassName}>Saldo awal</label>
                <input
                  inputMode="numeric"
                  type="text"
                  disabled={editingAccountHasTransactions}
                  value={accountForm.initialBalance}
                  onChange={(event) => setAccountForm({ ...accountForm, initialBalance: sanitizeNumericInput(event.target.value) })}
                  className={cn(fieldClassName, editingAccountHasTransactions && "cursor-not-allowed opacity-60")}
                />
                {editingAccountHasTransactions && (
                  <small className="text-[10.5px] font-semibold text-muted-foreground">
                    Saldo awal terkunci karena dompet sudah memiliki riwayat transaksi.
                  </small>
                )}
              </div>
            </div>
            <button type="submit" className={secondaryButtonClassName}>
              {editingAccountId ? "Simpan Perubahan Dompet" : "Tambah Akun/Dompet"}
            </button>
          </form>
        ) : (
          <p className="mt-3 text-xs font-semibold text-muted-foreground">
            Hanya owner atau admin keluarga yang bisa menambah, mengedit, atau menonaktifkan dompet.
          </p>
        )}
      </section>
    </>
  );

  const renderCategoryPanel = () => (
    <>
      {renderPanelHeader("Kategori Pemasukan", "Keuangan")}
      <section className={cardClassName}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black tracking-[0.13em] text-muted-foreground uppercase">Kategori Transaksi</p>
            <h2 className="font-display text-lg tracking-tight text-ink">Pemasukan</h2>
          </div>
          {!canManageCategories && (
            <span className="rounded-full border border-line bg-soft px-2.5 py-1.5 text-[10px] font-black text-muted-foreground">
              Read only
            </span>
          )}
        </div>
        <p className="mt-2 text-xs leading-relaxed font-semibold text-muted-foreground">
          Kategori pengeluaran sudah digantikan oleh Alokasi Anggaran. Kategori di menu ini khusus untuk transaksi pemasukan.
        </p>

        {canManageCategories && (
          <form className="mt-3 grid gap-3" onSubmit={submitCategory}>
            <div className="grid gap-2">
              <label className={labelClassName}>Nama kategori pemasukan</label>
              <input
                value={categoryForm.name}
                onChange={(event) => setCategoryForm({ ...categoryForm, name: event.target.value, type: "income" })}
                placeholder="Contoh: Gaji, Bonus, Usaha"
                className={fieldClassName}
              />
            </div>
            <button type="submit" className={secondaryButtonClassName}>
              Tambah Kategori Pemasukan
            </button>
          </form>
        )}

        <div className="mt-4 grid gap-2">
          <p className="text-[10px] font-black tracking-[0.13em] text-muted-foreground uppercase">Kategori custom keluarga</p>
          <div className="flex flex-wrap gap-2">
            {familyIncomeCategories.length ? (
              familyIncomeCategories.map((category) => (
                <span
                  key={category.id}
                  className="inline-flex items-center gap-2 rounded-full border border-green-border bg-green-bg px-3 py-1.5 text-xs font-black text-green"
                >
                  {category.name}
                  {canManageCategories && (
                    <button
                      type="button"
                      onClick={() => deleteCategory(category.id)}
                      aria-label="Hapus kategori"
                      className="grid size-4 place-items-center rounded-full text-green transition hover:opacity-70"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </span>
              ))
            ) : (
              <p className="text-xs font-semibold text-muted-foreground">Belum ada kategori pemasukan custom.</p>
            )}
          </div>
        </div>

        <div className="mt-4 grid gap-2">
          <p className="text-[10px] font-black tracking-[0.13em] text-muted-foreground uppercase">Kategori bawaan</p>
          <div className="flex flex-wrap gap-2">
            {defaultIncomeCategories.map((category) => (
              <span
                key={category.id}
                className="rounded-full border border-line bg-soft px-3 py-1.5 text-xs font-black text-muted-foreground"
              >
                {category.name}
              </span>
            ))}
          </div>
        </div>
      </section>
    </>
  );

  const renderGoalsPanel = () => (
    <>
      {renderPanelHeader("Target Tabungan", "Keuangan")}
      <section className={cardClassName}>
        <div className="flex items-start justify-between gap-3">
          <p className="text-[10px] font-black tracking-[0.13em] text-muted-foreground uppercase">Target Tabungan</p>
          {!canManageSavingGoals && (
            <span className="rounded-full border border-line bg-soft px-2.5 py-1.5 text-[10px] font-black text-muted-foreground">
              Read only
            </span>
          )}
        </div>

        <div className="mt-3 grid gap-2.5">
          {(savingGoals as SavingGoal[]).map((goal) => {
            const pct = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));
            return (
              <div key={goal.id} className="grid gap-2 rounded-[22px] border border-line bg-panel p-3 shadow-soft">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[13.5px] font-black text-ink">{goal.name}</p>
                    <p className="text-[11px] font-semibold text-muted-foreground">
                      {formatRupiah(goal.currentAmount)} dari {formatRupiah(goal.targetAmount)}
                    </p>
                  </div>
                  <strong className="text-sm font-black text-ink">{pct}%</strong>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full border border-line bg-soft">
                  <div className="h-full rounded-full bg-[linear-gradient(90deg,var(--green),var(--teal))]" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>

        {canManageSavingGoals ? (
          <>
            <form className="mt-4 grid gap-3" onSubmit={submitDeposit}>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <label className={labelClassName}>Target</label>
                  <select
                    value={deposit.id}
                    onChange={(event) => setDeposit({ ...deposit, id: event.target.value })}
                    className={cn(fieldClassName, "appearance-none")}
                  >
                    <option value="">Pilih</option>
                    {(savingGoals as SavingGoal[]).map((goal) => (
                      <option value={goal.id} key={goal.id}>
                        {goal.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-2">
                  <label className={labelClassName}>Setoran</label>
                  <input
                    inputMode="numeric"
                    type="text"
                    value={deposit.amount}
                    onChange={(event) => setDeposit({ ...deposit, amount: sanitizeNumericInput(event.target.value) })}
                    className={fieldClassName}
                  />
                </div>
              </div>
              <button type="submit" className={secondaryButtonClassName}>
                Tambah Setoran
              </button>
            </form>

            <form className="mt-4 grid gap-3 border-t border-line pt-4" onSubmit={submitGoal}>
              <div className="grid gap-2">
                <label className={labelClassName}>Nama target baru</label>
                <input
                  value={goalForm.name}
                  onChange={(event) => setGoalForm({ ...goalForm, name: event.target.value })}
                  placeholder="Contoh: Dana darurat"
                  className={fieldClassName}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <label className={labelClassName}>Nominal target</label>
                  <input
                    inputMode="numeric"
                    type="text"
                    value={goalForm.targetAmount}
                    onChange={(event) => setGoalForm({ ...goalForm, targetAmount: sanitizeNumericInput(event.target.value) })}
                    className={fieldClassName}
                  />
                </div>
                <div className="grid gap-2">
                  <label className={labelClassName}>Terkumpul</label>
                  <input
                    inputMode="numeric"
                    type="text"
                    value={goalForm.currentAmount}
                    onChange={(event) => setGoalForm({ ...goalForm, currentAmount: sanitizeNumericInput(event.target.value) })}
                    className={fieldClassName}
                  />
                </div>
              </div>
              <button type="submit" className={secondaryButtonClassName}>
                Buat Target Tabungan
              </button>
            </form>
          </>
        ) : (
          <p className="mt-3 text-xs font-semibold text-muted-foreground">
            Hanya owner atau admin yang bisa membuat target dan menambah setoran tabungan.
          </p>
        )}
      </section>
    </>
  );

  const panelMap: Record<string, () => ReactNode> = {
    menu: renderMenu,
    profile: renderProfilePanel,
    password: renderPasswordPanel,
    family: renderFamilyPanel,
    access: renderAccessPanel,
    wallets: renderWalletPanel,
    categories: renderCategoryPanel,
    goals: renderGoalsPanel,
  };

  return <div className="flex flex-col gap-4">{((panelMap[activePanel] || renderMenu) as () => ReactNode)()}</div>;
}
