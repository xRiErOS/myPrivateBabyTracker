/** Dropdown to select the active child — custom styled. */

import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useActiveChild } from "../context/ChildContext";

export function ChildSelector() {
  const { activeChild, children, setActiveChild, isLoading } =
    useActiveChild();
  const { t: tc } = useTranslation("common");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  if (isLoading || children.length === 0) return null;

  if (children.length === 1) {
    return (
      <h1 className="font-headline text-xl font-bold text-text">
        {children[0].name}
      </h1>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 min-h-[44px] px-3 py-2 rounded-[8px] bg-surface0 font-headline text-base font-bold text-text hover:opacity-80 transition-opacity"
      >
        {activeChild?.name ?? tc("child.child")}
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 min-w-[160px] rounded-[8px] bg-surface1 shadow-lg ring-1 ring-surface2/50 z-50 overflow-hidden animate-fade-in">
          {children.map((child) => (
            <button
              key={child.id}
              onClick={() => {
                setActiveChild(child);
                setOpen(false);
              }}
              className={`w-full text-left px-4 py-3 font-body text-base transition-colors ${
                child.id === activeChild?.id
                  ? "bg-mauve/20 text-mauve font-medium"
                  : "text-text hover:bg-surface2"
              }`}
            >
              {child.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
