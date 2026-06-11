import axios from 'axios';
import type { ApiErrorBody } from '@/types';

export function getApiErrorMessage(
  error: unknown,
  fallback = 'Something went wrong. Please try again.',
): string {
  if (axios.isAxiosError(error)) {
    const body = error.response?.data as ApiErrorBody | undefined;
    if (body?.error?.message) return body.error.message;
    if (error.response?.status === 401) return 'Invalid email or password';
    if (!error.response || error.code === 'ECONNABORTED') {
      return fallback;
    }
    if (error.response.status >= 500) {
      return 'Something went wrong. Please try again later.';
    }
    return fallback;
  }
  if (error instanceof Error && error.message) {
    return fallback;
  }
  return fallback;
}
