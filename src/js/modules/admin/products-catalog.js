/* ============================================================
   Phase 46 (Premium Upgrade) — نظام إدارة المنتجات والخدمات الموحد
   قاعدة بيانات مركزية مطورة بمستوى المنصات العالمية (Shopify / HubSpot)
   ============================================================ */
'use strict';

// ═══════════════════════════════════════════════════════
//  الثوابت والأقسام
// ═══════════════════════════════════════════════════════

const PH46_SECTIONS = [
  {
    id: 'bookings',
    label: 'الحجوزات',
    icon: '📅',
    color: '#8b5cf6',
    bgColor: 'rgba(139,92,246,0.08)',
    desc: 'فنادق، منتجعات، قاعات، رحلات، سيارات...',
    itemLabel: 'خدمة حجز',
    fields: ['provider','desc','price','commission','tax','deposit','region','address_public','map_public','requires_driver','multi_date','time_pref']
  },
  {
    id: 'stores',
    label: 'متاجر محجوز',
    icon: '🏪',
    color: '#10b981',
    bgColor: 'rgba(16,185,129,0.08)',
    desc: 'منتجات الصيدليات والمتاجر الإلكترونية...',
    itemLabel: 'منتج متجر',
    fields: ['provider','desc','price','commission','tax','region','address_private','map_private','requires_driver_mandatory','images']
  },
  {
    id: 'professions',
    label: 'المهن',
    icon: '🔧',
    color: '#f59e0b',
    bgColor: 'rgba(245,158,11,0.08)',
    desc: 'كهربائي، سباك، نجار، مصور...',
    itemLabel: 'خدمة فنية',
    fields: ['provider','desc','common_problems','price_agreement','commission_auto','region','address_private','map_private']
  },
  {
    id: 'digital',
    label: 'المتاجر الرقمية',
    icon: '🛒',
    color: '#3b82f6',
    bgColor: 'rgba(59,130,246,0.08)',
    desc: 'كروت شحن، أكواد شبكة، بطاقات رقمية...',
    itemLabel: 'منتج رقمي',
    fields: ['provider','desc','price','commission','tax','images']
  }
];

// الحقول القياسية للنظام القابلة للمطابقة أثناء الاستيراد
const PH46_MAPPABLE_FIELDS = [
  { key: 'name', label: 'اسم المنتج/الخدمة *', required: true },
  { key: 'desc', label: 'الوصف', required: false },
  { key: 'provider', label: 'مقدم الخدمة (للإدارة)', required: false },
  { key: 'price', label: 'السعر الأساسي (ريال)', required: false },
  { key: 'commission', label: 'العمولة (%)', required: false },
  { key: 'tax', label: 'الضريبة (%)', required: false },
  { key: 'address', label: 'العنوان التفصيلي', required: false },
  { key: 'commonProblems', label: 'المشكلات الشائعة (للمهن)', required: false }
];

// ═══════════════════════════════════════════════════════
//  تحميل البيانات
// ═══════════════════════════════════════════════════════

window.ph46_reloadData = async function() {
  try {
    const [cats, items, users] = await Promise.all([
      fsGetAll('catalog_cats').catch(() => []),
      fsGetAll('product_catalog').catch(() => []),
      fsGetAll('users').catch(() => [])
    ]);
    AppData.catalogCats  = cats;
    AppData.catalogItems = items;
    AppData.users = users;
  } catch(e) { console.error('ph46 reload error', e); }
};

// ═══════════════════════════════════════════════════════
//  الواجهة الرئيسية ومؤشرات الأداء (KPIs)
// ═══════════════════════════════════════════════════════

window.ph46_renderAdminProductsCatalog = function() {
  try {
    if (!State._ph46) {
      State._ph46 = {
        section: null,
        catId: null,
        search: '',
        subCatSearch: '',
        view: 'sections',
        filterStatus: 'active',
        selectedItemId: null,
        explorerTab: 'all',
        explorerSearch: ''
      };
    }
    const st = State._ph46;
    if (st.explorerTab === undefined) st.explorerTab = 'all';
    if (st.explorerSearch === undefined) st.explorerSearch = '';
    if (st.subCatSearch === undefined) st.subCatSearch = '';

    // عرض معالج الاستيراد
    if (st.view === 'import_wizard') return ph46_renderImportWizard();

    // عرض قائمة عناصر فئة
    if (st.section && st.catId) return ph46_renderItemsList();

    // عرض فئات قسم
    if (st.section && !st.catId) return ph46_renderCatsList();

    // الصفحة الرئيسية للأقسام الأربعة مع الإحصائيات الفاخرة
    return ph46_renderMainPage();
  } catch (error) {
    console.error("Error rendering products catalog:", error);
    return `<div style="padding: 30px; background: rgba(239, 68, 68, 0.1); border: 1px solid #ef4444; border-radius: 12px; color: #ef4444; direction: ltr; text-align: left; margin: 20px;">
      <h3 style="margin-top:0; color:#ef4444">Error in Catalog Module</h3>
      <p><strong>Message:</strong> ${error.message}</p>
      <p><strong>Stack:</strong></p>
      <pre style="white-space: pre-wrap; font-size: 12px; background: rgba(0,0,0,0.2); padding: 10px; border-radius: 6px; color:#fff; font-family: monospace;">${error.stack}</pre>
    </div>`;
  }
};

function ph46_renderMainPage() {
  const allItems = AppData.catalogItems || [];
  const activeItems = allItems.filter(i => i.status === 'active');
  const pendingItems = allItems.filter(i => i.status === 'pending_approval');
  const totalCats = (AppData.catalogCats || []).length;

  // حساب مؤشرات الأداء (KPIs)
  const avgCommission = activeItems.length
    ? Math.round(activeItems.reduce((acc, curr) => acc + (parseFloat(curr.commission) || 0), 0) / activeItems.length)
    : 0;

  const requiresDriverCount = activeItems.filter(i => i.requiresDriver).length;
  const driverRatio = activeItems.length ? Math.round((requiresDriverCount / activeItems.length) * 100) : 0;

  const sectionCards = PH46_SECTIONS.map(sec => {
    const secItems = allItems.filter(i => i.sectionId === sec.id && i.status === 'active');
    const secCats  = (AppData.catalogCats || []).filter(c => c.sectionId === sec.id && !c.parentId);
    const secPending = allItems.filter(i => i.sectionId === sec.id && i.status === 'pending_approval').length;

    return `
    <div class="ph46-card ph46-sec-card" onclick="ph46_goSection('${sec.id}')" style="--sec-color:${sec.color}" title="اضغط للدخول إلى تصنيفات ${sec.label}">
      <div class="ph46-sec-card-body">
        <div class="ph46-sec-icon-wrap" style="background:${sec.color}15; border:1px solid ${sec.color}35">
          <span style="color:${sec.color}">${sec.icon}</span>
        </div>
        <div class="ph46-sec-info">
          <div class="ph46-sec-title">${sec.label}</div>
          <div class="ph46-sec-desc">${sec.desc}</div>
          <div class="ph46-sec-open-hint" style="margin-top:8px; font-size:12px; color:${sec.color}; font-weight:600; display:flex; align-items:center; gap:4px;">
            <span>📂 فتح التصنيفات والمنتجات</span>
            <span style="font-size:14px;">←</span>
          </div>
        </div>
      </div>
      <div class="ph46-sec-stats-bar">
        <div class="ph46-sec-stat-item">
          <span class="ph46-sec-stat-dot" style="background:${sec.color}"></span>
          <strong>${secCats.length}</strong> فئات
        </div>
        <div class="ph46-sec-stat-item">
          <span class="ph46-sec-stat-dot" style="background:${sec.color}aa"></span>
          <strong>${secItems.length}</strong> نشط
        </div>
        ${secPending > 0 ? `
        <div class="ph46-sec-stat-item urgent-text">
          <span class="ph46-pending-pulse"></span>
          <strong>${secPending}</strong> معلق
        </div>` : ''}
      </div>
    </div>`;
  }).join('');

  // تهيئة وتصفية مستكشف قاعدة البيانات الموحدة
  const st = State._ph46 || {};
  const expTab = st.explorerTab || 'all';
  const expSearch = (st.explorerSearch || '').toLowerCase().trim();

  let filteredItems = [...allItems];
  if (expTab !== 'all') {
    filteredItems = filteredItems.filter(i => i.sectionId === expTab);
  }
  if (expSearch) {
    filteredItems = filteredItems.filter(i => 
      (i.name || '').toLowerCase().includes(expSearch) || 
      (i.provider || '').toLowerCase().includes(expSearch) ||
      (i.desc || '').toLowerCase().includes(expSearch) ||
      (i.sku || '').toString().toLowerCase().includes(expSearch)
    );
  }

  // ترتيب من الأحدث إلى الأقدم
  filteredItems.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

  const explorerRows = filteredItems.map(item => {
    const mainImg = item.mainImage || (item.images && item.images[0]) || '';
    const linkedProvidersCount = (item.linkedProviders || []).length;
    const sec = PH46_SECTIONS.find(s => s.id === item.sectionId);
    const skuBadge = item.sku
      ? `<span style="display:inline-block;font-family:monospace;font-size:11px;font-weight:700;background:rgba(139,92,246,0.12);color:#8b5cf6;border:1px solid rgba(139,92,246,0.25);border-radius:5px;padding:2px 7px;margin-top:3px;letter-spacing:0.5px;">#${escHtml(item.sku)}</span>`
      : '';

    return `
    <tr class="ph46-table-row">
      <td>
        <div class="ph46-table-item-cell">
          <div class="ph46-item-thumbnail">
            ${mainImg ? `<img src="${mainImg}">` : `<span>${sec?.icon || '🔷'}</span>`}
          </div>
          <div>
            <div class="ph46-item-table-name" onclick="ph46_showEditItemModal('${item.id}')">${escHtml(item.name)}</div>
            <div class="ph46-item-table-provider">${item.provider ? `مقدم رئيسي: ${escHtml(item.provider)}` : 'لا يوجد مقدم رئيسي'}</div>
            ${skuBadge}
          </div>
        </div>
      </td>
      <td>
        <span class="ph46-badge" style="background:${sec?.color}18; color:${sec?.color}; border:1px solid ${sec?.color}30; font-size:11.5px; padding:4px 8px; border-radius:6px;">
          ${sec?.icon || ''} ${sec?.label || item.sectionId}
        </span>
      </td>
      <td>
        ${item.priceType === 'agreement' 
          ? `<span class="ph46-badge badge-blue">🤝 بعد الاتفاق</span>`
          : `<strong>${item.price || 0} ريال</strong>`}
      </td>
      <td>
        <span class="commission-text" style="font-weight:700">${item.commission || 0}%</span>
      </td>
      <td>
        <span class="providers-count-badge" onclick="ph46_showProvidersMappingModal('${item.id}')">
          👥 ${linkedProvidersCount} موفرين
        </span>
      </td>
      <td>
        ${item.status === 'active' 
          ? `<span class="ph46-badge badge-success">نشط</span>` 
          : item.status === 'pending_approval' 
            ? `<span class="ph46-badge badge-warning">معلق</span>` 
            : `<span class="ph46-badge badge-danger">مرفوض</span>`}
      </td>
      <td>
        <div class="ph46-row-actions">
          ${item.status === 'pending_approval' ? `
            <button class="ph46-btn ph46-btn-xs ph46-btn-success" onclick="ph46_approveItem('${item.id}')">✅ قبول</button>
            <button class="ph46-btn ph46-btn-xs ph46-btn-danger" onclick="ph46_rejectItem('${item.id}')">❌ رفض</button>
          ` : ''}
          <button class="ph46-icon-btn" onclick="ph46_showEditItemModal('${item.id}')" title="تعديل">✏️</button>
          <button class="ph46-icon-btn danger" onclick="ph46_deleteItem('${item.id}')" title="حذف">🗑️</button>
        </div>
      </td>
    </tr>`;
  }).join('');

  const explorerHTML = `
  <div class="ph46-sections-list" style="margin-top: 40px;">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
      <h3 class="ph46-section-heading" style="margin-bottom: 0;">🗄️ مستكشف قاعدة البيانات الموحدة (Database Explorer)</h3>
      <span class="ph46-badge badge-blue" style="font-size: 13px; padding: 4px 10px;">إجمالي العناصر المصفاة: ${filteredItems.length} من أصل ${allItems.length}</span>
    </div>
    
    <!-- شريط التبويبات الفلترة والبحث -->
    <div class="ph46-filter-bar" style="display: flex; flex-direction: column; gap: 14px; align-items: stretch; background: rgba(0,0,0,0.18); padding: 18px; border-radius: 16px; margin-bottom: 20px;">
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
        <!-- التبويبات -->
        <div style="display: flex; gap: 6px; flex-wrap: wrap;">
          <button class="ph46-btn ${expTab === 'all' ? 'ph46-btn-primary' : 'ph46-btn-secondary'} ph46-btn-sm" 
            onclick="State._ph46.explorerTab='all'; render();" style="border-radius: 8px;">
            📂 الكل (الجميع)
          </button>
          <button class="ph46-btn ${expTab === 'bookings' ? 'ph46-btn-primary' : 'ph46-btn-secondary'} ph46-btn-sm" 
            onclick="State._ph46.explorerTab='bookings'; render();" style="border-radius: 8px;">
            📅 الحجوزات
          </button>
          <button class="ph46-btn ${expTab === 'professions' ? 'ph46-btn-primary' : 'ph46-btn-secondary'} ph46-btn-sm" 
            onclick="State._ph46.explorerTab='professions'; render();" style="border-radius: 8px;">
            🔧 الخدمات المهنية
          </button>
          <button class="ph46-btn ${expTab === 'stores' ? 'ph46-btn-primary' : 'ph46-btn-secondary'} ph46-btn-sm" 
            onclick="State._ph46.explorerTab='stores'; render();" style="border-radius: 8px;">
            🏪 المتاجر والصيدليات
          </button>
          <button class="ph46-btn ${expTab === 'digital' ? 'ph46-btn-primary' : 'ph46-btn-secondary'} ph46-btn-sm" 
            onclick="State._ph46.explorerTab='digital'; render();" style="border-radius: 8px;">
            🛒 المتاجر الرقمية
          </button>
        </div>
        
        <!-- اختصارات الاستيراد -->
        <div>
          <button class="ph46-btn ph46-btn-secondary ph46-btn-sm" onclick="ph46_startImportWizard(State._ph46.explorerTab !== 'all' ? State._ph46.explorerTab : 'bookings')" style="border-radius: 8px;">
            📥 استيراد Excel للقسم المختار
          </button>
        </div>
      </div>
      
      <!-- مربع البحث الرئيسي -->
      <div class="search-input-wrap" style="width: 100%; position: relative;">
        <span class="search-icon" style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); color: var(--text-muted); font-size: 15px;">🔍</span>
        <input type="text" class="ph46-input" placeholder="ابحث باسم المنتج، الخدمة، مقدم الخدمة، أو رقم الصنف (#SKU)..." 
          value="${escAttr(st.explorerSearch || '')}"
          oninput="State._ph46.explorerSearch=this.value; render();" style="border-radius: 8px; padding-right: 38px; width: 100%;">
      </div>
    </div>
    
    <!-- جدول عرض العناصر -->
    ${filteredItems.length === 0 ? `
    <div class="ph46-empty-state" style="padding: 40px; text-align: center; background: var(--bg-card); border-radius: 16px; border: 1px solid var(--glass-border);">
      <div class="empty-icon" style="font-size:36px; margin-bottom:10px;">📋</div>
      <h3>لا توجد خدمات أو منتجات في قاعدة البيانات</h3>
      <p style="color:var(--text-muted); font-size:13px;">لم يتم العثور على أي عناصر تطابق البحث أو الفلاتر المحددة.</p>
    </div>` : `
    <div class="ph46-table-wrap">
      <table class="ph46-table">
        <thead>
          <tr>
            <th>الاسم والبيانات</th>
            <th>القسم الرئيسي</th>
            <th>السعر الأساسي</th>
            <th>عمولة المنصة</th>
            <th>ربط الموفرين</th>
            <th>الحالة</th>
            <th>العمليات</th>
          </tr>
        </thead>
        <tbody>
          ${explorerRows}
        </tbody>
      </table>
    </div>`}
  </div>`;

  return `
  <div class="ph46-container">
    ${ph46_styles()}
    
    <div class="ph46-page-header">
      <div>
        <h1 class="ph46-title">🗂️ قاعدة المنتجات والخدمات الموحدة</h1>
        <p class="ph46-subtitle">نظام الإدارة المركزي، فئات متعددة المستويات، وموافقة المزودين المباشرة</p>
      </div>
      <div class="ph46-actions-row">
        <button class="ph46-btn ph46-btn-secondary" onclick="ph46_startImportWizard()"><span class="btn-icon">📥</span> استيراد ذكي</button>
        <button class="ph46-btn ph46-btn-primary" onclick="ph46_showAddCatModal(null)"><span class="btn-icon">➕</span> فئة جديدة</button>
      </div>
    </div>

    <!-- لوحة مؤشرات الأداء الفاخرة -->
    <div class="ph46-kpis-grid">
      <div class="ph46-kpi-card">
        <div class="ph46-kpi-header">
          <span class="ph46-kpi-title">إجمالي العناصر النشطة</span>
          <span class="ph46-kpi-icon">🔷</span>
        </div>
        <div class="ph46-kpi-value">${activeItems.length}</div>
        <div class="ph46-kpi-footer">موزعة على ${totalCats} تصنيف فرعي ورئيسي</div>
      </div>
      
      <div class="ph46-kpi-card">
        <div class="ph46-kpi-header">
          <span class="ph46-kpi-title">بانتظار موافقة المدير</span>
          <span class="ph46-kpi-icon" style="color:#f59e0b">⏳</span>
        </div>
        <div class="ph46-kpi-value warning-text">${pendingItems.length}</div>
        <div class="ph46-kpi-footer">
          ${pendingItems.length > 0 
            ? `<a href="#" onclick="ph46_showPendingApprovals();return false;" class="ph46-link-action">مراجعة الطلبات المعلقة الآن ←</a>`
            : 'كل طلبات المزودين معالجة بالكامل'}
        </div>
      </div>

      <div class="ph46-kpi-card">
        <div class="ph46-kpi-header">
          <span class="ph46-kpi-title">متوسط عمولة المنصة</span>
          <span class="ph46-kpi-icon" style="color:#10b981">📊</span>
        </div>
        <div class="ph46-kpi-value success-text">${avgCommission}%</div>
        <div class="ph46-kpi-footer">تطبق تلقائياً عند إرسال عروض الأسعار</div>
      </div>

      <div class="ph46-kpi-card">
        <div class="ph46-kpi-header">
          <span class="ph46-kpi-title">توصيل المناديب</span>
          <span class="ph46-kpi-icon" style="color:#3b82f6">🚚</span>
        </div>
        <div class="ph46-kpi-value info-text">${driverRatio}%</div>
        <div class="ph46-kpi-footer">${requiresDriverCount} منتج/خدمة تتطلب مندوب توصيل</div>
      </div>
    </div>

    ${pendingItems.length > 0 ? `
    <div class="ph46-alert-banner">
      <div class="ph46-alert-content">
        <span class="ph46-alert-icon">🔔</span>
        <div>
          <strong>طلبات جديدة من مزودي الخدمات:</strong>
          <span>هناك ${pendingItems.length} منتج/خدمة مرفوعة من المزودين تتطلب المراجعة والموافقة لتظهر في المتاجر.</span>
        </div>
      </div>
      <button class="ph46-btn ph46-btn-warning ph46-btn-sm" onclick="ph46_showPendingApprovals()">مراجعة واعتماد</button>
    </div>` : ''}

    <div class="ph46-sections-list">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; flex-wrap:wrap; gap:10px;">
        <div>
          <h3 class="ph46-section-heading" style="margin-bottom:4px;">الأقسام والكتالوجات الأربعة</h3>
          <p style="color:var(--text-muted); font-size:12.5px; margin:0;">اضغط على أي قسم للدخول إلى تصنيفاته وإدارة منتجاته وخدماته</p>
        </div>
      </div>
      <div class="ph46-sections-grid">${sectionCards}</div>
    </div>

    ${explorerHTML}
  </div>`;
}

