// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../core/platform/platform.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
import * as Acorn from '../../third_party/acorn/acorn.js';

export type TokenOrComment = Acorn.Token|Acorn.Comment;

/**
 * The tokenizer in Acorn does not allow you to peek into the next token.
 * We use the peekToken method to determine when to stop formatting a
 * particular block of code.
 *
 * To remedy the situation, we implement the peeking of tokens ourselves.
 * To do so, whenever we call `nextToken`, we already retrieve the token
 * after it (in `bufferedToken`), so that `_peekToken` can check if there
 * is more work to do.
 *
 * There are 2 catches:
 *
 * 1. in the constructor we need to start the initialize the buffered token,
 *    such that `peekToken` on the first call is able to retrieve it. However,
 * 2. comments and tokens can arrive intermixed from the tokenizer. This usually
 *    happens when comments are the first comments of a file. In the scenario that
 *    the first comment in a file is a line comment attached to a token, we first
 *    receive the token and after that we receive the comment. However, when tokenizing
 *    we should reverse the order and return the comment, before the token.
 *
 * All that is to say that the `bufferedToken` is only used for *true* tokens.
 * We mimic comments to be tokens to fix the reordering issue, but we store these
 * separately to keep track of them. Any call to `nextTokenInternal` will figure
 * out whether the next token should be the preceding comment or not.
 */
export class AcornTokenizer {
  readonly #content: string;
  readonly #comments: Acorn.Comment[];
  #tokenizer: {
    getToken(): Acorn.Token,
    [Symbol.iterator](): Iterator<Acorn.Token>,
  };
  #textCursor: TextUtils.TextCursor.TextCursor;
  #tokenLineStartInternal: number;
  #tokenLineEndInternal: number;
  #tokenColumnStartInternal: number;
  #bufferedToken?: TokenOrComment;

  constructor(content: string) {
    this.#content = content;
    this.#comments = [];
    this.#tokenizer =
        Acorn.tokenizer(this.#content, {onComment: this.#comments, ecmaVersion: ECMA_VERSION, allowHashBang: true});
    const contentLineEndings = Platform.StringUtilities.findLineEndingIndexes(this.#content);
    this.#textCursor = new TextUtils.TextCursor.TextCursor(contentLineEndings);
    this.#tokenLineStartInternal = 0;
    this.#tokenLineEndInternal = 0;
    this.#tokenColumnStartInternal = 0;
    // If the first "token" should be a comment, we don't want to shift
    // the comment from the array (which happens in `nextTokenInternal`).
    // Therefore, we should bail out from retrieving the token if this
    // is the case.
    //
    // However, sometimes we have leading comments that are attached to tokens
    // themselves. In that case, we first retrieve the actual token, before
    // we see the comment itself. In that case, we should proceed and
    // initialize `bufferedToken` as normal, to allow us to fix the reordering.
    if (this.#comments.length === 0) {
      this.#nextTokenInternal();
    }
  }

  static punctuator(token: Acorn.Token, values?: string): boolean {
    return token.type !== Acorn.tokTypes.num && token.type !== Acorn.tokTypes.regexp &&
        token.type !== Acorn.tokTypes.string && token.type !== Acorn.tokTypes.name && !token.type.keyword &&
        (!values || (token.type.label.length === 1 && values.indexOf(token.type.label) !== -1));
  }

  static keyword(token: Acorn.Token, keyword?: string): boolean {
    return Boolean(token.type.keyword) && token.type !== Acorn.tokTypes['_true'] &&
        token.type !== Acorn.tokTypes['_false'] && token.type !== Acorn.tokTypes['_null'] &&
        (!keyword || token.type.keyword === keyword);
  }

  static identifier(token: TokenOrComment, identifier?: string): boolean {
    return token.type === Acorn.tokTypes.name && (!identifier || token.value === identifier);
  }

  static lineComment(token: TokenOrComment): boolean {
    return token.type === 'Line';
  }

  static blockComment(token: TokenOrComment): boolean {
    return token.type === 'Block';
  }

  #nextTokenInternal(): TokenOrComment|undefined {
    if (this.#comments.length) {
      const nextComment = this.#comments.shift();
      // If this was the last comment to process, we need to make
      // sure to update our `bufferedToken` to become the actual
      // token. This only happens when we are processing the very
      // first comment of a file (usually a hashbang comment)
      // in which case we don't have to fix the reordering of tokens.
      if (!this.#bufferedToken && this.#comments.length === 0) {
        this.#bufferedToken = this.#tokenizer.getToken();
      }
      return nextComment;
    }
    const token = this.#bufferedToken;
    this.#bufferedToken = this.#tokenizer.getToken();
    return token;
  }

  nextToken(): TokenOrComment|null {
    const token = this.#nextTokenInternal();
    if (!token || token.type === Acorn.tokTypes.eof) {
      return null;
    }

    this.#textCursor.advance(token.start);
    this.#tokenLineStartInternal = this.#textCursor.lineNumber();
    this.#tokenColumnStartInternal = this.#textCursor.columnNumber();

    this.#textCursor.advance(token.end);
    this.#tokenLineEndInternal = this.#textCursor.lineNumber();
    return token;
  }

  peekToken(): TokenOrComment|null {
    if (this.#comments.length) {
      return this.#comments[0];
    }
    if (!this.#bufferedToken) {
      return null;
    }
    return this.#bufferedToken.type !== Acorn.tokTypes.eof ? this.#bufferedToken : null;
  }

  tokenLineStart(): number {
    return this.#tokenLineStartInternal;
  }

  tokenLineEnd(): number {
    return this.#tokenLineEndInternal;
  }

  tokenColumnStart(): number {
    return this.#tokenColumnStartInternal;
  }
}

export const ECMA_VERSION = 2022;
