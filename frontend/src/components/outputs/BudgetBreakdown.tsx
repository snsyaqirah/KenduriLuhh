import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { motion } from 'framer-motion';
import type { BudgetData } from '../../utils/parseMessages';

interface Props {
  budget: BudgetData;
  mode: 'katering' | 'rewang';
}

const SLICES = [
  { key: 'rawMaterial', label: 'Ingredients',  color: '#10b981' },
  { key: 'overhead',    label: 'Overhead',      color: '#f59e0b' },
  { key: 'labour',      label: 'Labour',        color: '#3b82f6' },
  { key: 'transport',   label: 'Transport',     color: '#8b5cf6' },
  { key: 'marginRm',    label: 'Profit Margin', color: '#6b7280' },
] as const;

function fmt(n: number | null) {
  if (n === null || n === 0) return null;
  return `RM ${n.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function BudgetBreakdown({ budget, mode }: Props) {
  const data = SLICES
    .map((s) => ({ name: s.label, value: budget[s.key] ?? 0, color: s.color }))
    .filter((d) => d.value > 0);

  const summaryRows = [
    { label: 'Ingredients',  value: fmt(budget.rawMaterial) },
    { label: 'Overhead',     value: fmt(budget.overhead) },
    { label: 'Labour',       value: fmt(budget.labour) },
    { label: 'Transport',    value: fmt(budget.transport) },
    { label: 'Total Cost',   value: fmt(budget.subtotal),  bold: true },
    ...(mode === 'katering' && budget.marginRm
      ? [{ label: `Margin (${budget.marginPct ?? ''}%)`, value: fmt(budget.marginRm) }]
      : []),
    ...(mode === 'katering' && budget.quotation
      ? [{ label: 'Quotation Price', value: fmt(budget.quotation), highlight: true }]
      : []),
    ...(budget.perHead ? [{ label: 'Per Head', value: fmt(budget.perHead) }] : []),
  ].filter((r) => r.value);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden"
    >
      <div className="px-4 py-3 border-b border-stone-100 bg-stone-50 flex items-center gap-2">
        <span>💰</span>
        <h4 className="text-xs font-semibold text-stone-600 uppercase tracking-widest">
          Budget Breakdown
        </h4>
        <span
          className={[
            'ml-auto text-xs font-bold px-2 py-0.5 rounded-full',
            budget.isApproved
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-red-100 text-red-700',
          ].join(' ')}
        >
          {budget.isApproved ? '✓ Approved' : '✗ Over Budget'}
        </span>
      </div>

      <div className="p-4 flex flex-col gap-4">
        {/* Horizontal bar chart */}
        {data.length > 0 && (
          <div style={{ height: data.length * 36 + 16 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={data}
                margin={{ top: 0, right: 8, left: 0, bottom: 0 }}
                barSize={18}
              >
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={88}
                  tick={{ fontSize: 11, fill: '#78716c' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: '#f5f5f4' }}
                  formatter={(value) =>
                    typeof value === 'number'
                      ? `RM ${value.toLocaleString('en-MY', { minimumFractionDigits: 2 })}`
                      : String(value)
                  }
                  contentStyle={{
                    fontSize: 11,
                    borderRadius: 8,
                    border: '1px solid #e7e5e4',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {data.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Summary rows */}
        <div className="flex flex-col divide-y divide-stone-100">
          {summaryRows.map((row, i) => (
            <div
              key={i}
              className={[
                'flex justify-between items-center py-1.5 text-xs',
                (row as { highlight?: boolean }).highlight
                  ? 'text-emerald-700 font-bold'
                  : (row as { bold?: boolean }).bold
                    ? 'text-stone-800 font-semibold'
                    : 'text-stone-600',
              ].join(' ')}
            >
              <span>{row.label}</span>
              <span className="tabular-nums">{row.value}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
