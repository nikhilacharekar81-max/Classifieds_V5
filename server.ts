import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { createServer as createViteServer, ViteDevServer } from 'vite';
import { createExpressRouteHandler } from './src/shims/next-server.ts';
import rateLimit from 'express-rate-limit';
import { getAuthenticatedUser } from './lib/auth/session.ts';
import { ensurePgSchemaApplied, db } from './src/db/index.ts';
import { ensureDatabaseSeeded } from './server/seed-postgres.ts';
import { categoryRepository } from './server/repositories/category.repository.ts';
import { locationRepository } from './server/repositories/location.repository.ts';
import { listingRepository } from './server/repositories/listing.repository.ts';
import { buildChillyUrl, serializeJsonLd } from './lib/utils/seoAndUrlHelper.ts';
import { renderSsrPage } from './src/entry-server.tsx';
import { runWithRequestCache } from './src/shims/next-cache.ts';
import compression from 'compression';

// Route Modules
import * as bootstrapRoute from './server/api/bootstrap/route.ts';
import * as authLoginRoute from './server/api/auth/login/route.ts';
import * as authLogoutRoute from './server/api/auth/logout/route.ts';
import * as authSignupRoute from './server/api/auth/signup/route.ts';
import * as authMeRoute from './server/api/auth/me/route.ts';
import * as authForgotPasswordRoute from './server/api/auth/forgot-password/route.ts';
import * as authResetPasswordRoute from './server/api/auth/reset-password/route.ts';
import * as authChangePasswordRoute from './server/api/auth/change-password/route.ts';
import * as authVerifyEmailRequestRoute from './server/api/auth/verify-email/request/route.ts';
import * as authVerifyEmailConfirmRoute from './server/api/auth/verify-email/confirm/route.ts';
import * as authLogoutAllRoute from './server/api/auth/logout-all/route.ts';
import * as authUnsubscribeRoute from './server/api/auth/unsubscribe/route.ts';
import * as listingsRoute from './server/api/listings/route.ts';
import * as listingsCreateOrderRoute from './server/api/listings/create-order/route.ts';
import * as listingsByIdRoute from './server/api/listings/[id]/route.ts';
import * as listingsRevealPhoneRoute from './server/api/listings/[id]/reveal-phone/route.ts';
import * as listingsCheckDuplicateRoute from './server/api/listings/check-duplicate/route.ts';
import * as listingsBulkActionRoute from './server/api/listings/bulk-action/route.ts';
import * as listingsFavoriteRoute from './server/api/listings/[id]/favorite/route.ts';
import * as boostPackagesRoute from './server/api/boost/packages/route.ts';
import * as boostPackageByIdRoute from './server/api/boost/packages/[id]/route.ts';
import * as boostCreateOrderRoute from './server/api/boost/create-order/route.ts';
import * as boostVerifyPaymentRoute from './server/api/boost/verify-payment/route.ts';
import * as boostWebhookRoute from './server/api/boost/webhook/route.ts';
import * as boostAnalyticsRoute from './server/api/boost/analytics/route.ts';
import * as boostCleanupExpiredRoute from './server/api/boost/cleanup-expired/route.ts';
import * as adminAttributesRoute from './server/api/admin/attributes/route.ts';
import * as adminAttributeByIdRoute from './server/api/admin/attributes/[id]/route.ts';
import * as adminMetricsRoute from './server/api/admin/metrics/route.ts';
import * as adminCategoriesRoute from './server/api/admin/categories/route.ts';
import * as adminCategoryByIdRoute from './server/api/admin/categories/[id]/route.ts';
import * as adminLocationsRoute from './server/api/admin/locations/route.ts';
import * as adminLocationByIdRoute from './server/api/admin/locations/[id]/route.ts';
import * as adminUsersRoute from './server/api/admin/users/route.ts';
import * as adminUserByIdRoute from './server/api/admin/users/[id]/route.ts';
import * as adminModerationRoute from './server/api/admin/moderation/route.ts';
import * as adminSettingsRoute from './server/api/admin/settings/route.ts';
import * as adminCmsRoute from './server/api/admin/cms/route.ts';
import * as adminCmsByIdRoute from './server/api/admin/cms/[id]/route.ts';
import * as chatRoute from './server/api/chat/route.ts';
import * as reportsRoute from './server/api/reports/route.ts';
import * as userKycRoute from './server/api/user/kyc/route.ts';
import * as userAccountRoute from './server/api/user/account/route.ts';
import * as adminImpersonateRoute from './server/api/admin/impersonate/route.ts';
import * as adminEmailTemplatesRoute from './server/api/admin/email/templates/route.ts';
import * as adminEmailLogsRoute from './server/api/admin/email/logs/route.ts';
import * as adminEmailNewslettersRoute from './server/api/admin/email/newsletters/route.ts';
import * as adminEmailNewsletterSendRoute from './server/api/admin/email/newsletters/[id]/send/route.ts';
import * as adminEmailTestSmtpRoute from './server/api/admin/email/test-smtp/route.ts';
import * as adminEmailCustomSendRoute from './server/api/admin/email/custom-send/route.ts';

