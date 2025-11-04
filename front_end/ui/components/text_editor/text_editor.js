var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/ui/components/text_editor/AiCodeCompletionProvider.js
var AiCodeCompletionProvider_exports = {};
__export(AiCodeCompletionProvider_exports, {
  AIDA_REQUEST_DEBOUNCE_TIMEOUT_MS: () => AIDA_REQUEST_DEBOUNCE_TIMEOUT_MS,
  AiCodeCompletionProvider: () => AiCodeCompletionProvider,
  AiCodeCompletionTeaserMode: () => AiCodeCompletionTeaserMode,
  DELAY_BEFORE_SHOWING_RESPONSE_MS: () => DELAY_BEFORE_SHOWING_RESPONSE_MS,
  aiCodeCompletionTeaserModeState: () => aiCodeCompletionTeaserModeState,
  setAiCodeCompletionTeaserMode: () => setAiCodeCompletionTeaserMode
});
import * as Common2 from "./../../../core/common/common.js";
import * as Host from "./../../../core/host/host.js";
import * as i18n3 from "./../../../core/i18n/i18n.js";
import * as Root from "./../../../core/root/root.js";
import * as PanelCommon from "./../../../panels/common/common.js";
import * as CodeMirror from "./../../../third_party/codemirror.next/codemirror.next.js";
import * as UI2 from "./../../legacy/legacy.js";
import * as VisualLogging2 from "./../../visual_logging/visual_logging.js";

// gen/front_end/ui/components/text_editor/AiCodeCompletionTeaserPlaceholder.js
var AiCodeCompletionTeaserPlaceholder_exports = {};
__export(AiCodeCompletionTeaserPlaceholder_exports, {
  AiCodeCompletionTeaserPlaceholder: () => AiCodeCompletionTeaserPlaceholder,
  aiCodeCompletionTeaserPlaceholder: () => aiCodeCompletionTeaserPlaceholder,
  flattenRect: () => flattenRect
});
import * as CM from "./../../../third_party/codemirror.next/codemirror.next.js";
function flattenRect(rect, left) {
  const x = left ? rect.left : rect.right;
  return { left: x, right: x, top: rect.top, bottom: rect.bottom };
}
var AiCodeCompletionTeaserPlaceholder = class extends CM.WidgetType {
  teaser;
  constructor(teaser) {
    super();
    this.teaser = teaser;
  }
  toDOM() {
    const wrap = document.createElement("span");
    wrap.classList.add("cm-placeholder");
    wrap.style.pointerEvents = "none";
    wrap.tabIndex = 0;
    this.teaser.show(wrap, void 0, true);
    return wrap;
  }
  /**
   * Controls the cursor's height by reporting this widget's bounds as a
   * single line. This prevents the cursor from expanding vertically when the
   * placeholder content wraps across multiple lines.
   */
  coordsAt(dom) {
    const boundingClientRect = dom.firstElementChild?.getBoundingClientRect();
    if (!boundingClientRect) {
      return null;
    }
    const style = window.getComputedStyle(dom.parentNode);
    const rect = flattenRect(boundingClientRect, style.direction !== "rtl");
    const lineHeight = parseInt(style.lineHeight, 10);
    if (rect.bottom - rect.top > lineHeight * 1.5) {
      return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.top + lineHeight };
    }
    return rect;
  }
  ignoreEvent(_) {
    return false;
  }
  destroy(dom) {
    super.destroy(dom);
    this.teaser?.hideWidget();
  }
};
function aiCodeCompletionTeaserPlaceholder(teaser) {
  const plugin = CM.ViewPlugin.fromClass(class {
    view;
    placeholder;
    constructor(view) {
      this.view = view;
      this.placeholder = CM.Decoration.set([CM.Decoration.widget({ widget: new AiCodeCompletionTeaserPlaceholder(teaser), side: 1 }).range(0)]);
    }
    get decorations() {
      return this.view.state.doc.length ? CM.Decoration.none : this.placeholder;
    }
  }, { decorations: (v) => v.decorations });
  return plugin;
}

// gen/front_end/ui/components/text_editor/config.js
var config_exports = {};
__export(config_exports, {
  DynamicSetting: () => DynamicSetting,
  acceptAiAutoCompleteSuggestion: () => acceptAiAutoCompleteSuggestion,
  aiAutoCompleteSuggestion: () => aiAutoCompleteSuggestion,
  aiAutoCompleteSuggestionState: () => aiAutoCompleteSuggestionState,
  allowScrollPastEof: () => allowScrollPastEof,
  autoDetectIndent: () => autoDetectIndent,
  autocompletion: () => autocompletion2,
  baseConfiguration: () => baseConfiguration,
  bracketMatching: () => bracketMatching2,
  closeBrackets: () => closeBrackets2,
  codeFolding: () => codeFolding,
  conservativeCompletion: () => conservativeCompletion,
  contentIncludingHint: () => contentIncludingHint,
  domWordWrap: () => domWordWrap,
  dummyDarkTheme: () => dummyDarkTheme,
  dynamicSetting: () => dynamicSetting,
  hasActiveAiSuggestion: () => hasActiveAiSuggestion,
  indentUnit: () => indentUnit2,
  setAiAutoCompleteSuggestion: () => setAiAutoCompleteSuggestion,
  showCompletionHint: () => showCompletionHint,
  showWhitespace: () => showWhitespace,
  sourcesWordWrap: () => sourcesWordWrap,
  tabMovesFocus: () => tabMovesFocus,
  theme: () => theme,
  themeSelection: () => themeSelection
});
import * as Common from "./../../../core/common/common.js";
import * as i18n from "./../../../core/i18n/i18n.js";
import * as TextUtils from "./../../../models/text_utils/text_utils.js";
import * as CM3 from "./../../../third_party/codemirror.next/codemirror.next.js";
import * as UI from "./../../legacy/legacy.js";
import * as VisualLogging from "./../../visual_logging/visual_logging.js";
import * as CodeHighlighter from "./../code_highlighter/code_highlighter.js";
import * as Icon from "./../icon_button/icon_button.js";

// gen/front_end/ui/components/text_editor/theme.js
import * as CM2 from "./../../../third_party/codemirror.next/codemirror.next.js";
var editorTheme = CM2.EditorView.theme({
  "&.cm-editor": {
    color: "color: var(--sys-color-on-subtle)",
    cursor: "auto",
    "&.cm-focused": {
      outline: "none"
    }
  },
  ".cm-scroller": {
    lineHeight: "1.4em",
    fontFamily: "var(--source-code-font-family)",
    fontSize: "var(--source-code-font-size)"
  },
  ".cm-content": {
    lineHeight: "1.4em"
  },
  ".cm-panels": {
    backgroundColor: "var(--sys-color-cdt-base-container)"
  },
  ".cm-panels-bottom": {
    borderTop: "1px solid var(--sys-color-divider)"
  },
  ".cm-selectionMatch": {
    backgroundColor: "var(--sys-color-yellow-container)"
  },
  ".cm-cursor": {
    borderLeft: "1px solid var(--sys-color-inverse-surface)"
  },
  "&.cm-readonly .cm-cursor": {
    display: "none"
  },
  ".cm-cursor-secondary": {
    borderLeft: "1px solid var(--sys-color-neutral-outline)"
  },
  "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground": {
    background: "var(--sys-color-tonal-container)"
  },
  ".cm-line::selection": {
    color: "currentColor"
  },
  ".cm-selectionBackground": {
    background: "var(--sys-color-neutral-container)"
  },
  ".cm-gutters": {
    borderRight: "none",
    whiteSpace: "nowrap",
    backgroundColor: "var(--sys-color-cdt-base-container)"
  },
  ".cm-gutters .cm-foldGutterElement": {
    cursor: "pointer",
    opacity: "0%",
    transition: "opacity 0.2s"
  },
  ".cm-gutters .cm-foldGutterElement-folded, .cm-gutters:hover .cm-foldGutterElement": {
    opacity: "100%"
  },
  ".cm-lineNumbers": {
    overflow: "visible",
    minWidth: "40px"
  },
  ".cm-lineNumbers .cm-gutterElement": {
    color: "var(--sys-color-outline)",
    padding: "0 3px 0 9px"
  },
  ".cm-foldPlaceholder": {
    background: "transparent",
    border: "none",
    color: "var(--sys-color-token-subtle)"
  },
  ".cm-matchingBracket, .cm-nonmatchingBracket": {
    background: "transparent",
    borderBottom: "none"
  },
  "&:focus-within .cm-matchingBracket": {
    color: "inherit",
    backgroundColor: "var(--sys-color-surface-variant)",
    borderBottom: "1px solid var(--sys-color-outline)"
  },
  "&:focus-within .cm-nonmatchingBracket": {
    backgroundColor: "var(--sys-color-error-container)",
    borderBottom: "1px solid var(--sys-color-error)"
  },
  ".cm-trailingWhitespace": {
    backgroundColor: "var(--sys-color-error-container)"
  },
  ".cm-highlightedTab": {
    display: "inline-block",
    position: "relative",
    "&:before": {
      content: '""',
      borderBottom: "1px solid var(--sys-color-token-subtle)",
      position: "absolute",
      left: "5%",
      bottom: "50%",
      width: "90%",
      pointerEvents: "none"
    }
  },
  ".cm-highlightedSpaces:before": {
    color: "var(--sys-color-token-subtle)",
    content: "attr(data-display)",
    position: "absolute",
    pointerEvents: "none"
  },
  ".cm-placeholder": {
    color: "var(--sys-color-token-subtle)"
  },
  ".cm-completionHint": {
    color: "var(--sys-color-token-subtle)"
  },
  ".cm-tooltip": {
    boxShadow: "var(--drop-shadow)",
    backgroundColor: "var(--sys-color-neutral-container)"
  },
  ".cm-argumentHints": {
    pointerEvents: "none",
    padding: "0 4px",
    whiteSpace: "nowrap",
    lineHeight: "20px",
    marginBottom: "4px",
    width: "fit-content"
  },
  ".cm-tooltip.cm-tooltip-autocomplete > ul": {
    backgroundColor: "var(--sys-color-cdt-base-container)",
    maxHeight: "25em",
    minWidth: "16em",
    "& > li": {
      display: "flex",
      justifyContent: "space-between",
      border: "1px solid var(--sys-color-cdt-base-container)"
    },
    "& > li.cm-secondaryCompletion": {
      display: "flex",
      backgroundColor: "var(--sys-color-neutral-container)",
      borderColor: "var(--sys-color-neutral-container)",
      justifyContent: "space-between",
      "&::before": {
        content: '">"',
        fontWeight: "bold",
        color: "var(--sys-color-primary-bright)",
        marginRight: "5px"
      }
    },
    "& > li:hover": {
      backgroundColor: "var(--sys-color-state-hover-on-subtle)"
    },
    "& > li[aria-selected]": {
      backgroundColor: "var(--sys-color-tonal-container)",
      borderColor: "var(--sys-color-tonal-container)",
      "&, &.cm-secondaryCompletion::before": {
        color: "var(--sys-color-on-tonal-container)"
      },
      "&::after": {
        content: '"tab"',
        color: "var(--sys-color-primary-bright)",
        border: "1px solid var(--sys-color-primary-bright)",
        borderRadius: "2px",
        marginLeft: "5px",
        padding: "1px 3px",
        fontSize: "10px",
        lineHeight: "10px"
      }
    }
  },
  ".cm-tooltip.cm-tooltip-autocomplete.cm-conservativeCompletion > ul > li[aria-selected]": {
    backgroundColor: "var(--sys-color-cdt-base-container)",
    border: "1px dotted var(--sys-color-on-surface)",
    "&, &.cm-secondaryCompletion::before": {
      color: "var(--sys-color-on-surface)"
    },
    "&::after": {
      border: "1px solid var(--sys-color-neutral-outline)",
      color: "var(--sys-color-token-subtle)"
    }
  },
  ".cm-completionMatchedText": {
    textDecoration: "none",
    fontWeight: "bold"
  },
  ".cm-highlightedLine": {
    animation: "cm-fading-highlight 2s 0s"
  },
  "@keyframes cm-fading-highlight": {
    from: {
      backgroundColor: "var(--sys-color-yellow-container)"
    },
    to: {
      backgroundColor: "transparent"
    }
  }
});

