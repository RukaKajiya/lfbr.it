(() => {
 const root=document.querySelector('.archive-shell');
 const top=document.getElementById('toTop');
 if(top){const sync=()=>top.classList.toggle('visible',window.scrollY>500);window.addEventListener('scroll',sync,{passive:true});top.addEventListener('click',()=>window.scrollTo({top:0,behavior:'smooth'}));sync();}
 if(!root) return;
 const grid=root.querySelector('#articleGrid'), cards=[...grid.querySelectorAll('[data-category]')], search=root.querySelector('#articleSearch');
 const buttons=[...root.querySelectorAll('.filter-btn')], chipBox=root.querySelector('#topicChips');
 const count=root.querySelector('#resultCount'), empty=root.querySelector('#emptyState'), reset=root.querySelector('#resetFilters');
 const clear=root.querySelector('#clearFilters'), load=root.querySelector('#loadMore'), viewBtns=[...root.querySelectorAll('.view-btn')];
 const labels={"ai":"AI","hardware":"Hardware","smartphone":"Smartphone & App","sicurezza":"Sicurezza","web":"Web","dati":"Dati & Backup","acquisto":"Guide all'acquisto","pc-gaming":"PC Gaming","gaming":"Gaming","retrogaming":"Retrogaming","anime":"Anime","manga":"Manga","anime-manga":"Anime & Manga","tcg":"TCG","pokemon":"Pokémon","one-piece":"One Piece","collezionismo":"Collezionismo","eventi":"Eventi & Uscite","streaming":"Streaming","cinema-serie":"Cinema & Serie"};
 let macro='all', topic='all', view='grid', limit=12;
 const norm=v=>(v||'').toLocaleLowerCase('it').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
 function availableTopics(){
   const set=new Set(cards.filter(c=>macro==='all'||c.dataset.category===macro).map(c=>c.dataset.topic));
   return [...set].sort((a,b)=>(labels[a]||a).localeCompare(labels[b]||b,'it'));
 }
 function renderChips(){
   const topics=availableTopics();
   if(topic!=='all'&&!topics.includes(topic)) topic='all';
   chipBox.innerHTML='<button class="topic-chip'+(topic==='all'?' active':'')+'" type="button" data-topic="all">Tutte</button>'+
     topics.map(t=>'<button class="topic-chip'+(topic===t?' active':'')+'" type="button" data-topic="'+t+'">'+(labels[t]||t)+'</button>').join('');
   [...chipBox.querySelectorAll('.topic-chip')].forEach(b=>b.addEventListener('click',()=>{topic=b.dataset.topic;limit=12;renderChips();apply();}));
 }
 function apply(){
   const q=norm(search.value.trim());
   const matches=cards.filter(c=>(macro==='all'||c.dataset.category===macro)&&(topic==='all'||c.dataset.topic===topic)&&(!q||norm(c.textContent).includes(q)));
   cards.forEach(c=>c.hidden=true);
   matches.slice(0,limit).forEach(c=>c.hidden=false);
   count.textContent=matches.length===1?'1 risultato':matches.length+' risultati';
   empty.hidden=matches.length!==0;
   load.hidden=matches.length<=limit;
   clear.hidden=macro==='all'&&topic==='all'&&!q;
   buttons.forEach(b=>{const on=b.dataset.filter===macro;b.classList.toggle('active',on);b.setAttribute('aria-pressed',on?'true':'false')});
 }
 buttons.forEach(b=>b.addEventListener('click',()=>{macro=b.dataset.filter;topic='all';limit=12;renderChips();apply();}));
 search.addEventListener('input',()=>{limit=12;apply()});
 load.addEventListener('click',()=>{limit+=12;apply()});
 function resetAll(){macro='all';topic='all';limit=12;search.value='';renderChips();apply();}
 reset.addEventListener('click',resetAll);clear.addEventListener('click',resetAll);
 viewBtns.forEach(b=>b.addEventListener('click',()=>{view=b.dataset.view;grid.classList.toggle('list-view',view==='list');viewBtns.forEach(x=>x.classList.toggle('active',x===b));}));
 renderChips();apply();
})();
/* Global search and chronological pagination; archive filters above remain independent. */
(() => {
 const base = new URL('.', document.querySelector('script[src$="script.js"]').src);
 const norm = value => (value || '').toLocaleLowerCase('it').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
 const trigger = document.querySelector('.nav-search');
 let catalog, pending, shown = 12, returnFocus;
 const dialog = document.createElement('dialog');
 dialog.className = 'global-search';
 dialog.setAttribute('aria-labelledby', 'globalSearchTitle');
 dialog.innerHTML = '<div class="search-panel"><div class="search-panel-heading"><h2 id="globalSearchTitle">Cerca in LFBR</h2><button type="button" class="search-close" aria-label="Chiudi ricerca">×</button></div><label class="search-box" for="globalSearchInput"><span aria-hidden="true">⌕</span><input id="globalSearchInput" type="search" placeholder="Titolo, categoria o argomento" autocomplete="off"></label><p class="search-status" role="status" aria-live="polite"></p><div class="search-results"></div><button class="load-more search-more" type="button" hidden>Altri risultati</button><p class="search-help">Esc per chiudere · / oppure Ctrl+K per cercare</p></div>';
 document.body.append(dialog);
 const input = dialog.querySelector('input'), status = dialog.querySelector('.search-status'), results = dialog.querySelector('.search-results'), more = dialog.querySelector('.search-more');
 async function getCatalog() {
   if (catalog) return catalog;
   if (!pending) pending = fetch(new URL('articles.json', base)).then(r => { if (!r.ok) throw new Error('Catalog unavailable'); return r.json(); }).then(data => { catalog = data; return data; }).finally(() => { pending = null; });
   return pending;
 }
 async function render() {
   const query = input.value.trim();
   status.textContent = 'Caricamento del catalogo…';
   try {
     const data = await getCatalog();
     if (query !== input.value.trim()) return;
     const terms = norm(query).split(/\s+/).filter(Boolean);
     const matches = data.filter(a => { const hay = norm([a.title, a.categoryLabel, a.category, a.topicLabel, a.topic, a.description].join(' ')); return terms.every(t => hay.includes(t)); });
     results.replaceChildren();
     matches.slice(0, shown).forEach(a => {
       const link = document.createElement('a'); link.className = 'search-result'; link.href = new URL(a.url, base).href;
       const label = document.createElement('small'); label.textContent = a.categoryLabel + ' / ' + a.topicLabel;
       const title = document.createElement('strong'); title.textContent = a.title;
       const description = document.createElement('span'); description.textContent = a.description;
       link.append(label, title, description); results.append(link);
     });
     status.textContent = matches.length ? `${matches.length} ${matches.length === 1 ? 'risultato' : 'risultati'} · ${Math.min(shown, matches.length)} visibili` : 'Nessun risultato. Prova un altro termine.';
     more.hidden = matches.length <= shown;
   } catch {
     results.replaceChildren(); more.hidden = true;
     status.textContent = 'Ricerca temporaneamente non disponibile. Riprova digitando oppure usa l’archivio.';
     const fallback = document.createElement('a'); fallback.href = new URL('index.html#articoli', base).href; fallback.textContent = 'Apri l’archivio'; results.append(fallback);
   }
 }
 function openSearch() { if (dialog.open) return; returnFocus = document.activeElement; dialog.showModal(); document.body.classList.add('search-open'); input.focus(); render(); }
 trigger?.addEventListener('click', e => { e.preventDefault(); openSearch(); });
 dialog.querySelector('.search-close').addEventListener('click', () => dialog.close());
 dialog.addEventListener('click', e => { if (e.target === dialog) { const r = dialog.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialog.close(); } });
 dialog.addEventListener('close', () => { document.body.classList.remove('search-open'); returnFocus?.focus(); });
 input.addEventListener('input', () => { shown = 12; render(); });
 more.addEventListener('click', () => { shown += 12; render(); });
 document.addEventListener('keydown', e => {
   if ((e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) && !document.activeElement.isContentEditable) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) { e.preventDefault(); openSearch(); }
 });
 const latest = document.getElementById('latestArticles');
 if (latest) {
   const cards = [...latest.querySelectorAll('.story-card')], days = [...latest.querySelectorAll('.latest-day')];
   const button = document.getElementById('latestMore'), count = document.getElementById('latestStatus'); let limit = 12;
   const apply = () => { cards.forEach((c, i) => c.hidden = i >= limit); days.forEach(d => d.hidden = ![...d.querySelectorAll('.story-card')].some(c => !c.hidden)); button.hidden = limit >= cards.length; count.textContent = `${Math.min(limit, cards.length)} di ${cards.length} articoli recenti`; };
   button.addEventListener('click', () => { limit += 12; apply(); }); apply();
 }
})();