function ph46_styles() {
  return `
  <style>
    :root {
      --primary: #8b5cf6;
      --primary-hover: #7c3aed;
      --bg-card: rgba(30, 27, 57, 0.4);
      --glass-border: rgba(255, 255, 255, 0.08);
      --text-main: #f3f4f6;
      --text-muted: #9ca3af;
      --success: #10b981;
      --warning: #f59e0b;
      --danger: #ef4444;
      --info: #3b82f6;
    }

    .ph46-container {
      font-family: var(--font, 'Cairo', 'Tajawal', sans-serif);
      color: var(--text-main);
      direction: rtl;
      padding: 20px 0;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      text-rendering: optimizeLegibility;
    }

    .ph46-page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      gap: 16px;
      flex-wrap: wrap;
    }

    .ph46-title {
      
      font-size: 24px;
      font-weight: 800;
      margin: 0 0 6px 0;
      background: linear-gradient(135deg, #fff 30%, var(--text-muted) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      letter-spacing: 0 !important;
    }

    .ph46-subtitle {
      font-family: var(--font, 'Cairo', 'Tajawal', sans-serif);
      font-size: 13.5px;
      color: var(--text-muted);
      margin: 0;
    }

    .ph46-actions-row {
      display: flex;
      gap: 10px;
    }

    .ph46-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 10px 18px;
      font-size: 13.5px;
      font-weight: 600;
      font-family: var(--font, 'Cairo', 'Tajawal', sans-serif);
      letter-spacing: 0 !important;
      border-radius: 10px;
      border: 1px solid transparent;
      cursor: pointer;
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      color: #fff;
    }

    .ph46-btn-primary {
      background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%);
      box-shadow: 0 4px 15px rgba(139, 92, 246, 0.35);
    }
    .ph46-btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(139, 92, 246, 0.45);
    }

    .ph46-btn-secondary {
      background: rgba(255, 255, 255, 0.05);
      border-color: var(--glass-border);
    }
    .ph46-btn-secondary:hover {
      background: rgba(255, 255, 255, 0.1);
      transform: translateY(-1px);
    }

    .ph46-btn-warning {
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
    }
    .ph46-btn-warning:hover {
      transform: translateY(-1px);
    }

    .ph46-btn-danger {
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
      box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
    }

    .ph46-btn-sm {
      padding: 6px 12px;
      font-size: 12.5px;
      border-radius: 8px;
    }

    .ph46-btn-xs {
      padding: 4px 8px;
      font-size: 11.5px;
      border-radius: 6px;
    }

    .btn-icon {
      font-size: 15px;
    }

    /* KPIs Grid */
    .ph46-kpis-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .ph46-kpi-card {
      background: var(--bg-card);
      border: 1px solid var(--glass-border);
      border-radius: 16px;
      padding: 18px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .ph46-kpi-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .ph46-kpi-title {
      font-size: 13px;
      color: var(--text-muted);
      font-weight: 600;
    }

    .ph46-kpi-icon {
      font-size: 18px;
    }

    .ph46-kpi-value {
      font-size: 28px;
      font-weight: 800;
      margin-bottom: 10px;
    }

    .ph46-kpi-footer {
      font-size: 11.5px;
      color: var(--text-muted);
    }

    .ph46-link-action {
      color: #a78bfa;
      text-decoration: none;
      font-weight: 600;
      transition: color 0.2s;
    }
    .ph46-link-action:hover {
      color: #c084fc;
      text-decoration: underline;
    }

    /* Pulse Effect */
    .ph46-pending-pulse {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--warning);
      box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.7);
      animation: pulse 1.6s infinite;
      margin-left: 6px;
      vertical-align: middle;
    }

    @keyframes pulse {
      0% {
        transform: scale(0.95);
        box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.7);
      }
      70% {
        transform: scale(1);
        box-shadow: 0 0 0 8px rgba(245, 158, 11, 0);
      }
      100% {
        transform: scale(0.95);
        box-shadow: 0 0 0 0 rgba(245, 158, 11, 0);
      }
    }

    .warning-text { color: var(--warning); }
    .success-text { color: var(--success); }
    .info-text { color: var(--info); }
    .urgent-text { color: #f87171; }

    /* Alert Banner */
    .ph46-alert-banner {
      background: rgba(245, 158, 11, 0.12);
      border: 1px solid rgba(245, 158, 11, 0.25);
      border-radius: 12px;
      padding: 14px 18px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      gap: 16px;
      flex-wrap: wrap;
    }

    .ph46-alert-content {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 13.5px;
    }

    .ph46-alert-icon {
      font-size: 20px;
    }

    /* Section Cards */
    .ph46-sections-list {
      margin-top: 10px;
    }

    .ph46-section-heading {
      font-size: 17px;
      font-weight: 700;
      margin-bottom: 16px;
    }

    .ph46-sections-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 18px;
    }

    .ph46-card {
      background: var(--bg-card);
      border: 1px solid var(--glass-border);
      border-radius: 16px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      cursor: pointer;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .ph46-sec-card:hover {
      transform: translateY(-4px) scale(1.02);
      border-color: var(--sec-color);
      box-shadow: 0 12px 30px rgba(0,0,0,0.3), 0 0 15px rgba(255,255,255,0.02);
    }

    .ph46-sec-card-body {
      padding: 20px;
      display: flex;
      gap: 16px;
      align-items: flex-start;
      position: relative;
    }

    .ph46-sec-icon-wrap {
      width: 46px;
      height: 46px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      flex-shrink: 0;
    }

    .ph46-sec-info {
      flex-grow: 1;
    }

    .ph46-sec-title {
      font-size: 16px;
      font-weight: 750;
      margin-bottom: 6px;
    }

    .ph46-sec-desc {
      font-size: 12px;
      color: var(--text-muted);
      line-height: 1.5;
    }

    .ph46-sec-arrow {
      position: absolute;
      left: 20px;
      top: 20px;
      width: 8px;
      height: 8px;
      border-top: 2px solid var(--text-muted);
      border-left: 2px solid var(--text-muted);
      transform: rotate(-45deg);
      opacity: 0;
      transition: all 0.2s;
    }
    .ph46-sec-card:hover .ph46-sec-arrow {
      opacity: 1;
      left: 16px;
    }

    .ph46-sec-stats-bar {
      background: rgba(0,0,0,0.15);
      border-top: 1px solid var(--glass-border);
      padding: 10px 20px;
      display: flex;
      gap: 16px;
      font-size: 12px;
    }

    .ph46-sec-stat-item {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .ph46-sec-stat-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
    }

    /* Filter Bars & Inputs */
    .ph46-filter-bar {
      background: rgba(0,0,0,0.12);
      border: 1px solid var(--glass-border);
      border-radius: 12px;
      padding: 12px 16px;
      display: flex;
      gap: 12px;
      margin-bottom: 20px;
      align-items: center;
      flex-wrap: wrap;
    }

    .search-input-wrap {
      flex: 1;
      min-width: 200px;
      position: relative;
    }

    .search-icon {
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-muted);
      font-size: 15px;
    }

    .ph46-input {
      width: 100%;
      background: rgba(255,255,255,0.05);
      border: 1px solid var(--glass-border);
      border-radius: 8px;
      padding: 10px 38px 10px 14px;
      color: #fff;
      font-size: 13.5px;
      transition: all 0.2s;
    }
    .ph46-input:focus {
      background: rgba(255,255,255,0.08);
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.2);
      outline: none;
    }

    /* Breadcrumbs */
    .ph46-breadcrumb {
      display: flex;
      gap: 6px;
      font-size: 12px;
      color: var(--text-muted);
      margin-bottom: 6px;
    }
    .ph46-breadcrumb span {
      cursor: pointer;
    }
    .ph46-breadcrumb span:hover {
      color: #fff;
    }
    .ph46-breadcrumb span.current {
      color: var(--primary);
      font-weight: 600;
      cursor: default;
    }
    .ph46-breadcrumb .sep {
      color: rgba(255,255,255,0.15);
      cursor: default;
    }

    .ph46-back-btn {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      background: rgba(255,255,255,0.05);
      border: 1px solid var(--glass-border);
      color: #fff;
      font-size: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s;
    }
    .ph46-back-btn:hover {
      background: rgba(255,255,255,0.1);
      transform: scale(1.05);
    }

    /* Categories Tree */
    .ph46-cat-tree-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .ph46-cat-tree-node {
      background: var(--bg-card);
      border: 1px solid var(--glass-border);
      border-radius: 12px;
      overflow: hidden;
    }

    .ph46-cat-main-row {
      display: flex;
      align-items: center;
      padding: 14px 18px;
      gap: 12px;
      cursor: pointer;
      transition: background 0.2s;
    }
    .ph46-cat-main-row:hover {
      background: rgba(255,255,255,0.02);
    }

    .ph46-node-toggle {
      font-size: 14px;
      color: var(--text-muted);
    }

    .ph46-node-icon {
      font-size: 18px;
    }

    .ph46-node-name {
      font-weight: 700;
      font-size: 14.5px;
    }

    .ph46-node-count {
      font-size: 12px;
      color: var(--text-muted);
      background: rgba(255,255,255,0.04);
      padding: 3px 8px;
      border-radius: 20px;
    }

    .ph46-node-actions, .ph46-subcat-actions {
      margin-right: auto;
      display: flex;
      gap: 6px;
      align-items: center;
    }

    .ph46-icon-btn {
      width: 28px;
      height: 28px;
      border-radius: 6px;
      border: 1px solid var(--glass-border);
      background: rgba(255,255,255,0.03);
      color: var(--text-muted);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      font-size: 12px;
    }
    .ph46-icon-btn:hover {
      background: rgba(255,255,255,0.08);
      color: #fff;
    }
    .ph46-icon-btn.danger:hover {
      background: rgba(239, 68, 68, 0.15);
      border-color: rgba(239, 68, 68, 0.4);
      color: var(--danger);
    }

    /* Subcategories Tree */
    .ph46-subcats-container {
      background: rgba(0,0,0,0.25);
      border-top: 1px solid var(--glass-border);
      padding: 16px 30px 16px 16px; /* Right padding for RTL indentation */
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .ph46-subcat-node {
      display: flex;
      align-items: center;
      padding: 12px 18px;
      gap: 12px;
      cursor: pointer;
      transition: all 0.2s;
      background: rgba(255,255,255,0.03);
      border: 1px solid var(--glass-border);
      border-radius: 10px;
      position: relative;
    }
    
    /* Tree connection line */
    .ph46-subcat-node::before {
      content: '';
      position: absolute;
      right: -16px;
      top: 50%;
      width: 16px;
      height: 2px;
      background: var(--glass-border);
    }
    .ph46-subcats-container::before {
      content: '';
      position: absolute;
      right: 14px;
      top: 0;
      bottom: 24px;
      width: 2px;
      background: var(--glass-border);
      z-index: 0;
    }

    .ph46-subcat-node:hover {
      background: rgba(255,255,255,0.06);
      border-color: rgba(255,255,255,0.15);
      transform: translateX(-4px); /* RTL translate */
    }

    .ph46-subcat-icon {
      color: var(--primary);
      font-size: 14px;
      z-index: 1;
    }

    .ph46-subcat-name {
      font-size: 14px;
      font-weight: 600;
      z-index: 1;
    }

    .ph46-subcat-count {
      font-size: 11.5px;
      color: var(--text-muted);
      z-index: 1;
    }

    /* Badges */
    .ph46-badge {
      display: inline-flex;
      align-items: center;
      padding: 2px 8px;
      font-size: 11px;
      font-weight: 600;
      border-radius: 20px;
    }
    .badge-success { background: rgba(16,185,129,0.15); color: var(--success); }
    .badge-warning { background: rgba(245,158,11,0.15); color: var(--warning); }
    .badge-danger { background: rgba(239,68,68,0.15); color: var(--danger); }
    .badge-blue { background: rgba(59,130,246,0.15); color: var(--info); }

    /* Tables */
    .ph46-table-wrap {
      background: var(--bg-card);
      border: 1px solid var(--glass-border);
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
    }

    .ph46-table {
      width: 100%;
      border-collapse: collapse;
      text-align: right;
    }

    .ph46-table th {
      background: rgba(0,0,0,0.15);
      padding: 14px 18px;
      font-size: 12.5px;
      color: var(--text-muted);
      font-weight: 650;
      border-bottom: 1px solid var(--glass-border);
    }

    .ph46-table td {
      padding: 14px 18px;
      font-size: 13px;
      border-bottom: 1px solid var(--glass-border);
    }

    .ph46-table-row {
      transition: background 0.15s;
    }
    .ph46-table-row:hover {
      background: rgba(255,255,255,0.015);
    }

    .ph46-table-item-cell {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .ph46-item-thumbnail {
      width: 40px;
      height: 40px;
      border-radius: 8px;
      background: rgba(255,255,255,0.03);
      border: 1px solid var(--glass-border);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      overflow: hidden;
      flex-shrink: 0;
    }
    .ph46-item-thumbnail img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .ph46-item-table-name {
      font-weight: 700;
      cursor: pointer;
    }
    .ph46-item-table-name:hover {
      color: var(--primary);
    }

    .ph46-item-table-provider {
      font-size: 11px;
      color: var(--text-muted);
      margin-top: 2px;
    }

    .providers-count-badge {
      display: inline-flex;
      align-items: center;
      padding: 4px 10px;
      font-size: 11.5px;
      background: rgba(255,255,255,0.05);
      border: 1px solid var(--glass-border);
      border-radius: 20px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    .providers-count-badge:hover {
      background: rgba(255,255,255,0.1);
      color: #fff;
    }

    .ph46-row-actions {
      display: flex;
      gap: 6px;
      align-items: center;
    }

    /* Modal Grid & Inputs */
    .ph46-modal-grid {
      margin-bottom: 12px;
    }

    .ph46-input-inline {
      background: rgba(255,255,255,0.06);
      border: 1px solid var(--glass-border);
      border-radius: 6px;
      color: #fff;
      transition: border-color 0.2s;
      outline: none;
      text-align: center;
    }
    .ph46-input-inline:focus {
      border-color: var(--primary);
    }

    .ph46-provider-mapping-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px;
      background: rgba(255,255,255,0.02);
      border: 1px solid var(--glass-border);
      border-radius: 10px;
      margin-bottom: 10px;
      transition: background 0.2s;
    }
    .ph46-provider-mapping-row:hover {
      background: rgba(255,255,255,0.04);
    }

    /* Media Manager */
    .ph46-media-gallery {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
      gap: 10px;
      margin-top: 10px;
    }

    .ph46-media-card {
      position: relative;
      aspect-ratio: 1;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid var(--glass-border);
      background: rgba(0,0,0,0.2);
    }
    .ph46-media-card img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .ph46-media-card.is-cover {
      border-color: var(--warning);
      box-shadow: 0 0 10px rgba(245, 158, 11, 0.4);
    }

    .ph46-media-overlay {
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.6);
      opacity: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: opacity 0.2s;
    }
    .ph46-media-card:hover .ph46-media-overlay {
      opacity: 1;
    }

    .ph46-media-btn {
      width: 26px;
      height: 26px;
      border-radius: 50%;
      border: none;
      background: rgba(255,255,255,0.9);
      color: #000;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      transition: transform 0.2s;
    }
    .ph46-media-btn:hover {
      transform: scale(1.1);
    }
    .ph46-media-btn.danger {
      background: var(--danger);
      color: #fff;
    }

    .cover-star {
      position: absolute;
      top: 4px;
      right: 4px;
      background: rgba(0,0,0,0.6);
      border-radius: 4px;
      padding: 1px 4px;
      font-size: 10px;
      color: var(--warning);
      font-weight: 700;
    }

    /* Smart Wizard step progress bar */
    .ph46-wizard-progress-bar {
      background: var(--bg-card);
      border: 1px solid var(--glass-border);
      border-radius: 12px;
      padding: 14px 24px;
    }
    .step-progress-node.active .step-num {
      background: var(--primary) !important;
      border-color: var(--primary) !important;
      box-shadow: 0 0 10px rgba(139, 92, 246, 0.4);
    }
    .step-progress-node.active .step-label {
      color: #fff !important;
    }
    .step-progress-line.active {
      background: var(--primary) !important;
    }

    /* Grid layout in Step 3 */
    .ph46-grid-table th {
      padding: 10px 12px;
      font-size: 12px;
      font-weight: 600;
      color: var(--text-muted);
      border-bottom: 1px solid var(--glass-border);
      text-align: right;
    }
    .ph46-grid-table td {
      padding: 8px 12px;
      font-size: 12px;
      border-bottom: 1px solid var(--glass-border);
    }
  </style>
  `;
}

