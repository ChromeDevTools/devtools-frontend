var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/ui/legacy/components/source_frame/BinaryResourceViewFactory.js
var BinaryResourceViewFactory_exports = {};
__export(BinaryResourceViewFactory_exports, {
  BinaryResourceViewFactory: () => BinaryResourceViewFactory
});
import * as TextUtils5 from "./../../../../models/text_utils/text_utils.js";

// gen/front_end/ui/legacy/components/source_frame/ResourceSourceFrame.js
var ResourceSourceFrame_exports = {};
__export(ResourceSourceFrame_exports, {
  ResourceSourceFrame: () => ResourceSourceFrame,
  SearchableContainer: () => SearchableContainer
});
import "./../../legacy.js";
import * as Common2 from "./../../../../core/common/common.js";
import * as i18n3 from "./../../../../core/i18n/i18n.js";

// gen/front_end/entrypoints/formatter_worker/FormatterActions.js
var FORMATTABLE_MEDIA_TYPES = [
  "application/javascript",
  "application/json",
  "application/manifest+json",
  "text/css",
  "text/html",
  "text/javascript"
];

// gen/front_end/ui/legacy/components/source_frame/ResourceSourceFrame.js
import * as TextUtils3 from "./../../../../models/text_utils/text_utils.js";
import * as UI2 from "./../../legacy.js";

// gen/front_end/ui/legacy/components/source_frame/resourceSourceFrame.css.js
var resourceSourceFrame_css_default = `/*
 * Copyright 2017 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.searchable-view {
  flex: 1;
}

devtools-toolbar {
  background-color: var(--sys-color-cdt-base-container);
  border-top: 1px solid var(--sys-color-divider);
}

/*# sourceURL=${import.meta.resolve("./resourceSourceFrame.css")} */`;

