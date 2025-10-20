// admin.js - Complete Fixed Version
const CONFIG = {
    supabase: {
        url: 'https://mgbltiztcxxeibocqgqd.supabase.co',
        anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1nYmx0aXp0Y3h4ZWlib2NxZ3FkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5Njg0OTQsImV4cCI6MjA3NjU0NDQ5NH0.GXpTp1O7r2weHeHInMGkAhWvVgejIKgRhK9LgBKaITc',
        serviceKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1nYmx0aXp0Y3h4ZWlib2NxZ3FkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDk2ODQ5NCwiZXhwIjoyMDc2NTQ0NDk0fQ.sJsej-yj5E6PTGqpAnOLrN1NbsYKjf5UwaJrlG7uS8Y'
    },
    autoRefreshInterval: 30000,
    enableRealtime: true
};

const supabase = window.supabase.createClient(CONFIG.supabase.url, CONFIG.supabase.anonKey);
const supabaseAdmin = window.supabase.createClient(CONFIG.supabase.url, CONFIG.supabase.serviceKey);

let currentTab = 'orders';
let currentOrderFilter = 'pending';
let autoRefreshTimer = null;
let orderSubscription = null;

const elements = {
    loginScreen: document.getElementById('login-screen'),
    adminDashboard: document.getElementById('admin-dashboard'),
    loginForm: document.getElementById('login-form'),
    unipinSettingsForm: document.getElementById('unipin-settings-form'),
    exchangeRateForm: document.getElementById('exchange-rate-form'),
    passwordForm: document.getElementById('password-form'),
    shopSettingsForm: document.getElementById('shop-settings-form'),
    paymentForm: document.getElementById('payment-form'),
    ordersTbody: document.getElementById('orders-tbody'),
    logsTbody: document.getElementById('logs-tbody'),
    paymentsGrid: document.getElementById('payments-grid'),
    packagesGrid: document.getElementById('packages-grid'),
    orderDetailContent: document.getElementById('order-detail-content'),
    orderModal: document.getElementById('order-modal'),
    paymentModal: document.getElementById('payment-modal'),
    confirmModal: document.getElementById('confirm-modal'),
    toast: document.getElementById('toast'),
    loadingOverlay: document.getElementById('loading-overlay')
};

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Admin Panel Initializing...');
    checkAuth();
    setupEventListeners();
});

function checkAuth() {
    const isLoggedIn = sessionStorage.getItem('admin_logged_in');
    if (isLoggedIn === 'true') {
        showDashboard();
    } else {
        elements.loginScreen.style.display = 'flex';
    }
}

elements.loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = document.getElementById('admin-password').value;
    const submitBtn = e.target.querySelector('button[type="submit"]');
    setButtonLoading(submitBtn, true);
    
    try {
        console.log('🔐 Attempting login...');
        const { data, error } = await supabase
            .from('settings')
            .select('value')
            .eq('key', 'admin_password')
            .single();

        if (error) throw error;

        if (password === data.value) {
            sessionStorage.setItem('admin_logged_in', 'true');
            await logAdminAction('admin_login', null, null, { success: true });
            console.log('✅ Login successful');
            showDashboard();
        } else {
            showToast('Invalid password!', 'error');
            await logAdminAction('admin_login', null, null, { success: false });
        }
    } catch (error) {
        console.error('❌ Login error:', error);
        showToast('Login failed: ' + error.message, 'error');
    } finally {
        setButtonLoading(submitBtn, false);
    }
});

document.getElementById('logout-btn').addEventListener('click', () => {
    logAdminAction('admin_logout');
    sessionStorage.removeItem('admin_logged_in');
    location.reload();
});

function showDashboard() {
    elements.loginScreen.style.display = 'none';
    elements.adminDashboard.style.display = 'block';
    console.log('📊 Loading dashboard...');
    loadDashboard();
    if (CONFIG.enableRealtime) setupRealtimeSubscriptions();
    startAutoRefresh();
}

