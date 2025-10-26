// ==================== SUPABASE CONFIGURATION ====================
const SUPABASE_URL = 'https://tyhnhbmiduuaomtkkpik.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5aG5oYm1pZHV1YW9tdGtrcGlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0MjUxMDIsImV4cCI6MjA3NzAwMTEwMn0.oOiNrR6devWKlNlyb4H8mcvUfVYCgDR4st_LxagzQ0s';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ==================== GLOBAL VARIABLES ====================
let adminAuthenticated = false;
let currentSection = 'overview';
let dashboardData = {
    categories: [],
    categoryCards: [],
    products: [],
    orders: [],
    users: [],
    paymentMethods: [],
    coupons: [],
    news: [],
    contacts: []
};

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', async () => {
    await getUserIP();
    checkAdminAuth();
});

// ==================== GET USER IP ====================
async function getUserIP() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        document.getElementById('userIP').textContent = data.ip;
        localStorage.setItem('userIP', data.ip);
    } catch (error) {
        console.error('Error getting IP:', error);
        document.getElementById('userIP').textContent = 'Unknown';
    }
}

// ==================== ADMIN AUTHENTICATION ====================
function checkAdminAuth() {
    const adminSession = localStorage.getItem('adminSession');
    const savedIP = localStorage.getItem('adminIP');
    const currentIP = localStorage.getItem('userIP');
    
    if (adminSession && savedIP === currentIP) {
        adminAuthenticated = true;
        showDashboard();
    }
}

async function handleAdminLogin() {
    const password = document.getElementById('adminPassword').value;
    const currentIP = localStorage.getItem('userIP');
    
    if (!password) {
        showAdminToast('Please enter password', 'error');
        return;
    }
    
    showAdminLoading();
    
    try {
        // Check admin credentials from database
        const { data, error } = await supabase
            .from('admin_credentials')
            .select('*')
            .eq('password', password)
            .single();
        
        if (error || !data) {
            hideAdminLoading();
            showAdminToast('Invalid admin password', 'error');
            return;
        }
        
        // Check if IP is allowed
        if (data.allowed_ips && data.allowed_ips.length > 0) {
            if (!data.allowed_ips.includes(currentIP)) {
                hideAdminLoading();
                showAdminToast('Access denied from this IP address', 'error');
                return;
            }
        }
        
        // Store admin session
        localStorage.setItem('adminSession', 'true');
        localStorage.setItem('adminIP', currentIP);
        
        // Update last login
        await supabase
            .from('admin_credentials')
            .update({ 
                last_login: new Date().toISOString(),
                last_ip: currentIP
            })
            .eq('id', data.id);
        
        adminAuthenticated = true;
        
        hideAdminLoading();
        document.getElementById('adminLoginScreen').style.display = 'none';
        
        await showDashboard();
        
    } catch (error) {
        console.error('Login error:', error);
        hideAdminLoading();
        showAdminToast('Login failed', 'error');
    }
}

async function showDashboard() {
    showAdminLoading();
    
    document.getElementById('adminLoginScreen').style.display = 'none';
    document.getElementById('adminDashboard').style.display = 'flex';
    
    await loadDashboardData();
    await loadOverviewStats();
    
    hideAdminLoading();
}

function handleAdminLogout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('adminSession');
        localStorage.removeItem('adminIP');
        location.reload();
    }
}

// ==================== LOADING ====================
function showAdminLoading() {
    document.getElementById('adminLoading').classList.remove('hidden');
}

function hideAdminLoading() {
    document.getElementById('adminLoading').classList.add('hidden');
}