// gen/front_end/ui/legacy/components/source_frame/SourceFrame.js
var SourceFrame_exports = {};
__export(SourceFrame_exports, {
  LINE_NUMBER_FORMATTER: () => LINE_NUMBER_FORMATTER,
  SourceFrameImpl: () => SourceFrameImpl,
  addNonBreakableLines: () => addNonBreakableLines,
  addSourceFrameInfobar: () => addSourceFrameInfobar,
  isBreakableLine: () => isBreakableLine,
  removeSourceFrameInfobar: () => removeSourceFrameInfobar
});
import * as Common from "./../../../../core/common/common.js";
import * as Host from "./../../../../core/host/host.js";
import * as i18n from "./../../../../core/i18n/i18n.js";
import * as Platform from "./../../../../core/platform/platform.js";
import * as Root from "./../../../../core/root/root.js";
import * as SDK from "./../../../../core/sdk/sdk.js";
import * as Formatter from "./../../../../models/formatter/formatter.js";
import * as TextUtils from "./../../../../models/text_utils/text_utils.js";
import * as PanelCommon from "./../../../../panels/common/common.js";
import * as CodeMirror from "./../../../../third_party/codemirror.next/codemirror.next.js";
import * as CodeHighlighter from "./../../../components/code_highlighter/code_highlighter.js";
import * as TextEditor from "./../../../components/text_editor/text_editor.js";
import * as VisualLogging from "./../../../visual_logging/visual_logging.js";
import * as UI from "./../../legacy.js";
var UIStrings = {
  /**
   * @description Text for the source of something
   */
  source: "Source",
  /**
   * @description Text to pretty print a file
   */
  prettyPrint: "Pretty print",
  /**
   * @description Text when something is loading
   */
  loading: "Loading\u2026",
  /**
   * @description Shown at the bottom of the Sources panel when the user has made multiple
   * simultaneous text selections in the text editor.
   * @example {2} PH1
   */
  dSelectionRegions: "{PH1} selection regions",
  /**
   * @description Position indicator in Source Frame of the Sources panel. The placeholder is a
   * hexadecimal number value, which is why it is prefixed with '0x'.
   * @example {abc} PH1
   */
  bytecodePositionXs: "Bytecode position `0x`{PH1}",
  /**
   * @description Text in Source Frame of the Sources panel
   * @example {2} PH1
   * @example {2} PH2
   */
  lineSColumnS: "Line {PH1}, Column {PH2}",
  /**
   * @description Text in Source Frame of the Sources panel
   * @example {2} PH1
   */
  dCharactersSelected: "{PH1} characters selected",
  /**
   * @description Text in Source Frame of the Sources panel
   * @example {2} PH1
   * @example {2} PH2
   */
  dLinesDCharactersSelected: "{PH1} lines, {PH2} characters selected",
  /**
   * @description Headline of warning shown to users when pasting text/code into DevTools.
   */
  doYouTrustThisCode: "Do you trust this code?",
  /**
   * @description Warning shown to users when pasting text/code into DevTools.
   * @example {allow pasting} PH1
   */
  doNotPaste: "Don't paste code you do not understand or have not reviewed yourself into DevTools. This could allow attackers to steal your identity or take control of your computer. Please type ''{PH1}'' below to allow pasting.",
  /**
   * @description Text a user needs to type in order to confirm that they are aware of the danger of pasting code into the DevTools console.
   */
  allowPasting: "allow pasting",
  /**
   * @description Input box placeholder which instructs the user to type 'allow pasting' into the input box.
   * @example {allow pasting} PH1
   */
  typeAllowPasting: "Type ''{PH1}''",
  /**
   * @description Error message shown when the user tries to open a file that contains non-readable data. "Editor" refers to
   * a text editor.
   */
  binaryContentError: `Editor can't show binary data. Use the "Response" tab in the "Network" panel to inspect this resource.`
};
var str_ = i18n.i18n.registerUIStrings("ui/legacy/components/source_frame/SourceFrame.ts", UIStrings);
var i18nString = i18n.i18n.getLocalizedString.bind(void 0, str_);
var LINE_NUMBER_FORMATTER = CodeMirror.Facet.define({
  combine(value) {
    if (value.length === 0) {
      return (lineNo) => lineNo.toString();
    }
    return value[0];
  }
});
var SourceFrameImpl = class extends Common.ObjectWrapper.eventMixin(UI.View.SimpleView) {
  options;
  lazyContent;
  prettyInternal;
  rawContent;
  formattedMap;
  prettyToggle;
  shouldAutoPrettyPrint;
  progressToolbarItem;
  textEditorInternal;
  // The 'clean' document, before editing
  baseDoc;
  prettyBaseDoc = null;
  displayedSelection = null;
  searchConfig;
  delayedFindSearchMatches;
  currentSearchResultIndex;
  searchResults;
  searchRegex;
  loadError;
  sourcePosition;
  searchableView;
  editable;
  positionToReveal;
  lineToScrollTo;
  selectionToSet;
  loadedInternal;
  contentRequested;
  wasmDisassemblyInternal;
  contentSet;
  selfXssWarningDisabledSetting;
  constructor(lazyContent, options = {}) {
    super({
      title: i18nString(UIStrings.source),
      viewId: "source"
    });
    this.options = options;
    this.lazyContent = lazyContent;
    this.prettyInternal = false;
    this.rawContent = null;
    this.formattedMap = null;
    this.prettyToggle = new UI.Toolbar.ToolbarToggle(i18nString(UIStrings.prettyPrint), "brackets", void 0, "pretty-print");
    this.prettyToggle.addEventListener("Click", () => {
      void this.setPretty(this.prettyToggle.isToggled());
    });
    this.shouldAutoPrettyPrint = false;
    this.prettyToggle.setVisible(false);
    this.progressToolbarItem = new UI.Toolbar.ToolbarItem(document.createElement("div"));
    this.textEditorInternal = new TextEditor.TextEditor.TextEditor(this.placeholderEditorState(""));
    this.textEditorInternal.style.flexGrow = "1";
    this.element.appendChild(this.textEditorInternal);
    this.element.addEventListener("keydown", (event) => {
      if (event.defaultPrevented) {
        event.stopPropagation();
      }
    });
    this.baseDoc = this.textEditorInternal.state.doc;
    this.searchConfig = null;
    this.delayedFindSearchMatches = null;
    this.currentSearchResultIndex = -1;
    this.searchResults = [];
    this.searchRegex = null;
    this.loadError = false;
    this.sourcePosition = new UI.Toolbar.ToolbarText();
    this.searchableView = null;
    this.editable = false;
    this.positionToReveal = null;
    this.lineToScrollTo = null;
    this.selectionToSet = null;
    this.loadedInternal = false;
    this.contentRequested = false;
    this.wasmDisassemblyInternal = null;
    this.contentSet = false;
    this.selfXssWarningDisabledSetting = Common.Settings.Settings.instance().createSetting(
      "disable-self-xss-warning",
      false,
      "Synced"
      /* Common.Settings.SettingStorageType.SYNCED */
    );
    Common.Settings.Settings.instance().moduleSetting("text-editor-indent").addChangeListener(this.#textEditorIndentChanged, this);
  }
  disposeView() {
    Common.Settings.Settings.instance().moduleSetting("text-editor-indent").removeChangeListener(this.#textEditorIndentChanged, this);
  }
  async #textEditorIndentChanged() {
    if (this.prettyInternal) {
      await this.setPretty(false);
      await this.setPretty(true);
    }
  }
  placeholderEditorState(content) {
    return CodeMirror.EditorState.create({
      doc: content,
      extensions: [
        CodeMirror.EditorState.readOnly.of(true),
        this.options.lineNumbers !== false ? CodeMirror.lineNumbers() : [],
        TextEditor.Config.theme()
      ]
    });
  }
  editorConfiguration(doc) {
    return [
      CodeMirror.EditorView.updateListener.of((update) => this.dispatchEventToListeners("EditorUpdate", update)),
      TextEditor.Config.baseConfiguration(doc),
      TextEditor.Config.closeBrackets.instance(),
      TextEditor.Config.autocompletion.instance(),
      TextEditor.Config.showWhitespace.instance(),
      TextEditor.Config.allowScrollPastEof.instance(),
      CodeMirror.Prec.lowest(TextEditor.Config.codeFolding.instance()),
      TextEditor.Config.autoDetectIndent.instance(),
      sourceFrameTheme,
      CodeMirror.EditorView.domEventHandlers({
        focus: () => this.onFocus(),
        blur: () => this.onBlur(),
        paste: () => this.onPaste(),
        scroll: () => this.dispatchEventToListeners(
          "EditorScroll"
          /* Events.EDITOR_SCROLL */
        ),
        contextmenu: (event) => this.onContextMenu(event)
      }),
      CodeMirror.lineNumbers({
        domEventHandlers: { contextmenu: (_view, block, event) => this.onLineGutterContextMenu(block.from, event) }
      }),
      CodeMirror.EditorView.updateListener.of((update) => {
        if (update.selectionSet || update.docChanged) {
          this.updateSourcePosition();
        }
        if (update.docChanged) {
          this.onTextChanged();
        }
      }),
      activeSearchState,
      CodeMirror.Prec.lowest(searchHighlighter),
      config.language.of([]),
      this.wasmDisassemblyInternal ? markNonBreakableLines(this.wasmDisassemblyInternal) : nonBreakableLines,
      this.options.lineWrapping ? CodeMirror.EditorView.lineWrapping : [],
      this.options.lineNumbers !== false ? CodeMirror.lineNumbers() : [],
      CodeMirror.indentationMarkers({
        colors: {
          light: "var(--sys-color-divider)",
          activeLight: "var(--sys-color-divider-prominent)",
          dark: "var(--sys-color-divider)",
          activeDark: "var(--sys-color-divider-prominent)"
        }
      }),
      sourceFrameInfobarState
    ];
  }
  onBlur() {
  }
  onFocus() {
  }
  onPaste() {
    if (Root.Runtime.Runtime.queryParam("isChromeForTesting") || Root.Runtime.Runtime.queryParam("disableSelfXssWarnings") || this.selfXssWarningDisabledSetting.get()) {
      return false;
    }
    void this.showSelfXssWarning();
    return true;
  }
  async showSelfXssWarning() {
    await new Promise((resolve) => setTimeout(resolve, 0));
    const allowPasting = await PanelCommon.TypeToAllowDialog.show({
      jslogContext: {
        dialog: "self-xss-warning",
        input: "allow-pasting"
      },
      header: i18nString(UIStrings.doYouTrustThisCode),
      message: i18nString(UIStrings.doNotPaste, { PH1: i18nString(UIStrings.allowPasting) }),
      typePhrase: i18nString(UIStrings.allowPasting),
      inputPlaceholder: i18nString(UIStrings.typeAllowPasting, { PH1: i18nString(UIStrings.allowPasting) })
    });
    if (allowPasting) {
      this.selfXssWarningDisabledSetting.set(true);
      Host.userMetrics.actionTaken(Host.UserMetrics.Action.SelfXssAllowPastingInDialog);
    }
  }
  get wasmDisassembly() {
    return this.wasmDisassemblyInternal;
  }
  editorLocationToUILocation(lineNumber, columnNumber) {
    if (this.wasmDisassemblyInternal) {
      columnNumber = this.wasmDisassemblyInternal.lineNumberToBytecodeOffset(lineNumber);
      lineNumber = 0;
    } else if (this.prettyInternal) {
      [lineNumber, columnNumber] = this.prettyToRawLocation(lineNumber, columnNumber);
    }
    return { lineNumber, columnNumber };
  }
  uiLocationToEditorLocation(lineNumber, columnNumber = 0) {
    if (this.wasmDisassemblyInternal) {
      lineNumber = this.wasmDisassemblyInternal.bytecodeOffsetToLineNumber(columnNumber);
      columnNumber = 0;
    } else if (this.prettyInternal) {
      [lineNumber, columnNumber] = this.rawToPrettyLocation(lineNumber, columnNumber);
    }
    return { lineNumber, columnNumber };
  }
  setCanPrettyPrint(canPrettyPrint, autoPrettyPrint) {
    this.shouldAutoPrettyPrint = autoPrettyPrint === true && Common.Settings.Settings.instance().moduleSetting("auto-pretty-print-minified").get();
    this.prettyToggle.setVisible(canPrettyPrint);
  }
  setEditable(editable) {
    this.editable = editable;
    if (this.loaded && editable !== !this.textEditor.state.readOnly) {
      this.textEditor.dispatch({ effects: config.editable.reconfigure(CodeMirror.EditorState.readOnly.of(!editable)) });
    }
  }
  async setPretty(value) {
    this.prettyInternal = value;
    this.prettyToggle.setEnabled(false);
    const wasLoaded = this.loaded;
    const { textEditor } = this;
    const selection = textEditor.state.selection.main;
    const startPos = textEditor.toLineColumn(selection.from), endPos = textEditor.toLineColumn(selection.to);
    let newSelection;
    if (this.prettyInternal) {
      const content = this.rawContent instanceof CodeMirror.Text ? this.rawContent.sliceString(0) : this.rawContent || "";
      const formatInfo = await Formatter.ScriptFormatter.formatScriptContent(this.contentType, content);
      this.formattedMap = formatInfo.formattedMapping;
      await this.setContent(formatInfo.formattedContent);
      this.prettyBaseDoc = textEditor.state.doc;
      const start = this.rawToPrettyLocation(startPos.lineNumber, startPos.columnNumber);
      const end = this.rawToPrettyLocation(endPos.lineNumber, endPos.columnNumber);
      newSelection = textEditor.createSelection({ lineNumber: start[0], columnNumber: start[1] }, { lineNumber: end[0], columnNumber: end[1] });
    } else {
      this.formattedMap = null;
      await this.setContent(this.rawContent || "");
      this.baseDoc = textEditor.state.doc;
      const start = this.prettyToRawLocation(startPos.lineNumber, startPos.columnNumber);
      const end = this.prettyToRawLocation(endPos.lineNumber, endPos.columnNumber);
      newSelection = textEditor.createSelection({ lineNumber: start[0], columnNumber: start[1] }, { lineNumber: end[0], columnNumber: end[1] });
    }
    if (wasLoaded) {
      textEditor.revealPosition(newSelection, false);
    }
    this.prettyToggle.setEnabled(true);
    this.updatePrettyPrintState();
  }
  // If this is a disassembled WASM file or a pretty-printed file,
  // wire in a line number formatter that shows binary offsets or line
  // numbers in the original source.
  getLineNumberFormatter() {
    if (this.options.lineNumbers === false) {
      return [];
    }
    let formatNumber = void 0;
    if (this.wasmDisassemblyInternal) {
      const disassembly = this.wasmDisassemblyInternal;
      const lastBytecodeOffset = disassembly.lineNumberToBytecodeOffset(disassembly.lineNumbers - 1);
      const bytecodeOffsetDigits = lastBytecodeOffset.toString(16).length + 1;
      formatNumber = (lineNumber) => {
        const bytecodeOffset = disassembly.lineNumberToBytecodeOffset(Math.min(disassembly.lineNumbers, lineNumber) - 1);
        return `0x${bytecodeOffset.toString(16).padStart(bytecodeOffsetDigits, "0")}`;
      };
    } else if (this.prettyInternal) {
      formatNumber = (lineNumber, state) => {
        if (lineNumber < 2 || lineNumber > state.doc.lines) {
          return String(lineNumber);
        }
        const [currLine] = this.prettyToRawLocation(lineNumber - 1);
        const [prevLine] = this.prettyToRawLocation(lineNumber - 2);
        if (currLine !== prevLine) {
          return String(currLine + 1);
        }
        return "-";
      };
    }
    return formatNumber ? [CodeMirror.lineNumbers({ formatNumber }), LINE_NUMBER_FORMATTER.of(formatNumber)] : [];
  }
  updateLineNumberFormatter() {
    this.textEditor.dispatch({ effects: config.lineNumbers.reconfigure(this.getLineNumberFormatter()) });
    this.textEditor.shadowRoot?.querySelector(".cm-lineNumbers")?.setAttribute("jslog", `${VisualLogging.gutter("line-numbers").track({ click: true })}`);
  }
  updatePrettyPrintState() {
    this.prettyToggle.setToggled(this.prettyInternal);
    this.textEditorInternal.classList.toggle("pretty-printed", this.prettyInternal);
    this.updateLineNumberFormatter();
  }
  prettyToRawLocation(line, column = 0) {
    if (!this.formattedMap) {
      return [line, column];
    }
    return this.formattedMap.formattedToOriginal(line, column);
  }
  rawToPrettyLocation(line, column) {
    if (!this.formattedMap) {
      return [line, column];
    }
    return this.formattedMap.originalToFormatted(line, column);
  }
  hasLoadError() {
    return this.loadError;
  }
  wasShown() {
    super.wasShown();
    void this.ensureContentLoaded();
    this.wasShownOrLoaded();
  }
  willHide() {
    super.willHide();
    this.clearPositionToReveal();
  }
  async toolbarItems() {
    return [this.prettyToggle, this.sourcePosition, this.progressToolbarItem];
  }
  get loaded() {
    return this.loadedInternal;
  }
  get textEditor() {
    return this.textEditorInternal;
  }
  get pretty() {
    return this.prettyInternal;
  }
  get contentType() {
    return this.loadError ? "" : this.getContentType();
  }
  getContentType() {
    return "";
  }
  async ensureContentLoaded() {
    if (!this.contentRequested) {
      this.contentRequested = true;
      await this.setContentDataOrError(this.lazyContent());
      this.contentSet = true;
    }
  }
  async setContentDataOrError(contentDataPromise) {
    const progressIndicator = document.createElement("devtools-progress");
    progressIndicator.title = i18nString(UIStrings.loading);
    progressIndicator.totalWork = 100;
    this.progressToolbarItem.element.appendChild(progressIndicator);
    progressIndicator.worked = 1;
    const contentData = await contentDataPromise;
    let error;
    let content;
    let isMinified = false;
    if (TextUtils.ContentData.ContentData.isError(contentData)) {
      error = contentData.error;
      content = contentData.error;
    } else if (contentData instanceof TextUtils.WasmDisassembly.WasmDisassembly) {
      content = CodeMirror.Text.of(contentData.lines);
      this.wasmDisassemblyInternal = contentData;
    } else if (contentData.isTextContent) {
      content = contentData.text;
      isMinified = TextUtils.TextUtils.isMinified(contentData.text);
      this.wasmDisassemblyInternal = null;
    } else if (contentData.mimeType === "application/wasm") {
      this.wasmDisassemblyInternal = await SDK.Script.disassembleWasm(contentData.base64);
      content = CodeMirror.Text.of(this.wasmDisassemblyInternal.lines);
    } else {
      error = i18nString(UIStrings.binaryContentError);
      content = null;
      this.wasmDisassemblyInternal = null;
    }
    progressIndicator.worked = 100;
    progressIndicator.done = true;
    if (this.rawContent === content && error === void 0) {
      return;
    }
    this.rawContent = content;
    this.formattedMap = null;
    this.prettyToggle.setEnabled(true);
    if (error) {
      this.loadError = true;
      this.textEditor.state = this.placeholderEditorState(error);
      this.prettyToggle.setEnabled(false);
    } else if (this.shouldAutoPrettyPrint && isMinified) {
      await this.setPretty(true);
    } else {
      await this.setContent(this.rawContent || "");
    }
  }
  revealPosition(position, shouldHighlight) {
    this.lineToScrollTo = null;
    this.selectionToSet = null;
    if (typeof position === "number") {
      let line = 0, column = 0;
      const { doc } = this.textEditor.state;
      if (position > doc.length) {
        line = doc.lines - 1;
      } else if (position >= 0) {
        const lineObj = doc.lineAt(position);
        line = lineObj.number - 1;
        column = position - lineObj.from;
      }
      this.positionToReveal = { to: { lineNumber: line, columnNumber: column }, shouldHighlight };
    } else if ("lineNumber" in position) {
      const { lineNumber, columnNumber } = position;
      this.positionToReveal = { to: { lineNumber, columnNumber: columnNumber ?? 0 }, shouldHighlight };
    } else {
      this.positionToReveal = { ...position, shouldHighlight };
    }
    this.#revealPositionIfNeeded();
  }
  #revealPositionIfNeeded() {
    if (!this.positionToReveal) {
      return;
    }
    if (!this.loaded || !this.isShowing()) {
      return;
    }
    const { from, to, shouldHighlight } = this.positionToReveal;
    const toLocation = this.uiLocationToEditorLocation(to.lineNumber, to.columnNumber);
    const fromLocation = from ? this.uiLocationToEditorLocation(from.lineNumber, from.columnNumber) : void 0;
    const { textEditor } = this;
    textEditor.revealPosition(textEditor.createSelection(toLocation, fromLocation), shouldHighlight);
    this.positionToReveal = null;
  }
  clearPositionToReveal() {
    this.positionToReveal = null;
  }
  scrollToLine(line) {
    this.clearPositionToReveal();
    this.lineToScrollTo = line;
    this.#scrollToLineIfNeeded();
  }
  #scrollToLineIfNeeded() {
    if (this.lineToScrollTo !== null) {
      if (this.loaded && this.isShowing()) {
        const { textEditor } = this;
        const position = textEditor.toOffset({ lineNumber: this.lineToScrollTo, columnNumber: 0 });
        textEditor.dispatch({ effects: CodeMirror.EditorView.scrollIntoView(position, { y: "start", yMargin: 0 }) });
        this.lineToScrollTo = null;
      }
    }
  }
  setSelection(textRange) {
    this.selectionToSet = textRange;
    this.#setSelectionIfNeeded();
  }
  #setSelectionIfNeeded() {
    const sel = this.selectionToSet;
    if (sel && this.loaded && this.isShowing()) {
      const { textEditor } = this;
      textEditor.dispatch({
        selection: textEditor.createSelection({ lineNumber: sel.startLine, columnNumber: sel.startColumn }, { lineNumber: sel.endLine, columnNumber: sel.endColumn })
      });
      this.selectionToSet = null;
    }
  }
  wasShownOrLoaded() {
    this.#revealPositionIfNeeded();
    this.#setSelectionIfNeeded();
    this.#scrollToLineIfNeeded();
    this.textEditor.shadowRoot?.querySelector(".cm-lineNumbers")?.setAttribute("jslog", `${VisualLogging.gutter("line-numbers").track({ click: true })}`);
    this.textEditor.shadowRoot?.querySelector(".cm-foldGutter")?.setAttribute("jslog", `${VisualLogging.gutter("fold")}`);
    this.textEditor.setAttribute("jslog", `${VisualLogging.textField().track({ change: true })}`);
  }
  onTextChanged() {
    const wasPretty = this.pretty;
    this.prettyInternal = Boolean(this.prettyBaseDoc && this.textEditor.state.doc.eq(this.prettyBaseDoc));
    if (this.prettyInternal !== wasPretty) {
      this.updatePrettyPrintState();
    }
    this.prettyToggle.setEnabled(this.isClean());
    if (this.searchConfig && this.searchableView) {
      this.performSearch(this.searchConfig, false, false);
    }
  }
  isClean() {
    return this.textEditor.state.doc.eq(this.baseDoc) || this.prettyBaseDoc !== null && this.textEditor.state.doc.eq(this.prettyBaseDoc);
  }
  contentCommitted() {
    this.baseDoc = this.textEditorInternal.state.doc;
    this.prettyBaseDoc = null;
    this.rawContent = this.textEditor.state.doc.toString();
    this.formattedMap = null;
    if (this.prettyInternal) {
      this.prettyInternal = false;
      this.updatePrettyPrintState();
    }
    this.prettyToggle.setEnabled(true);
  }
  async getLanguageSupport(content) {
    let { contentType } = this;
    if (contentType === "text/x.vue") {
      content = typeof content === "string" ? content : content.sliceString(0);
      if (!content.trimStart().startsWith("<")) {
        contentType = "text/javascript";
      }
    }
    const languageDesc = await CodeHighlighter.CodeHighlighter.languageFromMIME(contentType);
    if (!languageDesc) {
      return [];
    }
    return [
      languageDesc,
      CodeMirror.javascript.javascriptLanguage.data.of({ autocomplete: CodeMirror.completeAnyWord })
    ];
  }
  async updateLanguageMode(content) {
    const langExtension = await this.getLanguageSupport(content);
    this.textEditor.dispatch({ effects: config.language.reconfigure(langExtension) });
  }
  async setContent(content) {
    const { textEditor } = this;
    const wasLoaded = this.loadedInternal;
    const scrollTop = textEditor.editor.scrollDOM.scrollTop;
    this.loadedInternal = true;
    const languageSupport = await this.getLanguageSupport(content);
    const editorState = CodeMirror.EditorState.create({
      doc: content,
      extensions: [
        this.editorConfiguration(content),
        languageSupport,
        config.lineNumbers.of(this.getLineNumberFormatter()),
        config.editable.of(this.editable ? [] : CodeMirror.EditorState.readOnly.of(true))
      ]
    });
    this.baseDoc = editorState.doc;
    textEditor.state = editorState;
    if (wasLoaded) {
      textEditor.editor.scrollDOM.scrollTop = scrollTop;
    }
    this.wasShownOrLoaded();
    if (this.delayedFindSearchMatches) {
      this.delayedFindSearchMatches();
      this.delayedFindSearchMatches = null;
    }
  }
  setSearchableView(view) {
    this.searchableView = view;
  }
  doFindSearchMatches(searchConfig, shouldJump, jumpBackwards) {
    this.currentSearchResultIndex = -1;
    this.searchRegex = searchConfig.toSearchRegex(true);
    this.searchResults = this.collectRegexMatches(this.searchRegex);
    if (this.searchableView) {
      this.searchableView.updateSearchMatchesCount(this.searchResults.length);
    }
    const editor = this.textEditor;
    if (!this.searchResults.length) {
      if (editor.state.field(activeSearchState)) {
        editor.dispatch({ effects: setActiveSearch.of(null) });
      }
    } else if (shouldJump && jumpBackwards) {
      this.jumpToPreviousSearchResult();
    } else if (shouldJump) {
      this.jumpToNextSearchResult();
    } else {
      editor.dispatch({ effects: setActiveSearch.of(new ActiveSearch(this.searchRegex, null)) });
    }
  }
  performSearch(searchConfig, shouldJump, jumpBackwards) {
    if (this.searchableView) {
      this.searchableView.updateSearchMatchesCount(0);
    }
    this.resetSearch();
    this.searchConfig = searchConfig;
    if (this.loaded) {
      this.doFindSearchMatches(searchConfig, shouldJump, Boolean(jumpBackwards));
    } else {
      this.delayedFindSearchMatches = this.doFindSearchMatches.bind(this, searchConfig, shouldJump, Boolean(jumpBackwards));
    }
    void this.ensureContentLoaded();
  }
  resetCurrentSearchResultIndex() {
    if (!this.searchResults.length) {
      return;
    }
    this.currentSearchResultIndex = -1;
    if (this.searchableView) {
      this.searchableView.updateCurrentMatchIndex(this.currentSearchResultIndex);
    }
    const editor = this.textEditor;
    const currentActiveSearch = editor.state.field(activeSearchState);
    if (currentActiveSearch?.currentRange) {
      editor.dispatch({ effects: setActiveSearch.of(new ActiveSearch(currentActiveSearch.regexp, null)) });
    }
  }
  resetSearch() {
    this.searchConfig = null;
    this.delayedFindSearchMatches = null;
    this.currentSearchResultIndex = -1;
    this.searchResults = [];
    this.searchRegex = null;
  }
  onSearchCanceled() {
    const range = this.currentSearchResultIndex !== -1 ? this.searchResults[this.currentSearchResultIndex] : null;
    this.resetSearch();
    if (!this.loaded) {
      return;
    }
    const editor = this.textEditor;
    editor.dispatch({
      effects: setActiveSearch.of(null),
      selection: range ? { anchor: range.from, head: range.to } : void 0,
      scrollIntoView: true,
      userEvent: "select.search.cancel"
    });
  }
  jumpToLastSearchResult() {
    this.jumpToSearchResult(this.searchResults.length - 1);
  }
  searchResultIndexForCurrentSelection() {
    return Platform.ArrayUtilities.lowerBound(this.searchResults, this.textEditor.state.selection.main, (a, b) => a.to - b.to);
  }
  jumpToNextSearchResult() {
    const currentIndex = this.searchResultIndexForCurrentSelection();
    const nextIndex = this.currentSearchResultIndex === -1 ? currentIndex : currentIndex + 1;
    this.jumpToSearchResult(nextIndex);
  }
  jumpToPreviousSearchResult() {
    const currentIndex = this.searchResultIndexForCurrentSelection();
    this.jumpToSearchResult(currentIndex - 1);
  }
  supportsCaseSensitiveSearch() {
    return true;
  }
  supportsWholeWordSearch() {
    return true;
  }
  supportsRegexSearch() {
    return true;
  }
  jumpToSearchResult(index) {
    if (!this.loaded || !this.searchResults.length || !this.searchRegex) {
      return;
    }
    this.currentSearchResultIndex = (index + this.searchResults.length) % this.searchResults.length;
    if (this.searchableView) {
      this.searchableView.updateCurrentMatchIndex(this.currentSearchResultIndex);
    }
    const editor = this.textEditor;
    const range = this.searchResults[this.currentSearchResultIndex];
    editor.dispatch({
      effects: setActiveSearch.of(new ActiveSearch(this.searchRegex, range)),
      selection: { anchor: range.from, head: range.to },
      scrollIntoView: true,
      userEvent: "select.search"
    });
  }
  replaceSelectionWith(_searchConfig, replacement) {
    const range = this.searchResults[this.currentSearchResultIndex];
    if (!range) {
      return;
    }
    const insert = this.searchRegex?.fromQuery ? range.insertPlaceholders(replacement) : replacement;
    const editor = this.textEditor;
    const changes = editor.state.changes({ from: range.from, to: range.to, insert });
    editor.dispatch({ changes, selection: { anchor: changes.mapPos(editor.state.selection.main.to, 1) }, userEvent: "input.replace" });
  }
  replaceAllWith(searchConfig, replacement) {
    this.resetCurrentSearchResultIndex();
    const regex = searchConfig.toSearchRegex(true);
    const ranges = this.collectRegexMatches(regex);
    if (!ranges.length) {
      return;
    }
    const isRegExp = regex.fromQuery;
    const changes = ranges.map((match) => ({ from: match.from, to: match.to, insert: isRegExp ? match.insertPlaceholders(replacement) : replacement }));
    this.textEditor.dispatch({ changes, scrollIntoView: true, userEvent: "input.replace.all" });
  }
  collectRegexMatches({ regex }) {
    const ranges = [];
    let pos = 0;
    for (const line of this.textEditor.state.doc.iterLines()) {
      regex.lastIndex = 0;
      for (; ; ) {
        const match = regex.exec(line);
        if (!match) {
          break;
        }
        if (match[0].length) {
          const from = pos + match.index;
          ranges.push(new SearchMatch(from, from + match[0].length, match));
        } else {
          regex.lastIndex = match.index + 1;
        }
      }
      pos += line.length + 1;
    }
    return ranges;
  }
  canEditSource() {
    return this.editable;
  }
  updateSourcePosition() {
    const { textEditor } = this, { state } = textEditor, { selection } = state;
    if (this.displayedSelection?.eq(selection)) {
      return;
    }
    this.displayedSelection = selection;
    if (selection.ranges.length > 1) {
      this.sourcePosition.setText(i18nString(UIStrings.dSelectionRegions, { PH1: selection.ranges.length }));
      return;
    }
    const { main } = state.selection;
    if (main.empty) {
      const { lineNumber, columnNumber } = textEditor.toLineColumn(main.head);
      const location = this.prettyToRawLocation(lineNumber, columnNumber);
      if (this.wasmDisassemblyInternal) {
        const disassembly = this.wasmDisassemblyInternal;
        const lastBytecodeOffset = disassembly.lineNumberToBytecodeOffset(disassembly.lineNumbers - 1);
        const bytecodeOffsetDigits = lastBytecodeOffset.toString(16).length;
        const bytecodeOffset = disassembly.lineNumberToBytecodeOffset(location[0]);
        this.sourcePosition.setText(i18nString(UIStrings.bytecodePositionXs, { PH1: bytecodeOffset.toString(16).padStart(bytecodeOffsetDigits, "0") }));
      } else {
        this.sourcePosition.setText(i18nString(UIStrings.lineSColumnS, { PH1: location[0] + 1, PH2: location[1] + 1 }));
      }
    } else {
      const startLine = state.doc.lineAt(main.from), endLine = state.doc.lineAt(main.to);
      if (startLine.number === endLine.number) {
        this.sourcePosition.setText(i18nString(UIStrings.dCharactersSelected, { PH1: main.to - main.from }));
      } else {
        this.sourcePosition.setText(i18nString(UIStrings.dLinesDCharactersSelected, { PH1: endLine.number - startLine.number + 1, PH2: main.to - main.from }));
      }
    }
  }
  onContextMenu(event) {
    event.consume(true);
    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    const { state } = this.textEditor;
    const pos = state.selection.main.from, line = state.doc.lineAt(pos);
    this.populateTextAreaContextMenu(contextMenu, line.number - 1, pos - line.from);
    contextMenu.appendApplicableItems(this);
    void contextMenu.show();
    return true;
  }
  populateTextAreaContextMenu(_menu, _lineNumber, _columnNumber) {
  }
  onLineGutterContextMenu(position, event) {
    event.consume(true);
    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    const lineNumber = this.textEditor.state.doc.lineAt(position).number - 1;
    this.populateLineGutterContextMenu(contextMenu, lineNumber);
    contextMenu.appendApplicableItems(this);
    void contextMenu.show();
    return true;
  }
  populateLineGutterContextMenu(_menu, _lineNumber) {
  }
  focus() {
    this.textEditor.focus();
  }
};
var SearchMatch = class {
  from;
  to;
  match;
  constructor(from, to, match) {
    this.from = from;
    this.to = to;
    this.match = match;
  }
  insertPlaceholders(replacement) {
    return replacement.replace(/\$(\$|&|\d+|<[^>]+>)/g, (_, selector) => {
      if (selector === "$") {
        return "$";
      }
      if (selector === "&") {
        return this.match[0];
      }
      if (selector[0] === "<") {
        return this.match.groups?.[selector.slice(1, selector.length - 1)] || "";
      }
      return this.match[Number.parseInt(selector, 10)] || "";
    });
  }
};
var config = {
  editable: new CodeMirror.Compartment(),
  language: new CodeMirror.Compartment(),
  lineNumbers: new CodeMirror.Compartment()
};
var ActiveSearch = class _ActiveSearch {
  regexp;
  currentRange;
  constructor(regexp, currentRange) {
    this.regexp = regexp;
    this.currentRange = currentRange;
  }
  map(change) {
    return change.empty || !this.currentRange ? this : new _ActiveSearch(this.regexp, { from: change.mapPos(this.currentRange.from), to: change.mapPos(this.currentRange.to) });
  }
  static eq(a, b) {
    return Boolean(a === b || a && b && a.currentRange?.from === b.currentRange?.from && a.currentRange?.to === b.currentRange?.to && a.regexp.regex.source === b.regexp.regex.source && a.regexp.regex.flags === b.regexp.regex.flags);
  }
};
var setActiveSearch = CodeMirror.StateEffect.define({ map: (value, mapping) => value?.map(mapping) });
var activeSearchState = CodeMirror.StateField.define({
  create() {
    return null;
  },
  update(state, tr) {
    return tr.effects.reduce((state2, effect) => effect.is(setActiveSearch) ? effect.value : state2, state?.map(tr.changes) ?? null);
  }
});
var searchMatchDeco = CodeMirror.Decoration.mark({ class: "cm-searchMatch" });
var currentSearchMatchDeco = CodeMirror.Decoration.mark({ class: "cm-searchMatch cm-searchMatch-selected" });
var searchHighlighter = CodeMirror.ViewPlugin.fromClass(class {
  decorations;
  constructor(view) {
    this.decorations = this.computeDecorations(view);
  }
  update(update) {
    const active = update.state.field(activeSearchState);
    if (!ActiveSearch.eq(active, update.startState.field(activeSearchState)) || active && (update.viewportChanged || update.docChanged)) {
      this.decorations = this.computeDecorations(update.view);
    }
  }
  computeDecorations(view) {
    const active = view.state.field(activeSearchState);
    if (!active) {
      return CodeMirror.Decoration.none;
    }
    const builder = new CodeMirror.RangeSetBuilder();
    const { doc } = view.state;
    for (const { from, to } of view.visibleRanges) {
      let pos = from;
      for (const part of doc.iterRange(from, to)) {
        if (part !== "\n") {
          active.regexp.regex.lastIndex = 0;
          for (; ; ) {
            const match = active.regexp.regex.exec(part);
            if (!match) {
              break;
            }
            if (match[0].length) {
              const start = pos + match.index, end = start + match[0].length;
              const current = active.currentRange?.from === start && active.currentRange.to === end;
              builder.add(start, end, current ? currentSearchMatchDeco : searchMatchDeco);
            } else {
              active.regexp.regex.lastIndex = match.index + 1;
            }
          }
        }
        pos += part.length;
      }
    }
    return builder.finish();
  }
}, { decorations: (value) => value.decorations });
var nonBreakableLineMark = new class extends CodeMirror.GutterMarker {
  elementClass = "cm-nonBreakableLine";
}();
var addNonBreakableLines = CodeMirror.StateEffect.define();
var nonBreakableLines = CodeMirror.StateField.define({
  create() {
    return CodeMirror.RangeSet.empty;
  },
  update(deco, tr) {
    return tr.effects.reduce((deco2, effect) => {
      return !effect.is(addNonBreakableLines) ? deco2 : deco2.update({ add: effect.value.map((pos) => nonBreakableLineMark.range(pos)) });
    }, deco.map(tr.changes));
  },
  provide: (field) => CodeMirror.lineNumberMarkers.from(field)
});
function isBreakableLine(state, line) {
  const nonBreakable = state.field(nonBreakableLines);
  if (!nonBreakable.size) {
    return true;
  }
  let found = false;
  nonBreakable.between(line.from, line.from, () => {
    found = true;
  });
  return !found;
}
function markNonBreakableLines(disassembly) {
  return nonBreakableLines.init((state) => {
    const marks = [];
    for (const lineNumber of disassembly.nonBreakableLineNumbers()) {
      if (lineNumber < state.doc.lines) {
        marks.push(nonBreakableLineMark.range(state.doc.line(lineNumber + 1).from));
      }
    }
    return CodeMirror.RangeSet.of(marks);
  });
}
var sourceFrameTheme = CodeMirror.EditorView.theme({
  "&.cm-editor": { height: "100%" },
  ".cm-scroller": { overflow: "auto" },
  ".cm-lineNumbers .cm-gutterElement.cm-nonBreakableLine": { color: "var(--sys-color-state-disabled) !important" },
  ".cm-searchMatch": {
    border: "1px solid var(--sys-color-outline)",
    borderRadius: "3px",
    margin: "0 -1px",
    "&.cm-searchMatch-selected": {
      borderRadius: "1px",
      backgroundColor: "var(--sys-color-yellow-container)",
      borderColor: "var(--sys-color-yellow-outline)",
      "&, & *": {
        color: "var(--sys-color-on-surface) !important"
      }
    }
  },
  ":host-context(.pretty-printed) & .cm-lineNumbers .cm-gutterElement": {
    color: "var(--sys-color-primary)"
  }
});
var addSourceFrameInfobar = CodeMirror.StateEffect.define();
var removeSourceFrameInfobar = CodeMirror.StateEffect.define();
var sourceFrameInfobarState = CodeMirror.StateField.define({
  create() {
    return [];
  },
  update(current, tr) {
    for (const effect of tr.effects) {
      if (effect.is(addSourceFrameInfobar)) {
        current = current.concat(effect.value);
      } else if (effect.is(removeSourceFrameInfobar)) {
        current = current.filter((b) => b.element !== effect.value.element);
      }
    }
    return current;
  },
  provide: (field) => CodeMirror.showPanel.computeN([field], (state) => state.field(field).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map((bar) => () => ({ dom: bar.element })))
});

