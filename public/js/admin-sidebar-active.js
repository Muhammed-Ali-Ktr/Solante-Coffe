// Auto-detect and set active nav item based on current URL
document.addEventListener('DOMContentLoaded', () => {
    const currentPath = window.location.pathname;

    // Normalize legacy placeholder links ("#") to real admin routes.
    // This fixes navigation blocks across all admin pages consistently.
    const textToHref = [
        { match: 'tüm ürünler', href: '/yonetim/urunler' },
        { match: 'yeni ürün ekle', href: '/yonetim/urunler' },
        { match: 'ürün kategorileri', href: '/yonetim/kategoriler' },
        { match: 'kategori sıralama', href: '/yonetim/kategori-siralama' },
        { match: 'tüm bannerlar', href: '/yonetim/bannerlar' },
        { match: 'yeni banner ekle', href: '/yonetim/bannerlar/ekle' },
        { match: 'medya kütüphanesi', href: '/yonetim/media' },
        { match: 'firma bilgileri', href: '/yonetim/firma-bilgileri' },
        { match: 'tasarım seçenekleri', href: '/yonetim/tasarim-secenekleri' },
        { match: 'tanıtım alanları', href: '/yonetim/tanitim-alanlari' },
        { match: 'sosyal medya', href: '/yonetim/sosyal-medya' },
        { match: 'mesajlar', href: '/yonetim/mesajlar' }
    ];

    document.querySelectorAll('.nav-item[href="#"], .nav-item:not([href])').forEach(item => {
        const txt = (item.textContent || '').toLowerCase().replace(/\s+/g, ' ').trim();
        const mapped = textToHref.find(entry => txt.includes(entry.match));
        if (mapped) {
            item.setAttribute('href', mapped.href);
        }
    });
    
    // Remove all active classes first
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Find and activate the matching nav item
    document.querySelectorAll('.nav-item').forEach(item => {
        const href = item.getAttribute('href');
        
        if (href && href !== '#') {
            // Exact match
            if (currentPath === href) {
                item.classList.add('active');
                return;
            }
            
            // Path starts with (for nested routes like /yonetim/bannerlar/ekle)
            if (currentPath.startsWith(href) && href !== '/yonetim') {
                item.classList.add('active');
                return;
            }
        }
    });
    
    // Special handling for modal triggers
    // "Yeni Ürün ekle" button in sidebar
    const sidebarAddProductBtn = document.getElementById('sidebarAddProductBtn');
    if (sidebarAddProductBtn) {
        sidebarAddProductBtn.addEventListener('click', (e) => {
            e.preventDefault();
            // If we're on products page, open modal
            if (currentPath === '/yonetim/urunler') {
                if (typeof openModal === 'function') {
                    openModal();
                } else {
                    // Try to find and click the add button in the page
                    const addBtn = document.querySelector('#addProductBtnTop');
                    if (addBtn) {
                        addBtn.click();
                    } else {
                        // Try to trigger the modal directly
                        const productModal = document.getElementById('productModal');
                        if (productModal) {
                            productModal.classList.add('show');
                        }
                    }
                }
            } else {
                // Navigate to products page first
                window.location.href = '/yonetim/urunler';
            }
        });
    }
    
    // "Yeni Banner ekle" button in sidebar (if not already handled)
    const sidebarAddBannerBtn = document.querySelector('a.nav-item[href="/yonetim/bannerlar/ekle"]');
    if (sidebarAddBannerBtn && !sidebarAddBannerBtn.id) {
        sidebarAddBannerBtn.addEventListener('click', (e) => {
            // If we're on banners page, prevent navigation and open modal
            if (currentPath.startsWith('/yonetim/bannerlar')) {
                e.preventDefault();
                if (typeof openModal === 'function') {
                    openModal();
                } else {
                    const addBtn = document.querySelector('#addBannerBtnTop');
                    if (addBtn) addBtn.click();
                }
            }
        });
    }
    
    const addBannerBtn = document.getElementById('addBannerBtn');
    if (addBannerBtn) {
        addBannerBtn.addEventListener('click', (e) => {
            e.preventDefault();
            // If we're on banners page, open modal
            if (currentPath.startsWith('/yonetim/bannerlar')) {
                if (typeof openModal === 'function') {
                    openModal();
                } else {
                    const addBtn = document.querySelector('#addBannerBtnTop, .btn-primary');
                    if (addBtn) addBtn.click();
                }
            } else {
                // Navigate to add banner page
                window.location.href = '/yonetim/bannerlar/ekle';
            }
        });
    }
});

