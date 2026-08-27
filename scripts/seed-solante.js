// scripts/seed-solante.js
// Solante Coffee menü ve işletme verilerini SQLite (database/menu.db) veritabanına aktarır.

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbDir = path.join(__dirname, '../database');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(__dirname, '../database/menu.db');
const db = new sqlite3.Database(dbPath);

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

const solanteData = {
  info: {
    name: "SOLANTE COFFEE",
    phone: "0507 420 57 90",
    address: "Sahibiata, Karahafızlar Sk. No:4, 42040 Karatay/Konya",
    plus_code: "VFCW+2H Meram, Konya",
    rating: "4.6",
    reviews_count: 267,
    price_range: "₺200–400"
  },
  categories: [
    {
      name: "Sandviçler (Focaccia Bread)",
      products: [
        { code: "SO-1", name: "Kaşar & Domates Sandviç", price: 150, ingredients: "Kaşar, Domates, Yeşillik, Labne, Pesto Sos" },
        { code: "SO-2", name: "Hindi Füme Sandviç", price: 175, ingredients: "Hindi Füme, Kaşar, Domates, Yeşillik, Labne, Sweet Chili" },
        { code: "SO-3", name: "Dana Jambon Sandviç", price: 220, ingredients: "Dana Jambon, Domates, Yeşillik, Kaşar, Labne, Pesto Sos, Balzamik Glaze" },
        { code: "SO-4", name: "Füme Antrikot Sandviç", price: 250, ingredients: "Füme Antrikot, Kaşar, Domates, Yeşillik, Labne, Domates, Balzamik Glaze, Pesto Sos" },
        { code: "SO-5", name: "Antrikot & Grana Padano", price: 275, ingredients: "Füme Antrikot, Domates (Kuru), Kaşar, Yeşillik, Labne, Grana Padano, Ballı Hardal" },
        { code: "SO-6", name: "Jambon & Antrikot Mix", price: 280, ingredients: "Füme Antrikot, Dana Jambon, Domates, Yeşillik, Kaşar, Labne, Pesto Sos, Balzamik Glaze, Ballı Hardal" },
        { code: "SO-7", name: "Köz Patlıcanlı Antrikot (YENİ)", price: 290, ingredients: "Füme Antrikot, Labne, Grana Padano, Kaşar, Domates, Yeşillik, Balkan Sos (Köz Patlıcan, Köz Biber)" },
        { code: "SO-8", name: "Ton Balıklı & Avokado (YENİ)", price: 295, ingredients: "Ton Balığı, Avokado, Yeşil Zeytin, Labne, Domates, Yeşillik, Balzamik Glaze" }
      ]
    },
    {
      name: "Espresso Bazlı Kahveler",
      products: [
        { name: "Espresso", price_hot: 90, price_ice: null },
        { name: "Double Espresso", price_hot: 110, price_ice: null },
        { name: "Cortado", price_hot: 140, price_ice: null },
        { name: "Americano", price_hot: 140, price_ice: 130 },
        { name: "Cappuccino", price_hot: 140, price_ice: 150 },
        { name: "Latte", price_hot: 140, price_ice: 150 },
        { name: "Mocha", price_hot: 160, price_ice: 170 },
        { name: "White Chocolate Mocha", price_hot: 160, price_ice: 170 },
        { name: "Caramel Macchiato", price_hot: 160, price_ice: 170 },
        { name: "Salted Caramel Latte", price_hot: 160, price_ice: 170 },
        { name: "Matcha Latte", price_hot: 160, price_ice: 170 },
        { name: "Vanilla Latte", price_hot: 160, price_ice: 170 },
        { name: "Spanish Latte", price_hot: 160, price_ice: 170 },
        { name: "Flat White", price_hot: 160, price_ice: 170 },
        { name: "Salep Latte", price_hot: 170, price_ice: 180 },
        { name: "Fıstık Latte", price_hot: 170, price_ice: 180 }
      ]
    },
    {
      name: "Filtre & Türk Kahveleri",
      products: [
        { name: "Filtre Kahve", price_hot: 90, price_ice: 90 },
        { name: "Sütlü Filtre Kahve", price_hot: 100, price_ice: 110 },
        { name: "Türk Kahvesi", price_hot: 90, price_ice: null },
        { name: "Dibek Kahvesi", price_hot: 90, price_ice: null },
        { name: "Menengiç Kahvesi", price_hot: 90, price_ice: null }
      ]
    },
    {
      name: "Çay & Sıcaklar",
      products: [
        { name: "Çay", price: 35 },
        { name: "Fincan Çay", price: 55 },
        { name: "Ihlamur", price: 115 },
        { name: "Yeşil Çay", price: 140 },
        { name: "Salep", price: 140 },
        { name: "Sıcak Çikolata", price: 140 }
      ]
    },
    {
      name: "Frozen & Milkshake",
      products: [
        { name: "Çilek Frozen", price: 150 },
        { name: "Mango Frozen", price: 150 },
        { name: "Orman Meyveli Frozen", price: 150 },
        { name: "Çikolata Milkshake", price: 150 },
        { name: "Çilek Milkshake", price: 150 },
        { name: "Muz Milkshake", price: 150 },
        { name: "Caramel Milkshake", price: 150 }
      ]
    },
    {
      name: "Kokteyller & İçecekler",
      products: [
        { name: "Kuzu Kulağı Kokteyl", price: 140 },
        { name: "Passion Guava", price: 140 },
        { name: "Mango Dragon", price: 140 },
        { name: "Yaban Mersini Lici", price: 140 },
        { name: "Sakura Kokteyl", price: 140 },
        { name: "Cool Lime", price: 140 },
        { name: "Berry Hibiscus", price: 140 },
        { name: "Limonlu Ice Tea", price: 140 },
        { name: "Şeftali Ice Tea", price: 140 },
        { name: "Frambuazlı Ice Tea", price: 140 },
        { name: "Mangolu Ice Tea", price: 140 }
      ]
    },
    {
      name: "Yazın Favorileri",
      products: [
        { name: "Limonata", price: 140 },
        { name: "Çilekli Limonata", price: 150 },
        { name: "Portakal Suyu", price: 160 },
        { name: "Portakal Limon Mix", price: 160 }
      ]
    }
  ]
};

