/*
 * Copyright (C) 2012 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 * 1. Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *
 * 2. Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY GOOGLE INC. AND ITS CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL GOOGLE INC.
 * OR ITS CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * @unrestricted
 */
Sources.UISourceCodeFrame = class extends SourceFrame.SourceFrame {
  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   */
  constructor(uiSourceCode) {
    super(uiSourceCode.contentURL(), workingCopy);
    this._uiSourceCode = uiSourceCode;
    this.setEditable(this._canEditSource());

    if (Runtime.experiments.isEnabled('sourceDiff'))
      this._diff = new Sources.SourceCodeDiff(uiSourceCode.requestOriginalContent(), this.textEditor);

    /** @type {?UI.AutocompleteConfig} */
    this._autocompleteConfig = {isWordChar: Common.TextUtils.isWordChar};
    Common.moduleSetting('textEditorAutocompletion').addChangeListener(this._updateAutocomplete, this);
    this._updateAutocomplete();

    /** @type {!Map<number, !Sources.UISourceCodeFrame.RowMessageBucket>} */
    this._rowMessageBuckets = new Map();
    /** @type {!Set<string>} */
    this._typeDecorationsPending = new Set();
    this._uiSourceCode.addEventListener(
        Workspace.UISourceCode.Events.WorkingCopyChanged, this._onWorkingCopyChanged, this);
    this._uiSourceCode.addEventListener(
        Workspace.UISourceCode.Events.WorkingCopyCommitted, this._onWorkingCopyCommitted, this);
    this._uiSourceCode.addEventListener(Workspace.UISourceCode.Events.MessageAdded, this._onMessageAdded, this);
    this._uiSourceCode.addEventListener(Workspace.UISourceCode.Events.MessageRemoved, this._onMessageRemoved, this);
    this._uiSourceCode.addEventListener(
        Workspace.UISourceCode.Events.LineDecorationAdded, this._onLineDecorationAdded, this);
    this._uiSourceCode.addEventListener(
        Workspace.UISourceCode.Events.LineDecorationRemoved, this._onLineDecorationRemoved, this);
    Persistence.persistence.addEventListener(
        Persistence.Persistence.Events.BindingCreated, this._onBindingChanged, this);
    Persistence.persistence.addEventListener(
        Persistence.Persistence.Events.BindingRemoved, this._onBindingChanged, this);

    this.textEditor.addEventListener(
        SourceFrame.SourcesTextEditor.Events.EditorBlurred,
        () => UI.context.setFlavor(Sources.UISourceCodeFrame, null));
    this.textEditor.addEventListener(
        SourceFrame.SourcesTextEditor.Events.EditorFocused,
        () => UI.context.setFlavor(Sources.UISourceCodeFrame, this));

    this._updateStyle();

    this._errorPopoverHelper = new UI.PopoverHelper(this.element);
    this._errorPopoverHelper.initializeCallbacks(this._getErrorAnchor.bind(this), this._showErrorPopover.bind(this));

    this._errorPopoverHelper.setTimeout(100, 100);

    /**
     * @return {!Promise<?string>}
     */
    function workingCopy() {
      if (uiSourceCode.isDirty())
        return /** @type {!Promise<?string>} */ (Promise.resolve(uiSourceCode.workingCopy()));
      return uiSourceCode.requestContent();
    }
  }

  /**
   * @return {!Workspace.UISourceCode}
   */
  uiSourceCode() {
    return this._uiSourceCode;
  }

  /**
   * @override
   */
  wasShown() {
    super.wasShown();
    this._boundWindowFocused = this._windowFocused.bind(this);
    this.element.ownerDocument.defaultView.addEventListener('focus', this._boundWindowFocused, false);
    this._checkContentUpdated();
    // We need CodeMirrorTextEditor to be initialized prior to this call as it calls |cursorPositionToCoordinates| internally. @see crbug.com/506566
    setImmediate(this._updateBucketDecorations.bind(this));
  }

  /**
   * @override
   */
  willHide() {
    super.willHide();
    UI.context.setFlavor(Sources.UISourceCodeFrame, null);
    this.element.ownerDocument.defaultView.removeEventListener('focus', this._boundWindowFocused, false);
    delete this._boundWindowFocused;
    this._uiSourceCode.removeWorkingCopyGetter();
  }

  /**
   * @return {boolean}
   */
  _canEditSource() {
    if (Persistence.persistence.binding(this._uiSourceCode))
      return true;
    var projectType = this._uiSourceCode.project().type();
    if (projectType === Workspace.projectTypes.Service || projectType === Workspace.projectTypes.Debugger ||
        projectType === Workspace.projectTypes.Formatter)
      return false;
    if (projectType === Workspace.projectTypes.Network &&
        this._uiSourceCode.contentType() === Common.resourceTypes.Document)
      return false;
    return true;
  }

  _windowFocused(event) {
    this._checkContentUpdated();
  }

  _checkContentUpdated() {
    if (!this.loaded || !this.isShowing())
      return;
    this._uiSourceCode.checkContentUpdated(true);
  }

  commitEditing() {
    if (!this._uiSourceCode.isDirty())
      return;

    this._muteSourceCodeEvents = true;
    this._uiSourceCode.commitWorkingCopy();
    delete this._muteSourceCodeEvents;
  }

  /**
   * @override
   */
  onTextEditorContentSet() {
    if (this._diff)
      this._diff.updateDiffMarkersImmediately();
    super.onTextEditorContentSet();
    for (var message of this._uiSourceCode.messages())
      this._addMessageToSource(message);
    this._decorateAllTypes();
  }

  /**
   * @override
   * @param {!Common.TextRange} oldRange
   * @param {!Common.TextRange} newRange
   */
  onTextChanged(oldRange, newRange) {
    if (this._diff)
      this._diff.updateDiffMarkersWhenPossible();
    super.onTextChanged(oldRange, newRange);
    this._errorPopoverHelper.hidePopover();
    if (this._isSettingContent)
      return;
    this._muteSourceCodeEvents = true;
    if (this._textEditor.isClean())
      this._uiSourceCode.resetWorkingCopy();
    else
      this._uiSourceCode.setWorkingCopyGetter(this._textEditor.text.bind(this._textEditor));
    delete this._muteSourceCodeEvents;
  }

  /**
   * @param {!Common.Event} event
   */
  _onWorkingCopyChanged(event) {
    if (this._muteSourceCodeEvents)
      return;
    this._innerSetContent(this._uiSourceCode.workingCopy());
    this.onUISourceCodeContentChanged();
  }

  /**
   * @param {!Common.Event} event
   */
  _onWorkingCopyCommitted(event) {
    if (!this._muteSourceCodeEvents) {
      this._innerSetContent(this._uiSourceCode.workingCopy());
      this.onUISourceCodeContentChanged();
    }
    this._textEditor.markClean();
    this._updateStyle();
  }

  /**
   * @param {!Common.Event} event
   */
  _onBindingChanged(event) {
    var binding = /** @type {!Persistence.PersistenceBinding} */ (event.data);
    if (binding.network === this._uiSourceCode || binding.fileSystem === this._uiSourceCode)
      this._updateStyle();
  }

  _updateStyle() {
    this.element.classList.toggle(
        'source-frame-unsaved-committed-changes',
        Persistence.persistence.hasUnsavedCommittedChanges(this._uiSourceCode));
    this.setEditable(!this._canEditSource());
  }

  onUISourceCodeContentChanged() {
  }

  _updateAutocomplete() {
    this._textEditor.configureAutocomplete(
        Common.moduleSetting('textEditorAutocompletion').get() ? this._autocompleteConfig : null);
  }

  /**
   * @param {?UI.AutocompleteConfig} config
   */
  configureAutocomplete(config) {
    this._autocompleteConfig = config;
    this._updateAutocomplete();
  }

  /**
   * @param {string} content
   */
  _innerSetContent(content) {
    this._isSettingContent = true;
    if (this._diff) {
      var oldContent = this._textEditor.text();
      this.setContent(content);
      this._diff.highlightModifiedLines(oldContent, content);
    } else {
      this.setContent(content);
    }
    delete this._isSettingContent;
  }

  /**
   * @override
   * @return {!Promise}
   */
  populateTextAreaContextMenu(contextMenu, lineNumber, columnNumber) {
    /**
     * @this {Sources.UISourceCodeFrame}
     */
    function appendItems() {
      contextMenu.appendApplicableItems(this._uiSourceCode);
      contextMenu.appendApplicableItems(new Workspace.UILocation(this._uiSourceCode, lineNumber, columnNumber));
      contextMenu.appendApplicableItems(this);
    }

    return super.populateTextAreaContextMenu(contextMenu, lineNumber, columnNumber).then(appendItems.bind(this));
  }

  /**
   * @param {!Array.<!UI.Infobar|undefined>} infobars
   */
  attachInfobars(infobars) {
    for (var i = infobars.length - 1; i >= 0; --i) {
      var infobar = infobars[i];
      if (!infobar)
        continue;
      this.element.insertBefore(infobar.element, this.element.children[0]);
      infobar.setParentView(this);
    }
    this.doResize();
  }

  dispose() {
    this._textEditor.dispose();
    Common.moduleSetting('textEditorAutocompletion').removeChangeListener(this._updateAutocomplete, this);
    this.detach();
  }

  /**
   * @param {!Common.Event} event
   */
  _onMessageAdded(event) {
    if (!this.loaded)
      return;
    var message = /** @type {!Workspace.UISourceCode.Message} */ (event.data);
    this._addMessageToSource(message);
  }

  /**
   * @param {!Workspace.UISourceCode.Message} message
   */
  _addMessageToSource(message) {
    var lineNumber = message.lineNumber();
    if (lineNumber >= this._textEditor.linesCount)
      lineNumber = this._textEditor.linesCount - 1;
    if (lineNumber < 0)
      lineNumber = 0;

    var messageBucket = this._rowMessageBuckets.get(lineNumber);
    if (!messageBucket) {
      messageBucket = new Sources.UISourceCodeFrame.RowMessageBucket(this, this._textEditor, lineNumber);
      this._rowMessageBuckets.set(lineNumber, messageBucket);
    }
    messageBucket.addMessage(message);
  }

  /**
   * @param {!Common.Event} event
   */
  _onMessageRemoved(event) {
    if (!this.loaded)
      return;
    var message = /** @type {!Workspace.UISourceCode.Message} */ (event.data);
    this._removeMessageFromSource(message);
  }

  /**
   * @param {!Workspace.UISourceCode.Message} message
   */
  _removeMessageFromSource(message) {
    var lineNumber = message.lineNumber();
    if (lineNumber >= this._textEditor.linesCount)
      lineNumber = this._textEditor.linesCount - 1;
    if (lineNumber < 0)
      lineNumber = 0;

    var messageBucket = this._rowMessageBuckets.get(lineNumber);
    if (!messageBucket)
      return;
    messageBucket.removeMessage(message);
    if (!messageBucket.uniqueMessagesCount()) {
      messageBucket.detachFromEditor();
      this._rowMessageBuckets.delete(lineNumber);
    }
  }

  /**
   * @param {!Element} target
   * @param {!Event} event
   * @return {(!Element|undefined)}
   */
  _getErrorAnchor(target, event) {
    var element = target.enclosingNodeOrSelfWithClass('text-editor-line-decoration-icon') ||
        target.enclosingNodeOrSelfWithClass('text-editor-line-decoration-wave');
    if (!element)
      return;
    this._errorWavePopoverAnchor = new AnchorBox(event.clientX, event.clientY, 1, 1);
    return element;
  }

  /**
   * @param {!Element} anchor
   * @param {!UI.Popover} popover
   */
  _showErrorPopover(anchor, popover) {
    var messageBucket = anchor.enclosingNodeOrSelfWithClass('text-editor-line-decoration')._messageBucket;
    var messagesOutline = messageBucket.messagesDescription();
    var popoverAnchor =
        anchor.enclosingNodeOrSelfWithClass('text-editor-line-decoration-icon') ? anchor : this._errorWavePopoverAnchor;
    popover.showForAnchor(messagesOutline, popoverAnchor);
  }

  _updateBucketDecorations() {
    for (var bucket of this._rowMessageBuckets.values())
      bucket._updateDecoration();
  }

  /**
   * @param {!Common.Event} event
   */
  _onLineDecorationAdded(event) {
    var marker = /** @type {!Workspace.UISourceCode.LineMarker} */ (event.data);
    this._decorateTypeThrottled(marker.type());
  }

  /**
   * @param {!Common.Event} event
   */
  _onLineDecorationRemoved(event) {
    var marker = /** @type {!Workspace.UISourceCode.LineMarker} */ (event.data);
    this._decorateTypeThrottled(marker.type());
  }

  /**
   * @param {string} type
   */
  _decorateTypeThrottled(type) {
    if (this._typeDecorationsPending.has(type))
      return;
    this._typeDecorationsPending.add(type);
    self.runtime.extensions(Sources.UISourceCodeFrame.LineDecorator)
        .find(extension => extension.descriptor()['decoratorType'] === type)
        .instance()
        .then(decorator => {
          this._typeDecorationsPending.delete(type);
          decorator.decorate(this.uiSourceCode(), this._textEditor);
        });
  }

  _decorateAllTypes() {
    var extensions = self.runtime.extensions(Sources.UISourceCodeFrame.LineDecorator);
    extensions.forEach(extension => this._decorateTypeThrottled(extension.descriptor()['decoratorType']));
  }
};

