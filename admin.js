// ========================================
// ML DIAMOND SHOP - ADMIN PANEL
// Production Ready with Real UniPin Integration
// ========================================

// ========================================
// CONFIGURATION
// ========================================
const CONFIG = {
    // Supabase Configuration
    supabase: {
        url: 'https://mgbltiztcxxeibocqgqd.supabase.co', // Replace: https://xxxxx.supabase.co
        anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1nYmx0aXp0Y3h4ZWlib2NxZ3FkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5Njg0OTQsImV4cCI6MjA3NjU0NDQ5NH0.GXpTp1O7r2weHeHInMGkAhWvVgejIKgRhK9LgBKaITc', // Replace with your anon key
        serviceKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1nYmx0aXp0Y3h4ZWlib2NxZ3FkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDk2ODQ5NCwiZXhwIjoyMDc2NTQ0NDk0fQ.sJsej-yj5E6PTGqpAnOLrN1NbsYKjf5UwaJrlG7uS8Y' // Replace with service_role key
    },
    
    // Auto-refresh intervals (milliseconds)
    autoRefreshInterval: 30000, // 30 seconds
    
    // Real-time subscriptions
    enableRealtime: true
};

// Initialize Supabase Clients
const supabase = window.supabase.createClient(
    CONFIG.supabase.url,
    CONFIG.supabase.anonKey
);

const supabaseAdmin = window.supabase.createClient(
    CONFIG.supabase.url,
    CONFIG.supabase.serviceKey
);

// ========================================
// GLOBAL STATE
// ========================================
let currentTab = 'orders';
let currentOrderFilter = 'pending';
let autoRefreshTimer = null;
let unipinConfig = {};
let orderSubscription = null;

// ========================================
// DOM ELEMENTS
// ========================================
const elements = {
    // Screens
    loginScreen: document.getElementById('login-screen'),
    adminDashboard: document.getElementById('admin-dashboard'),
    
    // Forms
    loginForm: document.getElementById('login-form'),
    unipinSettingsForm: document.getElementById('unipin-settings-form'),
    exchangeRateForm: document.getElementById('exchange-rate-form'),
    passwordForm: document.getElementById('password-form'),
    shopSettingsForm: document.getElementById('shop-settings-form'),
    paymentForm: document.getElementById('payment-form'),
    
    // Tables
    ordersTbody: document.getElementById('orders-tbody'),
    logsTbody: document.getElementById('logs-tbody'),
    
    // Containers
    paymentsGrid: document.getElementById('payments-grid'),
    packagesGrid: document.getElementById('packages-grid'),
    orderDetailContent: document.getElementById('order-detail-content'),
    
    // Modals
    orderModal: document.getElementById('order-modal'),
    paymentModal: document.getElementById('payment-modal'),
    confirmModal: document.getElementById('confirm-modal'),
    
    // Toast
    toast: document.getElementById('toast'),
    loadingOverlay: document.getElementById('loading-overlay')
};

// ========================================
// INITIALIZATION
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    setupEventListeners();
});

// ========================================
// AUTHENTICATION
// ========================================
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
        // Get admin password from database
        const { data, error } = await supabase
            .from('settings')
            .select('value')
            .eq('key', 'admin_password')
            .single();

        if (error) throw error;

        if (password === data.value) {
            sessionStorage.setItem('admin_logged_in', 'true');
            
            // Log admin login
            await logAdminAction('admin_login', null, null, { success: true });
            
            showDashboard();
        } else {
            showToast('Invalid password!', 'error');
            
            // Log failed login attempt
            await logAdminAction('admin_login', null, null, { success: false });
        }
    } catch (error) {
        console.error('Login error:', error);
        showToast('Login failed. Please try again.', 'error');
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
    
    // Load all data
    loadDashboard();
    
    // Setup real-time subscriptions
    if (CONFIG.enableRealtime) {
        setupRealtimeSubscriptions();
    }
    
    // Start auto-refresh
    startAutoRefresh();
}

// ========================================
// EVENT LISTENERS
// ========================================
function setupEventListeners() {
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
    
    // Order filters
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => filterOrders(btn.dataset.status));
    });
    
    // Add payment button
    document.getElementById('add-payment-btn').addEventListener('click', () => {
        elements.paymentModal.style.display = 'block';
    });
    
    // Sync packages button
    document.getElementById('sync-packages-btn').addEventListener('click', syncPackagesFromUnipin);
    
    // Forms
    elements.unipinSettingsForm.addEventListener('submit', saveUnipinSettings);
    elements.exchangeRateForm.addEventListener('submit', saveExchangeRate);
    elements.passwordForm.addEventListener('submit', changePassword);
    elements.shopSettingsForm.addEventListener('submit', saveShopSettings);
    elements.paymentForm.addEventListener('submit', savePaymentMethod);
    
    // Modal close buttons
    document.querySelectorAll('.modal .close').forEach(btn => {
        btn.addEventListener('click', function() {
            this.closest('.modal').style.display = 'none';
        });
    });
    
    // Close modals on outside click
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });
}

