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
