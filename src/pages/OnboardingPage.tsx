import { AnimatePresence, motion } from "framer-motion";
import { Home, Users } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useApp } from "@/context/AppContext";

interface OnboardingForm {
  householdName: string;
  accountName: string;
  accountType: string;
  initialBalance: string | number;
}

const initialForm: OnboardingForm = {
  householdName: "",
  accountName: "Tunai",
  accountType: "cash",
  initialBalance: 0,
};

const fieldClassName =
  "h-12 rounded-2xl border-field-border bg-field-bg px-4 text-sm font-semibold text-ink placeholder:font-medium focus-visible:border-rose-strong focus-visible:ring-rose-bg";

const labelClassName = "text-xs font-extrabold tracking-wide text-muted-foreground";

export default function OnboardingPage() {
  const { completeOnboarding, joinFamilyByInviteCode, notify } = useApp();

  const [mode, setMode] = useState<"create" | "join">("create");
  const [form, setForm] = useState<OnboardingForm>(initialForm);
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);

  const setField = (key: keyof OnboardingForm, value: string | number) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const submitCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      setLoading(true);
      await completeOnboarding(form);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Gagal membuat keluarga.");
    } finally {
      setLoading(false);
    }
  };

  const submitJoin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      setLoading(true);
      await joinFamilyByInviteCode(inviteCode);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Gagal bergabung ke keluarga.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center p-4 [background:var(--gradient-bg)]">
      <section className="w-full max-w-[430px]">
        <div className="rounded-[34px] border border-line-strong bg-panel-strong/90 p-6 shadow-soft backdrop-blur-xl">
          <div className="mb-5 grid gap-4">
            <div className="grid size-12 place-items-center rounded-2xl text-on-accent shadow-accent [background-image:var(--gradient-brand)]">
              {mode === "create" ? <Home size={22} /> : <Users size={22} />}
            </div>
            <div>
              <h1 className="font-display text-[28px] leading-tight tracking-tight text-ink">Setup keluarga</h1>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Buat keluarga baru sebagai owner, atau gabung ke keluarga yang sudah ada memakai kode undangan.
              </p>
            </div>
          </div>

          <div className="mb-5 grid grid-cols-2 gap-2 rounded-2xl border border-field-border bg-field-bg p-1">
            {(
              [
                { id: "create", label: "Buat Keluarga", hint: "Untuk owner" },
                { id: "join", label: "Gabung", hint: "Untuk anggota" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setMode(tab.id)}
                className={cn(
                  "grid gap-0.5 rounded-xl bg-transparent px-4 py-2.5 text-sm font-black transition",
                  mode === tab.id
                    ? "text-on-accent shadow-accent [background-image:var(--gradient-brand)]"
                    : "text-muted-foreground hover:text-ink"
                )}
              >
                {tab.label}
                <small className={cn("text-[10px] font-bold", mode === tab.id ? "opacity-80" : "opacity-70")}>
                  {tab.hint}
                </small>
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait" initial={false}>
            {mode === "create" ? (
              <motion.form
                key="create"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
                className="grid gap-4"
                onSubmit={submitCreate}
              >
                <div className="grid gap-2">
                  <Label htmlFor="householdName" className={labelClassName}>
                    Nama keluarga
                  </Label>
                  <Input
                    id="householdName"
                    value={form.householdName}
                    onChange={(event) => setField("householdName", event.target.value)}
                    placeholder="Contoh: Keluarga Rizki"
                    className={fieldClassName}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="accountName" className={labelClassName}>
                    Nama akun/dompet awal
                  </Label>
                  <Input
                    id="accountName"
                    value={form.accountName}
                    onChange={(event) => setField("accountName", event.target.value)}
                    placeholder="Contoh: Bank Mandiri"
                    className={fieldClassName}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label htmlFor="accountType" className={labelClassName}>
                      Jenis akun
                    </Label>
                    <select
                      id="accountType"
                      value={form.accountType}
                      onChange={(event) => setField("accountType", event.target.value)}
                      className={cn(fieldClassName, "appearance-none outline-none")}
                    >
                      <option value="cash">Cash</option>
                      <option value="bank">Bank</option>
                      <option value="ewallet">E-Wallet</option>
                      <option value="saving">Tabungan</option>
                      <option value="other">Lainnya</option>
                    </select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="initialBalance" className={labelClassName}>
                      Saldo awal
                    </Label>
                    <Input
                      id="initialBalance"
                      inputMode="numeric"
                      type="number"
                      value={form.initialBalance}
                      onChange={(event) => setField("initialBalance", event.target.value)}
                      className={fieldClassName}
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="h-12 w-full rounded-2xl border border-white/40 bg-transparent text-sm font-black text-on-accent shadow-accent [background-image:var(--gradient-brand)] hover:opacity-95"
                >
                  {loading ? "Memproses..." : "Buat Keluarga"}
                </Button>
              </motion.form>
            ) : (
              <motion.form
                key="join"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
                className="grid gap-4"
                onSubmit={submitJoin}
              >
                <div className="grid gap-2">
                  <Label htmlFor="inviteCode" className={labelClassName}>
                    Kode undangan keluarga
                  </Label>
                  <Input
                    id="inviteCode"
                    value={inviteCode}
                    onChange={(event) => setInviteCode(event.target.value.toUpperCase())}
                    placeholder="Contoh: A1B2C3D4"
                    className={cn(fieldClassName, "tracking-[0.12em] uppercase")}
                  />
                </div>

                <p className="text-xs leading-relaxed font-semibold text-muted-foreground">
                  Minta kode undangan dari owner keluarga. Setelah bergabung, transaksi yang Anda buat akan masuk ke
                  data keluarga tersebut.
                </p>

                <Button
                  type="submit"
                  disabled={loading}
                  className="h-12 w-full rounded-2xl border border-white/40 bg-transparent text-sm font-black text-on-accent shadow-accent [background-image:var(--gradient-brand)] hover:opacity-95"
                >
                  {loading ? "Memproses..." : "Gabung Keluarga"}
                </Button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </section>
    </div>
  );
}