function setupEventListeners() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
    
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => filterOrders(btn.dataset.status));
    });
    
    document.getElementById('add-payment-btn').addEventListener('click', () => {
        elements.paymentModal.style.display = 'block';
    });
    
    document.getElementById('sync-packages-btn').addEventListener('click', syncPackagesFromUnipin);
    
    elements.unipinSettingsForm.addEventListener('submit', saveUnipinSettings);
    elements.exchangeRateForm.addEventListener('submit', saveExchangeRate);
    elements.passwordForm.addEventListener('submit', changePassword);
    elements.shopSettingsForm.addEventListener('submit', saveShopSettings);
    elements.paymentForm.addEventListener('submit', savePaymentMethod);
    
    document.querySelectorAll('.modal .close').forEach(btn => {
        btn.addEventListener('click', function() {
            this.closest('.modal').style.display = 'none';
        });
    });
    
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });
}

async function loadDashboard() {
    try {
        await Promise.all([
            loadStats(),
            loadOrders(),
            loadPaymentMethods(),
            loadPackages(),
            loadSettings(),
            checkUnipinStatus()
        ]);
        console.log('✅ Dashboard loaded');
    } catch (error) {
        console.error('❌ Dashboard load error:', error);
        showToast('Failed to load dashboard', 'error');
    }
}

async function loadStats() {
    try {
        console.log('📊 Loading statistics...');
        const { data, error } = await supabaseAdmin.rpc('calculate_order_stats');
        if (error) throw error;

        const stats = data[0];
        document.getElementById('stat-pending').textContent = stats.pending_orders || 0;
        document.getElementById('stat-processing').textContent = 0;
        document.getElementById('stat-completed').textContent = stats.completed_orders || 0;
        document.getElementById('stat-revenue').textContent = formatPrice(stats.total_revenue || 0) + ' MMK';
        document.getElementById('badge-orders').textContent = stats.pending_orders || 0;
        document.getElementById('count-pending').textContent = stats.pending_orders || 0;
        document.getElementById('count-completed').textContent = stats.completed_orders || 0;
        document.getElementById('count-failed').textContent = stats.failed_orders || 0;
        document.getElementById('stat-completed-today').textContent = `Today: ${stats.today_orders || 0} orders`;
        document.getElementById('stat-revenue-today').textContent = `Today: ${formatPrice(stats.today_revenue || 0)} MMK`;
        console.log('✅ Stats loaded');
    } catch (error) {
        console.error('❌ Stats error:', error);
    }
}

async function loadOrders() {
    try {
        console.log('📦 Loading orders...');
        let query = supabaseAdmin
            .from('orders')
            .select(`*, diamond_packages (id, name, diamonds, price_mmk), payment_methods (id, name, type)`)
            .order('created_at', { ascending: false })
            .limit(100);

        if (currentOrderFilter !== 'all') {
            query = query.eq('status', currentOrderFilter);
        }

        const { data, error } = await query;
        if (error) throw error;

        displayOrders(data);
        console.log(`✅ Loaded ${data.length} orders`);
    } catch (error) {
        console.error('❌ Load orders error:', error);
        elements.ordersTbody.innerHTML = '<tr><td colspan="8" class="error">Failed to load</td></tr>';
    }
}

