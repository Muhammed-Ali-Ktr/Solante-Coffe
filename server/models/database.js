const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

// Database klasörünü oluştur
const dbDir = path.join(__dirname, '../../database');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'menu.db');
let db = null;

const init = () => {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Database bağlantı hatası:', err);
        reject(err);
      } else {
        console.log('✅ SQLite veritabanına bağlandı');
        createTables().then(resolve).catch(reject);
      }
    });
  });
};

const createTables = async () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Kategoriler tablosu
      db.run(`CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        description TEXT,
        image TEXT,
        order_index INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`, (err) => {
        if (err) {
          console.error('Kategoriler tablosu hatası:', err);
          reject(err);
        }
      });

      // Ürünler tablosu
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
      )`, (err) => {
        if (err) {
          console.error('Ürünler tablosu hatası:', err);
          reject(err);
        } else {
          // preparation_time kolonu yoksa ekle (mevcut tablolar için)
          db.run(`ALTER TABLE products ADD COLUMN preparation_time INTEGER DEFAULT 3`, (err) => {
            // Kolon zaten varsa hata vermez, görmezden gel
          });
        }
      });

      // Admin kullanıcılar tablosu
      db.run(`CREATE TABLE IF NOT EXISTS admins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`, (err) => {
        if (err) {
          console.error('Admin tablosu hatası:', err);
        }
      });

      // Ayarlar tablosu
      db.run(`CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT UNIQUE NOT NULL,
        value TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`, (err) => {
        if (err) {
          console.error('Settings tablosu hatası:', err);
        }
      });

      // Mesajlar tablosu
      db.run(`CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        subject TEXT,
        message TEXT NOT NULL,
        is_read INTEGER DEFAULT 0,
        is_replied INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`, (err) => {
        if (err) {
          console.error('Messages tablosu hatası:', err);
        } else {
          // product_id kolonu yoksa ekle (mevcut tablolar için)
          db.run(`ALTER TABLE messages ADD COLUMN product_id INTEGER`, (err) => {
            // Kolon zaten varsa hata vermez, görmezden gel
          });
        }
      });

      // Medya tablosu
      db.run(`CREATE TABLE IF NOT EXISTS media (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT NOT NULL,
        path TEXT NOT NULL,
        mime_type TEXT,
        size INTEGER,
        uploaded_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (uploaded_by) REFERENCES admins(id)
      )`, (err) => {
        if (err) {
          console.error('Media tablosu hatası:', err);
        }
      });

      // Bannerlar tablosu
      db.run(`CREATE TABLE IF NOT EXISTS banners (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        description TEXT,
        image TEXT NOT NULL,
        link TEXT,
        order_index INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`, (err) => {
        if (err) {
          console.error('Banners tablosu hatası:', err);
        } else {
          // description kolonu yoksa ekle (mevcut tablolar için)
          db.run(`ALTER TABLE banners ADD COLUMN description TEXT`, (err) => {
            // Kolon zaten varsa hata vermez, görmezden gel
          });
        }
      });

      // Tanıtım alanları tablosu
      db.run(`CREATE TABLE IF NOT EXISTS promotions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        section_name TEXT NOT NULL,
        title_tr TEXT,
        title_en TEXT,
        product_ids TEXT,
        order_index INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`, (err) => {
        if (err) {
          console.error('Promotions tablosu hatası:', err);
        } else {
          migratePromotionsTable();
        }
      });

      // Sosyal medya tablosu
      db.run(`CREATE TABLE IF NOT EXISTS social_media (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        platform TEXT UNIQUE NOT NULL,
        url TEXT,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`, (err) => {
        if (err) {
          console.error('Social media tablosu hatası:', err);
        }
      });

      // Ürün alerjenleri tablosu
      db.run(`CREATE TABLE IF NOT EXISTS product_allergens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        allergen_name TEXT NOT NULL,
        allergen_icon TEXT DEFAULT 'fas fa-certificate',
        order_index INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      )`, (err) => {
        if (err) {
          console.error('Product allergens tablosu hatası:', err);
        }
      });

      // Ürün besin değerleri tablosu
      db.run(`CREATE TABLE IF NOT EXISTS product_nutritional_values (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        nutrient_name TEXT NOT NULL,
        nutrient_value TEXT NOT NULL,
        unit TEXT DEFAULT '',
        portion_size TEXT DEFAULT '',
        order_index INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      )`, (err) => {
        if (err) {
          console.error('Product nutritional values tablosu hatası:', err);
        }
      });

      // Ürün beğenileri tablosu
      db.run(`CREATE TABLE IF NOT EXISTS product_likes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        like_count INTEGER DEFAULT 0,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        UNIQUE(product_id)
      )`, (err) => {
        if (err) {
          console.error('Product likes tablosu hatası:', err);
        }
      });

      // Aracı firmalar tablosu
      db.run(`CREATE TABLE IF NOT EXISTS delivery_companies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        url TEXT,
        logo TEXT,
        is_active INTEGER DEFAULT 1,
        order_index INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`, async (err) => {
        if (err) {
          console.error('Delivery companies tablosu hatası:', err);
        } else {
          // Varsayılan admin kullanıcısını oluştur
          await createDefaultAdmin();
          // Demo verileri ekle
          await insertDemoData();
          // Varsayılan ayarları ekle
          await insertDefaultSettings();
          resolve();
        }
      });
    });
  });
};

/** promotions tablosunda section_name başına tek kayıt (eski INSERT OR REPLACE hatası) */
const migratePromotionsTable = () => {
  if (!db) return;

  db.all(
      'SELECT section_name, COUNT(*) as cnt FROM promotions GROUP BY section_name HAVING cnt > 1',
      [],
    (err, duplicates) => {
      if (err || !duplicates || !duplicates.length) {
        db.run(
          'CREATE UNIQUE INDEX IF NOT EXISTS idx_promotions_section_name ON promotions(section_name)',
          () => {}
        );
        return;
      }

      db.all('SELECT DISTINCT section_name FROM promotions', [], (err2, sections) => {
        if (err2 || !sections) return;

        let pending = sections.length;
        if (!pending) return;

        sections.forEach(({ section_name }) => {
          db.get(
            'SELECT * FROM promotions WHERE section_name = ? ORDER BY id DESC LIMIT 1',
            [section_name],
            (err3, latest) => {
              db.run('DELETE FROM promotions WHERE section_name = ?', [section_name], () => {
                if (latest) {
                  db.run(
                    'INSERT INTO promotions (section_name, title_tr, title_en, product_ids, order_index, is_active) VALUES (?, ?, ?, ?, ?, ?)',
                    [
                      latest.section_name,
                      latest.title_tr,
                      latest.title_en,
                      latest.product_ids,
                      latest.order_index || 0,
                      latest.is_active !== undefined ? latest.is_active : 1
                    ],
                    () => {
                      pending -= 1;
                      if (pending === 0) {
                        db.run(
                          'CREATE UNIQUE INDEX IF NOT EXISTS idx_promotions_section_name ON promotions(section_name)',
                          () => {}
                        );
                      }
                    }
                  );
                } else {
                  pending -= 1;
                }
              });
            }
          );
        });
      });
    }
  );
};

const createDefaultAdmin = async () => {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM admins WHERE username = ?', ['yonetim'], async (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      
      if (!row) {
        const hashedPassword = await bcrypt.hash('Yonetim*123', 10);
        db.run('INSERT INTO admins (username, password) VALUES (?, ?)', 
          ['yonetim', hashedPassword], 
          (err) => {
            if (err) {
              console.error('Admin kullanıcı oluşturma hatası:', err);
              reject(err);
            } else {
              console.log('✅ Varsayılan admin kullanıcı oluşturuldu');
              resolve();
            }
          }
        );
      } else {
        resolve();
      }
    });
  });
};

const insertDefaultSettings = async () => {
  return new Promise((resolve) => {
    const defaultSettings = [
      { key: 'company_name', value: 'SOLANTE COFFEE' },
      { key: 'company_slogan', value: 'Focaccia Sandviçler & Nitelikli Kahve Çeşitleri' },
      { key: 'company_logo', value: '' },
      { key: 'company_icon', value: '' },
      { key: 'primary_color', value: '#D4AF37' },
      { key: 'hover_color', value: '#E6A15C' },
      { key: 'header_color', value: '#1A1A1A' },
      { key: 'back_button_enabled', value: '1' },
      { key: 'desktop_logo_width', value: '190' },
      { key: 'tablet_logo_width', value: '170' },
      { key: 'mobile_logo_width', value: '150' },
      { key: 'menu_url', value: 'http://localhost:3000/' },
      { key: 'restaurant_name', value: 'SOLANTE COFFEE' },
      { key: 'restaurant_description', value: 'Sahibiata, Karahafızlar Sk. No:4, 42040 Karatay/Konya | 0507 420 57 90' },
      { key: 'restaurant_logo', value: '' },
      { key: 'restaurant_icon', value: '' },
      { key: 'restaurant_slogan', value: 'Focaccia Sandviçler & Nitelikli Kahve Çeşitleri' },
      { key: 'phone', value: '0507 420 57 90' },
      { key: 'address', value: 'Sahibiata, Karahafızlar Sk. No:4, 42040 Karatay/Konya' },
      { key: 'plus_code', value: 'VFCW+2H Meram, Konya' },
      { key: 'rating', value: '4.6' },
      { key: 'reviews_count', value: '267' },
      { key: 'price_range', value: '₺200–400' },
      { key: 'wifi_name', value: 'SOLANTE COFFEE' },
      { key: 'wifi_password', value: 'solante2026' },
      { key: 'google_review_url', value: '' }
    ];

    let index = 0;
    const insertSetting = () => {
      if (index >= defaultSettings.length) {
        resolve();
        return;
      }

      const setting = defaultSettings[index];
      db.run('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)',
        [setting.key, setting.value],
        (err) => {
          if (err) console.error('Setting ekleme hatası:', err);
          index++;
          insertSetting();
        }
      );
    };

    insertSetting();
  });
};

const insertDemoData = async () => {
  return new Promise((resolve) => {
    db.get('SELECT COUNT(*) as count FROM categories', (err, row) => {
      if (err || row.count > 0) {
        resolve();
        return;
      }

      // Demo kategoriler
      const categories = [
        { name: 'Tostlar', slug: 'tostlar', description: 'Lezzetli tost çeşitleri' },
        { name: 'Salatalar', slug: 'salatalar', description: 'Taze ve sağlıklı salata seçenekleri' },
        { name: 'Tatlılar', slug: 'tatlilar', description: 'Lezzetli tatlı çeşitleri' },
        { name: 'Sandviçler', slug: 'sandvicler', description: 'Doyurucu sandviç çeşitleri' },
        { name: 'Börek & Kızartmalar', slug: 'borek-kizartmalar', description: 'Geleneksel börek ve kızartma çeşitleri' },
        { name: 'Kahveler', slug: 'kahveler', description: 'Özel kahve çeşitleri' },
        { name: 'Soğuk İçecekler', slug: 'soguk-icecekler', description: 'Serinletici içecekler' },
        { name: 'Nargileler', slug: 'nargileler', description: 'Özel nargile çeşitleri' },
        { name: 'Sıcak İçecekler', slug: 'sicak-icecekler', description: 'Sıcak içecek çeşitleri' }
      ];

      let categoryIndex = 0;
      const insertCategory = () => {
        if (categoryIndex >= categories.length) {
          insertProducts();
          return;
        }

        const cat = categories[categoryIndex];
        db.run('INSERT INTO categories (name, slug, description, order_index) VALUES (?, ?, ?, ?)',
          [cat.name, cat.slug, cat.description, categoryIndex],
          function(err) {
            if (err) {
              console.error('Demo kategori ekleme hatası:', err);
            } else {
              insertProductsForCategory(this.lastID, cat.name);
            }
            categoryIndex++;
            insertCategory();
          }
        );
      };

      const insertProductsForCategory = (categoryId, categoryName) => {
        let products = [];
        
        if (categoryName === 'Tostlar') {
          products = [
            { name: 'Karışık Tost', price: 45, description: 'Kaşar, sucuk, sosis ve domates ile', preparation_time: 5 },
            { name: 'Kaşarlı Tost', price: 35, description: 'Bol kaşar peyniri ile', preparation_time: 4 },
            { name: 'Sucuklu Tost', price: 40, description: 'Taze sucuk ve kaşar ile', preparation_time: 5 },
            { name: 'Kavurmalı Tost', price: 50, description: 'Özel kavurma ve kaşar ile', preparation_time: 6 },
            { name: 'Tavuklu Tost', price: 45, description: 'Tavuk göğsü ve kaşar ile', preparation_time: 5 },
            { name: 'Mantarlı Tost', price: 42, description: 'Taze mantar ve kaşar ile', preparation_time: 5 },
            { name: 'Özel Tost', price: 55, description: 'Çeşitli malzemelerle hazırlanmış özel tost', preparation_time: 6 }
          ];
        } else if (categoryName === 'Salatalar') {
          products = [
            { name: 'Çoban Salata', price: 35, description: 'Domates, salatalık, soğan, maydanoz ve zeytinyağı', preparation_time: 3 },
            { name: 'Mevsim Salata', price: 40, description: 'Mevsim yeşillikleri ve özel sos ile', preparation_time: 4 },
            { name: 'Akdeniz Salata', price: 45, description: 'Yeşillik, zeytin, peynir ve zeytinyağı', preparation_time: 4 },
            { name: 'Tavuklu Salata', price: 55, description: 'Izgara tavuk, yeşillik ve özel sos', preparation_time: 5 },
            { name: 'Ton Balıklı Salata', price: 50, description: 'Ton balığı, yeşillik ve mısır', preparation_time: 4 },
            { name: 'Roka Salata', price: 42, description: 'Taze roka, ceviz ve parmesan peyniri', preparation_time: 3 },
            { name: 'Sezar Salata', price: 48, description: 'Marul, tavuk, kruton ve sezar sos', preparation_time: 5 }
          ];
        } else if (categoryName === 'Tatlılar') {
          products = [
            { name: 'Baklava', price: 60, description: 'Geleneksel baklava, ceviz ve fıstık ile', preparation_time: 3 },
            { name: 'Sütlaç', price: 35, description: 'Ev yapımı sütlaç, tarçın ile', preparation_time: 3 },
            { name: 'Tiramisu', price: 55, description: 'İtalyan tatlısı, kahve ve kakaolu', preparation_time: 3 },
            { name: 'Künefe', price: 65, description: 'Sıcak künefe, kaymak ve şerbet ile', preparation_time: 5 },
            { name: 'Profiterol', price: 50, description: 'Çikolata soslu profiterol', preparation_time: 4 },
            { name: 'Cheesecake', price: 55, description: 'New York usulü cheesecake', preparation_time: 3 },
            { name: 'Brownie', price: 45, description: 'Sıcak brownie, dondurma ile', preparation_time: 3 }
          ];
        } else if (categoryName === 'Sandviçler') {
          products = [
            { name: 'Tavuklu Sandviç', price: 55, description: 'Izgara tavuk, marul, domates ve özel sos', preparation_time: 6 },
            { name: 'Etli Sandviç', price: 65, description: 'Döner et, marul, domates ve soğan', preparation_time: 7 },
            { name: 'Tavuk Döner Sandviç', price: 50, description: 'Tavuk döner, marul ve özel sos', preparation_time: 5 },
            { name: 'Ton Balıklı Sandviç', price: 48, description: 'Ton balığı, marul ve mısır', preparation_time: 5 },
            { name: 'Peynirli Sandviç', price: 40, description: 'Çeşitli peynirler ve yeşillik', preparation_time: 4 },
            { name: 'Köfteli Sandviç', price: 58, description: 'Izgara köfte, marul ve domates', preparation_time: 6 },
            { name: 'Özel Sandviç', price: 70, description: 'Çeşitli malzemelerle hazırlanmış özel sandviç', preparation_time: 7 }
          ];
        } else if (categoryName === 'Börek & Kızartmalar') {
          products = [
            { name: 'Peynirli Börek', price: 35, description: 'Taze peynir ile hazırlanmış börek', preparation_time: 4 },
            { name: 'Patatesli Börek', price: 32, description: 'Patates ve soğan ile hazırlanmış börek', preparation_time: 4 },
            { name: 'Kıymalı Börek', price: 40, description: 'Özel kıyma ile hazırlanmış börek', preparation_time: 5 },
            { name: 'Ispanaklı Börek', price: 38, description: 'Taze ıspanak ve peynir ile', preparation_time: 4 },
            { name: 'Patates Kızartması', price: 25, description: 'Taze patates, özel baharat ile', preparation_time: 5 },
            { name: 'Soğan Halkası', price: 28, description: 'Çıtır soğan halkaları', preparation_time: 4 },
            { name: 'Mozzarella Çubukları', price: 35, description: 'Çıtır dış, eriyen iç', preparation_time: 5 }
          ];
        } else if (categoryName === 'Kahveler') {
          products = [
            { name: 'Türk Kahvesi', price: 25, description: 'Geleneksel Türk kahvesi, lokum ile', preparation_time: 5 },
            { name: 'Espresso', price: 20, description: 'İtalyan espresso, sıcak servis', preparation_time: 3 },
            { name: 'Cappuccino', price: 35, description: 'Sütlü kahve, köpüklü', preparation_time: 4 },
            { name: 'Latte', price: 40, description: 'Sütlü kahve, latte art ile', preparation_time: 4 },
            { name: 'Americano', price: 22, description: 'Sıcak su ile seyreltilmiş espresso', preparation_time: 3 },
            { name: 'Mocha', price: 42, description: 'Çikolata ve sütlü kahve', preparation_time: 4 },
            { name: 'Macchiato', price: 38, description: 'Espresso ve süt köpüğü', preparation_time: 4 }
          ];
        } else if (categoryName === 'Soğuk İçecekler') {
          products = [
            { name: 'Taze Sıkılmış Portakal Suyu', price: 30, description: 'Günlük taze meyve suyu', preparation_time: 3 },
            { name: 'Limonata', price: 25, description: 'Taze limon, nane ve buz ile', preparation_time: 2 },
            { name: 'Ayran', price: 15, description: 'Taze ayran, tuzlu', preparation_time: 1 },
            { name: 'Kola', price: 20, description: 'Soğuk kola, buz ile', preparation_time: 1 },
            { name: 'Fanta', price: 20, description: 'Soğuk fanta, buz ile', preparation_time: 1 },
            { name: 'Sprite', price: 20, description: 'Soğuk sprite, buz ile', preparation_time: 1 },
            { name: 'Meyve Suyu', price: 25, description: 'Çeşitli meyve suları', preparation_time: 2 }
          ];
        } else if (categoryName === 'Nargileler') {
          products = [
            { name: 'Elma Nargile', price: 120, description: 'Elma aromalı özel nargile', preparation_time: 10 },
            { name: 'Çilek Nargile', price: 120, description: 'Çilek aromalı özel nargile', preparation_time: 10 },
            { name: 'Karpuz Nargile', price: 120, description: 'Karpuz aromalı özel nargile', preparation_time: 10 },
            { name: 'Vişne Nargile', price: 120, description: 'Vişne aromalı özel nargile', preparation_time: 10 },
            { name: 'Karışık Meyve Nargile', price: 130, description: 'Karışık meyve aromalı özel nargile', preparation_time: 10 },
            { name: 'Double Apple Nargile', price: 125, description: 'Double apple aromalı özel nargile', preparation_time: 10 },
            { name: 'Mint Nargile', price: 120, description: 'Nane aromalı özel nargile', preparation_time: 10 }
          ];
        } else if (categoryName === 'Sıcak İçecekler') {
          products = [
            { name: 'Çay', price: 10, description: 'Taze demlenmiş çay, şeker ile', preparation_time: 2 },
            { name: 'Bitki Çayı', price: 15, description: 'Çeşitli bitki çayları', preparation_time: 3 },
            { name: 'Sıcak Çikolata', price: 30, description: 'Sıcak çikolata, krema ile', preparation_time: 4 },
            { name: 'Salep', price: 25, description: 'Geleneksel salep, tarçın ile', preparation_time: 3 },
            { name: 'Sıcak Süt', price: 20, description: 'Sıcak süt, bal ile', preparation_time: 2 },
            { name: 'Adaçayı', price: 18, description: 'Taze adaçayı, limon ile', preparation_time: 3 },
            { name: 'Ihlamur', price: 18, description: 'Taze ıhlamur, limon ile', preparation_time: 3 }
          ];
        }

        products.forEach((product, index) => {
          const slug = product.name.toLowerCase()
            .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
            .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
            .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
          
          db.run('INSERT INTO products (category_id, name, slug, description, price, preparation_time, order_index) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [categoryId, product.name, slug, product.description, product.price, product.preparation_time || 3, index],
            (err) => {
              if (err) console.error('Demo ürün ekleme hatası:', err);
            }
          );
        });
      };

      const insertProducts = () => {
        // Ürünler kategorilere göre eklendi
        resolve();
      };

      insertCategory();

      
    });
  });
};

const getDb = () => {
  if (!db) {
    throw new Error('Database bağlantısı kurulmamış');
  }
  return db;
};

module.exports = {
  init,
  getDb
};

