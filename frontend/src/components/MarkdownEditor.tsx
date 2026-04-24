/** Markdown Editor with Preview Toggle.

Simple tab-bar: Bearbeiten | Vorschau
Edit mode: plain textarea
Preview mode: rendered HTML via minimal markdown parser
No WYSIWYG dependency.
*/

import { useState } from "react";
import { Eye, Pencil } from "lucide-react";
import { renderMarkdown } from "../lib/markdown";

interface MarkdownEditorProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder = "Details (Markdown wird unterstützt)\n\n**fett**, *kursiv*, `code`\n- [ ] Aufgabe\n- [x] Erledigt",
  rows = 6,
  disabled = false,
}: MarkdownEditorProps) {
  const [mode, setMode] = useState<"edit" | "preview">("edit");

  return (
    <div className="rounded-xl border border-surface2 overflow-hidden">
      {/* Tab bar */}
      <div className="flex border-b border-surface2 bg-surface0">
        <button
          type="button"
          onClick={() => setMode("edit")}
          disabled={disabled}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-label font-medium transition-colors ${
            mode === "edit"
              ? "text-peach border-b-2 border-peach bg-surface0"
              : "text-subtext0 hover:text-text"
          }`}
        >
          <Pencil className="h-3 w-3" />
          Bearbeiten
        </button>
        <button
          type="button"
          onClick={() => setMode("preview")}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-label font-medium transition-colors ${
            mode === "preview"
              ? "text-peach border-b-2 border-peach bg-surface0"
              : "text-subtext0 hover:text-text"
          }`}
        >
          <Eye className="h-3 w-3" />
          Vorschau
        </button>
      </div>

      {/* Content */}
      {mode === "edit" ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          disabled={disabled}
          maxLength={2000}
          className="w-full bg-surface1 px-3 py-2.5 text-sm text-text font-mono focus:outline-none resize-none disabled:opacity-50"
          style={{ fontSize: "16px" }}
        />
      ) : (
        <div
          className="min-h-[120px] px-3 py-2.5 bg-surface0 overflow-auto"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{
            __html: value.trim()
              ? renderMarkdown(value)
              : `<p class="text-sm text-overlay0 italic">Noch kein Inhalt.</p>`,
          }}
        />
      )}
    </div>
  );
}

/** Read-only Markdown renderer for display in lists/detail views. */
export function MarkdownDisplay({ content }: { content: string | null }) {
  if (!content) return null;
  return (
    <div
      className="prose-like"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
    />
  );
}