// gen/front_end/ui/legacy/components/source_frame/ResourceSourceFrame.js
var UIStrings2 = {
  /**
   * @description Text to find an item
   */
  find: "Find"
};
var str_2 = i18n3.i18n.registerUIStrings("ui/legacy/components/source_frame/ResourceSourceFrame.ts", UIStrings2);
var i18nString2 = i18n3.i18n.getLocalizedString.bind(void 0, str_2);
var ResourceSourceFrame = class extends SourceFrameImpl {
  #resource;
  #givenContentType;
  constructor(resource, givenContentType, options) {
    const isStreamingProvider = TextUtils3.ContentProvider.isStreamingContentProvider(resource);
    const lazyContent = isStreamingProvider ? () => resource.requestStreamingContent().then(TextUtils3.StreamingContentData.asContentDataOrError) : () => resource.requestContentData();
    super(lazyContent, options);
    this.#givenContentType = givenContentType;
    this.#resource = resource;
    if (isStreamingProvider) {
      void resource.requestStreamingContent().then((streamingContent) => {
        if (!TextUtils3.StreamingContentData.isError(streamingContent)) {
          streamingContent.addEventListener("ChunkAdded", () => {
            void this.setContentDataOrError(Promise.resolve(streamingContent.content()));
          });
        }
      });
    }
  }
  static createSearchableView(resource, contentType) {
    return new SearchableContainer(resource, contentType);
  }
  getContentType() {
    return this.#givenContentType;
  }
  get resource() {
    return this.#resource;
  }
  populateTextAreaContextMenu(contextMenu, lineNumber, columnNumber) {
    super.populateTextAreaContextMenu(contextMenu, lineNumber, columnNumber);
    contextMenu.appendApplicableItems(this.#resource);
  }
};
var SearchableContainer = class extends UI2.Widget.VBox {
  sourceFrame;
  constructor(resource, contentType, element) {
    super(element, { useShadowDom: true });
    this.registerRequiredCSS(resourceSourceFrame_css_default);
    const simpleContentType = Common2.ResourceType.ResourceType.simplifyContentType(contentType);
    const sourceFrame = new ResourceSourceFrame(resource, simpleContentType);
    this.sourceFrame = sourceFrame;
    const canPrettyPrint = FORMATTABLE_MEDIA_TYPES.includes(simpleContentType);
    sourceFrame.setCanPrettyPrint(
      canPrettyPrint,
      true
      /* autoPrettyPrint */
    );
    const searchableView = new UI2.SearchableView.SearchableView(sourceFrame, sourceFrame);
    searchableView.element.classList.add("searchable-view");
    searchableView.setPlaceholder(i18nString2(UIStrings2.find));
    sourceFrame.show(searchableView.element);
    sourceFrame.setSearchableView(searchableView);
    searchableView.show(this.contentElement);
    const toolbar = this.contentElement.createChild("devtools-toolbar", "toolbar");
    void sourceFrame.toolbarItems().then((items) => {
      items.map((item) => toolbar.appendToolbarItem(item));
    });
  }
  async revealPosition(position) {
    this.sourceFrame.revealPosition(position, true);
  }
};

// gen/front_end/ui/legacy/components/source_frame/StreamingContentHexView.js
var StreamingContentHexView_exports = {};
__export(StreamingContentHexView_exports, {
  StreamingContentHexView: () => StreamingContentHexView
});
import * as TextUtils4 from "./../../../../models/text_utils/text_utils.js";
import * as LinearMemoryInspectorComponents from "./../../../../panels/linear_memory_inspector/components/components.js";
import * as UI3 from "./../../legacy.js";
var MEMORY_TRANSFER_MIN_CHUNK_SIZE = 1e3;
var LinearMemoryInspectorView = class extends UI3.Widget.VBox {
  #memory = new Uint8Array([0]);
  #address = 0;
  #inspector = new LinearMemoryInspectorComponents.LinearMemoryInspector.LinearMemoryInspector();
  constructor() {
    super();
    this.#inspector.addEventListener("MemoryRequest", this.#memoryRequested, this);
    this.#inspector.addEventListener("AddressChanged", (event) => {
      this.#address = event.data;
    });
    this.#inspector.show(this.contentElement);
  }
  wasShown() {
    super.wasShown();
    this.refreshData();
  }
  setMemory(memory) {
    this.#memory = memory;
    this.refreshData();
  }
  refreshData() {
    const memoryChunkStart = Math.max(0, this.#address - MEMORY_TRANSFER_MIN_CHUNK_SIZE / 2);
    const memoryChunkEnd = memoryChunkStart + MEMORY_TRANSFER_MIN_CHUNK_SIZE;
    const memory = this.#memory.slice(memoryChunkStart, memoryChunkEnd);
    this.#inspector.memory = memory;
    this.#inspector.address = this.#address;
    this.#inspector.memoryOffset = memoryChunkStart;
    this.#inspector.outerMemoryLength = this.#memory.length;
    this.#inspector.hideValueInspector = true;
  }
  #memoryRequested(event) {
    const { start, end, address } = event.data;
    if (address < start || address >= end) {
      throw new Error("Requested address is out of bounds.");
    }
    if (start < 0 || start > end || start >= this.#memory.length) {
      throw new Error("Requested range is out of bounds.");
    }
    const chunkEnd = Math.max(end, start + MEMORY_TRANSFER_MIN_CHUNK_SIZE);
    const memory = this.#memory.slice(start, chunkEnd);
    this.#inspector.memory = memory;
    this.#inspector.address = address;
    this.#inspector.memoryOffset = start;
    this.#inspector.outerMemoryLength = this.#memory.length;
    this.#inspector.hideValueInspector = true;
  }
};
var StreamingContentHexView = class extends LinearMemoryInspectorView {
  #streamingContentData;
  constructor(streamingContentData) {
    super();
    this.#streamingContentData = streamingContentData;
  }
  wasShown() {
    super.wasShown();
    this.#updateMemoryFromContentData();
    this.#streamingContentData.addEventListener("ChunkAdded", this.#updateMemoryFromContentData, this);
  }
  willHide() {
    super.willHide();
    this.#streamingContentData.removeEventListener("ChunkAdded", this.#updateMemoryFromContentData, this);
  }
  #updateMemoryFromContentData() {
    const binaryString = window.atob(this.#streamingContentData.content().base64);
    const memory = Uint8Array.from(binaryString, (m) => m.codePointAt(0));
    this.setMemory(memory);
  }
};

