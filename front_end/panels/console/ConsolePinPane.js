// Copyright 2018 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as CodeMirror from '../../third_party/codemirror.next/codemirror.next.js';
import { Directives, html, nothing, render } from '../../third_party/lit/lit.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as TextEditor from '../../ui/components/text_editor/text_editor.js';
import * as ObjectUI from '../../ui/legacy/components/object_ui/object_ui.js';
// eslint-disable-next-line @devtools/es-modules-import
import objectValueStyles from '../../ui/legacy/components/object_ui/objectValue.css.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import consolePinPaneStyles from './consolePinPane.css.js';
const { createRef, ref } = Directives;
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
};
const str_ = i18n.i18n.registerUIStrings('panels/console/ConsolePinPane.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export const DEFAULT_PANE_VIEW = (input, _output, target) => {
    // clang-format off
    render(html `
    <style>${consolePinPaneStyles}</style>
    <div class='console-pins monospace' jslog=${VisualLogging.pane('console-pins')} @contextmenu=${input.onContextMenu}>
    ${input.pins.map(pin => html `
        <devtools-widget .widgetConfig=${UI.Widget.widgetConfig(ConsolePinPresenter, {
        pin,
        focusOut: input.focusOut,
        onRemove: () => input.onRemove(pin),
    })}></devtools-widget>`)}
    </div>`, target);
    // clang-format on
};
export class ConsolePinPane extends UI.Widget.VBox {
    #view;
    /** When creating a new pin, we'll focus it after rendering the editor */
    #newPin;
    #pinModel;
    #focusOut;
    constructor(focusOut, view = DEFAULT_PANE_VIEW) {
        super({ useShadowDom: true });
        this.#focusOut = focusOut;
        this.#view = view;
        this.#pinModel = new ConsolePinModel(Common.Settings.Settings.instance());
    }
    willHide() {
        super.willHide();
        this.#pinModel.stopPeriodicEvaluate();
    }
    contextMenuEventFired(event) {
        const contextMenu = new UI.ContextMenu.ContextMenu(event);
        const target = UI.UIUtils.deepElementFromEvent(event);
        if (target) {
            const targetPinElement = target.enclosingNodeOrSelfWithClass('widget');
            if (targetPinElement) {
                const targetPin = UI.Widget.Widget.get(targetPinElement);
                if (targetPin instanceof ConsolePinPresenter) {
                    contextMenu.editSection().appendItem(i18nString(UIStrings.removeExpression), () => targetPin.pin ? this.removePin(targetPin.pin) : undefined, { jslogContext: 'remove-expression' });
                    targetPin.appendToContextMenu(contextMenu);
                }
            }
        }
        contextMenu.editSection().appendItem(i18nString(UIStrings.removeAllExpressions), this.removeAllPins.bind(this), { jslogContext: 'remove-all-expressions' });
        void contextMenu.show();
    }
    removeAllPins() {
        this.#pinModel.removeAll();
        this.requestUpdate();
    }
    removePin(pin) {
        this.#pinModel.remove(pin);
        this.requestUpdate();
    }
    addPin(expression, userGesture) {
        const pin = this.#pinModel.add(expression);
        if (userGesture) {
            this.#newPin = pin;
        }
        this.requestUpdate();
    }
    wasShown() {
        super.wasShown();
        this.#pinModel.startPeriodicEvaluate();
        this.requestUpdate();
    }
    performUpdate() {
        this.#view({
            pins: [...this.#pinModel.pins],
            focusOut: this.#focusOut,
            onRemove: (pin) => this.removePin(pin),
            onContextMenu: this.contextMenuEventFired.bind(this),
        }, {}, this.contentElement);
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
export const DEFAULT_VIEW = (input, output, target) => {
    const deleteIconLabel = input.expression ? i18nString(UIStrings.removeExpressionS, { PH1: input.expression }) :
        i18nString(UIStrings.removeBlankExpression);
    const deleteRef = createRef();
    const editorRef = createRef();
    const isError = input.result && !('error' in input.result) && input.result?.exceptionDetails &&
        !SDK.RuntimeModel.RuntimeModel.isSideEffectFailure(input.result);
    // clang-format off
    render(html `
    <style>${consolePinPaneStyles}</style>
    <style>${objectValueStyles}</style>
    <div class='console-pin ${isError ? 'error-level' : ''}'>
      <devtools-button class='close-button'
          .iconName=${'cross'}
          .variant=${"icon" /* Buttons.Button.Variant.ICON */}
          .size=${"MICRO" /* Buttons.Button.Size.MICRO */}
          tabindex=0
          aria-label=${deleteIconLabel}
          @click=${(event) => {
        input.onDelete();
        event.consume(true);
    }}
          @keydown=${(event) => {
        if (Platform.KeyboardUtilities.isEnterOrSpaceKey(event)) {
            input.onDelete();
            event.consume(true);
        }
    }}
          ${ref(deleteRef)}
      ></devtools-button>
      <div class='console-pin-name'
          title=${input.expression}
          jslog=${VisualLogging.textField().track({ change: true })}
          @keydown=${(event) => {
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
          @click=${(event) => input.onPreviewClick(event)}
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
function renderResult(result, isEditing) {
    if (!result) {
        return nothing;
    }
    if (result && SDK.RuntimeModel.RuntimeModel.isSideEffectFailure(result)) {
        return html `<span class='object-value-calculate-value-button' title=${i18nString(UIStrings.evaluateAllowingSideEffects)}>(…)</span>`;
    }
    const renderedPreview = FORMATTER.renderEvaluationResultPreview(result, !isEditing);
    if (renderedPreview === nothing && !isEditing) {
        return html `${i18nString(UIStrings.notAvailable)}`;
    }
    return renderedPreview;
}
export class ConsolePinPresenter extends UI.Widget.Widget {
    #pin;
    #focusOut;
    #onRemove;
    #view;
    #pinEditor;
    #editor;
    #hovered = false;
    #lastNode = null;
    #deletePinIcon;
    constructor(element, view = DEFAULT_VIEW) {
        super(element);
        this.#view = view;
        this.#pinEditor = {
            workingCopy: () => this.#editor?.state.doc.toString() ?? '',
            workingCopyWithHint: () => this.#editor ? TextEditor.Config.contentIncludingHint(this.#editor.editor) : '',
            isEditing: () => Boolean(this.#editor?.editor.hasFocus),
        };
    }
    wasShown() {
        super.wasShown();
        this.#pin?.addEventListener("EVALUATE_RESULT_READY" /* ConsolePinEvent.EVALUATE_RESULT_READY */, this.requestUpdate, this);
        this.requestUpdate();
    }
    willHide() {
        super.willHide();
        this.#pin?.removeEventListener("EVALUATE_RESULT_READY" /* ConsolePinEvent.EVALUATE_RESULT_READY */, this.requestUpdate, this);
        this.setHovered(false);
    }
    set pin(pin) {
        this.#pin?.removeEventListener("EVALUATE_RESULT_READY" /* ConsolePinEvent.EVALUATE_RESULT_READY */, this.requestUpdate, this);
        this.#pin = pin;
        this.#pin.setEditor(this.#pinEditor);
        this.#pin.addEventListener("EVALUATE_RESULT_READY" /* ConsolePinEvent.EVALUATE_RESULT_READY */, this.requestUpdate, this);
        this.requestUpdate();
    }
    get pin() {
        return this.#pin;
    }
    set focusOut(focusOut) {
        this.#focusOut = focusOut;
    }
    set onRemove(onRemove) {
        this.#onRemove = onRemove;
    }
    #createInitialEditorState(doc) {
        const extensions = [
            CodeMirror.EditorView.contentAttributes.of({ 'aria-label': i18nString(UIStrings.liveExpressionEditor) }),
            CodeMirror.EditorView.lineWrapping,
            CodeMirror.javascript.javascriptLanguage,
            TextEditor.Config.showCompletionHint,
            CodeMirror.placeholder(i18nString(UIStrings.expression)),
            CodeMirror.keymap.of([
                {
                    key: 'Escape',
                    run: (view) => {
                        view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: this.#pin?.expression ?? '' } });
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
                    run: (view) => {
                        if (CodeMirror.completionStatus(view.state) !== null) {
                            return false;
                        }
                        // User should be able to tab out of edit field after auto complete is done
                        view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: this.#pin?.expression ?? '' } });
                        this.#focusOut?.();
                        return true;
                    },
                },
                {
                    key: 'Shift-Tab',
                    run: (view) => {
                        if (CodeMirror.completionStatus(view.state) !== null) {
                            return false;
                        }
                        // User should be able to tab out of edit field after auto complete is done
                        view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: this.#pin?.expression ?? '' } });
                        this.#editor?.blur();
                        this.#deletePinIcon.focus();
                        return true;
                    },
                },
            ]),
            CodeMirror.EditorView.domEventHandlers({ blur: (_e, view) => this.#onBlur(view) }),
            TextEditor.Config.baseConfiguration(doc),
            TextEditor.Config.closeBrackets.instance(),
            TextEditor.Config.autocompletion.instance(),
        ];
        if (Root.Runtime.Runtime.queryParam('noJavaScriptCompletion') !== 'true') {
            extensions.push(TextEditor.JavaScript.completion());
        }
        return CodeMirror.EditorState.create({ doc, extensions });
    }
    #onBlur(editor) {
        if (!this.#pin) {
            return;
        }
        const commitedAsIs = this.#pin.commit();
        editor.dispatch({
            selection: { anchor: this.#pin.expression.length },
            changes: !commitedAsIs ? { from: 0, to: editor.state.doc.length, insert: this.#pin.expression } : undefined,
        });
        this.requestUpdate();
    }
    setHovered(hovered) {
        if (this.#hovered === hovered) {
            return;
        }
        this.#hovered = hovered;
        if (!hovered && this.#lastNode) {
            SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight();
        }
    }
    async focus() {
        const editor = this.#editor;
        if (editor) {
            editor.editor.focus();
            editor.dispatch({ selection: { anchor: editor.state.doc.length } });
        }
    }
    appendToContextMenu(contextMenu) {
        if (!this.#pin) {
            return;
        }
        const { lastResult } = this.#pin;
        if (lastResult && !('error' in lastResult) && lastResult.object) {
            contextMenu.appendApplicableItems(lastResult.object);
            // Prevent result from being released automatically, since it may be used by
            // the context menu action. It will be released when the console is cleared,
            // where we release the 'live-expression' object group.
            this.#pin.skipReleaseLastResult();
        }
    }
    performUpdate() {
        if (!this.#pin) {
            return;
        }
        const output = {};
        this.#view({
            expression: this.#pin.expression,
            editorState: this.#editor?.state ?? this.#createInitialEditorState(this.#pin.expression),
            result: this.#pin.lastResult,
            isEditing: this.#pinEditor.isEditing(),
            onDelete: () => this.#onRemove?.(),
            onPreviewHoverChange: hovered => this.setHovered(hovered),
            onPreviewClick: event => {
                if (this.#lastNode) {
                    void Common.Revealer.reveal(this.#lastNode);
                    event.consume();
                }
            },
        }, output, this.contentElement);
        const { deletePinIcon, editor } = output;
        if (!deletePinIcon || !editor) {
            throw new Error('Broken view function, expected output');
        }
        this.#deletePinIcon = deletePinIcon;
        this.#editor = editor;
        const node = this.#pin.lastNode;
        if (this.#hovered) {
            if (node) {
                SDK.OverlayModel.OverlayModel.highlightObjectAsDOMNode(node);
            }
            else if (this.#lastNode) {
                SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight();
            }
        }
        this.#lastNode = node || null;
    }
}
export class ConsolePinModel {
    #setting;
    #pins = new Set();
    #throttler = new Common.Throttler.Throttler(250);
    #active = false;
    constructor(settings) {
        this.#setting = settings.createLocalSetting('console-pins', []);
        for (const expression of this.#setting.get()) {
            this.add(expression);
        }
    }
    get pins() {
        return this.#pins;
    }
    add(expression) {
        const pin = new ConsolePin(expression, () => this.#save());
        this.#pins.add(pin);
        this.#save();
        return pin;
    }
    remove(pin) {
        this.#pins.delete(pin);
        this.#save();
    }
    removeAll() {
        this.#pins.clear();
        this.#save();
    }
    startPeriodicEvaluate() {
        this.#active = true;
        void this.#evaluateAllPins();
    }
    stopPeriodicEvaluate() {
        this.#active = false;
    }
    async #evaluateAllPins() {
        if (!this.#active) {
            return;
        }
        const executionContext = UI.Context.Context.instance().flavor(SDK.RuntimeModel.ExecutionContext);
        if (executionContext) {
            await Promise.all(this.#pins.values().map(pin => pin.evaluate(executionContext)));
        }
        void this.#throttler.schedule(this.#evaluateAllPins.bind(this));
    }
    #save() {
        const expressions = this.#pins.values().map(pin => pin.expression).toArray();
        this.#setting.set(expressions);
    }
}
/**
 * A pinned console expression.
 */
export class ConsolePin extends Common.ObjectWrapper.ObjectWrapper {
    #expression;
    #onCommit;
    #editor;
    // We track the last evaluation result for this pin so we can release the RemoteObject.
    #lastResult = null;
    #lastNode = null;
    #lastExecutionContext = null;
    #releaseLastResult = true;
    constructor(expression, onCommit) {
        super();
        this.#expression = expression;
        this.#onCommit = onCommit;
    }
    get expression() {
        return this.#expression;
    }
    get lastResult() {
        return this.#lastResult;
    }
    /** A short cut in case `lastResult` is a DOM node */
    get lastNode() {
        return this.#lastNode;
    }
    skipReleaseLastResult() {
        this.#releaseLastResult = false;
    }
    setEditor(editor) {
        this.#editor = editor;
    }
    /**
     * Commit the current working copy from the editor.
     * @returns true, iff the working copy was commited as-is.
     */
    commit() {
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
    async evaluate(executionContext) {
        const editorText = this.#editor?.workingCopyWithHint() ?? '';
        const throwOnSideEffect = Boolean(this.#editor?.isEditing()) && editorText !== this.#expression;
        const timeout = throwOnSideEffect ? 250 : undefined;
        const result = await ObjectUI.JavaScriptREPL.JavaScriptREPL.evaluate(editorText, executionContext, throwOnSideEffect, /* replMode*/ true, timeout, 'live-expression', 
        /* awaitPromise */ true, /* silent */ true);
        if (this.#lastResult && this.#releaseLastResult) {
            this.#lastExecutionContext?.runtimeModel.releaseEvaluationResult(this.#lastResult);
        }
        this.#lastResult = result;
        this.#lastExecutionContext = executionContext;
        this.#releaseLastResult = true;
        if (result && !('error' in result) && result.object.type === 'object' && result.object.subtype === 'node') {
            this.#lastNode = result.object;
        }
        else {
            this.#lastNode = null;
        }
        this.dispatchEventToListeners("EVALUATE_RESULT_READY" /* ConsolePinEvent.EVALUATE_RESULT_READY */, this);
    }
}
//# sourceMappingURL=ConsolePinPane.js.map