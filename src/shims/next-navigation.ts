import { useState, useEffect, useMemo } from 'react';

const NAV_EVENT = 'chilly:navigation';

export function navigateClient(url: string, replace = false): void {
  if (typeof window === 'undefined') return;
  const target = url.startsWith('/') || url.startsWith('http') ? url : `/${url}`;
  const prevPath = window.location.pathname;
  if (replace) {
    window.history.replaceState({}, '', target);
  } else {
    window.history.pushState({}, '', target);
  }
  window.dispatchEvent(new PopStateEvent('popstate'));
  window.dispatchEvent(new CustomEvent(NAV_EVENT, { detail: { url: target } }));
  if (window.location.pathname !== prevPath) {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }
}

function getLocationSnapshot(): { pathname: string; search: string } {
  if (typeof window === 'undefined') {
    return { pathname: '/', search: '' };
  }
  return {
    pathname: window.location.pathname || '/',
    search: window.location.search || '',
  };
}

export function usePathname(): string {
  const [pathname, setPathname] = useState<string>(() => getLocationSnapshot().pathname);

  useEffect(() => {
    const update = () => {
      setPathname(window.location.pathname || '/');
    };
    update();
    window.addEventListener('popstate', update);
    window.addEventListener(NAV_EVENT, update);
    return () => {
      window.removeEventListener('popstate', update);
      window.removeEventListener(NAV_EVENT, update);
    };
  }, []);

  return pathname;
}

export function useSearchParams(): URLSearchParams {
  const [search, setSearch] = useState<string>(() => getLocationSnapshot().search);

  useEffect(() => {
    const update = () => {
      setSearch(window.location.search || '');
    };
    update();
    window.addEventListener('popstate', update);
    window.addEventListener(NAV_EVENT, update);
    return () => {
      window.removeEventListener('popstate', update);
      window.removeEventListener(NAV_EVENT, update);
    };
  }, []);

  return useMemo(() => new URLSearchParams(search), [search]);
}

export function useRouter() {
  return useMemo(
    () => ({
      push(href: string) {
        navigateClient(href, false);
      },
      replace(href: string) {
        navigateClient(href, true);
      },
      back() {
        if (typeof window !== 'undefined') window.history.back();
      },
      forward() {
        if (typeof window !== 'undefined') window.history.forward();
      },
      refresh() {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new PopStateEvent('popstate'));
        }
      },
      prefetch(_href: string) {
        // No-op in Vite SPA
      },
    }),
    []
  );
}

export function notFound(): never {
  throw new Error('NOT_FOUND');
}
