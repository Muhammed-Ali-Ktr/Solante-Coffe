// API Base URL
const API_BASE = '/api/admin';

// Token kontrolü
const checkAuth = () => {
    const token = sessionStorage.getItem('adminToken');
    if (!token) {
        window.location.href = '/yonetim';
        return false;
    }
    return true;
};

// API isteği için header
const getAuthHeaders = () => {
    const token = sessionStorage.getItem('adminToken');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
};

// İstatistikleri yükle
const loadStats = async () => {
    try {
        // Kategoriler
        const categoriesRes = await fetch(`${API_BASE}/categories`, {
            headers: getAuthHeaders()
        });
        const categories = await categoriesRes.json();
        
        // Ürünler
        const productsRes = await fetch(`${API_BASE}/products`, {
            headers: getAuthHeaders()
        });
        const products = await productsRes.json();
        
        // İstatistikleri hesapla
        const totalCategories = categories.length;
        const totalProducts = products.length;
        const activeProducts = products.filter(p => p.is_active === 1).length;
        const activeCategories = categories.filter(c => c.is_active === 1).length;
        
        // DOM'a yaz
        document.getElementById('totalCategories').textContent = totalCategories;
        document.getElementById('totalProducts').textContent = totalProducts;
        document.getElementById('activeProducts').textContent = activeProducts;
        document.getElementById('activeCategories').textContent = activeCategories;
    } catch (error) {
        console.error('İstatistikler yüklenemedi:', error);
    }
};

// Kullanıcı adını göster
const loadUserInfo = () => {
    const username = sessionStorage.getItem('adminUsername');
    const usernameEl = document.getElementById('adminUsername');
    if (usernameEl && username) {
        usernameEl.textContent = username;
    }
};

// Çıkış yap
const handleLogout = () => {
    sessionStorage.removeItem('adminToken');
    sessionStorage.removeItem('adminUsername');
    window.location.href = '/yonetim';
};

// Sayfa yüklendiğinde
document.addEventListener('DOMContentLoaded', () => {
    if (!checkAuth()) return;
    
    loadUserInfo();
    loadStats();
    
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            handleLogout();
        });
    }
});

