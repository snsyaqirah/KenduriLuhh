import { motion } from 'framer-motion';
import { ShoppingBasket, Download } from 'lucide-react';
import { generateQuotationPdf } from '../../utils/generatePdf';
import type { ParsedOutput } from '../../utils/parseMessages';

interface Props {
  data: ParsedOutput;
}

function fmt(n: number | null) {
  if (n === null) return '—';
  return `RM ${n.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function ShoppingList({ data }: Props) {
  const { shoppingLines, budget, totalPax, menuItems, finalSummary } = data;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden"
    >
      {/* Header */}
      <div className="px-5 py-4 bg-gradient-to-r from-teal-600 to-emerald-600 text-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShoppingBasket size={16} />
              <span className="text-xs font-semibold uppercase tracking-widest opacity-80">
                Shopping List (Rewang)
              </span>
            </div>
            <p className="text-2xl font-bold font-display">
              {fmt(budget?.subtotal ?? null)}
            </p>
            {totalPax && (
              <p className="text-xs opacity-80 mt-0.5">
                {totalPax} guests · {fmt(budget?.perHead ?? null)} per head
              </p>
            )}
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-white/20 text-white">
            DIY REWANG
          </span>
        </div>
      </div>

      <div className="p-5 flex flex-col gap-4">
        {/* Menu */}
        {menuItems.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
              Menu
            </p>
            <ul className="flex flex-wrap gap-1.5">
              {menuItems.map((item, i) => (
                <li
                  key={i}
                  className="text-xs bg-teal-50 border border-teal-100 text-teal-700 px-2.5 py-1 rounded-full"
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Shopping items */}
        {shoppingLines.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
              Bahan / Ingredients
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
          <p className="text-xs text-stone-400 text-center py-2">
            Shopping list will appear after agents finish…
          </p>
        )}

        {/* Summary */}
        {finalSummary && (
          <p className="text-xs text-stone-500 leading-relaxed border-t border-stone-100 pt-3">
            {finalSummary}
          </p>
        )}

        <button
          onClick={() => generateQuotationPdf(data, 'rewang')}
          className="flex items-center justify-center gap-2 w-full rounded-xl border border-teal-200 bg-teal-50 hover:bg-teal-100 text-teal-700 text-xs font-semibold py-2.5 transition-all cursor-pointer"
        >
          <Download size={14} />
          Download Shopping List PDF
        </button>
      </div>
    </motion.div>
  );
}
