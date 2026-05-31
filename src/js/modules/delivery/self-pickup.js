// ══════════════════════════════════════════════════════════════════
//  محجوز — نظام الاستلام الشخصي
//  self-pickup.js  |  Phase 37
//  يتيح للعميل اختيار "استلام بنفسي" بدلاً من مندوب التوصيل
// ══════════════════════════════════════════════════════════════════

// ── مساعد: HTML مفتاح الاختيار ────────────────────────────────────
window.ph37_getDeliveryTypeSelectorHTML = function (vendorAddress) {
  return `
    <div class="form-group ph37-dt-selector">
      <label class="form-label">🚚 طريقة الاستلام</label>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:10px">
        <button type="button" id="dt-btn-delivery"
                class="bk-pay-btn active"
                onclick="ph37_selectDeliveryType('delivery')"
                style="padding:14px 8px;display:flex;flex-direction:column;align-items:center;gap:4px">
          <span style="font-size:26px">🚗</span>
          <span style="font-weight:700;font-size:13px">توصيل لعنواني</span>
          <span style="font-size:11px;color:var(--text-muted)">مندوب يوصل لك</span>
        </button>
        <button type="button" id="dt-btn-pickup"
                class="bk-pay-btn"
                onclick="ph37_selectDeliveryType('pickup')"
                style="padding:14px 8px;display:flex;flex-direction:column;align-items:center;gap:4px">
          <span style="font-size:26px">🏃</span>
          <span style="font-weight:700;font-size:13px">استلام بنفسي</span>
          <span style="font-size:11px;color:#10b981;font-weight:600">بدون رسوم توصيل</span>
        </button>
      </div>
      ${vendorAddress ? `
      <div id="dt-pickup-info"
           style="display:none;padding:12px 14px;background:rgba(16,185,129,.08);border:1px solid rgba(16,185,129,.25);border-radius:10px;font-size:13px">
        <div style="font-weight:700;margin-bottom:4px;color:#10b981">📍 عنوان الاستلام من المزود</div>
        <div style="color:var(--text-secondary)">${vendorAddress}</div>
      </div>` : ''}
    </div>`;
};

// ── تبديل نوع الاستلام ────────────────────────────────────────────
window.ph37_selectDeliveryType = function (type) {
  State._deliveryType = type;

  const btnD = document.getElementById('dt-btn-delivery');
  const btnP = document.getElementById('dt-btn-pickup');
  if (btnD) btnD.classList.toggle('active', type === 'delivery');
  if (btnP) btnP.classList.toggle('active',  type === 'pickup');

  // مناطق العنوان في مودالَي الحجز والسلة
  ['dt-addr-wrapper', 'cart-addr-wrapper'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = type === 'pickup' ? 'none' : '';
  });

  // معلومات عنوان الاستلام
  const info = document.getElementById('dt-pickup-info');
  if (info) info.style.display = type === 'pickup' ? '' : 'none';
};

// ── badge صغيرة لعرضها في بطاقات الطلبات ────────────────────────
window.ph37_pickupBadge = function (o) {
  if (!o || o.deliveryType !== 'pickup') return '';
  return `<span style="display:inline-flex;align-items:center;gap:3px;padding:2px 8px;background:rgba(16,185,129,.12);color:#059669;border:1px solid rgba(16,185,129,.3);border-radius:20px;font-size:11px;font-weight:700">🏃 استلام شخصي</span>`;
};

// ── CSS ───────────────────────────────────────────────────────────
(function () {
  if (window._ph37_styles) return;
  window._ph37_styles = true;
  const s = document.createElement('style');
  s.textContent = `
    .ph37-dt-selector .bk-pay-btn.active {
      border-color: #8b5cf6;
      background: rgba(139,92,246,.08);
      color: var(--text-primary);
    }
    .ph37-dt-selector #dt-btn-pickup.active {
      border-color: #10b981;
      background: rgba(16,185,129,.08);
    }
  `;
  document.head.appendChild(s);
})();

console.log('[Phase 37] Self-Pickup System loaded');
