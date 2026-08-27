const API_BASE = '/api/admin';
const PUBLIC_API_BASE = '/api';

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

const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}.${month}.${year}, ${hours}:${minutes}`;
};

// State Variables
let currentView = 'categories'; // 'categories', 'products', 'messages'
let selectedCategoryId = null; 
let selectedProductId = null; // 'general' or product ID
let allCategories = [];
let allProducts = [];
let allMessages = [];
let filteredMessages = [];

// Helper to switch view
const showView = (viewName) => {
    currentView = viewName;
    document.querySelectorAll('.message-view').forEach(el => el.style.display = 'none');
    
    if (viewName === 'categories') {
        document.getElementById('viewCategories').style.display = 'block';
        renderCategoriesView();
    } else if (viewName === 'products') {
        document.getElementById('viewProducts').style.display = 'block';
        renderProductsView();
    } else if (viewName === 'messages') {
        document.getElementById('viewMessagesList').style.display = 'block';
        applyFiltersAndRenderMessages();
    }
};

const loadMessages = async () => {
    try {
        const token = sessionStorage.getItem('adminToken');
        // Fetch Categories
        const catRes = await fetch(`${PUBLIC_API_BASE}/categories`);
        allCategories = await catRes.json();

        // Fetch Products
        const prodRes = await fetch(`${PUBLIC_API_BASE}/products`);
        allProducts = await prodRes.json();

        // Fetch Messages
        const msgRes = await fetch(`${API_BASE}/messages`, {
            headers: getAuthHeaders()
        });
        
        if (!msgRes.ok) {
            if (msgRes.status === 404) {
                allMessages = [];
            } else {
                throw new Error('Mesajlar yüklenemedi');
            }
        } else {
            allMessages = await msgRes.json();
        }
        
        // Render current view
        showView(currentView);
    } catch (error) {
        console.error('Load error:', error);
        showNotification('Veriler yüklenirken hata oluştu: ' + error.message, 'error');
    }
};

// View 1: Render Categories
const renderCategoriesView = () => {
    const grid = document.getElementById('adminCategoriesGrid');
    if (!grid) return;

    // 1. General Messages Card
    const generalMsgs = allMessages.filter(m => !m.product_id);
    const generalTotal = generalMsgs.length;
    const generalUnread = generalMsgs.filter(m => m.is_read === 0).length;

    let html = `
        <div class="admin-card" onclick="openGeneralMessages()">
            ${generalUnread > 0 ? `<div class="admin-card-badge">${generalUnread}</div>` : ''}
            <div class="admin-card-placeholder">
                <i class="fas fa-comments" style="color: var(--primary-color);"></i>
            </div>
            <div class="admin-card-info">
                <div class="admin-card-title">Menü Sayfası Mesajları</div>
                <div class="admin-card-count">${generalTotal} Mesaj (${generalUnread} Okunmamış)</div>
            </div>
        </div>
    `;

    // 2. Regular Categories Cards
    allCategories.forEach(cat => {
        // Find products in this category
        const catProductIds = allProducts.filter(p => p.category_id === cat.id).map(p => p.id);
        // Find messages belonging to these products
        const catMsgs = allMessages.filter(m => m.product_id && catProductIds.includes(m.product_id));
        const catTotal = catMsgs.length;
        const catUnread = catMsgs.filter(m => m.is_read === 0).length;

        const img = cat.image 
            ? `<img src="${cat.image}" alt="${cat.name}" class="admin-card-img" onerror="this.outerHTML='<div class=\\'admin-card-placeholder\\'>🗂️</div>'">`
            : `<div class="admin-card-placeholder">🗂️</div>`;

        html += `
            <div class="admin-card" onclick="selectCategory(${cat.id}, '${cat.name.replace(/'/g, "\\'")}')">
                ${catUnread > 0 ? `<div class="admin-card-badge">${catUnread}</div>` : ''}
                ${img}
                <div class="admin-card-info">
                    <div class="admin-card-title">${cat.name}</div>
                    <div class="admin-card-count">${catTotal} Mesaj (${catUnread} Okunmamış)</div>
                </div>
            </div>
        `;
    });

    grid.innerHTML = html;
};

// View 2: Render Products inside Category
const renderProductsView = () => {
    const grid = document.getElementById('adminProductsGrid');
    if (!grid) return;

    // Filter products belonging to selected category
    const catProducts = allProducts.filter(p => p.category_id === selectedCategoryId);

    if (catProducts.length === 0) {
        grid.innerHTML = `<div style="padding:40px; text-align:center; color: var(--text-light); width:100%;">Bu kategoride ürün bulunmuyor.</div>`;
        return;
    }

    let html = '';
    catProducts.forEach(prod => {
        // Find messages for this product
        const prodMsgs = allMessages.filter(m => m.product_id === prod.id);
        const prodTotal = prodMsgs.length;
        const prodUnread = prodMsgs.filter(m => m.is_read === 0).length;

        const img = prod.image
            ? `<img src="${prod.image}" alt="${prod.name}" class="admin-card-img" onerror="this.outerHTML='<div class=\\'admin-card-placeholder\\'>🍽️</div>'">`
            : `<div class="admin-card-placeholder">🍽️</div>`;

        html += `
            <div class="admin-card" onclick="selectProduct(${prod.id}, '${prod.name.replace(/'/g, "\\'")}')">
                ${prodUnread > 0 ? `<div class="admin-card-badge">${prodUnread}</div>` : ''}
                ${img}
                <div class="admin-card-info">
                    <div class="admin-card-title">${prod.name}</div>
                    <div class="admin-card-count">${prodTotal} Mesaj (${prodUnread} Okunmamış)</div>
                </div>
            </div>
        `;
    });

    grid.innerHTML = html;
};

// Navigation Handlers
window.selectCategory = (categoryId, categoryName) => {
    selectedCategoryId = categoryId;
    document.getElementById('currentCategoryTitle').textContent = `${categoryName} - Ürün Seçin`;
    showView('products');
};

window.selectProduct = (productId, productName) => {
    selectedProductId = productId;
    document.getElementById('currentProductTitle').textContent = `${productName} - Gelen Mesajlar`;
    showView('messages');
};

window.openGeneralMessages = () => {
    selectedProductId = 'general';
    document.getElementById('currentProductTitle').textContent = 'Menü Sayfası Gelen Mesajlar';
    showView('messages');
};

// View 3: Filters, Search & Render Messages Table
const applyFiltersAndRenderMessages = () => {
    let baseMessages = [];
    if (selectedProductId === 'general') {
        baseMessages = allMessages.filter(m => !m.product_id);
    } else {
        baseMessages = allMessages.filter(m => m.product_id === selectedProductId);
    }

    const searchTerm = document.getElementById('messageSearchInput')?.value.toLowerCase() || '';
    const statusFilter = document.getElementById('statusFilter')?.value || 'all';
    const dateFilter = document.getElementById('dateFilter')?.value || 'all';

    let filtered = baseMessages;

    // Search term filter
    if (searchTerm) {
        filtered = filtered.filter(m => 
            (m.name || '').toLowerCase().includes(searchTerm) ||
            (m.email || '').toLowerCase().includes(searchTerm) ||
            (m.subject || '').toLowerCase().includes(searchTerm) ||
            (m.message || '').toLowerCase().includes(searchTerm)
        );
    }

    // Status filter
    if (statusFilter !== 'all') {
        filtered = filtered.filter(m => {
            if (statusFilter === 'unread') return m.is_read === 0;
            if (statusFilter === 'read') return m.is_read === 1;
            return true;
        });
    }

    // Date filter
    if (dateFilter !== 'all') {
        const now = new Date();
        filtered = filtered.filter(m => {
            const mDate = new Date(m.created_at);
            if (dateFilter === 'today') {
                return mDate.toDateString() === now.toDateString();
            }
            if (dateFilter === 'week') {
                const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                return mDate >= weekAgo;
            }
            if (dateFilter === 'month') {
                const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                return mDate >= monthAgo;
            }
            return true;
        });
    }

    filteredMessages = filtered;
    renderMessagesTable(filteredMessages);
};

const renderMessagesTable = (messages) => {
    const tbody = document.getElementById('messagesTableBody');
    if (!tbody) return;

    if (messages.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center" style="padding:40px;">Aradığınız kriterlere uygun mesaj bulunamadı.</td></tr>';
        updateItemCount(0);
        return;
    }

    tbody.innerHTML = messages.map(message => `
        <tr data-id="${message.id}" class="message-row ${message.is_read === 0 ? 'unread' : ''}">
            <td>
                <input type="checkbox" class="message-checkbox" data-id="${message.id}">
            </td>
            <td>
                <strong>${message.name || 'İsimsiz'}</strong>
                ${message.email ? `<br><small style="color: var(--text-light);">${message.email}</small>` : ''}
            </td>
            <td>${message.subject || 'Konu yok'}</td>
            <td>
                <span class="date-status">${formatDate(message.created_at)}</span>
            </td>
            <td>
                <span class="status-badge ${message.is_read === 0 ? 'inactive' : 'active'}">
                    ${message.is_read === 0 ? 'Okunmamış' : 'Okunmuş'}
                </span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-primary btn-sm" onclick="viewMessage(${message.id})" title="Görüntüle">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="deleteMessage(${message.id})" title="Sil">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');

    updateItemCount(messages.length);

    // Row click
    document.querySelectorAll('.message-row').forEach(row => {
        row.addEventListener('click', (e) => {
            if (!e.target.closest('button') && !e.target.closest('input')) {
                const id = parseInt(row.dataset.id, 10);
                viewMessage(id);
            }
        });
        row.style.cursor = 'pointer';
    });

    handleSelectAll();
};

