/* ============================================================
   phase29.js — Professional Rating System
   Beautiful, interactive and comprehensive rating system
   ============================================================ */

(function () {
  if (typeof I18N === 'undefined') return;

  const add = (k, ar, en) => { 
    I18N.ar[k] = ar; 
    I18N.en[k] = en; 
  };

  add('rate_service', 'تقييم الخدمة', 'Rate Service');
  add('rate_driver', 'تقييم المندوب', 'Rate Driver');
  add('rate_vendor', 'تقييم المزود', 'Rate Provider');
  add('your_rating', 'تقييمك', 'Your Rating');
  add('service_rating', 'جودة الخدمة', 'Service Quality');
  add('driver_rating', 'أداء المندوب', 'Driver Performance');
  add('write_review', 'اكتب تجربتك...', 'Share your experience...');
  add('thank_you_rating', 'شكراً على تقييمك!', 'Thank you for your rating!');
  add('avg_rating', 'المتوسط', 'Average');
  add('total_ratings', 'إجمالي التقييمات', 'Total Ratings');
  add('excellent', 'ممتاز', 'Excellent');
  add('very_good', 'جيد جداً', 'Very Good');
  add('good', 'جيد', 'Good');
  add('fair', 'مقبول', 'Fair');
  add('poor', 'ضعيف', 'Poor');
  add('rating_stats', 'إحصائيات التقييم', 'Rating Stats');
  add('rating_distribution', 'توزيع التقييمات', 'Rating Distribution');
  add('recent_reviews', 'التقييمات الأخيرة', 'Recent Reviews');
  add('all_reviews', 'كل التقييمات', 'All Reviews');
  add('sort_by', 'ترتيب حسب', 'Sort by');
  add('newest_first', 'الأحدث أولاً', 'Newest First');
  add('highest_first', 'الأعلى تقييماً', 'Highest First');
  add('lowest_first', 'الأقل تقييماً', 'Lowest First');
  add('verified_order', 'طلبتم التحقق', 'Verified Order');
  add('helpfulness', 'هل كان التقييم مفيداً؟', 'Was this helpful?');
  add('report_review', 'الإبلاغ عن تقييم', 'Report Review');

})();

// ============================================================
// Professional Rating Modal
// ============================================================

window.ph29_showRatingModal = function(orderId, options = {}) {
  const o = AppData.orders.find(x => x.id === orderId);
  if (!o) return;
  
  const svc = AppData.services.find(s => s.id === o.svcId);
  const vendor = AppData.users.find(u => u.id === o.vendorId);
  const driver = o.driverId ? AppData.users.find(u => u.id === o.driverId) : null;
  
  openModal(`
    <div class="ph29-rating-modal">
      <div class="modal-header">
        <h2 class="modal-title">⭐ تقييمطلب #${o.orderId}</h2>
        <button class="modal-close" onclick="closeModal()">✕</button>
      </div>
      
      <div class="ph29-order-summary">
        <div class="ph29-svc-icon">${o.svcIcon || '🔷'}</div>
        <div class="ph29-svc-info">
          <div class="ph29-svc-name">${o.svcName}</div>
          <div class="ph29-svc-provider">${o.vendorName || '—'}</div>
        </div>
      </div>
      
      <div class="ph29-rating-sections">
        <!-- Vendor/Service Rating -->
        <div class="ph29-rating-section">
          <div class="ph29-rating-label">
            <span>🏠 خدمة️</span>
            <span>تقييم المزود والخدمة</span>
          </div>
          <div class="ph29-star-picker" id="ph29-vendor-stars">
            ${[1,2,3,4,5].map(n => `
              <button class="ph29-star-btn" data-value="${n}" onclick="ph29_pickStar('vendor', ${n}, this)">
                <span class="ph29-star-icon">⭐</span>
              </button>
            `).join('')}
          </div>
          <div class="ph29-selected-rating" id="ph29-vendor-rating-text">اختر تقييمك</div>
        </div>
        
        ${driver ? `
        <!-- Driver Rating -->
        <div class="ph29-rating-section">
          <div class="ph29-rating-label">
            <span>🚗</span>
            <span>تقييم المندوب</span>
          </div>
          <div class="ph29-star-picker" id="ph29-driver-stars">
            ${[1,2,3,4,5].map(n => `
              <button class="ph29-star-btn" data-value="${n}" onclick="ph29_pickStar('driver', ${n}, this)">
                <span class="ph29-star-icon">⭐</span>
              </button>
            `).join('')}
          </div>
          <div class="ph29-selected-rating" id="ph29-driver-rating-text">اختر تقييمك (اختياري)</div>
        </div>
        ` : ''}
      </div>
      
      <!-- Review Comment -->
      <div class="ph29-comment-section">
        <label class="ph29-comment-label">💬 شاركنا تجربتك (اختياري)</label>
        <textarea class="ph29-comment-input" id="ph29-comment" placeholder="اكتب ما يعجبك أو ما يمكن تحسينه..." rows="4"></textarea>
        <div class="ph29-comment-hint">التعليقات تساعد الآخرين على اتخاذ قرار أفضل</div>
      </div>
      
      <!-- Quick Tags -->
      <div class="ph29-tags-section">
        <div class="ph29-tags-label">🏷️ علامات سريعة (اختياري)</div>
        <div class="ph29-tags">
          <button class="ph29-tag" onclick="ph29_toggleTag(this)">✅ دقيقون</button>
          <button class="ph29-tag" onclick="ph29_toggleTag(this)">👍 محترفون</button>
          <button class="ph29-tag" onclick="ph29_toggleTag(this)">⏰ في الوقت المحدد</button>
          <button class="ph29-tag" onclick="ph29_toggleTag(this)">💎 جودة عالية</button>
          <button class="ph29-tag" onclick="ph29_toggleTag(this)">😄 تعامل رائع</button>
          <button class="ph29-tag" onclick="ph29_toggleTag(this)">🔁 سأكرر التعامل</button>
        </div>
      </div>
      
      <button class="ph29-submit-btn" onclick="ph29_submitRating('${orderId}')">
        <span>⭐</span> إرسال التقييم
      </button>
    </div>
  `);
  
  window.ph29_ratingData = { vendor: 0, driver: 0, tags: [] };
};

