import { DONUT_PALETTE } from "@/utils/chartPalette";

export interface DonutRow {
  id: string;
  name: string;
  value: number;
}

export type Granularity = "daily" | "weekly" | "monthly" | "6months" | "yearly";

export interface TrendPeriod {
  month: number;
  year: number;
  label: string;
  fullLabel: string;
  isActive: boolean;
  income: number;
  expense: number;
  // extended for flexible granularities
  key?: string;
  startKey?: string;
  endKey?: string;
}

export function getExpenseIncomeStatus(income: number, expense: number): { label: string; tone: "surplus" | "balanced" | "deficit"; description: string } {
  const inc = Number(income || 0);
  const exp = Number(expense || 0);
  if (inc === 0 && exp === 0) return { label: "Belum Ada Aktivitas", tone: "balanced", description: "Belum ada pencatatan pada periode ini" };
  if (inc === 0 && exp > 0) return { label: "Defisit Penuh", tone: "deficit", description: "Tidak ada pemasukan, hanya pengeluaran" };
  if (exp === 0 && inc > 0) return { label: "Surplus Maksimal", tone: "surplus", description: "Tidak ada pengeluaran, pemasukan utuh" };
  const diff = Math.abs(inc - exp);
  const max = Math.max(inc, exp);
  const ratio = diff / max;
  if (ratio < 0.1) return { label: "Seimbang", tone: "balanced", description: "Pemasukan dan pengeluaran relatif seimbang" };
  if (exp > inc) {
    if (exp > inc * 1.5) return { label: "Defisit Signifikan", tone: "deficit", description: "Pengeluaran jauh melampaui pemasukan" };
    return { label: "Defisit", tone: "deficit", description: "Pengeluaran melebihi pemasukan" };
  }
  // inc > exp
  if (exp < inc * 0.5) return { label: "Surplus Signifikan", tone: "surplus", description: "Pemasukan jauh melampaui pengeluaran" };
  return { label: "Surplus", tone: "surplus", description: "Pemasukan melebihi pengeluaran" };
}

function trimDecimal(value: number) {
  return value.toFixed(1).replace(/\.0$/, "").replace(".", ",");
}

function formatCompact(value: number) {
  const amount = Number(value || 0);
  const sign = amount < 0 ? "-" : "";
  const abs = Math.abs(amount);

  if (abs >= 1_000_000_000) return `${sign}Rp${trimDecimal(abs / 1_000_000_000)}M`;
  if (abs >= 1_000_000) return `${sign}Rp${trimDecimal(abs / 1_000_000)}jt`;
  if (abs >= 1_000) return `${sign}Rp${Math.round(abs / 1_000)}rb`;
  return `${sign}Rp${Math.round(abs)}`;
}

interface DonutChartProps {
  rows: DonutRow[];
  total: number;
}

export function DonutChart({ rows, total }: DonutChartProps) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const dashFor = (value: number) => (total > 0 ? (value / total) * circumference : 0);

  return (
    <svg
      viewBox="0 0 140 140"
      className="size-[150px]"
      role="img"
      aria-label={`Total pengeluaran ${formatCompact(total)}`}
    >
      <circle cx="70" cy="70" r={radius} fill="none" strokeWidth="18" className="stroke-skeleton-base" />
      {rows.map((row, index) => {
        const dash = dashFor(row.value);
        const offset = rows.slice(0, index).reduce((sum, previous) => sum + dashFor(previous.value), 0);

        return (
          <circle
            key={row.id}
            cx="70"
            cy="70"
            r={radius}
            fill="none"
            strokeWidth="18"
            stroke={DONUT_PALETTE[index % DONUT_PALETTE.length]}
            strokeDasharray={`${dash} ${circumference - dash}`}
            strokeDashoffset={-offset}
            transform="rotate(-90 70 70)"
          />
        );
      })}
      <text x="70" y="66" textAnchor="middle" className="fill-muted-foreground text-[9px] font-extrabold tracking-[0.1em] uppercase">
        Terpakai
      </text>
      <text x="70" y="86" textAnchor="middle" className="fill-ink text-[15px] font-black">
        {formatCompact(total)}
      </text>
    </svg>
  );
}

