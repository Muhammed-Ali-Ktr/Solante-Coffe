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

let sortableInstance = null;
let categories = [];

const loadCategories = async () => {
    try {
        const response = await fetch(`${API_BASE}/categories`, {
            headers: getAuthHeaders()
        });
        
        if (!response.ok) throw new Error('Kategoriler yüklenemedi');
        
        categories = await response.json();
        // Sort by order_index
        categories.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
        renderCategories();
        initSortable();
    } catch (error) {
        console.error('Load error:', error);
        showNotification('Kategoriler yüklenemedi', 'error');
    }
};

const renderCategories = () => {
    const list = document.getElementById('categorySortList');
    
    if (categories.length === 0) {
        list.innerHTML = '<div class="empty-state">Henüz kategori eklenmemiş.</div>';
        return;
    }
    
    list.innerHTML = categories.map((category, index) => `
        <div class="category-sort-item" data-id="${category.id}" data-order="${category.order_index || index}">
            <div class="category-sort-handle">
                <i class="fas fa-grip-vertical"></i>
            </div>
            <div class="category-sort-name">
                ${category.name || 'İsimsiz Kategori'}
            </div>
            <div class="category-sort-actions">
                <button class="btn-icon" onclick="editCategory(${category.id})" title="Düzenle">
                    <i class="fas fa-pencil-alt"></i>
                </button>
            </div>
        </div>
    `).join('');
};

const initSortable = () => {
    const list = document.getElementById('categorySortList');
    if (!list || categories.length === 0) return;
    
    if (sortableInstance) {
        sortableInstance.destroy();
    }
    
    sortableInstance = Sortable.create(list, {
        animation: 150,
        handle: '.category-sort-handle',
        ghostClass: 'category-sort-ghost',
        chosenClass: 'category-sort-chosen',
        dragClass: 'category-sort-drag',
        onEnd: (evt) => {
            // Update order_index based on new position
            const items = Array.from(list.children);
            items.forEach((item, index) => {
                const categoryId = parseInt(item.dataset.id);
                const category = categories.find(c => c.id === categoryId);
                if (category) {
                    category.order_index = index;
                }
            });
        }
    });
};

const updateCategoryOrder = async () => {
    try {
        const list = document.getElementById('categorySortList');
        const items = Array.from(list.children);
        const updates = [];
        
        items.forEach((item, index) => {
            const categoryId = parseInt(item.dataset.id);
            updates.push({
                id: categoryId,
                order_index: index
            });
        });
        
        const response = await fetch(`${API_BASE}/categories/order`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ categories: updates })
        });
        
        if (!response.ok) throw new Error('Sıralama güncellenemedi');
        
        showNotification('Kategori sıralaması başarıyla güncellendi!', 'success');
        loadCategories();
    } catch (error) {
        console.error('Update error:', error);
        showNotification('Hata: ' + error.message, 'error');
    }
};

const editCategory = (id) => {
    // Navigate to categories page with edit mode
    window.location.href = `/yonetim/kategoriler?edit=${id}`;
};

document.addEventListener('DOMContentLoaded', () => {
    if (!checkAuth()) return;
    
    // Update buttons
    document.getElementById('updateCategoriesBtn')?.addEventListener('click', updateCategoryOrder);
    document.getElementById('updateCategoriesBtnBottom')?.addEventListener('click', updateCategoryOrder);
    
    // Load categories
    loadCategories();
});

