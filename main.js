import { db } from "./firebase-config.js";
import {
  ref,
  onValue,
  get,
  set,
  push,
  update,
  remove
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-database.js";
import {
  resolveDateRange,
  buildDriverStatement,
  buildTruckStatement
} from "./modules/accountsEngine.js";
import { exportRowsToExcel } from "./modules/exportUtils.js";
import { computeReportData, filterInvoicesByRange } from "./modules/reports.js";
import {
  addExpenseVoucher,
  fetchExpenseVouchers,
  filterExpensesByRange,
  computeExpensesTotal,
  computeProfitAndLoss
} from "./modules/expenses.js";
import { computeDashboardSummary } from "./modules/dashboard.js";

// ==================== عناصر الواجهة - الفواتير ====================
const invoiceNumber = document.getElementById("invoiceNumber");
const invoiceDate = document.getElementById("invoiceDate");
const merchantName = document.getElementById("merchantName");
const driverName = document.getElementById("driverName");
const truckNumber = document.getElementById("truckNumber");
const bagCount = document.getElementById("bagCount");
const truckType = document.getElementById("truckType");
const customsOfficeEl = document.getElementById("customsOffice");

const displayBagCount = document.getElementById("displayBagCount");
const bagsFee = document.getElementById("bagsFee");
const workerFee = document.getElementById("workerFee");
const totalAmount = document.getElementById("totalAmount");

const calculateBtn = document.getElementById("calculateBtn");
const saveInvoiceBtn = document.getElementById("saveInvoiceBtn");
const exportButtons = document.getElementById("exportButtons");

// ==================== عناصر الواجهة - التجار ====================
const traderName = document.getElementById("traderName");
const traderPhone = document.getElementById("traderPhone");
const addTraderBtn = document.getElementById("addTraderBtn");
const tradersList = document.getElementById("tradersList");
const tradersDatalist = document.getElementById("tradersDatalist");
const searchTrader = document.getElementById("searchTrader");

// ==================== عناصر الواجهة - السائقين ====================
const driverNameInput = document.getElementById("driverNameInput");
const driverPhone = document.getElementById("driverPhone");
const addDriverBtn = document.getElementById("addDriverBtn");
const driversList = document.getElementById("driversList");
const driversDatalist = document.getElementById("driversDatalist");
const searchDriver = document.getElementById("searchDriver");

// ==================== عناصر الواجهة - القواطر ====================
const truckNumberInput = document.getElementById("truckNumberInput");
const truckOwner = document.getElementById("truckOwner");
const truckTypeInput = document.getElementById("truckTypeInput");
const addTruckBtn = document.getElementById("addTruckBtn");
const trucksList = document.getElementById("trucksList");
const trucksDatalist = document.getElementById("trucksDatalist");
const searchTruck = document.getElementById("searchTruck");

// ==================== عناصر الواجهة - سندات القبض ====================
const receiptTrader = document.getElementById("receiptTrader");
const receiptAmount = document.getElementById("receiptAmount");
const receiptDate = document.getElementById("receiptDate");
const receiptNotes = document.getElementById("receiptNotes");
const receiptTypeEl = document.getElementById("receiptType");
const saveReceiptBtn = document.getElementById("saveReceiptBtn");
const receiptsList = document.getElementById("receiptsList");

// ==================== عناصر الواجهة - حسابات التجار ====================
const merchantAccountSelect = document.getElementById("merchantAccountSelect");
const merchantSummary = document.getElementById("merchantSummary");
const merchantInvoiceCount = document.getElementById("merchantInvoiceCount");
const totalInvoicesEl = document.getElementById("totalInvoices");
const merchantReceiptCount = document.getElementById("merchantReceiptCount");
const totalReceiptsEl = document.getElementById("totalReceipts");
const merchantBalance = document.getElementById("merchantBalance");
const merchantTransactions = document.getElementById("merchantTransactions");

// ==================== عناصر الواجهة - لوحة التحكم ====================
const invoiceCountEl = document.getElementById("invoiceCount");
const totalRevenueEl = document.getElementById("totalRevenue");
const bagsCountEl = document.getElementById("bagsCount");
const traderCountEl = document.getElementById("traderCount");
const driverCountEl = document.getElementById("driverCount");
const truckCountEl = document.getElementById("truckCount");

// ==================== عناصر الواجهة - التقارير ====================
const reportCategory = document.getElementById("reportCategory");
const reportType = document.getElementById("reportType");
const reportFrom = document.getElementById("reportFrom");
const reportTo = document.getElementById("reportTo");
const customDateRange = document.getElementById("customDateRange");
const generateReportBtn = document.getElementById("generateReportBtn");
const reportResult = document.getElementById("reportResult");
const reportMerchantSelect = document.getElementById("reportMerchantSelect");

// ==================== المتغيرات العامة ====================
let allTraders = [];
let allDrivers = [];
let allTrucks = [];
let allInvoices = [];
let allReceipts = [];
let currentEditId = null;
let lastSavedInvoice = null;
let currentAccountData = null;
let currentReportData = null;

// ==================== مسار شعار المكتب ====================
const OFFICE_LOGO_SRC = "39540.jpg";

// ==================== دالة بناء ترويسة الطباعة الموحدة ====================
function buildPrintHeader(subtitle) {
  return `
    <div class="header" style="display:flex; justify-content:space-between; align-items:center; border-bottom:3px solid #1e3c72; padding-bottom:15px; margin-bottom:20px;">
      <div style="display:flex; align-items:center; gap:14px;">
        <img src="${OFFICE_LOGO_SRC}" alt="شعار المكتب" style="width:70px; height:70px; object-fit:contain; border-radius:8px;" onerror="this.style.display='none'"/>
        <div>
          <p style="color:#1e3c72; font-size:1.3rem; font-weight:bold; margin:0;">مكتب أبو محمد للتخليص الجمركي والخدمات اللوجستية</p>
          <p style="color:#c8860a; font-size:0.85rem; margin:4px 0 0 0;">الجمهورية اليمنية &nbsp;|&nbsp; 📞 775477377</p>
        </div>
      </div>
      <div style="text-align:left; color:#555; font-size:0.85rem;">
        <p style="margin:0; font-weight:bold;">${subtitle || ''}</p>
        <p style="margin:5px 0 0 0;">تاريخ الطباعة: ${new Date().toLocaleDateString('ar-YE')}</p>
      </div>
    </div>
  `;
}

// ==================== التنقل بين الأقسام ====================
window.showSection = function(sectionId) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.getElementById(sectionId).classList.add('active');
  document.querySelectorAll('.menu-btn').forEach(b => b.classList.remove('active'));
  if (event && event.target) event.target.classList.add('active');
};

// ==================== تغيير نوع التقرير ====================
window.changeReportCategory = function() {
  const cat = reportCategory.value;
  const typeSelect = document.getElementById("reportType");
  typeSelect.innerHTML = '';
  if (cat === 'daily') {
    typeSelect.innerHTML = `
      <option value="daily">اليوم</option>
      <option value="weekly">هذا الاسبوع</option>
      <option value="monthly">هذا الشهر</option>
      <option value="yearly">هذا العام</option>
      <option value="custom">نطاق مخصص</option>
    `;
  } else {
    typeSelect.innerHTML = `
      <option value="all">الكل</option>
      <option value="daily">اليوم</option>
      <option value="weekly">هذا الاسبوع</option>
      <option value="monthly">هذا الشهر</option>
      <option value="yearly">هذا العام</option>
      <option value="custom">نطاق مخصص</option>
    `;
  }

  if (reportMerchantSelect) {
    reportMerchantSelect.style.display = cat === 'merchant' ? 'block' : 'none';
    if (cat !== 'merchant') reportMerchantSelect.value = 'all';
  }
};

if (reportType) {
  reportType.onchange = () => {
    if (reportType.value === 'custom') {
      customDateRange.style.display = 'flex';
    } else {
      customDateRange.style.display = 'none';
    }
  };
}

if (reportMerchantSelect) {
  reportMerchantSelect.onchange = () => {
    if (generateReportBtn) generateReportBtn.click();
  };
}

// ==================== توليد رقم الفاتورة ====================
async function generateInvoiceNumber() {
  try {
    const counterRef = ref(db, "counters/invoiceNumber");
    const snap = await get(counterRef);
    let num = snap.exists() ? snap.val() : 0;
    num++;
    await set(counterRef, num);
    return `INV-${new Date().getFullYear()}-${String(num).padStart(4, "0")}`;
  } catch (error) {
    console.error("خطأ في توليد الرقم:", error);
    return null;
  }
}

// ==================== حساب الفاتورة ====================
function calculateInvoice(bag, type, customsOffice) {
  const bags = Number(bag) || 0;
  const bagFee = bags * 587.65;
  const fixed = 74000;

  let misc, office, worker;
  if (customsOffice === "athar") {
    // جمرك عفار: بدون نثريات وبدون أجور عمال، وعمولة مكتب ثابتة 10,000
    misc = 0;
    office = 10000;
    worker = 0;
  } else {
    // جمرك الجوف (الافتراضي): نفس الحساب المعتمد سابقاً
    misc = 8500;
    office = 8500;
    worker = type === "dump" ? 35000 : 30000;
  }

  const total = bagFee + fixed + misc + office + worker;
  return {
    bagCount: bags,
    bagFee: Math.round(bagFee),
    fixed,
    misc,
    office,
    worker,
    total
  };
}

// ==================== عرض نتائج الحساب في الواجهة ====================
function displayResults(results) {
  if (displayBagCount) displayBagCount.textContent = results.bagCount.toLocaleString();
  if (bagsFee) bagsFee.textContent = results.bagFee.toLocaleString();
  if (workerFee) workerFee.textContent = results.worker.toLocaleString();
  if (totalAmount) totalAmount.textContent = results.total.toLocaleString();

  const miscFeeDisplayEl = document.getElementById("miscFeeDisplay");
  if (miscFeeDisplayEl) miscFeeDisplayEl.textContent = results.misc.toLocaleString();
  const officeFeeDisplayEl = document.getElementById("officeFeeDisplay");
  if (officeFeeDisplayEl) officeFeeDisplayEl.textContent = results.office.toLocaleString();

  const workerFeeRowEl = document.getElementById("workerFeeRow");
  if (workerFeeRowEl) workerFeeRowEl.style.display = results.worker > 0 ? "flex" : "none";
  const miscFeeRowEl = document.getElementById("miscFeeRow");
  if (miscFeeRowEl) miscFeeRowEl.style.display = results.misc > 0 ? "flex" : "none";
}

// ==================== حفظ الفاتورة مع الحفظ الذكي الفوري ====================
async function saveInvoice() {
  try {
    if (!bagCount.value || !merchantName.value) {
      alert("يرجى ملء الحقول المطلوبة (التاجر والاكياس)");
      return;
    }

    const currentMerchant = merchantName.value.trim();
    const currentDriver = driverName.value.trim();
    const currentTruck = truckNumber.value.trim();
    const currentTruckType = truckType.value || 'surface';
    const currentCustomsOffice = customsOfficeEl?.value || 'jawf';

    const calcResults = calculateInvoice(Number(bagCount.value), currentTruckType, currentCustomsOffice);
    const data = {
      invoiceNumber: currentEditId ? invoiceNumber.value : await generateInvoiceNumber(),
      date: invoiceDate.value || new Date().toISOString().split('T')[0],
      merchant: currentMerchant,
      driver: currentDriver,
      truckNumber: currentTruck,
      bagCount: Number(bagCount.value) || 0,
      truckType: currentTruckType,
      customsOffice: currentCustomsOffice,
      bagFee: calcResults.bagFee ?? 0,
      fixed: calcResults.fixed ?? 74000,
      misc: calcResults.misc ?? 0,
      office: calcResults.office ?? 0,
      worker: calcResults.worker ?? 0,
      total: calcResults.total || 0,
      createdAt: currentEditId
        ? (allInvoices.find(i => i.id === currentEditId)?.createdAt || Date.now())
        : Date.now()
    };

    if (currentEditId) {
      await set(ref(db, `invoices/${currentEditId}`), data);
      alert("تم تعديل الفاتورة بنجاح");
      currentEditId = null;
      if (saveInvoiceBtn) saveInvoiceBtn.textContent = "حفظ الفاتورة";
    } else {
      const newRef = push(ref(db, "invoices"));
      await set(newRef, data);
      if (invoiceNumber) invoiceNumber.value = data.invoiceNumber;
      alert("تم حفظ الفاتورة بنجاح");
    }

    // ====== الحفظ الذكي الفوري للتاجر ======
    if (currentMerchant !== "") {
      const traderExists = allTraders.some(([_, t]) => t.name.trim() === currentMerchant);
      if (!traderExists) {
        const newTraderRef = push(ref(db, "traders"));
        await set(newTraderRef, { name: currentMerchant, phone: "", createdAt: Date.now() });
      }
    }

    // ====== الحفظ الذكي الفوري للسائق ======
    if (currentDriver !== "") {
      const driverExists = allDrivers.some(([_, d]) => d.name.trim() === currentDriver);
      if (!driverExists) {
        const newDriverRef = push(ref(db, "drivers"));
        await set(newDriverRef, { name: currentDriver, phone: "", createdAt: Date.now() });
      }
    }

    // ====== الحفظ الذكي الفوري للقاطرة ======
    if (currentTruck !== "") {
      const truckExists = allTrucks.some(([_, t]) => t.number.trim() === currentTruck);
      if (!truckExists) {
        const newTruckRef = push(ref(db, "trucks"));
        await set(newTruckRef, {
          number: currentTruck,
          owner: currentMerchant,
          type: currentTruckType,
          createdAt: Date.now()
        });
      }
    }

    lastSavedInvoice = data;
    renderPrint(data);
    if (exportButtons) exportButtons.style.display = 'block';

  } catch (error) {
    console.error("خطأ في الحفظ:", error);
    alert("حدث خطأ اثناء الحفظ: " + error.message);
  }
}

// ==================== فاتورة جديدة ====================
window.newInvoice = function() {
  clearInvoiceForm();
  if (exportButtons) exportButtons.style.display = 'none';
  lastSavedInvoice = null;
};

// ==================== طباعة الفاتورة ====================
window.printInvoice = function() {
  if (!lastSavedInvoice) {
    alert("احفظ الفاتورة اولاً");
    return;
  }
  printAreaOrShare("printArea", `فاتورة-${lastSavedInvoice.invoiceNumber || ''}`, 100);
};

// ==================== تصدير الفاتورة PDF ====================
window.exportInvoicePDF = function() {
  if (!lastSavedInvoice) {
    alert("احفظ الفاتورة اولاً");
    return;
  }
  captureAndDownload("printArea", `invoice-${lastSavedInvoice.invoiceNumber}`, 'pdf');
};

// ==================== تصدير الفاتورة PNG ====================
window.exportInvoicePNG = function() {
  if (!lastSavedInvoice) {
    alert("احفظ الفاتورة اولاً");
    return;
  }
  captureAndDownload("printArea", `invoice-${lastSavedInvoice.invoiceNumber}`, 'png');
};

// ==================== تعديل فاتورة ====================
window.editInvoice = async function(id) {
  try {
    const snap = await get(ref(db, `invoices/${id}`));
    const data = snap.val();
    if (!data) {
      alert("الفاتورة غير موجودة");
      return;
    }
    if (invoiceNumber) invoiceNumber.value = data.invoiceNumber || '';
    if (invoiceDate) invoiceDate.value = data.date || '';
    if (merchantName) merchantName.value = data.merchant || '';
    if (driverName) driverName.value = data.driver || '';
    if (truckNumber) truckNumber.value = data.truckNumber || '';
    if (bagCount) bagCount.value = data.bagCount || '';
    if (truckType) truckType.value = data.truckType || 'surface';
    if (customsOfficeEl) customsOfficeEl.value = data.customsOffice || 'jawf';
    displayResults({
      bagCount: data.bagCount || 0,
      bagFee: data.bagFee || 0,
      worker: data.worker || 0,
      total: data.total || 0
    });
    currentEditId = id;
    if (saveInvoiceBtn) saveInvoiceBtn.textContent = "تحديث الفاتورة";
    if (exportButtons) exportButtons.style.display = 'none';
    showSection('invoice');
    document.querySelectorAll('.menu-btn')[1].classList.add('active');
  } catch (error) {
    console.error("خطأ في التعديل:", error);
    alert("خطأ في تحميل الفاتورة");
  }
};

// ==================== تحديث الفاتورة الحالية ====================
window.updateCurrentInvoice = async function() {
  if (!currentEditId) {
    alert("لا توجد فاتورة للتحديث. يرجى اختيار فاتورة للتعديل.");
    return;
  }
  await saveInvoice();
};

