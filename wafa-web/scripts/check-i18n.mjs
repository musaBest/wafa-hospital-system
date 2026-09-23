#!/usr/bin/env node
/**
 * فاحص تغطية الترجمة — v4.3.91
 * يمر على كل ملفات الواجهات ويستخرج النصوص العربية، ثم يقارنها بقاموس i18n.
 * أي نص غير مترجم يُطبع هنا مع الملف الذي يحتويه، حتى لا تتكرر مشكلة تداخل اللغات.
 *
 * التشغيل:  npm run check:i18n
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const SRC = new URL('../src', import.meta.url).pathname;
const ARABIC = /[\u0600-\u06FF]/;
const IGNORE_SHORT = 3; // حروف مفردة تستخدم كأحرف أولى أو فواصل

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(tsx|ts)$/.test(entry)) out.push(full);
  }
  return out;
}

// قوالب المستندات المطبوعة (PDF/Word/Excel) تبقى بالعربية عمداً:
// هذه وثائق رسمية تصدر عن المستشفى ولا تُترجم مع تغيير لغة الواجهة.
const PRINTED_DOCS = /(Export|Pdf|printDocument|documentDownload)\.ts$/i;

const files = walk(SRC);
const dictSource = files.filter(f => /i18n/.test(f)).map(f => readFileSync(f, 'utf8')).join('\n');

const covered = new Set();
// المفاتيح: 'نص عربي': 'English'  أو  'نص عربي': "English"
for (const m of dictSource.matchAll(/'([^'\n]+)'\s*:\s*(?:'[^'\n]*'|"[^"\n]*")/g)) {
  if (ARABIC.test(m[1])) covered.add(m[1].trim());
}
// القيم العربية داخل خريطة ar
for (const m of dictSource.matchAll(/:\s*'([^'\n]*)'/g)) {
  if (ARABIC.test(m[1])) covered.add(m[1].trim());
}

const missing = new Map();
for (const file of files) {
  if (/i18n/.test(file) || PRINTED_DOCS.test(file)) continue;
  const src = readFileSync(file, 'utf8');
  // v4.3.95 — تُفحص أيضاً الشظايا النصية الملاصقة لإقحام {} داخل JSX،
  // لأن React يجعل كل شظية عقدة نص مستقلة تحتاج ترجمة منفصلة.
  const patterns = [
    /'([^'\n]*)'|"([^"\n]*)"|>([^<>{}\n]+)</g,
    />([^<>{}\n]*[\u0600-\u06FF][^<>{}\n]*)\{/g,
    /\}([^<>{}\n]*[\u0600-\u06FF][^<>{}\n]*)</g,
  ];
  for (const m of patterns.flatMap(p => [...src.matchAll(p)])) {
    const text = (m[1] ?? m[2] ?? m[3] ?? '').trim();
    if (!text || !ARABIC.test(text)) continue;
    if (text.length <= IGNORE_SHORT && !text.includes(' ')) continue; // حرف مفرد
    if (text.includes('${')) continue;                                 // قالب برمجي وليس نصاً
    // شظايا من داخل القوالب النصية (`...${...}`) أو من كود لا من واجهة
    if (/[$`;()]|=>|\.includes\(/.test(text)) continue;
    if (covered.has(text)) continue;
    if (!missing.has(text)) missing.set(text, new Set());
    missing.get(text).add(relative(SRC, file));
  }
}

const total = covered.size + missing.size;
const pct = total ? ((covered.size / total) * 100).toFixed(1) : '100.0';

if (missing.size === 0) {
  console.log(`\n✅ تغطية الترجمة كاملة (${covered.size} نصاً).\n`);
  process.exit(0);
}

console.log(`\n⚠️  ${missing.size} نصاً غير مترجم (التغطية ${pct}%):\n`);
for (const [text, where] of missing) {
  console.log(`  • ${text}\n      ${[...where].join(', ')}`);
}
console.log(`\nأضف الترجمات إلى staticEnglishPhrases في src/i18n.tsx ثم أعد التشغيل.\n`);
process.exit(1);
