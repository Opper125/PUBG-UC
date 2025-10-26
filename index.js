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

// ==================== PRODUCTS PAGE ====================
let currentCategoryCard = null;
let selectedProduct = null;
let productBanners = [];
let currentProductBannerIndex = 0;
let productBannerInterval;

async function openProductPage(categoryCard) {
    currentCategoryCard = categoryCard;
    
    showLoading();
    
    try {
        // Load products for this category card
        const { data: productsData, error: productsError } = await supabase
            .from('products')
            .select('*')
            .eq('category_card_id', categoryCard.id)
            .order('created_at', { ascending: false });
        
        if (productsError) throw productsError;
        
        products = productsData || [];
        
        // Load input tables
        const { data: inputTables, error: tablesError } = await supabase
            .from('input_tables')
            .select('*')
            .eq('category_card_id', categoryCard.id)
            .order('created_at', { ascending: true });
        
        if (tablesError) throw tablesError;
        
        // Load product page banners
        const { data: bannersData, error: bannersError } = await supabase
            .from('product_page_banners')
            .select('*')
            .eq('category_card_id', categoryCard.id)
            .order('created_at', { ascending: false });
        
        if (bannersError) throw bannersError;
        
        productBanners = bannersData || [];
        
        // Load background
        const { data: bgData, error: bgError } = await supabase
            .from('product_page_backgrounds')
            .select('*')
            .eq('category_card_id', categoryCard.id)
            .single();
        
        // Load guidelines
        const { data: guidelines, error: guidelinesError } = await supabase
            .from('product_guidelines')
            .select('*')
            .eq('category_card_id', categoryCard.id)
            .order('created_at', { ascending: true });
        
        // Load YouTube videos
        const { data: videos, error: videosError } = await supabase
            .from('product_youtube_videos')
            .select('*')
            .eq('category_card_id', categoryCard.id)
            .order('created_at', { ascending: true });
        
        // Load feedback settings
        const { data: feedbackSettings, error: feedbackError } = await supabase
            .from('feedback_settings')
            .select('*')
            .eq('category_card_id', categoryCard.id)
            .single();
        
        renderProductPage(categoryCard, inputTables || [], bgData, guidelines || [], videos || [], feedbackSettings);
        
        // Navigate to product detail page
        navigateTo('productDetail');
        
        hideLoading();
        
    } catch (error) {
        console.error('Error loading product page:', error);
        showToast('Failed to load products', 'error');
        hideLoading();
    }
}

function renderProductPage(categoryCard, inputTables, background, guidelines, videos, feedbackSettings) {
    const container = document.getElementById('productDetailPage');
    if (!container) return;
    
    const detailContainer = container.querySelector('.product-detail-container');
    detailContainer.innerHTML = '';
    
    // Apply custom background
    if (background && background.background_url) {
        detailContainer.style.backgroundImage = `url(${background.background_url})`;
        detailContainer.style.backgroundSize = 'cover';
        detailContainer.style.backgroundPosition = 'center';
        detailContainer.style.backgroundAttachment = 'fixed';
    }
    
    // Header
    const header = document.createElement('div');
    header.className = 'product-header';
    header.innerHTML = `
        <img src="${categoryCard.icon_url}" alt="${categoryCard.name}" class="product-header-icon">
        <div class="product-header-info">
            <h2>${categoryCard.name}</h2>
            <p>Choose your product</p>
        </div>
    `;
    detailContainer.appendChild(header);
    
    // Product page banners
    if (productBanners.length > 0) {
        renderProductBanners(detailContainer);
    }
    
    // Input tables
    if (inputTables.length > 0) {
        const tablesSection = document.createElement('div');
        tablesSection.className = 'input-tables-section';
        
        inputTables.forEach(table => {
            const tableEl = document.createElement('div');
            tableEl.className = 'input-table';
            
            const title = document.createElement('h3');
            title.textContent = table.title;
            tableEl.appendChild(title);
            
            table.fields.forEach(field => {
                const fieldDiv = document.createElement('div');
                fieldDiv.className = 'input-field';
                
                const label = document.createElement('label');
                label.textContent = field.label;
                
                const input = document.createElement('input');
                input.type = 'text';
                input.placeholder = field.placeholder;
                input.dataset.fieldName = field.label;
                
                fieldDiv.appendChild(label);
                fieldDiv.appendChild(input);
                tableEl.appendChild(fieldDiv);
            });
            
            tablesSection.appendChild(tableEl);
        });
        
        detailContainer.appendChild(tablesSection);
    }
    
    // Products grid
    if (products.length > 0) {
        const productsGrid = document.createElement('div');
        productsGrid.className = 'products-grid';
        
        products.forEach(product => {
            const productEl = createProductItem(product);
            productsGrid.appendChild(productEl);
        });
        
        detailContainer.appendChild(productsGrid);
    } else {
        const noProducts = document.createElement('div');
        noProducts.style.textAlign = 'center';
        noProducts.style.padding = '40px 20px';
        noProducts.style.color = 'var(--text-muted)';
        noProducts.textContent = 'No products available';
        detailContainer.appendChild(noProducts);
    }
    
    // Buy Now Button
    const buyBtn = document.createElement('button');
    buyBtn.className = 'buy-now-btn';
    buyBtn.innerHTML = '<span>Buy Now</span><i class="fas fa-arrow-right"></i>';
    buyBtn.addEventListener('click', handleBuyNow);
    detailContainer.appendChild(buyBtn);
    
    // Guidelines
    if (guidelines.length > 0) {
        renderGuidelines(detailContainer, guidelines);
    }
    
    // YouTube Videos
    if (videos.length > 0) {
        renderYouTubeVideos(detailContainer, videos);
    }
    
    // Feedback section
    if (feedbackSettings) {
        renderFeedbackSection(detailContainer, feedbackSettings);
    }
}

function renderProductBanners(container) {
    const bannerSection = document.createElement('div');
    bannerSection.className = 'product-page-banner';
    
    const slider = document.createElement('div');
    slider.className = 'product-banner-slider';
    
    productBanners.forEach((banner, index) => {
        const slide = document.createElement('div');
        slide.className = 'product-banner-slide';
        
        if (index === 0) slide.classList.add('center');
        else if (index === 1) slide.classList.add('right');
        else if (index === productBanners.length - 1 && productBanners.length > 2) slide.classList.add('left');
        
        const img = document.createElement('img');
        img.src = banner.image_url;
        img.alt = 'Banner';
        
        slide.appendChild(img);
        slider.appendChild(slide);
    });
    
    const dots = document.createElement('div');
    dots.className = 'product-banner-dots';
    
    productBanners.forEach((_, index) => {
        const dot = document.createElement('div');
        dot.className = 'product-banner-dot';
        if (index === 0) dot.classList.add('active');
        dot.addEventListener('click', () => goToProductBanner(index));
        dots.appendChild(dot);
    });
    
    slider.appendChild(dots);
    bannerSection.appendChild(slider);
    container.appendChild(bannerSection);
    
    if (productBanners.length > 1) {
        startProductBannerAutoPlay();
    }
}

function startProductBannerAutoPlay() {
    if (productBannerInterval) clearInterval(productBannerInterval);
    
    productBannerInterval = setInterval(() => {
        currentProductBannerIndex = (currentProductBannerIndex + 1) % productBanners.length;
        goToProductBanner(currentProductBannerIndex);
    }, 5000);
}

function goToProductBanner(index) {
    const slides = document.querySelectorAll('.product-banner-slide');
    const dots = document.querySelectorAll('.product-banner-dot');
    
    slides.forEach((slide, i) => {
        slide.classList.remove('center', 'left', 'right', 'exit-left', 'exit-right');
        
        if (i === index) {
            slide.classList.add('center');
        } else if (i === (index + 1) % productBanners.length) {
            slide.classList.add('right');
        } else if (i === (index - 1 + productBanners.length) % productBanners.length) {
            slide.classList.add('left');
        }
    });
    
    dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === index);
    });
    
    currentProductBannerIndex = index;
}

