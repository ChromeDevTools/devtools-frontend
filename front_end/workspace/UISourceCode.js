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

import * as Common from '../common/common.js';
import * as Platform from '../platform/platform.js';
import * as TextUtils from '../text_utils/text_utils.js';

import {Events as WorkspaceImplEvents, Project, projectTypes} from './WorkspaceImpl.js';  // eslint-disable-line no-unused-vars

/**
 * @implements {TextUtils.ContentProvider.ContentProvider}
 * @unrestricted
 */
export class UISourceCode extends Common.ObjectWrapper.ObjectWrapper {
  /**
   * @param {!Project} project
   * @param {string} url
   * @param {!Common.ResourceType.ResourceType} contentType
   */
  constructor(project, url, contentType) {
    super();
    this._project = project;
    /** @type {string} */
    this._url = url;

    const parsedURL = Common.ParsedURL.ParsedURL.fromString(url);
    if (parsedURL) {
      this._origin = parsedURL.securityOrigin();
      this._parentURL = this._origin + parsedURL.folderPathComponents;
      this._name = parsedURL.lastPathComponent;
      if (parsedURL.queryParams) {
        this._name += '?' + parsedURL.queryParams;
      }
    } else {
      this._origin = '';
      this._parentURL = '';
      this._name = url;
    }

    this._contentType = contentType;
    /** @type {?Promise<!TextUtils.ContentProvider.DeferredContent>} */
    this._requestContentPromise = null;
    /** @type {?Platform.Multimap<string, !LineMarker>} */
    this._decorations = null;
    this._hasCommits = false;
    /** @type {?Set<!Message>} */
    this._messages = null;
    this._contentLoaded = false;
    /** @type {?TextUtils.ContentProvider.DeferredContent} */
    this._content = null;
    this._forceLoadOnCheckContent = false;
    this._checkingContent = false;
    /** @type {?string} */
    this._lastAcceptedContent = null;
    /** @type {?string} */
    this._workingCopy = null;
    /** @type {?function() : string} */
    this._workingCopyGetter = null;
    this._disableEdit = false;
  }

  /**
   * @return {!Promise<?UISourceCodeMetadata>}
   */
  requestMetadata() {
    return this._project.requestMetadata(this);
  }

  /**
   * @return {string}
   */
  name() {
    return this._name;
  }

  /**
   * @return {string}
   */
  mimeType() {
    return this._project.mimeType(this);
  }

  /**
   * @return {string}
   */
  url() {
    return this._url;
  }

  /**
   * @return {string}
   */
  parentURL() {
    return this._parentURL;
  }

  /**
   * @return {string}
   */
  origin() {
    return this._origin;
  }

  /**
   * @return {string}
   */
  fullDisplayName() {
    return this._project.fullDisplayName(this);
  }

  /**
   * @param {boolean=} skipTrim
   * @return {string}
   */
  displayName(skipTrim) {
    if (!this._name) {
      return Common.UIString.UIString('(index)');
    }
    let name = this._name;
    try {
      if (this.project().type() === projectTypes.FileSystem) {
        name = unescape(name);
      } else {
        name = decodeURI(name);
      }
    } catch (e) {
    }
    return skipTrim ? name : name.trimEndWithMaxLength(100);
  }

  /**
   * @return {boolean}
   */
  canRename() {
    return this._project.canRename();
  }

  /**
   * @param {string} newName
   * @return {!Promise<boolean>}
   */
  rename(newName) {
    /** @type {function(boolean):void} */
    let fulfill;
    const promise = new Promise(x => fulfill = x);
    this._project.rename(this, newName, innerCallback.bind(this));
    return promise;

    /**
     * @param {boolean} success
     * @param {string=} newName
     * @param {string=} newURL
     * @param {!Common.ResourceType.ResourceType=} newContentType
     * @this {UISourceCode}
     */
    function innerCallback(success, newName, newURL, newContentType) {
      if (success) {
        this._updateName(
            /** @type {string} */ (newName), /** @type {string} */ (newURL),
            /** @type {!Common.ResourceType.ResourceType} */ (newContentType));
      }
      fulfill(success);
    }
  }

