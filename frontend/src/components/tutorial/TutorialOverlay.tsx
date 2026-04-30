/** Tutorial Overlay — Spotlight + Tooltip + Action Detection (Round 7).
 *
 * Round 7 (X-Confirm + Pause + Action-Prompt + Scroll-Once + Burger-AutoClose):
 * - X-Click oeffnet ConfirmCloseModal: "Tutorial abbrechen" / "Hier umsehen"
 * - "Hier umsehen" → tut.setPaused(true) → Pause-Banner unten
 * - Off-Path und manuelle Pause teilen sich das gleiche Banner-UI
 * - actionPromptKey: zentriert mauve fett unter description
 * - pauseOnTargetClick: Klick auf Spotlight-Target pausiert statt advance
 * - scrollIntoView nur EINMAL pro Step (verhindert Add-Child-Scroll-Loop)
 * - Auto-Close des Mobile-Burgers wenn neuer Step kein openMobileMenu erwartet
 *
 * Round 6 (Off-Path-Pause):
 * - expectedPath pro Step. Wenn current path nicht matcht: Pause-Banner.
 *
 * Round 5:
 * - Welcome step: kein Spotlight, nur blurred Backdrop
 * - "Weiter"-Button bei action.navigate führt programmatic navigate aus
 * - "Weiter"-Button disabled, wenn User-Aktion erforderlich (action.click/event)
 * - nextButtonKey override (z.B. "Gehe zu Kinder" statt "Weiter")
 */

import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ArrowRight, Play, RotateCcw, X } from "lucide-react";
import { useTutorialOptional } from "../../context/TutorialContext";
import type { TutorialStep } from "./tutorialSteps";

/** Prueft, ob der aktuelle Pathname zum erwarteten Pfad eines Steps passt. */
function isOnExpectedPath(current: string, expected: string): boolean {
  if (expected === "/") return current === "/";
  return current === expected || current.startsWith(expected + "/");
}

const PADDING = 8;
const TOOLTIP_W = 320;
const TOOLTIP_GAP = 12;

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
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

function HighlightBorder({ rect }: { rect: Rect }) {
  return (
    <div
      style={{
        position: "fixed",
        top: rect.y,
        left: rect.x,
        width: rect.width,
        height: rect.height,
        borderRadius: 10,
        boxShadow:
          "0 0 0 2px var(--color-mauve), 0 0 24px 4px rgba(203, 166, 247, 0.45)",
        pointerEvents: "none",
        zIndex: 1001,
      }}
    />
  );
}

function FullBackdrop() {
  return (
    <div
      style={{ zIndex: 1000, pointerEvents: "auto" }}
      className="fixed inset-0 bg-crust/70 backdrop-blur-sm"
    />
  );
}

function CutoutBackdrop({ rect }: { rect: Rect }) {
  const ww = window.innerWidth;
  const wh = window.innerHeight;
  const dim = "rgba(17, 17, 27, 0.72)";
  const common: React.CSSProperties = {
    position: "fixed",
    background: dim,
    zIndex: 1000,
    pointerEvents: "auto",
  };
  return (
    <>
      <div style={{ ...common, top: 0, left: 0, width: ww, height: Math.max(0, rect.y) }} />
      <div
        style={{
          ...common,
          top: rect.y + rect.height,
          left: 0,
          width: ww,
          height: Math.max(0, wh - (rect.y + rect.height)),
        }}
      />
      <div
        style={{
          ...common,
          top: Math.max(0, rect.y),
          left: 0,
          width: Math.max(0, rect.x),
          height: Math.max(0, rect.height),
        }}
      />
      <div
        style={{
          ...common,
          top: Math.max(0, rect.y),
          left: rect.x + rect.width,
          width: Math.max(0, ww - (rect.x + rect.width)),
          height: Math.max(0, rect.height),
        }}
      />
    </>
  );
}

interface TooltipProps {
  step: TutorialStep;
  index: number;
  total: number;
  rect: Rect | null;
  isFirstStep: boolean;
  dontShowAgain: boolean;
  nextDisabled: boolean;
  nextLabel: string;
  onToggleDontShow: (v: boolean) => void;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
  onReset: () => void;
  onDismissForever: () => void;
}

