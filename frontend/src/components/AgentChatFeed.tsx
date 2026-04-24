import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChefHat, Calculator, ShoppingBasket, Truck, Crown, UserCheck, Eye } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useChatStore } from '../store/chatStore';
import type { AgentMessage } from '../types';

const AGENT_META: Record<string, {
  Icon: React.ElementType;
  border: string;
  badge: string;
  nameCls: string;
  emoji: string;
}> = {
  Pelanggan:    { Icon: UserCheck,     border: 'border-l-teal-400',    badge: 'bg-teal-100 text-teal-700',      nameCls: 'text-teal-700',    emoji: '👤' },
  Tok_Penghulu: { Icon: Crown,         border: 'border-l-emerald-500', badge: 'bg-emerald-100 text-emerald-700', nameCls: 'text-emerald-700', emoji: '👴🏽' },
  Mak_Tok:      { Icon: ChefHat,       border: 'border-l-rose-400',    badge: 'bg-rose-100 text-rose-700',      nameCls: 'text-rose-700',    emoji: '👵🏽' },
  Tokey_Pasar:  { Icon: ShoppingBasket,border: 'border-l-blue-400',    badge: 'bg-blue-100 text-blue-700',      nameCls: 'text-blue-700',    emoji: '🛒' },
  Bendahari:    { Icon: Calculator,    border: 'border-l-amber-400',   badge: 'bg-amber-100 text-amber-700',    nameCls: 'text-amber-700',   emoji: '💰' },
  Abang_Lorry:  { Icon: Truck,         border: 'border-l-purple-400',  badge: 'bg-purple-100 text-purple-700',  nameCls: 'text-purple-700',  emoji: '🚛' },
  Pemantau:     { Icon: Eye,           border: 'border-l-indigo-400',  badge: 'bg-indigo-100 text-indigo-700',  nameCls: 'text-indigo-700',  emoji: '🔍' },
};

const DEFAULT_META = { Icon: Crown, border: 'border-l-stone-300', badge: 'bg-stone-100 text-stone-600', nameCls: 'text-stone-600', emoji: '🤖' };

interface Props {
  messages: AgentMessage[];
  typingAgent: string | null;
  status: string;
}

