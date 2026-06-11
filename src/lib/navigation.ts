type AuthRedirectHandler = () => void;

let onUnauthorized: AuthRedirectHandler | null = null;

export function setUnauthorizedHandler(handler: AuthRedirectHandler): void {
  onUnauthorized = handler;
}

export function redirectToLogin(): void {
  onUnauthorized?.();
}
