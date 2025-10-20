// ========================================
// ML DIAMOND SHOP - USER INTERFACE
// Production Ready with Real UniPin Integration
// ========================================

// ========================================
// CONFIGURATION
// ========================================
const CONFIG = {
    // Supabase Configuration
    supabase: {
        url: 'https://mgbltiztcxxeibocqgqd.supabase.co', // Replace: https://xxxxx.supabase.co
        anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1nYmx0aXp0Y3h4ZWlib2NxZ3FkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5Njg0OTQsImV4cCI6MjA3NjU0NDQ5NH0.GXpTp1O7r2weHeHInMGkAhWvVgejIKgRhK9LgBKaITc' // Replace with your anon key
    },
    
    // File Upload Limits
    maxFileSize: 5 * 1024 * 1024, // 5MB
    allowedFileTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    
    // Validation
    minUserId: 4,
    maxUserId: 12,
    minZoneId: 4,
    maxZoneId: 6
};

// Initialize Supabase Client
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
    
    // Inputs
    mlUserId: document.getElementById('ml-user-id'),
    mlZoneId: document.getElementById('ml-zone-id'),
    paymentProof: document.getElementById('payment-proof'),
    termsAgree: document.getElementById('terms-agree'),
    
    // Buttons
    validateBtn: document.getElementById('validate-btn'),
    submitBtn: document.getElementById('submit-btn'),
    
    // Containers
    packageInfo: document.getElementById('package-info'),
    validationResult: document.getElementById('validation-result'),
    paymentMethods: document.getElementById('payment-methods'),
    paymentDetails: document.getElementById('payment-details'),
    preview: document.getElementById('preview'),
    orderSummary: document.getElementById('order-summary'),
    successMessage: document.getElementById('success-message'),
    
    // Toast
    toast: document.getElementById('toast')
};

// ========================================
// INITIALIZATION
// ========================================
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await loadPackages();
        setupEventListeners();
        checkDatabaseConnection();
    } catch (error) {
        console.error('Initialization error:', error);
        showToast('Failed to initialize. Please refresh the page.', 'error');
    }
});

