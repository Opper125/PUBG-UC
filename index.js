/* ========================================
   SUPABASE CONFIGURATION
======================================== */

const SUPABASE_URL = 'https://vqumonhyeekgltvercbw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxdW1vbmh5ZWVrZ2x0dmVyY2J3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1NTgzMzAsImV4cCI6MjA3NzEzNDMzMH0._C5EiMWyNs65ymDuwle_8UEytEqhn2bwniNvC9G9j1I';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
    return input.replace(/[<>\"\']/g, '').trim();
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
document.getElementById('signupPassword')?.addEventListener('input', function(e) {
    const password = e.target.value;
    
    // Requirement 1: At least 8 characters
    const req1 = document.getElementById('req1');
    if (password.length >= 8) {
        req1.classList.add('valid');
    } else {
        req1.classList.remove('valid');
    }
    
    // Requirement 2: Start with uppercase
    const req2 = document.getElementById('req2');
    if (/^[A-Z]/.test(password)) {
        req2.classList.add('valid');
    } else {
        req2.classList.remove('valid');
    }
    
    // Requirement 3: Special character
    const req3 = document.getElementById('req3');
    const hasSpecial = SPECIAL_CHARS.some(char => password.includes(char));
    if (hasSpecial) {
        req3.classList.add('valid');
    } else {
        req3.classList.remove('valid');
    }
});

// Login Form Handler
document.getElementById('loginFormElement')?.addEventListener('submit', async (e) => {
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
            .single();
        
        if (error || !users) {
            showToast('Login Failed', 'Invalid email or password', 'error');
            hideLoader();
            return;
        }
        
        // Check if account is blocked or deleted
        if (users.status === 'blocked') {
            showToast('Account Blocked', 'Your account has been blocked by admin', 'error');
            hideLoader();
            return;
        }
        
        if (users.status === 'deleted') {
            showToast('Account Deleted', 'This account has been deleted', 'error');
            hideLoader();
            return;
        }
        
        // Save session
        AppState.currentUser = users;
        AppState.sessionActive = true;
        localStorage.setItem('userSession', JSON.stringify(users));
        
        closeAuthModal();
        hideLoader();
        showToast('Welcome Back!', `Hello ${users.username}`, 'success');
        
        // Initialize user dashboard
        await initializeUserDashboard();
        
    } catch (error) {
        console.error('Login error:', error);
        showToast('Error', 'An error occurred during login', 'error');
        hideLoader();
    }
});

// Signup Form Handler
document.getElementById('signupFormElement')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = sanitizeInput(document.getElementById('signupUsername').value);
    const email = sanitizeInput(document.getElementById('signupEmail').value);
    const password = document.getElementById('signupPassword').value;
    
    // Validation checks
    if (!isEnglishOnly(username)) {
        showToast('Invalid Username', 'Username must contain only English characters', 'error');
        return;
    }
    
    if (containsProfanity(username)) {
        showToast('Invalid Username', 'Username contains inappropriate language', 'error');
        return;
    }
    
    if (!isValidGmail(email)) {
        showToast('Invalid Email', 'Please use a valid Gmail address (@gmail.com)', 'error');
        return;
    }
    
    if (containsProfanity(email)) {
        showToast('Invalid Email', 'Email contains inappropriate language', 'error');
        return;
    }
    
    const passwordCheck = isValidPassword(password);
    if (!passwordCheck.valid) {
        showToast('Invalid Password', passwordCheck.message, 'error');
        return;
    }
    
    // Check if email is same as password
    if (email.split('@')[0] === password) {
        showToast('Invalid Password', 'Password cannot be the same as email', 'error');
        return;
    }
    
    showLoader();
    
    try {
        // Check if username already exists
        const { data: existingUsername } = await supabase
            .from('users')
            .select('username')
            .eq('username', username)
            .single();
        
        // Check if email already exists
        const { data: existingEmail } = await supabase
            .from('users')
            .select('email')
            .eq('email', email)
            .single();
        
        if (existingUsername && existingEmail) {
            showToast('Account Exists', 'Username and email already registered', 'error');
            hideLoader();
            return;
        }
        
        if (existingUsername) {
            showToast('Username Taken', 'This username is already in use', 'error');
            hideLoader();
            return;
        }
        
        if (existingEmail) {
            showToast('Email Registered', 'This email is already registered', 'error');
            hideLoader();
            return;
        }
        
        // Generate AI avatar
        const avatarUrl = generateAIAvatar();
        
        // Create new user
        const { data: newUser, error } = await supabase
            .from('users')
            .insert([
                {
                    username: username,
                    email: email,
                    password: password,
                    avatar: avatarUrl,
                    status: 'active',
                    created_at: new Date().toISOString()
                }
            ])
            .select()
            .single();
        
        if (error) throw error;
        
        // Auto login after signup
        AppState.currentUser = newUser;
        AppState.sessionActive = true;
        localStorage.setItem('userSession', JSON.stringify(newUser));
        
        closeAuthModal();
        hideLoader();
        showToast('Account Created!', `Welcome ${newUser.username}!`, 'success');
        
        // Initialize user dashboard
        await initializeUserDashboard();
        
    } catch (error) {
        console.error('Signup error:', error);
        showToast('Error', 'An error occurred during signup', 'error');
        hideLoader();
    }
});

/* ========================================
   SESSION MANAGEMENT
======================================== */

function checkSession() {
    const savedSession = localStorage.getItem('userSession');
    
    if (savedSession) {
        try {
            const user = JSON.parse(savedSession);
            AppState.currentUser = user;
            AppState.sessionActive = true;
            return true;
        } catch (error) {
            console.error('Session error:', error);
            localStorage.removeItem('userSession');
            return false;
        }
    }
    
    return false;
}

async function validateSession() {
    if (!AppState.currentUser) return false;
    
    try {
        // Check if user still exists and is active
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', AppState.currentUser.id)
            .single();
        
        if (error || !user) {
            logout();
            return false;
        }
        
        if (user.status === 'blocked' || user.status === 'deleted') {
            showToast('Session Ended', 'Your account has been ' + user.status, 'warning');
            logout();
            return false;
        }
        
        // Update session
        AppState.currentUser = user;
        localStorage.setItem('userSession', JSON.stringify(user));
        
        return true;
    } catch (error) {
        console.error('Session validation error:', error);
        return false;
    }
}

function logout() {
    AppState.currentUser = null;
    AppState.sessionActive = false;
    localStorage.removeItem('userSession');
    
    showToast('Logged Out', 'You have been logged out', 'info');
    
    // Redirect to home and show auth modal
    switchPage('home');
    setTimeout(() => openAuthModal(), 500);
}

// Auto validate session every 30 seconds
setInterval(async () => {
    if (AppState.sessionActive) {
        await validateSession();
    }
}, 30000);

/* ========================================
   NAVIGATION SYSTEM
======================================== */

function switchPage(pageName) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Show selected page
    const targetPage = document.getElementById(pageName + 'Page');
    if (targetPage) {
        targetPage.classList.add('active');
    }
    
    // Update nav items
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
   BANNER SLIDER SYSTEM
======================================== */

let mainBannerInterval;
let secondaryBannerInterval;

async function loadMainBanners() {
    try {
        const { data: banners, error } = await supabase
            .from('banners')
            .select('*')
            .eq('type', 'main')
            .eq('status', 'active')
            .order('order', { ascending: true });
        
        if (error) throw error;
        
        if (!banners || banners.length === 0) return;
        
        const slidesContainer = document.querySelector('.banner-slides');
        const indicatorsContainer = document.querySelector('.banner-indicators');
        
        slidesContainer.innerHTML = '';
        indicatorsContainer.innerHTML = '';
        
        banners.forEach((banner, index) => {
            // Create slide
            const slide = document.createElement('div');
            slide.className = `banner-slide ${index === 0 ? 'active' : ''}`;
            slide.innerHTML = `<img src="${banner.image_url}" alt="${banner.title || 'Banner'}">`;
            slidesContainer.appendChild(slide);
            
            // Create indicator
            const indicator = document.createElement('div');
            indicator.className = `banner-indicator ${index === 0 ? 'active' : ''}`;
            indicator.addEventListener('click', () => goToSlide(index));
            indicatorsContainer.appendChild(indicator);
        });
        
        if (banners.length > 1) {
            startMainBannerSlider();
        }
        
    } catch (error) {
        console.error('Banner load error:', error);
    }
}

function startMainBannerSlider() {
    const slides = document.querySelectorAll('.banner-slide');
    const indicators = document.querySelectorAll('.banner-indicator');
    let currentSlide = 0;
    
    if (mainBannerInterval) clearInterval(mainBannerInterval);
    
    mainBannerInterval = setInterval(() => {
        slides[currentSlide].classList.remove('active');
        indicators[currentSlide].classList.remove('active');
        
        currentSlide = (currentSlide + 1) % slides.length;
        
        slides[currentSlide].classList.add('active');
        indicators[currentSlide].classList.add('active');
    }, 5000);
}

function goToSlide(index) {
    const slides = document.querySelectorAll('.banner-slide');
    const indicators = document.querySelectorAll('.banner-indicator');
    
    slides.forEach(slide => slide.classList.remove('active'));
    indicators.forEach(ind => ind.classList.remove('active'));
    
    slides[index].classList.add('active');
    indicators[index].classList.add('active');
}

async function loadSecondaryBanners() {
    try {
        const { data: banners, error } = await supabase
            .from('banners')
            .select('*')
            .eq('type', 'secondary')
            .eq('status', 'active')
            .order('order', { ascending: true });
        
        if (error) throw error;
        
        if (!banners || banners.length === 0) return;
        
        const container = document.getElementById('secondaryBanner');
        container.innerHTML = '<div class="secondary-banner-slider"></div>';
        
        const slider = container.querySelector('.secondary-banner-slider');
        
        banners.forEach((banner, index) => {
            const item = document.createElement('div');
            item.className = 'secondary-banner-item';
            item.innerHTML = `<img src="${banner.image_url}" alt="${banner.title || 'Banner'}">`;
            
            if (banner.link) {
                item.style.cursor = 'pointer';
                item.addEventListener('click', () => {
                    window.open(banner.link, '_blank');
                });
            }
            
            slider.appendChild(item);
        });
        
        if (banners.length > 1) {
            startSecondaryBannerSlider();
        }
        
    } catch (error) {
        console.error('Secondary banner error:', error);
    }
}

function startSecondaryBannerSlider() {
    const items = document.querySelectorAll('.secondary-banner-item');
    if (items.length < 3) return;
    
    let currentIndex = 0;
    
    function updateBannerPositions() {
        items.forEach((item, index) => {
            item.classList.remove('center', 'left', 'right');
            
            if (index === currentIndex) {
                item.classList.add('center');
            } else if (index === (currentIndex - 1 + items.length) % items.length) {
                item.classList.add('left');
            } else if (index === (currentIndex + 1) % items.length) {
                item.classList.add('right');
            }
        });
    }
    
    updateBannerPositions();
    
    if (secondaryBannerInterval) clearInterval(secondaryBannerInterval);
    
    secondaryBannerInterval = setInterval(() => {
        currentIndex = (currentIndex + 1) % items.length;
        updateBannerPositions();
    }, 10000);
}

/* ========================================
   INITIALIZATION
======================================== */

