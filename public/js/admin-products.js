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

// Kategorileri yükle (select için)
const loadCategoriesForSelect = async () => {
    try {
        const response = await fetch(`${API_BASE}/categories`, {
            headers: getAuthHeaders()
        });
        
        const categories = await response.json();
        const select = document.getElementById('productCategory');
        
        select.innerHTML = '<option value="">Kategori Seçin</option>' +
            categories.map(cat => 
                `<option value="${cat.id}">${cat.name}</option>`
            ).join('');
    } catch (error) {
        console.error('Kategoriler yüklenemedi:', error);
    }
};

// Ürünleri yükle
const loadProducts = async () => {
    try {
        const response = await fetch(`${API_BASE}/products`, {
            headers: getAuthHeaders()
        });
        
        if (!response.ok) {
            throw new Error('Ürünler yüklenemedi');
        }
        
        const products = await response.json();
        renderProducts(products);
    } catch (error) {
        console.error('Ürünler yüklenemedi:', error);
        document.getElementById('productsTableBody').innerHTML = 
            '<tr><td colspan="7" class="text-center">Ürünler yüklenirken bir hata oluştu.</td></tr>';
    }
};

// Tarih formatı
const formatDate = (dateString) => {
    if (!dateString) return 'Yayınlanmamış';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}.${month}.${year}, ${hours}:${minutes}`;
};

// Ürünleri render et
const renderProducts = (products) => {
    const tbody = document.getElementById('productsTableBody');
    const itemCount = document.getElementById('itemCount');
    
    if (itemCount) {
        itemCount.textContent = `${products.length} öge`;
    }
    
    if (products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">Henüz ürün eklenmemiş.</td></tr>';
        return;
    }
    
    tbody.innerHTML = products.map(product => {
        const createdDate = product.created_at || new Date().toISOString();
        const formattedDate = formatDate(createdDate);
        const categoryName = product.category_name || '(başlıksız)';
        
        return `
            <tr>
                <td>
                    <input type="checkbox" class="product-checkbox" data-id="${product.id}">
                </td>
                <td>
                    <strong>${product.name || '(başlıksız)'}</strong>
                </td>
                <td>
                    <span class="category-badge">${categoryName}</span>
                </td>
                <td>
                    <span class="date-status published">Yayınlanmış</span> ${formattedDate}
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-primary btn-sm" onclick="editProduct(${product.id})">
                            <i class="fas fa-edit"></i> Düzenle
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="deleteProduct(${product.id})">
                            <i class="fas fa-trash"></i> Sil
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
    
    // Checkbox event listeners
    document.querySelectorAll('.product-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            handleCheckboxChange(e);
            const row = e.target.closest('tr');
            if (e.target.checked) {
                row.classList.add('selected');
            } else {
                row.classList.remove('selected');
            }
        });
    });
    
    wireSelectAllCheckbox();
};

const wireSelectAllCheckbox = () => {
    const selectAll = document.getElementById('selectAll');
    if (!selectAll) return;

    const fresh = selectAll.cloneNode(true);
    selectAll.parentNode.replaceChild(fresh, selectAll);

    fresh.addEventListener('change', (e) => {
        document.querySelectorAll('.product-checkbox').forEach((cb) => {
            cb.checked = e.target.checked;
            const row = cb.closest('tr');
            if (row) {
                row.classList.toggle('selected', e.target.checked);
            }
        });
    });
};

const getSelectedProductIds = () =>
    Array.from(document.querySelectorAll('.product-checkbox:checked'))
        .map((cb) => parseInt(cb.dataset.id, 10))
        .filter((id) => !isNaN(id));