Sources.UISourceCodeFrame._iconClassPerLevel = {};
Sources.UISourceCodeFrame._iconClassPerLevel[Workspace.UISourceCode.Message.Level.Error] = 'smallicon-error';
Sources.UISourceCodeFrame._iconClassPerLevel[Workspace.UISourceCode.Message.Level.Warning] = 'smallicon-warning';

Sources.UISourceCodeFrame._bubbleTypePerLevel = {};
Sources.UISourceCodeFrame._bubbleTypePerLevel[Workspace.UISourceCode.Message.Level.Error] = 'error';
Sources.UISourceCodeFrame._bubbleTypePerLevel[Workspace.UISourceCode.Message.Level.Warning] = 'warning';

Sources.UISourceCodeFrame._lineClassPerLevel = {};
Sources.UISourceCodeFrame._lineClassPerLevel[Workspace.UISourceCode.Message.Level.Error] =
    'text-editor-line-with-error';
Sources.UISourceCodeFrame._lineClassPerLevel[Workspace.UISourceCode.Message.Level.Warning] =
    'text-editor-line-with-warning';

/**
 * @interface
 */
Sources.UISourceCodeFrame.LineDecorator = function() {};

Sources.UISourceCodeFrame.LineDecorator.prototype = {
  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @param {!TextEditor.CodeMirrorTextEditor} textEditor
   */
  decorate(uiSourceCode, textEditor) {}
};