async function initApp() {
    showLoader();
    
    try {
        // Check session
        const hasSession = checkSession();
        
        if (hasSession) {
            await validateSession();
            await initializeUserDashboard();
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
            .single();
        
        if (error) throw error;
        
        AppState.websiteConfig = config;
        
        // Apply config
        if (config.logo_url) {
            document.getElementById('websiteLogo').src = config.logo_url;
        }
        
        if (config.background_image) {
            document.body.style.backgroundImage = `url(${config.background_image})`;
            document.body.style.backgroundSize = 'cover';
            document.body.style.backgroundPosition = 'center';
            document.body.style.backgroundAttachment = 'fixed';
        }
        
        if (config.background_video) {
            // Add video background
            const videoElement = document.createElement('video');
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
   CATEGORIES LOADING
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
        document.getElementById('categoryIcon').src = card.icon_url;
        document.getElementById('categoryName').textContent = card.name;
        
        // Load products page data
        await loadProductsPageBanner(card.id);
        await loadInputTables(card.id);
        await loadProducts(card.id);
        await loadProductGuidelines(card.id);
        await loadProductYoutubeVideos(card.id);
        await loadProductFeedback(card.id);
        
        // Switch to products page
        document.getElementById('categoryProductsPage').classList.add('active');
        document.getElementById('homePage').classList.remove('active');
        
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
            .order('created_at', { ascending: true });
        
        if (error) throw error;
        
        const container = document.getElementById('productsPageBanner');
        
        if (!banners || banners.length === 0) {
            container.innerHTML = '';
            return;
        }
        
        container.innerHTML = '<div class="products-banner-slider"></div>';
        const slider = container.querySelector('.products-banner-slider');
        
        banners.forEach((banner, index) => {
            const item = document.createElement('div');
            item.className = 'products-banner-item';
            item.innerHTML = `<img src="${banner.image_url}" alt="Banner">`;
            slider.appendChild(item);
        });
        
        if (banners.length >= 3) {
            startProductsBannerSlider();
        }
        
    } catch (error) {
        console.error('Products banner error:', error);
    }
}

function startProductsBannerSlider() {
    const items = document.querySelectorAll('.products-banner-item');
    if (items.length < 3) return;
    
    let currentIndex = 1;
    
    function updatePositions() {
        items.forEach((item, index) => {
            item.classList.remove('center', 'left', 'right');
            
            if (index === currentIndex) {
                item.classList.add('center');
            } else if (index === (currentIndex - 1 + items.length) % items.length) {
                item.classList.add('left');
            } else if (index === (currentIndex + 1) % items.length) {
                item.classList.add('right');
            }
        });
    }
    
    updatePositions();
    
    setInterval(() => {
        currentIndex = (currentIndex + 1) % items.length;
        updatePositions();
    }, 5000);
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
        
        if (!tables || tables.length === 0) {
            container.innerHTML = '';
            return;
        }
        
        const group = document.createElement('div');
        group.className = 'input-table-group';
        
        let fieldsHTML = '';
        tables.forEach(table => {
            fieldsHTML += `
                <div class="input-table-field">
                    <label class="input-table-label">${table.title}</label>
                    <input 
                        type="text" 
                        class="input-table-input" 
                        placeholder="${table.placeholder}"
                        data-table-id="${table.id}"
                        required
                    >
                </div>
            `;
        });
        
        group.innerHTML = `
            <h3 class="input-table-title">Account Information</h3>
            ${fieldsHTML}
        `;
        
        container.innerHTML = '';
        container.appendChild(group);
        
    } catch (error) {
        console.error('Input tables error:', error);
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
        container.innerHTML = '';
        
        if (products.length === 0) {
            container.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:2rem;">No products available</p>';
            return;
        }
        
        products.forEach(product => {
            renderProduct(container, product);
        });
        
    } catch (error) {
        console.error('Products load error:', error);
    }
}

function renderProduct(container, product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.dataset.productId = product.id;
    
    const finalPrice = calculateDiscount(product.price, product.discount_percent);
    const hasDiscount = product.discount_percent && product.discount_percent > 0;
    
    // Parse product type color (stored as JSON)
    let typeBadgeStyle = '';
    if (product.type_badge_color) {
        try {
            const colors = JSON.parse(product.type_badge_color);
            if (Array.isArray(colors) && colors.length > 0) {
                typeBadgeStyle = `background: linear-gradient(135deg, ${colors.join(', ')});`;
            }
        } catch (e) {
            typeBadgeStyle = 'background: var(--primary-gradient);';
        }
    }
    
    card.innerHTML = `
        <div class="product-image-wrapper">
            <img src="${product.icon_url}" alt="${product.name}" class="product-image">
            ${product.type_name ? `
                <div class="product-type-badge" style="${typeBadgeStyle}">
                    ${product.type_name}
                </div>
            ` : ''}
            ${hasDiscount ? `
                <div class="product-discount-badge">-${product.discount_percent}%</div>
            ` : ''}
        </div>
        <div class="product-info">
            <div class="product-name">${product.name}</div>
            ${product.amount ? `
                <div class="product-amount">Amount: ${product.amount}</div>
            ` : ''}
            <div class="product-pricing">
                <span class="product-price">${formatPrice(finalPrice)}</span>
                ${hasDiscount ? `
                    <span class="product-original-price">${formatPrice(product.price)}</span>
                ` : ''}
            </div>
        </div>
    `;
    
    card.addEventListener('click', () => {
        toggleProductSelection(card, product);
    });
    
    container.appendChild(card);
}

function toggleProductSelection(cardElement, product) {
    // Deselect all other products
    document.querySelectorAll('.product-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    // Select this product
    cardElement.classList.add('selected');
    AppState.selectedProduct = product;
    
    // Show product detail
    showProductDetail(product);
}

function showProductDetail(product) {
    const modal = document.getElementById('productDetailModal');
    const content = document.getElementById('productDetailContent');
    
    const finalPrice = calculateDiscount(product.price, product.discount_percent);
    const hasDiscount = product.discount_percent && product.discount_percent > 0;
    
    content.innerHTML = `
        <img src="${product.icon_url}" alt="${product.name}" class="product-detail-image">
        
        <h2 class="product-detail-title">${product.name}</h2>
        
        <div class="product-detail-meta">
            <div class="product-detail-row">
                <span class="product-detail-label">Type:</span>
                <span class="product-detail-value">${product.type_name || 'N/A'}</span>
            </div>
            ${product.amount ? `
                <div class="product-detail-row">
                    <span class="product-detail-label">Amount:</span>
                    <span class="product-detail-value">${product.amount}</span>
                </div>
            ` : ''}
            <div class="product-detail-row">
                <span class="product-detail-label">Price:</span>
                <span class="product-detail-value">${formatPrice(finalPrice)}</span>
            </div>
            ${hasDiscount ? `
                <div class="product-detail-row">
                    <span class="product-detail-label">Original Price:</span>
                    <span class="product-detail-value" style="text-decoration: line-through;">${formatPrice(product.price)}</span>
                </div>
                <div class="product-detail-row">
                    <span class="product-detail-label">Discount:</span>
                    <span class="product-detail-value" style="color: #4ade80;">${product.discount_percent}% OFF</span>
                </div>
            ` : ''}
        </div>
        
        ${product.description ? `
            <div class="product-detail-description">
                ${product.description}
            </div>
        ` : ''}
        
        <div class="coupon-section">
            <h3 class="coupon-title">Have a coupon code?</h3>
            <div class="coupon-input-group">
                <input type="text" class="coupon-input" id="couponInput" placeholder="Enter coupon code">
                <button class="coupon-apply-btn" onclick="applyCoupon()">Apply</button>
            </div>
            <div id="couponApplied" class="coupon-applied" style="display:none;">
                <span class="coupon-applied-text">Coupon applied!</span>
                <button class="coupon-remove-btn" onclick="removeCoupon()">Remove</button>
            </div>
        </div>
        
        <button class="buy-now-btn" onclick="proceedToCheckout()">
            <i class="fas fa-shopping-cart"></i>
            Buy Now
        </button>
    `;
    
    modal.classList.add('active');
    document.body.classList.add('no-scroll');
}

function closeProductDetail() {
    const modal = document.getElementById('productDetailModal');
    modal.classList.remove('active');
    document.body.classList.remove('no-scroll');
}

/* ========================================
   COUPON SYSTEM
======================================== */

let appliedCoupon = null;

async function applyCoupon() {
    const input = document.getElementById('couponInput');
    const code = input.value.trim().toUpperCase();
    
    if (!code) {
        showToast('Invalid Coupon', 'Please enter a coupon code', 'warning');
        return;
    }
    
    if (!AppState.selectedProduct) {
        showToast('Error', 'Please select a product first', 'error');
        return;
    }
    
    showLoader();
    
    try {
        // Check if coupon exists and is valid
        const { data: coupon, error } = await supabase
            .from('coupons')
            .select('*')
            .eq('code', code)
            .eq('status', 'active')
            .single();
        
        if (error || !coupon) {
            showToast('Invalid Coupon', 'This coupon code is not valid', 'error');
            hideLoader();
            return;
        }
        
        // Check if coupon is for specific product
        if (coupon.product_id && coupon.product_id !== AppState.selectedProduct.id) {
            showToast('Invalid Coupon', 'This coupon is not valid for this product', 'error');
            hideLoader();
            return;
        }
        
        // Check if user-specific
        if (coupon.user_id && coupon.user_id !== AppState.currentUser.id) {
            showToast('Invalid Coupon', 'This coupon is not available for you', 'error');
            hideLoader();
            return;
        }
        
        // Check if already used by this user
        const { data: usage } = await supabase
            .from('coupon_usage')
            .select('*')
            .eq('coupon_id', coupon.id)
            .eq('user_id', AppState.currentUser.id)
            .single();
        
        if (usage && coupon.single_use) {
            showToast('Coupon Used', 'You have already used this coupon', 'warning');
            hideLoader();
            return;
        }
        
        // Apply coupon
        appliedCoupon = coupon;
        
        document.getElementById('couponApplied').style.display = 'flex';
        input.disabled = true;
        
        showToast('Coupon Applied!', `${coupon.discount_percent}% discount applied`, 'success');
        hideLoader();
        
        // Update price display
        updatePriceWithCoupon();
        
    } catch (error) {
        console.error('Coupon error:', error);
        showToast('Error', 'Failed to apply coupon', 'error');
        hideLoader();
    }
}

function removeCoupon() {
    appliedCoupon = null;
    document.getElementById('couponApplied').style.display = 'none';
    document.getElementById('couponInput').disabled = false;
    document.getElementById('couponInput').value = '';
    
    updatePriceWithCoupon();
    showToast('Coupon Removed', 'Coupon has been removed', 'info');
}

function updatePriceWithCoupon() {
    if (!AppState.selectedProduct) return;
    
    let finalPrice = calculateDiscount(AppState.selectedProduct.price, AppState.selectedProduct.discount_percent);
    
    if (appliedCoupon) {
        finalPrice = calculateDiscount(finalPrice, appliedCoupon.discount_percent);
    }
    
    // Update price in modal
    const priceElements = document.querySelectorAll('.product-detail-value');
    if (priceElements.length > 0) {
        // Find price element and update it
        // This is simplified - in real implementation, target specific element
    }
}

/* ========================================
   CHECKOUT PROCESS
======================================== */

async function proceedToCheckout() {
    if (!AppState.selectedProduct) {
        showToast('Error', 'Please select a product', 'error');
        return;
    }
    
    // Validate input tables
    const inputs = document.querySelectorAll('.input-table-input');
    const tableData = {};
    let hasError = false;
    
    inputs.forEach(input => {
        if (!input.value.trim()) {
            hasError = true;
            input.style.borderColor = '#ef4444';
        } else {
            input.style.borderColor = '';
            tableData[input.dataset.tableId] = input.value.trim();
        }
    });
    
    if (hasError) {
        showToast('Missing Information', 'Please fill in all required fields', 'warning');
        return;
    }
    
    closeProductDetail();
    
    // Show payment modal
    await showPaymentModal(tableData);
}

async function showPaymentModal(tableData) {
    showLoader();
    
    try {
        // Get payment methods for this product
        const { data: productPayments } = await supabase
            .from('product_payment_methods')
            .select('payment_method_id')
            .eq('product_id', AppState.selectedProduct.id);
        
        if (!productPayments || productPayments.length === 0) {
            showToast('Error', 'No payment methods available', 'error');
            hideLoader();
            return;
        }
        
        const paymentIds = productPayments.map(p => p.payment_method_id);
        
        const { data: payments, error } = await supabase
            .from('payment_methods')
            .select('*')
            .in('id', paymentIds)
            .eq('status', 'active');
        
        if (error || !payments || payments.length === 0) {
            showToast('Error', 'No payment methods available', 'error');
            hideLoader();
            return;
        }
        
        const modal = document.getElementById('orderConfirmModal');
        const content = document.getElementById('orderConfirmContent');
        
        let finalPrice = calculateDiscount(AppState.selectedProduct.price, AppState.selectedProduct.discount_percent);
        
        if (appliedCoupon) {
            finalPrice = calculateDiscount(finalPrice, appliedCoupon.discount_percent);
        }
        
        let paymentsHTML = '';
        payments.forEach(payment => {
            paymentsHTML += `
                <div class="payment-method-item" data-payment-id="${payment.id}">
                    <img src="${payment.icon_url}" alt="${payment.name}">
                    <span>${payment.name}</span>
                </div>
            `;
        });
        
        content.innerHTML = `
            <div style="padding: 2rem;">
                <h2 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 1.5rem;">Complete Order</h2>
                
                <div style="background: var(--bg-secondary); padding: 1rem; border-radius: var(--radius-md); margin-bottom: 1.5rem;">
                    <h3 style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 0.5rem;">Product</h3>
                    <p style="font-size: 1.1rem; font-weight: 600;">${AppState.selectedProduct.name}</p>
                    <p style="font-size: 1.3rem; font-weight: 700; color: var(--accent-purple); margin-top: 0.5rem;">
                        ${formatPrice(finalPrice)}
                    </p>
                </div>
                
                <div style="margin-bottom: 1.5rem;">
                    <h3 style="font-size: 1rem; font-weight: 600; margin-bottom: 1rem;">Select Payment Method</h3>
                    <div id="paymentMethodsList" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.75rem;">
                        ${paymentsHTML}
                    </div>
                </div>
                
                <div id="paymentDetails" style="display: none; background: var(--bg-secondary); padding: 1rem; border-radius: var(--radius-md); margin-bottom: 1.5rem;">
                    <!-- Payment details will be inserted here -->
                </div>
                
                <div id="proofUpload" style="display: none; margin-bottom: 1.5rem;">
                    <h3 style="font-size: 0.9rem; font-weight: 600; margin-bottom: 0.5rem;">Upload Payment Proof</h3>
                    <input type="file" id="paymentProofInput" accept="image/*" style="width: 100%; padding: 0.75rem; background: var(--bg-secondary); border: 1px solid rgba(255,255,255,0.05); border-radius: var(--radius-md); color: var(--text-primary);">
                </div>
                
                <button id="submitOrderBtn" class="buy-now-btn" style="display: none;" onclick="submitOrder('${JSON.stringify(tableData).replace(/'/g, "\\'")}')">
                    Submit Order
                </button>
                
                <button class="buy-now-btn" style="background: var(--bg-hover); margin-top: 0.5rem;" onclick="closeOrderModal()">
                    Cancel
                </button>
            </div>
        `;
        
        modal.classList.add('active');
        
        // Add payment method listeners
        document.querySelectorAll('.payment-method-item').forEach(item => {
            item.addEventListener('click', async function() {
                document.querySelectorAll('.payment-method-item').forEach(i => {
                    i.style.border = '2px solid transparent';
                });
                this.style.border = '2px solid var(--accent-purple)';
                
                const paymentId = this.dataset.paymentId;
                await showPaymentDetails(paymentId);
            });
        });
        
        hideLoader();
        
    } catch (error) {
        console.error('Payment modal error:', error);
        hideLoader();
        showToast('Error', 'Failed to load payment methods', 'error');
    }
}

async function showPaymentDetails(paymentId) {
    try {
        const { data: payment, error } = await supabase
            .from('payment_methods')
            .select('*')
            .eq('id', paymentId)
            .single();
        
        if (error) throw error;
        
        const detailsDiv = document.getElementById('paymentDetails');
        detailsDiv.innerHTML = `
            <h3 style="font-size: 0.9rem; font-weight: 600; margin-bottom: 0.75rem;">Payment Instructions</h3>
            <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.75rem;">${payment.instructions || 'Transfer to the account below'}</p>
            <div style="background: var(--bg-card); padding: 0.75rem; border-radius: var(--radius-sm); margin-bottom: 0.5rem;">
                <strong>Account Name:</strong> ${payment.account_name}
            </div>
            <div style="background: var(--bg-card); padding: 0.75rem; border-radius: var(--radius-sm);">
                <strong>Account Number:</strong> ${payment.account_number}
            </div>
        `;
        detailsDiv.style.display = 'block';
        
        document.getElementById('proofUpload').style.display = 'block';
        document.getElementById('submitOrderBtn').style.display = 'block';
        document.getElementById('submitOrderBtn').dataset.paymentId = paymentId;
        
    } catch (error) {
        console.error('Payment details error:', error);
    }
}

function closeOrderModal() {
    const modal = document.getElementById('orderConfirmModal');
    modal.classList.remove('active');
    document.body.classList.remove('no-scroll');
}

/* ========================================
   ORDER SUBMISSION
======================================== */

async function submitOrder(tableDataStr) {
    const tableData = JSON.parse(tableDataStr);
    
    // Validate payment proof
    const proofInput = document.getElementById('paymentProofInput');
    if (!proofInput.files || proofInput.files.length === 0) {
        showToast('Missing Proof', 'Please upload payment proof screenshot', 'warning');
        return;
    }
    
    const submitBtn = document.getElementById('submitOrderBtn');
    const paymentId = submitBtn.dataset.paymentId;
    
    if (!paymentId) {
        showToast('Error', 'Please select a payment method', 'error');
        return;
    }
    
    showLoader();
    preventRefresh = true;
    
    try {
        // Upload payment proof
        const proofFile = proofInput.files[0];
        const proofUrl = await uploadImage(proofFile);
        
        // Calculate final price
        let finalPrice = calculateDiscount(AppState.selectedProduct.price, AppState.selectedProduct.discount_percent);
        let couponDiscount = 0;
        
        if (appliedCoupon) {
            const discountedPrice = calculateDiscount(finalPrice, appliedCoupon.discount_percent);
            couponDiscount = finalPrice - discountedPrice;
            finalPrice = discountedPrice;
        }
        
        // Generate order ID
        const orderId = generateOrderId();
        
        // Create order
        const { data: order, error } = await supabase
            .from('orders')
            .insert([{
                order_id: orderId,
                user_id: AppState.currentUser.id,
                product_id: AppState.selectedProduct.id,
                category_card_id: AppState.currentCategoryCard.id,
                payment_method_id: paymentId,
                input_data: JSON.stringify(tableData),
                payment_proof_url: proofUrl,
                price: AppState.selectedProduct.price,
                discount_percent: AppState.selectedProduct.discount_percent || 0,
                coupon_id: appliedCoupon ? appliedCoupon.id : null,
                coupon_discount: couponDiscount,
                final_price: finalPrice,
                status: 'pending',
                created_at: new Date().toISOString()
            }])
            .select()
            .single();
        
        if (error) throw error;
        
        // Record coupon usage if applied
        if (appliedCoupon) {
            await supabase
                .from('coupon_usage')
                .insert([{
                    coupon_id: appliedCoupon.id,
                    user_id: AppState.currentUser.id,
                    order_id: order.id,
                    used_at: new Date().toISOString()
                }]);
        }
        
        preventRefresh = false;
        hideLoader();
        closeOrderModal();
        
        showToast('Order Submitted!', 'Your order has been submitted successfully', 'success');
        
        // Reset state
        AppState.selectedProduct = null;
        appliedCoupon = null;
        
        // Switch to order history
        setTimeout(() => {
            switchPage('orderHistory');
        }, 1500);
        
    } catch (error) {
        console.error('Order submission error:', error);
        preventRefresh = false;
        hideLoader();
        showToast('Error', 'Failed to submit order. Please try again.', 'error');
    }
}

/* ========================================
   ORDER HISTORY
======================================== */

async function loadOrderHistory() {
    try {
        const { data: orders, error } = await supabase
            .from('orders')
            .select(`
                *,
                products (name, icon_url),
                payment_methods (name, icon_url)
            `)
            .eq('user_id', AppState.currentUser.id)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        AppState.orders = orders || [];
        
        const container = document.getElementById('orderHistoryList');
        container.innerHTML = '';
        
        if (orders.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 3rem; color: var(--text-muted);">
                    <i class="fas fa-shopping-bag" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.3;"></i>
                    <p>No orders yet</p>
                </div>
            `;
            return;
        }
        
        orders.forEach(order => {
            renderOrderCard(container, order);
        });
        
    } catch (error) {
        console.error('Order history error:', error);
        showToast('Error', 'Failed to load order history', 'error');
    }
}

function renderOrderCard(container, order) {
    const card = document.createElement('div');
    card.className = 'order-card';
    
    const createdDate = new Date(order.created_at).toLocaleString();
    const approvedDate = order.approved_at ? new Date(order.approved_at).toLocaleString() : null;
    
    let statusClass = 'pending';
    let statusText = 'Pending';
    if (order.status === 'approved') {
        statusClass = 'approved';
        statusText = 'Approved';
    } else if (order.status === 'rejected') {
        statusClass = 'rejected';
        statusText = 'Rejected';
    }
    
    card.innerHTML = `
        <div class="order-header">
            <span class="order-id">Order #${order.order_id}</span>
            <span class="order-status ${statusClass}">${statusText}</span>
        </div>
        
        <div class="order-content">
            <img src="${order.products.icon_url}" alt="${order.products.name}" class="order-product-icon">
            <div class="order-details">
                <div class="order-product-name">${order.products.name}</div>
                <div class="order-meta">
                    <div><i class="fas fa-calendar"></i> ${createdDate}</div>
                    <div><i class="fas fa-credit-card"></i> ${order.payment_methods.name}</div>
                    ${order.coupon_discount > 0 ? `
                        <div style="color: #4ade80;">
                            <i class="fas fa-tag"></i> Coupon: -${formatPrice(order.coupon_discount)}
                        </div>
                    ` : ''}
                </div>
            </div>
        </div>
        
        <div class="order-footer">
            <span class="order-price">${formatPrice(order.final_price)}</span>
            <span class="order-date">${createdDate}</span>
        </div>
        
        ${order.status === 'approved' ? `
            <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid rgba(255,255,255,0.05);">
                <div style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.5rem;">
                    <i class="fas fa-check-circle" style="color: #4ade80;"></i> 
                    Approved on ${approvedDate}
                </div>
                ${order.admin_message ? `
                    <div style="background: var(--bg-secondary); padding: 0.75rem; border-radius: var(--radius-sm); font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.75rem;">
                        <strong>Message:</strong> ${order.admin_message}
                    </div>
                ` : ''}
                <div class="order-actions">
                    <button class="order-action-btn primary" onclick="downloadOrderPDF('${order.id}')">
                        <i class="fas fa-download"></i> Download
                    </button>
                    <button class="order-action-btn" onclick="viewOrderDetails('${order.id}')">
                        <i class="fas fa-eye"></i> View Details
                    </button>
                </div>
                
                ${!order.feedback_given ? `
                    <div id="feedback-${order.id}" style="margin-top: 1rem;">
                        <div style="font-size: 0.9rem; font-weight: 600; margin-bottom: 0.5rem;">Rate this order:</div>
                        <div class="order-rating" id="rating-${order.id}">
                            ${[1,2,3,4,5].map(i => `
                                <i class="fas fa-star star" data-rating="${i}" onclick="setRating('${order.id}', ${i})"></i>
                            `).join('')}
                        </div>
                        <textarea 
                            id="feedback-message-${order.id}" 
                            placeholder="Share your experience..." 
                            style="width: 100%; margin-top: 0.75rem; padding: 0.75rem; background: var(--bg-secondary); border: 1px solid rgba(255,255,255,0.05); border-radius: var(--radius-md); color: var(--text-primary); font-family: inherit; min-height: 80px; resize: vertical;"
                        ></textarea>
                        <button class="order-action-btn primary" style="margin-top: 0.5rem;" onclick="submitFeedback('${order.id}')">
                            Submit Feedback
                        </button>
                    </div>
                ` : `
                    <div style="margin-top: 1rem; padding: 0.75rem; background: rgba(74, 222, 128, 0.1); border-radius: var(--radius-sm); font-size: 0.85rem; color: #4ade80;">
                        <i class="fas fa-check"></i> Feedback submitted
                        <div class="order-rating" style="margin-top: 0.5rem;">
                            ${[1,2,3,4,5].map(i => `
                                <i class="fas fa-star star ${i <= order.user_rating ? 'active' : ''}" style="cursor: default; font-size: 0.85rem;"></i>
                            `).join('')}
                        </div>
                    </div>
                `}
            </div>
        ` : ''}
        
        ${order.status === 'rejected' && order.admin_message ? `
            <div style="margin-top: 1rem; padding: 0.75rem; background: rgba(239, 68, 68, 0.1); border: 1px solid #ef4444; border-radius: var(--radius-sm);">
                <div style="font-size: 0.85rem; color: #ef4444; margin-bottom: 0.5rem;">
                    <i class="fas fa-times-circle"></i> Rejection Reason:
                </div>
                <div style="font-size: 0.85rem; color: var(--text-secondary);">
                    ${order.admin_message}
                </div>
            </div>
        ` : ''}
    `;
    
    container.appendChild(card);
}

let selectedRating = 0;

function setRating(orderId, rating) {
    selectedRating = rating;
    const stars = document.querySelectorAll(`#rating-${orderId} .star`);
    
    stars.forEach((star, index) => {
        if (index < rating) {
            star.classList.add('active');
        } else {
            star.classList.remove('active');
        }
    });
}

async function submitFeedback(orderId) {
    if (selectedRating === 0) {
        showToast('Rating Required', 'Please select a rating', 'warning');
        return;
    }
    
    const message = document.getElementById(`feedback-message-${orderId}`).value.trim();
    
    if (!message) {
        showToast('Message Required', 'Please write a feedback message', 'warning');
        return;
    }
    
    showLoader();
    
    try {
        // Get order details
        const order = AppState.orders.find(o => o.id === orderId);
        
        // Submit feedback
        const { error: feedbackError } = await supabase
            .from('feedback')
            .insert([{
                user_id: AppState.currentUser.id,
                order_id: orderId,
                product_id: order.product_id,
                category_card_id: order.category_card_id,
                rating: selectedRating,
                message: message,
                created_at: new Date().toISOString()
            }]);
        
        if (feedbackError) throw feedbackError;
        
        // Update order
        const { error: orderError } = await supabase
            .from('orders')
            .update({
                feedback_given: true,
                user_rating: selectedRating
            })
            .eq('id', orderId);
        
        if (orderError) throw orderError;
        
        hideLoader();
        showToast('Feedback Submitted!', 'Thank you for your feedback', 'success');
        
        // Reload order history
        await loadOrderHistory();
        
        selectedRating = 0;
        
    } catch (error) {
        console.error('Feedback error:', error);
        hideLoader();
        showToast('Error', 'Failed to submit feedback', 'error');
    }
}

async function downloadOrderPDF(orderId) {
    showLoader();
    
    try {
        const order = AppState.orders.find(o => o.id === orderId);
        
        if (!order) {
            throw new Error('Order not found');
        }
        
        // Generate PDF (simplified version - in production use jsPDF or similar)
        const pdfContent = await generateOrderPDF(order);
        
        // Create download link
        const blob = new Blob([pdfContent], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Order_${order.order_id}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        hideLoader();
        showToast('Downloaded', 'Order receipt downloaded successfully', 'success');
        
    } catch (error) {
        console.error('PDF download error:', error);
        hideLoader();
        showToast('Error', 'Failed to download PDF', 'error');
    }
}

async function generateOrderPDF(order) {
    // This is a simplified version
    // In production, use jsPDF library for proper PDF generation
    
    const config = AppState.websiteConfig;
    const createdDate = new Date(order.created_at).toLocaleString();
    const approvedDate = order.approved_at ? new Date(order.approved_at).toLocaleString() : 'N/A';
    
    const content = `
        ORDER RECEIPT
        
        ${config?.name || 'Premium Store'}
        
        ========================================
        
        Order ID: ${order.order_id}
        Status: ${order.status.toUpperCase()}
        
        Created: ${createdDate}
        Approved: ${approvedDate}
        
        ========================================
        
        PRODUCT DETAILS
        
        Product: ${order.products.name}
        Price: ${formatPrice(order.price)}
        Discount: ${order.discount_percent}%
        ${order.coupon_discount > 0 ? `Coupon Discount: ${formatPrice(order.coupon_discount)}` : ''}
        
        Final Price: ${formatPrice(order.final_price)}
        
        ========================================
        
        PAYMENT METHOD
        
        ${order.payment_methods.name}
        
        ========================================
        
        Thank you for your purchase!
    `;
    
    return content;
}

function viewOrderDetails(orderId) {
    const order = AppState.orders.find(o => o.id === orderId);
    if (!order) return;
    
    showToast('Order Details', `Order #${order.order_id}`, 'info');
}

/* ========================================
   PRODUCT GUIDELINES
======================================== */

async function loadProductGuidelines(cardId) {
    try {
        const { data: guidelines, error } = await supabase
            .from('product_guidelines')
            .select('*')
            .eq('category_card_id', cardId)
            .eq('status', 'active')
            .order('created_at', { ascending: true });
        
        if (error) throw error;
        
        const container = document.getElementById('productGuidelines');
        
        if (!guidelines || guidelines.length === 0) {
            container.innerHTML = '';
            return;
        }
        
        container.innerHTML = '';
        
        guidelines.forEach(guideline => {
            const card = document.createElement('div');
            card.className = 'guideline-card';
            
            // Process content to convert image links to actual images
            let processedContent = guideline.content;
            
            // Replace image URLs with img tags
            const urlRegex = /(https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp))/gi;
            processedContent = processedContent.replace(urlRegex, (url) => {
                return `<img src="${url}" class="emoji-image" alt="Image">`;
            });
            
            // Process text colors (assuming format: [color:#ff0000]text[/color])
            const colorRegex = /\[color:(#[0-9a-fA-F]{6})\](.*?)\[\/color\]/gi;
            processedContent = processedContent.replace(colorRegex, (match, color, text) => {
                return `<span style="color: ${color};">${text}</span>`;
            });
            
            card.innerHTML = `
                <div class="guideline-header">
                    ${guideline.icon_url ? `
                        <img src="${guideline.icon_url}" alt="${guideline.title}" class="guideline-icon">
                    ` : ''}
                    <div>
                        <h3 class="guideline-title">${guideline.title}</h3>
                    </div>
                </div>
                <div class="guideline-content">${processedContent}</div>
                ${guideline.social_links ? `
                    <div class="guideline-socials">
                        ${JSON.parse(guideline.social_links).map(social => `
                            <a href="${social.url}" target="_blank" class="guideline-social-btn">
                                <img src="${social.icon}" alt="${social.name}">
                            </a>
                        `).join('')}
                    </div>
                ` : ''}
            `;
            
            container.appendChild(card);
        });
        
    } catch (error) {
        console.error('Guidelines error:', error);
    }
}

/* ========================================
   YOUTUBE VIDEOS
======================================== */

async function loadProductYoutubeVideos(cardId) {
    try {
        const { data: videos, error } = await supabase
            .from('youtube_videos')
            .select('*')
            .eq('category_card_id', cardId)
            .eq('status', 'active')
            .order('created_at', { ascending: true });
        
        if (error) throw error;
        
        const container = document.getElementById('productYoutubeVideos');
        
        if (!videos || videos.length === 0) {
            container.innerHTML = '';
            return;
        }
        
        container.innerHTML = '<h2 class="youtube-section-title">Video Tutorials</h2>';
        
        videos.forEach(video => {
            const card = document.createElement('div');
            card.className = 'youtube-video-card';
            
            // Extract video ID from YouTube URL
            let videoId = '';
            let embedUrl = '';
            
            if (video.url.includes('youtube.com/shorts/')) {
                videoId = video.url.split('shorts/')[1].split('?')[0];
                embedUrl = `https://www.youtube.com/embed/${videoId}`;
            } else if (video.url.includes('youtube.com/watch')) {
                videoId = video.url.split('v=')[1].split('&')[0];
                embedUrl = `https://www.youtube.com/embed/${videoId}`;
            } else if (video.url.includes('youtu.be/')) {
                videoId = video.url.split('youtu.be/')[1].split('?')[0];
                embedUrl = `https://www.youtube.com/embed/${videoId}`;
            }
            
            card.innerHTML = `
                <div class="youtube-video-wrapper">
                    <iframe 
                        src="${embedUrl}" 
                        frameborder="0" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                        allowfullscreen
                    ></iframe>
                </div>
                ${video.description ? `
                    <div class="youtube-video-description">${video.description}</div>
                ` : ''}
            `;
            
            container.appendChild(card);
        });
        
    } catch (error) {
        console.error('YouTube videos error:', error);
    }
}

/* ========================================
   PRODUCT FEEDBACK DISPLAY
======================================== */

async function loadProductFeedback(cardId) {
    try {
        const { data: feedbacks, error } = await supabase
            .from('feedback')
            .select(`
                *,
                users (username, avatar)
            `)
            .eq('category_card_id', cardId)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        const container = document.getElementById('productFeedback');
        
        if (!feedbacks || feedbacks.length === 0) {
            container.innerHTML = '';
            return;
        }
        
        // Calculate statistics
        const totalFeedbacks = feedbacks.length;
        const ratingSum = feedbacks.reduce((sum, f) => sum + f.rating, 0);
        const avgRating = (ratingSum / totalFeedbacks).toFixed(1);
        
        const ratingCounts = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0};
        feedbacks.forEach(f => ratingCounts[f.rating]++);
        
        container.innerHTML = `
            <div class="feedback-header">
                <h2 class="feedback-title">Customer Reviews</h2>
                <p class="feedback-description">See what our customers are saying</p>
            </div>
            
            <div class="feedback-stats">
                <div class="overall-rating">
                    <div class="rating-number">${avgRating}</div>
                    <div class="rating-stars">
                        ${[1,2,3,4,5].map(i => `
                            <i class="fas fa-star ${i <= Math.round(avgRating) ? 'active' : ''}"></i>
                        `).join('')}
                    </div>
                    <div class="rating-count">${totalFeedbacks} reviews</div>
                </div>
                
                <div class="rating-breakdown">
                    ${[5,4,3,2,1].map(rating => {
                        const count = ratingCounts[rating];
                        const percentage = ((count / totalFeedbacks) * 100).toFixed(0);
                        return `
                            <div class="rating-row">
                                <div class="rating-label">
                                    ${rating} <i class="fas fa-star" style="font-size: 0.7rem; color: var(--accent-gold);"></i>
                                </div>
                                <div class="rating-bar">
                                    <div class="rating-bar-fill" style="width: ${percentage}%;"></div>
                                </div>
                                <div class="rating-percentage">${percentage}%</div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
            
            <div class="feedback-list"></div>
        `;
        
        const feedbackList = container.querySelector('.feedback-list');
        
        feedbacks.forEach(feedback => {
            const card = document.createElement('div');
            card.className = 'feedback-card';
            
            const feedbackDate = new Date(feedback.created_at).toLocaleDateString();
            
            // Check if current user has liked this feedback
            const isLiked = false; // TODO: Check from database
            
            card.innerHTML = `
                <div class="feedback-user">
                    <img src="${feedback.users.avatar}" alt="${feedback.users.username}" class="feedback-user-avatar">
                    <div class="feedback-user-info">
                        <div class="feedback-user-name">${feedback.users.username}</div>
                        <div class="feedback-user-date">${feedbackDate}</div>
                    </div>
                    <div class="feedback-rating">
                        ${[1,2,3,4,5].map(i => `
                            <i class="fas fa-star ${i <= feedback.rating ? 'active' : ''}" style="color: ${i <= feedback.rating ? 'var(--accent-gold)' : 'var(--text-muted)'};"></i>
                        `).join('')}
                    </div>
                </div>
                <div class="feedback-message">${feedback.message}</div>
                <div class="feedback-actions">
                    <button class="feedback-like-btn ${isLiked ? 'liked' : ''}" onclick="likeFeedback('${feedback.id}')">
                        <i class="fas fa-thumbs-up"></i>
                        <span>${feedback.likes || 0}</span>
                    </button>
                </div>
            `;
            
            feedbackList.appendChild(card);
        });
        
    } catch (error) {
        console.error('Feedback load error:', error);
    }
}

async function likeFeedback(feedbackId) {
    if (!AppState.sessionActive) {
        openAuthModal();
        return;
    }
    
    try {
        // Check if already liked
        const { data: existing } = await supabase
            .from('feedback_likes')
            .select('*')
            .eq('feedback_id', feedbackId)
            .eq('user_id', AppState.currentUser.id)
            .single();
        
        if (existing) {
            // Unlike
            await supabase
                .from('feedback_likes')
                .delete()
                .eq('id', existing.id);
            
            // Decrement likes count
            await supabase.rpc('decrement_feedback_likes', { feedback_id: feedbackId });
            
            showToast('Unliked', 'Removed like from feedback', 'info');
        } else {
            // Like
            await supabase
                .from('feedback_likes')
                .insert([{
                    feedback_id: feedbackId,
                    user_id: AppState.currentUser.id,
                    created_at: new Date().toISOString()
                }]);
            
            // Increment likes count
            await supabase.rpc('increment_feedback_likes', { feedback_id: feedbackId });
            
            showToast('Liked', 'Thank you for your feedback', 'success');
        }
        
        // Reload feedback
        if (AppState.currentCategoryCard) {
            await loadProductFeedback(AppState.currentCategoryCard.id);
        }
        
    } catch (error) {
        console.error('Like feedback error:', error);
        showToast('Error', 'Failed to like feedback', 'error');
    }
}

/* ========================================
   HOME PAGE DATA
======================================== */

async function loadHomePageData() {
    await loadWebsiteConfig();
    await loadMainBanners();
    await loadSecondaryBanners();
    await loadCategories();
}

/* ========================================
   NEWS PAGE
======================================== */

async function loadNews() {
    try {
        const { data: news, error } = await supabase
            .from('news')
            .select('*')
            .eq('status', 'active')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        const container = document.getElementById('newsList');
        container.innerHTML = '';
        
        if (!news || news.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 3rem; color: var(--text-muted);">
                    <i class="fas fa-newspaper" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.3;"></i>
                    <p>No news available</p>
                </div>
            `;
            return;
        }
        
        news.forEach(item => {
            renderNewsCard(container, item);
        });
        
    } catch (error) {
        console.error('News load error:', error);
        showToast('Error', 'Failed to load news', 'error');
    }
}

function renderNewsCard(container, news) {
    const card = document.createElement('div');
    card.className = 'news-card';
    
    const publishDate = new Date(news.created_at).toLocaleDateString();
    
    // Process mentions
    let processedTitle = news.title;
    let processedContent = news.content;
    let mentions = [];
    
    if (news.mentions) {
        try {
            mentions = JSON.parse(news.mentions);
            mentions.forEach(mention => {
                const mentionTag = `@${mention.username}`;
                processedTitle = processedTitle.replace(mentionTag, `<span class="news-mention">${mentionTag}</span>`);
                processedContent = processedContent.replace(mentionTag, `<span class="news-mention">${mentionTag}</span>`);
            });
        } catch (e) {
            console.error('Mentions parse error:', e);
        }
    }
    
    // Process product mentions
    if (news.product_mentions) {
        try {
            const products = JSON.parse(news.product_mentions);
            products.forEach(product => {
                const productTag = `#${product.name}`;
                processedContent = processedContent.replace(productTag, 
                    `<span class="news-mention" style="cursor: pointer;" onclick="openProductFromNews('${product.id}')">${productTag}</span>`
                );
            });
        } catch (e) {
            console.error('Product mentions parse error:', e);
        }
    }
    
    card.innerHTML = `
        ${news.images && news.images.length > 0 ? `
            <img src="${news.images[0]}" alt="${news.title}" class="news-image">
        ` : ''}
        
        <div class="news-content">
            <h3 class="news-title">${processedTitle}</h3>
            
            ${mentions.length > 0 ? `
                <div class="news-mentions">
                    ${mentions.map(m => `<span class="news-mention">@${m.username}</span>`).join('')}
                </div>
            ` : ''}
            
            <div class="news-description">${processedContent}</div>
            
            ${news.video_url ? `
                <div class="news-media">
                    ${renderNewsMedia(news.video_url)}
                </div>
            ` : ''}
            
            ${news.images && news.images.length > 1 ? `
                <div class="news-media" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem; margin-top: 1rem;">
                    ${news.images.slice(1).map(img => `
                        <img src="${img}" alt="News image" style="width: 100%; border-radius: var(--radius-md); cursor: pointer;" onclick="viewImage('${img}')">
                    `).join('')}
                </div>
            ` : ''}
            
            <div class="news-footer">
                <span class="news-date">
                    <i class="fas fa-calendar"></i> ${publishDate}
                </span>
                ${news.contacts ? `
                    <div class="news-contacts">
                        ${JSON.parse(news.contacts).map(contact => `
                            <a href="${contact.link}" target="_blank" class="news-contact-btn">
                                <img src="${contact.icon}" alt="${contact.name}">
                            </a>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        </div>
    `;
    
    container.appendChild(card);
}

function renderNewsMedia(url) {
    // Detect if YouTube video
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
        let videoId = '';
        
        if (url.includes('youtube.com/shorts/')) {
            videoId = url.split('shorts/')[1].split('?')[0];
        } else if (url.includes('youtube.com/watch')) {
            videoId = url.split('v=')[1].split('&')[0];
        } else if (url.includes('youtu.be/')) {
            videoId = url.split('youtu.be/')[1].split('?')[0];
        }
        
        return `
            <iframe 
                class="news-video"
                src="https://www.youtube.com/embed/${videoId}" 
                frameborder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowfullscreen
                style="width: 100%; height: 250px; border-radius: var(--radius-md);"
            ></iframe>
        `;
    }
    
    // Otherwise treat as direct video URL
    return `
        <video 
            class="news-video" 
            controls 
            style="width: 100%; border-radius: var(--radius-md);"
        >
            <source src="${url}" type="video/mp4">
            Your browser does not support the video tag.
        </video>
    `;
}

async function openProductFromNews(productId) {
    try {
        showLoader();
        
        const { data: product, error } = await supabase
            .from('products')
            .select('*, category_cards(*, categories(*))')
            .eq('id', productId)
            .single();
        
        if (error) throw error;
        
        if (product) {
            await openCategoryProducts(
                product.category_cards.categories,
                product.category_cards
            );
            
            // Auto-select the product
            setTimeout(() => {
                const productCard = document.querySelector(`[data-product-id="${productId}"]`);
                if (productCard) {
                    productCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    productCard.click();
                }
            }, 500);
        }
        
        hideLoader();
        
    } catch (error) {
        console.error('Product open error:', error);
        hideLoader();
        showToast('Error', 'Failed to open product', 'error');
    }
}

function viewImage(url) {
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
        padding: 1rem;
    `;
    
    modal.innerHTML = `
        <img src="${url}" style="max-width: 100%; max-height: 100%; border-radius: var(--radius-lg);">
        <button onclick="this.parentElement.remove()" style="position: absolute; top: 1rem; right: 1rem; width: 40px; height: 40px; background: rgba(255,255,255,0.2); border: none; border-radius: 50%; color: white; cursor: pointer; backdrop-filter: blur(10px);">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    modal.addEventListener('click', function(e) {
        if (e.target === this) {
            this.remove();
        }
    });
    
    document.body.appendChild(modal);
}

/* ========================================
   CONTACTS PAGE
======================================== */

async function loadContacts() {
    try {
        const { data: contacts, error } = await supabase
            .from('contacts')
            .select('*')
            .eq('status', 'active')
            .order('created_at', { ascending: true });
        
        if (error) throw error;
        
        const container = document.getElementById('contactsList');
        container.innerHTML = '';
        
        if (!contacts || contacts.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 3rem; color: var(--text-muted); grid-column: 1 / -1;">
                    <i class="fas fa-address-book" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.3;"></i>
                    <p>No contacts available</p>
                </div>
            `;
            return;
        }
        
        contacts.forEach(contact => {
            renderContactCard(container, contact);
        });
        
    } catch (error) {
        console.error('Contacts load error:', error);
        showToast('Error', 'Failed to load contacts', 'error');
    }
}

function renderContactCard(container, contact) {
    const card = document.createElement('div');
    card.className = 'contact-card';
    
    card.innerHTML = `
        <div class="contact-icon-wrapper">
            <img src="${contact.icon_url}" alt="${contact.name}">
        </div>
        <div class="contact-name">${contact.name}</div>
        ${contact.description ? `
            <div class="contact-description">${contact.description}</div>
        ` : ''}
    `;
    
    card.addEventListener('click', () => {
        if (contact.link) {
            window.open(contact.link, '_blank');
        }
    });
    
    container.appendChild(card);
}

/* ========================================
   PROFILE PAGE
======================================== */

async function loadProfile() {
    if (!AppState.currentUser) {
        openAuthModal();
        return;
    }
    
    const container = document.getElementById('profileContent');
    
    // Get user statistics
    const { data: orders } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', AppState.currentUser.id);
    
    const totalOrders = orders ? orders.length : 0;
    const approvedOrders = orders ? orders.filter(o => o.status === 'approved').length : 0;
    const totalSpent = orders ? orders.reduce((sum, o) => o.status === 'approved' ? sum + o.final_price : sum, 0) : 0;
    
    const joinDate = new Date(AppState.currentUser.created_at).toLocaleDateString();
    
    container.innerHTML = `
        <div class="profile-header">
            <div class="profile-avatar-wrapper">
                <img src="${AppState.currentUser.avatar}" alt="${AppState.currentUser.username}" class="profile-avatar">
            </div>
            <h2 class="profile-username">${AppState.currentUser.username}</h2>
            <p class="profile-email">${AppState.currentUser.email}</p>
        </div>
        
        <div class="profile-info-cards">
            <div class="profile-info-card">
                <div class="profile-info-label">Total Orders</div>
                <div class="profile-info-value">${totalOrders}</div>
            </div>
            <div class="profile-info-card">
                <div class="profile-info-label">Completed</div>
                <div class="profile-info-value">${approvedOrders}</div>
            </div>
            <div class="profile-info-card">
                <div class="profile-info-label">Total Spent</div>
                <div class="profile-info-value">${formatPrice(totalSpent)}</div>
            </div>
            <div class="profile-info-card">
                <div class="profile-info-label">Member Since</div>
                <div class="profile-info-value" style="font-size: 0.85rem;">${joinDate}</div>
            </div>
        </div>
        
        <div class="profile-settings">
            <h3 class="profile-settings-title">
                <i class="fas fa-cog"></i>
                Settings
            </h3>
            
            <div class="profile-setting-item">
                <div>
                    <div class="profile-setting-label">Background Music</div>
                    <div class="profile-setting-description">Play background music while browsing</div>
                </div>
                <div class="toggle-switch ${AppState.settings?.music ? 'active' : ''}" onclick="toggleSetting('music')"></div>
            </div>
            
            <div class="profile-setting-item">
                <div>
                    <div class="profile-setting-label">Notifications</div>
                    <div class="profile-setting-description">Show notification messages</div>
                </div>
                <div class="toggle-switch ${AppState.settings?.notifications !== false ? 'active' : ''}" onclick="toggleSetting('notifications')"></div>
            </div>
            
            <div class="profile-setting-item">
                <div>
                    <div class="profile-setting-label">Auto Download Orders</div>
                    <div class="profile-setting-description">Automatically download approved orders</div>
                </div>
                <div class="toggle-switch ${AppState.settings?.autoDownload ? 'active' : ''}" onclick="toggleSetting('autoDownload')"></div>
            </div>
            
            <div class="profile-setting-item" style="border-bottom: none;">
                <div>
                    <div class="profile-setting-label">Website Version</div>
                    <div class="profile-setting-description">v1.0.0</div>
                </div>
            </div>
        </div>
        
        ${AppState.websiteConfig?.webapp_url ? `
            <button class="buy-now-btn" onclick="downloadWebApp()" style="margin-top: 1rem;">
                <i class="fas fa-download"></i>
                Download Web App
            </button>
        ` : ''}
        
        <button class="buy-now-btn" onclick="logout()" style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); margin-top: 0.5rem;">
            <i class="fas fa-sign-out-alt"></i>
            Logout
        </button>
    `;
}

// Initialize settings
if (!AppState.settings) {
    AppState.settings = {
        music: false,
        notifications: true,
        autoDownload: false
    };
}

function toggleSetting(setting) {
    AppState.settings[setting] = !AppState.settings[setting];
    
    // Save to localStorage
    localStorage.setItem('userSettings', JSON.stringify(AppState.settings));
    
    // Update toggle visual
    const toggles = document.querySelectorAll('.toggle-switch');
    toggles.forEach(toggle => {
        const parent = toggle.parentElement;
        const label = parent.querySelector('.profile-setting-label').textContent;
        
        if (
            (label.includes('Music') && setting === 'music') ||
            (label.includes('Notifications') && setting === 'notifications') ||
            (label.includes('Auto Download') && setting === 'autoDownload')
        ) {
            if (AppState.settings[setting]) {
                toggle.classList.add('active');
            } else {
                toggle.classList.remove('active');
            }
        }
    });
    
    // Apply setting
    if (setting === 'music') {
        if (AppState.settings.music) {
            startMusicPlayer();
        } else {
            stopMusicPlayer();
        }
    }
    
    showToast('Setting Updated', `${setting} has been ${AppState.settings[setting] ? 'enabled' : 'disabled'}`, 'success');
}

async function downloadWebApp() {
    if (!AppState.websiteConfig?.webapp_url) return;
    
    showLoader();
    
    try {
        const response = await fetch(AppState.websiteConfig.webapp_url);
        const blob = await response.blob();
        
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'app.apk';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        hideLoader();
        showToast('Download Started', 'Web app is downloading', 'success');
        
    } catch (error) {
        console.error('Download error:', error);
        hideLoader();
        showToast('Error', 'Failed to download app', 'error');
    }
}

/* ========================================
   NOTIFICATIONS SYSTEM
======================================== */

function toggleNotifications() {
    const panel = document.getElementById('notificationPanel');
    
    if (panel.classList.contains('active')) {
        panel.classList.remove('active');
    } else {
        panel.classList.add('active');
        loadNotifications();
    }
}

function closeNotifications() {
    document.getElementById('notificationPanel').classList.remove('active');
}

async function loadNotifications() {
    if (!AppState.sessionActive) return;
    
    try {
        const { data: notifications, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', AppState.currentUser.id)
            .order('created_at', { ascending: false })
            .limit(20);
        
        if (error) throw error;
        
        const container = document.getElementById('notificationList');
        container.innerHTML = '';
        
        if (!notifications || notifications.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
                    <i class="fas fa-bell-slash" style="font-size: 2rem; margin-bottom: 0.5rem; opacity: 0.3;"></i>
                    <p>No notifications</p>
                </div>
            `;
            
            document.getElementById('notificationCount').textContent = '0';
            document.getElementById('notificationCount').style.display = 'none';
            return;
        }
        
        // Update badge count
        const unreadCount = notifications.filter(n => !n.read).length;
        const badge = document.getElementById('notificationCount');
        badge.textContent = unreadCount;
        badge.style.display = unreadCount > 0 ? 'flex' : 'none';
        
        notifications.forEach(notification => {
            const item = document.createElement('div');
            item.className = 'notification-item';
            item.style.cssText = `
                padding: 1rem;
                border-bottom: 1px solid rgba(255,255,255,0.05);
                cursor: pointer;
                transition: var(--transition-fast);
                background: ${notification.read ? 'transparent' : 'rgba(102, 126, 234, 0.1)'};
            `;
            
            item.addEventListener('mouseover', function() {
                this.style.background = 'var(--bg-hover)';
            });
            
            item.addEventListener('mouseout', function() {
                this.style.background = notification.read ? 'transparent' : 'rgba(102, 126, 234, 0.1)';
            });
            
            const notifDate = new Date(notification.created_at).toLocaleString();
            
            let icon = 'fa-bell';
            let iconColor = 'var(--accent-purple)';
            
            if (notification.type === 'order') {
                icon = 'fa-shopping-cart';
                iconColor = '#4ade80';
            } else if (notification.type === 'coupon') {
                icon = 'fa-tag';
                iconColor = '#fbbf24';
            } else if (notification.type === 'message') {
                icon = 'fa-envelope';
                iconColor = 'var(--accent-blue)';
            }
            
            item.innerHTML = `
                <div style="display: flex; gap: 1rem;">
                    <div style="flex-shrink: 0;">
                        <div style="width: 40px; height: 40px; border-radius: 50%; background: var(--bg-secondary); display: flex; align-items: center; justify-content: center;">
                            <i class="fas ${icon}" style="color: ${iconColor};"></i>
                        </div>
                    </div>
                    <div style="flex: 1; min-width: 0;">
                        <div style="font-size: 0.9rem; font-weight: 600; margin-bottom: 0.25rem; color: var(--text-primary);">
                            ${notification.title}
                        </div>
                        <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.5rem;">
                            ${notification.message}
                        </div>
                        <div style="font-size: 0.75rem; color: var(--text-muted);">
                            <i class="fas fa-clock"></i> ${notifDate}
                        </div>
                    </div>
                    ${!notification.read ? `
                        <div style="flex-shrink: 0;">
                            <div style="width: 8px; height: 8px; border-radius: 50%; background: var(--accent-purple);"></div>
                        </div>
                    ` : ''}
                </div>
            `;
            
            item.addEventListener('click', () => handleNotificationClick(notification));
            
            container.appendChild(item);
        });
        
    } catch (error) {
        console.error('Notifications load error:', error);
    }
}

async function handleNotificationClick(notification) {
    // Mark as read
    if (!notification.read) {
        await supabase
            .from('notifications')
            .update({ read: true })
            .eq('id', notification.id);
        
        loadNotifications();
    }
    
    // Handle notification action
    if (notification.type === 'order' && notification.data) {
        try {
            const data = JSON.parse(notification.data);
            if (data.orderId) {
                closeNotifications();
                switchPage('orderHistory');
            }
        } catch (e) {
            console.error('Notification data parse error:', e);
        }
    } else if (notification.type === 'coupon' && notification.data) {
        try {
            const data = JSON.parse(notification.data);
            if (data.couponCode) {
                showToast('Coupon Code', data.couponCode, 'info');
            }
        } catch (e) {
            console.error('Notification data parse error:', e);
        }
    }
}

// Auto-refresh notifications every 30 seconds
setInterval(() => {
    if (AppState.sessionActive && AppState.settings?.notifications !== false) {
        loadNotifications();
    }
}, 30000);

/* ========================================
   USER MENU
======================================== */

function toggleUserMenu() {
    const menu = document.getElementById('userMenu');
    
    if (menu.classList.contains('active')) {
        menu.classList.remove('active');
    } else {
        menu.classList.add('active');
        updateUserUI();
    }
}

// Close user menu when clicking outside
document.addEventListener('click', (e) => {
    const menu = document.getElementById('userMenu');
    const btn = document.querySelector('.user-profile-btn');
    
    if (menu && !menu.contains(e.target) && !btn?.contains(e.target)) {
        menu.classList.remove('active');
    }
    
    const notifPanel = document.getElementById('notificationPanel');
    const notifBtn = document.querySelector('.notification-btn');
    
    if (notifPanel && !notifPanel.contains(e.target) && !notifBtn?.contains(e.target)) {
        notifPanel.classList.remove('active');
    }
});

/* ========================================
   MUSIC PLAYER
======================================== */

async function loadMusicPlaylist() {
    try {
        const { data: songs, error } = await supabase
            .from('music')
            .select('*')
            .eq('status', 'active')
            .order('order', { ascending: true });
        
        if (error) throw error;
        
        AppState.musicPlaylist = songs || [];
        
        if (songs && songs.length > 0 && AppState.settings?.music) {
            startMusicPlayer();
        }
        
    } catch (error) {
        console.error('Music load error:', error);
    }
}

function startMusicPlayer() {
    if (!AppState.musicPlaylist || AppState.musicPlaylist.length === 0) return;
    
    const player = document.getElementById('musicPlayer');
    const audio = document.getElementById('audioPlayer');
    
    player.classList.add('active');
    
    playSong(AppState.currentSongIndex);
}

function stopMusicPlayer() {
    const player = document.getElementById('musicPlayer');
    const audio = document.getElementById('audioPlayer');
    
    player.classList.remove('active');
    audio.pause();
    AppState.isPlaying = false;
}

function playSong(index) {
    if (!AppState.musicPlaylist || AppState.musicPlaylist.length === 0) return;
    
    AppState.currentSongIndex = index;
    const song = AppState.musicPlaylist[index];
    
    const audio = document.getElementById('audioPlayer');
    const songName = document.getElementById('currentSongName');
    const playPauseBtn = document.getElementById('playPauseBtn');
    
    audio.src = song.file_url;
    songName.textContent = song.name;
    
    audio.play();
    AppState.isPlaying = true;
    playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
    
    // Auto-play next song when current ends
    audio.onended = () => {
        playNextSong();
    };
}

function playNextSong() {
    if (!AppState.musicPlaylist || AppState.musicPlaylist.length === 0) return;
    
    AppState.currentSongIndex = (AppState.currentSongIndex + 1) % AppState.musicPlaylist.length;
    playSong(AppState.currentSongIndex);
}

function playPrevSong() {
    if (!AppState.musicPlaylist || AppState.musicPlaylist.length === 0) return;
    
    AppState.currentSongIndex = (AppState.currentSongIndex - 1 + AppState.musicPlaylist.length) % AppState.musicPlaylist.length;
    playSong(AppState.currentSongIndex);
}

function togglePlayPause() {
    const audio = document.getElementById('audioPlayer');
    const playPauseBtn = document.getElementById('playPauseBtn');
    
    if (AppState.isPlaying) {
        audio.pause();
        AppState.isPlaying = false;
        playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
    } else {
        audio.play();
        AppState.isPlaying = true;
        playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
    }
}

// Music player controls
document.getElementById('playPauseBtn')?.addEventListener('click', togglePlayPause);
document.getElementById('nextSongBtn')?.addEventListener('click', playNextSong);
document.getElementById('prevSongBtn')?.addEventListener('click', playPrevSong);

document.getElementById('volumeSlider')?.addEventListener('input', function() {
    const audio = document.getElementById('audioPlayer');
    audio.volume = this.value / 100;
});

/* ========================================
   LOAD SAVED SETTINGS
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

/* ========================================
   INDEX1.JS - ADDITIONAL FEATURES
======================================== */

/* ========================================
   ADVANCED ANIMATIONS
======================================== */

function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    
    document.querySelectorAll('.category-group, .news-card, .order-card').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'all 0.5s ease';
        observer.observe(el);
    });
}

// Call on page load
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initScrollAnimations, 500);
});

