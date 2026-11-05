import { Pool } from 'pg';
import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs';
import path from 'node:path';
import { createPgDb, PgDatabase } from './pg-orm.ts';

declare global {
  var _postgresPool: Pool | undefined;
  var _pgliteInstance: PGlite | undefined;
  var _pgliteInitPromise: Promise<PGlite> | undefined;
  var _schemaAppliedPromise: Promise<void> | undefined;
}

async function getInitializedPglite(): Promise<PGlite> {
  if (global._pgliteInitPromise) {
    return global._pgliteInitPromise;
  }

  global._pgliteInitPromise = (async () => {
    const pg = new PGlite();
    global._pgliteInstance = pg;

    const schemaPath = path.resolve(process.cwd(), 'database/schema.sql');
    if (fs.existsSync(schemaPath)) {
      const sqlContent = fs.readFileSync(schemaPath, 'utf8');
      const statements = sqlContent
        .split('--> statement-breakpoint')
        .map((s) => s.trim())
        .filter(Boolean);
      for (const stmt of statements) {
        try {
          await pg.exec(stmt);
        } catch (err: any) {
          if (!String(err?.message || '').includes('already exists')) {
            console.warn('[PGlite SchemaInit] Statement warning:', err?.message);
          }
        }
      }
      try {
        await pg.exec('ALTER TABLE "listings" ALTER COLUMN "price" DROP NOT NULL;');
      } catch {
        // Ignore if already dropped or table created without NOT NULL
      }
    }

    const rawExecutor = {
      query: async (text: string, params?: any[]) => {
        const res = await pg.query(text, params);
        return {
          rows: res.rows,
          rowCount: res.affectedRows ?? res.rows.length,
        };
      },
    };
    const rawDb = createPgDb(rawExecutor as any, true);

    const { seedEssentialProductionData, seedDemoData } = await import(
      '../../server/seed-postgres.ts'
    );
    await seedEssentialProductionData(rawDb);
    if (process.env.NODE_ENV !== 'production') {
      await seedDemoData(rawDb);
    }
    globalThis._isDatabaseInitialized = true;

    return pg;
  })();

  return global._pgliteInitPromise;
}

function createPglitePoolAdapter(): Pool {
  let lockChain: Promise<void> = Promise.resolve();

  const runExclusive = async <T>(fn: (pg: PGlite) => Promise<T>): Promise<T> => {
    const pg = await getInitializedPglite();
    let release!: () => void;
    const prevLock = lockChain;
    lockChain = new Promise<void>((resolve) => {
      release = resolve;
    });
    await prevLock;
    try {
      return await fn(pg);
    } finally {
      release();
    }
  };

  const adapter: any = {
    async query(text: string | { text: string; values?: any[] }, params?: any[]) {
      const sqlText = typeof text === 'string' ? text : text.text;
      const sqlParams = typeof text === 'string' ? params : text.values;
      return runExclusive(async (pg) => {
        const res = await pg.query(sqlText, sqlParams);
        return {
          rows: res.rows,
          rowCount: res.affectedRows ?? res.rows.length,
        };
      });
    },
    async connect() {
      const pg = await getInitializedPglite();
      let releaseLock!: () => void;
      const prevLock = lockChain;
      lockChain = new Promise<void>((resolve) => {
        releaseLock = resolve;
      });
      await prevLock;

      let released = false;
      return {
        async query(text: string | { text: string; values?: any[] }, params?: any[]) {
          const sqlText = typeof text === 'string' ? text : text.text;
          const sqlParams = typeof text === 'string' ? params : text.values;
          const res = await pg.query(sqlText, sqlParams);
          return {
            rows: res.rows,
            rowCount: res.affectedRows ?? res.rows.length,
          };
        },
        release() {
          if (!released) {
            released = true;
            releaseLock();
          }
        },
      };
    },
    on(_event: string, _listener: (...args: any[]) => void) {
      return adapter;
    },
    async end() {
      // No-op so shared in-process PGlite instance stays available across test suites
    },
  };

  return adapter as Pool;
}

