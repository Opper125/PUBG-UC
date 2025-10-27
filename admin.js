/* ========================================
   ADMIN.JS - CORE FUNCTIONALITY
======================================== */

/* ========================================
   SUPABASE CONFIGURATION
======================================== */

const SUPABASE_URL = 'https://vqumonhyeekgltvercbw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxdW1vbmh5ZWVrZ2x0dmVyY2J3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1NTgzMzAsImV4cCI6MjA3NzEzNDMzMH0._C5EiMWyNs65ymDuwle_8UEytEqhn2bwniNvC9G9j1I';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ========================================
   ADMIN STATE MANAGEMENT
======================================== */

const AdminState = {
    isAuthenticated: false,
    adminPassword: null,
    adminIP: null,
    currentPage: 'dashboard',
    websiteConfig: null,
    stats: {
        totalUsers: 0,
        totalOrders: 0,
        approvedOrders: 0,
        totalRevenue: 0
    },
    categories: [],
    products: [],
    orders: [],
    users: [],
    banners: [],
    coupons: [],
    payments: [],
    news: [],
    contacts: [],
    music: [],
    charts: {}
};

/* ========================================
   UTILITY FUNCTIONS
======================================== */

function showAdminLoader() {
    const loader = document.getElementById('adminLoader');
    if (loader) {
        loader.classList.add('active');
    }
}

function hideAdminLoader() {
    const loader = document.getElementById('adminLoader');
    if (loader) {
        setTimeout(() => {
            loader.classList.remove('active');
        }, 300);
    }
}

function showAdminToast(title, message, type = 'info') {
    const container = document.getElementById('adminToastContainer');
    
    const toast = document.createElement('div');
    toast.className = `admin-toast ${type}`;
    
    const iconMap = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    
    toast.innerHTML = `
        <i class="fas ${iconMap[type]}" style="font-size: 1.2rem;"></i>
        <div style="flex: 1;">
            <div style="font-weight: 600; margin-bottom: 2px;">${title}</div>
            <div style="font-size: 0.85rem; color: var(--admin-text-secondary);">${message}</div>
        </div>
        <button onclick="this.parentElement.remove()" style="background: transparent; border: none; color: var(--admin-text-muted); cursor: pointer; padding: 4px;">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

function formatPrice(price) {
    return new Intl.NumberFormat('en-US').format(price) + ' Ks';
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

async function getUserIP() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch (error) {
        console.error('IP fetch error:', error);
        return null;
    }
}

async function compressImage(file, maxSizeMB = 1) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            const img = new Image();
            
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                
                const maxDim = 1920;
                if (width > height && width > maxDim) {
                    height = (height * maxDim) / width;
                    width = maxDim;
                } else if (height > maxDim) {
                    width = (width * maxDim) / height;
                    height = maxDim;
                }
                
                canvas.width = width;
                canvas.height = height;
                
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                canvas.toBlob((blob) => {
                    if (blob) {
                        resolve(new File([blob], file.name, {
                            type: 'image/jpeg',
                            lastModified: Date.now()
                        }));
                    } else {
                        reject(new Error('Compression failed'));
                    }
                }, 'image/jpeg', 0.85);
            };
            
            img.onerror = reject;
            img.src = e.target.result;
        };
        
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

async function uploadFile(file, folder = 'admin') {
    try {
        // Compress if image
        if (file.type.startsWith('image/')) {
            file = await compressImage(file);
        }
        
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${folder}/${fileName}`;
        
        const { data, error } = await supabase.storage
            .from('images')
            .upload(filePath, file);
        
        if (error) throw error;
        
        const { data: publicURL } = supabase.storage
            .from('images')
            .getPublicUrl(filePath);
        
        return publicURL.publicUrl;
    } catch (error) {
        console.error('Upload error:', error);
        throw error;
    }
}

/* ========================================
   ADMIN AUTHENTICATION
======================================== */

// Password toggle
document.querySelector('.toggle-password')?.addEventListener('click', function() {
    const input = document.getElementById('adminPassword');
    if (input.type === 'password') {
        input.type = 'text';
        this.classList.replace('fa-eye', 'fa-eye-slash');
    } else {
        input.type = 'password';
        this.classList.replace('fa-eye-slash', 'fa-eye');
    }
});

// Admin Login
document.getElementById('adminLoginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const password = document.getElementById('adminPassword').value;
    
    showAdminLoader();
    
    try {
        // Get user IP
        const userIP = await getUserIP();
        
        // Check admin credentials from database
        const { data: adminConfig, error } = await supabase
            .from('admin_config')
            .select('*')
            .single();
        
        if (error || !adminConfig) {
            showAdminToast('Error', 'Admin configuration not found', 'error');
            hideAdminLoader();
            return;
        }
        
        // Verify password
        if (password !== adminConfig.password) {
            showAdminToast('Access Denied', 'Invalid password', 'error');
            hideAdminLoader();
            return;
        }
        
        // Verify IP if set
        if (adminConfig.allowed_ip && adminConfig.allowed_ip !== userIP) {
            showAdminToast('Access Denied', 'Your IP is not authorized', 'error');
            hideAdminLoader();
            return;
        }
        
        // Update IP if not set
        if (!adminConfig.allowed_ip) {
            await supabase
                .from('admin_config')
                .update({ allowed_ip: userIP })
                .eq('id', adminConfig.id);
        }
        
        // Save session
        AdminState.isAuthenticated = true;
        AdminState.adminPassword = password;
        AdminState.adminIP = userIP;
        sessionStorage.setItem('adminSession', JSON.stringify({
            authenticated: true,
            timestamp: Date.now()
        }));
        
        // Show dashboard
        document.getElementById('adminLogin').classList.remove('active');
        document.getElementById('adminDashboard').classList.add('active');
        
        hideAdminLoader();
        showAdminToast('Welcome', 'Admin access granted', 'success');
        
        // Initialize dashboard
        await initAdminDashboard();
        
    } catch (error) {
        console.error('Login error:', error);
        showAdminToast('Error', 'An error occurred during login', 'error');
        hideAdminLoader();
    }
});

// Check existing session
function checkAdminSession() {
    const session = sessionStorage.getItem('adminSession');
    
    if (session) {
        try {
            const data = JSON.parse(session);
            const hoursPassed = (Date.now() - data.timestamp) / (1000 * 60 * 60);
            
            // Session valid for 8 hours
            if (hoursPassed < 8 && data.authenticated) {
                AdminState.isAuthenticated = true;
                document.getElementById('adminLogin').classList.remove('active');
                document.getElementById('adminDashboard').classList.add('active');
                initAdminDashboard();
                return true;
            }
        } catch (e) {
            console.error('Session parse error:', e);
        }
    }
    
    return false;
}

// Logout
function adminLogout() {
    if (confirm('Are you sure you want to logout?')) {
        AdminState.isAuthenticated = false;
        sessionStorage.removeItem('adminSession');
        
        document.getElementById('adminDashboard').classList.remove('active');
        document.getElementById('adminLogin').classList.add('active');
        document.getElementById('adminPassword').value = '';
        
        showAdminToast('Logged Out', 'You have been logged out successfully', 'info');
    }
}

/* ========================================
   NAVIGATION
======================================== */

function switchAdminPage(pageName) {
    // Hide all pages
    document.querySelectorAll('.admin-page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Show selected page
    const targetPage = document.getElementById(pageName + 'Page');
    if (targetPage) {
        targetPage.classList.add('active');
    }
    
    // Update nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.dataset.page === pageName) {
            link.classList.add('active');
        }
    });
    
    // Update page title
    const titles = {
        dashboard: 'Dashboard',
        settings: 'Website Settings',
        banners: 'Banner Management',
        categories: 'Categories',
        products: 'Products',
        payments: 'Payment Methods',
        coupons: 'Coupons',
        news: 'News',
        contacts: 'Contacts',
        notifications: 'Notifications',
        orders: 'Orders',
        users: 'Users',
        analytics: 'Analytics',
        music: 'Music'
    };
    
    document.getElementById('pageTitle').textContent = titles[pageName] || pageName;
    
    // Update state
    AdminState.currentPage = pageName;
    
    // Load page data
    loadAdminPageData(pageName);
}

// Setup navigation listeners
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const page = this.dataset.page;
            if (page) {
                switchAdminPage(page);
            }
        });
    });
    
    // Setup tab navigation
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('tab-btn')) {
            const tabName = e.target.dataset.tab;
            
            // Remove active from all tabs
            e.target.parentElement.querySelectorAll('.tab-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            e.target.classList.add('active');
            
            // Show corresponding content
            const container = e.target.parentElement.parentElement;
            container.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            container.querySelector(`#${tabName}`).classList.add('active');
        }
    });
});

// Sidebar toggle
function toggleSidebar() {
    document.getElementById('adminSidebar').classList.toggle('active');
}

/* ========================================
   MODAL MANAGEMENT
======================================== */

function openAdminModal(content) {
    const modal = document.getElementById('adminModal');
    const body = document.getElementById('modalBody');
    
    body.innerHTML = content;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeAdminModal() {
    const modal = document.getElementById('adminModal');
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

/* ========================================
   DASHBOARD INITIALIZATION
======================================== */

async function initAdminDashboard() {
    showAdminLoader();
    
    try {
        await loadDashboardStats();
        await loadRecentOrders();
        await initDashboardCharts();
        
        hideAdminLoader();
    } catch (error) {
        console.error('Dashboard init error:', error);
        hideAdminLoader();
        showAdminToast('Error', 'Failed to load dashboard', 'error');
    }
}

async function loadDashboardStats() {
    try {
        // Get total users
        const { data: users, error: usersError } = await supabase
            .from('users')
            .select('id', { count: 'exact' });
        
        AdminState.stats.totalUsers = users ? users.length : 0;
        
        // Get orders
        const { data: orders, error: ordersError } = await supabase
            .from('orders')
            .select('*');
        
        AdminState.stats.totalOrders = orders ? orders.length : 0;
        AdminState.stats.approvedOrders = orders ? orders.filter(o => o.status === 'approved').length : 0;
        
        // Calculate revenue
        const revenue = orders 
            ? orders.filter(o => o.status === 'approved').reduce((sum, o) => sum + o.final_price, 0)
            : 0;
        AdminState.stats.totalRevenue = revenue;
        
        // Update UI
        document.getElementById('statTotalUsers').textContent = AdminState.stats.totalUsers;
        document.getElementById('statTotalOrders').textContent = AdminState.stats.totalOrders;
        document.getElementById('statApprovedOrders').textContent = AdminState.stats.approvedOrders;
        document.getElementById('statTotalRevenue').textContent = formatPrice(AdminState.stats.totalRevenue);
        
        document.getElementById('totalUsers').textContent = AdminState.stats.totalUsers;
        document.getElementById('totalOrders').textContent = AdminState.stats.totalOrders;
        
        // Update pending orders badge
        const pendingOrders = orders ? orders.filter(o => o.status === 'pending').length : 0;
        const badge = document.getElementById('pendingOrdersBadge');
        if (badge) {
            badge.textContent = pendingOrders;
            badge.style.display = pendingOrders > 0 ? 'flex' : 'none';
        }
        
    } catch (error) {
        console.error('Stats load error:', error);
    }
}

/* ========================================
   ADMIN.JS - PART 2
======================================== */

/* ========================================
   RECENT ORDERS
======================================== */

async function loadRecentOrders() {
    try {
        const { data: orders, error } = await supabase
            .from('orders')
            .select(`
                *,
                users (username, email, avatar),
                products (name, icon_url)
            `)
            .order('created_at', { ascending: false })
            .limit(5);
        
        if (error) throw error;
        
        const container = document.getElementById('recentOrdersList');
        container.innerHTML = '';
        
        if (!orders || orders.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>No recent orders</p></div>';
            return;
        }
        
        orders.forEach(order => {
            const orderItem = document.createElement('div');
            orderItem.className = 'order-card-admin';
            
            const statusClass = order.status === 'approved' ? 'approved' : order.status === 'rejected' ? 'rejected' : 'pending';
            
            orderItem.innerHTML = `
                <div class="order-card-header">
                    <span class="order-id-admin">Order #${order.order_id}</span>
                    <span class="order-status-badge ${statusClass}">${order.status.toUpperCase()}</span>
                </div>
                <div style="display: flex; gap: 1rem; align-items: center;">
                    <img src="${order.users.avatar}" style="width: 40px; height: 40px; border-radius: 50%;" alt="${order.users.username}">
                    <div style="flex: 1;">
                        <div style="font-weight: 600; margin-bottom: 4px;">${order.users.username}</div>
                        <div style="font-size: 0.85rem; color: var(--admin-text-secondary);">${order.products.name}</div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-weight: 700; color: var(--admin-purple);">${formatPrice(order.final_price)}</div>
                        <div style="font-size: 0.75rem; color: var(--admin-text-muted);">${formatDate(order.created_at)}</div>
                    </div>
                </div>
            `;
            
            container.appendChild(orderItem);
        });
        
    } catch (error) {
        console.error('Recent orders error:', error);
    }
}

/* ========================================
   DASHBOARD CHARTS
======================================== */

async function initDashboardCharts() {
    // Sales Chart
    const salesCtx = document.getElementById('salesChart');
    if (salesCtx) {
        const { data: orders } = await supabase
            .from('orders')
            .select('created_at, final_price')
            .eq('status', 'approved')
            .order('created_at', { ascending: true });
        
        // Group by date
        const salesByDate = {};
        orders?.forEach(order => {
            const date = new Date(order.created_at).toLocaleDateString();
            salesByDate[date] = (salesByDate[date] || 0) + order.final_price;
        });
        
        const labels = Object.keys(salesByDate).slice(-7);
        const data = labels.map(label => salesByDate[label]);
        
        AdminState.charts.sales = new Chart(salesCtx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Sales',
                    data: data,
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        labels: { color: '#b4b4c8' }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { color: '#b4b4c8' },
                        grid: { color: 'rgba(255, 255, 255, 0.05)' }
                    },
                    x: {
                        ticks: { color: '#b4b4c8' },
                        grid: { color: 'rgba(255, 255, 255, 0.05)' }
                    }
                }
            }
        });
    }
    
    // Order Status Chart
    const orderStatusCtx = document.getElementById('orderStatusChart');
    if (orderStatusCtx) {
        const { data: orders } = await supabase
            .from('orders')
            .select('status');
        
        const pending = orders?.filter(o => o.status === 'pending').length || 0;
        const approved = orders?.filter(o => o.status === 'approved').length || 0;
        const rejected = orders?.filter(o => o.status === 'rejected').length || 0;
        
        AdminState.charts.orderStatus = new Chart(orderStatusCtx, {
            type: 'doughnut',
            data: {
                labels: ['Pending', 'Approved', 'Rejected'],
                datasets: [{
                    data: [pending, approved, rejected],
                    backgroundColor: ['#fbbf24', '#4ade80', '#ef4444'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: '#b4b4c8', padding: 15 }
                    }
                }
            }
        });
    }
}

