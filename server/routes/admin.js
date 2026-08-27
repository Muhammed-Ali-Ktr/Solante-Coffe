const express = require('express');
const { parseChefPicksStorage, serializeChefPicksStorage } = require('../utils/chef-picks');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const slugify = require('slugify');
const { authenticateToken, JWT_SECRET } = require('../middleware/auth');
const dbModule = require('../models/database');

// Multer yapılandırması - dosya yükleme
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../public/uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Sadece resim dosyaları yüklenebilir!'));
    }
  }
});

// Slug oluşturma fonksiyonu
const createSlug = (text) => {
  return slugify(text, {
    lower: true,
    strict: true,
    locale: 'tr'
  });
};

// Admin giriş
router.post('/login', async (req, res) => {
  try {
    const db = dbModule.getDb();
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Kullanıcı adı ve şifre gerekli' });
    }
    
    db.get('SELECT * FROM admins WHERE username = ?', [username], async (err, admin) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      if (!admin) {
        return res.status(401).json({ error: 'Geçersiz kullanıcı adı veya şifre' });
      }
      
      const validPassword = await bcrypt.compare(password, admin.password);
      if (!validPassword) {
        return res.status(401).json({ error: 'Geçersiz kullanıcı adı veya şifre' });
      }
      
      // Token süresini 1 saate düşür (her girişte şifre istenmesi için)
      const token = jwt.sign(
        { id: admin.id, username: admin.username },
        JWT_SECRET,
        { expiresIn: '1h' }
      );
      
      res.json({ token, username: admin.username });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin profil bilgisi
router.get('/profile', authenticateToken, (req, res) => {
  const db = dbModule.getDb();
  db.get('SELECT id, username FROM admins WHERE id = ?', [req.user.id], (err, admin) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!admin) {
      return res.status(404).json({ error: 'Admin bulunamadı' });
    }
    res.json(admin);
  });
});

// Admin kullanıcı adı/şifre güncelle
router.post('/account/change-credentials', authenticateToken, async (req, res) => {
  try {
    const db = dbModule.getDb();
    const {
      current_password,
      current_password_confirm,
      new_username,
      new_password,
      new_password_confirm
    } = req.body;

    if (!current_password || !current_password_confirm) {
      return res.status(400).json({ error: 'Mevcut şifre ve tekrarı zorunludur' });
    }
    if (current_password !== current_password_confirm) {
      return res.status(400).json({ error: 'Mevcut şifre tekrarı eşleşmiyor' });
    }

    const trimmedUsername = (new_username || '').trim();
    const hasUsernameUpdate = trimmedUsername.length > 0;
    const hasPasswordUpdate = !!new_password;

    if (!hasUsernameUpdate && !hasPasswordUpdate) {
      return res.status(400).json({ error: 'Yeni kullanıcı adı veya yeni şifre girin' });
    }
    if (hasPasswordUpdate && new_password !== new_password_confirm) {
      return res.status(400).json({ error: 'Yeni şifre tekrarı eşleşmiyor' });
    }
    if (hasPasswordUpdate && new_password.length < 6) {
      return res.status(400).json({ error: 'Yeni şifre en az 6 karakter olmalı' });
    }

    db.get('SELECT * FROM admins WHERE id = ?', [req.user.id], async (err, admin) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (!admin) {
        return res.status(404).json({ error: 'Admin bulunamadı' });
      }

      const validCurrentPassword = await bcrypt.compare(current_password, admin.password);
      if (!validCurrentPassword) {
        return res.status(401).json({ error: 'Mevcut şifre hatalı' });
      }

      const nextUsername = hasUsernameUpdate ? trimmedUsername : admin.username;
      const updates = [];
      const params = [];

      if (hasUsernameUpdate && trimmedUsername !== admin.username) {
        updates.push('username = ?');
        params.push(trimmedUsername);
      }

      if (hasPasswordUpdate) {
        const hashedPassword = await bcrypt.hash(new_password, 10);
        updates.push('password = ?');
        params.push(hashedPassword);
      }

      if (updates.length === 0) {
        const token = jwt.sign(
          { id: admin.id, username: admin.username },
          JWT_SECRET,
          { expiresIn: '1h' }
        );
        return res.json({ message: 'Değişiklik yok', token, username: admin.username });
      }

      const query = `UPDATE admins SET ${updates.join(', ')} WHERE id = ?`;
      params.push(req.user.id);

      db.run(query, params, function(updateErr) {
        if (updateErr) {
          if (updateErr.message && updateErr.message.includes('UNIQUE')) {
            return res.status(400).json({ error: 'Bu kullanıcı adı zaten kullanılıyor' });
          }
          return res.status(500).json({ error: updateErr.message });
        }

        const token = jwt.sign(
          { id: req.user.id, username: nextUsername },
          JWT_SECRET,
          { expiresIn: '1h' }
        );
        res.json({
          message: 'Hesap bilgileri başarıyla güncellendi',
          token,
          username: nextUsername
        });
      });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Kategoriler - Tümünü getir
router.get('/categories', authenticateToken, (req, res) => {
  const db = dbModule.getDb();
  db.all('SELECT * FROM categories ORDER BY order_index ASC', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Kategori ekle
router.post('/categories', authenticateToken, upload.single('image'), (req, res) => {
  const db = dbModule.getDb();
  const { name, description, order_index, is_active } = req.body;
  const slug = createSlug(name);
  const image = req.file ? `/uploads/${req.file.filename}` : null;
  
  db.run(
    'INSERT INTO categories (name, slug, description, image, order_index, is_active) VALUES (?, ?, ?, ?, ?, ?)',
    [name, slug, description || null, image, order_index || 0, is_active !== undefined ? is_active : 1],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ id: this.lastID, message: 'Kategori başarıyla eklendi' });
    }
  );
});

// Kategori güncelle
router.put('/categories/:id', authenticateToken, upload.single('image'), (req, res) => {
  const db = dbModule.getDb();
  const { id } = req.params;
  const { name, description, order_index, is_active } = req.body;
  const slug = name ? createSlug(name) : null;
  
  let query = 'UPDATE categories SET ';
  const params = [];
  const updates = [];
  
  if (name) {
    updates.push('name = ?');
    updates.push('slug = ?');
    params.push(name, slug);
  }
  if (description !== undefined) {
    updates.push('description = ?');
    params.push(description);
  }
  if (order_index !== undefined) {
    updates.push('order_index = ?');
    params.push(order_index);
  }
  if (is_active !== undefined) {
    updates.push('is_active = ?');
    params.push(is_active);
  }
  if (req.file) {
    updates.push('image = ?');
    params.push(`/uploads/${req.file.filename}`);
  }
  
  query += updates.join(', ') + ' WHERE id = ?';
  params.push(id);
  
  db.run(query, params, function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: 'Kategori başarıyla güncellendi' });
  });
});

// Kategori sil
router.delete('/categories/:id', authenticateToken, (req, res) => {
  const db = dbModule.getDb();
  const { id } = req.params;
  
  // Önce bu kategoriye ait ürünleri kontrol et
  db.get('SELECT COUNT(*) as count FROM products WHERE category_id = ?', [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (row.count > 0) {
      return res.status(400).json({ error: 'Bu kategoriye ait ürünler var. Önce ürünleri silin veya başka kategoriye taşıyın.' });
    }
    
    db.run('DELETE FROM categories WHERE id = ?', [id], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: 'Kategori başarıyla silindi' });
    });
  });
});

