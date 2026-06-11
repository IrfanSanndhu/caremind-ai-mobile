import axios, { type AxiosInstance, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import type { ApiResponse } from '@/types';
import { getApiBaseUrl } from '@/lib/env';
import { redirectToLogin } from '@/lib/navigation';

export const apiClient: AxiosInstance = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

let getAuthStore: (() => {
  accessToken: string | null;
  refreshToken: string | null;
  setTokens: (access: string, refresh: string) => void;
  clearAuth: () => void;
}) | null = null;

export function setAuthStoreGetter(
  getter: () => {
    accessToken: string | null;
    refreshToken: string | null;
    setTokens: (access: string, refresh: string) => void;
    clearAuth: () => void;
  },
): void {
  getAuthStore = getter;
}

let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

function onTokenRefreshed(token: string): void {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

function addRefreshSubscriber(cb: (token: string) => void): void {
  refreshSubscribers.push(cb);
}

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    config.baseURL = getApiBaseUrl();
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    const store = getAuthStore?.();
    if (store?.accessToken) {
      config.headers.Authorization = `Bearer ${store.accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    const url = originalRequest.url ?? '';
    const isPublicAuthRoute =
      url.includes('/api/auth/login') ||
      url.includes('/api/auth/register-org') ||
      url.includes('/api/auth/mfa/verify') ||
      url.includes('/api/auth/refresh');

    if (error.response?.status === 401 && !originalRequest._retry && !isPublicAuthRoute) {
      const store = getAuthStore?.();

      if (!store?.refreshToken) {
        store?.clearAuth();
        redirectToLogin();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve) => {
          addRefreshSubscriber((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(apiClient(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post<ApiResponse<{ accessToken: string; refreshToken: string }>>(
          `${getApiBaseUrl()}/api/auth/refresh`,
          { refreshToken: store.refreshToken },
        );

        const { accessToken, refreshToken } = data.data;
        store.setTokens(accessToken, refreshToken);
        onTokenRefreshed(accessToken);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      } catch {
        store?.clearAuth();
        redirectToLogin();
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export function unwrap<T>(response: AxiosResponse<ApiResponse<T>>): T {
  return response.data.data;
}
