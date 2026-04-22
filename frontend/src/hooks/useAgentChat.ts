import { useCallback, useRef } from 'react';
import { useChatStore } from '../store/chatStore';
import type { CateringRequest, SSEEvent } from '../types';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

const getStatus = () => useChatStore.getState().status;

function categoriseError(status: number | null, err?: unknown): string {
  if (status === null) {
    // No HTTP response — backend not reachable
    return 'Backend tidak dapat dihubungi. Pastikan server berjalan pada port 8000.';
  }
  if (status === 401 || status === 403) {
    return 'Akses ditolak. Semak konfigurasi Azure OpenAI.';
  }
  if (status === 422) {
    return 'Data borang tidak lengkap. Sila semak semua medan wajib.';
  }
  if (status >= 500) {
    return 'Ralat server dalaman. Semak log backend untuk butiran.';
  }
  if (err instanceof Error) return err.message;
  return 'Ralat sambungan yang tidak diketahui.';
}

export function useAgentChat() {
  const store = useChatStore();
  const esRef = useRef<EventSource | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connectStream = useCallback((sessionId: string, attempt: number) => {
    if (esRef.current) esRef.current.close();

    const es = new EventSource(`/api/chat/${sessionId}/stream`);
    esRef.current = es;

    es.onmessage = (e) => {
      const event: SSEEvent = JSON.parse(e.data);

      if (event.type === 'agent_message' && event.agent && event.content) {
        useChatStore.getState().setTypingAgent(event.agent);
        useChatStore.getState().addMessage({
          agent: event.agent,
          content: event.content,
          timestamp: event.timestamp ?? new Date().toISOString(),
        });
        setTimeout(() => useChatStore.getState().setTypingAgent(null), 800);
      }

      if (event.type === 'done') {
        useChatStore.getState().setStatus('done');
        useChatStore.getState().setTypingAgent(null);
        es.close();
      }

      if (event.type === 'error') {
        useChatStore.getState().setError(event.message ?? 'Unknown error from agent');
        useChatStore.getState().setTypingAgent(null);
        es.close();
      }
    };

    es.onerror = () => {
      const currentStatus = getStatus();
      if (currentStatus === 'done') {
        es.close();
        return;
      }

      es.close();

      if (attempt < MAX_RETRIES) {
        useChatStore.getState().setReconnecting(attempt + 1);
        retryTimerRef.current = setTimeout(() => {
          connectStream(sessionId, attempt + 1);
        }, RETRY_DELAY_MS);
      } else {
        useChatStore.getState().setError(
          `Sambungan terputus selepas ${MAX_RETRIES} percubaan. Pastikan backend berjalan dan cuba semula.`
        );
      }
    };
  }, []);

  const startChat = useCallback(async (request: CateringRequest) => {
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    store.reset();
    store.setMode(request.mode);
    store.setLanguage(request.language);
    store.setStatus('loading');

    let httpStatus: number | null = null;
    try {
      const res = await fetch('/api/chat/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });
      httpStatus = res.status;

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        let msg = categoriseError(httpStatus);
        if (body?.detail) {
          if (Array.isArray(body.detail)) {
            msg = body.detail
              .map((e: { msg: string; loc: string[] }) =>
                `${e.loc?.slice(-1)[0] ?? 'field'}: ${e.msg}`
              )
              .join(', ');
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

      connectStream(sessionId, 0);
    } catch (err) {
      store.setError(categoriseError(httpStatus, err));
    }
  }, [store, connectStream]);

  const stopChat = useCallback(() => {
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    esRef.current?.close();
    store.reset();
  }, [store]);

  return { ...store, startChat, stopChat };
}
