// ==================== SUPABASE CONFIGURATION ====================
const SUPABASE_URL = 'https://tyhnhbmiduuaomtkkpik.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5aG5oYm1pZHV1YW9tdGtrcGlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0MjUxMDIsImV4cCI6MjA3NzAwMTEwMn0.oOiNrR6devWKlNlyb4H8mcvUfVYCgDR4st_LxagzQ0s';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ==================== GLOBAL STATE ====================
let currentUser = null;
let websiteSettings = null;
let currentPage = 'home';
let categories = [];
let products = [];
let orders = [];
let notifications = [];
let banners = [];
let linkBanners = [];
let musicPlayer = null;
let loadingAnimations = {};

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', async () => {
    showLoading();
    
    // Check if user is logged in
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        await initializeApp();
    } else {
        hideLoading();
        showAuthModal();
    }
    
    // Setup event listeners
    setupEventListeners();
    
    // Prevent auto-refresh on file upload
    preventAutoRefresh();
});

// ==================== LOADING MANAGEMENT ====================
function showLoading() {
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
        loadingScreen.classList.remove('hidden');
    }
}

function hideLoading() {
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
        setTimeout(() => {
            loadingScreen.classList.add('hidden');
        }, 500);
    }
}

async function loadCustomLoadingAnimation(type = 'default') {
    try {
        const { data, error } = await supabase
            .from('loading_animations')
            .select('*')
            .eq('type', type)
            .single();
        
        if (data && data.animation_url) {
            const loadingContent = document.querySelector('.loading-animation');
            if (loadingContent) {
                if (data.format === 'gif' || data.format === 'png') {
                    loadingContent.innerHTML = `<img src="${data.animation_url}" alt="Loading" style="width: 80px; height: 80px;">`;
                } else if (data.format === 'json') {
                    // Lottie animation support
                    loadingContent.innerHTML = `<div id="lottie-loading"></div>`;
                }
            }
        }
    } catch (error) {
        console.error('Error loading custom animation:', error);
    }
}

// ==================== APP INITIALIZATION ====================
async function initializeApp() {
    try {
        // Load website settings
        await loadWebsiteSettings();
        
        // Apply custom backgrounds
        await applyCustomBackgrounds();
        
        // Load data
        await Promise.all([
            loadBanners(),
            loadLinkBanners(),
            loadCategories(),
            loadNotifications(),
            loadUserOrders()
        ]);
        
        // Setup UI
        updateUserProfile();
        setupMusicPlayer();
        
        // Show app
        document.getElementById('app').style.display = 'block';
        
        hideLoading();
    } catch (error) {
        console.error('Initialization error:', error);
        showToast('Failed to load application', 'error');
        hideLoading();
    }
}

