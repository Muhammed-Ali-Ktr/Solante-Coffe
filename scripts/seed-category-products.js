/**
 * Her kategoriye (eksikse) 3 ürün ekler; tüm ürünlere alerjen ve besin değeri yazar.
 * Kullanım: node scripts/seed-category-products.js
 */

const path = require('path');
const dbModule = require('../server/models/database');

const slugify = (name) =>
  name
    .toLowerCase()
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/** Kategori slug → 3 ürün tanımı */
const PRODUCTS_BY_CATEGORY_SLUG = {
  kahvalti: [
    {
      name: 'Sucuklu Yumurta',
      description: 'Dana sucuk, yumurta ve taze baharatlarla servis edilir.',
      price: 145,
      preparation_time: 12,
      allergens: ['Yumurta', 'Gluten'],
      nutrition: [
        { nutrient_name: 'Enerji', nutrient_value: '420', unit: 'kcal', portion_size: '1 porsiyon' },
        { nutrient_name: 'Protein', nutrient_value: '22', unit: 'g', portion_size: '1 porsiyon' },
        { nutrient_name: 'Yağ', nutrient_value: '32', unit: 'g', portion_size: '1 porsiyon' }
      ]
    },
    {
      name: 'Peynir Tabağı',
      description: 'Beyaz peynir, kaşar, tulum ve taze mevsim yeşillikleri.',
      price: 165,
      preparation_time: 5,
      allergens: ['Süt', 'Gluten'],
      nutrition: [
        { nutrient_name: 'Enerji', nutrient_value: '380', unit: 'kcal', portion_size: '1 porsiyon' },
        { nutrient_name: 'Protein', nutrient_value: '24', unit: 'g', portion_size: '1 porsiyon' },
        { nutrient_name: 'Karbonhidrat', nutrient_value: '8', unit: 'g', portion_size: '1 porsiyon' }
      ]
    },
    {
      name: 'Simit & Tereyağı',
      description: 'Günlük taze simit, tereyağı ve reçel çeşitleri.',
      price: 75,
      preparation_time: 3,
      allergens: ['Gluten', 'Süt', 'Susam'],
      nutrition: [
        { nutrient_name: 'Enerji', nutrient_value: '310', unit: 'kcal', portion_size: '1 adet' },
        { nutrient_name: 'Karbonhidrat', nutrient_value: '48', unit: 'g', portion_size: '1 adet' },
        { nutrient_name: 'Yağ', nutrient_value: '10', unit: 'g', portion_size: '1 adet' }
      ]
    }
  ],
  'ana-yemekler': [
    {
      name: 'Kuzu Tandır',
      description: 'Uzun süre pişirilmiş kuzu eti, pilav ve közlenmiş sebzeler.',
      price: 385,
      preparation_time: 25,
      allergens: [],
      nutrition: [
        { nutrient_name: 'Enerji', nutrient_value: '620', unit: 'kcal', portion_size: '1 porsiyon' },
        { nutrient_name: 'Protein', nutrient_value: '42', unit: 'g', portion_size: '1 porsiyon' },
        { nutrient_name: 'Yağ', nutrient_value: '28', unit: 'g', portion_size: '1 porsiyon' }
      ]
    },
    {
      name: 'Mantı',
      description: 'El açması mantı, sarımsaklı yoğurt ve domates sosu.',
      price: 195,
      preparation_time: 18,
      allergens: ['Gluten', 'Süt', 'Yumurta'],
      nutrition: [
        { nutrient_name: 'Enerji', nutrient_value: '480', unit: 'kcal', portion_size: '1 porsiyon' },
        { nutrient_name: 'Protein', nutrient_value: '18', unit: 'g', portion_size: '1 porsiyon' },
        { nutrient_name: 'Karbonhidrat', nutrient_value: '62', unit: 'g', portion_size: '1 porsiyon' }
      ]
    },
    {
      name: 'Sebzeli Güveç',
      description: 'Mevsim sebzeleri, zeytinyağı ve baharatlarla fırında.',
      price: 175,
      preparation_time: 20,
      allergens: [],
      nutrition: [
        { nutrient_name: 'Enerji', nutrient_value: '290', unit: 'kcal', portion_size: '1 porsiyon' },
        { nutrient_name: 'Lif', nutrient_value: '9', unit: 'g', portion_size: '1 porsiyon' },
        { nutrient_name: 'Karbonhidrat', nutrient_value: '34', unit: 'g', portion_size: '1 porsiyon' }
      ]
    }
  ],
  tatlilar: [
    {
      name: 'Fırın Sütlaç',
      description: 'Fırında kızarmış üzeri, tarçınlı geleneksel sütlaç.',
      price: 95,
      preparation_time: 5,
      allergens: ['Süt'],
      nutrition: [
        { nutrient_name: 'Enerji', nutrient_value: '280', unit: 'kcal', portion_size: '1 kase' },
        { nutrient_name: 'Karbonhidrat', nutrient_value: '42', unit: 'g', portion_size: '1 kase' },
        { nutrient_name: 'Protein', nutrient_value: '7', unit: 'g', portion_size: '1 kase' }
      ]
    },
    {
      name: 'Künefe',
      description: 'Sıcak künefe, kaymak ve şerbet ile servis.',
      price: 165,
      preparation_time: 12,
      allergens: ['Gluten', 'Süt', 'Kuruyemiş'],
      nutrition: [
        { nutrient_name: 'Enerji', nutrient_value: '520', unit: 'kcal', portion_size: '1 porsiyon' },
        { nutrient_name: 'Yağ', nutrient_value: '28', unit: 'g', portion_size: '1 porsiyon' },
        { nutrient_name: 'Karbonhidrat', nutrient_value: '58', unit: 'g', portion_size: '1 porsiyon' }
      ]
    },
    {
      name: 'Dondurmalı Profiterol',
      description: 'Çikolata soslu profiterol ve vanilyalı dondurma.',
      price: 135,
      preparation_time: 6,
      allergens: ['Gluten', 'Süt', 'Yumurta'],
      nutrition: [
        { nutrient_name: 'Enerji', nutrient_value: '410', unit: 'kcal', portion_size: '1 porsiyon' },
        { nutrient_name: 'Karbonhidrat', nutrient_value: '46', unit: 'g', portion_size: '1 porsiyon' },
        { nutrient_name: 'Yağ', nutrient_value: '18', unit: 'g', portion_size: '1 porsiyon' }
      ]
    }
  ],
  icecekler: [
    {
      name: 'Ev Yapımı Limonata',
      description: 'Taze limon, nane ve buz ile.',
      price: 65,
      preparation_time: 4,
      allergens: [],
      nutrition: [
        { nutrient_name: 'Enerji', nutrient_value: '85', unit: 'kcal', portion_size: '300 ml' },
        { nutrient_name: 'Karbonhidrat', nutrient_value: '21', unit: 'g', portion_size: '300 ml' }
      ]
    },
    {
      name: 'Berry Smoothie',
      description: 'Orman meyveli smoothie, yoğurt bazlı.',
      price: 95,
      preparation_time: 5,
      allergens: ['Süt'],
      nutrition: [
        { nutrient_name: 'Enerji', nutrient_value: '190', unit: 'kcal', portion_size: '350 ml' },
        { nutrient_name: 'Protein', nutrient_value: '6', unit: 'g', portion_size: '350 ml' },
        { nutrient_name: 'Karbonhidrat', nutrient_value: '32', unit: 'g', portion_size: '350 ml' }
      ]
    },
    {
      name: 'Sıcak Çikolata',
      description: 'Belçika çikolatası ve krema ile.',
      price: 85,
      preparation_time: 6,
      allergens: ['Süt'],
      nutrition: [
        { nutrient_name: 'Enerji', nutrient_value: '320', unit: 'kcal', portion_size: '250 ml' },
        { nutrient_name: 'Yağ', nutrient_value: '14', unit: 'g', portion_size: '250 ml' },
        { nutrient_name: 'Karbonhidrat', nutrient_value: '38', unit: 'g', portion_size: '250 ml' }
      ]
    }
  ],
  'ara-sicak': [
    {
      name: 'Sigara Böreği',
      description: 'Peynirli çıtır sigara böreği, yoğurt sos ile.',
      price: 95,
      preparation_time: 10,
      allergens: ['Gluten', 'Süt', 'Yumurta'],
      nutrition: [
        { nutrient_name: 'Enerji', nutrient_value: '340', unit: 'kcal', portion_size: '6 adet' },
        { nutrient_name: 'Protein', nutrient_value: '12', unit: 'g', portion_size: '6 adet' },
        { nutrient_name: 'Yağ', nutrient_value: '22', unit: 'g', portion_size: '6 adet' }
      ]
    },
    {
      name: 'Paçanga Böreği',
      description: 'Pastırma, kaşar ve köz biber dolgulu.',
      price: 115,
      preparation_time: 12,
      allergens: ['Gluten', 'Süt'],
      nutrition: [
        { nutrient_name: 'Enerji', nutrient_value: '420', unit: 'kcal', portion_size: '4 adet' },
        { nutrient_name: 'Protein', nutrient_value: '18', unit: 'g', portion_size: '4 adet' },
        { nutrient_name: 'Yağ', nutrient_value: '26', unit: 'g', portion_size: '4 adet' }
      ]
    },
    {
      name: 'Kızarmış Mantar',
      description: 'Közlenmiş mantar, sarımsak ve taze kekik.',
      price: 88,
      preparation_time: 14,
      allergens: [],
      nutrition: [
        { nutrient_name: 'Enerji', nutrient_value: '210', unit: 'kcal', portion_size: '1 porsiyon' },
        { nutrient_name: 'Lif', nutrient_value: '4', unit: 'g', portion_size: '1 porsiyon' },
        { nutrient_name: 'Protein', nutrient_value: '8', unit: 'g', portion_size: '1 porsiyon' }
      ]
    }
  ],
  borekler: [
    {
      name: 'Su Böreği',
      description: 'İnce yufka, beyaz peynir ve maydanoz.',
      price: 85,
      preparation_time: 8,
      allergens: ['Gluten', 'Süt', 'Yumurta'],
      nutrition: [
        { nutrient_name: 'Enerji', nutrient_value: '380', unit: 'kcal', portion_size: '2 dilim' },
        { nutrient_name: 'Karbonhidrat', nutrient_value: '42', unit: 'g', portion_size: '2 dilim' },
        { nutrient_name: 'Protein', nutrient_value: '14', unit: 'g', portion_size: '2 dilim' }
      ]
    },
    {
      name: 'Kol Böreği',
      description: 'Kıyma ve soğanlı geleneksel kol böreği.',
      price: 92,
      preparation_time: 9,
      allergens: ['Gluten', 'Yumurta'],
      nutrition: [
        { nutrient_name: 'Enerji', nutrient_value: '410', unit: 'kcal', portion_size: '2 dilim' },
        { nutrient_name: 'Protein', nutrient_value: '16', unit: 'g', portion_size: '2 dilim' },
        { nutrient_name: 'Yağ', nutrient_value: '24', unit: 'g', portion_size: '2 dilim' }
      ]
    },
    {
      name: 'Ispanaklı Börek',
      description: 'Taze ıspanak ve lor peyniri ile.',
      price: 88,
      preparation_time: 8,
      allergens: ['Gluten', 'Süt', 'Yumurta'],
      nutrition: [
        { nutrient_name: 'Enerji', nutrient_value: '350', unit: 'kcal', portion_size: '2 dilim' },
        { nutrient_name: 'Lif', nutrient_value: '5', unit: 'g', portion_size: '2 dilim' },
        { nutrient_name: 'Karbonhidrat', nutrient_value: '38', unit: 'g', portion_size: '2 dilim' }
      ]
    }
  ],
  kahveler: [
    {
      name: 'Espresso',
      description: 'Tek shot yoğun İtalyan espresso.',
      price: 55,
      preparation_time: 3,
      allergens: [],
      nutrition: [
        { nutrient_name: 'Enerji', nutrient_value: '5', unit: 'kcal', portion_size: '30 ml' },
        { nutrient_name: 'Kafein', nutrient_value: '64', unit: 'mg', portion_size: '30 ml' }
      ]
    },
    {
      name: 'Latte',
      description: 'Espresso ve buharla ısıtılmış süt.',
      price: 75,
      preparation_time: 5,
      allergens: ['Süt'],
      nutrition: [
        { nutrient_name: 'Enerji', nutrient_value: '150', unit: 'kcal', portion_size: '250 ml' },
        { nutrient_name: 'Protein', nutrient_value: '8', unit: 'g', portion_size: '250 ml' },
        { nutrient_name: 'Kafein', nutrient_value: '75', unit: 'mg', portion_size: '250 ml' }
      ]
    },
    {
      name: 'Filtre Kahve',
      description: 'Günlük çekilmiş çekirdek, V60 demleme.',
      price: 65,
      preparation_time: 6,
      allergens: [],
      nutrition: [
        { nutrient_name: 'Enerji', nutrient_value: '8', unit: 'kcal', portion_size: '200 ml' },
        { nutrient_name: 'Kafein', nutrient_value: '95', unit: 'mg', portion_size: '200 ml' }
      ]
    }
  ],
  sandvicler: [
    {
      name: 'Club Sandviç',
      description: 'Tavuk, marul, domates, yumurta ve özel sos.',
      price: 145,
      preparation_time: 10,
      allergens: ['Gluten', 'Yumurta', 'Süt'],
      nutrition: [
        { nutrient_name: 'Enerji', nutrient_value: '520', unit: 'kcal', portion_size: '1 adet' },
        { nutrient_name: 'Protein', nutrient_value: '28', unit: 'g', portion_size: '1 adet' },
        { nutrient_name: 'Karbonhidrat', nutrient_value: '48', unit: 'g', portion_size: '1 adet' }
      ]
    },
    {
      name: 'Ton Balıklı Sandviç',
      description: 'Ton balığı, marul, mısır ve limonlu sos.',
      price: 125,
      preparation_time: 8,
      allergens: ['Gluten', 'Balık', 'Yumurta'],
      nutrition: [
        { nutrient_name: 'Enerji', nutrient_value: '410', unit: 'kcal', portion_size: '1 adet' },
        { nutrient_name: 'Protein', nutrient_value: '24', unit: 'g', portion_size: '1 adet' },
        { nutrient_name: 'Yağ', nutrient_value: '16', unit: 'g', portion_size: '1 adet' }
      ]
    },
    {
      name: 'Vejetaryen Sandviç',
      description: 'Izgara sebze, humus ve roka.',
      price: 115,
      preparation_time: 9,
      allergens: ['Gluten', 'Susam'],
      nutrition: [
        { nutrient_name: 'Enerji', nutrient_value: '360', unit: 'kcal', portion_size: '1 adet' },
        { nutrient_name: 'Lif', nutrient_value: '8', unit: 'g', portion_size: '1 adet' },
        { nutrient_name: 'Karbonhidrat', nutrient_value: '44', unit: 'g', portion_size: '1 adet' }
      ]
    }
  ],
  tostlar: [
    {
      name: 'Kaşarlı Tost',
      description: 'Bol kaşar peyniri, tereyağlı ekmek.',
      price: 95,
      preparation_time: 6,
      allergens: ['Gluten', 'Süt'],
      nutrition: [
        { nutrient_name: 'Enerji', nutrient_value: '420', unit: 'kcal', portion_size: '1 adet' },
        { nutrient_name: 'Protein', nutrient_value: '18', unit: 'g', portion_size: '1 adet' },
        { nutrient_name: 'Yağ', nutrient_value: '22', unit: 'g', portion_size: '1 adet' }
      ]
    },
    {
      name: 'Karışık Tost',
      description: 'Kaşar, sucuk, sosis ve domates.',
      price: 115,
      preparation_time: 8,
      allergens: ['Gluten', 'Süt'],
      nutrition: [
        { nutrient_name: 'Enerji', nutrient_value: '510', unit: 'kcal', portion_size: '1 adet' },
        { nutrient_name: 'Protein', nutrient_value: '22', unit: 'g', portion_size: '1 adet' },
        { nutrient_name: 'Yağ', nutrient_value: '28', unit: 'g', portion_size: '1 adet' }
      ]
    },
    {
      name: 'Kavurmalı Tost',
      description: 'Özel dana kavurma ve kaşar ile.',
      price: 135,
      preparation_time: 9,
      allergens: ['Gluten', 'Süt'],
      nutrition: [
        { nutrient_name: 'Enerji', nutrient_value: '560', unit: 'kcal', portion_size: '1 adet' },
        { nutrient_name: 'Protein', nutrient_value: '26', unit: 'g', portion_size: '1 adet' },
        { nutrient_name: 'Yağ', nutrient_value: '32', unit: 'g', portion_size: '1 adet' }
      ]
    }
  ],
  tavuklar: [
    {
      name: 'Fırın Tavuk But',
      description: 'Baharatlı marine, fırında patates ile.',
      price: 195,
      preparation_time: 22,
      allergens: [],
      nutrition: [
        { nutrient_name: 'Enerji', nutrient_value: '480', unit: 'kcal', portion_size: '1 porsiyon' },
        { nutrient_name: 'Protein', nutrient_value: '38', unit: 'g', portion_size: '1 porsiyon' },
        { nutrient_name: 'Yağ', nutrient_value: '22', unit: 'g', portion_size: '1 porsiyon' }
      ]
    },
    {
      name: 'Tavuk Schnitzel',
      description: 'Panelenmiş tavuk göğsü, patates salatası.',
      price: 175,
      preparation_time: 15,
      allergens: ['Gluten', 'Yumurta'],
      nutrition: [
        { nutrient_name: 'Enerji', nutrient_value: '520', unit: 'kcal', portion_size: '1 porsiyon' },
        { nutrient_name: 'Protein', nutrient_value: '34', unit: 'g', portion_size: '1 porsiyon' },
        { nutrient_name: 'Karbonhidrat', nutrient_value: '38', unit: 'g', portion_size: '1 porsiyon' }
      ]
    },
    {
      name: 'Tavuk Fajita',
      description: 'Izgara tavuk şeritleri, biber ve tortilla.',
      price: 185,
      preparation_time: 14,
      allergens: ['Gluten'],
      nutrition: [
        { nutrient_name: 'Enerji', nutrient_value: '450', unit: 'kcal', portion_size: '1 porsiyon' },
        { nutrient_name: 'Protein', nutrient_value: '32', unit: 'g', portion_size: '1 porsiyon' },
        { nutrient_name: 'Lif', nutrient_value: '6', unit: 'g', portion_size: '1 porsiyon' }
      ]
    }
  ],
  salatalar: [
    {
      name: 'Çoban Salata',
      description: 'Domates, salatalık, biber, soğan, zeytinyağı.',
      price: 85,
      preparation_time: 5,
      allergens: [],
      nutrition: [
        { nutrient_name: 'Enerji', nutrient_value: '120', unit: 'kcal', portion_size: '1 kase' },
        { nutrient_name: 'Lif', nutrient_value: '4', unit: 'g', portion_size: '1 kase' },
        { nutrient_name: 'Karbonhidrat', nutrient_value: '12', unit: 'g', portion_size: '1 kase' }
      ]
    },
    {
      name: 'Tavuklu Sezar Salata',
      description: 'Izgara tavuk, marul, kruton ve parmesan.',
      price: 155,
      preparation_time: 10,
      allergens: ['Gluten', 'Süt', 'Yumurta'],
      nutrition: [
        { nutrient_name: 'Enerji', nutrient_value: '380', unit: 'kcal', portion_size: '1 kase' },
        { nutrient_name: 'Protein', nutrient_value: '28', unit: 'g', portion_size: '1 kase' },
        { nutrient_name: 'Yağ', nutrient_value: '22', unit: 'g', portion_size: '1 kase' }
      ]
    },
    {
      name: 'Akdeniz Salata',
      description: 'Yeşillik, zeytin, beyaz peynir ve nar ekşisi.',
      price: 98,
      preparation_time: 6,
      allergens: ['Süt'],
      nutrition: [
        { nutrient_name: 'Enerji', nutrient_value: '240', unit: 'kcal', portion_size: '1 kase' },
        { nutrient_name: 'Protein', nutrient_value: '10', unit: 'g', portion_size: '1 kase' },
        { nutrient_name: 'Yağ', nutrient_value: '18', unit: 'g', portion_size: '1 kase' }
      ]
    }
  ],
  izgaralar: [
    {
      name: 'Kuzu Pirzola',
      description: 'Marine kuzu pirzola, közlenmiş sebze garnisi.',
      price: 420,
      preparation_time: 28,
      allergens: [],
      nutrition: [
        { nutrient_name: 'Enerji', nutrient_value: '580', unit: 'kcal', portion_size: '250 g' },
        { nutrient_name: 'Protein', nutrient_value: '48', unit: 'g', portion_size: '250 g' },
        { nutrient_name: 'Yağ', nutrient_value: '38', unit: 'g', portion_size: '250 g' }
      ]
    },
    {
      name: 'Dana Bonfile',
      description: 'Izgara dana bonfile, trüflü patates püresi.',
      price: 485,
      preparation_time: 25,
      allergens: ['Süt'],
      nutrition: [
        { nutrient_name: 'Enerji', nutrient_value: '620', unit: 'kcal', portion_size: '220 g' },
        { nutrient_name: 'Protein', nutrient_value: '52', unit: 'g', portion_size: '220 g' },
        { nutrient_name: 'Yağ', nutrient_value: '34', unit: 'g', portion_size: '220 g' }
      ]
    },
    {
      name: 'Izgara Köfte Tabağı',
      description: 'El yapımı köfte, pilav ve köz biber.',
      price: 245,
      preparation_time: 18,
      allergens: ['Gluten'],
      nutrition: [
        { nutrient_name: 'Enerji', nutrient_value: '540', unit: 'kcal', portion_size: '1 porsiyon' },
        { nutrient_name: 'Protein', nutrient_value: '36', unit: 'g', portion_size: '1 porsiyon' },
        { nutrient_name: 'Karbonhidrat', nutrient_value: '42', unit: 'g', portion_size: '1 porsiyon' }
      ]
    }
  ]
};

