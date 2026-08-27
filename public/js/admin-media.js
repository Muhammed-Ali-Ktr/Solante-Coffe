const API_BASE = '/api/admin';

const getAuthHeaders = () => {
    const token = sessionStorage.getItem('adminToken');
    return {
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

let allMediaItems = [];
let selectedMedia = new Set();
let currentView = 'grid';
let currentOpenMedia = null;

const loadMedia = async () => {
    try {
        const response = await fetch(`${API_BASE}/media`, {
            headers: getAuthHeaders()
        });
        
        if (!response.ok) throw new Error('Medya yüklenemedi');
        
        allMediaItems = await response.json();
        filterAndRenderMedia();
    } catch (error) {
        console.error('Load error:', error);
        showNotification('Medya yüklenemedi', 'error');
    }
};

const filterAndRenderMedia = () => {
    const typeFilter = document.getElementById('mediaTypeFilter')?.value;
    const dateFilter = document.getElementById('dateFilter')?.value;
    const searchVal = document.getElementById('mediaSearch')?.value.toLowerCase().trim();
    
    let filtered = [...allMediaItems];
    
    // 1. Type Filter
    if (typeFilter === 'Görseller') {
        filtered = filtered.filter(item => item.mime_type && item.mime_type.startsWith('image/'));
    } else if (typeFilter === 'Videolar') {
        filtered = filtered.filter(item => item.mime_type && item.mime_type.startsWith('video/'));
    }
    
    // 2. Date Filter
    if (dateFilter && dateFilter !== 'Tüm tarihler') {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        filtered = filtered.filter(item => {
            const itemDate = new Date(item.created_at);
            if (dateFilter === 'Bugün') {
                return itemDate >= startOfDay;
            } else if (dateFilter === 'Bu Hafta') {
                const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                return itemDate >= oneWeekAgo;
            } else if (dateFilter === 'Bu Ay') {
                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                return itemDate >= startOfMonth;
            }
            return true;
        });
    }
    
    // 3. Search Filter
    if (searchVal) {
        filtered = filtered.filter(item => 
            item.filename.toLowerCase().includes(searchVal) || 
            item.path.toLowerCase().includes(searchVal)
        );
    }
    
    renderMedia(filtered);
    updateMediaCount(filtered.length);
};

const renderMedia = (media) => {
    const grid = document.getElementById('mediaGrid');
    
    if (media.length === 0) {
        grid.innerHTML = '<div class="text-center" style="grid-column: 1/-1; padding: 60px; color: var(--text-light); font-size: 14px;">Ortam dosyası bulunamadı.</div>';
        return;
    }
    
    if (currentView === 'grid') {
        grid.innerHTML = media.map(item => {
            const isVideo = item.mime_type && item.mime_type.startsWith('video/');
            const isSelected = selectedMedia.has(item.id);
            const ext = item.filename.split('.').pop().toUpperCase();
            const isActivePreview = currentOpenMedia && currentOpenMedia.id === item.id;
            
            let previewHtml = '';
            let indicatorHtml = '';
            
            if (isVideo) {
                previewHtml = `<video src="${item.path}" muted loop playsinline></video>`;
                indicatorHtml = `<div class="video-indicator"><i class="fas fa-play"></i> ${ext}</div>`;
            } else {
                previewHtml = `<img src="${item.path}" alt="${item.filename}" loading="lazy">`;
                indicatorHtml = `<div class="image-badge">${ext}</div>`;
            }
            
            return `
                <div class="media-item ${isSelected ? 'selected' : ''} ${isActivePreview ? 'active-preview' : ''}" data-id="${item.id}">
                    <input type="checkbox" class="media-checkbox" data-id="${item.id}" ${isSelected ? 'checked' : ''}>
                    ${previewHtml}
                    ${indicatorHtml}
                    <button class="delete-item-btn" data-id="${item.id}" title="Sil"><i class="fas fa-trash"></i></button>
                </div>
            `;
        }).join('');
    } else {
        grid.innerHTML = media.map(item => {
            const isVideo = item.mime_type && item.mime_type.startsWith('video/');
            const isSelected = selectedMedia.has(item.id);
            const ext = item.filename.split('.').pop().toUpperCase();
            const isActivePreview = currentOpenMedia && currentOpenMedia.id === item.id;
            
            let previewHtml = '';
            if (isVideo) {
                previewHtml = `<video src="${item.path}" muted style="width: 80px; height: 80px; object-fit: cover; border-radius: 4px;"></video>`;
            } else {
                previewHtml = `<img src="${item.path}" alt="${item.filename}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 4px;">`;
            }
            
            return `
                <div class="media-item list-view ${isSelected ? 'selected' : ''} ${isActivePreview ? 'active-preview' : ''}" data-id="${item.id}" style="display: flex; align-items: center; gap: 15px; padding: 10px; height: auto; border-radius: 8px;">
                    <input type="checkbox" class="media-checkbox" data-id="${item.id}" ${isSelected ? 'checked' : ''}>
                    ${previewHtml}
                    <div style="flex: 1; min-width: 0;">
                        <strong style="display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 14px; font-weight: 600;">${item.filename}</strong>
                        <span style="font-size: 11px; background: var(--bg-secondary); padding: 2px 6px; border-radius: 4px; border: 1px solid var(--border-color); margin-top: 5px; display: inline-block; font-weight: 700;">${ext}</span>
                        <span style="font-size: 12px; color: var(--text-light); margin-left: 10px;">${(item.size / 1024).toFixed(2)} KB</span>
                    </div>
                    <button class="delete-item-btn" data-id="${item.id}" title="Sil"><i class="fas fa-trash"></i></button>
                </div>
            `;
        }).join('');
    }
    
    // Add checkbox listeners
    document.querySelectorAll('.media-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            e.stopPropagation();
            const id = parseInt(e.target.dataset.id);
            if (e.target.checked) {
                selectedMedia.add(id);
                e.target.closest('.media-item').classList.add('selected');
            } else {
                selectedMedia.delete(id);
                e.target.closest('.media-item').classList.remove('selected');
            }
            updateBulkSelectBtn();
        });
    });

    // Add item click listener to open details drawer
    document.querySelectorAll('.media-item').forEach(itemEl => {
        itemEl.addEventListener('click', (e) => {
            if (e.target.classList.contains('media-checkbox') || e.target.closest('.delete-item-btn')) return;
            
            const id = parseInt(itemEl.dataset.id);
            const mediaObj = allMediaItems.find(m => m.id === id);
            if (mediaObj) {
                openDetailsDrawer(mediaObj);
            }
        });
        
        // Add hover play for video previews
        const video = itemEl.querySelector('video');
        if (video) {
            itemEl.addEventListener('mouseenter', () => video.play().catch(() => {}));
            itemEl.addEventListener('mouseleave', () => {
                video.pause();
                video.currentTime = 0;
            });
        }
    });

    // Add direct delete button listeners
    document.querySelectorAll('.delete-item-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const id = parseInt(btn.dataset.id);
            const mediaObj = allMediaItems.find(m => m.id === id);
            if (mediaObj) {
                if (!confirm(`"${mediaObj.filename}" dosyasını kalıcı olarak silmek istediğinizden emin misiniz?`)) return;
                try {
                    const response = await fetch(`${API_BASE}/media/${id}`, {
                        method: 'DELETE',
                        headers: getAuthHeaders()
                    });
                    if (!response.ok) throw new Error('Medya silinemedi');
                    showNotification('Ortam dosyası silindi', 'success');
                    if (currentOpenMedia && currentOpenMedia.id === id) {
                        closeDetailsDrawer();
                    }
                    loadMedia();
                } catch (err) {
                    showNotification('Hata: ' + err.message, 'error');
                }
            }
        });
    });
};

