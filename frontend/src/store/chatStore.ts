import { create } from 'zustand';
import type { AgentMessage, Mode } from '../types';

export type Status = 'idle' | 'loading' | 'running' | 'done' | 'error';

interface ChatStore {
  mode: Mode;
  sessionId: string | null;
  messages: AgentMessage[];
  status: Status;
  error: string | null;
  typingAgent: string | null;
  doneAgents: string[];

  setMode: (mode: Mode) => void;
  setSessionId: (id: string) => void;
  addMessage: (msg: AgentMessage) => void;
  setStatus: (s: Status) => void;
  setError: (e: string) => void;
  setTypingAgent: (agent: string | null) => void;
  markAgentDone: (agent: string) => void;
  reset: () => void;
}

const initialState = {
  mode: 'katering' as Mode,
  sessionId: null,
  messages: [],
  status: 'idle' as Status,
  error: null,
  typingAgent: null,
  doneAgents: [],
};

export const useChatStore = create<ChatStore>((set) => ({
  ...initialState,

  setMode: (mode) => set({ mode }),
  setSessionId: (sessionId) => set({ sessionId }),
  addMessage: (msg) =>
    set((s) => ({
      messages: [...s.messages, msg],
      // track which agents have spoken at least once
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
  reset: () => set(initialState),
}));
