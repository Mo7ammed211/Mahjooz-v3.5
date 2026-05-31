// ═══════════════════════════════════════════
//  محجوز v2.0 — Customer Pages
// ═══════════════════════════════════════════
// ─── Wallet Display Helper ───────────────
async function loadWalletForUser(uid) {
  try {
    const w = await fsGet('wallets', uid);
    return w?.balance || 0;
  } catch(e) { return 0; }
}
// ─── Home ─────────────────────────────────
function renderHome() {
  const u = State.currentUser;
  const activeAds = AppData.ads.filter(a => a.active && (!a.expiresAt || (a.expiresAt.toDate ? a.expiresAt.toDate() : new Date(a.expiresAt)) > new Date()));
  const _regionId  = u?.regionId;
  const _regionObj = (AppData.regions || []).find(r => r.id === _regionId);
  const _regionedSvcs = _regionId
    ? AppData.services.filter(s => !s.regionId || s.regionId === _regionId)
    : AppData.services;
  const featured = _regionedSvcs.slice(0, 6);
  return `<div id="app-content" style="padding-top: 0;">
    <!-- Premium Hero Section -->
    <div class="hero-banner" style="background: linear-gradient(135deg, rgba(139,92,246,0.1), rgba(139,92,246,0.05)); border-radius: 0 0 32px 32px; padding: 60px 20px; text-align: center; margin-bottom: 40px; margin-top: -40px; border-bottom: 1px solid var(--glass-border);">
      <h1 style="font-size: 42px; font-weight: 800; margin-bottom: 16px; background: linear-gradient(135deg, var(--primary), #ec4899); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">محجوز .. عالمك بين يديك</h1>
      <p style="color: var(--text-secondary); font-size: 18px; max-width: 600px; margin: 0 auto 32px; line-height: 1.6;">ابحث عن أقرب الفنادق، الخدمات المهنية، المتاجر، والصيدليات بضغطة زر. ماذا تحتاج اليوم؟</p>
      
      <div class="search-wrap" style="max-width: 600px; margin: 0 auto;">
        <div class="search-box" style="position: relative; display: flex; align-items: center; background: var(--bg-card); border-radius: 99px; border: 1px solid var(--glass-border); padding: 6px; box-shadow: var(--shadow-lg);">
          <input class="search-input" id="global-search" placeholder="ابحث عن خدمة، متجر، أو رقم صنف (#SKU)..." style="border: none; background: transparent; padding: 12px 24px; flex: 1; outline: none; font-size: 16px; color: var(--text-main);" onkeydown="if(event.key==='Enter'){const q=this.value.trim();navigate('listing',{section:'all',q:q})}">
          <button class="btn btn-primary" style="border-radius: 99px; padding: 12px 32px;" onclick="const q=document.getElementById('global-search').value.trim();navigate('listing',{section:'all',q:q})">بحث 🔍</button>
        </div>
      </div>
    </div>
    ${activeAds.length ? renderAdsSlider(activeAds) : ''}
    ${u?.role === 'customer' ? renderRegionBanner(_regionId, _regionObj) : ''}
    <div class="section-hub">
      <div class="section-title">🏠 الأقسام الرئيسية</div>
      <div class="hub-grid">
        ${(()=>{
          const isAdmin = u?.role === 'admin';
          const sv = window.SV;
          const _card = (key, html, adminLabel) => {
            if (!sv) return html;
            const visible = sv.get(key) !== false;
            const maint   = !!sv.get(key + '_maint');
            if (!isAdmin && !visible) return '';
            const overlay = isAdmin && !visible
              ? `<div class="sv-hub-badge sv-hub-badge-hidden">🙈 مخفي</div>` : '';
            const maintBadge = isAdmin && maint
              ? `<div class="sv-hub-badge sv-hub-badge-maint">🔧 صيانة</div>` : '';
            const dimStyle = isAdmin && !visible ? 'opacity:0.45;filter:grayscale(0.5);' : '';
            return html.replace('class="hub-card"', `class="hub-card" style="position:relative;${dimStyle}"`) + overlay + maintBadge;
          };
          const _click = (key, fallback) => {
            if (!window.SV || window.SV.isAccessible(key)) return fallback;
            return `svShowMaintMsg('${key}')`;
          };
          return `
          ${_card('bookings', `<div class="hub-card" onclick="${_click('bookings','navigate(\'listing\',{section:\'bookings\'})')}">
            <span class="hub-icon">📅</span><div class="hub-title">الحجوزات</div>
            <div class="hub-desc">فنادق، سيارات، رحلات، أطباء، أعراس وأكثر</div>
            <span class="badge badge-purple">${AppData.cats.filter(c=>c.section==='bookings' && !c.parentId).length} تصنيف</span>
          </div>`)}
          ${_card('services', `<div class="hub-card" onclick="${_click('services','navigate(\'listing\',{section:\'services\'})')}">
            <span class="hub-icon">🔧</span><div class="hub-title">الخدمات المهنية</div>
            <div class="hub-desc">كهربائي، سباك، نجار، مصور، محامي وأكثر</div>
            <span class="badge badge-teal">${AppData.cats.filter(c=>(c.section==='services'||c.section==='professions')&&!c.parentId).length} تصنيف</span>
          </div>`)}
          ${_card('stores', `<div class="hub-card" onclick="${_click('stores','navigate(\'listing\',{section:\'stores\'})')}">
            <span class="hub-icon">🏪</span><div class="hub-title">المتاجر والصيدليات</div>
            <div class="hub-desc">صيدليات ومنتجات طبية مع توصيل</div>
            <span class="badge badge-gold">${(AppData.stores||[]).length} متجر متاح</span>
          </div>`)}
          ${_card('offers', `<div class="hub-card" onclick="${_click('offers','navigate(\'offers\')')}" style="position:relative;overflow:hidden">
            <div style="position:absolute;inset:0;background:linear-gradient(135deg,rgba(239,68,68,0.08),rgba(245,158,11,0.06));border-radius:inherit;pointer-events:none"></div>
            <span class="hub-icon">🏷️</span><div class="hub-title" style="color:#ef4444">العروض والخصومات</div>
            <div class="hub-desc">أفضل العروض من جميع الأقسام في مكان واحد</div>
            <span class="badge" style="background:linear-gradient(135deg,#ef4444,#f59e0b);color:#fff">${(()=>{const now=new Date();return(AppData.offers||[]).filter(o=>o.active&&(!o.expiresAt||(o.expiresAt.toDate?o.expiresAt.toDate():new Date(o.expiresAt))>now)).length})()}&nbsp;عرض نشط</span>
          </div>`)}`;
        })()}
      </div>
    </div>
    ${(!window.SV || window.SV.get('featured') !== false || u?.role === 'admin') && featured.length ? `
    <div class="section-hub" style="padding-top:0">
      <div class="section-title">⭐ أبرز الخدمات</div>
      <div class="service-grid">${featured.map(renderServiceCard).join('')}</div>
    </div>` : ''}
  </div>`;
}

