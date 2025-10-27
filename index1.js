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
