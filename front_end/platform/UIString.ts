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

import * as StringUtilities from './string-utilities.js';

class LocalizedStringTag {
  private localizationTag: (string|undefined);
}
export type LocalizedString = string&LocalizedStringTag;

export const LocalizedEmptyString = '' as LocalizedString;

export function UIString(string: string, ..._vararg: unknown[]): LocalizedString {
  return StringUtilities.vsprintf(localize(string), Array.prototype.slice.call(arguments, 1)) as LocalizedString;
}

export function localize(string: string): string {
  return string;
}

export class UIStringFormat {
  private localizedFormat: string;
  private tokenizedFormat: StringUtilities.FormatterToken[];

  constructor(format: string) {
    this.localizedFormat = localize(format);
    this.tokenizedFormat =
        StringUtilities.tokenizeFormatString(this.localizedFormat, StringUtilities.standardFormatters);
  }

  format(..._vararg: unknown[]): string {
    return StringUtilities
        .format(
            this.localizedFormat, arguments, StringUtilities.standardFormatters, '', (a, b) => a + b,
            this.tokenizedFormat)
        .formattedResult;
  }
}

const _substitutionStrings = new WeakMap();

export function ls(strings: TemplateStringsArray|string, ...vararg: unknown[]): LocalizedString {
  if (typeof strings === 'string') {
    return strings as LocalizedString;
  }
  let substitutionString = _substitutionStrings.get(strings);
  if (!substitutionString) {
    substitutionString = strings.join('%s');
    _substitutionStrings.set(strings, substitutionString);
  }
  return UIString(substitutionString, ...vararg);
}
