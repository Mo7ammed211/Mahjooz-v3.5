/* ============================================================
   Auto-Routing Timeout Engine — نظام التوجيه التلقائي بانتهاء الوقت
   ------------------------------------------------------------
   يعمل في خلفية المتصفح للمدير/الموظف فقط.

   الوظيفة:
   ① مندوب لم يقبل خلال الوقت المحدد → ينتقل للمندوب التالي في القائمة
   ② مزوّد لم يقبل خلال الوقت المحدد → ينتقل للمزوّد التالي في القائمة
   ③ إذا انتهت القائمة → status = 'no_drivers'/'no_providers'
      + إشعار للمدير + إشعار للعميل
   ④ الإعدادات محفوظة في Firestore تحت platform_config/routing_timeouts
   ============================================================ */
(function () {
  'use strict';

  const FS_COL = 'platform_config';
  const FS_DOC = 'routing_timeouts';
  const LS_KEY = 'art_settings_v1';

  const DEFAULTS = {
    vendor_enabled:     true,
    vendor_timeout_min: 10,
    driver_enabled:     true,
    driver_timeout_min: 5,
    notify_customer:    true,
    exhaust_msg_vendor: 'نأسف، لا يوجد مزوّدون متاحون حالياً. يرجى المحاولة لاحقاً أو التواصل مع الدعم.',
    exhaust_msg_driver: 'نأسف، لا يوجد مندوبو توصيل متاحون حالياً. سيتواصل معك فريقنا قريباً.',
  };

  const ART = {
    settings:    { ...DEFAULTS },
    _loaded:     false,
    _processing: new Set(),
    _ticker:     null,
    _role:       null,
  };
  window.ART = ART;

  /* ── تحميل الإعدادات ──────────────────────────────────────── */
  ART.load = async function () {
    try {
      const cached = localStorage.getItem(LS_KEY);
      if (cached) this.settings = { ...DEFAULTS, ...JSON.parse(cached) };
    } catch (_) {}

    try {
      const doc = await db.collection(FS_COL).doc(FS_DOC).get();
      if (doc.exists) {
        this.settings = { ...DEFAULTS, ...doc.data() };
        localStorage.setItem(LS_KEY, JSON.stringify(this.settings));
      }
    } catch (e) { console.warn('[ART] load failed:', e.message); }

    this._loaded = true;
    console.log('[ART] إعدادات التوجيه التلقائي محمّلة ⏱', this.settings);
  };

  ART.save = async function (patch) {
    Object.assign(this.settings, patch);
    localStorage.setItem(LS_KEY, JSON.stringify(this.settings));
    try {
      await db.collection(FS_COL).doc(FS_DOC).set(this.settings, { merge: true });
    } catch (e) { console.error('[ART] save error:', e); }
  };

  /* ── أدوات ──────────────────────────────────────────────── */
  function _getMs(ts) {
    if (!ts) return null;
    if (ts?.toMillis) return ts.toMillis();
    if (ts instanceof Date) return ts.getTime();
    if (typeof ts === 'number') return ts;
    return new Date(ts).getTime();
  }

  function _fmtMin(min) {
    return min >= 60 ? `${(min/60).toFixed(1)} ساعة` : `${min} دقيقة`;
  }

  /* ── صوت ────────────────────────────────────────────────── */
  function _beep() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      [[440,0,0.1],[350,0.12,0.1]].forEach(([f,d,dur]) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.frequency.value = f; o.type = 'sine';
        g.gain.setValueAtTime(0.2, ctx.currentTime+d);
        g.gain.linearRampToValueAtTime(0, ctx.currentTime+d+dur);
        o.start(ctx.currentTime+d); o.stop(ctx.currentTime+d+dur);
      });
    } catch (_) {}
  }

  /* ── إشعار المدير ────────────────────────────────────────── */
  function _notifyAdmin(orderId, orderNum, who, type) {
    const msg = type === 'exhaust_vendor'
      ? `طلب #${orderNum}: انتهت قائمة المزوّدين المتاحين`
      : `طلب #${orderNum}: انتهت قائمة المندوبين المتاحين`;

    _beep();
    window.__unifiedNotif?.update('live',
      [{ icon: '⏰', title: '🚨 ' + msg, sub: `رقم الطلب: ${orderNum}`, time: new Date().toLocaleTimeString('ar') },
       ...(window.PH19?.feed || []).slice(0, 9)],
      (window.PH19?.unseen || 0) + 1
    );

    // توست مرئي
    if (typeof window.toast === 'function') {
      window.toast('🚨 ' + msg, 'error');
    }
  }

  /* ── إشعار العميل ────────────────────────────────────────── */
  async function _notifyCustomer(order, type) {
    try {
      const uid = order.userId || order.customerId;
      if (!uid || !window.db) return;
      const msg = type === 'exhaust_vendor'
        ? ART.settings.exhaust_msg_vendor
        : ART.settings.exhaust_msg_driver;
      await db.collection('user_notifications').add({
        uid,
        title:     type === 'exhaust_vendor' ? '⚠️ لم يتم استقبال طلبك' : '⚠️ لم يتوفر مندوب توصيل',
        body:      msg,
        type:      'warning',
        orderId:   order.id,
        read:      false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
    } catch (e) { console.warn('[ART] customer notify failed:', e); }
  }

  /* ── تقدّم للمزوّد التالي ────────────────────────────────── */
  async function _advanceVendor(localOrder) {
    const orderId = localOrder.id;
    if (ART._processing.has('v_' + orderId)) return;
    ART._processing.add('v_' + orderId);

    try {
      // قراءة الحالة الحالية من Firestore لتجنب race conditions
      const snap = await db.collection('orders').doc(orderId).get();
      if (!snap.exists) return;
      const o = snap.data();

      // تحقق أن الطلب لا يزال ينتظر مزوّداً
      if (o.status !== 'pending_provider') return;

      const nextIdx  = (o.currentVendorIdx || 0) + 1;
      const pool     = o.vendorPool || [];
      const nextId   = pool[nextIdx] || null;
      const orderNum = o.orderId || orderId.slice(-6).toUpperCase();

      const logEntry = {
        at:  new Date(),
        msg: `⏱ انتهى وقت انتظار المزوّد "${o.providerName || o.providerUid}" (${_fmtMin(ART.settings.vendor_timeout_min)}). ${nextId ? 'تم التوجيه للتالي تلقائياً.' : 'لا يوجد مزوّدون آخرون.'}`,
      };

      if (nextId) {
        const nextVendor = (window.AppData?.users || []).find(u => u.id === nextId);
        await db.collection('orders').doc(orderId).update({
          currentVendorIdx:  nextIdx,
          providerUid:       nextId,
          providerName:      nextVendor?.name || nextVendor?.displayName || '—',
          status:            'pending_provider',
          vendorNotifiedAt:  new Date(),
          autoTimedOut:      true,
          routingLog:        firebase.firestore.FieldValue.arrayUnion(logEntry),
        });
        console.log(`[ART] طلب #${orderNum}: تقدّم للمزوّد التالي ${nextId}`);
      } else {
        // انتهت القائمة
        await db.collection('orders').doc(orderId).update({
          status:         'no_providers',
          noProvidersAt:  new Date(),
          autoTimedOut:   true,
          routingLog:     firebase.firestore.FieldValue.arrayUnion(logEntry),
        });
        console.warn(`[ART] طلب #${orderNum}: انتهت قائمة المزوّدين 🚨`);
        _notifyAdmin(orderId, orderNum, o.providerUid, 'exhaust_vendor');
        if (ART.settings.notify_customer) await _notifyCustomer({ id: orderId, ...o }, 'exhaust_vendor');
      }
    } catch (e) {
      console.error('[ART] _advanceVendor error:', e);
    } finally {
      ART._processing.delete('v_' + orderId);
    }
  }

  /* ── تقدّم للمندوب التالي ────────────────────────────────── */
  async function _advanceDriver(localOrder) {
    const orderId = localOrder.id;
    if (ART._processing.has('d_' + orderId)) return;
    ART._processing.add('d_' + orderId);

    try {
      const snap = await db.collection('orders').doc(orderId).get();
      if (!snap.exists) return;
      const o = snap.data();

      // تحقق أن الطلب لا يزال ينتظر مندوباً
      if (o.status !== 'provider_accepted') return;
      if (!o.assignedDriverId) return;

      const hist    = (o.driverHistory || []).concat([{
        driverId: o.assignedDriverId,
        reason:   'auto_timeout',
        note:     `انتهى وقت الانتظار (${_fmtMin(ART.settings.driver_timeout_min)}) — تلقائي`,
        at:       new Date(),
      }]);
      const nextIdx = (o.driverIdx || 0) + 1;
      const pool    = o.driverPool || [];
      const nextId  = pool[nextIdx] || null;
      const orderNum = o.orderId || orderId.slice(-6).toUpperCase();

      const logEntry = {
        at:  new Date(),
        msg: `⏱ انتهى وقت انتظار المندوب "${o.assignedDriverId}" (${_fmtMin(ART.settings.driver_timeout_min)}). ${nextId ? 'تم التوجيه للتالي تلقائياً.' : 'لا يوجد مندوبون آخرون.'}`,
      };

      if (nextId) {
        await db.collection('orders').doc(orderId).update({
          driverHistory:    hist,
          driverIdx:        nextIdx,
          assignedDriverId: nextId,
          driverId:         nextId,
          driverAssignedAt: new Date(),
          autoTimedOut:     true,
          status:           'provider_accepted',
          routingLog:       firebase.firestore.FieldValue.arrayUnion(logEntry),
        });
        console.log(`[ART] طلب #${orderNum}: تقدّم للمندوب التالي ${nextId}`);
      } else {
        await db.collection('orders').doc(orderId).update({
          driverHistory:    hist,
          driverIdx:        nextIdx,
          assignedDriverId: null,
          driverId:         null,
          status:           'no_drivers',
          noDriversAt:      new Date(),
          autoTimedOut:     true,
          routingLog:       firebase.firestore.FieldValue.arrayUnion(logEntry),
        });
        console.warn(`[ART] طلب #${orderNum}: انتهت قائمة المندوبين 🚨`);
        _notifyAdmin(orderId, orderNum, o.assignedDriverId, 'exhaust_driver');
        if (ART.settings.notify_customer) await _notifyCustomer({ id: orderId, ...o }, 'exhaust_driver');
      }
    } catch (e) {
      console.error('[ART] _advanceDriver error:', e);
    } finally {
      ART._processing.delete('d_' + orderId);
    }
  }

  /* ── فحص كل الطلبات ─────────────────────────────────────── */
  ART.checkTimeouts = async function () {
    if (!this._loaded || !window.AppData?.orders) return;
    const now = Date.now();

    // ① مزوّدون
    if (this.settings.vendor_enabled) {
      const thresholdMs = this.settings.vendor_timeout_min * 60 * 1000;
      const vendorOrders = (AppData.orders || []).filter(o =>
        o.status === 'pending_provider' && o.vendorNotifiedAt && !o.autoTimedOut
      );
      for (const o of vendorOrders) {
        const notifiedMs = _getMs(o.vendorNotifiedAt);
        if (notifiedMs && (now - notifiedMs) > thresholdMs) {
          await _advanceVendor(o);
        }
      }
    }

    // ② مندوبون
    if (this.settings.driver_enabled) {
      const thresholdMs = this.settings.driver_timeout_min * 60 * 1000;
      const driverOrders = (AppData.orders || []).filter(o =>
        o.status === 'provider_accepted' && o.assignedDriverId && o.driverAssignedAt && !o.autoTimedOut
      );
      for (const o of driverOrders) {
        const assignedMs = _getMs(o.driverAssignedAt);
        if (assignedMs && (now - assignedMs) > thresholdMs) {
          await _advanceDriver(o);
        }
      }
    }
  };

  /* ── بدء/إيقاف المؤقت ───────────────────────────────────── */
  ART.startTicker = function () {
    if (this._ticker) return;
    // أول فحص بعد 10 ثوانٍ من التشغيل، ثم كل 30 ثانية
    setTimeout(() => ART.checkTimeouts(), 10000);
    this._ticker = setInterval(() => ART.checkTimeouts(), 30000);
    console.log('[ART] ⏱ مؤقت التوجيه التلقائي يعمل (كل 30 ث)');
  };

  ART.stopTicker = function () {
    clearInterval(this._ticker);
    this._ticker = null;
  };

  /* ── ربط بحالة تسجيل الدخول ─────────────────────────────── */
  let _lastUid = null, _lastRole = null;

  function _poll() {
    const u    = window.State?.currentUser;
    const uid  = u?.uid  || null;
    const role = u?.role || null;

    if (uid !== _lastUid || role !== _lastRole) {
      _lastUid  = uid;
      _lastRole = role;

      if (uid && (role === 'admin' || role === 'staff')) {
        if (!ART._loaded) ART.load();
        ART.startTicker();
      } else {
        ART.stopTicker();
      }
    }
  }

  setInterval(_poll, 2000);
  setTimeout(_poll, 3000);

  /* ════════════════════════════════════════════════════════
     واجهة الإدارة — لوحة إعدادات التوجيه التلقائي
     ════════════════════════════════════════════════════════ */
  window.renderAdminRoutingTimeouts = function () {
    const s = ART.settings;

    return `
    <div style="font-family:'Cairo',sans-serif;direction:rtl;max-width:860px">

      <!-- رأس -->
      <div style="display:flex;align-items:center;gap:16px;margin-bottom:24px">
        <div style="width:52px;height:52px;border-radius:14px;background:linear-gradient(135deg,rgba(139,92,246,0.2),rgba(6,182,212,0.1));display:flex;align-items:center;justify-content:center;font-size:26px;flex-shrink:0">⏱</div>
        <div>
          <h1 style="font-size:20px;font-weight:900;color:var(--text-main);margin:0 0 4px">الحد الأقصى لوقت القبول</h1>
          <p style="font-size:13px;color:var(--text-secondary);margin:0;line-height:1.5">
            إذا لم يقبل المزوّد أو المندوب خلال الوقت المحدد، يُوجَّه الطلب للتالي تلقائياً.<br>
            عند انتهاء جميع الخيارات: يُعلَم المدير والعميل فوراً.
          </p>
        </div>
      </div>

      <!-- ملاحظة التشغيل -->
      <div style="background:rgba(245,158,11,0.08);border:1.5px solid rgba(245,158,11,0.25);border-radius:12px;padding:12px 16px;margin-bottom:20px;font-size:12px;color:#f59e0b;display:flex;gap:10px;align-items:flex-start">
        <span style="font-size:16px;flex-shrink:0">💡</span>
        <span>هذا النظام يعمل طالما <strong>مدير أو موظف</strong> متصل بالمنصة. الفحص يتم كل 30 ثانية تلقائياً.</span>
      </div>

      <!-- قسم المزوّدين -->
      <div style="background:var(--bg-card);border:1.5px solid var(--border);border-radius:16px;padding:20px;margin-bottom:16px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;gap:12px;flex-wrap:wrap">
          <div style="display:flex;align-items:center;gap:10px">
            <div style="width:38px;height:38px;border-radius:10px;background:rgba(139,92,246,0.15);color:#a78bfa;display:flex;align-items:center;justify-content:center;font-size:18px">🏪</div>
            <div>
              <div style="font-weight:800;font-size:15px;color:var(--text-main)">المزوّدون / الخدمات المهنية</div>
              <div style="font-size:12px;color:var(--text-secondary);margin-top:2px">الحد الأقصى لانتظار قبول المزوّد أو المهني</div>
            </div>
          </div>
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
            <span style="font-size:12px;font-weight:700;color:${s.vendor_enabled?'#22c55e':'#94a3b8'}" id="art-vendor-status-lbl">
              ${s.vendor_enabled ? '✅ مفعّل' : '⏸ معطّل'}
            </span>
            <label class="sv3-switch">
              <input type="checkbox" ${s.vendor_enabled ? 'checked' : ''} onchange="ART_toggleVendor(this)">
              <span class="sv3-switch-track"><span class="sv3-switch-thumb"></span></span>
            </label>
          </label>
        </div>

        <div id="art-vendor-config" style="${s.vendor_enabled ? '' : 'opacity:0.5;pointer-events:none'}">
          <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
            <label style="font-size:13px;font-weight:700;color:var(--text-secondary);white-space:nowrap">⏱ الحد الأقصى:</label>
            <div style="display:flex;align-items:center;gap:8px;background:var(--bg-secondary);border:1.5px solid var(--border);border-radius:10px;padding:6px 12px">
              <input type="number" id="art-vendor-min" min="1" max="120" value="${s.vendor_timeout_min}"
                style="width:60px;background:none;border:none;color:var(--text-main);font-family:'Cairo',sans-serif;font-size:16px;font-weight:800;outline:none;text-align:center">
              <span style="color:var(--text-secondary);font-size:13px;font-weight:700">دقيقة</span>
            </div>
            <button onclick="ART_saveVendor()" style="padding:8px 20px;border-radius:99px;border:none;cursor:pointer;background:rgba(139,92,246,0.2);color:#a78bfa;font-family:'Cairo',sans-serif;font-size:13px;font-weight:800;transition:background 0.15s"
              onmouseover="this.style.background='rgba(139,92,246,0.35)'" onmouseout="this.style.background='rgba(139,92,246,0.2)'">
              💾 حفظ
            </button>
          </div>

          <div style="margin-top:14px;padding:12px 14px;background:var(--bg-secondary);border-radius:10px;font-size:12px;color:var(--text-secondary);line-height:1.8">
            <div>📌 إذا لم يقبل المزوّد خلال <strong id="art-vendor-preview" style="color:var(--primary)">${_fmtMin(s.vendor_timeout_min)}</strong>:</div>
            <div>↳ يُوجَّه الطلب للمزوّد التالي في القائمة تلقائياً</div>
            <div>↳ عند انتهاء كل المزوّدين: الطلب يصبح <code style="background:rgba(239,68,68,0.1);color:#ef4444;padding:1px 5px;border-radius:4px">no_providers</code></div>
          </div>
        </div>
      </div>

      <!-- قسم المندوبين -->
      <div style="background:var(--bg-card);border:1.5px solid var(--border);border-radius:16px;padding:20px;margin-bottom:16px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;gap:12px;flex-wrap:wrap">
          <div style="display:flex;align-items:center;gap:10px">
            <div style="width:38px;height:38px;border-radius:10px;background:rgba(6,182,212,0.15);color:#22d3ee;display:flex;align-items:center;justify-content:center;font-size:18px">🚗</div>
            <div>
              <div style="font-weight:800;font-size:15px;color:var(--text-main)">مندوبو التوصيل</div>
              <div style="font-size:12px;color:var(--text-secondary);margin-top:2px">الحد الأقصى لانتظار قبول المندوب للطلب</div>
            </div>
          </div>
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
            <span style="font-size:12px;font-weight:700;color:${s.driver_enabled?'#22c55e':'#94a3b8'}" id="art-driver-status-lbl">
              ${s.driver_enabled ? '✅ مفعّل' : '⏸ معطّل'}
            </span>
            <label class="sv3-switch">
              <input type="checkbox" ${s.driver_enabled ? 'checked' : ''} onchange="ART_toggleDriver(this)">
              <span class="sv3-switch-track"><span class="sv3-switch-thumb"></span></span>
            </label>
          </label>
        </div>

        <div id="art-driver-config" style="${s.driver_enabled ? '' : 'opacity:0.5;pointer-events:none'}">
          <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
            <label style="font-size:13px;font-weight:700;color:var(--text-secondary);white-space:nowrap">⏱ الحد الأقصى:</label>
            <div style="display:flex;align-items:center;gap:8px;background:var(--bg-secondary);border:1.5px solid var(--border);border-radius:10px;padding:6px 12px">
              <input type="number" id="art-driver-min" min="1" max="60" value="${s.driver_timeout_min}"
                style="width:60px;background:none;border:none;color:var(--text-main);font-family:'Cairo',sans-serif;font-size:16px;font-weight:800;outline:none;text-align:center">
              <span style="color:var(--text-secondary);font-size:13px;font-weight:700">دقيقة</span>
            </div>
            <button onclick="ART_saveDriver()" style="padding:8px 20px;border-radius:99px;border:none;cursor:pointer;background:rgba(6,182,212,0.2);color:#22d3ee;font-family:'Cairo',sans-serif;font-size:13px;font-weight:800;transition:background 0.15s"
              onmouseover="this.style.background='rgba(6,182,212,0.35)'" onmouseout="this.style.background='rgba(6,182,212,0.2)'">
              💾 حفظ
            </button>
          </div>

          <div style="margin-top:14px;padding:12px 14px;background:var(--bg-secondary);border-radius:10px;font-size:12px;color:var(--text-secondary);line-height:1.8">
            <div>📌 إذا لم يقبل المندوب خلال <strong id="art-driver-preview" style="color:#22d3ee">${_fmtMin(s.driver_timeout_min)}</strong>:</div>
            <div>↳ يُوجَّه الطلب للمندوب التالي في القائمة تلقائياً</div>
            <div>↳ عند انتهاء كل المندوبين: الطلب يصبح <code style="background:rgba(239,68,68,0.1);color:#ef4444;padding:1px 5px;border-radius:4px">no_drivers</code></div>
          </div>
        </div>
      </div>

      <!-- إشعار العميل -->
      <div style="background:var(--bg-card);border:1.5px solid var(--border);border-radius:16px;padding:20px;margin-bottom:16px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;gap:12px;flex-wrap:wrap">
          <div style="display:flex;align-items:center;gap:10px">
            <div style="width:38px;height:38px;border-radius:10px;background:rgba(34,197,94,0.15);color:#4ade80;display:flex;align-items:center;justify-content:center;font-size:18px">📱</div>
            <div>
              <div style="font-weight:800;font-size:15px;color:var(--text-main)">إشعار العميل عند انتهاء الخيارات</div>
              <div style="font-size:12px;color:var(--text-secondary);margin-top:2px">إرسال رسالة تلقائية للعميل عندما لا يتوفر أحد</div>
            </div>
          </div>
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
            <span style="font-size:12px;font-weight:700;color:${s.notify_customer?'#22c55e':'#94a3b8'}" id="art-notif-status-lbl">
              ${s.notify_customer ? '✅ مفعّل' : '⏸ معطّل'}
            </span>
            <label class="sv3-switch">
              <input type="checkbox" ${s.notify_customer ? 'checked' : ''} onchange="ART_toggleNotifyCustomer(this)">
              <span class="sv3-switch-track"><span class="sv3-switch-thumb"></span></span>
            </label>
          </label>
        </div>

        <div id="art-notif-config" style="${s.notify_customer ? '' : 'opacity:0.5;pointer-events:none'}">
          <div style="margin-bottom:10px">
            <label style="font-size:12px;font-weight:700;color:var(--text-secondary);display:block;margin-bottom:6px">رسالة انتهاء المزوّدين:</label>
            <div style="display:flex;gap:8px">
              <textarea id="art-msg-vendor" rows="2" style="flex:1;padding:8px 12px;border-radius:8px;background:var(--bg-secondary);border:1.5px solid var(--border);color:var(--text-main);font-family:'Cairo',sans-serif;font-size:12px;resize:none;outline:none">${s.exhaust_msg_vendor}</textarea>
              <button onclick="ART_saveMsg('vendor')" style="padding:6px 12px;border-radius:8px;border:none;cursor:pointer;background:rgba(34,197,94,0.15);color:#4ade80;font-family:'Cairo',sans-serif;font-size:12px;font-weight:800;white-space:nowrap">💾 حفظ</button>
            </div>
          </div>
          <div>
            <label style="font-size:12px;font-weight:700;color:var(--text-secondary);display:block;margin-bottom:6px">رسالة انتهاء المندوبين:</label>
            <div style="display:flex;gap:8px">
              <textarea id="art-msg-driver" rows="2" style="flex:1;padding:8px 12px;border-radius:8px;background:var(--bg-secondary);border:1.5px solid var(--border);color:var(--text-main);font-family:'Cairo',sans-serif;font-size:12px;resize:none;outline:none">${s.exhaust_msg_driver}</textarea>
              <button onclick="ART_saveMsg('driver')" style="padding:6px 12px;border-radius:8px;border:none;cursor:pointer;background:rgba(6,182,212,0.15);color:#22d3ee;font-family:'Cairo',sans-serif;font-size:12px;font-weight:800;white-space:nowrap">💾 حفظ</button>
            </div>
          </div>
        </div>
      </div>

      <!-- زر اختبار -->
      <div style="background:rgba(245,158,11,0.06);border:1.5px solid rgba(245,158,11,0.2);border-radius:12px;padding:14px 16px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">
        <div>
          <div style="font-weight:800;font-size:13px;color:#f59e0b">🔄 تشغيل الفحص الآن</div>
          <div style="font-size:11px;color:var(--text-secondary);margin-top:2px">يفحص جميع الطلبات المعلّقة فوراً ويُطبّق timeout إذا لزم</div>
        </div>
        <button onclick="ART_manualCheck()" style="padding:9px 22px;border-radius:99px;border:none;cursor:pointer;background:rgba(245,158,11,0.2);color:#f59e0b;font-family:'Cairo',sans-serif;font-size:13px;font-weight:800;transition:background 0.15s"
          onmouseover="this.style.background='rgba(245,158,11,0.35)'" onmouseout="this.style.background='rgba(245,158,11,0.2)'">
          ▶ فحص الآن
        </button>
      </div>

    </div>`;
  };

  /* ── معالجات أحداث الواجهة ──────────────────────────────── */
  function _fmtMin(min) {
    return min >= 60 ? `${(min/60).toFixed(1)} ساعة` : `${min} دقيقة`;
  }

  window.ART_toggleVendor = async function (chk) {
    await ART.save({ vendor_enabled: chk.checked });
    const lbl = document.getElementById('art-vendor-status-lbl');
    const cfg = document.getElementById('art-vendor-config');
    if (lbl) { lbl.textContent = chk.checked ? '✅ مفعّل' : '⏸ معطّل'; lbl.style.color = chk.checked ? '#22c55e' : '#94a3b8'; }
    if (cfg) cfg.style.cssText = chk.checked ? '' : 'opacity:0.5;pointer-events:none';
    window.toast?.(chk.checked ? '✅ Timeout المزوّدين مفعّل' : '⏸ Timeout المزوّدين معطّل', 'success');
  };

  window.ART_toggleDriver = async function (chk) {
    await ART.save({ driver_enabled: chk.checked });
    const lbl = document.getElementById('art-driver-status-lbl');
    const cfg = document.getElementById('art-driver-config');
    if (lbl) { lbl.textContent = chk.checked ? '✅ مفعّل' : '⏸ معطّل'; lbl.style.color = chk.checked ? '#22c55e' : '#94a3b8'; }
    if (cfg) cfg.style.cssText = chk.checked ? '' : 'opacity:0.5;pointer-events:none';
    window.toast?.(chk.checked ? '✅ Timeout المندوبين مفعّل' : '⏸ Timeout المندوبين معطّل', 'success');
  };

  window.ART_toggleNotifyCustomer = async function (chk) {
    await ART.save({ notify_customer: chk.checked });
    const lbl = document.getElementById('art-notif-status-lbl');
    const cfg = document.getElementById('art-notif-config');
    if (lbl) { lbl.textContent = chk.checked ? '✅ مفعّل' : '⏸ معطّل'; lbl.style.color = chk.checked ? '#22c55e' : '#94a3b8'; }
    if (cfg) cfg.style.cssText = chk.checked ? '' : 'opacity:0.5;pointer-events:none';
    window.toast?.('✅ تم الحفظ', 'success');
  };

  window.ART_saveVendor = async function () {
    const val = parseInt(document.getElementById('art-vendor-min')?.value || '10', 10);
    if (!val || val < 1 || val > 120) { window.toast?.('أدخل قيمة بين 1 و 120 دقيقة', 'error'); return; }
    await ART.save({ vendor_timeout_min: val });
    const prev = document.getElementById('art-vendor-preview');
    if (prev) prev.textContent = _fmtMin(val);
    window.toast?.(`✅ تم حفظ حد المزوّدين: ${_fmtMin(val)}`, 'success');
  };

  window.ART_saveDriver = async function () {
    const val = parseInt(document.getElementById('art-driver-min')?.value || '5', 10);
    if (!val || val < 1 || val > 60) { window.toast?.('أدخل قيمة بين 1 و 60 دقيقة', 'error'); return; }
    await ART.save({ driver_timeout_min: val });
    const prev = document.getElementById('art-driver-preview');
    if (prev) prev.textContent = _fmtMin(val);
    window.toast?.(`✅ تم حفظ حد المندوبين: ${_fmtMin(val)}`, 'success');
  };

  window.ART_saveMsg = async function (type) {
    const el = document.getElementById(`art-msg-${type}`);
    if (!el) return;
    const key = type === 'vendor' ? 'exhaust_msg_vendor' : 'exhaust_msg_driver';
    await ART.save({ [key]: el.value });
    window.toast?.('✅ تم حفظ الرسالة', 'success');
  };

  window.ART_manualCheck = async function () {
    const btn = event?.target;
    if (btn) { btn.disabled = true; btn.textContent = '⏳ جاري الفحص...'; }
    await ART.checkTimeouts();
    if (btn) { btn.disabled = false; btn.textContent = '▶ فحص الآن'; }
    window.toast?.('✅ تم الفحص', 'success');
  };

  console.log('[AutoRoutingTimeout] نظام الـ Timeout التلقائي للتوجيه جاهز ⏱🚦');
})();
