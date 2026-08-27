// API Base URL (main.js'den al, yoksa tanımla)
const API_BASE = window.API_BASE || '/api';

// Dil yönetimi (main.js'den alınacak)
let currentLang = localStorage.getItem('language') || 'tr';

// Restoran bilgilerini yükle
const loadRestaurantInfo = async () => {
    try {
        const response = await fetch(`${API_BASE}/restaurant`);
        const data = await response.json();
        
        const restaurantNameEl = document.getElementById('restaurantName');
        if (restaurantNameEl) {
            restaurantNameEl.textContent = data.name || 'Cafe Aroma';
        }
        
        const restaurantLogoEl = document.getElementById('restaurantLogo');
        if (restaurantLogoEl && data.logo) {
            restaurantLogoEl.src = data.logo;
        }
        
        document.title = data.name + ' - QR Menü';
    } catch (error) {
        console.error('Restoran bilgisi yüklenemedi:', error);
    }
};

// Dil yönetimi
const initLanguage = () => {
    currentLang = localStorage.getItem('language') || 'tr';
    updateLanguage(currentLang);
    
    const langOptions = document.querySelectorAll('.lang-option');
    langOptions.forEach(option => {
        option.addEventListener('click', (e) => {
            e.stopPropagation();
            const lang = option.getAttribute('data-lang');
            changeLanguage(lang);
        });
    });
};

const changeLanguage = (lang) => {
    currentLang = lang;
    localStorage.setItem('language', lang);
    updateLanguage(lang);
    // Ürün detayını yeniden yükle
    loadProductDetail();
};

const updateLanguage = (lang) => {
    document.documentElement.setAttribute('lang', lang);
    // Dil değişikliği için metinler product detail yüklendiğinde güncellenecek
};

// URL'den slug al
const getSlugFromURL = () => {
    const path = window.location.pathname;
    const match = path.match(/\/urun\/(.+)/);
    return match ? match[1] : null;
};

// Teslimat firmalarını yükle
const loadDeliveryCompanies = async () => {
    try {
        const response = await fetch(`${API_BASE}/delivery-companies`);
        const companies = await response.json();
        return companies.filter(c => c.url && c.url.trim() !== '');
    } catch (error) {
        console.error('Teslimat firmaları yüklenemedi:', error);
        return [];
    }
};

// Sosyal medya linklerini yükle
const loadSocialMedia = async () => {
    try {
        const response = await fetch(`${API_BASE}/social-media`);
        const socialMedia = await response.json();
        return socialMedia;
    } catch (error) {
        console.error('Sosyal medya yüklenemedi:', error);
        return [];
    }
};

// WhatsApp butonunu güncelle
const updateWhatsAppButton = async () => {
    try {
        const response = await fetch(`${API_BASE}/social-media`);
        const socialMedia = await response.json();
        const safeSocialMedia = Array.isArray(socialMedia) ? socialMedia : [];
        const whatsappBtn = document.getElementById('whatsappBtn');

        if (whatsappBtn) {
            const whatsapp = safeSocialMedia.find(s => s.platform.toLowerCase() === 'whatsapp');
            if (whatsapp && whatsapp.url) {
                whatsappBtn.href = whatsapp.url;
            } else {
                whatsappBtn.style.display = 'none';
            }
        }
    } catch (error) {
        console.error('WhatsApp butonu güncellenemedi:', error);
    }
};

// Ürün beğenisi yükle
const loadProductLikes = async (slug) => {
    try {
        const response = await fetch(`${API_BASE}/products/${slug}/likes`);
        const data = await response.json();
        return data.like_count || 0;
    } catch (error) {
        console.error('Beğeni sayısı yüklenemedi:', error);
        return 0;
    }
};

// Ürün beğenisi artır
const incrementProductLike = async (slug) => {
    try {
        const response = await fetch(`${API_BASE}/products/${slug}/like`, {
            method: 'POST'
        });
        const data = await response.json();
        return data.like_count || 0;
    } catch (error) {
        console.error('Beğeni artırılamadı:', error);
        return null;
    }
};

