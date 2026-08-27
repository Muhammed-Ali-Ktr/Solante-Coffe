/* Menü görünümü — referans tasarım (qrclaude) + mevcut API */

const API_BASE = '/api';
window.API_BASE = API_BASE;

/** Modal / rehber için sabit alerjen listesi (Türkçe isim eşlemesi) */
const ALLERGENS = [
  { names: ['gluten', 'glüten', 'buğday', 'bugday'], label: 'Gluten', icon: '🌾' },
  { names: ['süt', 'milk', 'laktoz', 'lactose'], label: 'Süt', icon: '🥛' },
  { names: ['yumurta', 'egg'], label: 'Yumurta', icon: '🥚' },
  { names: ['kuruyemiş', 'fıstık', 'fındık', 'nut', 'peanut'], label: 'Kuruyemiş', icon: '🥜' },
  { names: ['balık', 'fish'], label: 'Balık', icon: '🐟' },
  { names: ['kabuklu', 'shellfish', 'karides', 'istridye'], label: 'Kabuklu deniz', icon: '🦐' },
  { names: ['susam', 'sesame'], label: 'Susam', icon: '🫘' },
  { names: ['soya', 'soy'], label: 'Soya', icon: '🌱' },
  { names: ['sülfit', 'sulfite'], label: 'Sülfit', icon: '🧪' }
];

let currentLang = localStorage.getItem('language') || 'tr';

let cachedCategories = [];
let cachedProducts = [];
/** @type {Record<number, object>} */
let chefPicksByCategory = {};
let chefPicksTitle = { tr: 'Şefin Önerileri', en: "Chef's Recommendations" };
let currentPageName = 'menu';
let previousPageName = 'menu';
let cart = [];
let cachedDeliveryCompanies = [];
const CART_STORAGE_KEY = 'qr_menu_cart';

function adjustColor(hex, amount) {
  const h = (hex || '#6B2D8B').replace('#', '');
  const num = parseInt(h, 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amount));
  const b = Math.min(255, Math.max(0, (num & 0xff) + amount));
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

function hexToRgba(hex, alpha) {
  const h = (hex || '#6B2D8B').replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

function categoryIcon(name) {
  const n = (name || '').toLowerCase();
  if (n.includes('ara sıcak') || n.includes('ara sicak')) return '🧆';
  if (n.includes('ana yemek')) return '🍛';
  if (n.includes('börek') || n.includes('borek')) return '🥟';
  if (n.includes('pide')) return '🫓';
  if (n.includes('kebap')) return '🍢';
  if (n.includes('dürüm') || n.includes('durum') || n.includes('wrap')) return '🌯';
  if (n.includes('makarna') || n.includes('pasta')) return '🍝';
  if (n.includes('pilav') || n.includes('rice')) return '🍚';
  if (n.includes('sandviç') || n.includes('sandvic') || n.includes('sandwich')) return '🥪';
  if (n.includes('tost')) return '🧇';
  if (n.includes('aperatif') || n.includes('atıştır') || n.includes('atistir')) return '🍟';
  if (n.includes('çocuk') || n.includes('cocuk')) return '🧸';
  if (n.includes('içecek') || n.includes('icecek')) return '🥤';
  if (n.includes('kahve')) return '☕';
  if (n.includes('çay') || n.includes('cay')) return '🫖';
  if (n.includes('tatlı') || n.includes('tatli') || n.includes('dessert')) return '🍰';
  if (n.includes('dondurma')) return '🍨';
  if (n.includes('waffle') || n.includes('krep')) return '🧇';
  if (n.includes('salata')) return '🥗';
  if (n.includes('çorba') || n.includes('corba')) return '🍲';
  if (n.includes('burger') || n.includes('wrap')) return '🍔';
  if (n.includes('pizza')) return '🍕';
  if (n.includes('kahvaltı') || n.includes('kahvalti')) return '🥐';
  if (n.includes('balık') || n.includes('balik') || n.includes('deniz')) return '🐟';
  if (n.includes('et') || n.includes('ızgara') || n.includes('izgara')) return '🥩';
  if (n.includes('tavuk')) return '🍗';
  if (n.includes('vegan') || n.includes('vejeta')) return '🌱';
  return '🍽️';
}

const hashString = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash);
};

const getCategoryImage = (categoryName, categoryImage, categoryId = null) => {
  if (categoryImage && String(categoryImage).trim() !== '') return categoryImage;
  const categoryHash = hashString((categoryName || '').toLowerCase().trim());
  const seed = categoryId != null ? categoryId : categoryHash;
  return `https://picsum.photos/seed/category-${seed}/600/200`;
};

const formatPrice = (price) =>
  new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(Number(price) || 0);

const showToast = (message) => {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = message;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2200);
};

/* —— Dil —— */
const updateLanguage = (lang) => {
  currentLang = lang;
  document.documentElement.setAttribute('lang', lang);

  document.querySelectorAll('[data-tr]').forEach((el) => {
    const trText = el.getAttribute('data-tr');
    const enText = el.getAttribute('data-en');
    if (lang === 'tr' && trText != null) el.textContent = trText;
    else if (lang === 'en' && enText != null) el.textContent = enText;
  });

  const search = document.getElementById('searchInput');
  if (search) {
    search.placeholder = lang === 'tr' ? 'Arayın..' : 'Search..';
  }

  const flag = document.getElementById('langFlag');
  if (flag) flag.textContent = lang === 'tr' ? 'TR' : 'EN';

  updateCartUI();
};