function Tooltip({
  step,
  index,
  total,
  rect,
  isFirstStep,
  dontShowAgain,
  nextDisabled,
  nextLabel,
  onToggleDontShow,
  onNext,
  onPrev,
  onClose,
  onReset,
  onDismissForever,
}: TooltipProps) {
  const { t } = useTranslation("tutorial");

  let style: React.CSSProperties;
  if (rect) {
    const w = Math.min(TOOLTIP_W, window.innerWidth - 32);
    const spaceBelow = window.innerHeight - (rect.y + rect.height) - 16;
    const spaceAbove = rect.y - 16;
    const placeAbove = spaceBelow < 200 && spaceAbove > spaceBelow;
    const top = placeAbove
      ? Math.max(16, rect.y - 220)
      : Math.min(rect.y + rect.height + TOOLTIP_GAP, window.innerHeight - 240);
    const left = Math.max(
      16,
      Math.min(rect.x + rect.width / 2 - w / 2, window.innerWidth - w - 16),
    );
    style = { position: "fixed", top, left, width: w, zIndex: 1002 };
  } else {
    style = {
      position: "fixed",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      width: Math.min(380, window.innerWidth - 32),
      zIndex: 1002,
    };
  }

  // Final-Step (success): Spezial-UI mit Checkbox + 2 Buttons
  if (step.isFinal) {
    return (
      <div
        style={style}
        className="bg-surface0 border border-mauve/30 rounded-[12px] shadow-2xl p-5"
      >
        <div className="flex items-start justify-between gap-2 mb-3">
          <h3 className="font-headline text-base font-semibold text-text">
            {t(step.titleKey)}
          </h3>
        </div>
        <p className="font-body text-sm text-text leading-relaxed mb-4 whitespace-pre-line">
          {t(step.descriptionKey)}
        </p>
        <label className="flex items-center gap-2 mb-4 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={dontShowAgain}
            onChange={(e) => onToggleDontShow(e.target.checked)}
            className="h-4 w-4 accent-mauve"
          />
          <span className="font-body text-xs text-text">
            {t("dont_show_again")}
          </span>
        </label>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onReset}
            className="min-h-[40px] px-4 rounded-[6px] bg-surface1 hover:bg-surface2 font-label text-xs text-text flex items-center justify-center gap-2"
          >
            <RotateCcw size={14} /> {t("restart")}
          </button>
          <button
            type="button"
            onClick={onNext}
            className="min-h-[40px] px-4 rounded-[6px] bg-mauve text-white font-label text-xs flex items-center justify-center gap-2"
          >
            {t("end_tutorial")}
          </button>
        </div>
      </div>
    );
  }

  // Standard Tooltip
  return (
    <div
      style={style}
      className="bg-surface0 border border-mauve/30 rounded-[12px] shadow-2xl p-4"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-headline text-sm font-semibold text-text">
          {t(step.titleKey)}
        </h3>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("skip")}
          className="min-h-[28px] min-w-[28px] flex items-center justify-center text-subtext0 hover:text-text"
        >
          <X size={16} />
        </button>
      </div>
      <p className="font-body text-xs text-subtext0 leading-relaxed mb-3 whitespace-pre-line">
        {t(step.descriptionKey)}
      </p>

      {/* Aufforderung an den Nutzer — zentriert, mauve, fett */}
      {step.actionPromptKey && (
        <p className="font-body text-sm text-mauve font-semibold text-center mb-3 whitespace-pre-line">
          {t(step.actionPromptKey)}
        </p>
      )}

      <div className="flex items-center justify-between">
        <span className="font-body text-[10px] text-subtext0">
          {index + 1} / {total}
        </span>
        <div className="flex items-center gap-2">
          {!isFirstStep && (
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
            disabled={nextDisabled}
            className="min-h-[36px] px-3 rounded-[6px] bg-mauve text-white font-label text-xs flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {nextLabel} <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {isFirstStep && (
        <div className="mt-3 pt-3 border-t border-surface1">
          <button
            type="button"
            onClick={onDismissForever}
            className="w-full min-h-[36px] px-3 rounded-[6px] bg-transparent hover:bg-surface1 font-label text-[11px] text-subtext0 hover:text-text underline underline-offset-2"
          >
            {t("skip_permanent")}
          </button>
        </div>
      )}
    </div>
  );
}

interface PauseBannerProps {
  stepTitle: string;
  index: number;
  total: number;
  onResume: () => void;
  onClose: () => void;
}