// gen/front_end/ui/components/text_editor/config.js
var LINES_TO_SCAN_FOR_INDENTATION_GUESSING = 1e3;
var RECOMPUTE_INDENT_MAX_SIZE = 200;
var UIStrings = {
  /**
   * @description Label text for the editor
   */
  codeEditor: "Code editor",
  /**
   * @description Aria alert to read the suggestion for the suggestion box when typing in text editor
   * @example {name} PH1
   * @example {2} PH2
   * @example {5} PH3
   */
  sSuggestionSOfS: "{PH1}, suggestion {PH2} of {PH3}"
};
var str_ = i18n.i18n.registerUIStrings("ui/components/text_editor/config.ts", UIStrings);
var i18nString = i18n.i18n.getLocalizedString.bind(void 0, str_);
var empty = [];
var dynamicSetting = CM3.Facet.define();
var DynamicSetting = class _DynamicSetting {
  settingName;
  getExtension;
  compartment = new CM3.Compartment();
  constructor(settingName, getExtension) {
    this.settingName = settingName;
    this.getExtension = getExtension;
  }
  settingValue() {
    return Common.Settings.Settings.instance().moduleSetting(this.settingName).get();
  }
  instance() {
    return [
      this.compartment.of(this.getExtension(this.settingValue())),
      dynamicSetting.of(this)
    ];
  }
  sync(state, value) {
    const cur = this.compartment.get(state);
    const needed = this.getExtension(value);
    return cur === needed ? null : this.compartment.reconfigure(needed);
  }
  static bool(name, enabled, disabled = empty) {
    return new _DynamicSetting(name, (val) => val ? enabled : disabled);
  }
  static none = [];
};
var tabMovesFocus = DynamicSetting.bool("text-editor-tab-moves-focus", [], CM3.keymap.of([{
  key: "Tab",
  run: (view) => view.state.doc.length ? CM3.indentMore(view) : false,
  shift: (view) => view.state.doc.length ? CM3.indentLess(view) : false
}]));
var disableConservativeCompletion = CM3.StateEffect.define();
var conservativeCompletion = CM3.StateField.define({
  create() {
    return true;
  },
  update(value, tr) {
    if (CM3.completionStatus(tr.state) !== "active") {
      return true;
    }
    if ((CM3.selectedCompletionIndex(tr.startState) ?? 0) !== (CM3.selectedCompletionIndex(tr.state) ?? 0) || tr.effects.some((e) => e.is(disableConservativeCompletion))) {
      return false;
    }
    return value;
  }
});
function acceptCompletionIfNotConservative(view) {
  return !view.state.field(conservativeCompletion, false) && CM3.acceptCompletion(view);
}
function acceptCompletionIfAtEndOfLine(view) {
  const cursorPosition = view.state.selection.main.head;
  const line = view.state.doc.lineAt(cursorPosition);
  const column = cursorPosition - line.from;
  const isCursorAtEndOfLine = column >= line.length;
  if (isCursorAtEndOfLine) {
    return CM3.acceptCompletion(view);
  }
  return false;
}
function moveCompletionSelectionIfNotConservative(forward, by = "option") {
  return (view) => {
    if (CM3.completionStatus(view.state) !== "active") {
      return false;
    }
    if (view.state.field(conservativeCompletion, false)) {
      view.dispatch({ effects: disableConservativeCompletion.of(null) });
      announceSelectedCompletionInfo(view);
      return true;
    }
    const moveSelectionResult = CM3.moveCompletionSelection(forward, by)(view);
    announceSelectedCompletionInfo(view);
    return moveSelectionResult;
  };
}
function moveCompletionSelectionBackwardWrapper() {
  return (view) => {
    if (CM3.completionStatus(view.state) !== "active") {
      return false;
    }
    CM3.moveCompletionSelection(false)(view);
    announceSelectedCompletionInfo(view);
    return true;
  };
}
function announceSelectedCompletionInfo(view) {
  const ariaMessage = i18nString(UIStrings.sSuggestionSOfS, {
    PH1: CM3.selectedCompletion(view.state)?.label || "",
    PH2: (CM3.selectedCompletionIndex(view.state) || 0) + 1,
    PH3: CM3.currentCompletions(view.state).length
  });
  UI.ARIAUtils.LiveAnnouncer.alert(ariaMessage);
}
var autocompletion2 = new DynamicSetting("text-editor-autocompletion", (activateOnTyping) => [
  CM3.autocompletion({
    activateOnTyping,
    icons: false,
    optionClass: (option) => option.type === "secondary" ? "cm-secondaryCompletion" : "",
    tooltipClass: (state) => {
      return state.field(conservativeCompletion, false) ? "cm-conservativeCompletion" : "";
    },
    defaultKeymap: false,
    updateSyncTime: 100
  }),
  CM3.Prec.highest(CM3.keymap.of([
    { key: "End", run: acceptCompletionIfAtEndOfLine },
    { key: "ArrowRight", run: acceptCompletionIfAtEndOfLine },
    { key: "Ctrl-Space", run: CM3.startCompletion },
    { key: "Escape", run: CM3.closeCompletion },
    { key: "ArrowDown", run: moveCompletionSelectionIfNotConservative(true) },
    { key: "ArrowUp", run: moveCompletionSelectionBackwardWrapper() },
    { mac: "Ctrl-n", run: moveCompletionSelectionIfNotConservative(true) },
    { mac: "Ctrl-p", run: moveCompletionSelectionBackwardWrapper() },
    { key: "PageDown", run: CM3.moveCompletionSelection(true, "page") },
    { key: "PageUp", run: CM3.moveCompletionSelection(false, "page") },
    { key: "Enter", run: acceptCompletionIfNotConservative }
  ]))
]);
var bracketMatching2 = DynamicSetting.bool("text-editor-bracket-matching", CM3.bracketMatching());
var codeFolding = DynamicSetting.bool("text-editor-code-folding", [
  CM3.foldGutter({
    markerDOM(open) {
      const iconName = open ? "triangle-down" : "triangle-right";
      const icon = new Icon.Icon.Icon();
      icon.setAttribute("class", open ? "cm-foldGutterElement" : "cm-foldGutterElement cm-foldGutterElement-folded");
      icon.setAttribute("jslog", `${VisualLogging.expand().track({ click: true })}`);
      icon.name = iconName;
      icon.classList.add("small");
      return icon;
    }
  }),
  CM3.keymap.of(CM3.foldKeymap)
]);
var AutoDetectIndent = CM3.StateField.define({
  create: (state) => detectIndentation(state.doc),
  update: (indent, tr) => {
    return tr.docChanged && preservedLength(tr.changes) <= RECOMPUTE_INDENT_MAX_SIZE ? detectIndentation(tr.state.doc) : indent;
  },
  provide: (f) => CM3.Prec.highest(CM3.indentUnit.from(f))
});
function preservedLength(ch) {
  let len = 0;
  ch.iterGaps((_from, _to, l) => {
    len += l;
  });
  return len;
}
function detectIndentation(doc) {
  const lines = doc.iterLines(1, Math.min(doc.lines + 1, LINES_TO_SCAN_FOR_INDENTATION_GUESSING));
  const indentUnit3 = TextUtils.TextUtils.detectIndentation(lines);
  return indentUnit3 ?? Common.Settings.Settings.instance().moduleSetting("text-editor-indent").get();
}
var autoDetectIndent = DynamicSetting.bool("text-editor-auto-detect-indent", AutoDetectIndent);
function matcher(decorator) {
  return CM3.ViewPlugin.define((view) => ({
    decorations: decorator.createDeco(view),
    update(u) {
      this.decorations = decorator.updateDeco(u, this.decorations);
    }
  }), {
    decorations: (v) => v.decorations
  });
}
var WhitespaceDeco = /* @__PURE__ */ new Map();
function getWhitespaceDeco(space) {
  const cached = WhitespaceDeco.get(space);
  if (cached) {
    return cached;
  }
  const result = CM3.Decoration.mark({
    attributes: space === "	" ? {
      class: "cm-highlightedTab"
    } : { class: "cm-highlightedSpaces", "data-display": "\xB7".repeat(space.length) }
  });
  WhitespaceDeco.set(space, result);
  return result;
}
var showAllWhitespace = matcher(new CM3.MatchDecorator({
  regexp: /\t| +/g,
  decoration: (match) => getWhitespaceDeco(match[0]),
  boundary: /\S/
}));
var showTrailingWhitespace = matcher(new CM3.MatchDecorator({
  regexp: /\s+$/g,
  decoration: CM3.Decoration.mark({ class: "cm-trailingWhitespace" }),
  boundary: /\S/
}));
var showWhitespace = new DynamicSetting("show-whitespaces-in-editor", (value) => {
  if (value === "all") {
    return showAllWhitespace;
  }
  if (value === "trailing") {
    return showTrailingWhitespace;
  }
  return empty;
});
var allowScrollPastEof = DynamicSetting.bool("allow-scroll-past-eof", CM3.scrollPastEnd());
var cachedIndentUnit = /* @__PURE__ */ Object.create(null);
function getIndentUnit(indent) {
  let value = cachedIndentUnit[indent];
  if (!value) {
    value = cachedIndentUnit[indent] = CM3.indentUnit.of(indent);
  }
  return value;
}
var indentUnit2 = new DynamicSetting("text-editor-indent", getIndentUnit);
var domWordWrap = DynamicSetting.bool("dom-word-wrap", CM3.EditorView.lineWrapping);
var sourcesWordWrap = DynamicSetting.bool("sources.word-wrap", CM3.EditorView.lineWrapping);
function detectLineSeparator(text) {
  if (/\r\n/.test(text) && !/(^|[^\r])\n/.test(text)) {
    return CM3.EditorState.lineSeparator.of("\r\n");
  }
  return [];
}
var baseKeymap = CM3.keymap.of([
  { key: "Tab", run: CM3.acceptCompletion },
  { key: "Ctrl-m", run: CM3.cursorMatchingBracket, shift: CM3.selectMatchingBracket },
  { key: "Mod-/", run: CM3.toggleComment },
  { key: "Mod-d", run: CM3.selectNextOccurrence },
  { key: "Alt-ArrowLeft", mac: "Ctrl-ArrowLeft", run: CM3.cursorSyntaxLeft, shift: CM3.selectSyntaxLeft },
  { key: "Alt-ArrowRight", mac: "Ctrl-ArrowRight", run: CM3.cursorSyntaxRight, shift: CM3.selectSyntaxRight },
  { key: "Ctrl-ArrowLeft", mac: "Alt-ArrowLeft", run: CM3.cursorGroupLeft, shift: CM3.selectGroupLeft },
  { key: "Ctrl-ArrowRight", mac: "Alt-ArrowRight", run: CM3.cursorGroupRight, shift: CM3.selectGroupRight },
  ...CM3.standardKeymap,
  ...CM3.historyKeymap
]);
function themeIsDark() {
  const setting = Common.Settings.Settings.instance().moduleSetting("ui-theme").get();
  return setting === "systemPreferred" ? window.matchMedia("(prefers-color-scheme: dark)").matches : setting === "dark";
}
var dummyDarkTheme = CM3.EditorView.theme({}, { dark: true });
var themeSelection = new CM3.Compartment();
function theme() {
  return [editorTheme, themeIsDark() ? themeSelection.of(dummyDarkTheme) : themeSelection.of([])];
}
var sideBarElement = null;
function getTooltipSpace() {
  if (!sideBarElement) {
    sideBarElement = UI.UIUtils.getDevToolsBoundingElement();
  }
  return sideBarElement.getBoundingClientRect();
}
function baseConfiguration(text) {
  return [
    theme(),
    CM3.highlightSpecialChars(),
    CM3.highlightSelectionMatches(),
    CM3.history(),
    CM3.drawSelection(),
    CM3.EditorState.allowMultipleSelections.of(true),
    CM3.indentOnInput(),
    CM3.syntaxHighlighting(CodeHighlighter.CodeHighlighter.highlightStyle),
    baseKeymap,
    CM3.EditorView.clickAddsSelectionRange.of((mouseEvent) => mouseEvent.altKey || mouseEvent.ctrlKey),
    tabMovesFocus.instance(),
    bracketMatching2.instance(),
    indentUnit2.instance(),
    CM3.Prec.lowest(CM3.EditorView.contentAttributes.of({ "aria-label": i18nString(UIStrings.codeEditor) })),
    text instanceof CM3.Text ? [] : detectLineSeparator(text),
    CM3.tooltips({
      parent: getTooltipHost(),
      tooltipSpace: getTooltipSpace
    }),
    CM3.bidiIsolates()
  ];
}
var closeBrackets2 = DynamicSetting.bool("text-editor-bracket-closing", [
  CM3.html.autoCloseTags,
  CM3.closeBrackets(),
  CM3.keymap.of(CM3.closeBracketsKeymap)
]);
var tooltipHost = null;
function getTooltipHost() {
  if (!tooltipHost) {
    const styleModules = CM3.EditorState.create({
      extensions: [
        editorTheme,
        themeIsDark() ? dummyDarkTheme : [],
        CM3.syntaxHighlighting(CodeHighlighter.CodeHighlighter.highlightStyle),
        CM3.showTooltip.of({
          pos: 0,
          create() {
            return { dom: document.createElement("div") };
          }
        })
      ]
    }).facet(CM3.EditorView.styleModule);
    const host = document.body.appendChild(document.createElement("div"));
    host.className = "editor-tooltip-host";
    tooltipHost = host.attachShadow({ mode: "open" });
    CM3.StyleModule.mount(tooltipHost, styleModules);
  }
  return tooltipHost;
}
var CompletionHint = class extends CM3.WidgetType {
  text;
  constructor(text) {
    super();
    this.text = text;
  }
  eq(other) {
    return this.text === other.text;
  }
  toDOM() {
    const span = document.createElement("span");
    span.className = "cm-completionHint";
    span.textContent = this.text;
    return span;
  }
};
var showCompletionHint = CM3.ViewPlugin.fromClass(class {
  decorations = CM3.Decoration.none;
  currentHint = null;
  update(update) {
    const top = this.currentHint = this.topCompletion(update.state);
    if (!top || update.state.field(conservativeCompletion, false)) {
      this.decorations = CM3.Decoration.none;
    } else {
      this.decorations = CM3.Decoration.set([CM3.Decoration.widget({ widget: new CompletionHint(top), side: 1 }).range(update.state.selection.main.head)]);
    }
  }
  topCompletion(state) {
    const completion2 = CM3.selectedCompletion(state);
    if (!completion2) {
      return null;
    }
    let { label, apply } = completion2;
    if (typeof apply === "string") {
      label = apply;
      apply = void 0;
    }
    if (apply || label.length > 100 || label.indexOf("\n") > -1 || completion2.type === "secondary") {
      return null;
    }
    const pos = state.selection.main.head;
    const lineBefore = state.doc.lineAt(pos);
    if (pos !== lineBefore.to) {
      return null;
    }
    const partBefore = (label[0] === "'" ? /'(\\.|[^'\\])*$/ : label[0] === '"' ? /"(\\.|[^"\\])*$/ : /#?[\w$]+$/).exec(lineBefore.text);
    if (partBefore && !label.startsWith(partBefore[0])) {
      return null;
    }
    return label.slice(partBefore ? partBefore[0].length : 0);
  }
}, { decorations: (p) => p.decorations });
function contentIncludingHint(view) {
  const plugin = view.plugin(showCompletionHint);
  let content = view.state.doc.toString();
  if (plugin?.currentHint) {
    const { head } = view.state.selection.main;
    content = content.slice(0, head) + plugin.currentHint + content.slice(head);
  }
  return content;
}
var setAiAutoCompleteSuggestion = CM3.StateEffect.define();
var aiAutoCompleteSuggestionState = CM3.StateField.define({
  create: () => null,
  update(value, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setAiAutoCompleteSuggestion)) {
        if (effect.value) {
          return effect.value;
        }
        value?.clearCachedRequest();
        return null;
      }
    }
    if (!value) {
      return value;
    }
    if (value.from > tr.state.doc.length) {
      value.clearCachedRequest();
      return null;
    }
    if (tr.docChanged && tr.state.doc.length < tr.startState.doc.length) {
      value.clearCachedRequest();
      return null;
    }
    const from = tr.changes.mapPos(value.from);
    const { head } = tr.state.selection.main;
    if (tr.docChanged && head < from) {
      value.clearCachedRequest();
      return null;
    }
    const typedText = tr.state.doc.sliceString(from, head);
    return value.text.startsWith(typedText) ? value : null;
  }
});
function hasActiveAiSuggestion(state) {
  return state.field(aiAutoCompleteSuggestionState) !== null;
}
function acceptAiAutoCompleteSuggestion(view) {
  const selectedCompletion2 = CM3.selectedCompletion(view.state);
  if (selectedCompletion2) {
    return { accepted: false };
  }
  const suggestion = view.state.field(aiAutoCompleteSuggestionState);
  if (!suggestion) {
    return { accepted: false };
  }
  const { text, from } = suggestion;
  const { head } = view.state.selection.main;
  const typedText = view.state.doc.sliceString(from, head);
  if (!text.startsWith(typedText)) {
    return { accepted: false };
  }
  const remainingText = text.slice(typedText.length);
  view.dispatch({
    changes: { from: head, insert: remainingText },
    selection: { anchor: head + remainingText.length },
    effects: setAiAutoCompleteSuggestion.of(null),
    userEvent: "input.complete"
  });
  suggestion.clearCachedRequest();
  return { accepted: true, suggestion };
}
var aiAutoCompleteSuggestion = [
  aiAutoCompleteSuggestionState,
  CM3.ViewPlugin.fromClass(class {
    decorations = CM3.Decoration.none;
    #lastLoggedSuggestion = null;
    update(update) {
      if (update.state.doc.length === 0) {
        this.decorations = CM3.Decoration.none;
        return;
      }
      const activeSuggestion = update.state.field(aiAutoCompleteSuggestionState);
      if (!activeSuggestion) {
        this.decorations = CM3.Decoration.none;
        return;
      }
      if (CM3.completionStatus(update.view.state) === "pending") {
        this.decorations = CM3.Decoration.none;
        return;
      }
      const selectedCompletionIndex2 = CM3.selectedCompletionIndex(update.state);
      if (selectedCompletionIndex2 && selectedCompletionIndex2 > 0) {
        this.decorations = CM3.Decoration.none;
        return;
      }
      const { head } = update.state.selection.main;
      if (head < activeSuggestion.from) {
        this.decorations = CM3.Decoration.none;
        return;
      }
      const selectedCompletion2 = CM3.selectedCompletion(update.state);
      const additionallyTypedText = update.state.doc.sliceString(activeSuggestion.from, head);
      if (!activeSuggestion.text.startsWith(additionallyTypedText)) {
        this.decorations = CM3.Decoration.none;
        return;
      }
      let ghostText = activeSuggestion.text.slice(additionallyTypedText.length);
      if (selectedCompletion2) {
        if (selectedCompletion2.type?.includes("keyword")) {
          this.decorations = CM3.Decoration.none;
          return;
        }
        const overlappingText = TextUtils.TextUtils.getOverlap(selectedCompletion2.label, ghostText) ?? "";
        const lineAtAiSuggestion = update.state.doc.lineAt(activeSuggestion.from).text;
        const overlapsWithSelectedCompletion = (lineAtAiSuggestion + overlappingText).endsWith(selectedCompletion2.label);
        if (!overlapsWithSelectedCompletion) {
          this.decorations = CM3.Decoration.none;
          return;
        }
      }
      const currentMenuHint = update.view.plugin(showCompletionHint)?.currentHint;
      const conservativeCompletionEnabled = update.state.field(conservativeCompletion, false);
      if (!conservativeCompletionEnabled && currentMenuHint) {
        ghostText = ghostText.slice(currentMenuHint.length);
      }
      this.decorations = CM3.Decoration.set([CM3.Decoration.widget({ widget: new CompletionHint(ghostText), side: 1 }).range(head)]);
      this.#registerImpressionIfNeeded(activeSuggestion);
    }
    #registerImpressionIfNeeded(activeSuggestion) {
      if (!activeSuggestion.rpcGlobalId) {
        return;
      }
      if (this.#lastLoggedSuggestion?.rpcGlobalId === activeSuggestion?.rpcGlobalId && this.#lastLoggedSuggestion?.sampleId === activeSuggestion?.sampleId) {
        return;
      }
      const latency = performance.now() - activeSuggestion.startTime;
      activeSuggestion.onImpression(activeSuggestion.rpcGlobalId, latency, activeSuggestion.sampleId);
      this.#lastLoggedSuggestion = activeSuggestion;
    }
  }, { decorations: (p) => p.decorations })
];

