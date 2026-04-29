/** Tutorial step definitions (MBT-167 + MBT-168, Round 7 — Pause + Action-Prompt). */

export type ActionType = "click" | "navigate" | "url_param" | "event" | "none";
export type Device = "mobile" | "desktop" | "all";

export interface TutorialStep {
  id: string;
  titleKey: string;
  descriptionKey: string;
  /**
   * Optionale Aufforderung an den Nutzer (i18n-Key).
   * Wird im Tooltip zentriert, mauve und fett unter der Beschreibung gerendert.
   */
  actionPromptKey?: string;
  /** CSS selector for the spotlight target. null = no spotlight. */
  targetSelector: string | null;
  device?: Device;
  action?: {
    type: ActionType;
    selector?: string;
    route?: string;
    param?: string;
    /** Custom event name (window.addEventListener) for type=event */
    event?: string;
  };
  /** Final step shows reset+end buttons + "don't show again" checkbox. */
  isFinal?: boolean;
  /** Override the Next button label. Defaults to "next". */
  nextButtonKey?: string;
  /** Programmatically open the mobile burger menu when this step mounts. */
  openMobileMenu?: boolean;
  /** Force-enable Next button even when an action is set (default: disabled for click/event). */
  forceEnableNext?: boolean;
  /** When user clicks Next, dispatch the open-mobile-menu event before advancing. */
  forceNextOpensMenu?: boolean;
  /** When user clicks Next, close the mobile burger menu before advancing. */
  closeMobileMenuOnNext?: boolean;
  /**
   * Erwarteter Pfad (Pathname-Prefix) fuer diesen Step.
   * Wenn der aktuelle Pathname nicht mit diesem Wert beginnt, geht das Tutorial
   * in den Off-Path-Pausenmodus (Mini-Banner unten mit "Fortsetzen"-Button).
   */
  expectedPath?: string;
  /**
   * Wenn true: Klick auf das Spotlight-Target pausiert das Tutorial (statt zu
   * advancen). Nutzer kann sich mit dem geoeffneten Modal/Tab umsehen und ueber
   * "Fortsetzen" zurueckkehren.
   */
  pauseOnTargetClick?: boolean;
  /**
   * Custom-Event, das beim Klick auf "Fortsetzen" (Resume) dispatcht wird.
   * Ermoeglicht es einer Page, ihren UI-State zurueckzusetzen — z.B. einen Tab
   * zurueckzuwechseln, damit die nachfolgenden Tutorial-Steps wieder ihre
   * Selektoren finden.
   */
  resumeEvent?: string;
}