function renderAdsSlider(ads) {
  if (!ads.length) return '';
  const id = 'ads-slider';
  let cur = 0;
  setTimeout(() => {
    const slides = document.querySelectorAll(`#${id} .ad-slide`);
    if (!slides.length) return;
    setInterval(() => {
      slides[cur].classList.remove('active');
      cur = (cur + 1) % slides.length;
      slides[cur].classList.add('active');
    }, 4000);
  }, 100);
  return `
  <div class="ads-section">
    <div class="section-title">🔥 عروض خارقة</div>
    <div class="ads-slider" id="${id}">
      ${ads.map((a,i) => `
      <div class="ad-slide${i===0?' active':''}">
        ${a.imageBase64 ? `<img src="${a.imageBase64}" class="ad-img" alt="${a.title}">` : `<div class="ad-placeholder">📢</div>`}
        <div class="ad-content">
          <div class="ad-title">${a.title}</div>
          <div class="ad-desc">${a.description||''}</div>
          <div class="ad-btns">
            ${(a.type==='direct_order'||a.type==='both') && a.serviceId ? `<button class="btn btn-primary btn-sm" onclick="bookService('${a.serviceId}')">🛒 اطلب الآن</button>` : ''}
            ${(a.type==='redirect'||a.type==='both') && a.targetUrl ? `<a href="${a.targetUrl}" target="_blank" class="btn btn-secondary btn-sm">🔗 عرض التفاصيل</a>` : ''}
          </div>
        </div>
      </div>`).join('')}
    </div>
  </div>`;
}

function renderRegionBanner(regionId, regionObj) {
  return `
    <div style="max-width:700px;margin:-10px auto 20px;padding:10px 20px;background:var(--bg-card);border:1px solid var(--glass-border);border-radius:99px;display:flex;align-items:center;justify-content:space-between;gap:12px">
      <div style="display:flex;align-items:center;gap:8px;color:var(--text-secondary);font-size:14px;min-width:0">
        <span>📍</span>
        <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
          ${regionObj
            ? `تعرض خدمات: <strong style="color:var(--primary)">${escHtml(regionObj.name)}</strong>`
            : 'تعرض <strong style="color:var(--primary)">جميع المناطق</strong>'}
        </span>
      </div>
      <button class="btn btn-sm btn-secondary" onclick="ph9_showRegionPicker && ph9_showRegionPicker()"
              style="border-radius:99px;font-size:13px;white-space:nowrap;flex-shrink:0">
        🗺️ تغيير المنطقة
      </button>
    </div>`;
}

