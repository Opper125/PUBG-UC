// ========================================
// ML DIAMOND SHOP - USER INTERFACE
// Fixed Version - No CORS Issues
// ========================================

// ========================================
// CONFIGURATION
// ========================================
const CONFIG = {
    supabase: {
        url: 'https://mgbltiztcxxeibocqgqd.supabase.co',
        anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1nYmx0aXp0Y3h4ZWlib2NxZ3FkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5Njg0OTQsImV4cCI6MjA3NjU0NDQ5NH0.GXpTp1O7r2weHeHInMGkAhWvVgejIKgRhK9LgBKaITc'
    },
    
    maxFileSize: 5 * 1024 * 1024,
    allowedFileTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    
    minUserId: 4,
    maxUserId: 12,
    minZoneId: 4,
    maxZoneId: 6
};

const supabase = window.supabase.createClient(
    CONFIG.supabase.url,
    CONFIG.supabase.anonKey
);

// ========================================
// GLOBAL STATE
// ========================================
let currentStep = 1;
let selectedPackage = null;
let selectedPayment = null;
let validatedAccount = null;
let uploadedProofFile = null;

// ========================================
// DOM ELEMENTS
// ========================================
const elements = {
    packagesGrid: document.getElementById('packages-grid'),
    packagesLoading: document.getElementById('packages-loading'),
    orderModal: document.getElementById('order-modal'),
    orderForm: document.getElementById('order-form'),
    
    mlUserId: document.getElementById('ml-user-id'),
    mlZoneId: document.getElementById('ml-zone-id'),
    paymentProof: document.getElementById('payment-proof'),
    termsAgree: document.getElementById('terms-agree'),
    
    validateBtn: document.getElementById('validate-btn'),
    submitBtn: document.getElementById('submit-btn'),
    
    packageInfo: document.getElementById('package-info'),
    validationResult: document.getElementById('validation-result'),
    paymentMethods: document.getElementById('payment-methods'),
    paymentDetails: document.getElementById('payment-details'),
    preview: document.getElementById('preview'),
    orderSummary: document.getElementById('order-summary'),
    successMessage: document.getElementById('success-message'),
    
    toast: document.getElementById('toast')
};

// ========================================
// INITIALIZATION
// ========================================
document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('🚀 Initializing application...');
        await loadPackages();
        setupEventListeners();
        await testDatabaseConnection();
        console.log('✅ Application ready');
    } catch (error) {
        console.error('❌ Initialization error:', error);
        showToast('Failed to initialize. Please refresh.', 'error');
    }
});

// ========================================
// EVENT LISTENERS
// ========================================
function setupEventListeners() {
    document.querySelector('.close').addEventListener('click', closeModal);
    
    window.addEventListener('click', (e) => {
        if (e.target === elements.orderModal) closeModal();
    });
    
    elements.validateBtn.addEventListener('click', validateAccount);
    elements.orderForm.addEventListener('submit', submitOrder);
    elements.paymentProof.addEventListener('change', handleFileSelect);
    
    elements.mlUserId.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/[^0-9]/g, '');
    });
    
    elements.mlZoneId.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/[^0-9]/g, '');
    });
}

// ========================================
// LOAD PACKAGES
// ========================================
async function loadPackages() {
    try {
        console.log('📦 Loading packages...');
        
        const { data, error } = await supabase
            .from('diamond_packages')
            .select('*')
            .eq('is_active', true)
            .order('sort_order', { ascending: true })
            .order('diamonds', { ascending: true });

        if (error) throw error;

        if (data && data.length > 0) {
            displayPackages(data);
            console.log(`✅ Loaded ${data.length} packages`);
        } else {
            elements.packagesGrid.innerHTML = '<div class="no-packages">No packages available</div>';
        }
    } catch (error) {
        console.error('❌ Load packages error:', error);
        elements.packagesGrid.innerHTML = `
            <div class="error-message">
                <p>Failed to load packages</p>
                <button class="btn btn-secondary" onclick="loadPackages()">Retry</button>
            </div>
        `;
    } finally {
        elements.packagesLoading.style.display = 'none';
    }
}

