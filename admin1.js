// ==================== CATEGORIES MANAGEMENT ====================
async function loadCategories() {
    try {
        const { data, error } = await supabase
            .from('categories')
            .select('*')
            .order('created_at', { ascending: true });
        
        if (error) throw error;
        
        dashboardData.categories = data || [];
        renderCategories();
        populateCategorySelects();
        
    } catch (error) {
        console.error('Error loading categories:', error);
        showAdminToast('Failed to load categories', 'error');
    }
}

function renderCategories() {
    const container = document.getElementById('categoriesList');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (dashboardData.categories.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-layer-group"></i><h3>No Categories</h3><p>Add your first category to get started</p></div>';
        return;
    }
    
    dashboardData.categories.forEach(category => {
        const card = document.createElement('div');
        card.className = 'item-card';
        card.innerHTML = `
            <h4>${category.name}</h4>
            <p>Created: ${formatTimestamp(category.created_at)}</p>
            <div class="item-actions">
                <button class="edit-btn" onclick="editCategory(${category.id})">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="delete-btn" onclick="deleteCategory(${category.id})">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        `;
        container.appendChild(card);
    });
}

async function addCategory() {
    const name = document.getElementById('categoryName').value.trim();
    
    if (!name) {
        showAdminToast('Please enter category name', 'warning');
        return;
    }
    
    try {
        showAdminLoading();
        
        const { data, error } = await supabase
            .from('categories')
            .insert([{ name, created_at: new Date().toISOString() }])
            .select()
            .single();
        
        if (error) throw error;
        
        dashboardData.categories.push(data);
        renderCategories();
        populateCategorySelects();
        
        document.getElementById('categoryName').value = '';
        
        hideAdminLoading();
        showAdminToast('Category added successfully', 'success');
        
    } catch (error) {
        console.error('Error adding category:', error);
        hideAdminLoading();
        showAdminToast('Failed to add category', 'error');
    }
}

async function editCategory(id) {
    const category = dashboardData.categories.find(c => c.id === id);
    if (!category) return;
    
    const newName = prompt('Enter new category name:', category.name);
    if (!newName || newName === category.name) return;
    
    try {
        showAdminLoading();
        
        const { error } = await supabase
            .from('categories')
            .update({ name: newName })
            .eq('id', id);
        
        if (error) throw error;
        
        category.name = newName;
        renderCategories();
        
        hideAdminLoading();
        showAdminToast('Category updated successfully', 'success');
        
    } catch (error) {
        console.error('Error updating category:', error);
        hideAdminLoading();
        showAdminToast('Failed to update category', 'error');
    }
}

async function deleteCategory(id) {
    showConfirmDialog(
        'Delete Category',
        'Are you sure you want to delete this category? All related cards and products will be affected.',
        async () => {
            try {
                showAdminLoading();
                
                const { error } = await supabase
                    .from('categories')
                    .delete()
                    .eq('id', id);
                
                if (error) throw error;
                
                dashboardData.categories = dashboardData.categories.filter(c => c.id !== id);
                renderCategories();
                populateCategorySelects();
                
                hideAdminLoading();
                showAdminToast('Category deleted successfully', 'success');
                
            } catch (error) {
                console.error('Error deleting category:', error);
                hideAdminLoading();
                showAdminToast('Failed to delete category', 'error');
            }
        }
    );
}

function populateCategorySelects() {
    const selects = document.querySelectorAll('#cardCategory, #productCategory, #productPageBgCategory');
    
    selects.forEach(select => {
        if (!select) return;
        
        select.innerHTML = '<option value="">Select Category</option>';
        
        dashboardData.categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            select.appendChild(option);
        });
    });
}

// ==================== CATEGORY CARDS MANAGEMENT ====================
async function loadCategoryCards() {
    try {
        const { data, error } = await supabase
            .from('category_cards')
            .select('*, categories(name)')
            .order('created_at', { ascending: true });
        
        if (error) throw error;
        
        dashboardData.categoryCards = data || [];
        renderCategoryCards();
        populateCategoryCardSelects();
        
    } catch (error) {
        console.error('Error loading category cards:', error);
        showAdminToast('Failed to load category cards', 'error');
    }
}

function renderCategoryCards() {
    const container = document.getElementById('categoryCardsList');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (dashboardData.categoryCards.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-th-large"></i><h3>No Category Cards</h3><p>Add your first category card</p></div>';
        return;
    }
    
    dashboardData.categoryCards.forEach(card => {
        const cardEl = document.createElement('div');
        cardEl.className = 'item-card';
        cardEl.innerHTML = `
            <img src="${card.icon_url}" alt="${card.name}">
            <h4>${card.name}</h4>
            <p>Category: ${card.categories?.name || 'N/A'}</p>
            ${card.discount_percentage ? `<p>Discount: ${card.discount_percentage}%</p>` : ''}
            <div class="item-actions">
                <button class="edit-btn" onclick="editCategoryCard(${card.id})">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="delete-btn" onclick="deleteCategoryCard(${card.id})">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        `;
        container.appendChild(cardEl);
    });
}

