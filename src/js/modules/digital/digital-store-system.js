/* ============================================================
   Phase 45 — نظام المتاجر والمنتجات الرقمية المستقل
   - إدارة التصنيفات (كروت شبكة، رصيد، تسديد)
   - إدارة المتاجر الرقمية (يمن موبايل، يو...)
   - المنتجات الرقمية وإدارة أكوادها
   ============================================================ */
'use strict';

window.ph45_reloadDigitalData = async function() {
  try {
    const [cats, stores, prods, codes] = await Promise.all([
      fsGetAll('digital_store_cats').catch(()=>[]),
      fsGetAll('digital_stores').catch(()=>[]),
      fsGetAll('digital_products').catch(()=>[]),
      fsGetAll('digital_codes').catch(()=>[])
    ]);
    AppData.digitalStoreCats = cats;
    AppData.digitalStores = stores;
    AppData.digitalProducts = prods;
    AppData.digitalCodes = codes;
  } catch(e) { console.error('Error reloading digital data', e); }
};

// ───────────────────────────────────────────────────────
// SECTION 1 — ADMIN UI
// ───────────────────────────────────────────────────────

window.ph45_renderAdminDigitalStores = function() {
  const cats   = (AppData.digitalStoreCats || []).sort((a,b)=>(a.order||0)-(b.order||0));
  const stores = AppData.digitalStores || [];
  const prods  = AppData.digitalProducts || [];

  if (!State._digBrowse) State._digBrowse = {};
  const activeCatId   = State._digBrowse.catId   || null;
  const activeStoreId = State._digBrowse.storeId  || null;

  // ── المستوى 3: منتجات متجر ──────────────────────────
  if (activeStoreId) {
    const store = stores.find(s=>s.id===activeStoreId);
    const cat   = cats.find(c=>c.id===activeCatId);
    if (!store) { State._digBrowse.storeId=null; return ph45_renderAdminDigitalStores(); }
    const q = (State.adminSearch||'').toLowerCase();
    const storeProds = prods.filter(p=>p.storeId===activeStoreId);
    const filtered   = q ? storeProds.filter(p=>(p.name||'').toLowerCase().includes(q)) : storeProds;

    const rows = filtered.map(p => {
      const available = (AppData.digitalCodes||[]).filter(c=>c.digitalProductId===p.id&&c.status==='available').length;
      return `
      <tr>
        <td style="font-weight:700">${p.name}</td>
        <td style="color:var(--primary);font-weight:800">${p.price} ريال</td>
        <td><span class="badge ${p.active!==false?'badge-teal':'badge-rose'}">${p.active!==false?'✅ نشط':'⏸️ متوقف'}</span></td>
        <td>
          <button class="btn btn-sm" style="background:rgba(139,92,246,0.1);border:1px solid rgba(139,92,246,0.3);color:#c4b5fd"
            onclick="ph45_showCodesModal('${p.id}')">🔑 أكواد <span style="background:var(--primary);color:#fff;padding:1px 6px;border-radius:10px;font-size:10px;margin-right:4px">${available}</span></button>
          <button class="btn btn-sm btn-danger" onclick="ph45_deleteProduct('${p.id}','${activeStoreId}')">🗑️</button>
        </td>
      </tr>`;
    }).join('');

    return `
    <div class="sb-header">
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
        <button class="btn btn-sm btn-secondary" onclick="ph45_digBack('store')">← رجوع</button>
        <span style="color:var(--text-muted);font-size:13px">🛒 المتاجر الرقمية</span>
        <span style="color:var(--text-muted)">›</span>
        <span>${cat?.icon||'📂'} ${cat?.name||''}</span>
        <span style="color:var(--text-muted)">›</span>
        ${store.icon?`<img src="${store.icon}" style="width:22px;height:22px;border-radius:6px;object-fit:cover">`:'🏪'}
        <span style="font-weight:800;font-size:16px">${store.name}</span>
        <span class="badge badge-purple" style="font-size:11px">${storeProds.length} منتج</span>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <input type="text" class="form-control" id="admin-digital-prods-search" placeholder="🔍 بحث في المنتجات..." value="${State.adminSearch||''}"
          oninput="State.adminSearch=this.value;render();" style="width:200px">
        <button class="btn btn-sm btn-secondary" onclick="ph45_showEditStoreModal('${activeStoreId}')">✏️ تعديل المتجر</button>
        <button class="btn btn-primary btn-sm" onclick="ph45_showAddProductInline('${activeStoreId}')">➕ منتج جديد</button>
      </div>
    </div>

    <div id="ph45-prod-add-wrap"></div>

    <div class="table-wrap" style="max-height: calc(100vh - 220px); overflow-y: auto; -webkit-overflow-scrolling: touch;">
      <table class="admin-table">
        <thead><tr><th>المنتج</th><th>السعر</th><th>الحالة</th><th>الإجراءات</th></tr></thead>
        <tbody>
          ${filtered.length===0?`
            <tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:40px">
              ${q?'🔍 لا توجد نتائج':'لا توجد منتجات — اضغط ➕ منتج جديد'}
            </td></tr>` : rows}
        </tbody>
      </table>
    </div>`;
  }

  // ── المستوى 2: متاجر تصنيف ──────────────────────────
  if (activeCatId) {
    const cat = cats.find(c=>c.id===activeCatId);
    if (!cat) { State._digBrowse.catId=null; return ph45_renderAdminDigitalStores(); }
    const catStores = stores.filter(s=>s.catId===activeCatId);
    const q = (State.adminSearch||'').toLowerCase();
    const filtered = q ? catStores.filter(s=>(s.name||'').toLowerCase().includes(q)) : catStores;

    const grid = filtered.map(s => {
      const pCount = prods.filter(p=>p.storeId===s.id).length;
      const available = (AppData.digitalCodes||[]).filter(c=>c.status==='available'&&prods.filter(p=>p.storeId===s.id).map(p=>p.id).includes(c.digitalProductId)).length;
      return `
      <div class="sb-cat-card" onclick="ph45_digIntoStore('${s.id}')">
        <div class="sb-cat-icon" style="border-radius:14px;overflow:hidden;padding:0">
          ${s.icon?`<img src="${s.icon}" style="width:100%;height:100%;object-fit:cover">`:'🏪'}
        </div>
        <div class="sb-cat-body">
          <div class="sb-cat-name">${s.name}</div>
          <div class="sb-cat-count">📦 ${pCount} منتج · 🔑 ${available} كود متاح</div>
          <div style="margin-top:4px"><span class="badge ${s.active!==false?'badge-teal':'badge-rose'}" style="font-size:10px">${s.active!==false?'نشط':'معطل'}</span></div>
        </div>
        <div class="sb-cat-foot" onclick="event.stopPropagation()">
          <button class="btn btn-xs btn-secondary" onclick="ph45_showEditStoreModal('${s.id}')">✏️</button>
          <button class="btn btn-xs btn-danger"    onclick="ph45_deleteStore('${s.id}')">🗑️</button>
          <span class="sb-arrow">›</span>
        </div>
      </div>`;
    }).join('');

    return `
    <div class="sb-header">
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
        <button class="btn btn-sm btn-secondary" onclick="ph45_digBack('cat')">← رجوع</button>
        <span style="color:var(--text-muted);font-size:13px">🛒 المتاجر الرقمية</span>
        <span style="color:var(--text-muted)">›</span>
        <span style="font-size:20px">${cat.icon||'📂'}</span>
        <span style="font-weight:800;font-size:16px">${cat.name}</span>
        <span class="badge badge-purple" style="font-size:11px">${catStores.length} متجر</span>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <input type="text" class="form-control" id="admin-digital-stores-search" placeholder="🔍 بحث في المتاجر..." value="${State.adminSearch||''}"
          oninput="State.adminSearch=this.value;render();" style="width:200px">
        <button class="btn btn-sm btn-secondary" onclick="ph45_showEditCatModal('${activeCatId}')">✏️ تعديل التصنيف</button>
        <button class="btn btn-primary btn-sm" onclick="ph45_showAddStoreModal('${activeCatId}')">➕ متجر جديد</button>
      </div>
    </div>

    <div class="sb-stat-bar">
      <div class="sb-pill">🏪 المتاجر: <strong>${catStores.length}</strong></div>
      <div class="sb-pill">📦 إجمالي المنتجات: <strong>${catStores.reduce((t,s)=>t+prods.filter(p=>p.storeId===s.id).length,0)}</strong></div>
    </div>

    ${filtered.length===0?`
      <div class="sb-empty">
        <div class="sb-empty-ic">🏪</div>
        <div style="font-size:16px;font-weight:700;margin-bottom:8px">${q?'لا توجد نتائج':'لا توجد متاجر بعد'}</div>
        ${!q?`<button class="btn btn-primary" onclick="ph45_showAddStoreModal('${activeCatId}')">➕ أضف أول متجر</button>`:''}
      </div>` : `<div class="sb-grid">${grid}</div>`}`;
  }

  // ── المستوى 1: التصنيفات ────────────────────────────
  const q = (State.adminSearch||'').toLowerCase();
  const filteredCats = q ? cats.filter(c=>(c.name||'').toLowerCase().includes(q)) : cats;
  const totalStores  = cats.reduce((t,c)=>t+stores.filter(s=>s.catId===c.id).length,0);
  const totalProds   = prods.length;

  const grid = filteredCats.map(cat => {
    const storeCount = stores.filter(s=>s.catId===cat.id).length;
    return `
    <div class="sb-cat-card" onclick="ph45_digIntoCat('${cat.id}')">
      <div class="sb-cat-icon">${cat.icon||'🛒'}</div>
      <div class="sb-cat-body">
        <div class="sb-cat-name">${cat.name}</div>
        <div class="sb-cat-count">🏪 ${storeCount} متجر</div>
      </div>
      <div class="sb-cat-foot" onclick="event.stopPropagation()">
        <button class="btn btn-xs btn-secondary" onclick="ph45_showEditCatModal('${cat.id}')">✏️</button>
        <button class="btn btn-xs btn-danger"    onclick="ph45_deleteCat('${cat.id}')">🗑️</button>
        <span class="sb-arrow">›</span>
      </div>
    </div>`;
  }).join('');

  return `
  <div class="sb-header">
    <div class="sb-title">🛒 المتاجر والمنتجات الرقمية</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <input type="text" class="form-control" id="admin-digital-cats-search" placeholder="🔍 بحث في التصنيفات..." value="${State.adminSearch||''}"
        oninput="State.adminSearch=this.value;render();" style="width:210px">
      <button class="btn btn-secondary btn-sm" onclick="ph45_showAddCatModal()">📂 تصنيف جديد</button>
    </div>
  </div>

  <div class="sb-stat-bar">
    <div class="sb-pill">📂 التصنيفات: <strong>${cats.length}</strong></div>
    <div class="sb-pill">🏪 المتاجر: <strong>${totalStores}</strong></div>
    <div class="sb-pill">📦 المنتجات: <strong>${totalProds}</strong></div>
  </div>

  ${filteredCats.length===0?`
    <div class="sb-empty">
      <div class="sb-empty-ic">🛒</div>
      <div style="font-size:16px;font-weight:700;margin-bottom:8px">${q?'لا توجد نتائج':'لا توجد تصنيفات بعد'}</div>
      ${!q?`<button class="btn btn-primary" onclick="ph45_showAddCatModal()">➕ أضف أول تصنيف</button>`:''}
    </div>` : `<div class="sb-grid">${grid}</div>`}`;
};