// ═══════════════════════════════════════════════════════
//  عرض قائمة فئات وتصنيفات فرعية (شجري)
// ═══════════════════════════════════════════════════════

function ph46_renderCatsList() {
  const st = State._ph46;
  const sec = PH46_SECTIONS.find(s => s.id === st.section);
  const allCats = AppData.catalogCats || [];
  
  // تصفية الفئات الرئيسية فقط (التي ليس لها والد)
  const mainCats = allCats.filter(c => c.sectionId === st.section && !c.parentId).sort((a,b) => (a.order||0)-(b.order||0));
  const allItems = AppData.catalogItems || [];
  const q = (st.search || '').toLowerCase();

  const treeHTML = mainCats.map(cat => {
    // إيجاد الفئات الفرعية لهذه الفئة لحساب الإجمالي فقط
    const subCats = allCats.filter(c => c.parentId === cat.id).sort((a,b) => (a.order||0)-(b.order||0));
    
    // عدد العناصر في الفئة الرئيسية وأبنائها
    const getCatItemsCount = (cId) => allItems.filter(i => i.catId === cId && i.status === 'active').length;
    const getCatPendingCount = (cId) => allItems.filter(i => i.catId === cId && i.status === 'pending_approval').length;
    
    let totalActiveCount = getCatItemsCount(cat.id);
    let totalPendingCount = getCatPendingCount(cat.id);
    
    subCats.forEach(sc => {
      totalActiveCount += getCatItemsCount(sc.id);
      totalPendingCount += getCatPendingCount(sc.id);
    });

    const catTypeBadge = st.section === 'bookings'
      ? `<span class="ph46-badge" style="background:${cat.catType === 'rental' ? 'rgba(234,179,8,0.15)' : 'rgba(16,185,129,0.15)'}; color:${cat.catType === 'rental' ? '#eab308' : '#10b981'}; font-size:11px; margin-right:8px; padding:2px 6px; border-radius:6px; border:1px solid ${cat.catType === 'rental' ? 'rgba(234,179,8,0.3)' : 'rgba(16,185,129,0.3)'}">
          ${cat.catType === 'rental' ? '🏷️ متجر تأجير' : '📅 خدمة حجز'}
         </span>`
      : '';

    return `
    <div class="ph46-cat-tree-node">
      <div class="ph46-cat-main-row" onclick="ph46_goCat('${cat.id}')">
        <span class="ph46-node-toggle">📂</span>
        <span class="ph46-node-icon">${cat.icon || '📁'}</span>
        <span class="ph46-node-name">${escHtml(cat.name)} ${catTypeBadge}</span>
        <span class="ph46-node-count">📦 إجمالي: ${totalActiveCount} نشط ${totalPendingCount > 0 ? `<span class="ph46-badge badge-warning">${totalPendingCount} معلق</span>` : ''}</span>
        <div class="ph46-node-actions" onclick="event.stopPropagation()">
          <button class="ph46-btn ph46-btn-xs ph46-btn-secondary" onclick="ph46_showAddCatModal('${st.section}', '${cat.id}')">➕ فئة فرعية</button>
          <button class="ph46-icon-btn" onclick="ph46_showEditCatModal('${cat.id}')">✏️</button>
          <button class="ph46-icon-btn danger" onclick="ph46_deleteCat('${cat.id}')">🗑️</button>
        </div>
      </div>
    </div>`;
  }).join('');

  return `
  <div class="ph46-container">
    ${ph46_styles()}
    
    <div class="ph46-page-header">
      <div style="display:flex;align-items:center;gap:12px">
        <button class="ph46-back-btn" onclick="ph46_goBack('main')">←</button>
        <div>
          <div class="ph46-breadcrumb">
            <span onclick="ph46_goBack('main')">الكتالوج الموحد</span>
            <span class="sep">/</span>
            <span class="current">${sec?.label}</span>
          </div>
          <h1 class="ph46-title">${sec?.icon} إدارة تصنيفات ${sec?.label}</h1>
        </div>
      </div>
      <div class="ph46-actions-row">
        <button class="ph46-btn ph46-btn-secondary" onclick="ph46_showAddCatModal('${st.section}', null)">➕ فئة رئيسية</button>
        <button class="ph46-btn ph46-btn-primary" onclick="ph46_showAddItemModalDirect('${st.section}', null)">➕ إضافة ${sec?.itemLabel || 'عنصر'}</button>
      </div>
    </div>

    <div class="ph46-filter-bar">
      <div class="search-input-wrap">
        <span class="search-icon">🔍</span>
        <input type="text" class="ph46-input" placeholder="بحث في الفئات..." value="${st.search||''}"
          oninput="State._ph46.search=this.value;render()">
      </div>
      <button class="ph46-btn ph46-btn-secondary" onclick="ph46_startImportWizard('${st.section}')">📥 استيراد Excel للقسم</button>
    </div>

    ${mainCats.length === 0 ? `
    <div class="ph46-empty-state" style="padding: 40px; text-align: center; background: var(--bg-card); border-radius: 20px; border: 1px solid var(--glass-border);">
      <div class="empty-icon" style="font-size:40px; margin-bottom:12px;">📂</div>
      <h3>لا توجد فئات وتصنيفات في هذا القسم</h3>
      <p style="color:var(--text-muted); font-size:13px; margin-bottom:16px;">ابدأ بإنشاء أول فئة رئيسية لترتيب الخدمات والمنتجات بداخلها.</p>
      <button class="ph46-btn ph46-btn-primary" onclick="ph46_showAddCatModal('${st.section}', null)">إنشاء فئة رئيسية</button>
    </div>` : `
    <div class="ph46-cat-tree-list">${treeHTML}</div>`}
  </div>`;
}

// ═══════════════════════════════════════════════════════
//  إدارة الفئات الفرعية والمودال
// ═══════════════════════════════════════════════════════

window.ph46_showAddCatModal = function(sectionId, parentId = null) {
  const sections = PH46_SECTIONS;
  const targetSection = sectionId || State._ph46?.section || null;
  const allCats = AppData.catalogCats || [];
  const parentCat = parentId ? allCats.find(c => c.id === parentId) : null;
  const parentCatType = parentCat ? (parentCat.catType || 'booking') : null;
  const showSectionSelector = !targetSection && !parentId;

  openModal(`
    <div class="modal-header">
      <h2 class="modal-title">${parentId ? `📂 إضافة فئة فرعية تحت (${parentCat?.name})` : '📂 إضافة فئة رئيسية جديدة'}</h2>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="form-group" ${showSectionSelector ? '' : 'style="display:none;"'}>
      <label class="form-label">القسم الرئيسي ${showSectionSelector ? '*' : ''}</label>
      <select class="form-control" id="ph46-cat-section" ${parentId ? 'disabled' : ''}>
        ${showSectionSelector ? `<option value="">— اختر القسم —</option>` : ''}
        ${sections.map(s => `<option value="${s.id}" ${s.id===(targetSection||'bookings')?'selected':''}>${s.icon} ${s.label}</option>`).join('')}
      </select>
    </div>
    
    ${targetSection === 'bookings' ? `
    <div class="form-group" ${parentCat ? 'style="display: none;"' : ''}>
      <label class="form-label" style="font-weight: 700;">نوع فئة الحجز *</label>
      <select class="form-control" id="ph46-cat-type">
        <option value="booking" ${parentCatType === 'booking' || !parentCatType ? 'selected' : ''}>📅 خدمة حجز (عادية)</option>
        <option value="rental" ${parentCatType === 'rental' ? 'selected' : ''}>🏷️ متجر تأجير (منتجات)</option>
      </select>
    </div>
    ` : ''}

    <div class="ph46-modal-grid" style="display:grid; grid-template-columns:1fr 1fr; gap:12px">
      <div class="form-group">
        <label class="form-label">اسم الفئة *</label>
        <input class="form-control" id="ph46-cat-name" placeholder="مثال: شقق فندقية، صيدليات...">
      </div>
      <div class="form-group">
        <label class="form-label">أيقونة الفئة</label>
        <input class="form-control" id="ph46-cat-icon" placeholder="📁" style="font-size:20px">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">ترتيب العرض</label>
      <input class="form-control" id="ph46-cat-order" type="number" value="0">
    </div>
    <button class="ph46-btn ph46-btn-primary btn-block" style="margin-top:16px; width:100%" onclick="ph46_saveCat('${parentId || ''}')">💾 حفظ البيانات</button>
  `);
};

window.ph46_saveCat = async function(parentId = '') {
  const sectionId = document.getElementById('ph46-cat-section')?.value;
  const name = document.getElementById('ph46-cat-name')?.value.trim();
  const icon = document.getElementById('ph46-cat-icon')?.value.trim();
  const order = parseInt(document.getElementById('ph46-cat-order')?.value) || 0;
  const catType = document.getElementById('ph46-cat-type')?.value || 'booking';
  
  if (!sectionId) { toast('يرجى اختيار القسم الرئيسي أولاً', 'error'); return; }
  if (!name) { toast('يرجى كتابة اسم الفئة', 'error'); return; }

  showLoader();
  try {
    const catData = {
      sectionId,
      name,
      icon: icon || '📁',
      order,
      parentId: parentId || null,
      catType: sectionId === 'bookings' ? catType : null
    };
    await fsAdd('catalog_cats', catData);
    await ph46_reloadData();
    hideLoader(); closeModal(); toast('تم حفظ الفئة بنجاح ✅', 'success'); render();
  } catch(e) { hideLoader(); toast('خطأ: ' + e.message, 'error'); }
};

window.ph46_showEditCatModal = function(id) {
  const cat = (AppData.catalogCats || []).find(c => c.id === id);
  if (!cat) return;

  openModal(`
    <div class="modal-header">
      <h2 class="modal-title">✏️ تعديل الفئة (${cat.name})</h2>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    
    ${cat.sectionId === 'bookings' ? `
    <div class="form-group" ${cat.parentId ? 'style="display: none;"' : ''}>
      <label class="form-label" style="font-weight: 700;">نوع فئة الحجز *</label>
      <select class="form-control" id="ph46-edit-cat-type">
        <option value="booking" ${cat.catType !== 'rental' ? 'selected' : ''}>📅 خدمة حجز (عادية)</option>
        <option value="rental" ${cat.catType === 'rental' ? 'selected' : ''}>🏷️ متجر تأجير (منتجات)</option>
      </select>
    </div>
    ` : ''}

    <div class="form-group">
      <label class="form-label">اسم الفئة *</label>
      <input class="form-control" id="ph46-edit-cat-name" value="${escAttr(cat.name)}" placeholder="الاسم...">
    </div>
    <div class="form-group">
      <label class="form-label">أيقونة الفئة</label>
      <input class="form-control" id="ph46-edit-cat-icon" value="${escAttr(cat.icon || '📁')}" style="font-size:20px">
    </div>
    <div class="form-group">
      <label class="form-label">ترتيب العرض</label>
      <input class="form-control" id="ph46-edit-cat-order" type="number" value="${cat.order || 0}">
    </div>
    <button class="ph46-btn ph46-btn-primary btn-block" style="margin-top:16px; width:100%" onclick="ph46_updateCat('${id}')">💾 حفظ التغييرات</button>
  `);
};

window.ph46_updateCat = async function(id) {
  const cat = (AppData.catalogCats || []).find(c => c.id === id);
  const name = document.getElementById('ph46-edit-cat-name')?.value.trim();
  const icon = document.getElementById('ph46-edit-cat-icon')?.value.trim();
  const order = parseInt(document.getElementById('ph46-edit-cat-order')?.value) || 0;
  const catType = document.getElementById('ph46-edit-cat-type')?.value || null;

  if (!name) { toast('يرجى كتابة اسم الفئة', 'error'); return; }

  showLoader();
  try {
    const updateData = { name, icon: icon || '📁', order };
    if (cat && cat.sectionId === 'bookings' && catType) {
      updateData.catType = catType;
    }
    await fsUpdate('catalog_cats', id, updateData);
    await ph46_reloadData();
    hideLoader(); closeModal(); toast('تم تحديث الفئة بنجاح ✅', 'success'); render();
  } catch(e) { hideLoader(); toast('خطأ: ' + e.message, 'error'); }
};

window.ph46_deleteCat = async function(id) {
  if (!confirm('هل أنت متأكد من حذف هذه الفئة بالكامل؟ (سيؤدي ذلك إلى حذف فئاتها الفرعية أيضاً)')) return;

  showLoader();
  try {
    await fsDelete('catalog_cats', id);
    // حذف الفئات الفرعية المربوطة
    const subcats = (AppData.catalogCats || []).filter(c => c.parentId === id);
    for (const sc of subcats) {
      await fsDelete('catalog_cats', sc.id);
    }
    await ph46_reloadData();
    hideLoader(); toast('تم حذف الفئة بنجاح 🗑️', 'success'); render();
  } catch(e) { hideLoader(); toast('خطأ: ' + e.message, 'error'); }
};

// ═══════════════════════════════════════════════════════
//  عرض قائمة المنتجات والخدمات (جدول وعروض مفصلة)
// ═══════════════════════════════════════════════════════