  remove() {
    this._project.deleteFile(this);
  }

  /**
   * @param {string} name
   * @param {string} url
   * @param {!Common.ResourceType.ResourceType=} contentType
   */
  _updateName(name, url, contentType) {
    const oldURL = this._url;
    this._url = this._url.substring(0, this._url.length - this._name.length) + name;
    this._name = name;
    if (url) {
      this._url = url;
    }
    if (contentType) {
      this._contentType = contentType;
    }
    this.dispatchEventToListeners(Events.TitleChanged, this);
    this.project().workspace().dispatchEventToListeners(
        WorkspaceImplEvents.UISourceCodeRenamed, {oldURL: oldURL, uiSourceCode: this});
  }

  /**
   * @override
   * @return {string}
   */
  contentURL() {
    return this.url();
  }

  /**
   * @override
   * @return {!Common.ResourceType.ResourceType}
   */
  contentType() {
    return this._contentType;
  }

  /**
   * @override
   * @return {!Promise<boolean>}
   */
  async contentEncoded() {
    await this.requestContent();
    return this._contentEncoded || false;
  }

  /**
   * @return {!Project}
   */
  project() {
    return this._project;
  }

  /**
   * @override
   * @return {!Promise<!TextUtils.ContentProvider.DeferredContent>}
   */
  requestContent() {
    if (this._requestContentPromise) {
      return this._requestContentPromise;
    }

    if (this._contentLoaded) {
      return Promise.resolve(/** @type {!TextUtils.ContentProvider.DeferredContent} */ (this._content));
    }


    this._requestContentPromise = this._requestContentImpl();
    return this._requestContentPromise;
  }

  /**
   * @returns {!Promise<!TextUtils.ContentProvider.DeferredContent>}
   */
  async _requestContentImpl() {
    try {
      const content = await this._project.requestFileContent(this);
      if (!this._contentLoaded) {
        this._contentLoaded = true;
        this._content = content;
        this._contentEncoded = content.isEncoded;
      }
    } catch (err) {
      this._contentLoaded = true;
      this._content = {error: err ? String(err) : '', isEncoded: false};
    }

    return /** @type {!TextUtils.ContentProvider.DeferredContent} */ (this._content);
  }

  async checkContentUpdated() {
    if (!this._contentLoaded && !this._forceLoadOnCheckContent) {
      return;
    }

    if (!this._project.canSetFileContent() || this._checkingContent) {
      return;
    }

    this._checkingContent = true;
    const updatedContent = await this._project.requestFileContent(this);
    if ('error' in updatedContent) {
      return;
    }
    this._checkingContent = false;
    if (updatedContent.content === null) {
      const workingCopy = this.workingCopy();
      this._contentCommitted('', false);
      this.setWorkingCopy(workingCopy);
      return;
    }
    if (this._lastAcceptedContent === updatedContent.content) {
      return;
    }

    if (this._content && 'content' in this._content && this._content.content === updatedContent.content) {
      this._lastAcceptedContent = null;
      return;
    }

    if (!this.isDirty() || this._workingCopy === updatedContent.content) {
      this._contentCommitted(/** @type {string} */ (updatedContent.content), false);
      return;
    }

    await Common.Revealer.reveal(this);

    // Make sure we are in the next frame before stopping the world with confirm
    await new Promise(resolve => setTimeout(resolve, 0));

    const shouldUpdate = window.confirm(ls`This file was changed externally. Would you like to reload it?`);
    if (shouldUpdate) {
      this._contentCommitted(/** @type {string} */ (updatedContent.content), false);
    } else {
      this._lastAcceptedContent = updatedContent.content;
    }
  }

  forceLoadOnCheckContent() {
    this._forceLoadOnCheckContent = true;
  }

  /**
   * @param {string} content
   */
  _commitContent(content) {
    if (this._project.canSetFileContent()) {
      this._project.setFileContent(this, content, false);
    }
    this._contentCommitted(content, true);
  }