export const createPool = (): Pool => {
  if (!global._postgresPool) {
    if (!process.env.SQL_HOST) {
      global._postgresPool = createPglitePoolAdapter();
      return global._postgresPool;
    }

    global._postgresPool = new Pool({
      host: process.env.SQL_HOST,
      user: process.env.SQL_USER || process.env.SQL_ADMIN_USER,
      password: process.env.SQL_PASSWORD || process.env.SQL_ADMIN_PASSWORD,
      database: process.env.SQL_DB_NAME,
      max: 10,
      connectionTimeoutMillis: 15000,
    });

    global._postgresPool.on('error', (err) => {
      const msg = String(err?.message || '');
      if (
        msg.includes('Connection terminated') ||
        msg.includes('ECONNRESET') ||
        msg.includes('57P01') ||
        msg.includes('socket hang up') ||
        msg.includes('closed')
      ) {
        return;
      }
      console.error('Unexpected error on idle SQL pool client:', err);
    });
  }
  return global._postgresPool;
};

export const pool: Pool = createPool();
export const db: PgDatabase = createPgDb(pool);

export async function withDbRetry<T>(fn: () => Promise<T>, maxRetries = 2): Promise<T> {
  let lastError: any;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const msg = String(err?.message || err?.cause?.message || '');
      const isConnectionDrop =
        msg.includes('Connection terminated') ||
        msg.includes('ECONNRESET') ||
        msg.includes('57P01') ||
        msg.includes('EPIPE') ||
        msg.includes('socket hang up') ||
        msg.includes('closed');

      if (isConnectionDrop && attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 150 * Math.pow(2, attempt)));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

/**
 * Ensures the PostgreSQL DDL schema (database/schema.sql) is applied and permissions are granted.
 */
export async function ensurePgSchemaApplied(): Promise<void> {
  if (global._schemaAppliedPromise) {
    return global._schemaAppliedPromise;
  }

  global._schemaAppliedPromise = (async () => {
    if (!process.env.SQL_HOST) {
      await getInitializedPglite();
      return;
    }

    const adminUser = process.env.SQL_ADMIN_USER || process.env.SQL_USER;
    const adminPassword = process.env.SQL_ADMIN_PASSWORD || process.env.SQL_PASSWORD;
    if (!process.env.SQL_HOST || !adminUser || !process.env.SQL_DB_NAME) {
      return;
    }

    const adminPool = new Pool({
      host: process.env.SQL_HOST,
      user: adminUser,
      password: adminPassword,
      database: process.env.SQL_DB_NAME,
      max: 2,
      connectionTimeoutMillis: 15000,
    });

    try {
      const checkRes = await adminPool.query(
        `SELECT COUNT(*)::int AS cnt FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'listings'`
      );
      if (Number(checkRes.rows[0]?.cnt || 0) === 0) {
        const schemaPath = path.resolve(process.cwd(), 'database/schema.sql');
        if (fs.existsSync(schemaPath)) {
          const sqlContent = fs.readFileSync(schemaPath, 'utf8');
          const statements = sqlContent
            .split('--> statement-breakpoint')
            .map((s) => s.trim())
            .filter(Boolean);
          for (const stmt of statements) {
            try {
              await adminPool.query(stmt);
            } catch (err: any) {
              if (!String(err?.message || '').includes('already exists')) {
                console.warn('[SchemaInit] Statement warning:', err?.message);
              }
            }
          }
        }
      }

      // Safe migration for existing databases
      const migrationSql = `
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='email_verified') THEN
    ALTER TABLE "users" ADD COLUMN "email_verified" boolean DEFAULT false NOT NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='email_verified_at') THEN
    ALTER TABLE "users" ADD COLUMN "email_verified_at" timestamp with time zone;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "email_verification_tokens" (
    "id" varchar(64) PRIMARY KEY NOT NULL,
    "user_id" varchar(64) NOT NULL REFERENCES "users"("id") ON DELETE cascade,
    "token_hash" varchar(128) NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "used_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
`;
      await adminPool.query(migrationSql);

      if (process.env.SQL_USER && process.env.SQL_USER !== adminUser) {
        await adminPool.query(`GRANT USAGE ON SCHEMA public TO "${process.env.SQL_USER}";`);
        await adminPool.query(`GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO "${process.env.SQL_USER}";`);
        await adminPool.query(`GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO "${process.env.SQL_USER}";`);
      }

      try {
        await adminPool.query('ALTER TABLE "listings" ALTER COLUMN "price" DROP NOT NULL;');
      } catch {
        // Ignore if already dropped or table created without NOT NULL
      }
    } finally {
      await adminPool.end().catch(() => {});
    }
  })();

  return global._schemaAppliedPromise;
}
