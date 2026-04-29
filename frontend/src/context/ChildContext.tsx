/** Global context for the currently active child. */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Child } from "../api/types";
import { useChildren } from "../hooks/useChildren";

interface ChildContextType {
  activeChild: Child | null;
  children: Child[];
  setActiveChild: (child: Child) => void;
  isLoading: boolean;
}

const ChildContext = createContext<ChildContextType>({
  activeChild: null,
  children: [],
  setActiveChild: () => {},
  isLoading: true,
});

const STORAGE_KEY = "mybaby-active-child-id";

export function ChildProvider({ children: reactChildren }: { children: ReactNode }) {
  const { data: childList = [], isLoading } = useChildren();
  const [activeChild, setActiveChildState] = useState<Child | null>(null);

  // Restore active child from localStorage or pick first.
  // MBT-207: also recover when the currently active child was deleted —
  // fall back to the first remaining child or null if none are left.
  useEffect(() => {
    if (childList.length === 0) {
      if (activeChild !== null) {
        setActiveChildState(null);
        localStorage.removeItem(STORAGE_KEY);
      }
      return;
    }

    const storedId = localStorage.getItem(STORAGE_KEY);
    const stored = storedId
      ? childList.find((c) => c.id === Number(storedId))
      : null;

    if (stored) {
      // Keep state in sync with refreshed list (e.g. updated name)
      if (!activeChild || activeChild.id !== stored.id || activeChild !== stored) {
        setActiveChildState(stored);
      }
      return;
    }

    // Stored child no longer exists (deleted) → switch to first available
    const fallback = childList[0];
    setActiveChildState(fallback);
    localStorage.setItem(STORAGE_KEY, String(fallback.id));
  }, [childList, activeChild]);

  const setActiveChild = useCallback((child: Child) => {
    setActiveChildState(child);
    localStorage.setItem(STORAGE_KEY, String(child.id));
  }, []);

  return (
    <ChildContext.Provider
      value={{
        activeChild,
        children: childList,
        setActiveChild,
        isLoading,
      }}
    >
      {reactChildren}
    </ChildContext.Provider>
  );
}

export function useActiveChild() {
  return useContext(ChildContext);
}
