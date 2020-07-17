// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../platform/platform.js';
import * as TextUtils from '../text_utils/text_utils.js';
import * as Acorn from '../third_party/acorn/acorn.js';

/**
 * @typedef {(!Acorn.Token|!Acorn.Comment)}
 */
// @ts-ignore typedef
export let TokenOrComment;

/**
 * @unrestricted
 */
export class AcornTokenizer {
  /**
   * @param {string} content
   */
  constructor(content) {
    this._content = content;
    /** @type {!Array<!Acorn.Comment>} */
    this._comments = [];
    this._tokenizer = Acorn.tokenizer(this._content, {onComment: this._comments, ecmaVersion: ECMA_VERSION});
    const contentLineEndings = Platform.StringUtilities.findLineEndingIndexes(this._content);
    this._textCursor = new TextUtils.TextCursor.TextCursor(contentLineEndings);
    this._tokenLineStart = 0;
    this._tokenLineEnd = 0;
    this._tokenColumnStart = 0;
    this._nextTokenInternal();
  }

  /**
   * @param {!Acorn.Token} token
   * @param {string=} values
   * @return {boolean}
   */
  static punctuator(token, values) {
    return token.type !== Acorn.tokTypes.num && token.type !== Acorn.tokTypes.regexp &&
        token.type !== Acorn.tokTypes.string && token.type !== Acorn.tokTypes.name && !token.type.keyword &&
        (!values || (token.type.label.length === 1 && values.indexOf(token.type.label) !== -1));
  }

  /**
   * @param {!Acorn.Token} token
   * @param {string=} keyword
   * @return {boolean}
   */
  static keyword(token, keyword) {
    return !!token.type.keyword && token.type !== Acorn.tokTypes['_true'] && token.type !== Acorn.tokTypes['_false'] &&
        token.type !== Acorn.tokTypes['_null'] && (!keyword || token.type.keyword === keyword);
  }

  /**
   * @param {!TokenOrComment} token
   * @param {string=} identifier
   * @return {boolean}
   */
  static identifier(token, identifier) {
    return token.type === Acorn.tokTypes.name && (!identifier || token.value === identifier);
  }

  /**
   * @param {!TokenOrComment} token
   * @return {boolean}
   */
  static lineComment(token) {
    return token.type === 'Line';
  }

  /**
   * @param {!TokenOrComment} token
   * @return {boolean}
   */
  static blockComment(token) {
    return token.type === 'Block';
  }

  /**
   * @return {!TokenOrComment}
   */
  _nextTokenInternal() {
    if (this._comments.length) {
      return /** @type {!TokenOrComment} */ (this._comments.shift());
    }
    const token = this._bufferedToken;

    this._bufferedToken = this._tokenizer.getToken();
    return /** @type {!TokenOrComment} */ (token);
  }

  /**
   * @return {?TokenOrComment}
   */
  nextToken() {
    const token = this._nextTokenInternal();
    if (token.type === Acorn.tokTypes.eof) {
      return null;
    }

    this._textCursor.advance(token.start);
    this._tokenLineStart = this._textCursor.lineNumber();
    this._tokenColumnStart = this._textCursor.columnNumber();

    this._textCursor.advance(token.end);
    this._tokenLineEnd = this._textCursor.lineNumber();
    return token;
  }

  /**
   * @return {?TokenOrComment}
   */
  peekToken() {
    if (this._comments.length) {
      return this._comments[0];
    }
    if (!this._bufferedToken) {
      return null;
    }
    return this._bufferedToken.type !== Acorn.tokTypes.eof ? this._bufferedToken : null;
  }

  /**
   * @return {number}
   */
  tokenLineStart() {
    return this._tokenLineStart;
  }

  /**
   * @return {number}
   */
  tokenLineEnd() {
    return this._tokenLineEnd;
  }

  /**
   * @return {number}
   */
  tokenColumnStart() {
    return this._tokenColumnStart;
  }
}

export const ECMA_VERSION = 11;
