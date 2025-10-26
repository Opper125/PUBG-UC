// ==================== MUSIC MANAGEMENT ====================
async function loadMusic() {
    const container = document.getElementById('musicContent');
    if (!container) return;
    
    container.innerHTML = `
        <div class="form-card">
            <h3>Upload Background Music</h3>
            <div class="form-group">
                <label>Music File (MP3/MP4) *</label>
                <input type="file" id="musicFile" accept="audio/*,video/mp4">
                <small style="color: var(--text-muted);">Recommended: MP3 format, max 10MB</small>
            </div>
            <div class="form-group">
                <label>Music Title</label>
                <input type="text" id="musicTitle" placeholder="Enter music title">
            </div>
            <button class="add-btn" onclick="uploadMusic()">
                <i class="fas fa-upload"></i> Upload Music
            </button>
        </div>
        
        <div class="items-grid" id="musicList"></div>
    `;
    
    loadMusicList();
}

async function loadMusicList() {
    try {
        const { data, error } = await supabase
            .from('music_files')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        renderMusicList(data || []);
        
    } catch (error) {
        console.error('Error loading music:', error);
    }
}

function renderMusicList(musicFiles) {
    const container = document.getElementById('musicList');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (musicFiles.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-music"></i><h3>No Music Files</h3><p>Upload background music</p></div>';
        return;
    }
    
    musicFiles.forEach(music => {
        const card = document.createElement('div');
        card.className = 'item-card';
        card.innerHTML = `
            <i class="fas fa-music" style="font-size: 48px; color: var(--primary); margin-bottom: 16px;"></i>
            <h4>${music.title || 'Untitled'}</h4>
            <audio controls style="width: 100%; margin: 12px 0;">
                <source src="${music.file_url}" type="audio/mpeg">
            </audio>
            <div class="item-actions">
                <button class="delete-btn" onclick="deleteMusic(${music.id}, '${music.file_url}')">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        `;
        container.appendChild(card);
    });
}

async function uploadMusic() {
    const musicFile = document.getElementById('musicFile').files[0];
    const title = document.getElementById('musicTitle').value.trim();
    
    if (!musicFile) {
        showAdminToast('Please select a music file', 'warning');
        return;
    }
    
    if (musicFile.size > 10 * 1024 * 1024) {
        showAdminToast('Music file must be less than 10MB', 'warning');
        return;
    }
    
    try {
        showAdminLoading();
        
        const fileUrl = await uploadFile(musicFile, 'music', 'background/');
        
        const { error } = await supabase
            .from('music_files')
            .insert([{
                title: title || musicFile.name,
                file_url: fileUrl,
                created_at: new Date().toISOString()
            }]);
        
        if (error) throw error;
        
        document.getElementById('musicFile').value = '';
        document.getElementById('musicTitle').value = '';
        
        await loadMusicList();
        
        hideAdminLoading();
        showAdminToast('Music uploaded successfully', 'success');
        
    } catch (error) {
        console.error('Error uploading music:', error);
        hideAdminLoading();
        showAdminToast('Failed to upload music', 'error');
    }
}

async function deleteMusic(id, fileUrl) {
    showConfirmDialog(
        'Delete Music',
        'Are you sure you want to delete this music file?',
        async () => {
            try {
                showAdminLoading();
                
                await deleteFile(fileUrl, 'music');
                
                const { error } = await supabase
                    .from('music_files')
                    .delete()
                    .eq('id', id);
                
                if (error) throw error;
                
                await loadMusicList();
                
                hideAdminLoading();
                showAdminToast('Music deleted successfully', 'success');
                
            } catch (error) {
                console.error('Error deleting music:', error);
                hideAdminLoading();
                showAdminToast('Failed to delete music', 'error');
            }
        }
    );
}