window.ph45_digIntoCat = function(catId) {
  if (!State._digBrowse) State._digBrowse = {};
  State._digBrowse.catId = catId;
  State._digBrowse.storeId = null;
  State.adminSearch = '';
  render();
};

window.ph45_digIntoStore = function(storeId) {
  if (!State._digBrowse) State._digBrowse = {};
  State._digBrowse.storeId = storeId;
  State.adminSearch = '';
  render();
};

window.ph45_digBack = function(from) {
  if (!State._digBrowse) State._digBrowse = {};
  if (from === 'store') { State._digBrowse.storeId = null; }
  else { State._digBrowse.catId = null; State._digBrowse.storeId = null; }
  State.adminSearch = '';
  render();
};

window.ph45_showAddProductInline = function(storeId) {
  const wrap = document.getElementById('ph45-prod-add-wrap');
  if (!wrap) { ph45_showManageProductsModal(storeId); return; }
  wrap.innerHTML = `
    <div style="background:var(--bg-card);border:1px solid rgba(139,92,246,0.3);border-radius:14px;padding:16px;margin-bottom:16px">
      <div style="font-weight:800;font-size:15px;margin-bottom:12px">➕ إضافة منتج جديد</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
        <input class="form-control" id="dprod-name" placeholder="اسم المنتج">
        <input class="form-control" id="dprod-price" type="number" placeholder="السعر (ريال)">
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-primary" onclick="ph45_addProduct('${storeId}')">💾 حفظ</button>
        <button class="btn btn-secondary" onclick="document.getElementById('ph45-prod-add-wrap').innerHTML=''">إلغاء</button>
      </div>
    </div>`;
  wrap.querySelector('#dprod-name')?.focus();
};

// ─── Categories ─────────────────────────────────────────

window.ph45_showAddCatModal = function() {
  openModal(`
    <div class="modal-header"><h2 class="modal-title">➕ إضافة تصنيف رقمي</h2><button class="modal-close" onclick="closeModal()">✕</button></div>
    <div class="form-group"><label class="form-label">الاسم</label><input class="form-control" id="dcat-name" placeholder="مثال: كروت شبكات أو شحن رصيد"></div>
    <div class="form-group"><label class="form-label">الأيقونة</label><input class="form-control" id="dcat-icon" placeholder="مثال: 🌐 أو 📱"></div>
    <div class="form-group"><label class="form-label">ترتيب الظهور</label><input class="form-control" id="dcat-order" type="number" value="0"></div>
    <button class="btn btn-primary btn-block" onclick="ph45_saveCat()">💾 حفظ التصنيف</button>
  `);
};

