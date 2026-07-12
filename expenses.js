// ==================================================================
// modules/expenses.js
// ------------------------------------------------------------------
// وحدة سندات الصرف (المصروفات) — تُفعّل هذا الملف الذي كان فارغاً.
// تحتوي على طبقة الوصول للبيانات (Firebase) ومنطق الحساب الخاص
// بسندات الصرف، بمعزل عن واجهة main.js، بحيث:
//   1) كل سند صرف جديد يُسجَّل في العقدة "office_expenses" الموجودة
//      أصلاً في قاعدة البيانات (لم تُنشأ عقدة جديدة).
//   2) يمكن حساب إجمالي المصروفات ضمن أي نطاق تاريخ.
//   3) يمكن حساب الأرباح والخسائر: الإيرادات (الفواتير) - المصروفات.
// ==================================================================

import {
  ref,
  push,
  set,
  get,
  remove,
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-database.js";

/**
 * إضافة سند صرف جديد إلى قاعدة البيانات (office_expenses).
 * db: كائن قاعدة البيانات المستورد من firebase-config.js
 * voucher: { date, to, amount, notes }
 */
export async function addExpenseVoucher(db, voucher) {
  const data = {
    date: voucher.date || new Date().toISOString().split("T")[0],
    to: voucher.to || "",
    amount: Number(voucher.amount) || 0,
    notes: voucher.notes || "",
    createdAt: Date.now(),
  };
  const newRef = push(ref(db, "office_expenses"));
  await set(newRef, data);
  return { id: newRef.key, ...data };
}

/**
 * حذف سند صرف.
 */
export async function deleteExpenseVoucher(db, id) {
  await remove(ref(db, `office_expenses/${id}`));
}

/**
 * جلب كل سندات الصرف كمصفوفة { id, ...data }.
 */
export async function fetchExpenseVouchers(db) {
  const snap = await get(ref(db, "office_expenses"));
  const data = snap.val() || {};
  return Object.entries(data).map(([id, val]) => ({ id, ...val }));
}

function expenseTime(e) {
  return Number(e.createdAt) || (e.date ? new Date(e.date + "T00:00:00").getTime() : 0);
}

/**
 * تصفية سندات الصرف ضمن نطاق تاريخ (from/to) مرتبة زمنياً.
 */
export function filterExpensesByRange(expenses, range) {
  const { from, to } = range;
  return expenses
    .filter((e) => {
      const t = expenseTime(e);
      return t >= from && t <= to;
    })
    .sort((a, b) => expenseTime(a) - expenseTime(b));
}

/**
 * إجمالي مبلغ سندات الصرف.
 */
export function computeExpensesTotal(expenses) {
  return expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
}

/**
 * حساب الأرباح والخسائر لفترة معيّنة:
 * الأرباح = إجمالي إيرادات الفواتير - إجمالي سندات الصرف (المصروفات).
 */
export function computeProfitAndLoss(invoices, expenses) {
  const totalRevenue = invoices.reduce((s, i) => s + (Number(i.total) || 0), 0);
  const totalExpenses = computeExpensesTotal(expenses);
  return {
    totalRevenue,
    totalExpenses,
    netProfit: totalRevenue - totalExpenses,
  };
}
