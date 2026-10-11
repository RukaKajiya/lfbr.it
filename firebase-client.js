import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js';
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js';

export const OperationType = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  LIST: 'list',
  GET: 'get',
  WRITE: 'write',
};

let app = null;
let auth = null;
let db = null;
let currentUser = null;
let initialized = false;
let initPromise = null;

export function handleFirestoreError(error, operationType, path) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified || null,
      isAnonymous: auth?.currentUser?.isAnonymous || null,
      tenantId: auth?.currentUser?.tenantId || null,
      providerInfo: auth?.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function initFirebase() {
  try {
    const res = await fetch('/firebase-applet-config.json');
    if (!res.ok) throw new Error('Could not load firebase-applet-config.json');
    const config = await res.json();

    app = initializeApp(config);
    db = config.firestoreDatabaseId ? getFirestore(app, config.firestoreDatabaseId) : getFirestore(app);
    auth = getAuth(app);
    initialized = true;

    // Validate Connection to Firestore on boot as required by specification
    testConnection();

    onAuthStateChanged(auth, async (user) => {
      currentUser = user;
      if (user) {
        await syncUserProfile(user);
      }
      window.dispatchEvent(new CustomEvent('lfbr:auth-change', { detail: { user } }));
    });
  } catch (err) {
    console.error('Firebase initialization error:', err);
  }
}

async function testConnection() {
  if (!db) return;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

async function syncUserProfile(user) {
  if (!db || !user) return;
  const userRef = doc(db, 'users', user.uid);
  try {
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      await setDoc(userRef, {
        id: user.uid,
        email: user.email || '',
        displayName: user.displayName || 'Viaggiatore',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } else {
      await setDoc(userRef, {
        displayName: user.displayName || 'Viaggiatore',
        updatedAt: serverTimestamp()
      }, { merge: true });
    }
  } catch (err) {
    console.warn('Sync profilo utente in attesa (database o regole Firestore):', err?.message || err);
  }
}

export async function loginWithGoogle() {
  if (initPromise) await initPromise;
  if (!auth) throw new Error('Firebase Auth non è ancora inizializzato');
  const provider = new GoogleAuthProvider();
  try {
    return await signInWithPopup(auth, provider);
  } catch (err) {
    if (err.code === 'auth/unauthorized-domain') {
      throw new Error(`Dominio non autorizzato: aggiungi "${window.location.hostname}" nei Domini autorizzati su Firebase Console (Authentication > Settings > Authorized domains).`);
    }
    if (err.code === 'auth/operation-not-allowed') {
      throw new Error('Google Sign-in non abilitato: attivalo su Firebase Console (Authentication > Sign-in method > Google).');
    }
    if (err.code === 'auth/popup-blocked') {
      throw new Error('Il browser ha bloccato il popup: consenti i popup per questo sito e riprova.');
    }
    if (err.code === 'auth/popup-closed-by-user') {
      throw new Error('Accesso annullato (popup chiuso).');
    }
    throw err;
  }
}

export async function logoutUser() {
  if (!auth) return;
  return signOut(auth);
}

export async function saveTripToCloud(tripData) {
  if (!db || !auth?.currentUser) {
    throw new Error('Devi effettuare il login per salvare nel Cloud');
  }

  const tripId = tripData.id || ('trip_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6));
  const tripRef = doc(db, 'trips', tripId);
  const now = serverTimestamp();

  // Clean and prepare payload according to firebase-blueprint.json
  const payload = {
    id: tripId,
    ownerId: auth.currentUser.uid,
    destinationId: tripData.destinationId,
    title: (tripData.title || `Viaggio a ${tripData.destinationId}`).substring(0, 120),
    score: Number(tripData.score) || 0,
    profile: tripData.profile || {},
    itinerary: (tripData.itinerary || []).slice(0, 30),
    isPublic: Boolean(tripData.isPublic),
    createdAt: tripData.createdAt ? now : now,
    updatedAt: now
  };

  try {
    await setDoc(tripRef, payload);
    return { ...tripData, id: tripId };
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `trips/${tripId}`);
  }
}

export async function loadUserTripsFromCloud() {
  if (!db || !auth?.currentUser) return [];
  const q = query(
    collection(db, 'trips'),
    where('ownerId', '==', auth.currentUser.uid)
  );

  try {
    const snap = await getDocs(q);
    const trips = [];
    snap.forEach(d => trips.push(d.data()));
    return trips;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'trips');
  }
}

// Expose on window for easy access across scripts
window.LFBRFirebase = {
  get auth() { return auth; },
  get db() { return db; },
  get currentUser() { return currentUser; },
  loginWithGoogle,
  logoutUser,
  saveTripToCloud,
  loadUserTripsFromCloud
};

initPromise = initFirebase();
