"""Static invariants for the magazine output. Run after build_site.py."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
import json,re,xml.etree.ElementTree as ET
ROOT=Path(__file__).resolve().parents[1]
class Page(HTMLParser):
    def __init__(self,s):
        super().__init__();self.ids=[];self.links=[];self.meta=[];self.feed(s)
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if 'id' in a:self.ids.append(a['id'])
        if tag in ('a','link','script','img'):
            target=a.get('href',a.get('src',''))
            if target:self.links.append(target)
        if tag=='meta':self.meta.append(a)

def validate():
    catalog=json.loads((ROOT/'articles.json').read_text(encoding='utf-8'))
    assert len(catalog)==len({a['url'] for a in catalog})
    pages={p.relative_to(ROOT).as_posix():Page(p.read_text(encoding='utf-8')) for p in ROOT.rglob('*.html')}
    assert set(a['url'] for a in catalog)=={p for p in pages if p.startswith('articoli/')}
    news=[a for a in catalog if a['datePublished']]
    assert sum(a['datePublished']=='2026-10-04' for a in news)==5
    for path,page in pages.items():
        assert len(page.ids)==len(set(page.ids)),('duplicate ID',path)
        src=(ROOT/path).read_text(encoding='utf-8')
        assert src.count('class="nav-search"')==1,path
        assert len(re.findall(r'src="(?:\.\./)?script.js"',src))==1,path
        assert src.count('ca-pub-5244616248346330')==1,path
        assert len(re.findall(r'rel="canonical"',src))==1,path
        for key in ['og:title','og:description','og:url','og:image','twitter:card','theme-color']:
            assert len([a for a in page.meta if a.get('property',a.get('name'))==key])==1,(path,key)
        for target in page.links:
            u=urlsplit(target)
            if u.scheme or u.netloc:continue
            dest=(ROOT/path).parent.joinpath(unquote(u.path)).resolve() if u.path else ROOT/path
            assert dest.exists(),(path,target)
            if u.fragment and dest.suffix=='.html':
                dp=pages[dest.relative_to(ROOT).as_posix()]
                assert unquote(u.fragment) in dp.ids,('missing anchor',path,target)
        for raw in re.findall(r'<script type="application/ld\+json">(.*?)</script>',src,re.S):json.loads(raw)
        if path.startswith('articoli/'):
            assert src.count('class="breadcrumbs"')==1,path
            assert src.count('id="briefTitle"')==1,path
            assert src.count('id="relatedTitle"')==1,path
            assert 'min di lettura' in src,path
    rss=ET.parse(ROOT/'feed.xml');items=rss.findall('./channel/item')
    assert len(items)==len(news[:30])
    assert len({i.findtext('guid') for i in items})==len(items)
    sitemap=ET.parse(ROOT/'sitemap.xml');ns={'s':'http://www.sitemaps.org/schemas/sitemap/0.9'}
    locs=[x.text for x in sitemap.findall('.//s:loc',ns)]
    assert len(locs)==len(set(locs))==len(pages)
    assert 'https://lfbr.it/ultimi.html' in locs
    manifest=json.loads((ROOT/'site.webmanifest').read_text(encoding='utf-8-sig'))
    for icon in manifest['icons']:assert ROOT.joinpath(icon['src'].lstrip('/')).exists()
    assert (ROOT/'social-card.png').read_bytes().startswith(b'\x89PNG')
    print(f'PASS: {len(pages)} pages, {len(catalog)} articles, {len(news)} dated news; links, anchors, metadata, RSS, sitemap, IDs and assets')
if __name__=='__main__':validate()
