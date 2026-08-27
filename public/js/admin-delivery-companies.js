const API_BASE = '/api/admin';

const normalizeKey = (value) =>
    (value || '')
        .toString()
        .toLowerCase()
        .replace(/ı/g, 'i')
        .replace(/ş/g, 's')
        .replace(/ğ/g, 'g')
        .replace(/ü/g, 'u')
        .replace(/ö/g, 'o')
        .replace(/ç/g, 'c')
        .replace(/\s+/g, '_');

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

const loadDeliveryCompanies = async () => {
    try {
        const response = await fetch(`${API_BASE}/delivery-companies`, {
            headers: getAuthHeaders()
        });
        
        if (!response.ok) throw new Error('Aracı firmalar yüklenemedi');
        
        const companies = await response.json();
        const companyObj = {};
        companies.forEach(comp => {
            companyObj[normalizeKey(comp.name)] = comp.url;
        });

        if (companyObj.yemek_sepeti) document.getElementById('yemekSepetiUrl').value = companyObj.yemek_sepeti;
        if (companyObj.getir_yemek) document.getElementById('getirYemekUrl').value = companyObj.getir_yemek;
        if (companyObj.trendyol_yemek) document.getElementById('trendyolYemekUrl').value = companyObj.trendyol_yemek;
        if (companyObj.migros_yemek) document.getElementById('migrosYemekUrl').value = companyObj.migros_yemek;
        if (companyObj.tikla_gelsin) document.getElementById('tiklaGelsinUrl').value = companyObj.tikla_gelsin;
        if (companyObj.iste_gelsin) document.getElementById('isteGelsinUrl').value = companyObj.iste_gelsin;

        // Load menu URL for QR
        const settingsResponse = await fetch(`${API_BASE}/settings`, {
            headers: getAuthHeaders()
        });
        if (settingsResponse.ok) {
            const settings = await settingsResponse.json();
            const settingsObj = {};
            settings.forEach(s => {
                settingsObj[s.key] = s.value;
            });
            
            const menuUrl = document.getElementById('menuUrl');
            if (menuUrl) {
                if (settingsObj.menu_url) {
                    menuUrl.value = settingsObj.menu_url;
                }
                menuUrl.removeAttribute('readonly');
                
                // Load QR code image if exists
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
        console.error('Load error:', error);
    }
};

const updateDeliveryCompanies = async () => {
    try {
        const data = {
            yemek_sepeti: document.getElementById('yemekSepetiUrl').value,
            getir_yemek: document.getElementById('getirYemekUrl').value,
            trendyol_yemek: document.getElementById('trendyolYemekUrl').value,
            migros_yemek: document.getElementById('migrosYemekUrl').value,
            tikla_gelsin: document.getElementById('tiklaGelsinUrl').value,
            iste_gelsin: document.getElementById('isteGelsinUrl').value
        };
        
        // Menu URL'i de ekle
        const menuUrl = document.getElementById('menuUrl');
        if (menuUrl && menuUrl.value) {
            data.menu_url = menuUrl.value;
        }

        const response = await fetch(`${API_BASE}/delivery-companies`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(data)
        });

        if (!response.ok) throw new Error('Ayarlar güncellenemedi');

        showNotification('Aracı firmalar başarıyla güncellendi!', 'success');
    } catch (error) {
        console.error('Update error:', error);
        showNotification('Hata: ' + error.message, 'error');
    }
};

const loadMenuUrl = async () => {
    try {
        const response = await fetch(`${API_BASE}/settings`, {
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            const settings = await response.json();
            const settingsObj = {};
            settings.forEach(s => {
                settingsObj[s.key] = s.value;
            });
            
            const menuUrlInput = document.getElementById('menuUrl');
            if (menuUrlInput) {
                if (settingsObj.menu_url) {
                    menuUrlInput.value = settingsObj.menu_url;
                }
                // Remove readonly if exists
                menuUrlInput.removeAttribute('readonly');
                
                // Load QR code image if exists
                if (settingsObj.qr_code_image) {
                    // QR kod görseli varsa göster (eğer preview elementi varsa)
                    const qrCodeImagePreview = document.getElementById('qrCodeImagePreview');
                    const qrCodeCanvas = document.getElementById('qrCodeCanvas');
                    if (qrCodeImagePreview) {
                        qrCodeImagePreview.src = settingsObj.qr_code_image;
                        qrCodeImagePreview.style.display = 'block';
                        if (qrCodeCanvas) qrCodeCanvas.style.display = 'none';
                    }
                } else if (settingsObj.menu_url) {
                    generateQRCode(settingsObj.menu_url, 'qrCodeCanvas');
                } else if (menuUrlInput.value) {
                    generateQRCode(menuUrlInput.value, 'qrCodeCanvas');
                }
            }
        }
    } catch (error) {
        console.error('Menu URL load error:', error);
        // Generate QR with default URL
        const menuUrlInput = document.getElementById('menuUrl');
        if (menuUrlInput && menuUrlInput.value) {
            generateQRCode(menuUrlInput.value, 'qrCodeCanvas');
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    if (!checkAuth()) return;
    loadDeliveryCompanies();
    loadMenuUrl();
});