  /**
   * @param {string} content
   * @param {boolean} committedByUser
   */
  _contentCommitted(content, committedByUser) {
    this._lastAcceptedContent = null;
    this._content = {content, isEncoded: false};
    this._contentLoaded = true;
    this._requestContentPromise = null;

    this._hasCommits = true;

    this._innerResetWorkingCopy();
    const data = {uiSourceCode: this, content, encoded: this._contentEncoded};
    this.dispatchEventToListeners(Events.WorkingCopyCommitted, data);
    this._project.workspace().dispatchEventToListeners(WorkspaceImplEvents.WorkingCopyCommitted, data);
    if (committedByUser) {
      this._project.workspace().dispatchEventToListeners(WorkspaceImplEvents.WorkingCopyCommittedByUser, data);
    }
  }

  /**
   * @param {string} content
   */
  addRevision(content) {
    this._commitContent(content);
  }

  /**
   * @return {boolean}
   */
  hasCommits() {
    return this._hasCommits;
  }

  /**
   * @return {string}
   */
  workingCopy() {
    if (this._workingCopyGetter) {
      this._workingCopy = this._workingCopyGetter();
      this._workingCopyGetter = null;
    }
    if (this.isDirty()) {
      return /** @type {string} */ (this._workingCopy);
    }
    return (this._content && 'content' in this._content && this._content.content) || '';
  }

  resetWorkingCopy() {
    this._innerResetWorkingCopy();
    this._workingCopyChanged();
  }

  _innerResetWorkingCopy() {
    this._workingCopy = null;
    this._workingCopyGetter = null;
  }

  /**
   * @param {string} newWorkingCopy
   */
  setWorkingCopy(newWorkingCopy) {
    this._workingCopy = newWorkingCopy;
    this._workingCopyGetter = null;
    this._workingCopyChanged();
  }

  /**
   * @param {string} content
   * @param {boolean} isBase64
   */
  setContent(content, isBase64) {
    this._contentEncoded = isBase64;
    if (this._project.canSetFileContent()) {
      this._project.setFileContent(this, content, isBase64);
    }
    this._contentCommitted(content, true);
  }

  /**
  * @param {function(): string } workingCopyGetter
  */
  setWorkingCopyGetter(workingCopyGetter) {
    this._workingCopyGetter = workingCopyGetter;
    this._workingCopyChanged();
  }

  _workingCopyChanged() {
    this._removeAllMessages();
    this.dispatchEventToListeners(Events.WorkingCopyChanged, this);
    this._project.workspace().dispatchEventToListeners(WorkspaceImplEvents.WorkingCopyChanged, {uiSourceCode: this});
  }

  removeWorkingCopyGetter() {
    if (!this._workingCopyGetter) {
      return;
    }
    this._workingCopy = this._workingCopyGetter();
    this._workingCopyGetter = null;
  }

  commitWorkingCopy() {
    if (this.isDirty()) {
      this._commitContent(this.workingCopy());
    }
  }

  /**
   * @return {boolean}
   */
  isDirty() {
    return this._workingCopy !== null || this._workingCopyGetter !== null;
  }

  /**
   * @return {string}
   */
  extension() {
    return Common.ParsedURL.ParsedURL.extractExtension(this._name);
  }

  /**
   * @return {string}
   */
  content() {
    return (this._content && 'content' in this._content && this._content.content) || '';
  }

  /**
   * @return {?string}
   */
  loadError() {
    return (this._content && 'error' in this._content && this._content.error) || null;
  }

  /**
   * @override
   * @param {string} query
   * @param {boolean} caseSensitive
   * @param {boolean} isRegex
   * @return {!Promise<!Array<!TextUtils.ContentProvider.SearchMatch>>}
   */
  searchInContent(query, caseSensitive, isRegex) {
    const content = this.content();
    if (!content) {
      return this._project.searchInFileContent(this, query, caseSensitive, isRegex);
    }
    return Promise.resolve(TextUtils.TextUtils.performSearchInContent(content, query, caseSensitive, isRegex));
  }

  /**
   * @return {boolean}
   */
  contentLoaded() {
    return this._contentLoaded;
  }

