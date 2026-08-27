// Generate QR Code for target URL
const generateQRCodeForUrl = (urlStr) => {
    const targetUrl = urlStr && String(urlStr).trim() !== '' ? urlStr.trim() : (window.location.origin || 'http://localhost:3000');
    const urlDisplay = document.getElementById('qrUrlDisplay');
    if (urlDisplay) urlDisplay.textContent = targetUrl;

    const canvas = document.getElementById('qrCodeCanvas');
    const imgPreview = document.getElementById('qrCodeImagePreview');
    const removeBtn = document.getElementById('removeQRBtn');

    if (canvas && typeof QRious !== 'undefined') {
        try {
            new QRious({
                element: canvas,
                value: targetUrl,
                size: 200,
                level: 'H'
            });
            canvas.style.display = 'block';
            if (imgPreview) imgPreview.style.display = 'none';
            if (removeBtn) removeBtn.style.display = 'block';
        } catch (err) {
            console.error('QRious error:', err);
        }
    }
};

const handleMenuUrlInput = (val) => {
    generateQRCodeForUrl(val);
};

const copyMenuUrl = () => {
    const input = document.getElementById('menuUrl');
    const url = input ? input.value : (window.location.origin || 'http://localhost:3000');
    navigator.clipboard.writeText(url).then(() => {
        if (typeof showNotification === 'function') {
            showNotification('Menü URL\'i kopyalandı! 📋', 'success');
        } else {
            alert('Menü URL\'i kopyalandı!');
        }
    }).catch(() => {
        if (typeof showNotification === 'function') {
            showNotification('URL kopyalanamadı', 'error');
        }
    });
};

const shareQRCode = () => {
    const input = document.getElementById('menuUrl');
    const url = input ? input.value : (window.location.origin || 'http://localhost:3000');
    if (navigator.share) {
        navigator.share({
            title: 'SOLANTE COFFEE QR Menü',
            text: 'Menümüzü dijital ortamda inceleyin',
            url: url
        }).catch(() => {});
    } else {
        copyMenuUrl();
    }
};

const removeQRCodeImage = () => {
    const canvas = document.getElementById('qrCodeCanvas');
    const imgPreview = document.getElementById('qrCodeImagePreview');
    const removeBtn = document.getElementById('removeQRBtn');
    if (canvas) canvas.style.display = 'none';
    if (imgPreview) {
        imgPreview.src = '';
        imgPreview.style.display = 'none';
    }
    if (removeBtn) removeBtn.style.display = 'none';
    if (typeof showNotification === 'function') {
        showNotification('QR Kod görseli kaldırıldı', 'success');
    }
    const currentMenuUrl = document.getElementById('menuUrl')?.value || (window.location.origin || 'http://localhost:3000');
    generateQRCodeForUrl(currentMenuUrl);
};

// Load settings
const loadSettings = async () => {
    try {
        const token = sessionStorage.getItem('adminToken');
        let settings = {};
        
        try {
            const response = await fetch('/api/admin/settings', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const rows = await response.json();
                (Array.isArray(rows) ? rows : []).forEach(r => {
                    settings[r.key] = r.value;
                });
            }
        } catch (err) {
            console.warn('Admin settings fetch error, falling back to /api/restaurant:', err);
        }

        const resRest = await fetch('/api/restaurant');
        if (resRest.ok) {
            const restData = await resRest.json();
            settings = { ...restData, ...settings };
        }
        
        const companyName = document.getElementById('companyName');
        if (companyName) companyName.value = settings.company_name || settings.restaurant_name || settings.name || '';

        const companySlogan = document.getElementById('companySlogan');
        if (companySlogan) companySlogan.value = settings.company_slogan || settings.slogan || settings.restaurant_slogan || '';
        
        if (settings.company_logo || settings.restaurant_logo || settings.logo) {
            const preview = document.getElementById('logoPreview');
            if (preview) preview.innerHTML = `<img src="${settings.company_logo || settings.restaurant_logo || settings.logo}" alt="Logo">`;
        }
        if (settings.company_icon || settings.restaurant_icon || settings.icon) {
            const preview = document.getElementById('iconPreview');
            if (preview) preview.innerHTML = `<img src="${settings.company_icon || settings.restaurant_icon || settings.icon}" alt="Icon">`;
        }
        
        const currentMenuUrl = settings.menu_url || (window.location.origin || 'http://localhost:3000');
        const menuUrlInput = document.getElementById('menuUrl');
        if (menuUrlInput) menuUrlInput.value = currentMenuUrl;
        
        const brandInput = document.getElementById('adminBrandText');
        if (brandInput) brandInput.value = settings.admin_brand_text || '';

        const wifiNameInput = document.getElementById('wifiName');
        if (wifiNameInput) wifiNameInput.value = settings.wifi_name || '';
        
        const wifiPassInput = document.getElementById('wifiPassword');
        if (wifiPassInput) wifiPassInput.value = settings.wifi_password || '';

        if (settings.qr_code_image) {
            const imagePreview = document.getElementById('qrCodeImagePreview');
            const canvas = document.getElementById('qrCodeCanvas');
            const removeBtn = document.getElementById('removeQRBtn');
            const urlDisplay = document.getElementById('qrUrlDisplay');
            
            if (imagePreview) {
                imagePreview.src = settings.qr_code_image;
                imagePreview.style.display = 'block';
            }
            if (canvas) canvas.style.display = 'none';
            if (removeBtn) removeBtn.style.display = 'block';
            if (urlDisplay) urlDisplay.textContent = currentMenuUrl;
        } else {
            generateQRCodeForUrl(currentMenuUrl);
        }
    } catch (error) {
        console.error('Settings load error:', error);
    }
};