/** Mevcut ürünler için varsayılan alerjen/besin (kategori slug’a göre) */
const DEFAULT_META_BY_SLUG = {
  kahvalti: {
    allergens: ['Yumurta', 'Süt'],
    nutrition: [
      { nutrient_name: 'Enerji', nutrient_value: '350', unit: 'kcal', portion_size: '1 porsiyon' },
      { nutrient_name: 'Protein', nutrient_value: '16', unit: 'g', portion_size: '1 porsiyon' }
    ]
  },
  'ana-yemekler': {
    allergens: [],
    nutrition: [
      { nutrient_name: 'Enerji', nutrient_value: '480', unit: 'kcal', portion_size: '1 porsiyon' },
      { nutrient_name: 'Protein', nutrient_value: '32', unit: 'g', portion_size: '1 porsiyon' }
    ]
  },
  tatlilar: {
    allergens: ['Gluten', 'Süt'],
    nutrition: [
      { nutrient_name: 'Enerji', nutrient_value: '320', unit: 'kcal', portion_size: '1 porsiyon' },
      { nutrient_name: 'Karbonhidrat', nutrient_value: '42', unit: 'g', portion_size: '1 porsiyon' }
    ]
  },
  icecekler: {
    allergens: [],
    nutrition: [
      { nutrient_name: 'Enerji', nutrient_value: '45', unit: 'kcal', portion_size: '200 ml' }
    ]
  },
  tavuklar: {
    allergens: [],
    nutrition: [
      { nutrient_name: 'Enerji', nutrient_value: '420', unit: 'kcal', portion_size: '1 porsiyon' },
      { nutrient_name: 'Protein', nutrient_value: '35', unit: 'g', portion_size: '1 porsiyon' }
    ]
  }
};