const changeLanguage = (lang) => {
  localStorage.setItem('language', lang);
  updateLanguage(lang);
};

const initLanguage = () => {
  updateLanguage(currentLang);
};

/* —— Sayfa geçişi —— */
const showPage = (name) => {
  if (currentPageName !== name) previousPageName = currentPageName;
  currentPageName = name;
  document.querySelectorAll('.page').forEach((p) => p.classList.remove('active'));
  const next = document.getElementById('page-' + name);
  if (next) next.classList.add('active');
  const footer = document.getElementById('menuFooter');
  if (footer) footer.style.display = 'none';
  const cartBar = document.getElementById('cartBar');
  if (cartBar) cartBar.style.display = name === 'menu' && cart.length > 0 ? 'flex' : 'none';
  const pageMenu = document.getElementById('page-menu');
  if (pageMenu) pageMenu.classList.toggle('no-cart', cart.length === 0 || name !== 'menu');
  window.scrollTo(0, 0);
};

const goBack = () => {
  if (currentPageName === 'detail') {
    showPage('menu');
    return;
  }
  window.history.back();
};

/* —— Tasarım / restoran —— */
const loadDesignSettings = async () => {
  try {
    const response = await fetch(`${API_BASE}/design-settings`);
    if (!response.ok) return;
    const s = await response.json();
    const root = document.documentElement;
    const primary = s.primary_color || '#6B2D8B';
    const hover = s.hover_color || adjustColor(primary, -15);

    root.style.setProperty('--brand', primary);
    root.style.setProperty('--brand-light', adjustColor(primary, 35));
    root.style.setProperty('--brand-dark', adjustColor(primary, -28));
    root.style.setProperty('--accent', hover);
    root.style.setProperty('--price-color', primary);
    root.style.setProperty('--border', hexToRgba(primary, 0.12));
    if (s.menu_background_color) root.style.setProperty('--bg', s.menu_background_color);
    if (s.text_color) root.style.setProperty('--text', s.text_color);
    if (s.border_radius) {
      root.style.setProperty('--radius', `${parseInt(s.border_radius, 10) || 14}px`);
    }
    if (s.section_spacing) {
      root.style.setProperty('--section-spacing', `${parseInt(s.section_spacing, 10) || 4}px`);
    }
    if (s.font_family) {
      document.body.style.fontFamily = s.font_family;
    }
    if (s.header_color) {
      root.style.setProperty('--header-brand', s.header_color);
    } else {
      root.style.removeProperty('--header-brand');
    }
    const backBtn = document.getElementById('detailBackBtn');
    if (backBtn && String(s.back_button_enabled) === '0') {
      backBtn.style.display = 'none';
    }
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', primary);
  } catch (e) {
    console.warn('Tasarım ayarları:', e);
  }
};

const loadRestaurantInfo = async () => {
  try {
    const response = await fetch(`${API_BASE}/restaurant`);
    if (!response.ok) return;
    const data = await response.json();
    const heroTitle = document.getElementById('heroRestaurantName');
    if (heroTitle) heroTitle.textContent = data.name || 'Menü';
    document.title = (data.name || 'QR Menü') + ' - QR Menü';

    const heroLogo = document.getElementById('heroLogo');
    const heroLogoWrapper = document.getElementById('heroLogoWrapper');
    if (data.logo && heroLogo && heroLogoWrapper) {
      heroLogo.src = data.logo;
      heroLogo.style.display = 'block';
      heroLogoWrapper.style.display = 'flex';
    } else if (heroLogoWrapper) {
      heroLogoWrapper.style.display = 'none';
    }

    const sloganEl = document.getElementById('drawerSlogan');
    if (sloganEl && data.slogan) sloganEl.textContent = data.slogan;

    const wifiBlock = document.getElementById('drawerWifi');
    if (data.wifi_name || data.wifi_password) {
      if (wifiBlock) wifiBlock.style.display = 'block';
      const wn = document.getElementById('drawerWifiName');
      const wp = document.getElementById('drawerWifiPass');
      if (wn) wn.textContent = data.wifi_name || '—';
      if (wp) wp.textContent = data.wifi_password || '—';
    }

    await loadDrawerSocialMedia();
  } catch (e) {
    console.error(e);
  }
};

const getSocialIconClass = (platform) => {
  const p = (platform || '').toLowerCase().trim();
  if (p.includes('instagram')) return 'fab fa-instagram';
  if (p.includes('facebook')) return 'fab fa-facebook-f';
  if (p.includes('whatsapp')) return 'fab fa-whatsapp';
  if (p.includes('twitter') || p.includes('x')) return 'fab fa-x-twitter';
  if (p.includes('youtube')) return 'fab fa-youtube';
  if (p.includes('tiktok')) return 'fab fa-tiktok';
  if (p.includes('telegram')) return 'fab fa-telegram';
  if (p.includes('website') || p.includes('web')) return 'fas fa-globe';
  return 'fas fa-link';
};

const getSocialPlatformName = (platform) => {
  const p = (platform || '').toLowerCase().trim();
  if (p.includes('instagram')) return 'Instagram';
  if (p.includes('facebook')) return 'Facebook';
  if (p.includes('whatsapp')) return 'WhatsApp';
  if (p.includes('twitter') || p.includes('x')) return 'X / Twitter';
  if (p.includes('youtube')) return 'YouTube';
  if (p.includes('tiktok')) return 'TikTok';
  if (p.includes('telegram')) return 'Telegram';
  if (p.includes('website') || p.includes('web')) return 'Web Sitemiz';
  return platform;
};

