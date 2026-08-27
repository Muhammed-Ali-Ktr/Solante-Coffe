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

// Load design settings
const loadDesignSettings = async () => {
    try {
        const response = await fetch(`${API_BASE}/settings`, {
            headers: getAuthHeaders()
        });
        
        if (!response.ok) throw new Error('Ayarlar yüklenemedi');
        
        const settings = await response.json();
        const settingsObj = {};
        settings.forEach(s => {
            settingsObj[s.key] = s.value;
        });

        // Fill form
        if (settingsObj.primary_color) {
            document.getElementById('primaryColor').value = settingsObj.primary_color;
            document.getElementById('primaryColorText').value = settingsObj.primary_color;
        }
        if (settingsObj.hover_color) {
            document.getElementById('hoverColor').value = settingsObj.hover_color;
            document.getElementById('hoverColorText').value = settingsObj.hover_color;
        }
        if (settingsObj.header_color) {
            document.getElementById('headerColor').value = settingsObj.header_color;
            document.getElementById('headerColorText').value = settingsObj.header_color;
        }
        if (settingsObj.back_button_enabled) {
            const toggleBtns = document.querySelectorAll('.toggle-btn');
            toggleBtns.forEach(btn => {
                btn.classList.toggle('active', btn.dataset.value === settingsObj.back_button_enabled);
            });
            document.getElementById('backButtonEnabled').value = settingsObj.back_button_enabled;
        }
        if (settingsObj.desktop_logo_width) {
            document.getElementById('desktopLogoWidth').value = settingsObj.desktop_logo_width;
        }
        if (settingsObj.tablet_logo_width) {
            document.getElementById('tabletLogoWidth').value = settingsObj.tablet_logo_width;
        }
        if (settingsObj.mobile_logo_width) {
            document.getElementById('mobileLogoWidth').value = settingsObj.mobile_logo_width;
        }
        if (settingsObj.menu_background_color) {
            document.getElementById('menuBackgroundColor').value = settingsObj.menu_background_color;
            document.getElementById('menuBackgroundColorText').value = settingsObj.menu_background_color;
        }
        if (settingsObj.text_color) {
            document.getElementById('textColor').value = settingsObj.text_color;
            document.getElementById('textColorText').value = settingsObj.text_color;
        }
        if (settingsObj.border_radius) {
            document.getElementById('borderRadius').value = settingsObj.border_radius;
        }
        if (settingsObj.section_spacing) {
            document.getElementById('sectionSpacing').value = settingsObj.section_spacing;
        }
        if (settingsObj.font_family) {
            document.getElementById('fontFamily').value = settingsObj.font_family;
        }
        if (settingsObj.menu_url) {
            document.getElementById('menuUrl').value = settingsObj.menu_url;
        }
        
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
        }
    } catch (error) {
        console.error('Settings load error:', error);
    }
};

// Update design settings
const updateDesignSettings = async () => {
    try {
        const formData = new FormData();
        formData.append('primary_color', document.getElementById('primaryColor').value);
        formData.append('hover_color', document.getElementById('hoverColor').value);
        formData.append('header_color', document.getElementById('headerColor').value);
        formData.append('back_button_enabled', document.getElementById('backButtonEnabled').value);
        formData.append('desktop_logo_width', document.getElementById('desktopLogoWidth').value);
        formData.append('tablet_logo_width', document.getElementById('tabletLogoWidth').value);
        formData.append('mobile_logo_width', document.getElementById('mobileLogoWidth').value);
        formData.append('menu_background_color', document.getElementById('menuBackgroundColor').value);
        formData.append('text_color', document.getElementById('textColor').value);
        formData.append('border_radius', document.getElementById('borderRadius').value);
        formData.append('section_spacing', document.getElementById('sectionSpacing').value);
        formData.append('font_family', document.getElementById('fontFamily').value);
        
        // Menu URL'i ekle
        const menuUrl = document.getElementById('menuUrl');
        if (menuUrl && menuUrl.value) {
            formData.append('menu_url', menuUrl.value);
        }
        
        // QR kod görseli varsa ekle
        const qrCodeFile = document.getElementById('qrCodeImage')?.files[0];
        if (qrCodeFile) {
            formData.append('qr_code_image', qrCodeFile);
        }

        const token = sessionStorage.getItem('adminToken');
        const response = await fetch(`${API_BASE}/settings/design`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        if (!response.ok) throw new Error('Ayarlar güncellenemedi');

        showNotification('Tasarım ayarları başarıyla güncellendi!', 'success');
    } catch (error) {
        console.error('Update error:', error);
        showNotification('Hata: ' + error.message, 'error');
    }
};

document.addEventListener('DOMContentLoaded', () => {
    if (!checkAuth()) return;

    // Color inputs sync
    const colorInputs = [
        { color: 'primaryColor', text: 'primaryColorText' },
        { color: 'hoverColor', text: 'hoverColorText' },
        { color: 'headerColor', text: 'headerColorText' },
        { color: 'menuBackgroundColor', text: 'menuBackgroundColorText' },
        { color: 'textColor', text: 'textColorText' }
    ];

    colorInputs.forEach(({ color, text }) => {
        const colorInput = document.getElementById(color);
        const textInput = document.getElementById(text);
        
        if (colorInput && textInput) {
            colorInput.addEventListener('input', (e) => {
                textInput.value = e.target.value;
            });
            
            textInput.addEventListener('input', (e) => {
                const value = e.target.value;
                // Support both #RRGGBB and #RGB formats
                if (/^#[0-9A-F]{3,6}$/i.test(value)) {
                    // Convert #RGB to #RRGGBB if needed
                    if (value.length === 4) {
                        const r = value[1];
                        const g = value[2];
                        const b = value[3];
                        colorInput.value = `#${r}${r}${g}${g}${b}${b}`;
                        textInput.value = colorInput.value;
                    } else {
                        colorInput.value = value;
                    }
                }
            });
        }
    });

    // Toggle buttons
    document.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const hiddenInput = document.getElementById('backButtonEnabled');
            if (hiddenInput) {
                hiddenInput.value = btn.dataset.value;
            }
        });
    });

    // Load menu URL and generate QR code
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
                menuUrlInput.removeAttribute('readonly');
                generateQRCode(menuUrlInput.value, 'qrCodeCanvas');
            }
        }
    };

    // Load settings
    loadDesignSettings();
    loadMenuUrl();
});

