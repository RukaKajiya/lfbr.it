const DEFAULT_HOST = 'https://test.api.amadeus.com';

let tokenCache = { token: null, expiresAt: 0 };

function env(name) {
  return process.env[name] || '';
}

function configured() {
  return Boolean(env('AMADEUS_CLIENT_ID') && env('AMADEUS_CLIENT_SECRET'));
}

async function getToken() {
  if (!configured()) throw new Error('provider_not_configured');
  if (tokenCache.token && Date.now() < tokenCache.expiresAt - 30000) return tokenCache.token;

  const host = env('AMADEUS_HOST') || DEFAULT_HOST;
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: env('AMADEUS_CLIENT_ID'),
    client_secret: env('AMADEUS_CLIENT_SECRET')
  });

  const response = await fetch(host + '/v1/security/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });

  const json = await response.json();
  if (!response.ok || !json.access_token) {
    throw new Error(json?.error_description || json?.error || 'amadeus_auth_failed');
  }

  tokenCache = {
    token: json.access_token,
    expiresAt: Date.now() + (Number(json.expires_in || 0) * 1000)
  };
  return tokenCache.token;
}

async function amadeusGet(path, params) {
  const token = await getToken();
  const host = env('AMADEUS_HOST') || DEFAULT_HOST;
  const url = new URL(host + path);
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  });

  const response = await fetch(url, {
    headers: { Authorization: 'Bearer ' + token }
  });
  const json = await response.json();
  if (!response.ok) {
    const message = json?.errors?.[0]?.detail || json?.errors?.[0]?.title || 'travel_provider_error';
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }
  return json;
}

function demoSeed(text) {
  return [...String(text || '')].reduce((acc, char) => ((acc * 31) + char.charCodeAt(0)) % 100000, 17);
}

function isoDurationToText(duration) {
  if (!duration) return '';
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?$/.exec(duration);
  if (!match) return duration;
  const hours = Number(match[1] || 0);
  const mins = Number(match[2] || 0);
  return [hours ? hours + 'h' : '', mins ? mins + 'm' : ''].filter(Boolean).join(' ');
}

function minutesBetween(start, end) {
  const a = Date.parse(start);
  const b = Date.parse(end);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.max(0, Math.round((b - a) / 60000));
}

function normalizeFlightOffer(offer, carriers = {}) {
  const itineraries = Array.isArray(offer.itineraries) ? offer.itineraries : [];
  const mapItinerary = itinerary => {
    const segments = Array.isArray(itinerary.segments) ? itinerary.segments : [];
    const first = segments[0] || {};
    const last = segments[segments.length - 1] || {};
    return {
      from: first.departure?.iataCode || '',
      to: last.arrival?.iataCode || '',
      departure: first.departure?.at || '',
      arrival: last.arrival?.at || '',
      duration: isoDurationToText(itinerary.duration),
      durationMinutes: minutesBetween(first.departure?.at, last.arrival?.at),
      stops: Math.max(0, segments.length - 1),
      segments: segments.map(segment => ({
        carrier: segment.carrierCode || '',
        carrierName: carriers[segment.carrierCode] || segment.carrierCode || '',
        number: segment.number || '',
        from: segment.departure?.iataCode || '',
        to: segment.arrival?.iataCode || '',
        departure: segment.departure?.at || '',
        arrival: segment.arrival?.at || ''
      }))
    };
  };

  const carrierCodes = offer.validatingAirlineCodes || [];
  return {
    id: offer.id,
    price: Number(offer.price?.grandTotal || offer.price?.total || 0),
    currency: offer.price?.currency || 'EUR',
    airlineCode: carrierCodes[0] || itineraries[0]?.segments?.[0]?.carrierCode || '',
    airline: carriers[carrierCodes[0]] || carrierCodes[0] || 'Compagnia',
    outbound: itineraries[0] ? mapItinerary(itineraries[0]) : null,
    inbound: itineraries[1] ? mapItinerary(itineraries[1]) : null,
    seats: Number(offer.numberOfBookableSeats || 0) || null,
    live: true
  };
}