/* ========================================
   IMAGE LAZY LOADING
======================================== */

function initLazyLoading() {
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.add('loaded');
                observer.unobserve(img);
            }
        });
    });
    
    document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img);
    });
}

/* ========================================
   SEARCH FUNCTIONALITY
======================================== */

let searchTimeout;

function initSearch() {
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Search products...';
    searchInput.style.cssText = `
        width: 100%;
        padding: 0.75rem 1rem 0.75rem 3rem;
        background: var(--bg-secondary);
        border: 1px solid rgba(255,255,255,0.05);
        border-radius: var(--radius-md);
        color: var(--text-primary);
        font-size: 0.9rem;
        margin-bottom: 1rem;
    `;
    
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            performSearch(e.target.value);
        }, 300);
    });
    
    return searchInput;
}

function performSearch(query) {
    if (!query) {
        // Show all products
        document.querySelectorAll('.product-card').forEach(card => {
            card.style.display = 'block';
        });
        return;
    }
    
    const lowerQuery = query.toLowerCase();
    
    document.querySelectorAll('.product-card').forEach(card => {
        const name = card.querySelector('.product-name')?.textContent.toLowerCase();
        const amount = card.querySelector('.product-amount')?.textContent.toLowerCase();
        
        if (name?.includes(lowerQuery) || amount?.includes(lowerQuery)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

/* ========================================
   OFFLINE DETECTION
======================================== */

window.addEventListener('online', () => {
    showToast('Connected', 'You are back online', 'success');
    // Retry any pending operations
});

window.addEventListener('offline', () => {
    showToast('Offline', 'No internet connection', 'warning');
});

/* ========================================
   PERFORMANCE MONITORING
======================================== */

function measurePerformance() {
    if (window.performance) {
        const perfData = window.performance.timing;
        const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
        
        console.log(`Page Load Time: ${pageLoadTime}ms`);
    }
}

window.addEventListener('load', measurePerformance);

/* ========================================
   ERROR BOUNDARY
======================================== */

window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    
    // Don't show error toast for every error in production
    if (window.location.hostname === 'localhost') {
        showToast('Error', event.error?.message || 'An error occurred', 'error');
    }
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
});

/* ========================================
   CACHE MANAGEMENT
======================================== */

const CacheManager = {
    set(key, value, expiryMinutes = 60) {
        const item = {
            value: value,
            expiry: new Date().getTime() + (expiryMinutes * 60 * 1000)
        };
        localStorage.setItem(`cache_${key}`, JSON.stringify(item));
    },
    
    get(key) {
        const itemStr = localStorage.getItem(`cache_${key}`);
        if (!itemStr) return null;
        
        try {
            const item = JSON.parse(itemStr);
            
            if (new Date().getTime() > item.expiry) {
                localStorage.removeItem(`cache_${key}`);
                return null;
            }
            
            return item.value;
        } catch (e) {
            return null;
        }
    },
    
    clear() {
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('cache_')) {
                localStorage.removeItem(key);
            }
        });
    }
};