// ==================== حذف فاتورة ====================
window.deleteInvoice = async function(id) {
  // حماية حرجة: لا تسمح أبداً بمتابعة الحذف إن كان المعرف فارغاً أو غير صالح،
  // لأن المسار "invoices/" (بدون معرف) يشير إلى كامل قائمة الفواتير في
  // قاعدة البيانات، ما يعني حذف كل الفواتير دفعة واحدة بدل فاتورة واحدة فقط.
  if (!id || typeof id !== 'string' || id.trim() === '') {
    alert('⚠️ تعذر تحديد الفاتورة المطلوب حذفها (معرف غير صالح) — تم إلغاء الحذف لحمايتك. أعد تحميل الصفحة وحاول مرة أخرى.');
    console.error('deleteInvoice استُدعيت بمعرف فارغ/غير صالح — تم منع الحذف:', id);
    return;
  }
  if (!confirm('هل انت متأكد من حذف هذه الفاتورة؟')) return;
  try {
    await remove(ref(db, `invoices/${id}`));
    alert('تم حذف الفاتورة');
    if (generateReportBtn) generateReportBtn.click();
  } catch (error) {
    console.error("خطأ في الحذف:", error);
    alert('فشل الحذف');
  }
};

// ==================== مسح نموذج الفاتورة ====================
function clearInvoiceForm() {
  if (invoiceNumber) invoiceNumber.value = '';
  if (bagCount) bagCount.value = '';
  if (merchantName) merchantName.value = '';
  if (driverName) driverName.value = '';
  if (truckNumber) truckNumber.value = '';
  if (displayBagCount) displayBagCount.textContent = '0';
  if (bagsFee) bagsFee.textContent = '0';
  if (workerFee) workerFee.textContent = '30,000';
  if (totalAmount) totalAmount.textContent = '0';
  currentEditId = null;
  if (saveInvoiceBtn) saveInvoiceBtn.textContent = "حفظ الفاتورة";
}

// ==================== رسم منطقة الطباعة للفاتورة ====================
function renderPrint(data) {
  const pInvoiceNumber = document.getElementById("pInvoiceNumber");
  const pDate = document.getElementById("pDate");
  const pMerchant = document.getElementById("pMerchant");
  const pDriver = document.getElementById("pDriver");
  const pTruck = document.getElementById("pTruck");
  const pBagCount = document.getElementById("pBagCount");
  const pTruckType = document.getElementById("pTruckType");
  const pBagsFee = document.getElementById("pBagsFee");
  const pWorkerFee = document.getElementById("pWorkerFee");
  const pTotal = document.getElementById("pTotal");
  const pBagCalc = document.getElementById("pBagCalc");
  const pWorkerType = document.getElementById("pWorkerType");

  // تحديث الترويسة بالشعار في منطقة الطباعة
  const printLogoArea = document.getElementById("printLogoArea");
  if (printLogoArea) {
    printLogoArea.innerHTML = `
      <div style="display:flex; align-items:center; gap:12px;">
        <img src="${OFFICE_LOGO_SRC}" alt="شعار المكتب" style="width:65px; height:65px; object-fit:contain; border-radius:7px;" onerror="this.style.display='none'"/>
        <div>
          <p style="color:#1e3c72; font-size:1.2rem; font-weight:bold; margin:0;">مكتب أبو محمد للتخليص الجمركي والخدمات اللوجستية</p>
          <p style="color:#c8860a; font-size:0.8rem; margin:4px 0 0 0;">الجمهورية اليمنية &nbsp;|&nbsp; 📞 775477377</p>
        </div>
      </div>
    `;
  }

  if (pInvoiceNumber) pInvoiceNumber.textContent = data.invoiceNumber || '-';
  if (pDate) pDate.textContent = data.date || '-';
  if (pMerchant) pMerchant.textContent = data.merchant || '-';
  if (pDriver) pDriver.textContent = data.driver || '-';
  if (pTruck) pTruck.textContent = data.truckNumber || '-';
  if (pBagCount) pBagCount.textContent = Number(data.bagCount || 0).toLocaleString() + ' كيس';
  if (pTruckType) pTruckType.textContent = data.truckType === 'dump' ? 'قلاب' : 'سطحة';
  if (pBagsFee) pBagsFee.textContent = Number(data.bagFee || 0).toLocaleString();
  if (pWorkerFee) pWorkerFee.textContent = Number(data.worker || 0).toLocaleString();
  if (pTotal) pTotal.textContent = Number(data.total || 0).toLocaleString() + ' ريال';
  if (pBagCalc) pBagCalc.textContent = `(${Number(data.bagCount || 0).toLocaleString()} كيس × 587.65) + 74,000 ثابت`;
  if (pWorkerType) pWorkerType.textContent = `(${data.truckType === 'dump' ? 'قلاب' : 'سطحة'})`;

  const pMiscFee = document.getElementById("pMiscFee");
  if (pMiscFee) pMiscFee.textContent = Number(data.misc || 0).toLocaleString();
  const pOfficeFee = document.getElementById("pOfficeFee");
  if (pOfficeFee) pOfficeFee.textContent = Number(data.office || 0).toLocaleString();

  const rowMisc = document.getElementById("rowMisc");
  if (rowMisc) rowMisc.style.display = (Number(data.misc) || 0) > 0 ? "" : "none";
  const rowWorker = document.getElementById("rowWorker");
  if (rowWorker) rowWorker.style.display = (Number(data.worker) || 0) > 0 ? "" : "none";
}

// ==================== إجبار العناصر الأصل (parents) على الظهور ====================
// يُستخدم قبل الطباعة أو التصوير (PDF/PNG) حتى لا تظهر صفحة بيضاء أو صورة
// مشوهة/فارغة بسبب أن القسم الحاوي (.section) غير مُفعّل (display:none) حالياً
function forceAncestorsVisible(startEl) {
  const touched = [];
  let el = startEl.parentElement;
  while (el && el !== document.body) {
    const computed = window.getComputedStyle(el);
    if (computed.display === "none") {
      touched.push({ el, prevInlineDisplay: el.style.display });
      el.style.display = "block";
    }
    el = el.parentElement;
  }
  return touched;
}

function restoreAncestors(touched) {
  (touched || []).forEach(({ el, prevInlineDisplay }) => {
    el.style.display = prevInlineDisplay || "";
  });
}

// ==================== تجهيز منطقة الطباعة ====================
function preparePrintArea(elementId) {
  const printArea = document.getElementById(elementId);
  if (!printArea) return null;

  printArea._touchedAncestors = forceAncestorsVisible(printArea);
  document.body.classList.add("printing-mode");

  printArea.style.display = "block";
  printArea.style.position = "fixed";
  printArea.style.top = "0px";
  printArea.style.left = "0px";
  printArea.style.visibility = "visible";
  printArea.style.opacity = "1";
  printArea.style.width = "100%";
  printArea.style.zIndex = "99999";
  printArea.style.background = "#ffffff";
  return printArea;
}

// ==================== إخفاء منطقة الطباعة ====================
function hidePrintArea(elementId) {
  const printArea = document.getElementById(elementId);
  if (!printArea) return;

  document.body.classList.remove("printing-mode");

  restoreAncestors(printArea._touchedAncestors);
  printArea._touchedAncestors = null;

  printArea.style.display = "none";
  printArea.style.position = "";
  printArea.style.top = "";
  printArea.style.left = "";
  printArea.style.visibility = "";
  printArea.style.opacity = "";
  printArea.style.width = "";
  printArea.style.zIndex = "";
}

// ==================== طباعة منطقة داخل الصفحة (زر "طباعة" العادي) ====================
// على الحاسوب/PWA: يستخدم window.print() الأصلي كالمعتاد.
// داخل تطبيق APK: WebView العادي لا يدعم window.print()، لذا نحوّل نفس
// المنطقة إلى PDF تلقائياً ونفتح قائمة المشاركة/الطباعة الأصلية لأندرويد.
function printAreaOrShare(elementId, filename, delay) {
  const isNativeApp = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  preparePrintArea(elementId);
  setTimeout(async () => {
    if (isNativeApp) {
      const element = document.getElementById(elementId);
      try {
        const { pdfBlob } = await renderElementToPdfBlob(element);
        await shareOrDownloadBlob(pdfBlob, (filename || elementId) + '.pdf', 'application/pdf', filename || elementId);
      } catch (e) {
        console.error('تعذر إنشاء PDF للطباعة:', e);
        alert('حدث خطأ أثناء تجهيز الطباعة: ' + e.message);
      } finally {
        hidePrintArea(elementId);
      }
    } else {
      window.print();
      setTimeout(() => hidePrintArea(elementId), 500);
    }
  }, delay || 150);
}

// ==================== طباعة مستند HTML كامل داخل الصفحة (بدون فتح نافذة/تبويب خارجي) ====================
// كانت الشاشات التفصيلية (كشف حساب التاجر، التقرير الشامل) تفتح نافذة
// جديدة عبر window.open، وهذا يعمل بشكل جيد في متصفح الحاسوب لكنه
// يفشل أو "يخرج" المستخدم من التطبيق عند تثبيته كتطبيق PWA أو تغليفه
// بـ Capacitor على أندرويد. الحل: طباعة المحتوى داخل iframe مخفي ضمن
// نفس الصفحة، فتبقى تجربة الطباعة كاملة "داخل التطبيق".
function printHtmlInIframe(htmlString, filename) {
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; border:none; z-index:999999; background:#fff;';
  document.body.appendChild(iframe);

  const cleanup = () => {
    setTimeout(() => {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    }, 1000);
  };

  const isNativeApp = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());

  iframe.onload = () => {
    if (isNativeApp) {
      // داخل تطبيق APK: WebView العادي لا يدعم window.print()، لذا نحوّل
      // نفس المحتوى إلى PDF ونفتح قائمة المشاركة/الطباعة الأصلية لأندرويد
      (async () => {
        try {
          const body = iframe.contentDocument.body;
          body.style.width = '794px';
          const { pdfBlob } = await renderElementToPdfBlob(body);
          await shareOrDownloadBlob(pdfBlob, (filename || 'مستند') + '.pdf', 'application/pdf', filename || 'مستند');
        } catch (e) {
          console.error('تعذر إنشاء PDF للطباعة:', e);
          alert('حدث خطأ أثناء تجهيز الطباعة: ' + e.message);
        } finally {
          cleanup();
        }
      })();
      return;
    }

    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.addEventListener('afterprint', cleanup);
      setTimeout(() => iframe.contentWindow.print(), 150);
    } catch (e) {
      console.error('تعذر فتح نافذة الطباعة:', e);
      cleanup();
    }
  };

  const idoc = iframe.contentDocument || iframe.contentWindow.document;
  idoc.open();
  idoc.write(htmlString);
  idoc.close();

  // شبكة أمان: إزالة الإطار تلقائياً حتى لو لم تكتمل العملية أعلاه لأي سبب
  setTimeout(() => {
    if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
  }, 120000);
}

// ==================== مشاركة/طباعة الملف داخل التطبيق ====================
// ثلاث طرق بالترتيب حسب البيئة:
// 1) تطبيق APK (Capacitor): يحفظ الملف عبر Filesystem الأصلي ثم يفتح قائمة
//    المشاركة/الطباعة الأصلية لأندرويد عبر Share الأصلي (WebView العادي لا
//    يدعم window.print() ولا navigator.share() بشكل موثوق كمتصفح كامل).
// 2) PWA داخل متصفح يدعم Web Share API (خصوصاً الملفات): نفس تجربة المشاركة.
// 3) خلاف ذلك (حاسوب مثلاً): تنزيل مباشر كملف.
async function shareOrDownloadBlob(blob, filename, mimeType, shareTitle) {
  try {
    if (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) {
      const plugins = window.Capacitor.Plugins || {};
      if (plugins.Filesystem && plugins.Share) {
        const base64Data = await blobToBase64(blob);
        const writeResult = await plugins.Filesystem.writeFile({
          path: filename,
          data: base64Data,
          directory: 'CACHE',
          recursive: true
        });
        await plugins.Share.share({
          title: shareTitle || filename,
          url: writeResult.uri,
          dialogTitle: 'مشاركة أو طباعة الملف'
        });
        return;
      }
    }
  } catch (err) {
    console.error('فشل استخدام المشاركة الأصلية لأندرويد، سيتم تجربة البديل:', err);
    // استمر تلقائياً إلى المحاولات البديلة أدناه
  }

  try {
    const file = new File([blob], filename, { type: mimeType });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: shareTitle || filename
      });
      return;
    }
  } catch (err) {
    if (err && err.name === 'AbortError') return; // المستخدم ألغى المشاركة بنفسه
    // أي خطأ آخر: انتقل تلقائياً لطريقة التنزيل التقليدية أدناه
  }
  const link = document.createElement("a");
  link.download = filename;
  link.href = URL.createObjectURL(blob);
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 30000);
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      const base64 = typeof result === 'string' ? result.split(',')[1] || '' : '';
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function canvasToBlob(canvas, mimeType, quality) {
  return new Promise((resolve) => canvas.toBlob(resolve, mimeType, quality));
}
// ==================== تحويل عنصر DOM إلى ملف PDF (بلوب) مع تقسيم صفحات آمن ====================
// دالة عامة قابلة لإعادة الاستخدام: تُستخدم لتصدير كشوفات الحساب العادية،
// وأيضاً لطباعة الشاشات التفصيلية داخل تطبيق APK (حيث لا يعمل window.print()).
async function renderElementToPdfBlob(element) {
  await document.fonts.ready;
  await new Promise(resolve => setTimeout(resolve, 600));

  const scale = 2;
  const canvas = await html2canvas(element, {
    scale,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    logging: false,
    width: 794,
    windowWidth: 794
  });

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF('p', 'mm', 'a4');

  const pdfWidth = pdf.internal.pageSize.getWidth();   // 210mm
  const pdfHeight = pdf.internal.pageSize.getHeight(); // 297mm

  // حساب ارتفاع الصفحة بالبكسل على مقياس الكانفاس
  const canvasPageHeightPx = Math.floor((canvas.width * pdfHeight) / pdfWidth);

  // نجمع مواضع بداية كل صف من صفوف الجدول (إن وجد) حتى لا يتم قص أي صف من المنتصف
  const table = element.querySelector('table');
  let rowStartsPx = [];
  let headerHeightPx = 0;
  if (table) {
    const elementRect = element.getBoundingClientRect();
    const thead = table.querySelector('thead');
    if (thead) {
      const theadRect = thead.getBoundingClientRect();
      headerHeightPx = Math.round((theadRect.bottom - elementRect.top) * scale);
    }
    const rows = table.querySelectorAll('tbody tr');
    rowStartsPx = Array.from(rows).map(row => {
      const r = row.getBoundingClientRect();
      return Math.round((r.top - elementRect.top) * scale);
    });
  }

  function findSafeCut(desiredY, minY) {
    if (rowStartsPx.length === 0) return desiredY;
    let best = null;
    for (const rowTop of rowStartsPx) {
      if (rowTop > minY && rowTop <= desiredY) best = rowTop;
    }
    return best !== null && best > minY ? best : desiredY;
  }

  let yOffset = 0;
  let pageNumber = 0;

  while (yOffset < canvas.height) {
    if (pageNumber > 0) {
      pdf.addPage();
    }

    const repeatHeader = pageNumber > 0 && headerHeightPx > 0 && yOffset >= headerHeightPx;
    const availableBodyHeight = repeatHeader ? (canvasPageHeightPx - headerHeightPx) : canvasPageHeightPx;

    const desiredEnd = Math.min(yOffset + availableBodyHeight, canvas.height);
    const sliceEnd = (desiredEnd < canvas.height)
      ? findSafeCut(desiredEnd, yOffset)
      : desiredEnd;
    const sliceHeight = Math.max(1, sliceEnd - yOffset);

    const pageCanvas = document.createElement('canvas');
    pageCanvas.width = canvas.width;
    pageCanvas.height = sliceHeight + (repeatHeader ? headerHeightPx : 0);
    const ctx = pageCanvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);

    let destY = 0;
    if (repeatHeader) {
      ctx.drawImage(canvas, 0, 0, canvas.width, headerHeightPx, 0, 0, canvas.width, headerHeightPx);
      destY = headerHeightPx;
    }

    ctx.drawImage(canvas, 0, yOffset, canvas.width, sliceHeight, 0, destY, canvas.width, sliceHeight);

    const pageImgData = pageCanvas.toDataURL('image/jpeg', 0.92);
    const pageImgHeight = (pageCanvas.height * pdfWidth) / canvas.width;
    pdf.addImage(pageImgData, 'JPEG', 0, 0, pdfWidth, pageImgHeight);

    yOffset = sliceEnd;
    pageNumber++;

    if (pageNumber > 200) break; // حماية من حلقة لا نهائية
  }

  return { pdfBlob: pdf.output('blob'), canvas };
}