// ========================================
// LOAD DASHBOARD
// ========================================
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
    } catch (error) {
        console.error('Dashboard load error:', error);
        showToast('Failed to load dashboard data', 'error');
    }
}

// ========================================
// LOAD STATISTICS
// ========================================
async function loadStats() {
    try {
        // Use the calculate_order_stats function
        const { data, error } = await supabaseAdmin
            .rpc('calculate_order_stats');

        if (error) throw error;

        const stats = data[0];
        
        // Update stat cards
        document.getElementById('stat-pending').textContent = stats.pending_orders || 0;
        document.getElementById('stat-processing').textContent = 0; // Can add processing status
        document.getElementById('stat-completed').textContent = stats.completed_orders || 0;
        document.getElementById('stat-revenue').textContent = formatPrice(stats.total_revenue || 0) + ' MMK';
        
        // Update badges
        document.getElementById('badge-orders').textContent = stats.pending_orders || 0;
        
        // Update filter counts
        document.getElementById('count-pending').textContent = stats.pending_orders || 0;
        document.getElementById('count-completed').textContent = stats.completed_orders || 0;
        document.getElementById('count-failed').textContent = stats.failed_orders || 0;
        
        // Today's stats
        document.getElementById('stat-completed-today').textContent = 
            `Today: ${stats.today_orders || 0} orders`;
        document.getElementById('stat-revenue-today').textContent = 
            `Today: ${formatPrice(stats.today_revenue || 0)} MMK`;
            
    } catch (error) {
        console.error('Load stats error:', error);
    }
}

// ========================================
// LOAD ORDERS
// ========================================
async function loadOrders() {
    try {
        let query = supabaseAdmin
            .from('orders')
            .select(`
                *,
                diamond_packages (id, name, diamonds, price_mmk),
                payment_methods (id, name, type)
            `)
            .order('created_at', { ascending: false })
            .limit(100);

        if (currentOrderFilter !== 'all') {
            query = query.eq('status', currentOrderFilter);
        }

        const { data, error } = await query;

        if (error) throw error;

        displayOrders(data);
    } catch (error) {
        console.error('Load orders error:', error);
        elements.ordersTbody.innerHTML = `
            <tr>
                <td colspan="8" class="error">Failed to load orders</td>
            </tr>
        `;
    }
}

// ========================================
// DISPLAY ORDERS
// ========================================
function displayOrders(orders) {
    if (!orders || orders.length === 0) {
        elements.ordersTbody.innerHTML = `
            <tr>
                <td colspan="8" class="empty">No orders found</td>
            </tr>
        `;
        return;
    }

    elements.ordersTbody.innerHTML = '';

    orders.forEach(order => {
        const tr = document.createElement('tr');
        tr.className = `order-row status-${order.status}`;
        
        const packageName = order.diamond_packages?.name || 'Unknown';
        const paymentName = order.payment_methods?.name || 'Unknown';
        
        tr.innerHTML = `
            <td>
                <div class="order-id">${order.reference_no}</div>
                <small>${order.id.substring(0, 8)}</small>
            </td>
            <td>
                <strong>${packageName}</strong><br>
                <small>${order.diamond_packages?.diamonds || 0} 💎</small>
            </td>
            <td>
                <div class="ml-account">
                    <strong>${order.ml_username || 'N/A'}</strong><br>
                    <small>${order.ml_user_id}(${order.ml_zone_id})</small>
                </div>
            </td>
            <td>${paymentName}</td>
            <td><strong>${formatPrice(order.amount)} MMK</strong></td>
            <td>
                <span class="status-badge status-${order.status}">
                    ${getStatusIcon(order.status)} ${order.status.toUpperCase()}
                </span>
            </td>
            <td>
                <div class="order-date">
                    ${formatDateTime(order.created_at)}
                </div>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm btn-primary" onclick="viewOrder('${order.id}')" title="View Details">
                        👁️
                    </button>
                    ${order.status === 'pending' ? `
                        <button class="btn btn-sm btn-success" onclick="approveOrder('${order.id}')" title="Approve & Send Diamonds">
                            ✓
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="rejectOrder('${order.id}')" title="Reject Order">
                            ✗
                        </button>
                    ` : ''}
                </div>
            </td>
        `;
        
        elements.ordersTbody.appendChild(tr);
    });
}

