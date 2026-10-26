/**
 * @deprecated Replaced by src/http/client.ts in March. Kept until the
 * reporting export is rewritten; nothing in src/ imports it any more.
 */
export const LEGACY_TIMEOUT_MS = 30_000;

export async function legacyGet(url: string): Promise<unknown> {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), LEGACY_TIMEOUT_MS);
  const response = await fetch(url, { signal: controller.signal });
  return response.json();
}
