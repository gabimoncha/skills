import { createClient } from "../http/client";
import { clearSession, loadSession, saveSession, type Session } from "./tokenStore";

export class SessionExpiredError extends Error {
  constructor() {
    super("Session expired; sign in again.");
    this.name = "SessionExpiredError";
  }
}

const REFRESH_SKEW_MS = 90_000;
const http = createClient();
let inflightRefresh: Promise<Session> | null = null;

async function refresh(session: Session): Promise<Session> {
  try {
    const next = await http.request<Session>("https://auth.tally.example/oauth/token", {
      method: "POST",
      body: { grant_type: "refresh_token", refresh_token: session.refreshToken },
    });
    saveSession(next);
    return next;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("HTTP 401")) {
      clearSession();
      throw new SessionExpiredError();
    }
    throw error;
  }
}

export async function getAccessToken(now = Date.now()): Promise<string> {
  const session = loadSession();
  if (!session) throw new SessionExpiredError();
  if (session.expiresAt - now > REFRESH_SKEW_MS) return session.accessToken;

  inflightRefresh ??= refresh(session).finally(() => {
    inflightRefresh = null;
  });
  return (await inflightRefresh).accessToken;
}