// gen/front_end/ui/legacy/components/source_frame/BinaryResourceViewFactory.js
var BinaryResourceViewFactory = class _BinaryResourceViewFactory {
  streamingContent;
  contentUrl;
  resourceType;
  constructor(content, contentUrl, resourceType) {
    this.streamingContent = content;
    this.contentUrl = contentUrl;
    this.resourceType = resourceType;
  }
  hex() {
    const binaryString = window.atob(this.base64());
    const array = Uint8Array.from(binaryString, (m) => m.codePointAt(0));
    return _BinaryResourceViewFactory.#uint8ArrayToHexString(array);
  }
  base64() {
    return this.streamingContent.content().base64;
  }
  utf8() {
    return new TextUtils5.ContentData.ContentData(
      this.base64(),
      /* isBase64 */
      true,
      "text/plain",
      "utf-8"
    ).text;
  }
  createBase64View() {
    const resourceFrame = new ResourceSourceFrame(TextUtils5.StaticContentProvider.StaticContentProvider.fromString(this.contentUrl, this.resourceType, this.streamingContent.content().base64), this.resourceType.canonicalMimeType(), { lineNumbers: false, lineWrapping: true });
    this.streamingContent.addEventListener("ChunkAdded", () => {
      void resourceFrame.setContent(this.base64());
    });
    return resourceFrame;
  }
  createHexView() {
    return new StreamingContentHexView(this.streamingContent);
  }
  createUtf8View() {
    const resourceFrame = new ResourceSourceFrame(TextUtils5.StaticContentProvider.StaticContentProvider.fromString(this.contentUrl, this.resourceType, this.utf8()), this.resourceType.canonicalMimeType(), { lineNumbers: true, lineWrapping: true });
    this.streamingContent.addEventListener("ChunkAdded", () => {
      void resourceFrame.setContent(this.utf8());
    });
    return resourceFrame;
  }
  static #uint8ArrayToHexString(uint8Array) {
    let output = "";
    for (let i = 0; i < uint8Array.length; i++) {
      output += _BinaryResourceViewFactory.#numberToHex(uint8Array[i], 2);
    }
    return output;
  }
  static #numberToHex(number, padding) {
    let hex = number.toString(16);
    while (hex.length < padding) {
      hex = "0" + hex;
    }
    return hex;
  }
};