/* ========================================
   PAGE DATA LOADING
======================================== */

async function loadAdminPageData(pageName) {
    showAdminLoader();
    
    try {
        switch(pageName) {
            case 'dashboard':
                await loadDashboardStats();
                await loadRecentOrders();
                break;
            case 'settings':
                await loadWebsiteSettings();
                break;
            case 'banners':
                await loadBanners();
                break;
            case 'categories':
                await loadCategories();
                break;
            case 'products':
                await loadProducts();
                break;
            case 'payments':
                await loadPaymentMethods();
                break;
            case 'coupons':
                await loadCoupons();
                break;
            case 'news':
                await loadNews();
                break;
            case 'contacts':
                await loadContacts();
                break;
            case 'orders':
                await loadOrders();
                break;
            case 'users':
                await loadUsers();
                break;
            case 'analytics':
                await loadAnalytics();
                break;
            case 'music':
                await loadMusic();
                break;
        }
        
        hideAdminLoader();
    } catch (error) {
        console.error('Page data load error:', error);
        hideAdminLoader();
        showAdminToast('Error', 'Failed to load page data', 'error');
    }
}

/* ========================================
   WEBSITE SETTINGS
======================================== */

async function loadWebsiteSettings() {
    try {
        const { data: config, error } = await supabase
            .from('website_config')
            .select('*')
            .single();
        
        if (error && error.code !== 'PGRST116') throw error;
        
        AdminState.websiteConfig = config || {};
        
        // Populate form
        if (config) {
            document.getElementById('websiteName').value = config.name || '';
            document.getElementById('appVersion').value = config.version || '1.0.0';
            document.getElementById('appDownloadUrl').value = config.webapp_url || '';
            
            if (config.logo_url) {
                document.getElementById('logoPreview').innerHTML = `<img src="${config.logo_url}" alt="Logo" style="max-height: 90px;">`;
            }
            
            if (config.background_image) {
                document.getElementById('backgroundPreview').innerHTML = `<img src="${config.background_image}" alt="Background">`;
            }
        }
        
    } catch (error) {
        console.error('Settings load error:', error);
    }
}

async function saveWebsiteSettings() {
    showAdminLoader();
    
    try {
        const name = document.getElementById('websiteName').value;
        const version = document.getElementById('appVersion').value;
        const webappUrl = document.getElementById('appDownloadUrl').value;
        
        let logoUrl = AdminState.websiteConfig?.logo_url;
        let backgroundUrl = AdminState.websiteConfig?.background_image;
        
        // Upload logo if changed
        const logoFile = document.getElementById('logoUpload').files[0];
        if (logoFile) {
            logoUrl = await uploadFile(logoFile, 'settings');
        }
        
        // Upload background if changed
        const backgroundFile = document.getElementById('backgroundUpload').files[0];
        if (backgroundFile) {
            backgroundUrl = await uploadFile(backgroundFile, 'settings');
        }
        
        const configData = {
            name: name,
            logo_url: logoUrl,
            background_image: backgroundUrl,
            version: version,
            webapp_url: webappUrl,
            updated_at: new Date().toISOString()
        };
        
        let result;
        if (AdminState.websiteConfig?.id) {
            // Update
            result = await supabase
                .from('website_config')
                .update(configData)
                .eq('id', AdminState.websiteConfig.id)
                .select()
                .single();
        } else {
            // Insert
            result = await supabase
                .from('website_config')
                .insert([configData])
                .select()
                .single();
        }
        
        if (result.error) throw result.error;
        
        AdminState.websiteConfig = result.data;
        
        hideAdminLoader();
        showAdminToast('Success', 'Website settings saved successfully', 'success');
        
    } catch (error) {
        console.error('Settings save error:', error);
        hideAdminLoader();
        showAdminToast('Error', 'Failed to save settings', 'error');
    }
}

// File upload preview handlers
document.getElementById('logoUpload')?.addEventListener('change', function(e) {
    if (e.target.files && e.target.files[0]) {
        const reader = new FileReader();
        reader.onload = function(event) {
            document.getElementById('logoPreview').innerHTML = `<img src="${event.target.result}" alt="Logo Preview" style="max-height: 90px;">`;
        };
        reader.readAsDataURL(e.target.files[0]);
    }
});

document.getElementById('backgroundUpload')?.addEventListener('change', function(e) {
    if (e.target.files && e.target.files[0]) {
        const reader = new FileReader();
        reader.onload = function(event) {
            document.getElementById('backgroundPreview').innerHTML = `<img src="${event.target.result}" alt="Background Preview">`;
        };
        reader.readAsDataURL(e.target.files[0]);
    }
});

/* ========================================
   CATEGORIES MANAGEMENT
======================================== */

