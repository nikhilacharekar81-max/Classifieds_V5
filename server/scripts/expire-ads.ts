import { listingRepository } from '../repositories/listing.repository';

async function expireAds() {
  console.log('[CLI] Running manual expiry job...');
  try {
    const count = await listingRepository.expireDueListings();
    console.log(`[CLI] Successfully expired ${count} ads.`);
  } catch (err) {
    console.error('[CLI] Expiry job failed:', err);
    process.exit(1);
  }
}

expireAds().catch(console.error).then(() => process.exit(0));