// ==================== WEBSITE SETTINGS ====================
async function loadWebsiteSettings() {
    try {
        const { data, error } = await supabase
            .from('website_settings')
            .select('*')
            .single();
        
        if (error) throw error;
        
        websiteSettings = data;
        
        // Apply logo
        const logoImg = document.getElementById('websiteLogo');
        if (logoImg && data.logo_url) {
            logoImg.src = data.logo_url;
        }
        
        // Apply website name
        const nameSpan = document.getElementById('websiteName');
        if (nameSpan && data.website_name) {
            nameSpan.textContent = data.website_name;
        }
        
        // Apply version
        const versionSpan = document.getElementById('websiteVersion');
        if (versionSpan && data.version) {
            versionSpan.textContent = data.version;
        }
        
        // Apply custom button styles
        if (data.button_background) {
            applyButtonStyles(data.button_background);
        }
        
        // Apply custom loading animations
        if (data.loading_animation) {
            loadingAnimations = data.loading_animation;
        }
        
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

async function applyCustomBackgrounds() {
    try {
        const { data, error } = await supabase
            .from('custom_backgrounds')
            .select('*');
        
        if (error) throw error;
        
        // Apply main background
        const mainBg = data.find(bg => bg.type === 'main');
        if (mainBg && mainBg.background_url) {
            if (mainBg.format === 'video' || mainBg.format === 'mp4') {
                document.body.style.background = 'none';
                const video = document.createElement('video');
                video.src = mainBg.background_url;
                video.autoplay = true;
                video.loop = true;
                video.muted = true;
                video.style.position = 'fixed';
                video.style.top = '0';
                video.style.left = '0';
                video.style.width = '100%';
                video.style.height = '100%';
                video.style.objectFit = 'cover';
                video.style.zIndex = '-1';
                video.style.opacity = '0.3';
                document.body.insertBefore(video, document.body.firstChild);
            } else {
                document.body.style.backgroundImage = `url(${mainBg.background_url})`;
                document.body.style.backgroundSize = 'cover';
                document.body.style.backgroundPosition = 'center';
                document.body.style.backgroundAttachment = 'fixed';
            }
        }
    } catch (error) {
        console.error('Error applying backgrounds:', error);
    }
}

function applyButtonStyles(backgroundUrl) {
    const style = document.createElement('style');
    style.innerHTML = `
        .auth-btn,
        .buy-now-btn,
        .submit-order-btn,
        .top-up-btn,
        .contact-link-btn {
            background-image: url(${backgroundUrl}) !important;
            background-size: cover !important;
            background-position: center !important;
        }
    `;
    document.head.appendChild(style);
}

// ==================== AUTHENTICATION ====================
async function handleSignup() {
    const username = document.getElementById('signupUsername').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    
    // Validation
    if (!username || !email || !password) {
        showToast('Please fill all fields', 'error');
        return;
    }
    
    // English only validation
    const englishOnlyRegex = /^[a-zA-Z0-9@#%*&®©._-]+$/;
    if (!englishOnlyRegex.test(username)) {
        showToast('Username must contain only English characters', 'error');
        return;
    }
    
    if (!englishOnlyRegex.test(email)) {
        showToast('Email must contain only English characters', 'error');
        return;
    }
    
    // Email validation (Gmail only)
    if (!email.endsWith('@gmail.com')) {
        showToast('Only @gmail.com emails are allowed', 'error');
        return;
    }
    
    // Profanity check
    const profanityWords = ['fuck', 'shit', 'ass', 'bitch', 'damn', 'hell'];
    const hasProfanity = profanityWords.some(word => 
        username.toLowerCase().includes(word) || 
        email.toLowerCase().includes(word)
    );
    
    if (hasProfanity) {
        showToast('Inappropriate language detected', 'error');
        return;
    }
    
    // Password validation
    if (password.length < 8) {
        showToast('Password must be at least 8 characters', 'error');
        return;
    }
    
    if (!/[A-Z]/.test(password[0])) {
        showToast('Password must start with uppercase letter', 'error');
        return;
    }
    
    if (!/[@#%*&®©]/.test(password)) {
        showToast('Password must contain special character (@#%*&®©)', 'error');
        return;
    }
    
    // Password cannot be same as email
    if (password === email) {
        showToast('Password cannot be same as email', 'error');
        return;
    }
    
    try {
        showLoading();
        
        // Check if username or email exists
        const { data: existingUsers, error: checkError } = await supabase
            .from('users')
            .select('username, email')
            .or(`username.eq.${username},email.eq.${email}`);
        
        if (checkError) throw checkError;
        
        if (existingUsers && existingUsers.length > 0) {
            const errors = [];
            if (existingUsers.find(u => u.username === username)) {
                errors.push('Username already exists');
            }
            if (existingUsers.find(u => u.email === email)) {
                errors.push('Email already exists');
            }
            showToast(errors.join(', '), 'error');
            hideLoading();
            return;
        }
        
        // Check blocked/deleted accounts
        const { data: blockedAccounts, error: blockedError } = await supabase
            .from('blocked_accounts')
            .select('*')
            .or(`username.eq.${username},email.eq.${email}`);
        
        if (blockedError) throw blockedError;
        
        if (blockedAccounts && blockedAccounts.length > 0) {
            showToast('This account has been blocked or deleted', 'error');
            hideLoading();
            return;
        }
        
        // Generate AI avatar
        const avatarUrl = await generateAIAvatar(username);
        
        // Create user
        const { data: newUser, error: insertError } = await supabase
            .from('users')
            .insert([{
                username: username,
                email: email,
                password: password, // Plain text as requested
                avatar_url: avatarUrl,
                created_at: new Date().toISOString(),
                total_orders: 0,
                settings: {
                    music_enabled: true,
                    sms_notifications: true,
                    auto_download: false
                }
            }])
            .select()
            .single();
        
        if (insertError) throw insertError;
        
        currentUser = newUser;
        localStorage.setItem('currentUser', JSON.stringify(newUser));
        
        hideLoading();
        closeAuthModal();
        await initializeApp();
        
        showToast('Account created successfully!', 'success');
        
    } catch (error) {
        console.error('Signup error:', error);
        showToast('Failed to create account', 'error');
        hideLoading();
    }
}

async function handleLogin() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    if (!email || !password) {
        showToast('Please fill all fields', 'error');
        return;
    }
    
    try {
        showLoading();
        
        // Check if account is blocked
        const { data: blockedAccount, error: blockedError } = await supabase
            .from('blocked_accounts')
            .select('*')
            .eq('email', email)
            .single();
        
        if (blockedAccount) {
            showToast('This account has been blocked or deleted', 'error');
            hideLoading();
            return;
        }
        
        // Find user
        const { data: user, error: loginError } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .eq('password', password)
            .single();
        
        if (loginError || !user) {
            showToast('Invalid email or password', 'error');
            hideLoading();
            return;
        }
        
        currentUser = user;
        localStorage.setItem('currentUser', JSON.stringify(user));
        
        hideLoading();
        closeAuthModal();
        await initializeApp();
        
        showToast('Welcome back!', 'success');
        
    } catch (error) {
        console.error('Login error:', error);
        showToast('Login failed', 'error');
        hideLoading();
    }
}

function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        currentUser = null;
        localStorage.removeItem('currentUser');
        location.reload();
    }
}

async function generateAIAvatar(username) {
    // Generate unique avatar using DiceBear API
    const styles = ['avataaars', 'bottts', 'identicon', 'initials'];
    const randomStyle = styles[Math.floor(Math.random() * styles.length)];
    return `https://api.dicebear.com/7.x/${randomStyle}/svg?seed=${encodeURIComponent(username)}&backgroundColor=6366f1`;
}

// ==================== PASSWORD VALIDATION UI ====================
document.addEventListener('input', (e) => {
    if (e.target.id === 'signupPassword') {
        const password = e.target.value;
        
        // Length check
        const lengthReq = document.getElementById('req-length');
        if (password.length >= 8) {
            lengthReq.classList.add('valid');
        } else {
            lengthReq.classList.remove('valid');
        }
        
        // Capital letter check
        const capitalReq = document.getElementById('req-capital');
        if (/[A-Z]/.test(password[0])) {
            capitalReq.classList.add('valid');
        } else {
            capitalReq.classList.remove('valid');
        }
        
        // Special character check
        const specialReq = document.getElementById('req-special');
        if (/[@#%*&®©]/.test(password)) {
            specialReq.classList.add('valid');
        } else {
            specialReq.classList.remove('valid');
        }
    }
});

// ==================== PASSWORD TOGGLE ====================
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('toggle-password')) {
        const input = e.target.previousElementSibling;
        if (input.type === 'password') {
            input.type = 'text';
            e.target.classList.remove('fa-eye');
            e.target.classList.add('fa-eye-slash');
        } else {
            input.type = 'password';
            e.target.classList.remove('fa-eye-slash');
            e.target.classList.add('fa-eye');
        }
    }
});