// Kategori sıralama güncelle
router.post('/categories/order', authenticateToken, (req, res) => {
  const db = dbModule.getDb();
  const { categories } = req.body;
  
  if (!categories || !Array.isArray(categories)) {
    return res.status(400).json({ error: 'Geçersiz kategori listesi' });
  }
  
  const updatePromises = categories.map((cat, index) => {
    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE categories SET order_index = ? WHERE id = ?',
        [index, cat.id],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  });
  
  Promise.all(updatePromises)
    .then(() => {
      res.json({ message: 'Kategori sıralaması güncellendi' });
    })
    .catch((err) => {
      res.status(500).json({ error: err.message });
    });
});

// Ürünler - Tümünü getir
router.get('/products', authenticateToken, (req, res) => {
  const db = dbModule.getDb();
  db.all(
    `SELECT p.*, c.name as category_name 
     FROM products p 
     LEFT JOIN categories c ON p.category_id = c.id 
     ORDER BY p.order_index ASC, p.name ASC`,
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(rows);
    }
  );
});

// Ürün ekle
router.post('/products', authenticateToken, upload.single('image'), (req, res) => {
  const db = dbModule.getDb();
  const { name, description, price, category_id, order_index, is_active } = req.body;
  const slug = createSlug(name);
  const image = req.file ? `/uploads/${req.file.filename}` : null;
  
  db.run(
    'INSERT INTO products (name, slug, description, price, category_id, image, order_index, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [name, slug, description || null, price, category_id || null, image, order_index || 0, is_active !== undefined ? is_active : 1],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ id: this.lastID, message: 'Ürün başarıyla eklendi' });
    }
  );
});

