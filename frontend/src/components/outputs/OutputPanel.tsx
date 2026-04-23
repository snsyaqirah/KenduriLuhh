import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { HalalBadge } from './HalalBadge';
import { BudgetBreakdown } from './BudgetBreakdown';
import { LogisticsTimeline } from './LogisticsTimeline';
import { QuotationCard } from './QuotationCard';
import { ShoppingList } from './ShoppingList';
import { RouteMap } from './RouteMap';
import { DecisionFlow } from '../DecisionFlow';
import { AuditLogPanel } from '../AuditLogPanel';
import { parseMessages } from '../../utils/parseMessages';
import type { AgentMessage, CateringRequest, Language, Mode } from '../../types';

interface Props {
  messages: AgentMessage[];
  mode: Mode;
  language: Language;
  onReset: () => void;
  originalRequest?: CateringRequest | null;
  onSpikeUpdate?: (req: CateringRequest) => void;
}

type Tab = 'results' | 'flow' | 'audit';

const TABS: { id: Tab; labelEn: string; labelMs: string; icon: string }[] = [
  { id: 'results', labelEn: 'Results',       labelMs: 'Keputusan',  icon: '📋' },
  { id: 'flow',    labelEn: 'Decision Flow', labelMs: 'Aliran',     icon: '🔀' },
  { id: 'audit',   labelEn: 'Audit Log',     labelMs: 'Log Audit',  icon: '🗂️' },
];

const SPIKE_OPTIONS = [30, 50, 100];

export function OutputPanel({ messages, mode, language, onReset, originalRequest, onSpikeUpdate }: Props) {
  const data = useMemo(() => parseMessages(messages, mode, language), [messages, mode, language]);
  const [activeTab, setActiveTab] = useState<Tab>('results');
  const [showSpike, setShowSpike] = useState(false);
  const [customSpike, setCustomSpike] = useState('');

  const resetLabel  = language === 'en' ? '+ Plan New Event'    : '+ Rancang Majlis Baru';
  const spikeTitle  = language === 'en' ? '🚨 Emergency Update' : '🚨 Kemaskini Kecemasan';
  const spikeDesc   = language === 'en'
    ? 'Guest count changed? Agents will re-negotiate instantly.'
    : 'Bilangan tetamu berubah? Ejen akan berunding semula sekarang.';
  const spikeLabel  = language === 'en' ? 'Add pax' : 'Tambah pax';
  const rerunLabel  = language === 'en' ? 'Re-run with new pax' : 'Jana semula dengan pax baru';

  function handleSpike(extraPax: number) {
    if (!originalRequest || !onSpikeUpdate) return;
    onSpikeUpdate({ ...originalRequest, pax: originalRequest.pax + extraPax });
    setShowSpike(false);
    setCustomSpike('');
  }

  function handleCustomSpike() {
    const n = parseInt(customSpike);
    if (!isNaN(n) && n > 0) handleSpike(n);
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-3">

      {/* ── Tab bar ── */}
      <div className="flex rounded-xl border border-stone-200 bg-stone-50 p-1 gap-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1 text-xs font-semibold py-1.5 px-2 rounded-lg transition-all cursor-pointer ${
              activeTab === tab.id
                ? 'bg-white text-stone-800 shadow-sm'
                : 'text-stone-400 hover:text-stone-600'
            }`}
          >
            <span>{tab.icon}</span>
            <span className="hidden sm:inline">{language === 'en' ? tab.labelEn : tab.labelMs}</span>
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        {activeTab === 'results' && (
          <div className="flex flex-col gap-4 p-4">
            <HalalBadge isHalal={data.isHalal} language={language} />
            {mode === 'katering' ? (
              <QuotationCard data={data} language={language} />
            ) : (
              <ShoppingList data={data} language={language} />
            )}
            {data.budget && (
              <BudgetBreakdown budget={data.budget} mode={mode} language={language} />
            )}
            {data.logistics.length > 0 && (
              <LogisticsTimeline events={data.logistics} language={language} />
            )}
            {originalRequest?.event_location && (
              <RouteMap eventLocation={originalRequest.event_location} language={language} />
            )}
          </div>
        )}

        {activeTab === 'flow' && (
          <div className="p-4">
            <p className="text-xs text-stone-400 mb-3">
              {language === 'en'
                ? 'Each node shows a key agent decision. Trace the negotiation from start to DONE.'
                : 'Setiap nod menunjukkan keputusan ejen utama. Jejak rundingan dari mula hingga SELESAI.'}
            </p>
            <DecisionFlow messages={messages} language={language} />
          </div>
        )}

        {activeTab === 'audit' && (
          <div className="p-4">
            <p className="text-xs text-stone-400 mb-3">
              {language === 'en'
                ? 'JSON-structured audit trail — every agent action is logged with key outputs and status.'
                : 'Jejak audit berstruktur JSON — setiap tindakan ejen dilog dengan output utama dan status.'}
            </p>
            <AuditLogPanel messages={messages} language={language} />
          </div>
        )}
      </div>

      {/* ── Guest spike section ── */}
      {originalRequest && onSpikeUpdate && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 overflow-hidden">
          <button
            onClick={() => setShowSpike((v) => !v)}
            className="w-full text-left px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-amber-100 transition-colors"
          >
            <div>
              <p className="text-xs font-bold text-amber-800">{spikeTitle}</p>
              <p className="text-xs text-amber-600 mt-0.5">{spikeDesc}</p>
            </div>
            <span className="text-amber-500 flex-shrink-0">{showSpike ? '▲' : '▼'}</span>
          </button>

          {showSpike && (
            <div className="px-4 pb-4 flex flex-col gap-2">
              <p className="text-xs text-amber-700 font-semibold">
                {language === 'en' ? 'Current pax:' : 'Pax semasa:'} {originalRequest.pax}
              </p>
              <div className="flex gap-2 flex-wrap">
                {SPIKE_OPTIONS.map((n) => (
                  <button
                    key={n}
                    onClick={() => handleSpike(n)}
                    className="text-xs font-bold px-3 py-1.5 rounded-lg bg-amber-200 hover:bg-amber-300 text-amber-900 transition-colors cursor-pointer"
                  >
                    +{n} {spikeLabel}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  min={1}
                  max={2000}
                  placeholder={language === 'en' ? 'Custom pax...' : 'Pax lain...'}
                  value={customSpike}
                  onChange={(e) => setCustomSpike(e.target.value)}
                  className="flex-1 text-xs border border-amber-300 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-amber-400"
                />
                <button
                  onClick={handleCustomSpike}
                  disabled={!customSpike}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {rerunLabel}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Reset button ── */}
      <button
        onClick={onReset}
        className="w-full rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-sm font-semibold py-3 transition-all cursor-pointer shadow-sm"
      >
        {resetLabel}
      </button>
    </motion.div>
  );
}
