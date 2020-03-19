/*
 * Copyright (C) IBM Corp. 2009  All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of IBM Corp. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import * as Common from '../common/common.js';
import * as Components from '../components/components.js';
import * as Host from '../host/host.js';
import * as ObjectUI from '../object_ui/object_ui.js';
import * as Platform from '../platform/platform.js';
import * as SDK from '../sdk/sdk.js';
import * as UI from '../ui/ui.js';

import {UISourceCodeFrame} from './UISourceCodeFrame.js';

/**
 * @implements {UI.ActionDelegate.ActionDelegate}
 * @implements {UI.Toolbar.ItemsProvider}
 * @implements {UI.ContextMenu.Provider}
 * @unrestricted
 */
export class WatchExpressionsSidebarPane extends UI.ThrottledWidget.ThrottledWidget {
  constructor() {
    super(true);
    this.registerRequiredCSS('object_ui/objectValue.css');
    this.registerRequiredCSS('sources/watchExpressionsSidebarPane.css');

    // TODO(szuend): Replace with a Set once the web test
    //               sources/debugger-ui/watch-expressions-preserve-expansion.js is either converted
    //               to an e2e test or no longer accesses this variable directly.
    /** @type {!Array.<!WatchExpression>} */
    this._watchExpressions = [];
    this._watchExpressionsSetting = Common.Settings.Settings.instance().createLocalSetting('watchExpressions', []);

    this._addButton = new UI.Toolbar.ToolbarButton(ls`Add watch expression`, 'largeicon-add');
    this._addButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, event => {
      this._addButtonClicked();
    });
    this._refreshButton = new UI.Toolbar.ToolbarButton(ls`Refresh watch expressions`, 'largeicon-refresh');
    this._refreshButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, this.update, this);

    this.contentElement.classList.add('watch-expressions');
    this.contentElement.addEventListener('contextmenu', this._contextMenu.bind(this), false);
    this._treeOutline = new ObjectUI.ObjectPropertiesSection.ObjectPropertiesSectionsTreeOutline();
    this._treeOutline.registerRequiredCSS('sources/watchExpressionsSidebarPane.css');
    this._treeOutline.setShowSelectionOnKeyboardFocus(/* show */ true);
    this._expandController =
        new ObjectUI.ObjectPropertiesSection.ObjectPropertiesSectionsTreeExpandController(this._treeOutline);

    self.UI.context.addFlavorChangeListener(SDK.RuntimeModel.ExecutionContext, this.update, this);
    self.UI.context.addFlavorChangeListener(SDK.DebuggerModel.CallFrame, this.update, this);
    this._linkifier = new Components.Linkifier.Linkifier();
    this.update();
  }

  /**
   * @override
   * @return {!Array<!UI.Toolbar.ToolbarItem>}
   */
  toolbarItems() {
    return [this._addButton, this._refreshButton];
  }

  /**
   * @override
   */
  focus() {
    if (this.hasFocus()) {
      return;
    }
    if (this._watchExpressions.length > 0) {
      this._treeOutline.forceSelect();
    }
  }

  /**
   * @return {boolean}
   */
  hasExpressions() {
    return !!this._watchExpressionsSetting.get().length;
  }

  _saveExpressions() {
    const toSave = [];
    for (let i = 0; i < this._watchExpressions.length; i++) {
      if (this._watchExpressions[i].expression()) {
        toSave.push(this._watchExpressions[i].expression());
      }
    }

    this._watchExpressionsSetting.set(toSave);
  }

  async _addButtonClicked() {
    await UI.ViewManager.ViewManager.instance().showView('sources.watch');
    this._createWatchExpression(null).startEditing();
  }

  /**
   * @override
   * @return {!Promise.<?>}
   */
  doUpdate() {
    this._linkifier.reset();
    this.contentElement.removeChildren();
    this._treeOutline.removeChildren();
    this._watchExpressions = [];
    this._emptyElement = this.contentElement.createChild('div', 'gray-info-message');
    this._emptyElement.textContent = Common.UIString.UIString('No watch expressions');
    this._emptyElement.tabIndex = -1;
    const watchExpressionStrings = this._watchExpressionsSetting.get();
    for (let i = 0; i < watchExpressionStrings.length; ++i) {
      const expression = watchExpressionStrings[i];
      if (!expression) {
        continue;
      }

      this._createWatchExpression(expression);
    }
    return Promise.resolve();
  }

  /**
   * @param {?string} expression
   * @return {!WatchExpression}
   */
  _createWatchExpression(expression) {
    this._emptyElement.classList.add('hidden');
    this.contentElement.appendChild(this._treeOutline.element);
    const watchExpression = new WatchExpression(expression, this._expandController, this._linkifier);
    watchExpression.addEventListener(WatchExpression.Events.ExpressionUpdated, this._watchExpressionUpdated, this);
    this._treeOutline.appendChild(watchExpression.treeElement());
    this._watchExpressions.push(watchExpression);
    return watchExpression;
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _watchExpressionUpdated(event) {
    const watchExpression = /** @type {!WatchExpression} */ (event.data);
    if (!watchExpression.expression()) {
      Platform.ArrayUtilities.removeElement(this._watchExpressions, watchExpression);
      this._treeOutline.removeChild(watchExpression.treeElement());
      this._emptyElement.classList.toggle('hidden', !!this._watchExpressions.length);
      if (this._watchExpressions.length === 0) {
        this._treeOutline.element.remove();
      }
    }

    this._saveExpressions();
  }

  /**
   * @param {!Event} event
   */
  _contextMenu(event) {
    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    this._populateContextMenu(contextMenu, event);
    contextMenu.show();
  }

  /**
   * @param {!UI.ContextMenu.ContextMenu} contextMenu
   * @param {!Event} event
   */
  _populateContextMenu(contextMenu, event) {
    let isEditing = false;
    for (const watchExpression of this._watchExpressions) {
      isEditing |= watchExpression.isEditing();
    }

    if (!isEditing) {
      contextMenu.debugSection().appendItem(
          Common.UIString.UIString('Add watch expression'), this._addButtonClicked.bind(this));
    }

    if (this._watchExpressions.length > 1) {
      contextMenu.debugSection().appendItem(
          Common.UIString.UIString('Delete all watch expressions'), this._deleteAllButtonClicked.bind(this));
    }


    const treeElement = this._treeOutline.treeElementFromEvent(event);
    if (!treeElement) {
      return;
    }
    const currentWatchExpression =
        this._watchExpressions.find(watchExpression => treeElement.hasAncestorOrSelf(watchExpression.treeElement()));
    currentWatchExpression._populateContextMenu(contextMenu, event);
  }

  _deleteAllButtonClicked() {
    this._watchExpressions = [];
    this._saveExpressions();
    this.update();
  }

  /**
   * @param {string} expression
   */
  _focusAndAddExpressionToWatch(expression) {
    UI.ViewManager.ViewManager.instance().showView('sources.watch');
    this.doUpdate();
    this._addExpressionToWatch(expression);
  }

  /**
   * @param {string} expression
   */
  _addExpressionToWatch(expression) {
    this._createWatchExpression(expression);
    this._saveExpressions();
  }

  /**
   * @override
   * @param {!UI.Context.Context} context
   * @param {string} actionId
   * @return {boolean}
   */
  handleAction(context, actionId) {
    const frame = self.UI.context.flavor(UISourceCodeFrame);
    if (!frame) {
      return false;
    }
    const text = frame.textEditor.text(frame.textEditor.selection());
    this._focusAndAddExpressionToWatch(text);
    return true;
  }

  /**
   * @param {!ObjectUI.ObjectPropertiesSection.ObjectPropertyTreeElement} target
   */
  _addPropertyPathToWatch(target) {
    this._addExpressionToWatch(target.path());
  }

  /**
   * @override
   * @param {!Event} event
   * @param {!UI.ContextMenu.ContextMenu} contextMenu
   * @param {!Object} target
   */
  appendApplicableItems(event, contextMenu, target) {
    if (target instanceof ObjectUI.ObjectPropertiesSection.ObjectPropertyTreeElement && !target.property.synthetic) {
      contextMenu.debugSection().appendItem(
          ls`Add property path to watch`, this._addPropertyPathToWatch.bind(this, target));
    }

    const frame = self.UI.context.flavor(UISourceCodeFrame);
    if (!frame || frame.textEditor.selection().isEmpty()) {
      return;
    }

    contextMenu.debugSection().appendAction('sources.add-to-watch');
  }
}