async function addCategoryCard() {
    const categoryId = document.getElementById('cardCategory').value;
    const name = document.getElementById('cardName').value.trim();
    const iconFile = document.getElementById('cardIcon').files[0];
    const flagFile = document.getElementById('cardFlag').files[0];
    const discount = document.getElementById('cardDiscount').value;
    
    if (!categoryId || !name || !iconFile) {
        showAdminToast('Please fill all required fields', 'warning');
        return;
    }
    
    try {
        showAdminLoading();
        
        // Upload icon
        const iconUrl = await uploadFile(iconFile, 'category-icons', 'cards/');
        
        // Upload flag if exists
        let flagUrl = null;
        if (flagFile) {
            flagUrl = await uploadFile(flagFile, 'category-icons', 'flags/');
        }
        
        const { data, error } = await supabase
            .from('category_cards')
            .insert([{
                category_id: parseInt(categoryId),
                name: name,
                icon_url: iconUrl,
                country_flag_url: flagUrl,
                discount_percentage: discount ? parseInt(discount) : 0,
                rating: 0,
                total_sales: 0,
                created_at: new Date().toISOString()
            }])
            .select()
            .single();
        
        if (error) throw error;
        
        await loadCategoryCards();
        
        // Clear form
        document.getElementById('cardCategory').value = '';
        document.getElementById('cardName').value = '';
        document.getElementById('cardIcon').value = '';
        document.getElementById('cardFlag').value = '';
        document.getElementById('cardDiscount').value = '';
        
        hideAdminLoading();
        showAdminToast('Category card added successfully', 'success');
        
    } catch (error) {
        console.error('Error adding category card:', error);
        hideAdminLoading();
        showAdminToast('Failed to add category card', 'error');
    }
}

async function editCategoryCard(id) {
    // Implementation for editing category card
    showAdminToast('Edit functionality - to be implemented', 'info');
}

async function deleteCategoryCard(id) {
    showConfirmDialog(
        'Delete Category Card',
        'Are you sure you want to delete this card?',
        async () => {
            try {
                showAdminLoading();
                
                const card = dashboardData.categoryCards.find(c => c.id === id);
                
                // Delete images
                if (card.icon_url) await deleteFile(card.icon_url, 'category-icons');
                if (card.country_flag_url) await deleteFile(card.country_flag_url, 'category-icons');
                
                const { error } = await supabase
                    .from('category_cards')
                    .delete()
                    .eq('id', id);
                
                if (error) throw error;
                
                await loadCategoryCards();
                
                hideAdminLoading();
                showAdminToast('Category card deleted successfully', 'success');
                
            } catch (error) {
                console.error('Error deleting category card:', error);
                hideAdminLoading();
                showAdminToast('Failed to delete category card', 'error');
            }
        }
    );
}

function populateCategoryCardSelects() {
    const selects = document.querySelectorAll('#productCategoryCard');
    
    selects.forEach(select => {
        if (!select) return;
        
        select.innerHTML = '<option value="">Select Category Card</option>';
        
        dashboardData.categoryCards.forEach(card => {
            const option = document.createElement('option');
            option.value = card.id;
            option.textContent = card.name;
            select.appendChild(option);
        });
    });
}

// ==================== BANNERS MANAGEMENT ====================
let currentBannerTab = 'main';

function switchBannerTab(tab) {
    currentBannerTab = tab;
    
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(tab + 'BannersTab').classList.add('active');
    
    loadBanners(tab);
}

async function loadBanners(type = 'main') {
    try {
        const { data, error } = await supabase
            .from('banners')
            .select('*')
            .eq('type', type)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        renderBanners(data || [], type);
        
    } catch (error) {
        console.error('Error loading banners:', error);
        showAdminToast('Failed to load banners', 'error');
    }
}

function renderBanners(banners, type) {
    const container = document.getElementById(type + 'BannersList');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (banners.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-images"></i><h3>No Banners</h3><p>Add your first banner</p></div>';
        return;
    }
    
    banners.forEach(banner => {
        const card = document.createElement('div');
        card.className = 'item-card';
        card.innerHTML = `
            <img src="${banner.image_url}" alt="${banner.title || 'Banner'}">
            <h4>${banner.title || 'Untitled'}</h4>
            ${banner.link_url ? `<p>Link: ${banner.link_url}</p>` : ''}
            <div class="item-actions">
                <button class="delete-btn" onclick="deleteBanner(${banner.id}, '${type}')">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        `;
        container.appendChild(card);
    });
}