function demoFlights(query) {
  const seed = demoSeed(JSON.stringify(query));
  const base = 95 + (seed % 420);
  const travelerFactor = Math.max(1, Number(query.adults || 1) + Number(query.children || 0) * 0.7);
  const carriers = ['AZ', 'LH', 'AF', 'KL', 'IB', 'BA'];
  return Array.from({ length: 5 }, (_, index) => {
    const price = Math.round((base + index * (17 + (seed % 11))) * travelerFactor);
    const departureHour = 6 + ((seed + index * 3) % 11);
    const durationMinutes = 95 + ((seed + index * 29) % 650);
    const arrival = new Date(query.departureDate + 'T' + String(departureHour).padStart(2, '0') + ':10:00');
    arrival.setMinutes(arrival.getMinutes() + durationMinutes);
    const carrier = carriers[(seed + index) % carriers.length];

    return {
      id: 'demo-flight-' + index,
      price,
      currency: 'EUR',
      airlineCode: carrier,
      airline: carrier + ' demo',
      outbound: {
        from: query.origin,
        to: query.destination,
        departure: query.departureDate + 'T' + String(departureHour).padStart(2, '0') + ':10:00',
        arrival: arrival.toISOString().slice(0, 19),
        duration: Math.floor(durationMinutes / 60) + 'h ' + (durationMinutes % 60) + 'm',
        durationMinutes,
        stops: index % 3 === 0 ? 0 : 1,
        segments: []
      },
      inbound: query.returnDate ? {
        from: query.destination,
        to: query.origin,
        departure: query.returnDate + 'T10:20:00',
        arrival: query.returnDate + 'T15:50:00',
        duration: '5h 30m',
        durationMinutes: 330,
        stops: index % 2,
        segments: []
      } : null,
      seats: null,
      live: false
    };
  });
}

export async function searchFlights(query, { allowDemo = true } = {}) {
  const normalized = {
    origin: String(query?.origin || '').trim().toUpperCase().slice(0, 3),
    destination: String(query?.destination || '').trim().toUpperCase().slice(0, 3),
    departureDate: String(query?.departureDate || ''),
    returnDate: String(query?.returnDate || ''),
    adults: Math.max(1, Math.min(9, Number(query?.adults) || 1)),
    children: Math.max(0, Math.min(8, Number(query?.children) || 0)),
    nonStop: Boolean(query?.nonStop),
    travelClass: ['ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST'].includes(query?.travelClass)
      ? query.travelClass
      : 'ECONOMY',
    currencyCode: 'EUR'
  };

  if (!/^[A-Z]{3}$/.test(normalized.origin) || !/^[A-Z]{3}$/.test(normalized.destination)) {
    throw new Error('invalid_airport_code');
  }
  if (!normalized.departureDate) throw new Error('missing_departure_date');

  if (!configured()) {
    if (!allowDemo) throw new Error('provider_not_configured');
    return {
      mode: 'demo',
      source: 'demo',
      live: false,
      query: normalized,
      results: demoFlights(normalized)
    };
  }

  const json = await amadeusGet('/v2/shopping/flight-offers', {
    originLocationCode: normalized.origin,
    destinationLocationCode: normalized.destination,
    departureDate: normalized.departureDate,
    returnDate: normalized.returnDate || undefined,
    adults: normalized.adults,
    children: normalized.children || undefined,
    nonStop: normalized.nonStop ? 'true' : undefined,
    travelClass: normalized.travelClass,
    currencyCode: normalized.currencyCode,
    max: 15
  });

  const carriers = json?.dictionaries?.carriers || {};
  const results = (json?.data || [])
    .map(offer => normalizeFlightOffer(offer, carriers))
    .filter(item => item.price > 0)
    .sort((a, b) => a.price - b.price);

  return { mode: 'live', source: 'amadeus', live: true, query: normalized, results };
}

function normalizeHotelOffer(hotel, offer, roomQuantity = 1) {
  const price = offer?.price || {};
  const perRoom = Number(price.total || price.base || 0);
  const rooms = Math.max(1, Number(roomQuantity) || 1);
  return {
    id: hotel?.hotelId || '',
    name: hotel?.name || 'Hotel',
    latitude: hotel?.geoCode?.latitude ?? hotel?.latitude ?? null,
    longitude: hotel?.geoCode?.longitude ?? hotel?.longitude ?? null,
    distance: hotel?.distance?.value ?? null,
    distanceUnit: hotel?.distance?.unit || 'KM',
    price: perRoom * rooms,
    currency: price.currency || 'EUR',
    room: offer?.room?.typeEstimated?.category || offer?.room?.description?.text || '',
    board: offer?.boardType || '',
    checkInDate: offer?.checkInDate || '',
    checkOutDate: offer?.checkOutDate || '',
    live: true
  };
}

