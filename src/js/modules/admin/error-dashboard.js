// ═══════════════════════════════════════════════════════════════
//  محجوز — Error Dashboard (لوحة الأخطاء التقنية)
//  تلتقط وتعرض جميع الأخطاء والتحذيرات في المنصة بشكل مباشر
//  للمدير فقط
// ═══════════════════════════════════════════════════════════════
(function () {
  'use strict';

  const MAX_LOGS   = 300;
  const LS_KEY     = 'mahjooz_error_log';
  const FILTERS    = ['all', 'error', 'warn', 'rejection'];
  let   _logs      = [];
  let   _activeFilter = 'all';
  let   _searchQ   = '';

  // ─── تحميل السجل من LocalStorage ────────────────────────────
  function _load() {
    try { _logs = JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch { _logs = []; }
  }

  // ─── حفظ السجل في LocalStorage ──────────────────────────────
  function _save() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(_logs.slice(-MAX_LOGS))); } catch {}
  }

  // ─── إضافة إدخال جديد ───────────────────────────────────────
  function _push(type, msg, stack) {
    const entry = {
      id:    Date.now() + Math.random(),
      ts:    Date.now(),
      type,
      msg:   String(msg).slice(0, 500),
      stack: stack ? String(stack).slice(0, 800) : '',
    };
    _logs.push(entry);
    if (_logs.length > MAX_LOGS) _logs = _logs.slice(-MAX_LOGS);
    _save();
    _refreshBadge();
    _liveAppend(type, entry);
    _sendBellNotif(entry);
    _sendToast(entry);
  }

  // ─── إرسال إشعار في جرس الإشعارات الموحد ───────────────────
  function _sendBellNotif(entry) {
    if (typeof window.__unifiedNotif === 'undefined') return;
    const role = (typeof State !== 'undefined' ? State : null)?.currentUser?.role;
    if (role !== 'admin' && role !== 'staff') return;

    const typeIcon  = entry.type === 'error' ? '🔴' : entry.type === 'rejection' ? '🟠' : '🟡';
    const typeLabel = entry.type === 'error' ? 'خطأ' : entry.type === 'rejection' ? 'رفض غير معالج' : 'تحذير';
    const time      = new Date(entry.ts).toLocaleTimeString('ar-SA', { hour12: false });

    // نبني قائمة الإشعارات من السجل (آخر 30 فقط)
    const recent = _logs.slice(-30).reverse();
    const items  = recent.map(l => ({
      icon:   l.type === 'error' ? '🔴' : l.type === 'rejection' ? '🟠' : '🟡',
      title:  String(l.msg).slice(0, 80),
      sub:    l.type === 'error' ? 'خطأ تقني' : l.type === 'rejection' ? 'رفض غير معالج' : 'تحذير',
      time:   new Date(l.ts).toLocaleTimeString('ar-SA', { hour12: false }),
      nav:    'admin',
      unread: true,
    }));

    const count = _logs.filter(l => l.type === 'error' || l.type === 'rejection').length;
    window.__unifiedNotif.update('errors', items, count);
  }

  // ─── إظهار Toast فوري (للأخطاء والرفض فقط — بدون تحذيرات) ─
  function _sendToast(entry) {
    if (entry.type === 'warn') return;
    const role = (typeof State !== 'undefined' ? State : null)?.currentUser?.role;
    if (role !== 'admin' && role !== 'staff') return;
    const short = String(entry.msg).slice(0, 70);
    window.toast?.(`🚨 ${short}`, 'error');
  }

  // ─── اعتراض console.error ────────────────────────────────────
  const _origError = console.error.bind(console);
  console.error = function (...args) {
    _origError(...args);
    const msg = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
    _push('error', msg, '');
  };

  // ─── اعتراض console.warn ─────────────────────────────────────
  const _origWarn = console.warn.bind(console);
  console.warn = function (...args) {
    _origWarn(...args);
    const msg = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
    _push('warn', msg, '');
  };

  // ─── اعتراض الأخطاء غير المُعالجة ────────────────────────────
  window.addEventListener('error', function (e) {
    _push('error', e.message || 'Unknown error', e.filename + ':' + e.lineno + '\n' + (e.error?.stack || ''));
  });

  window.addEventListener('unhandledrejection', function (e) {
    const msg = e.reason?.message || String(e.reason) || 'Unhandled Promise Rejection';
    const stk = e.reason?.stack || '';
    _push('rejection', msg, stk);
  });

  // ─── تحديث البادج على زر القائمة ────────────────────────────
  function _refreshBadge() {
    const errorCount = _logs.filter(l => l.type === 'error' || l.type === 'rejection').length;
    const el = document.querySelector('[data-err-badge]');
    if (!el) return;
    el.textContent = errorCount > 0 ? errorCount : '';
    el.style.display = errorCount > 0 ? 'inline-flex' : 'none';
  }

  // ─── إضافة صف مباشر عند فتح اللوحة ─────────────────────────
  function _liveAppend(type, entry) {
    const tbody = document.getElementById('err-dash-tbody');
    if (!tbody) return;
    if (_activeFilter !== 'all' && _activeFilter !== type) return;
    if (_searchQ && !entry.msg.toLowerCase().includes(_searchQ.toLowerCase())) return;
    const row = _buildRow(entry);
    tbody.insertAdjacentHTML('afterbegin', row);
    const counter = document.getElementById('err-dash-count');
    if (counter) counter.textContent = _filteredLogs().length;
  }

  // ─── تصفية السجل ─────────────────────────────────────────────
  function _filteredLogs() {
    return _logs
      .filter(l => _activeFilter === 'all' || l.type === _activeFilter)
      .filter(l => !_searchQ || l.msg.toLowerCase().includes(_searchQ.toLowerCase()))
      .reverse();
  }

  // ─── بناء صف HTML ────────────────────────────────────────────
  function _buildRow(l) {
    const time = new Date(l.ts).toLocaleTimeString('ar-SA', { hour12: false });
    const date = new Date(l.ts).toLocaleDateString('ar-SA');
    const typeIcon  = l.type === 'error' ? '🔴' : l.type === 'warn' ? '🟡' : '🟠';
    const typeLabel = l.type === 'error' ? 'خطأ' : l.type === 'warn' ? 'تحذير' : 'رفض غير معالج';
    const stackHTML = l.stack ? `<div class="err-stack">${_esc(l.stack)}</div>` : '';
    const safeId = String(l.id).replace('.', '_');
    return `
      <tr class="err-row err-type-${l.type}" onclick="errDash_toggleStack('${safeId}')">
        <td class="err-td-icon">${typeIcon}</td>
        <td class="err-td-type"><span class="err-badge-type err-type-${l.type}">${typeLabel}</span></td>
        <td class="err-td-msg">
          <div class="err-msg-text">${_esc(l.msg)}</div>
          <div class="err-stack-wrap" id="errstack_${safeId}" style="display:none">${stackHTML}</div>
        </td>
        <td class="err-td-time">${date}<br><small>${time}</small></td>
        <td class="err-td-act">
          <button class="err-btn-copy" onclick="event.stopPropagation();errDash_copy('${safeId}')" title="نسخ">📋</button>
          <button class="err-btn-del"  onclick="event.stopPropagation();errDash_delete('${safeId}')" title="حذف">🗑️</button>
        </td>
      </tr>`;
  }

  function _esc(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  // ─── الواجهة الرئيسية ─────────────────────────────────────────
  window.renderAdminErrorDashboard = function () {
    _load();
    const filtered = _filteredLogs();
    const totalErrors = _logs.filter(l => l.type === 'error' || l.type === 'rejection').length;
    const totalWarns  = _logs.filter(l => l.type === 'warn').length;
    const totalAll    = _logs.length;

    const filterTabs = FILTERS.map(f => {
      const labels = { all: 'الكل', error: 'أخطاء', warn: 'تحذيرات', rejection: 'رفض غير معالج' };
      const counts = {
        all:       totalAll,
        error:     _logs.filter(l => l.type === 'error').length,
        warn:      totalWarns,
        rejection: _logs.filter(l => l.type === 'rejection').length,
      };
      const active = _activeFilter === f ? ' err-filter-active' : '';
      return `<button class="err-filter-btn${active}" onclick="errDash_setFilter('${f}')">${labels[f]} <span class="err-filter-count">${counts[f]}</span></button>`;
    }).join('');

    const rowsHTML = filtered.length
      ? filtered.map(_buildRow).join('')
      : `<tr><td colspan="5" class="err-empty">✅ لا توجد أخطاء بهذا التصنيف</td></tr>`;

    setTimeout(() => {
      const el = document.getElementById('err-dash-search');
      if (el) el.value = _searchQ;
    }, 50);

    return `
      <div class="err-dash-wrap">

        <!-- الرأس -->
        <div class="err-dash-header">
          <div class="err-dash-title">
            <span class="err-dash-icon">🛡️</span>
            <div>
              <h2>لوحة الأخطاء التقنية</h2>
              <p>مراقبة فورية لجميع الأخطاء والتحذيرات في المنصة</p>
            </div>
          </div>
          <div class="err-dash-header-actions">
            <button class="err-btn-refresh" onclick="errDash_refresh()">🔄 تحديث</button>
            <button class="err-btn-export" onclick="errDash_export()">📥 تصدير</button>
            <button class="err-btn-clear"  onclick="errDash_clear()">🗑️ مسح الكل</button>
          </div>
        </div>

        <!-- بطاقات الملخص -->
        <div class="err-summary-cards">
          <div class="err-summary-card err-card-total">
            <div class="err-card-val">${totalAll}</div>
            <div class="err-card-lbl">إجمالي الإدخالات</div>
          </div>
          <div class="err-summary-card err-card-error">
            <div class="err-card-val">${totalErrors}</div>
            <div class="err-card-lbl">🔴 أخطاء</div>
          </div>
          <div class="err-summary-card err-card-warn">
            <div class="err-card-val">${totalWarns}</div>
            <div class="err-card-lbl">🟡 تحذيرات</div>
          </div>
          <div class="err-summary-card err-card-ok ${totalErrors === 0 ? 'err-card-ok-active' : ''}">
            <div class="err-card-val">${totalErrors === 0 ? '✅' : '⚠️'}</div>
            <div class="err-card-lbl">${totalErrors === 0 ? 'المنصة سليمة' : 'تحتاج مراجعة'}</div>
          </div>
        </div>

        <!-- شريط الفلاتر والبحث -->
        <div class="err-toolbar">
          <div class="err-filters">${filterTabs}</div>
          <div class="err-search-wrap">
            <input id="err-dash-search" class="err-search-input" type="text"
              placeholder="🔍 ابحث في الأخطاء..." value="${_esc(_searchQ)}"
              oninput="errDash_search(this.value)">
          </div>
        </div>

        <!-- عداد النتائج -->
        <div class="err-results-info">
          <span>عدد النتائج: <strong id="err-dash-count">${filtered.length}</strong></span>
          <span class="err-live-dot" title="مراقبة مباشرة">● مباشر</span>
        </div>

        <!-- الجدول -->
        <div class="err-table-wrap">
          <table class="err-table">
            <thead>
              <tr>
                <th style="width:36px"></th>
                <th style="width:110px">النوع</th>
                <th>الرسالة</th>
                <th style="width:100px">الوقت</th>
                <th style="width:70px">إجراءات</th>
              </tr>
            </thead>
            <tbody id="err-dash-tbody">
              ${rowsHTML}
            </tbody>
          </table>
        </div>

        <!-- تذييل -->
        <div class="err-dash-footer">
          يتم تسجيل آخر ${MAX_LOGS} إدخال — السجل محفوظ محلياً في المتصفح
        </div>
      </div>
    `;
  };

  // ─── دوال التفاعل (global) ────────────────────────────────────
  window.errDash_setFilter = function (f) {
    _activeFilter = f;
    _reRender();
  };

  window.errDash_search = function (q) {
    _searchQ = q.trim();
    const filtered = _filteredLogs();
    const tbody = document.getElementById('err-dash-tbody');
    const counter = document.getElementById('err-dash-count');
    if (!tbody) return;
    if (filtered.length) {
      tbody.innerHTML = filtered.map(_buildRow).join('');
    } else {
      tbody.innerHTML = `<tr><td colspan="5" class="err-empty">✅ لا توجد نتائج</td></tr>`;
    }
    if (counter) counter.textContent = filtered.length;
  };

  window.errDash_toggleStack = function (safeId) {
    const el = document.getElementById('errstack_' + safeId);
    if (!el) return;
    el.style.display = el.style.display === 'none' ? 'block' : 'none';
  };

  window.errDash_copy = function (safeId) {
    const row = _logs.find(l => String(l.id).replace('.', '_') === safeId);
    if (!row) return;
    const text = `[${row.type.toUpperCase()}] ${new Date(row.ts).toLocaleString('ar-SA')}\n${row.msg}\n${row.stack}`;
    navigator.clipboard?.writeText(text).then(() => window.toast?.('✅ تم النسخ', 'success'));
  };

  window.errDash_delete = function (safeId) {
    _logs = _logs.filter(l => String(l.id).replace('.', '_') !== safeId);
    _save();
    _reRender();
  };

  window.errDash_clear = function () {
    if (!confirm('هل أنت متأكد من مسح جميع سجلات الأخطاء؟')) return;
    _logs = [];
    _save();
    _reRender();
    window.toast?.('🗑️ تم مسح السجل', 'info');
  };

  window.errDash_refresh = function () {
    _load();
    _reRender();
  };

  window.errDash_export = function () {
    if (!_logs.length) { window.toast?.('لا يوجد سجل للتصدير', 'info'); return; }
    const rows = [['النوع', 'الرسالة', 'التوقيت', 'Stack']];
    _logs.forEach(l => rows.push([l.type, l.msg, new Date(l.ts).toLocaleString('ar-SA'), l.stack]));
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `mahjooz-errors-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
    window.toast?.('📥 تم تصدير السجل', 'success');
  };

  function _reRender() {
    const wrap = document.querySelector('.err-dash-wrap');
    if (!wrap) return;
    const parent = wrap.parentElement;
    if (parent) parent.innerHTML = window.renderAdminErrorDashboard();
  }

  // ─── تحميل السجل عند البدء ───────────────────────────────────
  _load();
  console.log('[ErrorDashboard] لوحة الأخطاء التقنية جاهزة 🛡️');

})();