async function loadCategories() {
    try {
        const { data: categories, error } = await supabase
            .from('categories')
            .select('*')
            .order('created_at', { ascending: true });
        
        if (error) throw error;
        
        AdminState.categories = categories || [];
        
        const container = document.getElementById('categoriesList');
        container.innerHTML = '';
        
        if (categories.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-folder-open"></i>
                    <h3>No Categories Yet</h3>
                    <p>Create your first category to get started</p>
                </div>
            `;
            return;
        }
        
        for (const category of categories) {
            await renderCategoryGroup(container, category);
        }
        
    } catch (error) {
        console.error('Categories load error:', error);
    }
}

async function renderCategoryGroup(container, category) {
    const groupDiv = document.createElement('div');
    groupDiv.className = 'category-group-admin';
    
    // Get category cards
    const { data: cards } = await supabase
        .from('category_cards')
        .select('*')
        .eq('category_id', category.id)
        .order('created_at', { ascending: true });
    
    groupDiv.innerHTML = `
        <div class="category-header-admin">
            <h3>
                <i class="fas fa-folder"></i>
                ${category.name}
            </h3>
            <div class="category-actions">
                <button class="btn-secondary" onclick="openCategoryCardModal('${category.id}')">
                    <i class="fas fa-plus"></i> Add Card
                </button>
                <button class="icon-btn edit" onclick="editCategory('${category.id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="icon-btn delete" onclick="deleteCategory('${category.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
        <div class="category-cards-admin" id="cards-${category.id}"></div>
    `;
    
    container.appendChild(groupDiv);
    
    // Render category cards
    const cardsContainer = document.getElementById(`cards-${category.id}`);
    if (cards && cards.length > 0) {
        cards.forEach(card => renderCategoryCard(cardsContainer, card));
    } else {
        cardsContainer.innerHTML = '<p style="color: var(--admin-text-muted); text-align: center; padding: 2rem;">No cards in this category</p>';
    }
}

function renderCategoryCard(container, card) {
    const cardDiv = document.createElement('div');
    cardDiv.className = 'category-card-admin';
    
    cardDiv.innerHTML = `
        <div class="category-card-image">
            <img src="${card.icon_url}" alt="${card.name}">
        </div>
        <div class="category-card-info">
            <div class="category-card-name">${card.name}</div>
            <div class="category-card-meta">
                ${card.discount_percent ? `<span><i class="fas fa-tag"></i> ${card.discount_percent}% OFF</span>` : ''}
                ${card.flag_url ? `<span><i class="fas fa-flag"></i> Flag</span>` : ''}
            </div>
            <div class="category-card-actions">
                <button class="icon-btn view" onclick="viewCategoryCardProducts('${card.id}')">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="icon-btn edit" onclick="editCategoryCard('${card.id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="icon-btn delete" onclick="deleteCategoryCard('${card.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `;
    
    container.appendChild(cardDiv);
}

function openCategoryModal() {
    const content = `
        <h2 style="margin-bottom: 1.5rem;">Create Category</h2>
        <form id="categoryForm" onsubmit="submitCategory(event)">
            <div class="form-group">
                <label>Category Name</label>
                <input type="text" id="categoryName" class="form-control" required>
            </div>
            <div style="display: flex; gap: 1rem;">
                <button type="submit" class="btn-primary">
                    <i class="fas fa-save"></i> Create Category
                </button>
                <button type="button" class="btn-secondary" onclick="closeAdminModal()">Cancel</button>
            </div>
        </form>
    `;
    
    openAdminModal(content);
}

async function submitCategory(e) {
    e.preventDefault();
    
    const name = document.getElementById('categoryName').value;
    
    showAdminLoader();
    
    try {
        const { data, error } = await supabase
            .from('categories')
            .insert([{
                name: name,
                status: 'active',
                created_at: new Date().toISOString()
            }])
            .select()
            .single();
        
        if (error) throw error;
        
        closeAdminModal();
        hideAdminLoader();
        showAdminToast('Success', 'Category created successfully', 'success');
        
        await loadCategories();
        
    } catch (error) {
        console.error('Category create error:', error);
        hideAdminLoader();
        showAdminToast('Error', 'Failed to create category', 'error');
    }
}

async function editCategory(categoryId) {
    const category = AdminState.categories.find(c => c.id === categoryId);
    if (!category) return;
    
    const content = `
        <h2 style="margin-bottom: 1.5rem;">Edit Category</h2>
        <form id="editCategoryForm" onsubmit="updateCategory(event, '${categoryId}')">
            <div class="form-group">
                <label>Category Name</label>
                <input type="text" id="editCategoryName" class="form-control" value="${category.name}" required>
            </div>
            <div style="display: flex; gap: 1rem;">
                <button type="submit" class="btn-primary">
                    <i class="fas fa-save"></i> Update Category
                </button>
                <button type="button" class="btn-secondary" onclick="closeAdminModal()">Cancel</button>
            </div>
        </form>
    `;
    
    openAdminModal(content);
}

async function updateCategory(e, categoryId) {
    e.preventDefault();
    
    const name = document.getElementById('editCategoryName').value;
    
    showAdminLoader();
    
    try {
        const { error } = await supabase
            .from('categories')
            .update({ name: name })
            .eq('id', categoryId);
        
        if (error) throw error;
        
        closeAdminModal();
        hideAdminLoader();
        showAdminToast('Success', 'Category updated successfully', 'success');
        
        await loadCategories();
        
    } catch (error) {
        console.error('Category update error:', error);
        hideAdminLoader();
        showAdminToast('Error', 'Failed to update category', 'error');
    }
}

async function deleteCategory(categoryId) {
    if (!confirm('Are you sure you want to delete this category? All related category cards and products will also be deleted.')) {
        return;
    }
    
    showAdminLoader();
    
    try {
        const { error } = await supabase
            .from('categories')
            .delete()
            .eq('id', categoryId);
        
        if (error) throw error;
        
        hideAdminLoader();
        showAdminToast('Success', 'Category deleted successfully', 'success');
        
        await loadCategories();
        
    } catch (error) {
        console.error('Category delete error:', error);
        hideAdminLoader();
        showAdminToast('Error', 'Failed to delete category', 'error');
    }
}

function openCategoryCardModal(categoryId) {
    const content = `
        <h2 style="margin-bottom: 1.5rem;">Create Category Card</h2>
        <form id="categoryCardForm" onsubmit="submitCategoryCard(event, '${categoryId}')">
            <div class="form-group">
                <label>Card Name</label>
                <input type="text" id="cardName" class="form-control" required>
            </div>
            
            <div class="form-group">
                <label>Icon</label>
                <input type="file" id="cardIcon" class="form-control" accept="image/*" required>
            </div>
            
            <div class="form-group">
                <label>Country Flag (Optional)</label>
                <input type="file" id="cardFlag" class="form-control" accept="image/*">
            </div>
            
            <div class="form-group">
                <label>Discount Percentage (Optional)</label>
                <input type="number" id="cardDiscount" class="form-control" min="0" max="100" placeholder="e.g., 10">
            </div>
            
            <div style="display: flex; gap: 1rem;">
                <button type="submit" class="btn-primary">
                    <i class="fas fa-save"></i> Create Card
                </button>
                <button type="button" class="btn-secondary" onclick="closeAdminModal()">Cancel</button>
            </div>
        </form>
    `;
    
    openAdminModal(content);
}

async function submitCategoryCard(e, categoryId) {
    e.preventDefault();
    
    const name = document.getElementById('cardName').value;
    const iconFile = document.getElementById('cardIcon').files[0];
    const flagFile = document.getElementById('cardFlag').files[0];
    const discount = document.getElementById('cardDiscount').value;
    
    if (!iconFile) {
        showAdminToast('Error', 'Please select an icon', 'error');
        return;
    }
    
    showAdminLoader();
    
    try {
        // Upload icon
        const iconUrl = await uploadFile(iconFile, 'category-cards');
        
        // Upload flag if provided
        let flagUrl = null;
        if (flagFile) {
            flagUrl = await uploadFile(flagFile, 'category-cards');
        }
        
        const { data, error } = await supabase
            .from('category_cards')
            .insert([{
                category_id: categoryId,
                name: name,
                icon_url: iconUrl,
                flag_url: flagUrl,
                discount_percent: discount ? parseInt(discount) : null,
                status: 'active',
                created_at: new Date().toISOString()
            }])
            .select()
            .single();
        
        if (error) throw error;
        
        closeAdminModal();
        hideAdminLoader();
        showAdminToast('Success', 'Category card created successfully', 'success');
        
        await loadCategories();
        
    } catch (error) {
        console.error('Category card create error:', error);
        hideAdminLoader();
        showAdminToast('Error', 'Failed to create category card', 'error');
    }
}

async function editCategoryCard(cardId) {
    const { data: card, error } = await supabase
        .from('category_cards')
        .select('*')
        .eq('id', cardId)
        .single();
    
    if (error || !card) {
        showAdminToast('Error', 'Card not found', 'error');
        return;
    }
    
    const content = `
        <h2 style="margin-bottom: 1.5rem;">Edit Category Card</h2>
        <form id="editCardForm" onsubmit="updateCategoryCard(event, '${cardId}')">
            <div class="form-group">
                <label>Card Name</label>
                <input type="text" id="editCardName" class="form-control" value="${card.name}" required>
            </div>
            
            <div class="form-group">
                <label>Icon (Leave empty to keep current)</label>
                <input type="file" id="editCardIcon" class="form-control" accept="image/*">
                <div class="image-preview">
                    <img src="${card.icon_url}" alt="Current Icon" style="max-height: 80px;">
                </div>
            </div>
            
            <div class="form-group">
                <label>Country Flag (Optional)</label>
                <input type="file" id="editCardFlag" class="form-control" accept="image/*">
                ${card.flag_url ? `<div class="image-preview"><img src="${card.flag_url}" alt="Current Flag" style="max-height: 40px;"></div>` : ''}
            </div>
            
            <div class="form-group">
                <label>Discount Percentage</label>
                <input type="number" id="editCardDiscount" class="form-control" value="${card.discount_percent || ''}" min="0" max="100">
            </div>
            
            <div style="display: flex; gap: 1rem;">
                <button type="submit" class="btn-primary">
                    <i class="fas fa-save"></i> Update Card
                </button>
                <button type="button" class="btn-secondary" onclick="closeAdminModal()">Cancel</button>
            </div>
        </form>
    `;
    
    openAdminModal(content);
}

async function updateCategoryCard(e, cardId) {
    e.preventDefault();
    
    const name = document.getElementById('editCardName').value;
    const iconFile = document.getElementById('editCardIcon').files[0];
    const flagFile = document.getElementById('editCardFlag').files[0];
    const discount = document.getElementById('editCardDiscount').value;
    
    showAdminLoader();
    
    try {
        // Get current card data
        const { data: currentCard } = await supabase
            .from('category_cards')
            .select('*')
            .eq('id', cardId)
            .single();
        
        let iconUrl = currentCard.icon_url;
        let flagUrl = currentCard.flag_url;
        
        // Upload new icon if provided
        if (iconFile) {
            iconUrl = await uploadFile(iconFile, 'category-cards');
        }
        
        // Upload new flag if provided
        if (flagFile) {
            flagUrl = await uploadFile(flagFile, 'category-cards');
        }
        
        const { error } = await supabase
            .from('category_cards')
            .update({
                name: name,
                icon_url: iconUrl,
                flag_url: flagUrl,
                discount_percent: discount ? parseInt(discount) : null
            })
            .eq('id', cardId);
        
        if (error) throw error;
        
        closeAdminModal();
        hideAdminLoader();
        showAdminToast('Success', 'Category card updated successfully', 'success');
        
        await loadCategories();
        
    } catch (error) {
        console.error('Category card update error:', error);
        hideAdminLoader();
        showAdminToast('Error', 'Failed to update category card', 'error');
    }
}

async function deleteCategoryCard(cardId) {
    if (!confirm('Are you sure you want to delete this category card? All related products will also be deleted.')) {
        return;
    }
    
    showAdminLoader();
    
    try {
        const { error } = await supabase
            .from('category_cards')
            .delete()
            .eq('id', cardId);
        
        if (error) throw error;
        
        hideAdminLoader();
        showAdminToast('Success', 'Category card deleted successfully', 'success');
        
        await loadCategories();
        
    } catch (error) {
        console.error('Category card delete error:', error);
        hideAdminLoader();
        showAdminToast('Error', 'Failed to delete category card', 'error');
    }
}

function viewCategoryCardProducts(cardId) {
    // Switch to products page and filter by this card
    switchAdminPage('products');
    // TODO: Apply filter
}

/* ========================================
   INITIALIZATION
======================================== */

document.addEventListener('DOMContentLoaded', () => {
    // Check for existing session
    if (!checkAdminSession()) {
        hideAdminLoader();
    }
});

/* ========================================
   ADMIN.JS - PART 3
======================================== */

/* ========================================
   PRODUCTS MANAGEMENT
======================================== */

async function loadProducts() {
    try {
        const { data: products, error } = await supabase
            .from('products')
            .select(`
                *,
                category_cards (
                    name,
                    categories (name)
                )
            `)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        AdminState.products = products || [];
        
        // Load categories for filters
        await loadCategoryFilters();
        
        renderProductsTable(products);
        
    } catch (error) {
        console.error('Products load error:', error);
        showAdminToast('Error', 'Failed to load products', 'error');
    }
}

function renderProductsTable(products) {
    const container = document.getElementById('productsList');
    container.innerHTML = '';
    
    if (!products || products.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-box-open"></i>
                <h3>No Products Yet</h3>
                <p>Create your first product to get started</p>
            </div>
        `;
        return;
    }
    
    const table = document.createElement('table');
    table.innerHTML = `
        <thead>
            <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Price</th>
                <th>Discount</th>
                <th>Status</th>
                <th>Actions</th>
            </tr>
        </thead>
        <tbody id="productsTableBody"></tbody>
    `;
    
    container.appendChild(table);
    
    const tbody = document.getElementById('productsTableBody');
    
    products.forEach(product => {
        const finalPrice = product.discount_percent 
            ? product.price - (product.price * (product.discount_percent / 100))
            : product.price;
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <img src="${product.icon_url}" style="width: 50px; height: 50px; border-radius: 8px; object-fit: cover;" alt="${product.name}">
                    <div>
                        <div style="font-weight: 600;">${product.name}</div>
                        <div style="font-size: 0.85rem; color: var(--admin-text-muted);">${product.amount || 'N/A'}</div>
                    </div>
                </div>
            </td>
            <td>
                <div style="font-size: 0.85rem;">
                    <div style="font-weight: 600;">${product.category_cards?.categories?.name || 'N/A'}</div>
                    <div style="color: var(--admin-text-muted);">${product.category_cards?.name || 'N/A'}</div>
                </div>
            </td>
            <td>
                <div style="font-weight: 700; color: var(--admin-purple);">${formatPrice(finalPrice)}</div>
                ${product.discount_percent ? `<div style="font-size: 0.75rem; text-decoration: line-through; color: var(--admin-text-muted);">${formatPrice(product.price)}</div>` : ''}
            </td>
            <td>
                ${product.discount_percent ? `<span class="badge-status active">${product.discount_percent}% OFF</span>` : '<span style="color: var(--admin-text-muted);">-</span>'}
            </td>
            <td>
                <span class="badge-status ${product.status}">${product.status}</span>
            </td>
            <td>
                <div style="display: flex; gap: 0.5rem;">
                    <button class="icon-btn edit" onclick="editProduct('${product.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="icon-btn delete" onclick="deleteProduct('${product.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

async function loadCategoryFilters() {
    const { data: categories } = await supabase
        .from('categories')
        .select('id, name')
        .eq('status', 'active');
    
    const filterCategory = document.getElementById('filterCategory');
    if (filterCategory) {
        filterCategory.innerHTML = '<option value="">All Categories</option>';
        categories?.forEach(cat => {
            filterCategory.innerHTML += `<option value="${cat.id}">${cat.name}</option>`;
        });
    }
}

// Category filter change handler
document.getElementById('filterCategory')?.addEventListener('change', async function() {
    const categoryId = this.value;
    
    if (!categoryId) {
        document.getElementById('filterCategoryCard').innerHTML = '<option value="">All Category Cards</option>';
        await loadProducts();
        return;
    }
    
    // Load category cards for selected category
    const { data: cards } = await supabase
        .from('category_cards')
        .select('id, name')
        .eq('category_id', categoryId)
        .eq('status', 'active');
    
    const filterCard = document.getElementById('filterCategoryCard');
    filterCard.innerHTML = '<option value="">All Category Cards</option>';
    cards?.forEach(card => {
        filterCard.innerHTML += `<option value="${card.id}">${card.name}</option>`;
    });
    
    // Filter products
    const filtered = AdminState.products.filter(p => 
        p.category_cards?.categories?.id === categoryId
    );
    renderProductsTable(filtered);
});

// Category card filter change handler
document.getElementById('filterCategoryCard')?.addEventListener('change', function() {
    const cardId = this.value;
    
    if (!cardId) {
        const categoryId = document.getElementById('filterCategory').value;
        const filtered = categoryId 
            ? AdminState.products.filter(p => p.category_cards?.categories?.id === categoryId)
            : AdminState.products;
        renderProductsTable(filtered);
        return;
    }
    
    const filtered = AdminState.products.filter(p => p.category_card_id === cardId);
    renderProductsTable(filtered);
});

// Product search handler
document.getElementById('searchProducts')?.addEventListener('input', function() {
    const query = this.value.toLowerCase();
    
    if (!query) {
        renderProductsTable(AdminState.products);
        return;
    }
    
    const filtered = AdminState.products.filter(p => 
        p.name.toLowerCase().includes(query) ||
        p.type_name?.toLowerCase().includes(query) ||
        p.amount?.toLowerCase().includes(query)
    );
    
    renderProductsTable(filtered);
});

async function openProductModal() {
    // Get categories and category cards
    const { data: categories } = await supabase
        .from('categories')
        .select('id, name')
        .eq('status', 'active');
    
    let categoriesOptions = '';
    categories?.forEach(cat => {
        categoriesOptions += `<option value="${cat.id}">${cat.name}</option>`;
    });
    
    const content = `
        <h2 style="margin-bottom: 1.5rem;">Create Product</h2>
        <form id="productForm" onsubmit="submitProduct(event)">
            <div class="form-group">
                <label>Category</label>
                <select id="productCategory" class="form-control" required onchange="loadProductCategoryCards()">
                    <option value="">Select Category</option>
                    ${categoriesOptions}
                </select>
            </div>
            
            <div class="form-group">
                <label>Category Card</label>
                <select id="productCategoryCard" class="form-control" required>
                    <option value="">Select Category Card</option>
                </select>
            </div>
            
            <div class="form-group">
                <label>Product Name</label>
                <input type="text" id="productName" class="form-control" required>
            </div>
            
            <div class="form-group">
                <label>Price (Ks)</label>
                <input type="number" id="productPrice" class="form-control" min="0" required>
            </div>
            
            <div class="form-group">
                <label>Discount Percentage (Optional)</label>
                <input type="number" id="productDiscount" class="form-control" min="0" max="100">
            </div>
            
            <div class="form-group">
                <label>Product Type Name</label>
                <input type="text" id="productType" class="form-control" placeholder="e.g., Game Account, Premium">
            </div>
            
            <div class="form-group">
                <label>Type Badge Colors (comma separated hex colors)</label>
                <input type="text" id="productTypeColors" class="form-control" placeholder="e.g., #667eea, #764ba2">
            </div>
            
            <div class="form-group">
                <label>Amount/Quantity</label>
                <input type="text" id="productAmount" class="form-control">
            </div>
            
            <div class="form-group">
                <label>Description (Optional)</label>
                <textarea id="productDescription" class="form-control" rows="3"></textarea>
            </div>
            
            <div class="form-group">
                <label>Product Icon</label>
                <input type="file" id="productIcon" class="form-control" accept="image/*" required>
            </div>
            
            <div style="display: flex; gap: 1rem;">
                <button type="submit" class="btn-primary">
                    <i class="fas fa-save"></i> Create Product
                </button>
                <button type="button" class="btn-secondary" onclick="closeAdminModal()">Cancel</button>
            </div>
        </form>
    `;
    
    openAdminModal(content);
}

async function loadProductCategoryCards() {
    const categoryId = document.getElementById('productCategory').value;
    const cardSelect = document.getElementById('productCategoryCard');
    
    cardSelect.innerHTML = '<option value="">Select Category Card</option>';
    
    if (!categoryId) return;
    
    const { data: cards } = await supabase
        .from('category_cards')
        .select('id, name')
        .eq('category_id', categoryId)
        .eq('status', 'active');
    
    cards?.forEach(card => {
        cardSelect.innerHTML += `<option value="${card.id}">${card.name}</option>`;
    });
}

async function submitProduct(e) {
    e.preventDefault();
    
    const categoryCardId = document.getElementById('productCategoryCard').value;
    const name = document.getElementById('productName').value;
    const price = parseFloat(document.getElementById('productPrice').value);
    const discount = document.getElementById('productDiscount').value;
    const typeName = document.getElementById('productType').value;
    const typeColors = document.getElementById('productTypeColors').value;
    const amount = document.getElementById('productAmount').value;
    const description = document.getElementById('productDescription').value;
    const iconFile = document.getElementById('productIcon').files[0];
    
    if (!iconFile) {
        showAdminToast('Error', 'Please select a product icon', 'error');
        return;
    }
    
    showAdminLoader();
    
    try {
        // Upload icon
        const iconUrl = await uploadFile(iconFile, 'products');
        
        // Parse colors
        let colorsArray = null;
        if (typeColors) {
            colorsArray = typeColors.split(',').map(c => c.trim());
        }
        
        const { data, error } = await supabase
            .from('products')
            .insert([{
                category_card_id: categoryCardId,
                name: name,
                price: price,
                discount_percent: discount ? parseInt(discount) : null,
                type_name: typeName,
                type_badge_color: colorsArray ? JSON.stringify(colorsArray) : null,
                amount: amount,
                description: description,
                icon_url: iconUrl,
                status: 'active',
                created_at: new Date().toISOString()
            }])
            .select()
            .single();
        
        if (error) throw error;
        
        closeAdminModal();
        hideAdminLoader();
        showAdminToast('Success', 'Product created successfully', 'success');
        
        await loadProducts();
        
    } catch (error) {
        console.error('Product create error:', error);
        hideAdminLoader();
        showAdminToast('Error', 'Failed to create product', 'error');
    }
}

async function editProduct(productId) {
    const product = AdminState.products.find(p => p.id === productId);
    if (!product) return;
    
    // Get categories
    const { data: categories } = await supabase
        .from('categories')
        .select('id, name')
        .eq('status', 'active');
    
    let categoriesOptions = '';
    categories?.forEach(cat => {
        const selected = cat.id === product.category_cards?.categories?.id ? 'selected' : '';
        categoriesOptions += `<option value="${cat.id}" ${selected}>${cat.name}</option>`;
    });
    
    // Get category cards
    const { data: cards } = await supabase
        .from('category_cards')
        .select('id, name')
        .eq('category_id', product.category_cards?.categories?.id)
        .eq('status', 'active');
    
    let cardsOptions = '';
    cards?.forEach(card => {
        const selected = card.id === product.category_card_id ? 'selected' : '';
        cardsOptions += `<option value="${card.id}" ${selected}>${card.name}</option>`;
    });
    
    const typeColors = product.type_badge_color 
        ? JSON.parse(product.type_badge_color).join(', ')
        : '';
    
    const content = `
        <h2 style="margin-bottom: 1.5rem;">Edit Product</h2>
        <form id="editProductForm" onsubmit="updateProduct(event, '${productId}')">
            <div class="form-group">
                <label>Category</label>
                <select id="editProductCategory" class="form-control" required onchange="loadEditProductCategoryCards()">
                    ${categoriesOptions}
                </select>
            </div>
            
            <div class="form-group">
                <label>Category Card</label>
                <select id="editProductCategoryCard" class="form-control" required>
                    ${cardsOptions}
                </select>
            </div>
            
            <div class="form-group">
                <label>Product Name</label>
                <input type="text" id="editProductName" class="form-control" value="${product.name}" required>
            </div>
            
            <div class="form-group">
                <label>Price (Ks)</label>
                <input type="number" id="editProductPrice" class="form-control" value="${product.price}" min="0" required>
            </div>
            
            <div class="form-group">
                <label>Discount Percentage</label>
                <input type="number" id="editProductDiscount" class="form-control" value="${product.discount_percent || ''}" min="0" max="100">
            </div>
            
            <div class="form-group">
                <label>Product Type Name</label>
                <input type="text" id="editProductType" class="form-control" value="${product.type_name || ''}">
            </div>
            
            <div class="form-group">
                <label>Type Badge Colors</label>
                <input type="text" id="editProductTypeColors" class="form-control" value="${typeColors}">
            </div>
            
            <div class="form-group">
                <label>Amount/Quantity</label>
                <input type="text" id="editProductAmount" class="form-control" value="${product.amount || ''}">
            </div>
            
            <div class="form-group">
                <label>Description</label>
                <textarea id="editProductDescription" class="form-control" rows="3">${product.description || ''}</textarea>
            </div>
            
            <div class="form-group">
                <label>Product Icon (Leave empty to keep current)</label>
                <input type="file" id="editProductIcon" class="form-control" accept="image/*">
                <div class="image-preview">
                    <img src="${product.icon_url}" alt="Current Icon" style="max-height: 100px;">
                </div>
            </div>
            
            <div style="display: flex; gap: 1rem;">
                <button type="submit" class="btn-primary">
                    <i class="fas fa-save"></i> Update Product
                </button>
                <button type="button" class="btn-secondary" onclick="closeAdminModal()">Cancel</button>
            </div>
        </form>
    `;
    
    openAdminModal(content);
}

async function loadEditProductCategoryCards() {
    const categoryId = document.getElementById('editProductCategory').value;
    const cardSelect = document.getElementById('editProductCategoryCard');
    
    cardSelect.innerHTML = '<option value="">Select Category Card</option>';
    
    if (!categoryId) return;
    
    const { data: cards } = await supabase
        .from('category_cards')
        .select('id, name')
        .eq('category_id', categoryId)
        .eq('status', 'active');
    
    cards?.forEach(card => {
        cardSelect.innerHTML += `<option value="${card.id}">${card.name}</option>`;
    });
}

async function updateProduct(e, productId) {
    e.preventDefault();
    
    const categoryCardId = document.getElementById('editProductCategoryCard').value;
    const name = document.getElementById('editProductName').value;
    const price = parseFloat(document.getElementById('editProductPrice').value);
    const discount = document.getElementById('editProductDiscount').value;
    const typeName = document.getElementById('editProductType').value;
    const typeColors = document.getElementById('editProductTypeColors').value;
    const amount = document.getElementById('editProductAmount').value;
    const description = document.getElementById('editProductDescription').value;
    const iconFile = document.getElementById('editProductIcon').files[0];
    
    showAdminLoader();
    
    try {
        // Get current product
        const { data: currentProduct } = await supabase
            .from('products')
            .select('icon_url')
            .eq('id', productId)
            .single();
        
        let iconUrl = currentProduct.icon_url;
        
        // Upload new icon if provided
        if (iconFile) {
            iconUrl = await uploadFile(iconFile, 'products');
        }
        
        // Parse colors
        let colorsArray = null;
        if (typeColors) {
            colorsArray = typeColors.split(',').map(c => c.trim());
        }
        
        const { error } = await supabase
            .from('products')
            .update({
                category_card_id: categoryCardId,
                name: name,
                price: price,
                discount_percent: discount ? parseInt(discount) : null,
                type_name: typeName,
                type_badge_color: colorsArray ? JSON.stringify(colorsArray) : null,
                amount: amount,
                description: description,
                icon_url: iconUrl
            })
            .eq('id', productId);
        
        if (error) throw error;
        
        closeAdminModal();
        hideAdminLoader();
        showAdminToast('Success', 'Product updated successfully', 'success');
        
        await loadProducts();
        
    } catch (error) {
        console.error('Product update error:', error);
        hideAdminLoader();
        showAdminToast('Error', 'Failed to update product', 'error');
    }
}

async function deleteProduct(productId) {
    if (!confirm('Are you sure you want to delete this product?')) {
        return;
    }
    
    showAdminLoader();
    
    try {
        const { error } = await supabase
            .from('products')
            .delete()
            .eq('id', productId);
        
        if (error) throw error;
        
        hideAdminLoader();
        showAdminToast('Success', 'Product deleted successfully', 'success');
        
        await loadProducts();
        
    } catch (error) {
        console.error('Product delete error:', error);
        hideAdminLoader();
        showAdminToast('Error', 'Failed to delete product', 'error');
    }
}

/* ========================================
   ORDERS MANAGEMENT
======================================== */

async function loadOrders() {
    try {
        const { data: orders, error } = await supabase
            .from('orders')
            .select(`
                *,
                users (username, email, avatar),
                products (name, icon_url),
                payment_methods (name, icon_url)
            `)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        AdminState.orders = orders || [];
        
        // Separate by status
        const pending = orders.filter(o => o.status === 'pending');
        const approved = orders.filter(o => o.status === 'approved');
        const rejected = orders.filter(o => o.status === 'rejected');
        
        renderOrdersList('pendingOrdersList', pending);
        renderOrdersList('approvedOrdersList', approved);
        renderOrdersList('rejectedOrdersList', rejected);
        
    } catch (error) {
        console.error('Orders load error:', error);
        showAdminToast('Error', 'Failed to load orders', 'error');
    }
}

function renderOrdersList(containerId, orders) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    
    if (!orders || orders.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <h3>No Orders</h3>
            </div>
        `;
        return;
    }
    
    orders.forEach(order => {
        renderOrderCard(container, order);
    });
}

function renderOrderCard(container, order) {
    const card = document.createElement('div');
    card.className = 'order-card-admin';
    
    const statusClass = order.status === 'approved' ? 'approved' : order.status === 'rejected' ? 'rejected' : 'pending';
    
    // Parse input data
    let inputDataHtml = '';
    if (order.input_data) {
        try {
            const inputData = JSON.parse(order.input_data);
            inputDataHtml = Object.entries(inputData).map(([key, value]) => 
                `<div><strong>Input ${key}:</strong> ${value}</div>`
            ).join('');
        } catch (e) {
            inputDataHtml = '<div>Invalid input data</div>';
        }
    }
    
    card.innerHTML = `
        <div class="order-card-header">
            <span class="order-id-admin">Order #${order.order_id}</span>
            <span class="order-status-badge ${statusClass}">${order.status.toUpperCase()}</span>
        </div>
        
        <div class="order-card-body">
            <div class="order-info-item">
                <span class="order-info-label">Customer</span>
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <img src="${order.users.avatar}" style="width: 30px; height: 30px; border-radius: 50%;" alt="${order.users.username}">
                    <div>
                        <div class="order-info-value">${order.users.username}</div>
                        <div style="font-size: 0.75rem; color: var(--admin-text-muted);">${order.users.email}</div>
                    </div>
                </div>
            </div>
            
            <div class="order-info-item">
                <span class="order-info-label">Product</span>
                <span class="order-info-value">${order.products.name}</span>
            </div>
            
            <div class="order-info-item">
                <span class="order-info-label">Price</span>
                <span class="order-info-value" style="color: var(--admin-purple);">${formatPrice(order.final_price)}</span>
            </div>
            
            <div class="order-info-item">
                <span class="order-info-label">Payment Method</span>
                <span class="order-info-value">${order.payment_methods.name}</span>
            </div>
            
            <div class="order-info-item">
                <span class="order-info-label">Order Date</span>
                <span class="order-info-value">${formatDate(order.created_at)}</span>
            </div>
            
            ${order.coupon_discount > 0 ? `
                <div class="order-info-item">
                    <span class="order-info-label">Coupon Discount</span>
                    <span class="order-info-value" style="color: var(--admin-green);">-${formatPrice(order.coupon_discount)}</span>
                </div>
            ` : ''}
        </div>
        
        ${inputDataHtml ? `
            <div style="margin: 1rem 0; padding: 1rem; background: var(--admin-bg-secondary); border-radius: var(--admin-radius-md); font-size: 0.85rem;">
                <strong style="display: block; margin-bottom: 0.5rem;">Customer Input Data:</strong>
                ${inputDataHtml}
            </div>
        ` : ''}
        
        <div style="margin: 1rem 0;">
            <strong style="display: block; margin-bottom: 0.5rem; font-size: 0.85rem;">Payment Proof:</strong>
            <img src="${order.payment_proof_url}" class="order-proof-image" onclick="viewOrderProof('${order.payment_proof_url}')" alt="Payment Proof">
        </div>
        
        ${order.admin_message ? `
            <div style="margin: 1rem 0; padding: 1rem; background: rgba(102, 126, 234, 0.1); border-radius: var(--admin-radius-md); font-size: 0.85rem;">
                <strong>Your Message:</strong> ${order.admin_message}
            </div>
        ` : ''}
        
        <div class="order-card-footer">
            ${order.status === 'pending' ? `
                <button class="btn-success" onclick="approveOrder('${order.id}')">
                    <i class="fas fa-check"></i> Approve
                </button>
                <button class="btn-danger" onclick="rejectOrder('${order.id}')">
                    <i class="fas fa-times"></i> Reject
                </button>
            ` : ''}
            <button class="btn-secondary" onclick="viewOrderDetails('${order.id}')">
                <i class="fas fa-eye"></i> Details
            </button>
        </div>
    `;
    
    container.appendChild(card);
}

function viewOrderProof(imageUrl) {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.95);
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 2rem;
    `;
    
    modal.innerHTML = `
        <img src="${imageUrl}" style="max-width: 100%; max-height: 100%; border-radius: 12px;">
        <button onclick="this.parentElement.remove()" style="position: absolute; top: 2rem; right: 2rem; width: 50px; height: 50px; background: rgba(255,255,255,0.2); border: none; border-radius: 50%; color: white; cursor: pointer; backdrop-filter: blur(10px); font-size: 1.5rem;">
            ×
        </button>
    `;
    
    modal.addEventListener('click', function(e) {
        if (e.target === this) {
            this.remove();
        }
    });
    
    document.body.appendChild(modal);
}

async function approveOrder(orderId) {
    const message = prompt('Enter a message for the customer (optional):');
    
    showAdminLoader();
    
    try {
        const { error } = await supabase
            .from('orders')
            .update({
                status: 'approved',
                admin_message: message || null,
                approved_at: new Date().toISOString()
            })
            .eq('id', orderId);
        
        if (error) throw error;
        
        // Send notification to user
        const order = AdminState.orders.find(o => o.id === orderId);
        if (order) {
            await supabase
                .from('notifications')
                .insert([{
                    user_id: order.user_id,
                    type: 'order',
                    title: 'Order Approved',
                    message: `Your order #${order.order_id} has been approved!`,
                    data: JSON.stringify({ orderId: order.id }),
                    read: false,
                    created_at: new Date().toISOString()
                }]);
        }
        
        hideAdminLoader();
        showAdminToast('Success', 'Order approved successfully', 'success');
        
        await loadOrders();
        
    } catch (error) {
        console.error('Order approve error:', error);
        hideAdminLoader();
        showAdminToast('Error', 'Failed to approve order', 'error');
    }
}