const updateItemCount = (count) => {
    const countElements = document.querySelectorAll('#messageItemCount, #messageItemCountFooter');
    countElements.forEach(el => {
        if (el) el.textContent = `${count} öge`;
    });
};

window.viewMessage = async (id) => {
    try {
        const message = allMessages.find(m => m.id === id);
        if (!message) {
            showNotification('Mesaj bulunamadı', 'error');
            return;
        }

        if (message.is_read === 0) {
            await markAsRead(id);
        }

        const modal = document.getElementById('messageModal');
        const modalTitle = document.getElementById('messageModalTitle');
        const modalBody = document.getElementById('messageModalBody');

        modalTitle.textContent = message.subject || 'Mesaj Detayı';
        modalBody.innerHTML = `
            <div class="message-detail">
                <div class="message-detail-row">
                    <strong>Gönderen:</strong>
                    <span>${message.name || 'İsimsiz'}</span>
                </div>
                ${message.email ? `
                <div class="message-detail-row">
                    <strong>E-posta:</strong>
                    <span><a href="mailto:${message.email}">${message.email}</a></span>
                </div>
                ` : ''}
                ${message.phone ? `
                <div class="message-detail-row">
                    <strong>Telefon:</strong>
                    <span><a href="tel:${message.phone}">${message.phone}</a></span>
                </div>
                ` : ''}
                ${message.product_name ? `
                <div class="message-detail-row">
                    <strong>İlgili Ürün:</strong>
                    <span style="font-weight:700; color:var(--primary-color);">${message.product_name}</span>
                </div>
                ` : ''}
                <div class="message-detail-row">
                    <strong>Tarih:</strong>
                    <span>${formatDate(message.created_at)}</span>
                </div>
                <div class="message-detail-content">
                    <strong>Mesaj:</strong>
                    <p>${message.message || 'Mesaj içeriği yok'}</p>
                </div>
            </div>
        `;
        modal.classList.add('show');
    } catch (err) {
        console.error(err);
        showNotification('Mesaj yüklenemedi', 'error');
    }
};