function displayOrders(orders) {
    if (!orders || orders.length === 0) {
        elements.ordersTbody.innerHTML = '<tr><td colspan="8" class="empty">No orders</td></tr>';
        return;
    }

    elements.ordersTbody.innerHTML = '';

    orders.forEach(order => {
        const tr = document.createElement('tr');
        tr.className = `order-row status-${order.status}`;
        const packageName = order.diamond_packages?.name || 'Unknown';
        const paymentName = order.payment_methods?.name || 'Unknown';
        
        tr.innerHTML = `
            <td><div class="order-id">${order.reference_no}</div><small>${order.id.substring(0, 8)}</small></td>
            <td><strong>${packageName}</strong><br><small>${order.diamond_packages?.diamonds || 0} 💎</small></td>
            <td><div class="ml-account"><strong>${order.ml_username || 'N/A'}</strong><br><small>${order.ml_user_id}(${order.ml_zone_id})</small></div></td>
            <td>${paymentName}</td>
            <td><strong>${formatPrice(order.amount)} MMK</strong></td>
            <td><span class="status-badge status-${order.status}">${getStatusIcon(order.status)} ${order.status.toUpperCase()}</span></td>
            <td><div class="order-date">${formatDateTime(order.created_at)}</div></td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm btn-primary" onclick="viewOrder('${order.id}')">👁️</button>
                    ${order.status === 'pending' ? `
                        <button class="btn btn-sm btn-success" onclick="approveOrder('${order.id}')">✓</button>
                        <button class="btn btn-sm btn-danger" onclick="rejectOrder('${order.id}')">✗</button>
                    ` : ''}
                </div>
            </td>
        `;
        elements.ordersTbody.appendChild(tr);
    });
}

async function viewOrder(orderId) {
    showLoadingOverlay('Loading...');
    try {
        console.log('📋 Loading order:', orderId);
        const { data: order, error } = await supabaseAdmin
            .from('orders')
            .select(`*, diamond_packages (*), payment_methods (*)`)
            .eq('id', orderId)
            .single();

        if (error) throw error;

        elements.orderDetailContent.innerHTML = `
            <div class="order-detail">
                <div class="detail-grid">
                    <div class="detail-section">
                        <h4>📋 Order Info</h4>
                        <div class="detail-row"><span>ID:</span><span>${order.id}</span></div>
                        <div class="detail-row"><span>Ref:</span><span><strong>${order.reference_no}</strong></span></div>
                        <div class="detail-row"><span>Status:</span><span><span class="status-badge status-${order.status}">${getStatusIcon(order.status)} ${order.status.toUpperCase()}</span></span></div>
                        <div class="detail-row"><span>Created:</span><span>${formatDateTime(order.created_at)}</span></div>
                    </div>
                    <div class="detail-section">
                        <h4>💎 Package</h4>
                        <div class="detail-row"><span>Name:</span><span>${order.diamond_packages.name}</span></div>
                        <div class="detail-row"><span>Diamonds:</span><span><strong>${order.diamond_packages.diamonds} 💎</strong></span></div>
                        <div class="detail-row"><span>Amount:</span><span><strong>${formatPrice(order.amount)} MMK</strong></span></div>
                    </div>
                    <div class="detail-section">
                        <h4>🎮 ML Account</h4>
                        <div class="detail-row"><span>User ID:</span><span><code>${order.ml_user_id}</code></span></div>
                        <div class="detail-row"><span>Zone ID:</span><span><code>${order.ml_zone_id}</code></span></div>
                        <div class="detail-row"><span>Username:</span><span>${order.ml_username || 'N/A'}</span></div>
                    </div>
                    <div class="detail-section">
                        <h4>💳 Payment</h4>
                        <div class="detail-row"><span>Method:</span><span>${order.payment_methods.name}</span></div>
                        <div class="detail-row"><span>Account:</span><span>${order.payment_methods.account_name}</span></div>
                    </div>
                </div>
                ${order.payment_proof_url ? `
                    <div class="detail-section full-width">
                        <h4>📸 Payment Proof</h4>
                        <img src="${order.payment_proof_url}" class="proof-image">
                    </div>
                ` : ''}
                ${order.status === 'pending' ? `
                    <div class="detail-actions">
                        <button class="btn btn-success btn-large" onclick="approveOrder('${order.id}')">✓ Approve & Send Diamonds</button>
                        <button class="btn btn-danger" onclick="rejectOrder('${order.id}')">✗ Reject</button>
                    </div>
                ` : ''}
            </div>
        `;
        elements.orderModal.style.display = 'block';
    } catch (error) {
        console.error('❌ View order error:', error);
        showToast('Failed to load order', 'error');
    } finally {
        hideLoadingOverlay();
    }
}