// ========================================
// EVENT LISTENERS
// ========================================
function setupEventListeners() {
    // Close modal
    document.querySelector('.close').addEventListener('click', closeModal);
    
    // Modal outside click
    window.addEventListener('click', (e) => {
        if (e.target === elements.orderModal) {
            closeModal();
        }
    });
    
    // Validate button
    elements.validateBtn.addEventListener('click', validateAccount);
    
    // Form submit
    elements.orderForm.addEventListener('submit', submitOrder);
    
    // File input
    elements.paymentProof.addEventListener('change', handleFileSelect);
    
    // Input validation
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
        const { data, error } = await supabase
            .from('diamond_packages')
            .select('*')
            .eq('is_active', true)
            .order('sort_order', { ascending: true })
            .order('diamonds', { ascending: true });

        if (error) throw error;

        if (data && data.length > 0) {
            displayPackages(data);
        } else {
            elements.packagesGrid.innerHTML = `
                <div class="no-packages">
                    <p>No packages available at the moment.</p>
                    <p>Please try again later.</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Load packages error:', error);
        elements.packagesGrid.innerHTML = `
            <div class="error-message">
                <p>Failed to load packages.</p>
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
        
        // Add featured class if applicable
        if (pkg.is_featured) {
            card.classList.add('featured');
        }
        
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
    
    // Reset form
    elements.orderForm.reset();
    validatedAccount = null;
    selectedPayment = null;
    uploadedProofFile = null;
    
    // Display package info
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
    
    // Load payment methods
    await loadPaymentMethods();
    
    // Reset steps
    resetSteps();
    
    // Show modal
    elements.orderModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

// ========================================
// CLOSE MODAL
// ========================================
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
    
    // Hide all steps
    document.querySelectorAll('.form-step').forEach(step => {
        step.classList.remove('active');
    });
    
    // Show first step
    document.getElementById('step-1').classList.add('active');
    
    // Update step indicator
    updateStepIndicator();
    
    // Clear validation
    elements.validationResult.innerHTML = '';
    elements.preview.innerHTML = '';
}

function updateStepIndicator() {
    document.querySelectorAll('.step-item').forEach((item, index) => {
        const stepNum = index + 1;
        if (stepNum < currentStep) {
            item.classList.add('completed');
            item.classList.remove('active');
        } else if (stepNum === currentStep) {
            item.classList.add('active');
            item.classList.remove('completed');
        } else {
            item.classList.remove('active', 'completed');
        }
    });
}

function nextStep() {
    // Validation before moving to next step
    if (currentStep === 1) {
        if (!validatedAccount) {
            showToast('Please validate your ML account first', 'warning');
            return;
        }
    } else if (currentStep === 2) {
        if (!selectedPayment) {
            showToast('Please select a payment method', 'warning');
            return;
        }
        if (!uploadedProofFile) {
            showToast('Please upload payment proof', 'warning');
            return;
        }
        
        // Generate order summary
        generateOrderSummary();
    }
    
    // Move to next step
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
    // Hide all steps
    document.querySelectorAll('.form-step').forEach(s => {
        s.classList.remove('active');
    });
    
    // Show current step
    document.getElementById(`step-${step}`).classList.add('active');
    
    // Update indicator
    updateStepIndicator();
}

// ========================================
// VALIDATE ACCOUNT
// ========================================
async function validateAccount() {
    const userId = elements.mlUserId.value.trim();
    const zoneId = elements.mlZoneId.value.trim();
    
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
    
    // Show loading
    setButtonLoading(elements.validateBtn, true);
    
    try {
        // Get UniPin settings from Supabase
        const { data: settings, error: settingsError } = await supabase
            .from('settings')
            .select('key, value')
            .in('key', ['unipin_partner_id', 'unipin_secret_key', 'unipin_api_base', 'mlbb_game_code']);
        
        if (settingsError) throw settingsError;
        
        const config = {};
        settings.forEach(s => {
            config[s.key] = s.value;
        });
        
        // Call UniPin validation API
        const timestamp = Math.floor(Date.now() / 1000);
        const path = '/in-game-topup/user/validate';
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
                fields: {
                    userid: userId,
                    zoneid: parseInt(zoneId)
                }
            })
        });
        
        const result = await response.json();
        
        if (result.status === 1) {
            // Success
            validatedAccount = {
                userId,
                zoneId,
                username: result.username,
                validationToken: result.validation_token
            };
            
            showValidationSuccess(result.username);
            
            // Auto move to next step after 1 second
            setTimeout(() => nextStep(), 1000);
        } else {
            showValidationError(result.reason || 'Account not found. Please check your User ID and Zone ID.');
        }
    } catch (error) {
        console.error('Validation error:', error);
        showValidationError('Validation failed. Please check your internet connection and try again.');
    } finally {
        setButtonLoading(elements.validateBtn, false);
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
// VALIDATION UI FEEDBACK
// ========================================
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
        elements.paymentMethods.innerHTML = `
            <div class="error-message">Failed to load payment methods</div>
        `;
    }
}

// ========================================
// DISPLAY PAYMENT METHODS
// ========================================
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

