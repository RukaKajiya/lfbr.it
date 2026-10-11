(() => {
  const DATA = window.LFBR_TRAVEL_DATA;
  const STORE = window.LFBRStorage;
  if (!DATA || !STORE) return;

  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];
  const clamp = (n,min,max) => Math.max(min,Math.min(max,n));
  const state = {
    step:1, mode:"known", destinationId:DATA.destinations[0].id,
    origin:"", startDate:"", endDate:"", adults:2, children:0, budget:140,
    pace:"balanced", transport:"public", interests:{},
    currentTrip:null, activeDay:0, map:null, markers:[], route:null
  };

  const els = {
    planner:$("#planner"), destinationSelect:$("#destinationSelect"), destinationField:$("#destinationField"),
    origin:$("#originInput"), start:$("#startDate"), end:$("#endDate"), adults:$("#adultsInput"),
    children:$("#childrenInput"), budget:$("#budgetSelect"), interests:$("#interestGrid"),
    next:$("#nextBtn"), back:$("#backBtn"), summary:$("#tripSummary"), results:$("#resultsSection"),
    resultsTitle:$("#resultsTitle"), recommendations:$("#recommendations"), trip:$("#tripSection"),
    tripTitle:$("#tripTitle"), tripSubtitle:$("#tripSubtitle"), tripScore:$("#tripScore"),
    dayTabs:$("#dayTabs"), dayLabel:$("#dayLabel"), dayTitle:$("#dayTitle"), dayBudget:$("#dayBudget"),
    timeline:$("#timeline"), mapCaption:$("#mapCaption"), resume:$("#resumeTripBtn"), toast:$("#toast"),
    loginBtn:$("#loginBtn"), userMenu:$("#userMenu"), userAvatar:$("#userAvatar"),
    cloudTripsBtn:$("#cloudTripsBtn"), logoutBtn:$("#logoutBtn"), saveCloudBtn:$("#saveCloudBtn"),
    cloudModal:$("#cloudModal"), closeCloudModalBtn:$("#closeCloudModalBtn"), cloudTripsList:$("#cloudTripsList")
  };

  function init(){
    DATA.destinations.forEach(d=>{
      const o=document.createElement("option"); o.value=d.id; o.textContent=d.emoji+" "+d.name+" · "+d.country; els.destinationSelect.appendChild(o);
    });

    const savedProfile=STORE.loadProfile();
    DATA.interests.forEach(i=>{
      const value=savedProfile?.interests?.[i.id] ?? 1;
      state.interests[i.id]=Number(value);
      const card=document.createElement("label");
      card.className="interest-card";
      card.innerHTML='<div class="interest-title"><span>'+i.icon+'</span><span>'+i.label+'</span></div><input type="range" min="0" max="3" step="1" value="'+value+'" data-interest="'+i.id+'" aria-label="'+i.label+'"><div class="interest-scale"><span>No</span><span>Poco</span><span>Molto</span><span>Top</span></div>';
      els.interests.appendChild(card);
    });

    const now=new Date();
    const start=new Date(now.getFullYear(),now.getMonth(),now.getDate()+14);
    const end=new Date(start.getFullYear(),start.getMonth(),start.getDate()+3);
    els.start.value=formatDateInput(start); els.end.value=formatDateInput(end);
    state.startDate=els.start.value; state.endDate=els.end.value;

    bind();
    restoreProfile(savedProfile);
    syncWizard();
    if(STORE.loadTrip()) els.resume.hidden=false;
  }

  function restoreProfile(p){
    if(!p) return;
    state.mode=p.mode || state.mode;
    state.destinationId=p.destinationId || state.destinationId;
    state.origin=p.origin || "";
    state.adults=p.adults || 2; state.children=p.children || 0; state.budget=p.budget || 140;
    state.pace=p.pace || "balanced"; state.transport=p.transport || "public";
    els.destinationSelect.value=state.destinationId; els.origin.value=state.origin;
    els.adults.value=state.adults; els.children.value=state.children; els.budget.value=String(state.budget);
    $$(".mode-btn").forEach(b=>b.classList.toggle("active",b.dataset.mode===state.mode));
    els.destinationField.hidden=state.mode==="discover";
    selectChoice("#paceChoices",state.pace); selectChoice("#transportChoices",state.transport);
  }

  function bind(){
    $$(".mode-btn").forEach(btn=>btn.addEventListener("click",()=>{state.mode=btn.dataset.mode; $$(".mode-btn").forEach(b=>b.classList.toggle("active",b===btn)); els.destinationField.hidden=state.mode==="discover";}));
    els.destinationSelect.addEventListener("change",e=>state.destinationId=e.target.value);
    els.origin.addEventListener("input",e=>state.origin=e.target.value.trim());
    els.start.addEventListener("change",e=>{state.startDate=e.target.value; if(els.end.value<e.target.value){els.end.value=e.target.value;state.endDate=e.target.value;}});
    els.end.addEventListener("change",e=>state.endDate=e.target.value);
    els.adults.addEventListener("input",e=>state.adults=clamp(Number(e.target.value)||1,1,12));
    els.children.addEventListener("input",e=>state.children=clamp(Number(e.target.value)||0,0,8));
    els.budget.addEventListener("change",e=>state.budget=Number(e.target.value));

    bindChoice("#paceChoices","pace"); bindChoice("#transportChoices","transport");
    els.interests.addEventListener("input",e=>{if(e.target.dataset.interest)state.interests[e.target.dataset.interest]=Number(e.target.value);});

    els.next.addEventListener("click",()=>{
      syncFromForm();
      if(state.step===1 && !validateDates()) return;
      if(state.step<4){state.step++;syncWizard();}
      else generate();
    });
    els.back.addEventListener("click",()=>{if(state.step>1){state.step--;syncWizard();}});
    $$(".step-dot").forEach(b=>b.addEventListener("click",()=>{const n=Number(b.dataset.goStep); if(n<=state.step||n===1){state.step=n;syncWizard();}}));

    $("#surpriseStartBtn").addEventListener("click",()=>{state.mode="discover"; $$(".mode-btn").forEach(b=>b.classList.toggle("active",b.dataset.mode==="discover"));els.destinationField.hidden=true; state.step=1;syncWizard();els.planner.scrollIntoView({behavior:"smooth"});});
    $("#editProfileBtn").addEventListener("click",()=>{state.step=3;syncWizard();els.planner.scrollIntoView({behavior:"smooth"});});
    $("#newTripBtn").addEventListener("click",()=>{state.currentTrip=null;els.trip.hidden=true;els.results.hidden=true;state.step=1;syncWizard();els.planner.scrollIntoView({behavior:"smooth"});});
    $("#surpriseBtn").addEventListener("click",addSurpriseStop);
    $("#relaxBtn").addEventListener("click",relaxTrip);
    $("#saveBtn").addEventListener("click",()=>{if(!state.currentTrip)return;STORE.saveTrip(state.currentTrip);els.resume.hidden=false;toast("Viaggio salvato su questo dispositivo");});
    els.saveCloudBtn.addEventListener("click",handleSaveCloud);
    els.resume.addEventListener("click",()=>{const trip=STORE.loadTrip();if(trip){state.currentTrip=trip;state.activeDay=0;renderTrip();els.trip.scrollIntoView({behavior:"smooth"});}});
    els.dayTabs.addEventListener("click",e=>{const b=e.target.closest("button[data-day]");if(!b)return;state.activeDay=Number(b.dataset.day);renderDay();});
    els.timeline.addEventListener("click",handleStopAction);

    els.loginBtn.addEventListener("click",async()=>{
      try {
        if(!window.LFBRFirebase) return;
        await window.LFBRFirebase.loginWithGoogle();
        toast("Accesso effettuato con Google");
      } catch(err) {
        toast("Errore durante l'accesso: " + (err.message||"Riprova"));
      }
    });

    els.logoutBtn.addEventListener("click",async()=>{
      try {
        if(!window.LFBRFirebase) return;
        await window.LFBRFirebase.logoutUser();
        toast("Disconnesso");
      } catch(err) {
        toast("Errore disconnessione");
      }
    });

    els.cloudTripsBtn.addEventListener("click",openCloudModal);
    els.closeCloudModalBtn.addEventListener("click",()=>els.cloudModal.hidden=true);

    window.addEventListener("lfbr:auth-change",e=>{
      const user = e.detail?.user;
      if(user) {
        els.loginBtn.hidden = true;
        els.userMenu.hidden = false;
        els.userAvatar.textContent = (user.displayName || user.email || "U")[0].toUpperCase();
        els.userAvatar.title = user.displayName || user.email;
      } else {
        els.loginBtn.hidden = false;
        els.userMenu.hidden = true;
      }
    });
  }

  async function handleSaveCloud(){
    if(!state.currentTrip){toast("Nessun viaggio da salvare");return;}
    if(!window.LFBRFirebase?.currentUser){
      toast("Accedi con Google per salvare su Firebase Cloud");
      try {
        await window.LFBRFirebase.loginWithGoogle();
      } catch(err){return;}
    }
    try {
      const dest=DATA.destinations.find(d=>d.id===state.currentTrip.destinationId);
      state.currentTrip.title = "Viaggio a " + (dest ? dest.name : state.currentTrip.destinationId);
      await window.LFBRFirebase.saveTripToCloud(state.currentTrip);
      toast("☁ Viaggio salvato con successo su Firebase Firestore!");
    } catch(err) {
      toast("Errore salvataggio Cloud: " + (err.message || "Riprova"));
    }
  }

  async function openCloudModal(){
    els.cloudModal.hidden = false;
    els.cloudTripsList.innerHTML = '<p style="color:var(--muted);font-size:12px">Caricamento viaggi dal Cloud...</p>';
    try {
      const trips = await window.LFBRFirebase.loadUserTripsFromCloud();
      if(!trips || trips.length === 0){
        els.cloudTripsList.innerHTML = '<p style="color:var(--muted);font-size:12px">Nessun viaggio salvato nel Cloud. Crea un itinerario e salvalo con “Salva su Firestore”.</p>';
        return;
      }
      els.cloudTripsList.innerHTML = trips.map((t, idx) => {
        const dest = DATA.destinations.find(d => d.id === t.destinationId);
        return '<div class="cloud-trip-item">' +
          '<div>' +
            '<h4>' + (dest ? dest.emoji + " " : "") + (t.title || ("Viaggio a " + t.destinationId)) + '</h4>' +
            '<p>' + (t.itinerary?.length || 0) + ' giorni · Compatibilità: ' + (t.score || 0) + '%</p>' +
          '</div>' +
          '<button class="secondary-btn small" type="button" data-load-cloud="' + idx + '">Apri</button>' +
        '</div>';
      }).join("");

      $$("[data-load-cloud]", els.cloudTripsList).forEach(btn => {
        btn.addEventListener("click", () => {
          const idx = Number(btn.dataset.loadCloud);
          state.currentTrip = trips[idx];
          state.activeDay = 0;
          renderTrip();
          els.cloudModal.hidden = true;
          els.trip.scrollIntoView({behavior: "smooth"});
          toast("Viaggio caricato da Firebase");
        });
      });
    } catch(err) {
      els.cloudTripsList.innerHTML = '<p style="color:#d93025;font-size:12px">Errore nel caricamento: ' + (err.message || 'Riprova') + '</p>';
    }
  }

  function bindChoice(selector,key){
    $$(selector+" .choice-btn").forEach(btn=>btn.addEventListener("click",()=>{state[key]=btn.dataset.value;selectChoice(selector,state[key]);}));
  }
  function selectChoice(selector,value){$$(selector+" .choice-btn").forEach(b=>b.classList.toggle("active",b.dataset.value===value));}

  function syncFromForm(){
    state.destinationId=els.destinationSelect.value;
    state.origin=els.origin.value.trim();
    state.startDate=els.start.value; state.endDate=els.end.value;
    state.adults=clamp(Number(els.adults.value)||1,1,12);
    state.children=clamp(Number(els.children.value)||0,0,8);
    state.budget=Number(els.budget.value)||140;
  }

  function syncWizard(){
    $$(".wizard-step").forEach(s=>s.classList.toggle("active",Number(s.dataset.step)===state.step));
    $$(".step-dot").forEach(s=>s.classList.toggle("active",Number(s.dataset.goStep)===state.step));
    els.back.disabled=state.step===1;
    els.next.textContent=state.step===4?(state.mode==="discover"?"Trova le destinazioni":"Genera itinerario"):"Continua";
    if(state.step===4){syncFromForm();renderSummary();}
  }

  function renderSummary(){
    const dest=DATA.destinations.find(d=>d.id===state.destinationId);
    const top=DATA.interests
      .map(i=>({label:i.label,value:state.interests[i.id]||0}))
      .filter(x=>x.value>0).sort((a,b)=>b.value-a.value).slice(0,5);
    const days=tripDays();
    els.summary.innerHTML=
      '<div class="summary-item"><small>Destinazione</small><strong>'+(state.mode==="discover"?"Da consigliare":dest.emoji+" "+dest.name)+'</strong></div>'+
      '<div class="summary-item"><small>Durata</small><strong>'+days+' '+(days===1?"giorno":"giorni")+'</strong></div>'+
      '<div class="summary-item"><small>Viaggiatori</small><strong>'+state.adults+' adulti'+(state.children?" · "+state.children+" bambini":"")+'</strong></div>'+
      '<div class="summary-item"><small>Budget</small><strong>circa '+state.budget+' € / giorno / persona</strong></div>'+
      '<div class="summary-item"><small>Ritmo</small><strong>'+paceLabel(state.pace)+'</strong></div>'+
      '<div class="summary-item"><small>Mobilità</small><strong>'+transportLabel(state.transport)+'</strong></div>'+
      '<div class="summary-item full"><small>Priorità</small><div class="summary-tags">'+(top.length?top.map(x=>'<span>'+x.label+'</span>').join(""):'<span>Profilo equilibrato</span>')+'</div></div>';
  }

  function validateDates(){
    if(!state.startDate||!state.endDate){toast("Inserisci le date del viaggio");return false;}
    if(state.endDate<state.startDate){toast("La data di ritorno deve essere successiva alla partenza");return false;}
    return true;
  }

  function generate(){
    syncFromForm();
    STORE.saveProfile(profileSnapshot());
    if(state.mode==="discover"){
      renderRecommendations();
      els.results.hidden=false;els.trip.hidden=true;
      els.results.scrollIntoView({behavior:"smooth",block:"start"});
    }else{
      createTrip(state.destinationId);
    }
  }

  function renderRecommendations(){
    const ranked=DATA.destinations.map(d=>({d,score:destinationScore(d)})).sort((a,b)=>b.score-a.score).slice(0,3);
    els.resultsTitle.textContent="Le destinazioni migliori per te";
    els.recommendations.innerHTML=ranked.map((x,i)=>{
      const reasons=destinationReasons(x.d);
      return '<article class="destination-card '+(i===0?"top":"")+'"><div class="destination-top"><div class="destination-name"><span>'+x.d.emoji+'</span><div><strong>'+x.d.name+'</strong><small>'+x.d.country+'</small></div></div><div class="match-ring" style="--score:'+x.score+'"><b>'+x.score+'%</b></div></div><p>'+x.d.pitch+'</p><div class="reason-list">'+reasons.map(r=>'<span>'+r+'</span>').join("")+'</div><button type="button" data-pick="'+x.d.id+'">Organizza '+x.d.name+'</button></article>';
    }).join("");
    $$("[data-pick]",els.recommendations).forEach(b=>b.addEventListener("click",()=>createTrip(b.dataset.pick)));
  }

  function destinationScore(dest){
    const selected=Object.entries(state.interests).filter(([,v])=>v>0);
    let total=0,match=0;
    selected.forEach(([id,v])=>{total+=v;if(dest.tags.includes(id))match+=v;});
    const ratio=total?match/total:.55;
    let score=58+ratio*34;
    if(state.budget>=dest.avgDaily)score+=5;else score-=Math.min(9,(dest.avgDaily-state.budget)/12);
    if(state.children>0&&dest.tags.includes("family"))score+=3;
    return Math.round(clamp(score,55,98));
  }

  function destinationReasons(dest){
    const labels=Object.fromEntries(DATA.interests.map(i=>[i.id,i.label]));
    const matched=Object.entries(state.interests).filter(([id,v])=>v>=2&&dest.tags.includes(id)).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([id])=>labels[id]);
    if(state.budget>=dest.avgDaily)matched.push("Budget compatibile");
    return matched.slice(0,4).length?matched.slice(0,4):["Profilo equilibrato","Buona varietà"];
  }

  function createTrip(destinationId){
    const dest=DATA.destinations.find(d=>d.id===destinationId);
    const score=destinationScore(dest);
    const itinerary=buildItinerary(dest);
    state.currentTrip={version:1,createdAt:new Date().toISOString(),profile:profileSnapshot(),destinationId,score,itinerary};
    state.activeDay=0;els.results.hidden=true;renderTrip();els.trip.hidden=false;els.trip.scrollIntoView({behavior:"smooth",block:"start"});
  }

  function buildItinerary(dest){
    const maxDays=Math.min(tripDays(),5);
    const ranked=dest.places.map((p,index)=>({...p,_id:index,_score:placeScore(p)})).sort((a,b)=>b._score-a._score);
    const days=Array.from({length:maxDays},()=>[]);
    let remaining=[...ranked];
    for(let day=0;day<maxDays&&remaining.length;day++){
      const remainingDays=maxDays-day;
      const count=Math.max(1,Math.ceil(remaining.length/remainingDays));
      let current=remaining.shift();days[day].push(current);
      while(days[day].length<count&&remaining.length){
        const nextIndex=bestNearbyIndex(current,remaining);
        current=remaining.splice(nextIndex,1)[0];days[day].push(current);
      }
    }
    return days.map((stops,i)=>({day:i+1,stops:withTimes(stops)}));
  }

  function placeScore(p){
    let s=10;
    p.tags.forEach(t=>s+=(state.interests[t]||0)*4);
    s+=(state.interests[p.category]||0)*3;
    if(state.children>0&&p.tags.includes("family"))s+=5;
    if(p.cost<=state.budget*.25)s+=2;
    return s;
  }

  function bestNearbyIndex(from,candidates){
    let best=0,bestValue=-Infinity;
    candidates.forEach((p,i)=>{
      const dist=distanceKm(from.lat,from.lng,p.lat,p.lng);
      const value=p._score-dist*.55;
      if(value>bestValue){bestValue=value;best=i;}
    });
    return best;
  }

  function withTimes(stops){
    let mins=9*60+30;
    return stops.map((p,i)=>{
      const copy={...p,time:timeLabel(mins)};
      mins+=p.duration+(i<stops.length-1?30:0);
      return copy;
    });
  }

  function renderTrip(){
    if(!state.currentTrip)return;
    const dest=DATA.destinations.find(d=>d.id===state.currentTrip.destinationId);
    els.trip.hidden=false;
    els.tripTitle.textContent=dest.emoji+" "+dest.name;
    const p=state.currentTrip.profile;
    els.tripSubtitle.textContent=state.currentTrip.itinerary.length+" giorni · "+paceLabel(p.pace)+" · "+transportLabel(p.transport)+(p.origin?" · da "+p.origin:"");
    els.tripScore.textContent=state.currentTrip.score+"%";
    els.dayTabs.innerHTML=state.currentTrip.itinerary.map((d,i)=>'<button type="button" data-day="'+i+'" class="'+(i===state.activeDay?"active":"")+'">Giorno '+d.day+'</button>').join("");
    renderDay();
  }

  function renderDay(){
    const trip=state.currentTrip;if(!trip)return;
    const day=trip.itinerary[state.activeDay];if(!day)return;
    $$("button",els.dayTabs).forEach((b,i)=>b.classList.toggle("active",i===state.activeDay));
    els.dayLabel.textContent="Giorno "+day.day;
    els.dayTitle.textContent=day.stops.length?"Una giornata pensata per te":"Giornata libera";
    const total=day.stops.reduce((a,s)=>a+s.cost,0);
    els.dayBudget.textContent="Attività ≈ "+Math.round(total)+" € / persona";
    els.timeline.innerHTML=day.stops.length?day.stops.map((s,i)=>'<article class="stop-card"><div class="stop-time">'+s.time+'</div><div class="stop-main"><strong>'+s.name+'</strong><p>'+s.desc+'</p><div class="stop-meta"><span>'+s.district+'</span><span>'+Math.round(s.duration/60*10)/10+' h</span><span>'+(s.cost?("≈ "+s.cost+" €"):"Gratis")+'</span></div></div><div class="stop-actions"><button type="button" data-action="up" data-index="'+i+'" aria-label="Sposta su">↑</button><button type="button" data-action="down" data-index="'+i+'" aria-label="Sposta giù">↓</button><button type="button" data-action="remove" data-index="'+i+'" aria-label="Rimuovi">×</button></div></article>').join(""):'<div class="privacy-note">Nessuna tappa: usa “Sorprendimi” per aggiungerne una.</div>';
    renderMap(day.stops);
  }

  function renderMap(stops){
    const dest=DATA.destinations.find(d=>d.id===state.currentTrip.destinationId);
    els.mapCaption.textContent=stops.length+" "+(stops.length===1?"tappa":"tappe")+" · giorno "+(state.activeDay+1);
    if(!window.L){$("#tripMap").innerHTML='<div class="privacy-note" style="margin:20px">Mappa non disponibile. L’itinerario resta utilizzabile.</div>';return;}
    if(!state.map){
      state.map=L.map("tripMap",{scrollWheelZoom:false}).setView(dest.center,12);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:'&copy; OpenStreetMap contributors'}).addTo(state.map);
    }
    state.markers.forEach(m=>m.remove());state.markers=[];
    if(state.route){state.route.remove();state.route=null;}
    const latlngs=[];
    stops.forEach((s,i)=>{
      const m=L.marker([s.lat,s.lng]).addTo(state.map).bindPopup('<strong>'+(i+1)+'. '+s.name+'</strong><br>'+s.time+' · '+s.district);
      state.markers.push(m);latlngs.push([s.lat,s.lng]);
    });
    if(latlngs.length>1)state.route=L.polyline(latlngs,{weight:3,opacity:.65}).addTo(state.map);
    if(latlngs.length){const group=L.featureGroup(state.markers);state.map.fitBounds(group.getBounds().pad(.25),{maxZoom:14});}
    else state.map.setView(dest.center,12);
    setTimeout(()=>state.map.invalidateSize(),50);
  }

  function handleStopAction(e){
    const b=e.target.closest("button[data-action]");if(!b||!state.currentTrip)return;
    const day=state.currentTrip.itinerary[state.activeDay],i=Number(b.dataset.index),action=b.dataset.action;
    if(action==="remove")day.stops.splice(i,1);
    if(action==="up"&&i>0)[day.stops[i-1],day.stops[i]]=[day.stops[i],day.stops[i-1]];
    if(action==="down"&&i<day.stops.length-1)[day.stops[i+1],day.stops[i]]=[day.stops[i],day.stops[i+1]];
    day.stops=withTimes(day.stops);renderDay();
  }

  function addSurpriseStop(){
    if(!state.currentTrip)return;
    const dest=DATA.destinations.find(d=>d.id===state.currentTrip.destinationId);
    const used=new Set(state.currentTrip.itinerary.flatMap(d=>d.stops.map(s=>s.name)));
    const candidates=dest.places.filter(p=>!used.has(p.name)).map((p,i)=>({...p,_id:i,_score:placeScore(p)})).sort((a,b)=>b._score-a._score);
    if(!candidates.length){toast("Hai già inserito tutti i luoghi disponibili nella V1");return;}
    const day=state.currentTrip.itinerary[state.activeDay];
    day.stops.push(candidates[0]);day.stops=withTimes(day.stops);renderDay();toast("Ho aggiunto "+candidates[0].name);
  }

  function relaxTrip(){
    if(!state.currentTrip)return;
    state.currentTrip.itinerary.forEach(day=>{
      if(day.stops.length>2){day.stops.sort((a,b)=>b._score-a._score);day.stops=withTimes(day.stops.slice(0,Math.max(2,day.stops.length-1)));}
    });
    state.currentTrip.profile.pace="relaxed";renderTrip();toast("Ho alleggerito le giornate");
  }

  function profileSnapshot(){return {mode:state.mode,destinationId:state.destinationId,origin:state.origin,startDate:state.startDate,endDate:state.endDate,adults:state.adults,children:state.children,budget:state.budget,pace:state.pace,transport:state.transport,interests:{...state.interests}};}
  function tripDays(){if(!state.startDate||!state.endDate)return 3;const a=new Date(state.startDate+"T00:00:00"),b=new Date(state.endDate+"T00:00:00");return clamp(Math.round((b-a)/86400000)+1,1,30);}
  function paceLabel(v){return ({relaxed:"Rilassato",balanced:"Equilibrato",intense:"Intenso"})[v]||v;}
  function transportLabel(v){return ({public:"Mezzi pubblici",walk:"Prevalentemente a piedi",car:"Auto"})[v]||v;}
  function timeLabel(m){const h=Math.floor(m/60)%24,min=m%60;return String(h).padStart(2,"0")+":"+String(min).padStart(2,"0");}
  function formatDateInput(d){return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");}
  function distanceKm(a,b,c,d){const R=6371,rad=x=>x*Math.PI/180;const x=rad(c-a),y=rad(d-b);const q=Math.sin(x/2)**2+Math.cos(rad(a))*Math.cos(rad(c))*Math.sin(y/2)**2;return 2*R*Math.asin(Math.sqrt(q));}
  function toast(msg){els.toast.textContent=msg;els.toast.classList.add("show");clearTimeout(toast.t);toast.t=setTimeout(()=>els.toast.classList.remove("show"),2200);}

  init();
})();