/* ========================================
   ANALYTICS TRACKING
======================================== */

const Analytics = {
    trackPageView(pageName) {
        console.log('Page View:', pageName);
        // Add your analytics service here (Google Analytics, etc.)
    },
    
    trackEvent(category, action, label) {
        console.log('Event:', { category, action, label });
        // Add your analytics service here
    },
    
    trackPurchase(orderId, amount) {
        console.log('Purchase:', { orderId, amount });
        // Add your analytics service here
    }
};

/* ========================================
   CLIPBOARD UTILITIES
======================================== */

async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showToast('Copied', 'Text copied to clipboard', 'success');
    } catch (error) {
        console.error('Copy error:', error);
        showToast('Error', 'Failed to copy text', 'error');
    }
}

/* ========================================
   SHARE FUNCTIONALITY
======================================== */

async function shareProduct(product) {
    const shareData = {
        title: product.name,
        text: `Check out ${product.name} - ${formatPrice(product.price)}`,
        url: window.location.href
    };
    
    try {
        if (navigator.share) {
            await navigator.share(shareData);
            Analytics.trackEvent('Share', 'Product', product.name);
        } else {
            // Fallback to copying link
            await copyToClipboard(window.location.href);
        }
    } catch (error) {
        console.error('Share error:', error);
    }
}