  /**
   * @param {number} lineNumber
   * @param {number=} columnNumber
   * @return {!UILocation}
   */
  uiLocation(lineNumber, columnNumber) {
    if (typeof columnNumber === 'undefined') {
      columnNumber = 0;
    }
    return new UILocation(this, lineNumber, columnNumber);
  }

  /**
   * @return {!Set<!Message>}
   */
  messages() {
    return this._messages ? new Set(this._messages) : new Set();
  }

  /**
   * @param {!Message.Level} level
   * @param {string} text
   * @param {number} lineNumber
   * @param {number=} columnNumber
   * @return {!Message} message
   */
  addLineMessage(level, text, lineNumber, columnNumber) {
    return this.addMessage(
        level, text, new TextUtils.TextRange.TextRange(lineNumber, columnNumber || 0, lineNumber, columnNumber || 0));
  }

  /**
   * @param {!Message.Level} level
   * @param {string} text
   * @param {!TextUtils.TextRange.TextRange} range
   * @return {!Message} message
   */
  addMessage(level, text, range) {
    const message = new Message(this, level, text, range);
    if (!this._messages) {
      this._messages = new Set();
    }
    this._messages.add(message);
    this.dispatchEventToListeners(Events.MessageAdded, message);
    return message;
  }

  /**
   * @param {!Message} message
   */
  removeMessage(message) {
    if (this._messages && this._messages.delete(message)) {
      this.dispatchEventToListeners(Events.MessageRemoved, message);
    }
  }

  _removeAllMessages() {
    if (!this._messages) {
      return;
    }
    for (const message of this._messages) {
      this.dispatchEventToListeners(Events.MessageRemoved, message);
    }
    this._messages = null;
  }

  /**
   * @param {number} lineNumber
   * @param {string} type
   * @param {?} data
   */
  addLineDecoration(lineNumber, type, data) {
    this.addDecoration(TextUtils.TextRange.TextRange.createFromLocation(lineNumber, 0), type, data);
  }

  /**
   * @param {!TextUtils.TextRange.TextRange} range
   * @param {string} type
   * @param {?} data
   */
  addDecoration(range, type, data) {
    const marker = new LineMarker(range, type, data);
    if (!this._decorations) {
      this._decorations = new Platform.Multimap();
    }
    this._decorations.set(type, marker);
    this.dispatchEventToListeners(Events.LineDecorationAdded, marker);
  }

  /**
   * @param {string} type
   */
  removeDecorationsForType(type) {
    if (!this._decorations) {
      return;
    }
    const markers = this._decorations.get(type);
    this._decorations.deleteAll(type);
    markers.forEach(marker => {
      this.dispatchEventToListeners(Events.LineDecorationRemoved, marker);
    });
  }

  /**
   * @return {!Array<!LineMarker>}
   */
  allDecorations() {
    return this._decorations ? this._decorations.valuesArray() : [];
  }

  removeAllDecorations() {
    if (!this._decorations) {
      return;
    }
    const decorationList = this._decorations.valuesArray();
    this._decorations.clear();
    decorationList.forEach(marker => this.dispatchEventToListeners(Events.LineDecorationRemoved, marker));
  }

  /**
   * @param {string} type
   * @return {?Set<!LineMarker>}
   */
  decorationsForType(type) {
    return this._decorations ? this._decorations.get(type) : null;
  }

  disableEdit() {
    this._disableEdit = true;
  }

  /**
   * @return {boolean}
   */
  editDisabled() {
    return this._disableEdit;
  }
}

/** @enum {symbol} */
export const Events = {
  WorkingCopyChanged: Symbol('WorkingCopyChanged'),
  WorkingCopyCommitted: Symbol('WorkingCopyCommitted'),
  TitleChanged: Symbol('TitleChanged'),
  MessageAdded: Symbol('MessageAdded'),
  MessageRemoved: Symbol('MessageRemoved'),
  LineDecorationAdded: Symbol('LineDecorationAdded'),
  LineDecorationRemoved: Symbol('LineDecorationRemoved')
};

