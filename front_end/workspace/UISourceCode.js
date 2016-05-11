/*
 * Copyright (C) 2011 Google Inc. All rights reserved.
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
 *     * Neither the name of Google Inc. nor the names of its
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
 * @constructor
 * @extends {WebInspector.Object}
 * @implements {WebInspector.ContentProvider}
 * @param {!WebInspector.Project} project
 * @param {string} url
 * @param {!WebInspector.ResourceType} contentType
 */
WebInspector.UISourceCode = function(project, url, contentType)
{
    this._project = project;
    this._url = url;

    var pathComponents = WebInspector.ParsedURL.splitURLIntoPathComponents(url);
    this._origin = pathComponents[0];
    this._parentURL = pathComponents.slice(0, -1).join("/");
    this._name = pathComponents[pathComponents.length - 1];

    this._contentType = contentType;
    /** @type {?function(?string)} */
    this._requestContentCallback = null;
    /** @type {?Promise<?string>} */
    this._requestContentPromise = null;
    /** @type {!Map<string, !Map<number, !WebInspector.UISourceCode.LineMarker>>} */
    this._lineDecorations = new Map();

    /** @type {!Array.<!WebInspector.Revision>} */
    this.history = [];
    this._hasUnsavedCommittedChanges = false;

    /** @type {!Array<!WebInspector.UISourceCode.Message>} */
    this._messages = [];
}

/**
 * @enum {string}
 */
WebInspector.UISourceCode.Events = {
    WorkingCopyChanged: "WorkingCopyChanged",
    WorkingCopyCommitted: "WorkingCopyCommitted",
    TitleChanged: "TitleChanged",
    SourceMappingChanged: "SourceMappingChanged",
    MessageAdded: "MessageAdded",
    MessageRemoved: "MessageRemoved",
    LineDecorationAdded: "LineDecorationAdded",
    LineDecorationRemoved: "LineDecorationRemoved"
}