// gen/front_end/ui/components/text_editor/AiCodeCompletionProvider.js
var AiCodeCompletionTeaserMode;
(function(AiCodeCompletionTeaserMode2) {
  AiCodeCompletionTeaserMode2["OFF"] = "off";
  AiCodeCompletionTeaserMode2["ON"] = "on";
  AiCodeCompletionTeaserMode2["ONLY_SHOW_ON_EMPTY"] = "onlyShowOnEmpty";
})(AiCodeCompletionTeaserMode || (AiCodeCompletionTeaserMode = {}));
var setAiCodeCompletionTeaserMode = CodeMirror.StateEffect.define();
var aiCodeCompletionTeaserModeState = CodeMirror.StateField.define({
  create: () => AiCodeCompletionTeaserMode.OFF,
  update(value, tr) {
    return tr.effects.find((effect) => effect.is(setAiCodeCompletionTeaserMode))?.value ?? value;
  }
});
var DELAY_BEFORE_SHOWING_RESPONSE_MS = 500;
var AIDA_REQUEST_DEBOUNCE_TIMEOUT_MS = 200;
var AiCodeCompletionProvider = class {
  #aidaClient;
  #aiCodeCompletionSetting = Common2.Settings.Settings.instance().createSetting("ai-code-completion-enabled", false);
  #aiCodeCompletionTeaserDismissedSetting = Common2.Settings.Settings.instance().createSetting("ai-code-completion-teaser-dismissed", false);
  #teaserCompartment = new CodeMirror.Compartment();
  #teaser;
  #suggestionRenderingTimeout;
  #editor;
  #aiCodeCompletionConfig;
  #boundOnUpdateAiCodeCompletionState = this.#updateAiCodeCompletionState.bind(this);
  constructor(aiCodeCompletionConfig) {
    if (!this.#isAiCodeCompletionEnabled()) {
      throw new Error("AI code completion feature is not enabled.");
    }
    this.#aiCodeCompletionConfig = aiCodeCompletionConfig;
  }
  extension() {
    return [
      this.#teaserCompartment.of([]),
      aiAutoCompleteSuggestion,
      aiCodeCompletionTeaserModeState,
      aiAutoCompleteSuggestionState
    ];
  }
  dispose() {
    this.#detachTeaser();
    this.#teaser = void 0;
    this.#aiCodeCompletionSetting.removeChangeListener(this.#boundOnUpdateAiCodeCompletionState);
    Host.AidaClient.HostConfigTracker.instance().removeEventListener("aidaAvailabilityChanged", this.#boundOnUpdateAiCodeCompletionState);
    this.#cleanupAiCodeCompletion();
  }
  editorInitialized(editor) {
    this.#editor = editor;
    if (!this.#aiCodeCompletionSetting.get() && !this.#aiCodeCompletionTeaserDismissedSetting.get()) {
      this.#teaser = new PanelCommon.AiCodeCompletionTeaser({
        onDetach: () => this.#detachTeaser.bind(this)
      });
      this.#editor.editor.dispatch({ effects: this.#teaserCompartment.reconfigure([aiCodeCompletionTeaserExtension(this.#teaser)]) });
    }
    Host.AidaClient.HostConfigTracker.instance().addEventListener("aidaAvailabilityChanged", this.#boundOnUpdateAiCodeCompletionState);
    this.#aiCodeCompletionSetting.addChangeListener(this.#boundOnUpdateAiCodeCompletionState);
    void this.#updateAiCodeCompletionState();
  }
  #setupAiCodeCompletion() {
    if (!this.#editor || !this.#aiCodeCompletionConfig) {
      return;
    }
    if (!this.#aidaClient) {
      this.#aidaClient = new Host.AidaClient.AidaClient();
    }
    this.#aiCodeCompletionConfig.onFeatureEnabled();
  }
  #cleanupAiCodeCompletion() {
    if (this.#suggestionRenderingTimeout) {
      clearTimeout(this.#suggestionRenderingTimeout);
      this.#suggestionRenderingTimeout = void 0;
    }
    this.#editor?.dispatch({
      effects: setAiAutoCompleteSuggestion.of(null)
    });
    this.#aiCodeCompletionConfig?.onFeatureDisabled();
  }
  async #updateAiCodeCompletionState() {
    const aidaAvailability = await Host.AidaClient.AidaClient.checkAccessPreconditions();
    const isAvailable = aidaAvailability === "available";
    const isEnabled = this.#aiCodeCompletionSetting.get();
    if (isAvailable && isEnabled) {
      this.#detachTeaser();
      this.#setupAiCodeCompletion();
    } else if (isAvailable && !isEnabled) {
      if (this.#teaser && !this.#aiCodeCompletionTeaserDismissedSetting.get()) {
        this.#editor?.editor.dispatch({ effects: this.#teaserCompartment.reconfigure([aiCodeCompletionTeaserExtension(this.#teaser)]) });
      }
      this.#cleanupAiCodeCompletion();
    } else if (!isAvailable) {
      this.#detachTeaser();
      this.#cleanupAiCodeCompletion();
    }
  }
  #detachTeaser() {
    if (!this.#teaser) {
      return;
    }
    this.#editor?.editor.dispatch({ effects: this.#teaserCompartment.reconfigure([]) });
  }
  // TODO(samiyac): Define static method in AiCodeCompletion and use that instead
  #isAiCodeCompletionEnabled() {
    const devtoolsLocale = i18n3.DevToolsLocale.DevToolsLocale.instance();
    const aidaAvailability = Root.Runtime.hostConfig.aidaAvailability;
    if (!devtoolsLocale.locale.startsWith("en-")) {
      return false;
    }
    if (!aidaAvailability || aidaAvailability.blockedByGeo || aidaAvailability.blockedByAge || aidaAvailability.blockedByEnterprisePolicy) {
      return false;
    }
    return Boolean(aidaAvailability.enabled && Root.Runtime.hostConfig.devToolsAiCodeCompletion?.enabled);
  }
};
function aiCodeCompletionTeaserExtension(teaser) {
  return CodeMirror.ViewPlugin.fromClass(class {
    view;
    teaser;
    #teaserDecoration = CodeMirror.Decoration.none;
    #teaserMode;
    #teaserDisplayTimeout;
    constructor(view) {
      this.view = view;
      this.teaser = teaser;
      this.#teaserMode = view.state.field(aiCodeCompletionTeaserModeState);
      this.#setupDecoration();
    }
    destroy() {
      window.clearTimeout(this.#teaserDisplayTimeout);
    }
    update(update) {
      const currentTeaserMode = update.state.field(aiCodeCompletionTeaserModeState);
      if (currentTeaserMode !== this.#teaserMode) {
        this.#teaserMode = currentTeaserMode;
        this.#setupDecoration();
        return;
      }
      if (this.#teaserMode === AiCodeCompletionTeaserMode.ONLY_SHOW_ON_EMPTY && update.docChanged) {
        this.#updateTeaserDecorationForOnlyShowOnEmptyMode();
      } else if (this.#teaserMode === AiCodeCompletionTeaserMode.ON) {
        if (update.docChanged) {
          this.#teaserDecoration = CodeMirror.Decoration.none;
          window.clearTimeout(this.#teaserDisplayTimeout);
          this.#updateTeaserDecorationForOnMode();
        } else if (update.selectionSet && update.state.doc.length > 0) {
          this.#teaserDecoration = CodeMirror.Decoration.none;
        }
      }
    }
    get decorations() {
      return this.#teaserDecoration;
    }
    #setupDecoration() {
      switch (this.#teaserMode) {
        case AiCodeCompletionTeaserMode.ON:
          this.#updateTeaserDecorationForOnModeImmediately();
          return;
        case AiCodeCompletionTeaserMode.ONLY_SHOW_ON_EMPTY:
          this.#updateTeaserDecorationForOnlyShowOnEmptyMode();
          return;
        case AiCodeCompletionTeaserMode.OFF:
          this.#teaserDecoration = CodeMirror.Decoration.none;
          return;
      }
    }
    #updateTeaserDecorationForOnlyShowOnEmptyMode() {
      if (this.view.state.doc.length === 0) {
        this.#addTeaserWidget(0);
      } else {
        this.#teaserDecoration = CodeMirror.Decoration.none;
      }
    }
    #updateTeaserDecorationForOnMode = Common2.Debouncer.debounce(() => {
      this.#teaserDisplayTimeout = window.setTimeout(() => {
        this.#updateTeaserDecorationForOnModeImmediately();
        this.view.dispatch({});
      }, DELAY_BEFORE_SHOWING_RESPONSE_MS);
    }, AIDA_REQUEST_DEBOUNCE_TIMEOUT_MS);
    #updateTeaserDecorationForOnModeImmediately() {
      const cursorPosition = this.view.state.selection.main.head;
      const line = this.view.state.doc.lineAt(cursorPosition);
      if (cursorPosition >= line.to) {
        this.#addTeaserWidget(cursorPosition);
      }
    }
    #addTeaserWidget(pos) {
      this.#teaserDecoration = CodeMirror.Decoration.set([
        CodeMirror.Decoration.widget({ widget: new AiCodeCompletionTeaserPlaceholder(this.teaser), side: 1 }).range(pos)
      ]);
    }
  }, {
    decorations: (v) => v.decorations,
    eventHandlers: {
      mousedown(event) {
        return event.target instanceof Node && teaser.contentElement.contains(event.target);
      },
      keydown(event) {
        if (!UI2.KeyboardShortcut.KeyboardShortcut.eventHasCtrlEquivalentKey(event) || !teaser.isShowing()) {
          return false;
        }
        if (event.key === "i") {
          event.consume(true);
          void VisualLogging2.logKeyDown(event.currentTarget, event, "ai-code-completion-teaser.fre");
          void this.teaser.onAction(event);
          return true;
        }
        if (event.key === "x") {
          event.consume(true);
          void VisualLogging2.logKeyDown(event.currentTarget, event, "ai-code-completion-teaser.dismiss");
          this.teaser.onDismiss(event);
          return true;
        }
        return false;
      }
    }
  });
}