const applyBulkAction = async () => {
    const selectedIds = getSelectedProductIds();

    if (selectedIds.length === 0) {
        showNotification('Lütfen en az bir ürün seçin!', 'error');
        return;
    }

    const bulkSelect = document.getElementById('bulkActions');
    const action = bulkSelect?.value;

    if (!action) {
        showNotification('Lütfen bir toplu işlem seçin!', 'error');
        return;
    }

    const actionLabels = {
        delete: 'silinecek',
        activate: 'aktif edilecek',
        deactivate: 'pasif edilecek'
    };

    if (
        !confirm(
            `${selectedIds.length} ürün ${actionLabels[action] || 'güncellenecek'}. Devam etmek istiyor musunuz?`
        )
    ) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/products/bulk`, {
            method: 'POST',
            headers: {
                ...getAuthHeaders(),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ ids: selectedIds, action })
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(data.error || 'Toplu işlem başarısız');
        }

        if (bulkSelect) bulkSelect.value = '';
        const selectAll = document.getElementById('selectAll');
        if (selectAll) selectAll.checked = false;

        await loadProducts();
        showNotification(data.message || 'Toplu işlem tamamlandı', 'success');
    } catch (error) {
        console.error('Bulk action error:', error);
        showNotification('Hata: ' + error.message, 'error');
    }
};

// Checkbox change handler
const handleCheckboxChange = (e) => {
    const checkboxes = document.querySelectorAll('.product-checkbox');
    const checked = document.querySelectorAll('.product-checkbox:checked').length;
    const selectAll = document.getElementById('selectAll');
    if (selectAll && checkboxes.length) {
        selectAll.checked = checked === checkboxes.length;
        selectAll.indeterminate = checked > 0 && checked < checkboxes.length;
    }
};

// Fiyat formatı
const formatPrice = (price) => {
    return new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency: 'TRY'
    }).format(price);
};

// Modal aç/kapat
const openModal = (product = null) => {
    const modal = document.getElementById('productModal');
    const form = document.getElementById('productForm');
    const title = document.getElementById('modalTitle');
    const imagePreview = document.getElementById('imagePreview');
    
    if (product) {
        title.textContent = 'Ürün Düzenle';
        form.dataset.productId = product.id;
        document.getElementById('productName').value = product.name;
        document.getElementById('productDescription').value = product.description || '';
        document.getElementById('productPrice').value = product.price;
        document.getElementById('productCategory').value = product.category_id || '';
        document.getElementById('productOrder').value = product.order_index;
        document.getElementById('productActive').value = product.is_active;
        
        if (product.image) {
            imagePreview.innerHTML = `<img src="${product.image}" alt="Preview">`;
        } else {
            imagePreview.innerHTML = '';
        }
        
        // Allergen ve besin değerlerini yükle
        loadAllergensAndNutritionalValues(product.id);
    } else {
        title.textContent = 'Yeni Ürün';
        form.reset();
        form.removeAttribute('data-product-id');
        imagePreview.innerHTML = '';
        loadCategoriesForSelect();
        
        // Boş allergen ve besin değeri alanları başlat
        document.getElementById('allergensContainer').innerHTML = `
            <div class="dynamic-field-item">
                <input type="text" placeholder="Alerjen Adı (örn: Gluten, Fındık, Süt)" class="allergen-input" value="">
                <button type="button" class="btn-remove-field" onclick="removeAllergenField(this)">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        document.getElementById('nutritionalContainer').innerHTML = `
            <div class="dynamic-field-item nutritional-item">
                <input type="text" placeholder="Besin Adı (örn: Kalori, Protein, Yağ)" class="nutrient-name-input" value="">
                <input type="text" placeholder="Değer (örn: 250)" class="nutrient-value-input" value="">
                <input type="text" placeholder="Birim (örn: kcal, g, mg)" class="nutrient-unit-input" value="">
                <button type="button" class="btn-remove-field" onclick="removeNutritionalField(this)">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
    }
    
    modal.classList.add('show');
};

const closeModal = () => {
    const modal = document.getElementById('productModal');
    modal.classList.remove('show');
};

// Ürün ekle/düzenle
const saveProduct = async (e) => {
    e.preventDefault();
    
    const form = e.target;
    const formData = new FormData(form);
    const productId = form.dataset.productId;
    
    const url = productId 
        ? `${API_BASE}/products/${productId}`
        : `${API_BASE}/products`;
    
    const method = productId ? 'PUT' : 'POST';
    
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
        
        // Yeni ürün eklendiyse, product ID'sini al
        const finalProductId = productId || data.id;
        
        // Allergen ve besin değerlerini kaydet
        if (finalProductId) {
            await saveAllergensAndNutritionalValues(finalProductId);
        }
        
        closeModal();
        loadProducts();
        showNotification('Ürün başarıyla kaydedildi', 'success');
    } catch (error) {
        showNotification(error.message, 'error');
    }
};

// Ürün düzenle
const editProduct = async (id) => {
    try {
        const response = await fetch(`${API_BASE}/products`, {
            headers: getAuthHeaders()
        });
        
        const products = await response.json();
        const product = products.find(p => p.id === id);
        
        if (product) {
            await loadCategoriesForSelect();
            openModal(product);
        } else {
            showNotification('Ürün bulunamadı', 'error');
        }
    } catch (error) {
        console.error('Edit product error:', error);
        showNotification('Ürün yüklenemedi', 'error');
    }
};

// Ürün sil
const deleteProduct = async (id) => {
    if (!confirm('Bu ürünü silmek istediğinizden emin misiniz?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/products/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Silme işlemi başarısız');
        }
        
        loadProducts();
        showNotification('Ürün başarıyla silindi', 'success');
    } catch (error) {
        showNotification(error.message, 'error');
    }
};

// Bildirim göster
const showNotification = (message, type = 'success') => {
    const notification = document.createElement('div');
    let bgColor = '#10b981'; // green for success
    if (type === 'error') bgColor = '#ef4444';
    else if (type === 'warning') bgColor = '#f59e0b';
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${bgColor};
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
    
    loadCategoriesForSelect();
    loadProducts();
    
    // Event listeners
    const addProductBtn = document.getElementById('addProductBtn');
    const addProductBtnTop = document.getElementById('addProductBtnTop');
    
    if (addProductBtn) {
        addProductBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openModal();
        });
    }
    
    if (addProductBtnTop) {
        addProductBtnTop.addEventListener('click', () => openModal());
    }
    
    const closeModalBtn = document.getElementById('closeModal');
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeModal);
    }
    
    const cancelBtn = document.getElementById('cancelBtn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeModal);
    }
    
    const productForm = document.getElementById('productForm');
    if (productForm) {
        productForm.addEventListener('submit', saveProduct);
    }
    
    const productImage = document.getElementById('productImage');
    if (productImage) {
        productImage.addEventListener('change', handleImagePreview);
    }
    
    // Modal dışına tıklanınca kapat
    const productModal = document.getElementById('productModal');
    if (productModal) {
        productModal.addEventListener('click', (e) => {
            if (e.target.id === 'productModal') {
                closeModal();
            }
        });
    }
    
    document.getElementById('applyBulkAction')?.addEventListener('click', applyBulkAction);

    // Arama
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.querySelector('.search-btn');
    
    if (searchInput && searchBtn) {
        const performSearch = () => {
            const searchTerm = searchInput.value.toLowerCase();
            const rows = document.querySelectorAll('#productsTableBody tr');
            rows.forEach(row => {
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(searchTerm) ? '' : 'none';
            });
        };
        
        searchBtn.addEventListener('click', performSearch);
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                performSearch();
            }
        });
    }
    
    // Tablo satırlarına tıklanınca düzenle
    document.addEventListener('click', (e) => {
        const row = e.target.closest('#productsTableBody tr');
        if (row && !e.target.closest('input[type="checkbox"]') && !e.target.closest('button')) {
            const checkbox = row.querySelector('.product-checkbox');
            if (checkbox) {
                const productId = checkbox.dataset.id;
                if (productId) {
                    editProduct(parseInt(productId));
                }
            }
        }
    });
    
    // "Ürünler görüntüle" butonu
    const viewProductsBtn = document.querySelector('.view-products-btn');
    if (viewProductsBtn) {
        viewProductsBtn.addEventListener('click', () => {
            window.open('/', '_blank');
        });
    }
});

// Allergen işlevleri
const addAllergenField = () => {
    const container = document.getElementById('allergensContainer');
    const newField = document.createElement('div');
    newField.className = 'dynamic-field-item';
    newField.innerHTML = `
        <input type="text" placeholder="Alerjen Adı (örn: Gluten, Fındık, Süt)" class="allergen-input" value="">
        <button type="button" class="btn-remove-field" onclick="removeAllergenField(this)">
            <i class="fas fa-trash"></i>
        </button>
    `;
    container.appendChild(newField);
};

const removeAllergenField = (button) => {
    const container = document.getElementById('allergensContainer');
    if (container.children.length > 1) {
        button.closest('.dynamic-field-item').remove();
    } else {
        showNotification('En az bir alerjen alanı gereklidir', 'warning');
    }
};

// Besin değeri işlevleri
const addNutritionalField = () => {
    const container = document.getElementById('nutritionalContainer');
    const newField = document.createElement('div');
    newField.className = 'dynamic-field-item nutritional-item';
    newField.innerHTML = `
        <input type="text" placeholder="Besin Adı (örn: Kalori, Protein, Yağ)" class="nutrient-name-input" value="">
        <input type="text" placeholder="Değer (örn: 250)" class="nutrient-value-input" value="">
        <input type="text" placeholder="Birim (örn: kcal, g, mg)" class="nutrient-unit-input" value="">
        <button type="button" class="btn-remove-field" onclick="removeNutritionalField(this)">
            <i class="fas fa-trash"></i>
        </button>
    `;
    container.appendChild(newField);
};

const removeNutritionalField = (button) => {
    const container = document.getElementById('nutritionalContainer');
    if (container.children.length > 1) {
        button.closest('.dynamic-field-item').remove();
    } else {
        showNotification('En az bir besin değeri alanı gereklidir', 'warning');
    }
};

// Allergen ve besin değerlerini yükle
const loadAllergensAndNutritionalValues = async (productId) => {
    try {
        // Alerjenleri yükle
        const allergensResponse = await fetch(`${API_BASE}/products/${productId}/allergens`, {
            headers: getAuthHeaders()
        });
        
        const nutritionalResponse = await fetch(`${API_BASE}/products/${productId}/nutritional-values`, {
            headers: getAuthHeaders()
        });
        
        const allergens = await allergensResponse.json();
        const nutritionalValues = await nutritionalResponse.json();
        
        // Allergen alanlarını doldur
        const allergensContainer = document.getElementById('allergensContainer');
        allergensContainer.innerHTML = '';
        
        if (Array.isArray(allergens) && allergens.length > 0) {
            allergens.forEach(allergen => {
                const field = document.createElement('div');
                field.className = 'dynamic-field-item';
                field.innerHTML = `
                    <input type="text" placeholder="Alerjen Adı (örn: Gluten, Fındık, Süt)" class="allergen-input" value="${allergen.allergen_name}">
                    <button type="button" class="btn-remove-field" onclick="removeAllergenField(this)">
                        <i class="fas fa-trash"></i>
                    </button>
                `;
                allergensContainer.appendChild(field);
            });
        } else {
            const field = document.createElement('div');
            field.className = 'dynamic-field-item';
            field.innerHTML = `
                <input type="text" placeholder="Alerjen Adı (örn: Gluten, Fındık, Süt)" class="allergen-input" value="">
                <button type="button" class="btn-remove-field" onclick="removeAllergenField(this)">
                    <i class="fas fa-trash"></i>
                </button>
            `;
            allergensContainer.appendChild(field);
        }
        
        // Besin değerlerini yükle
        const nutritionalContainer = document.getElementById('nutritionalContainer');
        const portionSizeInput = document.querySelector('.portion-size-input');
        
        nutritionalContainer.innerHTML = '';
        
        if (Array.isArray(nutritionalValues) && nutritionalValues.length > 0) {
            const portionSize = nutritionalValues[0].portion_size;
            if (portionSize && portionSizeInput) {
                portionSizeInput.value = portionSize;
            }
            
            nutritionalValues.forEach(value => {
                const field = document.createElement('div');
                field.className = 'dynamic-field-item nutritional-item';
                field.innerHTML = `
                    <input type="text" placeholder="Besin Adı (örn: Kalori, Protein, Yağ)" class="nutrient-name-input" value="${value.nutrient_name}">
                    <input type="text" placeholder="Değer (örn: 250)" class="nutrient-value-input" value="${value.nutrient_value}">
                    <input type="text" placeholder="Birim (örn: kcal, g, mg)" class="nutrient-unit-input" value="${value.unit}">
                    <button type="button" class="btn-remove-field" onclick="removeNutritionalField(this)">
                        <i class="fas fa-trash"></i>
                    </button>
                `;
                nutritionalContainer.appendChild(field);
            });
        } else {
            const field = document.createElement('div');
            field.className = 'dynamic-field-item nutritional-item';
            field.innerHTML = `
                <input type="text" placeholder="Besin Adı (örn: Kalori, Protein, Yağ)" class="nutrient-name-input" value="">
                <input type="text" placeholder="Değer (örn: 250)" class="nutrient-value-input" value="">
                <input type="text" placeholder="Birim (örn: kcal, g, mg)" class="nutrient-unit-input" value="">
                <button type="button" class="btn-remove-field" onclick="removeNutritionalField(this)">
                    <i class="fas fa-trash"></i>
                </button>
            `;
            nutritionalContainer.appendChild(field);
        }
    } catch (error) {
        console.error('Allergen ve besin değerleri yüklenemedi:', error);
    }
};

// Allergen ve besin değerlerini kaydet
const saveAllergensAndNutritionalValues = async (productId) => {
    try {
        // Alerjenleri kaydet
        const allergenInputs = document.querySelectorAll('.allergen-input');
        const allergens = Array.from(allergenInputs)
            .map(input => input.value.trim())
            .filter(value => value.length > 0);
        
        // Besin değerlerini kaydet
        const nutritionalItems = document.querySelectorAll('.nutritional-item');
        const portionSizeInput = document.querySelector('.portion-size-input');
        const portionSize = portionSizeInput.value.trim();
        
        const nutritionalValues = Array.from(nutritionalItems)
            .map(item => ({
                nutrient_name: item.querySelector('.nutrient-name-input').value.trim(),
                nutrient_value: item.querySelector('.nutrient-value-input').value.trim(),
                unit: item.querySelector('.nutrient-unit-input').value.trim(),
                portion_size: portionSize
            }))
            .filter(value => value.nutrient_name.length > 0 && value.nutrient_value.length > 0);
        
        // API'ye gönder
        const response = await fetch(`${API_BASE}/products/${productId}/allergens-nutritional`, {
            method: 'POST',
            headers: {
                ...getAuthHeaders(),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                allergens: allergens,
                nutritional_values: nutritionalValues
            })
        });
        
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Allergen ve besin değerleri kaydedilemedi');
        }
        
        return await response.json();
    } catch (error) {
        console.error('Allergen ve besin değerleri kaydedilirken hata:', error);
        throw error;
    }
};