// ========================================
// VIEW ORDER DETAILS
// ========================================
async function viewOrder(orderId) {
    showLoadingOverlay('Loading order details...');
    
    try {
        const { data: order, error } = await supabaseAdmin
            .from('orders')
            .select(`
                *,
                diamond_packages (*),
                payment_methods (*)
            `)
            .eq('id', orderId)
            .single();

        if (error) throw error;

        elements.orderDetailContent.innerHTML = `
            <div class="order-detail">
                <div class="detail-grid">
                    <!-- Order Info -->
                    <div class="detail-section">
                        <h4>📋 Order Information</h4>
                        <div class="detail-row">
                            <span class="label">Order ID:</span>
                            <span class="value">${order.id}</span>
                        </div>
                        <div class="detail-row">
                            <span class="label">Reference No:</span>
                            <span class="value"><strong>${order.reference_no}</strong></span>
                        </div>
                        <div class="detail-row">
                            <span class="label">Status:</span>
                            <span class="value">
                                <span class="status-badge status-${order.status}">
                                    ${getStatusIcon(order.status)} ${order.status.toUpperCase()}
                                </span>
                            </span>
                        </div>
                        <div class="detail-row">
                            <span class="label">Created:</span>
                            <span class="value">${formatDateTime(order.created_at)}</span>
                        </div>
                        ${order.completed_at ? `
                            <div class="detail-row">
                                <span class="label">Completed:</span>
                                <span class="value">${formatDateTime(order.completed_at)}</span>
                            </div>
                        ` : ''}
                    </div>

                    <!-- Package Info -->
                    <div class="detail-section">
                        <h4>💎 Package Details</h4>
                        <div class="detail-row">
                            <span class="label">Package:</span>
                            <span class="value">${order.diamond_packages.name}</span>
                        </div>
                        <div class="detail-row">
                            <span class="label">Diamonds:</span>
                            <span class="value"><strong>${order.diamond_packages.diamonds} 💎</strong></span>
                        </div>
                        <div class="detail-row">
                            <span class="label">Price (IDR):</span>
                            <span class="value">${formatPrice(order.diamond_packages.price_idr)} IDR</span>
                        </div>
                        <div class="detail-row">
                            <span class="label">Amount (MMK):</span>
                            <span class="value"><strong>${formatPrice(order.amount)} MMK</strong></span>
                        </div>
                    </div>

                    <!-- ML Account -->
                    <div class="detail-section">
                        <h4>🎮 Mobile Legends Account</h4>
                        <div class="detail-row">
                            <span class="label">User ID:</span>
                            <span class="value"><code>${order.ml_user_id}</code></span>
                        </div>
                        <div class="detail-row">
                            <span class="label">Zone ID:</span>
                            <span class="value"><code>${order.ml_zone_id}</code></span>
                        </div>
                        <div class="detail-row">
                            <span class="label">Username:</span>
                            <span class="value"><strong>${order.ml_username || 'N/A'}</strong></span>
                        </div>
                    </div>

                    <!-- Payment Info -->
                    <div class="detail-section">
                        <h4>💳 Payment Information</h4>
                        <div class="detail-row">
                            <span class="label">Method:</span>
                            <span class="value">${order.payment_methods.name}</span>
                        </div>
                        <div class="detail-row">
                            <span class="label">Type:</span>
                            <span class="value">${order.payment_methods.type}</span>
                        </div>
                        <div class="detail-row">
                            <span class="label">Account:</span>
                            <span class="value">${order.payment_methods.account_name}</span>
                        </div>
                        <div class="detail-row">
                            <span class="label">Number:</span>
                            <span class="value">${order.payment_methods.account_number}</span>
                        </div>
                    </div>
                </div>

                <!-- Payment Proof -->
                ${order.payment_proof_url ? `
                    <div class="detail-section full-width">
                        <h4>📸 Payment Proof</h4>
                        <div class="proof-container">
                            <img src="${order.payment_proof_url}" alt="Payment Proof" class="proof-image">
                        </div>
                    </div>
                ` : ''}

                <!-- UniPin Info -->
                ${order.unipin_order_id ? `
                    <div class="detail-section full-width">
                        <h4>🔗 UniPin Transaction</h4>
                        <div class="detail-row">
                            <span class="label">UniPin Order ID:</span>
                            <span class="value"><code>${order.unipin_order_id}</code></span>
                        </div>
                    </div>
                ` : ''}

                <!-- Actions -->
                ${order.status === 'pending' ? `
                    <div class="detail-actions">
                        <button class="btn btn-success btn-large" onclick="approveOrder('${order.id}')">
                            ✓ Approve & Send Diamonds
                        </button>
                        <button class="btn btn-danger" onclick="rejectOrder('${order.id}')">
                            ✗ Reject Order
                        </button>
                    </div>
                ` : ''}

                ${order.admin_notes || order.rejection_reason ? `
                    <div class="detail-section full-width">
                        <h4>📝 Admin Notes</h4>
                        <p>${order.admin_notes || order.rejection_reason}</p>
                    </div>
                ` : ''}
            </div>
        `;

        elements.orderModal.style.display = 'block';
    } catch (error) {
        console.error('View order error:', error);
        showToast('Failed to load order details', 'error');
    } finally {
        hideLoadingOverlay();
    }
}