window.ph29_ratingData = { vendor: 0, driver: 0, tags: [] };

window.ph29_pickStar = function(type, n, btn) {
  window.ph29_ratingData[type] = n;
  
  // Update UI
  const container = btn.parentElement;
  container.querySelectorAll('.ph29-star-btn').forEach((b, i) => {
    b.style.opacity = i < n ? '1' : '0.3';
    b.style.transform = i < n ? 'scale(1.1)' : 'scale(1)';
  });
  
  // Update text
  const ratingTexts = {
    1: '🤢 ضعيف',
    2: '😐 مقبول',
    3: '👍 جيد',
    4: '😊 جيد جداً',
    5: '🤩 ممتاز!'
  };
  const textEl = document.getElementById('ph29-' + type + '-rating-text');
  if (textEl) textEl.textContent = ratingTexts[n] || '';
};

window.ph29_toggleTag = function(btn) {
  btn.classList.toggle('active');
  const tag = btn.textContent.trim();
  if (window.ph29_ratingData.tags.includes(tag)) {
    window.ph29_ratingData.tags = window.ph29_ratingData.tags.filter(t => t !== tag);
  } else {
    window.ph29_ratingData.tags.push(tag);
  }
};

window.ph29_submitRating = async function(orderId) {
  if (!window.ph29_ratingData.vendor) {
    toast('يرجى تقييم المزود أولاً', 'error');
    return;
  }
  
  const comment = document.getElementById('ph29-comment')?.value.trim() || '';
  const o = AppData.orders.find(x => x.id === orderId);
  const u = State.currentUser;
  
  await fsAdd('ratings', {
    orderId,
    customerId: u.uid,
    customerName: u.name,
    serviceId: o?.svcId,
    vendorId: o?.vendorId,
    vendorStars: window.ph29_ratingData.vendor,
    vendorComment: comment,
    driverId: o?.driverId,
    driverStars: window.ph29_ratingData.driver || null,
    tags: window.ph29_ratingData.tags,
    createdAt: new Date()
  });
  
  window.ph29_ratingData = { vendor: 0, driver: 0, tags: [] };
  closeModal();
  toast('شكراً على تقييمك! 🙏', 'success');
  navigate('myorders');
};

// ============================================================
// Professional Rating Display
// ============================================================

window.ph29_renderRatingBadge = function(stars) {
  if (!stars || stars < 1) return '';
  const filled = Math.round(stars);
  const empty = 5 - filled;
  const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981'];
  
  return `
    <div class="ph29-rating-badge" style="display:inline-flex;align-items:center;gap:2px">
      ${Array(filled).fill(0).map((_, i) => `
        <span style="color:${colors[Math.min(i, 4)]};font-size:14px">★</span>
      `).join('')}
      ${Array(empty).fill(0).map(() => '<span style="color:#ddd;font-size:14px">★</span>').join('')}
    </div>
  `;
};

