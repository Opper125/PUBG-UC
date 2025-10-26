// ==================== NEWS MANAGEMENT ====================
async function loadNewsItems() {
    try {
        const { data, error } = await supabase
            .from('news')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        dashboardData.news = data || [];
        renderNewsManagement();
        
    } catch (error) {
        console.error('Error loading news:', error);
        showAdminToast('Failed to load news', 'error');
    }
}

function renderNewsManagement() {
    const container = document.getElementById('newsContent');
    if (!container) return;
    
    container.innerHTML = `
        <div class="form-card">
            <h3>Add News</h3>
            <div class="form-group">
                <label>News Title *</label>
                <input type="text" id="newsTitle" placeholder="Enter news title">
            </div>
            <div class="form-group">
                <label>News Content *</label>
                <textarea id="newsContent" rows="6" placeholder="Enter news content (supports image URLs)"></textarea>
                <small style="color: var(--text-muted);">Tip: Paste image URLs directly in content to display inline images</small>
            </div>
            <div class="form-group">
                <label>News Images (Multiple)</label>
                <input type="file" id="newsImages" accept="image/*" multiple>
                <small style="color: var(--text-muted);">Max 10 images, 5MB each</small>
            </div>
            <div class="form-group">
                <label>YouTube Video URL</label>
                <input type="url" id="newsYoutubeUrl" placeholder="https://youtube.com/...">
            </div>
            <div class="form-group">
                <label>Payment Methods (Optional)</label>
                <div id="newsPaymentMethods" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 8px;"></div>
            </div>
            <div class="form-group">
                <label>Contacts (Optional)</label>
                <div id="newsContacts" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 8px;"></div>
            </div>
            <button class="add-btn" onclick="addNews()">
                <i class="fas fa-plus"></i> Add News
            </button>
        </div>
        
        <div class="items-grid" id="newsList"></div>
    `;
    
    loadPaymentMethodsForNews();
    loadContactsForNews();
    renderNewsList();
}

function loadPaymentMethodsForNews() {
    const container = document.getElementById('newsPaymentMethods');
    if (!container) return;
    
    container.innerHTML = '';
    
    dashboardData.paymentMethods.forEach(payment => {
        const label = document.createElement('label');
        label.style.display = 'flex';
        label.style.alignItems = 'center';
        label.style.gap = '4px';
        label.style.padding = '6px';
        label.style.background = 'var(--dark-lighter)';
        label.style.borderRadius = '6px';
        label.style.cursor = 'pointer';
        label.style.fontSize = '12px';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = payment.id;
        checkbox.className = 'news-payment-checkbox';
        
        const span = document.createElement('span');
        span.textContent = payment.name;
        
        label.appendChild(checkbox);
        label.appendChild(span);
        container.appendChild(label);
    });
}

function loadContactsForNews() {
    const container = document.getElementById('newsContacts');
    if (!container) return;
    
    container.innerHTML = '';
    
    dashboardData.contacts?.forEach(contact => {
        const label = document.createElement('label');
        label.style.display = 'flex';
        label.style.alignItems = 'center';
        label.style.gap = '4px';
        label.style.padding = '6px';
        label.style.background = 'var(--dark-lighter)';
        label.style.borderRadius = '6px';
        label.style.cursor = 'pointer';
        label.style.fontSize = '12px';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = contact.id;
        checkbox.className = 'news-contact-checkbox';
        
        const span = document.createElement('span');
        span.textContent = contact.name;
        
        label.appendChild(checkbox);
        label.appendChild(span);
        container.appendChild(label);
    });
}

async function addNews() {
    const title = document.getElementById('newsTitle').value.trim();
    const content = document.getElementById('newsContent').value.trim();
    const imageFiles = document.getElementById('newsImages').files;
    const youtubeUrl = document.getElementById('newsYoutubeUrl').value.trim();
    
    const selectedPayments = Array.from(document.querySelectorAll('.news-payment-checkbox:checked'))
        .map(cb => parseInt(cb.value));
    
    const selectedContacts = Array.from(document.querySelectorAll('.news-contact-checkbox:checked'))
        .map(cb => parseInt(cb.value));
    
    if (!title || !content) {
        showAdminToast('Please fill required fields', 'warning');
        return;
    }
    
    try {
        showAdminLoading();
        
        let imageUrls = [];
        
        if (imageFiles.length > 0) {
            if (imageFiles.length > 10) {
                hideAdminLoading();
                showAdminToast('Maximum 10 images allowed', 'warning');
                return;
            }
            
            for (let file of imageFiles) {
                if (file.size > 5 * 1024 * 1024) {
                    hideAdminLoading();
                    showAdminToast('Each image must be less than 5MB', 'warning');
                    return;
                }
                
                const url = await uploadFile(file, 'news', 'images/');
                imageUrls.push(url);
            }
        }
        
        const { error } = await supabase
            .from('news')
            .insert([{
                title: title,
                description: content,
                images: imageUrls.length > 0 ? imageUrls : null,
                youtube_url: youtubeUrl || null,
                payment_method_ids: selectedPayments.length > 0 ? selectedPayments : null,
                contact_ids: selectedContacts.length > 0 ? selectedContacts : null,
                created_at: new Date().toISOString()
            }]);
        
        if (error) throw error;
        
        await loadNewsItems();
        
        // Clear form
        document.getElementById('newsTitle').value = '';
        document.getElementById('newsContent').value = '';
        document.getElementById('newsImages').value = '';
        document.getElementById('newsYoutubeUrl').value = '';
        document.querySelectorAll('.news-payment-checkbox').forEach(cb => cb.checked = false);
        document.querySelectorAll('.news-contact-checkbox').forEach(cb => cb.checked = false);
        
        hideAdminLoading();
        showAdminToast('News added successfully', 'success');
        
    } catch (error) {
        console.error('Error adding news:', error);
        hideAdminLoading();
        showAdminToast('Failed to add news', 'error');
    }
}