// ==================== TOAST NOTIFICATIONS ====================
function showAdminToast(message, type = 'info') {
    const toast = document.getElementById('adminToast');
    toast.textContent = message;
    toast.className = 'admin-toast show';
    
    if (type) {
        toast.classList.add(type);
    }
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// ==================== SECTION NAVIGATION ====================
function showSection(sectionName) {
    // Update nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.closest('.nav-btn').classList.add('active');
    
    // Update sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    const sectionId = sectionName + 'Section';
    const section = document.getElementById(sectionId);
    if (section) {
        section.classList.add('active');
        currentSection = sectionName;
        
        // Load section specific data
        loadSectionData(sectionName);
    }
}

async function loadSectionData(sectionName) {
    switch(sectionName) {
        case 'overview':
            await loadOverviewStats();
            break;
        case 'categories':
            await loadCategories();
            break;
        case 'categoryCards':
            await loadCategoryCards();
            break;
        case 'products':
            await loadProducts();
            break;
        case 'orders':
            await loadOrders();
            break;
        case 'users':
            await loadUsers();
            break;
        case 'payments':
            await loadPaymentMethods();
            break;
        case 'coupons':
            await loadCoupons();
            break;
        case 'news':
            await loadNewsItems();
            break;
        case 'contacts':
            await loadContactsItems();
            break;
    }
}

// ==================== LOAD DASHBOARD DATA ====================
async function loadDashboardData() {
    try {
        const [categories, categoryCards, products, orders, users, payments] = await Promise.all([
            supabase.from('categories').select('*'),
            supabase.from('category_cards').select('*'),
            supabase.from('products').select('*'),
            supabase.from('orders').select('*'),
            supabase.from('users').select('*'),
            supabase.from('payment_methods').select('*')
        ]);
        
        dashboardData.categories = categories.data || [];
        dashboardData.categoryCards = categoryCards.data || [];
        dashboardData.products = products.data || [];
        dashboardData.orders = orders.data || [];
        dashboardData.users = users.data || [];
        dashboardData.paymentMethods = payments.data || [];
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

// ==================== OVERVIEW STATS ====================
async function loadOverviewStats() {
    try {
        const orders = dashboardData.orders;
        const users = dashboardData.users;
        const products = dashboardData.products;
        
        // Calculate stats
        const totalOrders = orders.length;
        const approvedOrders = orders.filter(o => o.status === 'approved').length;
        const pendingOrders = orders.filter(o => o.status === 'pending').length;
        const rejectedOrders = orders.filter(o => o.status === 'rejected').length;
        
        const totalRevenue = orders
            .filter(o => o.status === 'approved')
            .reduce((sum, o) => sum + (o.final_price || 0), 0);
        
        const today = new Date().toISOString().split('T')[0];
        const todayRevenue = orders
            .filter(o => o.status === 'approved' && o.created_at.startsWith(today))
            .reduce((sum, o) => sum + (o.final_price || 0), 0);
        
        // Update UI
        document.getElementById('totalOrders').textContent = totalOrders;
        document.getElementById('approvedOrders').textContent = approvedOrders;
        document.getElementById('pendingOrders').textContent = pendingOrders;
        document.getElementById('rejectedOrders').textContent = rejectedOrders;
        document.getElementById('totalUsers').textContent = users.length;
        document.getElementById('totalProducts').textContent = products.length;
        document.getElementById('totalRevenue').textContent = formatCurrency(totalRevenue) + ' Ks';
        document.getElementById('todayRevenue').textContent = formatCurrency(todayRevenue) + ' Ks';
        document.getElementById('pendingOrdersBadge').textContent = pendingOrders;
        
        // Load recent orders
        loadRecentOrders();
        
        // Load top products
        loadTopProducts();
        
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

function loadRecentOrders() {
    const container = document.getElementById('recentOrdersList');
    if (!container) return;
    
    container.innerHTML = '';
    
    const recentOrders = dashboardData.orders
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 10);
    
    if (recentOrders.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 20px;">No orders yet</p>';
        return;
    }
    
    recentOrders.forEach(order => {
        const item = document.createElement('div');
        item.className = 'order-item-mini';
        item.innerHTML = `
            <img src="${order.product_icon}" alt="${order.product_name}">
            <div class="order-item-info">
                <h4>#${order.order_id}</h4>
                <p>${order.product_name}</p>
            </div>
            <span class="order-item-status ${order.status}">${order.status}</span>
        `;
        item.addEventListener('click', () => viewOrderDetail(order));
        container.appendChild(item);
    });
}

function loadTopProducts() {
    const container = document.getElementById('topProductsList');
    if (!container) return;
    
    container.innerHTML = '';
    
    // Calculate product sales
    const productSales = {};
    dashboardData.orders
        .filter(o => o.status === 'approved')
        .forEach(order => {
            if (!productSales[order.product_id]) {
                productSales[order.product_id] = {
                    count: 0,
                    product: dashboardData.products.find(p => p.id === order.product_id)
                };
            }
            productSales[order.product_id].count++;
        });
    
    const topProducts = Object.values(productSales)
        .filter(p => p.product)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
    
    if (topProducts.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 20px;">No sales data yet</p>';
        return;
    }
    
    topProducts.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'product-rank-item';
        div.innerHTML = `
            <div class="rank-number">${index + 1}</div>
            <img src="${item.product.icon_url}" alt="${item.product.name}">
            <div class="product-rank-info">
                <h4>${item.product.name}</h4>
                <p>${formatCurrency(item.product.price)} Ks</p>
            </div>
            <div class="product-sales-count">${item.count} sold</div>
        `;
        container.appendChild(div);
    });
}

// ==================== REFRESH DASHBOARD ====================
async function refreshDashboard() {
    showAdminLoading();
    await loadDashboardData();
    await loadSectionData(currentSection);
    hideAdminLoading();
    showAdminToast('Dashboard refreshed', 'success');
}

// ==================== UTILITIES ====================
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

function formatTimestamp(timestamp) {
    return new Date(timestamp).toLocaleString();
}

// ==================== CONFIRM DIALOG ====================
function showConfirmDialog(title, message, onConfirm) {
    const dialog = document.getElementById('confirmDialog');
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMessage').textContent = message;
    
    const confirmBtn = document.getElementById('confirmBtn');
    confirmBtn.onclick = () => {
        onConfirm();
        closeConfirmDialog();
    };
    
    dialog.classList.add('active');
}

function closeConfirmDialog() {
    document.getElementById('confirmDialog').classList.remove('active');
}

// ==================== FILE UPLOAD HELPERS ====================
async function uploadFile(file, bucket, folder = '') {
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${folder}${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { data, error } = await supabase.storage
            .from(bucket)
            .upload(fileName, file);
        
        if (error) throw error;
        
        const { data: { publicUrl } } = supabase.storage
            .from(bucket)
            .getPublicUrl(fileName);
        
        return publicUrl;
        
    } catch (error) {
        console.error('Upload error:', error);
        throw error;
    }
}

async function deleteFile(url, bucket) {
    try {
        const fileName = url.split('/').pop();
        await supabase.storage.from(bucket).remove([fileName]);
    } catch (error) {
        console.error('Delete file error:', error);
    }
}

console.log('🔐 Admin Dashboard Loaded');

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

// ==================== PRODUCTS MANAGEMENT ====================
async function loadProducts() {
    try {
        const { data, error } = await supabase
            .from('products')
            .select('*, category_cards(name)')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        dashboardData.products = data || [];
        renderProductForm();
        renderProducts();
        
    } catch (error) {
        console.error('Error loading products:', error);
        showAdminToast('Failed to load products', 'error');
    }
}

function renderProductForm() {
    const container = document.getElementById('productForm');
    if (!container) return;
    
    container.innerHTML = `
        <h3>Add Product</h3>
        <div class="form-row">
            <div class="form-group">
                <label>Select Category</label>
                <select id="productCategory" onchange="loadCategoryCardsForProduct()">
                    <option value="">Select Category</option>
                </select>
            </div>
            <div class="form-group">
                <label>Select Category Card</label>
                <select id="productCategoryCard">
                    <option value="">Select Category Card</option>
                </select>
            </div>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>Product Name *</label>
                <input type="text" id="productName" placeholder="Enter product name">
            </div>
            <div class="form-group">
                <label>Product Icon *</label>
                <input type="file" id="productIcon" accept="image/*">
            </div>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>Price (Ks) *</label>
                <input type="number" id="productPrice" placeholder="Enter price" min="0">
            </div>
            <div class="form-group">
                <label>Discount Percentage</label>
                <input type="number" id="productDiscount" placeholder="e.g., 10" min="0" max="100">
            </div>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>Product Type</label>
                <input type="text" id="productType" placeholder="e.g., Game Account">
            </div>
            <div class="form-group">
                <label>Type Badge Color</label>
                <input type="color" id="productTypeColor" value="#6366f1">
            </div>
        </div>
        <div class="form-group">
            <label>Amount/Quantity</label>
            <input type="text" id="productAmount" placeholder="e.g., 1000 Diamonds">
        </div>
        <div class="form-group">
            <label>Description</label>
            <textarea id="productDescription" placeholder="Product description (optional)"></textarea>
        </div>
        <div class="form-group">
            <label>Payment Methods *</label>
            <div id="productPaymentMethods" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; margin-top: 8px;"></div>
        </div>
        <button class="add-btn" onclick="addProduct()">
            <i class="fas fa-plus"></i> Add Product
        </button>
    `;
    
    populateCategorySelects();
    loadPaymentMethodsForProduct();
}

async function loadCategoryCardsForProduct() {
    const categoryId = document.getElementById('productCategory').value;
    const select = document.getElementById('productCategoryCard');
    
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

async function loadPaymentMethodsForProduct() {
    const container = document.getElementById('productPaymentMethods');
    if (!container) return;
    
    container.innerHTML = '';
    
    dashboardData.paymentMethods.forEach(payment => {
        const label = document.createElement('label');
        label.style.display = 'flex';
        label.style.alignItems = 'center';
        label.style.gap = '8px';
        label.style.padding = '12px';
        label.style.background = 'var(--dark-lighter)';
        label.style.borderRadius = '8px';
        label.style.cursor = 'pointer';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = payment.id;
        checkbox.className = 'product-payment-checkbox';
        
        const img = document.createElement('img');
        img.src = payment.icon_url;
        img.style.width = '24px';
        img.style.height = '24px';
        
        const span = document.createElement('span');
        span.textContent = payment.name;
        span.style.fontSize = '13px';
        
        label.appendChild(checkbox);
        label.appendChild(img);
        label.appendChild(span);
        
        container.appendChild(label);
    });
    
    // Add "Select All" button
    const selectAllBtn = document.createElement('button');
    selectAllBtn.textContent = 'Select All';
    selectAllBtn.className = 'quick-action-btn';
    selectAllBtn.style.gridColumn = '1 / -1';
    selectAllBtn.onclick = (e) => {
        e.preventDefault();
        document.querySelectorAll('.product-payment-checkbox').forEach(cb => cb.checked = true);
    };
    container.appendChild(selectAllBtn);
}

async function addProduct() {
    const categoryCardId = document.getElementById('productCategoryCard').value;
    const name = document.getElementById('productName').value.trim();
    const iconFile = document.getElementById('productIcon').files[0];
    const price = document.getElementById('productPrice').value;
    const discount = document.getElementById('productDiscount').value;
    const productType = document.getElementById('productType').value.trim();
    const typeColor = document.getElementById('productTypeColor').value;
    const amount = document.getElementById('productAmount').value.trim();
    const description = document.getElementById('productDescription').value.trim();
    
    const selectedPayments = Array.from(document.querySelectorAll('.product-payment-checkbox:checked'))
        .map(cb => parseInt(cb.value));
    
    if (!categoryCardId || !name || !iconFile || !price || selectedPayments.length === 0) {
        showAdminToast('Please fill all required fields', 'warning');
        return;
    }
    
    try {
        showAdminLoading();
        
        const iconUrl = await uploadFile(iconFile, 'products', 'icons/');
        
        const { data, error } = await supabase
            .from('products')
            .insert([{
                category_card_id: parseInt(categoryCardId),
                name: name,
                icon_url: iconUrl,
                price: parseFloat(price),
                discount_percentage: discount ? parseInt(discount) : 0,
                product_type: productType || null,
                type_color: typeColor || '#6366f1',
                amount: amount || null,
                description: description || null,
                payment_method_ids: selectedPayments,
                created_at: new Date().toISOString()
            }])
            .select()
            .single();
        
        if (error) throw error;
        
        await loadProducts();
        
        // Clear form
        document.getElementById('productCategoryCard').value = '';
        document.getElementById('productName').value = '';
        document.getElementById('productIcon').value = '';
        document.getElementById('productPrice').value = '';
        document.getElementById('productDiscount').value = '';
        document.getElementById('productType').value = '';
        document.getElementById('productAmount').value = '';
        document.getElementById('productDescription').value = '';
        document.querySelectorAll('.product-payment-checkbox').forEach(cb => cb.checked = false);
        
        hideAdminLoading();
        showAdminToast('Product added successfully', 'success');
        
    } catch (error) {
        console.error('Error adding product:', error);
        hideAdminLoading();
        showAdminToast('Failed to add product', 'error');
    }
}

function renderProducts() {
    const container = document.getElementById('productsList');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (dashboardData.products.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-box"></i><h3>No Products</h3><p>Add your first product</p></div>';
        return;
    }
    
    dashboardData.products.forEach(product => {
        const card = document.createElement('div');
        card.className = 'item-card';
        
        const finalPrice = product.discount_percentage > 0 
            ? product.price - (product.price * product.discount_percentage / 100)
            : product.price;
        
        card.innerHTML = `
            <img src="${product.icon_url}" alt="${product.name}">
            ${product.product_type ? `<span class="badge" style="background: ${product.type_color}">${product.product_type}</span>` : ''}
            <h4>${product.name}</h4>
            <p>Card: ${product.category_cards?.name || 'N/A'}</p>
            ${product.amount ? `<p>Amount: ${product.amount}</p>` : ''}
            <p>Price: ${formatCurrency(product.price)} Ks</p>
            ${product.discount_percentage > 0 ? `<p style="color: var(--success);">Final: ${formatCurrency(finalPrice)} Ks (-${product.discount_percentage}%)</p>` : ''}
            <div class="item-actions">
                <button class="edit-btn" onclick="editProduct(${product.id})">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="delete-btn" onclick="deleteProduct(${product.id})">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        `;
        container.appendChild(card);
    });
}

async function editProduct(id) {
    showAdminToast('Edit product functionality - to be implemented', 'info');
}

async function deleteProduct(id) {
    showConfirmDialog(
        'Delete Product',
        'Are you sure you want to delete this product?',
        async () => {
            try {
                showAdminLoading();
                
                const product = dashboardData.products.find(p => p.id === id);
                if (product?.icon_url) {
                    await deleteFile(product.icon_url, 'products');
                }
                
                const { error } = await supabase
                    .from('products')
                    .delete()
                    .eq('id', id);
                
                if (error) throw error;
                
                await loadProducts();
                
                hideAdminLoading();
                showAdminToast('Product deleted successfully', 'success');
                
            } catch (error) {
                console.error('Error deleting product:', error);
                hideAdminLoading();
                showAdminToast('Failed to delete product', 'error');
            }
        }
    );
}

// ==================== PAYMENT METHODS ====================
async function loadPaymentMethods() {
    try {
        const { data, error } = await supabase
            .from('payment_methods')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        dashboardData.paymentMethods = data || [];
        renderPaymentMethods();
        
    } catch (error) {
        console.error('Error loading payment methods:', error);
        showAdminToast('Failed to load payment methods', 'error');
    }
}

function renderPaymentMethods() {
    const container = document.getElementById('paymentsContent');
    if (!container) return;
    
    container.innerHTML = `
        <div class="form-card">
            <h3>Add Payment Method</h3>
            <div class="form-row">
                <div class="form-group">
                    <label>Payment Name *</label>
                    <input type="text" id="paymentName" placeholder="e.g., KBZ Pay">
                </div>
                <div class="form-group">
                    <label>Payment Icon *</label>
                    <input type="file" id="paymentIcon" accept="image/*">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Account Name *</label>
                    <input type="text" id="paymentAccountName" placeholder="Enter account name">
                </div>
                <div class="form-group">
                    <label>Account Number/Address *</label>
                    <input type="text" id="paymentAccountNumber" placeholder="Enter account number">
                </div>
            </div>
            <div class="form-group">
                <label>Payment Instructions</label>
                <textarea id="paymentInstructions" placeholder="Enter instructions for users"></textarea>
            </div>
            <button class="add-btn" onclick="addPaymentMethod()">
                <i class="fas fa-plus"></i> Add Payment Method
            </button>
        </div>
        
        <div class="items-grid" id="paymentMethodsList"></div>
    `;
    
    renderPaymentMethodsList();
}

function renderPaymentMethodsList() {
    const container = document.getElementById('paymentMethodsList');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (dashboardData.paymentMethods.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-credit-card"></i><h3>No Payment Methods</h3><p>Add your first payment method</p></div>';
        return;
    }
    
    dashboardData.paymentMethods.forEach(payment => {
        const card = document.createElement('div');
        card.className = 'item-card';
        card.innerHTML = `
            <img src="${payment.icon_url}" alt="${payment.name}">
            <h4>${payment.name}</h4>
            <p>Account: ${payment.account_name}</p>
            <p>Number: ${payment.account_number}</p>
            <div class="item-actions">
                <button class="edit-btn" onclick="editPaymentMethod(${payment.id})">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="delete-btn" onclick="deletePaymentMethod(${payment.id})">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        `;
        container.appendChild(card);
    });
}

async function addPaymentMethod() {
    const name = document.getElementById('paymentName').value.trim();
    const iconFile = document.getElementById('paymentIcon').files[0];
    const accountName = document.getElementById('paymentAccountName').value.trim();
    const accountNumber = document.getElementById('paymentAccountNumber').value.trim();
    const instructions = document.getElementById('paymentInstructions').value.trim();
    
    if (!name || !iconFile || !accountName || !accountNumber) {
        showAdminToast('Please fill all required fields', 'warning');
        return;
    }
    
    try {
        showAdminLoading();
        
        const iconUrl = await uploadFile(iconFile, 'payments', 'icons/');
        
        const { error } = await supabase
            .from('payment_methods')
            .insert([{
                name: name,
                icon_url: iconUrl,
                account_name: accountName,
                account_number: accountNumber,
                instructions: instructions || null,
                created_at: new Date().toISOString()
            }]);
        
        if (error) throw error;
        
        await loadPaymentMethods();
        
        // Clear form
        document.getElementById('paymentName').value = '';
        document.getElementById('paymentIcon').value = '';
        document.getElementById('paymentAccountName').value = '';
        document.getElementById('paymentAccountNumber').value = '';
        document.getElementById('paymentInstructions').value = '';
        
        hideAdminLoading();
        showAdminToast('Payment method added successfully', 'success');
        
    } catch (error) {
        console.error('Error adding payment method:', error);
        hideAdminLoading();
        showAdminToast('Failed to add payment method', 'error');
    }
}

async function editPaymentMethod(id) {
    showAdminToast('Edit payment method - to be implemented', 'info');
}

async function deletePaymentMethod(id) {
    showConfirmDialog(
        'Delete Payment Method',
        'Are you sure you want to delete this payment method?',
        async () => {
            try {
                showAdminLoading();
                
                const payment = dashboardData.paymentMethods.find(p => p.id === id);
                if (payment?.icon_url) {
                    await deleteFile(payment.icon_url, 'payments');
                }
                
                const { error } = await supabase
                    .from('payment_methods')
                    .delete()
                    .eq('id', id);
                
                if (error) throw error;
                
                await loadPaymentMethods();
                
                hideAdminLoading();
                showAdminToast('Payment method deleted successfully', 'success');
                
            } catch (error) {
                console.error('Error deleting payment method:', error);
                hideAdminLoading();
                showAdminToast('Failed to delete payment method', 'error');
            }
        }
    );
}

// ==================== ORDERS MANAGEMENT ====================
async function loadOrders() {
    try {
        const { data, error } = await supabase
            .from('orders')
            .select('*, users(username, email, avatar_url)')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        dashboardData.orders = data || [];
        renderOrdersManagement();
        
    } catch (error) {
        console.error('Error loading orders:', error);
        showAdminToast('Failed to load orders', 'error');
    }
}

function renderOrdersManagement() {
    const container = document.getElementById('ordersContent');
    if (!container) return;
    
    container.innerHTML = `
        <div class="filter-bar">
            <select id="orderStatusFilter" onchange="filterOrders()">
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
            </select>
            <input type="date" id="orderDateFilter" onchange="filterOrders()">
            <button class="filter-apply-btn" onclick="filterOrders()">
                <i class="fas fa-filter"></i> Apply Filter
            </button>
        </div>
        
        <div class="data-table" id="ordersTable"></div>
    `;
    
    renderOrdersTable(dashboardData.orders);
}

function renderOrdersTable(orders) {
    const container = document.getElementById('ordersTable');
    if (!container) return;
    
    if (orders.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-shopping-cart"></i><h3>No Orders</h3><p>No orders to display</p></div>';
        return;
    }
    
    let html = `
        <table>
            <thead>
                <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Product</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    orders.forEach(order => {
        html += `
            <tr>
                <td><strong>#${order.order_id}</strong></td>
                <td>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <img src="${order.users?.avatar_url || ''}" style="width: 32px; height: 32px; border-radius: 50%;">
                        <div>
                            <div>${order.users?.username || 'N/A'}</div>
                            <small style="color: var(--text-muted);">${order.users?.email || ''}</small>
                        </div>
                    </div>
                </td>
                <td>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <img src="${order.product_icon}" style="width: 32px; height: 32px; border-radius: 4px;">
                        ${order.product_name}
                    </div>
                </td>
                <td><strong>${formatCurrency(order.final_price)} Ks</strong></td>
                <td><span class="badge badge-${order.status === 'pending' ? 'warning' : order.status === 'approved' ? 'success' : 'danger'}">${order.status.toUpperCase()}</span></td>
                <td>${formatTimestamp(order.created_at)}</td>
                <td>
                    <button class="icon-btn" onclick="viewOrderDetail(${order.id})" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                    ${order.status === 'pending' ? `
                        <button class="icon-btn" onclick="approveOrder(${order.id})" title="Approve" style="color: var(--success);">
                            <i class="fas fa-check"></i>
                        </button>
                        <button class="icon-btn" onclick="rejectOrder(${order.id})" title="Reject" style="color: var(--danger);">
                            <i class="fas fa-times"></i>
                        </button>
                    ` : ''}
                </td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

function filterOrders() {
    const statusFilter = document.getElementById('orderStatusFilter').value;
    const dateFilter = document.getElementById('orderDateFilter').value;
    
    let filtered = [...dashboardData.orders];
    
    if (statusFilter) {
        filtered = filtered.filter(o => o.status === statusFilter);
    }
    
    if (dateFilter) {
        filtered = filtered.filter(o => o.created_at.startsWith(dateFilter));
    }
    
    renderOrdersTable(filtered);
}

function viewOrderDetail(orderId) {
    const order = dashboardData.orders.find(o => o.id === orderId);
    if (!order) return;
    
    const modal = document.createElement('div');
    modal.className = 'admin-modal active';
    modal.innerHTML = `
        <div class="modal-dialog">
            <div class="modal-header">
                <h3>Order Details - #${order.order_id}</h3>
                <button class="modal-close" onclick="this.closest('.admin-modal').remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label>Customer Information</label>
                    <div style="display: flex; align-items: center; gap: 12px; padding: 16px; background: var(--dark-lighter); border-radius: 8px;">
                        <img src="${order.users?.avatar_url}" style="width: 48px; height: 48px; border-radius: 50%;">
                        <div>
                            <strong>${order.users?.username}</strong><br>
                            <small style="color: var(--text-muted);">${order.users?.email}</small>
                        </div>
                    </div>
                </div>
                
                <div class="form-group">
                    <label>Product Information</label>
                    <div style="display: flex; align-items: center; gap: 12px; padding: 16px; background: var(--dark-lighter); border-radius: 8px;">
                        <img src="${order.product_icon}" style="width: 48px; height: 48px; border-radius: 8px;">
                        <div>
                            <strong>${order.product_name}</strong><br>
                            <small style="color: var(--text-muted);">${order.amount || 'N/A'}</small>
                        </div>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label>Original Price</label>
                        <input type="text" value="${formatCurrency(order.original_price)} Ks" readonly>
                    </div>
                    <div class="form-group">
                        <label>Discount</label>
                        <input type="text" value="${order.discount_percentage}%" readonly>
                    </div>
                </div>
                
                ${order.coupon_code ? `
                <div class="form-group">
                    <label>Coupon Applied</label>
                    <input type="text" value="${order.coupon_code} (-${order.coupon_discount}%)" readonly>
                </div>
                ` : ''}
                
                <div class="form-group">
                    <label>Final Price</label>
                    <input type="text" value="${formatCurrency(order.final_price)} Ks" readonly style="font-weight: 700; color: var(--success);">
                </div>
                
                <div class="form-group">
                    <label>Payment Method</label>
                    <div style="display: flex; align-items: center; gap: 8px; padding: 12px; background: var(--dark-lighter); border-radius: 8px;">
                        <img src="${order.payment_method_icon}" style="width: 24px; height: 24px;">
                        <span>${order.payment_method_name}</span>
                    </div>
                </div>
                
                <div class="form-group">
                    <label>Payment Proof</label>
                    <img src="${order.payment_proof_url}" style="width: 100%; max-width: 400px; border-radius: 8px; cursor: pointer;" onclick="window.open('${order.payment_proof_url}', '_blank')">
                </div>
                
                ${order.input_data && Object.keys(order.input_data).length > 0 ? `
                <div class="form-group">
                    <label>Customer Input Data</label>
                    <div style="background: var(--dark-lighter); padding: 16px; border-radius: 8px;">
                        ${Object.entries(order.input_data).map(([key, value]) => `
                            <div style="margin-bottom: 8px;">
                                <strong>${key}:</strong> ${value}
                            </div>
                        `).join('')}
                    </div>
                </div>
                ` : ''}
                
                <div class="form-group">
                    <label>Order Status</label>
                    <span class="badge badge-${order.status === 'pending' ? 'warning' : order.status === 'approved' ? 'success' : 'danger'}" style="font-size: 16px; padding: 8px 16px;">
                        ${order.status.toUpperCase()}
                    </span>
                </div>
                
                ${order.status === 'pending' ? `
                <div class="form-group">
                    <label>Admin Message (Optional)</label>
                    <textarea id="orderAdminMessage" placeholder="Enter message for customer"></textarea>
                </div>
                ` : ''}
                
                ${order.admin_message ? `
                <div class="form-group">
                    <label>Admin Message</label>
                    <div style="background: rgba(99, 102, 241, 0.1); padding: 16px; border-radius: 8px; border-left: 4px solid var(--primary);">
                        ${order.admin_message}
                    </div>
                </div>
                ` : ''}
            </div>
            ${order.status === 'pending' ? `
            <div class="modal-footer">
                <button class="delete-btn" onclick="rejectOrderFromModal(${order.id})">
                    <i class="fas fa-times"></i> Reject Order
                </button>
                <button class="save-btn" onclick="approveOrderFromModal(${order.id})">
                    <i class="fas fa-check"></i> Approve Order
                </button>
            </div>
            ` : ''}
        </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

async function approveOrder(orderId) {
    showConfirmDialog(
        'Approve Order',
        'Are you sure you want to approve this order?',
        () => approveOrderFromModal(orderId)
    );
}

async function approveOrderFromModal(orderId) {
    try {
        showAdminLoading();
        
        const message = document.getElementById('orderAdminMessage')?.value.trim() || null;
        
        const { error } = await supabase
            .from('orders')
            .update({
                status: 'approved',
                approved_at: new Date().toISOString(),
                admin_message: message
            })
            .eq('id', orderId);
        
        if (error) throw error;
        
        // Update category card sales count
        const order = dashboardData.orders.find(o => o.id === orderId);
        if (order) {
            await updateCategoryCardSales(order.category_card_id);
        }
        
        await loadOrders();
        
        document.querySelector('.admin-modal')?.remove();
        
        hideAdminLoading();
        showAdminToast('Order approved successfully', 'success');
        
    } catch (error) {
        console.error('Error approving order:', error);
        hideAdminLoading();
        showAdminToast('Failed to approve order', 'error');
    }
}

async function rejectOrder(orderId) {
    showConfirmDialog(
        'Reject Order',
        'Are you sure you want to reject this order?',
        () => rejectOrderFromModal(orderId)
    );
}

async function rejectOrderFromModal(orderId) {
    try {
        showAdminLoading();
        
        const message = document.getElementById('orderAdminMessage')?.value.trim() || 'Your order has been rejected.';
        
        const { error } = await supabase
            .from('orders')
            .update({
                status: 'rejected',
                admin_message: message
            })
            .eq('id', orderId);
        
        if (error) throw error;
        
        await loadOrders();
        
        document.querySelector('.admin-modal')?.remove();
        
        hideAdminLoading();
        showAdminToast('Order rejected', 'success');
        
    } catch (error) {
        console.error('Error rejecting order:', error);
        hideAdminLoading();
        showAdminToast('Failed to reject order', 'error');
    }
}

async function updateCategoryCardSales(categoryCardId) {
    try {
        const { data, error } = await supabase
            .from('orders')
            .select('id')
            .eq('category_card_id', categoryCardId)
            .eq('status', 'approved');
        
        if (error) throw error;
        
        const totalSales = data?.length || 0;
        
        await supabase
            .from('category_cards')
            .update({ total_sales: totalSales })
            .eq('id', categoryCardId);
        
    } catch (error) {
        console.error('Error updating sales:', error);
    }
}

// ==================== COUPONS MANAGEMENT ====================
async function loadCoupons() {
    try {
        const { data, error } = await supabase
            .from('coupons')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        dashboardData.coupons = data || [];
        renderCouponsManagement();
        
    } catch (error) {
        console.error('Error loading coupons:', error);
        showAdminToast('Failed to load coupons', 'error');
    }
}

function renderCouponsManagement() {
    const container = document.getElementById('couponsContent');
    if (!container) return;
    
    container.innerHTML = `
        <div class="form-card">
            <h3>Create Coupon</h3>
            <div class="form-row">
                <div class="form-group">
                    <label>Coupon Code</label>
                    <div style="display: flex; gap: 8px;">
                        <input type="text" id="couponCode" placeholder="Enter code or generate">
                        <button class="quick-action-btn" onclick="generateCouponCode()">
                            <i class="fas fa-random"></i> Generate
                        </button>
                    </div>
                </div>
                <div class="form-group">
                    <label>Discount Percentage *</label>
                    <input type="number" id="couponDiscount" placeholder="e.g., 10" min="1" max="100">
                </div>
            </div>
            
            <div class="form-group">
                <label>Coupon Type</label>
                <select id="couponType" onchange="toggleCouponOptions()">
                    <option value="all">All Users & All Products</option>
                    <option value="specific_users">Specific Users</option>
                    <option value="specific_products">Specific Products</option>
                    <option value="both">Specific Users & Products</option>
                </select>
            </div>
            
            <div class="form-group" id="couponUsersSection" style="display: none;">
                <label>Select Users</label>
                <div id="couponUsersList" style="max-height: 200px; overflow-y: auto; border: 1px solid var(--border); border-radius: 8px; padding: 12px;"></div>
            </div>
            
            <div class="form-group" id="couponProductsSection" style="display: none;">
                <label>Select Products</label>
                <div id="couponProductsList" style="max-height: 200px; overflow-y: auto; border: 1px solid var(--border); border-radius: 8px; padding: 12px;"></div>
            </div>
            
            <button class="add-btn" onclick="createCoupon()">
                <i class="fas fa-plus"></i> Create Coupon
            </button>
        </div>
        
        <div class="items-grid" id="couponsList"></div>
    `;
    
    renderCouponsList();
    loadUsersForCoupon();
    loadProductsForCoupon();
}

function generateCouponCode() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    document.getElementById('couponCode').value = code;
}

function toggleCouponOptions() {
    const type = document.getElementById('couponType').value;
    
    const usersSection = document.getElementById('couponUsersSection');
    const productsSection = document.getElementById('couponProductsSection');
    
    usersSection.style.display = (type === 'specific_users' || type === 'both') ? 'block' : 'none';
    productsSection.style.display = (type === 'specific_products' || type === 'both') ? 'block' : 'none';
}

function loadUsersForCoupon() {
    const container = document.getElementById('couponUsersList');
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
        checkbox.className = 'coupon-user-checkbox';
        
        const avatar = document.createElement('img');
        avatar.src = user.avatar_url;
        avatar.style.width = '24px';
        avatar.style.height = '24px';
        avatar.style.borderRadius = '50%';
        
        const span = document.createElement('span');
        span.textContent = user.username;
        
        label.appendChild(checkbox);
        label.appendChild(avatar);
        label.appendChild(span);
        
        label.addEventListener('mouseenter', () => {
            label.style.background = 'var(--dark-lighter)';
        });
        label.addEventListener('mouseleave', () => {
            label.style.background = 'transparent';
        });
        
        container.appendChild(label);
    });
}

function loadProductsForCoupon() {
    const container = document.getElementById('couponProductsList');
    if (!container) return;
    
    container.innerHTML = '';
    
    dashboardData.products.forEach(product => {
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
        checkbox.value = product.id;
        checkbox.className = 'coupon-product-checkbox';
        
        const icon = document.createElement('img');
        icon.src = product.icon_url;
        icon.style.width = '24px';
        icon.style.height = '24px';
        icon.style.borderRadius = '4px';
        
        const span = document.createElement('span');
        span.textContent = product.name;
        
        label.appendChild(checkbox);
        label.appendChild(icon);
        label.appendChild(span);
        
        label.addEventListener('mouseenter', () => {
            label.style.background = 'var(--dark-lighter)';
        });
        label.addEventListener('mouseleave', () => {
            label.style.background = 'transparent';
        });
        
        container.appendChild(label);
    });
}

async function createCoupon() {
    const code = document.getElementById('couponCode').value.trim();
    const discount = document.getElementById('couponDiscount').value;
    const type = document.getElementById('couponType').value;
    
    if (!code || !discount) {
        showAdminToast('Please fill all required fields', 'warning');
        return;
    }
    
    try {
        showAdminLoading();
        
        let userIds = [];
        let productIds = [];
        
        if (type === 'specific_users' || type === 'both') {
            userIds = Array.from(document.querySelectorAll('.coupon-user-checkbox:checked'))
                .map(cb => parseInt(cb.value));
            
            if (userIds.length === 0) {
                hideAdminLoading();
                showAdminToast('Please select at least one user', 'warning');
                return;
            }
        }
        
        if (type === 'specific_products' || type === 'both') {
            productIds = Array.from(document.querySelectorAll('.coupon-product-checkbox:checked'))
                .map(cb => parseInt(cb.value));
            
            if (productIds.length === 0) {
                hideAdminLoading();
                showAdminToast('Please select at least one product', 'warning');
                return;
            }
        }
        
        const { error } = await supabase
            .from('coupons')
            .insert([{
                code: code.toUpperCase(),
                discount_percentage: parseInt(discount),
                user_ids: userIds.length > 0 ? userIds : null,
                product_ids: productIds.length > 0 ? productIds : null,
                used_by: [],
                usage_count: 0,
                created_at: new Date().toISOString()
            }]);
        
        if (error) throw error;
        
        await loadCoupons();
        
        // Clear form
        document.getElementById('couponCode').value = '';
        document.getElementById('couponDiscount').value = '';
        document.getElementById('couponType').value = 'all';
        document.querySelectorAll('.coupon-user-checkbox').forEach(cb => cb.checked = false);
        document.querySelectorAll('.coupon-product-checkbox').forEach(cb => cb.checked = false);
        toggleCouponOptions();
        
        hideAdminLoading();
        showAdminToast('Coupon created successfully', 'success');
        
    } catch (error) {
        console.error('Error creating coupon:', error);
        hideAdminLoading();
        showAdminToast('Failed to create coupon', 'error');
    }
}

function renderCouponsList() {
    const container = document.getElementById('couponsList');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (dashboardData.coupons.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-ticket-alt"></i><h3>No Coupons</h3><p>Create your first coupon</p></div>';
        return;
    }
    
    dashboardData.coupons.forEach(coupon => {
        const card = document.createElement('div');
        card.className = 'item-card';
        
        let typeText = 'All Users & Products';
        if (coupon.user_ids && coupon.product_ids) {
            typeText = 'Specific Users & Products';
        } else if (coupon.user_ids) {
            typeText = 'Specific Users';
        } else if (coupon.product_ids) {
            typeText = 'Specific Products';
        }
        
        card.innerHTML = `
            <h4 style="font-size: 24px; color: var(--primary); letter-spacing: 2px;">${coupon.code}</h4>
            <p><strong>Discount:</strong> ${coupon.discount_percentage}%</p>
            <p><strong>Type:</strong> ${typeText}</p>
            <p><strong>Used:</strong> ${coupon.usage_count || 0} times</p>
            <div class="item-actions">
                <button class="add-btn" onclick="sendCouponToUsers(${coupon.id})">
                    <i class="fas fa-paper-plane"></i> Send
                </button>
                <button class="delete-btn" onclick="deleteCoupon(${coupon.id})">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        `;
        container.appendChild(card);
    });
}

async function sendCouponToUsers(couponId) {
    const coupon = dashboardData.coupons.find(c => c.id === couponId);
    if (!coupon) return;
    
    const userIds = coupon.user_ids || dashboardData.users.map(u => u.id);
    
    if (userIds.length === 0) {
        showAdminToast('No users to send coupon to', 'warning');
        return;
    }
    
    showConfirmDialog(
        'Send Coupon',
        `Send coupon "${coupon.code}" to ${userIds.length} user(s)?`,
        async () => {
            try {
                showAdminLoading();
                
                const notifications = userIds.map(userId => ({
                    user_id: userId,
                    title: 'New Coupon Available!',
                    message: `You've received a ${coupon.discount_percentage}% discount coupon. Use code: ${coupon.code}`,
                    coupon_code: coupon.code,
                    read: false,
                    created_at: new Date().toISOString()
                }));
                
                const { error } = await supabase
                    .from('notifications')
                    .insert(notifications);
                
                if (error) throw error;
                
                hideAdminLoading();
                showAdminToast(`Coupon sent to ${userIds.length} user(s)`, 'success');
                
            } catch (error) {
                console.error('Error sending coupon:', error);
                hideAdminLoading();
                showAdminToast('Failed to send coupon', 'error');
            }
        }
    );
}

async function deleteCoupon(id) {
    showConfirmDialog(
        'Delete Coupon',
        'Are you sure you want to delete this coupon?',
        async () => {
            try {
                showAdminLoading();
                
                const { error } = await supabase
                    .from('coupons')
                    .delete()
                    .eq('id', id);
                
                if (error) throw error;
                
                await loadCoupons();
                
                hideAdminLoading();
                showAdminToast('Coupon deleted successfully', 'success');
                
            } catch (error) {
                console.error('Error deleting coupon:', error);
                hideAdminLoading();
                showAdminToast('Failed to delete coupon', 'error');
            }
        }
    );
}

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
