/* ============================================================
   Vendor Alerts — إشعارات المزوّد/المزود الفورية
   ------------------------------------------------------------
   يراقب مجموعة `orders` في Firestore بـ onSnapshot مصفّاةً
   بـ vendorId أو providerUid === currentUser.uid.
   عند وصول طلب جديد أو تغيير حالة:

   1. يُشغّل صوت تنبيه (AudioContext)
   2. يعرض browser notification (إذا مُنح الإذن)
   3. يعرض شريط تنبيه داخلي بارز مع تفاصيل الطلب
   4. يحدّث badge في unified-bell عبر مصدر 'vendor'
   5. يحدّث AppData.orders فورياً ويستدعي render()

   يدعم دورَي vendor و provider.
   الحياة الدورية: attach عند تسجيل الدخول، detach عند الخروج.
   ============================================================ */
(function () {
  'use strict';

  /* ── الحالة الداخلية ─────────────────────────────── */
  const VA = {
    unsubVendor:   null,
    unsubProvider: null,
    boundUid:      null,
    attachedAt:    0,
    seenIds:       new Set(),
    feed:          [],
    newCount:      0,
    soundOff:      localStorage.getItem('va_sound_off') === '1',
    _lastStatus:   {},
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
      // نغمة مختلفة عن نغمة المندوب (أعلى قليلاً)
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

  /* ── الشريط المرئي (Banner) ─────────────────────── */
  function ensureStyles() {
    if (document.getElementById('va-styles')) return;
    const s = document.createElement('style');
    s.id = 'va-styles';
    s.textContent = `
      #va-banner {
        position: fixed; top: 0; left: 0; right: 0; z-index: 99998;
        background: linear-gradient(135deg, #0ea5e9 0%, #7c3aed 100%);
        color: #fff; font-family: 'Cairo', sans-serif; direction: rtl;
        padding: 0; max-height: 0; overflow: hidden;
        transition: max-height 0.4s cubic-bezier(0.34,1.56,0.64,1),
                    padding 0.3s ease, box-shadow 0.3s ease;
        box-shadow: none;
      }
      #va-banner.va-open {
        max-height: 130px; padding: 12px 20px;
        box-shadow: 0 4px 24px rgba(14,165,233,0.4);
      }
      #va-banner-inner {
        display: flex; align-items: center; gap: 14px; flex-wrap: wrap;
      }
      #va-banner-icon { font-size: 28px; flex-shrink: 0; animation: va-pulse 1s infinite; }
      @keyframes va-pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.18)} }
      #va-banner-text { flex: 1; min-width: 0; }
      #va-banner-title { font-size: 15px; font-weight: 900; line-height: 1.3; }
      #va-banner-sub   { font-size: 12px; opacity: 0.88; margin-top: 2px; line-height: 1.4; }
      #va-banner-btns  { display: flex; gap: 8px; flex-shrink: 0; }
      .va-btn {
        padding: 6px 14px; border-radius: 20px; font-family: 'Cairo', sans-serif;
        font-size: 13px; font-weight: 700; cursor: pointer; border: none; line-height: 1;
      }
      .va-btn-view  { background: #fff; color: #0ea5e9; }
      .va-btn-close { background: rgba(255,255,255,0.22); color: #fff; }
    `;
    document.head.appendChild(s);
  }

  let bannerTimer = null;

  function showBanner(title, sub) {
    ensureStyles();
    let el = document.getElementById('va-banner');
    if (!el) {
      el = document.createElement('div');
      el.id = 'va-banner';
      el.innerHTML = `<div id="va-banner-inner">
        <div id="va-banner-icon">🏪</div>
        <div id="va-banner-text">
          <div id="va-banner-title"></div>
          <div id="va-banner-sub"></div>
        </div>
        <div id="va-banner-btns">
          <button class="va-btn va-btn-view" onclick="navigate('vendor');VA_closeBanner()">📋 عرض الطلب</button>
          <button class="va-btn va-btn-close" onclick="VA_closeBanner()">✕</button>
        </div>
      </div>`;
      document.body.appendChild(el);
    }
    document.getElementById('va-banner-title').textContent = title;
    document.getElementById('va-banner-sub').textContent   = sub;
    el.classList.add('va-open');
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => VA_closeBanner(), 10000);
  }

  window.VA_closeBanner = function () {
    const el = document.getElementById('va-banner');
    if (el) el.classList.remove('va-open');
    clearTimeout(bannerTimer);
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

      const title = '🆕 طلب جديد وصلك!';
      const sub   = `طلب #${orderNum} · ${customer} · ${service}${amount ? ' · ' + amount : ''}`;

      playChime();
      browserNotify(title, sub);
      showBanner(title, sub);
      VA.feed.unshift({ icon: '🆕', title, sub, time: fmtTime(d.createdAt), orderId: id });
      if (VA.feed.length > 50) VA.feed.length = 50;
      VA.newCount++;
      updateBell();

      // حفظ الإشعار في user_notifications حتى يظهر في مركز الإشعارات
      try {
        const uid = window.State?.currentUser?.uid;
        if (uid && typeof db !== 'undefined' && db?.collection) {
          db.collection('user_notifications').add({
            uid,
            title,
            body: sub,
            type: 'success',
            link: 'vendor',
            read: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          }).catch(() => {});
        }
      } catch (e) {}

    } else if (changeType === 'modified') {
      const prevStatus = VA._lastStatus[id];
      const newStatus  = d.status;
      VA._lastStatus[id] = newStatus;

      const statusLabels = {
        cancelled:   '❌ تم إلغاء الطلب',
        completed:   '✅ اكتمل الطلب',
        delivered:   '📦 تم التسليم',
        paid:        '💰 تم الدفع',
        in_progress: '🔄 الطلب قيد التنفيذ',
      };

      if (prevStatus && prevStatus !== newStatus && statusLabels[newStatus]) {
        const orderNum = d.orderId || id.slice(-6).toUpperCase();
        const title = statusLabels[newStatus];
        const sub   = `طلب #${orderNum} · ${d.customerName || 'عميل'}`;
        playChime();
        browserNotify(title, sub);
        showBanner(title, sub);
        VA.feed.unshift({ icon: statusLabels[newStatus][0], title, sub, time: fmtTime(d.updatedAt || d.createdAt) });
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
    VA.unsubVendor   = null;
    VA.unsubProvider = null;
    VA.boundUid      = null;
    VA.seenIds       = new Set();
    VA._lastStatus   = {};
    VA.feed          = [];
    VA.newCount      = 0;
    window.__unifiedNotif?.update('vendor', [], 0);
    window.VA_closeBanner?.();
  }

  function attach(user) {
    if (typeof db === 'undefined' || !db?.collection) return;
    if (VA.boundUid === user.uid) return;
    detach();

    VA.boundUid   = user.uid;
    VA.attachedAt = Date.now();
    VA._lastStatus = {};
    ensureStyles();

    const handler = makeSnapshotHandler();

    // المستمع الأول: vendorId
    try {
      VA.unsubVendor = db.collection('orders')
        .where('vendorId', '==', user.uid)
        .onSnapshot(handler, err => console.warn('[VA] vendorId listener:', err));
    } catch (e) { console.warn('[VA] failed vendorId listener:', e); }

    // المستمع الثاني: providerUid (قد يكون مختلفاً عن vendorId)
    try {
      VA.unsubProvider = db.collection('orders')
        .where('providerUid', '==', user.uid)
        .onSnapshot(handler, err => console.warn('[VA] providerUid listener:', err));
    } catch (e) { console.warn('[VA] failed providerUid listener:', e); }

    // طلب إذن الإشعارات
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

  /* ── تبديل الصوت ─────────────────────────────────── */
  window.VA_toggleSound = function () {
    VA.soundOff = !VA.soundOff;
    localStorage.setItem('va_sound_off', VA.soundOff ? '1' : '0');
  };

  console.log('[VendorAlerts] نظام إشعارات المزوّد الفوري جاهز 🏪🔔');
})();