// ========================================
// APPROVE ORDER (Send Diamonds via UniPin)
// ========================================
async function approveOrder(orderId) {
    const confirmed = await showConfirmDialog(
        'Approve Order',
        'Are you sure you want to approve this order and send diamonds via UniPin API?'
    );
    
    if (!confirmed) return;
    
    showLoadingOverlay('Processing diamond topup via UniPin...');
    
    try {
        // 1. Get order details
        const { data: order, error: orderError } = await supabaseAdmin
            .from('orders')
            .select(`
                *,
                diamond_packages (*)
            `)
            .eq('id', orderId)
            .single();

        if (orderError) throw orderError;

        // 2. Get UniPin configuration
        const { data: settings } = await supabaseAdmin
            .from('settings')
            .select('key, value')
            .in('key', ['unipin_partner_id', 'unipin_secret_key', 'unipin_api_base', 'mlbb_game_code']);

        const config = {};
        settings.forEach(s => config[s.key] = s.value);

        // 3. Update order status to processing
        await supabaseAdmin
            .from('orders')
            .update({ status: 'processing' })
            .eq('id', orderId);

        // 4. Call UniPin API to create topup order
        const timestamp = Math.floor(Date.now() / 1000);
        const path = '/in-game-topup/order/create';
        const auth = await generateUnipinAuth(
            config.unipin_partner_id,
            timestamp,
            path,
            config.unipin_secret_key
        );

        const response = await fetch(`${config.unipin_api_base}${path}`, {
            method: 'POST',
            headers: {
                'partnerid': config.unipin_partner_id,
                'timestamp': timestamp.toString(),
                'path': path,
                'auth': auth,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                game_code: config.mlbb_game_code,
                denomination_id: order.diamond_packages.id,
                fields: {
                    userid: order.ml_user_id,
                    zoneid: parseInt(order.ml_zone_id)
                },
                reference_no: order.reference_no
            })
        });

        const result = await response.json();

        // 5. Handle UniPin response
        if (result.status === 1) {
            // Success - Update order
            await supabaseAdmin
                .from('orders')
                .update({
                    status: 'completed',
                    unipin_order_id: result.order_id,
                    completed_at: new Date().toISOString()
                })
                .eq('id', orderId);

            // Log transaction
            await supabaseAdmin
                .from('transactions')
                .insert({
                    order_id: orderId,
                    unipin_order_id: result.order_id,
                    unipin_status: 'success',
                    status: 'success',
                    request_data: {
                        game_code: config.mlbb_game_code,
                        denomination_id: order.diamond_packages.id,
                        user_id: order.ml_user_id,
                        zone_id: order.ml_zone_id
                    },
                    response_data: result
                });

            // Log admin action
            await logAdminAction('order_approved', 'order', orderId, {
                reference_no: order.reference_no,
                unipin_order_id: result.order_id,
                diamonds: order.diamond_packages.diamonds
            });

            showToast('✓ Order approved! Diamonds sent successfully!', 'success');
            
            // Refresh data
            await loadDashboard();
            elements.orderModal.style.display = 'none';
        } else {
            throw new Error(result.reason || 'UniPin API error');
        }

    } catch (error) {
        console.error('Approve order error:', error);
        
        // Revert order status
        await supabaseAdmin
            .from('orders')
            .update({ 
                status: 'pending',
                admin_notes: `Failed: ${error.message}`
            })
            .eq('id', orderId);

        showToast('Failed to approve order: ' + error.message, 'error');
    } finally {
        hideLoadingOverlay();
    }
}

// ========================================
// REJECT ORDER
// ========================================
async function rejectOrder(orderId) {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;
    
    showLoadingOverlay('Rejecting order...');
    
    try {
        await supabaseAdmin
            .from('orders')
            .update({
                status: 'failed',
                rejection_reason: reason,
                updated_at: new Date().toISOString()
            })
            .eq('id', orderId);

        await logAdminAction('order_rejected', 'order', orderId, { reason });

        showToast('Order rejected', 'success');
        await loadDashboard();
        elements.orderModal.style.display = 'none';
    } catch (error) {
        console.error('Reject order error:', error);
        showToast('Failed to reject order', 'error');
    } finally {
        hideLoadingOverlay();
    }
}

// ========================================
// GENERATE UNIPIN AUTH SIGNATURE
// ========================================
async function generateUnipinAuth(partnerId, timestamp, path, secretKey) {
    const message = `${partnerId}${timestamp}${path}`;
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secretKey);
    const messageData = encoder.encode(message);

    const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
    return Array.from(new Uint8Array(signature))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

