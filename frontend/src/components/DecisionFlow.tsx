import { motion } from 'framer-motion';
import type { AgentMessage } from '../types';

interface AgentCfg {
  emoji: string;
  actionLabels: Record<string, { ms: string; en: string }>;
}

const AGENT_CFG: Record<string, AgentCfg> = {
  Tok_Penghulu: {
    emoji: '👴🏽',
    actionLabels: {
      SESSION_OPEN:  { ms: 'Buka Sesi',  en: 'Session Open'  },
      SESSION_CLOSE: { ms: 'SELESAI',    en: 'DONE'          },
    },
  },
  Mak_Tok: {
    emoji: '👵🏽',
    actionLabels: {
      MENU_PROPOSAL: { ms: 'Cadang Menu', en: 'Menu Proposed' },
      MENU_REVISION: { ms: 'Revisi Menu', en: 'Menu Revised'  },
    },
  },
  Tokey_Pasar: {
    emoji: '🛒',
    actionLabels: {
      PRICE_REPORT: { ms: 'Semak Harga', en: 'Prices Checked' },
    },
  },
  Bendahari: {
    emoji: '📊',
    actionLabels: {
      BUDGET_AUDIT: { ms: 'Audit Bajet', en: 'Budget Audit' },
    },
  },
  Abang_Lorry: {
    emoji: '🚛',
    actionLabels: {
      LOGISTICS_PLAN: { ms: 'Jadual Logistik', en: 'Logistics Plan' },
    },
  },
};

interface Props {
  messages: AgentMessage[];
  language: 'ms' | 'en';
}

export function DecisionFlow({ messages, language }: Props) {
  const keyMessages = messages.filter(
    (m) => m.audit && m.audit.action !== 'SPEAK'
  );

  if (keyMessages.length === 0) {
    return (
      <div className="text-center py-8 text-stone-400 text-xs">
        {language === 'en'
          ? 'Decision flow will appear when agents start negotiating.'
          : 'Aliran keputusan akan muncul apabila ejen mula berunding.'}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex items-start gap-0 min-w-max px-2">
        {keyMessages.map((msg, i) => {
          const audit = msg.audit!;
          const cfg = AGENT_CFG[msg.agent];
          if (!cfg) return null;

          const isApproved = audit.status === 'APPROVED';
          const isRejected = audit.status === 'REJECTED';
          const isClose    = audit.action  === 'SESSION_CLOSE';

          const rawLabel = cfg.actionLabels[audit.action];
          const label = rawLabel ? rawLabel[language] : audit.action;

          const detail = (() => {
            const o = audit.key_outputs ?? {};
            if (audit.action === 'PRICE_REPORT' && o.total_ingredient_cost_myr)
              return `RM ${o.total_ingredient_cost_myr}`;
            if (audit.action === 'BUDGET_AUDIT' && o.quotation_myr)
              return `RM ${o.quotation_myr}`;
            return null;
          })();

          const nodeStyle = isRejected
            ? 'border-red-300 bg-red-50'
            : isApproved || isClose
            ? 'border-emerald-400 bg-emerald-50'
            : 'border-stone-200 bg-white';

          const icon = isRejected ? '❌' : isClose ? '✅' : cfg.emoji;

          return (
            <div key={i} className="flex items-center gap-0">
              <motion.div
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.08, type: 'spring', stiffness: 200 }}
                className="flex flex-col items-center gap-1.5 px-2"
              >
                {/* Node circle */}
                <div className={`w-11 h-11 rounded-full flex items-center justify-center text-xl border-2 shadow-sm ${nodeStyle}`}>
                  {icon}
                </div>

                {/* Action label */}
                <span className="text-xs font-semibold text-stone-700 text-center leading-tight max-w-[72px]">
                  {label}
                </span>

                {/* Detail (RM amount if available) */}
                {detail && (
                  <span className={`text-xs font-mono text-center ${isRejected ? 'text-red-600' : isApproved ? 'text-emerald-600' : 'text-stone-500'}`}>
                    {detail}
                  </span>
                )}

                {/* Status badge */}
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                  isRejected ? 'bg-red-100 text-red-700' :
                  isApproved ? 'bg-emerald-100 text-emerald-700' :
                  'bg-stone-100 text-stone-500'
                }`}>
                  {audit.status}
                </span>

                {/* Agent name */}
                <span className="text-xs text-stone-400">{msg.agent.replace('_', ' ')}</span>
              </motion.div>

              {/* Connector line */}
              {i < keyMessages.length - 1 && (
                <div className={`w-6 h-0.5 flex-shrink-0 mt-[-36px] ${isRejected ? 'bg-red-200' : 'bg-stone-200'}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
