/** CodeMirror 6 Markdown Editor — syntax highlighting + format toolbar.

Markdown source stored as-is, formatted on-screen via CodeMirror syntax highlighting.
Bold/italic text is visually styled, markdown markers are dimmed.
Ctrl+B = Bold, Ctrl+I = Italic.
Theme: Catppuccin Latte (light) / Macchiato (dark) via CSS variable awareness.
*/

import { useCallback, useEffect, useRef } from "react";
import { EditorView, keymap, placeholder as cmPlaceholder } from "@codemirror/view";
import { EditorState, EditorSelection, Compartment } from "@codemirror/state";
import { markdown } from "@codemirror/lang-markdown";
import { syntaxHighlighting, HighlightStyle } from "@codemirror/language";
import { tags } from "@lezer/highlight";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { Bold, CheckSquare, Italic, List, ListOrdered } from "lucide-react";
import { renderMarkdown, toggleCheckbox } from "../lib/markdown";

// ---------------------------------------------------------------------------
// Catppuccin highlight style for markdown tokens
// ---------------------------------------------------------------------------

const catppuccinHighlight = HighlightStyle.define([
  { tag: tags.strong, fontWeight: "bold", color: "var(--color-text, #4c4f69)" },
  { tag: tags.emphasis, fontStyle: "italic", color: "var(--color-text, #4c4f69)" },
  { tag: tags.heading1, fontWeight: "bold", fontSize: "1.4em", color: "var(--color-mauve, #8839ef)" },
  { tag: tags.heading2, fontWeight: "bold", fontSize: "1.2em", color: "var(--color-mauve, #8839ef)" },
  { tag: tags.heading3, fontWeight: "bold", fontSize: "1.1em", color: "var(--color-mauve, #8839ef)" },
  { tag: tags.link, color: "var(--color-blue, #1e66f5)", textDecoration: "underline" },
  { tag: tags.url, color: "var(--color-sapphire, #209fb5)" },
  { tag: tags.monospace, fontFamily: "monospace", color: "var(--color-green, #40a02b)" },
  { tag: tags.quote, fontStyle: "italic", color: "var(--color-subtext0, #6c6f85)" },
  { tag: tags.list, color: "var(--color-peach, #fe640b)" },
  // Dim the markdown syntax characters (**, *, #, etc.)
  { tag: tags.processingInstruction, color: "var(--color-overlay0, #9ca0b0)", fontSize: "0.85em" },
  { tag: tags.meta, color: "var(--color-overlay0, #9ca0b0)", fontSize: "0.85em" },
]);

// ---------------------------------------------------------------------------
// Base editor theme
// ---------------------------------------------------------------------------

const catppuccinTheme = EditorView.theme(
  {
    "&": {
      color: "var(--color-text, #4c4f69)",
      backgroundColor: "var(--color-surface1, #ccd0da)",
      fontSize: "16px",
    },
    ".cm-content": {
      caretColor: "var(--color-peach, #fe640b)",
      padding: "10px 12px",
      lineHeight: "1.6",
      minHeight: "80px",
      fontFamily: "var(--font-body, system-ui, -apple-system, sans-serif)",
    },
    ".cm-focused .cm-selectionBackground, .cm-selectionBackground": {
      backgroundColor: "var(--color-peach, #fe640b)20",
    },
    ".cm-cursor": {
      borderLeftColor: "var(--color-peach, #fe640b)",
    },
    ".cm-line": {
      padding: "0",
    },
    "&.cm-focused": { outline: "2px solid var(--color-peach, #fe640b)50" },
    ".cm-scroller": { overflow: "auto" },
  },
  { dark: false },
);

// ---------------------------------------------------------------------------
// Bold / Italic helpers operating on CodeMirror transaction
// ---------------------------------------------------------------------------

function wrapSelection(view: EditorView, marker: string): boolean {
  const { state } = view;
  const changes = state.changeByRange((range) => {
    const selected = state.sliceDoc(range.from, range.to);
    if (selected) {
      const replacement = `${marker}${selected}${marker}`;
      return {
        changes: { from: range.from, to: range.to, insert: replacement },
        range: EditorSelection.range(range.from, range.from + replacement.length),
      };
    }
    // No selection: insert markers and place cursor between
    const replacement = `${marker}${marker}`;
    const insertPos = range.from + marker.length;
    return {
      changes: { from: range.from, insert: replacement },
      range: EditorSelection.cursor(insertPos),
    };
  });
  view.dispatch(changes);
  return true;
}

