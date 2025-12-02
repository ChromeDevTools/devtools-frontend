// Copyright 2018 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

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

export interface PaneViewInput {
  pins: ConsolePin[];
  focusOut: () => void;
  onRemove: (pin: ConsolePin) => void;
  onContextMenu: (event: Event) => void;
}

export const DEFAULT_PANE_VIEW = (input: PaneViewInput, _output: object, target: HTMLElement): void => {
  // clang-format off
  render(html`
    <style>${consolePinPaneStyles}</style>
    <div class='console-pins monospace' jslog=${VisualLogging.pane('console-pins')} @contextmenu=${input.onContextMenu}>
    ${input.pins.map(pin => html`
        <devtools-widget .widgetConfig=${UI.Widget.widgetConfig(ConsolePinPresenter, {
          pin,
          focusOut: input.focusOut,
          onRemove: () => input.onRemove(pin),
        })}></devtools-widget>`
    )}
    </div>`, target);
  // clang-format on
};
export class ConsolePinPane extends UI.Widget.VBox {
  readonly #view: typeof DEFAULT_PANE_VIEW;
  /** When creating a new pin, we'll focus it after rendering the editor */
  #newPin?: ConsolePin;
  private pinModel: ConsolePinModel;

  constructor(
      private readonly liveExpressionButton: UI.Toolbar.ToolbarButton, private readonly focusOut: () => void,
      view = DEFAULT_PANE_VIEW) {
    super({useShadowDom: true});
    this.#view = view;

    this.pinModel = new ConsolePinModel(Common.Settings.Settings.instance());
  }

  override willHide(): void {
    super.willHide();
    this.pinModel.stopPeriodicEvaluate();
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
              i18nString(UIStrings.removeExpression), () => targetPin.pin ? this.removePin(targetPin.pin) : undefined,
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
    this.pinModel.removeAll();
    this.requestUpdate();
  }

  removePin(pin: ConsolePin): void {
    this.pinModel.remove(pin);
    this.requestUpdate();
  }

  addPin(expression: string, userGesture?: boolean): void {
    const pin = this.pinModel.add(expression);
    if (userGesture) {
      this.#newPin = pin;
    }
    this.requestUpdate();
  }

  override wasShown(): void {
    super.wasShown();
    this.pinModel.startPeriodicEvaluate();
    this.requestUpdate();
  }

  override performUpdate(): void {
    this.#view(
        {
          pins: [...this.pinModel.pins],
          focusOut: this.focusOut,
          onRemove: (pin: ConsolePin) => this.removePin(pin),
          onContextMenu: this.contextMenuEventFired.bind(this),
        },
        {}, this.contentElement);

    // Focus the freshly created pin if the user clicked the button.
    // We need to give it a tick though, so the child can also finish rendering.
    for (const child of this.children()) {
      if (child instanceof ConsolePinPresenter && child.pin === this.#newPin) {
        void child.updateComplete.then(() => child.focus());
      }
    }
    this.#newPin = undefined;
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
          tabindex=0
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
        <devtools-text-editor .state=${input.editorState} ${ref(editorRef)} tabindex=0
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
  #pin?: ConsolePin;
  #focusOut?: () => void;
  #onRemove?: () => void;

  private readonly view: typeof DEFAULT_VIEW;
  private readonly pinEditor: ConsolePinEditor;
  private editor?: TextEditor.TextEditor.TextEditor;
  private hovered = false;
  private lastNode: SDK.RemoteObject.RemoteObject|null = null;
  private deletePinIcon!: Buttons.Button.Button;

  constructor(element?: HTMLElement, view = DEFAULT_VIEW) {
    super(element);
    this.view = view;

    this.pinEditor = {
      workingCopy: () => this.editor?.state.doc.toString() ?? '',
      workingCopyWithHint: () => this.editor ? TextEditor.Config.contentIncludingHint(this.editor.editor) : '',
      isEditing: () => Boolean(this.editor?.editor.hasFocus),
    };
  }

  override wasShown(): void {
    super.wasShown();
    this.#pin?.addEventListener(ConsolePinEvent.EVALUATE_RESULT_READY, this.requestUpdate, this);
    this.requestUpdate();
  }

  override willHide(): void {
    super.willHide();
    this.#pin?.removeEventListener(ConsolePinEvent.EVALUATE_RESULT_READY, this.requestUpdate, this);
    this.setHovered(false);
  }

  set pin(pin: ConsolePin) {
    this.#pin?.removeEventListener(ConsolePinEvent.EVALUATE_RESULT_READY, this.requestUpdate, this);
    this.#pin = pin;
    this.#pin.setEditor(this.pinEditor);
    this.#pin.addEventListener(ConsolePinEvent.EVALUATE_RESULT_READY, this.requestUpdate, this);
    this.requestUpdate();
  }

  get pin(): ConsolePin|undefined {
    return this.#pin;
  }

  set focusOut(focusOut: () => void) {
    this.#focusOut = focusOut;
  }

