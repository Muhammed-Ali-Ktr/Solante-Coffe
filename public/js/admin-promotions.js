const API_BASE = '/api/admin';

const getAuthHeaders = () => {
    const token = sessionStorage.getItem('adminToken');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
};

const showNotification = (message, type = 'success') => {
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.classList.add('show'), 10);
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
};

const checkAuth = () => {
    const token = sessionStorage.getItem('adminToken');
    if (!token) {
        window.location.href = '/yonetim';
        return false;
    }
    return true;
};

const generateQRCode = (url, canvasId) => {
    if (typeof QRCode === 'undefined') return;
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    QRCode.toCanvas(canvas, url, { width: 250, margin: 2 }, (error) => {
        if (error) console.error('QR Code error:', error);
    });
};

const copyUrl = () => {
    const urlInput = document.getElementById('menuUrl');
    if (urlInput) {
        urlInput.select();
        document.execCommand('copy');
        showNotification('URL kopyalandı!', 'success');
    }
};

const viewUrl = () => {
    const urlInput = document.getElementById('menuUrl');
    if (urlInput) window.open(urlInput.value, '_blank');
};

const downloadQR = () => {
    const canvas = document.getElementById('qrCodeCanvas');
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = 'qr-code.png';
    link.href = canvas.toDataURL();
    link.click();
};

let allProducts = [];
let allCategories = [];
/** @type {Record<number, number>} categoryId -> productId */
let categoryPicks = {};

const loadCategories = async () => {
    const response = await fetch(`${API_BASE}/categories`, { headers: getAuthHeaders() });
    if (!response.ok) throw new Error('Kategoriler yüklenemedi');
    allCategories = await response.json();
};

const loadProducts = async () => {
    const response = await fetch(`${API_BASE}/products`, { headers: getAuthHeaders() });
    if (!response.ok) throw new Error('Ürünler yüklenemedi');
    allProducts = await response.json();
};

const productsInCategory = (categoryId) =>
    allProducts.filter((p) => Number(p.category_id) === Number(categoryId));

const renderCategoryChefPicks = () => {
    const container = document.getElementById('categoryChefPicksList');
    if (!container) return;

    if (!allCategories.length) {
        container.innerHTML = '<p class="form-help">Henüz kategori yok. Önce kategori ekleyin.</p>';
        return;
    }

    container.innerHTML = allCategories
        .map((cat) => {
            const options = productsInCategory(cat.id);
            const selected = categoryPicks[cat.id] || '';
            const optsHtml = options.length
                ? options
                      .map(
                          (p) =>
                              `<option value="${p.id}" ${Number(selected) === p.id ? 'selected' : ''}>${escapeHtml(p.name)} — ${formatPrice(p.price)}</option>`
                      )
                      .join('')
                : '';

            return `
                <div class="category-chef-pick-row" data-category-id="${cat.id}">
                    <label class="category-chef-pick-label">${escapeHtml(cat.name)}</label>
                    <select class="category-chef-pick-select" data-category-id="${cat.id}">
                        <option value="">— Şefin önerisi seçin —</option>
                        ${optsHtml}
                        ${!options.length ? '<option value="" disabled>Bu kategoride ürün yok</option>' : ''}
                    </select>
                </div>`;
        })
        .join('');

    container.querySelectorAll('.category-chef-pick-select').forEach((sel) => {
        sel.addEventListener('change', () => {
            const catId = parseInt(sel.dataset.categoryId, 10);
            const val = parseInt(sel.value, 10);
            if (!isNaN(catId)) {
                if (!isNaN(val)) categoryPicks[catId] = val;
                else delete categoryPicks[catId];
            }
        });
    });
};

const escapeHtml = (s) =>
    String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

const formatPrice = (price) =>
    new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(Number(price) || 0);

const collectCategoryPicksFromDOM = () => {
    const picks = {};
    document.querySelectorAll('.category-chef-pick-select').forEach((sel) => {
        const catId = parseInt(sel.dataset.categoryId, 10);
        const val = parseInt(sel.value, 10);
        if (!isNaN(catId) && !isNaN(val)) picks[catId] = val;
    });
    return picks;
};