async function approveOrder(orderId) {
    const confirmed = await showConfirmDialog('Approve Order', 'Send diamonds via UniPin?');
    if (!confirmed) return;
    
    showLoadingOverlay('Processing via UniPin...');
    
    try {
        console.log('✅ Approving:', orderId);
        
        const { data: order, error: orderError } = await supabaseAdmin
            .from('orders')
            .select(`*, diamond_packages (*)`)
            .eq('id', orderId)
            .single();

        if (orderError) throw orderError;

        await supabaseAdmin.from('orders').update({ status: 'processing' }).eq('id', orderId);

        console.log('📡 Calling UniPin...');
        console.log('Order data:', {
            order_id: orderId,
            user_id: order.ml_user_id,
            zone_id: order.ml_zone_id,
            denomination_id: order.diamond_packages.id,
            reference_no: order.reference_no
        });

        const { data: result, error: unipinError } = await supabaseAdmin
            .rpc('create_unipin_order', {
                p_order_id: orderId,
                p_user_id: order.ml_user_id,
                p_zone_id: order.ml_zone_id,
                p_denomination_id: order.diamond_packages.id,
                p_reference_no: order.reference_no
            });

        console.log('📡 UniPin result:', result);
        console.log('📡 UniPin error:', unipinError);

        if (unipinError) {
            console.error('UniPin RPC Error:', unipinError);
            throw new Error(unipinError.message || 'UniPin RPC call failed');
        }

        if (result && result.success) {
            await supabaseAdmin
                .from('orders')
                .update({
                    status: 'completed',
                    unipin_order_id: result.result?.order_id || null,
                    completed_at: new Date().toISOString()
                })
                .eq('id', orderId);

            await logAdminAction('order_approved', 'order', orderId, {
                reference_no: order.reference_no,
                diamonds: order.diamond_packages.diamonds
            });

            showToast('✓ Diamonds sent!', 'success');
            await loadDashboard();
            elements.orderModal.style.display = 'none';
        } else {
            const errorMsg = result?.error || result?.result?.reason || 'UniPin API failed';
            throw new Error(errorMsg);
        }
    } catch (error) {
        console.error('❌ Approve error:', error);
        await supabaseAdmin
            .from('orders')
            .update({ 
                status: 'pending',
                admin_notes: `Failed: ${error.message}`
            })
            .eq('id', orderId);

        showToast('Failed: ' + error.message, 'error');
    } finally {
        hideLoadingOverlay();
    }
}

async function rejectOrder(orderId) {
    const reason = prompt('Rejection reason:');
    if (!reason) return;
    
    showLoadingOverlay('Rejecting...');
    try {
        await supabaseAdmin
            .from('orders')
            .update({ status: 'failed', rejection_reason: reason })
            .eq('id', orderId);

        await logAdminAction('order_rejected', 'order', orderId, { reason });
        showToast('Rejected', 'success');
        await loadDashboard();
        elements.orderModal.style.display = 'none';
    } catch (error) {
        console.error('Reject error:', error);
        showToast('Failed', 'error');
    } finally {
        hideLoadingOverlay();
    }
}

async function loadPaymentMethods() {
    try {
        const { data, error } = await supabaseAdmin.from('payment_methods').select('*').order('sort_order');
        if (error) throw error;
        displayPaymentMethods(data);
    } catch (error) {
        console.error('Payment methods error:', error);
    }
}

