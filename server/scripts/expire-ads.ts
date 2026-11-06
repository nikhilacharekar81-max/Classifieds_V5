
import { db } from '@/src/db/index';
import * as schema from '@/src/db/schema';
import { lt, eq, and, sql } from '@/src/db/pg-orm';

async function expireAds() {
  console.log('Running expiry job...');
  const now = new Date();
  
  // Set status to 'expired' for listings where expiresAt < now AND status is 'approved'
  const result = await db
    .update(schema.listings)
    .set({ status: 'expired' })
    .where(
      and(
        eq(schema.listings.status, 'approved'),
        lt(schema.listings.expiresAt, now)
      )
    );
  
  console.log(`Expired ${result.rowCount || 0} ads.`);
}

expireAds().catch(console.error).then(() => process.exit(0));