/**
 * @unrestricted
 */
export class WatchExpression extends Common.ObjectWrapper.ObjectWrapper {
  /**
   * @param {?string} expression
   * @param {!ObjectUI.ObjectPropertiesSection.ObjectPropertiesSectionsTreeExpandController} expandController
   * @param {!Components.Linkifier.Linkifier} linkifier
   */
  constructor(expression, expandController, linkifier) {
    super();
    this._expression = expression;
    this._expandController = expandController;
    this._element = createElementWithClass('div', 'watch-expression monospace');
    this._editing = false;
    this._linkifier = linkifier;

    this._createWatchExpression();
    this.update();
  }

  /**
   * @return {!UI.TreeOutline.TreeElement}
   */
  treeElement() {
    return this._treeElement;
  }

  /**
   * @return {?string}
   */
  expression() {
    return this._expression;
  }

  update() {
    const currentExecutionContext = self.UI.context.flavor(SDK.RuntimeModel.ExecutionContext);
    if (currentExecutionContext && this._expression) {
      currentExecutionContext
          .evaluate(
              {
                expression: this._expression,
                objectGroup: WatchExpression._watchObjectGroupId,
                includeCommandLineAPI: false,
                silent: true,
                returnByValue: false,
                generatePreview: false
              },
              /* userGesture */ false,
              /* awaitPromise */ false)
          .then(result => this._createWatchExpression(result.object, result.exceptionDetails));
    }
  }

