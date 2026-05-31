// ═══════════════════════════════════════════════════════
//  محجوز — نظام العروض والخصومات (قسم مستقل)
//  يجمع العروض من: الحجوزات، الخدمات المهنية، المتاجر
// ═══════════════════════════════════════════════════════
'use strict';

if (!AppData.offers) AppData.offers = [];

// ─── دالة مساعدة: جلب العرض النشط لعنصر معيّن ────────
window.ph_getActiveOffer = function (sourceId) {
  if (!sourceId || !AppData.offers) return null;
  const now = new Date();
  return AppData.offers.find(o => {
    if (!o.active || o.sourceId !== sourceId) return false;
    if (o.expiresAt) {
      const exp = o.expiresAt.toDate ? o.expiresAt.toDate() : new Date(o.expiresAt);
      if (exp < now) return false;
    }
    return true;
  }) || null;
};

// ─── دالة مساعدة: إنشاء HTML بادج الخصم ──────────────
window.ph_offerBadgeHtml = function (pct, style) {
  if (!pct || pct <= 0) return '';
  return `<div style="position:absolute;top:10px;${style||'right:10px'};z-index:3;background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;font-weight:900;font-size:11px;border-radius:50%;width:46px;height:46px;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(239,68,68,0.45);line-height:1.2;text-align:center;flex-direction:column;gap:0">
    <span style="font-size:9px;line-height:1">خصم</span>
    <span style="font-size:13px;font-weight:900;line-height:1">${pct}%</span>
  </div>`;
};

// ─── دالة مساعدة: HTML عرض السعر مع الخصم ────────────
window.ph_offerPriceHtml = function (offer, fallbackHtml, currency) {
  if (!offer) return fallbackHtml;
  const cur = currency || 'ريال';
  const disc = offer.discountedPrice || 0;
  const orig = offer.originalPrice || 0;
  const save = orig > disc ? orig - disc : 0;
  return `<div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap">
    <span style="font-weight:900;color:#10b981;font-size:inherit">${disc.toLocaleString('ar-YE')} <span style="font-size:11px;font-weight:600;color:var(--text-muted)">${cur}</span></span>
    ${orig ? `<span style="font-size:12px;color:var(--text-muted);text-decoration:line-through">${orig.toLocaleString('ar-YE')}</span>` : ''}
    ${save > 0 ? `<span style="font-size:11px;font-weight:700;color:#ef4444;background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);border-radius:5px;padding:1px 6px">وفّر ${save.toLocaleString('ar-YE')}</span>` : ''}
  </div>`;
};

// ─── تحميل العروض عند loadAllData ─────────────────────
const __ph_offersOriginal = window.loadAllData;
window.loadAllData = async function () {
  if (__ph_offersOriginal) await __ph_offersOriginal.apply(this, arguments);
  try {
    const snap = await db.collection('offers').orderBy('createdAt', 'desc').get().catch(() => null);
    AppData.offers = snap ? snap.docs.map(d => ({ id: d.id, ...d.data() })) : [];
  } catch (e) {
    AppData.offers = [];
    console.warn('[Offers] تحميل العروض:', e.message);
  }
};