// gen/front_end/ui/components/text_editor/AutocompleteHistory.js
var AutocompleteHistory_exports = {};
__export(AutocompleteHistory_exports, {
  AutocompleteHistory: () => AutocompleteHistory
});
var AutocompleteHistory = class _AutocompleteHistory {
  static #historySize = 300;
  #setting;
  /**
   * The data mirrors the setting. We have the mirror for 2 reasons:
   *   1) The setting is size limited
   *   2) We track the user's current input, even though it's not committed yet.
   */
  #data = [];
  /** 1-based entry in the history stack. */
  #historyOffset = 1;
  #uncommittedIsTop = false;
  /**
   * Creates a new settings-backed history. The class assumes it has sole
   * ownership of the setting.
   */
  constructor(setting) {
    this.#setting = setting;
    this.#data = this.#setting.get();
  }
  clear() {
    this.#data = [];
    this.#setting.set([]);
    this.#historyOffset = 1;
  }
  length() {
    return this.#data.length;
  }
  /**
   * Pushes a committed text into the history.
   */
  pushHistoryItem(text) {
    if (this.#uncommittedIsTop) {
      this.#data.pop();
      this.#uncommittedIsTop = false;
    }
    this.#historyOffset = 1;
    if (text !== this.#currentHistoryItem()) {
      this.#data.push(text);
    }
    this.#store();
  }
  /**
   * Pushes the current (uncommitted) text into the history.
   */
  #pushCurrentText(currentText) {
    if (this.#uncommittedIsTop) {
      this.#data.pop();
    }
    this.#uncommittedIsTop = true;
    this.#data.push(currentText);
  }
  previous(currentText) {
    if (this.#historyOffset > this.#data.length) {
      return void 0;
    }
    if (this.#historyOffset === 1) {
      this.#pushCurrentText(currentText);
    }
    ++this.#historyOffset;
    return this.#currentHistoryItem();
  }
  next() {
    if (this.#historyOffset === 1) {
      return void 0;
    }
    --this.#historyOffset;
    return this.#currentHistoryItem();
  }
  /** Returns a de-duplicated list of history entries that start with the specified prefix */
  matchingEntries(prefix, limit = 50) {
    const result = /* @__PURE__ */ new Set();
    for (let i = this.#data.length - 1; i >= 0 && result.size < limit; --i) {
      const entry = this.#data[i];
      if (entry.startsWith(prefix)) {
        result.add(entry);
      }
    }
    return result;
  }
  #currentHistoryItem() {
    return this.#data[this.#data.length - this.#historyOffset];
  }
  #store() {
    this.#setting.set(this.#data.slice(-_AutocompleteHistory.#historySize));
  }
};