// ========================================
// DISPLAY PACKAGES
// ========================================
function displayPackages(packages) {
    elements.packagesGrid.innerHTML = '';

    packages.forEach(pkg => {
        const card = document.createElement('div');
        card.className = 'package-card';
        if (pkg.is_featured) card.classList.add('featured');
        
        card.innerHTML = `
            <div class="package-badge">${pkg.is_featured ? '⭐ Popular' : ''}</div>
            <div class="icon">💎</div>
            <h3>${pkg.name}</h3>
            <div class="diamonds">${formatNumber(pkg.diamonds)} Diamonds</div>
            <div class="price">${formatPrice(pkg.price_mmk)} MMK</div>
            <div class="price-small">${formatPrice(pkg.price_idr)} IDR</div>
            <button class="btn btn-primary">ဝယ်ယူမည်</button>
        `;

        card.addEventListener('click', () => openOrderModal(pkg));
        elements.packagesGrid.appendChild(card);
    });
}

// ========================================
// OPEN ORDER MODAL
// ========================================
async function openOrderModal(pkg) {
    selectedPackage = pkg;
    currentStep = 1;
    
    elements.orderForm.reset();
    validatedAccount = null;
    selectedPayment = null;
    uploadedProofFile = null;
    
    elements.packageInfo.innerHTML = `
        <div class="selected-package">
            <h3>💎 ${pkg.name}</h3>
            <div class="package-details">
                <div class="detail-item">
                    <span class="label">Diamonds:</span>
                    <span class="value">${formatNumber(pkg.diamonds)}</span>
                </div>
                <div class="detail-item">
                    <span class="label">Price:</span>
                    <span class="value">${formatPrice(pkg.price_mmk)} MMK</span>
                </div>
            </div>
        </div>
    `;
    
    await loadPaymentMethods();
    resetSteps();
    
    elements.orderModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    elements.orderModal.style.display = 'none';
    document.body.style.overflow = 'auto';
    elements.successMessage.style.display = 'none';
    elements.orderForm.style.display = 'block';
}

// ========================================
// STEP MANAGEMENT
// ========================================
function resetSteps() {
    currentStep = 1;
    document.querySelectorAll('.form-step').forEach(step => step.classList.remove('active'));
    document.getElementById('step-1').classList.add('active');
    updateStepIndicator();
    elements.validationResult.innerHTML = '';
    elements.preview.innerHTML = '';
}

function updateStepIndicator() {
    document.querySelectorAll('.step-item').forEach((item, index) => {
        const stepNum = index + 1;
        item.classList.remove('active', 'completed');
        if (stepNum < currentStep) item.classList.add('completed');
        else if (stepNum === currentStep) item.classList.add('active');
    });
}

function nextStep() {
    if (currentStep === 1 && !validatedAccount) {
        showToast('Please validate your ML account first', 'warning');
        return;
    }
    if (currentStep === 2) {
        if (!selectedPayment) {
            showToast('Please select a payment method', 'warning');
            return;
        }
        if (!uploadedProofFile) {
            showToast('Please upload payment proof', 'warning');
            return;
        }
        generateOrderSummary();
    }
    
    currentStep++;
    if (currentStep > 3) currentStep = 3;
    showStep(currentStep);
}

function previousStep() {
    currentStep--;
    if (currentStep < 1) currentStep = 1;
    showStep(currentStep);
}

function showStep(step) {
    document.querySelectorAll('.form-step').forEach(s => s.classList.remove('active'));
    document.getElementById(`step-${step}`).classList.add('active');
    updateStepIndicator();
}

// ========================================
// VALIDATE ACCOUNT (Using Supabase RPC)
// ========================================
async function validateAccount() {
    const userId = elements.mlUserId.value.trim();
    const zoneId = elements.mlZoneId.value.trim();
    
    console.log('🔍 Validating account...', { userId, zoneId });
    
    // Basic validation
    if (!userId || !zoneId) {
        showValidationError('Please enter both User ID and Zone ID');
        return;
    }
    
    if (userId.length < CONFIG.minUserId || userId.length > CONFIG.maxUserId) {
        showValidationError(`User ID must be ${CONFIG.minUserId}-${CONFIG.maxUserId} digits`);
        return;
    }
    
    if (zoneId.length < CONFIG.minZoneId || zoneId.length > CONFIG.maxZoneId) {
        showValidationError(`Zone ID must be ${CONFIG.minZoneId}-${CONFIG.maxZoneId} digits`);
        return;
    }
    
    setButtonLoading(elements.validateBtn, true);
    
    try {
        console.log('📡 Calling Supabase RPC function...');
        
        // Call Supabase Database Function
        const { data, error } = await supabase
            .rpc('validate_ml_account', {
                p_user_id: userId,
                p_zone_id: zoneId
            });

        console.log('📡 RPC Response:', { data, error });

        if (error) throw error;

        if (data && data.status === 1) {
            validatedAccount = {
                userId,
                zoneId,
                username: data.username || `Player${userId}`,
                validationToken: data.validation_token
            };
            
            console.log('✅ Validation successful:', validatedAccount);
            showValidationSuccess(validatedAccount.username);
            setTimeout(() => nextStep(), 1000);
        } else {
            throw new Error(data?.reason || 'Account not found');
        }
        
    } catch (error) {
        console.error('❌ Validation error:', error);
        showValidationError(error.message || 'Validation failed. Please check your account details.');
    } finally {
        setButtonLoading(elements.validateBtn, false);
    }
}