const loadDrawerSocialMedia = async () => {
  try {
    const res = await fetch(`${API_BASE}/social-media`);
    if (!res.ok) return;
    const items = await res.json();
    const activeItems = (Array.isArray(items) ? items : []).filter(
      (item) => item.url && String(item.url).trim() !== '' && (item.is_active === 1 || item.is_active === true || item.is_active === undefined)
    );
    const grid = document.getElementById('drawerSocialGrid');
    const container = document.getElementById('drawerSocial');
    if (!grid || !container) return;
    if (activeItems.length === 0) {
      container.style.display = 'none';
      return;
    }
    grid.innerHTML = activeItems.map((item) => `
      <a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer" class="drawer-social-link" title="${escapeHtml(item.platform)}">
        <i class="${getSocialIconClass(item.platform)}"></i>
        <span>${escapeHtml(getSocialPlatformName(item.platform))}</span>
      </a>
    `).join('');
    container.style.display = 'block';
  } catch (err) {
    console.warn('Sosyal medya yüklenemedi:', err);
  }
};

/* —— Alerjen rehberi (modal içi) —— */
const renderAllergenModalGrid = () => {
  const grid = document.getElementById('allergenFullGrid');
  if (!grid) return;
  grid.innerHTML = ALLERGENS.map(
    (a) => `<div class="afl-item"><div class="afl-icon">${a.icon}</div><div class="afl-name">${a.label}</div></div>`
  ).join('');
};

const openAllergenModal = () => {
  document.getElementById('allergenModal')?.classList.add('active');
};

const closeAllergenModal = () => {
  document.getElementById('allergenModal')?.classList.remove('active');
};

/* —— Menü listesi —— */
const productsForCategory = (catId) =>
  cachedProducts.filter((p) => Number(p.category_id) === Number(catId));

const renderMenuItem = (p, options = {}) => {
  const { chefPick = false } = options;
  let imgSrc = p.image;
  if (!imgSrc || String(imgSrc).trim() === '') {
    const cat = cachedCategories.find((c) => Number(c.id) === Number(p.category_id));
    if (cat && cat.image && String(cat.image).trim() !== '') {
      imgSrc = cat.image;
    } else {
      imgSrc = '/images/cat-sandwiches.jpg';
    }
  }
  const img = `<div class="item-img-wrap"><img src="${imgSrc}" alt="${escapeHtml(p.name)}" loading="lazy" onerror="this.parentElement.outerHTML='<div class=\\'item-img-placeholder\\'>☕</div>'"></div>`;
  const desc = escapeHtml((p.description || '').trim());
  const shortDesc = desc.length > 80 ? desc.slice(0, 77) + '…' : desc;
  const pickLabel = currentLang === 'tr' ? chefPicksTitle.tr : chefPicksTitle.en;
  const badge = chefPick
    ? `<span class="chef-pick-badge">⭐ ${escapeHtml(pickLabel)}</span>`
    : '';
  const prep =
    p.preparation_time != null
      ? `<span class="item-prep">⏱ ${p.preparation_time} ${currentLang === 'tr' ? 'dk' : 'min'}</span>`
      : '';
  return `
    <div class="menu-item${chefPick ? ' menu-item-chef-pick' : ''}" data-product-id="${p.id}">
      <div class="item-clickable" role="button" tabindex="0" data-slug="${escapeHtml(p.slug)}">
        ${img}
        <div class="item-info">
          ${badge}
          <div class="item-name">${escapeHtml(p.name)}</div>
          <div class="item-desc">${shortDesc}</div>
          <div class="item-footer">
            <span class="item-price">${formatPrice(p.price)}</span>
            <div class="item-tags">${prep}</div>
          </div>
        </div>
      </div>
    </div>`;
};

const loadChefPicks = async () => {
  try {
    const response = await fetch(`${API_BASE}/promotions/chef-picks`);
    if (!response.ok) return;
    const data = await response.json();
    chefPicksTitle.tr = data.title_tr || chefPicksTitle.tr;
    chefPicksTitle.en = data.title_en || chefPicksTitle.en;
    const normalized = {};
    const raw = data.by_category || {};
    Object.entries(raw).forEach(([catId, product]) => {
      const id = parseInt(catId, 10);
      if (!isNaN(id) && product) normalized[id] = product;
    });
    chefPicksByCategory = normalized;
  } catch (e) {
    console.warn('Şefin önerileri yüklenemedi:', e);
  }
};

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const bindMenuItemClicks = (root) => {
  root.querySelectorAll('.item-clickable[data-slug]').forEach((el) => {
    const slug = el.getAttribute('data-slug');
    const open = () => slug && showProductDetail(slug);
    el.addEventListener('click', open);
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        open();
      }
    });
  });
};

