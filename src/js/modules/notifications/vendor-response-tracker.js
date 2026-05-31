/* ============================================================
   Vendor Response Tracker — متابعة أوقات استجابة المزوّدين
   ------------------------------------------------------------
   للمدير/الموظف فقط. يراقب الطلبات بحالة pending_provider
   ويُنبّه المدير إذا لم يستجب المزوّد خلال الوقت المحدد.

   الميزات:
   1. يستمع لـ orders بحالة pending_provider بـ onSnapshot
   2. يعرض ويدجت "⏱ انتظار مزوّدين" في لوحة الإدارة
      — يعرض كل طلب معلّق مع مؤقت عداد تنازلي حيّ
   3. يُرسل تنبيهاً للمدير إذا تجاوز وقت الانتظار الحدّ
      (افتراضي: 10 دقائق، قابل للتعديل)
   4. زر "تنبيه المزوّد" لإعادة إرسال إشعار مخصوص
   5. يُعدّل threshold عبر نافذة الإعدادات في الويدجت
   ============================================================ */
(function () {
  'use strict';

  const VRT = {
    unsub:        null,
    boundUid:     null,
    pending:      {},       // orderId → { orderId, providerName, notifiedAt, orderNum, customer, service, total }
    alertedIds:   new Set(),
    ticker:       null,
    thresholdMin: parseInt(localStorage.getItem('vrt_threshold_min') || '10', 10),
  };
  window.VRT = VRT;

  /* ── أدوات ─────────────────────────────────────── */
  function esc(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
    );
  }

  function elapsed(notifiedAt) {
    if (!notifiedAt) return null;
    const ms = notifiedAt?.toMillis ? notifiedAt.toMillis()
      : notifiedAt instanceof Date ? notifiedAt.getTime()
      : typeof notifiedAt === 'number' ? notifiedAt
      : new Date(notifiedAt).getTime();
    return Math.floor((Date.now() - ms) / 1000); // ثوانٍ
  }

  function fmtElapsed(secs) {
    if (secs == null || secs < 0) return '—';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return m > 0 ? `${m} د ${s} ث` : `${s} ث`;
  }

  function fmtAmount(val) {
    if (!val && val !== 0) return '';
    return `${Number(val).toLocaleString('ar')} ﷼`;
  }

  /* ── صوت تنبيه المدير ──────────────────────────── */
  function playAdminChime() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      [[392, 0, 0.12], [349.23, 0.13, 0.12], [293.66, 0.27, 0.22]].forEach(([freq, delay, dur]) => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = freq; osc.type = 'sine';
        gain.gain.setValueAtTime(0, ctx.currentTime + delay);
        gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + delay + 0.03);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + delay + dur);
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + dur);
      });
    } catch (e) {}
  }

  /* ── استيل ─────────────────────────────────────── */
  function ensureStyles() {
    if (document.getElementById('vrt-styles')) return;
    const st = document.createElement('style');
    st.id = 'vrt-styles';
    st.textContent = `
      /* ── الويدجت الرئيسي ── */
      #vrt-widget {
        font-family: 'Cairo', sans-serif; direction: rtl;
        background: var(--bg-card, #1e293b);
        border: 1.5px solid var(--border, rgba(255,255,255,0.1));
        border-radius: 16px; padding: 0;
        overflow: hidden; margin: 16px 0;
      }
      #vrt-header {
        display: flex; align-items: center; gap: 10px;
        padding: 13px 16px; cursor: pointer;
        background: linear-gradient(135deg, rgba(245,158,11,0.12), rgba(239,68,68,0.06));
        border-bottom: 1.5px solid var(--border, rgba(255,255,255,0.1));
        user-select: none;
      }
      #vrt-header-icon { font-size: 20px; }
      #vrt-header-title {
        flex: 1; font-size: 14px; font-weight: 900;
        color: var(--text-main, #f1f5f9);
      }
      #vrt-header-count {
        background: #ef4444; color: #fff; border-radius: 99px;
        font-size: 11px; font-weight: 900; min-width: 22px; height: 22px;
        display: inline-flex; align-items: center; justify-content: center;
        padding: 0 5px;
      }
      #vrt-header-count.zero { background: #10b981; }
      #vrt-header-toggle {
        background: none; border: none; cursor: pointer;
        color: var(--text-muted, #9ca3af); font-size: 18px;
        padding: 0 4px; transition: transform 0.25s;
      }
      #vrt-header-toggle.open { transform: rotate(180deg); }

      #vrt-body { display: none; }
      #vrt-body.open { display: block; }

      /* ── أدوات التحكم ── */
      #vrt-controls {
        display: flex; align-items: center; gap: 10px;
        padding: 10px 16px;
        border-bottom: 1px solid var(--border, rgba(255,255,255,0.08));
        flex-wrap: wrap;
      }
      .vrt-ctrl-label {
        font-size: 12px; color: var(--text-secondary, #94a3b8); font-weight: 700;
      }
      #vrt-threshold-input {
        width: 56px; padding: 5px 8px; border-radius: 8px;
        background: var(--bg-secondary, rgba(255,255,255,0.06));
        border: 1.5px solid var(--border, rgba(255,255,255,0.12));
        color: var(--text-main, #f1f5f9); font-family: 'Cairo', sans-serif;
        font-size: 13px; font-weight: 700; text-align: center;
      }
      .vrt-save-btn {
        padding: 5px 12px; border-radius: 8px; border: none; cursor: pointer;
        background: rgba(124,58,237,0.2); color: #a78bfa;
        font-family: 'Cairo', sans-serif; font-size: 12px; font-weight: 800;
        transition: background 0.15s;
      }
      .vrt-save-btn:hover { background: rgba(124,58,237,0.35); }

      /* ── قائمة الطلبات المعلّقة ── */
      #vrt-list { max-height: 380px; overflow-y: auto; }
      .vrt-empty {
        padding: 24px 16px; text-align: center;
        font-size: 13px; color: var(--text-muted, #64748b);
      }
      .vrt-row {
        display: flex; align-items: center; gap: 12px;
        padding: 11px 16px;
        border-bottom: 1px solid var(--border, rgba(255,255,255,0.06));
        transition: background 0.15s;
      }
      .vrt-row:last-child { border-bottom: none; }
      .vrt-row:hover { background: var(--bg-secondary, rgba(255,255,255,0.04)); }

      .vrt-row-status {
        width: 10px; height: 10px; border-radius: 50%;
        flex-shrink: 0; margin-top: 2px;
      }
      .vrt-row-status.ok     { background: #22c55e; }
      .vrt-row-status.warn   { background: #f59e0b; animation: vrt-blink 1s infinite; }
      .vrt-row-status.danger { background: #ef4444; animation: vrt-blink 0.5s infinite; }
      @keyframes vrt-blink { 0%,100%{opacity:1} 50%{opacity:0.3} }

      .vrt-row-info { flex: 1; min-width: 0; }
      .vrt-row-order { font-size: 13px; font-weight: 800; color: var(--text-main, #f1f5f9); }
      .vrt-row-detail { font-size: 11px; color: var(--text-secondary, #94a3b8); margin-top: 2px; }

      .vrt-row-timer {
        font-size: 13px; font-weight: 900; flex-shrink: 0;
        font-variant-numeric: tabular-nums; min-width: 60px; text-align: left;
      }
      .vrt-row-timer.ok     { color: #22c55e; }
      .vrt-row-timer.warn   { color: #f59e0b; }
      .vrt-row-timer.danger { color: #ef4444; }

      .vrt-poke-btn {
        padding: 5px 11px; border-radius: 20px; border: none; cursor: pointer;
        background: rgba(14,165,233,0.15); color: #38bdf8;
        font-family: 'Cairo', sans-serif; font-size: 11px; font-weight: 800;
        flex-shrink: 0; transition: background 0.15s;
        white-space: nowrap;
      }
      .vrt-poke-btn:hover { background: rgba(14,165,233,0.3); }
      .vrt-poke-btn:disabled { opacity: 0.5; cursor: not-allowed; }

      /* ── توست المدير ── */
      #vrt-admin-toast {
        position: fixed; bottom: 24px; left: 24px; z-index: 99990;
        background: linear-gradient(135deg, #f59e0b, #ef4444);
        color: #fff; font-family: 'Cairo', sans-serif; direction: rtl;
        padding: 12px 18px; border-radius: 14px;
        box-shadow: 0 8px 28px rgba(245,158,11,0.4);
        font-size: 13px; font-weight: 800;
        display: flex; align-items: center; gap: 10px;
        max-width: 320px;
        transform: translateY(80px); opacity: 0; pointer-events: none;
        transition: all 0.35s cubic-bezier(0.34,1.56,0.64,1);
      }
      #vrt-admin-toast.show {
        transform: translateY(0); opacity: 1; pointer-events: auto;
      }
      #vrt-admin-toast-close {
        background: none; border: none; color: rgba(255,255,255,0.7);
        cursor: pointer; font-size: 16px; padding: 0 2px; line-height: 1;
        flex-shrink: 0;
      }
    `;
    document.head.appendChild(st);
  }

  /* ── توست تنبيه المدير ─────────────────────────── */
  let toastTimer = null;

  function showAdminToast(msg) {
    ensureStyles();
    let el = document.getElementById('vrt-admin-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'vrt-admin-toast';
      el.innerHTML = `<span id="vrt-admin-toast-icon">⏰</span>
        <span id="vrt-admin-toast-msg"></span>
        <button id="vrt-admin-toast-close" onclick="VRT_hideToast()">✕</button>`;
      document.body.appendChild(el);
    }
    document.getElementById('vrt-admin-toast-msg').textContent = msg;
    playAdminChime();
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => VRT_hideToast(), 12000);

    // أيضاً أُضيف للجرس الموحد
    window.__unifiedNotif?.update('live',
      [{ icon: '⏰', title: '⏰ مزوّد لم يستجب', sub: msg, time: new Date().toLocaleTimeString('ar') },
       ...(window.PH19?.feed || []).slice(0, 9)],
      (window.PH19?.unseen || 0) + 1
    );
  }

  window.VRT_hideToast = function () {
    const el = document.getElementById('vrt-admin-toast');
    if (el) el.classList.remove('show');
    clearTimeout(toastTimer);
  };

  /* ── تنبيه المزوّد "نخزه" ──────────────────────── */
  window.VRT_poke = async function (orderId) {
    const entry = VRT.pending[orderId];
    if (!entry) return;
    const btn = document.querySelector(`[data-vrt-poke="${orderId}"]`);
    if (btn) { btn.disabled = true; btn.textContent = 'تم الإرسال ✓'; }

    // حفظ إشعار في user_notifications للمزوّد
    try {
      if (typeof db !== 'undefined' && entry.providerUid) {
        const order = (window.AppData?.orders || []).find(o => o.id === orderId);
        await db.collection('user_notifications').add({
          uid:       entry.providerUid,
          title:     '⚠️ تذكير: طلب ينتظر ردّك',
          body:      `طلب #${entry.orderNum} من ${entry.customer} لا يزال بانتظار موافقتك`,
          type:      'warning',
          link:      'vendor',
          read:      false,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
        if (typeof window.toast === 'function') window.toast('تم إرسال تذكير للمزوّد', 'success');
      }
    } catch (e) {
      console.warn('[VRT] poke failed:', e);
      if (typeof window.toast === 'function') window.toast('تعذّر إرسال التذكير', 'error');
    }

    setTimeout(() => {
      if (btn) { btn.disabled = false; btn.textContent = '🔔 تنبيه'; }
    }, 30000);
  };

  /* ── رسم الويدجت ────────────────────────────────── */
  function renderWidget() {
    const widget = document.getElementById('vrt-list');
    if (!widget) return;

    const entries = Object.values(VRT.pending);
    const thresholdSecs = VRT.thresholdMin * 60;

    if (entries.length === 0) {
      widget.innerHTML = `<div class="vrt-empty">✅ لا توجد طلبات معلّقة لدى المزوّدين</div>`;
      _updateHeaderCount(0);
      return;
    }

    widget.innerHTML = entries.map(e => {
      const elapsedSecs = elapsed(e.notifiedAt);
      const ratio = thresholdSecs > 0 ? (elapsedSecs / thresholdSecs) : 0;
      const cls = ratio >= 1 ? 'danger' : ratio >= 0.7 ? 'warn' : 'ok';
      const remaining = thresholdSecs - elapsedSecs;
      const timerText = remaining > 0
        ? `⏱ ${fmtElapsed(remaining)} متبقّي`
        : `⚠️ تأخّر ${fmtElapsed(Math.abs(remaining))}`;

      return `
        <div class="vrt-row">
          <div class="vrt-row-status ${cls}"></div>
          <div class="vrt-row-info">
            <div class="vrt-row-order">طلب #${esc(e.orderNum)} — ${esc(e.providerName)}</div>
            <div class="vrt-row-detail">${esc(e.customer)}${e.service ? ' · ' + esc(e.service) : ''}${e.total ? ' · ' + e.total : ''}</div>
          </div>
          <div class="vrt-row-timer ${cls}">${timerText}</div>
          <button class="vrt-poke-btn" data-vrt-poke="${esc(e.orderId)}"
            onclick="VRT_poke('${esc(e.orderId)}')">🔔 تنبيه</button>
        </div>`;
    }).join('');

    _updateHeaderCount(entries.length);
  }

  function _updateHeaderCount(n) {
    const el = document.getElementById('vrt-header-count');
    if (!el) return;
    el.textContent = n;
    el.className = 'vrt-header-count' + (n === 0 ? ' zero' : '');
  }

  /* ── تحقق من تجاوز الحدّ الزمني ────────────────── */
  function checkThresholds() {
    const thresholdSecs = VRT.thresholdMin * 60;
    Object.values(VRT.pending).forEach(e => {
      const elapsedSecs = elapsed(e.notifiedAt);
      if (elapsedSecs >= thresholdSecs && !VRT.alertedIds.has(e.orderId)) {
        VRT.alertedIds.add(e.orderId);
        const msg = `المزوّد "${e.providerName}" لم يستجب لطلب #${e.orderNum} منذ ${VRT.thresholdMin} دقيقة`;
        showAdminToast(msg);

        // تنبيه المتصفح
        try {
          if (Notification.permission === 'granted') {
            new Notification('⏰ مزوّد لم يستجب', {
              body: msg, icon: '/icons/icon-192.png', dir: 'rtl', lang: 'ar',
            });
          }
        } catch (_) {}
      }
    });
  }

  /* ── Ticker (كل 5 ث) ───────────────────────────── */
  function startTicker() {
    if (VRT.ticker) return;
    VRT.ticker = setInterval(() => {
      renderWidget();
      checkThresholds();
    }, 5000);
  }
  function stopTicker() {
    clearInterval(VRT.ticker);
    VRT.ticker = null;
  }

  /* ── معالجة التغييرات من Firestore ─────────────── */
  function handleSnap(snap) {
    snap.docChanges().forEach(ch => {
      const id = ch.doc.id;
      const d  = ch.doc.data() || {};

      if (ch.type === 'removed' || d.status !== 'pending_provider') {
        delete VRT.pending[id];
        VRT.alertedIds.delete(id);
      } else if (ch.type === 'added' || ch.type === 'modified') {
        VRT.pending[id] = {
          orderId:     id,
          providerUid: d.providerUid || d.vendorId || '',
          providerName: d.providerName || d.vendorName || 'مزوّد',
          notifiedAt:  d.vendorNotifiedAt || d.createdAt || null,
          orderNum:    d.orderId || id.slice(-6).toUpperCase(),
          customer:    d.customerName || 'عميل',
          service:     d.svcName || d.serviceName || '',
          total:       d.total ? fmtAmount(d.total) : '',
        };
      }
    });
    renderWidget();
    checkThresholds();
  }

  /* ── Attach / Detach ─────────────────────────────── */
  function detach() {
    try { VRT.unsub && VRT.unsub(); } catch (e) {}
    VRT.unsub    = null;
    VRT.boundUid = null;
    VRT.pending  = {};
    VRT.alertedIds.clear();
    stopTicker();
    _removeWidget();
  }

  function attach(uid) {
    if (typeof db === 'undefined' || !db?.collection) return;
    if (VRT.boundUid === uid) return;
    detach();
    VRT.boundUid = uid;
    ensureStyles();
    startTicker();

    try {
      VRT.unsub = db.collection('orders')
        .where('status', '==', 'pending_provider')
        .onSnapshot(handleSnap, err => console.warn('[VRT] listener error:', err));
    } catch (e) { console.warn('[VRT] failed to attach:', e); }
  }

  /* ── حقن الويدجت في لوحة الإدارة ─────────────── */
  function _removeWidget() {
    const el = document.getElementById('vrt-widget');
    if (el) el.remove();
  }

  function injectWidget() {
    if (!document.getElementById('vrt-widget')) {
      // نحاول حقنه بعد بطاقات الإحصاء في لوحة الإدارة
      const targets = [
        document.querySelector('.admin-stats-grid'),
        document.querySelector('.dashboard-stats'),
        document.querySelector('[data-section="admin"]'),
        document.querySelector('#admin-panel'),
        document.querySelector('.admin-content'),
      ];
      const target = targets.find(Boolean);
      if (!target) return;

      const widget = document.createElement('div');
      widget.id = 'vrt-widget';
      widget.innerHTML = `
        <div id="vrt-header" onclick="VRT_toggleWidget()">
          <div id="vrt-header-icon">⏱</div>
          <div id="vrt-header-title">انتظار استجابة المزوّدين</div>
          <span id="vrt-header-count" class="vrt-header-count zero">0</span>
          <button id="vrt-header-toggle">▼</button>
        </div>
        <div id="vrt-body">
          <div id="vrt-controls">
            <span class="vrt-ctrl-label">حدّ التنبيه:</span>
            <input id="vrt-threshold-input" type="number" min="1" max="60"
              value="${VRT.thresholdMin}" title="الحد بالدقائق">
            <span class="vrt-ctrl-label">دقيقة</span>
            <button class="vrt-save-btn" onclick="VRT_saveThreshold()">حفظ</button>
          </div>
          <div id="vrt-list"></div>
        </div>`;
      target.insertAdjacentElement('afterend', widget);
      renderWidget();
    }
  }

  window.VRT_toggleWidget = function () {
    const body   = document.getElementById('vrt-body');
    const toggle = document.getElementById('vrt-header-toggle');
    if (!body) return;
    const isOpen = body.classList.toggle('open');
    if (toggle) toggle.classList.toggle('open', isOpen);
    if (isOpen) renderWidget();
  };

  window.VRT_saveThreshold = function () {
    const inp = document.getElementById('vrt-threshold-input');
    const val = parseInt(inp?.value || '10', 10);
    if (!val || val < 1 || val > 120) {
      if (typeof window.toast === 'function') window.toast('أدخل قيمة بين 1 و 120 دقيقة', 'error');
      return;
    }
    VRT.thresholdMin = val;
    localStorage.setItem('vrt_threshold_min', String(val));
    VRT.alertedIds.clear(); // أعد الحساب من جديد
    if (typeof window.toast === 'function') window.toast(`✅ تم ضبط الحد على ${val} دقيقة`, 'success');
  };

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
      if (uid && (role === 'admin' || role === 'staff')) {
        attach(uid);
      } else {
        if (VRT.boundUid) detach();
      }
    }
    // حقن الويدجت عند وجود المستخدم وكون الصفحة الإدارية مفتوحة
    if (VRT.boundUid && !document.getElementById('vrt-widget')) {
      injectWidget();
    }
  }

  setInterval(poll, 1500);
  setTimeout(poll, 2500);

  console.log('[VendorResponseTracker] نظام متابعة استجابة المزوّدين جاهز ⏱');
})();