// ==================== NOTIFICATIONS/MESSAGING ====================
async function loadNotifications() {
    const container = document.getElementById('notificationsContent');
    if (!container) return;
    
    container.innerHTML = `
        <div class="form-card">
            <h3>Send Notification/Message</h3>
            <div class="form-group">
                <label>Select Recipients</label>
                <select id="notifRecipients" onchange="toggleRecipientsList()">
                    <option value="all">All Users</option>
                    <option value="specific">Specific Users</option>
                </select>
            </div>
            
            <div class="form-group" id="specificUsersSection" style="display: none;">
                <label>Select Users</label>
                <div id="notifUsersList" style="max-height: 200px; overflow-y: auto; border: 1px solid var(--border); border-radius: 8px; padding: 12px;"></div>
            </div>
            
            <div class="form-group">
                <label>Notification Title *</label>
                <input type="text" id="notifTitle" placeholder="Enter title">
            </div>
            
            <div class="form-group">
                <label>Message *</label>
                <textarea id="notifMessage" rows="4" placeholder="Enter message"></textarea>
            </div>
            
            <div class="form-group">
                <label>Attach Image (Optional)</label>
                <input type="file" id="notifImage" accept="image/*">
            </div>
            
            <div class="form-group">
                <label>Attach Coupon (Optional)</label>
                <select id="notifCoupon">
                    <option value="">No Coupon</option>
                </select>
            </div>
            
            <div class="form-group">
                <label>Attach Product Link (Optional)</label>
                <select id="notifProduct">
                    <option value="">No Product</option>
                </select>
            </div>
            
            <button class="add-btn" onclick="sendNotification()">
                <i class="fas fa-paper-plane"></i> Send Notification
            </button>
        </div>
    `;
    
    loadUsersForNotification();
    loadCouponsForNotification();
    loadProductsForNotification();
}

function toggleRecipientsList() {
    const type = document.getElementById('notifRecipients').value;
    document.getElementById('specificUsersSection').style.display = type === 'specific' ? 'block' : 'none';
}

function loadUsersForNotification() {
    const container = document.getElementById('notifUsersList');
    if (!container) return;
    
    container.innerHTML = '';
    
    dashboardData.users.forEach(user => {
        const label = document.createElement('label');
        label.style.display = 'flex';
        label.style.alignItems = 'center';
        label.style.gap = '8px';
        label.style.padding = '8px';
        label.style.cursor = 'pointer';
        label.style.borderRadius = '6px';
        label.style.marginBottom = '4px';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = user.id;
        checkbox.className = 'notif-user-checkbox';
        
        const avatar = document.createElement('img');
        avatar.src = user.avatar_url;
        avatar.style.width = '32px';
        avatar.style.height = '32px';
        avatar.style.borderRadius = '50%';
        
        const div = document.createElement('div');
        div.innerHTML = `
            <strong>${user.username}</strong><br>
            <small style="color: var(--text-muted);">${user.email}</small>
        `;
        
        label.appendChild(checkbox);
        label.appendChild(avatar);
        label.appendChild(div);
        
        label.addEventListener('mouseenter', () => label.style.background = 'var(--dark-lighter)');
        label.addEventListener('mouseleave', () => label.style.background = 'transparent');
        
        container.appendChild(label);
    });
}

function loadCouponsForNotification() {
    const select = document.getElementById('notifCoupon');
    if (!select) return;
    
    select.innerHTML = '<option value="">No Coupon</option>';
    
    dashboardData.coupons?.forEach(coupon => {
        const option = document.createElement('option');
        option.value = coupon.code;
        option.textContent = `${coupon.code} (-${coupon.discount_percentage}%)`;
        select.appendChild(option);
    });
}

function loadProductsForNotification() {
    const select = document.getElementById('notifProduct');
    if (!select) return;
    
    select.innerHTML = '<option value="">No Product</option>';
    
    dashboardData.products.forEach(product => {
        const option = document.createElement('option');
        option.value = product.id;
        option.textContent = product.name;
        select.appendChild(option);
    });
}