async function rejectOrder(orderId) {
    const reason = prompt('Enter rejection reason:');
    
    if (!reason) {
        showAdminToast('Warning', 'Please provide a rejection reason', 'warning');
        return;
    }
    
    showAdminLoader();
    
    try {
        const { error } = await supabase
            .from('orders')
            .update({
                status: 'rejected',
                admin_message: reason
            })
            .eq('id', orderId);
        
        if (error) throw error;
        
        // Send notification to user
        const order = AdminState.orders.find(o => o.id === orderId);
        if (order) {
            await supabase
                .from('notifications')
                .insert([{
                    user_id: order.user_id,
                    type: 'order',
                    title: 'Order Rejected',
                    message: `Your order #${order.order_id} has been rejected. Reason: ${reason}`,
                    data: JSON.stringify({ orderId: order.id }),
                    read: false,
                    created_at: new Date().toISOString()
                }]);
        }
        
        hideAdminLoader();
        showAdminToast('Success', 'Order rejected', 'success');
        
        await loadOrders();
        
    } catch (error) {
        console.error('Order reject error:', error);
        hideAdminLoader();
        showAdminToast('Error', 'Failed to reject order', 'error');
    }
}

function viewOrderDetails(orderId) {
    const order = AdminState.orders.find(o => o.id === orderId);
    if (!order) return;
    
    // Create detailed view
    showAdminToast('Order Details', `Order #${order.order_id}`, 'info');
}