async function captureAndDownload(elementId, filename, type) {
  const element = document.getElementById(elementId);
  if (!element) return;

  // إجبار العناصر الأصل على الظهور، وإلا سيلتقط html2canvas صورة فارغة/مشوهة
  // بسبب أن ارتفاع العنصر الحقيقي يكون صفراً عندما يكون القسم الحاوي غير نشط
  const touchedAncestors = forceAncestorsVisible(element);
  document.body.classList.add("printing-mode");

  const origDisplay = element.style.display;
  const origPosition = element.style.position;
  const origWidth = element.style.width;
  const origLeft = element.style.left;
  const origTop = element.style.top;
  const origZIndex = element.style.zIndex;
  const origVisibility = element.style.visibility;

  // تجهيز العنصر بعرض A4 للتصوير الدقيق
  element.style.display = "block";
  element.style.position = "fixed";
  element.style.top = "0px";
  element.style.left = "-9999px";
  element.style.width = "794px"; // A4 width at 96dpi
  element.style.zIndex = "-1";
  element.style.visibility = "visible";

  const restoreEverything = () => {
    element.style.display = origDisplay;
    element.style.position = origPosition;
    element.style.width = origWidth;
    element.style.left = origLeft;
    element.style.top = origTop;
    element.style.zIndex = origZIndex;
    element.style.visibility = origVisibility;
    document.body.classList.remove("printing-mode");
    restoreAncestors(touchedAncestors);
  };

  try {
    if (type === 'pdf') {
      const { pdfBlob } = await renderElementToPdfBlob(element);
      await shareOrDownloadBlob(pdfBlob, filename + '.pdf', 'application/pdf', filename);

    } else if (type === 'png') {
      await document.fonts.ready;
      await new Promise(resolve => setTimeout(resolve, 600));
      const canvas = await html2canvas(element, {
        scale: 2, useCORS: true, allowTaint: true,
        backgroundColor: '#ffffff', logging: false,
        width: 794, windowWidth: 794
      });
      const pngBlob = await canvasToBlob(canvas, 'image/png', 1.0);
      await shareOrDownloadBlob(pngBlob, filename + '.png', 'image/png', filename);
    }

    restoreEverything();

  } catch (error) {
    console.error("خطأ في التصدير:", error);
    alert("حدث خطأ في التصدير: " + error.message);
    restoreEverything();
  }
}

// ==================== أحداث الفاتورة ====================
if (calculateBtn) {
  calculateBtn.onclick = () => {
    if (!bagCount.value) {
      alert("يرجى ادخال عدد الاكياس");
      return;
    }
    const results = calculateInvoice(Number(bagCount.value), truckType.value, customsOfficeEl?.value || 'jawf');
    displayResults(results);
  };
}

if (saveInvoiceBtn) saveInvoiceBtn.onclick = saveInvoice;

// ==================== إضافة تاجر ====================
if (addTraderBtn) {
  addTraderBtn.onclick = async () => {
    try {
      if (!traderName.value.trim()) {
        alert("يرجى ادخال اسم التاجر");
        return;
      }
      const data = {
        name: traderName.value.trim(),
        phone: traderPhone.value.trim(),
        createdAt: Date.now()
      };
      const newRef = push(ref(db, "traders"));
      await set(newRef, data);
      traderName.value = "";
      traderPhone.value = "";
      alert("تم اضافة التاجر");
    } catch (error) {
      console.error("خطأ في اضافة التاجر:", error);
      alert("خطأ في اضافة التاجر");
    }
  };
}

// ==================== البحث عن تاجر ====================
window.searchTraders = function() {
  const searchTerm = searchTrader.value.toLowerCase();
  const filtered = allTraders.filter(([_, t]) =>
    t.name.toLowerCase().includes(searchTerm) ||
    (t.phone && t.phone.includes(searchTerm))
  );
  renderTraders(filtered);
};

// ==================== عرض قائمة التجار ====================
function renderTraders(traders) {
  if (!tradersList) return;
  if (traders.length === 0) {
    tradersList.innerHTML = `
      <div class="empty-state">
        <p>لا يوجد تجار مسجلين</p>
        <p>اضف تاجراً جديداً من النموذج اعلاه</p>
      </div>
    `;
    return;
  }
  tradersList.innerHTML = traders.map(([id, t]) => `
    <div class="card" data-id="${id}">
      <div class="card-header">
        <h4>${escapeHtml(t.name)}</h4>
        <div class="card-actions">
          <button class="btn-icon" onclick="editTrader('${id}')" title="تعديل">تعديل</button>
          <button class="btn-icon" onclick="deleteTrader('${id}')" title="حذف">حذف</button>
        </div>
      </div>
      <p>${t.phone ? escapeHtml(t.phone) : '<span class="text-muted">لا يوجد رقم</span>'}</p>
      <p class="text-muted">${formatDate(t.createdAt)}</p>
    </div>
  `).join("");
}

// ==================== تعديل تاجر ====================
window.editTrader = async function(id) {
  try {
    const snap = await get(ref(db, `traders/${id}`));
    const data = snap.val();
    if (!data) return;
    const newName = prompt("اسم التاجر:", data.name);
    if (newName === null) return;
    const newPhone = prompt("رقم الهاتف:", data.phone || '');
    if (newPhone === null) return;
    await update(ref(db, `traders/${id}`), {
      name: newName.trim(),
      phone: newPhone.trim()
    });
    alert("تم التعديل");
  } catch (error) {
    console.error("خطأ في التعديل:", error);
    alert("فشل التعديل");
  }
};

// ==================== حذف تاجر ====================
window.deleteTrader = async function(id) {
  if (!id || typeof id !== 'string' || id.trim() === '') {
    alert('⚠️ تعذر تحديد التاجر المطلوب حذفه — تم إلغاء الحذف لحمايتك.');
    console.error('deleteTrader استُدعيت بمعرف فارغ/غير صالح — تم منع الحذف:', id);
    return;
  }
  if (!confirm('هل انت متأكد من حذف هذا التاجر؟')) return;
  try {
    await remove(ref(db, `traders/${id}`));
    alert('تم الحذف');
  } catch (error) {
    console.error("خطأ في الحذف:", error);
    alert('فشل الحذف');
  }
};

// ==================== إضافة سائق ====================
if (addDriverBtn) {
  addDriverBtn.onclick = async () => {
    try {
      if (!driverNameInput.value.trim()) {
        alert("يرجى ادخال اسم السائق");
        return;
      }
      const data = {
        name: driverNameInput.value.trim(),
        phone: driverPhone.value.trim(),
        createdAt: Date.now()
      };
      const newRef = push(ref(db, "drivers"));
      await set(newRef, data);
      driverNameInput.value = "";
      driverPhone.value = "";
      alert("تم اضافة السائق");
    } catch (error) {
      console.error("خطأ في اضافة السائق:", error);
      alert("خطأ في اضافة السائق");
    }
  };
}

// ==================== البحث عن سائق ====================
window.searchDrivers = function() {
  const searchTerm = searchDriver.value.toLowerCase();
  const filtered = allDrivers.filter(([_, d]) =>
    d.name.toLowerCase().includes(searchTerm) ||
    (d.phone && d.phone.includes(searchTerm))
  );
  renderDrivers(filtered);
};

// ==================== عرض قائمة السائقين ====================
function renderDrivers(drivers) {
  if (!driversList) return;
  if (drivers.length === 0) {
    driversList.innerHTML = `
      <div class="empty-state">
        <p>لا يوجد سائقين مسجلين</p>
        <p>اضف سائقاً جديداً من النموذج اعلاه</p>
      </div>
    `;
    return;
  }
  driversList.innerHTML = drivers.map(([id, d]) => `
    <div class="card" data-id="${id}">
      <div class="card-header">
        <h4>${escapeHtml(d.name)}</h4>
        <div class="card-actions">
          <button class="btn-icon" onclick="editDriver('${id}')" title="تعديل">تعديل</button>
          <button class="btn-icon" onclick="deleteDriver('${id}')" title="حذف">حذف</button>
        </div>
      </div>
      <p>${d.phone ? escapeHtml(d.phone) : '<span class="text-muted">لا يوجد رقم</span>'}</p>
      <p class="text-muted">${formatDate(d.createdAt)}</p>
    </div>
  `).join("");
}

// ==================== تعديل سائق ====================
window.editDriver = async function(id) {
  try {
    const snap = await get(ref(db, `drivers/${id}`));
    const data = snap.val();
    if (!data) return;
    const newName = prompt("اسم السائق:", data.name);
    if (newName === null) return;
    const newPhone = prompt("رقم الهاتف:", data.phone || '');
    if (newPhone === null) return;
    await update(ref(db, `drivers/${id}`), {
      name: newName.trim(),
      phone: newPhone.trim()
    });
    alert("تم التعديل");
  } catch (error) {
    console.error("خطأ في التعديل:", error);
    alert("فشل التعديل");
  }
};

// ==================== حذف سائق ====================
window.deleteDriver = async function(id) {
  if (!id || typeof id !== 'string' || id.trim() === '') {
    alert('⚠️ تعذر تحديد السائق المطلوب حذفه — تم إلغاء الحذف لحمايتك.');
    console.error('deleteDriver استُدعيت بمعرف فارغ/غير صالح — تم منع الحذف:', id);
    return;
  }
  if (!confirm('هل انت متأكد من حذف هذا السائق؟')) return;
  try {
    await remove(ref(db, `drivers/${id}`));
    alert('تم الحذف');
  } catch (error) {
    console.error("خطأ في الحذف:", error);
    alert('فشل الحذف');
  }
};

// ==================== إضافة قاطرة ====================
if (addTruckBtn) {
  addTruckBtn.onclick = async () => {
    try {
      if (!truckNumberInput.value.trim()) {
        alert("يرجى ادخال رقم القاطرة");
        return;
      }
      const data = {
        number: truckNumberInput.value.trim(),
        owner: truckOwner.value.trim(),
        type: truckTypeInput.value,
        createdAt: Date.now()
      };
      const newRef = push(ref(db, "trucks"));
      await set(newRef, data);
      truckNumberInput.value = "";
      truckOwner.value = "";
      alert("تم اضافة القاطرة");
    } catch (error) {
      console.error("خطأ في اضافة القاطرة:", error);
      alert("خطأ في اضافة القاطرة");
    }
  };
}

// ==================== البحث عن قاطرة ====================
window.searchTrucks = function() {
  const searchTerm = searchTruck.value.toLowerCase();
  const filtered = allTrucks.filter(([_, t]) =>
    t.number.toLowerCase().includes(searchTerm) ||
    (t.owner && t.owner.toLowerCase().includes(searchTerm))
  );
  renderTrucks(filtered);
};

// ==================== عرض قائمة القواطر ====================
function renderTrucks(trucks) {
  if (!trucksList) return;
  if (trucks.length === 0) {
    trucksList.innerHTML = `
      <div class="empty-state">
        <p>لا يوجد قواطر مسجلة</p>
        <p>اضف قاطرة جديدة من النموذج اعلاه</p>
      </div>
    `;
    return;
  }
  trucksList.innerHTML = trucks.map(([id, t]) => `
    <div class="card" data-id="${id}">
      <div class="card-header">
        <h4>${escapeHtml(t.number)}</h4>
        <div class="card-actions">
          <button class="btn-icon" onclick="editTruck('${id}')" title="تعديل">تعديل</button>
          <button class="btn-icon" onclick="deleteTruck('${id}')" title="حذف">حذف</button>
        </div>
      </div>
      <p>المالك: ${t.owner ? escapeHtml(t.owner) : '<span class="text-muted">غير محدد</span>'}</p>
      <p>النوع: ${t.type === 'dump' ? 'قلاب' : 'سطحة'}</p>
      <p class="text-muted">${formatDate(t.createdAt)}</p>
    </div>
  `).join("");
}

// ==================== تعديل قاطرة ====================
window.editTruck = async function(id) {
  try {
    const snap = await get(ref(db, `trucks/${id}`));
    const data = snap.val();
    if (!data) return;
    const newNumber = prompt("رقم القاطرة:", data.number);
    if (newNumber === null) return;
    const newOwner = prompt("اسم المالك:", data.owner || '');
    if (newOwner === null) return;
    await update(ref(db, `trucks/${id}`), {
      number: newNumber.trim(),
      owner: newOwner.trim()
    });
    alert("تم التعديل");
  } catch (error) {
    console.error("خطأ في التعديل:", error);
    alert("فشل التعديل");
  }
};

// ==================== حذف قاطرة ====================
window.deleteTruck = async function(id) {
  if (!id || typeof id !== 'string' || id.trim() === '') {
    alert('⚠️ تعذر تحديد القاطرة المطلوب حذفها — تم إلغاء الحذف لحمايتك.');
    console.error('deleteTruck استُدعيت بمعرف فارغ/غير صالح — تم منع الحذف:', id);
    return;
  }
  if (!confirm('هل انت متأكد من حذف هذه القاطرة؟')) return;
  try {
    await remove(ref(db, `trucks/${id}`));
    alert('تم الحذف');
  } catch (error) {
    console.error("خطأ في الحذف:", error);
    alert('فشل الحذف');
  }
};

// ==================== حفظ سند القبض ====================
if (saveReceiptBtn) {
  saveReceiptBtn.onclick = async () => {
    try {
      const trader = receiptTrader.value;
      const amount = Number(receiptAmount.value);
      const notes = receiptNotes.value.trim();
      const date = receiptDate.value || new Date().toISOString().split('T')[0];
      if (!trader || !amount || amount <= 0) {
        alert("يرجى اختيار التاجر وادخال المبلغ الصحيح");
        return;
      }
      const receiptData = {
        trader,
        amount,
        notes,
        date,
        type: receiptTypeEl ? (receiptTypeEl.value || "receipt") : "receipt",
        createdAt: Date.now()
      };
      const newRef = push(ref(db, "receipts"));
      await set(newRef, receiptData);
      receiptAmount.value = "";
      receiptNotes.value = "";
      if (receiptTypeEl) receiptTypeEl.value = "receipt";
      alert("تم حفظ سند القبض بنجاح");
    } catch (error) {
      console.error("خطأ في حفظ السند:", error);
      alert("خطأ في حفظ سند القبض: " + error.message);
    }
  };
}

// ==================== عرض قائمة سندات القبض مع زر التعديل ====================
function renderReceipts(receipts) {
  if (!receiptsList) return;
  if (receipts.length === 0) {
    receiptsList.innerHTML = `
      <div class="empty-state">
        <p>لا يوجد سندات قبض</p>
        <p>اضف سند قبض جديد من النموذج اعلاه</p>
      </div>
    `;
    return;
  }
  receiptsList.innerHTML = receipts.map(([id, r]) => `
    <div class="card receipt-item" data-id="${id}">
      <div class="card-header">
        <h4>${r.type === 'transfer' ? '💸' : '💵'} ${Number(r.amount || 0).toLocaleString()} ريال</h4>
        <div class="card-actions">
          <button class="btn-icon" onclick="editReceipt('${id}')" title="تعديل" style="color:#1e3c72; margin-left:6px;">تعديل</button>
          <button class="btn-icon" onclick="deleteReceipt('${id}')" title="حذف" style="color:#d9534f;">حذف</button>
        </div>
      </div>
      <p>التاجر: ${escapeHtml(r.trader)}</p>
      <p>النوع: ${r.type === 'transfer' ? 'حوالة واردة' : 'سند قبض'}</p>
      <p>التاريخ: ${r.date || formatDate(r.createdAt)}</p>
      ${r.notes ? `<p>${escapeHtml(r.notes)}</p>` : ''}
    </div>
  `).join("");
}