const updateMediaCount = (filteredCount) => {
    const countEl = document.getElementById('mediaCount');
    if (countEl) {
        countEl.textContent = `${allMediaItems.length} ortam ögesinden ${filteredCount} tanesi listeleniyor`;
    }
};

const updateBulkSelectBtn = () => {
    const btn = document.getElementById('bulkSelectBtn');
    const deleteBtn = document.getElementById('bulkDeleteBtn');
    if (btn) {
        btn.textContent = selectedMedia.size > 0 
            ? `Seçili: ${selectedMedia.size} (Seçimi Bırak)` 
            : 'Tümünü Seç';
    }
    if (deleteBtn) {
        deleteBtn.style.display = selectedMedia.size > 0 ? 'inline-flex' : 'none';
    }
};

const openDetailsDrawer = async (item) => {
    currentOpenMedia = item;
    
    document.querySelectorAll('.media-item').forEach(el => el.classList.remove('active-preview'));
    const el = document.querySelector(`.media-item[data-id="${item.id}"]`);
    if (el) el.classList.add('active-preview');
    
    const drawer = document.getElementById('mediaDetailsDrawer');
    const preview = document.getElementById('detailPreview');
    const filename = document.getElementById('detailFilename');
    const pathVal = document.getElementById('detailPath');
    const size = document.getElementById('detailSize');
    const date = document.getElementById('detailDate');
    const usage = document.getElementById('detailUsage');
    
    if (!drawer) return;
    
    const isVideo = item.mime_type && item.mime_type.startsWith('video/');
    if (isVideo) {
        preview.innerHTML = `<video src="${item.path}" controls autoplay muted style="max-width:100%; max-height:100%;"></video>`;
    } else {
        preview.innerHTML = `<img src="${item.path}" alt="${item.filename}">`;
    }
    
    filename.textContent = item.filename;
    pathVal.textContent = item.path;
    size.textContent = `${(item.size / 1024).toFixed(2)} KB`;
    
    const dateObj = new Date(item.created_at);
    date.textContent = dateObj.toLocaleDateString('tr-TR', {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
    
    usage.textContent = 'Hesaplanıyor...';
    
    drawer.classList.add('show');
    
    try {
        const res = await fetch(`${API_BASE}/media/${item.id}/usage`, {
            headers: getAuthHeaders()
        });
        if (res.ok) {
            const data = await res.json();
            let usageHtml = '';
            
            if (data.categories.length > 0) {
                usageHtml += `<div style="margin-bottom: 5px;"><strong>Kategoriler:</strong> ${data.categories.map(c => `<span class="badge" style="background:#e0f2fe; color:#0369a1; padding:2px 6px; border-radius:4px; font-size:11px; margin-right:4px;">${c.name}</span>`).join('')}</div>`;
            }
            if (data.products.length > 0) {
                usageHtml += `<div style="margin-bottom: 5px;"><strong>Ürünler:</strong> ${data.products.map(p => `<span class="badge" style="background:#f0fdf4; color:#166534; padding:2px 6px; border-radius:4px; font-size:11px; margin-right:4px;">${p.name}</span>`).join('')}</div>`;
            }
            if (data.banners.length > 0) {
                usageHtml += `<div style="margin-bottom: 5px;"><strong>Bannerlar:</strong> ${data.banners.map(b => `<span class="badge" style="background:#fdf2f8; color:#9d174d; padding:2px 6px; border-radius:4px; font-size:11px; margin-right:4px;">${b.title || 'İsimsiz Banner'}</span>`).join('')}</div>`;
            }
            
            if (!usageHtml) {
                usageHtml = '<span style="color: var(--text-light); font-style: italic; font-size:12px;">Aktif hiçbir yerde kullanılmıyor</span>';
            }
            
            usage.innerHTML = usageHtml;
        } else {
            usage.textContent = 'Bağlantı alınamadı';
        }
    } catch(err) {
        usage.textContent = 'Bağlantı alınamadı';
    }
};

const closeDetailsDrawer = () => {
    const drawer = document.getElementById('mediaDetailsDrawer');
    if (drawer) drawer.classList.remove('show');
    document.querySelectorAll('.media-item').forEach(el => el.classList.remove('active-preview'));
    currentOpenMedia = null;
};

const copyUrlToClipboard = () => {
    if (!currentOpenMedia) return;
    const url = window.location.origin + currentOpenMedia.path;
    navigator.clipboard.writeText(url).then(() => {
        const copyBtn = document.getElementById('copyUrlBtn');
        const originalText = copyBtn.innerHTML;
        copyBtn.innerHTML = `<i class="fas fa-check"></i> Kopyalandı!`;
        copyBtn.style.background = 'var(--success-color)';
        copyBtn.style.color = 'white';
        showNotification('Ortam URL\'si panoya kopyalandı', 'success');
        setTimeout(() => {
            copyBtn.innerHTML = originalText;
            copyBtn.style.background = '';
            copyBtn.style.color = '';
        }, 1500);
    }).catch(err => {
        showNotification('Panoya kopyalanamadı', 'error');
    });
};

const deleteCurrentMedia = async () => {
    if (!currentOpenMedia) return;
    if (!confirm('Bu ortam dosyasını kalıcı olarak silmek istediğinizden emin misiniz? Dosya sisteminden tamamen kaldırılacaktır.')) return;
    
    try {
        const response = await fetch(`${API_BASE}/media/${currentOpenMedia.id}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        
        if (!response.ok) throw new Error('Medya silinemedi');
        
        showNotification('Ortam dosyası silindi', 'success');
        closeDetailsDrawer();
        loadMedia();
    } catch (err) {
        showNotification('Hata: ' + err.message, 'error');
    }
};

const deleteSelectedMedia = async () => {
    if (selectedMedia.size === 0) return;
    if (!confirm(`Seçilen ${selectedMedia.size} adet ortam dosyasını kalıcı olarak silmek istediğinizden emin misiniz?`)) return;
    
    try {
        const response = await fetch(`${API_BASE}/media/bulk-delete`, {
            method: 'POST',
            headers: {
                ...getAuthHeaders(),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ ids: Array.from(selectedMedia) })
        });
        
        if (!response.ok) throw new Error('Toplu silme başarısız');
        
        const res = await response.json();
        showNotification(res.message || 'Seçilen dosyalar silindi', 'success');
        selectedMedia.clear();
        updateBulkSelectBtn();
        loadMedia();
    } catch(err) {
        showNotification('Hata: ' + err.message, 'error');
    }
};

const uploadFiles = async (files) => {
    if (!files || files.length === 0) return;
    
    const overlay = document.getElementById('progressOverlay');
    const bar = document.getElementById('progressBar');
    const status = document.getElementById('progressStatus');
    
    if (overlay) overlay.classList.add('show');
    if (bar) bar.style.width = '0%';
    
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
    }
    
    const token = sessionStorage.getItem('adminToken');
    
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE}/media`, true);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    
    xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 100);
            if (bar) bar.style.width = `${percent}%`;
            if (status) status.textContent = `Yükleniyor: %${percent} (${files.length} dosya)`;
        }
    });
    
    xhr.onload = () => {
        if (overlay) overlay.classList.remove('show');
        if (xhr.status >= 200 && xhr.status < 300) {
            const res = JSON.parse(xhr.responseText);
            showNotification(res.message || 'Dosyalar başarıyla yüklendi!', 'success');
            loadMedia();
        } else {
            let errMsg = 'Dosyalar yüklenemedi';
            try {
                const res = JSON.parse(xhr.responseText);
                errMsg = res.error || errMsg;
            } catch(e) {}
            showNotification('Hata: ' + errMsg, 'error');
        }
    };
    
    xhr.onerror = () => {
        if (overlay) overlay.classList.remove('show');
        showNotification('Yükleme sırasında ağ hatası oluştu', 'error');
    };
    
    xhr.send(formData);
};