// ─── Listing ──────────────────────────────
function renderListing() {
  const { section, catId } = State.params;

  // ── Global search across all sections ──
  if (section === 'all') {
    const q = (State.params.q || '').toLowerCase().trim();
    const matchSvc = (AppData.services || []).filter(s =>
      (s.name||'').toLowerCase().includes(q) ||
      (s.desc||'').toLowerCase().includes(q) ||
      (s.sku && s.sku.toString().toLowerCase().includes(q))
    );
    const matchRental = (AppData.rentalProducts || []).filter(p =>
      (p.name||'').toLowerCase().includes(q) ||
      (p.desc||'').toLowerCase().includes(q) ||
      (p.sku && p.sku.toString().toLowerCase().includes(q))
    );
    const matchStore = (AppData.storeProducts || []).filter(p =>
      (p.name||'').toLowerCase().includes(q) ||
      (p.desc||'').toLowerCase().includes(q) ||
      (p.sku && p.sku.toString().toLowerCase().includes(q))
    );
    const total = matchSvc.length + matchRental.length + matchStore.length;

    const renderResultCard = (item, type) => {
      const icons = { svc: '📅', rental: '🚗', store: '🛍️' };
      const labels = { svc: 'حجز/خدمة', rental: 'تأجير', store: 'منتج متجر' };
      const colors = { svc: '#8b5cf6', rental: '#f59e0b', store: '#10b981' };
      const icon = icons[type] || '🔷';
      const color = colors[type] || '#8b5cf6';
      const activeOffer = typeof ph_getActiveOffer === 'function' ? ph_getActiveOffer(item.id) : null;
      const offerPct = activeOffer ? (activeOffer.discountPercent || (activeOffer.originalPrice > 0 ? Math.round(((activeOffer.originalPrice - activeOffer.discountedPrice) / activeOffer.originalPrice) * 100) : 0)) : 0;
      return `
      <div style="background:var(--bg-card);border:1px solid ${activeOffer ? 'rgba(239,68,68,0.35)' : 'var(--glass-border)'};border-radius:14px;padding:16px;display:flex;align-items:flex-start;gap:14px;transition:transform 0.2s,box-shadow 0.2s;position:relative;overflow:hidden;" onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='var(--shadow-lg)'" onmouseout="this.style.transform='';this.style.boxShadow=''">
        ${activeOffer ? `<div style="position:absolute;top:0;left:0;background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;font-size:10px;font-weight:900;padding:3px 10px 3px 8px;border-radius:0 0 10px 0">🏷️ خصم ${offerPct}%</div>` : ''}
        <div style="width:48px;height:48px;border-radius:12px;background:${color}18;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;${activeOffer ? 'margin-top:14px' : ''}">${icon}</div>
        <div style="flex:1;min-width:0;${activeOffer ? 'margin-top:14px' : ''}">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px">
            <span style="font-weight:700;font-size:15px;color:var(--text-main)">${escHtml(item.name)}</span>
            ${item.sku ? `<span style="font-family:monospace;font-size:10.5px;font-weight:700;background:rgba(139,92,246,0.12);color:#8b5cf6;border:1px solid rgba(139,92,246,0.25);border-radius:4px;padding:1px 6px;letter-spacing:0.5px">#${escHtml(item.sku)}</span>` : ''}
            <span style="font-size:10px;font-weight:600;background:${color}18;color:${color};border-radius:4px;padding:2px 7px">${labels[type]}</span>
          </div>
          ${item.desc ? `<div style="font-size:13px;color:var(--text-muted);margin-bottom:8px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(item.desc)}</div>` : ''}
          ${activeOffer && typeof ph_offerPriceHtml === 'function'
            ? ph_offerPriceHtml(activeOffer, `<div style="font-size:13px;font-weight:700;color:${color}">${item.price ? item.price.toLocaleString('ar-YE') + ' ريال' : 'السعر عند التواصل'}</div>`)
            : `<div style="font-size:13px;font-weight:700;color:${color}">${item.price ? item.price.toLocaleString('ar-YE') + ' ريال' : 'السعر عند التواصل'}</div>`}
        </div>
      </div>`;
    };

    return `<div id="app-content">
      <div class="page-header">
        <button class="back-btn" onclick="navigate('home')">→ رجوع</button>
        <h1>🔍 نتائج البحث</h1>
        <p style="color:var(--text-secondary);margin-top:4px">${q ? `نتائج البحث عن: <strong style="color:var(--primary)">${escHtml(q)}</strong> — وُجد <strong>${total}</strong> نتيجة` : 'أدخل كلمة بحث أو رقم صنف للبدء'}</p>
      </div>
      <div class="search-wrap" style="margin-bottom:24px">
        <div class="search-box" style="position:relative;display:flex;align-items:center;background:var(--bg-card);border-radius:99px;border:1px solid var(--glass-border);padding:6px;box-shadow:var(--shadow-lg)">
          <input class="search-input" id="global-search-results" placeholder="ابحث عن خدمة أو رقم صنف (#SKU)..." value="${escAttr(q)}" style="border:none;background:transparent;padding:10px 20px;flex:1;outline:none;font-size:15px;color:var(--text-main)" onkeydown="if(event.key==='Enter'){navigate('listing',{section:'all',q:this.value.trim()})}">
          <button class="btn btn-primary" style="border-radius:99px;padding:10px 28px" onclick="navigate('listing',{section:'all',q:document.getElementById('global-search-results').value.trim()})">بحث 🔍</button>
        </div>
      </div>
      ${!q ? `<div class="empty-state" style="padding:60px 0"><div class="empty-icon">🔍</div><div class="empty-title">ابدأ بكتابة اسم أو رقم الصنف للبحث في جميع الأقسام</div></div>` :
        total === 0 ? `<div class="empty-state" style="padding:60px 0"><div class="empty-icon">😕</div><div class="empty-title">لا توجد نتائج مطابقة لـ "${escHtml(q)}"</div><div class="empty-desc">جرّب كلمة بحث مختلفة أو رقم الصنف مباشرة</div></div>` : `
        <div style="display:grid;gap:12px">
          ${matchSvc.length ? `
          <div style="margin-bottom:8px">
            <div style="font-size:13px;font-weight:700;color:var(--text-muted);margin-bottom:10px;display:flex;align-items:center;gap:6px">📅 الحجوزات والخدمات <span style="background:rgba(139,92,246,0.1);color:#8b5cf6;border-radius:99px;padding:2px 10px;font-size:12px">${matchSvc.length}</span></div>
            <div style="display:grid;gap:10px">${matchSvc.map(s => renderResultCard(s, 'svc')).join('')}</div>
          </div>` : ''}
          ${matchRental.length ? `
          <div style="margin-bottom:8px">
            <div style="font-size:13px;font-weight:700;color:var(--text-muted);margin-bottom:10px;display:flex;align-items:center;gap:6px">🏷️ منتجات التأجير <span style="background:rgba(245,158,11,0.1);color:#f59e0b;border-radius:99px;padding:2px 10px;font-size:12px">${matchRental.length}</span></div>
            <div style="display:grid;gap:10px">${matchRental.map(p => renderResultCard(p, 'rental')).join('')}</div>
          </div>` : ''}
          ${matchStore.length ? `
          <div style="margin-bottom:8px">
            <div style="font-size:13px;font-weight:700;color:var(--text-muted);margin-bottom:10px;display:flex;align-items:center;gap:6px">🛍️ منتجات المتاجر <span style="background:rgba(16,185,129,0.1);color:#10b981;border-radius:99px;padding:2px 10px;font-size:12px">${matchStore.length}</span></div>
            <div style="display:grid;gap:10px">${matchStore.map(p => renderResultCard(p, 'store')).join('')}</div>
          </div>` : ''}
        </div>`}
    </div>`;
  }

  if (section === 'stores' && !catId) {
    if (typeof ph43_renderStoresList === 'function') return ph43_renderStoresList();
  }

  const sLabels = { bookings:'📅 الحجوزات', services:'🔧 الخدمات المهنية', professions: '🛠️ نظام المهن', stores:'🏪 المتاجر' };
  if (!catId) {
    let cats = AppData.cats.filter(c => (c.section === section || (section === 'services' && c.section === 'professions') || (section === 'professions' && c.section === 'services')) && !c.parentId);
    
    return `<div id="app-content">
      <div class="page-header">
        <button class="back-btn" onclick="navigate('home')">→ رجوع</button>
        <h1>${sLabels[section]||'الخدمات'}</h1>
      </div>
      ${cats.length ? `<div class="cat-grid">${cats.map(c=>`
        <div class="cat-card" onclick="navigate('listing',{section:'${section}',catId:'${c.id}'})">
          <span class="cat-icon">${c.icon||'📌'}</span>
          <div class="cat-name">${c.name}</div>
          <div class="cat-count">${c.catType === 'rental' ? (AppData.rentalStores||[]).filter(s=>s.catId===c.id).length + ' متجر' : AppData.services.filter(s=>s.catId===c.id&&(!State.currentUser?.regionId||!s.regionId||s.regionId===State.currentUser?.regionId)).length + ' خدمة'}</div>
        </div>`).join('')}</div>` :
      `<div class="empty-state"><div class="empty-icon">📂</div><div class="empty-title">لا توجد تصنيفات بعد</div></div>`}
    </div>`;
  }
  
  const cat = AppData.cats.find(c=>c.id===catId);
  if (!cat) {
    return `<div id="app-content">
      <div class="page-header">
        <button class="back-btn" onclick="navigate('listing',{section:'${section}'})">→ رجوع</button>
        <h1>التصنيف غير موجود</h1>
      </div>
      <div class="empty-state"><div class="empty-icon">📂</div><div class="empty-title">التصنيف المطلوب غير متوفر حالياً</div></div>
    </div>`;
  }

  // If this category has subcategories, render them instead of rendering a flat list of services directly
  const subCats = AppData.cats.filter(c => c.parentId === catId);
  if (subCats.length > 0) {
    return `<div id="app-content">
      <div class="page-header">
        <button class="back-btn" onclick="navigate('listing',{section:'${section}'})">→ رجوع</button>
        <h1>${cat.icon||''} ${cat.name}</h1>
        <p style="color:var(--text-secondary);margin-top:4px">تصفح الأقسام الفرعية المتاحة</p>
      </div>
      <div class="cat-grid">${subCats.map(sc=>`
        <div class="cat-card" onclick="navigate('listing',{section:'${section}',catId:'${sc.id}'})">
          <span class="cat-icon">${sc.icon||'📌'}</span>
          <div class="cat-name">${sc.name}</div>
          <div class="cat-count">${sc.catType === 'rental' ? (AppData.rentalStores||[]).filter(s=>s.catId===sc.id).length + ' متجر' : AppData.services.filter(s=>s.catId===sc.id&&(!State.currentUser?.regionId||!s.regionId||s.regionId===State.currentUser?.regionId)).length + ' خدمة'}</div>
        </div>`).join('')}</div>
    </div>`;
  }
  
  if (cat.catType === 'rental' && typeof window.ph_rentalRenderCatPage === 'function') {
    return window.ph_rentalRenderCatPage(catId);
  }
  
  const _listRegId = State.currentUser?.regionId;
  const svcs = AppData.services.filter(s => {
    if (s.catId !== catId) return false;
    if (!_listRegId || !s.regionId) return true;
    return s.regionId === _listRegId;
  });
  const _listRegObj = (AppData.regions || []).find(r => r.id === _listRegId);
  return `<div id="app-content">
    <div class="page-header">
      <button class="back-btn" onclick="navigate('listing',{section:'${section}'${cat.parentId ? `,catId:'${cat.parentId}'` : ''}})">→ رجوع</button>
      <h1>${cat.icon||''} ${cat.name}</h1>
      <p style="color:var(--text-secondary);margin-top:4px">${svcs.length} خدمة متاحة${_listRegObj ? ` في <strong>${escHtml(_listRegObj.name)}</strong>` : ''}</p>
    </div>
    <div class="search-wrap">
      <div class="search-box">
        <input class="search-input" id="svc-search" oninput="filterServices()" placeholder="ابحث...">
        <span class="search-icon">🔍</span>
      </div>
    </div>
    <div class="service-grid" id="svc-grid">
      ${svcs.length ? svcs.map(renderServiceCard).join('') : '<div class="empty-state"><div class="empty-icon">📋</div><div class="empty-title">لا توجد خدمات بعد</div></div>'}
    </div>
  </div>`;
}
function filterServices() {
  const q = document.getElementById('svc-search').value.toLowerCase();
  document.querySelectorAll('.service-card').forEach(c => {
    c.style.display = c.textContent.toLowerCase().includes(q) ? '' : 'none';
  });
}
function renderServiceCard(s) {
  const u = State.currentUser;
  const rating = AppData.ratings.filter(r=>r.serviceId===s.id);
  const avg = rating.length ? (rating.reduce((a,r)=>a+(r.vendorStars||0),0)/rating.length).toFixed(1) : null;
  const cat = AppData.cats.find(c => c.id === s.catId);
  const isProf = cat?.section === 'professions' || cat?.section === 'services';

  const activeOffer = typeof ph_getActiveOffer === 'function' ? ph_getActiveOffer(s.id) : null;
  const offerPct = activeOffer ? (activeOffer.discountPercent || (activeOffer.originalPrice > 0 ? Math.round(((activeOffer.originalPrice - activeOffer.discountedPrice) / activeOffer.originalPrice) * 100) : 0)) : 0;

  const waNum = (AppData.platformSettings?.whatsappNumber || '').replace(/\D/g,'');
  const waUrl = waNum
    ? `https://wa.me/${waNum}?text=${encodeURIComponent('أهلاً، أريد الاستفسار أكثر عن الخدمة: ' + s.name)}`
    : '';
  
  const defaultPriceHtml = `<div class="service-price">${s.price ? s.price.toLocaleString('ar-YE') + ' ريال' : (isProf ? 'السعر بعد المعاينة' : 'السعر عند التواصل')}</div>`;

  return `
  <div class="service-card" style="position:relative">
    ${activeOffer ? (typeof ph_offerBadgeHtml === 'function' ? ph_offerBadgeHtml(offerPct, 'left:10px') : '') : ''}
    <div class="service-header">
      <div class="service-avatar">${s.icon||'🔷'}</div>
      <div>
        <div class="service-name">${s.name}</div>
        ${s.sku ? `<div style="display:inline-block;font-family:monospace;font-size:10.5px;font-weight:700;background:rgba(139,92,246,0.1);color:#8b5cf6;border:1px solid rgba(139,92,246,0.2);border-radius:4px;padding:1px 6px;margin-top:3px;letter-spacing:0.5px;">#${s.sku}</div>` : ''}
      </div>
    </div>
    ${s.desc?`<p style="color:var(--text-secondary);font-size:14px;margin-bottom:12px;line-height:1.6">${s.desc}</p>`:''}
    <div class="service-footer">
      <div>
        ${activeOffer && typeof ph_offerPriceHtml === 'function'
          ? ph_offerPriceHtml(activeOffer, defaultPriceHtml)
          : defaultPriceHtml}
        <div style="font-size:13px;color:var(--text-muted)">${avg?'⭐ '+avg+' ('+rating.length+' تقييم)':'لا يوجد تقييم بعد'}</div>
      </div>
      <div class="svc-card-actions">
        ${u?.role==='customer' ? `<button class="btn btn-primary btn-sm" data-svc-cart-id="${s.id}" onclick="typeof svc_addToCart==='function'?svc_addToCart('${s.id}'):bookService('${s.id}')">${activeOffer ? '🏷️ اطلب بالسعر المخفض' : '🛒 أضف للسلة'}</button>` :
          u?.role==='guest'    ? `<button class="btn btn-secondary btn-sm" onclick="navigate('login')">سجل للحجز</button>` : ''}
        ${waUrl ? `<a class="btn-wa-inquiry" href="${waUrl}" target="_blank" rel="noopener" title="استفسار عبر واتساب">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
          <span>استفسار</span>
        </a>` : ''}
      </div>
    </div>
  </div>`;
}

// ─── Booking ──────────────────────────────
async function bookService(svcId) {
  const s = AppData.services.find(x=>x.id===svcId);
  if (!s) return;
  const u = State.currentUser;
  if (!u || u.role !== 'customer') { navigate('login'); return; }

  if (typeof checkAccountActive === 'function' && !checkAccountActive()) return;
  if (typeof checkMandatoryVerification === 'function' && !checkMandatoryVerification()) return;

  if (s.hasDeposit && s.depositPercent > 0 && s.price > 0) {
    const addr = u.addr || '';
    if (typeof window.ph28_showBookingWithDeposit === 'function') {
      window.ph28_showBookingWithDeposit(s, addr);
      return;
    }
  }

  // --- Professions Logic ---
  const cat = AppData.cats.find(c => c.id === s.catId);
  if (cat?.section === 'professions' || cat?.section === 'services') {
    if (typeof window.bookService === 'function' && window.bookService !== bookService) {
       // Avoid recursion if they are named the same but different scopes
       // But actually, we want the workflow.js version
       // Let's just call the workflow logic directly or use the window version
       window.bookService(svcId);
       return;
    }
  }

  // ── Reset tier selection ──
  window.__ph40_selectedTier = null;
  if (s.tiers && s.tiers.length) {
    window.__ph40_selectedTier = { idx: 0, price: s.tiers[0].price, name: s.tiers[0].name };
  }

  // ── Load saved addresses ──
  let savedAddresses = [];
  try {
    if (typeof ph41_loadAddresses === 'function') {
      savedAddresses = await ph41_loadAddresses();
    }
  } catch (e) {}
  const defaultAddr = savedAddresses.find(a => a.isDefault) || savedAddresses[0];
  const hasTiers    = s.tiers && s.tiers.length > 0;
  const showPrice   = !hasTiers && s.price;

  openModal(`
    <div class="modal-header">
      <h2 class="modal-title">📋 تأكيد الحجز</h2>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>

    <div style="background:var(--gradient-card);border:1px solid var(--glass-border);border-radius:var(--radius-sm);padding:16px 20px;margin-bottom:20px;display:flex;align-items:center;gap:14px">
      <div style="font-size:36px">${s.icon||'🔷'}</div>
      <div style="flex:1">
        <div style="font-size:17px;font-weight:700">${s.name}</div>
        <!-- Provider hidden -->
        ${showPrice ? `<div style="font-size:20px;font-weight:800;margin-top:6px;color:var(--primary)">${s.price.toLocaleString('ar-YE')} ريال</div>` : ''}

      </div>
    </div>



    ${s.depositPercent && s.price ? `
    <div style="margin-bottom:16px;padding:12px 16px;background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.3);border-radius:12px">
      <div style="display:flex;justify-content:space-between"><span style="color:var(--text-secondary)">💰 العربون (${s.depositPercent}%):</span><span style="font-weight:700;color:#10b981">${Math.round(s.price*s.depositPercent/100)} ريال</span></div>
      <div style="display:flex;justify-content:space-between;margin-top:4px;font-size:12px"><span style="color:var(--text-muted)">المتبقي عند الوصول:</span><span style="color:var(--text-muted)">${s.price-Math.round(s.price*s.depositPercent/100)} ريال</span></div>
    </div>` : ''}

    <div class="form-group">
      <label class="form-label">📅 التاريخ المطلوب</label>
      <input class="form-control" id="bk-date" type="date" min="${new Date().toISOString().split('T')[0]}">
    </div>
    <div class="form-group">
      <label class="form-label">🕐 الوقت المفضل</label>
      <input class="form-control" id="bk-time" type="time">
    </div>

    ${savedAddresses.length && typeof ph41_renderAddressSelector === 'function'
      ? ph41_renderAddressSelector(savedAddresses) : ''}

    <div class="form-group" style="${s.requiresDelivery === false ? 'display:none;' : ''}">
      <label class="form-label">📍 عنوان التوصيل${savedAddresses.length ? ' (أو أدخل عنواناً جديداً)' : ''}</label>
      <input class="form-control" id="bk-addr"
             placeholder="المدينة، الحي، الشارع..."
             value="${defaultAddr ? escAttr(defaultAddr.address) : ''}"
             style="${defaultAddr ? 'display:none' : ''}">
    </div>
    <div class="form-group">
      <label class="form-label">💬 ملاحظات إضافية</label>
      <textarea class="form-control" id="bk-note" placeholder="أي تفاصيل خاصة بطلبك..." style="resize:vertical"></textarea>
    </div>

    ${hasTiers || s.price ? `
    <div class="form-group">
      <label class="form-label">💳 طريقة الدفع</label>
      <div class="bk-payment-grid">
        <button class="bk-pay-btn active" id="bk-pay-wallet" onclick="bkSelectPayment('wallet')">
          <div style="font-weight:700">المحفظة</div>
          <div style="font-size:11px;color:var(--text-muted)" id="svc-checkout-wallet-bal">جاري الجلب...</div>
        </button>
        <button class="bk-pay-btn" id="bk-pay-cod" onclick="bkSelectPayment('cod')">
          <div style="font-weight:700">عند الاستلام</div>
          <div style="font-size:11px;color:var(--text-muted)">+5 ريال رسوم</div>
        </button>
        <button class="bk-pay-btn" id="bk-pay-bank" onclick="bkSelectPayment('bank_transfer')">
          <div style="font-weight:700">تحويل بنكي</div>
          <div style="font-size:11px;color:var(--text-muted)">إيداع مسبق</div>
        </button>
      </div>
      
      <div id="bk-bank-info" style="display:none; margin-top:16px; padding:12px; background:rgba(59,130,246,0.05); border:1px solid rgba(59,130,246,0.2); border-radius:8px;">
        <div style="font-weight:700; margin-bottom:8px; color:var(--primary)">يرجى التحويل إلى أحد الحسابات التالية:</div>
        ${(AppData.bankAccounts||[]).filter(b=>b.active!==false).map(b => `<div style="font-size:13px; margin-bottom:6px; padding-bottom:6px; border-bottom:1px solid var(--border)">🏦 <strong>${b.bankName}</strong><br><span style="font-family:monospace; font-size:14px">${b.accountNumber}</span><br><span style="color:var(--text-muted)">اسم المستفيد: ${b.ownerName}</span></div>`).join('')}
        <div style="font-size:12px; color:var(--text-muted); margin-top:8px">سيتم إكمال الطلب، يرجى إرفاق صورة الإيصال لاحقاً في تفاصيل الطلب من صفحة طلباتي لكي نتمكن من اعتماد الطلب.</div>
      </div>
    </div>` : ''}

    <button class="btn btn-primary btn-block btn-lg" style="margin-top:8px" onclick="confirmBooking('${svcId}')">✅ تأكيد الحجز</button>`);

  State.selectedPaymentMethod = 'wallet';
  
  if ((hasTiers || s.price) && State.currentUser?.uid) {
    getBalance(State.currentUser.uid).then(bal => {
      const el = document.getElementById('svc-checkout-wallet-bal');
      if (el) el.innerText = bal + ' ريال متاح';
    }).catch(e => {
      const el = document.getElementById('svc-checkout-wallet-bal');
      if (el) el.innerText = 'الرصيد غير متاح';
    });
  }
}

window.bkSelectPayment = function(method) {
  State.selectedPaymentMethod = method;
  document.querySelectorAll('.bk-pay-btn').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById('bk-pay-' + method);
  if (btn) btn.classList.add('active');
  
  const bankInfo = document.getElementById('bk-bank-info');
  if (bankInfo) bankInfo.style.display = method === 'bank_transfer' ? 'block' : 'none';
};

async function confirmBooking(svcId) {
  const date = document.getElementById('bk-date')?.value;
  const time = document.getElementById('bk-time')?.value;
  const addrEl = document.getElementById('bk-addr');
  const addr = addrEl?.value.trim() || '';
  const note = document.getElementById('bk-note')?.value.trim() || '';
  if (!date) { toast('يرجى اختيار التاريخ المطلوب', 'error'); return; }

  const s = AppData.services.find(x => x.id === svcId);
  const u = State.currentUser;
  const payMethod = State.selectedPaymentMethod || 'wallet';
  const requiresDelivery = s?.requiresDelivery !== false;

  // ─── حساب سعر التوصيل من النظام الجديد ─────────────────────────
  let deliveryFee = 0;
  let deliveryRoute = null;
  if (requiresDelivery) {
    const fromArea = s?.location || s?.area || s?.address || '';
    const toArea   = addr || u?.address || u?.area || '';
    if (fromArea && toArea && typeof dp_calculateFee === 'function') {
      const result = dp_calculateFee(fromArea, toArea);
      if (result.found) {
        deliveryFee = result.fee;
        deliveryRoute = { from: fromArea, to: toArea };
      } else {
        deliveryFee = AppData.platformSettings?.deliveryFee || 0;
        toast('⚠️ سعر التوصيل لهذا المسار غير مسجّل — سيتم إشعار المدير', 'warning');
      }
    } else {
      deliveryFee = AppData.platformSettings?.deliveryFee || 0;
    }
  }

  const codFee  = payMethod === 'cod' ? 5 : 0;

  // ── Use selected tier price if available, else service price ──
  const tier      = window.__ph40_selectedTier;
  const svcPrice  = tier ? tier.price : (s?.price || 0);
  const tierName  = tier ? tier.name  : null;
  const total     = svcPrice + deliveryFee + codFee;

  if (svcPrice && payMethod === 'wallet') {
    const bal = await getBalance(u.uid);
    if (bal < total) {
      toast(`رصيدك (${bal} ريال) غير كافٍ. المطلوب: ${total} ريال`, 'error');
      closeModal(); navigate('wallet'); return;
    }
  }

  const orderId = await generateOrderId();
  
  // ── Auto-routing bypass for Tier-Level Vendor Routing ──
  const assignedVendorId = tier?.vendorId || s?.vendorId || null;
  const assignedVendorUser = assignedVendorId ? (AppData.users||[]).find(u => u.uid === assignedVendorId || u.id === assignedVendorId) : null;
  const assignedVendorName = assignedVendorUser ? assignedVendorUser.name : (s?.provider || '—');

  if (assignedVendorId && typeof isVendorOpen === 'function' && !isVendorOpen(assignedVendorId)) {
    toast('⛔ هذا المزود/المتجر مغلق حالياً ولا يقبل طلبات جديدة', 'error');
    closeModal();
    return;
  }

  await fsAdd('orders', {
    orderId, svcId,
    svcName: s?.name, svcIcon: s?.icon,
    tierName,
    servicePrice: svcPrice, deliveryFee, codFee, total,
    paymentMethod: payMethod,
    customerId: u.uid, customerName: u.name, customerAddr: addr,
    vendorId: assignedVendorId, vendorName: assignedVendorName,
    driverId: null, driverName: null, requiresDelivery,
    date, time, note, status: 'pending',
  });

  if (svcPrice && payMethod === 'wallet') {
    const desc = `حجز خدمة: ${s?.name}${tierName ? ' — ' + tierName : ''}`;
    await deductWallet(u.uid, total, desc, orderId);
  }

  window.__ph40_selectedTier = null;
  closeModal();
  const payLabel = { wallet: 'المحفظة 💰', cod: 'عند الاستلام 💵', bank_transfer: 'تحويل بنكي 🏦' };
  toast(`✅ تم إرسال طلبك! رقم العملية: ${orderId} — الدفع: ${payLabel[payMethod] || payMethod}`, 'success');
  await navigate('myorders');
}


// ─── My Orders ────────────────────────────
function renderMyOrders() {
  const u = State.currentUser;
  const orders = AppData.orders.filter(o=>o.customerId===u.uid).sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));
  const sLabel = {
    pending:'⏳ بانتظار القبول',
    pending_admin:'⏳ بانتظار الإدارة',
    pending_provider:'🔔 عند المزود',
    pending_final_admin:'🛡️ بانتظار الموافقة النهائية',
    pending_inspection:'🛠️ بانتظار المعاينة',
    pending_agreement:'📝 بانتظار الاتفاق',
    awaiting_payment:'💳 بانتظار الدفع',
    approved:'✅ تم القبول',
    provider_accepted:'🔄 جاري تعيين مندوب',
    accepted:'✅ تم القبول',
    with_driver:'🚗 مع المندوب',
    delivered:'📦 تم التوصيل',
    completed:'🎉 مكتمل',
    cancelled:'❌ ملغي'
  };
  const sBadge = {
    pending:'badge-gold',
    pending_admin:'badge-gold',
    pending_provider:'badge-purple',
    pending_final_admin:'badge-gold',
    pending_inspection:'badge-gold',
    pending_agreement:'badge-purple',
    awaiting_payment:'badge-gold',
    approved:'badge-teal',
    provider_accepted:'badge-gold',
    accepted:'badge-teal',
    with_driver:'badge-purple',
    delivered:'badge-teal',
    completed:'badge-teal',
    cancelled:'badge-rose'
  };
  return `<div id="app-content">
    <div class="page-header"><h1>📋 طلباتي</h1></div>
    <div class="listing-container">
      ${orders.length ? orders.map(o=>`
      <div class="order-card">
        <div class="order-header">
          <div>
            <div class="order-id">${o.orderId}</div>
            <div class="order-svc">${o.svcIcon||'🔷'} ${o.svcName}</div>
            ${o.tierName ? `<div style="font-size:12px;color:var(--primary);font-weight:700;margin-top:4px"><span style="background:rgba(139,92,246,0.08);padding:2px 6px;border-radius:6px;border:1px solid rgba(139,92,246,0.15)">🏷️ الفئة: ${escHtml(o.tierName)}</span></div>` : ''}
          </div>
          <span class="badge ${sBadge[o.status]||'badge-purple'}">${sLabel[o.status]||o.status}</span>
        </div>
        <div class="order-meta">
          <span>📅 ${o.date||'—'}</span>
          <span>💰 ${o.total||o.servicePrice||0} ريال</span>
          ${o.driverName?`<span>🚗 ${o.driverName}</span>`:''}
        </div>
        ${o.displayStatus ? `<div style="background:rgba(59,130,246,0.05); padding:8px 12px; border-radius:8px; font-size:13px; color:var(--primary); font-weight:600; margin-bottom:10px">📢 ${o.displayStatus}</div>` : ''}
        ${o.estimatedArrival?`<div class="order-eta">🕒 وقت الوصول المتوقع: <strong>${o.estimatedArrival}</strong></div>`:''}
        <div class="order-actions">
          <button class="btn btn-secondary btn-sm" onclick="showInvoice('${o.id}')">🧾 الفاتورة</button>
          ${(o.status==='pending_inspection' || o.status==='pending_agreement') ? `
            <button class="btn btn-primary btn-sm" onclick="ph_openProfessionAgreement('${o.id}')">📝 اتمام الاتفاق</button>
          `:''}
          ${o.status==='awaiting_payment' ? `
            <button class="btn btn-success btn-sm" onclick="ph_payProfessionOrder('${o.id}')">💳 دفع الآن</button>
          `:''}
          ${o.status==='completed' && !AppData.ratings.find(r=>r.orderId===o.id&&r.customerId===u.uid) ?
            `<button class="btn btn-primary btn-sm" onclick="ph29_showRatingModal('${o.id}')">⭐ قيّم الخدمة</button>` : ''}
          ${o.status==='with_driver' && o.driverPhone ?
            `<a href="https://wa.me/${o.driverPhone}" target="_blank" class="btn btn-sm" style="background:#25d366;color:#fff">💬 تواصل مع المندوب</a>` : ''}
          ${(o.status==='with_driver' || o.status==='delivered' || o.status==='completed') ?
            `<button class="btn btn-sm" style="background:var(--gold);color:#000" onclick="openLiveTrackingModal('${o.id}')">📍 تتبع الطلب</button>` : ''}
        </div>
      </div>`).join('') :
      `<div class="empty-state"><div class="empty-icon">📋</div><div class="empty-title">لا توجد طلبات بعد</div>
        <button class="btn btn-primary" style="margin-top:20px" onclick="navigate('home')">🏠 ابدأ التسوق</button></div>`}
    </div>
  </div>`;
}
function showInvoice(orderId) {
  const o = AppData.orders.find(x=>x.id===orderId);
  if (!o) return;
  const sLabel = {pending:'⏳ بانتظار القبول',accepted:'✅ تم القبول',with_driver:'🚗 مع المندوب',delivered:'📦 تم التوصيل',completed:'🎉 مكتمل',cancelled:'❌ ملغي'};
  openModal(`
    <div class="modal-header"><h2 class="modal-title">🧾 فاتورة الطلب</h2><button class="modal-close" onclick="closeModal()">✕</button></div>
    <div class="invoice">
      <div class="invoice-row"><span>رقم العمليات</span><strong>${o.orderId}</strong></div>
      <div class="invoice-row"><span>الخدمة</span><span>${o.svcIcon||''} ${o.svcName}</span></div>
      ${o.tierName ? `<div class="invoice-row"><span>الفئة المختارة</span><span style="font-weight:700;color:var(--primary)">🏷️ ${escHtml(o.tierName)}</span></div>` : ''}
      ${o.locationCount > 1 ? `<div class="invoice-row"><span>عدد المواقع</span><span>${o.locationCount} مواقع مختلقة</span></div>` : ''}
      <div class="invoice-row"><span>التاريخ</span><span>${o.date||'—'}</span></div>
      <div class="invoice-row"><span>سعر الخدمة</span><span>${o.servicePrice||0} ريال</span></div>
      ${o.taxAmount ? `
      <div class="invoice-row"><span>الضريبة (${o.taxPercent}%)</span><span>${o.taxAmount} ريال</span></div>
      ` : ''}
      <div class="invoice-row"><span>رسوم التوصيل</span><span>${o.deliveryFee||0} ريال</span></div>
      <div class="invoice-row total"><span>الإجمالي</span><strong>${o.total||0} ريال</strong></div>
      <div class="invoice-row"><span>الحالة</span><span>${sLabel[o.status]||o.status}</span></div>
    </div>
    <div style="display:flex;gap:10px;margin-top:16px">
      <button class="btn btn-primary btn-block" onclick="ph6_generateInvoice('${o.id}')">📥 تنزيل PDF</button>
      <button class="btn btn-secondary btn-block" onclick="closeModal()">إغلاق</button>
    </div>`);
}

// ─── My Wallet ────────────────────────────
function renderMyWallet() {
  const u = State.currentUser;
  const bal = AppData.wallets ? (AppData.wallets[u.uid]?.balance||0) : 0;
  const txns = AppData.transactions.filter(t=>t.uid===u.uid).sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0)).slice(0,20);
  const myReqs = AppData.rechargeReqs.filter(r=>r.userId===u.uid);
  const pendingReq = myReqs.find(r=>r.status==='pending');

  // Multi-currency conversions (YER base → YER / USD).
  let currencyChips = '';
  try {
    if (typeof ph17_settings === 'function' && typeof ph17_convert === 'function') {
      const cs = (ph17_settings().currencies || []).filter(c => !c.base);
      currencyChips = cs.map(c => {
        const v = ph17_convert(bal, c.code);
        if (v == null) return '';
        const txt = (Math.round(v*100)/100).toLocaleString('en-US',{maximumFractionDigits:2});
        return `<span class="badge badge-teal" style="font-size:13px;padding:6px 10px;margin:2px">≈ ${txt} ${c.code}</span>`;
      }).join('');
    }
  } catch(e) {}

  return `<div id="app-content">
    <div class="page-header" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px">
      <button class="back-btn" onclick="goBack('home')">→ رجوع</button>
      <h1>💰 محفظتي — ${bal.toLocaleString('ar-YE')} ريال</h1>
      <button class="btn btn-secondary btn-sm" onclick="ph6_generateStatement && ph6_generateStatement(State.currentUser.uid||State.currentUser.id, 90)">📄 تحميل كشف PDF</button>
    </div>
    <div class="wallet-card">
      <div class="wallet-label">رصيدك الحالي</div>
      <div class="wallet-balance">${bal.toLocaleString('ar-YE')} <span style="font-size:18px">ريال</span></div>
      ${currencyChips ? `<div style="margin-top:10px;display:flex;flex-wrap:wrap;gap:6px;justify-content:center">${currencyChips}</div>` : ''}
      ${pendingReq ? `<div style="margin-top:12px"><span class="badge badge-gold">⏳ يوجد طلب شحن قيد المراجعة (${pendingReq.amount} ريال)</span></div>` : ''}
      <button class="btn btn-primary" style="margin-top:20px" onclick="showRechargeModal()" ${pendingReq?'disabled':''}>
        ➕ شحن الرصيد
      </button>
    </div>
    <div class="section-title" style="margin-top:24px">📜 سجل المعاملات</div>
    ${txns.length ? `<div class="table-wrap"><table class="admin-table">
      <thead><tr><th>النوع</th><th>المبلغ</th><th>الوصف</th><th>التاريخ</th></tr></thead>
      <tbody>${txns.map(t=>`<tr>
        <td><span class="badge ${t.type==='credit'?'badge-teal':'badge-rose'}">${t.type==='credit'?'➕ إيداع':'➖ سحب'}</span></td>
        <td style="font-weight:700">${t.amount} ريال</td>
        <td style="color:var(--text-secondary)">${t.note||'—'}</td>
        <td style="color:var(--text-muted)">${fmtDate(t.createdAt)}</td>
      </tr>`).join('')}</tbody>
    </table></div>` : `<div class="empty-state"><div class="empty-icon">📜</div><div class="empty-title">لا توجد معاملات بعد</div></div>`}
  </div>`;
}
function showRechargeModal() {
  openModal(`
    <div class="modal-header"><h2 class="modal-title">➕ شحن الرصيد</h2><button class="modal-close" onclick="closeModal()">✕</button></div>
    <div style="background:rgba(124,58,237,0.1);border:1px solid rgba(124,58,237,0.2);border-radius:var(--radius-sm);padding:16px;margin-bottom:20px">
      <p style="color:var(--text-secondary);line-height:1.8">
        1. حوّل المبلغ المطلوب إلى حساب المنصة<br>
        2. ارفع صورة إثبات التحويل<br>
        3. سيتم مراجعة طلبك وإضافة الرصيد خلال 24 ساعة
      </p>
    </div>
    <div class="form-group"><label class="form-label">المبلغ المراد شحنه (ريال)</label><input class="form-control" id="rc-amount" type="number" min="10" placeholder="مثال: 100"></div>
    <div class="form-group"><label class="form-label">صورة إثبات التحويل</label><input class="form-control" id="rc-proof" type="file" accept="image/*" onchange="previewProof(this)"></div>
    <div id="proof-preview" style="margin-bottom:16px"></div>
    <div class="form-group"><label class="form-label">ملاحظة (اختياري)</label><input class="form-control" id="rc-note" placeholder="رقم الحوالة أو أي تفصيل"></div>
    <button class="btn btn-primary btn-block" onclick="submitRechargeRequest()">إرسال طلب الشحن</button>`);
}
function previewProof(input) {
  const file = input.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    document.getElementById('proof-preview').innerHTML = `<img src="${e.target.result}" style="max-width:100%;border-radius:8px;max-height:200px;object-fit:cover">`;
  };
  reader.readAsDataURL(file);
}
async function submitRechargeRequest() {
  const amount = parseFloat(document.getElementById('rc-amount').value);
  const note   = document.getElementById('rc-note').value.trim();
  const file   = document.getElementById('rc-proof').files[0];
  if (!amount || amount < 10) { toast('أدخل مبلغاً صحيحاً (10 ريال على الأقل)','error'); return; }
  let proofBase64 = null;
  if (file) {
    proofBase64 = await new Promise(res => {
      const r = new FileReader(); r.onload = e => res(e.target.result); r.readAsDataURL(file);
    });
  }
  const u = State.currentUser;
  await fsAdd('recharge_requests', { userId: u.uid, userName: u.name, amount, note, proofBase64, status: 'pending' });
  closeModal(); toast('تم إرسال طلب الشحن! سيتم المراجعة خلال 24 ساعة ✅','success');
  await navigate('wallet');
}

// ─── Rating ───────────────────────────────
function renderRatingPage() {
  const { orderId } = State.params;
  const o = AppData.orders.find(x=>x.id===orderId);
  if (!o) { navigate('myorders'); return ''; }
  return `<div id="app-content">
    <div class="page-header">
      <button class="back-btn" onclick="navigate('myorders')">→ رجوع</button>
      <h1>⭐ تقييم الطلب</h1>
      <p style="color:var(--text-secondary)">${o.orderId} — ${o.svcName}</p>
    </div>
    <div class="listing-container">
      <div class="rating-card">
        <h3 style="margin-bottom:16px">تقييم صاحب الخدمة: ${o.vendorName||'—'}</h3>
        <div class="star-picker" id="vendor-stars">
          ${[1,2,3,4,5].map(n=>`<span class="star" onclick="pickStar('vendor',${n})" data-v="${n}">☆</span>`).join('')}
        </div>
        <div class="form-group" style="margin-top:16px"><textarea class="form-control" id="vendor-comment" placeholder="اكتب تعليقك على الخدمة..."></textarea></div>
      </div>
      ${o.driverName ? `
      <div class="rating-card">
        <h3 style="margin-bottom:16px">تقييم المندوب: ${o.driverName}</h3>
        <div class="star-picker" id="driver-stars">
          ${[1,2,3,4,5].map(n=>`<span class="star" onclick="pickStar('driver',${n})" data-v="${n}">☆</span>`).join('')}
        </div>
        <div class="form-group" style="margin-top:16px"><textarea class="form-control" id="driver-comment" placeholder="اكتب تعليقك على المندوب..."></textarea></div>
      </div>` : ''}
      <button class="btn btn-primary btn-block btn-lg" onclick="submitRating('${orderId}')">إرسال التقييم ⭐</button>
    </div>
  </div>`;
}
let _ratingVals = { vendor: 0, driver: 0 };
function pickStar(type, n) {
  _ratingVals[type] = n;
  document.querySelectorAll(`#${type}-stars .star`).forEach(s => {
    s.textContent = parseInt(s.dataset.v) <= n ? '⭐' : '☆';
  });
}
async function submitRating(orderId) {
  const vc = document.getElementById('vendor-comment')?.value.trim();
  const dc = document.getElementById('driver-comment')?.value.trim();
  if (!_ratingVals.vendor) { toast('يرجى تقييم صاحب الخدمة','error'); return; }
  const o = AppData.orders.find(x=>x.id===orderId);
  const u = State.currentUser;
  await fsAdd('ratings', {
    orderId, customerId: u.uid, customerName: u.name,
    vendorId: o?.vendorId, vendorStars: _ratingVals.vendor, vendorComment: vc,
    driverId: o?.driverId, driverStars: _ratingVals.driver||null, driverComment: dc,
    serviceId: o?.svcId,
  });
  _ratingVals = { vendor:0, driver:0 };
  toast('شكراً على تقييمك! ⭐','success');
  await navigate('myorders');
}

