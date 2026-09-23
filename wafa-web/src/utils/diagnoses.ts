/**
 * قوائم التشخيصات المعتمدة — v4.5.0
 *
 * قائمتان منفصلتان: واحدة للعلاج الطبيعي الخارجي وأخرى لتسجيل حالات المبيت.
 * كل قائمة تجمع التشخيصات الافتراضية المعتمدة مع ما يضيفه المستخدم المخوّل،
 * على نفس نمط قوائم الاحتياجات المستخدم في ملف التأهيل حتى يبقى السلوك موحّداً.
 *
 * عند اختيار "Others" تظهر خانة لكتابة التشخيص الجديد، ويُحفظ نصه مع الحالة.
 */

export const OTHER_DIAGNOSIS = 'Others';

/** تشخيصات العلاج الطبيعي الخارجي. */
export const DEFAULT_PT_DIAGNOSES = [
  'Amputation',
  'Fracture',
  'Burn',
  'Cerebral Palsy',
  'Neck Pain',
  'Back Pain',
  'Deformity',
  "Bell's Palsy",
  'Arthritis',
  'Neurological Condition',
  OTHER_DIAGNOSIS,
];

/** تشخيصات تسجيل حالات المبيت. */
export const DEFAULT_INPATIENT_DIAGNOSES = [
  'Stroke (CVA)',
  'Spinal Cord Injury (SCI)',
  'Head Injury (TBI)',
  'Bed sores',
  'MS',
  'GBS',
  'TM',
  'Coma',
  'Neck femur fracture',
  OTHER_DIAGNOSIS,
];

export const PT_DIAGNOSIS_STORAGE = 'wafaa_pt_diagnoses_custom';
export const INPATIENT_DIAGNOSIS_STORAGE = 'wafaa_inpatient_diagnoses_custom';

const readCustom = (storageKey: string): string[] => {
  try {
    const raw = JSON.parse(window.localStorage.getItem(storageKey) || '[]');
    return Array.isArray(raw) ? raw.filter((x): x is string => typeof x === 'string' && !!x.trim()) : [];
  } catch {
    return [];
  }
};

const writeCustom = (storageKey: string, list: string[]) => {
  try { window.localStorage.setItem(storageKey, JSON.stringify(list)); } catch { /* تجاهل */ }
};

/** القائمة الكاملة: الافتراضية + المضافة، مع إبقاء "Others" في الآخر دائماً. */
export function diagnosisList(storageKey: string, defaults: string[]): string[] {
  const base = defaults.filter(d => d !== OTHER_DIAGNOSIS);
  const custom = readCustom(storageKey).filter(d => !base.includes(d));
  return [...base, ...custom, OTHER_DIAGNOSIS];
}

/** إضافة تشخيص جديد. يرجع false إن كان فارغاً أو مكرراً. */
export function addDiagnosis(storageKey: string, defaults: string[], value: string): boolean {
  const name = value.trim();
  if (!name || name === OTHER_DIAGNOSIS) return false;
  const all = diagnosisList(storageKey, defaults);
  if (all.some(d => d.toLowerCase() === name.toLowerCase())) return false;
  writeCustom(storageKey, [...readCustom(storageKey), name]);
  return true;
}

/** تعديل تشخيص مضاف. التشخيصات الافتراضية المعتمدة غير قابلة للتعديل. */
export function renameDiagnosis(storageKey: string, defaults: string[], from: string, to: string): boolean {
  const next = to.trim();
  if (!next || defaults.includes(from)) return false;
  const custom = readCustom(storageKey);
  const index = custom.indexOf(from);
  if (index < 0) return false;
  custom[index] = next;
  writeCustom(storageKey, custom);
  return true;
}

/** حذف تشخيص مضاف. التشخيصات الافتراضية المعتمدة غير قابلة للحذف. */
export function removeDiagnosis(storageKey: string, defaults: string[], value: string): boolean {
  if (defaults.includes(value)) return false;
  const custom = readCustom(storageKey);
  if (!custom.includes(value)) return false;
  writeCustom(storageKey, custom.filter(d => d !== value));
  return true;
}

/** هل هذا التشخيص مضاف من المستخدم (أي قابل للتعديل والحذف)؟ */
export const isCustomDiagnosis = (defaults: string[], value: string) => !defaults.includes(value);
