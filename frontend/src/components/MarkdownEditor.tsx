/** Markdown Editor with Preview Toggle and Format Toolbar.

Simple tab-bar: Bearbeiten | Vorschau
Edit mode: textarea with format toolbar (Bold, Italic, List, Ordered List, Checkbox)
Preview mode: rendered HTML via minimal markdown parser
No WYSIWYG dependency.
*/

import { useRef, useState } from "react";
import { Bold, CheckSquare, Eye, Italic, List, ListOrdered, Pencil } from "lucide-react";
import { renderMarkdown } from "../lib/markdown";

interface MarkdownEditorProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
}

/** Apply inline markup (bold/italic) wrapping selection or inserting at cursor. */
function applyInline(
  textarea: HTMLTextAreaElement,
  value: string,
  onChange: (val: string) => void,
  marker: string,
) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selected = value.slice(start, end);
  const replacement = selected
    ? `${marker}${selected}${marker}`
    : `${marker}${marker}`;
  const next = value.slice(0, start) + replacement + value.slice(end);
  onChange(next);
  // Restore cursor inside markers when no selection
  requestAnimationFrame(() => {
    textarea.focus();
    if (!selected) {
      const pos = start + marker.length;
      textarea.setSelectionRange(pos, pos);
    } else {
      textarea.setSelectionRange(start, start + replacement.length);
    }
  });
}

/** Insert a line prefix at the start of the current line. */
function applyLinePrefix(
  textarea: HTMLTextAreaElement,
  value: string,
  onChange: (val: string) => void,
  prefix: string,
) {
  const pos = textarea.selectionStart;
  const lineStart = value.lastIndexOf("\n", pos - 1) + 1;
  const next = value.slice(0, lineStart) + prefix + value.slice(lineStart);
  onChange(next);
  requestAnimationFrame(() => {
    textarea.focus();
    const newPos = pos + prefix.length;
    textarea.setSelectionRange(newPos, newPos);
  });
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder = "Details (Markdown wird unterstützt)\n\n**fett**, *kursiv*, `code`\n- [ ] Aufgabe\n- [x] Erledigt",
  rows = 6,
  disabled = false,
}: MarkdownEditorProps) {
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleToolbar(action: "bold" | "italic" | "ul" | "ol" | "checkbox") {
    const ta = textareaRef.current;
    if (!ta) return;
    switch (action) {
      case "bold":
        applyInline(ta, value, onChange, "**");
        break;
      case "italic":
        applyInline(ta, value, onChange, "*");
        break;
      case "ul":
        applyLinePrefix(ta, value, onChange, "- ");
        break;
      case "ol":
        applyLinePrefix(ta, value, onChange, "1. ");
        break;
      case "checkbox":
        applyLinePrefix(ta, value, onChange, "- [ ] ");
        break;
    }
  }

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

      {/* Format toolbar — only in edit mode */}
      {mode === "edit" && (
        <div className="flex gap-0.5 px-2 py-1 bg-surface1 border-b border-surface2">
          {(
            [
              { action: "bold", icon: <Bold className="h-3.5 w-3.5" />, title: "Fett" },
              { action: "italic", icon: <Italic className="h-3.5 w-3.5" />, title: "Kursiv" },
              { action: "ul", icon: <List className="h-3.5 w-3.5" />, title: "Liste" },
              { action: "ol", icon: <ListOrdered className="h-3.5 w-3.5" />, title: "Nummerierte Liste" },
              { action: "checkbox", icon: <CheckSquare className="h-3.5 w-3.5" />, title: "Aufgabe" },
            ] as const
          ).map(({ action, icon, title }) => (
            <button
              key={action}
              type="button"
              title={title}
              disabled={disabled}
              onMouseDown={(e) => {
                // Prevent textarea blur before handler runs
                e.preventDefault();
                handleToolbar(action);
              }}
              className="flex items-center justify-center rounded px-2 text-subtext0 hover:text-text hover:bg-surface2 transition-colors disabled:opacity-40"
              style={{ minHeight: 36 }}
            >
              {icon}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {mode === "edit" ? (
        <textarea
          ref={textareaRef}
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
