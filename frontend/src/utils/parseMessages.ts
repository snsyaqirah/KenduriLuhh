import type { AgentMessage } from '../types';

export interface BudgetData {
  rawMaterial: number;
  overhead: number;
  labour: number;
  transport: number;
  subtotal: number;
  marginPct: number | null;
  marginRm: number | null;
  quotation: number | null;
  perHead: number | null;
  isApproved: boolean;
}

export interface LogisticsEvent {
  key: string;   // "T-3", "T-2", "T-1", "T-0"
  label: string;
  tasks: string;
  date?: string;
}

export interface ParsedOutput {
  budget: BudgetData | null;
  logistics: LogisticsEvent[];
  menuItems: string[];
  finalSummary: string | null;
  totalPax: number | null;
  isHalal: boolean;
  mode: 'katering' | 'rewang';
  shoppingLines: string[];
}

/** Remove markdown syntax so regex works on plain text */
export function stripMd(text: string): string {
  return text
    .replace(/\*{1,3}([^*\n]+)\*{1,3}/g, '$1')
    .replace(/#{1,6}\s*/g, '')
    .replace(/`[^`\n]+`/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[-*_]{3,}/g, '')
    .trim();
}

function parseRm(s: string): number | null {
  const m = s.match(/RM\s?([\d,]+(?:\.\d{1,2})?)/i);
  if (!m) return null;
  return parseFloat(m[1].replace(/,/g, ''));
}

function parseFirstRm(text: string): number | null {
  return parseRm(text) ?? null;
}

export function parseMessages(messages: AgentMessage[], mode: 'katering' | 'rewang', language: 'ms' | 'en' = 'ms'): ParsedOutput {
  const bendahari = messages.find((m) => m.agent === 'Bendahari');
  const abangLorry = messages.find((m) => m.agent === 'Abang_Lorry');
  const makTokMsgs = messages.filter((m) => m.agent === 'Mak_Tok');
  const lastMakTok = makTokMsgs[makTokMsgs.length - 1];
  const tokPenghuluFinal = [...messages]
    .reverse()
    .find((m) => m.agent === 'Tok_Penghulu' && m.content.includes('SELESAI'));

  const allPlain = messages.map((m) => stripMd(m.content)).join('\n');

  // ── Budget ───────────────────────────────────────────────────────────────
  let budget: BudgetData | null = null;
  if (bendahari) {
    const b = stripMd(bendahari.content);
    const lines = b.split('\n');

    const findRm = (pattern: RegExp) => {
      const line = lines.find((l) => pattern.test(l));
      return line ? parseFirstRm(line) : null;
    };

    const rawMaterial = findRm(/bahan mentah|raw material|ingredient/i) ?? 0;
    const overhead    = findRm(/overhead/i) ?? 0;
    const labour      = findRm(/tenaga kerja|labour|labor|staff/i) ?? 0;
    const transport   = findRm(/pengangkutan|transport/i) ?? 0;
    const subtotal    = findRm(/jumlah kos|total cost|subtotal/i) ?? (rawMaterial + overhead + labour + transport);
    const marginPct   = (() => {
      const l = lines.find((ln) => /margin/i.test(ln));
      if (!l) return null;
      const m = l.match(/(\d+(?:\.\d+)?)\s*%/);
      return m ? parseFloat(m[1]) : null;
    })();
    const marginRm    = findRm(/margin/i);
    const quotation   = findRm(/sebut harga|quotation|harga jualan/i);
    const perHead     = (() => {
      const l = lines.find((ln) => /per kepala|per head|per pax/i.test(ln));
      if (!l) return null;
      return parseFirstRm(l);
    })();
    const isRejected  = /\bGAGAL\b|\bFAILED\b|OVER BAJET|OVER BUDGET/i.test(b);
    const isApproved  = !isRejected && /\bLULUS\b|\bAPPROVED\b|within budget/i.test(b);

    budget = { rawMaterial, overhead, labour, transport, subtotal, marginPct, marginRm, quotation, perHead, isApproved };
  }

  // ── Logistics ─────────────────────────────────────────────────────────────
  const logistics: LogisticsEvent[] = [];
  if (abangLorry) {
    const plain = stripMd(abangLorry.content);
    const blocks = plain.split(/\n(?=T-\d+|Hari Majlis|Event Day|T-0)/i);

    const labelMap: Record<string, string> = language === 'en'
      ? { 'T-3': '3 Days Before', 'T-2': '2 Days Before', 'T-1': '1 Day Before', 'T-0': 'Event Day' }
      : { 'T-3': '3 Hari Sebelum', 'T-2': '2 Hari Sebelum', 'T-1': '1 Hari Sebelum', 'T-0': 'Hari Majlis' };

    for (const block of blocks) {
      const keyMatch = block.match(/^(T-\d+|Hari Majlis|Event Day)/i);
      if (!keyMatch) continue;
      const rawKey = keyMatch[1];
      const key = rawKey.toUpperCase().startsWith('T-') ? rawKey.toUpperCase() : 'T-0';
      const label = labelMap[key] ?? rawKey;
      // Date: look for "(dd Month yyyy)" or "dd/mm"
      const dateMatch = block.match(/\(([^)]+(?:202[0-9]|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[^)]*)\)/i);
      const date = dateMatch ? dateMatch[1] : undefined;
      // Tasks: everything after the first colon/dash on subsequent lines
      const tasks = block
        .split('\n')
        .slice(1)
        .filter((l) => l.trim().length > 3)
        .map((l) => l.replace(/^[-•*\d.]+\s*/, '').trim())
        .filter(Boolean)
        .join('\n');

      logistics.push({ key, label, tasks, date });
    }

    // Fallback: if no T-X blocks found, split on key phrases
    if (logistics.length === 0) {
      const tLines = plain.match(/T-\d.+/g) ?? [];
      tLines.forEach((line) => {
        const km = line.match(/T-(\d+)/);
        if (!km) return;
        const key = `T-${km[1]}`;
        logistics.push({ key, label: labelMap[key] ?? key, tasks: line.replace(/T-\d+[:\s]*/i, '').trim() });
      });
    }
  }

  // ── Menu items ────────────────────────────────────────────────────────────
  let menuItems: string[] = [];

  // Prefer Tok Penghulu's "menu muktamad / final menu" line
  if (tokPenghuluFinal) {
    const plain = stripMd(tokPenghuluFinal.content);
    const menuLine = plain.match(/menu\s+(?:muktamad|final|akhir)[:\s]+([^\n.]+)/i);
    if (menuLine) {
      menuItems = menuLine[1]
        .split(/,|;|\+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 2)
        .slice(0, 8);
    }
  }

  // Fallback: numbered list from last Mak Tok message
  if (menuItems.length === 0 && lastMakTok) {
    const plain = stripMd(lastMakTok.content);
    menuItems = (plain.match(/^\d+\.\s+(.+)$/gm) ?? [])
      .map((s) => s.replace(/^\d+\.\s+/, '').split(/[:(]/)[0].trim())
      .filter((s) => s.length > 2 && s.length < 60)
      .slice(0, 8);
  }

  // ── Shopping list (Rewang) ────────────────────────────────────────────────
  const tokeyPasar = messages.find((m) => m.agent === 'Tokey_Pasar');
  const shoppingSource = tokeyPasar ?? lastMakTok;
  let shoppingLines: string[] = [];
  if (shoppingSource) {
    const plain = stripMd(shoppingSource.content);
    shoppingLines = plain
      .split('\n')
      .filter((l) => /\d/.test(l) && /kg|g\b|liter|botol|biji|gantang|cupan|papan|ekor|ikat|beg|keping/i.test(l))
      .map((l) => l.replace(/^[-•*\d.]+\s*/, '').trim())
      .filter((l) => l.length > 4)
      .slice(0, 20);
  }

  // ── Final summary ─────────────────────────────────────────────────────────
  const finalSummary = tokPenghuluFinal
    ? stripMd(tokPenghuluFinal.content).replace(/SELESAI/gi, '').trim()
    : null;

  // ── Pax ──────────────────────────────────────────────────────────────────
  const paxMatch = allPlain.match(/(\d{1,5})\s*(pax|orang|tetamu|guests?)/i);
  const totalPax = paxMatch ? parseInt(paxMatch[1]) : null;

  // ── Halal ─────────────────────────────────────────────────────────────────
  const isHalal =
    /halal/i.test(allPlain) &&
    !/tidak halal|non[- ]halal/i.test(allPlain);

  return { budget, logistics, menuItems, finalSummary, totalPax, isHalal, mode, shoppingLines };
}
