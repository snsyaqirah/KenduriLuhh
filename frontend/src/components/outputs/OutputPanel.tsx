import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { HalalBadge } from './HalalBadge';
import { BudgetBreakdown } from './BudgetBreakdown';
import { LogisticsTimeline } from './LogisticsTimeline';
import { QuotationCard } from './QuotationCard';
import { ShoppingList } from './ShoppingList';
import { parseMessages } from '../../utils/parseMessages';
import type { AgentMessage, Mode } from '../../types';

interface Props {
  messages: AgentMessage[];
  mode: Mode;
  onReset: () => void;
}

export function OutputPanel({ messages, mode, onReset }: Props) {
  const data = useMemo(() => parseMessages(messages, mode), [messages, mode]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col gap-4"
    >
      {/* Halal badge */}
      <HalalBadge isHalal={data.isHalal} />

      {/* Main card — Quotation or Shopping List */}
      {mode === 'katering' ? (
        <QuotationCard data={data} />
      ) : (
        <ShoppingList data={data} />
      )}

      {/* Budget chart */}
      {data.budget && (
        <BudgetBreakdown budget={data.budget} mode={mode} />
      )}

      {/* Logistics timeline */}
      {data.logistics.length > 0 && (
        <LogisticsTimeline events={data.logistics} />
      )}

      {/* New planning CTA */}
      <button
        onClick={onReset}
        className="w-full rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-sm font-semibold py-3 transition-all cursor-pointer shadow-sm"
      >
        + Plan New Event
      </button>
    </motion.div>
  );
}
