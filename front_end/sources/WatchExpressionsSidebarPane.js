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
/**
 * @implements {UI.ActionDelegate}
 * @implements {UI.ToolbarItem.ItemsProvider}
 * @implements {UI.ContextMenu.Provider}
 * @unrestricted
 */
Sources.WatchExpressionsSidebarPane = class extends UI.ThrottledWidget {
  constructor() {
    super();
    this.registerRequiredCSS('components/objectValue.css');

    /** @type {!Array.<!Sources.WatchExpression>} */
    this._watchExpressions = [];
    this._watchExpressionsSetting = Common.settings.createLocalSetting('watchExpressions', []);

    this._addButton = new UI.ToolbarButton(Common.UIString('Add expression'), 'largeicon-add');
    this._addButton.addEventListener(UI.ToolbarButton.Events.Click, this._addButtonClicked.bind(this));
    this._refreshButton = new UI.ToolbarButton(Common.UIString('Refresh'), 'largeicon-refresh');
    this._refreshButton.addEventListener(UI.ToolbarButton.Events.Click, this.update, this);

    this._bodyElement = this.element.createChild('div', 'vbox watch-expressions');
    this._bodyElement.addEventListener('contextmenu', this._contextMenu.bind(this), false);
    this._expandController = new Components.ObjectPropertiesSectionExpandController();

    UI.context.addFlavorChangeListener(SDK.ExecutionContext, this.update, this);
    UI.context.addFlavorChangeListener(SDK.DebuggerModel.CallFrame, this.update, this);
    this._linkifier = new Components.Linkifier();
    this.update();
  }

  /**
   * @override
   * @return {!Array<!UI.ToolbarItem>}
   */
  toolbarItems() {
    return [this._addButton, this._refreshButton];
  }

  /**
   * @return {boolean}
   */
  hasExpressions() {
    return !!this._watchExpressionsSetting.get().length;
  }

  _saveExpressions() {
    var toSave = [];
    for (var i = 0; i < this._watchExpressions.length; i++) {
      if (this._watchExpressions[i].expression())
        toSave.push(this._watchExpressions[i].expression());
    }

    this._watchExpressionsSetting.set(toSave);
  }

  _addButtonClicked() {
    UI.viewManager.showView('sources.watch');
    this._createWatchExpression(null).startEditing();
  }

  /**
   * @override
   * @return {!Promise.<?>}
   */
  doUpdate() {
    this._linkifier.reset();
    this._bodyElement.removeChildren();
    this._watchExpressions = [];
    this._emptyElement = this._bodyElement.createChild('div', 'gray-info-message');
    this._emptyElement.textContent = Common.UIString('No Watch Expressions');
    var watchExpressionStrings = this._watchExpressionsSetting.get();
    for (var i = 0; i < watchExpressionStrings.length; ++i) {
      var expression = watchExpressionStrings[i];
      if (!expression)
        continue;

      this._createWatchExpression(expression);
    }
    return Promise.resolve();
  }

  /**
   * @param {?string} expression
   * @return {!Sources.WatchExpression}
   */
  _createWatchExpression(expression) {
    this._emptyElement.classList.add('hidden');
    var watchExpression = new Sources.WatchExpression(expression, this._expandController, this._linkifier);
    watchExpression.addEventListener(
        Sources.WatchExpression.Events.ExpressionUpdated, this._watchExpressionUpdated, this);
    this._bodyElement.appendChild(watchExpression.element());
    this._watchExpressions.push(watchExpression);
    return watchExpression;
  }

  /**
   * @param {!Common.Event} event
   */
  _watchExpressionUpdated(event) {
    var watchExpression = /** @type {!Sources.WatchExpression} */ (event.data);
    if (!watchExpression.expression()) {
      this._watchExpressions.remove(watchExpression);
      this._bodyElement.removeChild(watchExpression.element());
      this._emptyElement.classList.toggle('hidden', !!this._watchExpressions.length);
    }

    this._saveExpressions();
  }

  /**
   * @param {!Event} event
   */
  _contextMenu(event) {
    var contextMenu = new UI.ContextMenu(event);
    this._populateContextMenu(contextMenu, event);
    contextMenu.show();
  }

  /**
   * @param {!UI.ContextMenu} contextMenu
   * @param {!Event} event
   */
  _populateContextMenu(contextMenu, event) {
    var isEditing = false;
    for (var watchExpression of this._watchExpressions)
      isEditing |= watchExpression.isEditing();

    if (!isEditing)
      contextMenu.appendItem(Common.UIString.capitalize('Add ^watch ^expression'), this._addButtonClicked.bind(this));

    if (this._watchExpressions.length > 1) {
      contextMenu.appendItem(
          Common.UIString.capitalize('Delete ^all ^watch ^expressions'), this._deleteAllButtonClicked.bind(this));
    }

    var target = event.deepElementFromPoint();
    if (!target)
      return;
    for (var watchExpression of this._watchExpressions) {
      if (watchExpression.element().isSelfOrAncestor(target))
        watchExpression._populateContextMenu(contextMenu, event);
    }
  }

  _deleteAllButtonClicked() {
    this._watchExpressions = [];
    this._saveExpressions();
    this.update();
  }

  /**
   * @override
   * @param {!UI.Context} context
   * @param {string} actionId
   * @return {boolean}
   */
  handleAction(context, actionId) {
    var frame = UI.context.flavor(SourceFrame.UISourceCodeFrame);
    if (!frame)
      return false;
    var text = frame.textEditor.text(frame.textEditor.selection());
    UI.viewManager.showView('sources.watch');
    this.doUpdate();
    this._createWatchExpression(text);
    this._saveExpressions();
    return true;
  }

  /**
   * @override
   * @param {!Event} event
   * @param {!UI.ContextMenu} contextMenu
   * @param {!Object} target
   */
  appendApplicableItems(event, contextMenu, target) {
    contextMenu.appendAction('sources.add-to-watch');
  }
};