// ==================== تعديل سند القبض ====================
window.editReceipt = async function(id) {
  try {
    const snap = await get(ref(db, `receipts/${id}`));
    const data = snap.val();
    if (!data) {
      alert("السند غير موجود");
      return;
    }
    const newAmount = prompt("المبلغ الجديد (ريال):", data.amount);
    if (newAmount === null) return;
    const parsedAmount = Number(newAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert("يرجى ادخال مبلغ صحيح");
      return;
    }
    const newNotes = prompt("الملاحظات:", data.notes || '');
    if (newNotes === null) return;
    const newDate = prompt("التاريخ (YYYY-MM-DD):", data.date || '');
    if (newDate === null) return;
    await update(ref(db, `receipts/${id}`), {
      amount: parsedAmount,
      notes: newNotes.trim(),
      date: newDate.trim() || data.date
    });
    alert("تم تعديل سند القبض بنجاح");
  } catch (error) {
    console.error("خطأ في تعديل السند:", error);
    alert("فشل تعديل سند القبض: " + error.message);
  }
};

// ==================== حذف سند قبض ====================
window.deleteReceipt = async function(id) {
  if (!id || typeof id !== 'string' || id.trim() === '') {
    alert('⚠️ تعذر تحديد السند المطلوب حذفه — تم إلغاء الحذف لحمايتك.');
    console.error('deleteReceipt استُدعيت بمعرف فارغ/غير صالح — تم منع الحذف:', id);
    return;
  }
  if (!confirm('هل انت متأكد من حذف هذا السند؟')) return;
  try {
    await remove(ref(db, `receipts/${id}`));
    alert('تم حذف السند');
  } catch (error) {
    console.error("خطأ في الحذف:", error);
    alert('فشل الحذف');
  }
};

// ==================== دالة مساعدة لتحويل نص التاريخ إلى timestamp ====================
function dateStringToTimestamp(dateStr) {
  if (!dateStr) return 0;
  return new Date(dateStr + "T00:00:00").getTime();
}

// ==================== دالة حساب نطاق التاريخ لكشف الحساب ====================
function getMerchantDateRange() {
  const periodType = document.getElementById("merchantPeriodType");
  const merchantFromDate = document.getElementById("merchantFromDate");
  const merchantToDate = document.getElementById("merchantToDate");
  const today = new Date();
  let from = 0;
  let to = Date.now() + 86400000;

  if (!periodType) return { from, to };

  switch (periodType.value) {
    case 'daily':
      from = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
      to = from + 86400000;
      break;
    case 'weekly':
      const dayOfWeek = today.getDay();
      from = new Date(today.getFullYear(), today.getMonth(), today.getDate() - dayOfWeek).getTime();
      to = from + (7 * 86400000);
      break;
    case 'monthly':
      from = new Date(today.getFullYear(), today.getMonth(), 1).getTime();
      to = new Date(today.getFullYear(), today.getMonth() + 1, 1).getTime();
      break;
    case 'yearly':
      from = new Date(today.getFullYear(), 0, 1).getTime();
      to = new Date(today.getFullYear() + 1, 0, 1).getTime();
      break;
    case 'custom':
      if (merchantFromDate && merchantToDate && merchantFromDate.value && merchantToDate.value) {
        from = dateStringToTimestamp(merchantFromDate.value);
        to = dateStringToTimestamp(merchantToDate.value) + 86400000;
      }
      break;
    case 'all':
    default:
      from = 0;
      to = Date.now() + 86400000;
      break;
  }
  return { from, to };
}

// ==================== عرض كشف حساب التاجر ====================
if (merchantAccountSelect) {
  merchantAccountSelect.onchange = async () => {
    await loadMerchantAccount();
  };
}
const merchantPeriodTypeEl = document.getElementById("merchantPeriodType");
const merchantCustomDatesEl = document.getElementById("merchantCustomDates");
const merchantFromDateEl = document.getElementById("merchantFromDate");
const merchantToDateEl = document.getElementById("merchantToDate");
if (merchantPeriodTypeEl) {
  merchantPeriodTypeEl.onchange = () => {
    if (merchantCustomDatesEl) merchantCustomDatesEl.style.display = merchantPeriodTypeEl.value === "custom" ? "flex" : "none";
    loadMerchantAccount();
  };
}
if (merchantFromDateEl) merchantFromDateEl.onchange = loadMerchantAccount;
if (merchantToDateEl) merchantToDateEl.onchange = loadMerchantAccount;

async function loadMerchantAccount() {
  const merchantNameValue = merchantAccountSelect ? merchantAccountSelect.value : '';
  if (!merchantNameValue) {
    if (merchantSummary) merchantSummary.style.display = 'none';
    if (merchantTransactions) merchantTransactions.innerHTML = '';
    return;
  }

  try {
    const { from, to } = getMerchantDateRange();

    const invoicesSnap = await get(ref(db, "invoices"));
    const invoicesData = invoicesSnap.val() || {};
    const traderInvoices = Object.entries(invoicesData)
      .filter(([id, inv]) => {
        const createdAt = Number(inv.createdAt) || dateStringToTimestamp(inv.date);
        return inv.merchant === merchantNameValue && createdAt >= from && createdAt <= to;
      })
      .map(([id, inv]) => ({ ...inv, _id: id }));

    const receiptsSnap = await get(ref(db, "receipts"));
    const receiptsData = receiptsSnap.val() || {};
    const traderReceipts = Object.entries(receiptsData)
      .filter(([id, r]) => {
        const createdAt = Number(r.createdAt) || dateStringToTimestamp(r.date);
        return r.trader === merchantNameValue && createdAt >= from && createdAt <= to;
      })
      .map(([id, r]) => ({ ...r, _id: id }));

    const totalInvoices = traderInvoices.reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);
    const totalReceipts = traderReceipts.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    const balance = totalInvoices - totalReceipts;

    if (merchantInvoiceCount) merchantInvoiceCount.textContent = traderInvoices.length;
    if (totalInvoicesEl) totalInvoicesEl.textContent = totalInvoices.toLocaleString() + ' ريال';
    if (merchantReceiptCount) merchantReceiptCount.textContent = traderReceipts.length;
    if (totalReceiptsEl) totalReceiptsEl.textContent = totalReceipts.toLocaleString() + ' ريال';

    if (merchantBalance) {
      merchantBalance.className = 'report-value';
      if (balance > 0) {
        merchantBalance.classList.add('merchant-balance-negative');
        merchantBalance.textContent = balance.toLocaleString() + ' ريال (عليه)';
      } else if (balance < 0) {
        merchantBalance.classList.add('merchant-balance-positive');
        merchantBalance.textContent = Math.abs(balance).toLocaleString() + ' ريال (له)';
      } else {
        merchantBalance.classList.add('merchant-balance-zero');
        merchantBalance.textContent = '0 ريال (متعادل)';
      }
    }

    if (merchantSummary) merchantSummary.style.display = 'block';

    const allTransactions = [
      ...traderInvoices.map(inv => ({
        kind: 'invoice',
        typeLabel: '📄 فاتورة',
        refNumber: inv.invoiceNumber || inv._id.slice(-6),
        date: inv.date || formatDate(inv.createdAt),
        details: `فاتورة رقم ${inv.invoiceNumber || '-'} (عدد ${inv.bagCount || 0} كيس) | السائق: ${inv.driver || inv.driverName || '-'} | لوحة: ${inv.truckNumber || inv.truckPlate || '-'}`,
        debit: Number(inv.total) || 0,
        credit: 0,
        createdAt: Number(inv.createdAt) || dateStringToTimestamp(inv.date) || 0
      })),
      ...traderReceipts.map(r => {
        const isTransfer = r.type === 'transfer';
        return {
          kind: isTransfer ? 'transfer' : 'receipt',
          typeLabel: isTransfer ? '💸 حوالة واردة' : '💵 سند قبض',
          refNumber: r.receiptNumber || r._id.slice(-6),
          date: r.date || formatDate(r.createdAt),
          details: r.notes || (isTransfer ? 'حوالة واردة' : 'سند قبض'),
          debit: 0,
          credit: Number(r.amount) || 0,
          createdAt: Number(r.createdAt) || dateStringToTimestamp(r.date) || 0
        };
      })
    ];

    allTransactions.sort((a, b) => a.createdAt - b.createdAt);

    let runningBalance = 0;
    if (merchantTransactions) {
      merchantTransactions.innerHTML = allTransactions.map(t => {
        runningBalance += t.debit - t.credit;
        return `
          <tr class="transaction-${t.kind}">
            <td>${t.typeLabel}</td>
            <td>${t.date}</td>
            <td>${escapeHtml(t.details)}</td>
            <td>${t.debit > 0 ? t.debit.toLocaleString() : '-'}</td>
            <td>${t.credit > 0 ? t.credit.toLocaleString() : '-'}</td>
            <td><strong>${runningBalance.toLocaleString()}</strong></td>
          </tr>
        `;
      }).join('');
    }

    currentAccountData = {
      merchantName: merchantNameValue,
      transactions: allTransactions,
      totalDebit: totalInvoices,
      totalCredit: totalReceipts,
      finalBalance: balance
    };

    const accMerchantName = document.getElementById("accMerchantName");
    const accDate = document.getElementById("accDate");
    const accBody = document.getElementById("accTransactionsBody");
    const accTotalDebit = document.getElementById("accTotalDebit");
    const accTotalCredit = document.getElementById("accTotalCredit");
    const accFinalBalance = document.getElementById("accFinalBalance");
    const accCardInvoiceCount = document.getElementById("accCardInvoiceCount");
    const accCardTotalDebit = document.getElementById("accCardTotalDebit");
    const accCardTotalCredit = document.getElementById("accCardTotalCredit");
    const accCardBalance = document.getElementById("accCardBalance");

    if (accMerchantName) accMerchantName.textContent = merchantNameValue;
    if (accDate) accDate.textContent = new Date().toLocaleDateString('ar-YE');

    if (accCardInvoiceCount) accCardInvoiceCount.textContent = traderInvoices.length.toLocaleString();
    if (accCardTotalDebit) accCardTotalDebit.textContent = totalInvoices.toLocaleString() + ' ريال';
    if (accCardTotalCredit) accCardTotalCredit.textContent = totalReceipts.toLocaleString() + ' ريال';
    if (accCardBalance) {
      const cardLabel = balance > 0 ? ' ريال (عليه)' : balance < 0 ? ' ريال (له)' : ' ريال (متعادل)';
      accCardBalance.textContent = Math.abs(balance).toLocaleString() + cardLabel;
    }

    if (accBody) {
      let accBalance = 0;
      accBody.innerHTML = allTransactions.map(t => {
        accBalance += t.debit - t.credit;
        const rowBg = t.kind === 'invoice' ? '#FFF2F2' : (t.kind === 'transfer' ? '#EEF3FF' : '#F2FAF4');
        const amountColor = accBalance > 0 ? '#b71c1c' : accBalance < 0 ? '#1b5e20' : '#333';
        return `
          <tr style="background-color:${rowBg}; -webkit-print-color-adjust:exact; print-color-adjust:exact;">
            <td class="item-name" style="text-align:center; white-space:nowrap; border:1px solid #000 !important;">${t.typeLabel}</td>
            <td class="item-name" style="text-align:center; white-space:nowrap; border:1px solid #000 !important;">${escapeHtml(String(t.refNumber || '-'))}</td>
            <td class="item-name" style="text-align:center; white-space:nowrap; border:1px solid #000 !important;">${escapeHtml(t.date)}</td>
            <td class="item-name" style="border:1px solid #000 !important;">${escapeHtml(t.details)}</td>
            <td class="item-amount" style="color:#b71c1c; font-weight:${t.debit > 0 ? 'bold' : 'normal'}; border:1px solid #000 !important;">${t.debit > 0 ? t.debit.toLocaleString() : '-'}</td>
            <td class="item-amount" style="color:#1b5e20; font-weight:${t.credit > 0 ? 'bold' : 'normal'}; border:1px solid #000 !important;">${t.credit > 0 ? t.credit.toLocaleString() : '-'}</td>
            <td class="item-amount" style="color:${amountColor}; border:1px solid #000 !important;"><strong>${accBalance.toLocaleString()}</strong></td>
          </tr>
        `;
      }).join('');
    }

    if (accTotalDebit) { accTotalDebit.textContent = totalInvoices.toLocaleString(); accTotalDebit.style.color = "#b71c1c"; }
    if (accTotalCredit) { accTotalCredit.textContent = totalReceipts.toLocaleString(); accTotalCredit.style.color = "#1b5e20"; }
    if (accFinalBalance) {
      const balanceLabel = balance > 0 ? ' ريال (عليه)' : balance < 0 ? ' ريال (له)' : ' ريال (متعادل)';
      accFinalBalance.textContent = Math.abs(balance).toLocaleString() + balanceLabel;
      accFinalBalance.style.color = balance >= 0 ? "#b71c1c" : "#1b5e20";
    }

  } catch (error) {
    console.error("خطأ في حساب التاجر:", error);
    alert("خطأ في تحميل بيانات التاجر");
  }
}

// ==================== طباعة كشف الحساب العادي ====================
window.printAccount = function() {
  if (!currentAccountData) {
    alert("اختر تاجر اولاً");
    return;
  }
  printAreaOrShare("accountPrintArea", `كشف-حساب-${currentAccountData.merchantName}`, 150);
};

