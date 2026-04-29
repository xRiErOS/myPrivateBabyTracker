/** Tutorial step definitions (MBT-167 + MBT-168).
 *
 * Each step describes what to highlight on screen and which user action
 * advances it automatically (action detection).
 */

export type ActionType = "click" | "navigate" | "url_param" | "none";

export interface TutorialStep {
  id: string;
  titleKey: string;
  descriptionKey: string;
  /** CSS selector for the spotlight target. null = centered modal. */
  targetSelector: string | null;
  action?: {
    type: ActionType;
    /** For click actions */
    selector?: string;
    /** For navigate actions */
    route?: string;
    /** For url_param actions — query parameter name to watch */
    param?: string;
  };
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: "welcome",
    titleKey: "step.welcome.title",
    descriptionKey: "step.welcome.description",
    targetSelector: null,
  },
  {
    id: "fab",
    titleKey: "step.fab.title",
    descriptionKey: "step.fab.description",
    targetSelector: '[data-tutorial="fab"]',
    action: {
      type: "click",
      selector: '[data-tutorial="fab"]',
    },
  },
  {
    id: "create_entry",
    titleKey: "step.create_entry.title",
    descriptionKey: "step.create_entry.description",
    targetSelector: null,
    action: {
      type: "url_param",
      param: "new",
    },
  },
  {
    id: "switch_tab",
    titleKey: "step.switch_tab.title",
    descriptionKey: "step.switch_tab.description",
    targetSelector: null,
  },
  {
    id: "plugin_admin",
    titleKey: "step.plugin_admin.title",
    descriptionKey: "step.plugin_admin.description",
    targetSelector: null,
    action: {
      type: "navigate",
      route: "/admin",
    },
  },
  {
    id: "done",
    titleKey: "step.done.title",
    descriptionKey: "step.done.description",
    targetSelector: null,
  },
];
