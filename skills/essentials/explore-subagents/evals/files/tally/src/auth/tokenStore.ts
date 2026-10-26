export interface Session {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

let current: Session | null = null;

export function loadSession(): Session | null {
  return current;
}

export function saveSession(session: Session): void {
  current = session;
}

export function clearSession(): void {
  current = null;
}
