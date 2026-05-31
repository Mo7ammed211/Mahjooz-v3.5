// ══════════════════════════════════════════════════════════════════
//  محجوز — نظام التوصيل المجاني
//  free-shipping.js  |  Phase 35
// ══════════════════════════════════════════════════════════════════

const FS_COL = 'free_shipping_rules';

const FS_SECTIONS = [
  { id: 'stores',      label: 'المتاجر',           icon: '🏪' },
  { id: 'professions', label: 'الخدمات المهنية',   icon: '🔧' },
  { id: 'bookings',    label: 'الحجوزات',           icon: '📅' },
  { id: 'services',    label: 'الخدمات العامة',     icon: '🛠️' },
  { id: 'digital',     label: 'المتاجر الرقمية',   icon: '🛒' },
];

// ── Cache ─────────────────────────────────────────────────────────
window.AppData = window.AppData || {};
window.AppData.freeShippingRules = window.AppData.freeShippingRules || [];

// ── تحميل القواعد ─────────────────────────────────────────────────
window.fs_loadRules = async function () {
  try {
    const snap = await Promise.race([
      db.collection(FS_COL).orderBy('createdAt', 'desc').get(),
      new Promise(r => setTimeout(() => r({ docs: [] }), 5000)),
    ]);
    AppData.freeShippingRules = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return AppData.freeShippingRules;
  } catch (e) {
    console.warn('[FreeShipping] فشل تحميل القواعد:', e);
    return [];
  }
};

// ── حفظ / تعديل قاعدة ─────────────────────────────────────────────
window.fs_saveRule = async function (data, id = null) {
  try {
    const payload = {
      name:       (data.name || '').trim(),
      minAmount:  Number(data.minAmount) || 0,
      sections:   Array.isArray(data.sections) ? data.sections : [],
      active:     data.active !== false,
      updatedAt:  firebase.firestore.FieldValue.serverTimestamp(),
    };
    if (!payload.name) { toast('أدخل اسم القاعدة', 'error'); return false; }
    if (payload.minAmount <= 0) { toast('أدخل الحد الأدنى للطلب', 'error'); return false; }
    if (!payload.sections.length) { toast('اختر قسماً واحداً على الأقل', 'error'); return false; }

    if (id) {
      await db.collection(FS_COL).doc(id).update(payload);
    } else {
      payload.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      await db.collection(FS_COL).add(payload);
    }
    await fs_loadRules();
    return true;
  } catch (e) {
    console.error('[FreeShipping] فشل حفظ القاعدة:', e);
    return false;
  }
};

// ── حذف قاعدة ──────────────────────────────────────────────────────
window.fs_deleteRule = async function (id) {
  try {
    await db.collection(FS_COL).doc(id).delete();
    await fs_loadRules();
    return true;
  } catch (e) { return false; }
};

