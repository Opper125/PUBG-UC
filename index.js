// ========================================
// 2025 PREMIUM GAMING PLATFORM
// index.js - Core Functionality (Part 1/2)
// Line Count: ~2800
// ========================================

// ===== SUPABASE CONFIGURATION =====
const SUPABASE_URL = 'https://vqumonhyeekgltvercbw.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxdW1vbmh5ZWVrZ2x0dmVyY2J3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1NTgzMzAsImV4cCI6MjA3NzEzNDMzMH0._C5EiMWyNs65ymDuwle_8UEytEqhn2bwniNvC9G9j1I';

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ===== GLOBAL STATE =====
const state = {
    currentUser: null,
    currentPage: 'home',
    categories: [],
    products: [],
    orders: [],
    notifications: [],
    contacts: [],
    news: [],
    banners: [],
    secondaryBanners: [],
    paymentMethods: [],
    currentCategoryCard: null,
    inputTableData: {},
    selectedProducts: [],
    selectedPaymentMethod: null,
    musicTracks: [],
    currentTrack: null,
    musicPlaying: false,
    notificationsPanel: false,
    userMenuOpen: false
};

// ===== PROFANITY FILTER =====
const PROFANITY_LIST = [
    'fuck', 'shit', 'damn', 'bitch', 'ass', 'hell', 'crap',
    'dick', 'pussy', 'cock', 'bastard', 'slut', 'whore'
    // Add more as needed
];

function containsProfanity(text) {
    const lowerText = text.toLowerCase();
    return PROFANITY_LIST.some(word => lowerText.includes(word));
}

