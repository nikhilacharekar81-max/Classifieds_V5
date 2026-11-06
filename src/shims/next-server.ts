import type { Request as ExpressRequest, Response as ExpressResponse } from 'express';

export interface CookieOption {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'lax' | 'strict' | 'none' | boolean;
  expires?: Date;
  maxAge?: number;
  path?: string;
}

function parseCookieHeader(cookieHeader?: string | null): Map<string, string> {
  const map = new Map<string, string>();
  if (!cookieHeader) return map;
  const pairs = cookieHeader.split(';');
  for (const pair of pairs) {
    const idx = pair.indexOf('=');
    if (idx === -1) continue;
    const key = pair.slice(0, idx).trim();
    const val = pair.slice(idx + 1).trim();
    if (key) {
      try {
        map.set(key, decodeURIComponent(val));
      } catch {
        map.set(key, val);
      }
    }
  }
  return map;
}

function serializeSetCookie(name: string, value: string, opts: CookieOption = {}): string {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  parts.push(`Path=${opts.path || '/'}`);
  if (opts.httpOnly) parts.push('HttpOnly');
  if (opts.secure) parts.push('Secure');
  if (opts.sameSite) {
    const ss = typeof opts.sameSite === 'string' ? opts.sameSite : 'Lax';
    parts.push(`SameSite=${ss.charAt(0).toUpperCase() + ss.slice(1)}`);
  }
  if (opts.expires instanceof Date) {
    parts.push(`Expires=${opts.expires.toUTCString()}`);
  }
  if (typeof opts.maxAge === 'number') {
    parts.push(`Max-Age=${Math.floor(opts.maxAge)}`);
  }
  return parts.join('; ');
}

export class NextRequest extends Request {
  public auth?: any;
  public nextUrl: URL;
  private _cookies: Map<string, string>;

  constructor(input: string | URL | Request, init?: RequestInit & { auth?: any }) {
    const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const resolvedUrl = urlStr.startsWith('http') ? urlStr : `http://localhost:3000${urlStr.startsWith('/') ? '' : '/'}${urlStr}`;
    super(resolvedUrl, init);
    this.nextUrl = new URL(resolvedUrl);
    this._cookies = parseCookieHeader(this.headers.get('cookie'));
    this.auth = init?.auth;
  }

  public get cookies() {
    const map = this._cookies;
    return {
      get(name: string): { name: string; value: string } | undefined {
        const val = map.get(name);
        return val !== undefined ? { name, value: val } : undefined;
      },
      getAll(): { name: string; value: string }[] {
        return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
      },
      has(name: string): boolean {
        return map.has(name);
      },
    };
  }
}

export class NextResponse extends Response {
  public readonly _setCookies: string[] = [];

  constructor(body?: BodyInit | null, init?: ResponseInit) {
    super(body, init);
  }

  public get cookies() {
    const setCookies = this._setCookies;
    return {
      set(name: string, value: string, opts?: CookieOption) {
        setCookies.push(serializeSetCookie(name, value, opts));
      },
      delete(name: string) {
        setCookies.push(
          serializeSetCookie(name, '', {
            path: '/',
            expires: new Date(0),
            maxAge: 0,
          })
        );
      },
    };
  }

  public static json(data: any, init?: ResponseInit): NextResponse {
    const headers = new Headers(init?.headers);
    if (!headers.has('content-type')) {
      headers.set('content-type', 'application/json; charset=utf-8');
    }
    return new NextResponse(JSON.stringify(data), {
      ...init,
      headers,
    });
  }
}

/**
 * Converts an Express request/response cycle to invoke a route module exporting GET/POST/PUT/PATCH/DELETE.
 */
export function createExpressRouteHandler(routeModule: Record<string, any>) {
  return async (req: ExpressRequest, res: ExpressResponse) => {
    try {
      const method = req.method.toUpperCase();
      const handler = routeModule[method];
      if (typeof handler !== 'function') {
        res.status(405).json({ error: `Method ${method} not allowed` });
        return;
      }

      const protocol = req.protocol || 'http';
      const host = req.get('host') || 'localhost:3000';
      const fullUrl = `${protocol}://${host}${req.originalUrl || req.url}`;

      const headers = new Headers();
      for (const [k, v] of Object.entries(req.headers)) {
        if (typeof v === 'string') {
          headers.set(k, v);
        } else if (Array.isArray(v)) {
          headers.set(k, v.join(', '));
        }
      }

      let bodyInit: string | undefined;
      if (method !== 'GET' && method !== 'HEAD') {
        if (typeof (req as any).rawBody === 'string') {
          bodyInit = (req as any).rawBody;
        } else if (req.body !== undefined && req.body !== null) {
          bodyInit = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
        }
      }

      const nextReq = new NextRequest(fullUrl, {
        method,
        headers,
        body: bodyInit,
        auth: (req as any).auth,
      });

      const context = {
        params: Promise.resolve({ ...(req.params || {}) }),
      };

      const response: NextResponse | Response = await handler(nextReq, context);

      res.status(response.status || 200);
      response.headers.forEach((value, key) => {
        res.setHeader(key, value);
      });

      if ('_setCookies' in response && Array.isArray((response as NextResponse)._setCookies)) {
        const cookies = (response as NextResponse)._setCookies;
        if (cookies.length > 0) {
          res.setHeader('Set-Cookie', cookies);
        }
      }

      const textBody = await response.text();
      res.send(textBody);
    } catch (error: any) {
      console.error(`[ExpressRouteAdapter] Error in ${req.method} ${req.originalUrl}:`, error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'An unexpected server error occurred. Please try again later.' });
      }
    }
  };
}
