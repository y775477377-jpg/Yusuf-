// ==================================================================
// modules/exportUtils.js
// ------------------------------------------------------------------
// أدوات تصدير عامة قابلة لإعادة الاستخدام في أي شاشة بالنظام.
//
// ملاحظة مهمة: الطباعة وتصدير PDF/PNG موجودة أصلاً وتعمل جيداً في
// main.js (الدوال preparePrintArea / hidePrintArea / captureAndDownload)
// لذلك لم يُعَد بناؤها هنا حتى لا نكرر نفس المنطق - سيتم لاحقاً في
// مرحلة تالية نقلها لهذا الملف تدريجياً دون كسر أي شيء يعمل حالياً.
//
// هذا الملف يضيف فقط ميزة كانت غير موجودة إطلاقاً: تصدير Excel.
// يعتمد على مكتبة SheetJS (XLSX) المُضافة في index.html.
// ==================================================================

/**
 * تصدير مصفوفة صفوف (rows) إلى ملف Excel.
 * columns: [{ key: 'name', label: 'الاسم' }, ...]
 * rows: [{ name: 'أحمد', ... }, ...]
 */
export function exportRowsToExcel(filename, sheetName, columns, rows) {
  if (!window.XLSX) {
    alert("مكتبة تصدير Excel غير محمّلة. تأكد من وجود اتصال بالإنترنت.");
    return;
  }

  const header = columns.map((c) => c.label);
  const keys = columns.map((c) => c.key);
  const data = [header, ...rows.map((r) => keys.map((k) => (r[k] !== undefined && r[k] !== null ? r[k] : "")))];

  const worksheet = window.XLSX.utils.aoa_to_sheet(data);

  // عرض أعمدة تلقائي بسيط بحسب أطول قيمة في كل عمود
  worksheet["!cols"] = keys.map((k, idx) => {
    const maxLen = Math.max(
      header[idx]?.toString().length || 10,
      ...rows.map((r) => (r[k] !== undefined && r[k] !== null ? r[k].toString().length : 0))
    );
    return { wch: Math.min(Math.max(maxLen + 2, 10), 40) };
  });

  const workbook = window.XLSX.utils.book_new();
  window.XLSX.utils.book_append_sheet(workbook, worksheet, sheetName || "Sheet1");
  window.XLSX.writeFile(workbook, `${filename}.xlsx`);
}