// ===== VALIDATORS =====
const validators = {
    username: (username) => {
        // English only, no profanity
        const englishOnly = /^[a-zA-Z0-9_]+$/;
        if (!englishOnly.test(username)) {
            return { valid: false, message: 'Username must contain only English letters, numbers, and underscores' };
        }
        if (containsProfanity(username)) {
            return { valid: false, message: 'Username contains inappropriate language' };
        }
        if (username.length < 3 || username.length > 20) {
            return { valid: false, message: 'Username must be 3-20 characters long' };
        }
        return { valid: true };
    },
    
    email: (email) => {
        // Must end with @gmail.com
        if (!email.endsWith('@gmail.com')) {
            return { valid: false, message: 'Only @gmail.com emails are allowed' };
        }
        const emailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
        if (!emailRegex.test(email)) {
            return { valid: false, message: 'Invalid email format' };
        }
        return { valid: true };
    },
    
    password: (password) => {
        // Must start with uppercase, min 8 chars, contain special chars
        if (password.length < 8) {
            return { valid: false, message: 'Password must be at least 8 characters' };
        }
        if (!/^[A-Z]/.test(password)) {
            return { valid: false, message: 'Password must start with an uppercase letter' };
        }
        if (!/[@#%*&®©]/.test(password)) {
            return { valid: false, message: 'Password must contain at least one special character (@#%*&®©)' };
        }
        return { valid: true };
    }
};

// ===== UTILITY FUNCTIONS =====
function showLoader() {
    document.querySelector('.global-loader')?.classList.remove('hidden');
}

function hideLoader() {
    document.querySelector('.global-loader')?.classList.add('hidden');
}

function showToast(title, message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = type === 'success' ? 'fas fa-check-circle' :
                 type === 'error' ? 'fas fa-exclamation-circle' :
                 type === 'warning' ? 'fas fa-exclamation-triangle' :
                 'fas fa-info-circle';
    
    toast.innerHTML = `
        <i class="toast-icon ${icon}"></i>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
        <i class="toast-close fas fa-times"></i>
    `;
    
    document.querySelector('.toast-container').appendChild(toast);
    
    toast.querySelector('.toast-close').addEventListener('click', () => {
        toast.remove();
    });
    
    setTimeout(() => {
        toast.remove();
    }, 5000);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}

// ===== AUTHENTICATION =====
async function handleLogin(email, password) {
    try {
        showLoader();
        
        // Validate inputs
        const emailValidation = validators.email(email);
        if (!emailValidation.valid) {
            showToast('Validation Error', emailValidation.message, 'error');
            return;
        }
        
        // Custom authentication (NOT Supabase Auth)
        const { data: users, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .eq('password', password)  // In production, use bcrypt
            .single();
        
        if (error || !users) {
            showToast('Login Failed', 'Invalid email or password', 'error');
            return;
        }
        
        // Set current user
        state.currentUser = users;
        localStorage.setItem('currentUser', JSON.stringify(users));
        
        // Close auth modal
        document.querySelector('.auth-modal').classList.remove('active');
        
        // Show success
        showToast('Welcome!', `Logged in as ${users.username}`, 'success');
        
        // Initialize app
        await initializeApp();
        
    } catch (error) {
        console.error('Login error:', error);
        showToast('Error', 'Login failed. Please try again.', 'error');
    } finally {
        hideLoader();
    }
}

async function handleRegister(username, email, password) {
    try {
        showLoader();
        
        // Validate all inputs
        const usernameValidation = validators.username(username);
        if (!usernameValidation.valid) {
            showToast('Validation Error', usernameValidation.message, 'error');
            return;
        }
        
        const emailValidation = validators.email(email);
        if (!emailValidation.valid) {
            showToast('Validation Error', emailValidation.message, 'error');
            return;
        }
        
        const passwordValidation = validators.password(password);
        if (!passwordValidation.valid) {
            showToast('Validation Error', passwordValidation.message, 'error');
            return;
        }
        
        // Check if username exists
        const { data: existingUsername } = await supabase
            .from('users')
            .select('id')
            .eq('username', username)
            .single();
        
        if (existingUsername) {
            showToast('Error', 'Username already taken', 'error');
            return;
        }
        
        // Check if email exists
        const { data: existingEmail } = await supabase
            .from('users')
            .select('id')
            .eq('email', email)
            .single();
        
        if (existingEmail) {
            showToast('Error', 'Email already registered', 'error');
            return;
        }
        
        // Create user
        const { data: newUser, error } = await supabase
            .from('users')
            .insert([{
                username,
                email,
                password,  // In production, use bcrypt
                avatar_url: `https://ui-avatars.com/api/?name=${username}&background=random`,
                created_at: new Date().toISOString()
            }])
            .select()
            .single();
        
        if (error) {
            showToast('Error', 'Registration failed', 'error');
            return;
        }
        
        // Auto login
        state.currentUser = newUser;
        localStorage.setItem('currentUser', JSON.stringify(newUser));
        
        // Close modal
        document.querySelector('.auth-modal').classList.remove('active');
        
        showToast('Success!', 'Account created successfully', 'success');
        
        await initializeApp();
        
    } catch (error) {
        console.error('Registration error:', error);
        showToast('Error', 'Registration failed. Please try again.', 'error');
    } finally {
        hideLoader();
    }
}

function handleLogout() {
    state.currentUser = null;
    localStorage.removeItem('currentUser');
    document.querySelector('.auth-modal').classList.add('active');
    showToast('Logged Out', 'You have been logged out', 'info');
}

// ===== SESSION MANAGEMENT =====
function checkSession() {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        state.currentUser = JSON.parse(savedUser);
        return true;
    }
    return false;
}

// ===== NAVIGATION =====
function navigateTo(pageName) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Show selected page
    document.getElementById(`${pageName}-page`)?.classList.add('active');
    
    // Update bottom nav
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[data-page="${pageName}"]`)?.classList.add('active');
    
    // Update state
    state.currentPage = pageName;
    
    // Load page data
    loadPageData(pageName);
}

async function loadPageData(pageName) {
    switch(pageName) {
        case 'home':
            await loadHomeData();
            break;
        case 'orders':
            await loadOrders();
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
}

// ===== HOME PAGE =====
async function loadHomeData() {
    try {
        showLoader();
        
        // Load banners
        await loadBanners();
        
        // Load categories
        await loadCategories();
        
    } catch (error) {
        console.error('Error loading home data:', error);
        showToast('Error', 'Failed to load data', 'error');
    } finally {
        hideLoader();
    }
}

async function loadBanners() {
    try {
        // Main banners
        const { data: mainBanners } = await supabase
            .from('banners')
            .select('*')
            .eq('type', 'main')
            .eq('is_active', true)
            .order('order_index');
        
        if (mainBanners && mainBanners.length > 0) {
            state.banners = mainBanners;
            renderMainBanners();
            startBannerSlider();
        }
        
        // Secondary banners
        const { data: secondaryBanners } = await supabase
            .from('banners')
            .select('*')
            .eq('type', 'secondary')
            .eq('is_active', true)
            .order('order_index');
        
        if (secondaryBanners && secondaryBanners.length > 0) {
            state.secondaryBanners = secondaryBanners;
            renderSecondaryBanners();
            startSecondaryBannerCarousel();
        }
        
    } catch (error) {
        console.error('Error loading banners:', error);
    }
}

function renderMainBanners() {
    const container = document.querySelector('.main-banner-slider');
    if (!container) return;
    
    container.innerHTML = state.banners.map((banner, index) => `
        <div class="banner-slide ${index === 0 ? 'active' : ''}">
            <img src="${banner.image_url}" alt="${banner.title || 'Banner'}">
        </div>
    `).join('');
}

let bannerInterval;
function startBannerSlider() {
    let currentIndex = 0;
    const slides = document.querySelectorAll('.banner-slide');
    
    if (slides.length <= 1) return;
    
    clearInterval(bannerInterval);
    bannerInterval = setInterval(() => {
        slides[currentIndex].classList.remove('active');
        currentIndex = (currentIndex + 1) % slides.length;
        slides[currentIndex].classList.add('active');
    }, 5000);  // 5 seconds as per requirements
}

function renderSecondaryBanners() {
    const container = document.querySelector('.secondary-banner-carousel');
    if (!container) return;
    
    container.innerHTML = state.secondaryBanners.map((banner, index) => `
        <div class="secondary-banner-item ${index === 0 ? 'active' : ''}">
            <img src="${banner.image_url}" alt="${banner.title || 'Banner'}">
        </div>
    `).join('');
}

function startSecondaryBannerCarousel() {
    // 3D carousel effect
    let currentIndex = 0;
    const items = document.querySelectorAll('.secondary-banner-item');
    
    if (items.length <= 1) return;
    
    setInterval(() => {
        items[currentIndex].classList.remove('active');
        currentIndex = (currentIndex + 1) % items.length;
        items[currentIndex].classList.add('active');
        
        // Apply 3D transform
        const carousel = document.querySelector('.secondary-banner-carousel');
        if (carousel) {
            carousel.style.transform = `translateX(-${currentIndex * 100}%)`;
        }
    }, 4000);
}

async function loadCategories() {
    try {
        const { data: categories } = await supabase
            .from('categories')
            .select('*')
            .eq('is_active', true)
            .order('order_index');
        
        if (categories) {
            state.categories = categories;
            
            // Load category cards for each category
            for (const category of categories) {
                const { data: cards } = await supabase
                    .from('category_cards')
                    .select('*')
                    .eq('category_id', category.id)
                    .eq('is_active', true)
                    .order('order_index');
                
                category.cards = cards || [];
            }
            
            renderCategories();
        }
        
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

function renderCategories() {
    const container = document.querySelector('.categories-grid');
    if (!container) return;
    
    container.innerHTML = state.categories.map(category => 
        category.cards.map(card => `
            <div class="category-card" data-card-id="${card.id}">
                ${card.flag_color ? `<div class="category-flag" style="background: ${card.flag_color};"></div>` : ''}
                <div class="category-header">
                    <div class="category-icon">${card.icon || '🎮'}</div>
                </div>
                <h3 class="category-name">${card.name}</h3>
                <p class="category-description">${card.description || ''}</p>
                ${card.discount_percent > 0 ? `
                    <div class="discount-badge">-${card.discount_percent}%</div>
                ` : ''}
                <div class="category-stats">
                    <div class="stat-item">
                        <i class="fas fa-star"></i>
                        <span>${card.rating || 'N/A'}</span>
                    </div>
                    <div class="stat-item">
                        <i class="fas fa-shopping-cart"></i>
                        <span>${card.sales_count || 0} sales</span>
                    </div>
                </div>
            </div>
        `).join('')
    ).join('');
    
    // Add click handlers
    document.querySelectorAll('.category-card').forEach(card => {
        card.addEventListener('click', () => {
            const cardId = parseInt(card.dataset.cardId);
            handleCategoryCardClick(cardId);
        });
    });
}

function handleCategoryCardClick(cardId) {
    // Find the card
    let selectedCard = null;
    for (const category of state.categories) {
        const card = category.cards.find(c => c.id === cardId);
        if (card) {
            selectedCard = card;
            break;
        }
    }
    
    if (!selectedCard) return;
    
    state.currentCategoryCard = selectedCard;
    
    // Navigate to products page
    loadProductsPage(selectedCard);
}

// ===== INITIALIZATION =====
async function initializeApp() {
    try {
        showLoader();
        
        // Load initial data
        await loadHomeData();
        
        // Load music tracks
        await loadMusicTracks();
        
        // Load notifications
        await loadNotifications();
        
        // Setup event listeners
        setupEventListeners();
        
        // Start music if auto-play enabled
        const musicEnabled = localStorage.getItem('musicEnabled') !== 'false';
        if (musicEnabled && state.musicTracks.length > 0) {
            playMusic(state.musicTracks[0]);
        }
        
    } catch (error) {
        console.error('Initialization error:', error);
        showToast('Error', 'Failed to initialize app', 'error');
    } finally {
        hideLoader();
    }
}

// ===== EVENT LISTENERS =====
function setupEventListeners() {
    // Auth form submissions
    document.getElementById('login-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = e.target.querySelector('[name="email"]').value;
        const password = e.target.querySelector('[name="password"]').value;
        handleLogin(email, password);
    });
    
    document.getElementById('register-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = e.target.querySelector('[name="username"]').value;
        const email = e.target.querySelector('[name="email"]').value;
        const password = e.target.querySelector('[name="password"]').value;
        handleRegister(username, email, password);
    });
    
    // Auth tabs
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const formType = tab.dataset.form;
            document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(`${formType}-form`).classList.add('active');
        });
    });
    
    // Bottom navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const page = item.dataset.page;
            navigateTo(page);
        });
    });
    
    // Notifications toggle
    document.getElementById('notifications-btn')?.addEventListener('click', () => {
        toggleNotifications();
    });
    
    // User menu toggle
    document.querySelector('.user-avatar')?.addEventListener('click', () => {
        toggleUserMenu();
    });
    
    // Music toggle
    document.getElementById('music-toggle')?.addEventListener('click', () => {
        toggleMusic();
    });
    
    // Logout
    document.getElementById('logout-btn')?.addEventListener('click', () => {
        handleLogout();
    });
}

// ===== MUSIC PLAYER =====
async function loadMusicTracks() {
    try {
        const { data: tracks } = await supabase
            .from('music_tracks')
            .select('*')
            .eq('is_active', true)
            .order('order_index');
        
        if (tracks) {
            state.musicTracks = tracks;
        }
    } catch (error) {
        console.error('Error loading music:', error);
    }
}

function playMusic(track) {
    // Music player implementation
    state.currentTrack = track;
    state.musicPlaying = true;
    
    const audio = document.getElementById('audio-player');
    if (audio) {
        audio.src = track.file_url;
        audio.play();
    }
    
    updateMusicPlayer();
}

function toggleMusic() {
    if (state.musicPlaying) {
        pauseMusic();
    } else if (state.currentTrack) {
        resumeMusic();
    } else if (state.musicTracks.length > 0) {
        playMusic(state.musicTracks[0]);
    }
}

function pauseMusic() {
    state.musicPlaying = false;
    const audio = document.getElementById('audio-player');
    if (audio) audio.pause();
    updateMusicPlayer();
}

function resumeMusic() {
    state.musicPlaying = true;
    const audio = document.getElementById('audio-player');
    if (audio) audio.play();
    updateMusicPlayer();
}

function updateMusicPlayer() {
    const player = document.querySelector('.music-player');
    if (!player) return;
    
    if (state.musicPlaying) {
        player.classList.add('playing');
    } else {
        player.classList.remove('playing');
    }
}

// ===== NOTIFICATIONS =====
async function loadNotifications() {
    try {
        const { data: notifications } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', state.currentUser.id)
            .order('created_at', { ascending: false })
            .limit(20);
        
        if (notifications) {
            state.notifications = notifications;
            renderNotifications();
            updateNotificationBadge();
        }
    } catch (error) {
        console.error('Error loading notifications:', error);
    }
}

function renderNotifications() {
    const container = document.querySelector('.notification-list');
    if (!container) return;
    
    if (state.notifications.length === 0) {
        container.innerHTML = '<div class="notification-empty">No notifications</div>';
        return;
    }
    
    container.innerHTML = state.notifications.map(notif => `
        <div class="notification-item ${notif.is_read ? '' : 'unread'}" data-id="${notif.id}">
            <div class="notification-content">${notif.message}</div>
            <div class="notification-time">${formatDate(notif.created_at)}</div>
        </div>
    `).join('');
    
    // Add click handlers
    document.querySelectorAll('.notification-item').forEach(item => {
        item.addEventListener('click', () => {
            markNotificationAsRead(parseInt(item.dataset.id));
        });
    });
}

async function markNotificationAsRead(id) {
    try {
        await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', id);
        
        const notif = state.notifications.find(n => n.id === id);
        if (notif) notif.is_read = true;
        
        renderNotifications();
        updateNotificationBadge();
    } catch (error) {
        console.error('Error marking notification as read:', error);
    }
}

function updateNotificationBadge() {
    const badge = document.querySelector('.icon-btn .badge');
    const unreadCount = state.notifications.filter(n => !n.is_read).length;
    
    if (badge) {
        badge.textContent = unreadCount;
        badge.style.display = unreadCount > 0 ? 'flex' : 'none';
    }
}

function toggleNotifications() {
    const panel = document.querySelector('.notification-panel');
    if (!panel) return;
    
    state.notificationsPanel = !state.notificationsPanel;
    panel.classList.toggle('active');
    
    if (state.userMenuOpen) {
        toggleUserMenu();
    }
}

function toggleUserMenu() {
    const menu = document.querySelector('.user-menu');
    if (!menu) return;
    
    state.userMenuOpen = !state.userMenuOpen;
    menu.classList.toggle('active');
    
    if (state.notificationsPanel) {
        toggleNotifications();
    }
}

// ===== APP START =====
document.addEventListener('DOMContentLoaded', () => {
    // Check session
    if (checkSession()) {
        initializeApp();
    } else {
        hideLoader();
        document.querySelector('.auth-modal')?.classList.add('active');
    }
});

// Export functions for use in index1.js
window.platformCore = {
    state,
    supabase,
    validators,
    showToast,
    formatDate,
    formatCurrency,
    showLoader,
    hideLoader,
    navigateTo
};

console.log('✓ index.js loaded - Core functionality ready');


// ===== CONTACTS PAGE =====
async function loadContacts() {
    try {
        showLoader();
        
        const { data: contacts } = await supabase
            .from('contacts')
            .select('*')
            .eq('is_active', true)
            .order('order_index');
        
        if (contacts) {
            state.contacts = contacts;
            renderContacts();
        }
        
    } catch (error) {
        console.error('Error loading contacts:', error);
        showToast('Error', 'Failed to load contacts', 'error');
    } finally {
        hideLoader();
    }
}

function renderContacts() {
    const container = document.querySelector('.contacts-grid');
    if (!container) return;
    
    if (state.contacts.length === 0) {
        container.innerHTML = '<div class="empty-state">No contacts available</div>';
        return;
    }
    
    container.innerHTML = state.contacts.map(contact => `
        <div class="contact-card">
            <div class="contact-icon">${contact.icon || '📱'}</div>
            <h3 class="contact-name">${contact.name}</h3>
            <p class="contact-type">${contact.type}</p>
            <a href="${contact.link}" target="_blank" class="contact-link">
                <i class="fas fa-external-link-alt"></i> Contact
            </a>
        </div>
    `).join('');
}

// ===== NEWS PAGE =====
async function loadNews() {
    try {
        showLoader();
        
        const { data: news } = await supabase
            .from('news')
            .select('*')
            .eq('is_published', true)
            .order('published_at', { ascending: false })
            .limit(50);
        
        if (news) {
            state.news = news;
            renderNews();
        }
        
    } catch (error) {
        console.error('Error loading news:', error);
        showToast('Error', 'Failed to load news', 'error');
    } finally {
        hideLoader();
    }
}

function renderNews() {
    const container = document.querySelector('.news-grid');
    if (!container) return;
    
    if (state.news.length === 0) {
        container.innerHTML = '<div class="empty-state">No news available</div>';
        return;
    }
    
    container.innerHTML = state.news.map(article => `
        <div class="news-card" data-news-id="${article.id}">
            ${article.image_url ? `
                <img src="${article.image_url}" alt="${article.title}" class="news-image">
            ` : ''}
            <div class="news-content">
                <div class="news-meta">
                    <span><i class="fas fa-calendar"></i> ${formatDate(article.published_at)}</span>
                </div>
                <h3 class="news-title">${article.title}</h3>
                <p class="news-excerpt">${article.content.substring(0, 150)}...</p>
                <div class="news-footer">
                    <span class="read-more">
                        Read More <i class="fas fa-arrow-right"></i>
                    </span>
                    <div class="news-stats">
                        <span><i class="fas fa-eye"></i> ${article.views || 0}</span>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
    
    // Add click handlers
    document.querySelectorAll('.news-card').forEach(card => {
        card.addEventListener('click', () => {
            const newsId = parseInt(card.dataset.newsId);
            showNewsDetail(newsId);
        });
    });
}

