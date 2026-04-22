import { motion } from 'framer-motion';
import { FileText, Download } from 'lucide-react';
import { generateQuotationPdf } from '../../utils/generatePdf';
import type { ParsedOutput } from '../../utils/parseMessages';

interface Props {
  data: ParsedOutput;
}

function fmt(n: number | null) {
  if (n === null) return '—';
  return `RM ${n.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function QuotationCard({ data }: Props) {
  const { budget, menuItems, totalPax, finalSummary } = data;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden"
    >
      {/* Header */}
      <div className="px-5 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <FileText size={16} />
              <span className="text-xs font-semibold uppercase tracking-widest opacity-80">
                Catering Quotation
              </span>
            </div>
            <p className="text-2xl font-bold font-display">
              {fmt(budget?.quotation ?? budget?.subtotal ?? null)}
            </p>
            {budget?.perHead && (
              <p className="text-xs opacity-80 mt-0.5">
                {fmt(budget.perHead)} per head · {totalPax ?? '—'} pax
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
            {budget?.isApproved ? '✓ APPROVED' : '✗ OVER BUDGET'}
          </span>
        </div>
      </div>

      <div className="p-5 flex flex-col gap-4">
        {/* Menu items */}
        {menuItems.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
              Confirmed Menu
            </p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1">
              {menuItems.map((item, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-stone-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Cost summary */}
        {budget && (
          <div className="rounded-xl bg-stone-50 border border-stone-100 p-3">
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
              Cost Summary
            </p>
            <div className="flex flex-col gap-1 text-xs">
              {[
                ['Ingredients',   budget.rawMaterial],
                ['Overhead',      budget.overhead],
                ['Labour',        budget.labour],
                ['Transport',     budget.transport],
              ]
                .filter(([, v]) => (v as number) > 0)
                .map(([label, value]) => (
                  <div key={label as string} className="flex justify-between text-stone-600">
                    <span>{label as string}</span>
                    <span className="tabular-nums">{fmt(value as number)}</span>
                  </div>
                ))}
              <div className="border-t border-stone-200 mt-1 pt-1 flex justify-between font-semibold text-stone-800">
                <span>Total Cost</span>
                <span className="tabular-nums">{fmt(budget.subtotal)}</span>
              </div>
              {budget.marginRm && budget.marginPct && (
                <div className="flex justify-between text-stone-600">
                  <span>Profit Margin ({budget.marginPct}%)</span>
                  <span className="tabular-nums">{fmt(budget.marginRm)}</span>
                </div>
              )}
              {budget.quotation && (
                <div className="flex justify-between font-bold text-emerald-700 text-sm mt-0.5">
                  <span>Quotation Price</span>
                  <span className="tabular-nums">{fmt(budget.quotation)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Final summary */}
        {finalSummary && (
          <p className="text-xs text-stone-500 leading-relaxed border-t border-stone-100 pt-3">
            {finalSummary}
          </p>
        )}

        <button
          onClick={() => generateQuotationPdf(data, 'katering')}
          className="flex items-center justify-center gap-2 w-full rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold py-2.5 transition-all cursor-pointer"
        >
          <Download size={14} />
          Download PDF Quotation
        </button>
      </div>
    </motion.div>
  );
}