// ==================== AUTH MODAL MANAGEMENT ====================
function showAuthModal() {
    const modal = document.getElementById('authModal');
    if (modal) {
        modal.classList.add('active');
    }
}

function closeAuthModal() {
    const modal = document.getElementById('authModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

function switchToSignup() {
    document.getElementById('loginForm').classList.remove('active');
    document.getElementById('signupForm').classList.add('active');
    document.getElementById('authTitle').textContent = 'Create Account';
    document.getElementById('authSubtitle').textContent = 'Join us today';
}

function switchToLogin() {
    document.getElementById('signupForm').classList.remove('active');
    document.getElementById('loginForm').classList.add('active');
    document.getElementById('authTitle').textContent = 'Welcome Back';
    document.getElementById('authSubtitle').textContent = 'Sign in to continue';
}

// Close modal on background click
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        if (currentUser) {
            e.target.classList.remove('active');
        }
    }
    
    if (e.target.classList.contains('close-modal')) {
        e.target.closest('.modal').classList.remove('active');
    }
});

// ==================== USER PROFILE ====================
function updateUserProfile() {
    if (!currentUser) return;
    
    // Update avatar
    const avatars = document.querySelectorAll('.user-avatar, .profile-avatar');
    avatars.forEach(avatar => {
        avatar.src = currentUser.avatar_url;
    });
    
    // Update username
    const usernameElements = document.querySelectorAll('#profileUsername');
    usernameElements.forEach(el => {
        el.textContent = currentUser.username;
    });
    
    // Update email
    const emailElements = document.querySelectorAll('#profileEmail');
    emailElements.forEach(el => {
        el.textContent = currentUser.email;
    });
    
    // Update join date
    const joinDateEl = document.getElementById('joinDate');
    if (joinDateEl && currentUser.created_at) {
        joinDateEl.textContent = new Date(currentUser.created_at).toLocaleDateString();
    }
    
    // Update total orders
    const totalOrdersEl = document.getElementById('totalOrders');
    if (totalOrdersEl) {
        totalOrdersEl.textContent = currentUser.total_orders || 0;
    }
    
    // Update settings
    if (currentUser.settings) {
        document.getElementById('musicToggle').checked = currentUser.settings.music_enabled !== false;
        document.getElementById('smsToggle').checked = currentUser.settings.sms_notifications !== false;
        document.getElementById('autoDownloadToggle').checked = currentUser.settings.auto_download === true;
    }
}