function ph46_renderItemsList() {
  const st = State._ph46;
  const sec = PH46_SECTIONS.find(s => s.id === st.section);
  const cat = (AppData.catalogCats || []).find(c => c.id === st.catId);
  const q = (st.search || '').toLowerCase();
  const filterStatus = st.filterStatus || 'active';

  let items = (AppData.catalogItems || []).filter(i => i.catId === st.catId);
  if (filterStatus !== 'all') items = items.filter(i => i.status === filterStatus);
  if (q) items = items.filter(i => (i.name||'').toLowerCase().includes(q) || (i.provider||'').toLowerCase().includes(q));

  items.sort((a,b) => (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0));

  const allItemsOfCat = (AppData.catalogItems||[]).filter(i => i.catId === st.catId);
  const activeCount = allItemsOfCat.filter(i => i.status === 'active').length;
  const pendingCount = allItemsOfCat.filter(i => i.status === 'pending_approval').length;

  const allCats = AppData.catalogCats || [];
  const isSubCat = !!cat?.parentId;
  const parentCat = isSubCat ? allCats.find(c => c.id === cat.parentId) : null;
  const rawSubCats = allCats.filter(c => c.parentId === st.catId).sort((a,b) => (a.order||0)-(b.order||0));

  const subCatsHTML = (function() {
    if (!rawSubCats.length) return '';
    const subCatQ = (st.subCatSearch || '').toLowerCase().trim();
    const filteredSubCats = subCatQ 
      ? rawSubCats.filter(sc => (sc.name || '').toLowerCase().includes(subCatQ))
      : rawSubCats;

    const subItems = filteredSubCats.map(sc => {
      const scActiveCount = (AppData.catalogItems||[]).filter(i => i.catId === sc.id && i.status === 'active').length;
      const scPendingCount = (AppData.catalogItems||[]).filter(i => i.catId === sc.id && i.status === 'pending_approval').length;
      const pendingBadge = scPendingCount > 0 ? '<span class="ph46-badge badge-warning">' + scPendingCount + ' معلق</span>' : '';
      const catTypeBadge = st.section === 'bookings'
        ? '<span class="ph46-badge" style="background:' + (sc.catType === 'rental' ? 'rgba(234,179,8,0.15)' : 'rgba(16,185,129,0.15)') + '; color:' + (sc.catType === 'rental' ? '#eab308' : '#10b981') + '; font-size:11px; margin-right:8px; padding:2px 6px; border-radius:6px; border:1px solid ' + (sc.catType === 'rental' ? 'rgba(234,179,8,0.3)' : 'rgba(16,185,129,0.3)') + '">' + (sc.catType === 'rental' ? '🏷️ متجر تأجير' : '📅 خدمة حجز') + '</span>'
        : '';
      return '<div class="ph46-cat-tree-node">'
        + '<div class="ph46-cat-main-row" onclick="ph46_goCat(\'' + sc.id + '\')">'
        + '<span class="ph46-node-icon">' + (sc.icon || '📁') + '</span>'
        + '<span class="ph46-node-name">' + escHtml(sc.name) + ' ' + catTypeBadge + '</span>'
        + '<span class="ph46-node-count">📦 إجمالي: ' + scActiveCount + ' نشط ' + pendingBadge + '</span>'
        + '<div class="ph46-node-actions" onclick="event.stopPropagation()">'
        + '<button class="ph46-icon-btn" onclick="ph46_showEditCatModal(\'' + sc.id + '\')">✏️</button>'
        + '<button class="ph46-icon-btn danger" onclick="ph46_deleteCat(\'' + sc.id + '\')">🗑️</button>'
        + '</div></div></div>';
    }).join('');

    const searchBar = rawSubCats.length > 1 ? `
      <div class="search-input-wrap" style="margin-bottom: 16px; max-width: 400px; position: relative;">
        <span class="search-icon" style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); color: var(--text-muted); font-size: 14px;">🔍</span>
        <input type="text" class="ph46-input" placeholder="بحث في الفئات الفرعية..." value="${escAttr(st.subCatSearch || '')}"
          style="padding-right: 36px; width: 100%; border-radius: 8px; height: 38px; font-size: 13px;"
          oninput="State._ph46.subCatSearch=this.value;render()">
      </div>
    ` : '';

    return '<div class="ph46-subcats-section" style="margin-bottom:32px;">'
      + '<h3 style="font-size:16px;margin-bottom:12px;display:flex;align-items:center;gap:8px;">📂 الفئات الفرعية التابعة لـ (' + escHtml(cat ? cat.name : '') + ')</h3>'
      + searchBar
      + '<div class="ph46-cat-tree-list">' 
      + (subItems || '<div style="color:var(--text-muted); font-size:13px; padding:12px; text-align:center; background:rgba(255,255,255,0.01); border-radius:8px;">لا توجد فئات فرعية مطابقة للبحث.</div>') 
      + '</div>'
      + '</div>';
  })();

  const rows = items.map(item => {
    const mainImg = item.mainImage || (item.images && item.images[0]) || '';
    const linkedProvidersCount = (item.linkedProviders || []).length;
    const skuBadge = item.sku
      ? `<span style="display:inline-block;font-family:monospace;font-size:11px;font-weight:700;background:rgba(139,92,246,0.12);color:#8b5cf6;border:1px solid rgba(139,92,246,0.25);border-radius:5px;padding:2px 7px;margin-top:3px;letter-spacing:0.5px;">#${escHtml(item.sku)}</span>`
      : '';

    return `
    <tr class="ph46-table-row">
      <td>
        <div class="ph46-table-item-cell">
          <div class="ph46-item-thumbnail">
            ${mainImg ? `<img src="${mainImg}">` : `<span>${sec?.icon}</span>`}
          </div>
          <div>
            <div class="ph46-item-table-name" onclick="ph46_showEditItemModal('${item.id}')">${escHtml(item.name)}</div>
            <div class="ph46-item-table-provider">${item.provider ? `مقدم رئيسي: ${escHtml(item.provider)}` : 'لا يوجد مقدم رئيسي'}</div>
            ${skuBadge}
          </div>
        </div>
      </td>
      <td>
        ${item.priceType === 'agreement' 
          ? `<span class="ph46-badge badge-blue">🤝 بعد الاتفاق</span>`
          : `<strong>${item.price || 0} ريال</strong>`}
      </td>
      <td>
        <span class="commission-text" style="font-weight:700">${item.commission || 0}%</span>
      </td>
      <td>
        <span class="providers-count-badge" onclick="ph46_showProvidersMappingModal('${item.id}')">
          👥 ${linkedProvidersCount} موفرين
        </span>
      </td>
      <td>
        ${item.status === 'active' 
          ? `<span class="ph46-badge badge-success">نشط</span>` 
          : item.status === 'pending_approval' 
            ? `<span class="ph46-badge badge-warning">معلق</span>` 
            : `<span class="ph46-badge badge-danger">مرفوض</span>`}
      </td>
      <td>
        <div class="ph46-row-actions">
          ${item.status === 'pending_approval' ? `
            <button class="ph46-btn ph46-btn-xs ph46-btn-success" onclick="ph46_approveItem('${item.id}')">✅ قبول</button>
            <button class="ph46-btn ph46-btn-xs ph46-btn-danger" onclick="ph46_rejectItem('${item.id}')">❌ رفض</button>
          ` : ''}
          <button class="ph46-icon-btn" onclick="ph46_showEditItemModal('${item.id}')" title="تعديل">✏️</button>
          <button class="ph46-icon-btn danger" onclick="ph46_deleteItem('${item.id}')" title="حذف">🗑️</button>
        </div>
      </td>
    </tr>`;
  }).join('');

  return `
  <div class="ph46-container">
    ${ph46_styles()}

    <div class="ph46-page-header">
      <div style="display:flex;align-items:center;gap:12px">
        <button class="ph46-back-btn" onclick="${parentCat ? `ph46_goCat('${parentCat.id}')` : `ph46_goBack('section')`} ">←</button>
        <div>
          <div class="ph46-breadcrumb">
            <span onclick="ph46_goBack('main')">الكتالوج الموحد</span>
            <span class="sep">/</span>
            <span onclick="ph46_goBack('section')">${sec?.label}</span>
            ${parentCat ? `
            <span class="sep">/</span>
            <span onclick="ph46_goCat('${parentCat.id}')">${parentCat.name}</span>
            ` : ''}
            <span class="sep">/</span>
            <span class="current">${cat?.name}</span>
          </div>
          <h1 class="ph46-title">${cat?.icon || '📁'} ${cat?.name}</h1>
        </div>
      </div>
      <div class="ph46-actions-row">
        ${!isSubCat ? `<button class="ph46-btn ph46-btn-secondary" onclick="ph46_showAddCatModal('${st.section}', '${st.catId}')">➕ فئة فرعية</button>` : ''}
        ${isSubCat ? (() => {
          const isRentalCat = st.section === 'bookings' && cat?.catType === 'rental';
          const btnLabel = isRentalCat ? 'منتج تأجير' : (sec?.itemLabel || 'عنصر');
          return `<button class="ph46-btn ph46-btn-primary" onclick="ph46_showAddItemModalDirect('${st.section}', '${st.catId}')">➕ إضافة ${btnLabel}</button>`;
        })() : ''}
      </div>
    </div>

    ${subCatsHTML}

    ${isSubCat ? `
    <div class="ph46-items-section">
      <h3 style="font-size: 16px; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
        📦 العناصر المضافة بداخل (${escHtml(cat?.name || '')})
      </h3>
    <!-- فلترة التبويبات -->
    <div class="ph46-tabs-row" style="display:flex; gap:8px; margin-bottom:16px;">
      <button class="ph46-btn ${filterStatus === 'active' ? 'ph46-btn-primary' : 'ph46-btn-secondary'} ph46-btn-sm" onclick="State._ph46.filterStatus='active';render()">
        نشط (${activeCount})
      </button>
      <button class="ph46-btn ${filterStatus === 'pending_approval' ? 'ph46-btn-primary' : 'ph46-btn-secondary'} ph46-btn-sm" onclick="State._ph46.filterStatus='pending_approval';render()">
        بانتظار الموافقة (${pendingCount})
      </button>
      <button class="ph46-btn ${filterStatus === 'all' ? 'ph46-btn-primary' : 'ph46-btn-secondary'} ph46-btn-sm" onclick="State._ph46.filterStatus='all';render()">
        الكل (${allItemsOfCat.length})
      </button>
    </div>

    <div class="ph46-filter-bar">
      <div class="search-input-wrap">
        <span class="search-icon">🔍</span>
        <input type="text" class="ph46-input" placeholder="بحث بالاسم أو مقدم الخدمة..." value="${st.search||''}"
          oninput="State._ph46.search=this.value;render()">
      </div>
      <button class="ph46-btn ph46-btn-secondary" onclick="ph46_startImportWizard('${st.section}', '${st.catId}')">📥 استيراد Excel لهذه الفئة</button>
    </div>

    ${items.length === 0 ? `
    <div class="ph46-empty-state" style="padding: 40px; text-align: center; background: var(--bg-card); border-radius: 20px; border: 1px solid var(--glass-border);">
      <div class="empty-icon" style="font-size:40px; margin-bottom:12px;">📋</div>
      <h3>لا توجد عناصر مطابقة</h3>
      <p style="color:var(--text-muted); font-size:13px;">لم يتم العثور على خدمات أو منتجات في هذا التصنيف حالياً.</p>
    </div>` : `
    <div class="ph46-table-wrap">
      <table class="ph46-table">
        <thead>
          <tr>
            <th>الاسم والبيانات</th>
            <th>السعر الأساسي</th>
            <th>عمولة المنصة</th>
            <th>ربط الموفرين</th>
            <th>الحالة</th>
            <th>العمليات</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>`}
    </div>` : `
    ${allItemsOfCat.length > 0 ? `
    <div style="margin-top: 24px; padding: 20px; background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 12px; text-align: right; direction: rtl;">
      <h4 style="color: #ef4444; margin-top: 0; margin-bottom: 8px; display: flex; align-items: center; gap: 8px; font-size: 15px;">
        ⚠️ تنبيه: تم العثور على (${allItemsOfCat.length}) عناصر مضافة بشكل خاطئ بداخل هذه الفئة الرئيسية مباشرةً!
      </h4>
      <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px;">
        يُرجى تعديل هذه العناصر ونقلها إلى إحدى الفئات الفرعية الصحيحة لتظهر للعملاء بشكل سليم:
      </p>
      <div class="ph46-table-wrap">
        <table class="ph46-table">
          <thead>
            <tr>
              <th>الاسم والبيانات</th>
              <th>السعر الأساسي</th>
              <th>العمليات</th>
            </tr>
          </thead>
          <tbody>
            ${allItemsOfCat.map(item => `
              <tr class="ph46-table-row">
                <td>
                  <div style="font-weight: 600; color: #ef4444; cursor: pointer;" onclick="ph46_showEditItemModal('${item.id}')">${escHtml(item.name)}</div>
                  <div style="font-size: 11px; color: var(--text-muted);">${item.provider ? `مقدم رئيسي: ${escHtml(item.provider)}` : 'لا يوجد مقدم رئيسي'}</div>
                  ${item.sku ? `<div style="display:inline-block;font-family:monospace;font-size:10px;font-weight:700;background:rgba(239,68,68,0.12);color:#ef4444;border:1px solid rgba(239,68,68,0.25);border-radius:5px;padding:2px 7px;margin-top:3px;letter-spacing:0.5px;">#${escHtml(item.sku)}</div>` : ''}
                </td>
                <td>
                  <strong>${item.price || 0} ريال</strong>
                </td>
                <td>
                  <div class="ph46-row-actions">
                    <button class="ph46-btn ph46-btn-xs ph46-btn-primary" onclick="ph46_showEditItemModal('${item.id}')">✏️ نقل للفئة الفرعية</button>
                    <button class="ph46-icon-btn danger" onclick="ph46_deleteItem('${item.id}')" title="حذف">🗑️</button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
    ` : ''}
    `}
  </div>`;
}

// ═══════════════════════════════════════════════════════
//  الطلبات المعلقة (Pending Approvals Global View)
// ═══════════════════════════════════════════════════════

window.ph46_showPendingApprovals = function() {
  const pendingItems = (AppData.catalogItems || []).filter(i => i.status === 'pending_approval');

  const rows = pendingItems.map(item => {
    const sec = PH46_SECTIONS.find(s => s.id === item.sectionId);
    const cat = (AppData.catalogCats || []).find(c => c.id === item.catId);
    return `
    <div class="ph46-provider-mapping-row" style="flex-direction:row; justify-content:space-between; gap:16px;">
      <div>
        <div style="font-weight:700; color:var(--text-main); font-size:14px; display:flex; align-items:center; gap:8px;">
          <span>${escHtml(item.name)}</span>
          ${item.sku ? `<span style="font-family:monospace;font-size:11px;font-weight:700;background:rgba(139,92,246,0.12);color:#8b5cf6;border:1px solid rgba(139,92,246,0.25);border-radius:5px;padding:2px 7px;letter-spacing:0.5px;">#${escHtml(item.sku)}</span>` : ''}
        </div>
        <div style="font-size:12px; color:var(--text-muted); margin-top:2px;">
          القسم: ${sec?.icon || ''} ${sec?.label || ''} | التصنيف: ${cat?.name || '—'}
          ${item.provider ? ` | مقدم الطلب: <strong>${escHtml(item.provider)}</strong>` : ''}
        </div>
      </div>
      <div style="display:flex; gap:8px;">
        <button class="ph46-btn ph46-btn-xs ph46-btn-success" onclick="ph46_approveItem('${item.id}', true)">✅ قبول</button>
        <button class="ph46-btn ph46-btn-xs ph46-btn-danger" onclick="ph46_rejectItem('${item.id}', true)">❌ رفض</button>
      </div>
    </div>`;
  }).join('');

  openModal(`
    <div class="modal-header">
      <h2 class="modal-title">⏳ طلبات الإضافة المعلقة للموافقة</h2>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div style="max-height:60vh; overflow-y:auto; padding-right:4px">
      ${rows || '<div style="padding:30px; text-align:center; color:var(--text-muted)">لا توجد طلبات معلقة بانتظار المراجعة حالياً ✅</div>'}
    </div>
  `, 'large');
};

window.ph46_approveItem = async function(id, refreshModal = false) {
  showLoader();
  try {
    await fsUpdate('product_catalog', id, { status: 'active' });
    await ph46_reloadData();
    hideLoader();
    toast('تمت الموافقة على الخدمة وتفعيلها ✅', 'success');
    if (refreshModal) ph46_showPendingApprovals();
    else render();
  } catch(e) { hideLoader(); toast('خطأ: ' + e.message, 'error'); }
};

window.ph46_rejectItem = async function(id, refreshModal = false) {
  const reason = prompt('يرجى إدخال سبب الرفض (سيتم إرساله للمزود):');
  if (reason === null) return; // إلغاء

  showLoader();
  try {
    await fsUpdate('product_catalog', id, { status: 'rejected', rejectionReason: reason });
    await ph46_reloadData();
    hideLoader();
    toast('تم رفض الطلب بنجاح ❌', 'info');
    if (refreshModal) ph46_showPendingApprovals();
    else render();
  } catch(e) { hideLoader(); toast('خطأ: ' + e.message, 'error'); }
};

window.ph46_deleteItem = async function(id) {
  if (!confirm('هل أنت متأكد من حذف هذا المنتج/الخدمة نهائياً من الكتالوج؟')) return;

  showLoader();
  try {
    await fsDelete('product_catalog', id);
    await ph46_reloadData();
    hideLoader();
    toast('تم حذف العنصر بنجاح 🗑️', 'success');
    render();
  } catch(e) { hideLoader(); toast('خطأ: ' + e.message, 'error'); }
};

// ═══════════════════════════════════════════════════════
//  لوحة ربط موفري الخدمة (Provider Mapping) — Phase 47
//  المصدر: قاعدة بيانات المزودين (pdb_entries)
// ═══════════════════════════════════════════════════════

window.ph46_showProvidersMappingModal = function(itemId, _searchQ) {
  const item = (AppData.catalogItems || []).find(i => i.id === itemId);
  if (!item) return;

  const linked   = item.linkedProviders || [];
  const sq       = (_searchQ || '').toLowerCase().trim();

  // ── مزودو قاعدة البيانات الجديدة ─────────────────────
  const dbProviders = typeof pdb_getAllProvidersList === 'function'
    ? pdb_getAllProvidersList()
    : [];

  // ── مزودو المنصة (احتياطي — حسابات vendor/tech) ───────
  const userProviders = (AppData.users || [])
    .filter(u => u.role === 'provider' || u.role === 'tech' || u.role === 'vendor')
    .filter(u => !dbProviders.some(d => d.linkedUserId === u.id));

  // ── فلترة البحث ────────────────────────────────────────
  const filteredDb   = sq ? dbProviders.filter(p =>
    (p.name||'').toLowerCase().includes(sq) ||
    (p.catName||'').toLowerCase().includes(sq) ||
    (p.subcatName||'').toLowerCase().includes(sq) ||
    (p.phone||'').includes(sq)
  ) : dbProviders;

  const filteredUsers = sq ? userProviders.filter(u =>
    (u.name||'').toLowerCase().includes(sq) || (u.phone||'').includes(sq)
  ) : userProviders;

  // ── بناء صفوف مزودي القاعدة ────────────────────────────
  const dbRows = filteredDb.map(p => {
    const linkKey    = p.id;
    const isLinked   = linked.some(l => l.pdbId === linkKey);
    const linkDetail = linked.find(l => l.pdbId === linkKey);
    const addrCount  = (p.addresses || []).length;
    return `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:13px 0;border-bottom:1px solid var(--glass-border);gap:12px;flex-wrap:wrap">
      <div style="display:flex;align-items:center;gap:12px;flex:1;min-width:0">
        <div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,var(--primary),#7c3aed);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:16px;flex-shrink:0">
          ${(p.name||'م').charAt(0)}
        </div>
        <div style="min-width:0">
          <div style="font-weight:800;font-size:14px;color:var(--text-main)">${escHtml(p.name)}</div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:2px">
            🏢 ${escHtml(p.catName)} › ${escHtml(p.subcatName)}
            ${p.phone ? ` · 📞 ${escHtml(p.phone)}` : ''}
            · 📍 ${addrCount} ${addrCount === 1 ? 'عنوان' : 'عناوين'}
          </div>
          ${isLinked && linkDetail?.customPrice ? `<div style="font-size:11px;color:#10b981;margin-top:2px">💰 سعر مخصص: ${linkDetail.customPrice} ر.ي</div>` : ''}
        </div>
      </div>
      <div style="display:flex;gap:6px;align-items:center;flex-shrink:0">
        ${isLinked ? `
          <input type="number" placeholder="سعر مخصص" value="${linkDetail?.customPrice || ''}"
            onchange="ph46_updateProviderPrice('${item.id}','${linkKey}',this.value,'pdb')"
            style="width:100px;padding:5px 8px;font-size:12px;border:1px solid var(--border);border-radius:8px;background:var(--bg-card);color:var(--text-main);font-family:'Cairo',sans-serif">
          <button class="ph46-btn ph46-btn-xs ph46-btn-danger" onclick="ph46_toggleProviderLink('${item.id}','${linkKey}',false,'pdb','${escAttr(_searchQ||'')}')">
            إلغاء الربط
          </button>
        ` : `
          <button class="ph46-btn ph46-btn-xs ph46-btn-primary" onclick="ph46_toggleProviderLink('${item.id}','${linkKey}',true,'pdb','${escAttr(_searchQ||'')}')">
            ربط الآن
          </button>
        `}
      </div>
    </div>`;
  }).join('');

  // ── بناء صفوف مزودي المنصة (القسم الاحتياطي) ──────────
  const userRows = filteredUsers.map(p => {
    const linkKey    = p.uid || p.id;
    const isLinked   = linked.some(l => l.providerUid === linkKey);
    const linkDetail = linked.find(l => l.providerUid === linkKey);
    return `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:11px 0;border-bottom:1px solid var(--glass-border);gap:12px;flex-wrap:wrap;opacity:0.85">
      <div style="display:flex;align-items:center;gap:12px;flex:1;min-width:0">
        <div style="width:36px;height:36px;border-radius:50%;background:rgba(100,116,139,0.3);color:var(--text-secondary);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;flex-shrink:0">
          ${(p.name||'P').charAt(0).toUpperCase()}
        </div>
        <div>
          <div style="font-weight:700;font-size:13px;color:var(--text-main)">${escHtml(p.name||'—')}</div>
          <div style="font-size:11px;color:var(--text-muted)">
            👤 ${p.role === 'tech' ? 'فني مهني' : 'مزود'} · حساب المنصة
            ${p.phone ? ` · 📞 ${escHtml(p.phone)}` : ''}
          </div>
        </div>
      </div>
      <div style="display:flex;gap:6px;align-items:center;flex-shrink:0">
        ${isLinked ? `
          <input type="number" placeholder="سعر مخصص" value="${linkDetail?.customPrice || ''}"
            onchange="ph46_updateProviderPrice('${item.id}','${linkKey}',this.value,'user')"
            style="width:100px;padding:5px 8px;font-size:12px;border:1px solid var(--border);border-radius:8px;background:var(--bg-card);color:var(--text-main);font-family:'Cairo',sans-serif">
          <button class="ph46-btn ph46-btn-xs ph46-btn-danger" onclick="ph46_toggleProviderLink('${item.id}','${linkKey}',false,'user','${escAttr(_searchQ||'')}')">
            إلغاء الربط
          </button>
        ` : `
          <button class="ph46-btn ph46-btn-xs ph46-btn-primary" onclick="ph46_toggleProviderLink('${item.id}','${linkKey}',true,'user','${escAttr(_searchQ||'')}')">
            ربط الآن
          </button>
        `}
      </div>
    </div>`;
  }).join('');

  const linkedCount = linked.length;

  openModal(`
    <div class="modal-header">
      <h2 class="modal-title">🔗 ربط موفري الخدمات بالمنتج</h2>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>

    <div style="padding:0 20px 14px">
      <!-- معلومات المنتج -->
      <div style="background:rgba(139,92,246,0.06);border:1px solid rgba(139,92,246,0.2);border-radius:12px;padding:12px 16px;margin-bottom:16px">
        <div style="font-weight:800;font-size:14px;color:var(--text-main)">📦 ${escHtml(item.name)}</div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:3px">
          ${linkedCount > 0
            ? `مرتبط بـ <strong style="color:var(--primary)">${linkedCount}</strong> موفر حالياً`
            : 'لم يُربط بأي موفر بعد'}
        </div>
      </div>

      <!-- بحث -->
      <div style="position:relative;margin-bottom:14px">
        <span style="position:absolute;right:12px;top:50%;transform:translateY(-50%);color:var(--text-muted);pointer-events:none">🔍</span>
        <input
          style="width:100%;padding:9px 36px 9px 14px;border:1.5px solid var(--border);border-radius:10px;background:var(--glass-bg);color:var(--text-main);font-family:'Cairo',sans-serif;font-size:14px;box-sizing:border-box"
          placeholder="ابحث بالاسم أو التصنيف أو الهاتف..."
          value="${escHtml(_searchQ || '')}"
          oninput="ph46_showProvidersMappingModal('${itemId}', this.value)"
          autofocus>
      </div>

      <!-- قاعدة بيانات المزودين -->
      ${dbProviders.length > 0 ? `
      <div style="margin-bottom:6px">
        <div style="font-size:12px;font-weight:800;color:var(--primary);margin-bottom:10px;display:flex;align-items:center;gap:6px">
          <span style="background:rgba(139,92,246,0.1);border:1px solid rgba(139,92,246,0.25);border-radius:20px;padding:2px 10px">
            🗂️ قاعدة بيانات المزودين — ${filteredDb.length} مزود
          </span>
        </div>
        <div style="max-height:42vh;overflow-y:auto;padding-left:2px">
          ${filteredDb.length > 0 ? dbRows : `<div style="padding:16px;text-align:center;color:var(--text-muted);font-size:13px">لا توجد نتائج مطابقة</div>`}
        </div>
      </div>` : ''}

      <!-- مزودو المنصة (احتياطي) -->
      ${userProviders.length > 0 ? `
      <details style="margin-top:12px" ${dbProviders.length === 0 ? 'open' : ''}>
        <summary style="font-size:12px;font-weight:800;color:var(--text-muted);cursor:pointer;padding:6px 0;user-select:none;list-style:none;display:flex;align-items:center;gap:6px">
          <span style="background:var(--bg-card);border:1px solid var(--border);border-radius:20px;padding:2px 10px">
            👤 حسابات المنصة — ${filteredUsers.length} حساب ${dbProviders.length > 0 ? '(احتياطي)' : ''}
          </span>
          <span style="color:var(--text-muted);font-size:10px">انقر للعرض</span>
        </summary>
        <div style="max-height:30vh;overflow-y:auto;padding-left:2px;margin-top:6px">
          ${filteredUsers.length > 0 ? userRows : `<div style="padding:16px;text-align:center;color:var(--text-muted);font-size:13px">لا توجد نتائج</div>`}
        </div>
      </details>` : ''}

      ${dbProviders.length === 0 && userProviders.length === 0 ? `
      <div style="padding:32px;text-align:center;color:var(--text-muted)">
        <div style="font-size:40px;margin-bottom:10px">🏢</div>
        <div style="font-weight:700;margin-bottom:6px">لا يوجد موفرو خدمات بعد</div>
        <div style="font-size:12px">أضف مزودين من قسم <strong>قاعدة بيانات المزودين</strong> في لوحة المدير</div>
        <button class="ph46-btn ph46-btn-xs ph46-btn-primary" style="margin-top:14px" onclick="closeModal();setAdminTab('providers_database')">
          🗂️ فتح قاعدة بيانات المزودين
        </button>
      </div>` : ''}
    </div>
  `, 'large');
};

window.ph46_toggleProviderLink = async function(itemId, linkKey, shouldLink, source, searchQ) {
  showLoader();
  try {
    const item = (AppData.catalogItems || []).find(i => i.id === itemId);
    if (!item) return;

    let linked = [...(item.linkedProviders || [])];

    if (shouldLink) {
      if (source === 'pdb') {
        const p = typeof pdb_getProvider === 'function' ? pdb_getProvider(linkKey) : null;
        const cats    = AppData.pdbCats    || [];
        const subcats = AppData.pdbSubcats || [];
        const cat    = cats.find(c => c.id === p?.catId);
        const subcat = subcats.find(s => s.id === p?.subcatId);
        linked.push({
          pdbId:        linkKey,
          providerName: p?.name       || 'مجهول',
          catName:      cat?.name     || '',
          subcatName:   subcat?.name  || '',
          phone:        p?.phone      || '',
          linkedUserId: p?.linkedUserId || null,
          customPrice:  null,
          linkedAt:     new Date(),
        });
      } else {
        const p = (AppData.users || []).find(u => (u.uid || u.id) === linkKey);
        linked.push({
          providerUid:  linkKey,
          providerName: p?.name || 'مجهول',
          customPrice:  null,
          linkedAt:     new Date(),
        });
      }
    } else {
      linked = linked.filter(l =>
        source === 'pdb' ? l.pdbId !== linkKey : l.providerUid !== linkKey
      );
    }

    await fsUpdate('product_catalog', itemId, { linkedProviders: linked });
    await ph46_reloadData();
    hideLoader();
    toast(shouldLink ? 'تم ربط موفر الخدمة بالمنتج ✅' : 'تم إلغاء الربط ❌', 'success');
    ph46_showProvidersMappingModal(itemId, searchQ || '');
  } catch(e) {
    hideLoader();
    toast('خطأ: ' + e.message, 'error');
  }
};

window.ph46_updateProviderPrice = async function(itemId, linkKey, val, source) {
  try {
    const item = (AppData.catalogItems || []).find(i => i.id === itemId);
    if (!item) return;

    const linked = (item.linkedProviders || []).map(l => {
      const match = source === 'pdb' ? l.pdbId === linkKey : l.providerUid === linkKey;
      return match ? { ...l, customPrice: val ? parseFloat(val) : null } : l;
    });

    await fsUpdate('product_catalog', itemId, { linkedProviders: linked });
    await ph46_reloadData();
    toast('✅ تم تحديث السعر المخصص', 'success');
  } catch(e) {
    toast('خطأ: ' + e.message, 'error');
  }
};

// ═══════════════════════════════════════════════════════
//  إدارة معرض الصور المطور (Cover / Remove Gallery)
// ═══════════════════════════════════════════════════════

window.ph46_setAsCoverImage = function(src) {
  window.__ph46_mainImg = src;
  toast('تم تعيين الصورة كغلاف رئيسي 🌟', 'success');
  ph46_refreshMediaPreviews();
};

window.ph46_removeGalleryImage = function(idx) {
  if (!confirm('حذف هذه الصورة من المعرض؟')) return;
  window.__ph46_imgs.splice(idx, 1);
  toast('تم إزالة الصورة من المعرض', 'info');
  ph46_refreshMediaPreviews();
};

function ph46_refreshMediaPreviews() {
  const container = document.getElementById('ph46-media-manager-preview');
  if (!container) return;

  const mainImgHtml = window.__ph46_mainImg
    ? `<div class="ph46-media-cover-wrap">
        <img src="${window.__ph46_mainImg}" class="ph46-media-cover-img">
        <span class="cover-badge">🌟 صورة الغلاف</span>
      </div>`
    : `<div class="ph46-media-cover-empty">لم يتم تحديد صورة رئيسية للغلاف بعد</div>`;

  const thumbsHtml = (window.__ph46_imgs || []).map((img, i) => `
    <div class="ph46-media-thumb-item">
      <img src="${img}">
      <div class="media-thumb-actions">
        <button class="thumb-act-btn" onclick="ph46_setAsCoverImage('${img}')" title="تعيين كغلاف">🌟</button>
        <button class="thumb-act-btn delete" onclick="ph46_removeGalleryImage(${i})" title="حذف">🗑️</button>
      </div>
    </div>
  `).join('');

  container.innerHTML = `
    <div class="form-group" style="margin-bottom:12px;">
      <label class="form-label" style="font-weight:700;">صورة الغلاف (الرئيسية)</label>
      ${mainImgHtml}
    </div>
    <div class="form-group">
      <label class="form-label" style="font-weight:700;">معرض الصور الإضافية (${(window.__ph46_imgs || []).length})</label>
      <div class="ph46-media-thumbs-grid">${thumbsHtml}</div>
    </div>`;
}

// ═══════════════════════════════════════════════════════
//  نظام أرقام الأصناف (SKU)
// ═══════════════════════════════════════════════════════

// بادئات أرقام الأصناف حسب القسم
const PH46_SKU_PREFIXES = {
  bookings:    '10',   // خدمات الحجز
  rental:      '20',   // متاجر التأجير (bookings + catType=rental)
  professions: '30',   // المهن والخدمات المهنية
  stores:      '40',   // متاجر محجوز
  digital:     '50',   // المتاجر الرقمية
};

window.ph46_generateSKU = async function(sectionId, catId) {
  // تحديد البادئة بناءً على القسم ونوع الفئة
  let prefix;
  if (sectionId === 'bookings') {
    const allCats = AppData.catalogCats || [];
    const cat = allCats.find(c => c.id === catId);
    prefix = cat?.catType === 'rental' ? PH46_SKU_PREFIXES.rental : PH46_SKU_PREFIXES.bookings;
  } else {
    prefix = PH46_SKU_PREFIXES[sectionId] || '99';
  }

  const counterKey = `sku_${prefix}`;
  let n;
  await db.runTransaction(async t => {
    const ref = db.collection('counters').doc(counterKey);
    const doc = await t.get(ref);
    n = (doc.exists ? (doc.data().count || 0) : 0) + 1;
    t.set(ref, { count: n });
  });
  return `${prefix}${String(n).padStart(6, '0')}`;
};

window.ph46_getSKULabel = function(sectionId, catId) {
  const allCats = AppData.catalogCats || [];
  const cat = allCats.find(c => c.id === catId);
  if (sectionId === 'bookings' && cat?.catType === 'rental') return 'متجر تأجير #20';
  const labels = {
    bookings: 'خدمة حجز #10',
    professions: 'مهنة #30',
    stores: 'متجر محجوز #40',
    digital: 'رقمي #50',
  };
  return labels[sectionId] || sectionId;
};

// ═══════════════════════════════════════════════════════
//  حفظ وتعديل المنتجات
// ═══════════════════════════════════════════════════════

window.ph46_saveItem = async function(sectionId) {
  const catId = document.getElementById('ph46-item-cat')?.value;
  const name = document.getElementById('ph46-item-name')?.value.trim();
  const provider = document.getElementById('ph46-item-provider')?.value.trim();
  const desc = document.getElementById('ph46-item-desc')?.value.trim();
  const problems = document.getElementById('ph46-item-problems')?.value.trim();
  const price = parseFloat(document.getElementById('ph46-item-price')?.value);
  const commission = parseFloat(document.getElementById('ph46-item-commission')?.value) || 0;
  const tax = parseFloat(document.getElementById('ph46-item-tax')?.value) || 0;
  const deposit = parseFloat(document.getElementById('ph46-item-deposit')?.value) || 0;
  const regionId = document.getElementById('ph46-item-region')?.value || null;
  const address = document.getElementById('ph46-item-address')?.value.trim();
  const lat = parseFloat(document.getElementById('ph46-item-lat')?.value) || null;
  const lng = parseFloat(document.getElementById('ph46-item-lng')?.value) || null;

  const isProfession = sectionId === 'professions';
  const priceType = isProfession 
    ? (document.querySelector('input[name="ph46-price-type"]:checked')?.value || 'fixed')
    : 'fixed';

  const requiresDriver = document.getElementById('ph46-item-driver')?.checked || (sectionId === 'stores');
  const allowMultiDate = document.getElementById('ph46-item-multidate')?.checked || false;

  if (!catId) { toast('يرجى اختيار الفئة', 'error'); return; }
  const selectedCat = (AppData.catalogCats || []).find(c => c.id === catId);
  if (selectedCat && !selectedCat.parentId) {
    toast('عذراً، يجب اختيار فئة فرعية وليست فئة رئيسية!', 'error');
    return;
  }
  if (!name) { toast('يرجى كتابة اسم المنتج أو الخدمة', 'error'); return; }
  if (priceType === 'fixed' && isNaN(price)) { toast('يرجى كتابة السعر الأساسي', 'error'); return; }

  // التحقق من الاسم المكرر
  const allItems = AppData.catalogItems || [];
  const editId = window.__ph46_editId;
  const isDuplicate = allItems.some(i => i.id !== editId && i.catId === catId && i.name.toLowerCase().trim() === name.toLowerCase().trim());
  if (isDuplicate) {
    if (!confirm('⚠️ تحذير: هذا الاسم مكرر في نفس الفئة! هل ترغب في الاستمرار وحفظه على أي حال؟')) return;
  }

  showLoader();
  try {
    const itemData = {
      sectionId,
      catId,
      name,
      provider: provider || '',
      desc: desc || '',
      commonProblems: isProfession ? (problems || '') : null,
      priceType,
      price: priceType === 'fixed' ? price : null,
      commission,
      tax,
      deposit,
      regionId,
      address: address || '',
      lat,
      lng,
      requiresDriver,
      allowMultiDate,
      mainImage: window.__ph46_mainImg || null,
      images: window.__ph46_imgs || [],
      adminAlerts: typeof window.getAdminAlerts === 'function' ? window.getAdminAlerts() : [],
      status: isEditMode() ? (allItems.find(i => i.id === editId)?.status || 'active') : 'active',
      updatedAt: new Date()
    };

    if (editId) {
      await fsUpdate('product_catalog', editId, itemData);
      toast('تم تحديث العنصر بنجاح ✅', 'success');
    } else {
      itemData.createdAt = new Date();
      itemData.linkedProviders = [];
      // توليد رقم الصنف (SKU) تلقائياً للعناصر الجديدة
      itemData.sku = await window.ph46_generateSKU(sectionId, catId);
      await fsAdd('product_catalog', itemData);
      toast(`تمت إضافة العنصر للكتالوج بنجاح 🎉 | رقم الصنف: #${itemData.sku}`, 'success');
    }

    await ph46_reloadData();
    hideLoader(); closeModal(); render();
  } catch(e) { hideLoader(); toast('خطأ: ' + e.message, 'error'); }
};

