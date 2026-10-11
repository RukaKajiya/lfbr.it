(() => {
  const DATA = window.LFBR_TRAVEL_DATA;
  const STORE = window.LFBRStorage;
  if (!DATA || !STORE) return;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  const state = {
    step: 1,
    mode: 'known',
    destinationId: DATA.destinations[0]?.id || '',
    origin: '',
    startDate: '',
    endDate: '',
    adults: 2,
    children: 0,
    budget: 140,
    pace: 'balanced',
    transport: 'public',
    interests: {},
    currentTrip: null,
    activeDay: 0,
    map: null,
    markers: [],
    route: null,
    profileDirty: false,
    firebaseReady: false,
    activeTripTab: 'overview',
    travelProvider: null,
    lastFlightSearch: null,
    lastHotelSearch: null
  };

  const els = {
    planner: $('#planner'),
    destinationSelect: $('#destinationSelect'),
    destinationField: $('#destinationField'),
    origin: $('#originInput'),
    start: $('#startDate'),
    end: $('#endDate'),
    adults: $('#adultsInput'),
    children: $('#childrenInput'),
    budget: $('#budgetSelect'),
    interests: $('#interestGrid'),
    next: $('#nextBtn'),
    back: $('#backBtn'),
    summary: $('#tripSummary'),
    results: $('#resultsSection'),
    resultsTitle: $('#resultsTitle'),
    recommendations: $('#recommendations'),
    trip: $('#tripSection'),
    tripTitle: $('#tripTitle'),
    tripSubtitle: $('#tripSubtitle'),
    tripScore: $('#tripScore'),
    tripStatus: $('#tripStatusBadge'),
    dayTabs: $('#dayTabs'),
    dayLabel: $('#dayLabel'),
    dayTitle: $('#dayTitle'),
    dayBudget: $('#dayBudget'),
    timeline: $('#timeline'),
    mapCaption: $('#mapCaption'),
    resume: $('#resumeTripBtn'),
    toast: $('#toast'),
    loginBtn: $('#loginBtn'),
    userMenu: $('#userMenu'),
    userAvatar: $('#userAvatar'),
    cloudTripsBtn: $('#cloudTripsBtn'),
    logoutBtn: $('#logoutBtn'),
    saveCloudBtn: $('#saveCloudBtn'),
    cloudModal: $('#cloudModal'),
    closeCloudModalBtn: $('#closeCloudModalBtn'),
    cloudTripsList: $('#cloudTripsList'),
    flightForm: $('#flightSearchForm'),
    flightResults: $('#flightResults'),
    flightState: $('#flightSearchState'),
    hotelForm: $('#hotelSearchForm'),
    hotelResults: $('#hotelResults'),
    hotelState: $('#hotelSearchState'),
    watchesList: $('#priceWatchesList'),
    refreshWatchesBtn: $('#refreshWatchesBtn'),
    providerBadge: $('#travelProviderBadge'),
    overviewFlight: $('#overviewFlight'),
    overviewFlightMeta: $('#overviewFlightMeta'),
    overviewHotel: $('#overviewHotel'),
    overviewHotelMeta: $('#overviewHotelMeta'),
    overviewActivities: $('#overviewActivities'),
    overviewTotal: $('#overviewTotal')
  };

  const calendarState = { year: 2026, month: 9 };

  function init() {
    DATA.destinations.forEach(destination => {
      const option = document.createElement('option');
      option.value = destination.id;
      option.textContent = destination.emoji + ' ' + destination.name + ' · ' + destination.country;
      els.destinationSelect.appendChild(option);
    });

    const savedProfile = STORE.loadProfile();
    DATA.interests.forEach(interest => {
      const value = savedProfile?.interests?.[interest.id] ?? 1;
      state.interests[interest.id] = Number(value);
      const card = document.createElement('label');
      card.className = 'interest-card';
      card.innerHTML =
        '<div class="interest-title"><span>' + interest.icon + '</span><span>' + escapeHtml(interest.label) + '</span></div>' +
        '<input type="range" min="0" max="3" step="1" value="' + value + '" data-interest="' + interest.id + '" aria-label="' + escapeHtml(interest.label) + '">' +
        '<div class="interest-scale"><span>No</span><span>Poco</span><span>Molto</span><span>Top</span></div>';
      els.interests.appendChild(card);
    });

    setDefaultDates();
    bind();
    if (savedProfile) restoreProfile(savedProfile);
    syncWizard();

    const savedTrip = STORE.loadTrip();
    if (savedTrip) {
      els.resume.hidden = false;
    }

    if (window.LFBRFirebase?.currentUser) {
      updateAuthUI(window.LFBRFirebase.currentUser);
      window.LFBRFirebase.loadTravelProfile()
        .then(profile => {
          if (profile && !state.profileDirty && !state.currentTrip) {
            restoreProfile(profile);
            syncWizard();
          }
        })
        .catch(error => console.warn('Profilo Cloud non caricato:', error));
    }
  }

  function setDefaultDates() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 14);
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 3);
    const today = formatDateInput(now);
    els.start.min = today;
    els.end.min = today;
    els.start.value = formatDateInput(start);
    els.end.value = formatDateInput(end);
    state.startDate = els.start.value;
    state.endDate = els.end.value;
  }

  function restoreProfile(profile, { markClean = true } = {}) {
    if (!profile) return;
    state.mode = profile.mode || state.mode;
    state.destinationId = DATA.destinations.some(d => d.id === profile.destinationId)
      ? profile.destinationId
      : state.destinationId;
    state.origin = profile.origin || '';
    state.startDate = profile.startDate || state.startDate;
    state.endDate = profile.endDate || state.endDate;
    state.adults = clamp(Number(profile.adults) || 2, 1, 12);
    state.children = clamp(Number(profile.children) || 0, 0, 8);
    state.budget = Number(profile.budget) || 140;
    state.pace = ['relaxed', 'balanced', 'intense'].includes(profile.pace) ? profile.pace : 'balanced';
    state.transport = ['public', 'walk', 'car'].includes(profile.transport) ? profile.transport : 'public';

    if (profile.interests && typeof profile.interests === 'object') {
      Object.keys(state.interests).forEach(id => {
        if (profile.interests[id] !== undefined) {
          state.interests[id] = clamp(Number(profile.interests[id]) || 0, 0, 3);
        }
      });
    }

    els.destinationSelect.value = state.destinationId;
    els.origin.value = state.origin;
    els.start.value = state.startDate;
    els.end.value = state.endDate;
    els.end.min = state.startDate || els.start.min;
    els.adults.value = state.adults;
    els.children.value = state.children;
    els.budget.value = String(state.budget);

    $$('.mode-btn').forEach(button => button.classList.toggle('active', button.dataset.mode === state.mode));
    els.destinationField.hidden = state.mode === 'discover';
    selectChoice('#paceChoices', state.pace);
    selectChoice('#transportChoices', state.transport);

    $$('[data-interest]', els.interests).forEach(input => {
      input.value = state.interests[input.dataset.interest] ?? 1;
    });

    if (markClean) state.profileDirty = false;
  }

  function bind() {
    $$('.mode-btn').forEach(button => button.addEventListener('click', () => {
      state.mode = button.dataset.mode;
      state.profileDirty = true;
      $$('.mode-btn').forEach(item => item.classList.toggle('active', item === button));
      els.destinationField.hidden = state.mode === 'discover';
    }));

    els.destinationSelect.addEventListener('change', event => {
      state.destinationId = event.target.value;
      state.profileDirty = true;
    });
    els.origin.addEventListener('input', event => {
      state.origin = event.target.value.trim();
      state.profileDirty = true;
    });
    els.start.addEventListener('change', event => {
      state.startDate = event.target.value;
      els.end.min = state.startDate || els.start.min;
      if (els.end.value < state.startDate) {
        els.end.value = state.startDate;
        state.endDate = state.startDate;
      }
      state.profileDirty = true;
    });
    els.end.addEventListener('change', event => {
      state.endDate = event.target.value;
      state.profileDirty = true;
    });
    els.adults.addEventListener('input', event => {
      state.adults = clamp(Number(event.target.value) || 1, 1, 12);
      state.profileDirty = true;
    });
    els.children.addEventListener('input', event => {
      state.children = clamp(Number(event.target.value) || 0, 0, 8);
      state.profileDirty = true;
    });
    els.budget.addEventListener('change', event => {
      state.budget = Number(event.target.value) || 140;
      state.profileDirty = true;
    });

    bindChoice('#paceChoices', 'pace');
    bindChoice('#transportChoices', 'transport');

    els.interests.addEventListener('input', event => {
      if (!event.target.dataset.interest) return;
      state.interests[event.target.dataset.interest] = Number(event.target.value);
      state.profileDirty = true;
    });

    els.next.addEventListener('click', () => {
      syncFromForm();
      if (state.step === 1 && !validateDates()) return;
      if (state.step < 4) {
        state.step += 1;
        syncWizard();
      } else {
        generate();
      }
    });

    els.back.addEventListener('click', () => {
      if (state.step > 1) {
        state.step -= 1;
        syncWizard();
      }
    });

    $$('.step-dot').forEach(button => button.addEventListener('click', () => {
      const nextStep = Number(button.dataset.goStep);
      if (nextStep <= state.step || nextStep === 1) {
        state.step = nextStep;
        syncWizard();
      }
    }));

    $('#surpriseStartBtn').addEventListener('click', () => {
      state.mode = 'discover';
      state.profileDirty = true;
      $$('.mode-btn').forEach(button => button.classList.toggle('active', button.dataset.mode === 'discover'));
      els.destinationField.hidden = true;
      state.step = 1;
      syncWizard();
      els.planner.scrollIntoView({ behavior: 'smooth' });
    });

    $('#editProfileBtn').addEventListener('click', () => {
      state.step = 3;
      syncWizard();
      els.planner.scrollIntoView({ behavior: 'smooth' });
    });

    $('#newTripBtn').addEventListener('click', () => {
      state.currentTrip = null;
      state.activeDay = 0;
      els.trip.hidden = true;
      els.results.hidden = true;
      state.step = 1;
      syncWizard();
      els.planner.scrollIntoView({ behavior: 'smooth' });
    });

    $('#surpriseBtn').addEventListener('click', addSurpriseStop);
    $('#relaxBtn').addEventListener('click', relaxTrip);

    $('#saveBtn').addEventListener('click', () => {
      if (!state.currentTrip) return;
      STORE.saveTrip(state.currentTrip);
      STORE.saveProfile(state.currentTrip.profile || profileSnapshot());
      els.resume.hidden = false;
      toast('Viaggio salvato su questo dispositivo');
    });

    els.saveCloudBtn.addEventListener('click', handleSaveCloud);

    els.resume.addEventListener('click', () => {
      const trip = STORE.loadTrip();
      if (!trip) return;
      openTrip(trip, { source: 'local' });
      toast('Viaggio locale ripristinato');
    });

    els.dayTabs.addEventListener('click', event => {
      const button = event.target.closest('button[data-day]');
      if (!button) return;
      state.activeDay = Number(button.dataset.day);
      renderDay();
    });

    els.timeline.addEventListener('click', handleStopAction);

    $('.trip-tab').forEach(button => {
      button.addEventListener('click', () => activateTripTab(button.dataset.tripTab));
    });
    els.flightForm?.addEventListener('submit', searchFlights);
    els.hotelForm?.addEventListener('submit', searchHotels);
    els.flightResults?.addEventListener('click', handleBookingResultAction);
    els.hotelResults?.addEventListener('click', handleBookingResultAction);
    els.refreshWatchesBtn?.addEventListener('click', refreshPriceWatches);
    els.watchesList?.addEventListener('click', handleWatchAction);

    els.loginBtn.addEventListener('click', login);
    els.logoutBtn.addEventListener('click', logout);
    els.cloudTripsBtn.addEventListener('click', openCloudModal);
    els.closeCloudModalBtn.addEventListener('click', () => { els.cloudModal.hidden = true; });

    els.cloudModal.addEventListener('click', event => {
      if (event.target === els.cloudModal) els.cloudModal.hidden = true;
    });

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !els.cloudModal.hidden) els.cloudModal.hidden = true;
    });

    window.addEventListener('lfbr:firebase-ready', () => {
      state.firebaseReady = true;
    });

    window.addEventListener('lfbr:firebase-error', event => {
      state.firebaseReady = false;
      console.warn(event.detail?.message || 'Firebase non disponibile');
    });

    window.addEventListener('lfbr:auth-change', async event => {
      const user = event.detail?.user || null;
      updateAuthUI(user);

      const cloudProfile = event.detail?.profile?.travelProfile || null;
      if (user && state.activeTripTab === 'prices') refreshPriceWatches();
      if (user && cloudProfile && !state.profileDirty && !state.currentTrip) {
        restoreProfile(cloudProfile);
        syncWizard();
      }
    });
  }

  function bindChoice(selector, key) {
    $$(selector + ' .choice-btn').forEach(button => button.addEventListener('click', () => {
      state[key] = button.dataset.value;
      state.profileDirty = true;
      selectChoice(selector, state[key]);
    }));
  }

  function selectChoice(selector, value) {
    $$(selector + ' .choice-btn').forEach(button => {
      button.classList.toggle('active', button.dataset.value === value);
    });
  }

  async function login() {
    try {
      if (!window.LFBRFirebase) {
        toast('Firebase si sta inizializzando. Riprova tra un istante.');
        return;
      }
      await window.LFBRFirebase.loginWithGoogle();
    } catch (error) {
      toast(error.message || 'Errore durante l’accesso');
    }
  }

  async function logout() {
    try {
      await window.LFBRFirebase?.logoutUser();
      toast('Disconnesso');
    } catch (error) {
      toast('Errore durante la disconnessione');
    }
  }

  function updateAuthUI(user) {
    if (user) {
      els.loginBtn.hidden = true;
      els.userMenu.hidden = false;
      const label = user.displayName || user.email || 'U';
      els.userAvatar.textContent = label[0].toUpperCase();
      els.userAvatar.title = label;
    } else {
      els.loginBtn.hidden = false;
      els.userMenu.hidden = true;
    }
  }

  function syncFromForm() {
    state.destinationId = els.destinationSelect.value;
    state.origin = els.origin.value.trim();
    state.startDate = els.start.value;
    state.endDate = els.end.value;
    state.adults = clamp(Number(els.adults.value) || 1, 1, 12);
    state.children = clamp(Number(els.children.value) || 0, 0, 8);
    state.budget = Number(els.budget.value) || 140;
  }

  function syncWizard() {
    $$('.wizard-step').forEach(section => {
      section.classList.toggle('active', Number(section.dataset.step) === state.step);
    });
    $$('.step-dot').forEach(button => {
      button.classList.toggle('active', Number(button.dataset.goStep) === state.step);
    });
    els.back.disabled = state.step === 1;
    els.next.textContent = state.step === 4
      ? (state.mode === 'discover' ? 'Trova le destinazioni' : 'Genera itinerario')
      : 'Continua';

    if (state.step === 4) {
      syncFromForm();
      renderSummary();
    }
  }

  function validateDates() {
    if (!state.startDate || !state.endDate) {
      toast('Inserisci le date del viaggio');
      return false;
    }
    if (state.endDate < state.startDate) {
      toast('La data di ritorno deve essere successiva alla partenza');
      return false;
    }
    if (tripDays() > 30) {
      toast('Per questa versione puoi pianificare fino a 30 giorni');
      return false;
    }
    return true;
  }

  async function generate() {
    syncFromForm();
    if (!validateDates()) return;

    const profile = profileSnapshot();
    STORE.saveProfile(profile);
    state.profileDirty = false;

    if (window.LFBRFirebase?.currentUser) {
      window.LFBRFirebase.saveTravelProfile(profile).catch(error => {
        console.warn('Profilo Cloud non salvato:', error);
      });
    }

    if (state.mode === 'discover') {
      renderRecommendations();
      els.results.hidden = false;
      els.trip.hidden = true;
      els.results.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      createTrip(state.destinationId);
    }
  }

  function renderSummary() {
    const destination = DATA.destinations.find(d => d.id === state.destinationId);
    const topInterests = DATA.interests
      .map(interest => ({ label: interest.label, value: state.interests[interest.id] || 0 }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    const days = tripDays();
    if (state.startDate) {
      const [year, month] = state.startDate.split('-').map(Number);
      calendarState.year = year;
      calendarState.month = month - 1;
    }

    els.summary.innerHTML =
      '<div class="summary-item"><small>Destinazione</small><strong>' +
        (state.mode === 'discover' ? 'Da consigliare' : destination.emoji + ' ' + destination.name) +
      '</strong></div>' +
      '<div class="summary-item"><small>Durata</small><strong>' + days + ' ' + (days === 1 ? 'giorno' : 'giorni') + '</strong></div>' +
      '<div class="summary-item"><small>Viaggiatori</small><strong>' + state.adults + ' adulti' + (state.children ? ' · ' + state.children + ' bambini' : '') + '</strong></div>' +
      '<div class="summary-item"><small>Budget</small><strong>circa ' + state.budget + ' € / giorno / persona</strong></div>' +
      '<div class="summary-item"><small>Ritmo</small><strong>' + paceLabel(state.pace) + '</strong></div>' +
      '<div class="summary-item"><small>Mobilità</small><strong>' + transportLabel(state.transport) + '</strong></div>' +
      '<div class="summary-item full"><small>Priorità</small><div class="summary-tags">' +
        (topInterests.length ? topInterests.map(item => '<span>' + escapeHtml(item.label) + '</span>').join('') : '<span>Profilo equilibrato</span>') +
      '</div></div>' +
      '<div class="summary-item full calendar-summary-card">' +
        '<div class="calendar-summary-header"><div><small>Calendario del viaggio</small><strong>' +
          formatTripRange(state.startDate, state.endDate, days) +
        '</strong></div><div class="calendar-nav-controls">' +
          '<button type="button" class="cal-nav-btn" id="calPrevBtn" aria-label="Mese precedente">‹</button>' +
          '<span class="cal-month-title" id="calMonthTitle"></span>' +
          '<button type="button" class="cal-nav-btn" id="calNextBtn" aria-label="Mese successivo">›</button>' +
        '</div></div>' +
        '<div class="calendar-weekdays">' +
          ['Lun','Mar','Mer','Gio','Ven','Sab','Dom'].map(day => '<div class="calendar-weekday">' + day + '</div>').join('') +
        '</div>' +
        '<div class="calendar-grid" id="calDaysGrid"></div>' +
        '<div class="calendar-legend">' +
          '<span class="legend-item"><span class="legend-dot start"></span> Partenza (' + formatDateItalian(state.startDate) + ')</span>' +
          '<span class="legend-item"><span class="legend-dot range"></span> In viaggio</span>' +
          '<span class="legend-item"><span class="legend-dot end"></span> Ritorno (' + formatDateItalian(state.endDate) + ')</span>' +
        '</div>' +
      '</div>';

    bindCalendarControls();
    renderTripCalendar();
  }

  function bindCalendarControls() {
    $('#calPrevBtn', els.summary)?.addEventListener('click', () => {
      calendarState.month -= 1;
      if (calendarState.month < 0) {
        calendarState.month = 11;
        calendarState.year -= 1;
      }
      renderTripCalendar();
    });

    $('#calNextBtn', els.summary)?.addEventListener('click', () => {
      calendarState.month += 1;
      if (calendarState.month > 11) {
        calendarState.month = 0;
        calendarState.year += 1;
      }
      renderTripCalendar();
    });
  }

  function renderTripCalendar() {
    const title = $('#calMonthTitle', els.summary);
    const grid = $('#calDaysGrid', els.summary);
    if (!title || !grid) return;

    const months = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
    title.textContent = months[calendarState.month] + ' ' + calendarState.year;

    const firstDay = new Date(calendarState.year, calendarState.month, 1);
    const startingDay = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(calendarState.year, calendarState.month + 1, 0).getDate();
    const previousMonthDays = new Date(calendarState.year, calendarState.month, 0).getDate();
    const today = formatDateInput(new Date());

    let html = '';
    for (let i = startingDay - 1; i >= 0; i -= 1) {
      html += '<div class="calendar-cell other-month">' + (previousMonthDays - i) + '</div>';
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = calendarState.year + '-' + String(calendarState.month + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
      const classes = ['calendar-cell'];
      const isStart = date === state.startDate;
      const isEnd = date === state.endDate;
      const inRange = date >= state.startDate && date <= state.endDate;
      if (isStart) classes.push('range-start');
      if (isEnd) classes.push('range-end');
      if (inRange && !isStart && !isEnd) classes.push('in-range');
      if (date === today) classes.push('today');
      html += '<div class="' + classes.join(' ') + '">' + day + '</div>';
    }

    const total = startingDay + daysInMonth;
    const remainder = (7 - (total % 7)) % 7;
    for (let day = 1; day <= remainder; day += 1) {
      html += '<div class="calendar-cell other-month">' + day + '</div>';
    }
    grid.innerHTML = html;
  }

  function renderRecommendations() {
    const ranked = DATA.destinations
      .map(destination => ({ destination, score: destinationScore(destination) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    els.resultsTitle.textContent = 'Le destinazioni migliori per te';
    els.recommendations.innerHTML = ranked.map((item, index) => {
      const destination = item.destination;
      const reasons = destinationReasons(destination);
      return '<article class="destination-card ' + (index === 0 ? 'top' : '') + '">' +
        '<div class="destination-top"><div class="destination-name"><span>' + destination.emoji + '</span><div>' +
          '<strong>' + escapeHtml(destination.name) + '</strong><small>' + escapeHtml(destination.country) + '</small>' +
        '</div></div><div class="match-ring" style="--score:' + item.score + '"><b>' + item.score + '%</b></div></div>' +
        '<p>' + escapeHtml(destination.pitch) + '</p>' +
        '<div class="reason-list">' + reasons.map(reason => '<span>' + escapeHtml(reason) + '</span>').join('') + '</div>' +
        '<button type="button" data-pick="' + destination.id + '">Organizza ' + escapeHtml(destination.name) + '</button>' +
      '</article>';
    }).join('');

    $$('[data-pick]', els.recommendations).forEach(button => {
      button.addEventListener('click', () => createTrip(button.dataset.pick));
    });
  }

  function destinationScore(destination) {
    const selected = Object.entries(state.interests).filter(([, value]) => value > 0);
    let total = 0;
    let matched = 0;
    selected.forEach(([id, value]) => {
      total += value;
      if (destination.tags.includes(id)) matched += value;
    });

    const ratio = total ? matched / total : 0.55;
    let score = 58 + ratio * 34;
    if (state.budget >= destination.avgDaily) score += 5;
    else score -= Math.min(9, (destination.avgDaily - state.budget) / 12);
    if (state.children > 0 && destination.tags.includes('family')) score += 3;
    return Math.round(clamp(score, 55, 98));
  }

  function destinationReasons(destination) {
    const labels = Object.fromEntries(DATA.interests.map(interest => [interest.id, interest.label]));
    const matched = Object.entries(state.interests)
      .filter(([id, value]) => value >= 2 && destination.tags.includes(id))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([id]) => labels[id]);

    if (state.budget >= destination.avgDaily) matched.push('Budget compatibile');
    if (state.children > 0 && destination.tags.includes('family')) matched.push('Adatta alla famiglia');
    return matched.length ? matched.slice(0, 4) : ['Profilo equilibrato', 'Buona varietà'];
  }

  function createTrip(destinationId) {
    const destination = DATA.destinations.find(item => item.id === destinationId);
    if (!destination) {
      toast('Destinazione non disponibile');
      return;
    }

    const profile = profileSnapshot();
    const itinerary = buildItinerary(destination, profile);
    state.currentTrip = {
      version: 2,
      title: 'Viaggio a ' + destination.name,
      status: deriveTripStatus(profile),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      profile,
      destinationId,
      score: destinationScore(destination),
      itinerary,
      travelQuotes: {}
    };

    state.activeDay = 0;
    STORE.saveTrip(state.currentTrip);
    els.resume.hidden = false;
    els.results.hidden = true;
    renderTrip();
    els.trip.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function buildItinerary(destination, profile) {
    const totalDays = tripDays(profile.startDate, profile.endDate);
    const dailyCap = paceStops(profile.pace);
    const ranked = destination.places
      .map((place, index) => ({ ...place, _id: index, _score: placeScore(place, profile) }))
      .sort((a, b) => b._score - a._score)
      .slice(0, Math.min(destination.places.length, totalDays * dailyCap));

    const days = Array.from({ length: totalDays }, (_, index) => ({
      day: index + 1,
      date: addDays(profile.startDate, index),
      stops: []
    }));

    let remaining = [...ranked];
    for (let dayIndex = 0; dayIndex < totalDays && remaining.length; dayIndex += 1) {
      const remainingDays = totalDays - dayIndex;
      const targetCount = Math.min(dailyCap, Math.max(1, Math.ceil(remaining.length / remainingDays)));
      let current = remaining.shift();
      days[dayIndex].stops.push(current);

      while (days[dayIndex].stops.length < targetCount && remaining.length) {
        const index = bestNearbyIndex(current, remaining, profile);
        current = remaining.splice(index, 1)[0];
        days[dayIndex].stops.push(current);
      }
    }

    days.forEach(day => {
      day.stops = scheduleStops(day.stops, profile);
    });
    return days;
  }

  function placeScore(place, profile) {
    let score = 10;
    const interests = profile?.interests || {};
    place.tags.forEach(tag => { score += (interests[tag] || 0) * 4; });
    score += (interests[place.category] || 0) * 3;
    if ((profile?.children || 0) > 0 && place.tags.includes('family')) score += 5;
    if (place.cost <= (profile?.budget || 140) * 0.25) score += 2;
    return score;
  }

  function bestNearbyIndex(from, candidates, profile) {
    const penalty = { walk: 1.0, public: 0.55, car: 0.35 }[profile?.transport] || 0.55;
    let bestIndex = 0;
    let bestValue = -Infinity;

    candidates.forEach((place, index) => {
      const distance = distanceKm(from.lat, from.lng, place.lat, place.lng);
      const value = place._score - distance * penalty;
      if (value > bestValue) {
        bestValue = value;
        bestIndex = index;
      }
    });
    return bestIndex;
  }

  function scheduleStops(stops, profile) {
    const startMinutes = { relaxed: 10 * 60, balanced: 9 * 60 + 30, intense: 9 * 60 }[profile?.pace] || 570;
    const transferMinutes = { walk: 35, public: 30, car: 25 }[profile?.transport] || 30;
    let minutes = startMinutes;

    return stops.map((place, index) => {
      const copy = { ...place, time: timeLabel(minutes) };
      minutes += place.duration + (index < stops.length - 1 ? transferMinutes : 0);
      return copy;
    });
  }

  function openTrip(trip, { source = 'cloud' } = {}) {
    if (!trip || !trip.destinationId) {
      toast('Il viaggio non contiene dati validi');
      return;
    }

    const destination = DATA.destinations.find(item => item.id === trip.destinationId);
    if (!destination) {
      toast('La destinazione di questo viaggio non è più disponibile nella beta');
      return;
    }

    state.currentTrip = {
      ...trip,
      status: trip.status || deriveTripStatus(trip.profile || {}),
      title: trip.title || ('Viaggio a ' + destination.name),
      itinerary: Array.isArray(trip.itinerary) ? trip.itinerary : [],
      travelQuotes: trip.travelQuotes && typeof trip.travelQuotes === 'object' ? trip.travelQuotes : {}
    };
    state.activeDay = 0;

    if (state.currentTrip.profile) {
      restoreProfile(state.currentTrip.profile);
    }

    STORE.saveTrip(state.currentTrip);
    els.resume.hidden = false;
    els.results.hidden = true;
    renderTrip();
    els.cloudModal.hidden = true;
    els.trip.scrollIntoView({ behavior: 'smooth', block: 'start' });

    if (source === 'cloud') toast('Viaggio caricato da Firestore');
  }

  function renderTrip() {
    if (!state.currentTrip) return;
    const destination = DATA.destinations.find(item => item.id === state.currentTrip.destinationId);
    if (!destination) return;

    const profile = state.currentTrip.profile || {};
    state.currentTrip.status = deriveTripStatus(profile, state.currentTrip.status);
    els.trip.hidden = false;
    els.tripTitle.textContent = state.currentTrip.title || ('Viaggio a ' + destination.name);
    els.tripSubtitle.textContent =
      destination.emoji + ' ' + destination.name + ' · ' +
      state.currentTrip.itinerary.length + ' ' + (state.currentTrip.itinerary.length === 1 ? 'giorno' : 'giorni') +
      ' · ' + paceLabel(profile.pace) +
      ' · ' + transportLabel(profile.transport) +
      (profile.origin ? ' · da ' + profile.origin : '');

    els.tripScore.textContent = (state.currentTrip.score || 0) + '%';
    if (els.tripStatus) {
      els.tripStatus.textContent = statusLabel(state.currentTrip.status);
      els.tripStatus.dataset.status = state.currentTrip.status;
    }

    if (els.saveCloudBtn) {
      els.saveCloudBtn.textContent = state.currentTrip.id ? '☁ Aggiorna su Firestore' : '☁ Salva su Firestore';
    }

    els.dayTabs.innerHTML = state.currentTrip.itinerary.map((day, index) => {
      const date = day.date || addDays(profile.startDate, index);
      return '<button type="button" data-day="' + index + '" class="' + (index === state.activeDay ? 'active' : '') + '">' +
        '<span>G' + day.day + '</span><small>' + shortDate(date) + '</small></button>';
    }).join('');

    prepareBookingForms();
    renderOverview();
    activateTripTab(state.activeTripTab || 'overview', { scroll: false });
    checkTravelProviderStatus();
    renderDay();
  }

  function renderDay() {
    const trip = state.currentTrip;
    if (!trip) return;
    const day = trip.itinerary[state.activeDay];
    if (!day) return;

    $$('button', els.dayTabs).forEach((button, index) => {
      button.classList.toggle('active', index === state.activeDay);
    });

    const date = day.date || addDays(trip.profile?.startDate, state.activeDay);
    els.dayLabel.textContent = 'Giorno ' + day.day + (date ? ' · ' + formatDateItalianLong(date) : '');
    els.dayTitle.textContent = day.stops.length ? 'Una giornata pensata per te' : 'Giornata libera';

    const total = day.stops.reduce((sum, stop) => sum + (Number(stop.cost) || 0), 0);
    els.dayBudget.textContent = day.stops.length ? 'Attività ≈ ' + Math.round(total) + ' € / persona' : 'Nessuna attività';

    els.timeline.innerHTML = day.stops.length
      ? day.stops.map((stop, index) =>
          '<article class="stop-card">' +
            '<div class="stop-time">' + escapeHtml(stop.time || '') + '</div>' +
            '<div class="stop-main"><strong>' + escapeHtml(stop.name) + '</strong>' +
              '<p>' + escapeHtml(stop.desc) + '</p>' +
              '<div class="stop-meta"><span>' + escapeHtml(stop.district) + '</span>' +
                '<span>' + (Math.round(stop.duration / 60 * 10) / 10) + ' h</span>' +
                '<span>' + (stop.cost ? '≈ ' + stop.cost + ' €' : 'Gratis') + '</span>' +
              '</div>' +
            '</div>' +
            '<div class="stop-actions">' +
              '<button type="button" data-action="up" data-index="' + index + '" aria-label="Sposta prima">↑</button>' +
              '<button type="button" data-action="down" data-index="' + index + '" aria-label="Sposta dopo">↓</button>' +
              '<button type="button" data-action="remove" data-index="' + index + '" aria-label="Rimuovi">×</button>' +
            '</div>' +
          '</article>'
        ).join('')
      : '<div class="empty-day"><span>☀️</span><strong>Giornata libera</strong><p>Puoi lasciarla libera oppure usare “Sorprendimi” per aggiungere una tappa compatibile.</p></div>';

    renderMap(day.stops);
  }

  function renderMap(stops) {
    const destination = DATA.destinations.find(item => item.id === state.currentTrip.destinationId);
    els.mapCaption.textContent = stops.length + ' ' + (stops.length === 1 ? 'tappa' : 'tappe') + ' · ordine suggerito';

    if (!window.L) {
      $('#tripMap').innerHTML = '<div class="privacy-note" style="margin:20px">Mappa non disponibile. L’itinerario resta utilizzabile.</div>';
      return;
    }

    if (!state.map) {
      state.map = L.map('tripMap', { scrollWheelZoom: false }).setView(destination.center, 12);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(state.map);
    }

    state.markers.forEach(marker => marker.remove());
    state.markers = [];
    if (state.route) {
      state.route.remove();
      state.route = null;
    }

    const coordinates = [];
    stops.forEach((stop, index) => {
      const marker = L.marker([stop.lat, stop.lng])
        .addTo(state.map)
        .bindPopup('<strong>' + (index + 1) + '. ' + escapeHtml(stop.name) + '</strong><br>' + escapeHtml(stop.time || '') + ' · ' + escapeHtml(stop.district || ''));
      state.markers.push(marker);
      coordinates.push([stop.lat, stop.lng]);
    });

    if (coordinates.length > 1) {
      state.route = L.polyline(coordinates, { weight: 3, opacity: 0.65, dashArray: '7 7' }).addTo(state.map);
    }

    if (state.markers.length) {
      const group = L.featureGroup(state.markers);
      state.map.fitBounds(group.getBounds().pad(0.25), { maxZoom: 14 });
    } else {
      state.map.setView(destination.center, 12);
    }

    setTimeout(() => state.map.invalidateSize(), 50);
  }

  function handleStopAction(event) {
    const button = event.target.closest('button[data-action]');
    if (!button || !state.currentTrip) return;

    const day = state.currentTrip.itinerary[state.activeDay];
    const index = Number(button.dataset.index);
    const action = button.dataset.action;

    if (action === 'remove') day.stops.splice(index, 1);
    if (action === 'up' && index > 0) {
      [day.stops[index - 1], day.stops[index]] = [day.stops[index], day.stops[index - 1]];
    }
    if (action === 'down' && index < day.stops.length - 1) {
      [day.stops[index + 1], day.stops[index]] = [day.stops[index], day.stops[index + 1]];
    }

    day.stops = scheduleStops(day.stops, state.currentTrip.profile || {});
    touchTrip();
    renderDay();
  }

  function addSurpriseStop() {
    if (!state.currentTrip) return;
    const destination = DATA.destinations.find(item => item.id === state.currentTrip.destinationId);
    const profile = state.currentTrip.profile || {};
    const used = new Set(state.currentTrip.itinerary.flatMap(day => day.stops.map(stop => stop.name)));

    const candidates = destination.places
      .filter(place => !used.has(place.name))
      .map((place, index) => ({ ...place, _id: index, _score: placeScore(place, profile) }))
      .sort((a, b) => b._score - a._score);

    if (!candidates.length) {
      toast('Hai già inserito tutti i luoghi disponibili nella beta');
      return;
    }

    const day = state.currentTrip.itinerary[state.activeDay];
    day.stops.push(candidates[0]);
    day.stops = scheduleStops(day.stops, profile);
    touchTrip();
    renderDay();
    toast('Ho aggiunto ' + candidates[0].name);
  }

  function relaxTrip() {
    if (!state.currentTrip) return;
    state.currentTrip.itinerary.forEach(day => {
      if (day.stops.length > 2) {
        day.stops.sort((a, b) => (b._score || 0) - (a._score || 0));
        day.stops = scheduleStops(day.stops.slice(0, Math.max(2, day.stops.length - 1)), {
          ...state.currentTrip.profile,
          pace: 'relaxed'
        });
      }
    });
    state.currentTrip.profile.pace = 'relaxed';
    state.pace = 'relaxed';
    selectChoice('#paceChoices', 'relaxed');
    touchTrip();
    renderTrip();
    toast('Ho alleggerito le giornate');
  }

  function touchTrip() {
    if (!state.currentTrip) return;
    state.currentTrip.updatedAt = new Date().toISOString();
    state.currentTrip.status = deriveTripStatus(state.currentTrip.profile || {}, state.currentTrip.status);
    STORE.saveTrip(state.currentTrip);
    els.resume.hidden = false;
  }

  async function handleSaveCloud() {
    if (!state.currentTrip) {
      toast('Nessun viaggio da salvare');
      return;
    }

    try {
      if (!window.LFBRFirebase?.currentUser) {
        await login();
        if (!window.LFBRFirebase?.currentUser) return;
      }

      const saved = await window.LFBRFirebase.saveTripToCloud(state.currentTrip);
      state.currentTrip = { ...state.currentTrip, ...saved };
      STORE.saveTrip(state.currentTrip);
      els.resume.hidden = false;
      renderTrip();
      toast(state.currentTrip.id ? 'Viaggio sincronizzato con Firestore' : 'Viaggio salvato su Firestore');
    } catch (error) {
      console.error(error);
      toast(error.message || 'Errore nel salvataggio Cloud');
    }
  }

  async function openCloudModal() {
    try {
      if (!window.LFBRFirebase?.currentUser) {
        await login();
        if (!window.LFBRFirebase?.currentUser) return;
      }
      els.cloudModal.hidden = false;
      await refreshCloudTrips();
    } catch (error) {
      toast(error.message || 'Impossibile aprire i viaggi Cloud');
    }
  }

  async function refreshCloudTrips() {
    els.cloudTripsList.innerHTML = '<div class="cloud-loading">Caricamento viaggi…</div>';

    try {
      const trips = await window.LFBRFirebase.loadUserTripsFromCloud();
      if (!trips.length) {
        els.cloudTripsList.innerHTML =
          '<div class="cloud-empty"><span>☁</span><strong>Nessun viaggio nel Cloud</strong><p>Crea un itinerario e salvalo su Firestore.</p></div>';
        return;
      }

      els.cloudTripsList.innerHTML = trips.map((trip, index) => {
        const destination = DATA.destinations.find(item => item.id === trip.destinationId);
        const title = trip.title || ('Viaggio a ' + (destination?.name || trip.destinationId));
        const profile = trip.profile || {};
        const status = trip.status || deriveTripStatus(profile);
        const range = profile.startDate && profile.endDate
          ? formatCompactRange(profile.startDate, profile.endDate)
          : 'Date non definite';

        return '<article class="cloud-trip-item">' +
          '<div class="cloud-trip-main">' +
            '<div class="cloud-trip-title-row"><div><span class="cloud-trip-emoji">' + (destination?.emoji || '✈️') + '</span>' +
              '<h4>' + escapeHtml(title) + '</h4></div>' +
              '<span class="trip-status-chip" data-status="' + status + '">' + statusLabel(status) + '</span>' +
            '</div>' +
            '<p>' + escapeHtml(range) + ' · ' + (trip.itinerary?.length || 0) + ' giorni · ' + (trip.score || 0) + '% compatibilità</p>' +
          '</div>' +
          '<div class="cloud-trip-actions">' +
            '<button class="primary-mini" type="button" data-cloud-action="open" data-index="' + index + '">Apri</button>' +
            '<button type="button" data-cloud-action="rename" data-index="' + index + '" aria-label="Rinomina">✎</button>' +
            '<button type="button" data-cloud-action="duplicate" data-index="' + index + '" aria-label="Duplica">⧉</button>' +
            '<button class="danger-mini" type="button" data-cloud-action="delete" data-index="' + index + '" aria-label="Elimina">×</button>' +
          '</div>' +
        '</article>';
      }).join('');

      $$('[data-cloud-action]', els.cloudTripsList).forEach(button => {
        button.addEventListener('click', async () => {
          const trip = trips[Number(button.dataset.index)];
          const action = button.dataset.cloudAction;

          if (action === 'open') {
            openTrip(trip, { source: 'cloud' });
            return;
          }

          if (action === 'rename') {
            const name = window.prompt('Nuovo nome del viaggio', trip.title || '');
            if (!name || name.trim() === trip.title) return;
            await window.LFBRFirebase.renameTrip(trip.id, name);
            if (state.currentTrip?.id === trip.id) {
              state.currentTrip.title = name.trim().slice(0, 120);
              touchTrip();
              renderTrip();
            }
            await refreshCloudTrips();
            toast('Viaggio rinominato');
            return;
          }

          if (action === 'duplicate') {
            await window.LFBRFirebase.duplicateTripToCloud(trip);
            await refreshCloudTrips();
            toast('Copia del viaggio creata');
            return;
          }

          if (action === 'delete') {
            const ok = window.confirm('Eliminare definitivamente "' + (trip.title || 'questo viaggio') + '" dal Cloud?');
            if (!ok) return;
            await window.LFBRFirebase.deleteTripFromCloud(trip.id);
            if (state.currentTrip?.id === trip.id) {
              state.currentTrip.id = undefined;
              state.currentTrip.ownerId = undefined;
              STORE.saveTrip(state.currentTrip);
              renderTrip();
            }
            await refreshCloudTrips();
            toast('Viaggio eliminato dal Cloud');
          }
        });
      });
    } catch (error) {
      console.error(error);
      els.cloudTripsList.innerHTML =
        '<div class="cloud-error"><strong>Non riesco a caricare i viaggi</strong><p>' + escapeHtml(error.message || 'Riprova tra poco') + '</p></div>';
    }
  }

  function activateTripTab(name, { scroll = false } = {}) {
    const valid = ['overview', 'flights', 'hotels', 'itinerary', 'prices'];
    const next = valid.includes(name) ? name : 'overview';
    state.activeTripTab = next;

    $('.trip-tab').forEach(button => {
      const active = button.dataset.tripTab === next;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', active ? 'true' : 'false');
    });

    $('[data-trip-panel]').forEach(panel => {
      const active = panel.dataset.tripPanel === next;
      panel.hidden = !active;
      panel.classList.toggle('active', active);
    });

    if (next === 'itinerary' && state.map) {
      setTimeout(() => state.map.invalidateSize(), 80);
    }
    if (next === 'prices') refreshPriceWatches();
    if (scroll) els.trip.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function prepareBookingForms() {
    if (!state.currentTrip) return;
    const destination = DATA.destinations.find(item => item.id === state.currentTrip.destinationId);
    const profile = state.currentTrip.profile || {};
    if (!destination) return;

    const originCode = /^[A-Za-z]{3}$/.test(profile.origin || '') ? profile.origin.toUpperCase() : '';
    const setValue = (selector, value) => {
      const el = $(selector);
      if (el && (document.activeElement !== el || !el.value)) el.value = value ?? '';
    };

    setValue('#flightOrigin', originCode);
    setValue('#flightDestination', destination.flightCode || '');
    setValue('#flightDeparture', profile.startDate || '');
    setValue('#flightReturn', profile.endDate || '');
    setValue('#flightAdults', profile.adults || 1);
    setValue('#flightChildren', profile.children || 0);
    setValue('#hotelCheckIn', profile.startDate || '');
    setValue('#hotelCheckOut', profile.endDate || '');
    setValue('#hotelAdults', Math.max(1, Number(profile.adults || 1) + Number(profile.children || 0)));

    const today = formatDateInput(new Date());
    ['#flightDeparture','#flightReturn','#hotelCheckIn','#hotelCheckOut'].forEach(selector => {
      const el = $(selector);
      if (el) el.min = today;
    });
  }

  async function checkTravelProviderStatus() {
    if (!els.providerBadge) return;
    try {
      const response = await fetch('/api/travel/status', { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error('backend_unavailable');
      const data = await response.json();
      state.travelProvider = data;
      if (data.mode === 'live') {
        els.providerBadge.textContent = 'Prezzi live · Amadeus production';
        els.providerBadge.dataset.mode = 'live';
      } else if (data.mode === 'test') {
        els.providerBadge.textContent = 'Amadeus test · non monitorabile';
        els.providerBadge.dataset.mode = 'test';
      } else {
        els.providerBadge.textContent = 'Modalità demo · provider da configurare';
        els.providerBadge.dataset.mode = 'demo';
      }
    } catch (error) {
      state.travelProvider = { configured: false, mode: 'offline' };
      els.providerBadge.textContent = 'Backend prezzi non disponibile';
      els.providerBadge.dataset.mode = 'offline';
    }
  }

  async function apiPost(path, payload) {
    const response = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload)
    });
    let data = null;
    try { data = await response.json(); } catch (error) { data = null; }
    if (!response.ok || !data?.ok) {
      throw new Error(data?.message || 'Servizio prezzi non disponibile.');
    }
    return data;
  }

  async function searchFlights(event) {
    event.preventDefault();
    if (!state.currentTrip) return;
    const button = $('button[type="submit"]', els.flightForm);
    const query = {
      origin: ($('#flightOrigin')?.value || '').trim().toUpperCase(),
      destination: ($('#flightDestination')?.value || '').trim().toUpperCase(),
      departureDate: $('#flightDeparture')?.value || '',
      returnDate: $('#flightReturn')?.value || '',
      adults: Number($('#flightAdults')?.value || 1),
      children: Number($('#flightChildren')?.value || 0),
      travelClass: $('#flightClass')?.value || 'ECONOMY',
      nonStop: Boolean($('#flightDirect')?.checked)
    };

    if (!/^[A-Z]{3}$/.test(query.origin) || !/^[A-Z]{3}$/.test(query.destination)) {
      toast('Per i voli usa codici IATA di 3 lettere, per esempio BLQ o FCO');
      return;
    }

    setBookingLoading(button, els.flightState, 'Cerco le migliori opzioni…');
    els.flightResults.innerHTML = '';
    try {
      const data = await apiPost('/api/travel/flights', query);
      state.lastFlightSearch = data;
      renderFlightResults(data);
      saveBestTravelQuote('flight', data);
      renderOverview();
    } catch (error) {
      els.flightState.innerHTML = '<div class="booking-error">' + escapeHtml(error.message) + '</div>';
    } finally {
      setBookingLoading(button, null, null, false);
    }
  }

  async function searchHotels(event) {
    event.preventDefault();
    if (!state.currentTrip) return;
    const destination = DATA.destinations.find(item => item.id === state.currentTrip.destinationId);
    if (!destination) return;

    const button = $('button[type="submit"]', els.hotelForm);
    const query = {
      latitude: destination.center[0],
      longitude: destination.center[1],
      checkInDate: $('#hotelCheckIn')?.value || '',
      checkOutDate: $('#hotelCheckOut')?.value || '',
      adults: Number($('#hotelAdults')?.value || 1),
      roomQuantity: Number($('#hotelRooms')?.value || 1),
      radius: Number($('#hotelRadius')?.value || 15)
    };

    setBookingLoading(button, els.hotelState, 'Cerco strutture disponibili…');
    els.hotelResults.innerHTML = '';
    try {
      const data = await apiPost('/api/travel/hotels', query);
      state.lastHotelSearch = data;
      renderHotelResults(data);
      saveBestTravelQuote('hotel', data);
      renderOverview();
    } catch (error) {
      els.hotelState.innerHTML = '<div class="booking-error">' + escapeHtml(error.message) + '</div>';
    } finally {
      setBookingLoading(button, null, null, false);
    }
  }

  function setBookingLoading(button, stateEl, message, loading = true) {
    if (button) {
      button.disabled = loading;
      button.dataset.originalText ||= button.textContent;
      button.textContent = loading ? 'Ricerca…' : button.dataset.originalText;
    }
    if (stateEl && loading) stateEl.innerHTML = '<div class="booking-loading">' + escapeHtml(message || 'Caricamento…') + '</div>';
  }

  function renderFlightResults(data) {
    const results = Array.isArray(data.results) ? data.results : [];
    els.flightState.innerHTML = providerStateMessage(data, results.length, 'volo');
    if (!results.length) {
      els.flightResults.innerHTML = '<div class="booking-empty">Nessun volo trovato con questi parametri.</div>';
      return;
    }

    els.flightResults.innerHTML = results.slice(0, 10).map((item, index) => {
      const outbound = item.outbound || {};
      const inbound = item.inbound || {};
      const direct = Number(outbound.stops || 0) === 0;
      return '<article class="booking-result ' + (index === 0 ? 'best' : '') + '">' +
        '<div class="booking-result-main"><div class="booking-route"><span>' + escapeHtml(item.airline || item.airlineCode || 'Volo') + '</span>' +
          '<strong>' + escapeHtml(outbound.from || '') + ' → ' + escapeHtml(outbound.to || '') + '</strong>' +
          '<small>' + formatDateTime(outbound.departure) + ' · ' + escapeHtml(outbound.duration || '') + ' · ' + (direct ? 'Diretto' : (outbound.stops + ' scalo/i')) + '</small>' +
          (inbound.from ? '<small>Ritorno: ' + escapeHtml(inbound.from) + ' → ' + escapeHtml(inbound.to) + ' · ' + formatDateTime(inbound.departure) + '</small>' : '') +
        '</div></div>' +
        '<div class="booking-price"><small>Totale</small><strong>' + money(item.price, item.currency) + '</strong>' +
          (data.live ? '<button type="button" data-watch-type="flight" data-result-index="' + index + '">🔔 Monitora</button>' : '<span class="demo-chip">DEMO</span>') +
        '</div></article>';
    }).join('');
  }

  function renderHotelResults(data) {
    const results = Array.isArray(data.results) ? data.results : [];
    els.hotelState.innerHTML = providerStateMessage(data, results.length, 'hotel');
    if (!results.length) {
      els.hotelResults.innerHTML = '<div class="booking-empty">Nessun hotel trovato con questi parametri.</div>';
      return;
    }

    els.hotelResults.innerHTML = results.slice(0, 12).map((item, index) => {
      return '<article class="booking-result hotel-result ' + (index === 0 ? 'best' : '') + '">' +
        '<div class="booking-result-main"><div class="booking-route"><span>🏨 Hotel</span><strong>' + escapeHtml(item.name || 'Hotel') + '</strong>' +
          '<small>' + (item.distance != null ? escapeHtml(item.distance + ' ' + (item.distanceUnit || 'KM') + ' dal centro') : 'Destinazione selezionata') +
          (item.room ? ' · ' + escapeHtml(item.room) : '') + (item.board ? ' · ' + escapeHtml(item.board) : '') + '</small></div></div>' +
        '<div class="booking-price"><small>Soggiorno</small><strong>' + money(item.price, item.currency) + '</strong>' +
          (data.live ? '<button type="button" data-watch-type="hotel" data-result-index="' + index + '">🔔 Monitora</button>' : '<span class="demo-chip">DEMO</span>') +
        '</div></article>';
    }).join('');
  }

  function providerStateMessage(data, count, noun) {
    if (data.live) {
      return '<div class="booking-live">● ' + count + ' risultati live · fonte ' + escapeHtml(data.source || 'provider') + '</div>';
    }
    if (data.mode === 'test') {
      return '<div class="booking-test">Ambiente Amadeus test: risultati utili per lo sviluppo ma non trattati come prezzi live e non monitorabili.</div>';
    }
    return '<div class="booking-demo">Modalità demo: questi ' + noun + ' e prezzi sono simulati. Configura il provider production per dati reali e monitoraggio.</div>';
  }

  function saveBestTravelQuote(type, data) {
    if (!state.currentTrip || !Array.isArray(data.results) || !data.results.length) return;
    const best = data.results[0];
    state.currentTrip.travelQuotes ||= {};
    state.currentTrip.travelQuotes[type] = {
      price: Number(best.price) || 0,
      currency: best.currency || 'EUR',
      live: Boolean(data.live),
      source: data.source || 'demo',
      query: data.query || {},
      label: type === 'flight'
        ? ((best.airline || best.airlineCode || 'Volo') + ' · ' + (best.outbound?.from || '') + ' → ' + (best.outbound?.to || ''))
        : (best.name || 'Hotel'),
      checkedAt: new Date().toISOString()
    };
    touchTrip();
  }

  function renderOverview() {
    if (!state.currentTrip) return;
    const quotes = state.currentTrip.travelQuotes || {};
    const flight = quotes.flight;
    const hotel = quotes.hotel;
    const travelers = Math.max(1, Number(state.currentTrip.profile?.adults || 0) + Number(state.currentTrip.profile?.children || 0));
    const activitiesPerPerson = state.currentTrip.itinerary
      .flatMap(day => day.stops || [])
      .reduce((sum, stop) => sum + (Number(stop.cost) || 0), 0);
    const activities = activitiesPerPerson * travelers;
    const flightPrice = Number(flight?.price || 0);
    const hotelPrice = Number(hotel?.price || 0);
    const total = flightPrice + hotelPrice + activities;

    if (els.overviewActivities) els.overviewActivities.textContent = money(activities, 'EUR');
    if (els.overviewFlight) els.overviewFlight.textContent = flight ? money(flightPrice, flight.currency) : '—';
    if (els.overviewHotel) els.overviewHotel.textContent = hotel ? money(hotelPrice, hotel.currency) : '—';
    if (els.overviewTotal) els.overviewTotal.textContent = total > 0 ? money(total, 'EUR') : '—';
    if (els.overviewFlightMeta) els.overviewFlightMeta.textContent = flight ? flight.label + (flight.live ? ' · live' : ' · demo') : 'Cerca un volo per stimare il costo.';
    if (els.overviewHotelMeta) els.overviewHotelMeta.textContent = hotel ? hotel.label + (hotel.live ? ' · live' : ' · demo') : 'Cerca un hotel per stimare il soggiorno.';
  }

  async function handleBookingResultAction(event) {
    const button = event.target.closest('[data-watch-type]');
    if (!button) return;
    const type = button.dataset.watchType;
    const index = Number(button.dataset.resultIndex);
    const search = type === 'flight' ? state.lastFlightSearch : state.lastHotelSearch;
    const result = search?.results?.[index];
    if (!search?.live || !result) {
      toast('Il monitoraggio è disponibile solo sui prezzi live');
      return;
    }

    try {
      if (!window.LFBRFirebase?.currentUser) {
        await login();
        if (!window.LFBRFirebase?.currentUser) return;
      }

      button.disabled = true;
      const label = type === 'flight'
        ? ((result.airline || result.airlineCode || 'Volo') + ' ' + (result.outbound?.from || '') + ' → ' + (result.outbound?.to || ''))
        : (result.name || 'Hotel');

      await window.LFBRFirebase.createPriceWatch({
        tripId: state.currentTrip?.id || '',
        type,
        label,
        query: search.query,
        currency: result.currency || 'EUR',
        price: Number(result.price),
        alertMode: 'new_low',
        source: search.source || 'provider',
        live: true
      });

      toast('Monitoraggio prezzo attivato');
      button.textContent = '✓ Monitorato';
      activateTripTab('prices');
    } catch (error) {
      toast(error.message || 'Impossibile attivare il monitoraggio');
    } finally {
      button.disabled = false;
    }
  }

  async function refreshPriceWatches() {
    if (!els.watchesList) return;
    if (!window.LFBRFirebase?.currentUser) {
      els.watchesList.innerHTML = '<div class="cloud-empty"><span>🔐</span><strong>Accedi per monitorare i prezzi</strong><p>I monitoraggi sono legati al tuo account Google.</p></div>';
      return;
    }

    els.watchesList.innerHTML = '<div class="cloud-loading">Caricamento monitoraggi…</div>';
    try {
      const watches = await window.LFBRFirebase.loadPriceWatches();
      if (!watches.length) {
        els.watchesList.innerHTML = '<div class="cloud-empty"><span>🔔</span><strong>Nessun prezzo monitorato</strong><p>Apri Voli o Hotel e premi “Monitora” su un risultato live.</p></div>';
        return;
      }

      els.watchesList.innerHTML = watches.map((watch, index) => {
        const initial = Number(watch.initialPrice || 0);
        const last = Number(watch.lastPrice || initial);
        const best = Number(watch.bestPrice || last);
        const change = initial > 0 ? ((last - initial) / initial) * 100 : 0;
        const changeText = (change > 0 ? '+' : '') + change.toFixed(1) + '%';
        return '<article class="watch-card ' + (watch.alertPending ? 'alert' : '') + '">' +
          '<div class="watch-icon">' + (watch.type === 'flight' ? '✈️' : '🏨') + '</div>' +
          '<div class="watch-main"><div class="watch-title-row"><strong>' + escapeHtml(watch.label) + '</strong>' +
            (watch.alertPending ? '<span class="alert-chip">Prezzo interessante</span>' : '') + '</div>' +
            '<div class="watch-prices"><span>Inizio <b>' + money(initial, watch.currency) + '</b></span><span>Ora <b>' + money(last, watch.currency) + '</b></span><span>Minimo <b>' + money(best, watch.currency) + '</b></span><span class="' + (change <= 0 ? 'down' : 'up') + '">' + changeText + '</span></div>' +
            '<small>' + (watch.lastCheckedAtMs ? 'Ultimo controllo ' + relativeTime(watch.lastCheckedAtMs) : 'In attesa del primo controllo automatico') +
              (watch.lastError ? ' · ' + escapeHtml(watch.lastError) : '') + '</small>' +
          '</div>' +
          '<div class="watch-actions"><button type="button" data-watch-action="toggle" data-watch-index="' + index + '">' + (watch.enabled ? 'Pausa' : 'Riprendi') + '</button>' +
            '<button class="danger-mini" type="button" data-watch-action="delete" data-watch-index="' + index + '">Elimina</button></div>' +
        '</article>';
      }).join('');
      els.watchesList._watches = watches;
    } catch (error) {
      els.watchesList.innerHTML = '<div class="cloud-error"><strong>Monitoraggi non disponibili</strong><p>' + escapeHtml(error.message || 'Riprova') + '</p></div>';
    }
  }

  async function handleWatchAction(event) {
    const button = event.target.closest('[data-watch-action]');
    if (!button) return;
    const watches = els.watchesList?._watches || [];
    const watch = watches[Number(button.dataset.watchIndex)];
    if (!watch) return;

    try {
      button.disabled = true;
      if (button.dataset.watchAction === 'toggle') {
        await window.LFBRFirebase.updatePriceWatch(watch.id, { enabled: !watch.enabled });
        toast(watch.enabled ? 'Monitoraggio in pausa' : 'Monitoraggio riattivato');
      }
      if (button.dataset.watchAction === 'delete') {
        if (!window.confirm('Eliminare questo monitoraggio prezzo?')) return;
        await window.LFBRFirebase.deletePriceWatch(watch.id);
        toast('Monitoraggio eliminato');
      }
      await refreshPriceWatches();
    } catch (error) {
      toast(error.message || 'Operazione non riuscita');
    } finally {
      button.disabled = false;
    }
  }

  function money(value, currency = 'EUR') {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return '—';
    try {
      return new Intl.NumberFormat('it-IT', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
    } catch (error) {
      return amount.toFixed(0) + ' ' + currency;
    }
  }

  function formatDateTime(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat('it-IT', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
    }).format(date);
  }

  function relativeTime(ms) {
    if (!ms) return '';
    const diff = Date.now() - Number(ms);
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return 'da meno di un’ora';
    if (hours < 24) return hours + ' h fa';
    return Math.floor(hours / 24) + ' g fa';
  }

  function profileSnapshot() {
    return {
      mode: state.mode,
      destinationId: state.destinationId,
      origin: state.origin,
      startDate: state.startDate,
      endDate: state.endDate,
      adults: state.adults,
      children: state.children,
      budget: state.budget,
      pace: state.pace,
      transport: state.transport,
      interests: { ...state.interests }
    };
  }

  function tripDays(start = state.startDate, end = state.endDate) {
    if (!start || !end) return 3;
    const first = new Date(start + 'T00:00:00');
    const last = new Date(end + 'T00:00:00');
    return clamp(Math.round((last - first) / 86400000) + 1, 1, 30);
  }

  function paceStops(value) {
    return ({ relaxed: 3, balanced: 4, intense: 5 })[value] || 4;
  }

  function paceLabel(value) {
    return ({ relaxed: 'Rilassato', balanced: 'Equilibrato', intense: 'Intenso' })[value] || 'Equilibrato';
  }

  function transportLabel(value) {
    return ({ public: 'Mezzi pubblici', walk: 'Prevalentemente a piedi', car: 'Auto' })[value] || 'Mezzi pubblici';
  }

  function deriveTripStatus(profile, fallback) {
    if (fallback === 'draft') return 'draft';
    if (!profile?.startDate || !profile?.endDate) return fallback || 'draft';
    const today = formatDateInput(new Date());
    if (today < profile.startDate) return 'planned';
    if (today > profile.endDate) return 'completed';
    return 'in_progress';
  }

  function statusLabel(status) {
    return ({
      draft: 'Bozza',
      planned: 'Pianificato',
      in_progress: 'In corso',
      completed: 'Concluso'
    })[status] || 'Pianificato';
  }

  function timeLabel(minutes) {
    const hours = Math.floor(minutes / 60) % 24;
    const mins = minutes % 60;
    return String(hours).padStart(2, '0') + ':' + String(mins).padStart(2, '0');
  }

  function formatDateInput(date) {
    return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
  }

  function addDays(dateString, days) {
    if (!dateString) return '';
    const date = new Date(dateString + 'T12:00:00');
    date.setDate(date.getDate() + days);
    return formatDateInput(date);
  }

  function shortDate(dateString) {
    if (!dateString) return '';
    const [, month, day] = dateString.split('-').map(Number);
    const months = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];
    return day + ' ' + months[month - 1];
  }

  function formatDateItalian(dateString) {
    if (!dateString) return '-';
    const [year, month, day] = dateString.split('-').map(Number);
    const months = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];
    return day + ' ' + months[month - 1] + ' ' + year;
  }

  function formatDateItalianLong(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString + 'T12:00:00');
    return new Intl.DateTimeFormat('it-IT', { weekday: 'short', day: 'numeric', month: 'short' }).format(date);
  }

  function formatTripRange(start, end, days) {
    if (!start || !end) return 'Date non definite';
    const [startYear, startMonth, startDay] = start.split('-').map(Number);
    const [endYear, endMonth, endDay] = end.split('-').map(Number);
    const months = ['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre'];

    let text;
    if (startYear === endYear && startMonth === endMonth) {
      text = 'Dal ' + startDay + ' al ' + endDay + ' ' + months[startMonth - 1] + ' ' + startYear;
    } else if (startYear === endYear) {
      text = 'Dal ' + startDay + ' ' + months[startMonth - 1] + ' al ' + endDay + ' ' + months[endMonth - 1] + ' ' + startYear;
    } else {
      text = 'Dal ' + startDay + ' ' + months[startMonth - 1] + ' ' + startYear + ' al ' + endDay + ' ' + months[endMonth - 1] + ' ' + endYear;
    }
    return text + ' · ' + days + ' ' + (days === 1 ? 'giorno' : 'giorni');
  }

  function formatCompactRange(start, end) {
    return shortDate(start) + ' → ' + shortDate(end);
  }

  function distanceKm(lat1, lng1, lat2, lng2) {
    const radius = 6371;
    const radians = value => value * Math.PI / 180;
    const deltaLat = radians(lat2 - lat1);
    const deltaLng = radians(lng2 - lng1);
    const value =
      Math.sin(deltaLat / 2) ** 2 +
      Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(deltaLng / 2) ** 2;
    return 2 * radius * Math.asin(Math.sqrt(value));
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function toast(message) {
    els.toast.textContent = message;
    els.toast.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => els.toast.classList.remove('show'), 2600);
  }

  init();
})();