  set onRemove(onRemove: () => void) {
    this.#onRemove = onRemove;
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
            view.dispatch({changes: {from: 0, to: view.state.doc.length, insert: this.#pin?.expression ?? ''}});
            this.#focusOut?.();
            return true;
          },
        },
        {
          key: 'Enter',
          run: () => {
            this.#focusOut?.();
            return true;
          },
        },
        {
          key: 'Mod-Enter',
          run: () => {
            this.#focusOut?.();
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
            view.dispatch({changes: {from: 0, to: view.state.doc.length, insert: this.#pin?.expression ?? ''}});
            this.#focusOut?.();
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
            view.dispatch({changes: {from: 0, to: view.state.doc.length, insert: this.#pin?.expression ?? ''}});
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
    if (!this.#pin) {
      return;
    }
    const commitedAsIs = this.#pin.commit();
    editor.dispatch({
      selection: {anchor: this.#pin.expression.length},
      changes: !commitedAsIs ? {from: 0, to: editor.state.doc.length, insert: this.#pin.expression} : undefined,
    });
    this.requestUpdate();
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

  override async focus(): Promise<void> {
    const editor = this.editor;
    if (editor) {
      editor.editor.focus();
      editor.dispatch({selection: {anchor: editor.state.doc.length}});
    }
  }

  appendToContextMenu(contextMenu: UI.ContextMenu.ContextMenu): void {
    if (!this.#pin) {
      return;
    }
    const {lastResult} = this.#pin;
    if (lastResult && !('error' in lastResult) && lastResult.object) {
      contextMenu.appendApplicableItems(lastResult.object);
      // Prevent result from being released automatically, since it may be used by
      // the context menu action. It will be released when the console is cleared,
      // where we release the 'live-expression' object group.
      this.#pin.skipReleaseLastResult();
    }
  }

  override performUpdate(): void {
    if (!this.#pin) {
      return;
    }

    const output: ViewOutput = {};
    this.view(
        {
          expression: this.#pin.expression,
          editorState: this.editor?.state ?? this.#createInitialEditorState(this.#pin.expression),
          result: this.#pin.lastResult,
          isEditing: this.pinEditor.isEditing(),
          onDelete: () => this.#onRemove?.(),
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

    const node = this.#pin.lastNode;
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

export class ConsolePinModel {
  readonly #setting: Common.Settings.Setting<string[]>;
  readonly #pins = new Set<ConsolePin>();

  readonly #throttler = new Common.Throttler.Throttler(250);
  #active = false;

  constructor(settings: Common.Settings.Settings) {
    this.#setting = settings.createLocalSetting('console-pins', []);
    for (const expression of this.#setting.get()) {
      this.add(expression);
    }
  }

  get pins(): ReadonlySet<ConsolePin> {
    return this.#pins;
  }

  add(expression: string): ConsolePin {
    const pin = new ConsolePin(expression, () => this.#save());
    this.#pins.add(pin);
    this.#save();
    return pin;
  }

  remove(pin: ConsolePin): void {
    this.#pins.delete(pin);
    this.#save();
  }

  removeAll(): void {
    this.#pins.clear();
    this.#save();
  }

  startPeriodicEvaluate(): void {
    this.#active = true;
    void this.#evaluateAllPins();
  }

  stopPeriodicEvaluate(): void {
    this.#active = false;
  }

  async #evaluateAllPins(): Promise<void> {
    if (!this.#active) {
      return;
    }

    const executionContext = UI.Context.Context.instance().flavor(SDK.RuntimeModel.ExecutionContext);
    if (executionContext) {
      await Promise.all(this.#pins.values().map(pin => pin.evaluate(executionContext)));
    }
    void this.#throttler.schedule(this.#evaluateAllPins.bind(this));
  }

  #save(): void {
    const expressions = this.#pins.values().map(pin => pin.expression).toArray();
    this.#setting.set(expressions);
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
export class ConsolePin extends Common.ObjectWrapper.ObjectWrapper<ConsolePinEvents> {
  #expression: string;
  readonly #onCommit: () => void;

  #editor?: ConsolePinEditor;

  // We track the last evaluation result for this pin so we can release the RemoteObject.
  #lastResult: SDK.RuntimeModel.EvaluationResult|null = null;
  #lastNode: SDK.RemoteObject.RemoteObject|null = null;
  #lastExecutionContext: SDK.RuntimeModel.ExecutionContext|null = null;
  #releaseLastResult = true;

  constructor(expression: string, onCommit: () => void) {
    super();
    this.#expression = expression;
    this.#onCommit = onCommit;
  }

  get expression(): string {
    return this.#expression;
  }

  get lastResult(): SDK.RuntimeModel.EvaluationResult|null {
    return this.#lastResult;
  }

  /** A short cut in case `lastResult` is a DOM node */
  get lastNode(): SDK.RemoteObject.RemoteObject|null {
    return this.#lastNode;
  }

  skipReleaseLastResult(): void {
    this.#releaseLastResult = false;
  }

  setEditor(editor: ConsolePinEditor): void {
    this.#editor = editor;
  }

  /**
   * Commit the current working copy from the editor.
   * @returns true, iff the working copy was commited as-is.
   */
  commit(): boolean {
    if (!this.#editor) {
      return false;
    }
    const text = this.#editor.workingCopy();
    const trimmedText = text.trim();
    this.#expression = trimmedText;
    this.#onCommit();
    return this.#expression === text;
  }

  /** Evaluates the current working copy of the pinned expression. If the result is a DOM node, we return that separately for convenience.  */
  async evaluate(executionContext: SDK.RuntimeModel.ExecutionContext): Promise<void> {
    const editorText = this.#editor?.workingCopyWithHint() ?? '';
    const throwOnSideEffect = Boolean(this.#editor?.isEditing()) && editorText !== this.#expression;
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
      this.#lastNode = result.object;
    } else {
      this.#lastNode = null;
    }

    this.dispatchEventToListeners(ConsolePinEvent.EVALUATE_RESULT_READY, this);
  }
}

export const enum ConsolePinEvent {
  EVALUATE_RESULT_READY = 'EVALUATE_RESULT_READY',
}

export interface ConsolePinEvents {
  [ConsolePinEvent.EVALUATE_RESULT_READY]: ConsolePin;
}
