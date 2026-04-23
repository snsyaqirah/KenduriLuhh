import { useState } from 'react';
import type { AgentMessage } from '../types';

const AGENT_STYLE: Record<string, string> = {
  Tok_Penghulu: 'border-purple-200 bg-purple-50  text-purple-800',
  Mak_Tok:      'border-amber-200  bg-amber-50   text-amber-800',
  Tokey_Pasar:  'border-cyan-200   bg-cyan-50    text-cyan-800',
  Bendahari:    'border-emerald-200 bg-emerald-50 text-emerald-800',
  Abang_Lorry:  'border-blue-200   bg-blue-50    text-blue-800',
};

const STATUS_STYLE: Record<string, string> = {
  SUCCESS:  'bg-stone-100  text-stone-600',
  APPROVED: 'bg-emerald-100 text-emerald-700',
  REJECTED: 'bg-red-100    text-red-700',
  ERROR:    'bg-red-100    text-red-700',
};

interface Props {
  messages: AgentMessage[];
  language: 'ms' | 'en';
}

export function AuditLogPanel({ messages, language }: Props) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const auditMessages = messages.filter((m) => m.audit);

  if (auditMessages.length === 0) {
    return (
      <div className="text-center py-8 text-stone-400 text-xs">
        {language === 'en'
          ? 'Audit log will appear as agents make decisions.'
          : 'Log audit akan muncul apabila ejen membuat keputusan.'}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs text-stone-400 mb-1">
        {language === 'en'
          ? `${auditMessages.length} agent actions traced`
          : `${auditMessages.length} tindakan ejen dikesan`}
      </p>

      {auditMessages.map((msg, i) => {
        const audit = msg.audit!;
        const agentStyle = AGENT_STYLE[msg.agent] ?? 'border-stone-200 bg-stone-50 text-stone-700';
        const statusStyle = STATUS_STYLE[audit.status] ?? 'bg-stone-100 text-stone-600';
        const isExpanded = expanded === i;

        const auditJson = {
          agent: msg.agent,
          action: audit.action,
          status: audit.status,
          key_outputs: audit.key_outputs ?? {},
          timestamp: msg.timestamp,
        };

        return (
          <div key={i} className={`rounded-lg border text-xs overflow-hidden ${agentStyle}`}>
            <button
              onClick={() => setExpanded(isExpanded ? null : i)}
              className="w-full text-left px-3 py-2 flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer"
            >
              <span className={`px-1.5 py-0.5 rounded font-bold flex-shrink-0 ${statusStyle}`}>
                {audit.status}
              </span>
              <span className="font-semibold flex-shrink-0">{msg.agent}</span>
              <span className="opacity-60 truncate font-mono">→ {audit.action}</span>
              <span className="ml-auto flex-shrink-0 opacity-50">{isExpanded ? '▲' : '▼'}</span>
            </button>

            {isExpanded && (
              <div className="px-3 py-2 border-t border-current border-opacity-20 bg-white bg-opacity-70">
                <pre className="text-xs font-mono whitespace-pre-wrap break-all leading-relaxed text-stone-700">
                  {JSON.stringify(auditJson, null, 2)}
                </pre>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