// Ürün güncelle
router.put('/products/:id', authenticateToken, upload.single('image'), (req, res) => {
  const db = dbModule.getDb();
  const { id } = req.params;
  const { name, description, price, category_id, order_index, is_active } = req.body;
  const slug = name ? createSlug(name) : null;
  
  let query = 'UPDATE products SET ';
  const params = [];
  const updates = [];
  
  if (name) {
    updates.push('name = ?');
    updates.push('slug = ?');
    params.push(name, slug);
  }
  if (description !== undefined) {
    updates.push('description = ?');
    params.push(description);
  }
  if (price !== undefined) {
    updates.push('price = ?');
    params.push(price);
  }
  if (category_id !== undefined) {
    updates.push('category_id = ?');
    params.push(category_id);
  }
  if (order_index !== undefined) {
    updates.push('order_index = ?');
    params.push(order_index);
  }
  if (is_active !== undefined) {
    updates.push('is_active = ?');
    params.push(is_active);
  }
  if (req.file) {
    updates.push('image = ?');
    params.push(`/uploads/${req.file.filename}`);
  }
  
  query += updates.join(', ') + ' WHERE id = ?';
  params.push(id);
  
  db.run(query, params, function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: 'Ürün başarıyla güncellendi' });
  });
});

// Ürün sil
router.delete('/products/:id', authenticateToken, (req, res) => {
  const db = dbModule.getDb();
  const { id } = req.params;
  
  db.run('DELETE FROM products WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: 'Ürün başarıyla silindi' });
  });
});

