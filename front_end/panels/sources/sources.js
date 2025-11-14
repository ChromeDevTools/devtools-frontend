var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/panels/sources/AddSourceMapURLDialog.js
var AddSourceMapURLDialog_exports = {};
__export(AddSourceMapURLDialog_exports, {
  AddDebugInfoURLDialog: () => AddDebugInfoURLDialog,
  DEFAULT_VIEW: () => DEFAULT_VIEW
});
import * as i18n from "./../../core/i18n/i18n.js";
import * as Buttons from "./../../ui/components/buttons/buttons.js";
import * as UI from "./../../ui/legacy/legacy.js";
import { html, render } from "./../../ui/lit/lit.js";
import * as VisualLogging from "./../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/sources/dialog.css.js
var dialog_css_default = `/*
 * Copyright 2015 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

:host {
  padding: var(--sys-size-7) var(--sys-size-8);
}

.widget {
  align-items: center;
}

label {
  white-space: nowrap;
}

input[type="text"].add-source-map {
  box-shadow: 0 0 0 1px var(--box-shadow-outline-color);
  font-size: inherit;
  margin: 0 8px 0 5px;
}

/*# sourceURL=${import.meta.resolve("./dialog.css")} */`;

// gen/front_end/panels/sources/AddSourceMapURLDialog.js
var UIStrings = {
  /**
   * @description Text in Add Source Map URLDialog of the Sources panel
   */
  sourceMapUrl: "Source map URL: ",
  /**
   * @description Text in Add Debug Info URL Dialog of the Sources panel
   */
  debugInfoUrl: "DWARF symbols URL: ",
  /**
   * @description Text to add something
   */
  add: "Add"
};
var str_ = i18n.i18n.registerUIStrings("panels/sources/AddSourceMapURLDialog.ts", UIStrings);
var i18nString = i18n.i18n.getLocalizedString.bind(void 0, str_);
var DEFAULT_VIEW = (input, _output, target) => {
  render(html`
    <style>${dialog_css_default}</style>
    <label>${input.label}</label>
    <input class="harmony-input add-source-map" spellcheck="false" type="text"
        jslog=${VisualLogging.textField("url").track({ keydown: "Enter", change: true })}
        @keydown=${(e) => {
    if (e.key === "Enter") {
      e.consume(true);
      input.onEnter(e.target.value);
    }
  }}
        @change=${(e) => input.onInputChange(e.target.value)}
        autofocus>
    <devtools-button @click=${input.apply} .jslogContext=${"add"}
        .variant=${"outlined"}>${i18nString(UIStrings.add)}</devtools-button>`, target);
};
var AddDebugInfoURLDialog = class _AddDebugInfoURLDialog extends UI.Widget.HBox {
  url = "";
  dialog;
  callback;
  constructor(label, jslogContext, callback, view = DEFAULT_VIEW) {
    super({ useShadowDom: true });
    const viewInput = {
      label,
      onEnter: this.onEnter.bind(this),
      onInputChange: this.onInputChange.bind(this),
      apply: this.apply.bind(this)
    };
    view(viewInput, void 0, this.contentElement);
    this.dialog = new UI.Dialog.Dialog(jslogContext);
    this.dialog.setSizeBehavior(
      "MeasureContent"
      /* UI.GlassPane.SizeBehavior.MEASURE_CONTENT */
    );
    this.callback = callback;
  }
  static createAddSourceMapURLDialog(callback) {
    return new _AddDebugInfoURLDialog(i18nString(UIStrings.sourceMapUrl), "add-source-map-url", callback);
  }
  static createAddDWARFSymbolsURLDialog(callback) {
    return new _AddDebugInfoURLDialog(i18nString(UIStrings.debugInfoUrl), "add-debug-info-url", callback);
  }
  show() {
    super.show(this.dialog.contentElement);
    this.dialog.show();
  }
  done(value2) {
    this.dialog.hide();
    this.callback(value2);
  }
  onInputChange(value2) {
    this.url = value2;
  }
  apply() {
    this.done(this.url);
  }
  onEnter(value2) {
    this.url = value2;
    this.apply();
  }
};

// gen/front_end/panels/sources/AiCodeCompletionPlugin.js
var AiCodeCompletionPlugin_exports = {};
__export(AiCodeCompletionPlugin_exports, {
  AiCodeCompletionPlugin: () => AiCodeCompletionPlugin
});
import * as Host from "./../../core/host/host.js";
import * as i18n3 from "./../../core/i18n/i18n.js";
import * as AiCodeCompletion from "./../../models/ai_code_completion/ai_code_completion.js";
import * as TextEditor from "./../../ui/components/text_editor/text_editor.js";
import * as SourceFrame from "./../../ui/legacy/components/source_frame/source_frame.js";
import * as UI2 from "./../../ui/legacy/legacy.js";
import * as PanelCommon from "./../common/common.js";

// gen/front_end/panels/sources/Plugin.js
var Plugin_exports = {};
__export(Plugin_exports, {
  Plugin: () => Plugin
});
var Plugin = class {
  uiSourceCode;
  constructor(uiSourceCode, _transformer) {
    this.uiSourceCode = uiSourceCode;
  }
  static accepts(_uiSourceCode) {
    return false;
  }
  willHide() {
  }
  rightToolbarItems() {
    return [];
  }
  /**
   *
   * TODO(szuend): It is OK to asyncify this function (similar to {rightToolbarItems}),
   *               but it is currently not strictly necessary.
   */
  leftToolbarItems() {
    return [];
  }
  populateLineGutterContextMenu(_contextMenu, _lineNumber) {
  }
  populateTextAreaContextMenu(_contextMenu, _lineNumber, _columnNumber) {
  }
  decorationChanged(_type, _editor) {
  }
  editorExtension() {
    return [];
  }
  editorInitialized(_editor) {
  }
  dispose() {
  }
};

// gen/front_end/panels/sources/AiCodeCompletionPlugin.js
var DISCLAIMER_TOOLTIP_ID = "sources-ai-code-completion-disclaimer-tooltip";
var SPINNER_TOOLTIP_ID = "sources-ai-code-completion-spinner-tooltip";
var CITATIONS_TOOLTIP_ID = "sources-ai-code-completion-citations-tooltip";
var AiCodeCompletionPlugin = class extends Plugin {
  #editor;
  #aiCodeCompletionDisclaimer;
  #aiCodeCompletionDisclaimerContainer = document.createElement("div");
  #aiCodeCompletionDisclaimerToolbarItem = new UI2.Toolbar.ToolbarItem(this.#aiCodeCompletionDisclaimerContainer);
  #aiCodeCompletionCitations = [];
  #aiCodeCompletionCitationsToolbar;
  #aiCodeCompletionCitationsToolbarContainer = document.createElement("div");
  #aiCodeCompletionCitationsToolbarAttached = false;
  aiCodeCompletionConfig;
  #aiCodeCompletionProvider;
  constructor(uiSourceCode) {
    super(uiSourceCode);
    const devtoolsLocale = i18n3.DevToolsLocale.DevToolsLocale.instance();
    if (!AiCodeCompletion.AiCodeCompletion.AiCodeCompletion.isAiCodeCompletionEnabled(devtoolsLocale.locale)) {
      throw new Error("AI code completion feature is not enabled.");
    }
    this.aiCodeCompletionConfig = {
      completionContext: {
        additionalFiles: this.uiSourceCode.url().startsWith("snippet://") ? [{
          path: "devtools-console-context.js",
          content: AiCodeCompletion.AiCodeCompletion.consoleAdditionalContextFileContent,
          included_reason: Host.AidaClient.Reason.RELATED_FILE
        }] : void 0,
        inferenceLanguage: this.#getInferenceLanguage()
      },
      onFeatureEnabled: () => {
        this.#setupAiCodeCompletion();
      },
      onFeatureDisabled: () => {
        this.#cleanupAiCodeCompletion();
      },
      onSuggestionAccepted: this.#onAiCodeCompletionSuggestionAccepted.bind(this),
      onRequestTriggered: this.#onAiRequestTriggered.bind(this),
      onResponseReceived: this.#onAiResponseReceived.bind(this),
      panel: "sources"
    };
    this.#aiCodeCompletionProvider = TextEditor.AiCodeCompletionProvider.AiCodeCompletionProvider.createInstance(this.aiCodeCompletionConfig);
    this.#aiCodeCompletionDisclaimerContainer.classList.add("ai-code-completion-disclaimer-container");
    this.#aiCodeCompletionDisclaimerContainer.style.paddingInline = "var(--sys-size-3)";
  }
  static accepts(uiSourceCode) {
    return uiSourceCode.contentType().hasScripts() || uiSourceCode.contentType().hasStyleSheets();
  }
  dispose() {
    this.#aiCodeCompletionProvider.dispose();
    super.dispose();
  }
  editorInitialized(editor) {
    this.#editor = editor;
    this.#aiCodeCompletionProvider.editorInitialized(editor);
    this.#editor.editor.dispatch({
      effects: TextEditor.AiCodeCompletionProvider.setAiCodeCompletionTeaserMode.of(TextEditor.AiCodeCompletionProvider.AiCodeCompletionTeaserMode.ON)
    });
  }
  editorExtension() {
    return this.#aiCodeCompletionProvider.extension();
  }
  rightToolbarItems() {
    return [this.#aiCodeCompletionDisclaimerToolbarItem];
  }
  #setupAiCodeCompletion() {
    this.#createAiCodeCompletionDisclaimer();
    this.#createAiCodeCompletionCitationsToolbar();
  }
  #createAiCodeCompletionDisclaimer() {
    if (this.#aiCodeCompletionDisclaimer) {
      return;
    }
    this.#aiCodeCompletionDisclaimer = new PanelCommon.AiCodeCompletionDisclaimer();
    this.#aiCodeCompletionDisclaimer.disclaimerTooltipId = DISCLAIMER_TOOLTIP_ID;
    this.#aiCodeCompletionDisclaimer.spinnerTooltipId = SPINNER_TOOLTIP_ID;
    this.#aiCodeCompletionDisclaimer.show(this.#aiCodeCompletionDisclaimerContainer, void 0, true);
  }
  #createAiCodeCompletionCitationsToolbar() {
    if (this.#aiCodeCompletionCitationsToolbar) {
      return;
    }
    this.#aiCodeCompletionCitationsToolbar = new PanelCommon.AiCodeCompletionSummaryToolbar({ citationsTooltipId: CITATIONS_TOOLTIP_ID, hasTopBorder: true });
    this.#aiCodeCompletionCitationsToolbar.show(this.#aiCodeCompletionCitationsToolbarContainer, void 0, true);
  }
  #attachAiCodeCompletionCitationsToolbar() {
    if (this.#editor) {
      this.#editor.dispatch({
        effects: SourceFrame.SourceFrame.addSourceFrameInfobar.of({ element: this.#aiCodeCompletionCitationsToolbarContainer, order: 100 })
      });
      this.#aiCodeCompletionCitationsToolbarAttached = true;
    }
  }
  #removeAiCodeCompletionCitationsToolbar() {
    this.#aiCodeCompletionCitationsToolbar?.detach();
    if (this.#editor) {
      this.#editor.dispatch({
        effects: SourceFrame.SourceFrame.removeSourceFrameInfobar.of({ element: this.#aiCodeCompletionCitationsToolbarContainer })
      });
      this.#aiCodeCompletionCitationsToolbarAttached = false;
    }
  }
  #cleanupAiCodeCompletion() {
    this.#aiCodeCompletionDisclaimerContainer.removeChildren();
    this.#aiCodeCompletionDisclaimer = void 0;
    this.#removeAiCodeCompletionCitationsToolbar();
  }
  #onAiRequestTriggered = () => {
    if (this.#aiCodeCompletionDisclaimer) {
      this.#aiCodeCompletionDisclaimer.loading = true;
    }
  };
  #onAiResponseReceived = (citations) => {
    this.#aiCodeCompletionCitations = citations;
    if (this.#aiCodeCompletionDisclaimer) {
      this.#aiCodeCompletionDisclaimer.loading = false;
    }
  };
  #onAiCodeCompletionSuggestionAccepted() {
    if (!this.#aiCodeCompletionCitationsToolbar || this.#aiCodeCompletionCitations.length === 0) {
      return;
    }
    const citations = this.#aiCodeCompletionCitations.map((citation) => citation.uri).filter((uri) => Boolean(uri));
    this.#aiCodeCompletionCitationsToolbar.updateCitations(citations);
    if (!this.#aiCodeCompletionCitationsToolbarAttached && citations.length > 0) {
      this.#attachAiCodeCompletionCitationsToolbar();
    }
  }
  #getInferenceLanguage() {
    const mimeType = this.uiSourceCode.mimeType();
    switch (mimeType) {
      case "application/javascript":
      case "application/ecmascript":
      case "application/x-ecmascript":
      case "application/x-javascript":
      case "text/ecmascript":
      case "text/javascript1.0":
      case "text/javascript1.1":
      case "text/javascript1.2":
      case "text/javascript1.3":
      case "text/javascript1.4":
      case "text/javascript1.5":
      case "text/jscript":
      case "text/livescript ":
      case "text/x-ecmascript":
      case "text/x-javascript":
      case "text/javascript":
      case "text/jsx":
        return "JAVASCRIPT";
      case "text/typescript":
      case "text/typescript-jsx":
      case "application/typescript":
        return "TYPESCRIPT";
      case "text/css":
        return "CSS";
      case "text/html":
        return "HTML";
      case "text/x-python":
      case "application/python":
        return "PYTHON";
      case "text/x-java":
      case "text/x-java-source":
        return "JAVA";
      case "text/x-c++src":
      case "text/x-csrc":
      case "text/x-c":
        return "CPP";
      case "application/json":
      case "application/manifest+json":
        return "JSON";
      case "text/markdown":
        return "MARKDOWN";
      case "application/xml":
      case "application/xhtml+xml":
      case "text/xml":
        return "XML";
      case "text/x-go":
        return "GO";
      case "application/x-sh":
      case "text/x-sh":
        return "BASH";
      case "text/x-kotlin":
        return "KOTLIN";
      case "text/x-vue":
      case "text/x.vue":
        return "VUE";
      case "application/vnd.dart":
        return "DART";
      default:
        return void 0;
    }
  }
};

// gen/front_end/panels/sources/AiWarningInfobarPlugin.js
var AiWarningInfobarPlugin_exports = {};
__export(AiWarningInfobarPlugin_exports, {
  AiWarningInfobarPlugin: () => AiWarningInfobarPlugin
});
import * as i18n4 from "./../../core/i18n/i18n.js";
import * as Workspace from "./../../models/workspace/workspace.js";
import * as SourceFrame3 from "./../../ui/legacy/components/source_frame/source_frame.js";
import * as UI3 from "./../../ui/legacy/legacy.js";
var UIStrings2 = {
  /**
   * @description Infobar text announcing that the file contents have been changed by AI
   */
  aiContentWarning: "This file contains AI-generated content"
};
var str_2 = i18n4.i18n.registerUIStrings("panels/sources/AiWarningInfobarPlugin.ts", UIStrings2);
var i18nString2 = i18n4.i18n.getLocalizedString.bind(void 0, str_2);
var AiWarningInfobarPlugin = class extends Plugin {
  #editor = void 0;
  #aiWarningInfobar = null;
  constructor(uiSourceCode) {
    super(uiSourceCode);
    this.uiSourceCode.addEventListener(Workspace.UISourceCode.Events.WorkingCopyCommitted, this.#onWorkingCopyCommitted, this);
  }
  dispose() {
    this.#aiWarningInfobar?.dispose();
    this.#aiWarningInfobar = null;
    this.uiSourceCode.removeEventListener(Workspace.UISourceCode.Events.WorkingCopyCommitted, this.#onWorkingCopyCommitted, this);
    super.dispose();
  }
  static accepts(uiSourceCode) {
    return uiSourceCode.contentType().hasScripts() || uiSourceCode.contentType().hasStyleSheets();
  }
  editorInitialized(editor) {
    this.#editor = editor;
    if (this.uiSourceCode.containsAiChanges()) {
      this.#showAiWarningInfobar();
    }
  }
  #onWorkingCopyCommitted() {
    if (!this.uiSourceCode.containsAiChanges()) {
      this.#aiWarningInfobar?.dispose();
      this.#aiWarningInfobar = null;
    }
  }
  #showAiWarningInfobar() {
    const infobar = new UI3.Infobar.Infobar("warning", i18nString2(UIStrings2.aiContentWarning), void 0, void 0, "contains-ai-content-warning");
    this.#aiWarningInfobar = infobar;
    infobar.setCloseCallback(() => this.removeInfobar(this.#aiWarningInfobar));
    this.attachInfobar(this.#aiWarningInfobar);
  }
  attachInfobar(bar) {
    if (this.#editor) {
      this.#editor.dispatch({ effects: SourceFrame3.SourceFrame.addSourceFrameInfobar.of({ element: bar.element }) });
    }
  }
  removeInfobar(bar) {
    if (this.#editor && bar) {
      this.#editor.dispatch({ effects: SourceFrame3.SourceFrame.removeSourceFrameInfobar.of({ element: bar.element }) });
    }
  }
};

// gen/front_end/panels/sources/BreakpointEditDialog.js
var BreakpointEditDialog_exports = {};
__export(BreakpointEditDialog_exports, {
  BreakpointEditDialog: () => BreakpointEditDialog
});
import "./../../ui/legacy/legacy.js";
import * as Common from "./../../core/common/common.js";
import * as i18n6 from "./../../core/i18n/i18n.js";
import * as SDK from "./../../core/sdk/sdk.js";
import * as CodeMirror from "./../../third_party/codemirror.next/codemirror.next.js";
import * as IconButton from "./../../ui/components/icon_button/icon_button.js";
import * as TextEditor2 from "./../../ui/components/text_editor/text_editor.js";
import * as UI4 from "./../../ui/legacy/legacy.js";
import * as VisualLogging2 from "./../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/sources/breakpointEditDialog.css.js
var breakpointEditDialog_css_default = `/*
 * Copyright 2018 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

:host {
  z-index: 30;
  padding: 4px;
  background-color: var(--sys-color-surface3);
  border-radius: 7px;
  border: 2px solid var(--sys-color-divider);
  width: 90%;
  pointer-events: auto;
}

:host(.sources-edit-breakpoint-dialog) {
  border-radius: 0;
  z-index: 30;
  background-color: var(--sys-color-surface3);
  width: 555px;
  pointer-events: auto;
  margin-left: -1px;
  padding: 0 10px 10px 5px;
  border: 1px solid var(--sys-color-divider);
}

:host-context(.sources-edit-breakpoint-dialog) .condition-editor {
  background-color: var(--sys-color-cdt-base-container);
  margin: 0 6px 20px 3px;
}

:host-context(.sources-edit-breakpoint-dialog) .source-frame-breakpoint-toolbar {
  font-family: sans-serif;
  font-size: 12px;
}

:host-context(.sources-edit-breakpoint-dialog) .link,
.devtools-link {
  font-family: sans-serif;
  font-size: 12px;
  margin: 0 3px;
}

:host-context(.sources-edit-breakpoint-dialog) devtools-icon.link-icon {
  vertical-align: sub;
  margin-right: 0.5ch;
  color: var(--icon-link);
  width: 16px;
  height: 16px;
}

:host-context(.sources-edit-breakpoint-dialog) .link-wrapper {
  display: inline-flex;
}

:host-context(.sources-edit-breakpoint-dialog) .dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

:host-context(.sources-edit-breakpoint-dialog) .dialog-header > devtools-icon:hover {
  color: var(--icon-default-hover);
}

/*# sourceURL=${import.meta.resolve("./breakpointEditDialog.css")} */`;

// gen/front_end/panels/sources/BreakpointEditDialog.js
var { Direction } = TextEditor2.TextEditorHistory;
var UIStrings3 = {
  /**
   * @description Screen reader label for a select box that chooses the breakpoint type in the Sources panel when editing a breakpoint
   */
  breakpointType: "Breakpoint type",
  /**
   * @description Text in Breakpoint Edit Dialog of the Sources panel
   */
  breakpoint: "Breakpoint",
  /**
   * @description Tooltip text in Breakpoint Edit Dialog of the Sources panel that shows up when hovering over the close icon
   */
  closeDialog: "Close edit dialog and save changes",
  /**
   * @description Text in Breakpoint Edit Dialog of the Sources panel
   */
  conditionalBreakpoint: "Conditional breakpoint",
  /**
   * @description Text in Breakpoint Edit Dialog of the Sources panel
   */
  logpoint: "Logpoint",
  /**
   * @description Text in Breakpoint Edit Dialog of the Sources panel
   */
  expressionToCheckBeforePausingEg: "Expression to check before pausing, e.g. x > 5",
  /**
   * @description Type selector element title in Breakpoint Edit Dialog of the Sources panel
   */
  pauseOnlyWhenTheConditionIsTrue: "Pause only when the condition is true",
  /**
   * @description Link text in the Breakpoint Edit Dialog of the Sources panel
   */
  learnMoreOnBreakpointTypes: "Learn more: Breakpoint Types",
  /**
   * @description Text in Breakpoint Edit Dialog of the Sources panel. It is used as
   *the placeholder for a text input field before the user enters text. Provides the user with
   *an example on how to use Logpoints. 'Log' is a verb and 'message' is a noun.
   *See: https://developer.chrome.com/blog/new-in-devtools-73/#logpoints
   */
  logMessageEgXIsX: "Log message, e.g. `'x is', x`",
  /**
   * @description Type selector element title in Breakpoint Edit Dialog of the Sources panel
   */
  logAMessageToConsoleDoNotBreak: "Log a message to Console, do not break"
};
var str_3 = i18n6.i18n.registerUIStrings("panels/sources/BreakpointEditDialog.ts", UIStrings3);
var i18nString3 = i18n6.i18n.getLocalizedString.bind(void 0, str_3);
var BreakpointEditDialog = class extends UI4.Widget.Widget {
  onFinish;
  finished;
  editor;
  typeSelector;
  placeholderCompartment;
  #history;
  #editorHistory;
  constructor(editorLineNumber, oldCondition, isLogpoint, onFinish) {
    super({
      jslog: `${VisualLogging2.dialog("edit-breakpoint")}`,
      useShadowDom: true
    });
    this.registerRequiredCSS(breakpointEditDialog_css_default);
    const editorConfig = [
      CodeMirror.javascript.javascriptLanguage,
      TextEditor2.Config.baseConfiguration(oldCondition || ""),
      TextEditor2.Config.closeBrackets.instance(),
      TextEditor2.Config.autocompletion.instance(),
      CodeMirror.EditorView.lineWrapping,
      TextEditor2.Config.showCompletionHint,
      TextEditor2.Config.conservativeCompletion,
      CodeMirror.javascript.javascriptLanguage.data.of({
        autocomplete: (context) => this.#editorHistory.historyCompletions(context)
      }),
      CodeMirror.autocompletion(),
      TextEditor2.JavaScript.argumentHints()
    ];
    this.onFinish = onFinish;
    this.finished = false;
    this.element.tabIndex = -1;
    this.element.classList.add("sources-edit-breakpoint-dialog");
    const header = this.contentElement.createChild("div", "dialog-header");
    const toolbar4 = header.createChild("devtools-toolbar", "source-frame-breakpoint-toolbar");
    toolbar4.appendText(`Line ${editorLineNumber + 1}:`);
    this.typeSelector = new UI4.Toolbar.ToolbarComboBox(this.onTypeChanged.bind(this), i18nString3(UIStrings3.breakpointType), void 0, "type");
    this.typeSelector.createOption(
      i18nString3(UIStrings3.breakpoint),
      "REGULAR_BREAKPOINT"
      /* SDK.DebuggerModel.BreakpointType.REGULAR_BREAKPOINT */
    );
    const conditionalOption = this.typeSelector.createOption(
      i18nString3(UIStrings3.conditionalBreakpoint),
      "CONDITIONAL_BREAKPOINT"
      /* SDK.DebuggerModel.BreakpointType.CONDITIONAL_BREAKPOINT */
    );
    const logpointOption = this.typeSelector.createOption(
      i18nString3(UIStrings3.logpoint),
      "LOGPOINT"
      /* SDK.DebuggerModel.BreakpointType.LOGPOINT */
    );
    this.typeSelector.select(isLogpoint ? logpointOption : conditionalOption);
    toolbar4.appendToolbarItem(this.typeSelector);
    const content = oldCondition || "";
    const finishIfComplete = (view) => {
      void TextEditor2.JavaScript.isExpressionComplete(view.state.doc.toString()).then((complete) => {
        if (complete) {
          this.finishEditing(true, this.editor.state.doc.toString());
        } else {
          CodeMirror.insertNewlineAndIndent(view);
        }
      });
      return true;
    };
    const keymap2 = [
      { key: "ArrowUp", run: () => this.#editorHistory.moveHistory(
        -1
        /* Direction.BACKWARD */
      ) },
      { key: "ArrowDown", run: () => this.#editorHistory.moveHistory(
        1
        /* Direction.FORWARD */
      ) },
      { mac: "Ctrl-p", run: () => this.#editorHistory.moveHistory(-1, true) },
      { mac: "Ctrl-n", run: () => this.#editorHistory.moveHistory(1, true) },
      {
        key: "Mod-Enter",
        run: finishIfComplete
      },
      {
        key: "Enter",
        run: finishIfComplete
      },
      {
        key: "Shift-Enter",
        run: CodeMirror.insertNewlineAndIndent
      },
      {
        key: "Escape",
        run: () => {
          this.finishEditing(false, "");
          return true;
        }
      }
    ];
    this.placeholderCompartment = new CodeMirror.Compartment();
    const editorWrapper = this.contentElement.appendChild(document.createElement("div"));
    editorWrapper.classList.add("condition-editor");
    editorWrapper.setAttribute("jslog", `${VisualLogging2.textField().track({ change: true })}`);
    this.editor = new TextEditor2.TextEditor.TextEditor(CodeMirror.EditorState.create({
      doc: content,
      selection: { anchor: 0, head: content.length },
      extensions: [
        this.placeholderCompartment.of(this.getPlaceholder()),
        CodeMirror.keymap.of(keymap2),
        editorConfig
      ]
    }));
    editorWrapper.appendChild(this.editor);
    const closeIcon = IconButton.Icon.create("cross");
    closeIcon.title = i18nString3(UIStrings3.closeDialog);
    closeIcon.setAttribute("jslog", `${VisualLogging2.close().track({ click: true })}`);
    closeIcon.onclick = () => this.finishEditing(true, this.editor.state.doc.toString());
    header.appendChild(closeIcon);
    this.#history = new TextEditor2.AutocompleteHistory.AutocompleteHistory(Common.Settings.Settings.instance().createLocalSetting("breakpoint-condition-history", []));
    this.#editorHistory = new TextEditor2.TextEditorHistory.TextEditorHistory(this.editor, this.#history);
    const linkWrapper = this.contentElement.appendChild(document.createElement("div"));
    linkWrapper.classList.add("link-wrapper");
    const link2 = UI4.Fragment.html`<x-link class="link devtools-link" tabindex="0" href="https://goo.gle/devtools-loc"
                                          jslog="${VisualLogging2.link("learn-more")}">${i18nString3(UIStrings3.learnMoreOnBreakpointTypes)}</x-link>`;
    const linkIcon = IconButton.Icon.create("open-externally", "link-icon");
    link2.prepend(linkIcon);
    linkWrapper.appendChild(link2);
    this.updateTooltip();
  }
  saveAndFinish() {
    this.finishEditing(true, this.editor.state.doc.toString());
  }
  focusEditor() {
    this.editor.editor.focus();
  }
  onTypeChanged() {
    if (this.breakpointType === "REGULAR_BREAKPOINT") {
      this.finishEditing(true, "");
      return;
    }
    this.focusEditor();
    this.editor.dispatch({ effects: this.placeholderCompartment.reconfigure(this.getPlaceholder()) });
    this.updateTooltip();
  }
  get breakpointType() {
    const option = this.typeSelector.selectedOption();
    return option ? option.value : null;
  }
  getPlaceholder() {
    const type = this.breakpointType;
    if (type === "CONDITIONAL_BREAKPOINT") {
      return CodeMirror.placeholder(i18nString3(UIStrings3.expressionToCheckBeforePausingEg));
    }
    if (type === "LOGPOINT") {
      return CodeMirror.placeholder(i18nString3(UIStrings3.logMessageEgXIsX));
    }
    return [];
  }
  updateTooltip() {
    const type = this.breakpointType;
    if (type === "CONDITIONAL_BREAKPOINT") {
      UI4.Tooltip.Tooltip.install(this.typeSelector.element, i18nString3(UIStrings3.pauseOnlyWhenTheConditionIsTrue));
    } else if (type === "LOGPOINT") {
      UI4.Tooltip.Tooltip.install(this.typeSelector.element, i18nString3(UIStrings3.logAMessageToConsoleDoNotBreak));
    }
  }
  finishEditing(committed, condition) {
    if (this.finished) {
      return;
    }
    this.finished = true;
    this.editor.remove();
    this.#history.pushHistoryItem(condition);
    const isLogpoint = this.breakpointType === "LOGPOINT";
    this.onFinish({ committed, condition, isLogpoint });
  }
  get editorForTest() {
    return this.editor;
  }
};

// gen/front_end/panels/sources/BreakpointsView.js
var BreakpointsView_exports = {};
__export(BreakpointsView_exports, {
  BreakpointsSidebarController: () => BreakpointsSidebarController,
  BreakpointsView: () => BreakpointsView,
  DEFAULT_VIEW: () => DEFAULT_VIEW2
});
import "./../../ui/components/icon_button/icon_button.js";
import * as Common3 from "./../../core/common/common.js";
import * as Host2 from "./../../core/host/host.js";
import * as i18n8 from "./../../core/i18n/i18n.js";
import * as Platform2 from "./../../core/platform/platform.js";
import { assertNotNullOrUndefined as assertNotNullOrUndefined2 } from "./../../core/platform/platform.js";
import * as SDK2 from "./../../core/sdk/sdk.js";
import * as Bindings from "./../../models/bindings/bindings.js";
import * as Breakpoints from "./../../models/breakpoints/breakpoints.js";
import * as TextUtils from "./../../models/text_utils/text_utils.js";
import * as Workspace2 from "./../../models/workspace/workspace.js";
import * as Input from "./../../ui/components/input/input.js";
import * as RenderCoordinator from "./../../ui/components/render_coordinator/render_coordinator.js";
import * as UI5 from "./../../ui/legacy/legacy.js";
import * as Lit from "./../../ui/lit/lit.js";
import * as VisualLogging3 from "./../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/sources/breakpointsView.css.js
var breakpointsView_css_default = `/*
 * Copyright 2022 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */
@scope to (devtools-widget > *) {
  :host {
    flex: auto;
    display: flex;
    flex-direction: column;
  }

  .code-snippet {
    width: 100%;
    font-family: var(--source-code-font-family);
    font-size: var(--source-code-font-size);
    color: var(--sys-color-token-subtle);
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap;
    flex-shrink: 100;
    cursor: pointer;
  }

  .code-snippet:hover {
    color: var(--sys-color-on-surface);
    text-decoration: underline;
  }

  input {
    height: 12px;
    width: 12px;
    flex-shrink: 0;
    margin: 3px 0;
  }

  details {
    border-top: 1px solid var(--sys-color-divider);
    padding: 2px 0;
  }

  details:not(.active) {
    background-color: var(--sys-color-state-disabled-container);
    opacity: 30%;
  }

  details > summary {
    min-height: 20px;
    list-style: none;
    display: flex;
    padding: 0 8px 0 6px;
    align-items: center;
  }

  details > summary:hover {
    background-color: var(--sys-color-state-hover-on-subtle);
  }

  details > summary::before {
    display: block;
    user-select: none;
    mask-image: var(--image-file-arrow-collapse);
    background-color: var(--icon-default);
    content: "";
    height: var(--sys-size-8);
    min-width: var(--sys-size-8);
    max-width: var(--sys-size-8);
    margin-top: calc(-1 * var(--sys-size-2));
    margin-left: calc(-1 * var(--sys-size-3));
    overflow: hidden;
  }

  details[open] > summary::before {
    mask-image: var(--image-file-arrow-drop-down);
  }

  .group-header {
    display: inline-flex;
    align-items: center;
    width: 100%;
    padding-right: 8px;
    overflow: hidden;
  }

  .group-icon-or-disable {
    justify-content: center;
    display: flex;
    width: 16px;
    margin-left: 2px;
  }

  .group-header-title {
    margin-left: 4px;
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap;
  }

  .group-header-differentiator {
    font-weight: normal;
    color: var(--sys-color-state-disabled);
    margin-left: 8px;
  }

  .group-hover-actions {
    display: flex;
    align-items: center;
    justify-content: right;
    font-size: 10px;
    font-weight: 500;
  }

  .breakpoint-item-location-or-actions {
    min-width: 20px;
    flex: 0 0 auto;
    display: flex;
    padding-left: 8px;
    justify-content: right;
  }

  button {
    cursor: pointer;
    width: 13px;
    height: 13px;
    border: none;
    background-color: transparent;
    display: none;
    align-items: center;
    justify-content: center;
  }

  button + span {
    padding-left: 6px;
  }

  button + button {
    padding-left: 11px;
  }

  summary:hover button {
    display: flex;
  }

  devtools-icon {
    width: 16px;
    height: 16px;

    button:hover & {
      color: var(--icon-default-hover);
    }
  }

  .type-indicator {
    --override-color-conditional-breakpoint: var(--ref-palette-orange70);
    --override-color-logpoint: var(--ref-palette-pink60);

    border-right: 4px solid;
    border-radius: 0 2px 2px 0;
    border-color: transparent;
    height: 16px;
  }

  .breakpoint-item {
    display: flex;
    align-items: center;
    line-height: 13px;
    height: 20px;
    padding-right: 8px;
  }

  .breakpoint-item.hit {
    background-color: var(--sys-color-yellow-container);
    color: var(--sys-color-on-yellow-container);
  }

  .breakpoint-item.hit:focus {
    background-color: var(--sys-color-tonal-container);
  }

  .theme-with-dark-background .type-indicator,
  :host-context(.theme-with-dark-background) .type-indicator {
    --override-color-conditional-breakpoint: var(--ref-palette-yellow60);
    --override-color-logpoint: var(--ref-palette-pink70);
  }

  .breakpoint-item.logpoint > label > .type-indicator {
    border-color: var(--override-color-logpoint);
  }

  .breakpoint-item.conditional-breakpoint > label > .type-indicator {
    border-color: var(--override-color-conditional-breakpoint);
  }

  .checkbox-label {
    display: flex;
    align-items: center;
  }

  .checkbox-label > input {
    margin-left: 16px;
    margin-right: 6px;
  }

  devtools-icon[name="file-script"] {
    color: var(--icon-file-script);
    width: 18px;
    height: 18px;

    summary:hover & {
      display: none;
    }
  }

  input.group-checkbox {
    margin: 0;
    display: none;
  }

  summary:hover .group-checkbox {
    display: flex;
  }

  .location {
    line-height: 14px;
    text-overflow: ellipsis;
    overflow: hidden;
  }

  .breakpoint-item:hover button {
    display: flex;
  }

  .pause-on-uncaught-exceptions {
    margin-top: 3px;
  }

  .pause-on-caught-exceptions {
    margin-bottom: 3px;
  }

  /* TODO(crbug.com/1382762): Remove special casing with dependent toggles as soon as Node LTS caught up on independent pause of exception toggles. */
  input:disabled + span {
    color: var(--sys-color-state-disabled);
  }

  .pause-on-caught-exceptions > .checkbox-label > input,
  .pause-on-uncaught-exceptions > .checkbox-label > input {
    margin-left: 6px;
  }

  .pause-on-caught-exceptions > .checkbox-label > span,
  .pause-on-uncaught-exceptions > .checkbox-label > span {
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap;
  }

  .pause-on-uncaught-exceptions,
  .pause-on-caught-exceptions {
    line-height: 13px;
    height: 18px;
    padding-right: 8px;

    & > label {
      width: fit-content;
    }
  }

  details > summary:focus,
  .breakpoint-item:focus,
  .pause-on-uncaught-exceptions:focus,
  .pause-on-caught-exceptions:focus {
    background-color: var(--sys-color-tonal-container);
    outline-style: none;
  }
}

/*# sourceURL=${import.meta.resolve("./breakpointsView.css")} */`;

// gen/front_end/panels/sources/BreakpointsViewUtils.js
var BreakpointsViewUtils_exports = {};
__export(BreakpointsViewUtils_exports, {
  findNextNodeForKeyboardNavigation: () => findNextNodeForKeyboardNavigation,
  getDifferentiatingPathMap: () => getDifferentiatingPathMap
});
import * as Common2 from "./../../core/common/common.js";
import * as Platform from "./../../core/platform/platform.js";
import { assertNotNullOrUndefined } from "./../../core/platform/platform.js";
var SUMMARY_ELEMENT_SELECTOR = "summary";
var domNodeIsTree = (domNode) => {
  return domNode.getAttribute("role") === "tree";
};
var domNodeIsBreakpointItemNode = (domNode) => {
  return domNode.getAttribute("role") === "treeitem";
};
var domNodeIsPauseOnExceptionsNode = (domNode) => {
  return domNode.getAttribute("data-first-pause") !== null || domNode.getAttribute("data-last-pause") !== null;
};
var domNodeIsSummaryNode = (domNode) => {
  return !domNodeIsBreakpointItemNode(domNode);
};
var groupIsExpanded = (detailsElement) => {
  return detailsElement.getAttribute("open") !== null;
};
var getFirstBreakpointItemInGroup = (detailsElement) => {
  return detailsElement.querySelector("[data-first-breakpoint]");
};
var getLastBreakpointItemInGroup = (detailsElement) => {
  return detailsElement.querySelector("[data-last-breakpoint]");
};
var getNextGroupsSummaryNode = (detailsElement) => {
  const nextDetailsElement = getNextDetailsElement(detailsElement);
  if (nextDetailsElement && nextDetailsElement instanceof HTMLDetailsElement) {
    return nextDetailsElement?.querySelector("summary");
  }
  return null;
};
var getCurrentSummaryNode = (detailsElement) => {
  return detailsElement.querySelector(SUMMARY_ELEMENT_SELECTOR);
};
var getNextDetailsElement = (detailsElement) => {
  const nextDetailsElement = detailsElement.nextElementSibling;
  if (nextDetailsElement && nextDetailsElement instanceof HTMLDetailsElement) {
    return nextDetailsElement;
  }
  return null;
};
var getPreviousDetailsElement = (detailsElement) => {
  const previousDetailsElement = detailsElement.previousElementSibling;
  if (previousDetailsElement && previousDetailsElement instanceof HTMLDetailsElement) {
    return previousDetailsElement;
  }
  return null;
};
function findNextNodeForPauseOnExceptions(target, key) {
  console.assert(domNodeIsPauseOnExceptionsNode(target));
  let nextNode = null;
  switch (key) {
    case "ArrowUp": {
      const previousElementSibling = target.previousElementSibling;
      if (previousElementSibling instanceof HTMLElement) {
        nextNode = previousElementSibling;
        console.assert(domNodeIsPauseOnExceptionsNode(nextNode));
      }
      break;
    }
    case "ArrowDown": {
      const nextElementSibling = target.nextElementSibling;
      if (nextElementSibling instanceof HTMLElement) {
        if (domNodeIsTree(nextElementSibling)) {
          const detailsElement = nextElementSibling.querySelector("[data-first-group]");
          if (detailsElement) {
            nextNode = getCurrentSummaryNode(detailsElement);
          }
        } else {
          nextNode = nextElementSibling;
          console.assert(domNodeIsPauseOnExceptionsNode(nextNode));
        }
      }
      break;
    }
    default:
      break;
  }
  return nextNode;
}
async function findNextNodeForKeyboardNavigation(target, key, setGroupExpandedStateCallback) {
  if (domNodeIsPauseOnExceptionsNode(target)) {
    return findNextNodeForPauseOnExceptions(target, key);
  }
  const detailsElement = target.parentElement;
  if (!detailsElement || !(detailsElement instanceof HTMLDetailsElement)) {
    throw new Error("The selected nodes should be direct children of an HTMLDetails element.");
  }
  let nextNode = null;
  switch (key) {
    case "ArrowLeft": {
      if (domNodeIsSummaryNode(target)) {
        if (groupIsExpanded(detailsElement)) {
          await setGroupExpandedStateCallback(detailsElement, false);
        }
      } else {
        return getCurrentSummaryNode(detailsElement);
      }
      break;
    }
    case "ArrowRight": {
      if (domNodeIsSummaryNode(target)) {
        if (groupIsExpanded(detailsElement)) {
          return getFirstBreakpointItemInGroup(detailsElement);
        }
        await setGroupExpandedStateCallback(detailsElement, true);
      }
      break;
    }
    case "ArrowDown": {
      if (domNodeIsSummaryNode(target)) {
        if (groupIsExpanded(detailsElement)) {
          nextNode = getFirstBreakpointItemInGroup(detailsElement);
        } else {
          nextNode = getNextGroupsSummaryNode(detailsElement);
        }
      } else {
        const nextSibling = target.nextElementSibling;
        if (nextSibling && nextSibling instanceof HTMLDivElement) {
          nextNode = nextSibling;
        } else {
          nextNode = getNextGroupsSummaryNode(detailsElement);
        }
      }
      break;
    }
    case "ArrowUp": {
      if (domNodeIsSummaryNode(target)) {
        const previousDetailsElement = getPreviousDetailsElement(detailsElement);
        if (previousDetailsElement) {
          if (groupIsExpanded(previousDetailsElement)) {
            nextNode = getLastBreakpointItemInGroup(previousDetailsElement);
          } else {
            nextNode = getCurrentSummaryNode(previousDetailsElement);
          }
        } else {
          const pauseOnExceptions = detailsElement.parentElement?.previousElementSibling;
          if (pauseOnExceptions instanceof HTMLElement) {
            nextNode = pauseOnExceptions;
          }
        }
      } else {
        const previousSibling = target.previousElementSibling;
        if (previousSibling instanceof HTMLElement) {
          nextNode = previousSibling;
        }
      }
      break;
    }
  }
  return nextNode;
}
function findFirstDifferingSegmentIndex(splitUrls) {
  const firstUrl = splitUrls[0];
  let firstDifferingIndex = -1;
  for (let segmentIndex = 0; segmentIndex < firstUrl.length && firstDifferingIndex === -1; ++segmentIndex) {
    const segment = firstUrl[segmentIndex];
    for (let urlIndex = 1; urlIndex < splitUrls.length; ++urlIndex) {
      const url = splitUrls[urlIndex];
      if (url.length <= segmentIndex || url[segmentIndex] !== segment) {
        firstDifferingIndex = segmentIndex;
        break;
      }
    }
  }
  return firstDifferingIndex === -1 ? firstUrl.length : firstDifferingIndex;
}
function findDifferentiatingPath(url, allUrls, startIndex) {
  const differentiatingPath = [];
  let remainingUrlsToDifferentiate = allUrls.filter((other) => other !== url);
  for (let segmentIndex = startIndex; segmentIndex < url.length; ++segmentIndex) {
    const segment = url[segmentIndex];
    differentiatingPath.push(segment);
    remainingUrlsToDifferentiate = remainingUrlsToDifferentiate.filter((url2) => url2.length > segmentIndex && url2[segmentIndex] === segment);
    if (remainingUrlsToDifferentiate.length === 0) {
      break;
    }
  }
  return differentiatingPath;
}
function populateDifferentiatingPathMap(urls, urlToDifferentiator) {
  const splitReversedUrls = urls.map((url) => {
    const paths = Common2.ParsedURL.ParsedURL.fromString(url)?.folderPathComponents.slice(1);
    assertNotNullOrUndefined(paths);
    return paths.split("/").reverse();
  });
  const startIndex = findFirstDifferingSegmentIndex(splitReversedUrls);
  for (let i = 0; i < splitReversedUrls.length; ++i) {
    const splitUrl = splitReversedUrls[i];
    const differentiator = findDifferentiatingPath(splitUrl, splitReversedUrls, startIndex);
    const reversed = differentiator.reverse().join("/");
    if (startIndex === 0) {
      urlToDifferentiator.set(urls[i], reversed + "/");
    } else {
      urlToDifferentiator.set(urls[i], reversed + "/\u2026/");
    }
  }
  console.assert(new Set(urlToDifferentiator.values()).size === urls.length, "Differentiators should be unique.");
}
function getDifferentiatingPathMap(titleInfos) {
  const nameToUrl = /* @__PURE__ */ new Map();
  const urlToDifferentiatingPath = /* @__PURE__ */ new Map();
  for (const { name, url } of titleInfos) {
    if (!nameToUrl.has(name)) {
      nameToUrl.set(name, []);
    }
    nameToUrl.get(name)?.push(url);
  }
  for (const urlsGroupedByName of nameToUrl.values()) {
    if (urlsGroupedByName.length > 1) {
      populateDifferentiatingPathMap(urlsGroupedByName, urlToDifferentiatingPath);
    }
  }
  return urlToDifferentiatingPath;
}

// gen/front_end/panels/sources/BreakpointsView.js
var { html: html2, render: render2, Directives: { ifDefined, repeat, classMap, live } } = Lit;
var UIStrings4 = {
  /**
   * @description Label for a checkbox to toggle pausing on uncaught exceptions in the breakpoint sidebar of the Sources panel. When the checkbox is checked, DevTools will pause if an uncaught exception is thrown at runtime.
   */
  pauseOnUncaughtExceptions: "Pause on uncaught exceptions",
  /**
   * @description Label for a checkbox to toggling pausing on caught exceptions in the breakpoint sidebar of the Sources panel. When the checkbox is checked, DevTools will pause if an exception is thrown, but caught (handled) at runtime.
   */
  pauseOnCaughtExceptions: "Pause on caught exceptions",
  /**
   * @description Text exposed to screen readers on checked items.
   */
  checked: "checked",
  /**
   * @description Accessible text exposed to screen readers when the screen reader encounters an unchecked checkbox.
   */
  unchecked: "unchecked",
  /**
   * @description Accessible text for a breakpoint collection with a combination of checked states.
   */
  indeterminate: "mixed",
  /**
   * @description Accessibility label for hit breakpoints in the Sources panel.
   * @example {checked} PH1
   */
  breakpointHit: "{PH1} breakpoint hit",
  /**
   * @description Tooltip text that shows when hovered over a remove button that appears next to a filename in the breakpoint sidebar of the sources panel. Also used in the context menu for breakpoint groups.
   */
  removeAllBreakpointsInFile: "Remove all breakpoints in file",
  /**
   * @description Context menu item in the Breakpoints Sidebar Pane of the Sources panel that disables all breakpoints in a file.
   */
  disableAllBreakpointsInFile: "Disable all breakpoints in file",
  /**
   * @description Context menu item in the Breakpoints Sidebar Pane of the Sources panel that enables all breakpoints in a file.
   */
  enableAllBreakpointsInFile: "Enable all breakpoints in file",
  /**
   * @description Tooltip text that shows when hovered over an edit button that appears next to a breakpoint or conditional breakpoint in the breakpoint sidebar of the sources panel.
   */
  editCondition: "Edit condition",
  /**
   * @description Tooltip text that shows when hovered over an edit button that appears next to a logpoint in the breakpoint sidebar of the sources panel.
   */
  editLogpoint: "Edit logpoint",
  /**
   * @description Context menu item in the Breakpoints Sidebar Pane of the Sources panel that disables all breakpoints.
   */
  disableAllBreakpoints: "Disable all breakpoints",
  /**
   * @description Context menu item in the Breakpoints Sidebar Pane of the Sources panel that enables all breakpoints.
   */
  enableAllBreakpoints: "Enable all breakpoints",
  /**
   * @description Tooltip text that shows when hovered over a remove button that appears next to a breakpoint in the breakpoint sidebar of the sources panel. Also used in the context menu for breakpoint items.
   */
  removeBreakpoint: "Remove breakpoint",
  /**
   * @description Text to remove all breakpoints
   */
  removeAllBreakpoints: "Remove all breakpoints",
  /**
   * @description Text in Breakpoints Sidebar Pane of the Sources panel
   */
  removeOtherBreakpoints: "Remove other breakpoints",
  /**
   * @description Context menu item that reveals the source code location of a breakpoint in the Sources panel.
   */
  revealLocation: "Reveal location",
  /**
   * @description Tooltip text that shows when hovered over a piece of code of a breakpoint in the breakpoint sidebar of the sources panel. It shows the condition, on which the breakpoint will stop.
   * @example {x < 3} PH1
   */
  conditionCode: "Condition: {PH1}",
  /**
   * @description Tooltip text that shows when hovered over a piece of code of a breakpoint in the breakpoint sidebar of the sources panel. It shows what is going to be printed in the console, if execution hits this breakpoint.
   * @example {'hello'} PH1
   */
  logpointCode: "Logpoint: {PH1}"
};
var str_4 = i18n8.i18n.registerUIStrings("panels/sources/BreakpointsView.ts", UIStrings4);
var i18nString4 = i18n8.i18n.getLocalizedString.bind(void 0, str_4);
var MAX_SNIPPET_LENGTH = 200;
var breakpointsViewInstance = null;
var breakpointsViewControllerInstance;
var BreakpointsSidebarController = class _BreakpointsSidebarController {
  #breakpointManager;
  #breakpointItemToLocationMap = /* @__PURE__ */ new WeakMap();
  #breakpointsActiveSetting;
  #pauseOnUncaughtExceptionSetting;
  #pauseOnCaughtExceptionSetting;
  #collapsedFilesSettings;
  #collapsedFiles;
  // This is used to keep track of outstanding edits to breakpoints that were initiated
  // by the breakpoint edit button (for UMA).
  #outstandingBreakpointEdited;
  #updateScheduled = false;
  #updateRunning = false;
  constructor(breakpointManager, settings) {
    this.#collapsedFilesSettings = Common3.Settings.Settings.instance().createSetting("collapsed-files", []);
    this.#collapsedFiles = new Set(this.#collapsedFilesSettings.get());
    this.#breakpointManager = breakpointManager;
    this.#breakpointManager.addEventListener(Breakpoints.BreakpointManager.Events.BreakpointAdded, this.#onBreakpointAdded, this);
    this.#breakpointManager.addEventListener(Breakpoints.BreakpointManager.Events.BreakpointRemoved, this.#onBreakpointRemoved, this);
    this.#breakpointsActiveSetting = settings.moduleSetting("breakpoints-active");
    this.#breakpointsActiveSetting.addChangeListener(this.update, this);
    this.#pauseOnUncaughtExceptionSetting = settings.moduleSetting("pause-on-uncaught-exception");
    this.#pauseOnUncaughtExceptionSetting.addChangeListener(this.update, this);
    this.#pauseOnCaughtExceptionSetting = settings.moduleSetting("pause-on-caught-exception");
    this.#pauseOnCaughtExceptionSetting.addChangeListener(this.update, this);
  }
  static instance({ forceNew, breakpointManager, settings } = {
    forceNew: null,
    breakpointManager: Breakpoints.BreakpointManager.BreakpointManager.instance(),
    settings: Common3.Settings.Settings.instance()
  }) {
    if (!breakpointsViewControllerInstance || forceNew) {
      breakpointsViewControllerInstance = new _BreakpointsSidebarController(breakpointManager, settings);
    }
    return breakpointsViewControllerInstance;
  }
  static removeInstance() {
    breakpointsViewControllerInstance = null;
  }
  flavorChanged(_object) {
    void this.update();
  }
  breakpointEditFinished(breakpoint, edited) {
    if (this.#outstandingBreakpointEdited && this.#outstandingBreakpointEdited === breakpoint) {
      if (edited) {
        Host2.userMetrics.actionTaken(Host2.UserMetrics.Action.BreakpointConditionEditedFromSidebar);
      }
      this.#outstandingBreakpointEdited = void 0;
    }
  }
  breakpointStateChanged(breakpointItem, checked) {
    const locations = this.#getLocationsForBreakpointItem(breakpointItem);
    locations.forEach((value2) => {
      const breakpoint = value2.breakpoint;
      breakpoint.setEnabled(checked);
    });
  }
  async breakpointEdited(breakpointItem, editButtonClicked) {
    const locations = this.#getLocationsForBreakpointItem(breakpointItem);
    let location;
    for (const locationCandidate of locations) {
      if (!location || locationCandidate.uiLocation.compareTo(location.uiLocation) < 0) {
        location = locationCandidate;
      }
    }
    if (location) {
      if (editButtonClicked) {
        this.#outstandingBreakpointEdited = location.breakpoint;
      }
      await Common3.Revealer.reveal(location);
    }
  }
  breakpointsRemoved(breakpointItems) {
    const locations = breakpointItems.flatMap((breakpointItem) => this.#getLocationsForBreakpointItem(breakpointItem));
    locations.forEach((location) => location?.breakpoint.remove(
      false
      /* keepInStorage */
    ));
  }
  expandedStateChanged(url, expanded) {
    if (expanded) {
      this.#collapsedFiles.delete(url);
    } else {
      this.#collapsedFiles.add(url);
    }
    this.#saveSettings();
  }
  async jumpToSource(breakpointItem) {
    const uiLocations = this.#getLocationsForBreakpointItem(breakpointItem).map((location) => location.uiLocation);
    let uiLocation;
    for (const uiLocationCandidate of uiLocations) {
      if (!uiLocation || uiLocationCandidate.compareTo(uiLocation) < 0) {
        uiLocation = uiLocationCandidate;
      }
    }
    if (uiLocation) {
      await Common3.Revealer.reveal(uiLocation);
    }
  }
  setPauseOnUncaughtExceptions(value2) {
    this.#pauseOnUncaughtExceptionSetting.set(value2);
  }
  setPauseOnCaughtExceptions(value2) {
    this.#pauseOnCaughtExceptionSetting.set(value2);
  }
  async update() {
    this.#updateScheduled = true;
    if (this.#updateRunning) {
      return;
    }
    this.#updateRunning = true;
    while (this.#updateScheduled) {
      this.#updateScheduled = false;
      const data = await this.getUpdatedBreakpointViewData();
      BreakpointsView.instance().data = data;
    }
    this.#updateRunning = false;
  }
  async getUpdatedBreakpointViewData() {
    const breakpointsActive = this.#breakpointsActiveSetting.get();
    const pauseOnUncaughtExceptions = this.#pauseOnUncaughtExceptionSetting.get();
    const pauseOnCaughtExceptions = this.#pauseOnCaughtExceptionSetting.get();
    const breakpointLocations = this.#getBreakpointLocations();
    if (!breakpointLocations.length) {
      return {
        breakpointsActive,
        pauseOnCaughtExceptions,
        pauseOnUncaughtExceptions,
        groups: []
      };
    }
    const locationsGroupedById = this.#groupBreakpointLocationsById(breakpointLocations);
    const locationIdsByLineId = this.#getLocationIdsByLineId(breakpointLocations);
    const [content, selectedUILocation] = await Promise.all([
      this.#getContent(locationsGroupedById),
      this.#getHitUILocation()
    ]);
    const scriptIdToGroup = /* @__PURE__ */ new Map();
    for (let idx = 0; idx < locationsGroupedById.length; idx++) {
      const locations = locationsGroupedById[idx];
      const fstLocation = locations[0];
      const sourceURL = fstLocation.uiLocation.uiSourceCode.url();
      const scriptId = fstLocation.uiLocation.uiSourceCode.canonicalScriptId();
      const uiLocation = fstLocation.uiLocation;
      const isHit = selectedUILocation !== null && locations.some((location) => location.uiLocation.id() === selectedUILocation.id());
      const numBreakpointsOnLine = locationIdsByLineId.get(uiLocation.lineId()).size;
      const showColumn = numBreakpointsOnLine > 1;
      const locationText = uiLocation.lineAndColumnText(showColumn);
      const contentData = content[idx];
      const codeSnippet = contentData instanceof TextUtils.WasmDisassembly.WasmDisassembly ? contentData.lines[contentData.bytecodeOffsetToLineNumber(uiLocation.columnNumber ?? 0)] ?? "" : contentData.textObj.lineAt(uiLocation.lineNumber);
      if (isHit && this.#collapsedFiles.has(sourceURL)) {
        this.#collapsedFiles.delete(sourceURL);
        this.#saveSettings();
      }
      const expanded = !this.#collapsedFiles.has(sourceURL);
      const status = this.#getBreakpointState(locations);
      const { type, hoverText } = this.#getBreakpointTypeAndDetails(locations);
      const item = {
        id: fstLocation.breakpoint.breakpointStorageId(),
        location: locationText,
        codeSnippet,
        isHit,
        status,
        type,
        hoverText
      };
      this.#breakpointItemToLocationMap.set(item, locations);
      let group = scriptIdToGroup.get(scriptId);
      if (group) {
        group.breakpointItems.push(item);
        group.expanded ||= expanded;
      } else {
        const editable = this.#breakpointManager.supportsConditionalBreakpoints(uiLocation.uiSourceCode);
        group = {
          url: sourceURL,
          name: uiLocation.uiSourceCode.displayName(),
          editable,
          expanded,
          breakpointItems: [item]
        };
        scriptIdToGroup.set(scriptId, group);
      }
    }
    return {
      breakpointsActive,
      pauseOnCaughtExceptions,
      pauseOnUncaughtExceptions,
      groups: Array.from(scriptIdToGroup.values())
    };
  }
  #onBreakpointAdded(event) {
    const breakpoint = event.data.breakpoint;
    if (breakpoint.origin === "USER_ACTION" && this.#collapsedFiles.has(breakpoint.url())) {
      this.#collapsedFiles.delete(breakpoint.url());
      this.#saveSettings();
    }
    return this.update();
  }
  #onBreakpointRemoved(event) {
    const breakpoint = event.data.breakpoint;
    if (this.#collapsedFiles.has(breakpoint.url())) {
      const locations = Breakpoints.BreakpointManager.BreakpointManager.instance().allBreakpointLocations();
      const otherBreakpointsOnSameFileExist = locations.some((location) => location.breakpoint.url() === breakpoint.url());
      if (!otherBreakpointsOnSameFileExist) {
        this.#collapsedFiles.delete(breakpoint.url());
        this.#saveSettings();
      }
    }
    return this.update();
  }
  #saveSettings() {
    this.#collapsedFilesSettings.set(Array.from(this.#collapsedFiles.values()));
  }
  #getBreakpointTypeAndDetails(locations) {
    const breakpointWithCondition = locations.find((location) => Boolean(location.breakpoint.condition()));
    const breakpoint = breakpointWithCondition?.breakpoint;
    if (!breakpoint?.condition()) {
      return {
        type: "REGULAR_BREAKPOINT"
        /* SDK.DebuggerModel.BreakpointType.REGULAR_BREAKPOINT */
      };
    }
    const condition = breakpoint.condition();
    if (breakpoint.isLogpoint()) {
      return { type: "LOGPOINT", hoverText: condition };
    }
    return { type: "CONDITIONAL_BREAKPOINT", hoverText: condition };
  }
  #getLocationsForBreakpointItem(breakpointItem) {
    const locations = this.#breakpointItemToLocationMap.get(breakpointItem);
    assertNotNullOrUndefined2(locations);
    return locations;
  }
  async #getHitUILocation() {
    const details = UI5.Context.Context.instance().flavor(SDK2.DebuggerModel.DebuggerPausedDetails);
    if (details?.callFrames.length) {
      return await Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().rawLocationToUILocation(details.callFrames[0].location());
    }
    return null;
  }
  #getBreakpointLocations() {
    const locations = this.#breakpointManager.allBreakpointLocations().filter((breakpointLocation) => breakpointLocation.uiLocation.uiSourceCode.project().type() !== Workspace2.Workspace.projectTypes.Debugger);
    locations.sort((item1, item2) => item1.uiLocation.compareTo(item2.uiLocation));
    const result = [];
    let lastBreakpoint = null;
    let lastLocation = null;
    for (const location of locations) {
      if (location.breakpoint !== lastBreakpoint || lastLocation && location.uiLocation.compareTo(lastLocation)) {
        result.push(location);
        lastBreakpoint = location.breakpoint;
        lastLocation = location.uiLocation;
      }
    }
    return result;
  }
  #groupBreakpointLocationsById(breakpointLocations) {
    const map = new Platform2.MapUtilities.Multimap();
    for (const breakpointLocation of breakpointLocations) {
      const uiLocation = breakpointLocation.uiLocation;
      map.set(uiLocation.id(), breakpointLocation);
    }
    const arr = [];
    for (const id of map.keysArray()) {
      const locations = Array.from(map.get(id));
      if (locations.length) {
        arr.push(locations);
      }
    }
    return arr;
  }
  #getLocationIdsByLineId(breakpointLocations) {
    const result = new Platform2.MapUtilities.Multimap();
    for (const breakpointLocation of breakpointLocations) {
      const uiLocation = breakpointLocation.uiLocation;
      result.set(uiLocation.lineId(), uiLocation.id());
    }
    return result;
  }
  #getBreakpointState(locations) {
    const hasEnabled = locations.some((location) => location.breakpoint.enabled());
    const hasDisabled = locations.some((location) => !location.breakpoint.enabled());
    let status;
    if (hasEnabled) {
      status = hasDisabled ? "INDETERMINATE" : "ENABLED";
    } else {
      status = "DISABLED";
    }
    return status;
  }
  #getContent(locations) {
    return Promise.all(locations.map(async ([{ uiLocation: { uiSourceCode } }]) => {
      const contentData = await uiSourceCode.requestContentData({ cachedWasmOnly: true });
      return TextUtils.ContentData.ContentData.contentDataOrEmpty(contentData);
    }));
  }
};
var DEFAULT_VIEW2 = (input, _output, target) => {
  render2(html2`
    <style>${Input.checkboxStyles}</style>
    <style>${breakpointsView_css_default}</style>
    <div jslog=${VisualLogging3.section("sources.js-breakpoints")} id="devtools-breakpoint-view">
      <div class='pause-on-uncaught-exceptions'
          tabindex='0'
          @click=${input.clickHandler}
          @keydown=${input.keyDownHandler}
          role='checkbox'
          aria-checked=${input.pauseOnUncaughtExceptions}
          data-first-pause>
        <label class='checkbox-label'>
          <input type='checkbox' tabindex=-1 class="small" ?checked=${input.pauseOnUncaughtExceptions} @change=${input.onPauseOnUncaughtExceptionsStateChanged} jslog=${VisualLogging3.toggle("pause-uncaught").track({ change: true })}>
          <span>${i18nString4(UIStrings4.pauseOnUncaughtExceptions)}</span>
        </label>
      </div>
      <div class='pause-on-caught-exceptions'
            tabindex='-1'
            @click=${input.clickHandler}
            @keydown=${input.keyDownHandler}
            role='checkbox'
            aria-checked=${input.pauseOnCaughtExceptions}
            data-last-pause>
          <label class='checkbox-label'>
            <input data-pause-on-caught-checkbox type='checkbox' class="small" tabindex=-1 ?checked=${input.pauseOnCaughtExceptions} @change=${input.onPauseOnCaughtExceptionsStateChanged.bind(void 0)} jslog=${VisualLogging3.toggle("pause-on-caught-exception").track({ change: true })}>
            <span>${i18nString4(UIStrings4.pauseOnCaughtExceptions)}</span>
          </label>
      </div>
      <div role=tree>
        ${repeat(input.breakpointGroups, (group) => group.url, (group, groupIndex) => html2`
            <details class=${classMap({ active: input.breakpointsActive })}
                  ?data-first-group=${groupIndex === 0}
                  ?data-last-group=${groupIndex === input.breakpointGroups.length - 1}
                  role=group
                  aria-label=${group.name}
                  aria-description=${group.url}
                  ?open=${live(group.expanded)}
                  @toggle=${input.groupToggleHandler.bind(void 0, group)}>
              <summary @contextmenu=${input.groupContextMenuHandler.bind(void 0, group)}
                      tabindex='-1'
                      @keydown=${input.keyDownHandler}
                      @click=${input.clickHandler}>
                <span class='group-header' aria-hidden=true>
                  <span class='group-icon-or-disable'>
                    <devtools-icon name="file-script"></devtools-icon>
                    <input class='group-checkbox small' type='checkbox'
                          aria-label=''
                          .checked=${group.breakpointItems.some(
    (item) => item.status === "ENABLED"
    /* BreakpointStatus.ENABLED */
  )}
                          @change=${input.groupCheckboxToggled.bind(void 0, group)}
                          tabindex=-1
                          jslog=${VisualLogging3.toggle("breakpoint-group").track({ change: true })}></input>
                  </span>
                  <span class='group-header-title' title=${group.url}>
                    ${group.name}
                    <span class='group-header-differentiator'>
                      ${input.urlToDifferentiatingPath.get(group.url)}
                    </span>
                  </span>
                </span>
                <span class='group-hover-actions'>
                  <button data-remove-breakpoint
                          @click=${input.removeAllBreakpointsInFileClickHandler.bind(void 0, group.breakpointItems)}
                          title=${i18nString4(UIStrings4.removeAllBreakpointsInFile)}
                          aria-label=${i18nString4(UIStrings4.removeAllBreakpointsInFile)}
                          jslog=${VisualLogging3.action("remove-breakpoint").track({ click: true })}>
                    <devtools-icon name="bin"></devtools-icon>
                  </button>
                </span>
              </summary>
            ${repeat(group.breakpointItems, (item) => item.id, (item, itemIndex) => html2`
                <div class=${classMap({
    "breakpoint-item": true,
    hit: item.isHit,
    "conditional-breakpoint": item.type === "CONDITIONAL_BREAKPOINT",
    logpoint: item.type === "LOGPOINT"
  })}
                    ?data-first-breakpoint=${itemIndex === 0}
                    ?data-last-breakpoint=${itemIndex === group.breakpointItems.length - 1}
                    aria-label=${ifDefined(input.itemDetails.get(item.id)?.itemDescription)}
                    role=treeitem
                    tabindex='-1'
                    @contextmenu=${input.itemContextMenuHandler.bind(void 0, item, group.editable)}
                    @click=${input.itemClickHandler}
                    @keydown=${input.keyDownHandler}>
                  <label class='checkbox-label'>
                    <span class='type-indicator'></span>
                    <input type='checkbox'
                          aria-label=${item.location}
                          class='small'
                          ?indeterminate=${item.status === "INDETERMINATE"}
                          .checked=${item.status === "ENABLED"}
                          @change=${input.itemCheckboxToggled.bind(void 0, item)}
                          tabindex=-1
                          jslog=${VisualLogging3.toggle("breakpoint").track({ change: true })}>
                  </label>
                  <span class='code-snippet' @click=${input.itemSnippetClickHandler.bind(void 0, item)}
                          title=${ifDefined(input.itemDetails.get(item.id)?.codeSnippetTooltip)}
                          jslog=${VisualLogging3.action("sources.jump-to-breakpoint").track({ click: true })}>${input.itemDetails.get(item.id)?.codeSnippet}</span>
                  <span class='breakpoint-item-location-or-actions'>
                    ${group.editable ? html2`
                          <button data-edit-breakpoint @click=${input.itemEditClickHandler.bind(void 0, item)}
                                  title=${item.type === "LOGPOINT" ? i18nString4(UIStrings4.editLogpoint) : i18nString4(UIStrings4.editCondition)}
                                  jslog=${VisualLogging3.action("edit-breakpoint").track({ click: true })}>
                            <devtools-icon name="edit"></devtools-icon>
                          </button>` : Lit.nothing}
                    <button data-remove-breakpoint
                            @click=${input.itemRemoveClickHandler.bind(void 0, item)}
                            title=${i18nString4(UIStrings4.removeBreakpoint)}
                            aria-label=${i18nString4(UIStrings4.removeBreakpoint)}
                            jslog=${VisualLogging3.action("remove-breakpoint").track({ click: true })}>
                      <devtools-icon name="bin"></devtools-icon>
                    </button>
                    <span class='location'>${item.location}</span>
                  </span>
                </div>`)}
            </details>`)}
      </div>
    </div>`, target);
};
var BreakpointsView = class _BreakpointsView extends UI5.Widget.VBox {
  #view;
  #controller;
  static instance({ forceNew } = { forceNew: false }) {
    if (!breakpointsViewInstance || forceNew) {
      breakpointsViewInstance = new _BreakpointsView(void 0);
    }
    return breakpointsViewInstance;
  }
  constructor(element, view = DEFAULT_VIEW2) {
    super(element, { useShadowDom: true });
    this.#view = view;
    this.#controller = BreakpointsSidebarController.instance();
    void this.#controller.update();
  }
  #pauseOnUncaughtExceptions = false;
  #pauseOnCaughtExceptions = false;
  #breakpointsActive = true;
  #breakpointGroups = [];
  #urlToDifferentiatingPath = /* @__PURE__ */ new Map();
  #breakpointItemDetails = /* @__PURE__ */ new Map();
  set data(data) {
    this.#pauseOnUncaughtExceptions = data.pauseOnUncaughtExceptions;
    this.#pauseOnCaughtExceptions = data.pauseOnCaughtExceptions;
    this.#breakpointsActive = data.breakpointsActive;
    this.#breakpointGroups = data.groups;
    this.#breakpointItemDetails = /* @__PURE__ */ new Map();
    const titleInfos = [];
    for (const group of data.groups) {
      titleInfos.push({ name: group.name, url: group.url });
      for (const item of group.breakpointItems) {
        this.#breakpointItemDetails.set(item.id, {
          itemDescription: this.#getBreakpointItemDescription(item),
          codeSnippet: Platform2.StringUtilities.trimEndWithMaxLength(item.codeSnippet, MAX_SNIPPET_LENGTH),
          codeSnippetTooltip: this.#getCodeSnippetTooltip(item.type, item.hoverText)
        });
      }
    }
    this.#urlToDifferentiatingPath = getDifferentiatingPathMap(titleInfos);
    this.requestUpdate();
  }
  wasShown() {
    super.wasShown();
    this.requestUpdate();
  }
  performUpdate() {
    const input = {
      clickHandler: this.#clickHandler.bind(this),
      keyDownHandler: this.#keyDownHandler.bind(this),
      pauseOnUncaughtExceptions: this.#pauseOnUncaughtExceptions,
      onPauseOnUncaughtExceptionsStateChanged: this.#onPauseOnUncaughtExceptionsStateChanged.bind(this),
      pauseOnCaughtExceptions: this.#pauseOnCaughtExceptions,
      onPauseOnCaughtExceptionsStateChanged: this.#onPauseOnCaughtExceptionsStateChanged.bind(this),
      breakpointGroups: this.#breakpointGroups,
      breakpointsActive: this.#breakpointsActive,
      groupContextMenuHandler: this.#groupContextMenuHandler.bind(this),
      groupToggleHandler: this.#groupToggleHandler.bind(this),
      groupClickHandler: this.#groupClickHandler.bind(this),
      groupCheckboxToggled: this.#groupCheckboxToggled.bind(this),
      urlToDifferentiatingPath: this.#urlToDifferentiatingPath,
      removeAllBreakpointsInFileClickHandler: this.#removeAllBreakpointsInFileClickHandler.bind(this),
      itemDetails: this.#breakpointItemDetails,
      itemContextMenuHandler: this.#itemContextMenuHandler.bind(this),
      itemClickHandler: this.#itemClickHandler.bind(this),
      itemSnippetClickHandler: this.#itemSnippetClickHandler.bind(this),
      itemCheckboxToggled: this.#onCheckboxToggled.bind(this),
      itemEditClickHandler: this.#itemEditClickHandler.bind(this),
      itemRemoveClickHandler: this.#itemRemoveClickHandler.bind(this)
    };
    this.#view(input, {}, this.contentElement);
    if (this.contentElement.querySelector('[tabindex="0"]') === null) {
      const element = this.contentElement.querySelector("[data-first-pause]");
      element?.setAttribute("tabindex", "0");
    }
  }
  async #clickHandler(event) {
    const currentTarget = event.currentTarget;
    await this.#setSelected(currentTarget);
    event.consume();
  }
  #groupContextMenuHandler(group, event) {
    this.#onBreakpointGroupContextMenu(event, group);
    event.consume();
  }
  #groupToggleHandler(group, event) {
    const htmlDetails = event.target;
    group.expanded = htmlDetails.open;
    void this.#controller.expandedStateChanged(group.url, group.expanded);
  }
  async #groupClickHandler(event) {
    const selected = event.currentTarget;
    await this.#setSelected(selected);
    Host2.userMetrics.actionTaken(Host2.UserMetrics.Action.BreakpointGroupExpandedStateChanged);
    event.consume();
  }
  #groupCheckboxToggled(group, event) {
    Host2.userMetrics.actionTaken(Host2.UserMetrics.Action.BreakpointsInFileCheckboxToggled);
    const element = event.target;
    const updatedStatus = element.checked ? "ENABLED" : "DISABLED";
    const itemsToUpdate = group.breakpointItems.filter((item) => item.status !== updatedStatus);
    itemsToUpdate.forEach((item) => {
      this.#controller.breakpointStateChanged(item, element.checked);
    });
    event.consume();
  }
  #removeAllBreakpointsInFileClickHandler(items, event) {
    Host2.userMetrics.actionTaken(Host2.UserMetrics.Action.BreakpointsInFileRemovedFromRemoveButton);
    void this.#controller.breakpointsRemoved(items);
    event.consume();
  }
  #itemContextMenuHandler(item, editable, event) {
    this.#onBreakpointEntryContextMenu(event, item, editable);
    event.consume();
  }
  async #itemClickHandler(event) {
    const target = event.currentTarget;
    await this.#setSelected(target);
    event.consume();
  }
  #itemSnippetClickHandler(item, event) {
    void this.#controller.jumpToSource(item);
    event.consume();
  }
  #itemEditClickHandler(item, event) {
    void this.#controller.breakpointEdited(
      item,
      true
      /* editButtonClicked */
    );
    event.consume();
  }
  #itemRemoveClickHandler(item, event) {
    Host2.userMetrics.actionTaken(Host2.UserMetrics.Action.BreakpointRemovedFromRemoveButton);
    void this.#controller.breakpointsRemoved([item]);
    event.consume();
  }
  async #keyDownHandler(event) {
    if (!event.target || !(event.target instanceof HTMLElement)) {
      return;
    }
    if (event.key === "Home" || event.key === "End") {
      event.consume(true);
      return await this.#handleHomeOrEndKey(event.key);
    }
    if (Platform2.KeyboardUtilities.keyIsArrowKey(event.key)) {
      event.consume(true);
      return await this.#handleArrowKey(event.key, event.target);
    }
    if (Platform2.KeyboardUtilities.isEnterOrSpaceKey(event)) {
      const currentTarget = event.currentTarget;
      await this.#setSelected(currentTarget);
      const input = currentTarget.querySelector("input");
      if (input) {
        input.click();
      }
      event.consume();
    }
    return;
  }
  async #setSelected(element) {
    if (!element) {
      return;
    }
    void RenderCoordinator.write("BreakpointsView focus on selected element", () => {
      const prevSelected = this.contentElement.querySelector('[tabindex="0"]');
      prevSelected?.setAttribute("tabindex", "-1");
      element.setAttribute("tabindex", "0");
      element.focus();
    });
  }
  async #handleArrowKey(key, target) {
    const setGroupExpandedState = (detailsElement, expanded) => {
      if (expanded) {
        return RenderCoordinator.write("BreakpointsView expand", () => {
          detailsElement.setAttribute("open", "");
        });
      }
      return RenderCoordinator.write("BreakpointsView expand", () => {
        detailsElement.removeAttribute("open");
      });
    };
    const nextNode = await findNextNodeForKeyboardNavigation(target, key, setGroupExpandedState);
    return await this.#setSelected(nextNode);
  }
  async #handleHomeOrEndKey(key) {
    if (key === "Home") {
      const pauseOnExceptionsNode = this.contentElement.querySelector("[data-first-pause]");
      return await this.#setSelected(pauseOnExceptionsNode);
    }
    if (key === "End") {
      const numGroups = this.#breakpointGroups.length;
      if (numGroups === 0) {
        const lastPauseOnExceptionsNode = this.contentElement.querySelector("[data-last-pause]");
        return await this.#setSelected(lastPauseOnExceptionsNode);
      }
      const lastGroupIndex = numGroups - 1;
      const lastGroup = this.#breakpointGroups[lastGroupIndex];
      if (lastGroup.expanded) {
        const lastBreakpointItem = this.contentElement.querySelector("[data-last-group] > [data-last-breakpoint]");
        return await this.#setSelected(lastBreakpointItem);
      }
      const lastGroupSummaryElement = this.contentElement.querySelector("[data-last-group] > summary");
      return await this.#setSelected(lastGroupSummaryElement);
    }
  }
  #onBreakpointGroupContextMenu(event, breakpointGroup) {
    const { breakpointItems } = breakpointGroup;
    const menu = new UI5.ContextMenu.ContextMenu(event);
    menu.defaultSection().appendItem(i18nString4(UIStrings4.removeAllBreakpointsInFile), () => {
      Host2.userMetrics.actionTaken(Host2.UserMetrics.Action.BreakpointsInFileRemovedFromContextMenu);
      void this.#controller.breakpointsRemoved(breakpointItems);
    }, { jslogContext: "remove-file-breakpoints" });
    const otherGroups = this.#breakpointGroups.filter((group) => group !== breakpointGroup);
    menu.defaultSection().appendItem(i18nString4(UIStrings4.removeOtherBreakpoints), () => {
      const breakpointItems2 = otherGroups.map(({ breakpointItems: breakpointItems3 }) => breakpointItems3).flat();
      void this.#controller.breakpointsRemoved(breakpointItems2);
    }, { disabled: otherGroups.length === 0, jslogContext: "remove-other-breakpoints" });
    menu.defaultSection().appendItem(i18nString4(UIStrings4.removeAllBreakpoints), () => {
      const breakpointItems2 = this.#breakpointGroups.map(({ breakpointItems: breakpointItems3 }) => breakpointItems3).flat();
      void this.#controller.breakpointsRemoved(breakpointItems2);
    }, { jslogContext: "remove-all-breakpoints" });
    const notEnabledItems = breakpointItems.filter(
      (breakpointItem) => breakpointItem.status !== "ENABLED"
      /* BreakpointStatus.ENABLED */
    );
    menu.debugSection().appendItem(i18nString4(UIStrings4.enableAllBreakpointsInFile), () => {
      Host2.userMetrics.actionTaken(Host2.UserMetrics.Action.BreakpointsInFileEnabledDisabledFromContextMenu);
      for (const breakpointItem of notEnabledItems) {
        this.#controller.breakpointStateChanged(breakpointItem, true);
      }
    }, { disabled: notEnabledItems.length === 0, jslogContext: "enable-file-breakpoints" });
    const notDisabledItems = breakpointItems.filter(
      (breakpointItem) => breakpointItem.status !== "DISABLED"
      /* BreakpointStatus.DISABLED */
    );
    menu.debugSection().appendItem(i18nString4(UIStrings4.disableAllBreakpointsInFile), () => {
      Host2.userMetrics.actionTaken(Host2.UserMetrics.Action.BreakpointsInFileEnabledDisabledFromContextMenu);
      for (const breakpointItem of notDisabledItems) {
        this.#controller.breakpointStateChanged(breakpointItem, false);
      }
    }, { disabled: notDisabledItems.length === 0, jslogContext: "disable-file-breakpoints" });
    void menu.show();
  }
  #onBreakpointEntryContextMenu(event, breakpointItem, editable) {
    const items = this.#breakpointGroups.map(({ breakpointItems }) => breakpointItems).flat();
    const otherItems = items.filter((item) => item !== breakpointItem);
    const menu = new UI5.ContextMenu.ContextMenu(event);
    const editBreakpointText = breakpointItem.type === "LOGPOINT" ? i18nString4(UIStrings4.editLogpoint) : i18nString4(UIStrings4.editCondition);
    menu.revealSection().appendItem(i18nString4(UIStrings4.revealLocation), () => {
      void this.#controller.jumpToSource(breakpointItem);
    }, { jslogContext: "jump-to-breakpoint" });
    menu.editSection().appendItem(editBreakpointText, () => {
      void this.#controller.breakpointEdited(
        breakpointItem,
        false
        /* editButtonClicked */
      );
    }, { disabled: !editable, jslogContext: "edit-breakpoint" });
    menu.defaultSection().appendItem(i18nString4(UIStrings4.enableAllBreakpoints), items.forEach.bind(items, (item) => this.#controller.breakpointStateChanged(item, true)), {
      disabled: items.every(
        (item) => item.status === "ENABLED"
        /* BreakpointStatus.ENABLED */
      ),
      jslogContext: "enable-all-breakpoints"
    });
    menu.defaultSection().appendItem(i18nString4(UIStrings4.disableAllBreakpoints), items.forEach.bind(items, (item) => this.#controller.breakpointStateChanged(item, false)), {
      disabled: items.every(
        (item) => item.status === "DISABLED"
        /* BreakpointStatus.DISABLED */
      ),
      jslogContext: "disable-all-breakpoints"
    });
    menu.footerSection().appendItem(i18nString4(UIStrings4.removeBreakpoint), () => {
      Host2.userMetrics.actionTaken(Host2.UserMetrics.Action.BreakpointRemovedFromContextMenu);
      void this.#controller.breakpointsRemoved([breakpointItem]);
    }, { jslogContext: "remove-breakpoint" });
    menu.footerSection().appendItem(i18nString4(UIStrings4.removeOtherBreakpoints), () => {
      void this.#controller.breakpointsRemoved(otherItems);
    }, { disabled: otherItems.length === 0, jslogContext: "remove-other-breakpoints" });
    menu.footerSection().appendItem(i18nString4(UIStrings4.removeAllBreakpoints), () => {
      const breakpointItems = this.#breakpointGroups.map(({ breakpointItems: breakpointItems2 }) => breakpointItems2).flat();
      void this.#controller.breakpointsRemoved(breakpointItems);
    }, { jslogContext: "remove-all-breakpoints" });
    void menu.show();
  }
  #getCodeSnippetTooltip(type, hoverText) {
    switch (type) {
      case "REGULAR_BREAKPOINT":
        return void 0;
      case "CONDITIONAL_BREAKPOINT":
        assertNotNullOrUndefined2(hoverText);
        return i18nString4(UIStrings4.conditionCode, { PH1: hoverText });
      case "LOGPOINT":
        assertNotNullOrUndefined2(hoverText);
        return i18nString4(UIStrings4.logpointCode, { PH1: hoverText });
    }
  }
  #getBreakpointItemDescription(breakpointItem) {
    let checkboxDescription;
    switch (breakpointItem.status) {
      case "ENABLED":
        checkboxDescription = i18nString4(UIStrings4.checked);
        break;
      case "DISABLED":
        checkboxDescription = i18nString4(UIStrings4.unchecked);
        break;
      case "INDETERMINATE":
        checkboxDescription = i18nString4(UIStrings4.indeterminate);
        break;
    }
    if (!breakpointItem.isHit) {
      return checkboxDescription;
    }
    return i18nString4(UIStrings4.breakpointHit, { PH1: checkboxDescription });
  }
  #onCheckboxToggled(item, event) {
    const element = event.target;
    this.#controller.breakpointStateChanged(item, element.checked);
  }
  #onPauseOnCaughtExceptionsStateChanged(e) {
    const { checked } = e.target;
    this.#controller.setPauseOnCaughtExceptions(checked);
  }
  #onPauseOnUncaughtExceptionsStateChanged(e) {
    const { checked } = e.target;
    this.#controller.setPauseOnUncaughtExceptions(checked);
  }
};

// gen/front_end/panels/sources/CallStackSidebarPane.js
var CallStackSidebarPane_exports = {};
__export(CallStackSidebarPane_exports, {
  ActionDelegate: () => ActionDelegate,
  CallStackSidebarPane: () => CallStackSidebarPane,
  Item: () => Item,
  defaultMaxAsyncStackChainDepth: () => defaultMaxAsyncStackChainDepth,
  elementSymbol: () => elementSymbol
});
import * as Common4 from "./../../core/common/common.js";
import * as Host3 from "./../../core/host/host.js";
import * as i18n10 from "./../../core/i18n/i18n.js";
import * as Platform3 from "./../../core/platform/platform.js";
import * as SDK3 from "./../../core/sdk/sdk.js";
import * as Bindings2 from "./../../models/bindings/bindings.js";
import * as Persistence from "./../../models/persistence/persistence.js";
import * as SourceMapScopes from "./../../models/source_map_scopes/source_map_scopes.js";
import * as Workspace4 from "./../../models/workspace/workspace.js";
import * as IconButton2 from "./../../ui/components/icon_button/icon_button.js";
import * as UI6 from "./../../ui/legacy/legacy.js";
import * as VisualLogging4 from "./../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/sources/callStackSidebarPane.css.js
var callStackSidebarPane_css_default = `/*
 * Copyright 2016 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.call-frame-warnings-message {
  text-align: center;
  font-style: italic;
  padding: 4px;
  color: var(--sys-color-on-surface-yellow);
  background-color: var(--sys-color-surface-yellow);
}

.ignore-listed-message {
  padding: 1px;
}

.ignore-listed-message-label {
  color: var(--sys-color-token-subtle);
  align-items: center;
  display: flex;
}

.show-more-message > .link {
  margin-left: 5px;
}

.show-more-message {
  text-align: center;
  font-style: italic;
  padding: 4px;
  border-top: 1px solid var(--sys-color-divider);
}

.call-frame-item {
  padding: 3px 8px 3px 20px;
  position: relative;
  min-height: 18px;
  line-height: 15px;
  display: flex;
  flex-wrap: wrap;
}

.call-frame-title-text {
  text-overflow: ellipsis;
  overflow: hidden;
}

.async-header + .call-frame-item {
  border-top: 0;
}

.call-frame-item:not(.async-header) {
  border-top: 1px solid var(--sys-color-divider);
}

.call-frame-item-title,
.call-frame-location {
  display: flex;
  white-space: nowrap;
}

.async-header .call-frame-item-title {
  font-weight: bold;
  color: var(--sys-color-on-surface);
  background-color: var(--sys-color-cdt-base-container);
  margin-left: -5px;
  padding: 0 5px;
  z-index: 1;
}

.call-frame-item:focus-visible,
.call-frame-item.async-header:focus-visible .call-frame-item-title {
  background-color: var(--sys-color-tonal-container);
}

.ignore-listed-checkbox:focus-visible {
  outline-width: unset;
}

.call-frame-item:not(.async-header):hover {
  background-color: var(--sys-color-state-hover-on-subtle);
}

.call-frame-location {
  color: var(--sys-color-token-subtle);
  margin-left: auto;
  padding: 0 10px;
}

.async-header::before {
  content: " ";
  width: 100%;
  border-top: 1px solid var(--sys-color-divider);
  margin-top: 8px;
  position: absolute;
  left: 0;
}

.ignore-listed-call-frame {
  opacity: 60%;
  font-style: italic;
}

.selected-call-frame-icon {
  display: none;
  position: absolute;
  top: 3px;
  left: 4px;
}

.call-frame-item.selected .selected-call-frame-icon {
  display: block;
}

.call-frame-warning-icon {
  display: block;
  position: absolute;
  top: 3px;
  right: 4px;
}

@media (forced-colors: active) {
  .call-frame-item:focus-visible,
  .call-frame-item:not(.async-header):hover {
    forced-color-adjust: none;
    background-color: Highlight;
  }

  .call-frame-item:focus-visible *,
  .call-frame-item:not(.async-header):hover * {
    color: HighlightText;
  }
}

/*# sourceURL=${import.meta.resolve("./callStackSidebarPane.css")} */`;

// gen/front_end/panels/sources/CallStackSidebarPane.js
var UIStrings5 = {
  /**
   * @description Text in Call Stack Sidebar Pane of the Sources panel
   */
  callStack: "Call Stack",
  /**
   * @description Not paused message element text content in Call Stack Sidebar Pane of the Sources panel
   */
  notPaused: "Not paused",
  /**
   * @description Text exposed to screen reader when navigating through a ignore-listed call frame in the sources panel
   */
  onIgnoreList: "on ignore list",
  /**
   * @description Show all link text content in Call Stack Sidebar Pane of the Sources panel
   */
  showIgnorelistedFrames: "Show ignore-listed frames",
  /**
   * @description Text to show more content
   */
  showMore: "Show more",
  /**
   * @description A context menu item in the Call Stack Sidebar Pane of the Sources panel
   */
  copyStackTrace: "Copy stack trace",
  /**
   * @description Text in Call Stack Sidebar Pane of the Sources panel when some call frames have warnings
   */
  callFrameWarnings: "Some call frames have warnings",
  /**
   * @description Error message that is displayed in UI when a file needed for debugging information for a call frame is missing
   * @example {src/myapp.debug.wasm.dwp} PH1
   */
  debugFileNotFound: 'Failed to load debug file "{PH1}".',
  /**
   * @description A context menu item in the Call Stack Sidebar Pane. "Restart" is a verb and
   * "frame" is a noun. "Frame" refers to an individual item in the call stack, i.e. a call frame.
   * The user opens this context menu by selecting a specific call frame in the call stack sidebar pane.
   */
  restartFrame: "Restart frame"
};
var str_5 = i18n10.i18n.registerUIStrings("panels/sources/CallStackSidebarPane.ts", UIStrings5);
var i18nString5 = i18n10.i18n.getLocalizedString.bind(void 0, str_5);
var callstackSidebarPaneInstance;
var CallStackSidebarPane = class _CallStackSidebarPane extends UI6.View.SimpleView {
  ignoreListMessageElement;
  ignoreListCheckboxElement;
  notPausedMessageElement;
  callFrameWarningsElement;
  items;
  list;
  showMoreMessageElement;
  showIgnoreListed;
  locationPool;
  updateThrottler;
  maxAsyncStackChainDepth;
  updateItemThrottler;
  scheduledForUpdateItems;
  muteActivateItem;
  lastDebuggerModel = null;
  constructor() {
    super({
      jslog: `${VisualLogging4.section("sources.callstack")}`,
      title: i18nString5(UIStrings5.callStack),
      viewId: "sources.callstack",
      useShadowDom: true
    });
    this.registerRequiredCSS(callStackSidebarPane_css_default);
    ({ element: this.ignoreListMessageElement, checkbox: this.ignoreListCheckboxElement } = this.createIgnoreListMessageElementAndCheckbox());
    this.contentElement.appendChild(this.ignoreListMessageElement);
    this.notPausedMessageElement = this.contentElement.createChild("div", "gray-info-message");
    this.notPausedMessageElement.textContent = i18nString5(UIStrings5.notPaused);
    this.notPausedMessageElement.tabIndex = -1;
    this.callFrameWarningsElement = this.contentElement.createChild("div", "call-frame-warnings-message");
    const icon = new IconButton2.Icon.Icon();
    icon.name = "warning-filled";
    icon.classList.add("call-frame-warning-icon", "small");
    this.callFrameWarningsElement.appendChild(icon);
    this.callFrameWarningsElement.appendChild(document.createTextNode(i18nString5(UIStrings5.callFrameWarnings)));
    this.callFrameWarningsElement.tabIndex = -1;
    this.items = new UI6.ListModel.ListModel();
    this.list = new UI6.ListControl.ListControl(this.items, this, UI6.ListControl.ListMode.NonViewport);
    this.contentElement.appendChild(this.list.element);
    this.list.element.addEventListener("contextmenu", this.onContextMenu.bind(this), false);
    self.onInvokeElement(this.list.element, (event) => {
      const item = this.list.itemForNode(event.target);
      if (item) {
        this.activateItem(item);
        event.consume(true);
      }
    });
    this.showMoreMessageElement = this.createShowMoreMessageElement();
    this.showMoreMessageElement.classList.add("hidden");
    this.contentElement.appendChild(this.showMoreMessageElement);
    this.showIgnoreListed = false;
    this.locationPool = new Bindings2.LiveLocation.LiveLocationPool();
    this.updateThrottler = new Common4.Throttler.Throttler(100);
    this.maxAsyncStackChainDepth = defaultMaxAsyncStackChainDepth;
    this.update();
    this.updateItemThrottler = new Common4.Throttler.Throttler(100);
    this.scheduledForUpdateItems = /* @__PURE__ */ new Set();
    SDK3.TargetManager.TargetManager.instance().addModelListener(SDK3.DebuggerModel.DebuggerModel, SDK3.DebuggerModel.Events.DebugInfoAttached, this.debugInfoAttached, this);
  }
  static instance(opts = { forceNew: null }) {
    const { forceNew } = opts;
    if (!callstackSidebarPaneInstance || forceNew) {
      callstackSidebarPaneInstance = new _CallStackSidebarPane();
    }
    return callstackSidebarPaneInstance;
  }
  flavorChanged(_object) {
    this.showIgnoreListed = false;
    this.ignoreListCheckboxElement.checked = false;
    this.maxAsyncStackChainDepth = defaultMaxAsyncStackChainDepth;
    this.update();
  }
  debugInfoAttached() {
    this.update();
  }
  setSourceMapSubscription(debuggerModel) {
    if (this.lastDebuggerModel === debuggerModel) {
      return;
    }
    if (this.lastDebuggerModel) {
      this.lastDebuggerModel.sourceMapManager().removeEventListener(SDK3.SourceMapManager.Events.SourceMapAttached, this.debugInfoAttached, this);
    }
    this.lastDebuggerModel = debuggerModel;
    if (this.lastDebuggerModel) {
      this.lastDebuggerModel.sourceMapManager().addEventListener(SDK3.SourceMapManager.Events.SourceMapAttached, this.debugInfoAttached, this);
    }
  }
  update() {
    void this.updateThrottler.schedule(() => this.doUpdate());
  }
  async doUpdate() {
    this.locationPool.disposeAll();
    this.callFrameWarningsElement.classList.add("hidden");
    const details = UI6.Context.Context.instance().flavor(SDK3.DebuggerModel.DebuggerPausedDetails);
    this.setSourceMapSubscription(details?.debuggerModel ?? null);
    if (!details) {
      this.notPausedMessageElement.classList.remove("hidden");
      this.ignoreListMessageElement.classList.add("hidden");
      this.showMoreMessageElement.classList.add("hidden");
      this.items.replaceAll([]);
      UI6.Context.Context.instance().setFlavor(SDK3.DebuggerModel.CallFrame, null);
      return;
    }
    this.notPausedMessageElement.classList.add("hidden");
    const itemPromises = [];
    const uniqueWarnings = /* @__PURE__ */ new Set();
    for (const frame of details.callFrames) {
      const itemPromise = Item.createForDebuggerCallFrame(frame, this.locationPool, this.refreshItem.bind(this));
      itemPromises.push(itemPromise);
      if (frame.missingDebugInfoDetails) {
        uniqueWarnings.add(frame.missingDebugInfoDetails.details);
      }
    }
    const items = await Promise.all(itemPromises);
    if (uniqueWarnings.size) {
      this.callFrameWarningsElement.classList.remove("hidden");
      UI6.Tooltip.Tooltip.install(this.callFrameWarningsElement, Array.from(uniqueWarnings).join("\n"));
    }
    let previousStackTrace = details.callFrames;
    let { maxAsyncStackChainDepth } = this;
    let asyncStackTrace = null;
    for await (const { stackTrace } of details.debuggerModel.iterateAsyncParents(details)) {
      asyncStackTrace = stackTrace;
      const title = UI6.UIUtils.asyncStackTraceLabel(asyncStackTrace.description, previousStackTrace);
      items.push(...await Item.createItemsForAsyncStack(title, details.debuggerModel, asyncStackTrace.callFrames, this.locationPool, this.refreshItem.bind(this)));
      previousStackTrace = asyncStackTrace.callFrames;
      if (--maxAsyncStackChainDepth <= 0) {
        break;
      }
    }
    this.showMoreMessageElement.classList.toggle("hidden", !asyncStackTrace);
    this.items.replaceAll(items);
    for (const item of this.items) {
      this.refreshItem(item);
    }
    if (this.maxAsyncStackChainDepth === defaultMaxAsyncStackChainDepth) {
      this.list.selectNextItem(
        true,
        false
        /* center */
      );
      const selectedItem = this.list.selectedItem();
      if (selectedItem) {
        this.activateItem(selectedItem);
      }
    }
    this.updatedForTest();
  }
  updatedForTest() {
  }
  refreshItem(item) {
    this.scheduledForUpdateItems.add(item);
    void this.updateItemThrottler.schedule(async () => {
      const items = Array.from(this.scheduledForUpdateItems);
      this.scheduledForUpdateItems.clear();
      this.muteActivateItem = true;
      if (!this.showIgnoreListed && this.items.every((item2) => item2.isIgnoreListed)) {
        this.showIgnoreListed = true;
        for (let i = 0; i < this.items.length; ++i) {
          this.list.refreshItemByIndex(i);
        }
        this.ignoreListMessageElement.classList.toggle("hidden", true);
      } else {
        this.showIgnoreListed = this.ignoreListCheckboxElement.checked;
        const itemsSet = new Set(items);
        let hasIgnoreListed = false;
        for (let i = 0; i < this.items.length; ++i) {
          const item2 = this.items.at(i);
          if (itemsSet.has(item2)) {
            this.list.refreshItemByIndex(i);
          }
          hasIgnoreListed = hasIgnoreListed || item2.isIgnoreListed;
        }
        this.ignoreListMessageElement.classList.toggle("hidden", !hasIgnoreListed);
      }
      delete this.muteActivateItem;
    });
  }
  createElementForItem(item) {
    const element = document.createElement("div");
    element.classList.add("call-frame-item");
    const title = element.createChild("div", "call-frame-item-title");
    const titleElement = title.createChild("div", "call-frame-title-text");
    titleElement.textContent = item.title;
    if (item.isAsyncHeader) {
      element.classList.add("async-header");
    } else {
      UI6.Tooltip.Tooltip.install(titleElement, item.title);
      const linkElement = element.createChild("div", "call-frame-location");
      linkElement.textContent = Platform3.StringUtilities.trimMiddle(item.linkText, 30);
      UI6.Tooltip.Tooltip.install(linkElement, item.linkText);
      element.classList.toggle("ignore-listed-call-frame", item.isIgnoreListed);
      if (item.isIgnoreListed) {
        UI6.ARIAUtils.setDescription(element, i18nString5(UIStrings5.onIgnoreList));
      }
      if (!item.frame) {
        UI6.ARIAUtils.setDisabled(element, true);
      }
    }
    const callframe = item.frame;
    const isSelected = callframe === UI6.Context.Context.instance().flavor(SDK3.DebuggerModel.CallFrame);
    element.classList.toggle("selected", isSelected);
    UI6.ARIAUtils.setSelected(element, isSelected);
    element.classList.toggle("hidden", !this.showIgnoreListed && item.isIgnoreListed);
    const icon = new IconButton2.Icon.Icon();
    icon.name = "large-arrow-right-filled";
    icon.classList.add("selected-call-frame-icon", "small");
    element.appendChild(icon);
    element.tabIndex = item === this.list.selectedItem() ? 0 : -1;
    if (callframe?.missingDebugInfoDetails) {
      const icon2 = new IconButton2.Icon.Icon();
      icon2.name = "warning-filled";
      icon2.classList.add("call-frame-warning-icon", "small");
      const messages = callframe.missingDebugInfoDetails.resources.map((r) => i18nString5(UIStrings5.debugFileNotFound, { PH1: Common4.ParsedURL.ParsedURL.extractName(r.resourceUrl) }));
      UI6.Tooltip.Tooltip.install(icon2, [callframe.missingDebugInfoDetails.details, ...messages].join("\n"));
      element.appendChild(icon2);
    }
    return element;
  }
  heightForItem(_item) {
    console.assert(false);
    return 0;
  }
  isItemSelectable(_item) {
    return true;
  }
  selectedItemChanged(_from, _to, fromElement, toElement) {
    if (fromElement) {
      fromElement.tabIndex = -1;
    }
    if (toElement) {
      this.setDefaultFocusedElement(toElement);
      toElement.tabIndex = 0;
      if (this.hasFocus()) {
        toElement.focus();
      }
    }
  }
  updateSelectedItemARIA(_fromElement, _toElement) {
    return true;
  }
  createIgnoreListMessageElementAndCheckbox() {
    const element = document.createElement("div");
    element.classList.add("ignore-listed-message");
    const label = element.createChild("label");
    label.classList.add("ignore-listed-message-label");
    const checkbox = label.createChild("input");
    checkbox.tabIndex = 0;
    checkbox.type = "checkbox";
    checkbox.classList.add("ignore-listed-checkbox");
    label.append(i18nString5(UIStrings5.showIgnorelistedFrames));
    const showAll = () => {
      this.showIgnoreListed = checkbox.checked;
      for (const item of this.items) {
        this.refreshItem(item);
      }
    };
    checkbox.addEventListener("click", showAll);
    return { element, checkbox };
  }
  createShowMoreMessageElement() {
    const element = document.createElement("div");
    element.classList.add("show-more-message");
    element.createChild("span");
    const showAllLink = element.createChild("span", "link");
    showAllLink.textContent = i18nString5(UIStrings5.showMore);
    showAllLink.addEventListener("click", () => {
      this.maxAsyncStackChainDepth += defaultMaxAsyncStackChainDepth;
      this.update();
    }, false);
    return element;
  }
  onContextMenu(event) {
    const item = this.list.itemForNode(event.target);
    if (!item) {
      return;
    }
    const contextMenu = new UI6.ContextMenu.ContextMenu(event);
    const debuggerCallFrame = item.frame;
    if (debuggerCallFrame) {
      contextMenu.defaultSection().appendItem(i18nString5(UIStrings5.restartFrame), () => {
        Host3.userMetrics.actionTaken(Host3.UserMetrics.Action.StackFrameRestarted);
        void debuggerCallFrame.restart();
      }, { disabled: !debuggerCallFrame.canBeRestarted, jslogContext: "restart-frame" });
    }
    contextMenu.defaultSection().appendItem(i18nString5(UIStrings5.copyStackTrace), this.copyStackTrace.bind(this), { jslogContext: "copy-stack-trace" });
    if (item.uiLocation) {
      this.appendIgnoreListURLContextMenuItems(contextMenu, item.uiLocation.uiSourceCode);
    }
    void contextMenu.show();
  }
  activateItem(item) {
    const uiLocation = item.uiLocation;
    if (this.muteActivateItem || !uiLocation) {
      return;
    }
    this.list.selectItem(item);
    const debuggerCallFrame = item.frame;
    const oldItem = this.activeCallFrameItem();
    if (debuggerCallFrame && oldItem !== item) {
      debuggerCallFrame.debuggerModel.setSelectedCallFrame(debuggerCallFrame);
      UI6.Context.Context.instance().setFlavor(SDK3.DebuggerModel.CallFrame, debuggerCallFrame);
      if (oldItem) {
        this.refreshItem(oldItem);
      }
      this.refreshItem(item);
    } else {
      void Common4.Revealer.reveal(uiLocation);
    }
  }
  activeCallFrameItem() {
    const callFrame = UI6.Context.Context.instance().flavor(SDK3.DebuggerModel.CallFrame);
    if (callFrame) {
      return this.items.find((callFrameItem) => callFrameItem.frame === callFrame) || null;
    }
    return null;
  }
  appendIgnoreListURLContextMenuItems(contextMenu, uiSourceCode) {
    const binding = Persistence.Persistence.PersistenceImpl.instance().binding(uiSourceCode);
    if (binding) {
      uiSourceCode = binding.network;
    }
    const menuSection = contextMenu.section("ignoreList");
    if (menuSection.items.length > 0) {
      return;
    }
    for (const { text, callback, jslogContext } of Workspace4.IgnoreListManager.IgnoreListManager.instance().getIgnoreListURLContextMenuItems(uiSourceCode)) {
      menuSection.appendItem(text, callback, { jslogContext });
    }
  }
  selectNextCallFrameOnStack() {
    const oldItem = this.activeCallFrameItem();
    const startIndex = oldItem ? this.items.indexOf(oldItem) + 1 : 0;
    for (let i = startIndex; i < this.items.length; i++) {
      const newItem = this.items.at(i);
      if (newItem.frame) {
        this.activateItem(newItem);
        break;
      }
    }
  }
  selectPreviousCallFrameOnStack() {
    const oldItem = this.activeCallFrameItem();
    const startIndex = oldItem ? this.items.indexOf(oldItem) - 1 : this.items.length - 1;
    for (let i = startIndex; i >= 0; i--) {
      const newItem = this.items.at(i);
      if (newItem.frame) {
        this.activateItem(newItem);
        break;
      }
    }
  }
  copyStackTrace() {
    const text = [];
    for (const item of this.items) {
      let itemText = item.title;
      if (item.uiLocation) {
        itemText += " (" + item.uiLocation.linkText(
          true
          /* skipTrim */
        ) + ")";
      }
      text.push(itemText);
    }
    Host3.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(text.join("\n"));
  }
};
var elementSymbol = Symbol("element");
var defaultMaxAsyncStackChainDepth = 32;
var ActionDelegate = class {
  handleAction(_context, actionId) {
    switch (actionId) {
      case "debugger.next-call-frame":
        CallStackSidebarPane.instance().selectNextCallFrameOnStack();
        return true;
      case "debugger.previous-call-frame":
        CallStackSidebarPane.instance().selectPreviousCallFrameOnStack();
        return true;
    }
    return false;
  }
};
var Item = class _Item {
  isIgnoreListed;
  title;
  linkText;
  uiLocation;
  isAsyncHeader;
  updateDelegate;
  /** Only set for synchronous frames */
  frame;
  static async createForDebuggerCallFrame(frame, locationPool, updateDelegate) {
    const name = frame.functionName;
    const item = new _Item(UI6.UIUtils.beautifyFunctionName(name), updateDelegate, frame);
    await Bindings2.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().createCallFrameLiveLocation(frame.location(), item.update.bind(item), locationPool);
    void SourceMapScopes.NamesResolver.resolveDebuggerFrameFunctionName(frame).then((functionName) => {
      if (functionName && functionName !== name) {
        item.title = functionName;
        item.updateDelegate(item);
      }
    });
    return item;
  }
  static async createItemsForAsyncStack(title, debuggerModel, frames, locationPool, updateDelegate) {
    const headerItemToItemsSet = /* @__PURE__ */ new WeakMap();
    const asyncHeaderItem = new _Item(title, updateDelegate);
    headerItemToItemsSet.set(asyncHeaderItem, /* @__PURE__ */ new Set());
    asyncHeaderItem.isAsyncHeader = true;
    const asyncFrameItems = [];
    const liveLocationPromises = [];
    for (const frame of frames) {
      const item = new _Item(UI6.UIUtils.beautifyFunctionName(frame.functionName), update);
      const rawLocation = debuggerModel.createRawLocationByScriptId(frame.scriptId, frame.lineNumber, frame.columnNumber);
      liveLocationPromises.push(Bindings2.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().createCallFrameLiveLocation(rawLocation, item.update.bind(item), locationPool));
      void SourceMapScopes.NamesResolver.resolveProfileFrameFunctionName(frame, debuggerModel.target()).then((functionName) => {
        if (functionName && functionName !== frame.functionName) {
          item.title = functionName;
          item.updateDelegate(item);
        }
      });
      asyncFrameItems.push(item);
    }
    await Promise.all(liveLocationPromises);
    updateDelegate(asyncHeaderItem);
    return [asyncHeaderItem, ...asyncFrameItems];
    function update(item) {
      updateDelegate(item);
      let shouldUpdate = false;
      const items = headerItemToItemsSet.get(asyncHeaderItem);
      if (items) {
        if (item.isIgnoreListed) {
          items.delete(item);
          shouldUpdate = items.size === 0;
        } else {
          shouldUpdate = items.size === 0;
          items.add(item);
        }
        asyncHeaderItem.isIgnoreListed = items.size === 0;
      }
      if (shouldUpdate) {
        updateDelegate(asyncHeaderItem);
      }
    }
  }
  constructor(title, updateDelegate, frame) {
    this.isIgnoreListed = false;
    this.title = title;
    this.linkText = "";
    this.uiLocation = null;
    this.isAsyncHeader = false;
    this.updateDelegate = updateDelegate;
    this.frame = frame;
  }
  async update(liveLocation) {
    const uiLocation = await liveLocation.uiLocation();
    this.isIgnoreListed = Boolean(uiLocation?.isIgnoreListed());
    this.linkText = uiLocation ? uiLocation.linkText() : "";
    this.uiLocation = uiLocation;
    this.updateDelegate(this);
  }
};

// gen/front_end/panels/sources/CategorizedBreakpointL10n.js
var CategorizedBreakpointL10n_exports = {};
__export(CategorizedBreakpointL10n_exports, {
  getLocalizedBreakpointName: () => getLocalizedBreakpointName
});
import * as i18n12 from "./../../core/i18n/i18n.js";
import * as SDK4 from "./../../core/sdk/sdk.js";
var UIStrings6 = {
  /**
   * @description Name of a breakpoint type.
   * https://github.com/WICG/turtledove/blob/main/FLEDGE.md#32-on-device-bidding
   */
  beforeBidderWorkletBiddingStart: "Bidder Bidding Phase Start",
  /**
   * @description Name of a breakpoint type.
   * https://github.com/WICG/turtledove/blob/main/FLEDGE.md#52-buyer-reporting-on-render-and-ad-events
   */
  beforeBidderWorkletReportingStart: "Bidder Reporting Phase Start",
  /**
   * @description Name of a breakpoint type.
   * https://github.com/WICG/turtledove/blob/main/FLEDGE.md#23-scoring-bids
   */
  beforeSellerWorkletScoringStart: "Seller Scoring Phase Start",
  /**
   * @description Name of a breakpoint type.
   * https://github.com/WICG/turtledove/blob/main/FLEDGE.md#51-seller-reporting-on-render
   */
  beforeSellerWorkletReportingStart: "Seller Reporting Phase Start",
  /**
   * @description Text in the Event Listener Breakpoints Panel of the JavaScript Debugger in the Sources Panel
   * @example {setTimeout} PH1
   */
  setTimeoutOrIntervalFired: "{PH1} fired",
  /**
   * @description Text in the Event Listener Breakpoints Panel of the JavaScript Debugger in the Sources Panel
   */
  scriptFirstStatement: "Script First Statement",
  /**
   * @description Text in the Event Listener Breakpoints Panel of the JavaScript Debugger in the Sources Panel
   */
  scriptBlockedByContentSecurity: "Script Blocked by Content Security Policy",
  /**
   * @description Text for the request animation frame event
   */
  requestAnimationFrame: "Request Animation Frame",
  /**
   * @description Text to cancel the animation frame
   */
  cancelAnimationFrame: "Cancel Animation Frame",
  /**
   * @description Text for the event that an animation frame is fired
   */
  animationFrameFired: "Animation Frame Fired",
  /**
   * @description Text in the Event Listener Breakpoints Panel of the JavaScript Debugger in the Sources Panel
   */
  webglErrorFired: "WebGL Error Fired",
  /**
   * @description Text in the Event Listener Breakpoints Panel of the JavaScript Debugger in the Sources Panel
   */
  webglWarningFired: "WebGL Warning Fired",
  /**
   * @description Text in the Event Listener Breakpoints Panel of the JavaScript Debugger in the Sources Panel
   */
  setInnerhtml: "Set `innerHTML`",
  /**
   * @description Name of a breakpoint type in the Sources Panel.
   */
  createCanvasContext: "Create canvas context",
  /**
   * @description Name of a breakpoint type in the Sources Panel.
   */
  createAudiocontext: "Create `AudioContext`",
  /**
   * @description Name of a breakpoint type in the Sources Panel. Close is a verb.
   */
  closeAudiocontext: "Close `AudioContext`",
  /**
   * @description Name of a breakpoint type in the Sources Panel. Resume is a verb.
   */
  resumeAudiocontext: "Resume `AudioContext`",
  /**
   * @description Name of a breakpoint type in the Sources Panel.
   */
  suspendAudiocontext: "Suspend `AudioContext`",
  /**
   * @description Noun. Title for a checkbox that turns on breakpoints on Trusted Type sink violations.
   * "Trusted Types" is a Web API. A "Sink" (Noun, singular) is a special function, akin to a data sink, that expects
   * to receive data in a specific format. Should the data be in the wrong format, or something else
   * go wrong, its called a "sink violation".
   */
  sinkViolations: "Sink Violations",
  /**
   * @description Title for a checkbox that turns on breakpoints on Trusted Type policy violations
   */
  policyViolations: "Policy Violations"
};
var str_6 = i18n12.i18n.registerUIStrings("panels/sources/CategorizedBreakpointL10n.ts", UIStrings6);
var i18nLazyString = i18n12.i18n.getLazilyComputedLocalizedString.bind(void 0, str_6);
function getLocalizedBreakpointName(name) {
  const l10nLazyName = LOCALIZED_NAMES.get(name) ?? i18n12.i18n.lockedLazyString(name);
  return l10nLazyName();
}
var LOCALIZED_INSTRUMENTATION_NAMES = {
  [
    "beforeBidderWorkletBiddingStart"
    /* SDK.EventBreakpointsModel.InstrumentationNames.BEFORE_BIDDER_WORKLET_BIDDING_START */
  ]: i18nLazyString(UIStrings6.beforeBidderWorkletBiddingStart),
  [
    "beforeBidderWorkletReportingStart"
    /* SDK.EventBreakpointsModel.InstrumentationNames.BEFORE_BIDDER_WORKLET_REPORTING_START */
  ]: i18nLazyString(UIStrings6.beforeBidderWorkletReportingStart),
  [
    "beforeSellerWorkletScoringStart"
    /* SDK.EventBreakpointsModel.InstrumentationNames.BEFORE_SELLER_WORKLET_SCORING_START */
  ]: i18nLazyString(UIStrings6.beforeSellerWorkletScoringStart),
  [
    "beforeSellerWorkletReportingStart"
    /* SDK.EventBreakpointsModel.InstrumentationNames.BEFORE_SELLER_WORKLET_REPORTING_START */
  ]: i18nLazyString(UIStrings6.beforeSellerWorkletReportingStart),
  [
    "setTimeout"
    /* SDK.EventBreakpointsModel.InstrumentationNames.SET_TIMEOUT */
  ]: i18n12.i18n.lockedLazyString("setTimeout"),
  [
    "clearTimeout"
    /* SDK.EventBreakpointsModel.InstrumentationNames.CLEAR_TIMEOUT */
  ]: i18n12.i18n.lockedLazyString("clearTimeout"),
  [
    "setTimeout.callback"
    /* SDK.EventBreakpointsModel.InstrumentationNames.SET_TIMEOUT_CALLBACK */
  ]: i18nLazyString(UIStrings6.setTimeoutOrIntervalFired, { PH1: "setTimeout" }),
  [
    "setInterval"
    /* SDK.EventBreakpointsModel.InstrumentationNames.SET_INTERVAL */
  ]: i18n12.i18n.lockedLazyString("setInterval"),
  [
    "clearInterval"
    /* SDK.EventBreakpointsModel.InstrumentationNames.CLEAR_INTERVAL */
  ]: i18n12.i18n.lockedLazyString("clearInterval"),
  [
    "setInterval.callback"
    /* SDK.EventBreakpointsModel.InstrumentationNames.SET_INTERVAL_CALLBACK */
  ]: i18nLazyString(UIStrings6.setTimeoutOrIntervalFired, { PH1: "setInterval" }),
  [
    "scriptFirstStatement"
    /* SDK.EventBreakpointsModel.InstrumentationNames.SCRIPT_FIRST_STATEMENT */
  ]: i18nLazyString(UIStrings6.scriptFirstStatement),
  [
    "scriptBlockedByCSP"
    /* SDK.EventBreakpointsModel.InstrumentationNames.SCRIPT_BLOCKED_BY_CSP */
  ]: i18nLazyString(UIStrings6.scriptBlockedByContentSecurity),
  [
    "sharedStorageWorkletScriptFirstStatement"
    /* SDK.EventBreakpointsModel.InstrumentationNames.SHARED_STORAGE_WORKLET_SCRIPT_FIRST_STATEMENT */
  ]: i18nLazyString(UIStrings6.scriptFirstStatement),
  [
    "requestAnimationFrame"
    /* SDK.EventBreakpointsModel.InstrumentationNames.REQUEST_ANIMATION_FRAME */
  ]: i18nLazyString(UIStrings6.requestAnimationFrame),
  [
    "cancelAnimationFrame"
    /* SDK.EventBreakpointsModel.InstrumentationNames.CANCEL_ANIMATION_FRAME */
  ]: i18nLazyString(UIStrings6.cancelAnimationFrame),
  [
    "requestAnimationFrame.callback"
    /* SDK.EventBreakpointsModel.InstrumentationNames.REQUEST_ANIMATION_FRAME_CALLBACK */
  ]: i18nLazyString(UIStrings6.animationFrameFired),
  [
    "webglErrorFired"
    /* SDK.EventBreakpointsModel.InstrumentationNames.WEBGL_ERROR_FIRED */
  ]: i18nLazyString(UIStrings6.webglErrorFired),
  [
    "webglWarningFired"
    /* SDK.EventBreakpointsModel.InstrumentationNames.WEBGL_WARNING_FIRED */
  ]: i18nLazyString(UIStrings6.webglWarningFired),
  [
    "Element.setInnerHTML"
    /* SDK.EventBreakpointsModel.InstrumentationNames.ELEMENT_SET_INNER_HTML */
  ]: i18nLazyString(UIStrings6.setInnerhtml),
  [
    "canvasContextCreated"
    /* SDK.EventBreakpointsModel.InstrumentationNames.CANVAS_CONTEXT_CREATED */
  ]: i18nLazyString(UIStrings6.createCanvasContext),
  [
    "Geolocation.getCurrentPosition"
    /* SDK.EventBreakpointsModel.InstrumentationNames.GEOLOCATION_GET_CURRENT_POSITION */
  ]: i18n12.i18n.lockedLazyString("getCurrentPosition"),
  [
    "Geolocation.watchPosition"
    /* SDK.EventBreakpointsModel.InstrumentationNames.GEOLOCATION_WATCH_POSITION */
  ]: i18n12.i18n.lockedLazyString("watchPosition"),
  [
    "Notification.requestPermission"
    /* SDK.EventBreakpointsModel.InstrumentationNames.NOTIFICATION_REQUEST_PERMISSION */
  ]: i18n12.i18n.lockedLazyString("requestPermission"),
  [
    "DOMWindow.close"
    /* SDK.EventBreakpointsModel.InstrumentationNames.DOM_WINDOW_CLOSE */
  ]: i18n12.i18n.lockedLazyString("window.close"),
  [
    "Document.write"
    /* SDK.EventBreakpointsModel.InstrumentationNames.DOCUMENT_WRITE */
  ]: i18n12.i18n.lockedLazyString("document.write"),
  [
    "audioContextCreated"
    /* SDK.EventBreakpointsModel.InstrumentationNames.AUDIO_CONTEXT_CREATED */
  ]: i18nLazyString(UIStrings6.createAudiocontext),
  [
    "audioContextClosed"
    /* SDK.EventBreakpointsModel.InstrumentationNames.AUDIO_CONTEXT_CLOSED */
  ]: i18nLazyString(UIStrings6.closeAudiocontext),
  [
    "audioContextResumed"
    /* SDK.EventBreakpointsModel.InstrumentationNames.AUDIO_CONTEXT_RESUMED */
  ]: i18nLazyString(UIStrings6.resumeAudiocontext),
  [
    "audioContextSuspended"
    /* SDK.EventBreakpointsModel.InstrumentationNames.AUDIO_CONTEXT_SUSPENDED */
  ]: i18nLazyString(UIStrings6.suspendAudiocontext)
};
var LOCALIZED_CSP_VIOLATION_TYPES = {
  [
    "trustedtype-policy-violation"
    /* Protocol.DOMDebugger.CSPViolationType.TrustedtypePolicyViolation */
  ]: i18nLazyString(UIStrings6.policyViolations),
  [
    "trustedtype-sink-violation"
    /* Protocol.DOMDebugger.CSPViolationType.TrustedtypeSinkViolation */
  ]: i18nLazyString(UIStrings6.sinkViolations)
};
var LOCALIZED_NAMES = new Map([
  ...Object.entries(LOCALIZED_INSTRUMENTATION_NAMES),
  ...Object.entries(LOCALIZED_CSP_VIOLATION_TYPES)
]);

// gen/front_end/panels/sources/CoveragePlugin.js
var CoveragePlugin_exports = {};
__export(CoveragePlugin_exports, {
  CoveragePlugin: () => CoveragePlugin
});
import * as i18n14 from "./../../core/i18n/i18n.js";
import * as SDK5 from "./../../core/sdk/sdk.js";
import * as TextUtils2 from "./../../models/text_utils/text_utils.js";
import * as CodeMirror2 from "./../../third_party/codemirror.next/codemirror.next.js";
import * as SourceFrame5 from "./../../ui/legacy/components/source_frame/source_frame.js";
import * as UI7 from "./../../ui/legacy/legacy.js";
import * as Coverage from "./../coverage/coverage.js";
var UIStrings7 = {
  /**
   * @description Text for Coverage Status Bar Item in Sources Panel
   */
  clickToShowCoveragePanel: "Click to show Coverage Panel",
  /**
   * @description Text for Coverage Status Bar Item in Sources Panel
   */
  showDetails: "Show Details",
  /**
   * @description Text to show in the status bar if coverage data is available
   * @example {12.3} PH1
   */
  coverageS: "Coverage: {PH1}",
  /**
   * @description Text to be shown in the status bar if no coverage data is available
   */
  coverageNa: "Coverage: n/a"
};
var str_7 = i18n14.i18n.registerUIStrings("panels/sources/CoveragePlugin.ts", UIStrings7);
var i18nString6 = i18n14.i18n.getLocalizedString.bind(void 0, str_7);
var CoveragePlugin = class extends Plugin {
  originalSourceCode;
  infoInToolbar;
  model;
  coverage;
  #transformer;
  constructor(uiSourceCode, transformer) {
    super(uiSourceCode);
    this.originalSourceCode = this.uiSourceCode;
    this.#transformer = transformer;
    this.infoInToolbar = new UI7.Toolbar.ToolbarButton(i18nString6(UIStrings7.clickToShowCoveragePanel), void 0, void 0, "debugger.show-coverage");
    this.infoInToolbar.setSecondary();
    this.infoInToolbar.addEventListener("Click", () => {
      void UI7.ViewManager.ViewManager.instance().showView("coverage");
    });
    const mainTarget = SDK5.TargetManager.TargetManager.instance().primaryPageTarget();
    if (mainTarget) {
      this.model = mainTarget.model(Coverage.CoverageModel.CoverageModel);
      if (this.model) {
        this.model.addEventListener(Coverage.CoverageModel.Events.CoverageReset, this.handleReset, this);
        this.coverage = this.model.getCoverageForUrl(this.originalSourceCode.url());
        if (this.coverage) {
          this.coverage.addEventListener(Coverage.CoverageModel.URLCoverageInfo.Events.SizesChanged, this.handleCoverageSizesChanged, this);
        }
      }
    }
    this.updateStats();
  }
  dispose() {
    if (this.coverage) {
      this.coverage.removeEventListener(Coverage.CoverageModel.URLCoverageInfo.Events.SizesChanged, this.handleCoverageSizesChanged, this);
    }
    if (this.model) {
      this.model.removeEventListener(Coverage.CoverageModel.Events.CoverageReset, this.handleReset, this);
    }
  }
  static accepts(uiSourceCode) {
    return uiSourceCode.contentType().isDocumentOrScriptOrStyleSheet();
  }
  handleReset() {
    this.coverage = null;
    this.updateStats();
  }
  handleCoverageSizesChanged() {
    this.updateStats();
  }
  updateStats() {
    if (this.coverage) {
      this.infoInToolbar.setTitle(i18nString6(UIStrings7.showDetails));
      const formatter = new Intl.NumberFormat(i18n14.DevToolsLocale.DevToolsLocale.instance().locale, {
        style: "percent",
        maximumFractionDigits: 1
      });
      this.infoInToolbar.setText(i18nString6(UIStrings7.coverageS, { PH1: formatter.format(this.coverage.usedPercentage()) }));
    } else {
      this.infoInToolbar.setTitle(i18nString6(UIStrings7.clickToShowCoveragePanel));
      this.infoInToolbar.setText(i18nString6(UIStrings7.coverageNa));
    }
  }
  rightToolbarItems() {
    return [this.infoInToolbar];
  }
  editorExtension() {
    return coverageCompartment.of([]);
  }
  getCoverageManager() {
    return this.uiSourceCode.getDecorationData(
      "coverage"
      /* SourceFrame.SourceFrame.DecoratorType.COVERAGE */
    );
  }
  editorInitialized(editor) {
    if (this.getCoverageManager()) {
      this.startDecoUpdate(editor);
    }
  }
  decorationChanged(type, editor) {
    if (type === "coverage") {
      this.startDecoUpdate(editor);
    }
  }
  startDecoUpdate(editor) {
    const manager = this.getCoverageManager();
    void (manager ? manager.usageByLine(this.uiSourceCode, this.#editorLines(editor)) : Promise.resolve([])).then((usageByLine) => {
      const enabled = Boolean(editor.state.field(coverageState, false));
      if (!usageByLine.length) {
        if (enabled) {
          editor.dispatch({ effects: coverageCompartment.reconfigure([]) });
        }
      } else if (!enabled) {
        editor.dispatch({
          effects: coverageCompartment.reconfigure([
            coverageState.init((state) => markersFromCoverageData(usageByLine, state)),
            coverageGutter(this.uiSourceCode.url()),
            theme
          ])
        });
      } else {
        editor.dispatch({ effects: setCoverageState.of(usageByLine) });
      }
    });
  }
  /**
   * @returns The current lines of the CodeMirror editor expressed in terms of UISourceCode.
   */
  #editorLines(editor) {
    const result = [];
    for (let n = 1; n <= editor.state.doc.lines; ++n) {
      const line = editor.state.doc.line(n);
      const { lineNumber: startLine, columnNumber: startColumn } = this.#transformer.editorLocationToUILocation(n - 1, 0);
      const { lineNumber: endLine, columnNumber: endColumn } = this.#transformer.editorLocationToUILocation(n - 1, line.length);
      result.push(new TextUtils2.TextRange.TextRange(startLine, startColumn, endLine, endColumn));
    }
    return result;
  }
};
var coveredMarker = new class extends CodeMirror2.GutterMarker {
  elementClass = "cm-coverageUsed";
}();
var notCoveredMarker = new class extends CodeMirror2.GutterMarker {
  elementClass = "cm-coverageUnused";
}();
function markersFromCoverageData(usageByLine, state) {
  const builder = new CodeMirror2.RangeSetBuilder();
  for (let line = 0; line < usageByLine.length; line++) {
    const usage = usageByLine[line];
    if (usage !== void 0 && line < state.doc.lines) {
      const lineStart = state.doc.line(line + 1).from;
      builder.add(lineStart, lineStart, usage ? coveredMarker : notCoveredMarker);
    }
  }
  return builder.finish();
}
var setCoverageState = CodeMirror2.StateEffect.define();
var coverageState = CodeMirror2.StateField.define({
  create() {
    return CodeMirror2.RangeSet.empty;
  },
  update(markers, tr) {
    return tr.effects.reduce((markers2, effect) => {
      return effect.is(setCoverageState) ? markersFromCoverageData(effect.value, tr.state) : markers2;
    }, markers.map(tr.changes));
  }
});
function coverageGutter(url) {
  return CodeMirror2.gutter({
    markers: (view) => view.state.field(coverageState),
    domEventHandlers: {
      click() {
        void UI7.ViewManager.ViewManager.instance().showView("coverage").then(() => {
          const view = UI7.ViewManager.ViewManager.instance().view("coverage");
          return view?.widget();
        }).then((widget) => {
          const matchFormattedSuffix = url.match(/(.*):formatted$/);
          const urlWithoutFormattedSuffix = matchFormattedSuffix?.[1] || url;
          widget.selectCoverageItemByUrl(urlWithoutFormattedSuffix);
        });
        return true;
      }
    },
    class: "cm-coverageGutter"
  });
}
var coverageCompartment = new CodeMirror2.Compartment();
var theme = CodeMirror2.EditorView.baseTheme({
  ".cm-line::selection": {
    backgroundColor: "transparent",
    color: "currentColor"
  },
  ".cm-coverageGutter": {
    width: "5px",
    marginLeft: "3px"
  },
  ".cm-coverageUnused": {
    backgroundColor: "var(--app-color-coverage-unused)"
  },
  ".cm-coverageUsed": {
    backgroundColor: "var(--app-color-coverage-used)"
  }
});

// gen/front_end/panels/sources/CSSPlugin.js
var CSSPlugin_exports = {};
__export(CSSPlugin_exports, {
  CSSPlugin: () => CSSPlugin,
  cssBindings: () => cssBindings
});
import * as Common5 from "./../../core/common/common.js";
import * as i18n16 from "./../../core/i18n/i18n.js";
import { assertNotNullOrUndefined as assertNotNullOrUndefined3 } from "./../../core/platform/platform.js";
import * as SDK6 from "./../../core/sdk/sdk.js";
import * as Bindings3 from "./../../models/bindings/bindings.js";
import * as Geometry from "./../../models/geometry/geometry.js";
import * as Workspace5 from "./../../models/workspace/workspace.js";
import * as CodeMirror3 from "./../../third_party/codemirror.next/codemirror.next.js";
import * as IconButton3 from "./../../ui/components/icon_button/icon_button.js";
import * as ColorPicker from "./../../ui/legacy/components/color_picker/color_picker.js";
import * as InlineEditor from "./../../ui/legacy/components/inline_editor/inline_editor.js";
import * as UI8 from "./../../ui/legacy/legacy.js";
import * as VisualLogging5 from "./../../ui/visual_logging/visual_logging.js";
var UIStrings8 = {
  /**
   * @description Swatch icon element title in CSSPlugin of the Sources panel
   */
  openColorPicker: "Open color picker.",
  /**
   * @description Text to open the cubic bezier editor
   */
  openCubicBezierEditor: "Open cubic bezier editor.",
  /**
   * @description Text for a context menu item for attaching a sourcemap to the currently open css file
   */
  addSourceMap: "Add source map\u2026"
};
var str_8 = i18n16.i18n.registerUIStrings("panels/sources/CSSPlugin.ts", UIStrings8);
var i18nString7 = i18n16.i18n.getLocalizedString.bind(void 0, str_8);
var doNotCompleteIn = /* @__PURE__ */ new Set(["ColorLiteral", "NumberLiteral", "StringLiteral", "Comment", "Important"]);
function findPropertyAt(node, pos) {
  if (doNotCompleteIn.has(node.name)) {
    return null;
  }
  for (let cur = node; cur; cur = cur.parent) {
    if (cur.name === "StyleSheet" || cur.name === "Styles" || cur.name === "CallExpression") {
      break;
    } else if (cur.name === "Declaration") {
      const name = cur.getChild("PropertyName"), colon = cur.getChild(":");
      return name && colon && colon.to <= pos ? name : null;
    }
  }
  return null;
}
function getCurrentStyleSheet(url, cssModel) {
  const currentStyleSheet = cssModel.getStyleSheetIdsForURL(url);
  if (currentStyleSheet.length === 0) {
    throw new Error("Can't find style sheet ID for current URL");
  }
  return currentStyleSheet[0];
}
async function specificCssCompletion(cx, uiSourceCode, cssModel) {
  const node = CodeMirror3.syntaxTree(cx.state).resolveInner(cx.pos, -1);
  if (node.name === "ClassName") {
    assertNotNullOrUndefined3(cssModel);
    const currentStyleSheet = getCurrentStyleSheet(uiSourceCode.url(), cssModel);
    const existingClassNames = await cssModel.getClassNames(currentStyleSheet);
    return {
      from: node.from,
      options: existingClassNames.map((value2) => ({ type: "constant", label: value2 }))
    };
  }
  const property = findPropertyAt(node, cx.pos);
  if (property) {
    const propertyValues = SDK6.CSSMetadata.cssMetadata().getPropertyValues(cx.state.sliceDoc(property.from, property.to));
    return {
      from: node.name === "ValueName" ? node.from : cx.pos,
      options: propertyValues.map((value2) => ({ type: "constant", label: value2 })),
      validFor: /^[\w\P{ASCII}\-]+$/u
    };
  }
  return null;
}
function findColorsAndCurves(state, from, to, onColor, onCurve) {
  let line = state.doc.lineAt(from);
  function getToken(from2, to2) {
    if (from2 >= line.to) {
      line = state.doc.lineAt(from2);
    }
    return line.text.slice(from2 - line.from, to2 - line.from);
  }
  const tree = CodeMirror3.ensureSyntaxTree(state, to, 100);
  if (!tree) {
    return;
  }
  tree.iterate({
    from,
    to,
    enter: (node) => {
      let content;
      if (node.name === "ValueName" || node.name === "ColorLiteral") {
        content = getToken(node.from, node.to);
      } else if (node.name === "Callee" && /^(?:(?:rgba?|hsla?|hwba?|lch|oklch|lab|oklab|color)|cubic-bezier)$/.test(getToken(node.from, node.to))) {
        content = state.sliceDoc(node.from, node.node.parent.to);
      }
      if (content) {
        const parsedColor = Common5.Color.parse(content);
        if (parsedColor) {
          onColor(node.from, parsedColor, content);
        } else {
          const parsedCurve = Geometry.CubicBezier.parse(content);
          if (parsedCurve) {
            onCurve(node.from, parsedCurve, content);
          }
        }
      }
    }
  });
}
var ColorSwatchWidget = class extends CodeMirror3.WidgetType {
  #text;
  #color;
  #from;
  constructor(color, text, from) {
    super();
    this.#color = color;
    this.#text = text;
    this.#from = from;
  }
  eq(other) {
    return this.#color.equal(other.#color) && this.#text === other.#text && this.#from === other.#from;
  }
  toDOM(view) {
    const swatch = new InlineEditor.ColorSwatch.ColorSwatch(i18nString7(UIStrings8.openColorPicker));
    swatch.renderColor(this.#color);
    const value2 = swatch.createChild("span");
    value2.textContent = this.#text;
    value2.setAttribute("hidden", "true");
    swatch.addEventListener(InlineEditor.ColorSwatch.ColorChangedEvent.eventName, (event) => {
      const insert = event.data.color.getAuthoredText() ?? event.data.color.asString();
      view.dispatch({ changes: { from: this.#from, to: this.#from + this.#text.length, insert } });
      this.#text = insert;
      this.#color = swatch.getColor();
    });
    swatch.addEventListener(InlineEditor.ColorSwatch.ColorFormatChangedEvent.eventName, (event) => {
      const insert = event.data.color.getAuthoredText() ?? event.data.color.asString();
      view.dispatch({ changes: { from: this.#from, to: this.#from + this.#text.length, insert } });
      this.#text = insert;
      this.#color = swatch.getColor();
    });
    swatch.addEventListener(InlineEditor.ColorSwatch.ClickEvent.eventName, (event) => {
      event.consume(true);
      view.dispatch({
        effects: setTooltip.of({
          type: 0,
          pos: view.posAtDOM(swatch),
          text: this.#text,
          swatch,
          color: this.#color
        })
      });
    });
    return swatch;
  }
  ignoreEvent() {
    return true;
  }
};
var CurveSwatchWidget = class extends CodeMirror3.WidgetType {
  curve;
  text;
  constructor(curve, text) {
    super();
    this.curve = curve;
    this.text = text;
  }
  eq(other) {
    return this.curve.asCSSText() === other.curve.asCSSText() && this.text === other.text;
  }
  toDOM(view) {
    const container = document.createElement("span");
    const bezierText = container.createChild("span");
    const icon = IconButton3.Icon.create("bezier-curve-filled", "bezier-swatch-icon");
    icon.setAttribute("jslog", `${VisualLogging5.showStyleEditor("bezier")}`);
    bezierText.append(this.text);
    UI8.Tooltip.Tooltip.install(icon, i18nString7(UIStrings8.openCubicBezierEditor));
    icon.addEventListener("click", (event) => {
      event.consume(true);
      view.dispatch({
        effects: setTooltip.of({
          type: 1,
          pos: view.posAtDOM(icon),
          text: this.text,
          swatch: icon,
          curve: this.curve
        })
      });
    }, false);
    return icon;
  }
  ignoreEvent() {
    return true;
  }
};
function createCSSTooltip(active) {
  return {
    pos: active.pos,
    arrow: false,
    create(view) {
      let text = active.text;
      let widget, addListener;
      if (active.type === 0) {
        const spectrum = new ColorPicker.Spectrum.Spectrum();
        addListener = (handler) => {
          spectrum.addEventListener("ColorChanged", handler);
        };
        spectrum.addEventListener("SizeChanged", () => view.requestMeasure());
        spectrum.setColor(active.color);
        widget = spectrum;
      } else {
        const spectrum = new InlineEditor.BezierEditor.BezierEditor(active.curve);
        widget = spectrum;
        addListener = (handler) => {
          spectrum.addEventListener("BezierChanged", handler);
        };
      }
      const dom = document.createElement("div");
      dom.className = "cm-tooltip-swatchEdit";
      widget.markAsRoot();
      widget.show(dom);
      widget.showWidget();
      widget.element.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          event.consume();
          view.dispatch({
            effects: setTooltip.of(null),
            changes: text === active.text ? void 0 : { from: active.pos, to: active.pos + text.length, insert: active.text }
          });
          widget.hideWidget();
          view.focus();
        }
      });
      widget.element.addEventListener("focusout", (event) => {
        if (event.relatedTarget && !widget.element.contains(event.relatedTarget)) {
          view.dispatch({ effects: setTooltip.of(null) });
          widget.hideWidget();
        }
      }, false);
      widget.element.addEventListener("mousedown", (event) => event.consume());
      return {
        dom,
        resize: false,
        offset: { x: -8, y: 0 },
        mount: () => {
          widget.focus();
          widget.wasShown();
          addListener((event) => {
            view.dispatch({
              changes: { from: active.pos, to: active.pos + text.length, insert: event.data },
              annotations: isSwatchEdit.of(true)
            });
            text = event.data;
          });
        }
      };
    }
  };
}
var setTooltip = CodeMirror3.StateEffect.define();
var isSwatchEdit = CodeMirror3.Annotation.define();
var cssTooltipState = CodeMirror3.StateField.define({
  create() {
    return null;
  },
  update(value2, tr) {
    if ((tr.docChanged || tr.selection) && !tr.annotation(isSwatchEdit)) {
      value2 = null;
    }
    for (const effect of tr.effects) {
      if (effect.is(setTooltip)) {
        value2 = effect.value;
      }
    }
    return value2;
  },
  provide: (field) => CodeMirror3.showTooltip.from(field, (active) => active && createCSSTooltip(active))
});
function computeSwatchDeco(state, from, to) {
  const builder = new CodeMirror3.RangeSetBuilder();
  findColorsAndCurves(state, from, to, (pos, parsedColor, colorText) => {
    builder.add(pos, pos, CodeMirror3.Decoration.widget({ widget: new ColorSwatchWidget(parsedColor, colorText, pos) }));
  }, (pos, curve, text) => {
    builder.add(pos, pos, CodeMirror3.Decoration.widget({ widget: new CurveSwatchWidget(curve, text) }));
  });
  return builder.finish();
}
var cssSwatchPlugin = CodeMirror3.ViewPlugin.fromClass(class {
  decorations;
  constructor(view) {
    this.decorations = computeSwatchDeco(view.state, view.viewport.from, view.viewport.to);
  }
  update(update) {
    if (update.viewportChanged || update.docChanged) {
      this.decorations = computeSwatchDeco(update.state, update.view.viewport.from, update.view.viewport.to);
    }
  }
}, {
  decorations: (v) => v.decorations
});
function cssSwatches() {
  return [cssSwatchPlugin, cssTooltipState, theme2];
}
function getNumberAt(node) {
  if (node.name === "Unit") {
    node = node.parent;
  }
  if (node.name === "NumberLiteral") {
    const lastChild = node.lastChild;
    return { from: node.from, to: lastChild && lastChild.name === "Unit" ? lastChild.from : node.to };
  }
  return null;
}
function modifyUnit(view, by) {
  const { head } = view.state.selection.main;
  const context = CodeMirror3.syntaxTree(view.state).resolveInner(head, -1);
  const numberRange = getNumberAt(context) || getNumberAt(context.resolve(head, 1));
  if (!numberRange) {
    return false;
  }
  const currentNumber = Number(view.state.sliceDoc(numberRange.from, numberRange.to));
  if (isNaN(currentNumber)) {
    return false;
  }
  view.dispatch({
    changes: { from: numberRange.from, to: numberRange.to, insert: String(currentNumber + by) },
    scrollIntoView: true,
    userEvent: "insert.modifyUnit"
  });
  return true;
}
function cssBindings() {
  let currentView = null;
  const listener = UI8.ShortcutRegistry.ShortcutRegistry.instance().getShortcutListener({
    "sources.increment-css": () => Promise.resolve(modifyUnit(currentView, 1)),
    "sources.increment-css-by-ten": () => Promise.resolve(modifyUnit(currentView, 10)),
    "sources.decrement-css": () => Promise.resolve(modifyUnit(currentView, -1)),
    "sources.decrement-css-by-ten": () => Promise.resolve(modifyUnit(currentView, -10))
  });
  return CodeMirror3.EditorView.domEventHandlers({
    keydown: (event, view) => {
      const prevView = currentView;
      currentView = view;
      listener(event);
      currentView = prevView;
      return event.defaultPrevented;
    }
  });
}
var CSSPlugin = class extends Plugin {
  #cssModel;
  constructor(uiSourceCode, _transformer) {
    super(uiSourceCode, _transformer);
    SDK6.TargetManager.TargetManager.instance().observeModels(SDK6.CSSModel.CSSModel, this);
  }
  static accepts(uiSourceCode) {
    return uiSourceCode.contentType().hasStyleSheets();
  }
  modelAdded(cssModel) {
    if (cssModel.target() !== SDK6.TargetManager.TargetManager.instance().primaryPageTarget()) {
      return;
    }
    this.#cssModel = cssModel;
  }
  modelRemoved(cssModel) {
    if (this.#cssModel === cssModel) {
      this.#cssModel = void 0;
    }
  }
  editorExtension() {
    return [cssBindings(), this.#cssCompletion(), cssSwatches()];
  }
  #cssCompletion() {
    const { cssCompletionSource } = CodeMirror3.css;
    const uiSourceCode = this.uiSourceCode;
    const cssModel = this.#cssModel;
    return CodeMirror3.autocompletion({
      override: [async (cx) => {
        return await (await specificCssCompletion(cx, uiSourceCode, cssModel) || cssCompletionSource(cx));
      }]
    });
  }
  populateTextAreaContextMenu(contextMenu) {
    function addSourceMapURL(cssModel2, sourceUrl) {
      const dialog4 = AddDebugInfoURLDialog.createAddSourceMapURLDialog((sourceMapUrl) => {
        Bindings3.CSSWorkspaceBinding.CSSWorkspaceBinding.instance().modelToInfo.get(cssModel2)?.addSourceMap(sourceUrl, sourceMapUrl);
      });
      dialog4.show();
    }
    const cssModel = this.#cssModel;
    const url = this.uiSourceCode.url();
    if (this.uiSourceCode.project().type() === Workspace5.Workspace.projectTypes.Network && cssModel && !Workspace5.IgnoreListManager.IgnoreListManager.instance().isUserIgnoreListedURL(url)) {
      const addSourceMapURLLabel = i18nString7(UIStrings8.addSourceMap);
      contextMenu.debugSection().appendItem(addSourceMapURLLabel, () => addSourceMapURL(cssModel, url), { jslogContext: "add-source-map" });
    }
  }
};
var theme2 = CodeMirror3.EditorView.baseTheme({
  ".cm-tooltip.cm-tooltip-swatchEdit": {
    "box-shadow": "var(--sys-elevation-level2)",
    "background-color": "var(--sys-color-base-container-elevated)",
    "border-radius": "var(--sys-shape-corner-extra-small)"
  }
});

// gen/front_end/panels/sources/DebuggerPausedMessage.js
var DebuggerPausedMessage_exports = {};
__export(DebuggerPausedMessage_exports, {
  BreakpointTypeNouns: () => BreakpointTypeNouns,
  DebuggerPausedMessage: () => DebuggerPausedMessage
});
import * as i18n18 from "./../../core/i18n/i18n.js";
import * as SDK7 from "./../../core/sdk/sdk.js";
import * as IconButton4 from "./../../ui/components/icon_button/icon_button.js";
import * as uiI18n from "./../../ui/i18n/i18n.js";
import * as UI9 from "./../../ui/legacy/legacy.js";
import * as VisualLogging6 from "./../../ui/visual_logging/visual_logging.js";
import * as PanelsCommon from "./../common/common.js";

// gen/front_end/panels/sources/debuggerPausedMessage.css.js
var debuggerPausedMessage_css_default = `/*
 * Copyright 2016 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.paused-status {
  margin: 6px;
  padding: 4px 10px;
  border-radius: 10px;
  background-color: var(--sys-color-yellow-container);
  color: var(--sys-color-on-yellow-container);
}

.paused-status.error-reason {
  background-color: var(--sys-color-surface-error);
  color: var(--sys-color-on-surface-error);
}

.status-main {
  padding-left: 18px;
  position: relative;
}

.status-sub:not(:empty) {
  padding-left: 15px;
  padding-top: 5px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.paused-status.error-reason .status-sub {
  color: var(--sys-color-error);
  line-height: 11px;
  max-height: 27px;
  user-select: text;
}

devtools-icon {
  position: absolute;
  left: -1px;
  top: -1px;
}

/*# sourceURL=${import.meta.resolve("./debuggerPausedMessage.css")} */`;

// gen/front_end/panels/sources/DebuggerPausedMessage.js
var UIStrings9 = {
  /**
   * @description Text in the JavaScript Debugging pane of the Sources pane when a DOM breakpoint is hit
   * @example {conditional breakpoint} PH1
   */
  pausedOnS: "Paused on {PH1}",
  /**
   * @description Text in the JavaScript Debugging pane of the Sources pane when a DOM breakpoint is hit because a child is added to the subtree
   * @example {node} PH1
   */
  childSAdded: "Child {PH1} added",
  /**
   * @description Text in the JavaScript Debugging pane of the Sources pane when a DOM breakpoint is hit because a descendant is added
   * @example {node} PH1
   */
  descendantSAdded: "Descendant {PH1} added",
  /**
   * @description Text in the JavaScript Debugging pane of the Sources pane when a DOM breakpoint is hit because a descendant is removed
   * @example {node} PH1
   */
  descendantSRemoved: "Descendant {PH1} removed",
  /**
   * @description Text in Debugger Paused Message of the Sources panel
   */
  pausedOnEventListener: "Paused on event listener",
  /**
   * @description Text in Debugger Paused Message of the Sources panel
   */
  pausedOnXhrOrFetch: "Paused on XHR or fetch",
  /**
   * @description Text in Debugger Paused Message of the Sources panel
   */
  pausedOnException: "Paused on exception",
  /**
   * @description We pause exactly when the promise rejection is happening, so that the user can see where in the code it comes from.
   * A Promise is a Web API object (https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise),
   * that will either be 'fulfilled' or 'rejected' at some unknown time in the future.
   * The subject of the term is omited but it is "Execution", that is, "Execution was paused on <event>".
   */
  pausedOnPromiseRejection: "Paused on `promise` rejection",
  /**
   * @description Text in Debugger Paused Message of the Sources panel
   */
  pausedOnAssertion: "Paused on assertion",
  /**
   * @description Text in Debugger Paused Message of the Sources panel
   */
  pausedOnDebuggedFunction: "Paused on debugged function",
  /**
   * @description Text in Debugger Paused Message of the Sources panel
   */
  pausedBeforePotentialOutofmemory: "Paused before potential out-of-memory crash",
  /**
   * @description Text in Debugger Paused Message of the Sources panel
   */
  pausedOnCspViolation: "Paused on CSP violation",
  /**
   * @description Text in Debugger Paused Message of the Sources panel specifying cause of break
   */
  trustedTypeSinkViolation: "`Trusted Type` Sink Violation",
  /**
   * @description Text in Debugger Paused Message of the Sources panel specifying cause of break
   */
  trustedTypePolicyViolation: "`Trusted Type` Policy Violation",
  /**
   * @description Text in Debugger Paused Message of the Sources panel
   */
  pausedOnBreakpoint: "Paused on breakpoint",
  /**
   * @description Text in Debugger Paused Message of the Sources panel
   */
  debuggerPaused: "Debugger paused",
  /**
   * @description Text in Debugger Paused Message of the Sources panel
   */
  subtreeModifications: "subtree modifications",
  /**
   * @description Text in Debugger Paused Message of the Sources panel
   */
  attributeModifications: "attribute modifications",
  /**
   * @description Text in Debugger Paused Message of the Sources panel
   */
  nodeRemoval: "node removal",
  /**
   * @description Error message text
   * @example {Snag Error} PH1
   */
  webglErrorFiredS: "WebGL Error Fired ({PH1})",
  /**
   * @description Text in DOMDebugger Model
   * @example {"script-src 'self'"} PH1
   */
  scriptBlockedDueToContent: "Script blocked due to Content Security Policy directive: {PH1}"
};
var str_9 = i18n18.i18n.registerUIStrings("panels/sources/DebuggerPausedMessage.ts", UIStrings9);
var i18nString8 = i18n18.i18n.getLocalizedString.bind(void 0, str_9);
var i18nLazyString2 = i18n18.i18n.getLazilyComputedLocalizedString.bind(void 0, str_9);
var DebuggerPausedMessage = class _DebuggerPausedMessage {
  #element;
  contentElement;
  constructor() {
    this.#element = document.createElement("div");
    this.#element.classList.add("paused-message");
    this.#element.classList.add("flex-none");
    this.#element.setAttribute("jslog", `${VisualLogging6.dialog("debugger-paused")}`);
    const root = UI9.UIUtils.createShadowRootWithCoreStyles(this.#element, { cssFile: debuggerPausedMessage_css_default });
    this.contentElement = root.createChild("div");
    UI9.ARIAUtils.markAsPoliteLiveRegion(this.#element, false);
  }
  element() {
    return this.#element;
  }
  static descriptionWithoutStack(description) {
    const firstCallFrame = /^\s+at\s/m.exec(description);
    return firstCallFrame ? description.substring(0, firstCallFrame.index - 1) : description.substring(0, description.lastIndexOf("\n"));
  }
  static async createDOMBreakpointHitMessage(details) {
    const messageWrapper = document.createElement("span");
    const domDebuggerModel = details.debuggerModel.target().model(SDK7.DOMDebuggerModel.DOMDebuggerModel);
    if (!details.auxData || !domDebuggerModel) {
      return messageWrapper;
    }
    const data = domDebuggerModel.resolveDOMBreakpointData(details.auxData);
    if (!data) {
      return messageWrapper;
    }
    const mainElement = messageWrapper.createChild("div", "status-main");
    const mainIcon = new IconButton4.Icon.Icon();
    mainIcon.name = "info";
    mainIcon.style.color = "var(--sys-color-on-yellow-container)";
    mainIcon.classList.add("medium");
    mainElement.appendChild(mainIcon);
    const breakpointType = BreakpointTypeNouns.get(data.type);
    mainElement.appendChild(document.createTextNode(i18nString8(UIStrings9.pausedOnS, { PH1: breakpointType ? breakpointType() : String(null) })));
    const subElement = messageWrapper.createChild("div", "status-sub monospace");
    const linkifiedNode = PanelsCommon.DOMLinkifier.Linkifier.instance().linkify(data.node);
    subElement.appendChild(linkifiedNode);
    if (data.targetNode) {
      const targetNodeLink = PanelsCommon.DOMLinkifier.Linkifier.instance().linkify(data.targetNode);
      let messageElement;
      if (data.insertion) {
        if (data.targetNode === data.node) {
          messageElement = uiI18n.getFormatLocalizedString(str_9, UIStrings9.childSAdded, { PH1: targetNodeLink });
        } else {
          messageElement = uiI18n.getFormatLocalizedString(str_9, UIStrings9.descendantSAdded, { PH1: targetNodeLink });
        }
      } else {
        messageElement = uiI18n.getFormatLocalizedString(str_9, UIStrings9.descendantSRemoved, { PH1: targetNodeLink });
      }
      subElement.appendChild(document.createElement("br"));
      subElement.appendChild(messageElement);
    }
    return messageWrapper;
  }
  static #findEventNameForUi(detailsAuxData) {
    if (!detailsAuxData) {
      return "";
    }
    const { eventName, webglErrorName, directiveText, targetName } = detailsAuxData;
    if (eventName === "instrumentation:webglErrorFired" && webglErrorName) {
      const errorName = webglErrorName.replace(/^.*(0x[0-9a-f]+).*$/i, "$1");
      return i18nString8(UIStrings9.webglErrorFiredS, { PH1: errorName });
    }
    if (eventName === "instrumentation:scriptBlockedByCSP" && directiveText) {
      return i18nString8(UIStrings9.scriptBlockedDueToContent, { PH1: directiveText });
    }
    let breakpoint = SDK7.EventBreakpointsModel.EventBreakpointsManager.instance().resolveEventListenerBreakpoint(detailsAuxData);
    if (breakpoint) {
      return getLocalizedBreakpointName(breakpoint.name);
    }
    breakpoint = SDK7.DOMDebuggerModel.DOMDebuggerManager.instance().resolveEventListenerBreakpoint(detailsAuxData);
    if (breakpoint && targetName) {
      return targetName + "." + breakpoint.name;
    }
    return breakpoint?.name ?? "";
  }
  async render(details, debuggerWorkspaceBinding, breakpointManager) {
    this.contentElement.removeChildren();
    this.contentElement.hidden = !details;
    if (!details) {
      return;
    }
    const status = this.contentElement.createChild("div", "paused-status");
    const errorLike = details.reason === "exception" || details.reason === "promiseRejection" || details.reason === "assert" || details.reason === "OOM";
    let messageWrapper;
    if (details.reason === "DOM") {
      messageWrapper = await _DebuggerPausedMessage.createDOMBreakpointHitMessage(details);
    } else if (details.reason === "EventListener") {
      const eventNameForUI = _DebuggerPausedMessage.#findEventNameForUi(details.auxData);
      messageWrapper = buildWrapper(i18nString8(UIStrings9.pausedOnEventListener), eventNameForUI);
    } else if (details.reason === "XHR") {
      const auxData = details.auxData;
      messageWrapper = buildWrapper(i18nString8(UIStrings9.pausedOnXhrOrFetch), auxData.url || "");
    } else if (details.reason === "exception") {
      const auxData = details.auxData;
      const description = auxData.description || auxData.value || "";
      const descriptionWithoutStack = _DebuggerPausedMessage.descriptionWithoutStack(description);
      messageWrapper = buildWrapper(i18nString8(UIStrings9.pausedOnException), descriptionWithoutStack, description);
    } else if (details.reason === "promiseRejection") {
      const auxData = details.auxData;
      const description = auxData.description || auxData.value || "";
      const descriptionWithoutStack = _DebuggerPausedMessage.descriptionWithoutStack(description);
      messageWrapper = buildWrapper(i18nString8(UIStrings9.pausedOnPromiseRejection), descriptionWithoutStack, description);
    } else if (details.reason === "assert") {
      messageWrapper = buildWrapper(i18nString8(UIStrings9.pausedOnAssertion));
    } else if (details.reason === "debugCommand") {
      messageWrapper = buildWrapper(i18nString8(UIStrings9.pausedOnDebuggedFunction));
    } else if (details.reason === "OOM") {
      messageWrapper = buildWrapper(i18nString8(UIStrings9.pausedBeforePotentialOutofmemory));
    } else if (details.reason === "CSPViolation" && details.auxData?.["violationType"]) {
      const text = details.auxData["violationType"];
      if (text === "trustedtype-sink-violation") {
        messageWrapper = buildWrapper(i18nString8(UIStrings9.pausedOnCspViolation), i18nString8(UIStrings9.trustedTypeSinkViolation));
      } else if (text === "trustedtype-policy-violation") {
        messageWrapper = buildWrapper(i18nString8(UIStrings9.pausedOnCspViolation), i18nString8(UIStrings9.trustedTypePolicyViolation));
      }
    } else if (details.callFrames.length) {
      const uiLocation = await debuggerWorkspaceBinding.rawLocationToUILocation(details.callFrames[0].location());
      const breakpoint = uiLocation ? breakpointManager.findBreakpoint(uiLocation) : null;
      const defaultText = breakpoint ? i18nString8(UIStrings9.pausedOnBreakpoint) : i18nString8(UIStrings9.debuggerPaused);
      messageWrapper = buildWrapper(defaultText);
    } else {
      console.warn("ScriptsPanel paused, but callFrames.length is zero.");
    }
    status.classList.toggle("error-reason", errorLike);
    if (messageWrapper) {
      status.appendChild(messageWrapper);
    }
    function buildWrapper(mainText, subText, title) {
      const messageWrapper2 = document.createElement("span");
      const mainElement = messageWrapper2.createChild("div", "status-main");
      const mainIcon = new IconButton4.Icon.Icon();
      mainIcon.name = errorLike ? "cross-circle-filled" : "info";
      mainIcon.style.color = errorLike ? "var(--icon-error)" : "var(--sys-color-on-yellow-container)";
      mainIcon.classList.add("medium");
      mainElement.appendChild(mainIcon);
      mainElement.appendChild(document.createTextNode(mainText));
      if (subText) {
        const subElement = messageWrapper2.createChild("div", "status-sub monospace");
        subElement.textContent = subText;
        UI9.Tooltip.Tooltip.install(subElement, title || subText);
      }
      return messageWrapper2;
    }
  }
};
var BreakpointTypeNouns = /* @__PURE__ */ new Map([
  ["subtree-modified", i18nLazyString2(UIStrings9.subtreeModifications)],
  ["attribute-modified", i18nLazyString2(UIStrings9.attributeModifications)],
  ["node-removed", i18nLazyString2(UIStrings9.nodeRemoval)]
]);

// gen/front_end/panels/sources/DebuggerPlugin.js
var DebuggerPlugin_exports = {};
__export(DebuggerPlugin_exports, {
  BreakpointLocationRevealer: () => BreakpointLocationRevealer,
  DebuggerPlugin: () => DebuggerPlugin,
  computePopoverHighlightRange: () => computePopoverHighlightRange,
  computeScopeMappings: () => computeScopeMappings,
  getVariableNamesByLine: () => getVariableNamesByLine,
  getVariableValuesByLine: () => getVariableValuesByLine
});
import * as Common13 from "./../../core/common/common.js";
import * as Host9 from "./../../core/host/host.js";
import * as i18n37 from "./../../core/i18n/i18n.js";
import * as Platform13 from "./../../core/platform/platform.js";
import * as SDK12 from "./../../core/sdk/sdk.js";
import * as Badges2 from "./../../models/badges/badges.js";
import * as Bindings9 from "./../../models/bindings/bindings.js";
import * as Breakpoints3 from "./../../models/breakpoints/breakpoints.js";
import * as Formatter from "./../../models/formatter/formatter.js";
import * as SourceMapScopes2 from "./../../models/source_map_scopes/source_map_scopes.js";
import * as TextUtils9 from "./../../models/text_utils/text_utils.js";
import * as Workspace21 from "./../../models/workspace/workspace.js";
import * as CodeMirror6 from "./../../third_party/codemirror.next/codemirror.next.js";
import * as Buttons3 from "./../../ui/components/buttons/buttons.js";
import * as TextEditor6 from "./../../ui/components/text_editor/text_editor.js";
import * as Tooltips2 from "./../../ui/components/tooltips/tooltips.js";
import * as ObjectUI2 from "./../../ui/legacy/components/object_ui/object_ui.js";
import * as SourceFrame13 from "./../../ui/legacy/components/source_frame/source_frame.js";
import * as UI19 from "./../../ui/legacy/legacy.js";
import { render as render3 } from "./../../ui/lit/lit.js";
import * as VisualLogging12 from "./../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/sources/SourcesPanel.js
var SourcesPanel_exports = {};
__export(SourcesPanel_exports, {
  ActionDelegate: () => ActionDelegate4,
  DebuggerLocationRevealer: () => DebuggerLocationRevealer,
  DebuggerPausedDetailsRevealer: () => DebuggerPausedDetailsRevealer,
  QuickSourceView: () => QuickSourceView,
  RevealingActionDelegate: () => RevealingActionDelegate,
  SourcesPanel: () => SourcesPanel,
  UILocationRangeRevealer: () => UILocationRangeRevealer,
  UILocationRevealer: () => UILocationRevealer,
  UISourceCodeRevealer: () => UISourceCodeRevealer,
  lastModificationTimeout: () => lastModificationTimeout,
  minToolbarWidth: () => minToolbarWidth
});
import "./../../ui/legacy/legacy.js";
import * as Common12 from "./../../core/common/common.js";
import * as Host8 from "./../../core/host/host.js";
import * as i18n35 from "./../../core/i18n/i18n.js";
import * as Platform12 from "./../../core/platform/platform.js";
import * as Root3 from "./../../core/root/root.js";
import * as SDK11 from "./../../core/sdk/sdk.js";
import * as Badges from "./../../models/badges/badges.js";
import * as Bindings8 from "./../../models/bindings/bindings.js";
import * as Breakpoints2 from "./../../models/breakpoints/breakpoints.js";
import * as Workspace19 from "./../../models/workspace/workspace.js";
import * as PanelCommon3 from "./../common/common.js";
import * as ObjectUI from "./../../ui/legacy/components/object_ui/object_ui.js";
import * as SettingsUI from "./../../ui/legacy/components/settings_ui/settings_ui.js";
import * as UI18 from "./../../ui/legacy/legacy.js";
import * as VisualLogging11 from "./../../ui/visual_logging/visual_logging.js";
import * as Snippets4 from "./../snippets/snippets.js";

// gen/front_end/panels/sources/NavigatorView.js
var NavigatorView_exports = {};
__export(NavigatorView_exports, {
  NavigatorFolderTreeElement: () => NavigatorFolderTreeElement,
  NavigatorFolderTreeNode: () => NavigatorFolderTreeNode,
  NavigatorGroupTreeNode: () => NavigatorGroupTreeNode,
  NavigatorRootTreeNode: () => NavigatorRootTreeNode,
  NavigatorSourceTreeElement: () => NavigatorSourceTreeElement,
  NavigatorTreeNode: () => NavigatorTreeNode,
  NavigatorUISourceCodeTreeNode: () => NavigatorUISourceCodeTreeNode,
  NavigatorView: () => NavigatorView,
  Types: () => Types
});
import * as Common8 from "./../../core/common/common.js";
import * as Host4 from "./../../core/host/host.js";
import * as i18n20 from "./../../core/i18n/i18n.js";
import * as Platform6 from "./../../core/platform/platform.js";
import * as Root from "./../../core/root/root.js";
import * as SDK8 from "./../../core/sdk/sdk.js";
import * as Bindings5 from "./../../models/bindings/bindings.js";
import * as Persistence5 from "./../../models/persistence/persistence.js";
import * as TextUtils5 from "./../../models/text_utils/text_utils.js";
import * as Workspace9 from "./../../models/workspace/workspace.js";
import * as Buttons2 from "./../../ui/components/buttons/buttons.js";
import * as IconButton5 from "./../../ui/components/icon_button/icon_button.js";
import * as Spinners from "./../../ui/components/spinners/spinners.js";
import * as UI11 from "./../../ui/legacy/legacy.js";
import * as VisualLogging7 from "./../../ui/visual_logging/visual_logging.js";
import * as Snippets from "./../snippets/snippets.js";
import { PanelUtils } from "./../utils/utils.js";

// gen/front_end/panels/sources/navigatorTree.css.js
var navigatorTree_css_default = `/*
 * Copyright (C) 2006, 2007, 2008 Apple Inc.  All rights reserved.
 * Copyright (C) 2009 Anthony Ricaud <rik@webkit.org>
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * 1.  Redistributions of source code must retain the above copyright
 *     notice, this list of conditions and the following disclaimer.
 * 2.  Redistributions in binary form must reproduce the above copyright
 *     notice, this list of conditions and the following disclaimer in the
 *     documentation and/or other materials provided with the distribution.
 * 3.  Neither the name of Apple Computer, Inc. ("Apple") nor the names of
 *     its contributors may be used to endorse or promote products derived
 *     from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE AND ITS CONTRIBUTORS "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL APPLE OR ITS CONTRIBUTORS BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

.is-ignore-listed {
  .tree-element-title,
  .leading-icons {
    opacity: 40%;
  }
}

.tree-outline li {
  min-height: 20px;
}

.tree-outline li:hover:not(.selected) .selection {
  display: block;
  background-color: var(--sys-color-state-hover-on-subtle);
}

.navigator-fs-folder-tree-item devtools-icon {
  color: var(--icon-folder-workspace);
}

.navigator-automatic-fs-tree-item devtools-icon,
.navigator-fs-tree-item devtools-icon {
  color: var(--icon-file-authored);
}

.navigator-nw-folder-tree-item devtools-icon {
  color: var(--icon-folder-deployed);
}

.navigator-sm-script-tree-item devtools-icon,
.navigator-script-tree-item devtools-icon,
.navigator-snippet-tree-item devtools-icon {
  color: var(--icon-file-script);
}

.navigator-file-tree-item .ai-button-container {
  display: none;
  position: absolute;
  z-index: 999;
  right: var(--sys-size-3);
}

.navigator-file-tree-item:hover .ai-button-container {
  display: inline-flex;
}

.navigator-file-tree-item devtools-icon.dot::before {
  width: 7px;
  height: 7px;
  top: 12px;
  left: 11px;
}

.navigator-file-tree-item:hover:not(.force-white-icons) devtools-icon.dot::before {
  outline-color: var(--icon-gap-hover);
}

.navigator-file-tree-item.selected:not(.force-white-icons) devtools-icon.dot::before {
  outline-color: var(--icon-gap-inactive);
}

.navigator-file-tree-item.selected.force-white-icons devtools-icon.dot::before {
  outline-color: var(--icon-gap-focus-selected);
}

.navigator-sm-stylesheet-tree-item devtools-icon,
.navigator-stylesheet-tree-item devtools-icon {
  color: var(--icon-file-styles);
}

.navigator-image-tree-item devtools-icon,
.navigator-font-tree-item devtools-icon {
  color: var(--icon-file-image);
}

.navigator-nw-folder-tree-item.is-from-source-map devtools-icon {
  color: var(--icon-folder-authored);
}

.navigator-automatic-fs-tree-item {
  & > devtools-button,
  & > devtools-spinner {
    margin-left: var(--sys-size-4);
  }
}

.navigator-fs-tree-item:not(.has-mapped-files),
.navigator-fs-tree-item:not(.has-mapped-files) + ol li {
  & > :not(.selection) {
    color: var(--sys-color-on-surface-subtle);
    opacity: 40%;

    & devtools-icon {
      color: var(--sys-color-on-surface-subtle);
    }
  }
}

.tree-outline:not(:has(.navigator-deployed-tree-item)) .navigator-sm-folder-tree-item .tree-element-title,
.tree-outline:not(:has(.navigator-deployed-tree-item)) .navigator-sm-script-tree-item .tree-element-title,
.tree-outline:not(:has(.navigator-deployed-tree-item)) .navigator-sm-stylesheet-tree-item .tree-element-title {
  font-style: italic;
}

@media (forced-colors: active) {
  .tree-outline li .leading-icons devtools-icon {
    color: ButtonText;
  }

  .tree-outline li:hover:not(.selected) .selection,
  .tree-outline li:hover:not(:has(devtools-checkbox)) .selection {
    forced-color-adjust: none;
    background-color: Highlight;
  }

  .tree-outline:not(.hide-selection-when-blurred) li.parent:hover:not(.selected)::before {
    background-color: HighlightText;
  }

  .tree-outline:not(.hide-selection-when-blurred) li:hover:not(.selected) devtools-icon,
  .tree-outline li:not(.selected):hover .tree-element-title {
    forced-color-adjust: none;
    color: HighlightText;
  }

  .navigator-fs-tree-item:not(.has-mapped-files, .selected) > :not(.selection),
  .navigator-fs-folder-tree-item:not(.has-mapped-files, .selected) > :not(.selection),
  .is-ignore-listed {
    filter: none;
    opacity: 100%;
  }
}

/*# sourceURL=${import.meta.resolve("./navigatorTree.css")} */`;

// gen/front_end/panels/sources/navigatorView.css.js
var navigatorView_css_default = `/*
 * Copyright 2016 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.navigator-toolbar {
  border-bottom: 1px solid var(--sys-color-divider);
  padding-left: 8px;
}

/*# sourceURL=${import.meta.resolve("./navigatorView.css")} */`;

// gen/front_end/panels/sources/SearchSourcesView.js
var SearchSourcesView_exports = {};
__export(SearchSourcesView_exports, {
  ActionDelegate: () => ActionDelegate2,
  Revealer: () => Revealer4,
  SearchSources: () => SearchSources,
  SearchSourcesView: () => SearchSourcesView
});
import * as Common7 from "./../../core/common/common.js";
import * as UI10 from "./../../ui/legacy/legacy.js";
import * as Search from "./../search/search.js";

// gen/front_end/panels/sources/SourcesSearchScope.js
var SourcesSearchScope_exports = {};
__export(SourcesSearchScope_exports, {
  FileBasedSearchResult: () => FileBasedSearchResult,
  SourcesSearchScope: () => SourcesSearchScope
});
import * as Common6 from "./../../core/common/common.js";
import * as Platform4 from "./../../core/platform/platform.js";
import * as Bindings4 from "./../../models/bindings/bindings.js";
import * as Persistence3 from "./../../models/persistence/persistence.js";
import * as TextUtils3 from "./../../models/text_utils/text_utils.js";
import * as Workspace7 from "./../../models/workspace/workspace.js";
var SourcesSearchScope = class _SourcesSearchScope {
  searchId;
  searchResultCandidates;
  searchResultCallback;
  searchFinishedCallback;
  searchConfig;
  constructor() {
    this.searchId = 0;
    this.searchResultCandidates = [];
    this.searchResultCallback = null;
    this.searchFinishedCallback = null;
    this.searchConfig = null;
  }
  static filesComparator(uiSourceCode1, uiSourceCode2) {
    if (uiSourceCode1.isDirty() && !uiSourceCode2.isDirty()) {
      return -1;
    }
    if (!uiSourceCode1.isDirty() && uiSourceCode2.isDirty()) {
      return 1;
    }
    const isFileSystem1 = uiSourceCode1.project().type() === Workspace7.Workspace.projectTypes.FileSystem && !Persistence3.Persistence.PersistenceImpl.instance().binding(uiSourceCode1);
    const isFileSystem2 = uiSourceCode2.project().type() === Workspace7.Workspace.projectTypes.FileSystem && !Persistence3.Persistence.PersistenceImpl.instance().binding(uiSourceCode2);
    if (isFileSystem1 !== isFileSystem2) {
      return isFileSystem1 ? 1 : -1;
    }
    const url1 = uiSourceCode1.url();
    const url2 = uiSourceCode2.url();
    if (url1 && !url2) {
      return -1;
    }
    if (!url1 && url2) {
      return 1;
    }
    return Platform4.StringUtilities.naturalOrderComparator(uiSourceCode1.fullDisplayName(), uiSourceCode2.fullDisplayName());
  }
  static urlComparator(uiSourceCode1, uiSourceCode2) {
    return Platform4.StringUtilities.naturalOrderComparator(uiSourceCode1.url(), uiSourceCode2.url());
  }
  performIndexing(progress) {
    this.stopSearch();
    const projects = this.projects();
    const compositeProgress = new Common6.Progress.CompositeProgress(progress);
    for (let i = 0; i < projects.length; ++i) {
      const project = projects[i];
      const projectProgress = compositeProgress.createSubProgress([...project.uiSourceCodes()].length);
      project.indexContent(projectProgress);
    }
  }
  projects() {
    const searchInAnonymousAndContentScripts = Common6.Settings.Settings.instance().moduleSetting("search-in-anonymous-and-content-scripts").get();
    const localOverridesEnabled = Common6.Settings.Settings.instance().moduleSetting("persistence-network-overrides-enabled").get();
    return Workspace7.Workspace.WorkspaceImpl.instance().projects().filter((project) => {
      if (project.type() === Workspace7.Workspace.projectTypes.Service) {
        return false;
      }
      if (!searchInAnonymousAndContentScripts && project.isServiceProject() && project.type() !== Workspace7.Workspace.projectTypes.Formatter) {
        return false;
      }
      if (!searchInAnonymousAndContentScripts && project.type() === Workspace7.Workspace.projectTypes.ContentScripts) {
        return false;
      }
      if (!localOverridesEnabled && project.type() === Workspace7.Workspace.projectTypes.FileSystem) {
        return false;
      }
      return true;
    });
  }
  performSearch(searchConfig, progress, searchResultCallback, searchFinishedCallback) {
    this.stopSearch();
    this.searchResultCandidates = [];
    this.searchResultCallback = searchResultCallback;
    this.searchFinishedCallback = searchFinishedCallback;
    this.searchConfig = searchConfig;
    const promises = [];
    const compositeProgress = new Common6.Progress.CompositeProgress(progress);
    const searchContentProgress = compositeProgress.createSubProgress();
    const findMatchingFilesProgress = new Common6.Progress.CompositeProgress(compositeProgress.createSubProgress());
    for (const project of this.projects()) {
      const weight = [...project.uiSourceCodes()].length;
      const findMatchingFilesInProjectProgress = findMatchingFilesProgress.createSubProgress(weight);
      const filesMatchingFileQuery = this.projectFilesMatchingFileQuery(project, searchConfig);
      const promise = project.findFilesMatchingSearchRequest(searchConfig, filesMatchingFileQuery, findMatchingFilesInProjectProgress).then(this.processMatchingFilesForProject.bind(this, this.searchId, project, searchConfig, filesMatchingFileQuery));
      promises.push(promise);
    }
    void Promise.all(promises).then(this.processMatchingFiles.bind(this, this.searchId, searchContentProgress, this.searchFinishedCallback.bind(this, true)));
  }
  projectFilesMatchingFileQuery(project, searchConfig, dirtyOnly) {
    const result = [];
    for (const uiSourceCode of project.uiSourceCodes()) {
      if (!uiSourceCode.contentType().isTextType()) {
        continue;
      }
      if (Workspace7.IgnoreListManager.IgnoreListManager.instance().isUserOrSourceMapIgnoreListedUISourceCode(uiSourceCode)) {
        continue;
      }
      const binding = Persistence3.Persistence.PersistenceImpl.instance().binding(uiSourceCode);
      if (binding && binding.network === uiSourceCode) {
        continue;
      }
      if (dirtyOnly && !uiSourceCode.isDirty()) {
        continue;
      }
      if (searchConfig.filePathMatchesFileQuery(uiSourceCode.fullDisplayName())) {
        result.push(uiSourceCode);
      }
    }
    result.sort(_SourcesSearchScope.urlComparator);
    return result;
  }
  processMatchingFilesForProject(searchId, project, searchConfig, filesMatchingFileQuery, filesWithPreliminaryResult) {
    if (searchId !== this.searchId && this.searchFinishedCallback) {
      this.searchFinishedCallback(false);
      return;
    }
    let files = [...filesWithPreliminaryResult.keys()];
    files.sort(_SourcesSearchScope.urlComparator);
    files = Platform4.ArrayUtilities.intersectOrdered(files, filesMatchingFileQuery, _SourcesSearchScope.urlComparator);
    const dirtyFiles = this.projectFilesMatchingFileQuery(project, searchConfig, true);
    files = Platform4.ArrayUtilities.mergeOrdered(files, dirtyFiles, _SourcesSearchScope.urlComparator);
    const uiSourceCodes = [];
    for (const uiSourceCode of files) {
      const script = Bindings4.DefaultScriptMapping.DefaultScriptMapping.scriptForUISourceCode(uiSourceCode);
      if (script && !script.isAnonymousScript()) {
        continue;
      }
      uiSourceCodes.push(uiSourceCode);
    }
    uiSourceCodes.sort(_SourcesSearchScope.filesComparator);
    this.searchResultCandidates = Platform4.ArrayUtilities.mergeOrdered(this.searchResultCandidates, uiSourceCodes, _SourcesSearchScope.filesComparator);
  }
  processMatchingFiles(searchId, progress, callback) {
    if (searchId !== this.searchId && this.searchFinishedCallback) {
      this.searchFinishedCallback(false);
      return;
    }
    const files = this.searchResultCandidates;
    if (!files.length) {
      progress.done = true;
      callback();
      return;
    }
    progress.totalWork = files.length;
    let fileIndex = 0;
    const maxFileContentRequests = 20;
    let callbacksLeft = 0;
    for (let i = 0; i < maxFileContentRequests && i < files.length; ++i) {
      scheduleSearchInNextFileOrFinish.call(this);
    }
    function searchInNextFile(uiSourceCode) {
      if (uiSourceCode.isDirty()) {
        contentLoaded.call(this, uiSourceCode, new TextUtils3.Text.Text(uiSourceCode.workingCopy()));
      } else {
        void uiSourceCode.requestContentData().then((contentData) => {
          contentLoaded.call(this, uiSourceCode, TextUtils3.ContentData.ContentData.contentDataOrEmpty(contentData).textObj);
        });
      }
    }
    function scheduleSearchInNextFileOrFinish() {
      if (fileIndex >= files.length) {
        if (!callbacksLeft) {
          progress.done = true;
          callback();
          return;
        }
        return;
      }
      ++callbacksLeft;
      const uiSourceCode = files[fileIndex++];
      window.setTimeout(searchInNextFile.bind(this, uiSourceCode), 0);
    }
    function contentLoaded(uiSourceCode, content) {
      ++progress.worked;
      let matches = [];
      const searchConfig = this.searchConfig;
      const queries = searchConfig.queries();
      if (content !== null) {
        for (let i = 0; i < queries.length; ++i) {
          const nextMatches = TextUtils3.TextUtils.performSearchInContent(content, queries[i], !searchConfig.ignoreCase(), searchConfig.isRegex());
          matches = Platform4.ArrayUtilities.mergeOrdered(matches, nextMatches, TextUtils3.ContentProvider.SearchMatch.comparator);
        }
        if (!searchConfig.queries().length) {
          matches = [new TextUtils3.ContentProvider.SearchMatch(0, content.lineAt(0), 0, 0)];
        }
      }
      if (matches && this.searchResultCallback) {
        const searchResult = new FileBasedSearchResult(uiSourceCode, matches);
        this.searchResultCallback(searchResult);
      }
      --callbacksLeft;
      scheduleSearchInNextFileOrFinish.call(this);
    }
  }
  stopSearch() {
    ++this.searchId;
  }
};
var FileBasedSearchResult = class {
  uiSourceCode;
  searchMatches;
  constructor(uiSourceCode, searchMatches) {
    this.uiSourceCode = uiSourceCode;
    this.searchMatches = searchMatches;
  }
  label() {
    return this.uiSourceCode.displayName();
  }
  description() {
    return this.uiSourceCode.fullDisplayName();
  }
  matchesCount() {
    return this.searchMatches.length;
  }
  matchLineContent(index) {
    return this.searchMatches[index].lineContent;
  }
  matchRevealable(index) {
    const { lineNumber, columnNumber, matchLength } = this.searchMatches[index];
    const range = new TextUtils3.TextRange.TextRange(lineNumber, columnNumber, lineNumber, columnNumber + matchLength);
    return new Workspace7.UISourceCode.UILocationRange(this.uiSourceCode, range);
  }
  matchLabel(index) {
    return String(this.searchMatches[index].lineNumber + 1);
  }
  matchColumn(index) {
    return this.searchMatches[index].columnNumber;
  }
  matchLength(index) {
    return this.searchMatches[index].matchLength;
  }
};

// gen/front_end/panels/sources/SearchSourcesView.js
var SearchSources = class {
  query;
  constructor(query) {
    this.query = query;
  }
};
var SearchSourcesView = class extends Search.SearchView.SearchView {
  constructor() {
    super("sources");
  }
  createScope() {
    return new SourcesSearchScope();
  }
};
var ActionDelegate2 = class {
  handleAction(_context, actionId) {
    switch (actionId) {
      case "sources.search": {
        const selection = UI10.InspectorView.InspectorView.instance().element.window().getSelection();
        const query = selection ? selection.toString().replace(/\r?\n.*/, "") : "";
        void Common7.Revealer.reveal(new SearchSources(query));
        return true;
      }
    }
    return false;
  }
};
var Revealer4 = class {
  async reveal({ query }, omitFocus) {
    const viewManager = UI10.ViewManager.ViewManager.instance();
    await viewManager.showView("sources.search-sources-tab", true, omitFocus);
    const searchSourcesView = viewManager.materializedWidget("sources.search-sources-tab");
    if (searchSourcesView instanceof SearchSourcesView) {
      searchSourcesView.toggle(query);
    }
  }
};

// gen/front_end/panels/sources/NavigatorView.js
var UIStrings10 = {
  /**
   * @description Text in Navigator View of the Sources panel
   */
  searchInFolder: "Search in folder",
  /**
   * @description Search label in Navigator View of the Sources panel
   */
  searchInAllFiles: "Search in all files",
  /**
   * @description Text in Navigator View of the Sources panel
   */
  noDomain: "(no domain)",
  /**
   * @description Text in Navigator View of the Sources panel
   */
  authored: "Authored",
  /**
   * @description Text in Navigator View of the Sources panel
   */
  authoredTooltip: "Contains original sources",
  /**
   * @description Text in Navigator View of the Sources panel
   */
  deployed: "Deployed",
  /**
   * @description Text in Navigator View of the Sources panel
   */
  deployedTooltip: "Contains final sources the browser sees",
  /**
   * @description Text in Navigator View of the Sources panel
   */
  excludeThisFolder: "Exclude this folder?",
  /**
   * @description Text in a dialog which appears when users click on 'Exclude from Workspace' menu item
   */
  folderWillNotBeShown: "This folder and its contents will not be shown in workspace.",
  /**
   * @description Text in Navigator View of the Sources panel
   */
  deleteThisFile: "Delete this file?",
  /**
   * @description A context menu item in the Navigator View of the Sources panel
   */
  rename: "Rename\u2026",
  /**
   * @description A context menu item in the Navigator View of the Sources panel
   */
  makeACopy: "Make a copy\u2026",
  /**
   * @description Text to delete something
   */
  delete: "Delete",
  /**
   * @description A button text to confirm an action to remove a folder. This is not the same as delete. It removes the folder from UI but do not delete them.
   */
  remove: "Remove",
  /**
   * @description Text in Navigator View of the Sources panel
   */
  deleteFolder: "Delete this folder and its contents?",
  /**
   * @description Text in Navigator View of the Sources panel. A confirmation message on action to delete a folder or file.
   */
  actionCannotBeUndone: "This action cannot be undone.",
  /**
   * @description A context menu item in the Navigator View of the Sources panel
   */
  openFolder: "Open folder",
  /**
   * @description A context menu item in the Navigator View of the Sources panel
   */
  newFile: "New file",
  /**
   * @description A context menu item in the Navigator View of the Sources panel to exclude a folder from workspace
   */
  excludeFolder: "Exclude from workspace",
  /**
   * @description A context menu item in the Navigator View of the Sources panel
   */
  removeFolderFromWorkspace: "Remove from workspace",
  /**
   * @description Text in Navigator View of the Sources panel
   * @example {a-folder-name} PH1
   */
  areYouSureYouWantToRemoveThis: "Remove \u2018{PH1}\u2019 from Workspace?",
  /**
   * @description Text in Navigator View of the Sources panel. Warning message when user remove a folder.
   */
  workspaceStopSyncing: "This will stop syncing changes from DevTools to your sources.",
  /**
   * @description Name of an item from source map
   * @example {compile.html} PH1
   */
  sFromSourceMap: "{PH1} (from source map)",
  /**
   * @description Name of an item that is on the ignore list
   * @example {compile.html} PH1
   */
  sIgnoreListed: "{PH1} (ignore listed)",
  /**
   * @description Text for the button in the Workspace tab of the Sources panel,
   *              which allows the user to connect automatic workspace folders.
   */
  connect: "Connect",
  /**
   * @description A context menu item in the Workspace tab of the Sources panel, which
   *              shows up for disconnected automatic workspace folders.
   */
  connectFolderToWorkspace: "Connect to workspace"
};
var str_10 = i18n20.i18n.registerUIStrings("panels/sources/NavigatorView.ts", UIStrings10);
var i18nString9 = i18n20.i18n.getLocalizedString.bind(void 0, str_10);
var Types = {
  Authored: "authored",
  AutomaticFileSystem: "automatic-fs",
  Deployed: "deployed",
  Domain: "domain",
  File: "file",
  FileSystem: "fs",
  FileSystemFolder: "fs-folder",
  Frame: "frame",
  NetworkFolder: "nw-folder",
  Root: "root",
  Worker: "worker"
};
var TYPE_ORDERS = /* @__PURE__ */ new Map([
  [Types.Root, 1],
  [Types.Authored, 1],
  [Types.Deployed, 5],
  [Types.Domain, 10],
  [Types.FileSystemFolder, 1],
  [Types.NetworkFolder, 1],
  [Types.File, 10],
  [Types.Frame, 70],
  [Types.Worker, 90],
  [Types.AutomaticFileSystem, 99],
  [Types.FileSystem, 100]
]);
var NavigatorView = class _NavigatorView extends UI11.Widget.VBox {
  placeholder;
  scriptsTree;
  uiSourceCodeNodes;
  subfolderNodes;
  rootNode;
  frameNodes;
  authoredNode;
  deployedNode;
  navigatorGroupByFolderSetting;
  navigatorGroupByAuthoredExperiment;
  #workspace;
  groupByFrame;
  groupByAuthored;
  groupByDomain;
  groupByFolder;
  constructor(jslogContext, enableAuthoredGrouping) {
    super({
      jslog: `${VisualLogging7.pane(jslogContext).track({ resize: true })}`,
      useShadowDom: true
    });
    this.registerRequiredCSS(navigatorView_css_default);
    this.placeholder = null;
    this.scriptsTree = new UI11.TreeOutline.TreeOutlineInShadow(
      "NavigationTree"
      /* UI.TreeOutline.TreeVariant.NAVIGATION_TREE */
    );
    this.scriptsTree.registerRequiredCSS(navigatorTree_css_default);
    this.scriptsTree.setHideOverflow(true);
    this.scriptsTree.setComparator(_NavigatorView.treeElementsCompare);
    this.scriptsTree.setFocusable(false);
    this.contentElement.appendChild(this.scriptsTree.element);
    this.setDefaultFocusedElement(this.scriptsTree.element);
    this.uiSourceCodeNodes = new Platform6.MapUtilities.Multimap();
    this.subfolderNodes = /* @__PURE__ */ new Map();
    this.rootNode = new NavigatorRootTreeNode(this);
    this.rootNode.populate();
    this.frameNodes = /* @__PURE__ */ new Map();
    this.contentElement.addEventListener("contextmenu", this.handleContextMenu.bind(this), false);
    UI11.ShortcutRegistry.ShortcutRegistry.instance().addShortcutListener(this.contentElement, { "sources.rename": this.renameShortcut.bind(this) });
    this.navigatorGroupByFolderSetting = Common8.Settings.Settings.instance().moduleSetting("navigator-group-by-folder");
    this.navigatorGroupByFolderSetting.addChangeListener(this.groupingChanged.bind(this));
    if (enableAuthoredGrouping) {
      this.navigatorGroupByAuthoredExperiment = "authored-deployed-grouping";
    }
    Workspace9.IgnoreListManager.IgnoreListManager.instance().addChangeListener(this.ignoreListChanged.bind(this));
    this.initGrouping();
    Persistence5.Persistence.PersistenceImpl.instance().addEventListener(Persistence5.Persistence.Events.BindingCreated, this.onBindingChanged, this);
    Persistence5.Persistence.PersistenceImpl.instance().addEventListener(Persistence5.Persistence.Events.BindingRemoved, this.onBindingChanged, this);
    Persistence5.NetworkPersistenceManager.NetworkPersistenceManager.instance().addEventListener("RequestsForHeaderOverridesFileChanged", this.#onRequestsForHeaderOverridesFileChanged, this);
    SDK8.TargetManager.TargetManager.instance().addEventListener("NameChanged", this.targetNameChanged, this);
    SDK8.TargetManager.TargetManager.instance().observeTargets(this);
    this.resetWorkspace(Workspace9.Workspace.WorkspaceImpl.instance());
    this.#workspace.uiSourceCodes().forEach(this.addUISourceCode.bind(this));
    Bindings5.NetworkProject.NetworkProjectManager.instance().addEventListener("FrameAttributionAdded", this.frameAttributionAdded, this);
    Bindings5.NetworkProject.NetworkProjectManager.instance().addEventListener("FrameAttributionRemoved", this.frameAttributionRemoved, this);
  }
  static treeElementOrder(treeElement) {
    if (boostOrderForNode.has(treeElement)) {
      return 0;
    }
    const actualElement = treeElement;
    let order = TYPE_ORDERS.get(actualElement.nodeType) || 0;
    if (actualElement.uiSourceCode) {
      const contentType = actualElement.uiSourceCode.contentType();
      if (contentType.isDocument()) {
        order += 3;
      } else if (contentType.isScript()) {
        order += 5;
      } else if (contentType.isStyleSheet()) {
        order += 10;
      } else {
        order += 15;
      }
    }
    return order;
  }
  static appendSearchItem(contextMenu, path) {
    const searchLabel = path ? i18nString9(UIStrings10.searchInFolder) : i18nString9(UIStrings10.searchInAllFiles);
    const searchSources = new SearchSources(path && `file:${path}`);
    contextMenu.viewSection().appendItem(searchLabel, () => Common8.Revealer.reveal(searchSources), { jslogContext: path ? "search-in-folder" : "search-in-all-files" });
  }
  static treeElementsCompare(treeElement1, treeElement2) {
    const typeWeight1 = _NavigatorView.treeElementOrder(treeElement1);
    const typeWeight2 = _NavigatorView.treeElementOrder(treeElement2);
    if (typeWeight1 > typeWeight2) {
      return 1;
    }
    if (typeWeight1 < typeWeight2) {
      return -1;
    }
    return Platform6.StringUtilities.naturalOrderComparator(treeElement1.titleAsText(), treeElement2.titleAsText());
  }
  setPlaceholder(placeholder2) {
    console.assert(!this.placeholder, "A placeholder widget was already set");
    this.placeholder = placeholder2;
    placeholder2.show(this.contentElement, this.contentElement.firstChild);
    updateVisibility.call(this);
    this.scriptsTree.addEventListener(UI11.TreeOutline.Events.ElementAttached, updateVisibility.bind(this));
    this.scriptsTree.addEventListener(UI11.TreeOutline.Events.ElementsDetached, updateVisibility.bind(this));
    function updateVisibility() {
      const showTree = this.scriptsTree.firstChild();
      if (showTree) {
        placeholder2.hideWidget();
      } else {
        placeholder2.showWidget();
      }
      this.scriptsTree.element.classList.toggle("hidden", !showTree);
    }
  }
  onBindingChanged(event) {
    const binding = event.data;
    let isFromSourceMap = false;
    const networkNodes = this.uiSourceCodeNodes.get(binding.network);
    for (const networkNode of networkNodes) {
      networkNode.updateTitle();
      isFromSourceMap ||= networkNode.uiSourceCode().contentType().isFromSourceMap();
    }
    const fileSystemNodes = this.uiSourceCodeNodes.get(binding.fileSystem);
    for (const fileSystemNode of fileSystemNodes) {
      fileSystemNode.updateTitle();
      isFromSourceMap ||= fileSystemNode.uiSourceCode().contentType().isFromSourceMap();
    }
    const pathTokens = Persistence5.FileSystemWorkspaceBinding.FileSystemWorkspaceBinding.relativePath(binding.fileSystem);
    let folderPath = Platform6.DevToolsPath.EmptyEncodedPathString;
    for (let i = 0; i < pathTokens.length - 1; ++i) {
      folderPath = Common8.ParsedURL.ParsedURL.concatenate(folderPath, pathTokens[i]);
      const folderId = this.folderNodeId(binding.fileSystem.project(), null, null, binding.fileSystem.origin(), isFromSourceMap, folderPath);
      const folderNode = this.subfolderNodes.get(folderId);
      if (folderNode) {
        folderNode.updateTitle();
      }
      folderPath = Common8.ParsedURL.ParsedURL.concatenate(folderPath, "/");
    }
    const fileSystemRoot = this.rootOrDeployedNode().child(binding.fileSystem.project().id());
    if (fileSystemRoot) {
      fileSystemRoot.updateTitle();
    }
  }
  #onRequestsForHeaderOverridesFileChanged(event) {
    const headersFileUiSourceCode = event.data;
    const networkNodes = this.uiSourceCodeNodes.get(headersFileUiSourceCode);
    for (const networkNode of networkNodes) {
      networkNode.updateTitle();
    }
  }
  focus() {
    this.scriptsTree.focus();
  }
  /**
   * Central place to add elements to the tree to
   * enable focus if the tree has elements
   */
  appendChild(parent, child) {
    this.scriptsTree.setFocusable(true);
    parent.appendChild(child);
  }
  /**
   * Central place to remove elements from the tree to
   * disable focus if the tree is empty
   */
  removeChild(parent, child) {
    parent.removeChild(child);
    if (this.scriptsTree.rootElement().childCount() === 0) {
      this.scriptsTree.setFocusable(false);
    }
  }
  resetWorkspace(workspace) {
    if (this.#workspace) {
      this.#workspace.removeEventListener(Workspace9.Workspace.Events.UISourceCodeAdded, this.uiSourceCodeAddedCallback, this);
      this.#workspace.removeEventListener(Workspace9.Workspace.Events.UISourceCodeRemoved, this.uiSourceCodeRemovedCallback, this);
      this.#workspace.removeEventListener(Workspace9.Workspace.Events.ProjectAdded, this.projectAddedCallback, this);
      this.#workspace.removeEventListener(Workspace9.Workspace.Events.ProjectRemoved, this.projectRemovedCallback, this);
    }
    this.#workspace = workspace;
    this.#workspace.addEventListener(Workspace9.Workspace.Events.UISourceCodeAdded, this.uiSourceCodeAddedCallback, this);
    this.#workspace.addEventListener(Workspace9.Workspace.Events.UISourceCodeRemoved, this.uiSourceCodeRemovedCallback, this);
    this.#workspace.addEventListener(Workspace9.Workspace.Events.ProjectAdded, this.projectAddedCallback, this);
    this.#workspace.addEventListener(Workspace9.Workspace.Events.ProjectRemoved, this.projectRemovedCallback, this);
    this.#workspace.projects().forEach(this.projectAdded.bind(this));
    this.computeUniqueFileSystemProjectNames();
  }
  projectAddedCallback(event) {
    const project = event.data;
    this.projectAdded(project);
    if (project.type() === Workspace9.Workspace.projectTypes.FileSystem) {
      this.computeUniqueFileSystemProjectNames();
    }
  }
  projectRemovedCallback(event) {
    const project = event.data;
    this.removeProject(project);
    if (project.type() === Workspace9.Workspace.projectTypes.FileSystem) {
      this.computeUniqueFileSystemProjectNames();
    }
  }
  workspace() {
    return this.#workspace;
  }
  acceptProject(project) {
    return !project.isServiceProject();
  }
  frameAttributionAdded(event) {
    const { uiSourceCode } = event.data;
    if (!this.acceptsUISourceCode(uiSourceCode)) {
      return;
    }
    const addedFrame = event.data.frame;
    this.addUISourceCodeNode(uiSourceCode, addedFrame);
  }
  frameAttributionRemoved(event) {
    const { uiSourceCode } = event.data;
    if (!this.acceptsUISourceCode(uiSourceCode)) {
      return;
    }
    const removedFrame = event.data.frame;
    const node = Array.from(this.uiSourceCodeNodes.get(uiSourceCode)).find((node2) => node2.frame() === removedFrame);
    if (node) {
      this.removeUISourceCodeNode(node);
    }
  }
  acceptsUISourceCode(uiSourceCode) {
    return this.acceptProject(uiSourceCode.project());
  }
  addUISourceCode(uiSourceCode) {
    if (Root.Runtime.experiments.isEnabled(
      "just-my-code"
      /* Root.Runtime.ExperimentName.JUST_MY_CODE */
    ) && Workspace9.IgnoreListManager.IgnoreListManager.instance().isUserOrSourceMapIgnoreListedUISourceCode(uiSourceCode)) {
      return;
    }
    if (!this.acceptsUISourceCode(uiSourceCode)) {
      return;
    }
    if (uiSourceCode.isFetchXHR()) {
      return;
    }
    const frames = Bindings5.NetworkProject.NetworkProject.framesForUISourceCode(uiSourceCode);
    if (frames.length) {
      for (const frame of frames) {
        this.addUISourceCodeNode(uiSourceCode, frame);
      }
    } else {
      this.addUISourceCodeNode(uiSourceCode, null);
    }
    this.uiSourceCodeAdded(uiSourceCode);
  }
  addUISourceCodeNode(uiSourceCode, frame) {
    const isFromSourceMap = uiSourceCode.contentType().isFromSourceMap();
    let path;
    if (uiSourceCode.project().type() === Workspace9.Workspace.projectTypes.FileSystem) {
      path = Persistence5.FileSystemWorkspaceBinding.FileSystemWorkspaceBinding.relativePath(uiSourceCode).slice(0, -1);
    } else {
      path = Common8.ParsedURL.ParsedURL.extractPath(uiSourceCode.url()).split("/").slice(1, -1);
    }
    const project = uiSourceCode.project();
    const target = Bindings5.NetworkProject.NetworkProject.targetForUISourceCode(uiSourceCode);
    const folderNode = this.folderNode(uiSourceCode, project, target, frame, uiSourceCode.origin(), path, isFromSourceMap);
    const uiSourceCodeNode = new NavigatorUISourceCodeTreeNode(this, uiSourceCode, frame);
    const existingNode = folderNode.child(uiSourceCodeNode.id);
    if (existingNode && existingNode instanceof NavigatorUISourceCodeTreeNode) {
      this.uiSourceCodeNodes.set(uiSourceCode, existingNode);
    } else {
      folderNode.appendChild(uiSourceCodeNode);
      this.uiSourceCodeNodes.set(uiSourceCode, uiSourceCodeNode);
      uiSourceCodeNode.updateTitleBubbleUp();
    }
    this.selectDefaultTreeNode();
  }
  uiSourceCodeAdded(_uiSourceCode) {
  }
  uiSourceCodeAddedCallback(event) {
    const uiSourceCode = event.data;
    this.addUISourceCode(uiSourceCode);
  }
  uiSourceCodeRemovedCallback(event) {
    this.removeUISourceCodes([event.data]);
  }
  tryAddProject(project) {
    this.projectAdded(project);
    for (const uiSourceCode of project.uiSourceCodes()) {
      this.addUISourceCode(uiSourceCode);
    }
  }
  projectAdded(project) {
    const rootOrDeployed = this.rootOrDeployedNode();
    const FILE_SYSTEM_TYPES = [
      Workspace9.Workspace.projectTypes.ConnectableFileSystem,
      Workspace9.Workspace.projectTypes.FileSystem
    ];
    if (!this.acceptProject(project) || !FILE_SYSTEM_TYPES.includes(project.type()) || Snippets.ScriptSnippetFileSystem.isSnippetsProject(project) || rootOrDeployed.child(project.id())) {
      return;
    }
    const type = project instanceof Persistence5.AutomaticFileSystemWorkspaceBinding.FileSystem || project instanceof Persistence5.FileSystemWorkspaceBinding.FileSystem && project.fileSystem().automatic ? Types.AutomaticFileSystem : Types.FileSystem;
    rootOrDeployed.appendChild(new NavigatorGroupTreeNode(this, project, project.id(), type, project.displayName()));
    this.selectDefaultTreeNode();
  }
  // TODO(einbinder) remove this code after crbug.com/964075 is fixed
  selectDefaultTreeNode() {
    const children = this.rootNode.children();
    if (children.length && !this.scriptsTree.selectedTreeElement) {
      children[0].treeNode().select(
        true,
        false
        /* selectedByUser */
      );
    }
  }
  computeUniqueFileSystemProjectNames() {
    const fileSystemProjects = this.#workspace.projectsForType(Workspace9.Workspace.projectTypes.FileSystem);
    if (!fileSystemProjects.length) {
      return;
    }
    const reversedIndex = Common8.Trie.Trie.newArrayTrie();
    const reversedPaths = [];
    for (const project of fileSystemProjects) {
      const fileSystem = project;
      const reversedPathParts = fileSystem.fileSystemPath().split("/").reverse();
      reversedPaths.push(reversedPathParts);
      reversedIndex.add(reversedPathParts);
    }
    const rootOrDeployed = this.rootOrDeployedNode();
    for (let i = 0; i < fileSystemProjects.length; ++i) {
      const reversedPath = reversedPaths[i];
      const project = fileSystemProjects[i];
      reversedIndex.remove(reversedPath);
      const commonPrefix = reversedIndex.longestPrefix(
        reversedPath,
        false
        /* fullWordOnly */
      );
      reversedIndex.add(reversedPath);
      const prefixPath = reversedPath.slice(0, commonPrefix.length + 1);
      const path = Common8.ParsedURL.ParsedURL.encodedPathToRawPathString(prefixPath.reverse().join("/"));
      const fileSystemNode = rootOrDeployed.child(project.id());
      if (fileSystemNode) {
        fileSystemNode.setTitle(path);
      }
    }
  }
  removeProject(project) {
    this.removeUISourceCodes(project.uiSourceCodes());
    if (project.type() !== Workspace9.Workspace.projectTypes.ConnectableFileSystem && project.type() !== Workspace9.Workspace.projectTypes.FileSystem) {
      return;
    }
    const fileSystemNode = this.rootNode.child(project.id());
    if (!fileSystemNode) {
      return;
    }
    this.rootNode.removeChild(fileSystemNode);
  }
  folderNodeId(project, target, frame, projectOrigin, isFromSourceMap, path) {
    const projectId = project.type() === Workspace9.Workspace.projectTypes.FileSystem ? project.id() : "";
    let targetId = target && !(this.groupByAuthored && isFromSourceMap) ? target.id() : "";
    let frameId = this.groupByFrame && frame ? frame.id : "";
    if (this.groupByAuthored) {
      if (isFromSourceMap) {
        targetId = "Authored";
        frameId = "";
      } else {
        targetId = "Deployed:" + targetId;
      }
    }
    return targetId + ":" + projectId + ":" + frameId + ":" + projectOrigin + ":" + path;
  }
  folderNode(uiSourceCode, project, target, frame, projectOrigin, path, fromSourceMap) {
    if (Snippets.ScriptSnippetFileSystem.isSnippetsUISourceCode(uiSourceCode)) {
      return this.rootNode;
    }
    if (target && !this.groupByFolder && !fromSourceMap) {
      return this.domainNode(uiSourceCode, project, target, frame, projectOrigin);
    }
    const folderPath = Common8.ParsedURL.ParsedURL.join(path, "/");
    const folderId = this.folderNodeId(project, target, frame, projectOrigin, fromSourceMap, folderPath);
    let folderNode = this.subfolderNodes.get(folderId);
    if (folderNode) {
      return folderNode;
    }
    if (!path.length) {
      if (target) {
        return this.domainNode(uiSourceCode, project, target, frame, projectOrigin);
      }
      return this.rootOrDeployedNode().child(project.id());
    }
    const parentNode = this.folderNode(uiSourceCode, project, target, frame, projectOrigin, path.slice(0, -1), fromSourceMap);
    let type = Types.NetworkFolder;
    if (project.type() === Workspace9.Workspace.projectTypes.FileSystem) {
      type = Types.FileSystemFolder;
    }
    const name = Common8.ParsedURL.ParsedURL.encodedPathToRawPathString(path[path.length - 1]);
    folderNode = new NavigatorFolderTreeNode(this, project, folderId, type, folderPath, name, projectOrigin);
    this.subfolderNodes.set(folderId, folderNode);
    parentNode.appendChild(folderNode);
    return folderNode;
  }
  domainNode(uiSourceCode, project, target, frame, projectOrigin) {
    const isAuthored = uiSourceCode.contentType().isFromSourceMap();
    const frameNode = this.frameNode(project, target, frame, isAuthored);
    if (!this.groupByDomain) {
      return frameNode;
    }
    let domainNode = frameNode.child(projectOrigin);
    if (domainNode) {
      return domainNode;
    }
    domainNode = new NavigatorGroupTreeNode(this, project, projectOrigin, Types.Domain, this.computeProjectDisplayName(target, projectOrigin));
    if (frame && projectOrigin === Common8.ParsedURL.ParsedURL.extractOrigin(frame.url)) {
      boostOrderForNode.add(domainNode.treeNode());
    }
    frameNode.appendChild(domainNode);
    if (isAuthored && this.groupByAuthored) {
      domainNode.treeNode().expand();
    }
    return domainNode;
  }
  frameNode(project, target, frame, isAuthored) {
    if (!this.groupByFrame || !frame || this.groupByAuthored && isAuthored) {
      return this.targetNode(project, target, isAuthored);
    }
    let frameNode = this.frameNodes.get(frame);
    if (frameNode) {
      return frameNode;
    }
    frameNode = new NavigatorGroupTreeNode(this, project, target.id() + ":" + frame.id, Types.Frame, frame.displayName());
    frameNode.setHoverCallback(hoverCallback);
    this.frameNodes.set(frame, frameNode);
    const parentFrame = frame.parentFrame();
    this.frameNode(project, parentFrame ? parentFrame.resourceTreeModel().target() : target, parentFrame, isAuthored).appendChild(frameNode);
    if (!parentFrame) {
      boostOrderForNode.add(frameNode.treeNode());
      frameNode.treeNode().expand();
    }
    function hoverCallback(hovered) {
      if (hovered) {
        const overlayModel = target.model(SDK8.OverlayModel.OverlayModel);
        if (overlayModel && frame) {
          overlayModel.highlightFrame(frame.id);
        }
      } else {
        SDK8.OverlayModel.OverlayModel.hideDOMNodeHighlight();
      }
    }
    return frameNode;
  }
  targetNode(project, target, isAuthored) {
    if (this.groupByAuthored && isAuthored) {
      if (!this.authoredNode) {
        this.authoredNode = new NavigatorGroupTreeNode(this, null, "group:Authored", Types.Authored, i18nString9(UIStrings10.authored), i18nString9(UIStrings10.authoredTooltip));
        this.rootNode.appendChild(this.authoredNode);
        this.authoredNode.treeNode().expand();
      }
      return this.authoredNode;
    }
    const rootOrDeployed = this.rootOrDeployedNode();
    if (target === SDK8.TargetManager.TargetManager.instance().scopeTarget()) {
      return rootOrDeployed;
    }
    let targetNode = rootOrDeployed.child("target:" + target.id());
    if (!targetNode) {
      targetNode = new NavigatorGroupTreeNode(this, project, "target:" + target.id(), target.type() === SDK8.Target.Type.FRAME ? Types.Frame : Types.Worker, target.name());
      rootOrDeployed.appendChild(targetNode);
    }
    return targetNode;
  }
  rootOrDeployedNode() {
    if (this.groupByAuthored) {
      if (!this.deployedNode) {
        this.deployedNode = new NavigatorGroupTreeNode(this, null, "group:Deployed", Types.Deployed, i18nString9(UIStrings10.deployed), i18nString9(UIStrings10.deployedTooltip));
        this.rootNode.appendChild(this.deployedNode);
      }
      return this.deployedNode;
    }
    return this.rootNode;
  }
  computeProjectDisplayName(target, projectOrigin) {
    const runtimeModel = target.model(SDK8.RuntimeModel.RuntimeModel);
    const executionContexts = runtimeModel ? runtimeModel.executionContexts() : [];
    let matchingContextName = null;
    for (const context of executionContexts) {
      if (!context.origin || !projectOrigin.startsWith(context.origin)) {
        continue;
      }
      if (context.isDefault) {
        matchingContextName = null;
        break;
      }
      if (!context.name) {
        continue;
      }
      matchingContextName = context.name;
    }
    if (matchingContextName) {
      return matchingContextName;
    }
    if (!projectOrigin) {
      return i18nString9(UIStrings10.noDomain);
    }
    const parsedURL = new Common8.ParsedURL.ParsedURL(projectOrigin);
    const prettyURL = parsedURL.isValid ? parsedURL.host + (parsedURL.port ? ":" + parsedURL.port : "") : "";
    return prettyURL || projectOrigin;
  }
  revealUISourceCode(uiSourceCode, select) {
    const nodes = this.uiSourceCodeNodes.get(uiSourceCode);
    if (nodes.size === 0) {
      return null;
    }
    const node = nodes.values().next().value;
    if (!node) {
      return null;
    }
    if (this.scriptsTree.selectedTreeElement) {
      if (UI11.UIUtils.isBeingEdited(this.scriptsTree.selectedTreeElement.treeOutline?.element)) {
        return null;
      }
      this.scriptsTree.selectedTreeElement.deselect();
    }
    node.reveal(select);
    return node;
  }
  sourceSelected(uiSourceCode, focusSource) {
    void Common8.Revealer.reveal(uiSourceCode, !focusSource);
  }
  #isUISourceCodeOrAnyAncestorSelected(node) {
    const selectedTreeElement = this.scriptsTree.selectedTreeElement;
    const selectedNode = selectedTreeElement?.node;
    let currentNode = node;
    while (currentNode) {
      if (currentNode === selectedNode) {
        return true;
      }
      currentNode = currentNode.parent;
      if (!(node instanceof NavigatorGroupTreeNode || node instanceof NavigatorFolderTreeElement)) {
        break;
      }
    }
    return false;
  }
  removeUISourceCodes(uiSourceCodes) {
    const nodesWithSelectionOnPath = [];
    for (const uiSourceCode of uiSourceCodes) {
      const nodes = this.uiSourceCodeNodes.get(uiSourceCode);
      for (const node of nodes) {
        if (this.#isUISourceCodeOrAnyAncestorSelected(node)) {
          nodesWithSelectionOnPath.push(node);
        } else {
          this.removeUISourceCodeNode(node);
        }
      }
    }
    nodesWithSelectionOnPath.forEach(this.removeUISourceCodeNode.bind(this));
  }
  removeUISourceCodeNode(node) {
    const uiSourceCode = node.uiSourceCode();
    this.uiSourceCodeNodes.delete(uiSourceCode, node);
    const project = uiSourceCode.project();
    const target = Bindings5.NetworkProject.NetworkProject.targetForUISourceCode(uiSourceCode);
    let frame = node.frame();
    let parentNode = node.parent;
    if (!parentNode) {
      return;
    }
    parentNode.removeChild(node);
    let currentNode = parentNode;
    while (currentNode) {
      parentNode = currentNode.parent;
      if (!parentNode) {
        break;
      }
      if ((parentNode === this.rootNode || parentNode === this.deployedNode) && project.type() === Workspace9.Workspace.projectTypes.FileSystem) {
        break;
      }
      if (!(currentNode instanceof NavigatorGroupTreeNode || currentNode instanceof NavigatorFolderTreeNode)) {
        break;
      }
      if (!currentNode.isEmpty()) {
        currentNode.updateTitleBubbleUp();
        break;
      }
      if (currentNode.type === Types.Frame) {
        this.discardFrame(frame, Boolean(this.groupByAuthored) && uiSourceCode.contentType().isFromSourceMap());
        frame = frame.parentFrame();
      } else {
        const folderId = this.folderNodeId(project, target, frame, uiSourceCode.origin(), uiSourceCode.contentType().isFromSourceMap(), currentNode instanceof NavigatorFolderTreeNode && currentNode.folderPath || Platform6.DevToolsPath.EmptyEncodedPathString);
        this.subfolderNodes.delete(folderId);
        parentNode.removeChild(currentNode);
      }
      if (currentNode === this.authoredNode) {
        this.authoredNode = void 0;
      } else if (currentNode === this.deployedNode) {
        this.deployedNode = void 0;
      }
      currentNode = parentNode;
    }
  }
  reset(tearDownOnly) {
    for (const node of this.uiSourceCodeNodes.valuesArray()) {
      node.dispose();
    }
    this.scriptsTree.removeChildren();
    this.scriptsTree.setFocusable(false);
    this.uiSourceCodeNodes.clear();
    this.subfolderNodes.clear();
    this.frameNodes.clear();
    this.rootNode.reset();
    this.authoredNode = void 0;
    this.deployedNode = void 0;
    if (!tearDownOnly) {
      this.resetWorkspace(Workspace9.Workspace.WorkspaceImpl.instance());
    }
  }
  handleContextMenu(_event) {
  }
  async renameShortcut() {
    const selectedTreeElement = this.scriptsTree.selectedTreeElement;
    const node = selectedTreeElement?.node;
    if (!node?.uiSourceCode()?.canRename()) {
      return false;
    }
    this.rename(node, false);
    return true;
  }
  handleContextMenuCreate(project, path, uiSourceCode) {
    if (uiSourceCode) {
      const relativePath = Persistence5.FileSystemWorkspaceBinding.FileSystemWorkspaceBinding.relativePath(uiSourceCode);
      relativePath.pop();
      path = Common8.ParsedURL.ParsedURL.join(relativePath, "/");
    }
    void this.create(project, path, uiSourceCode);
  }
  handleContextMenuRename(node) {
    this.rename(node, false);
  }
  async handleContextMenuExclude(project, path) {
    const shouldExclude = await UI11.UIUtils.ConfirmDialog.show(i18nString9(UIStrings10.folderWillNotBeShown), i18nString9(UIStrings10.excludeThisFolder), void 0, { jslogContext: "exclude-folder-confirmation" });
    if (shouldExclude) {
      UI11.UIUtils.startBatchUpdate();
      project.excludeFolder(Persistence5.FileSystemWorkspaceBinding.FileSystemWorkspaceBinding.completeURL(project, path));
      UI11.UIUtils.endBatchUpdate();
    }
  }
  async handleContextMenuDelete(uiSourceCode) {
    const shouldDelete = await UI11.UIUtils.ConfirmDialog.show(i18nString9(UIStrings10.actionCannotBeUndone), i18nString9(UIStrings10.deleteThisFile), void 0, { jslogContext: "delete-file-confirmation" });
    if (shouldDelete) {
      uiSourceCode.project().deleteFile(uiSourceCode);
    }
  }
  handleFileContextMenu(event, node) {
    const uiSourceCode = node.uiSourceCode();
    const contextMenu = new UI11.ContextMenu.ContextMenu(event);
    contextMenu.appendApplicableItems(uiSourceCode);
    const project = uiSourceCode.project();
    if (project.type() === Workspace9.Workspace.projectTypes.FileSystem) {
      contextMenu.editSection().appendItem(i18nString9(UIStrings10.rename), this.handleContextMenuRename.bind(this, node), { jslogContext: "rename" });
      contextMenu.editSection().appendItem(i18nString9(UIStrings10.makeACopy), this.handleContextMenuCreate.bind(this, project, Platform6.DevToolsPath.EmptyEncodedPathString, uiSourceCode), { jslogContext: "make-a-copy" });
      contextMenu.editSection().appendItem(i18nString9(UIStrings10.delete), this.handleContextMenuDelete.bind(this, uiSourceCode), { jslogContext: "delete" });
    }
    void contextMenu.show();
  }
  async handleDeleteFolder(node) {
    const shouldRemove = await UI11.UIUtils.ConfirmDialog.show(i18nString9(UIStrings10.actionCannotBeUndone), i18nString9(UIStrings10.deleteFolder), void 0, { jslogContext: "delete-folder-confirmation" });
    if (shouldRemove) {
      Host4.userMetrics.actionTaken(Host4.UserMetrics.Action.OverrideTabDeleteFolderContextMenu);
      const topNode = this.findTopNonMergedNode(node);
      await this.removeUISourceCodeFromProject(topNode);
      await this.deleteDirectoryRecursively(topNode);
    }
  }
  async removeUISourceCodeFromProject(node) {
    node.children().slice(0).forEach(async (child) => {
      await this.removeUISourceCodeFromProject(child);
    });
    if (node instanceof NavigatorUISourceCodeTreeNode) {
      node.uiSourceCode().project().removeUISourceCode(node.uiSourceCode().url());
    }
  }
  async deleteDirectoryRecursively(node) {
    if (!(node instanceof NavigatorFolderTreeNode)) {
      return;
    }
    await Persistence5.NetworkPersistenceManager.NetworkPersistenceManager.instance().project()?.deleteDirectoryRecursively(node.folderPath);
  }
  findTopNonMergedNode(node) {
    if (!node.isMerged) {
      return node;
    }
    if (!(node.parent instanceof NavigatorFolderTreeNode)) {
      return node;
    }
    return this.findTopNonMergedNode(node.parent);
  }
  handleFolderContextMenu(event, node) {
    const path = node.folderPath || Platform6.DevToolsPath.EmptyEncodedPathString;
    const project = node.project || null;
    const contextMenu = new UI11.ContextMenu.ContextMenu(event);
    if (project?.type() !== Workspace9.Workspace.projectTypes.ConnectableFileSystem) {
      _NavigatorView.appendSearchItem(contextMenu, path);
    }
    if (!project) {
      return;
    }
    if (project.type() === Workspace9.Workspace.projectTypes.FileSystem) {
      const folderPath = Common8.ParsedURL.ParsedURL.urlToRawPathString(Persistence5.FileSystemWorkspaceBinding.FileSystemWorkspaceBinding.completeURL(project, path), Host4.Platform.isWin());
      contextMenu.revealSection().appendItem(i18nString9(UIStrings10.openFolder), () => Host4.InspectorFrontendHost.InspectorFrontendHostInstance.showItemInFolder(folderPath), { jslogContext: "open-folder" });
      if (project.canCreateFile()) {
        contextMenu.defaultSection().appendItem(i18nString9(UIStrings10.newFile), () => {
          this.handleContextMenuCreate(project, path, void 0);
        }, { jslogContext: "new-file" });
      }
    } else if (node.origin && node.folderPath) {
      const url = Common8.ParsedURL.ParsedURL.concatenate(node.origin, "/", node.folderPath);
      const options = {
        isContentScript: node.recursiveProperties.exclusivelyContentScripts || false,
        isKnownThirdParty: node.recursiveProperties.exclusivelyThirdParty || false,
        isCurrentlyIgnoreListed: node.recursiveProperties.exclusivelyIgnored || false
      };
      for (const { text, callback, jslogContext } of Workspace9.IgnoreListManager.IgnoreListManager.instance().getIgnoreListFolderContextMenuItems(url, options)) {
        contextMenu.defaultSection().appendItem(text, callback, { jslogContext });
      }
    }
    if (project.canExcludeFolder(path)) {
      contextMenu.defaultSection().appendItem(i18nString9(UIStrings10.excludeFolder), this.handleContextMenuExclude.bind(this, project, path), { jslogContext: "exclude-folder" });
    }
    if (project.type() === Workspace9.Workspace.projectTypes.ConnectableFileSystem) {
      const automaticFileSystemManager = Persistence5.AutomaticFileSystemManager.AutomaticFileSystemManager.instance();
      const { automaticFileSystem } = automaticFileSystemManager;
      if (automaticFileSystem?.state === "disconnected") {
        contextMenu.defaultSection().appendItem(i18nString9(UIStrings10.connectFolderToWorkspace), async () => {
          await automaticFileSystemManager.connectAutomaticFileSystem(
            /* addIfMissing= */
            true
          );
        }, { jslogContext: "automatic-workspace-folders.connect" });
      }
    }
    if (project.type() === Workspace9.Workspace.projectTypes.FileSystem) {
      if (Persistence5.FileSystemWorkspaceBinding.FileSystemWorkspaceBinding.fileSystemType(project) !== Persistence5.PlatformFileSystem.PlatformFileSystemType.OVERRIDES) {
        if (node instanceof NavigatorGroupTreeNode) {
          contextMenu.defaultSection().appendItem(i18nString9(UIStrings10.removeFolderFromWorkspace), async () => {
            const header = i18nString9(UIStrings10.areYouSureYouWantToRemoveThis, { PH1: node.title });
            const shouldRemove = await UI11.UIUtils.ConfirmDialog.show(i18nString9(UIStrings10.workspaceStopSyncing), header, void 0, {
              okButtonLabel: i18nString9(UIStrings10.remove),
              jslogContext: "remove-folder-from-workspace-confirmation"
            });
            if (shouldRemove) {
              project.remove();
            }
          }, { jslogContext: "remove-folder-from-workspace" });
        }
      } else if (!(node instanceof NavigatorGroupTreeNode)) {
        contextMenu.defaultSection().appendItem(i18nString9(UIStrings10.delete), this.handleDeleteFolder.bind(this, node), { jslogContext: "delete" });
      }
    }
    void contextMenu.show();
  }
  rename(node, creatingNewUISourceCode) {
    const uiSourceCode = node.uiSourceCode();
    node.rename(callback.bind(this));
    function callback(committed) {
      if (!creatingNewUISourceCode) {
        return;
      }
      if (!committed) {
        uiSourceCode.remove();
      } else if (node.treeElement?.listItemElement.hasFocus()) {
        this.sourceSelected(uiSourceCode, true);
      }
    }
  }
  async create(project, path, uiSourceCodeToCopy) {
    let content = "";
    if (uiSourceCodeToCopy) {
      const contentDataOrError = await uiSourceCodeToCopy.requestContentData();
      content = TextUtils5.ContentData.ContentData.textOr(contentDataOrError, "");
    }
    const uiSourceCode = await project.createFile(path, null, content);
    if (!uiSourceCode) {
      return;
    }
    this.sourceSelected(uiSourceCode, false);
    const node = this.revealUISourceCode(uiSourceCode, true);
    if (node) {
      this.rename(node, true);
    }
  }
  groupingChanged() {
    this.reset(true);
    this.initGrouping();
    this.resetWorkspace(Workspace9.Workspace.WorkspaceImpl.instance());
    this.#workspace.uiSourceCodes().forEach(this.addUISourceCode.bind(this));
  }
  ignoreListChanged() {
    if (Root.Runtime.experiments.isEnabled(
      "just-my-code"
      /* Root.Runtime.ExperimentName.JUST_MY_CODE */
    )) {
      this.groupingChanged();
    } else {
      this.rootNode.updateTitleRecursive();
    }
  }
  initGrouping() {
    this.groupByFrame = true;
    this.groupByDomain = this.navigatorGroupByFolderSetting.get();
    this.groupByFolder = this.groupByDomain;
    if (this.navigatorGroupByAuthoredExperiment) {
      this.groupByAuthored = Root.Runtime.experiments.isEnabled(this.navigatorGroupByAuthoredExperiment);
    } else {
      this.groupByAuthored = false;
    }
  }
  resetForTest() {
    this.reset();
    this.#workspace.uiSourceCodes().forEach(this.addUISourceCode.bind(this));
  }
  discardFrame(frame, isAuthored) {
    if (isAuthored) {
      return;
    }
    const node = this.frameNodes.get(frame);
    if (!node) {
      return;
    }
    if (node.parent) {
      node.parent.removeChild(node);
    }
    this.frameNodes.delete(frame);
    for (const child of frame.childFrames) {
      this.discardFrame(child, isAuthored);
    }
  }
  targetAdded(_target) {
  }
  targetRemoved(target) {
    const rootOrDeployed = this.rootOrDeployedNode();
    const targetNode = rootOrDeployed.child("target:" + target.id());
    if (targetNode) {
      rootOrDeployed.removeChild(targetNode);
    }
  }
  targetNameChanged(event) {
    const target = event.data;
    const targetNode = this.rootOrDeployedNode().child("target:" + target.id());
    if (targetNode) {
      targetNode.setTitle(target.name());
    }
  }
};
var boostOrderForNode = /* @__PURE__ */ new WeakSet();
var NavigatorFolderTreeElement = class _NavigatorFolderTreeElement extends UI11.TreeOutline.TreeElement {
  nodeType;
  navigatorView;
  hoverCallback;
  node;
  hovered;
  isIgnoreListed;
  constructor(navigatorView, type, title, hoverCallback, expandable = true) {
    super("", expandable, _NavigatorFolderTreeElement.#contextForType(type));
    this.listItemElement.classList.add("navigator-" + type + "-tree-item", "navigator-folder-tree-item");
    UI11.ARIAUtils.setLabel(this.listItemElement, `${title}, ${type}`);
    this.nodeType = type;
    this.title = title;
    this.tooltip = title;
    this.navigatorView = navigatorView;
    this.hoverCallback = hoverCallback;
    let iconType = "folder";
    if (type === Types.Domain) {
      iconType = "cloud";
    } else if (type === Types.Frame) {
      iconType = "frame";
    } else if (type === Types.Worker) {
      iconType = "gears";
    } else if (type === Types.Authored) {
      iconType = "code";
    } else if (type === Types.Deployed) {
      iconType = "deployed";
    } else if (type === Types.AutomaticFileSystem) {
      iconType = "folder-asterisk";
    }
    const icon = IconButton5.Icon.create(iconType);
    this.setLeadingIcons([icon]);
  }
  async onpopulate() {
    this.node.populate();
  }
  onattach() {
    this.collapse();
    this.node.onattach();
    this.listItemElement.addEventListener("contextmenu", this.handleContextMenuEvent.bind(this), false);
    this.listItemElement.addEventListener("mousemove", this.mouseMove.bind(this), false);
    this.listItemElement.addEventListener("mouseleave", this.mouseLeave.bind(this), false);
  }
  setIgnoreListed(isIgnoreListed) {
    if (this.isIgnoreListed !== isIgnoreListed) {
      this.isIgnoreListed = isIgnoreListed;
      this.listItemElement.classList.toggle("is-ignore-listed", isIgnoreListed);
      this.updateTooltip();
    }
  }
  setFromSourceMap(isFromSourceMap) {
    this.listItemElement.classList.toggle("is-from-source-map", isFromSourceMap);
  }
  setNode(node) {
    this.node = node;
    this.updateTooltip();
    UI11.ARIAUtils.setLabel(this.listItemElement, `${this.title}, ${this.nodeType}`);
  }
  updateTooltip() {
    if (this.node.tooltip) {
      this.tooltip = this.node.tooltip;
    } else {
      const paths = [];
      let currentNode = this.node;
      while (currentNode && !currentNode.isRoot() && currentNode.type === this.node.type) {
        paths.push(currentNode.title);
        currentNode = currentNode.parent;
      }
      paths.reverse();
      let tooltip = paths.join("/");
      if (this.isIgnoreListed) {
        tooltip = i18nString9(UIStrings10.sIgnoreListed, { PH1: tooltip });
      }
      this.tooltip = tooltip;
    }
  }
  handleContextMenuEvent(event) {
    if (!this.node) {
      return;
    }
    this.select();
    this.navigatorView.handleFolderContextMenu(event, this.node);
  }
  mouseMove(_event) {
    if (this.hovered || !this.hoverCallback) {
      return;
    }
    this.hovered = true;
    this.hoverCallback(true);
  }
  mouseLeave(_event) {
    if (!this.hoverCallback) {
      return;
    }
    this.hovered = false;
    this.hoverCallback(false);
  }
  static #contextForType(type) {
    switch (type) {
      case Types.Domain:
        return "domain";
      case Types.Frame:
        return "frame";
      case Types.Worker:
        return "worker";
      case Types.Authored:
        return "authored";
      case Types.Deployed:
        return "deployed";
    }
    return "folder";
  }
};
var NavigatorSourceTreeElement = class extends UI11.TreeOutline.TreeElement {
  nodeType;
  node;
  navigatorView;
  #uiSourceCode;
  aiButtonContainer;
  constructor(navigatorView, uiSourceCode, title, node) {
    super("", false, uiSourceCode.contentType().name());
    this.nodeType = Types.File;
    this.node = node;
    this.title = title;
    this.listItemElement.classList.add("navigator-" + uiSourceCode.contentType().name() + "-tree-item", "navigator-file-tree-item");
    this.tooltip = uiSourceCode.url();
    UI11.ARIAUtils.setLabel(this.listItemElement, `${uiSourceCode.name()}, ${this.nodeType}`);
    Common8.EventTarget.fireEvent("source-tree-file-added", uiSourceCode.fullDisplayName());
    this.navigatorView = navigatorView;
    this.#uiSourceCode = uiSourceCode;
    this.updateIcon();
    this.titleElement.setAttribute("jslog", `${VisualLogging7.value("title").track({ change: true })}`);
  }
  updateIcon() {
    const icon = PanelUtils.getIconForSourceFile(this.#uiSourceCode);
    this.setLeadingIcons([icon]);
  }
  updateAccessibleName() {
    UI11.ARIAUtils.setLabel(this.listItemElement, `${this.#uiSourceCode.name()}, ${this.nodeType}`);
  }
  createAiButton() {
    if (!UI11.ActionRegistry.ActionRegistry.instance().hasAction("drjones.sources-floating-button")) {
      return;
    }
    if (!this.uiSourceCode.contentType().isTextType() || Snippets.ScriptSnippetFileSystem.isSnippetsUISourceCode(this.uiSourceCode)) {
      return;
    }
    const action3 = UI11.ActionRegistry.ActionRegistry.instance().getAction("drjones.sources-floating-button");
    if (!this.aiButtonContainer) {
      this.aiButtonContainer = this.listItemElement.createChild("span", "ai-button-container");
      const floatingButton = Buttons2.FloatingButton.create("smart-assistant", action3.title(), "ask-ai");
      floatingButton.addEventListener("click", (ev) => {
        ev.stopPropagation();
        this.navigatorView.sourceSelected(this.uiSourceCode, false);
        void action3.execute();
      }, { capture: true });
      floatingButton.addEventListener("mousedown", (ev) => {
        ev.stopPropagation();
      }, { capture: true });
      this.aiButtonContainer.appendChild(floatingButton);
    }
  }
  get uiSourceCode() {
    return this.#uiSourceCode;
  }
  onattach() {
    this.listItemElement.draggable = true;
    this.listItemElement.addEventListener("click", this.onclick.bind(this), false);
    this.listItemElement.addEventListener("contextmenu", this.handleContextMenuEvent.bind(this), false);
    this.listItemElement.addEventListener("dragstart", this.ondragstart.bind(this), false);
    this.createAiButton();
  }
  shouldRenameOnMouseDown() {
    if (!this.#uiSourceCode.canRename()) {
      return false;
    }
    if (!this.treeOutline) {
      return false;
    }
    const isSelected = this === this.treeOutline.selectedTreeElement;
    return isSelected && this.treeOutline.element.hasFocus() && !UI11.UIUtils.isBeingEdited(this.treeOutline.element);
  }
  selectOnMouseDown(event) {
    if (event.which !== 1 || !this.shouldRenameOnMouseDown()) {
      super.selectOnMouseDown(event);
      return;
    }
    window.setTimeout(rename.bind(this), 300);
    function rename() {
      if (this.shouldRenameOnMouseDown()) {
        this.navigatorView.rename(this.node, false);
      }
    }
  }
  ondragstart(event) {
    if (!event.dataTransfer) {
      return;
    }
    event.dataTransfer.setData("text/plain", this.#uiSourceCode.url());
    event.dataTransfer.effectAllowed = "copy";
  }
  onspace() {
    this.navigatorView.sourceSelected(this.uiSourceCode, true);
    return true;
  }
  onclick(_event) {
    this.navigatorView.sourceSelected(this.uiSourceCode, false);
  }
  ondblclick(event) {
    const middleClick = event.button === 1;
    this.navigatorView.sourceSelected(this.uiSourceCode, !middleClick);
    return false;
  }
  onenter() {
    this.navigatorView.sourceSelected(this.uiSourceCode, true);
    return true;
  }
  ondelete() {
    return true;
  }
  handleContextMenuEvent(event) {
    this.select();
    this.navigatorView.handleFileContextMenu(event, this.node);
  }
};
var NavigatorTreeNode = class {
  id;
  navigatorView;
  type;
  populated;
  isMerged;
  parent;
  title;
  tooltip;
  recursiveProperties;
  #children = [];
  #childById = /* @__PURE__ */ new Map();
  constructor(navigatorView, id, type, tooltip) {
    this.id = id;
    this.navigatorView = navigatorView;
    this.type = type;
    this.tooltip = tooltip;
    this.populated = false;
    this.isMerged = false;
    this.recursiveProperties = {
      exclusivelySourceMapped: null,
      exclusivelyIgnored: null,
      exclusivelyContentScripts: null,
      exclusivelyThirdParty: null
    };
  }
  treeNode() {
    throw new Error("Not implemented");
  }
  dispose() {
  }
  updateTitle() {
  }
  updateTitleRecursive() {
    for (const child of this.children()) {
      child.updateTitleRecursive();
    }
    this.updateTitle();
  }
  updateTitleBubbleUp() {
    this.updateTitle();
    if (this.parent) {
      this.parent.updateTitleBubbleUp();
    }
  }
  isRoot() {
    return false;
  }
  hasChildren() {
    return true;
  }
  onattach() {
  }
  setTitle(_title) {
    throw new Error("Not implemented");
  }
  populate() {
    if (this.isPopulated()) {
      return;
    }
    if (this.parent) {
      this.parent.populate();
    }
    this.populated = true;
    this.wasPopulated();
  }
  wasPopulated() {
    const children = this.children();
    for (let i = 0; i < children.length; ++i) {
      this.navigatorView.appendChild(this.treeNode(), children[i].treeNode());
    }
  }
  didAddChild(node) {
    if (this.isPopulated()) {
      this.navigatorView.appendChild(this.treeNode(), node.treeNode());
    }
  }
  willRemoveChild(node) {
    if (this.isPopulated()) {
      this.navigatorView.removeChild(this.treeNode(), node.treeNode());
    }
  }
  isPopulated() {
    return this.populated;
  }
  isEmpty() {
    return !this.#children.length;
  }
  children() {
    return this.#children;
  }
  child(id) {
    return this.#childById.get(id) ?? null;
  }
  appendChild(node) {
    this.#children.push(node);
    this.#childById.set(node.id, node);
    node.parent = this;
    this.didAddChild(node);
  }
  removeChild(node) {
    this.willRemoveChild(node);
    const idx = this.#children.findIndex((n) => n.id === node.id);
    if (idx >= 0) {
      this.#children.splice(idx, 1);
    }
    this.#childById.delete(node.id);
    node.parent = null;
    node.dispose();
  }
  reset() {
    this.#children = [];
    this.#childById.clear();
  }
  updateId(newId) {
    if (this.parent) {
      this.parent.#childById.delete(this.id);
      this.parent.#childById.set(newId, this);
    }
    this.id = newId;
  }
};
var NavigatorRootTreeNode = class extends NavigatorTreeNode {
  constructor(navigatorView) {
    super(navigatorView, "", Types.Root);
  }
  isRoot() {
    return true;
  }
  treeNode() {
    return this.navigatorView.scriptsTree.rootElement();
  }
};
var NavigatorUISourceCodeTreeNode = class extends NavigatorTreeNode {
  #uiSourceCode;
  treeElement;
  eventListeners;
  #frame;
  constructor(navigatorView, uiSourceCode, frame) {
    super(navigatorView, "UISourceCode:" + uiSourceCode.canonicalScriptId(), Types.File);
    this.#uiSourceCode = uiSourceCode;
    this.treeElement = null;
    this.eventListeners = [];
    this.#frame = frame;
    this.recursiveProperties.exclusivelySourceMapped = uiSourceCode.contentType().isFromSourceMap();
    if (uiSourceCode.contentType().isScript()) {
      this.recursiveProperties.exclusivelyThirdParty = uiSourceCode.isKnownThirdParty();
      this.recursiveProperties.exclusivelyContentScripts = uiSourceCode.project().type() === Workspace9.Workspace.projectTypes.ContentScripts;
    }
  }
  frame() {
    return this.#frame;
  }
  uiSourceCode() {
    return this.#uiSourceCode;
  }
  treeNode() {
    if (this.treeElement) {
      return this.treeElement;
    }
    this.treeElement = new NavigatorSourceTreeElement(this.navigatorView, this.#uiSourceCode, "", this);
    this.updateTitle();
    const updateTitleBound = this.updateTitle.bind(this, void 0);
    this.eventListeners = [
      this.#uiSourceCode.addEventListener(Workspace9.UISourceCode.Events.TitleChanged, updateTitleBound),
      this.#uiSourceCode.addEventListener(Workspace9.UISourceCode.Events.WorkingCopyChanged, updateTitleBound),
      this.#uiSourceCode.addEventListener(Workspace9.UISourceCode.Events.WorkingCopyCommitted, updateTitleBound)
    ];
    return this.treeElement;
  }
  updateTitle(ignoreIsDirty) {
    const isIgnoreListed = Workspace9.IgnoreListManager.IgnoreListManager.instance().isUserOrSourceMapIgnoreListedUISourceCode(this.#uiSourceCode);
    if (this.#uiSourceCode.contentType().isScript() || isIgnoreListed) {
      this.recursiveProperties.exclusivelyIgnored = isIgnoreListed;
    }
    if (!this.treeElement) {
      return;
    }
    let titleText = this.#uiSourceCode.displayName();
    if (!ignoreIsDirty && this.#uiSourceCode.isDirty()) {
      titleText = "*" + titleText;
    }
    this.treeElement.title = titleText;
    this.treeElement.updateIcon();
    this.treeElement.listItemElement.classList.toggle("is-ignore-listed", isIgnoreListed);
    let tooltip = this.#uiSourceCode.url();
    if (this.#uiSourceCode.contentType().isFromSourceMap()) {
      tooltip = i18nString9(UIStrings10.sFromSourceMap, { PH1: this.#uiSourceCode.displayName() });
    }
    if (isIgnoreListed) {
      tooltip = i18nString9(UIStrings10.sIgnoreListed, { PH1: tooltip });
    }
    this.treeElement.tooltip = tooltip;
    this.treeElement.updateAccessibleName();
    this.updateId("UISourceCode:" + this.#uiSourceCode.canonicalScriptId());
  }
  hasChildren() {
    return false;
  }
  dispose() {
    Common8.EventTarget.removeEventListeners(this.eventListeners);
  }
  reveal(select) {
    if (this.parent) {
      this.parent.populate();
      this.parent.treeNode().expand();
    }
    if (this.treeElement) {
      this.treeElement.reveal(true);
      if (select) {
        this.treeElement.select(true);
      }
    }
  }
  rename(callback) {
    if (!this.treeElement) {
      return;
    }
    this.treeElement.listItemElement.focus();
    if (!this.treeElement.treeOutline) {
      return;
    }
    const treeOutlineElement = this.treeElement.treeOutline.element;
    UI11.UIUtils.markBeingEdited(treeOutlineElement, true);
    const commitHandler = (_element, newTitle, oldTitle) => {
      if (newTitle !== oldTitle) {
        if (this.treeElement) {
          this.treeElement.title = newTitle;
        }
        void this.#uiSourceCode.rename(newTitle).then(renameCallback);
        return;
      }
      afterEditing(true);
    };
    const renameCallback = (success) => {
      if (!success) {
        UI11.UIUtils.markBeingEdited(treeOutlineElement, false);
        this.updateTitle();
        this.rename(callback);
        return;
      }
      if (this.treeElement) {
        const { parent } = this.treeElement;
        if (parent) {
          parent.removeChild(this.treeElement);
          parent.appendChild(this.treeElement);
          this.treeElement.select();
        }
      }
      afterEditing(true);
    };
    const afterEditing = (committed) => {
      UI11.UIUtils.markBeingEdited(treeOutlineElement, false);
      this.updateTitle();
      if (callback) {
        callback(committed);
      }
    };
    this.updateTitle(true);
    this.treeElement.startEditingTitle(new UI11.InplaceEditor.Config(commitHandler, () => afterEditing(false), void 0));
  }
};
var NavigatorFolderTreeNode = class _NavigatorFolderTreeNode extends NavigatorTreeNode {
  project;
  folderPath;
  origin;
  title;
  treeElement;
  constructor(navigatorView, project, id, type, folderPath, title, origin) {
    super(navigatorView, id, type);
    this.project = project;
    this.folderPath = folderPath;
    this.title = title;
    this.origin = origin;
  }
  treeNode() {
    if (this.treeElement) {
      return this.treeElement;
    }
    this.treeElement = this.createTreeElement(this.title, this);
    this.updateTitle();
    return this.treeElement;
  }
  updateTitle() {
    let propName;
    for (propName in this.recursiveProperties) {
      let propValue = null;
      for (const child of this.children()) {
        if (child.recursiveProperties[propName] === false) {
          propValue = false;
          break;
        } else if (child.recursiveProperties[propName]) {
          propValue = true;
        }
      }
      this.recursiveProperties[propName] = propValue;
    }
    if (!this.treeElement) {
      return;
    }
    this.treeElement.setFromSourceMap(this.recursiveProperties.exclusivelySourceMapped || false);
    this.treeElement.setIgnoreListed(this.recursiveProperties.exclusivelyIgnored || false);
    if (!this.project || this.project.type() !== Workspace9.Workspace.projectTypes.FileSystem) {
      return;
    }
    const absoluteFileSystemPath = Common8.ParsedURL.ParsedURL.concatenate(Persistence5.FileSystemWorkspaceBinding.FileSystemWorkspaceBinding.fileSystemPath(this.project.id()), "/", this.folderPath);
    const hasMappedFiles = Persistence5.Persistence.PersistenceImpl.instance().filePathHasBindings(absoluteFileSystemPath);
    this.treeElement.listItemElement.classList.toggle("has-mapped-files", hasMappedFiles);
  }
  createTreeElement(title, node) {
    const treeElement = new NavigatorFolderTreeElement(this.navigatorView, this.type, title);
    treeElement.setNode(node);
    return treeElement;
  }
  wasPopulated() {
    if (!this.treeElement || this.treeElement.node !== this) {
      return;
    }
    this.addChildrenRecursive();
  }
  addChildrenRecursive() {
    const children = this.children();
    for (let i = 0; i < children.length; ++i) {
      const child = children[i];
      this.didAddChild(child);
      if (child instanceof _NavigatorFolderTreeNode) {
        child.addChildrenRecursive();
      }
    }
  }
  shouldMerge(node) {
    return this.type !== Types.Domain && node instanceof _NavigatorFolderTreeNode;
  }
  didAddChild(node) {
    if (!this.treeElement) {
      return;
    }
    let children = this.children();
    if (children.length === 1 && this.shouldMerge(node)) {
      node.isMerged = true;
      this.treeElement.title = this.treeElement.title + "/" + node.title;
      node.treeElement = this.treeElement;
      node.updateTitle();
      this.treeElement.setNode(node);
      return;
    }
    let oldNode;
    if (children.length === 2) {
      oldNode = children[0] !== node ? children[0] : children[1];
    }
    if (oldNode?.isMerged) {
      oldNode.isMerged = false;
      const mergedToNodes = [];
      mergedToNodes.push(this);
      let treeNode = this;
      while (treeNode && treeNode.isMerged) {
        treeNode = treeNode.parent;
        if (treeNode) {
          mergedToNodes.push(treeNode);
        }
      }
      mergedToNodes.reverse();
      const titleText = mergedToNodes.map((node2) => node2.title).join("/");
      const nodes = [];
      treeNode = oldNode;
      do {
        nodes.push(treeNode);
        children = treeNode.children();
        treeNode = children.length === 1 ? children[0] : null;
      } while (treeNode?.isMerged);
      if (!this.isPopulated()) {
        this.treeElement.title = titleText;
        this.treeElement.setNode(this);
        for (let i = 0; i < nodes.length; ++i) {
          nodes[i].treeElement = null;
          nodes[i].isMerged = false;
        }
        this.updateTitle();
        return;
      }
      const oldTreeElement = this.treeElement;
      const treeElement = this.createTreeElement(titleText, this);
      for (let i = 0; i < mergedToNodes.length; ++i) {
        mergedToNodes[i].treeElement = treeElement;
        mergedToNodes[i].updateTitle();
      }
      if (oldTreeElement.parent) {
        this.navigatorView.appendChild(oldTreeElement.parent, treeElement);
      }
      oldTreeElement.setNode(nodes[nodes.length - 1]);
      oldTreeElement.title = nodes.map((node2) => node2.title).join("/");
      if (oldTreeElement.parent) {
        this.navigatorView.removeChild(oldTreeElement.parent, oldTreeElement);
      }
      this.navigatorView.appendChild(this.treeElement, oldTreeElement);
      if (oldTreeElement.expanded) {
        treeElement.expand();
      }
      this.updateTitle();
    }
    if (this.isPopulated()) {
      this.navigatorView.appendChild(this.treeElement, node.treeNode());
    }
  }
  willRemoveChild(node) {
    const actualNode = node;
    if (actualNode.isMerged || !this.isPopulated() || !this.treeElement || !actualNode.treeElement) {
      return;
    }
    this.navigatorView.removeChild(this.treeElement, actualNode.treeElement);
  }
};
var NavigatorGroupTreeNode = class extends NavigatorTreeNode {
  project;
  title;
  hoverCallback;
  treeElement;
  constructor(navigatorView, project, id, type, title, tooltip) {
    super(navigatorView, id, type, tooltip);
    this.project = project;
    this.title = title;
    this.populate();
  }
  setHoverCallback(hoverCallback) {
    this.hoverCallback = hoverCallback;
  }
  treeNode() {
    if (this.treeElement) {
      return this.treeElement;
    }
    const expandable = !(this.project instanceof Persistence5.AutomaticFileSystemWorkspaceBinding.FileSystem);
    this.treeElement = new NavigatorFolderTreeElement(this.navigatorView, this.type, this.title, this.hoverCallback, expandable);
    this.treeElement.setNode(this);
    if (this.project instanceof Persistence5.AutomaticFileSystemWorkspaceBinding.FileSystem) {
      const { automaticFileSystem, automaticFileSystemManager } = this.project;
      switch (automaticFileSystem?.state) {
        case "connecting": {
          const spinner = new Spinners.Spinner.Spinner();
          this.treeElement.listItemElement.append(spinner);
          break;
        }
        case "disconnected": {
          const button = new Buttons2.Button.Button();
          button.data = {
            variant: "outlined",
            size: "MICRO",
            title: i18nString9(UIStrings10.connectFolderToWorkspace),
            jslogContext: "automatic-workspace-folders.connect"
          };
          button.textContent = i18nString9(UIStrings10.connect);
          button.addEventListener("click", async (event) => {
            event.consume();
            await automaticFileSystemManager.connectAutomaticFileSystem(
              /* addIfMissing= */
              true
            );
          });
          this.treeElement.listItemElement.append(button);
          break;
        }
      }
    }
    return this.treeElement;
  }
  onattach() {
    this.updateTitle();
  }
  updateTitle() {
    if (!this.treeElement || !this.project || this.project.type() !== Workspace9.Workspace.projectTypes.FileSystem) {
      return;
    }
    const fileSystemPath = Persistence5.FileSystemWorkspaceBinding.FileSystemWorkspaceBinding.fileSystemPath(this.project.id());
    const wasActive = this.treeElement.listItemElement.classList.contains("has-mapped-files");
    const isActive = Persistence5.Persistence.PersistenceImpl.instance().filePathHasBindings(fileSystemPath);
    if (wasActive === isActive) {
      return;
    }
    this.treeElement.listItemElement.classList.toggle("has-mapped-files", isActive);
    if (this.treeElement.childrenListElement.hasFocus()) {
      return;
    }
    if (isActive) {
      this.treeElement.expand();
    } else {
      this.treeElement.collapse();
    }
  }
  setTitle(title) {
    this.title = title;
    if (this.treeElement) {
      this.treeElement.title = this.title;
    }
  }
};

// gen/front_end/panels/sources/sourcesPanel.css.js
var sourcesPanel_css_default = `/*
 * Copyright (C) 2006, 2007, 2008 Apple Inc.  All rights reserved.
 * Copyright (C) 2009 Anthony Ricaud <rik@webkit.org>
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * 1.  Redistributions of source code must retain the above copyright
 *     notice, this list of conditions and the following disclaimer.
 * 2.  Redistributions in binary form must reproduce the above copyright
 *     notice, this list of conditions and the following disclaimer in the
 *     documentation and/or other materials provided with the distribution.
 * 3.  Neither the name of Apple Computer, Inc. ("Apple") nor the names of
 *     its contributors may be used to endorse or promote products derived
 *     from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE AND ITS CONTRIBUTORS "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL APPLE OR ITS CONTRIBUTORS BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

.paused-message {
  display: flex;
  justify-content: center;
}

.scripts-debug-toolbar {
  position: absolute;
  top: 0;
  width: 100%;
  background-color: var(--app-color-toolbar-background);
  border-bottom: 1px solid var(--sys-color-divider);
  overflow: hidden;
  z-index: 1;
}

.scripts-debug-toolbar-drawer {
  flex: 0 0 52px;
  transition: margin-top 0.1s ease-in-out;
  margin-top: -26px;
  padding-top: 25px;
  background-color: var(--sys-color-cdt-base-container);
  overflow: hidden;
  white-space: nowrap;
}

.scripts-debug-toolbar-drawer.expanded {
  margin-top: 0;
}

.scripts-debug-toolbar-drawer > devtools-checkbox {
  display: none;
  padding-left: 3px;
  height: 28px;
}

.scripts-debug-toolbar-drawer.expanded > devtools-checkbox {
  display: flex;
}

.y-overflow-only {
  overflow: hidden auto;
  background-color: var(--sys-color-cdt-base-container);
}

.cursor-auto {
  cursor: auto;
}

.navigator-tabbed-pane {
  background-color: var(--sys-color-cdt-base-container);
}

/*# sourceURL=${import.meta.resolve("./sourcesPanel.css")} */`;

// gen/front_end/panels/sources/SourcesView.js
var SourcesView_exports = {};
__export(SourcesView_exports, {
  ActionDelegate: () => ActionDelegate3,
  SourcesView: () => SourcesView,
  SwitchFileActionDelegate: () => SwitchFileActionDelegate,
  getRegisteredEditorActions: () => getRegisteredEditorActions,
  registerEditorAction: () => registerEditorAction
});
import "./../../ui/legacy/legacy.js";
import * as Common11 from "./../../core/common/common.js";
import * as Host7 from "./../../core/host/host.js";
import * as i18n31 from "./../../core/i18n/i18n.js";
import * as Platform11 from "./../../core/platform/platform.js";
import * as SDK9 from "./../../core/sdk/sdk.js";
import * as Bindings7 from "./../../models/bindings/bindings.js";
import * as Persistence11 from "./../../models/persistence/persistence.js";
import * as Workspace17 from "./../../models/workspace/workspace.js";
import * as IconButton8 from "./../../ui/components/icon_button/icon_button.js";
import * as QuickOpen from "./../../ui/legacy/components/quick_open/quick_open.js";
import * as SourceFrame12 from "./../../ui/legacy/components/source_frame/source_frame.js";
import * as UI16 from "./../../ui/legacy/legacy.js";
import * as VisualLogging9 from "./../../ui/visual_logging/visual_logging.js";
import * as Components2 from "./components/components.js";

// gen/front_end/panels/sources/EditingLocationHistoryManager.js
var EditingLocationHistoryManager_exports = {};
__export(EditingLocationHistoryManager_exports, {
  EditingLocationHistoryManager: () => EditingLocationHistoryManager,
  HistoryDepth: () => HistoryDepth
});
import * as Workspace11 from "./../../models/workspace/workspace.js";
import * as SourceFrame6 from "./../../ui/legacy/components/source_frame/source_frame.js";
var HistoryDepth = 20;
var EditingLocationHistoryManager = class {
  sourcesView;
  entries = [];
  current = -1;
  revealing = false;
  constructor(sourcesView) {
    this.sourcesView = sourcesView;
  }
  trackSourceFrameCursorJumps(sourceFrame) {
    sourceFrame.addEventListener("EditorUpdate", (event) => this.onEditorUpdate(event.data, sourceFrame));
  }
  onEditorUpdate(update, sourceFrame) {
    if (update.docChanged) {
      this.mapEntriesFor(sourceFrame.uiSourceCode(), update.changes);
    }
    const prevPos = update.startState.selection.main;
    const newPos = update.state.selection.main;
    const isJump = !this.revealing && prevPos.anchor !== newPos.anchor && update.transactions.some((tr) => {
      return Boolean(tr.isUserEvent("select.pointer") || tr.isUserEvent("select.reveal") || tr.isUserEvent("select.search"));
    });
    if (isJump) {
      this.updateCurrentState(sourceFrame.uiSourceCode(), prevPos.head);
      if (this.entries.length > this.current + 1) {
        this.entries.length = this.current + 1;
      }
      this.entries.push(new EditingLocationHistoryEntry(sourceFrame.uiSourceCode(), newPos.head));
      this.current++;
      if (this.entries.length > HistoryDepth) {
        this.entries.shift();
        this.current--;
      }
    }
  }
  updateCurrentState(uiSourceCode, position) {
    if (!this.revealing) {
      const top = this.current >= 0 ? this.entries[this.current] : null;
      if (top?.matches(uiSourceCode)) {
        top.position = position;
      }
    }
  }
  mapEntriesFor(uiSourceCode, change) {
    for (const entry of this.entries) {
      if (entry.matches(uiSourceCode)) {
        entry.position = change.mapPos(entry.position);
      }
    }
  }
  reveal(entry) {
    const uiSourceCode = Workspace11.Workspace.WorkspaceImpl.instance().uiSourceCode(entry.projectId, entry.url);
    if (uiSourceCode) {
      this.revealing = true;
      this.sourcesView.showSourceLocation(uiSourceCode, entry.position, false, true);
      this.revealing = false;
    }
  }
  rollback() {
    if (this.current > 0) {
      this.current--;
      this.reveal(this.entries[this.current]);
    }
  }
  rollover() {
    if (this.current < this.entries.length - 1) {
      this.current++;
      this.reveal(this.entries[this.current]);
    }
  }
  removeHistoryForSourceCode(uiSourceCode) {
    for (let i = this.entries.length - 1; i >= 0; i--) {
      if (this.entries[i].matches(uiSourceCode)) {
        this.entries.splice(i, 1);
        if (this.current >= i) {
          this.current--;
        }
      }
    }
  }
};
var EditingLocationHistoryEntry = class {
  projectId;
  url;
  position;
  constructor(uiSourceCode, position) {
    this.projectId = uiSourceCode.project().id();
    this.url = uiSourceCode.url();
    this.position = position;
  }
  matches(uiSourceCode) {
    return this.url === uiSourceCode.url() && this.projectId === uiSourceCode.project().id();
  }
};

// gen/front_end/panels/sources/sourcesView.css.js
var sourcesView_css_default = `/*
 * Copyright 2013 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

#sources-panel-sources-view {
  --override-highlight-animation-10pc-background-color: rgb(158 54 153);
  --override-highlight-animation-10pc-foreground-color: rgb(255 255 255);

  flex: auto;
  position: relative;
}

#sources-panel-sources-view .sources-toolbar {
  display: flex;
  flex: 0 0 auto;
  min-height: 27px;
  background-color: var(--sys-color-cdt-base-container);
  border-top: 1px solid var(--sys-color-divider);
  overflow: hidden;
  z-index: 0;
  align-items: flex-end;

  devtools-toolbar:first-of-type {
    flex-wrap: wrap;
  }
}

.source-frame-debugger-script {
  --override-debugger-background-tint: rgb(255 255 194 / 50%);

  background-color: var(--override-debugger-background-tint);
}

.theme-with-dark-background .source-frame-debugger-script {
  --override-debugger-background-tint: rgb(61 61 0 / 50%);
}

/*# sourceURL=${import.meta.resolve("./sourcesView.css")} */`;

// gen/front_end/panels/sources/TabbedEditorContainer.js
var TabbedEditorContainer_exports = {};
__export(TabbedEditorContainer_exports, {
  EditorContainerTabDelegate: () => EditorContainerTabDelegate,
  History: () => History,
  HistoryItem: () => HistoryItem,
  TabbedEditorContainer: () => TabbedEditorContainer
});
import * as Common10 from "./../../core/common/common.js";
import * as i18n29 from "./../../core/i18n/i18n.js";
import * as Platform9 from "./../../core/platform/platform.js";
import * as Persistence9 from "./../../models/persistence/persistence.js";
import * as TextUtils8 from "./../../models/text_utils/text_utils.js";
import * as Workspace15 from "./../../models/workspace/workspace.js";
import * as IconButton7 from "./../../ui/components/icon_button/icon_button.js";
import * as Tooltips from "./../../ui/components/tooltips/tooltips.js";
import * as uiI18n3 from "./../../ui/i18n/i18n.js";
import * as SourceFrame10 from "./../../ui/legacy/components/source_frame/source_frame.js";
import * as UI15 from "./../../ui/legacy/legacy.js";
import * as VisualLogging8 from "./../../ui/visual_logging/visual_logging.js";
import * as PanelCommon2 from "./../common/common.js";
import * as Snippets3 from "./../snippets/snippets.js";

// gen/front_end/panels/sources/UISourceCodeFrame.js
var UISourceCodeFrame_exports = {};
__export(UISourceCodeFrame_exports, {
  UISourceCodeFrame: () => UISourceCodeFrame
});
import * as Common9 from "./../../core/common/common.js";
import * as Host6 from "./../../core/host/host.js";
import * as i18n28 from "./../../core/i18n/i18n.js";
import * as Root2 from "./../../core/root/root.js";

// gen/front_end/entrypoints/formatter_worker/FormatterActions.js
var FORMATTABLE_MEDIA_TYPES = [
  "application/javascript",
  "application/json",
  "application/manifest+json",
  "text/css",
  "text/html",
  "text/javascript"
];

// gen/front_end/panels/sources/UISourceCodeFrame.js
import * as IssuesManager from "./../../models/issues_manager/issues_manager.js";
import * as Persistence7 from "./../../models/persistence/persistence.js";
import * as TextUtils6 from "./../../models/text_utils/text_utils.js";
import * as Workspace13 from "./../../models/workspace/workspace.js";
import * as CodeMirror5 from "./../../third_party/codemirror.next/codemirror.next.js";
import * as IconButton6 from "./../../ui/components/icon_button/icon_button.js";
import * as IssueCounter from "./../../ui/components/issue_counter/issue_counter.js";
import * as TextEditor5 from "./../../ui/components/text_editor/text_editor.js";
import * as SourceFrame8 from "./../../ui/legacy/components/source_frame/source_frame.js";
import * as UI14 from "./../../ui/legacy/legacy.js";

// gen/front_end/panels/sources/ProfilePlugin.js
import * as i18n22 from "./../../core/i18n/i18n.js";
import * as Platform7 from "./../../core/platform/platform.js";
import * as CodeMirror4 from "./../../third_party/codemirror.next/codemirror.next.js";
import * as SourceFrame7 from "./../../ui/legacy/components/source_frame/source_frame.js";
var UIStrings11 = {
  /**
   * @description The milisecond unit
   */
  ms: "ms",
  /**
   * @description Unit for data size in DevTools
   */
  mb: "MB",
  /**
   * @description A unit
   */
  kb: "kB"
};
var str_11 = i18n22.i18n.registerUIStrings("panels/sources/ProfilePlugin.ts", UIStrings11);
var i18nString10 = i18n22.i18n.getLocalizedString.bind(void 0, str_11);
var MemoryMarker = class extends CodeMirror4.GutterMarker {
  value;
  constructor(value2) {
    super();
    this.value = value2;
  }
  eq(other) {
    return this.value === other.value;
  }
  toDOM() {
    const element = document.createElement("div");
    element.className = "cm-profileMarker";
    let value2 = this.value;
    const intensity = Platform7.NumberUtilities.clamp(Math.log10(1 + 2e-3 * value2) / 5, 0.02, 1);
    element.style.backgroundColor = `hsla(217, 100%, 70%, ${intensity.toFixed(3)})`;
    value2 /= 1e3;
    let units;
    let fractionDigits;
    if (value2 >= 1e3) {
      units = i18nString10(UIStrings11.mb);
      value2 /= 1e3;
      fractionDigits = value2 >= 20 ? 0 : 1;
    } else {
      units = i18nString10(UIStrings11.kb);
      fractionDigits = 0;
    }
    element.textContent = value2.toFixed(fractionDigits);
    const unitElement = element.appendChild(document.createElement("span"));
    unitElement.className = "cm-units";
    unitElement.textContent = units;
    return element;
  }
};
var PerformanceMarker = class extends CodeMirror4.GutterMarker {
  value;
  constructor(value2) {
    super();
    this.value = value2;
  }
  eq(other) {
    return this.value === other.value;
  }
  toDOM() {
    const element = document.createElement("div");
    element.className = "cm-profileMarker";
    const intensity = Platform7.NumberUtilities.clamp(Math.log10(1 + 10 * this.value) / 5, 0.02, 1);
    element.textContent = this.value.toFixed(1);
    element.style.backgroundColor = `hsla(44, 100%, 50%, ${intensity.toFixed(3)})`;
    const span = document.createElement("span");
    span.className = "cm-units";
    span.textContent = i18nString10(UIStrings11.ms);
    element.appendChild(span);
    return element;
  }
};
function markersFromProfileData(map, state, type) {
  const markerType = type === "performance" ? PerformanceMarker : MemoryMarker;
  const markers = [];
  for (const [line, value2] of map) {
    if (line <= state.doc.lines) {
      const { from } = state.doc.line(line);
      markers.push(new markerType(value2).range(from));
    }
  }
  return CodeMirror4.RangeSet.of(markers, true);
}
var makeLineLevelProfilePlugin = (type) => class extends Plugin {
  updateEffect = CodeMirror4.StateEffect.define();
  field;
  gutter;
  compartment = new CodeMirror4.Compartment();
  constructor(uiSourceCode) {
    super(uiSourceCode);
    this.field = CodeMirror4.StateField.define({
      create() {
        return CodeMirror4.RangeSet.empty;
      },
      update: (markers, tr) => {
        return tr.effects.reduce((markers2, effect) => {
          return effect.is(this.updateEffect) ? markersFromProfileData(effect.value, tr.state, type) : markers2;
        }, markers.map(tr.changes));
      }
    });
    this.gutter = CodeMirror4.gutter({
      markers: (view) => view.state.field(this.field),
      class: `cm-${type}Gutter`
    });
  }
  static accepts(uiSourceCode) {
    return uiSourceCode.contentType().hasScripts();
  }
  getLineMap() {
    return this.uiSourceCode.getDecorationData(type);
  }
  editorExtension() {
    const map = this.getLineMap();
    return this.compartment.of(!map ? [] : [this.field.init((state) => markersFromProfileData(map, state, type)), this.gutter, theme3]);
  }
  decorationChanged(type2, editor) {
    const installed = Boolean(editor.state.field(this.field, false));
    const map = this.getLineMap();
    if (!map) {
      if (installed) {
        editor.dispatch({ effects: this.compartment.reconfigure([]) });
      }
    } else if (!installed) {
      editor.dispatch({
        effects: this.compartment.reconfigure([this.field.init((state) => markersFromProfileData(map, state, type2)), this.gutter, theme3])
      });
    } else {
      editor.dispatch({ effects: this.updateEffect.of(map) });
    }
  }
};
var theme3 = CodeMirror4.EditorView.baseTheme({
  ".cm-line::selection": {
    backgroundColor: "transparent",
    color: "currentColor"
  },
  ".cm-performanceGutter": {
    width: "60px",
    backgroundColor: "var(--sys-color-cdt-base-container)",
    marginLeft: "3px"
  },
  ".cm-memoryGutter": {
    width: "48px",
    backgroundColor: "var(--sys-color-cdt-base-container)",
    marginLeft: "3px"
  },
  ".cm-profileMarker": {
    textAlign: "right",
    paddingRight: "3px"
  },
  ".cm-profileMarker .cm-units": {
    color: "var(--sys-color-token-subtle)",
    fontSize: "75%",
    marginLeft: "3px"
  }
});
var MemoryProfilePlugin = makeLineLevelProfilePlugin(
  "memory"
  /* SourceFrame.SourceFrame.DecoratorType.MEMORY */
);
var PerformanceProfilePlugin = makeLineLevelProfilePlugin(
  "performance"
  /* SourceFrame.SourceFrame.DecoratorType.PERFORMANCE */
);

// gen/front_end/panels/sources/ResourceOriginPlugin.js
var ResourceOriginPlugin_exports = {};
__export(ResourceOriginPlugin_exports, {
  ResourceOriginPlugin: () => ResourceOriginPlugin
});
import * as i18n24 from "./../../core/i18n/i18n.js";
import * as Bindings6 from "./../../models/bindings/bindings.js";
import * as uiI18n2 from "./../../ui/i18n/i18n.js";
import * as Components from "./../../ui/legacy/components/utils/utils.js";
import * as UI12 from "./../../ui/legacy/legacy.js";
var UIStrings12 = {
  /**
   * @description Text in the bottom toolbar of the Sources panel that lists the source mapped origin scripts.
   * @example {bundle.min.js} PH1
   */
  fromS: "(From {PH1})",
  /**
   * @description Tooltip text for links in the bottom toolbar of the Sources panel that point to source mapped scripts.
   * @example {bundle.min.js} PH1
   */
  sourceMappedFromS: "(Source mapped from {PH1})"
};
var str_12 = i18n24.i18n.registerUIStrings("panels/sources/ResourceOriginPlugin.ts", UIStrings12);
var i18nString11 = i18n24.i18n.getLocalizedString.bind(void 0, str_12);
var ResourceOriginPlugin = class extends Plugin {
  #linkifier = new Components.Linkifier.Linkifier();
  static accepts(uiSourceCode) {
    const contentType = uiSourceCode.contentType();
    return contentType.hasScripts() || contentType.isFromSourceMap();
  }
  rightToolbarItems() {
    const debuggerWorkspaceBinding = Bindings6.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance();
    if (this.uiSourceCode.contentType().isFromSourceMap()) {
      const links = [];
      for (const script of debuggerWorkspaceBinding.scriptsForUISourceCode(this.uiSourceCode)) {
        const uiSourceCode = debuggerWorkspaceBinding.uiSourceCodeForScript(script);
        if (!uiSourceCode) {
          continue;
        }
        const url = uiSourceCode.url();
        const text = Bindings6.ResourceUtils.displayNameForURL(url);
        const title = i18nString11(UIStrings12.sourceMappedFromS, { PH1: text });
        links.push(Components.Linkifier.Linkifier.linkifyRevealable(uiSourceCode, text, url, title, void 0, "original-script-location"));
      }
      for (const originURL of Bindings6.SASSSourceMapping.SASSSourceMapping.uiSourceOrigin(this.uiSourceCode)) {
        links.push(Components.Linkifier.Linkifier.linkifyURL(originURL));
      }
      if (links.length === 0) {
        return [];
      }
      const element = document.createElement("span");
      links.forEach((link2, index) => {
        if (index > 0) {
          element.append(", ");
        }
        element.append(link2);
      });
      return [new UI12.Toolbar.ToolbarItem(uiI18n2.getFormatLocalizedString(str_12, UIStrings12.fromS, { PH1: element }))];
    }
    for (const script of debuggerWorkspaceBinding.scriptsForUISourceCode(this.uiSourceCode)) {
      if (script.originStackTrace?.callFrames.length) {
        const link2 = this.#linkifier.linkifyStackTraceTopFrame(script.debuggerModel.target(), script.originStackTrace);
        return [new UI12.Toolbar.ToolbarItem(uiI18n2.getFormatLocalizedString(str_12, UIStrings12.fromS, { PH1: link2 }))];
      }
    }
    return [];
  }
  dispose() {
    this.#linkifier.dispose();
  }
};

// gen/front_end/panels/sources/SnippetsPlugin.js
var SnippetsPlugin_exports = {};
__export(SnippetsPlugin_exports, {
  SnippetsPlugin: () => SnippetsPlugin
});
import * as Host5 from "./../../core/host/host.js";
import * as i18n26 from "./../../core/i18n/i18n.js";
import * as TextEditor4 from "./../../ui/components/text_editor/text_editor.js";
import * as UI13 from "./../../ui/legacy/legacy.js";
import * as Snippets2 from "./../snippets/snippets.js";
var UIStrings13 = {
  /**
   * @description Text in Snippets Plugin of the Sources panel
   */
  enter: "\u2318+Enter",
  /**
   * @description Text in Snippets Plugin of the Sources panel
   */
  ctrlenter: "Ctrl+Enter"
};
var str_13 = i18n26.i18n.registerUIStrings("panels/sources/SnippetsPlugin.ts", UIStrings13);
var i18nString12 = i18n26.i18n.getLocalizedString.bind(void 0, str_13);
var SnippetsPlugin = class extends Plugin {
  static accepts(uiSourceCode) {
    return Snippets2.ScriptSnippetFileSystem.isSnippetsUISourceCode(uiSourceCode);
  }
  rightToolbarItems() {
    const runSnippet = UI13.Toolbar.Toolbar.createActionButton("debugger.run-snippet");
    runSnippet.setText(Host5.Platform.isMac() ? i18nString12(UIStrings13.enter) : i18nString12(UIStrings13.ctrlenter));
    runSnippet.setReducedFocusRing();
    return [runSnippet];
  }
  editorExtension() {
    return TextEditor4.JavaScript.completion();
  }
};

// gen/front_end/panels/sources/UISourceCodeFrame.js
var UISourceCodeFrame = class _UISourceCodeFrame extends Common9.ObjectWrapper.eventMixin(SourceFrame8.SourceFrame.SourceFrameImpl) {
  #uiSourceCode;
  #muteSourceCodeEvents = false;
  #persistenceBinding;
  #uiSourceCodeEventListeners = [];
  #messageAndDecorationListeners = [];
  #boundOnBindingChanged;
  // The active plugins. These are created in setContent, and
  // recreated when the binding changes
  // Used in web tests
  plugins = [];
  #errorPopoverHelper;
  #sourcesPanelOpenedMetricsRecorded = false;
  constructor(uiSourceCode) {
    super(() => this.workingCopy());
    this.#uiSourceCode = uiSourceCode;
    this.#persistenceBinding = Persistence7.Persistence.PersistenceImpl.instance().binding(uiSourceCode);
    this.#boundOnBindingChanged = this.onBindingChanged.bind(this);
    Common9.Settings.Settings.instance().moduleSetting("persistence-network-overrides-enabled").addChangeListener(this.onNetworkPersistenceChanged, this);
    this.#errorPopoverHelper = new UI14.PopoverHelper.PopoverHelper(this.textEditor.editor.contentDOM, this.getErrorPopoverContent.bind(this), "sources.error");
    this.#errorPopoverHelper.setTimeout(100, 100);
    this.initializeUISourceCode();
  }
  async workingCopy() {
    if (this.#uiSourceCode.isDirty()) {
      return this.#uiSourceCode.workingCopyContentData();
    }
    return await this.#uiSourceCode.requestContentData();
  }
  editorConfiguration(doc) {
    return [
      super.editorConfiguration(doc),
      rowMessages(this.allMessages()),
      TextEditor5.Config.sourcesWordWrap.instance(),
      // Inject editor extensions from plugins
      pluginCompartment.of(this.plugins.map((plugin) => plugin.editorExtension()))
    ];
  }
  onFocus() {
    super.onFocus();
    UI14.Context.Context.instance().setFlavor(_UISourceCodeFrame, this);
  }
  onBlur() {
    super.onBlur();
    UI14.Context.Context.instance().setFlavor(_UISourceCodeFrame, null);
  }
  installMessageAndDecorationListeners() {
    if (this.#persistenceBinding) {
      const networkSourceCode = this.#persistenceBinding.network;
      const fileSystemSourceCode = this.#persistenceBinding.fileSystem;
      this.#messageAndDecorationListeners = [
        networkSourceCode.addEventListener(Workspace13.UISourceCode.Events.MessageAdded, this.onMessageAdded, this),
        networkSourceCode.addEventListener(Workspace13.UISourceCode.Events.MessageRemoved, this.onMessageRemoved, this),
        networkSourceCode.addEventListener(Workspace13.UISourceCode.Events.DecorationChanged, this.onDecorationChanged, this),
        fileSystemSourceCode.addEventListener(Workspace13.UISourceCode.Events.MessageAdded, this.onMessageAdded, this),
        fileSystemSourceCode.addEventListener(Workspace13.UISourceCode.Events.MessageRemoved, this.onMessageRemoved, this)
      ];
    } else {
      this.#messageAndDecorationListeners = [
        this.#uiSourceCode.addEventListener(Workspace13.UISourceCode.Events.MessageAdded, this.onMessageAdded, this),
        this.#uiSourceCode.addEventListener(Workspace13.UISourceCode.Events.MessageRemoved, this.onMessageRemoved, this),
        this.#uiSourceCode.addEventListener(Workspace13.UISourceCode.Events.DecorationChanged, this.onDecorationChanged, this)
      ];
    }
  }
  uiSourceCode() {
    return this.#uiSourceCode;
  }
  setUISourceCode(uiSourceCode) {
    const loaded = uiSourceCode.contentLoaded() ? Promise.resolve() : uiSourceCode.requestContentData();
    const startUISourceCode = this.#uiSourceCode;
    loaded.then(async () => {
      if (this.#uiSourceCode !== startUISourceCode) {
        return;
      }
      this.unloadUISourceCode();
      this.#uiSourceCode = uiSourceCode;
      if (uiSourceCode.workingCopy() !== this.textEditor.state.doc.toString()) {
        await this.setContentDataOrError(Promise.resolve(uiSourceCode.workingCopyContentData()));
      } else {
        this.reloadPlugins();
      }
      this.initializeUISourceCode();
    }, console.error);
  }
  unloadUISourceCode() {
    Common9.EventTarget.removeEventListeners(this.#messageAndDecorationListeners);
    Common9.EventTarget.removeEventListeners(this.#uiSourceCodeEventListeners);
    this.#uiSourceCode.removeWorkingCopyGetter();
    Persistence7.Persistence.PersistenceImpl.instance().unsubscribeFromBindingEvent(this.#uiSourceCode, this.#boundOnBindingChanged);
  }
  initializeUISourceCode() {
    this.#uiSourceCodeEventListeners = [
      this.#uiSourceCode.addEventListener(Workspace13.UISourceCode.Events.WorkingCopyChanged, this.onWorkingCopyChanged, this),
      this.#uiSourceCode.addEventListener(Workspace13.UISourceCode.Events.WorkingCopyCommitted, this.onWorkingCopyCommitted, this),
      this.#uiSourceCode.addEventListener(Workspace13.UISourceCode.Events.TitleChanged, this.onTitleChanged, this)
    ];
    Persistence7.Persistence.PersistenceImpl.instance().subscribeForBindingEvent(this.#uiSourceCode, this.#boundOnBindingChanged);
    this.installMessageAndDecorationListeners();
    this.updateStyle();
    const canPrettyPrint = FORMATTABLE_MEDIA_TYPES.includes(this.contentType) && !this.#uiSourceCode.project().canSetFileContent() && Persistence7.Persistence.PersistenceImpl.instance().binding(this.#uiSourceCode) === null;
    const autoPrettyPrint = !this.#uiSourceCode.contentType().isFromSourceMap();
    this.setCanPrettyPrint(canPrettyPrint, autoPrettyPrint);
  }
  wasShown() {
    super.wasShown();
    this.setEditable(this.#canEditSource());
  }
  willHide() {
    for (const plugin of this.plugins) {
      plugin.willHide();
    }
    super.willHide();
    UI14.Context.Context.instance().setFlavor(_UISourceCodeFrame, null);
    this.#uiSourceCode.removeWorkingCopyGetter();
  }
  getContentType() {
    const binding = Persistence7.Persistence.PersistenceImpl.instance().binding(this.#uiSourceCode);
    const mimeType = binding ? binding.network.mimeType() : this.#uiSourceCode.mimeType();
    return Common9.ResourceType.ResourceType.simplifyContentType(mimeType);
  }
  #canEditSource() {
    if (this.hasLoadError()) {
      return false;
    }
    if (this.#uiSourceCode.editDisabled()) {
      return false;
    }
    if (this.#uiSourceCode.mimeType() === "application/wasm") {
      return false;
    }
    if (Persistence7.Persistence.PersistenceImpl.instance().binding(this.#uiSourceCode)) {
      return true;
    }
    if (this.#uiSourceCode.project().canSetFileContent()) {
      return true;
    }
    if (this.#uiSourceCode.project().isServiceProject()) {
      return false;
    }
    if (this.#uiSourceCode.contentType().isFromSourceMap()) {
      return false;
    }
    if (this.#uiSourceCode.project().type() === Workspace13.Workspace.projectTypes.Network && Persistence7.NetworkPersistenceManager.NetworkPersistenceManager.instance().active()) {
      return true;
    }
    if (this.pretty && this.#uiSourceCode.contentType().hasScripts()) {
      return false;
    }
    return this.#uiSourceCode.contentType() !== Common9.ResourceType.resourceTypes.Document;
  }
  onNetworkPersistenceChanged() {
    this.setEditable(this.#canEditSource());
  }
  commitEditing() {
    if (!this.#uiSourceCode.isDirty()) {
      return;
    }
    this.#muteSourceCodeEvents = true;
    this.#uiSourceCode.commitWorkingCopy();
    this.#muteSourceCodeEvents = false;
  }
  async setContent(content) {
    this.disposePlugins();
    this.loadPlugins();
    await super.setContent(content);
    for (const plugin of this.plugins) {
      plugin.editorInitialized(this.textEditor);
    }
    this.#recordSourcesPanelOpenedMetrics();
    Common9.EventTarget.fireEvent("source-file-loaded", this.#uiSourceCode.displayName(true));
  }
  createMessage(origin) {
    const { lineNumber, columnNumber } = this.uiLocationToEditorLocation(origin.lineNumber(), origin.columnNumber());
    return new RowMessage(origin, lineNumber, columnNumber);
  }
  allMessages() {
    const origins = this.#persistenceBinding !== null ? [...this.#persistenceBinding.network.messages(), ...this.#persistenceBinding.fileSystem.messages()] : [...this.#uiSourceCode.messages()];
    return origins.map((origin) => this.createMessage(origin));
  }
  onTextChanged() {
    const wasPretty = this.pretty;
    super.onTextChanged();
    this.#errorPopoverHelper.hidePopover();
    SourcesPanel.instance().updateLastModificationTime();
    this.#muteSourceCodeEvents = true;
    this.#uiSourceCode.setWorkingCopyGetter(() => this.textEditor.state.sliceDoc());
    this.#muteSourceCodeEvents = false;
    if (wasPretty !== this.pretty) {
      this.updateStyle();
      this.reloadPlugins();
    }
  }
  onWorkingCopyChanged() {
    if (this.#muteSourceCodeEvents) {
      return;
    }
    this.maybeSetContent(this.#uiSourceCode.workingCopyContentData());
  }
  onWorkingCopyCommitted() {
    if (!this.#muteSourceCodeEvents) {
      this.maybeSetContent(this.uiSourceCode().workingCopyContentData());
    }
    this.contentCommitted();
    this.updateStyle();
  }
  reloadPlugins() {
    this.disposePlugins();
    this.loadPlugins();
    const editor = this.textEditor;
    editor.dispatch({ effects: pluginCompartment.reconfigure(this.plugins.map((plugin) => plugin.editorExtension())) });
    for (const plugin of this.plugins) {
      plugin.editorInitialized(editor);
    }
  }
  onTitleChanged() {
    this.updateLanguageMode("").then(() => this.reloadPlugins(), console.error);
  }
  static sourceFramePlugins() {
    const sourceFramePluginsList = [
      CSSPlugin,
      DebuggerPlugin,
      SnippetsPlugin,
      ResourceOriginPlugin,
      CoveragePlugin,
      MemoryProfilePlugin,
      PerformanceProfilePlugin,
      AiWarningInfobarPlugin
    ];
    if (this.#isAiCodeCompletionEnabled()) {
      sourceFramePluginsList.push(AiCodeCompletionPlugin);
    }
    return sourceFramePluginsList;
  }
  loadPlugins() {
    const binding = Persistence7.Persistence.PersistenceImpl.instance().binding(this.#uiSourceCode);
    const pluginUISourceCode = binding ? binding.network : this.#uiSourceCode;
    for (const pluginType of _UISourceCodeFrame.sourceFramePlugins()) {
      if (pluginType.accepts(pluginUISourceCode)) {
        this.plugins.push(new pluginType(pluginUISourceCode, this));
      }
    }
    this.dispatchEventToListeners(
      "ToolbarItemsChanged"
      /* Events.TOOLBAR_ITEMS_CHANGED */
    );
  }
  disposePlugins() {
    for (const plugin of this.plugins) {
      plugin.dispose();
    }
    this.plugins = [];
  }
  onBindingChanged() {
    const binding = Persistence7.Persistence.PersistenceImpl.instance().binding(this.#uiSourceCode);
    if (binding === this.#persistenceBinding) {
      return;
    }
    this.unloadUISourceCode();
    this.#persistenceBinding = binding;
    this.initializeUISourceCode();
    this.reloadMessages();
    this.reloadPlugins();
  }
  reloadMessages() {
    const messages = this.allMessages();
    const { editor } = this.textEditor;
    editor.dispatch({ effects: setRowMessages.of(RowMessages.create(messages)) });
  }
  updateStyle() {
    this.setEditable(this.#canEditSource());
  }
  maybeSetContent(content) {
    if (this.textEditor.state.doc.toString() !== content.text) {
      void this.setContentDataOrError(Promise.resolve(content));
    }
  }
  populateTextAreaContextMenu(contextMenu, lineNumber, columnNumber) {
    super.populateTextAreaContextMenu(contextMenu, lineNumber, columnNumber);
    contextMenu.appendApplicableItems(this.#uiSourceCode);
    const location = this.editorLocationToUILocation(lineNumber, columnNumber);
    contextMenu.appendApplicableItems(new Workspace13.UISourceCode.UILocation(this.#uiSourceCode, location.lineNumber, location.columnNumber));
    for (const plugin of this.plugins) {
      plugin.populateTextAreaContextMenu(contextMenu, lineNumber, columnNumber);
    }
  }
  populateLineGutterContextMenu(contextMenu, lineNumber) {
    super.populateLineGutterContextMenu(contextMenu, lineNumber);
    for (const plugin of this.plugins) {
      plugin.populateLineGutterContextMenu(contextMenu, lineNumber);
    }
  }
  dispose() {
    this.#errorPopoverHelper.dispose();
    this.disposePlugins();
    this.unloadUISourceCode();
    this.textEditor.editor.destroy();
    this.detach();
    Common9.Settings.Settings.instance().moduleSetting("persistence-network-overrides-enabled").removeChangeListener(this.onNetworkPersistenceChanged, this);
  }
  onMessageAdded(event) {
    const { editor } = this.textEditor, shownMessages = editor.state.field(showRowMessages, false);
    if (shownMessages) {
      const message = this.createMessage(event.data);
      editor.dispatch({ effects: setRowMessages.of(shownMessages.messages.add(message)) });
    }
  }
  onMessageRemoved(event) {
    const { editor } = this.textEditor, shownMessages = editor.state.field(showRowMessages, false);
    if (shownMessages) {
      const message = this.createMessage(event.data);
      editor.dispatch({ effects: setRowMessages.of(shownMessages.messages.remove(message)) });
    }
  }
  onDecorationChanged(event) {
    for (const plugin of this.plugins) {
      plugin.decorationChanged(event.data, this.textEditor);
    }
  }
  async toolbarItems() {
    const leftToolbarItems = await super.toolbarItems();
    const rightToolbarItems = [];
    for (const plugin of this.plugins) {
      leftToolbarItems.push(...plugin.leftToolbarItems());
      rightToolbarItems.push(...plugin.rightToolbarItems());
    }
    if (!rightToolbarItems.length) {
      return leftToolbarItems;
    }
    return [...leftToolbarItems, new UI14.Toolbar.ToolbarSeparator(true), ...rightToolbarItems];
  }
  getErrorPopoverContent(event) {
    const mouseEvent = event;
    const eventTarget = event.target;
    const anchorElement = eventTarget.enclosingNodeOrSelfWithClass("cm-messageIcon-error") || eventTarget.enclosingNodeOrSelfWithClass("cm-messageIcon-issue");
    if (!anchorElement) {
      return null;
    }
    const messageField = this.textEditor.state.field(showRowMessages, false);
    if (!messageField || messageField.messages.rows.length === 0) {
      return null;
    }
    const { editor } = this.textEditor;
    const position = editor.posAtCoords(mouseEvent);
    if (position === null) {
      return null;
    }
    const line = editor.state.doc.lineAt(position);
    if (position !== line.to) {
      return null;
    }
    const row = messageField.messages.rows.find((row2) => row2[0].lineNumber() === line.number - 1);
    if (!row) {
      return null;
    }
    const issues = anchorElement.classList.contains("cm-messageIcon-issue");
    const messages = row.filter((msg) => msg.level() === "Issue" === issues);
    if (!messages.length) {
      return null;
    }
    const anchor = anchorElement ? anchorElement.boxInWindow() : new AnchorBox(mouseEvent.clientX, mouseEvent.clientY, 1, 1);
    const counts = countDuplicates(messages);
    const element = document.createElement("div");
    element.classList.add("text-editor-messages-description-container");
    for (let i = 0; i < messages.length; i++) {
      if (counts[i]) {
        element.appendChild(renderMessage(messages[i], counts[i]));
      }
    }
    return {
      box: anchor,
      hide() {
      },
      show: async (popover) => {
        popover.contentElement.append(element);
        return true;
      }
    };
  }
  /**
   * Only records metrics once per UISourceCodeFrame instance and must only be
   * called once the content of the UISourceCode is available.
   */
  #recordSourcesPanelOpenedMetrics() {
    if (this.#sourcesPanelOpenedMetricsRecorded) {
      return;
    }
    this.#sourcesPanelOpenedMetricsRecorded = true;
    const mimeType = Common9.ResourceType.ResourceType.mimeFromURL(this.#uiSourceCode.url());
    const mediaType = Common9.ResourceType.ResourceType.mediaTypeForMetrics(mimeType ?? "", this.#uiSourceCode.contentType().isFromSourceMap(), TextUtils6.TextUtils.isMinified(this.#uiSourceCode.content()), this.#uiSourceCode.url().startsWith("snippet://"), this.#uiSourceCode.url().startsWith("debugger://"));
    Host6.userMetrics.sourcesPanelFileOpened(mediaType);
  }
  static #isAiCodeCompletionEnabled() {
    const devtoolsLocale = i18n28.DevToolsLocale.DevToolsLocale.instance();
    const aidaAvailability = Root2.Runtime.hostConfig.aidaAvailability;
    if (!devtoolsLocale.locale.startsWith("en-")) {
      return false;
    }
    if (aidaAvailability?.blockedByGeo) {
      return false;
    }
    if (aidaAvailability?.blockedByAge) {
      return false;
    }
    return Boolean(aidaAvailability?.enabled && Root2.Runtime.hostConfig.devToolsAiCodeCompletion?.enabled);
  }
};
function getIconDataForLevel(level) {
  if (level === "Error") {
    return { color: "var(--icon-error)", width: "16px", height: "14px", iconName: "cross-circle-filled" };
  }
  if (level === "Warning") {
    return { color: "var(--icon-warning)", width: "18px", height: "14px", iconName: "warning-filled" };
  }
  if (level === "Issue") {
    return { color: "var(--icon-warning)", width: "17px", height: "14px", iconName: "issue-exclamation-filled" };
  }
  return { color: "var(--icon-error)", width: "16px", height: "14px", iconName: "cross-circle-filled" };
}
function getBubbleTypePerLevel(level) {
  switch (level) {
    case "Error":
      return "error";
    case "Warning":
      return "warning";
    case "Issue":
      return "warning";
  }
}
function messageLevelComparator(a, b) {
  const messageLevelPriority = {
    [
      "Issue"
      /* Workspace.UISourceCode.Message.Level.ISSUE */
    ]: 2,
    [
      "Warning"
      /* Workspace.UISourceCode.Message.Level.WARNING */
    ]: 3,
    [
      "Error"
      /* Workspace.UISourceCode.Message.Level.ERROR */
    ]: 4
  };
  return messageLevelPriority[a.level()] - messageLevelPriority[b.level()];
}
function getIconDataForMessage(message) {
  if (message.origin instanceof IssuesManager.SourceFrameIssuesManager.IssueMessage) {
    return { iconName: IssueCounter.IssueCounter.getIssueKindIconName(message.origin.getIssueKind()) };
  }
  return getIconDataForLevel(message.level());
}
var pluginCompartment = new CodeMirror5.Compartment();
var RowMessage = class {
  origin;
  #lineNumber;
  #columnNumber;
  constructor(origin, lineNumber, columnNumber) {
    this.origin = origin;
    this.#lineNumber = lineNumber;
    this.#columnNumber = columnNumber;
  }
  level() {
    return this.origin.level();
  }
  text() {
    return this.origin.text();
  }
  clickHandler() {
    return this.origin.clickHandler();
  }
  lineNumber() {
    return this.#lineNumber;
  }
  columnNumber() {
    return this.#columnNumber;
  }
  isEqual(that) {
    return this.origin.isEqual(that.origin);
  }
};
function addMessage(rows, message) {
  const lineNumber = message.lineNumber();
  let i = 0;
  for (; i < rows.length; i++) {
    const diff = rows[i][0].lineNumber() - lineNumber;
    if (diff === 0) {
      rows[i] = rows[i].concat(message);
      return rows;
    }
    if (diff > 0) {
      break;
    }
  }
  rows.splice(i, 0, [message]);
  return rows;
}
function removeMessage(rows, message) {
  for (let i = 0; i < rows.length; i++) {
    if (rows[i][0].lineNumber() === message.lineNumber()) {
      const remaining = rows[i].filter((m) => !m.isEqual(message));
      if (remaining.length) {
        rows[i] = remaining;
      } else {
        rows.splice(i, 1);
      }
      break;
    }
  }
}
var RowMessages = class _RowMessages {
  rows;
  constructor(rows) {
    this.rows = rows;
  }
  static create(messages) {
    const rows = [];
    for (const message of messages) {
      addMessage(rows, message);
    }
    return new _RowMessages(rows);
  }
  remove(message) {
    const rows = this.rows.slice();
    removeMessage(rows, message);
    return new _RowMessages(rows);
  }
  add(message) {
    return new _RowMessages(addMessage(this.rows.slice(), message));
  }
};
var setRowMessages = CodeMirror5.StateEffect.define();
var underlineMark = CodeMirror5.Decoration.mark({ class: "cm-waveUnderline" });
var MessageWidget = class extends CodeMirror5.WidgetType {
  messages;
  constructor(messages) {
    super();
    this.messages = messages;
  }
  eq(other) {
    return other.messages === this.messages;
  }
  toDOM() {
    const wrap = document.createElement("span");
    wrap.classList.add("cm-messageIcon");
    const nonIssues = this.messages.filter(
      (msg) => msg.level() !== "Issue"
      /* Workspace.UISourceCode.Message.Level.ISSUE */
    );
    if (nonIssues.length) {
      const maxIssue = nonIssues.sort(messageLevelComparator)[nonIssues.length - 1];
      const iconData = getIconDataForLevel(maxIssue.level());
      const errorIcon = createIconFromIconData(iconData);
      wrap.appendChild(errorIcon);
      errorIcon.classList.add("cm-messageIcon-error");
    }
    const issue = this.messages.find(
      (m) => m.level() === "Issue"
      /* Workspace.UISourceCode.Message.Level.ISSUE */
    );
    if (issue) {
      const iconData = getIconDataForMessage(issue);
      const issueIcon = createIconFromIconData(iconData);
      wrap.appendChild(issueIcon);
      issueIcon.classList.add("cm-messageIcon-issue", "extra-small");
      issueIcon.addEventListener("click", () => (issue.clickHandler() || Math.min)());
    }
    return wrap;
  }
};
var RowMessageDecorations = class _RowMessageDecorations {
  messages;
  decorations;
  constructor(messages, decorations) {
    this.messages = messages;
    this.decorations = decorations;
  }
  static create(messages, doc) {
    const builder = new CodeMirror5.RangeSetBuilder();
    for (const row of messages.rows) {
      const line = doc.line(Math.min(doc.lines, row[0].lineNumber() + 1));
      const minCol = row.reduce((col, msg) => Math.min(col, msg.columnNumber() || 0), line.length);
      if (minCol < line.length) {
        builder.add(line.from + minCol, line.to, underlineMark);
      }
      builder.add(line.to, line.to, CodeMirror5.Decoration.widget({ side: 1, widget: new MessageWidget(row) }));
    }
    return new _RowMessageDecorations(messages, builder.finish());
  }
  apply(tr) {
    let result = this;
    if (tr.docChanged) {
      result = new _RowMessageDecorations(this.messages, this.decorations.map(tr.changes));
    }
    for (const effect of tr.effects) {
      if (effect.is(setRowMessages)) {
        result = _RowMessageDecorations.create(effect.value, tr.state.doc);
      }
    }
    return result;
  }
};
function createIconFromIconData(data) {
  const icon = new IconButton6.Icon.Icon();
  icon.name = data.iconName;
  if (data.width) {
    icon.style.width = data.width;
  }
  if (data.height) {
    icon.style.height = data.height;
  }
  return icon;
}
var showRowMessages = CodeMirror5.StateField.define({
  create(state) {
    return RowMessageDecorations.create(new RowMessages([]), state.doc);
  },
  update(value2, tr) {
    return value2.apply(tr);
  },
  provide: (field) => CodeMirror5.Prec.lowest(CodeMirror5.EditorView.decorations.from(field, (value2) => value2.decorations))
});
function countDuplicates(messages) {
  const counts = [];
  for (let i = 0; i < messages.length; i++) {
    counts[i] = 0;
    for (let j = 0; j <= i; j++) {
      if (messages[j].isEqual(messages[i])) {
        counts[j]++;
        break;
      }
    }
  }
  return counts;
}
function renderMessage(message, count) {
  const element = document.createElement("div");
  element.classList.add("text-editor-row-message");
  element.style.display = "flex";
  element.style.alignItems = "center";
  element.style.gap = "4px";
  if (count === 1) {
    const data = getIconDataForMessage(message);
    const icon = createIconFromIconData(data);
    element.appendChild(icon);
    icon.classList.add("text-editor-row-message-icon", "extra-small");
    icon.addEventListener("click", () => (message.clickHandler() || Math.min)());
  } else {
    const repeatCountElement = element.createChild("dt-small-bubble", "text-editor-row-message-repeat-count");
    repeatCountElement.textContent = String(count);
    repeatCountElement.style.flexShrink = "0";
    repeatCountElement.type = getBubbleTypePerLevel(message.level());
  }
  const linesContainer = element.createChild("div");
  for (const line of message.text().split("\n")) {
    linesContainer.createChild("div").textContent = line;
  }
  return element;
}
var rowMessageTheme = CodeMirror5.EditorView.baseTheme({
  ".cm-line::selection": {
    backgroundColor: "transparent",
    color: "currentColor"
  },
  ".cm-tooltip-message": {
    padding: "4px"
  },
  ".cm-waveUnderline": {
    backgroundImage: "var(--image-file-errorWave)",
    backgroundRepeat: "repeat-x",
    backgroundPosition: "bottom",
    paddingBottom: "1px"
  },
  ".cm-messageIcon": {
    cursor: "pointer",
    "& > *": {
      verticalAlign: "text-bottom",
      marginLeft: "2px"
    }
  },
  ".cm-messageIcon-issue, .cm-messageIcon-error": {
    marginTop: "-1px",
    marginBottom: "-1px"
  }
});
function rowMessages(initialMessages) {
  return [
    showRowMessages.init((state) => RowMessageDecorations.create(RowMessages.create(initialMessages), state.doc)),
    rowMessageTheme
  ];
}

// gen/front_end/panels/sources/TabbedEditorContainer.js
var UIStrings14 = {
  /**
   * @description Text in Tabbed Editor Container of the Sources panel
   * @example {example.file} PH1
   */
  areYouSureYouWantToCloseUnsaved: "Are you sure you want to close unsaved file: {PH1}?",
  /**
   * @description Error message for tooltip showing that a file in Sources could not be loaded
   */
  unableToLoadThisContent: "Unable to load this content.",
  /**
   * @description Tooltip shown for the warning icon on an editor tab in the Sources panel
   *              when the developer saved changes via Ctrl+S/Cmd+S, while there was an
   *              automatic workspace detected, but not connected.
   * @example {FolderName} PH1
   */
  changesWereNotSavedToFileSystemToSaveAddFolderToWorkspace: "Changes weren't saved to file system. To save, add {PH1} to your Workspace.",
  /**
   * @description Tooltip shown for the warning icon on an editor tab in the Sources panel
   *              when the developer saved changes via Ctrl+S/Cmd+S, but didn't have a Workspace
   *              set up, or the Workspace didn't have a match for this file, and therefore the
   *              changes couldn't be persisted.
   * @example {Workspace} PH1
   */
  changesWereNotSavedToFileSystemToSaveSetUpYourWorkspace: "Changes weren't saved to file system. To save, set up your {PH1}."
};
var str_14 = i18n29.i18n.registerUIStrings("panels/sources/TabbedEditorContainer.ts", UIStrings14);
var i18nString13 = i18n29.i18n.getLocalizedString.bind(void 0, str_14);
var tabId = 0;
var TabbedEditorContainer = class extends Common10.ObjectWrapper.ObjectWrapper {
  delegate;
  tabbedPane;
  tabIds;
  files;
  previouslyViewedFilesSetting;
  history;
  uriToUISourceCode;
  idToUISourceCode;
  #currentFile;
  currentView;
  scrollTimer;
  reentrantShow;
  constructor(delegate, setting, placeholderElement, focusedPlaceholderElement) {
    super();
    this.delegate = delegate;
    this.tabbedPane = new UI15.TabbedPane.TabbedPane();
    this.tabbedPane.setPlaceholderElement(placeholderElement, focusedPlaceholderElement);
    this.tabbedPane.setTabDelegate(new EditorContainerTabDelegate(this));
    this.tabbedPane.setCloseableTabs(true);
    this.tabbedPane.setAllowTabReorder(true, true);
    this.tabbedPane.addEventListener(UI15.TabbedPane.Events.TabClosed, this.tabClosed, this);
    this.tabbedPane.addEventListener(UI15.TabbedPane.Events.TabSelected, this.tabSelected, this);
    this.tabbedPane.headerElement().setAttribute("jslog", `${VisualLogging8.toolbar("top").track({ keydown: "ArrowUp|ArrowLeft|ArrowDown|ArrowRight|Enter|Space" })}`);
    Persistence9.Persistence.PersistenceImpl.instance().addEventListener(Persistence9.Persistence.Events.BindingCreated, this.onBindingCreated, this);
    Persistence9.Persistence.PersistenceImpl.instance().addEventListener(Persistence9.Persistence.Events.BindingRemoved, this.onBindingRemoved, this);
    Persistence9.NetworkPersistenceManager.NetworkPersistenceManager.instance().addEventListener("RequestsForHeaderOverridesFileChanged", this.#onRequestsForHeaderOverridesFileChanged, this);
    this.tabIds = /* @__PURE__ */ new Map();
    this.files = /* @__PURE__ */ new Map();
    this.previouslyViewedFilesSetting = setting;
    this.history = History.fromObject(this.previouslyViewedFilesSetting.get());
    this.uriToUISourceCode = /* @__PURE__ */ new Map();
    this.idToUISourceCode = /* @__PURE__ */ new Map();
    this.reentrantShow = false;
  }
  onBindingCreated(event) {
    const binding = event.data;
    this.updateFileTitle(binding.fileSystem);
    const networkTabId = this.tabIds.get(binding.network);
    let fileSystemTabId = this.tabIds.get(binding.fileSystem);
    const wasSelectedInNetwork = this.#currentFile === binding.network;
    const networkKey = historyItemKey(binding.network);
    const currentSelectionRange = this.history.selectionRange(networkKey);
    const currentScrollLineNumber = this.history.scrollLineNumber(networkKey);
    this.history.remove(networkKey);
    if (!networkTabId) {
      return;
    }
    if (!fileSystemTabId) {
      const networkView = this.tabbedPane.tabView(networkTabId);
      const tabIndex = this.tabbedPane.tabIndex(networkTabId);
      if (networkView instanceof UISourceCodeFrame) {
        this.delegate.recycleUISourceCodeFrame(networkView, binding.fileSystem);
        fileSystemTabId = this.appendFileTab(binding.fileSystem, false, tabIndex, networkView);
      } else {
        fileSystemTabId = this.appendFileTab(binding.fileSystem, false, tabIndex);
        const fileSystemTabView = this.tabbedPane.tabView(fileSystemTabId);
        this.restoreEditorProperties(fileSystemTabView, currentSelectionRange, currentScrollLineNumber);
      }
    }
    this.closeTabs([networkTabId], true);
    if (wasSelectedInNetwork) {
      this.tabbedPane.selectTab(fileSystemTabId, false);
    }
    this.updateHistory();
  }
  #onRequestsForHeaderOverridesFileChanged(event) {
    this.updateFileTitle(event.data);
  }
  onBindingRemoved(event) {
    const binding = event.data;
    this.updateFileTitle(binding.fileSystem);
  }
  get view() {
    return this.tabbedPane;
  }
  get visibleView() {
    return this.tabbedPane.visibleView;
  }
  fileViews() {
    return this.tabbedPane.tabViews();
  }
  leftToolbar() {
    return this.tabbedPane.leftToolbar();
  }
  rightToolbar() {
    return this.tabbedPane.rightToolbar();
  }
  show(parentElement) {
    this.tabbedPane.show(parentElement);
  }
  showFile(uiSourceCode) {
    const binding = Persistence9.Persistence.PersistenceImpl.instance().binding(uiSourceCode);
    uiSourceCode = binding ? binding.fileSystem : uiSourceCode;
    const frame = UI15.Context.Context.instance().flavor(SourcesView);
    if (frame?.currentSourceFrame()?.contentSet && this.#currentFile === uiSourceCode && frame?.currentUISourceCode() === uiSourceCode) {
      Common10.EventTarget.fireEvent("source-file-loaded", uiSourceCode.displayName(true));
    } else {
      this.#showFile(uiSourceCode, true);
    }
  }
  closeFile(uiSourceCode) {
    const tabId2 = this.tabIds.get(uiSourceCode);
    if (!tabId2) {
      return;
    }
    this.closeTabs([tabId2]);
  }
  closeAllFiles() {
    this.closeTabs(this.tabbedPane.tabIds());
  }
  historyUISourceCodes() {
    const result = [];
    for (const { url, resourceType } of this.history.keys()) {
      const uiSourceCode = this.uriToUISourceCode.get(url);
      if (uiSourceCode !== void 0 && uiSourceCode.contentType() === resourceType) {
        result.push(uiSourceCode);
      }
    }
    return result;
  }
  selectNextTab() {
    this.tabbedPane.selectNextTab();
  }
  selectPrevTab() {
    this.tabbedPane.selectPrevTab();
  }
  addViewListeners() {
    if (!this.currentView || !(this.currentView instanceof SourceFrame10.SourceFrame.SourceFrameImpl)) {
      return;
    }
    this.currentView.addEventListener("EditorUpdate", this.onEditorUpdate, this);
    this.currentView.addEventListener("EditorScroll", this.onScrollChanged, this);
  }
  removeViewListeners() {
    if (!this.currentView || !(this.currentView instanceof SourceFrame10.SourceFrame.SourceFrameImpl)) {
      return;
    }
    this.currentView.removeEventListener("EditorUpdate", this.onEditorUpdate, this);
    this.currentView.removeEventListener("EditorScroll", this.onScrollChanged, this);
  }
  onScrollChanged() {
    if (this.currentView instanceof SourceFrame10.SourceFrame.SourceFrameImpl) {
      if (this.scrollTimer) {
        clearTimeout(this.scrollTimer);
      }
      this.scrollTimer = window.setTimeout(() => this.previouslyViewedFilesSetting.set(this.history.toObject()), 100);
      if (this.#currentFile) {
        const { editor } = this.currentView.textEditor;
        const topBlock = editor.lineBlockAtHeight(editor.scrollDOM.getBoundingClientRect().top - editor.documentTop);
        const topLine = editor.state.doc.lineAt(topBlock.from).number - 1;
        this.history.updateScrollLineNumber(historyItemKey(this.#currentFile), topLine);
      }
    }
  }
  onEditorUpdate({ data: update }) {
    if (update.docChanged || update.selectionSet) {
      const { main } = update.state.selection;
      const lineFrom = update.state.doc.lineAt(main.from), lineTo = update.state.doc.lineAt(main.to);
      const range = new TextUtils8.TextRange.TextRange(lineFrom.number - 1, main.from - lineFrom.from, lineTo.number - 1, main.to - lineTo.from);
      if (this.#currentFile) {
        this.history.updateSelectionRange(historyItemKey(this.#currentFile), range);
      }
      this.previouslyViewedFilesSetting.set(this.history.toObject());
      if (this.#currentFile) {
        PanelCommon2.ExtensionServer.ExtensionServer.instance().sourceSelectionChanged(this.#currentFile.url(), range);
      }
    }
  }
  #showFile(uiSourceCode, userGesture) {
    if (this.reentrantShow) {
      return;
    }
    const canonicalSourceCode = this.canonicalUISourceCode(uiSourceCode);
    const binding = Persistence9.Persistence.PersistenceImpl.instance().binding(uiSourceCode);
    uiSourceCode = binding ? binding.fileSystem : uiSourceCode;
    if (this.#currentFile === uiSourceCode) {
      return;
    }
    this.removeViewListeners();
    this.#currentFile = uiSourceCode;
    try {
      this.reentrantShow = true;
      const tabId2 = this.tabIds.get(canonicalSourceCode) || this.appendFileTab(canonicalSourceCode, userGesture);
      this.tabbedPane.selectTab(tabId2, userGesture);
    } finally {
      this.reentrantShow = false;
    }
    if (userGesture) {
      this.editorSelectedByUserAction();
    }
    const previousView = this.currentView;
    this.currentView = this.visibleView;
    this.addViewListeners();
    if (this.currentView instanceof UISourceCodeFrame && this.currentView.uiSourceCode() !== uiSourceCode) {
      this.delegate.recycleUISourceCodeFrame(this.currentView, uiSourceCode);
      if (uiSourceCode.project().type() !== Workspace15.Workspace.projectTypes.FileSystem) {
        uiSourceCode.disableEdit();
      }
    }
    const eventData = {
      currentFile: this.#currentFile,
      currentView: this.currentView,
      previousView,
      userGesture
    };
    this.dispatchEventToListeners("EditorSelected", eventData);
  }
  titleForFile(uiSourceCode) {
    const maxDisplayNameLength = 30;
    let title = Platform9.StringUtilities.trimMiddle(uiSourceCode.displayName(true), maxDisplayNameLength);
    if (uiSourceCode.isDirty()) {
      title += "*";
    }
    return title;
  }
  maybeCloseTab(id, nextTabId) {
    const uiSourceCode = this.files.get(id);
    if (!uiSourceCode) {
      return false;
    }
    const shouldPrompt = uiSourceCode.isDirty() && uiSourceCode.project().canSetFileContent();
    if (!shouldPrompt || confirm(i18nString13(UIStrings14.areYouSureYouWantToCloseUnsaved, { PH1: uiSourceCode.name() }))) {
      uiSourceCode.resetWorkingCopy();
      if (nextTabId) {
        this.tabbedPane.selectTab(nextTabId, true);
      }
      this.tabbedPane.closeTab(id, true);
      return true;
    }
    return false;
  }
  closeTabs(ids, forceCloseDirtyTabs) {
    const dirtyTabs = [];
    const cleanTabs = [];
    for (let i = 0; i < ids.length; ++i) {
      const id = ids[i];
      const uiSourceCode = this.files.get(id);
      if (uiSourceCode) {
        if (!forceCloseDirtyTabs && uiSourceCode.isDirty()) {
          dirtyTabs.push(id);
        } else {
          cleanTabs.push(id);
        }
      }
    }
    if (dirtyTabs.length) {
      this.tabbedPane.selectTab(dirtyTabs[0], true);
    }
    this.tabbedPane.closeTabs(cleanTabs, true);
    for (let i = 0; i < dirtyTabs.length; ++i) {
      const nextTabId = i + 1 < dirtyTabs.length ? dirtyTabs[i + 1] : null;
      if (!this.maybeCloseTab(dirtyTabs[i], nextTabId)) {
        break;
      }
    }
  }
  onContextMenu(tabId2, contextMenu) {
    const uiSourceCode = this.files.get(tabId2);
    if (uiSourceCode) {
      contextMenu.appendApplicableItems(uiSourceCode);
    }
  }
  canonicalUISourceCode(uiSourceCode) {
    const existingSourceCode = this.idToUISourceCode.get(uiSourceCode.canonicalScriptId());
    if (existingSourceCode) {
      return existingSourceCode;
    }
    this.idToUISourceCode.set(uiSourceCode.canonicalScriptId(), uiSourceCode);
    this.uriToUISourceCode.set(uiSourceCode.url(), uiSourceCode);
    return uiSourceCode;
  }
  addUISourceCode(uiSourceCode) {
    const canonicalSourceCode = this.canonicalUISourceCode(uiSourceCode);
    const duplicated = canonicalSourceCode !== uiSourceCode;
    const binding = Persistence9.Persistence.PersistenceImpl.instance().binding(canonicalSourceCode);
    uiSourceCode = binding ? binding.fileSystem : canonicalSourceCode;
    if (duplicated && uiSourceCode.project().type() !== Workspace15.Workspace.projectTypes.FileSystem) {
      uiSourceCode.disableEdit();
    }
    if (this.#currentFile?.canonicalScriptId() === uiSourceCode.canonicalScriptId()) {
      return;
    }
    const index = this.history.index(historyItemKey(uiSourceCode));
    if (index === -1) {
      return;
    }
    if (!this.tabIds.has(uiSourceCode)) {
      this.appendFileTab(uiSourceCode, false);
    }
    if (!index) {
      this.#showFile(uiSourceCode, false);
      return;
    }
    if (!this.#currentFile) {
      return;
    }
    const currentProjectIsSnippets = Snippets3.ScriptSnippetFileSystem.isSnippetsUISourceCode(this.#currentFile);
    const addedProjectIsSnippets = Snippets3.ScriptSnippetFileSystem.isSnippetsUISourceCode(uiSourceCode);
    if (this.history.index(historyItemKey(this.#currentFile)) && currentProjectIsSnippets && !addedProjectIsSnippets) {
      this.#showFile(uiSourceCode, false);
    }
  }
  removeUISourceCode(uiSourceCode) {
    this.removeUISourceCodes([uiSourceCode]);
  }
  removeUISourceCodes(uiSourceCodes) {
    const tabIds = [];
    for (const uiSourceCode of uiSourceCodes) {
      const tabId2 = this.tabIds.get(uiSourceCode);
      if (tabId2) {
        tabIds.push(tabId2);
      }
      if (this.uriToUISourceCode.get(uiSourceCode.url()) === uiSourceCode) {
        this.uriToUISourceCode.delete(uiSourceCode.url());
      }
      if (this.idToUISourceCode.get(uiSourceCode.canonicalScriptId()) === uiSourceCode) {
        this.idToUISourceCode.delete(uiSourceCode.canonicalScriptId());
      }
    }
    this.tabbedPane.closeTabs(tabIds);
  }
  editorClosedByUserAction(uiSourceCode) {
    this.history.remove(historyItemKey(uiSourceCode));
    this.updateHistory();
  }
  editorSelectedByUserAction() {
    this.updateHistory();
  }
  updateHistory() {
    const historyItemKeys = [];
    for (const tabId2 of this.tabbedPane.lastOpenedTabIds(MAX_PREVIOUSLY_VIEWED_FILES_COUNT)) {
      const uiSourceCode = this.files.get(tabId2);
      if (uiSourceCode !== void 0) {
        historyItemKeys.push(historyItemKey(uiSourceCode));
      }
    }
    this.history.update(historyItemKeys);
    this.previouslyViewedFilesSetting.set(this.history.toObject());
  }
  tooltipForFile(uiSourceCode) {
    uiSourceCode = Persistence9.Persistence.PersistenceImpl.instance().network(uiSourceCode) || uiSourceCode;
    return uiSourceCode.url();
  }
  appendFileTab(uiSourceCode, userGesture, index, replaceView) {
    const view = replaceView || this.delegate.viewForFile(uiSourceCode);
    const title = this.titleForFile(uiSourceCode);
    const tooltip = this.tooltipForFile(uiSourceCode);
    const tabId2 = this.generateTabId();
    this.tabIds.set(uiSourceCode, tabId2);
    this.files.set(tabId2, uiSourceCode);
    if (!replaceView) {
      const savedSelectionRange = this.history.selectionRange(historyItemKey(uiSourceCode));
      const savedScrollLineNumber = this.history.scrollLineNumber(historyItemKey(uiSourceCode));
      this.restoreEditorProperties(view, savedSelectionRange, savedScrollLineNumber);
    }
    this.tabbedPane.appendTab(tabId2, title, view, tooltip, userGesture, void 0, void 0, index, "editor");
    this.updateFileTitle(uiSourceCode);
    this.addUISourceCodeListeners(uiSourceCode);
    if (uiSourceCode.loadError()) {
      this.addLoadErrorIcon(tabId2);
    } else if (!uiSourceCode.contentLoaded()) {
      void uiSourceCode.requestContentData().then((contentDataOrError) => {
        if (TextUtils8.ContentData.ContentData.isError(contentDataOrError)) {
          this.addLoadErrorIcon(tabId2);
        }
      });
    }
    return tabId2;
  }
  addLoadErrorIcon(tabId2) {
    const icon = new IconButton7.Icon.Icon();
    icon.name = "cross-circle-filled";
    icon.classList.add("small");
    UI15.Tooltip.Tooltip.install(icon, i18nString13(UIStrings14.unableToLoadThisContent));
    if (this.tabbedPane.tabView(tabId2)) {
      this.tabbedPane.setTrailingTabIcon(tabId2, icon);
    }
  }
  restoreEditorProperties(editorView, selection, firstLineNumber) {
    const sourceFrame = editorView instanceof SourceFrame10.SourceFrame.SourceFrameImpl ? editorView : null;
    if (!sourceFrame) {
      return;
    }
    if (selection) {
      sourceFrame.setSelection(selection);
    }
    if (typeof firstLineNumber === "number") {
      sourceFrame.scrollToLine(firstLineNumber);
    }
  }
  tabClosed(event) {
    const { tabId: tabId2, isUserGesture } = event.data;
    const uiSourceCode = this.files.get(tabId2);
    if (this.#currentFile && this.#currentFile.canonicalScriptId() === uiSourceCode?.canonicalScriptId()) {
      this.removeViewListeners();
      this.currentView = null;
      this.#currentFile = null;
    }
    if (uiSourceCode) {
      this.tabIds.delete(uiSourceCode);
    }
    this.files.delete(tabId2);
    if (uiSourceCode) {
      this.removeUISourceCodeListeners(uiSourceCode);
      this.dispatchEventToListeners("EditorClosed", uiSourceCode);
      if (isUserGesture) {
        this.editorClosedByUserAction(uiSourceCode);
      }
    }
  }
  tabSelected(event) {
    const { tabId: tabId2, isUserGesture } = event.data;
    const uiSourceCode = this.files.get(tabId2);
    if (uiSourceCode) {
      this.#showFile(uiSourceCode, isUserGesture);
    }
  }
  addUISourceCodeListeners(uiSourceCode) {
    uiSourceCode.addEventListener(Workspace15.UISourceCode.Events.TitleChanged, this.uiSourceCodeTitleChanged, this);
    uiSourceCode.addEventListener(Workspace15.UISourceCode.Events.WorkingCopyChanged, this.uiSourceCodeWorkingCopyChanged, this);
    uiSourceCode.addEventListener(Workspace15.UISourceCode.Events.WorkingCopyCommitted, this.uiSourceCodeWorkingCopyCommitted, this);
  }
  removeUISourceCodeListeners(uiSourceCode) {
    uiSourceCode.removeEventListener(Workspace15.UISourceCode.Events.TitleChanged, this.uiSourceCodeTitleChanged, this);
    uiSourceCode.removeEventListener(Workspace15.UISourceCode.Events.WorkingCopyChanged, this.uiSourceCodeWorkingCopyChanged, this);
    uiSourceCode.removeEventListener(Workspace15.UISourceCode.Events.WorkingCopyCommitted, this.uiSourceCodeWorkingCopyCommitted, this);
  }
  updateFileTitle(uiSourceCode) {
    const tabId2 = this.tabIds.get(uiSourceCode);
    if (tabId2) {
      const title = this.titleForFile(uiSourceCode);
      const tooltip = this.tooltipForFile(uiSourceCode);
      this.tabbedPane.changeTabTitle(tabId2, title, tooltip);
      if (uiSourceCode.loadError()) {
        const icon = new IconButton7.Icon.Icon();
        icon.name = "cross-circle-filled";
        icon.classList.add("small");
        UI15.Tooltip.Tooltip.install(icon, i18nString13(UIStrings14.unableToLoadThisContent));
        this.tabbedPane.setTrailingTabIcon(tabId2, icon);
      } else if (Persistence9.Persistence.PersistenceImpl.instance().hasUnsavedCommittedChanges(uiSourceCode)) {
        const suffixElement = document.createElement("div");
        const icon = new IconButton7.Icon.Icon();
        icon.name = "warning-filled";
        icon.classList.add("small");
        const id = `tab-tooltip-${nextTooltipId++}`;
        icon.setAttribute("aria-describedby", id);
        const tooltip2 = new Tooltips.Tooltip.Tooltip({ id, anchor: icon, variant: "rich" });
        const automaticFileSystemManager = Persistence9.AutomaticFileSystemManager.AutomaticFileSystemManager.instance();
        const { automaticFileSystem } = automaticFileSystemManager;
        if (automaticFileSystem?.state === "disconnected") {
          const link2 = document.createElement("a");
          link2.className = "devtools-link";
          link2.textContent = Common10.ParsedURL.ParsedURL.extractName(automaticFileSystem.root);
          link2.addEventListener("click", async (event) => {
            event.consume();
            await UI15.ViewManager.ViewManager.instance().showView("navigator-files");
            await automaticFileSystemManager.connectAutomaticFileSystem(
              /* addIfMissing= */
              true
            );
          });
          tooltip2.append(uiI18n3.getFormatLocalizedString(str_14, UIStrings14.changesWereNotSavedToFileSystemToSaveAddFolderToWorkspace, { PH1: link2 }));
        } else {
          const link2 = UI15.XLink.XLink.create("https://developer.chrome.com/docs/devtools/workspaces/", "Workspace");
          tooltip2.append(uiI18n3.getFormatLocalizedString(str_14, UIStrings14.changesWereNotSavedToFileSystemToSaveSetUpYourWorkspace, { PH1: link2 }));
        }
        suffixElement.append(icon, tooltip2);
        this.tabbedPane.setSuffixElement(tabId2, suffixElement);
      } else {
        const icon = PanelCommon2.PersistenceUtils.PersistenceUtils.iconForUISourceCode(uiSourceCode);
        this.tabbedPane.setTrailingTabIcon(tabId2, icon);
      }
    }
  }
  uiSourceCodeTitleChanged(event) {
    const uiSourceCode = event.data;
    this.updateFileTitle(uiSourceCode);
    this.updateHistory();
    for (const [k, v] of this.uriToUISourceCode) {
      if (v === uiSourceCode && k !== v.url()) {
        this.uriToUISourceCode.delete(k);
      }
    }
    for (const [k, v] of this.idToUISourceCode) {
      if (v === uiSourceCode && k !== v.canonicalScriptId()) {
        this.idToUISourceCode.delete(k);
      }
    }
    this.canonicalUISourceCode(uiSourceCode);
  }
  uiSourceCodeWorkingCopyChanged(event) {
    const uiSourceCode = event.data;
    this.updateFileTitle(uiSourceCode);
  }
  uiSourceCodeWorkingCopyCommitted(event) {
    const uiSourceCode = event.data.uiSourceCode;
    this.updateFileTitle(uiSourceCode);
  }
  generateTabId() {
    return "tab-" + tabId++;
  }
  currentFile() {
    return this.#currentFile || null;
  }
};
var nextTooltipId = 1;
var MAX_PREVIOUSLY_VIEWED_FILES_COUNT = 30;
var MAX_SERIALIZABLE_URL_LENGTH = 4096;
function historyItemKey(uiSourceCode) {
  return { url: uiSourceCode.url(), resourceType: uiSourceCode.contentType() };
}
var HistoryItem = class _HistoryItem {
  url;
  resourceType;
  selectionRange;
  scrollLineNumber;
  constructor(url, resourceType, selectionRange, scrollLineNumber) {
    this.url = url;
    this.resourceType = resourceType;
    this.selectionRange = selectionRange;
    this.scrollLineNumber = scrollLineNumber;
  }
  static fromObject(serializedHistoryItem) {
    const resourceType = Common10.ResourceType.ResourceType.fromName(serializedHistoryItem.resourceTypeName);
    if (resourceType === null) {
      throw new TypeError(`Invalid resource type name "${serializedHistoryItem.resourceTypeName}"`);
    }
    const selectionRange = serializedHistoryItem.selectionRange ? TextUtils8.TextRange.TextRange.fromObject(serializedHistoryItem.selectionRange) : void 0;
    return new _HistoryItem(serializedHistoryItem.url, resourceType, selectionRange, serializedHistoryItem.scrollLineNumber);
  }
  toObject() {
    if (this.url.length >= MAX_SERIALIZABLE_URL_LENGTH) {
      return null;
    }
    return {
      url: this.url,
      resourceTypeName: this.resourceType.name(),
      selectionRange: this.selectionRange,
      scrollLineNumber: this.scrollLineNumber
    };
  }
};
var History = class _History {
  items;
  constructor(items) {
    this.items = items;
  }
  static fromObject(serializedHistoryItems) {
    const items = [];
    for (const serializedHistoryItem of serializedHistoryItems) {
      try {
        items.push(HistoryItem.fromObject(serializedHistoryItem));
      } catch {
      }
    }
    return new _History(items);
  }
  index({ url, resourceType }) {
    return this.items.findIndex((item) => item.url === url && item.resourceType === resourceType);
  }
  selectionRange(key) {
    const index = this.index(key);
    if (index === -1) {
      return void 0;
    }
    return this.items[index].selectionRange;
  }
  updateSelectionRange(key, selectionRange) {
    if (!selectionRange) {
      return;
    }
    const index = this.index(key);
    if (index === -1) {
      return;
    }
    this.items[index].selectionRange = selectionRange;
  }
  scrollLineNumber(key) {
    const index = this.index(key);
    if (index === -1) {
      return;
    }
    return this.items[index].scrollLineNumber;
  }
  updateScrollLineNumber(key, scrollLineNumber) {
    const index = this.index(key);
    if (index === -1) {
      return;
    }
    this.items[index].scrollLineNumber = scrollLineNumber;
  }
  update(keys) {
    for (let i = keys.length - 1; i >= 0; --i) {
      const index = this.index(keys[i]);
      let item;
      if (index !== -1) {
        item = this.items[index];
        this.items.splice(index, 1);
      } else {
        item = new HistoryItem(keys[i].url, keys[i].resourceType);
      }
      this.items.unshift(item);
    }
  }
  remove(key) {
    const index = this.index(key);
    if (index === -1) {
      return;
    }
    this.items.splice(index, 1);
  }
  toObject() {
    const serializedHistoryItems = [];
    for (const item of this.items) {
      const serializedItem = item.toObject();
      if (serializedItem) {
        serializedHistoryItems.push(serializedItem);
      }
      if (serializedHistoryItems.length === MAX_PREVIOUSLY_VIEWED_FILES_COUNT) {
        break;
      }
    }
    return serializedHistoryItems;
  }
  keys() {
    return this.items;
  }
};
var EditorContainerTabDelegate = class {
  editorContainer;
  constructor(editorContainer) {
    this.editorContainer = editorContainer;
  }
  closeTabs(_tabbedPane, ids) {
    this.editorContainer.closeTabs(ids);
  }
  onContextMenu(tabId2, contextMenu) {
    this.editorContainer.onContextMenu(tabId2, contextMenu);
  }
};

// gen/front_end/panels/sources/SourcesView.js
var UIStrings15 = {
  /**
   * @description Text to open a file
   */
  openFile: "Open file",
  /**
   * @description Text to run commands
   */
  runCommand: "Run command",
  /**
   * @description Text in Sources View of the Sources panel. This sentence follows by a list of actions.
   */
  workspaceDropInAFolderToSyncSources: "To sync edits to the workspace, drop a folder with your sources here or",
  /**
   * @description Text in Sources View of the Sources panel.
   */
  selectFolder: "Select folder",
  /**
   * @description Accessible label for Sources placeholder view actions list
   */
  sourceViewActions: "Source View Actions"
};
var str_15 = i18n31.i18n.registerUIStrings("panels/sources/SourcesView.ts", UIStrings15);
var i18nString14 = i18n31.i18n.getLocalizedString.bind(void 0, str_15);
var SourcesView = class _SourcesView extends Common11.ObjectWrapper.eventMixin(UI16.Widget.VBox) {
  #searchableView;
  sourceViewByUISourceCode;
  editorContainer;
  historyManager;
  #scriptViewToolbar;
  #bottomToolbar;
  toolbarChangedListener;
  focusedPlaceholderElement;
  searchView;
  searchConfig;
  constructor() {
    super({ jslog: `${VisualLogging9.pane("editor").track({ keydown: "Escape" })}` });
    this.registerRequiredCSS(sourcesView_css_default);
    this.element.id = "sources-panel-sources-view";
    this.setMinimumAndPreferredSizes(88, 52, 150, 100);
    const workspace = Workspace17.Workspace.WorkspaceImpl.instance();
    this.#searchableView = new UI16.SearchableView.SearchableView(this, this, "sources-view-search-config");
    this.#searchableView.setMinimalSearchQuerySize(0);
    this.#searchableView.show(this.element);
    this.sourceViewByUISourceCode = /* @__PURE__ */ new Map();
    this.editorContainer = new TabbedEditorContainer(this, Common11.Settings.Settings.instance().createLocalSetting("previously-viewed-files", []), this.placeholderElement(), this.focusedPlaceholderElement);
    this.editorContainer.show(this.#searchableView.element);
    this.editorContainer.addEventListener("EditorSelected", this.editorSelected, this);
    this.editorContainer.addEventListener("EditorClosed", this.editorClosed, this);
    this.historyManager = new EditingLocationHistoryManager(this);
    const toolbarContainerElementInternal = this.element.createChild("div", "sources-toolbar");
    toolbarContainerElementInternal.setAttribute("jslog", `${VisualLogging9.toolbar("bottom")}`);
    this.#scriptViewToolbar = toolbarContainerElementInternal.createChild("devtools-toolbar");
    this.#scriptViewToolbar.style.flex = "auto";
    this.#bottomToolbar = toolbarContainerElementInternal.createChild("devtools-toolbar");
    this.toolbarChangedListener = null;
    UI16.UIUtils.startBatchUpdate();
    workspace.uiSourceCodes().forEach(this.addUISourceCode.bind(this));
    UI16.UIUtils.endBatchUpdate();
    workspace.addEventListener(Workspace17.Workspace.Events.UISourceCodeAdded, this.uiSourceCodeAdded, this);
    workspace.addEventListener(Workspace17.Workspace.Events.UISourceCodeRemoved, this.uiSourceCodeRemoved, this);
    workspace.addEventListener(Workspace17.Workspace.Events.ProjectRemoved, this.projectRemoved.bind(this), this);
    SDK9.TargetManager.TargetManager.instance().addScopeChangeListener(this.#onScopeChange.bind(this));
    function handleBeforeUnload(event) {
      if (event.returnValue) {
        return;
      }
      const unsavedSourceCodes = [];
      const projects = Workspace17.Workspace.WorkspaceImpl.instance().projectsForType(Workspace17.Workspace.projectTypes.FileSystem);
      for (const project of projects) {
        for (const uiSourceCode of project.uiSourceCodes()) {
          if (uiSourceCode.isDirty()) {
            unsavedSourceCodes.push(uiSourceCode);
          }
        }
      }
      if (!unsavedSourceCodes.length) {
        return;
      }
      event.returnValue = true;
      void UI16.ViewManager.ViewManager.instance().showView("sources");
      for (const sourceCode of unsavedSourceCodes) {
        void Common11.Revealer.reveal(sourceCode);
      }
    }
    if (!window.opener) {
      window.addEventListener("beforeunload", handleBeforeUnload, true);
    }
  }
  placeholderElement() {
    const placeholder2 = document.createElement("div");
    placeholder2.classList.add("sources-placeholder");
    const workspaceElement = placeholder2.createChild("div", "tabbed-pane-placeholder-row");
    workspaceElement.classList.add("workspace");
    const icon = IconButton8.Icon.create("sync", "sync-icon");
    workspaceElement.createChild("span", "icon-container").appendChild(icon);
    const text = workspaceElement.createChild("span");
    text.textContent = UIStrings15.workspaceDropInAFolderToSyncSources;
    const browseButton = text.createChild("button");
    browseButton.textContent = i18nString14(UIStrings15.selectFolder);
    browseButton.addEventListener("click", this.addFileSystemClicked.bind(this));
    const shortcuts = [
      { actionId: "quick-open.show", description: i18nString14(UIStrings15.openFile) },
      { actionId: "quick-open.show-command-menu", description: i18nString14(UIStrings15.runCommand) }
    ];
    const list = placeholder2.createChild("div", "shortcuts-list");
    list.classList.add("tabbed-pane-placeholder-row");
    UI16.ARIAUtils.markAsList(list);
    UI16.ARIAUtils.setLabel(list, i18nString14(UIStrings15.sourceViewActions));
    for (const shortcut of shortcuts) {
      const shortcutKeys = UI16.ShortcutRegistry.ShortcutRegistry.instance().shortcutsForAction(shortcut.actionId);
      const listItemElement = list.createChild("div");
      listItemElement.classList.add("shortcut-line");
      UI16.ARIAUtils.markAsListitem(listItemElement);
      if (shortcutKeys?.[0]) {
        const button = listItemElement.createChild("button");
        button.textContent = shortcut.description;
        const action3 = UI16.ActionRegistry.ActionRegistry.instance().getAction(shortcut.actionId);
        button.addEventListener("click", () => action3.execute());
        const shortcutElement = listItemElement.createChild("span", "shortcuts");
        const separator = Host7.Platform.isMac() ? "\u2004" : "\u200A+\u200A";
        const keys = shortcutKeys[0].descriptors.flatMap((descriptor) => descriptor.name.split(separator));
        keys.forEach((key) => {
          shortcutElement.createChild("span", "keybinds-key").createChild("span").textContent = key;
        });
      }
    }
    return placeholder2;
  }
  async addFileSystemClicked() {
    const result = await Persistence11.IsolatedFileSystemManager.IsolatedFileSystemManager.instance().addFileSystem();
    if (!result) {
      return;
    }
    Host7.userMetrics.actionTaken(Host7.UserMetrics.Action.WorkspaceSelectFolder);
    void UI16.ViewManager.ViewManager.instance().showView("navigator-files");
  }
  static defaultUISourceCodeScores() {
    const defaultScores = /* @__PURE__ */ new Map();
    const sourcesView = UI16.Context.Context.instance().flavor(_SourcesView);
    if (sourcesView) {
      const uiSourceCodes = sourcesView.editorContainer.historyUISourceCodes();
      for (let i = 1; i < uiSourceCodes.length; ++i) {
        defaultScores.set(uiSourceCodes[i], uiSourceCodes.length - i);
      }
    }
    return defaultScores;
  }
  leftToolbar() {
    return this.editorContainer.leftToolbar();
  }
  rightToolbar() {
    return this.editorContainer.rightToolbar();
  }
  bottomToolbar() {
    return this.#bottomToolbar;
  }
  scriptViewToolbar() {
    return this.#scriptViewToolbar;
  }
  wasShown() {
    super.wasShown();
    UI16.Context.Context.instance().setFlavor(_SourcesView, this);
  }
  willHide() {
    UI16.Context.Context.instance().setFlavor(_SourcesView, null);
    super.willHide();
  }
  searchableView() {
    return this.#searchableView;
  }
  visibleView() {
    return this.editorContainer.visibleView;
  }
  currentSourceFrame() {
    const view = this.visibleView();
    if (!(view instanceof UISourceCodeFrame)) {
      return null;
    }
    return view;
  }
  currentUISourceCode() {
    return this.editorContainer.currentFile();
  }
  onCloseEditorTab() {
    const uiSourceCode = this.editorContainer.currentFile();
    if (!uiSourceCode) {
      return false;
    }
    this.editorContainer.closeFile(uiSourceCode);
    return true;
  }
  onJumpToPreviousLocation() {
    this.historyManager.rollback();
  }
  onJumpToNextLocation() {
    this.historyManager.rollover();
  }
  #onScopeChange() {
    const workspace = Workspace17.Workspace.WorkspaceImpl.instance();
    for (const uiSourceCode of workspace.uiSourceCodes()) {
      if (uiSourceCode.project().type() !== Workspace17.Workspace.projectTypes.Network) {
        continue;
      }
      const target = Bindings7.NetworkProject.NetworkProject.targetForUISourceCode(uiSourceCode);
      if (SDK9.TargetManager.TargetManager.instance().isInScope(target)) {
        this.addUISourceCode(uiSourceCode);
      } else {
        this.removeUISourceCodes([uiSourceCode]);
      }
    }
  }
  uiSourceCodeAdded(event) {
    const uiSourceCode = event.data;
    this.addUISourceCode(uiSourceCode);
  }
  addUISourceCode(uiSourceCode) {
    const project = uiSourceCode.project();
    if (project.isServiceProject()) {
      return;
    }
    switch (project.type()) {
      case Workspace17.Workspace.projectTypes.FileSystem: {
        if (Persistence11.FileSystemWorkspaceBinding.FileSystemWorkspaceBinding.fileSystemType(project) === "overrides") {
          return;
        }
        break;
      }
      case Workspace17.Workspace.projectTypes.Network: {
        const target = Bindings7.NetworkProject.NetworkProject.targetForUISourceCode(uiSourceCode);
        if (!SDK9.TargetManager.TargetManager.instance().isInScope(target)) {
          return;
        }
      }
    }
    this.editorContainer.addUISourceCode(uiSourceCode);
  }
  uiSourceCodeRemoved(event) {
    const uiSourceCode = event.data;
    this.removeUISourceCodes([uiSourceCode]);
  }
  removeUISourceCodes(uiSourceCodes) {
    this.editorContainer.removeUISourceCodes(uiSourceCodes);
    for (let i = 0; i < uiSourceCodes.length; ++i) {
      this.removeSourceFrame(uiSourceCodes[i]);
      this.historyManager.removeHistoryForSourceCode(uiSourceCodes[i]);
    }
  }
  projectRemoved(event) {
    const project = event.data;
    const uiSourceCodes = project.uiSourceCodes();
    this.removeUISourceCodes([...uiSourceCodes]);
  }
  updateScriptViewToolbarItems() {
    const view = this.visibleView();
    if (view instanceof UI16.View.SimpleView) {
      void view.toolbarItems().then((items) => {
        this.#scriptViewToolbar.removeToolbarItems();
        for (const action3 of getRegisteredEditorActions()) {
          this.#scriptViewToolbar.appendToolbarItem(action3.getOrCreateButton(this));
        }
        items.map((item) => this.#scriptViewToolbar.appendToolbarItem(item));
      });
    }
  }
  showSourceLocation(uiSourceCode, location, omitFocus, omitHighlight) {
    const currentFrame = this.currentSourceFrame();
    if (currentFrame) {
      this.historyManager.updateCurrentState(currentFrame.uiSourceCode(), currentFrame.textEditor.state.selection.main.head);
    }
    this.editorContainer.showFile(uiSourceCode);
    const currentSourceFrame = this.currentSourceFrame();
    if (currentSourceFrame && location) {
      currentSourceFrame.revealPosition(location, !omitHighlight);
    }
    const visibleView = this.visibleView();
    if (!omitFocus && visibleView) {
      visibleView.focus();
    }
  }
  createSourceView(uiSourceCode) {
    let sourceView;
    const contentType = uiSourceCode.contentType();
    if (contentType === Common11.ResourceType.resourceTypes.Image || uiSourceCode.mimeType().startsWith("image/")) {
      sourceView = new SourceFrame12.ImageView.ImageView(uiSourceCode.mimeType(), uiSourceCode);
    } else if (contentType === Common11.ResourceType.resourceTypes.Font || uiSourceCode.mimeType().includes("font")) {
      sourceView = new SourceFrame12.FontView.FontView(uiSourceCode.mimeType(), uiSourceCode);
    } else if (uiSourceCode.name() === HEADER_OVERRIDES_FILENAME) {
      sourceView = new Components2.HeadersView.HeadersView(uiSourceCode);
    } else {
      sourceView = new UISourceCodeFrame(uiSourceCode);
      this.historyManager.trackSourceFrameCursorJumps(sourceView);
    }
    uiSourceCode.addEventListener(Workspace17.UISourceCode.Events.TitleChanged, this.#uiSourceCodeTitleChanged, this);
    this.sourceViewByUISourceCode.set(uiSourceCode, sourceView);
    return sourceView;
  }
  #sourceViewTypeForWidget(widget) {
    if (widget instanceof SourceFrame12.ImageView.ImageView) {
      return "ImageView";
    }
    if (widget instanceof SourceFrame12.FontView.FontView) {
      return "FontView";
    }
    if (widget instanceof Components2.HeadersView.HeadersView) {
      return "HeadersView";
    }
    return "SourceView";
  }
  #sourceViewTypeForUISourceCode(uiSourceCode) {
    if (uiSourceCode.name() === HEADER_OVERRIDES_FILENAME) {
      return "HeadersView";
    }
    const contentType = uiSourceCode.contentType();
    switch (contentType) {
      case Common11.ResourceType.resourceTypes.Image:
        return "ImageView";
      case Common11.ResourceType.resourceTypes.Font:
        return "FontView";
      default:
        return "SourceView";
    }
  }
  #uiSourceCodeTitleChanged(event) {
    const uiSourceCode = event.data;
    const widget = this.sourceViewByUISourceCode.get(uiSourceCode);
    if (widget) {
      if (this.#sourceViewTypeForWidget(widget) !== this.#sourceViewTypeForUISourceCode(uiSourceCode)) {
        this.removeUISourceCodes([uiSourceCode]);
        this.showSourceLocation(uiSourceCode);
      }
    }
  }
  getSourceView(uiSourceCode) {
    return this.sourceViewByUISourceCode.get(uiSourceCode);
  }
  getOrCreateSourceView(uiSourceCode) {
    return this.sourceViewByUISourceCode.get(uiSourceCode) || this.createSourceView(uiSourceCode);
  }
  recycleUISourceCodeFrame(sourceFrame, uiSourceCode) {
    sourceFrame.uiSourceCode().removeEventListener(Workspace17.UISourceCode.Events.TitleChanged, this.#uiSourceCodeTitleChanged, this);
    this.sourceViewByUISourceCode.delete(sourceFrame.uiSourceCode());
    sourceFrame.setUISourceCode(uiSourceCode);
    this.sourceViewByUISourceCode.set(uiSourceCode, sourceFrame);
    uiSourceCode.addEventListener(Workspace17.UISourceCode.Events.TitleChanged, this.#uiSourceCodeTitleChanged, this);
  }
  viewForFile(uiSourceCode) {
    return this.getOrCreateSourceView(uiSourceCode);
  }
  removeSourceFrame(uiSourceCode) {
    const sourceView = this.sourceViewByUISourceCode.get(uiSourceCode);
    this.sourceViewByUISourceCode.delete(uiSourceCode);
    if (sourceView && sourceView instanceof UISourceCodeFrame) {
      sourceView.dispose();
    }
    uiSourceCode.removeEventListener(Workspace17.UISourceCode.Events.TitleChanged, this.#uiSourceCodeTitleChanged, this);
  }
  editorClosed(event) {
    const uiSourceCode = event.data;
    this.historyManager.removeHistoryForSourceCode(uiSourceCode);
    let wasSelected = false;
    if (!this.editorContainer.currentFile()) {
      wasSelected = true;
    }
    this.removeToolbarChangedListener();
    this.updateScriptViewToolbarItems();
    this.#searchableView.resetSearch();
    const data = {
      uiSourceCode,
      wasSelected
    };
    this.dispatchEventToListeners("EditorClosed", data);
  }
  editorSelected(event) {
    const previousSourceFrame = event.data.previousView instanceof UISourceCodeFrame ? event.data.previousView : null;
    if (previousSourceFrame) {
      previousSourceFrame.setSearchableView(null);
    }
    const currentSourceFrame = event.data.currentView instanceof UISourceCodeFrame ? event.data.currentView : null;
    if (currentSourceFrame) {
      currentSourceFrame.setSearchableView(this.#searchableView);
    }
    this.#searchableView.setReplaceable(Boolean(currentSourceFrame?.canEditSource()));
    this.#searchableView.refreshSearch();
    this.updateToolbarChangedListener();
    this.updateScriptViewToolbarItems();
    const currentFile = this.editorContainer.currentFile();
    if (currentFile) {
      this.dispatchEventToListeners("EditorSelected", currentFile);
    }
  }
  removeToolbarChangedListener() {
    if (this.toolbarChangedListener) {
      Common11.EventTarget.removeEventListeners([this.toolbarChangedListener]);
    }
    this.toolbarChangedListener = null;
  }
  updateToolbarChangedListener() {
    this.removeToolbarChangedListener();
    const sourceFrame = this.currentSourceFrame();
    if (!sourceFrame) {
      return;
    }
    this.toolbarChangedListener = sourceFrame.addEventListener("ToolbarItemsChanged", this.updateScriptViewToolbarItems, this);
  }
  onSearchCanceled() {
    if (this.searchView) {
      this.searchView.onSearchCanceled();
    }
    delete this.searchView;
    delete this.searchConfig;
  }
  performSearch(searchConfig, shouldJump, jumpBackwards) {
    const sourceFrame = this.currentSourceFrame();
    if (!sourceFrame) {
      return;
    }
    this.searchView = sourceFrame;
    this.searchConfig = searchConfig;
    this.searchView.performSearch(this.searchConfig, shouldJump, jumpBackwards);
  }
  jumpToNextSearchResult() {
    if (!this.searchView) {
      return;
    }
    if (this.searchConfig && this.searchView !== this.currentSourceFrame()) {
      this.performSearch(this.searchConfig, true);
      return;
    }
    this.searchView.jumpToNextSearchResult();
  }
  jumpToPreviousSearchResult() {
    if (!this.searchView) {
      return;
    }
    if (this.searchConfig && this.searchView !== this.currentSourceFrame()) {
      this.performSearch(this.searchConfig, true);
      if (this.searchView) {
        this.searchView.jumpToLastSearchResult();
      }
      return;
    }
    this.searchView.jumpToPreviousSearchResult();
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
  replaceSelectionWith(searchConfig, replacement) {
    const sourceFrame = this.currentSourceFrame();
    if (!sourceFrame) {
      console.assert(Boolean(sourceFrame));
      return;
    }
    sourceFrame.replaceSelectionWith(searchConfig, replacement);
  }
  replaceAllWith(searchConfig, replacement) {
    const sourceFrame = this.currentSourceFrame();
    if (!sourceFrame) {
      console.assert(Boolean(sourceFrame));
      return;
    }
    sourceFrame.replaceAllWith(searchConfig, replacement);
  }
  showOutlineQuickOpen() {
    QuickOpen.QuickOpen.QuickOpenImpl.show("@");
  }
  showGoToLineQuickOpen() {
    if (this.editorContainer.currentFile()) {
      QuickOpen.QuickOpen.QuickOpenImpl.show(":");
    }
  }
  save() {
    this.saveSourceFrame(this.currentSourceFrame());
  }
  saveAll() {
    const sourceFrames = this.editorContainer.fileViews();
    sourceFrames.forEach(this.saveSourceFrame.bind(this));
  }
  saveSourceFrame(sourceFrame) {
    if (!(sourceFrame instanceof UISourceCodeFrame)) {
      return;
    }
    const uiSourceCodeFrame = sourceFrame;
    uiSourceCodeFrame.commitEditing();
  }
  toggleBreakpointsActiveState(active) {
    this.editorContainer.view.element.classList.toggle("breakpoints-deactivated", !active);
  }
};
var registeredEditorActions = [];
function registerEditorAction(editorAction) {
  registeredEditorActions.push(editorAction);
}
function getRegisteredEditorActions() {
  return registeredEditorActions.map((editorAction) => editorAction());
}
var SwitchFileActionDelegate = class _SwitchFileActionDelegate {
  static nextFile(currentUISourceCode) {
    function fileNamePrefix(name2) {
      const lastDotIndex = name2.lastIndexOf(".");
      const namePrefix2 = name2.substr(0, lastDotIndex !== -1 ? lastDotIndex : name2.length);
      return namePrefix2.toLowerCase();
    }
    const candidates = [];
    const url = currentUISourceCode.parentURL();
    const name = currentUISourceCode.name();
    const namePrefix = fileNamePrefix(name);
    for (const uiSourceCode of currentUISourceCode.project().uiSourceCodes()) {
      if (url !== uiSourceCode.parentURL()) {
        continue;
      }
      if (fileNamePrefix(uiSourceCode.name()) === namePrefix) {
        candidates.push(uiSourceCode.name());
      }
    }
    candidates.sort(Platform11.StringUtilities.naturalOrderComparator);
    const index = Platform11.NumberUtilities.mod(candidates.indexOf(name) + 1, candidates.length);
    const fullURL = Common11.ParsedURL.ParsedURL.concatenate(url ? Common11.ParsedURL.ParsedURL.concatenate(url, "/") : "", candidates[index]);
    const nextUISourceCode = currentUISourceCode.project().uiSourceCodeForURL(fullURL);
    return nextUISourceCode !== currentUISourceCode ? nextUISourceCode : null;
  }
  handleAction(context, _actionId) {
    const sourcesView = context.flavor(SourcesView);
    if (!sourcesView) {
      return false;
    }
    const currentUISourceCode = sourcesView.currentUISourceCode();
    if (!currentUISourceCode) {
      return false;
    }
    const nextUISourceCode = _SwitchFileActionDelegate.nextFile(currentUISourceCode);
    if (!nextUISourceCode) {
      return false;
    }
    sourcesView.showSourceLocation(nextUISourceCode);
    return true;
  }
};
var ActionDelegate3 = class {
  handleAction(context, actionId) {
    const sourcesView = context.flavor(SourcesView);
    if (!sourcesView) {
      return false;
    }
    switch (actionId) {
      case "sources.close-all":
        sourcesView.editorContainer.closeAllFiles();
        return true;
      case "sources.jump-to-previous-location":
        sourcesView.onJumpToPreviousLocation();
        return true;
      case "sources.jump-to-next-location":
        sourcesView.onJumpToNextLocation();
        return true;
      case "sources.next-editor-tab":
        sourcesView.editorContainer.selectNextTab();
        return true;
      case "sources.previous-editor-tab":
        sourcesView.editorContainer.selectPrevTab();
        return true;
      case "sources.close-editor-tab":
        return sourcesView.onCloseEditorTab();
      case "sources.go-to-line":
        sourcesView.showGoToLineQuickOpen();
        return true;
      case "sources.go-to-member":
        sourcesView.showOutlineQuickOpen();
        return true;
      case "sources.save":
        sourcesView.save();
        return true;
      case "sources.save-all":
        sourcesView.saveAll();
        return true;
    }
    return false;
  }
};
var HEADER_OVERRIDES_FILENAME = ".headers";

// gen/front_end/panels/sources/ThreadsSidebarPane.js
var ThreadsSidebarPane_exports = {};
__export(ThreadsSidebarPane_exports, {
  ThreadsSidebarPane: () => ThreadsSidebarPane
});
import * as i18n33 from "./../../core/i18n/i18n.js";
import * as SDK10 from "./../../core/sdk/sdk.js";
import * as IconButton9 from "./../../ui/components/icon_button/icon_button.js";
import * as UI17 from "./../../ui/legacy/legacy.js";
import * as VisualLogging10 from "./../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/sources/threadsSidebarPane.css.js
var threadsSidebarPane_css_default = `/*
 * Copyright 2017 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.thread-item {
  padding: 3px 8px 3px 20px;
  position: relative;
  min-height: 18px;
  line-height: 15px;
  display: flex;
  flex-wrap: wrap;
}

.thread-item + .thread-item {
  border-top: 1px solid var(--sys-color-divider);
}

.thread-item:hover {
  background-color: var(--sys-color-state-hover-on-subtle);
}

.thread-item:focus-visible {
  background-color: var(--sys-color-tonal-container);
}

.thread-item-title,
.thread-item-paused-state {
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
}

.thread-item-paused-state {
  color: var(--sys-color-state-disabled);
  margin-left: auto;
  padding: 0 10px;
}

.selected-thread-icon {
  display: none;
  position: absolute;
  top: 3px;
  left: 4px;
}

.thread-item.selected .selected-thread-icon {
  display: block;
}

@media (forced-colors: active) {
  .thread-item:hover,
  .thread-item:focus-visible {
    forced-color-adjust: none;
    background-color: Highlight;
  }

  .thread-item:hover > div,
  .thread-item:focus-visible > div {
    color: HighlightText;
  }
}

/*# sourceURL=${import.meta.resolve("./threadsSidebarPane.css")} */`;

// gen/front_end/panels/sources/ThreadsSidebarPane.js
var UIStrings16 = {
  /**
   * @description Text in Threads Sidebar Pane of the Sources panel
   */
  paused: "paused"
};
var str_16 = i18n33.i18n.registerUIStrings("panels/sources/ThreadsSidebarPane.ts", UIStrings16);
var i18nString15 = i18n33.i18n.getLocalizedString.bind(void 0, str_16);
var ThreadsSidebarPane = class extends UI17.Widget.VBox {
  items;
  list;
  selectedModel;
  constructor() {
    super({
      jslog: `${VisualLogging10.section("sources.threads")}`,
      useShadowDom: true
    });
    this.registerRequiredCSS(threadsSidebarPane_css_default);
    this.items = new UI17.ListModel.ListModel();
    this.list = new UI17.ListControl.ListControl(this.items, this, UI17.ListControl.ListMode.NonViewport);
    const currentTarget = UI17.Context.Context.instance().flavor(SDK10.Target.Target);
    this.selectedModel = currentTarget !== null ? currentTarget.model(SDK10.DebuggerModel.DebuggerModel) : null;
    this.contentElement.appendChild(this.list.element);
    UI17.Context.Context.instance().addFlavorChangeListener(SDK10.Target.Target, this.targetFlavorChanged, this);
    SDK10.TargetManager.TargetManager.instance().observeModels(SDK10.DebuggerModel.DebuggerModel, this);
  }
  static shouldBeShown() {
    return SDK10.TargetManager.TargetManager.instance().models(SDK10.DebuggerModel.DebuggerModel).length >= 2;
  }
  createElementForItem(debuggerModel) {
    const element = document.createElement("div");
    element.classList.add("thread-item");
    const title = element.createChild("div", "thread-item-title");
    const pausedState = element.createChild("div", "thread-item-paused-state");
    const icon = new IconButton9.Icon.Icon();
    icon.name = "large-arrow-right-filled";
    icon.classList.add("selected-thread-icon", "small");
    element.appendChild(icon);
    element.tabIndex = -1;
    self.onInvokeElement(element, (event) => {
      UI17.Context.Context.instance().setFlavor(SDK10.Target.Target, debuggerModel.target());
      event.consume(true);
    });
    const isSelected = UI17.Context.Context.instance().flavor(SDK10.Target.Target) === debuggerModel.target();
    element.classList.toggle("selected", isSelected);
    UI17.ARIAUtils.setSelected(element, isSelected);
    function updateTitle() {
      const executionContext = debuggerModel.runtimeModel().defaultExecutionContext();
      title.textContent = executionContext?.label() ? executionContext.label() : debuggerModel.target().name();
    }
    function updatePausedState() {
      pausedState.textContent = debuggerModel.isPaused() ? i18nString15(UIStrings16.paused) : "";
    }
    function targetNameChanged(event) {
      const target = event.data;
      if (target === debuggerModel.target()) {
        updateTitle();
      }
    }
    debuggerModel.addEventListener(SDK10.DebuggerModel.Events.DebuggerPaused, updatePausedState);
    debuggerModel.addEventListener(SDK10.DebuggerModel.Events.DebuggerResumed, updatePausedState);
    debuggerModel.runtimeModel().addEventListener(SDK10.RuntimeModel.Events.ExecutionContextChanged, updateTitle);
    SDK10.TargetManager.TargetManager.instance().addEventListener("NameChanged", targetNameChanged);
    updatePausedState();
    updateTitle();
    return element;
  }
  heightForItem(_debuggerModel) {
    console.assert(false);
    return 0;
  }
  isItemSelectable(_debuggerModel) {
    return true;
  }
  selectedItemChanged(_from, _to, fromElement, toElement) {
    const fromEle = fromElement;
    if (fromEle) {
      fromEle.tabIndex = -1;
    }
    const toEle = toElement;
    if (toEle) {
      this.setDefaultFocusedElement(toEle);
      toEle.tabIndex = 0;
      if (this.hasFocus()) {
        toEle.focus();
      }
    }
  }
  updateSelectedItemARIA(_fromElement, _toElement) {
    return false;
  }
  modelAdded(debuggerModel) {
    this.items.insert(this.items.length, debuggerModel);
    const currentTarget = UI17.Context.Context.instance().flavor(SDK10.Target.Target);
    if (currentTarget === debuggerModel.target()) {
      this.list.selectItem(debuggerModel);
    }
  }
  modelRemoved(debuggerModel) {
    this.items.remove(this.items.indexOf(debuggerModel));
  }
  targetFlavorChanged({ data: target }) {
    const hadFocus = this.hasFocus();
    const debuggerModel = target.model(SDK10.DebuggerModel.DebuggerModel);
    this.list.selectItem(debuggerModel);
    if (debuggerModel) {
      this.list.refreshItem(debuggerModel);
    }
    if (this.selectedModel !== null) {
      this.list.refreshItem(this.selectedModel);
    }
    this.selectedModel = debuggerModel;
    if (hadFocus) {
      this.focus();
    }
  }
};

// gen/front_end/panels/sources/SourcesPanel.js
var UIStrings17 = {
  /**
   * @description Text that appears when user drag and drop something (for example, a file) in Sources Panel of the Sources panel
   */
  dropWorkspaceFolderHere: "Drop workspace folder here",
  /**
   * @description Text to show more options
   */
  moreOptions: "More options",
  /**
   * @description Tooltip for the the navigator toggle in the Sources panel. Command to open/show the
   * sidebar containing the navigator tool.
   */
  showNavigator: "Show navigator",
  /**
   * @description Tooltip for the the navigator toggle in the Sources panel. Command to close/hide
   * the sidebar containing the navigator tool.
   */
  hideNavigator: "Hide navigator",
  /**
   * @description Screen reader announcement when the navigator sidebar is shown in the Sources panel.
   */
  navigatorShown: "Navigator sidebar shown",
  /**
   * @description Screen reader announcement when the navigator sidebar is hidden in the Sources panel.
   */
  navigatorHidden: "Navigator sidebar hidden",
  /**
   * @description Screen reader announcement when the navigator sidebar is shown in the Sources panel.
   */
  debuggerShown: "Debugger sidebar shown",
  /**
   * @description Screen reader announcement when the navigator sidebar is hidden in the Sources panel.
   */
  debuggerHidden: "Debugger sidebar hidden",
  /**
   * @description Tooltip for the the debugger toggle in the Sources panel. Command to open/show the
   * sidebar containing the debugger tool.
   */
  showDebugger: "Show debugger",
  /**
   * @description Tooltip for the the debugger toggle in the Sources panel. Command to close/hide the
   * sidebar containing the debugger tool.
   */
  hideDebugger: "Hide debugger",
  /**
   * @description Text in Sources Panel of the Sources panel
   */
  groupByFolder: "Group by folder",
  /**
   * @description Text in Sources Panel of the Sources panel
   */
  groupByAuthored: "Group by Authored/Deployed",
  /**
   * @description Text in Sources Panel of the Sources panel
   */
  hideIgnoreListed: "Hide ignore-listed sources",
  /**
   * @description Tooltip text that appears when hovering over the largeicon play button in the Sources Panel of the Sources panel
   */
  resumeWithAllPausesBlockedForMs: "Resume with all pauses blocked for 500 ms",
  /**
   * @description Tooltip text that appears when hovering over the largeicon terminate execution button in the Sources Panel of the Sources panel
   */
  terminateCurrentJavascriptCall: "Terminate current JavaScript call",
  /**
   * @description Text in Sources Panel of the Sources panel
   */
  pauseOnCaughtExceptions: "Pause on caught exceptions",
  /**
   * @description A context menu item in the Sources Panel of the Sources panel
   */
  revealInSidebar: "Reveal in navigator sidebar",
  /**
   * @description A context menu item in the Sources Panel of the Sources panel when debugging JS code.
   * When clicked, the execution is resumed until it reaches the line specified by the right-click that
   * opened the context menu.
   */
  continueToHere: "Continue to here",
  /**
   * @description A context menu item in the Console that stores selection as a temporary global variable
   */
  storeAsGlobalVariable: "Store as global variable",
  /**
   * @description A context menu item in the Console, Sources, and Network panel
   * @example {string} PH1
   */
  copyS: "Copy {PH1}",
  /**
   * @description A context menu item for strings in the Console, Sources, and Network panel.
   * When clicked, the raw contents of the string is copied to the clipboard.
   */
  copyStringContents: "Copy string contents",
  /**
   * @description A context menu item for strings in the Console, Sources, and Network panel.
   * When clicked, the string is copied to the clipboard as a valid JavaScript literal.
   */
  copyStringAsJSLiteral: "Copy string as JavaScript literal",
  /**
   * @description A context menu item for strings in the Console, Sources, and Network panel.
   * When clicked, the string is copied to the clipboard as a valid JSON literal.
   */
  copyStringAsJSONLiteral: "Copy string as JSON literal",
  /**
   * @description A context menu item in the Sources Panel of the Sources panel
   */
  showFunctionDefinition: "Show function definition",
  /**
   * @description Text in Sources Panel of the Sources panel
   */
  openInSourcesPanel: "Open in Sources panel",
  /**
   * @description Text of a context menu item to redirect to the AI assistance panel and to start a chat.
   */
  startAChat: "Start a chat",
  /**
   * @description Text of a context menu item to redirect to the AI assistance panel and directly execute
   * a prompt to assess the performance of a script.
   */
  assessPerformance: "Assess performance",
  /**
   * @description Context menu item in Sources panel to explain a script via AI.
   */
  explainThisScript: "Explain this script",
  /**
   * @description Context menu item in Sources panel to explain input handling in a script via AI.
   */
  explainInputHandling: "Explain input handling"
};
var str_17 = i18n35.i18n.registerUIStrings("panels/sources/SourcesPanel.ts", UIStrings17);
var i18nString16 = i18n35.i18n.getLocalizedString.bind(void 0, str_17);
var primitiveRemoteObjectTypes = /* @__PURE__ */ new Set(["number", "boolean", "bigint", "undefined"]);
var sourcesPanelInstance;
var SourcesPanel = class _SourcesPanel extends UI18.Panel.Panel {
  workspace;
  togglePauseAction;
  stepOverAction;
  stepIntoAction;
  stepOutAction;
  stepAction;
  toggleBreakpointsActiveAction;
  debugToolbar;
  debugToolbarDrawer;
  debuggerPausedMessage;
  overlayLoggables;
  splitWidget;
  editorView;
  navigatorTabbedLocation;
  #sourcesView;
  toggleNavigatorSidebarButton;
  toggleDebuggerSidebarButton;
  threadsSidebarPane;
  watchSidebarPane;
  callstackPane;
  liveLocationPool;
  lastModificationTime;
  #paused;
  switchToPausedTargetTimeout;
  executionLineLocation;
  sidebarPaneStack;
  tabbedLocationHeader;
  extensionSidebarPanesContainer;
  sidebarPaneView;
  #lastPausedTarget = null;
  constructor() {
    super("sources");
    this.registerRequiredCSS(sourcesPanel_css_default);
    new UI18.DropTarget.DropTarget(this.element, [UI18.DropTarget.Type.Folder], i18nString16(UIStrings17.dropWorkspaceFolderHere), this.handleDrop.bind(this));
    this.workspace = Workspace19.Workspace.WorkspaceImpl.instance();
    this.togglePauseAction = UI18.ActionRegistry.ActionRegistry.instance().getAction("debugger.toggle-pause");
    this.stepOverAction = UI18.ActionRegistry.ActionRegistry.instance().getAction("debugger.step-over");
    this.stepIntoAction = UI18.ActionRegistry.ActionRegistry.instance().getAction("debugger.step-into");
    this.stepOutAction = UI18.ActionRegistry.ActionRegistry.instance().getAction("debugger.step-out");
    this.stepAction = UI18.ActionRegistry.ActionRegistry.instance().getAction("debugger.step");
    this.toggleBreakpointsActiveAction = UI18.ActionRegistry.ActionRegistry.instance().getAction("debugger.toggle-breakpoints-active");
    this.debugToolbar = this.createDebugToolbar();
    this.debugToolbarDrawer = this.createDebugToolbarDrawer();
    this.debuggerPausedMessage = new DebuggerPausedMessage();
    const initialDebugSidebarWidth = 225;
    this.splitWidget = new UI18.SplitWidget.SplitWidget(true, true, "sources-panel-split-view-state", initialDebugSidebarWidth);
    this.splitWidget.show(this.element);
    if (Root3.Runtime.Runtime.isTraceApp()) {
      this.splitWidget.hideSidebar();
    } else {
      this.splitWidget.enableShowModeSaving();
    }
    const initialNavigatorWidth = 225;
    this.editorView = new UI18.SplitWidget.SplitWidget(true, false, "sources-panel-navigator-split-view-state", initialNavigatorWidth);
    this.editorView.enableShowModeSaving();
    this.splitWidget.setMainWidget(this.editorView);
    this.navigatorTabbedLocation = UI18.ViewManager.ViewManager.instance().createTabbedLocation(this.revealNavigatorSidebar.bind(this), "navigator-view", true, true);
    const tabbedPane = this.navigatorTabbedLocation.tabbedPane();
    tabbedPane.setMinimumSize(100, 25);
    tabbedPane.element.classList.add("navigator-tabbed-pane");
    tabbedPane.headerElement().setAttribute("jslog", `${VisualLogging11.toolbar("navigator").track({ keydown: "ArrowUp|ArrowLeft|ArrowDown|ArrowRight|Enter|Space" })}`);
    const navigatorMenuButton = new UI18.ContextMenu.MenuButton();
    navigatorMenuButton.populateMenuCall = this.populateNavigatorMenu.bind(this);
    navigatorMenuButton.jslogContext = "more-options";
    navigatorMenuButton.iconName = "dots-vertical";
    navigatorMenuButton.title = i18nString16(UIStrings17.moreOptions);
    tabbedPane.rightToolbar().appendToolbarItem(new UI18.Toolbar.ToolbarItem(navigatorMenuButton));
    if (UI18.ViewManager.ViewManager.instance().hasViewsForLocation("run-view-sidebar")) {
      const navigatorSplitWidget = new UI18.SplitWidget.SplitWidget(false, true, "source-panel-navigator-sidebar-split-view-state");
      navigatorSplitWidget.setMainWidget(tabbedPane);
      const runViewTabbedPane = UI18.ViewManager.ViewManager.instance().createTabbedLocation(this.revealNavigatorSidebar.bind(this), "run-view-sidebar").tabbedPane();
      navigatorSplitWidget.setSidebarWidget(runViewTabbedPane);
      navigatorSplitWidget.installResizer(runViewTabbedPane.headerElement());
      this.editorView.setSidebarWidget(navigatorSplitWidget);
    } else {
      this.editorView.setSidebarWidget(tabbedPane);
    }
    this.#sourcesView = new SourcesView();
    this.#sourcesView.addEventListener("EditorSelected", this.editorSelected.bind(this));
    this.toggleNavigatorSidebarButton = this.editorView.createShowHideSidebarButton(i18nString16(UIStrings17.showNavigator), i18nString16(UIStrings17.hideNavigator), i18nString16(UIStrings17.navigatorShown), i18nString16(UIStrings17.navigatorHidden), "navigator");
    this.toggleDebuggerSidebarButton = this.splitWidget.createShowHideSidebarButton(i18nString16(UIStrings17.showDebugger), i18nString16(UIStrings17.hideDebugger), i18nString16(UIStrings17.debuggerShown), i18nString16(UIStrings17.debuggerHidden), "debugger");
    this.editorView.setMainWidget(this.#sourcesView);
    this.threadsSidebarPane = null;
    this.watchSidebarPane = UI18.ViewManager.ViewManager.instance().view("sources.watch");
    this.callstackPane = CallStackSidebarPane.instance();
    Common12.Settings.Settings.instance().moduleSetting("sidebar-position").addChangeListener(this.updateSidebarPosition.bind(this));
    this.updateSidebarPosition();
    void this.updateDebuggerButtonsAndStatus();
    this.liveLocationPool = new Bindings8.LiveLocation.LiveLocationPool();
    this.setTarget(UI18.Context.Context.instance().flavor(SDK11.Target.Target));
    Common12.Settings.Settings.instance().moduleSetting("breakpoints-active").addChangeListener(this.breakpointsActiveStateChanged, this);
    UI18.Context.Context.instance().addFlavorChangeListener(SDK11.Target.Target, this.onCurrentTargetChanged, this);
    UI18.Context.Context.instance().addFlavorChangeListener(SDK11.DebuggerModel.CallFrame, this.callFrameChanged, this);
    SDK11.TargetManager.TargetManager.instance().addModelListener(SDK11.DebuggerModel.DebuggerModel, SDK11.DebuggerModel.Events.DebuggerWasEnabled, this.debuggerWasEnabled, this);
    SDK11.TargetManager.TargetManager.instance().addModelListener(SDK11.DebuggerModel.DebuggerModel, SDK11.DebuggerModel.Events.DebuggerPaused, this.debuggerPaused, this);
    SDK11.TargetManager.TargetManager.instance().addModelListener(SDK11.DebuggerModel.DebuggerModel, SDK11.DebuggerModel.Events.DebugInfoAttached, this.debugInfoAttached, this);
    SDK11.TargetManager.TargetManager.instance().addModelListener(SDK11.DebuggerModel.DebuggerModel, SDK11.DebuggerModel.Events.DebuggerResumed, (event) => this.debuggerResumed(event.data));
    SDK11.TargetManager.TargetManager.instance().addModelListener(SDK11.DebuggerModel.DebuggerModel, SDK11.DebuggerModel.Events.GlobalObjectCleared, (event) => this.debuggerResumed(event.data));
    PanelCommon3.ExtensionServer.ExtensionServer.instance().addEventListener("SidebarPaneAdded", this.extensionSidebarPaneAdded, this);
    SDK11.TargetManager.TargetManager.instance().observeTargets(this);
    this.lastModificationTime = -Infinity;
  }
  static instance(opts = { forceNew: null }) {
    const { forceNew } = opts;
    if (!sourcesPanelInstance || forceNew) {
      sourcesPanelInstance = new _SourcesPanel();
    }
    return sourcesPanelInstance;
  }
  static updateResizerAndSidebarButtons(panel2) {
    panel2.#sourcesView.leftToolbar().removeToolbarItems();
    panel2.#sourcesView.rightToolbar().removeToolbarItems();
    panel2.#sourcesView.bottomToolbar().removeToolbarItems();
    const isInWrapper = UI18.Context.Context.instance().flavor(QuickSourceView) && !UI18.InspectorView.InspectorView.instance().isDrawerMinimized();
    if (panel2.splitWidget.isVertical() || isInWrapper) {
      panel2.splitWidget.uninstallResizer(panel2.#sourcesView.scriptViewToolbar());
    } else {
      panel2.splitWidget.installResizer(panel2.#sourcesView.scriptViewToolbar());
    }
    if (!isInWrapper) {
      panel2.#sourcesView.leftToolbar().appendToolbarItem(panel2.toggleNavigatorSidebarButton);
      if (!Root3.Runtime.Runtime.isTraceApp()) {
        if (panel2.splitWidget.isVertical()) {
          panel2.#sourcesView.rightToolbar().appendToolbarItem(panel2.toggleDebuggerSidebarButton);
        } else {
          panel2.#sourcesView.bottomToolbar().appendToolbarItem(panel2.toggleDebuggerSidebarButton);
        }
      }
    }
  }
  targetAdded(_target) {
    this.showThreadsIfNeeded();
  }
  targetRemoved(_target) {
  }
  showThreadsIfNeeded() {
    if (ThreadsSidebarPane.shouldBeShown() && !this.threadsSidebarPane) {
      this.threadsSidebarPane = UI18.ViewManager.ViewManager.instance().view("sources.threads");
      if (this.sidebarPaneStack && this.threadsSidebarPane) {
        this.sidebarPaneStack.appendView(this.threadsSidebarPane, this.splitWidget.isVertical() ? this.watchSidebarPane : this.callstackPane);
      }
    }
  }
  setTarget(target) {
    if (!target) {
      return;
    }
    const debuggerModel = target.model(SDK11.DebuggerModel.DebuggerModel);
    if (!debuggerModel) {
      return;
    }
    if (debuggerModel.isPaused()) {
      this.showDebuggerPausedDetails(debuggerModel.debuggerPausedDetails());
    } else {
      this.#paused = false;
      this.clearInterface();
      this.toggleDebuggerSidebarButton.setEnabled(true);
    }
  }
  onCurrentTargetChanged({ data: target }) {
    this.setTarget(target);
  }
  paused() {
    return this.#paused || false;
  }
  wasShown() {
    UI18.Context.Context.instance().setFlavor(_SourcesPanel, this);
    super.wasShown();
    if (UI18.Context.Context.instance().flavor(QuickSourceView)) {
      UI18.InspectorView.InspectorView.instance().setDrawerMinimized(true);
      _SourcesPanel.updateResizerAndSidebarButtons(this);
    }
    this.editorView.setMainWidget(this.#sourcesView);
  }
  willHide() {
    super.willHide();
    UI18.Context.Context.instance().setFlavor(_SourcesPanel, null);
    const wrapperView = UI18.Context.Context.instance().flavor(QuickSourceView);
    if (wrapperView) {
      wrapperView.showViewInWrapper();
      UI18.InspectorView.InspectorView.instance().setDrawerMinimized(false);
      _SourcesPanel.updateResizerAndSidebarButtons(this);
    }
  }
  resolveLocation(locationName) {
    if (locationName === "sources.sidebar-top" || locationName === "sources.sidebar-bottom" || locationName === "sources.sidebar-tabs") {
      return this.sidebarPaneStack || null;
    }
    return this.navigatorTabbedLocation;
  }
  ensureSourcesViewVisible() {
    if (UI18.Context.Context.instance().flavor(QuickSourceView)) {
      return true;
    }
    if (!UI18.InspectorView.InspectorView.instance().canSelectPanel("sources")) {
      return false;
    }
    void UI18.ViewManager.ViewManager.instance().showView("sources");
    return true;
  }
  onResize() {
    if (Common12.Settings.Settings.instance().moduleSetting("sidebar-position").get() === "auto") {
      this.element.window().requestAnimationFrame(this.updateSidebarPosition.bind(this));
    }
  }
  searchableView() {
    return this.#sourcesView.searchableView();
  }
  toggleNavigatorSidebar() {
    this.editorView.toggleSidebar();
  }
  toggleDebuggerSidebar() {
    this.splitWidget.toggleSidebar();
  }
  debuggerPaused(event) {
    const debuggerModel = event.data;
    const details = debuggerModel.debuggerPausedDetails();
    if (!this.#paused && Common12.Settings.Settings.instance().moduleSetting("auto-focus-on-debugger-paused-enabled").get()) {
      void this.setAsCurrentPanel();
    }
    if (UI18.Context.Context.instance().flavor(SDK11.Target.Target) === debuggerModel.target()) {
      this.showDebuggerPausedDetails(details);
    } else if (!this.#paused) {
      UI18.Context.Context.instance().setFlavor(SDK11.Target.Target, debuggerModel.target());
    }
    Badges.UserBadges.instance().recordAction(Badges.BadgeAction.DEBUGGER_PAUSED);
  }
  debugInfoAttached(event) {
    const { debuggerModel } = event.data;
    if (!debuggerModel.isPaused()) {
      return;
    }
    const details = debuggerModel.debuggerPausedDetails();
    if (details && UI18.Context.Context.instance().flavor(SDK11.Target.Target) === debuggerModel.target()) {
      this.showDebuggerPausedDetails(details);
    }
  }
  showDebuggerPausedDetails(details) {
    this.#paused = true;
    void this.updateDebuggerButtonsAndStatus();
    UI18.Context.Context.instance().setFlavor(SDK11.DebuggerModel.DebuggerPausedDetails, details);
    this.toggleDebuggerSidebarButton.setEnabled(false);
    this.revealDebuggerSidebar();
    const pausedTarget = details.debuggerModel.target();
    if (this.threadsSidebarPane && this.#lastPausedTarget?.deref() !== pausedTarget && pausedTarget !== SDK11.TargetManager.TargetManager.instance().primaryPageTarget()) {
      void this.sidebarPaneStack?.showView(this.threadsSidebarPane);
    }
    window.focus();
    Host8.InspectorFrontendHost.InspectorFrontendHostInstance.bringToFront();
    const withOverlay = UI18.Context.Context.instance().flavor(SDK11.Target.Target)?.model(SDK11.OverlayModel.OverlayModel) && !Common12.Settings.Settings.instance().moduleSetting("disable-paused-state-overlay").get();
    if (withOverlay && !this.overlayLoggables) {
      this.overlayLoggables = { debuggerPausedMessage: {}, resumeButton: {}, stepOverButton: {} };
      VisualLogging11.registerLoggable(this.overlayLoggables.debuggerPausedMessage, `${VisualLogging11.dialog("debugger-paused")}`, null, new DOMRect(0, 0, 200, 20));
      VisualLogging11.registerLoggable(this.overlayLoggables.resumeButton, `${VisualLogging11.action("debugger.toggle-pause")}`, this.overlayLoggables.debuggerPausedMessage, new DOMRect(0, 0, 20, 20));
      VisualLogging11.registerLoggable(this.overlayLoggables.stepOverButton, `${VisualLogging11.action("debugger.step-over")}`, this.overlayLoggables.debuggerPausedMessage, new DOMRect(0, 0, 20, 20));
    }
    this.#lastPausedTarget = new WeakRef(details.debuggerModel.target());
  }
  maybeLogOverlayAction() {
    if (!this.overlayLoggables) {
      return;
    }
    const byOverlayButton = !document.hasFocus();
    window.setTimeout(() => {
      if (!this.overlayLoggables) {
        return;
      }
      if (byOverlayButton) {
        const details = UI18.Context.Context.instance().flavor(SDK11.DebuggerModel.DebuggerPausedDetails);
        VisualLogging11.logClick(this.#paused && details?.reason === "step" ? this.overlayLoggables.stepOverButton : this.overlayLoggables.resumeButton, new MouseEvent("click"));
      }
      if (!this.#paused) {
        VisualLogging11.logResize(this.overlayLoggables.debuggerPausedMessage, new DOMRect(0, 0, 0, 0));
        this.overlayLoggables = void 0;
      }
    }, 500);
  }
  debuggerResumed(debuggerModel) {
    this.maybeLogOverlayAction();
    const target = debuggerModel.target();
    if (UI18.Context.Context.instance().flavor(SDK11.Target.Target) !== target) {
      return;
    }
    this.#paused = false;
    this.clearInterface();
    this.toggleDebuggerSidebarButton.setEnabled(true);
    this.switchToPausedTargetTimeout = window.setTimeout(this.switchToPausedTarget.bind(this, debuggerModel), 500);
  }
  debuggerWasEnabled(event) {
    const debuggerModel = event.data;
    if (UI18.Context.Context.instance().flavor(SDK11.Target.Target) !== debuggerModel.target()) {
      return;
    }
    void this.updateDebuggerButtonsAndStatus();
  }
  get visibleView() {
    return this.#sourcesView.visibleView();
  }
  showUISourceCode(uiSourceCode, location, omitFocus) {
    if (omitFocus) {
      if (!this.isShowing() && !UI18.Context.Context.instance().flavor(QuickSourceView)) {
        return;
      }
    } else {
      this.showEditor();
    }
    this.#sourcesView.showSourceLocation(uiSourceCode, location, omitFocus);
  }
  showEditor() {
    if (UI18.Context.Context.instance().flavor(QuickSourceView)) {
      return;
    }
    void this.setAsCurrentPanel();
  }
  showUILocation(uiLocation, omitFocus) {
    const { uiSourceCode, lineNumber, columnNumber } = uiLocation;
    this.showUISourceCode(uiSourceCode, { lineNumber, columnNumber }, omitFocus);
  }
  async revealInNavigator(uiSourceCode, skipReveal) {
    const viewManager = UI18.ViewManager.ViewManager.instance();
    for (const view of viewManager.viewsForLocation(
      "navigator-view"
      /* UI.ViewManager.ViewLocationValues.NAVIGATOR_VIEW */
    )) {
      const navigatorView = await view.widget();
      if (navigatorView instanceof NavigatorView && navigatorView.acceptProject(uiSourceCode.project())) {
        navigatorView.revealUISourceCode(uiSourceCode, true);
        this.navigatorTabbedLocation.tabbedPane().selectTab(view.viewId(), true);
        if (!skipReveal) {
          this.editorView.showBoth(true);
          navigatorView.focus();
        }
        break;
      }
    }
  }
  addExperimentMenuItem(menuSection, experiment, menuItem) {
    function toggleExperiment() {
      const checked = Root3.Runtime.experiments.isEnabled(experiment);
      Root3.Runtime.experiments.setEnabled(experiment, !checked);
      Host8.userMetrics.experimentChanged(experiment, checked);
      const groupByFolderSetting = Common12.Settings.Settings.instance().moduleSetting("navigator-group-by-folder");
      groupByFolderSetting.set(groupByFolderSetting.get());
    }
    menuSection.appendCheckboxItem(menuItem, toggleExperiment, {
      checked: Root3.Runtime.experiments.isEnabled(experiment),
      experimental: true,
      jslogContext: Platform12.StringUtilities.toKebabCase(experiment)
    });
  }
  populateNavigatorMenu(contextMenu) {
    const groupByFolderSetting = Common12.Settings.Settings.instance().moduleSetting("navigator-group-by-folder");
    contextMenu.appendItemsAtLocation("navigatorMenu");
    contextMenu.viewSection().appendCheckboxItem(i18nString16(UIStrings17.groupByFolder), () => groupByFolderSetting.set(!groupByFolderSetting.get()), { checked: groupByFolderSetting.get(), jslogContext: groupByFolderSetting.name });
    this.addExperimentMenuItem(contextMenu.viewSection(), "authored-deployed-grouping", i18nString16(UIStrings17.groupByAuthored));
    this.addExperimentMenuItem(contextMenu.viewSection(), "just-my-code", i18nString16(UIStrings17.hideIgnoreListed));
  }
  updateLastModificationTime() {
    this.lastModificationTime = window.performance.now();
  }
  async executionLineChanged(liveLocation) {
    const uiLocation = await liveLocation.uiLocation();
    if (liveLocation.isDisposed()) {
      return;
    }
    if (!uiLocation) {
      return;
    }
    if (window.performance.now() - this.lastModificationTime < lastModificationTimeout) {
      return;
    }
    this.#sourcesView.showSourceLocation(uiLocation.uiSourceCode, uiLocation, void 0, true);
  }
  async callFrameChanged() {
    const callFrame = UI18.Context.Context.instance().flavor(SDK11.DebuggerModel.CallFrame);
    if (!callFrame) {
      return;
    }
    if (this.executionLineLocation) {
      this.executionLineLocation.dispose();
    }
    this.executionLineLocation = await Bindings8.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().createCallFrameLiveLocation(callFrame.location(), this.executionLineChanged.bind(this), this.liveLocationPool);
  }
  async updateDebuggerButtonsAndStatus() {
    const currentTarget = UI18.Context.Context.instance().flavor(SDK11.Target.Target);
    const currentDebuggerModel = currentTarget ? currentTarget.model(SDK11.DebuggerModel.DebuggerModel) : null;
    if (!currentDebuggerModel) {
      this.togglePauseAction.setEnabled(false);
      this.stepOverAction.setEnabled(false);
      this.stepIntoAction.setEnabled(false);
      this.stepOutAction.setEnabled(false);
      this.stepAction.setEnabled(false);
    } else if (this.#paused) {
      this.togglePauseAction.setToggled(true);
      this.togglePauseAction.setEnabled(true);
      this.stepOverAction.setEnabled(true);
      this.stepIntoAction.setEnabled(true);
      this.stepOutAction.setEnabled(true);
      this.stepAction.setEnabled(true);
    } else {
      this.togglePauseAction.setToggled(false);
      this.togglePauseAction.setEnabled(!currentDebuggerModel.isPausing());
      this.stepOverAction.setEnabled(false);
      this.stepIntoAction.setEnabled(false);
      this.stepOutAction.setEnabled(false);
      this.stepAction.setEnabled(false);
    }
    const details = currentDebuggerModel ? currentDebuggerModel.debuggerPausedDetails() : null;
    await this.debuggerPausedMessage.render(details, Bindings8.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance(), Breakpoints2.BreakpointManager.BreakpointManager.instance());
    if (details) {
      this.updateDebuggerButtonsAndStatusForTest();
    }
  }
  updateDebuggerButtonsAndStatusForTest() {
  }
  clearInterface() {
    void this.updateDebuggerButtonsAndStatus();
    UI18.Context.Context.instance().setFlavor(SDK11.DebuggerModel.DebuggerPausedDetails, null);
    if (this.switchToPausedTargetTimeout) {
      clearTimeout(this.switchToPausedTargetTimeout);
    }
    this.liveLocationPool.disposeAll();
  }
  switchToPausedTarget(debuggerModel) {
    delete this.switchToPausedTargetTimeout;
    if (this.#paused || debuggerModel.isPaused()) {
      return;
    }
    for (const debuggerModel2 of SDK11.TargetManager.TargetManager.instance().models(SDK11.DebuggerModel.DebuggerModel)) {
      if (debuggerModel2.isPaused()) {
        UI18.Context.Context.instance().setFlavor(SDK11.Target.Target, debuggerModel2.target());
        break;
      }
    }
  }
  runSnippet() {
    const uiSourceCode = this.#sourcesView.currentUISourceCode();
    if (uiSourceCode) {
      void Snippets4.ScriptSnippetFileSystem.evaluateScriptSnippet(uiSourceCode);
    }
  }
  editorSelected(event) {
    const uiSourceCode = event.data;
    UI18.Context.Context.instance().setFlavor(Workspace19.UISourceCode.UISourceCode, uiSourceCode);
    if (this.editorView.mainWidget() && Common12.Settings.Settings.instance().moduleSetting("auto-reveal-in-navigator").get()) {
      void this.revealInNavigator(uiSourceCode, true);
    }
  }
  togglePause() {
    const target = UI18.Context.Context.instance().flavor(SDK11.Target.Target);
    if (!target) {
      return true;
    }
    const debuggerModel = target.model(SDK11.DebuggerModel.DebuggerModel);
    if (!debuggerModel) {
      return true;
    }
    if (this.#paused) {
      this.#paused = false;
      debuggerModel.resume();
    } else {
      debuggerModel.pause();
    }
    this.clearInterface();
    return true;
  }
  prepareToResume() {
    if (!this.#paused) {
      return null;
    }
    this.#paused = false;
    this.clearInterface();
    const target = UI18.Context.Context.instance().flavor(SDK11.Target.Target);
    return target ? target.model(SDK11.DebuggerModel.DebuggerModel) : null;
  }
  longResume() {
    const debuggerModel = this.prepareToResume();
    if (debuggerModel) {
      debuggerModel.skipAllPausesUntilReloadOrTimeout(500);
      debuggerModel.resume();
    }
  }
  terminateExecution() {
    const debuggerModel = this.prepareToResume();
    if (debuggerModel) {
      void debuggerModel.runtimeModel().terminateExecution();
      debuggerModel.resume();
    }
  }
  stepOver() {
    const debuggerModel = this.prepareToResume();
    if (debuggerModel) {
      void debuggerModel.stepOver();
    }
    return true;
  }
  stepInto() {
    const debuggerModel = this.prepareToResume();
    if (debuggerModel) {
      void debuggerModel.stepInto();
    }
    return true;
  }
  stepIntoAsync() {
    const debuggerModel = this.prepareToResume();
    if (debuggerModel) {
      debuggerModel.scheduleStepIntoAsync();
    }
    return true;
  }
  stepOut() {
    const debuggerModel = this.prepareToResume();
    if (debuggerModel) {
      void debuggerModel.stepOut();
    }
    return true;
  }
  async continueToLocation(uiLocation) {
    const executionContext = UI18.Context.Context.instance().flavor(SDK11.RuntimeModel.ExecutionContext);
    if (!executionContext) {
      return;
    }
    const rawLocations = await Bindings8.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().uiLocationToRawLocations(uiLocation.uiSourceCode, uiLocation.lineNumber, 0);
    const rawLocation = rawLocations.find((location) => location.debuggerModel === executionContext.debuggerModel);
    if (rawLocation && this.prepareToResume()) {
      rawLocation.continueToLocation();
    }
  }
  toggleBreakpointsActive() {
    Common12.Settings.Settings.instance().moduleSetting("breakpoints-active").set(!Common12.Settings.Settings.instance().moduleSetting("breakpoints-active").get());
  }
  breakpointsActiveStateChanged() {
    const active = Common12.Settings.Settings.instance().moduleSetting("breakpoints-active").get();
    this.toggleBreakpointsActiveAction.setToggled(!active);
    this.#sourcesView.toggleBreakpointsActiveState(active);
  }
  createDebugToolbar() {
    const debugToolbar = document.createElement("devtools-toolbar");
    debugToolbar.classList.add("scripts-debug-toolbar");
    debugToolbar.setAttribute("jslog", `${VisualLogging11.toolbar("debug").track({ keydown: "ArrowUp|ArrowLeft|ArrowDown|ArrowRight|Enter|Space" })}`);
    const longResumeButton = new UI18.Toolbar.ToolbarButton(i18nString16(UIStrings17.resumeWithAllPausesBlockedForMs), "play");
    longResumeButton.addEventListener("Click", this.longResume, this);
    const terminateExecutionButton = new UI18.Toolbar.ToolbarButton(i18nString16(UIStrings17.terminateCurrentJavascriptCall), "stop");
    terminateExecutionButton.addEventListener("Click", this.terminateExecution, this);
    const pauseActionButton = UI18.Toolbar.Toolbar.createLongPressActionButton(this.togglePauseAction, [terminateExecutionButton, longResumeButton], []);
    pauseActionButton.toggleOnClick(false);
    debugToolbar.appendToolbarItem(pauseActionButton);
    debugToolbar.appendToolbarItem(UI18.Toolbar.Toolbar.createActionButton(this.stepOverAction));
    debugToolbar.appendToolbarItem(UI18.Toolbar.Toolbar.createActionButton(this.stepIntoAction));
    debugToolbar.appendToolbarItem(UI18.Toolbar.Toolbar.createActionButton(this.stepOutAction));
    debugToolbar.appendToolbarItem(UI18.Toolbar.Toolbar.createActionButton(this.stepAction));
    debugToolbar.appendSeparator();
    debugToolbar.appendToolbarItem(UI18.Toolbar.Toolbar.createActionButton(this.toggleBreakpointsActiveAction));
    return debugToolbar;
  }
  createDebugToolbarDrawer() {
    const debugToolbarDrawer = document.createElement("div");
    debugToolbarDrawer.classList.add("scripts-debug-toolbar-drawer");
    const label = i18nString16(UIStrings17.pauseOnCaughtExceptions);
    const setting = Common12.Settings.Settings.instance().moduleSetting("pause-on-caught-exception");
    debugToolbarDrawer.appendChild(SettingsUI.SettingsUI.createSettingCheckbox(label, setting));
    return debugToolbarDrawer;
  }
  appendApplicableItems(event, contextMenu, target) {
    if (target instanceof Workspace19.UISourceCode.UISourceCode) {
      this.appendUISourceCodeItems(event, contextMenu, target);
      return;
    }
    if (target instanceof UISourceCodeFrame) {
      this.appendUISourceCodeFrameItems(contextMenu, target);
      return;
    }
    if (target instanceof Workspace19.UISourceCode.UILocation) {
      this.appendUILocationItems(contextMenu, target);
      return;
    }
    if (target instanceof SDK11.RemoteObject.RemoteObject) {
      this.appendRemoteObjectItems(contextMenu, target);
      return;
    }
    this.appendNetworkRequestItems(contextMenu, target);
  }
  appendUISourceCodeItems(event, contextMenu, uiSourceCode) {
    if (!event.target) {
      return;
    }
    const eventTarget = event.target;
    if (!uiSourceCode.project().isServiceProject() && !eventTarget.isSelfOrDescendant(this.navigatorTabbedLocation.widget().element) && !(Root3.Runtime.experiments.isEnabled(
      "just-my-code"
      /* Root.Runtime.ExperimentName.JUST_MY_CODE */
    ) && Workspace19.IgnoreListManager.IgnoreListManager.instance().isUserOrSourceMapIgnoreListedUISourceCode(uiSourceCode))) {
      contextMenu.revealSection().appendItem(i18nString16(UIStrings17.revealInSidebar), this.revealInNavigator.bind(this, uiSourceCode), {
        jslogContext: "sources.reveal-in-navigator-sidebar"
      });
    }
    const openAiAssistanceId = "drjones.sources-panel-context";
    if (UI18.ActionRegistry.ActionRegistry.instance().hasAction(openAiAssistanceId)) {
      const editorElement = this.element.querySelector("devtools-text-editor");
      if (!eventTarget.isSelfOrDescendant(editorElement) && uiSourceCode.contentType().isTextType()) {
        UI18.Context.Context.instance().setFlavor(Workspace19.UISourceCode.UISourceCode, uiSourceCode);
        if (Root3.Runtime.hostConfig.devToolsAiSubmenuPrompts?.enabled) {
          const action3 = UI18.ActionRegistry.ActionRegistry.instance().getAction(openAiAssistanceId);
          const submenu = contextMenu.footerSection().appendSubMenuItem(action3.title(), false, openAiAssistanceId, Root3.Runtime.hostConfig.devToolsAiAssistanceFileAgent?.featureName);
          submenu.defaultSection().appendAction("drjones.sources-panel-context", i18nString16(UIStrings17.startAChat));
          appendSubmenuPromptAction(submenu, action3, i18nString16(UIStrings17.assessPerformance), "Is this script optimized for performance?", openAiAssistanceId + ".performance");
          appendSubmenuPromptAction(submenu, action3, i18nString16(UIStrings17.explainThisScript), "What does this script do?", openAiAssistanceId + ".script");
          appendSubmenuPromptAction(submenu, action3, i18nString16(UIStrings17.explainInputHandling), "Does the script handle user input safely", openAiAssistanceId + ".input");
        } else if (Root3.Runtime.hostConfig.devToolsAiDebugWithAi?.enabled) {
          contextMenu.footerSection().appendAction(openAiAssistanceId, void 0, false, void 0, Root3.Runtime.hostConfig.devToolsAiAssistanceFileAgent?.featureName);
        } else {
          contextMenu.footerSection().appendAction(openAiAssistanceId);
        }
      }
    }
    if (uiSourceCode.contentType().hasScripts() && Bindings8.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().scriptsForUISourceCode(uiSourceCode).every((script) => script.isJavaScript())) {
      this.callstackPane.appendIgnoreListURLContextMenuItems(contextMenu, uiSourceCode);
    }
    function appendSubmenuPromptAction(submenu, action3, label, prompt, jslogContext) {
      submenu.defaultSection().appendItem(label, () => action3.execute({ prompt }), { disabled: !action3.enabled(), jslogContext });
    }
  }
  appendUISourceCodeFrameItems(contextMenu, target) {
    if (target.uiSourceCode().contentType().isFromSourceMap() || target.textEditor.state.selection.main.empty) {
      return;
    }
    contextMenu.debugSection().appendAction("debugger.evaluate-selection");
  }
  appendUILocationItems(contextMenu, uiLocation) {
    const uiSourceCode = uiLocation.uiSourceCode;
    if (!Bindings8.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().scriptsForUISourceCode(uiSourceCode).every((script) => script.isJavaScript())) {
      return;
    }
    const contentType = uiSourceCode.contentType();
    if (contentType.hasScripts()) {
      const target = UI18.Context.Context.instance().flavor(SDK11.Target.Target);
      const debuggerModel = target ? target.model(SDK11.DebuggerModel.DebuggerModel) : null;
      if (debuggerModel?.isPaused()) {
        contextMenu.debugSection().appendItem(i18nString16(UIStrings17.continueToHere), this.continueToLocation.bind(this, uiLocation), { jslogContext: "continue-to-here" });
      }
      this.callstackPane.appendIgnoreListURLContextMenuItems(contextMenu, uiSourceCode);
    }
  }
  appendRemoteObjectItems(contextMenu, remoteObject) {
    const indent = Common12.Settings.Settings.instance().moduleSetting("text-editor-indent").get();
    const executionContext = UI18.Context.Context.instance().flavor(SDK11.RuntimeModel.ExecutionContext);
    function getObjectTitle() {
      if (remoteObject.type === "wasm") {
        return remoteObject.subtype;
      }
      if (remoteObject.subtype === "node") {
        return "outerHTML";
      }
      return remoteObject.type;
    }
    const copyContextMenuTitle = getObjectTitle();
    contextMenu.debugSection().appendItem(i18nString16(UIStrings17.storeAsGlobalVariable), () => executionContext?.target().model(SDK11.ConsoleModel.ConsoleModel)?.saveToTempVariable(executionContext, remoteObject), { jslogContext: "store-as-global-variable" });
    const ctxMenuClipboardSection = contextMenu.clipboardSection();
    const inspectorFrontendHost = Host8.InspectorFrontendHost.InspectorFrontendHostInstance;
    if (remoteObject.type === "string") {
      ctxMenuClipboardSection.appendItem(i18nString16(UIStrings17.copyStringContents), () => {
        inspectorFrontendHost.copyText(remoteObject.value);
      }, { jslogContext: "copy-string-contents" });
      ctxMenuClipboardSection.appendItem(i18nString16(UIStrings17.copyStringAsJSLiteral), () => {
        inspectorFrontendHost.copyText(Platform12.StringUtilities.formatAsJSLiteral(remoteObject.value));
      }, { jslogContext: "copy-string-as-js-literal" });
      ctxMenuClipboardSection.appendItem(i18nString16(UIStrings17.copyStringAsJSONLiteral), () => {
        inspectorFrontendHost.copyText(JSON.stringify(remoteObject.value));
      }, { jslogContext: "copy-string-as-json-literal" });
    } else if (primitiveRemoteObjectTypes.has(remoteObject.type)) {
      ctxMenuClipboardSection.appendItem(i18nString16(UIStrings17.copyS, { PH1: String(copyContextMenuTitle) }), () => {
        inspectorFrontendHost.copyText(remoteObject.description);
      }, { jslogContext: "copy-primitive" });
    } else if (remoteObject.type === "object") {
      const copyDecodedValueHandler = async () => {
        const result = await remoteObject.callFunctionJSON(toStringForClipboard, [{
          value: {
            subtype: remoteObject.subtype,
            indent
          }
        }]);
        inspectorFrontendHost.copyText(result);
      };
      ctxMenuClipboardSection.appendItem(i18nString16(UIStrings17.copyS, { PH1: String(copyContextMenuTitle) }), copyDecodedValueHandler, { jslogContext: "copy-object" });
    } else if (remoteObject.type === "function") {
      contextMenu.debugSection().appendItem(i18nString16(UIStrings17.showFunctionDefinition), this.showFunctionDefinition.bind(this, remoteObject), { jslogContext: "show-function-definition" });
    }
    function toStringForClipboard(data) {
      const subtype = data.subtype;
      const indent2 = data.indent;
      if (subtype === "map") {
        if (this instanceof Map) {
          const elements = Array.from(this.entries());
          const literal = elements.length === 0 ? "" : JSON.stringify(elements, null, indent2);
          return `new Map(${literal})`;
        }
        return void 0;
      }
      if (subtype === "set") {
        if (this instanceof Set) {
          const values = Array.from(this.values());
          const literal = values.length === 0 ? "" : JSON.stringify(values, null, indent2);
          return `new Set(${literal})`;
        }
        return void 0;
      }
      if (subtype === "node") {
        return this instanceof Element ? this.outerHTML : void 0;
      }
      if (subtype && typeof this === "undefined") {
        return String(subtype);
      }
      try {
        return JSON.stringify(this, null, indent2);
      } catch {
        return String(this);
      }
    }
  }
  appendNetworkRequestItems(contextMenu, request) {
    const uiSourceCode = this.workspace.uiSourceCodeForURL(request.url());
    if (!uiSourceCode) {
      return;
    }
    const openText = i18nString16(UIStrings17.openInSourcesPanel);
    const callback = this.showUILocation.bind(this, uiSourceCode.uiLocation(0, 0));
    contextMenu.revealSection().appendItem(openText, callback, { jslogContext: "reveal-in-sources" });
  }
  showFunctionDefinition(remoteObject) {
    void SDK11.RemoteObject.RemoteFunction.objectAsFunction(remoteObject).targetFunction().then((targetFunction) => targetFunction.debuggerModel().functionDetailsPromise(targetFunction).then(this.didGetFunctionDetails.bind(this)));
  }
  async didGetFunctionDetails(response) {
    if (!response?.location) {
      return;
    }
    const uiLocation = await Bindings8.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().rawLocationToUILocation(response.location);
    if (uiLocation) {
      this.showUILocation(uiLocation);
    }
  }
  revealNavigatorSidebar() {
    void this.setAsCurrentPanel();
    this.editorView.showBoth(true);
  }
  revealDebuggerSidebar() {
    if (!Common12.Settings.Settings.instance().moduleSetting("auto-focus-on-debugger-paused-enabled").get()) {
      return;
    }
    void this.setAsCurrentPanel();
    this.splitWidget.showBoth(true);
  }
  updateSidebarPosition() {
    let vertically;
    const position = Common12.Settings.Settings.instance().moduleSetting("sidebar-position").get();
    if (position === "right") {
      vertically = false;
    } else if (position === "bottom") {
      vertically = true;
    } else {
      vertically = this.splitWidget.element.offsetWidth < 680;
    }
    if (this.sidebarPaneView && vertically === !this.splitWidget.isVertical()) {
      return;
    }
    if (this.sidebarPaneView?.shouldHideOnDetach()) {
      return;
    }
    if (this.sidebarPaneView) {
      this.sidebarPaneView.detach();
    }
    this.splitWidget.setVertical(!vertically);
    this.splitWidget.element.classList.toggle("sources-split-view-vertical", vertically);
    _SourcesPanel.updateResizerAndSidebarButtons(this);
    if (Root3.Runtime.Runtime.isTraceApp()) {
      return;
    }
    const vbox = new UI18.Widget.VBox();
    vbox.element.appendChild(this.debugToolbar);
    vbox.element.appendChild(this.debugToolbarDrawer);
    vbox.setMinimumAndPreferredSizes(minToolbarWidth, 25, minToolbarWidth, 100);
    this.sidebarPaneStack = UI18.ViewManager.ViewManager.instance().createStackLocation(this.revealDebuggerSidebar.bind(this), void 0, "debug");
    this.sidebarPaneStack.widget().element.classList.add("y-overflow-only");
    this.sidebarPaneStack.widget().show(vbox.element);
    this.sidebarPaneStack.widget().element.appendChild(this.debuggerPausedMessage.element());
    this.sidebarPaneStack.appendApplicableItems("sources.sidebar-top");
    if (this.threadsSidebarPane) {
      this.sidebarPaneStack.appendView(this.threadsSidebarPane);
    }
    const jsBreakpoints = UI18.ViewManager.ViewManager.instance().view("sources.js-breakpoints");
    const scopeChainView = UI18.ViewManager.ViewManager.instance().view("sources.scope-chain");
    if (this.tabbedLocationHeader) {
      this.splitWidget.uninstallResizer(this.tabbedLocationHeader);
      this.tabbedLocationHeader = null;
    }
    if (!vertically) {
      this.sidebarPaneStack.appendView(this.watchSidebarPane);
      void this.sidebarPaneStack.showView(jsBreakpoints);
      void this.sidebarPaneStack.showView(scopeChainView);
      void this.sidebarPaneStack.showView(this.callstackPane);
      this.extensionSidebarPanesContainer = this.sidebarPaneStack;
      this.sidebarPaneView = vbox;
      this.splitWidget.uninstallResizer(this.debugToolbar);
    } else {
      const splitWidget = new UI18.SplitWidget.SplitWidget(true, true, "sources-panel-debugger-sidebar-split-view-state", 0.5);
      splitWidget.setMainWidget(vbox);
      void this.sidebarPaneStack.showView(jsBreakpoints);
      void this.sidebarPaneStack.showView(this.callstackPane);
      const tabbedLocation = UI18.ViewManager.ViewManager.instance().createTabbedLocation(this.revealDebuggerSidebar.bind(this), "sources-panel-debugger-sidebar");
      splitWidget.setSidebarWidget(tabbedLocation.tabbedPane());
      this.tabbedLocationHeader = tabbedLocation.tabbedPane().headerElement();
      this.splitWidget.installResizer(this.tabbedLocationHeader);
      this.splitWidget.installResizer(this.debugToolbar);
      tabbedLocation.appendView(scopeChainView);
      tabbedLocation.appendView(this.watchSidebarPane);
      tabbedLocation.appendApplicableItems("sources.sidebar-tabs");
      this.extensionSidebarPanesContainer = tabbedLocation;
      this.sidebarPaneView = splitWidget;
    }
    this.sidebarPaneStack.appendApplicableItems("sources.sidebar-bottom");
    const extensionSidebarPanes = PanelCommon3.ExtensionServer.ExtensionServer.instance().sidebarPanes();
    for (let i = 0; i < extensionSidebarPanes.length; ++i) {
      this.addExtensionSidebarPane(extensionSidebarPanes[i]);
    }
    this.splitWidget.setSidebarWidget(this.sidebarPaneView);
  }
  setAsCurrentPanel() {
    return UI18.ViewManager.ViewManager.instance().showView("sources");
  }
  extensionSidebarPaneAdded(event) {
    this.addExtensionSidebarPane(event.data);
  }
  addExtensionSidebarPane(pane3) {
    if (pane3.panelName() === this.name) {
      this.extensionSidebarPanesContainer.appendView(pane3);
    }
  }
  sourcesView() {
    return this.#sourcesView;
  }
  handleDrop(dataTransfer) {
    const items = dataTransfer.items;
    if (!items.length) {
      return;
    }
    const entry = items[0].webkitGetAsEntry();
    if (entry?.isDirectory) {
      Host8.InspectorFrontendHost.InspectorFrontendHostInstance.upgradeDraggedFileSystemPermissions(entry.filesystem);
      Host8.userMetrics.actionTaken(Host8.UserMetrics.Action.WorkspaceDropFolder);
      void UI18.ViewManager.ViewManager.instance().showView("navigator-files");
    }
  }
};
var lastModificationTimeout = 200;
var minToolbarWidth = 215;
var UILocationRevealer = class {
  async reveal(uiLocation, omitFocus) {
    SourcesPanel.instance().showUILocation(uiLocation, omitFocus);
  }
};
var UILocationRangeRevealer = class _UILocationRangeRevealer {
  static #instance;
  static instance(opts = { forceNew: false }) {
    if (!_UILocationRangeRevealer.#instance || opts.forceNew) {
      _UILocationRangeRevealer.#instance = new _UILocationRangeRevealer();
    }
    return _UILocationRangeRevealer.#instance;
  }
  async reveal(uiLocationRange, omitFocus) {
    const { uiSourceCode, range: { start: from, end: to } } = uiLocationRange;
    SourcesPanel.instance().showUISourceCode(uiSourceCode, { from, to }, omitFocus);
  }
};
var DebuggerLocationRevealer = class {
  async reveal(rawLocation, omitFocus) {
    const uiLocation = await Bindings8.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().rawLocationToUILocation(rawLocation);
    if (uiLocation) {
      SourcesPanel.instance().showUILocation(uiLocation, omitFocus);
    }
  }
};
var UISourceCodeRevealer = class {
  async reveal(uiSourceCode, omitFocus) {
    SourcesPanel.instance().showUISourceCode(uiSourceCode, void 0, omitFocus);
  }
};
var DebuggerPausedDetailsRevealer = class {
  async reveal(_object) {
    if (Common12.Settings.Settings.instance().moduleSetting("auto-focus-on-debugger-paused-enabled").get()) {
      return await SourcesPanel.instance().setAsCurrentPanel();
    }
  }
};
var RevealingActionDelegate = class {
  handleAction(context, actionId) {
    const panel2 = SourcesPanel.instance();
    if (!panel2.ensureSourcesViewVisible()) {
      return false;
    }
    switch (actionId) {
      case "debugger.toggle-pause": {
        const actionHandledInPausedOverlay = context.flavor(UI18.ShortcutRegistry.ForwardedShortcut) && !Common12.Settings.Settings.instance().moduleSetting("disable-paused-state-overlay").get();
        if (actionHandledInPausedOverlay) {
          return true;
        }
        panel2.togglePause();
        return true;
      }
    }
    return false;
  }
};
var ActionDelegate4 = class {
  handleAction(context, actionId) {
    const panel2 = SourcesPanel.instance();
    switch (actionId) {
      case "debugger.step-over": {
        panel2.stepOver();
        return true;
      }
      case "debugger.step-into": {
        panel2.stepIntoAsync();
        return true;
      }
      case "debugger.step": {
        panel2.stepInto();
        return true;
      }
      case "debugger.step-out": {
        panel2.stepOut();
        return true;
      }
      case "debugger.run-snippet": {
        panel2.runSnippet();
        return true;
      }
      case "debugger.toggle-breakpoints-active": {
        panel2.toggleBreakpointsActive();
        return true;
      }
      case "debugger.evaluate-selection": {
        const frame = context.flavor(UISourceCodeFrame);
        if (frame) {
          const { state: editorState } = frame.textEditor;
          let text = editorState.sliceDoc(editorState.selection.main.from, editorState.selection.main.to);
          const executionContext = context.flavor(SDK11.RuntimeModel.ExecutionContext);
          const consoleModel = executionContext?.target().model(SDK11.ConsoleModel.ConsoleModel);
          if (executionContext && consoleModel) {
            const message = consoleModel.addCommandMessage(executionContext, text);
            text = ObjectUI.JavaScriptREPL.JavaScriptREPL.wrapObjectLiteral(text);
            void consoleModel.evaluateCommandInConsole(
              executionContext,
              message,
              text,
              /* useCommandLineAPI */
              true
            );
          }
        }
        return true;
      }
      case "sources.reveal-in-navigator-sidebar": {
        const uiSourceCode = panel2.sourcesView().currentUISourceCode();
        if (uiSourceCode === null) {
          return false;
        }
        void panel2.revealInNavigator(uiSourceCode);
        return true;
      }
      case "sources.toggle-navigator-sidebar": {
        panel2.toggleNavigatorSidebar();
        return true;
      }
      case "sources.toggle-debugger-sidebar": {
        panel2.toggleDebuggerSidebar();
        return true;
      }
      case "sources.toggle-word-wrap": {
        const setting = Common12.Settings.Settings.instance().moduleSetting("sources.word-wrap");
        setting.set(!setting.get());
        return true;
      }
    }
    return false;
  }
};
var QuickSourceView = class _QuickSourceView extends UI18.Widget.VBox {
  view;
  constructor() {
    super({ jslog: `${VisualLogging11.panel("sources.quick").track({ resize: true })}` });
    this.element.classList.add("sources-view-wrapper");
    this.view = SourcesPanel.instance().sourcesView();
  }
  wasShown() {
    UI18.Context.Context.instance().setFlavor(_QuickSourceView, this);
    super.wasShown();
    if (!SourcesPanel.instance().isShowing()) {
      this.showViewInWrapper();
    } else {
      UI18.InspectorView.InspectorView.instance().setDrawerMinimized(true);
    }
    SourcesPanel.updateResizerAndSidebarButtons(SourcesPanel.instance());
  }
  willHide() {
    UI18.InspectorView.InspectorView.instance().setDrawerMinimized(false);
    queueMicrotask(() => {
      SourcesPanel.updateResizerAndSidebarButtons(SourcesPanel.instance());
    });
    super.willHide();
    UI18.Context.Context.instance().setFlavor(_QuickSourceView, null);
  }
  showViewInWrapper() {
    this.view.show(this.element);
  }
};

// gen/front_end/panels/sources/DebuggerPlugin.js
var { EMPTY_BREAKPOINT_CONDITION, NEVER_PAUSE_HERE_CONDITION } = Breakpoints3.BreakpointManager;
var UIStrings18 = {
  /**
   * @description Text in Debugger Plugin of the Sources panel
   */
  thisScriptIsOnTheDebuggersIgnore: "This script is on the debugger's ignore list",
  /**
   * @description Text to stop preventing the debugger from stepping into library code
   */
  removeFromIgnoreList: "Remove from ignore list",
  /**
   * @description Text of a button in the Sources panel Debugger Plugin to configure ignore listing in Settings
   */
  configure: "Configure",
  /**
   * @description Text to add a breakpoint
   */
  addBreakpoint: "Add breakpoint",
  /**
   * @description A context menu item in the Debugger Plugin of the Sources panel
   */
  addConditionalBreakpoint: "Add conditional breakpoint\u2026",
  /**
   * @description A context menu item in the Debugger Plugin of the Sources panel
   */
  addLogpoint: "Add logpoint\u2026",
  /**
   * @description A context menu item in the Debugger Plugin of the Sources panel
   */
  neverPauseHere: "Never pause here",
  /**
   * @description Context menu command to delete/remove a breakpoint that the user
   *has set. One line of code can have multiple breakpoints. Always >= 1 breakpoint.
   */
  removeBreakpoint: "{n, plural, =1 {Remove breakpoint} other {Remove all breakpoints in line}}",
  /**
   * @description A context menu item in the Debugger Plugin of the Sources panel
   */
  editBreakpoint: "Edit breakpoint\u2026",
  /**
   * @description Context menu command to disable (but not delete) a breakpoint
   *that the user has set. One line of code can have multiple breakpoints. Always
   *>= 1 breakpoint.
   */
  disableBreakpoint: "{n, plural, =1 {Disable breakpoint} other {Disable all breakpoints in line}}",
  /**
   * @description Context menu command to enable a breakpoint that the user has
   *set. One line of code can have multiple breakpoints. Always >= 1 breakpoint.
   */
  enableBreakpoint: "{n, plural, =1 {Enable breakpoint} other {Enable all breakpoints in line}}",
  /**
   * @description Text in Debugger Plugin of the Sources panel
   */
  addSourceMap: "Add source map\u2026",
  /**
   * @description Text in Debugger Plugin of the Sources panel
   */
  addWasmDebugInfo: "Add DWARF debug info\u2026",
  /**
   * @description Text in Debugger Plugin of the Sources panel
   */
  sourceMapLoaded: "Source map loaded",
  /**
   * @description Title of the Filtered List WidgetProvider of Quick Open
   * @example {Ctrl+P Ctrl+O} PH1
   */
  associatedFilesAreAvailable: "Associated files are available via file tree or {PH1}.",
  /**
   * @description Text in Debugger Plugin of the Sources panel
   */
  associatedFilesShouldBeAdded: "Associated files should be added to the file tree. You can debug these resolved source files as regular JavaScript files.",
  /**
   * @description Text in Debugger Plugin of the Sources panel
   */
  theDebuggerWillSkipStepping: "The debugger will skip stepping through this script, and will not stop on exceptions.",
  /**
   * @description Text in Debugger Plugin of the Sources panel
   */
  sourceMapSkipped: "Source map skipped for this file",
  /**
   * @description Text in Debugger Plugin of the Sources panel
   */
  sourceMapFailed: "Source map failed to load",
  /**
   * @description Text in Debugger Plugin of the Sources panel
   */
  debuggingPowerReduced: "DevTools can't show authored sources, but you can debug the deployed code.",
  /**
   * @description Text in Debugger Plugin of the Sources panel
   */
  reloadForSourceMap: "To enable again, make sure the file isn't on the ignore list and reload.",
  /**
   * @description Text in Debugger Plugin of the Sources panel
   * @example {http://site.com/lib.js.map} PH1
   * @example {HTTP error: status code 404, net::ERR_UNKNOWN_URL_SCHEME} PH2
   */
  errorLoading: "Error loading url {PH1}: {PH2}",
  /**
   * @description Error message that is displayed in UI when a file needed for debugging information for a call frame is missing
   * @example {src/myapp.debug.wasm.dwp} PH1
   */
  debugFileNotFound: 'Failed to load debug file "{PH1}".',
  /**
   * @description Error message that is displayed when no debug info could be loaded
   * @example {app.wasm} PH1
   */
  debugInfoNotFound: "Failed to load any debug info for {PH1}",
  /**
   * @description Text of a button to open up details on a request when no debug info could be loaded
   */
  showRequest: "Show request",
  /**
   * @description Tooltip text that shows on hovering over a button to see more details on a request
   */
  openDeveloperResources: "Opens the request in the Developer resource panel"
};
var str_18 = i18n37.i18n.registerUIStrings("panels/sources/DebuggerPlugin.ts", UIStrings18);
var i18nString17 = i18n37.i18n.getLocalizedString.bind(void 0, str_18);
var MAX_POSSIBLE_BREAKPOINT_LINE = 2500;
var MAX_CODE_SIZE_FOR_VALUE_DECORATIONS = 1e4;
var MAX_PROPERTIES_IN_SCOPE_FOR_VALUE_DECORATIONS = 500;
var debuggerPluginForUISourceCode = /* @__PURE__ */ new Map();
var DebuggerPlugin = class extends Plugin {
  transformer;
  editor = void 0;
  // Set if the debugger is stopped on a breakpoint in this file
  executionLocation = null;
  // Track state of the control key because holding it makes debugger
  // target locations show up in the editor
  controlDown = false;
  controlTimeout = void 0;
  sourceMapInfobar = null;
  scriptsPanel;
  breakpointManager;
  // Manages pop-overs shown when the debugger is active and the user
  // hovers over an expression
  popoverHelper = null;
  scriptFileForDebuggerModel;
  // The current set of breakpoints for this file. The locations in
  // here are kept in sync with their editor position. When a file's
  // content is edited and later saved, these are used as a source of
  // truth for re-creating the breakpoints.
  breakpoints = [];
  continueToLocations = null;
  liveLocationPool;
  // When the editor content is changed by the user, this becomes
  // true. When the plugin is muted, breakpoints show up as disabled
  // and can't be manipulated. It is cleared again when the content is
  // saved.
  muted;
  // If the plugin is initialized in muted state, we cannot correlated
  // breakpoint position in the breakpoint manager with editor
  // locations, so breakpoint manipulation is permanently disabled.
  initializedMuted;
  ignoreListInfobar;
  refreshBreakpointsTimeout = void 0;
  activeBreakpointDialog = null;
  #activeBreakpointEditRequest = void 0;
  #scheduledFinishingActiveDialog = false;
  missingDebugInfoBar = null;
  #sourcesPanelDebuggedMetricsRecorded = false;
  loader;
  ignoreListCallback;
  constructor(uiSourceCode, transformer) {
    super(uiSourceCode);
    this.transformer = transformer;
    debuggerPluginForUISourceCode.set(uiSourceCode, this);
    this.scriptsPanel = SourcesPanel.instance();
    this.breakpointManager = Breakpoints3.BreakpointManager.BreakpointManager.instance();
    this.breakpointManager.addEventListener(Breakpoints3.BreakpointManager.Events.BreakpointAdded, this.breakpointChange, this);
    this.breakpointManager.addEventListener(Breakpoints3.BreakpointManager.Events.BreakpointRemoved, this.breakpointChange, this);
    this.uiSourceCode.addEventListener(Workspace21.UISourceCode.Events.WorkingCopyChanged, this.workingCopyChanged, this);
    this.uiSourceCode.addEventListener(Workspace21.UISourceCode.Events.WorkingCopyCommitted, this.workingCopyCommitted, this);
    this.scriptFileForDebuggerModel = /* @__PURE__ */ new Map();
    this.loader = SDK12.PageResourceLoader.PageResourceLoader.instance();
    this.loader.addEventListener("Update", this.showSourceMapInfobarIfNeeded.bind(this), this);
    this.ignoreListCallback = this.showIgnoreListInfobarIfNeeded.bind(this);
    Workspace21.IgnoreListManager.IgnoreListManager.instance().addChangeListener(this.ignoreListCallback);
    UI19.Context.Context.instance().addFlavorChangeListener(SDK12.DebuggerModel.CallFrame, this.callFrameChanged, this);
    this.liveLocationPool = new Bindings9.LiveLocation.LiveLocationPool();
    this.updateScriptFiles();
    this.muted = this.uiSourceCode.isDirty();
    this.initializedMuted = this.muted;
    this.ignoreListInfobar = null;
    this.showIgnoreListInfobarIfNeeded();
    for (const scriptFile of this.scriptFileForDebuggerModel.values()) {
      scriptFile.checkMapping();
    }
  }
  editorExtension() {
    const handlers = this.shortcutHandlers();
    return [
      CodeMirror6.EditorView.updateListener.of((update) => this.onEditorUpdate(update)),
      CodeMirror6.EditorView.domEventHandlers({
        keydown: (event) => {
          if (this.onKeyDown(event)) {
            return true;
          }
          handlers(event);
          return event.defaultPrevented;
        },
        keyup: (event) => this.onKeyUp(event),
        mousemove: (event) => this.onMouseMove(event),
        mousedown: (event) => this.onMouseDown(event),
        focusout: (event) => this.onBlur(event),
        wheel: (event) => this.onWheel(event)
      }),
      CodeMirror6.lineNumbers({
        domEventHandlers: {
          click: (view, block, event) => this.handleGutterClick(view.state.doc.lineAt(block.from), event)
        }
      }),
      breakpointMarkers,
      TextEditor6.ExecutionPositionHighlighter.positionHighlighter("cm-executionLine", "cm-executionToken"),
      CodeMirror6.Prec.lowest(continueToMarkers.field),
      markIfContinueTo,
      valueDecorations.field,
      CodeMirror6.Prec.lowest(evalExpression.field),
      theme4,
      this.uiSourceCode.project().type() === Workspace21.Workspace.projectTypes.Debugger ? CodeMirror6.EditorView.editorAttributes.of({ class: "source-frame-debugger-script" }) : []
    ];
  }
  shortcutHandlers() {
    const selectionLine = (editor) => {
      return editor.state.doc.lineAt(editor.state.selection.main.head);
    };
    return UI19.ShortcutRegistry.ShortcutRegistry.instance().getShortcutListener({
      "debugger.toggle-breakpoint": async () => {
        if (this.muted || !this.editor) {
          return false;
        }
        await this.toggleBreakpoint(selectionLine(this.editor), false);
        return true;
      },
      "debugger.toggle-breakpoint-enabled": async () => {
        if (this.muted || !this.editor) {
          return false;
        }
        await this.toggleBreakpoint(selectionLine(this.editor), true);
        return true;
      },
      "debugger.breakpoint-input-window": async () => {
        if (this.muted || !this.editor) {
          return false;
        }
        const line = selectionLine(this.editor);
        this.#openEditDialogForLine(line);
        return true;
      }
    });
  }
  #openEditDialogForLine(line, isLogpoint) {
    if (this.muted) {
      return;
    }
    if (this.activeBreakpointDialog) {
      this.activeBreakpointDialog.finishEditing(false, "");
    }
    const breakpoint = this.breakpoints.find((b) => b.position >= line.from && b.position <= line.to)?.breakpoint || null;
    if (isLogpoint === void 0 && breakpoint !== null) {
      isLogpoint = breakpoint.isLogpoint();
    }
    this.editBreakpointCondition({ line, breakpoint, location: null, isLogpoint });
  }
  editorInitialized(editor) {
    this.editor = editor;
    computeNonBreakableLines(editor.state, this.transformer, this.uiSourceCode).then((linePositions) => {
      if (linePositions.length) {
        editor.dispatch({ effects: SourceFrame13.SourceFrame.addNonBreakableLines.of(linePositions) });
      }
    }, console.error);
    if (this.ignoreListInfobar) {
      this.attachInfobar(this.ignoreListInfobar);
    }
    if (this.missingDebugInfoBar) {
      this.attachInfobar(this.missingDebugInfoBar);
    }
    if (this.sourceMapInfobar) {
      this.attachInfobar(this.sourceMapInfobar);
    }
    if (!this.muted) {
      void this.refreshBreakpoints();
    }
    void this.callFrameChanged();
    this.popoverHelper?.dispose();
    this.popoverHelper = new UI19.PopoverHelper.PopoverHelper(editor, this.getPopoverRequest.bind(this), "sources.object-properties");
    this.popoverHelper.setDisableOnClick(true);
    this.popoverHelper.setTimeout(250, 250);
  }
  static accepts(uiSourceCode) {
    return uiSourceCode.contentType().hasScripts();
  }
  showIgnoreListInfobarIfNeeded() {
    const uiSourceCode = this.uiSourceCode;
    if (!uiSourceCode.contentType().hasScripts()) {
      return;
    }
    if (!Workspace21.IgnoreListManager.IgnoreListManager.instance().isUserOrSourceMapIgnoreListedUISourceCode(uiSourceCode)) {
      this.hideIgnoreListInfobar();
      return;
    }
    if (this.ignoreListInfobar) {
      this.ignoreListInfobar.dispose();
    }
    function unIgnoreList() {
      Workspace21.IgnoreListManager.IgnoreListManager.instance().unIgnoreListUISourceCode(uiSourceCode);
    }
    const infobar = new UI19.Infobar.Infobar("warning", i18nString17(UIStrings18.thisScriptIsOnTheDebuggersIgnore), [
      {
        text: i18nString17(UIStrings18.configure),
        delegate: UI19.ViewManager.ViewManager.instance().showView.bind(UI19.ViewManager.ViewManager.instance(), "blackbox"),
        dismiss: false,
        jslogContext: "configure"
      },
      {
        text: i18nString17(UIStrings18.removeFromIgnoreList),
        delegate: unIgnoreList,
        buttonVariant: "tonal",
        dismiss: true,
        jslogContext: "remove-from-ignore-list"
      }
    ], void 0, "script-on-ignore-list");
    this.ignoreListInfobar = infobar;
    infobar.setCloseCallback(() => this.removeInfobar(this.ignoreListInfobar));
    infobar.createDetailsRowMessage(i18nString17(UIStrings18.theDebuggerWillSkipStepping));
    this.attachInfobar(this.ignoreListInfobar);
  }
  attachInfobar(bar) {
    if (this.editor) {
      this.editor.dispatch({ effects: SourceFrame13.SourceFrame.addSourceFrameInfobar.of({ element: bar.element }) });
    }
  }
  removeInfobar(bar) {
    if (this.editor && bar) {
      this.editor.dispatch({ effects: SourceFrame13.SourceFrame.removeSourceFrameInfobar.of({ element: bar.element }) });
    }
  }
  hideIgnoreListInfobar() {
    if (!this.ignoreListInfobar) {
      return;
    }
    this.ignoreListInfobar.dispose();
    this.ignoreListInfobar = null;
  }
  willHide() {
    super.willHide();
    this.popoverHelper?.hidePopover();
  }
  editBreakpointLocation({ breakpoint, uiLocation }) {
    const { lineNumber } = this.transformer.uiLocationToEditorLocation(uiLocation.lineNumber, uiLocation.columnNumber);
    const line = this.editor?.state.doc.line(lineNumber + 1);
    if (!line) {
      return;
    }
    this.editBreakpointCondition({ line, breakpoint, location: null, isLogpoint: breakpoint.isLogpoint() });
  }
  populateLineGutterContextMenu(contextMenu, editorLineNumber) {
    const uiLocation = new Workspace21.UISourceCode.UILocation(this.uiSourceCode, editorLineNumber, 0);
    this.scriptsPanel.appendUILocationItems(contextMenu, uiLocation);
    if (this.muted || !this.editor) {
      return;
    }
    const line = this.editor.state.doc.line(editorLineNumber + 1);
    const breakpoints = this.lineBreakpoints(line);
    const supportsConditionalBreakpoints = Bindings9.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().supportsConditionalBreakpoints(this.uiSourceCode);
    if (!breakpoints.length) {
      if (this.editor && SourceFrame13.SourceFrame.isBreakableLine(this.editor.state, line)) {
        contextMenu.debugSection().appendItem(i18nString17(UIStrings18.addBreakpoint), this.createNewBreakpoint.bind(
          this,
          line,
          EMPTY_BREAKPOINT_CONDITION,
          /* enabled */
          true,
          /* isLogpoint */
          false
        ), { jslogContext: "add-breakpoint" });
        if (supportsConditionalBreakpoints) {
          contextMenu.debugSection().appendItem(i18nString17(UIStrings18.addConditionalBreakpoint), () => {
            this.editBreakpointCondition({ line, breakpoint: null, location: null, isLogpoint: false });
          }, { jslogContext: "add-cnd-breakpoint" });
          contextMenu.debugSection().appendItem(i18nString17(UIStrings18.addLogpoint), () => {
            this.editBreakpointCondition({ line, breakpoint: null, location: null, isLogpoint: true });
          }, { jslogContext: "add-logpoint" });
          contextMenu.debugSection().appendItem(i18nString17(UIStrings18.neverPauseHere), this.createNewBreakpoint.bind(
            this,
            line,
            NEVER_PAUSE_HERE_CONDITION,
            /* enabled */
            true,
            /* isLogpoint */
            false
          ), { jslogContext: "never-pause-here" });
        }
      }
    } else {
      const removeTitle = i18nString17(UIStrings18.removeBreakpoint, { n: breakpoints.length });
      contextMenu.debugSection().appendItem(removeTitle, () => breakpoints.forEach((breakpoint) => {
        Host9.userMetrics.actionTaken(Host9.UserMetrics.Action.BreakpointRemovedFromGutterContextMenu);
        void breakpoint.remove(false);
      }), { jslogContext: "remove-breakpoint" });
      if (breakpoints.length === 1 && supportsConditionalBreakpoints) {
        contextMenu.debugSection().appendItem(i18nString17(UIStrings18.editBreakpoint), () => {
          this.editBreakpointCondition({ line, breakpoint: breakpoints[0], location: null });
        }, { jslogContext: "edit-breakpoint" });
      }
      const hasEnabled = breakpoints.some((breakpoint) => breakpoint.enabled());
      if (hasEnabled) {
        const title = i18nString17(UIStrings18.disableBreakpoint, { n: breakpoints.length });
        contextMenu.debugSection().appendItem(title, () => breakpoints.forEach((breakpoint) => breakpoint.setEnabled(false)), { jslogContext: "enable-breakpoint" });
      }
      const hasDisabled = breakpoints.some((breakpoint) => !breakpoint.enabled());
      if (hasDisabled) {
        const title = i18nString17(UIStrings18.enableBreakpoint, { n: breakpoints.length });
        contextMenu.debugSection().appendItem(title, () => breakpoints.forEach((breakpoint) => breakpoint.setEnabled(true)), { jslogContext: "disable-breakpoint" });
      }
    }
  }
  populateTextAreaContextMenu(contextMenu) {
    function addSourceMapURL(scriptFile) {
      const dialog4 = AddDebugInfoURLDialog.createAddSourceMapURLDialog(addSourceMapURLDialogCallback.bind(null, scriptFile));
      dialog4.show();
    }
    function addSourceMapURLDialogCallback(scriptFile, url) {
      if (!url) {
        return;
      }
      scriptFile.addSourceMapURL(url);
    }
    function addDebugInfoURL(scriptFile) {
      const dialog4 = AddDebugInfoURLDialog.createAddDWARFSymbolsURLDialog(addDebugInfoURLDialogCallback.bind(this, scriptFile));
      dialog4.show();
    }
    function addDebugInfoURLDialogCallback(scriptFile, url) {
      if (!url) {
        return;
      }
      scriptFile.addDebugInfoURL(url);
      if (scriptFile.script?.debuggerModel) {
        this.updateScriptFile(scriptFile.script?.debuggerModel);
      }
    }
    if (this.uiSourceCode.project().type() === Workspace21.Workspace.projectTypes.Network && Common13.Settings.Settings.instance().moduleSetting("js-source-maps-enabled").get() && !Workspace21.IgnoreListManager.IgnoreListManager.instance().isUserIgnoreListedURL(this.uiSourceCode.url())) {
      if (this.scriptFileForDebuggerModel.size) {
        const scriptFile = this.scriptFileForDebuggerModel.values().next().value;
        const addSourceMapURLLabel = i18nString17(UIStrings18.addSourceMap);
        contextMenu.debugSection().appendItem(addSourceMapURLLabel, addSourceMapURL.bind(null, scriptFile), { jslogContext: "add-source-map" });
        if (scriptFile.script?.isWasm() && !Bindings9.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().pluginManager.hasPluginForScript(scriptFile.script)) {
          contextMenu.debugSection().appendItem(i18nString17(UIStrings18.addWasmDebugInfo), addDebugInfoURL.bind(this, scriptFile), { jslogContext: "add-wasm-debug-info" });
        }
      }
    }
  }
  workingCopyChanged() {
    if (!this.scriptFileForDebuggerModel.size) {
      this.setMuted(this.uiSourceCode.isDirty());
    }
  }
  workingCopyCommitted() {
    this.scriptsPanel.updateLastModificationTime();
    if (!this.scriptFileForDebuggerModel.size) {
      this.setMuted(false);
    }
  }
  didMergeToVM() {
    if (this.consistentScripts()) {
      this.setMuted(false);
    }
  }
  didDivergeFromVM() {
    this.setMuted(true);
  }
  setMuted(value2) {
    if (this.initializedMuted) {
      return;
    }
    if (value2 !== this.muted) {
      this.muted = value2;
      if (!value2) {
        void this.restoreBreakpointsAfterEditing();
      } else if (this.editor) {
        this.editor.dispatch({ effects: muteBreakpoints.of(null) });
      }
    }
  }
  consistentScripts() {
    for (const scriptFile of this.scriptFileForDebuggerModel.values()) {
      if (scriptFile.hasDivergedFromVM() || scriptFile.isMergingToVM()) {
        return false;
      }
    }
    return true;
  }
  isIdentifier(tokenType) {
    return tokenType === "VariableName" || tokenType === "VariableDefinition" || tokenType === "PropertyName" || tokenType === "PropertyDefinition";
  }
  getPopoverRequest(event) {
    if (event instanceof KeyboardEvent) {
      return null;
    }
    if (UI19.KeyboardShortcut.KeyboardShortcut.eventHasCtrlEquivalentKey(event)) {
      return null;
    }
    const target = UI19.Context.Context.instance().flavor(SDK12.Target.Target);
    const debuggerModel = target ? target.model(SDK12.DebuggerModel.DebuggerModel) : null;
    const { editor } = this;
    if (!debuggerModel || !debuggerModel.isPaused() || !editor) {
      return null;
    }
    const selectedCallFrame = UI19.Context.Context.instance().flavor(SDK12.DebuggerModel.CallFrame);
    if (!selectedCallFrame) {
      return null;
    }
    let textPosition = editor.editor.posAtCoords(event);
    if (!textPosition) {
      return null;
    }
    const positionCoords = editor.editor.coordsAtPos(textPosition);
    if (!positionCoords || event.clientY < positionCoords.top || event.clientY > positionCoords.bottom || event.clientX < positionCoords.left - 30 || event.clientX > positionCoords.right + 30) {
      return null;
    }
    if (event.clientX < positionCoords.left && textPosition > editor.state.doc.lineAt(textPosition).from) {
      textPosition -= 1;
    }
    const highlightRange = computePopoverHighlightRange(editor.state, this.uiSourceCode.mimeType(), textPosition);
    if (!highlightRange) {
      return null;
    }
    const highlightLine = editor.state.doc.lineAt(highlightRange.from);
    if (highlightRange.to > highlightLine.to) {
      return null;
    }
    const leftCorner = editor.editor.coordsAtPos(highlightRange.from);
    const rightCorner = editor.editor.coordsAtPos(highlightRange.to);
    if (!leftCorner || !rightCorner) {
      return null;
    }
    const box = new AnchorBox(leftCorner.left, leftCorner.top - 2, rightCorner.right - leftCorner.left, rightCorner.bottom - leftCorner.top);
    const evaluationText = editor.state.sliceDoc(highlightRange.from, highlightRange.to);
    let objectPopoverHelper = null;
    return {
      box,
      show: async (popover) => {
        let resolvedText = "";
        if (selectedCallFrame.script.isJavaScript()) {
          const nameMap = await SourceMapScopes2.NamesResolver.allVariablesInCallFrame(selectedCallFrame);
          try {
            resolvedText = await Formatter.FormatterWorkerPool.formatterWorkerPool().javaScriptSubstitute(evaluationText, nameMap);
          } catch {
          }
        }
        const throwOnSideEffect = highlightRange.containsSideEffects;
        const result = await selectedCallFrame.evaluate({
          expression: resolvedText || evaluationText,
          objectGroup: "popover",
          includeCommandLineAPI: false,
          silent: true,
          returnByValue: false,
          generatePreview: false,
          throwOnSideEffect,
          timeout: void 0,
          disableBreaks: void 0,
          replMode: void 0,
          allowUnsafeEvalBlockedByCSP: void 0
        });
        if (!result || "error" in result || !result.object || result.object.type === "object" && result.object.subtype === "error") {
          return false;
        }
        objectPopoverHelper = await ObjectUI2.ObjectPopoverHelper.ObjectPopoverHelper.buildObjectPopover(result.object, popover);
        const potentiallyUpdatedCallFrame = UI19.Context.Context.instance().flavor(SDK12.DebuggerModel.CallFrame);
        if (!objectPopoverHelper || selectedCallFrame !== potentiallyUpdatedCallFrame) {
          debuggerModel.runtimeModel().releaseObjectGroup("popover");
          if (objectPopoverHelper) {
            objectPopoverHelper.dispose();
          }
          return false;
        }
        const decoration = CodeMirror6.Decoration.set(evalExpressionMark.range(highlightRange.from, highlightRange.to));
        editor.dispatch({ effects: evalExpression.update.of(decoration) });
        return true;
      },
      hide: () => {
        if (objectPopoverHelper) {
          objectPopoverHelper.dispose();
        }
        debuggerModel.runtimeModel().releaseObjectGroup("popover");
        editor.dispatch({ effects: evalExpression.update.of(CodeMirror6.Decoration.none) });
      }
    };
  }
  onEditorUpdate(update) {
    if (!update.changes.empty) {
      for (const breakpointDesc of this.breakpoints) {
        breakpointDesc.position = update.changes.mapPos(breakpointDesc.position);
      }
    }
  }
  onWheel(event) {
    if (this.executionLocation && UI19.KeyboardShortcut.KeyboardShortcut.eventHasCtrlEquivalentKey(event)) {
      event.preventDefault();
    }
  }
  onKeyDown(event) {
    const ctrlDown = UI19.KeyboardShortcut.KeyboardShortcut.eventHasCtrlEquivalentKey(event);
    if (!ctrlDown) {
      this.setControlDown(false);
    }
    if (event.key === Platform13.KeyboardUtilities.ESCAPE_KEY) {
      if (this.popoverHelper?.isPopoverVisible()) {
        this.popoverHelper.hidePopover();
        event.consume();
        return true;
      }
    }
    if (ctrlDown && this.executionLocation) {
      this.setControlDown(true);
    }
    return false;
  }
  onMouseMove(event) {
    if (this.executionLocation && this.controlDown && UI19.KeyboardShortcut.KeyboardShortcut.eventHasCtrlEquivalentKey(event)) {
      if (!this.continueToLocations) {
        void this.showContinueToLocations();
      }
    }
  }
  onMouseDown(event) {
    if (!this.executionLocation || !UI19.KeyboardShortcut.KeyboardShortcut.eventHasCtrlEquivalentKey(event)) {
      return;
    }
    if (!this.continueToLocations || !this.editor) {
      return;
    }
    event.consume();
    const textPosition = this.editor.editor.posAtCoords(event);
    if (textPosition === null) {
      return;
    }
    for (const { from, to, click } of this.continueToLocations) {
      if (from <= textPosition && to >= textPosition) {
        click();
        break;
      }
    }
  }
  onBlur(_event) {
    this.setControlDown(false);
  }
  onKeyUp(_event) {
    this.setControlDown(false);
  }
  setControlDown(state) {
    if (state !== this.controlDown) {
      this.controlDown = state;
      clearTimeout(this.controlTimeout);
      this.controlTimeout = void 0;
      if (state && this.executionLocation) {
        this.controlTimeout = window.setTimeout(() => {
          if (this.executionLocation && this.controlDown) {
            void this.showContinueToLocations();
          }
        }, 150);
      } else {
        this.clearContinueToLocations();
      }
    }
  }
  editBreakpointCondition(breakpointEditRequest) {
    const { line, breakpoint, location, isLogpoint } = breakpointEditRequest;
    if (breakpoint?.isRemoved) {
      return;
    }
    this.#scheduledFinishingActiveDialog = false;
    const isRepeatedEditRequest = this.#activeBreakpointEditRequest && isSameEditRequest(this.#activeBreakpointEditRequest, breakpointEditRequest);
    if (isRepeatedEditRequest) {
      return;
    }
    if (this.activeBreakpointDialog) {
      this.activeBreakpointDialog.saveAndFinish();
    }
    const editor = this.editor;
    const oldCondition = breakpoint ? breakpoint.condition() : "";
    const isLogpointForDialog = breakpoint?.isLogpoint() ?? Boolean(isLogpoint);
    const decorationElement = document.createElement("div");
    const compartment = new CodeMirror6.Compartment();
    const dialog4 = new BreakpointEditDialog(line.number - 1, oldCondition, isLogpointForDialog, async (result) => {
      this.activeBreakpointDialog = null;
      this.#activeBreakpointEditRequest = void 0;
      dialog4.detach();
      editor.dispatch({ effects: compartment.reconfigure([]) });
      if (!result.committed) {
        BreakpointsSidebarController.instance().breakpointEditFinished(breakpoint, false);
        return;
      }
      BreakpointsSidebarController.instance().breakpointEditFinished(breakpoint, oldCondition !== result.condition);
      if (breakpoint) {
        breakpoint.setCondition(result.condition, result.isLogpoint);
      } else if (location) {
        await this.setBreakpoint(
          location.lineNumber,
          location.columnNumber,
          result.condition,
          /* enabled */
          true,
          result.isLogpoint
        );
      } else {
        await this.createNewBreakpoint(
          line,
          result.condition,
          /* enabled */
          true,
          result.isLogpoint
        );
      }
    });
    editor.dispatch({
      effects: CodeMirror6.StateEffect.appendConfig.of(compartment.of(CodeMirror6.EditorView.decorations.of(CodeMirror6.Decoration.set([CodeMirror6.Decoration.widget({
        block: true,
        widget: new class extends CodeMirror6.WidgetType {
          toDOM() {
            return decorationElement;
          }
        }(),
        side: 1
      }).range(line.to)]))))
    });
    dialog4.element.addEventListener("blur", async (event) => {
      if (!event.relatedTarget || event.relatedTarget && !event.relatedTarget.isSelfOrDescendant(dialog4.element)) {
        this.#scheduledFinishingActiveDialog = true;
        setTimeout(() => {
          if (this.activeBreakpointDialog === dialog4) {
            if (this.#scheduledFinishingActiveDialog) {
              dialog4.saveAndFinish();
              this.#scheduledFinishingActiveDialog = false;
            } else {
              dialog4.focusEditor();
            }
          }
        }, 200);
      }
    }, true);
    dialog4.markAsExternallyManaged();
    dialog4.show(decorationElement);
    dialog4.focusEditor();
    this.activeBreakpointDialog = dialog4;
    this.#activeBreakpointEditRequest = breakpointEditRequest;
    function isSameEditRequest(editA, editB) {
      if (editA.line.number !== editB.line.number) {
        return false;
      }
      if (editA.line.from !== editB.line.from) {
        return false;
      }
      if (editA.line.text !== editB.line.text) {
        return false;
      }
      if (editA.breakpoint !== editB.breakpoint) {
        return false;
      }
      if (editA.location !== editB.location) {
        return false;
      }
      return editA.isLogpoint === editB.isLogpoint;
    }
  }
  // Show widgets with variable's values after lines that mention the
  // variables, if the debugger is paused in this file.
  async updateValueDecorations() {
    if (!this.editor) {
      return;
    }
    const decorations = this.executionLocation ? await this.computeValueDecorations() : null;
    if (!this.editor) {
      return;
    }
    if (decorations || this.editor.state.field(valueDecorations.field).size) {
      this.editor.dispatch({ effects: valueDecorations.update.of(decorations || CodeMirror6.Decoration.none) });
    }
  }
  async #rawLocationToEditorOffset(location, url) {
    const uiLocation = location && await Bindings9.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().rawLocationToUILocation(location);
    if (!uiLocation || uiLocation.uiSourceCode.url() !== url) {
      return null;
    }
    const offset = this.editor?.toOffset(this.transformer.uiLocationToEditorLocation(uiLocation.lineNumber, uiLocation.columnNumber));
    return offset ?? null;
  }
  async computeValueDecorations() {
    if (!this.editor) {
      return null;
    }
    if (!Common13.Settings.Settings.instance().moduleSetting("inline-variable-values").get()) {
      return null;
    }
    const executionContext = UI19.Context.Context.instance().flavor(SDK12.RuntimeModel.ExecutionContext);
    if (!executionContext) {
      return null;
    }
    const callFrame = UI19.Context.Context.instance().flavor(SDK12.DebuggerModel.CallFrame);
    if (!callFrame) {
      return null;
    }
    const url = this.uiSourceCode.url();
    const rawLocationToEditorOffset = (location) => this.#rawLocationToEditorOffset(location, url);
    const functionOffsetPromise = this.#rawLocationToEditorOffset(callFrame.functionLocation(), url);
    const executionOffsetPromise = this.#rawLocationToEditorOffset(callFrame.location(), url);
    const [functionOffset, executionOffset] = await Promise.all([functionOffsetPromise, executionOffsetPromise]);
    if (!functionOffset || !executionOffset || !this.editor) {
      return null;
    }
    if (functionOffset >= executionOffset || executionOffset - functionOffset > MAX_CODE_SIZE_FOR_VALUE_DECORATIONS) {
      return null;
    }
    while (CodeMirror6.syntaxParserRunning(this.editor.editor)) {
      await new Promise((resolve) => window.requestIdleCallback(resolve));
      if (!this.editor) {
        return null;
      }
      CodeMirror6.ensureSyntaxTree(this.editor.state, executionOffset, 16);
    }
    const variableNames = getVariableNamesByLine(this.editor.state, functionOffset, executionOffset, executionOffset);
    if (variableNames.length === 0) {
      return null;
    }
    const scopeMappings = await computeScopeMappings(callFrame, rawLocationToEditorOffset);
    if (!this.editor || scopeMappings.length === 0) {
      return null;
    }
    const variablesByLine = getVariableValuesByLine(scopeMappings, variableNames);
    if (!variablesByLine || !this.editor) {
      return null;
    }
    const decorations = [];
    for (const [line, names] of variablesByLine) {
      const prevLine = variablesByLine.get(line - 1);
      let newNames = prevLine ? Array.from(names).filter((n) => prevLine.get(n[0]) !== n[1]) : Array.from(names);
      if (!newNames.length) {
        continue;
      }
      if (newNames.length > 10) {
        newNames = newNames.slice(0, 10);
      }
      decorations.push(CodeMirror6.Decoration.widget({ widget: new ValueDecoration(newNames), side: 1 }).range(this.editor.state.doc.line(line + 1).to));
    }
    return CodeMirror6.Decoration.set(decorations, true);
  }
  // Highlight the locations the debugger can continue to (when
  // Control is held)
  async showContinueToLocations() {
    this.popoverHelper?.hidePopover();
    const executionContext = UI19.Context.Context.instance().flavor(SDK12.RuntimeModel.ExecutionContext);
    if (!executionContext || !this.editor) {
      return;
    }
    const callFrame = UI19.Context.Context.instance().flavor(SDK12.DebuggerModel.CallFrame);
    if (!callFrame) {
      return;
    }
    const start = callFrame.functionLocation() || callFrame.location();
    const debuggerModel = callFrame.debuggerModel;
    const { state } = this.editor;
    const locations = await debuggerModel.getPossibleBreakpoints(start, null, true);
    this.continueToLocations = [];
    let previousCallLine = -1;
    for (const location of locations.reverse()) {
      const editorLocation = this.transformer.uiLocationToEditorLocation(location.lineNumber, location.columnNumber);
      if (previousCallLine === editorLocation.lineNumber && location.type !== "call" || editorLocation.lineNumber >= state.doc.lines) {
        continue;
      }
      const line = state.doc.line(editorLocation.lineNumber + 1);
      const position = Math.min(line.to, line.from + editorLocation.columnNumber);
      let syntaxNode = CodeMirror6.syntaxTree(state).resolveInner(position, 1);
      if (syntaxNode.firstChild || syntaxNode.from < line.from || syntaxNode.to > line.to) {
        continue;
      }
      if (syntaxNode.name === ".") {
        const nextNode = syntaxNode.resolve(syntaxNode.to, 1);
        if (nextNode.firstChild || nextNode.from < line.from || nextNode.to > line.to) {
          continue;
        }
        syntaxNode = nextNode;
      }
      const syntaxType = syntaxNode.name;
      const validKeyword = syntaxType === "this" || syntaxType === "return" || syntaxType === "new" || syntaxType === "break" || syntaxType === "continue";
      if (!validKeyword && !this.isIdentifier(syntaxType)) {
        continue;
      }
      this.continueToLocations.push({ from: syntaxNode.from, to: syntaxNode.to, async: false, click: () => location.continueToLocation() });
      if (location.type === "call") {
        previousCallLine = editorLocation.lineNumber;
      }
      const identifierName = validKeyword ? "" : line.text.slice(syntaxNode.from - line.from, syntaxNode.to - line.from);
      let asyncCall = null;
      if (identifierName === "then" && syntaxNode.parent?.name === "MemberExpression") {
        asyncCall = syntaxNode.parent.parent;
      } else if (identifierName === "setTimeout" || identifierName === "setInterval" || identifierName === "postMessage") {
        asyncCall = syntaxNode.parent;
      }
      if (syntaxType === "new") {
        const callee = syntaxNode.parent?.getChild("Expression");
        if (callee && callee.name === "VariableName" && state.sliceDoc(callee.from, callee.to) === "Worker") {
          asyncCall = syntaxNode.parent;
        }
      }
      if (asyncCall && (asyncCall.name === "CallExpression" || asyncCall.name === "NewExpression") && location.type === "call") {
        const firstArg = asyncCall.getChild("ArgList")?.firstChild?.nextSibling;
        let highlightNode;
        if (firstArg?.name === "VariableName") {
          highlightNode = firstArg;
        } else if (firstArg?.name === "ArrowFunction" || firstArg?.name === "FunctionExpression") {
          highlightNode = firstArg.firstChild;
          if (highlightNode?.name === "async") {
            highlightNode = highlightNode.nextSibling;
          }
        }
        if (highlightNode) {
          const isCurrentPosition = this.executionLocation && location.lineNumber === this.executionLocation.lineNumber && location.columnNumber === this.executionLocation.columnNumber;
          this.continueToLocations.push({
            from: highlightNode.from,
            to: highlightNode.to,
            async: true,
            click: () => this.asyncStepIn(location, Boolean(isCurrentPosition))
          });
        }
      }
    }
    const decorations = CodeMirror6.Decoration.set(this.continueToLocations.map((loc) => {
      return (loc.async ? asyncContinueToMark : continueToMark).range(loc.from, loc.to);
    }), true);
    this.editor.dispatch({ effects: continueToMarkers.update.of(decorations) });
  }
  clearContinueToLocations() {
    if (this.editor?.state.field(continueToMarkers.field).size) {
      this.editor.dispatch({ effects: continueToMarkers.update.of(CodeMirror6.Decoration.none) });
    }
  }
  asyncStepIn(location, isCurrentPosition) {
    if (!isCurrentPosition) {
      location.continueToLocation(asyncStepIn);
    } else {
      asyncStepIn();
    }
    function asyncStepIn() {
      location.debuggerModel.scheduleStepIntoAsync();
    }
  }
  fetchBreakpoints() {
    if (!this.editor) {
      return [];
    }
    const { editor } = this;
    const breakpointLocations = this.breakpointManager.breakpointLocationsForUISourceCode(this.uiSourceCode);
    return breakpointLocations.map(({ uiLocation, breakpoint }) => {
      const editorLocation = this.transformer.uiLocationToEditorLocation(uiLocation.lineNumber, uiLocation.columnNumber);
      return {
        position: editor.toOffset(editorLocation),
        breakpoint
      };
    });
  }
  lineBreakpoints(line) {
    return this.breakpoints.filter((b) => b.position >= line.from && b.position <= line.to).map((b) => b.breakpoint);
  }
  async linePossibleBreakpoints(line) {
    const start = this.transformer.editorLocationToUILocation(line.number - 1, 0);
    const end = this.transformer.editorLocationToUILocation(line.number - 1, Math.min(line.length, MAX_POSSIBLE_BREAKPOINT_LINE));
    const range = new TextUtils9.TextRange.TextRange(start.lineNumber, start.columnNumber || 0, end.lineNumber, end.columnNumber || 0);
    return await this.breakpointManager.possibleBreakpoints(this.uiSourceCode, range);
  }
  // Compute the decorations for existing breakpoints (both on the
  // gutter and inline in the code)
  async computeBreakpointDecoration(state, breakpoints) {
    const decorations = [];
    const gutterMarkers = [];
    const breakpointsByLine = /* @__PURE__ */ new Map();
    const inlineMarkersByLine = /* @__PURE__ */ new Map();
    const possibleBreakpointRequests = [];
    const inlineMarkerPositions = /* @__PURE__ */ new Set();
    const addInlineMarker = (linePos, columnNumber, breakpoint) => {
      let inlineMarkers = inlineMarkersByLine.get(linePos);
      if (!inlineMarkers) {
        inlineMarkers = [];
        inlineMarkersByLine.set(linePos, inlineMarkers);
      }
      inlineMarkers.push({ breakpoint, column: columnNumber });
    };
    for (const { position, breakpoint } of breakpoints) {
      const line = state.doc.lineAt(position);
      let forThisLine = breakpointsByLine.get(line.from);
      if (!forThisLine) {
        forThisLine = [];
        breakpointsByLine.set(line.from, forThisLine);
      }
      if (breakpoint.enabled() && forThisLine.every((b) => !b.enabled())) {
        possibleBreakpointRequests.push(this.linePossibleBreakpoints(line).then((locations) => addPossibleBreakpoints(line, locations)));
      }
      forThisLine.push(breakpoint);
      if (breakpoint.enabled()) {
        inlineMarkerPositions.add(position);
        addInlineMarker(line.from, position - line.from, breakpoint);
      }
    }
    for (const [lineStart, lineBreakpoints] of breakpointsByLine) {
      const main = lineBreakpoints.sort(mostSpecificBreakpoint)[0];
      let gutterClass = "cm-breakpoint";
      if (!main.enabled()) {
        gutterClass += " cm-breakpoint-disabled";
      }
      if (!main.bound()) {
        gutterClass += " cm-breakpoint-unbound";
      }
      if (main.isLogpoint()) {
        gutterClass += " cm-breakpoint-logpoint";
      } else if (main.condition()) {
        gutterClass += " cm-breakpoint-conditional";
      }
      gutterMarkers.push(new BreakpointGutterMarker(gutterClass, lineStart, main.condition()).range(lineStart));
    }
    const addPossibleBreakpoints = (line, locations) => {
      for (const location of locations) {
        const editorLocation = this.transformer.uiLocationToEditorLocation(location.lineNumber, location.columnNumber);
        if (editorLocation.lineNumber !== line.number - 1) {
          continue;
        }
        const position = Math.min(line.to, line.from + editorLocation.columnNumber);
        if (!inlineMarkerPositions.has(position)) {
          addInlineMarker(line.from, editorLocation.columnNumber, null);
        }
      }
    };
    await Promise.all(possibleBreakpointRequests);
    for (const [linePos, inlineMarkers] of inlineMarkersByLine) {
      if (inlineMarkers.length > 1) {
        for (const { column, breakpoint } of inlineMarkers) {
          const marker = new BreakpointInlineMarker(breakpoint, this);
          decorations.push(CodeMirror6.Decoration.widget({ widget: marker, side: -1 }).range(linePos + column));
        }
      }
    }
    return { content: CodeMirror6.Decoration.set(decorations, true), gutter: CodeMirror6.RangeSet.of(gutterMarkers, true) };
  }
  // If, after editing, the editor is synced again (either by going
  // back to the original document or by saving), we replace any
  // breakpoints the breakpoint manager might have (which point into
  // the old file) with the breakpoints we have, which had their
  // positions tracked through the changes.
  async restoreBreakpointsAfterEditing() {
    const { breakpoints } = this;
    const editor = this.editor;
    this.breakpoints = [];
    await Promise.all(breakpoints.map(async (description) => {
      const { breakpoint, position } = description;
      const condition = breakpoint.condition(), enabled = breakpoint.enabled(), isLogpoint = breakpoint.isLogpoint();
      await breakpoint.remove(false);
      const editorLocation = editor.toLineColumn(position);
      const uiLocation = this.transformer.editorLocationToUILocation(editorLocation.lineNumber, editorLocation.columnNumber);
      await this.setBreakpoint(uiLocation.lineNumber, uiLocation.columnNumber, condition, enabled, isLogpoint);
    }));
  }
  async refreshBreakpoints() {
    if (this.editor) {
      this.breakpoints = this.fetchBreakpoints();
      const forBreakpoints = this.breakpoints;
      const decorations = await this.computeBreakpointDecoration(this.editor.state, forBreakpoints);
      if (this.editor && this.breakpoints === forBreakpoints && (decorations.gutter.size || this.editor.state.field(breakpointMarkers, false)?.gutter.size)) {
        this.editor.dispatch({ effects: setBreakpointDeco.of(decorations) });
      }
    }
  }
  breakpointChange(event) {
    const { uiLocation } = event.data;
    if (uiLocation.uiSourceCode !== this.uiSourceCode || this.muted) {
      return;
    }
    for (const scriptFile of this.scriptFileForDebuggerModel.values()) {
      if (scriptFile.isDivergingFromVM() || scriptFile.isMergingToVM()) {
        return;
      }
    }
    window.clearTimeout(this.refreshBreakpointsTimeout);
    this.refreshBreakpointsTimeout = window.setTimeout(() => this.refreshBreakpoints(), 50);
  }
  onInlineBreakpointMarkerClick(event, breakpoint) {
    event.consume(true);
    if (breakpoint) {
      if (event.shiftKey) {
        breakpoint.setEnabled(!breakpoint.enabled());
      } else {
        void breakpoint.remove(false);
      }
    } else if (this.editor) {
      const editorLocation = this.editor.editor.posAtDOM(event.target);
      const line = this.editor.state.doc.lineAt(editorLocation);
      const uiLocation = this.transformer.editorLocationToUILocation(line.number - 1, editorLocation - line.from);
      void this.setBreakpoint(
        uiLocation.lineNumber,
        uiLocation.columnNumber,
        EMPTY_BREAKPOINT_CONDITION,
        /* enabled */
        true,
        /* isLogpoint */
        false
      );
    }
  }
  onInlineBreakpointMarkerContextMenu(event, breakpoint) {
    event.consume(true);
    const editor = this.editor;
    const position = editor.editor.posAtDOM(event.target);
    const line = editor.state.doc.lineAt(position);
    if (!SourceFrame13.SourceFrame.isBreakableLine(editor.state, line) || // Editing breakpoints only make sense for conditional breakpoints
    // and logpoints.
    !Bindings9.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().supportsConditionalBreakpoints(this.uiSourceCode)) {
      return;
    }
    const contextMenu = new UI19.ContextMenu.ContextMenu(event);
    if (breakpoint) {
      contextMenu.debugSection().appendItem(i18nString17(UIStrings18.editBreakpoint), () => {
        this.editBreakpointCondition({ line, breakpoint, location: null });
      }, { jslogContext: "edit-breakpoint" });
    } else {
      const uiLocation = this.transformer.editorLocationToUILocation(line.number - 1, position - line.from);
      contextMenu.debugSection().appendItem(i18nString17(UIStrings18.addConditionalBreakpoint), () => {
        this.editBreakpointCondition({ line, breakpoint: null, location: uiLocation, isLogpoint: false });
      }, { jslogContext: "add-cnd-breakpoint" });
      contextMenu.debugSection().appendItem(i18nString17(UIStrings18.addLogpoint), () => {
        this.editBreakpointCondition({ line, breakpoint: null, location: uiLocation, isLogpoint: true });
      }, { jslogContext: "add-logpoint" });
      contextMenu.debugSection().appendItem(i18nString17(UIStrings18.neverPauseHere), () => this.setBreakpoint(
        uiLocation.lineNumber,
        uiLocation.columnNumber,
        NEVER_PAUSE_HERE_CONDITION,
        /* enabled */
        true,
        /* isLogpoint */
        false
      ), { jslogContext: "never-pause-here" });
    }
    void contextMenu.show();
  }
  updateScriptFiles() {
    for (const debuggerModel of SDK12.TargetManager.TargetManager.instance().models(SDK12.DebuggerModel.DebuggerModel)) {
      const scriptFile = Bindings9.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().scriptFile(this.uiSourceCode, debuggerModel);
      if (scriptFile) {
        this.updateScriptFile(debuggerModel);
      }
    }
    this.showSourceMapInfobarIfNeeded();
  }
  updateScriptFile(debuggerModel) {
    const oldScriptFile = this.scriptFileForDebuggerModel.get(debuggerModel);
    const newScriptFile = Bindings9.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().scriptFile(this.uiSourceCode, debuggerModel);
    this.scriptFileForDebuggerModel.delete(debuggerModel);
    if (oldScriptFile) {
      oldScriptFile.removeEventListener("DidMergeToVM", this.didMergeToVM, this);
      oldScriptFile.removeEventListener("DidDivergeFromVM", this.didDivergeFromVM, this);
      if (this.muted && !this.uiSourceCode.isDirty() && this.consistentScripts()) {
        this.setMuted(false);
      }
    }
    if (!newScriptFile) {
      return;
    }
    this.scriptFileForDebuggerModel.set(debuggerModel, newScriptFile);
    newScriptFile.addEventListener("DidMergeToVM", this.didMergeToVM, this);
    newScriptFile.addEventListener("DidDivergeFromVM", this.didDivergeFromVM, this);
    newScriptFile.checkMapping();
    void newScriptFile.missingSymbolFiles().then((resources) => {
      if (resources) {
        const details = i18nString17(UIStrings18.debugInfoNotFound, { PH1: newScriptFile.uiSourceCode.url() });
        this.updateMissingDebugInfoInfobar({ resources, details });
      } else {
        this.updateMissingDebugInfoInfobar(null);
      }
    });
  }
  updateMissingDebugInfoInfobar(warning) {
    if (this.missingDebugInfoBar) {
      return;
    }
    if (warning === null) {
      this.removeInfobar(this.missingDebugInfoBar);
      this.missingDebugInfoBar = null;
      return;
    }
    this.missingDebugInfoBar = UI19.Infobar.Infobar.create("error", warning.details, [], void 0, "missing-debug-info");
    if (!this.missingDebugInfoBar) {
      return;
    }
    for (const resource of warning.resources) {
      const detailsRow = this.missingDebugInfoBar?.createDetailsRowMessage(i18nString17(UIStrings18.debugFileNotFound, { PH1: Common13.ParsedURL.ParsedURL.extractName(resource.resourceUrl) }));
      if (detailsRow) {
        const pageResourceKey = SDK12.PageResourceLoader.PageResourceLoader.makeExtensionKey(resource.resourceUrl, resource.initiator);
        if (SDK12.PageResourceLoader.PageResourceLoader.instance().getResourcesLoaded().get(pageResourceKey)) {
          const showRequest = UI19.UIUtils.createTextButton(i18nString17(UIStrings18.showRequest), () => {
            void Common13.Revealer.reveal(new SDK12.PageResourceLoader.ResourceKey(pageResourceKey));
          }, {
            jslogContext: "show-request",
            variant: "text"
            /* Buttons.Button.Variant.TEXT */
          });
          showRequest.style.setProperty("margin-left", "10px");
          showRequest.title = i18nString17(UIStrings18.openDeveloperResources);
          detailsRow.appendChild(showRequest);
        }
        detailsRow.classList.add("infobar-selectable");
      }
    }
    this.missingDebugInfoBar.setCloseCallback(() => {
      this.removeInfobar(this.missingDebugInfoBar);
      this.missingDebugInfoBar = null;
    });
    this.attachInfobar(this.missingDebugInfoBar);
  }
  scriptHasSourceMap() {
    for (const debuggerModel of SDK12.TargetManager.TargetManager.instance().models(SDK12.DebuggerModel.DebuggerModel)) {
      const scriptFile = Bindings9.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().scriptFile(this.uiSourceCode, debuggerModel);
      if (scriptFile?.hasSourceMapURL()) {
        return true;
      }
    }
    return false;
  }
  getSourceMapResource() {
    const resourceMap = this.loader.getResourcesLoaded();
    for (const [debuggerModel, script] of this.scriptFileForDebuggerModel.entries()) {
      const url = script.script?.sourceMapURL;
      if (url) {
        const initiatorUrl = SDK12.SourceMapManager.SourceMapManager.resolveRelativeSourceURL(debuggerModel.target(), script.script.sourceURL);
        const resolvedUrl = Common13.ParsedURL.ParsedURL.completeURL(initiatorUrl, url);
        if (resolvedUrl) {
          const resource = resourceMap.get(SDK12.PageResourceLoader.PageResourceLoader.makeKey(resolvedUrl, script.script.createPageResourceLoadInitiator()));
          if (resource) {
            return resource;
          }
        }
      }
    }
    return null;
  }
  showSourceMapInfobarIfNeeded() {
    if (this.sourceMapInfobar) {
      return;
    }
    if (!Common13.Settings.Settings.instance().moduleSetting("js-source-maps-enabled").get()) {
      return;
    }
    if (!this.scriptHasSourceMap()) {
      return;
    }
    const resource = this.getSourceMapResource();
    if (resource && resource.success === null) {
      return;
    }
    if (!resource) {
      this.sourceMapInfobar = UI19.Infobar.Infobar.create("info", i18nString17(UIStrings18.sourceMapSkipped), [], Common13.Settings.Settings.instance().createSetting("source-map-skipped-infobar-disabled", false), "source-map-skipped");
      if (!this.sourceMapInfobar) {
        return;
      }
      this.sourceMapInfobar.createDetailsRowMessage(i18nString17(UIStrings18.debuggingPowerReduced));
      this.sourceMapInfobar.createDetailsRowMessage(i18nString17(UIStrings18.reloadForSourceMap));
    } else if (resource.success) {
      this.sourceMapInfobar = UI19.Infobar.Infobar.create("info", i18nString17(UIStrings18.sourceMapLoaded), [], Common13.Settings.Settings.instance().createSetting("source-map-infobar-disabled", false), "source-map-loaded");
      if (!this.sourceMapInfobar) {
        return;
      }
      this.sourceMapInfobar.createDetailsRowMessage(i18nString17(UIStrings18.associatedFilesShouldBeAdded));
      this.sourceMapInfobar.createDetailsRowMessage(i18nString17(UIStrings18.associatedFilesAreAvailable, {
        PH1: String(UI19.ShortcutRegistry.ShortcutRegistry.instance().shortcutTitleForAction("quick-open.show"))
      }));
    } else {
      this.sourceMapInfobar = UI19.Infobar.Infobar.create("warning", i18nString17(UIStrings18.sourceMapFailed), [], void 0, "source-map-failed");
      if (!this.sourceMapInfobar) {
        return;
      }
      this.sourceMapInfobar.createDetailsRowMessage(i18nString17(UIStrings18.debuggingPowerReduced));
      if (resource.errorMessage) {
        this.sourceMapInfobar.createDetailsRowMessage(i18nString17(UIStrings18.errorLoading, {
          PH1: Platform13.StringUtilities.trimMiddle(resource.url, UI19.UIUtils.MaxLengthForDisplayedURLs),
          PH2: resource.errorMessage
        }));
      }
    }
    this.sourceMapInfobar.setCloseCallback(() => {
      this.removeInfobar(this.sourceMapInfobar);
      this.sourceMapInfobar = null;
    });
    this.attachInfobar(this.sourceMapInfobar);
  }
  handleGutterClick(line, event) {
    if (this.muted || event.button !== 0 || event.altKey) {
      return false;
    }
    if (event.metaKey || event.ctrlKey) {
      this.#openEditDialogForLine(line, event.shiftKey);
      return true;
    }
    void this.toggleBreakpoint(line, event.shiftKey);
    return true;
  }
  async toggleBreakpoint(line, onlyDisable) {
    if (this.muted) {
      return;
    }
    if (this.activeBreakpointDialog) {
      this.activeBreakpointDialog.finishEditing(false, "");
    }
    const breakpoints = this.lineBreakpoints(line);
    if (!breakpoints.length) {
      await this.createNewBreakpoint(
        line,
        EMPTY_BREAKPOINT_CONDITION,
        /* enabled */
        true,
        /* isLogpoint */
        false
      );
      return;
    }
    const hasDisabled = breakpoints.some((b) => !b.enabled());
    for (const breakpoint of breakpoints) {
      if (onlyDisable) {
        breakpoint.setEnabled(hasDisabled);
      } else {
        Host9.userMetrics.actionTaken(Host9.UserMetrics.Action.BreakpointRemovedFromGutterToggle);
        void breakpoint.remove(false);
      }
    }
  }
  async defaultBreakpointLocation(line) {
    if (this.executionLocation) {
      const editorExecutionLocation = this.transformer.uiLocationToEditorLocation(this.executionLocation.lineNumber, this.executionLocation.columnNumber);
      if (editorExecutionLocation.lineNumber === line.number - 1) {
        const possibleBreakpoints = await this.linePossibleBreakpoints(line);
        for (const location of possibleBreakpoints) {
          if (location.compareTo(this.executionLocation) === 0) {
            return this.executionLocation;
          }
        }
      }
    }
    return this.transformer.editorLocationToUILocation(line.number - 1);
  }
  async createNewBreakpoint(line, condition, enabled, isLogpoint) {
    if (!this.editor || !SourceFrame13.SourceFrame.isBreakableLine(this.editor.state, line)) {
      return;
    }
    Host9.userMetrics.actionTaken(Host9.UserMetrics.Action.ScriptsBreakpointSet);
    this.#recordSourcesPanelDebuggedMetrics();
    const origin = await this.defaultBreakpointLocation(line);
    await this.setBreakpoint(origin.lineNumber, origin.columnNumber, condition, enabled, isLogpoint);
  }
  async setBreakpoint(lineNumber, columnNumber, condition, enabled, isLogpoint) {
    Common13.Settings.Settings.instance().moduleSetting("breakpoints-active").set(true);
    const bp = await this.breakpointManager.setBreakpoint(
      this.uiSourceCode,
      lineNumber,
      columnNumber,
      condition,
      enabled,
      isLogpoint,
      "USER_ACTION"
      /* Breakpoints.BreakpointManager.BreakpointOrigin.USER_ACTION */
    );
    this.breakpointWasSetForTest(lineNumber, columnNumber, condition, enabled);
    if (bp) {
      Badges2.UserBadges.instance().recordAction(Badges2.BadgeAction.BREAKPOINT_ADDED);
    }
    return bp;
  }
  breakpointWasSetForTest(_lineNumber, _columnNumber, _condition, _enabled) {
  }
  async callFrameChanged() {
    this.liveLocationPool.disposeAll();
    const callFrame = UI19.Context.Context.instance().flavor(SDK12.DebuggerModel.CallFrame);
    if (!callFrame) {
      this.setExecutionLocation(null);
    } else {
      await Bindings9.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().createCallFrameLiveLocation(callFrame.location(), async (liveLocation) => {
        const uiLocation = await liveLocation.uiLocation();
        if (uiLocation && uiLocation.uiSourceCode.canonicalScriptId() === this.uiSourceCode.canonicalScriptId()) {
          this.setExecutionLocation(uiLocation);
          this.updateMissingDebugInfoInfobar(callFrame.missingDebugInfoDetails);
          this.#recordSourcesPanelDebuggedMetrics();
        } else {
          this.setExecutionLocation(null);
        }
      }, this.liveLocationPool);
    }
  }
  setExecutionLocation(executionLocation) {
    if (this.executionLocation === executionLocation || !this.editor) {
      return;
    }
    this.executionLocation = executionLocation;
    if (executionLocation) {
      const editorLocation = this.transformer.uiLocationToEditorLocation(executionLocation.lineNumber, executionLocation.columnNumber);
      const editorPosition = TextEditor6.Position.toOffset(this.editor.state.doc, editorLocation);
      this.editor.dispatch({
        effects: [
          TextEditor6.ExecutionPositionHighlighter.setHighlightedPosition.of(editorPosition)
        ]
      });
      void this.updateValueDecorations();
      if (this.controlDown) {
        void this.showContinueToLocations();
      }
    } else {
      this.editor.dispatch({
        effects: [
          continueToMarkers.update.of(CodeMirror6.Decoration.none),
          valueDecorations.update.of(CodeMirror6.Decoration.none),
          TextEditor6.ExecutionPositionHighlighter.clearHighlightedPosition.of()
        ]
      });
    }
  }
  dispose() {
    this.hideIgnoreListInfobar();
    if (this.sourceMapInfobar) {
      this.sourceMapInfobar.dispose();
    }
    for (const script of this.scriptFileForDebuggerModel.values()) {
      script.removeEventListener("DidMergeToVM", this.didMergeToVM, this);
      script.removeEventListener("DidDivergeFromVM", this.didDivergeFromVM, this);
    }
    this.scriptFileForDebuggerModel.clear();
    this.popoverHelper?.hidePopover();
    this.popoverHelper?.dispose();
    this.setExecutionLocation(null);
    this.breakpointManager.removeEventListener(Breakpoints3.BreakpointManager.Events.BreakpointAdded, this.breakpointChange, this);
    this.breakpointManager.removeEventListener(Breakpoints3.BreakpointManager.Events.BreakpointRemoved, this.breakpointChange, this);
    this.uiSourceCode.removeEventListener(Workspace21.UISourceCode.Events.WorkingCopyChanged, this.workingCopyChanged, this);
    this.uiSourceCode.removeEventListener(Workspace21.UISourceCode.Events.WorkingCopyCommitted, this.workingCopyCommitted, this);
    Workspace21.IgnoreListManager.IgnoreListManager.instance().removeChangeListener(this.ignoreListCallback);
    debuggerPluginForUISourceCode.delete(this.uiSourceCode);
    super.dispose();
    window.clearTimeout(this.refreshBreakpointsTimeout);
    this.editor = void 0;
    UI19.Context.Context.instance().removeFlavorChangeListener(SDK12.DebuggerModel.CallFrame, this.callFrameChanged, this);
    this.liveLocationPool.disposeAll();
  }
  /**
   * Only records metrics once per DebuggerPlugin instance and must only be
   * called once the content of the UISourceCode is available.
   */
  #recordSourcesPanelDebuggedMetrics() {
    if (this.#sourcesPanelDebuggedMetricsRecorded) {
      return;
    }
    this.#sourcesPanelDebuggedMetricsRecorded = true;
    const mimeType = Common13.ResourceType.ResourceType.mimeFromURL(this.uiSourceCode.url());
    const mediaType = Common13.ResourceType.ResourceType.mediaTypeForMetrics(mimeType ?? "", this.uiSourceCode.contentType().isFromSourceMap(), TextUtils9.TextUtils.isMinified(this.uiSourceCode.content()), this.uiSourceCode.url().startsWith("snippet://"), this.uiSourceCode.url().startsWith("debugger://"));
    Host9.userMetrics.sourcesPanelFileDebugged(mediaType);
  }
};
var BreakpointLocationRevealer = class {
  async reveal(breakpointLocation, omitFocus) {
    const { uiLocation } = breakpointLocation;
    SourcesPanel.instance().showUILocation(uiLocation, omitFocus);
    const debuggerPlugin = debuggerPluginForUISourceCode.get(uiLocation.uiSourceCode);
    if (debuggerPlugin) {
      debuggerPlugin.editBreakpointLocation(breakpointLocation);
    } else {
      BreakpointsSidebarController.instance().breakpointEditFinished(breakpointLocation.breakpoint, false);
    }
  }
};
async function computeNonBreakableLines(state, transformer, sourceCode) {
  const debuggerWorkspaceBinding = Bindings9.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance();
  const mappedLines = await debuggerWorkspaceBinding.getMappedLines(sourceCode);
  if (!mappedLines) {
    return [];
  }
  const linePositions = [];
  for (let i = 0; i < state.doc.lines; i++) {
    const { lineNumber } = transformer.editorLocationToUILocation(i, 0);
    if (!mappedLines.has(lineNumber)) {
      linePositions.push(state.doc.line(i + 1).from);
    }
  }
  return linePositions;
}
var setBreakpointDeco = CodeMirror6.StateEffect.define();
var muteBreakpoints = CodeMirror6.StateEffect.define();
function muteGutterMarkers(markers, doc) {
  const newMarkers = [];
  markers.between(0, doc.length, (from, _to, marker) => {
    let className = marker.elementClass;
    if (!/cm-breakpoint-disabled/.test(className)) {
      className += " cm-breakpoint-disabled";
    }
    newMarkers.push(new BreakpointGutterMarker(className, from, marker instanceof BreakpointGutterMarker ? marker.condition : void 0).range(from));
  });
  return CodeMirror6.RangeSet.of(newMarkers, false);
}
var breakpointMarkers = CodeMirror6.StateField.define({
  create() {
    return { content: CodeMirror6.RangeSet.empty, gutter: CodeMirror6.RangeSet.empty };
  },
  update(deco, tr) {
    if (!tr.changes.empty) {
      deco = { content: deco.content.map(tr.changes), gutter: deco.gutter.map(tr.changes) };
    }
    for (const effect of tr.effects) {
      if (effect.is(setBreakpointDeco)) {
        deco = effect.value;
      } else if (effect.is(muteBreakpoints)) {
        deco = { content: CodeMirror6.RangeSet.empty, gutter: muteGutterMarkers(deco.gutter, tr.state.doc) };
      }
    }
    return deco;
  },
  provide: (field) => [
    CodeMirror6.EditorView.decorations.from(field, (deco) => deco.content),
    CodeMirror6.lineNumberMarkers.from(field, (deco) => deco.gutter)
  ]
});
var BreakpointInlineMarker = class extends CodeMirror6.WidgetType {
  breakpoint;
  parent;
  class;
  constructor(breakpoint, parent) {
    super();
    this.breakpoint = breakpoint;
    this.parent = parent;
    this.class = "cm-inlineBreakpoint";
    if (breakpoint?.isLogpoint()) {
      this.class += " cm-inlineBreakpoint-logpoint";
    } else if (breakpoint?.condition()) {
      this.class += " cm-inlineBreakpoint-conditional";
    }
    if (!breakpoint?.enabled()) {
      this.class += " cm-inlineBreakpoint-disabled";
    }
  }
  eq(other) {
    return other.class === this.class && other.breakpoint === this.breakpoint;
  }
  toDOM() {
    const span = document.createElement("span");
    span.className = this.class;
    span.setAttribute("jslog", `${VisualLogging12.breakpointMarker().track({ click: true })}`);
    span.addEventListener("click", (event) => {
      this.parent.onInlineBreakpointMarkerClick(event, this.breakpoint);
      event.consume();
    });
    span.addEventListener("contextmenu", (event) => {
      this.parent.onInlineBreakpointMarkerContextMenu(event, this.breakpoint);
      event.consume();
    });
    return span;
  }
  ignoreEvent() {
    return true;
  }
};
var BreakpointGutterMarker = class _BreakpointGutterMarker extends CodeMirror6.GutterMarker {
  elementClass;
  static nextTooltipId = 0;
  #position;
  condition;
  constructor(elementClass, position, condition) {
    super();
    this.elementClass = elementClass;
    this.#position = position;
    this.condition = condition;
  }
  eq(other) {
    return other.elementClass === this.elementClass;
  }
  toDOM(view) {
    const div = document.createElement("div");
    div.setAttribute("jslog", `${VisualLogging12.breakpointMarker().track({ click: true })}`);
    const line = view.state.doc.lineAt(this.#position).number;
    const formatNumber = view.state.facet(SourceFrame13.SourceFrame.LINE_NUMBER_FORMATTER);
    div.textContent = formatNumber(line, view.state);
    if (!this.condition) {
      return div;
    }
    const container = document.createElement("div");
    const id = `cm-breakpoint-tooltip-${_BreakpointGutterMarker.nextTooltipId++}`;
    div.setAttribute("aria-details", id);
    container.appendChild(div);
    const tooltip = new Tooltips2.Tooltip.Tooltip({
      id,
      anchor: div,
      jslogContext: "breakpoint-tooltip"
    });
    tooltip.append(this.condition);
    container.appendChild(tooltip);
    return container;
  }
};
function mostSpecificBreakpoint(a, b) {
  if (a.enabled() !== b.enabled()) {
    return a.enabled() ? -1 : 1;
  }
  if (a.bound() !== b.bound()) {
    return a.bound() ? -1 : 1;
  }
  if (Boolean(a.condition()) !== Boolean(b.condition())) {
    return Boolean(a.condition()) ? -1 : 1;
  }
  return 0;
}
function defineStatefulDecoration() {
  const update = CodeMirror6.StateEffect.define();
  const field = CodeMirror6.StateField.define({
    create() {
      return CodeMirror6.Decoration.none;
    },
    update(deco, tr) {
      return tr.effects.reduce((deco2, effect) => effect.is(update) ? effect.value : deco2, deco.map(tr.changes));
    },
    provide: (field2) => CodeMirror6.EditorView.decorations.from(field2)
  });
  return { update, field };
}
var continueToMark = CodeMirror6.Decoration.mark({ class: "cm-continueToLocation" });
var asyncContinueToMark = CodeMirror6.Decoration.mark({ class: "cm-continueToLocation cm-continueToLocation-async" });
var continueToMarkers = defineStatefulDecoration();
var noMarkers = {};
var hasContinueMarkers = {
  class: "cm-hasContinueMarkers"
};
var markIfContinueTo = CodeMirror6.EditorView.contentAttributes.compute([continueToMarkers.field], (state) => {
  return state.field(continueToMarkers.field).size ? hasContinueMarkers : noMarkers;
});
var ValueDecoration = class extends CodeMirror6.WidgetType {
  pairs;
  constructor(pairs) {
    super();
    this.pairs = pairs;
  }
  eq(other) {
    return this.pairs.length === other.pairs.length && this.pairs.every((p, i) => p[0] === other.pairs[i][0] && p[1] === other.pairs[i][1]);
  }
  toDOM() {
    const formatter = new ObjectUI2.RemoteObjectPreviewFormatter.RemoteObjectPreviewFormatter();
    const widget = document.createElement("div");
    widget.classList.add("cm-variableValues");
    let first = true;
    for (const [name, value2] of this.pairs) {
      if (first) {
        first = false;
      } else {
        UI19.UIUtils.createTextChild(widget, ", ");
      }
      const nameValuePair = widget.createChild("span");
      UI19.UIUtils.createTextChild(nameValuePair, name + " = ");
      const propertyCount = value2.preview ? value2.preview.properties.length : 0;
      const entryCount = value2.preview?.entries ? value2.preview.entries.length : 0;
      if (value2.preview && propertyCount + entryCount < 10) {
        render3(formatter.renderObjectPreview(value2.preview), nameValuePair.createChild("span"));
      } else {
        const propertyValue = ObjectUI2.ObjectPropertiesSection.ObjectPropertiesSection.createPropertyValue(
          value2,
          /* wasThrown */
          false,
          /* showPreview */
          false
        );
        nameValuePair.appendChild(propertyValue);
      }
    }
    return widget;
  }
};
var valueDecorations = defineStatefulDecoration();
function isVariableIdentifier(tokenType) {
  return tokenType === "VariableName" || tokenType === "VariableDefinition";
}
function isVariableDefinition(tokenType) {
  return tokenType === "VariableDefinition";
}
function isLetConstDefinition(tokenType) {
  return tokenType === "let" || tokenType === "const";
}
function isScopeNode(tokenType) {
  return tokenType === "Block" || tokenType === "ForSpec";
}
var SiblingScopeVariables = class {
  blockList = /* @__PURE__ */ new Set();
  variables = [];
};
function getVariableNamesByLine(editorState, fromPos, toPos, currentPos) {
  const fromLine = editorState.doc.lineAt(fromPos);
  fromPos = Math.min(fromLine.to, fromPos);
  toPos = editorState.doc.lineAt(toPos).from;
  const tree = CodeMirror6.syntaxTree(editorState);
  function isSiblingScopeNode(node) {
    return isScopeNode(node.name) && (node.to < currentPos || currentPos < node.from);
  }
  const names = [];
  let curLine = fromLine;
  const siblingStack = [];
  let currentLetConstDefinition = null;
  function currentNames() {
    return siblingStack.length ? siblingStack[siblingStack.length - 1].variables : names;
  }
  tree.iterate({
    from: fromPos,
    to: toPos,
    enter: (node) => {
      if (node.from < fromPos) {
        return;
      }
      if (isLetConstDefinition(node.name)) {
        currentLetConstDefinition = node.node.nextSibling;
        return;
      }
      if (isSiblingScopeNode(node)) {
        siblingStack.push(new SiblingScopeVariables());
        return;
      }
      const varName = isVariableIdentifier(node.name) && editorState.sliceDoc(node.from, node.to);
      if (!varName) {
        return;
      }
      if (currentLetConstDefinition && isVariableDefinition(node.name) && siblingStack.length > 0) {
        siblingStack[siblingStack.length - 1].blockList.add(varName);
        return;
      }
      if (node.from > curLine.to) {
        curLine = editorState.doc.lineAt(node.from);
      }
      currentNames().push({ line: curLine.number - 1, from: node.from, id: varName });
    },
    leave: (node) => {
      if (currentLetConstDefinition === node.node) {
        currentLetConstDefinition = null;
      } else if (isSiblingScopeNode(node)) {
        const topScope = siblingStack.pop();
        const nameList = currentNames();
        for (const token of topScope?.variables ?? []) {
          if (!topScope?.blockList.has(token.id)) {
            nameList.push(token);
          }
        }
      }
    }
  });
  return names;
}
async function computeScopeMappings(callFrame, rawLocationToEditorOffset) {
  const scopeMappings = [];
  for (const scope of callFrame.scopeChain()) {
    const scopeStart = await rawLocationToEditorOffset(scope.range()?.start ?? null);
    if (!scopeStart) {
      break;
    }
    const scopeEnd = await rawLocationToEditorOffset(scope.range()?.end ?? null);
    if (!scopeEnd) {
      break;
    }
    const { properties } = await SourceMapScopes2.NamesResolver.resolveScopeInObject(scope).getAllProperties(false, false);
    if (!properties || properties.length > MAX_PROPERTIES_IN_SCOPE_FOR_VALUE_DECORATIONS) {
      break;
    }
    const variableMap = new Map(properties.map((p) => [p.name, p.value]));
    scopeMappings.push({ scopeStart, scopeEnd, variableMap });
    if (scope.type() === "local") {
      break;
    }
  }
  return scopeMappings;
}
function getVariableValuesByLine(scopeMappings, variableNames) {
  const namesPerLine = /* @__PURE__ */ new Map();
  for (const { line, from, id } of variableNames) {
    const varValue = findVariableInChain(id, from, scopeMappings);
    if (!varValue) {
      continue;
    }
    let names = namesPerLine.get(line);
    if (!names) {
      names = /* @__PURE__ */ new Map();
      namesPerLine.set(line, names);
    }
    names.set(id, varValue);
  }
  return namesPerLine;
  function findVariableInChain(name, pos, scopeMappings2) {
    for (const scope of scopeMappings2) {
      if (pos < scope.scopeStart || pos >= scope.scopeEnd) {
        continue;
      }
      const value2 = scope.variableMap.get(name);
      if (value2) {
        return value2;
      }
    }
    return null;
  }
}
function computePopoverHighlightRange(state, mimeType, cursorPos) {
  const { main } = state.selection;
  if (!main.empty) {
    if (cursorPos < main.from || main.to < cursorPos) {
      return null;
    }
    return { from: main.from, to: main.to, containsSideEffects: false };
  }
  const tree = CodeMirror6.ensureSyntaxTree(state, cursorPos, 5 * 1e3);
  if (!tree) {
    return null;
  }
  const node = tree.resolveInner(cursorPos, 1);
  if (node.firstChild) {
    return null;
  }
  switch (mimeType) {
    case "application/wasm": {
      if (node.name !== "Identifier") {
        return null;
      }
      const controlInstructions = ["block", "loop", "if", "else", "end", "br", "br_if", "br_table"];
      for (let parent = node.parent; parent; parent = parent.parent) {
        if (parent.name === "App") {
          const firstChild = parent.firstChild;
          const opName = firstChild?.name === "Keyword" && state.sliceDoc(firstChild.from, firstChild.to);
          if (opName && controlInstructions.includes(opName)) {
            return null;
          }
        }
      }
      return { from: node.from, to: node.to, containsSideEffects: false };
    }
    case "text/html":
    case "text/javascript":
    case "text/jsx":
    case "text/typescript":
    case "text/typescript-jsx": {
      let current = node;
      while (current && current.name !== "this" && current.name !== "VariableDefinition" && current.name !== "VariableName" && current.name !== "MemberExpression" && !(current.name === "PropertyName" && current.parent?.name === "PatternProperty" && current.nextSibling?.name !== ":") && !(current.name === "PropertyDefinition" && current.parent?.name === "Property" && current.nextSibling?.name !== ":")) {
        current = current.parent;
      }
      if (!current) {
        return null;
      }
      return { from: current.from, to: current.to, containsSideEffects: containsSideEffects(state.doc, current) };
    }
    default: {
      if (node.to - node.from > 50 || /[^\w_\-$]/.test(state.sliceDoc(node.from, node.to))) {
        return null;
      }
      return { from: node.from, to: node.to, containsSideEffects: false };
    }
  }
}
function containsSideEffects(doc, root) {
  let containsSideEffects2 = false;
  root.toTree().iterate({
    enter(node) {
      switch (node.name) {
        case "AssignmentExpression":
        case "CallExpression": {
          containsSideEffects2 = true;
          return false;
        }
        case "ArithOp": {
          const op = doc.sliceString(root.from + node.from, root.from + node.to);
          if (op === "++" || op === "--") {
            containsSideEffects2 = true;
            return false;
          }
          break;
        }
      }
      return true;
    }
  });
  return containsSideEffects2;
}
var evalExpressionMark = CodeMirror6.Decoration.mark({ class: "cm-evaluatedExpression" });
var evalExpression = defineStatefulDecoration();
var theme4 = CodeMirror6.EditorView.baseTheme({
  ".cm-line::selection": {
    backgroundColor: "transparent",
    color: "currentColor"
  },
  ".cm-gutters .cm-gutter.cm-lineNumbers .cm-gutterElement": {
    "&:hover, &.cm-breakpoint": {
      borderStyle: "solid",
      borderWidth: "1px 4px 1px 1px",
      marginRight: "-4px",
      paddingLeft: "8px",
      // Make sure text doesn't move down due to the border above it.
      lineHeight: "calc(1.2em - 2px)",
      position: "relative"
    },
    "&:hover": {
      WebkitBorderImage: lineNumberArrow("#ebeced", "#ebeced")
    },
    "&.cm-breakpoint": {
      color: "#fff",
      WebkitBorderImage: lineNumberArrow("#4285f4", "#1a73e8")
    },
    "&.cm-breakpoint-conditional": {
      WebkitBorderImage: lineNumberArrow("#f29900", "#e37400"),
      "&::before": {
        content: '"?"',
        position: "absolute",
        top: 0,
        left: "1px"
      }
    },
    "&.cm-breakpoint-logpoint": {
      WebkitBorderImage: lineNumberArrow("#f439a0", "#d01884"),
      "&::before": {
        content: '"\u2025"',
        position: "absolute",
        top: "-3px",
        left: "1px"
      }
    }
  },
  "&dark .cm-gutters .cm-gutter.cm-lineNumbers .cm-gutterElement": {
    "&:hover": {
      WebkitBorderImage: lineNumberArrow("#3c4043", "#3c4043")
    },
    "&.cm-breakpoint": {
      WebkitBorderImage: lineNumberArrow("#5186EC", "#1a73e8")
    },
    "&.cm-breakpoint-conditional": {
      WebkitBorderImage: lineNumberArrow("#e9a33a", "#e37400")
    },
    "&.cm-breakpoint-logpoint": {
      WebkitBorderImage: lineNumberArrow("#E54D9B", "#d01884")
    }
  },
  ":host-context(.breakpoints-deactivated) & .cm-gutters .cm-gutter.cm-lineNumbers .cm-gutterElement.cm-breakpoint, .cm-gutters .cm-gutter.cm-lineNumbers .cm-gutterElement.cm-breakpoint-disabled": {
    color: "#1a73e8",
    WebkitBorderImage: lineNumberArrow("#d9e7fd", "#1a73e8"),
    "&.cm-breakpoint-conditional": {
      color: "#e37400",
      WebkitBorderImage: lineNumberArrow("#fcebcc", "#e37400")
    },
    "&.cm-breakpoint-logpoint": {
      color: "#d01884",
      WebkitBorderImage: lineNumberArrow("#fdd7ec", "#f439a0")
    }
  },
  ":host-context(.breakpoints-deactivated) &dark .cm-gutters .cm-gutter.cm-lineNumbers .cm-gutterElement.cm-breakpoint, &dark .cm-gutters .cm-gutter.cm-lineNumbers .cm-gutterElement.cm-breakpoint-disabled": {
    WebkitBorderImage: lineNumberArrow("#2a384e", "#1a73e8"),
    "&.cm-breakpoint-conditional": {
      WebkitBorderImage: lineNumberArrow("#4d3c1d", "#e37400")
    },
    "&.cm-breakpoint-logpoint": {
      WebkitBorderImage: lineNumberArrow("#4e283d", "#f439a0")
    }
  },
  ".cm-inlineBreakpoint": {
    cursor: "pointer",
    position: "relative",
    top: "1px",
    content: inlineBreakpointArrow("#4285F4", "#1A73E8"),
    height: "10px",
    "&.cm-inlineBreakpoint-conditional": {
      content: inlineConditionalBreakpointArrow("#F29900", "#E37400")
    },
    "&.cm-inlineBreakpoint-logpoint": {
      content: inlineLogpointArrow("#F439A0", "#D01884")
    }
  },
  "&dark .cm-inlineBreakpoint": {
    content: inlineBreakpointArrow("#5186EC", "#1A73E8"),
    "&.cm-inlineBreakpoint-conditional": {
      content: inlineConditionalBreakpointArrow("#e9a33a", "#E37400")
    },
    "&.cm-inlineBreakpoint-logpoint": {
      content: inlineLogpointArrow("#E54D9B", "#D01884")
    }
  },
  ":host-context(.breakpoints-deactivated) & .cm-inlineBreakpoint, .cm-inlineBreakpoint-disabled": {
    content: inlineBreakpointArrow("#4285F4", "#1A73E8", "0.2"),
    "&.cm-inlineBreakpoint-conditional": {
      content: inlineConditionalBreakpointArrow("#F9AB00", "#E37400", "0.2")
    },
    "&.cm-inlineBreakpoint-logpoint": {
      content: inlineLogpointArrow("#F439A0", "#D01884", "0.2")
    }
  },
  ".cm-executionLine": {
    backgroundColor: "var(--sys-color-yellow-container)",
    outline: "1px solid var(--sys-color-yellow-outline)",
    ".cm-hasContinueMarkers &": {
      backgroundColor: "transparent"
    },
    "&.cm-highlightedLine": {
      animation: "cm-fading-highlight-execution 2s 0s"
    },
    "&.cm-line::selection, &.cm-line ::selection": {
      backgroundColor: "var(--sys-color-tonal-container) !important"
    }
  },
  ".cm-executionToken": {
    backgroundColor: "var(--sys-color-state-focus-select)"
  },
  "@keyframes cm-fading-highlight-execution": {
    from: {
      backgroundColor: "var(--sys-color-tonal-container)"
    },
    to: {
      backgroundColor: "var(--sys-color-yellow-container)"
    }
  },
  ".cm-continueToLocation": {
    cursor: "pointer",
    backgroundColor: "var(--color-continue-to-location)",
    "&:hover": {
      backgroundColor: "var(--color-continue-to-location-hover)",
      border: "1px solid var(--color-continue-to-location-hover-border)",
      margin: "0 -1px"
    },
    "&.cm-continueToLocation-async": {
      backgroundColor: "var(--color-continue-to-location-async)",
      "&:hover": {
        backgroundColor: "var(--color-continue-to-location-async-hover)",
        border: "1px solid var(--color-continue-to-location-async-hover-border)",
        margin: "0 -1px"
      }
    }
  },
  ".cm-evaluatedExpression": {
    backgroundColor: "var(--color-evaluated-expression)",
    border: "1px solid var(--color-evaluated-expression-border)",
    margin: "0 -1px"
  },
  ".cm-variableValues": {
    display: "inline",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: "1000px",
    opacity: "80%",
    backgroundColor: "var(--color-variable-values)",
    marginLeft: "10px",
    padding: "0 5px",
    userSelect: "text",
    ".cm-executionLine &": {
      backgroundColor: "transparent",
      opacity: "50%"
    }
  }
});
function lineNumberArrow(color, outline2) {
  return `url('data:image/svg+xml,<svg height="11" width="26" xmlns="http://www.w3.org/2000/svg"><path d="M22.8.5l2.7 5-2.7 5H.5V.5z" fill="${encodeURIComponent(color)}" stroke="${encodeURIComponent(outline2)}"/></svg>') 1 3 1 1`;
}
function inlineBreakpointArrow(color, outline2, opacity = "1") {
  return `url('data:image/svg+xml,<svg width="11" height="12" viewBox="0 0 11 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M0.5 0.5H5.80139C6.29382 0.5 6.7549 0.741701 7.03503 1.14669L10.392 6L7.03503 10.8533C6.7549 11.2583 6.29382 11.5 5.80139 11.5H0.5V0.5Z" fill="${encodeURIComponent(color)}" stroke="${encodeURIComponent(outline2)}" fill-opacity="${encodeURIComponent(opacity)}"/></svg>')`;
}
function inlineConditionalBreakpointArrow(color, outline2, opacity = "1") {
  return `url('data:image/svg+xml,<svg width="11" height="12" viewBox="0 0 11 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M0.5 0.5H5.80139C6.29382 0.5 6.75489 0.741701 7.03503 1.14669L10.392 6L7.03503 10.8533C6.75489 11.2583 6.29382 11.5 5.80138 11.5H0.5V0.5Z" fill="${encodeURIComponent(color)}" fill-opacity="${encodeURIComponent(opacity)}" stroke="${encodeURIComponent(outline2)}"/><path d="M3.51074 7.75635H4.68408V9H3.51074V7.75635ZM4.68408 7.23779H3.51074V6.56104C3.51074 6.271 3.55615 6.02344 3.64697 5.81836C3.73779 5.61328 3.90039 5.39648 4.13477 5.16797L4.53027 4.77686C4.71484 4.59814 4.83936 4.4502 4.90381 4.33301C4.97119 4.21582 5.00488 4.09424 5.00488 3.96826C5.00488 3.77197 4.9375 3.62402 4.80273 3.52441C4.66797 3.4248 4.46582 3.375 4.19629 3.375C3.9502 3.375 3.69238 3.42773 3.42285 3.5332C3.15625 3.63574 2.88232 3.78955 2.60107 3.99463V2.81689C2.88818 2.65283 3.17822 2.52979 3.47119 2.44775C3.76709 2.36279 4.06299 2.32031 4.35889 2.32031C4.95068 2.32031 5.41504 2.45801 5.75195 2.7334C6.08887 3.00879 6.25732 3.38818 6.25732 3.87158C6.25732 4.09424 6.20752 4.30225 6.10791 4.49561C6.0083 4.68604 5.8208 4.91602 5.54541 5.18555L5.15869 5.56348C4.95947 5.75684 4.83203 5.91504 4.77637 6.03809C4.7207 6.16113 4.69287 6.31201 4.69287 6.49072C4.69287 6.51709 4.69141 6.54785 4.68848 6.58301C4.68848 6.61816 4.68701 6.65625 4.68408 6.69727V7.23779Z" fill="white"/></svg>')`;
}
function inlineLogpointArrow(color, outline2, opacity = "1") {
  return `url('data:image/svg+xml,<svg width="11" height="12" viewBox="0 0 11 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M0.5 0.5H5.80139C6.29382 0.5 6.7549 0.741701 7.03503 1.14669L10.392 6L7.03503 10.8533C6.7549 11.2583 6.29382 11.5 5.80139 11.5H0.5V0.5Z" fill="${encodeURIComponent(color)}" stroke="${encodeURIComponent(outline2)}" fill-opacity="${encodeURIComponent(opacity)}"/><circle cx="3" cy="6" r="1" fill="white"/><circle cx="7" cy="6" r="1" fill="white"/></svg>')`;
}

// gen/front_end/panels/sources/FilePathScoreFunction.js
var FilePathScoreFunction_exports = {};
__export(FilePathScoreFunction_exports, {
  FilePathScoreFunction: () => FilePathScoreFunction
});
var FilePathScoreFunction = class {
  query;
  queryUpperCase;
  score;
  sequence;
  dataUpperCase;
  fileNameIndex;
  constructor(query) {
    this.query = query;
    this.queryUpperCase = query.toUpperCase();
    this.score = new Int32Array(20 * 100);
    this.sequence = new Int32Array(20 * 100);
    this.dataUpperCase = "";
    this.fileNameIndex = 0;
  }
  /**
   * Calculates the score of a given data string against the query string.
   *
   * The score is calculated by comparing the characters of the query string to
   * the characters of the data string. Characters that match are given a score
   * of 10, while characters that don't match are given a score of 0. The score
   * of a match is also influenced by the context of the match. For example,
   * matching the beginning of the file name is worth more than matching a
   * character in the middle of the file name.
   *
   * The score of a match is also influenced by the number of consecutive
   * matches. The more consecutive matches there are, the higher the score.
   *
   * @param data The data string to score.
   * @param matchIndexes An optional array to store the indexes of matching
   * characters. If provided, it will be filled with the indexes of the matching
   * characters in the data string.
   * @returns The score of the data string.
   */
  calculateScore(data, matchIndexes) {
    if (!data || !this.query) {
      return 0;
    }
    const queryLength = this.query.length;
    const dataLength = data.length;
    if (!this.score || this.score.length < queryLength * dataLength) {
      this.score = new Int32Array(queryLength * dataLength * 2);
      this.sequence = new Int32Array(queryLength * dataLength * 2);
    }
    const score = this.score;
    const sequence = this.sequence;
    this.dataUpperCase = data.toUpperCase();
    this.fileNameIndex = data.lastIndexOf("/");
    for (let i = 0; i < queryLength; ++i) {
      for (let j = 0; j < dataLength; ++j) {
        const scoreIndex = i * dataLength + j;
        const skipCharScore = j === 0 ? 0 : score[scoreIndex - 1];
        const prevCharScore = i === 0 || j === 0 ? 0 : score[(i - 1) * dataLength + j - 1];
        const consecutiveMatch = i === 0 || j === 0 ? 0 : sequence[(i - 1) * dataLength + j - 1];
        const pickCharScore = this.match(this.query, data, i, j, consecutiveMatch);
        if (pickCharScore && prevCharScore + pickCharScore >= skipCharScore) {
          sequence[scoreIndex] = consecutiveMatch + 1;
          score[scoreIndex] = prevCharScore + pickCharScore;
        } else {
          sequence[scoreIndex] = 0;
          score[scoreIndex] = skipCharScore;
        }
      }
    }
    if (matchIndexes) {
      this.restoreMatchIndexes(sequence, queryLength, dataLength, matchIndexes);
    }
    const maxDataLength = 256;
    return score[queryLength * dataLength - 1] * maxDataLength + (maxDataLength - data.length);
  }
  testWordStart(data, j) {
    if (j === 0) {
      return true;
    }
    const prevChar = data.charAt(j - 1);
    return prevChar === "_" || prevChar === "-" || prevChar === "/" || prevChar === "." || prevChar === " " || data[j - 1] !== this.dataUpperCase[j - 1] && data[j] === this.dataUpperCase[j];
  }
  restoreMatchIndexes(sequence, queryLength, dataLength, out) {
    let i = queryLength - 1, j = dataLength - 1;
    while (i >= 0 && j >= 0) {
      switch (sequence[i * dataLength + j]) {
        case 0:
          --j;
          break;
        default:
          out.push(j);
          --i;
          --j;
          break;
      }
    }
    out.reverse();
  }
  singleCharScore(query, data, i, j) {
    const isWordStart = this.testWordStart(data, j);
    const isFileName = j > this.fileNameIndex;
    const isPathTokenStart = j === 0 || data[j - 1] === "/";
    const isCapsMatch = query[i] === data[j] && query[i] === this.queryUpperCase[i];
    let score = 10;
    if (isPathTokenStart) {
      score += 4;
    }
    if (isWordStart) {
      score += 2;
    }
    if (isCapsMatch) {
      score += 6;
    }
    if (isFileName) {
      score += 4;
    }
    if (j === this.fileNameIndex + 1 && i === 0) {
      score += 5;
    }
    if (isFileName && isWordStart) {
      score += 3;
    }
    return score;
  }
  sequenceCharScore(data, j, sequenceLength) {
    const isFileName = j > this.fileNameIndex;
    const isPathTokenStart = j === 0 || data[j - 1] === "/";
    let score = 10;
    if (isFileName) {
      score += 4;
    }
    if (isPathTokenStart) {
      score += 5;
    }
    score += sequenceLength * 4;
    return score;
  }
  match(query, data, i, j, consecutiveMatch) {
    if (this.queryUpperCase[i] !== this.dataUpperCase[j]) {
      return 0;
    }
    if (!consecutiveMatch) {
      return this.singleCharScore(query, data, i, j);
    }
    return this.sequenceCharScore(data, j - consecutiveMatch, consecutiveMatch);
  }
};

// gen/front_end/panels/sources/FilteredUISourceCodeListProvider.js
var FilteredUISourceCodeListProvider_exports = {};
__export(FilteredUISourceCodeListProvider_exports, {
  FilteredUISourceCodeListProvider: () => FilteredUISourceCodeListProvider
});
import * as i18n39 from "./../../core/i18n/i18n.js";
import * as Root4 from "./../../core/root/root.js";
import * as Persistence12 from "./../../models/persistence/persistence.js";
import * as Workspace23 from "./../../models/workspace/workspace.js";
import * as QuickOpen3 from "./../../ui/legacy/components/quick_open/quick_open.js";
import * as UI20 from "./../../ui/legacy/legacy.js";
var UIStrings19 = {
  /**
   * @description Text in Filtered UISource Code List Provider of the Sources panel
   */
  noFilesFound: "No files found",
  /**
   * @description Name of an item that is on the ignore list
   * @example {compile.html} PH1
   */
  sIgnoreListed: "{PH1} (ignore listed)"
};
var str_19 = i18n39.i18n.registerUIStrings("panels/sources/FilteredUISourceCodeListProvider.ts", UIStrings19);
var i18nString18 = i18n39.i18n.getLocalizedString.bind(void 0, str_19);
var FilteredUISourceCodeListProvider = class extends QuickOpen3.FilteredListWidget.Provider {
  queryLineNumberAndColumnNumber;
  defaultScores;
  scorer;
  uiSourceCodes;
  uiSourceCodeIds;
  query;
  constructor(jslogContext) {
    super(jslogContext);
    this.queryLineNumberAndColumnNumber = "";
    this.defaultScores = null;
    this.scorer = new FilePathScoreFunction("");
    this.uiSourceCodes = [];
    this.uiSourceCodeIds = /* @__PURE__ */ new Set();
  }
  projectRemoved(event) {
    const project = event.data;
    this.populate(project);
    this.refresh();
  }
  populate(skipProject) {
    this.uiSourceCodes = [];
    this.uiSourceCodeIds.clear();
    for (const project of Workspace23.Workspace.WorkspaceImpl.instance().projects()) {
      if (project !== skipProject && this.filterProject(project)) {
        for (const uiSourceCode of project.uiSourceCodes()) {
          if (this.filterUISourceCode(uiSourceCode)) {
            this.uiSourceCodes.push(uiSourceCode);
            this.uiSourceCodeIds.add(uiSourceCode.canonicalScriptId());
          }
        }
      }
    }
  }
  filterUISourceCode(uiSourceCode) {
    if (this.uiSourceCodeIds.has(uiSourceCode.canonicalScriptId())) {
      return false;
    }
    if (Root4.Runtime.experiments.isEnabled(
      "just-my-code"
      /* Root.Runtime.ExperimentName.JUST_MY_CODE */
    ) && Workspace23.IgnoreListManager.IgnoreListManager.instance().isUserOrSourceMapIgnoreListedUISourceCode(uiSourceCode)) {
      return false;
    }
    if (uiSourceCode.isFetchXHR()) {
      return false;
    }
    const binding = Persistence12.Persistence.PersistenceImpl.instance().binding(uiSourceCode);
    return !binding || binding.fileSystem === uiSourceCode;
  }
  uiSourceCodeSelected(_uiSourceCode, _lineNumber, _columnNumber) {
  }
  filterProject(_project) {
    return true;
  }
  itemCount() {
    return this.uiSourceCodes.length;
  }
  itemContentTypeAt(itemIndex) {
    return this.uiSourceCodes[itemIndex].contentType();
  }
  itemKeyAt(itemIndex) {
    return this.uiSourceCodes[itemIndex].url();
  }
  setDefaultScores(defaultScores) {
    this.defaultScores = defaultScores;
  }
  itemScoreAt(itemIndex, query) {
    const uiSourceCode = this.uiSourceCodes[itemIndex];
    const score = this.defaultScores ? this.defaultScores.get(uiSourceCode) || 0 : 0;
    if (!query || query.length < 2) {
      return score;
    }
    if (this.query !== query) {
      this.query = query;
      this.scorer = new FilePathScoreFunction(query);
    }
    let multiplier = 10;
    if (uiSourceCode.project().type() === Workspace23.Workspace.projectTypes.FileSystem && !Persistence12.Persistence.PersistenceImpl.instance().binding(uiSourceCode)) {
      multiplier = 5;
    }
    let contentTypeBonus = 0;
    if (uiSourceCode.contentType().isFromSourceMap() && !uiSourceCode.isKnownThirdParty()) {
      contentTypeBonus = 100;
    }
    if (uiSourceCode.contentType().isScript()) {
      if (!Workspace23.IgnoreListManager.IgnoreListManager.instance().isUserOrSourceMapIgnoreListedUISourceCode(uiSourceCode)) {
        contentTypeBonus += 50;
      }
    }
    const fullDisplayName = uiSourceCode.fullDisplayName();
    return score + multiplier * (contentTypeBonus + this.scorer.calculateScore(fullDisplayName, null));
  }
  renderItem(itemIndex, query, titleElement, subtitleElement) {
    titleElement.parentElement?.parentElement?.classList.toggle("search-mode", Boolean(query));
    query = this.rewriteQuery(query);
    const uiSourceCode = this.uiSourceCodes[itemIndex];
    const fullDisplayName = uiSourceCode.fullDisplayName();
    const indexes = [];
    new FilePathScoreFunction(query).calculateScore(fullDisplayName, indexes);
    const fileNameIndex = fullDisplayName.lastIndexOf("/");
    const isIgnoreListed = Workspace23.IgnoreListManager.IgnoreListManager.instance().isUserOrSourceMapIgnoreListedUISourceCode(uiSourceCode);
    let tooltipText = fullDisplayName;
    if (isIgnoreListed) {
      titleElement.parentElement?.classList.add("is-ignore-listed");
      tooltipText = i18nString18(UIStrings19.sIgnoreListed, { PH1: tooltipText });
    }
    titleElement.textContent = uiSourceCode.displayName() + (this.queryLineNumberAndColumnNumber || "");
    this.renderSubtitleElement(subtitleElement, fullDisplayName.substring(0, fileNameIndex + 1));
    UI20.Tooltip.Tooltip.install(subtitleElement, tooltipText);
    const ranges = [];
    for (let i = 0; i < indexes.length; ++i) {
      ranges.push({ offset: indexes[i], length: 1 });
    }
    if (indexes[0] > fileNameIndex) {
      for (let i = 0; i < ranges.length; ++i) {
        ranges[i].offset -= fileNameIndex + 1;
      }
      UI20.UIUtils.highlightRangesWithStyleClass(titleElement, ranges, "highlight");
    } else {
      UI20.UIUtils.highlightRangesWithStyleClass(subtitleElement, ranges, "highlight");
    }
  }
  renderSubtitleElement(element, text) {
    element.removeChildren();
    let splitPosition = text.lastIndexOf("/");
    const maxTextLength = 43;
    if (text.length > maxTextLength) {
      splitPosition = text.length - maxTextLength;
    }
    const first = element.createChild("div", "first-part");
    first.textContent = text.substring(0, splitPosition);
    const second = element.createChild("div", "second-part");
    second.textContent = text.substring(splitPosition);
    UI20.Tooltip.Tooltip.install(element, text);
  }
  selectItem(itemIndex, promptValue) {
    const parsedExpression = promptValue.trim().match(/^([^:]*)(:\d+)?(:\d+)?$/);
    if (!parsedExpression) {
      return;
    }
    let lineNumber;
    let columnNumber;
    if (parsedExpression[2]) {
      lineNumber = parseInt(parsedExpression[2].substr(1), 10) - 1;
    }
    if (parsedExpression[3]) {
      columnNumber = parseInt(parsedExpression[3].substr(1), 10) - 1;
    }
    const uiSourceCode = itemIndex !== null ? this.uiSourceCodes[itemIndex] : null;
    this.uiSourceCodeSelected(uiSourceCode, lineNumber, columnNumber);
  }
  rewriteQuery(query) {
    query = query ? query.trim() : "";
    if (!query || query === ":") {
      return "";
    }
    const lineNumberMatch = query.match(/^([^:]+)((?::[^:]*){0,2})$/);
    this.queryLineNumberAndColumnNumber = lineNumberMatch ? lineNumberMatch[2] : "";
    return lineNumberMatch ? lineNumberMatch[1] : query;
  }
  uiSourceCodeAdded(event) {
    const uiSourceCode = event.data;
    if (!this.filterUISourceCode(uiSourceCode) || !this.filterProject(uiSourceCode.project())) {
      return;
    }
    this.uiSourceCodes.push(uiSourceCode);
    this.uiSourceCodeIds.add(uiSourceCode.canonicalScriptId());
    this.refresh();
  }
  notFoundText() {
    return i18nString18(UIStrings19.noFilesFound);
  }
  attach() {
    Workspace23.Workspace.WorkspaceImpl.instance().addEventListener(Workspace23.Workspace.Events.UISourceCodeAdded, this.uiSourceCodeAdded, this);
    Workspace23.Workspace.WorkspaceImpl.instance().addEventListener(Workspace23.Workspace.Events.ProjectRemoved, this.projectRemoved, this);
    this.populate();
  }
  detach() {
    Workspace23.Workspace.WorkspaceImpl.instance().removeEventListener(Workspace23.Workspace.Events.UISourceCodeAdded, this.uiSourceCodeAdded, this);
    Workspace23.Workspace.WorkspaceImpl.instance().removeEventListener(Workspace23.Workspace.Events.ProjectRemoved, this.projectRemoved, this);
    this.queryLineNumberAndColumnNumber = "";
    this.defaultScores = null;
  }
};

// gen/front_end/panels/sources/GoToLineQuickOpen.js
var GoToLineQuickOpen_exports = {};
__export(GoToLineQuickOpen_exports, {
  GoToLineQuickOpen: () => GoToLineQuickOpen
});
import * as i18n41 from "./../../core/i18n/i18n.js";
import * as IconButton10 from "./../../ui/components/icon_button/icon_button.js";
import * as QuickOpen4 from "./../../ui/legacy/components/quick_open/quick_open.js";
import * as UI21 from "./../../ui/legacy/legacy.js";
var UIStrings20 = {
  /**
   * @description Text in Go To Line Quick Open of the Sources panel
   */
  noFileSelected: "No file selected",
  /**
   * @description Text to show no results have been found
   */
  noResultsFound: "No results found",
  /**
   * @description Text in Go To Line Quick Open of the Sources panel
   */
  typeANumberToGoToThatLine: "Type a number to go to that line",
  /**
   * @description Text in Go To Line Quick Open of the Sources panel
   * @example {000} PH1
   * @example {bbb} PH2
   */
  currentPositionXsTypeAnOffset: "Type an offset between 0x{PH1} and 0x{PH2} to navigate to",
  /**
   * @description Text in the GoToLine dialog of the Sources pane that describes the current line number, file line number range, and use of the GoToLine dialog
   * @example {100} PH1
   */
  currentLineSTypeALineNumber: "Type a line number between 1 and {PH1} to navigate to",
  /**
   * @description Text in Go To Line Quick Open of the Sources panel
   * @example {abc} PH1
   */
  goToOffsetXs: "Go to offset 0x{PH1}",
  /**
   * @description Text in Go To Line Quick Open of the Sources panel
   * @example {2} PH1
   * @example {2} PH2
   */
  goToLineSAndColumnS: "Go to line {PH1} and column {PH2}",
  /**
   * @description Text in Go To Line Quick Open of the Sources panel
   * @example {2} PH1
   */
  goToLineS: "Go to line {PH1}"
};
var str_20 = i18n41.i18n.registerUIStrings("panels/sources/GoToLineQuickOpen.ts", UIStrings20);
var i18nString19 = i18n41.i18n.getLocalizedString.bind(void 0, str_20);
var GoToLineQuickOpen = class extends QuickOpen4.FilteredListWidget.Provider {
  #goToLineStrings = [];
  constructor() {
    super("source-line");
  }
  selectItem(_itemIndex, promptValue) {
    const sourceFrame = this.currentSourceFrame();
    if (!sourceFrame) {
      return;
    }
    const position = this.parsePosition(promptValue);
    if (!position) {
      return;
    }
    sourceFrame.revealPosition({ lineNumber: position.line - 1, columnNumber: position.column - 1 });
  }
  itemCount() {
    return this.#goToLineStrings.length;
  }
  renderItem(itemIndex, _query, titleElement, _subtitleElement) {
    const icon = IconButton10.Icon.create("colon");
    titleElement.parentElement?.parentElement?.insertBefore(icon, titleElement.parentElement);
    UI21.UIUtils.createTextChild(titleElement, this.#goToLineStrings[itemIndex]);
  }
  rewriteQuery(_query) {
    return "";
  }
  queryChanged(query) {
    this.#goToLineStrings = [];
    const position = this.parsePosition(query);
    const sourceFrame = this.currentSourceFrame();
    if (!position) {
      if (!sourceFrame) {
        this.#goToLineStrings.push(i18nString19(UIStrings20.typeANumberToGoToThatLine));
        return;
      }
      const editorState = sourceFrame.textEditor.state;
      const disassembly = sourceFrame.wasmDisassembly;
      if (disassembly) {
        const lastBytecodeOffset = disassembly.lineNumberToBytecodeOffset(disassembly.lineNumbers - 1);
        const bytecodeOffsetDigits = lastBytecodeOffset.toString(16).length;
        this.#goToLineStrings.push(i18nString19(UIStrings20.currentPositionXsTypeAnOffset, {
          PH1: "0".padStart(bytecodeOffsetDigits, "0"),
          PH2: lastBytecodeOffset.toString(16)
        }));
        return;
      }
      const linesCount = sourceFrame.editorLocationToUILocation(editorState.doc.lines - 1).lineNumber + 1;
      this.#goToLineStrings.push(i18nString19(UIStrings20.currentLineSTypeALineNumber, { PH1: linesCount }));
      return;
    }
    if (sourceFrame?.wasmDisassembly) {
      this.#goToLineStrings.push(i18nString19(UIStrings20.goToOffsetXs, { PH1: (position.column - 1).toString(16) }));
      return;
    }
    if (position.column && position.column > 1) {
      this.#goToLineStrings.push(i18nString19(UIStrings20.goToLineSAndColumnS, { PH1: position.line, PH2: position.column }));
      return;
    }
    if (sourceFrame && position.line > sourceFrame.textEditor.state.doc.lines) {
      return;
    }
    this.#goToLineStrings.push(i18nString19(UIStrings20.goToLineS, { PH1: position.line }));
  }
  notFoundText(_query) {
    if (!this.currentSourceFrame()) {
      return i18nString19(UIStrings20.noFileSelected);
    }
    return i18nString19(UIStrings20.noResultsFound);
  }
  parsePosition(query) {
    const sourceFrame = this.currentSourceFrame();
    if (sourceFrame?.wasmDisassembly) {
      const parts2 = query.match(/0x([0-9a-fA-F]+)/);
      if (!parts2?.[0] || parts2[0].length !== query.length) {
        return null;
      }
      const column2 = parseInt(parts2[0], 16) + 1;
      return { line: 0, column: column2 };
    }
    const parts = query.match(/([0-9]+)(\:[0-9]*)?/);
    if (!parts?.[0] || parts[0].length !== query.length) {
      return null;
    }
    const line = parseInt(parts[1], 10);
    let column = 0;
    if (parts[2]) {
      column = parseInt(parts[2].substring(1), 10);
    }
    return { line: Math.max(line | 0, 1), column: Math.max(column | 0, 1) };
  }
  currentSourceFrame() {
    const sourcesView = UI21.Context.Context.instance().flavor(SourcesView);
    if (!sourcesView) {
      return null;
    }
    return sourcesView.currentSourceFrame();
  }
};

// gen/front_end/panels/sources/InplaceFormatterEditorAction.js
var InplaceFormatterEditorAction_exports = {};
__export(InplaceFormatterEditorAction_exports, {
  InplaceFormatterEditorAction: () => InplaceFormatterEditorAction
});
import * as Common14 from "./../../core/common/common.js";
import * as i18n43 from "./../../core/i18n/i18n.js";
import * as Formatter2 from "./../../models/formatter/formatter.js";
import * as Persistence14 from "./../../models/persistence/persistence.js";
import * as TextUtils11 from "./../../models/text_utils/text_utils.js";
import * as Workspace25 from "./../../models/workspace/workspace.js";
import * as UI22 from "./../../ui/legacy/legacy.js";
var UIStrings21 = {
  /**
   * @description Title of the format button in the Sources panel
   * @example {file name} PH1
   */
  formatS: "Format {PH1}",
  /**
   * @description Tooltip text that appears when hovering over the largeicon pretty print button in the Inplace Formatter Editor Action of the Sources panel
   */
  format: "Format"
};
var str_21 = i18n43.i18n.registerUIStrings("panels/sources/InplaceFormatterEditorAction.ts", UIStrings21);
var i18nString20 = i18n43.i18n.getLocalizedString.bind(void 0, str_21);
var inplaceFormatterEditorActionInstance;
var InplaceFormatterEditorAction = class _InplaceFormatterEditorAction {
  button;
  sourcesView;
  uiSourceCodeTitleChangedEvent = null;
  static instance(opts = { forceNew: null }) {
    const { forceNew } = opts;
    if (!inplaceFormatterEditorActionInstance || forceNew) {
      inplaceFormatterEditorActionInstance = new _InplaceFormatterEditorAction();
    }
    return inplaceFormatterEditorActionInstance;
  }
  editorSelected(event) {
    const uiSourceCode = event.data;
    this.updateButton(uiSourceCode);
  }
  editorClosed(event) {
    const { wasSelected } = event.data;
    if (wasSelected) {
      this.updateButton(null);
    }
  }
  updateButton(uiSourceCode) {
    if (this.uiSourceCodeTitleChangedEvent) {
      Common14.EventTarget.removeEventListeners([this.uiSourceCodeTitleChangedEvent]);
    }
    this.uiSourceCodeTitleChangedEvent = uiSourceCode ? uiSourceCode.addEventListener(Workspace25.UISourceCode.Events.TitleChanged, (event) => this.updateButton(event.data), this) : null;
    const isFormattable = this.isFormattable(uiSourceCode);
    this.button.element.classList.toggle("hidden", !isFormattable);
    if (uiSourceCode && isFormattable) {
      this.button.setTitle(i18nString20(UIStrings21.formatS, { PH1: uiSourceCode.name() }));
    }
  }
  getOrCreateButton(sourcesView) {
    if (this.button) {
      return this.button;
    }
    this.sourcesView = sourcesView;
    this.sourcesView.addEventListener("EditorSelected", this.editorSelected.bind(this));
    this.sourcesView.addEventListener("EditorClosed", this.editorClosed.bind(this));
    this.button = new UI22.Toolbar.ToolbarButton(i18nString20(UIStrings21.format), "brackets");
    this.button.addEventListener("Click", this.formatSourceInPlace, this);
    this.updateButton(sourcesView.currentUISourceCode());
    return this.button;
  }
  isFormattable(uiSourceCode) {
    if (!uiSourceCode) {
      return false;
    }
    if (uiSourceCode.project().canSetFileContent()) {
      return true;
    }
    if (Persistence14.Persistence.PersistenceImpl.instance().binding(uiSourceCode) !== null) {
      return true;
    }
    return false;
  }
  formatSourceInPlace() {
    const sourceFrame = this.sourcesView.currentSourceFrame();
    if (!sourceFrame) {
      return;
    }
    const uiSourceCode = sourceFrame.uiSourceCode();
    if (!this.isFormattable(uiSourceCode)) {
      return;
    }
    if (uiSourceCode.isDirty()) {
      void this.contentLoaded(uiSourceCode, sourceFrame, uiSourceCode.workingCopy());
    } else {
      void uiSourceCode.requestContentData().then((contentDataOrError) => TextUtils11.ContentData.ContentData.textOr(contentDataOrError, "")).then((content) => {
        void this.contentLoaded(uiSourceCode, sourceFrame, content);
      });
    }
  }
  async contentLoaded(uiSourceCode, sourceFrame, content) {
    const { formattedContent, formattedMapping } = await Formatter2.ScriptFormatter.format(uiSourceCode.contentType(), sourceFrame.contentType, content);
    if (uiSourceCode.workingCopy() === formattedContent) {
      return;
    }
    const selection = sourceFrame.textEditor.toLineColumn(sourceFrame.textEditor.state.selection.main.head);
    const [lineNumber, columnNumber] = formattedMapping.originalToFormatted(selection.lineNumber, selection.columnNumber);
    uiSourceCode.setWorkingCopy(formattedContent);
    this.sourcesView.showSourceLocation(uiSourceCode, { lineNumber, columnNumber });
  }
};
registerEditorAction(InplaceFormatterEditorAction.instance);

// gen/front_end/panels/sources/OpenFileQuickOpen.js
var OpenFileQuickOpen_exports = {};
__export(OpenFileQuickOpen_exports, {
  OpenFileQuickOpen: () => OpenFileQuickOpen
});
import * as Common15 from "./../../core/common/common.js";
import * as Host10 from "./../../core/host/host.js";
import { PanelUtils as PanelUtils2 } from "./../utils/utils.js";
import * as IconButton11 from "./../../ui/components/icon_button/icon_button.js";
var OpenFileQuickOpen = class extends FilteredUISourceCodeListProvider {
  constructor() {
    super("source-file");
  }
  attach() {
    this.setDefaultScores(SourcesView.defaultUISourceCodeScores());
    super.attach();
  }
  uiSourceCodeSelected(uiSourceCode, lineNumber, columnNumber) {
    Host10.userMetrics.actionTaken(Host10.UserMetrics.Action.SelectFileFromFilePicker);
    if (!uiSourceCode) {
      return;
    }
    if (typeof lineNumber === "number") {
      void Common15.Revealer.reveal(uiSourceCode.uiLocation(lineNumber, columnNumber));
    } else {
      void Common15.Revealer.reveal(uiSourceCode);
    }
  }
  filterProject(project) {
    return !project.isServiceProject();
  }
  renderItem(itemIndex, query, titleElement, subtitleElement) {
    super.renderItem(itemIndex, query, titleElement, subtitleElement);
    const iconElement = new IconButton11.Icon.Icon();
    const { iconName, color } = PanelUtils2.iconDataForResourceType(this.itemContentTypeAt(itemIndex));
    iconElement.name = iconName;
    if (color) {
      iconElement.style.color = color;
    }
    iconElement.classList.add("large");
    titleElement.parentElement?.parentElement?.insertBefore(iconElement, titleElement.parentElement);
  }
  renderAsTwoRows() {
    return true;
  }
};

// gen/front_end/panels/sources/OutlineQuickOpen.js
var OutlineQuickOpen_exports = {};
__export(OutlineQuickOpen_exports, {
  OutlineQuickOpen: () => OutlineQuickOpen,
  outline: () => outline
});
import * as i18n45 from "./../../core/i18n/i18n.js";
import * as CodeMirror7 from "./../../third_party/codemirror.next/codemirror.next.js";
import * as IconButton12 from "./../../ui/components/icon_button/icon_button.js";
import * as QuickOpen5 from "./../../ui/legacy/components/quick_open/quick_open.js";
import * as UI23 from "./../../ui/legacy/legacy.js";
var UIStrings22 = {
  /**
   * @description Text in Go To Line Quick Open of the Sources panel
   */
  noFileSelected: "No file selected.",
  /**
   * @description Text in Outline Quick Open of the Sources panel
   */
  openAJavascriptOrCssFileToSee: "Open a JavaScript or CSS file to see symbols",
  /**
   * @description Text to show no results have been found
   */
  noResultsFound: "No results found"
};
var str_22 = i18n45.i18n.registerUIStrings("panels/sources/OutlineQuickOpen.ts", UIStrings22);
var i18nString21 = i18n45.i18n.getLocalizedString.bind(void 0, str_22);
function outline(state) {
  function toLineColumn(offset) {
    offset = Math.max(0, Math.min(offset, state.doc.length));
    const line = state.doc.lineAt(offset);
    return { lineNumber: line.number - 1, columnNumber: offset - line.from };
  }
  function subtitleFromParamList() {
    while (cursor.name !== "ParamList") {
      if (!cursor.nextSibling()) {
        break;
      }
    }
    let parameters = "";
    if (cursor.name === "ParamList" && cursor.firstChild()) {
      do {
        switch (cursor.name) {
          case "ArrayPattern":
            parameters += "[\u2025]";
            break;
          case "ObjectPattern":
            parameters += "{\u2025}";
            break;
          case "VariableDefinition":
            parameters += state.sliceDoc(cursor.from, cursor.to);
            break;
          case "Spread":
            parameters += "...";
            break;
          case ",":
            parameters += ", ";
            break;
        }
      } while (cursor.nextSibling());
    }
    return `(${parameters})`;
  }
  const tree = CodeMirror7.syntaxTree(state);
  const items = [];
  const cursor = tree.cursor();
  do {
    switch (cursor.name) {
      // css.grammar
      case "RuleSet": {
        for (cursor.firstChild(); ; cursor.nextSibling()) {
          const title = state.sliceDoc(cursor.from, cursor.to);
          const { lineNumber, columnNumber } = toLineColumn(cursor.from);
          items.push({ title, lineNumber, columnNumber });
          cursor.nextSibling();
          if (cursor.name !== ",") {
            break;
          }
        }
        break;
      }
      // javascript.grammar
      case "FunctionDeclaration":
      case "MethodDeclaration": {
        let prefix = "";
        cursor.firstChild();
        do {
          switch (cursor.name) {
            case "abstract":
            case "async":
            case "get":
            case "set":
            case "static":
              prefix = `${prefix}${cursor.name} `;
              break;
            case "Star":
              prefix += "*";
              break;
            case "PropertyDefinition":
            case "PrivatePropertyDefinition":
            case "VariableDefinition": {
              const title = prefix + state.sliceDoc(cursor.from, cursor.to);
              const { lineNumber, columnNumber } = toLineColumn(cursor.from);
              const subtitle = subtitleFromParamList();
              items.push({ title, subtitle, lineNumber, columnNumber });
              break;
            }
          }
        } while (cursor.nextSibling());
        break;
      }
      case "Property": {
        let prefix = "";
        cursor.firstChild();
        do {
          if (cursor.name === "async" || cursor.name === "get" || cursor.name === "set") {
            prefix = `${prefix}${cursor.name} `;
          } else if (cursor.name === "Star") {
            prefix += "*";
          } else if (cursor.name === "PropertyDefinition") {
            let title = state.sliceDoc(cursor.from, cursor.to);
            const { lineNumber, columnNumber } = toLineColumn(cursor.from);
            while (cursor.nextSibling()) {
              if (cursor.name === "ClassExpression") {
                title = `class ${title}`;
                items.push({ title, lineNumber, columnNumber });
                break;
              }
              if (cursor.name === "ArrowFunction" || cursor.name === "FunctionExpression") {
                cursor.firstChild();
              }
              if (cursor.name === "async") {
                prefix = `async ${prefix}`;
              } else if (cursor.name === "Star") {
                prefix += "*";
              } else if (cursor.name === "ParamList") {
                title = prefix + title;
                const subtitle = subtitleFromParamList();
                items.push({ title, subtitle, lineNumber, columnNumber });
                break;
              }
            }
            break;
          } else {
            break;
          }
        } while (cursor.nextSibling());
        break;
      }
      case "PropertyName":
      case "VariableDefinition": {
        if (cursor.matchContext(["ClassDeclaration"])) {
          const title = "class " + state.sliceDoc(cursor.from, cursor.to);
          const { lineNumber, columnNumber } = toLineColumn(cursor.from);
          items.push({ title, lineNumber, columnNumber });
        } else if (cursor.matchContext([
          "AssignmentExpression",
          "MemberExpression"
        ]) || cursor.matchContext([
          "VariableDeclaration"
        ])) {
          let title = state.sliceDoc(cursor.from, cursor.to);
          const { lineNumber, columnNumber } = toLineColumn(cursor.from);
          while (cursor.name !== "Equals") {
            if (!cursor.next()) {
              return items;
            }
          }
          if (!cursor.nextSibling()) {
            break;
          }
          if (cursor.name === "ArrowFunction" || cursor.name === "FunctionExpression") {
            cursor.firstChild();
            let prefix = "";
            while (cursor.name !== "ParamList") {
              if (cursor.name === "async") {
                prefix = `async ${prefix}`;
              } else if (cursor.name === "Star") {
                prefix += "*";
              }
              if (!cursor.nextSibling()) {
                break;
              }
            }
            title = prefix + title;
            const subtitle = subtitleFromParamList();
            items.push({ title, subtitle, lineNumber, columnNumber });
          } else if (cursor.name === "ClassExpression") {
            title = `class ${title}`;
            items.push({ title, lineNumber, columnNumber });
          }
        }
        break;
      }
      // wast.grammar
      case "App": {
        if (cursor.firstChild() && cursor.nextSibling() && state.sliceDoc(cursor.from, cursor.to) === "module") {
          if (cursor.nextSibling() && cursor.name === "Identifier") {
            const title = state.sliceDoc(cursor.from, cursor.to);
            const { lineNumber, columnNumber } = toLineColumn(cursor.from);
            items.push({ title, lineNumber, columnNumber });
          }
          do {
            if (cursor.name === "App" && cursor.firstChild()) {
              if (cursor.nextSibling() && state.sliceDoc(cursor.from, cursor.to) === "func" && cursor.nextSibling() && cursor.name === "Identifier") {
                const title = state.sliceDoc(cursor.from, cursor.to);
                const { lineNumber, columnNumber } = toLineColumn(cursor.from);
                const params = [];
                while (cursor.nextSibling()) {
                  if (cursor.name === "App" && cursor.firstChild()) {
                    if (cursor.nextSibling() && state.sliceDoc(cursor.from, cursor.to) === "param") {
                      if (cursor.nextSibling() && cursor.name === "Identifier") {
                        params.push(state.sliceDoc(cursor.from, cursor.to));
                      } else {
                        params.push(`$${params.length}`);
                      }
                    }
                    cursor.parent();
                  }
                }
                const subtitle = `(${params.join(", ")})`;
                items.push({ title, subtitle, lineNumber, columnNumber });
              }
              cursor.parent();
            }
          } while (cursor.nextSibling());
        }
        break;
      }
      // cpp.grammar
      case "FieldIdentifier":
      case "Identifier": {
        if (cursor.matchContext(["FunctionDeclarator"])) {
          const title = state.sliceDoc(cursor.from, cursor.to);
          const { lineNumber, columnNumber } = toLineColumn(cursor.from);
          items.push({ title, lineNumber, columnNumber });
        }
        break;
      }
      case "TypeIdentifier": {
        if (cursor.matchContext(["ClassSpecifier"])) {
          const title = `class ${state.sliceDoc(cursor.from, cursor.to)}`;
          const { lineNumber, columnNumber } = toLineColumn(cursor.from);
          items.push({ title, lineNumber, columnNumber });
        } else if (cursor.matchContext(["StructSpecifier"])) {
          const title = `struct ${state.sliceDoc(cursor.from, cursor.to)}`;
          const { lineNumber, columnNumber } = toLineColumn(cursor.from);
          items.push({ title, lineNumber, columnNumber });
        }
        break;
      }
      default:
        break;
    }
  } while (cursor.next());
  return items;
}
var OutlineQuickOpen = class extends QuickOpen5.FilteredListWidget.Provider {
  items = [];
  active = false;
  constructor() {
    super("source-symbol");
  }
  attach() {
    const sourceFrame = this.currentSourceFrame();
    if (sourceFrame) {
      this.active = true;
      this.items = outline(sourceFrame.textEditor.state).map(({ title, subtitle, lineNumber, columnNumber }) => {
        ({ lineNumber, columnNumber } = sourceFrame.editorLocationToUILocation(lineNumber, columnNumber));
        return { title, subtitle, lineNumber, columnNumber };
      });
    } else {
      this.active = false;
      this.items = [];
    }
  }
  detach() {
    this.active = false;
    this.items = [];
  }
  itemCount() {
    return this.items.length;
  }
  itemKeyAt(itemIndex) {
    const item = this.items[itemIndex];
    return item.title + (item.subtitle ? item.subtitle : "");
  }
  itemScoreAt(itemIndex, query) {
    const item = this.items[itemIndex];
    const methodName = query.split("(")[0];
    if (methodName.toLowerCase() === item.title.toLowerCase()) {
      return 1 / (1 + item.lineNumber);
    }
    return -item.lineNumber - 1;
  }
  renderItem(itemIndex, query, titleElement, _subtitleElement) {
    const item = this.items[itemIndex];
    const icon = IconButton12.Icon.create("deployed");
    titleElement.parentElement?.parentElement?.insertBefore(icon, titleElement.parentElement);
    titleElement.textContent = item.title + (item.subtitle ? item.subtitle : "");
    QuickOpen5.FilteredListWidget.FilteredListWidget.highlightRanges(titleElement, query);
    const sourceFrame = this.currentSourceFrame();
    if (!sourceFrame) {
      return;
    }
    const tagElement = titleElement.parentElement?.parentElement?.createChild("span", "tag");
    if (!tagElement) {
      return;
    }
    const disassembly = sourceFrame.wasmDisassembly;
    if (disassembly) {
      const lastBytecodeOffset = disassembly.lineNumberToBytecodeOffset(disassembly.lineNumbers - 1);
      const bytecodeOffsetDigits = lastBytecodeOffset.toString(16).length;
      tagElement.textContent = `:0x${item.columnNumber.toString(16).padStart(bytecodeOffsetDigits, "0")}`;
    } else {
      tagElement.textContent = `:${item.lineNumber + 1}`;
    }
  }
  selectItem(itemIndex, _promptValue) {
    if (itemIndex === null) {
      return;
    }
    const sourceFrame = this.currentSourceFrame();
    if (!sourceFrame) {
      return;
    }
    const item = this.items[itemIndex];
    sourceFrame.revealPosition({ lineNumber: item.lineNumber, columnNumber: item.columnNumber }, true);
  }
  currentSourceFrame() {
    const sourcesView = UI23.Context.Context.instance().flavor(SourcesView);
    return sourcesView?.currentSourceFrame() ?? null;
  }
  notFoundText() {
    if (!this.currentSourceFrame()) {
      return i18nString21(UIStrings22.noFileSelected);
    }
    if (!this.active) {
      return i18nString21(UIStrings22.openAJavascriptOrCssFileToSee);
    }
    return i18nString21(UIStrings22.noResultsFound);
  }
};

// gen/front_end/panels/sources/PersistenceActions.js
var PersistenceActions_exports = {};
__export(PersistenceActions_exports, {
  ContextMenuProvider: () => ContextMenuProvider
});
import * as Common16 from "./../../core/common/common.js";
import * as Host11 from "./../../core/host/host.js";
import * as i18n47 from "./../../core/i18n/i18n.js";
import * as SDK13 from "./../../core/sdk/sdk.js";
import * as Bindings10 from "./../../models/bindings/bindings.js";
import * as Persistence16 from "./../../models/persistence/persistence.js";
import * as TextUtils12 from "./../../models/text_utils/text_utils.js";
import * as Workspace26 from "./../../models/workspace/workspace.js";
import * as UI24 from "./../../ui/legacy/legacy.js";
var UIStrings23 = {
  /**
   * @description Text to save content as a specific file type
   */
  saveAs: "Save as\u2026",
  /**
   * @description Context menu item for saving an image
   */
  saveImage: "Save image",
  /**
   * @description Context menu item for showing all overridden files
   */
  showOverrides: "Show all overrides",
  /**
   * @description A context menu item in the Persistence Actions of the Workspace settings in Settings
   */
  overrideContent: "Override content",
  /**
   * @description A context menu item in the Persistence Actions of the Workspace settings in Settings
   */
  openInContainingFolder: "Open in containing folder",
  /**
   * @description A message in a confirmation dialog in the Persistence Actions
   * @example {bundle.min.js} PH1
   */
  overrideSourceMappedFileWarning: "Override \u2018{PH1}\u2019 instead?",
  /**
   * @description A message in a confirmation dialog to explain why the action is failed in the Persistence Actions
   * @example {index.ts} PH1
   */
  overrideSourceMappedFileExplanation: "\u2018{PH1}\u2019 is a source mapped file and cannot be overridden.",
  /**
   * @description An error message shown in the DevTools console after the user clicked "Save as" in
   * the context menu of a page resource.
   */
  saveFailed: "Failed to save file to disk.",
  /**
   * @description An error message shown in the DevTools console after the user clicked "Save as" in
   * the context menu of a WebAssembly file.
   */
  saveWasmFailed: "Unable to save WASM module to disk. Most likely the module is too large."
};
var str_23 = i18n47.i18n.registerUIStrings("panels/sources/PersistenceActions.ts", UIStrings23);
var i18nString22 = i18n47.i18n.getLocalizedString.bind(void 0, str_23);
var ContextMenuProvider = class {
  appendApplicableItems(_event, contextMenu, contentProvider) {
    async function saveAs() {
      if (contentProvider instanceof Workspace26.UISourceCode.UISourceCode) {
        contentProvider.commitWorkingCopy();
      }
      const url = contentProvider.contentURL();
      let contentData;
      const maybeScript = getScript(contentProvider);
      if (maybeScript?.isWasm()) {
        try {
          const base64 = await maybeScript.getWasmBytecode().then(Common16.Base64.encode);
          contentData = new TextUtils12.ContentData.ContentData(
            base64,
            /* isBase64=*/
            true,
            "application/wasm"
          );
        } catch (e) {
          console.error(`Unable to convert WASM byte code for ${url} to base64. Not saving to disk`, e.stack);
          Common16.Console.Console.instance().error(
            i18nString22(UIStrings23.saveWasmFailed),
            /* show=*/
            false
          );
          return;
        }
      } else {
        const contentDataOrError = await contentProvider.requestContentData();
        if (TextUtils12.ContentData.ContentData.isError(contentDataOrError)) {
          console.error(`Failed to retrieve content for ${url}: ${contentDataOrError}`);
          Common16.Console.Console.instance().error(
            i18nString22(UIStrings23.saveFailed),
            /* show=*/
            false
          );
          return;
        }
        contentData = contentDataOrError;
      }
      await Workspace26.FileManager.FileManager.instance().save(
        url,
        contentData,
        /* forceSaveAs=*/
        true
      );
      Workspace26.FileManager.FileManager.instance().close(url);
    }
    async function saveImage() {
      const targetObject = contentProvider;
      const contentDataOrError = await targetObject.requestContentData();
      const content = TextUtils12.ContentData.ContentData.textOr(contentDataOrError, "");
      const link2 = document.createElement("a");
      link2.download = targetObject.displayName;
      link2.href = "data:" + targetObject.mimeType + ";base64," + content;
      link2.click();
    }
    if (contentProvider.contentType().isDocumentOrScriptOrStyleSheet()) {
      contextMenu.saveSection().appendItem(i18nString22(UIStrings23.saveAs), saveAs, { jslogContext: "save-as" });
    } else if (contentProvider instanceof SDK13.Resource.Resource && contentProvider.contentType().isImage()) {
      contextMenu.saveSection().appendItem(i18nString22(UIStrings23.saveImage), saveImage, { jslogContext: "save-image" });
    }
    const uiSourceCode = Workspace26.Workspace.WorkspaceImpl.instance().uiSourceCodeForURL(contentProvider.contentURL());
    const networkPersistenceManager = Persistence16.NetworkPersistenceManager.NetworkPersistenceManager.instance();
    const binding = uiSourceCode && Persistence16.Persistence.PersistenceImpl.instance().binding(uiSourceCode);
    const fileURL = binding ? binding.fileSystem.contentURL() : contentProvider.contentURL();
    if (Common16.ParsedURL.schemeIs(fileURL, "file:")) {
      const path = Common16.ParsedURL.ParsedURL.urlToRawPathString(fileURL, Host11.Platform.isWin());
      contextMenu.revealSection().appendItem(i18nString22(UIStrings23.openInContainingFolder), () => Host11.InspectorFrontendHost.InspectorFrontendHostInstance.showItemInFolder(path), { jslogContext: "open-in-containing-folder" });
    }
    if (contentProvider instanceof Workspace26.UISourceCode.UISourceCode && contentProvider.project().type() === Workspace26.Workspace.projectTypes.FileSystem) {
      return;
    }
    let disabled = true;
    let handler = () => {
    };
    if (uiSourceCode && networkPersistenceManager.isUISourceCodeOverridable(uiSourceCode)) {
      if (!uiSourceCode.contentType().isFromSourceMap()) {
        disabled = false;
        handler = this.handleOverrideContent.bind(this, uiSourceCode, contentProvider);
      } else {
        const deployedUiSourceCode = this.getDeployedUiSourceCode(uiSourceCode);
        if (deployedUiSourceCode) {
          disabled = false;
          handler = this.redirectOverrideToDeployedUiSourceCode.bind(this, deployedUiSourceCode, uiSourceCode);
        }
      }
    }
    contextMenu.overrideSection().appendItem(i18nString22(UIStrings23.overrideContent), handler, { disabled, jslogContext: "override-content" });
    if (contentProvider instanceof SDK13.NetworkRequest.NetworkRequest) {
      contextMenu.overrideSection().appendItem(i18nString22(UIStrings23.showOverrides), async () => {
        await UI24.ViewManager.ViewManager.instance().showView("navigator-overrides");
        Host11.userMetrics.actionTaken(Host11.UserMetrics.Action.ShowAllOverridesFromNetworkContextMenu);
      }, { jslogContext: "show-overrides" });
    }
  }
  async handleOverrideContent(uiSourceCode, contentProvider) {
    const networkPersistenceManager = Persistence16.NetworkPersistenceManager.NetworkPersistenceManager.instance();
    const isSuccess = await networkPersistenceManager.setupAndStartLocalOverrides(uiSourceCode);
    if (isSuccess) {
      await Common16.Revealer.reveal(uiSourceCode);
    }
    if (contentProvider instanceof SDK13.NetworkRequest.NetworkRequest) {
      Host11.userMetrics.actionTaken(Host11.UserMetrics.Action.OverrideContentFromNetworkContextMenu);
    } else if (contentProvider instanceof Workspace26.UISourceCode.UISourceCode) {
      Host11.userMetrics.actionTaken(Host11.UserMetrics.Action.OverrideContentFromSourcesContextMenu);
    }
    if (uiSourceCode.isFetchXHR()) {
      Host11.userMetrics.actionTaken(Host11.UserMetrics.Action.OverrideFetchXHR);
    } else if (contentProvider.contentType().isScript()) {
      Host11.userMetrics.actionTaken(Host11.UserMetrics.Action.OverrideScript);
    } else if (contentProvider.contentType().isDocument()) {
      Host11.userMetrics.actionTaken(Host11.UserMetrics.Action.OverrideDocument);
    } else if (contentProvider.contentType().isStyleSheet()) {
      Host11.userMetrics.actionTaken(Host11.UserMetrics.Action.OverrideStyleSheet);
    } else if (contentProvider.contentType().isImage()) {
      Host11.userMetrics.actionTaken(Host11.UserMetrics.Action.OverrideImage);
    } else if (contentProvider.contentType().isFont()) {
      Host11.userMetrics.actionTaken(Host11.UserMetrics.Action.OverrideFont);
    }
  }
  async redirectOverrideToDeployedUiSourceCode(deployedUiSourceCode, originalUiSourceCode) {
    Host11.userMetrics.actionTaken(Host11.UserMetrics.Action.OverrideContentContextMenuSourceMappedWarning);
    const deployedUrl = deployedUiSourceCode.url();
    const deployedName = Bindings10.ResourceUtils.displayNameForURL(deployedUrl);
    const originalUrl = originalUiSourceCode.url();
    const originalName = Bindings10.ResourceUtils.displayNameForURL(originalUrl);
    const shouldJumpToDeployedFile = await UI24.UIUtils.ConfirmDialog.show(i18nString22(UIStrings23.overrideSourceMappedFileExplanation, { PH1: originalName }), i18nString22(UIStrings23.overrideSourceMappedFileWarning, { PH1: deployedName }), void 0, { jslogContext: "override-source-mapped-file-warning" });
    if (shouldJumpToDeployedFile) {
      Host11.userMetrics.actionTaken(Host11.UserMetrics.Action.OverrideContentContextMenuRedirectToDeployed);
      await this.handleOverrideContent(deployedUiSourceCode, deployedUiSourceCode);
    }
  }
  getDeployedUiSourceCode(uiSourceCode) {
    const debuggerWorkspaceBinding = Bindings10.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance();
    for (const deployedScript of debuggerWorkspaceBinding.scriptsForUISourceCode(uiSourceCode)) {
      const deployedUiSourceCode2 = debuggerWorkspaceBinding.uiSourceCodeForScript(deployedScript);
      if (deployedUiSourceCode2) {
        return deployedUiSourceCode2;
      }
    }
    const [deployedStylesUrl] = Bindings10.SASSSourceMapping.SASSSourceMapping.uiSourceOrigin(uiSourceCode);
    if (!deployedStylesUrl) {
      return null;
    }
    const deployedUiSourceCode = Workspace26.Workspace.WorkspaceImpl.instance().uiSourceCodeForURL(deployedStylesUrl) || Workspace26.Workspace.WorkspaceImpl.instance().uiSourceCodeForURL(Common16.ParsedURL.ParsedURL.urlWithoutHash(deployedStylesUrl));
    return deployedUiSourceCode;
  }
};
function getScript(contentProvider) {
  if (!(contentProvider instanceof Workspace26.UISourceCode.UISourceCode)) {
    return null;
  }
  const target = Bindings10.NetworkProject.NetworkProject.targetForUISourceCode(contentProvider);
  const model = target?.model(SDK13.DebuggerModel.DebuggerModel);
  if (model) {
    const resourceFile = Bindings10.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().scriptFile(contentProvider, model);
    if (resourceFile?.script) {
      return resourceFile.script;
    }
  }
  return Bindings10.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().scriptsForUISourceCode(contentProvider)[0] ?? null;
}

// gen/front_end/panels/sources/ScopeChainSidebarPane.js
var ScopeChainSidebarPane_exports = {};
__export(ScopeChainSidebarPane_exports, {
  ScopeChainSidebarPane: () => ScopeChainSidebarPane
});
import * as i18n49 from "./../../core/i18n/i18n.js";
import * as SDK14 from "./../../core/sdk/sdk.js";
import * as SourceMapScopes3 from "./../../models/source_map_scopes/source_map_scopes.js";
import * as ObjectUI3 from "./../../ui/legacy/components/object_ui/object_ui.js";
import * as Components3 from "./../../ui/legacy/components/utils/utils.js";
import * as UI25 from "./../../ui/legacy/legacy.js";
import * as VisualLogging13 from "./../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/sources/scopeChainSidebarPane.css.js
var scopeChainSidebarPane_css_default = `/*
 * Copyright 2017 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.scope-chain-sidebar-pane-section-header {
  flex: auto;
}

.scope-chain-sidebar-pane-section-icon {
  float: left;
  margin-right: 5px;
}

.scope-chain-sidebar-pane-section-subtitle {
  float: right;
  margin-left: 5px;
  max-width: 55%;
  text-overflow: ellipsis;
  overflow: hidden;
}

.scope-chain-sidebar-pane-section-title {
  font-weight: normal;
  overflow-wrap: break-word;
  white-space: normal;
}

.scope-chain-sidebar-pane-section {
  padding: 2px 4px;
  flex: none;
}

/*# sourceURL=${import.meta.resolve("./scopeChainSidebarPane.css")} */`;

// gen/front_end/panels/sources/ScopeChainSidebarPane.js
var UIStrings24 = {
  /**
   * @description Loading indicator in Scope Sidebar Pane of the Sources panel
   */
  loading: "Loading\u2026",
  /**
   * @description Not paused message element text content in Call Stack Sidebar Pane of the Sources panel
   */
  notPaused: "Not paused",
  /**
   * @description Empty placeholder in Scope Chain Sidebar Pane of the Sources panel
   */
  noVariables: "No variables",
  /**
   * @description Text in the Sources panel Scope pane describing a closure scope.
   * @example {func} PH1
   */
  closureS: "Closure ({PH1})",
  /**
   * @description Text that refers to closure as a programming term
   */
  closure: "Closure"
};
var str_24 = i18n49.i18n.registerUIStrings("panels/sources/ScopeChainSidebarPane.ts", UIStrings24);
var i18nString23 = i18n49.i18n.getLocalizedString.bind(void 0, str_24);
var scopeChainSidebarPaneInstance;
var ScopeChainSidebarPane = class _ScopeChainSidebarPane extends UI25.Widget.VBox {
  treeOutline;
  expandController;
  linkifier;
  infoElement;
  #scopeChainModel = null;
  constructor() {
    super({
      jslog: `${VisualLogging13.section("sources.scope-chain")}`,
      useShadowDom: true
    });
    this.registerRequiredCSS(scopeChainSidebarPane_css_default);
    this.treeOutline = new ObjectUI3.ObjectPropertiesSection.ObjectPropertiesSectionsTreeOutline();
    this.treeOutline.registerRequiredCSS(scopeChainSidebarPane_css_default);
    this.treeOutline.setHideOverflow(true);
    this.treeOutline.setShowSelectionOnKeyboardFocus(
      /* show */
      true
    );
    this.expandController = new ObjectUI3.ObjectPropertiesSection.ObjectPropertiesSectionsTreeExpandController(this.treeOutline);
    this.linkifier = new Components3.Linkifier.Linkifier();
    this.infoElement = document.createElement("div");
    this.infoElement.className = "gray-info-message";
    this.infoElement.tabIndex = -1;
    this.flavorChanged(UI25.Context.Context.instance().flavor(SDK14.DebuggerModel.CallFrame));
  }
  static instance() {
    if (!scopeChainSidebarPaneInstance) {
      scopeChainSidebarPaneInstance = new _ScopeChainSidebarPane();
    }
    return scopeChainSidebarPaneInstance;
  }
  flavorChanged(callFrame) {
    this.#scopeChainModel?.dispose();
    this.#scopeChainModel = null;
    this.linkifier.reset();
    this.contentElement.removeChildren();
    this.contentElement.appendChild(this.infoElement);
    if (callFrame) {
      this.infoElement.textContent = i18nString23(UIStrings24.loading);
      this.#scopeChainModel = new SourceMapScopes3.ScopeChainModel.ScopeChainModel(callFrame);
      this.#scopeChainModel.addEventListener("ScopeChainUpdated", (event) => this.buildScopeTreeOutline(event.data), this);
    } else {
      this.infoElement.textContent = i18nString23(UIStrings24.notPaused);
    }
  }
  focus() {
    if (this.hasFocus()) {
      return;
    }
    if (UI25.Context.Context.instance().flavor(SDK14.DebuggerModel.DebuggerPausedDetails)) {
      this.treeOutline.forceSelect();
    }
  }
  buildScopeTreeOutline(eventScopeChain) {
    const { scopeChain } = eventScopeChain;
    this.treeOutline.removeChildren();
    this.contentElement.removeChildren();
    this.contentElement.appendChild(this.treeOutline.element);
    let foundLocalScope = false;
    for (const [i, scope] of scopeChain.entries()) {
      if (scope.type() === "local") {
        foundLocalScope = true;
      }
      const section6 = this.createScopeSectionTreeElement(scope);
      if (scope.type() === "global") {
        section6.collapse();
      } else if (!foundLocalScope || scope.type() === "local") {
        section6.expand();
      }
      this.treeOutline.appendChild(section6);
      if (i === 0) {
        section6.select(
          /* omitFocus */
          true
        );
      }
    }
    this.sidebarPaneUpdatedForTest();
  }
  createScopeSectionTreeElement(scope) {
    let emptyPlaceholder = null;
    if (scope.type() === "local" || scope.type() === "closure") {
      emptyPlaceholder = i18nString23(UIStrings24.noVariables);
    }
    let title = scope.typeName();
    if (scope.type() === "closure") {
      const scopeName = scope.name();
      if (scopeName) {
        title = i18nString23(UIStrings24.closureS, { PH1: UI25.UIUtils.beautifyFunctionName(scopeName) });
      } else {
        title = i18nString23(UIStrings24.closure);
      }
    }
    let subtitle = scope.description();
    if (!title || title === subtitle) {
      subtitle = null;
    }
    const icon = scope.icon();
    const titleElement = document.createElement("div");
    titleElement.classList.add("scope-chain-sidebar-pane-section-header");
    titleElement.classList.add("tree-element-title");
    if (icon) {
      const iconElement = document.createElement("img");
      iconElement.classList.add("scope-chain-sidebar-pane-section-icon");
      iconElement.src = icon;
      titleElement.appendChild(iconElement);
    }
    titleElement.createChild("div", "scope-chain-sidebar-pane-section-subtitle").textContent = subtitle;
    titleElement.createChild("div", "scope-chain-sidebar-pane-section-title").textContent = title;
    const root = new ObjectUI3.ObjectPropertiesSection.ObjectTree(
      scope.object(),
      0
      /* ObjectUI.ObjectPropertiesSection.ObjectPropertiesMode.ALL */
    );
    root.addExtraProperties(...scope.extraProperties());
    const section6 = new ObjectUI3.ObjectPropertiesSection.RootElement(root, this.linkifier, emptyPlaceholder);
    section6.title = titleElement;
    section6.listItemElement.classList.add("scope-chain-sidebar-pane-section");
    section6.listItemElement.setAttribute("aria-label", title);
    this.expandController.watchSection(title + (subtitle ? ":" + subtitle : ""), section6);
    return section6;
  }
  sidebarPaneUpdatedForTest() {
  }
};

// gen/front_end/panels/sources/SourcesNavigator.js
var SourcesNavigator_exports = {};
__export(SourcesNavigator_exports, {
  ActionDelegate: () => ActionDelegate5,
  ContentScriptsNavigatorView: () => ContentScriptsNavigatorView,
  FilesNavigatorView: () => FilesNavigatorView,
  NetworkNavigatorView: () => NetworkNavigatorView,
  OverridesNavigatorView: () => OverridesNavigatorView,
  SnippetsNavigatorView: () => SnippetsNavigatorView
});
import "./../../ui/legacy/legacy.js";
import * as Common17 from "./../../core/common/common.js";
import * as Host12 from "./../../core/host/host.js";
import * as i18n51 from "./../../core/i18n/i18n.js";
import * as Platform15 from "./../../core/platform/platform.js";
import * as SDK15 from "./../../core/sdk/sdk.js";
import * as Bindings11 from "./../../models/bindings/bindings.js";
import * as Persistence18 from "./../../models/persistence/persistence.js";
import * as TextUtils13 from "./../../models/text_utils/text_utils.js";
import * as Workspace28 from "./../../models/workspace/workspace.js";
import * as uiI18n4 from "./../../ui/i18n/i18n.js";
import * as UI26 from "./../../ui/legacy/legacy.js";
import * as Snippets5 from "./../snippets/snippets.js";

// gen/front_end/panels/sources/sourcesNavigator.css.js
var sourcesNavigator_css_default = `/*
 * Copyright 2022 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.border-container {
  border-bottom: 1px solid var(--sys-color-divider);
  flex-shrink: 0;
}

.automatic-workspace-infobar {
  border-top: var(--sys-size-1) solid var(--sys-color-divider);
}

.automatic-file-system-nudge {
  flex-shrink: 0;
  font-style: italic;
  border-bottom: var(--sys-size-1) solid var(--sys-color-divider);
  padding: var(--sys-size-3);
  text-align: center;
  color: var(--sys-color-on-surface-subtle);
}

/*# sourceURL=${import.meta.resolve("./sourcesNavigator.css")} */`;

// gen/front_end/panels/sources/SourcesNavigator.js
var UIStrings25 = {
  /**
   * @description Text to show if no workspaces are set up. https://goo.gle/devtools-workspace
   */
  noWorkspace: "No workspaces set up",
  /**
   * @description Text to explain the Workspace feature in the Sources panel. https://goo.gle/devtools-workspace
   */
  explainWorkspace: "Set up workspaces to sync edits directly to the sources you develop.",
  /**
   * @description Text to show if no local overrides are set up. https://goo.gle/devtools-overrides
   */
  noLocalOverrides: "No local overrides set up",
  /**
   * @description Text to explain the Local Overrides feature. https://goo.gle/devtools-overrides
   */
  explainLocalOverrides: "Override network requests and web content locally to mock remote resources.",
  /**
   * @description Tooltip text that appears when hovering over the largeicon clear button in the Sources Navigator of the Sources panel
   */
  clearConfiguration: "Clear configuration",
  /**
   * @description Text in Sources Navigator of the Sources panel
   */
  selectFolderForOverrides: "Select folder for overrides",
  /**
   * @description Text to show if no content scripts can be found in the Sources panel. https://developer.chrome.com/extensions/content_scripts
   */
  noContentScripts: "No content scripts detected",
  /**
   * @description Text to explain the content scripts pane in the Sources panel
   */
  explainContentScripts: "View content scripts served by extensions.",
  /**
   * @description Text to show if no snippets were created and saved in the Sources panel https://goo.gle/devtools-snippets
   */
  noSnippets: "No snippets saved",
  /**
   * @description Text to explain the Snippets feature in the Sources panel https://goo.gle/devtools-snippets
   */
  explainSnippets: "Save the JavaScript code you run often in a snippet to run it again anytime.",
  /**
   * @description Text in Sources Navigator of the Sources panel
   */
  newSnippet: "New snippet",
  /**
   * @description Title of an action in the sources tool to create snippet
   */
  createNewSnippet: "Create new snippet",
  /**
   * @description A context menu item in the Sources Navigator of the Sources panel
   */
  run: "Run",
  /**
   * @description A context menu item in the Navigator View of the Sources panel
   */
  rename: "Rename\u2026",
  /**
   * @description Label for an item to remove something
   */
  remove: "Remove",
  /**
   * @description Text to save content as a specific file type
   */
  saveAs: "Save as\u2026",
  /**
   * @description An error message logged to the Console panel when the user uses
   *              the "Save as…" context menu in the Sources panel and the operation
   *              fails.
   */
  saveAsFailed: "Failed to save file to disk.",
  /**
   * @description Message shown in the Workspace tab of the Sources panel to nudge
   *              developers into utilizing the Automatic Workspace Folders feature
   *              in Chrome DevTools by setting up a `com.chrome.devtools.json`
   *              file / endpoint in their project. This nudge is only shown when
   *              the feature is enabled and there's no automatic workspace folder
   *              detected.
   * @example {com.chrome.devtools.json} PH1
   */
  automaticWorkspaceNudge: "Use {PH1} to automatically connect your project folder"
};
var str_25 = i18n51.i18n.registerUIStrings("panels/sources/SourcesNavigator.ts", UIStrings25);
var i18nString24 = i18n51.i18n.getLocalizedString.bind(void 0, str_25);
var networkNavigatorViewInstance;
var NetworkNavigatorView = class _NetworkNavigatorView extends NavigatorView {
  constructor() {
    super("navigator-network", true);
    this.registerRequiredCSS(sourcesNavigator_css_default);
    SDK15.TargetManager.TargetManager.instance().addEventListener("InspectedURLChanged", this.inspectedURLChanged, this);
    Host12.userMetrics.panelLoaded("sources", "DevTools.Launch.Sources");
    SDK15.TargetManager.TargetManager.instance().addScopeChangeListener(this.onScopeChange.bind(this));
  }
  static instance(opts = { forceNew: null }) {
    const { forceNew } = opts;
    if (!networkNavigatorViewInstance || forceNew) {
      networkNavigatorViewInstance = new _NetworkNavigatorView();
    }
    return networkNavigatorViewInstance;
  }
  acceptProject(project) {
    return project.type() === Workspace28.Workspace.projectTypes.Network && SDK15.TargetManager.TargetManager.instance().isInScope(Bindings11.NetworkProject.NetworkProject.getTargetForProject(project));
  }
  onScopeChange() {
    for (const project of Workspace28.Workspace.WorkspaceImpl.instance().projects()) {
      if (!this.acceptProject(project)) {
        this.removeProject(project);
      } else {
        this.tryAddProject(project);
      }
    }
  }
  inspectedURLChanged(event) {
    const mainTarget = SDK15.TargetManager.TargetManager.instance().scopeTarget();
    if (event.data !== mainTarget) {
      return;
    }
    const inspectedURL = mainTarget?.inspectedURL();
    if (!inspectedURL) {
      return;
    }
    for (const uiSourceCode of this.workspace().uiSourceCodes()) {
      if (this.acceptProject(uiSourceCode.project()) && uiSourceCode.url() === inspectedURL) {
        this.revealUISourceCode(uiSourceCode, true);
      }
    }
  }
  uiSourceCodeAdded(uiSourceCode) {
    const mainTarget = SDK15.TargetManager.TargetManager.instance().scopeTarget();
    const inspectedURL = mainTarget?.inspectedURL();
    if (!inspectedURL) {
      return;
    }
    if (uiSourceCode.url() === inspectedURL) {
      this.revealUISourceCode(uiSourceCode, true);
    }
  }
};
var FilesNavigatorView = class extends NavigatorView {
  #automaticFileSystemManager = Persistence18.AutomaticFileSystemManager.AutomaticFileSystemManager.instance();
  #eventListeners = [];
  #automaticFileSystemNudge;
  constructor() {
    super("navigator-files");
    this.registerRequiredCSS(sourcesNavigator_css_default);
    const placeholder2 = new UI26.EmptyWidget.EmptyWidget(i18nString24(UIStrings25.noWorkspace), i18nString24(UIStrings25.explainWorkspace));
    this.setPlaceholder(placeholder2);
    placeholder2.link = "https://developer.chrome.com/docs/devtools/workspaces/";
    const link2 = UI26.XLink.XLink.create("https://goo.gle/devtools-automatic-workspace-folders", "com.chrome.devtools.json");
    this.#automaticFileSystemNudge = uiI18n4.getFormatLocalizedString(str_25, UIStrings25.automaticWorkspaceNudge, { PH1: link2 });
    this.#automaticFileSystemNudge.classList.add("automatic-file-system-nudge");
    this.contentElement.insertBefore(this.#automaticFileSystemNudge, this.contentElement.firstChild);
    const toolbar4 = document.createElement("devtools-toolbar");
    toolbar4.classList.add("navigator-toolbar");
    void toolbar4.appendItemsAtLocation("files-navigator-toolbar").then(() => {
      if (!toolbar4.empty()) {
        this.contentElement.insertBefore(toolbar4, this.contentElement.firstChild);
      }
    });
  }
  wasShown() {
    super.wasShown();
    this.#eventListeners = [
      this.#automaticFileSystemManager.addEventListener("AutomaticFileSystemChanged", this.#automaticFileSystemChanged, this),
      this.#automaticFileSystemManager.addEventListener("AvailabilityChanged", this.#availabilityChanged, this)
    ];
    this.#automaticFileSystemChanged({ data: this.#automaticFileSystemManager.automaticFileSystem });
  }
  willHide() {
    Common17.EventTarget.removeEventListeners(this.#eventListeners);
    this.#automaticFileSystemChanged({ data: null });
    super.willHide();
  }
  sourceSelected(uiSourceCode, focusSource) {
    Host12.userMetrics.actionTaken(Host12.UserMetrics.Action.WorkspaceSourceSelected);
    super.sourceSelected(uiSourceCode, focusSource);
  }
  acceptProject(project) {
    if (project.type() === Workspace28.Workspace.projectTypes.ConnectableFileSystem) {
      return true;
    }
    return project.type() === Workspace28.Workspace.projectTypes.FileSystem && Persistence18.FileSystemWorkspaceBinding.FileSystemWorkspaceBinding.fileSystemType(project) !== "overrides" && !Snippets5.ScriptSnippetFileSystem.isSnippetsProject(project);
  }
  handleContextMenu(event) {
    const contextMenu = new UI26.ContextMenu.ContextMenu(event);
    contextMenu.defaultSection().appendAction("sources.add-folder-to-workspace", void 0, true);
    void contextMenu.show();
  }
  #automaticFileSystemChanged(_event) {
    this.#availabilityChanged({ data: this.#automaticFileSystemManager.availability });
  }
  #availabilityChanged(event) {
    const availability = event.data;
    const { automaticFileSystem } = this.#automaticFileSystemManager;
    this.#automaticFileSystemNudge.hidden = automaticFileSystem !== null || availability !== "available";
  }
};
var overridesNavigatorViewInstance;
var OverridesNavigatorView = class _OverridesNavigatorView extends NavigatorView {
  toolbar;
  constructor() {
    super("navigator-overrides");
    const placeholder2 = new UI26.EmptyWidget.EmptyWidget(i18nString24(UIStrings25.noLocalOverrides), i18nString24(UIStrings25.explainLocalOverrides));
    this.setPlaceholder(placeholder2);
    placeholder2.link = "https://developer.chrome.com/docs/devtools/overrides/";
    this.toolbar = document.createElement("devtools-toolbar");
    this.toolbar.classList.add("navigator-toolbar");
    this.contentElement.insertBefore(this.toolbar, this.contentElement.firstChild);
    Persistence18.NetworkPersistenceManager.NetworkPersistenceManager.instance().addEventListener("ProjectChanged", this.updateProjectAndUI, this);
    this.workspace().addEventListener(Workspace28.Workspace.Events.ProjectAdded, this.onProjectAddOrRemoved, this);
    this.workspace().addEventListener(Workspace28.Workspace.Events.ProjectRemoved, this.onProjectAddOrRemoved, this);
    this.updateProjectAndUI();
  }
  static instance(opts = { forceNew: null }) {
    const { forceNew } = opts;
    if (!overridesNavigatorViewInstance || forceNew) {
      overridesNavigatorViewInstance = new _OverridesNavigatorView();
    }
    return overridesNavigatorViewInstance;
  }
  onProjectAddOrRemoved(event) {
    const project = event.data;
    if (project && project.type() === Workspace28.Workspace.projectTypes.FileSystem && Persistence18.FileSystemWorkspaceBinding.FileSystemWorkspaceBinding.fileSystemType(project) !== "overrides") {
      return;
    }
    this.updateUI();
  }
  updateProjectAndUI() {
    this.reset();
    const project = Persistence18.NetworkPersistenceManager.NetworkPersistenceManager.instance().project();
    if (project) {
      this.tryAddProject(project);
    }
    this.updateUI();
  }
  updateUI() {
    this.toolbar.removeToolbarItems();
    const project = Persistence18.NetworkPersistenceManager.NetworkPersistenceManager.instance().project();
    if (project) {
      const enableCheckbox = new UI26.Toolbar.ToolbarSettingCheckbox(Common17.Settings.Settings.instance().moduleSetting("persistence-network-overrides-enabled"));
      this.toolbar.appendToolbarItem(enableCheckbox);
      this.toolbar.appendToolbarItem(new UI26.Toolbar.ToolbarSeparator(true));
      const clearButton = new UI26.Toolbar.ToolbarButton(i18nString24(UIStrings25.clearConfiguration), "clear");
      clearButton.addEventListener("Click", () => {
        Common17.Settings.Settings.instance().moduleSetting("persistence-network-overrides-enabled").set(false);
        project.remove();
      });
      this.toolbar.appendToolbarItem(clearButton);
      return;
    }
    const title = i18nString24(UIStrings25.selectFolderForOverrides);
    const setupButton = new UI26.Toolbar.ToolbarButton(title, "plus", title);
    setupButton.addEventListener("Click", (_event) => {
      void this.setupNewWorkspace();
    }, this);
    this.toolbar.appendToolbarItem(setupButton);
  }
  async setupNewWorkspace() {
    const fileSystem = await Persistence18.IsolatedFileSystemManager.IsolatedFileSystemManager.instance().addFileSystem("overrides");
    if (!fileSystem) {
      return;
    }
    Common17.Settings.Settings.instance().moduleSetting("persistence-network-overrides-enabled").set(true);
  }
  sourceSelected(uiSourceCode, focusSource) {
    Host12.userMetrics.actionTaken(Host12.UserMetrics.Action.OverridesSourceSelected);
    super.sourceSelected(uiSourceCode, focusSource);
  }
  acceptProject(project) {
    return project === Persistence18.NetworkPersistenceManager.NetworkPersistenceManager.instance().project();
  }
};
var ContentScriptsNavigatorView = class extends NavigatorView {
  constructor() {
    super("navigator-content-scripts");
    const placeholder2 = new UI26.EmptyWidget.EmptyWidget(i18nString24(UIStrings25.noContentScripts), i18nString24(UIStrings25.explainContentScripts));
    this.setPlaceholder(placeholder2);
    placeholder2.link = "https://developer.chrome.com/extensions/content_scripts";
  }
  acceptProject(project) {
    return project.type() === Workspace28.Workspace.projectTypes.ContentScripts;
  }
};
var SnippetsNavigatorView = class extends NavigatorView {
  constructor() {
    super("navigator-snippets");
    const placeholder2 = new UI26.EmptyWidget.EmptyWidget(i18nString24(UIStrings25.noSnippets), i18nString24(UIStrings25.explainSnippets));
    this.setPlaceholder(placeholder2);
    placeholder2.link = "https://developer.chrome.com/docs/devtools/javascript/snippets/";
    const toolbar4 = document.createElement("devtools-toolbar");
    toolbar4.classList.add("navigator-toolbar");
    const newButton = new UI26.Toolbar.ToolbarButton(i18nString24(UIStrings25.newSnippet), "plus", i18nString24(UIStrings25.newSnippet), "sources.new-snippet");
    newButton.addEventListener("Click", (_event) => {
      void this.create(Snippets5.ScriptSnippetFileSystem.findSnippetsProject(), "");
    });
    toolbar4.appendToolbarItem(newButton);
    this.contentElement.insertBefore(toolbar4, this.contentElement.firstChild);
  }
  acceptProject(project) {
    return Snippets5.ScriptSnippetFileSystem.isSnippetsProject(project);
  }
  handleContextMenu(event) {
    const contextMenu = new UI26.ContextMenu.ContextMenu(event);
    contextMenu.headerSection().appendItem(i18nString24(UIStrings25.createNewSnippet), () => this.create(Snippets5.ScriptSnippetFileSystem.findSnippetsProject(), ""), { jslogContext: "create-new-snippet" });
    void contextMenu.show();
  }
  handleFileContextMenu(event, node) {
    const uiSourceCode = node.uiSourceCode();
    const contextMenu = new UI26.ContextMenu.ContextMenu(event);
    contextMenu.headerSection().appendItem(i18nString24(UIStrings25.run), () => Snippets5.ScriptSnippetFileSystem.evaluateScriptSnippet(uiSourceCode), { jslogContext: "run" });
    contextMenu.editSection().appendItem(i18nString24(UIStrings25.rename), () => this.rename(node, false), { jslogContext: "rename" });
    contextMenu.editSection().appendItem(i18nString24(UIStrings25.remove), () => uiSourceCode.project().deleteFile(uiSourceCode), { jslogContext: "remove" });
    contextMenu.saveSection().appendItem(i18nString24(UIStrings25.saveAs), this.handleSaveAs.bind(this, uiSourceCode), { jslogContext: "save-as" });
    void contextMenu.show();
  }
  async handleSaveAs(uiSourceCode) {
    uiSourceCode.commitWorkingCopy();
    const contentData = await uiSourceCode.requestContentData();
    if (TextUtils13.ContentData.ContentData.isError(contentData)) {
      console.error(`Failed to retrieve content for ${uiSourceCode.url()}: ${contentData}`);
      Common17.Console.Console.instance().error(
        i18nString24(UIStrings25.saveAsFailed),
        /* show=*/
        false
      );
      return;
    }
    await Workspace28.FileManager.FileManager.instance().save(
      this.addJSExtension(uiSourceCode.url()),
      contentData,
      /* forceSaveAs=*/
      true
    );
    Workspace28.FileManager.FileManager.instance().close(uiSourceCode.url());
  }
  addJSExtension(url) {
    return Common17.ParsedURL.ParsedURL.concatenate(url, ".js");
  }
};
var ActionDelegate5 = class {
  handleAction(_context, actionId) {
    switch (actionId) {
      case "sources.create-snippet":
        void Snippets5.ScriptSnippetFileSystem.findSnippetsProject().createFile(Platform15.DevToolsPath.EmptyEncodedPathString, null, "").then((uiSourceCode) => Common17.Revealer.reveal(uiSourceCode));
        return true;
      case "sources.add-folder-to-workspace":
        void Persistence18.IsolatedFileSystemManager.IsolatedFileSystemManager.instance().addFileSystem();
        return true;
    }
    return false;
  }
};

// gen/front_end/panels/sources/WatchExpressionsSidebarPane.js
var WatchExpressionsSidebarPane_exports = {};
__export(WatchExpressionsSidebarPane_exports, {
  WatchExpression: () => WatchExpression,
  WatchExpressionsSidebarPane: () => WatchExpressionsSidebarPane
});
import * as Common18 from "./../../core/common/common.js";
import * as Host13 from "./../../core/host/host.js";
import * as i18n53 from "./../../core/i18n/i18n.js";
import * as Platform16 from "./../../core/platform/platform.js";
import * as SDK16 from "./../../core/sdk/sdk.js";
import * as Formatter3 from "./../../models/formatter/formatter.js";
import * as SourceMapScopes4 from "./../../models/source_map_scopes/source_map_scopes.js";
import * as Buttons4 from "./../../ui/components/buttons/buttons.js";
import * as ObjectUI4 from "./../../ui/legacy/components/object_ui/object_ui.js";

// gen/front_end/ui/legacy/components/object_ui/objectValue.css.js
var objectValue_css_default = `/*
 * Copyright 2015 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.value.object-value-node:hover {
  background-color: var(--sys-color-state-hover-on-subtle);
}

.object-value-function-prefix,
.object-value-boolean {
  color: var(--sys-color-token-attribute-value);
}

.object-value-function {
  font-style: italic;
}

.object-value-function.linkified:hover {
  --override-linkified-hover-background: rgb(0 0 0 / 10%);

  background-color: var(--override-linkified-hover-background);
  cursor: pointer;
}

.theme-with-dark-background .object-value-function.linkified:hover,
:host-context(.theme-with-dark-background) .object-value-function.linkified:hover {
  --override-linkified-hover-background: rgb(230 230 230 / 10%);
}

.object-value-number {
  color: var(--sys-color-token-attribute-value);
}

.object-value-bigint {
  color: var(--sys-color-token-comment);
}

.object-value-string,
.object-value-regexp,
.object-value-symbol {
  white-space: pre;
  unicode-bidi: -webkit-isolate;
  color: var(--sys-color-token-property-special);
}

.object-value-node {
  position: relative;
  vertical-align: baseline;
  color: var(--sys-color-token-variable);
  white-space: nowrap;
}

.object-value-null,
.object-value-undefined {
  color: var(--sys-color-state-disabled);
}

.object-value-unavailable {
  color: var(--sys-color-token-tag);
}

.object-value-calculate-value-button:hover {
  text-decoration: underline;
}

.object-properties-section-custom-section {
  display: inline-flex;
  flex-direction: column;
}

.theme-with-dark-background .object-value-number,
:host-context(.theme-with-dark-background) .object-value-number,
.theme-with-dark-background .object-value-boolean,
:host-context(.theme-with-dark-background) .object-value-boolean {
  --override-primitive-dark-mode-color: hsl(252deg 100% 75%);

  color: var(--override-primitive-dark-mode-color);
}

.object-properties-section .object-description {
  color: var(--sys-color-token-subtle);
}

.value .object-properties-preview {
  white-space: nowrap;
}

.name {
  color: var(--sys-color-token-tag);
  flex-shrink: 0;
}

.object-properties-preview .name {
  color: var(--sys-color-token-subtle);
}

@media (forced-colors: active) {
  .object-value-calculate-value-button:hover {
    forced-color-adjust: none;
    color: Highlight;
  }
}

/*# sourceURL=${import.meta.resolve("./objectValue.css")} */`;

// gen/front_end/panels/sources/WatchExpressionsSidebarPane.js
import * as Components4 from "./../../ui/legacy/components/utils/utils.js";
import * as UI27 from "./../../ui/legacy/legacy.js";
import * as VisualLogging14 from "./../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/sources/watchExpressionsSidebarPane.css.js
var watchExpressionsSidebarPane_css_default = `/*
 * Copyright 2017 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.watch-expression-delete-button {
  position: absolute;
  opacity: 0%;
  right: 0;
  background-color: var(--watch-expression-delete-button-background-color); /* stylelint-disable-line plugin/use_theme_colors */
  border-radius: var(--sys-shape-corner-full);

  .watch-expression-title:hover & {
    opacity: 100%;
  }

  .watch-expression-title:focus-within & {
    opacity: 100%;
  }
}

@container watch-expression (max-width: 31px) {
  .watch-expression-delete-button {
    visibility: hidden;
  }
}

:host-context(.theme-with-dark-background) .watch-expression-delete-button {
  /* This is a workaround due to a sprite with hardcoded color.
     It should no longer be necessary after we update icons. */
  filter: brightness(1.5);
}

.watch-expressions {
  min-height: 26px;
}

.watch-expression-title {
  white-space: nowrap;
  line-height: 20px;
  display: flex;
}

.watch-expression-title:hover,
.watch-expression-title:focus-within {
  padding-right: 26px;
}

.watch-expression-object-header .watch-expression-title {
  margin-left: 1px;
}

.watch-expression {
  position: relative;
  flex: auto;
  min-height: 20px;
}

.watch-expression .name {
  color: var(--sys-color-purple);
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
  flex-shrink: 1000000;
  min-width: 2em;
}

.watch-expression-error {
  color: var(--sys-color-error);
}

.watch-expressions-separator {
  flex-shrink: 0;
  flex-grow: 0;
}

.watch-expression .value {
  white-space: nowrap;
  display: inline;
  overflow: hidden;
  padding-left: 4px;
  text-overflow: ellipsis;
  flex-shrink: 1;
}

.watch-expression .text-prompt {
  text-overflow: clip;
  overflow: hidden;
  white-space: nowrap;
  padding-left: 4px;
  min-height: 18px;
  line-height: 18px;
  user-select: text;
}

.watch-expression-text-prompt-proxy {
  margin: 2px 12px 2px -4px;
  padding-bottom: 3px;
}

.watch-expression-header {
  flex: auto;
  margin-left: -16px;
  padding-left: 15px;
}

li.watch-expression-tree-item {
  container-type: inline-size;
  container-name: watch-expression;
  padding-left: 4px;

  --watch-expression-delete-button-background-color: var(--sys-color-cdt-base);
}

.theme-with-dark-background li.watch-expression-tree-item {
  --watch-expression-delete-button-background-color: var(--sys-color-cdt-base-container);
}

li.watch-expression-tree-item.selected {
  background: var(--sys-color-neutral-container);

  --watch-expression-delete-button-background-color: var(--sys-color-neutral-container);
}

li.watch-expression-tree-item.selected:focus,
li.watch-expression-tree-item.selected:focus-within:focus-visible,
.watch-expression-header:focus-visible {
  background: var(--sys-color-tonal-container);

  --watch-expression-delete-button-background-color: var(--sys-color-tonal-container);
}

li.watch-expression-editing::before {
  background-color: transparent;
}

@media (forced-colors: active) {
  .watch-expression-title:hover .watch-expression-delete-button,
  .watch-expressions .dimmed {
    opacity: 100%;
  }

  li.watch-expression-tree-item * {
    forced-color-adjust: none;
    color: ButtonText;
  }

  li.watch-expression-tree-item:hover {
    forced-color-adjust: none;
    background-color: Highlight;
  }

  li.watch-expression-tree-item:hover * {
    color: HighlightText;
  }

  li.watch-expression-tree-item:hover .watch-expression-delete-button {
    background-color: HighlightText;
  }
}

/*# sourceURL=${import.meta.resolve("./watchExpressionsSidebarPane.css")} */`;

// gen/front_end/panels/sources/WatchExpressionsSidebarPane.js
var UIStrings26 = {
  /**
   * @description A context menu item in the Watch Expressions Sidebar Pane of the Sources panel
   */
  addWatchExpression: "Add watch expression",
  /**
   * @description Tooltip/screen reader label of a button in the Sources panel that refreshes all watch expressions.
   */
  refreshWatchExpressions: "Refresh watch expressions",
  /**
   * @description Empty element text content in Watch Expressions Sidebar Pane of the Sources panel
   */
  noWatchExpressions: "No watch expressions",
  /**
   * @description A context menu item in the Watch Expressions Sidebar Pane of the Sources panel
   */
  deleteAllWatchExpressions: "Delete all watch expressions",
  /**
   * @description A context menu item in the Watch Expressions Sidebar Pane of the Sources panel
   */
  addPropertyPathToWatch: "Add property path to watch",
  /**
   * @description A context menu item in the Watch Expressions Sidebar Pane of the Sources panel
   */
  deleteWatchExpression: "Delete watch expression",
  /**
   * @description Value element text content in Watch Expressions Sidebar Pane of the Sources panel
   */
  notAvailable: "<not available>",
  /**
   * @description A context menu item in the Watch Expressions Sidebar Pane of the Sources panel and Network pane request.
   */
  copyValue: "Copy value",
  /**
   * @description announcement for when watch expression is deleted
   */
  watchExpressionDeleted: "Watch expression deleted"
};
var str_26 = i18n53.i18n.registerUIStrings("panels/sources/WatchExpressionsSidebarPane.ts", UIStrings26);
var i18nString25 = i18n53.i18n.getLocalizedString.bind(void 0, str_26);
var watchExpressionsSidebarPaneInstance;
var WatchExpressionsSidebarPane = class _WatchExpressionsSidebarPane extends UI27.Widget.VBox {
  watchExpressions;
  emptyElement;
  watchExpressionsSetting;
  addButton;
  refreshButton;
  treeOutline;
  expandController;
  linkifier;
  constructor() {
    super({ useShadowDom: true });
    this.registerRequiredCSS(watchExpressionsSidebarPane_css_default, objectValue_css_default);
    this.watchExpressions = [];
    this.watchExpressionsSetting = Common18.Settings.Settings.instance().createLocalSetting("watch-expressions", []);
    this.addButton = new UI27.Toolbar.ToolbarButton(i18nString25(UIStrings26.addWatchExpression), "plus", void 0, "add-watch-expression");
    this.addButton.setSize(
      "SMALL"
      /* Buttons.Button.Size.SMALL */
    );
    this.addButton.addEventListener("Click", (_event) => {
      void this.addButtonClicked();
    });
    this.refreshButton = new UI27.Toolbar.ToolbarButton(i18nString25(UIStrings26.refreshWatchExpressions), "refresh", void 0, "refresh-watch-expressions");
    this.refreshButton.setSize(
      "SMALL"
      /* Buttons.Button.Size.SMALL */
    );
    this.refreshButton.addEventListener("Click", this.requestUpdate, this);
    this.contentElement.classList.add("watch-expressions");
    this.contentElement.setAttribute("jslog", `${VisualLogging14.section("sources.watch")}`);
    this.contentElement.addEventListener("contextmenu", this.contextMenu.bind(this), false);
    this.treeOutline = new ObjectUI4.ObjectPropertiesSection.ObjectPropertiesSectionsTreeOutline();
    this.treeOutline.registerRequiredCSS(watchExpressionsSidebarPane_css_default);
    this.treeOutline.setHideOverflow(true);
    this.treeOutline.setShowSelectionOnKeyboardFocus(
      /* show */
      true
    );
    this.expandController = new ObjectUI4.ObjectPropertiesSection.ObjectPropertiesSectionsTreeExpandController(this.treeOutline);
    UI27.Context.Context.instance().addFlavorChangeListener(SDK16.RuntimeModel.ExecutionContext, this.requestUpdate, this);
    UI27.Context.Context.instance().addFlavorChangeListener(SDK16.DebuggerModel.CallFrame, this.requestUpdate, this);
    this.linkifier = new Components4.Linkifier.Linkifier();
    this.requestUpdate();
  }
  static instance() {
    if (!watchExpressionsSidebarPaneInstance) {
      watchExpressionsSidebarPaneInstance = new _WatchExpressionsSidebarPane();
    }
    return watchExpressionsSidebarPaneInstance;
  }
  toolbarItems() {
    return [this.addButton, this.refreshButton];
  }
  focus() {
    if (this.hasFocus()) {
      return;
    }
    if (this.watchExpressions.length > 0) {
      this.treeOutline.forceSelect();
    }
  }
  saveExpressions() {
    const toSave = [];
    for (let i = 0; i < this.watchExpressions.length; i++) {
      const expression = this.watchExpressions[i].expression();
      if (expression) {
        toSave.push(expression);
      }
    }
    this.watchExpressionsSetting.set(toSave);
  }
  async addButtonClicked() {
    await UI27.ViewManager.ViewManager.instance().showView("sources.watch");
    this.emptyElement.classList.add("hidden");
    this.createWatchExpression(null).startEditing();
  }
  async performUpdate() {
    this.linkifier.reset();
    this.contentElement.removeChildren();
    this.treeOutline.removeChildren();
    this.watchExpressions = [];
    this.emptyElement = this.contentElement.createChild("div", "gray-info-message");
    this.emptyElement.textContent = i18nString25(UIStrings26.noWatchExpressions);
    this.emptyElement.tabIndex = -1;
    const watchExpressionStrings = this.watchExpressionsSetting.get();
    if (watchExpressionStrings.length) {
      this.emptyElement.classList.add("hidden");
    }
    for (let i = 0; i < watchExpressionStrings.length; ++i) {
      const expression = watchExpressionStrings[i];
      if (!expression) {
        continue;
      }
      this.createWatchExpression(expression);
    }
  }
  createWatchExpression(expression) {
    this.contentElement.appendChild(this.treeOutline.element);
    const watchExpression = new WatchExpression(expression, this.expandController, this.linkifier);
    UI27.ARIAUtils.setLabel(this.contentElement, i18nString25(UIStrings26.addWatchExpression));
    watchExpression.addEventListener("ExpressionUpdated", this.watchExpressionUpdated, this);
    this.treeOutline.appendChild(watchExpression.treeElement());
    this.watchExpressions.push(watchExpression);
    return watchExpression;
  }
  watchExpressionUpdated({ data: watchExpression }) {
    if (!watchExpression.expression()) {
      Platform16.ArrayUtilities.removeElement(this.watchExpressions, watchExpression);
      this.treeOutline.removeChild(watchExpression.treeElement());
      this.emptyElement.classList.toggle("hidden", Boolean(this.watchExpressions.length));
      if (this.watchExpressions.length === 0) {
        this.treeOutline.element.remove();
      }
    }
    this.saveExpressions();
  }
  contextMenu(event) {
    const contextMenu = new UI27.ContextMenu.ContextMenu(event);
    this.populateContextMenu(contextMenu, event);
    void contextMenu.show();
  }
  populateContextMenu(contextMenu, event) {
    let isEditing = false;
    for (const watchExpression of this.watchExpressions) {
      isEditing = isEditing || watchExpression.isEditing();
    }
    if (!isEditing) {
      contextMenu.debugSection().appendItem(i18nString25(UIStrings26.addWatchExpression), this.addButtonClicked.bind(this), { jslogContext: "add-watch-expression" });
    }
    if (this.watchExpressions.length > 1) {
      contextMenu.debugSection().appendItem(i18nString25(UIStrings26.deleteAllWatchExpressions), this.deleteAllButtonClicked.bind(this), { jslogContext: "delete-all-watch-expressions" });
    }
    const treeElement = this.treeOutline.treeElementFromEvent(event);
    if (!treeElement) {
      return;
    }
    const currentWatchExpression = this.watchExpressions.find((watchExpression) => treeElement.hasAncestorOrSelf(watchExpression.treeElement()));
    if (currentWatchExpression) {
      currentWatchExpression.populateContextMenu(contextMenu, event);
    }
  }
  deleteAllButtonClicked() {
    this.watchExpressions = [];
    this.saveExpressions();
    this.requestUpdate();
  }
  async focusAndAddExpressionToWatch(expression) {
    await UI27.ViewManager.ViewManager.instance().showView("sources.watch");
    this.createWatchExpression(expression);
    this.saveExpressions();
    this.requestUpdate();
  }
  handleAction(_context, _actionId) {
    const frame = UI27.Context.Context.instance().flavor(UISourceCodeFrame);
    if (!frame) {
      return false;
    }
    const { state } = frame.textEditor;
    const text = state.sliceDoc(state.selection.main.from, state.selection.main.to);
    void this.focusAndAddExpressionToWatch(text);
    return true;
  }
  appendApplicableItems(_event, contextMenu, target) {
    if (target instanceof ObjectUI4.ObjectPropertiesSection.ObjectPropertyTreeElement) {
      if (!target.property.property.synthetic) {
        contextMenu.debugSection().appendItem(i18nString25(UIStrings26.addPropertyPathToWatch), () => this.focusAndAddExpressionToWatch(target.path()), { jslogContext: "add-property-path-to-watch" });
      }
      return;
    }
    if (target.textEditor.state.selection.main.empty) {
      return;
    }
    contextMenu.debugSection().appendAction("sources.add-to-watch");
  }
};
var WatchExpression = class _WatchExpression extends Common18.ObjectWrapper.ObjectWrapper {
  #treeElement;
  nameElement;
  valueElement;
  #expression;
  expandController;
  element;
  editing;
  linkifier;
  textPrompt;
  result;
  preventClickTimeout;
  constructor(expression, expandController, linkifier) {
    super();
    this.#expression = expression;
    this.expandController = expandController;
    this.element = document.createElement("div");
    this.element.classList.add("watch-expression");
    this.element.classList.add("monospace");
    this.editing = false;
    this.linkifier = linkifier;
    this.createWatchExpression();
    this.update();
  }
  treeElement() {
    return this.#treeElement;
  }
  expression() {
    return this.#expression;
  }
  async #evaluateExpression(executionContext, expression) {
    const callFrame = executionContext.debuggerModel.selectedCallFrame();
    if (callFrame?.script.isJavaScript()) {
      const nameMap = await SourceMapScopes4.NamesResolver.allVariablesInCallFrame(callFrame);
      try {
        expression = await Formatter3.FormatterWorkerPool.formatterWorkerPool().javaScriptSubstitute(expression, nameMap);
      } catch {
      }
    }
    return await executionContext.evaluate(
      {
        expression,
        objectGroup: _WatchExpression.watchObjectGroupId,
        includeCommandLineAPI: false,
        silent: true,
        returnByValue: false,
        generatePreview: false
      },
      /* userGesture */
      false,
      /* awaitPromise */
      false
    );
  }
  update() {
    const currentExecutionContext = UI27.Context.Context.instance().flavor(SDK16.RuntimeModel.ExecutionContext);
    if (currentExecutionContext && this.#expression) {
      void this.#evaluateExpression(currentExecutionContext, this.#expression).then((result) => {
        if ("object" in result) {
          this.createWatchExpression(result.object, result.exceptionDetails);
        } else {
          this.createWatchExpression();
        }
      });
    } else {
      this.createWatchExpression();
    }
  }
  startEditing() {
    this.editing = true;
    this.#treeElement.setDisableSelectFocus(true);
    this.element.removeChildren();
    const newDiv = this.element.createChild("div");
    newDiv.textContent = this.nameElement.textContent;
    this.textPrompt = new ObjectUI4.ObjectPropertiesSection.ObjectPropertyPrompt();
    this.textPrompt.renderAsBlock();
    const proxyElement = this.textPrompt.attachAndStartEditing(newDiv, this.finishEditing.bind(this));
    this.#treeElement.listItemElement.classList.add("watch-expression-editing");
    this.#treeElement.collapse();
    proxyElement.classList.add("watch-expression-text-prompt-proxy");
    proxyElement.addEventListener("keydown", this.promptKeyDown.bind(this), false);
    const selection = this.element.getComponentSelection();
    if (selection) {
      selection.selectAllChildren(newDiv);
    }
  }
  isEditing() {
    return Boolean(this.editing);
  }
  finishEditing(event, canceled) {
    if (event) {
      event.consume(canceled);
    }
    this.editing = false;
    this.#treeElement.setDisableSelectFocus(false);
    this.#treeElement.listItemElement.classList.remove("watch-expression-editing");
    if (this.textPrompt) {
      this.textPrompt.detach();
      const newExpression = canceled ? this.#expression : this.textPrompt.text();
      this.textPrompt = void 0;
      this.element.removeChildren();
      this.updateExpression(newExpression);
    }
  }
  dblClickOnWatchExpression(event) {
    event.consume();
    if (!this.isEditing()) {
      this.startEditing();
    }
  }
  updateExpression(newExpression) {
    if (this.#expression) {
      this.expandController.stopWatchSectionsWithId(this.#expression);
    }
    this.#expression = newExpression;
    this.update();
    this.dispatchEventToListeners("ExpressionUpdated", this);
  }
  deleteWatchExpression(event) {
    event.consume(true);
    UI27.ARIAUtils.LiveAnnouncer.alert(i18nString25(UIStrings26.watchExpressionDeleted));
    this.updateExpression(null);
  }
  createWatchExpression(result, exceptionDetails) {
    this.result = result || null;
    this.element.removeChildren();
    const oldTreeElement = this.#treeElement;
    this.createWatchExpressionTreeElement(result, exceptionDetails);
    if (oldTreeElement?.parent) {
      const root = oldTreeElement.parent;
      const index = root.indexOfChild(oldTreeElement);
      root.removeChild(oldTreeElement);
      root.insertChild(this.#treeElement, index);
    }
    this.#treeElement.select();
  }
  createWatchExpressionHeader(expressionValue, exceptionDetails) {
    const headerElement = this.element.createChild("div", "watch-expression-header");
    const deleteButton = new Buttons4.Button.Button();
    deleteButton.data = {
      variant: "icon",
      iconName: "bin",
      size: "SMALL",
      jslogContext: "delete-watch-expression"
    };
    deleteButton.className = "watch-expression-delete-button";
    UI27.Tooltip.Tooltip.install(deleteButton, i18nString25(UIStrings26.deleteWatchExpression));
    deleteButton.addEventListener("click", this.deleteWatchExpression.bind(this), false);
    deleteButton.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        this.deleteWatchExpression(event);
      }
    });
    const titleElement = headerElement.createChild("div", "watch-expression-title tree-element-title");
    titleElement.appendChild(deleteButton);
    this.nameElement = ObjectUI4.ObjectPropertiesSection.ObjectPropertiesSection.createNameElement(this.#expression);
    UI27.Tooltip.Tooltip.install(this.nameElement, this.#expression);
    if (Boolean(exceptionDetails) || !expressionValue) {
      this.valueElement = document.createElement("span");
      this.valueElement.classList.add("watch-expression-error");
      this.valueElement.classList.add("value");
      titleElement.classList.add("dimmed");
      this.valueElement.textContent = i18nString25(UIStrings26.notAvailable);
      if (exceptionDetails?.exception?.description !== void 0) {
        UI27.Tooltip.Tooltip.install(this.valueElement, exceptionDetails.exception.description);
      }
    } else {
      const propertyValue = ObjectUI4.ObjectPropertiesSection.ObjectPropertiesSection.createPropertyValueWithCustomSupport(expressionValue, Boolean(exceptionDetails), false, this.linkifier);
      this.valueElement = propertyValue;
    }
    const separatorElement = document.createElement("span");
    separatorElement.classList.add("watch-expressions-separator");
    separatorElement.textContent = ": ";
    titleElement.append(this.nameElement, separatorElement, this.valueElement);
    return headerElement;
  }
  createWatchExpressionTreeElement(expressionValue, exceptionDetails) {
    const headerElement = this.createWatchExpressionHeader(expressionValue, exceptionDetails);
    if (!exceptionDetails && expressionValue && expressionValue.hasChildren && !expressionValue.customPreview()) {
      headerElement.classList.add("watch-expression-object-header");
      this.#treeElement = new ObjectUI4.ObjectPropertiesSection.RootElement(new ObjectUI4.ObjectPropertiesSection.ObjectTree(expressionValue), this.linkifier);
      this.expandController.watchSection(this.#expression, this.#treeElement);
      this.#treeElement.toggleOnClick = false;
      this.#treeElement.listItemElement.addEventListener("click", this.onSectionClick.bind(this), false);
      this.#treeElement.listItemElement.addEventListener("dblclick", this.dblClickOnWatchExpression.bind(this));
    } else {
      headerElement.addEventListener("dblclick", this.dblClickOnWatchExpression.bind(this));
      this.#treeElement = new UI27.TreeOutline.TreeElement();
    }
    this.#treeElement.title = this.element;
    this.#treeElement.listItemElement.classList.add("watch-expression-tree-item");
    this.#treeElement.listItemElement.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !this.isEditing()) {
        this.startEditing();
        event.consume(true);
      } else if (event.key === "Delete" && !this.isEditing()) {
        this.deleteWatchExpression(event);
      }
    });
  }
  onSectionClick(event) {
    event.consume(true);
    const mouseEvent = event;
    if (mouseEvent.detail === 1) {
      this.preventClickTimeout = window.setTimeout(handleClick.bind(this), 333);
    } else if (this.preventClickTimeout !== void 0) {
      window.clearTimeout(this.preventClickTimeout);
      this.preventClickTimeout = void 0;
    }
    function handleClick() {
      if (!this.#treeElement) {
        return;
      }
      if (this.#treeElement.expanded) {
        this.#treeElement.collapse();
      } else if (!this.editing) {
        this.#treeElement.expand();
      }
    }
  }
  promptKeyDown(event) {
    const isEscapeKey = Platform16.KeyboardUtilities.isEscKey(event);
    if (event.key === "Enter" || isEscapeKey) {
      this.finishEditing(event, isEscapeKey);
    }
  }
  populateContextMenu(contextMenu, event) {
    if (!this.isEditing()) {
      contextMenu.editSection().appendItem(i18nString25(UIStrings26.deleteWatchExpression), this.updateExpression.bind(this, null), { jslogContext: "delete-watch-expression" });
    }
    if (!this.isEditing() && this.result && (this.result.type === "number" || this.result.type === "string")) {
      contextMenu.clipboardSection().appendItem(i18nString25(UIStrings26.copyValue), this.copyValueButtonClicked.bind(this), { jslogContext: "copy-watch-expression-value" });
    }
    const target = UI27.UIUtils.deepElementFromEvent(event);
    if (target && this.valueElement.isSelfOrAncestor(target) && this.result) {
      contextMenu.appendApplicableItems(this.result);
    }
  }
  copyValueButtonClicked() {
    Host13.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(this.valueElement.textContent);
  }
  static watchObjectGroupId = "watch-group";
};
export {
  AddSourceMapURLDialog_exports as AddSourceMapURLDialog,
  AiCodeCompletionPlugin_exports as AiCodeCompletionPlugin,
  AiWarningInfobarPlugin_exports as AiWarningInfobarPlugin,
  BreakpointEditDialog_exports as BreakpointEditDialog,
  BreakpointsView_exports as BreakpointsView,
  BreakpointsViewUtils_exports as BreakpointsViewUtils,
  CSSPlugin_exports as CSSPlugin,
  CallStackSidebarPane_exports as CallStackSidebarPane,
  CategorizedBreakpointL10n_exports as CategorizedBreakpointL10n,
  CoveragePlugin_exports as CoveragePlugin,
  DebuggerPausedMessage_exports as DebuggerPausedMessage,
  DebuggerPlugin_exports as DebuggerPlugin,
  EditingLocationHistoryManager_exports as EditingLocationHistoryManager,
  FilePathScoreFunction_exports as FilePathScoreFunction,
  FilteredUISourceCodeListProvider_exports as FilteredUISourceCodeListProvider,
  GoToLineQuickOpen_exports as GoToLineQuickOpen,
  InplaceFormatterEditorAction_exports as InplaceFormatterEditorAction,
  NavigatorView_exports as NavigatorView,
  OpenFileQuickOpen_exports as OpenFileQuickOpen,
  OutlineQuickOpen_exports as OutlineQuickOpen,
  PersistenceActions_exports as PersistenceActions,
  Plugin_exports as Plugin,
  ResourceOriginPlugin_exports as ResourceOriginPlugin,
  ScopeChainSidebarPane_exports as ScopeChainSidebarPane,
  SearchSourcesView_exports as SearchSourcesView,
  SnippetsPlugin_exports as SnippetsPlugin,
  SourcesNavigator_exports as SourcesNavigator,
  SourcesPanel_exports as SourcesPanel,
  SourcesSearchScope_exports as SourcesSearchScope,
  SourcesView_exports as SourcesView,
  TabbedEditorContainer_exports as TabbedEditorContainer,
  ThreadsSidebarPane_exports as ThreadsSidebarPane,
  UISourceCodeFrame_exports as UISourceCodeFrame,
  WatchExpressionsSidebarPane_exports as WatchExpressionsSidebarPane
};
//# sourceMappingURL=sources.js.map