function insertPrefix(view: EditorView, prefix: string): boolean {
  const line = view.state.doc.lineAt(view.state.selection.main.head);
  if (line.text.startsWith(prefix)) {
    // Remove prefix
    view.dispatch({
      changes: { from: line.from, to: line.from + prefix.length },
    });
  } else {
    view.dispatch({
      changes: { from: line.from, insert: prefix },
    });
  }
  return true;
}

// ---------------------------------------------------------------------------
// Toolbar
// ---------------------------------------------------------------------------

function FormatToolbar({ viewRef }: { viewRef: React.RefObject<EditorView | null> }) {
  const tools = [
    { icon: Bold, action: () => viewRef.current && wrapSelection(viewRef.current, "**"), title: "Fett (Ctrl+B)" },
    { icon: Italic, action: () => viewRef.current && wrapSelection(viewRef.current, "*"), title: "Kursiv (Ctrl+I)" },
    { icon: List, action: () => viewRef.current && insertPrefix(viewRef.current, "- "), title: "Liste" },
    { icon: ListOrdered, action: () => viewRef.current && insertPrefix(viewRef.current, "1. "), title: "Nummerierte Liste" },
    { icon: CheckSquare, action: () => viewRef.current && insertPrefix(viewRef.current, "- [ ] "), title: "Checkbox" },
  ];

  return (
    <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-surface2 bg-surface0">
      {tools.map(({ icon: Icon, action, title }) => (
        <button
          key={title}
          type="button"
          onClick={(e) => { e.preventDefault(); action(); viewRef.current?.focus(); }}
          className="p-1.5 rounded text-overlay0 hover:text-text hover:bg-surface1 transition-colors"
          title={title}
        >
          <Icon className="h-4 w-4" />
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main editor component
// ---------------------------------------------------------------------------

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
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  // Track last external value to avoid re-setting when we own the change
  const lastValueRef = useRef(value);
  // Compartment to toggle editable without rebuilding
  const editableCompartment = useRef(new Compartment());

  // Build editor on mount
  useEffect(() => {
    if (!containerRef.current) return;

    const boldCmd = {
      key: "Mod-b",
      run: (v: EditorView) => wrapSelection(v, "**"),
    };
    const italicCmd = {
      key: "Mod-i",
      run: (v: EditorView) => wrapSelection(v, "*"),
    };

    const startState = EditorState.create({
      doc: value,
      extensions: [
        history(),
        markdown(),
        syntaxHighlighting(catppuccinHighlight),
        catppuccinTheme,
        cmPlaceholder(placeholder),
        keymap.of([boldCmd, italicCmd, ...defaultKeymap, ...historyKeymap]),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const newVal = update.state.doc.toString();
            lastValueRef.current = newVal;
            onChange(newVal);
          }
        }),
        editableCompartment.current.of(EditorView.editable.of(!disabled)),
        EditorView.lineWrapping,
      ],
    });

    const view = new EditorView({
      state: startState,
      parent: containerRef.current,
    });
    viewRef.current = view;

    // Set min-height based on rows
    const lineHeight = 26; // approximate
    view.dom.style.minHeight = `${rows * lineHeight}px`;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // mount only

  // Sync external value changes into CodeMirror (e.g. form reset)
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current !== value && lastValueRef.current !== value) {
      // External change — replace the whole document
      view.dispatch({
        changes: { from: 0, to: current.length, insert: value },
      });
      lastValueRef.current = value;
    }
  }, [value]);

  // Sync disabled state via compartment reconfiguration
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: editableCompartment.current.reconfigure(EditorView.editable.of(!disabled)),
    });
  }, [disabled]);

  return (
    <div className="rounded-xl border border-surface2 overflow-hidden bg-surface1">
      {!disabled && <FormatToolbar viewRef={viewRef} />}
      <div ref={containerRef} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// MarkdownDisplay — read-only renderer, unchanged from previous implementation
// ---------------------------------------------------------------------------

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