// ── تفعيل / إيقاف سريع ────────────────────────────────────────────
window.fs_toggleRule = async function (id, active) {
  try {
    await db.collection(FS_COL).doc(id).update({
      active,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    await fs_loadRules();
    renderAdminFreeShipping && renderAdminFreeShipping();
    return true;
  } catch (e) { return false; }
};

// ══════════════════════════════════════════════════════════════════
//  الدالة الرئيسية — هل يستحق الطلب توصيلاً مجانياً؟
//  الاستخدام: fs_isFreeShipping(totalAmount, sectionId)
//  → true إذا يجب إلغاء رسوم التوصيل
// ══════════════════════════════════════════════════════════════════
window.fs_isFreeShipping = function (orderTotal, sectionId) {
  const rules = AppData.freeShippingRules || [];
  return rules.some(r => {
    if (!r.active) return false;
    if (r.minAmount > 0 && orderTotal < r.minAmount) return false;
    if (r.sections && r.sections.length > 0 && sectionId) {
      if (!r.sections.includes(sectionId)) return false;
    }
    return true;
  });
};

// ══════════════════════════════════════════════════════════════════
//  واجهة الإدارة
// ══════════════════════════════════════════════════════════════════

// دالة متزامنة تُعيد HTML مباشرة (نفس نمط باقي الدوال في dashboards.js)
window.renderAdminFreeShipping = function () {
  // جدولة تحميل البيانات بعد أن يُرسم الـ HTML في الـ DOM
  setTimeout(_fs_loadAndRender, 0);

  return `
    <div style="max-width:860px;margin:0 auto;padding:24px 0">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;flex-wrap:wrap;gap:12px">
        <div>
          <h2 style="margin:0;font-size:22px;font-weight:800;color:var(--text-primary)">🚚 نظام التوصيل المجاني</h2>
          <p style="margin:6px 0 0;color:var(--text-muted);font-size:14px">حدّد شروط الحصول على توصيل مجاني لكل قسم</p>
        </div>
        <button class="btn btn-primary" onclick="fs_openAddModal()">+ إضافة قاعدة جديدة</button>
      </div>
      <div id="fs-rules-list">
        <div style="text-align:center;padding:60px;color:var(--text-muted)">
          <span style="font-size:32px">⏳</span><br>جاري التحميل...
        </div>
      </div>
    </div>`;
};

async function _fs_loadAndRender() {
  await fs_loadRules();
  fs_renderRulesList();
}

function fs_renderRulesList() {
  const el = document.getElementById('fs-rules-list');
  if (!el) return;
  const rules = AppData.freeShippingRules || [];

  if (!rules.length) {
    el.innerHTML = `
      <div style="text-align:center;padding:70px 20px;border:2px dashed var(--border);border-radius:16px;color:var(--text-muted)">
        <div style="font-size:48px;margin-bottom:16px">🚚</div>
        <div style="font-size:17px;font-weight:600;margin-bottom:8px">لا توجد قواعد توصيل مجاني حتى الآن</div>
        <div style="font-size:13px">أضف قاعدة جديدة لتمكين التوصيل المجاني عند تجاوز مبلغ معين</div>
      </div>`;
    return;
  }

  el.innerHTML = rules.map(r => {
    const sectionBadges = (r.sections || []).map(sid => {
      const s = FS_SECTIONS.find(x => x.id === sid);
      return s ? `<span style="background:rgba(124,58,237,.12);color:var(--primary);border-radius:20px;padding:2px 10px;font-size:12px;font-weight:600">${s.icon} ${s.label}</span>` : '';
    }).join('');

    return `
    <div style="background:var(--card-bg);border:1px solid var(--border);border-radius:16px;padding:20px;margin-bottom:14px;display:flex;gap:16px;align-items:flex-start;flex-wrap:wrap">
      <div style="flex:1;min-width:200px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
          <span style="font-size:18px;font-weight:800;color:var(--text-primary)">${r.name}</span>
          <span style="font-size:12px;padding:3px 10px;border-radius:20px;font-weight:700;
            background:${r.active ? 'rgba(16,185,129,.12)' : 'rgba(100,116,139,.1)'};
            color:${r.active ? '#10b981' : 'var(--text-muted)'}">
            ${r.active ? '✅ مفعّل' : '⏸ موقوف'}
          </span>
        </div>
        <div style="font-size:14px;color:var(--text-secondary);margin-bottom:10px">
          🛒 توصيل مجاني عند شراء <strong style="color:var(--primary)">${(r.minAmount||0).toLocaleString('ar')} ريال</strong> فأكثر
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:6px">
          ${sectionBadges || '<span style="color:var(--text-muted);font-size:12px">لم يُحدَّد قسم</span>'}
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:8px;min-width:120px;align-items:flex-end">
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;color:var(--text-secondary)">
          <span>${r.active ? 'إيقاف' : 'تفعيل'}</span>
          <div class="toggle-switch ${r.active ? 'on' : ''}" onclick="fs_toggleRule('${r.id}', ${!r.active}).then(()=>{ const container=document.querySelector('.admin-main'); if(container){ renderAdminFreeShipping&&renderAdminFreeShipping(); } })"></div>
        </label>
        <button class="btn btn-sm" onclick="fs_openEditModal('${r.id}')" style="font-size:12px;padding:6px 14px">✏️ تعديل</button>
        <button class="btn btn-sm" onclick="fs_confirmDelete('${r.id}')" style="font-size:12px;padding:6px 14px;background:rgba(239,68,68,.1);color:#ef4444;border-color:rgba(239,68,68,.2)">🗑 حذف</button>
      </div>
    </div>`;
  }).join('');
}

// ── مودال إضافة / تعديل ────────────────────────────────────────────
window.fs_openAddModal = function () {
  _fs_openModal(null);
};

window.fs_openEditModal = function (id) {
  const rule = (AppData.freeShippingRules || []).find(r => r.id === id);
  if (!rule) return;
  _fs_openModal(rule);
};

function _fs_openModal(rule) {
  const isEdit = !!rule;
  const sectionCheckboxes = FS_SECTIONS.map(s => {
    const checked = isEdit && (rule.sections || []).includes(s.id) ? 'checked' : '';
    return `
      <label style="display:flex;align-items:center;gap:10px;padding:10px 14px;border:1px solid var(--border);border-radius:10px;cursor:pointer;transition:.2s"
             onclick="this.classList.toggle('fs-sec-selected')">
        <input type="checkbox" name="fs_section" value="${s.id}" ${checked}
               style="width:16px;height:16px;accent-color:var(--primary)">
        <span style="font-size:16px">${s.icon}</span>
        <span style="font-size:14px;font-weight:600">${s.label}</span>
      </label>`;
  }).join('');

  openModal(`
    <div class="modal-header">
      <h2 class="modal-title">🚚 ${isEdit ? 'تعديل' : 'إضافة'} قاعدة توصيل مجاني</h2>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div style="padding:4px 0 8px">

      <div class="form-group" style="margin-bottom:16px">
        <label class="form-label">اسم القاعدة</label>
        <input id="fs-name" class="form-control" placeholder="مثال: توصيل مجاني فوق 15,000 ريال"
               value="${isEdit ? (rule.name || '') : ''}">
      </div>

      <div class="form-group" style="margin-bottom:20px">
        <label class="form-label">الحد الأدنى لمبلغ الطلب (ريال)</label>
        <input id="fs-min" class="form-control" type="number" min="0" placeholder="15000"
               value="${isEdit ? (rule.minAmount || '') : ''}">
        <div style="font-size:12px;color:var(--text-muted);margin-top:6px">💡 الطلبات التي تتجاوز هذا المبلغ ستحصل على توصيل مجاني</div>
      </div>

      <div class="form-group" style="margin-bottom:24px">
        <label class="form-label">الأقسام التي تشملها هذه القاعدة</label>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px">
          ${sectionCheckboxes}
        </div>
      </div>

      <div style="display:flex;align-items:center;gap:12px;padding:14px;background:var(--surface);border-radius:10px;margin-bottom:20px">
        <span style="font-size:14px;color:var(--text-secondary);flex:1">تفعيل هذه القاعدة الآن</span>
        <input type="checkbox" id="fs-active" style="width:18px;height:18px;accent-color:var(--primary)" ${isEdit ? (rule.active !== false ? 'checked' : '') : 'checked'}>
      </div>

      <button class="btn btn-primary btn-block btn-lg" onclick="fs_submitModal('${isEdit ? rule.id : ''}')">
        ${isEdit ? '💾 حفظ التعديلات' : '✅ إضافة القاعدة'}
      </button>
    </div>
  `);
}

window.fs_submitModal = async function (id) {
  const name      = document.getElementById('fs-name')?.value?.trim() || '';
  const minAmount = document.getElementById('fs-min')?.value || '0';
  const active    = document.getElementById('fs-active')?.checked !== false;
  const checkboxes = document.querySelectorAll('input[name="fs_section"]:checked');
  const sections  = Array.from(checkboxes).map(c => c.value);

  showLoader('جاري الحفظ...');
  const ok = await fs_saveRule({ name, minAmount, sections, active }, id || null);
  hideLoader();

  if (ok) {
    toast(id ? '✅ تم تعديل القاعدة' : '✅ تمت إضافة القاعدة', 'success');
    closeModal();
    const container = document.querySelector('.admin-main');
    if (container) {
      fs_renderRulesList();
    }
  }
};

window.fs_confirmDelete = function (id) {
  const rule = (AppData.freeShippingRules || []).find(r => r.id === id);
  openModal(`
    <div class="modal-header">
      <h2 class="modal-title">🗑 حذف القاعدة</h2>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div style="text-align:center;padding:24px 0">
      <div style="font-size:40px;margin-bottom:16px">⚠️</div>
      <p style="color:var(--text-secondary);margin-bottom:24px">
        هل تريد حذف قاعدة <strong>"${rule?.name || ''}"</strong>؟<br>
        <span style="font-size:13px;color:var(--text-muted)">لا يمكن التراجع عن هذا الإجراء</span>
      </p>
      <div style="display:flex;gap:12px;justify-content:center">
        <button class="btn" onclick="closeModal()">إلغاء</button>
        <button class="btn" style="background:#ef4444;color:#fff;border:none"
                onclick="fs_deleteRule('${id}').then(ok=>{if(ok){toast('تم الحذف','success');closeModal();fs_renderRulesList();}})">
          حذف نهائياً
        </button>
      </div>
    </div>`);
};

// ══════════════════════════════════════════════════════════════════
//  تذكير التوصيل المجاني — يُعيد HTML جاهزاً للعرض
//  الاستخدام: fs_getShippingHintHTML(orderTotal, sectionId)
//  → '' إذا لا يوجد شيء لعرضه
// ══════════════════════════════════════════════════════════════════
window.fs_getShippingHintHTML = function (orderTotal, sectionId) {
  const rules = (AppData.freeShippingRules || []).filter(r => {
    if (!r.active) return false;
    if (r.sections && r.sections.length > 0 && sectionId) {
      return r.sections.includes(sectionId);
    }
    return true;
  });
  if (!rules.length) return '';

  // هل يستحق التوصيل المجاني الآن؟
  const qualifies = rules.some(r => orderTotal >= (r.minAmount || 0));
  if (qualifies) {
    return `
      <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;
                  background:linear-gradient(135deg,rgba(16,185,129,.12),rgba(16,185,129,.05));
                  border:1px solid rgba(16,185,129,.3);border-radius:12px;margin-bottom:12px">
        <span style="font-size:20px">🚚</span>
        <span style="font-size:13px;font-weight:700;color:#10b981">مبروك! حصلت على توصيل مجاني</span>
      </div>`;
  }

  // أقرب قاعدة يمكن الوصول إليها
  const sorted = rules
    .filter(r => r.minAmount > orderTotal)
    .sort((a, b) => a.minAmount - b.minAmount);
  if (!sorted.length) return '';

  const closest  = sorted[0];
  const needed   = closest.minAmount - orderTotal;
  const maxHint  = closest.minAmount * 0.7; // لا نُظهر التذكير إلا إذا كان المتبقي ≤ 70% من الحد

  if (needed > maxHint) return '';

  const pct = Math.round(((closest.minAmount - needed) / closest.minAmount) * 100);
  const barColor = pct >= 70 ? '#f59e0b' : '#7c3aed';

  return `
    <div style="padding:12px 14px;background:linear-gradient(135deg,rgba(245,158,11,.1),rgba(245,158,11,.04));
                border:1px solid rgba(245,158,11,.3);border-radius:12px;margin-bottom:12px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        <span style="font-size:18px">🚚</span>
        <span style="font-size:13px;font-weight:700;color:#f59e0b">
          أضف <strong>${needed.toLocaleString('ar-YE')} ريال</strong> للحصول على توصيل مجاني!
        </span>
      </div>
      <div style="background:rgba(0,0,0,.12);border-radius:20px;height:6px;overflow:hidden">
        <div style="width:${pct}%;height:100%;background:${barColor};border-radius:20px;transition:width .4s"></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-muted);margin-top:5px">
        <span>0</span>
        <span>${closest.minAmount.toLocaleString('ar-YE')} ريال</span>
      </div>
    </div>`;
};

// ── تحميل تلقائي عند بدء التطبيق ─────────────────────────────────
document.addEventListener('DOMContentLoaded', () => { fs_loadRules().catch(() => {}); });
if (typeof window.AppData !== 'undefined') { fs_loadRules().catch(() => {}); }

console.log('[Phase 35] Free Shipping System loaded');
