const API_BASE = '/api/admin';

const getAuthHeaders = () => {
    const token = sessionStorage.getItem('adminToken');
    return {
        'Authorization': `Bearer ${sessionStorage.getItem('adminToken')}`
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

let editingBannerId = null;

const loadBanners = async () => {
    try {
        const response = await fetch(`${API_BASE}/banners`, {
            headers: getAuthHeaders()
        });
        
        if (!response.ok) throw new Error('Bannerlar yüklenemedi');
        
        const banners = await response.json();
        renderBanners(banners);
    } catch (error) {
        console.error('Load error:', error);
        showNotification('Bannerlar yüklenemedi', 'error');
    }
};

const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `Yayınlanmış ${day}.${month}.${year}, ${hours}:${minutes}`;
};

let allBanners = [];
let filteredBanners = [];

const renderBanners = (banners) => {
    allBanners = banners;
    filteredBanners = banners;
    const tbody = document.getElementById('bannersTableBody');
    
    if (banners.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center">Henüz banner eklenmemiş.</td></tr>';
        updateItemCount(0);
        return;
    }
    
    tbody.innerHTML = banners.map(banner => `
        <tr data-id="${banner.id}" class="banner-row">
            <td>
                <input type="checkbox" class="banner-checkbox" data-id="${banner.id}">
            </td>
            <td>
                <strong>${banner.title || 'Başlıksız Banner'}</strong>
            </td>
            <td>
                <span class="date-status published">${formatDate(banner.created_at || banner.updated_at)}</span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-primary btn-sm" onclick="editBanner(${banner.id})">
                        <i class="fas fa-edit"></i> Düzenle
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="deleteBanner(${banner.id})">
                        <i class="fas fa-trash"></i> Sil
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
    
    updateItemCount(banners.length);
    
    // Add click handler to rows for editing
    document.querySelectorAll('.banner-row').forEach(row => {
        row.addEventListener('dblclick', () => {
            const id = parseInt(row.dataset.id);
            editBanner(id);
        });
        row.style.cursor = 'pointer';
    });
};

const updateItemCount = (count) => {
    const countElements = document.querySelectorAll('#bannerItemCount, #bannerItemCountFooter');
    countElements.forEach(el => {
        if (el) el.textContent = `${count} öge`;
    });
};

const openModal = (banner = null) => {
    editingBannerId = banner ? banner.id : null;
    const modal = document.getElementById('bannerModal');
    const form = document.getElementById('bannerForm');
    const title = document.getElementById('bannerModalTitle');
    
    title.textContent = banner ? 'Banner Düzenle' : 'Yeni Banner';
    form.reset();
    document.getElementById('bannerImagePreview').innerHTML = '';
    
    if (banner) {
        document.getElementById('bannerTitle').value = banner.title || '';
        document.getElementById('bannerLink').value = banner.link || '';
        document.getElementById('bannerOrder').value = banner.order_index || 0;
        document.getElementById('bannerActive').value = banner.is_active;
        if (banner.image) {
            document.getElementById('bannerImagePreview').innerHTML = `<img src="${banner.image}" alt="Preview" style="max-width: 200px; border-radius: 8px;">`;
        }
    }
    
    modal.classList.add('show');
};

const closeModal = () => {
    document.getElementById('bannerModal').classList.remove('show');
    editingBannerId = null;
};

const editBanner = async (id) => {
    try {
        const response = await fetch(`${API_BASE}/banners`, {
            headers: getAuthHeaders()
        });
        
        const banners = await response.json();
        const banner = banners.find(b => b.id === id);
        
        if (banner) {
            openModal(banner);
        }
    } catch (error) {
        showNotification('Banner yüklenemedi', 'error');
    }
};

const deleteBanner = async (id) => {
    if (!confirm('Bu bannerı silmek istediğinize emin misiniz?')) return;
    
    try {
        const response = await fetch(`${API_BASE}/banners/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        
        if (!response.ok) throw new Error('Banner silinemedi');
        
        showNotification('Banner başarıyla silindi!', 'success');
        loadBanners();
    } catch (error) {
        showNotification('Hata: ' + error.message, 'error');
    }
};

// Select all checkbox handler
const handleSelectAll = () => {
    const selectAll = document.getElementById('selectAllBanners');
    const checkboxes = document.querySelectorAll('.banner-checkbox');
    
    if (selectAll) {
        selectAll.addEventListener('change', (e) => {
            checkboxes.forEach(cb => {
                cb.checked = e.target.checked;
            });
        });
    }
    
    // Update select all when individual checkboxes change
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

// Modal close on outside click
const setupModalClose = () => {
    const modal = document.getElementById('bannerModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
    }
};

// Search functionality
const searchBanners = () => {
    const searchTerm = document.getElementById('bannerSearchInput')?.value.toLowerCase() || '';
    if (!searchTerm) {
        filteredBanners = allBanners;
    } else {
        filteredBanners = allBanners.filter(banner => 
            (banner.title || '').toLowerCase().includes(searchTerm)
        );
    }
    renderBanners(filteredBanners);
};

// Filter by date
const filterByDate = () => {
    const filterValue = document.getElementById('dateFilter')?.value || 'all';
    let filtered = allBanners;
    
    if (filterValue !== 'all') {
        const now = new Date();
        filtered = allBanners.filter(banner => {
            const bannerDate = new Date(banner.created_at || banner.updated_at);
            switch (filterValue) {
                case 'today':
                    return bannerDate.toDateString() === now.toDateString();
                case 'week':
                    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    return bannerDate >= weekAgo;
                case 'month':
                    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                    return bannerDate >= monthAgo;
                default:
                    return true;
            }
        });
    }
    
    filteredBanners = filtered;
    renderBanners(filteredBanners);
};

// Bulk actions
const applyBulkAction = async () => {
    const selectedCheckboxes = document.querySelectorAll('.banner-checkbox:checked');
    const selectedIds = Array.from(selectedCheckboxes).map(cb => parseInt(cb.dataset.id));
    
    if (selectedIds.length === 0) {
        showNotification('Lütfen en az bir banner seçin!', 'error');
        return;
    }
    
    const action = document.getElementById('bulkActions')?.value;
    if (!action || action === 'Toplu işlemler') {
        showNotification('Lütfen bir işlem seçin!', 'error');
        return;
    }
    
    const token = sessionStorage.getItem('adminToken');
    
    try {
        if (action === 'Sil') {
            if (!confirm(`${selectedIds.length} banner silinecek. Emin misiniz?`)) return;
            
            const deletePromises = selectedIds.map(id => 
                fetch(`${API_BASE}/banners/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            );
            
            await Promise.all(deletePromises);
            showNotification('Bannerlar başarıyla silindi!', 'success');
        } else if (action === 'Aktif Et' || action === 'Pasif Et') {
            const isActive = action === 'Aktif Et' ? 1 : 0;
            
            const updatePromises = selectedIds.map(id => {
                // First get the banner, then update
                return fetch(`${API_BASE}/banners`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
                .then(res => res.json())
                .then(banners => {
                    const banner = banners.find(b => b.id === id);
                    if (banner) {
                        const formData = new FormData();
                        formData.append('title', banner.title || '');
                        formData.append('link', banner.link || '');
                        formData.append('order_index', banner.order_index || 0);
                        formData.append('is_active', isActive);
                        
                        return fetch(`${API_BASE}/banners/${id}`, {
                            method: 'PUT',
                            headers: { 'Authorization': `Bearer ${token}` },
                            body: formData
                        });
                    }
                });
            });
            
            await Promise.all(updatePromises);
            showNotification(`Bannerlar ${action === 'Aktif Et' ? 'aktif' : 'pasif'} edildi!`, 'success');
        }
        
        loadBanners();
    } catch (error) {
        console.error('Bulk action error:', error);
        showNotification('Hata: ' + error.message, 'error');
    }
};

// Sort functionality
let sortColumn = null;
let sortDirection = 'asc';

const sortBanners = (column) => {
    if (sortColumn === column) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        sortColumn = column;
        sortDirection = 'asc';
    }
    
    filteredBanners.sort((a, b) => {
        let aVal, bVal;
        
        if (column === 'title') {
            aVal = (a.title || '').toLowerCase();
            bVal = (b.title || '').toLowerCase();
        } else if (column === 'date') {
            aVal = new Date(a.created_at || a.updated_at || 0);
            bVal = new Date(b.created_at || b.updated_at || 0);
        }
        
        if (sortDirection === 'asc') {
            return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
        } else {
            return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
        }
    });
    
    renderBanners(filteredBanners);
    
    // Update sort icons
    document.querySelectorAll('.sortable i').forEach(icon => {
        icon.className = 'fas fa-sort';
    });
    
    const currentHeader = document.querySelector(`[data-sort="${column}"]`);
    if (currentHeader) {
        const icon = currentHeader.querySelector('i');
        if (icon) {
            icon.className = sortDirection === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down';
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    if (!checkAuth()) return;

    // Event listeners
    document.getElementById('addBannerBtn')?.addEventListener('click', () => openModal());
    document.getElementById('addBannerBtnTop')?.addEventListener('click', () => openModal());
    document.getElementById('closeBannerModal')?.addEventListener('click', closeModal);
    document.getElementById('cancelBannerBtn')?.addEventListener('click', closeModal);
    
    // Search
    document.getElementById('searchBannersBtn')?.addEventListener('click', searchBanners);
    document.getElementById('bannerSearchInput')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchBanners();
    });
    
    // Filter
    document.getElementById('filterBannersBtn')?.addEventListener('click', filterByDate);
    document.getElementById('dateFilter')?.addEventListener('change', filterByDate);
    
    // Bulk actions
    document.getElementById('applyBulkAction')?.addEventListener('click', applyBulkAction);
    
    // Sort
    document.querySelectorAll('.sortable').forEach(header => {
        header.addEventListener('click', () => {
            const column = header.dataset.sort;
            if (column) sortBanners(column);
        });
    });
    
    // Setup select all
    handleSelectAll();
    
    // Setup modal close
    setupModalClose();
    
    document.getElementById('bannerForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const token = sessionStorage.getItem('adminToken');
        
        try {
            const url = editingBannerId 
                ? `${API_BASE}/banners/${editingBannerId}`
                : `${API_BASE}/banners`;
            
            const response = await fetch(url, {
                method: editingBannerId ? 'PUT' : 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Banner kaydedilemedi' }));
                throw new Error(errorData.error || 'Banner kaydedilemedi');
            }
            
            showNotification('Banner başarıyla kaydedildi!', 'success');
            closeModal();
            loadBanners();
        } catch (error) {
            console.error('Save error:', error);
            showNotification('Hata: ' + error.message, 'error');
        }
    });
    
    document.getElementById('bannerImage')?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        const preview = document.getElementById('bannerImagePreview');
        if (file && preview) {
            // Validate file type
            if (!file.type.startsWith('image/')) {
                showNotification('Lütfen bir görsel dosyası seçin!', 'error');
                e.target.value = '';
                return;
            }
            
            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                showNotification('Dosya boyutu 5MB\'dan küçük olmalıdır!', 'error');
                e.target.value = '';
                return;
            }
            
            const reader = new FileReader();
            reader.onload = (e) => {
                preview.innerHTML = `<img src="${e.target.result}" alt="Preview" style="max-width: 200px; border-radius: 8px; margin-top: 10px;">`;
            };
            reader.readAsDataURL(file);
        } else if (preview && !file) {
            preview.innerHTML = '';
        }
    });
    
    loadBanners();
});

