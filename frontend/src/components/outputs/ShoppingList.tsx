import { motion } from 'framer-motion';
import { ShoppingBasket, Download } from 'lucide-react';
import { generateQuotationPdf } from '../../utils/generatePdf';
import type { ParsedOutput } from '../../utils/parseMessages';

interface Props {
  data: ParsedOutput;
  language?: 'ms' | 'en';
}

function fmt(n: number | null) {
  if (n === null) return '—';
  return `RM ${n.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const TIPS = {
  en: [
    'Buy fresh ingredients the day before cooking for best quality.',
    'Delegate cooking tasks across teams (rice, mains, kuih).',
    'Prepare labelled containers to organise ingredients in the kitchen.',
    'Keep all receipts to calculate the actual total cost.',
  ],
  ms: [
    'Beli bahan basah sehari sebelum masak untuk kesegaran.',
    'Agih tugas memasak kepada beberapa kumpulan (nasi, lauk, kuih).',
    'Sediakan bekas berlabel untuk senang urus bahan di dapur.',
    'Simpan resit belian untuk kiraan kos sebenar.',
  ],
} as const;

const T = {
  en: {
    subtitle: 'Shopping List (Rewang)',
    badge: 'HOME REWANG',
    guests: 'guests',
    perHead: 'per head',
    menu: 'Menu',
    ingredients: 'Ingredients',
    empty: 'Shopping list will appear after agents finish…',
    tipsTitle: '💡 Rewang Tips',
    download: 'Download Shopping List PDF',
  },
  ms: {
    subtitle: 'Senarai Beli-belah (Rewang)',
    badge: 'DIY REWANG',
    guests: 'tetamu',
    perHead: 'setiap kepala',
    menu: 'Menu',
    ingredients: 'Bahan / Ingredients',
    empty: 'Senarai belian akan muncul selepas ejen selesai…',
    tipsTitle: '💡 Tips Rewang',
    download: 'Muat Turun PDF Senarai Belian',
  },
} as const;

export function ShoppingList({ data, language = 'ms' }: Props) {
  const { shoppingLines, budget, totalPax, menuItems, finalSummary } = data;
  const t = T[language];
  const tips = TIPS[language];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden"
    >
      <div className="px-5 py-4 bg-gradient-to-r from-teal-600 to-emerald-600 text-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShoppingBasket size={16} />
              <span className="text-xs font-semibold uppercase tracking-widest opacity-80">
                {t.subtitle}
              </span>
            </div>
            <p className="text-2xl font-bold font-display">
              {fmt(budget?.subtotal ?? null)}
            </p>
            {totalPax && (
              <p className="text-xs opacity-80 mt-0.5">
                {totalPax} {t.guests} · {fmt(budget?.perHead ?? null)} {t.perHead}
              </p>
            )}
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-white/20 text-white">
            {t.badge}
          </span>
        </div>
      </div>

      <div className="p-5 flex flex-col gap-4">
        {menuItems.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
              {t.menu}
            </p>
            <ul className="flex flex-wrap gap-1.5">
              {menuItems.map((item, i) => (
                <li key={i} className="text-xs bg-teal-50 border border-teal-100 text-teal-700 px-2.5 py-1 rounded-full">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {shoppingLines.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
              {t.ingredients}
            </p>
            <ul className="flex flex-col gap-1.5">
              {shoppingLines.map((line, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-start gap-2 text-xs text-stone-700"
                >
                  <span className="w-4 h-4 rounded border border-stone-200 bg-stone-50 flex-shrink-0 mt-0.5" />
                  {line}
                </motion.li>
              ))}
            </ul>
          </div>
        )}

        {shoppingLines.length === 0 && (
          <p className="text-xs text-stone-400 text-center py-2">{t.empty}</p>
        )}

        {finalSummary && (
          <p className="text-xs text-stone-500 leading-relaxed border-t border-stone-100 pt-3">
            {finalSummary}
          </p>
        )}

        <div className="rounded-xl bg-amber-50 border border-amber-100 p-3">
          <p className="text-xs font-semibold text-amber-700 mb-1.5">{t.tipsTitle}</p>
          <ul className="flex flex-col gap-1">
            {tips.map((tip, i) => (
              <li key={i} className="text-xs text-amber-700 flex items-start gap-1.5">
                <span className="flex-shrink-0 mt-0.5">•</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>

        <button
          onClick={() => generateQuotationPdf(data, 'rewang', language)}
          className="flex items-center justify-center gap-2 w-full rounded-xl border border-teal-200 bg-teal-50 hover:bg-teal-100 text-teal-700 text-xs font-semibold py-2.5 transition-all cursor-pointer"
        >
          <Download size={14} />
          {t.download}
        </button>
      </div>
    </motion.div>
  );
}