  startEditing() {
    this._editing = true;
    this._element.removeChildren();
    const newDiv = this._element.createChild('div');
    newDiv.textContent = this._nameElement.textContent;
    this._textPrompt = new ObjectUI.ObjectPropertiesSection.ObjectPropertyPrompt();
    this._textPrompt.renderAsBlock();
    const proxyElement = this._textPrompt.attachAndStartEditing(newDiv, this._finishEditing.bind(this));
    this._treeElement.listItemElement.classList.add('watch-expression-editing');
    proxyElement.classList.add('watch-expression-text-prompt-proxy');
    proxyElement.addEventListener('keydown', this._promptKeyDown.bind(this), false);
    this._element.getComponentSelection().selectAllChildren(newDiv);
  }

  /**
   * @return {boolean}
   */
  isEditing() {
    return !!this._editing;
  }

  /**
   * @param {!Event} event
   * @param {boolean=} canceled
   */
  _finishEditing(event, canceled) {
    if (event) {
      event.consume(canceled);
    }

    this._editing = false;
    this._treeElement.listItemElement.classList.remove('watch-expression-editing');
    this._textPrompt.detach();
    const newExpression = canceled ? this._expression : this._textPrompt.text();
    delete this._textPrompt;
    this._element.removeChildren();
    this._updateExpression(newExpression);
  }

  /**
   * @param {!Event} event
   */
  _dblClickOnWatchExpression(event) {
    event.consume();
    if (!this.isEditing()) {
      this.startEditing();
    }
  }

  /**
   * @param {?string} newExpression
   */
  _updateExpression(newExpression) {
    if (this._expression) {
      this._expandController.stopWatchSectionsWithId(this._expression);
    }
    this._expression = newExpression;
    this.update();
    this.dispatchEventToListeners(WatchExpression.Events.ExpressionUpdated, this);
  }

  /**
   * @param {!Event} event
   */
  _deleteWatchExpression(event) {
    event.consume(true);
    this._updateExpression(null);
  }

  /**
   * @param {!SDK.RemoteObject.RemoteObject=} result
   * @param {!Protocol.Runtime.ExceptionDetails=} exceptionDetails
   */
  _createWatchExpression(result, exceptionDetails) {
    this._result = result || null;

    this._element.removeChildren();
    const oldTreeElement = this._treeElement;
    this._createWatchExpressionTreeElement(result, exceptionDetails);
    if (oldTreeElement && oldTreeElement.parent) {
      const root = oldTreeElement.parent;
      const index = root.indexOfChild(oldTreeElement);
      root.removeChild(oldTreeElement);
      root.insertChild(this._treeElement, index);
    }
    this._treeElement.select();
  }

