// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as ObjectUI from '../object_ui/object_ui.js';
import * as SDK from '../sdk/sdk.js';
import * as TextUtils from '../text_utils/text_utils.js';
import * as UI from '../ui/ui.js';

const _PinSymbol = Symbol('pinSymbol');

export class ConsolePinPane extends UI.ThrottledWidget.ThrottledWidget {
  /**
   * @param {!UI.Toolbar.ToolbarButton} liveExpressionButton
   */
  constructor(liveExpressionButton) {
    super(true, 250);
    this._liveExpressionButton = liveExpressionButton;
    this.registerRequiredCSS('console/consolePinPane.css');
    this.registerRequiredCSS('object_ui/objectValue.css');
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
    const target = event.deepElementFromPoint();
    if (target) {
      const targetPinElement = target.enclosingNodeOrSelfWithClass('console-pin');
      if (targetPinElement) {
        const targetPin = targetPinElement[_PinSymbol];
        contextMenu.editSection().appendItem(ls`Edit expression`, targetPin.focus.bind(targetPin));
        contextMenu.editSection().appendItem(ls`Remove expression`, this._removePin.bind(this, targetPin));
        targetPin.appendToContextMenu(contextMenu);
      }
    }
    contextMenu.editSection().appendItem(ls`Remove all expressions`, this._removeAllPins.bind(this));
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
    this._pins.delete(pin);
    this._savePins();
    this._liveExpressionButton.element.focus();
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
   * @override
   */
  doUpdate() {
    if (!this._pins.size || !this.isShowing()) {
      return Promise.resolve();
    }
    if (this.isShowing()) {
      this.update();
    }
    const updatePromises = Array.from(this._pins, pin => pin.updatePreview());
    return Promise.all(updatePromises).then(this._updatedForTest.bind(this));
  }

  _updatedForTest() {
  }
}

/**
 * @unrestricted
 */
export class ConsolePin extends Common.ObjectWrapper.ObjectWrapper {
  /**
   * @param {string} expression
   * @param {!ConsolePinPane} pinPane
   */
  constructor(expression, pinPane) {
    super();
    const deletePinIcon = UI.Icon.Icon.create('smallicon-cross', 'console-delete-pin');
    self.onInvokeElement(deletePinIcon, event => {
      pinPane._removePin(this);
      event.consume(true);
    });
    deletePinIcon.tabIndex = 0;
    UI.ARIAUtils.setAccessibleName(deletePinIcon, ls`Remove expression`);
    UI.ARIAUtils.markAsButton(deletePinIcon);

    const fragment = UI.Fragment.Fragment.build`
    <div class='console-pin'>
      ${deletePinIcon}
      <div class='console-pin-name' $='name'></div>
      <div class='console-pin-preview' $='preview'>${ls`not available`}</div>
    </div>`;
    this._pinElement = fragment.element();
    this._pinPreview = fragment.$('preview');
    const nameElement = fragment.$('name');
    nameElement.title = expression;
    this._pinElement[_PinSymbol] = this;

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
    this._pinPreview.addEventListener('click', event => {
      if (this._lastNode) {
        Common.Revealer.reveal(this._lastNode);
        event.consume();
      }
    }, false);

    this._editorPromise = self.runtime.extension(UI.TextEditor.TextEditorFactory).instance().then(factory => {
      this._editor = factory.createEditor({
        devtoolsAccessibleName: ls`Live expression editor`,
        lineNumbers: false,
        lineWrapping: true,
        mimeType: 'javascript',
        autoHeight: true,
        placeholder: ls`Expression`
      });
      this._editor.configureAutocomplete(
          ObjectUI.JavaScriptAutocomplete.JavaScriptAutocompleteConfig.createConfigForEditor(this._editor));
      this._editor.widget().show(nameElement);
      this._editor.widget().element.classList.add('console-pin-editor');
      this._editor.widget().element.tabIndex = -1;
      this._editor.setText(expression);
      this._editor.widget().element.addEventListener('keydown', event => {
        if (event.key === 'Tab' && !this._editor.text()) {
          event.consume();
          return;
        }
        if (event.keyCode === UI.KeyboardShortcut.Keys.Esc.code) {
          this._editor.setText(this._committedExpression);
        }
      }, true);
      this._editor.widget().element.addEventListener('focusout', event => {
        const text = this._editor.text();
        const trimmedText = text.trim();
        if (text.length !== trimmedText.length) {
          this._editor.setText(trimmedText);
        }
        this._committedExpression = trimmedText;
        pinPane._savePins();
        this._editor.setSelection(TextUtils.TextRange.TextRange.createFromLocation(Infinity, Infinity));
      });
    });
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
    await this._editorPromise;
    this._editor.widget().focus();
    this._editor.setSelection(TextUtils.TextRange.TextRange.createFromLocation(Infinity, Infinity));
  }

  /**
   * @param {!UI.ContextMenu.ContextMenu} contextMenu
   */
  appendToContextMenu(contextMenu) {
    if (this._lastResult && this._lastResult.object) {
      contextMenu.appendApplicableItems(this._lastResult.object);
      // Prevent result from being released manually. It will release along with 'console' group.
      this._lastResult = null;
    }
  }

  /**
   * @return {!Promise}
   */
  async updatePreview() {
    if (!this._editor) {
      return;
    }
    const text = this._editor.textWithCurrentSuggestion().trim();
    const isEditing = this._pinElement.hasFocus();
    const throwOnSideEffect = isEditing && text !== this._committedExpression;
    const timeout = throwOnSideEffect ? 250 : undefined;
    const executionContext = self.UI.context.flavor(SDK.RuntimeModel.ExecutionContext);
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
        const sideEffectLabel = this._pinPreview.createChild('span', 'object-value-calculate-value-button');
        sideEffectLabel.textContent = '(…)';
        sideEffectLabel.title = ls`Evaluate, allowing side effects`;
      } else if (previewText) {
        this._pinPreview.appendChild(preview);
      } else if (!isEditing) {
        this._pinPreview.createTextChild(ls`not available`);
      }
      this._pinPreview.title = previewText;
    }

    let node = null;
    if (result && result.object && result.object.type === 'object' && result.object.subtype === 'node') {
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

    const isError = result && result.exceptionDetails && !SDK.RuntimeModel.RuntimeModel.isSideEffectFailure(result);
    this._pinElement.classList.toggle('error-level', !!isError);
  }
}
