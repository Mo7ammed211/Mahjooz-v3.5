// ══════════════════════════════════════════════════════════════════
//  محجوز — نظام التقييمات والمراجعات الموسّع
//  reviews.js  |  Phase 36
//  يشمل: تذكير تلقائي + عرض مراجعات + تقييم طلبات المتاجر
// ══════════════════════════════════════════════════════════════════

const _PH36_SHOWN_KEY = 'ph36_prompted_orders';

// ── مساعد: قرأ/كتب الطلبات المُعروض عليها التقييم (localStorage) ──
function _ph36_getShownSet() {
  try { return new Set(JSON.parse(localStorage.getItem(_PH36_SHOWN_KEY) || '[]')); }
  catch (e) { return new Set(); }
}
function _ph36_markShown(orderId) {
  const s = _ph36_getShownSet();
  s.add(orderId);
  // احتفظ بآخر 50 طلب فقط
  const arr = [...s].slice(-50);
  try { localStorage.setItem(_PH36_SHOWN_KEY, JSON.stringify(arr)); } catch (e) {}
}

// ══════════════════════════════════════════════════════════════════
//  1. تذكير تلقائي عند وجود طلبات مكتملة غير مُقيَّمة
// ══════════════════════════════════════════════════════════════════
window.ph36_autoPromptRating = function () {
  const u = State?.currentUser;
  if (!u || u.role !== 'customer') return;

  const orders   = AppData?.orders   || [];
  const ratings  = AppData?.ratings  || [];
  const shown    = _ph36_getShownSet();

  const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
  const now        = Date.now();

  const unrated = orders.filter(o => {
    if (o.customerId !== u.uid)           return false;
    if (o.status !== 'completed')         return false;
    if (shown.has(o.id))                  return false;
    if (ratings.some(r => r.orderId === o.id && r.customerId === u.uid)) return false;
    // فقط الطلبات المكتملة خلال آخر 7 أيام
    const ts = o.createdAt?.seconds ? o.createdAt.seconds * 1000
             : o.createdAt instanceof Date ? o.createdAt.getTime()
             : 0;
    return ts > 0 && (now - ts) < SEVEN_DAYS;
  });

  if (!unrated.length) return;

  // اعرض التذكير للطلب الأول فقط
  const o = unrated[0];
  _ph36_markShown(o.id);

  setTimeout(() => {
    _ph36_showPromptBanner(o);
  }, 1500);
};

function _ph36_showPromptBanner(o) {
  // أزل أي بانر قديم
  document.getElementById('ph36-prompt-banner')?.remove();

  const banner = document.createElement('div');
  banner.id = 'ph36-prompt-banner';
  banner.innerHTML = `
    <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap">
      <span style="font-size:28px">${o.svcIcon || '🛍️'}</span>
      <div style="flex:1;min-width:160px">
        <div style="font-weight:700;font-size:14px;margin-bottom:2px">${o.svcName || 'طلبك اكتمل!'}</div>
        <div style="font-size:12px;opacity:.85">شاركنا تجربتك — تقييمك يساعد الآخرين</div>
      </div>
      <div style="display:flex;gap:8px;flex-shrink:0">
        <button onclick="ph36_showOrderRatingModal('${o.id}')" 
                style="padding:8px 18px;background:#fff;color:#7c3aed;border:none;border-radius:10px;font-weight:700;font-size:13px;cursor:pointer">
          ⭐ قيّم الآن
        </button>
        <button onclick="document.getElementById('ph36-prompt-banner')?.remove()"
                style="width:30px;height:30px;background:rgba(255,255,255,.2);border:none;border-radius:50%;color:#fff;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center">✕</button>
      </div>
    </div>`;
  banner.style.cssText = `
    position:fixed;bottom:20px;right:20px;left:20px;max-width:520px;margin:0 auto;
    background:linear-gradient(135deg,#7c3aed,#6d28d9);color:#fff;
    border-radius:16px;padding:16px 18px;box-shadow:0 8px 30px rgba(124,58,237,.45);
    z-index:9999;animation:ph36-slide-in .4s ease;`;
  document.body.appendChild(banner);

  // إزالة تلقائية بعد 10 ثوانٍ
  setTimeout(() => banner?.remove(), 10000);
}