async function sendNotification() {
    const recipientType = document.getElementById('notifRecipients').value;
    const title = document.getElementById('notifTitle').value.trim();
    const message = document.getElementById('notifMessage').value.trim();
    const imageFile = document.getElementById('notifImage').files[0];
    const couponCode = document.getElementById('notifCoupon').value;
    const productId = document.getElementById('notifProduct').value;
    
    if (!title || !message) {
        showAdminToast('Please fill required fields', 'warning');
        return;
    }
    
    try {
        showAdminLoading();
        
        let userIds = [];
        
        if (recipientType === 'all') {
            userIds = dashboardData.users.map(u => u.id);
        } else {
            userIds = Array.from(document.querySelectorAll('.notif-user-checkbox:checked'))
                .map(cb => parseInt(cb.value));
            
            if (userIds.length === 0) {
                hideAdminLoading();
                showAdminToast('Please select at least one user', 'warning');
                return;
            }
        }
        
        let imageUrl = null;
        if (imageFile) {
            imageUrl = await uploadFile(imageFile, 'notifications', 'images/');
        }
        
        const notifications = userIds.map(userId => ({
            user_id: userId,
            title: title,
            message: message,
            image_url: imageUrl,
            coupon_code: couponCode || null,
            product_id: productId ? parseInt(productId) : null,
            read: false,
            created_at: new Date().toISOString()
        }));
        
        const { error } = await supabase
            .from('notifications')
            .insert(notifications);
        
        if (error) throw error;
        
        // Clear form
        document.getElementById('notifTitle').value = '';
        document.getElementById('notifMessage').value = '';
        document.getElementById('notifImage').value = '';
        document.getElementById('notifCoupon').value = '';
        document.getElementById('notifProduct').value = '';
        document.querySelectorAll('.notif-user-checkbox').forEach(cb => cb.checked = false);
        
        hideAdminLoading();
        showAdminToast(`Notification sent to ${userIds.length} user(s)`, 'success');
        
    } catch (error) {
        console.error('Error sending notification:', error);
        hideAdminLoading();
        showAdminToast('Failed to send notification', 'error');
    }
}

// ==================== INPUT TABLES MANAGEMENT ====================
async function loadInputTables() {
    const container = document.getElementById('inputTablesContent');
    if (!container) return;
    
    container.innerHTML = `
        <div class="form-card">
            <h3>Create Input Table</h3>
            <div class="form-row">
                <div class="form-group">
                    <label>Select Category</label>
                    <select id="inputTableCategory" onchange="loadCategoryCardsForInputTable()">
                        <option value="">Select Category</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Select Category Card</label>
                    <select id="inputTableCategoryCard">
                        <option value="">Select Category Card</option>
                    </select>
                </div>
            </div>
            
            <div class="form-group">
                <label>Table Title *</label>
                <input type="text" id="inputTableTitle" placeholder="e.g., Account Information">
            </div>
            
            <div id="inputFieldsContainer">
                <div class="input-field-item">
                    <div class="form-row">
                        <div class="form-group">
                            <label>Field Label</label>
                            <input type="text" class="field-label" placeholder="e.g., User ID">
                        </div>
                        <div class="form-group">
                            <label>Field Placeholder</label>
                            <input type="text" class="field-placeholder" placeholder="Enter your user ID">
                        </div>
                    </div>
                </div>
            </div>
            
            <button class="quick-action-btn" onclick="addInputField()">
                <i class="fas fa-plus"></i> Add Another Field
            </button>
            
            <button class="add-btn" onclick="createInputTable()">
                <i class="fas fa-save"></i> Create Input Table
            </button>
        </div>
    `;
    
    populateCategorySelects();
}

function loadCategoryCardsForInputTable() {
    const categoryId = document.getElementById('inputTableCategory').value;
    const select = document.getElementById('inputTableCategoryCard');
    
    select.innerHTML = '<option value="">Select Category Card</option>';
    
    if (!categoryId) return;
    
    const cards = dashboardData.categoryCards.filter(c => c.category_id == categoryId);
    
    cards.forEach(card => {
        const option = document.createElement('option');
        option.value = card.id;
        option.textContent = card.name;
        select.appendChild(option);
    });
}

function addInputField() {
    const container = document.getElementById('inputFieldsContainer');
    
    const fieldItem = document.createElement('div');
    fieldItem.className = 'input-field-item';
    fieldItem.style.position = 'relative';
    fieldItem.style.padding = '16px';
    fieldItem.style.background = 'var(--dark-lighter)';
    fieldItem.style.borderRadius = '8px';
    fieldItem.style.marginTop = '12px';
    
    fieldItem.innerHTML = `
        <button class="delete-btn" onclick="this.parentElement.remove()" style="position: absolute; top: 8px; right: 8px; padding: 6px 12px;">
            <i class="fas fa-times"></i>
        </button>
        <div class="form-row">
            <div class="form-group">
                <label>Field Label</label>
                <input type="text" class="field-label" placeholder="e.g., User ID">
            </div>
            <div class="form-group">
                <label>Field Placeholder</label>
                <input type="text" class="field-placeholder" placeholder="Enter your user ID">
            </div>
        </div>
    `;
    
    container.appendChild(fieldItem);
}