/* ========================================
   PWA INSTALL PROMPT
======================================== */

let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
    // Show install button
    showInstallPrompt();
});

function showInstallPrompt() {
    const installBtn = document.createElement('button');
    installBtn.className = 'buy-now-btn';
    installBtn.innerHTML = '<i class="fas fa-download"></i> Install App';
    installBtn.style.cssText = `
        position: fixed;
        bottom: 90px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 1000;
        animation: slideUp 0.3s ease;
    `;
    
    installBtn.addEventListener('click', async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            
            if (outcome === 'accepted') {
                showToast('Installed', 'App installed successfully', 'success');
            }
            
            deferredPrompt = null;
            installBtn.remove();
        }
    });
    
    document.body.appendChild(installBtn);
    
    // Remove after 10 seconds
    setTimeout(() => installBtn.remove(), 10000);
}

/* ========================================
   INDEX2.JS - ADVANCED FEATURES
======================================== */

/* ========================================
   REAL-TIME UPDATES WITH SUPABASE
======================================== */

function setupRealtimeSubscriptions() {
    if (!AppState.sessionActive) return;
    
    // Subscribe to order updates
    const orderSubscription = supabase
        .channel('orders_channel')
        .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'orders',
            filter: `user_id=eq.${AppState.currentUser.id}`
        }, (payload) => {
            handleOrderUpdate(payload.new);
        })
        .subscribe();
    
    // Subscribe to notifications
    const notificationSubscription = supabase
        .channel('notifications_channel')
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${AppState.currentUser.id}`
        }, (payload) => {
            handleNewNotification(payload.new);
        })
        .subscribe();
    
    // Store subscriptions for cleanup
    AppState.subscriptions = [orderSubscription, notificationSubscription];
}

async function handleOrderUpdate(order) {
    console.log('Order updated:', order);
    
    // Show notification based on status
    if (order.status === 'approved') {
        showToast('Order Approved! 🎉', `Order #${order.order_id} has been approved`, 'success');
        
        // Auto-download if setting enabled
        if (AppState.settings?.autoDownload) {
            setTimeout(() => {
                downloadOrderPDF(order.id);
            }, 2000);
        }
    } else if (order.status === 'rejected') {
        showToast('Order Rejected', `Order #${order.order_id} was rejected`, 'error');
    }
    
    // Reload order history if on that page
    if (AppState.currentPage === 'orderHistory') {
        await loadOrderHistory();
    }
}

function handleNewNotification(notification) {
    console.log('New notification:', notification);
    
    // Update notification count
    const badge = document.getElementById('notificationCount');
    const currentCount = parseInt(badge.textContent) || 0;
    badge.textContent = currentCount + 1;
    badge.style.display = 'flex';
    
    // Show toast notification if enabled
    if (AppState.settings?.notifications !== false) {
        showToast(notification.title, notification.message, notification.type || 'info');
    }
    
    // Reload notifications if panel is open
    const panel = document.getElementById('notificationPanel');
    if (panel && panel.classList.contains('active')) {
        loadNotifications();
    }
}

function cleanupSubscriptions() {
    if (AppState.subscriptions) {
        AppState.subscriptions.forEach(sub => {
            supabase.removeChannel(sub);
        });
        AppState.subscriptions = [];
    }
}

/* ========================================
   ADVANCED FILTERING & SORTING
======================================== */

class ProductFilter {
    constructor() {
        this.filters = {
            priceMin: 0,
            priceMax: Infinity,
            sortBy: 'newest',
            hasDiscount: false,
            rating: 0
        };
    }
    
    setPriceRange(min, max) {
        this.filters.priceMin = min;
        this.filters.priceMax = max;
        this.apply();
    }
    
    setSorting(sortBy) {
        this.filters.sortBy = sortBy;
        this.apply();
    }
    
    setDiscountFilter(hasDiscount) {
        this.filters.hasDiscount = hasDiscount;
        this.apply();
    }
    
    setRatingFilter(rating) {
        this.filters.rating = rating;
        this.apply();
    }
    
