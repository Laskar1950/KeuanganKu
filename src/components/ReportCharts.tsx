import { useId } from "react";
import { DONUT_PALETTE } from "@/utils/chartPalette";

export interface DonutRow {
  id: string;
  name: string;
  value: number;
}

export type Granularity = "daily" | "weekly" | "semester" | "yearly" | "monthly" | "6months";

export interface TrendPeriod {
  month: number;
  year: number;
  label: string;
  fullLabel: string;
  isActive: boolean;
  income: number;
  expense: number;
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
  const maxValue = Math.max(1, ...periods.map((p) => Math.max(p.income, p.expense)));
  const isScrollable = periods.length > 7;
  const colWidthClass = isScrollable ? "min-w-[48px] max-w-[56px]" : "flex-1 min-w-0";

  return (
    <div className="grid gap-3">
      {/* Legend */}
      <div className="flex items-center justify-between gap-3 text-[11px] font-extrabold text-muted-foreground">
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-[linear-gradient(180deg,var(--green),var(--teal))]" />
            <span>Pemasukan</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-[linear-gradient(180deg,var(--rose-strong),var(--red))]" />
            <span>Pengeluaran</span>
          </span>
        </div>
        <span className="text-[10px] font-semibold text-muted-foreground/80">
          Maks: {formatCompact(maxValue)}
        </span>
      </div>

      {/* Chart container */}
      <div className={isScrollable ? "overflow-x-auto -mx-2 px-2 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" : "w-full"}>
        <div className={`flex items-end justify-between gap-1.5 sm:gap-2 ${isScrollable ? "w-max min-w-full" : "w-full"}`}>
          {periods.map((period) => {
            const hasData = period.income > 0 || period.expense > 0;
            const incomeHeight = period.income > 0 ? Math.max(8, Math.round((period.income / maxValue) * 100)) : 0;
            const expenseHeight = period.expense > 0 ? Math.max(8, Math.round((period.expense / maxValue) * 100)) : 0;
            const net = period.income - period.expense;

            return (
              <div
                key={period.key || `${period.month}-${period.year}-${period.label}`}
                className={`flex flex-col items-center gap-1.5 ${colWidthClass}`}
                title={`${period.fullLabel}: Masuk ${formatCompact(period.income)} • Keluar ${formatCompact(period.expense)} • Net ${net >= 0 ? "+" : ""}${formatCompact(net)}`}
              >
                {/* Net indicator above bars */}
                <div className="h-4 flex items-center justify-center">
                  {hasData && net !== 0 ? (
                    <span
                      className={`text-[9px] font-black tracking-tight whitespace-nowrap ${
                        net > 0 ? "text-green" : "text-red"
                      }`}
                    >
                      {net > 0 ? "+" : ""}
                      {formatCompact(net)}
                    </span>
                  ) : (
                    <span className="text-[9px] text-transparent select-none">-</span>
                  )}
                </div>

                {/* Bars column */}
                <div
                  className={`relative flex h-[120px] w-full items-end justify-center gap-1 border-b pb-0.5 px-0.5 transition ${
                    period.isActive ? "border-rose-strong border-b-2" : "border-line"
                  }`}
                >
                  {hasData ? (
                    <>
                      <span
                        className="w-3 sm:w-3.5 rounded-t-[5px] bg-[linear-gradient(180deg,var(--green),var(--teal))] transition-all duration-300"
                        style={{ height: `${incomeHeight}%` }}
                      />
                      <span
                        className="w-3 sm:w-3.5 rounded-t-[5px] bg-[linear-gradient(180deg,var(--rose-strong),var(--red))] transition-all duration-300"
                        style={{ height: `${expenseHeight}%` }}
                      />
                    </>
                  ) : (
                    <span className="h-[2px] w-4 rounded-full bg-line" />
                  )}
                </div>

                {/* Month/Day label */}
                <div className="pt-0.5 flex justify-center">
                  <span
                    className={`text-[10.5px] font-bold text-center truncate px-1.5 py-0.5 rounded-full ${
                      period.isActive
                        ? "bg-rose-bg text-rose-dark font-black"
                        : "text-muted-foreground hover:text-ink"
                    }`}
                  >
                    {period.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
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
  const uid = useId();
  if (!points.length) return null;
  const gradId = `balanceLineGrad-${uid}`;
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

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${getX(i).toFixed(1)} ${getY(p.balance).toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L ${getX(points.length - 1).toFixed(1)} ${(h - pad).toFixed(1)} L ${getX(0).toFixed(1)} ${(h - pad).toFixed(1)} Z`;

  return (
    <div className="grid gap-2">
      <svg viewBox={`0 0 ${w} ${h}`} className={`w-full ${compact ? "h-[72px]" : "h-[120px]"}`} role="img" aria-label="Tren saldo">
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="var(--rose-strong)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--rose-strong)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* gridlines */}
        {[0.25, 0.5, 0.75].map((ratio) => {
          const y = pad + (h - pad * 2) * ratio;
          return <line key={ratio} x1={pad} x2={w - pad} y1={y} y2={y} stroke="var(--line)" strokeWidth="0.5" strokeDasharray="2 4" opacity="0.5" />;
        })}
        <path d={areaPath} fill={`url(#${gradId})`} />
        <path d={linePath} fill="none" stroke="var(--rose-strong)" strokeWidth={compact ? 2 : 2.5} strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <g key={`${p.label}-${i}`}>
            <circle cx={getX(i)} cy={getY(p.balance)} r={p.isActive ? (compact ? 4 : 5) : 3.5} fill={p.isActive ? "var(--rose-strong)" : "var(--panel-solid)"} stroke="var(--rose-strong)" strokeWidth={1.5} />
            {!compact && <text x={getX(i)} y={h - 4} textAnchor="middle" className="fill-muted-foreground text-[9px] font-black">{p.label}</text>}
          </g>
        ))}
      </svg>
      {!compact && (
        <div className="flex flex-wrap gap-1.5 text-[10px] font-bold text-muted-foreground">
          {points.map((p) => (
            <span key={p.label} className={`rounded-full border px-2 py-1 whitespace-nowrap ${p.isActive ? "border-rose-border bg-rose-bg text-rose-dark" : "border-line bg-soft"}`}>
              {p.label}: {formatCompact(p.balance)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