// ══════════════════════════════════════════════════════════════════
//  2. مودال التقييم الموسّع (خدمات + متاجر)
// ══════════════════════════════════════════════════════════════════
window.ph36_showOrderRatingModal = function (orderId) {
  document.getElementById('ph36-prompt-banner')?.remove();
  const o = (AppData?.orders || []).find(x => x.id === orderId);
  if (!o) { toast('لم يتم العثور على الطلب', 'error'); return; }

  const u          = State?.currentUser;
  const isStore    = o.type === 'store_order';
  const driver     = o.driverId ? (AppData?.users || []).find(x => x.id === o.driverId) : null;
  const driverName = driver?.name || o.driverName || '';

  const tagsPool = [
    '✅ دقيقون', '👍 محترفون', '⏰ في الوقت المحدد',
    '💎 جودة عالية', '😄 تعامل رائع', '🔁 سأكرر التعامل',
    '📦 تغليف ممتاز', '🚀 توصيل سريع', '💰 سعر مناسب',
  ];

  window._ph36_ratingData = { vendor: 0, driver: 0, tags: [] };

  openModal(`
    <div style="padding:4px">
      <div class="modal-header">
        <h2 class="modal-title">⭐ تقييم الطلب #${o.orderId || ''}</h2>
        <button class="modal-close" onclick="closeModal()">✕</button>
      </div>

      <!-- ملخص الطلب -->
      <div style="display:flex;align-items:center;gap:14px;background:linear-gradient(135deg,rgba(139,92,246,.1),rgba(139,92,246,.04));padding:14px;border-radius:14px;margin-bottom:20px">
        <span style="font-size:36px">${o.svcIcon || (isStore ? '🏪' : '🔷')}</span>
        <div>
          <div style="font-weight:700;font-size:15px">${o.svcName || 'الطلب'}</div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:2px">${o.vendorName || ''}${driverName ? ' · 🚗 ' + driverName : ''}</div>
        </div>
      </div>

      <!-- تقييم الخدمة/المزود -->
      <div style="background:var(--card-bg,#fff);border:2px solid var(--border);border-radius:14px;padding:16px;margin-bottom:12px">
        <div style="font-weight:700;font-size:14px;margin-bottom:12px;display:flex;align-items:center;gap:8px">
          <span>${isStore ? '🏪' : '🏠'}</span>
          <span>${isStore ? 'تقييم تجربة الشراء' : 'تقييم المزود والخدمة'}</span>
        </div>
        <div style="display:flex;gap:10px;justify-content:center;margin-bottom:8px" id="ph36-vendor-stars">
          ${[1,2,3,4,5].map(n => `
            <button onclick="ph36_pickStar('vendor',${n},this)"
                    style="font-size:36px;background:none;border:none;cursor:pointer;opacity:.3;transition:all .2s;filter:grayscale(1)">⭐</button>
          `).join('')}
        </div>
        <div id="ph36-vendor-text" style="text-align:center;font-size:14px;color:var(--text-muted);min-height:20px">اختر تقييمك</div>
      </div>

      <!-- تقييم المندوب (إن وجد) -->
      ${driverName ? `
      <div style="background:var(--card-bg,#fff);border:2px solid var(--border);border-radius:14px;padding:16px;margin-bottom:12px">
        <div style="font-weight:700;font-size:14px;margin-bottom:12px;display:flex;align-items:center;gap:8px">
          <span>🚗</span><span>تقييم المندوب: ${driverName}</span>
        </div>
        <div style="display:flex;gap:10px;justify-content:center;margin-bottom:8px" id="ph36-driver-stars">
          ${[1,2,3,4,5].map(n => `
            <button onclick="ph36_pickStar('driver',${n},this)"
                    style="font-size:36px;background:none;border:none;cursor:pointer;opacity:.3;transition:all .2s;filter:grayscale(1)">⭐</button>
          `).join('')}
        </div>
        <div id="ph36-driver-text" style="text-align:center;font-size:14px;color:var(--text-muted);min-height:20px">اختياري</div>
      </div>` : ''}

      <!-- التعليق -->
      <div style="margin-bottom:16px">
        <label style="display:block;font-weight:700;font-size:14px;margin-bottom:8px;color:var(--text-primary)">💬 شاركنا تجربتك <span style="font-weight:400;color:var(--text-muted)">(اختياري)</span></label>
        <textarea id="ph36-comment" rows="3" placeholder="اكتب ما يعجبك أو ما يمكن تحسينه..."
                  style="width:100%;padding:12px;border:2px solid var(--border);border-radius:12px;font-family:inherit;font-size:14px;resize:none;background:var(--card-bg);color:var(--text-primary);box-sizing:border-box"></textarea>
      </div>

      <!-- علامات سريعة -->
      <div style="margin-bottom:20px">
        <div style="font-weight:700;font-size:13px;margin-bottom:10px;color:var(--text-secondary)">🏷️ علامات سريعة <span style="font-weight:400">(اختياري)</span></div>
        <div style="display:flex;flex-wrap:wrap;gap:8px">
          ${tagsPool.map(t => `
            <button onclick="ph36_toggleTag(this,'${t}')"
                    style="padding:6px 12px;background:var(--surface,#f3f4f6);border:1px solid var(--border);border-radius:20px;font-size:12px;cursor:pointer;transition:all .2s;color:var(--text-secondary)">
              ${t}
            </button>`).join('')}
        </div>
      </div>

      <button onclick="ph36_submitRating('${orderId}')"
              style="width:100%;padding:16px;background:linear-gradient(135deg,#8b5cf6,#7c3aed);color:#fff;border:none;border-radius:14px;font-size:16px;font-weight:700;cursor:pointer;transition:all .2s">
        ⭐ إرسال التقييم
      </button>
    </div>
  `);
};

