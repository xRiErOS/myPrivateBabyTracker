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

  // Restore active child from localStorage or pick first
  useEffect(() => {
    if (childList.length === 0) return;

    const storedId = localStorage.getItem(STORAGE_KEY);
    const stored = storedId
      ? childList.find((c) => c.id === Number(storedId))
      : null;

    if (stored) {
      setActiveChildState(stored);
    } else {
      setActiveChildState(childList[0]);
    }
  }, [childList]);

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
