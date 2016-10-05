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
 * @constructor
 * @extends {WebInspector.SourceFrame}
 * @param {!WebInspector.UISourceCode} uiSourceCode
 */
WebInspector.UISourceCodeFrame = function(uiSourceCode)
{
    this._uiSourceCode = uiSourceCode;
    WebInspector.SourceFrame.call(this, uiSourceCode.contentURL(), workingCopy);

    if (Runtime.experiments.isEnabled("sourceDiff"))
        this._diff = new WebInspector.SourceCodeDiff(uiSourceCode.requestOriginalContent(), this.textEditor);

    /** @type {?WebInspector.AutocompleteConfig} */
    this._autocompleteConfig = {isWordChar: WebInspector.TextUtils.isWordChar};
    WebInspector.moduleSetting("textEditorAutocompletion").addChangeListener(this._updateAutocomplete, this);
    this._updateAutocomplete();

    this._rowMessageBuckets = {};
    /** @type {!Set<string>} */
    this._typeDecorationsPending = new Set();
    this._uiSourceCode.addEventListener(WebInspector.UISourceCode.Events.WorkingCopyChanged, this._onWorkingCopyChanged, this);
    this._uiSourceCode.addEventListener(WebInspector.UISourceCode.Events.WorkingCopyCommitted, this._onWorkingCopyCommitted, this);
    this._uiSourceCode.addEventListener(WebInspector.UISourceCode.Events.MessageAdded, this._onMessageAdded, this);
    this._uiSourceCode.addEventListener(WebInspector.UISourceCode.Events.MessageRemoved, this._onMessageRemoved, this);
    this._uiSourceCode.addEventListener(WebInspector.UISourceCode.Events.LineDecorationAdded, this._onLineDecorationAdded, this);
    this._uiSourceCode.addEventListener(WebInspector.UISourceCode.Events.LineDecorationRemoved, this._onLineDecorationRemoved, this);
    WebInspector.persistence.addEventListener(WebInspector.Persistence.Events.BindingCreated, this._onBindingChanged, this);
    WebInspector.persistence.addEventListener(WebInspector.Persistence.Events.BindingRemoved, this._onBindingChanged, this);
    this._updateStyle();

    this._errorPopoverHelper = new WebInspector.PopoverHelper(this.element, this._getErrorAnchor.bind(this), this._showErrorPopover.bind(this));
    this._errorPopoverHelper.setTimeout(100, 100);

    /**
     * @return {!Promise<?string>}
     */
    function workingCopy()
    {
        if (uiSourceCode.isDirty())
            return /** @type {!Promise<?string>} */(Promise.resolve(uiSourceCode.workingCopy()));
        return uiSourceCode.requestContent();
    }
};