/* ========================================
   ADMIN.JS - PART 4
======================================== */

/* ========================================
   USERS MANAGEMENT
======================================== */

async function loadUsers() {
    try {
        const { data: users, error } = await supabase
            .from('users')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        AdminState.users = users || [];
        
        renderUsersList(users);
        
    } catch (error) {
        console.error('Users load error:', error);
        showAdminToast('Error', 'Failed to load users', 'error');
    }
}

function renderUsersList(users) {
    const container = document.getElementById('usersList');
    container.innerHTML = '';
    
    if (!users || users.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-users"></i>
                <h3>No Users</h3>
            </div>
        `;
        return;
    }
    
    users.forEach(user => {
        const card = document.createElement('div');
        card.className = 'user-card-admin';
        
        // Get user stats
        const orderCount = AdminState.orders?.filter(o => o.user_id === user.id).length || 0;
        const approvedCount = AdminState.orders?.filter(o => o.user_id === user.id && o.status === 'approved').length || 0;
        
        card.innerHTML = `
            <img src="${user.avatar}" alt="${user.username}" class="user-avatar-admin">
            <div class="user-info-admin">
                <div class="user-name-admin">${user.username}</div>
                <div class="user-email-admin">${user.email}</div>
                <div class="user-stats-admin">
                    <span><i class="fas fa-shopping-cart"></i> ${orderCount} orders</span>
                    <span><i class="fas fa-check-circle"></i> ${approvedCount} approved</span>
                    <span><i class="fas fa-calendar"></i> Joined ${new Date(user.created_at).toLocaleDateString()}</span>
                </div>
            </div>
            <div class="user-actions-admin">
                <span class="badge-status ${user.status}">${user.status}</span>
                ${user.status === 'active' ? `
                    <button class="icon-btn delete" onclick="blockUser('${user.id}')">
                        <i class="fas fa-ban"></i>
                    </button>
                ` : `
                    <button class="icon-btn edit" onclick="unblockUser('${user.id}')">
                        <i class="fas fa-check"></i>
                    </button>
                `}
                <button class="icon-btn delete" onclick="deleteUser('${user.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        container.appendChild(card);
    });
}

// User search handler
document.getElementById('searchUsers')?.addEventListener('input', function() {
    const query = this.value.toLowerCase();
    
    if (!query) {
        renderUsersList(AdminState.users);
        return;
    }
    
    const filtered = AdminState.users.filter(u => 
        u.username.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query)
    );
    
    renderUsersList(filtered);
});

// User status filter
document.getElementById('filterUserStatus')?.addEventListener('change', function() {
    const status = this.value;
    
    if (!status) {
        renderUsersList(AdminState.users);
        return;
    }
    
    const filtered = AdminState.users.filter(u => u.status === status);
    renderUsersList(filtered);
});

async function blockUser(userId) {
    if (!confirm('Are you sure you want to block this user?')) {
        return;
    }
    
    showAdminLoader();
    
    try {
        const { error } = await supabase
            .from('users')
            .update({ status: 'blocked' })
            .eq('id', userId);
        
        if (error) throw error;
        
        hideAdminLoader();
        showAdminToast('Success', 'User blocked successfully', 'success');
        
        await loadUsers();
        
    } catch (error) {
        console.error('Block user error:', error);
        hideAdminLoader();
        showAdminToast('Error', 'Failed to block user', 'error');
    }
}

async function unblockUser(userId) {
    showAdminLoader();
    
    try {
        const { error } = await supabase
            .from('users')
            .update({ status: 'active' })
            .eq('id', userId);
        
        if (error) throw error;
        
        hideAdminLoader();
        showAdminToast('Success', 'User unblocked successfully', 'success');
        
        await loadUsers();
        
    } catch (error) {
        console.error('Unblock user error:', error);
        hideAdminLoader();
        showAdminToast('Error', 'Failed to unblock user', 'error');
    }
}

async function deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
        return;
    }
    
    showAdminLoader();
    
    try {
        const { error } = await supabase
            .from('users')
            .update({ status: 'deleted' })
            .eq('id', userId);
        
        if (error) throw error;
        
        hideAdminLoader();
        showAdminToast('Success', 'User deleted successfully', 'success');
        
        await loadUsers();
        
    } catch (error) {
        console.error('Delete user error:', error);
        hideAdminLoader();
        showAdminToast('Error', 'Failed to delete user', 'error');
    }
}

/* ========================================
   PAYMENT METHODS MANAGEMENT
======================================== */

async function loadPaymentMethods() {
    try {
        const { data: payments, error } = await supabase
            .from('payment_methods')
            .select('*')
            .order('created_at', { ascending: true });
        
        if (error) throw error;
        
        AdminState.payments = payments || [];
        
        const container = document.getElementById('paymentsList');
        container.innerHTML = '';
        
        if (payments.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-credit-card"></i>
                    <h3>No Payment Methods</h3>
                    <p>Add your first payment method</p>
                </div>
            `;
            return;
        }
        
        payments.forEach(payment => {
            const card = document.createElement('div');
            card.className = 'payment-card';
            
            card.innerHTML = `
                <div class="payment-icon-wrapper">
                    <img src="${payment.icon_url}" alt="${payment.name}">
                </div>
                <div class="payment-name">${payment.name}</div>
                <div class="payment-account">${payment.account_name}</div>
                <div style="font-size: 0.85rem; color: var(--admin-text-secondary); margin-bottom: 1rem;">
                    ${payment.account_number}
                </div>
                <div class="payment-actions">
                    <button class="icon-btn edit" onclick="editPaymentMethod('${payment.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="icon-btn delete" onclick="deletePaymentMethod('${payment.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            
            container.appendChild(card);
        });
        
    } catch (error) {
        console.error('Payment methods load error:', error);
        showAdminToast('Error', 'Failed to load payment methods', 'error');
    }
}

function openPaymentModal() {
    const content = `
        <h2 style="margin-bottom: 1.5rem;">Add Payment Method</h2>
        <form id="paymentForm" onsubmit="submitPaymentMethod(event)">
            <div class="form-group">
                <label>Payment Method Name</label>
                <input type="text" id="paymentName" class="form-control" placeholder="e.g., KBZ Pay" required>
            </div>
            
            <div class="form-group">
                <label>Account Name</label>
                <input type="text" id="paymentAccountName" class="form-control" required>
            </div>
            
            <div class="form-group">
                <label>Account Number / Address</label>
                <input type="text" id="paymentAccountNumber" class="form-control" required>
            </div>
            
            <div class="form-group">
                <label>Instructions</label>
                <textarea id="paymentInstructions" class="form-control" rows="3" placeholder="Enter payment instructions..."></textarea>
            </div>
            
            <div class="form-group">
                <label>Payment Icon</label>
                <input type="file" id="paymentIcon" class="form-control" accept="image/*" required>
            </div>
            
            <div style="display: flex; gap: 1rem;">
                <button type="submit" class="btn-primary">
                    <i class="fas fa-save"></i> Add Payment Method
                </button>
                <button type="button" class="btn-secondary" onclick="closeAdminModal()">Cancel</button>
            </div>
        </form>
    `;
    
    openAdminModal(content);
}

async function submitPaymentMethod(e) {
    e.preventDefault();
    
    const name = document.getElementById('paymentName').value;
    const accountName = document.getElementById('paymentAccountName').value;
    const accountNumber = document.getElementById('paymentAccountNumber').value;
    const instructions = document.getElementById('paymentInstructions').value;
    const iconFile = document.getElementById('paymentIcon').files[0];
    
    if (!iconFile) {
        showAdminToast('Error', 'Please select an icon', 'error');
        return;
    }
    
    showAdminLoader();
    
    try {
        const iconUrl = await uploadFile(iconFile, 'payment-methods');
        
        const { error } = await supabase
            .from('payment_methods')
            .insert([{
                name: name,
                account_name: accountName,
                account_number: accountNumber,
                instructions: instructions,
                icon_url: iconUrl,
                status: 'active',
                created_at: new Date().toISOString()
            }]);
        
        if (error) throw error;
        
        closeAdminModal();
        hideAdminLoader();
        showAdminToast('Success', 'Payment method added successfully', 'success');
        
        await loadPaymentMethods();
        
    } catch (error) {
        console.error('Payment method create error:', error);
        hideAdminLoader();
        showAdminToast('Error', 'Failed to add payment method', 'error');
    }
}

async function editPaymentMethod(paymentId) {
    const payment = AdminState.payments.find(p => p.id === paymentId);
    if (!payment) return;
    
    const content = `
        <h2 style="margin-bottom: 1.5rem;">Edit Payment Method</h2>
        <form id="editPaymentForm" onsubmit="updatePaymentMethod(event, '${paymentId}')">
            <div class="form-group">
                <label>Payment Method Name</label>
                <input type="text" id="editPaymentName" class="form-control" value="${payment.name}" required>
            </div>
            
            <div class="form-group">
                <label>Account Name</label>
                <input type="text" id="editPaymentAccountName" class="form-control" value="${payment.account_name}" required>
            </div>
            
            <div class="form-group">
                <label>Account Number / Address</label>
                <input type="text" id="editPaymentAccountNumber" class="form-control" value="${payment.account_number}" required>
            </div>
            
            <div class="form-group">
                <label>Instructions</label>
                <textarea id="editPaymentInstructions" class="form-control" rows="3">${payment.instructions || ''}</textarea>
            </div>
            
            <div class="form-group">
                <label>Payment Icon (Leave empty to keep current)</label>
                <input type="file" id="editPaymentIcon" class="form-control" accept="image/*">
                <div class="image-preview">
                    <img src="${payment.icon_url}" alt="Current Icon" style="max-height: 80px;">
                </div>
            </div>
            
            <div style="display: flex; gap: 1rem;">
                <button type="submit" class="btn-primary">
                    <i class="fas fa-save"></i> Update Payment Method
                </button>
                <button type="button" class="btn-secondary" onclick="closeAdminModal()">Cancel</button>
            </div>
        </form>
    `;
    
    openAdminModal(content);
}

async function updatePaymentMethod(e, paymentId) {
    e.preventDefault();
    
    const name = document.getElementById('editPaymentName').value;
    const accountName = document.getElementById('editPaymentAccountName').value;
    const accountNumber = document.getElementById('editPaymentAccountNumber').value;
    const instructions = document.getElementById('editPaymentInstructions').value;
    const iconFile = document.getElementById('editPaymentIcon').files[0];
    
    showAdminLoader();
    
    try {
        const { data: currentPayment } = await supabase
            .from('payment_methods')
            .select('icon_url')
            .eq('id', paymentId)
            .single();
        
        let iconUrl = currentPayment.icon_url;
        
        if (iconFile) {
            iconUrl = await uploadFile(iconFile, 'payment-methods');
        }
        
        const { error } = await supabase
            .from('payment_methods')
            .update({
                name: name,
                account_name: accountName,
                account_number: accountNumber,
                instructions: instructions,
                icon_url: iconUrl
            })
            .eq('id', paymentId);
        
        if (error) throw error;
        
        closeAdminModal();
        hideAdminLoader();
        showAdminToast('Success', 'Payment method updated successfully', 'success');
        
        await loadPaymentMethods();
        
    } catch (error) {
        console.error('Payment method update error:', error);
        hideAdminLoader();
        showAdminToast('Error', 'Failed to update payment method', 'error');
    }
}

async function deletePaymentMethod(paymentId) {
    if (!confirm('Are you sure you want to delete this payment method?')) {
        return;
    }
    
    showAdminLoader();
    
    try {
        const { error } = await supabase
            .from('payment_methods')
            .delete()
            .eq('id', paymentId);
        
        if (error) throw error;
        
        hideAdminLoader();
        showAdminToast('Success', 'Payment method deleted successfully', 'success');
        
        await loadPaymentMethods();
        
    } catch (error) {
        console.error('Payment method delete error:', error);
        hideAdminLoader();
        showAdminToast('Error', 'Failed to delete payment method', 'error');
    }
}

/* ========================================
   COUPONS MANAGEMENT
======================================== */