// Ürün toplu işlem (sil / aktif / pasif)
router.post('/products/bulk', authenticateToken, (req, res) => {
  try {
    const db = dbModule.getDb();
    const { ids, action } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'En az bir ürün seçmelisiniz' });
    }

    const validIds = [...new Set(ids.map((id) => parseInt(id, 10)).filter((id) => !isNaN(id)))];
    if (validIds.length === 0) {
      return res.status(400).json({ error: 'Geçersiz ürün seçimi' });
    }

    const placeholders = validIds.map(() => '?').join(',');

    if (action === 'delete') {
      db.run(`DELETE FROM products WHERE id IN (${placeholders})`, validIds, function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.json({
          message: `${this.changes} ürün silindi`,
          count: this.changes
        });
      });
      return;
    }

    if (action === 'activate' || action === 'deactivate') {
      const isActive = action === 'activate' ? 1 : 0;
      db.run(
        `UPDATE products SET is_active = ? WHERE id IN (${placeholders})`,
        [isActive, ...validIds],
        function(err) {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          res.json({
            message: `${this.changes} ürün ${isActive ? 'aktif' : 'pasif'} edildi`,
            count: this.changes
          });
        }
      );
      return;
    }

    res.status(400).json({ error: 'Geçersiz toplu işlem' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Settings - Get all
router.get('/settings', authenticateToken, (req, res) => {
  try {
    const db = dbModule.getDb();
    db.all('SELECT * FROM settings', [], (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(rows);
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Settings - Update company info
router.post('/settings/company', authenticateToken, upload.fields([
  { name: 'logo', maxCount: 1 },
  { name: 'icon', maxCount: 1 },
  { name: 'qr_code_image', maxCount: 1 }
]), (req, res) => {
  try {
    const db = dbModule.getDb();
    console.log('POST /settings/company req.body:', req.body);
    const { company_name, slogan, menu_url, restaurant_name, restaurant_slogan, admin_brand_text, wifi_name, wifi_password } = req.body;
    
    const updateSetting = (key, value) => {
      return new Promise((resolve, reject) => {
        db.run('INSERT INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP',
          [key, value !== undefined && value !== null ? String(value) : ''],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
    };

    const resolvedName = restaurant_name || company_name;
    const resolvedSlogan = restaurant_slogan || slogan || '';

    const settingsToUpdate = [
      { key: 'company_name', val: company_name || resolvedName || '' },
      { key: 'company_slogan', val: slogan || resolvedSlogan || '' },
      { key: 'restaurant_name', val: resolvedName || company_name || '' },
      { key: 'restaurant_slogan', val: resolvedSlogan || '' }
    ];

    if (wifi_name !== undefined) {
      settingsToUpdate.push({ key: 'wifi_name', val: wifi_name });
    }
    if (wifi_password !== undefined) {
      settingsToUpdate.push({ key: 'wifi_password', val: wifi_password });
    }
    if (menu_url) {
      settingsToUpdate.push({ key: 'menu_url', val: menu_url });
    }
    if (admin_brand_text !== undefined) {
      settingsToUpdate.push({ key: 'admin_brand_text', val: admin_brand_text || 'ZİFT STUDİO' });
    }

    (async () => {
      for (const item of settingsToUpdate) {
        await updateSetting(item.key, item.val);
      }
      if (req.files?.logo) {
        const logoPath = `/uploads/${req.files.logo[0].filename}`;
        await updateSetting('company_logo', logoPath);
        await updateSetting('restaurant_logo', logoPath);
      }
      if (req.files?.icon) {
        const iconPath = `/uploads/${req.files.icon[0].filename}`;
        await updateSetting('company_icon', iconPath);
        await updateSetting('restaurant_icon', iconPath);
      }
      if (req.files?.qr_code_image) {
        await updateSetting('qr_code_image', `/uploads/${req.files.qr_code_image[0].filename}`);
      }
      res.json({ message: 'Firma bilgileri güncellendi' });
    })().catch(err => {
      res.status(500).json({ error: err.message });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Settings - Update design options
router.post('/settings/design', authenticateToken, upload.fields([
  { name: 'qr_code_image', maxCount: 1 }
]), (req, res) => {
  try {
    const db = dbModule.getDb();
    const {
      primary_color,
      hover_color,
      header_color,
      back_button_enabled,
      desktop_logo_width,
      tablet_logo_width,
      mobile_logo_width,
      menu_background_color,
      text_color,
      border_radius,
      font_family,
      section_spacing,
      menu_url
    } = req.body;
    
    const updateSetting = (key, value) => {
      return new Promise((resolve, reject) => {
        db.run('INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
          [key, value],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
    };

    const promises = [
      updateSetting('primary_color', primary_color),
      updateSetting('hover_color', hover_color),
      updateSetting('header_color', header_color),
      updateSetting('back_button_enabled', back_button_enabled),
      updateSetting('desktop_logo_width', desktop_logo_width),
      updateSetting('tablet_logo_width', tablet_logo_width),
      updateSetting('mobile_logo_width', mobile_logo_width)
    ];

    if (menu_background_color !== undefined && menu_background_color !== '') {
      promises.push(updateSetting('menu_background_color', menu_background_color));
    }
    if (text_color !== undefined && text_color !== '') {
      promises.push(updateSetting('text_color', text_color));
    }
    if (border_radius !== undefined && border_radius !== '') {
      promises.push(updateSetting('border_radius', border_radius));
    }
    if (font_family !== undefined && font_family !== '') {
      promises.push(updateSetting('font_family', font_family));
    }
    if (section_spacing !== undefined && section_spacing !== '') {
      promises.push(updateSetting('section_spacing', section_spacing));
    }
    
    if (menu_url) {
      promises.push(updateSetting('menu_url', menu_url));
    }
    if (req.files?.qr_code_image) {
      promises.push(updateSetting('qr_code_image', `/uploads/${req.files.qr_code_image[0].filename}`));
    }

    Promise.all(promises).then(() => {
      res.json({ message: 'Tasarım ayarları güncellendi' });
    }).catch(err => {
      res.status(500).json({ error: err.message });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Media - Get all
router.get('/media', authenticateToken, (req, res) => {
  try {
    const db = dbModule.getDb();
    db.all('SELECT * FROM media ORDER BY created_at DESC', [], (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(rows);
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Media - Upload
router.post('/media', authenticateToken, upload.array('files', 10), (req, res) => {
  try {
    const db = dbModule.getDb();
    const files = req.files || [];
    
    if (files.length === 0) {
      return res.status(400).json({ error: 'Dosya seçilmedi' });
    }

    const insertPromises = files.map(file => {
      return new Promise((resolve, reject) => {
        db.run('INSERT INTO media (filename, path, mime_type, size, uploaded_by) VALUES (?, ?, ?, ?, ?)',
          [file.originalname, `/uploads/${file.filename}`, file.mimetype, file.size, req.user.id],
          function(err) {
            if (err) reject(err);
            else resolve({ id: this.lastID, filename: file.originalname, path: `/uploads/${file.filename}` });
          }
        );
      });
    });

    Promise.all(insertPromises).then(results => {
      res.json({ message: 'Dosyalar yüklendi', files: results });
    }).catch(err => {
      res.status(500).json({ error: err.message });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Media - Delete
router.delete('/media/:id', authenticateToken, (req, res) => {
  try {
    const db = dbModule.getDb();
    const { id } = req.params;
    
    db.get('SELECT * FROM media WHERE id = ?', [id], (err, row) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (!row) {
        return res.status(404).json({ error: 'Medya bulunamadı' });
      }
      
      const filePath = path.join(__dirname, '../../public', row.path);
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (fsErr) {
        console.error('File delete error:', fsErr);
      }
      
      db.run('DELETE FROM media WHERE id = ?', [id], function(delErr) {
        if (delErr) {
          return res.status(500).json({ error: delErr.message });
        }
        res.json({ message: 'Medya dosyası başarıyla silindi' });
      });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Media - Bulk Delete
router.post('/media/bulk-delete', authenticateToken, (req, res) => {
  try {
    const db = dbModule.getDb();
    const { ids } = req.body;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'En az bir medya seçmelisiniz' });
    }
    
    const validIds = [...new Set(ids.map(id => parseInt(id, 10)).filter(id => !isNaN(id)))];
    if (validIds.length === 0) {
      return res.status(400).json({ error: 'Geçersiz seçim' });
    }
    
    const placeholders = validIds.map(() => '?').join(',');
    
    db.all(`SELECT * FROM media WHERE id IN (${placeholders})`, validIds, (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      rows.forEach(row => {
        const filePath = path.join(__dirname, '../../public', row.path);
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (fsErr) {
          console.error('File delete error (bulk):', fsErr);
        }
      });
      
      db.run(`DELETE FROM media WHERE id IN (${placeholders})`, validIds, function(delErr) {
        if (delErr) {
          return res.status(500).json({ error: delErr.message });
        }
        res.json({ message: `${this.changes} adet medya dosyası silindi`, count: this.changes });
      });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Media - Get usage info
router.get('/media/:id/usage', authenticateToken, (req, res) => {
  try {
    const db = dbModule.getDb();
    const { id } = req.params;
    
    db.get('SELECT path FROM media WHERE id = ?', [id], (err, row) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (!row) {
        return res.status(404).json({ error: 'Medya bulunamadı' });
      }
      
      const mediaPath = row.path;
      const usage = {
        categories: [],
        products: [],
        banners: []
      };
      
      const checkCategories = new Promise((resolve) => {
        db.all('SELECT id, name FROM categories WHERE image = ?', [mediaPath], (err, rows) => {
          if (!err && rows) usage.categories = rows;
          resolve();
        });
      });
      
      const checkProducts = new Promise((resolve) => {
        db.all('SELECT id, name FROM products WHERE image = ?', [mediaPath], (err, rows) => {
          if (!err && rows) usage.products = rows;
          resolve();
        });
      });
      
      const checkBanners = new Promise((resolve) => {
        db.all('SELECT id, title FROM banners WHERE image = ?', [mediaPath], (err, rows) => {
          if (!err && rows) usage.banners = rows;
          resolve();
        });
      });
      
      Promise.all([checkCategories, checkProducts, checkBanners]).then(() => {
        res.json(usage);
      }).catch(err => {
        res.status(500).json({ error: err.message });
      });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// Banners - Get all
router.get('/banners', authenticateToken, (req, res) => {
  try {
    const db = dbModule.getDb();
    db.all('SELECT * FROM banners ORDER BY order_index ASC, created_at DESC', [], (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(rows);
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Banners - Create
router.post('/banners', authenticateToken, upload.single('image'), (req, res) => {
  try {
    const db = dbModule.getDb();
    const { title, description, link, order_index, is_active } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ error: 'Görsel gerekli' });
    }

    db.run('INSERT INTO banners (title, description, image, link, order_index, is_active) VALUES (?, ?, ?, ?, ?, ?)',
      [title || '', description || '', `/uploads/${req.file.filename}`, link || '', order_index || 0, is_active || 1],
      function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.json({ id: this.lastID, message: 'Banner eklendi' });
      }
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Banners - Update
router.put('/banners/:id', authenticateToken, upload.single('image'), (req, res) => {
  try {
    const db = dbModule.getDb();
    const { id } = req.params;
    const { title, description, link, order_index, is_active } = req.body;
    
    let updateQuery = 'UPDATE banners SET title = ?, description = ?, link = ?, order_index = ?, is_active = ?';
    let params = [title || '', description || '', link || '', order_index || 0, is_active || 1];

    if (req.file) {
      updateQuery += ', image = ?';
      params.push(`/uploads/${req.file.filename}`);
    }

    updateQuery += ' WHERE id = ?';
    params.push(id);

    db.run(updateQuery, params, function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: 'Banner güncellendi' });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Banners - Delete
router.delete('/banners/:id', authenticateToken, (req, res) => {
  try {
    const db = dbModule.getDb();
    const { id } = req.params;
    db.run('DELETE FROM banners WHERE id = ?', [id], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: 'Banner silindi' });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Social Media - Get all
router.get('/social-media', authenticateToken, (req, res) => {
  try {
    const db = dbModule.getDb();
    db.all('SELECT * FROM social_media', [], (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(rows);
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Social Media - Update
router.post('/social-media', authenticateToken, (req, res) => {
  try {
    const db = dbModule.getDb();
    const { instagram, facebook, youtube, twitter, tiktok, website, whatsapp, whatsapp_button_enabled, menu_url } = req.body;
    
    const platforms = [
      { platform: 'instagram', url: instagram },
      { platform: 'facebook', url: facebook },
      { platform: 'youtube', url: youtube },
      { platform: 'twitter', url: twitter },
      { platform: 'tiktok', url: tiktok },
      { platform: 'website', url: website },
      { platform: 'whatsapp', url: whatsapp }
    ];

    const updatePromises = platforms.map(({ platform, url }) => {
      return new Promise((resolve, reject) => {
        db.run('INSERT OR REPLACE INTO social_media (platform, url, is_active) VALUES (?, ?, 1)',
          [platform, url || ''],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
    });

    const allPromises = [...updatePromises];
    
    // Update WhatsApp button setting
    allPromises.push(new Promise((resolve, reject) => {
      db.run('INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
        ['whatsapp_button_enabled', whatsapp_button_enabled || '0'],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    }));
    
    // Update menu URL if provided
    if (menu_url) {
      allPromises.push(new Promise((resolve, reject) => {
        db.run('INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
          ['menu_url', menu_url],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      }));
    }

    Promise.all(allPromises).then(() => {
      res.json({ message: 'Sosyal medya ayarları güncellendi' });
    }).catch(err => {
      res.status(500).json({ error: err.message });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delivery Companies - Get all
router.get('/delivery-companies', authenticateToken, (req, res) => {
  try {
    const db = dbModule.getDb();
    db.all('SELECT * FROM delivery_companies ORDER BY order_index ASC', [], (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(rows);
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delivery Companies - Update
router.post('/delivery-companies', authenticateToken, (req, res) => {
  try {
    const db = dbModule.getDb();
    const companies = [
      { name: 'Yemek Sepeti', url: req.body.yemek_sepeti },
      { name: 'Getir Yemek', url: req.body.getir_yemek },
      { name: 'Trendyol Yemek', url: req.body.trendyol_yemek },
      { name: 'Migros Yemek', url: req.body.migros_yemek },
      { name: 'Tıkla Gelsin', url: req.body.tikla_gelsin },
      { name: 'İste Gelsin', url: req.body.iste_gelsin }
    ];

    const updatePromises = companies.map((company, index) => {
      return new Promise((resolve, reject) => {
        db.run('INSERT OR REPLACE INTO delivery_companies (name, url, order_index, is_active) VALUES (?, ?, ?, 1)',
          [company.name, company.url || '', index],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
    });
    
    // Update menu URL if provided
    if (req.body.menu_url) {
      updatePromises.push(new Promise((resolve, reject) => {
        db.run('INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
          ['menu_url', req.body.menu_url],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      }));
    }

    Promise.all(updatePromises).then(() => {
      res.json({ message: 'Aracı firmalar güncellendi' });
    }).catch(err => {
      res.status(500).json({ error: err.message });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Promotions - Get (en güncel kayıt)
router.get('/promotions', authenticateToken, (req, res) => {
  try {
    const db = dbModule.getDb();
    db.get(
      'SELECT * FROM promotions WHERE section_name = ? ORDER BY id DESC LIMIT 1',
      ['chef_picks'],
      (err, row) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        if (!row) {
          return res.json({ title_tr: 'Şefin Önerileri', title_en: "Chef's Picks", category_picks: {} });
        }
        const { byCategory } = parseChefPicksStorage(row.product_ids || '');
        res.json({
          ...row,
          category_picks: byCategory
        });
      }
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Promotions - Update (tek satır: güncelle veya ekle)
router.post('/promotions', authenticateToken, (req, res) => {
  try {
    const db = dbModule.getDb();
    const { title_tr, title_en, product_ids, category_picks, menu_url } = req.body;

    let storageValue = product_ids || '';
    if (category_picks && typeof category_picks === 'object') {
      storageValue = serializeChefPicksStorage(category_picks);
    }

    const savePromotion = () =>
      new Promise((resolve, reject) => {
        db.get(
          'SELECT id FROM promotions WHERE section_name = ? ORDER BY id DESC LIMIT 1',
          ['chef_picks'],
          (err, existing) => {
            if (err) return reject(err);
            if (existing) {
              db.run(
                'UPDATE promotions SET title_tr = ?, title_en = ?, product_ids = ?, is_active = 1 WHERE id = ?',
                [title_tr, title_en, storageValue, existing.id],
                (updateErr) => (updateErr ? reject(updateErr) : resolve())
              );
            } else {
              db.run(
                'INSERT INTO promotions (section_name, title_tr, title_en, product_ids, is_active) VALUES (?, ?, ?, ?, 1)',
                ['chef_picks', title_tr, title_en, storageValue],
                (insertErr) => (insertErr ? reject(insertErr) : resolve())
              );
            }
          }
        );
      });

    const updatePromises = [savePromotion()];
    
    // Update menu URL if provided
    if (menu_url) {
      updatePromises.push(new Promise((resolve, reject) => {
        db.run('INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
          ['menu_url', menu_url],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      }));
    }
    
    Promise.all(updatePromises).then(() => {
      res.json({ message: 'Tanıtım alanları güncellendi' });
    }).catch(err => {
      res.status(500).json({ error: err.message });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Messages - Get all
router.get('/messages', authenticateToken, (req, res) => {
  try {
    const db = dbModule.getDb();
    db.all(
      `SELECT m.*, p.name as product_name, p.image as product_image 
       FROM messages m 
       LEFT JOIN products p ON m.product_id = p.id 
       ORDER BY m.created_at DESC`,
      [],
      (err, rows) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.json(rows);
      }
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Messages - Get by ID
router.get('/messages/:id', authenticateToken, (req, res) => {
  try {
    const db = dbModule.getDb();
    const { id } = req.params;
    db.get('SELECT * FROM messages WHERE id = ?', [id], (err, row) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (!row) {
        return res.status(404).json({ error: 'Mesaj bulunamadı' });
      }
      res.json(row);
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Messages - Mark as read
router.put('/messages/:id/read', authenticateToken, (req, res) => {
  try {
    const db = dbModule.getDb();
    const { id } = req.params;
    db.run('UPDATE messages SET is_read = 1 WHERE id = ?', [id], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: 'Mesaj okundu olarak işaretlendi' });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Messages - Delete
router.delete('/messages/:id', authenticateToken, (req, res) => {
  try {
    const db = dbModule.getDb();
    const { id } = req.params;
    db.run('DELETE FROM messages WHERE id = ?', [id], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: 'Mesaj başarıyla silindi' });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== ALLERGEN & NUTRITIONAL VALUES ENDPOINTS =====

// Ürünün allergenlerini getir (admin)
router.get('/products/:id/allergens', authenticateToken, (req, res) => {
  try {
    const db = dbModule.getDb();
    const { id } = req.params;
    
    db.all(
      'SELECT * FROM product_allergens WHERE product_id = ? ORDER BY order_index ASC',
      [id],
      (err, rows) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.json(rows || []);
      }
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Ürünün besin değerlerini getir (admin)
router.get('/products/:id/nutritional-values', authenticateToken, (req, res) => {
  try {
    const db = dbModule.getDb();
    const { id } = req.params;
    
    db.all(
      'SELECT * FROM product_nutritional_values WHERE product_id = ? ORDER BY order_index ASC',
      [id],
      (err, rows) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.json(rows || []);
      }
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Allergen ve besin değerlerini kaydet
router.post('/products/:id/allergens-nutritional', authenticateToken, (req, res) => {
  try {
    const db = dbModule.getDb();
    const { id } = req.params;
    const { allergens, nutritional_values } = req.body;

    // Mevcut allergen ve besin değerlerini sil ve yenilerini ekle
    db.serialize(() => {
      // Önce sil
      db.run('DELETE FROM product_allergens WHERE product_id = ?', [id]);
      db.run('DELETE FROM product_nutritional_values WHERE product_id = ?', [id]);

      // Yeni alerjenleri ekle
      if (Array.isArray(allergens) && allergens.length > 0) {
        allergens.forEach((allergen, index) => {
          db.run(
            'INSERT INTO product_allergens (product_id, allergen_name, order_index) VALUES (?, ?, ?)',
            [id, allergen, index]
          );
        });
      }

      // Yeni besin değerlerini ekle
      if (Array.isArray(nutritional_values) && nutritional_values.length > 0) {
        nutritional_values.forEach((value, index) => {
          db.run(
            'INSERT INTO product_nutritional_values (product_id, nutrient_name, nutrient_value, unit, portion_size, order_index) VALUES (?, ?, ?, ?, ?, ?)',
            [id, value.nutrient_name, value.nutrient_value, value.unit, value.portion_size, index]
          );
        });
      }

      // Sonuç gönder
      db.run('SELECT 1', (err) => {
        if (err) {
          res.status(500).json({ error: err.message });
        } else {
          res.json({ message: 'Allergen ve besin değerleri başarıyla kaydedildi' });
        }
      });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

