// ==================================================================
// modules/accountsEngine.js
// ------------------------------------------------------------------
// محرك الحسابات الموحّد للنظام المحاسبي.
// هذه وحدة "منطق بحت" (Pure Logic) لا تلمس DOM إطلاقاً ولا تتعامل
// مع Firebase مباشرة، بل تستقبل مصفوفات البيانات (فواتير / سندات قبض
// / قواطر) الجاهزة من main.js وتُرجع نتائج حسابية جاهزة للعرض.
//
// الهدف: أي شاشة حساب (تاجر / سائق / قاطرة) تستخدم نفس المحرك،
// بدل تكرار نفس منطق الفلترة والتجميع في كل مكان.
//
// لا يوجد أي تعديل على main.js الحالي أو على قاعدة البيانات هنا؛
// هذه إضافة جديدة بالكامل.
// ==================================================================

/**
 * تحويل نص تاريخ (yyyy-mm-dd) إلى timestamp رقمي.
 */
export function dateStringToTimestamp(dateStr) {
  if (!dateStr) return 0;
  return new Date(dateStr + "T00:00:00").getTime();
}

/**
 * حساب نطاق التاريخ (from/to) بناءً على نوع الفترة المختارة.
 * periodType: 'all' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'
 */
export function resolveDateRange(periodType, customFrom, customTo) {
  const today = new Date();
  let from = 0;
  let to = Date.now() + 86400000;

  switch (periodType) {
    case "daily":
      from = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
      to = from + 86400000;
      break;
    case "weekly": {
      const dayOfWeek = today.getDay();
      from = new Date(today.getFullYear(), today.getMonth(), today.getDate() - dayOfWeek).getTime();
      to = from + 7 * 86400000;
      break;
    }
    case "monthly":
      from = new Date(today.getFullYear(), today.getMonth(), 1).getTime();
      to = new Date(today.getFullYear(), today.getMonth() + 1, 1).getTime();
      break;
    case "yearly":
      from = new Date(today.getFullYear(), 0, 1).getTime();
      to = new Date(today.getFullYear() + 1, 0, 1).getTime();
      break;
    case "custom":
      if (customFrom && customTo) {
        from = dateStringToTimestamp(customFrom);
        to = dateStringToTimestamp(customTo) + 86400000;
      }
      break;
    case "all":
    default:
      from = 0;
      to = Date.now() + 86400000;
      break;
  }
  return { from, to };
}

function invoiceTime(inv) {
  return Number(inv.createdAt) || dateStringToTimestamp(inv.date) || 0;
}
function receiptTime(r) {
  return Number(r.createdAt) || dateStringToTimestamp(r.date) || 0;
}

/**
 * كشف حساب تاجر: مدين / دائن / رصيد متحرك.
 * (نفس منطق loadMerchantAccount الحالي في main.js، منقول هنا كي
 * يمكن اختباره وإعادة استخدامه، دون حذف الدالة الأصلية بعد.)
 */
export function buildTraderStatement(invoices, receipts, traderName, range) {
  const { from, to } = range;

  const traderInvoices = invoices.filter((inv) => {
    const t = invoiceTime(inv);
    return inv.merchant === traderName && t >= from && t <= to;
  });

  const traderReceipts = receipts.filter((r) => {
    const t = receiptTime(r);
    return r.trader === traderName && t >= from && t <= to;
  });

  const totalInvoices = traderInvoices.reduce((s, i) => s + (Number(i.total) || 0), 0);
  const totalReceipts = traderReceipts.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const totalBags = traderInvoices.reduce((s, i) => s + (Number(i.bagCount) || 0), 0);
  const totalFees = traderInvoices.reduce(
    (s, i) => s + (Number(i.office) || 0) + (Number(i.misc) || 0) + (Number(i.fixed) || 0),
    0
  );

  const transactions = [
    ...traderInvoices.map((i) => ({
      type: "invoice",
      date: i.date,
      operationNumber: i.invoiceNumber || "",
      driver: i.driver || "",
      truckNumber: i.truckNumber || "",
      bagCount: i.bagCount || 0,
      details: `فاتورة ${i.invoiceNumber || ""} - ${i.bagCount || 0} كيس`,
      debit: Number(i.total) || 0,
      credit: 0,
      ts: invoiceTime(i),
    })),
    ...traderReceipts.map((r) => ({
      type: "receipt",
      date: r.date,
      operationNumber: "",
      driver: "",
      truckNumber: "",
      bagCount: "",
      details: r.notes || "سند قبض",
      debit: 0,
      credit: Number(r.amount) || 0,
      ts: receiptTime(r),
    })),
  ].sort((a, b) => a.ts - b.ts);

  let running = 0;
  transactions.forEach((t) => {
    running += t.debit - t.credit;
    t.balance = running;
  });

  return {
    entityName: traderName,
    invoiceCount: traderInvoices.length,
    receiptCount: traderReceipts.length,
    totalInvoices,
    totalReceipts,
    totalBags,
    totalFees,
    balance: totalInvoices - totalReceipts,
    transactions,
  };
}

/**
 * كشف حساب سائق: عدد الرحلات، الأكياس، إجمالي الرسوم (أجرة السائق
 * المحسوبة داخل كل فاتورة)، التجار الذين عمل معهم، القواطر التي قادها.
 */
export function buildDriverStatement(invoices, driverName, range) {
  const { from, to } = range;

  const trips = invoices
    .filter((i) => {
      const t = invoiceTime(i);
      return i.driver === driverName && t >= from && t <= to;
    })
    .sort((a, b) => invoiceTime(a) - invoiceTime(b));

  const totalBags = trips.reduce((s, i) => s + (Number(i.bagCount) || 0), 0);
  const totalFees = trips.reduce((s, i) => s + (Number(i.worker) || 0), 0);
  const traders = [...new Set(trips.map((i) => i.merchant).filter(Boolean))];
  const trucks = [...new Set(trips.map((i) => i.truckNumber).filter(Boolean))];

  return {
    entityName: driverName,
    tripCount: trips.length,
    totalBags,
    totalFees,
    traders,
    trucks,
    trips,
  };
}

/**
 * كشف حساب قاطرة: رقم اللوحة، النوع، عدد الرحلات، الأكياس،
 * إجمالي الرسوم، السائقين الذين قادوها، التجار الذين حملت لهم.
 */
export function buildTruckStatement(invoices, truckMeta, truckNumber, range) {
  const { from, to } = range;

  const trips = invoices
    .filter((i) => {
      const t = invoiceTime(i);
      return i.truckNumber === truckNumber && t >= from && t <= to;
    })
    .sort((a, b) => invoiceTime(a) - invoiceTime(b));

  const totalBags = trips.reduce((s, i) => s + (Number(i.bagCount) || 0), 0);
  const totalFees = trips.reduce((s, i) => s + (Number(i.worker) || 0), 0);
  const drivers = [...new Set(trips.map((i) => i.driver).filter(Boolean))];
  const traders = [...new Set(trips.map((i) => i.merchant).filter(Boolean))];

  return {
    entityName: truckNumber,
    truckType: truckMeta?.type || "",
    truckOwner: truckMeta?.owner || "",
    tripCount: trips.length,
    totalBags,
    totalFees,
    drivers,
    traders,
    trips,
  };
}
