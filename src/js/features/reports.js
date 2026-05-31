// ═══════════════════════════════════════════════════════════════════
//  محجوز — Advanced Reporting & Analytics System
//  نظام التقارير والتحليلات المتقدمة مع رسوم بيانية وإحصائيات
// ═══════════════════════════════════════════════════════════════════
'use strict';

// ─── Reports Manager Class ────────────────────────────────────────
class ReportsManager {
  constructor() {
    this.reports = [];
    this.charts = {};
  }

  // ─── جمع بيانات المبيعات ──────────────────────────────────────────
  async getSalesReport(startDate, endDate) {
    try {
      const orders = await db.collection('orders')
        .where('createdAt', '>=', startDate)
        .where('createdAt', '<=', endDate)
        .get();

      const salesData = {
        totalOrders: orders.size,
        totalRevenue: 0,
        totalCost: 0,
        profit: 0,
        ordersByStatus: {},
        ordersByCategory: {},
        topServices: [],
        topVendors: [],
        dailyRevenue: {},
        orderTrend: []
      };

      orders.forEach(doc => {
        const order = doc.data();
        salesData.totalRevenue += order.totalAmount || 0;
        salesData.totalCost += order.serviceCost || 0;
        
        // Count by status
        salesData.ordersByStatus[order.status] = (salesData.ordersByStatus[order.status] || 0) + 1;
        
        // Count by category
        salesData.ordersByCategory[order.category] = (salesData.ordersByCategory[order.category] || 0) + 1;
        
        // Daily revenue
        const date = order.createdAt?.toDate().toISOString().split('T')[0] || 'unknown';
        salesData.dailyRevenue[date] = (salesData.dailyRevenue[date] || 0) + (order.totalAmount || 0);
      });

      salesData.profit = salesData.totalRevenue - salesData.totalCost;
      salesData.profitMargin = salesData.totalRevenue > 0 
        ? ((salesData.profit / salesData.totalRevenue) * 100).toFixed(2)
        : 0;

      return salesData;
    } catch (error) {
      console.error('Error generating sales report:', error);
      return {};
    }
  }

  // ─── تقرير الأداء حسب الفئة ──────────────────────────────────────
  async getCategoryPerformance() {
    try {
      const categories = await fsGetAll('categories');
      const performance = [];

      for (const cat of categories) {
        const orders = await fsQuery('orders', 'category', '==', cat.id);
        const totalRevenue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
        const avgRating = orders.length > 0 
          ? (orders.reduce((sum, o) => sum + (o.rating || 0), 0) / orders.length).toFixed(1)
          : 0;

        performance.push({
          categoryId: cat.id,
          categoryName: cat.name,
          orderCount: orders.length,
          totalRevenue,
          avgRating,
          totalComments: orders.reduce((sum, o) => sum + (o.comments?.length || 0), 0)
        });
      }

      return performance.sort((a, b) => b.totalRevenue - a.totalRevenue);
    } catch (error) {
      console.error('Error getting category performance:', error);
      return [];
    }
  }

  // ─── تقرير أداء البائعين ────────────────────────────────────────
  async getVendorPerformance() {
    try {
      const vendors = await fsQuery('users', 'role', '==', 'vendor');
      const vendorData = [];

      for (const vendor of vendors) {
        const orders = await fsQuery('orders', 'vendorId', '==', vendor.id);
        const totalRevenue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
        const completedOrders = orders.filter(o => o.status === 'completed').length;
        const cancelledOrders = orders.filter(o => o.status === 'cancelled').length;
        const avgRating = orders.length > 0 
          ? (orders.reduce((sum, o) => sum + (o.rating || 0), 0) / orders.length).toFixed(1)
          : 0;

        // حساب متوسط وقت الاستجابة
        const respondedOrders = orders.filter(o => o.responseTimeSecs != null && o.responseTimeSecs > 0);
        const avgResponseSecs = respondedOrders.length > 0
          ? Math.round(respondedOrders.reduce((s, o) => s + o.responseTimeSecs, 0) / respondedOrders.length)
          : null;
        const acceptedOrders  = orders.filter(o => o.responseAction === 'accepted').length;
        const rejectedOrders  = orders.filter(o => o.responseAction === 'rejected').length;
        const acceptRate      = respondedOrders.length > 0
          ? ((acceptedOrders / respondedOrders.length) * 100).toFixed(0)
          : null;

        vendorData.push({
          vendorId: vendor.id,
          vendorName: vendor.displayName || vendor.name || 'بدون اسم',
          totalOrders: orders.length,
          completedOrders,
          cancelledOrders,
          completionRate: orders.length > 0 ? ((completedOrders / orders.length) * 100).toFixed(0) : 0,
          totalRevenue,
          avgRating,
          avgResponseSecs,
          acceptedOrders,
          rejectedOrders,
          acceptRate,
          joinDate: vendor.createdAt?.toDate?.().toLocaleDateString('ar-YE') || '-'
        });
      }

      return vendorData.sort((a, b) => b.totalRevenue - a.totalRevenue);
    } catch (error) {
      console.error('Error getting vendor performance:', error);
      return [];
    }
  }

