const ADMIN_API_BASE = '/api/admin';

const showSidebarNotification = (message, type = 'success') => {
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

const injectProfileSettingsModal = () => {
    if (document.getElementById('adminProfileModal')) return;

    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
        <div class="modal" id="adminProfileModal">
            <div class="modal-content" style="max-width:520px;">
                <div class="modal-header">
                    <h2>Admin Hesabı</h2>
                    <button class="modal-close" id="closeAdminProfileModal">&times;</button>
                </div>
                <div class="modal-body">
                    <p style="margin-bottom:14px;color:var(--text-light);font-size:13px;">
                        Güvenlik için mevcut şifrenizi iki kez girmeniz zorunludur.
                    </p>
                    <div class="form-group">
                        <label for="accountCurrentPassword">Mevcut Şifre *</label>
                        <input type="password" id="accountCurrentPassword" autocomplete="current-password">
                    </div>
                    <div class="form-group">
                        <label for="accountCurrentPasswordRepeat">Mevcut Şifre (Tekrar) *</label>
                        <input type="password" id="accountCurrentPasswordRepeat" autocomplete="current-password">
                    </div>
                    <div class="form-group">
                        <label for="accountNewUsername">Yeni Admin Kullanıcı Adı</label>
                        <input type="text" id="accountNewUsername" placeholder="Boş bırakırsanız değişmez" autocomplete="username">
                    </div>
                    <div class="form-group">
                        <label for="accountNewPassword">Yeni Şifre</label>
                        <input type="password" id="accountNewPassword" placeholder="En az 6 karakter" autocomplete="new-password">
                    </div>
                    <div class="form-group">
                        <label for="accountNewPasswordRepeat">Yeni Şifre (Tekrar)</label>
                        <input type="password" id="accountNewPasswordRepeat" autocomplete="new-password">
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" id="cancelAdminProfileBtn">Vazgeç</button>
                    <button class="btn btn-primary" id="saveAdminProfileBtn">Kaydet</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(wrapper.firstElementChild);
};

const wireProfileSettings = () => {
    const token = sessionStorage.getItem('adminToken');
    if (!token) return;

    injectProfileSettingsModal();

    const profileBtn = document.querySelector('.user-profile');
    const modal = document.getElementById('adminProfileModal');
    const closeBtn = document.getElementById('closeAdminProfileModal');
    const cancelBtn = document.getElementById('cancelAdminProfileBtn');
    const saveBtn = document.getElementById('saveAdminProfileBtn');

    const openModal = () => modal && modal.classList.add('show');
    const closeModal = () => {
        if (modal) modal.classList.remove('show');
        ['accountCurrentPassword', 'accountCurrentPasswordRepeat', 'accountNewPassword', 'accountNewPasswordRepeat']
            .forEach((id) => {
                const el = document.getElementById(id);
                if (el) el.value = '';
            });
    };

    if (profileBtn) {
        profileBtn.style.cursor = 'pointer';
        profileBtn.title = 'Admin hesabını düzenle';
        profileBtn.addEventListener('click', openModal);
    }
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
    }

    fetch(`${ADMIN_API_BASE}/settings`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
        .then((res) => res.ok ? res.json() : [])
        .then((settings) => {
            const brandSetting = Array.isArray(settings)
                ? settings.find((s) => s.key === 'admin_brand_text')
                : null;
            const brandText = (brandSetting && brandSetting.value) ? brandSetting.value : 'ZİFT STUDİO';
            document.querySelectorAll('.logo-text').forEach((el) => {
                el.textContent = brandText;
            });
        })
        .catch(() => {});

    fetch(`${ADMIN_API_BASE}/profile`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
        .then((res) => res.ok ? res.json() : null)
        .then((profile) => {
            if (!profile) return;
            const username = profile.username || '';
            const letter = username ? username.charAt(0).toUpperCase() : 'Y';
            document.querySelectorAll('.profile-letter').forEach((el) => {
                el.textContent = letter;
            });
            const usernameInput = document.getElementById('accountNewUsername');
            if (usernameInput) usernameInput.value = username;
        })
        .catch(() => {});

    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            const currentPassword = document.getElementById('accountCurrentPassword')?.value || '';
            const currentPasswordRepeat = document.getElementById('accountCurrentPasswordRepeat')?.value || '';
            const newUsername = document.getElementById('accountNewUsername')?.value || '';
            const newPassword = document.getElementById('accountNewPassword')?.value || '';
            const newPasswordRepeat = document.getElementById('accountNewPasswordRepeat')?.value || '';

            if (!currentPassword || !currentPasswordRepeat) {
                showSidebarNotification('Mevcut şifre ve tekrarı zorunludur', 'error');
                return;
            }
            if (currentPassword !== currentPasswordRepeat) {
                showSidebarNotification('Mevcut şifre tekrarı eşleşmiyor', 'error');
                return;
            }
            if (!newUsername.trim() && !newPassword) {
                showSidebarNotification('Yeni kullanıcı adı veya yeni şifre girin', 'error');
                return;
            }
            if (newPassword && newPassword !== newPasswordRepeat) {
                showSidebarNotification('Yeni şifre tekrarı eşleşmiyor', 'error');
                return;
            }

            try {
                const response = await fetch(`${ADMIN_API_BASE}/account/change-credentials`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        current_password: currentPassword,
                        current_password_confirm: currentPasswordRepeat,
                        new_username: newUsername.trim(),
                        new_password: newPassword,
                        new_password_confirm: newPasswordRepeat
                    })
                });
                const result = await response.json();
                if (!response.ok) {
                    throw new Error(result.error || 'Hesap güncellenemedi');
                }

                if (result.token) {
                    sessionStorage.setItem('adminToken', result.token);
                }
                if (result.username) {
                    const letter = result.username.charAt(0).toUpperCase();
                    document.querySelectorAll('.profile-letter').forEach((el) => {
                        el.textContent = letter || 'Y';
                    });
                }

                showSidebarNotification(result.message || 'Hesap güncellendi', 'success');
                closeModal();
            } catch (error) {
                showSidebarNotification('Hata: ' + error.message, 'error');
            }
        });
    }
};

