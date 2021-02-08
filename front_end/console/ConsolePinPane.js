// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as i18n from '../i18n/i18n.js';
import * as ObjectUI from '../object_ui/object_ui.js';
import * as Root from '../root/root.js';
import * as SDK from '../sdk/sdk.js';
import * as TextUtils from '../text_utils/text_utils.js';
import * as UI from '../ui/ui.js';

export const UIStrings = {
  /**
  *@description A context menu item in the Console Pin Pane of the Console panel
  */
  removeExpression: 'Remove expression',
  /**
  *@description A context menu item in the Console Pin Pane of the Console panel
  */
  removeAllExpressions: 'Remove all expressions',
  /**
  *@description Screen reader label for delete button on a non-blank live expression
  *@example {document} PH1
  */
  removeExpressionS: 'Remove expression: {PH1}',
  /**
  *@description Screen reader label for delete button on a blank live expression
  */
  removeBlankExpression: 'Remove blank expression',
  /**
  *@description Text in Console Pin Pane of the Console panel
  */
  liveExpressionEditor: 'Live expression editor',
  /**
  *@description Text in Console Pin Pane of the Console panel
  */
  expression: 'Expression',
  /**
  *@description Side effect label title in Console Pin Pane of the Console panel
  */
  evaluateAllowingSideEffects: 'Evaluate, allowing side effects',
  /**
  *@description Text of a DOM element in Console Pin Pane of the Console panel
  */
  notAvailable: 'not available',
};
const str_ = i18n.i18n.registerUIStrings('console/ConsolePinPane.js', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

/** @type {!WeakMap<!Element, !ConsolePin>} */
const elementToConsolePin = new WeakMap();

export class ConsolePinPane extends UI.ThrottledWidget.ThrottledWidget {
  /**
   * @param {!UI.Toolbar.ToolbarButton} liveExpressionButton
   */
  constructor(liveExpressionButton) {
    super(true, 250);
    this._liveExpressionButton = liveExpressionButton;
    this.registerRequiredCSS('console/consolePinPane.css', {enableLegacyPatching: true});
    this.registerRequiredCSS('object_ui/objectValue.css', {enableLegacyPatching: true});
    this.contentElement.classList.add('console-pins', 'monospace');
    this.contentElement.addEventListener('contextmenu', this._contextMenuEventFired.bind(this), false);

    /** @type {!Set<!ConsolePin>} */
    this._pins = new Set();
    this._pinsSetting = Common.Settings.Settings.instance().createLocalSetting('consolePins', []);
    for (const expression of this._pinsSetting.get()) {
      this.addPin(expression);
    }
  }

  /**
   * @override
   */
  willHide() {
    for (const pin of this._pins) {
      pin.setHovered(false);
    }
  }

  _savePins() {
    const toSave = Array.from(this._pins).map(pin => pin.expression());
    this._pinsSetting.set(toSave);
  }

  /**
   * @param {!Event} event
   */
  _contextMenuEventFired(event) {
    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    const target = UI.UIUtils.deepElementFromEvent(event);
    if (target) {
      const targetPinElement = target.enclosingNodeOrSelfWithClass('console-pin');
      if (targetPinElement) {
        const targetPin = elementToConsolePin.get(targetPinElement);
        if (targetPin) {
          contextMenu.editSection().appendItem(
              i18nString(UIStrings.removeExpression), this._removePin.bind(this, targetPin));
          targetPin.appendToContextMenu(contextMenu);
        }
      }
    }
    contextMenu.editSection().appendItem(i18nString(UIStrings.removeAllExpressions), this._removeAllPins.bind(this));
    contextMenu.show();
  }

  _removeAllPins() {
    for (const pin of this._pins) {
      this._removePin(pin);
    }
  }

  /**
   * @param {!ConsolePin} pin
   */
  _removePin(pin) {
    pin.element().remove();
    const newFocusedPin = this._focusedPinAfterDeletion(pin);
    this._pins.delete(pin);
    this._savePins();
    if (newFocusedPin) {
      newFocusedPin.focus();
    } else {
      this._liveExpressionButton.focus();
    }
  }

  /**
   * @param {string} expression
   * @param {boolean=} userGesture
   */
  addPin(expression, userGesture) {
    const pin = new ConsolePin(expression, this);
    this.contentElement.appendChild(pin.element());
    this._pins.add(pin);
    this._savePins();
    if (userGesture) {
      pin.focus();
    }
    this.update();
  }

  /**
   * @param {!ConsolePin} deletedPin
   * @return {?ConsolePin}
   */
  _focusedPinAfterDeletion(deletedPin) {
    const pinArray = Array.from(this._pins);
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

  /**
   * @override
   */
  async doUpdate() {
    if (!this._pins.size || !this.isShowing()) {
      return;
    }
    if (this.isShowing()) {
      this.update();
    }
    const updatePromises = Array.from(this._pins, pin => pin.updatePreview());
    await Promise.all(updatePromises);
    this._updatedForTest();
  }

  _updatedForTest() {
  }
}

export class ConsolePin extends Common.ObjectWrapper.ObjectWrapper {
  /**
   * @param {string} expression
   * @param {!ConsolePinPane} pinPane
   */
  constructor(expression, pinPane) {
    super();
    const deletePinIcon =
        /** @type {!UI.UIUtils.DevToolsCloseButton} */ (document.createElement('div', {is: 'dt-close-button'}));
    deletePinIcon.gray = true;
    deletePinIcon.classList.add('close-button');
    deletePinIcon.setTabbable(true);
    if (expression.length) {
      deletePinIcon.setAccessibleName(i18nString(UIStrings.removeExpressionS, {PH1: expression}));
    } else {
      deletePinIcon.setAccessibleName(i18nString(UIStrings.removeBlankExpression));
    }
    self.onInvokeElement(deletePinIcon, event => {
      pinPane._removePin(this);
      event.consume(true);
    });

    const fragment = UI.Fragment.Fragment.build`
    <div class='console-pin'>
      ${deletePinIcon}
      <div class='console-pin-name' $='name'></div>
      <div class='console-pin-preview' $='preview'></div>
    </div>`;
    this._pinElement = fragment.element();
    /** @type {!HTMLElement} */
    this._pinPreview = /** @type {!HTMLElement} */ (fragment.$('preview'));
    const nameElement = /** @type {!HTMLElement} */ (fragment.$('name'));
    UI.Tooltip.Tooltip.install(nameElement, expression);
    elementToConsolePin.set(this._pinElement, this);

    /** @type {?SDK.RuntimeModel.EvaluationResult} */
    this._lastResult = null;
    /** @type {?SDK.RuntimeModel.ExecutionContext} */
    this._lastExecutionContext = null;
    /** @type {?UI.TextEditor.TextEditor} */
    this._editor = null;
    this._committedExpression = expression;
    this._hovered = false;
    /** @type {?SDK.RemoteObject.RemoteObject} */
    this._lastNode = null;

    this._pinPreview.addEventListener('mouseenter', this.setHovered.bind(this, true), false);
    this._pinPreview.addEventListener('mouseleave', this.setHovered.bind(this, false), false);
    this._pinPreview.addEventListener('click', /** @param {!Event} event */ event => {
      if (this._lastNode) {
        Common.Revealer.reveal(this._lastNode);
        event.consume();
      }
    }, false);

    /**
    * @param {!UI.TextEditor.TextEditorFactory} factory
    * @return {!UI.TextEditor.TextEditor}
    */
    const createTextEditor = factory => {
      this._editor = factory.createEditor({
        devtoolsAccessibleName: i18nString(UIStrings.liveExpressionEditor),
        lineNumbers: false,
        lineWrapping: true,
        mimeType: 'javascript',
        autoHeight: true,
        placeholder: i18nString(UIStrings.expression),
        bracketMatchingSetting: undefined,
        lineWiseCopyCut: undefined,
        maxHighlightLength: undefined,
        padBottom: undefined,
        inputStyle: undefined,
      });
      this._editor.configureAutocomplete(
          ObjectUI.JavaScriptAutocomplete.JavaScriptAutocompleteConfig.createConfigForEditor(this._editor));
      this._editor.widget().show(nameElement);
      this._editor.widget().element.classList.add('console-pin-editor');
      this._editor.widget().element.tabIndex = -1;
      this._editor.setText(expression);
      this._editor.widget().element.addEventListener('keydown', event => {
        if (!this._editor) {
          return;
        }
        if (event.key === 'Tab' && !this._editor.text()) {
          event.consume();
          return;
        }
        if (event.keyCode === UI.KeyboardShortcut.Keys.Esc.code) {
          this._editor.setText(this._committedExpression);
        }
      }, true);
      this._editor.widget().element.addEventListener('focusout', event => {
        if (!this._editor) {
          return;
        }
        const text = this._editor.text();
        const trimmedText = text.trim();
        if (text.length !== trimmedText.length) {
          this._editor.setText(trimmedText);
        }
        this._committedExpression = trimmedText;
        pinPane._savePins();
        if (this._committedExpression.length) {
          deletePinIcon.setAccessibleName(i18nString(UIStrings.removeExpressionS, {PH1: this._committedExpression}));
        } else {
          deletePinIcon.setAccessibleName(i18nString(UIStrings.removeBlankExpression));
        }
        this._editor.setSelection(TextUtils.TextRange.TextRange.createFromLocation(Infinity, Infinity));
      });
      return this._editor;
    };

    const extension = /** @type {!Root.Runtime.Extension} */ (
        Root.Runtime.Runtime.instance().extension(UI.TextEditor.TextEditorFactory));

    this._editorPromise =
        extension.instance().then(obj => createTextEditor(/** @type {!UI.TextEditor.TextEditorFactory} */ (obj)));
  }

  /**
   * @param {boolean} hovered
   */
  setHovered(hovered) {
    if (this._hovered === hovered) {
      return;
    }
    this._hovered = hovered;
    if (!hovered && this._lastNode) {
      SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight();
    }
  }

  /**
   * @return {string}
   */
  expression() {
    return this._committedExpression;
  }

  /**
   * @return {!Element}
   */
  element() {
    return this._pinElement;
  }

  async focus() {
    const editor = await this._editorPromise;
    editor.widget().focus();
    editor.setSelection(TextUtils.TextRange.TextRange.createFromLocation(Infinity, Infinity));
  }

  /**
   * @param {!UI.ContextMenu.ContextMenu} contextMenu
   */
  appendToContextMenu(contextMenu) {
    if (this._lastResult && !('error' in this._lastResult) && this._lastResult.object) {
      contextMenu.appendApplicableItems(this._lastResult.object);
      // Prevent result from being released manually. It will release along with 'console' group.
      this._lastResult = null;
    }
  }

  /**
   * @return {!Promise<void>}
   */
  async updatePreview() {
    if (!this._editor) {
      return;
    }
    const text = this._editor.textWithCurrentSuggestion().trim();
    const isEditing = this._pinElement.hasFocus();
    const throwOnSideEffect = isEditing && text !== this._committedExpression;
    const timeout = throwOnSideEffect ? 250 : undefined;
    const executionContext = UI.Context.Context.instance().flavor(SDK.RuntimeModel.ExecutionContext);
    const {preview, result} = await ObjectUI.JavaScriptREPL.JavaScriptREPL.evaluateAndBuildPreview(
        text, throwOnSideEffect, timeout, !isEditing /* allowErrors */, 'console');
    if (this._lastResult && this._lastExecutionContext) {
      this._lastExecutionContext.runtimeModel.releaseEvaluationResult(this._lastResult);
    }
    this._lastResult = result || null;
    this._lastExecutionContext = executionContext || null;

    const previewText = preview.deepTextContent();
    if (!previewText || previewText !== this._pinPreview.deepTextContent()) {
      this._pinPreview.removeChildren();
      if (result && SDK.RuntimeModel.RuntimeModel.isSideEffectFailure(result)) {
        const sideEffectLabel =
            /** @type {!HTMLElement} */ (this._pinPreview.createChild('span', 'object-value-calculate-value-button'));
        sideEffectLabel.textContent = '(…)';
        UI.Tooltip.Tooltip.install(sideEffectLabel, i18nString(UIStrings.evaluateAllowingSideEffects));
      } else if (previewText) {
        this._pinPreview.appendChild(preview);
      } else if (!isEditing) {
        UI.UIUtils.createTextChild(this._pinPreview, i18nString(UIStrings.notAvailable));
      }
      UI.Tooltip.Tooltip.install(this._pinPreview, previewText);
    }

    let node = null;
    if (result && !('error' in result) && result.object.type === 'object' && result.object.subtype === 'node') {
      node = result.object;
    }
    if (this._hovered) {
      if (node) {
        SDK.OverlayModel.OverlayModel.highlightObjectAsDOMNode(node);
      } else if (this._lastNode) {
        SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight();
      }
    }
    this._lastNode = node || null;

    const isError = result && !('error' in result) && result.exceptionDetails &&
        !SDK.RuntimeModel.RuntimeModel.isSideEffectFailure(result);
    this._pinElement.classList.toggle('error-level', Boolean(isError));
  }
}