// ─── Settings & Security (2FA) ────────────────
function renderSettingsPage() {
  const u = State.currentUser;
  const is2FAEnabled = u?.twoFAEnabled || false;
  return `<div id="app-content">
    <div class="page-header">
      <button class="back-btn" onclick="navigate(State.currentUser.role==='customer'?'home':'admin')">→ رجوع</button>
      <h1>⚙️ الإعدادات والأمان</h1>
    </div>
    <div class="listing-container">
      <div class="settings-card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
          <div>
            <h3 style="margin-bottom:4px">🔐 المصادقة الثنائية (2FA)</h3>
            <p style="color:var(--text-secondary);font-size:14px">حماية إضافية لحسابك عند تسجيل الدخول</p>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" ${is2FAEnabled?'checked':''} onchange="toggle2FA()">
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div style="background:var(--gradient-card);border:1px solid var(--glass-border);border-radius:var(--radius-sm);padding:12px;font-size:13px;color:var(--text-secondary)">
          ${is2FAEnabled ? 
            '✅ المصادقة الثنائية مفعّلة. سيتلقى رمز التحقق عند دخول جديد.' :
            '❌ المصادقة الثنائية معطّلة. فعّلها لحماية أفضل.'}
        </div>
      </div>

      <div class="settings-card">
        <h3 style="margin-bottom:16px">👤 معلومات الحساب</h3>
        <div class="info-row">
          <span>الاسم</span><strong>${u?.name||'—'}</strong>
        </div>
        <div class="info-row">
          <span>البريد الإلكتروني</span><strong>${u?.email||'—'}</strong>
        </div>
        <div class="info-row">
          <span>الدور</span><strong>${{admin:'مدير',staff:'موظف',vendor:'مزود خدمة',driver:'مندوب',customer:'عميل',provider:'مزود خدمة'}[u?.role]||u?.role}</strong>
        </div>
        ${u?.phone ? `<div class="info-row"><span>رقم الهاتف</span><strong>${u.phone}</strong></div>` : ''}
      </div>

      <div class="settings-card">
        <h3 style="margin-bottom:16px">🔒 كلمة المرور</h3>
        <button class="btn btn-secondary btn-block" onclick="showChangePasswordModal()">تغيير كلمة المرور</button>
      </div>

      <div class="settings-card">
        <h3 style="margin-bottom:16px">📋 جلسات نشطة</h3>
        <div class="info-row">
          <span>الجهاز الحالي</span><strong>متصل الآن</strong>
        </div>
        <button class="btn btn-danger btn-block" style="margin-top:12px" onclick="logoutConfirm()">تسجيل الخروج</button>
      </div>
    </div>
  </div>`;
}
async function toggle2FA() {
  try {
    showLoader('جاري تحديث الإعدادات...');
    await toggleTwoFA(State.currentUser.uid);
    State.currentUser.twoFAEnabled = !State.currentUser.twoFAEnabled;
    await navigate('settings');
  } catch(e) {
    toast(e.message, 'error');
    await navigate('settings');
  }
}
function showChangePasswordModal() {
  openModal(`
    <div class="modal-header"><h2 class="modal-title">🔐 تغيير كلمة المرور</h2><button class="modal-close" onclick="closeModal()">✕</button></div>
    <p style="color:var(--text-secondary);margin-bottom:20px">أدخل كلمة مرورك الحالية والجديدة</p>
    <div class="form-group"><label class="form-label">كلمة المرور الحالية</label><input class="form-control" id="old-pwd" type="password" placeholder="كلمة المرور الحالية"></div>
    <div class="form-group"><label class="form-label">كلمة المرور الجديدة</label><input class="form-control" id="new-pwd-1" type="password" placeholder="6 أحرف على الأقل"></div>
    <div class="form-group"><label class="form-label">تأكيد كلمة المرور</label><input class="form-control" id="new-pwd-2" type="password" placeholder="أعد كلمة المرور"></div>
    <button class="btn btn-primary btn-block" onclick="changePassword()">حفظ التغييرات</button>`);
}
async function changePassword() {
  const oldPwd = document.getElementById('old-pwd')?.value;
  const newPwd1 = document.getElementById('new-pwd-1')?.value;
  const newPwd2 = document.getElementById('new-pwd-2')?.value;
  if (!oldPwd || !newPwd1 || !newPwd2) { toast('أكمل جميع الحقول','error'); return; }
  if (newPwd1.length < 6) { toast('كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل','error'); return; }
  if (newPwd1 !== newPwd2) { toast('كلمتا المرور غير متطابقتين','error'); return; }
  try {
    const user = auth.currentUser;
    const credential = firebase.auth.EmailAuthProvider.credential(user.email, oldPwd);
    await user.reauthenticateWithCredential(credential);
    await user.updatePassword(newPwd1);
    closeModal();
    toast('✅ تم تحديث كلمة المرور بنجاح','success');
  } catch(e) {
    toast('كلمة المرور الحالية خاطئة أو حدث خطأ','error');
  }
}
