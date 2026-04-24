/** Markdown Editor with Preview Toggle and Format Toolbar.

Mobile: Tab-bar toggle Bearbeiten | Vorschau
Desktop (md+): Split-view editor left, live preview right
No WYSIWYG dependency.
*/

import { useCallback, useRef, useState } from "react";
import { Bold, CheckSquare, Eye, EyeOff, Italic, List, ListOrdered } from "lucide-react";
import { renderMarkdown, toggleCheckbox } from "../lib/markdown";

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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // Mobile-only toggle: "edit" | "preview"
  const [mobileTab, setMobileTab] = useState<"edit" | "preview">("edit");

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
      {/* Toolbar row: format buttons + mobile preview toggle */}
      <div className="flex items-center gap-0.5 px-2 py-1 bg-surface1 border-b border-surface2">
        {/* Format buttons — hidden in mobile preview mode */}
        <div className={`flex gap-0.5 flex-1 ${mobileTab === "preview" ? "md:flex hidden" : "flex"}`}>
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

        {/* Mobile-only: toggle edit/preview */}
        <button
          type="button"
          title={mobileTab === "edit" ? "Vorschau" : "Bearbeiten"}
          onClick={() => setMobileTab((t) => t === "edit" ? "preview" : "edit")}
          className="md:hidden flex items-center gap-1 rounded px-2 py-1 text-xs text-subtext0 hover:text-text hover:bg-surface2 transition-colors ml-auto"
          style={{ minHeight: 36 }}
        >
          {mobileTab === "edit"
            ? <><Eye className="h-3.5 w-3.5" /> Vorschau</>
            : <><EyeOff className="h-3.5 w-3.5" /> Bearbeiten</>
          }
        </button>
      </div>

      {/* Desktop: split view (md+). Mobile: single pane toggled via mobileTab */}
      <div className="md:flex">
        {/* Editor pane */}
        <div className={`md:flex-1 md:border-r md:border-surface2 ${mobileTab === "preview" ? "hidden md:block" : "block"}`}>
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
        </div>

        {/* Preview pane — always visible on desktop, toggled on mobile */}
        <div
          className={`md:flex-1 px-3 py-2.5 bg-surface0 min-h-[3rem] ${mobileTab === "edit" ? "hidden md:block" : "block"}`}
        >
          {value.trim() ? (
            <div
              className="prose-like text-sm"
              // eslint-disable-next-line react/no-danger
              dangerouslySetInnerHTML={{ __html: renderMarkdown(value) }}
            />
          ) : (
            <p className="text-xs text-overlay0 italic">Vorschau</p>
          )}
        </div>
      </div>
    </div>
  );
}

/** Markdown renderer for display in lists/detail views.
 *  When `onContentChange` is provided, checkboxes are interactive (click to toggle).
 */
export function MarkdownDisplay({
  content,
  onContentChange,
}: {
  content: string | null;
  onContentChange?: (updated: string) => void;
}) {
  if (!content) return null;

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" && target.getAttribute("type") === "checkbox") {
        e.preventDefault();
        const lineIndex = parseInt(target.getAttribute("data-line") ?? "-1", 10);
        if (lineIndex >= 0 && content && onContentChange) {
          onContentChange(toggleCheckbox(content, lineIndex));
        }
      }
    },
    [content, onContentChange],
  );

  return (
    <div
      className="prose-like"
      onClick={onContentChange ? handleClick : undefined}
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
    />
  );
}