window.ph45_saveCat = async function() {
  const name = document.getElementById('dcat-name')?.value.trim();
  const icon = document.getElementById('dcat-icon')?.value.trim();
  const order = parseInt(document.getElementById('dcat-order')?.value) || 0;
  if (!name) { toast('أدخل اسم التصنيف', 'error'); return; }
  showLoader();
  try {
    await fsAdd('digital_store_cats', { name, icon, order });
    await ph45_reloadDigitalData();
    hideLoader(); closeModal(); toast('تم الإضافة بنجاح', 'success'); render();
  } catch(e) { hideLoader(); toast('خطأ: ' + e.message, 'error'); }
};

window.ph45_showEditCatModal = function(id) {
  const c = (AppData.digitalStoreCats||[]).find(x => x.id === id);
  if(!c) return;
  openModal(`
    <div class="modal-header"><h2 class="modal-title">✏️ تعديل التصنيف</h2><button class="modal-close" onclick="closeModal()">✕</button></div>
    <div class="form-group"><label class="form-label">الاسم</label><input class="form-control" id="dcat-name" value="${escAttr(c.name)}"></div>
    <div class="form-group"><label class="form-label">الأيقونة</label><input class="form-control" id="dcat-icon" value="${escAttr(c.icon||'')}"></div>
    <div class="form-group"><label class="form-label">ترتيب الظهور</label><input class="form-control" id="dcat-order" type="number" value="${c.order||0}"></div>
    <button class="btn btn-primary btn-block" onclick="ph45_updateCat('${id}')">💾 حفظ</button>
  `);
};

window.ph45_updateCat = async function(id) {
  const name = document.getElementById('dcat-name')?.value.trim();
  const icon = document.getElementById('dcat-icon')?.value.trim();
  const order = parseInt(document.getElementById('dcat-order')?.value) || 0;
  if (!name) { toast('أدخل اسم التصنيف', 'error'); return; }
  showLoader();
  try {
    await fsUpdate('digital_store_cats', id, { name, icon, order });
    await ph45_reloadDigitalData();
    hideLoader(); closeModal(); toast('تم التعديل', 'success'); render();
  } catch(e) { hideLoader(); toast('خطأ: ' + e.message, 'error'); }
};

window.ph45_deleteCat = async function(id) {
  if(!confirm('تأكيد حذف التصنيف؟ سيتم الاحتفاظ بالمتاجر ولكن بدون تصنيف.')) return;
  showLoader();
  try {
    await fsDelete('digital_store_cats', id);
    await ph45_reloadDigitalData();
    hideLoader(); toast('تم الحذف', 'success'); render();
  } catch(e) { hideLoader(); toast('خطأ: ' + e.message, 'error'); }
};

// ─── Stores ─────────────────────────────────────────────