const setupDragAndDrop = () => {
    const overlay = document.getElementById('dragDropOverlay');
    if (!overlay) return;
    
    let dragCounter = 0;
    
    window.addEventListener('dragenter', (e) => {
        e.preventDefault();
        dragCounter++;
        if (dragCounter === 1) {
            overlay.classList.add('show');
        }
    });
    
    window.addEventListener('dragover', (e) => {
        e.preventDefault();
    });
    
    window.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dragCounter--;
        if (dragCounter === 0) {
            overlay.classList.remove('show');
        }
    });
    
    window.addEventListener('drop', (e) => {
        e.preventDefault();
        dragCounter = 0;
        overlay.classList.remove('show');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            uploadFiles(files);
        }
    });
};

const setupPaste = () => {
    window.addEventListener('paste', (e) => {
        const items = (e.clipboardData || e.originalEvent.clipboardData).items;
        let files = [];
        for (const item of items) {
            if (item.kind === 'file') {
                const file = item.getAsFile();
                if (file) {
                    files.push(file);
                }
            }
        }
        if (files.length > 0) {
            e.preventDefault();
            showNotification('Pano içeriği algılandı, yükleniyor...', 'info');
            uploadFiles(files);
        }
    });
};

document.addEventListener('DOMContentLoaded', () => {
    if (!checkAuth()) return;

    // View toggle
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentView = btn.dataset.view;
            filterAndRenderMedia();
        });
    });

    // Filters and search events
    document.getElementById('mediaTypeFilter')?.addEventListener('change', filterAndRenderMedia);
    document.getElementById('dateFilter')?.addEventListener('change', filterAndRenderMedia);
    document.getElementById('mediaSearch')?.addEventListener('input', filterAndRenderMedia);

    // Upload modals click
    document.getElementById('addMediaBtn')?.addEventListener('click', () => {
        document.getElementById('uploadModal').classList.add('show');
    });
    document.getElementById('closeUploadModal')?.addEventListener('click', () => {
        document.getElementById('uploadModal').classList.remove('show');
    });
    document.getElementById('cancelUploadBtn')?.addEventListener('click', () => {
        document.getElementById('uploadModal').classList.remove('show');
    });

    // Upload form
    document.getElementById('uploadForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const fileInput = document.getElementById('mediaFile');
        if (fileInput && fileInput.files.length > 0) {
            uploadFiles(fileInput.files);
            document.getElementById('uploadModal').classList.remove('show');
            document.getElementById('uploadForm').reset();
        } else {
            showNotification('Lütfen dosya seçin', 'error');
        }
    });

    // Bulk select button click (Toggle Select All/Deselect All)
    document.getElementById('bulkSelectBtn')?.addEventListener('click', () => {
        const checkboxes = document.querySelectorAll('.media-checkbox');
        const allChecked = checkboxes.length > 0 && Array.from(checkboxes).every(cb => cb.checked);
        
        checkboxes.forEach(cb => {
            cb.checked = !allChecked;
            const id = parseInt(cb.dataset.id);
            if (!allChecked) {
                selectedMedia.add(id);
                cb.closest('.media-item').classList.add('selected');
            } else {
                selectedMedia.delete(id);
                cb.closest('.media-item').classList.remove('selected');
            }
        });
        updateBulkSelectBtn();
    });

    // Bulk Delete button click
    document.getElementById('bulkDeleteBtn')?.addEventListener('click', deleteSelectedMedia);

    // Details drawer events
    document.getElementById('closeDetailsDrawer')?.addEventListener('click', closeDetailsDrawer);
    document.getElementById('copyUrlBtn')?.addEventListener('click', copyUrlToClipboard);
    document.getElementById('deleteMediaBtn')?.addEventListener('click', deleteCurrentMedia);

    // Close details drawer if clicked outside
    document.addEventListener('click', (e) => {
        const drawer = document.getElementById('mediaDetailsDrawer');
        if (drawer && drawer.classList.contains('show')) {
            if (!drawer.contains(e.target) && !e.target.closest('.media-item') && !e.target.closest('.modal')) {
                closeDetailsDrawer();
            }
        }
    });

    // Drag-and-drop & Clipboard Paste setup
    setupDragAndDrop();
    setupPaste();

    // Initial load
    loadMedia();
});
