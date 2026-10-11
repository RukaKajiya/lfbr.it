window.LFBR_TRAVEL_DATA = {
  interests: [
    {id:"culture", label:"Storia & cultura", icon:"🏛️"},
    {id:"food", label:"Cibo", icon:"🍜"},
    {id:"nature", label:"Natura", icon:"🌿"},
    {id:"museums", label:"Musei", icon:"🖼️"},
    {id:"technology", label:"Tecnologia", icon:"💻"},
    {id:"anime", label:"Anime & manga", icon:"🎌"},
    {id:"shopping", label:"Shopping", icon:"🛍️"},
    {id:"nightlife", label:"Vita serale", icon:"🌙"},
    {id:"beach", label:"Mare", icon:"🌊"},
    {id:"photo", label:"Fotografia", icon:"📷"},
    {id:"unusual", label:"Luoghi insoliti", icon:"✨"},
    {id:"family", label:"Famiglia", icon:"👨‍👩‍👧"}
  ],
  destinations: [
    {
      id:"tokyo", name:"Tokyo", country:"Giappone", emoji:"🇯🇵",
      center:[35.6762,139.6503], avgDaily:190,
      pitch:"Metropoli perfetta per tecnologia, anime, quartieri diversi e cibo.",
      tags:["technology","anime","food","shopping","nightlife","culture","unusual"],
      places:[
        {name:"Sensō-ji e Asakusa", district:"Asakusa", lat:35.7148,lng:139.7967,category:"culture",duration:90,cost:0,tags:["culture","photo","family"],desc:"Tempio storico e passeggiata nel quartiere tradizionale."},
        {name:"Akihabara", district:"Chiyoda", lat:35.6984,lng:139.7730,category:"anime",duration:150,cost:10,tags:["anime","technology","shopping","unusual"],desc:"Elettronica, videogiochi, manga e cultura pop."},
        {name:"teamLab Borderless", district:"Azabudai", lat:35.6605,lng:139.7406,category:"museums",duration:120,cost:30,tags:["museums","technology","photo","unusual","family"],desc:"Installazioni digitali immersive e interattive."},
        {name:"Shibuya Crossing & Sky", district:"Shibuya", lat:35.6595,lng:139.7005,category:"photo",duration:120,cost:16,tags:["photo","shopping","nightlife","unusual"],desc:"Il volto più iconico della Tokyo contemporanea."},
        {name:"Meiji Jingu", district:"Shibuya", lat:35.6764,lng:139.6993,category:"nature",duration:90,cost:0,tags:["nature","culture","family"],desc:"Santuario immerso nel verde nel cuore della città."},
        {name:"Toyosu & mercato del pesce", district:"Koto", lat:35.6456,lng:139.7856,category:"food",duration:120,cost:20,tags:["food","culture","unusual"],desc:"Colazione o pranzo tra sushi e prodotti del mercato."},
        {name:"Odaiba", district:"Tokyo Bay", lat:35.6251,lng:139.7754,category:"technology",duration:150,cost:10,tags:["technology","shopping","family","photo"],desc:"Baia, centri commerciali, robotica e skyline."},
        {name:"Shinjuku Golden Gai", district:"Shinjuku", lat:35.6940,lng:139.7046,category:"nightlife",duration:120,cost:25,tags:["nightlife","food","unusual"],desc:"Piccoli locali e atmosfera serale unica."}
      ]
    },
    {
      id:"kyoto", name:"Kyoto", country:"Giappone", emoji:"🇯🇵",
      center:[35.0116,135.7681], avgDaily:150,
      pitch:"Templi, quartieri storici, natura e ritmi più tranquilli.",
      tags:["culture","nature","food","photo","family"],
      places:[
        {name:"Fushimi Inari Taisha", district:"Fushimi",lat:34.9671,lng:135.7727,category:"culture",duration:150,cost:0,tags:["culture","nature","photo"],desc:"Migliaia di torii rossi lungo il sentiero del monte Inari."},
        {name:"Kiyomizu-dera",district:"Higashiyama",lat:34.9949,lng:135.7850,category:"culture",duration:120,cost:4,tags:["culture","photo","family"],desc:"Tempio panoramico e stradine storiche."},
        {name:"Arashiyama Bamboo Grove",district:"Arashiyama",lat:35.0170,lng:135.6713,category:"nature",duration:120,cost:0,tags:["nature","photo","family"],desc:"Bosco di bambù e passeggiate lungo il fiume."},
        {name:"Kinkaku-ji",district:"Kita",lat:35.0394,lng:135.7292,category:"culture",duration:90,cost:4,tags:["culture","photo"],desc:"Il celebre Padiglione d'Oro sul lago."},
        {name:"Mercato Nishiki",district:"Nakagyo",lat:35.0050,lng:135.7649,category:"food",duration:120,cost:20,tags:["food","culture","shopping"],desc:"Assaggi locali, ingredienti e specialità di Kyoto."},
        {name:"Gion",district:"Higashiyama",lat:35.0037,lng:135.7751,category:"culture",duration:120,cost:0,tags:["culture","photo","food"],desc:"Vicoli storici, machiya e atmosfera tradizionale."},
        {name:"Philosopher's Path",district:"Sakyo",lat:35.0267,lng:135.7982,category:"nature",duration:90,cost:0,tags:["nature","photo","family"],desc:"Passeggiata rilassante lungo un canale alberato."}
      ]
    },
    {
      id:"seoul", name:"Seoul", country:"Corea del Sud", emoji:"🇰🇷",
      center:[37.5665,126.9780], avgDaily:145,
      pitch:"Design, K-culture, quartieri creativi, street food e tecnologia.",
      tags:["technology","food","shopping","nightlife","culture","unusual","photo"],
      places:[
        {name:"Gyeongbokgung Palace",district:"Jongno",lat:37.5796,lng:126.9770,category:"culture",duration:120,cost:3,tags:["culture","photo","family"],desc:"Palazzo reale e architettura della dinastia Joseon."},
        {name:"Bukchon Hanok Village",district:"Jongno",lat:37.5826,lng:126.9831,category:"culture",duration:90,cost:0,tags:["culture","photo"],desc:"Quartiere tradizionale con case hanok."},
        {name:"Hongdae",district:"Mapo",lat:37.5563,lng:126.9236,category:"nightlife",duration:150,cost:20,tags:["nightlife","shopping","food","unusual"],desc:"Musica, café, negozi indipendenti e vita serale."},
        {name:"Starfield Library",district:"Gangnam",lat:37.5117,lng:127.0592,category:"unusual",duration:75,cost:0,tags:["unusual","photo","shopping"],desc:"Biblioteca scenografica dentro COEX."},
        {name:"Dongdaemun Design Plaza",district:"Jung",lat:37.5665,lng:127.0092,category:"technology",duration:120,cost:5,tags:["technology","photo","shopping","unusual"],desc:"Architettura futuristica, design ed eventi."},
        {name:"Gwangjang Market",district:"Jongno",lat:37.5700,lng:126.9990,category:"food",duration:120,cost:18,tags:["food","culture","unusual"],desc:"Uno dei mercati storici più famosi per lo street food."},
        {name:"N Seoul Tower",district:"Yongsan",lat:37.5512,lng:126.9882,category:"photo",duration:120,cost:14,tags:["photo","family","nightlife"],desc:"Panorama sulla città e passeggiata sul Namsan."}
      ]
    },
    {
      id:"barcelona", name:"Barcellona", country:"Spagna", emoji:"🇪🇸",
      center:[41.3874,2.1686], avgDaily:135,
      pitch:"Architettura, tapas, mare, quartieri vivi e passeggiate.",
      tags:["culture","food","beach","nightlife","photo","shopping"],
      places:[
        {name:"Sagrada Família",district:"Eixample",lat:41.4036,lng:2.1744,category:"culture",duration:120,cost:28,tags:["culture","photo","museums"],desc:"Capolavoro di Gaudí e simbolo della città."},
        {name:"Park Güell",district:"Gràcia",lat:41.4145,lng:2.1527,category:"culture",duration:120,cost:10,tags:["culture","nature","photo","family"],desc:"Mosaici, architettura e viste panoramiche."},
        {name:"Mercat de la Boqueria",district:"Raval",lat:41.3818,lng:2.1715,category:"food",duration:90,cost:20,tags:["food","culture"],desc:"Mercato storico ideale per assaggi e prodotti locali."},
        {name:"Barceloneta",district:"Ciutat Vella",lat:41.3763,lng:2.1899,category:"beach",duration:150,cost:0,tags:["beach","nature","family","food"],desc:"Spiaggia urbana, lungomare e ristoranti."},
        {name:"Barri Gòtic",district:"Ciutat Vella",lat:41.3839,lng:2.1763,category:"culture",duration:120,cost:0,tags:["culture","photo","shopping"],desc:"Vicoli medievali, piazze e botteghe."},
        {name:"Montjuïc",district:"Sants-Montjuïc",lat:41.3638,lng:2.1589,category:"nature",duration:150,cost:8,tags:["nature","museums","photo","family"],desc:"Giardini, musei e punti panoramici."},
        {name:"El Born",district:"Ciutat Vella",lat:41.3852,lng:2.1834,category:"nightlife",duration:120,cost:25,tags:["nightlife","food","shopping","culture"],desc:"Tapas, locali e atmosfera serale."}
      ]
    },
    {
      id:"lisbon", name:"Lisbona", country:"Portogallo", emoji:"🇵🇹",
      center:[38.7223,-9.1393], avgDaily:110,
      pitch:"Panorami, quartieri storici, cucina e gite facili nei dintorni.",
      tags:["culture","food","photo","nightlife","beach","unusual"],
      places:[
        {name:"Alfama",district:"Alfama",lat:38.7110,lng:-9.1295,category:"culture",duration:120,cost:0,tags:["culture","photo","food"],desc:"Salite, vicoli, miradouros e atmosfera storica."},
        {name:"Belém & Jerónimos",district:"Belém",lat:38.6978,lng:-9.2065,category:"culture",duration:150,cost:15,tags:["culture","food","photo","family"],desc:"Monumenti sul Tago e pastéis de nata."},
        {name:"LX Factory",district:"Alcântara",lat:38.7038,lng:-9.1784,category:"unusual",duration:120,cost:0,tags:["unusual","shopping","food","photo"],desc:"Spazi creativi, negozi e ristoranti in area industriale."},
        {name:"Time Out Market",district:"Cais do Sodré",lat:38.7071,lng:-9.1466,category:"food",duration:120,cost:22,tags:["food","nightlife"],desc:"Molte cucine portoghesi in un unico mercato."},
        {name:"Miradouro da Senhora",district:"Graça",lat:38.7191,lng:-9.1328,category:"photo",duration:60,cost:0,tags:["photo","nature"],desc:"Uno dei panorami più belli sulla città."},
        {name:"Oceanário de Lisboa",district:"Parque das Nações",lat:38.7636,lng:-9.0937,category:"family",duration:150,cost:25,tags:["family","nature","museums"],desc:"Grande acquario moderno, perfetto anche con bambini."},
        {name:"Bairro Alto",district:"Bairro Alto",lat:38.7130,lng:-9.1449,category:"nightlife",duration:120,cost:20,tags:["nightlife","food","unusual"],desc:"Bar, ristoranti e strade animate la sera."}
      ]
    },
    {
      id:"rome", name:"Roma", country:"Italia", emoji:"🇮🇹",
      center:[41.9028,12.4964], avgDaily:125,
      pitch:"Storia, arte, cucina e quartieri da esplorare a piedi.",
      tags:["culture","food","museums","photo","family"],
      places:[
        {name:"Colosseo & Fori Imperiali",district:"Centro",lat:41.8902,lng:12.4922,category:"culture",duration:180,cost:18,tags:["culture","museums","photo","family"],desc:"Il cuore archeologico della Roma antica."},
        {name:"Pantheon & Piazza Navona",district:"Centro",lat:41.8986,lng:12.4769,category:"culture",duration:120,cost:5,tags:["culture","photo","food"],desc:"Architettura, piazze e passeggiata nel centro storico."},
        {name:"Musei Vaticani",district:"Vaticano",lat:41.9065,lng:12.4536,category:"museums",duration:210,cost:22,tags:["museums","culture","photo"],desc:"Collezioni d'arte e Cappella Sistina."},
        {name:"Trastevere",district:"Trastevere",lat:41.8897,lng:12.4709,category:"food",duration:150,cost:25,tags:["food","nightlife","culture"],desc:"Trattorie, vicoli e atmosfera serale."},
        {name:"Villa Borghese",district:"Pinciano",lat:41.9142,lng:12.4921,category:"nature",duration:120,cost:0,tags:["nature","family","photo"],desc:"Grande parco urbano ideale per una pausa."},
        {name:"Centrale Montemartini",district:"Ostiense",lat:41.8674,lng:12.4783,category:"unusual",duration:100,cost:11,tags:["unusual","museums","technology","culture"],desc:"Statue classiche esposte tra vecchi macchinari industriali."},
        {name:"Testaccio",district:"Testaccio",lat:41.8757,lng:12.4750,category:"food",duration:120,cost:22,tags:["food","culture","unusual"],desc:"Mercato e cucina romana lontano dai percorsi più turistici."}
      ]
    },
    {
      id:"london", name:"Londra", country:"Regno Unito", emoji:"🇬🇧",
      center:[51.5072,-0.1276], avgDaily:200,
      pitch:"Musei, quartieri, musical, mercati e cultura pop.",
      tags:["museums","culture","shopping","food","nightlife","unusual","family"],
      places:[
        {name:"British Museum",district:"Bloomsbury",lat:51.5194,lng:-0.1270,category:"museums",duration:180,cost:0,tags:["museums","culture","family"],desc:"Una delle collezioni storiche più importanti al mondo."},
        {name:"Camden Market",district:"Camden",lat:51.5416,lng:-0.1469,category:"shopping",duration:150,cost:15,tags:["shopping","food","unusual"],desc:"Street food, moda alternativa e mercati."},
        {name:"South Bank",district:"Southwark",lat:51.5055,lng:-0.1160,category:"photo",duration:120,cost:0,tags:["photo","culture","family"],desc:"Passeggiata sul Tamigi tra arte e skyline."},
        {name:"Science Museum",district:"South Kensington",lat:51.4978,lng:-0.1745,category:"technology",duration:150,cost:0,tags:["technology","museums","family"],desc:"Scienza, tecnologia e mostre interattive."},
        {name:"Borough Market",district:"Southwark",lat:51.5055,lng:-0.0910,category:"food",duration:120,cost:25,tags:["food","culture"],desc:"Mercato storico per assaggi e cucina internazionale."},
        {name:"Shoreditch",district:"East London",lat:51.5245,lng:-0.0785,category:"unusual",duration:150,cost:20,tags:["unusual","nightlife","shopping","photo"],desc:"Street art, design, café e locali."},
        {name:"West End",district:"Soho",lat:51.5115,lng:-0.1281,category:"nightlife",duration:180,cost:45,tags:["nightlife","culture","food"],desc:"Teatri, musical e serata nel centro."}
      ]
    },
    {
      id:"singapore", name:"Singapore", country:"Singapore", emoji:"🇸🇬",
      center:[1.3521,103.8198], avgDaily:170,
      pitch:"Architettura futuristica, food court, giardini e multiculturalità.",
      tags:["technology","food","nature","family","photo","shopping","unusual"],
      places:[
        {name:"Gardens by the Bay",district:"Marina Bay",lat:1.2816,lng:103.8636,category:"nature",duration:150,cost:20,tags:["nature","technology","photo","family"],desc:"Supertree, serre futuristiche e spettacoli serali."},
        {name:"Marina Bay Sands",district:"Marina Bay",lat:1.2834,lng:103.8607,category:"photo",duration:120,cost:25,tags:["photo","shopping","technology"],desc:"Skyline, centro commerciale e vista sulla baia."},
        {name:"Hawker Centre Maxwell",district:"Chinatown",lat:1.2803,lng:103.8442,category:"food",duration:90,cost:12,tags:["food","culture"],desc:"Cucina locale economica in stile hawker."},
        {name:"Chinatown",district:"Outram",lat:1.2837,lng:103.8437,category:"culture",duration:120,cost:0,tags:["culture","food","shopping"],desc:"Templi, mercati e storia multiculturale."},
        {name:"ArtScience Museum",district:"Marina Bay",lat:1.2863,lng:103.8593,category:"museums",duration:120,cost:22,tags:["museums","technology","photo","family"],desc:"Mostre tra arte, scienza e digitale."},
        {name:"Jewel Changi",district:"Changi",lat:1.3602,lng:103.9897,category:"unusual",duration:120,cost:0,tags:["unusual","technology","shopping","family"],desc:"Cascata indoor, giardini e architettura aeroportuale."},
        {name:"Kampong Glam",district:"Rochor",lat:1.3020,lng:103.8590,category:"culture",duration:120,cost:15,tags:["culture","food","photo","shopping"],desc:"Moschea, street art, boutique e cucina."}
      ]
    }
  ]
};