export function TrendBars({ periods }: { periods: TrendPeriod[] }) {
  const maxValue = Math.max(1, ...periods.map((period) => Math.max(period.income, period.expense, Math.abs(period.income - period.expense))));
  const cols = Math.min(6, periods.length) === periods.length ? periods.length : periods.length;
  const gridCols = periods.length <= 6 ? `grid-cols-${periods.length}` : "grid-cols-6";
  // dynamic grid: use inline style for >6
  const gridStyle = periods.length > 6 ? { gridTemplateColumns: `repeat(${periods.length}, minmax(0, 1fr))` } : undefined;

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-3.5 text-[11px] font-extrabold text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <i className="inline-block size-2.5 rounded-[3px] bg-[linear-gradient(180deg,var(--green),var(--teal))]" /> Pemasukan
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="inline-block size-2.5 rounded-[3px] bg-[linear-gradient(180deg,var(--rose-strong),var(--red))]" /> Pengeluaran
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="inline-block size-2.5 rounded-[3px] bg-[linear-gradient(180deg,var(--amber),var(--orange))]" /> Selisih
        </span>
      </div>

      <div className={`grid items-end gap-2 ${periods.length <= 6 ? gridCols : ""}`} style={gridStyle}>
        {periods.map((period) => {
          const incomeHeight = period.income > 0 ? Math.max(6, Math.round((period.income / maxValue) * 100)) : 2;
          const expenseHeight = period.expense > 0 ? Math.max(6, Math.round((period.expense / maxValue) * 100)) : 2;
          const status = getExpenseIncomeStatus(period.income, period.expense);
          const net = period.income - period.expense;
          const netColor = status.tone === "surplus" ? "bg-[linear-gradient(180deg,var(--teal),var(--green))]" : status.tone === "deficit" ? "bg-[linear-gradient(180deg,var(--red),var(--rose-strong))]" : "bg-[linear-gradient(180deg,var(--amber),var(--orange))]";

          return (
            <div
              key={period.key || `${period.month}-${period.year}-${period.label}`}
              className="grid min-w-0 justify-items-center gap-1"
              title={`${period.fullLabel}: masuk ${formatCompact(period.income)} / keluar ${formatCompact(period.expense)} / ${status.label} (${status.description})`}
            >
              <div className="grid w-full justify-items-center gap-0.5">
                <span className={`text-[9px] font-black ${status.tone === "surplus" ? "text-green" : status.tone === "deficit" ? "text-red" : "text-amber-600"}`}>{net > 0 ? "+" : ""}{formatCompact(net)}</span>
                <span className={`inline-block h-1 w-6 rounded-full ${netColor}`} style={{ opacity: Math.min(1, Math.abs(net) / maxValue + 0.4) }} />
              </div>
              <div
                className={`flex h-[118px] w-full items-end justify-center gap-1 border-b px-0.5 max-[420px]:h-24 ${
                  period.isActive ? "border-rose-strong" : "border-line"
                }`}
              >
                <span
                  className="w-3 min-h-[3px] rounded-t-[6px] rounded-b-[2px] bg-[linear-gradient(180deg,var(--green),var(--teal))] max-[420px]:w-[9px]"
                  style={{ height: `${incomeHeight}%` }}
                />
                <span
                  className="w-3 min-h-[3px] rounded-t-[6px] rounded-b-[2px] bg-[linear-gradient(180deg,var(--rose-strong),var(--red))] max-[420px]:w-[9px]"
                  style={{ height: `${expenseHeight}%` }}
                />
              </div>
              <small className={`text-[10px] font-black leading-tight text-center ${period.isActive ? "text-rose-dark" : "text-muted-foreground"}`}>
                {period.label}
              </small>
              <small className={`text-[8px] font-bold px-1 py-0.5 rounded-full border ${status.tone === "surplus" ? "border-green-border bg-green-bg text-green" : status.tone === "deficit" ? "border-red-border bg-red-bg text-red" : "border-amber-500/20 bg-amber-500/10 text-amber-700"}`}>
                {status.label}
              </small>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export interface BalancePoint {
  label: string;
  fullLabel: string;
  isActive: boolean;
  balance: number;
}

export function BalanceLineChart({ points, compact = false }: { points: BalancePoint[]; compact?: boolean }) {
  if (!points.length) return null;
  const values = points.map((p) => p.balance);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const w = compact ? 320 : 480;
  const h = compact ? 72 : 120;
  const pad = compact ? 10 : 16;
  const stepX = (w - pad * 2) / Math.max(1, points.length - 1);

  const getY = (v: number) => h - pad - ((v - min) / range) * (h - pad * 2);
  const getX = (i: number) => pad + i * stepX;

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${getX(i).toFixed(1)} ${getY(p.balance).toFixed(1)}`)
    .join(" ");
  const areaPath = `${linePath} L ${getX(points.length - 1).toFixed(1)} ${(h - pad).toFixed(1)} L ${getX(0).toFixed(1)} ${(h - pad).toFixed(1)} Z`;

  return (
    <div className="grid gap-2">
      <svg viewBox={`0 0 ${w} ${h}`} className={`w-full ${compact ? "h-[72px]" : "h-[120px]"}`} role="img" aria-label="Tren saldo">
        <defs>
          <linearGradient id="balanceLineGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="var(--rose-strong)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--rose-strong)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#balanceLineGrad)" />
        <path d={linePath} fill="none" stroke="var(--rose-strong)" strokeWidth={compact ? 2 : 2.5} strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <g key={`${p.label}-${i}`}>
            <circle cx={getX(i)} cy={getY(p.balance)} r={p.isActive ? (compact ? 4 : 5) : 3.5} fill={p.isActive ? "var(--rose-strong)" : "var(--panel-solid)"} stroke="var(--rose-strong)" strokeWidth={1.5} />
            {!compact && (
              <text x={getX(i)} y={h - 2} textAnchor="middle" className="fill-muted-foreground text-[9px] font-black">
                {p.label}
              </text>
            )}
          </g>
        ))}
      </svg>
      {!compact && (
        <div className="flex flex-wrap gap-1.5 text-[10px] font-bold text-muted-foreground">
          {points.map((p) => (
            <span
              key={p.label}
              className={`rounded-full border px-2 py-1 ${p.isActive ? "border-rose-border bg-rose-bg text-rose-dark" : "border-line bg-soft"}`}
            >
              {p.label}: {formatCompact(p.balance)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