async function seedDatabase() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Tabloları oluştur
      db.run(`CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        description TEXT,
        image TEXT,
        order_index INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category_id INTEGER,
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        description TEXT,
        price REAL NOT NULL,
        image TEXT,
        preparation_time INTEGER DEFAULT 3,
        order_index INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories(id)
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT UNIQUE NOT NULL,
        value TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      // Temizleme: Eski kategorileri ve ürünleri kaldırıyoruz
      console.log('🧹 Eski veriler temizleniyor...');
      db.run('DELETE FROM products');
      db.run('DELETE FROM categories');
      db.run("DELETE FROM sqlite_sequence WHERE name IN ('products', 'categories')");

      // İşletme Ayarlarını Ekle/Güncelle
      const settingsToInsert = [
        { key: 'company_name', value: solanteData.info.name },
        { key: 'restaurant_name', value: solanteData.info.name },
        { key: 'admin_brand_text', value: solanteData.info.name },
        { key: 'phone', value: solanteData.info.phone },
        { key: 'address', value: solanteData.info.address },
        { key: 'plus_code', value: solanteData.info.plus_code },
        { key: 'rating', value: String(solanteData.info.rating) },
        { key: 'reviews_count', value: String(solanteData.info.reviews_count) },
        { key: 'price_range', value: solanteData.info.price_range },
        { key: 'restaurant_description', value: `${solanteData.info.address} | Tel: ${solanteData.info.phone}` },
        { key: 'restaurant_slogan', value: 'Focaccia Sandviçler & Nitelikli Kahve Çeşitleri' },
        { key: 'company_slogan', value: 'Nitelikli Kahve & Taze Lezzetler' },
        { key: 'primary_color', value: '#D4AF37' }, // Amber / Gold Accent
        { key: 'hover_color', value: '#E6A15C' },
        { key: 'header_color', value: '#1A1A1A' },
        { key: 'menu_background_color', value: '#F4F1EA' },
        { key: 'text_color', value: '#1A1A1A' },
        { key: 'font_family', value: "'Poppins', 'Inter', sans-serif" }
      ];

      const stmtSetting = db.prepare('INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)');
      settingsToInsert.forEach((s) => {
        stmtSetting.run(s.key, s.value);
      });
      stmtSetting.finalize();
      console.log('⚙️  İşletme ayarları ve iletişim bilgileri güncellendi.');

      // Kategorileri ve Ürünleri Ekle
      let catOrder = 0;
      solanteData.categories.forEach((catData) => {
        catOrder++;
        const catSlug = slugify(catData.name);
        
        db.run(
          'INSERT INTO categories (name, slug, order_index, is_active) VALUES (?, ?, ?, 1)',
          [catData.name, catSlug, catOrder],
          function (err) {
            if (err) {
              console.error(`❌ Kategori eklenirken hata (${catData.name}):`, err.message);
              return;
            }

            const categoryId = this.lastID;
            console.log(`📁 Kategori eklendi: [ID:${categoryId}] ${catData.name}`);

            let prodOrder = 0;
            const stmtProd = db.prepare(
              'INSERT INTO products (category_id, name, slug, description, price, order_index, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)'
            );

            catData.products.forEach((prod) => {
              prodOrder++;
              
              // Ürün İsmi ve Kod Yapılandırması
              let prodName = prod.name;
              if (prod.code) {
                prodName = `${prod.code} - ${prod.name}`;
              }

              // Ürün Fiyatı ve Açıklama Yapılandırması
              let price = 0;
              let descParts = [];

              if (prod.ingredients) {
                descParts.push(`İçindekiler: ${prod.ingredients}`);
              }

              if (prod.price !== undefined) {
                price = prod.price;
              } else if (prod.price_hot !== undefined) {
                price = prod.price_hot;
                if (prod.price_ice !== undefined && prod.price_ice !== null) {
                  if (prod.price_hot === prod.price_ice) {
                    descParts.push(`Sıcak / Soğuk: ₺${prod.price_hot}`);
                  } else {
                    descParts.push(`Sıcak: ₺${prod.price_hot} | Soğuk: ₺${prod.price_ice}`);
                  }
                } else {
                  descParts.push(`Sıcak: ₺${prod.price_hot}`);
                }
              }

              const description = descParts.join(' • ');
              const prodSlug = slugify(`${catSlug}-${prodName}`);

              stmtProd.run(categoryId, prodName, prodSlug, description, price, prodOrder, (pErr) => {
                if (pErr) {
                  console.error(`   ❌ Ürün eklenirken hata (${prodName}):`, pErr.message);
                } else {
                  console.log(`   ☕ Ürün eklendi: ${prodName} (${price} ₺)`);
                }
              });
            });

            stmtProd.finalize();
          }
        );
      });

      console.log('🎉 Seed script çalıştırma işlemi tamamlanıyor...');
      setTimeout(() => {
        resolve();
      }, 1000);
    });
  });
}

seedDatabase().then(() => {
  console.log('✅ Solante Coffee verileri SQLite (database/menu.db) veritabanına başarıyla aktarıldı!');
  db.close();
}).catch((err) => {
  console.error('❌ Hata oluştu:', err);
  db.close();
});
