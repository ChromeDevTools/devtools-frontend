// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as TextUtils from '../text_utils/text_utils.js';

import {CSSModel} from './CSSModel.js';  // eslint-disable-line no-unused-vars
import {DeferredDOMNode} from './DOMModel.js';
import {ResourceTreeModel} from './ResourceTreeModel.js';

/**
 * @implements {TextUtils.ContentProvider.ContentProvider}
 * @unrestricted
 */
export class CSSStyleSheetHeader {
  /**
   * @param {!CSSModel} cssModel
   * @param {!Protocol.CSS.CSSStyleSheetHeader} payload
   */
  constructor(cssModel, payload) {
    this._cssModel = cssModel;
    this.id = payload.styleSheetId;
    this.frameId = payload.frameId;
    this.sourceURL = payload.sourceURL;
    this.hasSourceURL = !!payload.hasSourceURL;
    this.origin = payload.origin;
    this.title = payload.title;
    this.disabled = payload.disabled;
    this.isInline = payload.isInline;
    this.startLine = payload.startLine;
    this.startColumn = payload.startColumn;
    this.endLine = payload.endLine;
    this.endColumn = payload.endColumn;
    this.contentLength = payload.length;
    if (payload.ownerNode) {
      this.ownerNode = new DeferredDOMNode(cssModel.target(), payload.ownerNode);
    }
    this.setSourceMapURL(payload.sourceMapURL);
  }

  /**
   * @return {!TextUtils.ContentProvider.ContentProvider}
   */
  originalContentProvider() {
    if (!this._originalContentProvider) {
      const lazyContent = /** @type {function():!Promise<!TextUtils.ContentProvider.DeferredContent>} */ (async () => {
        const originalText = await this._cssModel.originalStyleSheetText(this);
        // originalText might be an empty string which should not trigger the error
        if (originalText === null) {
          return {error: ls`Could not find the original style sheet.`, isEncoded: false};
        }
        return {content: originalText, isEncoded: false};
      });
      this._originalContentProvider =
          new TextUtils.StaticContentProvider.StaticContentProvider(this.contentURL(), this.contentType(), lazyContent);
    }
    return this._originalContentProvider;
  }

  /**
   * @param {string=} sourceMapURL
   */
  setSourceMapURL(sourceMapURL) {
    this.sourceMapURL = sourceMapURL;
  }

  /**
   * @return {!CSSModel}
   */
  cssModel() {
    return this._cssModel;
  }

  /**
   * @return {boolean}
   */
  isAnonymousInlineStyleSheet() {
    return !this.resourceURL() && !this._cssModel.sourceMapManager().sourceMapForClient(this);
  }

  /**
   * @return {string}
   */
  resourceURL() {
    return this.isViaInspector() ? this._viaInspectorResourceURL() : this.sourceURL;
  }

  /**
   * @return {string}
   */
  _viaInspectorResourceURL() {
    const frame = this._cssModel.target().model(ResourceTreeModel).frameForId(this.frameId);
    console.assert(frame);
    const parsedURL = new Common.ParsedURL.ParsedURL(frame.url);
    let fakeURL = 'inspector://' + parsedURL.host + parsedURL.folderPathComponents;
    if (!fakeURL.endsWith('/')) {
      fakeURL += '/';
    }
    fakeURL += 'inspector-stylesheet';
    return fakeURL;
  }

  /**
   * @param {number} lineNumberInStyleSheet
   * @return {number}
   */
  lineNumberInSource(lineNumberInStyleSheet) {
    return this.startLine + lineNumberInStyleSheet;
  }

  /**
   * @param {number} lineNumberInStyleSheet
   * @param {number} columnNumberInStyleSheet
   * @return {number|undefined}
   */
  columnNumberInSource(lineNumberInStyleSheet, columnNumberInStyleSheet) {
    return (lineNumberInStyleSheet ? 0 : this.startColumn) + columnNumberInStyleSheet;
  }

  /**
   * Checks whether the position is in this style sheet. Assumes that the
   * position's columnNumber is consistent with line endings.
   * @param {number} lineNumber
   * @param {number} columnNumber
   * @return {boolean}
   */
  containsLocation(lineNumber, columnNumber) {
    const afterStart =
        (lineNumber === this.startLine && columnNumber >= this.startColumn) || lineNumber > this.startLine;
    const beforeEnd = lineNumber < this.endLine || (lineNumber === this.endLine && columnNumber <= this.endColumn);
    return afterStart && beforeEnd;
  }

  /**
   * @override
   * @return {string}
   */
  contentURL() {
    return this.resourceURL();
  }

  /**
   * @override
   * @return {!Common.ResourceType.ResourceType}
   */
  contentType() {
    return Common.ResourceType.resourceTypes.Stylesheet;
  }

  /**
   * @override
   * @return {!Promise<boolean>}
   */
  contentEncoded() {
    return Promise.resolve(false);
  }

  /**
   * @override
   * @return {!Promise<!TextUtils.ContentProvider.DeferredContent>}
   */
  async requestContent() {
    try {
      const cssText = await this._cssModel.getStyleSheetText(this.id);
      return {content: /** @type{string} */ (cssText), isEncoded: false};
    } catch (err) {
      return {
        error: ls`There was an error retrieving the source styles.`,
        isEncoded: false,
      };
    }
  }

  /**
   * @override
   * @param {string} query
   * @param {boolean} caseSensitive
   * @param {boolean} isRegex
   * @return {!Promise<!Array<!TextUtils.ContentProvider.SearchMatch>>}
   */
  async searchInContent(query, caseSensitive, isRegex) {
    const {content} = await this.requestContent();
    return TextUtils.TextUtils.performSearchInContent(content || '', query, caseSensitive, isRegex);
  }

  /**
   * @return {boolean}
   */
  isViaInspector() {
    return this.origin === 'inspector';
  }
}
