export type ParsedMBanking = {
  amount: number | null;
  type: "income" | "expense" | null;
  bank?: string;
  raw: string;
  note?: string;
  confidence: "high" | "medium" | "low";
  hint?: string;
};

const BANK_KEYWORDS: Record<string, RegExp> = {
  BCA: /bca|bank central asia/i,
  MANDIRI: /mandiri|livin/i,
  BRI: /bri|brimo/i,
  BNI: /bni/i,
  BSI: /bsi|bank syariah/i,
  JAGO: /jago/i,
  SEABANK: /seabank|sea bank/i,
  OVO: /ovo/i,
  GOPAY: /gopay|gojek/i,
  DANA: /dana/i,
  LINKAJA: /linkaja/i,
  BLU: /blu|bca digital/i,
};

function detectBank(text: string): string | undefined {
  for (const [bank, re] of Object.entries(BANK_KEYWORDS)) {
    if (re.test(text)) return bank;
  }
  return undefined;
}

function extractAmount(text: string): number | null {
  // Try multiple patterns: Rp 50.000, Rp50,000, Rp 1.250.000, IDR 50000, Rp. 50.000, etc.
  // Prioritize Rp ... patterns
  const patterns = [
    /Rp\.?\s*([\d\.,]+)/i, // Rp 50.000 or Rp. 50,000
    /IDR\s*([\d\.,]+)/i,
    /nominal\s*[:\-]?\s*Rp?\.?\s*([\d\.,]+)/i,
    /amount\s*[:\-]?\s*Rp?\.?\s*([\d\.,]+)/i,
  ];

  for (const pat of patterns) {
    const m = text.match(pat);
    if (m && m[1]) {
      // Normalize: Indonesian format uses . as thousand, , as decimal. Remove dots, replace comma with dot then parse
      let raw = m[1].trim();
      // If contains both . and , assume . is thousand and , is decimal
      if (raw.includes(".") && raw.includes(",")) {
        raw = raw.replace(/\./g, "").replace(/,/g, ".");
      } else if (raw.includes(",")) {
        // Could be 50,000 vs 50,00 — if 3 digits after comma, treat as thousand separator
        const parts = raw.split(",");
        if (parts[parts.length - 1].length === 3 && parts.length > 1) {
          raw = raw.replace(/,/g, "");
        } else {
          raw = raw.replace(/,/g, ".");
        }
      } else if (raw.includes(".")) {
        const parts = raw.split(".");
        const last = parts[parts.length - 1];
        if (last.length === 3 && parts.length > 1) {
          // likely thousand separator: 50.000 -> 50000
          raw = raw.replace(/\./g, "");
        }
        // else keep dot as decimal? but Indonesian rarely uses dot decimal, keep as is
      }
      const num = Number(raw.replace(/[^\d.-]/g, ""));
      if (!Number.isNaN(num) && num > 0) return Math.round(num);
    }
  }

  // Fallback: find any number that looks like amount with at least 4 digits
  const fallback = text.match(/(\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{2})?)/);
  if (fallback) {
    return extractAmount(`Rp ${fallback[1]}`);
  }

  return null;
}

function detectType(text: string, amount: number | null): "income" | "expense" | null {
  const lower = text.toLowerCase();
  // Strong keywords
  if (/(kredit|cr|masuk|diterima|top up|transfer masuk|pemasuk|incom|terima)/.test(lower)) return "income";
  if (/(debit|db|keluar|dibayar|pembayaran|terdebit|potongan|belanja|purchase|qris|tarik|transfer keluar|expense|keluar)/.test(lower)) return "expense";
  // BCA specific: DB = debit (out), CR = credit (in)
  if (/\bDB\b/.test(text)) return "expense";
  if (/\bCR\b/.test(text)) return "income";
  if (/\bTRF\s+CR\b|\bCR\s+TRF\b/.test(text)) return "income";
  if (/\bTRF\s+DB\b/.test(text)) return "expense";
  // Amount sign
  if (amount != null && amount < 0) return "expense";
  return null;
}

export function parseMBankingText(raw: string): ParsedMBanking {
  const text = String(raw || "").trim();
  if (!text) return { amount: null, type: null, raw, confidence: "low", hint: "Teks kosong" };

  const amount = extractAmount(text);
  const bank = detectBank(text);
  const type = detectType(text, amount);

  let confidence: "high" | "medium" | "low" = "low";
  if (amount != null && type != null && bank) confidence = "high";
  else if (amount != null && (type != null || bank)) confidence = "medium";
  else if (amount != null) confidence = "medium";

  let note = "";
  // Generate suggested note from first meaningful line
  const lines = text.split(/[\n\r]+/).map((s) => s.trim()).filter(Boolean);
  if (lines.length) {
    // Take up to 80 chars from first line that contains bank or amount or is shortest description
    const candidate = lines.find((l) => /bca|mandiri|bri|qris|transfer|ovo|gopay|dana/i.test(l)) || lines[0];
    note = candidate.slice(0, 90);
    if (bank) note = `[${bank}] ${note}`;
  }

  let hint: string | undefined;
  if (amount == null) hint = "Nominal Rp tidak terdeteksi. Pastikan teks mengandung Rp 50.000.";
  else if (type == null) hint = "Jenis (masuk/keluar) tidak jelas. Silakan pilih manual Pemasukan/Pengeluaran.";

  return { amount, type, bank, raw: text, note, confidence, hint };
}

export function formatParsedForForm(parsed: ParsedMBanking) {
  return {
    amount: parsed.amount != null ? String(parsed.amount) : "",
    type: parsed.type || "expense",
    note: parsed.note || "",
    bank: parsed.bank || "",
  };
}
