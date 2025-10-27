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