    apply() {
        let filteredProducts = [...AppState.products];
        
        // Apply price filter
        filteredProducts = filteredProducts.filter(p => {
            const finalPrice = calculateDiscount(p.price, p.discount_percent);
            return finalPrice >= this.filters.priceMin && finalPrice <= this.filters.priceMax;
        });
        
        // Apply discount filter
        if (this.filters.hasDiscount) {
            filteredProducts = filteredProducts.filter(p => p.discount_percent > 0);
        }
        
        // Apply sorting
        switch(this.filters.sortBy) {
            case 'price_low':
                filteredProducts.sort((a, b) => {
                    const priceA = calculateDiscount(a.price, a.discount_percent);
                    const priceB = calculateDiscount(b.price, b.discount_percent);
                    return priceA - priceB;
                });
                break;
            case 'price_high':
                filteredProducts.sort((a, b) => {
                    const priceA = calculateDiscount(a.price, a.discount_percent);
                    const priceB = calculateDiscount(b.price, b.discount_percent);
                    return priceB - priceA;
                });
                break;
            case 'discount':
                filteredProducts.sort((a, b) => (b.discount_percent || 0) - (a.discount_percent || 0));
                break;
            case 'newest':
            default:
                filteredProducts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                break;
        }
        
        // Re-render products
        const container = document.getElementById('productsList');
        if (container) {
            container.innerHTML = '';
            filteredProducts.forEach(product => {
                renderProduct(container, product);
            });
        }
    }
    
    reset() {
        this.filters = {
            priceMin: 0,
            priceMax: Infinity,
            sortBy: 'newest',
            hasDiscount: false,
            rating: 0
        };
        this.apply();
    }
}

const productFilter = new ProductFilter();

/* ========================================
   FAVORITES SYSTEM
======================================== */

const FavoritesManager = {
    async add(productId) {
        if (!AppState.sessionActive) {
            openAuthModal();
            return;
        }
        
        try {
            const { error } = await supabase
                .from('favorites')
                .insert([{
                    user_id: AppState.currentUser.id,
                    product_id: productId,
                    created_at: new Date().toISOString()
                }]);
            
            if (error) throw error;
            
            showToast('Added to Favorites', 'Product added to your favorites', 'success');
            this.updateUI(productId, true);
            
        } catch (error) {
            console.error('Add favorite error:', error);
            showToast('Error', 'Failed to add to favorites', 'error');
        }
    },
    
    async remove(productId) {
        try {
            const { error } = await supabase
                .from('favorites')
                .delete()
                .eq('user_id', AppState.currentUser.id)
                .eq('product_id', productId);
            
            if (error) throw error;
            
            showToast('Removed', 'Product removed from favorites', 'info');
            this.updateUI(productId, false);
            
        } catch (error) {
            console.error('Remove favorite error:', error);
            showToast('Error', 'Failed to remove from favorites', 'error');
        }
    },
    
    async toggle(productId) {
        const isFavorite = await this.isFavorite(productId);
        
        if (isFavorite) {
            await this.remove(productId);
        } else {
            await this.add(productId);
        }
    },
    
    async isFavorite(productId) {
        if (!AppState.sessionActive) return false;
        
        try {
            const { data, error } = await supabase
                .from('favorites')
                .select('*')
                .eq('user_id', AppState.currentUser.id)
                .eq('product_id', productId)
                .single();
            
            return !!data;
        } catch (error) {
            return false;
        }
    },
    
    updateUI(productId, isFavorite) {
        const productCard = document.querySelector(`[data-product-id="${productId}"]`);
        if (!productCard) return;
        
        let favoriteBtn = productCard.querySelector('.favorite-btn');
        
        if (!favoriteBtn) {
            favoriteBtn = document.createElement('button');
            favoriteBtn.className = 'favorite-btn';
            favoriteBtn.style.cssText = `
                position: absolute;
                top: 0.5rem;
                right: 0.5rem;
                width: 32px;
                height: 32px;
                background: rgba(0,0,0,0.5);
                border: none;
                border-radius: 50%;
                color: white;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: var(--transition-fast);
                backdrop-filter: blur(10px);
                z-index: 10;
            `;
            
            favoriteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggle(productId);
            });
            
            const imageWrapper = productCard.querySelector('.product-image-wrapper');
            imageWrapper.style.position = 'relative';
            imageWrapper.appendChild(favoriteBtn);
        }
        
        if (isFavorite) {
            favoriteBtn.innerHTML = '<i class="fas fa-heart" style="color: #ef4444;"></i>';
        } else {
            favoriteBtn.innerHTML = '<i class="far fa-heart"></i>';
        }
    }
};

/* ========================================
   CART SYSTEM (Optional)
======================================== */

const CartManager = {
    items: [],
    
    add(product, quantity = 1) {
        const existingItem = this.items.find(item => item.product.id === product.id);
        
        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            this.items.push({
                product: product,
                quantity: quantity
            });
        }
        
        this.save();
        this.updateUI();
        showToast('Added to Cart', `${product.name} added to cart`, 'success');
    },
    
    remove(productId) {
        this.items = this.items.filter(item => item.product.id !== productId);
        this.save();
        this.updateUI();
    },
    
    clear() {
        this.items = [];
        this.save();
        this.updateUI();
    },
    
    getTotal() {
        return this.items.reduce((total, item) => {
            const price = calculateDiscount(item.product.price, item.product.discount_percent);
            return total + (price * item.quantity);
        }, 0);
    },
    
    save() {
        localStorage.setItem('cart', JSON.stringify(this.items));
    },
    
    load() {
        const saved = localStorage.getItem('cart');
        if (saved) {
            try {
                this.items = JSON.parse(saved);
            } catch (e) {
                this.items = [];
            }
        }
    },
    
    updateUI() {
        // Update cart count badge
        const badge = document.getElementById('cartCount');
        if (badge) {
            const totalItems = this.items.reduce((sum, item) => sum + item.quantity, 0);
            badge.textContent = totalItems;
            badge.style.display = totalItems > 0 ? 'flex' : 'none';
        }
    }
};

/* ========================================
   IMAGE COMPRESSION
======================================== */

async function compressImage(file, maxSizeMB = 1) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            const img = new Image();
            
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                
                // Calculate new dimensions
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
                
                // Convert to blob
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

/* ========================================
   FORM VALIDATION
======================================== */

class FormValidator {
    constructor(formId) {
        this.form = document.getElementById(formId);
        this.errors = {};
    }
    
    validate(rules) {
        this.errors = {};
        
        for (const [field, fieldRules] of Object.entries(rules)) {
            const input = this.form.querySelector(`[name="${field}"]`);
            if (!input) continue;
            
            const value = input.value.trim();
            
            // Required validation
            if (fieldRules.required && !value) {
                this.errors[field] = fieldRules.message || `${field} is required`;
                this.showError(input, this.errors[field]);
                continue;
            }
            
            // Min length validation
            if (fieldRules.minLength && value.length < fieldRules.minLength) {
                this.errors[field] = `${field} must be at least ${fieldRules.minLength} characters`;
                this.showError(input, this.errors[field]);
                continue;
            }
            
            // Max length validation
            if (fieldRules.maxLength && value.length > fieldRules.maxLength) {
                this.errors[field] = `${field} must not exceed ${fieldRules.maxLength} characters`;
                this.showError(input, this.errors[field]);
                continue;
            }
            
            // Pattern validation
            if (fieldRules.pattern && !fieldRules.pattern.test(value)) {
                this.errors[field] = fieldRules.message || `${field} format is invalid`;
                this.showError(input, this.errors[field]);
                continue;
            }
            
            // Custom validation
            if (fieldRules.custom && !fieldRules.custom(value)) {
                this.errors[field] = fieldRules.message || `${field} is invalid`;
                this.showError(input, this.errors[field]);
                continue;
            }
            
            // Clear error if validation passes
            this.clearError(input);
        }
        
        return Object.keys(this.errors).length === 0;
    }
    
    showError(input, message) {
        input.style.borderColor = '#ef4444';
        
        let errorDiv = input.parentElement.querySelector('.error-message');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.className = 'error-message';
            errorDiv.style.cssText = `
                color: #ef4444;
                font-size: 0.75rem;
                margin-top: 0.25rem;
            `;
            input.parentElement.appendChild(errorDiv);
        }
        
        errorDiv.textContent = message;
    }
    
    clearError(input) {
        input.style.borderColor = '';
        
        const errorDiv = input.parentElement.querySelector('.error-message');
        if (errorDiv) {
            errorDiv.remove();
        }
    }
    
    clearAll() {
        this.errors = {};
        this.form.querySelectorAll('input, textarea, select').forEach(input => {
            this.clearError(input);
        });
    }
}

/* ========================================
   DATE & TIME UTILITIES
======================================== */

const DateUtils = {
    formatRelative(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        
        return date.toLocaleDateString();
    },
    
    formatDateTime(dateString) {
        const date = new Date(dateString);
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },
    
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    },
    
    formatTime(dateString) {
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }
};

/* ========================================
   LOCAL STORAGE UTILITIES
======================================== */

const Storage = {
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error('Storage set error:', error);
            return false;
        }
    },
    
    get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error('Storage get error:', error);
            return defaultValue;
        }
    },
    
    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Storage remove error:', error);
            return false;
        }
    },
    
    clear() {
        try {
            localStorage.clear();
            return true;
        } catch (error) {
            console.error('Storage clear error:', error);
            return false;
        }
    },
    
    has(key) {
        return localStorage.getItem(key) !== null;
    }
};

/* ========================================
   DEBOUNCE & THROTTLE
======================================== */

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/* ========================================
   RANDOM UTILITIES
======================================== */

const Utils = {
    randomId() {
        return Math.random().toString(36).substring(2) + Date.now().toString(36);
    },
    
    randomColor() {
        return '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
    },
    
    shuffle(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    },
    
    chunk(array, size) {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    },
    
    groupBy(array, key) {
        return array.reduce((result, item) => {
            const group = item[key];
            if (!result[group]) {
                result[group] = [];
            }
            result[group].push(item);
            return result;
        }, {});
    }
};

/* ========================================
   INITIALIZATION
======================================== */

document.addEventListener('DOMContentLoaded', () => {
    // Setup realtime subscriptions when user logs in
    if (AppState.sessionActive) {
        setupRealtimeSubscriptions();
    }
    
    // Load cart
    CartManager.load();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    cleanupSubscriptions();
});

/* ========================================
   INDEX3.JS - UI ENHANCEMENTS
======================================== */

/* ========================================
   SMOOTH SCROLL
======================================== */

function smoothScrollTo(element, duration = 500) {
    const target = typeof element === 'string' ? document.querySelector(element) : element;
    if (!target) return;
    
    const targetPosition = target.getBoundingClientRect().top + window.pageYOffset;
    const startPosition = window.pageYOffset;
    const distance = targetPosition - startPosition - 70; // Account for fixed header
    let startTime = null;
    
    function animation(currentTime) {
        if (startTime === null) startTime = currentTime;
        const timeElapsed = currentTime - startTime;
        const run = ease(timeElapsed, startPosition, distance, duration);
        window.scrollTo(0, run);
        if (timeElapsed < duration) requestAnimationFrame(animation);
    }
    
    function ease(t, b, c, d) {
        t /= d / 2;
        if (t < 1) return c / 2 * t * t + b;
        t--;
        return -c / 2 * (t * (t - 2) - 1) + b;
    }
    
    requestAnimationFrame(animation);
}

/* ========================================
   RIPPLE EFFECT
======================================== */

function createRipple(event) {
    const button = event.currentTarget;
    const ripple = document.createElement('span');
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;
    
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    ripple.className = 'ripple-effect';
    
    const existingRipple = button.querySelector('.ripple-effect');
    if (existingRipple) {
        existingRipple.remove();
    }
    
    button.appendChild(ripple);
    
    setTimeout(() => ripple.remove(), 600);
}

// Add ripple CSS
const rippleStyle = document.createElement('style');
rippleStyle.textContent = `
    .ripple-effect {
        position: absolute;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.4);
        transform: scale(0);
        animation: ripple-animation 0.6s ease-out;
        pointer-events: none;
    }
    
    @keyframes ripple-animation {
        to {
            transform: scale(2);
            opacity: 0;
        }
    }
`;
document.head.appendChild(rippleStyle);

// Add ripple to all buttons
document.addEventListener('click', (e) => {
    if (e.target.matches('button, .btn, .nav-item')) {
        createRipple(e);
    }
});

/* ========================================
   PULL TO REFRESH
======================================== */

let pullToRefreshEnabled = false;
let startY = 0;
let pulling = false;
let refreshThreshold = 80;