const run = (sql, params = []) =>
  new Promise((resolve, reject) => {
    dbModule.getDb().run(sql, params, function onRun(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });

const get = (sql, params = []) =>
  new Promise((resolve, reject) => {
    dbModule.getDb().get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });

const all = (sql, params = []) =>
  new Promise((resolve, reject) => {
    dbModule.getDb().all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });

const uniqueSlug = async (baseSlug) => {
  let slug = baseSlug;
  let n = 1;
  while (await get('SELECT id FROM products WHERE slug = ?', [slug])) {
    slug = `${baseSlug}-${n++}`;
  }
  return slug;
};

const saveAllergensAndNutrition = async (productId, allergens, nutrition) => {
  await run('DELETE FROM product_allergens WHERE product_id = ?', [productId]);
  await run('DELETE FROM product_nutritional_values WHERE product_id = ?', [productId]);

  if (Array.isArray(allergens)) {
    for (let i = 0; i < allergens.length; i++) {
      await run(
        'INSERT INTO product_allergens (product_id, allergen_name, order_index) VALUES (?, ?, ?)',
        [productId, allergens[i], i]
      );
    }
  }

  if (Array.isArray(nutrition)) {
    for (let i = 0; i < nutrition.length; i++) {
      const n = nutrition[i];
      await run(
        'INSERT INTO product_nutritional_values (product_id, nutrient_name, nutrient_value, unit, portion_size, order_index) VALUES (?, ?, ?, ?, ?, ?)',
        [productId, n.nutrient_name, n.nutrient_value, n.unit || '', n.portion_size || '', i]
      );
    }
  }
};

const insertProduct = async (categoryId, product, orderIndex) => {
  const baseSlug = slugify(product.name);
  const slug = await uniqueSlug(baseSlug);
  const result = await run(
    `INSERT INTO products (category_id, name, slug, description, price, preparation_time, order_index, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
    [
      categoryId,
      product.name,
      slug,
      product.description,
      product.price,
      product.preparation_time,
      orderIndex
    ]
  );
  await saveAllergensAndNutrition(result.lastID, product.allergens, product.nutrition);
  return result.lastID;
};

const main = async () => {
  await dbModule.init();
  const categories = await all('SELECT id, name, slug FROM categories WHERE is_active = 1 ORDER BY order_index');

  let added = 0;
  let enriched = 0;

  for (const cat of categories) {
    const templates = PRODUCTS_BY_CATEGORY_SLUG[cat.slug];
    const existing = await all(
      'SELECT id, name FROM products WHERE category_id = ? AND is_active = 1',
      [cat.id]
    );

    const need = Math.max(0, 3 - existing.length);

    if (templates && need > 0) {
      const toAdd = templates.slice(0, need);
      for (let i = 0; i < toAdd.length; i++) {
        const existsByName = existing.some(
          (p) => p.name.toLowerCase() === toAdd[i].name.toLowerCase()
        );
        if (existsByName) continue;
        await insertProduct(cat.id, toAdd[i], existing.length + i);
        added++;
        console.log(`  + [${cat.name}] ${toAdd[i].name}`);
      }
    }

    const allInCategory = await all(
      'SELECT p.id, p.name, (SELECT COUNT(*) FROM product_allergens a WHERE a.product_id = p.id) as ac FROM products p WHERE p.category_id = ? AND p.is_active = 1',
      [cat.id]
    );

    const defaults = DEFAULT_META_BY_SLUG[cat.slug] || {
      allergens: [],
      nutrition: [
        { nutrient_name: 'Enerji', nutrient_value: '250', unit: 'kcal', portion_size: '1 porsiyon' },
        { nutrient_name: 'Protein', nutrient_value: '12', unit: 'g', portion_size: '1 porsiyon' }
      ]
    };

    for (const p of allInCategory) {
      if (Number(p.ac) > 0) continue;
      const tpl = templates?.find((t) => t.name === p.name);
      const allergens = tpl?.allergens ?? defaults.allergens;
      const nutrition = tpl?.nutrition ?? defaults.nutrition;
      await saveAllergensAndNutrition(p.id, allergens, nutrition);
      enriched++;
      console.log(`  ~ alerjen/besin: [${cat.name}] ${p.name}`);
    }
  }

  console.log(`\nTamamlandı: ${added} yeni ürün, ${enriched} ürün zenginleştirildi.`);
  process.exit(0);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