const renderQuickNav = () => {
  const nav = document.getElementById('quickNav');
  if (!nav) return;
  const allLabel = currentLang === 'tr' ? 'Tümü' : 'All';
  nav.innerHTML = `<div class="nav-chip active" data-scroll="all">${allLabel}</div>`;
  cachedCategories.forEach((cat) => {
    nav.innerHTML += `<div class="nav-chip" data-cat="${cat.id}">${escapeHtml(cat.name)}</div>`;
  });
  nav.querySelectorAll('.nav-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      nav.querySelectorAll('.nav-chip').forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      if (chip.dataset.scroll === 'all') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      const id = chip.dataset.cat;
      const sec = document.getElementById('section-' + id);
      if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
};

const renderCategories = () => {
  const container = document.getElementById('categoriesContainer');
  if (!container) return;
  container.innerHTML = '';

  cachedCategories.forEach((cat) => {
    const chefPickProduct = chefPicksByCategory[cat.id];
    const pickId = chefPickProduct ? Number(chefPickProduct.id) : null;
    const list = productsForCategory(cat.id).filter((p) => Number(p.id) !== pickId);
    const totalCount = list.length + (chefPickProduct ? 1 : 0);
    const emptyText =
      currentLang === 'tr'
        ? 'Bu kategoride henüz ürün bulunmuyor.'
        : 'No products in this category yet.';
    const section = document.createElement('div');
    section.className = 'category-section';
    section.id = 'section-' + cat.id;
    section.innerHTML = `
      <div class="category-header">
        <span class="cat-name">${escapeHtml(cat.name)}</span>
        <span class="cat-count">${totalCount}</span>
      </div>
      <div class="category-items open" id="items-${cat.id}">
        ${
          (chefPickProduct ? renderMenuItem(chefPickProduct, { chefPick: true }) : '') +
          (list.length
            ? list.map((p) => renderMenuItem(p)).join('')
            : chefPickProduct
              ? ''
              : `<div class="menu-item" style="cursor:default;">
                 <div class="item-img-placeholder">🗂️</div>
                 <div class="item-info">
                   <div class="item-name">${currentLang === 'tr' ? 'Yakında' : 'Coming soon'}</div>
                   <div class="item-desc">${emptyText}</div>
                 </div>
               </div>`)
        }
      </div>`;
    container.appendChild(section);
    bindMenuItemClicks(section);
  });
};

const renderFilteredList = (query) => {
  const q = query.trim().toLowerCase();
  const container = document.getElementById('categoriesContainer');
  if (!container) return;
  if (!q) {
    renderCategories();
    return;
  }
  const filtered = cachedProducts.filter(
    (p) =>
      (p.name || '').toLowerCase().includes(q) ||
      (p.description || '').toLowerCase().includes(q)
  );
  if (!filtered.length) {
    const msg = currentLang === 'tr' ? 'Sonuç bulunamadı 🔍' : 'No results 🔍';
    container.innerHTML = `<div style="text-align:center;padding:40px 20px;color:var(--text-muted);font-size:15px;">${msg}</div>`;
    return;
  }
  const foundLabel =
    currentLang === 'tr' ? `${filtered.length} sonuç bulundu` : `${filtered.length} results`;
  container.innerHTML =
    `<div style="padding:6px 0 10px;font-size:12px;color:var(--text-muted);">${foundLabel}</div>` +
    `<div class="category-items open">${filtered.map((p) => renderMenuItem(p)).join('')}</div>`;
  bindMenuItemClicks(container);
};

const loadMenuListing = async () => {
  await loadChefPicks();
  cachedDeliveryCompanies = await loadDeliveryCompanies();
  const container = document.getElementById('categoriesContainer');
  try {
    const [catsRes, prodRes] = await Promise.all([
      fetch(`${API_BASE}/categories`),
      fetch(`${API_BASE}/products`)
    ]);
    cachedCategories = await catsRes.json();
    cachedProducts = await prodRes.json();
    await loadClientBanners();
    renderQuickNav();
    renderCategories();
    renderAllergenModalGrid();
  } catch (e) {
    console.error(e);
    if (container) {
      container.innerHTML =
        '<div style="text-align:center;padding:40px;color:var(--text-muted);">Menü yüklenemedi.</div>';
    }
  }
};

const setHeroImage = (imageUrl) => {
  const heroImg = document.getElementById('heroBgImg');
  if (!heroImg || !imageUrl) return;
  heroImg.src = imageUrl;
  heroImg.style.display = 'block';
  heroImg.onerror = () => { heroImg.style.display = 'none'; };
};

const loadClientBanners = async () => {
  const heroImg = document.getElementById('heroBgImg');
  if (!heroImg) return;

  try {
    const response = await fetch(`${API_BASE}/banners`);
    if (!response.ok) return;
    const banners = await response.json();
    if (banners && banners.length > 0 && banners[0].image) {
      setHeroImage(banners[0].image);
      return;
    }
  } catch (err) {
    console.warn('Bannerlar yüklenirken hata:', err);
  }

  if (cachedCategories.length > 0) {
    const firstCat = cachedCategories[0];
    const fallback = getCategoryImage(firstCat.name, firstCat.image, firstCat.id);
    setHeroImage(fallback);
  }
};

/* —— Sepet —— */
const loadCartFromStorage = () => {
  try {
    const saved = localStorage.getItem(CART_STORAGE_KEY);
    cart = saved ? JSON.parse(saved) : [];
  } catch {
    cart = [];
  }
};

const saveCart = () => {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  updateCartUI();
};

const getCartTotal = () =>
  cart.reduce((sum, item) => sum + Number(item.price) * item.qty, 0);

const getCartQty = () =>
  cart.reduce((sum, item) => sum + item.qty, 0);

const addToCart = (product) => {
  const existing = cart.find((item) => item.id === product.id);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({
      id: product.id,
      slug: product.slug,
      name: product.name,
      price: product.price,
      image: product.image || '',
      qty: 1
    });
  }
  saveCart();
  const msg = currentLang === 'tr' ? `${product.name} sepete eklendi` : `${product.name} added to cart`;
  showToast(msg);
};