const loadPromotions = async () => {
    try {
        const response = await fetch(`${API_BASE}/promotions`, { headers: getAuthHeaders() });
        if (!response.ok) throw new Error('Tanıtım alanları yüklenemedi');

        const promotion = await response.json();

        if (promotion.title_tr) {
            document.getElementById('chefPicksTitleTr').value = promotion.title_tr;
        }
        if (promotion.title_en) {
            document.getElementById('chefPicksTitleEn').value = promotion.title_en;
        }
        if (promotion.category_picks && typeof promotion.category_picks === 'object') {
            categoryPicks = {};
            Object.entries(promotion.category_picks).forEach(([catId, prodId]) => {
                const cid = parseInt(catId, 10);
                const pid = parseInt(prodId, 10);
                if (!isNaN(cid) && !isNaN(pid)) categoryPicks[cid] = pid;
            });
        }
    } catch (error) {
        console.error('Load error:', error);
    }
};

const updatePromotions = async () => {
    try {
        categoryPicks = collectCategoryPicksFromDOM();

        const data = {
            title_tr: document.getElementById('chefPicksTitleTr').value,
            title_en: document.getElementById('chefPicksTitleEn').value,
            category_picks: categoryPicks
        };

        const menuUrl = document.getElementById('menuUrl');
        if (menuUrl && menuUrl.value) {
            data.menu_url = menuUrl.value;
        }

        const response = await fetch(`${API_BASE}/promotions`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const errBody = await response.json().catch(() => ({}));
            throw new Error(errBody.error || 'Tanıtım alanları güncellenemedi');
        }

        await loadPromotions();
        renderCategoryChefPicks();
        showNotification('Şefin önerileri başarıyla güncellendi!', 'success');
    } catch (error) {
        console.error('Update error:', error);
        showNotification('Hata: ' + error.message, 'error');
    }
};

document.addEventListener('DOMContentLoaded', async () => {
    if (!checkAuth()) return;

    const loadMenuUrl = async () => {
        try {
            const response = await fetch(`${API_BASE}/settings`, { headers: getAuthHeaders() });
            if (response.ok) {
                const settings = await response.json();
                const settingsObj = {};
                settings.forEach((s) => {
                    settingsObj[s.key] = s.value;
                });

                const menuUrl = document.getElementById('menuUrl');
                if (menuUrl) {
                    if (settingsObj.menu_url) menuUrl.value = settingsObj.menu_url;
                    menuUrl.removeAttribute('readonly');

                    if (settingsObj.qr_code_image) {
                        const qrCodeImagePreview = document.getElementById('qrCodeImagePreview');
                        const qrCodeCanvas = document.getElementById('qrCodeCanvas');
                        if (qrCodeImagePreview) {
                            qrCodeImagePreview.src = settingsObj.qr_code_image;
                            qrCodeImagePreview.style.display = 'block';
                            if (qrCodeCanvas) qrCodeCanvas.style.display = 'none';
                        }
                    } else if (settingsObj.menu_url) {
                        generateQRCode(settingsObj.menu_url, 'qrCodeCanvas');
                    } else if (menuUrl.value) {
                        generateQRCode(menuUrl.value, 'qrCodeCanvas');
                    }
                }
            }
        } catch (error) {
            console.error('Menu URL load error:', error);
            const menuUrl = document.getElementById('menuUrl');
            if (menuUrl && menuUrl.value) {
                menuUrl.removeAttribute('readonly');
                generateQRCode(menuUrl.value, 'qrCodeCanvas');
            }
        }
    };

    loadMenuUrl();

    try {
        await Promise.all([loadCategories(), loadProducts()]);
        await loadPromotions();
        renderCategoryChefPicks();
    } catch (error) {
        console.error(error);
        showNotification('Veriler yüklenemedi: ' + error.message, 'error');
    }
});