WebInspector.UISourceCode.prototype = {
    /**
     * @return {string}
     */
    name: function()
    {
        return this._name;
    },

    /**
     * @return {string}
     */
    url: function()
    {
        return this._url;
    },

    /**
     * @return {string}
     */
    parentURL: function()
    {
        return this._parentURL;
    },

    /**
     * @return {string}
     */
    origin: function()
    {
        return this._origin;
    },

    /**
     * @return {string}
     */
    fullDisplayName: function()
    {
        var parentPath = this._parentURL.replace(/^(?:https?|file)\:\/\//, "");
        try {
            parentPath = decodeURI(parentPath);
        } catch (e) {
        }
        return parentPath + "/" + this.displayName(true);
    },

    /**
     * @param {boolean=} skipTrim
     * @return {string}
     */
    displayName: function(skipTrim)
    {
        if (!this._name)
            return WebInspector.UIString("(index)");
        var name = this._name;
        try {
            name = decodeURI(name);
        } catch (e) {
        }
        return skipTrim ? name : name.trimEnd(100);
    },

    /**
     * @return {boolean}
     */
    isFromServiceProject: function()
    {
        return WebInspector.Project.isServiceProject(this._project);
    },

    /**
     * @return {boolean}
     */
    canRename: function()
    {
        return this._project.canRename();
    },

    /**
     * @param {string} newName
     * @param {function(boolean)} callback
     */
    rename: function(newName, callback)
    {
        this._project.rename(this, newName, innerCallback.bind(this));

        /**
         * @param {boolean} success
         * @param {string=} newName
         * @param {string=} newURL
         * @param {!WebInspector.ResourceType=} newContentType
         * @this {WebInspector.UISourceCode}
         */
        function innerCallback(success, newName, newURL, newContentType)
        {
            if (success)
                this._updateName(/** @type {string} */ (newName), /** @type {string} */ (newURL), /** @type {!WebInspector.ResourceType} */ (newContentType));
            callback(success);
        }
    },

    remove: function()
    {
        this._project.deleteFile(this.url());
    },

    /**
     * @param {string} name
     * @param {string} url
     * @param {!WebInspector.ResourceType=} contentType
     */
    _updateName: function(name, url, contentType)
    {
        var oldURД = this.url();
        this._url = this._url.substring(0, this._url.length - this._name.length) + name;
        this._name = name;
        if (url)
            this._url = url;
        if (contentType)
            this._contentType = contentType;
        this.dispatchEventToListeners(WebInspector.UISourceCode.Events.TitleChanged, oldURД);
    },

    /**
     * @override
     * @return {string}
     */
    contentURL: function()
    {
        return this.url();
    },

    /**
     * @override
     * @return {!WebInspector.ResourceType}
     */
    contentType: function()
    {
        return this._contentType;
    },

    /**
     * @return {!WebInspector.Project}
     */
    project: function()
    {
        return this._project;
    },

    /**
     * @override
     * @return {!Promise<?string>}
     */
    requestContent: function()
    {
        if (this._content || this._contentLoaded)
            return Promise.resolve(this._content);
        var promise = this._requestContentPromise;
        if (!promise) {
            promise = new Promise(fulfill => this._requestContentCallback = fulfill);
            this._requestContentPromise = promise;
            this._project.requestFileContent(this, this._fireContentAvailable.bind(this));
        }
        return promise;
    },

    /**
     * @param {function()} callback
     */
    _pushCheckContentUpdatedCallback: function(callback)
    {
        if (!this._checkContentUpdatedCallbacks)
            this._checkContentUpdatedCallbacks = [];
        this._checkContentUpdatedCallbacks.push(callback);
    },

    _terminateContentCheck: function()
    {
        delete this._checkingContent;
        if (this._checkContentUpdatedCallbacks) {
            this._checkContentUpdatedCallbacks.forEach(function(callback) { callback(); });
            delete this._checkContentUpdatedCallbacks;
        }
    },

    /**
     * @param {boolean=} forceLoad
     * @param {function()=} callback
     */
    checkContentUpdated: function(forceLoad, callback)
    {
        callback = callback || function() {};
        forceLoad = forceLoad || this._forceLoadOnCheckContent;
        if (!this.contentLoaded() && !forceLoad) {
            callback();
            return;
        }

        if (!this._project.canSetFileContent()) {
            callback();
            return;
        }
        this._pushCheckContentUpdatedCallback(callback);

        if (this._checkingContent)
            return;

        this._checkingContent = true;
        this._project.requestFileContent(this, contentLoaded.bind(this));

        /**
         * @param {?string} updatedContent
         * @this {WebInspector.UISourceCode}
         */
        function contentLoaded(updatedContent)
        {
            if (updatedContent === null) {
                var workingCopy = this.workingCopy();
                this._contentCommitted("", true, false);
                this.setWorkingCopy(workingCopy);
                this._terminateContentCheck();
                return;
            }
            if (typeof this._lastAcceptedContent === "string" && this._lastAcceptedContent === updatedContent) {
                this._terminateContentCheck();
                return;
            }

            if (this._content === updatedContent) {
                delete this._lastAcceptedContent;
                this._terminateContentCheck();
                return;
            }

            if (!this.isDirty() || this._workingCopy === updatedContent) {
                this._contentCommitted(updatedContent, true, false);
                this._terminateContentCheck();
                return;
            }

            var shouldUpdate = window.confirm(WebInspector.UIString("This file was changed externally. Would you like to reload it?"));
            if (shouldUpdate)
                this._contentCommitted(updatedContent, true, false);
            else
                this._lastAcceptedContent = updatedContent;
            this._terminateContentCheck();
        }
    },

    forceLoadOnCheckContent: function()
    {
        this._forceLoadOnCheckContent = true;
    },

    /**
     * @return {!Promise<?string>}
     */
    requestOriginalContent: function()
    {
        var callback;
        var promise = new Promise(fulfill => callback = fulfill);
        this._project.requestFileContent(this, callback);
        return promise;
    },

    /**
     * @param {string} content
     */
    _commitContent: function(content)
    {
        var wasPersisted = false;
        if (this._project.canSetFileContent()) {
            this._project.setFileContent(this, content, function() { });
            wasPersisted = true;
        } else if (this._project.workspace().hasResourceContentTrackingExtensions()) {
            wasPersisted = true;
        } else if (this._url && WebInspector.fileManager.isURLSaved(this._url)) {
            WebInspector.fileManager.save(this._url, content, false, function() { });
            WebInspector.fileManager.close(this._url);
            wasPersisted = true;
        }
        this._contentCommitted(content, wasPersisted, true);
    },

    /**
     * @param {string} content
     * @param {boolean} wasPersisted
     * @param {boolean} committedByUser
     */
    _contentCommitted: function(content, wasPersisted, committedByUser)
    {
        delete this._lastAcceptedContent;
        this._content = content;
        this._contentLoaded = true;

        var lastRevision = this.history.length ? this.history[this.history.length - 1] : null;
        if (!lastRevision || lastRevision._content !== this._content) {
            var revision = new WebInspector.Revision(this, this._content, new Date());
            this.history.push(revision);
        }

        this._innerResetWorkingCopy();
        this._hasUnsavedCommittedChanges = !wasPersisted;
        this.dispatchEventToListeners(WebInspector.UISourceCode.Events.WorkingCopyCommitted);
        this._project.workspace().dispatchEventToListeners(WebInspector.Workspace.Events.WorkingCopyCommitted, { uiSourceCode: this, content: content });
        if (committedByUser)
            this._project.workspace().dispatchEventToListeners(WebInspector.Workspace.Events.WorkingCopyCommittedByUser, { uiSourceCode: this, content: content });
    },

    saveAs: function()
    {
        WebInspector.fileManager.save(this._url, this.workingCopy(), true, callback.bind(this));
        WebInspector.fileManager.close(this._url);

        /**
         * @param {boolean} accepted
         * @this {WebInspector.UISourceCode}
         */
        function callback(accepted)
        {
            if (accepted)
                this._contentCommitted(this.workingCopy(), true, true);
        }
    },

    /**
     * @return {boolean}
     */
    hasUnsavedCommittedChanges: function()
    {
        return this._hasUnsavedCommittedChanges;
    },

    /**
     * @param {string} content
     */
    addRevision: function(content)
    {
        this._commitContent(content);
    },

    /**
     * @return {!Promise}
     */
    revertToOriginal: function()
    {
        /**
         * @this {WebInspector.UISourceCode}
         * @param {?string} content
         */
        function callback(content)
        {
            if (typeof content !== "string")
                return;

            this.addRevision(content);
        }

        WebInspector.userMetrics.actionTaken(WebInspector.UserMetrics.Action.RevisionApplied);
        return this.requestOriginalContent().then(callback.bind(this));
    },

    /**
     * @param {function(!WebInspector.UISourceCode)} callback
     */
    revertAndClearHistory: function(callback)
    {
        /**
         * @this {WebInspector.UISourceCode}
         * @param {?string} content
         */
        function revert(content)
        {
            if (typeof content !== "string")
                return;

            this.addRevision(content);
            this.history = [];
            callback(this);
        }

        WebInspector.userMetrics.actionTaken(WebInspector.UserMetrics.Action.RevisionApplied);
        this.requestOriginalContent().then(revert.bind(this));
    },

    /**
     * @return {string}
     */
    workingCopy: function()
    {
        if (this._workingCopyGetter) {
            this._workingCopy = this._workingCopyGetter();
            delete this._workingCopyGetter;
        }
        if (this.isDirty())
            return this._workingCopy;
        return this._content;
    },

    resetWorkingCopy: function()
    {
        this._innerResetWorkingCopy();
        this.dispatchEventToListeners(WebInspector.UISourceCode.Events.WorkingCopyChanged);
    },

    _innerResetWorkingCopy: function()
    {
        delete this._workingCopy;
        delete this._workingCopyGetter;
    },

    /**
     * @param {string} newWorkingCopy
     */
    setWorkingCopy: function(newWorkingCopy)
    {
        this._workingCopy = newWorkingCopy;
        delete this._workingCopyGetter;
        this.dispatchEventToListeners(WebInspector.UISourceCode.Events.WorkingCopyChanged);
        this._project.workspace().dispatchEventToListeners(WebInspector.Workspace.Events.WorkingCopyChanged, { uiSourceCode: this });
    },

    setWorkingCopyGetter: function(workingCopyGetter)
    {
        this._workingCopyGetter = workingCopyGetter;
        this.dispatchEventToListeners(WebInspector.UISourceCode.Events.WorkingCopyChanged);
        this._project.workspace().dispatchEventToListeners(WebInspector.Workspace.Events.WorkingCopyChanged, { uiSourceCode: this  });
    },

    removeWorkingCopyGetter: function()
    {
        if (!this._workingCopyGetter)
            return;
        this._workingCopy = this._workingCopyGetter();
        delete this._workingCopyGetter;
    },

    commitWorkingCopy: function()
    {
        if (this.isDirty())
            this._commitContent(this.workingCopy());
    },

    /**
     * @return {boolean}
     */
    isDirty: function()
    {
        return typeof this._workingCopy !== "undefined" || typeof this._workingCopyGetter !== "undefined";
    },

    /**
     * @return {string}
     */
    extension: function()
    {
        return WebInspector.TextUtils.extension(this._name);
    },

    /**
     * @return {?string}
     */
    content: function()
    {
        return this._content;
    },

    /**
     * @override
     * @param {string} query
     * @param {boolean} caseSensitive
     * @param {boolean} isRegex
     * @param {function(!Array.<!WebInspector.ContentProvider.SearchMatch>)} callback
     */
    searchInContent: function(query, caseSensitive, isRegex, callback)
    {
        var content = this.content();
        if (content) {
            WebInspector.StaticContentProvider.searchInContent(content, query, caseSensitive, isRegex, callback);
            return;
        }

        this._project.searchInFileContent(this, query, caseSensitive, isRegex, callback);
    },

    /**
     * @param {?string} content
     */
    _fireContentAvailable: function(content)
    {
        this._contentLoaded = true;
        this._content = content;

        var callback = this._requestContentCallback;
        this._requestContentCallback = null;
        this._requestContentPromise = null;

        callback.call(null, content);
    },

    /**
     * @return {boolean}
     */
    contentLoaded: function()
    {
        return this._contentLoaded;
    },

    /**
     * @param {number} lineNumber
     * @param {number=} columnNumber
     * @return {!WebInspector.UILocation}
     */
    uiLocation: function(lineNumber, columnNumber)
    {
        if (typeof columnNumber === "undefined")
            columnNumber = 0;
        return new WebInspector.UILocation(this, lineNumber, columnNumber);
    },

    /**
     * @return {!Array<!WebInspector.UISourceCode.Message>}
     */
    messages: function()
    {
        return this._messages.slice();
    },

    /**
     * @param {!WebInspector.UISourceCode.Message.Level} level
     * @param {string} text
     * @param {number} lineNumber
     * @param {number=} columnNumber
     * @return {!WebInspector.UISourceCode.Message} message
     */
    addLineMessage: function(level, text, lineNumber, columnNumber)
    {
        return this.addMessage(level, text, new WebInspector.TextRange(lineNumber, columnNumber || 0, lineNumber, columnNumber || 0));
    },

    /**
     * @param {!WebInspector.UISourceCode.Message.Level} level
     * @param {string} text
     * @param {!WebInspector.TextRange} range
     * @return {!WebInspector.UISourceCode.Message} message
     */
    addMessage: function(level, text, range)
    {
        var message = new WebInspector.UISourceCode.Message(this, level, text, range);
        this._messages.push(message);
        this.dispatchEventToListeners(WebInspector.UISourceCode.Events.MessageAdded, message);
        return message;
    },

    /**
     * @param {!WebInspector.UISourceCode.Message} message
     */
    removeMessage: function(message)
    {
        if (this._messages.remove(message))
            this.dispatchEventToListeners(WebInspector.UISourceCode.Events.MessageRemoved, message);
    },

    removeAllMessages: function()
    {
        var messages = this._messages;
        this._messages = [];
        for (var message of messages)
            this.dispatchEventToListeners(WebInspector.UISourceCode.Events.MessageRemoved, message);
    },

    /**
     * @param {number} lineNumber
     * @param {string} type
     * @param {?} data
     */
    addLineDecoration: function(lineNumber, type, data)
    {
        var markers = this._lineDecorations.get(type);
        if (!markers) {
            markers = new Map();
            this._lineDecorations.set(type, markers);
        }
        var marker = new WebInspector.UISourceCode.LineMarker(lineNumber, type, data);
        markers.set(lineNumber, marker);
        this.dispatchEventToListeners(WebInspector.UISourceCode.Events.LineDecorationAdded, marker);
    },

    /**
     * @param {number} lineNumber
     * @param {string} type
     */
    removeLineDecoration: function(lineNumber, type)
    {
        var markers = this._lineDecorations.get(type);
        if (!markers)
            return;
        var marker = markers.get(lineNumber);
        if (!marker)
            return;
        markers.delete(lineNumber);
        this.dispatchEventToListeners(WebInspector.UISourceCode.Events.LineDecorationRemoved, marker);
        if (!markers.size)
            this._lineDecorations.delete(type);
    },

    /**
     * @param {string} type
     */
    removeAllLineDecorations: function(type)
    {
        var markers = this._lineDecorations.get(type);
        if (!markers)
            return;
        this._lineDecorations.delete(type);
        markers.forEach(marker => {
            this.dispatchEventToListeners(WebInspector.UISourceCode.Events.LineDecorationRemoved, marker);
        });
    },

    /**
     * @param {string} type
     * @return {?Map<number, !WebInspector.UISourceCode.LineMarker>}
     */
    lineDecorations: function(type)
    {
        return this._lineDecorations.get(type) || null;
    },

    __proto__: WebInspector.Object.prototype
}

/**
 * @constructor
 * @param {!WebInspector.UISourceCode} uiSourceCode
 * @param {number} lineNumber
 * @param {number} columnNumber
 */
WebInspector.UILocation = function(uiSourceCode, lineNumber, columnNumber)
{
    this.uiSourceCode = uiSourceCode;
    this.lineNumber = lineNumber;
    this.columnNumber = columnNumber;
}

WebInspector.UILocation.prototype = {
    /**
     * @return {string}
     */
    linkText: function()
    {
        var linkText = this.uiSourceCode.displayName();
        if (typeof this.lineNumber === "number")
            linkText += ":" + (this.lineNumber + 1);
        return linkText;
    },

    /**
     * @return {string}
     */
    id: function()
    {
        return this.uiSourceCode.project().id() + ":" + this.uiSourceCode.url() + ":" + this.lineNumber + ":" + this.columnNumber;
    },

    /**
     * @return {string}
     */
    toUIString: function()
    {
        return this.uiSourceCode.url() + ":" + (this.lineNumber + 1);
    }
}

/**
 * @constructor
 * @implements {WebInspector.ContentProvider}
 * @param {!WebInspector.UISourceCode} uiSourceCode
 * @param {?string|undefined} content
 * @param {!Date} timestamp
 */
WebInspector.Revision = function(uiSourceCode, content, timestamp)
{
    this._uiSourceCode = uiSourceCode;
    this._content = content;
    this._timestamp = timestamp;
}

WebInspector.Revision.prototype = {
    /**
     * @return {!WebInspector.UISourceCode}
     */
    get uiSourceCode()
    {
        return this._uiSourceCode;
    },

    /**
     * @return {!Date}
     */
    get timestamp()
    {
        return this._timestamp;
    },

    /**
     * @return {?string}
     */
    get content()
    {
        return this._content || null;
    },

    /**
     * @return {!Promise}
     */
    revertToThis: function()
    {
        /**
         * @param {?string} content
         * @this {WebInspector.Revision}
         */
        function revert(content)
        {
            if (content && this._uiSourceCode._content !== content)
                this._uiSourceCode.addRevision(content);
        }
        WebInspector.userMetrics.actionTaken(WebInspector.UserMetrics.Action.RevisionApplied);
        return this.requestContent().then(revert.bind(this));
    },

    /**
     * @override
     * @return {string}
     */
    contentURL: function()
    {
        return this._uiSourceCode.url();
    },

    /**
     * @override
     * @return {!WebInspector.ResourceType}
     */
    contentType: function()
    {
        return this._uiSourceCode.contentType();
    },

    /**
     * @override
     * @return {!Promise<?string>}
     */
    requestContent: function()
    {
        return Promise.resolve(/** @type {?string} */(this._content || ""));
    },

    /**
     * @override
     * @param {string} query
     * @param {boolean} caseSensitive
     * @param {boolean} isRegex
     * @param {function(!Array.<!WebInspector.ContentProvider.SearchMatch>)} callback
     */
    searchInContent: function(query, caseSensitive, isRegex, callback)
    {
        callback([]);
    }
}

/**
 * @constructor
 * @param {!WebInspector.UISourceCode} uiSourceCode
 * @param {!WebInspector.UISourceCode.Message.Level} level
 * @param {string} text
 * @param {!WebInspector.TextRange} range
 */
WebInspector.UISourceCode.Message = function(uiSourceCode, level, text, range)
{
    this._uiSourceCode = uiSourceCode;
    this._level = level;
    this._text = text;
    this._range = range;
}

/**
 * @enum {string}
 */
WebInspector.UISourceCode.Message.Level = {
    Error: "Error",
    Warning: "Warning"
}

WebInspector.UISourceCode.Message.prototype = {
    /**
     * @return {!WebInspector.UISourceCode}
     */
    uiSourceCode: function()
    {
        return this._uiSourceCode;
    },

    /**
     * @return {!WebInspector.UISourceCode.Message.Level}
     */
    level: function()
    {
        return this._level;
    },

    /**
     * @return {string}
     */
    text: function()
    {
        return this._text;
    },

    /**
     * @return {!WebInspector.TextRange}
     */
    range: function()
    {
        return this._range;
    },

    /**
     * @return {number}
     */
    lineNumber: function()
    {
        return this._range.startLine;
    },

    /**
     * @return {(number|undefined)}
     */
    columnNumber: function()
    {
        return this._range.startColumn;
    },

    /**
     * @param {!WebInspector.UISourceCode.Message} another
     * @return {boolean}
     */
    isEqual: function(another)
    {
        return this._uiSourceCode === another._uiSourceCode && this.text() === another.text() && this.level() === another.level() && this.range().equal(another.range());
    },

    remove: function()
    {
        this._uiSourceCode.removeMessage(this);
    }
}

/**
 * @constructor
 * @param {number} line
 * @param {string} type
 * @param {?} data
 */
WebInspector.UISourceCode.LineMarker = function(line, type, data)
{
    this._line = line;
    this._type = type;
    this._data = data;
}

WebInspector.UISourceCode.LineMarker.prototype = {
    /**
     * @return {number}
     */
    line: function()
    {
        return this._line;
    },

    /**
     * @return {string}
     */
    type: function()
    {
        return this._type;
    },

    /**
     * @return {*}
     */
    data: function()
    {
        return this._data;
    }
}
