import { create } from 'zustand';
import type { AgentMessage, CateringRequest, Language, Mode } from '../types';

export type Status = 'idle' | 'loading' | 'running' | 'reconnecting' | 'done' | 'error';

interface ChatStore {
  mode: Mode;
  language: Language;
  sessionId: string | null;
  messages: AgentMessage[];
  status: Status;
  error: string | null;
  typingAgent: string | null;
  doneAgents: string[];
  retryAttempt: number;
  originalRequest: CateringRequest | null;   // stored for guest spike re-submit

  setMode: (mode: Mode) => void;
  setLanguage: (lang: Language) => void;
  setSessionId: (id: string) => void;
  addMessage: (msg: AgentMessage) => void;
  setStatus: (s: Status) => void;
  setError: (e: string) => void;
  setTypingAgent: (agent: string | null) => void;
  markAgentDone: (agent: string) => void;
  setReconnecting: (attempt: number) => void;
  setOriginalRequest: (req: CateringRequest) => void;
  reset: () => void;
}

const initialState = {
  mode: 'katering' as Mode,
  language: 'ms' as Language,
  sessionId: null,
  messages: [],
  status: 'idle' as Status,
  error: null,
  typingAgent: null,
  doneAgents: [],
  retryAttempt: 0,
  originalRequest: null,
};

export const useChatStore = create<ChatStore>((set) => ({
  ...initialState,

  setMode: (mode) => set({ mode }),
  setLanguage: (language) => set({ language }),
  setSessionId: (sessionId) => set({ sessionId }),
  addMessage: (msg) =>
    set((s) => ({
      messages: [...s.messages, msg],
      doneAgents: s.doneAgents.includes(msg.agent)
        ? s.doneAgents
        : [...s.doneAgents, msg.agent],
    })),
  setStatus: (status) => set({ status }),
  setError: (error) => set({ error, status: 'error' }),
  setTypingAgent: (typingAgent) => set({ typingAgent }),
  markAgentDone: (agent) =>
    set((s) => ({
      doneAgents: s.doneAgents.includes(agent) ? s.doneAgents : [...s.doneAgents, agent],
    })),
  setReconnecting: (attempt) => set({ status: 'reconnecting', retryAttempt: attempt }),
  setOriginalRequest: (originalRequest) => set({ originalRequest }),
  reset: () => set(initialState),
}));
