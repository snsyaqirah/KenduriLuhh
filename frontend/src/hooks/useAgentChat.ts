import { useCallback, useRef } from 'react';
import { useChatStore } from '../store/chatStore';
import type { CateringRequest, SSEEvent } from '../types';

// Read current status without a stale closure
const getStatus = () => useChatStore.getState().status;

export function useAgentChat() {
  const store = useChatStore();
  const esRef = useRef<EventSource | null>(null);

  const startChat = useCallback(async (request: CateringRequest) => {
    store.reset();
    store.setMode(request.mode);
    store.setStatus('loading');

    try {
      const res = await fetch('/api/chat/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        // FastAPI 422 detail is an array of validation errors
        let msg = 'Permintaan gagal dihantar.';
        if (body?.detail) {
          if (Array.isArray(body.detail)) {
            msg = body.detail.map((e: { msg: string; loc: string[] }) =>
              `${e.loc?.slice(-1)[0] ?? 'field'}: ${e.msg}`
            ).join(', ');
          } else {
            msg = String(body.detail);
          }
        }
        store.setError(msg);
        return;
      }

      const data = await res.json();
      const sessionId: string = data.session_id;
      store.setSessionId(sessionId);
      store.setStatus('running');

      if (esRef.current) esRef.current.close();
      const es = new EventSource(`/api/chat/${sessionId}/stream`);
      esRef.current = es;

      es.onmessage = (e) => {
        const event: SSEEvent = JSON.parse(e.data);

        if (event.type === 'agent_message' && event.agent && event.content) {
          store.setTypingAgent(event.agent);
          store.addMessage({
            agent: event.agent,
            content: event.content,
            timestamp: event.timestamp ?? new Date().toISOString(),
          });
          setTimeout(() => store.setTypingAgent(null), 800);
        }

        if (event.type === 'done') {
          store.setStatus('done');
          store.setTypingAgent(null);
          es.close();
        }

        if (event.type === 'error') {
          store.setError(event.message ?? 'Unknown error from agent');
          store.setTypingAgent(null);
          es.close();
        }
      };

      es.onerror = () => {
        // Use getState() to avoid stale closure — onerror fires when server
        // closes the connection normally too, so only error if not already done.
        if (getStatus() !== 'done') {
          store.setError('Sambungan terputus. Pastikan backend berjalan dan cuba semula.');
        }
        es.close();
      };
    } catch (err) {
      store.setError(err instanceof Error ? err.message : 'Network error');
    }
  }, [store]);

  const stopChat = useCallback(() => {
    esRef.current?.close();
    store.reset();
  }, [store]);

  return { ...store, startChat, stopChat };
}
