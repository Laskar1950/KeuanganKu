import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Eye, EyeOff, KeyRound, Mail, ShieldCheck, UserPlus } from "lucide-react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export type AuthMode = "login" | "register" | "forgot" | "help";

export interface AuthFormValues {
  name: string;
  identifier: string;
  email: string;
  password: string;
}

export interface UsernameStatus {
  state: "idle" | "checking" | "available" | "taken" | "invalid";
  message: string;
}

export interface AuthFormProps {
  mode: AuthMode;
  form: AuthFormValues;
  loading: boolean;
  showPassword: boolean;
  usernameStatus: UsernameStatus;
  onModeChange: (mode: AuthMode) => void;
  onFieldChange: (key: keyof AuthFormValues, value: string) => void;
  onTogglePassword: () => void;
  onUsernameBlur: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

const fieldClassName =
  "h-12 rounded-2xl border-field-border bg-field-bg px-4 text-sm font-semibold text-ink placeholder:font-medium focus-visible:border-rose-strong focus-visible:ring-rose-bg";

const labelClassName = "text-xs font-extrabold tracking-wide text-muted-foreground";

const headline: Record<AuthMode, string> = {
  login: "Masuk dengan nyaman.",
  register: "Mulai kelola bersama.",
  forgot: "Pulihkan akses akun.",
  help: "Butuh bantuan?",
};

const subtitle: Record<AuthMode, string> = {
  login: "Pantau dompet, alokasi, transaksi, dan laporan keluarga dari satu aplikasi yang ringan.",
  register: "Daftar akun baru untuk membuat atau bergabung ke ruang keuangan keluarga.",
  forgot: "Masukkan email atau username. Kami akan mengirim tautan reset password melalui email.",
  help: "Jika mengalami kendala login, cek email, username, dan password terlebih dahulu atau hubungi pengelola keluarga.",
};

const submitLabel: Record<AuthMode, string> = {
  login: "Masuk",
  register: "Daftar Akun",
  forgot: "Kirim Link Reset",
  help: "Kembali ke Login",
};

export default function AuthForm({
  mode,
  form,
  loading,
  showPassword,
  usernameStatus,
  onModeChange,
  onFieldChange,
  onTogglePassword,
  onUsernameBlur,
  onSubmit,
}: AuthFormProps) {
  const isRegister = mode === "register";
  const isForgot = mode === "forgot";
  const isHelp = mode === "help";

  return (
    <div className="grid min-h-screen place-items-center p-4 [background:var(--gradient-bg)]">
      <section className="w-full max-w-[430px]">
        <div className="mb-5 flex items-center gap-3">
          <div className="grid size-12 place-items-center rounded-2xl text-lg font-black text-on-accent shadow-accent [background-image:var(--gradient-brand)]">
            K
          </div>
          <div className="leading-tight">
            <small className="block text-[11px] font-black tracking-[0.14em] text-muted-foreground uppercase">
              KeuanganKu
            </small>
            <strong className="font-display text-lg tracking-tight text-ink">Keuangan Keluarga</strong>
          </div>
        </div>

        <div className="rounded-[34px] border border-line-strong bg-panel-strong/90 p-6 shadow-soft backdrop-blur-xl">
          <div className="mb-5">
            <span className="mb-2 inline-flex rounded-full bg-rose-bg px-3 py-1 text-[11px] font-black text-rose-dark">
              Keuangan keluarga aman terkendali
            </span>
            <h1 className="font-display text-[28px] leading-tight tracking-tight text-ink">{headline[mode]}</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{subtitle[mode]}</p>
          </div>

          {isHelp ? (
            <div className="grid gap-4">
              <strong className="text-sm font-black text-ink">Bantuan Login</strong>
              <div className="grid gap-3">
                {[
                  { icon: Mail, text: "Masuk bisa menggunakan email atau username akun." },
                  { icon: KeyRound, text: "Gunakan menu Lupa Password jika tidak ingat password." },
                  { icon: ShieldCheck, text: "Jika belum punya akun, pilih Daftar akun baru." },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-start gap-3 rounded-2xl border border-line bg-soft p-3">
                    <Icon size={16} className="mt-0.5 shrink-0 text-rose-dark" />
                    <p className="text-xs leading-relaxed font-semibold text-muted-foreground">{text}</p>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="secondary"
                className="h-12 rounded-2xl text-sm font-black"
                onClick={() => onModeChange("login")}
              >
                <ArrowLeft size={15} /> Kembali ke Login
              </Button>
            </div>
          ) : (
            <form className="grid gap-4" onSubmit={onSubmit}>
              {!isForgot && (
                <div className="grid grid-cols-2 gap-2 rounded-2xl border border-field-border bg-field-bg p-1">
                  {(
                    [
                      { id: "login", label: "Masuk" },
                      { id: "register", label: "Daftar" },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => onModeChange(tab.id)}
                      className={cn(
                        "rounded-xl bg-transparent px-4 py-2.5 text-sm font-black transition",
                        mode === tab.id
                          ? "text-on-accent shadow-accent [background-image:var(--gradient-brand)]"
                          : "text-muted-foreground hover:text-ink"
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              )}

              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={mode}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18 }}
                  className="grid gap-4"
                >
                  {isRegister && (
                    <div className="grid gap-2">
                      <Label htmlFor="name" className={labelClassName}>
                        Nama
                      </Label>
                      <Input
                        id="name"
                        value={form.name}
                        onChange={(event) => onFieldChange("name", event.target.value)}
                        placeholder="Nama lengkap"
                        className={fieldClassName}
                      />
                    </div>
                  )}

                  {isRegister ? (
                    <>
                      <div className="grid gap-2">
                        <Label htmlFor="username" className={labelClassName}>
                          Username
                        </Label>
                        <Input
                          id="username"
                          value={form.identifier}
                          onChange={(event) => onFieldChange("identifier", event.target.value)}
                          onBlur={onUsernameBlur}
                          placeholder="contoh: rizki_afrizal"
                          autoCapitalize="none"
                          className={fieldClassName}
                        />
                        {usernameStatus.message ? (
                          <p
                            className={cn(
                              "text-[11.5px] font-bold",
                              usernameStatus.state === "available" && "text-green",
                              usernameStatus.state === "taken" && "text-red",
                              usernameStatus.state === "invalid" && "text-amber",
                              usernameStatus.state === "checking" && "text-muted-foreground"
                            )}
                          >
                            {usernameStatus.message}
                          </p>
                        ) : null}
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="email" className={labelClassName}>
                          Email
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          value={form.email}
                          onChange={(event) => onFieldChange("email", event.target.value)}
                          placeholder="nama@email.com"
                          autoCapitalize="none"
                          className={fieldClassName}
                        />
                      </div>
                    </>
                  ) : (
                    <div className="grid gap-2">
                      <Label htmlFor="identifier" className={labelClassName}>
                        {isForgot ? "Email atau Username" : "Email / Username"}
                      </Label>
                      <Input
                        id="identifier"
                        type="text"
                        value={form.identifier}
                        onChange={(event) => onFieldChange("identifier", event.target.value)}
                        placeholder="email atau username"
                        autoCapitalize="none"
                        className={fieldClassName}
                      />
                    </div>
                  )}

                  {!isForgot && (
                    <div className="grid gap-2">
                      <Label htmlFor="password" className={labelClassName}>
                        Password
                      </Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          value={form.password}
                          onChange={(event) => onFieldChange("password", event.target.value)}
                          placeholder="Minimal 6 karakter"
                          autoComplete={isRegister ? "new-password" : "current-password"}
                          className={cn(fieldClassName, "pr-11")}
                        />
                        <button
                          type="button"
                          onClick={onTogglePassword}
                          aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                          className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-full bg-transparent p-1.5 text-muted-foreground transition hover:text-ink"
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>

              <Button
                type="submit"
                disabled={loading}
                className="h-12 w-full rounded-2xl border border-white/40 bg-transparent text-sm font-black text-on-accent shadow-accent [background-image:var(--gradient-brand)] hover:opacity-95"
              >
                {loading ? "Memproses..." : submitLabel[mode]}
              </Button>

              {!isForgot && !isRegister && (
                <div className="flex items-center justify-between text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => onModeChange("forgot")}
                    className="bg-transparent text-rose-dark transition hover:opacity-80"
                  >
                    Lupa password?
                  </button>
                  <button
                    type="button"
                    onClick={() => onModeChange("help")}
                    className="bg-transparent text-muted-foreground transition hover:text-ink"
                  >
                    Butuh bantuan?
                  </button>
                </div>
              )}

              {isForgot && (
                <Button
                  type="button"
                  variant="secondary"
                  className="h-12 rounded-2xl text-sm font-black"
                  onClick={() => onModeChange("login")}
                >
                  <ArrowLeft size={15} /> Kembali ke Login
                </Button>
              )}

              {isRegister && (
                <Button
                  type="button"
                  variant="secondary"
                  className="h-12 rounded-2xl text-sm font-black"
                  onClick={() => onModeChange("login")}
                >
                  <ArrowLeft size={15} /> Sudah punya akun? Masuk
                </Button>
              )}

              {!isForgot && !isRegister && (
                <Button
                  type="button"
                  variant="ghost"
                  className="h-11 rounded-2xl text-sm font-black text-rose-dark hover:bg-rose-bg hover:text-rose-dark"
                  onClick={() => onModeChange("register")}
                >
                  <UserPlus size={15} /> Daftar akun baru
                </Button>
              )}
            </form>
          )}
        </div>
      </section>
    </div>
  );
}
