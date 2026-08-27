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
        'Authorization': `Bearer ${token}`
    };
};

// Kategorileri yükle
const loadCategories = async () => {
    try {
        const response = await fetch(`${API_BASE}/categories`, {
            headers: getAuthHeaders()
        });
        
        if (!response.ok) {
            throw new Error('Kategoriler yüklenemedi');
        }
        
        const categories = await response.json();
        renderCategories(categories);
    } catch (error) {
        console.error('Kategoriler yüklenemedi:', error);
        document.getElementById('categoriesTableBody').innerHTML = 
            '<tr><td colspan="6" class="text-center">Kategoriler yüklenirken bir hata oluştu.</td></tr>';
    }
};

// Kategorileri render et
const renderCategories = (categories) => {
    const tbody = document.getElementById('categoriesTableBody');
    
    if (categories.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">Henüz kategori eklenmemiş.</td></tr>';
        return;
    }
    
    tbody.innerHTML = categories.map(category => `
        <tr>
            <td>
                <input type="checkbox" class="category-checkbox" data-id="${category.id}">
            </td>
            <td>
                <strong>${category.name}</strong>
            </td>
            <td>${category.description || '-'}</td>
            <td>
                <span class="status-badge ${category.is_active === 1 ? 'active' : 'inactive'}">
                    ${category.is_active === 1 ? 'Aktif' : 'Pasif'}
                </span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-primary btn-sm" onclick="editCategory(${category.id})">
                        <i class="fas fa-edit"></i> Düzenle
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="deleteCategory(${category.id})">
                        <i class="fas fa-trash"></i> Sil
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
    
    // Select all checkbox
    const selectAll = document.getElementById('selectAllCategories');
    if (selectAll) {
        selectAll.addEventListener('change', (e) => {
            document.querySelectorAll('.category-checkbox').forEach(cb => {
                cb.checked = e.target.checked;
                const row = cb.closest('tr');
                if (e.target.checked) {
                    row.classList.add('selected');
                } else {
                    row.classList.remove('selected');
                }
            });
        });
    }
    
    // Checkbox change handlers
    document.querySelectorAll('.category-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const row = e.target.closest('tr');
            if (e.target.checked) {
                row.classList.add('selected');
            } else {
                row.classList.remove('selected');
            }
        });
    });
};

// Modal aç/kapat
const openModal = (category = null) => {
    const modal = document.getElementById('categoryModal');
    const form = document.getElementById('categoryForm');
    const title = document.getElementById('modalTitle');
    const imagePreview = document.getElementById('imagePreview');
    
    if (category) {
        title.textContent = 'Kategori Düzenle';
        form.dataset.categoryId = category.id;
        document.getElementById('categoryName').value = category.name;
        document.getElementById('categoryDescription').value = category.description || '';
        document.getElementById('categoryOrder').value = category.order_index;
        document.getElementById('categoryActive').value = category.is_active;
        
        if (category.image) {
            imagePreview.innerHTML = `<img src="${category.image}" alt="Preview">`;
        } else {
            imagePreview.innerHTML = '';
        }
    } else {
        title.textContent = 'Yeni Kategori';
        form.reset();
        form.removeAttribute('data-category-id');
        imagePreview.innerHTML = '';
    }
    
    modal.classList.add('show');
};

const closeModal = () => {
    const modal = document.getElementById('categoryModal');
    modal.classList.remove('show');
};

// Kategori ekle/düzenle
const saveCategory = async (e) => {
    e.preventDefault();
    
    const form = e.target;
    const formData = new FormData(form);
    const categoryId = form.dataset.categoryId;
    
    const url = categoryId 
        ? `${API_BASE}/categories/${categoryId}`
        : `${API_BASE}/categories`;
    
    const method = categoryId ? 'PUT' : 'POST';
    
    try {
        const headers = getAuthHeaders();
        delete headers['Content-Type']; // FormData için Content-Type'ı sil
        
        const response = await fetch(url, {
            method,
            headers,
            body: formData
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'İşlem başarısız');
        }
        
        closeModal();
        loadCategories();
        showNotification('Kategori başarıyla kaydedildi', 'success');
    } catch (error) {
        showNotification(error.message, 'error');
    }
};

// Kategori düzenle
const editCategory = async (id) => {
    try {
        const response = await fetch(`${API_BASE}/categories`, {
            headers: getAuthHeaders()
        });
        
        const categories = await response.json();
        const category = categories.find(c => c.id === id);
        
        if (category) {
            openModal(category);
        }
    } catch (error) {
        showNotification('Kategori yüklenemedi', 'error');
    }
};

// Kategori sil
const deleteCategory = async (id) => {
    if (!confirm('Bu kategoriyi silmek istediğinizden emin misiniz?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/categories/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Silme işlemi başarısız');
        }
        
        loadCategories();
        showNotification('Kategori başarıyla silindi', 'success');
    } catch (error) {
        showNotification(error.message, 'error');
    }
};

// Bildirim göster
const showNotification = (message, type = 'success') => {
    // Basit bir bildirim sistemi
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${type === 'success' ? '#10b981' : '#ef4444'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
};

// Görsel önizleme
const handleImagePreview = (e) => {
    const file = e.target.files[0];
    const preview = document.getElementById('imagePreview');
    
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            preview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
        };
        reader.readAsDataURL(file);
    } else {
        preview.innerHTML = '';
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
    
    loadCategories();
    
    // Event listeners
    const addCategoryBtn = document.getElementById('addCategoryBtn');
    if (addCategoryBtn) {
        addCategoryBtn.addEventListener('click', () => openModal());
    }
    
    const closeModalBtn = document.getElementById('closeModal');
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeModal);
    }
    
    const cancelBtn = document.getElementById('cancelBtn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeModal);
    }
    
    const categoryForm = document.getElementById('categoryForm');
    if (categoryForm) {
        categoryForm.addEventListener('submit', saveCategory);
    }
    
    const categoryImage = document.getElementById('categoryImage');
    if (categoryImage) {
        categoryImage.addEventListener('change', handleImagePreview);
    }
    
    // Modal dışına tıklanınca kapat
    document.getElementById('categoryModal').addEventListener('click', (e) => {
        if (e.target.id === 'categoryModal') {
            closeModal();
        }
    });
    
    // Tablo satırlarına tıklanınca düzenle
    document.addEventListener('click', (e) => {
        const row = e.target.closest('#categoriesTableBody tr');
        if (row && !e.target.closest('input[type="checkbox"]') && !e.target.closest('.btn')) {
            const checkbox = row.querySelector('.category-checkbox');
            if (checkbox) {
                const categoryId = checkbox.dataset.id;
                editCategory(parseInt(categoryId));
            }
        }
    });
});