// gen/front_end/ui/legacy/components/source_frame/FontView.js
var FontView_exports = {};
__export(FontView_exports, {
  FontView: () => FontView
});
import * as i18n5 from "./../../../../core/i18n/i18n.js";
import * as Platform2 from "./../../../../core/platform/platform.js";
import * as TextUtils6 from "./../../../../models/text_utils/text_utils.js";
import * as VisualLogging2 from "./../../../visual_logging/visual_logging.js";
import * as UI4 from "./../../legacy.js";

// gen/front_end/ui/legacy/components/source_frame/fontView.css.js
var fontView_css_default = `/*
 * Copyright 2014 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.font-view {
  font-size: 60px;
  white-space: pre-wrap;
  overflow-wrap: break-word;
  text-align: center;
  padding: 15px;
}

/*# sourceURL=${import.meta.resolve("./fontView.css")} */`;

// gen/front_end/ui/legacy/components/source_frame/FontView.js
var UIStrings3 = {
  /**
   * @description Text that appears on a button for the font resource type filter.
   */
  font: "Font",
  /**
   * @description Aria accessible name in Font View of the Sources panel
   * @example {https://example.com} PH1
   */
  previewOfFontFromS: "Preview of font from {PH1}"
};
var str_3 = i18n5.i18n.registerUIStrings("ui/legacy/components/source_frame/FontView.ts", UIStrings3);
var i18nString3 = i18n5.i18n.getLocalizedString.bind(void 0, str_3);
var FontView = class extends UI4.View.SimpleView {
  url;
  contentProvider;
  mimeTypeLabel;
  fontPreviewElement;
  dummyElement;
  fontStyleElement;
  inResize;
  constructor(mimeType, contentProvider) {
    super({
      title: i18nString3(UIStrings3.font),
      viewId: "font",
      jslog: `${VisualLogging2.pane("font-view")}`
    });
    this.registerRequiredCSS(fontView_css_default);
    this.element.classList.add("font-view");
    this.url = contentProvider.contentURL();
    UI4.ARIAUtils.setLabel(this.element, i18nString3(UIStrings3.previewOfFontFromS, { PH1: this.url }));
    this.contentProvider = contentProvider;
    this.mimeTypeLabel = new UI4.Toolbar.ToolbarText(mimeType);
  }
  async toolbarItems() {
    return [this.mimeTypeLabel];
  }
  onFontContentLoaded(uniqueFontName, contentData) {
    const url = TextUtils6.ContentData.ContentData.isError(contentData) ? this.url : contentData.asDataUrl();
    if (!this.fontStyleElement) {
      return;
    }
    this.fontStyleElement.textContent = Platform2.StringUtilities.sprintf('@font-face { font-family: "%s"; src: url(%s); }', uniqueFontName, url);
    this.updateFontPreviewSize();
  }
  createContentIfNeeded() {
    if (this.fontPreviewElement) {
      return;
    }
    const uniqueFontName = `WebInspectorFontPreview${++fontId}`;
    this.fontStyleElement = document.createElement("style");
    void this.contentProvider.requestContentData().then((contentData) => {
      this.onFontContentLoaded(uniqueFontName, contentData);
    });
    this.element.appendChild(this.fontStyleElement);
    const fontPreview = document.createElement("div");
    for (let i = 0; i < FONT_PREVIEW_LINES.length; ++i) {
      if (i > 0) {
        fontPreview.createChild("br");
      }
      UI4.UIUtils.createTextChild(fontPreview, FONT_PREVIEW_LINES[i]);
    }
    this.fontPreviewElement = fontPreview.cloneNode(true);
    if (!this.fontPreviewElement) {
      return;
    }
    UI4.ARIAUtils.setHidden(this.fontPreviewElement, true);
    this.fontPreviewElement.style.overflow = "hidden";
    this.fontPreviewElement.style.setProperty("font-family", uniqueFontName);
    this.fontPreviewElement.style.setProperty("visibility", "hidden");
    this.dummyElement = fontPreview;
    this.dummyElement.style.visibility = "hidden";
    this.dummyElement.style.zIndex = "-1";
    this.dummyElement.style.display = "inline";
    this.dummyElement.style.position = "absolute";
    this.dummyElement.style.setProperty("font-family", uniqueFontName);
    this.dummyElement.style.setProperty("font-size", MEASUURE_FONT_SIZE + "px");
    this.element.appendChild(this.fontPreviewElement);
  }
  wasShown() {
    super.wasShown();
    this.createContentIfNeeded();
    this.updateFontPreviewSize();
  }
  onResize() {
    if (this.inResize) {
      return;
    }
    this.inResize = true;
    try {
      this.updateFontPreviewSize();
    } finally {
      this.inResize = null;
    }
  }
  measureElement() {
    if (!this.dummyElement) {
      throw new Error("No font preview loaded");
    }
    this.element.appendChild(this.dummyElement);
    const result = { width: this.dummyElement.offsetWidth, height: this.dummyElement.offsetHeight };
    this.element.removeChild(this.dummyElement);
    return result;
  }
  updateFontPreviewSize() {
    if (!this.fontPreviewElement || !this.isShowing()) {
      return;
    }
    this.fontPreviewElement.style.removeProperty("visibility");
    const dimension = this.measureElement();
    const height = dimension.height;
    const width = dimension.width;
    const containerWidth = this.element.offsetWidth - 50;
    const containerHeight = this.element.offsetHeight - 30;
    if (!height || !width || !containerWidth || !containerHeight) {
      this.fontPreviewElement.style.removeProperty("font-size");
      return;
    }
    const widthRatio = containerWidth / width;
    const heightRatio = containerHeight / height;
    const finalFontSize = Math.floor(MEASUURE_FONT_SIZE * Math.min(widthRatio, heightRatio)) - 2;
    this.fontPreviewElement.style.setProperty("font-size", finalFontSize + "px", void 0);
  }
};
var fontId = 0;
var FONT_PREVIEW_LINES = ["ABCDEFGHIJKLM", "NOPQRSTUVWXYZ", "abcdefghijklm", "nopqrstuvwxyz", "1234567890"];
var MEASUURE_FONT_SIZE = 50;

// gen/front_end/ui/legacy/components/source_frame/ImageView.js
var ImageView_exports = {};
__export(ImageView_exports, {
  ImageView: () => ImageView
});
import * as Common3 from "./../../../../core/common/common.js";
import * as Host2 from "./../../../../core/host/host.js";
import * as i18n7 from "./../../../../core/i18n/i18n.js";
import * as Platform3 from "./../../../../core/platform/platform.js";
import * as TextUtils7 from "./../../../../models/text_utils/text_utils.js";
import * as Workspace from "./../../../../models/workspace/workspace.js";
import * as VisualLogging3 from "./../../../visual_logging/visual_logging.js";
import * as UI5 from "./../../legacy.js";

// gen/front_end/ui/legacy/components/source_frame/imageView.css.js
var imageView_css_default = `/*
 * Copyright 2014 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.image-view {
  overflow: auto;
}

.image-view > .image {
  padding: 20px 20px 10px;
  text-align: center;
}

.image-view img.resource-image-view {
  max-width: 100%;
  max-height: 1000px;
  background-image: var(--image-file-checker);
  box-shadow: 0 5px 10px var(--sys-color-outline);
  user-select: text;
  -webkit-user-drag: auto;
}

/*# sourceURL=${import.meta.resolve("./imageView.css")} */`;

