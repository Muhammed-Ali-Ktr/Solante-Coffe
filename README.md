# QR Menü Sistemi

Profesyonel bir QR Menü Sistemi. Restoranlar için modern, kullanıcı dostu ve yönetilebilir bir dijital menü çözümü.

## 🚀 Özellikler

### Kullanıcı Tarafı
- ✅ Kategori bazlı ürün listeleme
- ✅ Ürün detay sayfaları
- ✅ SEO uyumlu URL yapısı (slug sistemi)
- ✅ Mobil uyumlu responsive tasarım
- ✅ Koyu/Açık tema desteği
- ✅ Modern ve temiz UI/UX
- ✅ Hızlı yükleme ve performans

### Admin Paneli
- ✅ Güvenli admin girişi (JWT authentication)
- ✅ Kategori yönetimi (CRUD)
- ✅ Ürün yönetimi (CRUD)
- ✅ Fotoğraf yükleme sistemi
- ✅ Sıralama ayarları
- ✅ Aktif/Pasif durum yönetimi
- ✅ Dashboard istatistikleri
- ✅ Modern admin panel tasarımı

## 📋 Gereksinimler

- Node.js (v14 veya üzeri)
- npm veya yarn

## 🔧 Kurulum

1. **Projeyi klonlayın veya indirin**

```bash
cd "QR WEB 2"
```

2. **Bağımlılıkları yükleyin**

```bash
npm install
```

3. **Veritabanı otomatik oluşturulacak**

İlk çalıştırmada SQLite veritabanı ve gerekli tablolar otomatik olarak oluşturulacaktır.

4. **Sunucuyu başlatın**

```bash
npm start
```

veya geliştirme modu için:

```bash
npm run dev
```

5. **Tarayıcıda açın**

- Ana sayfa: http://localhost:3000
- Admin paneli: http://localhost:3000/yonetim

## 🔐 Varsayılan Admin Giriş Bilgileri

- **Kullanıcı Adı:** `yonetim`
- **Şifre:** `Yonetim*123`

⚠️ **Güvenlik:** İlk girişten sonra şifrenizi değiştirmeniz önerilir.

## 📁 Proje Yapısı

```
project/
├── public/
│   ├── css/
│   │   ├── style.css          # Ana site stilleri
│   │   └── admin.css          # Admin panel stilleri
│   ├── js/
│   │   ├── main.js            # Ana sayfa JavaScript
│   │   ├── product.js         # Ürün detay JavaScript
│   │   ├── admin-login.js    # Admin giriş JavaScript
│   │   ├── admin-dashboard.js # Dashboard JavaScript
│   │   ├── admin-categories.js # Kategori yönetimi JavaScript
│   │   └── admin-products.js  # Ürün yönetimi JavaScript
│   ├── images/                # Statik görseller
│   └── uploads/               # Yüklenen ürün fotoğrafları
├── views/
│   ├── index.html             # Ana sayfa
│   ├── product.html           # Ürün detay sayfası
│   └── admin/
│       ├── login.html         # Admin giriş sayfası
│       ├── dashboard.html     # Dashboard
│       ├── categories.html    # Kategori yönetimi
│       └── products.html      # Ürün yönetimi
├── server/
│   ├── routes/
│   │   ├── api.js            # Public API routes
│   │   └── admin.js          # Admin API routes
│   ├── models/
│   │   └── database.js        # Database modelleri
│   └── middleware/
│       └── auth.js            # Authentication middleware
├── database/
│   └── menu.db               # SQLite veritabanı (otomatik oluşur)
├── package.json
├── server.js                  # Ana sunucu dosyası
└── README.md
```

## 🛠️ API Endpoints

### Public API

- `GET /api/restaurant` - Restoran bilgileri
- `GET /api/categories` - Tüm kategoriler (aktif)
- `GET /api/products` - Tüm ürünler (aktif)
- `GET /api/products/:slug` - Ürün detayı
- `GET /api/categories/:slug/products` - Kategoriye göre ürünler

### Admin API (Authentication gerekli)

- `POST /api/admin/login` - Admin girişi
- `GET /api/admin/categories` - Tüm kategoriler
- `POST /api/admin/categories` - Kategori ekle
- `PUT /api/admin/categories/:id` - Kategori güncelle
- `DELETE /api/admin/categories/:id` - Kategori sil
- `GET /api/admin/products` - Tüm ürünler
- `POST /api/admin/products` - Ürün ekle
- `PUT /api/admin/products/:id` - Ürün güncelle
- `DELETE /api/admin/products/:id` - Ürün sil

## 🎨 Tema Özelleştirme

Tema renkleri `public/css/style.css` dosyasındaki CSS değişkenlerinden özelleştirilebilir:

```css
:root {
    --primary-color: #2563eb;
    --secondary-color: #64748b;
    /* ... diğer renkler */
}
```

## 📱 Mobil Uyumluluk

Tüm sayfalar responsive tasarıma sahiptir ve mobil cihazlarda mükemmel çalışır.

## 🔒 Güvenlik

- JWT token tabanlı authentication
- Bcrypt ile şifre hashleme
- SQL injection koruması (parametreli sorgular)
- Dosya yükleme validasyonu
- CORS yapılandırması

## 🐛 Sorun Giderme

### Veritabanı hatası
- `database/` klasörünün yazılabilir olduğundan emin olun
- Veritabanı dosyasını silip yeniden oluşturmayı deneyin

### Fotoğraf yükleme hatası
- `public/uploads/` klasörünün var olduğundan ve yazılabilir olduğundan emin olun

### Port hatası
- `.env` dosyasında farklı bir port belirleyin veya `server.js` dosyasındaki PORT değişkenini değiştirin

## 📝 Lisans

Bu proje özel kullanım için geliştirilmiştir.

## 👨‍💻 Geliştirici Notları

- Veritabanı ilk çalıştırmada otomatik oluşturulur ve demo veriler eklenir
- Tüm API istekleri JSON formatında
- Admin paneli token tabanlı çalışır (24 saat geçerlilik)
- Slug sistemi Türkçe karakterleri otomatik dönüştürür

## 🚀 Geliştirme

Geliştirme modunda çalıştırmak için:

```bash
npm run dev
```

Bu komut nodemon kullanarak otomatik yeniden başlatma sağlar.

## 📞 Destek

Herhangi bir sorun veya öneri için lütfen iletişime geçin.

---

**Not:** Bu sistem production ortamında kullanılmadan önce güvenlik ayarlarının gözden geçirilmesi önerilir.

