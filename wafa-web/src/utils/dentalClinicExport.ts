import type { DentalVisitResource } from '../services/hospitalApi.service';
import { downloadXlsx } from './exportXlsx';

const money = (value:number) => Number.isFinite(value) ? Math.round(value * 100) / 100 : 0;

export function exportDentalClinicXlsx(rows:DentalVisitResource[], from:string, to:string, rtl=true) {
  const headers = [
    'الفترة',
    'التاريخ',
    'رقم الدور',
    'اسم الطبيب',
    'اسم المريض',
    'رقم الملف',
    'رقم الهوية',
    'الجوال',
    'نوع الخدمة',
    'الإجمالي',
    'المدفوع',
    'المتبقي',
    'الحالة',
    'ملاحظات',
  ];
  const period = `${from || 'كل التواريخ'} → ${to || 'كل التواريخ'}`;
  const body = rows.map(row => [
    period,
    row.visitDate || '',
    row.queueNumber || '',
    row.doctor?.name || '',
    row.patient?.fullName || '',
    row.patient?.medicalSerial || '',
    row.patient?.idNumber || '',
    row.patient?.phone || '',
    row.serviceLabel || row.serviceName,
    money(row.totalAmount),
    money(row.paidAmount),
    money(row.remainingAmount),
    row.status === 'cancelled' ? 'ملغي' : row.status === 'completed' ? 'مكتمل' : 'نشط',
    row.notes || '',
  ]);
  const filename = `dental-clinic-${from || 'all'}-${to || 'all'}.xlsx`;
  return downloadXlsx(filename, headers, body as (string|number)[][], rtl);
}
