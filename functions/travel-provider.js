const SERPAPI_ENDPOINT = 'https://serpapi.com/search.json';

function env(name) {
  return process.env[name] || '';
}

function configured() {
  return Boolean(env('SERPAPI_KEY'));
}

function locale() {
  return {
    hl: env('SERPAPI_HL') || 'it',
    gl: env('SERPAPI_GL') || 'it',
    currency: env('SERPAPI_CURRENCY') || 'EUR'
  };
}

async function serpApiGet(params) {
  if (!configured()) throw new Error('provider_not_configured');

  const url = new URL(SERPAPI_ENDPOINT);
  const loc = locale();
  const merged = {
    ...loc,
    ...params,
    api_key: env('SERPAPI_KEY')
  };

  Object.entries(merged).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });

  const response = await fetch(url, {
    headers: { Accept: 'application/json' }
  });

  let json = null;
  try {
    json = await response.json();
  } catch (error) {
    throw new Error('provider_invalid_response');
  }

  if (!response.ok || json?.error) {
    const message = String(json?.error || 'provider_request_failed');
    if (response.status === 429 || /limit|quota|searches/i.test(message)) {
      throw new Error('provider_quota_exceeded');
    }
    throw new Error(message.slice(0, 180));
  }

  return json;
}

function demoSeed(text) {
  return [...String(text || '')].reduce((acc, char) => ((acc * 31) + char.charCodeAt(0)) % 100000, 17);
}

function durationText(minutes) {
  const value = Number(minutes);
  if (!Number.isFinite(value) || value <= 0) return '';
  const hours = Math.floor(value / 60);
  const mins = value % 60;
  return [hours ? hours + 'h' : '', mins ? mins + 'm' : ''].filter(Boolean).join(' ');
}

function parseFlightDateTime(value) {
  if (!value) return '';
  return String(value).replace(' ', 'T');
}

function travelClassCode(value) {
  return ({
    ECONOMY: 1,
    PREMIUM_ECONOMY: 2,
    BUSINESS: 3,
    FIRST: 4
  })[value] || 1;
}

function normalizeFlightGroup(group, index) {
  const segments = Array.isArray(group?.flights) ? group.flights : [];
  const first = segments[0] || {};
  const last = segments[segments.length - 1] || {};
  const airlines = [...new Set(segments.map(item => item.airline).filter(Boolean))];

  return {
    id: 'serp-flight-' + index + '-' + String(group?.departure_token || '').slice(0, 12),
    price: Number(group?.price || 0),
    currency: locale().currency,
    airlineCode: '',
    airline: airlines.join(' + ') || 'Compagnia',
    outbound: segments.length ? {
      from: first.departure_airport?.id || '',
      to: last.arrival_airport?.id || '',
      departure: parseFlightDateTime(first.departure_airport?.time),
      arrival: parseFlightDateTime(last.arrival_airport?.time),
      duration: durationText(group?.total_duration),
      durationMinutes: Number(group?.total_duration || 0) || null,
      stops: Math.max(0, segments.length - 1),
      segments: segments.map(segment => ({
        carrier: '',
        carrierName: segment.airline || '',
        number: segment.flight_number || '',
        from: segment.departure_airport?.id || '',
        to: segment.arrival_airport?.id || '',
        departure: parseFlightDateTime(segment.departure_airport?.time),
        arrival: parseFlightDateTime(segment.arrival_airport?.time)
      }))
    } : null,
    inbound: null,
    seats: null,
    departureToken: group?.departure_token || null,
    live: true
  };
}