/**
 * @unrestricted
 */
Sources.WatchExpression = class extends Common.Object {
  /**
   * @param {?string} expression
   * @param {!Components.ObjectPropertiesSectionExpandController} expandController
   * @param {!Components.Linkifier} linkifier
   */
  constructor(expression, expandController, linkifier) {
    super();
    this._expression = expression;
    this._expandController = expandController;
    this._element = createElementWithClass('div', 'watch-expression monospace');
    this._editing = false;
    this._linkifier = linkifier;

    this._createWatchExpression(null);
    this.update();
  }

  /**
   * @return {!Element}
   */
  element() {
    return this._element;
  }

  /**
   * @return {?string}
   */
  expression() {
    return this._expression;
  }

  update() {
    var currentExecutionContext = UI.context.flavor(SDK.ExecutionContext);
    if (currentExecutionContext && this._expression) {
      currentExecutionContext.evaluate(
          this._expression, Sources.WatchExpression._watchObjectGroupId, false, true, false, false, false,
          this._createWatchExpression.bind(this));
    }
  }

  startEditing() {
    this._editing = true;
    this._element.removeChild(this._objectPresentationElement);
    var newDiv = this._element.createChild('div');
    newDiv.textContent = this._nameElement.textContent;
    this._textPrompt = new Components.ObjectPropertyPrompt();
    this._textPrompt.renderAsBlock();
    var proxyElement = this._textPrompt.attachAndStartEditing(newDiv, this._finishEditing.bind(this));
    proxyElement.classList.add('watch-expression-text-prompt-proxy');
    proxyElement.addEventListener('keydown', this._promptKeyDown.bind(this), false);
    this._element.getComponentSelection().setBaseAndExtent(newDiv, 0, newDiv, 1);
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
    if (event)
      event.consume(true);

    this._editing = false;
    this._textPrompt.detach();
    var newExpression = canceled ? this._expression : this._textPrompt.text();
    delete this._textPrompt;
    this._element.removeChildren();
    this._element.appendChild(this._objectPresentationElement);
    this._updateExpression(newExpression);
  }

  /**
   * @param {!Event} event
   */
  _dblClickOnWatchExpression(event) {
    event.consume();
    if (!this.isEditing())
      this.startEditing();
  }

  /**
   * @param {?string} newExpression
   */
  _updateExpression(newExpression) {
    if (this._expression)
      this._expandController.stopWatchSectionsWithId(this._expression);
    this._expression = newExpression;
    this.update();
    this.dispatchEventToListeners(Sources.WatchExpression.Events.ExpressionUpdated, this);
  }

  /**
   * @param {!Event} event
   */
  _deleteWatchExpression(event) {
    event.consume(true);
    this._updateExpression(null);
  }

  /**
   * @param {?SDK.RemoteObject} result
   * @param {!Protocol.Runtime.ExceptionDetails=} exceptionDetails
   */
  _createWatchExpression(result, exceptionDetails) {
    this._result = result;

    var headerElement = createElementWithClass('div', 'watch-expression-header');
    var deleteButton = headerElement.createChild('button', 'watch-expression-delete-button');
    deleteButton.title = Common.UIString('Delete watch expression');
    deleteButton.addEventListener('click', this._deleteWatchExpression.bind(this), false);

    var titleElement = headerElement.createChild('div', 'watch-expression-title');
    this._nameElement = Components.ObjectPropertiesSection.createNameElement(this._expression);
    if (!!exceptionDetails || !result) {
      this._valueElement = createElementWithClass('span', 'watch-expression-error value');
      titleElement.classList.add('dimmed');
      this._valueElement.textContent = Common.UIString('<not available>');
    } else {
      this._valueElement = Components.ObjectPropertiesSection.createValueElementWithCustomSupport(
          result, !!exceptionDetails, false /* showPreview */, titleElement, this._linkifier);
    }
    var separatorElement = createElementWithClass('span', 'watch-expressions-separator');
    separatorElement.textContent = ': ';
    titleElement.appendChildren(this._nameElement, separatorElement, this._valueElement);

    this._element.removeChildren();
    this._objectPropertiesSection = null;
    if (!exceptionDetails && result && result.hasChildren && !result.customPreview()) {
      headerElement.classList.add('watch-expression-object-header');
      this._objectPropertiesSection = new Components.ObjectPropertiesSection(result, headerElement, this._linkifier);
      this._objectPresentationElement = this._objectPropertiesSection.element;
      this._expandController.watchSection(/** @type {string} */ (this._expression), this._objectPropertiesSection);
      var objectTreeElement = this._objectPropertiesSection.objectTreeElement();
      objectTreeElement.toggleOnClick = false;
      objectTreeElement.listItemElement.addEventListener('click', this._onSectionClick.bind(this), false);
      objectTreeElement.listItemElement.addEventListener('dblclick', this._dblClickOnWatchExpression.bind(this));
    } else {
      this._objectPresentationElement = headerElement;
      this._objectPresentationElement.addEventListener('dblclick', this._dblClickOnWatchExpression.bind(this));
    }

    this._element.appendChild(this._objectPresentationElement);
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
     * @this {Sources.WatchExpression}
     */
    function handleClick() {
      if (!this._objectPropertiesSection)
        return;

      var objectTreeElement = this._objectPropertiesSection.objectTreeElement();
      if (objectTreeElement.expanded)
        objectTreeElement.collapse();
      else
        objectTreeElement.expand();
    }
  }

  /**
   * @param {!Event} event
   */
  _promptKeyDown(event) {
    if (isEnterKey(event) || isEscKey(event))
      this._finishEditing(event, isEscKey(event));
  }

  /**
   * @param {!UI.ContextMenu} contextMenu
   * @param {!Event} event
   */
  _populateContextMenu(contextMenu, event) {
    if (!this.isEditing()) {
      contextMenu.appendItem(
          Common.UIString.capitalize('Delete ^watch ^expression'), this._updateExpression.bind(this, null));
    }

    if (!this.isEditing() && this._result && (this._result.type === 'number' || this._result.type === 'string'))
      contextMenu.appendItem(Common.UIString.capitalize('Copy ^value'), this._copyValueButtonClicked.bind(this));

    var target = event.deepElementFromPoint();
    if (target && this._valueElement.isSelfOrAncestor(target))
      contextMenu.appendApplicableItems(this._result);
  }

  _copyValueButtonClicked() {
    InspectorFrontendHost.copyText(this._valueElement.textContent);
  }
};

Sources.WatchExpression._watchObjectGroupId = 'watch-group';

/** @enum {symbol} */
Sources.WatchExpression.Events = {
  ExpressionUpdated: Symbol('ExpressionUpdated')
};
