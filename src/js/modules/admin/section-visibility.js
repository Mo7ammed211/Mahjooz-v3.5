// ═══════════════════════════════════════════════════════════════
//  محجوز — Platform Control System (نظام التحكم الشامل)
//  التحكم الكامل في جميع أقسام وأنظمة وميزات المنصة
//  الإصدار 3.0 — تغطية شاملة لكل شيء في المنصة
// ═══════════════════════════════════════════════════════════════
(function () {
  'use strict';

  const LS_KEY = 'sv_config_v3';
  const FS_DOC = 'section_visibility';
  const FS_COL = 'platform_config';

  // ─── قاموس الأقسام والميزات الكاملة ────────────────────────
  const FEATURE_CATALOG = [

    // ══ الأقسام الرئيسية ═════════════════════════════════════
    { cat: 'main',    key: 'bookings',   icon: '📅', label: 'الحجوزات',              desc: 'فنادق، سيارات، رحلات، أطباء، قاعات',    hasMaint: true,  color: '#8b5cf6' },
    { cat: 'main',    key: 'services',   icon: '🔧', label: 'الخدمات المهنية',       desc: 'كهربائي، سباك، نجار، مصور، محامي',      hasMaint: true,  color: '#10b981' },
    { cat: 'main',    key: 'stores',     icon: '🏪', label: 'المتاجر والصيدليات',    desc: 'منتجات وتسوق إلكتروني وصيدليات',        hasMaint: true,  color: '#f59e0b' },
    { cat: 'main',    key: 'digital',    icon: '🛒', label: 'المتاجر الرقمية',       desc: 'بطاقات شبكة وأكواد ورقميات',            hasMaint: true,  color: '#06b6d4' },
    { cat: 'main',    key: 'offers',     icon: '🏷️', label: 'العروض والخصومات',      desc: 'عروض جميع الأقسام مجمّعة',             hasMaint: true,  color: '#ef4444' },

    // ══ عناصر الصفحة الرئيسية ════════════════════════════════
    { cat: 'ui',      key: 'hero',       icon: '🎯', label: 'البانر الرئيسي',         desc: 'شريط الترحيب والبحث في أعلى الصفحة',    hasMaint: false, color: '#a78bfa' },
    { cat: 'ui',      key: 'ads',        icon: '📢', label: 'الإعلانات المتحركة',     desc: 'سلايدر الإعلانات في الصفحة الرئيسية',   hasMaint: false, color: '#f472b6' },
    { cat: 'ui',      key: 'featured',   icon: '⭐', label: 'أبرز الخدمات',           desc: 'قسم الخدمات المميّزة في الرئيسية',       hasMaint: false, color: '#fbbf24' },
    { cat: 'ui',      key: 'search',     icon: '🔍', label: 'شريط البحث',             desc: 'البحث العام في الرأسية وصفحة الرئيسية',  hasMaint: false, color: '#60a5fa' },
    { cat: 'ui',      key: 'region_picker', icon: '📍', label: 'اختيار المنطقة',     desc: 'بانر اختيار منطقة التوصيل للعميل',      hasMaint: false, color: '#34d399' },

    // ══ أنواع الحجوزات ════════════════════════════════════════
    { cat: 'bookings_types', key: 'hotels',      icon: '🏨', label: 'الفنادق والإقامة',   desc: 'حجوزات الغرف والشقق الفندقية',       hasMaint: true,  color: '#8b5cf6' },
    { cat: 'bookings_types', key: 'car_rental',  icon: '🚗', label: 'تأجير السيارات',     desc: 'خدمات استئجار السيارات',             hasMaint: true,  color: '#6366f1' },
    { cat: 'bookings_types', key: 'flights',     icon: '✈️', label: 'الرحلات الجوية',     desc: 'حجز تذاكر السفر',                    hasMaint: true,  color: '#0ea5e9' },
    { cat: 'bookings_types', key: 'medical',     icon: '🏥', label: 'المواعيد الطبية',    desc: 'حجز مواعيد الأطباء والعيادات',       hasMaint: true,  color: '#22c55e' },
    { cat: 'bookings_types', key: 'halls',       icon: '🎉', label: 'القاعات والمرافق',   desc: 'قاعات الأفراح والمناسبات',           hasMaint: true,  color: '#f59e0b' },

    // ══ مميزات الطلب ══════════════════════════════════════════
    { cat: 'order',   key: 'delivery',      icon: '🚚', label: 'خدمة التوصيل',          desc: 'توصيل الطلبات للعملاء بالمندوب',        hasMaint: false, color: '#10b981' },
    { cat: 'order',   key: 'self_pickup',   icon: '🏪', label: 'الاستلام بنفسك',         desc: 'خيار استلام الطلب من الموقع مباشرة',    hasMaint: false, color: '#f59e0b' },
    { cat: 'order',   key: 'free_shipping', icon: '🎁', label: 'التوصيل المجاني',         desc: 'شارة وشروط الحصول على توصيل مجاني',     hasMaint: false, color: '#34d399' },
    { cat: 'order',   key: 'scheduling',    icon: '📆', label: 'الجدولة المسبقة',         desc: 'تحديد موعد تنفيذ الخدمة/التوصيل',       hasMaint: false, color: '#a78bfa' },
    { cat: 'order',   key: 'cancellation',  icon: '🚫', label: 'إلغاء الطلبات',           desc: 'السماح للعميل بإلغاء طلبه',             hasMaint: false, color: '#ef4444' },
    { cat: 'order',   key: 'live_tracking', icon: '📍', label: 'التتبع الحيّ للتوصيل',    desc: 'خريطة تتبع مسار المندوب لحظياً',        hasMaint: false, color: '#06b6d4' },
    { cat: 'order',   key: 'order_notes',   icon: '📝', label: 'ملاحظات الطلب',           desc: 'حقل ملاحظات وتعليمات التوصيل',          hasMaint: false, color: '#94a3b8' },

    // ══ المدفوعات والمحافظ ════════════════════════════════════
    { cat: 'payments', key: 'wallet',      icon: '👛', label: 'المحفظة الإلكترونية',   desc: 'محفظة رصيد العملاء والمزوّدين',          hasMaint: false, color: '#10b981' },
    { cat: 'payments', key: 'deposits',    icon: '💰', label: 'الإيداعات',              desc: 'شحن رصيد المحفظة',                       hasMaint: false, color: '#f59e0b' },
    { cat: 'payments', key: 'refunds',     icon: '↩️', label: 'الاسترداد والإلغاء',    desc: 'نظام استرداد المبالغ عند الإلغاء',       hasMaint: false, color: '#ef4444' },
    { cat: 'payments', key: 'coupons',     icon: '🎟️', label: 'الكوبونات والعروض',      desc: 'أكواد الخصم الترويجية عند الدفع',        hasMaint: false, color: '#a78bfa' },
    { cat: 'payments', key: 'loyalty',     icon: '🏆', label: 'نقاط الولاء',             desc: 'برنامج المكافآت وتحويل النقاط',          hasMaint: false, color: '#fbbf24' },
    { cat: 'payments', key: 'arboon',      icon: '💎', label: 'نظام العربون',            desc: 'دفع عربون مسبق عند الحجز',              hasMaint: false, color: '#8b5cf6' },

    // ══ التقييمات والتفاعل ════════════════════════════════════
    { cat: 'social',   key: 'reviews',     icon: '⭐', label: 'التقييمات والمراجعات',   desc: 'تقييم الخدمات والمزوّدين بعد الطلب',    hasMaint: false, color: '#fbbf24' },
    { cat: 'social',   key: 'wishlist',    icon: '❤️', label: 'المفضلة وقائمة الأمنيات',desc: 'حفظ الخدمات المفضّلة للعودة لاحقاً',    hasMaint: false, color: '#f43f5e' },
    { cat: 'social',   key: 'share',       icon: '🔗', label: 'مشاركة الخدمات',          desc: 'مشاركة الخدمات عبر التطبيقات',          hasMaint: false, color: '#38bdf8' },

    // ══ الإشعارات والتواصل ════════════════════════════════════
    { cat: 'notifs',   key: 'notifications',    icon: '🔔', label: 'نظام الإشعارات',        desc: 'الجرس الموحد والإشعارات الفورية',        hasMaint: false, color: '#f59e0b' },
    { cat: 'notifs',   key: 'driver_messaging', icon: '📨', label: 'مراسلة المندوبين',      desc: 'التواصل المباشر بين الإدارة والمندوبين', hasMaint: false, color: '#10b981' },
    { cat: 'notifs',   key: 'smart_alerts',     icon: '🧠', label: 'التنبيهات الذكية',      desc: 'تنبيهات المدير الذكية تلقائياً',         hasMaint: false, color: '#a78bfa', adminOnly: true },

    // ══ أدوات المدير ══════════════════════════════════════════
    { cat: 'admin_tools', key: 'analytics_dash', icon: '📊', label: 'لوحة الإحصاءات',      desc: 'إحصاءات المنصة والرسوم البيانية',     hasMaint: false, color: '#06b6d4', adminOnly: true },
    { cat: 'admin_tools', key: 'reports',         icon: '📋', label: 'التقارير',              desc: 'تقارير الأداء والمبيعات والمزوّدين',  hasMaint: false, color: '#8b5cf6', adminOnly: true },
    { cat: 'admin_tools', key: 'bulk_import',     icon: '📥', label: 'الاستيراد الجماعي',    desc: 'رفع بيانات CSV/Excel',               hasMaint: false, color: '#10b981', adminOnly: true },
    { cat: 'admin_tools', key: 'ads_management',  icon: '📣', label: 'إدارة الإعلانات',      desc: 'إنشاء وإدارة إعلانات المنصة',        hasMaint: false, color: '#f472b6', adminOnly: true },
    { cat: 'admin_tools', key: 'map_tracking',    icon: '🗺️', label: 'خريطة المندوبين',      desc: 'خريطة التتبع الحيّ للمندوبين',        hasMaint: false, color: '#22c55e', adminOnly: true },
    { cat: 'admin_tools', key: 'vendor_analytics',icon: '🏪', label: 'تحليلات المزوّدين',    desc: 'تحليلات أداء مزوّدي الخدمات',        hasMaint: false, color: '#f59e0b', adminOnly: true },
    { cat: 'admin_tools', key: 'wallet_admin',     icon: '👛', label: 'إدارة المحافظ',        desc: 'محافظ العملاء والمزوّدين والإيداعات', hasMaint: false, color: '#10b981', adminOnly: true },
    { cat: 'admin_tools', key: 'section_control',  icon: '🛡️', label: 'التحكم في المنصة',    desc: 'هذه اللوحة — إخفاء وإيقاف أي نظام',  hasMaint: false, color: '#ef4444', adminOnly: true },
  ];

  // DEFAULTS مشتقة تلقائياً من الكتالوج
  const DEFAULTS = {
    full_maint: false,
    full_maint_msg: 'المنصة تحت الصيانة حالياً، نعود إليكم قريباً 🔧',
  };
  FEATURE_CATALOG.forEach(f => {
    DEFAULTS[f.key] = true;
    if (f.hasMaint) {
      DEFAULTS[f.key + '_maint'] = false;
      DEFAULTS[f.key + '_maint_msg'] = `قسم ${f.label} تحت الصيانة حالياً، نعود قريباً 🔧`;
    }
  });

  // ─── CSS Rules لكل ميزة ──────────────────────────────────
  // عند إخفاء ميزة → يُحقن CSS يخفي العناصر المرتبطة بها
  const FEATURE_CSS = {
    // واجهة الرئيسية
    hero:           [`.hero-banner { display:none!important; }`],
    ads:            [`.ads-section, .ads-slider, #ads-slider { display:none!important; }`],
    featured:       [`#featured-section, .featured-section { display:none!important; }`],
    search:         [`.search-wrap, #global-search, .search-box { display:none!important; }`],
    region_picker:  [`[onclick*="ph9_showRegionPicker"], .region-banner-wrap { display:none!important; }`],

    // مميزات الطلب
    delivery:       [`[data-feature="delivery"], .delivery-option, .driver-section { display:none!important; }`],
    self_pickup:    [`[data-feature="self_pickup"], .sp-pickup-section, .self-pickup-section,
                     [onclick*="sp_"], [id*="sp-pickup"] { display:none!important; }`],
    free_shipping:  [`[data-feature="free_shipping"], .free-ship-badge, .free-shipping-badge { display:none!important; }`],
    scheduling:     [`[data-feature="scheduling"], .schedule-wrap, .schedule-section { display:none!important; }`],
    cancellation:   [`[onclick*="ph18_cancelOrder"], [onclick*="cancelOrder"],
                     .cancel-order-btn, .ph32-cancel-btn { display:none!important; }`],
    live_tracking:  [`[onclick*="ph10_"], [id*="live-track"], .tracking-section,
                     .track-order-btn, [onclick*="trackOrder"] { display:none!important; }`],
    order_notes:    [`[data-feature="order_notes"], .order-notes-field { display:none!important; }`],

    // المدفوعات
    wallet:         [`[onclick*="navigate('wallet"],.wallet-btn,.wallet-section,
                     [data-feature="wallet"] { display:none!important; }`],
    deposits:       [`[data-feature="deposits"], .deposit-section { display:none!important; }`],
    refunds:        [`[onclick*="ph32_"], .refund-btn, .ph32-refund-btn { display:none!important; }`],
    coupons:        [`#coupon-input-wrap, .coupon-section, [data-feature="coupons"] { display:none!important; }`],
    loyalty:        [`[onclick*="ph12_"], [onclick*="ph31_"], .loyalty-section,
                     .loyalty-card, [data-feature="loyalty"] { display:none!important; }`],
    arboon:         [`[data-feature="arboon"], .arboon-section,
                     [onclick*="ph28_"] { display:none!important; }`],

    // التقييمات
    reviews:        [`#ph36-reviews-section, .ph36-reviews, .reviews-section,
                     [data-feature="reviews"] { display:none!important; }`],
    wishlist:       [`[onclick*="wish"], [onclick*="toggleFav"], .wish-btn,
                     .wishlist-btn, .fav-btn, [data-wishlist] { display:none!important; }`],
    share:          [`[onclick*="ph34_"], [onclick*="shareService"], .share-btn { display:none!important; }`],

    // الإشعارات
    notifications:  [`#unified-bell-btn, .notif-bell, #bell-btn { display:none!important; }`],
    driver_messaging:[`[onclick*="driverMsg"], .driver-msg-btn { display:none!important; }`],
    smart_alerts:   [`#smart-alerts-banner { display:none!important; }`],

    // أدوات الإدارة (تُخفى من القائمة الإدارية)
    analytics_dash: [`[onclick*="setAdminTab('stats')"], [onclick*="setAdminTab('advanced')"] { display:none!important; }`],
    reports:        [`[onclick*="setAdminTab('reports')"], [onclick*="setAdminTab('hub_reports')"] { display:none!important; }`],
    bulk_import:    [`[onclick*="setAdminTab('bulk_import')"] { display:none!important; }`],
    ads_management: [`[onclick*="setAdminTab('ads')"] { display:none!important; }`],
    map_tracking:   [`[onclick*="setAdminTab('live_tracking')"] { display:none!important; }`],
    vendor_analytics:[`[onclick*="setAdminTab('vendor_analytics')"] { display:none!important; }`],
    wallet_admin:   [`[onclick*="setAdminTab('wallet')"], [onclick*="setAdminTab('wallet_audit')"] { display:none!important; }`],
  };

  // ─── SV الكائن الرئيسي ──────────────────────────────────
  window.SV = {
    _data:   { ...DEFAULTS },
    _loaded: false,

    async load() {
      const cached = localStorage.getItem(LS_KEY);
      if (cached) {
        try { this._data = { ...DEFAULTS, ...JSON.parse(cached) }; } catch (_) {}
      }
      try {
        const doc = await db.collection(FS_COL).doc(FS_DOC).get();
        if (doc.exists) {
          this._data = { ...DEFAULTS, ...doc.data() };
          localStorage.setItem(LS_KEY, JSON.stringify(this._data));
        }
      } catch (e) { console.warn('[SV] Firebase load failed, using cache:', e.message); }
      this._loaded = true;
      this._apply();
    },

    get(key)         { return this._data[key] ?? DEFAULTS[key] ?? true; },
    isAdmin()        { return window.State?.currentUser?.role === 'admin'; },
    isVisible(key)   { if (this.isAdmin()) return true; return this._data[key] !== false; },
    isMaintenance(key){ if (this.isAdmin()) return false; return !!this._data[key + '_maint']; },
    isAccessible(key){ if (this.isAdmin()) return true; return this._data[key] !== false && !this._data[key + '_maint']; },
    maintenanceMsg(key){ return this._data[key + '_maint_msg'] || 'هذا القسم تحت الصيانة حالياً، نعود قريباً 🔧'; },

    async set(key, value) {
      this._data[key] = value;
      localStorage.setItem(LS_KEY, JSON.stringify(this._data));
      try {
        await db.collection(FS_COL).doc(FS_DOC).set(this._data, { merge: true });
      } catch (e) { console.error('[SV] Save error:', e); window.toast?.('خطأ في الحفظ: ' + e.message, 'error'); return; }
      this._apply();
    },

    async toggle(key) { await this.set(key, !this._data[key]); },
    async setMsg(key, msg) { await this.set(key + '_maint_msg', msg); },

    // تطبيق كل التأثيرات (صيانة كاملة + حقن CSS)
    _apply() {
      this._applyFullMaint();
      this._applyCSS();
    },

    // ── صيانة كاملة للمنصة ────────────────────────────────
    _applyFullMaint() {
      const isAdmin = this.isAdmin();
      let overlay = document.getElementById('sv-full-maint-overlay');
      if (this._data.full_maint && !isAdmin) {
        if (!overlay) {
          overlay = document.createElement('div');
          overlay.id = 'sv-full-maint-overlay';
          document.body.appendChild(overlay);
        }
        overlay.innerHTML = `
          <div class="sv-maint-wrap">
            <div class="sv-maint-icon-wrap">
              <div class="sv-maint-glow"></div>
              <span class="sv-maint-icon">🔧</span>
            </div>
            <h2 class="sv-maint-title">المنصة تحت الصيانة</h2>
            <p class="sv-maint-msg">${this._data.full_maint_msg || ''}</p>
            <div class="sv-maint-dots"><span></span><span></span><span></span></div>
          </div>`;
      } else if (overlay) {
        overlay.remove();
      }
    },

    // ── حقن CSS لإخفاء العناصر تلقائياً ─────────────────
    _applyCSS() {
      const isAdmin = this.isAdmin();
      // المدير يرى كل شيء دائماً
      if (isAdmin) {
        const el = document.getElementById('sv-injected-css');
        if (el) el.remove();
        return;
      }

      let css = '';
      Object.entries(FEATURE_CSS).forEach(([key, rules]) => {
        if (this._data[key] === false) {
          rules.forEach(r => { css += r + '\n'; });
        }
      });

      let el = document.getElementById('sv-injected-css');
      if (!el) {
        el = document.createElement('style');
        el.id = 'sv-injected-css';
        document.head.appendChild(el);
      }
      el.textContent = css;
    },
  };

  // ── مؤقت للتحميل بعد Firebase ─────────────────────────
  const _tryLoad = () => {
    if (typeof db !== 'undefined') window.SV.load();
    else setTimeout(_tryLoad, 400);
  };
  setTimeout(_tryLoad, 600);

  // إعادة تطبيق CSS عند تسجيل الدخول/الخروج
  setInterval(() => {
    const role = window.State?.currentUser?.role;
    if (role !== window._sv_lastRole) {
      window._sv_lastRole = role;
      window.SV._apply();
    }
  }, 2000);

  // ──────────────────────────────────────────────────────────
  // ─── وظائف مساعدة للصفحات ────────────────────────────────
  // ──────────────────────────────────────────────────────────
  window.svMaintenancePage = function (key) {
    const msg = window.SV.maintenanceMsg(key);
    return `
    <div id="app-content" style="min-height:60vh;display:flex;align-items:center;justify-content:center">
      <div style="text-align:center;padding:48px 24px;max-width:420px;margin:0 auto">
        <div style="font-size:64px;margin-bottom:20px;animation:sv-bounce 1.6s infinite">🔧</div>
        <h2 style="font-size:24px;font-weight:800;color:var(--text-main);margin-bottom:12px">قسم تحت الصيانة</h2>
        <p style="color:var(--text-secondary);font-size:15px;line-height:1.7;margin-bottom:32px">${msg}</p>
        <button class="btn btn-primary" onclick="navigate('home')" style="border-radius:99px;padding:12px 36px">← العودة للرئيسية</button>
      </div>
    </div>`;
  };

  window.svShowMaintMsg = function (key) {
    const msg = window.SV.maintenanceMsg(key);
    const modal   = document.getElementById('modal-body');
    const overlay = document.getElementById('modal-overlay');
    if (!modal || !overlay) return;
    modal.innerHTML = `
      <div style="text-align:center;padding:36px 24px">
        <div style="font-size:56px;margin-bottom:16px;animation:sv-bounce 1.4s infinite">🔧</div>
        <h3 style="font-size:20px;font-weight:800;margin-bottom:12px;color:var(--text-main)">هذا القسم تحت الصيانة</h3>
        <p style="color:var(--text-secondary);margin-bottom:28px;line-height:1.7;max-width:320px;margin-inline:auto">${msg}</p>
        <button class="btn btn-primary" style="border-radius:99px;padding:10px 32px"
          onclick="document.getElementById('modal-overlay').classList.remove('active')">حسناً، شكراً</button>
      </div>`;
    overlay.classList.add('active');
  };

  // ──────────────────────────────────────────────────────────
  // ─── لوحة الإدارة الشاملة ────────────────────────────────
  // ──────────────────────────────────────────────────────────

  const CAT_META = {
    main:           { icon: '🏗️', label: 'الأقسام الرئيسية',       desc: 'الأقسام الكبرى التي يراها العملاء في الرئيسية' },
    ui:             { icon: '🎨', label: 'عناصر الصفحة الرئيسية',   desc: 'بانرات وعناصر واجهة الصفحة الأولى' },
    bookings_types: { icon: '📅', label: 'أنواع الحجوزات',           desc: 'فئات الحجز الفرعية (فنادق، طيران، أطباء...)' },
    order:          { icon: '🛒', label: 'مميزات الطلب والتوصيل',    desc: 'خيارات الطلب وطرق التسليم' },
    payments:       { icon: '💳', label: 'المدفوعات والمحافظ',        desc: 'طرق الدفع والمكافآت والعروض' },
    social:         { icon: '⭐', label: 'التقييمات والتفاعل',        desc: 'التقييمات والمفضلة والمشاركة' },
    notifs:         { icon: '🔔', label: 'الإشعارات والتواصل',        desc: 'جرس الإشعارات والرسائل الفورية' },
    admin_tools:    { icon: '⚙️', label: 'أدوات الإدارة',             desc: 'الأدوات والتقارير المخصصة للمدير' },
  };

  const CAT_ORDER = ['main','ui','bookings_types','order','payments','social','notifs','admin_tools'];

  window.renderAdminSectionVisibility = function () {
    const sv   = window.SV;
    const d    = sv._data;
    const cats = CAT_ORDER;

    // إحصاءات سريعة
    const allFeats = FEATURE_CATALOG;
    const visCount  = allFeats.filter(f => d[f.key] !== false).length;
    const hidCount  = allFeats.filter(f => d[f.key] === false).length;
    const maintCount= allFeats.filter(f => f.hasMaint && !!d[f.key + '_maint']).length;
    const totalCount = allFeats.length;

    const tab = window._svActiveTab || cats[0];

    const navBtn = (catKey) => {
      const m  = CAT_META[catKey];
      const items = FEATURE_CATALOG.filter(f => f.cat === catKey);
      const hidden = items.filter(f => d[f.key] === false).length;
      const maint  = items.filter(f => f.hasMaint && !!d[f.key + '_maint']).length;
      const isActive = tab === catKey;
      return `
        <button class="sv3-nav-btn${isActive ? ' active' : ''}" onclick="sv3_setTab('${catKey}')">
          <span class="sv3-nav-icon">${m.icon}</span>
          <span class="sv3-nav-label">${m.label}</span>
          ${hidden > 0 ? `<span class="sv3-nav-badge sv3-badge-hidden">${hidden}</span>` : ''}
          ${maint > 0  ? `<span class="sv3-nav-badge sv3-badge-maint">${maint}</span>` : ''}
        </button>`;
    };

    const featureRow = (f) => {
      const visible = d[f.key] !== false;
      const maint   = f.hasMaint && !!d[f.key + '_maint'];
      const maintMsg = d[f.key + '_maint_msg'] || '';
      const statusLabel = !visible ? 'مخفي' : maint ? 'صيانة' : 'نشط';
      const statusClass = !visible ? 'sv3-status-hidden' : maint ? 'sv3-status-maint' : 'sv3-status-active';
      return `
        <div class="sv3-feat-row${!visible ? ' sv3-row-hidden' : ''}${maint ? ' sv3-row-maint' : ''}" id="sv3-row-${f.key}">
          <div class="sv3-feat-left">
            <div class="sv3-feat-icon" style="background:${f.color}18;color:${f.color}">${f.icon}</div>
            <div class="sv3-feat-info">
              <div class="sv3-feat-name">
                ${f.label}
                ${f.adminOnly ? '<span class="sv3-admin-only">للمدير</span>' : ''}
              </div>
              <div class="sv3-feat-desc">${f.desc}</div>
            </div>
          </div>
          <div class="sv3-feat-right">
            <span class="sv3-status ${statusClass}">${statusLabel}</span>

            <div class="sv3-toggles">
              <div class="sv3-toggle-wrap">
                <span class="sv3-toggle-lbl">${visible ? '👁 ظاهر' : '🙈 مخفي'}</span>
                <label class="sv3-switch" title="${visible ? 'اضغط للإخفاء' : 'اضغط للإظهار'}">
                  <input type="checkbox" ${visible ? 'checked' : ''} onchange="sv3_toggle('${f.key}', this)">
                  <span class="sv3-switch-track"><span class="sv3-switch-thumb"></span></span>
                </label>
              </div>
              ${f.hasMaint ? `
              <div class="sv3-toggle-wrap sv3-toggle-warn">
                <span class="sv3-toggle-lbl">🔧 صيانة</span>
                <label class="sv3-switch sv3-switch-warn">
                  <input type="checkbox" ${maint ? 'checked' : ''} onchange="sv3_toggle('${f.key}_maint', this, '${f.key}')">
                  <span class="sv3-switch-track"><span class="sv3-switch-thumb"></span></span>
                </label>
              </div>` : ''}
            </div>
          </div>
        </div>
        ${f.hasMaint ? `
        <div class="sv3-maint-msg-row" id="sv3-msg-row-${f.key}" style="${maint ? '' : 'display:none'}">
          <input class="sv3-msg-input" id="sv3-msg-${f.key}" value="${(maintMsg).replace(/"/g, '&quot;')}"
            placeholder="رسالة تظهر للمستخدم عند وضع الصيانة...">
          <button class="sv3-msg-save" onclick="sv3_saveMsg('${f.key}', document.getElementById('sv3-msg-${f.key}').value)">💾 حفظ</button>
        </div>` : ''}`;
    };

    const currentCatFeats = FEATURE_CATALOG.filter(f => f.cat === tab);
    const catMeta = CAT_META[tab];

    return `
    <div class="sv3-wrap">

      <!-- رأس الصفحة -->
      <div class="sv3-header">
        <div class="sv3-header-content">
          <div class="sv3-header-icon">🛡️</div>
          <div>
            <h1 class="sv3-title">التحكم الشامل في المنصة</h1>
            <p class="sv3-sub">أوقف أو أخفِ أي قسم أو نظام أو ميزة بضغطة واحدة — التأثير فوري لجميع المستخدمين</p>
          </div>
        </div>
        <div class="sv3-stats">
          <div class="sv3-stat sv3-stat-green"><div class="sv3-stat-val">${visCount}</div><div class="sv3-stat-lbl">نشط</div></div>
          <div class="sv3-stat sv3-stat-gray"><div class="sv3-stat-val">${hidCount}</div><div class="sv3-stat-lbl">مخفي</div></div>
          <div class="sv3-stat sv3-stat-amber"><div class="sv3-stat-val">${maintCount}</div><div class="sv3-stat-lbl">صيانة</div></div>
          <div class="sv3-stat sv3-stat-blue"><div class="sv3-stat-val">${totalCount}</div><div class="sv3-stat-lbl">إجمالي</div></div>
        </div>
      </div>

      <!-- صيانة كاملة للمنصة -->
      <div class="sv3-full-maint-card${d.full_maint ? ' sv3-full-maint-on' : ''}" id="sv3-full-maint-card">
        <div class="sv3-full-maint-left">
          <div style="font-size:28px">${d.full_maint ? '🔴' : '🟢'}</div>
          <div>
            <div class="sv3-full-maint-title">وضع الصيانة الكاملة للمنصة</div>
            <div class="sv3-full-maint-desc">
              ${d.full_maint
                ? '⚠️ المنصة مغلقة الآن — جميع المستخدمين يرون شاشة الصيانة'
                : 'المنصة تعمل بشكل طبيعي — التغييرات الجزئية أدناه فقط تؤثر'}
            </div>
          </div>
        </div>
        <label class="sv3-switch sv3-switch-danger">
          <input type="checkbox" ${d.full_maint ? 'checked' : ''} onchange="svToggleFullMaint(this)">
          <span class="sv3-switch-track"><span class="sv3-switch-thumb"></span></span>
        </label>
      </div>
      <div id="sv-full-maint-msg-wrap" style="${d.full_maint ? '' : 'display:none'}; padding:0 0 12px">
        <div class="sv3-maint-msg-row">
          <input class="sv3-msg-input" id="sv-full-maint-msg-input"
            value="${(d.full_maint_msg || '').replace(/"/g, '&quot;')}"
            placeholder="رسالة الصيانة الكاملة...">
          <button class="sv3-msg-save" onclick="svSaveFullMaintMsg()">💾 حفظ</button>
        </div>
      </div>

      <!-- نافذة تسريع: إيقاف الكل / تشغيل الكل -->
      <div class="sv3-quick-bar">
        <span class="sv3-quick-label">⚡ إجراءات سريعة:</span>
        <button class="sv3-quick-btn sv3-quick-green"  onclick="sv3_allVisible()">✅ إظهار الكل</button>
        <button class="sv3-quick-btn sv3-quick-amber"  onclick="sv3_allMaint()">🔧 صيانة الكل</button>
        <button class="sv3-quick-btn sv3-quick-red"    onclick="sv3_confirmHideAll()">🙈 إخفاء الكل</button>
        <button class="sv3-quick-btn sv3-quick-blue"   onclick="sv3_clearMaint()">🔓 رفع الصيانة</button>
      </div>

      <!-- تبويبات الفئات -->
      <div class="sv3-nav">
        ${cats.map(navBtn).join('')}
      </div>

      <!-- محتوى الفئة النشطة -->
      <div class="sv3-cat-panel">
        <div class="sv3-cat-header">
          <span style="font-size:24px">${catMeta.icon}</span>
          <div>
            <div class="sv3-cat-title">${catMeta.label}</div>
            <div class="sv3-cat-desc">${catMeta.desc}</div>
          </div>
        </div>
        <div class="sv3-feat-list">
          ${currentCatFeats.map(featureRow).join('')}
        </div>
      </div>

    </div>`;
  };

  // ─── معالجات الأحداث ─────────────────────────────────────

  window.sv3_setTab = function (catKey) {
    window._svActiveTab = catKey;
    const container = document.querySelector('.sv3-wrap');
    if (container) {
      // تحديث بدون إعادة رسم كاملة
      const panel = container.querySelector('.sv3-cat-panel');
      if (panel) {
        const catMeta = CAT_META[catKey];
        const feats = FEATURE_CATALOG.filter(f => f.cat === catKey);
        const d = window.SV._data;
        panel.innerHTML = `
          <div class="sv3-cat-header">
            <span style="font-size:24px">${catMeta.icon}</span>
            <div>
              <div class="sv3-cat-title">${catMeta.label}</div>
              <div class="sv3-cat-desc">${catMeta.desc}</div>
            </div>
          </div>
          <div class="sv3-feat-list">
            ${feats.map(f => {
              const visible = d[f.key] !== false;
              const maint   = f.hasMaint && !!d[f.key + '_maint'];
              const maintMsg = d[f.key + '_maint_msg'] || '';
              const statusLabel = !visible ? 'مخفي' : maint ? 'صيانة' : 'نشط';
              const statusClass = !visible ? 'sv3-status-hidden' : maint ? 'sv3-status-maint' : 'sv3-status-active';
              return `
                <div class="sv3-feat-row${!visible?' sv3-row-hidden':''}${maint?' sv3-row-maint':''}" id="sv3-row-${f.key}">
                  <div class="sv3-feat-left">
                    <div class="sv3-feat-icon" style="background:${f.color}18;color:${f.color}">${f.icon}</div>
                    <div class="sv3-feat-info">
                      <div class="sv3-feat-name">${f.label}${f.adminOnly?'<span class="sv3-admin-only">للمدير</span>':''}</div>
                      <div class="sv3-feat-desc">${f.desc}</div>
                    </div>
                  </div>
                  <div class="sv3-feat-right">
                    <span class="sv3-status ${statusClass}">${statusLabel}</span>
                    <div class="sv3-toggles">
                      <div class="sv3-toggle-wrap">
                        <span class="sv3-toggle-lbl">${visible?'👁 ظاهر':'🙈 مخفي'}</span>
                        <label class="sv3-switch">
                          <input type="checkbox" ${visible?'checked':''} onchange="sv3_toggle('${f.key}', this)">
                          <span class="sv3-switch-track"><span class="sv3-switch-thumb"></span></span>
                        </label>
                      </div>
                      ${f.hasMaint ? `
                      <div class="sv3-toggle-wrap sv3-toggle-warn">
                        <span class="sv3-toggle-lbl">🔧 صيانة</span>
                        <label class="sv3-switch sv3-switch-warn">
                          <input type="checkbox" ${maint?'checked':''} onchange="sv3_toggle('${f.key}_maint', this, '${f.key}')">
                          <span class="sv3-switch-track"><span class="sv3-switch-thumb"></span></span>
                        </label>
                      </div>` : ''}
                    </div>
                  </div>
                </div>
                ${f.hasMaint ? `
                <div class="sv3-maint-msg-row" id="sv3-msg-row-${f.key}" style="${maint?'':'display:none'}">
                  <input class="sv3-msg-input" id="sv3-msg-${f.key}" value="${(maintMsg).replace(/"/g,'&quot;')}"
                    placeholder="رسالة الصيانة...">
                  <button class="sv3-msg-save" onclick="sv3_saveMsg('${f.key}', document.getElementById('sv3-msg-${f.key}').value)">💾 حفظ</button>
                </div>` : ''}`;
            }).join('')}
          </div>`;
      }
      // تحديث الأزرار النشطة
      container.querySelectorAll('.sv3-nav-btn').forEach(b => {
        b.classList.toggle('active', b.getAttribute('onclick')?.includes(`'${catKey}'`));
      });
    }
  };

  window.sv3_toggle = async function (key, chkEl, baseKey) {
    const sw = chkEl.closest('.sv3-switch');
    if (sw) sw.classList.add('sv3-saving');
    await window.SV.toggle(key);
    if (sw) sw.classList.remove('sv3-saving');

    // تحديث صف رسالة الصيانة
    const resolvedBase = baseKey || (key.endsWith('_maint') ? key.replace('_maint', '') : null);
    if (resolvedBase) {
      const msgRow = document.getElementById('sv3-msg-row-' + resolvedBase);
      if (msgRow) msgRow.style.display = window.SV.get(key) ? '' : 'none';
    }

    // تحديث مظهر الصف
    const rowKey = key.endsWith('_maint') ? key.replace('_maint','') : key;
    const row = document.getElementById('sv3-row-' + rowKey);
    if (row) {
      const visible = window.SV.get(rowKey) !== false;
      const maint   = !!window.SV.get(rowKey + '_maint');
      row.classList.toggle('sv3-row-hidden', !visible);
      row.classList.toggle('sv3-row-maint', maint);
      const statusEl = row.querySelector('.sv3-status');
      if (statusEl) {
        statusEl.className = 'sv3-status ' + (!visible?'sv3-status-hidden':maint?'sv3-status-maint':'sv3-status-active');
        statusEl.textContent = !visible ? 'مخفي' : maint ? 'صيانة' : 'نشط';
      }
      const lbl = chkEl.closest('.sv3-toggle-wrap')?.querySelector('.sv3-toggle-lbl');
      if (lbl && !key.endsWith('_maint')) lbl.textContent = window.SV.get(key) !== false ? '👁 ظاهر' : '🙈 مخفي';
    }

    // تحديث إحصاءات الرأس
    _sv3_updateStats();
    window.toast?.(window.SV.get(key) ? '✅ تم التفعيل' : '🙈 تم الإخفاء', 'success');
  };

  window.sv3_saveMsg = async function (key, msg) {
    await window.SV.set(key + '_maint_msg', msg);
    window.toast?.('✅ تم حفظ رسالة الصيانة', 'success');
  };

  function _sv3_updateStats() {
    const d = window.SV._data;
    const all = FEATURE_CATALOG;
    const vis  = all.filter(f => d[f.key] !== false).length;
    const hid  = all.filter(f => d[f.key] === false).length;
    const mnt  = all.filter(f => f.hasMaint && !!d[f.key + '_maint']).length;
    const vEl  = document.querySelector('.sv3-stat-green .sv3-stat-val');
    const hEl  = document.querySelector('.sv3-stat-gray  .sv3-stat-val');
    const mEl  = document.querySelector('.sv3-stat-amber .sv3-stat-val');
    if (vEl) vEl.textContent = vis;
    if (hEl) hEl.textContent = hid;
    if (mEl) mEl.textContent = mnt;
  }

  // ── إجراءات جماعية ──────────────────────────────────────
  window.sv3_allVisible = async function () {
    if (!confirm('تأكيد: إظهار وتفعيل جميع الميزات والأقسام؟')) return;
    showLoader?.('جاري الإظهار...');
    const updates = {};
    FEATURE_CATALOG.forEach(f => {
      updates[f.key] = true;
      if (f.hasMaint) updates[f.key + '_maint'] = false;
    });
    Object.assign(window.SV._data, updates);
    localStorage.setItem(LS_KEY, JSON.stringify(window.SV._data));
    try { await db.collection(FS_COL).doc(FS_DOC).set(window.SV._data, { merge: true }); } catch (e) {}
    window.SV._apply();
    hideLoader?.();
    window.toast?.('✅ تم تفعيل وإظهار جميع الميزات', 'success');
    sv3_setTab(window._svActiveTab || 'main');
    _sv3_updateStats();
  };

  window.sv3_allMaint = async function () {
    if (!confirm('تأكيد: وضع جميع الأقسام الرئيسية في وضع الصيانة؟')) return;
    showLoader?.('جاري الضبط...');
    const updates = {};
    FEATURE_CATALOG.filter(f => f.hasMaint).forEach(f => { updates[f.key + '_maint'] = true; });
    Object.assign(window.SV._data, updates);
    localStorage.setItem(LS_KEY, JSON.stringify(window.SV._data));
    try { await db.collection(FS_COL).doc(FS_DOC).set(window.SV._data, { merge: true }); } catch (e) {}
    window.SV._apply();
    hideLoader?.();
    window.toast?.('🔧 تم تفعيل وضع الصيانة لجميع الأقسام', 'warning');
    sv3_setTab(window._svActiveTab || 'main');
    _sv3_updateStats();
  };

  window.sv3_clearMaint = async function () {
    showLoader?.('جاري الرفع...');
    const updates = {};
    FEATURE_CATALOG.filter(f => f.hasMaint).forEach(f => { updates[f.key + '_maint'] = false; });
    Object.assign(window.SV._data, updates);
    localStorage.setItem(LS_KEY, JSON.stringify(window.SV._data));
    try { await db.collection(FS_COL).doc(FS_DOC).set(window.SV._data, { merge: true }); } catch (e) {}
    window.SV._apply();
    hideLoader?.();
    window.toast?.('🔓 تم رفع الصيانة عن جميع الأقسام', 'success');
    sv3_setTab(window._svActiveTab || 'main');
    _sv3_updateStats();
  };

  window.sv3_confirmHideAll = function () {
    const modal   = document.getElementById('modal-body');
    const overlay = document.getElementById('modal-overlay');
    if (!modal || !overlay) { sv3_hideAll(); return; }
    modal.innerHTML = `
      <div style="text-align:center;padding:32px 24px">
        <div style="font-size:48px;margin-bottom:16px">⚠️</div>
        <h3 style="font-size:20px;font-weight:800;margin-bottom:12px;color:var(--text-main)">إخفاء جميع الميزات؟</h3>
        <p style="color:var(--text-secondary);margin-bottom:24px;line-height:1.7">
          سيُخفى كل شيء عن المستخدمين فوراً. أنت كمدير ستظل ترى كل شيء.
        </p>
        <div style="display:flex;gap:12px;justify-content:center">
          <button class="btn" style="border-radius:99px;background:var(--bg-hover);color:var(--text-main);padding:10px 28px"
            onclick="document.getElementById('modal-overlay').classList.remove('active')">إلغاء</button>
          <button class="btn" style="border-radius:99px;background:#ef4444;color:#fff;padding:10px 28px;font-weight:700"
            onclick="document.getElementById('modal-overlay').classList.remove('active');sv3_hideAll()">نعم، إخفاء الكل</button>
        </div>
      </div>`;
    overlay.classList.add('active');
  };

  window.sv3_hideAll = async function () {
    showLoader?.('جاري الإخفاء...');
    const updates = {};
    FEATURE_CATALOG.forEach(f => { updates[f.key] = false; });
    Object.assign(window.SV._data, updates);
    localStorage.setItem(LS_KEY, JSON.stringify(window.SV._data));
    try { await db.collection(FS_COL).doc(FS_DOC).set(window.SV._data, { merge: true }); } catch (e) {}
    window.SV._apply();
    hideLoader?.();
    window.toast?.('🙈 تم إخفاء جميع الميزات', 'error');
    sv3_setTab(window._svActiveTab || 'main');
    _sv3_updateStats();
  };

  // ── وظائف متوافقة مع الكود القديم ──────────────────────
  window.svToggleKey = async function (key, chkEl) {
    await window.SV.toggle(key);
    const baseKey = key.endsWith('_maint') ? key.replace('_maint','') : null;
    if (baseKey) {
      const row = document.getElementById('sv-msg-row-' + baseKey) || document.getElementById('sv3-msg-row-' + baseKey);
      if (row) row.style.display = window.SV.get(key) ? '' : 'none';
    }
    window.toast?.(window.SV.get(key) ? '✅ تم التفعيل' : '🙈 تم الإخفاء', 'success');
  };

  window.svSaveMsg = async function (key, msg) {
    await window.SV.set(key + '_maint_msg', msg);
    window.toast?.('✅ تم حفظ الرسالة', 'success');
  };

  window.svToggleFullMaint = async function (chkEl) {
    const val = chkEl.checked;
    const card = document.getElementById('sv3-full-maint-card') || document.getElementById('sv-full-maint-card');
    const wrap = document.getElementById('sv-full-maint-msg-wrap');

    if (val) {
      const confirmed = await new Promise(res => {
        const modal   = document.getElementById('modal-body');
        const overlay = document.getElementById('modal-overlay');
        if (!modal || !overlay) { res(true); return; }
        modal.innerHTML = `
          <div style="text-align:center;padding:32px 24px">
            <div style="font-size:48px;margin-bottom:16px">⚠️</div>
            <h3 style="font-size:20px;font-weight:800;margin-bottom:12px;color:var(--text-main)">تأكيد إغلاق المنصة</h3>
            <p style="color:var(--text-secondary);margin-bottom:24px;line-height:1.7">
              سيرى <strong>جميع المستخدمين</strong> شاشة الصيانة ولن يتمكنوا من الدخول.<br>أنت كمدير ستظل قادراً على الوصول.
            </p>
            <div style="display:flex;gap:12px;justify-content:center">
              <button class="btn" style="border-radius:99px;background:var(--bg-hover);color:var(--text-main);padding:10px 28px"
                onclick="document.getElementById('modal-overlay').classList.remove('active');window._svMaintResolve(false)">إلغاء</button>
              <button class="btn" style="border-radius:99px;background:#ef4444;color:#fff;padding:10px 28px;font-weight:700"
                onclick="document.getElementById('modal-overlay').classList.remove('active');window._svMaintResolve(true)">نعم، أغلق المنصة</button>
            </div>
          </div>`;
        window._svMaintResolve = res;
        overlay.classList.add('active');
      });

      if (!confirmed) { chkEl.checked = false; return; }
    }

    await window.SV.set('full_maint', val);
    if (card) {
      card.classList.toggle('sv3-full-maint-on', val);
      const icon = card.querySelector('div[style*="font-size:28px"]');
      const desc = card.querySelector('.sv3-full-maint-desc');
      if (icon) icon.textContent = val ? '🔴' : '🟢';
      if (desc) desc.textContent = val
        ? '⚠️ المنصة مغلقة الآن — جميع المستخدمين يرون شاشة الصيانة'
        : 'المنصة تعمل بشكل طبيعي — التغييرات الجزئية أدناه فقط تؤثر';
    }
    if (wrap) wrap.style.display = val ? '' : 'none';
    window.toast?.(val ? '🔴 المنصة أُغلقت للصيانة' : '🟢 المنصة مفتوحة للمستخدمين', val ? 'error' : 'success');
  };

  window.svSaveFullMaintMsg = async function () {
    const inp = document.getElementById('sv-full-maint-msg-input');
    if (!inp) return;
    await window.SV.set('full_maint_msg', inp.value);
    window.toast?.('✅ تم حفظ الرسالة', 'success');
  };

  console.log('[SV] نظام التحكم الشامل في المنصة جاهز 🛡️ v3.0');
})();
