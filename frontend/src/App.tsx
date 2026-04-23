import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatInput } from './components/ChatInput';
import { AgentChatFeed } from './components/AgentChatFeed';
import { AgentStatusBar } from './components/AgentStatusBar';
import { OutputPanel } from './components/outputs/OutputPanel';
import { HistoryDrawer } from './components/HistoryDrawer';
import { useAgentChat } from './hooks/useAgentChat';
import { stripMd } from './utils/parseMessages';

export default function App() {
  const { messages, status, typingAgent, error, doneAgents, mode, language, retryAttempt, originalRequest, startChat, stopChat, replaySession } = useAgentChat();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [panelCollapsed, setPanelCollapsed] = useState(false);

  const isActive = status === 'loading' || status === 'running' || status === 'reconnecting';
  const showFeed = messages.length > 0 || isActive;

  const t = language === 'en'
    ? {
        reconnecting: `Reconnecting… (${retryAttempt}/3)`,
        negotiating: 'Agents negotiating…',
        done: '✅ Done',
        startOver: 'Start Over',
        loading: 'Connecting to agents…',
        reconnectBanner: `Connection dropped. Reconnecting… (attempt ${retryAttempt} of 3)`,
        logTitle: 'Discussion Log',
        messages: 'messages',
      }
    : {
        reconnecting: `Menyambung semula… (${retryAttempt}/3)`,
        negotiating: 'Ejen sedang berunding…',
        done: '✅ Selesai',
        startOver: 'Mula Semula',
        loading: 'Menghubungi ejen-ejen…',
        reconnectBanner: `Sambungan terputus. Menyambung semula… (percubaan ${retryAttempt} daripada 3)`,
        logTitle: 'Log Perbincangan',
        messages: 'mesej',
      };

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">

      {/* ── Header ── */}
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-stone-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🍛</span>
            <div>
              <h1 className="font-display text-xl font-bold text-stone-900 leading-none">
                KenduriLuhh
              </h1>
              <p className="text-xs text-stone-400 mt-0.5">The Future of Rewang</p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            {/* History button */}
            <button
              onClick={() => setHistoryOpen(true)}
              title={language === 'en' ? 'Session history' : 'Sejarah sesi'}
              className="flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-800 border border-stone-200 hover:border-stone-400 bg-white rounded-lg px-3 py-1.5 transition-all cursor-pointer"
            >
              <span>🕐</span>
              <span className="hidden sm:inline">{language === 'en' ? 'History' : 'Sejarah'}</span>
            </button>
            {status === 'reconnecting' && (
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-xs text-amber-600 font-semibold hidden sm:inline">
                  {t.reconnecting}
                </span>
              </div>
            )}
            {(status === 'loading' || status === 'running') && (
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs text-emerald-600 font-semibold hidden sm:inline">
                  {t.negotiating}
                </span>
              </div>
            )}
            {status === 'done' && (
              <span className="text-xs text-emerald-600 font-semibold">{t.done}</span>
            )}
            {(isActive || status === 'done' || status === 'error') && (
              <button
                onClick={stopChat}
                className="text-xs text-stone-500 hover:text-stone-800 border border-stone-200 hover:border-stone-400 bg-white rounded-lg px-3 py-1.5 transition-all cursor-pointer"
              >
                {t.startOver}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 flex flex-col gap-5">

        {/* Agent status bar — always visible */}
        <AgentStatusBar
          activeAgent={typingAgent}
          doneAgents={doneAgents}
          status={status}
          language={language}
        />

        {/* Error banner */}
        <AnimatePresence>
          {status === 'error' && error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 shadow-sm"
            >
              ⚠️ {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading state */}
        <AnimatePresence>
          {status === 'loading' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-3 text-stone-500 text-sm"
            >
              <span className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              {t.loading}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Reconnecting banner */}
        <AnimatePresence>
          {status === 'reconnecting' && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 shadow-sm flex items-center gap-3"
            >
              <span className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
              {t.reconnectBanner}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Split-screen layout when feed is visible, else centred form */}
        <AnimatePresence mode="wait">
          {!showFeed ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="max-w-2xl mx-auto w-full"
            >
              <HeroText mode={mode} language={language} />
              <ChatInput onSubmit={startChat} disabled={isActive} />
            </motion.div>
          ) : (
            <motion.div
              key="feed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col lg:flex-row gap-5 items-start"
            >
              {/* Left — Agent chat log */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-display text-lg font-bold text-stone-800">
                    {t.logTitle}
                  </h3>
                  <span className="text-xs text-stone-400 bg-white border border-stone-200 px-2 py-1 rounded-full">
                    {messages.length} {t.messages}
                  </span>
                </div>
                <div className="max-h-[70vh] overflow-y-auto pr-1">
                  <AgentChatFeed
                    messages={messages}
                    typingAgent={typingAgent}
                    status={status}
                  />
                </div>
              </div>

              {/* Right — collapsible panel */}
              <div className={`flex-shrink-0 lg:sticky lg:top-24 transition-all duration-300 ${panelCollapsed ? 'w-full lg:w-10' : 'w-full lg:w-80 xl:w-96'}`}>
                {/* Collapse toggle button (desktop only) */}
                <button
                  onClick={() => setPanelCollapsed((v) => !v)}
                  title={panelCollapsed
                    ? (language === 'en' ? 'Expand panel' : 'Kembangkan panel')
                    : (language === 'en' ? 'Collapse panel' : 'Kecilkan panel')}
                  className="hidden lg:flex items-center justify-center w-7 h-7 rounded-full bg-white border border-stone-200 hover:border-stone-400 text-stone-400 hover:text-stone-700 text-xs shadow-sm transition-all mb-2 ml-auto cursor-pointer"
                >
                  {panelCollapsed ? '◀' : '▶'}
                </button>

                <AnimatePresence mode="wait">
                  {!panelCollapsed && (
                    <motion.div
                      key="panel-content"
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      className="max-h-[calc(100vh-6rem)] overflow-y-auto"
                    >
                      {status === 'done' ? (
                        <motion.div
                          key="output"
                          initial={{ opacity: 0, x: 12 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0 }}
                        >
                          <OutputPanel
                            messages={messages}
                            mode={mode}
                            onReset={stopChat}
                            language={language}
                            originalRequest={originalRequest}
                            onSpikeUpdate={startChat}
                          />
                        </motion.div>
                      ) : (
                        <motion.div key="live" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                          <LiveSummaryPanel messages={messages} status={status} language={language} />
                        </motion.div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-stone-200 bg-white text-center py-4 text-xs text-stone-400">
        KenduriLuhh · Code; Without Barriers Hackathon 2026 · Powered by Azure OpenAI & AutoGen
      </footer>

      {/* ── History drawer ── */}
      <HistoryDrawer
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onReplay={replaySession}
        language={language}
      />
    </div>
  );
}

// ── Hero text ──────────────────────────────────────────────────────────────

function HeroText({ mode, language }: { mode: 'katering' | 'rewang'; language: 'ms' | 'en' }) {
  const copy = mode === 'rewang'
    ? {
        title: language === 'en' ? 'Plan Your Rewang' : 'Rancang Rewang Anda',
        sub: language === 'en'
          ? 'Enter the details below — AI agents will prepare your shopping list & logistics'
          : 'Masukkan butiran di bawah — ejen AI akan sediakan senarai belanja & logistik rewang',
      }
    : {
        title: language === 'en' ? 'Plan Your Kenduri' : 'Rancang Kenduri Anda',
        sub: language === 'en'
          ? 'Fill in the details below — five AI agents will negotiate on your behalf'
          : 'Isi butiran di bawah — lima ejen AI akan berunding untuk anda',
      };

  return (
    <div className="mb-6 text-center">
      <h2 className="font-display text-3xl sm:text-4xl font-bold text-stone-900 leading-tight">
        {copy.title}
      </h2>
      <p className="text-stone-500 mt-2 text-sm">{copy.sub}</p>
    </div>
  );
}

// ── Live summary panel ──────────────────────────────────────────────────────

function LiveSummaryPanel({
  messages,
  status,
  language = 'ms',
}: {
  messages: { agent: string; content: string }[];
  status: string;
  language?: 'ms' | 'en';
}) {
  const allPlain = messages.map((m) => stripMd(m.content)).join('\n');

  const tpFinal = messages
    .filter((m) => m.agent === 'Tok_Penghulu' && m.content.includes('SELESAI'))
    .map((m) => stripMd(m.content))
    .join(' ');

  const budgetSource = tpFinal || allPlain;
  const budgetMatches = budgetSource.match(/RM\s?([\d,]+(?:\.\d{1,2})?)/g) ?? [];
  const latestBudget = budgetMatches.length > 0 ? budgetMatches[budgetMatches.length - 1] : null;

  const paxMatch = allPlain.match(/(\d{1,5})\s*(pax|orang|tetamu|guests?)/i);
  const pax = paxMatch ? paxMatch[1] : null;

  const tpMessages = messages
    .filter((m) => m.agent === 'Tok_Penghulu')
    .map((m) => stripMd(m.content));

  const menuLineMatch = tpMessages.join('\n').match(/menu\s+(?:muktamad|confirmed)[:\s]+([^\n.]+)/i);
  let menuItems: string[] = [];

  if (menuLineMatch) {
    menuItems = menuLineMatch[1]
      .split(/,|;/)
      .map((s) => s.trim())
      .filter((s) => s.length > 2)
      .slice(0, 6);
  } else {
    const lastMakTok = [...messages].reverse().find((m) => m.agent === 'Mak_Tok');
    if (lastMakTok) {
      const plain = stripMd(lastMakTok.content);
      menuItems = (plain.match(/^\d+\.\s+(.+)$/gm) ?? [])
        .map((s) => s.replace(/^\d+\.\s+/, '').split(/[:(]/)[0].trim())
        .filter((s) => s.length > 2 && s.length < 60)
        .slice(0, 6);
    }
  }

  const hasWarning = (
    allPlain.toLowerCase().includes('over bajet') ||
    allPlain.toLowerCase().includes('over budget') ||
    allPlain.toLowerCase().includes('gagal') ||
    allPlain.toLowerCase().includes('failed')
  ) && status === 'running';

  const tl = language === 'en'
    ? {
        heading: 'Live Summary',
        budget: 'Budget',
        pax: 'Pax',
        statusLabel: 'Status',
        done: 'Done',
        live: 'Live',
        warning: 'Agents reviewing budget…',
        menuHeading: 'Proposed Menu',
        placeholder: 'Data will appear as agents discuss…',
      }
    : {
        heading: 'Ringkasan Langsung',
        budget: 'Belanjawan',
        pax: 'Pax',
        statusLabel: 'Status',
        done: 'Selesai',
        live: 'Langsung',
        warning: 'Ejen sedang semak belanjawan…',
        menuHeading: 'Menu Cadangan',
        placeholder: 'Data akan muncul semasa ejen berbincang…',
      };

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-stone-100 bg-stone-50">
        <h4 className="text-xs font-semibold text-stone-500 uppercase tracking-widest">
          {tl.heading}
        </h4>
      </div>
      <div className="p-4 flex flex-col gap-3">
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: tl.budget, value: latestBudget ?? '—', icon: '💰' },
            { label: tl.pax,    value: pax ? `${pax}` : '—', icon: '👥' },
            { label: tl.statusLabel, value: status === 'done' ? tl.done : status === 'running' ? tl.live : '—', icon: status === 'done' ? '✅' : '⏳' },
          ].map((c) => (
            <div key={c.label} className="flex flex-col items-center text-center p-2 rounded-xl bg-stone-50">
              <span className="text-base">{c.icon}</span>
              <span className="text-xs font-semibold text-stone-700 mt-0.5 tabular-nums">{c.value}</span>
              <span className="text-xs text-stone-400">{c.label}</span>
            </div>
          ))}
        </div>

        {hasWarning && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700 flex items-start gap-2">
            <span className="flex-shrink-0">⚠️</span>
            <span>{tl.warning}</span>
          </div>
        )}

        {menuItems.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
              {tl.menuHeading}
            </p>
            <ul className="flex flex-col gap-1">
              {menuItems.map((item, i) => (
                <li key={i} className="text-xs text-stone-600 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {messages.length === 0 && (
          <p className="text-xs text-stone-400 text-center py-2">
            {tl.placeholder}
          </p>
        )}
      </div>
    </div>
  );
}