/**
 * @unrestricted
 */
Sources.UISourceCodeFrame.RowMessage = class {
  /**
   * @param {!Workspace.UISourceCode.Message} message
   */
  constructor(message) {
    this._message = message;
    this._repeatCount = 1;
    this.element = createElementWithClass('div', 'text-editor-row-message');
    this._icon = this.element.createChild('label', '', 'dt-icon-label');
    this._icon.type = Sources.UISourceCodeFrame._iconClassPerLevel[message.level()];
    this._repeatCountElement = this.element.createChild('label', 'message-repeat-count hidden', 'dt-small-bubble');
    this._repeatCountElement.type = Sources.UISourceCodeFrame._bubbleTypePerLevel[message.level()];
    var linesContainer = this.element.createChild('div', 'text-editor-row-message-lines');
    var lines = this._message.text().split('\n');
    for (var i = 0; i < lines.length; ++i) {
      var messageLine = linesContainer.createChild('div');
      messageLine.textContent = lines[i];
    }
  }

  /**
   * @return {!Workspace.UISourceCode.Message}
   */
  message() {
    return this._message;
  }

  /**
   * @return {number}
   */
  repeatCount() {
    return this._repeatCount;
  }

  setRepeatCount(repeatCount) {
    if (this._repeatCount === repeatCount)
      return;
    this._repeatCount = repeatCount;
    this._updateMessageRepeatCount();
  }

  _updateMessageRepeatCount() {
    this._repeatCountElement.textContent = this._repeatCount;
    var showRepeatCount = this._repeatCount > 1;
    this._repeatCountElement.classList.toggle('hidden', !showRepeatCount);
    this._icon.classList.toggle('hidden', showRepeatCount);
  }
};