function escapeHtml(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Production mode must be explicit and safe:
// Treat unset or invalid NODE_ENV safely as production.
// Only enable development features when NODE_ENV is explicitly 'development'.
const isDevelopment = process.env.NODE_ENV === 'development';
if (!isDevelopment && process.env.NODE_ENV !== 'production') {
  process.env.NODE_ENV = 'production';
}

async function initializePostgreSQL() {
  try {
    await ensurePgSchemaApplied();
    await ensureDatabaseSeeded({
      includeDemoData: isDevelopment,
    });
    console.log('[PostgreSQL] Schema and essential reference data verified.');
  } catch (err) {
    console.error('[PostgreSQL] Initialization error:', err);
  }
}

import { getPublicBaseUrl } from './lib/publicUrl';
import { uploadImage } from './lib/storage';

// ... (existing imports)

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  if (isProd && (!process.env.APP_URL || process.env.APP_URL.includes('localhost'))) {
    console.error('Fatal: APP_URL must be configured in production and cannot be localhost.');
    process.exit(1);
  }

  await initializePostgreSQL();

  const app = express();
  app.use(compression()); // Added compression
  app.set('trust proxy', 1);
  const PORT = Number(process.env.PORT) || 3000;

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  });

  // Per-request AsyncLocalStorage cache context
  app.use((_req, _res, next) => runWithRequestCache(() => next()));

  // Preserve raw body for webhook HMAC verification while parsing JSON
  app.use(
    express.json({
      limit: '10mb',
      verify: (req, _res, buf) => {
        (req as any).rawBody = buf.toString('utf8');
      },
    })
  );

  // Rate Limiting for public listing/search
  const publicApiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
    skip: (req) => req.path === '/api/health',
  });

  app.use('/api/listings', publicApiLimiter);

  const { hasPermission } = await import('./lib/auth/roles.ts');
  type RolePermissions = import('./lib/auth/roles.ts').RolePermissions;

  // Admin Guard Middleware Factory
  const adminGuard = (requiredPermission?: keyof RolePermissions) => async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const auth = await getAuthenticatedUser(req as any);
      if (!auth) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      if (!auth.isAdmin) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      if (requiredPermission && !hasPermission(auth.adminRole, requiredPermission)) {
        return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
      }
      (req as any).auth = auth;
      next();
    } catch (err) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  };

  // Admin Console Routes with granular RBAC
  app.all('/api/admin/metrics', adminGuard('canManageSettings'), createExpressRouteHandler(adminMetricsRoute));
  app.all('/api/admin/attributes/:id', adminGuard('canManageCategories'), createExpressRouteHandler(adminAttributeByIdRoute));
  app.all('/api/admin/attributes', adminGuard('canManageCategories'), createExpressRouteHandler(adminAttributesRoute));
  app.all('/api/admin/categories/:id', adminGuard('canManageCategories'), createExpressRouteHandler(adminCategoryByIdRoute));
  app.all('/api/admin/categories', adminGuard('canManageCategories'), createExpressRouteHandler(adminCategoriesRoute));
  app.all('/api/admin/locations/:id', adminGuard('canManageSettings'), createExpressRouteHandler(adminLocationByIdRoute));
  app.all('/api/admin/locations', adminGuard('canManageSettings'), createExpressRouteHandler(adminLocationsRoute));
  app.all('/api/admin/users/:id', adminGuard('canManageUsers'), createExpressRouteHandler(adminUserByIdRoute));
  app.all('/api/admin/users', adminGuard('canManageUsers'), createExpressRouteHandler(adminUsersRoute));
  app.all('/api/admin/moderation', adminGuard('canModerateListings'), createExpressRouteHandler(adminModerationRoute));
  app.all('/api/admin/settings', adminGuard('canManageSettings'), createExpressRouteHandler(adminSettingsRoute));
  app.all('/api/admin/cms/:id', adminGuard('canManageCms'), createExpressRouteHandler(adminCmsByIdRoute));
  app.all('/api/admin/cms', adminGuard('canManageCms'), createExpressRouteHandler(adminCmsRoute));
  app.all('/api/admin/impersonate', adminGuard('canManageUsers'), createExpressRouteHandler(adminImpersonateRoute));
  
  // Email Management Routes
  app.all('/api/admin/email/templates', adminGuard('canManageSettings'), createExpressRouteHandler(adminEmailTemplatesRoute));
  app.all('/api/admin/email/logs', adminGuard('canManageSettings'), createExpressRouteHandler(adminEmailLogsRoute));
  app.all('/api/admin/email/newsletters/:id/send', adminGuard('canManageSettings'), createExpressRouteHandler(adminEmailNewsletterSendRoute));
  app.all('/api/admin/email/newsletters', adminGuard('canManageSettings'), createExpressRouteHandler(adminEmailNewslettersRoute));
  app.all('/api/admin/email/test-smtp', adminGuard('canManageSettings'), createExpressRouteHandler(adminEmailTestSmtpRoute));
  app.all('/api/admin/email/custom-send', adminGuard('canManageSettings'), createExpressRouteHandler(adminEmailCustomSendRoute));

  // Health Check
  app.get('/api/health', async (_req, res) => {
    try {
      await db.execute('SELECT 1');
      res.json({ status: 'ok', database: 'postgresql', ssr: true, timestamp: new Date().toISOString() });
    } catch (err: any) {
      res.status(503).json({ status: 'error', database: 'postgresql', error: err?.message });
    }
  });

  // Bootstrap & Auth Routes
  app.all('/api/bootstrap', createExpressRouteHandler(bootstrapRoute));
  app.all('/api/auth/login', createExpressRouteHandler(authLoginRoute));
  app.all('/api/auth/logout', createExpressRouteHandler(authLogoutRoute));
  app.all('/api/auth/signup', createExpressRouteHandler(authSignupRoute));
  app.all('/api/auth/me', createExpressRouteHandler(authMeRoute));
  app.all('/api/auth/forgot-password', createExpressRouteHandler(authForgotPasswordRoute));
  app.all('/api/auth/reset-password', createExpressRouteHandler(authResetPasswordRoute));
  app.all('/api/auth/change-password', createExpressRouteHandler(authChangePasswordRoute));
  app.all('/api/auth/verify-email/request', createExpressRouteHandler(authVerifyEmailRequestRoute));
  app.all('/api/auth/verify-email/confirm', createExpressRouteHandler(authVerifyEmailConfirmRoute));
  app.all('/api/auth/logout-all', createExpressRouteHandler(authLogoutAllRoute));
  app.all('/api/auth/unsubscribe', createExpressRouteHandler(authUnsubscribeRoute));

  // Listings Routes (Sensitive)
  app.all('/api/listings/create-order', createExpressRouteHandler(listingsCreateOrderRoute));
  
  app.post('/api/listings/upload',
    publicApiLimiter,
    async (req: express.Request, res: express.Response, next: express.NextFunction) => {
      try {
        const authContext = await getAuthenticatedUser(req as any);
        if (!authContext) {
          return res.status(401).json({ error: 'Unauthorized' });
        }
        (req as any).auth = authContext;
        next();
      } catch (err) {
        res.status(500).json({ error: 'Internal Server Error' });
      }
    },
    upload.single('file'),
    (err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
        if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({ error: 'File too large' });
        }
        next(err);
    },
    async (req: express.Request, res: express.Response) => {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
      if (!req.file.mimetype.startsWith('image/')) {
        return res.status(400).json({ error: 'Only image files allowed' });
      }

      try {
        const url = await uploadImage({ buffer: req.file.buffer, size: req.file.size });
        return res.json({ url });
      } catch (err: any) {
        return res.status(500).json({ error: err.message || 'Upload failed' });
      }
    }
  );
  
  app.all('/api/listings/check-duplicate', createExpressRouteHandler(listingsCheckDuplicateRoute));
  app.all('/api/listings/bulk-action', createExpressRouteHandler(listingsBulkActionRoute));
  app.all('/api/listings/:id/reveal-phone', createExpressRouteHandler(listingsRevealPhoneRoute));
  app.all('/api/listings/:id/favorite', createExpressRouteHandler(listingsFavoriteRoute));
  app.all('/api/listings/:id', (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    next();
  }, createExpressRouteHandler(listingsByIdRoute));
  app.all('/api/listings', (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    next();
  }, createExpressRouteHandler(listingsRoute));

  // Boost & Monetization Routes
  app.all('/api/boost/packages/:id', createExpressRouteHandler(boostPackageByIdRoute));
  app.all('/api/boost/packages', createExpressRouteHandler(boostPackagesRoute));
  app.all('/api/boost/create-order', createExpressRouteHandler(boostCreateOrderRoute));
  app.all('/api/boost/verify-payment', createExpressRouteHandler(boostVerifyPaymentRoute));
  app.all('/api/boost/webhook', createExpressRouteHandler(boostWebhookRoute));
  app.all('/api/boost/analytics', createExpressRouteHandler(boostAnalyticsRoute));
  app.all('/api/boost/cleanup-expired', createExpressRouteHandler(boostCleanupExpiredRoute));

  app.all('/api/chat', createExpressRouteHandler(chatRoute));
  app.all('/api/reports', createExpressRouteHandler(reportsRoute));
  app.all('/api/user/kyc', createExpressRouteHandler(userKycRoute));
  app.all('/api/user/account', (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    next();
  }, createExpressRouteHandler(userAccountRoute));

  // SEO robots.txt
  app.get('/robots.txt', (req, res) => {
    const baseUrl = getPublicBaseUrl();
    const body = [
      'User-agent: *',
      'Allow: /',
      'Disallow: /admin',
      'Disallow: /api',
      'Disallow: /my-account',
      `Sitemap: ${baseUrl.replace(/\/$/, '')}/sitemap.xml`,
    ].join('\n');
    res.type('text/plain').send(body);
  });

  // SEO sitemap.xml backed by PostgreSQL
  app.get('/sitemap.xml', async (req, res) => {
    try {
      const baseUrl = getPublicBaseUrl();
      const [categories, locations, listingsRes] = await Promise.all([
        categoryRepository.findAll(),
        locationRepository.findAll(),
        listingRepository.findMarketplaceListings({ status: 'approved', limit: 5000 }),
      ]);

      const todayIso = new Date().toISOString().split('T')[0];
      const urlEntries: Array<{ url: string; lastmod: string }> = [
        { url: `${baseUrl}/`, lastmod: todayIso },
      ];

      const topCities = locations.filter((l) => l.type === 'city' && l.popular).slice(0, 20);
      const mainCategories = categories.filter((c) => !c.parentId && c.isActive);

      for (const city of topCities) {
        urlEntries.push({
          url: `${baseUrl}${buildChillyUrl({ city: city.name, categories })}`,
          lastmod: todayIso,
        });
        for (const cat of mainCategories) {
          urlEntries.push({
            url: `${baseUrl}${buildChillyUrl({ city: city.name, categoryId: cat.id, categories })}`,
            lastmod: todayIso,
          });
        }
      }

      for (const item of listingsRes.items) {
        const itemLastmod = item.createdAt ? new Date(item.createdAt).toISOString().split('T')[0] : todayIso;
        urlEntries.push({
          url: `${baseUrl}${buildChillyUrl({
            city: item.location.city,
            categoryId: item.categoryId,
            subcategoryId: item.subcategoryId,
            listing: item,
            categories,
          })}`,
          lastmod: itemLastmod,
        });
      }

      const xmlEscaped = (str: string) =>
        str
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&apos;');

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries
  .map(
    (e) => `  <url>
    <loc>${xmlEscaped(e.url)}</loc>
    <lastmod>${e.lastmod}</lastmod>
    <changefreq>daily</changefreq>
  </url>`
  )
  .join('\n')}
</urlset>`;
      res.type('application/xml').send(xml);
    } catch (err: any) {
      res.status(500).type('text/plain').send(err?.message || 'Error generating sitemap');
    }
  });

  app.use('/uploads', express.static(path.join(process.cwd(), 'public', 'uploads')));

  let vite: ViteDevServer | undefined;
  if (isDevelopment) {
    vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath, { index: false }));
  }

  // Full HTML Server-Side Rendering (SSR) Handler for all application routes
  app.use('*', async (req, res, next) => {
    if (req.originalUrl.startsWith('/api/')) {
      return next();
    }

    try {
      const urlPath = (req.originalUrl || req.url || '/').split('?')[0] || '/';
      const queryObj: Record<string, string> = {};
      for (const [k, v] of Object.entries(req.query || {})) {
        if (typeof v === 'string') {
          queryObj[k] = v;
        } else if (Array.isArray(v) && v.length > 0) {
          queryObj[k] = String(v[0]);
        }
      }

      const origin = getPublicBaseUrl();

      let templateHtml: string;
      if (vite) {
        const rawTemplate = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf-8');
        templateHtml = await vite.transformIndexHtml(req.originalUrl, rawTemplate);
      } else {
        const distIndex = path.resolve(process.cwd(), 'dist/index.html');
        const rootIndex = path.resolve(process.cwd(), 'index.html');
        templateHtml = fs.readFileSync(fs.existsSync(distIndex) ? distIndex : rootIndex, 'utf-8');
      }

      const ssrResult = await renderSsrPage(urlPath, queryObj, origin);

      const safeTitle = escapeHtml(ssrResult.pageTitle);
      const safeDesc = escapeHtml(ssrResult.metaDescription);
      const serializedState = serializeJsonLd(ssrResult.ssrProps);

      const fullHtml = templateHtml
        .replace(/<title>.*?<\/title>/s, () => `<title>${safeTitle}</title>`)
        .replace(
          /<meta name="description" content=".*?" \/>/,
          () => `<meta name="description" content="${safeDesc}" />`
        )
        .replace(
          /<meta property="og:title" content=".*?" \/>/,
          () => `<meta property="og:title" content="${safeTitle}" />`
        )
        .replace(
          /<meta property="og:description" content=".*?" \/>/,
          () => `<meta property="og:description" content="${safeDesc}" />`
        )
        .replace('</head>', () => `    ${ssrResult.headTagsHtml}\n  </head>`)
        .replace('<div id="root"></div>', () => `<div id="root">${ssrResult.appHtml}</div>`)
        .replace(
          '</body>',
          () => `    <script id="__SSR_STATE__" type="application/json">${serializedState}</script>\n  </body>`
        );

      res.status(ssrResult.statusCode || 200).set({ 'Content-Type': 'text/html; charset=utf-8' }).end(fullHtml);
    } catch (err: any) {
      if (vite) {
        vite.ssrFixStacktrace(err);
      }
      console.error('[SSR Error]:', err);
      next(err);
    }
  });

  // Global Express Error Middleware
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('[Express Global Error]:', err);
    if (res.headersSent) return _next(err);
    const statusCode = typeof err.status === 'number' ? err.status : 500;
    res.status(statusCode).json({
      error: isDevelopment ? err.message || 'Internal Server Error' : 'Internal Server Error',
    });
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(
      `Chillyads / Classifieds_V5 (Node.js + Vite + Express + PostgreSQL + Full SSR) running on http://localhost:${PORT}`
    );
  });
}

startServer().catch((err) => {
  console.error('[Server] Fatal startup failure:', err);
  process.exit(1);
});