function showNewsDetail(newsId) {
    const article = state.news.find(n => n.id === newsId);
    if (!article) return;
    
    const modal = document.querySelector('.news-modal');
    if (!modal) return;
    
    const content = modal.querySelector('.news-modal-content');
    content.innerHTML = `
        <div class="news-close"><i class="fas fa-times"></i></div>
        ${article.image_url ? `
            <img src="${article.image_url}" alt="${article.title}" class="news-detail-image">
        ` : ''}
        <h1 class="news-detail-title">${article.title}</h1>
        <div class="news-meta">
            <span><i class="fas fa-calendar"></i> ${formatDate(article.published_at)}</span>
            <span><i class="fas fa-eye"></i> ${article.views || 0} views</span>
        </div>
        <div class="news-detail-content">${article.content}</div>
        ${article.video_url ? `
            <video src="${article.video_url}" controls class="news-video"></video>
        ` : ''}
        ${article.youtube_embed ? `
            <iframe src="${article.youtube_embed}" class="news-youtube"></iframe>
        ` : ''}
    `;
    
    modal.classList.add('active');
    
    // Increment view count
    incrementNewsView(newsId);
    
    // Close button
    content.querySelector('.news-close').addEventListener('click', () => {
        modal.classList.remove('active');
    });
}

async function incrementNewsView(newsId) {
    try {
        const article = state.news.find(n => n.id === newsId);
        if (!article) return;
        
        const newViews = (article.views || 0) + 1;
        
        await supabase
            .from('news')
            .update({ views: newViews })
            .eq('id', newsId);
        
        article.views = newViews;
        
    } catch (error) {
        console.error('Error incrementing view:', error);
    }
}

