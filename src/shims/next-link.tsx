import React from 'react';
import { navigateClient } from './next-navigation.ts';

export interface LinkProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  href:
    | string
    | {
        pathname?: string | null;
        query?: string | Record<string, string | number | boolean | (string | number | boolean)[] | null | undefined>;
      };
  prefetch?: boolean;
  replace?: boolean;
  scroll?: boolean;
}

function formatHref(href: LinkProps['href']): string {
  if (typeof href === 'string') return href;
  if (!href) return '/';
  const pathname = href.pathname || '/';
  if (!href.query) return pathname;
  if (typeof href.query === 'string') {
    return `${pathname}?${href.query}`;
  }
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(href.query)) {
    if (v !== undefined && v !== null) {
      if (Array.isArray(v)) {
        v.forEach((item) => params.append(k, String(item)));
      } else {
        params.set(k, String(v));
      }
    }
  }
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(
  ({ href, onClick, replace, prefetch: _prefetch, scroll: _scroll, children, ...rest }, ref) => {
    const resolvedHref = formatHref(href);

    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
      onClick?.(e);
      if (
        e.defaultPrevented ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey ||
        e.button !== 0 ||
        rest.target === '_blank'
      ) {
        return;
      }
      if (resolvedHref.startsWith('http://') || resolvedHref.startsWith('https://') || resolvedHref.startsWith('mailto:') || resolvedHref.startsWith('tel:')) {
        return;
      }
      if (resolvedHref.startsWith('#')) {
        return;
      }
      e.preventDefault();
      navigateClient(resolvedHref, Boolean(replace));
    };

    return (
      <a ref={ref} href={resolvedHref} onClick={handleClick} {...rest}>
        {children}
      </a>
    );
  }
);

Link.displayName = 'Link';

export default Link;
