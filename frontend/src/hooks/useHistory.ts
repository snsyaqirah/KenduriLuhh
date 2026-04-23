import type { HistorySession, AgentMessage, Mode, Language } from '../types';
import { parseMessages } from '../utils/parseMessages';

const STORAGE_KEY = 'kenduri_history';
const MAX_SESSIONS = 10;

function readHistory(): HistorySession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as HistorySession[]) : [];
  } catch {
    return [];
  }
}

function writeHistory(sessions: HistorySession[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch {
    // Storage full — drop oldest
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions.slice(-5)));
    } catch { /* ignore */ }
  }
}

export function saveSession(params: {
  sessionId: string;
  mode: Mode;
  language: Language;
  request: HistorySession['request'];
  messages: AgentMessage[];
}): void {
  const { sessionId, mode, language, request, messages } = params;
  const parsed = parseMessages(messages, mode, language);

  const entry: HistorySession = {
    id: sessionId,
    savedAt: new Date().toISOString(),
    mode,
    language,
    request,
    result: {
      quotation: parsed.budget?.quotation ?? null,
      totalCost: parsed.budget?.subtotal ?? null,
      isApproved: parsed.budget?.isApproved ?? false,
      menuItems: parsed.menuItems.slice(0, 5),
      wasteReductionPct: parsed.budget?.wasteReductionPct ?? null,
    },
    messages,
  };

  const existing = readHistory().filter((s) => s.id !== sessionId);
  const updated = [...existing, entry].slice(-MAX_SESSIONS);
  writeHistory(updated);
}

export function getSessions(): HistorySession[] {
  return readHistory().slice().reverse(); // newest first
}

export function deleteSession(id: string): void {
  writeHistory(readHistory().filter((s) => s.id !== id));
}

export function clearHistory(): void {
  localStorage.removeItem(STORAGE_KEY);
}
