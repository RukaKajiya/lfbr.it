from pathlib import Path
import re, json, html, xml.etree.ElementTree as ET
from datetime import datetime
from email.utils import format_datetime
ROOT=Path(__file__).resolve().parents[1]
BASE='https://lfbr.it/'
def read(p): return (ROOT/p).read_text(encoding='utf-8')
def write(p,s):
    dest=ROOT/p
    if dest.exists(): dest.read_text(encoding='utf-8') # reread immediately before each write
    dest.parent.mkdir(parents=True,exist_ok=True)
    s=re.sub(r'(?m)[ \t]+$','',s)
    s=re.sub(r'\n{3,}','\n\n',s)
    dest.write_text(s,encoding='utf-8')
def text(s): return html.unescape(re.sub('<[^>]+>','',s)).strip()
def match(pattern,s,default=''):
    m=re.search(pattern,s,re.S); return m.group(1) if m else default

def build(updated):
    index=read('index.html')
    macros={'tecnologia':'Tecnologia','gaming':'Gaming','anime-manga':'Anime & Manga','collezionismo':'TCG & Collezionismo','intrattenimento':'Cinema & Streaming'}
    category_paths={k:'categorie/'+('cinema-streaming' if k=='intrattenimento' else k)+'.html' for k in macros}
    catalog=[]
    for attrs,inner in re.findall(r'<a\b([^>]*class="story-card[^>]*?)>(.*?)</a>',index,re.S):
        path=match(r'href="([^"]+)"',attrs)
        if not path.startswith('articoli/'): continue
        src=read(path); macro=match(r'data-category="([^"]+)"',attrs)
        date=match(r'"datePublished"\s*:\s*"([^"]+)"',src)
        modified=match(r'"dateModified"\s*:\s*"([^"]+)"',src)
        catalog.append(dict(url=path,title=text(match(r'<h1[^>]*>(.*?)</h1>',src)),description=html.unescape(match(r'<meta name="description" content="([^"]*)"',src)),category=macro,categoryLabel=macros[macro],categoryUrl=category_paths[macro],topic=match(r'data-topic="([^"]+)"',attrs),topicLabel=text(match(r'<b>(.*?)</b>',inner)),datePublished=date or None,dateModified=modified or None))
    assert catalog and len({a['url'] for a in catalog})==len(catalog)
    recent=sorted((a for a in catalog if a['datePublished']),key=lambda a:(a['datePublished'],a['url']),reverse=True)
    assert recent
    def card(a,prefix=''):
        return '<a class="story-card" href="'+prefix+a['url']+'"><div class="story-art art-'+a['category']+'"><span>'+html.escape(a['categoryLabel'])+'</span><b>'+html.escape(a['topicLabel'])+'</b></div><div class="story-copy"><h3>'+html.escape(a['title'])+'</h3><p>'+html.escape(a['description'])+'</p><span class="story-link">Leggi articolo →</span></div></a>'
    write('articles.json',json.dumps(catalog,ensure_ascii=False,indent=2)+'\n')
    header=match(r'(<header class="topbar">.*?</header>)',index)
    footer=match(r'(<footer class="footer">.*?</footer>)',index)
    groups=''
    for date in sorted({a['datePublished'] for a in recent},reverse=True):
        d=datetime.fromisoformat(date); months=['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre']
        label=f'{d.day} {months[d.month-1]} {d.year}'
        groups+='<section class="latest-day"><h2><time datetime="'+date+'">'+label+'</time></h2><div class="story-grid">'+''.join(card(a) for a in recent if a['datePublished']==date)+'</div></section>'
    latest='<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Ultimi articoli - LFBR</title><meta name="description" content="Le ultime notizie LFBR in ordine cronologico: tecnologia, gaming, anime, manga, TCG e streaming."><link rel="canonical" href="https://lfbr.it/ultimi.html"><link rel="stylesheet" href="styles.css"><script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5244616248346330" crossorigin="anonymous"></script></head><body><div class="site">'+header+'<main class="category-page"><span class="overline">Il magazine, giorno per giorno</span><h1>Ultimi articoli</h1><p>Notizie e approfondimenti, dal più recente. <a href="feed.xml">Segui il feed RSS</a></p><div id="latestArticles">'+groups+'</div><div class="load-more-wrap"><button class="load-more" id="latestMore" type="button" hidden>Mostra altri articoli</button><p id="latestStatus" role="status"></p></div><p>Per le guide senza una data di pubblicazione, esplora <a href="index.html#articoli">tutti i '+str(len(catalog))+' contenuti dell’archivio</a>.</p></main>'+footer+'</div></body></html>'
    write('ultimi.html',latest)
    by_path={a['url']:a for a in catalog}
    publisher={'@type':'Organization','@id':BASE+'#publisher','name':'LFBR','url':BASE}
    for p in sorted(ROOT.rglob('*.html')):
        if '.git' in p.parts: continue
        path=p.relative_to(ROOT).as_posix(); src=read(path); prefix='../' if '/' in path else ''
        src=src.replace('index.html#guide','index.html#articoli')
        title=text(match(r'<title>(.*?)</title>',src)); desc=html.unescape(match(r'<meta name="description" content="([^"]*)"',src))
        url=BASE if path=='index.html' else BASE+path
        src=re.sub(r'<meta[^>]+name="theme-color"[^>]*>','',src)
        src=re.sub(r'<meta[^>]+property="article:(?:published|modified)_time"[^>]*>','',src)
        src=re.sub(r'<meta[^>]+(?:property="og:[^"]+"|name="twitter:[^"]+")[^>]*>','',src)
        src=re.sub(r'<link\b[^>]*rel="(?:canonical|manifest|icon|alternate)"[^>]*>','',src)
        src=re.sub(r'<script\b[^>]*type="application/ld\+json"[^>]*>.*?</script>','',src,flags=re.S)
        src=re.sub(r'<script\b[^>]*src="(?:\.\./)?script.js"[^>]*>\s*</script>','',src)
        meta='\n<link rel="canonical" href="'+url+'"><link rel="manifest" href="'+prefix+'site.webmanifest"><link rel="icon" type="image/svg+xml" href="'+prefix+'favicon.svg"><link rel="alternate" type="application/rss+xml" title="LFBR — Ultimi articoli" href="'+prefix+'feed.xml"><meta name="theme-color" content="#f2f3f5">\n'
        for name,value in [('og:type','article' if path in by_path else 'website'),('og:locale','it_IT'),('og:site_name','LFBR'),('og:title',title),('og:description',desc),('og:url',url),('og:image',BASE+'social-card.png'),('og:image:width','1200'),('og:image:height','630'),('og:image:alt','LFBR — Tecnologia e cultura pop'),('twitter:card','summary_large_image'),('twitter:title',title),('twitter:description',desc),('twitter:image',BASE+'social-card.png')]:
            meta+='<meta '+('name' if name.startswith('twitter:') else 'property')+'="'+name+'" content="'+html.escape(value,quote=True)+'">\n'
        schemas=[]
        if path in by_path:
            a=by_path[path]; body=match(r'<article class="article-body">(.*?)</article>',src)
            words=len(text(body).split()); minutes=max(1,(words+199)//200)
            # Remove only generated components; preserve the existing article body and ad integration.
            src=re.sub(r'<!-- lfbr:enhancements -->.*?<!-- /lfbr:enhancements -->','',src,flags=re.S)
            src=re.sub(r'<!-- lfbr:related -->.*?<!-- /lfbr:related -->','',src,flags=re.S)
            src=re.sub(r'<nav class="breadcrumbs"[^>]*>.*?</nav>','',src,flags=re.S)
            src=re.sub(r'<span[^>]*>\d+ min(?: di lettura)?</span>','',src)
            src=src.replace('<div class="article-meta">','<div class="article-meta"><span>'+str(minutes)+' min di lettura</span>',1)
            crumbs=[{'@type':'ListItem','position':1,'name':'Home','item':BASE},{'@type':'ListItem','position':2,'name':a['categoryLabel'],'item':BASE+a['categoryUrl']},{'@type':'ListItem','position':3,'name':a['title'],'item':url}]
            breadcrumb='<nav class="breadcrumbs" aria-label="Percorso"><ol><li><a href="../index.html">Home</a></li><li><a href="../'+a['categoryUrl']+'">'+html.escape(a['categoryLabel'])+'</a></li><li aria-current="page">'+html.escape(a['title'])+'</li></ol></nav>'
            src=re.sub(r'(<main class="article-wrap[^"]*">)',lambda m:m[1]+breadcrumb,src,count=1)
            # Existing h2 headings receive stable IDs, with an index only for substantial articles.
            headings=[]
            def heading(m):
                label=text(m[2]); ident=match(r'id="([^"]+)"',m[1]) or 'sezione-'+str(len(headings)+1)
                headings.append((ident,label)); attrs=m[1] if 'id=' in m[1] else m[1]+' id="'+ident+'"'
                return '<h2'+attrs+'>'+m[2]+'</h2>'
            body=re.sub(r'<h2([^>]*)>(.*?)</h2>',heading,body,flags=re.S)
            src=re.sub(r'(<article class="article-body">).*?(</article>)',lambda m:m[1]+body+m[2],src,count=1,flags=re.S)
            intro=text(match(r'<p class="article-intro">(.*?)</p>',src))
            enhancements='<!-- lfbr:enhancements --><aside class="brief-box" aria-labelledby="briefTitle"><h2 id="briefTitle">In breve</h2><p>'+html.escape(intro)+'</p></aside>'
            if words>=300 and len(headings)>=4:
                enhancements+='<nav class="article-toc" aria-label="Indice dei contenuti"><h2>In questo articolo</h2><ol>'+''.join('<li><a href="#'+i+'">'+html.escape(t)+'</a></li>' for i,t in headings)+'</ol></nav>'
            enhancements+='<!-- /lfbr:enhancements -->'
            src=src.replace('<article class="article-body">',enhancements+'<article class="article-body">',1)
            related=sorted([x for x in catalog if x['url']!=path and x['category']==a['category']],key=lambda x:(x['topic']==a['topic'],bool(x['datePublished'])),reverse=True)[:3]
            tail='<!-- lfbr:related --><section class="article-related" aria-labelledby="relatedTitle"><h2 id="relatedTitle">Potrebbe interessarti</h2><div class="story-grid">'+''.join(card(x,'../') for x in related)+'</div></section>'
            dated=recent
            if a in dated:
                n=dated.index(a); nav=[]
                if n+1<len(dated): nav.append('<a rel="prev" href="../'+dated[n+1]['url']+'">Precedente: '+html.escape(dated[n+1]['title'])+'</a>')
                if n>0: nav.append('<a rel="next" href="../'+dated[n-1]['url']+'">Successivo: '+html.escape(dated[n-1]['title'])+'</a>')
                if nav: tail+='<nav class="article-pagination" aria-label="Altre notizie LFBR">'+''.join(nav)+'</nav>'
            tail+='<!-- /lfbr:related -->';src=src.replace('</main>',tail+'</main>',1)
            schema={'@context':'https://schema.org','@type':'NewsArticle' if a['datePublished'] else 'Article','headline':a['title'],'description':a['description'],'mainEntityOfPage':url,'url':url,'image':BASE+'social-card.png','publisher':publisher,'author':{'@type':'Organization','name':'Redazione LFBR','url':BASE+'chi-siamo.html'},'articleSection':a['categoryLabel'],'inLanguage':'it-IT','wordCount':words,'timeRequired':'PT'+str(minutes)+'M'}
            for key in ['datePublished','dateModified']:
                if a[key]: schema[key]=a[key]
            if a['datePublished']: meta+='<meta property="article:published_time" content="'+a['datePublished']+'">\n'
            if a['dateModified']: meta+='<meta property="article:modified_time" content="'+a['dateModified']+'">\n'
            schemas=[schema,{'@context':'https://schema.org','@type':'BreadcrumbList','itemListElement':crumbs}]
        else:
            schemas=[{'@context':'https://schema.org','@type':'WebSite' if path=='index.html' else 'CollectionPage' if path.startswith('categorie/') or path=='ultimi.html' else 'WebPage','name':title,'description':desc,'url':url,'publisher':publisher,'inLanguage':'it-IT'}]
        meta+=''.join('<script type="application/ld+json">'+json.dumps(s,ensure_ascii=False).replace('</','<\\/')+'</script>\n' for s in schemas)
        meta+='<script defer src="'+prefix+'script.js"></script>\n'
        src=src.replace('</head>',meta+'</head>',1)
        # Shared magazine header with a working non-JS search fallback.
        new_header='<header class="topbar"><a class="brand" href="'+prefix+'index.html"><span class="brand-mark">L</span><span>LFBR<small>magazine</small></span></a><nav aria-label="Navigazione principale"><a href="'+prefix+'ultimi.html">Ultimi</a><a href="'+prefix+'index.html#scopri">Scopri</a><a href="'+prefix+'index.html#categorie">Sezioni</a><a href="'+prefix+'index.html#articoli">Archivio</a><a href="'+prefix+'chi-siamo.html">About</a></nav><a class="nav-search" href="'+prefix+'index.html#articoli" aria-label="Cerca in LFBR"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg></a></header>'
        src=re.sub(r'<header class="topbar">.*?</header>',lambda m:new_header,src,count=1,flags=re.S)
        src=re.sub(r'<a href="(?:\.\./)?(?:ultimi.html|feed.xml)">(?:Ultimi articoli|RSS)</a>','',src)
        src=src.replace('<div class="footer-links">','<div class="footer-links"><a href="'+prefix+'ultimi.html">Ultimi articoli</a><a href="'+prefix+'feed.xml">RSS</a>',1)
        write(path,src)
    ns='http://www.sitemaps.org/schemas/sitemap/0.9';ET.register_namespace('',ns)
    tree=ET.fromstring(read('sitemap.xml')); locations={x.find('{'+ns+'}loc').text for x in tree}
    if BASE+'ultimi.html' not in locations:
        el=ET.SubElement(tree,'{'+ns+'}url');ET.SubElement(el,'{'+ns+'}loc').text=BASE+'ultimi.html'
    for el in tree:
        loc=el.find('{'+ns+'}loc').text; a=by_path.get(loc.replace(BASE,''))
        date=a['dateModified'] or a['datePublished'] if a else updated
        if date:
            old=el.find('{'+ns+'}lastmod')
            if old is None: old=ET.SubElement(el,'{'+ns+'}lastmod')
            old.text=date
    write('sitemap.xml','<?xml version="1.0" encoding="UTF-8"?>\n'+ET.tostring(tree,encoding='unicode')+'\n')
    rss=ET.Element('rss',{'version':'2.0','xmlns:atom':'http://www.w3.org/2005/Atom'});ch=ET.SubElement(rss,'channel')
    for k,v in [('title','LFBR — Ultimi articoli'),('link',BASE),('description','Tecnologia e cultura pop, spiegate bene.'),('language','it-it')]: ET.SubElement(ch,k).text=v
    ET.SubElement(ch,'atom:link',{'href':BASE+'feed.xml','rel':'self','type':'application/rss+xml'})
    for a in recent[:30]:
        item=ET.SubElement(ch,'item')
        for k,v in [('title',a['title']),('link',BASE+a['url']),('description',a['description']),('category',a['categoryLabel']),('pubDate',format_datetime(datetime.fromisoformat(a['datePublished']+'T00:00:00+02:00')))]:ET.SubElement(item,k).text=v
        ET.SubElement(item,'guid',{'isPermaLink':'true'}).text=BASE+a['url']
    write('feed.xml','<?xml version="1.0" encoding="UTF-8"?>\n'+ET.tostring(rss,encoding='unicode')+'\n')
    print('Built',len(catalog),'articles;',len(recent),'dated news')
if __name__=='__main__':
    import argparse
    parser=argparse.ArgumentParser(description='Regenerate LFBR magazine components from the archive and articles.')
    parser.add_argument('--updated',default=datetime.now().date().isoformat(),help='Date of this content update, YYYY-MM-DD')
    args=parser.parse_args()
    datetime.fromisoformat(args.updated)
    build(args.updated)
