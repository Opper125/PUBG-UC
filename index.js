
/* ========================================
   SUPABASE CONFIGURATION
======================================== */

const SUPABASE_URL = 'https://vqumonhyeekgltvercbw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxdW1vbmh5ZWVrZ2x0dmVyY2J3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1NTgzMzAsImV4cCI6MjA3NzEzNDMzMH0._C5EiMWyNs65ymDuwle_8UEytEqhn2bwniNvC9G9j1I';

// Initialize Supabase with error handling
let supabase;
try {
    if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('✅ Supabase initialized successfully');
    } else {
        console.error('❌ Supabase library not loaded');
        alert('Database library failed to load. Please refresh the page.');
    }
} catch (error) {
    console.error('❌ Supabase initialization error:', error);
    alert('Database connection error. Please refresh the page.');
}

// Test database connection
async function testDatabaseConnection() {
    try {
        const { data, error } = await supabase
            .from('website_config')
            .select('id')
            .limit(1);
        
        if (error) {
            console.error('❌ Database connection test failed:', error);
            return false;
        }
        
        console.log('✅ Database connection successful');
        return true;
    } catch (error) {
        console.error('❌ Database connection error:', error);
        return false;
    }
}

/* ========================================
   GLOBAL STATE MANAGEMENT
======================================== */

const AppState = {
    currentUser: null,
    currentPage: 'home',
    websiteConfig: null,
    categories: [],
    products: [],
    orders: [],
    notifications: [],
    cart: [],
    selectedProduct: null,
    currentCategory: null,
    currentCategoryCard: null,
    musicPlaylist: [],
    currentSongIndex: 0,
    isPlaying: false,
    sessionActive: false
};

/* ========================================
   PROFANITY & VALIDATION FILTERS
======================================== */

const PROFANITY_LIST = [
    'fuck', 'shit', 'ass', 'bitch', 'damn', 'hell',
    'အမေ', 'အဖေ', 'မိဘ', 'ကောင်', 'ခွေး', 'ဘဲ',
    'လိုးတော', 'လိုး', 'မိုက်', 'အရူး', 'မျက်စိ'
];

const SPECIAL_CHARS = ['@', '#', '%', '*', '&', '®', '©'];

/* ========================================
   UTILITY FUNCTIONS
======================================== */

function showLoader() {
    const loader = document.getElementById('globalLoader');
    if (loader) {
        loader.classList.add('active');
        document.body.classList.add('no-scroll');
    }
}

function hideLoader() {
    const loader = document.getElementById('globalLoader');
    if (loader) {
        setTimeout(() => {
            loader.classList.remove('active');
            document.body.classList.remove('no-scroll');
        }, 300);
    }
}

