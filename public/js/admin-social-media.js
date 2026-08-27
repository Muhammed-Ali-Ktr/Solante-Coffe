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

const loadSocialMedia = async () => {
    try {
        const response = await fetch(`${API_BASE}/social-media`, {
            headers: getAuthHeaders()
        });
        
        if (!response.ok) throw new Error('Sosyal medya ayarları yüklenemedi');
        
        const socialMedia = await response.json();
        const socialObj = {};
        socialMedia.forEach(sm => {
            socialObj[sm.platform] = sm.url;
        });

        if (socialObj.instagram) document.getElementById('instagramUrl').value = socialObj.instagram;
        if (socialObj.facebook) document.getElementById('facebookUrl').value = socialObj.facebook;
        if (socialObj.youtube) document.getElementById('youtubeUrl').value = socialObj.youtube;
        if (socialObj.twitter) document.getElementById('twitterUrl').value = socialObj.twitter;
        if (socialObj.tiktok) document.getElementById('tiktokUrl').value = socialObj.tiktok;
        if (socialObj.website) document.getElementById('websiteUrl').value = socialObj.website;
        if (socialObj.whatsapp) document.getElementById('whatsappUrl').value = socialObj.whatsapp;

        // Load WhatsApp button setting and menu URL
        const settingsResponse = await fetch(`${API_BASE}/settings`, {
            headers: getAuthHeaders()
        });
        if (settingsResponse.ok) {
            const settings = await settingsResponse.json();
            const settingsObj = {};
            settings.forEach(s => {
                settingsObj[s.key] = s.value;
            });
            
            const whatsappEnabled = settings.find(s => s.key === 'whatsapp_button_enabled');
            if (whatsappEnabled) {
                const toggleBtns = document.querySelectorAll('.toggle-btn');
                toggleBtns.forEach(btn => {
                    btn.classList.toggle('active', btn.dataset.value === whatsappEnabled.value);
                });
                document.getElementById('whatsappButtonEnabled').value = whatsappEnabled.value;
            }

            // Load menu URL for QR
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

const updateSocialMedia = async () => {
    try {
        const data = {
            instagram: document.getElementById('instagramUrl').value,
            facebook: document.getElementById('facebookUrl').value,
            youtube: document.getElementById('youtubeUrl').value,
            twitter: document.getElementById('twitterUrl').value,
            tiktok: document.getElementById('tiktokUrl').value,
            website: document.getElementById('websiteUrl').value,
            whatsapp: document.getElementById('whatsappUrl').value,
            whatsapp_button_enabled: document.getElementById('whatsappButtonEnabled').value
        };

        // Menu URL'i de ekle
        const menuUrl = document.getElementById('menuUrl');
        if (menuUrl && menuUrl.value) {
            data.menu_url = menuUrl.value;
        }

        const response = await fetch(`${API_BASE}/social-media`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(data)
        });

        if (!response.ok) throw new Error('Ayarlar güncellenemedi');

        showNotification('Sosyal medya ayarları başarıyla güncellendi!', 'success');
    } catch (error) {
        console.error('Update error:', error);
        showNotification('Hata: ' + error.message, 'error');
    }
};

document.addEventListener('DOMContentLoaded', () => {
    if (!checkAuth()) return;

    // Toggle buttons
    document.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById('whatsappButtonEnabled').value = btn.dataset.value;
        });
    });

    loadSocialMedia();
});