async function loadCoupons() {
    try {
        const { data: coupons, error } = await supabase
            .from('coupons')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        AdminState.coupons = coupons || [];
        
        const container = document.getElementById('couponsList');
        container.innerHTML = '';
        
        if (coupons.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-tags"></i>
                    <h3>No Coupons</h3>
                    <p>Create your first coupon</p>
                </div>
            `;
            return;
        }
        
        for (const coupon of coupons) {
            // Get usage stats
            const { data: usage } = await supabase
                .from('coupon_usage')
                .select('*')
                .eq('coupon_id', coupon.id);
            
            const usageCount = usage?.length || 0;
            
            const card = document.createElement('div');
            card.className = 'coupon-card';
            
            card.innerHTML = `
                <div class="coupon-code">${coupon.code}</div>
                
                <div class="coupon-details">
                    <div class="coupon-detail-item">
                        <div class="coupon-detail-label">Discount</div>
                        <div class="coupon-detail-value">${coupon.discount_percent}%</div>
                    </div>
                    <div class="coupon-detail-item">
                        <div class="coupon-detail-label">Type</div>
                        <div class="coupon-detail-value">${coupon.product_id ? 'Product Specific' : 'All Products'}</div>
                    </div>
                    <div class="coupon-detail-item">
                        <div class="coupon-detail-label">Single Use</div>
                        <div class="coupon-detail-value">${coupon.single_use ? 'Yes' : 'No'}</div>
                    </div>
                    <div class="coupon-detail-item">
                        <div class="coupon-detail-label">Status</div>
                        <div class="coupon-detail-value">
                            <span class="badge-status ${coupon.status}">${coupon.status}</span>
                        </div>
                    </div>
                </div>
                
                <div class="coupon-stats">
                    <div class="coupon-stat">
                        <div class="coupon-stat-value">${usageCount}</div>
                        <div class="coupon-stat-label">Times Used</div>
                    </div>
                </div>
                
                <div class="coupon-actions">
                    <button class="btn-secondary" onclick="sendCoupon('${coupon.id}')">
                        <i class="fas fa-paper-plane"></i> Send
                    </button>
                    <button class="icon-btn edit" onclick="editCoupon('${coupon.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="icon-btn delete" onclick="deleteCoupon('${coupon.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            
            container.appendChild(card);
        }
        
    } catch (error) {
        console.error('Coupons load error:', error);
        showAdminToast('Error', 'Failed to load coupons', 'error');
    }
}

function openCouponModal() {
    const content = `
        <h2 style="margin-bottom: 1.5rem;">Create Coupon</h2>
        <form id="couponForm" onsubmit="submitCoupon(event)">
            <div class="form-group">
                <label>Coupon Code</label>
                <div style="display: flex; gap: 0.5rem;">
                    <input type="text" id="couponCode" class="form-control" required readonly>
                    <button type="button" class="btn-secondary" onclick="generateCouponCode()">
                        <i class="fas fa-random"></i> Generate
                    </button>
                </div>
            </div>
            
            <div class="form-group">
                <label>Discount Percentage</label>
                <input type="number" id="couponDiscount" class="form-control" min="1" max="100" required>
            </div>
            
            <div class="form-group">
                <label>Coupon Type</label>
                <select id="couponType" class="form-control" onchange="toggleCouponProductSelect()">
                    <option value="all">All Products</option>
                    <option value="specific">Specific Product</option>
                </select>
            </div>
            
            <div class="form-group" id="couponProductGroup" style="display: none;">
                <label>Select Product</label>
                <select id="couponProduct" class="form-control">
                    <option value="">Select Product</option>
                </select>
            </div>
            
            <div class="form-group">
                <label>
                    <input type="checkbox" id="couponSingleUse" style="margin-right: 0.5rem;">
                    Single Use Per User
                </label>
            </div>
            
            <div style="display: flex; gap: 1rem;">
                <button type="submit" class="btn-primary">
                    <i class="fas fa-save"></i> Create Coupon
                </button>
                <button type="button" class="btn-secondary" onclick="closeAdminModal()">Cancel</button>
            </div>
        </form>
    `;
    
    openAdminModal(content);
    
    // Load products for selection
    loadCouponProducts();
    
    // Generate initial code
    generateCouponCode();
}

async function loadCouponProducts() {
    const select = document.getElementById('couponProduct');
    if (!select) return;
    
    const { data: products } = await supabase
        .from('products')
        .select('id, name')
        .eq('status', 'active');
    
    products?.forEach(product => {
        select.innerHTML += `<option value="${product.id}">${product.name}</option>`;
    });
}

function generateCouponCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    document.getElementById('couponCode').value = code;
}

function toggleCouponProductSelect() {
    const type = document.getElementById('couponType').value;
    const productGroup = document.getElementById('couponProductGroup');
    
    if (type === 'specific') {
        productGroup.style.display = 'block';
    } else {
        productGroup.style.display = 'none';
    }
}

async function submitCoupon(e) {
    e.preventDefault();
    
    const code = document.getElementById('couponCode').value;
    const discount = parseInt(document.getElementById('couponDiscount').value);
    const type = document.getElementById('couponType').value;
    const productId = document.getElementById('couponProduct').value;
    const singleUse = document.getElementById('couponSingleUse').checked;
    
    showAdminLoader();
    
    try {
        const { error } = await supabase
            .from('coupons')
            .insert([{
                code: code,
                discount_percent: discount,
                product_id: type === 'specific' ? productId : null,
                single_use: singleUse,
                status: 'active',
                created_at: new Date().toISOString()
            }]);
        
        if (error) throw error;
        
        closeAdminModal();
        hideAdminLoader();
        showAdminToast('Success', 'Coupon created successfully', 'success');
        
        await loadCoupons();
        
    } catch (error) {
        console.error('Coupon create error:', error);
        hideAdminLoader();
        showAdminToast('Error', 'Failed to create coupon', 'error');
    }
}

async function sendCoupon(couponId) {
    const coupon = AdminState.coupons.find(c => c.id === couponId);
    if (!coupon) return;
    
    // Get all users
    const { data: users } = await supabase
        .from('users')
        .select('id, username')
        .eq('status', 'active');
    
    let usersOptions = '';
    users?.forEach(user => {
        usersOptions += `<option value="${user.id}">${user.username}</option>`;
    });
    
    const content = `
        <h2 style="margin-bottom: 1.5rem;">Send Coupon</h2>
        <div style="background: var(--admin-bg-secondary); padding: 1rem; border-radius: var(--admin-radius-md); margin-bottom: 1.5rem;">
            <div style="font-size: 1.5rem; font-weight: 700; color: var(--admin-purple); margin-bottom: 0.5rem;">${coupon.code}</div>
            <div style="font-size: 0.9rem; color: var(--admin-text-secondary);">${coupon.discount_percent}% Discount</div>
        </div>
        
        <form id="sendCouponForm" onsubmit="submitSendCoupon(event, '${couponId}')">
            <div class="form-group">
                <label>Send To</label>
                <select id="sendCouponType" class="form-control" onchange="toggleCouponUserSelect()">
                    <option value="all">All Users</option>
                    <option value="specific">Specific Users</option>
                </select>
            </div>
            
            <div class="form-group" id="sendCouponUsersGroup" style="display: none;">
                <label>Select Users</label>
                <select id="sendCouponUsers" class="form-control" multiple size="5">
                    ${usersOptions}
                </select>
                <small style="color: var(--admin-text-muted);">Hold Ctrl/Cmd to select multiple</small>
            </div>
            
            <div style="display: flex; gap: 1rem;">
                <button type="submit" class="btn-primary">
                    <i class="fas fa-paper-plane"></i> Send Coupon
                </button>
                <button type="button" class="btn-secondary" onclick="closeAdminModal()">Cancel</button>
            </div>
        </form>
    `;
    
    openAdminModal(content);
}

function toggleCouponUserSelect() {
    const type = document.getElementById('sendCouponType').value;
    const usersGroup = document.getElementById('sendCouponUsersGroup');
    
    if (type === 'specific') {
        usersGroup.style.display = 'block';
    } else {
        usersGroup.style.display = 'none';
    }
}

async function submitSendCoupon(e, couponId) {
    e.preventDefault();
    
    const type = document.getElementById('sendCouponType').value;
    const coupon = AdminState.coupons.find(c => c.id === couponId);
    
    showAdminLoader();
    
    try {
        let userIds = [];
        
        if (type === 'all') {
            const { data: users } = await supabase
                .from('users')
                .select('id')
                .eq('status', 'active');
            
            userIds = users?.map(u => u.id) || [];
        } else {
            const select = document.getElementById('sendCouponUsers');
            userIds = Array.from(select.selectedOptions).map(option => option.value);
        }
        
        if (userIds.length === 0) {
            showAdminToast('Error', 'Please select at least one user', 'error');
            hideAdminLoader();
            return;
        }
        
        // Send notifications
        const notifications = userIds.map(userId => ({
            user_id: userId,
            type: 'coupon',
            title: 'New Coupon Received!',
            message: `You received a ${coupon.discount_percent}% discount coupon! Code: ${coupon.code}`,
            data: JSON.stringify({ couponCode: coupon.code }),
            read: false,
            created_at: new Date().toISOString()
        }));
        
        const { error } = await supabase
            .from('notifications')
            .insert(notifications);
        
        if (error) throw error;
        
        closeAdminModal();
        hideAdminLoader();
        showAdminToast('Success', `Coupon sent to ${userIds.length} user(s)`, 'success');
        
    } catch (error) {
        console.error('Send coupon error:', error);
        hideAdminLoader();
        showAdminToast('Error', 'Failed to send coupon', 'error');
    }
}

async function editCoupon(couponId) {
    const coupon = AdminState.coupons.find(c => c.id === couponId);
    if (!coupon) return;
    
    const content = `
        <h2 style="margin-bottom: 1.5rem;">Edit Coupon</h2>
        <form id="editCouponForm" onsubmit="updateCoupon(event, '${couponId}')">
            <div class="form-group">
                <label>Coupon Code</label>
                <input type="text" id="editCouponCode" class="form-control" value="${coupon.code}" required readonly>
            </div>
            
            <div class="form-group">
                <label>Discount Percentage</label>
                <input type="number" id="editCouponDiscount" class="form-control" value="${coupon.discount_percent}" min="1" max="100" required>
            </div>
            
            <div class="form-group">
                <label>Status</label>
                <select id="editCouponStatus" class="form-control">
                    <option value="active" ${coupon.status === 'active' ? 'selected' : ''}>Active</option>
                    <option value="inactive" ${coupon.status === 'inactive' ? 'selected' : ''}>Inactive</option>
                </select>
            </div>
            
            <div style="display: flex; gap: 1rem;">
                <button type="submit" class="btn-primary">
                    <i class="fas fa-save"></i> Update Coupon
                </button>
                <button type="button" class="btn-secondary" onclick="closeAdminModal()">Cancel</button>
            </div>
        </form>
    `;
    
    openAdminModal(content);
}

async function updateCoupon(e, couponId) {
    e.preventDefault();
    
    const discount = parseInt(document.getElementById('editCouponDiscount').value);
    const status = document.getElementById('editCouponStatus').value;
    
    showAdminLoader();
    
    try {
        const { error } = await supabase
            .from('coupons')
            .update({
                discount_percent: discount,
                status: status
            })
            .eq('id', couponId);
        
        if (error) throw error;
        
        closeAdminModal();
        hideAdminLoader();
        showAdminToast('Success', 'Coupon updated successfully', 'success');
        
        await loadCoupons();
        
    } catch (error) {
        console.error('Coupon update error:', error);
        hideAdminLoader();
        showAdminToast('Error', 'Failed to update coupon', 'error');
    }
}

async function deleteCoupon(couponId) {
    if (!confirm('Are you sure you want to delete this coupon?')) {
        return;
    }
    
    showAdminLoader();
    
    try {
        const { error } = await supabase
            .from('coupons')
            .delete()
            .eq('id', couponId);
        
        if (error) throw error;
        
        hideAdminLoader();
        showAdminToast('Success', 'Coupon deleted successfully', 'success');
        
        await loadCoupons();
        
    } catch (error) {
        console.error('Coupon delete error:', error);
        hideAdminLoader();
        showAdminToast('Error', 'Failed to delete coupon', 'error');
    }
}

/* ========================================
   ADMIN.JS - PART 5 (FINAL)
======================================== */

/* ========================================
   NEWS MANAGEMENT
======================================== */

async function loadNews() {
    try {
        const { data: news, error } = await supabase
            .from('news')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        AdminState.news = news || [];
        
        const container = document.getElementById('newsList');
        container.innerHTML = '';
        
        if (news.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-newspaper"></i>
                    <h3>No News</h3>
                    <p>Create your first news article</p>
                </div>
            `;
            return;
        }
        
        news.forEach(item => {
            const newsItem = document.createElement('div');
            newsItem.className = 'news-item-admin';
            
            const images = item.images ? JSON.parse(item.images) : [];
            const firstImage = images[0] || '';
            
            newsItem.innerHTML = `
                <div class="news-item-header">
                    ${firstImage ? `
                        <div class="news-item-image">
                            <img src="${firstImage}" alt="${item.title}">
                        </div>
                    ` : ''}
                    <div class="news-item-content">
                        <div class="news-item-title">${item.title}</div>
                        <div class="news-item-description">${item.content}</div>
                        <div class="news-item-meta">
                            <span><i class="fas fa-calendar"></i> ${formatDate(item.created_at)}</span>
                            ${item.video_url ? '<span><i class="fas fa-video"></i> Has Video</span>' : ''}
                            ${images.length > 1 ? `<span><i class="fas fa-images"></i> ${images.length} images</span>` : ''}
                        </div>
                    </div>
                </div>
                <div class="news-item-footer">
                    <span class="badge-status ${item.status}">${item.status}</span>
                    <div style="display: flex; gap: 0.5rem;">
                        <button class="icon-btn edit" onclick="editNews('${item.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="icon-btn delete" onclick="deleteNews('${item.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
            
            container.appendChild(newsItem);
        });
        
    } catch (error) {
        console.error('News load error:', error);
        showAdminToast('Error', 'Failed to load news', 'error');
    }
}

