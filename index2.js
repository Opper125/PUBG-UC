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