// ========================================
// LOAD PAYMENT METHODS
// ========================================
async function loadPaymentMethods() {
    try {
        const { data, error } = await supabaseAdmin
            .from('payment_methods')
            .select('*')
            .order('sort_order', { ascending: true });

        if (error) throw error;

        displayPaymentMethods(data);
    } catch (error) {
        console.error('Load payment methods error:', error);
        elements.paymentsGrid.innerHTML = '<div class="error">Failed to load payment methods</div>';
    }
}

// ========================================
// DISPLAY PAYMENT METHODS
// ========================================
function displayPaymentMethods(payments) {
    if (!payments || payments.length === 0) {
        elements.paymentsGrid.innerHTML = '<div class="empty">No payment methods</div>';
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
                    ${payment.is_active ? '✓ Active' : '✗ Inactive'}
                </span>
            </div>
            <div class="payment-body">
                <p><strong>Type:</strong> ${payment.type}</p>
                <p><strong>Account:</strong> ${payment.account_name}</p>
                <p><strong>Number:</strong> ${payment.account_number}</p>
                ${payment.details ? `<p><strong>Details:</strong> ${payment.details}</p>` : ''}
            </div>
            <div class="payment-actions">
                <button class="btn btn-sm ${payment.is_active ? 'btn-warning' : 'btn-success'}" 
                        onclick="togglePaymentStatus('${payment.id}', ${!payment.is_active})">
                    ${payment.is_active ? 'Deactivate' : 'Activate'}
                </button>
                <button class="btn btn-sm btn-danger" onclick="deletePaymentMethod('${payment.id}')">
                    🗑️ Delete
                </button>
            </div>
        `;
        elements.paymentsGrid.appendChild(card);
    });
}

// ========================================
// SAVE PAYMENT METHOD
// ========================================
elements.paymentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    setButtonLoading(submitBtn, true);
    
    try {
        const paymentData = {
            name: document.getElementById('payment-name').value,
            type: document.getElementById('payment-type').value,
            account_name: document.getElementById('payment-account-name').value,
            account_number: document.getElementById('payment-account-number').value,
            details: document.getElementById('payment-details').value,
            is_active: true,
            sort_order: 0
        };

        const { error } = await supabaseAdmin
            .from('payment_methods')
            .insert(paymentData);

        if (error) throw error;

        await logAdminAction('payment_method_added', 'payment_method', null, paymentData);

        showToast('Payment method added successfully', 'success');
        elements.paymentModal.style.display = 'none';
        elements.paymentForm.reset();
        await loadPaymentMethods();
    } catch (error) {
        console.error('Save payment error:', error);
        showToast('Failed to save payment method', 'error');
    } finally {
        setButtonLoading(submitBtn, false);
    }
});

// ========================================
// DELETE PAYMENT METHOD
// ========================================
async function deletePaymentMethod(id) {
    const confirmed = await showConfirmDialog(
        'Delete Payment Method',
        'Are you sure you want to delete this payment method?'
    );
    
    if (!confirmed) return;
    
    try {
        const { error } = await supabaseAdmin
            .from('payment_methods')
            .delete()
            .eq('id', id);

        if (error) throw error;

        await logAdminAction('payment_method_deleted', 'payment_method', id);

        showToast('Payment method deleted', 'success');
        await loadPaymentMethods();
    } catch (error) {
        console.error('Delete payment error:', error);
        showToast('Failed to delete payment method', 'error');
    }
}

// ========================================
// TOGGLE PAYMENT STATUS
// ========================================
async function togglePaymentStatus(id, isActive) {
    try {
        const { error } = await supabaseAdmin
            .from('payment_methods')
            .update({ is_active: isActive })
            .eq('id', id);

        if (error) throw error;

        await logAdminAction('payment_method_status_changed', 'payment_method', id, { is_active: isActive });

        showToast(`Payment method ${isActive ? 'activated' : 'deactivated'}`, 'success');
        await loadPaymentMethods();
    } catch (error) {
        console.error('Toggle payment status error:', error);
        showToast('Failed to update payment status', 'error');
    }
}

// ========================================
// LOAD PACKAGES
// ========================================
async function loadPackages() {
    try {
        const { data, error } = await supabaseAdmin
            .from('diamond_packages')
            .select('*')
            .order('sort_order', { ascending: true })
            .order('diamonds', { ascending: true });

        if (error) throw error;

        displayPackages(data);
    } catch (error) {
        console.error('Load packages error:', error);
        elements.packagesGrid.innerHTML = '<div class="error">Failed to load packages</div>';
    }
}

// ========================================
// DISPLAY PACKAGES
// ========================================
function displayPackages(packages) {
    if (!packages || packages.length === 0) {
        elements.packagesGrid.innerHTML = '<div class="empty">No packages available</div>';
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
                <div class="info-row">
                    <span>Diamonds:</span>
                    <strong>${formatNumber(pkg.diamonds)}</strong>
                </div>
                <div class="info-row">
                    <span>Price (IDR):</span>
                    <strong>${formatPrice(pkg.price_idr)} IDR</strong>
                </div>
                <div class="info-row">
                    <span>Price (MMK):</span>
                    <strong>${formatPrice(pkg.price_mmk)} MMK</strong>
                </div>
                <div class="info-row">
                    <span>Package ID:</span>
                    <code>${pkg.id}</code>
                </div>
                <div class="info-row">
                    <span>Status:</span>
                    <span class="badge ${pkg.is_active ? 'active' : 'inactive'}">
                        ${pkg.is_active ? '✓ Active' : '✗ Inactive'}
                    </span>
                </div>
            </div>
            <div class="package-footer">
                <small>Last updated: ${formatDateTime(pkg.updated_at)}</small>
            </div>
        `;
        elements.packagesGrid.appendChild(card);
    });
}

