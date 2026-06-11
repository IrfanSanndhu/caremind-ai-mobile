import Constants from 'expo-constants';

function normalizeBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

function requireEnv(name: string, value: string | undefined): string {
  const trimmed = value?.trim();
  if (!trimmed) {
    throw new Error(`${name} is not set. Add it to your .env file and restart the dev server.`);
  }
  return normalizeBaseUrl(trimmed);
}

export function getApiBaseUrl(): string {
  const url =
    process.env.EXPO_PUBLIC_API_BASE_URL ||
    (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined);
  return requireEnv('EXPO_PUBLIC_API_BASE_URL', url);
}

export function getLivekitUrl(): string {
  const url =
    process.env.EXPO_PUBLIC_LIVEKIT_URL ||
    (Constants.expoConfig?.extra?.livekitUrl as string | undefined);
  return requireEnv('EXPO_PUBLIC_LIVEKIT_URL', url);
}