function renderNewsList() {
    const container = document.getElementById('newsList');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (dashboardData.news.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-newspaper"></i><h3>No News</h3><p>Add your first news article</p></div>';
        return;
    }
    
    dashboardData.news.forEach(news => {
        const card = document.createElement('div');
        card.className = 'item-card';
        card.innerHTML = `
            ${news.images && news.images.length > 0 ? `<img src="${news.images[0]}" alt="${news.title}">` : ''}
            <h4>${news.title}</h4>
            <p>${news.description.substring(0, 100)}...</p>
            <div class="item-actions">
                <button class="delete-btn" onclick="deleteNews(${news.id})">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        `;
        container.appendChild(card);
    });
}

async function deleteNews(id) {
    showConfirmDialog(
        'Delete News',
        'Are you sure you want to delete this news?',
        async () => {
            try {
                showAdminLoading();
                
                const news = dashboardData.news.find(n => n.id === id);
                if (news?.images) {
                    for (let imageUrl of news.images) {
                        await deleteFile(imageUrl, 'news');
                    }
                }
                
                const { error } = await supabase
                    .from('news')
                    .delete()
                    .eq('id', id);
                
                if (error) throw error;
                
                await loadNewsItems();
                
                hideAdminLoading();
                showAdminToast('News deleted successfully', 'success');
                
            } catch (error) {
                console.error('Error deleting news:', error);
                hideAdminLoading();
                showAdminToast('Failed to delete news', 'error');
            }
        }
    );
}

// ==================== CONTACTS MANAGEMENT ====================
async function loadContactsItems() {
    try {
        const { data, error } = await supabase
            .from('contacts')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        dashboardData.contacts = data || [];
        renderContactsManagement();
        
    } catch (error) {
        console.error('Error loading contacts:', error);
        showAdminToast('Failed to load contacts', 'error');
    }
}

function renderContactsManagement() {
    const container = document.getElementById('contactsContent');
    if (!container) return;
    
    container.innerHTML = `
        <div class="form-card">
            <h3>Add Contact</h3>
            <div class="form-row">
                <div class="form-group">
                    <label>Contact Name *</label>
                    <input type="text" id="contactName" placeholder="e.g., Facebook">
                </div>
                <div class="form-group">
                    <label>Contact Icon *</label>
                    <input type="file" id="contactIcon" accept="image/*">
                </div>
            </div>
            <div class="form-group">
                <label>Description</label>
                <textarea id="contactDescription" placeholder="Contact description"></textarea>
            </div>
            <div class="form-group">
                <label>Contact Address</label>
                <input type="text" id="contactAddress" placeholder="Address or phone number">
            </div>
            <div class="form-group">
                <label>Contact Link URL</label>
                <input type="url" id="contactLink" placeholder="https://...">
            </div>
            <button class="add-btn" onclick="addContact()">
                <i class="fas fa-plus"></i> Add Contact
            </button>
        </div>
        
        <div class="items-grid" id="contactsList"></div>
    `;
    
    renderContactsList();
}

async function addContact() {
    const name = document.getElementById('contactName').value.trim();
    const iconFile = document.getElementById('contactIcon').files[0];
    const description = document.getElementById('contactDescription').value.trim();
    const address = document.getElementById('contactAddress').value.trim();
    const linkUrl = document.getElementById('contactLink').value.trim();
    
    if (!name || !iconFile) {
        showAdminToast('Please fill required fields', 'warning');
        return;
    }
    
    try {
        showAdminLoading();
        
        const iconUrl = await uploadFile(iconFile, 'contacts', 'icons/');
        
        const { error } = await supabase
            .from('contacts')
            .insert([{
                name: name,
                icon_url: iconUrl,
                description: description || null,
                address: address || null,
                link_url: linkUrl || null,
                created_at: new Date().toISOString()
            }]);
        
        if (error) throw error;
        
        await loadContactsItems();
        
        // Clear form
        document.getElementById('contactName').value = '';
        document.getElementById('contactIcon').value = '';
        document.getElementById('contactDescription').value = '';
        document.getElementById('contactAddress').value = '';
        document.getElementById('contactLink').value = '';
        
        hideAdminLoading();
        showAdminToast('Contact added successfully', 'success');
        
    } catch (error) {
        console.error('Error adding contact:', error);
        hideAdminLoading();
        showAdminToast('Failed to add contact', 'error');
    }
}