// ========================================
// SYNC PACKAGES FROM UNIPIN
// ========================================
async function syncPackagesFromUnipin() {
    const confirmed = await showConfirmDialog(
        'Sync Packages',
        'This will fetch latest packages from UniPin API and update the database. Continue?'
    );
    
    if (!confirmed) return;
    
    const syncBtn = document.getElementById('sync-packages-btn');
    setButtonLoading(syncBtn, true);
    showLoadingOverlay('Syncing packages from UniPin API...');
    
    try {
        // Get settings
        const { data: settings } = await supabaseAdmin
            .from('settings')
            .select('key, value')
            .in('key', ['unipin_partner_id', 'unipin_secret_key', 'unipin_api_base', 'mlbb_game_code', 'exchange_rate_idr_to_mmk']);

        const config = {};
        settings.forEach(s => config[s.key] = s.value);

        // Call UniPin API to get packages
        const timestamp = Math.floor(Date.now() / 1000);
        const path = '/in-game-topup/list';
        const auth = await generateUnipinAuth(
            config.unipin_partner_id,
            timestamp,
            path,
            config.unipin_secret_key
        );

        const response = await fetch(`${config.unipin_api_base}${path}`, {
            method: 'POST',
            headers: {
                'partnerid': config.unipin_partner_id,
                'timestamp': timestamp.toString(),
                'path': path,
                'auth': auth,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                game_code: config.mlbb_game_code
            })
        });

        const result = await response.json();

        if (result.status !== 1 || !result.denominations) {
            throw new Error('Failed to fetch packages from UniPin API');
        }

        // Process packages
        const exchangeRate = parseFloat(config.exchange_rate_idr_to_mmk);
        const packages = result.denominations.map((denom, index) => ({
            id: denom.id,
            name: denom.name,
            diamonds: extractDiamondCount(denom.name),
            price_idr: parseFloat(denom.amount),
            price_mmk: parseFloat(denom.amount) * exchangeRate,
            currency: 'MMK',
            is_active: true,
            sort_order: index
        }));

        // Upsert packages to database
        const { error: upsertError } = await supabaseAdmin
            .from('diamond_packages')
            .upsert(packages, { onConflict: 'id' });

        if (upsertError) throw upsertError;

        await logAdminAction('packages_synced', null, null, { count: packages.length });

        showToast(`✓ Successfully synced ${packages.length} packages from UniPin!`, 'success');
        await loadPackages();
    } catch (error) {
        console.error('Sync packages error:', error);
        showToast('Failed to sync packages: ' + error.message, 'error');
    } finally {
        setButtonLoading(syncBtn, false);
        hideLoadingOverlay();
    }
}

function extractDiamondCount(packageName) {
    const match = packageName.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
}

// ========================================
// LOAD SETTINGS
// ========================================
async function loadSettings() {
    try {
        const { data, error } = await supabaseAdmin
            .from('settings')
            .select('*');

        if (error) throw error;

        data.forEach(setting => {
            const element = document.getElementById(settingKeyToElementId(setting.key));
            if (element) {
                element.value = setting.value;
            }
        });
    } catch (error) {
        console.error('Load settings error:', error);
    }
}

function settingKeyToElementId(key) {
    const mapping = {
        'unipin_partner_id': 'partner-id',
        'unipin_secret_key': 'secret-key',
        'unipin_api_base': 'api-base',
        'exchange_rate_idr_to_mmk': 'exchange-rate',
        'shop_name': 'shop-name',
        'shop_email': 'shop-email'
    };
    return mapping[key] || key;
}

