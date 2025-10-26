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
