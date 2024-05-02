/*
 * Copyright (C) 2011 Google Inc. All rights reserved.
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

import * as TextUtils from '../../models/text_utils/text_utils.js';
import type * as Common from '../common/common.js';
import * as i18n from '../i18n/i18n.js';
import type * as Platform from '../platform/platform.js';

import {PageResourceLoader, type PageResourceLoadInitiator} from './PageResourceLoader.js';

const UIStrings = {
  /**
   *@description Error message when failing to fetch a resource referenced in a source map
   *@example {https://example.com/sourcemap.map} PH1
   *@example {An error occurred} PH2
   */
  couldNotLoadContentForSS: 'Could not load content for {PH1} ({PH2})',
};

const str_ = i18n.i18n.registerUIStrings('core/sdk/CompilerSourceMappingContentProvider.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class CompilerSourceMappingContentProvider implements TextUtils.ContentProvider.SafeContentProvider {
  readonly #sourceURL: Platform.DevToolsPath.UrlString;
  readonly #contentTypeInternal: Common.ResourceType.ResourceType;
  readonly #initiator: PageResourceLoadInitiator;

  constructor(
      sourceURL: Platform.DevToolsPath.UrlString, contentType: Common.ResourceType.ResourceType,
      initiator: PageResourceLoadInitiator) {
    this.#sourceURL = sourceURL;
    this.#contentTypeInternal = contentType;
    this.#initiator = initiator;
  }

  contentURL(): Platform.DevToolsPath.UrlString {
    return this.#sourceURL;
  }

  contentType(): Common.ResourceType.ResourceType {
    return this.#contentTypeInternal;
  }

  async requestContent(): Promise<TextUtils.ContentProvider.DeferredContent> {
    const contentData = await this.requestContentData();
    return TextUtils.ContentData.ContentData.asDeferredContent(contentData);
  }

  async requestContentData(): Promise<TextUtils.ContentData.ContentDataOrError> {
    try {
      const {content} = await PageResourceLoader.instance().loadResource(this.#sourceURL, this.#initiator);
      return new TextUtils.ContentData.ContentData(
          content, /* isBase64=*/ false, this.#contentTypeInternal.canonicalMimeType());
    } catch (e) {
      const error = i18nString(UIStrings.couldNotLoadContentForSS, {PH1: this.#sourceURL, PH2: e.message});
      console.error(error);
      return {error};
    }
  }

  async searchInContent(query: string, caseSensitive: boolean, isRegex: boolean):
      Promise<TextUtils.ContentProvider.SearchMatch[]> {
    const contentData = await this.requestContentData();
    return TextUtils.TextUtils.performSearchInContentData(contentData, query, caseSensitive, isRegex);
  }
}