// ========================================
// SAVE SETTINGS
// ========================================
async function saveUnipinSettings(e) {
    e.preventDefault();
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    setButtonLoading(submitBtn, true);
    
    try {
        const secretKey = document.getElementById('secret-key').value;

        const { error } = await supabaseAdmin
            .from('settings')
            .update({ value: secretKey })
            .eq('key', 'unipin_secret_key');

        if (error) throw error;

        await logAdminAction('unipin_settings_updated');

        showToast('UniPin settings saved successfully', 'success');
        await checkUnipinStatus();
    } catch (error) {
        console.error('Save UniPin settings error:', error);
        showToast('Failed to save UniPin settings', 'error');
    } finally {
        setButtonLoading(submitBtn, false);
    }
}

async function saveExchangeRate(e) {
    e.preventDefault();
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    setButtonLoading(submitBtn, true);
    
    try {
        const rate = document.getElementById('exchange-rate').value;

        const { error } = await supabaseAdmin
            .from('settings')
            .update({ value: rate })
            .eq('key', 'exchange_rate_idr_to_mmk');

        if (error) throw error;

        await logAdminAction('exchange_rate_updated', null, null, { rate });

        showToast('Exchange rate saved successfully', 'success');
    } catch (error) {
        console.error('Save exchange rate error:', error);
        showToast('Failed to save exchange rate', 'error');
    } finally {
        setButtonLoading(submitBtn, false);
    }
}

async function changePassword(e) {
    e.preventDefault();
    
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    
    if (newPassword !== confirmPassword) {
        showToast('New passwords do not match', 'error');
        return;
    }
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    setButtonLoading(submitBtn, true);
    
    try {
        // Verify current password
        const { data } = await supabaseAdmin
            .from('settings')
            .select('value')
            .eq('key', 'admin_password')
            .single();

        if (currentPassword !== data.value) {
            throw new Error('Current password is incorrect');
        }

        // Update password
        const { error } = await supabaseAdmin
            .from('settings')
            .update({ value: newPassword })
            .eq('key', 'admin_password');

        if (error) throw error;

        await logAdminAction('password_changed');

        showToast('Password changed successfully', 'success');
        elements.passwordForm.reset();
    } catch (error) {
        console.error('Change password error:', error);
        showToast(error.message || 'Failed to change password', 'error');
    } finally {
        setButtonLoading(submitBtn, false);
    }
}

async function saveShopSettings(e) {
    e.preventDefault();
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    setButtonLoading(submitBtn, true);
    
    try {
        const shopName = document.getElementById('shop-name').value;
        const shopEmail = document.getElementById('shop-email').value;

        await Promise.all([
            supabaseAdmin.from('settings').update({ value: shopName }).eq('key', 'shop_name'),
            supabaseAdmin.from('settings').update({ value: shopEmail }).eq('key', 'shop_email')
        ]);

        await logAdminAction('shop_settings_updated');

        showToast('Shop settings saved successfully', 'success');
    } catch (error) {
        console.error('Save shop settings error:', error);
        showToast('Failed to save shop settings', 'error');
    } finally {
        setButtonLoading(submitBtn, false);
    }
}