export const ALL_TUTORIAL_STEPS: TutorialStep[] = [
  // 1 — Welcome ohne Highlight (nur blurred Backdrop)
  {
    id: "welcome",
    titleKey: "step.welcome.title",
    descriptionKey: "step.welcome.description",
    targetSelector: null,
    expectedPath: "/",
  },
  // 2 — Highlight startet hier
  {
    id: "dashboard_tiles",
    titleKey: "step.dashboard_tiles.title",
    descriptionKey: "step.dashboard_tiles.description",
    targetSelector: '[data-tutorial="baby-summary"]',
    expectedPath: "/",
  },
  // 3
  {
    id: "range_tabs",
    titleKey: "step.range_tabs.title",
    descriptionKey: "step.range_tabs.description",
    targetSelector: '[data-tutorial="range-tabs"]',
    expectedPath: "/",
  },
  // 4 — Profil
  {
    id: "profile_desktop",
    titleKey: "step.profile.title",
    descriptionKey: "step.profile.description_desktop",
    targetSelector: '[data-tutorial="profile-link"]',
    device: "desktop",
    expectedPath: "/",
  },
  // 4a (mobile) — Burger-Intro: User soll Burger oeffnen oder Weiter tippen
  {
    id: "burger_intro_profile",
    titleKey: "step.burger_intro.title",
    descriptionKey: "step.burger_intro.description",
    actionPromptKey: "step.burger_intro.action",
    targetSelector: '[data-tutorial="mobile-menu-toggle"]',
    device: "mobile",
    action: { type: "click", selector: '[data-tutorial="mobile-menu-toggle"]' },
    forceEnableNext: true,
    forceNextOpensMenu: true,
    expectedPath: "/",
  },
  {
    id: "profile_mobile",
    titleKey: "step.profile.title",
    descriptionKey: "step.profile.description_mobile",
    actionPromptKey: "step.profile.action_mobile",
    targetSelector: '[data-tutorial="menu-profile"]',
    device: "mobile",
    openMobileMenu: true,
    closeMobileMenuOnNext: true,
    expectedPath: "/",
  },
  // 5 — Verwaltung
  {
    id: "admin_desktop",
    titleKey: "step.admin.title",
    descriptionKey: "step.admin.description_desktop",
    actionPromptKey: "step.admin.action_desktop",
    // MBT-178: Verwaltung ist jetzt im Header (Settings-Icon), nicht mehr in der Sidebar.
    targetSelector: '[data-tutorial="admin-link"]',
    device: "desktop",
    action: { type: "navigate", route: "/admin" },
    expectedPath: "/",
  },
  // 5a (mobile) — direkt von profile_mobile (Burger ist bereits aufgeklappt
  // gewesen; Mobile-User braucht keinen erneuten Burger-Intro). Klick auf
  // Verwaltung-Menupunkt advanced via Action.
  {
    id: "admin_mobile",
    titleKey: "step.admin.title",
    descriptionKey: "step.admin.description_mobile",
    actionPromptKey: "step.admin.action_mobile",
    targetSelector: '[data-tutorial="menu-admin"]',
    device: "mobile",
    openMobileMenu: true,
    action: { type: "navigate", route: "/admin" },
    expectedPath: "/",
  },
  // 6 — Übersicht Verwaltung — Spotlight auf Plug-Ins-Tile (Klick-Ziel),
  // statt aufs ganze Grid (das auf Mobile den ganzen Viewport fuellt).
  {
    id: "admin_overview",
    titleKey: "step.admin_overview.title",
    descriptionKey: "step.admin_overview.description",
    actionPromptKey: "step.admin_overview.action",
    targetSelector: '[data-tutorial="admin-plugins-tile"]',
    action: { type: "navigate", route: "/admin/plugins" },
    expectedPath: "/admin",
  },
  // 7a — Plugins-Erklärung (Modal)
  {
    id: "plugins_intro",
    titleKey: "step.plugins_intro.title",
    descriptionKey: "step.plugins_intro.description",
    targetSelector: null,
    expectedPath: "/admin/plugins",
  },
  // 7b — Plugins-Pause: Standard-Tooltip mit Aufforderung "Schaue dich um,
  // dann Fortsetzen". nextButtonKey rendert "Fortsetzen" statt "Weiter".
  {
    id: "plugins_explore",
    titleKey: "step.plugins_explore.title",
    descriptionKey: "step.plugins_explore.description",
    actionPromptKey: "step.plugins_explore.action",
    targetSelector: null,
    nextButtonKey: "resume",
    expectedPath: "/admin/plugins",
  },
  // 8 — Schlaf-Link
  {
    id: "sleep_link_desktop",
    titleKey: "step.sleep_link.title",
    descriptionKey: "step.sleep_link.description_desktop",
    actionPromptKey: "step.sleep_link.action_desktop",
    targetSelector: '[data-tutorial="sidebar-sleep"]',
    device: "desktop",
    action: { type: "navigate", route: "/sleep" },
    expectedPath: "/admin/plugins",
  },
  // 8a (mobile) — Burger-Intro vor Schlaf
  {
    id: "burger_intro_sleep",
    titleKey: "step.burger_intro.title",
    descriptionKey: "step.burger_intro.description_sleep",
    actionPromptKey: "step.burger_intro.action",
    targetSelector: '[data-tutorial="mobile-menu-toggle"]',
    device: "mobile",
    action: { type: "click", selector: '[data-tutorial="mobile-menu-toggle"]' },
    forceEnableNext: true,
    forceNextOpensMenu: true,
    expectedPath: "/admin/plugins",
  },
  {
    id: "sleep_link_mobile",
    titleKey: "step.sleep_link.title",
    descriptionKey: "step.sleep_link.description_mobile",
    actionPromptKey: "step.sleep_link.action_mobile",
    targetSelector: '[data-tutorial="menu-sleep"]',
    device: "mobile",
    openMobileMenu: true,
    action: { type: "navigate", route: "/sleep" },
    expectedPath: "/admin/plugins",
  },
  // 9 — sleep_new_btn: pauseOnTargetClick → Klick auf "+Erfassen" oeffnet
  // Modal und pausiert das Tutorial.
  {
    id: "sleep_new_btn",
    titleKey: "step.sleep_new_btn.title",
    descriptionKey: "step.sleep_new_btn.description",
    actionPromptKey: "step.sleep_new_btn.action",
    targetSelector: '[data-tutorial="sleep-new-btn"]',
    pauseOnTargetClick: true,
    expectedPath: "/sleep",
  },
  // 10 — sleep_tabs: pauseOnTargetClick → Klick auf einen Tab pausiert.
  // resumeEvent: SleepPage hoert auf das Event und wechselt den Tab zurueck
  // auf "Einträge", damit die nachfolgenden Steps (Filter/Stats) ihre
  // Selektoren wiederfinden.
  {
    id: "sleep_tabs",
    titleKey: "step.sleep_tabs.title",
    descriptionKey: "step.sleep_tabs.description",
    actionPromptKey: "step.sleep_tabs.action",
    targetSelector: '[data-tutorial="sleep-tabs"]',
    pauseOnTargetClick: true,
    resumeEvent: "mybaby:tutorial:sleep-tab-list",
    expectedPath: "/sleep",
  },
  // 11
  {
    id: "sleep_filter",
    titleKey: "step.sleep_filter.title",
    descriptionKey: "step.sleep_filter.description",
    targetSelector: '[data-tutorial="sleep-filter"]',
    expectedPath: "/sleep",
  },
  // 12
  {
    id: "sleep_stats",
    titleKey: "step.sleep_stats.title",
    descriptionKey: "step.sleep_stats.description",
    targetSelector: '[data-tutorial="sleep-stats"]',
    expectedPath: "/sleep",
  },
  // 13 — Eintraege bearbeiten + Button-Text "Gehe zu Kinder"
  {
    id: "sleep_edit",
    titleKey: "step.sleep_edit.title",
    descriptionKey: "step.sleep_edit.description",
    actionPromptKey: "step.sleep_edit.action",
    targetSelector: '[data-tutorial="sleep-actions"]',
    action: { type: "navigate", route: "/admin/children" },
    nextButtonKey: "go_to_children",
    expectedPath: "/sleep",
  },
  // 14 — Kind anlegen: Klick auf +Hinzufuegen pausiert (Form/Modal soll frei
  // ausfuellbar sein). Form-Submit dispatched ein Custom-Event, das im
  // Pause-Modus trotzdem advanced (Sonderbehandlung im Overlay).
  // scrollIntoView nur einmal pro Step (verhindert Scroll-Loop #18).
  {
    id: "add_child",
    titleKey: "step.add_child.title",
    descriptionKey: "step.add_child.description",
    actionPromptKey: "step.add_child.action",
    targetSelector: '[data-tutorial="children-add"]',
    action: { type: "event", event: "mybaby:tutorial:child-created" },
    pauseOnTargetClick: true,
    expectedPath: "/admin/children",
  },
  // 15 — Final
  {
    id: "success",
    titleKey: "step.success.title",
    descriptionKey: "step.success.description",
    targetSelector: null,
    isFinal: true,
  },
];

/** Filter steps by device. Mobile breakpoint at 768px. */
export function getStepsForDevice(): TutorialStep[] {
  if (typeof window === "undefined") return ALL_TUTORIAL_STEPS;
  const isMobile = window.matchMedia("(max-width: 767px)").matches;
  return ALL_TUTORIAL_STEPS.filter((s) => {
    const dev = s.device ?? "all";
    if (dev === "all") return true;
    if (dev === "mobile") return isMobile;
    if (dev === "desktop") return !isMobile;
    return true;
  });
}

export const TUTORIAL_STEPS = ALL_TUTORIAL_STEPS;