const updateCartQty = (id, delta) => {
  const item = cart.find((i) => i.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) cart = cart.filter((i) => i.id !== id);
  saveCart();
  renderCartModal();
};

const clearCart = () => {
  cart = [];
  saveCart();
  closeCartModal();
};

const updateCartUI = () => {
  const qty = getCartQty();
  const total = getCartTotal();
  const lastItem = cart.length > 0 ? cart[cart.length - 1].name : '—';

  const headerBadge = document.getElementById('headerCartBadge');
  if (headerBadge) {
    headerBadge.textContent = qty;
    headerBadge.style.display = qty > 0 ? 'flex' : 'none';
  }

  const cartBar = document.getElementById('cartBar');
  const pageMenu = document.getElementById('page-menu');
  if (cartBar) {
    const show = qty > 0 && currentPageName === 'menu';
    cartBar.style.display = show ? 'flex' : 'none';
    if (show) {
      const qtyEl = document.getElementById('cartBarQty');
      const itemEl = document.getElementById('cartBarItem');
      const totalEl = document.getElementById('cartBarTotal');
      if (qtyEl) qtyEl.textContent = qty;
      if (itemEl) itemEl.textContent = lastItem;
      if (totalEl) totalEl.textContent = formatPrice(total);
    }
  }
  if (pageMenu) pageMenu.classList.toggle('no-cart', qty === 0);
};

const renderCartModal = () => {
  const container = document.getElementById('cartItems');
  const totalEl = document.getElementById('cartTotalPrice');
  const deliveryEl = document.getElementById('cartDeliveryLinks');
  if (!container) return;

  if (cart.length === 0) {
    const emptyMsg = currentLang === 'tr' ? 'Sepetiniz boş' : 'Your cart is empty';
    container.innerHTML = `<div class="cart-empty">${emptyMsg}</div>`;
    if (totalEl) totalEl.textContent = formatPrice(0);
    return;
  }

  container.innerHTML = cart.map((item) => {
    const imgHtml = item.image
      ? `<img class="cart-line-img" src="${escapeHtml(item.image)}" alt="">`
      : `<div class="cart-line-img" style="display:flex;align-items:center;justify-content:center;font-size:20px;">🍽️</div>`;
    return `
      <div class="cart-line">
        ${imgHtml}
        <div class="cart-line-info">
          <div class="cart-line-name">${escapeHtml(item.name)}</div>
          <div class="cart-line-price">${formatPrice(item.price)}</div>
        </div>
        <div class="cart-line-qty">
          <button type="button" class="cart-qty-btn" data-qty-id="${item.id}" data-delta="-1">−</button>
          <span class="cart-qty-val">${item.qty}</span>
          <button type="button" class="cart-qty-btn" data-qty-id="${item.id}" data-delta="1">+</button>
        </div>
      </div>`;
  }).join('');

  container.querySelectorAll('.cart-qty-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.getAttribute('data-qty-id'), 10);
      const delta = parseInt(btn.getAttribute('data-delta'), 10);
      updateCartQty(id, delta);
    });
  });

  if (totalEl) totalEl.textContent = formatPrice(getCartTotal());

  if (deliveryEl && cachedDeliveryCompanies.length > 0) {
    deliveryEl.innerHTML = cachedDeliveryCompanies
      .map((c) => `<a href="${escapeHtml(c.url)}" target="_blank" rel="noopener">${escapeHtml(c.name)}</a>`)
      .join('');
  }
};

const openCartModal = () => {
  renderCartModal();
  document.getElementById('cartModal')?.classList.add('active');
};

const closeCartModal = () => {
  document.getElementById('cartModal')?.classList.remove('active');
};

const openDrawer = () => {
  document.getElementById('sideDrawer')?.classList.add('open');
  document.getElementById('drawerOverlay')?.classList.add('active');
};

const closeDrawer = () => {
  document.getElementById('sideDrawer')?.classList.remove('open');
  document.getElementById('drawerOverlay')?.classList.remove('active');
};

/* —— Ürün detayı —— */
const texts = () => ({
  tr: {
    minutes: 'dk',
    about: 'Ürün Hakkında',
    allergenTitle: 'Alerjen Bilgisi',
    nutriTitle: 'Besin Değerleri',
    portionFor: 'için',
    share: 'Paylaş',
    relatedTitle: 'Birlikte İyi Gider',
    deliveryTitle: 'Sipariş',
    copied: 'Link kopyalandı!',
    allergenDisclaimer: 'Bu üründe listelenen alerjenlere göre bilgi verilmiştir.',
    likes: 'beğeni',
    allergenYes: 'İÇERİR',
    allergenNo: 'İÇERMEZ'
  },
  en: {
    minutes: 'min',
    about: 'About this item',
    allergenTitle: 'Allergens',
    nutriTitle: 'Nutritional values',
    portionFor: 'for',
    share: 'Share',
    relatedTitle: 'Goes well with',
    deliveryTitle: 'Order',
    copied: 'Link copied!',
    allergenDisclaimer: 'Information reflects the allergens listed for this product.',
    likes: 'likes',
    allergenYes: 'CONTAINS',
    allergenNo: 'NONE'
  }
});

