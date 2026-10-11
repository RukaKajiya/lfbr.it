import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js';

let app = null;
let auth = null;
let db = null;
let currentUser = null;
let initPromise = null;

const cleanText = (value, max = 120) => String(value || '').trim().slice(0, max);

function timestampMillis(value) {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.seconds === 'number') return value.seconds * 1000;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeTrip(data) {
  if (!data) return null;
  return {
    ...data,
    createdAtMs: timestampMillis(data.createdAt),
    updatedAtMs: timestampMillis(data.updatedAt)
  };
}

async function ensureReady() {
  if (initPromise) await initPromise;
  if (!auth || !db) throw new Error('Firebase non è disponibile. Controlla la configurazione del progetto.');
}

async function ensureSignedIn() {
  await ensureReady();
  if (!auth.currentUser) throw new Error('Accedi con Google per usare il salvataggio Cloud.');
  return auth.currentUser;
}

async function syncUserProfile(user) {
  if (!db || !user) return null;
  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      id: user.uid,
      email: user.email || '',
      displayName: user.displayName || 'Viaggiatore',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  } else {
    await setDoc(ref, {
      email: user.email || '',
      displayName: user.displayName || 'Viaggiatore',
      updatedAt: serverTimestamp()
    }, { merge: true });
  }
  const updated = await getDoc(ref);
  return updated.exists() ? updated.data() : null;
}

