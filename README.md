# lfbr.it

Magazine statico indipendente pubblicato con GitHub Pages, dominio https://lfbr.it.

## Componenti editoriali

- `index.html` contiene l'archivio completo e i filtri originali.
- `articles.json` alimenta la ricerca globale. È generato dall'archivio e dalle pagine articolo.
- `ultimi.html` raccoglie solo articoli con `datePublished` nota, per data decrescente. Mostra 12 articoli alla volta; senza JavaScript rimangono tutti leggibili.
- `feed.xml` include le ultime 30 pubblicazioni con data nota.
- Il generatore applica breadcrumb, tempo di lettura (200 parole/minuto), In breve, correlati e metadati a tutti gli articoli. L'indice compare da 300 parole e quattro sezioni. Precedente/successivo segue l'elenco delle notizie datate; a parità di data l'ordine degli URL è deterministico.
- Le guide senza data nota rimangono nell'archivio; non viene inventata una data di pubblicazione.
- Favicon SVG e immagine social PNG sono presenti nel repository. `social-card.svg` è il sorgente della copertina condivisa.

## Aggiornamento manuale

1. Partire dall'ultima `main` e rileggere i file da modificare.
2. Aggiungere l'articolo e la sua card all'archivio di `index.html`, con `data-category` e `data-topic`. Per le notizie aggiungere `datePublished` (e `dateModified` se nota) allo schema JSON-LD. Non duplicare gli URL.
3. Aggiungere il nuovo URL alla sitemap. Mantenere il codice AdSense nella nuova pagina.
4. Eseguire `python tools/build_site.py --updated YYYY-MM-DD` con la data effettiva della modifica. Il generatore non scrive alle automazioni editoriali.
5. Eseguire `python tools/validate_site.py` e `node --check script.js`.
6. Controllare layout e comportamento nel browser, compreso mobile.

Il generatore usa solo la libreria standard di Python. Rilegge ogni file esistente immediatamente prima di scriverlo. Mantiene testo degli articoli, fonti, AdSense, contenuto privacy/cookie e `ads.txt`. I componenti sono HTML statico, la ricerca e la paginazione sono in `script.js`.

`lastmod` degli articoli usa `dateModified` o `datePublished` quando disponibili; le pagine di navigazione usano la data passata a `--updated`. Le guide con date ignote non ricevono date editoriali inventate.