const markAsRead = async (id) => {
    try {
        const response = await fetch(`${API_BASE}/messages/${id}/read`, {
            method: 'PUT',
            headers: getAuthHeaders()
        });
        if (response.ok) {
            const msg = allMessages.find(m => m.id === id);
            if (msg) msg.is_read = 1;
            loadMessages();
        }
    } catch (err) {
        console.error(err);
    }
};

window.deleteMessage = async (id) => {
    if (!confirm('Bu mesajı silmek istediğinize emin misiniz?')) return;
    try {
        const response = await fetch(`${API_BASE}/messages/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        if (response.ok) {
            showNotification('Mesaj başarıyla silindi!', 'success');
            loadMessages();
        } else {
            throw new Error('Silinemedi');
        }
    } catch (err) {
        showNotification('Mesaj silinirken hata oluştu', 'error');
    }
};

// Select All Checkbox Handler
const handleSelectAll = () => {
    const selectAll = document.getElementById('selectAllMessages');
    const checkboxes = document.querySelectorAll('.message-checkbox');
    
    if (selectAll) {
        selectAll.addEventListener('change', (e) => {
            checkboxes.forEach(cb => {
                cb.checked = e.target.checked;
            });
        });
    }
    
    checkboxes.forEach(cb => {
        cb.addEventListener('change', () => {
            const allChecked = Array.from(checkboxes).every(c => c.checked);
            const someChecked = Array.from(checkboxes).some(c => c.checked);
            if (selectAll) {
                selectAll.checked = allChecked;
                selectAll.indeterminate = someChecked && !allChecked;
            }
        });
    });
};

document.addEventListener('DOMContentLoaded', () => {
    if (!checkAuth()) return;

    // View Navigation Buttons Listeners
    document.getElementById('backToCategoriesBtn')?.addEventListener('click', () => {
        showView('categories');
    });

    document.getElementById('backToProductsBtn')?.addEventListener('click', () => {
        if (selectedProductId === 'general') {
            showView('categories');
        } else {
            showView('products');
        }
    });

    // Search and Filter Listeners
    document.getElementById('searchMessagesBtn')?.addEventListener('click', applyFiltersAndRenderMessages);
    document.getElementById('messageSearchInput')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') applyFiltersAndRenderMessages();
    });
    document.getElementById('statusFilter')?.addEventListener('change', applyFiltersAndRenderMessages);
    document.getElementById('dateFilter')?.addEventListener('change', applyFiltersAndRenderMessages);
    document.getElementById('filterMessagesBtn')?.addEventListener('click', applyFiltersAndRenderMessages);

    // Modal Close Listeners
    document.getElementById('closeMessageModal')?.addEventListener('click', () => {
        document.getElementById('messageModal').classList.remove('show');
    });
    document.getElementById('closeMessageModalBtn')?.addEventListener('click', () => {
        document.getElementById('messageModal').classList.remove('show');
    });
    document.getElementById('messageModal')?.addEventListener('click', (e) => {
        if (e.target.id === 'messageModal') {
            document.getElementById('messageModal').classList.remove('show');
        }
    });

    // Reply Handler
    document.getElementById('replyMessageBtn')?.addEventListener('click', () => {
        const modalBody = document.getElementById('messageModalBody');
        const emailLink = modalBody.querySelector('a[href^="mailto:"]');
        if (emailLink) {
            window.location.href = emailLink.href;
        }
    });

    loadMessages();
});
