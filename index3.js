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