function showToast(title, message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer');
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const iconMap = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    
    toast.innerHTML = `
        <i class="fas ${iconMap[type]} toast-icon"></i>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'toastSlideOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

function sanitizeInput(input) {
    return input.replace(/[<>"']/g, '').trim();
}

function isEnglishOnly(text) {
    return /^[a-zA-Z0-9@#%*&®©._-]+$/.test(text);
}

function containsProfanity(text) {
    const lowerText = text.toLowerCase();
    return PROFANITY_LIST.some(word => lowerText.includes(word));
}

function isValidGmail(email) {
    return /^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(email);
}

function isValidPassword(password) {
    // At least 8 characters
    if (password.length < 8) return { valid: false, message: 'Password must be at least 8 characters' };
    
    // Must start with uppercase
    if (!/^[A-Z]/.test(password)) return { valid: false, message: 'Password must start with uppercase letter' };
    
    // Must contain special character
    const hasSpecial = SPECIAL_CHARS.some(char => password.includes(char));
    if (!hasSpecial) return { valid: false, message: 'Password must contain special character (@#%*&®©)' };
    
    return { valid: true, message: 'Valid password' };
}

function generateAIAvatar() {
    const colors = [
        'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
        'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
        'linear-gradient(135deg, #fa709a 0%, #fee140 100%)'
    ];
    
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    
    // Create SVG avatar with AI style
    const svg = `
        <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="grad${Date.now()}" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:rgb(102,126,234);stop-opacity:1" />
                    <stop offset="100%" style="stop-color:rgb(118,75,162);stop-opacity:1" />
                </linearGradient>
            </defs>
            <circle cx="100" cy="100" r="90" fill="url(#grad${Date.now()})" />
            <circle cx="75" cy="85" r="8" fill="white" opacity="0.9"/>
            <circle cx="125" cy="85" r="8" fill="white" opacity="0.9"/>
            <path d="M 70 120 Q 100 140 130 120" stroke="white" stroke-width="4" fill="none" opacity="0.9"/>
        </svg>
    `;
    
    return 'data:image/svg+xml;base64,' + btoa(svg);
}

function generateOrderId() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

function formatPrice(price) {
    return new Intl.NumberFormat('en-US').format(price) + ' Ks';
}

function calculateDiscount(price, discountPercent) {
    if (!discountPercent || discountPercent === 0) return price;
    return price - (price * (discountPercent / 100));
}

async function uploadImage(file) {
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `uploads/${fileName}`;
        
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
   SESSION MANAGEMENT
======================================== */

function saveSession(user) {
    localStorage.setItem('userSession', JSON.stringify({
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        timestamp: Date.now()
    }));
    AppState.sessionActive = true;
    AppState.currentUser = user;
}

function clearSession() {
    localStorage.removeItem('userSession');
    AppState.sessionActive = false;
    AppState.currentUser = null;
}

function checkSession() {
    const session = localStorage.getItem('userSession');
    if (!session) return false;
    
    try {
        const userData = JSON.parse(session);
        const sessionAge = Date.now() - userData.timestamp;
        const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
        
        if (sessionAge > SEVEN_DAYS) {
            clearSession();
            return false;
        }
        
        AppState.currentUser = userData;
        AppState.sessionActive = true;
        return true;
    } catch (error) {
        clearSession();
        return false;
    }
}

async function validateSession() {
    if (!AppState.currentUser) return false;
    
    try {
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', AppState.currentUser.id)
            .eq('status', 'active')
            .single();
        
        if (error || !user) {
            clearSession();
            return false;
        }
        
        AppState.currentUser = user;
        return true;
    } catch (error) {
        console.error('Session validation error:', error);
        clearSession();
        return false;
    }
}

function logout() {
    clearSession();
    showToast('Logout', 'You have been logged out successfully', 'success');
    setTimeout(() => {
        window.location.reload();
    }, 1000);
}

/* ========================================
   AUTHENTICATION SYSTEM
======================================== */

function openAuthModal() {
    const modal = document.getElementById('authModal');
    if (modal) {
        modal.classList.add('active');
        document.body.classList.add('no-scroll');
    }
}

function closeAuthModal() {
    const modal = document.getElementById('authModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.classList.remove('no-scroll');
    }
}

function switchToSignup() {
    document.getElementById('loginForm').classList.remove('active');
    document.getElementById('signupForm').classList.add('active');
}

function switchToLogin() {
    document.getElementById('signupForm').classList.remove('active');
    document.getElementById('loginForm').classList.add('active');
}

// Password visibility toggle
document.addEventListener('DOMContentLoaded', () => {
    const toggleButtons = document.querySelectorAll('.toggle-password');
    
    toggleButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const input = this.previousElementSibling;
            if (input.type === 'password') {
                input.type = 'text';
                this.classList.replace('fa-eye', 'fa-eye-slash');
            } else {
                input.type = 'password';
                this.classList.replace('fa-eye-slash', 'fa-eye');
            }
        });
    });
});

// Password requirements checker
document.addEventListener('DOMContentLoaded', () => {
    const signupPassword = document.getElementById('signupPassword');
    if (signupPassword) {
        signupPassword.addEventListener('input', function(e) {
            const password = e.target.value;
            
            // Requirement 1: At least 8 characters
            const req1 = document.getElementById('req1');
            if (req1) {
                if (password.length >= 8) {
                    req1.classList.add('valid');
                } else {
                    req1.classList.remove('valid');
                }
            }
            
            // Requirement 2: Start with uppercase
            const req2 = document.getElementById('req2');
            if (req2) {
                if (/^[A-Z]/.test(password)) {
                    req2.classList.add('valid');
                } else {
                    req2.classList.remove('valid');
                }
            }
            
            // Requirement 3: Special character
            const req3 = document.getElementById('req3');
            if (req3) {
                const hasSpecial = SPECIAL_CHARS.some(char => password.includes(char));
                if (hasSpecial) {
                    req3.classList.add('valid');
                } else {
                    req3.classList.remove('valid');
                }
            }
        });
    }
});

// Login Form Handler
document.addEventListener('DOMContentLoaded', () => {
    const loginFormElement = document.getElementById('loginFormElement');
    if (loginFormElement) {
        loginFormElement.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = sanitizeInput(document.getElementById('loginEmail').value);
            const password = document.getElementById('loginPassword').value;
            
            if (!isValidGmail(email)) {
                showToast('Invalid Email', 'Please use a valid Gmail address', 'error');
                return;
            }
            
            showLoader();
            
            try {
                // Check if user exists in database
                const { data: users, error } = await supabase
                    .from('users')
                    .select('*')
                    .eq('email', email)
                    .eq('password', password)
                    .eq('status', 'active')
                    .single();
                
                if (error || !users) {
                    hideLoader();
                    showToast('Login Failed', 'Invalid email or password', 'error');
                    return;
                }
                
                // Save session
                saveSession(users);
                
                // Close modal and initialize dashboard
                closeAuthModal();
                await initializeUserDashboard();
                
                hideLoader();
                showToast('Welcome Back!', `Hello ${users.username}!`, 'success');
                
            } catch (error) {
                console.error('Login error:', error);
                hideLoader();
                showToast('Error', 'Login failed. Please try again.', 'error');
            }
        });
    }
});

// Signup Form Handler
document.addEventListener('DOMContentLoaded', () => {
    const signupFormElement = document.getElementById('signupFormElement');
    if (signupFormElement) {
        signupFormElement.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const username = sanitizeInput(document.getElementById('signupUsername').value);
            const email = sanitizeInput(document.getElementById('signupEmail').value);
            const password = document.getElementById('signupPassword').value;
            
            // Validation
            if (!isEnglishOnly(username)) {
                showToast('Invalid Username', 'Username must be in English only', 'error');
                return;
            }
            
            if (containsProfanity(username)) {
                showToast('Invalid Username', 'Username contains inappropriate words', 'error');
                return;
            }
            
            if (!isValidGmail(email)) {
                showToast('Invalid Email', 'Please use a valid Gmail address', 'error');
                return;
            }
            
            const passwordCheck = isValidPassword(password);
            if (!passwordCheck.valid) {
                showToast('Invalid Password', passwordCheck.message, 'error');
                return;
            }
            
            showLoader();
            
            try {
                // Check if username exists
                const { data: existingUsername } = await supabase
                    .from('users')
                    .select('username')
                    .eq('username', username)
                    .single();
                
                if (existingUsername) {
                    hideLoader();
                    showToast('Username Taken', 'This username is already in use', 'error');
                    return;
                }
                
                // Check if email exists
                const { data: existingEmail } = await supabase
                    .from('users')
                    .select('email')
                    .eq('email', email)
                    .single();
                
                if (existingEmail) {
                    hideLoader();
                    showToast('Email Taken', 'This email is already registered', 'error');
                    return;
                }
                
                // Generate AI avatar
                const avatar = generateAIAvatar();
                
                // Create new user
                const { data: newUser, error } = await supabase
                    .from('users')
                    .insert([{
                        username: username,
                        email: email,
                        password: password,
                        avatar: avatar,
                        status: 'active'
                    }])
                    .select()
                    .single();
                
                if (error) throw error;
                
                // Save session
                saveSession(newUser);
                
                // Close modal and initialize dashboard
                closeAuthModal();
                await initializeUserDashboard();
                
                hideLoader();
                showToast('Account Created!', `Welcome ${newUser.username}!`, 'success');
                
            } catch (error) {
                console.error('Signup error:', error);
                hideLoader();
                showToast('Error', 'Signup failed. Please try again.', 'error');
            }
        });
    }
});

/* ========================================
   UI COMPONENTS
======================================== */

function toggleNotifications() {
    const panel = document.getElementById('notificationPanel');
    if (panel) {
        panel.classList.toggle('active');
        if (panel.classList.contains('active')) {
            loadNotifications();
        }
    }
}

function closeNotifications() {
    const panel = document.getElementById('notificationPanel');
    if (panel) {
        panel.classList.remove('active');
    }
}

function toggleUserMenu() {
    const menu = document.getElementById('userMenu');
    if (menu) {
        menu.classList.toggle('active');
    }
}

// Close menus when clicking outside
document.addEventListener('click', (e) => {
    const userMenu = document.getElementById('userMenu');
    const notificationPanel = document.getElementById('notificationPanel');
    
    if (userMenu && !e.target.closest('.user-profile-btn') && !e.target.closest('#userMenu')) {
        userMenu.classList.remove('active');
    }
    
    if (notificationPanel && !e.target.closest('.notification-btn') && !e.target.closest('#notificationPanel')) {
        notificationPanel.classList.remove('active');
    }
});

async function loadNotifications() {
    if (!AppState.currentUser) return;
    
    try {
        const { data: notifications, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', AppState.currentUser.id)
            .order('created_at', { ascending: false })
            .limit(50);
        
        if (error) throw error;
        
        const notificationList = document.getElementById('notificationList');
        if (!notificationList) return;
        
        if (!notifications || notifications.length === 0) {
            notificationList.innerHTML = '<p class="no-notifications">No notifications yet</p>';
            return;
        }
        
        notificationList.innerHTML = notifications.map(notif => `
            <div class="notification-item ${notif.is_read ? '' : 'unread'}">
                <div class="notification-icon">
                    <i class="fas ${getNotificationIcon(notif.type)}"></i>
                </div>
                <div class="notification-content">
                    <h4>${notif.title}</h4>
                    <p>${notif.message}</p>
                    <span class="notification-time">${formatTimestamp(notif.created_at)}</span>
                </div>
            </div>
        `).join('');
        
        // Update notification count
        const unreadCount = notifications.filter(n => !n.is_read).length;
        const badge = document.getElementById('notificationCount');
        if (badge) {
            badge.textContent = unreadCount;
            badge.style.display = unreadCount > 0 ? 'block' : 'none';
        }
        
    } catch (error) {
        console.error('Notifications load error:', error);
    }
}

function getNotificationIcon(type) {
    const icons = {
        order: 'fa-shopping-cart',
        coupon: 'fa-ticket-alt',
        message: 'fa-envelope',
        system: 'fa-bell'
    };
    return icons[type] || 'fa-bell';
}

function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 60) return `${minutes} minutes ago`;
    if (hours < 24) return `${hours} hours ago`;
    return `${days} days ago`;
}

/* ========================================
   PAGE NAVIGATION
======================================== */

function switchPage(pageName) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Show selected page
    const targetPage = document.getElementById(`${pageName}Page`);
    if (targetPage) {
        targetPage.classList.add('active');
    }
    
    // Update navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === pageName) {
            item.classList.add('active');
        }
    });
    
    // Update app state
    AppState.currentPage = pageName;
    
    // Load page data
    loadPageData(pageName);
}

async function loadPageData(pageName) {
    showLoader();
    
    try {
        switch(pageName) {
            case 'home':
                await loadHomePageData();
                break;
            case 'orderHistory':
                await loadOrderHistory();
                break;
            case 'news':
                await loadNews();
                break;
            case 'contacts':
                await loadContacts();
                break;
            case 'profile':
                await loadProfile();
                break;
        }
    } catch (error) {
        console.error('Page load error:', error);
        showToast('Error', 'Failed to load page data', 'error');
    } finally {
        hideLoader();
    }
}

// Setup navigation listeners
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function() {
            const page = this.dataset.page;
            
            // Check if user needs to login
            if (!AppState.sessionActive && page !== 'home') {
                openAuthModal();
                return;
            }
            
            switchPage(page);
        });
    });
});

function goBack() {
    switchPage('home');
}

/* ========================================
   APP INITIALIZATION
======================================== */

async function initApp() {
    showLoader();
    
    try {
        // Test database connection
        const dbConnected = await testDatabaseConnection();
        if (!dbConnected) {
            hideLoader();
            showToast('Connection Error', 'Failed to connect to database', 'error');
            return;
        }
        
        // Check session
        const hasSession = checkSession();
        
        if (hasSession) {
            const isValid = await validateSession();
            if (isValid) {
                await initializeUserDashboard();
            } else {
                // Load public data only
                await loadWebsiteConfig();
                await loadMainBanners();
                await loadSecondaryBanners();
            }
        } else {
            // Load public data
            await loadWebsiteConfig();
            await loadMainBanners();
            await loadSecondaryBanners();
        }
        
        hideLoader();
        
    } catch (error) {
        console.error('App initialization error:', error);
        hideLoader();
        showToast('Error', 'Failed to initialize app', 'error');
    }
}

async function initializeUserDashboard() {
    try {
        await loadWebsiteConfig();
        await loadMainBanners();
        await loadSecondaryBanners();
        await loadCategories();
        await loadMusicPlaylist();
        
        // Update UI with user info
        updateUserUI();
        
    } catch (error) {
        console.error('Dashboard init error:', error);
    }
}

async function loadWebsiteConfig() {
    try {
        const { data: config, error } = await supabase
            .from('website_config')
            .select('*')
            .limit(1)
            .single();
        
        if (error) throw error;
        
        AppState.websiteConfig = config;
        
        // Apply config
        if (config.logo_url) {
            const logoElement = document.getElementById('websiteLogo');
            if (logoElement) logoElement.src = config.logo_url;
        }
        
        if (config.background_image) {
            document.body.style.backgroundImage = `url(${config.background_image})`;
            document.body.style.backgroundSize = 'cover';
            document.body.style.backgroundPosition = 'center';
            document.body.style.backgroundAttachment = 'fixed';
        }
        
        if (config.background_video) {
            // Add video background
            const existingVideo = document.querySelector('.background-video');
            if (!existingVideo) {
                const videoElement = document.createElement('video');
                videoElement.className = 'background-video';
                videoElement.src = config.background_video;
                videoElement.autoplay = true;
                videoElement.loop = true;
                videoElement.muted = true;
                videoElement.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    z-index: -1;
                `;
                document.body.prepend(videoElement);
            }
        }
        
    } catch (error) {
        console.error('Config load error:', error);
    }
}

