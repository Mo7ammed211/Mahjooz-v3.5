/* ═══════════════════════════════════════════════════════════════
   محجوز — Customer Deposit Real-time Alerts
   إشعارات فورية للعميل عند تغيير حالة الإيداع البنكي
   ── Watches bank_deposits (customerId == currentUser.uid)
   ── On status → approved / rejected: shows toast + banner
   ── Re-attaches on login, detaches on logout
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const CDA = {
    unsub:     null,
    boundUid:  null,
    seenIds:   new Set(),   // IDs seen in initial snapshot (skipped)
    initialDone: false,
  };

  /* ─── helpers ─────────────────────────────────────────────── */
  function _esc(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"']/g,
      c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c]);
  }

  function _fmtAmount(n) {
    return (n || 0).toLocaleString('ar-YE');
  }

  /* ── Sound ───────────────────────────────────────────────── */
  function _playChime(type) {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = type === 'approved' ? 880 : 440;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.8);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.8);
    } catch (e) {}
  }

  /* ── Styles ──────────────────────────────────────────────── */
  function _ensureStyles() {
    if (document.getElementById('cda-styles')) return;
    const s = document.createElement('style');
    s.id = 'cda-styles';
    s.textContent = `
      #cda-banner {
        position: fixed;
        top: 80px;
        left: 50%;
        transform: translateX(-50%) translateY(-120px);
        z-index: 99999;
        min-width: 320px;
        max-width: 90vw;
        background: #1e1e2e;
        border: 2px solid var(--border, #3a3a5c);
        border-radius: 18px;
        padding: 18px 20px;
        box-shadow: 0 20px 60px rgba(0,0,0,0.5);
        font-family: 'Cairo', sans-serif;
        direction: rtl;
        cursor: pointer;
        transition: transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1),
                    opacity 0.35s ease;
        opacity: 0;
        display: flex;
        align-items: flex-start;
        gap: 14px;
      }
      #cda-banner.cda-show {
        transform: translateX(-50%) translateY(0);
        opacity: 1;
      }
      #cda-banner.cda-hide {
        transform: translateX(-50%) translateY(-120px);
        opacity: 0;
      }
      .cda-icon-wrap {
        width: 46px;
        height: 46px;
        border-radius: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
        flex-shrink: 0;
      }
      .cda-icon-wrap.cda-approved { background: rgba(16,185,129,0.15); }
      .cda-icon-wrap.cda-rejected { background: rgba(239,68,68,0.12); }
      .cda-title {
        font-size: 14.5px;
        font-weight: 800;
        color: #fff;
        margin-bottom: 3px;
        line-height: 1.3;
      }
      .cda-body {
        font-size: 12.5px;
        color: rgba(255,255,255,0.65);
        line-height: 1.5;
      }
      .cda-amount {
        font-size: 17px;
        font-weight: 900;
        margin-top: 4px;
      }
      .cda-amount.cda-approved { color: #10b981; }
      .cda-amount.cda-rejected { color: #ef4444; }
      .cda-close {
        margin-right: auto;
        background: none;
        border: none;
        color: rgba(255,255,255,0.4);
        font-size: 18px;
        cursor: pointer;
        padding: 0 4px;
        flex-shrink: 0;
        line-height: 1;
      }
      .cda-close:hover { color: rgba(255,255,255,0.8); }
      .cda-tap-hint {
        font-size: 10.5px;
        color: rgba(255,255,255,0.35);
        margin-top: 6px;
      }
    `;
    document.head.appendChild(s);
  }

  /* ── Banner ──────────────────────────────────────────────── */
  let _bannerTimer = null;
  function _showBanner(deposit, newStatus) {
    _ensureStyles();

    const isApproved = newStatus === 'approved';
    const icon       = isApproved ? '✅' : '❌';
    const title      = isApproved ? 'تم قبول إيداعك!' : 'تم رفض الإيداع';
    const amtStr     = _fmtAmount(deposit.amount);
    const orderTxt   = deposit.orderId ? `رقم الطلب: ${_esc(deposit.orderId)}` : '';
    const reason     = !isApproved && deposit.rejectReason
      ? `السبب: ${_esc(deposit.rejectReason)}`
      : '';

    let banner = document.getElementById('cda-banner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'cda-banner';
      document.body.appendChild(banner);
    }

    banner.className = '';
    banner.innerHTML = `
      <div class="cda-icon-wrap ${newStatus}">
        ${icon}
      </div>
      <div style="flex:1;min-width:0">
        <div class="cda-title">${_esc(title)}</div>
        <div class="cda-amount ${newStatus}">${amtStr} ر.ي</div>
        ${orderTxt ? `<div class="cda-body">${orderTxt}</div>` : ''}
        ${reason   ? `<div class="cda-body" style="color:rgba(239,68,68,0.8)">${reason}</div>` : ''}
        <div class="cda-tap-hint">🏦 اضغط لعرض سجل الإيداعات</div>
      </div>
      <button class="cda-close" onclick="event.stopPropagation();_cdaDismiss()">✕</button>
    `;

    banner.onclick = function () {
      _cdaDismiss();
      if (typeof navigate === 'function') navigate('mydeposits');
    };

    /* animate in */
    requestAnimationFrame(() => {
      requestAnimationFrame(() => { banner.classList.add('cda-show'); });
    });

    /* auto-dismiss after 7s */
    clearTimeout(_bannerTimer);
    _bannerTimer = setTimeout(_cdaDismiss, 7000);
  }

  window._cdaDismiss = function () {
    const banner = document.getElementById('cda-banner');
    if (!banner) return;
    banner.classList.remove('cda-show');
    banner.classList.add('cda-hide');
    clearTimeout(_bannerTimer);
  };

  /* ── Fire notification ───────────────────────────────────── */
  function _fire(deposit, newStatus) {
    const isApproved = newStatus === 'approved';
    const amtStr     = _fmtAmount(deposit.amount);
    const toastMsg   = isApproved
      ? `✅ تم قبول إيداعك (${amtStr} ر.ي)!`
      : `❌ تم رفض الإيداع (${amtStr} ر.ي)${deposit.rejectReason ? ' — ' + deposit.rejectReason : ''}`;

    /* toast */
    if (typeof toast === 'function') {
      toast(toastMsg, isApproved ? 'success' : 'error');
    }

    /* banner */
    _showBanner(deposit, newStatus);

    /* sound */
    _playChime(newStatus);

    /* update AppData.bankDeposits in memory */
    if (window.AppData && Array.isArray(window.AppData.bankDeposits)) {
      const idx = window.AppData.bankDeposits.findIndex(d => d.id === deposit.id);
      if (idx >= 0) {
        window.AppData.bankDeposits[idx] = { ...window.AppData.bankDeposits[idx], ...deposit };
      } else {
        window.AppData.bankDeposits.unshift(deposit);
      }
    }
  }

  /* ── Attach / Detach ─────────────────────────────────────── */
  function _attach(u) {
    _detach();
    CDA.boundUid    = u.uid;
    CDA.seenIds     = new Set();
    CDA.initialDone = false;

    try {
      CDA.unsub = window.db
        .collection('bank_deposits')
        .where('customerId', '==', u.uid)
        .onSnapshot(
          snap => {
            /* first snapshot: record existing IDs, do NOT fire alerts */
            if (!CDA.initialDone) {
              snap.docs.forEach(d => CDA.seenIds.add(d.id));
              CDA.initialDone = true;
              return;
            }

            snap.docChanges().forEach(ch => {
              if (ch.type !== 'modified') return;
              const data   = { id: ch.doc.id, ...ch.doc.data() };
              const prev   = window.AppData?.bankDeposits?.find(d => d.id === data.id);
              const prevSt = prev?.status || 'pending';
              const newSt  = data.status;

              /* only fire when status transitions TO approved / rejected */
              if (prevSt !== newSt && (newSt === 'approved' || newSt === 'rejected')) {
                _fire(data, newSt);
              }

              /* keep AppData fresh regardless */
              if (window.AppData && Array.isArray(window.AppData.bankDeposits)) {
                const idx = window.AppData.bankDeposits.findIndex(d => d.id === data.id);
                if (idx >= 0) window.AppData.bankDeposits[idx] = data;
                else window.AppData.bankDeposits.unshift(data);
              }
            });
          },
          err => console.warn('[CDA] deposit watcher error:', err)
        );
    } catch (e) {
      console.warn('[CDA] failed to attach deposit watcher:', e);
    }
  }

  function _detach() {
    if (CDA.unsub) { try { CDA.unsub(); } catch (e) {} CDA.unsub = null; }
    CDA.boundUid    = null;
    CDA.initialDone = false;
  }

  /* ── Bootstrap: poll for auth state (same pattern as Phase 19) */
  setInterval(() => {
    try {
      const u = (typeof State !== 'undefined') ? State.currentUser : null;
      if (u && u.role === 'customer' && u.uid) {
        if (CDA.boundUid !== u.uid) _attach(u);
      } else if (CDA.boundUid) {
        _detach();
      }
    } catch (e) {}
  }, 1500);

  console.log('[CustomerDepositAlerts] إشعارات الإيداع الفورية جاهزة 🏦');
})();