// ========================================
// SELECT PAYMENT METHOD
// ========================================
function selectPayment(payment, element) {
    selectedPayment = payment;

    // Update UI
    document.querySelectorAll('.payment-method').forEach(el => {
        el.classList.remove('selected');
    });
    element.classList.add('selected');

    // Show payment details
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
            ${payment.details ? `
                <div class="payment-note">
                    <strong>📌 Note:</strong> ${payment.details}
                </div>
            ` : ''}
        </div>
    `;
}

// ========================================
// HANDLE FILE SELECT
// ========================================
function handleFileSelect(e) {
    const file = e.target.files[0];
    
    if (!file) {
        uploadedProofFile = null;
        elements.preview.innerHTML = '';
        return;
    }
    
    // Validate file type
    if (!CONFIG.allowedFileTypes.includes(file.type)) {
        showToast('Please upload JPG, PNG or WebP image only', 'error');
        e.target.value = '';
        return;
    }
    
    // Validate file size
    if (file.size > CONFIG.maxFileSize) {
        showToast('File size must be less than 5MB', 'error');
        e.target.value = '';
        return;
    }
    
    uploadedProofFile = file;
    
    // Show preview
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
// GENERATE ORDER SUMMARY
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
                <div class="summary-row">
                    <span>User ID:</span>
                    <span>${validatedAccount.userId}</span>
                </div>
                <div class="summary-row">
                    <span>Zone ID:</span>
                    <span>${validatedAccount.zoneId}</span>
                </div>
                <div class="summary-row">
                    <span>Username:</span>
                    <span>${validatedAccount.username}</span>
                </div>
            </div>
            
            <div class="summary-section">
                <h5>💳 Payment</h5>
                <div class="summary-row">
                    <span>Method:</span>
                    <span>${selectedPayment.name}</span>
                </div>
                <div class="summary-row">
                    <span>Account:</span>
                    <span>${selectedPayment.account_number}</span>
                </div>
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
    
    // Final validation
    if (!elements.termsAgree.checked) {
        showToast('Please agree to confirm your order', 'warning');
        return;
    }
    
    setButtonLoading(elements.submitBtn, true);
    
    try {
        // 1. Upload payment proof to Supabase Storage
        const fileName = `${Date.now()}_${uploadedProofFile.name}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('payment-proofs')
            .upload(fileName, uploadedProofFile, {
                cacheControl: '3600',
                upsert: false
            });

        if (uploadError) throw uploadError;

        // 2. Get public URL
        const { data: urlData } = supabase.storage
            .from('payment-proofs')
            .getPublicUrl(fileName);

        // 3. Create order in database
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

        // 4. Show success message
        showSuccessMessage(orderData.reference_no);
        
    } catch (error) {
        console.error('Submit order error:', error);
        showToast('Failed to submit order. Please try again.', 'error');
    } finally {
        setButtonLoading(elements.submitBtn, false);
    }
}

// ========================================
// SHOW SUCCESS MESSAGE
// ========================================
function showSuccessMessage(referenceNo) {
    elements.orderForm.style.display = 'none';
    elements.successMessage.style.display = 'block';
    document.getElementById('order-ref-no').textContent = referenceNo;
    
    // Scroll to top of modal
    elements.orderModal.querySelector('.modal-content').scrollTop = 0;
}

// ========================================
// UTILITY FUNCTIONS
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
        showToast('Copied to clipboard!', 'success');
    });
}

function setButtonLoading(button, isLoading) {
    const textSpan = button.querySelector('.btn-text');
    const loaderSpan = button.querySelector('.btn-loader');
    
    if (isLoading) {
        button.disabled = true;
        textSpan.style.display = 'none';
        loaderSpan.style.display = 'inline-block';
    } else {
        button.disabled = false;
        textSpan.style.display = 'inline';
        loaderSpan.style.display = 'none';
    }
}

function showToast(message, type = 'info') {
    const toast = elements.toast;
    toast.textContent = message;
    toast.className = `toast toast-${type} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

async function checkDatabaseConnection() {
    try {
        const { error } = await supabase
            .from('settings')
            .select('key')
            .limit(1);
        
        if (error) throw error;
        
        console.log('✅ Database connected successfully');
    } catch (error) {
        console.error('❌ Database connection failed:', error);
        showToast('Database connection error. Please check configuration.', 'error');
    }
}

// ========================================
// SMOOTH SCROLL
// ========================================
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});