// ==================== طباعة كشف الحساب التفصيلي مع الشعار والعنوان الرسمي ====================
window.printDetailedMerchantAccount = async function() {
  if (!merchantAccountSelect || !merchantAccountSelect.value) {
    alert("اختر تاجر اولاً وقم بتحميل كشف الحساب");
    return;
  }

  // إعادة تحميل بيانات التاجر لضمان أن الأرقام المطبوعة حديثة ومطابقة للرصيد الفعلي
  await loadMerchantAccount();

  if (!currentAccountData) {
    alert("تعذر تحميل بيانات التاجر، حاول مرة اخرى");
    return;
  }

  const { merchantName: mName, transactions, totalDebit, totalCredit, finalBalance } = currentAccountData;
  const balanceLabel = finalBalance > 0
    ? `${finalBalance.toLocaleString()} ريال (عليه)`
    : finalBalance < 0
      ? `${Math.abs(finalBalance).toLocaleString()} ريال (له)`
      : '0 ريال (متعادل)';
  const balanceColor = finalBalance > 0 ? '#b71c1c' : finalBalance < 0 ? '#1b5e20' : '#333';
  const invoiceCount = transactions.filter(t => t.kind === 'invoice').length;
  const printDateStr = new Date().toLocaleDateString('ar-YE');

  let runningBalance = 0;
  const rowsHtml = transactions.map(t => {
    runningBalance += t.debit - t.credit;
    const rowBg = t.kind === 'invoice' ? '#fff8e1' : (t.kind === 'transfer' ? '#e8eeff' : '#e8f5e9');
    const typeLabel = t.typeLabel || (t.kind === 'invoice' ? '📄 فاتورة' : (t.kind === 'transfer' ? '💸 حوالة واردة' : '💵 سند قبض'));
    const runColor = runningBalance > 0 ? '#b71c1c' : runningBalance < 0 ? '#1b5e20' : '#333';
    return `
      <tr style="background:${rowBg};">
        <td style="padding:8px; border:1px solid #000; text-align:center; white-space:nowrap;">${typeLabel}</td>
        <td style="padding:8px; border:1px solid #000; text-align:center; white-space:nowrap;">${escapeHtml(String(t.refNumber || '-'))}</td>
        <td style="padding:8px; border:1px solid #000; text-align:center; white-space:nowrap;">${escapeHtml(t.date)}</td>
        <td style="padding:8px; border:1px solid #000; text-align:right;">${escapeHtml(t.details)}</td>
        <td style="padding:8px; border:1px solid #000; text-align:center; color:#b71c1c; font-weight:bold;">${t.debit > 0 ? t.debit.toLocaleString() : '-'}</td>
        <td style="padding:8px; border:1px solid #000; text-align:center; color:#1b5e20; font-weight:bold;">${t.credit > 0 ? t.credit.toLocaleString() : '-'}</td>
        <td style="padding:8px; border:1px solid #000; text-align:center; color:${runColor}; font-weight:bold;">${runningBalance.toLocaleString()}</td>
      </tr>
    `;
  }).join('');

  printHtmlInIframe(`
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <title>كشف حساب تاجر - ${escapeHtml(mName)}</title>
      <style>
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; box-sizing: border-box; }
        @page { size: A4; margin: 12mm 10mm; }
        body { font-family: 'Cairo', Arial, sans-serif; margin: 16px; color: #222; direction: rtl; }
        .header { display:flex; justify-content:space-between; align-items:center; border-bottom:3px solid #1e3c72; padding-bottom:15px; margin-bottom:20px; }
        .header-logo { display:flex; align-items:center; gap:14px; }
        .header-logo img { width:68px; height:68px; object-fit:contain; border-radius:7px; flex-shrink:0; }
        .logo-title { color:#1e3c72; font-size:1.25rem; font-weight:bold; margin:0; }
        .logo-sub { color:#555; font-size:0.85rem; margin:4px 0 0 0; }
        .meta { text-align:left; color:#333; font-size:0.9rem; }
        .meta strong { color:#1e3c72; }
        h1 { text-align:center; color:#1e3c72; font-size:1.35rem; margin:15px 0 5px 0; border-bottom:2px solid #e0a800; padding-bottom:6px; }
        .merchant-subtitle { text-align:center; font-size:1.1rem; color:#222; font-weight:bold; margin:0 0 18px 0; }
        .summary-box { display:flex; gap:12px; margin-bottom:20px; flex-wrap:wrap; }
        .summary-item { background:#eef2fb; border:1px solid #1e3c72; border-radius:8px; padding:12px 16px; flex:1; min-width:135px; text-align:center; }
        .summary-label { font-size:0.78rem; color:#333; margin-bottom:5px; font-weight:600; }
        .summary-value { font-size:1.05rem; font-weight:bold; color:#1e3c72; }
        .balance-value { font-size:1.15rem; font-weight:bold; color:${balanceColor}; }
        table { width:100%; border-collapse:collapse; font-size:0.86rem; border:1px solid #000; }
        thead tr { background:#1e3c72; color:#fff; }
        thead th { padding:10px 8px; border:1px solid #000; text-align:center; }
        tfoot tr { background:#e2e8f0; font-weight:bold; }
        tfoot td { padding:10px 8px; border:1px solid #000; text-align:center; }
        thead { display: table-header-group; }
        tfoot { display: table-footer-group; }
        tr { page-break-inside: avoid; }
        .footer { margin-top:35px; border-top:1px dashed #999; padding-top:15px; display:flex; justify-content:space-around; page-break-inside: avoid; }
        .signature { text-align:center; min-width:180px; }
        .sig-line { border-bottom:1px solid #000; width:180px; margin:35px auto 5px; }
        @media print { body { margin:6px; } }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="header-logo">
          <img src="${OFFICE_LOGO_SRC}" alt="شعار المكتب" onerror="this.style.display='none'"/>
          <div>
            <p class="logo-title">مكتب أبو محمد للتخليص الجمركي والخدمات اللوجستية</p>
            <p class="logo-sub">الجمهورية اليمنية &nbsp;|&nbsp; 📞 775477377</p>
          </div>
        </div>
        <div class="meta">
          <p><span>كشف حساب:</span> <strong>${escapeHtml(mName)}</strong></p>
          <p><span>التاريخ:</span> <strong>${printDateStr}</strong></p>
        </div>
      </div>
      <h1>كشف حساب تاجر</h1>
      <p class="merchant-subtitle">${escapeHtml(mName)}</p>
      <div class="summary-box">
        <div class="summary-item">
          <div class="summary-label">عدد الفواتير</div>
          <div class="summary-value">${invoiceCount}</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">إجمالي الفواتير (مدين)</div>
          <div class="summary-value" style="color:#b71c1c;">${totalDebit.toLocaleString()} ريال</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">إجمالي المقبوضات (دائن)</div>
          <div class="summary-value" style="color:#1b5e20;">${totalCredit.toLocaleString()} ريال</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">الرصيد النهائي</div>
          <div class="balance-value">${balanceLabel}</div>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>النوع</th>
            <th>رقم الحركة</th>
            <th>التاريخ</th>
            <th>البيان والتفاصيل</th>
            <th>مدين (عليه)</th>
            <th>دائن (له)</th>
            <th>الرصيد الجاري</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="4">الإجماليات النهائية</td>
            <td style="color:#b71c1c;">${totalDebit.toLocaleString()}</td>
            <td style="color:#1b5e20;">${totalCredit.toLocaleString()}</td>
            <td style="color:${balanceColor};">${balanceLabel}</td>
          </tr>
        </tfoot>
      </table>
      <div class="footer">
        <div class="signature">
          <div class="sig-line"></div>
          <p>توقيع مراجع الحسابات</p>
        </div>
        <div class="signature">
          <div class="sig-line"></div>
          <p>ختم وتوقيع المكتب الرسمي</p>
        </div>
      </div>
    </body>
    </html>
  `, `كشف-حساب-${mName}`);
};

// ==================== تصدير كشف الحساب PDF ====================
window.exportAccountPDF = function() {
  if (!currentAccountData) {
    alert("اختر تاجر اولاً");
    return;
  }
  captureAndDownload("accountPrintArea", `account-${currentAccountData.merchantName}`, 'pdf');
};

// ==================== تصدير كشف الحساب PNG ====================
window.exportAccountPNG = function() {
  if (!currentAccountData) {
    alert("اختر تاجر اولاً");
    return;
  }
  captureAndDownload("accountPrintArea", `account-${currentAccountData.merchantName}`, 'png');
};

// ==================== الاستماع للتغييرات - الفواتير ====================
onValue(ref(db, "invoices"), (snap) => {
  const data = snap.val() || {};
  allInvoices = Object.entries(data).map(([id, val]) => ({ id, ...val }));
  if (invoiceCountEl) invoiceCountEl.textContent = allInvoices.length;
  const total = allInvoices.reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);
  if (totalRevenueEl) totalRevenueEl.textContent = total.toLocaleString();
  const totalBags = allInvoices.reduce((sum, inv) => sum + (Number(inv.bagCount) || 0), 0);
  if (bagsCountEl) bagsCountEl.textContent = totalBags.toLocaleString();
  refreshDashboardSummary();
});

// ==================== الاستماع للتغييرات - التجار ====================
onValue(ref(db, "traders"), (snap) => {
  try {
    const data = snap.val() || {};
    allTraders = Object.entries(data);
    if (traderCountEl) traderCountEl.textContent = allTraders.length;
    if (tradersDatalist) {
      tradersDatalist.innerHTML = allTraders.map(([_, t]) =>
        `<option value="${escapeHtml(t.name)}">`
      ).join("");
    }
    if (receiptTrader) {
      receiptTrader.innerHTML = '<option value="">اختر التاجر</option>';
      allTraders.forEach(([_, t]) => {
        receiptTrader.innerHTML += `<option value="${escapeHtml(t.name)}">${escapeHtml(t.name)}</option>`;
      });
    }
    if (merchantAccountSelect) {
      merchantAccountSelect.innerHTML = '<option value="">اختر التاجر</option>';
      allTraders.forEach(([_, t]) => {
        merchantAccountSelect.innerHTML += `<option value="${escapeHtml(t.name)}">${escapeHtml(t.name)}</option>`;
      });
    }
    if (reportMerchantSelect) {
      const prevValue = reportMerchantSelect.value || 'all';
      reportMerchantSelect.innerHTML = '<option value="all">حسب الجميع (كل التجار)</option>';
      allTraders.forEach(([_, t]) => {
        reportMerchantSelect.innerHTML += `<option value="${escapeHtml(t.name)}">${escapeHtml(t.name)}</option>`;
      });
      reportMerchantSelect.value = prevValue;
    }
    renderTraders(allTraders);
  } catch (error) {
    console.error("خطأ في تحميل التجار:", error);
    if (tradersList) tradersList.innerHTML = `<p class="error">خطأ في تحميل البيانات</p>`;
  }
});

// ==================== الاستماع للتغييرات - السائقين ====================
onValue(ref(db, "drivers"), (snap) => {
  try {
    const data = snap.val() || {};
    allDrivers = Object.entries(data);
    if (driverCountEl) driverCountEl.textContent = allDrivers.length;
    if (driversDatalist) {
      driversDatalist.innerHTML = allDrivers.map(([_, d]) =>
        `<option value="${escapeHtml(d.name)}">`
      ).join("");
    }
    const driverAccountSelect = document.getElementById("driverAccountSelect");
    if (driverAccountSelect) {
      const prevValue = driverAccountSelect.value;
      driverAccountSelect.innerHTML = '<option value="">اختر السائق</option>' +
        allDrivers.map(([_, d]) => `<option value="${escapeHtml(d.name)}">${escapeHtml(d.name)}</option>`).join("");
      if (prevValue) driverAccountSelect.value = prevValue;
    }
    renderDrivers(allDrivers);
  } catch (error) {
    console.error("خطأ في تحميل السائقين:", error);
    if (driversList) driversList.innerHTML = `<p class="error">خطأ في تحميل البيانات</p>`;
  }
});

// ==================== الاستماع للتغييرات - القواطر ====================
onValue(ref(db, "trucks"), (snap) => {
  try {
    const data = snap.val() || {};
    allTrucks = Object.entries(data);
    if (truckCountEl) truckCountEl.textContent = allTrucks.length;
    if (trucksDatalist) {
      trucksDatalist.innerHTML = allTrucks.map(([_, t]) =>
        `<option value="${escapeHtml(t.number)}">`
      ).join("");
    }
    const truckAccountSelect = document.getElementById("truckAccountSelect");
    if (truckAccountSelect) {
      const prevValue = truckAccountSelect.value;
      truckAccountSelect.innerHTML = '<option value="">اختر القاطرة</option>' +
        allTrucks.map(([_, t]) => `<option value="${escapeHtml(t.number)}">${escapeHtml(t.number)}</option>`).join("");
      if (prevValue) truckAccountSelect.value = prevValue;
    }
    renderTrucks(allTrucks);
  } catch (error) {
    console.error("خطأ في تحميل القواطر:", error);
    if (trucksList) trucksList.innerHTML = `<p class="error">خطأ في تحميل البيانات</p>`;
  }
});

// ==================== الاستماع للتغييرات - سندات القبض ====================
onValue(ref(db, "receipts"), (snap) => {
  try {
    const data = snap.val() || {};
    allReceipts = Object.entries(data);
    renderReceipts(allReceipts);
    refreshDashboardSummary();
  } catch (error) {
    console.error("خطأ في تحميل السندات:", error);
    if (receiptsList) receiptsList.innerHTML = `<p class="error">خطأ في تحميل البيانات</p>`;
  }
});

