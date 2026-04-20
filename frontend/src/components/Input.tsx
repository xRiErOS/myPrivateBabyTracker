/** Styled text/number/datetime input per DESIGN.md. */

import { forwardRef, type InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = "", id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label
            htmlFor={inputId}
            className="font-label text-sm font-medium text-subtext0"
          >
            {label}
            {props.required && <span className="text-red ml-0.5">*</span>}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`min-h-[44px] rounded-[8px] bg-surface0 px-3 py-2 font-body text-base text-text placeholder:text-overlay0 border-none outline-none focus:ring-2 focus:ring-mauve transition-all ${error ? "ring-2 ring-red" : ""} ${className}`.trim()}
          {...props}
        />
        {error && (
          <span className="font-label text-xs text-red">{error}</span>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";