// gen/front_end/ui/legacy/components/source_frame/ImageView.js
var UIStrings4 = {
  /**
   * @description Text in Image View of the Sources panel
   */
  image: "Image",
  /**
   * @description Text that appears when user drag and drop something (for example, a file) in Image View of the Sources panel
   */
  dropImageFileHere: "Drop image file here",
  /**
   * @description Text to indicate the source of an image
   * @example {example.com} PH1
   */
  imageFromS: "Image from {PH1}",
  /**
   * @description Text in Image View of the Sources panel
   * @example {2} PH1
   * @example {2} PH2
   */
  dD: "{PH1} \xD7 {PH2}",
  /**
   * @description A context menu item in the Image View of the Sources panel
   */
  copyImageUrl: "Copy image URL",
  /**
   * @description A context menu item in the Image View of the Sources panel
   */
  copyImageAsDataUri: "Copy image as data URI",
  /**
   * @description A context menu item in the Image View of the Sources panel
   */
  openImageInNewTab: "Open image in new tab",
  /**
   * @description A context menu item in the Image Preview
   */
  saveImageAs: "Save image as\u2026",
  /**
   * @description The default file name when downloading a file
   */
  download: "download"
};
var str_4 = i18n7.i18n.registerUIStrings("ui/legacy/components/source_frame/ImageView.ts", UIStrings4);
var i18nString4 = i18n7.i18n.getLocalizedString.bind(void 0, str_4);
var ImageView = class extends UI5.View.SimpleView {
  url;
  parsedURL;
  contentProvider;
  uiSourceCode;
  sizeLabel;
  dimensionsLabel;
  aspectRatioLabel;
  mimeTypeLabel;
  container;
  imagePreviewElement;
  cachedContent;
  constructor(mimeType, contentProvider) {
    super({
      title: i18nString4(UIStrings4.image),
      viewId: "image",
      jslog: `${VisualLogging3.pane("image-view")}}`
    });
    this.registerRequiredCSS(imageView_css_default);
    this.element.tabIndex = -1;
    this.element.classList.add("image-view");
    this.url = contentProvider.contentURL();
    this.parsedURL = new Common3.ParsedURL.ParsedURL(this.url);
    this.contentProvider = contentProvider;
    this.uiSourceCode = contentProvider instanceof Workspace.UISourceCode.UISourceCode ? contentProvider : null;
    if (this.uiSourceCode) {
      this.uiSourceCode.addEventListener(Workspace.UISourceCode.Events.WorkingCopyCommitted, this.workingCopyCommitted, this);
      new UI5.DropTarget.DropTarget(this.element, [UI5.DropTarget.Type.ImageFile, UI5.DropTarget.Type.URI], i18nString4(UIStrings4.dropImageFileHere), this.handleDrop.bind(this));
    }
    this.sizeLabel = new UI5.Toolbar.ToolbarText();
    this.dimensionsLabel = new UI5.Toolbar.ToolbarText();
    this.aspectRatioLabel = new UI5.Toolbar.ToolbarText();
    this.mimeTypeLabel = new UI5.Toolbar.ToolbarText(mimeType);
    this.container = this.element.createChild("div", "image");
    this.imagePreviewElement = this.container.createChild("img", "resource-image-view");
    this.imagePreviewElement.addEventListener("contextmenu", this.contextMenu.bind(this), true);
  }
  async toolbarItems() {
    await this.updateContentIfNeeded();
    return [
      this.sizeLabel,
      new UI5.Toolbar.ToolbarSeparator(),
      this.dimensionsLabel,
      new UI5.Toolbar.ToolbarSeparator(),
      this.aspectRatioLabel,
      new UI5.Toolbar.ToolbarSeparator(),
      this.mimeTypeLabel
    ];
  }
  wasShown() {
    super.wasShown();
    void this.updateContentIfNeeded();
  }
  disposeView() {
    if (this.uiSourceCode) {
      this.uiSourceCode.removeEventListener(Workspace.UISourceCode.Events.WorkingCopyCommitted, this.workingCopyCommitted, this);
    }
  }
  workingCopyCommitted() {
    void this.updateContentIfNeeded();
  }
  async updateContentIfNeeded() {
    const content = await this.contentProvider.requestContentData();
    if (TextUtils7.ContentData.ContentData.isError(content) || this.cachedContent?.contentEqualTo(content)) {
      return;
    }
    this.cachedContent = content;
    const imageSrc = content.asDataUrl() ?? this.url;
    const loadPromise = new Promise((x) => {
      this.imagePreviewElement.onload = x;
    });
    this.imagePreviewElement.src = imageSrc;
    this.imagePreviewElement.alt = i18nString4(UIStrings4.imageFromS, { PH1: this.url });
    const size = content.isTextContent ? content.text.length : Platform3.StringUtilities.base64ToSize(content.base64);
    this.sizeLabel.setText(i18n7.ByteUtilities.bytesToString(size));
    await loadPromise;
    this.dimensionsLabel.setText(i18nString4(UIStrings4.dD, { PH1: this.imagePreviewElement.naturalWidth, PH2: this.imagePreviewElement.naturalHeight }));
    this.aspectRatioLabel.setText(Platform3.NumberUtilities.aspectRatio(this.imagePreviewElement.naturalWidth, this.imagePreviewElement.naturalHeight));
  }
  contextMenu(event) {
    const contextMenu = new UI5.ContextMenu.ContextMenu(event);
    const parsedSrc = new Common3.ParsedURL.ParsedURL(this.imagePreviewElement.src);
    if (!this.parsedURL.isDataURL()) {
      contextMenu.clipboardSection().appendItem(i18nString4(UIStrings4.copyImageUrl), this.copyImageURL.bind(this), {
        jslogContext: "image-view.copy-image-url"
      });
    }
    if (parsedSrc.isDataURL()) {
      contextMenu.clipboardSection().appendItem(i18nString4(UIStrings4.copyImageAsDataUri), this.copyImageAsDataURL.bind(this), {
        jslogContext: "image-view.copy-image-as-data-url"
      });
    }
    contextMenu.clipboardSection().appendItem(i18nString4(UIStrings4.openImageInNewTab), this.openInNewTab.bind(this), {
      jslogContext: "image-view.open-in-new-tab"
    });
    contextMenu.clipboardSection().appendItem(i18nString4(UIStrings4.saveImageAs), this.saveImage.bind(this), {
      jslogContext: "image-view.save-image"
    });
    void contextMenu.show();
  }
  copyImageAsDataURL() {
    Host2.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(this.imagePreviewElement.src);
  }
  copyImageURL() {
    Host2.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(this.url);
  }
  async saveImage() {
    const imageDataURL = this.cachedContent?.asDataUrl();
    if (!imageDataURL) {
      return;
    }
    let suggestedName = "";
    if (this.parsedURL.isDataURL()) {
      suggestedName = i18nString4(UIStrings4.download);
      const { type, subtype } = this.parsedURL.extractDataUrlMimeType();
      if (type === "image" && subtype) {
        suggestedName += "." + subtype;
      }
    } else {
      suggestedName = decodeURIComponent(this.parsedURL.displayName);
    }
    const blob = await fetch(imageDataURL).then((r) => r.blob());
    try {
      const handle = await window.showSaveFilePicker({ suggestedName });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
    } catch (error) {
      if (error.name === "AbortError") {
        return;
      }
      throw error;
    }
  }
  openInNewTab() {
    Host2.InspectorFrontendHost.InspectorFrontendHostInstance.openInNewTab(this.url);
  }
  async handleDrop(dataTransfer) {
    const items = dataTransfer.items;
    if (!items.length || items[0].kind !== "file") {
      return;
    }
    const file = items[0].getAsFile();
    if (!file) {
      return;
    }
    const encoded = !file.name.endsWith(".svg");
    const fileCallback = (file2) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        let result;
        try {
          result = reader.result;
        } catch (e) {
          result = null;
          console.error("Can't read file: " + e);
        }
        if (typeof result !== "string" || !this.uiSourceCode) {
          return;
        }
        this.uiSourceCode.setContent(encoded ? btoa(result) : result, encoded);
      };
      if (encoded) {
        reader.readAsBinaryString(file2);
      } else {
        reader.readAsText(file2);
      }
    };
    fileCallback(file);
  }
};

// gen/front_end/ui/legacy/components/source_frame/JSONView.js
var JSONView_exports = {};
__export(JSONView_exports, {
  JSONView: () => JSONView,
  ParsedJSON: () => ParsedJSON,
  SearchableJsonView: () => SearchableJsonView
});
import * as i18n9 from "./../../../../core/i18n/i18n.js";
import * as Platform4 from "./../../../../core/platform/platform.js";
import * as SDK2 from "./../../../../core/sdk/sdk.js";
import * as Highlighting from "./../../../components/highlighting/highlighting.js";
import * as VisualLogging4 from "./../../../visual_logging/visual_logging.js";
import * as UI6 from "./../../legacy.js";
import * as ObjectUI from "./../object_ui/object_ui.js";

// gen/front_end/ui/legacy/components/source_frame/jsonView.css.js
var jsonView_css_default = `/*
 * Copyright 2021 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.json-view {
  padding: 2px 6px;
  overflow: auto;
}

/*# sourceURL=${import.meta.resolve("./jsonView.css")} */`;