// Ürün detayını yükle
const loadProductDetail = async () => {
    const slug = getSlugFromURL();
    const productDetail = document.getElementById('productDetail');
    
    if (!productDetail) {
        console.error('productDetail elementi bulunamadı');
        return;
    }
    
    if (!slug) {
        productDetail.innerHTML = 
            '<div class="loading">' + (currentLang === 'tr' ? 'Ürün bulunamadı.' : 'Product not found.') + '</div>';
        return;
    }
    
    console.log('Ürün detayı yükleniyor, slug:', slug);
    
    try {
        // Ürün bilgisini önce kontrol et
        const productResponse = await fetch(`${API_BASE}/products/${slug}`);
        console.log('Product response status:', productResponse.status);
        
        if (!productResponse.ok) {
            const errorData = await productResponse.json().catch(() => ({}));
            console.error('Ürün bulunamadı:', errorData);
            throw new Error(errorData.error || 'Ürün bulunamadı');
        }
        
        const product = await productResponse.json();
        console.log('Ürün yüklendi:', product);
        
        if (!product || !product.id) {
            throw new Error('Ürün verisi geçersiz');
        }
        
        // Diğer verileri paralel olarak yükle
        console.log('Diğer veriler yükleniyor...');
        const [allergens, nutritionalValues, relatedProducts, deliveryCompanies, socialMedia, likes] = await Promise.all([
            fetch(`${API_BASE}/products/${slug}/allergens`).then(r => r.ok ? r.json() : []).catch(() => []),
            fetch(`${API_BASE}/products/${slug}/nutritional-values`).then(r => r.ok ? r.json() : []).catch(() => []),
            fetch(`${API_BASE}/products/${slug}/related`).then(r => r.ok ? r.json() : []).catch(() => []),
            loadDeliveryCompanies(),
            loadSocialMedia(),
            loadProductLikes(slug)
        ]);

        // Güvenlik kontrolleri - verilerin array olduğundan emin ol
        const safeAllergens = Array.isArray(allergens) ? allergens : [];
        const safeNutritionalValues = Array.isArray(nutritionalValues) ? nutritionalValues : [];
        const safeRelatedProducts = Array.isArray(relatedProducts) ? relatedProducts : [];
        const safeDeliveryCompanies = Array.isArray(deliveryCompanies) ? deliveryCompanies : [];
        const safeSocialMedia = Array.isArray(socialMedia) ? socialMedia : [];

        console.log('Tüm veriler yüklendi:', {
            allergens: safeAllergens.length,
            nutritionalValues: safeNutritionalValues.length,
            relatedProducts: safeRelatedProducts.length,
            deliveryCompanies: safeDeliveryCompanies.length,
            likes: likes
        });
        
        // Çeviri metinleri
        const texts = {
            tr: {
                readyIn: 'Hazırlanma Süresi:',
                minutes: 'Dakika',
                allergenInfo: 'Alerjen Bilgisi',
                allergenDesc: 'Bu ürün aşağıda sıralanan alerjenleri içermektedir!',
                nutritionalInfo: 'Besin Değerleri Tablosu',
                nutritionalDesc: 'Bu ürün aşağıdaki tabloda listelenen besin değerlerini içermektedir!',
                portionSize: '1 Porsiyon',
                share: 'Paylaş',
                goesWellWith: 'Birlikte İyi Gider',
                goesWellWithDesc: 'Bu ürünü sipariş verenler aşağıdakileri de tercih etti!',
                homeDelivery: 'Size Getirsin',
                homeDeliveryDesc: 'Bu ürünü aşağıdaki uygulamalar aracılığıyla sipariş verebilirsiniz.'
            },
            en: {
                readyIn: 'Time to Prepare:',
                minutes: 'Minutes',
                allergenInfo: 'Allergen Information',
                allergenDesc: 'This product contains the allergens listed below!',
                nutritionalInfo: 'Nutritional Values Table',
                nutritionalDesc: 'This product contains the nutritional values listed in the table below!',
                portionSize: '1 Portion',
                share: 'Share',
                goesWellWith: 'Goes Well Together',
                goesWellWithDesc: 'People who ordered this product also preferred the following!',
                homeDelivery: 'Home Delivery',
                homeDeliveryDesc: 'You can order this product via the applications below.'
            }
        };
        
        const t = texts[currentLang];
        
        console.log('HTML oluşturuluyor...');
        
        // Sosyal medya ikonları
        const socialIcons = {
            'instagram': 'fab fa-instagram',
            'facebook': 'fab fa-facebook-f',
            'youtube': 'fab fa-youtube',
            'twitter': 'fab fa-x-twitter',
            'x': 'fab fa-x-twitter',
            'tiktok': 'fab fa-tiktok',
            'website': 'fas fa-globe',
            'whatsapp': 'fab fa-whatsapp',
            'telegram': 'fab fa-telegram',
            'threads': 'fab fa-threads',
            'linkedin': 'fab fa-linkedin-in'
        };
        
        const socialMediaButtonsHtml = (safeSocialMedia || [])
            .filter(s => s && s.url && s.url.trim() !== '' && (s.is_active === undefined || s.is_active === 1 || s.is_active === '1'))
            .map(s => {
                const platformKey = (s.platform || '').toLowerCase();
                const iconClass = socialIcons[platformKey] || 'fas fa-link';
                const platformName = platformKey.charAt(0).toUpperCase() + platformKey.slice(1);
                return `
                    <a href="${s.url}" target="_blank" class="share-icon-btn elementor-share-btn elementor-share-btn_${platformKey}" title="${platformName}">
                        <i class="${iconClass}"></i>
                    </a>
                `;
            }).join('');
        
        const shareUrl = window.location.href;
        const shareText = product.name;
        
        // Beğeni butonu için localStorage kontrolü
        const likedKey = `product_liked_${product.id}`;
        const isLiked = localStorage.getItem(likedKey) === 'true';
        
        // Alerjen listesi
        const allergenList = safeAllergens && safeAllergens.length > 0 ? safeAllergens.map(a => `
            <div class="product-detail-allergen-item">
                <div class="product-detail-allergen-icon">
                    <i class="${a.allergen_icon || 'fas fa-certificate'}"></i>
                </div>
                <span>${a.allergen_name}</span>
            </div>
        `).join('') : '';

        // Besin değerleri listesi
        const nutritionalList = safeNutritionalValues && safeNutritionalValues.length > 0 ? safeNutritionalValues.map(n => `
            <div class="product-detail-nutritional-item">
                <div class="product-detail-nutritional-icon">
                    <i class="fas fa-certificate"></i>
                </div>
                <span><strong>${n.nutrient_name}: </strong>${n.nutrient_value} ${n.unit || ''}</span>
            </div>
        `).join('') : '';

        const portionSize = safeNutritionalValues && safeNutritionalValues.length > 0 && safeNutritionalValues[0].portion_size
            ? safeNutritionalValues[0].portion_size
            : '';

        // İlgili ürünler listesi
        const relatedProductsList = safeRelatedProducts && safeRelatedProducts.length > 0 ? safeRelatedProducts.map(rp => `
            <div class="related-product-card">
                <a href="/urun/${rp.slug}" class="related-product-link">
                    <div class="related-product-image-wrapper">
                        <img src="${rp.image || '/images/placeholder.svg'}" 
                             alt="${rp.name}" 
                             class="related-product-image"
                             onerror="this.src='/images/placeholder.svg'">
                    </div>
                    <div class="related-product-info">
                        <div class="related-product-price-badge">${formatPrice(rp.price)}</div>
                        <h3 class="related-product-name">${rp.name}</h3>
                        <div class="related-product-time">
                            <i class="fas fa-clock"></i>
                            <span>${rp.preparation_time || '3'} ${t.minutes}</span>
                        </div>
                    </div>
                </a>
            </div>
        `).join('') : '';
        
        // Teslimat firmaları için SVG mask class mapping
        const deliveryCompanyClasses = {
            'Yemeksepeti': 'svg-mask-logo-ys',
            'Getir Yemek': 'svg-mask-logo-gy',
            'Trendyol Yemek': 'svg-mask-logo-ty',
            'Migros Yemek': 'svg-mask-logo-my',
            'Tıkla Gelsin': 'svg-mask-logo-tg',
            'İste Gelsin': 'svg-mask-logo-ig'
        };
        
        // productDetail zaten product-detail-container, içeriğini değiştir
        console.log('HTML içeriği ayarlanıyor...');
        productDetail.innerHTML = `
            <div class="product-detail-image-sticky-wrapper">
                <div class="kalp-dugmesi ${isLiked ? 'liked' : ''}" id="likeButton" data-product-id="${product.id}">
                    <i class="fas fa-heart"></i>
                    <span class="like-count">${likes}</span>
                </div>
                <div class="product-detail-image-wrapper">
                    <img src="${product.image || product.category_image || '/images/cat-sandwiches.jpg'}" 
                         alt="${product.name}" 
                         class="product-detail-image"
                         onerror="this.src='/images/cat-sandwiches.jpg'">
                </div>
            </div>
            <div class="product-detail-content">
                <div class="product-detail-category">${product.category_name || ''}</div>
                <div class="product-detail-price-badge">${formatPrice(product.price)}</div>
                <h1 class="product-detail-name">${product.name}</h1>
                ${product.description ? `<p class="product-detail-description">${product.description}</p>` : ''}
                <div class="product-detail-time">
                    <i class="fas fa-clock"></i>
                    <span><b>${t.readyIn}</b> ${product.preparation_time || '3'} ${t.minutes}</span>
                </div>
                
                ${allergenList ? `
                <div class="product-detail-section">
                    <h3 class="product-detail-section-title">${t.allergenInfo}</h3>
                    <p class="product-detail-allergen-info">${t.allergenDesc}</p>
                    <div class="product-detail-allergens-list">
                        ${allergenList}
                    </div>
                </div>
                ` : ''}
                
                ${nutritionalList ? `
                <div class="product-detail-section">
                    <h3 class="product-detail-section-title">${t.nutritionalInfo}</h3>
                    <p class="product-detail-nutritional-info">${t.nutritionalDesc}</p>
                    ${portionSize ? `<p class="product-detail-portion-size">${t.portionSize} – ${portionSize} için</p>` : ''}
                    <div class="product-detail-nutritional-list">
                        ${nutritionalList}
                    </div>
                </div>
                ` : ''}
                
                <div class="product-detail-section">
                    <div class="product-detail-share">
                        <button class="share-btn" onclick="shareProduct('${shareText}', '${shareUrl}')">
                            <i class="fas fa-share-alt"></i>
                            <span>${t.share}</span>
                        </button>
                        <div class="share-icon-buttons">
                            ${socialMediaButtonsHtml}
                        </div>
                    </div>
                </div>
                
                ${relatedProductsList ? `
                <div class="product-detail-section">
                    <h3 class="product-detail-section-title">${t.goesWellWith}</h3>
                    <p class="product-detail-related-info">${t.goesWellWithDesc}</p>
                    <div class="related-products-grid">
                        ${relatedProductsList}
                    </div>
                </div>
                ` : ''}
                
                <!-- Ürün Not/Mesaj Bırakma Formu -->
                <div class="product-detail-section product-message-section">
                    <h3 class="product-detail-section-title">${currentLang === 'tr' ? 'Ürüne Ait Not / Mesaj Bırakın' : 'Leave a Note / Message for Product'}</h3>
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
            </div>
        `;
        
        // Beğeni butonu event listener
        const likeButton = document.getElementById('likeButton');
        if (likeButton) {
            likeButton.addEventListener('click', async () => {
                if (isLiked) return; // Zaten beğenilmişse tekrar beğenme
                
                likeButton.classList.add('animasyon');
                const newCount = await incrementProductLike(slug);
                if (newCount !== null) {
                    const likeCountEl = likeButton.querySelector('.like-count');
                    if (likeCountEl) {
                        likeCountEl.textContent = newCount;
                    }
                    likeButton.classList.add('liked');
                    localStorage.setItem(likedKey, 'true');
                    
                    setTimeout(() => {
                        likeButton.classList.remove('animasyon');
                    }, 1000);
                }
            });
        }

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
                    alert(currentLang === 'tr' ? 'Notunuz başarıyla iletildi!' : 'Your note has been submitted!');
                    prodForm.reset();
                } else {
                    alert(currentLang === 'tr' ? 'Hata: Not iletilemedi' : 'Error: Could not submit note');
                }
            } catch (err) {
                alert(currentLang === 'tr' ? 'Bir hata oluştu' : 'An error occurred');
            } finally {
                if (submitBtn) submitBtn.disabled = false;
            }
        });
        
        // Sayfa başlığını güncelle
        document.title = `${product.name} - QR Menü`;
    } catch (error) {
        console.error('Ürün detayı yüklenemedi:', error);
        console.error('Hata detayı:', error.message, error.stack);
        const productDetail = document.getElementById('productDetail');
        if (productDetail) {
            const errorText = currentLang === 'tr' 
                ? `Ürün yüklenirken bir hata oluştu: ${error.message}` 
                : `An error occurred while loading product: ${error.message}`;
            productDetail.innerHTML = `
                <div class="product-detail-content" style="width: 100%; padding: 40px; text-align: center;">
                    <div class="loading" style="color: #d32f2f;">${errorText}</div>
                    <a href="/" style="display: inline-block; margin-top: 20px; padding: 12px 24px; background: var(--gold-color); color: var(--text-color); text-decoration: none; border-radius: 8px; font-weight: 600;">
                        ${currentLang === 'tr' ? 'Ana Sayfaya Dön' : 'Back to Home'}
                    </a>
                </div>
            `;
        }
    }
};

// Paylaş fonksiyonu
const shareProduct = (name, url) => {
    if (navigator.share) {
        navigator.share({
            title: name,
            text: name + ' - QR Menü',
            url: url
        }).catch(err => console.log('Paylaşım iptal edildi'));
    } else {
        navigator.clipboard.writeText(url).then(() => {
            alert(currentLang === 'tr' ? 'Link kopyalandı!' : 'Link copied!');
        });
    }
};

// Fiyat formatı
const formatPrice = (price) => {
    return new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency: 'TRY'
    }).format(price);
};

// Sayfa yüklendiğinde
const initializePage = () => {
    console.log('Sayfa başlatılıyor...');
    initLanguage();
    loadRestaurantInfo();
    loadProductDetail();
    updateWhatsAppButton();
};

// DOMContentLoaded kontrolü
if (document.readyState === 'loading') {
    // DOMContentLoaded bekleniyor
    console.log('DOMContentLoaded bekleniyor...');
    document.addEventListener('DOMContentLoaded', initializePage);
} else {
    // DOMContentLoaded zaten geçti, hemen çalıştır
    console.log('DOMContentLoaded zaten geçti, hemen çalıştırılıyor...');
    initializePage();
}
