import { clearNavigationFeedback, getPendingNavigationUrl } from '@/lib/router/useRouter';

const CHUNK_RECOVERY_STORAGE_KEY = '__fivepa_chunk_recovery_ts';
const CHUNK_RECOVERY_COOLDOWN_MS = 15000;

export function isChunkLoadFailure(errorOrMessage: unknown): boolean {
  if (!errorOrMessage) return false;
  const name =
    typeof errorOrMessage === 'object' && errorOrMessage !== null && 'name' in errorOrMessage
      ? String((errorOrMessage as { name?: unknown }).name)
      : '';
  const message =
    typeof errorOrMessage === 'string'
      ? errorOrMessage
      : typeof errorOrMessage === 'object' && errorOrMessage !== null && 'message' in errorOrMessage
        ? String((errorOrMessage as { message?: unknown }).message)
        : String(errorOrMessage);

  return (
    name === 'ChunkLoadError' ||
    /ChunkLoadError/i.test(message) ||
    /Loading chunk [\w[\]%./-]+ failed/i.test(message) ||
    /Loading CSS chunk [\w[\]%./-]+ failed/i.test(message) ||
    /Failed to fetch dynamically imported module/i.test(message) ||
    /Importing a module script failed/i.test(message)
  );
}

export function attemptChunkErrorRecovery(explicitTargetUrl?: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const targetUrl =
      explicitTargetUrl ||
      getPendingNavigationUrl() ||
      window.location.pathname + window.location.search;
    const now = Date.now();
    const rawState = window.sessionStorage.getItem(CHUNK_RECOVERY_STORAGE_KEY);
    if (rawState) {
      const parsed = JSON.parse(rawState) as { ts?: number; url?: string };
      if (
        parsed &&
        typeof parsed.ts === 'number' &&
        now - parsed.ts < CHUNK_RECOVERY_COOLDOWN_MS &&
        parsed.url === targetUrl
      ) {
        return false;
      }
    }
    window.sessionStorage.setItem(
      CHUNK_RECOVERY_STORAGE_KEY,
      JSON.stringify({ ts: now, url: targetUrl })
    );
    clearNavigationFeedback();
    window.location.assign(targetUrl);
    return true;
  } catch {
    return false;
  }
}