async function createInputTable() {
    const categoryCardId = document.getElementById('inputTableCategoryCard').value;
    const title = document.getElementById('inputTableTitle').value.trim();
    
    if (!categoryCardId || !title) {
        showAdminToast('Please fill required fields', 'warning');
        return;
    }
    
    const fields = [];
    document.querySelectorAll('.input-field-item').forEach(item => {
        const label = item.querySelector('.field-label').value.trim();
        const placeholder = item.querySelector('.field-placeholder').value.trim();
        
        if (label && placeholder) {
            fields.push({ label, placeholder });
        }
    });
    
    if (fields.length === 0) {
        showAdminToast('Please add at least one field', 'warning');
        return;
    }
    
    try {
        showAdminLoading();
        
        const { error } = await supabase
            .from('input_tables')
            .insert([{
                category_card_id: parseInt(categoryCardId),
                title: title,
                fields: fields,
                created_at: new Date().toISOString()
            }]);
        
        if (error) throw error;
        
        hideAdminLoading();
        showAdminToast('Input table created successfully', 'success');
        
        // Reload the form
        loadInputTables();
        
    } catch (error) {
        console.error('Error creating input table:', error);
        hideAdminLoading();
        showAdminToast('Failed to create input table', 'error');
    }
}

// ==================== PRODUCT PAGE BANNERS ====================
async function loadProductBanners() {
    const container = document.getElementById('productBannersContent');
    if (!container) return;
    
    container.innerHTML = `
        <div class="form-card">
            <h3>Add Product Page Banner</h3>
            <div class="form-row">
                <div class="form-group">
                    <label>Select Category</label>
                    <select id="bannerCategory" onchange="loadCategoryCardsForBanner()">
                        <option value="">Select Category</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Select Category Card</label>
                    <select id="bannerCategoryCard">
                        <option value="">Select Category Card</option>
                    </select>
                </div>
            </div>
            
            <div class="form-group">
                <label>Banner Image *</label>
                <input type="file" id="bannerImage" accept="image/*">
            </div>
            
            <button class="add-btn" onclick="addProductBanner()">
                <i class="fas fa-plus"></i> Add Banner
            </button>
        </div>
    `;
    
    populateCategorySelects();
}

function loadCategoryCardsForBanner() {
    const categoryId = document.getElementById('bannerCategory').value;
    const select = document.getElementById('bannerCategoryCard');
    
    select.innerHTML = '<option value="">Select Category Card</option>';
    
    if (!categoryId) return;
    
    const cards = dashboardData.categoryCards.filter(c => c.category_id == categoryId);
    
    cards.forEach(card => {
        const option = document.createElement('option');
        option.value = card.id;
        option.textContent = card.name;
        select.appendChild(option);
    });
}

async function addProductBanner() {
    const categoryCardId = document.getElementById('bannerCategoryCard').value;
    const imageFile = document.getElementById('bannerImage').files[0];
    
    if (!categoryCardId || !imageFile) {
        showAdminToast('Please fill all fields', 'warning');
        return;
    }
    
    try {
        showAdminLoading();
        
        const imageUrl = await uploadFile(imageFile, 'banners', 'products/');
        
        const { error } = await supabase
            .from('product_page_banners')
            .insert([{
                category_card_id: parseInt(categoryCardId),
                image_url: imageUrl,
                created_at: new Date().toISOString()
            }]);
        
        if (error) throw error;
        
        document.getElementById('bannerImage').value = '';
        
        hideAdminLoading();
        showAdminToast('Product banner added successfully', 'success');
        
    } catch (error) {
        console.error('Error adding product banner:', error);
        hideAdminLoading();
        showAdminToast('Failed to add product banner', 'error');
    }
}