function renderContactsList() {
    const container = document.getElementById('contactsList');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (!dashboardData.contacts || dashboardData.contacts.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-address-book"></i><h3>No Contacts</h3><p>Add your first contact</p></div>';
        return;
    }
    
    dashboardData.contacts.forEach(contact => {
        const card = document.createElement('div');
        card.className = 'item-card';
        card.innerHTML = `
            <img src="${contact.icon_url}" alt="${contact.name}">
            <h4>${contact.name}</h4>
            ${contact.description ? `<p>${contact.description}</p>` : ''}
            ${contact.link_url ? `<p><a href="${contact.link_url}" target="_blank" style="color: var(--primary);">View Link</a></p>` : ''}
            <div class="item-actions">
                <button class="delete-btn" onclick="deleteContact(${contact.id})">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        `;
        container.appendChild(card);
    });
}

async function deleteContact(id) {
    showConfirmDialog(
        'Delete Contact',
        'Are you sure you want to delete this contact?',
        async () => {
            try {
                showAdminLoading();
                
                const contact = dashboardData.contacts.find(c => c.id === id);
                if (contact?.icon_url) {
                    await deleteFile(contact.icon_url, 'contacts');
                }
                
                const { error } = await supabase
                    .from('contacts')
                    .delete()
                    .eq('id', id);
                
                if (error) throw error;
                
                await loadContactsItems();
                
                hideAdminLoading();
                showAdminToast('Contact deleted successfully', 'success');
                
            } catch (error) {
                console.error('Error deleting contact:', error);
                hideAdminLoading();
                showAdminToast('Failed to delete contact', 'error');
            }
        }
    );
}

// ==================== USERS MANAGEMENT ====================
async function loadUsers() {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        dashboardData.users = data || [];
        renderUsersManagement();
        
    } catch (error) {
        console.error('Error loading users:', error);
        showAdminToast('Failed to load users', 'error');
    }
}

function renderUsersManagement() {
    const container = document.getElementById('usersContent');
    if (!container) return;
    
    container.innerHTML = `
        <div class="data-table" id="usersTable"></div>
    `;
    
    renderUsersTable();
}

function renderUsersTable() {
    const container = document.getElementById('usersTable');
    if (!container) return;
    
    if (dashboardData.users.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-users"></i><h3>No Users</h3><p>No registered users yet</p></div>';
        return;
    }
    
    let html = `
        <table>
            <thead>
                <tr>
                    <th>User</th>
                    <th>Email</th>
                    <th>Total Orders</th>
                    <th>Joined Date</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    dashboardData.users.forEach(user => {
        html += `
            <tr>
                <td>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <img src="${user.avatar_url}" style="width: 40px; height: 40px; border-radius: 50%;">
                        <strong>${user.username}</strong>
                    </div>
                </td>
                <td>${user.email}</td>
                <td>${user.total_orders || 0}</td>
                <td>${formatTimestamp(user.created_at)}</td>
                <td>
                    <button class="delete-btn" onclick="blockUser(${user.id}, '${user.email}')">
                        <i class="fas fa-ban"></i> Block
                    </button>
                </td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

async function blockUser(userId, email) {
    showConfirmDialog(
        'Block User',
        `Are you sure you want to block this user? They will be logged out and cannot login again.`,
        async () => {
            try {
                showAdminLoading();
                
                const user = dashboardData.users.find(u => u.id === userId);
                
                // Add to blocked accounts
                const { error: blockError } = await supabase
                    .from('blocked_accounts')
                    .insert([{
                        user_id: userId,
                        username: user.username,
                        email: user.email,
                        blocked_at: new Date().toISOString()
                    }]);
                
                if (blockError) throw blockError;
                
                // Delete user
                const { error: deleteError } = await supabase
                    .from('users')
                    .delete()
                    .eq('id', userId);
                
                if (deleteError) throw deleteError;
                
                await loadUsers();
                
                hideAdminLoading();
                showAdminToast('User blocked successfully', 'success');
                
            } catch (error) {
                console.error('Error blocking user:', error);
                hideAdminLoading();
                showAdminToast('Failed to block user', 'error');
            }
        }
    );
}
