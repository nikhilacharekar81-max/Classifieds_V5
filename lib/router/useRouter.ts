'use client';

import { useState, useEffect, useCallback, useMemo, useSyncExternalStore } from 'react';
import { useRouter as useNextRouter, usePathname, navigateClient } from '@/src/shims/next-navigation';

export interface RouteInfo {
  path: string;
  params: Record<string, string>;
  search: string;
  query: Record<string, string>;
  hash: string;
}

export interface NavigationFeedbackState {
  pendingUrl: string | null;
  pendingLinkId: string | null;
}

let activeNextRouter: ReturnType<typeof useNextRouter> | null = null;

export function registerActiveNextRouter(router: ReturnType<typeof useNextRouter> | null) {
  activeNextRouter = router;
}

let navFeedbackState: NavigationFeedbackState = {
  pendingUrl: null,
  pendingLinkId: null,
};
let navSafetyTimer: ReturnType<typeof setTimeout> | null = null;
let activeLinkResetCallback: (() => void) | null = null;
const navListeners = new Set<() => void>();

function emitNavFeedbackChange() {
  navListeners.forEach((listener) => listener());
}

export function normalizeInternalUrl(rawUrl: string): string {
  if (!rawUrl) return '/';
  let clean = rawUrl.trim();
  
  let fragment = '';
  const hashIndex = clean.indexOf('#');
  if (hashIndex !== -1) {
    fragment = clean.substring(hashIndex);
    clean = clean.substring(0, hashIndex);
  }

  if (!clean.startsWith('/')) {
    clean = '/' + clean;
  }
  const [pathPart, queryPart] = clean.split('?');
  const normalizedPath =
    pathPart && pathPart.length > 1 ? pathPart.replace(/\/+$/, '') : pathPart || '/';
  
  let result = normalizedPath;
  if (queryPart) {
    const params = new URLSearchParams(queryPart);
    params.sort();
    const qs = params.toString();
    if (qs) {
      result = `${normalizedPath}?${qs}`;
    }
  }
  
  return result + fragment;
}

export function getCurrentNormalizedBrowserUrl(): string {
  if (typeof window === 'undefined') return '/';
  return normalizeInternalUrl(window.location.pathname + window.location.search + window.location.hash);
}

export function startNavigationFeedback(
  targetUrl: string,
  linkId?: string,
  onReset?: () => void
): boolean {
  if (typeof window === 'undefined') return true;

  const normalizedTarget = normalizeInternalUrl(targetUrl);

  if (navFeedbackState.pendingUrl && navFeedbackState.pendingUrl === normalizedTarget) {
    return false;
  }

  const currentUrl = getCurrentNormalizedBrowserUrl();
  if (!navFeedbackState.pendingUrl && normalizedTarget === currentUrl) {
    return false;
  }

  if (navSafetyTimer) {
    clearTimeout(navSafetyTimer);
  }
  if (activeLinkResetCallback) {
    const prevReset = activeLinkResetCallback;
    activeLinkResetCallback = null;
    prevReset();
  }

  activeLinkResetCallback = onReset || null;
  navFeedbackState = {
    pendingUrl: normalizedTarget,
    pendingLinkId: linkId || null,
  };
  emitNavFeedbackChange();

  navSafetyTimer = setTimeout(() => {
    clearNavigationFeedback();
  }, 5000);

  return true;
}

export function clearNavigationFeedback(): void {
  if (navSafetyTimer) {
    clearTimeout(navSafetyTimer);
    navSafetyTimer = null;
  }
  if (activeLinkResetCallback) {
    const cb = activeLinkResetCallback;
    activeLinkResetCallback = null;
    cb();
  }
  if (navFeedbackState.pendingUrl !== null || navFeedbackState.pendingLinkId !== null) {
    navFeedbackState = {
      pendingUrl: null,
      pendingLinkId: null,
    };
    emitNavFeedbackChange();
  }
}

function subscribeNavFeedback(listener: () => void) {
  navListeners.add(listener);
  return () => {
    navListeners.delete(listener);
  };
}

function getNavFeedbackSnapshot(): NavigationFeedbackState {
  return navFeedbackState;
}

export function getPendingNavigationUrl(): string | null {
  return navFeedbackState.pendingUrl;
}

const SERVER_NAV_SNAPSHOT: NavigationFeedbackState = {
  pendingUrl: null,
  pendingLinkId: null,
};

