// ═══════════════════════════════════════════════════════════════
//  محجوز — Platform Activity Log  |  سجل نشاط المنصة الشامل
//  يجمع جميع الأحداث من مصادر متعددة في جدول زمني موحد
//  للمدير والموظف فقط
// ═══════════════════════════════════════════════════════════════
(function () {
  'use strict';

  /* ══ الثوابت ══════════════════════════════════════════════ */
  const PAGE_SIZE  = 50;
  const LS_SEEN    = 'pal_seen_ts';

  /* ══ الحالة الداخلية ═══════════════════════════════════════ */
  let _items       = [];          // كل الأحداث المحمّلة
  let _filter      = 'all';       // 'all' | 'login' | 'order' | 'wallet' | 'user' | 'settings'
  let _dateFrom    = '';
  let _dateTo      = '';
  let _searchQ     = '';
  let _page        = 0;
  let _loading     = false;
  let _unsub       = null;        // Firestore listener
  let _newCount    = 0;           // أحداث جديدة منذ آخر فتح

  /* ══ تعريف أنواع الأحداث ═══════════════════════════════════ */
  const TYPE_META = {
    login:    { icon: '🔑', label: 'تسجيل دخول',   color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)'  },
    logout:   { icon: '🚪', label: 'تسجيل خروج',   color: '#94a3b8', bg: 'rgba(148,163,184,0.1)'  },
    order_new:{ icon: '📦', label: 'طلب جديد',      color: '#10b981', bg: 'rgba(16,185,129,0.12)'  },
    order_upd:{ icon: '🔄', label: 'تحديث طلب',     color: '#0ea5e9', bg: 'rgba(14,165,233,0.12)'  },
    order_done:{ icon:'✅', label: 'طلب مكتمل',     color: '#22c55e', bg: 'rgba(34,197,94,0.12)'   },
    order_cancel:{icon:'🚫',label: 'إلغاء طلب',     color: '#f43f5e', bg: 'rgba(244,63,94,0.12)'   },
    user_new: { icon: '👤', label: 'مستخدم جديد',   color: '#f59e0b', bg: 'rgba(245,158,11,0.12)'  },
    user_approved:{icon:'✅',label:'موافقة حساب',   color: '#10b981', bg: 'rgba(16,185,129,0.12)'  },
    user_suspended:{icon:'🔒',label:'تعليق حساب',  color: '#f43f5e', bg: 'rgba(244,63,94,0.12)'   },
    wallet:   { icon: '💰', label: 'عملية مالية',   color: '#f59e0b', bg: 'rgba(245,158,11,0.12)'  },
    profile:  { icon: '✏️', label: 'تعديل ملف',     color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
    password: { icon: '🔐', label: 'تغيير كلمة مرور',color:'#fb923c', bg: 'rgba(251,146,60,0.12)'  },
    settings: { icon: '⚙️', label: 'تغيير إعداد',   color: '#60a5fa', bg: 'rgba(96,165,250,0.12)'  },
    photo:    { icon: '📷', label: 'تغيير صورة',    color: '#c084fc', bg: 'rgba(192,132,252,0.12)' },
    other:    { icon: '📋', label: 'حدث آخر',       color: '#94a3b8', bg: 'rgba(148,163,184,0.1)'  },
  };

  const FILTER_GROUPS = {
    all:      { label: 'الكل', types: null },
    login:    { label: 'دخول / خروج', types: ['login','logout'] },
    order:    { label: 'الطلبات', types: ['order_new','order_upd','order_done','order_cancel'] },
    wallet:   { label: 'المالية', types: ['wallet'] },
    user:     { label: 'المستخدمون', types: ['user_new','user_approved','user_suspended'] },
    settings: { label: 'الإعدادات', types: ['profile','password','photo','settings'] },
  };

  /* ══ مساعد تحويل timestamp ══════════════════════════════════ */
  function _ts(raw) {
    if (!raw) return 0;
    if (raw?.toDate) return raw.toDate().getTime();
    if (raw?.seconds) return raw.seconds * 1000;
    return new Date(raw).getTime();
  }

  function _fmtTime(ms) {
    if (!ms) return '—';
    return new Date(ms).toLocaleTimeString('ar-SA', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  function _fmtDate(ms) {
    if (!ms) return '—';
    return new Date(ms).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  function _fmtRelative(ms) {
    if (!ms) return '';
    const diff = Math.round((Date.now() - ms) / 1000);
    if (diff < 60)    return `قبل ${diff} ث`;
    if (diff < 3600)  return `قبل ${Math.round(diff/60)} د`;
    if (diff < 86400) return `قبل ${Math.round(diff/3600)} س`;
    if (diff < 604800) return `قبل ${Math.round(diff/86400)} يوم`;
    return _fmtDate(ms);
  }

  function _esc(s) {
    return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  /* ══ تصنيف نوع حدث account_activity ════════════════════════ */
  function _kindToType(kind, summary) {
    const k = (kind||'').toLowerCase();
    const s = (summary||'').toLowerCase();
    if (k === 'login')                   return 'login';
    if (k === 'logout')                  return 'logout';
    if (k === 'photo_upload')            return 'photo';
    if (k === 'photo_remove')            return 'photo';
    if (k === 'password_change')         return 'password';
    if (k === 'profile_update')          return 'profile';
    if (k === 'lang_change')             return 'settings';
    if (k === '2fa_toggle')              return 'settings';
    if (k === 'theme_toggle')            return 'settings';
    if (s.includes('محفظة') || s.includes('رصيد') || s.includes('إيداع')) return 'wallet';
    return 'other';
  }

  /* ══ تحميل account_activity من Firestore ════════════════════ */
  async function _loadAccountActivity() {
    try {
      const snap = await db.collection('account_activity')
        .orderBy('createdAt', 'desc')
        .limit(200)
        .get();
      return snap.docs.map(d => {
        const data = d.data();
        const ms   = _ts(data.createdAt);
        const type = _kindToType(data.kind, data.summary);
        const meta = TYPE_META[type] || TYPE_META.other;
        const u    = (AppData?.users||[]).find(u => u.uid === data.uid);
        return {
          id:     'd_' + d.id,
          source: 'account',
          type,
          ts:     ms,
          icon:   meta.icon,
          color:  meta.color,
          bg:     meta.bg,
          title:  data.summary || meta.label,
          user:   u?.name || data.name || 'مستخدم',
          role:   u?.role || '—',
          device: data.device || '',
          extra:  {},
        };
      });
    } catch(e) { console.warn('[PAL] account_activity:', e.code); return []; }
  }

  /* ══ تحميل wallet_audit_log من Firestore ════════════════════ */
  async function _loadWalletAudit() {
    try {
      const snap = await db.collection('wallet_audit_log')
        .orderBy('timestamp', 'desc')
        .limit(100)
        .get();
      return snap.docs.map(d => {
        const data = d.data();
        const ms   = _ts(data.timestamp);
        return {
          id:     'w_' + d.id,
          source: 'wallet',
          type:   'wallet',
          ts:     ms,
          icon:   TYPE_META.wallet.icon,
          color:  TYPE_META.wallet.color,
          bg:     TYPE_META.wallet.bg,
          title:  _walletActionLabel(data.action) + (data.amount ? ` — ${data.amount.toLocaleString('ar-YE')} ر.ي` : ''),
          user:   data.adminName || 'مدير',
          role:   data.adminRole || 'admin',
          device: '',
          extra:  { target: data.targetName || '', note: data.note || '', before: data.balanceBefore, after: data.balanceAfter },
        };
      });
    } catch(e) { console.warn('[PAL] wallet_audit_log:', e.code); return []; }
  }

  function _walletActionLabel(action) {
    const m = {
      adjust_add: 'إضافة رصيد',
      adjust_sub: 'خصم رصيد',
      reset:      'إعادة تعيين رصيد',
      purchase_confirm: 'تأكيد شراء',
      purchase_reject:  'رفض شراء',
      flag:       'وضع علامة تدقيق',
      unflag:     'رفع علامة تدقيق',
    };
    return m[action] || action || 'عملية مالية';
  }

  /* ══ بناء أحداث الطلبات من AppData ════════════════════════ */
  function _buildOrderEvents() {
    const orders = AppData?.orders || [];
    const events = [];
    const statusMeta = {
      pending:         { type: 'order_new',    label: 'طلب جديد يتانتظر المراجعة' },
      pending_admin:   { type: 'order_new',    label: 'طلب جديد — انتظار إدارة' },
      pending_provider:{ type: 'order_upd',    label: 'طلب بانتظار المزوّد' },
      accepted:        { type: 'order_upd',    label: 'تم قبول الطلب' },
      in_progress:     { type: 'order_upd',    label: 'الطلب قيد التنفيذ' },
      completed:       { type: 'order_done',   label: 'اكتمل الطلب' },
      cancelled:       { type: 'order_cancel', label: 'تم إلغاء الطلب' },
      rejected:        { type: 'order_cancel', label: 'رُفض الطلب' },
      no_providers:    { type: 'order_cancel', label: 'لا يوجد مزوّدون متاحون' },
      no_drivers:      { type: 'order_cancel', label: 'لا يوجد مندوبون متاحون' },
    };
    orders.slice(-150).forEach(o => {
      const createdMs = _ts(o.createdAt);
      const sm        = statusMeta[o.status] || statusMeta.pending;
      const meta      = TYPE_META[sm.type] || TYPE_META.order_new;
      if (createdMs) {
        events.push({
          id:     'o_' + o.id,
          source: 'order',
          type:   sm.type,
          ts:     createdMs,
          icon:   meta.icon,
          color:  meta.color,
          bg:     meta.bg,
          title:  sm.label + (o.orderId ? ` #${o.orderId}` : ''),
          user:   o.userName || o.customerName || '—',
          role:   'customer',
          device: '',
          extra:  { status: o.status, total: o.total, type: o.type, provider: o.providerName || '' },
        });
      }
    });
    return events;
  }

  /* ══ بناء أحداث المستخدمين من AppData ═════════════════════ */
  function _buildUserEvents() {
    const users  = AppData?.users || [];
    const events = [];
    users.slice(-100).forEach(u => {
      const ms = _ts(u.createdAt);
      if (!ms) return;
      events.push({
        id:     'u_' + u.uid,
        source: 'user',
        type:   u.status === 'pending' ? 'user_new' : u.status === 'suspended' ? 'user_suspended' : 'user_new',
        ts:     ms,
        icon:   u.status === 'suspended' ? '🔒' : '👤',
        color:  u.status === 'suspended' ? TYPE_META.user_suspended.color : TYPE_META.user_new.color,
        bg:     u.status === 'suspended' ? TYPE_META.user_suspended.bg    : TYPE_META.user_new.bg,
        title:  u.status === 'suspended' ? `حساب موقوف — ${u.name || ''}` : `تسجيل مستخدم جديد — ${u.name || ''}`,
        user:   u.name || u.email || '—',
        role:   u.role || '—',
        device: '',
        extra:  { email: u.email || '', phone: u.phone || '', status: u.status || '' },
      });
    });
    return events;
  }

  /* ══ تحميل كل البيانات ═════════════════════════════════════ */
  async function _loadAll() {
    if (_loading) return;
    _loading = true;
    _setLoadingState(true);
    try {
      const [accountEvts, walletEvts] = await Promise.all([
        _loadAccountActivity(),
        _loadWalletAudit(),
      ]);
      const orderEvts = _buildOrderEvents();
      const userEvts  = _buildUserEvents();
      _items = [...accountEvts, ...walletEvts, ...orderEvts, ...userEvts]
        .sort((a, b) => b.ts - a.ts);
      _updateNewCount();
      _render();
    } catch(e) {
      console.error('[PAL] فشل التحميل:', e);
    } finally {
      _loading = false;
      _setLoadingState(false);
    }
  }

  /* ══ الاستماع الحي عبر Firestore ════════════════════════════ */
  function _startLiveListener() {
    if (_unsub) { _unsub(); _unsub = null; }
    try {
      _unsub = db.collection('account_activity')
        .orderBy('createdAt', 'desc')
        .limit(1)
        .onSnapshot(snap => {
          if (!snap.empty) {
            // فقط نُضيف الإدخال الجديد بدون إعادة تحميل كل شيء
            const d = snap.docs[0];
            const data = d.data();
            const ms   = _ts(data.createdAt);
            const type = _kindToType(data.kind, data.summary);
            const meta = TYPE_META[type] || TYPE_META.other;
            const u    = (AppData?.users||[]).find(u => u.uid === data.uid);
            const newItem = {
              id: 'd_' + d.id, source: 'account', type, ts: ms,
              icon: meta.icon, color: meta.color, bg: meta.bg,
              title: data.summary || meta.label,
              user: u?.name || 'مستخدم', role: u?.role || '—',
              device: data.device || '', extra: {},
            };
            // نتجنب التكرار
            if (!_items.find(i => i.id === newItem.id)) {
              _items.unshift(newItem);
              _newCount++;
              _showNewBanner();
              _updateBellNotif();
            }
          }
        }, () => {});
    } catch(e) {}
  }

  /* ══ بادج الجرس ══════════════════════════════════════════════ */
  function _updateNewCount() {
    const lastSeen = parseInt(localStorage.getItem(LS_SEEN) || '0', 10);
    _newCount = _items.filter(i => i.ts > lastSeen).length;
    _updateBellNotif();
  }

  function _updateBellNotif() {
    if (typeof window.__unifiedNotif === 'undefined') return;
    const role = (typeof State !== 'undefined' ? State : null)?.currentUser?.role;
    if (role !== 'admin' && role !== 'staff') return;
    const recent = _items.slice(0, 20);
    const bellItems = recent.map(i => ({
      icon:   i.icon,
      title:  i.title,
      sub:    `${i.user} • ${_fmtRelative(i.ts)}`,
      time:   _fmtRelative(i.ts),
      nav:    'admin',
      unread: i.ts > parseInt(localStorage.getItem(LS_SEEN)||'0',10),
    }));
    window.__unifiedNotif.update('activity', bellItems, _newCount > 0 ? _newCount : 0);
  }

  /* ══ الفلترة ══════════════════════════════════════════════════ */
  function _filtered() {
    const group = FILTER_GROUPS[_filter] || FILTER_GROUPS.all;
    return _items.filter(i => {
      if (group.types && !group.types.includes(i.type)) return false;
      if (_dateFrom) {
        const from = new Date(_dateFrom).setHours(0,0,0,0);
        if (i.ts < from) return false;
      }
      if (_dateTo) {
        const to = new Date(_dateTo).setHours(23,59,59,999);
        if (i.ts > to) return false;
      }
      if (_searchQ) {
        const q = _searchQ.toLowerCase();
        if (!i.title.toLowerCase().includes(q) &&
            !i.user.toLowerCase().includes(q)  &&
            !i.role.toLowerCase().includes(q))  return false;
      }
      return true;
    });
  }

  /* ══ تجميع بالتاريخ ══════════════════════════════════════════ */
  function _groupByDate(items) {
    const groups = {};
    items.forEach(i => {
      const day = new Date(i.ts).toLocaleDateString('ar-SA', { year:'numeric',month:'long',day:'numeric' });
      if (!groups[day]) groups[day] = { day, ts: i.ts, items: [] };
      groups[day].items.push(i);
    });
    return Object.values(groups).sort((a,b) => b.ts - a.ts);
  }

  /* ══ بناء HTML لكل حدث ═══════════════════════════════════════ */
  function _itemHTML(item) {
    const meta    = TYPE_META[item.type] || TYPE_META.other;
    const roleMap = { admin:'مدير', staff:'موظف', vendor:'مزوّد', provider:'مزوّد', driver:'مندوب', customer:'عميل', guest:'زائر' };
    const roleLabel = roleMap[item.role] || item.role || '—';

    let extraHTML = '';
    if (item.extra && Object.keys(item.extra).length) {
      const pairs = [];
      if (item.extra.target)   pairs.push(`<span class="pal-tag">🎯 ${_esc(item.extra.target)}</span>`);
      if (item.extra.note)     pairs.push(`<span class="pal-tag">📝 ${_esc(item.extra.note)}</span>`);
      if (item.extra.total)    pairs.push(`<span class="pal-tag">💵 ${Number(item.extra.total).toLocaleString('ar-YE')} ر.ي</span>`);
      if (item.extra.provider) pairs.push(`<span class="pal-tag">🏪 ${_esc(item.extra.provider)}</span>`);
      if (item.extra.email)    pairs.push(`<span class="pal-tag">📧 ${_esc(item.extra.email)}</span>`);
      if (item.extra.phone)    pairs.push(`<span class="pal-tag">📞 ${_esc(item.extra.phone)}</span>`);
      if (item.extra.before != null && item.extra.after != null)
        pairs.push(`<span class="pal-tag">💰 ${Number(item.extra.before).toLocaleString()} ← ${Number(item.extra.after).toLocaleString()}</span>`);
      if (pairs.length) extraHTML = `<div class="pal-item-extra">${pairs.join('')}</div>`;
    }

    return `
    <div class="pal-item" style="--pal-color:${item.color};--pal-bg:${item.bg}">
      <div class="pal-item-dot" style="background:${item.color}">${item.icon}</div>
      <div class="pal-item-body">
        <div class="pal-item-top">
          <span class="pal-item-title">${_esc(item.title)}</span>
          <span class="pal-item-time" title="${_fmtDate(item.ts)} ${_fmtTime(item.ts)}">${_fmtRelative(item.ts)}</span>
        </div>
        <div class="pal-item-meta">
          <span class="pal-item-user">👤 ${_esc(item.user)}</span>
          <span class="pal-item-badge" style="background:${item.bg};color:${item.color}">${meta.label}</span>
          ${roleLabel !== '—' ? `<span class="pal-item-role">${roleLabel}</span>` : ''}
          ${item.device ? `<span class="pal-item-device">🖥 ${_esc(item.device)}</span>` : ''}
          <span class="pal-item-clock">🕐 ${_fmtTime(item.ts)}</span>
        </div>
        ${extraHTML}
      </div>
    </div>`;
  }

  /* ══ الرسم الرئيسي ════════════════════════════════════════════ */
  function _render() {
    const host = document.getElementById('pal-content-host');
    if (!host) return;

    const filtered   = _filtered();
    const paginated  = filtered.slice(0, (_page + 1) * PAGE_SIZE);
    const hasMore    = filtered.length > paginated.length;
    const grouped    = _groupByDate(paginated);

    if (!filtered.length) {
      host.innerHTML = `<div class="pal-empty"><div class="pal-empty-icon">📋</div><div>لا توجد أحداث بهذا التصنيف</div></div>`;
      return;
    }

    const timelineHTML = grouped.map(g => `
      <div class="pal-day-group">
        <div class="pal-day-label">
          <span class="pal-day-line"></span>
          <span class="pal-day-text">${g.day}</span>
          <span class="pal-day-count">${g.items.length} حدث</span>
          <span class="pal-day-line"></span>
        </div>
        <div class="pal-day-items">
          ${g.items.map(_itemHTML).join('')}
        </div>
      </div>`).join('');

    const loadMoreBtn = hasMore
      ? `<div class="pal-load-more-wrap"><button class="pal-load-more-btn" onclick="palLoadMore()">تحميل المزيد (${filtered.length - paginated.length} متبقي)</button></div>`
      : '';

    host.innerHTML = timelineHTML + loadMoreBtn;

    // تحديث عداد النتائج
    const counter = document.getElementById('pal-results-count');
    if (counter) counter.textContent = filtered.length;
  }

  /* ══ حالة التحميل ═══════════════════════════════════════════ */
  function _setLoadingState(on) {
    const host = document.getElementById('pal-content-host');
    if (!host) return;
    if (on) host.innerHTML = `
      <div class="pal-loading">
        <div class="pal-spinner"></div>
        <div>جاري تحميل السجل…</div>
      </div>`;
  }

  /* ══ بانر الأحداث الجديدة ════════════════════════════════════ */
  function _showNewBanner() {
    const banner = document.getElementById('pal-new-banner');
    if (!banner) return;
    banner.textContent = `🔔 حدث ${_newCount} جديد — اضغط للتحديث`;
    banner.style.display = 'flex';
    banner.onclick = () => { banner.style.display='none'; _page=0; _render(); };
  }

  /* ══ الواجهة الكاملة ══════════════════════════════════════════ */
  window.renderAdminPlatformActivity = function () {
    // تحميل البيانات (أول مرة أو عند الفتح)
    setTimeout(() => {
      _loadAll();
      _startLiveListener();
      // إعادة ضبط القيم في الـ inputs
      const fi = document.getElementById('pal-filter-from');
      const ti = document.getElementById('pal-filter-to');
      const si = document.getElementById('pal-search');
      if (fi) fi.value = _dateFrom;
      if (ti) ti.value = _dateTo;
      if (si) si.value = _searchQ;
    }, 50);

    const now  = Date.now();
    const total = _items.length;
    const todayCount  = _items.filter(i => i.ts > new Date().setHours(0,0,0,0)).length;
    const weekCount   = _items.filter(i => i.ts > now - 7*86400*1000).length;

    const filterBtns = Object.entries(FILTER_GROUPS).map(([k, g]) => {
      const cnt = k === 'all' ? total : _items.filter(i => (g.types||[]).includes(i.type)).length;
      return `<button class="pal-filter-btn${_filter===k?' pal-filter-active':''}" onclick="palSetFilter('${k}')">
        ${g.label}<span class="pal-filter-count">${cnt}</span>
      </button>`;
    }).join('');

    return `
    <div class="pal-wrap">

      <!-- الرأس -->
      <div class="pal-header">
        <div class="pal-title-block">
          <div class="pal-title-icon">📋</div>
          <div>
            <h2>سجل نشاط المنصة</h2>
            <p>سجل زمني شامل لجميع الأحداث والإجراءات</p>
          </div>
        </div>
        <div class="pal-header-actions">
          <button class="pal-btn-refresh" onclick="palRefresh()">🔄 تحديث</button>
          <button class="pal-btn-export"  onclick="palExport()">📥 تصدير CSV</button>
        </div>
      </div>

      <!-- بطاقات الملخص -->
      <div class="pal-summary">
        <div class="pal-sum-card">
          <div class="pal-sum-val">${total}</div>
          <div class="pal-sum-lbl">إجمالي الأحداث</div>
        </div>
        <div class="pal-sum-card pal-sum-today">
          <div class="pal-sum-val">${todayCount}</div>
          <div class="pal-sum-lbl">اليوم</div>
        </div>
        <div class="pal-sum-card pal-sum-week">
          <div class="pal-sum-val">${weekCount}</div>
          <div class="pal-sum-lbl">هذا الأسبوع</div>
        </div>
        <div class="pal-sum-card pal-sum-live">
          <div class="pal-sum-val pal-live-dot-val">●</div>
          <div class="pal-sum-lbl">مراقبة مباشرة</div>
        </div>
      </div>

      <!-- بانر الأحداث الجديدة -->
      <div id="pal-new-banner" class="pal-new-banner" style="display:none"></div>

      <!-- شريط الفلتر -->
      <div class="pal-toolbar">
        <div class="pal-filter-row">${filterBtns}</div>
        <div class="pal-controls-row">
          <input id="pal-search"      class="pal-input" type="text"  placeholder="🔍 بحث باسم المستخدم أو الحدث…" oninput="palSearch(this.value)">
          <input id="pal-filter-from" class="pal-input pal-date" type="date" placeholder="من تاريخ" onchange="palDateFrom(this.value)">
          <input id="pal-filter-to"   class="pal-input pal-date" type="date" placeholder="إلى تاريخ" onchange="palDateTo(this.value)">
          <button class="pal-btn-clear-filters" onclick="palClearFilters()">✕ مسح الفلاتر</button>
        </div>
      </div>

      <!-- عداد النتائج -->
      <div class="pal-results-bar">
        <span>النتائج: <strong id="pal-results-count">${_filtered().length}</strong></span>
        <span class="pal-live-indicator">● مباشر</span>
      </div>

      <!-- الجدول الزمني -->
      <div id="pal-content-host" class="pal-content-host">
        <div class="pal-loading"><div class="pal-spinner"></div><div>جاري التحميل…</div></div>
      </div>

    </div>`;
  };

  /* ══ دوال التفاعل (global) ════════════════════════════════════ */
  window.palSetFilter = function(f) {
    _filter = f;
    _page   = 0;
    _refreshFilterBtns();
    _render();
  };

  window.palSearch = function(q) {
    _searchQ = q.trim();
    _page    = 0;
    _render();
  };

  window.palDateFrom = function(v) { _dateFrom = v; _page = 0; _render(); };
  window.palDateTo   = function(v) { _dateTo   = v; _page = 0; _render(); };

  window.palClearFilters = function() {
    _filter = 'all'; _searchQ = ''; _dateFrom = ''; _dateTo = ''; _page = 0;
    const fi = document.getElementById('pal-filter-from');
    const ti = document.getElementById('pal-filter-to');
    const si = document.getElementById('pal-search');
    if (fi) fi.value = '';
    if (ti) ti.value = '';
    if (si) si.value = '';
    _refreshFilterBtns();
    _render();
  };

  window.palLoadMore = function() { _page++; _render(); };

  window.palRefresh = function() {
    _page = 0;
    localStorage.setItem(LS_SEEN, Date.now());
    _newCount = 0;
    const banner = document.getElementById('pal-new-banner');
    if (banner) banner.style.display = 'none';
    _loadAll();
  };

  window.palExport = function() {
    const filtered = _filtered();
    if (!filtered.length) { window.toast?.('لا يوجد سجل للتصدير', 'info'); return; }
    const rows = [['الحدث','المستخدم','الدور','الجهاز','التاريخ','الوقت','النوع']];
    filtered.forEach(i => {
      rows.push([
        i.title, i.user, i.role, i.device,
        _fmtDate(i.ts), _fmtTime(i.ts), i.type,
      ]);
    });
    const csv  = rows.map(r => r.map(c => `"${String(c||'').replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `mahjooz-activity-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
    window.toast?.('📥 تم تصدير السجل بنجاح', 'success');
  };

  function _refreshFilterBtns() {
    document.querySelectorAll('.pal-filter-btn').forEach(btn => {
      const f = btn.getAttribute('onclick')?.match(/'(\w+)'/)?.[1];
      btn.classList.toggle('pal-filter-active', f === _filter);
    });
  }

  /* ══ تنظيف عند مغادرة الصفحة ════════════════════════════════ */
  window.palDestroy = function() {
    if (_unsub) { _unsub(); _unsub = null; }
    localStorage.setItem(LS_SEEN, Date.now());
  };

  console.log('[PlatformActivity] سجل نشاط المنصة جاهز 📋');
})();