function demoHotels(query) {
  const seed = demoSeed(JSON.stringify(query));
  const names = ['Central Stay', 'City Garden Hotel', 'Urban Nest', 'Grand Avenue', 'Local House'];
  const nights = Math.max(1, Math.round((Date.parse(query.checkOutDate) - Date.parse(query.checkInDate)) / 86400000));
  const baseNight = 55 + (seed % 90);

  return names.map((name, index) => ({
    id: 'demo-hotel-' + index,
    name: name + ' · demo',
    latitude: Number(query.latitude) + (index - 2) * 0.009,
    longitude: Number(query.longitude) + (2 - index) * 0.007,
    distance: Number((0.8 + index * 1.1).toFixed(1)),
    distanceUnit: 'KM',
    price: (baseNight + index * 19) * nights * Math.max(1, Number(query.roomQuantity || 1)),
    currency: 'EUR',
    room: index % 2 ? 'Camera doppia' : 'Camera standard',
    board: index % 3 === 0 ? 'BREAKFAST' : '',
    checkInDate: query.checkInDate,
    checkOutDate: query.checkOutDate,
    live: false
  }));
}

export async function searchHotels(query, { allowDemo = true } = {}) {
  const normalized = {
    latitude: Number(query?.latitude),
    longitude: Number(query?.longitude),
    checkInDate: String(query?.checkInDate || ''),
    checkOutDate: String(query?.checkOutDate || ''),
    adults: Math.max(1, Math.min(9, Number(query?.adults) || 1)),
    roomQuantity: Math.max(1, Math.min(4, Number(query?.roomQuantity) || 1)),
    radius: Math.max(1, Math.min(50, Number(query?.radius) || 15))
  };

  if (!Number.isFinite(normalized.latitude) || !Number.isFinite(normalized.longitude)) throw new Error('invalid_destination_coordinates');
  if (!normalized.checkInDate || !normalized.checkOutDate) throw new Error('missing_hotel_dates');

  if (!configured()) {
    if (!allowDemo) throw new Error('provider_not_configured');
    return {
      mode: 'demo',
      source: 'demo',
      live: false,
      query: normalized,
      results: demoHotels(normalized)
    };
  }

  const hotelsJson = await amadeusGet('/v1/reference-data/locations/hotels/by-geocode', {
    latitude: normalized.latitude,
    longitude: normalized.longitude,
    radius: normalized.radius,
    radiusUnit: 'KM',
    hotelSource: 'ALL'
  });

  const hotels = (hotelsJson?.data || []).slice(0, 20);
  if (!hotels.length) return { mode: 'live', source: 'amadeus', live: true, query: normalized, results: [] };

  const hotelIds = hotels.map(hotel => hotel.hotelId).filter(Boolean).join(',');
  const offersJson = await amadeusGet('/v3/shopping/hotel-offers', {
    hotelIds,
    adults: normalized.adults,
    checkInDate: normalized.checkInDate,
    checkOutDate: normalized.checkOutDate,
    roomQuantity: normalized.roomQuantity,
    currency: 'EUR',
    bestRateOnly: 'true'
  });

  const byId = new Map(hotels.map(hotel => [hotel.hotelId, hotel]));
  const results = (offersJson?.data || []).map(item => {
    const baseHotel = byId.get(item.hotel?.hotelId) || item.hotel || {};
    const offer = item.offers?.[0];
    return offer ? normalizeHotelOffer(baseHotel, offer, normalized.roomQuantity) : null;
  }).filter(Boolean).filter(item => item.price > 0).sort((a, b) => a.price - b.price);

  return { mode: 'live', source: 'amadeus', live: true, query: normalized, results };
}

export function providerStatus() {
  return {
    configured: configured(),
    mode: configured() ? 'live' : 'demo',
    provider: configured() ? 'amadeus' : 'demo'
  };
}
