import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  busyLabel?: string;
  tone?: "danger" | "warning";
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title = "Yakin ingin melanjutkan?",
  message = "",
  confirmLabel = "Hapus",
  cancelLabel = "Batal",
  busyLabel = "Memproses...",
  tone = "danger",
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel?.();
    };

    window.addEventListener("keydown", handleKeyDown);
    const focusTimer = window.setTimeout(() => cancelRef.current?.focus(), 60);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.clearTimeout(focusTimer);
    };
  }, [open, onCancel]);

  const Icon = tone === "danger" ? Trash2 : AlertTriangle;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[90] grid place-items-center bg-backdrop p-5 backdrop-blur-[10px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={busy ? undefined : onCancel}
        >
          <motion.div
            className="grid w-full max-w-[360px] justify-items-center gap-2.5 rounded-[28px] border border-sheet-border bg-sheet-bg p-5 text-center shadow-[0_-26px_70px_rgba(0,0,0,0.18)]"
            role="alertdialog"
            aria-modal="true"
            aria-label={title}
            initial={{ y: 26, opacity: 0.98, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 26, opacity: 0.98, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            onClick={(event) => event.stopPropagation()}
          >
            <span
              className={cn(
                "grid size-[46px] place-items-center rounded-[18px]",
                tone === "danger" ? "bg-red-bg text-red" : "bg-amber-bg text-amber"
              )}
            >
              <Icon size={19} />
            </span>
            <h3 className="font-display text-[17px] tracking-tight text-ink">{title}</h3>
            {message ? <p className="text-xs leading-relaxed font-semibold text-muted-foreground">{message}</p> : null}

            <div className="mt-1.5 grid w-full grid-cols-2 gap-2.5">
              <button
                ref={cancelRef}
                type="button"
                onClick={onCancel}
                disabled={busy}
                className="h-12 rounded-2xl border border-line bg-panel-strong text-[13px] font-black text-rose-dark shadow-soft transition hover:bg-rose-bg disabled:opacity-60"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={busy}
                className={cn(
                  "h-12 rounded-2xl border border-white/40 text-[13px] font-black text-on-accent shadow-accent transition hover:opacity-95 disabled:opacity-60",
                  tone === "danger"
                    ? "[background-image:linear-gradient(135deg,var(--red),var(--rose-strong))]"
                    : "[background-image:linear-gradient(135deg,var(--amber),var(--orange))]"
                )}
              >
                {busy ? busyLabel : confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