window.ph45_showAddStoreModal = function(activeCatId) {
  const cats = AppData.digitalStoreCats || [];
  const regions = AppData.regions || [];
  window.__ph45_pendingImg = null;
  openModal(`
    <div class="modal-header"><h2 class="modal-title">➕ إضافة متجر رقمي</h2><button class="modal-close" onclick="closeModal()">✕</button></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="form-group">
        <label class="form-label">التصنيف</label>
        <select class="form-control" id="dstore-cat">
          <option value="">— بدون تصنيف —</option>
          ${cats.map(c => `<option value="${c.id}" ${c.id === activeCatId ? 'selected' : ''}>${c.icon||''} ${escHtml(c.name)}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">المنطقة</label>
        <select class="form-control" id="dstore-region">
          <option value="">— جميع المناطق —</option>
          ${regions.map(r => `<option value="${r.id}">${escHtml(r.name)}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="form-group"><label class="form-label">اسم المتجر *</label><input class="form-control" id="dstore-name" placeholder="مثال: يمن موبايل"></div>
    <div class="form-group"><label class="form-label">وصف مختصر</label><textarea class="form-control" id="dstore-desc" placeholder="..."></textarea></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="form-group"><label class="form-label">العمولة للإدارة (%)</label><input class="form-control" id="dstore-comm" type="number" value="0"></div>
      <div class="form-group"><label class="form-label">الضريبة (%)</label><input class="form-control" id="dstore-tax" type="number" value="0"></div>
    </div>
    
    <div class="form-group" style="background:var(--bg-secondary);padding:12px;border-radius:12px;border:1px solid var(--glass-border)">
      <label class="toggle-switch" style="margin-bottom:8px">
        <input type="checkbox" id="dstore-req-vendor" onchange="document.getElementById('dstore-vendors-wrap').style.display = this.checked ? 'block' : 'none'">
        <span class="toggle-slider"></span>
        <span style="font-weight:700;margin-right:12px">هل يتطلب مزود خدمة إجباري؟</span>
      </label>
      <div style="font-size:11px;color:var(--text-muted)">إذا كان المتجر يحتاج لمزودين ينفذون الطلبات (مثل تحويل رصيد يدوي). اتركه مغلقاً إذا كانت الأكواد تُسلم تلقائياً.</div>
      
      <div id="dstore-vendors-wrap" style="display:none;margin-top:12px;border-top:1px solid var(--glass-border);padding-top:12px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
          <label class="form-label" style="margin:0;font-size:12px">اختر مزودي الخدمة (لتنفيذ الطلبات يدوياً)</label>
        </div>
        <div style="position:relative;margin-bottom:10px;">
          <span style="position:absolute;top:50%;right:12px;transform:translateY(-50%);font-size:16px;pointer-events:none;">🔍</span>
          <input type="text" class="form-control" placeholder="بحث بالاسم..."
            style="padding-right:40px;background:var(--bg-card);border-radius:10px;"
            oninput="(function(q){document.querySelectorAll('.ds-vendor-row').forEach(r=>{r.style.display=(r.dataset.name).includes(q.toLowerCase())?'':'none'})})(this.value.toLowerCase())">
        </div>
        <div style="max-height:240px;overflow-y:auto;border:1px solid var(--glass-border);border-radius:12px;padding:12px;background:var(--bg-card)">
          ${(AppData.users||[]).filter(u=>u.role==='vendor'||u.role==='provider').map(u=>`
            <label class="ds-vendor-row" data-name="${(u.name||'').toLowerCase()}" style="display:flex;align-items:center;gap:12px;padding:10px;background:var(--bg-secondary);border:1px solid var(--glass-border);border-radius:10px;margin-bottom:8px;cursor:pointer;transition:all 0.2s">
              <input type="checkbox" class="dstore-vendor-cb" value="${u.uid}" style="width:18px;height:18px;accent-color:var(--primary);margin:0">
              <div style="width:36px;height:36px;border-radius:50%;background:rgba(139,92,246,0.1);color:var(--primary);display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:14px">
                ${escHtml(u.name).charAt(0)}
              </div>
              <div style="flex:1">
                <div style="font-weight:700;font-size:14px">${escHtml(u.name)}</div>
                <div style="font-size:11px;color:var(--text-muted)">${u.phone||'بدون رقم'} • ${u.role === 'provider' ? 'مزود خدمة' : 'بائع'}</div>
              </div>
            </label>
          `).join('')}
        </div>
      </div>
    </div>
    
    <div class="form-group" style="margin-top:12px">
      <label class="form-label">شعار المتجر</label>
      <input type="file" class="form-control" accept="image/*" onchange="ph45_previewImg(this)">
      <div id="dstore-img-preview" style="margin-top:8px"></div>
    </div>
    <div class="form-group" style="display:flex;align-items:center;gap:12px">
      <label class="toggle-switch"><input type="checkbox" id="dstore-active" checked><span class="toggle-slider"></span></label>
      <span>متجر نشط ومرئي للعملاء</span>
    </div>
    <button class="btn btn-primary btn-block" onclick="ph45_saveStore()">💾 حفظ المتجر</button>
  `);
};

window.ph45_previewImg = function(input) {
  const file = input.files[0];
  if (!file) return;
  if (file.size > 5*1024*1024) { toast('الصورة كبيرة جداً', 'error'); input.value=''; return; }
  const reader = new FileReader();
  reader.onload = e => {
    const prev = document.getElementById('dstore-img-preview');
    if (prev) prev.innerHTML = `<img src="${e.target.result}" style="width:70px;height:70px;border-radius:12px;object-fit:cover;border:2px solid var(--primary)">`;
    window.__ph45_pendingImg = e.target.result;
  };
  reader.readAsDataURL(file);
};

window.ph45_saveStore = async function() {
  const catId = document.getElementById('dstore-cat')?.value || null;
  const regionId = document.getElementById('dstore-region')?.value || null;
  const name = document.getElementById('dstore-name')?.value.trim();
  const desc = document.getElementById('dstore-desc')?.value.trim();
  const commission = parseFloat(document.getElementById('dstore-comm')?.value) || 0;
  const tax = parseFloat(document.getElementById('dstore-tax')?.value) || 0;
  const requireVendor = document.getElementById('dstore-req-vendor')?.checked || false;
  const vendors = Array.from(document.querySelectorAll('.dstore-vendor-cb:checked')).map(cb=>cb.value);
  const active = document.getElementById('dstore-active')?.checked !== false;
  const icon = window.__ph45_pendingImg || null;

  if (!name) { toast('أدخل اسم المتجر', 'error'); return; }
  if (requireVendor && !vendors.length) { toast('يرجى اختيار مزود خدمة واحد على الأقل', 'error'); return; }
  showLoader();
  try {
    await fsAdd('digital_stores', { catId, regionId, name, desc, commission, tax, requireVendor, vendors, active, icon, order:0 });
    window.__ph45_pendingImg = null;
    await ph45_reloadDigitalData();
    hideLoader(); closeModal(); toast('تم حفظ المتجر', 'success'); render();
  } catch(e) { hideLoader(); toast('خطأ: ' + e.message, 'error'); }
};

window.ph45_showEditStoreModal = function(id) {
  const s = (AppData.digitalStores||[]).find(x => x.id === id);
  if(!s) return;
  const cats = AppData.digitalStoreCats || [];
  const regions = AppData.regions || [];
  window.__ph45_pendingImg = null;
  openModal(`
    <div class="modal-header"><h2 class="modal-title">✏️ تعديل المتجر</h2><button class="modal-close" onclick="closeModal()">✕</button></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="form-group">
        <label class="form-label">التصنيف</label>
        <select class="form-control" id="dstore-cat">
          <option value="">— بدون تصنيف —</option>
          ${cats.map(c => `<option value="${c.id}" ${s.catId===c.id?'selected':''}>${c.icon||''} ${escHtml(c.name)}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">المنطقة</label>
        <select class="form-control" id="dstore-region">
          <option value="">— جميع المناطق —</option>
          ${regions.map(r => `<option value="${r.id}" ${s.regionId===r.id?'selected':''}>${escHtml(r.name)}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="form-group"><label class="form-label">اسم المتجر *</label><input class="form-control" id="dstore-name" value="${escAttr(s.name)}"></div>
    <div class="form-group"><label class="form-label">وصف مختصر</label><textarea class="form-control" id="dstore-desc">${escHtml(s.desc||'')}</textarea></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="form-group"><label class="form-label">العمولة للإدارة (%)</label><input class="form-control" id="dstore-comm" type="number" value="${s.commission||0}"></div>
      <div class="form-group"><label class="form-label">الضريبة (%)</label><input class="form-control" id="dstore-tax" type="number" value="${s.tax||0}"></div>
    </div>
    
    <div class="form-group" style="background:var(--bg-secondary);padding:12px;border-radius:12px;border:1px solid var(--glass-border)">
      <label class="toggle-switch" style="margin-bottom:8px">
        <input type="checkbox" id="dstore-req-vendor" onchange="document.getElementById('dstore-vendors-wrap').style.display = this.checked ? 'block' : 'none'" ${s.requireVendor?'checked':''}>
        <span class="toggle-slider"></span>
        <span style="font-weight:700;margin-right:12px">هل يتطلب مزود خدمة إجباري؟</span>
      </label>
      <div style="font-size:11px;color:var(--text-muted)">إذا كان المتجر يحتاج لمزودين ينفذون الطلبات (مثل تحويل رصيد يدوي). اتركه مغلقاً إذا كانت الأكواد تُسلم تلقائياً.</div>
      
      <div id="dstore-vendors-wrap" style="display:${s.requireVendor?'block':'none'};margin-top:12px;border-top:1px solid var(--glass-border);padding-top:12px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
          <label class="form-label" style="margin:0;font-size:12px">اختر مزودي الخدمة (لتنفيذ الطلبات يدوياً)</label>
        </div>
        <div style="position:relative;margin-bottom:10px;">
          <span style="position:absolute;top:50%;right:12px;transform:translateY(-50%);font-size:16px;pointer-events:none;">🔍</span>
          <input type="text" class="form-control" placeholder="بحث بالاسم..."
            style="padding-right:40px;background:var(--bg-card);border-radius:10px;"
            oninput="(function(q){document.querySelectorAll('.ds-vendor-row').forEach(r=>{r.style.display=(r.dataset.name).includes(q.toLowerCase())?'':'none'})})(this.value.toLowerCase())">
        </div>
        <div style="max-height:240px;overflow-y:auto;border:1px solid var(--glass-border);border-radius:12px;padding:12px;background:var(--bg-card)">
          ${(AppData.users||[]).filter(u=>u.role==='vendor'||u.role==='provider').map(u=>`
            <label class="ds-vendor-row" data-name="${(u.name||'').toLowerCase()}" style="display:flex;align-items:center;gap:12px;padding:10px;background:var(--bg-secondary);border:1px solid var(--glass-border);border-radius:10px;margin-bottom:8px;cursor:pointer;transition:all 0.2s">
              <input type="checkbox" class="dstore-vendor-cb" value="${u.uid}" ${(s.vendors||[]).includes(u.uid)?'checked':''} style="width:18px;height:18px;accent-color:var(--primary);margin:0">
              <div style="width:36px;height:36px;border-radius:50%;background:rgba(139,92,246,0.1);color:var(--primary);display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:14px">
                ${escHtml(u.name).charAt(0)}
              </div>
              <div style="flex:1">
                <div style="font-weight:700;font-size:14px">${escHtml(u.name)}</div>
                <div style="font-size:11px;color:var(--text-muted)">${u.phone||'بدون رقم'} • ${u.role === 'provider' ? 'مزود خدمة' : 'بائع'}</div>
              </div>
            </label>
          `).join('')}
        </div>
      </div>
    </div>
    
    <div class="form-group" style="margin-top:12px">
      <label class="form-label">شعار المتجر</label>
      ${s.icon ? `<img src="${s.icon}" style="width:60px;height:60px;border-radius:10px;object-fit:cover;margin-bottom:8px;border:2px solid var(--primary);display:block">` : ''}
      <input type="file" class="form-control" accept="image/*" onchange="ph45_previewImg(this)">
      <div id="dstore-img-preview" style="margin-top:8px"></div>
    </div>
    <div class="form-group" style="display:flex;align-items:center;gap:12px">
      <label class="toggle-switch"><input type="checkbox" id="dstore-active" ${s.active!==false?'checked':''}><span class="toggle-slider"></span></label>
      <span>متجر نشط ومرئي للعملاء</span>
    </div>
    <button class="btn btn-primary btn-block" onclick="ph45_updateStore('${id}')">💾 حفظ</button>
  `);
};

window.ph45_updateStore = async function(id) {
  const catId = document.getElementById('dstore-cat')?.value || null;
  const regionId = document.getElementById('dstore-region')?.value || null;
  const name = document.getElementById('dstore-name')?.value.trim();
  const desc = document.getElementById('dstore-desc')?.value.trim();
  const commission = parseFloat(document.getElementById('dstore-comm')?.value) || 0;
  const tax = parseFloat(document.getElementById('dstore-tax')?.value) || 0;
  const requireVendor = document.getElementById('dstore-req-vendor')?.checked || false;
  const vendors = Array.from(document.querySelectorAll('.dstore-vendor-cb:checked')).map(cb=>cb.value);
  const active = document.getElementById('dstore-active')?.checked !== false;
  
  if (!name) { toast('أدخل اسم المتجر', 'error'); return; }
  if (requireVendor && !vendors.length) { toast('يرجى اختيار مزود خدمة واحد على الأقل', 'error'); return; }
  const upd = { catId, regionId, name, desc, commission, tax, requireVendor, vendors, active };
  if (window.__ph45_pendingImg) upd.icon = window.__ph45_pendingImg;
  
  showLoader();
  try {
    await fsUpdate('digital_stores', id, upd);
    window.__ph45_pendingImg = null;
    await ph45_reloadDigitalData();
    hideLoader(); closeModal(); toast('تم التعديل', 'success'); render();
  } catch(e) { hideLoader(); toast('خطأ: ' + e.message, 'error'); }
};

window.ph45_deleteStore = async function(id) {
  if(!confirm('هل أنت متأكد من حذف المتجر بالكامل؟')) return;
  showLoader();
  try {
    await fsDelete('digital_stores', id);
    // Delete all products for this store
    const prods = (AppData.digitalProducts||[]).filter(p => p.storeId === id);
    for(const p of prods) await fsDelete('digital_products', p.id);
    await ph45_reloadDigitalData();
    hideLoader(); toast('تم الحذف', 'success'); render();
  } catch(e) { hideLoader(); toast('خطأ: ' + e.message, 'error'); }
};

// ─── Products ───────────────────────────────────────────

window.ph45_showManageProductsModal = function(storeId) {
  const s = (AppData.digitalStores||[]).find(x => x.id === storeId);
  if(!s) return;
  const prods = (AppData.digitalProducts||[]).filter(p => p.storeId === storeId);
  
  // Custom large modal
  openModal(`
    <div class="modal-header">
      <h2 class="modal-title">📦 منتجات المتجر: ${escHtml(s.name)}</h2>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    
    <div style="background:var(--bg-secondary);border-radius:14px;padding:16px;margin-bottom:20px">
      <h3 style="margin-bottom:12px;font-size:15px">➕ إضافة منتج جديد</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <input class="form-control" id="dprod-name" placeholder="اسم المنتج (مثال: كرت 500 ريال)">
        <input class="form-control" id="dprod-price" type="number" placeholder="السعر (ريال)">
      </div>
      <button class="btn btn-primary" style="margin-top:10px;width:100%" onclick="ph45_addProduct('${storeId}')">إضافة</button>
    </div>

    <div style="max-height:400px;overflow-y:auto;padding-right:4px">
      ${prods.length ? prods.map(p => {
        const available = (AppData.digitalCodes||[]).filter(c => c.digitalProductId === p.id && c.status === 'available').length;
        return `
        <div style="background:var(--bg-card);border:1px solid var(--glass-border);border-radius:12px;padding:12px;margin-bottom:10px;display:flex;align-items:center;justify-content:space-between">
          <div>
            <div style="font-weight:700">${escHtml(p.name)}</div>
            <div style="color:var(--primary);font-weight:800;font-size:13px">${p.price} ريال</div>
          </div>
          <div style="display:flex;align-items:center;gap:6px">
            <button class="btn btn-sm" style="background:var(--bg-secondary);border:1px solid var(--primary);color:var(--primary);display:flex;align-items:center;gap:4px" onclick="ph45_showCodesModal('${p.id}')">
              🔑 أكواد <span style="background:var(--primary);color:#fff;padding:2px 6px;border-radius:10px;font-size:10px">${available}</span>
            </button>
            <button class="btn btn-sm btn-danger" onclick="ph45_deleteProduct('${p.id}', '${storeId}')">🗑️</button>
          </div>
        </div>
        `;
      }).join('') : '<div style="text-align:center;color:var(--text-muted);padding:20px">لا توجد منتجات</div>'}
    </div>
  `);
};

window.ph45_addProduct = async function(storeId) {
  const name = document.getElementById('dprod-name')?.value.trim();
  const price = parseFloat(document.getElementById('dprod-price')?.value) || 0;
  
  if (!name || !price) { toast('أدخل الاسم والسعر', 'error'); return; }
  
  showLoader();
  try {
    await fsAdd('digital_products', { storeId, name, price, active:true });
    await ph45_reloadDigitalData();
    hideLoader(); toast('تمت الإضافة', 'success');
    ph45_showManageProductsModal(storeId); // Refresh modal
    render(); // Update background table counts
  } catch(e) { hideLoader(); toast('خطأ: ' + e.message, 'error'); }
};

window.ph45_deleteProduct = async function(id, storeId) {
  if(!confirm('حذف هذا المنتج؟ (سيتم الاحتفاظ بالأكواد المباعة في الفواتير ولكن سيُحذف المنتج)')) return;
  showLoader();
  try {
    await fsDelete('digital_products', id);
    // Also delete available codes linked to it
    const codes = (AppData.digitalCodes||[]).filter(c => c.digitalProductId === id && c.status === 'available');
    for(const c of codes) await fsDelete('digital_codes', c.id);
    await ph45_reloadDigitalData();
    hideLoader(); toast('تم الحذف', 'success');
    ph45_showManageProductsModal(storeId);
    render();
  } catch(e) { hideLoader(); toast('خطأ: ' + e.message, 'error'); }
};

// ─── Codes Inventory System (from previous digital-codes.js) ───

window.ph45_showCodesModal = function (productId) {
  const p = (AppData.digitalProducts || []).find(x => x.id === productId);
  if (!p) return;

  const allCodes = (AppData.digitalCodes || []).filter(c => c.digitalProductId === productId);
  const available = allCodes.filter(c => c.status === 'available');
  const sold      = allCodes.filter(c => c.status === 'sold');

  openModal(`
    <div class="modal-header">
      <h2 class="modal-title">🔑 مخزون الأكواد — ${escHtml(p.name)}</h2>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>

    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px">
      <div style="background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.2);border-radius:12px;padding:14px;text-align:center">
        <div style="font-size:26px;font-weight:800;color:#10b981">${available.length}</div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:2px">متاح للبيع</div>
      </div>
      <div style="background:rgba(139,92,246,0.08);border:1px solid rgba(139,92,246,0.2);border-radius:12px;padding:14px;text-align:center">
        <div style="font-size:26px;font-weight:800;color:var(--primary)">${sold.length}</div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:2px">مباع</div>
      </div>
      <div style="background:rgba(59,130,246,0.08);border:1px solid rgba(59,130,246,0.2);border-radius:12px;padding:14px;text-align:center">
        <div style="font-size:26px;font-weight:800;color:#3b82f6">${allCodes.length}</div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:2px">الإجمالي</div>
      </div>
    </div>

    ${available.length < 10 && available.length > 0 ? `
    <div style="background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.3);border-radius:10px;padding:10px 14px;margin-bottom:16px;font-size:13px;color:#d97706;font-weight:600">
      ⚠️ تنبيه: المخزون المتاح منخفض (${available.length} كود فقط). يرجى رفع أكواد جديدة قريباً.
    </div>` : ''}

    ${available.length === 0 ? `
    <div style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:10px;padding:10px 14px;margin-bottom:16px;font-size:13px;color:#dc2626;font-weight:600">
      🚫 نفد المخزون! لن يتمكن العملاء من شراء هذا المنتج حتى يتم رفع أكواد جديدة.
    </div>` : ''}

    <div style="border:1px solid var(--glass-border);border-radius:14px;overflow:hidden;margin-bottom:20px">
      <div style="background:var(--bg-secondary);padding:12px 16px;font-weight:700;font-size:14px;display:flex;justify-content:space-between;align-items:center">
        <span>📋 الأكواد المتاحة (${available.length})</span>
        ${available.length > 0 ? `<button class="btn btn-sm btn-danger" onclick="ph45_clearAvailable('${productId}')">🗑️ حذف الكل</button>` : ''}
      </div>
      <div style="max-height:180px;overflow-y:auto;padding:10px 14px">
        ${available.length ? available.slice(0,50).map((c,i) => `
          <div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid var(--glass-border)">
            <span style="color:var(--text-muted);font-size:12px;min-width:28px">#${c.seq||i+1}</span>
            <span style="font-family:monospace;font-size:13px;flex:1;letter-spacing:.5px">${escHtml(c.code)}</span>
            <button style="background:none;border:none;cursor:pointer;color:#ef4444;font-size:16px;padding:0 4px" onclick="ph45_deleteSingleCode('${c.id}','${productId}')" title="حذف">✕</button>
          </div>`).join('') + (available.length > 50 ? `<div style="text-align:center;color:var(--text-muted);font-size:12px;padding:8px">... و ${available.length-50} كود آخر</div>` : '')
        : '<p style="text-align:center;color:var(--text-muted);padding:14px;margin:0">لا توجد أكواد متاحة</p>'}
      </div>
    </div>

    <div style="background:var(--bg-secondary);border-radius:14px;padding:18px">
      <div style="font-weight:700;margin-bottom:14px;font-size:14px">⬆️ رفع أكواد جديدة</div>
      <div style="display:flex;gap:8px;margin-bottom:12px">
        <button class="ph44-tab-btn active" id="ph44-tab-file" onclick="ph45_switchTab('file')">📄 ملف PDF/TXT</button>
        <button class="ph44-tab-btn" id="ph44-tab-paste" onclick="ph45_switchTab('paste')">📋 لصق نصي</button>
        <button class="ph44-tab-btn" id="ph44-tab-single" onclick="ph45_switchTab('single')">➕ كود واحد</button>
      </div>

      <div id="ph44-panel-file">
        <input type="file" class="form-control" accept=".pdf,.txt,.csv" onchange="ph45_handleFileUpload(this, '${productId}')">
        <div id="ph44-extract-preview" style="margin-top:12px"></div>
      </div>
      <div id="ph44-panel-paste" style="display:none">
        <textarea class="form-control" id="ph44-paste-area" rows="6" placeholder="الصق الأكواد هنا..."></textarea>
        <button class="btn btn-primary btn-block" style="margin-top:10px" onclick="ph45_savePastedCodes('${productId}')">💾 حفظ الأكواد</button>
      </div>
      <div id="ph44-panel-single" style="display:none">
        <input class="form-control" id="ph44-single-code" placeholder="أدخل الكود...">
        <button class="btn btn-primary btn-block" style="margin-top:10px" onclick="ph45_saveSingleCode('${productId}')">➕ إضافة</button>
      </div>
    </div>
  `);
};

window.ph45_switchTab = function (tab) {
  ['file','paste','single'].forEach(t => {
    document.getElementById('ph44-panel-' + t).style.display = t === tab ? 'block' : 'none';
    const btn = document.getElementById('ph44-tab-' + t);
    if (btn) btn.classList.toggle('active', t === tab);
  });
};

window.ph45_handleFileUpload = async function (input, productId) {
  const file = input.files[0];
  if (!file) return;
  const preview = document.getElementById('ph44-extract-preview');
  if (preview) preview.innerHTML = '<div style="color:var(--text-muted);font-size:13px">⏳ جارٍ استخراج الأكواد...</div>';

  let rawText = '';
  try {
    if (file.name.endsWith('.pdf')) {
      if (!window.pdfjsLib) {
        await new Promise((resolve, reject) => {
          const s = document.createElement('script');
          s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
          s.onload = resolve; s.onerror = reject; document.head.appendChild(s);
        });
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      }
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        rawText += content.items.map(item => item.str).join(' ') + '\n';
      }
    } else {
      rawText = await file.text();
    }
  } catch(e) {
    if (preview) preview.innerHTML = '<div style="color:#ef4444;font-size:13px">❌ خطأ: ' + escHtml(e.message) + '</div>';
    return;
  }

  const codes = ph45_parseCodes(rawText);
  if (!codes.length) {
    if (preview) preview.innerHTML = '<div style="color:#f59e0b;font-size:13px">⚠️ لم يُعثر على أكواد</div>';
    return;
  }
  window.__ph45_pendingCodes = codes;
  if (preview) preview.innerHTML = `
    <div style="background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.2);border-radius:10px;padding:12px">
      <div style="font-weight:700;color:#10b981;margin-bottom:8px">✅ استُخرج ${codes.length} كود</div>
      <button class="btn btn-primary btn-block" onclick="ph45_saveExtractedCodes('${productId}')">💾 حفظ الأكواد</button>
    </div>`;
};

window.ph45_parseCodes = function (text) {
  const lines = text.split(/[\n\r]+/);
  const codes = [];
  const seen = new Set();
  lines.forEach(line => {
    const trimmed = line.trim().replace(/^[\d]+[\.\)\-\s]+/, '').trim();
    if (trimmed.length >= 4 && trimmed.length <= 100 && !seen.has(trimmed) && /[A-Za-z0-9]/.test(trimmed)) {
      seen.add(trimmed); codes.push(trimmed);
    }
  });
  return codes;
};

window.ph45_saveExtractedCodes = async function (productId) {
  if (!window.__ph45_pendingCodes) return;
  await ph45_uploadCodes(productId, window.__ph45_pendingCodes);
  window.__ph45_pendingCodes = null;
};
window.ph45_savePastedCodes = async function (productId) {
  const text = document.getElementById('ph44-paste-area')?.value || '';
  const codes = ph45_parseCodes(text);
  if (!codes.length) { toast('لم يُعثر على أكواد', 'error'); return; }
  await ph45_uploadCodes(productId, codes);
};
window.ph45_saveSingleCode = async function (productId) {
  const code = document.getElementById('ph44-single-code')?.value.trim();
  if (!code) { toast('أدخل الكود', 'error'); return; }
  await ph45_uploadCodes(productId, [code]);
};

window.ph45_uploadCodes = async function (productId, codes) {
  showLoader(`جاري رفع ${codes.length} كود...`);
  try {
    const existing = (AppData.digitalCodes || []).filter(c => c.digitalProductId === productId);
    const existingSet = new Set(existing.map(c => c.code));
    const newCodes = codes.filter(c => !existingSet.has(c));
    if (!newCodes.length) { hideLoader(); toast('جميع الأكواد موجودة بالفعل', 'warning'); return; }
    
    const startSeq = existing.length + 1;
    for (let i = 0; i < newCodes.length; i++) {
      await fsAdd('digital_codes', {
        digitalProductId: productId,
        code: newCodes[i],
        seq: startSeq + i,
        status: 'available',
        orderId: null,
        createdAt: new Date().toISOString()
      });
    }
    await ph45_reloadDigitalData();
    hideLoader(); toast(`تم رفع ${newCodes.length} كود`, 'success');
    ph45_showManageProductsModal((AppData.digitalProducts||[]).find(p=>p.id===productId)?.storeId);
    ph45_showCodesModal(productId);
  } catch(e) { hideLoader(); toast('خطأ: ' + e.message, 'error'); }
};

window.ph45_deleteSingleCode = async function (codeId, productId) {
  await fsDelete('digital_codes', codeId);
  await ph45_reloadDigitalData();
  ph45_showCodesModal(productId);
};
window.ph45_clearAvailable = async function (productId) {
  if (!confirm('حذف كل الأكواد المتاحة؟')) return;
  const toDelete = (AppData.digitalCodes||[]).filter(c => c.digitalProductId === productId && c.status === 'available');
  showLoader();
  for(const c of toDelete) await fsDelete('digital_codes', c.id);
  await ph45_reloadDigitalData();
  hideLoader(); ph45_showCodesModal(productId);
};

// ─── Auto Code Assignment (Overriding updateOrderStatus) ───

window.ph45_assignCodeToOrder = async function (orderId) {
  const order = (AppData.orders || []).find(o => o.id === orderId);
  if (!order || !order.items) return null;

  const products = AppData.digitalProducts || [];
  let assignedCode = null;

  for (const item of order.items) {
    if (item.productType !== 'digital') continue; // Only process digital products
    
    const baseId = item.productId;
    const product = products.find(p => p.id === baseId);
    if (!product) continue;

    const available = (AppData.digitalCodes || [])
      .filter(c => c.digitalProductId === baseId && c.status === 'available')
      .sort((a, b) => (a.seq || 0) - (b.seq || 0));

    if (!available.length) {
      toast(`⚠️ نفد مخزون الأكواد للمنتج: ${product.name}`, 'warning');
      continue;
    }

    const codeDoc = available[0];
    try {
      await fsUpdate('digital_codes', codeDoc.id, {
        status: 'sold', orderId, customerId: order.userId || order.customerId || null, soldAt: new Date().toISOString()
      });
      await fsUpdate('orders', orderId, {
        digitalCode: codeDoc.code, digitalCodeId: codeDoc.id, digitalProductName: product.name
      });
      
      const localCode = (AppData.digitalCodes || []).find(c => c.id === codeDoc.id);
      if (localCode) { localCode.status = 'sold'; localCode.orderId = orderId; }
      const localOrder = (AppData.orders || []).find(o => o.id === orderId);
      if (localOrder) { localOrder.digitalCode = codeDoc.code; localOrder.digitalProductName = product.name; }
      
      assignedCode = codeDoc.code;
      toast(`🔑 تم تعيين الكود لمنتج ${product.name}`, 'success');
    } catch(e) { console.error('Error assigning code', e); }
  }
  return assignedCode;
};

// Patching the function globally
setTimeout(() => {
  const __origUOS = window.updateOrderStatus;
  if (typeof __origUOS === 'function' && !window.__ph45_patched_uos) {
    window.__ph45_patched_uos = true;
    window.updateOrderStatus = async function (orderId, status) {
      await __origUOS(orderId, status);
      if (status === 'completed' || status === 'accepted') {
        await ph45_assignCodeToOrder(orderId);
      }
    };
  }
}, 3000);


// ───────────────────────────────────────────────────────
// SECTION 2 — CUSTOMER UI
// ───────────────────────────────────────────────────────

window.ph45_renderDigitalStorefront = function() {
  const _regionId = State.currentUser?.regionId;
  const cats = (AppData.digitalStoreCats || []).sort((a,b)=>(a.order||0)-(b.order||0));
  const stores = (AppData.digitalStores || []).filter(s => {
    if (s.active === false) return false;
    if (_regionId && s.regionId && s.regionId !== _regionId) return false;
    return true;
  });
  
  return `
    <div style="background:var(--bg-card);border-radius:20px;padding:24px;border:1px solid var(--glass-border);margin-bottom:24px">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px">
        <div style="width:48px;height:48px;background:linear-gradient(135deg,var(--primary),#c4b5fd);border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:24px;color:#fff;box-shadow:0 8px 20px rgba(139,92,246,0.25)">⚡</div>
        <div>
          <h2 style="margin:0;font-size:22px;font-weight:800">الشحن والمنتجات الرقمية</h2>
          <div style="font-size:13px;color:var(--text-secondary);margin-top:2px">رصيد، كروت شبكات، تسديد فواتير والمزيد — تسليم فوري للأكواد!</div>
        </div>
      </div>
      
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px">
        ${cats.map(c => {
          const catStores = stores.filter(s => s.catId === c.id && s.active !== false);
          return `
          <div onclick="navigate('stores', { digital: 'cat', catId: '${c.id}' })" style="background:var(--bg-secondary);border:1px solid var(--glass-border);border-radius:16px;padding:16px;text-align:center;cursor:pointer;transition:all 0.2s">
            <div style="font-size:32px;margin-bottom:10px">${c.icon||'📦'}</div>
            <div style="font-weight:700;font-size:14px">${escHtml(c.name)}</div>
            <div style="font-size:11px;color:var(--text-muted);margin-top:4px">${catStores.length} متجر متوفر</div>
          </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
};

window.ph45_renderDigitalCat = function(catId) {
  const _regionId = State.currentUser?.regionId;
  const cat = (AppData.digitalStoreCats||[]).find(c=>c.id===catId);
  const stores = (AppData.digitalStores||[]).filter(s => {
    if (s.catId !== catId || s.active === false) return false;
    if (_regionId && s.regionId && s.regionId !== _regionId) return false;
    return true;
  });
  
  let content = `
    <div style="margin-bottom:20px">
      <button class="btn btn-secondary btn-sm" onclick="navigate('stores', { digital: 'cats' })" style="margin-bottom:16px">⬅️ عودة للأقسام</button>
      <h2 style="font-size:22px;font-weight:800;margin:0">${cat?.icon||''} ${escHtml(cat?.name||'')}</h2>
    </div>
    
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px">
      ${stores.map(s => `
        <div onclick="navigate('stores', { digital: 'store', storeId: '${s.id}' })" style="background:var(--bg-card);border:1px solid var(--glass-border);border-radius:18px;padding:16px;display:flex;align-items:center;gap:14px;cursor:pointer;transition:all 0.2s">
          <div style="width:64px;height:64px;border-radius:14px;background:var(--bg-secondary);display:flex;align-items:center;justify-content:center;font-size:32px;flex-shrink:0;overflow:hidden;border:1px solid var(--glass-border)">
            ${s.icon ? `<img src="${s.icon}" style="width:100%;height:100%;object-fit:cover">` : '🏪'}
          </div>
          <div>
            <div style="font-weight:800;font-size:16px;margin-bottom:4px">${escHtml(s.name)}</div>
            ${s.desc ? `<div style="font-size:12px;color:var(--text-secondary);line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${escHtml(s.desc)}</div>` : ''}
          </div>
        </div>
      `).join('')}
      ${stores.length === 0 ? '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-muted)">لا توجد متاجر متاحة حالياً في هذا القسم</div>' : ''}
    </div>
  `;
  return `
    <div style="max-width:1200px;margin:0 auto;padding:24px 16px">
      ${content}
    </div>
  `;
};

function _ph45_renderProductCard(p, storeId) {
  const offer = typeof ph_getActiveOffer === 'function' ? ph_getActiveOffer(p.id) : null;
  const pct = offer ? (offer.discountPercent || (offer.originalPrice > 0 ? Math.round(((offer.originalPrice - offer.discountedPrice) / offer.originalPrice) * 100) : 0)) : 0;
  const fallbackPrice = '<div style="font-size:20px;font-weight:800;color:var(--primary)">' + p.price + ' <span style="font-size:12px;color:var(--text-muted)">ريال</span></div>';
  const priceHtml = offer && typeof ph_offerPriceHtml === 'function' ? ph_offerPriceHtml(offer, fallbackPrice) : fallbackPrice;
  const badge = offer && typeof ph_offerBadgeHtml === 'function' ? ph_offerBadgeHtml(pct) : '';
  const btnLabel = offer ? '🏷️ أضف بالسعر المخفض' : '🛒 إضافة للسلة';
  const border = offer ? 'rgba(239,68,68,0.3)' : 'var(--glass-border)';
  const waND = (AppData.platformSettings && AppData.platformSettings.whatsappNumber ? AppData.platformSettings.whatsappNumber : '').replace(/\D/g, '');
  const waLink = waND ? '<a class="btn-wa-inquiry btn-wa-inquiry--full" style="margin-top:8px" href="https://wa.me/' + waND + '?text=' + encodeURIComponent('أهلاً، أريد الاستفسار عن: ' + p.name) + '" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg><span>استفسر عبر واتساب</span></a>' : '';
  return '<div style="background:var(--bg-card);border:1px solid ' + border + ';border-radius:16px;padding:16px;display:flex;flex-direction:column;justify-content:space-between;position:relative;overflow:hidden">'
    + badge
    + '<div style="margin-bottom:16px"><div style="font-weight:800;font-size:16px;margin-bottom:8px">' + escHtml(p.name) + '</div>' + priceHtml + '</div>'
    + '<button class="btn btn-primary" style="width:100%;border-radius:12px;font-weight:700" onclick="ph45_addToCart(\'' + p.id + '\', \'' + storeId + '\')">' + btnLabel + '</button>'
    + waLink
    + '</div>';
}

window.ph45_renderDigitalStore = function(storeId) {
  const store = (AppData.digitalStores||[]).find(s=>s.id===storeId);
  const prods = (AppData.digitalProducts||[]).filter(p=>p.storeId===storeId && p.active!==false);
  
  if (!store) return '';

  const prodsHtml = prods.length
    ? prods.map(p => _ph45_renderProductCard(p, storeId)).join('')
    : '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-muted)">لا توجد منتجات حالياً</div>';

  let content = `
    <div style="margin-bottom:24px">
      <button class="btn btn-secondary btn-sm" onclick="navigate('stores', { digital: 'cat', catId: '${store.catId}' })" style="margin-bottom:16px">⬅️ عودة للمتاجر</button>
      <div style="display:flex;align-items:center;gap:16px;background:var(--bg-card);padding:20px;border-radius:20px;border:1px solid var(--glass-border)">
        <div style="width:80px;height:80px;border-radius:18px;background:var(--bg-secondary);display:flex;align-items:center;justify-content:center;font-size:36px;flex-shrink:0;overflow:hidden;border:1px solid var(--glass-border)">
          ${store.icon ? `<img src="${store.icon}" style="width:100%;height:100%;object-fit:cover">` : '🏪'}
        </div>
        <div>
          <h2 style="font-size:24px;font-weight:800;margin:0 0 6px 0">${escHtml(store.name)}</h2>
          ${store.desc ? `<div style="font-size:14px;color:var(--text-secondary)">${escHtml(store.desc)}</div>` : ''}
        </div>
      </div>
    </div>
    
    <h3 style="font-size:18px;margin-bottom:16px">📦 المنتجات المتاحة</h3>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px">
      ${prodsHtml}
    </div>
  `;
  return `
    <div style="max-width:1200px;margin:0 auto;padding:24px 16px">
      ${content}
    </div>
  `;
};

// Using the same cart system as ph43, but adding a productType='digital' flag
window.ph45_addToCart = function(productId, storeId) {
  const u = State.currentUser;
  if (!u || u.role !== 'customer') { navigate('login'); return; }
  const store = (AppData.digitalStores||[]).find(s=>s.id===storeId);
  const product = (AppData.digitalProducts||[]).find(p=>p.id===productId);
  if (!product || !store) return;

  const cart = window.__ph43Cart || [];
  const existing = cart.find(i => i.productId === productId && i.productType === 'digital');
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({
      productId: productId,
      productType: 'digital',
      storeId: storeId,
      storeName: store.name,
      storeIcon: store.icon || '⚡',
      name: product.name,
      price: product.price,
      qty: 1,
      image: store.icon || null,
      requireVendor: store.requireVendor, // Important flag to pass to checkout
      vendors: store.vendors || []        // Pulled from store level
    });
  }
  window.__ph43Cart = cart;
  if (typeof window.ph43_updateCartBadge === 'function') window.ph43_updateCartBadge();
  toast(`✅ تمت إضافة "${product.name}" للسلة`, 'success');
};

console.log('[Phase 45] Independent Digital Stores System loaded');
