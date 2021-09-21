// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
import * as ObjectUI from '../../ui/legacy/components/object_ui/object_ui.js';
// eslint-disable-next-line rulesdir/es_modules_import
import objectValueStyles from '../../ui/legacy/components/object_ui/objectValue.css.js';
import * as TextEditor from '../../ui/legacy/components/text_editor/text_editor.js';
import * as UI from '../../ui/legacy/legacy.js';

import consolePinPaneStyles from './consolePinPane.css.js';

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
  private readonly liveExpressionButton: UI.Toolbar.ToolbarButton;
  private pins: Set<ConsolePin>;
  private readonly pinsSetting: Common.Settings.Setting<string[]>;
  constructor(liveExpressionButton: UI.Toolbar.ToolbarButton) {
    super(true, 250);
    this.liveExpressionButton = liveExpressionButton;
    this.contentElement.classList.add('console-pins', 'monospace');
    this.contentElement.addEventListener('contextmenu', this.contextMenuEventFired.bind(this), false);

    this.pins = new Set();
    this.pinsSetting = Common.Settings.Settings.instance().createLocalSetting('consolePins', []);
    for (const expression of this.pinsSetting.get()) {
      this.addPin(expression);
    }
  }

  wasShown(): void {
    super.wasShown();
    this.registerCSSFiles([consolePinPaneStyles, objectValueStyles]);
  }

  willHide(): void {
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
      const targetPinElement = target.enclosingNodeOrSelfWithClass('console-pin');
      if (targetPinElement) {
        const targetPin = elementToConsolePin.get(targetPinElement);
        if (targetPin) {
          contextMenu.editSection().appendItem(
              i18nString(UIStrings.removeExpression), this.removePin.bind(this, targetPin));
          targetPin.appendToContextMenu(contextMenu);
        }
      }
    }
    contextMenu.editSection().appendItem(i18nString(UIStrings.removeAllExpressions), this.removeAllPins.bind(this));
    contextMenu.show();
  }

  private removeAllPins(): void {
    for (const pin of this.pins) {
      this.removePin(pin);
    }
  }

  removePin(pin: ConsolePin): void {
    pin.element().remove();
    const newFocusedPin = this.focusedPinAfterDeletion(pin);
    this.pins.delete(pin);
    this.savePins();
    if (newFocusedPin) {
      newFocusedPin.focus();
    } else {
      this.liveExpressionButton.focus();
    }
  }

  addPin(expression: string, userGesture?: boolean): void {
    const pin = new ConsolePin(expression, this);
    this.contentElement.appendChild(pin.element());
    this.pins.add(pin);
    this.savePins();
    if (userGesture) {
      pin.focus();
    }
    this.update();
  }

  private focusedPinAfterDeletion(deletedPin: ConsolePin): ConsolePin|null {
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

  async doUpdate(): Promise<void> {
    if (!this.pins.size || !this.isShowing()) {
      return;
    }
    if (this.isShowing()) {
      this.update();
    }
    const updatePromises = Array.from(this.pins, pin => pin.updatePreview());
    await Promise.all(updatePromises);
    this.updatedForTest();
  }

  private updatedForTest(): void {
  }
}

let consolePinNumber = 0;

export class ConsolePin {
  private readonly pinElement: Element;
  private readonly pinPreview: HTMLElement;
  private lastResult: SDK.RuntimeModel.EvaluationResult|null;
  private lastExecutionContext: SDK.RuntimeModel.ExecutionContext|null;
  private editor: UI.TextEditor.TextEditor|null;
  private committedExpression: string;
  private hovered: boolean;
  private lastNode: SDK.RemoteObject.RemoteObject|null;
  private readonly editorPromise: Promise<UI.TextEditor.TextEditor>;
  private consolePinNumber: number;