/** Pause-Banner: kompakte Pille unten, fuer Off-Path und manuelle Pause. */
function PauseBanner({ stepTitle, index, total, onResume, onClose }: PauseBannerProps) {
  const { t } = useTranslation("tutorial");
  return (
    <div
      style={{
        position: "fixed",
        bottom: 16,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 1002,
        maxWidth: "calc(100vw - 32px)",
      }}
      className="flex items-center gap-2 bg-surface0 border border-mauve/40 rounded-full shadow-lg px-3 py-1.5"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label={t("end_tutorial")}
        className="min-h-[32px] min-w-[32px] flex items-center justify-center text-subtext0 hover:text-text"
      >
        <X size={14} />
      </button>
      <span className="font-body text-[10px] text-subtext0 px-1 hidden sm:inline">
        {t("paused")} · {index + 1} / {total}
      </span>
      <span className="font-body text-xs text-text px-1 truncate max-w-[140px] sm:max-w-[200px]">
        {stepTitle}
      </span>
      <button
        type="button"
        onClick={onResume}
        className="min-h-[32px] px-3 rounded-[6px] bg-mauve text-white font-label text-xs flex items-center gap-1"
      >
        <Play size={12} /> {t("resume")}
      </button>
    </div>
  );
}

interface ConfirmCloseModalProps {
  onCancel: () => void;
  onMinimize: () => void;
  onAbort: () => void;
}

