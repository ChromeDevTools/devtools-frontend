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
SourceFrame.UISourceCodeFrame = class extends SourceFrame.SourceFrame {
  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   */
  constructor(uiSourceCode) {
    super(workingCopy);
    this._uiSourceCode = uiSourceCode;
    this.setEditable(this._canEditSource());

    if (Runtime.experiments.isEnabled('sourceDiff'))
      this._diff = new SourceFrame.SourceCodeDiff(WorkspaceDiff.workspaceDiff(), this.textEditor);

    this._muteSourceCodeEvents = false;
    this._isSettingContent = false;

    /** @type {?UI.AutocompleteConfig} */
    this._autocompleteConfig = {isWordChar: TextUtils.TextUtils.isWordChar};
    Common.moduleSetting('textEditorAutocompletion').addChangeListener(this._updateAutocomplete, this);
    this._updateAutocomplete();

    /** @type {?Persistence.PersistenceBinding} */
    this._persistenceBinding = Persistence.persistence.binding(uiSourceCode);

    /** @type {!Map<number, !SourceFrame.UISourceCodeFrame.RowMessageBucket>} */
    this._rowMessageBuckets = new Map();
    /** @type {!Set<string>} */
    this._typeDecorationsPending = new Set();
    this._uiSourceCode.addEventListener(
        Workspace.UISourceCode.Events.WorkingCopyChanged, this._onWorkingCopyChanged, this);
    this._uiSourceCode.addEventListener(
        Workspace.UISourceCode.Events.WorkingCopyCommitted, this._onWorkingCopyCommitted, this);

    this._messageAndDecorationListeners = [];
    this._installMessageAndDecorationListeners();

    Persistence.persistence.subscribeForBindingEvent(this._uiSourceCode, this._onBindingChanged.bind(this));

    this.textEditor.addEventListener(
        SourceFrame.SourcesTextEditor.Events.EditorBlurred,
        () => UI.context.setFlavor(SourceFrame.UISourceCodeFrame, null));
    this.textEditor.addEventListener(
        SourceFrame.SourcesTextEditor.Events.EditorFocused,
        () => UI.context.setFlavor(SourceFrame.UISourceCodeFrame, this));
    Persistence.networkPersistenceManager.addEventListener(
        Persistence.NetworkPersistenceManager.Events.EnabledChanged, this._onNetworkPersistenceChanged, this);

    this._updateStyle();
    this._updateDiffUISourceCode();

    this._errorPopoverHelper = new UI.PopoverHelper(this.element, this._getErrorPopoverContent.bind(this));
    this._errorPopoverHelper.setHasPadding(true);

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

  _installMessageAndDecorationListeners() {
    if (this._persistenceBinding) {
      var networkSourceCode = this._persistenceBinding.network;
      var fileSystemSourceCode = this._persistenceBinding.fileSystem;
      this._messageAndDecorationListeners = [
        networkSourceCode.addEventListener(Workspace.UISourceCode.Events.MessageAdded, this._onMessageAdded, this),
        networkSourceCode.addEventListener(Workspace.UISourceCode.Events.MessageRemoved, this._onMessageRemoved, this),
        networkSourceCode.addEventListener(
            Workspace.UISourceCode.Events.LineDecorationAdded, this._onLineDecorationAdded, this),
        networkSourceCode.addEventListener(
            Workspace.UISourceCode.Events.LineDecorationRemoved, this._onLineDecorationRemoved, this),

        fileSystemSourceCode.addEventListener(Workspace.UISourceCode.Events.MessageAdded, this._onMessageAdded, this),
        fileSystemSourceCode.addEventListener(
            Workspace.UISourceCode.Events.MessageRemoved, this._onMessageRemoved, this),
      ];
    } else {
      this._messageAndDecorationListeners = [
        this._uiSourceCode.addEventListener(Workspace.UISourceCode.Events.MessageAdded, this._onMessageAdded, this),
        this._uiSourceCode.addEventListener(Workspace.UISourceCode.Events.MessageRemoved, this._onMessageRemoved, this),
        this._uiSourceCode.addEventListener(
            Workspace.UISourceCode.Events.LineDecorationAdded, this._onLineDecorationAdded, this),
        this._uiSourceCode.addEventListener(
            Workspace.UISourceCode.Events.LineDecorationRemoved, this._onLineDecorationRemoved, this)
      ];
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
    // We need CodeMirrorTextEditor to be initialized prior to this call as it calls |cursorPositionToCoordinates| internally. @see crbug.com/506566
    setImmediate(this._updateBucketDecorations.bind(this));
    this.setEditable(this._canEditSource());
  }

  /**
   * @override
   */
  willHide() {
    super.willHide();
    UI.context.setFlavor(SourceFrame.UISourceCodeFrame, null);
    this._uiSourceCode.removeWorkingCopyGetter();
  }

  /**
   * @return {boolean}
   */
  _canEditSource() {
    if (Persistence.persistence.binding(this._uiSourceCode))
      return true;
    if (this._uiSourceCode.project().canSetFileContent())
      return true;
    if (this._uiSourceCode.project().isServiceProject())
      return false;
    if (Persistence.networkPersistenceManager.enabled()) {
      var networkPersistenceProjects = Persistence.networkPersistenceManager.projects();
      for (var project of networkPersistenceProjects) {
        var projectDomainPath = Persistence.networkPersistenceManager.domainPathForProject(project);
        var urlDomainPath = this._uiSourceCode.url().replace(/^https?:\/\//, '');
        if (projectDomainPath && urlDomainPath.startsWith(projectDomainPath))
          return true;
      }
    }
    return this._uiSourceCode.contentType() !== Common.resourceTypes.Document;
  }

  _onNetworkPersistenceChanged() {
    this.setEditable(this._canEditSource());
  }

  commitEditing() {
    if (!this._uiSourceCode.isDirty())
      return;

    this._muteSourceCodeEvents = true;
    this._uiSourceCode.commitWorkingCopy();
    this._muteSourceCodeEvents = false;
  }

  /**
   * @override
   */
  onTextEditorContentSet() {
    super.onTextEditorContentSet();
    for (var message of this._allMessages())
      this._addMessageToSource(message);
    this._decorateAllTypes();
  }

  /**
   * @return {!Set<!Workspace.UISourceCode.Message>}
   */
  _allMessages() {
    if (this._persistenceBinding) {
      var combinedSet = this._persistenceBinding.network.messages();
      combinedSet.addAll(this._persistenceBinding.fileSystem.messages());
      return combinedSet;
    }
    return this._uiSourceCode.messages();
  }

  /**
   * @override
   * @param {!TextUtils.TextRange} oldRange
   * @param {!TextUtils.TextRange} newRange
   */
  onTextChanged(oldRange, newRange) {
    super.onTextChanged(oldRange, newRange);
    this._errorPopoverHelper.hidePopover();
    if (this._isSettingContent)
      return;
    this._muteSourceCodeEvents = true;
    if (this.textEditor.isClean())
      this._uiSourceCode.resetWorkingCopy();
    else
      this._uiSourceCode.setWorkingCopyGetter(this.textEditor.text.bind(this.textEditor));
    this._muteSourceCodeEvents = false;
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
    this.textEditor.markClean();
    this._updateStyle();
  }

  _onBindingChanged() {
    var binding = Persistence.persistence.binding(this._uiSourceCode);
    if (binding === this._persistenceBinding)
      return;
    for (var message of this._allMessages())
      this._removeMessageFromSource(message);
    Common.EventTarget.removeEventListeners(this._messageAndDecorationListeners);

    this._persistenceBinding = binding;

    for (var message of this._allMessages())
      this._addMessageToSource(message);
    this._installMessageAndDecorationListeners();
    this._updateStyle();
    this._decorateAllTypes();
    this._updateDiffUISourceCode();
    this.onBindingChanged();
  }

  /**
   * @protected
   */
  onBindingChanged() {
    // Overriden in subclasses.
  }

  _updateDiffUISourceCode() {
    if (!this._diff)
      return;
    if (this._persistenceBinding)
      this._diff.setUISourceCode(this._persistenceBinding.network);
    else if (this._uiSourceCode.project().type() === Workspace.projectTypes.Network)
      this._diff.setUISourceCode(this._uiSourceCode);
    else
      this._diff.setUISourceCode(null);
  }

  _updateStyle() {
    this.element.classList.toggle(
        'source-frame-unsaved-committed-changes',
        Persistence.persistence.hasUnsavedCommittedChanges(this._uiSourceCode));
    this.setEditable(this._canEditSource());
  }

  onUISourceCodeContentChanged() {
  }

  _updateAutocomplete() {
    this.textEditor.configureAutocomplete(
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
      var oldContent = this.textEditor.text();
      this.setContent(content);
      this._diff.highlightModifiedLines(oldContent, content);
    } else {
      this.setContent(content);
    }
    this._isSettingContent = false;
  }

  /**
   * @override
   * @return {!Promise}
   */
  populateTextAreaContextMenu(contextMenu, lineNumber, columnNumber) {
    /**
     * @this {SourceFrame.UISourceCodeFrame}
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
    if (this._diff)
      this._diff.dispose();
    this.textEditor.dispose();
    Common.moduleSetting('textEditorAutocompletion').removeChangeListener(this._updateAutocomplete, this);
    this.detach();
    Persistence.networkPersistenceManager.removeEventListener(
        Persistence.NetworkPersistenceManager.Events.EnabledChanged, this._onNetworkPersistenceChanged, this);
  }

  /**
   * @param {!Common.Event} event
   */
  _onMessageAdded(event) {
    var message = /** @type {!Workspace.UISourceCode.Message} */ (event.data);
    this._addMessageToSource(message);
  }

  /**
   * @param {!Workspace.UISourceCode.Message} message
   */
  _addMessageToSource(message) {
    if (!this.loaded)
      return;
    var lineNumber = message.lineNumber();
    if (lineNumber >= this.textEditor.linesCount)
      lineNumber = this.textEditor.linesCount - 1;
    if (lineNumber < 0)
      lineNumber = 0;

    var messageBucket = this._rowMessageBuckets.get(lineNumber);
    if (!messageBucket) {
      messageBucket = new SourceFrame.UISourceCodeFrame.RowMessageBucket(this, this.textEditor, lineNumber);
      this._rowMessageBuckets.set(lineNumber, messageBucket);
    }
    messageBucket.addMessage(message);
  }

  /**
   * @param {!Common.Event} event
   */
  _onMessageRemoved(event) {
    var message = /** @type {!Workspace.UISourceCode.Message} */ (event.data);
    this._removeMessageFromSource(message);
  }

  /**
   * @param {!Workspace.UISourceCode.Message} message
   */
  _removeMessageFromSource(message) {
    if (!this.loaded)
      return;

    var lineNumber = message.lineNumber();
    if (lineNumber >= this.textEditor.linesCount)
      lineNumber = this.textEditor.linesCount - 1;
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
   * @param {!Event} event
   * @return {?UI.PopoverRequest}
   */
  _getErrorPopoverContent(event) {
    var element = event.target.enclosingNodeOrSelfWithClass('text-editor-line-decoration-icon') ||
        event.target.enclosingNodeOrSelfWithClass('text-editor-line-decoration-wave');
    if (!element)
      return null;
    var anchor = element.enclosingNodeOrSelfWithClass('text-editor-line-decoration-icon') ?
        element.boxInWindow() :
        new AnchorBox(event.clientX, event.clientY, 1, 1);
    return {
      box: anchor,
      show: popover => {
        var messageBucket = element.enclosingNodeOrSelfWithClass('text-editor-line-decoration')._messageBucket;
        var messagesOutline = messageBucket.messagesDescription();
        popover.contentElement.appendChild(messagesOutline);
        return Promise.resolve(true);
      }
    };
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
    self.runtime.extensions(SourceFrame.UISourceCodeFrame.LineDecorator)
        .find(extension => extension.descriptor()['decoratorType'] === type)
        .instance()
        .then(decorator => {
          this._typeDecorationsPending.delete(type);
          this.textEditor.codeMirror().operation(() => {
            decorator.decorate(
                this._persistenceBinding ? this._persistenceBinding.network : this.uiSourceCode(), this.textEditor);
          });
        });
  }

  _decorateAllTypes() {
    for (var extension of self.runtime.extensions(SourceFrame.UISourceCodeFrame.LineDecorator)) {
      var type = extension.descriptor()['decoratorType'];
      if (this._uiSourceCode.decorationsForType(type))
        this._decorateTypeThrottled(type);
    }
  }
};

SourceFrame.UISourceCodeFrame._iconClassPerLevel = {};
SourceFrame.UISourceCodeFrame._iconClassPerLevel[Workspace.UISourceCode.Message.Level.Error] = 'smallicon-error';
SourceFrame.UISourceCodeFrame._iconClassPerLevel[Workspace.UISourceCode.Message.Level.Warning] = 'smallicon-warning';

SourceFrame.UISourceCodeFrame._bubbleTypePerLevel = {};
SourceFrame.UISourceCodeFrame._bubbleTypePerLevel[Workspace.UISourceCode.Message.Level.Error] = 'error';
SourceFrame.UISourceCodeFrame._bubbleTypePerLevel[Workspace.UISourceCode.Message.Level.Warning] = 'warning';

SourceFrame.UISourceCodeFrame._lineClassPerLevel = {};
SourceFrame.UISourceCodeFrame._lineClassPerLevel[Workspace.UISourceCode.Message.Level.Error] =
    'text-editor-line-with-error';
SourceFrame.UISourceCodeFrame._lineClassPerLevel[Workspace.UISourceCode.Message.Level.Warning] =
    'text-editor-line-with-warning';

/**
 * @interface
 */
SourceFrame.UISourceCodeFrame.LineDecorator = function() {};

SourceFrame.UISourceCodeFrame.LineDecorator.prototype = {
  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @param {!TextEditor.CodeMirrorTextEditor} textEditor
   */
  decorate(uiSourceCode, textEditor) {}
};

/**
 * @unrestricted
 */
SourceFrame.UISourceCodeFrame.RowMessage = class {
  /**
   * @param {!Workspace.UISourceCode.Message} message
   */
  constructor(message) {
    this._message = message;
    this._repeatCount = 1;
    this.element = createElementWithClass('div', 'text-editor-row-message');
    this._icon = this.element.createChild('label', '', 'dt-icon-label');
    this._icon.type = SourceFrame.UISourceCodeFrame._iconClassPerLevel[message.level()];
    this._repeatCountElement =
        this.element.createChild('label', 'text-editor-row-message-repeat-count hidden', 'dt-small-bubble');
    this._repeatCountElement.type = SourceFrame.UISourceCodeFrame._bubbleTypePerLevel[message.level()];
    var linesContainer = this.element.createChild('div');
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
SourceFrame.UISourceCodeFrame.RowMessageBucket = class {
  /**
   * @param {!SourceFrame.UISourceCodeFrame} sourceFrame
   * @param {!TextEditor.CodeMirrorTextEditor} textEditor
   * @param {number} lineNumber
   */
  constructor(sourceFrame, textEditor, lineNumber) {
    this._sourceFrame = sourceFrame;
    this.textEditor = textEditor;
    this._lineHandle = textEditor.textEditorPositionHandle(lineNumber, 0);
    this._decoration = createElementWithClass('div', 'text-editor-line-decoration');
    this._decoration._messageBucket = this;
    this._wave = this._decoration.createChild('div', 'text-editor-line-decoration-wave');
    this._icon = this._wave.createChild('label', 'text-editor-line-decoration-icon', 'dt-icon-label');
    /** @type {?number} */
    this._decorationStartColumn = null;

    this._messagesDescriptionElement = createElementWithClass('div', 'text-editor-messages-description-container');
    /** @type {!Array.<!SourceFrame.UISourceCodeFrame.RowMessage>} */
    this._messages = [];

    this._level = null;
  }

  /**
   * @param {number} lineNumber
   * @param {number} columnNumber
   */
  _updateWavePosition(lineNumber, columnNumber) {
    lineNumber = Math.min(lineNumber, this.textEditor.linesCount - 1);
    var lineText = this.textEditor.line(lineNumber);
    columnNumber = Math.min(columnNumber, lineText.length);
    var lineIndent = TextUtils.TextUtils.lineIndent(lineText).length;
    var startColumn = Math.max(columnNumber - 1, lineIndent);
    if (this._decorationStartColumn === startColumn)
      return;
    if (this._decorationStartColumn !== null)
      this.textEditor.removeDecoration(this._decoration, lineNumber);
    this.textEditor.addDecoration(this._decoration, lineNumber, startColumn);
    this._decorationStartColumn = startColumn;
  }

  /**
   * @return {!Element}
   */
  messagesDescription() {
    this._messagesDescriptionElement.removeChildren();
    UI.appendStyle(this._messagesDescriptionElement, 'source_frame/messagesPopover.css');
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
      this.textEditor.toggleLineClass(lineNumber, SourceFrame.UISourceCodeFrame._lineClassPerLevel[this._level], false);
    if (this._decorationStartColumn !== null) {
      this.textEditor.removeDecoration(this._decoration, lineNumber);
      this._decorationStartColumn = null;
    }
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

    var rowMessage = new SourceFrame.UISourceCodeFrame.RowMessage(message);
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
    if (!this._sourceFrame.isShowing())
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

    if (this._level === maxMessage.level())
      return;
    if (this._level) {
      this.textEditor.toggleLineClass(lineNumber, SourceFrame.UISourceCodeFrame._lineClassPerLevel[this._level], false);
      this._icon.type = '';
    }
    this._level = maxMessage.level();
    if (!this._level)
      return;
    this.textEditor.toggleLineClass(lineNumber, SourceFrame.UISourceCodeFrame._lineClassPerLevel[this._level], true);
    this._icon.type = SourceFrame.UISourceCodeFrame._iconClassPerLevel[this._level];
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