function initPullToRefresh() {
    let refreshIndicator = document.getElementById('refreshIndicator');
    
    if (!refreshIndicator) {
        refreshIndicator = document.createElement('div');
        refreshIndicator.id = 'refreshIndicator';
        refreshIndicator.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            height: 60px;
            background: var(--bg-card);
            display: flex;
            align-items: center;
            justify-content: center;
            transform: translateY(-100%);
            transition: transform 0.3s ease;
            z-index: 999;
        `;
        refreshIndicator.innerHTML = '<i class="fas fa-sync-alt" style="color: var(--accent-purple); font-size: 1.5rem;"></i>';
        document.body.appendChild(refreshIndicator);
    }
    
    document.addEventListener('touchstart', (e) => {
        if (window.scrollY === 0) {
            startY = e.touches[0].clientY;
            pulling = true;
        }
    });
    
    document.addEventListener('touchmove', (e) => {
        if (!pulling) return;
        
        const currentY = e.touches[0].clientY;
        const distance = currentY - startY;
        
        if (distance > 0 && distance < refreshThreshold * 2) {
            e.preventDefault();
            refreshIndicator.style.transform = `translateY(${Math.min(distance - 60, 0)}px)`;
            
            if (distance > refreshThreshold) {
                refreshIndicator.querySelector('i').style.animation = 'spin 1s linear infinite';
            }
        }
    });
    
    document.addEventListener('touchend', async (e) => {
        if (!pulling) return;
        
        const currentY = e.changedTouches[0].clientY;
        const distance = currentY - startY;
        
        if (distance > refreshThreshold) {
            // Trigger refresh
            refreshIndicator.style.transform = 'translateY(0)';
            await refreshCurrentPage();
            refreshIndicator.style.transform = 'translateY(-100%)';
            refreshIndicator.querySelector('i').style.animation = '';
        } else {
            refreshIndicator.style.transform = 'translateY(-100%)';
        }
        
        pulling = false;
        startY = 0;
    });
}

async function refreshCurrentPage() {
    showLoader();
    
    try {
        await loadPageData(AppState.currentPage);
        showToast('Refreshed', 'Page refreshed successfully', 'success');
    } catch (error) {
        console.error('Refresh error:', error);
        showToast('Error', 'Failed to refresh page', 'error');
    } finally {
        hideLoader();
    }
}

/* ========================================
   SKELETON LOADING
======================================== */

function createSkeletonLoader(type = 'card') {
    const skeleton = document.createElement('div');
    skeleton.className = 'skeleton-loader';
    
    if (type === 'card') {
        skeleton.innerHTML = `
            <div class="skeleton-image"></div>
            <div class="skeleton-text"></div>
            <div class="skeleton-text short"></div>
        `;
    } else if (type === 'list') {
        skeleton.innerHTML = `
            <div class="skeleton-avatar"></div>
            <div class="skeleton-content">
                <div class="skeleton-text"></div>
                <div class="skeleton-text short"></div>
            </div>
        `;
    }
    
    return skeleton;
}

// Add skeleton CSS
const skeletonStyle = document.createElement('style');
skeletonStyle.textContent = `
    .skeleton-loader {
        background: var(--bg-card);
        border-radius: var(--radius-lg);
        padding: 1rem;
        margin-bottom: 1rem;
    }
    
    .skeleton-image,
    .skeleton-text,
    .skeleton-avatar {
        background: linear-gradient(90deg, var(--bg-hover) 25%, var(--bg-secondary) 50%, var(--bg-hover) 75%);
        background-size: 200% 100%;
        animation: skeleton-loading 1.5s infinite;
        border-radius: var(--radius-sm);
    }
    
    .skeleton-image {
        width: 100%;
        height: 150px;
        margin-bottom: 1rem;
    }
    
    .skeleton-text {
        height: 16px;
        margin-bottom: 0.5rem;
    }
    
    .skeleton-text.short {
        width: 60%;
    }
    
    .skeleton-avatar {
        width: 40px;
        height: 40px;
        border-radius: 50%;
    }
    
    @keyframes skeleton-loading {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
    }
`;
document.head.appendChild(skeletonStyle);

/* ========================================
   INFINITE SCROLL
======================================== */

class InfiniteScroll {
    constructor(container, loadMoreCallback) {
        this.container = container;
        this.loadMoreCallback = loadMoreCallback;
        this.loading = false;
        this.hasMore = true;
        this.page = 1;
        
        this.init();
    }
    
    init() {
        window.addEventListener('scroll', throttle(() => {
            if (this.shouldLoadMore()) {
                this.loadMore();
            }
        }, 200));
    }
    
    shouldLoadMore() {
        if (!this.hasMore || this.loading) return false;
        
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollHeight = document.documentElement.scrollHeight;
        const clientHeight = document.documentElement.clientHeight;
        
        return scrollTop + clientHeight >= scrollHeight - 500;
    }
    
    async loadMore() {
        this.loading = true;
        
        try {
            const hasMore = await this.loadMoreCallback(++this.page);
            this.hasMore = hasMore;
        } catch (error) {
            console.error('Infinite scroll error:', error);
            this.page--;
        } finally {
            this.loading = false;
        }
    }
    
    reset() {
        this.page = 1;
        this.hasMore = true;
        this.loading = false;
    }
}

/* ========================================
   CONTEXTMENU (Long Press)
======================================== */

function initContextMenu() {
    let pressTimer;
    
    document.addEventListener('touchstart', (e) => {
        const target = e.target.closest('.product-card, .order-card');
        if (!target) return;
        
        pressTimer = setTimeout(() => {
            showContextMenu(e, target);
        }, 500);
    });
    
    document.addEventListener('touchend', () => {
        clearTimeout(pressTimer);
    });
    
    document.addEventListener('touchmove', () => {
        clearTimeout(pressTimer);
    });
}

function showContextMenu(event, element) {
    // Vibrate if supported
    if (navigator.vibrate) {
        navigator.vibrate(50);
    }
    
    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.style.cssText = `
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        background: var(--bg-card);
        border-radius: var(--radius-xl) var(--radius-xl) 0 0;
        padding: 1.5rem;
        z-index: 9999;
        animation: slideUpMenu 0.3s ease;
    `;
    
    const productId = element.dataset.productId;
    const orderId = element.dataset.orderId;
    
    let menuItems = '';
    
    if (productId) {
        menuItems = `
            <button onclick="FavoritesManager.toggle('${productId}'); closeContextMenu()">
                <i class="fas fa-heart"></i> Add to Favorites
            </button>
            <button onclick="shareProduct(AppState.products.find(p => p.id === '${productId}')); closeContextMenu()">
                <i class="fas fa-share"></i> Share
            </button>
            <button onclick="closeContextMenu()" style="color: var(--text-muted);">
                <i class="fas fa-times"></i> Cancel
            </button>
        `;
    } else if (orderId) {
        menuItems = `
            <button onclick="viewOrderDetails('${orderId}'); closeContextMenu()">
                <i class="fas fa-eye"></i> View Details
            </button>
            <button onclick="downloadOrderPDF('${orderId}'); closeContextMenu()">
                <i class="fas fa-download"></i> Download Receipt
            </button>
            <button onclick="closeContextMenu()" style="color: var(--text-muted);">
                <i class="fas fa-times"></i> Cancel
            </button>
        `;
    }
    
    menu.innerHTML = menuItems;
    
    // Create overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.7);
        z-index: 9998;
    `;
    overlay.onclick = closeContextMenu;
    
    document.body.appendChild(overlay);
    document.body.appendChild(menu);
    
    // Style menu buttons
    menu.querySelectorAll('button').forEach(btn => {
        btn.style.cssText = `
            width: 100%;
            padding: 1rem;
            background: transparent;
            border: none;
            color: var(--text-primary);
            font-size: 1rem;
            text-align: left;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 1rem;
            transition: var(--transition-fast);
            border-radius: var(--radius-md);
            margin-bottom: 0.5rem;
        `;
        
        btn.addEventListener('click', () => btn.style.background = 'var(--bg-hover)');
    });
}

function closeContextMenu() {
    document.querySelectorAll('.context-menu, .context-menu + div').forEach(el => el.remove());
}

// Add animation CSS
const menuStyle = document.createElement('style');
menuStyle.textContent = `
    @keyframes slideUpMenu {
        from {
            transform: translateY(100%);
        }
        to {
            transform: translateY(0);
        }
    }
`;
document.head.appendChild(menuStyle);

/* ========================================
   SWIPE GESTURES
======================================== */

class SwipeDetector {
    constructor(element, callbacks = {}) {
        this.element = element;
        this.callbacks = callbacks;
        this.startX = 0;
        this.startY = 0;
        this.distX = 0;
        this.distY = 0;
        this.threshold = 50;
        
        this.init();
    }
    
    init() {
        this.element.addEventListener('touchstart', (e) => {
            this.startX = e.touches[0].clientX;
            this.startY = e.touches[0].clientY;
        });
        
        this.element.addEventListener('touchmove', (e) => {
            this.distX = e.touches[0].clientX - this.startX;
            this.distY = e.touches[0].clientY - this.startY;
        });
        
        this.element.addEventListener('touchend', () => {
            if (Math.abs(this.distX) > Math.abs(this.distY)) {
                if (this.distX > this.threshold && this.callbacks.onSwipeRight) {
                    this.callbacks.onSwipeRight();
                } else if (this.distX < -this.threshold && this.callbacks.onSwipeLeft) {
                    this.callbacks.onSwipeLeft();
                }
            } else {
                if (this.distY > this.threshold && this.callbacks.onSwipeDown) {
                    this.callbacks.onSwipeDown();
                } else if (this.distY < -this.threshold && this.callbacks.onSwipeUp) {
                    this.callbacks.onSwipeUp();
                }
            }
            
            this.distX = 0;
            this.distY = 0;
        });
    }
}

/* ========================================
   INITIALIZATION
======================================== */

document.addEventListener('DOMContentLoaded', () => {
    // Initialize pull to refresh
    initPullToRefresh();
    
    // Initialize context menu
    initContextMenu();
    
    // Add swipe to go back
    new SwipeDetector(document.body, {
        onSwipeRight: () => {
            if (AppState.currentPage !== 'home') {
                goBack();
            }
        }
    });
});

/* ========================================
   INDEX1.JS - CONTINUATION FROM INDEX.JS
   This file contains additional features and utilities
======================================== */

/* ========================================
   CACHE MANAGEMENT
======================================== */

const CacheManager = {
  set(key, value, expiryMinutes = 60) {
    const item = {
      value: value,
      expiry: new Date().getTime() + expiryMinutes * 60 * 1000,
    }
    localStorage.setItem(`cache_${key}`, JSON.stringify(item))
  },

  get(key) {
    const itemStr = localStorage.getItem(`cache_${key}`)
    if (!itemStr) return null

    try {
      const item = JSON.parse(itemStr)

      if (new Date().getTime() > item.expiry) {
        localStorage.removeItem(`cache_${key}`)
        return null
      }

      return item.value
    } catch (e) {
      return null
    }
  },

  clear() {
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith("cache_")) {
        localStorage.removeItem(key)
      }
    })
  },
}

/* ========================================
   ANALYTICS TRACKING
======================================== */

const Analytics = {
  trackPageView(pageName) {
    console.log("Page View:", pageName)
    // Add your analytics service here (Google Analytics, etc.)
  },

  trackEvent(category, action, label) {
    console.log("Event:", { category, action, label })
    // Add your analytics service here
  },

  trackPurchase(orderId, amount) {
    console.log("Purchase:", { orderId, amount })
    // Add your analytics service here
  },
}

/* ========================================
   SHARE FUNCTIONALITY
======================================== */

async function shareProduct(product) {
  const shareData = {
    title: product.name,
    text: `Check out ${product.name} - ${formatPrice(product.price)}`,
    url: window.location.href,
  }

  try {
    if (navigator.share) {
      await navigator.share(shareData)
      Analytics.trackEvent("Share", "Product", product.name)
    } else {
      // Fallback to copying link
      await copyToClipboard(window.location.href)
    }
  } catch (error) {
    console.error("Share error:", error)
  }
}

/* ========================================
   PWA INSTALL PROMPT
======================================== */

let deferredPrompt

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault()
  deferredPrompt = e

  // Show install button
  showInstallPrompt()
})

function showInstallPrompt() {
  const installBtn = document.createElement("button")
  installBtn.className = "buy-now-btn"
  installBtn.innerHTML = '<i class="fas fa-download"></i> Install App'
  installBtn.style.cssText = `
    position: fixed;
    bottom: 90px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 1000;
    animation: slideUp 0.3s ease;
  `

  installBtn.addEventListener("click", async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice

      if (outcome === "accepted") {
        showToast("Installed", "App installed successfully", "success")
      }

      deferredPrompt = null
      installBtn.remove()
    }
  })

  document.body.appendChild(installBtn)

  // Remove after 10 seconds
  setTimeout(() => installBtn.remove(), 10000)
}

/* ========================================
   OFFLINE DETECTION
======================================== */

window.addEventListener("online", () => {
  showToast("Connected", "You are back online", "success")
  // Retry any pending operations
})

window.addEventListener("offline", () => {
  showToast("Offline", "No internet connection", "warning")
})

/* ========================================
   PERFORMANCE MONITORING
======================================== */

function measurePerformance() {
  if (window.performance) {
    const perfData = window.performance.timing
    const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart

    console.log(`Page Load Time: ${pageLoadTime}ms`)
  }
}

window.addEventListener("load", measurePerformance)

/* ========================================
   ERROR BOUNDARY
======================================== */

window.addEventListener("error", (event) => {
  console.error("Global error:", event.error)

  // Don't show error toast for every error in production
  if (window.location.hostname === "localhost") {
    showToast("Error", event.error?.message || "An error occurred", "error")
  }
})

window.addEventListener("unhandledrejection", (event) => {
  console.error("Unhandled promise rejection:", event.reason)
})

/* ========================================
   SEARCH FUNCTIONALITY
======================================== */

let searchTimeout

function initSearch() {
  const searchInput = document.createElement("input")
  searchInput.type = "text"
  searchInput.placeholder = "Search products..."
  searchInput.style.cssText = `
    width: 100%;
    padding: 0.75rem 1rem 0.75rem 3rem;
    background: var(--bg-secondary);
    border: 1px solid rgba(255,255,255,0.05);
    border-radius: var(--radius-md);
    color: var(--text-primary);
    font-size: 0.9rem;
    margin-bottom: 1rem;
  `

  searchInput.addEventListener("input", (e) => {
    clearTimeout(searchTimeout)
    searchTimeout = setTimeout(() => {
      performSearch(e.target.value)
    }, 300)
  })

  return searchInput
}

function performSearch(query) {
  if (!query) {
    // Show all products
    document.querySelectorAll(".product-card").forEach((card) => {
      card.style.display = "block"
    })
    return
  }

  const lowerQuery = query.toLowerCase()

  document.querySelectorAll(".product-card").forEach((card) => {
    const name = card.querySelector(".product-name")?.textContent.toLowerCase()
    const amount = card.querySelector(".product-amount")?.textContent.toLowerCase()

    if (name?.includes(lowerQuery) || amount?.includes(lowerQuery)) {
      card.style.display = "block"
    } else {
      card.style.display = "none"
    }
  })
}

/* ========================================
   IMAGE LAZY LOADING
======================================== */

function initLazyLoading() {
  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const img = entry.target
        img.src = img.dataset.src
        img.classList.add("loaded")
        observer.unobserve(img)
      }
    })
  })

  document.querySelectorAll("img[data-src]").forEach((img) => {
    imageObserver.observe(img)
  })
}

/* ========================================
   ADVANCED ANIMATIONS
======================================== */

function initScrollAnimations() {
  const observerOptions = {
    threshold: 0.1,
    rootMargin: "0px 0px -50px 0px",
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = "1"
        entry.target.style.transform = "translateY(0)"
      }
    })
  }, observerOptions)

  document.querySelectorAll(".category-group, .news-card, .order-card").forEach((el) => {
    el.style.opacity = "0"
    el.style.transform = "translateY(20px)"
    el.style.transition = "all 0.5s ease"
    observer.observe(el)
  })
}

// Call on page load
document.addEventListener("DOMContentLoaded", () => {
  setTimeout(initScrollAnimations, 500)
})

/* ========================================
   NOTIFICATION PERMISSION
======================================== */

async function requestNotificationPermission() {
  if (!("Notification" in window)) {
    console.log("This browser does not support notifications")
    return false
  }

  if (Notification.permission === "granted") {
    return true
  }

  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission()
    return permission === "granted"
  }

  return false
}

function showBrowserNotification(title, options = {}) {
  if (Notification.permission === "granted") {
    new Notification(title, {
      icon: "/favicon.png",
      badge: "/favicon.png",
      ...options,
    })
  }
}

/* ========================================
   KEYBOARD SHORTCUTS
======================================== */

document.addEventListener("keydown", (e) => {
  // Ctrl/Cmd + K for search
  if ((e.ctrlKey || e.metaKey) && e.key === "k") {
    e.preventDefault()
    // Focus search input if it exists
    const searchInput = document.querySelector('input[type="text"][placeholder*="Search"]')
    if (searchInput) {
      searchInput.focus()
    }
  }

  // Escape to close modals
  if (e.key === "Escape") {
    closeProductDetail()
    closeOrderConfirm()
    closeAuthModal()
    closeNotifications()
    document.getElementById("userMenu")?.classList.remove("active")
  }

  // Arrow keys for navigation (if applicable)
  if (e.key === "ArrowLeft" && AppState.currentPage !== "home") {
    goBack()
  }
})

/* ========================================
   PRINT FUNCTIONALITY
======================================== */

