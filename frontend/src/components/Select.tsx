/** Styled select per DESIGN.md. */

import { forwardRef, type SelectHTMLAttributes } from "react";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, error, className = "", id, ...props }, ref) => {
    const selectId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label
            htmlFor={selectId}
            className="font-label text-sm font-medium text-subtext0"
          >
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={`min-h-[44px] rounded-[8px] bg-surface0 px-3 py-2 font-body text-sm text-text border-none outline-none focus:ring-2 focus:ring-mauve transition-all ${error ? "ring-2 ring-red" : ""} ${className}`.trim()}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && (
          <span className="font-label text-xs text-red">{error}</span>
        )}
      </div>
    );
  },
);

Select.displayName = "Select";