function updateUserUI() {
    if (!AppState.currentUser) return;
    
    const userAvatar = document.getElementById('userProfileImg');
    const userMenuAvatar = document.getElementById('userMenuAvatar');
    const userMenuName = document.getElementById('userMenuName');
    const userMenuEmail = document.getElementById('userMenuEmail');
    
    if (userAvatar) userAvatar.src = AppState.currentUser.avatar;
    if (userMenuAvatar) userMenuAvatar.src = AppState.currentUser.avatar;
    if (userMenuName) userMenuName.textContent = AppState.currentUser.username;
    if (userMenuEmail) userMenuEmail.textContent = AppState.currentUser.email;
}

// Start app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing app...');
    initApp();
});

// Prevent auto-refresh during file operations
let preventRefresh = false;

window.addEventListener('beforeunload', (e) => {
    if (preventRefresh) {
        e.preventDefault();
        e.returnValue = '';
    }
});


/* ========================================
   CATEGORIES LOADING - Part 2
======================================== */

async function loadCategories() {
    try {
        const { data: categories, error } = await supabase
            .from('categories')
            .select('*')
            .eq('status', 'active')
            .order('created_at', { ascending: true });
        
        if (error) throw error;
        
        AppState.categories = categories || [];
        
        await renderCategories();
        
    } catch (error) {
        console.error('Categories load error:', error);
    }
}