WebInspector.UISourceCodeFrame.prototype = {
    /**
     * @return {!WebInspector.UISourceCode}
     */
    uiSourceCode: function()
    {
        return this._uiSourceCode;
    },

    wasShown: function()
    {
        WebInspector.SourceFrame.prototype.wasShown.call(this);
        this._boundWindowFocused = this._windowFocused.bind(this);
        this.element.ownerDocument.defaultView.addEventListener("focus", this._boundWindowFocused, false);
        this._checkContentUpdated();
        // We need CodeMirrorTextEditor to be initialized prior to this call as it calls |cursorPositionToCoordinates| internally. @see crbug.com/506566
        setImmediate(this._updateBucketDecorations.bind(this));
    },

    willHide: function()
    {
        WebInspector.SourceFrame.prototype.willHide.call(this);
        WebInspector.context.setFlavor(WebInspector.UISourceCodeFrame, null);
        this.element.ownerDocument.defaultView.removeEventListener("focus", this._boundWindowFocused, false);
        delete this._boundWindowFocused;
        this._uiSourceCode.removeWorkingCopyGetter();
    },

    /**
     * @override
     */
    editorFocused: function()
    {
        WebInspector.SourceFrame.prototype.editorFocused.call(this);
        WebInspector.context.setFlavor(WebInspector.UISourceCodeFrame, this);
    },

    /**
     * @override
     */
    editorBlurred: function()
    {
        WebInspector.context.setFlavor(WebInspector.UISourceCodeFrame, null);
        WebInspector.SourceFrame.prototype.editorBlurred.call(this);
    },

    /**
     * @override
     * @return {boolean}
     */
    canEditSource: function()
    {
        if (WebInspector.persistence.binding(this._uiSourceCode))
            return true;
        var projectType = this._uiSourceCode.project().type();
        if (projectType === WebInspector.projectTypes.Service || projectType === WebInspector.projectTypes.Debugger || projectType === WebInspector.projectTypes.Formatter)
            return false;
        if (projectType === WebInspector.projectTypes.Network && this._uiSourceCode.contentType() === WebInspector.resourceTypes.Document)
            return false;
        return true;
    },

    _windowFocused: function(event)
    {
        this._checkContentUpdated();
    },

    _checkContentUpdated: function()
    {
        if (!this.loaded || !this.isShowing())
            return;
        this._uiSourceCode.checkContentUpdated(true);
    },

    commitEditing: function()
    {
        if (!this._uiSourceCode.isDirty())
            return;

        this._muteSourceCodeEvents = true;
        this._uiSourceCode.commitWorkingCopy();
        delete this._muteSourceCodeEvents;
    },

    /**
     * @override
     */
    onTextEditorContentSet: function()
    {
        if (this._diff)
            this._diff.updateDiffMarkersImmediately();
        WebInspector.SourceFrame.prototype.onTextEditorContentSet.call(this);
        for (var message of this._uiSourceCode.messages())
            this._addMessageToSource(message);
        this._decorateAllTypes();
    },

    /**
     * @override
     * @param {!WebInspector.TextRange} oldRange
     * @param {!WebInspector.TextRange} newRange
     */
    onTextChanged: function(oldRange, newRange)
    {
        if (this._diff)
            this._diff.updateDiffMarkersWhenPossible();
        WebInspector.SourceFrame.prototype.onTextChanged.call(this, oldRange, newRange);
        this._clearMessages();
        if (this._isSettingContent)
            return;
        this._muteSourceCodeEvents = true;
        if (this._textEditor.isClean())
            this._uiSourceCode.resetWorkingCopy();
        else
            this._uiSourceCode.setWorkingCopyGetter(this._textEditor.text.bind(this._textEditor));
        delete this._muteSourceCodeEvents;
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _onWorkingCopyChanged: function(event)
    {
        if (this._muteSourceCodeEvents)
            return;
        this._innerSetContent(this._uiSourceCode.workingCopy());
        this.onUISourceCodeContentChanged();
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _onWorkingCopyCommitted: function(event)
    {
        if (!this._muteSourceCodeEvents) {
            this._innerSetContent(this._uiSourceCode.workingCopy());
            this.onUISourceCodeContentChanged();
        }
        this._textEditor.markClean();
        this._updateStyle();
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _onBindingChanged: function(event)
    {
        var binding = /** @type {!WebInspector.PersistenceBinding} */(event.data);
        if (binding.network === this._uiSourceCode || binding.fileSystem === this._uiSourceCode)
            this._updateStyle();
    },

    _updateStyle: function()
    {
        this.element.classList.toggle("source-frame-unsaved-committed-changes", WebInspector.persistence.hasUnsavedCommittedChanges(this._uiSourceCode));
        this._textEditor.setReadOnly(!this.canEditSource());
    },

    onUISourceCodeContentChanged: function()
    {
    },

    _updateAutocomplete: function()
    {
        this._textEditor.configureAutocomplete(WebInspector.moduleSetting("textEditorAutocompletion").get() ? this._autocompleteConfig : null);
    },

    /**
     * @param {?WebInspector.AutocompleteConfig} config
     */
    configureAutocomplete: function(config)
    {
        this._autocompleteConfig = config;
        this._updateAutocomplete();
    },

    /**
     * @param {string} content
     */
    _innerSetContent: function(content)
    {
        this._isSettingContent = true;
        if (this._diff) {
            var oldContent = this._textEditor.text();
            this.setContent(content);
            this._diff.highlightModifiedLines(oldContent, content);
        } else {
            this.setContent(content);
        }
        delete this._isSettingContent;
    },

    /**
     * @override
     * @return {!Promise}
     */
    populateTextAreaContextMenu: function(contextMenu, lineNumber, columnNumber)
    {
        /**
         * @this {WebInspector.UISourceCodeFrame}
         */
        function appendItems()
        {
            contextMenu.appendApplicableItems(this._uiSourceCode);
            contextMenu.appendApplicableItems(new WebInspector.UILocation(this._uiSourceCode, lineNumber, columnNumber));
            contextMenu.appendApplicableItems(this);
        }

        return WebInspector.SourceFrame.prototype.populateTextAreaContextMenu.call(this, contextMenu, lineNumber, columnNumber)
            .then(appendItems.bind(this));
    },

    /**
     * @param {!Array.<!WebInspector.Infobar|undefined>} infobars
     */
    attachInfobars: function(infobars)
    {
        for (var i = infobars.length - 1; i >= 0; --i) {
            var infobar = infobars[i];
            if (!infobar)
                continue;
            this.element.insertBefore(infobar.element, this.element.children[0]);
            infobar.setParentView(this);
        }
        this.doResize();
    },

    dispose: function()
    {
        this._textEditor.dispose();
        WebInspector.moduleSetting("textEditorAutocompletion").removeChangeListener(this._updateAutocomplete, this);
        this.detach();
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _onMessageAdded: function(event)
    {
        if (!this.loaded)
            return;
        var message = /** @type {!WebInspector.UISourceCode.Message} */ (event.data);
        this._addMessageToSource(message);
    },

    /**
     * @param {!WebInspector.UISourceCode.Message} message
     */
    _addMessageToSource: function(message)
    {
        var lineNumber = message.lineNumber();
        if (lineNumber >= this._textEditor.linesCount)
            lineNumber = this._textEditor.linesCount - 1;
        if (lineNumber < 0)
            lineNumber = 0;

        if (!this._rowMessageBuckets[lineNumber])
            this._rowMessageBuckets[lineNumber] = new WebInspector.UISourceCodeFrame.RowMessageBucket(this, this._textEditor, lineNumber);
        var messageBucket = this._rowMessageBuckets[lineNumber];
        messageBucket.addMessage(message);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _onMessageRemoved: function(event)
    {
        if (!this.loaded)
            return;
        var message = /** @type {!WebInspector.UISourceCode.Message} */ (event.data);
        this._removeMessageFromSource(message);
    },

    /**
     * @param {!WebInspector.UISourceCode.Message} message
     */
    _removeMessageFromSource: function(message)
    {
        var lineNumber = message.lineNumber();
        if (lineNumber >= this._textEditor.linesCount)
            lineNumber = this._textEditor.linesCount - 1;
        if (lineNumber < 0)
            lineNumber = 0;

        var messageBucket = this._rowMessageBuckets[lineNumber];
        if (!messageBucket)
            return;
        messageBucket.removeMessage(message);
        if (!messageBucket.uniqueMessagesCount()) {
            messageBucket.detachFromEditor();
            delete this._rowMessageBuckets[lineNumber];
        }
    },

    _clearMessages: function()
    {
        for (var line in this._rowMessageBuckets) {
            var bubble = this._rowMessageBuckets[line];
            bubble.detachFromEditor();
        }

        this._rowMessageBuckets = {};
        this._errorPopoverHelper.hidePopover();
        this._uiSourceCode.removeAllMessages();
    },

    /**
     * @param {!Element} target
     * @param {!Event} event
     * @return {(!Element|undefined)}
     */
    _getErrorAnchor: function(target, event)
    {
        var element = target.enclosingNodeOrSelfWithClass("text-editor-line-decoration-icon")
            || target.enclosingNodeOrSelfWithClass("text-editor-line-decoration-wave");
        if (!element)
            return;
        this._errorWavePopoverAnchor = new AnchorBox(event.clientX, event.clientY, 1, 1);
        return element;
    },

    /**
     * @param {!Element} anchor
     * @param {!WebInspector.Popover} popover
     */
    _showErrorPopover: function(anchor, popover)
    {
        var messageBucket = anchor.enclosingNodeOrSelfWithClass("text-editor-line-decoration")._messageBucket;
        var messagesOutline = messageBucket.messagesDescription();
        var popoverAnchor = anchor.enclosingNodeOrSelfWithClass("text-editor-line-decoration-icon") ? anchor : this._errorWavePopoverAnchor;
        popover.showForAnchor(messagesOutline, popoverAnchor);
    },

    _updateBucketDecorations: function()
    {
        for (var line in this._rowMessageBuckets) {
            var bucket = this._rowMessageBuckets[line];
            bucket._updateDecoration();
        }
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _onLineDecorationAdded: function(event)
    {
        var marker = /** @type {!WebInspector.UISourceCode.LineMarker} */ (event.data);
        this._decorateTypeThrottled(marker.type());
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _onLineDecorationRemoved: function(event)
    {
        var marker = /** @type {!WebInspector.UISourceCode.LineMarker} */ (event.data);
        this._decorateTypeThrottled(marker.type());
    },

    /**
     * @param {string} type
     */
    _decorateTypeThrottled: function(type)
    {
        if (this._typeDecorationsPending.has(type))
            return;
        this._typeDecorationsPending.add(type);
        self.runtime.extensions(WebInspector.UISourceCodeFrame.LineDecorator).find(extension => extension.descriptor()["decoratorType"] === type).instance().then(decorator => {
            this._typeDecorationsPending.delete(type);
            decorator.decorate(this.uiSourceCode(), this._textEditor);
        });
    },

    _decorateAllTypes: function()
    {
        var extensions = self.runtime.extensions(WebInspector.UISourceCodeFrame.LineDecorator);
        extensions.forEach(extension => this._decorateTypeThrottled(extension.descriptor()["decoratorType"]));
    },

    __proto__: WebInspector.SourceFrame.prototype
};

WebInspector.UISourceCodeFrame._iconClassPerLevel = {};
WebInspector.UISourceCodeFrame._iconClassPerLevel[WebInspector.UISourceCode.Message.Level.Error] = "error-icon";
WebInspector.UISourceCodeFrame._iconClassPerLevel[WebInspector.UISourceCode.Message.Level.Warning] = "warning-icon";

WebInspector.UISourceCodeFrame._bubbleTypePerLevel = {};
WebInspector.UISourceCodeFrame._bubbleTypePerLevel[WebInspector.UISourceCode.Message.Level.Error] = "error";
WebInspector.UISourceCodeFrame._bubbleTypePerLevel[WebInspector.UISourceCode.Message.Level.Warning] = "warning";

WebInspector.UISourceCodeFrame._lineClassPerLevel = {};
WebInspector.UISourceCodeFrame._lineClassPerLevel[WebInspector.UISourceCode.Message.Level.Error] = "text-editor-line-with-error";
WebInspector.UISourceCodeFrame._lineClassPerLevel[WebInspector.UISourceCode.Message.Level.Warning] = "text-editor-line-with-warning";

/**
 * @interface
 */
WebInspector.UISourceCodeFrame.LineDecorator = function() { };

WebInspector.UISourceCodeFrame.LineDecorator.prototype = {
    /**
     * @param {!WebInspector.UISourceCode} uiSourceCode
     * @param {!WebInspector.CodeMirrorTextEditor} textEditor
     */
    decorate: function(uiSourceCode, textEditor) { }
};

/**
 * @constructor
 * @param {!WebInspector.UISourceCode.Message} message
 */
WebInspector.UISourceCodeFrame.RowMessage = function(message)
{
    this._message = message;
    this._repeatCount = 1;
    this.element = createElementWithClass("div", "text-editor-row-message");
    this._icon = this.element.createChild("label", "", "dt-icon-label");
    this._icon.type = WebInspector.UISourceCodeFrame._iconClassPerLevel[message.level()];
    this._repeatCountElement = this.element.createChild("label", "message-repeat-count hidden", "dt-small-bubble");
    this._repeatCountElement.type = WebInspector.UISourceCodeFrame._bubbleTypePerLevel[message.level()];
    var linesContainer = this.element.createChild("div", "text-editor-row-message-lines");
    var lines = this._message.text().split("\n");
    for (var i = 0; i < lines.length; ++i) {
        var messageLine = linesContainer.createChild("div");
        messageLine.textContent = lines[i];
    }
};

WebInspector.UISourceCodeFrame.RowMessage.prototype = {
    /**
     * @return {!WebInspector.UISourceCode.Message}
     */
    message: function()
    {
        return this._message;
    },

    /**
     * @return {number}
     */
    repeatCount: function()
    {
        return this._repeatCount;
    },

    setRepeatCount: function(repeatCount)
    {
        if (this._repeatCount === repeatCount)
            return;
        this._repeatCount = repeatCount;
        this._updateMessageRepeatCount();
    },

    _updateMessageRepeatCount: function()
    {
        this._repeatCountElement.textContent = this._repeatCount;
        var showRepeatCount = this._repeatCount > 1;
        this._repeatCountElement.classList.toggle("hidden", !showRepeatCount);
        this._icon.classList.toggle("hidden", showRepeatCount);
    }
};

/**
 * @constructor
 * @param {!WebInspector.UISourceCodeFrame} sourceFrame
 * @param {!WebInspector.CodeMirrorTextEditor} textEditor
 * @param {number} lineNumber
 */
WebInspector.UISourceCodeFrame.RowMessageBucket = function(sourceFrame, textEditor, lineNumber)
{
    this._sourceFrame = sourceFrame;
    this._textEditor = textEditor;
    this._lineHandle = textEditor.textEditorPositionHandle(lineNumber, 0);
    this._decoration = createElementWithClass("div", "text-editor-line-decoration");
    this._decoration._messageBucket = this;
    this._wave = this._decoration.createChild("div", "text-editor-line-decoration-wave");
    this._icon = this._wave.createChild("label", "text-editor-line-decoration-icon", "dt-icon-label");
    this._hasDecoration = false;

    this._messagesDescriptionElement = createElementWithClass("div", "text-editor-messages-description-container");
    /** @type {!Array.<!WebInspector.UISourceCodeFrame.RowMessage>} */
    this._messages = [];

    this._level = null;
};

WebInspector.UISourceCodeFrame.RowMessageBucket.prototype = {
    /**
     * @param {number} lineNumber
     * @param {number} columnNumber
     */
    _updateWavePosition: function(lineNumber, columnNumber)
    {
        lineNumber = Math.min(lineNumber, this._textEditor.linesCount - 1);
        var lineText = this._textEditor.line(lineNumber);
        columnNumber = Math.min(columnNumber, lineText.length);
        var lineIndent = WebInspector.TextUtils.lineIndent(lineText).length;
        if (this._hasDecoration)
            this._textEditor.removeDecoration(this._decoration, lineNumber);
        this._hasDecoration = true;
        this._textEditor.addDecoration(this._decoration, lineNumber, Math.max(columnNumber - 1, lineIndent));
    },

    /**
     * @return {!Element}
     */
    messagesDescription: function()
    {
        this._messagesDescriptionElement.removeChildren();
        for (var i = 0; i < this._messages.length; ++i) {
            this._messagesDescriptionElement.appendChild(this._messages[i].element);
        }
        return this._messagesDescriptionElement;
    },

    detachFromEditor: function()
    {
        var position = this._lineHandle.resolve();
        if (!position)
            return;
        var lineNumber = position.lineNumber;
        if (this._level)
            this._textEditor.toggleLineClass(lineNumber, WebInspector.UISourceCodeFrame._lineClassPerLevel[this._level], false);
        if (this._hasDecoration)
            this._textEditor.removeDecoration(this._decoration, lineNumber);
        this._hasDecoration = false;
    },

    /**
     * @return {number}
     */
    uniqueMessagesCount: function()
    {
        return this._messages.length;
    },

    /**
     * @param {!WebInspector.UISourceCode.Message} message
     */
    addMessage: function(message)
    {
        for (var i = 0; i < this._messages.length; ++i) {
            var rowMessage = this._messages[i];
            if (rowMessage.message().isEqual(message)) {
                rowMessage.setRepeatCount(rowMessage.repeatCount() + 1);
                return;
            }
        }

        var rowMessage = new WebInspector.UISourceCodeFrame.RowMessage(message);
        this._messages.push(rowMessage);
        this._updateDecoration();
    },

    /**
     * @param {!WebInspector.UISourceCode.Message} message
     */
    removeMessage: function(message)
    {
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
    },

    _updateDecoration: function()
    {
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
            if (!maxMessage || WebInspector.UISourceCode.Message.messageLevelComparator(maxMessage, message) < 0)
                maxMessage = message;
        }
        this._updateWavePosition(lineNumber, columnNumber);

        if (this._level) {
            this._textEditor.toggleLineClass(lineNumber, WebInspector.UISourceCodeFrame._lineClassPerLevel[this._level], false);
            this._icon.type = "";
        }
        this._level = maxMessage.level();
        if (!this._level)
            return;
        this._textEditor.toggleLineClass(lineNumber, WebInspector.UISourceCodeFrame._lineClassPerLevel[this._level], true);
        this._icon.type = WebInspector.UISourceCodeFrame._iconClassPerLevel[this._level];
    }
};

WebInspector.UISourceCode.Message._messageLevelPriority = {
    "Warning": 3,
    "Error": 4
};

/**
 * @param {!WebInspector.UISourceCode.Message} a
 * @param {!WebInspector.UISourceCode.Message} b
 * @return {number}
 */
WebInspector.UISourceCode.Message.messageLevelComparator = function(a, b)
{
    return WebInspector.UISourceCode.Message._messageLevelPriority[a.level()] - WebInspector.UISourceCode.Message._messageLevelPriority[b.level()];
};
