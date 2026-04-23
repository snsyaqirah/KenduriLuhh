import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Truck } from 'lucide-react';
import type { LogisticsEvent } from '../../utils/parseMessages';

interface Props {
  events: LogisticsEvent[];
  language?: 'ms' | 'en';
}

const KEY_STYLE: Record<string, { dot: string; border: string; text: string; bg: string }> = {
  'T-3': { dot: 'bg-blue-400',    border: 'border-blue-200',   text: 'text-blue-700',    bg: 'bg-blue-50' },
  'T-2': { dot: 'bg-amber-400',   border: 'border-amber-200',  text: 'text-amber-700',   bg: 'bg-amber-50' },
  'T-1': { dot: 'bg-orange-400',  border: 'border-orange-200', text: 'text-orange-700',  bg: 'bg-orange-50' },
  'T-0': { dot: 'bg-emerald-500', border: 'border-emerald-200',text: 'text-emerald-700', bg: 'bg-emerald-50' },
};
const DEFAULT_STYLE = { dot: 'bg-stone-400', border: 'border-stone-200', text: 'text-stone-600', bg: 'bg-stone-50' };

export function LogisticsTimeline({ events, language = 'ms' }: Props) {
  if (events.length === 0) return null;

  // T-0 expanded by default
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['T-0']));

  function toggle(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const heading = language === 'en' ? 'Logistics Timeline' : 'Jadual Logistik';
  const expandHint = language === 'en' ? 'tap to expand' : 'ketuk untuk buka';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden"
    >
      <div className="px-4 py-3 border-b border-stone-100 bg-stone-50 flex items-center gap-2">
        <Truck size={14} className="text-purple-600" />
        <h4 className="text-xs font-semibold text-stone-600 uppercase tracking-widest flex-1">
          {heading}
        </h4>
        <span className="text-xs text-stone-400">{events.length} fasa</span>
      </div>

      <div className="p-4">
        <div className="relative flex flex-col gap-0">
          {/* Vertical connector line */}
          <div className="absolute left-3.5 top-4 bottom-4 w-px bg-stone-200" />

          {events.map((ev, i) => {
            const style = KEY_STYLE[ev.key] ?? DEFAULT_STYLE;
            const isOpen = expanded.has(ev.key);
            const hasTasks = ev.tasks && ev.tasks.trim().length > 0;

            return (
              <motion.div
                key={ev.key}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className="relative flex gap-4 pb-3 last:pb-0"
              >
                {/* Dot */}
                <div className={`relative z-10 mt-0.5 w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 bg-white border-2 ${style.dot.replace('bg-', 'border-')}`}>
                  <span className={`w-2.5 h-2.5 rounded-full ${style.dot}`} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {/* Header row — always visible, clickable */}
                  <button
                    onClick={() => hasTasks && toggle(ev.key)}
                    className={`w-full text-left flex items-center justify-between gap-2 rounded-lg px-3 py-2 transition-colors ${
                      hasTasks ? `${style.bg} hover:opacity-90 cursor-pointer` : 'cursor-default'
                    }`}
                  >
                    <div className="flex items-baseline gap-2 flex-wrap min-w-0">
                      <span className={`text-xs font-bold uppercase tracking-wide flex-shrink-0 ${style.text}`}>
                        {ev.key}
                      </span>
                      <span className="text-xs font-medium text-stone-700">{ev.label}</span>
                      {ev.date && (
                        <span className="text-xs text-stone-400">({ev.date})</span>
                      )}
                    </div>
                    {hasTasks && (
                      <span className={`text-xs flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''} ${style.text}`}>
                        ▼
                      </span>
                    )}
                  </button>

                  {/* Tasks — expand/collapse */}
                  <AnimatePresence initial={false}>
                    {hasTasks && isOpen && (
                      <motion.div
                        key="tasks"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className={`mx-1 mb-1 rounded-lg border ${style.border} px-3 py-2 text-xs text-stone-600 whitespace-pre-wrap leading-relaxed`}>
                          {ev.tasks}
                        </div>
                      </motion.div>
                    )}
                    {hasTasks && !isOpen && (
                      <p className="text-xs text-stone-400 italic px-3 mt-0.5">{expandHint}</p>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