// ===== ORDERS PAGE =====
async function loadOrders() {
    try {
        showLoader();
        
        const { data: orders } = await supabase
            .from('orders')
            .select(`
                *,
                products (
                    id,
                    name,
                    image_url,
                    price
                ),
                payment_methods (
                    name
                )
            `)
            .eq('user_id', state.currentUser.id)
            .order('created_at', { ascending: false });
        
        if (orders) {
            state.orders = orders;
            renderOrders();
        }
        
    } catch (error) {
        console.error('Error loading orders:', error);
        showToast('Error', 'Failed to load orders', 'error');
    } finally {
        hideLoader();
    }
}

function renderOrders(filter = 'all') {
    const container = document.querySelector('.orders-list');
    if (!container) return;
    
    let filteredOrders = state.orders;
    
    if (filter !== 'all') {
        filteredOrders = state.orders.filter(order => order.status === filter);
    }
    
    if (filteredOrders.length === 0) {
        container.innerHTML = `
            <div class="orders-empty">
                <div class="empty-icon"><i class="fas fa-shopping-bag"></i></div>
                <p class="empty-text">No orders found</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = filteredOrders.map(order => `
        <div class="order-card">
            <div class="order-header">
                <div>
                    <div class="order-id">Order #${order.id}</div>
                    <div class="order-date">${formatDate(order.created_at)}</div>
                </div>
                <div class="order-status ${order.status}">${order.status.toUpperCase()}</div>
            </div>
            <div class="order-body">
                <div class="order-product">
                    <img src="${order.products.image_url}" alt="${order.products.name}" class="product-image">
                    <div class="product-info">
                        <h4 class="product-name">${order.products.name}</h4>
                        <p class="product-details">
                            Amount: ${order.amount || 'N/A'}<br>
                            Payment: ${order.payment_methods?.name || 'N/A'}
                        </p>
                    </div>
                    <div class="product-price">${formatCurrency(order.total_price)}</div>
                </div>
            </div>
            <div class="order-footer">
                <div class="order-total">Total: ${formatCurrency(order.total_price)}</div>
                <div class="order-actions">
                    ${order.status === 'approved' && !order.has_feedback ? `
                        <button class="action-btn rate" data-order-id="${order.id}">
                            <i class="fas fa-star"></i> Rate
                        </button>
                    ` : ''}
                    <button class="action-btn" onclick="showOrderDetail(${order.id})">
                        <i class="fas fa-eye"></i> Details
                    </button>
                </div>
            </div>
        </div>
    `).join('');
    
    // Add rating button handlers
    document.querySelectorAll('.action-btn.rate').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const orderId = parseInt(btn.dataset.orderId);
            showRatingModal(orderId);
        });
    });
}

function showRatingModal(orderId) {
    const order = state.orders.find(o => o.id === orderId);
    if (!order) return;
    
    const modal = document.querySelector('.rating-modal');
    if (!modal) return;
    
    modal.classList.add('active');
    
    // Reset stars
    document.querySelectorAll('.star').forEach((star, index) => {
        star.classList.remove('active');
        star.dataset.rating = index + 1;
        
        star.addEventListener('click', () => {
            document.querySelectorAll('.star').forEach(s => s.classList.remove('active'));
            for (let i = 0; i <= index; i++) {
                document.querySelectorAll('.star')[i].classList.add('active');
            }
            modal.dataset.selectedRating = index + 1;
        });
    });
    
    // Submit rating
    const submitBtn = modal.querySelector('.btn-primary');
    submitBtn.onclick = async () => {
        const rating = parseInt(modal.dataset.selectedRating || 0);
        const comment = modal.querySelector('.comment-textarea').value;
        
        if (rating === 0) {
            showToast('Error', 'Please select a rating', 'error');
            return;
        }
        
        await submitFeedback(orderId, rating, comment);
        modal.classList.remove('active');
    };
    
    // Cancel
    const cancelBtn = modal.querySelector('.btn-secondary');
    cancelBtn.onclick = () => {
        modal.classList.remove('active');
    };
}

async function submitFeedback(orderId, rating, comment) {
    try {
        showLoader();
        
        const order = state.orders.find(o => o.id === orderId);
        if (!order) return;
        
        const { error } = await supabase
            .from('feedback')
            .insert([{
                user_id: state.currentUser.id,
                product_id: order.product_id,
                order_id: orderId,
                rating: rating,
                comment: comment,
                created_at: new Date().toISOString()
            }]);
        
        if (error) {
            showToast('Error', 'Failed to submit feedback', 'error');
            return;
        }
        
        // Update order
        await supabase
            .from('orders')
            .update({ has_feedback: true })
            .eq('id', orderId);
        
        order.has_feedback = true;
        
        showToast('Success', 'Thank you for your feedback!', 'success');
        renderOrders();
        
    } catch (error) {
        console.error('Error submitting feedback:', error);
        showToast('Error', 'Failed to submit feedback', 'error');
    } finally {
        hideLoader();
    }
}

// Order filter handlers
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        const filter = btn.dataset.filter;
        renderOrders(filter);
    });
});

// ===== PROFILE PAGE =====
async function loadProfile() {
    try {
        showLoader();
        
        // Get user stats
        const { data: ordersCount } = await supabase
            .from('orders')
            .select('id', { count: 'exact' })
            .eq('user_id', state.currentUser.id);
        
        const { data: approvedCount } = await supabase
            .from('orders')
            .select('id', { count: 'exact' })
            .eq('user_id', state.currentUser.id)
            .eq('status', 'approved');
        
        const { data: totalSpent } = await supabase
            .from('orders')
            .select('total_price')
            .eq('user_id', state.currentUser.id)
            .eq('status', 'approved');
        
        // Update profile display
        const profilePage = document.getElementById('profile-page');
        
        // Update avatar
        profilePage.querySelector('.profile-avatar-large').src = 
            state.currentUser.avatar_url || 'https://ui-avatars.com/api/?name=' + state.currentUser.username;
        
        profilePage.querySelector('.profile-username').textContent = state.currentUser.username;
        profilePage.querySelector('.profile-email').textContent = state.currentUser.email;
        
        // Update stats
        profilePage.querySelector('.stat-value[data-stat="orders"]').textContent = ordersCount?.length || 0;
        profilePage.querySelector('.stat-value[data-stat="completed"]').textContent = approvedCount?.length || 0;
        
        const total = totalSpent?.reduce((sum, order) => sum + (order.total_price || 0), 0) || 0;
        profilePage.querySelector('.stat-value[data-stat="spent"]').textContent = formatCurrency(total);
        
        // Setup settings toggles
        setupProfileSettings();
        
    } catch (error) {
        console.error('Error loading profile:', error);
        showToast('Error', 'Failed to load profile', 'error');
    } finally {
        hideLoader();
    }
}

function setupProfileSettings() {
    // Music toggle
    const musicToggle = document.querySelector('[data-setting="music"] .toggle-switch');
    const musicEnabled = localStorage.getItem('musicEnabled') !== 'false';
    if (musicEnabled) musicToggle.classList.add('active');
    
    musicToggle.addEventListener('click', () => {
        const newState = !musicToggle.classList.contains('active');
        musicToggle.classList.toggle('active');
        localStorage.setItem('musicEnabled', newState);
        
        if (!newState) {
            pauseMusic();
        } else if (state.musicTracks.length > 0) {
            playMusic(state.musicTracks[0]);
        }
    });
    
    // Notifications toggle
    const notifToggle = document.querySelector('[data-setting="notifications"] .toggle-switch');
    const notifEnabled = localStorage.getItem('notificationsEnabled') !== 'false';
    if (notifEnabled) notifToggle.classList.add('active');
    
    notifToggle.addEventListener('click', () => {
        const newState = !notifToggle.classList.contains('active');
        notifToggle.classList.toggle('active');
        localStorage.setItem('notificationsEnabled', newState);
        showToast('Settings', `Notifications ${newState ? 'enabled' : 'disabled'}`, 'info');
    });
    
    // Dark mode toggle (already dark by default)
    const darkToggle = document.querySelector('[data-setting="darkmode"] .toggle-switch');
    darkToggle.classList.add('active');
    
    darkToggle.addEventListener('click', () => {
        showToast('Info', 'Dark mode is default for this gaming platform', 'info');
    });
}

// ===== PRODUCTS PAGE (Called from category card click) =====
async function loadProductsPage(categoryCard) {
    try {
        showLoader();
        
        // Hide home page, show products page
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        
        // Create or get products page
        let productsPage = document.getElementById('products-page');
        if (!productsPage) {
            productsPage = document.createElement('div');
            productsPage.id = 'products-page';
            productsPage.className = 'page';
            document.querySelector('.main-content').appendChild(productsPage);
        }
        
        productsPage.classList.add('active');
        
        // Load input tables
        const { data: inputTables } = await supabase
            .from('input_tables')
            .select('*')
            .eq('category_card_id', categoryCard.id)
            .eq('is_active', true)
            .order('order_index');
        
        // Load products
        const { data: products } = await supabase
            .from('products')
            .select(`
                *,
                product_payment_methods (
                    payment_method_id,
                    payment_methods (*)
                )
            `)
            .eq('category_card_id', categoryCard.id)
            .eq('is_active', true)
            .order('order_index');
        
        state.products = products || [];
        state.inputTableData = {};
        
        // Render products page
        renderProductsPage(categoryCard, inputTables || [], products || []);
        
    } catch (error) {
        console.error('Error loading products page:', error);
        showToast('Error', 'Failed to load products', 'error');
    } finally {
        hideLoader();
    }
}

function renderProductsPage(categoryCard, inputTables, products) {
    const page = document.getElementById('products-page');
    
    page.innerHTML = `
        <div class="products-page-header">
            <button class="btn-back" onclick="platformCore.navigateTo('home')">
                <i class="fas fa-arrow-left"></i> Back
            </button>
            <h1 class="products-page-title">${categoryCard.name}</h1>
            <p class="products-page-description">${categoryCard.description || ''}</p>
        </div>
        
        ${categoryCard.banner_images?.length > 0 ? `
            <div class="product-banner-carousel">
                ${categoryCard.banner_images.map((img, idx) => `
                    <div class="product-banner-slide ${idx === 0 ? 'active' : ''}">
                        <img src="${img}" alt="Banner ${idx + 1}">
                    </div>
                `).join('')}
            </div>
        ` : ''}
        
        ${inputTables.length > 0 ? `
            <div class="input-tables-section">
                <h2 class="input-tables-title">Order Information</h2>
                <table class="input-table">
                    <thead>
                        <tr>
                            <th>Field</th>
                            <th>Value</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${inputTables.map(field => `
                            <tr>
                                <td>${field.field_name}</td>
                                <td>
                                    <input 
                                        type="text" 
                                        data-field-id="${field.id}"
                                        placeholder="Enter ${field.field_name}"
                                        ${field.is_required ? 'required' : ''}
                                    >
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        ` : ''}
        
        <div class="products-section">
            <div class="section-header">
                <h2>Available Products</h2>
            </div>
            <div class="products-grid">
                ${products.map(product => renderProductCard(product)).join('')}
            </div>
        </div>
        
        <div class="buy-button-section">
            <button class="buy-btn" onclick="handleBuyClick()">
                <i class="fas fa-shopping-cart"></i> Proceed to Checkout
            </button>
        </div>
    `;
    
    // Start banner carousel if exists
    if (categoryCard.banner_images?.length > 1) {
        startProductBannerCarousel();
    }
    
    // Setup product click handlers
    setupProductHandlers();
    
    // Setup input field handlers
    setupInputTableHandlers(inputTables);
}

function renderProductCard(product) {
    const discount = product.discount_percent || 0;
    const finalPrice = product.price * (1 - discount / 100);
    
    return `
        <div class="product-card" data-product-id="${product.id}">
            ${product.type_badge ? `
                <div class="product-badge" style="background: ${product.type_badge_color || 'linear-gradient(135deg, #6366f1, #8b5cf6)'}">
                    ${product.type_badge}
                </div>
            ` : ''}
            ${discount > 0 ? `
                <div class="product-discount">-${discount}%</div>
            ` : ''}
            <div class="product-image-container">
                <img src="${product.image_url}" alt="${product.name}">
            </div>
            <div class="product-content">
                <h3 class="product-name">${product.name}</h3>
                <p class="product-description">${product.description || ''}</p>
                <div class="product-price">
                    ${formatCurrency(finalPrice)}
                    ${discount > 0 ? `<span class="product-old-price">${formatCurrency(product.price)}</span>` : ''}
                </div>
                <div class="product-footer">
                    <div class="product-rating">
                        <div class="rating-stars">
                            ${renderStars(product.avg_rating || 0)}
                        </div>
                        <span class="rating-count">(${product.ratings_count || 0})</span>
                    </div>
                    <button class="favorite-btn" data-product-id="${product.id}">
                        <i class="far fa-heart"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
}

function renderStars(rating) {
    const fullStars = Math.floor(rating);
    const hasHalf = rating % 1 >= 0.5;
    let html = '';
    
    for (let i = 0; i < fullStars; i++) {
        html += '<i class="fas fa-star"></i>';
    }
    if (hasHalf) {
        html += '<i class="fas fa-star-half-alt"></i>';
    }
    for (let i = fullStars + (hasHalf ? 1 : 0); i < 5; i++) {
        html += '<i class="far fa-star"></i>';
    }
    
    return html;
}

function startProductBannerCarousel() {
    let currentIndex = 0;
    const slides = document.querySelectorAll('.product-banner-slide');
    
    if (slides.length <= 1) return;
    
    setInterval(() => {
        slides[currentIndex].classList.remove('active');
        currentIndex = (currentIndex + 1) % slides.length;
        slides[currentIndex].classList.add('active');
    }, 5000);
}

function setupProductHandlers() {
    // Product card clicks
    document.querySelectorAll('.product-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.favorite-btn')) {
                const productId = parseInt(card.dataset.productId);
                showProductDetail(productId);
            }
        });
    });
    
    // Favorite buttons
    document.querySelectorAll('.favorite-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const productId = parseInt(btn.dataset.productId);
            toggleFavorite(productId);
        });
    });
}

function setupInputTableHandlers(inputTables) {
    inputTables.forEach(field => {
        const input = document.querySelector(`[data-field-id="${field.id}"]`);
        if (!input) return;
        
        input.addEventListener('input', (e) => {
            state.inputTableData[field.id] = {
                field_name: field.field_name,
                value: e.target.value,
                is_required: field.is_required
            };
        });
    });
}

async function showProductDetail(productId) {
    const product = state.products.find(p => p.id === productId);
    if (!product) return;
    
    try {
        showLoader();
        
        // Load product guidelines
        const { data: guidelines } = await supabase
            .from('product_guidelines')
            .select('*')
            .eq('product_id', productId)
            .eq('is_active', true)
            .order('order_index');
        
        // Load YouTube videos
        const { data: videos } = await supabase
            .from('youtube_videos')
            .select('*')
            .eq('product_id', productId)
            .eq('is_active', true)
            .order('order_index');
        
        // Load feedback
        const { data: feedback } = await supabase
            .from('feedback')
            .select(`
                *,
                users (username, avatar_url)
            `)
            .eq('product_id', productId)
            .order('created_at', { ascending: false })
            .limit(20);
        
        // Render modal
        renderProductDetailModal(product, guidelines || [], videos || [], feedback || []);
        
    } catch (error) {
        console.error('Error loading product detail:', error);
        showToast('Error', 'Failed to load product details', 'error');
    } finally {
        hideLoader();
    }
}

// Continue in next part due to length...
console.log('✓ index.js extended - Additional functions loaded');

// ========================================
// 2025 PREMIUM GAMING PLATFORM
// index1.js - Extended Functionality (Part 2/2)
// Line Count: ~2500+
// Handles: Products, Orders, Payments, Coupons, Favorites
// ========================================

// Import core from index.js
const { state, supabase, validators, showToast, formatDate, formatCurrency, showLoader, hideLoader } = window.platformCore;

// ===== PRODUCT DETAIL MODAL =====
function renderProductDetailModal(product, guidelines, videos, feedback) {
    const modal = document.querySelector('.product-modal');
    if (!modal) return;
    
    const discount = product.discount_percent || 0;
    const finalPrice = product.price * (1 - discount / 100);
    
    const content = modal.querySelector('.product-modal-content');
    content.innerHTML = `
        <div class="modal-close"><i class="fas fa-times"></i></div>
        
        <div class="product-detail-grid">
            <div>
                <img src="${product.image_url}" alt="${product.name}" class="product-detail-image">
            </div>
            <div class="product-detail-info">
                <h2>${product.name}</h2>
                <div class="product-detail-price">
                    ${formatCurrency(finalPrice)}
                    ${discount > 0 ? `<span class="product-old-price">${formatCurrency(product.price)}</span>` : ''}
                </div>
                <p class="product-detail-description">${product.description || ''}</p>
                
                <div class="product-meta">
                    <span><i class="fas fa-tag"></i> ${product.type_badge || 'Product'}</span>
                    <span><i class="fas fa-box"></i> Stock: ${product.stock || 'Available'}</span>
                </div>
            </div>
        </div>
        
        ${guidelines.length > 0 ? `
            <div class="guidelines-section">
                <h3><i class="fas fa-info-circle"></i> Guidelines & Instructions</h3>
                ${guidelines.map(g => `
                    <div class="guideline-item">
                        <i class="fas fa-check-circle"></i>
                        <div>
                            <strong>${g.title}</strong>
                            <p>${g.content}</p>
                        </div>
                    </div>
                `).join('')}
            </div>
        ` : ''}
        
        ${videos.length > 0 ? `
            <div class="youtube-section">
                <h3><i class="fab fa-youtube"></i> Video Tutorials</h3>
                <div class="youtube-grid">
                    ${videos.map(v => `
                        <div class="youtube-item">
                            <iframe 
                                src="https://www.youtube.com/embed/${v.video_id}" 
                                title="${v.title}"
                                frameborder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowfullscreen>
                            </iframe>
                            <p>${v.title}</p>
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : ''}
        
        ${feedback.length > 0 ? `
            <div class="feedback-section">
                <h3><i class="fas fa-comments"></i> Customer Feedback (${feedback.length})</h3>
                <div class="feedback-list">
                    ${feedback.map(f => `
                        <div class="feedback-item">
                            <div class="feedback-header">
                                <div class="feedback-user">
                                    <img src="${f.users.avatar_url}" alt="${f.users.username}" class="feedback-avatar">
                                    <div>
                                        <div class="feedback-username">${f.users.username}</div>
                                        <div class="feedback-rating">
                                            ${renderStars(f.rating)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <p class="feedback-comment">${f.comment}</p>
                            <div class="feedback-footer">
                                <span class="feedback-date">${formatDate(f.created_at)}</span>
                                <button class="feedback-like ${f.liked_by_current_user ? 'liked' : ''}" data-feedback-id="${f.id}">
                                    <i class="fas fa-heart"></i> ${f.likes_count || 0}
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : ''}
        
        <div class="payment-methods-section">
            <h3><i class="fas fa-credit-card"></i> Available Payment Methods</h3>
            <div class="payment-methods-grid">
                ${product.product_payment_methods.map(ppm => `
                    <div class="payment-method-card" data-payment-id="${ppm.payment_methods.id}">
                        <div class="payment-method-icon">${ppm.payment_methods.icon || '💳'}</div>
                        <div class="payment-method-name">${ppm.payment_methods.name}</div>
                        <div class="payment-method-account">${ppm.payment_methods.account_name}</div>
                        <div class="payment-method-number">${ppm.payment_methods.account_number}</div>
                    </div>
                `).join('')}
            </div>
        </div>
        
        <div style="margin-top: 2rem;">
            <button class="btn btn-select-product" data-product-id="${product.id}">
                <i class="fas fa-cart-plus"></i> Select This Product
            </button>
        </div>
    `;
    
    modal.classList.add('active');
    
    // Close handler
    content.querySelector('.modal-close').addEventListener('click', () => {
        modal.classList.remove('active');
    });
    
    // Select product handler
    content.querySelector('.btn-select-product').addEventListener('click', () => {
        selectProduct(product);
        modal.classList.remove('active');
    });
    
    // Payment method selection
    content.querySelectorAll('.payment-method-card').forEach(card => {
        card.addEventListener('click', () => {
            content.querySelectorAll('.payment-method-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            state.selectedPaymentMethod = parseInt(card.dataset.paymentId);
        });
    });
    
    // Feedback like handlers
    content.querySelectorAll('.feedback-like').forEach(btn => {
        btn.addEventListener('click', async () => {
            const feedbackId = parseInt(btn.dataset.feedbackId);
            await toggleFeedbackLike(feedbackId);
        });
    });
}

function renderStars(rating) {
    const fullStars = Math.floor(rating);
    const hasHalf = rating % 1 >= 0.5;
    let html = '';
    
    for (let i = 0; i < fullStars; i++) {
        html += '<i class="fas fa-star"></i>';
    }
    if (hasHalf) {
        html += '<i class="fas fa-star-half-alt"></i>';
    }
    for (let i = fullStars + (hasHalf ? 1 : 0); i < 5; i++) {
        html += '<i class="far fa-star"></i>';
    }
    
    return html;
}

// ===== PRODUCT SELECTION =====
function selectProduct(product) {
    // Check if already selected
    const existingIndex = state.selectedProducts.findIndex(p => p.id === product.id);
    
    if (existingIndex >= 0) {
        showToast('Info', 'Product already selected', 'info');
        return;
    }
    
    state.selectedProducts.push(product);
    showToast('Success', `${product.name} added to selection`, 'success');
    
    // Show buy button
    const buySection = document.querySelector('.buy-button-section');
    if (buySection) {
        buySection.classList.add('active');
    }
}

// ===== FAVORITES =====
async function toggleFavorite(productId) {
    try {
        // Check if already favorited
        const { data: existing } = await supabase
            .from('favorites')
            .select('id')
            .eq('user_id', state.currentUser.id)
            .eq('product_id', productId)
            .single();
        
        if (existing) {
            // Remove favorite
            await supabase
                .from('favorites')
                .delete()
                .eq('id', existing.id);
            
            showToast('Removed', 'Removed from favorites', 'info');
            
            // Update UI
            document.querySelector(`[data-product-id="${productId}"] .favorite-btn i`)
                ?.classList.replace('fas', 'far');
        } else {
            // Add favorite
            await supabase
                .from('favorites')
                .insert([{
                    user_id: state.currentUser.id,
                    product_id: productId,
                    created_at: new Date().toISOString()
                }]);
            
            showToast('Added', 'Added to favorites', 'success');
            
            // Update UI
            document.querySelector(`[data-product-id="${productId}"] .favorite-btn i`)
                ?.classList.replace('far', 'fas');
        }
        
    } catch (error) {
        console.error('Error toggling favorite:', error);
        showToast('Error', 'Failed to update favorites', 'error');
    }
}

// ===== FEEDBACK LIKES =====
async function toggleFeedbackLike(feedbackId) {
    try {
        const { data: existing } = await supabase
            .from('feedback_likes')
            .select('id')
            .eq('user_id', state.currentUser.id)
            .eq('feedback_id', feedbackId)
            .single();
        
        if (existing) {
            // Unlike
            await supabase
                .from('feedback_likes')
                .delete()
                .eq('id', existing.id);
        } else {
            // Like
            await supabase
                .from('feedback_likes')
                .insert([{
                    user_id: state.currentUser.id,
                    feedback_id: feedbackId,
                    created_at: new Date().toISOString()
                }]);
        }
        
        // Reload product detail to update counts
        // (In production, update counts locally for better UX)
        
    } catch (error) {
        console.error('Error toggling feedback like:', error);
    }
}

// ===== CHECKOUT PROCESS =====
function handleBuyClick() {
    // Validate inputs
    if (state.selectedProducts.length === 0) {
        showToast('Error', 'Please select at least one product', 'error');
        return;
    }
    
    // Validate input table data
    const requiredFields = Object.values(state.inputTableData).filter(f => f.is_required);
    const missingFields = requiredFields.filter(f => !f.value || f.value.trim() === '');
    
    if (missingFields.length > 0) {
        showToast('Error', 'Please fill all required fields', 'error');
        return;
    }
    
    // Show order confirmation modal
    showOrderConfirmationModal();
}

function showOrderConfirmationModal() {
    const modal = document.querySelector('.order-modal');
    if (!modal) return;
    
    // Calculate totals
    let subtotal = 0;
    state.selectedProducts.forEach(product => {
        const discount = product.discount_percent || 0;
        const finalPrice = product.price * (1 - discount / 100);
        subtotal += finalPrice;
    });
    
    const discount = state.appliedCoupon ? (subtotal * state.appliedCoupon.discount_percent / 100) : 0;
    const total = subtotal - discount;
    
    const content = modal.querySelector('.order-modal-content');
    content.innerHTML = `
        <div class="order-modal-header">
            <h2><i class="fas fa-shopping-cart"></i> Confirm Order</h2>
        </div>
        
        <div class="order-summary">
            <h3>Order Summary</h3>
            ${state.selectedProducts.map(p => {
                const disc = p.discount_percent || 0;
                const finalPrice = p.price * (1 - disc / 100);
                return `
                    <div class="summary-row">
                        <span>${p.name}</span>
                        <span>${formatCurrency(finalPrice)}</span>
                    </div>
                `;
            }).join('')}
            
            <div class="summary-row">
                <span>Subtotal</span>
                <span>${formatCurrency(subtotal)}</span>
            </div>
            
            ${state.appliedCoupon ? `
                <div class="summary-row" style="color: var(--success);">
                    <span>Coupon (${state.appliedCoupon.code})</span>
                    <span>-${formatCurrency(discount)}</span>
                </div>
            ` : ''}
            
            <div class="summary-row total">
                <span>Total</span>
                <span>${formatCurrency(total)}</span>
            </div>
        </div>
        
        <div class="coupon-section">
            <h3>Have a Coupon?</h3>
            <div class="coupon-input-group">
                <input type="text" class="form-input coupon-input" placeholder="Enter coupon code">
                <button class="apply-coupon-btn">Apply</button>
            </div>
        </div>
        
        <div class="proof-upload-section">
            <h3>Upload Payment Proof</h3>
            <div class="upload-area" id="upload-area">
                <i class="fas fa-cloud-upload-alt upload-icon"></i>
                <p>Click to upload or drag and drop</p>
                <p style="font-size: 0.85rem; color: var(--text-secondary);">PNG, JPG up to 10MB</p>
            </div>
            <div class="upload-preview">
                <img id="preview-image" class="preview-image" alt="Preview">
            </div>
            <input type="file" id="proof-file-input" accept="image/*" style="display: none;">
        </div>
        
        <div class="order-actions">
            <button class="btn btn-secondary">Cancel</button>
            <button class="btn btn-primary">Submit Order</button>
        </div>
    `;
    
    modal.classList.add('active');
    
    // Setup handlers
    setupOrderModalHandlers(modal, total);
}

function setupOrderModalHandlers(modal, total) {
    const content = modal.querySelector('.order-modal-content');
    
    // Cancel button
    content.querySelector('.btn-secondary').addEventListener('click', () => {
        modal.classList.remove('active');
    });
    
    // Coupon application
    content.querySelector('.apply-coupon-btn').addEventListener('click', async () => {
        const code = content.querySelector('.coupon-input').value.trim();
        if (!code) {
            showToast('Error', 'Please enter a coupon code', 'error');
            return;
        }
        
        await applyCoupon(code);
    });
    
    // File upload
    const uploadArea = content.querySelector('#upload-area');
    const fileInput = content.querySelector('#proof-file-input');
    const preview = content.querySelector('.upload-preview');
    const previewImage = content.querySelector('#preview-image');
    
    uploadArea.addEventListener('click', () => {
        fileInput.click();
    });
    
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        // Validate file
        if (!file.type.startsWith('image/')) {
            showToast('Error', 'Please select an image file', 'error');
            return;
        }
        
        if (file.size > 10 * 1024 * 1024) {
            showToast('Error', 'File size must be less than 10MB', 'error');
            return;
        }
        
        // Show preview
        const reader = new FileReader();
        reader.onload = (e) => {
            previewImage.src = e.target.result;
            preview.classList.add('active');
        };
        reader.readAsDataURL(file);
        
        // Store file for upload
        state.paymentProofFile = file;
    });
    
    // Submit order
    content.querySelector('.btn-primary').addEventListener('click', async () => {
        await submitOrder(total);
    });
}

// ===== COUPON SYSTEM =====
async function applyCoupon(code) {
    try {
        showLoader();
        
        // Find coupon
        const { data: coupon, error } = await supabase
            .from('coupons')
            .select('*')
            .eq('code', code)
            .eq('is_active', true)
            .single();
        
        if (error || !coupon) {
            showToast('Error', 'Invalid coupon code', 'error');
            return;
        }
        
        // Check if already used (if single-use)
        if (!coupon.is_multi_use) {
            const { data: usage } = await supabase
                .from('coupon_usage')
                .select('id')
                .eq('coupon_id', coupon.id)
                .eq('user_id', state.currentUser.id)
                .single();
            
            if (usage) {
                showToast('Error', 'Coupon already used', 'error');
                return;
            }
        }
        
        // Check expiry
        if (coupon.expiry_date && new Date(coupon.expiry_date) < new Date()) {
            showToast('Error', 'Coupon has expired', 'error');
            return;
        }
        
        // Check product-specific
        if (coupon.product_id) {
            const hasProduct = state.selectedProducts.some(p => p.id === coupon.product_id);
            if (!hasProduct) {
                showToast('Error', 'Coupon not valid for selected products', 'error');
                return;
            }
        }
        
        // Apply coupon
        state.appliedCoupon = coupon;
        showToast('Success', `Coupon applied! ${coupon.discount_percent}% off`, 'success');
        
        // Refresh modal
        showOrderConfirmationModal();
        
    } catch (error) {
        console.error('Error applying coupon:', error);
        showToast('Error', 'Failed to apply coupon', 'error');
    } finally {
        hideLoader();
    }
}

// ===== ORDER SUBMISSION =====
async function submitOrder(total) {
    try {
        showLoader();
        
        // Validate payment proof
        if (!state.paymentProofFile) {
            showToast('Error', 'Please upload payment proof', 'error');
            return;
        }
        
        // Validate payment method
        if (!state.selectedPaymentMethod) {
            showToast('Error', 'Please select a payment method', 'error');
            return;
        }
        
        // Upload payment proof
        const fileExt = state.paymentProofFile.name.split('.').pop();
        const fileName = `${state.currentUser.id}_${Date.now()}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('payment-proofs')
            .upload(fileName, state.paymentProofFile);
        
        if (uploadError) {
            showToast('Error', 'Failed to upload payment proof', 'error');
            return;
        }
        
        // Get public URL
        const { data: urlData } = supabase.storage
            .from('payment-proofs')
            .getPublicUrl(fileName);
        
        const proofUrl = urlData.publicUrl;
        
        // Create orders for each product
        const orderPromises = state.selectedProducts.map(product => {
            const discount = product.discount_percent || 0;
            const finalPrice = product.price * (1 - discount / 100);
            
            return supabase
                .from('orders')
                .insert([{
                    user_id: state.currentUser.id,
                    product_id: product.id,
                    category_card_id: state.currentCategoryCard.id,
                    payment_method_id: state.selectedPaymentMethod,
                    amount: state.inputTableData[Object.keys(state.inputTableData)[0]]?.value || '1',
                    input_data: JSON.stringify(state.inputTableData),
                    total_price: finalPrice,
                    payment_proof_url: proofUrl,
                    coupon_id: state.appliedCoupon?.id || null,
                    status: 'pending',
                    created_at: new Date().toISOString()
                }]);
        });
        
        await Promise.all(orderPromises);
        
        // Record coupon usage
        if (state.appliedCoupon) {
            await supabase
                .from('coupon_usage')
                .insert([{
                    coupon_id: state.appliedCoupon.id,
                    user_id: state.currentUser.id,
                    used_at: new Date().toISOString()
                }]);
        }
        
        // Clear state
        state.selectedProducts = [];
        state.selectedPaymentMethod = null;
        state.inputTableData = {};
        state.appliedCoupon = null;
        state.paymentProofFile = null;
        
        // Close modal
        document.querySelector('.order-modal').classList.remove('active');
        
        // Show success
        showToast('Success', 'Order submitted successfully! Awaiting admin approval.', 'success');
        
        // Navigate to orders page
        setTimeout(() => {
            window.platformCore.navigateTo('orders');
        }, 2000);
        
    } catch (error) {
        console.error('Error submitting order:', error);
        showToast('Error', 'Failed to submit order. Please try again.', 'error');
    } finally {
        hideLoader();
    }
}

// ===== UTILITY FUNCTIONS =====
function showOrderDetail(orderId) {
    const order = state.orders.find(o => o.id === orderId);
    if (!order) return;
    
    showToast('Order Details', `Order #${orderId} - ${order.status}`, 'info');
    // Implement full detail modal if needed
}

// ===== REAL-TIME UPDATES =====
function setupRealtimeSubscriptions() {
    // Subscribe to order updates
    supabase
        .channel('order-changes')
        .on(
            'postgres_changes',
            {
                event: 'UPDATE',
                schema: 'public',
                table: 'orders',
                filter: `user_id=eq.${state.currentUser.id}`
            },
            (payload) => {
                console.log('Order updated:', payload);
                
                // Update local state
                const orderIndex = state.orders.findIndex(o => o.id === payload.new.id);
                if (orderIndex >= 0) {
                    state.orders[orderIndex] = { ...state.orders[orderIndex], ...payload.new };
                }
                
                // Show notification
                showToast(
                    'Order Update',
                    `Order #${payload.new.id} status: ${payload.new.status}`,
                    payload.new.status === 'approved' ? 'success' : 
                    payload.new.status === 'rejected' ? 'error' : 'info'
                );
                
                // Refresh orders if on orders page
                if (state.currentPage === 'orders') {
                    window.loadOrders();
                }
            }
        )
        .subscribe();
    
    // Subscribe to notifications
    supabase
        .channel('notification-changes')
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'notifications',
                filter: `user_id=eq.${state.currentUser.id}`
            },
            (payload) => {
                console.log('New notification:', payload);
                
                // Add to state
                state.notifications.unshift(payload.new);
                
                // Update UI
                window.renderNotifications?.();
                window.updateNotificationBadge?.();
                
                // Show toast
                const notifEnabled = localStorage.getItem('notificationsEnabled') !== 'false';
                if (notifEnabled) {
                    showToast('Notification', payload.new.message, 'info');
                }
            }
        )
        .subscribe();
}

// Initialize realtime when app loads
if (state.currentUser) {
    setupRealtimeSubscriptions();
}

// ===== EXPORT FUNCTIONS =====
window.handleBuyClick = handleBuyClick;
window.showOrderDetail = showOrderDetail;
window.selectProduct = selectProduct;
window.toggleFavorite = toggleFavorite;
window.renderStars = renderStars;
window.loadProductsPage = window.loadProductsPage || function() {};

console.log('✓ index1.js loaded - Extended functionality ready');
console.log('✓ All platform features initialized');