// ==================== GUIDELINES MANAGEMENT ====================
async function loadGuidelines() {
    const container = document.getElementById('guidelinesContent');
    if (!container) return;
    
    container.innerHTML = `
        <div class="form-card">
            <h3>Add Guideline</h3>
            <div class="form-row">
                <div class="form-group">
                    <label>Select Category</label>
                    <select id="guidelineCategory" onchange="loadCategoryCardsForGuideline()">
                        <option value="">Select Category</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Select Category Card</label>
                    <select id="guidelineCategoryCard">
                        <option value="">Select Category Card</option>
                    </select>
                </div>
            </div>
            
            <div class="form-group">
                <label>Title *</label>
                <input type="text" id="guidelineTitle" placeholder="Enter guideline title">
            </div>
            
            <div class="form-group">
                <label>Content *</label>
                <textarea id="guidelineContent" rows="8" placeholder="Enter content (supports image URLs)"></textarea>
                <small style="color: var(--text-muted);">Tip: Include image URLs directly in text</small>
            </div>
            
            <div class="form-group">
                <label>Icon/Image</label>
                <input type="file" id="guidelineIcon" accept="image/*">
            </div>
            
            <button class="add-btn" onclick="addGuideline()">
                <i class="fas fa-plus"></i> Add Guideline
            </button>
        </div>
    `;
    
    populateCategorySelects();
}

function loadCategoryCardsForGuideline() {
    const categoryId = document.getElementById('guidelineCategory').value;
    const select = document.getElementById('guidelineCategoryCard');
    
    select.innerHTML = '<option value="">Select Category Card</option>';
    
    if (!categoryId) return;
    
    const cards = dashboardData.categoryCards.filter(c => c.category_id == categoryId);
    
    cards.forEach(card => {
        const option = document.createElement('option');
        option.value = card.id;
        option.textContent = card.name;
        select.appendChild(option);
    });
}

async function addGuideline() {
    const categoryCardId = document.getElementById('guidelineCategoryCard').value;
    const title = document.getElementById('guidelineTitle').value.trim();
    const content = document.getElementById('guidelineContent').value.trim();
    const iconFile = document.getElementById('guidelineIcon').files[0];
    
    if (!categoryCardId || !title || !content) {
        showAdminToast('Please fill required fields', 'warning');
        return;
    }
    
    try {
        showAdminLoading();
        
        let iconUrl = null;
        if (iconFile) {
            iconUrl = await uploadFile(iconFile, 'guidelines', 'icons/');
        }
        
        const { error } = await supabase
            .from('product_guidelines')
            .insert([{
                category_card_id: parseInt(categoryCardId),
                title: title,
                content: content,
                icon_url: iconUrl,
                created_at: new Date().toISOString()
            }]);
        
        if (error) throw error;
        
        document.getElementById('guidelineTitle').value = '';
        document.getElementById('guidelineContent').value = '';
        document.getElementById('guidelineIcon').value = '';
        
        hideAdminLoading();
        showAdminToast('Guideline added successfully', 'success');
        
    } catch (error) {
        console.error('Error adding guideline:', error);
        hideAdminLoading();
        showAdminToast('Failed to add guideline', 'error');
    }
}

// ==================== YOUTUBE VIDEOS ====================
async function loadYoutubeVideos() {
    const container = document.getElementById('youtubeVideosContent');
    if (!container) return;
    
    container.innerHTML = `
        <div class="form-card">
            <h3>Add YouTube Video</h3>
            <div class="form-row">
                <div class="form-group">
                    <label>Select Category</label>
                    <select id="videoCategory" onchange="loadCategoryCardsForVideo()">
                        <option value="">Select Category</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Select Category Card</label>
                    <select id="videoCategoryCard">
                        <option value="">Select Category Card</option>
                    </select>
                </div>
            </div>
            
            <div class="form-group">
                <label>YouTube Video URL *</label>
                <input type="url" id="videoUrl" placeholder="https://youtube.com/... or https://youtu.be/...">
            </div>
            
            <div class="form-group">
                <label>Description</label>
                <textarea id="videoDescription" placeholder="Video description"></textarea>
            </div>
            
            <button class="add-btn" onclick="addYoutubeVideo()">
                <i class="fas fa-plus"></i> Add Video
            </button>
        </div>
    `;
    
    populateCategorySelects();
}

