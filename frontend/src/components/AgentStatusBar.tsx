import { motion, AnimatePresence } from 'framer-motion';
import { ChefHat, Calculator, ShoppingBasket, Truck, Crown, UserCheck, Eye } from 'lucide-react';

const AGENTS = [
  { key: 'Pelanggan',    label: 'Pelanggan',    role: { ms: 'Pelanggan', en: 'Customer' },      Icon: UserCheck,     color: 'teal' },
  { key: 'Tok_Penghulu', label: 'Tok Penghulu', role: { ms: 'Pengerusi', en: 'Chairperson' },   Icon: Crown,         color: 'emerald' },
  { key: 'Mak_Tok',      label: 'Mak Tok',      role: { ms: 'Tukang Masak', en: 'Chef' },       Icon: ChefHat,       color: 'rose' },
  { key: 'Tokey_Pasar',  label: 'Tokey Pasar',  role: { ms: 'Pembekal', en: 'Supplier' },       Icon: ShoppingBasket,color: 'blue' },
  { key: 'Bendahari',    label: 'Bendahari',    role: { ms: 'Kewangan', en: 'Finance' },         Icon: Calculator,    color: 'amber' },
  { key: 'Abang_Lorry',  label: 'Abang Lorry',  role: { ms: 'Logistik', en: 'Logistics' },      Icon: Truck,         color: 'purple' },
  { key: 'Pemantau',     label: 'Pemantau',     role: { ms: 'Pemantau', en: 'Monitor' },         Icon: Eye,           color: 'indigo' },
] as const;

const COLOR_MAP: Record<string, { ring: string; bg: string; icon: string; pulse: string }> = {
  teal:    { ring: 'ring-teal-400',    bg: 'bg-teal-50',    icon: 'text-teal-600',    pulse: 'bg-teal-400' },
  emerald: { ring: 'ring-emerald-400', bg: 'bg-emerald-50', icon: 'text-emerald-600', pulse: 'bg-emerald-400' },
  rose:    { ring: 'ring-rose-400',    bg: 'bg-rose-50',    icon: 'text-rose-600',    pulse: 'bg-rose-400' },
  blue:    { ring: 'ring-blue-400',    bg: 'bg-blue-50',    icon: 'text-blue-600',    pulse: 'bg-blue-400' },
  amber:   { ring: 'ring-amber-400',   bg: 'bg-amber-50',   icon: 'text-amber-600',   pulse: 'bg-amber-400' },
  purple:  { ring: 'ring-purple-400',  bg: 'bg-purple-50',  icon: 'text-purple-600',  pulse: 'bg-purple-400' },
  indigo:  { ring: 'ring-indigo-400',  bg: 'bg-indigo-50',  icon: 'text-indigo-600',  pulse: 'bg-indigo-400' },
};

interface Props {
  activeAgent: string | null;
  doneAgents: string[];
  status: string;
  language?: 'ms' | 'en';
  tokenCount?: number | null;
}

export function AgentStatusBar({ activeAgent, doneAgents, status, language = 'ms', tokenCount }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
        {AGENTS.map(({ key, label, role, Icon, color }) => {
          const c = COLOR_MAP[color];
          const isActive = activeAgent === key;
          const isDone = doneAgents.includes(key) && status === 'done';

          return (
            <motion.div
              key={key}
              animate={isActive ? { scale: 1.04 } : { scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              className={[
                'flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-300',
                isActive
                  ? `${c.bg} ring-2 ${c.ring} border-transparent shadow-sm`
                  : isDone
                    ? 'bg-white border-stone-200 text-stone-600'
                    : 'bg-white border-stone-200 text-stone-400',
              ].join(' ')}
            >
              {/* Status dot */}
              <span className="relative flex h-2 w-2 flex-shrink-0">
                {isActive && (
                  <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${c.pulse} opacity-75`} />
                )}
                <span
                  className={[
                    'relative inline-flex rounded-full h-2 w-2',
                    isActive ? c.pulse : isDone ? 'bg-emerald-400' : 'bg-stone-300',
                  ].join(' ')}
                />
              </span>

              <Icon
                size={13}
                className={isActive ? c.icon : isDone ? 'text-emerald-500' : 'text-stone-400'}
              />
              <span className={isActive ? 'text-stone-800' : isDone ? 'text-stone-600' : ''}>
                {label}
              </span>
              <span className="text-stone-400 font-normal hidden sm:inline">· {role[language]}</span>

              <AnimatePresence>
                {isDone && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="text-emerald-500"
                  >
                    ✓
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Token counter — shown once session is done */}
      <AnimatePresence>
        {status === 'done' && tokenCount != null && tokenCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-1.5 text-xs text-stone-400"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-stone-300" />
            <span>
              {language === 'en' ? '~' : '~'}{tokenCount.toLocaleString()} tokens
              {language === 'en' ? ' used (est.)' : ' digunakan (anggaran)'}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
