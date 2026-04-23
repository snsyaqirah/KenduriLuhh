import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Download, ChevronDown } from 'lucide-react';
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

const T = {
  en: {
    subtitle: 'Catering Quotation',
    perHead: 'per head',
    approved: '✓ APPROVED',
    overBudget: '✗ OVER BUDGET',
    menu: 'Confirmed Menu',
    costSummary: 'Cost Summary',
    ingredients: 'Ingredients',
    overhead: 'Overhead',
    labour: 'Labour',
    transport: 'Transport',
    totalCost: 'Total Cost',
    margin: 'Profit Margin',
    quotation: 'Quotation Price',
    download: 'Download PDF Quotation',
  },
  ms: {
    subtitle: 'Sebut Harga Katering',
    perHead: 'setiap kepala',
    approved: '✓ LULUS',
    overBudget: '✗ OVER BAJET',
    menu: 'Menu Disahkan',
    costSummary: 'Ringkasan Kos',
    ingredients: 'Bahan Mentah',
    overhead: 'Overhead',
    labour: 'Tenaga Kerja',
    transport: 'Pengangkutan',
    totalCost: 'Jumlah Kos',
    margin: 'Margin Untung',
    quotation: 'Harga Sebut Harga',
    download: 'Muat Turun PDF Sebut Harga',
  },
} as const;

export function QuotationCard({ data, language = 'ms' }: Props) {
  const { budget, menuItems, totalPax, finalSummary } = data;
  const t = T[language];
  const [menuOpen, setMenuOpen] = useState(true);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden"
    >
      <div className="px-5 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <FileText size={16} />
              <span className="text-xs font-semibold uppercase tracking-widest opacity-80">
                {t.subtitle}
              </span>
            </div>
            <p className="text-2xl font-bold font-display">
              {fmt(budget?.quotation ?? budget?.subtotal ?? null)}
            </p>
            {budget?.perHead && (
              <p className="text-xs opacity-80 mt-0.5">
                {fmt(budget.perHead)} {t.perHead} · {totalPax ?? '—'} pax
              </p>
            )}
          </div>
          <span
            className={[
              'text-xs font-bold px-2.5 py-1 rounded-full',
              budget?.isApproved
                ? 'bg-white/20 text-white'
                : 'bg-red-400/30 text-red-100',
            ].join(' ')}
          >
            {budget?.isApproved ? t.approved : t.overBudget}
          </span>
        </div>
      </div>

      <div className="p-5 flex flex-col gap-4">
        {menuItems.length > 0 && (
          <div>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="w-full flex items-center justify-between gap-2 mb-2 cursor-pointer group"
            >
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider group-hover:text-stone-700 transition-colors">
                {t.menu}
              </p>
              <ChevronDown size={12} className={`text-stone-400 transition-transform duration-200 ${menuOpen ? '' : '-rotate-90'}`} />
            </button>
            <AnimatePresence initial={false}>
              {menuOpen && (
                <motion.ul
                  key="menu"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-1 overflow-hidden"
                >
                  {menuItems.map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-stone-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </motion.ul>
              )}
            </AnimatePresence>
          </div>
        )}

        {budget && (
          <div className="rounded-xl bg-stone-50 border border-stone-100 p-3">
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
              {t.costSummary}
            </p>
            <div className="flex flex-col gap-1 text-xs">
              {([
                [t.ingredients, budget.rawMaterial],
                [t.overhead,    budget.overhead],
                [t.labour,      budget.labour],
                [t.transport,   budget.transport],
              ] as [string, number][])
                .filter(([, v]) => v > 0)
                .map(([label, value]) => (
                  <div key={label} className="flex justify-between text-stone-600">
                    <span>{label}</span>
                    <span className="tabular-nums">{fmt(value)}</span>
                  </div>
                ))}
              <div className="border-t border-stone-200 mt-1 pt-1 flex justify-between font-semibold text-stone-800">
                <span>{t.totalCost}</span>
                <span className="tabular-nums">{fmt(budget.subtotal)}</span>
              </div>
              {budget.marginRm && budget.marginPct && (
                <div className="flex justify-between text-stone-600">
                  <span>{t.margin} ({budget.marginPct}%)</span>
                  <span className="tabular-nums">{fmt(budget.marginRm)}</span>
                </div>
              )}
              {budget.quotation && (
                <div className="flex justify-between font-bold text-emerald-700 text-sm mt-0.5">
                  <span>{t.quotation}</span>
                  <span className="tabular-nums">{fmt(budget.quotation)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {finalSummary && (
          <p className="text-xs text-stone-500 leading-relaxed border-t border-stone-100 pt-3">
            {finalSummary}
          </p>
        )}

        <button
          onClick={() => generateQuotationPdf(data, 'katering', language)}
          className="flex items-center justify-center gap-2 w-full rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold py-2.5 transition-all cursor-pointer"
        >
          <Download size={14} />
          {t.download}
        </button>
      </div>
    </motion.div>
  );
}
