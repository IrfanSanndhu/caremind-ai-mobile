import { Platform } from 'react-native';
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

function getAuthHeader(): string {
  return `Bearer ${sseToken}`;
}

function processSseLines(
  lines: string[],
  onChunk: (chunk: string) => void,
  onEscalated: () => void,
  onError: (error: string) => void,
): boolean {
  for (const line of lines) {
    if (!line.startsWith('data: ')) continue;
    const jsonStr = line.slice(6).trim();
    if (!jsonStr || jsonStr === '[DONE]') continue;

    try {
      const parsed = JSON.parse(jsonStr) as StreamChunk;
      if (parsed.error) {
        onError(parsed.error);
        return true;
      }
      if (parsed.escalated) onEscalated();
      if (parsed.chunk) onChunk(parsed.chunk);
      if (parsed.done) return true;
    } catch {
      // skip malformed lines
    }
  }
  return false;
}

function streamChatWithXhr(
  payload: ChatRequest,
  onChunk: (chunk: string) => void,
  onDone: (escalated: boolean) => void,
  onError: (error: string) => void,
  signal?: AbortSignal,
  onAbort?: () => void,
): void {
  const xhr = new XMLHttpRequest();
  let lastIndex = 0;
  let pending = '';
  let escalated = false;
  let finished = false;

  const finish = (isEscalated: boolean) => {
    if (finished) return;
    finished = true;
    onDone(isEscalated);
  };

  const processNewText = (text: string) => {
    pending += text;
    const lines = pending.split('\n');
    pending = lines.pop() ?? '';
    const shouldStop = processSseLines(
      lines,
      onChunk,
      () => {
        escalated = true;
      },
      (error) => {
        finished = true;
        onError(error);
      },
    );
    if (shouldStop) finish(escalated);
  };

  xhr.open('POST', `${getApiBaseUrl()}/api/ai/chat/stream`);
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.setRequestHeader('Authorization', getAuthHeader());

  xhr.onprogress = () => {
    const newText = xhr.responseText.slice(lastIndex);
    lastIndex = xhr.responseText.length;
    if (newText) processNewText(newText);
  };

  xhr.onload = () => {
    if (finished) return;
    if (xhr.status < 200 || xhr.status >= 300) {
      onError(`HTTP ${xhr.status}`);
      return;
    }
    const newText = xhr.responseText.slice(lastIndex);
    lastIndex = xhr.responseText.length;
    if (newText) processNewText(newText);
    if (pending.trim()) {
      processSseLines(
        [pending],
        onChunk,
        () => {
          escalated = true;
        },
        (error) => {
          finished = true;
          onError(error);
        },
      );
      pending = '';
    }
    finish(escalated);
  };

  xhr.onerror = () => {
    if (!finished) onError('Network request failed');
  };

  xhr.onabort = () => {
    if (!finished) onAbort?.();
  };

  if (signal) {
    if (signal.aborted) {
      xhr.abort();
      return;
    }
    signal.addEventListener('abort', () => xhr.abort(), { once: true });
  }

  xhr.send(JSON.stringify(payload));
}

async function streamChatWithFetch(
  payload: ChatRequest,
  onChunk: (chunk: string) => void,
  onDone: (escalated: boolean) => void,
  onError: (error: string) => void,
  signal?: AbortSignal,
  onAbort?: () => void,
): Promise<void> {
  const response = await fetch(`${getApiBaseUrl()}/api/ai/chat/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
    },
    body: JSON.stringify(payload),
    signal,
  });

  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let escalated = false;
  let pending = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    pending += decoder.decode(value, { stream: true });
    const lines = pending.split('\n');
    pending = lines.pop() ?? '';
    const shouldStop = processSseLines(
      lines,
      onChunk,
      () => {
        escalated = true;
      },
      onError,
    );
    if (shouldStop) return;
  }

  if (pending.trim()) {
    processSseLines(
      [pending],
      onChunk,
      () => {
        escalated = true;
      },
      onError,
    );
  }

  onDone(escalated);
}

/** Reveal a complete response progressively (used for non-streaming copilot API). */
export async function revealTextProgressively(
  text: string,
  onChunk: (chunk: string) => void,
  signal?: AbortSignal,
  chunkSize = 4,
  delayMs = 14,
): Promise<void> {
  for (let index = 0; index < text.length; index += chunkSize) {
    if (signal?.aborted) {
      const error = new Error('Aborted');
      error.name = 'AbortError';
      throw error;
    }
    onChunk(text.slice(index, index + chunkSize));
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
}

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
    const handleError = (err: unknown) => {
      if (err instanceof Error && err.name === 'AbortError') {
        onAbort?.();
        return;
      }
      if (err instanceof Error) {
        onError(err.message);
      } else {
        onError('Request failed');
      }
    };

    if (Platform.OS === 'web') {
      void streamChatWithFetch(payload, onChunk, onDone, onError, signal, onAbort).catch(handleError);
      return;
    }

    streamChatWithXhr(payload, onChunk, onDone, onError, signal, onAbort);
  },
};

export const aiKeys = {
  all: ['ai'] as const,
};

export function exposeTokenForSSE(token: string): void {
  sseToken = token;
}