// ─── صفحة العروض للعميل ───────────────────────────────
window.ph_offersRenderPage = function () {
  const now = new Date();
  if (!window.__ph_offersFilter) window.__ph_offersFilter = 'all';
  const filterSection = window.__ph_offersFilter;

  const all = (AppData.offers || []).filter(o => {
    if (!o.active) return false;
    if (o.expiresAt) {
      const exp = o.expiresAt.toDate ? o.expiresAt.toDate() : new Date(o.expiresAt);
      if (exp < now) return false;
    }
    return true;
  }).sort((a, b) => (b.discountPercent || 0) - (a.discountPercent || 0));

  const filtered = filterSection === 'all' ? all : all.filter(o => o.sourceSection === filterSection);

  const sectionIcons  = { bookings: '📅', services: '🔧', stores: '🏪', rentals: '🚗', digital: '⚡' };
  const sectionLabels = { bookings: 'الحجوزات', services: 'الخدمات المهنية', stores: 'المتاجر', rentals: 'التأجير', digital: 'الرقمية' };

  const renderCard = (offer) => {
    const discount  = offer.discountPercent || (offer.originalPrice > 0 ? Math.round(((offer.originalPrice - offer.discountedPrice) / offer.originalPrice) * 100) : 0);
    const secIcon   = sectionIcons[offer.sourceSection]  || '🏷️';
    const secLabel  = sectionLabels[offer.sourceSection] || '';
    const expiresAt = offer.expiresAt ? (offer.expiresAt.toDate ? offer.expiresAt.toDate() : new Date(offer.expiresAt)) : null;
    const daysLeft  = expiresAt ? Math.max(0, Math.ceil((expiresAt - now) / 86400000)) : null;

    return `
    <div style="background:var(--bg-card);border:1px solid var(--glass-border);border-radius:18px;overflow:hidden;transition:transform 0.2s,box-shadow 0.2s;position:relative;" onmouseover="this.style.transform='translateY(-4px)';this.style.boxShadow='0 12px 40px rgba(0,0,0,0.2)'" onmouseout="this.style.transform='';this.style.boxShadow=''">
      <div style="position:absolute;top:12px;right:12px;z-index:2;background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;font-weight:900;font-size:15px;border-radius:50%;width:52px;height:52px;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(239,68,68,0.45);line-height:1">
        <span style="font-size:11px;display:block;text-align:center">خصم<br>${discount}%</span>
      </div>
      <div style="height:160px;background:linear-gradient(135deg,rgba(139,92,246,0.13),rgba(16,185,129,0.08));display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden">
        ${offer.imageBase64 ? `<img src="${offer.imageBase64}" style="width:100%;height:100%;object-fit:cover">` : `<span style="font-size:58px;opacity:0.55">${secIcon}</span>`}
        <div style="position:absolute;bottom:8px;left:8px;background:rgba(0,0,0,0.62);color:#fff;font-size:11px;font-weight:700;border-radius:6px;padding:3px 8px">${secIcon} ${secLabel}</div>
        ${daysLeft !== null ? `<div style="position:absolute;top:8px;left:8px;background:${daysLeft <= 2 ? '#ef4444' : 'rgba(0,0,0,0.62)'};color:#fff;font-size:11px;font-weight:700;border-radius:6px;padding:3px 8px">⏰ ${daysLeft === 0 ? 'آخر يوم!' : daysLeft + ' أيام متبقية'}</div>` : ''}
      </div>
      <div style="padding:16px">
        <div style="font-size:15px;font-weight:800;color:var(--text-main);margin-bottom:5px;line-height:1.4">${escHtml(offer.title)}</div>
        ${offer.desc ? `<div style="font-size:12px;color:var(--text-muted);margin-bottom:10px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${escHtml(offer.desc)}</div>` : ''}
        <div style="display:flex;align-items:baseline;gap:10px;margin-bottom:14px;flex-wrap:wrap">
          <div style="font-size:22px;font-weight:900;color:#10b981">${(offer.discountedPrice || 0).toLocaleString('ar-YE')} <span style="font-size:12px;font-weight:600">ريال</span></div>
          ${offer.originalPrice ? `<div style="font-size:13px;color:var(--text-muted);text-decoration:line-through">${offer.originalPrice.toLocaleString('ar-YE')} ريال</div>` : ''}
          ${offer.originalPrice && offer.discountedPrice ? `<div style="font-size:12px;font-weight:700;color:#ef4444;background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);border-radius:6px;padding:2px 7px">وفّر ${(offer.originalPrice - offer.discountedPrice).toLocaleString('ar-YE')} ريال</div>` : ''}
        </div>
        <button class="btn btn-primary" style="width:100%;border-radius:12px;font-weight:700;font-size:14px" onclick="ph_offerAction('${offer.id}','${offer.sourceType || ''}','${offer.sourceId || ''}','${offer.sourceSection || ''}')">
          🛒 اطلب الآن بالسعر المخفض
        </button>
      </div>
    </div>`;
  };

  const filterBtns = [
    { k: 'all',      l: '🌟 الكل',             c: '#8b5cf6' },
    { k: 'bookings', l: '📅 الحجوزات',         c: '#3b82f6' },
    { k: 'services', l: '🔧 الخدمات المهنية',  c: '#10b981' },
    { k: 'stores',   l: '🏪 المتاجر',           c: '#f59e0b' },
    { k: 'rentals',  l: '🚗 التأجير',           c: '#ec4899' },
    { k: 'digital',  l: '⚡ الرقمية',           c: '#06b6d4' },
  ];

  const totalSavings = filtered.reduce((s, o) => s + Math.max(0, (o.originalPrice || 0) - (o.discountedPrice || 0)), 0);

  return `<div id="app-content" style="padding-bottom:80px">
    <div style="padding:8px 16px 0"><button class="back-btn" onclick="goBack('home')">→ رجوع</button></div>
    <div style="background:linear-gradient(135deg,rgba(239,68,68,0.1),rgba(139,92,246,0.07),rgba(16,185,129,0.05));padding:50px 20px 36px;text-align:center;border-radius:0 0 32px 32px;border-bottom:1px solid var(--glass-border);margin-top:8px;margin-bottom:0">
      <div style="font-size:52px;margin-bottom:10px">🏷️</div>
      <h1 style="font-size:34px;font-weight:900;margin-bottom:8px;background:linear-gradient(135deg,#ef4444,#f59e0b,#8b5cf6);-webkit-background-clip:text;-webkit-text-fill-color:transparent">العروض والخصومات</h1>
      <p style="color:var(--text-secondary);font-size:15px;max-width:480px;margin:0 auto">أفضل العروض من الحجوزات والخدمات المهنية والمتاجر في مكان واحد</p>
      ${totalSavings > 0 ? `<div style="display:inline-flex;align-items:center;gap:8px;margin-top:14px;background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.3);border-radius:99px;padding:7px 18px;color:#10b981;font-weight:700;font-size:13px">💰 وفّر حتى ${totalSavings.toLocaleString('ar-YE')} ريال على العروض المتاحة</div>` : ''}
    </div>

    <div style="padding:18px;display:flex;gap:10px;flex-wrap:wrap;justify-content:center">
      ${filterBtns.map(f => `
        <button onclick="window.__ph_offersFilter='${f.k}';render()" style="border:2px solid ${filterSection === f.k ? f.c : 'var(--glass-border)'};background:${filterSection === f.k ? f.c + '1A' : 'transparent'};color:${filterSection === f.k ? f.c : 'var(--text-secondary)'};border-radius:99px;padding:8px 20px;font-weight:700;font-size:13px;cursor:pointer;transition:all 0.2s">
          ${f.l} ${filterSection === f.k && filtered.length ? `<span style="background:${f.c};color:#fff;border-radius:99px;padding:1px 7px;font-size:11px;margin-right:4px">${filtered.length}</span>` : ''}
        </button>`).join('')}
    </div>

    <div style="padding:0 16px 24px">
      ${filtered.length ? `
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:18px">
          ${filtered.map(renderCard).join('')}
        </div>
      ` : `
        <div class="empty-state" style="padding:80px 0">
          <div class="empty-icon">🏷️</div>
          <div class="empty-title">لا توجد عروض متاحة ${filterSection !== 'all' ? 'في هذا القسم' : 'حالياً'}</div>
          <div class="empty-desc">تابع هذا القسم بانتظام لأحدث العروض والخصومات الحصرية</div>
          ${filterSection !== 'all' ? `<button class="btn btn-secondary" style="margin-top:16px" onclick="window.__ph_offersFilter='all';render()">← عرض كل الأقسام</button>` : ''}
        </div>
      `}
    </div>
  </div>`;
};

// ─── تنفيذ إجراء العرض ────────────────────────────────
window.ph_offerAction = function (offerId, sourceType, sourceId, sourceSection) {
  if (sourceType === 'service' && sourceId) {
    if (typeof bookService === 'function') bookService(sourceId);
    else navigate('listing', { section: sourceSection || 'bookings' });
  } else if (sourceType === 'store_product' && sourceId) {
    navigate('listing', { section: 'stores' });
  } else {
    navigate('listing', { section: sourceSection || 'bookings' });
  }
};

// ─── لوحة إدارة العروض (للمدير) ──────────────────────
window.renderAdminOffers = function () {
  const now = new Date();
  const offers = AppData.offers || [];

  const sectionLabels = { bookings: '📅 الحجوزات', services: '🔧 الخدمات', stores: '🏪 المتاجر', rentals: '🚗 التأجير', digital: '⚡ الرقمية' };
  const sourceTypeLabels = { service: 'خدمة', store_product: 'منتج متجر', rental_product: 'منتج تأجير', digital_product: 'منتج رقمي', manual: 'يدوي' };

  const activeOffers  = offers.filter(o => o.active && (!o.expiresAt || (o.expiresAt.toDate ? o.expiresAt.toDate() : new Date(o.expiresAt)) > now));
  const expiredOffers = offers.filter(o => o.expiresAt && (o.expiresAt.toDate ? o.expiresAt.toDate() : new Date(o.expiresAt)) <= now);

  const rows = offers.map(offer => {
    const discount   = offer.discountPercent || (offer.originalPrice > 0 ? Math.round(((offer.originalPrice - offer.discountedPrice) / offer.originalPrice) * 100) : 0);
    const expiresAt  = offer.expiresAt ? (offer.expiresAt.toDate ? offer.expiresAt.toDate() : new Date(offer.expiresAt)) : null;
    const expired    = expiresAt && expiresAt < now;
    const daysLeft   = expiresAt ? Math.max(0, Math.ceil((expiresAt - now) / 86400000)) : null;

    return `
    <tr style="${!offer.active || expired ? 'opacity:0.52' : ''}">
      <td>
        <div style="display:flex;align-items:center;gap:10px">
          ${offer.imageBase64 ? `<img src="${offer.imageBase64}" style="width:42px;height:42px;border-radius:10px;object-fit:cover;flex-shrink:0">` : `<div style="width:42px;height:42px;border-radius:10px;background:rgba(239,68,68,0.1);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">🏷️</div>`}
          <div>
            <div style="font-weight:700;font-size:13px">${escHtml(offer.title || '—')}</div>
            <div style="font-size:11px;color:var(--text-muted)">${sourceTypeLabels[offer.sourceType] || offer.sourceType || '—'}</div>
          </div>
        </div>
      </td>
      <td><span class="badge badge-purple" style="font-size:11px">${sectionLabels[offer.sourceSection] || '—'}</span></td>
      <td>
        <div style="font-weight:900;color:#ef4444;font-size:16px">-${discount}%</div>
        <div style="font-size:11px;color:var(--text-muted)">
          ${(offer.discountedPrice || 0).toLocaleString('ar-YE')} بدلاً من ${(offer.originalPrice || 0).toLocaleString('ar-YE')}
        </div>
      </td>
      <td>
        ${expired
          ? '<span class="badge badge-rose">منتهية ⚠️</span>'
          : expiresAt
            ? `<span class="badge badge-gold">${daysLeft === 0 ? 'آخر يوم' : daysLeft + ' يوم'}</span><div style="font-size:10px;color:var(--text-muted);margin-top:2px">${expiresAt.toLocaleDateString('ar-YE')}</div>`
            : '<span class="badge badge-teal">دائمة ♾️</span>'}
      </td>
      <td>
        <label class="toggle-switch" style="scale:0.8;transform-origin:right center">
          <input type="checkbox" ${offer.active ? 'checked' : ''} onchange="ph_toggleOffer('${offer.id}',this.checked)">
          <span class="toggle-slider"></span>
        </label>
      </td>
      <td>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          <button class="btn btn-secondary btn-sm" onclick="ph_editOfferModal('${offer.id}')">✏️</button>
          <button class="btn btn-sm" style="background:rgba(239,68,68,0.1);color:#ef4444;border:1px solid rgba(239,68,68,0.25)" onclick="ph_deleteOffer('${offer.id}')">🗑️</button>
        </div>
      </td>
    </tr>`;
  });

  return `
  <div style="padding:16px">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px">
      <div>
        <h2 style="margin:0;font-size:22px;font-weight:800">🏷️ إدارة العروض والخصومات</h2>
        <p style="color:var(--text-muted);margin:4px 0 0;font-size:13px">العروض المفعّلة تظهر في قسم العروض للعملاء مباشرةً</p>
      </div>
      <button class="btn btn-primary" onclick="ph_showAddOfferModal()">➕ إضافة عرض يدوي</button>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;margin-bottom:22px">
      ${[
        { n: offers.length,                                                            l: 'إجمالي العروض',       c: 'var(--primary)' },
        { n: activeOffers.length,                                                      l: 'عروض نشطة',           c: '#10b981' },
        { n: expiredOffers.length,                                                     l: 'منتهية الصلاحية',     c: '#ef4444' },
        { n: offers.filter(o => o.sourceSection === 'bookings').length,                l: 'عروض الحجوزات',       c: '#3b82f6' },
        { n: offers.filter(o => o.sourceSection === 'services').length,                l: 'عروض الخدمات',        c: '#8b5cf6' },
        { n: offers.filter(o => o.sourceSection === 'stores').length,                  l: 'عروض المتاجر',        c: '#f59e0b' },
        { n: offers.filter(o => o.sourceSection === 'rentals').length,                 l: 'عروض التأجير',        c: '#ec4899' },
        { n: offers.filter(o => o.sourceSection === 'digital').length,                 l: 'عروض الرقمية',        c: '#06b6d4' },
      ].map(s => `
        <div style="background:var(--bg-card);border:1px solid var(--glass-border);border-radius:14px;padding:14px;text-align:center">
          <div style="font-size:26px;font-weight:900;color:${s.c}">${s.n}</div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:2px">${s.l}</div>
        </div>`).join('')}
    </div>

    ${offers.length ? `
    <div class="table-wrap">
      <table class="admin-table">
        <thead><tr><th>العرض</th><th>القسم</th><th>الخصم والسعر</th><th>الانتهاء</th><th>الحالة</th><th>إجراءات</th></tr></thead>
        <tbody>${rows.join('')}</tbody>
      </table>
    </div>` : `
    <div class="empty-state">
      <div class="empty-icon">🏷️</div>
      <div class="empty-title">لا توجد عروض بعد</div>
      <div class="empty-desc">أضف عروضاً يدوية هنا، أو فعّل خيار "إضافة للعروض" عند إضافة أي خدمة أو منتج في الأقسام الأخرى</div>
      <button class="btn btn-primary" style="margin-top:16px" onclick="ph_showAddOfferModal()">➕ إضافة عرض يدوي</button>
    </div>`}
  </div>`;
};

// ─── تفعيل/إيقاف عرض ─────────────────────────────────
window.ph_toggleOffer = async function (offerId, active) {
  try {
    await db.collection('offers').doc(offerId).update({ active });
    const o = (AppData.offers || []).find(x => x.id === offerId);
    if (o) o.active = active;
    toast(active ? '✅ تم تفعيل العرض' : 'تم إيقاف العرض', 'success');
    render();
  } catch (e) { toast('خطأ: ' + e.message, 'error'); }
};

// ─── حذف عرض ─────────────────────────────────────────
window.ph_deleteOffer = async function (offerId) {
  if (!confirm('هل تريد حذف هذا العرض نهائياً؟')) return;
  showLoader();
  try {
    await fsDelete('offers', offerId);
    AppData.offers = (AppData.offers || []).filter(o => o.id !== offerId);
    toast('تم حذف العرض', 'success');
    render();
  } catch (e) { toast('خطأ: ' + e.message, 'error'); } finally { hideLoader(); }
};

// ─── مودال تعديل عرض ────────────────────────────────
window.ph_editOfferModal = function (offerId) {
  const offer = (AppData.offers || []).find(o => o.id === offerId);
  if (!offer) return;
  const expiresAt  = offer.expiresAt ? (offer.expiresAt.toDate ? offer.expiresAt.toDate() : new Date(offer.expiresAt)) : null;
  const expiresStr = expiresAt ? expiresAt.toISOString().split('T')[0] : '';
  const sectionOptions = [
    { v: 'bookings', l: '📅 الحجوزات' },
    { v: 'services', l: '🔧 الخدمات المهنية' },
    { v: 'stores',   l: '🏪 المتاجر' },
    { v: 'rentals',  l: '🚗 التأجير' },
    { v: 'digital',  l: '⚡ المنتجات الرقمية' },
  ];
  openModal(`
    <div class="modal-header"><h2 class="modal-title">✏️ تعديل العرض</h2><button class="modal-close" onclick="closeModal()">✕</button></div>
    <div style="padding:16px;display:flex;flex-direction:column;gap:14px;max-height:75vh;overflow-y:auto">
      <div class="form-group">
        <label class="form-label">عنوان العرض *</label>
        <input class="form-control" id="oe-title" value="${escAttr(offer.title || '')}">
      </div>
      <div class="form-group">
        <label class="form-label">وصف العرض</label>
        <textarea class="form-control" id="oe-desc" rows="2">${escHtml(offer.desc || '')}</textarea>
      </div>
      <div class="form-group">
        <label class="form-label">القسم</label>
        <select class="form-control" id="oe-section">
          ${sectionOptions.map(s => `<option value="${s.v}" ${offer.sourceSection === s.v ? 'selected' : ''}>${s.l}</option>`).join('')}
        </select>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group">
          <label class="form-label">السعر الأصلي (ريال)</label>
          <input class="form-control" id="oe-orig" type="number" value="${offer.originalPrice || ''}" oninput="ph_offerCalc('oe')">
        </div>
        <div class="form-group">
          <label class="form-label">نسبة الخصم (%)</label>
          <input class="form-control" id="oe-pct" type="number" min="1" max="99" value="${offer.discountPercent || ''}" oninput="ph_offerCalc('oe')">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">السعر بعد الخصم (ريال)</label>
        <input class="form-control" id="oe-disc" type="number" value="${offer.discountedPrice || ''}">
      </div>
      <div class="form-group">
        <label class="form-label">تاريخ انتهاء العرض (فارغ = دائم)</label>
        <input class="form-control" id="oe-expires" type="date" value="${expiresStr}">
      </div>
      <div class="form-group">
        <label class="form-label" style="display:flex;align-items:center;gap:8px;cursor:pointer">
          <input type="checkbox" id="oe-active" ${offer.active ? 'checked' : ''} style="width:18px;height:18px">
          <span>نشط (مرئي للعملاء)</span>
        </label>
      </div>
      <button class="btn btn-primary btn-block" onclick="ph_saveEditOffer('${offerId}')">💾 حفظ التعديلات</button>
    </div>`);
};

// ─── مودال إضافة عرض يدوي ────────────────────────────
window.ph_showAddOfferModal = function () {
  const sectionOptions = [
    { v: 'bookings', l: '📅 الحجوزات' },
    { v: 'services', l: '🔧 الخدمات المهنية' },
    { v: 'stores',   l: '🏪 المتاجر' },
    { v: 'rentals',  l: '🚗 التأجير' },
    { v: 'digital',  l: '⚡ المنتجات الرقمية' },
  ];
  openModal(`
    <div class="modal-header"><h2 class="modal-title">➕ إضافة عرض يدوي</h2><button class="modal-close" onclick="closeModal()">✕</button></div>
    <div style="padding:16px;display:flex;flex-direction:column;gap:14px;max-height:75vh;overflow-y:auto">
      <div class="form-group">
        <label class="form-label">عنوان العرض *</label>
        <input class="form-control" id="om-title" placeholder="مثال: خصم 30% على حجز الفندق الذهبي">
      </div>
      <div class="form-group">
        <label class="form-label">وصف العرض</label>
        <textarea class="form-control" id="om-desc" rows="2" placeholder="تفاصيل إضافية عن العرض..."></textarea>
      </div>
      <div class="form-group">
        <label class="form-label">القسم *</label>
        <select class="form-control" id="om-section">
          ${sectionOptions.map(s => `<option value="${s.v}">${s.l}</option>`).join('')}
        </select>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group">
          <label class="form-label">السعر الأصلي (ريال) *</label>
          <input class="form-control" id="om-orig" type="number" placeholder="500" oninput="ph_offerCalc('om')">
        </div>
        <div class="form-group">
          <label class="form-label">نسبة الخصم (%) *</label>
          <input class="form-control" id="om-pct" type="number" min="1" max="99" placeholder="25" oninput="ph_offerCalc('om')">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">السعر بعد الخصم (يُحسب تلقائياً)</label>
        <input class="form-control" id="om-disc" type="number" placeholder="سيُحسب تلقائياً">
      </div>
      <div class="form-group">
        <label class="form-label">تاريخ انتهاء العرض (اختياري)</label>
        <input class="form-control" id="om-expires" type="date">
      </div>
      <button class="btn btn-primary btn-block" onclick="ph_saveManualOffer()">💾 حفظ العرض</button>
    </div>`);
};

// ─── حساب السعر تلقائياً ──────────────────────────────
window.ph_offerCalc = function (prefix) {
  const orig = parseFloat(document.getElementById(prefix + '-orig')?.value) || 0;
  const pct  = parseFloat(document.getElementById(prefix + '-pct')?.value)  || 0;
  if (orig > 0 && pct > 0) {
    const el = document.getElementById(prefix + '-disc');
    if (el) el.value = Math.round(orig * (1 - pct / 100));
  }
};

// ─── حفظ تعديل عرض ───────────────────────────────────
window.ph_saveEditOffer = async function (offerId) {
  const title         = document.getElementById('oe-title')?.value.trim();
  const desc          = document.getElementById('oe-desc')?.value.trim();
  const sourceSection = document.getElementById('oe-section')?.value || 'bookings';
  const originalPrice = parseFloat(document.getElementById('oe-orig')?.value)    || 0;
  const discountPercent = parseFloat(document.getElementById('oe-pct')?.value)   || 0;
  const discountedPrice = parseFloat(document.getElementById('oe-disc')?.value)  || (originalPrice * (1 - discountPercent / 100));
  const expiresStr    = document.getElementById('oe-expires')?.value;
  const active        = document.getElementById('oe-active')?.checked !== false;

  if (!title) { toast('أدخل عنوان العرض', 'error'); return; }
  showLoader();
  try {
    const data = { title, desc, sourceSection, originalPrice, discountedPrice: Math.round(discountedPrice), discountPercent, active, expiresAt: expiresStr ? new Date(expiresStr) : null };
    await fsUpdate('offers', offerId, data);
    await loadAllData();
    closeModal();
    toast('✅ تم تعديل العرض', 'success');
    render();
  } catch (e) { toast('خطأ: ' + e.message, 'error'); } finally { hideLoader(); }
};

// ─── حفظ عرض يدوي جديد ───────────────────────────────
window.ph_saveManualOffer = async function () {
  const title           = document.getElementById('om-title')?.value.trim();
  const desc            = document.getElementById('om-desc')?.value.trim();
  const sourceSection   = document.getElementById('om-section')?.value || 'bookings';
  const originalPrice   = parseFloat(document.getElementById('om-orig')?.value)  || 0;
  const discountPercent = parseFloat(document.getElementById('om-pct')?.value)   || 0;
  const discountedPrice = parseFloat(document.getElementById('om-disc')?.value)  || Math.round(originalPrice * (1 - discountPercent / 100));
  const expiresStr      = document.getElementById('om-expires')?.value;

  if (!title || !originalPrice || !discountPercent) { toast('أدخل العنوان والسعر ونسبة الخصم', 'error'); return; }
  showLoader();
  try {
    const data = { title, desc: desc || '', sourceSection, sourceType: 'manual', sourceId: '', originalPrice, discountedPrice: Math.round(discountedPrice), discountPercent, active: true, imageBase64: null, expiresAt: expiresStr ? new Date(expiresStr) : null, createdAt: firebase.firestore.FieldValue.serverTimestamp() };
    const ref = await db.collection('offers').add(data);
    AppData.offers = [{ id: ref.id, ...data }, ...(AppData.offers || [])];
    closeModal();
    toast('✅ تم إضافة العرض', 'success');
    render();
  } catch (e) { toast('خطأ: ' + e.message, 'error'); } finally { hideLoader(); }
};

// ─── دالة مساعدة: حفظ عرض من خدمة/منتج ─────────────
window.ph_saveOfferFromSource = async function ({ title, desc, sourceType, sourceId, sourceSection, originalPrice, discountPercent, imageBase64, expiresStr }) {
  if (!originalPrice || !discountPercent || discountPercent <= 0) return;
  const discountedPrice = Math.round(originalPrice * (1 - discountPercent / 100));
  try {
    const data = {
      title, desc: desc || '', sourceType, sourceId, sourceSection,
      originalPrice, discountedPrice, discountPercent,
      active: true, imageBase64: imageBase64 || null,
      expiresAt: expiresStr ? new Date(expiresStr) : null,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    const ref = await db.collection('offers').add(data);
    if (!AppData.offers) AppData.offers = [];
    AppData.offers.unshift({ id: ref.id, ...data });
  } catch (e) {
    console.warn('[Offers] فشل حفظ العرض:', e.message);
  }
};

console.log('[Offers System] نظام العروض والخصومات جاهز ✅');