window.ph29_renderRatingCard = function(r) {
  const customer = AppData.users.find(u => u.id === r.customerId);
  const service = AppData.services.find(s => s.id === r.serviceId);
  const timeAgo = r.createdAt ? ph29_timeAgo(r.createdAt) : '';
  
  return `
    <div class="ph29-review-card">
      <div class="ph29-review-header">
        <div class="ph29-review-avatar">
          ${(customer?.name || 'ع').charAt(0).toUpperCase()}
        </div>
        <div class="ph29-review-info">
          <div class="ph29-review-user">${customer?.name || 'عميل'}</div>
          <div class="ph29-review-time">${timeAgo}</div>
        </div>
        <div class="ph29-review-stars">
          ${Array(r.vendorStars).fill(0).map(() => '<span>⭐</span>').join('')}
        </div>
      </div>
      ${r.vendorComment ? `
        <div class="ph29-review-comment">${r.vendorComment}</div>
      ` : ''}
      ${r.tags && r.tags.length ? `
        <div class="ph29-review-tags">
          ${r.tags.map(t => `<span class="ph29-review-tag">${t}</span>`).join('')}
        </div>
      ` : ''}
      <div class="ph29-review-footer">
        <span class="ph29-verified">✅ طلبتم التحقق</span>
      </div>
    </div>
  `;
};

function ph29_timeAgo(date) {
  if (!date) return '';
  const now = new Date();
  const then = new Date(date.seconds ? date.seconds * 1000 : date);
  const diff = Math.floor((now - then) / 1000);
  
  if (diff < 60) return 'الآن';
  if (diff < 3600) return 'منذ ' + Math.floor(diff / 60) + ' دقيقة';
  if (diff < 86400) return 'منذ ' + Math.floor(diff / 3600) + ' ساعة';
  if (diff < 604800) return 'منذ ' + Math.floor(diff / 86400) + ' يوم';
  return then.toLocaleDateString('ar-YE');
}

// ============================================================
// Rating Stats Display
// ============================================================

window.ph29_renderRatingStats = function(ratings) {
  const count = ratings.length;
  if (count === 0) return '<div class="ph29-no-ratings">لا توجد تقييمات بعد</div>';
  
  const sum = ratings.reduce((s, r) => s + (r.vendorStars || 0), 0);
  const avg = (sum / count).toFixed(1);
  
  const dist = [0,0,0,0,0];
  ratings.forEach(r => {
    const stars = Math.round(r.vendorStars || 0);
    if (stars >= 1 && stars <= 5) dist[stars-1]++;
  });
  
  const maxDist = Math.max(...dist);
  
  return `
    <div class="ph29-stats-container">
      <div class="ph29-stats-main">
        <div class="ph29-avg-score">${avg}</div>
        <div class="ph29-avg-stars">
          ${Array(Math.round(avg)).fill(0).map(() => '⭐').join('')}
        </div>
        <div class="ph29-total-count">${count} تقييم</div>
      </div>
      <div class="ph29-distribution">
        ${[5,4,3,2,1].map((stars, i) => `
          <div class="ph29-dist-row">
            <span class="ph29-dist-stars">${stars} ⭐</span>
            <div class="ph29-dist-bar">
              <div class="ph29-dist-fill" style="width:${(dist[stars-1] / maxDist) * 100}%"></div>
            </div>
            <span class="ph29-dist-count">${dist[stars-1]}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
};

// ============================================================
// Add Professional Styles
// ============================================================

