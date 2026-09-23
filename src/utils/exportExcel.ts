import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

type MonthLabel = { value: number; label: string };

function formatCurrencyExcel(value: number): number {
  return Number(value || 0);
}

function toDisplayDate(date: Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function sanitizeSheetName(name: string): string {
  return name.replace(/[\\/*?:\[\]]/g, "_").slice(0, 31);
}

// Palette — calm professional (UI UX Pro Max + Taste)
// Sky blue calm for headers: not red/black. Single accent sky, neutrals for tables, high-contrast ink
const C = {
  sky: "FF0EA5E9",
  skyDark: "FF0284C7",
  skyBg: "FFE0F2FE",
  rose: "FFF43F5E",
  roseBg: "FFFEF2F2",
  roseDark: "FF9F1239",
  slate800: "FF1E293B",
  slate600: "FF475569",
  slate200: "FFE2E8F0",
  slate50: "FFF8FAFC",
  slate100: "FFF1F5F9",
  green: "FF15803D",
  greenBg: "FFDCFCE7",
  red: "FFB42318",
  redBg: "FFFEE4E2",
  amber: "FFB45309",
  amberBg: "FFFEF3C7",
  // legacy aliases
  ink: "FF1E293B",
  muted: "FF475569",
  soft: "FFF8FAFC",
  soft2: "FFFFFFFF",
  line: "FFE2E8F0",
  panel: "FFFFFFFF",
  teal: "FF0EA5E9",
  violet: "FF0EA5E9",
  blue: "FF0EA5E9",
  orange: "FF0EA5E9",
};

function thinBorder(color = C.line): Partial<ExcelJS.Borders> {
  const b: ExcelJS.Border = { style: "thin", color: { argb: color } };
  return { top: b, left: b, bottom: b, right: b };
}

function headerStyle(cell: ExcelJS.Cell, bg: string = C.rose, color: string = "FFFFFFFF") {
  cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: color } };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
  cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  cell.border = thinBorder();
}

function subHeaderStyle(cell: ExcelJS.Cell) {
  cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: C.ink } };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.soft } };
  cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  cell.border = thinBorder();
}

function bodyStyle(cell: ExcelJS.Cell, opts?: { bold?: boolean; numFmt?: string; align?: "left" | "center" | "right"; bg?: string; color?: string }) {
  cell.font = { name: "Calibri", size: 10, color: { argb: opts?.color || C.ink }, bold: !!opts?.bold };
  if (opts?.bg) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: opts.bg } };
  cell.alignment = { vertical: "middle", horizontal: opts?.align || "left", wrapText: true };
  cell.border = thinBorder();
  if (opts?.numFmt) cell.numFmt = opts.numFmt;
}

function isUUID(value?: string | null): boolean {
  return !!value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.trim());
}

function getCreatorDisplay(t: { createdBy?: string | null; createdByProfile?: { name?: string } | null; profile?: { name?: string } | null; creator?: string | null }, payload: ExportReportsPayload): string {
  if (t.createdByProfile?.name) return t.createdByProfile.name;
  if (t.profile?.name) return t.profile.name;
  const byId = payload.memberNameById?.get(t.createdBy || "");
  if (byId) return byId;
  if (t.creator && !isUUID(t.creator)) return t.creator;
  if (t.createdBy && !isUUID(t.createdBy)) return t.createdBy;
  return "—";
}

export interface ExportReportsPayload {
  householdName?: string;
  periodLabel: string; // e.g. "25 Agu 2026 - 24 Sep 2026"
  periodStartKey?: string;
  periodEndKey?: string;
  filterSummary: string; // e.g. "Bulan: September 2026 • Dompet: Semua"
  month: number;
  year: number;
  accountNameById: Map<string, string>;
  budgetNameById: Map<string, string>;
  incomeTotal: number;
  expenseTotal: number;
  netTotal: number;
  allocationTotal: number;
  overBudgetTotal: number;
  periodBudgetsCount: number;
  filteredTransactionsCount: number;
  allocationRows: Array<{
    id: string;
    name: string;
    accountId?: string | null;
    amount: number;
    used: number;
    remaining: number;
    percentageRaw: number;
    percentage: number;
  }>;
  trendPeriods: Array<{ label: string; fullLabel: string; isActive: boolean; income: number; expense: number }>;
  balancePoints: Array<{ label: string; fullLabel: string; isActive: boolean; balance: number }>;
  latestTransactions?: Array<{
    id: string;
    type: string;
    amount: number;
    note?: string | null;
    transactionDate?: string;
    createdAt?: string;
    accountId?: string | null;
    budgetId?: string | null;
    createdBy?: string | null;
  }>;
  filteredTransactions: Array<{
    id: string;
    type: string;
    amount: number;
    note?: string | null;
    transactionDate?: string;
    createdAt?: string;
    accountId?: string | null;
    budgetId?: string | null;
    createdBy?: string | null;
    createdByProfile?: { name?: string; email?: string } | null;
  }>;
  // opsional map nama member untuk fallback UUID -> nama
  memberNameById?: Map<string, string>;
}

const RP_NUMFMT = '_-Rp* #,##0_-;-Rp* #,##0_-;_-Rp* "-"??_-;_-@_-';
const DATE_NUMFMT = 'dd mmm yyyy hh:mm';
const PCT_NUMFMT = '0%';

export async function exportReportsExcel(payload: ExportReportsPayload): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "KeuanganKu";
  wb.created = new Date();
  wb.properties.title = `Laporan Keuangan — ${payload.periodLabel}`;

  // === 01 Ringkasan ===
  const ws1 = wb.addWorksheet(sanitizeSheetName("01 Ringkasan"), {
    properties: { tabColor: { argb: C.sky } },
    pageSetup: { paperSize: 9, orientation: "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 } } as unknown as ExcelJS.PageSetup,
  });
  ws1.columns = [
    { header: "", key: "a", width: 28 },
    { header: "", key: "b", width: 22 },
    { header: "", key: "c", width: 26 },
  ];
  // Cover header merged
  ws1.mergeCells("A1:C1");
  const h1 = ws1.getCell("A1");
  h1.value = "KeuanganKu  —  Laporan Keuangan Keluarga";
  h1.font = { name: "Calibri", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
  h1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.sky } };
  h1.alignment = { vertical: "middle", horizontal: "left" };
  h1.border = thinBorder(C.sky);
  ws1.getRow(1).height = 28;

  ws1.mergeCells("A2:C2");
  const h2 = ws1.getCell("A2");
  h2.value = `${payload.householdName || "Keluarga"}  •  Periode Gajian  ${payload.periodLabel}`;
  h2.font = { name: "Calibri", size: 10, bold: true, color: { argb: C.ink } };
  h2.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.soft } };
  h2.alignment = { vertical: "middle", horizontal: "left" };
  h2.border = thinBorder();
  ws1.getRow(2).height = 18;

  ws1.mergeCells("A3:C3");
  const h3 = ws1.getCell("A3");
  h3.value = `Filter: ${payload.filterSummary}  •  Dicetak: ${toDisplayDate(new Date())}`;
  h3.font = { name: "Calibri", size: 9, italic: true, color: { argb: C.muted } };
  h3.alignment = { vertical: "middle", horizontal: "left" };
  h3.border = thinBorder();
  ws1.getRow(3).height = 15;

  // Summary title
  ws1.mergeCells("A5:C5");
  const t1 = ws1.getCell("A5");
  t1.value = "Ringkasan Periode";
  t1.font = { name: "Calibri", size: 11, bold: true, color: { argb: C.ink } };
  t1.alignment = { vertical: "middle", horizontal: "left" };
  ws1.getRow(5).height = 18;

  // Table header — sky calm
  const hdrRow = ws1.getRow(6);
  hdrRow.height = 20;
  ["Kategori", "Nominal", "Keterangan"].forEach((label, idx) => {
    const cell = hdrRow.getCell(idx + 1);
    headerStyle(cell, C.sky);
    cell.value = label;
  });

  const summaryRows: Array<[string, number, string, string]> = [
    ["Pemasukan", payload.incomeTotal, "Total transaksi masuk", C.greenBg],
    ["Pengeluaran", payload.expenseTotal, "Total transaksi keluar", C.redBg],
    ["Total Alokasi", payload.allocationTotal, `${payload.periodBudgetsCount} alokasi`, C.soft],
    ["Over Budget", payload.overBudgetTotal, payload.overBudgetTotal > 0 ? "Melewati batas" : "Masih aman", payload.overBudgetTotal > 0 ? C.redBg : C.greenBg],
  ];

  summaryRows.forEach(([label, val, note, bg], i) => {
    const r = ws1.getRow(7 + i);
    r.height = 16;
    bodyStyle(r.getCell(1), { bold: true, bg: bg as string, align: "left" });
    r.getCell(1).value = label;
    bodyStyle(r.getCell(2), { bold: true, numFmt: RP_NUMFMT, align: "right", bg: bg as string });
    r.getCell(2).value = formatCurrencyExcel(val as number);
    bodyStyle(r.getCell(3), { bg: bg as string, align: "left", color: C.muted });
    r.getCell(3).value = note as string;
  });

  // Net
  const netRowIdx = 11;
  const netR = ws1.getRow(netRowIdx);
  netR.height = 22;
  bodyStyle(netR.getCell(1), { bold: true, bg: payload.netTotal < 0 ? C.redBg : C.greenBg, color: payload.netTotal < 0 ? C.red : C.green, align: "left" });
  netR.getCell(1).value = "Net Periode (Pemasukan - Pengeluaran)";
  bodyStyle(netR.getCell(2), {
    bold: true,
    numFmt: RP_NUMFMT,
    align: "right",
    bg: payload.netTotal < 0 ? C.redBg : C.greenBg,
    color: payload.netTotal < 0 ? C.red : C.green,
  });
  netR.getCell(2).value = formatCurrencyExcel(payload.netTotal);
  bodyStyle(netR.getCell(3), { bold: true, bg: payload.netTotal < 0 ? C.redBg : C.greenBg, align: "left" });
  netR.getCell(3).value = `${payload.filteredTransactionsCount} transaksi`;

  // Borders for summary table
  for (let rr = 6; rr <= netRowIdx; rr++) {
    for (let cc = 1; cc <= 3; cc++) {
      const c = ws1.getCell(rr, cc);
      if (!c.border) c.border = thinBorder();
    }
  }

  // Additional meta
  ws1.mergeCells(`A${netRowIdx + 2}:C${netRowIdx + 2}`);
  const meta = ws1.getCell(`A${netRowIdx + 2}`);
  meta.value = "Tip: Gunakan filter pada sheet Transaksi untuk audit. Semua nominal dalam Rupiah (Rp).";
  meta.font = { name: "Calibri", size: 9, italic: true, color: { argb: C.muted } };
  meta.alignment = { horizontal: "left" };

  ws1.views = [{ state: "frozen", ySplit: 6, activeCell: "A7" }];

  // === 02 Tren Arus Kas ===
  const ws2 = wb.addWorksheet(sanitizeSheetName("02 Tren Arus Kas"), {
    properties: { tabColor: { argb: C.sky } },
    pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1 } as unknown as ExcelJS.PageSetup,
  });
  ws2.columns = [
    { header: "Periode", key: "periode", width: 22 },
    { header: "Pemasukan", key: "income", width: 20 },
    { header: "Pengeluaran", key: "expense", width: 20 },
    { header: "Net", key: "net", width: 20 },
    { header: "Status", key: "status", width: 16 },
  ];
  ws2.mergeCells("A1:E1");
  const w2h1 = ws2.getCell("A1");
  w2h1.value = `Tren Arus Kas — 6 Periode  •  Aktif: ${payload.trendPeriods.find((p) => p.isActive)?.fullLabel || payload.periodLabel}`;
  w2h1.font = { name: "Calibri", size: 12, bold: true, color: { argb: "FFFFFFFF" } };
  w2h1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.sky } };
  w2h1.alignment = { vertical: "middle", horizontal: "left" };
  ws2.getRow(1).height = 22;
  ws2.mergeCells("A2:E2");
  const w2h2 = ws2.getCell("A2");
  w2h2.value = `${payload.householdName || ""} • ${payload.filterSummary}`;
  w2h2.font = { name: "Calibri", size: 9, color: { argb: C.muted } };
  w2h2.alignment = { horizontal: "left" };
  ws2.getRow(2).height = 14;

  const w2hdr = ws2.getRow(4);
  w2hdr.height = 18;
  ["Periode", "Pemasukan", "Pengeluaran", "Net (Inc-Exp)", "Status"].forEach((label, i) => {
    const c = w2hdr.getCell(i + 1);
    headerStyle(c, C.sky);
    c.value = label;
  });

  payload.trendPeriods.forEach((p, idx) => {
    const r = ws2.getRow(5 + idx);
    r.height = 16;
    const net = p.income - p.expense;
    const isActive = p.isActive;
    const bg = isActive ? C.roseBg : idx % 2 === 0 ? C.panel : C.soft2;
    bodyStyle(r.getCell(1), { bg, bold: isActive, align: "left" });
    r.getCell(1).value = p.fullLabel;
    bodyStyle(r.getCell(2), { bg, numFmt: RP_NUMFMT, align: "right", color: C.green });
    r.getCell(2).value = formatCurrencyExcel(p.income);
    bodyStyle(r.getCell(3), { bg, numFmt: RP_NUMFMT, align: "right", color: C.red });
    r.getCell(3).value = formatCurrencyExcel(p.expense);
    bodyStyle(r.getCell(4), { bg, numFmt: RP_NUMFMT, align: "right", bold: true, color: net < 0 ? C.red : C.green });
    r.getCell(4).value = formatCurrencyExcel(net);
    bodyStyle(r.getCell(5), { bg, align: "center", color: isActive ? C.roseDark : C.muted, bold: isActive });
    r.getCell(5).value = isActive ? "● Aktif" : "—";
  });

  // Total row
  const w2Tot = ws2.getRow(5 + payload.trendPeriods.length);
  w2Tot.height = 18;
  const sumInc = payload.trendPeriods.reduce((s, p) => s + p.income, 0);
  const sumExp = payload.trendPeriods.reduce((s, p) => s + p.expense, 0);
  const sumNet = sumInc - sumExp;
  bodyStyle(w2Tot.getCell(1), { bg: C.soft, bold: true, align: "right" });
  w2Tot.getCell(1).value = "Total 6 Periode";
  bodyStyle(w2Tot.getCell(2), { bg: C.soft, bold: true, numFmt: RP_NUMFMT, align: "right", color: C.green });
  w2Tot.getCell(2).value = formatCurrencyExcel(sumInc);
  bodyStyle(w2Tot.getCell(3), { bg: C.soft, bold: true, numFmt: RP_NUMFMT, align: "right", color: C.red });
  w2Tot.getCell(3).value = formatCurrencyExcel(sumExp);
  bodyStyle(w2Tot.getCell(4), { bg: C.soft, bold: true, numFmt: RP_NUMFMT, align: "right", color: sumNet < 0 ? C.red : C.green });
  w2Tot.getCell(4).value = formatCurrencyExcel(sumNet);
  bodyStyle(w2Tot.getCell(5), { bg: C.soft, align: "center" });
  w2Tot.getCell(5).value = "";

  ws2.autoFilter = { from: "A4", to: "E4" };
  ws2.views = [{ state: "frozen", ySplit: 4, activeCell: "A5" }];

  // === 03 Tren Saldo ===
  const ws3 = wb.addWorksheet(sanitizeSheetName("03 Tren Saldo"), {
    properties: { tabColor: { argb: C.sky } },
    pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true } as unknown as ExcelJS.PageSetup,
  });
  ws3.columns = [
    { header: "Periode", key: "periode", width: 22 },
    { header: "Saldo Kumulatif", key: "balance", width: 22 },
    { header: "Delta vs Periode Sebelum", key: "delta", width: 22 },
    { header: "Keterangan", key: "ket", width: 26 },
  ];
  ws3.mergeCells("A1:D1");
  const w3h1 = ws3.getCell("A1");
  w3h1.value = "Tren Saldo (Real-time) — Kumulatif Income minus Expense";
  w3h1.font = { name: "Calibri", size: 12, bold: true, color: { argb: "FFFFFFFF" } };
  w3h1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.sky } };
  w3h1.alignment = { vertical: "middle", horizontal: "left" };
  ws3.getRow(1).height = 22;
  ws3.mergeCells("A2:D2");
  const w3h2 = ws3.getCell("A2");
  w3h2.value = `Akumulasi 6 periode • Nilai terendah: Rp ${Math.min(...payload.balancePoints.map((p) => p.balance), 0).toLocaleString("id-ID")} • Tertinggi: Rp ${Math.max(...payload.balancePoints.map((p) => p.balance), 0).toLocaleString("id-ID")}`;
  w3h2.font = { name: "Calibri", size: 9, color: { argb: C.muted } };
  ws3.getRow(2).height = 14;

  const w3hdr = ws3.getRow(4);
  w3hdr.height = 18;
  ["Periode", "Saldo Kumulatif", "Delta (Inc-Exp)", "Keterangan"].forEach((label, i) => {
    const c = w3hdr.getCell(i + 1);
    headerStyle(c, C.sky);
    c.value = label;
  });

  payload.balancePoints.forEach((p, idx) => {
    const r = ws3.getRow(5 + idx);
    r.height = 16;
    const bg = p.isActive ? C.roseBg : idx % 2 === 0 ? C.panel : C.soft2;
    const delta = idx === 0 ? p.balance : p.balance - payload.balancePoints[idx - 1].balance;
    bodyStyle(r.getCell(1), { bg, bold: p.isActive, align: "left" });
    r.getCell(1).value = p.fullLabel + (p.isActive ? "  ● Aktif" : "");
    bodyStyle(r.getCell(2), { bg, numFmt: RP_NUMFMT, align: "right", bold: true, color: p.balance < 0 ? C.red : C.green });
    r.getCell(2).value = formatCurrencyExcel(p.balance);
    bodyStyle(r.getCell(3), { bg, numFmt: RP_NUMFMT, align: "right", color: delta < 0 ? C.red : C.green });
    r.getCell(3).value = formatCurrencyExcel(delta);
    bodyStyle(r.getCell(4), { bg, align: "left", color: C.muted });
    r.getCell(4).value = p.isActive ? "Periode aktif di filter" : delta >= 0 ? "Naik" : "Turun";
  });

  ws3.autoFilter = { from: "A4", to: "D4" };
  ws3.views = [{ state: "frozen", ySplit: 4, activeCell: "A5" }];

  // === 04 Penggunaan Alokasi ===
  const ws4 = wb.addWorksheet(sanitizeSheetName("04 Penggunaan Alokasi"), {
    properties: { tabColor: { argb: C.sky } },
    pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true } as unknown as ExcelJS.PageSetup,
  });
  ws4.columns = [
    { header: "Alokasi", key: "alokasi", width: 26 },
    { header: "Dompet", key: "dompet", width: 18 },
    { header: "Anggaran", key: "anggaran", width: 18 },
    { header: "Terpakai", key: "terpakai", width: 18 },
    { header: "Sisa / Over", key: "sisa", width: 18 },
    { header: "% Terpakai", key: "pct", width: 14 },
    { header: "Status", key: "status", width: 14 },
  ];
  ws4.mergeCells("A1:G1");
  const w4h1 = ws4.getCell("A1");
  w4h1.value = `Penggunaan Alokasi — ${payload.periodLabel}  •  ${payload.periodBudgetsCount} alokasi`;
  w4h1.font = { name: "Calibri", size: 12, bold: true, color: { argb: "FFFFFFFF" } };
  w4h1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.sky } };
  w4h1.alignment = { vertical: "middle", horizontal: "left" };
  ws4.getRow(1).height = 22;
  ws4.mergeCells("A2:G2");
  const w4h2 = ws4.getCell("A2");
  w4h2.value = `Over budget total: Rp ${payload.overBudgetTotal.toLocaleString("id-ID")} • ${payload.allocationRows.filter((r) => r.remaining < 0).length} alokasi over`;
  w4h2.font = { name: "Calibri", size: 9, color: { argb: C.muted } };
  ws4.getRow(2).height = 14;

  const w4hdr = ws4.getRow(4);
  w4hdr.height = 19;
  ["Alokasi", "Dompet", "Anggaran", "Terpakai", "Sisa / Over", "% Terpakai", "Status"].forEach((label, i) => {
    const c = w4hdr.getCell(i + 1);
    headerStyle(c, C.sky);
    c.value = label;
  });

  if (payload.allocationRows.length) {
    payload.allocationRows.forEach((row, idx) => {
      const r = ws4.getRow(5 + idx);
      r.height = 15;
      const isOver = row.remaining < 0;
      const bg = isOver ? C.redBg : idx % 2 === 0 ? C.panel : C.soft2;
      bodyStyle(r.getCell(1), { bg, bold: true, align: "left" });
      r.getCell(1).value = row.name;
      const dompetName = payload.accountNameById.get(row.accountId || "") || "Tanpa dompet";
      bodyStyle(r.getCell(2), { bg, align: "left", color: C.muted });
      r.getCell(2).value = dompetName;
      bodyStyle(r.getCell(3), { bg, numFmt: RP_NUMFMT, align: "right" });
      r.getCell(3).value = formatCurrencyExcel(row.amount);
      bodyStyle(r.getCell(4), { bg, numFmt: RP_NUMFMT, align: "right" });
      r.getCell(4).value = formatCurrencyExcel(row.used);
      bodyStyle(r.getCell(5), { bg, numFmt: RP_NUMFMT, align: "right", bold: true, color: isOver ? C.red : C.green });
      r.getCell(5).value = formatCurrencyExcel(Math.abs(row.remaining));
      r.getCell(5).value = isOver ? -Math.abs(row.remaining) : row.remaining;
      // Excel will show negative with red via numFmt, but we set color
      bodyStyle(r.getCell(6), { bg, numFmt: PCT_NUMFMT, align: "center", bold: true, color: row.percentageRaw >= 100 ? C.red : row.percentageRaw >= 75 ? C.amber : C.green });
      r.getCell(6).value = row.percentageRaw / 100;
      bodyStyle(r.getCell(7), { bg, align: "center", bold: true, color: isOver ? C.red : C.green });
      r.getCell(7).value = isOver ? "OVER" : row.percentageRaw >= 75 ? "HATI-HATI" : "AMAN";
    });

    // Total row
    const totIdx = 5 + payload.allocationRows.length;
    const tr = ws4.getRow(totIdx);
    tr.height = 18;
    const sumAng = payload.allocationRows.reduce((s, r) => s + r.amount, 0);
    const sumUsed = payload.allocationRows.reduce((s, r) => s + r.used, 0);
    const sumRem = sumAng - sumUsed;
    bodyStyle(tr.getCell(1), { bg: C.soft, bold: true, align: "right" });
    tr.getCell(1).value = "TOTAL";
    bodyStyle(tr.getCell(2), { bg: C.soft, align: "left" });
    tr.getCell(2).value = "";
    bodyStyle(tr.getCell(3), { bg: C.soft, bold: true, numFmt: RP_NUMFMT, align: "right" });
    tr.getCell(3).value = formatCurrencyExcel(sumAng);
    bodyStyle(tr.getCell(4), { bg: C.soft, bold: true, numFmt: RP_NUMFMT, align: "right" });
    tr.getCell(4).value = formatCurrencyExcel(sumUsed);
    bodyStyle(tr.getCell(5), { bg: C.soft, bold: true, numFmt: RP_NUMFMT, align: "right", color: sumRem < 0 ? C.red : C.green });
    tr.getCell(5).value = formatCurrencyExcel(sumRem);
    bodyStyle(tr.getCell(6), { bg: C.soft, bold: true, numFmt: PCT_NUMFMT, align: "center" });
    tr.getCell(6).value = sumAng > 0 ? sumUsed / sumAng : 0;
    bodyStyle(tr.getCell(7), { bg: C.soft, bold: true, align: "center" });
    tr.getCell(7).value = sumRem < 0 ? "OVER" : "AMAN";

    ws4.autoFilter = { from: "A4", to: "G4" };
    ws4.views = [{ state: "frozen", ySplit: 4, activeCell: "A5" }];
  } else {
    ws4.mergeCells("A5:G5");
    const empty = ws4.getCell("A5");
    empty.value = "Belum ada alokasi pada periode ini.";
    empty.font = { name: "Calibri", size: 10, italic: true, color: { argb: C.muted } };
    empty.alignment = { horizontal: "center" };
    ws4.getRow(5).height = 20;
  }

  // === 05 Transaksi Periode Ini ===
  const ws5 = wb.addWorksheet(sanitizeSheetName("05 Transaksi"), {
    properties: { tabColor: { argb: C.sky } },
    pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true } as unknown as ExcelJS.PageSetup,
  });
  ws5.columns = [
    { header: "No", key: "no", width: 6 },
    { header: "Tanggal", key: "tgl", width: 20 },
    { header: "Tipe", key: "tipe", width: 12 },
    { header: "Catatan", key: "catatan", width: 32 },
    { header: "Dompet", key: "dompet", width: 18 },
    { header: "Alokasi", key: "alokasi", width: 20 },
    { header: "Nominal", key: "nominal", width: 18 },
    { header: "Dibuat Oleh", key: "creator", width: 18 },
  ];
  ws5.mergeCells("A1:H1");
  const w5h1 = ws5.getCell("A1");
  w5h1.value = `Transaksi Periode Gajian — ${payload.periodLabel}  •  ${payload.filteredTransactions.length} transaksi`;
  w5h1.font = { name: "Calibri", size: 12, bold: true, color: { argb: "FFFFFFFF" } };
  w5h1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.sky } };
  w5h1.alignment = { vertical: "middle", horizontal: "left" };
  ws5.getRow(1).height = 22;
  ws5.mergeCells("A2:H2");
  const w5h2 = ws5.getCell("A2");
  w5h2.value = `${payload.householdName || ""} • ${payload.filterSummary} • Net: Rp ${payload.netTotal.toLocaleString("id-ID")}`;
  w5h2.font = { name: "Calibri", size: 9, color: { argb: C.muted } };
  ws5.getRow(2).height = 14;

  const w5hdr = ws5.getRow(4);
  w5hdr.height = 19;
  ["No", "Tanggal", "Tipe", "Catatan", "Dompet", "Alokasi", "Nominal", "Dibuat Oleh"].forEach((label, i) => {
    const c = w5hdr.getCell(i + 1);
    headerStyle(c, C.sky);
    c.value = label;
  });

  if (payload.filteredTransactions.length) {
    // sort newest first already in payload? ensure sort by date desc
    const sorted = [...payload.filteredTransactions].sort((a, b) => new Date(b.transactionDate || b.createdAt || "").getTime() - new Date(a.transactionDate || a.createdAt || "").getTime());
    sorted.forEach((t, idx) => {
      const r = ws5.getRow(5 + idx);
      r.height = 15;
      const isIncome = t.type === "income";
      const bg = idx % 2 === 0 ? C.panel : C.soft2;
      bodyStyle(r.getCell(1), { bg, align: "center" });
      r.getCell(1).value = idx + 1;
      bodyStyle(r.getCell(2), { bg, align: "left", numFmt: DATE_NUMFMT });
      const d = new Date(t.transactionDate || t.createdAt || "");
      r.getCell(2).value = Number.isNaN(d.getTime()) ? (t.transactionDate || "") : d;
      bodyStyle(r.getCell(3), { bg, align: "center", bold: true, color: isIncome ? C.green : C.red, bg: isIncome ? C.greenBg : C.redBg });
      r.getCell(3).value = isIncome ? "PEMASUKAN" : "PENGELUARAN";
      bodyStyle(r.getCell(4), { bg, align: "left" });
      r.getCell(4).value = t.note || (isIncome ? "Pemasukan" : "Pengeluaran");
      bodyStyle(r.getCell(5), { bg, align: "left", color: C.muted });
      r.getCell(5).value = payload.accountNameById.get(t.accountId || "") || "Tanpa dompet";
      bodyStyle(r.getCell(6), { bg, align: "left", color: C.muted });
      r.getCell(6).value = payload.budgetNameById.get(t.budgetId || "") || (isIncome ? "—" : "Tanpa Alokasi");
      bodyStyle(r.getCell(7), { bg, numFmt: RP_NUMFMT, align: "right", bold: true, color: isIncome ? C.green : C.red });
      r.getCell(7).value = formatCurrencyExcel(t.amount) * (isIncome ? 1 : -1);
      // Excel will handle sign, color via font
      bodyStyle(r.getCell(8), { bg, align: "left", color: C.muted });
      r.getCell(8).value = getCreatorDisplay(t as never, payload);
    });

    const totR = ws5.getRow(5 + sorted.length);
    totR.height = 18;
    bodyStyle(totR.getCell(1), { bg: C.soft, align: "right", bold: true });
    totR.getCell(1).value = "";
    ws5.mergeCells(`A${5 + sorted.length}:F${5 + sorted.length}`);
    bodyStyle(totR.getCell(1), { bg: C.soft, bold: true, align: "right" });
    totR.getCell(1).value = "TOTAL NET PERIODE";
    bodyStyle(totR.getCell(7), { bg: C.soft, bold: true, numFmt: RP_NUMFMT, align: "right", color: payload.netTotal < 0 ? C.red : C.green });
    totR.getCell(7).value = formatCurrencyExcel(payload.netTotal);
    bodyStyle(totR.getCell(8), { bg: C.soft });

    ws5.autoFilter = { from: "A4", to: "H4" };
    ws5.views = [{ state: "frozen", ySplit: 4, activeCell: "A5" }];
  } else {
    ws5.mergeCells("A5:H5");
    const empty = ws5.getCell("A5");
    empty.value = "Belum ada transaksi pada periode ini — silakan tambah transaksi atau ubah filter.";
    empty.font = { name: "Calibri", size: 10, italic: true, color: { argb: C.muted } };
    empty.alignment = { horizontal: "center" };
    ws5.getRow(5).height = 20;
  }

  // Print & page setup for all
  [ws1, ws2, ws3, ws4, ws5].forEach((ws) => {
    ws.properties.defaultRowHeight = 15;
    ws.pageSetup.printTitleRow = "1:4";
    ws.headerFooter.oddHeader = `&L&9 ${payload.householdName || "KeuanganKu"} &C&9 Laporan ${payload.periodLabel} &R&9 ${toDisplayDate(new Date())}`;
    ws.headerFooter.oddFooter = "&L&8 KeuanganKu &C&8 Halaman &P dari &N &R&8 &9 Confidential";
  });

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const safeHousehold = (payload.householdName || "Keluarga").replace(/[^a-zA-Z0-9-_ ]/g, "").trim().replace(/\s+/g, "_") || "Keluarga";
  const safePeriod = payload.periodLabel.replace(/[^\w\- ]/g, "").trim().replace(/\s+/g, "_") || `${payload.month}-${payload.year}`;
  const fileName = `KeuanganKu_${safeHousehold}_${safePeriod}.xlsx`;
  saveAs(blob, fileName);
}
