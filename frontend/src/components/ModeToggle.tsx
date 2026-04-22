import { motion } from 'framer-motion';
import type { Language, Mode } from '../types';

interface Props {
  value: Mode;
  onChange: (m: Mode) => void;
  disabled?: boolean;
  language?: Language;
}

const MODES: { id: Mode; label: { ms: string; en: string }; icon: string }[] = [
  { id: 'katering', label: { ms: 'Katering Pro', en: 'Catering Pro' }, icon: '🏢' },
  { id: 'rewang',   label: { ms: 'Rewang DIY',   en: 'Home Rewang'  }, icon: '🏡' },
];

export function ModeToggle({ value, onChange, disabled, language = 'ms' }: Props) {
  return (
    <div className="relative flex rounded-xl bg-stone-100 p-1 gap-0">
      {MODES.map((m) => (
        <button
          key={m.id}
          disabled={disabled}
          onClick={() => onChange(m.id)}
          className={[
            'relative z-10 flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 px-4',
            'text-sm font-semibold transition-colors duration-200 cursor-pointer',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500',
            disabled ? 'cursor-not-allowed' : '',
            value === m.id ? 'text-white' : 'text-stone-500 hover:text-stone-700',
          ].join(' ')}
        >
          {value === m.id && (
            <motion.div
              layoutId="mode-pill"
              className="absolute inset-0 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 shadow-md"
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
          )}
          <span className="relative z-10">{m.icon}</span>
          <span className="relative z-10">{m.label[language]}</span>
        </button>
      ))}
    </div>
  );
}
