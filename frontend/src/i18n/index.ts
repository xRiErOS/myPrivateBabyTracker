import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import de_common from "./locales/de/common.json";
import de_sleep from "./locales/de/sleep.json";
import de_feeding from "./locales/de/feeding.json";
import de_diaper from "./locales/de/diaper.json";
import de_medication from "./locales/de/medication.json";
import de_temperature from "./locales/de/temperature.json";
import de_weight from "./locales/de/weight.json";
import de_vitamind3 from "./locales/de/vitamind3.json";
import de_health from "./locales/de/health.json";
import de_tummytime from "./locales/de/tummytime.json";
import de_milestones from "./locales/de/milestones.json";
import de_todo from "./locales/de/todo.json";
import de_dashboard from "./locales/de/dashboard.json";
import de_admin from "./locales/de/admin.json";
import de_auth from "./locales/de/auth.json";
import de_checkup from "./locales/de/checkup.json";
import de_notes from "./locales/de/notes.json";

import en_common from "./locales/en/common.json";
import en_sleep from "./locales/en/sleep.json";
import en_feeding from "./locales/en/feeding.json";
import en_diaper from "./locales/en/diaper.json";
import en_medication from "./locales/en/medication.json";
import en_temperature from "./locales/en/temperature.json";
import en_weight from "./locales/en/weight.json";
import en_vitamind3 from "./locales/en/vitamind3.json";
import en_health from "./locales/en/health.json";
import en_tummytime from "./locales/en/tummytime.json";
import en_milestones from "./locales/en/milestones.json";
import en_todo from "./locales/en/todo.json";
import en_dashboard from "./locales/en/dashboard.json";
import en_admin from "./locales/en/admin.json";
import en_auth from "./locales/en/auth.json";
import en_checkup from "./locales/en/checkup.json";
import en_notes from "./locales/en/notes.json";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: "de",
    supportedLngs: ["de", "en"],
    defaultNS: "common",
    ns: [
      "common",
      "sleep",
      "feeding",
      "diaper",
      "medication",
      "temperature",
      "weight",
      "vitamind3",
      "health",
      "tummytime",
      "milestones",
      "todo",
      "dashboard",
      "admin",
      "auth",
      "checkup",
      "notes",
    ],
    resources: {
      de: {
        common: de_common,
        sleep: de_sleep,
        feeding: de_feeding,
        diaper: de_diaper,
        medication: de_medication,
        temperature: de_temperature,
        weight: de_weight,
        vitamind3: de_vitamind3,
        health: de_health,
        tummytime: de_tummytime,
        milestones: de_milestones,
        todo: de_todo,
        dashboard: de_dashboard,
        admin: de_admin,
        auth: de_auth,
        checkup: de_checkup,
        notes: de_notes,
      },
      en: {
        common: en_common,
        sleep: en_sleep,
        feeding: en_feeding,
        diaper: en_diaper,
        medication: en_medication,
        temperature: en_temperature,
        weight: en_weight,
        vitamind3: en_vitamind3,
        health: en_health,
        tummytime: en_tummytime,
        milestones: en_milestones,
        todo: en_todo,
        dashboard: en_dashboard,
        admin: en_admin,
        auth: en_auth,
        checkup: en_checkup,
        notes: en_notes,
      },
    },
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "mybaby_language",
      caches: ["localStorage"],
    },
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
