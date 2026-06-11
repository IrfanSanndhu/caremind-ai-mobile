import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { StateStorage } from 'zustand/middleware';

const TOKEN_KEYS = {
  accessToken: 'caremind_access_token',
  refreshToken: 'caremind_refresh_token',
} as const;

export async function getAccessToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEYS.accessToken);
  } catch {
    return null;
  }
}

export async function getRefreshToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEYS.refreshToken);
  } catch {
    return null;
  }
}

export async function setTokens(accessToken: string, refreshToken: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEYS.accessToken, accessToken);
  await SecureStore.setItemAsync(TOKEN_KEYS.refreshToken, refreshToken);
}

export async function clearTokens(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEYS.accessToken);
  await SecureStore.deleteItemAsync(TOKEN_KEYS.refreshToken);
}

export const asyncStorage: StateStorage = {
  getItem: async (name) => AsyncStorage.getItem(name),
  setItem: async (name, value) => AsyncStorage.setItem(name, value),
  removeItem: async (name) => AsyncStorage.removeItem(name),
};

interface AuthPersistShape {
  user: unknown;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  role: unknown;
  orgId: unknown;
}

export const secureAuthStorage: StateStorage = {
  getItem: async (name) => {
    const raw = await AsyncStorage.getItem(name);
    if (!raw) {
      const [accessToken, refreshToken] = await Promise.all([
        getAccessToken(),
        getRefreshToken(),
      ]);
      if (!accessToken && !refreshToken) return null;
      return JSON.stringify({
        state: {
          accessToken,
          refreshToken,
          isAuthenticated: !!accessToken,
        },
        version: 0,
      });
    }
    return raw;
  },
  setItem: async (name, value) => {
    try {
      const parsed = JSON.parse(value) as { state: AuthPersistShape };
      const { accessToken, refreshToken } = parsed.state;
      if (accessToken && refreshToken) {
        await setTokens(accessToken, refreshToken);
      }
      const { accessToken: _a, refreshToken: _r, ...rest } = parsed.state;
      await AsyncStorage.setItem(
        name,
        JSON.stringify({ ...parsed, state: { ...rest, accessToken: null, refreshToken: null } }),
      );
    } catch {
      await AsyncStorage.setItem(name, value);
    }
  },
  removeItem: async (name) => {
    await clearTokens();
    await AsyncStorage.removeItem(name);
  },
};