/**
 * @unrestricted
 */
Sources.UISourceCodeFrame.RowMessageBucket = class {
  /**
   * @param {!Sources.UISourceCodeFrame} sourceFrame
   * @param {!TextEditor.CodeMirrorTextEditor} textEditor
   * @param {number} lineNumber
   */
  constructor(sourceFrame, textEditor, lineNumber) {
    this._sourceFrame = sourceFrame;
    this._textEditor = textEditor;
    this._lineHandle = textEditor.textEditorPositionHandle(lineNumber, 0);
    this._decoration = createElementWithClass('div', 'text-editor-line-decoration');
    this._decoration._messageBucket = this;
    this._wave = this._decoration.createChild('div', 'text-editor-line-decoration-wave');
    this._icon = this._wave.createChild('label', 'text-editor-line-decoration-icon', 'dt-icon-label');
    this._hasDecoration = false;

    this._messagesDescriptionElement = createElementWithClass('div', 'text-editor-messages-description-container');
    /** @type {!Array.<!Sources.UISourceCodeFrame.RowMessage>} */
    this._messages = [];

    this._level = null;
  }

  /**
   * @param {number} lineNumber
   * @param {number} columnNumber
   */
  _updateWavePosition(lineNumber, columnNumber) {
    lineNumber = Math.min(lineNumber, this._textEditor.linesCount - 1);
    var lineText = this._textEditor.line(lineNumber);
    columnNumber = Math.min(columnNumber, lineText.length);
    var lineIndent = Common.TextUtils.lineIndent(lineText).length;
    if (this._hasDecoration)
      this._textEditor.removeDecoration(this._decoration, lineNumber);
    this._hasDecoration = true;
    this._textEditor.addDecoration(this._decoration, lineNumber, Math.max(columnNumber - 1, lineIndent));
  }

  /**
   * @return {!Element}
   */
  messagesDescription() {
    this._messagesDescriptionElement.removeChildren();
    for (var i = 0; i < this._messages.length; ++i)
      this._messagesDescriptionElement.appendChild(this._messages[i].element);

    return this._messagesDescriptionElement;
  }

  detachFromEditor() {
    var position = this._lineHandle.resolve();
    if (!position)
      return;
    var lineNumber = position.lineNumber;
    if (this._level)
      this._textEditor.toggleLineClass(lineNumber, Sources.UISourceCodeFrame._lineClassPerLevel[this._level], false);
    if (this._hasDecoration)
      this._textEditor.removeDecoration(this._decoration, lineNumber);
    this._hasDecoration = false;
  }

  /**
   * @return {number}
   */
  uniqueMessagesCount() {
    return this._messages.length;
  }

  /**
   * @param {!Workspace.UISourceCode.Message} message
   */
  addMessage(message) {
    for (var i = 0; i < this._messages.length; ++i) {
      var rowMessage = this._messages[i];
      if (rowMessage.message().isEqual(message)) {
        rowMessage.setRepeatCount(rowMessage.repeatCount() + 1);
        return;
      }
    }

    var rowMessage = new Sources.UISourceCodeFrame.RowMessage(message);
    this._messages.push(rowMessage);
    this._updateDecoration();
  }

  /**
   * @param {!Workspace.UISourceCode.Message} message
   */
  removeMessage(message) {
    for (var i = 0; i < this._messages.length; ++i) {
      var rowMessage = this._messages[i];
      if (!rowMessage.message().isEqual(message))
        continue;
      rowMessage.setRepeatCount(rowMessage.repeatCount() - 1);
      if (!rowMessage.repeatCount())
        this._messages.splice(i, 1);
      this._updateDecoration();
      return;
    }
  }

  _updateDecoration() {
    if (!this._sourceFrame.isEditorShowing())
      return;
    if (!this._messages.length)
      return;
    var position = this._lineHandle.resolve();
    if (!position)
      return;

    var lineNumber = position.lineNumber;
    var columnNumber = Number.MAX_VALUE;
    var maxMessage = null;
    for (var i = 0; i < this._messages.length; ++i) {
      var message = this._messages[i].message();
      columnNumber = Math.min(columnNumber, message.columnNumber());
      if (!maxMessage || Workspace.UISourceCode.Message.messageLevelComparator(maxMessage, message) < 0)
        maxMessage = message;
    }
    this._updateWavePosition(lineNumber, columnNumber);

    if (this._level) {
      this._textEditor.toggleLineClass(lineNumber, Sources.UISourceCodeFrame._lineClassPerLevel[this._level], false);
      this._icon.type = '';
    }
    this._level = maxMessage.level();
    if (!this._level)
      return;
    this._textEditor.toggleLineClass(lineNumber, Sources.UISourceCodeFrame._lineClassPerLevel[this._level], true);
    this._icon.type = Sources.UISourceCodeFrame._iconClassPerLevel[this._level];
  }
};

Workspace.UISourceCode.Message._messageLevelPriority = {
  'Warning': 3,
  'Error': 4
};

/**
 * @param {!Workspace.UISourceCode.Message} a
 * @param {!Workspace.UISourceCode.Message} b
 * @return {number}
 */
Workspace.UISourceCode.Message.messageLevelComparator = function(a, b) {
  return Workspace.UISourceCode.Message._messageLevelPriority[a.level()] -
      Workspace.UISourceCode.Message._messageLevelPriority[b.level()];
};
