// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import type * as Common from '../../core/common/common.js'; // eslint-disable-line no-unused-vars

import type {ContentProvider, DeferredContent, SearchMatch} from './ContentProvider.js'; // eslint-disable-line no-unused-vars
import {performSearchInContent} from './TextUtils.js';

export class StaticContentProvider implements ContentProvider {
  _contentURL: string;
  _contentType: Common.ResourceType.ResourceType;
  _lazyContent: () => Promise<DeferredContent>;

  constructor(
      contentURL: string, contentType: Common.ResourceType.ResourceType, lazyContent: () => Promise<DeferredContent>) {
    this._contentURL = contentURL;
    this._contentType = contentType;
    this._lazyContent = lazyContent;
  }

  static fromString(contentURL: string, contentType: Common.ResourceType.ResourceType, content: string):
      StaticContentProvider {
    const lazyContent = (): Promise<{
      content: string,
      isEncoded: boolean,
    }> => Promise.resolve({content, isEncoded: false});
    return new StaticContentProvider(contentURL, contentType, lazyContent);
  }

  contentURL(): string {
    return this._contentURL;
  }

  contentType(): Common.ResourceType.ResourceType {
    return this._contentType;
  }

  contentEncoded(): Promise<boolean> {
    return Promise.resolve(false);
  }

  requestContent(): Promise<DeferredContent> {
    return this._lazyContent();
  }

  async searchInContent(query: string, caseSensitive: boolean, isRegex: boolean): Promise<SearchMatch[]> {
    const {content} = (await this._lazyContent() as {
      content: string,
      isEncoded: boolean,
    });
    return content ? performSearchInContent(content, query, caseSensitive, isRegex) : [];
  }
}
