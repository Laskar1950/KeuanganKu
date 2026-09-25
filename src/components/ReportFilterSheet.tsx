import { X, Filter, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

const MONTHS = [
  { value: 1, label: "Januari" },
  { value: 2, label: "Februari" },
  { value: 3, label: "Maret" },
  { value: 4, label: "April" },
  { value: 5, label: "Mei" },
  { value: 6, label: "Juni" },
  { value: 7, label: "Juli" },
  { value: 8, label: "Agustus" },
  { value: 9, label: "September" },
  { value: 10, label: "Oktober" },
  { value: 11, label: "November" },
  { value: 12, label: "Desember" },
];

const selectClassName =
  "h-12 w-full rounded-2xl border border-field-border bg-field-bg px-4 text-sm font-semibold text-ink outline-none focus:border-rose-strong focus:ring-4 focus:ring-rose-bg";
const labelClassName = "text-xs font-extrabold tracking-wide text-muted-foreground";

import type { Granularity } from "@/components/ReportCharts";

interface Props {
  open: boolean;
  onClose: () => void;
  month: number;
  year: number;
  accountId: string;
  budgetId: string;
  granularity: Granularity;
  yearOptions: number[];
  accounts: { id: string; name: string }[];
  budgets: { id: string; name: string; month: number; year: number }[];
  onChangeMonth: (v: number) => void;
  onChangeYear: (v: number) => void;
  onChangeAccount: (v: string) => void;
  onChangeBudget: (v: string) => void;
  onChangeGranularity: (v: Granularity) => void;
  onReset: () => void;
  onApply: () => void;
  activeCount: number;
}

export default function ReportFilterSheet({
  open,
  onClose,
  month,
  year,
  accountId,
  budgetId,
  granularity,
  yearOptions,
  accounts,
  budgets,
  onChangeMonth,
  onChangeYear,
  onChangeAccount,
  onChangeBudget,
  onChangeGranularity,
  onReset,
  onApply,
}: Props) {
  if (!open) return null;

  const filteredBudgets = budgets.filter((b) => Number(b.month) === Number(month) && Number(b.year) === Number(year));

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true" aria-label="Filter laporan">
      <button type="button" aria-label="Tutup filter" onClick={onClose} className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" />
      <div className="relative w-full max-w-[430px] max-h-[78vh] overflow-y-auto rounded-t-[30px] border border-line-strong bg-panel-strong p-5 shadow-soft-hover [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-line" aria-hidden="true" />
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-rose-bg text-rose-dark">
              <Filter size={18} />
            </span>
            <div>
              <h2 className="font-display text-lg tracking-tight text-ink">Filter laporan</h2>
              <p className="text-xs font-semibold text-muted-foreground">Pilih periode, dompet, atau alokasi.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="grid size-9 place-items-center rounded-full border border-line bg-panel text-muted-foreground transition hover:bg-soft"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-4 grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <label className={labelClassName}>Bulan</label>
              <select value={month} onChange={(e) => onChangeMonth(Number(e.target.value))} className={selectClassName}>
                {MONTHS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <label className={labelClassName}>Tahun</label>
              <select value={year} onChange={(e) => onChangeYear(Number(e.target.value))} className={selectClassName}>
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-2">
            <label className={labelClassName}>Dompet</label>
            <select value={accountId} onChange={(e) => onChangeAccount(e.target.value)} className={selectClassName}>
              <option value="all">Semua dompet</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-2">
            <label className={labelClassName}>Alokasi</label>
            <select value={budgetId} onChange={(e) => onChangeBudget(e.target.value)} className={selectClassName}>
              <option value="all">Semua alokasi</option>
              {filteredBudgets.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-2">
            <label className={labelClassName}>Tampilan Tren</label>
            <select value={granularity} onChange={(e) => onChangeGranularity(e.target.value as Granularity)} className={selectClassName}>
              <option value="6months">6 Siklus Gajian (25–24) — Default</option>
              <option value="monthly">Bulanan (Kalender)</option>
              <option value="yearly">Tahunan</option>
              <option value="weekly">Mingguan — Lainnya</option>
              <option value="daily">Harian (Siklus) — Lainnya</option>
            </select>
            <small className="text-[11px] font-semibold text-muted-foreground">3 default ditampilkan di Laporan, lainnya via filter ini. Harian mengikuti siklus terpilih.</small>
          </div>
        </div>

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={() => {
              onReset();
              onClose();
            }}
            className="inline-flex h-12 flex-1 items-center justify-center gap-1.5 rounded-2xl border border-line bg-panel-strong text-sm font-black text-muted-foreground transition hover:bg-soft"
          >
            <RotateCcw size={16} /> Reset
          </button>
          <button
            type="button"
            onClick={onApply}
            className="inline-flex h-12 flex-1 items-center justify-center gap-1.5 rounded-2xl border border-white/40 bg-[image:var(--gradient-brand)] text-sm font-black text-white shadow-accent"
          >
            Terapkan
          </button>
        </div>
        <div className={cn("mt-3 text-center text-[11px] font-semibold", "text-muted-foreground")}>Filter aktif akan memengaruhi ringkasan, grafik, dan Excel.</div>
      </div>
    </div>
  );
}

export { MONTHS };
