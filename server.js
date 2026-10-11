import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  providerStatus,
  searchFlights,
  searchHotels
} from './functions/travel-provider.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));

function sendApiError(res, error) {
  const code = error?.message || 'travel_api_error';
  const status = code.startsWith('invalid_') || code.startsWith('missing_') ? 400 : 502;
  res.status(status).json({
    ok: false,
    error: code,
    message: friendlyApiMessage(code)
  });
}

function friendlyApiMessage(code) {
  return ({
    provider_not_configured: 'Provider viaggi non configurato.',
    invalid_airport_code: 'Inserisci codici IATA validi di 3 lettere.',
    missing_departure_date: 'Inserisci la data di partenza.',
    invalid_destination_coordinates: 'Coordinate destinazione non valide.',
    missing_hotel_dates: 'Inserisci check-in e check-out.'
  })[code] || 'Il provider viaggi non ha risposto correttamente.';
}

app.get('/api/travel/status', (req, res) => {
  res.json({ ok: true, ...providerStatus() });
});

app.post('/api/travel/flights', async (req, res) => {
  try {
    const data = await searchFlights(req.body || {}, { allowDemo: true });
    res.json({ ok: true, ...data });
  } catch (error) {
    console.error('Flight search error:', error);
    sendApiError(res, error);
  }
});

app.post('/api/travel/hotels', async (req, res) => {
  try {
    const data = await searchHotels(req.body || {}, { allowDemo: true });
    res.json({ ok: true, ...data });
  } catch (error) {
    console.error('Hotel search error:', error);
    sendApiError(res, error);
  }
});

// Serve static assets from project root
app.use(express.static(__dirname, {
  extensions: ['html', 'htm']
}));

// Route fallback for client-side navigation
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, HOST, () => {
  console.log(`LFBR Travel running at http://${HOST}:${PORT}`);
  console.log(`Travel provider mode: ${providerStatus().mode}`);
});