function isEditMode() {
  return !!window.__ph46_editId;
}

window.ph46_togglePriceType = function(val) {
  const wrap = document.getElementById('ph46-price-wrap');
  if (wrap) wrap.style.display = val === 'agreement' ? 'none' : 'block';
};

function ph46_fileToResizedBase64(file, maxW = 900, quality = 0.78) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const ratio = Math.min(1, maxW / img.width);
        const w = Math.round(img.width * ratio);
        const h = Math.round(img.height * ratio);
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

window.ph46_handleFileSelect = async function(event) {
  const files = event.target.files;
  if (!files || files.length === 0) return;
  showLoader();
  try {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const base64 = await ph46_fileToResizedBase64(file, 900, 0.75);
      if (!window.__ph46_mainImg) {
        window.__ph46_mainImg = base64;
      } else {
        window.__ph46_imgs.push(base64);
      }
    }
    ph46_refreshMediaPreviews();
    toast(`تم معالجة وإضافة ${files.length} صورة/صور`, 'success');
  } catch(e) {
    toast('خطأ في معالجة الصور: ' + e.message, 'error');
  } finally {
    hideLoader();
  }
};

window.ph46_getModalLabels = function(sectionId, catId) {
  const allCats = AppData.catalogCats || [];
  const cat = allCats.find(c => c.id === catId);
  const isRentalCat = cat?.catType === 'rental';
  
  if (sectionId === 'bookings' && isRentalCat) {
    return {
      itemLabel: 'منتج تأجير',
      depositLabel: 'مبلغ التأمين المسترد (ريال)',
      namePlaceholder: 'مثال: فستان زفاف ملكي فاخر'
    };
  }
  
  const sec = PH46_SECTIONS.find(s => s.id === sectionId);
  const isProfession = sectionId === 'professions';
  const isStore = sectionId === 'stores';
  const namePlaceholder = isProfession ? 'تمديدات كهربائية للمنازل' : isStore ? 'شاحن هاتف ذكي أصلي' : 'شاليه مميز بغرفتين ومسبح';
  
  return {
    itemLabel: sec?.itemLabel || 'عنصر',
    depositLabel: 'مبلغ العربون المستحق مقدمًا (ريال)',
    namePlaceholder: 'مثال: ' + namePlaceholder
  };
};

