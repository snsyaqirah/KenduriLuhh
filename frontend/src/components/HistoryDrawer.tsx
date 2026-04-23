import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getSessions, deleteSession, clearHistory } from '../hooks/useHistory';
import type { HistorySession, AgentMessage } from '../types';

interface Props {
  open: boolean;
  onClose: () => void;
  onReplay: (messages: AgentMessage[]) => void;
  language?: 'ms' | 'en';
}

const MODE_LABEL: Record<string, Record<string, string>> = {
  katering: { ms: 'Katering', en: 'Catering' },
  rewang:   { ms: 'Rewang',   en: 'Rewang'   },
};

function fmtDate(iso: string, language: 'ms' | 'en') {
  return new Date(iso).toLocaleDateString(
    language === 'en' ? 'en-MY' : 'ms-MY',
    { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
  );
}

function fmtRm(n: number | null) {
  if (!n) return '—';
  return `RM ${n.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function HistoryDrawer({ open, onClose, onReplay, language = 'ms' }: Props) {
  const [sessions, setSessions] = useState<HistorySession[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (open) setSessions(getSessions());
  }, [open]);

  function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    deleteSession(id);
    setSessions(getSessions());
  }

  function handleClear() {
    clearHistory();
    setSessions([]);
  }

  const t = language === 'en'
    ? {
        title: 'Session History',
        empty: 'No past sessions yet. Complete a plan to see it here.',
        clearAll: 'Clear all',
        replay: 'View conversation',
        approved: '✓ Approved',
        rejected: '✗ Over budget',
        pax: 'pax',
        budget: 'Budget',
        quotation: 'Quotation',
        waste: 'Waste reduction',
        menu: 'Menu',
        close: 'Close',
      }
    : {
        title: 'Sejarah Sesi',
        empty: 'Tiada sesi lepas lagi. Selesaikan satu rancangan untuk melihatnya di sini.',
        clearAll: 'Padam semua',
        replay: 'Lihat perbualan',
        approved: '✓ Lulus',
        rejected: '✗ Over Bajet',
        pax: 'pax',
        budget: 'Bajet',
        quotation: 'Sebut Harga',
        waste: 'Pengurangan Pembaziran',
        menu: 'Menu',
        close: 'Tutup',
      };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.aside
            key="drawer"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="fixed left-0 top-0 z-50 h-full w-80 sm:w-96 bg-white shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100 bg-stone-50">
              <div className="flex items-center gap-2">
                <span className="text-lg">🕐</span>
                <h2 className="font-display text-base font-bold text-stone-800">{t.title}</h2>
                {sessions.length > 0 && (
                  <span className="text-xs bg-emerald-100 text-emerald-700 font-semibold px-2 py-0.5 rounded-full">
                    {sessions.length}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {sessions.length > 0 && (
                  <button
                    onClick={handleClear}
                    className="text-xs text-red-400 hover:text-red-600 transition-colors"
                  >
                    {t.clearAll}
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="w-7 h-7 rounded-lg bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-500 transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Session list */}
            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
              {sessions.length === 0 ? (
                <div className="text-center text-stone-400 text-xs py-12 px-4">
                  <p className="text-3xl mb-3">📭</p>
                  <p>{t.empty}</p>
                </div>
              ) : (
                sessions.map((session) => {
                  const isExpanded = expanded === session.id;
                  const modeLabel = MODE_LABEL[session.mode]?.[language] ?? session.mode;
                  const approved = session.result.isApproved;

                  return (
                    <div
                      key={session.id}
                      className="rounded-xl border border-stone-200 overflow-hidden"
                    >
                      {/* Session summary row */}
                      <button
                        onClick={() => setExpanded(isExpanded ? null : session.id)}
                        className="w-full text-left px-4 py-3 bg-white hover:bg-stone-50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                                session.mode === 'katering'
                                  ? 'bg-purple-100 text-purple-700'
                                  : 'bg-amber-100 text-amber-700'
                              }`}>
                                {modeLabel}
                              </span>
                              <span className={`text-xs font-semibold ${approved ? 'text-emerald-600' : 'text-red-500'}`}>
                                {approved ? t.approved : t.rejected}
                              </span>
                            </div>
                            <p className="text-xs font-semibold text-stone-700 mt-1 truncate">
                              {session.request.event_type} · {session.request.pax} {t.pax} · {session.request.event_location}
                            </p>
                            <p className="text-xs text-stone-400 mt-0.5">
                              {fmtDate(session.savedAt, language)}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1 flex-shrink-0">
                            <span className="text-xs font-bold text-stone-700 tabular-nums">
                              {fmtRm(session.result.quotation ?? session.result.totalCost)}
                            </span>
                            <button
                              onClick={(e) => handleDelete(session.id, e)}
                              className="text-xs text-stone-300 hover:text-red-400 transition-colors"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      </button>

                      {/* Expanded detail */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="px-4 pb-3 pt-2 border-t border-stone-100 bg-stone-50 flex flex-col gap-2">
                              {/* Budget info */}
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                  <span className="text-stone-400">{t.budget}</span>
                                  <p className="font-semibold text-stone-700 tabular-nums">
                                    {fmtRm(session.request.budget_myr)}
                                  </p>
                                </div>
                                <div>
                                  <span className="text-stone-400">{t.quotation}</span>
                                  <p className="font-semibold text-emerald-700 tabular-nums">
                                    {fmtRm(session.result.quotation)}
                                  </p>
                                </div>
                              </div>

                              {/* Menu items */}
                              {session.result.menuItems.length > 0 && (
                                <div className="text-xs">
                                  <span className="text-stone-400">{t.menu}:</span>
                                  <p className="text-stone-600 mt-0.5">
                                    {session.result.menuItems.join(', ')}
                                  </p>
                                </div>
                              )}

                              {/* Waste reduction */}
                              {session.result.wasteReductionPct != null && (
                                <div className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 rounded-lg px-2 py-1.5">
                                  <span>🌿</span>
                                  <span className="font-semibold">
                                    {t.waste}: {session.result.wasteReductionPct.toFixed(1)}%
                                  </span>
                                </div>
                              )}

                              {/* View conversation button */}
                              <button
                                onClick={() => { onReplay(session.messages); onClose(); }}
                                className="w-full text-xs font-semibold py-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-white transition-colors"
                              >
                                💬 {t.replay}
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-stone-100 px-5 py-3 text-center">
              <button
                onClick={onClose}
                className="text-xs text-stone-500 hover:text-stone-700 font-semibold transition-colors"
              >
                {t.close}
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
