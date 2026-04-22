import { motion } from 'framer-motion';
import { Truck } from 'lucide-react';
import type { LogisticsEvent } from '../../utils/parseMessages';

interface Props {
  events: LogisticsEvent[];
  language?: 'ms' | 'en';
}

const KEY_STYLE: Record<string, { dot: string; text: string }> = {
  'T-3': { dot: 'bg-blue-400',    text: 'text-blue-700' },
  'T-2': { dot: 'bg-amber-400',   text: 'text-amber-700' },
  'T-1': { dot: 'bg-orange-400',  text: 'text-orange-700' },
  'T-0': { dot: 'bg-emerald-500', text: 'text-emerald-700' },
};
const DEFAULT_STYLE = { dot: 'bg-stone-400', text: 'text-stone-600' };

export function LogisticsTimeline({ events, language = 'ms' }: Props) {
  if (events.length === 0) return null;
  const heading = language === 'en' ? 'Logistics Timeline' : 'Jadual Logistik';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden"
    >
      <div className="px-4 py-3 border-b border-stone-100 bg-stone-50 flex items-center gap-2">
        <Truck size={14} className="text-purple-600" />
        <h4 className="text-xs font-semibold text-stone-600 uppercase tracking-widest">
          {heading}
        </h4>
      </div>

      <div className="p-4">
        <div className="relative flex flex-col gap-0">
          {/* Vertical connector line */}
          <div className="absolute left-3.5 top-4 bottom-4 w-px bg-stone-200" />

          {events.map((ev, i) => {
            const style = KEY_STYLE[ev.key] ?? DEFAULT_STYLE;
            return (
              <motion.div
                key={ev.key}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className="relative flex gap-4 pb-5 last:pb-0"
              >
                {/* Dot */}
                <div className={`relative z-10 mt-0.5 w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 bg-white border-2 ${style.dot.replace('bg-', 'border-')}`}>
                  <span className={`w-2.5 h-2.5 rounded-full ${style.dot}`} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className={`text-xs font-bold uppercase tracking-wide ${style.text}`}>
                      {ev.key}
                    </span>
                    <span className="text-xs font-medium text-stone-700">{ev.label}</span>
                    {ev.date && (
                      <span className="text-xs text-stone-400">({ev.date})</span>
                    )}
                  </div>
                  {ev.tasks && (
                    <div className="mt-1 text-xs text-stone-600 whitespace-pre-wrap leading-relaxed">
                      {ev.tasks}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
