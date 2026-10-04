(() => {
  const grid=document.getElementById('articleGrid'); if(!grid) return;
  const cards=[...grid.querySelectorAll('.guide-card')];
  const search=document.getElementById('articleSearch');
  const macroButtons=[...document.querySelectorAll('.filter-btn')];
  const topic=document.getElementById('topicFilter');
  const count=document.getElementById('resultCount');
  const empty=document.getElementById('emptyState');
  const reset=document.getElementById('resetFilters');
  let activeMacro='all';
  const normalize=v=>(v||'').toLocaleLowerCase('it').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  function apply(){
    const q=normalize(search.value.trim()); let visible=0;
    cards.forEach(card=>{
      const macroMatch=activeMacro==='all'||card.dataset.category===activeMacro;
      const topicMatch=topic.value==='all'||card.dataset.topic===topic.value;
      const searchMatch=!q||normalize(card.textContent).includes(q);
      const show=macroMatch&&topicMatch&&searchMatch; card.hidden=!show; if(show) visible++;
    });
    count.textContent=visible===1?'1 contenuto disponibile':visible+' contenuti disponibili';
    empty.hidden=visible!==0;
    macroButtons.forEach(b=>{const on=b.dataset.filter===activeMacro;b.classList.toggle('active',on);b.setAttribute('aria-pressed',on?'true':'false');});
  }
  macroButtons.forEach(b=>b.addEventListener('click',()=>{activeMacro=b.dataset.filter;apply();}));
  search.addEventListener('input',apply); topic.addEventListener('change',apply);
  reset.addEventListener('click',()=>{search.value='';topic.value='all';activeMacro='all';apply();search.focus();});
  apply();
})();