function matchAllergenToken(nameLower, token) {
  return nameLower.includes(token) || token.includes(nameLower);
}

const allergenMatchesProduct = (allergenRowName, allergenDef) => {
  const n = (allergenRowName || '').toLowerCase().trim();
  return allergenDef.names.some((t) => matchAllergenToken(n, t) || n.includes(t));
};

const loadProductLikes = async (slug) => {
  try {
    const r = await fetch(`${API_BASE}/products/${encodeURIComponent(slug)}/likes`);
    const d = await r.json();
    return d.like_count || 0;
  } catch {
    return 0;
  }
};

const incrementProductLike = async (slug) => {
  try {
    const r = await fetch(`${API_BASE}/products/${encodeURIComponent(slug)}/like`, { method: 'POST' });
    const d = await r.json();
    return d.like_count ?? null;
  } catch {
    return null;
  }
};

const loadDeliveryCompanies = async () => {
  try {
    const r = await fetch(`${API_BASE}/delivery-companies`);
    const arr = await r.json();
    return (arr || []).filter((c) => c.url && String(c.url).trim());
  } catch {
    return [];
  }
};

const loadSocialForShare = async () => {
  try {
    const r = await fetch(`${API_BASE}/social-media`);
    return await r.json();
  } catch {
    return [];
  }
};

const shareProductAction = (name, url) => {
  const t = texts()[currentLang];
  if (navigator.share) {
    navigator.share({ title: name, text: name + ' - QR Menü', url }).catch(() => {});
  } else {
    navigator.clipboard.writeText(url).then(() => showToast(t.copied));
  }
};

