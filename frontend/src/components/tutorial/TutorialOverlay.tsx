/** Tutorial Overlay — renders Spotlight + Tooltip for the active step (MBT-167/168).
 *
 * Listens to action events (click, navigate, submit, tab_switch) per step
 * and auto-advances when the step's action is observed.
 */

import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { useTutorialOptional } from "../../context/TutorialContext";
import { TUTORIAL_STEPS, type TutorialStep } from "./tutorialSteps";

const PADDING = 6;

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

function findTarget(selector: string | null): HTMLElement | null {
  if (!selector) return null;
  return document.querySelector<HTMLElement>(selector);
}

function getRect(el: HTMLElement): Rect {
  const r = el.getBoundingClientRect();
  return {
    x: r.left - PADDING,
    y: r.top - PADDING,
    width: r.width + PADDING * 2,
    height: r.height + PADDING * 2,
  };
}

interface TooltipProps {
  step: TutorialStep;
  index: number;
  total: number;
  rect: Rect | null;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
}

function Tooltip({ step, index, total, rect, onNext, onPrev, onSkip }: TooltipProps) {
  const { t } = useTranslation("tutorial");

  // Position tooltip below target, or centered if no target
  const style: React.CSSProperties = rect
    ? {
        position: "fixed",
        top: Math.min(rect.y + rect.height + 12, window.innerHeight - 200),
        left: Math.max(16, Math.min(rect.x, window.innerWidth - 320)),
        maxWidth: 320,
        zIndex: 1001,
      }
    : {
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        maxWidth: 360,
        zIndex: 1001,
      };

  const isFirst = index === 0;
  const isLast = index === total - 1;

  return (
    <div
      style={style}
      className="bg-surface0 border border-mauve/30 rounded-[12px] shadow-2xl p-4 w-[calc(100vw-32px)] sm:w-[320px]"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-headline text-sm font-semibold text-text">
          {t(step.titleKey)}
        </h3>
        <button
          type="button"
          onClick={onSkip}
          aria-label={t("skip")}
          className="min-h-[28px] min-w-[28px] flex items-center justify-center text-subtext0 hover:text-text"
        >
          <X size={16} />
        </button>
      </div>
      <p className="font-body text-xs text-subtext0 leading-relaxed mb-3">
        {t(step.descriptionKey)}
      </p>
      <div className="flex items-center justify-between">
        <span className="font-body text-[10px] text-subtext0">
          {index + 1} / {total}
        </span>
        <div className="flex items-center gap-2">
          {!isFirst && (
            <button
              type="button"
              onClick={onPrev}
              className="min-h-[36px] px-3 rounded-[6px] bg-surface1 hover:bg-surface2 font-label text-xs text-text flex items-center gap-1"
            >
              <ArrowLeft size={14} /> {t("prev")}
            </button>
          )}
          <button
            type="button"
            onClick={onNext}
            className="min-h-[36px] px-3 rounded-[6px] bg-mauve text-white font-label text-xs flex items-center gap-1"
          >
            {isLast ? t("done") : t("next")} <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

function Spotlight({ rect }: { rect: Rect | null }) {
  if (!rect) {
    return (
      <div
        className="fixed inset-0 bg-crust/70"
        style={{ zIndex: 1000, pointerEvents: "none" }}
      />
    );
  }

  // Build a path that covers the whole viewport with the rect cut out
  const r = rect;
  const path = `M0,0 L${window.innerWidth},0 L${window.innerWidth},${window.innerHeight} L0,${window.innerHeight} Z M${r.x},${r.y} L${r.x + r.width},${r.y} L${r.x + r.width},${r.y + r.height} L${r.x},${r.y + r.height} Z`;

  return (
    <svg
      className="fixed inset-0"
      style={{ zIndex: 1000, pointerEvents: "none" }}
      width={window.innerWidth}
      height={window.innerHeight}
    >
      <path
        d={path}
        fill="rgba(17, 17, 27, 0.7)"
        fillRule="evenodd"
      />
      <rect
        x={r.x}
        y={r.y}
        width={r.width}
        height={r.height}
        fill="none"
        stroke="var(--color-mauve)"
        strokeWidth={2}
        rx={8}
      />
    </svg>
  );
}

export function TutorialOverlay() {
  const tut = useTutorialOptional();
  const location = useLocation();
  const [rect, setRect] = useState<Rect | null>(null);
  const lastLocationRef = useRef<string>(location.pathname + location.search);

  const step = tut?.active ? TUTORIAL_STEPS[tut.step] : null;

  // Recompute target rect on step change, scroll, resize and DOM mutations
  useEffect(() => {
    if (!step) {
      setRect(null);
      return;
    }
    if (!step.targetSelector) {
      setRect(null);
      return;
    }
    const measure = () => {
      const el = findTarget(step.targetSelector!);
      if (el) {
        el.scrollIntoView({ block: "center", behavior: "smooth" });
        // Wait for scrollIntoView before measuring
        requestAnimationFrame(() => {
          const target = findTarget(step.targetSelector!);
          if (target) setRect(getRect(target));
          else setRect(null);
        });
      } else {
        setRect(null);
      }
    };
    measure();
    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [step]);

  // Action detection (MBT-168)
  useEffect(() => {
    if (!tut?.active || !step) return;

    const advance = () => tut.next();

    if (step.action?.type === "click" && step.action.selector) {
      const handler = (e: MouseEvent) => {
        const target = e.target as HTMLElement | null;
        if (!target) return;
        if (target.closest(step.action!.selector!)) {
          // small delay so the click finishes its own work
          setTimeout(advance, 350);
        }
      };
      document.addEventListener("click", handler, true);
      return () => document.removeEventListener("click", handler, true);
    }

    if (step.action?.type === "navigate" && step.action.route) {
      const current = location.pathname + location.search;
      if (current !== lastLocationRef.current) {
        lastLocationRef.current = current;
        if (current.startsWith(step.action.route)) {
          setTimeout(advance, 200);
        }
      }
    }

    if (step.action?.type === "url_param" && step.action.param) {
      const sp = new URLSearchParams(location.search);
      if (sp.has(step.action.param)) {
        setTimeout(advance, 200);
      }
    }
  }, [tut, step, location]);

  if (!tut?.active || !step) return null;

  return (
    <>
      <Spotlight rect={rect} />
      <Tooltip
        step={step}
        index={tut.step}
        total={TUTORIAL_STEPS.length}
        rect={rect}
        onNext={tut.next}
        onPrev={tut.prev}
        onSkip={tut.skip}
      />
    </>
  );
}