// gen/front_end/ui/components/text_editor/ExecutionPositionHighlighter.js
var ExecutionPositionHighlighter_exports = {};
__export(ExecutionPositionHighlighter_exports, {
  clearHighlightedPosition: () => clearHighlightedPosition,
  positionHighlighter: () => positionHighlighter,
  setHighlightedPosition: () => setHighlightedPosition
});
import * as CodeMirror2 from "./../../../third_party/codemirror.next/codemirror.next.js";
var setHighlightedPosition = CodeMirror2.StateEffect.define();
var clearHighlightedPosition = CodeMirror2.StateEffect.define();
function positionHighlighter(executionLineClassName, executionTokenClassName) {
  const executionLine = CodeMirror2.Decoration.line({ attributes: { class: executionLineClassName } });
  const executionToken = CodeMirror2.Decoration.mark({ attributes: { class: executionTokenClassName } });
  const positionHighlightedState = CodeMirror2.StateField.define({
    create() {
      return null;
    },
    update(pos, tr) {
      if (pos) {
        pos = tr.changes.mapPos(pos, -1, CodeMirror2.MapMode.TrackDel);
      }
      for (const effect of tr.effects) {
        if (effect.is(clearHighlightedPosition)) {
          pos = null;
        } else if (effect.is(setHighlightedPosition)) {
          pos = Math.max(0, Math.min(effect.value, tr.newDoc.length - 1));
        }
      }
      return pos;
    }
  });
  function getHighlightedPosition(state) {
    return state.field(positionHighlightedState);
  }
  class PositionHighlighter {
    tree;
    decorations;
    constructor({ state }) {
      this.tree = CodeMirror2.syntaxTree(state);
      this.decorations = this.#computeDecorations(state, getHighlightedPosition(state));
    }
    update(update) {
      const tree = CodeMirror2.syntaxTree(update.state);
      const position = getHighlightedPosition(update.state);
      const positionChanged = position !== getHighlightedPosition(update.startState);
      if (tree.length !== this.tree.length || positionChanged) {
        this.tree = tree;
        this.decorations = this.#computeDecorations(update.state, position);
      } else {
        this.decorations = this.decorations.map(update.changes);
      }
    }
    #computeDecorations(state, position) {
      const builder = new CodeMirror2.RangeSetBuilder();
      if (position !== null) {
        const { doc } = state;
        const line = doc.lineAt(position);
        builder.add(line.from, line.from, executionLine);
        const syntaxTree3 = CodeMirror2.syntaxTree(state);
        const syntaxNode = syntaxTree3.resolveInner(position, 1);
        const tokenEnd = Math.min(line.to, syntaxNode.to);
        if (tokenEnd > position) {
          builder.add(position, tokenEnd, executionToken);
        }
      }
      return builder.finish();
    }
  }
  const positionHighlighterSpec = {
    decorations: ({ decorations }) => decorations
  };
  return [
    positionHighlightedState,
    CodeMirror2.ViewPlugin.fromClass(PositionHighlighter, positionHighlighterSpec)
  ];
}

// gen/front_end/ui/components/text_editor/javascript.js
var javascript_exports = {};
__export(javascript_exports, {
  argumentHints: () => argumentHints,
  argumentsList: () => argumentsList,
  closeArgumentsHintsTooltip: () => closeArgumentsHintsTooltip,
  completeInContext: () => completeInContext,
  completion: () => completion,
  getQueryType: () => getQueryType,
  isExpressionComplete: () => isExpressionComplete,
  javascriptCompletionSource: () => javascriptCompletionSource
});
import * as SDK from "./../../../core/sdk/sdk.js";
import * as Bindings from "./../../../models/bindings/bindings.js";
import * as JavaScriptMetaData from "./../../../models/javascript_metadata/javascript_metadata.js";
import * as SourceMapScopes from "./../../../models/source_map_scopes/source_map_scopes.js";
import * as CodeMirror4 from "./../../../third_party/codemirror.next/codemirror.next.js";
import * as UI3 from "./../../legacy/legacy.js";

// gen/front_end/ui/components/text_editor/cursor_tooltip.js
import * as CodeMirror3 from "./../../../third_party/codemirror.next/codemirror.next.js";
var closeTooltip = CodeMirror3.StateEffect.define();
function cursorTooltip(source) {
  const openTooltip = CodeMirror3.StateEffect.define();
  const state = CodeMirror3.StateField.define({
    create() {
      return null;
    },
    update(val, tr) {
      if (tr.selection) {
        val = null;
      }
      if (val && !tr.changes.empty) {
        const newPos = tr.changes.mapPos(val.pos, -1, CodeMirror3.MapMode.TrackDel);
        val = newPos === null ? null : { pos: newPos, create: val.create, above: true };
      }
      for (const effect of tr.effects) {
        if (effect.is(openTooltip)) {
          val = { pos: tr.state.selection.main.from, create: effect.value, above: true };
        } else if (effect.is(closeTooltip)) {
          val = null;
        }
      }
      return val;
    },
    provide: (field) => CodeMirror3.showTooltip.from(field)
  });
  const plugin = CodeMirror3.ViewPlugin.fromClass(class {
    pending = -1;
    updateID = 0;
    update(update) {
      this.updateID++;
      if (update.transactions.some((tr) => tr.selection) && update.state.selection.main.empty) {
        this.#scheduleUpdate(update.view);
      }
    }
    #scheduleUpdate(view) {
      if (this.pending > -1) {
        clearTimeout(this.pending);
      }
      this.pending = window.setTimeout(() => this.#startUpdate(view), 50);
    }
    #startUpdate(view) {
      this.pending = -1;
      const { main } = view.state.selection;
      if (main.empty) {
        const { updateID } = this;
        void source(view.state, main.from).then((tooltip) => {
          if (this.updateID !== updateID) {
            if (this.pending < 0) {
              this.#scheduleUpdate(view);
            }
          } else if (tooltip) {
            view.dispatch({ effects: openTooltip.of(tooltip) });
          } else {
            view.dispatch({ effects: closeTooltip.of(null) });
          }
        });
      }
    }
  });
  return [state, plugin];
}

