const express = require('express');
const router = express.Router();
const dbModule = require('../models/database');
const { parseChefPicksStorage } = require('../utils/chef-picks');

// Tüm kategorileri getir (aktif olanlar)
router.get('/categories', (req, res) => {
  const db = dbModule.getDb();
  db.all('SELECT * FROM categories WHERE is_active = 1 ORDER BY order_index ASC', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Tüm ürünleri getir (aktif olanlar)
router.get('/products', (req, res) => {
  const db = dbModule.getDb();
  const categoryId = req.query.category_id;
  
  let query = `
    SELECT p.*, c.name as category_name, c.slug as category_slug 
    FROM products p 
    LEFT JOIN categories c ON p.category_id = c.id 
    WHERE p.is_active = 1
  `;
  
  const params = [];
  if (categoryId) {
    query += ' AND p.category_id = ?';
    params.push(categoryId);
  }
  
  query += ' ORDER BY p.order_index ASC, p.name ASC';
  
  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Kategoriye göre ürünleri getir
router.get('/categories/:slug/products', (req, res) => {
  const db = dbModule.getDb();
  const slug = req.params.slug;
  
  db.get('SELECT id FROM categories WHERE slug = ? AND is_active = 1', [slug], (err, category) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (!category) {
      return res.status(404).json({ error: 'Kategori bulunamadı' });
    }
    
    db.all(
      'SELECT * FROM products WHERE category_id = ? AND is_active = 1 ORDER BY order_index ASC',
      [category.id],
      (err, products) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.json(products);
      }
    );
  });
});

// Tek ürün detayı (slug ile)
router.get('/products/:slug', (req, res) => {
  const db = dbModule.getDb();
  const slug = req.params.slug;
  
  db.get(
    `SELECT p.*, c.name as category_name, c.slug as category_slug 
     FROM products p 
     LEFT JOIN categories c ON p.category_id = c.id 
     WHERE p.slug = ? AND p.is_active = 1`,
    [slug],
    (err, product) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      if (!product) {
        return res.status(404).json({ error: 'Ürün bulunamadı' });
      }
      
      res.json(product);
    }
  );
});

// Restoran bilgileri
router.get('/restaurant', (req, res) => {
  const db = dbModule.getDb();
  db.all('SELECT key, value FROM settings', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
      
      const settings = {};
      rows.forEach(row => {
        settings[row.key] = row.value;
      });
      
      // Eğer restaurant_name yoksa company_name'i kullan
      const name = settings.restaurant_name || settings.company_name || 'QR Menü Restoran';
      const logo = settings.restaurant_logo || settings.company_logo || '/images/logo.png';
      const icon = settings.restaurant_icon || settings.company_icon || '/images/icon.png';
      
      res.json({
        name: name,
        company_name: settings.company_name || name,
        description: settings.restaurant_description || settings.company_slogan || 'Lezzetli yemekler ve kaliteli hizmet',
        logo: logo,
        company_logo: settings.company_logo || logo,
        icon: icon,
        company_icon: settings.company_icon || icon,
        slogan: settings.restaurant_slogan || settings.company_slogan || '',
        wifi_name: settings.wifi_name || '',
        wifi_password: settings.wifi_password || '',
        menu_url: settings.menu_url || '',
        admin_brand_text: settings.admin_brand_text || 'ZİFT STUDİO',
        qr_code_image: settings.qr_code_image || ''
      });
    }
  );
});

// Aktif bannerları getir
router.get('/banners', (req, res) => {
  const db = dbModule.getDb();
  db.all('SELECT * FROM banners WHERE is_active = 1 ORDER BY order_index ASC', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Şefin önerileri (kategori bazlı + geriye dönük liste)
router.get('/promotions/chef-picks', (req, res) => {
  const db = dbModule.getDb();
  const emptyPayload = {
    title_tr: 'Şefin Önerileri',
    title_en: "Chef's Recommendations",
    products: [],
    by_category: {}
  };

  db.get(
    'SELECT * FROM promotions WHERE section_name = ? AND is_active = 1 ORDER BY id DESC LIMIT 1',
    ['chef_picks'],
    (err, promotion) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (!promotion || !promotion.product_ids) {
      return res.json(emptyPayload);
    }

    const { byCategory, legacyIds } = parseChefPicksStorage(promotion.product_ids);
    const titleTr = promotion.title_tr || emptyPayload.title_tr;
    const titleEn = promotion.title_en || emptyPayload.title_en;

    const categoryIds = Object.keys(byCategory).map((id) => parseInt(id, 10)).filter((id) => !isNaN(id));
    const productIdsFromCategories = categoryIds.map((cid) => byCategory[cid]);
    const allIds = [...new Set([...productIdsFromCategories, ...legacyIds])].filter((id) => !isNaN(id));

    if (allIds.length === 0) {
      return res.json({ ...emptyPayload, title_tr: titleTr, title_en: titleEn });
    }

    const placeholders = allIds.map(() => '?').join(',');
    db.all(
      `SELECT p.*, c.name as category_name, c.id as category_id
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.id IN (${placeholders}) AND p.is_active = 1`,
      allIds,
      (err2, products) => {
        if (err2) {
          return res.status(500).json({ error: err2.message });
        }

        const productMap = {};
        (products || []).forEach((p) => {
          productMap[p.id] = p;
        });

        const byCategoryOut = {};
        categoryIds.forEach((catId) => {
          const prodId = byCategory[catId];
          if (productMap[prodId]) {
            byCategoryOut[catId] = productMap[prodId];
          }
        });

        const legacyProducts = legacyIds
          .map((id) => productMap[id])
          .filter(Boolean);

        res.json({
          title_tr: titleTr,
          title_en: titleEn,
          products: legacyProducts,
          by_category: byCategoryOut
        });
      }
    );
  });
});

// Sosyal medya linkleri
router.get('/social-media', (req, res) => {
  const db = dbModule.getDb();
  db.all('SELECT * FROM social_media WHERE is_active = 1 ORDER BY platform ASC', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Google review linki
router.get('/settings/google-review', (req, res) => {
  const db = dbModule.getDb();
  db.get('SELECT value FROM settings WHERE key = ?', ['google_review_url'], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ url: row ? row.value : '' });
  });
});

// Aktif teslimat firmaları
router.get('/delivery-companies', (req, res) => {
  const db = dbModule.getDb();
  db.all('SELECT * FROM delivery_companies WHERE is_active = 1 ORDER BY order_index ASC', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Tasarım ayarlarını getir (public)
router.get('/design-settings', (req, res) => {
  const db = dbModule.getDb();
  db.all('SELECT key, value FROM settings WHERE key IN (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', 
    ['primary_color', 'hover_color', 'header_color', 'back_button_enabled', 'desktop_logo_width', 'tablet_logo_width', 'mobile_logo_width', 'menu_background_color', 'text_color', 'border_radius', 'font_family', 'section_spacing'],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      const settings = {};
      rows.forEach(row => {
        settings[row.key] = row.value;
      });
      
      // Varsayılan değerler - Admin paneli ile uyumlu
      res.json({
        primary_color: settings.primary_color || '#C3424E',
        hover_color: settings.hover_color || '#A9333E',
        header_color: settings.header_color || '#ffffff',
        back_button_enabled: settings.back_button_enabled || '1',
        desktop_logo_width: settings.desktop_logo_width || '190',
        tablet_logo_width: settings.tablet_logo_width || '170',
        mobile_logo_width: settings.mobile_logo_width || '150',
        menu_background_color: settings.menu_background_color || '#F6F6F6',
        text_color: settings.text_color || '#1a1a1a',
        border_radius: settings.border_radius || '8',
        font_family: settings.font_family || '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        section_spacing: settings.section_spacing || '20'
      });
    }
  );
});

// Ürün alerjenleri
router.get('/products/:slug/allergens', (req, res) => {
  const db = dbModule.getDb();
  const slug = req.params.slug;
  
  db.get('SELECT id FROM products WHERE slug = ? AND is_active = 1', [slug], (err, product) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (!product) {
      return res.status(404).json({ error: 'Ürün bulunamadı' });
    }
    
    db.all(
      'SELECT * FROM product_allergens WHERE product_id = ? ORDER BY order_index ASC',
      [product.id],
      (err, allergens) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.json(allergens || []);
      }
    );
  });
});

// Ürün besin değerleri
router.get('/products/:slug/nutritional-values', (req, res) => {
  const db = dbModule.getDb();
  const slug = req.params.slug;
  
  db.get('SELECT id FROM products WHERE slug = ? AND is_active = 1', [slug], (err, product) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (!product) {
      return res.status(404).json({ error: 'Ürün bulunamadı' });
    }
    
    db.all(
      'SELECT * FROM product_nutritional_values WHERE product_id = ? ORDER BY order_index ASC',
      [product.id],
      (err, values) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.json(values || []);
      }
    );
  });
});

// İlgili ürünler (aynı kategorideki diğer ürünler)
router.get('/products/:slug/related', (req, res) => {
  const db = dbModule.getDb();
  const slug = req.params.slug;
  
  db.get(
    `SELECT p.id, p.category_id 
     FROM products p 
     WHERE p.slug = ? AND p.is_active = 1`,
    [slug],
    (err, product) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      if (!product) {
        return res.status(404).json({ error: 'Ürün bulunamadı' });
      }
      
      // Aynı kategorideki diğer ürünleri getir (maksimum 4 adet)
      db.all(
        `SELECT p.*, c.name as category_name 
         FROM products p 
         LEFT JOIN categories c ON p.category_id = c.id 
         WHERE p.category_id = ? AND p.id != ? AND p.is_active = 1 
         ORDER BY p.order_index ASC 
         LIMIT 4`,
        [product.category_id, product.id],
        (err, relatedProducts) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          res.json(relatedProducts || []);
        }
      );
    }
  );
});

