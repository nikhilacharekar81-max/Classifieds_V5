import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { createServer as createViteServer, ViteDevServer } from 'vite';
import { createExpressRouteHandler } from './src/shims/next-server.ts';
import { ensurePgSchemaApplied, db } from './src/db/index.ts';
import { ensureDatabaseSeeded } from './server/seed-postgres.ts';
import { categoryRepository } from './server/repositories/category.repository.ts';
import { locationRepository } from './server/repositories/location.repository.ts';
import { listingRepository } from './server/repositories/listing.repository.ts';
import { buildChillyUrl, serializeJsonLd } from './lib/utils/seoAndUrlHelper.ts';
import { renderSsrPage } from './src/entry-server.tsx';

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
import * as listingsRoute from './server/api/listings/route.ts';
import * as listingsUploadRoute from './server/api/listings/upload/route.ts';
import * as listingsByIdRoute from './server/api/listings/[id]/route.ts';
import * as listingsRevealPhoneRoute from './server/api/listings/[id]/reveal-phone/route.ts';
import * as listingsCheckDuplicateRoute from './server/api/listings/check-duplicate/route.ts';
import * as listingsBulkActionRoute from './server/api/listings/bulk-action/route.ts';
import * as boostPackagesRoute from './server/api/boost/packages/route.ts';
import * as boostPackageByIdRoute from './server/api/boost/packages/[id]/route.ts';
import * as boostCreateOrderRoute from './server/api/boost/create-order/route.ts';
import * as boostVerifyPaymentRoute from './server/api/boost/verify-payment/route.ts';
import * as boostWebhookRoute from './server/api/boost/webhook/route.ts';
import * as boostAnalyticsRoute from './server/api/boost/analytics/route.ts';
import * as boostCleanupExpiredRoute from './server/api/boost/cleanup-expired/route.ts';
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
import * as adminImpersonateRoute from './server/api/admin/impersonate/route.ts';

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

async function startServer() {
  await initializePostgreSQL();

  const app = express();
  if (process.env.TRUST_PROXY) {
    app.set('trust proxy', process.env.TRUST_PROXY === 'true' ? true : process.env.TRUST_PROXY);
  }
  const PORT = 3000;

  // Preserve raw body for webhook HMAC verification while parsing JSON
  app.use(
    express.json({
      limit: '10mb',
      verify: (req, _res, buf) => {
        (req as any).rawBody = buf.toString('utf8');
      },
    })
  );

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

  // Listings Routes
  app.all('/api/listings/upload', createExpressRouteHandler(listingsUploadRoute));
  app.all('/api/listings/check-duplicate', createExpressRouteHandler(listingsCheckDuplicateRoute));
  app.all('/api/listings/bulk-action', createExpressRouteHandler(listingsBulkActionRoute));
  app.all('/api/listings/:id/reveal-phone', createExpressRouteHandler(listingsRevealPhoneRoute));
  app.all('/api/listings/:id', createExpressRouteHandler(listingsByIdRoute));
  app.all('/api/listings', createExpressRouteHandler(listingsRoute));

  // Boost & Monetization Routes
  app.all('/api/boost/packages/:id', createExpressRouteHandler(boostPackageByIdRoute));
  app.all('/api/boost/packages', createExpressRouteHandler(boostPackagesRoute));
  app.all('/api/boost/create-order', createExpressRouteHandler(boostCreateOrderRoute));
  app.all('/api/boost/verify-payment', createExpressRouteHandler(boostVerifyPaymentRoute));
  app.all('/api/boost/webhook', createExpressRouteHandler(boostWebhookRoute));
  app.all('/api/boost/analytics', createExpressRouteHandler(boostAnalyticsRoute));
  app.all('/api/boost/cleanup-expired', createExpressRouteHandler(boostCleanupExpiredRoute));

  // Admin Console Routes
  app.all('/api/admin/metrics', createExpressRouteHandler(adminMetricsRoute));
  app.all('/api/admin/categories/:id', createExpressRouteHandler(adminCategoryByIdRoute));
  app.all('/api/admin/categories', createExpressRouteHandler(adminCategoriesRoute));
  app.all('/api/admin/locations/:id', createExpressRouteHandler(adminLocationByIdRoute));
  app.all('/api/admin/locations', createExpressRouteHandler(adminLocationsRoute));
  app.all('/api/admin/users/:id', createExpressRouteHandler(adminUserByIdRoute));
  app.all('/api/admin/users', createExpressRouteHandler(adminUsersRoute));
  app.all('/api/admin/moderation', createExpressRouteHandler(adminModerationRoute));
  app.all('/api/admin/settings', createExpressRouteHandler(adminSettingsRoute));
  app.all('/api/admin/cms/:id', createExpressRouteHandler(adminCmsByIdRoute));
  app.all('/api/admin/cms', createExpressRouteHandler(adminCmsRoute));
  app.all('/api/chat', createExpressRouteHandler(chatRoute));
  app.all('/api/reports', createExpressRouteHandler(reportsRoute));
  app.all('/api/user/kyc', createExpressRouteHandler(userKycRoute));
  app.all('/api/admin/impersonate', createExpressRouteHandler(adminImpersonateRoute));

  // SEO robots.txt
  app.get('/robots.txt', (req, res) => {
    const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host') || 'localhost:3000'}`;
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
      const baseUrl = (process.env.APP_URL || `${req.protocol}://${req.get('host') || 'localhost:3000'}`).replace(
        /\/$/,
        ''
      );
      const [categories, locations, listingsRes] = await Promise.all([
        categoryRepository.findAll(),
        locationRepository.findAll(),
        listingRepository.findMarketplaceListings({ status: 'approved', limit: 200 }),
      ]);

      const urls: string[] = [`${baseUrl}/`, `${baseUrl}/post`, `${baseUrl}/search`];
      const topCities = locations.filter((l) => l.type === 'city' && l.popular).slice(0, 10);
      const mainCategories = categories.filter((c) => !c.parentId && c.isActive);

      for (const city of topCities) {
        urls.push(`${baseUrl}${buildChillyUrl({ city: city.name, categories })}`);
        for (const cat of mainCategories) {
          urls.push(`${baseUrl}${buildChillyUrl({ city: city.name, categoryId: cat.id, categories })}`);
        }
      }

      for (const item of listingsRes.items) {
        urls.push(
          `${baseUrl}${buildChillyUrl({
            city: item.location.city,
            categoryId: item.categoryId,
            subcategoryId: item.subcategoryId,
            listing: item,
            categories,
          })}`
        );
      }

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${u.replace(/&/g, '&amp;')}</loc>
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

      const origin = process.env.APP_URL || `${req.protocol}://${req.get('host') || 'localhost:3000'}`;

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

      res.status(200).set({ 'Content-Type': 'text/html; charset=utf-8' }).end(fullHtml);
    } catch (err: any) {
      if (vite) {
        vite.ssrFixStacktrace(err);
      }
      console.error('[SSR Error]:', err);
      next(err);
    }
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
