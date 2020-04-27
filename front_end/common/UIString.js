/*
 * Copyright (C) 2011 Google Inc.  All rights reserved.
 * Copyright (C) 2006, 2007, 2008 Apple Inc.  All rights reserved.
 * Copyright (C) 2007 Matt Lilek (pewtermoose@gmail.com).
 * Copyright (C) 2009 Joseph Pecoraro
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * 1.  Redistributions of source code must retain the above copyright
 *     notice, this list of conditions and the following disclaimer.
 * 2.  Redistributions in binary form must reproduce the above copyright
 *     notice, this list of conditions and the following disclaimer in the
 *     documentation and/or other materials provided with the distribution.
 * 3.  Neither the name of Apple Computer, Inc. ("Apple") nor the names of
 *     its contributors may be used to endorse or promote products derived
 *     from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE AND ITS CONTRIBUTORS "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL APPLE OR ITS CONTRIBUTORS BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import * as Platform from '../platform/platform.js';

/**
 * @param {string} string
 * @param {...*} vararg
 * @return {string}
 */
export function UIString(string, ...vararg) {
  return Platform.StringUtilities.vsprintf(localize(string), Array.prototype.slice.call(arguments, 1));
}

/**
 * @param {string} string
 * @param {?ArrayLike<*>} values
 * @return {string}
 */
export function serializeUIString(string, values = []) {
  const messageParts = [string];
  const serializedMessage = {messageParts, values};
  return JSON.stringify(serializedMessage);
}

/**
 * @param {string=} serializedMessage
 * @return {*}
 */
export function deserializeUIString(serializedMessage) {
  if (!serializedMessage) {
    return {};
  }

  return JSON.parse(serializedMessage);
}

/**
 * @param {string} string
 * @return {string}
 */
export function localize(string) {
  return string;
}

/**
 * @unrestricted
 */
export class UIStringFormat {
  /**
   * @param {string} format
   */
  constructor(format) {
    /** @type {string} */
    this._localizedFormat = localize(format);
    /** @type {!Array.<!Object>} */
    this._tokenizedFormat = Platform.StringUtilities.tokenizeFormatString(
        this._localizedFormat, Platform.StringUtilities.standardFormatters);
  }

  /**
   * @param {string} a
   * @param {string} b
   * @return {string}
   */
  static _append(a, b) {
    return a + b;
  }

  /**
   * @param {...*} vararg
   * @return {string}
   */
  format(vararg) {
    return Platform.StringUtilities
        .format(
          // the code here uses odd generics that Closure likes but TS doesn't
          // so rather than fight to typecheck this in a dodgy way we just let TS ignore it
          // @ts-ignore
            this._localizedFormat, arguments, Platform.StringUtilities.standardFormatters, '', UIStringFormat._append,
            this._tokenizedFormat)
        .formattedResult;
  }
}

const _substitutionStrings = new WeakMap();

/**
 * @param {!ITemplateArray|string} strings
 * @param {...*} vararg
 * @return {string}
 */
export function ls(strings, ...vararg) {
  if (typeof strings === 'string') {
    return strings;
  }
  let substitutionString = _substitutionStrings.get(strings);
  if (!substitutionString) {
    substitutionString = strings.join('%s');
    _substitutionStrings.set(strings, substitutionString);
  }
  // @ts-ignore TS gets confused with the arguments slicing
  return UIString(substitutionString, ...vararg);
}
