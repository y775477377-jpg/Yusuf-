// ==================================================================
// modules/reports.js
// ------------------------------------------------------------------
// منطق حساب التقارير (بحت، بدون DOM). يُستخدم من main.js لتوليد كل
// أنواع التقارير: يومي/أسبوعي/شهري/سنوي × حسب تاجر/سائق/قاطرة/نوع
// القاطرة/الرسوم، دون تكرار حسابات المجاميع في كل مكان.
//
// يعيد تصدير resolveDateRange من accountsEngine.js حتى تُستخدم نفس
// دالة حساب نطاق التاريخ في كل من كشوفات الحسابات والتقارير (مصدر
// واحد للحقيقة).
// ==================================================================

export { resolveDateRange } from "./accountsEngine.js";

function invoiceTime(inv) {
  return Number(inv.createdAt) || 0;
}

/**
 * تصفية الفواتير ضمن نطاق تاريخ (from/to).
 */
export function filterInvoicesByRange(invoices, range) {
  const { from, to } = range;
  return invoices.filter((inv) => {
    const t = invoiceTime(inv);
    return t >= from && t <= to;
  });
}

/**
 * حساب المجاميع المالية الأساسية لمجموعة فواتير.
 */
export function computeInvoiceTotals(invoices) {
  const total = invoices.reduce((s, i) => s + (Number(i.total) || 0), 0);
  const totalBags = invoices.reduce((s, i) => s + (Number(i.bagCount) || 0), 0);
  const totalBagFee = invoices.reduce((s, i) => s + (Number(i.bagFee) || 0), 0);
  const totalFixed = invoices.reduce((s, i) => s + (Number(i.fixed) || 74000), 0);
  const totalWorker = invoices.reduce((s, i) => s + (Number(i.worker) || 0), 0);
  const totalMisc = invoices.reduce((s, i) => s + (Number(i.misc) || 8500), 0);
  const totalOffice = invoices.reduce((s, i) => s + (Number(i.office) || 8500), 0);
  return { total, totalBags, totalBagFee, totalFixed, totalWorker, totalMisc, totalOffice };
}

/**
 * تجميع فواتير حسب مفتاح (اسم تاجر / سائق / رقم قاطرة / نوع قاطرة...).
 */
function groupInvoicesBy(invoices, keyFn) {
  const stats = {};
  invoices.forEach((inv) => {
    const key = keyFn(inv) || "غير محدد";
    if (!stats[key]) stats[key] = { count: 0, bags: 0, total: 0 };
    stats[key].count++;
    stats[key].bags += Number(inv.bagCount) || 0;
    stats[key].total += Number(inv.total) || 0;
  });
  return Object.entries(stats).map(([name, s]) => ({
    label: name,
    value: `${s.count} فاتورة - ${s.bags.toLocaleString()} كيس - ${s.total.toLocaleString()} ريال`,
  }));
}

/**
 * الدالة الرئيسية: تُرجع عنوان التقرير + صفوف الملخص + المجاميع،
 * بحسب تصنيف التقرير المطلوب (category).
 * category: 'daily' | 'merchant' | 'driver' | 'truck' | 'truckType' | 'fees' | 'general'
 */
export function computeReportData(invoices, category) {
  const totals = computeInvoiceTotals(invoices);

  switch (category) {
    case "daily":
      return {
        reportTitle: "التقرير اليومي",
        totals,
        reportData: [
          { label: "عدد الفواتير", value: invoices.length },
          { label: "اجمالي الاكياس", value: totals.totalBags.toLocaleString() + " كيس" },
          { label: "رسوم الاكياس", value: totals.totalBagFee.toLocaleString() + " ريال" },
          { label: "الرسوم الثابتة", value: totals.totalFixed.toLocaleString() + " ريال" },
          { label: "رسوم العمال", value: totals.totalWorker.toLocaleString() + " ريال" },
          { label: "النثرية", value: totals.totalMisc.toLocaleString() + " ريال" },
          { label: "عمولة المكتب", value: totals.totalOffice.toLocaleString() + " ريال" },
          { label: "الاجمالي الكلي", value: totals.total.toLocaleString() + " ريال" },
        ],
      };

    case "merchant":
      return { reportTitle: "تقرير التجار", totals, reportData: groupInvoicesBy(invoices, (i) => i.merchant) };

    case "driver":
      return { reportTitle: "تقرير السائقين", totals, reportData: groupInvoicesBy(invoices, (i) => i.driver) };

    case "truck":
      return { reportTitle: "تقرير القواطر", totals, reportData: groupInvoicesBy(invoices, (i) => i.truckNumber) };

    case "truckType":
      return {
        reportTitle: "تقرير حسب نوع القاطرة",
        totals,
        reportData: groupInvoicesBy(invoices, (i) => (i.truckType === "dump" ? "قلاب" : "سطحة")),
      };

    case "fees":
      return {
        reportTitle: "تقرير الرسوم",
        totals,
        reportData: [
          { label: "رسوم الاكياس", value: totals.totalBagFee.toLocaleString() + " ريال" },
          { label: "الرسوم الثابتة", value: totals.totalFixed.toLocaleString() + " ريال" },
          { label: "رسوم العمال", value: totals.totalWorker.toLocaleString() + " ريال" },
          { label: "النثرية", value: totals.totalMisc.toLocaleString() + " ريال" },
          { label: "عمولة المكتب", value: totals.totalOffice.toLocaleString() + " ريال" },
          {
            label: "اجمالي الرسوم",
            value:
              (totals.totalBagFee + totals.totalFixed + totals.totalWorker + totals.totalMisc + totals.totalOffice).toLocaleString() +
              " ريال",
          },
        ],
      };

    default:
      return {
        reportTitle: "التقرير العام",
        totals,
        reportData: [
          { label: "عدد الفواتير", value: invoices.length },
          { label: "اجمالي الاكياس", value: totals.totalBags.toLocaleString() + " كيس" },
          { label: "الاجمالي الكلي", value: totals.total.toLocaleString() + " ريال" },
        ],
      };
  }
}
