import { useEffect, useState } from "react";

/**
 * v4.3.86 — شاشة الإقلاع (Boot sequence)
 * تسلسل حركي واحد منظم: مسح الشعار، خط مؤشرات حيوية، ثم خطوات تهيئة النظام.
 * التوقيت مبني على خطوات فعلية حتى تبدو الحركة سبباً لا زينة.
 */

const STEPS = [
  { ar: "التحقق من الجلسة", en: "Verifying session" },
  { ar: "ربط أقسام المستشفى", en: "Linking hospital units" },
  { ar: "مزامنة الصلاحيات", en: "Syncing permissions" },
  { ar: "تجهيز مساحة العمل", en: "Preparing workspace" },
];

const TRACE = "M0 34 H126 l12 -22 l13 40 l11 -30 l10 12 H210 l14 -26 l12 44 l10 -30 l9 12 H420";

const STEP_MS = 340;
const HOLD_MS = 420;
const EXIT_MS = 620;

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function SplashScreen() {
  const [step, setStep] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [visible, setVisible] = useState(true);
  const isEnglish =
    typeof document !== "undefined" &&
    (document.documentElement.lang || "ar").toLowerCase().startsWith("en");

  useEffect(() => {
    const reduced = prefersReducedMotion();
    const stepMs = reduced ? 90 : STEP_MS;
    const holdMs = reduced ? 120 : HOLD_MS;
    const exitMs = reduced ? 180 : EXIT_MS;
    const timers: number[] = [];

    STEPS.forEach((_, index) => {
      timers.push(window.setTimeout(() => setStep(index + 1), stepMs * (index + 1)));
    });

    const total = stepMs * STEPS.length + holdMs;
    timers.push(window.setTimeout(() => setLeaving(true), total));
    timers.push(
      window.setTimeout(() => {
        setVisible(false);
        document.body.classList.add("wx-booted");
      }, total + exitMs),
    );

    document.body.classList.add("wx-booting");
    return () => {
      timers.forEach(window.clearTimeout);
      document.body.classList.remove("wx-booting");
    };
  }, []);

  if (!visible) return null;

  const progress = Math.round((step / STEPS.length) * 100);

  return (
    <div
      className={`wx-boot ${leaving ? "is-leaving" : ""}`}
      role="status"
      aria-live="polite"
      aria-label={isEnglish ? "Loading Wafaa Hospital system" : "جاري تحميل نظام مستشفى الوفاء"}
    >
      <div className="wx-boot-grid" aria-hidden="true" />
      <div className="wx-boot-glow wx-boot-glow-a" aria-hidden="true" />
      <div className="wx-boot-glow wx-boot-glow-b" aria-hidden="true" />

      <div className="wx-boot-stage">
        <div className="wx-boot-mark">
          <span className="wx-boot-ring" aria-hidden="true" />
          <span className="wx-boot-ring wx-boot-ring-2" aria-hidden="true" />
          <div className="wx-boot-plate">
            <img src="/wafaa-hospital-logo.png" alt="شعار مستشفى الوفاء - Wafaa Hospital" />
            <span className="wx-boot-scan" aria-hidden="true" />
          </div>
        </div>

        <h1 className="wx-boot-title">مستشفى الوفاء</h1>
        <p className="wx-boot-sub">نظام المعلومات الطبي · التأهيل والجراحة التخصصية</p>

        <svg className="wx-boot-trace" viewBox="0 0 420 60" preserveAspectRatio="none" aria-hidden="true">
          <path className="wx-trace-base" d={TRACE} />
          <path className="wx-trace-live" d={TRACE} />
        </svg>

        <ol className="wx-boot-steps">
          {STEPS.map((item, index) => (
            <li
              key={item.en}
              className={index < step ? "is-done" : index === step ? "is-active" : ""}
            >
              <i aria-hidden="true" />
              <span>{isEnglish ? item.en : item.ar}</span>
            </li>
          ))}
        </ol>

        <div className="wx-boot-meter" aria-hidden="true">
          <i style={{ width: `${progress}%` }} />
        </div>
      </div>
    </div>
  );
}
