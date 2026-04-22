import "@testing-library/jest-dom";
import i18n from "../i18n";

// Force German locale in tests (jsdom defaults to en)
i18n.changeLanguage("de");

// Mock window.matchMedia for jsdom
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});
