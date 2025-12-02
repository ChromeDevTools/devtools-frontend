// Copyright 2018 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as CodeMirror from '../../third_party/codemirror.next/codemirror.next.js';
import {Directives, html, nothing, render} from '../../third_party/lit/lit.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as TextEditor from '../../ui/components/text_editor/text_editor.js';
import * as ObjectUI from '../../ui/legacy/components/object_ui/object_ui.js';
// eslint-disable-next-line @devtools/es-modules-import
import objectValueStyles from '../../ui/legacy/components/object_ui/objectValue.css.js';
import * as UI from '../../ui/legacy/legacy.js';
import type {LitTemplate} from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import consolePinPaneStyles from './consolePinPane.css.js';

const {createRef, ref} = Directives;

const UIStrings = {
  /**
   * @description A context menu item in the Console Pin Pane of the Console panel
   */
  removeExpression: 'Remove expression',
  /**
   * @description A context menu item in the Console Pin Pane of the Console panel
   */
  removeAllExpressions: 'Remove all expressions',
  /**
   * @description Screen reader label for delete button on a non-blank live expression
   * @example {document} PH1
   */
  removeExpressionS: 'Remove expression: {PH1}',
  /**
   * @description Screen reader label for delete button on a blank live expression
   */
  removeBlankExpression: 'Remove blank expression',
  /**
   * @description Text in Console Pin Pane of the Console panel
   */
  liveExpressionEditor: 'Live expression editor',
  /**
   * @description Text in Console Pin Pane of the Console panel
   */
  expression: 'Expression',
  /**
   * @description Side effect label title in Console Pin Pane of the Console panel
   */
  evaluateAllowingSideEffects: 'Evaluate, allowing side effects',
  /**
   * @description Text of a DOM element in Console Pin Pane of the Console panel
   */
  notAvailable: 'not available',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/console/ConsolePinPane.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class ConsolePinPane extends UI.Widget.VBox {
  private pins: Set<ConsolePinPresenter>;
  private readonly pinsSetting: Common.Settings.Setting<string[]>;
  private readonly throttler: Common.Throttler.Throttler;
  constructor(private readonly liveExpressionButton: UI.Toolbar.ToolbarButton, private readonly focusOut: () => void) {
    super({useShadowDom: true});
    this.throttler = new Common.Throttler.Throttler(250);
    this.registerRequiredCSS(consolePinPaneStyles, objectValueStyles);
    this.contentElement.classList.add('console-pins', 'monospace');
    this.contentElement.addEventListener('contextmenu', this.contextMenuEventFired.bind(this), false);
    this.contentElement.setAttribute('jslog', `${VisualLogging.pane('console-pins')}`);

    this.pins = new Set();
    this.pinsSetting = Common.Settings.Settings.instance().createLocalSetting('console-pins', []);
    for (const expression of this.pinsSetting.get()) {
      this.addPin(expression);
    }
  }

  override willHide(): void {
    super.willHide();
    for (const pin of this.pins) {
      pin.setHovered(false);
    }
  }

  savePins(): void {
    const toSave = Array.from(this.pins).map(pin => pin.expression());
    this.pinsSetting.set(toSave);
  }

  private contextMenuEventFired(event: Event): void {
    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    const target = UI.UIUtils.deepElementFromEvent(event);
    if (target) {
      const targetPinElement = target.enclosingNodeOrSelfWithClass('widget');
      if (targetPinElement) {
        const targetPin = UI.Widget.Widget.get(targetPinElement);
        if (targetPin instanceof ConsolePinPresenter) {
          contextMenu.editSection().appendItem(
              i18nString(UIStrings.removeExpression), this.removePin.bind(this, targetPin),
              {jslogContext: 'remove-expression'});
          targetPin.appendToContextMenu(contextMenu);
        }
      }
    }
    contextMenu.editSection().appendItem(
        i18nString(UIStrings.removeAllExpressions), this.removeAllPins.bind(this),
        {jslogContext: 'remove-all-expressions'});
    void contextMenu.show();
  }

  private removeAllPins(): void {
    for (const pin of this.pins) {
      this.removePin(pin);
    }
  }

  removePin(pin: ConsolePinPresenter): void {
    pin.detach();
    const newFocusedPin = this.focusedPinAfterDeletion(pin);
    this.pins.delete(pin);
    this.savePins();
    if (newFocusedPin) {
      void newFocusedPin.focus();
    } else {
      this.liveExpressionButton.focus();
    }
  }

  addPin(expression: string, userGesture?: boolean): void {
    const pin = new ConsolePinPresenter(expression, this, this.focusOut);
    pin.show(this.contentElement);
    this.pins.add(pin);
    this.savePins();
    if (userGesture) {
      void pin.performUpdate().then(() => void pin.focus());
    }
    this.requestUpdate();
  }

  private focusedPinAfterDeletion(deletedPin: ConsolePinPresenter): ConsolePinPresenter|null {
    const pinArray = Array.from(this.pins);
    for (let i = 0; i < pinArray.length; i++) {
      if (pinArray[i] === deletedPin) {
        if (pinArray.length === 1) {
          return null;
        }
        if (i === pinArray.length - 1) {
          return pinArray[i - 1];
        }
        return pinArray[i + 1];
      }
    }
    return null;
  }

  override wasShown(): void {
    super.wasShown();
    void this.throttler.schedule(this.requestUpdate.bind(this));
  }

  override async performUpdate(): Promise<void> {
    if (!this.pins.size || !this.isShowing()) {
      return;
    }
    const updatePromises = Array.from(this.pins, pin => pin.performUpdate());
    await Promise.all(updatePromises);
    this.updatedForTest();
    void this.throttler.schedule(this.requestUpdate.bind(this));
  }

  private updatedForTest(): void {
  }
}

export interface ViewInput {
  expression: string;
  editorState: CodeMirror.EditorState;
  result: SDK.RuntimeModel.EvaluationResult|null;
  isEditing: boolean;
  onDelete: () => void;
  onPreviewHoverChange: (hovered: boolean) => void;
  onPreviewClick: (event: MouseEvent) => void;
}

export interface ViewOutput {
  deletePinIcon?: Buttons.Button.Button;
  editor?: TextEditor.TextEditor.TextEditor;
}

export const DEFAULT_VIEW = (input: ViewInput, output: ViewOutput, target: HTMLElement): void => {
  const deleteIconLabel = input.expression ? i18nString(UIStrings.removeExpressionS, {PH1: input.expression}) :
                                             i18nString(UIStrings.removeBlankExpression);
  const deleteRef = createRef<Buttons.Button.Button>();
  const editorRef = createRef<TextEditor.TextEditor.TextEditor>();
  const isError = input.result && !('error' in input.result) && input.result?.exceptionDetails &&
      !SDK.RuntimeModel.RuntimeModel.isSideEffectFailure(input.result);
  // clang-format off
  render(html`
    <style>${consolePinPaneStyles}</style>
    <style>${objectValueStyles}</style>
    <div class='console-pin ${isError ? 'error-level' : ''}'>
      <devtools-button class='close-button'
          .iconName=${'cross'}
          .variant=${Buttons.Button.Variant.ICON}
          .size=${Buttons.Button.Size.MICRO}
          tabIndex=0
          aria-label=${deleteIconLabel}
          @click=${(event: MouseEvent) => {
            input.onDelete();
            event.consume(true);
          }}
          @keydown=${(event: KeyboardEvent) => {
            if (Platform.KeyboardUtilities.isEnterOrSpaceKey(event)) {
              input.onDelete();
              event.consume(true);
            }
          }}
          ${ref(deleteRef)}
      ></devtools-button>
      <div class='console-pin-name'
          title=${input.expression}
          jslog=${VisualLogging.textField().track({change: true})}
          @keydown=${(event: KeyboardEvent) => {
            // Prevent Esc from toggling the drawer.
            if (event.key === 'Escape') {
              event.consume();
            }
          }}
      >
        <devtools-text-editor .state=${input.editorState} ${ref(editorRef)}
        ></devtools-text-editor>
      </div>
      <div class='console-pin-preview'
          @mouseenter=${() => input.onPreviewHoverChange(true)}
          @mouseleave=${() => input.onPreviewHoverChange(false)}
          @click=${(event: MouseEvent) => input.onPreviewClick(event)}
      >
        ${renderResult(input.result, input.isEditing)}
      </div>
    </div>
    `, target);
  // clang-format on
  Object.assign(output, {
    deletePinIcon: deleteRef.value,
    editor: editorRef.value,
  });
};

// RemoteObjectPreviewFormatter is stateless, so we can just keep a global copy around.
const FORMATTER = new ObjectUI.RemoteObjectPreviewFormatter.RemoteObjectPreviewFormatter();

function renderResult(result: SDK.RuntimeModel.EvaluationResult|null, isEditing: boolean): LitTemplate {
  if (!result) {
    return nothing;
  }

  if (result && SDK.RuntimeModel.RuntimeModel.isSideEffectFailure(result)) {
    return html`<span class='object-value-calculate-value-button' title=${
        i18nString(UIStrings.evaluateAllowingSideEffects)}>(…)</span>`;
  }

  const renderedPreview = FORMATTER.renderEvaluationResultPreview(result, !isEditing);
  if (renderedPreview === nothing && !isEditing) {
    return html`${i18nString(UIStrings.notAvailable)}`;
  }
  return renderedPreview;
}

export class ConsolePinPresenter extends UI.Widget.Widget {
  private readonly view: typeof DEFAULT_VIEW;
  private readonly pin: ConsolePin;
  private readonly pinEditor: ConsolePinEditor;
  private editor?: TextEditor.TextEditor.TextEditor;
  private hovered = false;
  private lastNode: SDK.RemoteObject.RemoteObject|null = null;
  private deletePinIcon!: Buttons.Button.Button;

  constructor(
      expression: string, private readonly pinPane: ConsolePinPane, private readonly focusOut: () => void,
      view = DEFAULT_VIEW) {
    super();
    this.view = view;

    this.pinEditor = {
      workingCopy: () => this.editor?.state.doc.toString() ?? '',
      workingCopyWithHint: () => this.editor ? TextEditor.Config.contentIncludingHint(this.editor.editor) : '',
      isEditing: () => Boolean(this.editor?.editor.hasFocus),
    };
    this.pin = new ConsolePin(this.pinEditor, expression);
  }

  #createInitialEditorState(doc: string): CodeMirror.EditorState {
    const extensions = [
      CodeMirror.EditorView.contentAttributes.of({'aria-label': i18nString(UIStrings.liveExpressionEditor)}),
      CodeMirror.EditorView.lineWrapping,
      CodeMirror.javascript.javascriptLanguage,
      TextEditor.Config.showCompletionHint,
      CodeMirror.placeholder(i18nString(UIStrings.expression)),
      CodeMirror.keymap.of([
        {
          key: 'Escape',
          run: (view: CodeMirror.EditorView) => {
            view.dispatch({changes: {from: 0, to: view.state.doc.length, insert: this.pin.expression}});
            this.focusOut();
            return true;
          },
        },
        {
          key: 'Enter',
          run: () => {
            this.focusOut();
            return true;
          },
        },
        {
          key: 'Mod-Enter',
          run: () => {
            this.focusOut();
            return true;
          },
        },
        {
          key: 'Tab',
          run: (view: CodeMirror.EditorView) => {
            if (CodeMirror.completionStatus(view.state) !== null) {
              return false;
            }
            // User should be able to tab out of edit field after auto complete is done
            view.dispatch({changes: {from: 0, to: view.state.doc.length, insert: this.pin.expression}});
            this.focusOut();
            return true;
          },
        },
        {
          key: 'Shift-Tab',
          run: (view: CodeMirror.EditorView) => {
            if (CodeMirror.completionStatus(view.state) !== null) {
              return false;
            }
            // User should be able to tab out of edit field after auto complete is done
            view.dispatch({changes: {from: 0, to: view.state.doc.length, insert: this.pin.expression}});
            this.editor?.blur();
            this.deletePinIcon.focus();
            return true;
          },
        },
      ]),
      CodeMirror.EditorView.domEventHandlers({blur: (_e, view) => this.#onBlur(view)}),
      TextEditor.Config.baseConfiguration(doc),
      TextEditor.Config.closeBrackets.instance(),
      TextEditor.Config.autocompletion.instance(),
    ];
    if (Root.Runtime.Runtime.queryParam('noJavaScriptCompletion') !== 'true') {
      extensions.push(TextEditor.JavaScript.completion());
    }
    return CodeMirror.EditorState.create({doc, extensions});
  }

  #onBlur(editor: CodeMirror.EditorView): void {
    const commitedAsIs = this.pin.commit();
    this.pinPane.savePins();
    const newExpression = this.pin.expression;

    if (newExpression.length) {
      UI.ARIAUtils.setLabel(this.deletePinIcon, i18nString(UIStrings.removeExpressionS, {PH1: newExpression}));
    } else {
      UI.ARIAUtils.setLabel(this.deletePinIcon, i18nString(UIStrings.removeBlankExpression));
    }
    editor.dispatch({
      selection: {anchor: this.pin.expression.length},
      changes: !commitedAsIs ? {from: 0, to: editor.state.doc.length, insert: newExpression} : undefined,
    });
  }

  setHovered(hovered: boolean): void {
    if (this.hovered === hovered) {
      return;
    }
    this.hovered = hovered;
    if (!hovered && this.lastNode) {
      SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight();
    }
  }

  expression(): string {
    return this.pin.expression;
  }

  override async focus(): Promise<void> {
    const editor = this.editor;
    if (editor) {
      editor.editor.focus();
      editor.dispatch({selection: {anchor: editor.state.doc.length}});
    }
  }

  appendToContextMenu(contextMenu: UI.ContextMenu.ContextMenu): void {
    const {lastResult} = this.pin;
    if (lastResult && !('error' in lastResult) && lastResult.object) {
      contextMenu.appendApplicableItems(lastResult.object);
      // Prevent result from being released automatically, since it may be used by
      // the context menu action. It will be released when the console is cleared,
      // where we release the 'live-expression' object group.
      this.pin.skipReleaseLastResult();
    }
  }

  override async performUpdate(): Promise<void> {
    const executionContext = UI.Context.Context.instance().flavor(SDK.RuntimeModel.ExecutionContext);
    const {result, node} = executionContext ? await this.pin.evaluate(executionContext) : {result: null, node: null};

    const output: ViewOutput = {};
    this.view(
        {
          expression: this.pin.expression,
          editorState: this.editor?.state ?? this.#createInitialEditorState(this.pin.expression),
          result,
          isEditing: this.pinEditor.isEditing(),
          onDelete: () => this.pinPane.removePin(this),
          onPreviewHoverChange: hovered => this.setHovered(hovered),
          onPreviewClick: event => {
            if (this.lastNode) {
              void Common.Revealer.reveal(this.lastNode);
              event.consume();
            }
          },
        },
        output, this.contentElement);

    const {deletePinIcon, editor} = output;
    if (!deletePinIcon || !editor) {
      throw new Error('Broken view function, expected output');
    }
    this.deletePinIcon = deletePinIcon;
    this.editor = editor;

    if (this.hovered) {
      if (node) {
        SDK.OverlayModel.OverlayModel.highlightObjectAsDOMNode(node);
      } else if (this.lastNode) {
        SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight();
      }
    }
    this.lastNode = node || null;
  }
}

/**
 * Small helper interface to allow `ConsolePin` to retrieve the current working copy.
 */
interface ConsolePinEditor {
  workingCopy(): string;
  workingCopyWithHint(): string;
  isEditing(): boolean;
}

/**
 * A pinned console expression.
 */
export class ConsolePin {
  readonly #editor: ConsolePinEditor;
  #expression: string;

  // We track the last evaluation result for this pin so we can release the RemoteObject.
  #lastResult: SDK.RuntimeModel.EvaluationResult|null = null;
  #lastExecutionContext: SDK.RuntimeModel.ExecutionContext|null = null;
  #releaseLastResult = true;

  constructor(editor: ConsolePinEditor, expression: string) {
    this.#editor = editor;
    this.#expression = expression;
  }

  get expression(): string {
    return this.#expression;
  }

  get lastResult(): SDK.RuntimeModel.EvaluationResult|null {
    return this.#lastResult;
  }

  skipReleaseLastResult(): void {
    this.#releaseLastResult = false;
  }

  /**
   * Commit the current working copy from the editor.
   * @returns true, iff the working copy was commited as-is.
   */
  commit(): boolean {
    const text = this.#editor.workingCopy();
    const trimmedText = text.trim();
    this.#expression = trimmedText;
    return this.#expression === text;
  }

  /** Evaluates the current working copy of the pinned expression. If the result is a DOM node, we return that separately for convenience.  */
  async evaluate(executionContext: SDK.RuntimeModel.ExecutionContext):
      Promise<{result: SDK.RuntimeModel.EvaluationResult | null, node: SDK.RemoteObject.RemoteObject|null}> {
    const editorText = this.#editor.workingCopyWithHint();
    const throwOnSideEffect = this.#editor.isEditing() && editorText !== this.#expression;
    const timeout = throwOnSideEffect ? 250 : undefined;

    const result = await ObjectUI.JavaScriptREPL.JavaScriptREPL.evaluate(
        editorText, executionContext, throwOnSideEffect, /* replMode*/ true, timeout, 'live-expression',
        /* awaitPromise */ true, /* silent */ true);

    if (this.#lastResult && this.#releaseLastResult) {
      this.#lastExecutionContext?.runtimeModel.releaseEvaluationResult(this.#lastResult);
    }

    this.#lastResult = result;
    this.#lastExecutionContext = executionContext;
    this.#releaseLastResult = true;

    if (result && !('error' in result) && result.object.type === 'object' && result.object.subtype === 'node') {
      return {result, node: result.object};
    }
    return {result, node: null};
  }
}