window.ph36_pickStar = function (type, n, btn) {
  window._ph36_ratingData[type] = n;
  const texts = { 1:'🤢 ضعيف', 2:'😐 مقبول', 3:'👍 جيد', 4:'😊 جيد جداً', 5:'🤩 ممتاز!' };
  const container = btn.closest('div[id^="ph36-"]') || btn.parentElement;
  container.querySelectorAll('button').forEach((b, i) => {
    b.style.opacity     = i < n ? '1'   : '0.3';
    b.style.filter      = i < n ? 'none' : 'grayscale(1)';
    b.style.transform   = i < n ? 'scale(1.1)' : 'scale(1)';
  });
  const txtEl = document.getElementById('ph36-' + type + '-text');
  if (txtEl) txtEl.textContent = texts[n] || '';
};

window.ph36_toggleTag = function (btn, tag) {
  const active = btn.style.background !== 'rgb(243, 244, 246)' && btn.getAttribute('data-active') === '1';
  if (active) {
    btn.setAttribute('data-active', '0');
    btn.style.background = 'var(--surface,#f3f4f6)';
    btn.style.color      = 'var(--text-secondary)';
    btn.style.borderColor = 'var(--border)';
    window._ph36_ratingData.tags = window._ph36_ratingData.tags.filter(t => t !== tag);
  } else {
    btn.setAttribute('data-active', '1');
    btn.style.background  = '#8b5cf6';
    btn.style.color       = '#fff';
    btn.style.borderColor = '#8b5cf6';
    window._ph36_ratingData.tags.push(tag);
  }
};