function printOrderReceipt(orderId) {
  const order = AppState.orders.find((o) => o.id === orderId)
  if (!order) return

  const printWindow = window.open("", "_blank")
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Order Receipt #${order.order_id}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          padding: 20px;
          max-width: 800px;
          margin: 0 auto;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 2px solid #333;
          padding-bottom: 20px;
        }
        .order-info {
          margin-bottom: 20px;
        }
        .order-info div {
          margin: 10px 0;
        }
        .total {
          font-size: 1.5rem;
          font-weight: bold;
          margin-top: 20px;
          text-align: right;
        }
        @media print {
          button {
            display: none;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Order Receipt</h1>
        <p>Order #${order.order_id}</p>
      </div>
      <div class="order-info">
        <div><strong>Product:</strong> ${order.products?.name}</div>
        <div><strong>Date:</strong> ${new Date(order.created_at).toLocaleString()}</div>
        <div><strong>Payment Method:</strong> ${order.payment_methods?.name}</div>
        <div><strong>Status:</strong> ${order.status.toUpperCase()}</div>
      </div>
      <div class="total">
        Total: ${formatPrice(order.amount)}
      </div>
      <button onclick="window.print()" style="margin-top: 20px; padding: 10px 20px; cursor: pointer;">
        Print Receipt
      </button>
    </body>
    </html>
  `)
  printWindow.document.close()
}

/* ========================================
   EXPORT DATA
======================================== */

function exportOrdersToCSV() {
  if (!AppState.orders || AppState.orders.length === 0) {
    showToast("No Data", "No orders to export", "warning")
    return
  }

  const headers = ["Order ID", "Product", "Amount", "Payment Method", "Status", "Date"]
  const rows = AppState.orders.map((order) => [
    order.order_id,
    order.products?.name || "N/A",
    order.amount,
    order.payment_methods?.name || "N/A",
    order.status,
    new Date(order.created_at).toLocaleString(),
  ])

  let csvContent = headers.join(",") + "\n"
  rows.forEach((row) => {
    csvContent += row.map((cell) => `"${cell}"`).join(",") + "\n"
  })

  const blob = new Blob([csvContent], { type: "text/csv" })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `orders_${Date.now()}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  window.URL.revokeObjectURL(url)

  showToast("Exported", "Orders exported successfully", "success")
}

/* ========================================
   DARK MODE TOGGLE (Optional Enhancement)
======================================== */

function toggleDarkMode() {
  document.body.classList.toggle("light-mode")
  const isLight = document.body.classList.contains("light-mode")
  localStorage.setItem("theme", isLight ? "light" : "dark")
  showToast("Theme Changed", `Switched to ${isLight ? "light" : "dark"} mode`, "info")
}

// Load saved theme preference
function loadThemePreference() {
  const savedTheme = localStorage.getItem("theme")
  if (savedTheme === "light") {
    document.body.classList.add("light-mode")
  }
}

// Apply theme on load
document.addEventListener("DOMContentLoaded", loadThemePreference)

/* ========================================
   COUPON SYSTEM
======================================== */

async function applyCoupon(couponCode) {
  if (!couponCode) {
    showToast("Invalid Coupon", "Please enter a coupon code", "warning")
    return null
  }

  showLoader()

  try {
    const { data: coupon, error } = await supabase
      .from("coupons")
      .select("*")
      .eq("code", couponCode.toUpperCase())
      .eq("status", "active")
      .single()

    if (error || !coupon) {
      hideLoader()
      showToast("Invalid Coupon", "Coupon code not found or expired", "error")
      return null
    }

    // Check if coupon is still valid (expiry date)
    if (coupon.expiry_date && new Date(coupon.expiry_date) < new Date()) {
      hideLoader()
      showToast("Expired Coupon", "This coupon has expired", "error")
      return null
    }

    // Check usage limit
    if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) {
      hideLoader()
      showToast("Coupon Limit Reached", "This coupon has reached its usage limit", "error")
      return null
    }

    hideLoader()
    showToast("Coupon Applied!", `${coupon.discount_percent}% discount applied`, "success")
    return coupon
  } catch (error) {
    console.error("Coupon apply error:", error)
    hideLoader()
    showToast("Error", "Failed to apply coupon", "error")
    return null
  }
}

/* ========================================
   REFERRAL SYSTEM
======================================== */

function generateReferralLink() {
  if (!AppState.currentUser) return null

  const baseUrl = window.location.origin
  const referralCode = AppState.currentUser.id.substring(0, 8)
  return `${baseUrl}?ref=${referralCode}`
}

function copyReferralLink() {
  const link = generateReferralLink()
  if (link) {
    copyToClipboard(link)
    showToast("Referral Link Copied", "Share with friends to earn rewards!", "success")
  }
}

/* ========================================
   WISHLIST SYSTEM
======================================== */

const WishlistManager = {
  items: [],

  async load() {
    if (!AppState.sessionActive) return

    try {
      const { data, error } = await supabase
        .from("favorites")
        .select("*, products(*)")
        .eq("user_id", AppState.currentUser.id)

      if (error) throw error

      this.items = data || []
      this.updateUI()
    } catch (error) {
      console.error("Wishlist load error:", error)
    }
  },

  updateUI() {
    const badge = document.getElementById("wishlistCount")
    if (badge) {
      badge.textContent = this.items.length
      badge.style.display = this.items.length > 0 ? "flex" : "none"
    }
  },
}

/* ========================================
   COMPARISON SYSTEM
======================================== */

const ComparisonManager = {
  items: [],
  maxItems: 4,

  add(product) {
    if (this.items.length >= this.maxItems) {
      showToast("Comparison Full", `You can only compare up to ${this.maxItems} products`, "warning")
      return
    }

    if (this.items.find((p) => p.id === product.id)) {
      showToast("Already Added", "This product is already in comparison", "info")
      return
    }

    this.items.push(product)
    this.save()
    this.updateUI()
    showToast("Added to Comparison", `${product.name} added to comparison`, "success")
  },

  remove(productId) {
    this.items = this.items.filter((p) => p.id !== productId)
    this.save()
    this.updateUI()
  },

  clear() {
    this.items = []
    this.save()
    this.updateUI()
  },

  save() {
    localStorage.setItem("comparison", JSON.stringify(this.items))
  },

  load() {
    const saved = localStorage.getItem("comparison")
    if (saved) {
      try {
        this.items = JSON.parse(saved)
      } catch (e) {
        this.items = []
      }
    }
  },

  updateUI() {
    const badge = document.getElementById("comparisonCount")
    if (badge) {
      badge.textContent = this.items.length
      badge.style.display = this.items.length > 0 ? "flex" : "none"
    }
  },

  showComparison() {
    if (this.items.length < 2) {
      showToast("Add More Products", "Add at least 2 products to compare", "warning")
      return
    }

    // Create comparison modal
    const modal = document.createElement("div")
    modal.className = "comparison-modal"
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.9);
      z-index: 9999;
      overflow-y: auto;
      padding: 2rem;
    `

    let comparisonHTML = `
      <div style="background: var(--bg-card); border-radius: var(--radius-xl); padding: 2rem; max-width: 1200px; margin: 0 auto;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
          <h2>Product Comparison</h2>
          <button onclick="this.closest('.comparison-modal').remove()" style="background: none; border: none; color: var(--text-primary); font-size: 1.5rem; cursor: pointer;">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div style="display: grid; grid-template-columns: repeat(${this.items.length}, 1fr); gap: 1rem;">
    `

    this.items.forEach((product) => {
      const finalPrice = calculateDiscount(product.price, product.discount_percent)
      comparisonHTML += `
        <div style="text-align: center;">
          <img src="${product.image_url}" alt="${product.name}" style="width: 100%; height: 200px; object-fit: cover; border-radius: var(--radius-md); margin-bottom: 1rem;">
          <h3 style="margin-bottom: 0.5rem;">${product.name}</h3>
          <div style="font-size: 1.2rem; font-weight: bold; color: var(--accent-purple); margin-bottom: 1rem;">
            ${formatPrice(finalPrice)}
          </div>
          <div style="text-align: left; padding: 1rem; background: var(--bg-secondary); border-radius: var(--radius-md);">
            <div style="margin-bottom: 0.5rem;"><strong>Amount:</strong> ${product.amount || "N/A"}</div>
            ${product.discount_percent > 0 ? `<div style="margin-bottom: 0.5rem;"><strong>Discount:</strong> ${product.discount_percent}%</div>` : ""}
            ${product.type ? `<div style="margin-bottom: 0.5rem;"><strong>Type:</strong> ${product.type}</div>` : ""}
          </div>
          <button onclick="ComparisonManager.remove('${product.id}'); this.closest('.comparison-modal').remove(); ComparisonManager.showComparison();" 
            style="margin-top: 1rem; padding: 0.5rem 1rem; background: var(--bg-hover); border: none; border-radius: var(--radius-md); color: var(--text-primary); cursor: pointer;">
            Remove
          </button>
        </div>
      `
    })

    comparisonHTML += `
        </div>
        <button onclick="ComparisonManager.clear(); this.closest('.comparison-modal').remove();" 
          style="margin-top: 2rem; padding: 0.75rem 1.5rem; background: var(--primary-gradient); border: none; border-radius: var(--radius-md); color: white; cursor: pointer; font-weight: 600;">
          Clear All
        </button>
      </div>
    `

    modal.innerHTML = comparisonHTML
    document.body.appendChild(modal)
  },
}

/* ========================================
   RECENTLY VIEWED
======================================== */

const RecentlyViewedManager = {
  items: [],
  maxItems: 10,

  add(product) {
    // Remove if already exists
    this.items = this.items.filter((p) => p.id !== product.id)

    // Add to beginning
    this.items.unshift(product)

    // Limit to maxItems
    if (this.items.length > this.maxItems) {
      this.items = this.items.slice(0, this.maxItems)
    }

    this.save()
  },

  save() {
    localStorage.setItem("recentlyViewed", JSON.stringify(this.items))
  },

  load() {
    const saved = localStorage.getItem("recentlyViewed")
    if (saved) {
      try {
        this.items = JSON.parse(saved)
      } catch (e) {
        this.items = []
      }
    }
  },

  render(containerId) {
    const container = document.getElementById(containerId)
    if (!container || this.items.length === 0) return

    container.innerHTML = `
      <h3 style="margin-bottom: 1rem;">Recently Viewed</h3>
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 1rem;">
        ${this.items
          .map(
            (product) => `
          <div class="product-card" onclick="openProductDetail(${JSON.stringify(product).replace(/"/g, "&quot;")})">
            <img src="${product.image_url}" alt="${product.name}" style="width: 100%; height: 150px; object-fit: cover; border-radius: var(--radius-md);">
            <div style="padding: 0.5rem;">
              <div style="font-size: 0.9rem; font-weight: 600;">${product.name}</div>
              <div style="color: var(--accent-purple); font-weight: bold;">${formatPrice(calculateDiscount(product.price, product.discount_percent))}</div>
            </div>
          </div>
        `,
          )
          .join("")}
      </div>
    `
  },
}

/* ========================================
   QUICK VIEW
======================================== */

function showQuickView(product) {
  const modal = document.createElement("div")
  modal.className = "quick-view-modal"
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    padding: 2rem;
  `

  const finalPrice = calculateDiscount(product.price, product.discount_percent)

  modal.innerHTML = `
    <div style="background: var(--bg-card); border-radius: var(--radius-xl); padding: 2rem; max-width: 600px; width: 100%; max-height: 80vh; overflow-y: auto;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
        <h2>Quick View</h2>
        <button onclick="this.closest('.quick-view-modal').remove()" style="background: none; border: none; color: var(--text-primary); font-size: 1.5rem; cursor: pointer;">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <img src="${product.image_url}" alt="${product.name}" style="width: 100%; height: 300px; object-fit: cover; border-radius: var(--radius-md); margin-bottom: 1rem;">
      <h3 style="margin-bottom: 0.5rem;">${product.name}</h3>
      <div style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 1rem;">${product.amount || "N/A"}</div>
      <div style="font-size: 1.5rem; font-weight: bold; color: var(--accent-purple); margin-bottom: 1rem;">
        ${formatPrice(finalPrice)}
        ${product.discount_percent > 0 ? `<span style="font-size: 1rem; text-decoration: line-through; color: var(--text-muted); margin-left: 0.5rem;">${formatPrice(product.price)}</span>` : ""}
      </div>
      ${product.description ? `<p style="color: var(--text-secondary); line-height: 1.6; margin-bottom: 1rem;">${product.description}</p>` : ""}
      <div style="display: flex; gap: 1rem;">
        <button onclick="openProductDetail(${JSON.stringify(product).replace(/"/g, "&quot;")}); this.closest('.quick-view-modal').remove();" 
          class="buy-now-btn" style="flex: 1;">
          View Full Details
        </button>
        <button onclick="FavoritesManager.toggle('${product.id}')" 
          style="padding: 0.75rem 1rem; background: var(--bg-hover); border: none; border-radius: var(--radius-md); color: var(--text-primary); cursor: pointer;">
          <i class="far fa-heart"></i>
        </button>
      </div>
    </div>
  `

  document.body.appendChild(modal)

  // Close on overlay click
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.remove()
    }
  })
}

/* ========================================
   INITIALIZATION FOR INDEX1.JS
======================================== */

document.addEventListener("DOMContentLoaded", () => {
  // Load comparison items
  ComparisonManager.load()
  ComparisonManager.updateUI()

  // Load recently viewed
  RecentlyViewedManager.load()

  // Load wishlist
  if (AppState.sessionActive) {
    WishlistManager.load()
  }

  // Initialize lazy loading
  initLazyLoading()

  // Request notification permission if user is logged in
  if (AppState.sessionActive) {
    requestNotificationPermission()
  }
})

/* ========================================
   HELPER FUNCTIONS
======================================== */

// View order details function
function viewOrderDetails(orderId) {
  const order = AppState.orders.find((o) => o.id === orderId)
  if (!order) return

  const modal = document.createElement("div")
  modal.className = "order-details-modal"
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    padding: 2rem;
  `

  let inputDataHTML = ""
  if (order.input_data) {
    try {
      const inputData = JSON.parse(order.input_data)
      inputDataHTML = Object.entries(inputData)
        .map(
          ([key, value]) => `
        <div style="margin-bottom: 0.5rem;">
          <strong>${key}:</strong> ${value}
        </div>
      `,
        )
        .join("")
    } catch (e) {
      console.error("Input data parse error:", e)
    }
  }

  modal.innerHTML = `
    <div style="background: var(--bg-card); border-radius: var(--radius-xl); padding: 2rem; max-width: 600px; width: 100%; max-height: 80vh; overflow-y: auto;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
        <h2>Order Details</h2>
        <button onclick="this.closest('.order-details-modal').remove()" style="background: none; border: none; color: var(--text-primary); font-size: 1.5rem; cursor: pointer;">
          <i class="fas fa-times"></i>
        </button>
      </div>
      
      <div style="margin-bottom: 1.5rem;">
        <div style="font-size: 1.2rem; font-weight: bold; margin-bottom: 0.5rem;">Order #${order.order_id}</div>
        <div style="color: var(--text-secondary);">${new Date(order.created_at).toLocaleString()}</div>
      </div>
      
      <div style="background: var(--bg-secondary); border-radius: var(--radius-md); padding: 1rem; margin-bottom: 1.5rem;">
        <div style="margin-bottom: 0.5rem;"><strong>Product:</strong> ${order.products?.name}</div>
        <div style="margin-bottom: 0.5rem;"><strong>Payment Method:</strong> ${order.payment_methods?.name}</div>
        <div style="margin-bottom: 0.5rem;"><strong>Amount:</strong> ${formatPrice(order.amount)}</div>
        <div><strong>Status:</strong> <span style="color: ${order.status === "approved" ? "#4ade80" : order.status === "rejected" ? "#ef4444" : "#fbbf24"};">${order.status.toUpperCase()}</span></div>
      </div>
      
      ${
        inputDataHTML
          ? `
        <div style="background: var(--bg-secondary); border-radius: var(--radius-md); padding: 1rem; margin-bottom: 1.5rem;">
          <h3 style="margin-bottom: 1rem;">Order Information</h3>
          ${inputDataHTML}
        </div>
      `
          : ""
      }
      
      ${
        order.payment_proof_url
          ? `
        <div style="margin-bottom: 1.5rem;">
          <h3 style="margin-bottom: 0.5rem;">Payment Proof</h3>
          <img src="${order.payment_proof_url}" alt="Payment Proof" style="width: 100%; border-radius: var(--radius-md);">
        </div>
      `
          : ""
      }
      
      <div style="display: flex; gap: 1rem;">
        ${
          order.status === "approved" && order.download_url
            ? `
          <button onclick="downloadOrderPDF('${order.id}')" class="buy-now-btn" style="flex: 1;">
            <i class="fas fa-download"></i> Download
          </button>
        `
            : ""
        }
        <button onclick="printOrderReceipt('${order.id}')" style="flex: 1; padding: 0.75rem; background: var(--bg-hover); border: none; border-radius: var(--radius-md); color: var(--text-primary); cursor: pointer;">
          <i class="fas fa-print"></i> Print Receipt
        </button>
      </div>
    </div>
  `

  document.body.appendChild(modal)

  // Close on overlay click
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.remove()
    }
  })
}

/* ========================================
   FINAL INITIALIZATION
======================================== */

// Initialize app when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeApp)
} else {
  initializeApp()
}

console.log("✅ Gaming Store v1.0.0 - All systems ready!")
