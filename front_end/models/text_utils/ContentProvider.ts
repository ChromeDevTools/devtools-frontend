/*
 * Copyright (C) 2012 Google Inc. All rights reserved.
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

import type * as Common from '../../core/common/common.js';
import type * as Platform from '../../core/platform/platform.js';

import {type ContentDataOrError} from './ContentData.js';
import {type StreamingContentDataOrError} from './StreamingContentData.js';
import {type WasmDisassembly} from './WasmDisassembly.js';

export interface ContentProvider {
  contentURL(): Platform.DevToolsPath.UrlString;
  contentType(): Common.ResourceType.ResourceType;
  /** @deprecated Prefer {@link requestContentData} instead */
  requestContent(): Promise<DeferredContent>;
  requestContentData(): Promise<ContentDataOrError>;
  searchInContent(query: string, caseSensitive: boolean, isRegex: boolean): Promise<SearchMatch[]>;
}

export class SearchMatch {
  constructor(
      readonly lineNumber: number, readonly lineContent: string, readonly columnNumber: number,
      readonly matchLength: number) {
  }

  static comparator(a: SearchMatch, b: SearchMatch): number {
    return a.lineNumber - b.lineNumber || a.columnNumber - b.columnNumber;
  }
}

export const contentAsDataURL = function(
    content: string|null, mimeType: string, contentEncoded: boolean, charset?: string|null,
    limitSize: boolean = true): string|null {
  const maxDataUrlSize = 1024 * 1024;
  if (content === undefined || content === null || (limitSize && content.length > maxDataUrlSize)) {
    return null;
  }

  content = contentEncoded ? content : encodeURIComponent(content);
  return 'data:' + mimeType + (charset ? ';charset=' + charset : '') + (contentEncoded ? ';base64' : '') + ',' +
      content;
};

export type DeferredContent = {
  content: string,
  isEncoded: boolean,
}|{
  content: '',
  isEncoded: false,
  wasmDisassemblyInfo: WasmDisassembly,
}|{
  content: null,
  error: string,
  isEncoded: boolean,
};

// Some ContentProvider like NetworkRequests might never actually be able to return
// a fully completed "requestContent" as the request keeps on going indefinitely.
// Such proivders can implement the "StreamingContentProvider" addition, which allows
// for partial/streaming content.
export interface StreamingContentProvider extends ContentProvider {
  requestStreamingContent(): Promise<StreamingContentDataOrError>;
}

export const isStreamingContentProvider = function(provider: ContentProvider): provider is StreamingContentProvider {
  return 'requestStreamingContent' in provider;
};