async function renderCategories() {
    const container = document.getElementById('categoriesList');
    if (!container) return;
    
    container.innerHTML = '';
    
    for (const category of AppState.categories) {
        // Get category cards for this category
        const { data: cards, error } = await supabase
            .from('category_cards')
            .select('*')
            .eq('category_id', category.id)
            .eq('status', 'active')
            .order('created_at', { ascending: true });
        
        if (error || !cards || cards.length === 0) continue;
        
        const categoryGroup = document.createElement('div');
        categoryGroup.className = 'category-group';
        
        categoryGroup.innerHTML = `
            <h3 class="category-title">
                <i class="fas fa-layer-group"></i>
                ${category.name}
            </h3>
            <div class="category-cards-grid" id="cards-${category.id}"></div>
        `;
        
        container.appendChild(categoryGroup);
        
        const cardsGrid = document.getElementById(`cards-${category.id}`);
        
        for (const card of cards) {
            await renderCategoryCard(cardsGrid, card, category);
        }
    }
}

async function renderCategoryCard(container, card, category) {
    const cardElement = document.createElement('div');
    cardElement.className = 'category-card';
    
    // Get stats for this category card
    const { data: stats } = await supabase
        .from('orders')
        .select('id')
        .eq('category_card_id', card.id)
        .eq('status', 'approved');
    
    const salesCount = stats ? stats.length : 0;
    
    // Get average rating
    const { data: feedbacks } = await supabase
        .from('feedback')
        .select('rating')
        .eq('category_card_id', card.id);
    
    let avgRating = 0;
    if (feedbacks && feedbacks.length > 0) {
        const sum = feedbacks.reduce((acc, f) => acc + f.rating, 0);
        avgRating = (sum / feedbacks.length).toFixed(1);
    }
    
    cardElement.innerHTML = `
        <div class="category-card-content">
            <div class="category-icon-wrapper">
                <img src="${card.icon_url}" alt="${card.name}" class="category-icon">
                ${card.flag_url ? `<img src="${card.flag_url}" alt="Flag" class="category-flag">` : ''}
                ${card.discount_percent ? `
                    <div class="category-discount-badge">-${card.discount_percent}%</div>
                ` : ''}
            </div>
            <div class="category-name">${card.name}</div>
            <div class="category-stats">
                <div class="category-rating">
                    <i class="fas fa-star"></i>
                    <span>${avgRating}</span>
                </div>
                <div class="category-sales">
                    <i class="fas fa-shopping-cart"></i>
                    <span>${salesCount}</span>
                </div>
            </div>
            <button class="category-topup-btn">Top Up</button>
        </div>
    `;
    
    cardElement.addEventListener('click', (e) => {
        if (!e.target.classList.contains('category-topup-btn')) {
            openCategoryProducts(category, card);
        }
    });
    
    const topupBtn = cardElement.querySelector('.category-topup-btn');
    topupBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleTopUp(card);
    });
    
    container.appendChild(cardElement);
}

function handleTopUp(card) {
    if (!AppState.sessionActive) {
        openAuthModal();
        return;
    }
    
    showToast('Top Up', 'Opening top up for ' + card.name, 'info');
    openCategoryProducts(AppState.categories.find(c => c.id === card.category_id), card);
}

/* ========================================
   BANNERS LOADING
======================================== */

async function loadMainBanners() {
    try {
        const { data: banners, error } = await supabase
            .from('main_banners')
            .select('*')
            .eq('status', 'active')
            .order('created_at', { ascending: true });
        
        if (error) throw error;
        
        const sliderContainer = document.querySelector('.banner-slides');
        const indicatorsContainer = document.querySelector('.banner-indicators');
        
        if (!sliderContainer || !banners || banners.length === 0) return;
        
        sliderContainer.innerHTML = '';
        indicatorsContainer.innerHTML = '';
        
        banners.forEach((banner, index) => {
            // Create slide
            const slide = document.createElement('div');
            slide.className = `banner-slide ${index === 0 ? 'active' : ''}`;
            
            if (banner.type === 'image') {
                slide.innerHTML = `<img src="${banner.url}" alt="Banner">`;
            } else if (banner.type === 'video') {
                slide.innerHTML = `
                    <video autoplay loop muted playsinline>
                        <source src="${banner.url}" type="video/mp4">
                    </video>
                `;
            }
            
            sliderContainer.appendChild(slide);
            
            // Create indicator
            const indicator = document.createElement('div');
            indicator.className = `banner-indicator ${index === 0 ? 'active' : ''}`;
            indicator.addEventListener('click', () => goToSlide(index));
            indicatorsContainer.appendChild(indicator);
        });
        
        // Auto-slide
        if (banners.length > 1) {
            setInterval(() => {
                nextSlide(banners.length);
            }, 5000);
        }
        
    } catch (error) {
        console.error('Main banners load error:', error);
    }
}

let currentSlideIndex = 0;

function nextSlide(totalSlides) {
    currentSlideIndex = (currentSlideIndex + 1) % totalSlides;
    goToSlide(currentSlideIndex);
}

function goToSlide(index) {
    const slides = document.querySelectorAll('.banner-slide');
    const indicators = document.querySelectorAll('.banner-indicator');
    
    slides.forEach((slide, i) => {
        slide.classList.toggle('active', i === index);
    });
    
    indicators.forEach((indicator, i) => {
        indicator.classList.toggle('active', i === index);
    });
    
    currentSlideIndex = index;
}

async function loadSecondaryBanners() {
    try {
        const { data: banners, error } = await supabase
            .from('secondary_banners')
            .select('*')
            .eq('status', 'active')
            .order('created_at', { ascending: true });
        
        if (error) throw error;
        
        const container = document.getElementById('secondaryBanner');
        
        if (!container || !banners || banners.length === 0) {
            if (container) container.innerHTML = '';
            return;
        }
        
        container.innerHTML = banners.map(banner => {
            if (banner.type === 'image') {
                return `<img src="${banner.url}" alt="Secondary Banner" class="secondary-banner-img">`;
            } else if (banner.type === 'video') {
                return `
                    <video autoplay loop muted playsinline class="secondary-banner-video">
                        <source src="${banner.url}" type="video/mp4">
                    </video>
                `;
            }
            return '';
        }).join('');
        
    } catch (error) {
        console.error('Secondary banners load error:', error);
    }
}

/* ========================================
   PRODUCTS PAGE
======================================== */

async function openCategoryProducts(category, card) {
    if (!AppState.sessionActive) {
        openAuthModal();
        return;
    }
    
    AppState.currentCategory = category;
    AppState.currentCategoryCard = card;
    
    showLoader();
    
    try {
        // Update header
        const categoryIcon = document.getElementById('categoryIcon');
        const categoryName = document.getElementById('categoryName');
        if (categoryIcon) categoryIcon.src = card.icon_url;
        if (categoryName) categoryName.textContent = card.name;
        
        // Load products page data
        await loadProductsPageBanner(card.id);
        await loadInputTables(card.id);
        await loadProducts(card.id);
        await loadProductGuidelines(card.id);
        await loadProductYoutubeVideos(card.id);
        await loadProductFeedback(card.id);
        
        // Switch to products page
        const productsPage = document.getElementById('categoryProductsPage');
        const homePage = document.getElementById('homePage');
        if (productsPage) productsPage.classList.add('active');
        if (homePage) homePage.classList.remove('active');
        
        hideLoader();
        
    } catch (error) {
        console.error('Products page error:', error);
        hideLoader();
        showToast('Error', 'Failed to load products', 'error');
    }
}

