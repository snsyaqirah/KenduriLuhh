import { ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
  isHalal: boolean;
  language?: 'ms' | 'en';
}

export function HalalBadge({ isHalal, language = 'ms' }: Props) {
  const verifiedText = language === 'en' ? 'Halal Verified' : 'Halal Disahkan';
  const unknownText  = language === 'en' ? 'Halal Status Unknown' : 'Status Halal Tidak Diketahui';

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className={[
        'flex items-center gap-2 rounded-xl px-4 py-2.5 w-fit',
        isHalal
          ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
          : 'bg-stone-100 border border-stone-200 text-stone-500',
      ].join(' ')}
    >
      <ShieldCheck size={16} className={isHalal ? 'text-emerald-600' : 'text-stone-400'} />
      <span className="text-xs font-bold tracking-wide uppercase">
        {isHalal ? verifiedText : unknownText}
      </span>
      {isHalal && (
        <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">
          ✓
        </span>
      )}
    </motion.div>
  );
}
