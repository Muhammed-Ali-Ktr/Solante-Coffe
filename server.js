const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Routes
const apiRoutes = require('./server/routes/api');
const adminRoutes = require('./server/routes/admin');

app.use('/api', apiRoutes);
app.use('/api/admin', adminRoutes);

// Serve static HTML files - Must be after API routes but before catch-all
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.get('/urun/:slug', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'product.html'));
});

// Admin routes
app.get('/yonetim', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'admin', 'login.html'));
});

app.get('/yonetim/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'admin', 'dashboard.html'));
});

app.get('/yonetim/kategoriler', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'admin', 'categories.html'));
});

app.get('/yonetim/kategori-siralama', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'admin', 'category-sort.html'));
});

app.get('/yonetim/urunler', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'admin', 'products.html'));
});

app.get('/yonetim/bannerlar/ekle', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'admin', 'banners.html'));
});

app.get('/yonetim/bannerlar', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'admin', 'banners.html'));
});

app.get('/yonetim/media', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'admin', 'media.html'));
});

app.get('/yonetim/firma-bilgileri', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'admin', 'company-info.html'));
});

app.get('/yonetim/tasarim-secenekleri', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'admin', 'design-options.html'));
});

app.get('/yonetim/tanitim-alanlari', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'admin', 'promotions.html'));
});

app.get('/yonetim/sosyal-medya', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'admin', 'social-media.html'));
});

app.get('/yonetim/araci-firmalar', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'admin', 'delivery-companies.html'));
});

app.get('/yonetim/mesajlar', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'admin', 'messages.html'));
});

// Custom 404 Page handler
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'views', '404.html'));
});

// Initialize database
const db = require('./server/models/database');
db.init()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Server çalışıyor: http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ Veritabanı başlatılamadı:', err);
    process.exit(1);
  });

