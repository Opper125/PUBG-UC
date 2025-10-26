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