function displayPaymentMethods(payments) {
    if (!payments || payments.length === 0) {
        elements.paymentsGrid.innerHTML = '<div class="empty">No payments</div>';
        return;
    }

    elements.paymentsGrid.innerHTML = '';
    payments.forEach(payment => {
        const card = document.createElement('div');
        card.className = 'payment-card';
        card.innerHTML = `
            <div class="payment-header">
                <h3>${payment.name}</h3>
                <span class="payment-badge ${payment.is_active ? 'active' : 'inactive'}">
                    ${payment.is_active ? '✓' : '✗'}
                </span>
            </div>
            <div class="payment-body">
                <p><strong>Type:</strong> ${payment.type}</p>
                <p><strong>Account:</strong> ${payment.account_name}</p>
                <p><strong>Number:</strong> ${payment.account_number}</p>
            </div>
            <div class="payment-actions">
                <button class="btn btn-sm btn-danger" onclick="deletePaymentMethod('${payment.id}')">🗑️</button>
            </div>
        `;
        elements.paymentsGrid.appendChild(card);
    });
}

async function savePaymentMethod(e) {
    e.preventDefault();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    setButtonLoading(submitBtn, true);
    
    try {
        const { error } = await supabaseAdmin.from('payment_methods').insert({
            name: document.getElementById('payment-name').value,
            type: document.getElementById('payment-type').value,
            account_name: document.getElementById('payment-account-name').value,
            account_number: document.getElementById('payment-account-number').value,
            details: document.getElementById('payment-details').value,
            is_active: true, sort_order: 0
        });

        if (error) throw error;
        showToast('Added', 'success');
        elements.paymentModal.style.display = 'none';
        elements.paymentForm.reset();
        await loadPaymentMethods();
    } catch (error) {
        showToast('Failed', 'error');
    } finally {
        setButtonLoading(submitBtn, false);
    }
}

async function deletePaymentMethod(id) {
    if (!confirm('Delete?')) return;
    try {
        await supabaseAdmin.from('payment_methods').delete().eq('id', id);
        showToast('Deleted', 'success');
        await loadPaymentMethods();
    } catch (error) {
        showToast('Failed', 'error');
    }
}

async function loadPackages() {
    try {
        const { data, error } = await supabaseAdmin.from('diamond_packages').select('*').order('diamonds');
        if (error) throw error;
        displayPackages(data);
    } catch (error) {
        console.error('Packages error:', error);
    }
}

function displayPackages(packages) {
    if (!packages || packages.length === 0) {
        elements.packagesGrid.innerHTML = '<div class="empty">No packages</div>';
        return;
    }

    elements.packagesGrid.innerHTML = '';
    packages.forEach(pkg => {
        const card = document.createElement('div');
        card.className = 'package-admin-card';
        card.innerHTML = `
            <div class="package-icon">💎</div>
            <h3>${pkg.name}</h3>
            <div class="package-info">
                <div class="info-row"><span>Diamonds:</span><strong>${pkg.diamonds}</strong></div>
                <div class="info-row"><span>MMK:</span><strong>${formatPrice(pkg.price_mmk)}</strong></div>
                <div class="info-row"><span>ID:</span><code>${pkg.id}</code></div>
            </div>
        `;
        elements.packagesGrid.appendChild(card);
    });
}

async function syncPackagesFromUnipin() {
    if (!confirm('Sync from UniPin?')) return;
    const syncBtn = document.getElementById('sync-packages-btn');
    setButtonLoading(syncBtn, true);
    showLoadingOverlay('Syncing...');
    
    try {
        console.log('🔄 Calling UniPin packages API...');
        const { data, error } = await supabaseAdmin.rpc('get_unipin_packages');
        
        console.log('📡 Packages response:', data);
        console.log('📡 Packages error:', error);

        if (error) throw error;

        if (data.status !== 1 || !data.denominations) {
            throw new Error(data.reason || 'Failed to fetch');
        }

        const { data: settings } = await supabaseAdmin
            .from('settings')
            .select('value')
            .eq('key', 'exchange_rate_idr_to_mmk')
            .single();

        const rate = parseFloat(settings?.value || 50);

        const packages = data.denominations.map((d, i) => ({
            id: d.id,
            name: d.name,
            diamonds: parseInt(d.name.match(/(\d+)/)?.[1] || 0),
            price_idr: parseFloat(d.amount),
            price_mmk: parseFloat(d.amount) * rate,
            currency: 'MMK',
            is_active: true,
            sort_order: i
        }));

        const { error: upsertError } = await supabaseAdmin
            .from('diamond_packages')
            .upsert(packages, { onConflict: 'id' });

        if (upsertError) throw upsertError;

        showToast(`✓ Synced ${packages.length} packages!`, 'success');
        await loadPackages();
    } catch (error) {
        console.error('❌ Sync error:', error);
        showToast('Sync failed: ' + error.message, 'error');
    } finally {
        setButtonLoading(syncBtn, false);
        hideLoadingOverlay();
    }
}

