// Copyright 2012 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../core/common/common.js';
import type * as Platform from '../../core/platform/platform.js';

import type {ContentDataOrError} from './ContentData.js';
import type {StreamingContentDataOrError} from './StreamingContentData.js';
import type {WasmDisassembly} from './WasmDisassembly.js';

export interface ContentProvider {
  contentURL(): Platform.DevToolsPath.UrlString;
  contentType(): Common.ResourceType.ResourceType;
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
    limitSize = true): string|null {
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

/**
 * Some ContentProvider like NetworkRequests might never actually be able to return
 * a fully completed "requestContentData" as the request keeps on going indefinitely.
 * Such proivders can implement the "StreamingContentProvider" addition, which allows
 * for partial/streaming content.
 **/
export interface StreamingContentProvider extends ContentProvider {
  requestStreamingContent(): Promise<StreamingContentDataOrError>;
}

export const isStreamingContentProvider = function(provider: ContentProvider): provider is StreamingContentProvider {
  return 'requestStreamingContent' in provider;
};
