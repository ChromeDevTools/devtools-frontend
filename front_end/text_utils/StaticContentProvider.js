// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';  // eslint-disable-line no-unused-vars

import {ContentProvider, DeferredContent, SearchMatch} from './ContentProvider.js';  // eslint-disable-line no-unused-vars
import {performSearchInContent} from './TextUtils.js';

/**
 * @implements {ContentProvider}
 * @unrestricted
 */
export class StaticContentProvider {
  /**
   * @param {string} contentURL
   * @param {!Common.ResourceType.ResourceType} contentType
   * @param {function():!Promise<!DeferredContent>} lazyContent
   */
  constructor(contentURL, contentType, lazyContent) {
    this._contentURL = contentURL;
    this._contentType = contentType;
    this._lazyContent = lazyContent;
  }

  /**
   * @param {string} contentURL
   * @param {!Common.ResourceType.ResourceType} contentType
   * @param {string} content
   * @return {!StaticContentProvider}
   */
  static fromString(contentURL, contentType, content) {
    const lazyContent = () => Promise.resolve({content, isEncoded: false});
    return new StaticContentProvider(contentURL, contentType, lazyContent);
  }

  /**
   * @override
   * @return {string}
   */
  contentURL() {
    return this._contentURL;
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
  contentEncoded() {
    return Promise.resolve(false);
  }

  /**
   * @override
   * @return {!Promise<!DeferredContent>}
   */
  requestContent() {
    return this._lazyContent();
  }

  /**
   * @override
   * @param {string} query
   * @param {boolean} caseSensitive
   * @param {boolean} isRegex
   * @return {!Promise<!Array<!SearchMatch>>}
   */
  async searchInContent(query, caseSensitive, isRegex) {
    const {content} = /** @type { {content: string, isEncoded: boolean} }*/ (await this._lazyContent());
    return content ? performSearchInContent(content, query, caseSensitive, isRegex) : [];
  }
}
