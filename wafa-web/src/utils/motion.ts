/**
 * v4.3.86 — تشغيل الحركة التفاعلية.
 * مهمتان فقط: أثر لمس فوري على العناصر القابلة للنقر، وشريط تقدّم للتمرير.
 * كل شيء آخر يبقى CSS خالص حتى لا تتأثر سرعة الصفحات أو التصدير.
 */

const RIPPLE_TARGETS = '.btn, .icon-btn, .dock-item, .chip, .sidebar-fab, .cmdk-item, .modal-close, .dock-toggle';
const EXPORT_SCOPES = '[data-export-root], .legacy-export-panel, .print-only, .pdf-export-root';
const RIPPLE_LIFE = 560;

const reduced = () =>
  typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;


/* ---- عدّاد الأرقام: يعدّ من الصفر إلى القيمة عند أول ظهور ---- */
const COUNT_MS = 750;

function animateNumber(node: HTMLElement) {
  const finalText = (node.textContent || '').trim();
  if (!finalText || node.dataset.wxCount === 'done') return;
  const numeric = finalText.replace(/[,\s]/g, '');
  if (!/^\d{1,9}$/.test(numeric)) { node.dataset.wxCount = 'done'; return; }
  const target = Number(numeric);
  if (!Number.isFinite(target) || target < 2) { node.dataset.wxCount = 'done'; return; }

  node.dataset.wxCount = 'done';
  const grouped = finalText.includes(',');
  const start = performance.now();

  const tick = (now: number) => {
    const progress = Math.min(1, (now - start) / COUNT_MS);
    const eased = 1 - Math.pow(1 - progress, 3);
    const value = Math.round(target * eased);
    node.textContent = grouped ? value.toLocaleString('en-US') : String(value);
    if (progress < 1) window.requestAnimationFrame(tick);
    else node.textContent = finalText;
  };

  node.textContent = grouped ? '0' : '0';
  window.requestAnimationFrame(tick);
}

function watchNumbers(): () => void {
  if (reduced()) return () => {};
  const scan = () => {
    document.querySelectorAll<HTMLElement>('.stat-num:not([data-wx-count])').forEach(animateNumber);
  };
  scan();
  const observer = new MutationObserver(() => window.requestAnimationFrame(scan));
  observer.observe(document.body, { childList: true, subtree: true });
  return () => observer.disconnect();
}

/* ---- شاشة الدخول: حركة خفيفة تتبع المؤشر ---- */
function watchLoginParallax(): () => void {
  if (reduced()) return () => {};
  let frame = 0;
  const onMove = (event: PointerEvent) => {
    const page = document.querySelector<HTMLElement>('.lx-login, .login-page');
    if (!page) return;
    if (frame) return;
    frame = window.requestAnimationFrame(() => {
      frame = 0;
      const x = (event.clientX / window.innerWidth - 0.5) * 2;
      const y = (event.clientY / window.innerHeight - 0.5) * 2;
      page.style.setProperty('--wx-mx', x.toFixed(3));
      page.style.setProperty('--wx-my', y.toFixed(3));
    });
  };
  window.addEventListener('pointermove', onMove, { passive: true });
  return () => {
    if (frame) window.cancelAnimationFrame(frame);
    window.removeEventListener('pointermove', onMove);
  };
}

export function initMotionRuntime(): () => void {
  if (typeof document === 'undefined') return () => {};

  const root = document.documentElement;
  let frame = 0;

  const readScroll = () => {
    frame = 0;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = max > 24 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    root.style.setProperty('--wx-scroll', `${(ratio * 100).toFixed(2)}%`);
    root.classList.toggle('wx-scrolled', window.scrollY > 8);
  };

  const onScroll = () => {
    if (frame) return;
    frame = window.requestAnimationFrame(readScroll);
  };

  const onPointerDown = (event: PointerEvent) => {
    if (reduced() || event.button !== 0) return;
    const origin = event.target as HTMLElement | null;
    const target = origin?.closest?.(RIPPLE_TARGETS) as HTMLElement | null;
    if (!target || target.hasAttribute('data-no-ripple') || target.closest(EXPORT_SCOPES)) return;
    if (target.getAttribute('aria-disabled') === 'true' || (target as HTMLButtonElement).disabled) return;

    const rect = target.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const size = Math.max(rect.width, rect.height) * 1.8;
    const ripple = document.createElement('span');
    ripple.className = 'wx-ripple';
    ripple.style.width = `${size}px`;
    ripple.style.height = `${size}px`;
    ripple.style.insetInlineStart = 'auto';
    ripple.style.left = `${event.clientX - rect.left - size / 2}px`;
    ripple.style.top = `${event.clientY - rect.top - size / 2}px`;

    if (window.getComputedStyle(target).position === 'static') target.style.position = 'relative';
    target.appendChild(ripple);
    window.setTimeout(() => ripple.remove(), RIPPLE_LIFE);
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  document.addEventListener('pointerdown', onPointerDown, true);
  readScroll();
  const stopNumbers = watchNumbers();
  const stopParallax = watchLoginParallax();

  return () => {
    stopNumbers();
    stopParallax();
    if (frame) window.cancelAnimationFrame(frame);
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onScroll);
    document.removeEventListener('pointerdown', onPointerDown, true);
    root.style.removeProperty('--wx-scroll');
    root.classList.remove('wx-scrolled');
  };
}