async function loadProductsPageBanner(cardId) {
    try {
        const { data: banners, error } = await supabase
            .from('product_banners')
            .select('*')
            .eq('category_card_id', cardId)
            .eq('status', 'active')
            .order('created_at', { ascending: true});
        
        if (error) throw error;
        
        const container = document.getElementById('productsPageBanner');
        
        if (!container || !banners || banners.length === 0) {
            if (container) container.innerHTML = '';
            return;
        }
        
        container.innerHTML = banners.map(banner => {
            if (banner.type === 'image') {
                return `<img src="${banner.url}" alt="Product Banner" class="product-banner-img">`;
            } else if (banner.type === 'video') {
                return `
                    <video autoplay loop muted playsinline class="product-banner-video">
                        <source src="${banner.url}" type="video/mp4">
                    </video>
                `;
            }
            return '';
        }).join('');
        
    } catch (error) {
        console.error('Product banners load error:', error);
    }
}

async function loadInputTables(cardId) {
    try {
        const { data: tables, error } = await supabase
            .from('input_tables')
            .select('*')
            .eq('category_card_id', cardId)
            .eq('status', 'active')
            .order('created_at', { ascending: true });
        
        if (error) throw error;
        
        const container = document.getElementById('productInputTables');
        
        if (!container || !tables || tables.length === 0) {
            if (container) container.innerHTML = '';
            return;
        }
        
        container.innerHTML = '<div class="input-tables-section"><h3>Product Information</h3></div>';
        const section = container.querySelector('.input-tables-section');
        
        tables.forEach(table => {
            const tableElement = document.createElement('div');
            tableElement.className = 'input-table';
            tableElement.innerHTML = `
                <h4>${table.name}</h4>
                <div class="input-table-content">
                    ${table.content || ''}
                </div>
            `;
            section.appendChild(tableElement);
        });
        
    } catch (error) {
        console.error('Input tables load error:', error);
    }
}

