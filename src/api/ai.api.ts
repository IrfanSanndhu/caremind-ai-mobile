import { apiClient, unwrap } from './client';
import { getApiBaseUrl } from '@/lib/env';

export interface ChatRequest {
  message: string;
  appointmentId?: string;
  patientId?: string;
  isDoctorCopilot?: boolean;
}

export interface ChatResponse {
  message: string;
  escalated: boolean;
  sessionId?: string;
}

export interface StreamChunk {
  chunk?: string;
  done?: boolean;
  escalated?: boolean;
  error?: string;
}

let sseToken = '';

export const aiApi = {
  chat: async (payload: ChatRequest): Promise<ChatResponse> => {
    const res = await apiClient.post('/api/ai/chat', payload);
    return unwrap(res);
  },

  doctorCopilot: async (
    params: { patientId: string; q: string },
    signal?: AbortSignal,
  ): Promise<{ response: string; escalated: boolean }> => {
    const res = await apiClient.get(`/api/ai/doctor-copilot/${params.patientId}`, {
      params: { q: params.q },
      signal,
    });
    return unwrap(res);
  },

  streamChat: (
    payload: ChatRequest,
    onChunk: (chunk: string) => void,
    onDone: (escalated: boolean) => void,
    onError: (error: string) => void,
    signal?: AbortSignal,
    onAbort?: () => void,
  ): void => {
    fetch(`${getApiBaseUrl()}/api/ai/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sseToken}`,
      },
      body: JSON.stringify(payload),
      signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const reader = response.body?.getReader();
        if (!reader) throw new Error('No response body');

        const decoder = new TextDecoder();
        let escalated = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value, { stream: true });
          const lines = text.split('\n');

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const jsonStr = line.slice(6).trim();
            if (!jsonStr || jsonStr === '[DONE]') continue;

            try {
              const parsed = JSON.parse(jsonStr) as StreamChunk;
              if (parsed.error) {
                onError(parsed.error);
                return;
              }
              if (parsed.escalated) escalated = true;
              if (parsed.chunk) onChunk(parsed.chunk);
              if (parsed.done) {
                onDone(escalated);
                return;
              }
            } catch {
              // skip malformed lines
            }
          }
        }

        onDone(escalated);
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === 'AbortError') {
          onAbort?.();
          return;
        }
        if (err instanceof Error) {
          onError(err.message);
        } else {
          onError('Request failed');
        }
      });
  },
};

export const aiKeys = {
  all: ['ai'] as const,
};

export function exposeTokenForSSE(token: string): void {
  sseToken = token;
}