window.ph36_submitRating = async function (orderId) {
  const d = window._ph36_ratingData || {};
  if (!d.vendor) { toast('يرجى اختيار تقييم المزود أولاً', 'error'); return; }

  const o = (AppData?.orders || []).find(x => x.id === orderId);
  const u = State?.currentUser;
  if (!o || !u) return;

  const comment = document.getElementById('ph36-comment')?.value?.trim() || '';

  showLoader('جاري إرسال التقييم...');
  try {
    await db.collection('ratings').add({
      orderId,
      customerId:    u.uid,
      customerName:  u.name || 'عميل',
      serviceId:     o.svcId || null,
      vendorId:      o.vendorId || null,
      vendorStars:   d.vendor,
      vendorComment: comment,
      driverId:      o.driverId || null,
      driverStars:   d.driver || null,
      tags:          d.tags || [],
      orderType:     o.type || 'service',
      svcName:       o.svcName || '',
      svcIcon:       o.svcIcon || '',
      createdAt:     firebase.firestore.FieldValue.serverTimestamp(),
    });

    // تحديث cache محلي
    if (!AppData.ratings) AppData.ratings = [];
    AppData.ratings.push({
      orderId, customerId: u.uid, serviceId: o.svcId || null,
      vendorStars: d.vendor, vendorComment: comment,
      tags: d.tags || [], driverStars: d.driver || null,
    });

    hideLoader();
    closeModal();
    _ph36_markShown(orderId);
    toast('شكراً على تقييمك! 🙏 رأيك يهمنا', 'success');
  } catch (e) {
    hideLoader();
    console.error('[Reviews] فشل إرسال التقييم:', e);
    toast('حدث خطأ، حاول مرة أخرى', 'error');
  }
};

// ══════════════════════════════════════════════════════════════════
//  3. عرض التقييمات الكاملة لخدمة معينة
// ══════════════════════════════════════════════════════════════════
window.ph36_showReviewsModal = async function (svcId, svcName) {
  openModal(`
    <div class="modal-header">
      <h2 class="modal-title">⭐ تقييمات: ${svcName || 'الخدمة'}</h2>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div id="ph36-reviews-body" style="padding:8px 0">
      <div style="text-align:center;padding:40px;color:var(--text-muted)">⏳ جاري التحميل...</div>
    </div>
  `);

  try {
    const snap = await db.collection('ratings')
      .where('serviceId', '==', svcId)
      .orderBy('createdAt', 'desc')
      .limit(30)
      .get();
    const reviews = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    _ph36_renderReviews(reviews, svcId);
  } catch (e) {
    // Firestore index قد يكون غير مبني — fallback على البيانات المحلية
    const reviews = (AppData?.ratings || []).filter(r => r.serviceId === svcId);
    _ph36_renderReviews(reviews, svcId);
  }
};

