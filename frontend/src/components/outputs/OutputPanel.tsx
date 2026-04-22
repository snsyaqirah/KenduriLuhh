import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { HalalBadge } from './HalalBadge';
import { BudgetBreakdown } from './BudgetBreakdown';
import { LogisticsTimeline } from './LogisticsTimeline';
import { QuotationCard } from './QuotationCard';
import { ShoppingList } from './ShoppingList';
import { parseMessages } from '../../utils/parseMessages';
import type { AgentMessage, Language, Mode } from '../../types';

interface Props {
  messages: AgentMessage[];
  mode: Mode;
  language: Language;
  onReset: () => void;
}

export function OutputPanel({ messages, mode, language, onReset }: Props) {
  const data = useMemo(() => parseMessages(messages, mode, language), [messages, mode, language]);
  const resetLabel = language === 'en' ? '+ Plan New Event' : '+ Rancang Majlis Baru';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col gap-4"
    >
      <HalalBadge isHalal={data.isHalal} language={language} />

      {mode === 'katering' ? (
        <QuotationCard data={data} language={language} />
      ) : (
        <ShoppingList data={data} language={language} />
      )}

      {data.budget && (
        <BudgetBreakdown budget={data.budget} mode={mode} language={language} />
      )}

      {data.logistics.length > 0 && (
        <LogisticsTimeline events={data.logistics} language={language} />
      )}

      <button
        onClick={onReset}
        className="w-full rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-sm font-semibold py-3 transition-all cursor-pointer shadow-sm"
      >
        {resetLabel}
      </button>
    </motion.div>
  );
}
