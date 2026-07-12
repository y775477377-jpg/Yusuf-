// ==================================================================
// modules/dashboard.js
// ------------------------------------------------------------------
// منطق حساب مؤشرات لوحة التحكم (بحت، بدون DOM).
// يحسب: إيرادات اليوم/الشهر، إجمالي المقبوضات، إجمالي المصروفات،
// الأرباح، الرصيد المستحق على التجار، وآخر العمليات (فواتير/سندات
// قبض/سندات صرف) لعرضها في لوحة التحكم.
// ==================================================================

function invoiceTime(inv) {
  return Number(inv.createdAt) || 0;
}
function receiptTime(r) {
  return Number(r.createdAt) || 0;
}
function expenseTime(e) {
  return Number(e.createdAt) || (e.date ? new Date(e.date + "T00:00:00").getTime() : 0);
}

/**
 * إجمالي إيرادات الفواتير ضمن نطاق تاريخ [from, to).
 */
export function computeRevenueForRange(invoices, from, to) {
  return invoices
    .filter((i) => {
      const t = invoiceTime(i);
      return t >= from && t < to;
    })
    .reduce((s, i) => s + (Number(i.total) || 0), 0);
}

/**
 * الملخص الكامل لمؤشرات لوحة التحكم.
 */
export function computeDashboardSummary(invoices, receipts, expenses) {
  const now = new Date();
  const todayFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const todayTo = todayFrom + 86400000;
  const monthFrom = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const monthTo = new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime();

  const todayRevenue = computeRevenueForRange(invoices, todayFrom, todayTo);
  const monthRevenue = computeRevenueForRange(invoices, monthFrom, monthTo);

  const totalReceipts = receipts.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const totalExpenses = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const totalRevenue = invoices.reduce((s, i) => s + (Number(i.total) || 0), 0);

  // ملاحظة محاسبية مهمة: "totalRevenue" (إجمالي مبالغ الفواتير) ليس ربحاً للمكتب،
  // فهو يشمل رسوم جمركية وضرائب ونثريات وأجور عمال تُدفع لجهات أخرى (الجمارك،
  // العمال، ...) وتمر عبر المكتب فقط. الربح الفعلي للمكتب هو "عمولة المكتب"
  // فقط (حقل office داخل كل فاتورة)، مطروحاً منها مصروفات المكتب الحقيقية
  // (سندات الصرف). لذلك يُحسب صافي الربح من العمولة وليس من إجمالي الفاتورة.
  const totalOfficeCommission = invoices.reduce((s, i) => s + (Number(i.office) || 0), 0);
  const netProfit = totalOfficeCommission - totalExpenses;

  // الرصيد المستحق على التجار: لكل تاجر (فواتيره - سنداته)، ثم جمع الأرصدة الموجبة فقط
  const traderBalances = {};
  invoices.forEach((i) => {
    const m = i.merchant || "غير محدد";
    traderBalances[m] = (traderBalances[m] || 0) + (Number(i.total) || 0);
  });
  receipts.forEach((r) => {
    const m = r.trader || "غير محدد";
    traderBalances[m] = (traderBalances[m] || 0) - (Number(r.amount) || 0);
  });
  const outstandingBalance = Object.values(traderBalances).reduce((s, b) => s + (b > 0 ? b : 0), 0);

  const recentInvoices = [...invoices].sort((a, b) => invoiceTime(b) - invoiceTime(a)).slice(0, 10);
  const recentReceipts = [...receipts].sort((a, b) => receiptTime(b) - receiptTime(a)).slice(0, 10);
  const recentExpenses = [...expenses].sort((a, b) => expenseTime(b) - expenseTime(a)).slice(0, 10);

  return {
    todayRevenue,
    monthRevenue,
    totalReceipts,
    totalExpenses,
    totalRevenue,
    totalOfficeCommission,
    netProfit,
    outstandingBalance,
    recentInvoices,
    recentReceipts,
    recentExpenses,
  };
}