/** Bestaetigungs-Modal beim Klick auf X. */
function ConfirmCloseModal({ onCancel, onMinimize, onAbort }: ConfirmCloseModalProps) {
  const { t } = useTranslation("tutorial");
  return (
    <>
      <div
        style={{ zIndex: 1003 }}
        className="fixed inset-0 bg-crust/80 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div
        style={{
          zIndex: 1004,
          width: "min(90vw, 360px)",
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
        className="bg-surface0 border border-mauve/40 rounded-[12px] shadow-2xl p-5"
      >
        <h3 className="font-headline text-base font-semibold text-text mb-2">
          {t("confirm_close.title")}
        </h3>
        <p className="font-body text-sm text-subtext0 mb-4 leading-relaxed">
          {t("confirm_close.body")}
        </p>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={onMinimize}
            className="min-h-[40px] px-4 rounded-[6px] bg-mauve text-white font-label text-xs"
          >
            {t("confirm_close.minimize")}
          </button>
          <button
            type="button"
            onClick={onAbort}
            className="min-h-[40px] px-4 rounded-[6px] bg-surface1 hover:bg-surface2 font-label text-xs text-text"
          >
            {t("confirm_close.abort")}
          </button>
        </div>
      </div>
    </>
  );
}

export function TutorialOverlay() {
  const tut = useTutorialOptional();
  const location = useLocation();
  const navigate = useNavigate();
  const { t: tt } = useTranslation("tutorial");
  const [rect, setRect] = useState<Rect | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const lastLocationRef = useRef<string>(location.pathname + location.search);
  const scrolledStepIdRef = useRef<string | null>(null);

  const step = tut?.active && tut.steps[tut.step] ? tut.steps[tut.step] : null;
  const paused = !!tut?.paused;

  // Off-Path-Erkennung: aktueller Pathname vs. step.expectedPath.
  // Final-Step und Steps ohne expectedPath sind nie off-path.
  // Wenn der Step eine navigate-Action hat und der User bereits auf der
  // Ziel-Route ist, gilt er nicht als off-path (verhindert Flash bis die
  // Action-Detection den naechsten Step laedt).
  const isOffPath =
    !!step &&
    !step.isFinal &&
    !!step.expectedPath &&
    !isOnExpectedPath(location.pathname, step.expectedPath) &&
    !(
      step.action?.type === "navigate" &&
      !!step.action.route &&
      isOnExpectedPath(location.pathname, step.action.route)
    );

  const isPausedView = isOffPath || paused;

  // Mobile-Burger steuern:
  // - Pause/Off-Path: immer schliessen (User soll frei klicken koennen)
  // - openMobileMenu=true und auf-Pfad: oeffnen (mit Delay gegen Auto-Close-Race)
  // - sonst: schliessen (z.B. Zurueck-Button von profile_mobile zu burger_intro_profile)
  useEffect(() => {
    if (!step) return;
    if (isPausedView) {
      window.dispatchEvent(new CustomEvent("mybaby:tutorial:close-mobile-menu"));
      return;
    }
    if (step.openMobileMenu) {
      const tid = setTimeout(() => {
        window.dispatchEvent(new CustomEvent("mybaby:tutorial:open-mobile-menu"));
      }, 250);
      return () => clearTimeout(tid);
    }
    window.dispatchEvent(new CustomEvent("mybaby:tutorial:close-mobile-menu"));
  }, [step, isPausedView]);

  // Recompute target rect on step change, scroll, resize, and DOM mutations.
  // Im Pause-View kein Spotlight (Selector ist auf falscher Page nicht da, oder
  // User soll absichtlich frei navigieren / sich umsehen).
  // scrollIntoView NUR EINMAL pro Step (scrolledStepIdRef), sonst entsteht eine
  // Endlos-Schleife bei Pages mit MutationObserver-Re-Renders (#18 add_child).
  useEffect(() => {
    if (!step || !step.targetSelector || isPausedView) {
      setRect(null);
      return;
    }
    let raf = 0;
    let observer: MutationObserver | null = null;

    const measure = () => {
      const el = document.querySelector<HTMLElement>(step.targetSelector!);
      if (el) {
        const r = el.getBoundingClientRect();
        const inView = r.top >= 0 && r.bottom <= window.innerHeight;
        if (!inView && scrolledStepIdRef.current !== step.id) {
          scrolledStepIdRef.current = step.id;
          el.scrollIntoView({ block: "center", behavior: "smooth" });
        }
        raf = requestAnimationFrame(() => {
          const target = document.querySelector<HTMLElement>(step.targetSelector!);
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

    observer = new MutationObserver(measure);
    observer.observe(document.body, { childList: true, subtree: true });

    const intervalId = setInterval(measure, 200);
    setTimeout(() => clearInterval(intervalId), 1500);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
      observer?.disconnect();
      clearInterval(intervalId);
    };
  }, [step, isPausedView]);

  // Reset scroll-once-Marker bei Step-Wechsel
  useEffect(() => {
    if (step && scrolledStepIdRef.current !== step.id) {
      // Wird erst beim ersten scrollIntoView des neuen Steps gesetzt — initial
      // null-en wir nicht, damit nicht zwischen-renders zaehlen.
    }
    if (!step) scrolledStepIdRef.current = null;
  }, [step]);

  // Action detection (MBT-168).
  // event-Type laeuft auch im Pause-Modus (z.B. add_child: Form-Submit nach
  // manueller Pause soll trotzdem advancen — User hat den Pause-State implizit
  // aufgegeben).
  // click/navigate/url_param-Detection nur wenn auf-Pfad und nicht pausiert.
  useEffect(() => {
    if (!tut?.active || !step) return;

    if (step.action?.type === "event" && step.action.event) {
      const handler = () => {
        if (paused) tut.setPaused(false);
        setTimeout(() => tut.next(), 200);
      };
      window.addEventListener(step.action.event, handler);
      return () => window.removeEventListener(step.action!.event!, handler);
    }

    if (isPausedView) return;
    const advance = () => tut.next();

    if (step.action?.type === "click" && step.action.selector) {
      const handler = (e: MouseEvent) => {
        const target = e.target as HTMLElement | null;
        if (!target) return;
        if (target.closest(step.action!.selector!)) {
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
  }, [tut, step, location, isPausedView, paused]);

  // pauseOnTargetClick: Klick aufs Spotlight-Target pausiert das Tutorial,
  // statt zum naechsten Step zu advance'n. Nutzer soll z.B. das Erfass-Modal
  // (sleep_new_btn) oder den anderen Tab (sleep_tabs) frei erkunden koennen.
  useEffect(() => {
    if (!tut?.active || !step || isPausedView) return;
    if (!step.pauseOnTargetClick || !step.targetSelector) return;
    const sel = step.targetSelector;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.closest(sel)) {
        setTimeout(() => tut.setPaused(true), 200);
      }
    };
    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
  }, [tut, step, isPausedView]);

  if (!tut?.active || !step) return null;

  const total = tut.steps.length;
  const isFirstStep = tut.step === 0;

  // "Weiter"-Click:
  // - forceNextOpensMenu → dispatch Burger-Open + advance (Mobile-Burger-Intro)
  // - closeMobileMenuOnNext → dispatch Burger-Close + advance
  // - action.navigate → programmatic navigate (Detection advanced)
  // - sonst → tut.next()
  const handleNext = () => {
    if (step.forceNextOpensMenu) {
      window.dispatchEvent(new CustomEvent("mybaby:tutorial:open-mobile-menu"));
      setTimeout(() => tut.next(), 300);
      return;
    }
    if (step.closeMobileMenuOnNext) {
      window.dispatchEvent(new CustomEvent("mybaby:tutorial:close-mobile-menu"));
      setTimeout(() => tut.next(), 200);
      return;
    }
    if (step.action?.type === "navigate" && step.action.route) {
      const current = location.pathname + location.search;
      if (!current.startsWith(step.action.route)) {
        navigate(step.action.route);
        return; // useEffect detected die URL-Änderung und ruft tut.next()
      }
    }
    tut.next();
  };

  // Disable next-Button wenn User aktive Aktion erforderlich (click oder event).
  // forceEnableNext ueberschreibt das (z.B. fuer Burger-Intro: User darf entweder
  // klicken ODER auf Weiter tippen).
  const nextDisabled =
    !step.forceEnableNext &&
    (step.action?.type === "click" || step.action?.type === "event");

  const nextLabel = step.nextButtonKey
    ? tt(step.nextButtonKey)
    : tt("next");

  // X-Click: Confirm-Modal oeffnen (Tutorial abbrechen | Hier umsehen)
  const handleClose = () => setConfirmOpen(true);
  const handleConfirmCancel = () => setConfirmOpen(false);
  const handleConfirmMinimize = () => {
    setConfirmOpen(false);
    tut.setPaused(true);
  };
  const handleConfirmAbort = () => {
    setConfirmOpen(false);
    tut.skip();
  };

  // Pause-View (Off-Path oder manuell pausiert): Banner unten + ggf. Modal.
  if (isPausedView) {
    const handleResume = () => {
      // Step kann ein Custom-Event definieren, das beim Resume gedispatcht
      // wird (z.B. sleep_tabs setzt den Tab zurueck auf "Einträge").
      if (step.resumeEvent) {
        window.dispatchEvent(new CustomEvent(step.resumeEvent));
      }
      if (isOffPath && step.expectedPath) {
        navigate(step.expectedPath);
        // setPaused(false) implizit: setPaused war bei Off-Path nie true gesetzt,
        // bei manuell+offpath aber doch — explizit ruecksetzen
        if (paused) tut.setPaused(false);
      } else {
        tut.setPaused(false);
      }
    };
    return (
      <>
        <PauseBanner
          stepTitle={tt(step.titleKey)}
          index={tut.step}
          total={total}
          onResume={handleResume}
          onClose={handleClose}
        />
        {confirmOpen && (
          <ConfirmCloseModal
            onCancel={handleConfirmCancel}
            onMinimize={handleConfirmMinimize}
            onAbort={handleConfirmAbort}
          />
        )}
      </>
    );
  }

  // Final-Step rendert nur Tooltip, kein Backdrop
  if (step.isFinal) {
    return (
      <>
        <FullBackdrop />
        <Tooltip
          step={step}
          index={tut.step}
          total={total}
          rect={null}
          isFirstStep={isFirstStep}
          dontShowAgain={tut.dontShowAgain}
          nextDisabled={false}
          nextLabel={tt("end_tutorial")}
          onToggleDontShow={tut.setDontShowAgain}
          onNext={handleNext}
          onPrev={tut.prev}
          onClose={handleClose}
          onReset={tut.reset}
          onDismissForever={tut.dismissForever}
        />
        {confirmOpen && (
          <ConfirmCloseModal
            onCancel={handleConfirmCancel}
            onMinimize={handleConfirmMinimize}
            onAbort={handleConfirmAbort}
          />
        )}
      </>
    );
  }

  // Standard-Modus: Backdrop (mit oder ohne Cutout) + Tooltip
  return (
    <>
      {rect ? <CutoutBackdrop rect={rect} /> : <FullBackdrop />}
      {rect && <HighlightBorder rect={rect} />}
      <Tooltip
        step={step}
        index={tut.step}
        total={total}
        rect={rect}
        isFirstStep={isFirstStep}
        dontShowAgain={tut.dontShowAgain}
        nextDisabled={nextDisabled}
        nextLabel={nextLabel}
        onToggleDontShow={tut.setDontShowAgain}
        onNext={handleNext}
        onPrev={tut.prev}
        onClose={handleClose}
        onReset={tut.reset}
        onDismissForever={tut.dismissForever}
      />
      {confirmOpen && (
        <ConfirmCloseModal
          onCancel={handleConfirmCancel}
          onMinimize={handleConfirmMinimize}
          onAbort={handleConfirmAbort}
        />
      )}
    </>
  );
}