function createProductItem(product) {
    const item = document.createElement('div');
    item.className = 'product-item';
    item.dataset.productId = product.id;
    
    const icon = document.createElement('img');
    icon.className = 'product-item-icon';
    icon.src = product.icon_url || 'https://via.placeholder.com/150';
    icon.alt = product.name;
    
    if (product.product_type && product.type_color) {
        const typeBadge = document.createElement('div');
        typeBadge.className = 'product-type-badge';
        typeBadge.textContent = product.product_type;
        typeBadge.style.background = product.type_color;
        item.appendChild(typeBadge);
    }
    
    const name = document.createElement('div');
    name.className = 'product-name';
    name.textContent = product.name;
    
    const amount = document.createElement('div');
    amount.className = 'product-amount';
    amount.textContent = product.amount || '';
    
    const priceContainer = document.createElement('div');
    priceContainer.className = 'product-price-container';
    
    if (product.discount_percentage && product.discount_percentage > 0) {
        const originalPrice = document.createElement('span');
        originalPrice.className = 'product-original-price';
        originalPrice.textContent = `${formatCurrency(product.price)} Ks`;
        priceContainer.appendChild(originalPrice);
        
        const discountedPrice = calculateDiscountedPrice(product.price, product.discount_percentage);
        const price = document.createElement('span');
        price.className = 'product-price';
        price.textContent = `${formatCurrency(discountedPrice)} Ks`;
        priceContainer.appendChild(price);
        
        const discount = document.createElement('span');
        discount.className = 'product-discount';
        discount.textContent = `-${product.discount_percentage}%`;
        priceContainer.appendChild(discount);
    } else {
        const price = document.createElement('span');
        price.className = 'product-price';
        price.textContent = `${formatCurrency(product.price)} Ks`;
        priceContainer.appendChild(price);
    }
    
    const expandBtn = document.createElement('button');
    expandBtn.className = 'product-expand-btn';
    expandBtn.innerHTML = '<i class="fas fa-info-circle"></i> View Details';
    expandBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        showProductDetails(product);
    });
    
    item.appendChild(icon);
    item.appendChild(name);
    item.appendChild(amount);
    item.appendChild(priceContainer);
    item.appendChild(expandBtn);
    
    item.addEventListener('click', () => {
        document.querySelectorAll('.product-item').forEach(p => p.classList.remove('selected'));
        item.classList.add('selected');
        selectedProduct = product;
    });
    
    return item;
}

