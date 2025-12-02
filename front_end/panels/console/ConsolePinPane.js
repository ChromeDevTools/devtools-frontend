// Copyright 2018 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as CodeMirror from '../../third_party/codemirror.next/codemirror.next.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as TextEditor from '../../ui/components/text_editor/text_editor.js';
import * as ObjectUI from '../../ui/legacy/components/object_ui/object_ui.js';
// eslint-disable-next-line @devtools/es-modules-import
import objectValueStyles from '../../ui/legacy/components/object_ui/objectValue.css.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import consolePinPaneStyles from './consolePinPane.css.js';
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
const elementToConsolePin = new WeakMap();
export class ConsolePinPane extends UI.Widget.VBox {
    liveExpressionButton;
    focusOut;
    pins;
    pinsSetting;
    throttler;
    constructor(liveExpressionButton, focusOut) {
        super({ useShadowDom: true });
        this.liveExpressionButton = liveExpressionButton;
        this.focusOut = focusOut;
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
    willHide() {
        super.willHide();
        for (const pin of this.pins) {
            pin.setHovered(false);
        }
    }
    savePins() {
        const toSave = Array.from(this.pins).map(pin => pin.expression());
        this.pinsSetting.set(toSave);
    }
    contextMenuEventFired(event) {
        const contextMenu = new UI.ContextMenu.ContextMenu(event);
        const target = UI.UIUtils.deepElementFromEvent(event);
        if (target) {
            const targetPinElement = target.enclosingNodeOrSelfWithClass('console-pin');
            if (targetPinElement) {
                const targetPin = elementToConsolePin.get(targetPinElement);
                if (targetPin) {
                    contextMenu.editSection().appendItem(i18nString(UIStrings.removeExpression), this.removePin.bind(this, targetPin), { jslogContext: 'remove-expression' });
                    targetPin.appendToContextMenu(contextMenu);
                }
            }
        }
        contextMenu.editSection().appendItem(i18nString(UIStrings.removeAllExpressions), this.removeAllPins.bind(this), { jslogContext: 'remove-all-expressions' });
        void contextMenu.show();
    }
    removeAllPins() {
        for (const pin of this.pins) {
            this.removePin(pin);
        }
    }
    removePin(pin) {
        pin.element().remove();
        const newFocusedPin = this.focusedPinAfterDeletion(pin);
        this.pins.delete(pin);
        this.savePins();
        if (newFocusedPin) {
            void newFocusedPin.focus();
        }
        else {
            this.liveExpressionButton.focus();
        }
    }
    addPin(expression, userGesture) {
        const pin = new ConsolePinPresenter(expression, this, this.focusOut);
        this.contentElement.appendChild(pin.element());
        this.pins.add(pin);
        this.savePins();
        if (userGesture) {
            void pin.focus();
        }
        this.requestUpdate();
    }
    focusedPinAfterDeletion(deletedPin) {
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
    wasShown() {
        super.wasShown();
        void this.throttler.schedule(this.requestUpdate.bind(this));
    }
    async performUpdate() {
        if (!this.pins.size || !this.isShowing()) {
            return;
        }
        const updatePromises = Array.from(this.pins, pin => pin.updatePreview());
        await Promise.all(updatePromises);
        this.updatedForTest();
        void this.throttler.schedule(this.requestUpdate.bind(this));
    }
    updatedForTest() {
    }
}
export class ConsolePinPresenter {
    pinPane;
    focusOut;
    pin;
    pinEditor;
    pinElement;
    pinPreview;
    editor;
    hovered;
    lastNode;
    deletePinIcon;
    constructor(expression, pinPane, focusOut) {
        this.pinPane = pinPane;
        this.focusOut = focusOut;
        this.deletePinIcon = new Buttons.Button.Button();
        this.deletePinIcon
            .data = { variant: "icon" /* Buttons.Button.Variant.ICON */, iconName: 'cross', size: "MICRO" /* Buttons.Button.Size.MICRO */ };
        this.deletePinIcon.classList.add('close-button');
        this.deletePinIcon.setAttribute('jslog', `${VisualLogging.close().track({ click: true })}`);
        this.deletePinIcon.tabIndex = 0;
        if (expression.length) {
            UI.ARIAUtils.setLabel(this.deletePinIcon, i18nString(UIStrings.removeExpressionS, { PH1: expression }));
        }
        else {
            UI.ARIAUtils.setLabel(this.deletePinIcon, i18nString(UIStrings.removeBlankExpression));
        }
        self.onInvokeElement(this.deletePinIcon, event => {
            pinPane.removePin(this);
            event.consume(true);
        });
        const fragment = UI.Fragment.Fragment.build `
  <div class='console-pin'>
  ${this.deletePinIcon}
  <div class='console-pin-name' $='name' jslog="${VisualLogging.textField().track({
            change: true,
        })}"></div>
  <div class='console-pin-preview' $='preview'></div>
  </div>`;
        this.pinElement = fragment.element();
        this.pinPreview = fragment.$('preview');
        const nameElement = fragment.$('name');
        UI.Tooltip.Tooltip.install(nameElement, expression);
        elementToConsolePin.set(this.pinElement, this);
        this.hovered = false;
        this.lastNode = null;
        this.editor = this.#createEditor(expression, nameElement);
        this.pinEditor = {
            workingCopy: () => this.editor.state.doc.toString(),
            workingCopyWithHint: () => TextEditor.Config.contentIncludingHint(this.editor.editor),
            isEditing: () => this.pinElement.hasFocus(),
        };
        this.pin = new ConsolePin(this.pinEditor, expression);
        this.pinPreview.addEventListener('mouseenter', this.setHovered.bind(this, true), false);
        this.pinPreview.addEventListener('mouseleave', this.setHovered.bind(this, false), false);
        this.pinPreview.addEventListener('click', (event) => {
            if (this.lastNode) {
                void Common.Revealer.reveal(this.lastNode);
                event.consume();
            }
        }, false);
        // Prevent Esc from toggling the drawer
        nameElement.addEventListener('keydown', event => {
            if (event.key === 'Escape') {
                event.consume();
            }
        });
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
                        view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: this.pin.expression } });
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
                    run: (view) => {
                        if (CodeMirror.completionStatus(this.editor.state) !== null) {
                            return false;
                        }
                        // User should be able to tab out of edit field after auto complete is done
                        view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: this.pin.expression } });
                        this.focusOut();
                        return true;
                    },
                },
                {
                    key: 'Shift-Tab',
                    run: (view) => {
                        if (CodeMirror.completionStatus(this.editor.state) !== null) {
                            return false;
                        }
                        // User should be able to tab out of edit field after auto complete is done
                        view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: this.pin.expression } });
                        this.editor.blur();
                        this.deletePinIcon.focus();
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
    #createEditor(doc, parent) {
        const editor = new TextEditor.TextEditor.TextEditor(this.#createInitialEditorState(doc));
        parent.appendChild(editor);
        return editor;
    }
    #onBlur(editor) {
        const commitedAsIs = this.pin.commit();
        this.pinPane.savePins();
        const newExpression = this.pin.expression;
        if (newExpression.length) {
            UI.ARIAUtils.setLabel(this.deletePinIcon, i18nString(UIStrings.removeExpressionS, { PH1: newExpression }));
        }
        else {
            UI.ARIAUtils.setLabel(this.deletePinIcon, i18nString(UIStrings.removeBlankExpression));
        }
        editor.dispatch({
            selection: { anchor: this.pin.expression.length },
            changes: !commitedAsIs ? { from: 0, to: this.editor.state.doc.length, insert: newExpression } : undefined,
        });
    }
    setHovered(hovered) {
        if (this.hovered === hovered) {
            return;
        }
        this.hovered = hovered;
        if (!hovered && this.lastNode) {
            SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight();
        }
    }
    expression() {
        return this.pin.expression;
    }
    element() {
        return this.pinElement;
    }
    async focus() {
        const editor = this.editor;
        editor.editor.focus();
        editor.dispatch({ selection: { anchor: editor.state.doc.length } });
    }
    appendToContextMenu(contextMenu) {
        const { lastResult } = this.pin;
        if (lastResult && !('error' in lastResult) && lastResult.object) {
            contextMenu.appendApplicableItems(lastResult.object);
            // Prevent result from being released automatically, since it may be used by
            // the context menu action. It will be released when the console is cleared,
            // where we release the 'live-expression' object group.
            this.pin.skipReleaseLastResult();
        }
    }
    async updatePreview() {
        if (!this.editor) {
            return;
        }
        const executionContext = UI.Context.Context.instance().flavor(SDK.RuntimeModel.ExecutionContext);
        if (!executionContext) {
            return;
        }
        const { result, node } = await this.pin.evaluate(executionContext);
        const formatter = new ObjectUI.RemoteObjectPreviewFormatter.RemoteObjectPreviewFormatter();
        const preview = result ? formatter.renderEvaluationResultPreview(result) : document.createDocumentFragment();
        const previewText = preview.deepTextContent();
        if (!previewText || previewText !== this.pinPreview.deepTextContent()) {
            this.pinPreview.removeChildren();
            if (result && SDK.RuntimeModel.RuntimeModel.isSideEffectFailure(result)) {
                const sideEffectLabel = this.pinPreview.createChild('span', 'object-value-calculate-value-button');
                sideEffectLabel.textContent = '(…)';
                UI.Tooltip.Tooltip.install(sideEffectLabel, i18nString(UIStrings.evaluateAllowingSideEffects));
            }
            else if (previewText) {
                this.pinPreview.appendChild(preview);
            }
            else if (!this.pinEditor.isEditing()) {
                UI.UIUtils.createTextChild(this.pinPreview, i18nString(UIStrings.notAvailable));
            }
            UI.Tooltip.Tooltip.install(this.pinPreview, previewText);
        }
        if (this.hovered) {
            if (node) {
                SDK.OverlayModel.OverlayModel.highlightObjectAsDOMNode(node);
            }
            else if (this.lastNode) {
                SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight();
            }
        }
        this.lastNode = node || null;
        const isError = result && !('error' in result) && result.exceptionDetails &&
            !SDK.RuntimeModel.RuntimeModel.isSideEffectFailure(result);
        this.pinElement.classList.toggle('error-level', Boolean(isError));
    }
}
/**
 * A pinned console expression.
 */
export class ConsolePin {
    #editor;
    #expression;
    // We track the last evaluation result for this pin so we can release the RemoteObject.
    #lastResult = null;
    #lastExecutionContext = null;
    #releaseLastResult = true;
    constructor(editor, expression) {
        this.#editor = editor;
        this.#expression = expression;
    }
    get expression() {
        return this.#expression;
    }
    get lastResult() {
        return this.#lastResult;
    }
    skipReleaseLastResult() {
        this.#releaseLastResult = false;
    }
    /**
     * Commit the current working copy from the editor.
     * @returns true, iff the working copy was commited as-is.
     */
    commit() {
        const text = this.#editor.workingCopy();
        const trimmedText = text.trim();
        this.#expression = trimmedText;
        return this.#expression === text;
    }
    /** Evaluates the current working copy of the pinned expression. If the result is a DOM node, we return that separately for convenience.  */
    async evaluate(executionContext) {
        const editorText = this.#editor.workingCopyWithHint();
        const throwOnSideEffect = this.#editor.isEditing() && editorText !== this.#expression;
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
            return { result, node: result.object };
        }
        return { result, node: null };
    }
}
//# sourceMappingURL=ConsolePinPane.js.map