function loadCategoryCardsForVideo() {
    const categoryId = document.getElementById('videoCategory').value;
    const select = document.getElementById('videoCategoryCard');
    
    select.innerHTML = '<option value="">Select Category Card</option>';
    
    if (!categoryId) return;
    
    const cards = dashboardData.categoryCards.filter(c => c.category_id == categoryId);
    
    cards.forEach(card => {
        const option = document.createElement('option');
        option.value = card.id;
        option.textContent = card.name;
        select.appendChild(option);
    });
}

async function addYoutubeVideo() {
    const categoryCardId = document.getElementById('videoCategoryCard').value;
    const videoUrl = document.getElementById('videoUrl').value.trim();
    const description = document.getElementById('videoDescription').value.trim();
    
    if (!categoryCardId || !videoUrl) {
        showAdminToast('Please fill required fields', 'warning');
        return;
    }
    
    try {
        showAdminLoading();
        
        const { error } = await supabase
            .from('product_youtube_videos')
            .insert([{
                category_card_id: parseInt(categoryCardId),
                video_url: videoUrl,
                description: description || null,
                created_at: new Date().toISOString()
            }]);
        
        if (error) throw error;
        
        document.getElementById('videoUrl').value = '';
        document.getElementById('videoDescription').value = '';
        
        hideAdminLoading();
        showAdminToast('YouTube video added successfully', 'success');
        
    } catch (error) {
        console.error('Error adding video:', error);
        hideAdminLoading();
        showAdminToast('Failed to add video', 'error');
    }
}

// ==================== FEEDBACK SETTINGS ====================
async function loadFeedbackSettings() {
    const container = document.getElementById('feedbackSettingsContent');
    if (!container) return;
    
    container.innerHTML = `
        <div class="form-card">
            <h3>Configure Feedback System</h3>
            <div class="form-row">
                <div class="form-group">
                    <label>Select Category</label>
                    <select id="feedbackCategory" onchange="loadCategoryCardsForFeedback()">
                        <option value="">Select Category</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Select Category Card</label>
                    <select id="feedbackCategoryCard">
                        <option value="">Select Category Card</option>
                    </select>
                </div>
            </div>
            
            <div class="form-group">
                <label>Feedback Title *</label>
                <input type="text" id="feedbackTitle" placeholder="e.g., Rate Your Experience">
            </div>
            
            <div class="form-group">
                <label>Description</label>
                <textarea id="feedbackDescription" placeholder="Feedback description"></textarea>
            </div>
            
            <div class="form-group">
                <label>Maximum Stars *</label>
                <input type="number" id="feedbackMaxStars" value="5" min="1" max="10">
            </div>
            
            <button class="add-btn" onclick="saveFeedbackSettings()">
                <i class="fas fa-save"></i> Save Feedback Settings
            </button>
        </div>
    `;
    
    populateCategorySelects();
}

function loadCategoryCardsForFeedback() {
    const categoryId = document.getElementById('feedbackCategory').value;
    const select = document.getElementById('feedbackCategoryCard');
    
    select.innerHTML = '<option value="">Select Category Card</option>';
    
    if (!categoryId) return;
    
    const cards = dashboardData.categoryCards.filter(c => c.category_id == categoryId);
    
    cards.forEach(card => {
        const option = document.createElement('option');
        option.value = card.id;
        option.textContent = card.name;
        select.appendChild(option);
    });
}

async function saveFeedbackSettings() {
    const categoryCardId = document.getElementById('feedbackCategoryCard').value;
    const title = document.getElementById('feedbackTitle').value.trim();
    const description = document.getElementById('feedbackDescription').value.trim();
    const maxStars = document.getElementById('feedbackMaxStars').value;
    
    if (!categoryCardId || !title || !maxStars) {
        showAdminToast('Please fill required fields', 'warning');
        return;
    }
    
    try {
        showAdminLoading();
        
        const { error } = await supabase
            .from('feedback_settings')
            .upsert([{
                category_card_id: parseInt(categoryCardId),
                title: title,
                description: description || null,
                max_stars: parseInt(maxStars),
                created_at: new Date().toISOString()
            }]);
        
        if (error) throw error;
        
        hideAdminLoading();
        showAdminToast('Feedback settings saved successfully', 'success');
        
    } catch (error) {
        console.error('Error saving feedback settings:', error);
        hideAdminLoading();
        showAdminToast('Failed to save feedback settings', 'error');
    }
}

console.log('✅ Admin Dashboard Fully Loaded');