/**
 * @unrestricted
 */
export class UILocation {
  /**
   * @param {!UISourceCode} uiSourceCode
   * @param {number} lineNumber
   * @param {number} columnNumber
   */
  constructor(uiSourceCode, lineNumber, columnNumber) {
    this.uiSourceCode = uiSourceCode;
    this.lineNumber = lineNumber;
    this.columnNumber = columnNumber;
  }

  /**
   * @param {boolean=} skipTrim
   * @return {string}
   */
  linkText(skipTrim) {
    let linkText = this.uiSourceCode.displayName(skipTrim);
    if (typeof this.lineNumber === 'number') {
      linkText += ':' + (this.lineNumber + 1);
    }
    return linkText;
  }

  /**
   * @return {string}
   */
  id() {
    return this.uiSourceCode.project().id() + ':' + this.uiSourceCode.url() + ':' + this.lineNumber + ':' +
        this.columnNumber;
  }

  /**
   * @return {string}
   */
  toUIString() {
    return this.uiSourceCode.url() + ':' + (this.lineNumber + 1);
  }

  /**
   * @param {!UILocation} location1
   * @param {!UILocation} location2
   * @return {number}
   */
  static comparator(location1, location2) {
    return location1.compareTo(location2);
  }

  /**
   * @param {!UILocation} other
   * @return {number}
   */
  compareTo(other) {
    if (this.uiSourceCode.url() !== other.uiSourceCode.url()) {
      return this.uiSourceCode.url() > other.uiSourceCode.url() ? 1 : -1;
    }
    if (this.lineNumber !== other.lineNumber) {
      return this.lineNumber - other.lineNumber;
    }
    return this.columnNumber - other.columnNumber;
  }
}

/**
 * @unrestricted
 */
export class Message {
  /**
   * @param {!UISourceCode} uiSourceCode
   * @param {!Message.Level} level
   * @param {string} text
   * @param {!TextUtils.TextRange.TextRange} range
   */
  constructor(uiSourceCode, level, text, range) {
    this._uiSourceCode = uiSourceCode;
    this._level = level;
    this._text = text;
    this._range = range;
  }

  /**
   * @return {!UISourceCode}
   */
  uiSourceCode() {
    return this._uiSourceCode;
  }

  /**
   * @return {!Message.Level}
   */
  level() {
    return this._level;
  }

  /**
   * @return {string}
   */
  text() {
    return this._text;
  }

  /**
   * @return {!TextUtils.TextRange.TextRange}
   */
  range() {
    return this._range;
  }

  /**
   * @return {number}
   */
  lineNumber() {
    return this._range.startLine;
  }

  /**
   * @return {(number|undefined)}
   */
  columnNumber() {
    return this._range.startColumn;
  }

  /**
   * @param {!Message} another
   * @return {boolean}
   */
  isEqual(another) {
    return this._uiSourceCode === another._uiSourceCode && this.text() === another.text() &&
        this.level() === another.level() && this.range().equal(another.range());
  }

  remove() {
    this._uiSourceCode.removeMessage(this);
  }
}

/**
 * @enum {string}
 */
Message.Level = {
  Error: 'Error',
  Warning: 'Warning'
};

/**
 * @unrestricted
 */
export class LineMarker {
  /**
   * @param {!TextUtils.TextRange.TextRange} range
   * @param {string} type
   * @param {?} data
   */
  constructor(range, type, data) {
    this._range = range;
    this._type = type;
    this._data = data;
  }

  /**
   * @return {!TextUtils.TextRange.TextRange}
   */
  range() {
    return this._range;
  }

  /**
   * @return {string}
   */
  type() {
    return this._type;
  }

  /**
   * @return {*}
   */
  data() {
    return this._data;
  }
}

/**
 * @unrestricted
 */
export class UISourceCodeMetadata {
  /**
   * @param {?Date} modificationTime
   * @param {?number} contentSize
   */
  constructor(modificationTime, contentSize) {
    this.modificationTime = modificationTime;
    this.contentSize = contentSize;
  }
}