function demoFlights(query) {
  const seed = demoSeed(JSON.stringify(query));
  const base = 95 + (seed % 420);
  const travelerFactor = Math.max(1, Number(query.adults || 1) + Number(query.children || 0) * 0.7);
  const carriers = ['ITA Airways', 'Lufthansa', 'Air France', 'KLM', 'Iberia', 'British Airways'];

  return Array.from({ length: 5 }, (_, index) => {
    const price = Math.round((base + index * (17 + (seed % 11))) * travelerFactor);
    const departureHour = 6 + ((seed + index * 3) % 11);
    const durationMinutes = 95 + ((seed + index * 29) % 650);
    const departure = query.departureDate + 'T' + String(departureHour).padStart(2, '0') + ':10:00';
    const arrivalDate = new Date(departure);
    arrivalDate.setMinutes(arrivalDate.getMinutes() + durationMinutes);

    return {
      id: 'demo-flight-' + index,
      price,
      currency: 'EUR',
      airlineCode: '',
      airline: carriers[(seed + index) % carriers.length] + ' · demo',
      outbound: {
        from: query.origin,
        to: query.destination,
        departure,
        arrival: arrivalDate.toISOString().slice(0, 19),
        duration: durationText(durationMinutes),
        durationMinutes,
        stops: index % 3 === 0 ? 0 : 1,
        segments: []
      },
      inbound: null,
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
      : 'ECONOMY'
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

  const type = normalized.returnDate ? 1 : 2;
  const json = await serpApiGet({
    engine: 'google_flights',
    departure_id: normalized.origin,
    arrival_id: normalized.destination,
    outbound_date: normalized.departureDate,
    return_date: normalized.returnDate || undefined,
    type,
    travel_class: travelClassCode(normalized.travelClass),
    adults: normalized.adults,
    children: normalized.children || undefined,
    stops: normalized.nonStop ? 1 : 0,
    sort_by: 2
  });

  const groups = [
    ...(Array.isArray(json?.best_flights) ? json.best_flights : []),
    ...(Array.isArray(json?.other_flights) ? json.other_flights : [])
  ];

  const results = groups
    .map((group, index) => normalizeFlightGroup(group, index))
    .filter(item => item.price > 0 && item.outbound)
    .sort((a, b) => a.price - b.price);

  return {
    mode: 'live',
    source: 'serpapi-google-flights',
    live: true,
    query: normalized,
    priceInsights: json?.price_insights || null,
    results
  };
}

function distanceKm(lat1, lng1, lat2, lng2) {
  const values = [lat1, lng1, lat2, lng2].map(Number);
  if (values.some(value => !Number.isFinite(value))) return null;
  const [a, b, c, d] = values;
  const R = 6371;
  const rad = value => value * Math.PI / 180;
  const x = rad(c - a);
  const y = rad(d - b);
  const h = Math.sin(x / 2) ** 2 + Math.cos(rad(a)) * Math.cos(rad(c)) * Math.sin(y / 2) ** 2;
  return Number((2 * R * Math.asin(Math.sqrt(h))).toFixed(1));
}

function normalizeHotel(property, query, index) {
  const totalRate = Number(property?.total_rate?.extracted_lowest || 0);
  const nightly = Number(
    property?.rate_per_night?.extracted_lowest ||
    property?.extracted_price ||
    0
  );
  const nights = Math.max(
    1,
    Math.round((Date.parse(query.checkOutDate) - Date.parse(query.checkInDate)) / 86400000)
  );
  const price = totalRate > 0 ? totalRate : nightly * nights;
  const coords = property?.gps_coordinates || {};

  return {
    id: String(property?.property_token || 'serp-hotel-' + index),
    name: property?.name || 'Hotel',
    latitude: Number(coords.latitude) || null,
    longitude: Number(coords.longitude) || null,
    distance: distanceKm(query.latitude, query.longitude, coords.latitude, coords.longitude),
    distanceUnit: 'KM',
    price,
    pricePerNight: nightly || (price > 0 ? Number((price / nights).toFixed(2)) : 0),
    currency: locale().currency,
    room: property?.hotel_class || (property?.extracted_hotel_class ? property.extracted_hotel_class + ' stelle' : ''),
    board: property?.free_cancellation ? 'Cancellazione gratuita' : '',
    checkInDate: query.checkInDate,
    checkOutDate: query.checkOutDate,
    rating: Number(property?.overall_rating || 0) || null,
    reviews: Number(property?.reviews || 0) || null,
    amenities: Array.isArray(property?.amenities) ? property.amenities.slice(0, 8) : [],
    thumbnail: property?.thumbnail || property?.images?.[0]?.thumbnail || null,
    link: property?.link || null,
    source: property?.source || property?.prices?.[0]?.source || 'Google Hotels',
    live: true
  };
}

function demoHotels(query) {
  const seed = demoSeed(JSON.stringify(query));
  const names = ['Central Stay', 'City Garden Hotel', 'Urban Nest', 'Grand Avenue', 'Local House'];
  const nights = Math.max(1, Math.round((Date.parse(query.checkOutDate) - Date.parse(query.checkInDate)) / 86400000));
  const baseNight = 55 + (seed % 90);

  return names.map((name, index) => {
    const nightly = baseNight + index * 19;
    return {
      id: 'demo-hotel-' + index,
      name: name + ' · demo',
      latitude: Number(query.latitude) + (index - 2) * 0.009,
      longitude: Number(query.longitude) + (2 - index) * 0.007,
      distance: Number((0.8 + index * 1.1).toFixed(1)),
      distanceUnit: 'KM',
      price: nightly * nights,
      pricePerNight: nightly,
      currency: 'EUR',
      room: index % 2 ? 'Camera doppia' : 'Camera standard',
      board: index % 3 === 0 ? 'Colazione inclusa' : '',
      checkInDate: query.checkInDate,
      checkOutDate: query.checkOutDate,
      rating: Number((4 + ((seed + index) % 9) / 10).toFixed(1)),
      reviews: 100 + ((seed + index * 53) % 1800),
      amenities: [],
      thumbnail: null,
      link: null,
      source: 'demo',
      live: false
    };
  });
}

export async function searchHotels(query, { allowDemo = true } = {}) {
  const normalized = {
    destinationName: String(query?.destinationName || query?.q || '').trim().slice(0, 120),
    latitude: Number(query?.latitude),
    longitude: Number(query?.longitude),
    checkInDate: String(query?.checkInDate || ''),
    checkOutDate: String(query?.checkOutDate || ''),
    adults: Math.max(1, Math.min(12, Number(query?.adults) || 1)),
    children: Math.max(0, Math.min(8, Number(query?.children) || 0)),
    roomQuantity: Math.max(1, Math.min(4, Number(query?.roomQuantity) || 1)),
    radius: Math.max(1, Math.min(50, Number(query?.radius) || 15))
  };

  if (!normalized.destinationName) throw new Error('missing_hotel_destination');
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

  const json = await serpApiGet({
    engine: 'google_hotels',
    q: normalized.destinationName,
    check_in_date: normalized.checkInDate,
    check_out_date: normalized.checkOutDate,
    adults: normalized.adults,
    children: normalized.children || undefined
  });

  const results = (Array.isArray(json?.properties) ? json.properties : [])
    .map((property, index) => normalizeHotel(property, normalized, index))
    .filter(item => item.price > 0)
    .sort((a, b) => a.price - b.price);

  return {
    mode: 'live',
    source: 'serpapi-google-hotels',
    live: true,
    query: normalized,
    results
  };
}

export function providerStatus() {
  return {
    configured: configured(),
    mode: configured() ? 'live' : 'demo',
    provider: configured() ? 'serpapi' : 'demo',
    freePlanHint: '250 searches/month'
  };
}
