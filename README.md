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
- stato viaggio: bozza, pianificato, in corso, concluso;
- ricerca voli e hotel tramite backend;
- modalità demo esplicita quando il provider non è configurato;
- preventivo viaggio con volo, hotel e attività;
- monitoraggio prezzi Firestore con controllo programmato una volta al giorno;

## Dati e persistenza

- `app-data.js`: dataset beta di destinazioni e luoghi.
- `storage.js`: salvataggio locale.
- `firebase-client.js`: Authentication e Firestore.
- `firestore.rules`: accesso ai dati privati limitato al proprietario.
- `firebase-applet-config.json`: configurazione pubblica del client Firebase.
- `firebase.json`, `.firebaserc`, `firestore.indexes.json`: configurazione versionata per il deploy Firebase;
- `functions/travel-provider.js`: adapter server-side per voli e hotel;
- `functions/index.js`: controllo programmato dei prezzi;
- `functions/.env.example`: nomi delle variabili ambiente richieste.

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
- travelQuotes
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


### priceWatches/{watchId}

Contiene i criteri di ricerca e lo stato del monitoraggio:
- ownerId
- tripId opzionale
- type: flight | hotel
- query
- initialPrice
- lastPrice
- bestPrice
- alertMode
- enabled
- lastCheckedAt

Gli snapshot storici sono salvati in `priceWatches/{watchId}/snapshots`.

## Provider voli e hotel

Il backend usa **SerpApi** per Google Flights e Google Hotels. Senza chiave la ricerca resta disponibile in modalità demo chiaramente etichettata.

Configurare esclusivamente lato server:

```env
SERPAPI_KEY=...
SERPAPI_HL=it
SERPAPI_GL=it
SERPAPI_CURRENCY=EUR
```

Non inserire mai `SERPAPI_KEY` in `firebase-applet-config.json`, `index.html`, `script.js` o altri file client-side.

Per AI Studio / Cloud Run salva `SERPAPI_KEY` come secret/variabile server-side. Per Firebase Functions è preferibile Secret Manager:

```bash
firebase functions:secrets:set SERPAPI_KEY
```

Il piano gratuito SerpApi ha un plafond mensile limitato, quindi LFBR Travel limita il price tracker a **5 monitoraggi attivi** e li ricontrolla **una volta al giorno**. Le ricerche manuali consumano comunque il plafond del piano.

## Monitoraggio prezzi

`checkTravelPrices` è una Firebase scheduled function configurata ogni giorno alle 08:00 Europe/Rome. Con la configurazione gratuita controlla al massimo 5 watch attivi per esecuzione, aggiorna ultimo prezzo e minimo storico e registra uno snapshot. Se `SERPAPI_KEY` non è configurata la funzione termina senza generare prezzi fittizi.

La scheduled function richiede un progetto Firebase che supporti Cloud Functions/Cloud Scheduler e deve essere effettivamente distribuita; la sola sincronizzazione GitHub non garantisce il deploy della funzione.
