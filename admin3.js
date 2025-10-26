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
