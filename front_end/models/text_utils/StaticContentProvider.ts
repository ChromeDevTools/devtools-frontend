// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../core/common/common.js';
import type * as Platform from '../../core/platform/platform.js';

import {ContentData, type ContentDataOrError} from './ContentData.js';
import {
  type ContentProvider,
  type DeferredContent,
  type SearchMatch,
} from './ContentProvider.js';
import {performSearchInContentData} from './TextUtils.js';

export class StaticContentProvider implements ContentProvider {
  readonly #contentURL: Platform.DevToolsPath.UrlString;
  readonly #contentType: Common.ResourceType.ResourceType;
  readonly #lazyContent: () => Promise<ContentDataOrError>;

  constructor(
      contentURL: Platform.DevToolsPath.UrlString, contentType: Common.ResourceType.ResourceType,
      lazyContent: () => Promise<ContentDataOrError>) {
    this.#contentURL = contentURL;
    this.#contentType = contentType;
    this.#lazyContent = lazyContent;
  }

  static fromString(
      contentURL: Platform.DevToolsPath.UrlString, contentType: Common.ResourceType.ResourceType,
      content: string): StaticContentProvider {
    const lazyContent = (): Promise<ContentData> =>
        Promise.resolve(new ContentData(content, /* isBase64 */ false, contentType.canonicalMimeType()));
    return new StaticContentProvider(contentURL, contentType, lazyContent);
  }

  contentURL(): Platform.DevToolsPath.UrlString {
    return this.#contentURL;
  }

  contentType(): Common.ResourceType.ResourceType {
    return this.#contentType;
  }

  requestContent(): Promise<DeferredContent> {
    return this.#lazyContent().then(ContentData.asDeferredContent.bind(undefined));
  }

  requestContentData(): Promise<ContentDataOrError> {
    return this.#lazyContent();
  }

  async searchInContent(query: string, caseSensitive: boolean, isRegex: boolean): Promise<SearchMatch[]> {
    const contentData = await this.requestContentData();
    return performSearchInContentData(contentData, query, caseSensitive, isRegex);
  }
}
