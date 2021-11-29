/*
 * Copyright (C) 2013 Google Inc. All rights reserved.
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

/* eslint-disable @typescript-eslint/no-explicit-any */

import type * as CodeMirrorModule from '../../third_party/codemirror/codemirror-legacy.js'; // eslint-disable-line @typescript-eslint/no-unused-vars
import '../../third_party/codemirror/package/addon/runmode/runmode-standalone.js';
import '../../third_party/codemirror/package/mode/css/css.js';

import type * as TextUtils from './TextUtils.js';

let tokenizerFactoryInstance: TokenizerFactory;

export type Tokenizer =
    (line: string, callback: (value: string, style: string|null, start: number, end: number) => void) => void;

export class TokenizerFactory implements TextUtils.TokenizerFactory {
  static instance(opts: {forceNew: boolean|null} = {forceNew: null}): TokenizerFactory {
    const {forceNew} = opts;
    if (!tokenizerFactoryInstance || forceNew) {
      tokenizerFactoryInstance = new TokenizerFactory();
    }

    return tokenizerFactoryInstance;
  }

  // https://crbug.com/1151919 * = CodeMirror.Mode
  getMode(mimeType: string): any {
    return CodeMirror.getMode({indentUnit: 2}, mimeType);
  }

  // https://crbug.com/1151919 * = CodeMirror.Mode
  createTokenizer(mimeType: string): Tokenizer {
    const cmMode = CodeMirror.getMode({indentUnit: 2}, mimeType);
    const state = CodeMirror.startState(cmMode);

    function tokenize(
        line: string, callback: (value: string, style: string|null, start: number, end: number) => void): void {
      const stream = new CodeMirror.StringStream(line);
      while (!stream.eol()) {
        const style =
            (cmMode.token as (stream: CodeMirror.StringStream, state: unknown) => string | null)(stream, state);
        const value = stream.current();
        callback(value, style, stream.start, stream.start + value.length);
        stream.start = stream.pos;
      }
    }
    return tokenize;
  }
}