async function initFirebase() {
  try {
    const response = await fetch('/firebase-applet-config.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('Configurazione Firebase non trovata.');
    const config = await response.json();
    if (!config.apiKey || !config.projectId || !config.appId) throw new Error('Configurazione Firebase incompleta.');

    app = initializeApp(config);
    auth = getAuth(app);
    db = config.firestoreDatabaseId ? getFirestore(app, config.firestoreDatabaseId) : getFirestore(app);

    onAuthStateChanged(auth, async user => {
      currentUser = user;
      let profile = null;
      if (user) {
        try {
          profile = await syncUserProfile(user);
        } catch (error) {
          console.warn('Profilo Firebase non sincronizzato:', error);
        }
      }
      window.dispatchEvent(new CustomEvent('lfbr:auth-change', { detail: { user, profile } }));
    });

    window.dispatchEvent(new CustomEvent('lfbr:firebase-ready'));
    return true;
  } catch (error) {
    console.error('Firebase initialization error:', error);
    window.dispatchEvent(new CustomEvent('lfbr:firebase-error', { detail: { message: error.message } }));
    return false;
  }
}

export async function loginWithGoogle() {
  await ensureReady();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  try {
    return await signInWithPopup(auth, provider);
  } catch (error) {
    if (['auth/popup-blocked', 'auth/cancelled-popup-request'].includes(error.code)) {
      await signInWithRedirect(auth, provider);
      return null;
    }
    if (error.code === 'auth/unauthorized-domain') {
      throw new Error(`Dominio non autorizzato: aggiungi "${window.location.hostname}" in Firebase Authentication > Settings > Authorized domains.`);
    }
    if (error.code === 'auth/operation-not-allowed') {
      throw new Error('Abilita Google in Firebase Authentication > Sign-in method.');
    }
    if (error.code === 'auth/popup-closed-by-user') {
      throw new Error('Accesso annullato.');
    }
    throw error;
  }
}

export async function logoutUser() {
  await ensureReady();
  await signOut(auth);
}

export async function saveTravelProfile(profile) {
  const user = await ensureSignedIn();
  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await setDoc(ref, {
      id: user.uid,
      email: user.email || '',
      displayName: user.displayName || 'Viaggiatore',
      travelProfile: profile || {},
      profileUpdatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  } else {
    await setDoc(ref, {
      travelProfile: profile || {},
      profileUpdatedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });
  }
  return profile;
}

export async function loadTravelProfile() {
  const user = await ensureSignedIn();
  const snap = await getDoc(doc(db, 'users', user.uid));
  return snap.exists() ? (snap.data().travelProfile || null) : null;
}

export async function saveTripToCloud(tripData) {
  const user = await ensureSignedIn();
  const existingId = cleanText(tripData?.id, 128);
  const ref = existingId ? doc(db, 'trips', existingId) : doc(collection(db, 'trips'));
  const snap = existingId ? await getDoc(ref) : null;

  if (snap?.exists() && snap.data().ownerId !== user.uid) {
    throw new Error('Non puoi modificare un viaggio appartenente a un altro account.');
  }

  const status = ['draft', 'planned', 'in_progress', 'completed'].includes(tripData?.status)
    ? tripData.status
    : 'planned';

  const common = {
    id: ref.id,
    ownerId: user.uid,
    destinationId: cleanText(tripData?.destinationId, 64),
    title: cleanText(tripData?.title || `Viaggio a ${tripData?.destinationId || 'destinazione'}`, 120),
    score: Math.max(0, Math.min(100, Number(tripData?.score) || 0)),
    profile: tripData?.profile || {},
    itinerary: Array.isArray(tripData?.itinerary) ? tripData.itinerary.slice(0, 30) : [],
    travelQuotes: tripData?.travelQuotes && typeof tripData.travelQuotes === 'object' ? tripData.travelQuotes : {},
    isPublic: Boolean(tripData?.isPublic),
    status,
    updatedAt: serverTimestamp()
  };

  if (snap?.exists()) {
    await setDoc(ref, common, { merge: true });
  } else {
    await setDoc(ref, { ...common, createdAt: serverTimestamp() });
  }

  return {
    ...tripData,
    ...common,
    id: ref.id,
    ownerId: user.uid,
    updatedAt: new Date().toISOString(),
    createdAt: tripData?.createdAt || new Date().toISOString()
  };
}

export async function loadUserTripsFromCloud() {
  const user = await ensureSignedIn();
  const q = query(collection(db, 'trips'), where('ownerId', '==', user.uid));
  const snap = await getDocs(q);
  const trips = [];
  snap.forEach(item => trips.push(normalizeTrip(item.data())));
  return trips.sort((a, b) => (b.updatedAtMs || b.createdAtMs) - (a.updatedAtMs || a.createdAtMs));
}

export async function renameTrip(tripId, title) {
  const user = await ensureSignedIn();
  const ref = doc(db, 'trips', cleanText(tripId, 128));
  const snap = await getDoc(ref);
  if (!snap.exists() || snap.data().ownerId !== user.uid) throw new Error('Viaggio non trovato.');
  const safeTitle = cleanText(title, 120);
  if (!safeTitle) throw new Error('Inserisci un nome valido.');
  await setDoc(ref, {
    title: safeTitle,
    status: snap.data().status || 'planned',
    updatedAt: serverTimestamp()
  }, { merge: true });
  return safeTitle;
}

export async function updateTripStatus(tripId, status) {
  const user = await ensureSignedIn();
  if (!['draft', 'planned', 'in_progress', 'completed'].includes(status)) throw new Error('Stato non valido.');
  const ref = doc(db, 'trips', cleanText(tripId, 128));
  const snap = await getDoc(ref);
  if (!snap.exists() || snap.data().ownerId !== user.uid) throw new Error('Viaggio non trovato.');
  await setDoc(ref, { status, updatedAt: serverTimestamp() }, { merge: true });
  return status;
}

export async function deleteTripFromCloud(tripId) {
  const user = await ensureSignedIn();
  const ref = doc(db, 'trips', cleanText(tripId, 128));
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  if (snap.data().ownerId !== user.uid) throw new Error('Non puoi eliminare questo viaggio.');
  await deleteDoc(ref);
}

export async function duplicateTripToCloud(tripData) {
  const copy = {
    ...tripData,
    id: undefined,
    ownerId: undefined,
    title: cleanText((tripData?.title || 'Viaggio') + ' — copia', 120),
    createdAt: undefined,
    updatedAt: undefined,
    status: 'draft',
    isPublic: false
  };
  return saveTripToCloud(copy);
}


export async function createPriceWatch(input) {
  const user = await ensureSignedIn();
  if (!input?.live) throw new Error('Puoi monitorare solo prezzi provenienti da una ricerca live.');

  const ref = doc(collection(db, 'priceWatches'));
  const price = Number(input.price);
  if (!(price > 0)) throw new Error('Prezzo non valido.');

  const alertMode = ['new_low', 'any_drop', 'below', 'drop_pct'].includes(input.alertMode)
    ? input.alertMode
    : 'new_low';

  const payload = {
    id: ref.id,
    ownerId: user.uid,
    ...(input.tripId ? { tripId: cleanText(input.tripId, 128) } : {}),
    type: input.type === 'hotel' ? 'hotel' : 'flight',
    label: cleanText(input.label || 'Monitoraggio prezzo', 160),
    query: input.query && typeof input.query === 'object' ? input.query : {},
    currency: cleanText(input.currency || 'EUR', 8),
    initialPrice: price,
    lastPrice: price,
    bestPrice: price,
    alertMode,
    ...(Number(input.alertBelow) > 0 ? { alertBelow: Number(input.alertBelow) } : {}),
    ...(Number(input.alertPercent) > 0 ? { alertPercent: Number(input.alertPercent) } : {}),
    enabled: true,
    live: true,
    source: cleanText(input.source || 'provider', 40),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  await setDoc(ref, payload);
  return { ...payload, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
}

export async function loadPriceWatches() {
  const user = await ensureSignedIn();
  const q = query(collection(db, 'priceWatches'), where('ownerId', '==', user.uid));
  const snap = await getDocs(q);
  const items = [];
  snap.forEach(item => {
    const data = item.data();
    items.push({
      ...data,
      createdAtMs: timestampMillis(data.createdAt),
      updatedAtMs: timestampMillis(data.updatedAt),
      lastCheckedAtMs: timestampMillis(data.lastCheckedAt),
      alertTriggeredAtMs: timestampMillis(data.alertTriggeredAt)
    });
  });
  return items.sort((a, b) => (b.updatedAtMs || b.createdAtMs) - (a.updatedAtMs || a.createdAtMs));
}

export async function loadPriceSnapshots(watchId, max = 20) {
  await ensureSignedIn();
  const ref = collection(db, 'priceWatches', cleanText(watchId, 128), 'snapshots');
  const q = query(ref, orderBy('checkedAt', 'desc'), limit(Math.max(1, Math.min(50, Number(max) || 20))));
  const snap = await getDocs(q);
  const items = [];
  snap.forEach(item => {
    const data = item.data();
    items.push({ ...data, checkedAtMs: timestampMillis(data.checkedAt) });
  });
  return items.reverse();
}

export async function updatePriceWatch(watchId, changes) {
  const user = await ensureSignedIn();
  const ref = doc(db, 'priceWatches', cleanText(watchId, 128));
  const snap = await getDoc(ref);
  if (!snap.exists() || snap.data().ownerId !== user.uid) throw new Error('Monitoraggio non trovato.');

  const patch = { updatedAt: serverTimestamp() };
  if (typeof changes?.enabled === 'boolean') patch.enabled = changes.enabled;
  if (changes?.label !== undefined) patch.label = cleanText(changes.label, 160);
  if (['new_low', 'any_drop', 'below', 'drop_pct'].includes(changes?.alertMode)) patch.alertMode = changes.alertMode;
  if (Number(changes?.alertBelow) > 0) patch.alertBelow = Number(changes.alertBelow);
  if (Number(changes?.alertPercent) > 0) patch.alertPercent = Number(changes.alertPercent);

  await setDoc(ref, patch, { merge: true });
  return patch;
}

export async function deletePriceWatch(watchId) {
  const user = await ensureSignedIn();
  const ref = doc(db, 'priceWatches', cleanText(watchId, 128));
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  if (snap.data().ownerId !== user.uid) throw new Error('Non puoi eliminare questo monitoraggio.');
  await deleteDoc(ref);
}

window.LFBRFirebase = {
  get app() { return app; },
  get auth() { return auth; },
  get db() { return db; },
  get currentUser() { return currentUser || auth?.currentUser || null; },
  ready: () => ensureReady(),
  loginWithGoogle,
  logoutUser,
  saveTravelProfile,
  loadTravelProfile,
  saveTripToCloud,
  loadUserTripsFromCloud,
  renameTrip,
  updateTripStatus,
  deleteTripFromCloud,
  duplicateTripToCloud,
  createPriceWatch,
  loadPriceWatches,
  loadPriceSnapshots,
  updatePriceWatch,
  deletePriceWatch
};

initPromise = initFirebase();