// gen/front_end/ui/components/text_editor/javascript.js
function completion() {
  return CodeMirror4.javascript.javascriptLanguage.data.of({
    autocomplete: javascriptCompletionSource
  });
}
async function completeInContext(textBefore, query, force = false) {
  const state = CodeMirror4.EditorState.create({
    doc: textBefore + query,
    selection: { anchor: textBefore.length },
    extensions: CodeMirror4.javascript.javascriptLanguage
  });
  const result = await javascriptCompletionSource(new CodeMirror4.CompletionContext(state, state.doc.length, force));
  return result ? result.options.filter((o) => o.label.startsWith(query)).map((o) => ({
    text: o.label,
    priority: 100 + (o.boost || 0),
    isSecondary: o.type === "secondary"
  })) : [];
}
var CompletionSet = class _CompletionSet {
  completions;
  seen;
  constructor(completions = [], seen = /* @__PURE__ */ new Set()) {
    this.completions = completions;
    this.seen = seen;
  }
  add(completion2) {
    if (!this.seen.has(completion2.label)) {
      this.seen.add(completion2.label);
      this.completions.push(completion2);
    }
  }
  copy() {
    return new _CompletionSet(this.completions.slice(), new Set(this.seen));
  }
};
var javascriptKeywords = [
  "async",
  "await",
  "break",
  "case",
  "catch",
  "class",
  "const",
  "continue",
  "debugger",
  "default",
  "delete",
  "do",
  "else",
  "export",
  "extends",
  "false",
  "finally",
  "for",
  "function",
  "if",
  "import",
  "in",
  "instanceof",
  "let",
  "new",
  "null",
  "of",
  "return",
  "static",
  "super",
  "switch",
  "this",
  "throw",
  "true",
  "try",
  "typeof",
  "var",
  "void",
  "while",
  "with",
  "yield"
];
var consoleBuiltinFunctions = [
  "clear",
  "copy",
  "debug",
  "dir",
  "dirxml",
  "getEventListeners",
  "inspect",
  "keys",
  "monitor",
  "monitorEvents",
  "profile",
  "profileEnd",
  "queryObjects",
  "table",
  "undebug",
  "unmonitor",
  "unmonitorEvents",
  "values"
];
var consoleBuiltinVariables = ["$", "$$", "$x", "$0", "$_"];
var baseCompletions = new CompletionSet();
for (const kw of javascriptKeywords) {
  baseCompletions.add({ label: kw, type: "keyword" });
}
for (const builtin of consoleBuiltinFunctions) {
  baseCompletions.add({ label: builtin, type: "function" });
}
for (const varName of consoleBuiltinVariables) {
  baseCompletions.add({ label: varName, type: "variable" });
}
var dontCompleteIn = /* @__PURE__ */ new Set([
  "TemplateString",
  "LineComment",
  "BlockComment",
  "TypeDefinition",
  "VariableDefinition",
  "PropertyDefinition",
  "TypeName"
]);
function getQueryType(tree, pos, doc) {
  let node = tree.resolveInner(pos, -1);
  const parent = node.parent;
  if (dontCompleteIn.has(node.name)) {
    return null;
  }
  if (node.name === "PropertyName" || node.name === "PrivatePropertyName") {
    return parent?.name !== "MemberExpression" ? null : { type: 1, from: node.from, relatedNode: parent };
  }
  if (node.name === "VariableName" || // Treat alphabetic keywords as variables
  !node.firstChild && node.to - node.from < 20 && !/[^a-z]/.test(doc.sliceString(node.from, node.to))) {
    return { type: 0, from: node.from };
  }
  if (node.name === "String") {
    const parent2 = node.parent;
    return parent2?.name === "MemberExpression" && parent2.childBefore(node.from)?.name === "[" ? { type: 2, from: node.from, relatedNode: parent2 } : null;
  }
  node = node.enterUnfinishedNodesBefore(pos);
  if (node.to === pos && node.parent?.name === "MemberExpression") {
    node = node.parent;
  }
  if (node.name === "MemberExpression") {
    const before = node.childBefore(Math.min(pos, node.to));
    if (before?.name === "[") {
      return { type: 2, relatedNode: node };
    }
    if (before?.name === "." || before?.name === "?.") {
      return { type: 1, relatedNode: node };
    }
  }
  if (node.name === "(") {
    if (parent?.name === "ArgList" && parent?.parent?.name === "CallExpression") {
      const callReceiver = parent?.parent?.firstChild;
      if (callReceiver?.name === "MemberExpression") {
        const propertyExpression = callReceiver?.lastChild;
        if (propertyExpression && doc.sliceString(propertyExpression.from, propertyExpression.to) === "get") {
          const potentiallyMapObject = callReceiver?.firstChild;
          return { type: 3, relatedNode: potentiallyMapObject || void 0 };
        }
      }
    }
  }
  return {
    type: 0
    /* QueryType.EXPRESSION */
  };
}
async function javascriptCompletionSource(cx) {
  const query = getQueryType(CodeMirror4.syntaxTree(cx.state), cx.pos, cx.state.doc);
  if (!query || query.from === void 0 && !cx.explicit && query.type === 0) {
    return null;
  }
  const script = getExecutionContext()?.debuggerModel.selectedCallFrame()?.script;
  if (script && Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().pluginManager.hasPluginForScript(script)) {
    return null;
  }
  let result;
  let quote = void 0;
  if (query.type === 0) {
    const [scope, global] = await Promise.all([
      completeExpressionInScope(),
      completeExpressionGlobal()
    ]);
    if (scope.completions.length) {
      result = scope;
      for (const r of global.completions) {
        result.add(r);
      }
    } else {
      result = global;
    }
  } else if (query.type === 1 || query.type === 2) {
    const objectExpr = query.relatedNode.getChild("Expression");
    if (query.type === 2) {
      quote = query.from === void 0 ? "'" : cx.state.sliceDoc(query.from, query.from + 1);
    }
    if (!objectExpr) {
      return null;
    }
    result = await completeProperties(cx.state.sliceDoc(objectExpr.from, objectExpr.to), quote, cx.state.sliceDoc(cx.pos, cx.pos + 1) === "]");
  } else if (query.type === 3) {
    const potentialMapObject = query.relatedNode;
    if (!potentialMapObject) {
      return null;
    }
    result = await maybeCompleteKeysFromMap(cx.state.sliceDoc(potentialMapObject.from, potentialMapObject.to));
  } else {
    return null;
  }
  return {
    from: query.from ?? cx.pos,
    options: result.completions,
    validFor: !quote ? SPAN_IDENT : quote === "'" ? SPAN_SINGLE_QUOTE : SPAN_DOUBLE_QUOTE
  };
}
var SPAN_IDENT = /^#?(?:[$_\p{ID_Start}])(?:[$_\u200C\u200D\p{ID_Continue}])*$/u;
var SPAN_SINGLE_QUOTE = /^\'(\\.|[^\\'\n])*'?$/;
var SPAN_DOUBLE_QUOTE = /^"(\\.|[^\\"\n])*"?$/;
function getExecutionContext() {
  return UI3.Context.Context.instance().flavor(SDK.RuntimeModel.ExecutionContext);
}
async function evaluateExpression(context, expression, group) {
  const result = await context.evaluate({
    expression,
    objectGroup: group,
    includeCommandLineAPI: true,
    silent: true,
    returnByValue: false,
    generatePreview: false,
    throwOnSideEffect: true,
    timeout: 500,
    replMode: true
  }, false, false);
  if ("error" in result || result.exceptionDetails || !result.object) {
    return null;
  }
  return result.object;
}
var primitivePrototypes = /* @__PURE__ */ new Map([
  ["string", "String"],
  ["symbol", "Symbol"],
  ["number", "Number"],
  ["boolean", "Boolean"],
  ["bigint", "BigInt"]
]);
var maxCacheAge = 3e4;
var cacheInstance = null;
var PropertyCache = class _PropertyCache {
  #cache = /* @__PURE__ */ new Map();
  constructor() {
    const clear = () => this.#cache.clear();
    SDK.TargetManager.TargetManager.instance().addModelListener(SDK.ConsoleModel.ConsoleModel, SDK.ConsoleModel.Events.CommandEvaluated, clear);
    UI3.Context.Context.instance().addFlavorChangeListener(SDK.RuntimeModel.ExecutionContext, clear);
    SDK.TargetManager.TargetManager.instance().addModelListener(SDK.DebuggerModel.DebuggerModel, SDK.DebuggerModel.Events.DebuggerResumed, clear);
    SDK.TargetManager.TargetManager.instance().addModelListener(SDK.DebuggerModel.DebuggerModel, SDK.DebuggerModel.Events.DebuggerPaused, clear);
  }
  get(expression) {
    return this.#cache.get(expression);
  }
  set(expression, value) {
    this.#cache.set(expression, value);
    window.setTimeout(() => {
      if (this.#cache.get(expression) === value) {
        this.#cache.delete(expression);
      }
    }, maxCacheAge);
  }
  static instance() {
    if (!cacheInstance) {
      cacheInstance = new _PropertyCache();
    }
    return cacheInstance;
  }
};
async function maybeCompleteKeysFromMap(objectVariable) {
  const result = new CompletionSet();
  const context = getExecutionContext();
  if (!context) {
    return result;
  }
  const maybeRetrieveKeys = await evaluateExpression(context, `[...Map.prototype.keys.call(${objectVariable})]`, "completion");
  if (!maybeRetrieveKeys) {
    return result;
  }
  const properties = SDK.RemoteObject.RemoteArray.objectAsArray(maybeRetrieveKeys);
  const numProperties = properties.length();
  for (let i = 0; i < numProperties; i++) {
    result.add({
      label: `"${(await properties.at(i)).value}")`,
      type: "constant",
      boost: i * -1
    });
  }
  return result;
}
async function completeProperties(expression, quoted, hasBracket = false) {
  const cache = PropertyCache.instance();
  if (!quoted) {
    const cached = cache.get(expression);
    if (cached) {
      return await cached;
    }
  }
  const context = getExecutionContext();
  if (!context) {
    return new CompletionSet();
  }
  const result = completePropertiesInner(expression, context, quoted, hasBracket);
  if (!quoted) {
    cache.set(expression, result);
  }
  return await result;
}
async function completePropertiesInner(expression, context, quoted, hasBracket = false) {
  const result = new CompletionSet();
  if (!context) {
    return result;
  }
  let object = await evaluateExpression(context, expression, "completion");
  if (!object) {
    return result;
  }
  while (object.type === "object" && object.subtype === "proxy") {
    const properties = await object.getOwnProperties(false);
    const innerObject = properties.internalProperties?.find((p) => p.name === "[[Target]]")?.value;
    if (!innerObject) {
      break;
    }
    object = innerObject;
  }
  const toPrototype = primitivePrototypes.get(object.type);
  if (toPrototype) {
    object = await evaluateExpression(context, toPrototype + ".prototype", "completion");
  }
  const functionType = expression === "globalThis" ? "function" : "method";
  const otherType = expression === "globalThis" ? "variable" : "property";
  if (object && (object.type === "object" || object.type === "function")) {
    const properties = await object.getAllProperties(
      /* accessorPropertiesOnly */
      false,
      /* generatePreview */
      false,
      /* nonIndexedPropertiesOnly */
      true
    );
    const isFunction = object.type === "function";
    for (const prop of properties.properties || []) {
      if (!prop.symbol && !(isFunction && (prop.name === "arguments" || prop.name === "caller")) && (quoted || SPAN_IDENT.test(prop.name))) {
        const label = quoted ? quoted + prop.name.replaceAll("\\", "\\\\").replaceAll(quoted, "\\" + quoted) + quoted : prop.name;
        const apply = quoted && !hasBracket ? `${label}]` : void 0;
        const boost = 2 * Number(prop.isOwn) + 1 * Number(prop.enumerable);
        const type = prop.value?.type === "function" ? functionType : otherType;
        result.add({ apply, label, type, boost });
      }
    }
  }
  context.runtimeModel.releaseObjectGroup("completion");
  return result;
}
async function completeExpressionInScope() {
  const result = new CompletionSet();
  const selectedFrame = getExecutionContext()?.debuggerModel.selectedCallFrame();
  if (!selectedFrame) {
    return result;
  }
  const scopes = await Promise.all(selectedFrame.scopeChain().map((scope) => SourceMapScopes.NamesResolver.resolveScopeInObject(scope).getAllProperties(false, false)));
  for (const scope of scopes) {
    for (const property of scope.properties || []) {
      result.add({
        label: property.name,
        type: property.value?.type === "function" ? "function" : "variable"
      });
    }
  }
  return result;
}
async function completeExpressionGlobal() {
  const cache = PropertyCache.instance();
  const cached = cache.get("");
  if (cached) {
    return await cached;
  }
  const context = getExecutionContext();
  if (!context) {
    return baseCompletions;
  }
  const result = baseCompletions.copy();
  const fetchNames = completePropertiesInner("globalThis", context).then((fromWindow) => {
    return context.globalLexicalScopeNames().then((globals) => {
      for (const option of fromWindow.completions) {
        result.add(option);
      }
      for (const name of globals || []) {
        result.add({ label: name, type: "variable" });
      }
      return result;
    });
  });
  cache.set("", fetchNames);
  return await fetchNames;
}
async function isExpressionComplete(expression) {
  const currentExecutionContext = UI3.Context.Context.instance().flavor(SDK.RuntimeModel.ExecutionContext);
  if (!currentExecutionContext) {
    return true;
  }
  const result = await currentExecutionContext.runtimeModel.compileScript(expression, "", false, currentExecutionContext.id);
  if (!result?.exceptionDetails?.exception) {
    return true;
  }
  const description = result.exceptionDetails.exception.description;
  if (description) {
    return !description.startsWith("SyntaxError: Unexpected end of input") && !description.startsWith("SyntaxError: Unterminated template literal");
  }
  return false;
}
function argumentHints() {
  return cursorTooltip(getArgumentHints);
}
function closeArgumentsHintsTooltip(view, tooltip) {
  if (view.state.field(tooltip) === null) {
    return false;
  }
  view.dispatch({ effects: closeTooltip.of(null) });
  return true;
}
async function getArgumentHints(state, pos) {
  const node = CodeMirror4.syntaxTree(state).resolveInner(pos).enterUnfinishedNodesBefore(pos);
  if (node.name !== "ArgList") {
    return null;
  }
  const callee = node.parent?.getChild("Expression");
  if (!callee) {
    return null;
  }
  const argumentList = await getArgumentsForExpression(callee, state.doc);
  if (!argumentList) {
    return null;
  }
  let argumentIndex = 0;
  for (let scanPos = pos; ; ) {
    const before = node.childBefore(scanPos);
    if (!before) {
      break;
    }
    if (before.type.is("Expression")) {
      argumentIndex++;
    }
    scanPos = before.from;
  }
  return () => tooltipBuilder(argumentList, argumentIndex);
}
async function getArgumentsForExpression(callee, doc) {
  const context = getExecutionContext();
  if (!context) {
    return null;
  }
  const expression = doc.sliceString(callee.from, callee.to);
  const result = await evaluateExpression(context, expression, "argumentsHint");
  if (!result || result.type !== "function") {
    return null;
  }
  const objGetter = async () => {
    const first = callee.firstChild;
    if (!first || callee.name !== "MemberExpression") {
      return null;
    }
    return await evaluateExpression(context, doc.sliceString(first.from, first.to), "argumentsHint");
  };
  return await getArgumentsForFunctionValue(result, objGetter, expression).finally(() => context.runtimeModel.releaseObjectGroup("argumentsHint"));
}
function argumentsList(input) {
  function parseParamList(cursor) {
    while (cursor.name !== "ParamList") {
      cursor.nextSibling();
    }
    const parameters = [];
    if (cursor.name === "ParamList" && cursor.firstChild()) {
      let prefix = "";
      do {
        switch (cursor.name) {
          case "ArrayPattern":
            parameters.push(prefix + "arr");
            prefix = "";
            break;
          case "ObjectPattern":
            parameters.push(prefix + "obj");
            prefix = "";
            break;
          case "VariableDefinition":
            parameters.push(prefix + input.slice(cursor.from, cursor.to));
            prefix = "";
            break;
          case "Spread":
            prefix = "...";
            break;
        }
      } while (cursor.nextSibling());
    }
    return parameters;
  }
  try {
    try {
      const { parser } = CodeMirror4.javascript.javascriptLanguage.configure({ strict: true, top: "SingleClassItem" });
      const cursor = parser.parse(input).cursor();
      if (cursor.firstChild() && cursor.name === "MethodDeclaration" && cursor.firstChild()) {
        return parseParamList(cursor);
      }
      throw new Error("SingleClassItem rule is expected to have exactly one MethodDeclaration child");
    } catch {
      const { parser } = CodeMirror4.javascript.javascriptLanguage.configure({ strict: true, top: "SingleExpression" });
      const cursor = parser.parse(input).cursor();
      if (!cursor.firstChild()) {
        throw new Error("SingleExpression rule is expected to have children");
      }
      switch (cursor.name) {
        case "ArrowFunction":
        case "FunctionExpression": {
          if (!cursor.firstChild()) {
            throw new Error(`${cursor.name} rule is expected to have children`);
          }
          return parseParamList(cursor);
        }
        case "ClassExpression": {
          if (!cursor.firstChild()) {
            throw new Error(`${cursor.name} rule is expected to have children`);
          }
          do {
            cursor.nextSibling();
          } while (cursor.name !== "ClassBody");
          if (cursor.name === "ClassBody" && cursor.firstChild()) {
            do {
              if (cursor.name === "MethodDeclaration" && cursor.firstChild()) {
                if (cursor.name === "PropertyDefinition" && input.slice(cursor.from, cursor.to) === "constructor") {
                  return parseParamList(cursor);
                }
                cursor.parent();
              }
            } while (cursor.nextSibling());
          }
          return [];
        }
      }
      throw new Error("Unexpected expression");
    }
  } catch (cause) {
    throw new Error(`Failed to parse for arguments list: ${input}`, { cause });
  }
}
async function getArgumentsForFunctionValue(object, receiverObjGetter, functionName) {
  const description = object.description;
  if (!description) {
    return null;
  }
  if (!description.endsWith("{ [native code] }")) {
    return [argumentsList(description)];
  }
  if (description === "function () { [native code] }") {
    const fromBound = await getArgumentsForBoundFunction(object);
    if (fromBound) {
      return fromBound;
    }
  }
  const javaScriptMetadata = JavaScriptMetaData.JavaScriptMetadata.JavaScriptMetadataImpl.instance();
  const descriptionRegexResult = /^function ([^(]*)\(/.exec(description);
  const name = descriptionRegexResult?.[1] || functionName;
  if (!name) {
    return null;
  }
  const uniqueSignatures = javaScriptMetadata.signaturesForNativeFunction(name);
  if (uniqueSignatures) {
    return uniqueSignatures;
  }
  const receiverObj = await receiverObjGetter();
  if (!receiverObj) {
    return null;
  }
  const className = receiverObj.className;
  if (className) {
    const instanceMethods = javaScriptMetadata.signaturesForInstanceMethod(name, className);
    if (instanceMethods) {
      return instanceMethods;
    }
  }
  if (receiverObj.description && receiverObj.type === "function" && receiverObj.description.endsWith("{ [native code] }")) {
    const receiverDescriptionRegexResult = /^function ([^(]*)\(/.exec(receiverObj.description);
    if (receiverDescriptionRegexResult) {
      const receiverName = receiverDescriptionRegexResult[1];
      const staticSignatures = javaScriptMetadata.signaturesForStaticMethod(name, receiverName);
      if (staticSignatures) {
        return staticSignatures;
      }
    }
  }
  for (const proto of await prototypesFromObject(receiverObj)) {
    const instanceSignatures = javaScriptMetadata.signaturesForInstanceMethod(name, proto);
    if (instanceSignatures) {
      return instanceSignatures;
    }
  }
  return null;
}
async function prototypesFromObject(object) {
  if (object.type === "number") {
    return ["Number", "Object"];
  }
  if (object.type === "string") {
    return ["String", "Object"];
  }
  if (object.type === "symbol") {
    return ["Symbol", "Object"];
  }
  if (object.type === "bigint") {
    return ["BigInt", "Object"];
  }
  if (object.type === "boolean") {
    return ["Boolean", "Object"];
  }
  if (object.type === "undefined" || object.subtype === "null") {
    return [];
  }
  return await object.callFunctionJSON(function() {
    const result = [];
    for (let object2 = this; object2; object2 = Object.getPrototypeOf(object2)) {
      if (typeof object2 === "object" && object2.constructor?.name) {
        result[result.length] = object2.constructor.name;
      }
    }
    return result;
  }, []) ?? [];
}
async function getArgumentsForBoundFunction(object) {
  const { internalProperties } = await object.getOwnProperties(false);
  if (!internalProperties) {
    return null;
  }
  const target = internalProperties.find((p) => p.name === "[[TargetFunction]]")?.value;
  const args = internalProperties.find((p) => p.name === "[[BoundArgs]]")?.value;
  const thisValue = internalProperties.find((p) => p.name === "[[BoundThis]]")?.value;
  if (!thisValue || !target || !args) {
    return null;
  }
  const originalSignatures = await getArgumentsForFunctionValue(target, () => Promise.resolve(thisValue));
  const boundArgsLength = SDK.RemoteObject.RemoteObject.arrayLength(args);
  if (!originalSignatures) {
    return null;
  }
  return originalSignatures.map((signature) => {
    const restIndex = signature.findIndex((arg) => arg.startsWith("..."));
    return restIndex > -1 && restIndex < boundArgsLength ? signature.slice(restIndex) : signature.slice(boundArgsLength);
  });
}
function tooltipBuilder(signatures, currentIndex) {
  const tooltip = document.createElement("div");
  tooltip.className = "cm-argumentHints";
  for (const args of signatures) {
    const argumentsElement = document.createElement("span");
    for (let i = 0; i < args.length; i++) {
      if (i === currentIndex || i < currentIndex && args[i].startsWith("...")) {
        const argElement = argumentsElement.appendChild(document.createElement("b"));
        argElement.appendChild(document.createTextNode(args[i]));
      } else {
        argumentsElement.appendChild(document.createTextNode(args[i]));
      }
      if (i < args.length - 1) {
        argumentsElement.appendChild(document.createTextNode(", "));
      }
    }
    const signatureElement = tooltip.appendChild(document.createElement("div"));
    signatureElement.className = "source-code";
    signatureElement.appendChild(document.createTextNode("\u0192("));
    signatureElement.appendChild(argumentsElement);
    signatureElement.appendChild(document.createTextNode(")"));
  }
  return { dom: tooltip };
}

// gen/front_end/ui/components/text_editor/position.js
var position_exports = {};
__export(position_exports, {
  toLineColumn: () => toLineColumn,
  toOffset: () => toOffset
});
function toOffset(doc, { lineNumber, columnNumber }) {
  const line = doc.line(Math.max(1, Math.min(doc.lines, lineNumber + 1)));
  return Math.max(line.from, Math.min(line.to, line.from + columnNumber));
}
function toLineColumn(doc, offset) {
  offset = Math.max(0, Math.min(offset, doc.length));
  const line = doc.lineAt(offset);
  return { lineNumber: line.number - 1, columnNumber: offset - line.from };
}

// gen/front_end/ui/components/text_editor/TextEditor.js
var TextEditor_exports = {};
__export(TextEditor_exports, {
  TextEditor: () => TextEditor
});
import * as Common3 from "./../../../core/common/common.js";
import * as CodeMirror5 from "./../../../third_party/codemirror.next/codemirror.next.js";
import * as UI4 from "./../../legacy/legacy.js";
import * as ThemeSupport from "./../../legacy/theme_support/theme_support.js";
import * as CodeHighlighter3 from "./../code_highlighter/code_highlighter.js";
var TextEditor = class extends HTMLElement {
  #shadow = this.attachShadow({ mode: "open" });
  #activeEditor = void 0;
  #dynamicSettings = DynamicSetting.none;
  #activeSettingListeners = [];
  #pendingState;
  #lastScrollSnapshot;
  #resizeTimeout = -1;
  #resizeListener = () => {
    if (this.#resizeTimeout < 0) {
      this.#resizeTimeout = window.setTimeout(() => {
        this.#resizeTimeout = -1;
        if (this.#activeEditor) {
          CodeMirror5.repositionTooltips(this.#activeEditor);
        }
      }, 50);
    }
  };
  #devtoolsResizeObserver = new ResizeObserver(this.#resizeListener);
  constructor(pendingState) {
    super();
    this.#pendingState = pendingState;
    this.#shadow.createChild("style").textContent = CodeHighlighter3.codeHighlighterStyles;
  }
  #createEditor() {
    this.#activeEditor = new CodeMirror5.EditorView({
      state: this.state,
      parent: this.#shadow,
      root: this.#shadow,
      dispatch: (tr, view) => {
        view.update([tr]);
        this.#maybeDispatchInput(tr);
        if (tr.reconfigured) {
          this.#ensureSettingListeners();
        }
      },
      scrollTo: this.#lastScrollSnapshot
    });
    this.#activeEditor.scrollDOM.addEventListener("scroll", () => {
      if (!this.#activeEditor) {
        return;
      }
      this.#lastScrollSnapshot = this.#activeEditor.scrollSnapshot();
      this.scrollEventHandledToSaveScrollPositionForTest();
    });
    this.#ensureSettingListeners();
    this.#startObservingResize();
    ThemeSupport.ThemeSupport.instance().addEventListener(ThemeSupport.ThemeChangeEvent.eventName, () => {
      const currentTheme = ThemeSupport.ThemeSupport.instance().themeName() === "dark" ? dummyDarkTheme : [];
      this.editor.dispatch({
        effects: themeSelection.reconfigure(currentTheme)
      });
    });
    return this.#activeEditor;
  }
  get editor() {
    return this.#activeEditor || this.#createEditor();
  }
  dispatch(spec) {
    return this.editor.dispatch(spec);
  }
  get state() {
    if (this.#activeEditor) {
      return this.#activeEditor.state;
    }
    if (!this.#pendingState) {
      this.#pendingState = CodeMirror5.EditorState.create({ extensions: baseConfiguration("") });
    }
    return this.#pendingState;
  }
  set state(state) {
    if (this.#pendingState === state) {
      return;
    }
    this.#pendingState = state;
    if (this.#activeEditor) {
      this.#activeEditor.setState(state);
      this.#ensureSettingListeners();
    }
  }
  scrollEventHandledToSaveScrollPositionForTest() {
  }
  connectedCallback() {
    if (!this.#activeEditor) {
      this.#createEditor();
    } else {
      this.#activeEditor.dispatch({ effects: this.#lastScrollSnapshot });
    }
  }
  disconnectedCallback() {
    if (this.#activeEditor) {
      this.#activeEditor.dispatch({ effects: clearHighlightedLine.of(null) });
      this.#pendingState = this.#activeEditor.state;
      this.#devtoolsResizeObserver.disconnect();
      window.removeEventListener("resize", this.#resizeListener);
      this.#activeEditor.destroy();
      this.#activeEditor = void 0;
      this.#ensureSettingListeners();
    }
  }
  focus() {
    if (this.#activeEditor) {
      this.#activeEditor.focus();
    }
  }
  #ensureSettingListeners() {
    const dynamicSettings = this.#activeEditor ? this.#activeEditor.state.facet(dynamicSetting) : DynamicSetting.none;
    if (dynamicSettings === this.#dynamicSettings) {
      return;
    }
    this.#dynamicSettings = dynamicSettings;
    for (const [setting, listener] of this.#activeSettingListeners) {
      setting.removeChangeListener(listener);
    }
    this.#activeSettingListeners = [];
    for (const dynamicSetting2 of dynamicSettings) {
      const handler = ({ data }) => {
        const change = dynamicSetting2.sync(this.state, data);
        if (change && this.#activeEditor) {
          this.#activeEditor.dispatch({ effects: change });
        }
      };
      const setting = Common3.Settings.Settings.instance().moduleSetting(dynamicSetting2.settingName);
      setting.addChangeListener(handler);
      this.#activeSettingListeners.push([setting, handler]);
    }
  }
  #startObservingResize() {
    const devtoolsElement = UI4.UIUtils.getDevToolsBoundingElement();
    if (devtoolsElement) {
      this.#devtoolsResizeObserver.observe(devtoolsElement);
    }
    window.addEventListener("resize", this.#resizeListener);
  }
  #maybeDispatchInput(transaction) {
    const userEvent = transaction.annotation(CodeMirror5.Transaction.userEvent);
    const inputType = userEvent ? CODE_MIRROR_USER_EVENT_TO_INPUT_EVENT_TYPE.get(userEvent) : null;
    if (inputType) {
      this.dispatchEvent(new InputEvent("input", { inputType }));
    }
  }
  revealPosition(selection, highlight = true) {
    const view = this.#activeEditor;
    if (!view) {
      return;
    }
    const line = view.state.doc.lineAt(selection.main.head);
    const effects = [];
    if (highlight) {
      if (!view.state.field(highlightedLineState, false)) {
        view.dispatch({ effects: CodeMirror5.StateEffect.appendConfig.of(highlightedLineState) });
      } else {
        view.dispatch({ effects: clearHighlightedLine.of(null) });
      }
      effects.push(setHighlightedLine.of(line.from));
    }
    const editorRect = view.scrollDOM.getBoundingClientRect();
    const targetPos = view.coordsAtPos(selection.main.head);
    if (!selection.main.empty) {
      effects.push(CodeMirror5.EditorView.scrollIntoView(selection.main));
    } else if (!targetPos || targetPos.top < editorRect.top || targetPos.bottom > editorRect.bottom) {
      effects.push(CodeMirror5.EditorView.scrollIntoView(selection.main, { y: "center" }));
    } else if (targetPos.left < editorRect.left || targetPos.right > editorRect.right) {
      effects.push(CodeMirror5.EditorView.scrollIntoView(selection.main, { x: "center" }));
    }
    view.dispatch({
      selection,
      effects,
      userEvent: "select.reveal"
    });
  }
  createSelection(head, anchor) {
    const { doc } = this.state;
    const headPos = toOffset(doc, head);
    return CodeMirror5.EditorSelection.single(anchor ? toOffset(doc, anchor) : headPos, headPos);
  }
  toLineColumn(pos) {
    return toLineColumn(this.state.doc, pos);
  }
  toOffset(pos) {
    return toOffset(this.state.doc, pos);
  }
};
customElements.define("devtools-text-editor", TextEditor);
var clearHighlightedLine = CodeMirror5.StateEffect.define();
var setHighlightedLine = CodeMirror5.StateEffect.define();
var highlightedLineState = CodeMirror5.StateField.define({
  create: () => CodeMirror5.Decoration.none,
  update(value, tr) {
    if (!tr.changes.empty && value.size) {
      value = value.map(tr.changes);
    }
    for (const effect of tr.effects) {
      if (effect.is(clearHighlightedLine)) {
        value = CodeMirror5.Decoration.none;
      } else if (effect.is(setHighlightedLine)) {
        value = CodeMirror5.Decoration.set([
          CodeMirror5.Decoration.line({ attributes: { class: "cm-highlightedLine" } }).range(effect.value)
        ]);
      }
    }
    return value;
  },
  provide: (field) => CodeMirror5.EditorView.decorations.from(field, (value) => value)
});
var CODE_MIRROR_USER_EVENT_TO_INPUT_EVENT_TYPE = /* @__PURE__ */ new Map([
  ["input.type", "insertText"],
  ["input.type.compose", "insertCompositionText"],
  ["input.paste", "insertFromPaste"],
  ["input.drop", "insertFromDrop"],
  ["input.complete", "insertReplacementText"],
  ["delete.selection", "deleteContent"],
  ["delete.forward", "deleteContentForward"],
  ["delete.backward", "deleteContentBackward"],
  ["delete.cut", "deleteByCut"],
  ["move.drop", "deleteByDrag"],
  ["undo", "historyUndo"],
  ["redo", "historyRedo"]
]);