(function() {
  if (typeof window.ph29_stylesAdded === 'undefined') {
    window.ph29_stylesAdded = true;
    
    const style = document.createElement('style');
    style.textContent = `
      .ph29-rating-modal { padding: 8px; }
      .ph29-order-summary { display: flex; align-items: center; gap: 16px; background: linear-gradient(135deg, #8b5cf620, #7c3aed10); padding: 16px; border-radius: 16px; margin-bottom: 20px; }
      .ph29-svc-icon { font-size: 36px; }
      .ph29-svc-name { font-weight: 700; font-size: 16px; }
      .ph29-svc-provider { color: var(--text-muted); font-size: 13px; }
      .ph29-rating-sections { margin-bottom: 20px; }
      .ph29-rating-section { background: #fff; border: 2px solid #e5e7eb; border-radius: 16px; padding: 16px; margin-bottom: 12px; }
      .ph29-rating-label { display: flex; align-items: center; gap: 8px; font-weight: 600; margin-bottom: 12px; color: #374151; }
      .ph29-star-picker { display: flex; gap: 8px; justify-content: center; }
      .ph29-star-btn { background: none; border: none; font-size: 32px; cursor: pointer; transition: all 0.2s; opacity: 0.3; filter: grayscale(1); }
      .ph29-star-btn:hover { opacity: 0.7; transform: scale(1.2); }
      .ph29-star-btn.active { opacity: 1; filter: grayscale(0); transform: scale(1.1); }
      .ph29-selected-rating { text-align: center; margin-top: 8px; color: #6b7280; font-size: 14px; }
      .ph29-comment-section { margin-bottom: 16px; }
      .ph29-comment-label { display: block; font-weight: 600; margin-bottom: 8px; color: #374151; }
      .ph29-comment-input { width: 100%; padding: 12px; border: 2px solid #e5e7eb; border-radius: 12px; font-family: inherit; font-size: 14px; resize: none; }
      .ph29-comment-input:focus { outline: none; border-color: #8b5cf6; }
      .ph29-comment-hint { font-size: 12px; color: #9ca3af; margin-top: 4px; }
      .ph29-tags-section { margin-bottom: 20px; }
      .ph29-tags-label { font-weight: 600; margin-bottom: 8px; color: #374151; }
      .ph29-tags { display: flex; flex-wrap: wrap; gap: 8px; }
      .ph29-tag { padding: 6px 12px; background: #f3f4f6; border: none; border-radius: 20px; font-size: 13px; cursor: pointer; transition: all 0.2s; }
      .ph29-tag:hover { background: #e5e7eb; }
      .ph29-tag.active { background: #8b5cf6; color: #fff; }
      .ph29-submit-btn { width: 100%; padding: 16px; background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: #fff; border: none; border-radius: 14px; font-size: 16px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.2s; }
      .ph29-submit-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(139, 92, 246, 0.4); }
      
      /* Rating Card Styles */
      .ph29-review-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 16px; padding: 16px; margin-bottom: 12px; }
      .ph29-review-header { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
      .ph29-review-avatar { width: 44px; height: 44px; background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 18px; }
      .ph29-review-info { flex: 1; }
      .ph29-review-user { font-weight: 600; color: #1f2937; }
      .ph29-review-time { font-size: 12px; color: #9ca3af; }
      .ph29-review-stars { color: #f59e0b; font-size: 14px; }
      .ph29-review-comment { color: #374151; line-height: 1.6; margin-bottom: 12px; }
      .ph29-review-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; }
      .ph29-review-tag { padding: 4px 10px; background: #f3f4f6; border-radius: 12px; font-size: 12px; color: #6b7280; }
      .ph29-review-footer { display: flex; justify-content: space-between; padding-top: 12px; border-top: 1px solid #f3f4f6; }
      .ph29-verified { font-size: 12px; color: #10b981; }
      
      /* Stats Styles */
      .ph29-stats-container { display: grid; grid-template-columns: 120px 1fr; gap: 24px; background: #fff; border-radius: 16px; padding: 20px; margin-bottom: 20px; }
      .ph29-stats-main { text-align: center; }
      .ph29-avg-score { font-size: 48px; font-weight: 800; color: #1f2937; line-height: 1; }
      .ph29-avg-stars { font-size: 20px; margin: 8px 0; }
      .ph29-total-count { color: #6b7280; font-size: 14px; }
      .ph29-distribution { display: flex; flex-direction: column; gap: 8px; }
      .ph29-dist-row { display: flex; align-items: center; gap: 8px; }
      .ph29-dist-stars { width: 40px; font-size: 12px; color: #6b7280; }
      .ph29-dist-bar { flex: 1; height: 8px; background: #f3f4f6; border-radius: 4px; overflow: hidden; }
      .ph29-dist-fill { height: 100%; background: linear-gradient(90deg, #10b981, #34d399); border-radius: 4px; transition: width 0.3s; }
      .ph29-dist-count { width: 30px; text-align: left; font-size: 13px; color: #6b7280; }
      .ph29-no-ratings { text-align: center; padding: 40px; color: #9ca3af; }
      
      /* Dark theme adjustments */
      body:not(.light-theme) .ph29-rating-section { background: var(--bg-card); border-color: var(--border); }
      body:not(.light-theme) .ph29-comment-input { background: var(--bg-main); border-color: var(--border); color: var(--text-main); }
      body:not(.light-theme) .ph29-comment-label { color: var(--text-main); }
      body:not(.light-theme) .ph29-rating-label { color: var(--text-main); }
      body:not(.light-theme) .ph29-tags-label { color: var(--text-main); }
      body:not(.light-theme) .ph29-tag { background: var(--bg-hover); }
      body:not(.light-theme) .ph29-tag:hover { background: var(--bg-hover); filter: brightness(1.2); }
      body:not(.light-theme) .ph29-review-card { background: var(--bg-card); border-color: var(--border); }
      body:not(.light-theme) .ph29-review-user { color: var(--text-main); }
      body:not(.light-theme) .ph29-review-comment { color: var(--text-secondary); }
      body:not(.light-theme) .ph29-review-tag { background: var(--bg-hover); }
      body:not(.light-theme) .ph29-comment-section .ph29-comment-label { color: var(--text-main); }
      body:not(.light-theme) .ph29-tags-label { color: var(--text-main); }
      
      @media (max-width: 640px) {
        .ph29-stats-container { grid-template-columns: 1fr; text-align: center; }
        .ph29-distribution { margin-top: 16px; }
      }
    `;
    document.head.appendChild(style);
  }
})();

console.log('[Phase 29] Professional Rating System loaded');