function showValidationSuccess(username) {
    elements.validationResult.className = 'validation-result success';
    elements.validationResult.innerHTML = `
        <div class="validation-success">
            <div class="success-icon">✓</div>
            <div class="success-text">
                <strong>Account Validated!</strong>
                <p>Username: ${username}</p>
            </div>
        </div>
    `;
}

function showValidationError(message) {
    elements.validationResult.className = 'validation-result error';
    elements.validationResult.innerHTML = `
        <div class="validation-error">
            <div class="error-icon">✗</div>
            <div class="error-text">${message}</div>
        </div>
    `;
}

// ========================================
// LOAD PAYMENT METHODS
// ========================================
async function loadPaymentMethods() {
    try {
        const { data, error } = await supabase
            .from('payment_methods')
            .select('*')
            .eq('is_active', true)
            .order('sort_order', { ascending: true });

        if (error) throw error;
        displayPaymentMethods(data);
    } catch (error) {
        console.error('Load payment methods error:', error);
        elements.paymentMethods.innerHTML = '<div class="error-message">Failed to load payment methods</div>';
    }
}

function displayPaymentMethods(payments) {
    elements.paymentMethods.innerHTML = '';

    payments.forEach(payment => {
        const div = document.createElement('div');
        div.className = 'payment-method';
        div.innerHTML = `
            <div class="payment-icon">${getPaymentIcon(payment.type)}</div>
            <div class="payment-info">
                <h4>${payment.name}</h4>
                <p>${payment.type}</p>
            </div>
        `;
        div.addEventListener('click', () => selectPayment(payment, div));
        elements.paymentMethods.appendChild(div);
    });
}

function selectPayment(payment, element) {
    selectedPayment = payment;
    document.querySelectorAll('.payment-method').forEach(el => el.classList.remove('selected'));
    element.classList.add('selected');

    elements.paymentDetails.innerHTML = `
        <div class="payment-detail-box">
            <h4>💳 ငွေလွှဲရန် အချက်အလက်များ:</h4>
            <div class="detail-row">
                <span class="label">Payment Method:</span>
                <span class="value">${payment.name}</span>
            </div>
            <div class="detail-row">
                <span class="label">Account Name:</span>
                <span class="value">${payment.account_name}</span>
            </div>
            <div class="detail-row">
                <span class="label">Account Number:</span>
                <span class="value copy-text" onclick="copyToClipboard('${payment.account_number}')">${payment.account_number} 📋</span>
            </div>
            <div class="detail-row highlight">
                <span class="label">Amount to Pay:</span>
                <span class="value">${formatPrice(selectedPackage.price_mmk)} MMK</span>
            </div>
            ${payment.details ? `<div class="payment-note"><strong>📌 Note:</strong> ${payment.details}</div>` : ''}
        </div>
    `;
}

// ========================================
// FILE HANDLING
// ========================================
function handleFileSelect(e) {
    const file = e.target.files[0];
    
    if (!file) {
        uploadedProofFile = null;
        elements.preview.innerHTML = '';
        return;
    }
    
    if (!CONFIG.allowedFileTypes.includes(file.type)) {
        showToast('Please upload JPG, PNG or WebP image only', 'error');
        e.target.value = '';
        return;
    }
    
    if (file.size > CONFIG.maxFileSize) {
        showToast('File size must be less than 5MB', 'error');
        e.target.value = '';
        return;
    }
    
    uploadedProofFile = file;
    
    const reader = new FileReader();
    reader.onload = (event) => {
        elements.preview.innerHTML = `
            <div class="preview-container">
                <img src="${event.target.result}" alt="Payment Proof">
                <button type="button" class="remove-preview" onclick="removePreview()">✗</button>
            </div>
        `;
    };
    reader.readAsDataURL(file);
}

function removePreview() {
    uploadedProofFile = null;
    elements.paymentProof.value = '';
    elements.preview.innerHTML = '';
}

