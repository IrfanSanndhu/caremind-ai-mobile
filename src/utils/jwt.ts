import type { User, UserRole } from '@/types';

interface AccessTokenPayload {
  sub: string;
  orgId: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

function decodeBase64Url(input: string): string {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  if (typeof globalThis.atob === 'function') {
    return globalThis.atob(padded);
  }
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let str = padded.replace(/=+$/, '');
  let output = '';
  if (str.length % 4 === 1) throw new Error('Invalid base64');
  for (let bc = 0, bs = 0, i = 0; i < str.length; i++) {
    const charIndex = chars.indexOf(str.charAt(i));
    if (charIndex === -1) continue;
    bs = bc % 4 ? bs * 64 + charIndex : charIndex;
    if (bc++ % 4) output += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6)));
  }
  return output;
}

export function decodeAccessTokenPayload(accessToken: string): AccessTokenPayload {
  const parts = accessToken.split('.');
  if (parts.length < 2) {
    throw new Error('Invalid access token');
  }
  const json = decodeBase64Url(parts[1]);
  const payload = JSON.parse(json) as AccessTokenPayload;
  if (!payload.sub || !payload.orgId || !payload.role) {
    throw new Error('Access token is missing required claims');
  }
  return payload;
}

export function userFromAccessToken(accessToken: string, email: string): User {
  const payload = decodeAccessTokenPayload(accessToken);
  return {
    id: payload.sub,
    email,
    role: payload.role,
    orgId: payload.orgId,
  };
}