// ==================== BANNERS ====================
async function loadBanners() {
    try {
        const { data, error } = await supabase
            .from('banners')
            .select('*')
            .eq('type', 'main')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        banners = data || [];
        renderBanners();
        
    } catch (error) {
        console.error('Error loading banners:', error);
    }
}

function renderBanners() {
    const container = document.getElementById('mainBanner');
    const dotsContainer = document.getElementById('bannerDots');
    
    if (!container || !dotsContainer) return;
    
    container.innerHTML = '';
    dotsContainer.innerHTML = '';
    
    if (banners.length === 0) {
        container.innerHTML = '<div style="height: 200px; display: flex; align-items: center; justify-content: center; color: var(--text-muted);">No banners available</div>';
        return;
    }
    
    banners.forEach((banner, index) => {
        const slide = document.createElement('div');
        slide.className = 'banner-slide';
        if (index === 0) slide.classList.add('active');
        
        const img = document.createElement('img');
        img.src = banner.image_url;
        img.alt = banner.title || 'Banner';
        
        slide.appendChild(img);
        container.appendChild(slide);
        
        const dot = document.createElement('div');
        dot.className = 'banner-dot';
        if (index === 0) dot.classList.add('active');
        dot.addEventListener('click', () => goToSlide(index));
        dotsContainer.appendChild(dot);
    });
    
    if (banners.length > 1) {
        startBannerAutoPlay();
    }
}

let currentBannerIndex = 0;
let bannerInterval;

function startBannerAutoPlay() {
    if (bannerInterval) clearInterval(bannerInterval);
    
    bannerInterval = setInterval(() => {
        currentBannerIndex = (currentBannerIndex + 1) % banners.length;
        goToSlide(currentBannerIndex);
    }, 5000);
}

