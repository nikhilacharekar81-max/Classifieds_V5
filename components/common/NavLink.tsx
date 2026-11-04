'use client';

import React, { useId, useState, useEffect, useRef, useCallback, Suspense } from 'react';
import Link, { LinkProps } from '@/src/shims/next-link';
import { usePathname, useSearchParams } from '@/src/shims/next-navigation';
import { Loader2 } from 'lucide-react';
import {
  clearNavigationFeedback,
  getPendingNavigationUrl,
  normalizeInternalUrl,
  startNavigationFeedback,
} from '@/lib/router/useRouter';

export interface NavLinkProps
  extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps>,
    LinkProps {
  children: React.ReactNode;
  showSpinner?: boolean;
  spinnerClassName?: string;
}

function getHrefString(href: LinkProps['href']): string {
  if (typeof href === 'string') return href;
  if (!href) return '/';
  const pathname = href.pathname || '/';
  if (!href.query) return pathname;
  if (typeof href.query === 'string') {
    return `${pathname}?${href.query}`;
  }
  const params = new URLSearchParams();
  Object.entries(href.query).forEach(([key, val]) => {
    if (val !== undefined && val !== null) {
      if (Array.isArray(val)) {
        val.forEach((item) => params.append(key, String(item)));
      } else {
        params.set(key, String(val));
      }
    }
  });
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

interface NavigationWatcherProps {
  targetUrl: string;
  onComplete: () => void;
}

const NavigationWatcher: React.FC<NavigationWatcherProps> = ({ targetUrl, onComplete }) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialUrlRef = useRef<string | null>(null);

  useEffect(() => {
    const searchStr = searchParams?.toString();
    const currentUrl = searchStr ? `${pathname}?${searchStr}` : pathname;
    const normalizedCurrent = normalizeInternalUrl(currentUrl);
    const normalizedTarget = normalizeInternalUrl(targetUrl);

    if (initialUrlRef.current === null) {
      initialUrlRef.current = normalizedCurrent;
      if (normalizedCurrent === normalizedTarget) {
        onComplete();
      }
      return;
    }

    // Navigation completed: destination reached or redirected to an alternate destination
    if (normalizedCurrent === normalizedTarget || normalizedCurrent !== initialUrlRef.current) {
      onComplete();
    }
  }, [pathname, searchParams, targetUrl, onComplete]);

  // Handle browser back/forward or popstate events
  useEffect(() => {
    const handlePopState = () => {
      onComplete();
    };
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [onComplete]);

  return null;
};

export const NavLink: React.FC<NavLinkProps> = ({
  href,
  onClick,
  className = '',
  children,
  showSpinner = true,
  spinnerClassName = 'w-3 h-3 animate-spin shrink-0 opacity-80 inline-block ml-1.5 align-middle',
  ...rest
}) => {
  const linkId = useId();
  const [isThisLinkPending, setIsThisLinkPending] = useState(false);
  const hrefString = getHrefString(href);

  const handleComplete = useCallback(() => {
    setIsThisLinkPending(false);
    clearNavigationFeedback();
  }, []);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Preserve standard browser behavior for new-tab / modifier clicks
    if (
      e.metaKey ||
      e.ctrlKey ||
      e.shiftKey ||
      e.altKey ||
      e.button !== 0 ||
      rest.target === '_blank'
    ) {
      onClick?.(e);
      return;
    }

    // In-page hash jumps should not trigger navigation feedback
    if (typeof hrefString === 'string' && hrefString.startsWith('#')) {
      onClick?.(e);
      return;
    }

    const normalizedTarget = normalizeInternalUrl(hrefString);
    const currentPending = getPendingNavigationUrl();

    // Prevent duplicate clicks while the exact same navigation is already in progress
    if (currentPending && currentPending === normalizedTarget) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    onClick?.(e);

    if (!e.defaultPrevented) {
      const started = startNavigationFeedback(hrefString, linkId, () => {
        setIsThisLinkPending(false);
      });
      if (!started) {
        // Already at this exact URL with no pending navigation.
        // Prevent re-navigating to the identical URL, unless it is a hash anchor jump.
        if (!hrefString.includes('#')) {
          e.preventDefault();
        }
      } else if (showSpinner) {
        setIsThisLinkPending(true);
      }
    }
  };

  return (
    <Link
      href={href}
      onClick={handleClick}
      aria-busy={isThisLinkPending || undefined}
      className={`${className} ${isThisLinkPending ? 'pointer-events-none' : ''}`}
      {...rest}
    >
      {children}
      {showSpinner && isThisLinkPending && (
        <Loader2 className={spinnerClassName} aria-label="Loading" />
      )}
      {isThisLinkPending && (
        <Suspense fallback={null}>
          <NavigationWatcher targetUrl={hrefString} onComplete={handleComplete} />
        </Suspense>
      )}
    </Link>
  );
};