window.ph46_onModalCatChange = function(selectEl, sectionId, isEdit = false) {
  const catId = selectEl.value;
  const labels = window.ph46_getModalLabels(sectionId, catId);
  
  // Update modal title
  const titleEl = document.querySelector('.modal-title');
  if (titleEl) {
    if (isEdit) {
      const nameInput = document.getElementById('ph46-item-name');
      const itemName = nameInput ? nameInput.value : '';
      titleEl.innerHTML = `✏️ تعديل بيانات ${labels.itemLabel}: ${escHtml(itemName)}`;
    } else {
      titleEl.innerHTML = `➕ إضافة ${labels.itemLabel} جديد للكتالوج`;
    }
  }
  
  // Update deposit label
  const depositInput = document.getElementById('ph46-item-deposit');
  if (depositInput) {
    const depositLabelEl = depositInput.closest('.form-group')?.querySelector('.form-label');
    if (depositLabelEl) {
      depositLabelEl.innerHTML = labels.depositLabel;
    }
  }
  
  // Update name input placeholder
  const nameInput = document.getElementById('ph46-item-name');
  if (nameInput) {
    nameInput.placeholder = labels.namePlaceholder;
  }

  // Update location warnings based on category type
  const allCats = AppData.catalogCats || [];
  const cat = allCats.find(c => c.id === catId);
  const isRentalCat = cat?.catType === 'rental';
  const isBookingSection = (sectionId === 'bookings');

  // Address warning:
  // - rental store: address is SECRET (driver only, hidden from customer)
  // - regular booking (hotel, resort...): address IS shown to customer
  const addressWarning = document.getElementById('ph46-item-address-warning');
  if (addressWarning) {
    if (isBookingSection && isRentalCat) {
      // Rental: address is internal, NOT visible to customer
      addressWarning.style.display = 'block';
      addressWarning.style.color = '#f87171';
      addressWarning.innerHTML = '🔒 سري: هذا العنوان <strong>لن يظهر للعميل</strong>. يستخدمه مندوب التوصيل فقط للانتقال إلى المتجر واستلام المنتج المؤجَّر وتوصيله. لا تكشف هذا العنوان للعميل مباشرة.';
    } else if (isBookingSection && !isRentalCat && catId) {
      // Regular booking (hotel, resort...): address IS visible to customer
      addressWarning.style.display = 'block';
      addressWarning.style.color = '#f59e0b';
      addressWarning.innerHTML = '👁️ عام: هذا العنوان <strong>سيظهر للعميل</strong> في تفاصيل الخدمة ليتمكن من معرفة موقع الفندق أو المنتجع والوصول إليه. تأكد من كتابته بدقة.';
    } else {
      addressWarning.style.display = 'none';
    }
  }

  // Coordinates warning (always internal, never shown to customer)
  const coordsWarning = document.getElementById('ph46-item-coords-warning');
  if (coordsWarning) {
    if (isBookingSection && catId) {
      coordsWarning.style.display = 'block';
      if (isRentalCat) {
        coordsWarning.style.color = '#a78bfa';
        coordsWarning.innerHTML = '🗺️ داخلي: الإحداثيات <strong>لن تظهر للعميل</strong>. تُستخدم داخلياً لتحديد موقع متجر التأجير وتمكين مندوب التوصيل من التنقل إليه وحساب رسوم التوصيل.';
      } else {
        coordsWarning.style.color = '#a78bfa';
        coordsWarning.innerHTML = '🗺️ داخلي: الإحداثيات <strong>لن تظهر للعميل</strong> بشكل نصي. تُستخدم داخلياً لعرض الخدمة على الخريطة وحساب مسافات التوصيل.';
      }
    } else {
      coordsWarning.style.display = 'none';
    }
  }
};

window.ph46_showAddItemModalDirect = function(sectionId, catId = null) {
  window.__ph46_editId = null;
  window.__ph46_mainImg = null;
  window.__ph46_imgs = [];

  const allCats = AppData.catalogCats || [];
  const cats = allCats.filter(c => c.sectionId === sectionId && !!c.parentId);
  const regions = (AppData.regions || []).filter(r => r.active !== false);
  const sec = PH46_SECTIONS.find(s => s.id === sectionId);

  const isProfession = sectionId === 'professions';
  const isBooking = sectionId === 'bookings';
  const isStore = sectionId === 'stores';

  const labels = window.ph46_getModalLabels(sectionId, catId);

  const modalHtml = `
    <div class="modal-header">
      <h2 class="modal-title">➕ إضافة ${labels.itemLabel} جديد للكتالوج</h2>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="ph46-modal-body-scroll" style="max-height: 75vh; overflow-y: auto; padding: 10px 5px; direction: rtl;">
      <div style="display:grid; grid-template-columns: 1fr; gap:16px;">
        <!-- القسم الأول: الاسم والتصنيف -->
        <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--glass-border); border-radius: 12px; padding: 16px;">
          <h4 style="margin-top:0; margin-bottom:12px; color:var(--primary); font-size:15px; border-bottom:1px solid var(--glass-border); padding-bottom:6px;">📁 التصنيف والاسم الأساسي</h4>
          <div class="form-group">
            <label class="form-label">الفئة التابعة *</label>
            <select class="form-control" id="ph46-item-cat" onchange="ph46_onModalCatChange(this, '${sectionId}', false)">
              <option value="">-- اختر الفئة الفرعية --</option>
              ${cats.map(c => {
                const parent = allCats.find(p => p.id === c.parentId);
                const parentLabel = parent ? ` (${parent.name})` : '';
                return `<option value="${c.id}" ${c.id === catId ? 'selected' : ''}>${c.icon || ''} ${c.name}${parentLabel}</option>`;
              }).join('')}
            </select>
          </div>
          <div class="form-group" style="margin-top:12px;">
            <label class="form-label">الاسم بالكامل *</label>
            <input class="form-control" id="ph46-item-name" placeholder="${labels.namePlaceholder}">
          </div>
          <div class="form-group" style="margin-top:12px;">
            <label class="form-label">مقدم الخدمة الافتراضي (اختياري - للمراجعة)</label>
            <input class="form-control" id="ph46-item-provider" placeholder="اسم مقدم الخدمة أو الموفر...">
          </div>
        </div>

        <!-- القسم الثاني: التفاصيل المالية والعمولات -->
        <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--glass-border); border-radius: 12px; padding: 16px;">
          <h4 style="margin-top:0; margin-bottom:12px; color:var(--primary); font-size:15px; border-bottom:1px solid var(--glass-border); padding-bottom:6px;">💰 البيانات المالية والتسعير</h4>
          
          ${isProfession ? `
          <div class="form-group" style="margin-bottom:12px;">
            <label class="form-label">طريقة التسعير</label>
            <div style="display:flex; gap:16px; margin-top:6px;">
              <label style="display:flex; align-items:center; gap:6px; cursor:pointer;">
                <input type="radio" name="ph46-price-type" value="fixed" checked onchange="window.ph46_togglePriceType('fixed')">
                <span>سعر ثابت محدد</span>
              </label>
              <label style="display:flex; align-items:center; gap:6px; cursor:pointer;">
                <input type="radio" name="ph46-price-type" value="agreement" onchange="window.ph46_togglePriceType('agreement')">
                <span>حسب الاتفاق (سعر مرن)</span>
              </label>
            </div>
          </div>
          ` : ''}

          <div id="ph46-price-wrap" class="form-group">
            <label class="form-label">السعر الأساسي (ريال) *</label>
            <input class="form-control" type="number" id="ph46-item-price" placeholder="0">
          </div>

          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-top:12px;">
            <div class="form-group">
              <label class="form-label">عمولة المنصة (%)</label>
              <input class="form-control" type="number" id="ph46-item-commission" value="0">
            </div>
            <div class="form-group">
              <label class="form-label">الضريبة (%)</label>
              <input class="form-control" type="number" id="ph46-item-tax" value="0">
            </div>
          </div>

          ${isBooking ? `
          <div class="form-group" style="margin-top:12px;">
            <label class="form-label">${labels.depositLabel}</label>
            <input class="form-control" type="number" id="ph46-item-deposit" value="0">
          </div>
          ` : ''}
        </div>

        <!-- القسم الثالث: خيارات الجغرافيا والمواقع -->
        ${(isBooking || isStore || isProfession) ? `
        <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--glass-border); border-radius: 12px; padding: 16px;">
          <h4 style="margin-top:0; margin-bottom:12px; color:var(--primary); font-size:15px; border-bottom:1px solid var(--glass-border); padding-bottom:6px;">📍 التغطية الجغرافية والعنوان</h4>
          <div class="form-group">
            <label class="form-label">المنطقة الجغرافية التابعة</label>
            <select class="form-control" id="ph46-item-region">
              <option value="">-- اختر المنطقة (تغطية عامة إذا تركت فارغة) --</option>
              ${regions.map(r => `<option value="${r.id}">${r.name}</option>`).join('')}
            </select>
          </div>
          <div class="form-group" style="margin-top:12px;">
            <label class="form-label">العنوان التفصيلي</label>
            <input class="form-control" id="ph46-item-address" placeholder="اسم الحي أو الشارع التفصيلي...">
            <div id="ph46-item-address-warning" style="display:none; font-size:11px; color:#f59e0b; margin-top:6px; font-weight:600; line-height:1.4; padding:6px 10px; border-radius:6px; background:rgba(248,113,113,0.08); border:1px solid rgba(248,113,113,0.2);"></div>
          </div>
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-top:12px;">
            <div class="form-group">
              <label class="form-label">خريطة Latitude</label>
              <input class="form-control" type="number" step="any" id="ph46-item-lat" placeholder="24.7136">
            </div>
            <div class="form-group">
              <label class="form-label">خريطة Longitude</label>
              <input class="form-control" type="number" step="any" id="ph46-item-lng" placeholder="46.6753">
            </div>
          </div>
          <div style="margin-top:12px;">
            <button type="button" onclick="openPh46MapPicker()" onmouseover="this.style.transform='translateY(-1px)';this.style.boxShadow='0 4px 14px rgba(26,115,232,0.4)'" onmouseout="this.style.transform='';this.style.boxShadow='0 1px 6px rgba(26,115,232,0.25)'" style="display:inline-flex;align-items:center;gap:7px;background:linear-gradient(135deg,#1a73e8,#1557b0);color:#fff;border:none;border-radius:8px;padding:8px 16px;font-size:12px;font-weight:600;cursor:pointer;box-shadow:0 1px 6px rgba(26,115,232,0.25);transition:all 0.18s ease;font-family:inherit;letter-spacing:0.2px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style="flex-shrink:0"><circle cx="12" cy="9" r="3.2" fill="#fff" opacity="0.95"/><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="#fff" stroke-width="1.8" fill="rgba(255,255,255,0.12)"/></svg>
              اختر من خرائط قوقل
            </button>
          </div>
          <div id="ph46-item-coords-warning" style="display:none; font-size:11px; color:#a78bfa; margin-top:6px; font-weight:600; line-height:1.4; padding:6px 10px; border-radius:6px; background:rgba(167,139,250,0.08); border:1px solid rgba(167,139,250,0.2);"></div>
        </div>
        ` : ''}

        <!-- القسم الرابع: خيارات إضافية ووصف -->
        <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--glass-border); border-radius: 12px; padding: 16px;">
          <h4 style="margin-top:0; margin-bottom:12px; color:var(--primary); font-size:15px; border-bottom:1px solid var(--glass-border); padding-bottom:6px;">⚙️ الإعدادات الإضافية والوصف</h4>
          
          <div class="form-group">
            <label class="form-label">الوصف التفصيلي</label>
            <textarea class="form-control" id="ph46-item-desc" rows="3" placeholder="اكتب تفاصيل وميزات ووصف العنصر بالكامل..."></textarea>
          </div>

          ${isProfession ? `
          <div class="form-group" style="margin-top:12px;">
            <label class="form-label">🛠️ المشكلات والأعطال الشائعة المشمولة (واحد في كل سطر)</label>
            <textarea class="form-control" id="ph46-item-problems" rows="3" placeholder="مثال:&#10;تسرب غاز الفرن&#10;تلف قابس الكهرباء الرئيسي"></textarea>
          </div>
          ` : ''}

          <div style="display:flex; flex-direction:column; gap:10px; margin-top:12px;">
            ${(isBooking || isStore) ? `
            <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
              <input type="checkbox" id="ph46-item-driver" style="width:18px; height:18px;">
              <span>يتطلب وجود سائق / مندوب توصيل لنقل الطلب أو العميل</span>
            </label>
            ` : ''}

            ${isBooking ? `
            <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
              <input type="checkbox" id="ph46-item-multidate" style="width:18px; height:18px;">
              <span>السماح بحجز فترات متعددة الأيام متصلة (مثل الفنادق والشاليهات)</span>
            </label>
            ` : ''}
          </div>
        </div>

        <!-- القسم الخامس: إدارة الصور -->
        <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--glass-border); border-radius: 12px; padding: 16px;">
          <h4 style="margin-top:0; margin-bottom:12px; color:var(--primary); font-size:15px; border-bottom:1px solid var(--glass-border); padding-bottom:6px;">📸 المعرض والصور</h4>
          <div class="ph46-upload-zone" style="border: 2px dashed var(--glass-border); border-radius: 12px; padding: 24px; text-align: center; cursor: pointer; background: rgba(255,255,255,0.01); transition: all 0.2s;" onclick="document.getElementById('ph46-item-file-input').click()">
            <span style="font-size: 32px;">📤</span>
            <p style="margin: 8px 0 0; font-size: 13px; color: var(--text-muted);">اسحب الصور هنا أو اضغط للاختيار والتنزيل الفوري</p>
            <input type="file" id="ph46-item-file-input" multiple accept="image/*" style="display:none;" onchange="ph46_handleFileSelect(event)">
          </div>
          <div id="ph46-media-manager-preview" style="margin-top:12px;"></div>
        </div>
      </div>

      <!-- حقول التنبيهات الإدارية المرقمة -->
      <div style="margin-top:16px;">
        ${typeof renderAdminAlerts === 'function' ? renderAdminAlerts([]) : ''}
      </div>

      <div style="margin-top:20px; display:flex; justify-content:flex-end; gap:10px;">
        <button class="ph46-btn ph46-btn-secondary" onclick="closeModal()">إلغاء</button>
        <button class="ph46-btn ph46-btn-primary" onclick="ph46_saveItem('${sectionId}')">💾 إضافة وحفظ للكتالوج</button>
      </div>
    </div>
  `;

  openModal(modalHtml);
  ph46_refreshMediaPreviews();
  const selectEl = document.getElementById('ph46-item-cat');
  if (selectEl && selectEl.value) {
    ph46_onModalCatChange(selectEl, sectionId, false);
  }
};

