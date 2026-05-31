/* ============================================================
   Vendor Alerts — إشعارات المزوّد الفورية مع قبول/رفض سريع
   ------------------------------------------------------------
   يراقب مجموعة `orders` في Firestore بـ onSnapshot مصفّاةً
   بـ vendorId أو providerUid === currentUser.uid.
   عند وصول طلب جديد (بحالة pending_provider) أو تغيير حالة:

   1. يُشغّل صوت تنبيه (AudioContext)
   2. يعرض browser notification (إذا مُنح الإذن)
   3. يعرض شريط تنبيه بارز مع:
      - تفاصيل الطلب (رقم · اسم العميل · الخدمة · المبلغ)
      - زر ✅ قبول الطلب فوراً
      - زر ❌ رفض (مع تأكيد)
      - زر 📋 عرض التفاصيل
   4. يحدّث badge في unified-bell عبر مصدر 'vendor'
   5. يحدّث AppData.orders فورياً ويستدعي render()

   يدعم دورَي vendor و provider.
   الحياة الدورية: attach عند تسجيل الدخول، detach عند الخروج.
   ============================================================ */
(function () {
  'use strict';

  /* ── الحالة الداخلية ─────────────────────────────── */
  const VA = {
    unsubVendor:    null,
    unsubProvider:  null,
    boundUid:       null,
    attachedAt:     0,
    seenIds:        new Set(),
    feed:           [],
    newCount:       0,
    soundOff:       localStorage.getItem('va_sound_off') === '1',
    _lastStatus:    {},
    _pendingBanner: null,   // orderId المعروض حالياً في البانر
  };
  window.VENDOR_ALERTS = VA;

  /* ── أدوات مساعدة ──────────────────────────────── */
  function esc(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
    );
  }

  function fmtTime(ts) {
    try {
      const d = ts?.toDate ? ts.toDate() : (ts ? new Date(ts) : new Date());
      return d.toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' });
    } catch (e) { return ''; }
  }

  function fmtAmount(val) {
    if (!val && val !== 0) return '';
    return `${Number(val).toLocaleString('ar')} ﷼`;
  }

  /* ── صوت التنبيه (AudioContext) ─────────────────── */
  function playChime() {
    if (VA.soundOff) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      [[659.25, 0, 0.12], [783.99, 0.13, 0.12], [1046.50, 0.26, 0.22]].forEach(([freq, delay, dur]) => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = 'triangle';
        gain.gain.setValueAtTime(0, ctx.currentTime + delay);
        gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + delay + 0.03);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + delay + dur);
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + dur);
      });
    } catch (e) {}
  }

  function playSuccessChime() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      [[523.25, 0, 0.1], [783.99, 0.1, 0.1], [1046.50, 0.2, 0.15], [1318.51, 0.35, 0.2]].forEach(([freq, delay, dur]) => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0, ctx.currentTime + delay);
        gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + delay + 0.02);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + delay + dur);
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + dur);
      });
    } catch (e) {}
  }

  /* ── Browser Notification ──────────────────────── */
  function browserNotify(title, body) {
    try {
      if (Notification.permission === 'granted') {
        new Notification(title, { body, icon: '/icons/icon-192.png', dir: 'rtl', lang: 'ar' });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(p => {
          if (p === 'granted') new Notification(title, { body, icon: '/icons/icon-192.png', dir: 'rtl', lang: 'ar' });
        });
      }
    } catch (e) {}
  }

  /* ── الستايل ─────────────────────────────────────── */
  function ensureStyles() {
    if (document.getElementById('va-styles')) return;
    const s = document.createElement('style');
    s.id = 'va-styles';
    s.textContent = `
      /* ── Banner ── */
      #va-banner {
        position: fixed; top: 0; left: 0; right: 0; z-index: 99998;
        background: linear-gradient(135deg, #0ea5e9 0%, #7c3aed 100%);
        color: #fff; font-family: 'Cairo', sans-serif; direction: rtl;
        padding: 0; max-height: 0; overflow: hidden;
        transition: max-height 0.45s cubic-bezier(0.34,1.56,0.64,1),
                    padding 0.3s ease, box-shadow 0.3s ease;
        box-shadow: none;
      }
      #va-banner.va-open {
        max-height: 160px; padding: 13px 18px 11px;
        box-shadow: 0 4px 28px rgba(14,165,233,0.45);
      }
      #va-banner-inner {
        display: flex; align-items: flex-start; gap: 13px; flex-wrap: wrap;
      }
      #va-banner-icon {
        font-size: 30px; flex-shrink: 0;
        animation: va-pulse 1s infinite;
        margin-top: 2px;
      }
      @keyframes va-pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.2)} }

      #va-banner-body { flex: 1; min-width: 0; }
      #va-banner-title { font-size: 14px; font-weight: 900; line-height: 1.3; }
      #va-banner-sub   { font-size: 12px; opacity: 0.9; margin-top: 3px; line-height: 1.5; }

      #va-banner-actions {
        display: flex; gap: 7px; flex-shrink: 0;
        align-items: center; flex-wrap: wrap;
      }

      .va-btn {
        padding: 7px 15px; border-radius: 22px;
        font-family: 'Cairo', sans-serif; font-size: 13px;
        font-weight: 800; cursor: pointer; border: none;
        line-height: 1; transition: transform 0.15s, opacity 0.15s;
        white-space: nowrap;
      }
      .va-btn:active { transform: scale(0.95); }

      .va-btn-accept {
        background: #22c55e; color: #fff;
        box-shadow: 0 2px 10px rgba(34,197,94,0.4);
      }
      .va-btn-accept:hover { background: #16a34a; }

      .va-btn-reject {
        background: rgba(239,68,68,0.9); color: #fff;
        box-shadow: 0 2px 10px rgba(239,68,68,0.3);
      }
      .va-btn-reject:hover { background: #dc2626; }

      .va-btn-view {
        background: rgba(255,255,255,0.2); color: #fff;
        border: 1.5px solid rgba(255,255,255,0.35);
      }
      .va-btn-view:hover { background: rgba(255,255,255,0.3); }

      .va-btn-close {
        background: none; border: none; color: rgba(255,255,255,0.7);
        font-size: 18px; cursor: pointer; padding: 4px 8px;
        line-height: 1; border-radius: 50%;
        transition: background 0.15s;
      }
      .va-btn-close:hover { background: rgba(255,255,255,0.15); color: #fff; }

      /* حالة التحميل على الأزرار */
      .va-btn.va-loading {
        opacity: 0.65; pointer-events: none; cursor: not-allowed;
      }
      .va-btn.va-loading::after {
        content: ' ⏳';
      }

      /* ── تأكيد الرفض ── */
      #va-reject-confirm {
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        z-index: 99999; background: rgba(0,0,0,0.6);
        display: flex; align-items: center; justify-content: center;
        font-family: 'Cairo', sans-serif; direction: rtl;
        animation: va-fade-in 0.2s ease;
      }
      @keyframes va-fade-in { from{opacity:0} to{opacity:1} }

      #va-reject-confirm-box {
        background: var(--bg-card, #1e293b);
        border: 1.5px solid rgba(239,68,68,0.4);
        border-radius: 18px; padding: 26px 24px;
        width: 320px; max-width: calc(100vw - 32px);
        box-shadow: 0 20px 60px rgba(0,0,0,0.5);
        text-align: center;
      }
      #va-reject-confirm-box .va-rc-icon { font-size: 40px; margin-bottom: 10px; }
      #va-reject-confirm-box .va-rc-title {
        font-size: 16px; font-weight: 900;
        color: var(--text-main, #f1f5f9); margin-bottom: 6px;
      }
      #va-reject-confirm-box .va-rc-sub {
        font-size: 12px; color: var(--text-secondary, #94a3b8);
        margin-bottom: 18px; line-height: 1.5;
      }
      #va-reject-confirm-box .va-rc-btns {
        display: flex; gap: 10px; justify-content: center;
      }
      .va-rc-btn {
        flex: 1; padding: 10px 16px; border-radius: 12px;
        font-family: 'Cairo', sans-serif; font-size: 14px;
        font-weight: 800; cursor: pointer; border: none;
        transition: all 0.15s;
      }
      .va-rc-btn-confirm {
        background: #ef4444; color: #fff;
      }
      .va-rc-btn-confirm:hover { background: #dc2626; }
      .va-rc-btn-cancel {
        background: var(--bg-secondary, rgba(255,255,255,0.08));
        color: var(--text-main, #f1f5f9);
        border: 1.5px solid var(--border, rgba(255,255,255,0.12));
      }
      .va-rc-btn-cancel:hover { background: rgba(255,255,255,0.14); }
    `;
    document.head.appendChild(s);
  }

  /* ── Banner ─────────────────────────────────────── */
  let bannerTimer = null;

  function showBanner(title, sub, orderId, isPending) {
    ensureStyles();
    let el = document.getElementById('va-banner');
    if (!el) {
      el = document.createElement('div');
      el.id = 'va-banner';
      document.body.appendChild(el);
    }

    VA._pendingBanner = orderId || null;

    const actionBtns = (isPending && orderId) ? `
      <button class="va-btn va-btn-accept" id="va-btn-accept" onclick="VA_quickAccept('${esc(orderId)}')">✅ قبول</button>
      <button class="va-btn va-btn-reject" id="va-btn-reject" onclick="VA_confirmReject('${esc(orderId)}')">❌ رفض</button>
      <button class="va-btn va-btn-view"   onclick="navigate('vendor');VA_closeBanner()">📋 التفاصيل</button>
    ` : `
      <button class="va-btn va-btn-view" onclick="navigate('vendor');VA_closeBanner()">📋 عرض الطلب</button>
    `;

    el.innerHTML = `
      <div id="va-banner-inner">
        <div id="va-banner-icon">${isPending ? '🆕' : '🔔'}</div>
        <div id="va-banner-body">
          <div id="va-banner-title">${esc(title)}</div>
          <div id="va-banner-sub">${esc(sub)}</div>
        </div>
        <div id="va-banner-actions">
          ${actionBtns}
          <button class="va-btn-close" onclick="VA_closeBanner()" title="إغلاق">✕</button>
        </div>
      </div>`;

    el.classList.add('va-open');
    clearTimeout(bannerTimer);
    // تُغلق تلقائياً بعد 25 ثانية للطلبات الجديدة التي تتطلب إجراء
    bannerTimer = setTimeout(() => VA_closeBanner(), isPending ? 25000 : 10000);
  }

  window.VA_closeBanner = function () {
    const el = document.getElementById('va-banner');
    if (el) el.classList.remove('va-open');
    clearTimeout(bannerTimer);
    VA._pendingBanner = null;
  };

  /* ── قبول سريع من البانر ─────────────────────────── */
  window.VA_quickAccept = async function (orderId) {
    const acceptBtn = document.getElementById('va-btn-accept');
    const rejectBtn = document.getElementById('va-btn-reject');
    if (acceptBtn) { acceptBtn.classList.add('va-loading'); acceptBtn.textContent = 'جاري القبول'; }
    if (rejectBtn) rejectBtn.disabled = true;

    try {
      if (typeof window.ph21_providerAccept === 'function') {
        await window.ph21_providerAccept(orderId);
      } else {
        await _fallbackAccept(orderId);
      }
      playSuccessChime();
      VA_closeBanner();
    } catch (err) {
      console.warn('[VA] Accept failed:', err);
      if (typeof window.toast === 'function') window.toast('فشل القبول، حاول مجدداً', 'error');
      if (acceptBtn) { acceptBtn.classList.remove('va-loading'); acceptBtn.textContent = '✅ قبول'; }
      if (rejectBtn) rejectBtn.disabled = false;
    }
  };

  /* fallback بسيط لو ph21_providerAccept لم تُحمَّل بعد */
  async function _fallbackAccept(orderId) {
    if (typeof db === 'undefined') return;
    await db.collection('orders').doc(orderId).update({
      status: 'provider_accepted',
      providerAcceptedAt: new Date(),
    });
    if (typeof window.toast === 'function') window.toast('✅ تم قبول الطلب', 'success');
    if (typeof window.render === 'function') await window.render();
  }

  /* ── تأكيد الرفض ──────────────────────────────────── */
  window.VA_confirmReject = function (orderId) {
    if (document.getElementById('va-reject-confirm')) return;
    ensureStyles();

    const overlay = document.createElement('div');
    overlay.id = 'va-reject-confirm';
    overlay.innerHTML = `
      <div id="va-reject-confirm-box">
        <div class="va-rc-icon">❌</div>
        <div class="va-rc-title">رفض الطلب</div>
        <div class="va-rc-sub">هل أنت متأكد من رفض هذا الطلب؟<br>سيُعاد توجيهه للإدارة.</div>
        <div class="va-rc-btns">
          <button class="va-rc-btn va-rc-btn-cancel" onclick="VA_dismissRejectConfirm()">تراجع</button>
          <button class="va-rc-btn va-rc-btn-confirm" id="va-rc-confirm-btn"
            onclick="VA_doReject('${esc(orderId)}')">نعم، ارفض</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
  };

  window.VA_dismissRejectConfirm = function () {
    const el = document.getElementById('va-reject-confirm');
    if (el) el.remove();
  };

  window.VA_doReject = async function (orderId) {
    const confirmBtn = document.getElementById('va-rc-confirm-btn');
    if (confirmBtn) { confirmBtn.textContent = 'جاري الرفض…'; confirmBtn.disabled = true; }

    try {
      if (typeof window.ph21_providerReject === 'function') {
        await window.ph21_providerReject(orderId);
      } else {
        await db.collection('orders').doc(orderId).update({
          status: 'rejected',
          rejectedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
        if (typeof window.toast === 'function') window.toast('❌ تم رفض الطلب', 'success');
        if (typeof window.render === 'function') await window.render();
      }
      VA_dismissRejectConfirm();
      VA_closeBanner();
    } catch (err) {
      console.warn('[VA] Reject failed:', err);
      if (typeof window.toast === 'function') window.toast('فشل الرفض، حاول مجدداً', 'error');
      VA_dismissRejectConfirm();
    }
  };

  /* ── تحديث unified bell ──────────────────────────── */
  function updateBell() {
    window.__unifiedNotif?.update('vendor', VA.feed, VA.newCount);
  }

  /* ── معالجة كل تغيير في الطلبات ─────────────────── */
  function handleChange(doc, changeType) {
    const d  = doc.data() || {};
    const id = doc.id;

    if (changeType === 'added') {
      const createdMs = d.createdAt?.toMillis ? d.createdAt.toMillis() : 0;
      const tooOld    = createdMs && createdMs < VA.attachedAt - 1000;
      if (VA.seenIds.has(id) || tooOld) { VA.seenIds.add(id); return; }
      VA.seenIds.add(id);

      const orderNum = d.orderId || id.slice(-6).toUpperCase();
      const customer = d.customerName || 'عميل';
      const service  = d.svcName || d.serviceName || 'خدمة';
      const amount   = d.total ? fmtAmount(d.total) : '';
      const isPending = d.status === 'pending_provider';

      const title = isPending ? '🆕 طلب جديد يحتاج موافقتك!' : '📋 طلب جديد وصلك';
      const sub   = `طلب #${orderNum} · ${customer} · ${service}${amount ? ' · ' + amount : ''}`;

      playChime();
      browserNotify(title, sub);
      showBanner(title, sub, id, isPending);

      const feedIcon = isPending ? '🆕' : '📋';
      VA.feed.unshift({ icon: feedIcon, title, sub, time: fmtTime(d.createdAt), orderId: id });
      if (VA.feed.length > 50) VA.feed.length = 50;
      VA.newCount++;
      updateBell();

      // حفظ الإشعار في user_notifications
      try {
        const uid = window.State?.currentUser?.uid;
        if (uid && typeof db !== 'undefined' && db?.collection) {
          db.collection('user_notifications').add({
            uid, title, body: sub, type: 'success',
            link: 'vendor', read: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          }).catch(() => {});
        }
      } catch (e) {}

    } else if (changeType === 'modified') {
      const prevStatus = VA._lastStatus[id];
      const newStatus  = d.status;
      VA._lastStatus[id] = newStatus;

      const statusLabels = {
        cancelled:         '❌ تم إلغاء الطلب',
        completed:         '✅ اكتمل الطلب',
        delivered:         '📦 تم التسليم',
        paid:              '💰 تم الدفع',
        in_progress:       '🔄 الطلب قيد التنفيذ',
        provider_accepted: '🔄 جاري البحث عن مندوب',
        approved:          '✅ تم إتمام الطلب',
      };

      if (prevStatus && prevStatus !== newStatus && statusLabels[newStatus]) {
        const orderNum = d.orderId || id.slice(-6).toUpperCase();
        const title = statusLabels[newStatus];
        const sub   = `طلب #${orderNum} · ${d.customerName || 'عميل'}`;
        playChime();
        browserNotify(title, sub);
        showBanner(title, sub, id, false);
        VA.feed.unshift({ icon: '🔔', title, sub, time: fmtTime(d.updatedAt || d.createdAt) });
        if (VA.feed.length > 50) VA.feed.length = 50;
        VA.newCount++;
        updateBell();
      }
    }
  }

  /* ── تحديث AppData.orders ────────────────────────── */
  function syncAppData(doc, changeType) {
    if (!window.AppData?.orders) return false;
    const docData = { id: doc.id, ...doc.data() };
    if (changeType === 'added') {
      if (!window.AppData.orders.find(o => o.id === docData.id)) {
        window.AppData.orders.unshift(docData);
        return true;
      }
    } else if (changeType === 'modified') {
      const idx = window.AppData.orders.findIndex(o => o.id === docData.id);
      if (idx >= 0) { window.AppData.orders[idx] = docData; return true; }
      window.AppData.orders.unshift(docData);
      return true;
    } else if (changeType === 'removed') {
      const before = window.AppData.orders.length;
      window.AppData.orders = window.AppData.orders.filter(o => o.id !== docData.id);
      return window.AppData.orders.length !== before;
    }
    return false;
  }

  function makeSnapshotHandler() {
    return function (snap) {
      let needsRender = false;
      snap.docChanges().forEach(ch => {
        handleChange(ch.doc, ch.type);
        if (syncAppData(ch.doc, ch.type)) needsRender = true;
      });
      if (needsRender && typeof window.render === 'function') window.render();
    };
  }

  /* ── Attach / Detach ─────────────────────────────── */
  function detach() {
    try { VA.unsubVendor   && VA.unsubVendor(); }   catch (e) {}
    try { VA.unsubProvider && VA.unsubProvider(); } catch (e) {}
    VA.unsubVendor    = null;
    VA.unsubProvider  = null;
    VA.boundUid       = null;
    VA.seenIds        = new Set();
    VA._lastStatus    = {};
    VA.feed           = [];
    VA.newCount       = 0;
    VA._pendingBanner = null;
    window.__unifiedNotif?.update('vendor', [], 0);
    window.VA_closeBanner?.();
    window.VA_dismissRejectConfirm?.();
  }

  function attach(user) {
    if (typeof db === 'undefined' || !db?.collection) return;
    if (VA.boundUid === user.uid) return;
    detach();

    VA.boundUid    = user.uid;
    VA.attachedAt  = Date.now();
    VA._lastStatus = {};
    ensureStyles();

    const handler = makeSnapshotHandler();

    try {
      VA.unsubVendor = db.collection('orders')
        .where('vendorId', '==', user.uid)
        .onSnapshot(handler, err => console.warn('[VA] vendorId listener:', err));
    } catch (e) { console.warn('[VA] failed vendorId listener:', e); }

    try {
      VA.unsubProvider = db.collection('orders')
        .where('providerUid', '==', user.uid)
        .onSnapshot(handler, err => console.warn('[VA] providerUid listener:', err));
    } catch (e) { console.warn('[VA] failed providerUid listener:', e); }

    try {
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
    } catch (e) {}
  }

  /* ── ربط بحالة المصادقة ──────────────────────────── */
  let _lastUid  = null;
  let _lastRole = null;

  function poll() {
    const u    = window.State?.currentUser;
    const uid  = u?.uid  || null;
    const role = u?.role || null;
    if (uid !== _lastUid || role !== _lastRole) {
      _lastUid  = uid;
      _lastRole = role;
      if (uid && (role === 'vendor' || role === 'provider')) {
        attach(u);
      } else {
        if (VA.boundUid) detach();
      }
    }
  }

  setInterval(poll, 1500);
  setTimeout(poll, 2000);

  window.VA_toggleSound = function () {
    VA.soundOff = !VA.soundOff;
    localStorage.setItem('va_sound_off', VA.soundOff ? '1' : '0');
  };

  console.log('[VendorAlerts] نظام إشعارات المزوّد الفوري جاهز 🏪🔔');
})();