function goToSlide(index) {
    const slides = document.querySelectorAll('.banner-slide');
    const dots = document.querySelectorAll('.banner-dot');
    
    slides.forEach((slide, i) => {
        slide.classList.remove('active');
        if (i === index) slide.classList.add('active');
    });
    
    dots.forEach((dot, i) => {
        dot.classList.remove('active');
        if (i === index) dot.classList.add('active');
    });
    
    currentBannerIndex = index;
}

// ==================== LINK BANNERS ====================
async function loadLinkBanners() {
    try {
        const { data, error } = await supabase
            .from('banners')
            .select('*')
            .eq('type', 'link')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        linkBanners = data || [];
        renderLinkBanners();
        
    } catch (error) {
        console.error('Error loading link banners:', error);
    }
}

let currentLinkBannerIndex = 0;
let linkBannerInterval;

function renderLinkBanners() {
    const container = document.getElementById('subBanner');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (linkBanners.length === 0) return;
    
    linkBanners.forEach((banner, index) => {
        const slide = document.createElement('div');
        slide.className = 'sub-banner-slide';
        if (index === 0) slide.classList.add('active');
        
        const img = document.createElement('img');
        img.src = banner.image_url;
        img.alt = banner.title || 'Banner';
        
        slide.appendChild(img);
        slide.addEventListener('click', () => {
            if (banner.link_url) {
                window.open(banner.link_url, '_blank');
            }
        });
        
        container.appendChild(slide);
    });
    
    if (linkBanners.length > 1) {
        startLinkBannerAutoPlay();
    }
}

function startLinkBannerAutoPlay() {
    if (linkBannerInterval) clearInterval(linkBannerInterval);
    
    linkBannerInterval = setInterval(() => {
        const slides = document.querySelectorAll('.sub-banner-slide');
        const current = slides[currentLinkBannerIndex];
        
        currentLinkBannerIndex = (currentLinkBannerIndex + 1) % linkBanners.length;
        const next = slides[currentLinkBannerIndex];
        
        current.classList.add('exiting');
        next.classList.add('entering');
        
        setTimeout(() => {
            current.classList.remove('active', 'exiting');
            next.classList.add('active');
            next.classList.remove('entering');
        }, 600);
        
    }, 10000);
}