async function loadSettings() {
    try {
        const { data } = await supabaseAdmin.from('settings').select('*');
        data.forEach(s => {
            const el = document.getElementById({
                'unipin_partner_id': 'partner-id',
                'unipin_secret_key': 'secret-key',
                'unipin_api_base': 'api-base',
                'exchange_rate_idr_to_mmk': 'exchange-rate',
                'shop_name': 'shop-name',
                'shop_email': 'shop-email'
            }[s.key]);
            if (el) el.value = s.value;
        });
    } catch (error) {
        console.error('Settings error:', error);
    }
}

async function saveUnipinSettings(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    setButtonLoading(btn, true);
    try {
        await supabaseAdmin.from('settings').update({ value: document.getElementById('secret-key').value }).eq('key', 'unipin_secret_key');
        showToast('Saved', 'success');
        await checkUnipinStatus();
    } catch (error) {
        showToast('Failed', 'error');
    } finally {
        setButtonLoading(btn, false);
    }
}

async function saveExchangeRate(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    setButtonLoading(btn, true);
    try {
        await supabaseAdmin.from('settings').update({ value: document.getElementById('exchange-rate').value }).eq('key', 'exchange_rate_idr_to_mmk');
        showToast('Saved', 'success');
    } catch (error) {
        showToast('Failed', 'error');
    } finally {
        setButtonLoading(btn, false);
    }
}

async function changePassword(e) {
    e.preventDefault();
    const current = document.getElementById('current-password').value;
    const newPass = document.getElementById('new-password').value;
    const confirm = document.getElementById('confirm-password').value;
    
    if (newPass !== confirm) {
        showToast('Passwords do not match', 'error');
        return;
    }
    
    const btn = e.target.querySelector('button');
    setButtonLoading(btn, true);
    try {
        const { data } = await supabaseAdmin.from('settings').select('value').eq('key', 'admin_password').single();
        if (current !== data.value) throw new Error('Wrong password');
        await supabaseAdmin.from('settings').update({ value: newPass }).eq('key', 'admin_password');
        showToast('Password changed', 'success');
        elements.passwordForm.reset();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        setButtonLoading(btn, false);
    }
}

async function saveShopSettings(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    setButtonLoading(btn, true);
    try {
        await Promise.all([
            supabaseAdmin.from('settings').update({ value: document.getElementById('shop-name').value }).eq('key', 'shop_name'),
            supabaseAdmin.from('settings').update({ value: document.getElementById('shop-email').value }).eq('key', 'shop_email')
        ]);
        showToast('Saved', 'success');
    } catch (error) {
        showToast('Failed', 'error');
    } finally {
        setButtonLoading(btn, false);
    }
}

async function checkUnipinStatus() {
    const statusEl = document.getElementById('api-status');
    try {
        console.log('🔌 Testing UniPin API...');
        const { data, error } = await supabaseAdmin.rpc('get_unipin_packages');
        console.log('📡 Test result:', data);
        
        if (error) throw error;

        if (data && data.status === 1) {
            statusEl.innerHTML = '<span class="status-online">✓ Online</span>';
            statusEl.className = 'api-status online';
            console.log('✅ UniPin Online');
        } else {
            throw new Error(data?.reason || 'API Error');
        }
    } catch (error) {
        statusEl.innerHTML = '<span class="status-offline">✗ Offline</span>';
        statusEl.className = 'api-status offline';
        console.error('❌ UniPin Offline:', error);
    }
}