export function AgentChatFeed({ messages, typingAgent, status }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingAgent]);

  if (messages.length === 0 && !typingAgent && status === 'idle') return null;

  return (
    <div className="flex flex-col gap-3">
      <AnimatePresence initial={false}>
        {messages.map((msg, i) => (
          <MessageBubble key={i} msg={msg} index={i} />
        ))}
      </AnimatePresence>

      <AnimatePresence>
        {typingAgent && <TypingBubble key="typing" agent={typingAgent} />}
      </AnimatePresence>

      {status === 'done' && messages.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-2"
        >
          <span className="text-xs text-stone-400 bg-white px-4 py-1.5 rounded-full border border-stone-200 shadow-sm">
            ✅ Semua ejen telah selesai berunding
          </span>
        </motion.div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}

function getVerdictStyle(agent: string, content: string): { bg: string; badge: string | null } {
  if (agent !== 'Bendahari') return { bg: 'bg-white', badge: null };
  const isRejected = /GAGAL|OVER BAJET|OVER BUDGET|FAILED/i.test(content);
  const isApproved = /\bLULUS\b|\bAPPROVED\b/i.test(content);
  if (isRejected) return { bg: 'bg-red-50', badge: '❌ Budget Rejected' };
  if (isApproved) return { bg: 'bg-emerald-50', badge: '✅ Budget Approved' };
  return { bg: 'bg-white', badge: null };
}

const MD_COMPONENTS = {
  p: ({ children }: { children?: React.ReactNode }) => <p className="mb-1.5 last:mb-0 leading-relaxed">{children}</p>,
  strong: ({ children }: { children?: React.ReactNode }) => <strong className="font-semibold text-stone-800">{children}</strong>,
  h1: ({ children }: { children?: React.ReactNode }) => <h1 className="text-base font-bold text-stone-800 mt-3 mb-1">{children}</h1>,
  h2: ({ children }: { children?: React.ReactNode }) => <h2 className="text-sm font-bold text-stone-800 mt-2.5 mb-1">{children}</h2>,
  h3: ({ children }: { children?: React.ReactNode }) => <h3 className="text-sm font-semibold text-stone-700 mt-2 mb-0.5">{children}</h3>,
  ul: ({ children }: { children?: React.ReactNode }) => <ul className="list-disc list-inside space-y-0.5 my-1">{children}</ul>,
  ol: ({ children }: { children?: React.ReactNode }) => <ol className="list-decimal list-inside space-y-0.5 my-1">{children}</ol>,
  li: ({ children }: { children?: React.ReactNode }) => <li className="text-sm text-stone-700">{children}</li>,
  hr: () => <hr className="border-stone-200 my-2" />,
  code: ({ children }: { children?: React.ReactNode }) => <code className="bg-stone-100 px-1 py-0.5 rounded text-xs font-mono">{children}</code>,
  blockquote: ({ children }: { children?: React.ReactNode }) => <blockquote className="border-l-2 border-stone-300 pl-3 italic text-stone-500 my-1">{children}</blockquote>,
};

function MessageBubble({ msg, index }: { msg: AgentMessage; index: number }) {
  const meta = AGENT_META[msg.agent] ?? DEFAULT_META;
  const { Icon } = meta;
  const verdict = getVerdictStyle(msg.agent, msg.content);
  const [ragOpen, setRagOpen] = useState(false);

  // Split RAG block out of message content
  const ragMarker = '📚';
  const ragIdx = msg.content.indexOf(ragMarker);
  const mainContent = ragIdx > 0 ? msg.content.slice(0, ragIdx).trim() : msg.content;
  const ragContent  = ragIdx > 0 ? msg.content.slice(ragIdx).trim() : null;

  return (
    <motion.div
      initial={{ opacity: 0, x: -12, y: 4 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, delay: index === 0 ? 0 : 0.05 }}
      className={`${verdict.bg} rounded-xl border border-stone-100 border-l-4 ${meta.border} p-4 shadow-sm flex gap-3`}
    >
      <div className={`flex-shrink-0 mt-0.5 w-7 h-7 rounded-full flex items-center justify-center text-sm ${meta.badge}`}>
        <Icon size={14} />
      </div>
      <div className="flex flex-col gap-1.5 min-w-0 flex-1">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className={`text-xs font-bold uppercase tracking-wide ${meta.nameCls}`}>
            {msg.agent.replace(/_/g, ' ')}
          </span>
          <span className="text-xs text-stone-400">
            {new Date(msg.timestamp).toLocaleTimeString('ms-MY', {
              hour: '2-digit', minute: '2-digit', second: '2-digit',
            })}
          </span>
          {verdict.badge && (
            <span className={[
              'ml-auto text-xs font-bold px-2 py-0.5 rounded-full',
              verdict.badge.startsWith('❌')
                ? 'bg-red-100 text-red-700'
                : 'bg-emerald-100 text-emerald-700',
            ].join(' ')}>
              {verdict.badge}
            </span>
          )}
        </div>

        {/* Main content */}
        <div className="prose prose-sm prose-stone max-w-none text-stone-700">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD_COMPONENTS}>
            {mainContent}
          </ReactMarkdown>
        </div>

        {/* RAG context — collapsed by default */}
        {ragContent && (
          <div className="mt-1">
            <button
              onClick={() => setRagOpen((v) => !v)}
              className="flex items-center gap-1.5 text-xs text-stone-400 hover:text-stone-600 transition-colors cursor-pointer"
            >
              <span>{ragOpen ? '▲' : '▼'}</span>
              <span className="font-mono">📚 KB Context</span>
            </button>
            <AnimatePresence initial={false}>
              {ragOpen && (
                <motion.div
                  key="rag"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="mt-1.5 rounded-lg bg-stone-50 border border-stone-200 px-3 py-2 text-xs text-stone-500 font-mono whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                    {ragContent}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  );
}

const AGENT_DOT_COLOR: Record<string, string> = {
  Pelanggan:    'bg-teal-400',
  Tok_Penghulu: 'bg-emerald-500',
  Mak_Tok:      'bg-rose-400',
  Tokey_Pasar:  'bg-blue-400',
  Bendahari:    'bg-amber-400',
  Abang_Lorry:  'bg-purple-400',
  Pemantau:     'bg-indigo-400',
};

function TypingBubble({ agent }: { agent: string }) {
  const meta = AGENT_META[agent] ?? DEFAULT_META;
  const { Icon } = meta;
  const dotColor = AGENT_DOT_COLOR[agent] ?? 'bg-stone-400';
  const language = useChatStore((s) => s.language);
  const thinkingText = language === 'en' ? 'is thinking…' : 'sedang berfikir…';

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -8 }}
      transition={{ duration: 0.2 }}
      className={`relative overflow-hidden bg-white rounded-xl border border-stone-100 border-l-4 ${meta.border} p-4 shadow-sm flex gap-3`}
    >
      {/* Shimmer sweep */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent"
        animate={{ x: ['-100%', '100%'] }}
        transition={{ repeat: Infinity, duration: 1.6, ease: 'linear' }}
      />

      <div className={`relative flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm ${meta.badge}`}>
        <Icon size={14} />
      </div>
      <div className="relative flex flex-col gap-2">
        <span className={`text-xs font-bold uppercase tracking-wide ${meta.nameCls}`}>
          {agent.replace(/_/g, ' ')}
        </span>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 items-center">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                animate={{ y: [0, -5, 0], opacity: [0.5, 1, 0.5] }}
                transition={{ repeat: Infinity, duration: 0.9, delay: i * 0.18, ease: 'easeInOut' }}
                className={`w-1.5 h-1.5 rounded-full ${dotColor}`}
              />
            ))}
          </div>
          <span className="text-xs text-stone-400 italic">{thinkingText}</span>
        </div>
      </div>
    </motion.div>
  );
}