// Ürün beğeni sayısı
router.get('/products/:slug/likes', (req, res) => {
  const db = dbModule.getDb();
  const slug = req.params.slug;
  
  db.get('SELECT id FROM products WHERE slug = ? AND is_active = 1', [slug], (err, product) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (!product) {
      return res.status(404).json({ error: 'Ürün bulunamadı' });
    }
    
    db.get(
      'SELECT like_count FROM product_likes WHERE product_id = ?',
      [product.id],
      (err, like) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.json({ like_count: like ? like.like_count : 0 });
      }
    );
  });
});

// Ürün beğenisi artır
router.post('/products/:slug/like', (req, res) => {
  const db = dbModule.getDb();
  const slug = req.params.slug;
  
  db.get('SELECT id FROM products WHERE slug = ? AND is_active = 1', [slug], (err, product) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (!product) {
      return res.status(404).json({ error: 'Ürün bulunamadı' });
    }
    
    // Mevcut beğeni sayısını kontrol et
    db.get(
      'SELECT like_count FROM product_likes WHERE product_id = ?',
      [product.id],
      (err, existing) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        
        const newCount = existing ? existing.like_count + 1 : 1;
        
        // INSERT OR REPLACE kullanarak güncelle
        db.run(
          'INSERT OR REPLACE INTO product_likes (product_id, like_count, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
          [product.id, newCount],
          (err) => {
            if (err) {
              return res.status(500).json({ error: err.message });
            }
            res.json({ like_count: newCount });
          }
        );
      });
  });
});

// Yeni mesaj/not bırak
router.post('/messages', (req, res) => {
  try {
    const db = dbModule.getDb();
    const { name, email, phone, subject, message, product_id } = req.body;
    
    if (!name || !message) {
      return res.status(400).json({ error: 'İsim ve mesaj alanları zorunludur.' });
    }
    
    db.run(
      'INSERT INTO messages (product_id, name, email, phone, subject, message) VALUES (?, ?, ?, ?, ?, ?)',
      [
        product_id ? parseInt(product_id, 10) : null,
        name,
        email || null,
        phone || null,
        subject || null,
        message
      ],
      function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.json({ success: true, messageId: this.lastID });
      }
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