async function logAdminAction(action, targetType = null, targetId = null, details = null) {
    try {
        await supabaseAdmin.from('admin_logs').insert({
            action, target_type: targetType, target_id: targetId,
            details: details ? JSON.stringify(details) : null
        });
    } catch (error) {
        console.error('Log error:', error);
    }
}

async function loadActivityLogs() {
    try {
        const { data } = await supabaseAdmin.from('admin_logs').select('*').order('created_at', { ascending: false }).limit(100);
        if (!data || data.length === 0) {
            elements.logsTbody.innerHTML = '<tr><td colspan="5">No logs</td></tr>';
            return;
        }
        elements.logsTbody.innerHTML = '';
        data.forEach(log => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${formatDateTime(log.created_at)}</td>
                <td><code>${log.action}</code></td>
                <td>${log.target_type || '-'}</td>
                <td>${log.details || '-'}</td>
                <td>${log.ip_address || '-'}</td>
            `;
            elements.logsTbody.appendChild(tr);
        });
    } catch (error) {
        console.error('Logs error:', error);
    }
}

function switchTab(tab) {
    currentTab = tab;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.toggle('active', c.id === `${tab}-tab`));
    if (tab === 'logs') loadActivityLogs();
}

function filterOrders(status) {
    currentOrderFilter = status;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.toggle('active', b.dataset.status === status));
    loadOrders();
}

function setupRealtimeSubscriptions() {
    orderSubscription = supabaseAdmin.channel('orders').on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => loadDashboard()).subscribe();
}

function startAutoRefresh() {
    if (autoRefreshTimer) clearInterval(autoRefreshTimer);
    autoRefreshTimer = setInterval(() => {
        if (currentTab === 'orders') { loadOrders(); loadStats(); }
    }, CONFIG.autoRefreshInterval);
}

function refreshAll() {
    loadDashboard();
    showToast('Refreshed', 'success');
}

function showLoadingOverlay(text = 'Processing...') {
    document.getElementById('loading-text').textContent = text;
    elements.loadingOverlay.style.display = 'flex';
}

function hideLoadingOverlay() {
    elements.loadingOverlay.style.display = 'none';
}

function setButtonLoading(button, isLoading) {
    const textSpan = button.querySelector('.btn-text');
    const loaderSpan = button.querySelector('.btn-loader');
    button.disabled = isLoading;
    if (textSpan && loaderSpan) {
        textSpan.style.display = isLoading ? 'none' : 'inline';
        loaderSpan.style.display = isLoading ? 'inline-block' : 'none';
    }
}

function showToast(message, type = 'info') {
    elements.toast.textContent = message;
    elements.toast.className = `toast toast-${type} show`;
    setTimeout(() => elements.toast.classList.remove('show'), 4000);
}

function showConfirmDialog(title, message) {
    return new Promise((resolve) => {
        document.getElementById('confirm-title').textContent = title;
        document.getElementById('confirm-message').textContent = message;
        elements.confirmModal.style.display = 'block';
        document.getElementById('confirm-btn').onclick = () => {
            elements.confirmModal.style.display = 'none';
            resolve(true);
        };
        document.querySelector('#confirm-modal .btn-secondary').onclick = () => {
            elements.confirmModal.style.display = 'none';
            resolve(false);
        };
    });
}

function formatPrice(price) {
    return new Intl.NumberFormat('en-US').format(Math.round(price));
}

function formatNumber(num) {
    return new Intl.NumberFormat('en-US').format(num);
}

function formatDateTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleString();
}

function getStatusIcon(status) {
    return { 'pending': '⏳', 'processing': '⚡', 'completed': '✓', 'failed': '✗' }[status] || '❓';
}

window.addEventListener('beforeunload', () => {
    if (orderSubscription) orderSubscription.unsubscribe();
    if (autoRefreshTimer) clearInterval(autoRefreshTimer);
});

console.log('✅ Admin Ready');