  /**
   * @param {!SDK.RemoteObject.RemoteObject=} expressionValue
   * @param {!Protocol.Runtime.ExceptionDetails=} exceptionDetails
   * @return {!Element}
   */
  _createWatchExpressionHeader(expressionValue, exceptionDetails) {
    const headerElement = this._element.createChild('div', 'watch-expression-header');
    const deleteButton = UI.Icon.Icon.create('smallicon-cross', 'watch-expression-delete-button');
    deleteButton.title = ls`Delete watch expression`;
    deleteButton.addEventListener('click', this._deleteWatchExpression.bind(this), false);
    headerElement.appendChild(deleteButton);

    const titleElement = headerElement.createChild('div', 'watch-expression-title tree-element-title');
    this._nameElement = ObjectUI.ObjectPropertiesSection.ObjectPropertiesSection.createNameElement(this._expression);
    if (!!exceptionDetails || !expressionValue) {
      this._valueElement = createElementWithClass('span', 'watch-expression-error value');
      titleElement.classList.add('dimmed');
      this._valueElement.textContent = Common.UIString.UIString('<not available>');
    } else {
      const propertyValue =
          ObjectUI.ObjectPropertiesSection.ObjectPropertiesSection.createPropertyValueWithCustomSupport(
              expressionValue, !!exceptionDetails, false /* showPreview */, titleElement, this._linkifier);
      this._valueElement = propertyValue.element;
    }
    const separatorElement = createElementWithClass('span', 'watch-expressions-separator');
    separatorElement.textContent = ': ';
    titleElement.appendChildren(this._nameElement, separatorElement, this._valueElement);

    return headerElement;
  }

  /**
   * @param {!SDK.RemoteObject.RemoteObject=} expressionValue
   * @param {!Protocol.Runtime.ExceptionDetails=} exceptionDetails
   */
  _createWatchExpressionTreeElement(expressionValue, exceptionDetails) {
    const headerElement = this._createWatchExpressionHeader(expressionValue, exceptionDetails);

    if (!exceptionDetails && expressionValue && expressionValue.hasChildren && !expressionValue.customPreview()) {
      headerElement.classList.add('watch-expression-object-header');
      this._treeElement = new ObjectUI.ObjectPropertiesSection.RootElement(expressionValue, this._linkifier);
      this._expandController.watchSection(/** @type {string} */ (this._expression), this._treeElement);
      this._treeElement.toggleOnClick = false;
      this._treeElement.listItemElement.addEventListener('click', this._onSectionClick.bind(this), false);
      this._treeElement.listItemElement.addEventListener('dblclick', this._dblClickOnWatchExpression.bind(this));
    } else {
      headerElement.addEventListener('dblclick', this._dblClickOnWatchExpression.bind(this));
      this._treeElement = new UI.TreeOutline.TreeElement();
    }
    this._treeElement.title = this._element;
    this._treeElement.listItemElement.classList.add('watch-expression-tree-item');
    this._treeElement.listItemElement.addEventListener('keydown', event => {
      if (isEnterKey(event) && !this.isEditing()) {
        this.startEditing();
        event.consume(true);
      }
    });
  }

  /**
   * @param {!Event} event
   */
  _onSectionClick(event) {
    event.consume(true);
    if (event.detail === 1) {
      this._preventClickTimeout = setTimeout(handleClick.bind(this), 333);
    } else {
      clearTimeout(this._preventClickTimeout);
      delete this._preventClickTimeout;
    }

    /**
     * @this {WatchExpression}
     */
    function handleClick() {
      if (!this._treeElement) {
        return;
      }

      if (this._treeElement.expanded) {
        this._treeElement.collapse();
      } else {
        this._treeElement.expand();
      }
    }
  }

  /**
   * @param {!Event} event
   */
  _promptKeyDown(event) {
    if (isEnterKey(event) || isEscKey(event)) {
      this._finishEditing(event, isEscKey(event));
    }
  }

  /**
   * @param {!UI.ContextMenu.ContextMenu} contextMenu
   * @param {!Event} event
   */
  _populateContextMenu(contextMenu, event) {
    if (!this.isEditing()) {
      contextMenu.editSection().appendItem(
          Common.UIString.UIString('Delete watch expression'), this._updateExpression.bind(this, null));
    }


    if (!this.isEditing() && this._result && (this._result.type === 'number' || this._result.type === 'string')) {
      contextMenu.clipboardSection().appendItem(
          Common.UIString.UIString('Copy value'), this._copyValueButtonClicked.bind(this));
    }

    const target = event.deepElementFromPoint();
    if (target && this._valueElement.isSelfOrAncestor(target)) {
      contextMenu.appendApplicableItems(this._result);
    }
  }

  _copyValueButtonClicked() {
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(this._valueElement.textContent);
  }
}

WatchExpression._watchObjectGroupId = 'watch-group';

/** @enum {symbol} */
WatchExpression.Events = {
  ExpressionUpdated: Symbol('ExpressionUpdated')
};
