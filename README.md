# LFBR Travel

Web app per organizzare viaggi in base a gusti, budget, durata e ritmo. Il progetto non è più un sito editoriale: la home è il planner e il vecchio archivio articoli è escluso dalla navigazione e dai crawler.

## Funzioni attuali

- planner in 4 passaggi;
- modalità destinazione nota o consiglio destinazione;
- profilo interessi con pesi;
- punteggio di compatibilità;
- itinerario fino a 30 giorni;
- ritmo rilassato, equilibrato o intenso;
- ordinamento delle tappe anche in base alla vicinanza;
- calendario viaggio;
- mappa Leaflet + OpenStreetMap;
- riordino, rimozione e aggiunta "Sorprendimi";
- salvataggio locale con localStorage;
- Google Authentication;
- sincronizzazione profilo e viaggi su Cloud Firestore;
- area "I miei viaggi" con apertura, rinomina, duplicazione ed eliminazione;
- stato viaggio: bozza, pianificato, in corso, concluso.

## Dati e persistenza

- `app-data.js`: dataset beta di destinazioni e luoghi.
- `storage.js`: salvataggio locale.
- `firebase-client.js`: Authentication e Firestore.
- `firestore.rules`: accesso ai dati privati limitato al proprietario.
- `firebase-applet-config.json`: configurazione pubblica del client Firebase.
- `firebase.json`, `.firebaserc`, `firestore.indexes.json`: configurazione versionata per il deploy Firebase.

La configurazione Web Firebase contiene identificatori client pubblici e non deve contenere service-account key, password o altri segreti server-side.

## Struttura dati Firestore

### users/{uid}

Campi principali:
- id
- email
- displayName
- travelProfile
- profileUpdatedAt
- createdAt
- updatedAt

### trips/{tripId}

Campi principali:
- id
- ownerId
- destinationId
- title
- score
- profile
- itinerary
- isPublic
- status
- createdAt
- updatedAt

## Sviluppo locale

```bash
npm install
npm run dev
```

Il server Express pubblica i file statici e usa `index.html` come fallback.

## Controlli

```bash
npm run check
```

Prima di modificare file sincronizzati con AI Studio, leggere sempre l'ultima versione su `main`.

## Firebase

Le regole sono versionate nel repository. Se AI Studio non distribuisce automaticamente le regole dopo il sync GitHub, eseguire il deploy Firebase del progetto `lfbr-travel` oppure pubblicarle dalla console Firebase.

Per l'accesso Google verificare che i domini usati dall'app siano presenti in Firebase Authentication > Settings > Authorized domains.

## Limiti attuali della beta

Il dataset turistico è ancora locale e selezionato manualmente. Costi, durate e descrizioni sono indicativi. Il prossimo passaggio architetturale è collegare un provider esterno per POI, orari e dati aggiornati, lasciando Firestore come database dei dati utente e dei viaggi.