function _ph36_renderReviews(reviews, svcId) {
  const el = document.getElementById('ph36-reviews-body');
  if (!el) return;

  if (!reviews.length) {
    el.innerHTML = `
      <div style="text-align:center;padding:60px 20px">
        <div style="font-size:48px;margin-bottom:16px">💬</div>
        <div style="font-size:16px;font-weight:700;color:var(--text-primary);margin-bottom:8px">لا توجد تقييمات بعد</div>
        <div style="font-size:13px;color:var(--text-muted)">كن أول من يُقيّم هذه الخدمة</div>
      </div>`;
    return;
  }

  const count = reviews.length;
  const avg   = reviews.reduce((s, r) => s + (r.vendorStars || 0), 0) / count;
  const dist  = [0,0,0,0,0];
  reviews.forEach(r => { const s = Math.round(r.vendorStars||0); if (s>=1&&s<=5) dist[s-1]++; });
  const maxD  = Math.max(...dist, 1);
  const stars = n => Array(n).fill('⭐').join('') + Array(5-n).fill('☆').join('');

  el.innerHTML = `
    <!-- إحصائيات -->
    <div style="display:grid;grid-template-columns:100px 1fr;gap:20px;background:var(--card-bg);border-radius:16px;padding:18px;margin-bottom:20px;border:1px solid var(--border)">
      <div style="text-align:center">
        <div style="font-size:52px;font-weight:900;line-height:1;color:var(--text-primary)">${avg.toFixed(1)}</div>
        <div style="font-size:18px;margin:6px 0">${stars(Math.round(avg))}</div>
        <div style="font-size:12px;color:var(--text-muted)">${count} تقييم</div>
      </div>
      <div style="display:flex;flex-direction:column;justify-content:center;gap:6px">
        ${[5,4,3,2,1].map(n => `
          <div style="display:flex;align-items:center;gap:8px">
            <span style="font-size:12px;color:var(--text-muted);width:28px">${n} ⭐</span>
            <div style="flex:1;background:var(--border);border-radius:6px;height:7px;overflow:hidden">
              <div style="width:${(dist[n-1]/maxD)*100}%;height:100%;background:linear-gradient(90deg,#f59e0b,#fbbf24);border-radius:6px;transition:width .3s"></div>
            </div>
            <span style="font-size:12px;color:var(--text-muted);width:18px">${dist[n-1]}</span>
          </div>`).join('')}
      </div>
    </div>

    <!-- بطاقات التقييمات -->
    <div style="display:flex;flex-direction:column;gap:12px">
      ${reviews.map(r => {
        const nameInit = (r.customerName || 'ع').charAt(0).toUpperCase();
        const timeAgo  = _ph36_timeAgo(r.createdAt);
        const tagsHtml = (r.tags||[]).length
          ? `<div style="display:flex;flex-wrap:wrap;gap:5px;margin-top:8px">${r.tags.map(t=>`<span style="padding:3px 9px;background:var(--surface,#f3f4f6);border-radius:10px;font-size:11px;color:var(--text-muted)">${t}</span>`).join('')}</div>`
          : '';
        return `
          <div style="background:var(--card-bg);border:1px solid var(--border);border-radius:14px;padding:16px">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px">
              <div style="width:42px;height:42px;background:linear-gradient(135deg,#8b5cf6,#7c3aed);color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:16px;flex-shrink:0">${nameInit}</div>
              <div style="flex:1">
                <div style="font-weight:700;font-size:14px;color:var(--text-primary)">${r.customerName||'عميل'}</div>
                <div style="font-size:11px;color:var(--text-muted)">${timeAgo}</div>
              </div>
              <div style="font-size:15px">${stars(Math.round(r.vendorStars||0))}</div>
            </div>
            ${r.vendorComment ? `<div style="font-size:14px;color:var(--text-secondary);line-height:1.6">${r.vendorComment}</div>` : ''}
            ${tagsHtml}
            <div style="margin-top:10px;padding-top:8px;border-top:1px solid var(--border);font-size:11px;color:#10b981">✅ شراء موثّق</div>
          </div>`;
      }).join('')}
    </div>`;
}

function _ph36_timeAgo(ts) {
  if (!ts) return '';
  const d    = ts?.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
  const diff = Math.floor((Date.now() - d) / 1000);
  if (diff < 60)     return 'الآن';
  if (diff < 3600)   return 'منذ ' + Math.floor(diff/60) + ' دقيقة';
  if (diff < 86400)  return 'منذ ' + Math.floor(diff/3600) + ' ساعة';
  if (diff < 604800) return 'منذ ' + Math.floor(diff/86400) + ' يوم';
  return d.toLocaleDateString('ar-YE');
}

// ══════════════════════════════════════════════════════════════════
//  4. CSS
// ══════════════════════════════════════════════════════════════════
(function () {
  if (window._ph36_styles) return;
  window._ph36_styles = true;
  const s = document.createElement('style');
  s.textContent = `
    @keyframes ph36-slide-in {
      from { transform: translateY(20px); opacity: 0; }
      to   { transform: translateY(0);    opacity: 1; }
    }
    #ph36-reviews-btn {
      display:inline-flex;align-items:center;gap:4px;font-size:12px;
      color:var(--primary);cursor:pointer;padding:2px 0;background:none;border:none;
      font-family:inherit;text-decoration:underline;
    }
    #ph36-reviews-btn:hover { opacity:.75; }
  `;
  document.head.appendChild(s);
})();

console.log('[Phase 36] Reviews & Auto-Rating System loaded');