function openNewsModal() {
    const content = `
        <h2 style="margin-bottom: 1.5rem;">Create News</h2>
        <form id="newsForm" onsubmit="submitNews(event)">
            <div class="form-group">
                <label>Title</label>
                <input type="text" id="newsTitle" class="form-control" required>
            </div>
            
            <div class="form-group">
                <label>Content</label>
                <textarea id="newsContent" class="form-control" rows="5" required></textarea>
            </div>
            
            <div class="form-group">
                <label>Images (Multiple allowed, max 50MB total)</label>
                <input type="file" id="newsImages" class="form-control" accept="image/*" multiple>
                <small style="color: var(--admin-text-muted);">Each image max 10MB</small>
            </div>
            
            <div class="form-group">
                <label>Video URL (YouTube or direct link)</label>
                <input type="url" id="newsVideo" class="form-control" placeholder="https://youtube.com/...">
            </div>
            
            <div style="display: flex; gap: 1rem;">
                <button type="submit" class="btn-primary">
                    <i class="fas fa-save"></i> Create News
                </button>
                <button type="button" class="btn-secondary" onclick="closeAdminModal()">Cancel</button>
            </div>
        </form>
    `;
    
    openAdminModal(content);
}

async function submitNews(e) {
    e.preventDefault();
    
    const title = document.getElementById('newsTitle').value;
    const content = document.getElementById('newsContent').value;
    const videoUrl = document.getElementById('newsVideo').value;
    const imageFiles = document.getElementById('newsImages').files;
    
    showAdminLoader();
    
    try {
        // Upload images
        const imageUrls = [];
        
        if (imageFiles.length > 0) {
            // Check total size
            let totalSize = 0;
            for (let file of imageFiles) {
                totalSize += file.size;
                if (file.size > 10 * 1024 * 1024) {
                    showAdminToast('Error', 'Each image must be less than 10MB', 'error');
                    hideAdminLoader();
                    return;
                }
            }
            
            if (totalSize > 50 * 1024 * 1024) {
                showAdminToast('Error', 'Total images size must be less than 50MB', 'error');
                hideAdminLoader();
                return;
            }
            
            // Upload all images
            for (let file of imageFiles) {
                const url = await uploadFile(file, 'news');
                imageUrls.push(url);
            }
        }
        
        const { error } = await supabase
            .from('news')
            .insert([{
                title: title,
                content: content,
                images: imageUrls.length > 0 ? JSON.stringify(imageUrls) : null,
                video_url: videoUrl || null,
                status: 'active',
                created_at: new Date().toISOString()
            }]);
        
        if (error) throw error;
        
        closeAdminModal();
        hideAdminLoader();
        showAdminToast('Success', 'News created successfully', 'success');
        
        await loadNews();
        
    } catch (error) {
        console.error('News create error:', error);
        hideAdminLoader();
        showAdminToast('Error', 'Failed to create news', 'error');
    }
}

async function editNews(newsId) {
    const news = AdminState.news.find(n => n.id === newsId);
    if (!news) return;
    
    const content = `
        <h2 style="margin-bottom: 1.5rem;">Edit News</h2>
        <form id="editNewsForm" onsubmit="updateNews(event, '${newsId}')">
            <div class="form-group">
                <label>Title</label>
                <input type="text" id="editNewsTitle" class="form-control" value="${news.title}" required>
            </div>
            
            <div class="form-group">
                <label>Content</label>
                <textarea id="editNewsContent" class="form-control" rows="5" required>${news.content}</textarea>
            </div>
            
            <div class="form-group">
                <label>Video URL</label>
                <input type="url" id="editNewsVideo" class="form-control" value="${news.video_url || ''}">
            </div>
            
            <div class="form-group">
                <label>Status</label>
                <select id="editNewsStatus" class="form-control">
                    <option value="active" ${news.status === 'active' ? 'selected' : ''}>Active</option>
                    <option value="inactive" ${news.status === 'inactive' ? 'selected' : ''}>Inactive</option>
                </select>
            </div>
            
            <div style="display: flex; gap: 1rem;">
                <button type="submit" class="btn-primary">
                    <i class="fas fa-save"></i> Update News
                </button>
                <button type="button" class="btn-secondary" onclick="closeAdminModal()">Cancel</button>
            </div>
        </form>
    `;
    
    openAdminModal(content);
}

async function updateNews(e, newsId) {
    e.preventDefault();
    
    const title = document.getElementById('editNewsTitle').value;
    const content = document.getElementById('editNewsContent').value;
    const videoUrl = document.getElementById('editNewsVideo').value;
    const status = document.getElementById('editNewsStatus').value;
    
    showAdminLoader();
    
    try {
        const { error } = await supabase
            .from('news')
            .update({
                title: title,
                content: content,
                video_url: videoUrl || null,
                status: status
            })
            .eq('id', newsId);
        
        if (error) throw error;
        
        closeAdminModal();
        hideAdminLoader();
        showAdminToast('Success', 'News updated successfully', 'success');
        
        await loadNews();
        
    } catch (error) {
        console.error('News update error:', error);
        hideAdminLoader();
        showAdminToast('Error', 'Failed to update news', 'error');
    }
}

async function deleteNews(newsId) {
    if (!confirm('Are you sure you want to delete this news?')) {
        return;
    }
    
    showAdminLoader();
    
    try {
        const { error } = await supabase
            .from('news')
            .delete()
            .eq('id', newsId);
        
        if (error) throw error;
        
        hideAdminLoader();
        showAdminToast('Success', 'News deleted successfully', 'success');
        
        await loadNews();
        
    } catch (error) {
        console.error('News delete error:', error);
        hideAdminLoader();
        showAdminToast('Error', 'Failed to delete news', 'error');
    }
}

/* ========================================
   CONTACTS MANAGEMENT
======================================== */

async function loadContacts() {
    try {
        const { data: contacts, error } = await supabase
            .from('contacts')
            .select('*')
            .order('created_at', { ascending: true });
        
        if (error) throw error;
        
        AdminState.contacts = contacts || [];
        
        const container = document.getElementById('contactsList');
        container.innerHTML = '';
        
        if (contacts.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-address-book"></i>
                    <h3>No Contacts</h3>
                    <p>Add your first contact</p>
                </div>
            `;
            return;
        }
        
        contacts.forEach(contact => {
            const card = document.createElement('div');
            card.className = 'item-card';
            
            card.innerHTML = `
                <div style="text-align: center;">
                    <div style="width: 60px; height: 60px; margin: 0 auto 1rem; background: var(--admin-bg-secondary); border-radius: var(--admin-radius-md); display: flex; align-items: center; justify-content: center;">
                        <img src="${contact.icon_url}" style="max-width: 40px; max-height: 40px;" alt="${contact.name}">
                    </div>
                    <div style="font-weight: 600; margin-bottom: 0.5rem;">${contact.name}</div>
                    ${contact.description ? `<div style="font-size: 0.85rem; color: var(--admin-text-secondary); margin-bottom: 1rem;">${contact.description}</div>` : ''}
                    <div style="display: flex; gap: 0.5rem; justify-content: center;">
                        <button class="icon-btn edit" onclick="editContact('${contact.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="icon-btn delete" onclick="deleteContact('${contact.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
            
            container.appendChild(card);
        });
        
    } catch (error) {
        console.error('Contacts load error:', error);
        showAdminToast('Error', 'Failed to load contacts', 'error');
    }
}

function openContactModal() {
    const content = `
        <h2 style="margin-bottom: 1.5rem;">Add Contact</h2>
        <form id="contactForm" onsubmit="submitContact(event)">
            <div class="form-group">
                <label>Contact Name</label>
                <input type="text" id="contactName" class="form-control" placeholder="e.g., Facebook" required>
            </div>
            
            <div class="form-group">
                <label>Description</label>
                <textarea id="contactDescription" class="form-control" rows="2"></textarea>
            </div>
            
            <div class="form-group">
                <label>Contact Link</label>
                <input type="url" id="contactLink" class="form-control" placeholder="https://" required>
            </div>
            
            <div class="form-group">
                <label>Icon</label>
                <input type="file" id="contactIcon" class="form-control" accept="image/*" required>
            </div>
            
            <div style="display: flex; gap: 1rem;">
                <button type="submit" class="btn-primary">
                    <i class="fas fa-save"></i> Add Contact
                </button>
                <button type="button" class="btn-secondary" onclick="closeAdminModal()">Cancel</button>
            </div>
        </form>
    `;
    
    openAdminModal(content);
}

async function submitContact(e) {
    e.preventDefault();
    
    const name = document.getElementById('contactName').value;
    const description = document.getElementById('contactDescription').value;
    const link = document.getElementById('contactLink').value;
    const iconFile = document.getElementById('contactIcon').files[0];
    
    if (!iconFile) {
        showAdminToast('Error', 'Please select an icon', 'error');
        return;
    }
    
    showAdminLoader();
    
    try {
        const iconUrl = await uploadFile(iconFile, 'contacts');
        
        const { error } = await supabase
            .from('contacts')
            .insert([{
                name: name,
                description: description,
                link: link,
                icon_url: iconUrl,
                status: 'active',
                created_at: new Date().toISOString()
            }]);
        
        if (error) throw error;
        
        closeAdminModal();
        hideAdminLoader();
        showAdminToast('Success', 'Contact added successfully', 'success');
        
        await loadContacts();
        
    } catch (error) {
        console.error('Contact create error:', error);
        hideAdminLoader();
        showAdminToast('Error', 'Failed to add contact', 'error');
    }
}

async function editContact(contactId) {
    const contact = AdminState.contacts.find(c => c.id === contactId);
    if (!contact) return;
    
    const content = `
        <h2 style="margin-bottom: 1.5rem;">Edit Contact</h2>
        <form id="editContactForm" onsubmit="updateContact(event, '${contactId}')">
            <div class="form-group">
                <label>Contact Name</label>
                <input type="text" id="editContactName" class="form-control" value="${contact.name}" required>
            </div>
            
            <div class="form-group">
                <label>Description</label>
                <textarea id="editContactDescription" class="form-control" rows="2">${contact.description || ''}</textarea>
            </div>
            
            <div class="form-group">
                <label>Contact Link</label>
                <input type="url" id="editContactLink" class="form-control" value="${contact.link}" required>
            </div>
            
            <div class="form-group">
                <label>Icon (Leave empty to keep current)</label>
                <input type="file" id="editContactIcon" class="form-control" accept="image/*">
                <div class="image-preview">
                    <img src="${contact.icon_url}" alt="Current Icon" style="max-height: 60px;">
                </div>
            </div>
            
            <div style="display: flex; gap: 1rem;">
                <button type="submit" class="btn-primary">
                    <i class="fas fa-save"></i> Update Contact
                </button>
                <button type="button" class="btn-secondary" onclick="closeAdminModal()">Cancel</button>
            </div>
        </form>
    `;
    
    openAdminModal(content);
}

async function updateContact(e, contactId) {
    e.preventDefault();
    
    const name = document.getElementById('editContactName').value;
    const description = document.getElementById('editContactDescription').value;
    const link = document.getElementById('editContactLink').value;
    const iconFile = document.getElementById('editContactIcon').files[0];
    
    showAdminLoader();
    
    try {
        const { data: currentContact } = await supabase
            .from('contacts')
            .select('icon_url')
            .eq('id', contactId)
            .single();
        
        let iconUrl = currentContact.icon_url;
        
        if (iconFile) {
            iconUrl = await uploadFile(iconFile, 'contacts');
        }
        
        const { error } = await supabase
            .from('contacts')
            .update({
                name: name,
                description: description,
                link: link,
                icon_url: iconUrl
            })
            .eq('id', contactId);
        
        if (error) throw error;
        
        closeAdminModal();
        hideAdminLoader();
        showAdminToast('Success', 'Contact updated successfully', 'success');
        
        await loadContacts();
        
    } catch (error) {
        console.error('Contact update error:', error);
        hideAdminLoader();
        showAdminToast('Error', 'Failed to update contact', 'error');
    }
}

async function deleteContact(contactId) {
    if (!confirm('Are you sure you want to delete this contact?')) {
        return;
    }
    
    showAdminLoader();
    
    try {
        const { error } = await supabase
            .from('contacts')
            .delete()
            .eq('id', contactId);
        
        if (error) throw error;
        
        hideAdminLoader();
        showAdminToast('Success', 'Contact deleted successfully', 'success');
        
        await loadContacts();
        
    } catch (error) {
        console.error('Contact delete error:', error);
        hideAdminLoader();
        showAdminToast('Error', 'Failed to delete contact', 'error');
    }
}

/* ========================================
   BANNERS MANAGEMENT
======================================== */

async function loadBanners() {
    try {
        const { data: banners, error } = await supabase
            .from('banners')
            .select('*')
            .order('order', { ascending: true });
        
        if (error) throw error;
        
        AdminState.banners = banners || [];
        
        // Separate by type
        const mainBanners = banners.filter(b => b.type === 'main');
        const secondaryBanners = banners.filter(b => b.type === 'secondary');
        const productBanners = banners.filter(b => b.type === 'product');
        
        renderBannersList('mainBannersList', mainBanners);
        renderBannersList('secondaryBannersList', secondaryBanners);
        renderBannersList('productBannersList', productBanners);
        
    } catch (error) {
        console.error('Banners load error:', error);
        showAdminToast('Error', 'Failed to load banners', 'error');
    }
}