async function loadProducts(cardId) {
    try {
        const { data: products, error } = await supabase
            .from('products')
            .select('*')
            .eq('category_card_id', cardId)
            .eq('status', 'active')
            .order('created_at', { ascending: true });
        
        if (error) throw error;
        
        AppState.products = products || [];
        
        const container = document.getElementById('productsList');
        
        if (!container || !products || products.length === 0) {
            if (container) container.innerHTML = '<p class="no-products">No products available</p>';
            return;
        }
        
        container.innerHTML = products.map(product => {
            const finalPrice = calculateDiscount(product.price, product.discount_percent);
            const discountPercent = AppState.currentCategoryCard?.discount_percent || 0;
            const withCategoryDiscount = calculateDiscount(finalPrice, discountPercent);
            
            return `
                <div class="product-card" data-product-id="${product.id}">
                    <div class="product-image">
                        <img src="${product.image_url || '/placeholder.png'}" alt="${product.name}">
                        ${product.discount_percent ? `
                            <div class="product-discount-badge">-${product.discount_percent}%</div>
                        ` : ''}
                    </div>
                    <div class="product-info">
                        <h4 class="product-name">${product.name}</h4>
                        <p class="product-description">${product.description || ''}</p>
                        <div class="product-price">
                            ${product.discount_percent || discountPercent ? `
                                <span class="product-price-old">${formatPrice(product.price)}</span>
                            ` : ''}
                            <span class="product-price-new">${formatPrice(withCategoryDiscount)}</span>
                        </div>
                        <button class="product-buy-btn" onclick="openProductDetail('${product.id}')">
                            <i class="fas fa-shopping-cart"></i>
                            Buy Now
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Products load error:', error);
    }
}

async function loadProductGuidelines(cardId) {
    try {
        const { data: guidelines, error } = await supabase
            .from('product_guidelines')
            .select('*')
            .eq('category_card_id', cardId)
            .eq('status', 'active')
            .limit(1)
            .single();
        
        if (error || !guidelines) {
            const container = document.getElementById('productGuidelines');
            if (container) container.innerHTML = '';
            return;
        }
        
        const container = document.getElementById('productGuidelines');
        if (!container) return;
        
        container.innerHTML = `
            <div class="guidelines-section">
                <h3><i class="fas fa-book"></i> Guidelines</h3>
                <div class="guidelines-content">
                    ${guidelines.content || ''}
                </div>
            </div>
        `;
        
    } catch (error) {
        console.error('Guidelines load error:', error);
    }
}

async function loadProductYoutubeVideos(cardId) {
    try {
        const { data: videos, error } = await supabase
            .from('product_youtube_videos')
            .select('*')
            .eq('category_card_id', cardId)
            .eq('status', 'active')
            .order('created_at', { ascending: true });
        
        if (error || !videos || videos.length === 0) {
            const container = document.getElementById('productYoutubeVideos');
            if (container) container.innerHTML = '';
            return;
        }
        
        const container = document.getElementById('productYoutubeVideos');
        if (!container) return;
        
        container.innerHTML = `
            <div class="youtube-videos-section">
                <h3><i class="fab fa-youtube"></i> Tutorial Videos</h3>
                <div class="youtube-videos-grid">
                    ${videos.map(video => `
                        <div class="youtube-video-card">
                            <iframe 
                                src="https://www.youtube.com/embed/${getYoutubeId(video.url)}"
                                frameborder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowfullscreen
                            ></iframe>
                            ${video.title ? `<p class="video-title">${video.title}</p>` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
    } catch (error) {
        console.error('Youtube videos load error:', error);
    }
}

function getYoutubeId(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

async function loadProductFeedback(cardId) {
    try {
        const { data: feedbacks, error } = await supabase
            .from('feedback')
            .select('*, users(username, avatar)')
            .eq('category_card_id', cardId)
            .eq('status', 'approved')
            .order('created_at', { ascending: false })
            .limit(10);
        
        if (error || !feedbacks || feedbacks.length === 0) {
            const container = document.getElementById('productFeedback');
            if (container) container.innerHTML = '';
            return;
        }
        
        const container = document.getElementById('productFeedback');
        if (!container) return;
        
        container.innerHTML = `
            <div class="feedback-section">
                <h3><i class="fas fa-comments"></i> Customer Reviews</h3>
                <div class="feedback-list">
                    ${feedbacks.map(feedback => `
                        <div class="feedback-item">
                            <div class="feedback-header">
                                <img src="${feedback.users?.avatar || '/placeholder.png'}" alt="Avatar" class="feedback-avatar">
                                <div class="feedback-info">
                                    <h5>${feedback.users?.username || 'Anonymous'}</h5>
                                    <div class="feedback-rating">
                                        ${generateStars(feedback.rating)}
                                    </div>
                                </div>
                                <span class="feedback-date">${formatTimestamp(feedback.created_at)}</span>
                            </div>
                            <p class="feedback-message">${feedback.message}</p>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
    } catch (error) {
        console.error('Feedback load error:', error);
    }
}

function generateStars(rating) {
    let stars = '';
    for (let i = 1; i <= 5; i++) {
        if (i <= rating) {
            stars += '<i class="fas fa-star"></i>';
        } else {
            stars += '<i class="far fa-star"></i>';
        }
    }
    return stars;
}

/* ========================================
   PRODUCT DETAIL MODAL
======================================== */

async function openProductDetail(productId) {
    const product = AppState.products.find(p => p.id === productId);
    if (!product) return;
    
    AppState.selectedProduct = product;
    
    showLoader();
    
    try {
        // Get product payment methods
        const { data: paymentMethods, error } = await supabase
            .from('product_payment_methods')
            .select('payment_methods(*)')
            .eq('product_id', productId);
        
        if (error) throw error;
        
        const modal = document.getElementById('productDetailModal');
        const content = document.getElementById('productDetailContent');
        
        if (!modal || !content) return;
        
        const finalPrice = calculateDiscount(product.price, product.discount_percent);
        const discountPercent = AppState.currentCategoryCard?.discount_percent || 0;
        const withCategoryDiscount = calculateDiscount(finalPrice, discountPercent);
        
        content.innerHTML = `
            <div class="product-detail-wrapper">
                <div class="product-detail-image">
                    <img src="${product.image_url || '/placeholder.png'}" alt="${product.name}">
                </div>
                <div class="product-detail-info">
                    <h2>${product.name}</h2>
                    <p class="product-detail-description">${product.description || ''}</p>
                    
                    <div class="product-detail-price">
                        ${product.discount_percent || discountPercent ? `
                            <span class="price-old">${formatPrice(product.price)}</span>
                        ` : ''}
                        <span class="price-new">${formatPrice(withCategoryDiscount)}</span>
                    </div>
                    
                    <div class="product-quantity">
                        <label>Quantity:</label>
                        <div class="quantity-controls">
                            <button onclick="decreaseQuantity()"><i class="fas fa-minus"></i></button>
                            <input type="number" id="productQuantity" value="1" min="1">
                            <button onclick="increaseQuantity()"><i class="fas fa-plus"></i></button>
                        </div>
                    </div>
                    
                    <button class="product-detail-buy-btn" onclick="proceedToPayment()">
                        <i class="fas fa-shopping-cart"></i>
                        Proceed to Payment
                    </button>
                </div>
            </div>
        `;
        
        modal.classList.add('active');
        hideLoader();
        
    } catch (error) {
        console.error('Product detail error:', error);
        hideLoader();
        showToast('Error', 'Failed to load product details', 'error');
    }
}

function closeProductDetail() {
    const modal = document.getElementById('productDetailModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

function increaseQuantity() {
    const input = document.getElementById('productQuantity');
    if (input) {
        input.value = parseInt(input.value) + 1;
    }
}

function decreaseQuantity() {
    const input = document.getElementById('productQuantity');
    if (input && parseInt(input.value) > 1) {
        input.value = parseInt(input.value) - 1;
    }
}

/* ========================================
   ORDER & PAYMENT
======================================== */

async function proceedToPayment() {
    if (!AppState.selectedProduct) return;
    
    const quantity = parseInt(document.getElementById('productQuantity')?.value || 1);
    
    showLoader();
    
    try {
        // Get payment methods for this product
        const { data: productPaymentMethods, error } = await supabase
            .from('product_payment_methods')
            .select('payment_methods(*)')
            .eq('product_id', AppState.selectedProduct.id);
        
        if (error) throw error;
        
        const paymentMethods = productPaymentMethods.map(ppm => ppm.payment_methods);
        
        if (!paymentMethods || paymentMethods.length === 0) {
            hideLoader();
            showToast('Error', 'No payment methods available', 'error');
            return;
        }
        
        // Close product detail modal
        closeProductDetail();
        
        // Show order confirmation modal
        showOrderConfirmation(AppState.selectedProduct, quantity, paymentMethods);
        
        hideLoader();
        
    } catch (error) {
        console.error('Payment error:', error);
        hideLoader();
        showToast('Error', 'Failed to proceed to payment', 'error');
    }
}

function showOrderConfirmation(product, quantity, paymentMethods) {
    const modal = document.getElementById('orderConfirmModal');
    const content = document.getElementById('orderConfirmContent');
    
    if (!modal || !content) return;
    
    const finalPrice = calculateDiscount(product.price, product.discount_percent);
    const discountPercent = AppState.currentCategoryCard?.discount_percent || 0;
    const unitPrice = calculateDiscount(finalPrice, discountPercent);
    const totalPrice = unitPrice * quantity;
    
    content.innerHTML = `
        <div class="order-confirm-wrapper">
            <h2>Order Confirmation</h2>
            
            <div class="order-summary">
                <h3>Order Summary</h3>
                <div class="order-item">
                    <img src="${product.image_url}" alt="${product.name}">
                    <div class="order-item-info">
                        <h4>${product.name}</h4>
                        <p>Unit Price: ${formatPrice(unitPrice)}</p>
                        <p>Quantity: ${quantity}</p>
                        <p class="order-total">Total: ${formatPrice(totalPrice)}</p>
                    </div>
                </div>
            </div>
            
            <div class="payment-methods-section">
                <h3>Select Payment Method</h3>
                <div class="payment-methods-list">
                    ${paymentMethods.map(pm => `
                        <div class="payment-method-card" onclick="selectPaymentMethod('${pm.id}')">
                            <img src="${pm.icon_url}" alt="${pm.name}">
                            <div class="payment-method-info">
                                <h4>${pm.name}</h4>
                                <p>${pm.account_name}</p>
                                <p>${pm.account_number}</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div class="order-actions">
                <button class="btn-cancel" onclick="closeOrderConfirmation()">Cancel</button>
            </div>
        </div>
    `;
    
    modal.classList.add('active');
}

function closeOrderConfirmation() {
    const modal = document.getElementById('orderConfirmModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

async function selectPaymentMethod(paymentMethodId) {
    if (!AppState.selectedProduct || !AppState.currentUser) return;
    
    const quantity = parseInt(document.getElementById('productQuantity')?.value || 1);
    
    showLoader();
    
    try {
        // Get payment method details
        const { data: paymentMethod, error: pmError } = await supabase
            .from('payment_methods')
            .select('*')
            .eq('id', paymentMethodId)
            .single();
        
        if (pmError) throw pmError;
        
        const finalPrice = calculateDiscount(AppState.selectedProduct.price, AppState.selectedProduct.discount_percent);
        const discountPercent = AppState.currentCategoryCard?.discount_percent || 0;
        const unitPrice = calculateDiscount(finalPrice, discountPercent);
        const totalAmount = unitPrice * quantity;
        
        // Create order
        const orderId = generateOrderId();
        
        const { data: newOrder, error: orderError } = await supabase
            .from('orders')
            .insert([{
                order_id: orderId,
                user_id: AppState.currentUser.id,
                product_id: AppState.selectedProduct.id,
                category_card_id: AppState.currentCategoryCard.id,
                quantity: quantity,
                total_amount: totalAmount,
                payment_method_id: paymentMethodId,
                status: 'pending'
            }])
            .select()
            .single();
        
        if (orderError) throw orderError;
        
        closeOrderConfirmation();
        hideLoader();
        
        showToast('Order Created', `Order ID: ${orderId}. Please complete payment and upload screenshot.`, 'success');
        
        // Show payment instructions
        showPaymentInstructions(newOrder, paymentMethod);
        
    } catch (error) {
        console.error('Order creation error:', error);
        hideLoader();
        showToast('Error', 'Failed to create order', 'error');
    }
}

function showPaymentInstructions(order, paymentMethod) {
    const modal = document.getElementById('orderConfirmModal');
    const content = document.getElementById('orderConfirmContent');
    
    if (!modal || !content) return;
    
    content.innerHTML = `
        <div class="payment-instructions">
            <h2><i class="fas fa-check-circle"></i> Order Created Successfully</h2>
            <p class="order-id">Order ID: ${order.order_id}</p>
            
            <div class="payment-info">
                <h3>Payment Information</h3>
                <div class="payment-details">
                    <img src="${paymentMethod.icon_url}" alt="${paymentMethod.name}">
                    <div>
                        <p><strong>Method:</strong> ${paymentMethod.name}</p>
                        <p><strong>Account Name:</strong> ${paymentMethod.account_name}</p>
                        <p><strong>Account Number:</strong> ${paymentMethod.account_number}</p>
                        <p><strong>Amount:</strong> ${formatPrice(order.total_amount)}</p>
                    </div>
                </div>
                ${paymentMethod.instructions ? `
                    <div class="payment-instructions-text">
                        <h4>Instructions:</h4>
                        <p>${paymentMethod.instructions}</p>
                    </div>
                ` : ''}
            </div>
            
            <div class="payment-screenshot">
                <h3>Upload Payment Screenshot</h3>
                <input type="file" id="paymentScreenshot" accept="image/*">
                <button class="btn-upload" onclick="uploadPaymentScreenshot('${order.id}')">
                    <i class="fas fa-upload"></i>
                    Upload Screenshot
                </button>
            </div>
            
            <div class="order-actions">
                <button class="btn-primary" onclick="closeOrderConfirmation()">Done</button>
            </div>
        </div>
    `;
    
    modal.classList.add('active');
}

async function uploadPaymentScreenshot(orderId) {
    const fileInput = document.getElementById('paymentScreenshot');
    if (!fileInput || !fileInput.files[0]) {
        showToast('Error', 'Please select a screenshot', 'error');
        return;
    }
    
    showLoader();
    
    try {
        const file = fileInput.files[0];
        const screenshotUrl = await uploadImage(file);
        
        // Update order with screenshot
        const { error } = await supabase
            .from('orders')
            .update({ payment_screenshot: screenshotUrl })
            .eq('id', orderId);
        
        if (error) throw error;
        
        hideLoader();
        closeOrderConfirmation();
        showToast('Success', 'Payment screenshot uploaded! Waiting for approval.', 'success');
        
    } catch (error) {
        console.error('Screenshot upload error:', error);
        hideLoader();
        showToast('Error', 'Failed to upload screenshot', 'error');
    }
}

/* ========================================
   PAGE DATA LOADERS
======================================== */

async function loadHomePageData() {
    try {
        await loadWebsiteConfig();
        await loadMainBanners();
        await loadSecondaryBanners();
        if (AppState.sessionActive) {
            await loadCategories();
        }
    } catch (error) {
        console.error('Home page data load error:', error);
    }
}

async function loadOrderHistory() {
    if (!AppState.currentUser) return;
    
    try {
        const { data: orders, error } = await supabase
            .from('orders')
            .select('*, products(name, image_url), category_cards(name)')
            .eq('user_id', AppState.currentUser.id)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        const container = document.getElementById('orderHistoryList');
        if (!container) return;
        
        if (!orders || orders.length === 0) {
            container.innerHTML = '<p class="no-orders">No orders yet</p>';
            return;
        }
        
        container.innerHTML = orders.map(order => `
            <div class="order-item">
                <div class="order-header">
                    <span class="order-id">Order #${order.order_id}</span>
                    <span class="order-status status-${order.status}">${order.status}</span>
                </div>
                <div class="order-body">
                    <img src="${order.products?.image_url}" alt="${order.products?.name}">
                    <div class="order-info">
                        <h4>${order.products?.name}</h4>
                        <p>Category: ${order.category_cards?.name}</p>
                        <p>Quantity: ${order.quantity}</p>
                        <p>Total: ${formatPrice(order.total_amount)}</p>
                        <p class="order-date">${formatTimestamp(order.created_at)}</p>
                    </div>
                </div>
                ${order.status === 'approved' && order.delivered_data ? `
                    <div class="order-delivered-data">
                        <h5>Delivered Information:</h5>
                        <pre>${order.delivered_data}</pre>
                    </div>
                ` : ''}
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Order history load error:', error);
    }
}

async function loadNews() {
    try {
        const { data: news, error } = await supabase
            .from('news')
            .select('*')
            .eq('status', 'active')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        const container = document.getElementById('newsList');
        if (!container) return;
        
        if (!news || news.length === 0) {
            container.innerHTML = '<p class="no-news">No news yet</p>';
            return;
        }
        
        container.innerHTML = news.map(item => `
            <div class="news-item">
                <h3>${item.title}</h3>
                <div class="news-content">${item.content}</div>
                ${item.images ? `
                    <div class="news-images">
                        ${JSON.parse(item.images).map(img => `
                            <img src="${img}" alt="News image">
                        `).join('')}
                    </div>
                ` : ''}
                ${item.video_url ? `
                    <video controls class="news-video">
                        <source src="${item.video_url}" type="video/mp4">
                    </video>
                ` : ''}
                <p class="news-date">${formatTimestamp(item.created_at)}</p>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('News load error:', error);
    }
}

async function loadContacts() {
    try {
        const { data: contacts, error } = await supabase
            .from('contacts')
            .select('*')
            .eq('status', 'active')
            .order('created_at', { ascending: true });
        
        if (error) throw error;
        
        const container = document.getElementById('contactsList');
        if (!container) return;
        
        if (!contacts || contacts.length === 0) {
            container.innerHTML = '<p class="no-contacts">No contacts available</p>';
            return;
        }
        
        container.innerHTML = contacts.map(contact => `
            <a href="${contact.link}" target="_blank" class="contact-card">
                <img src="${contact.icon_url}" alt="${contact.name}">
                <div class="contact-info">
                    <h4>${contact.name}</h4>
                    ${contact.description ? `<p>${contact.description}</p>` : ''}
                </div>
                <i class="fas fa-external-link-alt"></i>
            </a>
        `).join('');
        
    } catch (error) {
        console.error('Contacts load error:', error);
    }
}

async function loadProfile() {
    if (!AppState.currentUser) return;
    
    const container = document.getElementById('profileContent');
    if (!container) return;
    
    container.innerHTML = `
        <div class="profile-card">
            <div class="profile-avatar">
                <img src="${AppState.currentUser.avatar}" alt="Avatar">
            </div>
            <h3>${AppState.currentUser.username}</h3>
            <p>${AppState.currentUser.email}</p>
            
            <div class="profile-stats">
                <div class="profile-stat">
                    <i class="fas fa-shopping-cart"></i>
                    <span>Total Orders</span>
                    <strong id="totalOrders">0</strong>
                </div>
                <div class="profile-stat">
                    <i class="fas fa-money-bill-wave"></i>
                    <span>Total Spent</span>
                    <strong id="totalSpent">0 Ks</strong>
                </div>
            </div>
            
            <div class="profile-actions">
                <button class="btn-primary" onclick="editProfile()">
                    <i class="fas fa-edit"></i>
                    Edit Profile
                </button>
                <button class="btn-danger" onclick="logout()">
                    <i class="fas fa-sign-out-alt"></i>
                    Logout
                </button>
            </div>
        </div>
    `;
    
    // Load profile stats
    loadProfileStats();
}

async function loadProfileStats() {
    if (!AppState.currentUser) return;
    
    try {
        const { data: orders, error } = await supabase
            .from('orders')
            .select('total_amount')
            .eq('user_id', AppState.currentUser.id);
        
        if (error) throw error;
        
        const totalOrders = orders ? orders.length : 0;
        const totalSpent = orders ? orders.reduce((sum, order) => sum + parseFloat(order.total_amount), 0) : 0;
        
        const totalOrdersEl = document.getElementById('totalOrders');
        const totalSpentEl = document.getElementById('totalSpent');
        
        if (totalOrdersEl) totalOrdersEl.textContent = totalOrders;
        if (totalSpentEl) totalSpentEl.textContent = formatPrice(totalSpent);
        
    } catch (error) {
        console.error('Profile stats load error:', error);
    }
}

function editProfile() {
    showToast('Edit Profile', 'Profile editing feature coming soon!', 'info');
}

/* ========================================
   MUSIC PLAYER
======================================== */

async function loadMusicPlaylist() {
    try {
        const { data: songs, error } = await supabase
            .from('background_music')
            .select('*')
            .eq('status', 'active')
            .order('created_at', { ascending: true });
        
        if (error) throw error;
        
        AppState.musicPlaylist = songs || [];
        
        if (songs && songs.length > 0) {
            loadSong(0);
        }
        
    } catch (error) {
        console.error('Music playlist load error:', error);
    }
}

function loadSong(index) {
    if (!AppState.musicPlaylist || AppState.musicPlaylist.length === 0) return;
    
    const song = AppState.musicPlaylist[index];
    const audio = document.getElementById('audioPlayer');
    const songName = document.getElementById('currentSongName');
    
    if (audio && song) {
        audio.src = song.url;
        if (songName) songName.textContent = song.name;
        AppState.currentSongIndex = index;
    }
}

function togglePlayPause() {
    const audio = document.getElementById('audioPlayer');
    const btn = document.getElementById('playPauseBtn');
    
    if (!audio || !btn) return;
    
    if (audio.paused) {
        audio.play();
        btn.innerHTML = '<i class="fas fa-pause"></i>';
        AppState.isPlaying = true;
    } else {
        audio.pause();
        btn.innerHTML = '<i class="fas fa-play"></i>';
        AppState.isPlaying = false;
    }
}

function playNextSong() {
    if (AppState.musicPlaylist.length === 0) return;
    
    AppState.currentSongIndex = (AppState.currentSongIndex + 1) % AppState.musicPlaylist.length;
    loadSong(AppState.currentSongIndex);
    
    if (AppState.isPlaying) {
        const audio = document.getElementById('audioPlayer');
        if (audio) audio.play();
    }
}

function playPrevSong() {
    if (AppState.musicPlaylist.length === 0) return;
    
    AppState.currentSongIndex = AppState.currentSongIndex - 1;
    if (AppState.currentSongIndex < 0) {
        AppState.currentSongIndex = AppState.musicPlaylist.length - 1;
    }
    
    loadSong(AppState.currentSongIndex);
    
    if (AppState.isPlaying) {
        const audio = document.getElementById('audioPlayer');
        if (audio) audio.play();
    }
}

// Auto play next song when current ends
document.addEventListener('DOMContentLoaded', () => {
    const audio = document.getElementById('audioPlayer');
    if (audio) {
        audio.addEventListener('ended', playNextSong);
    }
});

// Music player controls
document.addEventListener('DOMContentLoaded', () => {
    const playPauseBtn = document.getElementById('playPauseBtn');
    const nextSongBtn = document.getElementById('nextSongBtn');
    const prevSongBtn = document.getElementById('prevSongBtn');
    const volumeSlider = document.getElementById('volumeSlider');
    const audio = document.getElementById('audioPlayer');
    
    if (playPauseBtn) playPauseBtn.addEventListener('click', togglePlayPause);
    if (nextSongBtn) nextSongBtn.addEventListener('click', playNextSong);
    if (prevSongBtn) prevSongBtn.addEventListener('click', playPrevSong);
    
    if (volumeSlider && audio) {
        volumeSlider.addEventListener('input', function() {
            audio.volume = this.value / 100;
        });
    }
});

/* ========================================
   SETTINGS & PREFERENCES
======================================== */

function loadSavedSettings() {
    const saved = localStorage.getItem('userSettings');
    if (saved) {
        try {
            AppState.settings = JSON.parse(saved);
        } catch (e) {
            console.error('Settings parse error:', e);
        }
    }
}

// Load settings on init
loadSavedSettings();

console.log('✅ All functions loaded successfully - Part 2');