const showProductDetail = async (slug) => {
  const host = document.getElementById('detailContent');
  if (!host) return;
  const t = texts()[currentLang];
  host.innerHTML = `<div class="detail-body" style="padding:80px 20px;text-align:center;color:var(--text-muted);">…</div>`;
  showPage('detail');

  try {
    const productResponse = await fetch(`${API_BASE}/products/${encodeURIComponent(slug)}`);
    if (!productResponse.ok) throw new Error('not found');
    const product = await productResponse.json();

    const [allergens, nutritionalValues, relatedProducts, deliveryCompanies, socialMedia, likes] =
      await Promise.all([
        fetch(`${API_BASE}/products/${encodeURIComponent(slug)}/allergens`).then((r) =>
          r.ok ? r.json() : []
        ),
        fetch(`${API_BASE}/products/${encodeURIComponent(slug)}/nutritional-values`).then((r) =>
          r.ok ? r.json() : []
        ),
        fetch(`${API_BASE}/products/${encodeURIComponent(slug)}/related`).then((r) =>
          r.ok ? r.json() : []
        ),
        loadDeliveryCompanies(),
        loadSocialForShare(),
        loadProductLikes(slug)
      ]);

    const likedKey = `product_liked_${product.id}`;
    let isLiked = localStorage.getItem(likedKey) === 'true';

    const userNames = (allergens || []).map((a) => (a.allergen_name || '').toLowerCase());
    const allergenGrid = ALLERGENS.map((def) => {
      const has = userNames.some((un) => allergenMatchesProduct(un, def));
      const st = has ? t.allergenYes : t.allergenNo;
      return `<div class="allergen-item ${has ? 'has' : 'no'}"><div class="allergen-icon">${def.icon}</div><div class="allergen-name">${def.label}</div><div class="allergen-status">${st}</div></div>`;
    }).join('');

    const metaBadges = [];
    if (product.preparation_time != null) {
      metaBadges.push(
        `<div class="detail-badge"><span>⏱️</span>${product.preparation_time} ${t.minutes}</div>`
      );
    }

    const nutriRows =
      nutritionalValues && nutritionalValues.length
        ? nutritionalValues
            .map(
              (n) =>
                `<tr><td>${escapeHtml(n.nutrient_name)}</td><td>${escapeHtml(
                  String(n.nutrient_value)
                )} ${escapeHtml(n.unit || '')}</td></tr>`
            )
            .join('')
        : '';
    const portion =
      nutritionalValues && nutritionalValues[0] && nutritionalValues[0].portion_size
        ? nutritionalValues[0].portion_size
        : '';

    const relatedHtml =
      relatedProducts && relatedProducts.length
        ? `<div class="detail-related-block"><div class="detail-section-title">${t.relatedTitle}</div>${relatedProducts
            .map(
              (rp) => `
          <div class="menu-item" data-product-id="${rp.id}">
            <div class="item-clickable" role="button" tabindex="0" data-slug="${escapeHtml(rp.slug)}">
              ${rp.image ? `<div class="item-img-wrap"><img src="${escapeHtml(rp.image)}" alt="" loading="lazy"></div>` : `<div class="item-img-placeholder">🍽️</div>`}
              <div class="item-info">
                <div class="item-name">${escapeHtml(rp.name)}</div>
                <div class="item-footer"><span class="item-price">${formatPrice(rp.price)}</span></div>
              </div>
            </div>
          </div>`
            )
            .join('')}</div>`
        : '';

    const deliveryHtml =
      deliveryCompanies.length > 0
        ? `<div class="detail-section-title">${t.deliveryTitle}</div><div class="detail-delivery-links">${deliveryCompanies
            .map(
              (c) =>
                `<a class="variant-opt" href="${escapeHtml(c.url)}" target="_blank" rel="noopener">${escapeHtml(c.name)}</a>`
            )
            .join('')}</div>`
        : '';

    const shareUrl = `${window.location.origin}/urun/${encodeURIComponent(product.slug)}`;
    const wa = (socialMedia || []).find((s) => s.platform.toLowerCase() === 'whatsapp');
    const tg = (socialMedia || []).find((s) => s.platform.toLowerCase() === 'telegram');
    const tw = (socialMedia || []).find(
      (s) => s.platform.toLowerCase() === 'twitter' || s.platform.toLowerCase() === 'x'
    );
    const fb = (socialMedia || []).find((s) => s.platform.toLowerCase() === 'facebook');

    const shareIcons = [
      wa
        ? `<a href="https://wa.me/?text=${encodeURIComponent(product.name + ' ' + shareUrl)}" target="_blank" rel="noopener" title="WhatsApp">📱</a>`
        : '',
      tg
        ? `<a href="https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(product.name)}" target="_blank" rel="noopener" title="Telegram">✈️</a>`
        : '',
      tw
        ? `<a href="https://twitter.com/intent/tweet?text=${encodeURIComponent(product.name)}&url=${encodeURIComponent(shareUrl)}" target="_blank" rel="noopener" title="X">𝕏</a>`
        : '',
      fb
        ? `<a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}" target="_blank" rel="noopener" title="Facebook">f</a>`
        : ''
    ]
      .filter(Boolean)
      .join('');

    const heroImg = product.image
      ? `<img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}">`
      : `<div class="detail-hero-placeholder">🍽️</div>`;

    host.innerHTML = `
      <div class="detail-hero">
        ${heroImg}
        <div class="detail-hero-badge">${formatPrice(product.price)}</div>
        <button type="button" class="detail-like-btn ${isLiked ? 'liked' : ''}" id="detailLikeBtn" ${isLiked ? 'disabled' : ''}>
          ♥ <span id="detailLikeCount">${likes}</span>
        </button>
      </div>
      <div class="detail-body">
        <div class="detail-category">${escapeHtml(product.category_name || '')}</div>
        <h1 class="detail-name">${escapeHtml(product.name)}</h1>
        <div class="detail-meta">${metaBadges.join('')}</div>
        <div class="detail-divider"></div>
        <div class="detail-section-title">${t.about}</div>
        <p class="detail-desc">${escapeHtml(product.description || '')}</p>
        <div class="detail-divider"></div>
        <div class="detail-section-title">${t.allergenTitle}</div>
        <p style="font-size:12px;color:var(--text-muted);margin-bottom:10px;">${t.allergenDisclaimer}</p>
        <div class="allergen-grid">${allergenGrid}</div>
        ${
          nutriRows
            ? `<div class="detail-divider"></div><div class="detail-section-title">${t.nutriTitle}</div>${
                portion
                  ? `<p style="font-size:12px;color:var(--text-muted);margin-bottom:8px;">1 ${t.portionFor} ${escapeHtml(portion)}</p>`
                  : ''
              }<table class="detail-nutri-table"><thead><tr><th>${currentLang === 'tr' ? 'Besin' : 'Nutrient'}</th><th>${currentLang === 'tr' ? 'Değer' : 'Value'}</th></tr></thead><tbody>${nutriRows}</tbody></table>`
            : ''
        }
        <div class="detail-divider"></div>
        <div class="detail-share-row">
          <button type="button" class="detail-share-btn" id="detailShareBtn">${t.share}</button>
          <div class="detail-share-icons">${shareIcons}</div>
        </div>
        ${relatedHtml}
        
        <!-- Ürün Not/Mesaj Bırakma Formu -->
        <div class="product-message-section">
          <h3 class="detail-section-title" data-tr="Ürüne Ait Not / Mesaj Bırakın" data-en="Leave a Note / Message for Product">${currentLang === 'tr' ? 'Ürüne Ait Not / Mesaj Bırakın' : 'Leave a Note / Message for Product'}</h3>
          <form id="productMessageForm" class="product-message-form">
            <div class="form-row">
              <input type="text" id="prodMsgName" placeholder="${currentLang === 'tr' ? 'Adınız Soyadınız *' : 'Your Name *'}" required class="msg-input">
              <input type="email" id="prodMsgEmail" placeholder="${currentLang === 'tr' ? 'E-Posta Adresiniz (Opsiyonel)' : 'Email (Optional)'}" class="msg-input">
            </div>
            <div class="form-row">
              <input type="tel" id="prodMsgPhone" placeholder="${currentLang === 'tr' ? 'Telefon No (Opsiyonel)' : 'Phone (Optional)'}" class="msg-input">
              <input type="text" id="prodMsgSubject" placeholder="${currentLang === 'tr' ? 'Konu (Opsiyonel)' : 'Subject (Optional)'}" class="msg-input">
            </div>
            <textarea id="prodMsgMessage" placeholder="${currentLang === 'tr' ? 'Notunuz / Mesajınız *' : 'Your Note / Message *'}" required class="msg-textarea"></textarea>
            <button type="submit" class="msg-submit-btn">${currentLang === 'tr' ? 'Notu İlet' : 'Submit Note'}</button>
          </form>
        </div>
        
        <div style="height:24px;"></div>
      </div>`;

    document.title = `${product.name} - QR Menü`;

    const likeBtn = document.getElementById('detailLikeBtn');
    likeBtn?.addEventListener('click', async () => {
      if (isLiked) return;
      const next = await incrementProductLike(slug);
      if (next != null) {
        isLiked = true;
        localStorage.setItem(likedKey, 'true');
        const c = document.getElementById('detailLikeCount');
        if (c) c.textContent = next;
        likeBtn.classList.add('liked');
        likeBtn.disabled = true;
      }
    });

    document.getElementById('detailShareBtn')?.addEventListener('click', () => {
      shareProductAction(product.name, shareUrl);
    });

    // Not Bırakma Formu Kaydetme Listener
    const prodForm = document.getElementById('productMessageForm');
    prodForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = prodForm.querySelector('.msg-submit-btn');
      if (submitBtn) submitBtn.disabled = true;
      try {
        const payload = {
          name: document.getElementById('prodMsgName').value,
          email: document.getElementById('prodMsgEmail').value || null,
          phone: document.getElementById('prodMsgPhone').value || null,
          subject: document.getElementById('prodMsgSubject').value || null,
          message: document.getElementById('prodMsgMessage').value,
          product_id: product.id
        };
        const res = await fetch('/api/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          showToast(currentLang === 'tr' ? 'Notunuz başarıyla iletildi!' : 'Your note has been submitted!');
          prodForm.reset();
        } else {
          showToast(currentLang === 'tr' ? 'Hata: Not iletilemedi' : 'Error: Could not submit note');
        }
      } catch (err) {
        showToast(currentLang === 'tr' ? 'Bir hata oluştu' : 'An error occurred');
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });

    bindMenuItemClicks(host);
  } catch (e) {
    console.error(e);
    host.innerHTML = `<div class="detail-body" style="padding:40px;"><p>${currentLang === 'tr' ? 'Ürün yüklenemedi.' : 'Could not load product.'}</p><button type="button" class="allergen-btn" onclick="document.getElementById('detailBackBtn').click()" style="margin-top:16px;">OK</button></div>`;
  }
};

