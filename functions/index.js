import { onSchedule } from 'firebase-functions/v2/scheduler';
import { setGlobalOptions } from 'firebase-functions/v2';
import { defineSecret } from 'firebase-functions/params';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { searchFlights, searchHotels, providerStatus } from './travel-provider.js';

initializeApp();
setGlobalOptions({ region: 'europe-west1', maxInstances: 2 });

const db = getFirestore();
const serpApiKey = defineSecret('SERPAPI_KEY');
const FREE_PLAN_MAX_WATCHES_PER_RUN = 5;

function minPriceResult(results) {
  return (Array.isArray(results) ? results : [])
    .filter(item => Number(item?.price) > 0)
    .sort((a, b) => Number(a.price) - Number(b.price))[0] || null;
}

function evaluateAlert(watch, price) {
  const previous = Number(watch.lastPrice || 0);
  const previousBest = Number(watch.bestPrice || 0);
  const mode = watch.alertMode || 'new_low';

  if (mode === 'below' && Number(watch.alertBelow) > 0 && price <= Number(watch.alertBelow)) {
    return { triggered: true, reason: 'below_threshold' };
  }
  if (mode === 'drop_pct' && previous > 0 && Number(watch.alertPercent) > 0) {
    const drop = ((previous - price) / previous) * 100;
    if (drop >= Number(watch.alertPercent)) return { triggered: true, reason: 'drop_percentage' };
  }
  if (mode === 'any_drop' && previous > 0 && price < previous) {
    return { triggered: true, reason: 'price_drop' };
  }
  if (mode === 'new_low' && previousBest > 0 && price < previousBest) {
    return { triggered: true, reason: 'new_low' };
  }
  return { triggered: false, reason: null };
}

async function checkOneWatch(docSnap) {
  const watch = docSnap.data();
  const ref = docSnap.ref;
  if (!watch?.enabled) return;

  try {
    const response = watch.type === 'flight'
      ? await searchFlights(watch.query || {}, { allowDemo: false })
      : await searchHotels(watch.query || {}, { allowDemo: false });

    const best = minPriceResult(response.results);
    if (!best) {
      await ref.set({
        lastCheckedAt: FieldValue.serverTimestamp(),
        lastError: 'no_results',
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });
      return;
    }

    const price = Number(best.price);
    const previousBest = Number(watch.bestPrice || watch.initialPrice || 0);
    const nextBest = previousBest > 0 ? Math.min(previousBest, price) : price;
    const alert = evaluateAlert(watch, price);

    await ref.set({
      lastPrice: price,
      bestPrice: nextBest,
      currency: best.currency || watch.currency || 'EUR',
      lastCheckedAt: FieldValue.serverTimestamp(),
      lastError: null,
      alertPending: alert.triggered,
      alertReason: alert.reason,
      ...(alert.triggered ? { alertTriggeredAt: FieldValue.serverTimestamp() } : {}),
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });

    await ref.collection('snapshots').add({
      price,
      currency: best.currency || watch.currency || 'EUR',
      checkedAt: FieldValue.serverTimestamp(),
      source: response.source || 'serpapi',
      result: {
        id: best.id || null,
        name: best.name || null,
        airline: best.airline || null,
        outbound: best.outbound || null,
        inbound: best.inbound || null
      }
    });
  } catch (error) {
    await ref.set({
      lastCheckedAt: FieldValue.serverTimestamp(),
      lastError: String(error?.message || 'price_check_failed').slice(0, 180),
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
  }
}

export const checkTravelPrices = onSchedule({
  schedule: '0 8 * * *',
  timeZone: 'Europe/Rome',
  timeoutSeconds: 300,
  memory: '512MiB',
  secrets: [serpApiKey]
}, async () => {
  process.env.SERPAPI_KEY = serpApiKey.value();

  const status = providerStatus();
  if (status.mode !== 'live') {
    console.log('Travel price monitor skipped: serpapi_not_configured');
    return;
  }

  const snap = await db.collection('priceWatches')
    .where('enabled', '==', true)
    .limit(FREE_PLAN_MAX_WATCHES_PER_RUN)
    .get();

  for (const watch of snap.docs) {
    await checkOneWatch(watch);
  }
});
