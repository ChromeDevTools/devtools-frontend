// Copyright 2011 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as TextUtils from '../../models/text_utils/text_utils.js';
import type * as Common from '../common/common.js';
import * as i18n from '../i18n/i18n.js';
import type * as Platform from '../platform/platform.js';

import {PageResourceLoader, type PageResourceLoadInitiator} from './PageResourceLoader.js';

const UIStrings = {
  /**
   * @description Error message when failing to fetch a resource referenced in a source map
   * @example {https://example.com/sourcemap.map} PH1
   * @example {An error occurred} PH2
   */
  couldNotLoadContentForSS: 'Could not load content for {PH1} ({PH2})',
} as const;

const str_ = i18n.i18n.registerUIStrings('core/sdk/CompilerSourceMappingContentProvider.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class CompilerSourceMappingContentProvider implements TextUtils.ContentProvider.ContentProvider {
  readonly #sourceURL: Platform.DevToolsPath.UrlString;
  readonly #contentType: Common.ResourceType.ResourceType;
  readonly #initiator: PageResourceLoadInitiator;

  constructor(
      sourceURL: Platform.DevToolsPath.UrlString, contentType: Common.ResourceType.ResourceType,
      initiator: PageResourceLoadInitiator) {
    this.#sourceURL = sourceURL;
    this.#contentType = contentType;
    this.#initiator = initiator;
  }

  contentURL(): Platform.DevToolsPath.UrlString {
    return this.#sourceURL;
  }

  contentType(): Common.ResourceType.ResourceType {
    return this.#contentType;
  }

  async requestContentData(): Promise<TextUtils.ContentData.ContentDataOrError> {
    try {
      const {content} = await PageResourceLoader.instance().loadResource(this.#sourceURL, this.#initiator);
      return new TextUtils.ContentData.ContentData(
          content, /* isBase64=*/ false, this.#contentType.canonicalMimeType());
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
