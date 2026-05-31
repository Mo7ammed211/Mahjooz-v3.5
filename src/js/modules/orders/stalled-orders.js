/* ============================================================
   Stalled Orders Manager — شاشة الطلبات المتوقفة
   ------------------------------------------------------------
   تعرض كل الطلبات التي وصلت إلى:
   • no_providers  — انتهت قائمة المزوّدين
   • no_drivers    — انتهت قائمة المندوبين

   الإجراءات المتاحة:
   ① إعادة توجيه تلقائي (يبني قائمة جديدة من الصفر)
   ② تعيين يدوي (يختار المدير مزوّداً أو مندوباً بعينه)
   ③ إلغاء الطلب مع إشعار العميل
   ============================================================ */
(function () {
  'use strict';

  /* ── مساعدات ─────────────────────────────────────────────── */
  function _fmt(ts) {
    if (!ts) return '—';
    const d = ts?.toDate ? ts.toDate() : new Date(ts?.seconds ? ts.seconds * 1000 : ts);
    if (isNaN(d)) return '—';
    return d.toLocaleString('ar-YE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  }

  function _elapsed(ts) {
    if (!ts) return '';
    const d = ts?.toDate ? ts.toDate() : new Date(ts?.seconds ? ts.seconds * 1000 : ts);
    if (isNaN(d)) return '';
    const mins = Math.floor((Date.now() - d.getTime()) / 60000);
    if (mins < 60) return `منذ ${mins} د`;
    const hrs = Math.floor(mins / 60);
    return hrs < 24 ? `منذ ${hrs} س` : `منذ ${Math.floor(hrs/24)} يوم`;
  }

  function _orderNum(o) {
    return o.orderId || o.id?.slice(-6).toUpperCase() || '—';
  }

  function _customerName(o) {
    const uid  = o.userId || o.customerId;
    const user = (window.AppData?.users || []).find(u => u.id === uid || u.uid === uid);
    return o.customerName || user?.name || user?.displayName || uid?.slice(0, 8) || '—';
  }

  function _svcName(o) {
    return o.serviceName || o.svcName
      || (window.AppData?.services || []).find(s => s.id === o.svcId)?.name
      || o.type || '—';
  }

  /* ── توست خفيف ───────────────────────────────────────────── */
  function _toast(msg, type) { window.toast?.(msg, type || 'success'); }

  /* ════════════════════════════════════════════════════════════
     الشاشة الرئيسية
     ════════════════════════════════════════════════════════════ */
  window.renderAdminStalledOrders = function () {
    const all     = (window.AppData?.orders || []);
    const stalled = all.filter(o => o.status === 'no_providers' || o.status === 'no_drivers')
                       .sort((a, b) => {
                         const ta = a.noProvidersAt || a.noDriversAt;
                         const tb = b.noProvidersAt || b.noDriversAt;
                         const ma = ta?.seconds ? ta.seconds : (ta ? new Date(ta).getTime()/1000 : 0);
                         const mb = tb?.seconds ? tb.seconds : (tb ? new Date(tb).getTime()/1000 : 0);
                         return mb - ma;
                       });

    const noProviders = stalled.filter(o => o.status === 'no_providers');
    const noDrivers   = stalled.filter(o => o.status === 'no_drivers');

    if (!stalled.length) {
      return `
      <div style="font-family:'Cairo',sans-serif;direction:rtl;max-width:860px">
        ${_header()}
        <div style="text-align:center;padding:80px 20px;color:var(--text-secondary)">
          <div style="font-size:56px;margin-bottom:16px">✅</div>
          <div style="font-size:18px;font-weight:800;color:var(--text-main);margin-bottom:8px">لا توجد طلبات متوقفة</div>
          <div style="font-size:13px">جميع الطلبات تسير بشكل طبيعي</div>
        </div>
      </div>`;
    }

    return `
    <div style="font-family:'Cairo',sans-serif;direction:rtl;max-width:1000px">

      ${_header()}

      <!-- إحصائيات سريعة -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:24px">
        ${_statCard('🚨', 'إجمالي المتوقفة', stalled.length, '#ef4444')}
        ${_statCard('🏪', 'بدون مزوّد', noProviders.length, '#f59e0b')}
        ${_statCard('🚗', 'بدون مندوب', noDrivers.length, '#8b5cf6')}
        ${_statCard('⏱', 'أقدمها', _oldestAge(stalled), '#64748b')}
      </div>

      <!-- زر إعادة توجيه الكل -->
      ${stalled.length > 1 ? `
      <div style="display:flex;justify-content:flex-end;margin-bottom:16px;gap:10px;flex-wrap:wrap">
        <button onclick="SOM_rerouteAll()" style="padding:9px 22px;border-radius:99px;border:1.5px solid rgba(139,92,246,0.4);cursor:pointer;background:rgba(139,92,246,0.1);color:#a78bfa;font-family:'Cairo',sans-serif;font-size:13px;font-weight:800;transition:all 0.15s"
          onmouseover="this.style.background='rgba(139,92,246,0.22)'" onmouseout="this.style.background='rgba(139,92,246,0.1)'">
          🔄 إعادة توجيه الكل (${stalled.length})
        </button>
        <button onclick="SOM_cancelAll()" style="padding:9px 22px;border-radius:99px;border:1.5px solid rgba(239,68,68,0.3);cursor:pointer;background:rgba(239,68,68,0.07);color:#f87171;font-family:'Cairo',sans-serif;font-size:13px;font-weight:800;transition:all 0.15s"
          onmouseover="this.style.background='rgba(239,68,68,0.18)'" onmouseout="this.style.background='rgba(239,68,68,0.07)'">
          ❌ إلغاء الكل
        </button>
      </div>` : ''}

      <!-- قائمة الطلبات -->
      <div style="display:flex;flex-direction:column;gap:14px">
        ${stalled.map(o => _orderCard(o)).join('')}
      </div>

    </div>`;
  };

  /* ── رأس الصفحة ─────────────────────────────────────────── */
  function _header() {
    return `
    <div style="display:flex;align-items:center;gap:16px;margin-bottom:24px">
      <div style="width:52px;height:52px;border-radius:14px;background:linear-gradient(135deg,rgba(239,68,68,0.2),rgba(245,158,11,0.1));display:flex;align-items:center;justify-content:center;font-size:26px;flex-shrink:0">🚨</div>
      <div>
        <h1 style="font-size:20px;font-weight:900;color:var(--text-main);margin:0 0 4px">الطلبات المتوقفة</h1>
        <p style="font-size:13px;color:var(--text-secondary);margin:0">
          طلبات انتهت قائمة المزوّدين أو المندوبين المتاحين لها — تحتاج تدخلاً يدوياً أو إعادة توجيه
        </p>
      </div>
      <button onclick="SOM_refresh()" style="margin-right:auto;padding:8px 16px;border-radius:99px;border:1.5px solid var(--border);cursor:pointer;background:var(--bg-secondary);color:var(--text-secondary);font-family:'Cairo',sans-serif;font-size:12px;font-weight:700;transition:all 0.15s"
        onmouseover="this.style.borderColor='var(--primary)'" onmouseout="this.style.borderColor='var(--border)'">
        🔃 تحديث
      </button>
    </div>`;
  }

  /* ── بطاقة إحصاء ─────────────────────────────────────────── */
  function _statCard(icon, label, val, color) {
    return `
    <div style="background:var(--bg-card);border:1.5px solid var(--border);border-radius:14px;padding:16px;text-align:center">
      <div style="font-size:24px;margin-bottom:6px">${icon}</div>
      <div style="font-size:26px;font-weight:900;color:${color};margin-bottom:4px">${val}</div>
      <div style="font-size:12px;color:var(--text-secondary);font-weight:600">${label}</div>
    </div>`;
  }

  /* ── أقدم طلب ─────────────────────────────────────────────── */
  function _oldestAge(list) {
    let oldest = 0;
    for (const o of list) {
      const ts = o.noProvidersAt || o.noDriversAt;
      if (!ts) continue;
      const d = ts?.toDate ? ts.toDate() : new Date(ts?.seconds ? ts.seconds * 1000 : ts);
      if (!isNaN(d)) oldest = Math.max(oldest, Date.now() - d.getTime());
    }
    if (!oldest) return '—';
    const m = Math.floor(oldest / 60000);
    return m < 60 ? `${m} د` : `${Math.floor(m/60)} س`;
  }

  /* ── بطاقة الطلب ──────────────────────────────────────────── */
  function _orderCard(o) {
    const isNoProvider = o.status === 'no_providers';
    const accentColor  = isNoProvider ? '#f59e0b' : '#8b5cf6';
    const accentBg     = isNoProvider ? 'rgba(245,158,11,0.08)' : 'rgba(139,92,246,0.08)';
    const accentBorder = isNoProvider ? 'rgba(245,158,11,0.3)'  : 'rgba(139,92,246,0.3)';
    const statusLabel  = isNoProvider ? '🏪 لا يوجد مزوّد'     : '🚗 لا يوجد مندوب';
    const stalledAt    = o.noProvidersAt || o.noDriversAt;

    const routingHistory = (o.routingLog || [])
      .filter(r => r.msg)
      .slice(-3)
      .reverse();

    return `
    <div id="som-card-${o.id}" style="background:var(--bg-card);border:1.5px solid ${accentBorder};border-radius:16px;overflow:hidden;transition:box-shadow 0.2s"
      onmouseover="this.style.boxShadow='0 4px 20px rgba(0,0,0,0.1)'" onmouseout="this.style.boxShadow='none'">

      <!-- شريط الحالة -->
      <div style="background:${accentBg};border-bottom:1px solid ${accentBorder};padding:10px 16px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
        <div style="display:flex;align-items:center;gap:10px">
          <span style="background:${accentColor};color:#fff;font-size:11px;font-weight:800;padding:3px 10px;border-radius:99px">${statusLabel}</span>
          ${o.autoTimedOut ? `<span style="background:rgba(100,116,139,0.15);color:#64748b;font-size:11px;font-weight:700;padding:3px 10px;border-radius:99px">⏱ Timeout تلقائي</span>` : ''}
        </div>
        <div style="font-size:11px;color:var(--text-secondary);display:flex;align-items:center;gap:6px">
          <span style="font-weight:700;color:${accentColor}">${_elapsed(stalledAt)}</span>
          <span>·</span>
          <span>${_fmt(stalledAt)}</span>
        </div>
      </div>

      <!-- تفاصيل الطلب -->
      <div style="padding:16px;display:grid;grid-template-columns:1fr auto;gap:12px;align-items:start">
        <div>
          <!-- سطر العنوان -->
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;flex-wrap:wrap">
            <span style="font-size:16px;font-weight:900;color:var(--text-main)">طلب #${_orderNum(o)}</span>
            <span style="font-size:12px;color:var(--text-secondary);background:var(--bg-secondary);padding:2px 8px;border-radius:6px">${_svcName(o)}</span>
          </div>

          <!-- معلومات المستخدم والوقت -->
          <div style="display:flex;gap:16px;flex-wrap:wrap;font-size:12px;color:var(--text-secondary);margin-bottom:12px">
            <span>👤 ${_customerName(o)}</span>
            <span>📅 ${_fmt(o.createdAt)}</span>
            ${o.total || o.price ? `<span>💰 ${o.total || o.price} ريال</span>` : ''}
          </div>

          <!-- سجل التوجيه المختصر -->
          ${routingHistory.length ? `
          <details style="margin-bottom:0">
            <summary style="font-size:11px;font-weight:700;color:var(--text-secondary);cursor:pointer;list-style:none;display:flex;align-items:center;gap:4px">
              <span>📋</span> سجل التوجيه (${(o.routingLog||[]).length} إجراء) <span style="margin-right:4px">▾</span>
            </summary>
            <div style="margin-top:8px;padding:10px;background:var(--bg-secondary);border-radius:8px;font-size:11px;color:var(--text-secondary);line-height:2">
              ${routingHistory.map(r => `
              <div style="display:flex;gap:6px;align-items:flex-start">
                <span style="flex-shrink:0;color:var(--primary)">↳</span>
                <span>${r.msg}</span>
              </div>`).join('')}
            </div>
          </details>` : ''}
        </div>

        <!-- أزرار الإجراءات -->
        <div style="display:flex;flex-direction:column;gap:8px;min-width:150px">
          ${isNoProvider ? `
          <button onclick="SOM_rerouteVendor('${o.id}')" style="padding:9px 16px;border-radius:10px;border:none;cursor:pointer;background:rgba(245,158,11,0.18);color:#f59e0b;font-family:'Cairo',sans-serif;font-size:12px;font-weight:800;transition:background 0.15s;white-space:nowrap"
            onmouseover="this.style.background='rgba(245,158,11,0.3)'" onmouseout="this.style.background='rgba(245,158,11,0.18)'">
            🔄 إعادة توجيه لمزوّد
          </button>
          <button onclick="SOM_manualVendor('${o.id}')" style="padding:9px 16px;border-radius:10px;border:none;cursor:pointer;background:rgba(20,184,166,0.12);color:#0d9488;font-family:'Cairo',sans-serif;font-size:12px;font-weight:800;transition:background 0.15s;white-space:nowrap"
            onmouseover="this.style.background='rgba(20,184,166,0.25)'" onmouseout="this.style.background='rgba(20,184,166,0.12)'">
            ✋ تعيين يدوي
          </button>` : `
          <button onclick="SOM_rerouteDriver('${o.id}')" style="padding:9px 16px;border-radius:10px;border:none;cursor:pointer;background:rgba(139,92,246,0.15);color:#a78bfa;font-family:'Cairo',sans-serif;font-size:12px;font-weight:800;transition:background 0.15s;white-space:nowrap"
            onmouseover="this.style.background='rgba(139,92,246,0.28)'" onmouseout="this.style.background='rgba(139,92,246,0.15)'">
            🔄 إعادة توجيه لمندوب
          </button>
          <button onclick="SOM_manualDriver('${o.id}')" style="padding:9px 16px;border-radius:10px;border:none;cursor:pointer;background:rgba(6,182,212,0.12);color:#22d3ee;font-family:'Cairo',sans-serif;font-size:12px;font-weight:800;transition:background 0.15s;white-space:nowrap"
            onmouseover="this.style.background='rgba(6,182,212,0.25)'" onmouseout="this.style.background='rgba(6,182,212,0.12)'">
            ✋ تعيين مندوب يدوي
          </button>`}
          <button onclick="SOM_cancelOrder('${o.id}')" style="padding:9px 16px;border-radius:10px;border:none;cursor:pointer;background:rgba(239,68,68,0.08);color:#f87171;font-family:'Cairo',sans-serif;font-size:12px;font-weight:800;transition:background 0.15s;white-space:nowrap"
            onmouseover="this.style.background='rgba(239,68,68,0.18)'" onmouseout="this.style.background='rgba(239,68,68,0.08)'">
            ❌ إلغاء الطلب
          </button>
        </div>
      </div>
    </div>`;
  }

  /* ════════════════════════════════════════════════════════════
     إجراءات المدير
     ════════════════════════════════════════════════════════════ */

  /* ── تحديث الشاشة ────────────────────────────────────────── */
  window.SOM_refresh = async function () {
    if (typeof loadAllData === 'function') await loadAllData();
    if (typeof render === 'function') render();
    _toast('🔃 تم التحديث', 'success');
  };

  /* ── إعادة توجيه مزوّد (تلقائي) ──────────────────────────── */
  window.SOM_rerouteVendor = async function (orderId) {
    const o = (AppData.orders || []).find(x => x.id === orderId);
    if (!o) return;

    _toast('⏳ جاري إعادة البناء...', 'info');

    try {
      if (typeof window.ph43_approveAndAutoRoute === 'function') {
        await ph43_approveAndAutoRoute(orderId);
      } else {
        _toast('دالة التوجيه غير متاحة', 'error');
        return;
      }
      _removeCard(orderId);
      _toast(`✅ تم إعادة توجيه طلب #${o.orderId || orderId.slice(-6)} للمزوّدين`, 'success');
    } catch (e) {
      console.error('[SOM] rerouteVendor:', e);
      _toast('فشل إعادة التوجيه', 'error');
    }
  };

  /* ── إعادة توجيه مندوب (تلقائي) ──────────────────────────── */
  window.SOM_rerouteDriver = async function (orderId) {
    const o = (AppData.orders || []).find(x => x.id === orderId);
    if (!o) return;

    try {
      if (typeof window.__buildDriverPool !== 'function') {
        _toast('دالة بناء قائمة المندوبين غير متاحة', 'error');
        return;
      }
      const dPool = window.__buildDriverPool(o);
      if (!dPool.length) {
        _toast('⚠️ لا يوجد مندوبون متاحون الآن', 'warning');
        return;
      }
      await db.collection('orders').doc(orderId).update({
        driverPool:       dPool,
        driverIdx:        0,
        driverHistory:    [],
        assignedDriverId: dPool[0],
        driverId:         dPool[0],
        driverAssignedAt: new Date(),
        status:           'provider_accepted',
        autoTimedOut:     false,
        routingLog:       firebase.firestore.FieldValue.arrayUnion({
          at:  new Date(),
          msg: `🔄 أعاد المدير توجيه الطلب يدوياً لقائمة مندوبين جديدة (${dPool.length} مندوب).`,
        }),
      });
      await fsAdd('order_routing', { orderId, kind: 'admin_reroute_driver', uid: State.currentUser.uid, at: new Date() });
      _removeCard(orderId);
      if (typeof loadAllData === 'function') await loadAllData();
      _toast(`✅ تم إعادة التوجيه — ${dPool.length} مندوب في القائمة`, 'success');
    } catch (e) {
      console.error('[SOM] rerouteDriver:', e);
      _toast('فشل إعادة التوجيه', 'error');
    }
  };

  /* ── تعيين مزوّد يدوي ────────────────────────────────────── */
  window.SOM_manualVendor = function (orderId) {
    const vendors = (AppData.users || []).filter(u => ['vendor', 'provider', 'professional'].includes(u.role));
    if (!vendors.length) { _toast('لا يوجد مزوّدون مسجّلون', 'error'); return; }

    openModal(`
      <div class="modal-header">
        <h2 class="modal-title">✋ تعيين مزوّد يدوي</h2>
        <button class="modal-close" onclick="closeModal()">✕</button>
      </div>
      <div style="color:var(--text-secondary);font-size:13px;margin-bottom:14px;padding:0 4px">
        اختر مزوّداً واحداً لتعيينه مباشرةً لهذا الطلب
      </div>
      <div style="max-height:360px;overflow-y:auto;border:1px solid var(--border);border-radius:12px">
        ${vendors.map(v => `
        <div onclick="SOM_confirmManualVendor('${orderId}','${v.id}')" style="display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid var(--border);cursor:pointer;transition:background 0.15s"
          onmouseover="this.style.background='var(--bg-secondary)'" onmouseout="this.style.background='transparent'">
          <div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,rgba(139,92,246,0.3),rgba(20,184,166,0.2));display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0">
            ${v.role === 'professional' ? '🔧' : '🏪'}
          </div>
          <div style="flex:1">
            <div style="font-weight:700;font-size:14px;color:var(--text-main)">${v.name || v.displayName || v.email}</div>
            <div style="font-size:11px;color:var(--text-secondary);margin-top:2px">${v.email || ''} · ${v.role}</div>
          </div>
          <span style="font-size:18px;color:var(--border)">›</span>
        </div>`).join('')}
      </div>
    `);
  };

  window.SOM_confirmManualVendor = async function (orderId, vendorId) {
    closeModal();
    const v = (AppData.users || []).find(u => u.id === vendorId);
    try {
      await db.collection('orders').doc(orderId).update({
        providerUid:      vendorId,
        providerName:     v?.name || v?.displayName || '—',
        vendorPool:       [vendorId],
        currentVendorIdx: 0,
        status:           'pending_provider',
        vendorNotifiedAt: new Date(),
        autoTimedOut:     false,
        routingLog:       firebase.firestore.FieldValue.arrayUnion({
          at:  new Date(),
          msg: `✋ المدير عيّن يدوياً المزوّد "${v?.name || vendorId}" مباشرةً.`,
        }),
      });
      await fsAdd('order_routing', { orderId, kind: 'admin_manual_vendor', vendorId, uid: State.currentUser.uid, at: new Date() });
      _removeCard(orderId);
      if (typeof loadAllData === 'function') await loadAllData();
      _toast(`✅ تم تعيين "${v?.name || vendorId}" للطلب`, 'success');
    } catch (e) {
      console.error('[SOM] confirmManualVendor:', e);
      _toast('فشل التعيين', 'error');
    }
  };

  /* ── تعيين مندوب يدوي ────────────────────────────────────── */
  window.SOM_manualDriver = function (orderId) {
    const drivers = (AppData.users || []).filter(u => u.role === 'driver');
    if (!drivers.length) { _toast('لا يوجد مندوبون مسجّلون', 'error'); return; }

    openModal(`
      <div class="modal-header">
        <h2 class="modal-title">✋ تعيين مندوب يدوي</h2>
        <button class="modal-close" onclick="closeModal()">✕</button>
      </div>
      <div style="color:var(--text-secondary);font-size:13px;margin-bottom:14px;padding:0 4px">
        اختر مندوباً لتعيينه مباشرةً لهذا الطلب
      </div>
      <div style="max-height:360px;overflow-y:auto;border:1px solid var(--border);border-radius:12px">
        ${drivers.map(d => `
        <div onclick="SOM_confirmManualDriver('${orderId}','${d.id}')" style="display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid var(--border);cursor:pointer;transition:background 0.15s"
          onmouseover="this.style.background='var(--bg-secondary)'" onmouseout="this.style.background='transparent'">
          <div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,rgba(139,92,246,0.2),rgba(6,182,212,0.2));display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0">🚗</div>
          <div style="flex:1">
            <div style="font-weight:700;font-size:14px;color:var(--text-main)">${d.name || d.displayName || d.email}</div>
            <div style="font-size:11px;color:var(--text-secondary);margin-top:2px">${d.email || ''} · مندوب توصيل</div>
          </div>
          <span style="font-size:18px;color:var(--border)">›</span>
        </div>`).join('')}
      </div>
    `);
  };

  window.SOM_confirmManualDriver = async function (orderId, driverId) {
    closeModal();
    const d = (AppData.users || []).find(u => u.id === driverId);
    try {
      await db.collection('orders').doc(orderId).update({
        assignedDriverId: driverId,
        driverId:         driverId,
        driverPool:       [driverId],
        driverIdx:        0,
        driverAssignedAt: new Date(),
        status:           'provider_accepted',
        autoTimedOut:     false,
        routingLog:       firebase.firestore.FieldValue.arrayUnion({
          at:  new Date(),
          msg: `✋ المدير عيّن يدوياً المندوب "${d?.name || driverId}" مباشرةً.`,
        }),
      });
      await fsAdd('order_routing', { orderId, kind: 'admin_manual_driver', driverId, uid: State.currentUser.uid, at: new Date() });
      _removeCard(orderId);
      if (typeof loadAllData === 'function') await loadAllData();
      _toast(`✅ تم تعيين "${d?.name || driverId}" للتوصيل`, 'success');
    } catch (e) {
      console.error('[SOM] confirmManualDriver:', e);
      _toast('فشل التعيين', 'error');
    }
  };

  /* ── إلغاء طلب واحد ─────────────────────────────────────── */
  window.SOM_cancelOrder = function (orderId) {
    const o = (AppData.orders || []).find(x => x.id === orderId);
    const num = _orderNum(o || { id: orderId });

    openModal(`
      <div class="modal-header">
        <h2 class="modal-title">❌ إلغاء الطلب #${num}</h2>
        <button class="modal-close" onclick="closeModal()">✕</button>
      </div>
      <div style="padding:4px 0 20px;color:var(--text-secondary);font-size:14px;line-height:1.8">
        سيتم إلغاء هذا الطلب وإرسال إشعار تلقائي للعميل.<br>
        هذا الإجراء <strong style="color:#ef4444">لا يمكن التراجع عنه</strong>.
      </div>
      <div style="margin-bottom:14px">
        <label style="font-size:12px;font-weight:700;color:var(--text-secondary);display:block;margin-bottom:6px">سبب الإلغاء (للسجل):</label>
        <select id="som-cancel-reason" style="width:100%;padding:10px 12px;border-radius:10px;background:var(--bg-secondary);border:1.5px solid var(--border);color:var(--text-main);font-family:'Cairo',sans-serif;font-size:13px;outline:none">
          <option value="no_availability">عدم توفر مزوّدين / مندوبين</option>
          <option value="customer_request">طلب العميل</option>
          <option value="technical_issue">مشكلة تقنية</option>
          <option value="other">سبب آخر</option>
        </select>
      </div>
      <div style="display:flex;gap:10px">
        <button onclick="closeModal()" style="flex:1;padding:11px;border-radius:10px;border:1.5px solid var(--border);cursor:pointer;background:transparent;color:var(--text-secondary);font-family:'Cairo',sans-serif;font-size:13px;font-weight:700">تراجع</button>
        <button onclick="SOM_doCancel('${orderId}')" style="flex:2;padding:11px;border-radius:10px;border:none;cursor:pointer;background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;font-family:'Cairo',sans-serif;font-size:13px;font-weight:800">تأكيد الإلغاء</button>
      </div>
    `);
  };

  window.SOM_doCancel = async function (orderId) {
    const reason = document.getElementById('som-cancel-reason')?.value || 'no_availability';
    closeModal();
    const o = (AppData.orders || []).find(x => x.id === orderId);

    try {
      await db.collection('orders').doc(orderId).update({
        status:      'cancelled',
        cancelledAt: new Date(),
        cancelReason: reason,
        cancelledBy:  State?.currentUser?.uid || 'admin',
        routingLog:   firebase.firestore.FieldValue.arrayUnion({
          at:  new Date(),
          msg: `❌ ألغى المدير الطلب. السبب: ${reason}`,
        }),
      });

      // إشعار العميل
      try {
        const uid = o?.userId || o?.customerId;
        if (uid) {
          await db.collection('user_notifications').add({
            uid,
            title:     '❌ تم إلغاء طلبك',
            body:      'نأسف، تم إلغاء طلبك بسبب عدم توفر مزوّدين أو مندوبين متاحين. يرجى المحاولة لاحقاً أو التواصل مع الدعم.',
            type:      'error',
            orderId,
            read:      false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          });
        }
      } catch (_) {}

      await fsAdd('order_routing', { orderId, kind: 'admin_cancel', reason, uid: State.currentUser.uid, at: new Date() });
      _removeCard(orderId);
      if (typeof loadAllData === 'function') await loadAllData();
      _toast(`🗑 تم إلغاء الطلب #${_orderNum(o || { id: orderId })}`, 'success');
    } catch (e) {
      console.error('[SOM] doCancel:', e);
      _toast('فشل الإلغاء', 'error');
    }
  };

  /* ── إعادة توجيه الكل ───────────────────────────────────── */
  window.SOM_rerouteAll = async function () {
    const stalled = (AppData.orders || []).filter(o => o.status === 'no_providers' || o.status === 'no_drivers');
    if (!stalled.length) return;

    _toast(`⏳ جاري إعادة توجيه ${stalled.length} طلبات...`, 'info');
    let done = 0;
    for (const o of stalled) {
      try {
        if (o.status === 'no_providers')     await SOM_rerouteVendor(o.id);
        else if (o.status === 'no_drivers')  await SOM_rerouteDriver(o.id);
        done++;
      } catch (_) {}
    }
    if (typeof loadAllData === 'function') await loadAllData();
    if (typeof render === 'function') render();
    _toast(`✅ تم إعادة توجيه ${done} طلبات`, 'success');
  };

  /* ── إلغاء الكل ─────────────────────────────────────────── */
  window.SOM_cancelAll = function () {
    const stalled = (AppData.orders || []).filter(o => o.status === 'no_providers' || o.status === 'no_drivers');
    if (!stalled.length) return;

    openModal(`
      <div class="modal-header">
        <h2 class="modal-title">❌ إلغاء ${stalled.length} طلبات</h2>
        <button class="modal-close" onclick="closeModal()">✕</button>
      </div>
      <div style="padding:6px 0 20px;color:var(--text-secondary);font-size:14px;line-height:1.8">
        سيتم إلغاء جميع الطلبات المتوقفة (${stalled.length}) وإرسال إشعار لكل عميل.<br>
        هذا الإجراء <strong style="color:#ef4444">لا يمكن التراجع عنه</strong>.
      </div>
      <div style="display:flex;gap:10px">
        <button onclick="closeModal()" style="flex:1;padding:11px;border-radius:10px;border:1.5px solid var(--border);cursor:pointer;background:transparent;color:var(--text-secondary);font-family:'Cairo',sans-serif;font-size:13px;font-weight:700">تراجع</button>
        <button onclick="SOM_doMassCancel()" style="flex:2;padding:11px;border-radius:10px;border:none;cursor:pointer;background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;font-family:'Cairo',sans-serif;font-size:13px;font-weight:800">إلغاء الكل</button>
      </div>
    `);
  };

  window.SOM_doMassCancel = async function () {
    closeModal();
    const stalled = (AppData.orders || []).filter(o => o.status === 'no_providers' || o.status === 'no_drivers');
    let done = 0;
    for (const o of stalled) {
      try { await SOM_doCancel(o.id); done++; } catch (_) {}
    }
    _toast(`🗑 تم إلغاء ${done} طلبات`, 'success');
  };

  /* ── إزالة البطاقة من DOM ────────────────────────────────── */
  function _removeCard(orderId) {
    const card = document.getElementById(`som-card-${orderId}`);
    if (card) {
      card.style.transition = 'opacity 0.3s, transform 0.3s';
      card.style.opacity = '0';
      card.style.transform = 'translateX(20px)';
      setTimeout(() => card.remove(), 300);
    }
  }

  /* ── إشعار شريط الإدارة العلوي عند وجود طلبات متوقفة ─────── */
  function _checkAndBadge() {
    try {
      const count = (window.AppData?.orders || []).filter(o => o.status === 'no_providers' || o.status === 'no_drivers').length;
      window._SOM_stalledCount = count;
    } catch (_) {}
  }

  setInterval(_checkAndBadge, 15000);
  setTimeout(_checkAndBadge, 5000);

  console.log('[StalledOrders] شاشة الطلبات المتوقفة جاهزة 🚨');
})();