// Update settings
const updateSettings = async () => {
    try {
        const formData = new FormData();
        const companyName = document.getElementById('companyName')?.value || '';
        const companySlogan = document.getElementById('companySlogan')?.value || '';
        const adminBrandText = document.getElementById('adminBrandText')?.value || '';
        const menuUrlVal = document.getElementById('menuUrl')?.value || '';
        const wifiNameVal = document.getElementById('wifiName')?.value || '';
        const wifiPassVal = document.getElementById('wifiPassword')?.value || '';
        
        formData.append('company_name', companyName);
        formData.append('restaurant_name', companyName);
        formData.append('slogan', companySlogan);
        formData.append('restaurant_slogan', companySlogan);
        formData.append('admin_brand_text', adminBrandText);
        formData.append('menu_url', menuUrlVal);
        formData.append('wifi_name', wifiNameVal);
        formData.append('wifi_password', wifiPassVal);

        const logoFile = document.getElementById('companyLogo')?.files[0];
        const iconFile = document.getElementById('companyIcon')?.files[0];

        if (logoFile) formData.append('logo', logoFile);
        if (iconFile) formData.append('icon', iconFile);

        const canvas = document.getElementById('qrCodeCanvas');
        if (canvas && canvas.style.display !== 'none' && typeof canvas.toBlob === 'function') {
            canvas.toBlob((blob) => {
                if (blob) {
                    formData.append('qr_code_image', blob, 'qr-code.png');
                }
                sendUpdateRequest(formData);
            }, 'image/png');
            return;
        }

        sendUpdateRequest(formData);
    } catch (error) {
        console.error('Update error:', error);
        if (typeof showNotification === 'function') {
            showNotification('Hata: ' + error.message, 'error');
        }
    }
};

// Send update request
const sendUpdateRequest = async (formData) => {
    try {
        const token = sessionStorage.getItem('adminToken');
        const response = await fetch('/api/admin/settings/company', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error || 'Ayarlar güncellenemedi');
        }

        if (typeof showNotification === 'function') {
            showNotification('Ayarlar başarıyla güncellendi!', 'success');
        }
        setTimeout(() => location.reload(), 1000);
    } catch (error) {
        console.error('Update error:', error);
        if (typeof showNotification === 'function') {
            showNotification('Hata: ' + error.message, 'error');
        }
    }
};

// Image preview handlers & initialization
document.addEventListener('DOMContentLoaded', () => {
    if (typeof checkAuth === 'function' && !checkAuth()) return;

    // Logo upload
    const logoArea = document.getElementById('logoUploadArea');
    const logoInput = document.getElementById('companyLogo');
    const logoPreview = document.getElementById('logoPreview');

    if (logoArea && logoInput) {
        logoArea.addEventListener('click', () => logoInput.click());
        logoInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file && logoPreview) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    logoPreview.innerHTML = `<img src="${e.target.result}" alt="Logo">`;
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Icon upload
    const iconArea = document.getElementById('iconUploadArea');
    const iconInput = document.getElementById('companyIcon');
    const iconPreview = document.getElementById('iconPreview');

    if (iconArea && iconInput) {
        iconArea.addEventListener('click', () => iconInput.click());
        iconInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file && iconPreview) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    iconPreview.innerHTML = `<img src="${e.target.result}" alt="Icon">`;
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Initial load
    loadSettings();
});