  constructor(expression: string, pinPane: ConsolePinPane) {
    this.consolePinNumber = ++consolePinNumber;
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
      pinPane.removePin(this);
      event.consume(true);
    });

    const fragment = UI.Fragment.Fragment.build`
  <div class='console-pin'>
  ${deletePinIcon}
  <div class='console-pin-name' $='name'></div>
  <div class='console-pin-preview' $='preview'></div>
  </div>`;
    this.pinElement = fragment.element();
    this.pinPreview = (fragment.$('preview') as HTMLElement);
    const nameElement = (fragment.$('name') as HTMLElement);
    UI.Tooltip.Tooltip.install(nameElement, expression);
    elementToConsolePin.set(this.pinElement, this);

    this.lastResult = null;
    this.lastExecutionContext = null;
    this.editor = null;
    this.committedExpression = expression;
    this.hovered = false;
    this.lastNode = null;

    this.pinPreview.addEventListener('mouseenter', this.setHovered.bind(this, true), false);
    this.pinPreview.addEventListener('mouseleave', this.setHovered.bind(this, false), false);
    this.pinPreview.addEventListener('click', (event: Event) => {
      if (this.lastNode) {
        Common.Revealer.reveal(this.lastNode);
        event.consume();
      }
    }, false);

    const createTextEditor = (factory: UI.TextEditor.TextEditorFactory): UI.TextEditor.TextEditor => {
      this.editor = factory.createEditor({
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
      this.editor.configureAutocomplete(
          ObjectUI.JavaScriptAutocomplete.JavaScriptAutocompleteConfig.createConfigForEditor(this.editor));
      this.editor.widget().show(nameElement);
      this.editor.widget().element.classList.add('console-pin-editor');
      this.editor.widget().element.tabIndex = -1;
      this.editor.setText(expression);
      this.editor.widget().element.addEventListener('keydown', event => {
        if (!this.editor) {
          return;
        }
        if (event.key === 'Tab' && !this.editor.text()) {
          event.consume();
          return;
        }
        if (event.keyCode === UI.KeyboardShortcut.Keys.Esc.code) {
          this.editor.setText(this.committedExpression);
        }
      }, true);
      this.editor.widget().element.addEventListener('focusout', _event => {
        if (!this.editor) {
          return;
        }
        const text = this.editor.text();
        const trimmedText = text.trim();
        if (text.length !== trimmedText.length) {
          this.editor.setText(trimmedText);
        }
        this.committedExpression = trimmedText;
        pinPane.savePins();
        if (this.committedExpression.length) {
          deletePinIcon.setAccessibleName(i18nString(UIStrings.removeExpressionS, {PH1: this.committedExpression}));
        } else {
          deletePinIcon.setAccessibleName(i18nString(UIStrings.removeBlankExpression));
        }
        this.editor.setSelection(TextUtils.TextRange.TextRange.createFromLocation(Infinity, Infinity));
      });
      return this.editor;
    };

    const factory = TextEditor.CodeMirrorTextEditor.CodeMirrorTextEditorFactory.instance();
    this.editorPromise = Promise.resolve().then(() => createTextEditor(factory));
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
    return this.committedExpression;
  }

  element(): Element {
    return this.pinElement;
  }

  async focus(): Promise<void> {
    const editor = await this.editorPromise;
    editor.widget().focus();
    editor.setSelection(TextUtils.TextRange.TextRange.createFromLocation(Infinity, Infinity));
  }

  appendToContextMenu(contextMenu: UI.ContextMenu.ContextMenu): void {
    if (this.lastResult && !('error' in this.lastResult) && this.lastResult.object) {
      contextMenu.appendApplicableItems(this.lastResult.object);
      // Prevent result from being released manually. It will release along with 'console' group.
      this.lastResult = null;
    }
  }

  async updatePreview(): Promise<void> {
    if (!this.editor) {
      return;
    }
    const text = this.editor.textWithCurrentSuggestion().trim();
    const isEditing = this.pinElement.hasFocus();
    const throwOnSideEffect = isEditing && text !== this.committedExpression;
    const timeout = throwOnSideEffect ? 250 : undefined;
    const executionContext = UI.Context.Context.instance().flavor(SDK.RuntimeModel.ExecutionContext);
    const preprocessedExpression = ObjectUI.JavaScriptREPL.JavaScriptREPL.preprocessExpression(text);
    const {preview, result} = await ObjectUI.JavaScriptREPL.JavaScriptREPL.evaluateAndBuildPreview(
        `${preprocessedExpression}\n//# sourceURL=watch-expression-${this.consolePinNumber}.devtools`,
        throwOnSideEffect, false /* replMode */, timeout, !isEditing /* allowErrors */, 'console');
    if (this.lastResult && this.lastExecutionContext) {
      this.lastExecutionContext.runtimeModel.releaseEvaluationResult(this.lastResult);
    }
    this.lastResult = result || null;
    this.lastExecutionContext = executionContext || null;

    const previewText = preview.deepTextContent();
    if (!previewText || previewText !== this.pinPreview.deepTextContent()) {
      this.pinPreview.removeChildren();
      if (result && SDK.RuntimeModel.RuntimeModel.isSideEffectFailure(result)) {
        const sideEffectLabel =
            (this.pinPreview.createChild('span', 'object-value-calculate-value-button') as HTMLElement);
        sideEffectLabel.textContent = '(…)';
        UI.Tooltip.Tooltip.install(sideEffectLabel, i18nString(UIStrings.evaluateAllowingSideEffects));
      } else if (previewText) {
        this.pinPreview.appendChild(preview);
      } else if (!isEditing) {
        UI.UIUtils.createTextChild(this.pinPreview, i18nString(UIStrings.notAvailable));
      }
      UI.Tooltip.Tooltip.install(this.pinPreview, previewText);
    }

    let node: SDK.RemoteObject.RemoteObject|null = null;
    if (result && !('error' in result) && result.object.type === 'object' && result.object.subtype === 'node') {
      node = result.object;
    }
    if (this.hovered) {
      if (node) {
        SDK.OverlayModel.OverlayModel.highlightObjectAsDOMNode(node);
      } else if (this.lastNode) {
        SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight();
      }
    }
    this.lastNode = node || null;

    const isError = result && !('error' in result) && result.exceptionDetails &&
        !SDK.RuntimeModel.RuntimeModel.isSideEffectFailure(result);
    this.pinElement.classList.toggle('error-level', Boolean(isError));
  }
}
