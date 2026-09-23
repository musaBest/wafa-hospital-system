/**
 * ترويسة التقارير الموحّدة — v4.5.0
 *
 * قبل هذا الملف كان كل ملف تصدير يكتب ترويسته بنفسه، فظهر الشعار في 4 وحدات
 * فقط من أصل 11، واختلفت الترويسة بين تقرير وآخر.
 * الآن مصدر واحد: أي تقرير يستدعي reportHeader يحصل على الشعار ونفس الشكل،
 * وأي تعديل لاحق على الهوية يسري على كل التقارير دفعة واحدة.
 */

export const logoUrl = () => `${window.location.origin}/wafaa-hospital-logo.png`;

export const reportHeadStyles = `
  .wf-head{display:flex;align-items:center;justify-content:space-between;gap:18px;
    padding-bottom:10px;margin-bottom:14px;border-bottom:2px solid #0068a9}
  .wf-head-name{text-align:right;line-height:1.4}
  .wf-head-name b{display:block;font-size:17px;font-weight:800;color:#0b3b57}
  .wf-head-name span{display:block;font-size:10.5px;color:#5b7183}
  .wf-head-logo{width:84px;height:66px;object-fit:contain;flex:none}
  .wf-head-meta{font-size:10.5px;color:#5b7183;text-align:left;line-height:1.6}
  .wf-title{margin:0 0 12px;text-align:center;font-size:15px;font-weight:800;color:#0b3b57}
  .wf-foot{margin-top:16px;padding-top:10px;border-top:1px solid #cbd5e1;
    display:flex;justify-content:space-between;font-size:10px;color:#64748b}
`;

export interface ReportHeadOptions {
  /** عنوان التقرير الظاهر تحت الترويسة */
  title?: string;
  /** سطر معلومات إضافي (الفترة، القسم، التاريخ...) */
  meta?: string;
}

export function reportHeader({ title, meta }: ReportHeadOptions = {}) {
  const stamp = new Date().toLocaleString('ar-EG', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  });
  return `
  <header class="wf-head">
    <div class="wf-head-name">
      <b>مستشفى الوفاء</b>
      <span>للتأهيل الطبي والجراحة التخصصية</span>
    </div>
    <div class="wf-head-meta">${meta ? `${meta}<br/>` : ''}${stamp}</div>
    <img class="wf-head-logo" src="${logoUrl()}" alt="Wafaa Hospital" />
  </header>
  ${title ? `<h1 class="wf-title">${title}</h1>` : ''}`;
}

export function reportFooter(note = '') {
  return `<footer class="wf-foot"><span>${note}</span><span>نظام معلومات مستشفى الوفاء</span></footer>`;
}
