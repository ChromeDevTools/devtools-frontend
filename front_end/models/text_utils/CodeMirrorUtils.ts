/*
 * Copyright (C) 2022 Google Inc. All rights reserved.
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

import * as CodeMirror from '../../third_party/codemirror.next/codemirror.next.js';

type Tokenizer = (line: string, callback: (value: string, style: string|null) => void) => Promise<void>;

export function createCssTokenizer(): Tokenizer {
  async function tokenize(line: string, callback: (value: string, style: string|null) => void): Promise<void> {
    const streamParser = await CodeMirror.cssStreamParser();
    const stream = new CodeMirror.StringStream(line, 4, 2);

    const state = streamParser.startState(2);
    let lastPos = stream.pos;
    while (!stream.eol()) {
      stream.start = lastPos;
      let tokenType = streamParser.token(stream, state);
      /**
       * We expect unknown properties (like `unknownProp: unknownPropVal`) to still be
       * formatted correctly. However, `tokenType` for such properties are marked
       * as `error` from CodeMirror side and the internal state of the parser becomes `maybeprop`.
       *
       * So, we handle that specific keyword to be marked as `property` even though it is
       * not a known property. We do this because for our formatting purposes it doesn't matter
       * whether a property is a known CSS property or not.
       */
      if (tokenType === 'error' && state.state === 'maybeprop') {
        tokenType = 'property';
      }
      const segment = stream.current();
      callback(segment, tokenType);
      lastPos = stream.pos;
    }
  }
  return tokenize;
}