// ========================================
// CHECK UNIPIN API STATUS
// ========================================
async function checkUnipinStatus() {
    const statusEl = document.getElementById('api-status');
    
    try {
        const { data: settings } = await supabaseAdmin
            .from('settings')
            .select('key, value')
            .in('key', ['unipin_partner_id', 'unipin_secret_key', 'unipin_api_base']);

        const config = {};
        settings.forEach(s => config[s.key] = s.value);

        // Simple ping test (list games)
        const timestamp = Math.floor(Date.now() / 1000);
        const path = '/in-game-topup/list';
        const auth = await generateUnipinAuth(
            config.unipin_partner_id,
            timestamp,
            path,
            config.unipin_secret_key
        );

        const response = await fetch(`${config.unipin_api_base}${path}`, {
            method: 'POST',
            headers: {
                'partnerid': config.unipin_partner_id,
                'timestamp': timestamp.toString(),
                'path': path,
                'auth': auth,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({})
        });

        const result = await response.json();

        if (result.status === 1) {
            statusEl.innerHTML = '<span class="status-online">✓ API Online</span>';
            statusEl.className = 'api-status online';
        } else {
            throw new Error('API returned error status');
        }
    } catch (error) {
        statusEl.innerHTML = '<span class="status-offline">✗ API Offline</span>';
        statusEl.className = 'api-status offline';
        console.error('UniPin API status check failed:', error);
    }
}

// ========================================
// ACTIVITY LOGS
// ========================================
async function logAdminAction(action, targetType = null, targetId = null, details = null) {
    try {
        await supabaseAdmin
            .from('admin_logs')
            .insert({
                action,
                target_type: targetType,
                target_id: targetId,
                details: details ? JSON.stringify(details) : null
            });
    } catch (error) {
        console.error('Log admin action error:', error);
    }
}

async function loadActivityLogs() {
    try {
        const { data, error } = await supabaseAdmin
            .from('admin_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100);

        if (error) throw error;

        displayActivityLogs(data);
    } catch (error) {
        console.error('Load activity logs error:', error);
        elements.logsTbody.innerHTML = '<tr><td colspan="5" class="error">Failed to load logs</td></tr>';
    }
}

function displayActivityLogs(logs) {
    if (!logs || logs.length === 0) {
        elements.logsTbody.innerHTML = '<tr><td colspan="5" class="empty">No activity logs</td></tr>';
        return;
    }

    elements.logsTbody.innerHTML = '';

    logs.forEach(log => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${formatDateTime(log.created_at)}</td>
            <td><code>${log.action}</code></td>
            <td>${log.target_type || '-'} ${log.target_id ? `(${log.target_id.substring(0, 8)})` : ''}</td>
            <td>${log.details ? `<pre>${JSON.stringify(JSON.parse(log.details), null, 2)}</pre>` : '-'}</td>
            <td>${log.ip_address || '-'}</td>
        `;
        elements.logsTbody.appendChild(tr);
    });
}

// ========================================
// TAB MANAGEMENT
// ========================================
function switchTab(tab) {
    currentTab = tab;
    
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === `${tab}-tab`);
    });
    
    // Load tab data if needed
    if (tab === 'logs') {
        loadActivityLogs();
    }
}

function filterOrders(status) {
    currentOrderFilter = status;
    
    // Update filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.status === status);
    });
    
    loadOrders();
}

// ========================================
// REALTIME SUBSCRIPTIONS
// ========================================
function setupRealtimeSubscriptions() {
    // Subscribe to new orders
    orderSubscription = supabaseAdmin
        .channel('orders_changes')
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'orders' },
            (payload) => {
                console.log('Order changed:', payload);
                loadDashboard();
            }
        )
        .subscribe();
}

// ========================================
// AUTO REFRESH
// ========================================
function startAutoRefresh() {
    if (autoRefreshTimer) {
        clearInterval(autoRefreshTimer);
    }
    
    autoRefreshTimer = setInterval(() => {
        if (currentTab === 'orders') {
            loadOrders();
            loadStats();
        }
    }, CONFIG.autoRefreshInterval);
}

function refreshAll() {
    loadDashboard();
    showToast('Refreshed successfully', 'success');
}

// ========================================
// UI UTILITIES
// ========================================
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
    
    if (textSpan && loaderSpan) {
        if (isLoading) {
            button.disabled = true;
            textSpan.style.display = 'none';
            loaderSpan.style.display = 'inline-block';
        } else {
            button.disabled = false;
            textSpan.style.display = 'inline';
            loaderSpan.style.display = 'none';
        }
    } else {
        button.disabled = isLoading;
        if (isLoading) {
            button.setAttribute('data-original-text', button.textContent);
            button.innerHTML = '<span class="spinner-small"></span> Loading...';
        } else {
            button.textContent = button.getAttribute('data-original-text') || button.textContent;
        }
    }
}

function showToast(message, type = 'info') {
    elements.toast.textContent = message;
    elements.toast.className = `toast toast-${type} show`;
    
    setTimeout(() => {
        elements.toast.classList.remove('show');
    }, 4000);
}

function showConfirmDialog(title, message) {
    return new Promise((resolve) => {
        document.getElementById('confirm-title').textContent = title;
        document.getElementById('confirm-message').textContent = message;
        elements.confirmModal.style.display = 'block';
        
        const confirmBtn = document.getElementById('confirm-btn');
        const cancelHandler = () => {
            elements.confirmModal.style.display = 'none';
            resolve(false);
        };
        
        const confirmHandler = () => {
            elements.confirmModal.style.display = 'none';
            resolve(true);
        };
        
        confirmBtn.onclick = confirmHandler;
        document.querySelector('#confirm-modal .btn-secondary').onclick = cancelHandler;
    });
}

function closeConfirmModal() {
    elements.confirmModal.style.display = 'none';
}

// ========================================
// FORMATTING UTILITIES
// ========================================
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
    
    return date.toLocaleString('en-GB', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getStatusIcon(status) {
    const icons = {
        'pending': '⏳',
        'processing': '⚡',
        'completed': '✓',
        'failed': '✗',
        'cancelled': '🚫',
        'refunded': '↩️'
    };
    return icons[status] || '❓';
}

// ========================================
// CLEANUP ON UNLOAD
// ========================================
window.addEventListener('beforeunload', () => {
    if (orderSubscription) {
        orderSubscription.unsubscribe();
    }
    if (autoRefreshTimer) {
        clearInterval(autoRefreshTimer);
    }
});