function renderBannersList(containerId, banners) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    
    if (!banners || banners.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No banners</p></div>';
        return;
    }
    
    banners.forEach(banner => {
        const card = document.createElement('div');
        card.className = 'banner-card';
        
        card.innerHTML = `
            <img src="${banner.image_url}" alt="${banner.title || 'Banner'}" class="banner-image">
            <div class="banner-info">
                <span class="banner-type">${banner.type}</span>
                ${banner.title ? `<div style="font-weight: 600; margin-bottom: 0.5rem;">${banner.title}</div>` : ''}
                ${banner.link ? `<div style="font-size: 0.85rem; color: var(--admin-text-muted);">Has link</div>` : ''}
                <div class="banner-actions">
                    <button class="icon-btn edit" onclick="editBanner('${banner.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="icon-btn delete" onclick="deleteBanner('${banner.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
        
        container.appendChild(card);
    });
}

function openBannerModal() {
    const content = `
        <h2 style="margin-bottom: 1.5rem;">Add Banner</h2>
        <form id="bannerForm" onsubmit="submitBanner(event)">
            <div class="form-group">
                <label>Banner Type</label>
                <select id="bannerType" class="form-control" required>
                    <option value="main">Main Banner (1280x720)</option>
                    <option value="secondary">Secondary Banner (1280x180)</option>
                    <option value="product">Product Page Banner</option>
                </select>
            </div>
            
            <div class="form-group">
                <label>Title (Optional)</label>
                <input type="text" id="bannerTitle" class="form-control">
            </div>
            
            <div class="form-group">
                <label>Link (Optional - for secondary banners)</label>
                <input type="url" id="bannerLink" class="form-control" placeholder="https://">
            </div>
            
            <div class="form-group">
                <label>Banner Image</label>
                <input type="file" id="bannerImage" class="form-control" accept="image/*" required>
            </div>
            
            <div style="display: flex; gap: 1rem;">
                <button type="submit" class="btn-primary">
                    <i class="fas fa-save"></i> Add Banner
                </button>
                <button type="button" class="btn-secondary" onclick="closeAdminModal()">Cancel</button>
            </div>
        </form>
    `;
    
    openAdminModal(content);
}

async function submitBanner(e) {
    e.preventDefault();
    
    const type = document.getElementById('bannerType').value;
    const title = document.getElementById('bannerTitle').value;
    const link = document.getElementById('bannerLink').value;
    const imageFile = document.getElementById('bannerImage').files[0];
    
    if (!imageFile) {
        showAdminToast('Error', 'Please select an image', 'error');
        return;
    }
    
    showAdminLoader();
    
    try {
        const imageUrl = await uploadFile(imageFile, 'banners');
        
        const { error } = await supabase
            .from('banners')
            .insert([{
                type: type,
                title: title || null,
                image_url: imageUrl,
                link: link || null,
                order: 0,
                status: 'active',
                created_at: new Date().toISOString()
            }]);
        
        if (error) throw error;
        
        closeAdminModal();
        hideAdminLoader();
        showAdminToast('Success', 'Banner added successfully', 'success');
        
        await loadBanners();
        
    } catch (error) {
        console.error('Banner create error:', error);
        hideAdminLoader();
        showAdminToast('Error', 'Failed to add banner', 'error');
    }
}

async function editBanner(bannerId) {
    const banner = AdminState.banners.find(b => b.id === bannerId);
    if (!banner) return;
    
    const content = `
        <h2 style="margin-bottom: 1.5rem;">Edit Banner</h2>
        <form id="editBannerForm" onsubmit="updateBanner(event, '${bannerId}')">
            <div class="form-group">
                <label>Title</label>
                <input type="text" id="editBannerTitle" class="form-control" value="${banner.title || ''}">
            </div>
            
            <div class="form-group">
                <label>Link</label>
                <input type="url" id="editBannerLink" class="form-control" value="${banner.link || ''}">
            </div>
            
            <div class="form-group">
                <label>Image (Leave empty to keep current)</label>
                <input type="file" id="editBannerImage" class="form-control" accept="image/*">
                <div class="image-preview">
                    <img src="${banner.image_url}" alt="Current Banner">
                </div>
            </div>
            
            <div style="display: flex; gap: 1rem;">
                <button type="submit" class="btn-primary">
                    <i class="fas fa-save"></i> Update Banner
                </button>
                <button type="button" class="btn-secondary" onclick="closeAdminModal()">Cancel</button>
            </div>
        </form>
    `;
    
    openAdminModal(content);
}

async function updateBanner(e, bannerId) {
    e.preventDefault();
    
    const title = document.getElementById('editBannerTitle').value;
    const link = document.getElementById('editBannerLink').value;
    const imageFile = document.getElementById('editBannerImage').files[0];
    
    showAdminLoader();
    
    try {
        const { data: currentBanner } = await supabase
            .from('banners')
            .select('image_url')
            .eq('id', bannerId)
            .single();
        
        let imageUrl = currentBanner.image_url;
        
        if (imageFile) {
            imageUrl = await uploadFile(imageFile, 'banners');
        }
        
        const { error } = await supabase
            .from('banners')
            .update({
                title: title || null,
                link: link || null,
                image_url: imageUrl
            })
            .eq('id', bannerId);
        
        if (error) throw error;
        
        closeAdminModal();
        hideAdminLoader();
        showAdminToast('Success', 'Banner updated successfully', 'success');
        
        await loadBanners();
        
    } catch (error) {
        console.error('Banner update error:', error);
        hideAdminLoader();
        showAdminToast('Error', 'Failed to update banner', 'error');
    }
}

async function deleteBanner(bannerId) {
    if (!confirm('Are you sure you want to delete this banner?')) {
        return;
    }
    
    showAdminLoader();
    
    try {
        const { error } = await supabase
            .from('banners')
            .delete()
            .eq('id', bannerId);
        
        if (error) throw error;
        
        hideAdminLoader();
        showAdminToast('Success', 'Banner deleted successfully', 'success');
        
        await loadBanners();
        
    } catch (error) {
        console.error('Banner delete error:', error);
        hideAdminLoader();
        showAdminToast('Error', 'Failed to delete banner', 'error');
    }
}

/* ========================================
   MUSIC MANAGEMENT
======================================== */

async function loadMusic() {
    try {
        const { data: music, error } = await supabase
            .from('music')
            .select('*')
            .order('order', { ascending: true });
        
        if (error) throw error;
        
        AdminState.music = music || [];
        
        const container = document.getElementById('musicList');
        container.innerHTML = '';
        
        if (music.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-music"></i>
                    <h3>No Music</h3>
                    <p>Add your first background music</p>
                </div>
            `;
            return;
        }
        
        music.forEach((song, index) => {
            const item = document.createElement('div');
            item.className = 'music-item';
            
            item.innerHTML = `
                <div class="music-icon">
                    <i class="fas fa-music"></i>
                </div>
                <div class="music-info">
                    <div class="music-name">${song.name}</div>
                    <div class="music-details">Order: ${index + 1} • ${song.status}</div>
                </div>
                <div class="music-actions">
                    <button class="icon-btn edit" onclick="editMusic('${song.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="icon-btn delete" onclick="deleteMusic('${song.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            
            container.appendChild(item);
        });
        
    } catch (error) {
        console.error('Music load error:', error);
        showAdminToast('Error', 'Failed to load music', 'error');
    }
}

function openMusicModal() {
    const content = `
        <h2 style="margin-bottom: 1.5rem;">Add Music</h2>
        <form id="musicForm" onsubmit="submitMusic(event)">
            <div class="form-group">
                <label>Music Name</label>
                <input type="text" id="musicName" class="form-control" required>
            </div>
            
            <div class="form-group">
                <label>Music File (MP3, max 50MB)</label>
                <input type="file" id="musicFile" class="form-control" accept="audio/mp3,audio/mpeg" required>
            </div>
            
            <div style="display: flex; gap: 1rem;">
                <button type="submit" class="btn-primary">
                    <i class="fas fa-save"></i> Add Music
                </button>
                <button type="button" class="btn-secondary" onclick="closeAdminModal()">Cancel</button>
            </div>
        </form>
    `;
    
    openAdminModal(content);
}

async function submitMusic(e) {
    e.preventDefault();
    
    const name = document.getElementById('musicName').value;
    const musicFile = document.getElementById('musicFile').files[0];
    
    if (!musicFile) {
        showAdminToast('Error', 'Please select a music file', 'error');
        return;
    }
    
    if (musicFile.size > 50 * 1024 * 1024) {
        showAdminToast('Error', 'File size must be less than 50MB', 'error');
        return;
    }
    
    showAdminLoader();
    
    try {
        const fileUrl = await uploadFile(musicFile, 'music');
        
        const { error } = await supabase
            .from('music')
            .insert([{
                name: name,
                file_url: fileUrl,
                order: 0,
                status: 'active',
                created_at: new Date().toISOString()
            }]);
        
        if (error) throw error;
        
        closeAdminModal();
        hideAdminLoader();
        showAdminToast('Success', 'Music added successfully', 'success');
        
        await loadMusic();
        
    } catch (error) {
        console.error('Music create error:', error);
        hideAdminLoader();
        showAdminToast('Error', 'Failed to add music', 'error');
    }
}

async function editMusic(musicId) {
    const music = AdminState.music.find(m => m.id === musicId);
    if (!music) return;
    
    const content = `
        <h2 style="margin-bottom: 1.5rem;">Edit Music</h2>
        <form id="editMusicForm" onsubmit="updateMusic(event, '${musicId}')">
            <div class="form-group">
                <label>Music Name</label>
                <input type="text" id="editMusicName" class="form-control" value="${music.name}" required>
            </div>
            
            <div class="form-group">
                <label>Status</label>
                <select id="editMusicStatus" class="form-control">
                    <option value="active" ${music.status === 'active' ? 'selected' : ''}>Active</option>
                    <option value="inactive" ${music.status === 'inactive' ? 'selected' : ''}>Inactive</option>
                </select>
            </div>
            
            <div style="display: flex; gap: 1rem;">
                <button type="submit" class="btn-primary">
                    <i class="fas fa-save"></i> Update Music
                </button>
                <button type="button" class="btn-secondary" onclick="closeAdminModal()">Cancel</button>
            </div>
        </form>
    `;
    
    openAdminModal(content);
}

async function updateMusic(e, musicId) {
    e.preventDefault();
    
    const name = document.getElementById('editMusicName').value;
    const status = document.getElementById('editMusicStatus').value;
    
    showAdminLoader();
    
    try {
        const { error } = await supabase
            .from('music')
            .update({
                name: name,
                status: status
            })
            .eq('id', musicId);
        
        if (error) throw error;
        
        closeAdminModal();
        hideAdminLoader();
        showAdminToast('Success', 'Music updated successfully', 'success');
        
        await loadMusic();
        
    } catch (error) {
        console.error('Music update error:', error);
        hideAdminLoader();
        showAdminToast('Error', 'Failed to update music', 'error');
    }
}

async function deleteMusic(musicId) {
    if (!confirm('Are you sure you want to delete this music?')) {
        return;
    }
    
    showAdminLoader();
    
    try {
        const { error } = await supabase
            .from('music')
            .delete()
            .eq('id', musicId);
        
        if (error) throw error;
        
        hideAdminLoader();
        showAdminToast('Success', 'Music deleted successfully', 'success');
        
        await loadMusic();
        
    } catch (error) {
        console.error('Music delete error:', error);
        hideAdminLoader();
        showAdminToast('Error', 'Failed to delete music', 'error');
    }
}

/* ========================================
   SEND NOTIFICATIONS
======================================== */

document.getElementById('notificationType')?.addEventListener('change', function() {
    const type = this.value;
    const usersGroup = document.getElementById('specificUsersGroup');
    
    if (type === 'specific') {
        usersGroup.style.display = 'block';
        loadNotificationUsers();
    } else {
        usersGroup.style.display = 'none';
    }
});

async function loadNotificationUsers() {
    const { data: users } = await supabase
        .from('users')
        .select('id, username, email')
        .eq('status', 'active');
    
    const select = document.getElementById('notificationUsers');
    select.innerHTML = '';
    
    users?.forEach(user => {
        const option = document.createElement('option');
        option.value = user.id;
        option.textContent = `${user.username} (${user.email})`;
        select.appendChild(option);
    });
}

async function sendNotification() {
    const type = document.getElementById('notificationType').value;
    const title = document.getElementById('notificationTitle').value;
    const message = document.getElementById('notificationMessage').value;
    
    if (!title || !message) {
        showAdminToast('Error', 'Please fill in all fields', 'error');
        return;
    }
    
    showAdminLoader();
    
    try {
        let userIds = [];
        
        if (type === 'all') {
            const { data: users } = await supabase
                .from('users')
                .select('id')
                .eq('status', 'active');
            
            userIds = users?.map(u => u.id) || [];
        } else {
            const select = document.getElementById('notificationUsers');
            userIds = Array.from(select.selectedOptions).map(option => option.value);
        }
        
        if (userIds.length === 0) {
            showAdminToast('Error', 'No users selected', 'error');
            hideAdminLoader();
            return;
        }
        
        const notifications = userIds.map(userId => ({
            user_id: userId,
            type: 'message',
            title: title,
            message: message,
            read: false,
            created_at: new Date().toISOString()
        }));
        
        const { error } = await supabase
            .from('notifications')
            .insert(notifications);
        
        if (error) throw error;
        
        // Clear form
        document.getElementById('notificationTitle').value = '';
        document.getElementById('notificationMessage').value = '';
        
        hideAdminLoader();
        showAdminToast('Success', `Notification sent to ${userIds.length} user(s)`, 'success');
        
    } catch (error) {
        console.error('Notification send error:', error);
        hideAdminLoader();
        showAdminToast('Error', 'Failed to send notification', 'error');
    }
}

/* ========================================
   ANALYTICS
======================================== */

async function loadAnalytics() {
    // Charts will be initialized here
    showAdminToast('Info', 'Analytics page loaded', 'info');
}

/* ========================================
   END OF ADMIN.JS
======================================== */
