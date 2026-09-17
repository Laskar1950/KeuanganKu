import { useState, type FormEvent } from "react";
import AuthForm, { type AuthFormValues, type AuthMode, type UsernameStatus } from "@/components/ui/auth-form";
import { useApp } from "@/context/AppContext";
import { supabase } from "@/lib/supabaseClient";

const initialForm: AuthFormValues = { name: "", identifier: "", email: "", password: "" };

const idleUsername: UsernameStatus = { state: "idle", message: "" };

function normalizeUsername(value = "") {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function getErrorMessage(error: unknown) {
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message?: unknown }).message || "");
  }
  return "";
}

export default function AuthPage() {
  const { login, notify } = useApp();
  const [mode, setMode] = useState<AuthMode>("login");
  const [form, setForm] = useState<AuthFormValues>(initialForm);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>(idleUsername);

  const setField = (key: keyof AuthFormValues, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (key === "identifier" && usernameStatus.state !== "idle") setUsernameStatus(idleUsername);
  };

  const changeMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setShowPassword(false);
    setUsernameStatus(idleUsername);
    if (nextMode === "login") setForm(initialForm);
  };

  const friendlyAuthError = (error: unknown) => {
    const message = getErrorMessage(error) || "Terjadi kesalahan. Coba lagi.";
    if (/invalid login credentials/i.test(message)) return "Email/username atau password salah.";
    if (/email not confirmed/i.test(message)) return "Email belum dikonfirmasi. Cek kotak masuk email Anda.";
    if (/user already registered/i.test(message)) return "Email sudah terdaftar. Gunakan email lain atau masuk.";
    return message;
  };

  const checkUsername = async (rawValue: string) => {
    const username = normalizeUsername(rawValue || "");

    if (!username) {
      const result = { ok: false, state: "idle" as const, message: "" };
      setUsernameStatus(result);
      return result;
    }

    if (username.length < 3) {
      const result = { ok: false, state: "invalid" as const, message: "Username minimal 3 karakter." };
      setUsernameStatus(result);
      return result;
    }

    setUsernameStatus({ state: "checking", message: "Memeriksa ketersediaan username..." });
    const { data, error } = await supabase.rpc("is_username_available", { p_username: username });

    if (error) {
      const result = { ok: true, state: "idle" as const, message: "" };
      setUsernameStatus(result);
      return result;
    }

    if (!data) {
      const result = { ok: false, state: "taken" as const, message: `Username "${username}" sudah dipakai. Coba yang lain.` };
      setUsernameStatus(result);
      return result;
    }

    const result = { ok: true, state: "available" as const, message: `Username "${username}" tersedia.` };
    setUsernameStatus(result);
    return result;
  };

  const resolveLoginEmail = async () => {
    const identifier = form.identifier.trim();
    if (!identifier) throw new Error("Email atau username wajib diisi.");
    if (identifier.includes("@")) return identifier;

    const { data, error } = await supabase.rpc("get_login_email", { p_identifier: identifier });
    if (error) throw error;
    if (!data) throw new Error("Email/username atau password salah.");
    return data as string;
  };

  const registerAccount = async () => {
    const name = form.name.trim();
    const email = form.email.trim();
    const username = normalizeUsername(form.identifier || email.split("@")[0]);

    if (!name || !email || !form.password) throw new Error("Nama, email, dan password wajib diisi.");
    if (!username || username.length < 3) throw new Error("Username minimal 3 karakter.");
    if (form.password.length < 6) throw new Error("Password minimal 6 karakter.");

    const usernameCheck = await checkUsername(username);
    if (!usernameCheck.ok) throw new Error(usernameCheck.message);

    const { data, error } = await supabase.auth.signUp({
      email,
      password: form.password,
      options: { data: { name, username } },
    });
    if (error) throw error;

    if (data.session && data.user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", data.user.id)
        .maybeSingle();
      const assignedUsername = profile?.username || username;
      notify(`Registrasi berhasil. Anda bisa login memakai username: ${assignedUsername}`);
      return;
    }

    notify("Registrasi berhasil. Silakan login atau cek email jika konfirmasi email aktif.");
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      setLoading(true);

      if (mode === "register") {
        await registerAccount();
        setMode("login");
        return;
      }

      if (mode === "forgot") {
        const email = await resolveLoginEmail();
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        });
        if (error) throw error;
        notify("Link reset password sudah dikirim ke email jika akun terdaftar.");
        setMode("login");
        return;
      }

      const email = await resolveLoginEmail();
      await login({ email, password: form.password });
    } catch (error) {
      notify(friendlyAuthError(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthForm
      mode={mode}
      form={form}
      loading={loading}
      showPassword={showPassword}
      usernameStatus={usernameStatus}
      onModeChange={changeMode}
      onFieldChange={setField}
      onTogglePassword={() => setShowPassword((value) => !value)}
      onUsernameBlur={() => checkUsername(form.identifier)}
      onSubmit={submit}
    />
  );
}
