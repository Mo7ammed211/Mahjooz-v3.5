/* ═══════════════════════════════════════════════════════════════
   محجوز — Unified Notification Bell  جرس الإشعارات الموحد
   Replaces: ph19-pill · notif-bell-wrap · da-bell
   Each source calls: window.__unifiedNotif.update(sourceId, items, count)
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── Source definitions ─────────────────────────────────────── */
  const SOURCES = {
    live:   { label: '🛎️ تنبيهات حيّة',  color: '#7c3aed', items: [], count: 0 },
    notif:  { label: '📨 إشعاراتي',       color: '#0ea5e9', items: [], count: 0 },
    driver: { label: '🚚 طلبات التوصيل', color: '#0d9488', items: [], count: 0 },
    wallet: { label: '💰 تنبيهات مالية', color: '#f59e0b', items: [], count: 0 },
    vendor: { label: '🏪 طلباتي',         color: '#10b981', items: [], count: 0 },
    errors:   { label: '🚨 أخطاء تقنية',   color: '#ef4444', items: [], count: 0 },
    activity: { label: '📋 نشاط المنصة',  color: '#a78bfa', items: [], count: 0 },
  };

  const SOURCE_META = {
    live:     { label: 'حيّة',         icon: '🛎️' },
    notif:    { label: 'إشعاراتي',     icon: '📨' },
    driver:   { label: 'توصيل',        icon: '🚚' },
    wallet:   { label: 'مالية',        icon: '💰' },
    vendor:   { label: 'طلباتي',       icon: '🏪' },
    errors:   { label: 'أخطاء',        icon: '🚨' },
    activity: { label: 'نشاط المنصة',  icon: '📋' },
  };

  /* ── Role → relevant sources ───────────────────────────────── */
  const ROLE_SOURCES = {
    admin:    ['live', 'notif', 'driver', 'wallet', 'errors', 'activity'],
    staff:    ['live', 'notif', 'wallet', 'errors', 'activity'],
    vendor:   ['vendor', 'notif'],
    provider: ['vendor', 'notif'],
    driver:   ['driver', 'notif'],
    customer: ['notif'],
  };

  function _getRoleSources() {
    const role = (typeof State !== 'undefined' ? State : null)?.currentUser?.role || 'customer';
    return ROLE_SOURCES[role] || ['notif'];
  }

  let _activeFilter = 'all';

  /* ── Public API ─────────────────────────────────────────────── */
  window.__unifiedNotif = {
    update(sourceId, items, count) {
      if (!SOURCES[sourceId]) return;
      SOURCES[sourceId].items = items || [];
      SOURCES[sourceId].count = Math.max(0, count || 0);
      _updateBadge();
      _refreshPanelIfOpen();
    },
  };

  /* ── Filter API (global) ────────────────────────────────────── */
  window.setUBFilter = function (filterId) {
    const allowed = _getRoleSources();
    if (filterId !== 'all' && !allowed.includes(filterId)) return;
    _activeFilter = filterId;
    _renderPanel();
  };

  /* ── Badge ──────────────────────────────────────────────────── */
  function _relevantCount() {
    return _getRoleSources().reduce((a, id) => a + (SOURCES[id].count || 0), 0);
  }

  function _updateBadge() {
    const badge = document.getElementById('unified-bell-badge');
    if (!badge) return;
    const total = _relevantCount();
    badge.textContent = total > 99 ? '99+' : String(total);
    badge.style.display = total > 0 ? 'inline-flex' : 'none';
  }

  function _refreshPanelIfOpen() {
    const panel = document.getElementById('unified-bell-panel');
    if (panel && panel.classList.contains('ub-open')) _renderPanel();
  }

  /* ── Item Renderers ─────────────────────────────────────────── */
  function _esc(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  }

  function _renderItemLive(item) {
    const nav = _esc(item.nav || '');
    return `<div class="ub-item" ${nav ? `onclick="navigate('${nav}');toggleUnifiedNotif()"` : ''}>
      <span class="ub-item-icon">${item.icon || '📋'}</span>
      <div class="ub-item-body">
        <div class="ub-item-title">${_esc(item.title)}</div>
        ${item.sub ? `<div class="ub-item-sub">${_esc(item.sub)}</div>` : ''}
        <div class="ub-item-time">${_esc(item.time || '')}</div>
      </div>
    </div>`;
  }

  function _renderItemNotif(item) {
    const link = item.link ? `'${_esc(item.link)}'` : 'null';
    return `<div class="ub-item ${item.read ? '' : 'ub-unread'}"
        onclick="onNotifClick('${_esc(item.id)}',${link});toggleUnifiedNotif()">
      <span class="ub-item-icon">🔔</span>
      <div class="ub-item-body">
        <div class="ub-item-title">${_esc(item.title || '')}</div>
        ${item.body ? `<div class="ub-item-sub">${_esc(item.body)}</div>` : ''}
        <div class="ub-item-time">${typeof fmtDate === 'function' ? fmtDate(item.createdAt) : ''}</div>
      </div>
    </div>`;
  }

  function _renderItemDriver(item) {
    return `<div class="ub-item">
      <span class="ub-item-icon">${item.icon || '🚚'}</span>
      <div class="ub-item-body">
        <div class="ub-item-title">${_esc(item.title)}</div>
        ${item.sub ? `<div class="ub-item-sub">${_esc(item.sub)}</div>` : ''}
        <div class="ub-item-time">${_esc(item.time || '')}</div>
      </div>
    </div>`;
  }

  function _renderItemVendor(item) {
    const nav = _esc(item.nav || 'vendor');
    return `<div class="ub-item" onclick="navigate('${nav}');toggleUnifiedNotif()">
      <span class="ub-item-icon">${item.icon || '🏪'}</span>
      <div class="ub-item-body">
        <div class="ub-item-title">${_esc(item.title)}</div>
        ${item.sub ? `<div class="ub-item-sub">${_esc(item.sub)}</div>` : ''}
        <div class="ub-item-time">${_esc(item.time || '')}</div>
      </div>
    </div>`;
  }

  function _renderItemWallet(item) {
    const nav = _esc(item.nav || '');
    return `<div class="ub-item ${item.unread ? 'ub-unread' : ''}"
        ${nav ? `onclick="navigate('${nav}');toggleUnifiedNotif()"` : ''}>
      <span class="ub-item-icon">${item.icon || '💰'}</span>
      <div class="ub-item-body">
        <div class="ub-item-title">${_esc(item.title)}</div>
        ${item.sub ? `<div class="ub-item-sub">${_esc(item.sub)}</div>` : ''}
        <div class="ub-item-time">${_esc(item.time || '')}</div>
      </div>
      ${item.unread ? '<div class="ub-unread-dot" style="width:8px;height:8px;border-radius:50%;background:#f59e0b;flex-shrink:0;margin-top:4px;"></div>' : ''}
    </div>`;
  }

  /* ── Filter Tabs ─────────────────────────────────────────────── */
  function _renderFilterTabs(roleSources) {
    if (roleSources.length <= 1) return '';

    const tabs = [{ id: 'all', label: 'الكل', icon: '🔔' }, ...roleSources.map(id => ({
      id, label: SOURCE_META[id].label, icon: SOURCE_META[id].icon,
    }))];

    return `<div class="ub-filters">
      ${tabs.map(t => {
        const count = t.id === 'all'
          ? roleSources.reduce((a, id) => a + (SOURCES[id].count || 0), 0)
          : (SOURCES[t.id]?.count || 0);
        const isActive = _activeFilter === t.id;
        return `<button
          class="ub-filter-tab${isActive ? ' ub-filter-active' : ''}"
          onclick="setUBFilter('${t.id}')">
          <span class="ub-tab-icon">${t.icon}</span>
          <span class="ub-tab-label">${t.label}</span>
          ${count > 0 ? `<span class="ub-tab-count">${count > 99 ? '99+' : count}</span>` : ''}
        </button>`;
      }).join('')}
    </div>`;
  }

  /* ── Panel Rendering ─────────────────────────────────────────── */
  function _renderPanel() {
    const panel = document.getElementById('unified-bell-panel');
    if (!panel) return;

    const roleSources = _getRoleSources();

    const sourcesToShow = _activeFilter === 'all'
      ? roleSources.filter(id => SOURCES[id].items.length > 0)
      : (roleSources.includes(_activeFilter) && SOURCES[_activeFilter]?.items.length > 0
          ? [_activeFilter] : []);

    const hasUnreadNotif = roleSources.includes('notif')
      && (_activeFilter === 'all' || _activeFilter === 'notif')
      && (SOURCES.notif.items || []).some(n => !n.read);

    let body = '';
    if (sourcesToShow.length === 0) {
      body = `<div class="ub-empty">
        <div style="font-size:36px;margin-bottom:10px;">🔕</div>
        لا توجد إشعارات جديدة
      </div>`;
    } else {
      const showSectionTitle = sourcesToShow.length > 1;
      body = `<div class="ub-body">${sourcesToShow.map(id => {
        const src = SOURCES[id];
        return `<div class="ub-section">
          ${showSectionTitle
            ? `<div class="ub-section-title" style="color:${src.color}">${src.label}</div>`
            : ''}
          ${src.items.slice(0, 10).map(item =>
            id === 'live'   ? _renderItemLive(item)   :
            id === 'notif'  ? _renderItemNotif(item)  :
            id === 'wallet' ? _renderItemWallet(item) :
            id === 'vendor' ? _renderItemVendor(item) :
                              _renderItemDriver(item)
          ).join('')}
          ${src.items.length > 10
            ? `<div class="ub-more">+ ${src.items.length - 10} إشعار آخر</div>` : ''}
        </div>`;
      }).join('')}</div>`;
    }

    const hasUnreadWallet = roleSources.includes('wallet')
      && (_activeFilter === 'all' || _activeFilter === 'wallet')
      && (SOURCES.wallet.items || []).some(i => i.unread);

    const markAllBtn = hasUnreadNotif
      ? `<button class="ub-mark-all" onclick="markAllNotifsRead?.()">تحديد الكل كمقروء</button>`
      : hasUnreadWallet
        ? `<button class="ub-mark-all" onclick="wsecMarkAllAlerts?.()">تحديد الكل كمقروء</button>`
        : '';

    panel.innerHTML = `
      <div class="ub-header">
        <span>🔔 الإشعارات</span>
        <div style="display:flex;align-items:center;gap:8px;">
          ${markAllBtn}
          <button class="ub-close" onclick="toggleUnifiedNotif()">✕</button>
        </div>
      </div>
      ${_renderFilterTabs(roleSources)}
      ${body}
      <div class="ub-footer">
        <button class="ub-footer-btn" onclick="toggleUnifiedNotif();navigate('notifications')">
          📋 مركز الإشعارات الكامل
          <span style="font-size:10px;opacity:.7">تاريخ · بحث · فلترة</span>
        </button>
      </div>`;
  }

  /* ── Bell Injection ─────────────────────────────────────────── */
  function _ensureBell() {
    if (document.getElementById('unified-bell-wrap')) return;
    const target = document.getElementById('nav-notif-target');
    if (!target) return;

    const wrap = document.createElement('div');
    wrap.id = 'unified-bell-wrap';
    wrap.innerHTML = `
      <button id="unified-bell-btn" onclick="toggleUnifiedNotif(event)" title="الإشعارات">
        🔔
        <span id="unified-bell-badge" style="display:none;"></span>
      </button>
      <div id="unified-bell-panel" class="ub-panel"></div>`;
    target.appendChild(wrap);
    _updateBadge();

    document.addEventListener('click', e => {
      const w = document.getElementById('unified-bell-wrap');
      const p = document.getElementById('unified-bell-panel');
      if (w && p && !w.contains(e.target)) p.classList.remove('ub-open');
    });
  }

  /* ── Toggle (global) ────────────────────────────────────────── */
  window.toggleUnifiedNotif = function (event) {
    if (event && event.stopPropagation) event.stopPropagation();
    const panel = document.getElementById('unified-bell-panel');
    if (!panel) return;
    const opening = !panel.classList.contains('ub-open');
    panel.classList.toggle('ub-open');
    if (opening) {
      _activeFilter = 'all';
      _renderPanel();
      _getRoleSources().forEach(id => { SOURCES[id].count = 0; });
      _updateBadge();
    }
  };

  /* ── Hook into render() ─────────────────────────────────────── */
  const _orig = window.render;
  window.render = async function (...args) {
    const result = typeof _orig === 'function' ? await _orig.apply(this, args) : undefined;
    setTimeout(_ensureBell, 80);
    return result;
  };

  document.addEventListener('DOMContentLoaded', () => setTimeout(_ensureBell, 600));

  /* ── Styles ─────────────────────────────────────────────────── */
  const style = document.createElement('style');
  style.id = 'unified-bell-css';
  style.textContent = `
    #unified-bell-wrap {
      position: relative; display: inline-flex; align-items: center;
    }
    #unified-bell-btn {
      width: 38px; height: 38px; border-radius: 50%;
      background: var(--glass-bg, rgba(255,255,255,0.08));
      border: 1.5px solid var(--border, rgba(255,255,255,0.12));
      color: var(--text-main, #f1f5f9); font-size: 18px; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      position: relative; transition: background 0.2s;
      font-family: sans-serif;
    }
    #unified-bell-btn:hover {
      background: var(--bg-secondary, rgba(255,255,255,0.15));
    }
    #unified-bell-badge {
      position: absolute; top: -4px; right: -4px;
      background: #ef4444; color: #fff; border-radius: 99px;
      font-size: 10px; font-weight: 900;
      min-width: 17px; height: 17px;
      align-items: center; justify-content: center;
      padding: 0 3px; font-family: 'Cairo', sans-serif;
      line-height: 1; pointer-events: none;
    }
    .ub-panel {
      display: none; flex-direction: column;
      position: absolute; top: calc(100% + 10px); inset-inline-end: 0;
      width: 340px; max-height: 520px; overflow: hidden;
      background: var(--bg-card, #1e293b);
      border: 1.5px solid var(--border, rgba(255,255,255,0.1));
      border-radius: 16px;
      box-shadow: 0 16px 48px rgba(0,0,0,0.35);
      z-index: 9999; font-family: 'Cairo', sans-serif; direction: rtl;
    }
    .ub-panel.ub-open { display: flex; }
    .ub-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 13px 15px 10px;
      border-bottom: 1.5px solid var(--border, rgba(255,255,255,0.1));
      font-weight: 900; font-size: 14px; color: var(--text-main, #f1f5f9);
      flex-shrink: 0;
    }
    .ub-close {
      background: none; border: none; cursor: pointer;
      color: var(--text-muted, #9ca3af); font-size: 15px;
      line-height: 1; padding: 3px 7px; border-radius: 6px;
    }
    .ub-close:hover { background: var(--bg-secondary, rgba(255,255,255,0.08)); }
    .ub-mark-all {
      background: none; border: none; cursor: pointer;
      color: var(--accent, #7c3aed); font-size: 11px; font-weight: 700;
      font-family: 'Cairo', sans-serif; padding: 3px 7px; border-radius: 6px;
    }
    .ub-mark-all:hover { background: rgba(124,58,237,0.1); }

    /* ── Footer ── */
    .ub-footer {
      padding: 10px 12px;
      border-top: 1.5px solid var(--border, rgba(255,255,255,0.08));
      flex-shrink: 0;
    }
    .ub-footer-btn {
      width: 100%; background: rgba(124,58,237,0.08);
      border: 1.5px solid rgba(124,58,237,0.25); border-radius: 10px;
      color: #a78bfa; font-family: 'Cairo', sans-serif;
      font-size: 13px; font-weight: 800; cursor: pointer;
      padding: 9px 14px; transition: all 0.18s;
      display: flex; align-items: center; justify-content: center; gap: 6px;
    }
    .ub-footer-btn:hover { background: rgba(124,58,237,0.18); border-color: rgba(124,58,237,0.5); }

    /* ── Filter Tabs ── */
    .ub-filters {
      display: flex; gap: 4px; padding: 8px 10px;
      border-bottom: 1.5px solid var(--border, rgba(255,255,255,0.08));
      flex-shrink: 0; overflow-x: auto; scrollbar-width: none;
    }
    .ub-filters::-webkit-scrollbar { display: none; }
    .ub-filter-tab {
      display: flex; align-items: center; gap: 4px;
      padding: 5px 10px; border-radius: 20px; border: 1.5px solid transparent;
      background: var(--bg-hover, rgba(255,255,255,0.05));
      color: var(--text-secondary, #94a3b8);
      font-family: 'Cairo', sans-serif; font-size: 12px; font-weight: 700;
      cursor: pointer; white-space: nowrap; transition: all 0.18s;
      flex-shrink: 0;
    }
    .ub-filter-tab:hover {
      background: var(--bg-secondary, rgba(255,255,255,0.1));
      color: var(--text-main, #f1f5f9);
    }
    .ub-filter-active {
      background: rgba(124,58,237,0.15) !important;
      border-color: rgba(124,58,237,0.5) !important;
      color: #a78bfa !important;
    }
    .ub-tab-icon { font-size: 13px; }
    .ub-tab-label { font-size: 12px; }
    .ub-tab-count {
      background: #ef4444; color: #fff; border-radius: 99px;
      font-size: 10px; font-weight: 900; min-width: 16px; height: 16px;
      display: inline-flex; align-items: center; justify-content: center;
      padding: 0 3px; line-height: 1;
    }

    /* ── Body & Items ── */
    .ub-body { overflow-y: auto; flex: 1; }
    .ub-empty {
      padding: 36px 16px; text-align: center;
      color: var(--text-muted, #9ca3af); font-size: 13px;
    }
    .ub-section { border-bottom: 1.5px solid var(--border, rgba(255,255,255,0.08)); }
    .ub-section:last-child { border-bottom: none; }
    .ub-section-title {
      padding: 10px 14px 5px;
      font-size: 11px; font-weight: 900; letter-spacing: 0.3px;
    }
    .ub-item {
      display: flex; align-items: flex-start; gap: 10px;
      padding: 9px 14px; cursor: pointer;
      border-bottom: 1px solid var(--glass-border, rgba(255,255,255,0.05));
      transition: background 0.15s;
    }
    .ub-item:last-child { border-bottom: none; }
    .ub-item:hover { background: var(--bg-secondary, rgba(255,255,255,0.06)); }
    .ub-item.ub-unread { background: rgba(14,165,233,0.06); }
    .ub-item-icon { font-size: 20px; flex-shrink: 0; margin-top: 1px; }
    .ub-item-body { flex: 1; min-width: 0; }
    .ub-item-title {
      font-size: 13px; font-weight: 700;
      color: var(--text-main, #f1f5f9); line-height: 1.3;
    }
    .ub-item-sub {
      font-size: 11px; color: var(--text-secondary, #94a3b8);
      margin-top: 2px; line-height: 1.4;
    }
    .ub-item-time {
      font-size: 10px; color: var(--text-muted, #64748b); margin-top: 3px;
    }
    .ub-more {
      padding: 8px 14px; font-size: 11px; font-weight: 700;
      color: var(--text-muted, #64748b); text-align: center;
      background: var(--bg-hover, rgba(255,255,255,0.03));
    }

    /* ── إخفاء أي زر إشعارات عائم قديم بشكل نهائي ── */
    #da-bell,
    #notif-bell-wrap:not([data-in-nav]),
    .ph19-pill:not(.in-nav),
    .ph19-panel,
    #ph19-panel {
      display: none !important;
      visibility: hidden !important;
      pointer-events: none !important;
    }
  `;
  document.head.appendChild(style);

  /* ── إزالة أي زر عائم قديم (#da-bell) ─────────────────────── */
  (function _killOldBell() {
    function _remove() {
      const el = document.getElementById('da-bell');
      if (el) el.remove();
    }
    _remove();
    if (document.readyState !== 'complete') {
      document.addEventListener('DOMContentLoaded', _remove);
      window.addEventListener('load', _remove);
    }
    const obs = new MutationObserver(() => {
      if (document.getElementById('da-bell')) _remove();
    });
    obs.observe(document.body || document.documentElement, { childList: true, subtree: true });
  })();

  console.log('[UnifiedBell] جرس الإشعارات الموحد جاهز 🔔');
})();