// gen/front_end/ui/legacy/components/source_frame/JSONView.js
var UIStrings5 = {
  /**
   * @description Text to find an item
   */
  find: "Find"
};
var str_5 = i18n9.i18n.registerUIStrings("ui/legacy/components/source_frame/JSONView.ts", UIStrings5);
var i18nString5 = i18n9.i18n.getLocalizedString.bind(void 0, str_5);
var JSONView = class _JSONView extends UI6.Widget.VBox {
  initialized;
  parsedJSON;
  startCollapsed;
  searchableView;
  treeOutline;
  currentSearchFocusIndex;
  currentSearchTreeElements;
  searchRegex;
  constructor(parsedJSON, startCollapsed) {
    super();
    this.initialized = false;
    this.registerRequiredCSS(jsonView_css_default);
    this.parsedJSON = parsedJSON;
    this.startCollapsed = Boolean(startCollapsed);
    this.element.classList.add("json-view");
    this.element.setAttribute("jslog", `${VisualLogging4.section("json-view")}`);
    this.currentSearchFocusIndex = 0;
    this.currentSearchTreeElements = [];
    this.searchRegex = null;
  }
  static async createView(content) {
    const parsedJSON = await _JSONView.parseJSON(content);
    if (!parsedJSON || typeof parsedJSON.data !== "object") {
      return null;
    }
    const jsonView = new _JSONView(parsedJSON);
    const searchableView = new UI6.SearchableView.SearchableView(jsonView, null);
    searchableView.setPlaceholder(i18nString5(UIStrings5.find));
    jsonView.searchableView = searchableView;
    jsonView.show(searchableView.element);
    return searchableView;
  }
  static createViewSync(obj, element) {
    const jsonView = new _JSONView(new ParsedJSON(obj, "", ""));
    const searchableView = new UI6.SearchableView.SearchableView(jsonView, null, void 0, element);
    searchableView.setPlaceholder(i18nString5(UIStrings5.find));
    jsonView.searchableView = searchableView;
    jsonView.show(searchableView.element);
    jsonView.element.tabIndex = 0;
    return searchableView;
  }
  setSearchableView(searchableView) {
    this.searchableView = searchableView;
  }
  static parseJSON(text) {
    let returnObj = null;
    if (text) {
      returnObj = _JSONView.extractJSON(text);
    }
    if (!returnObj) {
      return Promise.resolve(null);
    }
    try {
      const json = JSON.parse(returnObj.data);
      if (!json) {
        return Promise.resolve(null);
      }
      returnObj.data = json;
    } catch {
      returnObj = null;
    }
    return Promise.resolve(returnObj);
  }
  static extractJSON(text) {
    if (text.startsWith("<")) {
      return null;
    }
    let inner = _JSONView.findBrackets(text, "{", "}");
    const inner2 = _JSONView.findBrackets(text, "[", "]");
    inner = inner2.length > inner.length ? inner2 : inner;
    if (inner.length === -1 || text.length - inner.length > 80) {
      return null;
    }
    const prefix = text.substring(0, inner.start);
    const suffix = text.substring(inner.end + 1);
    text = text.substring(inner.start, inner.end + 1);
    if (suffix.trim().length && !(suffix.trim().startsWith(")") && prefix.trim().endsWith("("))) {
      return null;
    }
    return new ParsedJSON(text, prefix, suffix);
  }
  static findBrackets(text, open, close) {
    const start = text.indexOf(open);
    const end = text.lastIndexOf(close);
    let length = end - start - 1;
    if (start === -1 || end === -1 || end < start) {
      length = -1;
    }
    return { start, end, length };
  }
  wasShown() {
    super.wasShown();
    this.initialize();
  }
  initialize() {
    if (this.initialized) {
      return;
    }
    this.initialized = true;
    const obj = SDK2.RemoteObject.RemoteObject.fromLocalObject(this.parsedJSON.data);
    const title = this.parsedJSON.prefix + obj.description + this.parsedJSON.suffix;
    this.treeOutline = new ObjectUI.ObjectPropertiesSection.ObjectPropertiesSection(
      obj,
      title,
      void 0,
      true
      /* showOverflow */
    );
    this.treeOutline.enableContextMenu();
    this.treeOutline.setEditable(false);
    if (!this.startCollapsed) {
      this.treeOutline.expand();
    }
    this.element.appendChild(this.treeOutline.element);
    const firstChild = this.treeOutline.firstChild();
    if (firstChild) {
      firstChild.select(
        true,
        false
        /* selectedByUser */
      );
    }
  }
  jumpToMatch(index) {
    if (!this.searchRegex) {
      return;
    }
    const previousFocusElement = this.currentSearchTreeElements[this.currentSearchFocusIndex];
    if (previousFocusElement) {
      previousFocusElement.setSearchRegex(this.searchRegex);
    }
    const newFocusElement = this.currentSearchTreeElements[index];
    if (newFocusElement) {
      this.updateSearchIndex(index);
      newFocusElement.setSearchRegex(this.searchRegex, Highlighting.highlightedCurrentSearchResultClassName);
      newFocusElement.reveal();
    } else {
      this.updateSearchIndex(0);
    }
  }
  updateSearchCount(count) {
    if (!this.searchableView) {
      return;
    }
    this.searchableView.updateSearchMatchesCount(count);
  }
  updateSearchIndex(index) {
    this.currentSearchFocusIndex = index;
    if (!this.searchableView) {
      return;
    }
    this.searchableView.updateCurrentMatchIndex(index);
  }
  onSearchCanceled() {
    this.searchRegex = null;
    this.currentSearchTreeElements = [];
    let element;
    for (element = this.treeOutline.rootElement(); element; element = element.traverseNextTreeElement(false)) {
      if (!(element instanceof ObjectUI.ObjectPropertiesSection.ObjectPropertyTreeElement)) {
        continue;
      }
      element.revertHighlightChanges();
    }
    this.updateSearchCount(0);
    this.updateSearchIndex(0);
  }
  performSearch(searchConfig, _shouldJump, jumpBackwards) {
    let newIndex = this.currentSearchFocusIndex;
    const previousSearchFocusElement = this.currentSearchTreeElements[newIndex];
    this.onSearchCanceled();
    this.searchRegex = searchConfig.toSearchRegex(true).regex;
    let element;
    for (element = this.treeOutline.rootElement(); element; element = element.traverseNextTreeElement(false)) {
      if (!(element instanceof ObjectUI.ObjectPropertiesSection.ObjectPropertyTreeElement)) {
        continue;
      }
      const hasMatch = element.setSearchRegex(this.searchRegex);
      if (hasMatch) {
        this.currentSearchTreeElements.push(element);
      }
      if (previousSearchFocusElement === element) {
        const currentIndex = this.currentSearchTreeElements.length - 1;
        if (hasMatch || jumpBackwards) {
          newIndex = currentIndex;
        } else {
          newIndex = currentIndex + 1;
        }
      }
    }
    this.updateSearchCount(this.currentSearchTreeElements.length);
    if (!this.currentSearchTreeElements.length) {
      this.updateSearchIndex(-1);
      return;
    }
    newIndex = Platform4.NumberUtilities.mod(newIndex, this.currentSearchTreeElements.length);
    this.jumpToMatch(newIndex);
  }
  jumpToNextSearchResult() {
    if (!this.currentSearchTreeElements.length) {
      return;
    }
    const newIndex = Platform4.NumberUtilities.mod(this.currentSearchFocusIndex + 1, this.currentSearchTreeElements.length);
    this.jumpToMatch(newIndex);
  }
  jumpToPreviousSearchResult() {
    if (!this.currentSearchTreeElements.length) {
      return;
    }
    const newIndex = Platform4.NumberUtilities.mod(this.currentSearchFocusIndex - 1, this.currentSearchTreeElements.length);
    this.jumpToMatch(newIndex);
  }
  supportsCaseSensitiveSearch() {
    return true;
  }
  supportsWholeWordSearch() {
    return true;
  }
  supportsRegexSearch() {
    return true;
  }
};
var ParsedJSON = class {
  data;
  prefix;
  suffix;
  constructor(data, prefix, suffix) {
    this.data = data;
    this.prefix = prefix;
    this.suffix = suffix;
  }
};
var SearchableJsonView = class extends UI6.SearchableView.SearchableView {
  #jsonView;
  constructor(element) {
    const jsonView = new JSONView(new ParsedJSON("", "", ""));
    super(jsonView, null, void 0, element);
    this.#jsonView = jsonView;
    this.setPlaceholder(i18nString5(UIStrings5.find));
    jsonView.setSearchableView(this);
    jsonView.show(this.element);
    jsonView.element.tabIndex = 0;
  }
  set jsonObject(obj) {
    const jsonView = new JSONView(new ParsedJSON(obj, "", ""));
    this.#jsonView.detach();
    this.#jsonView = jsonView;
    this.searchProvider = jsonView;
    jsonView.show(this.element);
    this.requestUpdate();
  }
};

// gen/front_end/ui/legacy/components/source_frame/PreviewFactory.js
var PreviewFactory_exports = {};
__export(PreviewFactory_exports, {
  PreviewFactory: () => PreviewFactory
});
import * as Common4 from "./../../../../core/common/common.js";
import * as i18n13 from "./../../../../core/i18n/i18n.js";
import * as TextUtils9 from "./../../../../models/text_utils/text_utils.js";
import * as UI8 from "./../../legacy.js";

// gen/front_end/ui/legacy/components/source_frame/XMLView.js
var XMLView_exports = {};
__export(XMLView_exports, {
  DEFAULT_VIEW: () => DEFAULT_VIEW,
  XMLTreeViewModel: () => XMLTreeViewModel,
  XMLTreeViewNode: () => XMLTreeViewNode,
  XMLView: () => XMLView
});
import "./../../../components/highlighting/highlighting.js";
import * as i18n11 from "./../../../../core/i18n/i18n.js";
import * as TextUtils8 from "./../../../../models/text_utils/text_utils.js";
import * as Lit from "./../../../lit/lit.js";
import * as VisualLogging5 from "./../../../visual_logging/visual_logging.js";
import * as UI7 from "./../../legacy.js";

// gen/front_end/ui/legacy/components/source_frame/xmlTree.css.js
var xmlTree_css_default = `/*
 * Copyright 2016 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

@scope to (devtools-widget > *) {
.tree-outline ol {
  list-style: none;
  padding: 0;
  margin: 0;
  padding-inline-start: 16px;
}

ol.tree-outline {
  padding-inline-start: 0;
}

.tree-outline li {
  min-height: 12px;
}

::part(shadow-xml-view-close-tag) {
  margin-left: -16px;
}

::part(shadow-xml-view-close-tag),::part(shadow-xml-view-tag) {
  color: var(--sys-color-purple);
}

::part(shadow-xml-view-comment) {
  color: var(--sys-color-green);
}

::part(shadow-xml-view-processing-instruction) {
  color: var(--sys-color-green);
}

::part(shadow-xml-view-attribute-name) {
  color: var(--sys-color-orange);
}

::part(shadow-xml-view-attribute-value) {
  color: var(--sys-color-blue);
}

::part(shadow-xml-view-text) {
  color: var(--sys-color-on-surface);
  white-space: pre;
}

::part(shadow-xml-view-cdata) {
  color: var(--sys-color-on-surface);
}
}

/*# sourceURL=${import.meta.resolve("./xmlTree.css")} */`;

// gen/front_end/ui/legacy/components/source_frame/xmlView.css.js
var xmlView_css_default = `/*
 * Copyright 2014 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.shadow-xml-view {
  user-select: text;
  overflow: auto;
  padding: 0;
}

/*# sourceURL=${import.meta.resolve("./xmlView.css")} */`;

