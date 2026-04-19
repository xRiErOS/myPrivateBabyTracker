/** Dropdown to select the active child. */

import { useActiveChild } from "../context/ChildContext";

export function ChildSelector() {
  const { activeChild, children, setActiveChild, isLoading } =
    useActiveChild();

  if (isLoading || children.length === 0) return null;

  // Single child — show name as headline
  if (children.length === 1) {
    return (
      <h1 className="font-headline text-xl font-bold text-text">
        {children[0].name}
      </h1>
    );
  }

  return (
    <select
      value={activeChild?.id ?? ""}
      onChange={(e) => {
        const child = children.find((c) => c.id === Number(e.target.value));
        if (child) setActiveChild(child);
      }}
      className="min-h-[44px] rounded-[8px] bg-surface0 px-3 py-2 font-headline text-xl font-bold text-text border-none outline-none focus:ring-2 focus:ring-mauve"
    >
      {children.map((child) => (
        <option key={child.id} value={child.id}>
          {child.name}
        </option>
      ))}
    </select>
  );
}
