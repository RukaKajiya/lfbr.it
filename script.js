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
 document.addEventListener('keydown',e=>{if(e.key==='/'&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)){e.preventDefault();search.focus();}});
 renderChips();apply();
})();