function getServerNavFeedbackSnapshot(): NavigationFeedbackState {
  return SERVER_NAV_SNAPSHOT;
}

export function useNavigationFeedback() {
  const state = useSyncExternalStore(
    subscribeNavFeedback,
    getNavFeedbackSnapshot,
    getServerNavFeedbackSnapshot
  );

  const isUrlPending = useCallback(
    (targetUrl: string, linkId?: string) => {
      if (!state.pendingUrl) return false;
      if (linkId && state.pendingLinkId) {
        return state.pendingLinkId === linkId;
      }
      return state.pendingUrl === normalizeInternalUrl(targetUrl);
    },
    [state.pendingUrl, state.pendingLinkId]
  );

  const isSameUrlInProgress = useCallback(
    (targetUrl: string) => {
      if (!state.pendingUrl) return false;
      return state.pendingUrl === normalizeInternalUrl(targetUrl);
    },
    [state.pendingUrl]
  );

  return {
    pendingUrl: state.pendingUrl,
    pendingLinkId: state.pendingLinkId,
    isNavigating: state.pendingUrl !== null,
    isUrlPending,
    isSameUrlInProgress,
    startNavigationFeedback,
    clearNavigationFeedback,
  };
}

export function parsePath(rawPathAndSearch?: string): { path: string; query: Record<string, string>; hash: string } {
  let raw = rawPathAndSearch;
  if (!raw) {
    if (typeof window !== 'undefined') {
      raw = window.location.pathname + window.location.search + window.location.hash;
    } else {
      raw = '/';
    }
  }
  
  let hash = '';
  const hashIndex = raw.indexOf('#');
  if (hashIndex !== -1) {
    hash = raw.substring(hashIndex);
    raw = raw.substring(0, hashIndex);
  }

  if (!raw.startsWith('/')) {
    raw = '/' + raw;
  }

  const [pathPart, queryPart] = raw.split('?');
  const query: Record<string, string> = {};

  if (queryPart) {
    const searchParams = new URLSearchParams(queryPart);
    searchParams.forEach((val, key) => {
      query[key] = val;
    });
  }

  return { path: pathPart || '/', query, hash };
}

export function navigateTo(targetUrl: string, linkId?: string) {
  if (typeof window === 'undefined') return;

  let cleanUrl = targetUrl;
  if (cleanUrl.startsWith('#')) {
    cleanUrl = cleanUrl.replace(/^#\/?/, '/');
  }
  if (!cleanUrl.startsWith('/')) {
    cleanUrl = '/' + cleanUrl;
  }

  const normalizedTarget = normalizeInternalUrl(cleanUrl);
  if (navFeedbackState.pendingUrl && navFeedbackState.pendingUrl === normalizedTarget) {
    return;
  }

  const currentUrl = getCurrentNormalizedBrowserUrl();
  if (!navFeedbackState.pendingUrl && normalizedTarget === currentUrl) {
    return;
  }

  startNavigationFeedback(cleanUrl, linkId);
  navigateClient(cleanUrl, false);
  clearNavigationFeedback();
}

export function useRouter(initialPath?: string, initialQuery?: Record<string, string>) {
  const nextRouter = useNextRouter();
  const nextPathname = usePathname();

  useEffect(() => {
    activeNextRouter = nextRouter;
  }, [nextRouter]);

  const [clientLocation, setClientLocation] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return window.location.pathname + window.location.search;
    }
    return null;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleLocationChange = () => {
      setClientLocation(window.location.pathname + window.location.search);
      clearNavigationFeedback();
    };

    handleLocationChange();
    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('chilly:navigation', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('chilly:navigation', handleLocationChange);
    };
  }, [nextPathname, initialPath]);

  const { path, query, hash } = useMemo(() => {
    if (clientLocation !== null) {
      return parsePath(clientLocation);
    }
    const basePath = initialPath || nextPathname || '/';
    const parsed = parsePath(basePath);
    if (initialQuery !== undefined) {
      return { path: parsed.path, query: initialQuery, hash: parsed.hash };
    }
    return parsed;
  }, [clientLocation, initialPath, nextPathname, initialQuery]);

  const navigate = useCallback((url: string, linkId?: string) => {
    navigateTo(url, linkId);
  }, []);

  return {
    path,
    query,
    hash,
    navigate,
    navigateTo,
  };
}