// gen/front_end/ui/legacy/components/source_frame/XMLView.js
var UIStrings6 = {
  /**
   * @description Text to find an item
   */
  find: "Find"
};
var str_6 = i18n11.i18n.registerUIStrings("ui/legacy/components/source_frame/XMLView.ts", UIStrings6);
var i18nString6 = i18n11.i18n.getLocalizedString.bind(void 0, str_6);
var { render, html } = Lit;
function* attributes(element) {
  for (let i = 0; i < element.attributes.length; ++i) {
    const attributeNode = element.attributes.item(i);
    if (attributeNode) {
      yield attributeNode;
    }
  }
}
function hasNonTextChildren(node) {
  return Boolean(node.childNodes.values().find((node2) => node2.nodeType !== Node.TEXT_NODE));
}
function textView(treeNode, closeTag) {
  const { node } = treeNode;
  switch (node.nodeType) {
    case Node.ELEMENT_NODE:
      if (node instanceof Element) {
        const tag = node.tagName;
        return closeTag ? hasNonTextChildren(node) || node.textContent ? "</" + tag + ">" : "" : `${"<" + tag}${attributes(node).map((attributeNode) => `${"\xA0"}${attributeNode.name}${'="'}${attributeNode.value}${'"'}`).toArray().join("")}${hasNonTextChildren(node) ? "" : node.textContent ? `${">"}${node.textContent}${"</" + tag}` : `${" /"}`}${">"}`;
      }
      return "";
    case Node.TEXT_NODE:
      return node.nodeValue && !closeTag ? `${node.nodeValue}` : "";
    case Node.CDATA_SECTION_NODE:
      return node.nodeValue && !closeTag ? `${"<![CDATA["}${node.nodeValue}${"]]>"}` : "";
    case Node.PROCESSING_INSTRUCTION_NODE:
      return node.nodeValue && !closeTag ? `${"<?" + node.nodeName + " " + node.nodeValue + "?>"}` : "";
    case Node.COMMENT_NODE:
      return !closeTag ? `${"<!--" + node.nodeValue + "-->"}` : "";
  }
  return "";
}
function htmlView(treeNode) {
  const { node } = treeNode;
  switch (node.nodeType) {
    case Node.ELEMENT_NODE:
      if (node instanceof Element) {
        const tag = node.tagName;
        return html`<span part='shadow-xml-view-tag'>${"<" + tag}</span>${attributes(node).map((attributeNode) => html`<span part='shadow-xml-view-tag'>${"\xA0"}</span>
                <span part='shadow-xml-view-attribute-name'>${attributeNode.name}</span>
                <span part='shadow-xml-view-tag'>${'="'}</span>
                <span part='shadow-xml-view-attribute-value'>${attributeNode.value}</span>
                <span part='shadow-xml-view-tag'>${'"'}</span>`)}
                <span ?hidden=${treeNode.expanded}>${hasNonTextChildren(node) ? html`<span part='shadow-xml-view-tag'>${">"}</span>
                  <span part='shadow-xml-view-comment'>${"\u2026"}</span>
                  <span part='shadow-xml-view-tag'>${"</" + tag}</span>` : node.textContent ? html`<span part='shadow-xml-view-tag'>${">"}</span>
                  <span part='shadow-xml-view-text'>${node.textContent}</span>
                  <span part='shadow-xml-view-tag'>${"</" + tag}</span>` : html`<span part='shadow-xml-view-tag'>${" /"}</span>`}</span>
                <span part='shadow-xml-view-tag'>${">"}</span>`;
      }
      return Lit.nothing;
    case Node.TEXT_NODE:
      return node.nodeValue ? html`<span part='shadow-xml-view-text'>${node.nodeValue}</span>` : Lit.nothing;
    case Node.CDATA_SECTION_NODE:
      return node.nodeValue ? html`<span part='shadow-xml-view-cdata'>${"<![CDATA["}</span>
          <span part='shadow-xml-view-text'>${node.nodeValue}</span>
          <span part='shadow-xml-view-cdata'>${"]]>"}</span>` : Lit.nothing;
    case Node.PROCESSING_INSTRUCTION_NODE:
      return node.nodeValue ? html`<span part='shadow-xml-view-processing-instruction'>${"<?" + node.nodeName + " " + node.nodeValue + "?>"}</span>` : Lit.nothing;
    case Node.COMMENT_NODE:
      return html`<span part='shadow-xml-view-comment'>${"<!--" + node.nodeValue + "-->"}</span>`;
  }
  return Lit.nothing;
}
var DEFAULT_VIEW = (input, output, target) => {
  function highlight(node, closeTag) {
    let highlights = "";
    let selected = "";
    if (!input.search) {
      return { highlights, selected };
    }
    const entries = input.search.getResults(node);
    for (const entry of entries ?? []) {
      if (entry.isPostOrderMatch === closeTag) {
        const range = new TextUtils8.TextRange.SourceRange(entry.match.index, entry.match[0].length);
        if (entry === input.jumpToNextSearchResult) {
          selected = `${range.offset},${range.length}`;
        } else {
          highlights += `${range.offset},${range.length} `;
        }
      }
    }
    return { highlights, selected };
  }
  function layOutNode(node, populateSubtrees = false) {
    const onExpand = (event) => input.onExpand(node, event.detail.expanded);
    const { highlights, selected } = highlight(
      node,
      /* closeTag=*/
      false
    );
    return html`
      <li role="treeitem"
          ?selected=${input.jumpToNextSearchResult?.node === node}
          @expand=${onExpand}>
        <devtools-highlight ranges=${highlights} current-range=${selected}>
          ${htmlView(node)}
        </devtools-highlight>
        ${node.children().length ? html`
          <ul role="group" ?hidden=${!node.expanded && input.jumpToNextSearchResult?.node !== node}>
            ${populateSubtrees || input.search ? subtree(node) : Lit.nothing}
          </ul>` : Lit.nothing}
      </li>`;
  }
  function subtree(treeNode) {
    const children2 = treeNode.children();
    if (children2.length === 0) {
      return Lit.nothing;
    }
    const { highlights, selected } = highlight(
      treeNode,
      /* closeTag=*/
      true
    );
    return html`
      ${children2.map((child) => layOutNode(child, treeNode.expanded))}
      ${treeNode.node instanceof Element ? html`
        <li role="treeitem">
          <devtools-highlight ranges=${highlights} current-range=${selected}>
            <span part='shadow-xml-view-close-tag'>${"</" + treeNode.node.tagName + ">"}</span>
          </devtools-highlight>
        </li>` : Lit.nothing}`;
  }
  render(
    html`
    <style>${xmlView_css_default}</style>
    <style>${xmlTree_css_default}</style>
    <devtools-tree
      class="shadow-xml-view source-code"
      .template=${html`
        <ul role="tree">
          ${input.xml.children().map((node) => layOutNode(
      node,
      /* populateSubtrees=*/
      true
    ))}
        </ul>`}
      ></devtools-tree>`,
    // clang-format on
    target
  );
};
function* children(xmlNode) {
  if (!xmlNode || !hasNonTextChildren(xmlNode)) {
    return;
  }
  let node = xmlNode?.firstChild;
  while (node) {
    const currentNode = node;
    node = node.nextSibling;
    const nodeType = currentNode.nodeType;
    if (nodeType === Node.TEXT_NODE && currentNode.nodeValue?.match(/\s+/)) {
      continue;
    }
    if (nodeType !== Node.ELEMENT_NODE && nodeType !== Node.TEXT_NODE && nodeType !== Node.CDATA_SECTION_NODE && nodeType !== Node.PROCESSING_INSTRUCTION_NODE && nodeType !== Node.COMMENT_NODE) {
      continue;
    }
    yield currentNode;
  }
}
var XMLTreeViewNode = class _XMLTreeViewNode {
  node;
  expanded = false;
  #children;
  constructor(node) {
    this.node = node;
  }
  children() {
    if (!this.#children) {
      this.#children = children(this.node).map((node) => new _XMLTreeViewNode(node)).toArray();
    }
    return this.#children;
  }
  match(regex, closeTag) {
    return textView(this, closeTag).matchAll(regex);
  }
};
var XMLTreeViewModel = class {
  xmlDocument;
  root;
  constructor(parsedXML) {
    this.xmlDocument = parsedXML;
    this.root = new XMLTreeViewNode(parsedXML);
    this.root.expanded = true;
  }
};
var XMLView = class _XMLView extends UI7.Widget.Widget {
  searchableView = null;
  #search;
  #treeViewModel;
  #view;
  #nextJump;
  constructor(target, view = DEFAULT_VIEW) {
    super(target, { jslog: `${VisualLogging5.pane("xml-view")}`, classes: ["shadow-xml-view", "source-code"] });
    this.#view = view;
  }
  set parsedXML(parsedXML) {
    if (this.#treeViewModel?.xmlDocument !== parsedXML) {
      this.#treeViewModel = new XMLTreeViewModel(parsedXML);
      this.requestUpdate();
    }
  }
  performUpdate() {
    if (this.#treeViewModel) {
      const onExpand = (node, expanded) => {
        node.expanded = expanded;
        this.requestUpdate();
      };
      this.#view({ xml: this.#treeViewModel.root, onExpand, search: this.#search, jumpToNextSearchResult: this.#nextJump }, {}, this.contentElement);
    }
  }
  static createSearchableView(parsedXML) {
    const xmlView = new _XMLView();
    xmlView.parsedXML = parsedXML;
    const searchableView = new UI7.SearchableView.SearchableView(xmlView, null);
    searchableView.setPlaceholder(i18nString6(UIStrings6.find));
    xmlView.searchableView = searchableView;
    xmlView.show(searchableView.element);
    return searchableView;
  }
  static parseXML(text, mimeType) {
    let parsedXML;
    try {
      switch (mimeType) {
        case "application/xhtml+xml":
        case "application/xml":
        case "image/svg+xml":
        case "text/html":
        case "text/xml":
          parsedXML = new DOMParser().parseFromString(text, mimeType);
      }
    } catch {
      return null;
    }
    if (!parsedXML || parsedXML.body) {
      return null;
    }
    return parsedXML;
  }
  onSearchCanceled() {
    this.#search = void 0;
    this.searchableView?.updateSearchMatchesCount(0);
    this.searchableView?.updateCurrentMatchIndex(0);
  }
  performSearch(searchConfig, shouldJump, jumpBackwards) {
    if (!this.#treeViewModel || !this.searchableView) {
      return;
    }
    const { regex } = searchConfig.toSearchRegex(true);
    if (!this.#search) {
      this.#search = new UI7.TreeOutline.TreeSearch();
    }
    this.#search.search(this.#treeViewModel.root, jumpBackwards ?? false, (node, closeTag) => node.match(regex, closeTag).map((match, matchIndexInNode) => ({ node, matchIndexInNode, isPostOrderMatch: closeTag, match })).toArray());
    this.#nextJump = shouldJump ? this.#search.currentMatch() : void 0;
    this.#search.updateSearchableView(this.searchableView);
    this.requestUpdate();
  }
  jumpToNextSearchResult() {
    this.#nextJump = this.#search?.next();
    this.searchableView && this.#search?.updateSearchableView(this.searchableView);
    this.requestUpdate();
  }
  jumpToPreviousSearchResult() {
    this.#nextJump = this.#search?.prev();
    this.searchableView && this.#search?.updateSearchableView(this.searchableView);
    this.requestUpdate();
  }
  supportsCaseSensitiveSearch() {
    return true;
  }
  supportsWholeWordSearch() {
    return true;
  }
  supportsRegexSearch() {
    return true;
  }
};

// gen/front_end/ui/legacy/components/source_frame/PreviewFactory.js
var UIStrings7 = {
  /**
   * @description Text in Preview Factory of the Sources panel if the data to preview can't be shown due to an error
   */
  failedToLoadData: "Failed to load data",
  /**
   * @description Text in Preview Factory of the Sources panel if there's no data to preview
   */
  nothingToPreview: "Nothing to preview"
};
var str_7 = i18n13.i18n.registerUIStrings("ui/legacy/components/source_frame/PreviewFactory.ts", UIStrings7);
var i18nString7 = i18n13.i18n.getLocalizedString.bind(void 0, str_7);
var PreviewFactory = class {
  static async createPreview(provider, mimeType) {
    let resourceType = Common4.ResourceType.ResourceType.fromMimeType(mimeType);
    if (resourceType === Common4.ResourceType.resourceTypes.Other) {
      resourceType = provider.contentType();
    }
    switch (resourceType) {
      case Common4.ResourceType.resourceTypes.Image:
        return new ImageView(mimeType, provider);
      case Common4.ResourceType.resourceTypes.Font:
        return new FontView(mimeType, provider);
    }
    const contentData = await provider.requestContentData();
    if (TextUtils9.ContentData.ContentData.isError(contentData)) {
      return new UI8.EmptyWidget.EmptyWidget(i18nString7(UIStrings7.failedToLoadData), contentData.error);
    }
    if (!contentData.isTextContent) {
      return null;
    }
    if (!contentData.text) {
      return new UI8.EmptyWidget.EmptyWidget(i18nString7(UIStrings7.nothingToPreview), "");
    }
    const parsedXML = XMLView.parseXML(contentData.text, contentData.mimeType);
    if (parsedXML) {
      return XMLView.createSearchableView(parsedXML);
    }
    const jsonView = await JSONView.createView(contentData.text);
    if (jsonView) {
      return jsonView;
    }
    const highlighterType = mimeType.replace(/;.*/, "") || provider.contentType().canonicalMimeType();
    return ResourceSourceFrame.createSearchableView(provider, highlighterType);
  }
};
export {
  BinaryResourceViewFactory_exports as BinaryResourceViewFactory,
  FontView_exports as FontView,
  ImageView_exports as ImageView,
  JSONView_exports as JSONView,
  PreviewFactory_exports as PreviewFactory,
  ResourceSourceFrame_exports as ResourceSourceFrame,
  SourceFrame_exports as SourceFrame,
  StreamingContentHexView_exports as StreamingContentHexView,
  XMLView_exports as XMLView
};
//# sourceMappingURL=source_frame.js.map