// ==================== CATEGORIES ====================
async function loadCategories() {
    try {
        const { data: categoriesData, error: catError } = await supabase
            .from('categories')
            .select('*')
            .order('created_at', { ascending: true });
        
        if (catError) throw catError;
        
        const { data: cardsData, error: cardsError } = await supabase
            .from('category_cards')
            .select('*')
            .order('created_at', { ascending: true });
        
        if (cardsError) throw cardsError;
        
        categories = categoriesData || [];
        const categoryCards = cardsData || [];
        
        renderCategories(categoryCards);
        
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

function renderCategories(categoryCards) {
    const container = document.getElementById('categoriesContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    categories.forEach(category => {
        const cards = categoryCards.filter(card => card.category_id === category.id);
        
        if (cards.length === 0) return;
        
        const categoryGroup = document.createElement('div');
        categoryGroup.className = 'category-group';
        
        const title = document.createElement('h2');
        title.className = 'category-title';
        title.textContent = category.name;
        
        const cardsGrid = document.createElement('div');
        cardsGrid.className = 'category-cards';
        
        cards.forEach(card => {
            const cardEl = createCategoryCard(card);
            cardsGrid.appendChild(cardEl);
        });
        
        categoryGroup.appendChild(title);
        categoryGroup.appendChild(cardsGrid);
        container.appendChild(categoryGroup);
    });
}

function createCategoryCard(card) {
    const cardEl = document.createElement('div');
    cardEl.className = 'category-card';
    
    const content = document.createElement('div');
    content.className = 'category-card-content';
    
    const iconWrapper = document.createElement('div');
    iconWrapper.className = 'category-icon-wrapper';
    
    const icon = document.createElement('img');
    icon.className = 'category-icon';
    icon.src = card.icon_url;
    icon.alt = card.name;
    
    iconWrapper.appendChild(icon);
    
    // Country flag
    if (card.country_flag_url) {
        const flag = document.createElement('img');
        flag.className = 'category-flag';
        flag.src = card.country_flag_url;
        iconWrapper.appendChild(flag);
    }
    
    // Discount badge
    if (card.discount_percentage && card.discount_percentage > 0) {
        const discount = document.createElement('div');
        discount.className = 'category-discount';
        discount.textContent = `-${card.discount_percentage}%`;
        iconWrapper.appendChild(discount);
    }
    
    const name = document.createElement('div');
    name.className = 'category-name';
    name.textContent = card.name;
    
    const stats = document.createElement('div');
    stats.className = 'category-stats';
    
    const rating = document.createElement('div');
    rating.className = 'category-rating';
    rating.innerHTML = `<i class="fas fa-star"></i><span>${card.rating || '4.5'}</span>`;
    
    const sales = document.createElement('div');
    sales.className = 'category-sales';
    sales.innerHTML = `<i class="fas fa-shopping-cart"></i><span>${card.total_sales || 0}</span>`;
    
    stats.appendChild(rating);
    stats.appendChild(sales);
    
    const topUpBtn = document.createElement('button');
    topUpBtn.className = 'top-up-btn';
    topUpBtn.textContent = 'Top Up';
    topUpBtn.addEventListener('click', () => openProductPage(card));
    
    content.appendChild(iconWrapper);
    content.appendChild(name);
    content.appendChild(stats);
    content.appendChild(topUpBtn);
    
    cardEl.appendChild(content);
    
    cardEl.addEventListener('click', (e) => {
        if (!e.target.classList.contains('top-up-btn')) {
            openProductPage(card);
        }
    });
    
    return cardEl;
}

// ==================== NAVIGATION ====================
function navigateTo(page) {
    const pages = document.querySelectorAll('.page');
    pages.forEach(p => p.classList.remove('active'));
    
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => item.classList.remove('active'));
    
    let pageId = '';
    switch(page) {
        case 'home':
            pageId = 'homePage';
            break;
        case 'orderHistory':
            pageId = 'orderHistoryPage';
            loadUserOrders();
            break;
        case 'news':
            pageId = 'newsPage';
            loadNews();
            break;
        case 'contacts':
            pageId = 'contactsPage';
            loadContacts();
            break;
        case 'profile':
            pageId = 'profilePage';
            updateUserProfile();
            break;
    }
    
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.add('active');
    }
    
    const activeNav = Array.from(navItems).find(item => {
        const itemText = item.querySelector('span').textContent.toLowerCase();
        return itemText === page.toLowerCase() || 
               (page === 'orderHistory' && itemText === 'orders') ||
               (page === 'home' && itemText === 'home');
    });
    
    if (activeNav) {
        activeNav.classList.add('active');
    }
    
    currentPage = page;
}

// ==================== TOAST NOTIFICATIONS ====================
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    toast.textContent = message;
    toast.className = 'toast';
    
    if (type) {
        toast.classList.add(type);
    }
    
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// ==================== MUSIC PLAYER ====================
async function setupMusicPlayer() {
    try {
        const { data, error } = await supabase
            .from('music_files')
            .select('*')
            .order('created_at', { ascending: true });
        
        if (error) throw error;
        
        if (data && data.length > 0) {
            musicPlayer = {
                playlist: data,
                currentIndex: 0,
                audio: document.getElementById('bgMusicPlayer')
            };
            
            if (currentUser.settings && currentUser.settings.music_enabled !== false) {
                playMusic();
            }
            
            musicPlayer.audio.addEventListener('ended', () => {
                musicPlayer.currentIndex = (musicPlayer.currentIndex + 1) % musicPlayer.playlist.length;
                playMusic();
            });
        }
    } catch (error) {
        console.error('Error setting up music:', error);
    }
}