function showProductDetails(product) {
    const modal = document.createElement('div');
    modal.className = 'modal product-detail-modal active';
    
    const finalPrice = product.discount_percentage && product.discount_percentage > 0
        ? calculateDiscountedPrice(product.price, product.discount_percentage)
        : product.price;
    
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close-modal">&times;</span>
            <div class="product-full-details">
                <img src="${product.icon_url}" style="width: 100%; max-width: 300px; margin: 0 auto 20px; display: block; border-radius: 12px;">
                <h3>${product.name}</h3>
                <div class="product-detail-row">
                    <span class="product-detail-label">Product Type</span>
                    <span class="product-detail-value">${product.product_type || 'N/A'}</span>
                </div>
                <div class="product-detail-row">
                    <span class="product-detail-label">Amount</span>
                    <span class="product-detail-value">${product.amount || 'N/A'}</span>
                </div>
                <div class="product-detail-row">
                    <span class="product-detail-label">Original Price</span>
                    <span class="product-detail-value">${formatCurrency(product.price)} Ks</span>
                </div>
                ${product.discount_percentage ? `
                <div class="product-detail-row">
                    <span class="product-detail-label">Discount</span>
                    <span class="product-detail-value" style="color: var(--danger);">-${product.discount_percentage}%</span>
                </div>
                ` : ''}
                <div class="product-detail-row">
                    <span class="product-detail-label">Final Price</span>
                    <span class="product-detail-value" style="color: var(--success); font-size: 18px;">${formatCurrency(finalPrice)} Ks</span>
                </div>
                ${product.description ? `
                <div class="product-detail-row">
                    <span class="product-detail-label">Description</span>
                    <span class="product-detail-value">${product.description}</span>
                </div>
                ` : ''}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.querySelector('.close-modal').addEventListener('click', () => {
        modal.remove();
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

function renderGuidelines(container, guidelines) {
    const section = document.createElement('div');
    section.className = 'guidelines-section';
    section.style.padding = '20px';
    section.style.marginTop = '32px';
    
    const title = document.createElement('h2');
    title.textContent = 'Guidelines & Information';
    title.style.fontSize = '22px';
    title.style.fontWeight = '700';
    title.style.marginBottom = '24px';
    section.appendChild(title);
    
    guidelines.forEach(guide => {
        const guideEl = document.createElement('div');
        guideEl.style.background = 'var(--bg-secondary)';
        guideEl.style.borderRadius = 'var(--radius-lg)';
        guideEl.style.padding = '20px';
        guideEl.style.marginBottom = '16px';
        guideEl.style.border = '1px solid var(--border-color)';
        
        const guideTitle = document.createElement('h3');
        guideTitle.textContent = guide.title;
        guideTitle.style.fontSize = '18px';
        guideTitle.style.fontWeight = '700';
        guideTitle.style.marginBottom = '12px';
        guideEl.appendChild(guideTitle);
        
        if (guide.icon_url) {
            const icon = document.createElement('img');
            icon.src = guide.icon_url;
            icon.style.width = '100%';
            icon.style.maxWidth = '600px';
            icon.style.borderRadius = 'var(--radius-md)';
            icon.style.marginBottom = '16px';
            guideEl.appendChild(icon);
        }
        
        const content = document.createElement('div');
        content.style.lineHeight = '1.8';
        content.style.color = 'var(--text-secondary)';
        
        // Parse content with image support
        const parsedContent = parseContentWithImages(guide.content);
        content.innerHTML = parsedContent;
        guideEl.appendChild(content);
        
        if (guide.social_links && guide.social_links.length > 0) {
            const socialDiv = document.createElement('div');
            socialDiv.style.display = 'flex';
            socialDiv.style.gap = '12px';
            socialDiv.style.marginTop = '16px';
            socialDiv.style.paddingTop = '16px';
            socialDiv.style.borderTop = '1px solid var(--border-color)';
            
            guide.social_links.forEach(social => {
                const link = document.createElement('a');
                link.href = social.url;
                link.target = '_blank';
                link.style.display = 'flex';
                link.style.alignItems = 'center';
                link.style.gap = '8px';
                link.style.padding = '8px 16px';
                link.style.background = 'var(--bg-tertiary)';
                link.style.borderRadius = 'var(--radius-md)';
                link.style.transition = 'var(--transition-fast)';
                
                const icon = document.createElement('img');
                icon.src = social.icon_url;
                icon.style.width = '20px';
                icon.style.height = '20px';
                icon.style.objectFit = 'contain';
                
                link.appendChild(icon);
                link.innerHTML += social.name || 'Link';
                
                link.addEventListener('mouseenter', () => {
                    link.style.background = 'var(--primary)';
                });
                link.addEventListener('mouseleave', () => {
                    link.style.background = 'var(--bg-tertiary)';
                });
                
                socialDiv.appendChild(link);
            });
            
            guideEl.appendChild(socialDiv);
        }
        
        section.appendChild(guideEl);
    });
    
    container.appendChild(section);
}

function parseContentWithImages(content) {
    if (!content) return '';
    
    // Replace image URLs with img tags
    const urlRegex = /(https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp))/gi;
    let parsed = content.replace(urlRegex, '<img src="$1" style="width: 32px; height: 32px; vertical-align: middle; margin: 0 4px; border-radius: 6px;">');
    
    // Preserve line breaks
    parsed = parsed.replace(/\n/g, '<br>');
    
    return parsed;
}

function renderYouTubeVideos(container, videos) {
    const section = document.createElement('div');
    section.className = 'youtube-videos-section';
    section.style.padding = '20px';
    section.style.marginTop = '32px';
    
    const title = document.createElement('h2');
    title.textContent = 'Video Tutorials';
    title.style.fontSize = '22px';
    title.style.fontWeight = '700';
    title.style.marginBottom = '24px';
    section.appendChild(title);
    
    videos.forEach(video => {
        const videoEl = document.createElement('div');
        videoEl.style.background = 'var(--bg-secondary)';
        videoEl.style.borderRadius = 'var(--radius-lg)';
        videoEl.style.padding = '20px';
        videoEl.style.marginBottom = '16px';
        
        if (video.description) {
            const desc = document.createElement('p');
            desc.textContent = video.description;
            desc.style.marginBottom = '16px';
            desc.style.color = 'var(--text-secondary)';
            videoEl.appendChild(desc);
        }
        
        const iframe = document.createElement('iframe');
        iframe.style.width = '100%';
        iframe.style.height = '250px';
        iframe.style.borderRadius = 'var(--radius-md)';
        iframe.style.border = 'none';
        iframe.setAttribute('allowfullscreen', '');
        
        let videoId = '';
        if (video.video_url.includes('youtube.com/shorts/')) {
            videoId = video.video_url.split('shorts/')[1].split('?')[0];
            iframe.src = `https://www.youtube.com/embed/${videoId}`;
        } else if (video.video_url.includes('youtube.com/watch?v=')) {
            videoId = video.video_url.split('v=')[1].split('&')[0];
            iframe.src = `https://www.youtube.com/embed/${videoId}`;
        } else if (video.video_url.includes('youtu.be/')) {
            videoId = video.video_url.split('youtu.be/')[1].split('?')[0];
            iframe.src = `https://www.youtube.com/embed/${videoId}`;
        }
        
        videoEl.appendChild(iframe);
        section.appendChild(videoEl);
    });
    
    container.appendChild(section);
}

function renderFeedbackSection(container, settings) {
    const section = document.createElement('div');
    section.className = 'feedback-section';
    section.style.padding = '20px';
    section.style.marginTop = '32px';
    section.style.background = 'var(--bg-secondary)';
    section.style.borderRadius = 'var(--radius-lg)';
    
    const title = document.createElement('h3');
    title.textContent = settings.title || 'Customer Feedback';
    title.style.fontSize = '20px';
    title.style.fontWeight = '700';
    title.style.marginBottom = '16px';
    section.appendChild(title);
    
    if (settings.description) {
        const desc = document.createElement('p');
        desc.textContent = settings.description;
        desc.style.color = 'var(--text-muted)';
        desc.style.marginBottom = '16px';
        section.appendChild(desc);
    }
    
    loadAndDisplayFeedback(section, currentCategoryCard.id, settings.max_stars);
    
    container.appendChild(section);
}

async function loadAndDisplayFeedback(container, categoryCardId, maxStars) {
    try {
        const { data, error } = await supabase
            .from('product_feedback')
            .select('*, users(username, avatar_url)')
            .eq('category_card_id', categoryCardId)
            .order('created_at', { ascending: false })
            .limit(20);
        
        if (error) throw error;
        
        if (!data || data.length === 0) {
            container.innerHTML += '<p style="text-align: center; color: var(--text-muted); padding: 20px;">No feedback yet</p>';
            return;
        }
        
        // Calculate statistics
        const stats = calculateFeedbackStats(data, maxStars);
        renderFeedbackStats(container, stats, maxStars);
        
        // Render individual feedback
        const feedbackList = document.createElement('div');
        feedbackList.style.marginTop = '24px';
        
        data.forEach(feedback => {
            const feedbackEl = createFeedbackItem(feedback, maxStars);
            feedbackList.appendChild(feedbackEl);
        });
        
        container.appendChild(feedbackList);
        
    } catch (error) {
        console.error('Error loading feedback:', error);
    }
}

function calculateFeedbackStats(feedbacks, maxStars) {
    const stats = {
        total: feedbacks.length,
        average: 0,
        distribution: {}
    };
    
    for (let i = 1; i <= maxStars; i++) {
        stats.distribution[i] = 0;
    }
    
    let totalStars = 0;
    feedbacks.forEach(f => {
        totalStars += f.rating;
        stats.distribution[f.rating]++;
    });
    
    stats.average = (totalStars / feedbacks.length).toFixed(1);
    
    return stats;
}

function renderFeedbackStats(container, stats, maxStars) {
    const statsDiv = document.createElement('div');
    statsDiv.style.background = 'var(--bg-tertiary)';
    statsDiv.style.borderRadius = 'var(--radius-md)';
    statsDiv.style.padding = '20px';
    statsDiv.style.marginBottom = '24px';
    
    const avgDiv = document.createElement('div');
    avgDiv.style.textAlign = 'center';
    avgDiv.style.marginBottom = '20px';
    
    const avgRating = document.createElement('div');
    avgRating.style.fontSize = '48px';
    avgRating.style.fontWeight = '700';
    avgRating.style.color = 'var(--warning)';
    avgRating.textContent = stats.average;
    
    const starsDiv = document.createElement('div');
    starsDiv.style.fontSize = '24px';
    starsDiv.style.marginTop = '8px';
    for (let i = 1; i <= maxStars; i++) {
        const star = document.createElement('i');
        star.className = i <= Math.round(stats.average) ? 'fas fa-star' : 'far fa-star';
        star.style.color = 'var(--warning)';
        star.style.marginRight = '4px';
        starsDiv.appendChild(star);
    }
    
    const totalText = document.createElement('div');
    totalText.style.marginTop = '8px';
    totalText.style.color = 'var(--text-muted)';
    totalText.textContent = `${stats.total} reviews`;
    
    avgDiv.appendChild(avgRating);
    avgDiv.appendChild(starsDiv);
    avgDiv.appendChild(totalText);
    statsDiv.appendChild(avgDiv);
    
    // Distribution bars
    for (let i = maxStars; i >= 1; i--) {
        const barDiv = document.createElement('div');
        barDiv.style.display = 'flex';
        barDiv.style.alignItems = 'center';
        barDiv.style.gap = '12px';
        barDiv.style.marginBottom = '8px';
        
        const label = document.createElement('span');
        label.style.minWidth = '60px';
        label.style.fontSize = '14px';
        label.textContent = `${i} Star${i > 1 ? 's' : ''}`;
        
        const barBg = document.createElement('div');
        barBg.style.flex = '1';
        barBg.style.height = '8px';
        barBg.style.background = 'var(--bg-primary)';
        barBg.style.borderRadius = '4px';
        barBg.style.overflow = 'hidden';
        
        const percentage = stats.total > 0 ? (stats.distribution[i] / stats.total) * 100 : 0;
        const barFill = document.createElement('div');
        barFill.style.width = `${percentage}%`;
        barFill.style.height = '100%';
        barFill.style.background = 'var(--warning)';
        barFill.style.transition = 'width 0.3s ease';
        
        barBg.appendChild(barFill);
        
        const count = document.createElement('span');
        count.style.minWidth = '40px';
        count.style.fontSize = '14px';
        count.style.textAlign = 'right';
        count.style.color = 'var(--text-muted)';
        count.textContent = stats.distribution[i];
        
        barDiv.appendChild(label);
        barDiv.appendChild(barBg);
        barDiv.appendChild(count);
        statsDiv.appendChild(barDiv);
    }
    
    container.appendChild(statsDiv);
}

function createFeedbackItem(feedback, maxStars) {
    const item = document.createElement('div');
    item.style.background = 'var(--bg-tertiary)';
    item.style.borderRadius = 'var(--radius-md)';
    item.style.padding = '16px';
    item.style.marginBottom = '12px';
    
    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.gap = '12px';
    header.style.marginBottom = '12px';
    
    const avatar = document.createElement('img');
    avatar.src = feedback.users?.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default';
    avatar.style.width = '40px';
    avatar.style.height = '40px';
    avatar.style.borderRadius = '50%';
    avatar.style.objectFit = 'cover';
    
    const userInfo = document.createElement('div');
    userInfo.style.flex = '1';
    
    const username = document.createElement('div');
    username.style.fontWeight = '600';
    username.textContent = feedback.users?.username || 'Anonymous';
    
    const stars = document.createElement('div');
    stars.style.marginTop = '4px';
    for (let i = 1; i <= maxStars; i++) {
        const star = document.createElement('i');
        star.className = i <= feedback.rating ? 'fas fa-star' : 'far fa-star';
        star.style.color = i <= feedback.rating ? 'var(--warning)' : 'var(--text-muted)';
        star.style.fontSize = '14px';
        star.style.marginRight = '2px';
        stars.appendChild(star);
    }
    
    userInfo.appendChild(username);
    userInfo.appendChild(stars);
    
    header.appendChild(avatar);
    header.appendChild(userInfo);
    
    if (feedback.message) {
        const message = document.createElement('p');
        message.style.color = 'var(--text-secondary)';
        message.style.fontSize = '14px';
        message.style.lineHeight = '1.6';
        message.textContent = feedback.message;
        item.appendChild(message);
    }
    
    const footer = document.createElement('div');
    footer.style.display = 'flex';
    footer.style.alignItems = 'center';
    footer.style.gap = '16px';
    footer.style.marginTop = '12px';
    footer.style.paddingTop = '12px';
    footer.style.borderTop = '1px solid var(--border-color)';
    footer.style.fontSize = '12px';
    footer.style.color = 'var(--text-muted)';
    
    const date = document.createElement('span');
    date.textContent = formatTimestamp(feedback.created_at);
    
    const likeBtn = document.createElement('button');
    likeBtn.innerHTML = `<i class="far fa-heart"></i> ${feedback.likes || 0}`;
    likeBtn.style.background = 'none';
    likeBtn.style.border = 'none';
    likeBtn.style.color = 'var(--text-muted)';
    likeBtn.style.cursor = 'pointer';
    likeBtn.style.fontSize = '12px';
    likeBtn.addEventListener('click', () => handleLikeFeedback(feedback.id));
    
    footer.appendChild(date);
    footer.appendChild(likeBtn);
    
    item.insertBefore(header, item.firstChild);
    item.appendChild(footer);
    
    return item;
}

async function handleLikeFeedback(feedbackId) {
    try {
        const { data, error } = await supabase
            .from('product_feedback')
            .select('likes, liked_by')
            .eq('id', feedbackId)
            .single();
        
        if (error) throw error;
        
        const likedBy = data.liked_by || [];
        
        if (likedBy.includes(currentUser.id)) {
            showToast('You already liked this feedback', 'info');
            return;
        }
        
        const { error: updateError } = await supabase
            .from('product_feedback')
            .update({
                likes: (data.likes || 0) + 1,
                liked_by: [...likedBy, currentUser.id]
            })
            .eq('id', feedbackId);
        
        if (updateError) throw updateError;
        
        showToast('Thank you for your feedback!', 'success');
        
    } catch (error) {
        console.error('Error liking feedback:', error);
    }
}

// ==================== BUY NOW PROCESS ====================
async function handleBuyNow() {
    if (!selectedProduct) {
        showToast('Please select a product', 'warning');
        return;
    }
    
    // Collect input table data
    const inputData = {};
    const inputs = document.querySelectorAll('.input-field input, .input-field textarea');
    let hasEmptyRequired = false;
    
    inputs.forEach(input => {
        const fieldName = input.dataset.fieldName;
        if (input.hasAttribute('required') && !input.value.trim()) {
            hasEmptyRequired = true;
        }
        inputData[fieldName] = input.value.trim();
    });
    
    if (hasEmptyRequired) {
        showToast('Please fill all required fields', 'warning');
        return;
    }
    
    // Show payment modal
    await showPaymentModal(selectedProduct, inputData);
}

async function showPaymentModal(product, inputData) {
    try {
        // Load payment methods
        const { data: paymentMethods, error } = await supabase
            .from('payment_methods')
            .select('*')
            .in('id', product.payment_method_ids || []);
        
        if (error) throw error;
        
        const finalPrice = product.discount_percentage && product.discount_percentage > 0
            ? calculateDiscountedPrice(product.price, product.discount_percentage)
            : product.price;
        
        const modal = document.createElement('div');
        modal.className = 'modal payment-modal active';
        modal.id = 'paymentModal';
        
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close-modal">&times;</span>
                <div class="payment-header">
                    <h2>Complete Payment</h2>
                    <p>Choose your payment method</p>
                </div>
                
                <div class="payment-summary">
                    <h3>Order Summary</h3>
                    <div class="summary-row">
                        <span>Product:</span>
                        <span>${product.name}</span>
                    </div>
                    ${product.discount_percentage ? `
                    <div class="summary-row">
                        <span>Original Price:</span>
                        <span>${formatCurrency(product.price)} Ks</span>
                    </div>
                    <div class="summary-row">
                        <span>Discount:</span>
                        <span style="color: var(--danger);">-${product.discount_percentage}%</span>
                    </div>
                    ` : ''}
                    <div class="summary-row total">
                        <span>Total:</span>
                        <span id="totalAmount">${formatCurrency(finalPrice)} Ks</span>
                    </div>
                </div>
                
                <div class="coupon-section">
                    <h3>Have a coupon?</h3>
                    <div class="coupon-input-wrapper">
                        <input type="text" class="coupon-input" id="couponInput" placeholder="Enter coupon code">
                        <button class="apply-coupon-btn" onclick="applyCoupon()">Apply</button>
                    </div>
                    <div id="couponSuccess"></div>
                </div>
                
                <div class="payment-methods">
                    <h3>Select Payment Method</h3>
                    <div class="payment-methods-grid" id="paymentMethodsGrid"></div>
                </div>
                
                <div id="paymentDetailsContainer"></div>
                
                <div class="proof-upload" id="proofUploadSection" style="display: none;">
                    <h4>Upload Payment Proof</h4>
                    <div class="file-upload-wrapper" id="fileUploadWrapper">
                        <input type="file" id="proofFile" accept="image/*">
                        <i class="fas fa-cloud-upload-alt upload-icon"></i>
                        <p class="upload-text">Click to upload screenshot</p>
                        <img class="preview-image" id="previewImage">
                    </div>
                </div>
                
                <button class="submit-order-btn" id="submitOrderBtn" onclick="submitOrder()" disabled>
                    Submit Order
                </button>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Render payment methods
        renderPaymentMethods(paymentMethods);
        
        // Setup file upload
        setupFileUpload();
        
        // Close modal handlers
        modal.querySelector('.close-modal').addEventListener('click', () => {
            modal.remove();
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
        
        // Store data for order submission
        window.currentOrderData = {
            product: product,
            inputData: inputData,
            finalPrice: finalPrice,
            selectedPayment: null,
            proofFile: null,
            appliedCoupon: null
        };
        
    } catch (error) {
        console.error('Error showing payment modal:', error);
        showToast('Failed to load payment methods', 'error');
    }
}

function renderPaymentMethods(methods) {
    const container = document.getElementById('paymentMethodsGrid');
    if (!container) return;
    
    container.innerHTML = '';
    
    methods.forEach(method => {
        const item = document.createElement('div');
        item.className = 'payment-method-item';
        item.dataset.methodId = method.id;
        
        const icon = document.createElement('img');
        icon.className = 'payment-method-icon';
        icon.src = method.icon_url;
        icon.alt = method.name;
        
        const name = document.createElement('div');
        name.className = 'payment-method-name';
        name.textContent = method.name;
        
        item.appendChild(icon);
        item.appendChild(name);
        
        item.addEventListener('click', () => {
            document.querySelectorAll('.payment-method-item').forEach(p => p.classList.remove('selected'));
            item.classList.add('selected');
            showPaymentDetails(method);
            window.currentOrderData.selectedPayment = method;
            checkSubmitButton();
        });
        
        container.appendChild(item);
    });
}

function showPaymentDetails(method) {
    const container = document.getElementById('paymentDetailsContainer');
    if (!container) return;
    
    container.innerHTML = `
        <div class="payment-details active">
            <h4>${method.name} Payment Details</h4>
            <div class="payment-info-row">
                <span class="payment-info-label">Account Name:</span>
                <span class="payment-info-value">
                    ${method.account_name}
                    <button class="copy-btn" onclick="copyToClipboard('${method.account_name}')">
                        <i class="fas fa-copy"></i>
                    </button>
                </span>
            </div>
            <div class="payment-info-row">
                <span class="payment-info-label">Account Number:</span>
                <span class="payment-info-value">
                    ${method.account_number}
                    <button class="copy-btn" onclick="copyToClipboard('${method.account_number}')">
                        <i class="fas fa-copy"></i>
                    </button>
                </span>
            </div>
            ${method.instructions ? `
            <div class="payment-instructions">
                <p>${method.instructions}</p>
            </div>
            ` : ''}
        </div>
    `;
    
    document.getElementById('proofUploadSection').style.display = 'block';
}

function setupFileUpload() {
    const fileInput = document.getElementById('proofFile');
    const wrapper = document.getElementById('fileUploadWrapper');
    const preview = document.getElementById('previewImage');
    
    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        if (!file.type.startsWith('image/')) {
            showToast('Please select an image file', 'error');
            return;
        }
        
        // Show preview
        const reader = new FileReader();
        reader.onload = (e) => {
            preview.src = e.target.result;
            wrapper.classList.add('has-file');
        };
        reader.readAsDataURL(file);
        
        window.currentOrderData.proofFile = file;
        checkSubmitButton();
    });
}

function checkSubmitButton() {
    const btn = document.getElementById('submitOrderBtn');
    if (!btn) return;
    
    const hasPayment = window.currentOrderData.selectedPayment !== null;
    const hasProof = window.currentOrderData.proofFile !== null;
    
    btn.disabled = !(hasPayment && hasProof);
}

async function applyCoupon() {
    const code = document.getElementById('couponInput').value.trim();
    if (!code) {
        showToast('Please enter coupon code', 'warning');
        return;
    }
    
    try {
        const { data, error } = await supabase
            .from('coupons')
            .select('*')
            .eq('code', code)
            .single();
        
        if (error || !data) {
            showToast('Invalid coupon code', 'error');
            return;
        }
        
        // Check if coupon is valid for this user
        if (data.user_ids && data.user_ids.length > 0) {
            if (!data.user_ids.includes(currentUser.id)) {
                showToast('This coupon is not valid for your account', 'error');
                return;
            }
        }
        
        // Check if coupon is valid for this product
        if (data.product_ids && data.product_ids.length > 0) {
            if (!data.product_ids.includes(selectedProduct.id)) {
                showToast('This coupon is not valid for this product', 'error');
                return;
            }
        }
        
        // Check if already used
        if (data.used_by && data.used_by.includes(currentUser.id)) {
            showToast('You have already used this coupon', 'error');
            return;
        }
        
        // Apply discount
        const currentPrice = window.currentOrderData.finalPrice;
        const discountAmount = (currentPrice * data.discount_percentage) / 100;
        const newPrice = currentPrice - discountAmount;
        
        window.currentOrderData.finalPrice = newPrice;
        window.currentOrderData.appliedCoupon = data;
        
        document.getElementById('totalAmount').textContent = `${formatCurrency(newPrice)} Ks`;
        
        document.getElementById('couponSuccess').innerHTML = `
            <div class="coupon-success">
                <i class="fas fa-check-circle"></i>
                <div class="coupon-success-text">
                    <h5>Coupon Applied!</h5>
                    <p>You saved ${formatCurrency(discountAmount)} Ks (${data.discount_percentage}%)</p>
                </div>
            </div>
        `;
        
        showToast('Coupon applied successfully!', 'success');
        
    } catch (error) {
        console.error('Error applying coupon:', error);
        showToast('Failed to apply coupon', 'error');
    }
}

// ==================== ORDER SUBMISSION ====================
async function submitOrder() {
    if (!window.currentOrderData || !window.currentOrderData.selectedPayment || !window.currentOrderData.proofFile) {
        showToast('Please complete all required fields', 'warning');
        return;
    }
    
    const btn = document.getElementById('submitOrderBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    
    showLoading();
    
    try {
        // Upload proof image
        const proofFile = window.currentOrderData.proofFile;
        const fileExt = proofFile.name.split('.').pop();
        const fileName = `${currentUser.id}_${Date.now()}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('payment-proofs')
            .upload(fileName, proofFile);
        
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
            .from('payment-proofs')
            .getPublicUrl(fileName);
        
        // Generate order ID
        const now = new Date();
        const orderId = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
        
        // Create order
        const orderData = {
            order_id: orderId,
            user_id: currentUser.id,
            product_id: window.currentOrderData.product.id,
            category_card_id: currentCategoryCard.id,
            product_name: window.currentOrderData.product.name,
            product_icon: window.currentOrderData.product.icon_url,
            amount: window.currentOrderData.product.amount,
            original_price: window.currentOrderData.product.price,
            discount_percentage: window.currentOrderData.product.discount_percentage || 0,
            final_price: window.currentOrderData.finalPrice,
            payment_method_id: window.currentOrderData.selectedPayment.id,
            payment_method_name: window.currentOrderData.selectedPayment.name,
            payment_method_icon: window.currentOrderData.selectedPayment.icon_url,
            payment_proof_url: publicUrl,
            input_data: window.currentOrderData.inputData,
            coupon_code: window.currentOrderData.appliedCoupon?.code || null,
            coupon_discount: window.currentOrderData.appliedCoupon?.discount_percentage || 0,
            status: 'pending',
            created_at: now.toISOString()
        };
        
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert([orderData])
            .select()
            .single();
        
        if (orderError) throw orderError;
        
        // Update coupon if used
        if (window.currentOrderData.appliedCoupon) {
            const usedBy = window.currentOrderData.appliedCoupon.used_by || [];
            await supabase
                .from('coupons')
                .update({
                    used_by: [...usedBy, currentUser.id],
                    usage_count: (window.currentOrderData.appliedCoupon.usage_count || 0) + 1
                })
                .eq('id', window.currentOrderData.appliedCoupon.id);
        }
        
        // Update user total orders
        await supabase
            .from('users')
            .update({ total_orders: (currentUser.total_orders || 0) + 1 })
            .eq('id', currentUser.id);
        
        currentUser.total_orders = (currentUser.total_orders || 0) + 1;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        
        hideLoading();
        
        // Close modal
        document.getElementById('paymentModal')?.remove();
        
        showToast('Order submitted successfully!', 'success');
        
        // Navigate to order history
        setTimeout(() => {
            navigateTo('orderHistory');
        }, 1500);
        
    } catch (error) {
        console.error('Error submitting order:', error);
        showToast('Failed to submit order', 'error');
        hideLoading();
        
        btn.disabled = false;
        btn.innerHTML = 'Submit Order';
    }
}

// ==================== LOAD USER ORDERS ====================
async function loadUserOrders() {
    try {
        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        orders = data || [];
        renderOrders();
        
    } catch (error) {
        console.error('Error loading orders:', error);
    }
}

function renderOrders() {
    const container = document.getElementById('orderHistoryContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (orders.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 60px 20px; color: var(--text-muted);">
                <i class="fas fa-shopping-bag" style="font-size: 64px; margin-bottom: 20px; opacity: 0.3;"></i>
                <h3>No orders yet</h3>
                <p>Start shopping to see your orders here</p>
            </div>
        `;
        return;
    }
    
    orders.forEach(order => {
        const orderEl = createOrderItem(order);
        container.appendChild(orderEl);
    });
}

function createOrderItem(order) {
    const item = document.createElement('div');
    item.className = 'order-item';
    item.dataset.orderId = order.id;
    
    const header = document.createElement('div');
    header.className = 'order-header';
    
    const orderId = document.createElement('div');
    orderId.className = 'order-id';
    orderId.innerHTML = `<i class="fas fa-hashtag"></i> ${order.order_id}`;
    
    const status = document.createElement('div');
    status.className = `order-status ${order.status}`;
    status.textContent = order.status === 'pending' ? 'Pending' : 
                         order.status === 'approved' ? 'Approved' : 'Rejected';
    
    header.appendChild(orderId);
    header.appendChild(status);
    
    const info = document.createElement('div');
    info.className = 'order-info';
    
    const icon = document.createElement('img');
    icon.className = 'order-product-icon';
    icon.src = order.product_icon;
    icon.alt = order.product_name;
    
    const details = document.createElement('div');
    details.className = 'order-details';
    
    const productName = document.createElement('div');
    productName.className = 'order-product-name';
    productName.textContent = order.product_name;
    
    const productInfo = document.createElement('div');
    productInfo.className = 'order-product-info';
    productInfo.textContent = order.amount || '';
    
    const payment = document.createElement('div');
    payment.className = 'order-payment';
    
    const paymentIcon = document.createElement('img');
    paymentIcon.className = 'order-payment-icon';
    paymentIcon.src = order.payment_method_icon;
    
    const price = document.createElement('span');
    price.className = 'order-price';
    price.textContent = `${formatCurrency(order.final_price)} Ks`;
    
    payment.appendChild(paymentIcon);
    payment.appendChild(price);
    
    details.appendChild(productName);
    details.appendChild(productInfo);
    details.appendChild(payment);
    
    info.appendChild(icon);
    info.appendChild(details);
    
    const footer = document.createElement('div');
    footer.className = 'order-footer';
    
    const date = document.createElement('div');
    date.className = 'order-date';
    date.innerHTML = `<i class="fas fa-clock"></i> ${formatTimestamp(order.created_at)}`;
    
    const actions = document.createElement('div');
    actions.className = 'order-actions';
    
    const viewBtn = document.createElement('button');
    viewBtn.className = 'order-action-btn';
    viewBtn.innerHTML = '<i class="fas fa-eye"></i> View';
    viewBtn.addEventListener('click', () => viewOrderDetails(order));
    
    actions.appendChild(viewBtn);
    
    if (order.status === 'approved') {
        const downloadBtn = document.createElement('button');
        downloadBtn.className = 'order-action-btn download';
        downloadBtn.innerHTML = '<i class="fas fa-download"></i> Download';
        downloadBtn.addEventListener('click', () => downloadOrderPDF(order));
        actions.appendChild(downloadBtn);
        
        // Feedback section
        const feedbackDiv = document.createElement('div');
        feedbackDiv.className = 'order-feedback';
        
        if (!order.feedback_rating) {
            const feedbackStars = document.createElement('div');
            feedbackStars.className = 'feedback-stars';
            
            for (let i = 1; i <= 5; i++) {
                const star = document.createElement('i');
                star.className = 'fas fa-star star-btn';
                star.dataset.rating = i;
                star.addEventListener('click', () => submitFeedback(order, i));
                feedbackStars.appendChild(star);
            }
            
            feedbackDiv.appendChild(feedbackStars);
            
            const feedbackLabel = document.createElement('p');
            feedbackLabel.style.fontSize = '12px';
            feedbackLabel.style.color = 'var(--text-muted)';
            feedbackLabel.style.marginTop = '8px';
            feedbackLabel.textContent = 'Rate your experience';
            feedbackDiv.appendChild(feedbackLabel);
        } else {
            const ratingDisplay = document.createElement('div');
            ratingDisplay.className = 'user-rating-display';
            
            for (let i = 1; i <= 5; i++) {
                const star = document.createElement('i');
                star.className = i <= order.feedback_rating ? 'fas fa-star filled' : 'far fa-star';
                ratingDisplay.appendChild(star);
            }
            
            feedbackDiv.appendChild(ratingDisplay);
        }
        
        info.appendChild(feedbackDiv);
        
        // Admin message
        if (order.admin_message) {
            const adminMsg = document.createElement('div');
            adminMsg.className = 'admin-message';
            adminMsg.innerHTML = `
                <h5><i class="fas fa-comment-dots"></i> Message from Admin</h5>
                <p>${order.admin_message}</p>
            `;
            info.appendChild(adminMsg);
        }
    }
    
    footer.appendChild(date);
    footer.appendChild(actions);
    
    item.appendChild(header);
    item.appendChild(info);
    item.appendChild(footer);
    
    return item;
}

function viewOrderDetails(order) {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close-modal">&times;</span>
            <div style="padding: 20px;">
                <h2 style="margin-bottom: 24px;">Order Details</h2>
                
                <div class="product-detail-row">
                    <span class="product-detail-label">Order ID:</span>
                    <span class="product-detail-value">${order.order_id}</span>
                </div>
                
                <div class="product-detail-row">
                    <span class="product-detail-label">Product:</span>
                    <span class="product-detail-value">${order.product_name}</span>
                </div>
                
                <div class="product-detail-row">
                    <span class="product-detail-label">Amount:</span>
                    <span class="product-detail-value">${order.amount || 'N/A'}</span>
                </div>
                
                <div class="product-detail-row">
                    <span class="product-detail-label">Original Price:</span>
                    <span class="product-detail-value">${formatCurrency(order.original_price)} Ks</span>
                </div>
                
                ${order.discount_percentage > 0 ? `
                <div class="product-detail-row">
                    <span class="product-detail-label">Discount:</span>
                    <span class="product-detail-value" style="color: var(--danger);">-${order.discount_percentage}%</span>
                </div>
                ` : ''}
                
                ${order.coupon_code ? `
                <div class="product-detail-row">
                    <span class="product-detail-label">Coupon:</span>
                    <span class="product-detail-value">${order.coupon_code} (-${order.coupon_discount}%)</span>
                </div>
                ` : ''}
                
                <div class="product-detail-row">
                    <span class="product-detail-label">Final Price:</span>
                    <span class="product-detail-value" style="color: var(--success); font-size: 18px;">${formatCurrency(order.final_price)} Ks</span>
                </div>
                
                <div class="product-detail-row">
                    <span class="product-detail-label">Payment Method:</span>
                    <span class="product-detail-value">${order.payment_method_name}</span>
                </div>
                
                <div class="product-detail-row">
                    <span class="product-detail-label">Status:</span>
                    <span class="product-detail-value">
                        <span class="order-status ${order.status}">${order.status.toUpperCase()}</span>
                    </span>
                </div>
                
                <div class="product-detail-row">
                    <span class="product-detail-label">Order Date:</span>
                    <span class="product-detail-value">${new Date(order.created_at).toLocaleString()}</span>
                </div>
                
                ${order.approved_at ? `
                <div class="product-detail-row">
                    <span class="product-detail-label">Approved Date:</span>
                    <span class="product-detail-value">${new Date(order.approved_at).toLocaleString()}</span>
                </div>
                ` : ''}
                
                ${order.payment_proof_url ? `
                <div style="margin-top: 24px;">
                    <h4 style="margin-bottom: 12px;">Payment Proof:</h4>
                    <img src="${order.payment_proof_url}" style="width: 100%; max-width: 400px; border-radius: 12px;">
                </div>
                ` : ''}
                
                ${order.input_data && Object.keys(order.input_data).length > 0 ? `
                <div style="margin-top: 24px;">
                    <h4 style="margin-bottom: 12px;">Additional Information:</h4>
                    ${Object.entries(order.input_data).map(([key, value]) => `
                        <div class="product-detail-row">
                            <span class="product-detail-label">${key}:</span>
                            <span class="product-detail-value">${value}</span>
                        </div>
                    `).join('')}
                </div>
                ` : ''}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.querySelector('.close-modal').addEventListener('click', () => {
        modal.remove();
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

async function submitFeedback(order, rating) {
    try {
        // Prompt for message
        const message = prompt('Share your experience (optional):');
        
        const { error: feedbackError } = await supabase
            .from('product_feedback')
            .insert([{
                user_id: currentUser.id,
                category_card_id: order.category_card_id,
                product_id: order.product_id,
                order_id: order.id,
                rating: rating,
                message: message || null,
                created_at: new Date().toISOString()
            }]);
        
        if (feedbackError) throw feedbackError;
        
        // Update order
        const { error: updateError } = await supabase
            .from('orders')
            .update({ feedback_rating: rating })
            .eq('id', order.id);
        
        if (updateError) throw updateError;
        
        // Update category card rating
        await updateCategoryRating(order.category_card_id);
        
        showToast('Thank you for your feedback!', 'success');
        loadUserOrders();
        
    } catch (error) {
        console.error('Error submitting feedback:', error);
        showToast('Failed to submit feedback', 'error');
    }
}

async function updateCategoryRating(categoryCardId) {
    try {
        const { data, error } = await supabase
            .from('product_feedback')
            .select('rating')
            .eq('category_card_id', categoryCardId);
        
        if (error) throw error;
        
        if (data && data.length > 0) {
            const totalRating = data.reduce((sum, f) => sum + f.rating, 0);
            const avgRating = (totalRating / data.length).toFixed(1);
            
            await supabase
                .from('category_cards')
                .update({ rating: parseFloat(avgRating) })
                .eq('id', categoryCardId);
        }
    } catch (error) {
        console.error('Error updating rating:', error);
    }
}

async function downloadOrderPDF(order) {
    try {
        showLoading();
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Load website settings for branding
        const logoUrl = websiteSettings?.logo_url || '';
        const websiteName = websiteSettings?.website_name || 'Store';
        
        let yPos = 20;
        
        // Header with logo
        if (logoUrl) {
            try {
                const imgData = await loadImageAsBase64(logoUrl);
                doc.addImage(imgData, 'PNG', 15, yPos, 30, 30);
            } catch (e) {
                console.log('Could not load logo');
            }
        }
        
        doc.setFontSize(20);
        doc.setFont(undefined, 'bold');
        doc.text(websiteName, 50, yPos + 15);
        
        yPos += 40;
        
        // Order title
        doc.setFontSize(16);
        doc.text('Order Receipt', 15, yPos);
        
        yPos += 15;
        
        // Order details
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        
        const details = [
            ['Order ID:', order.order_id],
            ['Product:', order.product_name],
            ['Amount:', order.amount || 'N/A'],
            ['Original Price:', `${formatCurrency(order.original_price)} Ks`],
        ];
        
        if (order.discount_percentage > 0) {
            details.push(['Discount:', `-${order.discount_percentage}%`]);
        }
        
        if (order.coupon_code) {
            details.push(['Coupon:', `${order.coupon_code} (-${order.coupon_discount}%)`]);
        }
        
        details.push(['Final Price:', `${formatCurrency(order.final_price)} Ks`]);
        details.push(['Payment Method:', order.payment_method_name]);
        details.push(['Status:', order.status.toUpperCase()]);
        details.push(['Order Date:', new Date(order.created_at).toLocaleString()]);
        
        if (order.approved_at) {
            details.push(['Approved Date:', new Date(order.approved_at).toLocaleString()]);
        }
        
        details.forEach(([label, value]) => {
            doc.setFont(undefined, 'bold');
            doc.text(label, 15, yPos);
            doc.setFont(undefined, 'normal');
            doc.text(value, 70, yPos);
            yPos += 8;
        });
        
        // Footer
        yPos += 10;
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text('Thank you for your order!', 15, yPos);
        doc.text(`Generated on ${new Date().toLocaleString()}`, 15, yPos + 5);
        
        // Save with optimized settings
        doc.save(`order_${order.order_id}.pdf`, { compress: true });
        
        hideLoading();
        showToast('Order receipt downloaded!', 'success');
        
        // Auto download setting
        if (currentUser.settings?.auto_download) {
            // Already downloaded
        }
        
    } catch (error) {
        console.error('Error generating PDF:', error);
        showToast('Failed to generate PDF', 'error');
        hideLoading();
    }
}

async function loadImageAsBase64(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = function() {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = reject;
        img.src = url;
    });
}

// ==================== NEWS ====================
async function loadNews() {
    try {
        const { data, error } = await supabase
            .from('news')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        renderNews(data || []);
        
    } catch (error) {
        console.error('Error loading news:', error);
    }
}

function renderNews(newsItems) {
    const container = document.getElementById('newsContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (newsItems.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 60px 20px; color: var(--text-muted);">No news available</div>';
        return;
    }
    
    newsItems.forEach(news => {
        const newsEl = createNewsItem(news);
        container.appendChild(newsEl);
    });
}

function createNewsItem(news) {
    const item = document.createElement('div');
    item.className = 'news-item';
    
    // Images section
    if (news.images && news.images.length > 0) {
        const imagesDiv = document.createElement('div');
        imagesDiv.className = 'news-images';
        
        news.images.forEach((imgUrl, index) => {
            const img = document.createElement('img');
            img.className = 'news-image-slide';
            if (index === 0) img.classList.add('active');
            img.src = imgUrl;
            imagesDiv.appendChild(img);
        });
        
        item.appendChild(imagesDiv);
        
        if (news.images.length > 1) {
            let currentIndex = 0;
            setInterval(() => {
                const images = imagesDiv.querySelectorAll('.news-image-slide');
                images[currentIndex].classList.remove('active');
                currentIndex = (currentIndex + 1) % images.length;
                images[currentIndex].classList.add('active');
            }, 3000);
        }
    }
    
    const content = document.createElement('div');
    content.className = 'news-content';
    
    const title = document.createElement('h3');
    title.className = 'news-title';
    title.textContent = news.title;
    
    const description = document.createElement('div');
    description.className = 'news-description';
    description.innerHTML = parseContentWithImages(news.description);
    
    const meta = document.createElement('div');
    meta.className = 'news-meta';
    meta.innerHTML = `
        <div class="news-date">
            <i class="fas fa-calendar"></i>
            <span>${formatTimestamp(news.created_at)}</span>
        </div>
    `;
    
    content.appendChild(title);
    content.appendChild(description);
    content.appendChild(meta);
    
    // Contacts
    if (news.contact_ids && news.contact_ids.length > 0) {
        loadNewsContacts(content, news.contact_ids);
    }
    
    // Payment methods
    if (news.payment_method_ids && news.payment_method_ids.length > 0) {
        loadNewsPayments(content, news.payment_method_ids);
    }
    
    // YouTube video
    if (news.youtube_url) {
        const videoDiv = document.createElement('div');
        videoDiv.className = 'news-video';
        
        let videoId = '';
        if (news.youtube_url.includes('youtube.com/shorts/')) {
            videoId = news.youtube_url.split('shorts/')[1].split('?')[0];
        } else if (news.youtube_url.includes('youtube.com/watch?v=')) {
            videoId = news.youtube_url.split('v=')[1].split('&')[0];
        } else if (news.youtube_url.includes('youtu.be/')) {
            videoId = news.youtube_url.split('youtu.be/')[1].split('?')[0];
        }
        
        if (videoId) {
            const iframe = document.createElement('iframe');
            iframe.src = `https://www.youtube.com/embed/${videoId}`;
            iframe.setAttribute('allowfullscreen', '');
            videoDiv.appendChild(iframe);
            content.appendChild(videoDiv);
        }
    }
    
    item.appendChild(content);
    
    return item;
}

async function loadNewsContacts(container, contactIds) {
    try {
        const { data, error } = await supabase
            .from('contacts')
            .select('*')
            .in('id', contactIds);
        
        if (error) throw error;
        
        if (data && data.length > 0) {
            const contactsDiv = document.createElement('div');
            contactsDiv.className = 'news-contacts';
            
            data.forEach(contact => {
                const btn = document.createElement('a');
                btn.className = 'news-contact-btn';
                btn.href = contact.link_url;
                btn.target = '_blank';
                
                const icon = document.createElement('img');
                icon.className = 'news-contact-icon';
                icon.src = contact.icon_url;
                
                btn.appendChild(icon);
                btn.innerHTML += contact.name;
                
                contactsDiv.appendChild(btn);
            });
            
            container.appendChild(contactsDiv);
        }
    } catch (error) {
        console.error('Error loading news contacts:', error);
    }
}

async function loadNewsPayments(container, paymentIds) {
    try {
        const { data, error } = await supabase
            .from('payment_methods')
            .select('*')
            .in('id', paymentIds);
        
        if (error) throw error;
        
        if (data && data.length > 0) {
            const paymentsDiv = document.createElement('div');
            paymentsDiv.className = 'news-payments';
            
            data.forEach(payment => {
                const item = document.createElement('div');
                item.className = 'news-payment-item';
                
                const icon = document.createElement('img');
                icon.className = 'news-payment-icon';
                icon.src = payment.icon_url;
                
                item.appendChild(icon);
                item.innerHTML += payment.name;
                
                paymentsDiv.appendChild(item);
            });
            
            container.appendChild(paymentsDiv);
        }
    } catch (error) {
        console.error('Error loading news payments:', error);
    }
}

// ==================== CONTACTS ====================
async function loadContacts() {
    try {
        const { data, error } = await supabase
            .from('contacts')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        renderContacts(data || []);
        
    } catch (error) {
        console.error('Error loading contacts:', error);
    }
}

function renderContacts(contactsList) {
    const container = document.getElementById('contactsContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (contactsList.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 60px 20px; color: var(--text-muted);">No contacts available</div>';
        return;
    }
    
    contactsList.forEach(contact => {
        const contactEl = createContactItem(contact);
        container.appendChild(contactEl);
    });
}

function createContactItem(contact) {
    const item = document.createElement('div');
    item.className = 'contact-item';
    
    const header = document.createElement('div');
    header.className = 'contact-header';
    
    const icon = document.createElement('img');
    icon.className = 'contact-icon';
    icon.src = contact.icon_url;
    
    const info = document.createElement('div');
    info.className = 'contact-info';
    
    const name = document.createElement('h3');
    name.textContent = contact.name;
    
    const desc = document.createElement('p');
    desc.textContent = contact.description || '';
    
    info.appendChild(name);
    info.appendChild(desc);
    
    header.appendChild(icon);
    header.appendChild(info);
    
    item.appendChild(header);
    
    if (contact.address) {
        const address = document.createElement('div');
        address.className = 'contact-address';
        address.textContent = contact.address;
        item.appendChild(address);
    }
    
    if (contact.link_url) {
        const linkBtn = document.createElement('a');
        linkBtn.className = 'contact-link-btn';
        linkBtn.href = contact.link_url;
        linkBtn.target = '_blank';
        linkBtn.innerHTML = '<i class="fas fa-external-link-alt"></i> Visit';
        item.appendChild(linkBtn);
    }
    
    return item;
}

// ==================== REALTIME SUBSCRIPTIONS ====================
function setupRealtimeSubscriptions() {
    // Subscribe to orders updates
    supabase
        .channel('orders-channel')
        .on('postgres_changes', 
            { 
                event: '*', 
                schema: 'public', 
                table: 'orders',
                filter: `user_id=eq.${currentUser.id}`
            }, 
            (payload) => {
                handleOrderUpdate(payload);
            }
        )
        .subscribe();
    
    // Subscribe to notifications
    supabase
        .channel('notifications-channel')
        .on('postgres_changes', 
            { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'notifications',
                filter: `user_id=eq.${currentUser.id}`
            }, 
            (payload) => {
                handleNewNotification(payload.new);
            }
        )
        .subscribe();
    
    // Subscribe to website settings changes
    supabase
        .channel('settings-channel')
        .on('postgres_changes', 
            { 
                event: 'UPDATE', 
                schema: 'public', 
                table: 'website_settings'
            }, 
            (payload) => {
                loadWebsiteSettings();
            }
        )
        .subscribe();
}

function handleOrderUpdate(payload) {
    const { eventType, new: newOrder, old: oldOrder } = payload;
    
    if (eventType === 'UPDATE') {
        // Check if order was approved or rejected
        if (newOrder.status !== oldOrder.status) {
            if (newOrder.status === 'approved') {
                showNotificationToast('Order Approved!', `Your order #${newOrder.order_id} has been approved`, 'success');
                
                // Auto download if enabled
                if (currentUser.settings?.auto_download) {
                    setTimeout(() => {
                        downloadOrderPDF(newOrder);
                    }, 2000);
                }
            } else if (newOrder.status === 'rejected') {
                showNotificationToast('Order Rejected', `Your order #${newOrder.order_id} was rejected`, 'error');
            }
            
            // Reload orders
            loadUserOrders();
        }
    }
}

function handleNewNotification(notification) {
    notifications.unshift(notification);
    updateNotificationBadge();
    renderNotifications();
    
    // Show SMS notification if enabled
    if (currentUser.settings?.sms_notifications !== false) {
        showSMSNotification(notification);
    }
}

function showSMSNotification(notification) {
    const smsDiv = document.createElement('div');
    smsDiv.style.position = 'fixed';
    smsDiv.style.top = '80px';
    smsDiv.style.right = '20px';
    smsDiv.style.background = 'var(--bg-secondary)';
    smsDiv.style.padding = '16px 20px';
    smsDiv.style.borderRadius = 'var(--radius-lg)';
    smsDiv.style.boxShadow = 'var(--shadow-lg)';
    smsDiv.style.zIndex = '9999';
    smsDiv.style.maxWidth = '320px';
    smsDiv.style.animation = 'slideInFromTop 0.4s ease-out';
    smsDiv.style.border = '2px solid var(--primary)';
    
    smsDiv.innerHTML = `
        <div style="display: flex; align-items: start; gap: 12px;">
            <i class="fas fa-bell" style="color: var(--primary); font-size: 20px; margin-top: 2px;"></i>
            <div style="flex: 1;">
                <h4 style="font-size: 14px; font-weight: 600; margin-bottom: 4px;">${notification.title}</h4>
                <p style="font-size: 13px; color: var(--text-secondary);">${notification.message}</p>
            </div>
            <button style="background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 18px;">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    document.body.appendChild(smsDiv);
    
    smsDiv.querySelector('button').addEventListener('click', () => {
        smsDiv.remove();
    });
    
    setTimeout(() => {
        smsDiv.style.animation = 'slideOutToTop 0.4s ease-out';
        setTimeout(() => smsDiv.remove(), 400);
    }, 5000);
}

const style = document.createElement('style');
style.textContent = `
    @keyframes slideInFromTop {
        from {
            transform: translateY(-100px);
            opacity: 0;
        }
        to {
            transform: translateY(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutToTop {
        from {
            transform: translateY(0);
            opacity: 1;
        }
        to {
            transform: translateY(-100px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

function showNotificationToast(title, message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    toast.innerHTML = `
        <strong>${title}</strong><br>
        <span style="font-size: 13px; opacity: 0.9;">${message}</span>
    `;
    toast.className = 'toast';
    
    if (type) {
        toast.classList.add(type);
    }
    
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 4000);
}

// ==================== CATEGORY CARD SALES UPDATE ====================
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

// ==================== IMAGE COMPRESSION ====================
async function compressImage(file, maxSizeMB = 0.1) {
    const options = {
        maxSizeMB: maxSizeMB,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        fileType: 'image/jpeg'
    };
    
    try {
        const compressedFile = await imageCompression(file, options);
        return compressedFile;
    } catch (error) {
        console.error('Error compressing image:', error);
        return file;
    }
}

// ==================== PROFANITY FILTER ====================
const profanityList = [
    'fuck', 'shit', 'ass', 'bitch', 'damn', 'hell', 'bastard', 'dick',
    'pussy', 'cock', 'cunt', 'whore', 'slut', 'fag', 'nigger', 'piss'
];

function containsProfanity(text) {
    const lowerText = text.toLowerCase();
    return profanityList.some(word => lowerText.includes(word));
}

// ==================== LOCAL STORAGE MANAGEMENT ====================
function clearOldCache() {
    const cacheKeys = ['categories', 'products', 'banners'];
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    
    cacheKeys.forEach(key => {
        const cached = localStorage.getItem(key);
        if (cached) {
            try {
                const { timestamp } = JSON.parse(cached);
                if (Date.now() - timestamp > maxAge) {
                    localStorage.removeItem(key);
                }
            } catch (e) {
                localStorage.removeItem(key);
            }
        }
    });
}

function cacheData(key, data) {
    const cacheObject = {
        data: data,
        timestamp: Date.now()
    };
    localStorage.setItem(key, JSON.stringify(cacheObject));
}

function getCachedData(key) {
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    
    try {
        const { data, timestamp } = JSON.parse(cached);
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours
        
        if (Date.now() - timestamp > maxAge) {
            localStorage.removeItem(key);
            return null;
        }
        
        return data;
    } catch (e) {
        localStorage.removeItem(key);
        return null;
    }
}

// ==================== ERROR HANDLING ====================
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    // Don't show error to user for minor issues
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    // Handle promise rejections
});

// ==================== SECURITY ====================
// Prevent XSS
function sanitizeHTML(html) {
    const div = document.createElement('div');
    div.textContent = html;
    return div.innerHTML;
}

// Prevent SQL injection (handled by Supabase)
function sanitizeInput(input) {
    return input.trim().replace(/[<>]/g, '');
}

// ==================== PERFORMANCE MONITORING ====================
function measurePerformance() {
    if (window.performance && window.performance.timing) {
        const timing = window.performance.timing;
        const loadTime = timing.loadEventEnd - timing.navigationStart;
        console.log('Page load time:', loadTime + 'ms');
    }
}

window.addEventListener('load', measurePerformance);

// ==================== SERVICE WORKER (PWA Support) ====================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // Service worker can be added for offline support
    });
}

// ==================== NETWORK STATUS ====================
window.addEventListener('online', () => {
    showToast('Connection restored', 'success');
    // Sync pending data
});

window.addEventListener('offline', () => {
    showToast('No internet connection', 'warning');
});

// ==================== COPY TO CLIPBOARD ====================
function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
            showToast('Copied to clipboard!', 'success');
        }).catch(err => {
            fallbackCopyToClipboard(text);
        });
    } else {
        fallbackCopyToClipboard(text);
    }
}

function fallbackCopyToClipboard(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
        document.execCommand('copy');
        showToast('Copied to clipboard!', 'success');
    } catch (err) {
        showToast('Failed to copy', 'error');
    }
    
    document.body.removeChild(textArea);
}

// ==================== INITIALIZE REALTIME ====================
if (currentUser) {
    setupRealtimeSubscriptions();
}

// Clear old cache on load
clearOldCache();

// ==================== LAZY LOADING IMAGES ====================
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

// ==================== BACK BUTTON NAVIGATION ====================
window.addEventListener('popstate', (event) => {
    if (currentPage === 'productDetail') {
        navigateTo('home');
    }
});

// ==================== PREVENT SCREENSHOT (Optional Security) ====================
// Uncomment if needed
// document.addEventListener('keyup', (e) => {
//     if (e.key == 'PrintScreen') {
//         navigator.clipboard.writeText('');
//         showToast('Screenshots are disabled', 'warning');
//     }
// });

console.log('🚀 Application loaded successfully!');
console.log('Version:', websiteSettings?.version || '1.0.0');
