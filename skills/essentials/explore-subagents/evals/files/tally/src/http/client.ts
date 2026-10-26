import { config } from "../config";

const RETRYABLE_STATUS = new Set([502, 503, 504]);
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 250;

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  headers?: Record<string, string>;
  body?: unknown;
}

export interface HttpClient {
  request<T>(url: string, options?: RequestOptions): Promise<T>;
}

function canRetry(options: RequestOptions): boolean {
  const method = options.method ?? "GET";
  if (method === "GET" || method === "PUT" || method === "DELETE") return true;
  return Boolean(options.headers?.["Idempotency-Key"]);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createClient({ timeoutMs = config.httpTimeoutMs } = {}): HttpClient {
  return {
    async request<T>(url: string, options: RequestOptions = {}): Promise<T> {
      for (let attempt = 0; ; attempt++) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
          const response = await fetch(url, {
            method: options.method ?? "GET",
            headers: options.headers,
            body: options.body === undefined ? undefined : JSON.stringify(options.body),
            signal: controller.signal,
          });
          if (RETRYABLE_STATUS.has(response.status) && canRetry(options) && attempt < MAX_RETRIES) {
            await sleep(BASE_DELAY_MS * 2 ** attempt);
            continue;
          }
          if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
          return (await response.json()) as T;
        } catch (error) {
          const networkError = error instanceof TypeError;
          if (networkError && canRetry(options) && attempt < MAX_RETRIES) {
            await sleep(BASE_DELAY_MS * 2 ** attempt);
            continue;
          }
          throw error;
        } finally {
          clearTimeout(timer);
        }
      }
    },
  };
}