function playMusic() {
    if (!musicPlayer || !musicPlayer.playlist.length) return;
    
    const track = musicPlayer.playlist[musicPlayer.currentIndex];
    musicPlayer.audio.src = track.file_url;
    musicPlayer.audio.volume = 0.3;
    musicPlayer.audio.play().catch(e => console.log('Autoplay prevented'));
}

// ==================== SETTINGS ====================
document.getElementById('musicToggle')?.addEventListener('change', async (e) => {
    const enabled = e.target.checked;
    
    if (enabled) {
        playMusic();
    } else {
        musicPlayer?.audio.pause();
    }
    
    await updateUserSettings({ music_enabled: enabled });
});

document.getElementById('smsToggle')?.addEventListener('change', async (e) => {
    await updateUserSettings({ sms_notifications: e.target.checked });
});

document.getElementById('autoDownloadToggle')?.addEventListener('change', async (e) => {
    await updateUserSettings({ auto_download: e.target.checked });
});

async function updateUserSettings(newSettings) {
    try {
        const updatedSettings = { ...currentUser.settings, ...newSettings };
        
        const { error } = await supabase
            .from('users')
            .update({ settings: updatedSettings })
            .eq('id', currentUser.id);
        
        if (error) throw error;
        
        currentUser.settings = updatedSettings;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        
    } catch (error) {
        console.error('Error updating settings:', error);
    }
}

// ==================== NOTIFICATIONS ====================
async function loadNotifications() {
    try {
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        notifications = data || [];
        updateNotificationBadge();
        renderNotifications();
        
    } catch (error) {
        console.error('Error loading notifications:', error);
    }
}

function updateNotificationBadge() {
    const badge = document.getElementById('notifCount');
    if (badge) {
        const unreadCount = notifications.filter(n => !n.read).length;
        badge.textContent = unreadCount;
        badge.style.display = unreadCount > 0 ? 'block' : 'none';
    }
}

function renderNotifications() {
    const container = document.getElementById('notificationList');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (notifications.length === 0) {
        container.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-muted);">No notifications</div>';
        return;
    }
    
    notifications.forEach(notif => {
        const notifEl = document.createElement('div');
        notifEl.className = 'notification-item';
        notifEl.innerHTML = `
            <div class="notification-content">
                <h4>${notif.title}</h4>
                <p>${notif.message}</p>
                ${notif.coupon_code ? `<div class="coupon-code">${notif.coupon_code}</div>` : ''}
                <span class="notification-time">${formatTimestamp(notif.created_at)}</span>
            </div>
        `;
        
        container.appendChild(notifEl);
    });
}

function toggleNotifications() {
    const panel = document.getElementById('notificationPanel');
    if (panel) {
        panel.classList.toggle('active');
    }
}

// ==================== EVENT LISTENERS ====================
function setupEventListeners() {
    // Prevent form submission
    document.querySelectorAll('form').forEach(form => {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
        });
    });
}

function preventAutoRefresh() {
    let uploadingFiles = false;
    
    document.addEventListener('change', (e) => {
        if (e.target.type === 'file') {
            uploadingFiles = true;
            setTimeout(() => {
                uploadingFiles = false;
            }, 60000);
        }
    });
    
    window.addEventListener('beforeunload', (e) => {
        if (uploadingFiles) {
            e.preventDefault();
            e.returnValue = '';
        }
    });
}

// ==================== UTILITIES ====================
function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return date.toLocaleDateString();
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

function calculateDiscountedPrice(originalPrice, discountPercentage) {
    if (!discountPercentage || discountPercentage === 0) {
        return originalPrice;
    }
    
    const discount = (originalPrice * discountPercentage) / 100;
    return originalPrice - discount;
}

// Copy to clipboard
function copyToClipboard(text) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
            showToast('Copied to clipboard!', 'success');
        });
    } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast('Copied to clipboard!', 'success');
    }
}