window.ph46_showEditItemModal = function(itemId) {
  const item = (AppData.catalogItems || []).find(i => i.id === itemId);
  if (!item) { toast('عذراً، لم يتم العثور على هذا العنصر!', 'error'); return; }

  window.__ph46_editId = itemId;
  window.__ph46_mainImg = item.mainImage || null;
  window.__ph46_imgs = [...(item.images || [])];

  const sectionId = item.sectionId;
  const allCats = AppData.catalogCats || [];
  const cats = allCats.filter(c => c.sectionId === sectionId && !!c.parentId);
  const regions = (AppData.regions || []).filter(r => r.active !== false);
  const sec = PH46_SECTIONS.find(s => s.id === sectionId);

  const isProfession = sectionId === 'professions';
  const isBooking = sectionId === 'bookings';
  const isStore = sectionId === 'stores';

  const labels = window.ph46_getModalLabels(sectionId, item.catId);

  const modalHtml = `
    <div class="modal-header">
      <h2 class="modal-title" style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
        <span>✏️ تعديل بيانات ${labels.itemLabel}: ${escHtml(item.name)}</span>
        ${item.sku ? `<span style="font-family:monospace;font-size:14px;font-weight:700;background:rgba(139,92,246,0.12);color:#8b5cf6;border:1px solid rgba(139,92,246,0.25);border-radius:6px;padding:3px 8px;letter-spacing:0.5px;">#${escHtml(item.sku)}</span>` : ''}
      </h2>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="ph46-modal-body-scroll" style="max-height: 75vh; overflow-y: auto; padding: 10px 5px; direction: rtl;">
      <div style="display:grid; grid-template-columns: 1fr; gap:16px;">
        <!-- القسم الأول: الاسم والتصنيف -->
        <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--glass-border); border-radius: 12px; padding: 16px;">
          <h4 style="margin-top:0; margin-bottom:12px; color:var(--primary); font-size:15px; border-bottom:1px solid var(--glass-border); padding-bottom:6px;">📁 التصنيف والاسم الأساسي</h4>
          <div class="form-group">
            <label class="form-label">الفئة التابعة *</label>
            <select class="form-control" id="ph46-item-cat" onchange="ph46_onModalCatChange(this, '${sectionId}', true)">
              <option value="">-- اختر الفئة الفرعية --</option>
              ${cats.map(c => {
                const parent = allCats.find(p => p.id === c.parentId);
                const parentLabel = parent ? ` (${parent.name})` : '';
                return `<option value="${c.id}" ${c.id === item.catId ? 'selected' : ''}>${c.icon || ''} ${c.name}${parentLabel}</option>`;
              }).join('')}
            </select>
          </div>
          <div class="form-group" style="margin-top:12px;">
            <label class="form-label">الاسم بالكامل *</label>
            <input class="form-control" id="ph46-item-name" placeholder="${labels.namePlaceholder}" value="${escAttr(item.name || '')}">
          </div>
          <div class="form-group" style="margin-top:12px;">
            <label class="form-label">مقدم الخدمة الافتراضي (اختياري - للمراجعة)</label>
            <input class="form-control" id="ph46-item-provider" placeholder="اسم مقدم الخدمة..." value="${escAttr(item.provider || '')}">
          </div>
          ${item.sku ? `
          <div class="form-group" style="margin-top:12px;">
            <label class="form-label">رقم الصنف (SKU)</label>
            <input class="form-control" value="${escAttr(item.sku)}" readonly style="font-family:monospace; background:rgba(255,255,255,0.04); color:var(--text-muted); cursor:not-allowed;">
          </div>
          ` : ''}
        </div>

        <!-- القسم الثاني: التفاصيل المالية والعمولات -->
        <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--glass-border); border-radius: 12px; padding: 16px;">
          <h4 style="margin-top:0; margin-bottom:12px; color:var(--primary); font-size:15px; border-bottom:1px solid var(--glass-border); padding-bottom:6px;">💰 البيانات المالية والتسعير</h4>
          
          ${isProfession ? `
          <div class="form-group" style="margin-bottom:12px;">
            <label class="form-label">طريقة التسعير</label>
            <div style="display:flex; gap:16px; margin-top:6px;">
              <label style="display:flex; align-items:center; gap:6px; cursor:pointer;">
                <input type="radio" name="ph46-price-type" value="fixed" ${item.priceType !== 'agreement' ? 'checked' : ''} onchange="window.ph46_togglePriceType('fixed')">
                <span>سعر ثابت محدد</span>
              </label>
              <label style="display:flex; align-items:center; gap:6px; cursor:pointer;">
                <input type="radio" name="ph46-price-type" value="agreement" ${item.priceType === 'agreement' ? 'checked' : ''} onchange="window.ph46_togglePriceType('agreement')">
                <span>حسب الاتفاق (سعر مرن)</span>
              </label>
            </div>
          </div>
          ` : ''}

          <div id="ph46-price-wrap" class="form-group" style="${item.priceType === 'agreement' ? 'display:none;' : ''}">
            <label class="form-label">السعر الأساسي (ريال) *</label>
            <input class="form-control" type="number" id="ph46-item-price" placeholder="0" value="${item.price !== null ? item.price : ''}">
          </div>

          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-top:12px;">
            <div class="form-group">
              <label class="form-label">عمولة المنصة (%)</label>
              <input class="form-control" type="number" id="ph46-item-commission" value="${item.commission || 0}">
            </div>
            <div class="form-group">
              <label class="form-label">الضريبة (%)</label>
              <input class="form-control" type="number" id="ph46-item-tax" value="${item.tax || 0}">
            </div>
          </div>

          ${isBooking ? `
          <div class="form-group" style="margin-top:12px;">
            <label class="form-label">${labels.depositLabel}</label>
            <input class="form-control" type="number" id="ph46-item-deposit" value="${item.deposit || 0}">
          </div>
          ` : ''}
        </div>

        <!-- القسم الثالث: خيارات الجغرافيا والمواقع -->
        ${(isBooking || isStore || isProfession) ? `
        <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--glass-border); border-radius: 12px; padding: 16px;">
          <h4 style="margin-top:0; margin-bottom:12px; color:var(--primary); font-size:15px; border-bottom:1px solid var(--glass-border); padding-bottom:6px;">📍 التغطية الجغرافية والعنوان</h4>
          <div class="form-group">
            <label class="form-label">المنطقة الجغرافية التابعة</label>
            <select class="form-control" id="ph46-item-region">
              <option value="">-- اختر المنطقة (تغطية عامة إذا تركت فارغة) --</option>
              ${regions.map(r => `<option value="${r.id}" ${r.id === item.regionId ? 'selected' : ''}>${r.name}</option>`).join('')}
            </select>
          </div>
          <div class="form-group" style="margin-top:12px;">
            <label class="form-label">العنوان التفصيلي</label>
            <input class="form-control" id="ph46-item-address" placeholder="اسم الحي أو الشارع التفصيلي..." value="${escAttr(item.address || '')}">
            <div id="ph46-item-address-warning" style="display:none; font-size:11px; color:#f59e0b; margin-top:6px; font-weight:600; line-height:1.4; padding:6px 10px; border-radius:6px; background:rgba(248,113,113,0.08); border:1px solid rgba(248,113,113,0.2);"></div>
          </div>
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-top:12px;">
            <div class="form-group">
              <label class="form-label">خريطة Latitude</label>
              <input class="form-control" type="number" step="any" id="ph46-item-lat" placeholder="24.7136" value="${item.lat !== null ? item.lat : ''}">
            </div>
            <div class="form-group">
              <label class="form-label">خريطة Longitude</label>
              <input class="form-control" type="number" step="any" id="ph46-item-lng" placeholder="46.6753" value="${item.lng !== null ? item.lng : ''}">
            </div>
          </div>
          <div style="margin-top:12px;">
            <button type="button" onclick="openPh46MapPicker()" onmouseover="this.style.transform='translateY(-1px)';this.style.boxShadow='0 4px 14px rgba(26,115,232,0.4)'" onmouseout="this.style.transform='';this.style.boxShadow='0 1px 6px rgba(26,115,232,0.25)'" style="display:inline-flex;align-items:center;gap:7px;background:linear-gradient(135deg,#1a73e8,#1557b0);color:#fff;border:none;border-radius:8px;padding:8px 16px;font-size:12px;font-weight:600;cursor:pointer;box-shadow:0 1px 6px rgba(26,115,232,0.25);transition:all 0.18s ease;font-family:inherit;letter-spacing:0.2px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style="flex-shrink:0"><circle cx="12" cy="9" r="3.2" fill="#fff" opacity="0.95"/><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="#fff" stroke-width="1.8" fill="rgba(255,255,255,0.12)"/></svg>
              اختر من خرائط قوقل
            </button>
          </div>
          <div id="ph46-item-coords-warning" style="display:none; font-size:11px; color:#a78bfa; margin-top:6px; font-weight:600; line-height:1.4; padding:6px 10px; border-radius:6px; background:rgba(167,139,250,0.08); border:1px solid rgba(167,139,250,0.2);"></div>
        </div>
        ` : ''}

        <!-- القسم الرابع: خيارات إضافية ووصف -->
        <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--glass-border); border-radius: 12px; padding: 16px;">
          <h4 style="margin-top:0; margin-bottom:12px; color:var(--primary); font-size:15px; border-bottom:1px solid var(--glass-border); padding-bottom:6px;">⚙️ الإعدادات الإضافية والوصف</h4>
          
          <div class="form-group">
            <label class="form-label">الوصف التفصيلي</label>
            <textarea class="form-control" id="ph46-item-desc" rows="3" placeholder="الوصف التفصيلي...">${escHtml(item.desc || '')}</textarea>
          </div>

          ${isProfession ? `
          <div class="form-group" style="margin-top:12px;">
            <label class="form-label">🛠️ المشكلات والأعطال الشائعة المشمولة (واحد في كل سطر)</label>
            <textarea class="form-control" id="ph46-item-problems" rows="3" placeholder="مثال:&#10;تسرب مياه&#10;كسر انبوب">${escHtml(item.commonProblems || '')}</textarea>
          </div>
          ` : ''}

          <div style="display:flex; flex-direction:column; gap:10px; margin-top:12px;">
            ${(isBooking || isStore) ? `
            <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
              <input type="checkbox" id="ph46-item-driver" style="width:18px; height:18px;" ${item.requiresDriver ? 'checked' : ''}>
              <span>يتطلب وجود سائق / مندوب توصيل لنقل الطلب أو العميل</span>
            </label>
            ` : ''}

            ${isBooking ? `
            <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
              <input type="checkbox" id="ph46-item-multidate" style="width:18px; height:18px;" ${item.allowMultiDate ? 'checked' : ''}>
              <span>السماح بحجز فترات متعددة الأيام متصلة</span>
            </label>
            ` : ''}
          </div>
        </div>

        <!-- القسم الخامس: إدارة الصور -->
        <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--glass-border); border-radius: 12px; padding: 16px;">
          <h4 style="margin-top:0; margin-bottom:12px; color:var(--primary); font-size:15px; border-bottom:1px solid var(--glass-border); padding-bottom:6px;">📸 المعرض والصور</h4>
          <div class="ph46-upload-zone" style="border: 2px dashed var(--glass-border); border-radius: 12px; padding: 24px; text-align: center; cursor: pointer; background: rgba(255,255,255,0.01); transition: all 0.2s;" onclick="document.getElementById('ph46-item-file-input').click()">
            <span style="font-size: 32px;">📤</span>
            <p style="margin: 8px 0 0; font-size: 13px; color: var(--text-muted);">اسحب الصور هنا أو اضغط للاختيار والتنزيل الفوري</p>
            <input type="file" id="ph46-item-file-input" multiple accept="image/*" style="display:none;" onchange="ph46_handleFileSelect(event)">
          </div>
          <div id="ph46-media-manager-preview" style="margin-top:12px;"></div>
        </div>
      </div>

      <!-- حقول التنبيهات الإدارية المرقمة -->
      <div style="margin-top:16px;">
        ${typeof renderAdminAlerts === 'function' ? renderAdminAlerts(item.adminAlerts || []) : ''}
      </div>

      <div style="margin-top:20px; display:flex; justify-content:flex-end; gap:10px;">
        <button class="ph46-btn ph46-btn-secondary" onclick="closeModal()">إلغاء</button>
        <button class="ph46-btn ph46-btn-primary" onclick="ph46_saveItem('${sectionId}')">💾 حفظ التغييرات والكتالوج</button>
      </div>
    </div>
  `;

  openModal(modalHtml);
  ph46_refreshMediaPreviews();
  const selectEl = document.getElementById('ph46-item-cat');
  if (selectEl && selectEl.value) {
    ph46_onModalCatChange(selectEl, sectionId, true);
  }
};

window.ph46_startImportWizard = function(sectionId = 'bookings', catId = null) {
  State._ph46Import = {
    step: 1,
    file: null,
    sectionId: sectionId,
    catId: catId,
    excelHeaders: [],
    excelRows: [],
    columnMappings: {},
    mappedRows: []
  };
  State._ph46.view = 'import_wizard';
  render();
};

function ph46_renderImportWizard() {
  const imp = State._ph46Import;
  if (!imp) { ph46_goBack('main'); return ''; }

  let stepHTML = '';

  if (imp.step === 1) {
    // الخطوة 1: الرفع واختيار الفئة
    const sections = PH46_SECTIONS;
    const cats = (AppData.catalogCats || []).filter(c => c.sectionId === imp.sectionId);
    stepHTML = `
    <div class="ph46-wizard-card" style="background:var(--bg-card); border:1px solid var(--glass-border); border-radius:20px; padding:24px;">
      <h3>الخطوة 1: اختيار الملف والتصنيف المستهدف</h3>
      <p class="wizard-step-desc">قم باختيار ملف Excel أو CSV المعبأ بالبيانات وحدد القسم الذي ترغب بالاستيراد إليه.</p>
      
      <div class="ph46-modal-grid" style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-top:20px">
        <div class="form-group">
          <label class="form-label">القسم الرئيسي</label>
          <select class="form-control" id="ph46-wiz-sec" onchange="ph46_onWizSectionChange(this.value)">
            ${sections.map(s => `<option value="${s.id}" ${s.id===imp.sectionId?'selected':''}>${s.icon} ${s.label}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">الفئة (اختياري)</label>
          <select class="form-control" id="ph46-wiz-cat">
            <option value="">-- اختر الفئة لاحقاً أو حددها الآن --</option>
            ${cats.map(c => `<option value="${c.id}" ${c.id===imp.catId?'selected':''}>${c.icon||''} ${escHtml(c.name)}</option>`).join('')}
          </select>
        </div>
      </div>

      <div class="form-group" style="margin-top:20px">
        <label class="form-label">الملف المرفوع</label>
        <div class="ph46-file-upload-zone" onclick="document.getElementById('ph46-wiz-file-input').click()" style="border: 2px dashed var(--glass-border); background:rgba(255,255,255,0.01); border-radius:12px; padding:30px; text-align:center; cursor:pointer;">
          <input type="file" id="ph46-wiz-file-input" accept=".xlsx,.xls,.csv" style="display:none" onchange="ph46_onWizFileSelected(this)">
          <div class="upload-zone-content" id="ph46-upload-zone-content">
            <span class="upload-icon" style="font-size:32px;">📥</span>
            <strong style="display:block; margin:8px 0 4px 0;">اضغط هنا لاختيار ملف Excel أو CSV</strong>
            <span class="upload-subtext" style="font-size:11px; color:var(--text-muted)">الملفات المدعومة: .xlsx, .xls, .csv (الحد الأقصى 5MB)</span>
          </div>
        </div>
      </div>

      <div class="wizard-footer-buttons" style="display:flex; justify-content:flex-end; gap:10px; margin-top:20px;">
        <button class="ph46-btn ph46-btn-secondary" onclick="ph46_goBack('main')">إلغاء الاستيراد</button>
        <button class="ph46-btn ph46-btn-primary" id="ph46-wiz-next-1" disabled onclick="ph46_wizGoToStep(2)">التالي: مطابقة الأعمدة ←</button>
      </div>
    </div>`;
  } 
  else if (imp.step === 2) {
    // الخطوة 2: مطابقة الأعمدة (Column Mapping)
    const mappingsForm = PH46_MAPPABLE_FIELDS.map(f => {
      // محاولة المطابقة التلقائية إذا وجد عمود بنفس الاسم
      const matchedHeader = imp.excelHeaders.find(h => 
        h.toLowerCase().trim().includes(f.label.toLowerCase().trim()) || 
        h.toLowerCase().trim().includes(f.key.toLowerCase().trim())
      ) || '';

      return `
      <div class="ph46-mapping-field-row" style="display:grid; grid-template-columns:1fr 1fr; padding:12px; border-bottom:1px solid var(--glass-border);">
        <div class="field-label-cell">
          <strong>${f.label}</strong>
          ${f.required ? '<span class="required-star" style="color:#ef4444">*</span>' : ''}
        </div>
        <div class="field-select-cell">
          <select class="form-control mapping-select" data-field="${f.key}">
            <option value="">-- تخطي هذا الحقل --</option>
            ${imp.excelHeaders.map(h => `<option value="${h}" ${h===matchedHeader?'selected':''}>${h}</option>`).join('')}
          </select>
        </div>
      </div>`;
    }).join('');

    stepHTML = `
    <div class="ph46-wizard-card" style="background:var(--bg-card); border:1px solid var(--glass-border); border-radius:20px; padding:24px;">
      <h3>الخطوة 2: مطابقة الأعمدة (Column Mapping)</h3>
      <p class="wizard-step-desc">قم بربط أعمدة ملف Excel الخاص بك بالحقول القياسية في نظام "محجوز" ليتم استيراد البيانات في مكانها الصحيح.</p>

      <div class="ph46-mapping-table" style="border: 1px solid var(--glass-border); border-radius: 12px; overflow: hidden; margin-top:20px">
        <div class="mapping-table-header" style="background: rgba(255,255,255,0.02); display: grid; grid-template-columns: 1fr 1fr; padding: 10px 12px; font-weight: 700; font-size: 12px; color: var(--text-muted); border-bottom: 1px solid var(--glass-border);">
          <div>حقل النظام القياسي</div>
          <div>اسم العمود في ملفك</div>
        </div>
        ${mappingsForm}
      </div>

      <div class="wizard-footer-buttons" style="display:flex; justify-content:flex-end; gap:10px; margin-top:24px">
        <button class="ph46-btn ph46-btn-secondary" onclick="ph46_wizGoToStep(1)">← السابق</button>
        <button class="ph46-btn ph46-btn-primary" onclick="ph46_wizProcessMappings()">التالي: مراجعة البيانات وتصحيحها ←</button>
      </div>
    </div>`;
  }
  else if (imp.step === 3) {
    // الخطوة 3: جدول مراجعة وتعديل البيانات (Interactive Data Grid Review)
    const existingNames = new Set((AppData.catalogItems || []).map(i => i.name?.toLowerCase().trim()));
    const cats = (AppData.catalogCats || []).filter(c => c.sectionId === imp.sectionId);

    const tableHeaders = PH46_MAPPABLE_FIELDS.map(f => `<th>${f.label}</th>`).join('');
    
    const tableRows = imp.mappedRows.map((row, idx) => {
      const isDup = existingNames.has((row.name || '').toLowerCase().trim());
      const dupWarning = isDup ? '<span class="dup-warn-indicator" style="position: absolute; left: 6px; top: 50%; transform: translateY(-50%); background: rgba(245,158,11,0.15); color: #f59e0b; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px;" title="هذا الاسم موجود مسبقاً في كتالوج النظام">⚠️ مكرر</span>' : '';

      return `
      <tr class="ph46-grid-row" id="ph46-wiz-row-${idx}">
        <td>
          <input type="checkbox" class="row-select-cb" data-idx="${idx}" checked>
        </td>
        <td>
          <div class="grid-input-wrap" style="position:relative;">
            <input type="text" class="ph46-input-inline grid-cell-input" data-idx="${idx}" data-field="name" value="${escAttr(row.name || '')}">
            ${dupWarning}
          </div>
        </td>
        <td>
          <input type="text" class="ph46-input-inline grid-cell-input" data-idx="${idx}" data-field="desc" value="${escAttr(row.desc || '')}">
        </td>
        <td>
          <input type="text" class="ph46-input-inline grid-cell-input" data-idx="${idx}" data-field="provider" value="${escAttr(row.provider || '')}">
        </td>
        <td>
          <input type="number" class="ph46-input-inline grid-cell-input" data-idx="${idx}" data-field="price" value="${row.price || ''}">
        </td>
        <td>
          <input type="number" class="ph46-input-inline grid-cell-input" data-idx="${idx}" data-field="commission" value="${row.commission || '0'}">
        </td>
        <td>
          <input type="number" class="ph46-input-inline grid-cell-input" data-idx="${idx}" data-field="tax" value="${row.tax || '0'}">
        </td>
        <td>
          <input type="text" class="ph46-input-inline grid-cell-input" data-idx="${idx}" data-field="address" value="${escAttr(row.address || '')}">
        </td>
        <td>
          <input type="text" class="ph46-input-inline grid-cell-input" data-idx="${idx}" data-field="commonProblems" value="${escAttr(row.commonProblems || '')}">
        </td>
        <td>
          <button class="ph46-icon-btn danger" onclick="ph46_wizRemoveRow(${idx})" title="حذف السطر">🗑️</button>
        </td>
      </tr>`;
    }).join('');

    stepHTML = `
    <div class="ph46-wizard-card" style="background:var(--bg-card); border:1px solid var(--glass-border); border-radius:20px; padding:24px; max-width:100%">
      <h3>الخطوة 3: مراجعة البيانات وتصحيح الأخطاء</h3>
      <p class="wizard-step-desc">قم بمراجعة البيانات وتعديل أي خانات تريدها مباشرة من الجدول قبل إضافتها بشكل نهائي لقاعدة البيانات.</p>

      <div class="ph46-modal-grid" style="display:flex; justify-content:space-between; align-items:flex-end; margin-top:20px; gap:16px;">
        <div class="form-group" style="flex:1">
          <label class="form-label">تعيين الفئة لجميع العناصر المحددة</label>
          <select class="form-control" id="ph46-wiz-target-cat">
            <option value="">-- اختر الفئة --</option>
            ${cats.map(c => `<option value="${c.id}" ${c.id===imp.catId?'selected':''}>${c.icon||''} ${escHtml(c.name)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group" style="display:flex; gap:8px;">
          <button class="ph46-btn ph46-btn-secondary" onclick="ph46_wizSelectAllRows(true)">اختيار الكل</button>
          <button class="ph46-btn ph46-btn-secondary" onclick="ph46_wizSelectAllRows(false)">إلغاء الكل</button>
        </div>
      </div>

      <div class="ph46-grid-scroll-wrap" style="margin-top:16px; max-height:48vh; overflow:auto; border:1px solid var(--glass-border); border-radius:10px;">
        <table class="ph46-grid-table" style="width:100%; border-collapse:collapse;">
          <thead>
            <tr style="background:rgba(255,255,255,0.03);">
              <th style="width:40px"></th>
              ${tableHeaders}
              <th style="width:45px"></th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </div>

      <div class="wizard-footer-buttons" style="display:flex; justify-content:flex-end; gap:10px; margin-top:24px">
        <button class="ph46-btn ph46-btn-secondary" onclick="ph46_wizGoToStep(2)">← السابق</button>
        <button class="ph46-btn ph46-btn-primary" onclick="ph46_wizCommitImport()">💾 اعتماد وإضافة ${imp.mappedRows.length} عنصر للكتالوج</button>
      </div>
    </div>`;
  }

  const stepProgressBar = `
  <div class="ph46-wizard-progress-bar" style="display:flex; align-items:center; margin-bottom:24px; padding:10px 0;">
    <div class="step-progress-node ${imp.step >= 1 ? 'active' : ''}" style="display:flex; flex-direction:column; align-items:center; gap:6px;">
      <span class="step-num" style="width:28px; height:28px; border-radius:50%; background:rgba(255,255,255,0.05); border:1px solid var(--glass-border); display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:700;">1</span>
      <span class="step-label" style="font-size:11px; color:var(--text-muted); font-weight:600;">الكتالوج</span>
    </div>
    <div class="step-progress-line ${imp.step >= 2 ? 'active' : ''}" style="flex:1; height:2px; background:var(--glass-border); margin:0 10px; transform:translateY(-8px);"></div>
    <div class="step-progress-node ${imp.step >= 2 ? 'active' : ''}" style="display:flex; flex-direction:column; align-items:center; gap:6px;">
      <span class="step-num" style="width:28px; height:28px; border-radius:50%; background:rgba(255,255,255,0.05); border:1px solid var(--glass-border); display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:700;">2</span>
      <span class="step-label" style="font-size:11px; color:var(--text-muted); font-weight:600;">مطابقة الأعمدة</span>
    </div>
    <div class="step-progress-line ${imp.step >= 3 ? 'active' : ''}" style="flex:1; height:2px; background:var(--glass-border); margin:0 10px; transform:translateY(-8px);"></div>
    <div class="step-progress-node ${imp.step >= 3 ? 'active' : ''}" style="display:flex; flex-direction:column; align-items:center; gap:6px;">
      <span class="step-num" style="width:28px; height:28px; border-radius:50%; background:rgba(255,255,255,0.05); border:1px solid var(--glass-border); display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:700;">3</span>
      <span class="step-label" style="font-size:11px; color:var(--text-muted); font-weight:600;">مراجعة وتأكيد</span>
    </div>
  </div>`;

  return `
  <div class="ph46-container">
    ${ph46_styles()}
    <div class="ph46-page-header">
      <div>
        <h1 class="ph46-title">📥 معالج الاستيراد الجماعي الذكي (Bulk Import Wizard)</h1>
        <p class="ph46-subtitle">استيراد كميات ضخمة من المنتجات والخدمات بسهولة مطلقة</p>
      </div>
    </div>
    ${stepProgressBar}
    ${stepHTML}
  </div>`;
}

// ═══════════════════════════════════════════════════════
//  دوال التنقل والرجوع
// ═══════════════════════════════════════════════════════

window.ph46_goSection = function(secId) {
  State._ph46.section = secId;
  State._ph46.catId = null;
  State._ph46.view = 'cats';
  render();
};

window.ph46_goCat = function(catId) {
  State._ph46.catId = catId;
  State._ph46.view = 'items';
  render();
};

window.ph46_goBack = function(dest) {
  if (dest === 'main') {
    State._ph46.section = null;
    State._ph46.catId = null;
    State._ph46.view = 'sections';
  } else if (dest === 'section') {
    State._ph46.catId = null;
    State._ph46.view = 'cats';
  }
  render();
};

// ═══════════════════════════════════════════════════════
//  منتقي الخريطة لحقول ph46-item-lat / ph46-item-lng
// ═══════════════════════════════════════════════════════
let _ph46PickerMap, _ph46PickerMarker;
window.openPh46MapPicker = function() {
  const latEl = document.getElementById('ph46-item-lat');
  const lngEl = document.getElementById('ph46-item-lng');
  const currentLat = latEl ? (parseFloat(latEl.value) || 15.3694) : 15.3694;
  const currentLng = lngEl ? (parseFloat(lngEl.value) || 44.1817) : 44.1817;

  openModal(`
    <div class="modal-header">
      <h2 class="modal-title">🗺️ اختر الموقع — Mapbox</h2>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div style="padding:20px">
      <div style="position:relative;margin-bottom:12px;">
        <input id="ph46-map-search" type="text" class="form-control" placeholder="🔍 ابحث عن موقع، مدينة، حي..." style="font-size:14px;">
        <div id="ph46-search-results" style="position:absolute;top:100%;right:0;left:0;background:#1e1e2e;border:1px solid var(--border);border-radius:8px;z-index:9999;display:none;max-height:200px;overflow-y:auto;"></div>
      </div>
      <div id="ph46-map-canvas" style="height:360px;border-radius:12px;margin-bottom:16px;border:1px solid var(--border);overflow:hidden;"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group"><label class="form-label">📍 Latitude</label><input class="form-control" id="ph46-map-lat-val" type="number" step="0.000001" value="${currentLat}"></div>
        <div class="form-group"><label class="form-label">📍 Longitude</label><input class="form-control" id="ph46-map-lng-val" type="number" step="0.000001" value="${currentLng}"></div>
      </div>
      <button class="btn btn-primary btn-block" style="margin-top:12px" onclick="savePh46Location()">✅ تأكيد الموقع</button>
    </div>`);

  if (typeof mapboxgl === 'undefined') return;
  setTimeout(() => {
    mapboxgl.accessToken = window.MAPBOX_TOKEN;
    _ph46PickerMap = new mapboxgl.Map({
      container: 'ph46-map-canvas',
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [currentLng, currentLat],
      zoom: 13,
      language: 'ar'
    });
    _ph46PickerMap.addControl(new mapboxgl.NavigationControl(), 'top-left');
    const el = document.createElement('div');
    el.style.cssText = 'width:32px;height:32px;background:url("https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6/svgs/solid/location-dot.svg") center/contain no-repeat;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5));cursor:grab;';
    _ph46PickerMarker = new mapboxgl.Marker({ element: el, draggable: true })
      .setLngLat([currentLng, currentLat])
      .addTo(_ph46PickerMap);
    const updateCoords = (lng, lat) => {
      document.getElementById('ph46-map-lat-val').value = lat.toFixed(6);
      document.getElementById('ph46-map-lng-val').value = lng.toFixed(6);
    };
    _ph46PickerMarker.on('dragend', () => {
      const pos = _ph46PickerMarker.getLngLat();
      updateCoords(pos.lng, pos.lat);
    });
    _ph46PickerMap.on('click', (e) => {
      _ph46PickerMarker.setLngLat(e.lngLat);
      updateCoords(e.lngLat.lng, e.lngLat.lat);
    });
    // ── بحث Mapbox Geocoding ──
    const searchInput = document.getElementById('ph46-map-search');
    const resultsBox = document.getElementById('ph46-search-results');
    let searchTimer;
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimer);
      const q = searchInput.value.trim();
      if (q.length < 2) { resultsBox.style.display = 'none'; return; }
      searchTimer = setTimeout(async () => {
        try {
          const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?access_token=${window.MAPBOX_TOKEN}&language=ar&limit=5`);
          const data = await res.json();
          if (!data.features?.length) { resultsBox.style.display = 'none'; return; }
          resultsBox.innerHTML = data.features.map(f => `
            <div onclick="window._ph46SelectPlace(${f.center[0]},${f.center[1]},'${f.place_name.replace(/'/g,"\\'")}')" style="padding:10px 14px;cursor:pointer;border-bottom:1px solid rgba(255,255,255,0.06);font-size:13px;color:#e2e8f0;" onmouseover="this.style.background='rgba(124,58,237,0.15)'" onmouseout="this.style.background=''">
              <div style="font-weight:600">${f.text}</div>
              <div style="font-size:11px;color:#94a3b8;margin-top:2px">${f.place_name}</div>
            </div>`).join('');
          resultsBox.style.display = 'block';
        } catch(e) {}
      }, 350);
    });
    window._ph46SelectPlace = (lng, lat, name) => {
      _ph46PickerMap.flyTo({ center: [lng, lat], zoom: 15, speed: 1.4 });
      _ph46PickerMarker.setLngLat([lng, lat]);
      updateCoords(lng, lat);
      searchInput.value = name;
      resultsBox.style.display = 'none';
    };
  }, 200);
};

window.savePh46Location = function() {
  const lat = document.getElementById('ph46-map-lat-val')?.value;
  const lng = document.getElementById('ph46-map-lng-val')?.value;
  if (lat && lng) {
    const latEl = document.getElementById('ph46-item-lat');
    const lngEl = document.getElementById('ph46-item-lng');
    if (latEl) latEl.value = lat;
    if (lngEl) lngEl.value = lng;
  }
  closeModal();
};

// ═══════════════════════════════════════════════════════
//  التهيئة عند التحميل
// ═══════════════════════════════════════════════════════
(function() {
  try {
    if (!AppData.catalogCats) AppData.catalogCats = [];
    if (!AppData.catalogItems) AppData.catalogItems = [];
    ph46_reloadData().catch(console.warn);
  } catch(e) {}
})();
