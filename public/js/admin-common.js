// Common admin functions
const API_BASE = '/api/admin';

// Get auth headers
const getAuthHeaders = () => {
    const token = sessionStorage.getItem('adminToken');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
};

// Show notification
const showNotification = (message, type = 'success') => {
    // Remove existing notifications
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();

    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.classList.add('show');
    }, 10);

    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
};

// QR Code generation
const generateQRCode = (url, canvasId) => {
    if (typeof QRCode === 'undefined') {
        console.error('QRCode library not loaded');
        return;
    }

    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    QRCode.toCanvas(canvas, url, {
        width: 250,
        margin: 2,
        color: {
            dark: '#000000',
            light: '#FFFFFF'
        }
    }, (error) => {
        if (error) console.error('QR Code generation error:', error);
    });
};

// Load QR Code settings (for all admin pages)
const loadQRCodeSettings = async () => {
    try {
        const response = await fetch(`${API_BASE}/settings`, {
            headers: getAuthHeaders()
        });
        
        if (!response.ok) return;
        
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
        }

        // Load QR code image if exists
        const qrCodeImagePreview = document.getElementById('qrCodeImagePreview');
        const qrCodeCanvas = document.getElementById('qrCodeCanvas');
        
        if (settingsObj.qr_code_image && qrCodeImagePreview) {
            qrCodeImagePreview.src = settingsObj.qr_code_image;
            qrCodeImagePreview.style.display = 'block';
            if (qrCodeCanvas) qrCodeCanvas.style.display = 'none';
        } else if (settingsObj.menu_url && qrCodeCanvas) {
            generateQRCode(settingsObj.menu_url, 'qrCodeCanvas');
        }
    } catch (error) {
        console.error('QR Code settings load error:', error);
    }
};

// Copy URL to clipboard
const copyUrl = () => {
    const urlInput = document.getElementById('menuUrl');
    if (urlInput) {
        urlInput.select();
        document.execCommand('copy');
        showNotification('URL kopyalandı!', 'success');
    }
};

// View URL
const viewUrl = () => {
    const urlInput = document.getElementById('menuUrl');
    if (urlInput) {
        window.open(urlInput.value, '_blank');
    }
};

// Download QR Code
const downloadQR = () => {
    const canvas = document.getElementById('qrCodeCanvas');
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = 'qr-code.png';
    link.href = canvas.toDataURL();
    link.click();
};

// Check authentication
const checkAuth = () => {
    const token = sessionStorage.getItem('adminToken');
    if (!token) {
        window.location.href = '/yonetim';
        return false;
    }
    return true;
};

// Logout
const handleLogout = () => {
    sessionStorage.removeItem('adminToken');
    sessionStorage.removeItem('adminUsername');
    window.location.href = '/yonetim';
};

// Load QR Code settings (for all admin pages)
const loadQRCodeSettings = async () => {
    try {
        const response = await fetch(`${API_BASE}/settings`, {
            headers: getAuthHeaders()
        });
        
        if (!response.ok) return;
        
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
        }

        // Load QR code image if exists
        const qrCodeImagePreview = document.getElementById('qrCodeImagePreview');
        const qrCodeCanvas = document.getElementById('qrCodeCanvas');
        
        if (settingsObj.qr_code_image && qrCodeImagePreview) {
            qrCodeImagePreview.src = settingsObj.qr_code_image;
            qrCodeImagePreview.style.display = 'block';
            if (qrCodeCanvas) qrCodeCanvas.style.display = 'none';
        } else if (settingsObj.menu_url && qrCodeCanvas) {
            generateQRCode(settingsObj.menu_url, 'qrCodeCanvas');
        }
    } catch (error) {
        console.error('QR Code settings load error:', error);
    }
};

