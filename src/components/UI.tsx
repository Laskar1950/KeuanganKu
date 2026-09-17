import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value?: number;
  variant?: string;
}

export function ProgressBar({ value, variant = "" }: ProgressBarProps) {
  const safeValue = Math.max(0, Math.min(Number(value || 0), 100));

  return (
    <div className="h-2.5 overflow-hidden rounded-full border border-line bg-soft shadow-[inset_0_1px_3px_rgba(0,0,0,0.05)]">
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-300",
          variant === "green"
            ? "bg-[linear-gradient(90deg,var(--green),var(--teal))]"
            : variant === "amber"
              ? "bg-[linear-gradient(90deg,var(--amber),var(--orange))]"
              : variant === "red"
                ? "bg-[linear-gradient(90deg,var(--red),var(--rose))]"
                : "bg-[image:var(--gradient-brand)]"
        )}
        style={{ width: `${safeValue}%` }}
      />
    </div>
  );
}

interface EmptyStateProps {
  emoji?: string;
  title: string;
  description?: string;
}

export function EmptyState({ emoji = "📝", title, description }: EmptyStateProps) {
  return (
    <div className="rounded-3xl px-4 py-7 text-center text-muted-foreground">
      <div className="mb-2 text-[34px] leading-none">{emoji}</div>
      <h3 className="text-[15px] font-black text-ink">{title}</h3>
      {description ? <p className="mt-1 text-xs font-semibold">{description}</p> : null}
    </div>
  );
}

export function Toast({ message }: { message?: string }) {
  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-[18px] left-1/2 z-[80] w-[calc(100%-32px)] max-w-[398px] -translate-x-1/2 rounded-[18px] border border-sheet-border bg-toast-bg px-3.5 py-3 text-[13px] font-black text-toast-ink shadow-soft-hover backdrop-blur-[22px]"
    >
      {message}
    </div>
  );
}

export function GlassLoading() {
  return (
    <div className="grid min-h-screen place-items-center p-4 [background:var(--gradient-bg)]">
      <div className="grid w-full max-w-[430px] gap-4 rounded-[34px] border border-line-strong bg-panel-strong/90 p-6 shadow-soft backdrop-blur-xl">
        <div className="grid size-14 place-items-center rounded-[22px] text-on-accent shadow-accent [background-image:var(--gradient-brand)]">
          <span className="size-8 animate-spin rounded-[14px] border-[3px] border-white/75 border-t-transparent" />
        </div>

        <div>
          <h1 className="font-display text-[28px] leading-tight tracking-tight text-ink">Memuat data...</h1>
          <p className="mt-1 text-sm text-muted-foreground">Menghubungkan aplikasi dengan Supabase.</p>
        </div>

        <div className="grid gap-2.5">
          <div className="h-3 w-full animate-pulse rounded-full border border-line bg-skeleton-base" />
          <div className="h-3 w-2/3 animate-pulse rounded-full border border-line bg-skeleton-base" />

          <div className="grid grid-cols-2 gap-2.5">
            <div className="h-[76px] animate-pulse rounded-[22px] border border-line bg-skeleton-base" />
            <div className="h-[76px] animate-pulse rounded-[22px] border border-line bg-skeleton-base" />
          </div>
        </div>
      </div>
    </div>
  );
}