// ========================================
// ORDER SUMMARY
// ========================================
function generateOrderSummary() {
    elements.orderSummary.innerHTML = `
        <div class="summary-box">
            <h4>📋 Order Summary</h4>
            <div class="summary-section">
                <h5>💎 Package</h5>
                <div class="summary-row">
                    <span>${selectedPackage.name}</span>
                    <span>${formatPrice(selectedPackage.price_mmk)} MMK</span>
                </div>
            </div>
            <div class="summary-section">
                <h5>🎮 ML Account</h5>
                <div class="summary-row"><span>User ID:</span><span>${validatedAccount.userId}</span></div>
                <div class="summary-row"><span>Zone ID:</span><span>${validatedAccount.zoneId}</span></div>
                <div class="summary-row"><span>Username:</span><span>${validatedAccount.username}</span></div>
            </div>
            <div class="summary-section">
                <h5>💳 Payment</h5>
                <div class="summary-row"><span>Method:</span><span>${selectedPayment.name}</span></div>
                <div class="summary-row"><span>Account:</span><span>${selectedPayment.account_number}</span></div>
            </div>
            <div class="summary-total">
                <span>Total Amount:</span>
                <span>${formatPrice(selectedPackage.price_mmk)} MMK</span>
            </div>
        </div>
    `;
}

// ========================================
// SUBMIT ORDER
// ========================================
async function submitOrder(e) {
    e.preventDefault();
    
    if (!elements.termsAgree.checked) {
        showToast('Please agree to confirm your order', 'warning');
        return;
    }
    
    setButtonLoading(elements.submitBtn, true);
    
    try {
        console.log('📤 Uploading payment proof...');
        
        const fileName = `${Date.now()}_${uploadedProofFile.name}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('payment-proofs')
            .upload(fileName, uploadedProofFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
            .from('payment-proofs')
            .getPublicUrl(fileName);

        console.log('📝 Creating order...');

        const { data: orderData, error: orderError } = await supabase
            .from('orders')
            .insert({
                package_id: selectedPackage.id,
                payment_method_id: selectedPayment.id,
                ml_user_id: validatedAccount.userId,
                ml_zone_id: validatedAccount.zoneId,
                ml_username: validatedAccount.username,
                payment_proof_url: urlData.publicUrl,
                amount: selectedPackage.price_mmk,
                status: 'pending',
                unipin_validation_token: validatedAccount.validationToken
            })
            .select()
            .single();

        if (orderError) throw orderError;

        console.log('✅ Order created:', orderData);
        showSuccessMessage(orderData.reference_no);
        
    } catch (error) {
        console.error('❌ Submit order error:', error);
        showToast('Failed to submit order: ' + error.message, 'error');
    } finally {
        setButtonLoading(elements.submitBtn, false);
    }
}

function showSuccessMessage(referenceNo) {
    elements.orderForm.style.display = 'none';
    elements.successMessage.style.display = 'block';
    document.getElementById('order-ref-no').textContent = referenceNo;
    elements.orderModal.querySelector('.modal-content').scrollTop = 0;
}

// ========================================
// UTILITIES
// ========================================
function formatPrice(price) {
    return new Intl.NumberFormat('en-US').format(Math.round(price));
}

function formatNumber(num) {
    return new Intl.NumberFormat('en-US').format(num);
}

function getPaymentIcon(type) {
    const icons = {
        'mobile-banking': '📱',
        'e-wallet': '💳',
        'bank-transfer': '🏦',
        'crypto': '₿'
    };
    return icons[type] || '💰';
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('Copied!', 'success');
    });
}

function setButtonLoading(button, isLoading) {
    const textSpan = button.querySelector('.btn-text');
    const loaderSpan = button.querySelector('.btn-loader');
    
    if (textSpan && loaderSpan) {
        button.disabled = isLoading;
        textSpan.style.display = isLoading ? 'none' : 'inline';
        loaderSpan.style.display = isLoading ? 'inline-block' : 'none';
    }
}

function showToast(message, type = 'info') {
    elements.toast.textContent = message;
    elements.toast.className = `toast toast-${type} show`;
    setTimeout(() => elements.toast.classList.remove('show'), 3000);
}

async function testDatabaseConnection() {
    try {
        const { error } = await supabase.from('settings').select('key').limit(1);
        if (error) throw error;
        console.log('✅ Database connected');
    } catch (error) {
        console.error('❌ Database error:', error);
        showToast('Database connection error', 'error');
    }
}

// Smooth scroll
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) target.scrollIntoView({ behavior: 'smooth' });
    });
});