  // ─── تقرير أداء العملاء ──────────────────────────────────────────
  async getCustomerAnalytics() {
    try {
      const customers = await fsQuery('users', 'role', '==', 'customer');
      const analytics = {
        totalCustomers: customers.length,
        activeCustomers: 0,
        newCustomers: 0,
        repeatCustomers: 0,
        totalSpent: 0,
        avgOrderValue: 0,
        topCustomers: [],
        customersByRegion: {},
        customerSegmentation: {
          highValue: 0,
          mediumValue: 0,
          lowValue: 0
        }
      };

      for (const customer of customers) {
        const orders = await fsQuery('orders', 'userId', '==', customer.id);
        const totalSpent = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
        const lastOrderDate = orders.length > 0 
          ? Math.max(...orders.map(o => o.createdAt?.toDate?.().getTime() || 0))
          : 0;

        // Check if customer is active (ordered in last 30 days)
        if (Date.now() - lastOrderDate < 30 * 24 * 60 * 60 * 1000) {
          analytics.activeCustomers++;
        }

        // Count repeat customers
        if (orders.length > 1) {
          analytics.repeatCustomers++;
        }

        // Customer segmentation
        if (totalSpent > 5000) {
          analytics.customerSegmentation.highValue++;
        } else if (totalSpent > 1000) {
          analytics.customerSegmentation.mediumValue++;
        } else if (totalSpent > 0) {
          analytics.customerSegmentation.lowValue++;
        }

        analytics.totalSpent += totalSpent;

        // Top customers
        if (orders.length > 0) {
          analytics.topCustomers.push({
            customerId: customer.id,
            customerName: customer.displayName || 'مجهول',
            orderCount: orders.length,
            totalSpent,
            lastOrderDate: new Date(lastOrderDate).toLocaleDateString('ar-YE')
          });
        }
      }

      analytics.avgOrderValue = customers.length > 0 
        ? (analytics.totalSpent / customers.length).toFixed(2)
        : 0;
      
      analytics.topCustomers.sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 10);

      return analytics;
    } catch (error) {
      console.error('Error getting customer analytics:', error);
      return {};
    }
  }

  // ─── تقرير المحفظة والمعاملات ───────────────────────────────────
  async getWalletReport() {
    try {
      const transactions = await fsGetAll('transactions');
      const wallets = await fsGetAll('wallets');

      const report = {
        totalBalances: 0,
        totalCredits: 0,
        totalDebits: 0,
        activeWallets: wallets.filter(w => w.balance > 0).length,
        totalWallets: wallets.length,
        topBalances: [],
        transactionsByType: {},
        dailyTransactions: {}
      };

      // Wallet analysis
      wallets.forEach(wallet => {
        report.totalBalances += wallet.balance || 0;
        report.topBalances.push({
          userId: wallet.uid,
          balance: wallet.balance || 0
        });
      });

      report.topBalances.sort((a, b) => b.balance - a.balance).slice(0, 10);

      // Transaction analysis
      transactions.forEach(tx => {
        report.totalCredits += tx.type === 'credit' ? tx.amount : 0;
        report.totalDebits += tx.type === 'debit' ? tx.amount : 0;
        
        report.transactionsByType[tx.type] = (report.transactionsByType[tx.type] || 0) + 1;
        
        const date = tx.createdAt?.toDate?.().toISOString().split('T')[0] || 'unknown';
        report.dailyTransactions[date] = (report.dailyTransactions[date] || 0) + 1;
      });

      return report;
    } catch (error) {
      console.error('Error generating wallet report:', error);
      return {};
    }
  }

  // ─── تقرير التقييمات والآراء ──────────────────────────────────────
  async getRatingsReport() {
    try {
      const ratings = await fsGetAll('ratings');

      const report = {
        totalRatings: ratings.length,
        averageRating: 0,
        ratingDistribution: {
          5: 0,
          4: 0,
          3: 0,
          2: 0,
          1: 0
        },
        topRatedServices: [],
        worstRatedServices: [],
        recentReviews: []
      };

      let totalStars = 0;
      ratings.forEach(rating => {
        totalStars += rating.stars || 0;
        const stars = Math.round(rating.stars || 0);
        if (stars >= 1 && stars <= 5) {
          report.ratingDistribution[stars]++;
        }
      });

      report.averageRating = ratings.length > 0 
        ? (totalStars / ratings.length).toFixed(2)
        : 0;

      // Group by service
      const serviceRatings = {};
      ratings.forEach(rating => {
        if (!serviceRatings[rating.serviceId]) {
          serviceRatings[rating.serviceId] = { count: 0, total: 0 };
        }
        serviceRatings[rating.serviceId].count++;
        serviceRatings[rating.serviceId].total += rating.stars || 0;
      });

      Object.entries(serviceRatings).forEach(([serviceId, data]) => {
        const avg = (data.total / data.count).toFixed(2);
        report.topRatedServices.push({
          serviceId,
          ratingCount: data.count,
          averageRating: avg
        });
      });

      report.topRatedServices.sort((a, b) => b.averageRating - a.averageRating);

      report.recentReviews = ratings
        .sort((a, b) => (b.createdAt?.toDate?.().getTime() || 0) - (a.createdAt?.toDate?.().getTime() || 0))
        .slice(0, 20)
        .map(r => ({
          serviceId: r.serviceId,
          stars: r.stars,
          comment: r.comment?.substring(0, 50) + '...' || '-',
          date: r.createdAt?.toDate?.().toLocaleDateString('ar-YE') || '-'
        }));

      return report;
    } catch (error) {
      console.error('Error generating ratings report:', error);
      return {};
    }
  }

  // ─── تقرير دعم العملاء ────────────────────────────────────────────
  async getSupportReport() {
    try {
      const tickets = await fsGetAll('support_tickets');
      const messages = await fsGetAll('chat_messages');

      const report = {
        totalTickets: tickets.length,
        openTickets: tickets.filter(t => t.status === 'open').length,
        inProgressTickets: tickets.filter(t => t.status === 'in-progress').length,
        resolvedTickets: tickets.filter(t => t.status === 'resolved').length,
        closedTickets: tickets.filter(t => t.status === 'closed').length,
        avgResolutionTime: 0,
        avgRating: 0,
        totalMessages: messages.length,
        highPriorityTickets: tickets.filter(t => t.priority === 'high' || t.priority === 'urgent').length,
        staffPerformance: {},
        ticketsByPriority: {
          low: tickets.filter(t => t.priority === 'low').length,
          medium: tickets.filter(t => t.priority === 'medium').length,
          high: tickets.filter(t => t.priority === 'high').length,
          urgent: tickets.filter(t => t.priority === 'urgent').length
        }
      };

      // Calculate avg resolution time
      const resolvedTickets = tickets.filter(t => t.closedAt && t.createdAt);
      if (resolvedTickets.length > 0) {
        const times = resolvedTickets.map(t => {
          const created = t.createdAt?.toDate?.().getTime() || 0;
          const closed = t.closedAt?.toDate?.().getTime() || 0;
          return (closed - created) / (1000 * 60 * 60); // hours
        });
        report.avgResolutionTime = (times.reduce((a, b) => a + b) / times.length).toFixed(2);
      }

      // Calculate avg rating
      const ratedTickets = tickets.filter(t => t.rating > 0);
      if (ratedTickets.length > 0) {
        const avgRating = ratedTickets.reduce((sum, t) => sum + t.rating, 0) / ratedTickets.length;
        report.avgRating = avgRating.toFixed(2);
      }

      // Staff performance
      const staffStats = {};
      tickets.forEach(ticket => {
        if (ticket.assignedTo) {
          if (!staffStats[ticket.assignedTo]) {
            staffStats[ticket.assignedTo] = { handled: 0, resolved: 0, avgRating: 0 };
          }
          staffStats[ticket.assignedTo].handled++;
          if (ticket.status === 'resolved' || ticket.status === 'closed') {
            staffStats[ticket.assignedTo].resolved++;
          }
          if (ticket.rating > 0) {
            staffStats[ticket.assignedTo].avgRating += ticket.rating;
          }
        }
      });

      Object.entries(staffStats).forEach(([staffId, stats]) => {
        stats.avgRating = stats.handled > 0 ? (stats.avgRating / stats.handled).toFixed(2) : 0;
        report.staffPerformance[staffId] = stats;
      });

      return report;
    } catch (error) {
      console.error('Error generating support report:', error);
      return {};
    }
  }

  // ─── تصدير التقرير إلى CSV ─────────────────────────────────────────
  exportToCSV(data, filename = 'report.csv') {
    let csv = '';
    
    if (Array.isArray(data) && data.length > 0) {
      // Headers
      const headers = Object.keys(data[0]);
      csv = headers.join(',') + '\n';
      
      // Rows
      data.forEach(row => {
        const values = headers.map(header => {
          const value = row[header];
          // Escape commas and quotes
          return typeof value === 'string' && value.includes(',') 
            ? `"${value.replace(/"/g, '""')}"` 
            : value;
        });
        csv += values.join(',') + '\n';
      });
    } else {
      // Object to CSV
      Object.entries(data).forEach(([key, value]) => {
        csv += `${key},${value}\n`;
      });
    }

    // Download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  // ─── تصدير إلى PDF ─────────────────────────────────────────────────
  exportToPDF(title, content) {
    // Using simple HTML to PDF (يحتاج مكتبة خارجية مثل jsPDF)
    const printWindow = window.open('', '', 'height=600,width=800');
    printWindow.document.write(`
      <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; direction: rtl; padding: 20px; }
          h1 { text-align: center; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 10px; text-align: right; }
          th { background-color: #f2f2f2; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <div>${content}</div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  }
}

// ─── Global Instance ───────────────────────────────────────────────
const reportsManager = new ReportsManager();

// ─── Rendering Functions ──────────────────────────────────────────

// ─── عرض لوحة التقارير ────────────────────────────────────────────
function renderReportsPage() {
  return `
  <div class="reports-page">
    <div style="padding:8px 0 0"><button class="back-btn" onclick="goBack('admin')">→ رجوع</button></div>
    <div class="reports-header">
      <h2>📊 التقارير والتحليلات</h2>
      <div class="date-range-selector">
        <input type="date" id="report-start-date">
        <input type="date" id="report-end-date">
        <button class="btn btn-primary" onclick="generateReports()">توليد التقرير</button>
      </div>
    </div>

    <div class="reports-tabs">
      <button class="report-tab-btn active" onclick="switchReportTab('overview')">📈 نظرة عامة</button>
      <button class="report-tab-btn" onclick="switchReportTab('sales')">💰 المبيعات</button>
      <button class="report-tab-btn" onclick="switchReportTab('vendors')">🏪 البائعون</button>
      <button class="report-tab-btn" onclick="switchReportTab('customers')">👥 العملاء</button>
      <button class="report-tab-btn" onclick="switchReportTab('support')">🎧 الدعم</button>
      <button class="report-tab-btn" onclick="switchReportTab('ratings')">⭐ التقييمات</button>
    </div>

    <div class="reports-content" id="reports-content">
      <div class="loading">جاري تحميل التقارير...</div>
    </div>
  </div>
  `;
}

// ─── عرض التقرير الشامل ───────────────────────────────────────────
async function switchReportTab(tab) {
  const content = document.getElementById('reports-content');
  content.innerHTML = '<div class="loading">جاري التحميل...</div>';

  let reportHtml = '';

  switch (tab) {
    case 'overview':
      reportHtml = await renderOverviewReport();
      break;
    case 'sales':
      reportHtml = await renderSalesReport();
      break;
    case 'vendors':
      reportHtml = await renderVendorsReport();
      break;
    case 'customers':
      reportHtml = await renderCustomersReport();
      break;
    case 'support':
      reportHtml = await renderSupportReport();
      break;
    case 'ratings':
      reportHtml = await renderRatingsReport();
      break;
  }

  content.innerHTML = reportHtml;
  updateReportTabButtons(tab);
}

// ─── نظرة عامة ─────────────────────────────────────────────────────
async function renderOverviewReport() {
  const today = new Date();
  const lastMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  
  const salesReport = await reportsManager.getSalesReport(lastMonth, today);
  const customerAnalytics = await reportsManager.getCustomerAnalytics();
  const walletReport = await reportsManager.getWalletReport();
  const supportReport = await reportsManager.getSupportReport();

  return `
  <div class="overview-report">
    <div class="key-metrics">
      <div class="metric-card">
        <div class="metric-value">${salesReport.totalOrders || 0}</div>
        <div class="metric-label">إجمالي الطلبات</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${(salesReport.totalRevenue || 0).toLocaleString()} ر.ي</div>
        <div class="metric-label">إجمالي الإيرادات</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${(salesReport.profit || 0).toLocaleString()} ر.ي</div>
        <div class="metric-label">الربح</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${salesReport.profitMargin || 0}%</div>
        <div class="metric-label">هامش الربح</div>
      </div>
    </div>

    <div class="overview-section">
      <h3>👥 بيانات العملاء</h3>
      <div class="stats-grid">
        <div class="stat-item">
          <span class="stat-label">إجمالي العملاء:</span>
          <span class="stat-value">${customerAnalytics.totalCustomers || 0}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">العملاء النشطون:</span>
          <span class="stat-value">${customerAnalytics.activeCustomers || 0}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">العملاء المتكررون:</span>
          <span class="stat-value">${customerAnalytics.repeatCustomers || 0}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">متوسط قيمة الطلب:</span>
          <span class="stat-value">${customerAnalytics.avgOrderValue || 0} ر.ي</span>
        </div>
      </div>
    </div>

    <div class="overview-section">
      <h3>🎧 جودة الدعم</h3>
      <div class="stats-grid">
        <div class="stat-item">
          <span class="stat-label">تذاكر مفتوحة:</span>
          <span class="stat-value">${supportReport.openTickets || 0}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">متوسط وقت الحل:</span>
          <span class="stat-value">${supportReport.avgResolutionTime || 0} ساعة</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">متوسط التقييم:</span>
          <span class="stat-value">${supportReport.avgRating || 0} / 5</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">معدل الحل:</span>
          <span class="stat-value">${supportReport.totalTickets > 0 ? ((supportReport.resolvedTickets / supportReport.totalTickets) * 100).toFixed(0) : 0}%</span>
        </div>
      </div>
    </div>

    <div class="overview-section">
      <h3>💰 المحفظة</h3>
      <div class="stats-grid">
        <div class="stat-item">
          <span class="stat-label">إجمالي الأرصدة:</span>
          <span class="stat-value">${(walletReport.totalBalances || 0).toLocaleString()} ر.ي</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">المحافظ النشطة:</span>
          <span class="stat-value">${walletReport.activeWallets || 0}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">إجمالي الائتمانات:</span>
          <span class="stat-value">${(walletReport.totalCredits || 0).toLocaleString()} ر.ي</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">إجمالي الخصومات:</span>
          <span class="stat-value">${(walletReport.totalDebits || 0).toLocaleString()} ر.ي</span>
        </div>
      </div>
    </div>

    <div class="export-buttons">
      <button class="btn btn-outline" onclick="exportReport('overview', 'csv')">📥 تصدير CSV</button>
      <button class="btn btn-outline" onclick="exportReport('overview', 'pdf')">📄 تصدير PDF</button>
    </div>
  </div>
  `;
}

// ─── تقرير المبيعات ───────────────────────────────────────────────
async function renderSalesReport() {
  const today = new Date();
  const lastMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  
  const salesReport = await reportsManager.getSalesReport(lastMonth, today);
  const categoryPerformance = await reportsManager.getCategoryPerformance();

  return `
  <div class="sales-report">
    <div class="report-section">
      <h3>📊 ملخص المبيعات</h3>
      <table class="report-table">
        <tr>
          <td>إجمالي الطلبات:</td>
          <td><strong>${salesReport.totalOrders || 0}</strong></td>
        </tr>
        <tr>
          <td>إجمالي الإيرادات:</td>
          <td><strong>${(salesReport.totalRevenue || 0).toLocaleString()} ر.ي</strong></td>
        </tr>
        <tr>
          <td>إجمالي التكاليف:</td>
          <td><strong>${(salesReport.totalCost || 0).toLocaleString()} ر.ي</strong></td>
        </tr>
        <tr>
          <td>الربح الصافي:</td>
          <td><strong>${(salesReport.profit || 0).toLocaleString()} ر.ي</strong></td>
        </tr>
        <tr>
          <td>هامش الربح:</td>
          <td><strong>${salesReport.profitMargin || 0}%</strong></td>
        </tr>
      </table>
    </div>

    <div class="report-section">
      <h3>🏪 أداء الفئات</h3>
      <table class="report-table">
        <thead>
          <tr>
            <th>الفئة</th>
            <th>عدد الطلبات</th>
            <th>الإيرادات</th>
            <th>التقييم</th>
          </tr>
        </thead>
        <tbody>
          ${categoryPerformance.map(cat => `
          <tr>
            <td>${cat.categoryName}</td>
            <td>${cat.orderCount}</td>
            <td>${(cat.totalRevenue || 0).toLocaleString()} ر.ي</td>
            <td>⭐ ${cat.avgRating || 0}</td>
          </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <div class="export-buttons">
      <button class="btn btn-outline" onclick="exportReport('sales', 'csv')">📥 تصدير CSV</button>
      <button class="btn btn-outline" onclick="exportReport('sales', 'pdf')">📄 تصدير PDF</button>
    </div>
  </div>
  `;
}

// ─── تقرير البائعين ───────────────────────────────────────────────
function _fmtResponseTime(secs) {
  if (secs == null) return '<span style="color:var(--text-muted,#64748b)">—</span>';
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  const txt = m > 0 ? `${m}د ${s}ث` : `${s}ث`;
  const color = secs <= 120 ? '#22c55e' : secs <= 300 ? '#f59e0b' : '#ef4444';
  return `<span style="color:${color};font-weight:800">${txt}</span>`;
}

async function renderVendorsReport() {
  const vendorPerformance = await reportsManager.getVendorPerformance();

  return `
  <div class="vendors-report">
    <h3>🏪 أداء البائعين والمزوّدين</h3>
    <div style="overflow-x:auto">
    <table class="report-table full-width" style="min-width:820px">
      <thead>
        <tr>
          <th>الاسم</th>
          <th>الطلبات</th>
          <th>المكتملة</th>
          <th>الملغاة</th>
          <th>معدل الإنجاز</th>
          <th>⏱ متوسط الاستجابة</th>
          <th>✅ معدل القبول</th>
          <th>الإيرادات</th>
          <th>التقييم</th>
          <th>تاريخ الانضمام</th>
        </tr>
      </thead>
      <tbody>
        ${vendorPerformance.map(vendor => `
        <tr>
          <td style="font-weight:700">${vendor.vendorName}</td>
          <td>${vendor.totalOrders}</td>
          <td style="color:#22c55e">${vendor.completedOrders}</td>
          <td style="color:#ef4444">${vendor.cancelledOrders}</td>
          <td>
            <span style="font-weight:800;color:${Number(vendor.completionRate)>=80?'#22c55e':Number(vendor.completionRate)>=50?'#f59e0b':'#ef4444'}">
              ${vendor.completionRate}%
            </span>
          </td>
          <td>${_fmtResponseTime(vendor.avgResponseSecs)}</td>
          <td>
            ${vendor.acceptRate != null
              ? `<span style="font-weight:800;color:${Number(vendor.acceptRate)>=80?'#22c55e':Number(vendor.acceptRate)>=50?'#f59e0b':'#ef4444'}">${vendor.acceptRate}%</span>
                 <span style="font-size:10px;color:var(--text-muted,#64748b)">(${vendor.acceptedOrders}✅ / ${vendor.rejectedOrders}❌)</span>`
              : '<span style="color:var(--text-muted,#64748b)">—</span>'}
          </td>
          <td>${(vendor.totalRevenue || 0).toLocaleString()} ر.ي</td>
          <td>⭐ ${vendor.avgRating || 0}</td>
          <td>${vendor.joinDate}</td>
        </tr>
        `).join('')}
      </tbody>
    </table>
    </div>

    <div style="margin-top:12px;padding:12px 16px;background:rgba(245,158,11,0.08);border-radius:10px;border:1.5px solid rgba(245,158,11,0.2);font-size:12px;color:var(--text-secondary,#94a3b8)">
      ⏱ <strong>متوسط الاستجابة:</strong>
      <span style="color:#22c55e">● أقل من دقيقتين = ممتاز</span> ·
      <span style="color:#f59e0b">● 2-5 دقائق = جيد</span> ·
      <span style="color:#ef4444">● أكثر من 5 دقائق = بطيء</span>
    </div>

    <div class="export-buttons" style="margin-top:12px">
      <button class="btn btn-outline" onclick="exportReport('vendors', 'csv')">📥 تصدير CSV</button>
    </div>
  </div>
  `;
}

// ─── تقرير العملاء ────────────────────────────────────────────────
async function renderCustomersReport() {
  const customerAnalytics = await reportsManager.getCustomerAnalytics();

  return `
  <div class="customers-report">
    <div class="report-section">
      <h3>👥 ملخص العملاء</h3>
      <table class="report-table">
        <tr>
          <td>إجمالي العملاء:</td>
          <td><strong>${customerAnalytics.totalCustomers || 0}</strong></td>
        </tr>
        <tr>
          <td>العملاء النشطون:</td>
          <td><strong>${customerAnalytics.activeCustomers || 0}</strong></td>
        </tr>
        <tr>
          <td>العملاء الجدد:</td>
          <td><strong>${customerAnalytics.newCustomers || 0}</strong></td>
        </tr>
        <tr>
          <td>العملاء المتكررون:</td>
          <td><strong>${customerAnalytics.repeatCustomers || 0}</strong></td>
        </tr>
        <tr>
          <td>إجمالي المصاريف:</td>
          <td><strong>${(customerAnalytics.totalSpent || 0).toLocaleString()} ر.ي</strong></td>
        </tr>
        <tr>
          <td>متوسط قيمة الطلب:</td>
          <td><strong>${customerAnalytics.avgOrderValue || 0} ر.ي</strong></td>
        </tr>
      </table>
    </div>

    <div class="report-section">
      <h3>🎯 تصنيف العملاء</h3>
      <ul>
        <li>عملاء قيمة عالية: <strong>${customerAnalytics.customerSegmentation?.highValue || 0}</strong></li>
        <li>عملاء قيمة متوسطة: <strong>${customerAnalytics.customerSegmentation?.mediumValue || 0}</strong></li>
        <li>عملاء قيمة منخفضة: <strong>${customerAnalytics.customerSegmentation?.lowValue || 0}</strong></li>
      </ul>
    </div>

    <div class="report-section">
      <h3>🌟 أفضل العملاء</h3>
      <table class="report-table">
        <thead>
          <tr>
            <th>الاسم</th>
            <th>عدد الطلبات</th>
            <th>المصاريف</th>
            <th>آخر طلب</th>
          </tr>
        </thead>
        <tbody>
          ${customerAnalytics.topCustomers?.slice(0, 10).map(customer => `
          <tr>
            <td>${customer.customerName}</td>
            <td>${customer.orderCount}</td>
            <td>${(customer.totalSpent || 0).toLocaleString()} ر.ي</td>
            <td>${customer.lastOrderDate}</td>
          </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <div class="export-buttons">
      <button class="btn btn-outline" onclick="exportReport('customers', 'csv')">📥 تصدير CSV</button>
    </div>
  </div>
  `;
}

// ─── تقرير الدعم ──────────────────────────────────────────────────
async function renderSupportReport() {
  const supportReport = await reportsManager.getSupportReport();

  return `
  <div class="support-report">
    <div class="report-section">
      <h3>🎧 إحصائيات الدعم</h3>
      <div class="support-stats-grid">
        <div class="stat-card">
          <div class="stat-num">${supportReport.totalTickets || 0}</div>
          <div class="stat-label">إجمالي التذاكر</div>
        </div>
        <div class="stat-card">
          <div class="stat-num">${supportReport.openTickets || 0}</div>
          <div class="stat-label">تذاكر مفتوحة</div>
        </div>
        <div class="stat-card">
          <div class="stat-num">${supportReport.inProgressTickets || 0}</div>
          <div class="stat-label">قيد المعالجة</div>
        </div>
        <div class="stat-card">
          <div class="stat-num">${supportReport.resolvedTickets || 0}</div>
          <div class="stat-label">محلولة</div>
        </div>
        <div class="stat-card">
          <div class="stat-num">${supportReport.closedTickets || 0}</div>
          <div class="stat-label">مغلقة</div>
        </div>
        <div class="stat-card">
          <div class="stat-num">${supportReport.avgResolutionTime || 0}h</div>
          <div class="stat-label">متوسط وقت الحل</div>
        </div>
      </div>
    </div>

    <div class="report-section">
      <h3>⚠️ التذاكر حسب الأولوية</h3>
      <table class="report-table">
        <tr>
          <td>🟢 منخفضة:</td>
          <td><strong>${supportReport.ticketsByPriority?.low || 0}</strong></td>
        </tr>
        <tr>
          <td>🟡 متوسطة:</td>
          <td><strong>${supportReport.ticketsByPriority?.medium || 0}</strong></td>
        </tr>
        <tr>
          <td>🔴 عالية:</td>
          <td><strong>${supportReport.ticketsByPriority?.high || 0}</strong></td>
        </tr>
        <tr>
          <td>⛔ عاجلة:</td>
          <td><strong>${supportReport.ticketsByPriority?.urgent || 0}</strong></td>
        </tr>
      </table>
    </div>

    <div class="export-buttons">
      <button class="btn btn-outline" onclick="exportReport('support', 'csv')">📥 تصدير CSV</button>
    </div>
  </div>
  `;
}

// ─── تقرير التقييمات ──────────────────────────────────────────────
async function renderRatingsReport() {
  const ratingsReport = await reportsManager.getRatingsReport();

  return `
  <div class="ratings-report">
    <div class="report-section">
      <h3>⭐ ملخص التقييمات</h3>
      <table class="report-table">
        <tr>
          <td>إجمالي التقييمات:</td>
          <td><strong>${ratingsReport.totalRatings || 0}</strong></td>
        </tr>
        <tr>
          <td>متوسط التقييم:</td>
          <td><strong>${ratingsReport.averageRating || 0} / 5</strong></td>
        </tr>
      </table>
    </div>

    <div class="report-section">
      <h3>📊 توزيع التقييمات</h3>
      <ul style="list-style: none;">
        <li>⭐⭐⭐⭐⭐ 5 نجوم: <strong>${ratingsReport.ratingDistribution?.[5] || 0}</strong></li>
        <li>⭐⭐⭐⭐ 4 نجوم: <strong>${ratingsReport.ratingDistribution?.[4] || 0}</strong></li>
        <li>⭐⭐⭐ 3 نجوم: <strong>${ratingsReport.ratingDistribution?.[3] || 0}</strong></li>
        <li>⭐⭐ 2 نجوم: <strong>${ratingsReport.ratingDistribution?.[2] || 0}</strong></li>
        <li>⭐ 1 نجم: <strong>${ratingsReport.ratingDistribution?.[1] || 0}</strong></li>
      </ul>
    </div>

    <div class="export-buttons">
      <button class="btn btn-outline" onclick="exportReport('ratings', 'csv')">📥 تصدير CSV</button>
    </div>
  </div>
  `;
}

// ─── Helper Functions ──────────────────────────────────────────────
function updateReportTabButtons(activeTab) {
  document.querySelectorAll('.report-tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  event.target.classList.add('active');
}

async function generateReports() {
  toast('✅ جاري توليد التقارير...', 'success');
}

async function exportReport(reportType, format) {
  if (format === 'csv') {
    toast('✅ جاري تصدير التقرير...', 'success');
    // Implementation would depend on report type
  } else if (format === 'pdf') {
    toast('✅ جاري إنشاء ملف PDF...', 'success');
  }
}