const wireAdminSearch = () => {
    const searchButton = document.querySelector('.header-icon-btn[title="Ara"]');
    if (!searchButton) return;

    if (!document.getElementById('adminSearchModal')) {
        const wrap = document.createElement('div');
        wrap.innerHTML = `
            <div class="modal" id="adminSearchModal">
                <div class="modal-content" style="max-width:640px;">
                    <div class="modal-header">
                        <h2>Yönetim İçi Arama</h2>
                        <button class="modal-close" id="closeAdminSearchModal">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <input type="text" id="adminSearchInput" placeholder="Özellik, sayfa veya menü ara...">
                        </div>
                        <div id="adminSearchResults" style="display:flex;flex-direction:column;gap:8px;max-height:360px;overflow:auto;"></div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(wrap.firstElementChild);
    }

    const modal = document.getElementById('adminSearchModal');
    const input = document.getElementById('adminSearchInput');
    const results = document.getElementById('adminSearchResults');
    const closeBtn = document.getElementById('closeAdminSearchModal');
    let activeIndex = -1;

    const getSearchEntries = () => {
        const seen = new Set();
        const entries = [];
        document.querySelectorAll('.sidebar .nav-item').forEach((item) => {
            const href = item.getAttribute('href');
            const label = (item.textContent || '').replace(/\s+/g, ' ').trim();
            if (!href || href === '#' || !label) return;
            const key = `${label}__${href}`;
            if (seen.has(key)) return;
            seen.add(key);
            entries.push({ label, href });
        });
        return entries;
    };

    const updateActiveResult = () => {
        const buttons = Array.from(results.querySelectorAll('button[data-href]'));
        buttons.forEach((btn, i) => {
            if (i === activeIndex) {
                btn.style.borderColor = 'var(--primary-color)';
                btn.style.boxShadow = '0 0 0 3px rgba(195,66,78,0.12)';
                btn.scrollIntoView({ block: 'nearest' });
            } else {
                btn.style.borderColor = 'var(--border-color)';
                btn.style.boxShadow = 'none';
            }
        });
    };

    const renderResults = (query = '') => {
        const q = query.toLowerCase().trim();
        const entries = getSearchEntries().filter((e) => {
            if (!q) return true;
            return e.label.toLowerCase().includes(q) || e.href.toLowerCase().includes(q);
        });

        if (!entries.length) {
            results.innerHTML = `<div style="padding:10px;color:var(--text-light);font-size:13px;">Sonuç bulunamadı.</div>`;
            activeIndex = -1;
            return;
        }

        results.innerHTML = entries.map((e) => `
            <button type="button" data-href="${e.href}" style="text-align:left;padding:10px 12px;border:1px solid var(--border-color);border-radius:8px;background:#fff;cursor:pointer;">
                <div style="font-weight:600;color:var(--text-color);">${e.label}</div>
                <div style="font-size:12px;color:var(--text-light);">${e.href}</div>
            </button>
        `).join('');

        results.querySelectorAll('button[data-href]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const href = btn.getAttribute('data-href');
                if (href) window.location.href = href;
            });
        });
        activeIndex = 0;
        updateActiveResult();
    };

    const openModal = () => {
        modal.classList.add('show');
        renderResults('');
        setTimeout(() => input.focus(), 50);
    };
    const closeModal = () => {
        modal.classList.remove('show');
        activeIndex = -1;
    };

    searchButton.addEventListener('click', (e) => {
        e.preventDefault();
        openModal();
    });
    closeBtn?.addEventListener('click', closeModal);
    modal?.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
    input?.addEventListener('input', (e) => renderResults(e.target.value));
    input?.addEventListener('keydown', (e) => {
        const buttons = Array.from(results.querySelectorAll('button[data-href]'));
        if (!buttons.length) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            activeIndex = (activeIndex + 1) % buttons.length;
            updateActiveResult();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            activeIndex = (activeIndex - 1 + buttons.length) % buttons.length;
            updateActiveResult();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const target = buttons[Math.max(0, activeIndex)];
            target?.click();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            closeModal();
        }
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal?.classList.contains('show')) {
            closeModal();
        }
    });
};

const wireQrAutoFromMenuUrl = () => {
    const menuUrlInput = document.getElementById('menuUrl');
    const canvas = document.getElementById('qrCodeCanvas');
    if (!menuUrlInput || !canvas || typeof QRCode === 'undefined') return;

    let timer = null;
    const drawQr = () => {
        const url = (menuUrlInput.value || '').trim();
        if (!url) return;
        QRCode.toCanvas(canvas, url, { width: 250, margin: 2 }, () => {});
        const imagePreview = document.getElementById('qrCodeImagePreview');
        if (imagePreview) imagePreview.style.display = 'none';
        canvas.style.display = 'block';
    };

    menuUrlInput.addEventListener('input', () => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(drawQr, 350);
    });
    menuUrlInput.addEventListener('blur', drawQr);
};

const wireGlobalUpdateButton = () => {
    const headerRight = document.querySelector('.top-header-right');
    const searchButton = document.querySelector('.header-icon-btn[title="Ara"]');
    if (!headerRight || !searchButton) return;

    if (document.getElementById('globalUpdateBtn')) return;

    const updateBtn = document.createElement('button');
    updateBtn.type = 'button';
    updateBtn.id = 'globalUpdateBtn';
    updateBtn.className = 'global-update-btn';
    updateBtn.title = 'Değişiklikleri Kaydet';
    updateBtn.innerHTML = `
        <i class="fas fa-save" style="margin-right: 6px;"></i>
        <span>GÜNCELLE</span>
    `;
    
    if (!document.getElementById('globalUpdateStyle')) {
        const style = document.createElement('style');
        style.id = 'globalUpdateStyle';
        style.innerHTML = `
            .global-update-btn {
                background: #dc2626;
                color: white;
                border: none;
                border-radius: 8px;
                padding: 8px 16px;
                font-family: var(--font, 'Outfit', sans-serif);
                font-size: 13px;
                font-weight: 700;
                cursor: pointer;
                display: inline-flex;
                align-items: center;
                margin-right: 12px;
                transition: background 0.2s, transform 0.1s, box-shadow 0.2s;
                letter-spacing: 0.5px;
                box-shadow: 0 4px 12px rgba(220, 38, 38, 0.25);
            }
            .global-update-btn:hover {
                background: #b91c1c;
                box-shadow: 0 6px 16px rgba(220, 38, 38, 0.35);
            }
            .global-update-btn:active {
                transform: scale(0.96);
            }
            @media (max-width: 576px) {
                .global-update-btn span {
                    display: none;
                }
                .global-update-btn {
                    padding: 8px 10px;
                    margin-right: 6px;
                }
                .global-update-btn i {
                    margin-right: 0 !important;
                }
            }
        `;
        document.head.appendChild(style);
    }

    headerRight.insertBefore(updateBtn, searchButton);

    updateBtn.addEventListener('click', () => {
        const openModal = document.querySelector('.modal.show, .modal.active') || document.getElementById('categoryModal') && document.getElementById('categoryModal').classList.contains('show') ? document.getElementById('categoryModal') : null || document.getElementById('productModal') && document.getElementById('productModal').classList.contains('show') ? document.getElementById('productModal') : null;
        const activeModal = openModal || document.querySelector('.modal.show') || document.querySelector('.modal.active') || document.querySelector('.modal[style*="display: block"]');
        
        if (activeModal) {
            const submitBtn = activeModal.querySelector('button[type="submit"], .btn-primary, #saveAdminProfileBtn');
            const form = activeModal.querySelector('form');
            if (submitBtn) {
                submitBtn.click();
                showSidebarNotification('Form gönderildi/kaydediliyor...', 'success');
                return;
            } else if (form) {
                form.requestSubmit ? form.requestSubmit() : form.submit();
                showSidebarNotification('Form gönderildi/kaydediliyor...', 'success');
                return;
            }
        }

        const currentPath = window.location.pathname;
        
        if (currentPath.includes('/tasarim-secenekleri')) {
            const saveBtn = document.getElementById('saveDesignBtn') || document.querySelector('button[type="submit"]') || document.querySelector('.btn-primary');
            if (saveBtn) {
                saveBtn.click();
                return;
            }
        }
        
        if (currentPath.includes('/firma-bilgileri')) {
            const saveBtn = document.getElementById('saveCompanyBtn') || document.querySelector('button[type="submit"]') || document.querySelector('.btn-primary');
            if (saveBtn) {
                saveBtn.click();
                return;
            }
        }

        if (currentPath.includes('/sosyal-medya')) {
            const saveBtn = document.getElementById('saveSocialBtn') || document.querySelector('button[type="submit"]') || document.querySelector('.btn-primary');
            if (saveBtn) {
                saveBtn.click();
                return;
            }
        }

        if (currentPath.includes('/tanitim-alanlari')) {
            const saveBtn = document.getElementById('savePromoBtn') || document.querySelector('button[type="submit"]') || document.querySelector('.btn-primary');
            if (saveBtn) {
                saveBtn.click();
                return;
            }
        }

        if (currentPath.includes('/kategori-siralama')) {
            const saveBtn = document.getElementById('updateCategoriesBtn') || document.getElementById('updateCategoriesBtnBottom');
            if (saveBtn) {
                saveBtn.click();
                return;
            }
        }

        if (currentPath.includes('/bannerlar')) {
            const saveBtn = document.querySelector('form button[type="submit"]') || document.querySelector('.btn-primary');
            if (saveBtn) {
                saveBtn.click();
                return;
            }
        }

        // Default fallback if no specific page matched but a form exists on the page
        const pageForm = document.querySelector('main form');
        if (pageForm) {
            const submitBtn = pageForm.querySelector('button[type="submit"]') || pageForm.querySelector('.btn-primary');
            if (submitBtn) {
                submitBtn.click();
                return;
            }
        }

        showSidebarNotification('Tüm veriler güncel ve senkronize durumda!', 'success');
    });
};


const MOBILE_SIDEBAR_BREAKPOINT = 768;

const isMobileSidebar = () => window.innerWidth <= MOBILE_SIDEBAR_BREAKPOINT;

const syncAdminHeaderHeight = () => {
    const header = document.querySelector('.admin-top-header');
    if (!header) return;
    const height = Math.ceil(header.getBoundingClientRect().height);
    document.documentElement.style.setProperty('--admin-header-height', `${height}px`);
};

const wireMobileSidebar = () => {
    const sidebar = document.querySelector('.sidebar');
    const headerLeft = document.querySelector('.top-header-left');
    if (!sidebar || !headerLeft) return;

    syncAdminHeaderHeight();
    window.addEventListener('resize', syncAdminHeaderHeight);
    if (typeof ResizeObserver !== 'undefined') {
        const header = document.querySelector('.admin-top-header');
        if (header) {
            const observer = new ResizeObserver(syncAdminHeaderHeight);
            observer.observe(header);
        }
    }

    let toggleBtn = document.getElementById('sidebarToggleBtn');
    if (!toggleBtn) {
        toggleBtn = document.createElement('button');
        toggleBtn.type = 'button';
        toggleBtn.id = 'sidebarToggleBtn';
        toggleBtn.className = 'sidebar-toggle-btn';
        toggleBtn.setAttribute('aria-label', 'Menüyü aç');
        toggleBtn.setAttribute('aria-expanded', 'false');
        toggleBtn.innerHTML = '<i class="fas fa-bars" aria-hidden="true"></i>';
        headerLeft.insertBefore(toggleBtn, headerLeft.firstChild);
    }

    let overlay = document.getElementById('sidebarOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'sidebarOverlay';
        overlay.className = 'sidebar-overlay';
        overlay.setAttribute('aria-hidden', 'true');
        document.body.appendChild(overlay);
    }

    const setSidebarOpen = (open) => {
        sidebar.classList.toggle('open', open);
        overlay.classList.toggle('show', open);
        document.body.classList.toggle('admin-sidebar-open', open);
        toggleBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
        toggleBtn.setAttribute('aria-label', open ? 'Menüyü kapat' : 'Menüyü aç');
        const icon = toggleBtn.querySelector('i');
        if (icon) {
            icon.className = open ? 'fas fa-times' : 'fas fa-bars';
        }
    };

    const closeSidebar = () => {
        if (sidebar.classList.contains('open')) setSidebarOpen(false);
    };

    const openSidebar = () => setSidebarOpen(true);

    toggleBtn.addEventListener('click', () => {
        setSidebarOpen(!sidebar.classList.contains('open'));
    });

    overlay.addEventListener('click', closeSidebar);

    sidebar.querySelectorAll('.nav-item[href]').forEach((link) => {
        const href = link.getAttribute('href');
        if (href && href !== '#') {
            link.addEventListener('click', () => {
                if (isMobileSidebar()) closeSidebar();
            });
        }
    });

    window.addEventListener('resize', () => {
        if (!isMobileSidebar()) closeSidebar();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && sidebar.classList.contains('open')) {
            closeSidebar();
        }
    });

    return { openSidebar, closeSidebar };
};

// Sidebar navigation toggle functionality
document.addEventListener('DOMContentLoaded', () => {
    wireProfileSettings();
    wireAdminSearch();
    wireQrAutoFromMenuUrl();
    wireMobileSidebar();
    wireGlobalUpdateButton();

    // Get current page path
    const currentPath = window.location.pathname;

    // Map paths to section text (Turkish)
    const pathToSectionMap = {
        '/yonetim/bannerlar': 'Bannerlar',
        '/yonetim/media': 'İçerikler',
        '/yonetim/kategori-siralama': 'Ürünler',
        '/yonetim/mesajlar': 'Mesajlar',
        '/yonetim/firma-bilgileri': 'Menü Ayarları',
        '/yonetim/tasarim-secenekleri': 'Menü Ayarları',
        '/yonetim/tanitim-alanlari': 'Menü Ayarları',
        '/yonetim/sosyal-medya': 'Menü Ayarları',
        '/yonetim/araci-firmalar': 'Menü Ayarları'
    };

    // Determine which section should be open based on current path
    let sectionToOpen = null;
    for (const [path, sectionName] of Object.entries(pathToSectionMap)) {
        if (currentPath.startsWith(path)) {
            sectionToOpen = sectionName;
            break;
        }
    }

    // Find and open the relevant section
    document.querySelectorAll('.nav-section').forEach(section => {
        const title = section.querySelector('.nav-section-title span');
        if (title) {
            const sectionText = title.textContent.trim();

            // Open the section if it matches the current page
            if (sectionToOpen && sectionText === sectionToOpen) {
                section.classList.remove('collapsed');
                // Also ensure the section items are visible
                const items = section.querySelector('.nav-section-items');
                if (items) {
                    items.style.maxHeight = items.scrollHeight + 'px';
                    items.style.opacity = '1';
                }
            } else {
                // Close other sections by default (except if they have active items)
                const hasActiveItem = section.querySelector('.nav-item.active');
                if (!hasActiveItem && !sectionToOpen) {
                    section.classList.add('collapsed');
                }
            }
        }
    });

    // Toggle nav sections on click
    document.querySelectorAll('.nav-section-title').forEach(title => {
        title.addEventListener('click', (e) => {
            // Don't toggle if clicking on a link inside
            if (e.target.closest('a')) return;

            const section = title.closest('.nav-section');
            section.classList.toggle('collapsed');
        });
    });
});