/* —— Başlatma —— */
document.addEventListener('DOMContentLoaded', async () => {
  await loadDesignSettings();

  /* Sadece ana menü şablonu (#page-menu) — ürün detay sayfası product.js ile yüklenir */
  if (!document.getElementById('page-menu')) return;

  loadCartFromStorage();
  initLanguage();
  renderAllergenModalGrid();
  updateCartUI();

  document.getElementById('allergenModalClose')?.addEventListener('click', closeAllergenModal);
  document.getElementById('allergenModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'allergenModal') closeAllergenModal();
  });

  document.getElementById('drawerAllergenBtn')?.addEventListener('click', () => {
    closeDrawer();
    openAllergenModal();
  });
  document.getElementById('menuToggleBtn')?.addEventListener('click', openDrawer);
  document.getElementById('drawerCloseBtn')?.addEventListener('click', closeDrawer);
  document.getElementById('drawerOverlay')?.addEventListener('click', closeDrawer);

  document.getElementById('langToggleBtn')?.addEventListener('click', () => {
    changeLanguage(currentLang === 'tr' ? 'en' : 'tr');
    if (cachedCategories.length) {
      renderQuickNav();
      const searchInput = document.getElementById('searchInput');
      if (searchInput?.value.trim()) renderFilteredList(searchInput.value);
      else renderCategories();
    }
  });

  // Genel Mesaj Bırakma Modalı Listenerları
  const openGenMsgModal = () => {
    document.getElementById('generalMessageModal')?.classList.add('active');
  };
  const closeGenMsgModal = () => {
    document.getElementById('generalMessageModal')?.classList.remove('active');
  };
  document.getElementById('drawerMessageBtn')?.addEventListener('click', () => {
    closeDrawer();
    openGenMsgModal();
  });
  document.getElementById('generalMessageModalClose')?.addEventListener('click', closeGenMsgModal);
  document.getElementById('generalMessageModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'generalMessageModal') closeGenMsgModal();
  });

  const genForm = document.getElementById('generalMessageForm');
  genForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = genForm.querySelector('.msg-submit-btn');
    if (submitBtn) submitBtn.disabled = true;
    try {
      const payload = {
        name: document.getElementById('genMsgName').value,
        email: document.getElementById('genMsgEmail').value || null,
        phone: document.getElementById('genMsgPhone').value || null,
        subject: document.getElementById('genMsgSubject').value || 'Menü Sayfası Mesajı',
        message: document.getElementById('genMsgMessage').value,
        product_id: null
      };
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        showToast(currentLang === 'tr' ? 'Mesajınız başarıyla iletildi!' : 'Your message has been sent successfully!');
        genForm.reset();
        closeGenMsgModal();
      } else {
        showToast(currentLang === 'tr' ? 'Hata: Mesaj gönderilemedi' : 'Error: Could not send message');
      }
    } catch (err) {
      showToast(currentLang === 'tr' ? 'Bir hata oluştu' : 'An error occurred');
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });

  document.getElementById('detailBackBtn')?.addEventListener('click', () => goBack());

  const searchInput = document.getElementById('searchInput');
  searchInput?.addEventListener('input', () => renderFilteredList(searchInput.value));

  await loadRestaurantInfo();
  await loadMenuListing();
});

window.goBack = goBack;
