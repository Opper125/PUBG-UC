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

// Continue in next file...