// gen/front_end/ui/components/text_editor/TextEditorHistory.js
var TextEditorHistory_exports = {};
__export(TextEditorHistory_exports, {
  TextEditorHistory: () => TextEditorHistory
});
import * as CodeMirror6 from "./../../../third_party/codemirror.next/codemirror.next.js";
var TextEditorHistory = class {
  #editor;
  #history;
  constructor(editor, history2) {
    this.#editor = editor;
    this.#history = history2;
  }
  /**
   * Replaces the text editor content with entries from the history. Does nothing
   * if the cursor is not positioned correctly (unless `force` is `true`).
   */
  moveHistory(dir, force = false) {
    const { editor } = this.#editor, { main } = editor.state.selection;
    const isBackward = dir === -1;
    if (!force) {
      if (!main.empty) {
        return false;
      }
      const cursorCoords = editor.coordsAtPos(main.head);
      const endCoords = editor.coordsAtPos(isBackward ? 0 : editor.state.doc.length);
      if (cursorCoords && endCoords && (isBackward ? cursorCoords.top > endCoords.top + 5 : cursorCoords.bottom < endCoords.bottom - 5)) {
        return false;
      }
    }
    const text = editor.state.doc.toString();
    const history2 = this.#history;
    const newText = isBackward ? history2.previous(text) : history2.next();
    if (newText === void 0) {
      return false;
    }
    const cursorPos = newText.length;
    editor.dispatch({
      changes: { from: 0, to: editor.state.doc.length, insert: newText },
      selection: CodeMirror6.EditorSelection.cursor(cursorPos),
      scrollIntoView: true
    });
    if (isBackward) {
      const firstLineBreak = newText.search(/\n|$/);
      editor.dispatch({
        selection: CodeMirror6.EditorSelection.cursor(firstLineBreak)
      });
    }
    return true;
  }
  historyCompletions(context) {
    const { explicit, pos, state } = context;
    const text = state.doc.toString();
    const caretIsAtEndOfPrompt = pos === text.length;
    if (!caretIsAtEndOfPrompt || !text.length && !explicit) {
      return null;
    }
    const matchingEntries = this.#history.matchingEntries(text);
    if (!matchingEntries.size) {
      return null;
    }
    const options = [...matchingEntries].map((label) => ({ label, type: "secondary", boost: -1e5 }));
    return { from: 0, to: text.length, options };
  }
};
export {
  AiCodeCompletionProvider_exports as AiCodeCompletionProvider,
  AiCodeCompletionTeaserPlaceholder_exports as AiCodeCompletionTeaserPlaceholder,
  AutocompleteHistory_exports as AutocompleteHistory,
  config_exports as Config,
  ExecutionPositionHighlighter_exports as ExecutionPositionHighlighter,
  javascript_exports as JavaScript,
  position_exports as Position,
  TextEditor_exports as TextEditor,
  TextEditorHistory_exports as TextEditorHistory
};
//# sourceMappingURL=text_editor.js.map
