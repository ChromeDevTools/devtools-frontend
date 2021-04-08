// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
import * as ObjectUI from '../../object_ui/object_ui.js';
import * as TextEditor from '../../text_editor/text_editor.js';  // eslint-disable-line no-unused-vars
import * as UI from '../../ui/legacy/legacy.js';

const UIStrings = {
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
const str_ = i18n.i18n.registerUIStrings('panels/console/ConsolePinPane.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

const elementToConsolePin = new WeakMap<Element, ConsolePin>();

export class ConsolePinPane extends UI.ThrottledWidget.ThrottledWidget {
  _liveExpressionButton: UI.Toolbar.ToolbarButton;
  _pins: Set<ConsolePin>;
  _pinsSetting: Common.Settings.Setting<string[]>;
  constructor(liveExpressionButton: UI.Toolbar.ToolbarButton) {
    super(true, 250);
    this._liveExpressionButton = liveExpressionButton;
    this.registerRequiredCSS('panels/console/consolePinPane.css', {enableLegacyPatching: true});
    this.registerRequiredCSS('object_ui/objectValue.css', {enableLegacyPatching: true});
    this.contentElement.classList.add('console-pins', 'monospace');
    this.contentElement.addEventListener('contextmenu', this._contextMenuEventFired.bind(this), false);

    this._pins = new Set();
    this._pinsSetting = Common.Settings.Settings.instance().createLocalSetting('consolePins', []);
    for (const expression of this._pinsSetting.get()) {
      this.addPin(expression);
    }
  }

  willHide(): void {
    for (const pin of this._pins) {
      pin.setHovered(false);
    }
  }

  _savePins(): void {
    const toSave = Array.from(this._pins).map(pin => pin.expression());
    this._pinsSetting.set(toSave);
  }

  _contextMenuEventFired(event: Event): void {
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

  _removeAllPins(): void {
    for (const pin of this._pins) {
      this._removePin(pin);
    }
  }

  _removePin(pin: ConsolePin): void {
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

  addPin(expression: string, userGesture?: boolean): void {
    const pin = new ConsolePin(expression, this);
    this.contentElement.appendChild(pin.element());
    this._pins.add(pin);
    this._savePins();
    if (userGesture) {
      pin.focus();
    }
    this.update();
  }

  _focusedPinAfterDeletion(deletedPin: ConsolePin): ConsolePin|null {
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

  async doUpdate(): Promise<void> {
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

  _updatedForTest(): void {
  }
}

export class ConsolePin extends Common.ObjectWrapper.ObjectWrapper {
  _pinElement: Element;
  _pinPreview: HTMLElement;
  _lastResult: SDK.RuntimeModel.EvaluationResult|null;
  _lastExecutionContext: SDK.RuntimeModel.ExecutionContext|null;
  _editor: UI.TextEditor.TextEditor|null;
  _committedExpression: string;
  _hovered: boolean;
  _lastNode: SDK.RemoteObject.RemoteObject|null;
  _editorPromise: Promise<UI.TextEditor.TextEditor>;

  constructor(expression: string, pinPane: ConsolePinPane) {
    super();
    const deletePinIcon = (document.createElement('div', {is: 'dt-close-button'}) as UI.UIUtils.DevToolsCloseButton);
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
    this._pinPreview = (fragment.$('preview') as HTMLElement);
    const nameElement = (fragment.$('name') as HTMLElement);
    UI.Tooltip.Tooltip.install(nameElement, expression);
    elementToConsolePin.set(this._pinElement, this);

    this._lastResult = null;
    this._lastExecutionContext = null;
    this._editor = null;
    this._committedExpression = expression;
    this._hovered = false;
    this._lastNode = null;

    this._pinPreview.addEventListener('mouseenter', this.setHovered.bind(this, true), false);
    this._pinPreview.addEventListener('mouseleave', this.setHovered.bind(this, false), false);
    this._pinPreview.addEventListener('click', (event: Event) => {
      if (this._lastNode) {
        Common.Revealer.reveal(this._lastNode);
        event.consume();
      }
    }, false);

    const createTextEditor = (factory: UI.TextEditor.TextEditorFactory): UI.TextEditor.TextEditor => {
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
      this._editor.widget().element.addEventListener('focusout', _event => {
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

    const factory = TextEditor.CodeMirrorTextEditor.CodeMirrorTextEditorFactory.instance();
    this._editorPromise = Promise.resolve().then(() => createTextEditor(factory));
  }

  setHovered(hovered: boolean): void {
    if (this._hovered === hovered) {
      return;
    }
    this._hovered = hovered;
    if (!hovered && this._lastNode) {
      SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight();
    }
  }

  expression(): string {
    return this._committedExpression;
  }

  element(): Element {
    return this._pinElement;
  }

  async focus(): Promise<void> {
    const editor = await this._editorPromise;
    editor.widget().focus();
    editor.setSelection(TextUtils.TextRange.TextRange.createFromLocation(Infinity, Infinity));
  }

  appendToContextMenu(contextMenu: UI.ContextMenu.ContextMenu): void {
    if (this._lastResult && !('error' in this._lastResult) && this._lastResult.object) {
      contextMenu.appendApplicableItems(this._lastResult.object);
      // Prevent result from being released manually. It will release along with 'console' group.
      this._lastResult = null;
    }
  }

  async updatePreview(): Promise<void> {
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
            (this._pinPreview.createChild('span', 'object-value-calculate-value-button') as HTMLElement);
        sideEffectLabel.textContent = '(…)';
        UI.Tooltip.Tooltip.install(sideEffectLabel, i18nString(UIStrings.evaluateAllowingSideEffects));
      } else if (previewText) {
        this._pinPreview.appendChild(preview);
      } else if (!isEditing) {
        UI.UIUtils.createTextChild(this._pinPreview, i18nString(UIStrings.notAvailable));
      }
      UI.Tooltip.Tooltip.install(this._pinPreview, previewText);
    }

    let node: SDK.RemoteObject.RemoteObject|null = null;
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