async function addMainBanner() {
    const imageFile = document.getElementById('mainBannerImage').files[0];
    const title = document.getElementById('mainBannerTitle').value.trim();
    
    if (!imageFile) {
        showAdminToast('Please select an image', 'warning');
        return;
    }
    
    try {
        showAdminLoading();
        
        const imageUrl = await uploadFile(imageFile, 'banners', 'main/');
        
        const { error } = await supabase
            .from('banners')
            .insert([{
                type: 'main',
                image_url: imageUrl,
                title: title || null,
                created_at: new Date().toISOString()
            }]);
        
        if (error) throw error;
        
        document.getElementById('mainBannerImage').value = '';
        document.getElementById('mainBannerTitle').value = '';
        
        await loadBanners('main');
        
        hideAdminLoading();
        showAdminToast('Main banner added successfully', 'success');
        
    } catch (error) {
        console.error('Error adding banner:', error);
        hideAdminLoading();
        showAdminToast('Failed to add banner', 'error');
    }
}

async function addLinkBanner() {
    const imageFile = document.getElementById('linkBannerImage').files[0];
    const linkUrl = document.getElementById('linkBannerUrl').value.trim();
    const title = document.getElementById('linkBannerTitle').value.trim();
    
    if (!imageFile || !linkUrl) {
        showAdminToast('Please fill all required fields', 'warning');
        return;
    }
    
    try {
        showAdminLoading();
        
        const imageUrl = await uploadFile(imageFile, 'banners', 'link/');
        
        const { error } = await supabase
            .from('banners')
            .insert([{
                type: 'link',
                image_url: imageUrl,
                link_url: linkUrl,
                title: title || null,
                created_at: new Date().toISOString()
            }]);
        
        if (error) throw error;
        
        document.getElementById('linkBannerImage').value = '';
        document.getElementById('linkBannerUrl').value = '';
        document.getElementById('linkBannerTitle').value = '';
        
        await loadBanners('link');
        
        hideAdminLoading();
        showAdminToast('Link banner added successfully', 'success');
        
    } catch (error) {
        console.error('Error adding link banner:', error);
        hideAdminLoading();
        showAdminToast('Failed to add link banner', 'error');
    }
}

async function deleteBanner(id, type) {
    showConfirmDialog(
        'Delete Banner',
        'Are you sure you want to delete this banner?',
        async () => {
            try {
                showAdminLoading();
                
                const { data } = await supabase
                    .from('banners')
                    .select('image_url')
                    .eq('id', id)
                    .single();
                
                if (data?.image_url) {
                    await deleteFile(data.image_url, 'banners');
                }
                
                const { error } = await supabase
                    .from('banners')
                    .delete()
                    .eq('id', id);
                
                if (error) throw error;
                
                await loadBanners(type);
                
                hideAdminLoading();
                showAdminToast('Banner deleted successfully', 'success');
                
            } catch (error) {
                console.error('Error deleting banner:', error);
                hideAdminLoading();
                showAdminToast('Failed to delete banner', 'error');
            }
        }
    );
}

// ==================== WEBSITE SETTINGS ====================
async function saveWebsiteSettings() {
    try {
        showAdminLoading();
        
        const settings = {
            website_name: document.getElementById('websiteName').value.trim(),
            version: document.getElementById('websiteVersion').value.trim()
        };
        
        // Upload logo if changed
        const logoFile = document.getElementById('logoUpload').files[0];
        if (logoFile) {
            settings.logo_url = await uploadFile(logoFile, 'settings', 'logo/');
        }
        
        // Upload main background if changed
        const mainBgFile = document.getElementById('mainBackground').files[0];
        if (mainBgFile) {
            const bgUrl = await uploadFile(mainBgFile, 'settings', 'backgrounds/');
            
            await supabase
                .from('custom_backgrounds')
                .upsert({
                    type: 'main',
                    background_url: bgUrl,
                    format: mainBgFile.type.includes('video') ? 'video' : 'image'
                });
        }
        
        // Upload button background if changed
        const btnBgFile = document.getElementById('buttonBackground').files[0];
        if (btnBgFile) {
            settings.button_background = await uploadFile(btnBgFile, 'settings', 'buttons/');
        }
        
        // Save settings
        const { error } = await supabase
            .from('website_settings')
            .upsert(settings);
        
        if (error) throw error;
        
        hideAdminLoading();
        showAdminToast('Settings saved successfully', 'success');
        
    } catch (error) {
        console.error('Error saving settings:', error);
        hideAdminLoading();
        showAdminToast('Failed to save settings', 'error');
    }
}

// ==================== FILE PREVIEW ====================
document.addEventListener('change', (e) => {
    if (e.target.type === 'file') {
        const file = e.target.files[0];
        if (!file) return;
        
        const previewId = e.target.id + 'Preview';
        const preview = document.getElementById(previewId);
        
        if (preview && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                preview.innerHTML = `<img src="${e.target.result}" style="max-width: 100%; border-radius: 8px;">`;
            };
            reader.readAsDataURL(file);
        } else if (preview && file.type.startsWith('video/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                preview.innerHTML = `<video src="${e.target.result}" style="max-width: 100%; border-radius: 8px;" controls></video>`;
            };
            reader.readAsDataURL(file);
        }
    }
});