// ==================== توليد التقارير ====================
if (generateReportBtn) {
  generateReportBtn.onclick = async () => {
    try {
      const cat = reportCategory.value;
      const range = resolveDateRange(reportType.value, reportFrom?.value, reportTo?.value);
      const { from, to } = range;

      const snap = await get(ref(db, "invoices"));
      const data = snap.val() || {};
      const allInvs = Object.entries(data).map(([id, inv]) => ({ ...inv, id }));
      let invoices = filterInvoicesByRange(allInvs, range).map(inv => ({ ...inv }));

      const selectedMerchant = (cat === 'merchant' && reportMerchantSelect && reportMerchantSelect.value && reportMerchantSelect.value !== 'all')
        ? reportMerchantSelect.value
        : null;
      if (selectedMerchant) {
        invoices = invoices.filter(inv => inv.merchant === selectedMerchant);
      }

      if (invoices.length === 0) {
        if (reportResult) reportResult.innerHTML = `<div class="empty-state">لا توجد فواتير في هذا النطاق الزمني</div>`;
        const repBody = document.getElementById("repTransactionsBody");
        if (repBody) repBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:20px;">لا توجد بيانات</td></tr>`;
        return;
      }

      const { reportTitle: baseReportTitle, reportData, totals } = computeReportData(invoices, cat);
      const reportTitle = selectedMerchant ? `${baseReportTitle} - ${selectedMerchant}` : baseReportTitle;
      const { total, totalBags } = totals;

      const dateRangeText = reportType.value === 'custom'
        ? `${new Date(from).toLocaleDateString('ar-YE')} - ${new Date(to - 86400000).toLocaleDateString('ar-YE')}`
        : new Date().toLocaleDateString('ar-YE');

      const repTitle = document.getElementById("repTitle");
      const repDate = document.getElementById("repDate");
      const repMainTitle = document.getElementById("repMainTitle");
      const repSummary = document.getElementById("repSummary");
      const repBody = document.getElementById("repTransactionsBody");
      const repTotalBags = document.getElementById("repTotalBags");
      const repTotalAmount = document.getElementById("repTotalAmount");

      if (repTitle) repTitle.textContent = reportTitle;
      if (repDate) repDate.textContent = dateRangeText;
      if (repMainTitle) repMainTitle.textContent = reportTitle;

      if (repSummary) {
        repSummary.innerHTML = `
          <div class="report-grid" style="margin-bottom: 20px;">
            ${reportData.map(item => `
              <div class="report-item">
                <span class="report-label">${escapeHtml(item.label)}</span>
                <span class="report-value">${escapeHtml(String(item.value))}</span>
              </div>
            `).join('')}
          </div>
        `;
      }

      if (repBody) {
        repBody.innerHTML = `
          <tr>
            <td colspan="7" style="background:#f1f5f9; font-weight:bold; text-align:center; padding:8px;">ملخص التحليلات</td>
          </tr>
          ${reportData.map(item => `
            <tr>
              <td colspan="4" class="item-name" style="text-align:right; font-weight:600; padding:7px;">${escapeHtml(item.label)}</td>
              <td colspan="3" class="item-amount" style="text-align:center; padding:7px;">${escapeHtml(String(item.value))}</td>
            </tr>
          `).join('')}
          <tr>
            <td colspan="7" style="background:#f1f5f9; font-weight:bold; height:12px;"></td>
          </tr>
          <tr style="background:#1e3c72; color:#fff;">
            <th style="padding:8px;">رقم الفاتورة</th>
            <th style="padding:8px;">التاريخ</th>
            <th style="padding:8px;">التاجر</th>
            <th style="padding:8px;">السائق</th>
            <th style="padding:8px;">القاطرة</th>
            <th style="padding:8px;">الأكياس</th>
            <th style="padding:8px;">المبلغ</th>
          </tr>
          ${invoices.map(inv => `
            <tr>
              <td style="padding:7px; text-align:center;">${escapeHtml(inv.invoiceNumber || '-')}</td>
              <td style="padding:7px; text-align:center;">${escapeHtml(inv.date || formatDate(inv.createdAt))}</td>
              <td style="padding:7px;">${escapeHtml(inv.merchant || '')}</td>
              <td style="padding:7px;">${escapeHtml(inv.driver || '-')}</td>
              <td style="padding:7px; text-align:center;">${escapeHtml(inv.truckNumber || '-')}</td>
              <td style="padding:7px; text-align:center;">${(Number(inv.bagCount) || 0).toLocaleString()}</td>
              <td style="padding:7px; text-align:center; font-weight:bold;">${(Number(inv.total) || 0).toLocaleString()}</td>
            </tr>
          `).join('')}
          <tr style="background:#e2e8f0; font-weight:bold;">
            <td colspan="4" style="padding:8px;">الإجمالي العام</td>
            <td style="padding:8px; text-align:center;">${invoices.length} فاتورة</td>
            <td style="padding:8px; text-align:center; color:#1e3c72;">${totalBags.toLocaleString()}</td>
            <td style="padding:8px; text-align:center; color:#28a745;">${total.toLocaleString()}</td>
          </tr>
        `;
      }

      if (repTotalBags) repTotalBags.textContent = totalBags.toLocaleString();
      if (repTotalAmount) repTotalAmount.textContent = total.toLocaleString() + ' ريال';

      currentReportData = {
        title: reportTitle,
        dateRange: dateRangeText
      };

      if (reportResult) {
        reportResult.innerHTML = `
          <div class="card report-summary" style="margin-bottom: 1.5rem;">
            <h3>${escapeHtml(reportTitle)}</h3>
            <p style="opacity: 0.9; margin-bottom: 1rem;">${escapeHtml(dateRangeText)}</p>
            <div class="report-grid">
              ${reportData.map(item => `
                <div class="report-item">
                  <span class="report-label">${escapeHtml(item.label)}</span>
                  <span class="report-value">${escapeHtml(String(item.value))}</span>
                </div>
              `).join('')}
            </div>
          </div>
          <h3 style="margin-bottom: 1rem; color: #1e3c72;">تفاصيل الفواتير المدرجة</h3>
          <div class="table-container">
            <table class="report-table">
              <thead>
                <tr>
                  <th>رقم الفاتورة</th>
                  <th>التاريخ</th>
                  <th>التاجر</th>
                  <th>السائق</th>
                  <th>القاطرة</th>
                  <th>الاكياس</th>
                  <th>النوع</th>
                  <th>المبلغ</th>
                  <th>العمليات</th>
                </tr>
              </thead>
              <tbody>
                ${invoices.map(inv => `
                  <tr>
                    <td>${escapeHtml(inv.invoiceNumber || 'غير محدد')}</td>
                    <td>${escapeHtml(inv.date || formatDate(inv.createdAt))}</td>
                    <td>${escapeHtml(inv.merchant || '')}</td>
                    <td>${escapeHtml(inv.driver || '-')}</td>
                    <td>${escapeHtml(inv.truckNumber || '-')}</td>
                    <td>${(Number(inv.bagCount) || 0).toLocaleString()}</td>
                    <td>${inv.truckType === 'dump' ? 'قلاب' : 'سطحة'}</td>
                    <td><strong>${(Number(inv.total) || 0).toLocaleString()}</strong></td>
                    <td>
                      <button class="btn-icon" onclick="editInvoice('${inv.id || ''}')" style="color: #1e3c72; margin-left:8px;">تعديل</button>
                      <button class="btn-icon" onclick="deleteInvoice('${inv.id || ''}')" style="color: #d9534f;">حذف</button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
              <tfoot>
                <tr class="total-row">
                  <td colspan="5"><strong>الاجمالي الكلي</strong></td>
                  <td><strong>${totalBags.toLocaleString()}</strong></td>
                  <td></td>
                  <td><strong>${total.toLocaleString()} ريال</strong></td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        `;
      }

    } catch (error) {
      console.error("خطأ في التقرير:", error);
      if (reportResult) reportResult.innerHTML = `<p class="error">خطأ في توليد التقرير: ${escapeHtml(error.message)}</p>`;
    }
  };
}

// ==================== طباعة التقرير ====================
window.printReport = function() {
  if (!currentReportData) {
    alert("عرض تقرير اولاً");
    return;
  }
  printAreaOrShare("reportPrintArea", `تقرير-${currentReportData.title}`, 100);
};

// ==================== طباعة تقرير مالي متقدم بالرصيد والسندات مع الشعار ====================
window.printAdvancedAccountReport = async function() {
  try {
    let from = 0;
    let to = Date.now() + 86400000;
    const today = new Date();

    if (reportType) {
      switch (reportType.value) {
        case 'daily':
          from = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
          to = from + 86400000;
          break;
        case 'weekly':
          const dow = today.getDay();
          from = new Date(today.getFullYear(), today.getMonth(), today.getDate() - dow).getTime();
          to = from + (7 * 86400000);
          break;
        case 'monthly':
          from = new Date(today.getFullYear(), today.getMonth(), 1).getTime();
          to = new Date(today.getFullYear(), today.getMonth() + 1, 1).getTime();
          break;
        case 'yearly':
          from = new Date(today.getFullYear(), 0, 1).getTime();
          to = new Date(today.getFullYear() + 1, 0, 1).getTime();
          break;
        case 'custom':
          from = new Date(reportFrom.value).getTime();
          to = new Date(reportTo.value).getTime() + 86400000;
          if (isNaN(from) || isNaN(to)) {
            alert("يرجى اختيار نطاق التاريخ الصحيح");
            return;
          }
          break;
        default:
          from = 0;
          to = Date.now() + 86400000;
      }
    }

    const invSnap = await get(ref(db, "invoices"));
    const invData = invSnap.val() || {};
    const filteredInvoices = Object.entries(invData)
      .map(([id, v]) => ({ id, ...v }))
      .filter(inv => {
        const ts = Number(inv.createdAt) || 0;
        return ts >= from && ts <= to;
      });

    const recSnap = await get(ref(db, "receipts"));
    const recData = recSnap.val() || {};
    const filteredReceipts = Object.entries(recData)
      .map(([id, v]) => ({ id, ...v }))
      .filter(r => {
        const ts = Number(r.createdAt) || 0;
        return ts >= from && ts <= to;
      });

    const merchantSummaryMap = {};
    filteredInvoices.forEach(inv => {
      const m = inv.merchant || 'غير محدد';
      if (!merchantSummaryMap[m]) merchantSummaryMap[m] = { invoicesTotal: 0, receiptsTotal: 0, invoiceCount: 0, receiptCount: 0 };
      merchantSummaryMap[m].invoicesTotal += Number(inv.total) || 0;
      merchantSummaryMap[m].invoiceCount++;
    });
    filteredReceipts.forEach(r => {
      const m = r.trader || 'غير محدد';
      if (!merchantSummaryMap[m]) merchantSummaryMap[m] = { invoicesTotal: 0, receiptsTotal: 0, invoiceCount: 0, receiptCount: 0 };
      merchantSummaryMap[m].receiptsTotal += Number(r.amount) || 0;
      merchantSummaryMap[m].receiptCount++;
    });

    const grandTotalInvoices = filteredInvoices.reduce((s, inv) => s + (Number(inv.total) || 0), 0);
    const grandTotalReceipts = filteredReceipts.reduce((s, r) => s + (Number(r.amount) || 0), 0);
    const grandBalance = grandTotalInvoices - grandTotalReceipts;
    const grandBalanceLabel = grandBalance > 0
      ? `${grandBalance.toLocaleString()} (متبقي على التجار)`
      : grandBalance < 0
        ? `${Math.abs(grandBalance).toLocaleString()} (زيادة مدفوعة)`
        : '0 (متعادل)';

    const dateRangeLabel = reportType && reportType.value === 'custom'
      ? `${new Date(from).toLocaleDateString('ar-YE')} - ${new Date(to - 86400000).toLocaleDateString('ar-YE')}`
      : today.toLocaleDateString('ar-YE');

    const merchantRowsHtml = Object.entries(merchantSummaryMap).map(([name, stats]) => {
      const bal = stats.invoicesTotal - stats.receiptsTotal;
      const balColor = bal > 0 ? '#d9534f' : bal < 0 ? '#28a745' : '#555';
      const balLabel = bal > 0 ? `${bal.toLocaleString()} (عليه)` : bal < 0 ? `${Math.abs(bal).toLocaleString()} (له)` : '0 (متعادل)';
      return `
        <tr>
          <td style="padding:8px; border:1px solid #ddd;">${escapeHtml(name)}</td>
          <td style="padding:8px; border:1px solid #ddd; text-align:center;">${stats.invoiceCount}</td>
          <td style="padding:8px; border:1px solid #ddd; text-align:center; color:#d9534f; font-weight:bold;">${stats.invoicesTotal.toLocaleString()}</td>
          <td style="padding:8px; border:1px solid #ddd; text-align:center;">${stats.receiptCount}</td>
          <td style="padding:8px; border:1px solid #ddd; text-align:center; color:#28a745; font-weight:bold;">${stats.receiptsTotal.toLocaleString()}</td>
          <td style="padding:8px; border:1px solid #ddd; text-align:center; color:${balColor}; font-weight:bold;">${balLabel}</td>
        </tr>
      `;
    }).join('');

    printHtmlInIframe(`
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>التقرير المالي الشامل بالرصيد والسندات</title>
        <style>
          body { font-family: 'Cairo', Arial, sans-serif; margin: 20px; color: #222; direction: rtl; font-size: 0.9rem; }
          .header { display:flex; justify-content:space-between; align-items:center; border-bottom:3px solid #1e3c72; padding-bottom:15px; margin-bottom:20px; }
          .header-logo { display:flex; align-items:center; gap:14px; }
          .header-logo img { width:65px; height:65px; object-fit:contain; border-radius:7px; }
          .logo-title { color:#1e3c72; font-size:1.25rem; font-weight:bold; margin:0; }
          .logo-sub { color:#c8860a; font-size:0.8rem; margin:4px 0 0 0; }
          h1 { text-align:center; color:#1e3c72; font-size:1.2rem; margin:10px 0 20px 0; }
          h2 { color:#1e3c72; font-size:1rem; margin:20px 0 8px 0; border-right:4px solid #c8860a; padding-right:8px; }
          .summary-boxes { display:flex; gap:15px; margin-bottom:20px; flex-wrap:wrap; }
          .sbox { background:linear-gradient(135deg,#f0f4ff,#e8f0fe); border:1px solid #b0c4de; border-radius:8px; padding:12px 18px; flex:1; min-width:130px; text-align:center; }
          .sbox-label { font-size:0.75rem; color:#555; margin-bottom:4px; }
          .sbox-value { font-size:1.05rem; font-weight:bold; color:#1e3c72; }
          table { width:100%; border-collapse:collapse; font-size:0.85rem; margin-bottom:20px; }
          thead tr { background:linear-gradient(90deg,#1e3c72,#2a5298); color:#fff; }
          thead th { padding:9px 7px; border:1px solid #16306a; text-align:center; }
          tfoot tr { background:#e2e8f0; font-weight:bold; }
          tfoot td { padding:9px 7px; border:1px solid #ccc; text-align:center; }
          .footer { margin-top:30px; border-top:1px dashed #ccc; padding-top:15px; display:flex; justify-content:space-between; }
          .sig-line { border-bottom:1px solid #999; width:150px; margin:30px auto 5px; }
          .signature { text-align:center; }
          @media print { body { margin:10px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="header-logo">
            <img src="${OFFICE_LOGO_SRC}" alt="شعار المكتب" onerror="this.style.display='none'"/>
            <div>
              <p class="logo-title">مكتب أبو محمد للتخليص الجمركي والخدمات اللوجستية</p>
              <p class="logo-sub">الجمهورية اليمنية &nbsp;|&nbsp; 📞 775477377</p>
            </div>
          </div>
          <div style="text-align:left; color:#555; font-size:0.85rem;">
            <p style="margin:0;">تاريخ الطباعة: ${new Date().toLocaleDateString('ar-YE')}</p>
          </div>
        </div>
        <h1>📊 التقرير المالي الشامل بالرصيد والسندات</h1>
        <p style="text-align:center; color:#555; margin-bottom:20px;">الفترة الزمنية: ${escapeHtml(dateRangeLabel)}</p>
        <div class="summary-boxes">
          <div class="sbox">
            <div class="sbox-label">إجمالي الفواتير</div>
            <div class="sbox-value">${filteredInvoices.length} فاتورة</div>
          </div>
          <div class="sbox">
            <div class="sbox-label">المبالغ المستحقة</div>
            <div class="sbox-value" style="color:#d9534f;">${grandTotalInvoices.toLocaleString()} ريال</div>
          </div>
          <div class="sbox">
            <div class="sbox-label">إجمالي المقبوضات</div>
            <div class="sbox-value" style="color:#28a745;">${grandTotalReceipts.toLocaleString()} ريال</div>
          </div>
          <div class="sbox">
            <div class="sbox-label">صافي الرصيد</div>
            <div class="sbox-value" style="color:${grandBalance > 0 ? '#d9534f' : grandBalance < 0 ? '#28a745' : '#555'};">${grandBalanceLabel}</div>
          </div>
        </div>
        <h2>ملخص حسابات التجار</h2>
        <table>
          <thead>
            <tr>
              <th>اسم التاجر</th>
              <th>عدد الفواتير</th>
              <th>إجمالي الفواتير (ريال)</th>
              <th>عدد السندات</th>
              <th>إجمالي المقبوضات (ريال)</th>
              <th>الرصيد</th>
            </tr>
          </thead>
          <tbody>
            ${merchantRowsHtml}
          </tbody>
          <tfoot>
            <tr>
              <td>الإجمالي العام</td>
              <td>${filteredInvoices.length}</td>
              <td style="color:#d9534f;">${grandTotalInvoices.toLocaleString()}</td>
              <td>${filteredReceipts.length}</td>
              <td style="color:#28a745;">${grandTotalReceipts.toLocaleString()}</td>
              <td style="color:${grandBalance > 0 ? '#d9534f' : grandBalance < 0 ? '#28a745' : '#555'};">${grandBalanceLabel}</td>
            </tr>
          </tfoot>
        </table>
        <h2>تفاصيل الفواتير</h2>
        <table>
          <thead>
            <tr>
              <th>رقم الفاتورة</th>
              <th>التاريخ</th>
              <th>التاجر</th>
              <th>السائق</th>
              <th>القاطرة</th>
              <th>الأكياس</th>
              <th>النوع</th>
              <th>المبلغ (ريال)</th>
            </tr>
          </thead>
          <tbody>
            ${filteredInvoices.map(inv => `
              <tr>
                <td style="padding:7px; border:1px solid #ddd; text-align:center;">${escapeHtml(inv.invoiceNumber || '-')}</td>
                <td style="padding:7px; border:1px solid #ddd; text-align:center;">${escapeHtml(inv.date || formatDate(inv.createdAt))}</td>
                <td style="padding:7px; border:1px solid #ddd;">${escapeHtml(inv.merchant || '')}</td>
                <td style="padding:7px; border:1px solid #ddd;">${escapeHtml(inv.driver || '-')}</td>
                <td style="padding:7px; border:1px solid #ddd; text-align:center;">${escapeHtml(inv.truckNumber || '-')}</td>
                <td style="padding:7px; border:1px solid #ddd; text-align:center;">${(Number(inv.bagCount) || 0).toLocaleString()}</td>
                <td style="padding:7px; border:1px solid #ddd; text-align:center;">${inv.truckType === 'dump' ? 'قلاب' : 'سطحة'}</td>
                <td style="padding:7px; border:1px solid #ddd; text-align:center; font-weight:bold; color:#1e3c72;">${(Number(inv.total) || 0).toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="5">الإجمالي</td>
              <td>${filteredInvoices.reduce((s, inv) => s + (Number(inv.bagCount) || 0), 0).toLocaleString()}</td>
              <td>-</td>
              <td>${grandTotalInvoices.toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>
        <h2>سندات القبض</h2>
        <table>
          <thead>
            <tr>
              <th>التاجر</th>
              <th>التاريخ</th>
              <th>المبلغ (ريال)</th>
              <th>ملاحظات</th>
            </tr>
          </thead>
          <tbody>
            ${filteredReceipts.map(r => `
              <tr>
                <td style="padding:7px; border:1px solid #ddd;">${escapeHtml(r.trader || '-')}</td>
                <td style="padding:7px; border:1px solid #ddd; text-align:center;">${escapeHtml(r.date || formatDate(r.createdAt))}</td>
                <td style="padding:7px; border:1px solid #ddd; text-align:center; color:#28a745; font-weight:bold;">${(Number(r.amount) || 0).toLocaleString()}</td>
                <td style="padding:7px; border:1px solid #ddd;">${escapeHtml(r.notes || '-')}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="2">إجمالي المقبوضات</td>
              <td style="color:#28a745;">${grandTotalReceipts.toLocaleString()}</td>
              <td>-</td>
            </tr>
          </tfoot>
        </table>
        <div class="footer">
          <div class="signature">
            <div class="sig-line"></div>
            <p>توقيع المراجع</p>
          </div>
          <div class="signature">
            <div class="sig-line"></div>
            <p>ختم وتوقيع المكتب</p>
          </div>
        </div>
      </body>
      </html>
    `, `التقرير-الشامل`);

  } catch (error) {
    console.error("خطأ في طباعة التقرير المتقدم:", error);
    alert("خطأ في طباعة التقرير: " + error.message);
  }
};

// ==================== تصدير التقرير PDF ====================
window.exportReportPDF = function() {
  if (!currentReportData) {
    alert("عرض تقرير اولاً");
    return;
  }
  captureAndDownload("reportPrintArea", `report-${currentReportData.title}`, 'pdf');
};

// ==================== تصدير التقرير PNG ====================
window.exportReportPNG = function() {
  if (!currentReportData) {
    alert("عرض تقرير اولاً");
    return;
  }
  captureAndDownload("reportPrintArea", `report-${currentReportData.title}`, 'png');
};

// ==================== دوال مساعدة ====================
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(timestamp) {
  if (!timestamp) return 'غير معروف';
  const date = new Date(Number(timestamp));
  if (isNaN(date.getTime())) return 'تاريخ غير صالح';
  return date.toLocaleDateString('ar-YE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

// ==================== تهيئة القيم الافتراضية عند التحميل ====================
if (invoiceDate) invoiceDate.value = new Date().toISOString().split('T')[0];
if (receiptDate) receiptDate.value = new Date().toISOString().split('T')[0];
if (reportFrom) reportFrom.value = new Date().toISOString().split('T')[0];
if (reportTo) reportTo.value = new Date().toISOString().split('T')[0];

window.addEventListener('load', () => {
  generateInvoiceNumber().then(num => {
    if (invoiceNumber && !invoiceNumber.value && !currentEditId) {
      invoiceNumber.value = '';
    }
  });
  // أضف هذا السطر في ملف main.js عند سطر 2058 لفتح ممر البيانات
window.mySystemDatabase = db; // أو إذا كان المتغير عندك باسم database اجعلها window.mySystemDatabase = database;

  console.log("النظام يعمل بنجاح وكفاءة تامة - مكتب أبو محمد للتخليص الجمركي والخدمات اللوجستية");
});
// كود ممر البيانات التلقائي - يُوضع في آخر سطر داخل ملف main.js تمامًا
(function() {
    const databaseCheckInterval = setInterval(() => {
        // فحص المتغيرات الشائعة للفايربيس في نظامك
        let activeDb = null;
        if (typeof db !== 'undefined') activeDb = db;
        else if (typeof database !== 'undefined') activeDb = database;
        else if (typeof firebase !== 'undefined' && typeof firebase.database === 'function') activeDb = firebase.database();

        if (activeDb) {
            window.mySystemDatabase = activeDb;
            console.log("✅ تم فتح ممر البيانات بنجاح وارتباطه بالـ HTML");
            clearInterval(databaseCheckInterval);
        }
    }, 500);
})();

// ==================================================================
// ==================== حساب السائق وحساب القاطرة ====================
// ------------------------------------------------------------------
// إضافة جديدة كاملة (لا تعدّل أي كود سابق) تستخدم محرك الحسابات
// الموحّد modules/accountsEngine.js وأداة modules/exportUtils.js
// لتوفير كشف حساب مستقل لكل سائق وكل قاطرة، مبني على بيانات
// invoices الحالية مباشرة دون أي تغيير في قاعدة البيانات.
// ==================================================================

let currentDriverAccountData = null;
let currentTruckAccountData = null;

const TRUCK_TYPE_LABELS = { surface: "سطحة", dump: "قلاب" };

// ---------------- عناصر واجهة حساب السائق ----------------
const driverAccountSelectEl = document.getElementById("driverAccountSelect");
const driverPeriodTypeEl = document.getElementById("driverPeriodType");
const driverCustomDatesEl = document.getElementById("driverCustomDates");
const driverFromDateEl = document.getElementById("driverFromDate");
const driverToDateEl = document.getElementById("driverToDate");

// ---------------- عناصر واجهة حساب القاطرة ----------------
const truckAccountSelectEl = document.getElementById("truckAccountSelect");
const truckPeriodTypeEl = document.getElementById("truckPeriodType");
const truckCustomDatesEl = document.getElementById("truckCustomDates");
const truckFromDateEl = document.getElementById("truckFromDate");
const truckToDateEl = document.getElementById("truckToDate");

function getDriverDateRange() {
  const type = driverPeriodTypeEl ? driverPeriodTypeEl.value : "all";
  return resolveDateRange(type, driverFromDateEl?.value, driverToDateEl?.value);
}

function getTruckDateRange() {
  const type = truckPeriodTypeEl ? truckPeriodTypeEl.value : "all";
  return resolveDateRange(type, truckFromDateEl?.value, truckToDateEl?.value);
}

if (driverPeriodTypeEl) {
  driverPeriodTypeEl.onchange = () => {
    if (driverCustomDatesEl) driverCustomDatesEl.style.display = driverPeriodTypeEl.value === "custom" ? "flex" : "none";
    loadDriverAccount();
  };
}
if (driverFromDateEl) driverFromDateEl.onchange = loadDriverAccount;
if (driverToDateEl) driverToDateEl.onchange = loadDriverAccount;
if (driverAccountSelectEl) driverAccountSelectEl.onchange = loadDriverAccount;

if (truckPeriodTypeEl) {
  truckPeriodTypeEl.onchange = () => {
    if (truckCustomDatesEl) truckCustomDatesEl.style.display = truckPeriodTypeEl.value === "custom" ? "flex" : "none";
    loadTruckAccount();
  };
}
if (truckFromDateEl) truckFromDateEl.onchange = loadTruckAccount;
if (truckToDateEl) truckToDateEl.onchange = loadTruckAccount;
if (truckAccountSelectEl) truckAccountSelectEl.onchange = loadTruckAccount;

// ==================== تحميل وعرض حساب السائق ====================
async function loadDriverAccount() {
  const driverName = driverAccountSelectEl ? driverAccountSelectEl.value : "";
  const driverSummaryEl = document.getElementById("driverSummary");
  const driverTripsBodyEl = document.getElementById("driverTripsBody");

  if (!driverName) {
    if (driverSummaryEl) driverSummaryEl.style.display = "none";
    if (driverTripsBodyEl) driverTripsBodyEl.innerHTML = "";
    currentDriverAccountData = null;
    return;
  }

  try {
    const range = getDriverDateRange();
    const invoicesSnap = await get(ref(db, "invoices"));
    const invoicesData = Object.values(invoicesSnap.val() || {});

    const statement = buildDriverStatement(invoicesData, driverName, range);
    currentDriverAccountData = statement;

    document.getElementById("driverTripCount").textContent = statement.tripCount;
    document.getElementById("driverTotalBags").textContent = statement.totalBags.toLocaleString();
    document.getElementById("driverTotalFees").textContent = statement.totalFees.toLocaleString() + " ريال";
    document.getElementById("driverTraders").textContent = statement.traders.length ? statement.traders.join("، ") : "-";
    document.getElementById("driverTrucks").textContent = statement.trucks.length ? statement.trucks.join("، ") : "-";

    if (driverTripsBodyEl) {
      driverTripsBodyEl.innerHTML = statement.trips.map((t) => `
        <tr>
          <td>${escapeHtml(t.date || "-")}</td>
          <td>${escapeHtml(t.invoiceNumber || "-")}</td>
          <td>${escapeHtml(t.merchant || "-")}</td>
          <td>${escapeHtml(t.truckNumber || "-")}</td>
          <td>${(Number(t.bagCount) || 0).toLocaleString()}</td>
          <td>${(Number(t.worker) || 0).toLocaleString()}</td>
        </tr>
      `).join("") || `<tr><td colspan="6" style="text-align:center; padding:20px;">لا توجد رحلات في هذه الفترة</td></tr>`;
    }

    // تعبئة منطقة الطباعة الرسمية (منفصلة عن جدول الشاشة)
    const pdDriverNameEl = document.getElementById("pdDriverName");
    if (pdDriverNameEl) pdDriverNameEl.textContent = driverName;
    const pdDateEl = document.getElementById("pdDate");
    if (pdDateEl) pdDateEl.textContent = new Date().toLocaleDateString('ar-YE');
    const pdTripCountEl = document.getElementById("pdTripCount");
    if (pdTripCountEl) pdTripCountEl.textContent = statement.tripCount;
    const pdTotalBagsEl = document.getElementById("pdTotalBags");
    if (pdTotalBagsEl) pdTotalBagsEl.textContent = statement.totalBags.toLocaleString();
    const pdTotalFeesEl = document.getElementById("pdTotalFees");
    if (pdTotalFeesEl) pdTotalFeesEl.textContent = statement.totalFees.toLocaleString() + " ريال";
    const pdTripsBodyEl = document.getElementById("pdTripsBody");
    if (pdTripsBodyEl) {
      pdTripsBodyEl.innerHTML = statement.trips.map((t) => `
        <tr>
          <td class="item-name">${escapeHtml(t.date || "-")}</td>
          <td class="item-name">${escapeHtml(t.invoiceNumber || "-")}</td>
          <td class="item-name">${escapeHtml(t.merchant || "-")}</td>
          <td class="item-name">${escapeHtml(t.truckNumber || "-")}</td>
          <td class="item-amount">${(Number(t.bagCount) || 0).toLocaleString()}</td>
          <td class="item-amount">${(Number(t.worker) || 0).toLocaleString()}</td>
        </tr>
      `).join("") || `<tr><td colspan="6" class="item-name" style="text-align:center;">لا توجد رحلات في هذه الفترة</td></tr>`;
    }

    if (driverSummaryEl) driverSummaryEl.style.display = "block";
  } catch (error) {
    console.error("خطأ في تحميل حساب السائق:", error);
    alert("خطأ في تحميل بيانات السائق");
  }
}

// ==================== تحميل وعرض حساب القاطرة ====================
async function loadTruckAccount() {
  const truckNumber = truckAccountSelectEl ? truckAccountSelectEl.value : "";
  const truckSummaryEl = document.getElementById("truckSummary");
  const truckTripsBodyEl = document.getElementById("truckTripsBody");

  if (!truckNumber) {
    if (truckSummaryEl) truckSummaryEl.style.display = "none";
    if (truckTripsBodyEl) truckTripsBodyEl.innerHTML = "";
    currentTruckAccountData = null;
    return;
  }

  try {
    const range = getTruckDateRange();
    const invoicesSnap = await get(ref(db, "invoices"));
    const invoicesData = Object.values(invoicesSnap.val() || {});

    const truckEntry = allTrucks.find(([_, t]) => t.number === truckNumber);
    const truckMeta = truckEntry ? truckEntry[1] : null;

    const statement = buildTruckStatement(invoicesData, truckMeta, truckNumber, range);
    currentTruckAccountData = statement;

    document.getElementById("truckPlateNumber").textContent = truckNumber;
    document.getElementById("truckTypeLabel").textContent = TRUCK_TYPE_LABELS[statement.truckType] || statement.truckType || "-";
    document.getElementById("truckTripCount").textContent = statement.tripCount;
    document.getElementById("truckTotalBags").textContent = statement.totalBags.toLocaleString();
    document.getElementById("truckTotalFees").textContent = statement.totalFees.toLocaleString() + " ريال";
    document.getElementById("truckDrivers").textContent = statement.drivers.length ? statement.drivers.join("، ") : "-";
    document.getElementById("truckTraders").textContent = statement.traders.length ? statement.traders.join("، ") : "-";

    if (truckTripsBodyEl) {
      truckTripsBodyEl.innerHTML = statement.trips.map((t) => `
        <tr>
          <td>${escapeHtml(t.date || "-")}</td>
          <td>${escapeHtml(t.invoiceNumber || "-")}</td>
          <td>${escapeHtml(t.merchant || "-")}</td>
          <td>${escapeHtml(t.driver || "-")}</td>
          <td>${(Number(t.bagCount) || 0).toLocaleString()}</td>
          <td>${(Number(t.worker) || 0).toLocaleString()}</td>
        </tr>
      `).join("") || `<tr><td colspan="6" style="text-align:center; padding:20px;">لا توجد رحلات في هذه الفترة</td></tr>`;
    }

    // تعبئة منطقة الطباعة الرسمية (منفصلة عن جدول الشاشة)
    const ptTruckNumberEl = document.getElementById("ptTruckNumber");
    if (ptTruckNumberEl) ptTruckNumberEl.textContent = truckNumber;
    const ptDateEl = document.getElementById("ptDate");
    if (ptDateEl) ptDateEl.textContent = new Date().toLocaleDateString('ar-YE');
    const ptTruckTypeEl = document.getElementById("ptTruckType");
    if (ptTruckTypeEl) ptTruckTypeEl.textContent = TRUCK_TYPE_LABELS[statement.truckType] || statement.truckType || "-";
    const ptTripCountEl = document.getElementById("ptTripCount");
    if (ptTripCountEl) ptTripCountEl.textContent = statement.tripCount;
    const ptTotalBagsEl = document.getElementById("ptTotalBags");
    if (ptTotalBagsEl) ptTotalBagsEl.textContent = statement.totalBags.toLocaleString();
    const ptTotalFeesEl = document.getElementById("ptTotalFees");
    if (ptTotalFeesEl) ptTotalFeesEl.textContent = statement.totalFees.toLocaleString() + " ريال";
    const ptTripsBodyEl = document.getElementById("ptTripsBody");
    if (ptTripsBodyEl) {
      ptTripsBodyEl.innerHTML = statement.trips.map((t) => `
        <tr>
          <td class="item-name">${escapeHtml(t.date || "-")}</td>
          <td class="item-name">${escapeHtml(t.invoiceNumber || "-")}</td>
          <td class="item-name">${escapeHtml(t.merchant || "-")}</td>
          <td class="item-name">${escapeHtml(t.driver || "-")}</td>
          <td class="item-amount">${(Number(t.bagCount) || 0).toLocaleString()}</td>
          <td class="item-amount">${(Number(t.worker) || 0).toLocaleString()}</td>
        </tr>
      `).join("") || `<tr><td colspan="6" class="item-name" style="text-align:center;">لا توجد رحلات في هذه الفترة</td></tr>`;
    }

    if (truckSummaryEl) truckSummaryEl.style.display = "block";
  } catch (error) {
    console.error("خطأ في تحميل حساب القاطرة:", error);
    alert("خطأ في تحميل بيانات القاطرة");
  }
}

// ==================== طباعة وتصدير حساب السائق ====================
window.printDriverAccount = function () {
  if (!currentDriverAccountData) { alert("اختر سائقاً اولاً"); return; }
  printAreaOrShare("driverAccountPrintArea", `حساب-سائق-${currentDriverAccountData.entityName}`, 100);
};

window.exportDriverAccountPDF = function () {
  if (!currentDriverAccountData) { alert("اختر سائقاً اولاً"); return; }
  captureAndDownload("driverAccountPrintArea", `driver-account-${currentDriverAccountData.entityName}`, "pdf");
};

window.exportDriverAccountPNG = function () {
  if (!currentDriverAccountData) { alert("اختر سائقاً اولاً"); return; }
  captureAndDownload("driverAccountPrintArea", `driver-account-${currentDriverAccountData.entityName}`, "png");
};

window.exportDriverAccountExcel = function () {
  if (!currentDriverAccountData) { alert("اختر سائقاً اولاً"); return; }
  const columns = [
    { key: "date", label: "التاريخ" },
    { key: "invoiceNumber", label: "رقم الفاتورة" },
    { key: "merchant", label: "اسم التاجر" },
    { key: "truckNumber", label: "رقم اللوحة" },
    { key: "bagCount", label: "عدد الأكياس" },
    { key: "worker", label: "الأجرة" }
  ];
  exportRowsToExcel(`driver-account-${currentDriverAccountData.entityName}`, "حساب السائق", columns, currentDriverAccountData.trips);
};

// ==================== طباعة وتصدير حساب القاطرة ====================
window.printTruckAccount = function () {
  if (!currentTruckAccountData) { alert("اختر قاطرة اولاً"); return; }
  printAreaOrShare("truckAccountPrintArea", `حساب-قاطرة-${currentTruckAccountData.entityName}`, 100);
};

window.exportTruckAccountPDF = function () {
  if (!currentTruckAccountData) { alert("اختر قاطرة اولاً"); return; }
  captureAndDownload("truckAccountPrintArea", `truck-account-${currentTruckAccountData.entityName}`, "pdf");
};

window.exportTruckAccountPNG = function () {
  if (!currentTruckAccountData) { alert("اختر قاطرة اولاً"); return; }
  captureAndDownload("truckAccountPrintArea", `truck-account-${currentTruckAccountData.entityName}`, "png");
};

window.exportTruckAccountExcel = function () {
  if (!currentTruckAccountData) { alert("اختر قاطرة اولاً"); return; }
  const columns = [
    { key: "date", label: "التاريخ" },
    { key: "invoiceNumber", label: "رقم الفاتورة" },
    { key: "merchant", label: "اسم التاجر" },
    { key: "driver", label: "اسم السائق" },
    { key: "bagCount", label: "عدد الأكياس" },
    { key: "worker", label: "الأجرة" }
  ];
  exportRowsToExcel(`truck-account-${currentTruckAccountData.entityName}`, "حساب القاطرة", columns, currentTruckAccountData.trips);
};

// ==================================================================
// ============ سجل المكتب: النثريات / العمولات / العمال / سندات الصرف ============
// ------------------------------------------------------------------
// تفعيل حقيقي لأزرار "office-ledger-nav" الموجودة في index.html
// (كانت تستدعي openOfficeLedgerPanel/addNewPaymentVoucher وهي دوال
// غير معرّفة سابقاً، فكان النقر عليها لا يفعل شيئاً). هذا الكود
// الجديد بالكامل يجعلها تعمل فعلياً، ويستخدم modules/expenses.js
// لحفظ سندات الصرف الحقيقية في قاعدة البيانات (office_expenses).
//
// النثريات/العمولات/أجور العمال: مُرحّلة تلقائياً من حقول الفاتورة
// نفسها (misc / office / worker) دون أي عقدة قاعدة بيانات إضافية.
// سندات الصرف فقط هي بيانات حقيقية يُدخلها المستخدم وتُحفظ فعلياً.
// ==================================================================

window.openOfficeLedgerPanel = async function (type) {
  const panelsWrapper = document.querySelector(".office-ledger-panels");
  if (panelsWrapper) panelsWrapper.style.display = "block";

  document.querySelectorAll(".d-panel").forEach((p) => (p.style.display = "none"));

  const panelMap = { exp: "v-panel-expenses", comm: "v-panel-commissions", work: "v-panel-workers", pay: "v-panel-payments" };
  const targetPanel = document.getElementById(panelMap[type]);
  if (targetPanel) targetPanel.style.display = "block";

  try {
    const invoicesSnap = await get(ref(db, "invoices"));
    const invoices = Object.entries(invoicesSnap.val() || {}).map(([id, v]) => ({ id, ...v }));

    if (type === "exp") {
      const totalMisc = invoices.reduce((s, i) => s + (Number(i.misc) || 0), 0);
      const box = document.getElementById("b-total-expenses");
      if (box) box.textContent = totalMisc.toLocaleString() + " ريال";
      const body = document.getElementById("r-expenses-rows");
      if (body) {
        body.innerHTML = invoices.map((i) => `
          <tr>
            <td>${escapeHtml(i.invoiceNumber || "-")}</td>
            <td>${escapeHtml(i.date || "-")}</td>
            <td>نثريات فاتورة ${escapeHtml(i.invoiceNumber || "")} - ${escapeHtml(i.merchant || "")}</td>
            <td>${(Number(i.misc) || 0).toLocaleString()}</td>
          </tr>
        `).join("") || `<tr><td colspan="4" class="office-empty">لا توجد بيانات</td></tr>`;
      }
    }

    if (type === "comm") {
      const totalOffice = invoices.reduce((s, i) => s + (Number(i.office) || 0), 0);
      const box = document.getElementById("b-total-commissions");
      if (box) box.textContent = totalOffice.toLocaleString() + " ريال";
      const body = document.getElementById("r-commissions-rows");
      if (body) {
        body.innerHTML = invoices.map((i) => `
          <tr>
            <td>${escapeHtml(i.invoiceNumber || "-")}</td>
            <td>${escapeHtml(i.date || "-")}</td>
            <td>${escapeHtml(i.merchant || "-")}</td>
            <td>${(Number(i.office) || 0).toLocaleString()}</td>
          </tr>
        `).join("") || `<tr><td colspan="4" class="office-empty">لا توجد بيانات</td></tr>`;
      }
    }

    if (type === "work") {
      const totalWorker = invoices.reduce((s, i) => s + (Number(i.worker) || 0), 0);
      const expenses = await fetchExpenseVouchers(db);
      const totalPayments = computeExpensesTotal(expenses);
      const boxTotal = document.getElementById("b-total-workers");
      if (boxTotal) boxTotal.textContent = totalWorker.toLocaleString() + " ريال";
      const boxBalance = document.getElementById("b-workers-balance");
      if (boxBalance) boxBalance.textContent = (totalWorker - totalPayments).toLocaleString() + " ريال";
      const body = document.getElementById("r-workers-rows");
      if (body) {
        body.innerHTML = invoices.map((i) => `
          <tr>
            <td>${escapeHtml(i.invoiceNumber || "-")}</td>
            <td>${escapeHtml(i.date || "-")}</td>
            <td>أجرة السائق/العامل - فاتورة ${escapeHtml(i.invoiceNumber || "")} (${escapeHtml(i.driver || "-")})</td>
            <td>${(Number(i.worker) || 0).toLocaleString()}</td>
          </tr>
        `).join("") || `<tr><td colspan="4" class="office-empty">لا توجد بيانات</td></tr>`;
      }
    }

    if (type === "pay") {
      await renderPaymentVouchers();
    }
  } catch (error) {
    console.error("خطأ في تحميل سجل المكتب:", error);
  }
};

window.closeOfficeLedgerPanel = function () {
  const panelsWrapper = document.querySelector(".office-ledger-panels");
  if (panelsWrapper) panelsWrapper.style.display = "none";
  document.querySelectorAll(".d-panel").forEach((p) => (p.style.display = "none"));
};

async function renderPaymentVouchers() {
  const expenses = await fetchExpenseVouchers(db);
  const sorted = expenses.sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0));
  const total = computeExpensesTotal(expenses);

  const box = document.getElementById("b-total-payments");
  if (box) box.textContent = total.toLocaleString() + " ريال";

  const body = document.getElementById("r-payments-rows");
  if (body) {
    body.innerHTML = sorted.map((e) => `
      <tr>
        <td>${escapeHtml(e.date || "-")}</td>
        <td>${escapeHtml(e.to || "-")}</td>
        <td>${(Number(e.amount) || 0).toLocaleString()}</td>
        <td>${escapeHtml(e.notes || "-")}</td>
      </tr>
    `).join("") || `<tr><td colspan="4" class="office-empty">لا توجد سندات صرف بعد</td></tr>`;
  }
}

// ==================== حفظ سند صرف جديد (يُخصم فعلياً ويُرحّل للأرباح والخسائر) ====================
window.addNewPaymentVoucher = async function () {
  const dateInput = document.getElementById("new-pay-date");
  const toInput = document.getElementById("new-pay-to");
  const amountInput = document.getElementById("new-pay-amount");
  const notesInput = document.getElementById("new-pay-notes");

  const amount = Number(amountInput?.value) || 0;
  if (!toInput?.value?.trim() || amount <= 0) {
    alert("يرجى إدخال جهة الصرف والمبلغ بشكل صحيح");
    return;
  }

  try {
    await addExpenseVoucher(db, {
      date: dateInput?.value || new Date().toISOString().split("T")[0],
      to: toInput.value.trim(),
      amount,
      notes: notesInput?.value?.trim() || ""
    });

    if (toInput) toInput.value = "";
    if (amountInput) amountInput.value = "";
    if (notesInput) notesInput.value = "";

    await renderPaymentVouchers();
    await refreshDashboardSummary();
    alert("تم حفظ وترحيل سند الصرف بنجاح");
  } catch (error) {
    console.error("خطأ في حفظ سند الصرف:", error);
    alert("حدث خطأ أثناء حفظ سند الصرف");
  }
};

// ==================================================================
// ==================== لوحة التحكم الكاملة ====================
// ------------------------------------------------------------------
// تحديث كل مؤشرات لوحة التحكم المطلوبة: إيرادات اليوم/الشهر،
// إجمالي المقبوضات والمصروفات، الأرباح، الرصيد المستحق على التجار،
// وآخر عشر فواتير/سندات قبض/سندات صرف. يستخدم modules/dashboard.js
// (منطق بحت) ولا يُنشئ أي عقدة قاعدة بيانات جديدة.
// ==================================================================

async function refreshDashboardSummary() {
  try {
    const receiptsArray = (allReceipts || []).map(([id, val]) => ({ id, ...val }));
    const expensesArray = await fetchExpenseVouchers(db);

    const summary = computeDashboardSummary(allInvoices || [], receiptsArray, expensesArray);

    const setText = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    };

    setText("todayRevenue", summary.todayRevenue.toLocaleString() + " ريال");
    setText("monthRevenue", summary.monthRevenue.toLocaleString() + " ريال");
    setText("totalReceiptsBox", summary.totalReceipts.toLocaleString() + " ريال");
    setText("totalExpensesBox", summary.totalExpenses.toLocaleString() + " ريال");
    setText("totalCommissionBox", summary.totalOfficeCommission.toLocaleString() + " ريال");
    setText("netProfitBox", summary.netProfit.toLocaleString() + " ريال");
    setText("outstandingBalanceBox", summary.outstandingBalance.toLocaleString() + " ريال");

    const recentInvoicesBody = document.getElementById("recentInvoicesRows");
    if (recentInvoicesBody) {
      recentInvoicesBody.innerHTML = summary.recentInvoices.map((inv) => `
        <tr>
          <td>${escapeHtml(inv.invoiceNumber || "-")}</td>
          <td>${escapeHtml(inv.date || "-")}</td>
          <td>${escapeHtml(inv.merchant || "-")}</td>
          <td>${(Number(inv.total) || 0).toLocaleString()}</td>
        </tr>
      `).join("") || `<tr><td colspan="4" style="text-align:center;">لا توجد بيانات</td></tr>`;
    }

    const recentReceiptsBody = document.getElementById("recentReceiptsRows");
    if (recentReceiptsBody) {
      recentReceiptsBody.innerHTML = summary.recentReceipts.map((r) => `
        <tr>
          <td>${escapeHtml(r.date || "-")}</td>
          <td>${escapeHtml(r.trader || "-")}</td>
          <td>${(Number(r.amount) || 0).toLocaleString()}</td>
        </tr>
      `).join("") || `<tr><td colspan="3" style="text-align:center;">لا توجد بيانات</td></tr>`;
    }

    const recentExpensesBody = document.getElementById("recentExpensesRows");
    if (recentExpensesBody) {
      recentExpensesBody.innerHTML = summary.recentExpenses.map((e) => `
        <tr>
          <td>${escapeHtml(e.date || "-")}</td>
          <td>${escapeHtml(e.to || "-")}</td>
          <td>${(Number(e.amount) || 0).toLocaleString()}</td>
        </tr>
      `).join("") || `<tr><td colspan="3" style="text-align:center;">لا توجد بيانات</td></tr>`;
    }
  } catch (error) {
    console.error("خطأ في تحديث لوحة التحكم:", error);
  }
}

// ==================================================================
// ============ طباعة وتصدير عام لكل قوائم الكيانات ============
// ------------------------------------------------------------------
// يجعل الطباعة و PDF/PNG/Excel تعمل في كل قسم (تجار/سائقين/قواطر/
// سندات قبض) بنفس القالب الرسمي المستخدم في بقية الشاشات، بدل ترك
// هذه الأقسام بلا أي إمكانية طباعة أو تصدير كما كانت.
// ==================================================================

const ENTITY_LIST_CONFIG = {
  traders: {
    title: "قائمة التجار",
    printAreaId: "tradersPrintArea",
    bodyId: "tradersPrintBody",
    dateId: "tradersListDate",
    columns: [
      { key: "name", label: "اسم التاجر" },
      { key: "phone", label: "رقم الهاتف" }
    ],
    getRows: () => (allTraders || []).map(([id, t]) => ({ name: t.name || "-", phone: t.phone || "-" }))
  },
  drivers: {
    title: "قائمة السائقين",
    printAreaId: "driversPrintArea",
    bodyId: "driversPrintBody",
    dateId: "driversListDate",
    columns: [
      { key: "name", label: "اسم السائق" },
      { key: "phone", label: "رقم الهاتف" }
    ],
    getRows: () => (allDrivers || []).map(([id, d]) => ({ name: d.name || "-", phone: d.phone || "-" }))
  },
  trucks: {
    title: "قائمة القواطر",
    printAreaId: "trucksPrintArea",
    bodyId: "trucksPrintBody",
    dateId: "trucksListDate",
    columns: [
      { key: "number", label: "رقم اللوحة" },
      { key: "owner", label: "اسم المالك" },
      { key: "type", label: "النوع" }
    ],
    getRows: () => (allTrucks || []).map(([id, t]) => ({
      number: t.number || "-",
      owner: t.owner || "-",
      type: TRUCK_TYPE_LABELS[t.type] || t.type || "-"
    }))
  },
  receipts: {
    title: "سندات القبض",
    printAreaId: "receiptsPrintArea",
    bodyId: "receiptsPrintBody",
    dateId: "receiptsListDate",
    columns: [
      { key: "date", label: "التاريخ" },
      { key: "trader", label: "التاجر" },
      { key: "amount", label: "المبلغ" },
      { key: "notes", label: "ملاحظات" }
    ],
    getRows: () => (allReceipts || []).map(([id, r]) => ({
      date: r.date || "-",
      trader: r.trader || "-",
      amount: (Number(r.amount) || 0).toLocaleString(),
      notes: r.notes || "-"
    }))
  }
};

function renderEntityListPrintArea(type) {
  const cfg = ENTITY_LIST_CONFIG[type];
  if (!cfg) return [];
  const rows = cfg.getRows();

  const dateEl = document.getElementById(cfg.dateId);
  if (dateEl) dateEl.textContent = new Date().toLocaleDateString('ar-YE');

  const body = document.getElementById(cfg.bodyId);
  if (body) {
    body.innerHTML = rows.map((r) => `
      <tr>
        ${cfg.columns.map((c) => `<td class="item-name">${escapeHtml(String(r[c.key] ?? "-"))}</td>`).join("")}
      </tr>
    `).join("") || `<tr><td colspan="${cfg.columns.length}" class="item-name" style="text-align:center;">لا توجد بيانات</td></tr>`;
  }

  return rows;
}

window.printEntityList = function (type) {
  const cfg = ENTITY_LIST_CONFIG[type];
  if (!cfg) return;
  renderEntityListPrintArea(type);
  printAreaOrShare(cfg.printAreaId, `قائمة-${type}`, 100);
};

window.exportEntityListPDF = function (type) {
  const cfg = ENTITY_LIST_CONFIG[type];
  if (!cfg) return;
  renderEntityListPrintArea(type);
  captureAndDownload(cfg.printAreaId, cfg.title, "pdf");
};

window.exportEntityListPNG = function (type) {
  const cfg = ENTITY_LIST_CONFIG[type];
  if (!cfg) return;
  renderEntityListPrintArea(type);
  captureAndDownload(cfg.printAreaId, cfg.title, "png");
};

window.exportEntityListExcel = function (type) {
  const cfg = ENTITY_LIST_CONFIG[type];
  if (!cfg) return;
  const rows = cfg.getRows();
  exportRowsToExcel(cfg.title, cfg.title, cfg.columns, rows);
};

// ==================================================================
// ======== طباعة وتصدير لوحات النثريات/العمولات/العمال/سندات الصرف ========
// ------------------------------------------------------------------
// هذه اللوحات عناصر ظاهرة أصلاً على الشاشة (وليست مناطق طباعة مخفية)
// لذلك يتم التقاطها مباشرة عبر captureAndDownload دون preparePrintArea.
// ==================================================================

const OFFICE_PANEL_CONFIG = {
  exp: { captureId: "capture-expenses", tableSelector: "#capture-expenses table", filename: "كشف-النثريات-والمصروفات" },
  comm: { captureId: "capture-commissions", tableSelector: "#capture-commissions table", filename: "سجل-عمولات-المكتب" },
  work: { captureId: "capture-workers", tableSelector: "#capture-workers table", filename: "كشف-أجور-العمال" },
  pay: { captureId: "capture-payments", tableSelector: "#capture-payments table", filename: "سجل-سندات-الصرف" }
};

function extractTableForExcel(tableSelector) {
  const table = document.querySelector(tableSelector);
  if (!table) return { columns: [], rows: [] };

  const headerCells = Array.from(table.querySelectorAll("thead th"));
  const columns = headerCells.map((th, idx) => ({ key: `c${idx}`, label: th.textContent.trim() }));

  const bodyRows = Array.from(table.querySelectorAll("tbody tr"));
  const rows = bodyRows
    .filter((tr) => !tr.querySelector(".office-empty"))
    .map((tr) => {
      const cells = Array.from(tr.querySelectorAll("td"));
      const row = {};
      cells.forEach((td, idx) => { row[`c${idx}`] = td.textContent.trim(); });
      return row;
    });

  return { columns, rows };
}

window.printOfficePanel = function (type) {
  const cfg = OFFICE_PANEL_CONFIG[type];
  if (!cfg) return;
  const el = document.getElementById(cfg.captureId);
  if (!el) return;

  const isNativeApp = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  if (isNativeApp) {
    (async () => {
      try {
        const { pdfBlob } = await renderElementToPdfBlob(el);
        await shareOrDownloadBlob(pdfBlob, `سجل-${type}.pdf`, 'application/pdf', `سجل-${type}`);
      } catch (e) {
        console.error('تعذر إنشاء PDF للطباعة:', e);
        alert('حدث خطأ أثناء تجهيز الطباعة: ' + e.message);
      }
    })();
    return;
  }

  el.classList.add("office-print-only");
  window.print();
  setTimeout(() => el.classList.remove("office-print-only"), 500);
};

window.exportOfficePanelPDF = function (type) {
  const cfg = OFFICE_PANEL_CONFIG[type];
  if (!cfg) return;
  captureAndDownload(cfg.captureId, cfg.filename, "pdf");
};

window.exportOfficePanelPNG = function (type) {
  const cfg = OFFICE_PANEL_CONFIG[type];
  if (!cfg) return;
  captureAndDownload(cfg.captureId, cfg.filename, "png");
};

window.exportOfficePanelExcel = function (type) {
  const cfg = OFFICE_PANEL_CONFIG[type];
  if (!cfg) return;
  const { columns, rows } = extractTableForExcel(cfg.tableSelector);
  if (rows.length === 0) {
    alert("لا توجد بيانات لتصديرها");
    return;
  }
  exportRowsToExcel(cfg.filename, cfg.filename, columns, rows);
};
