// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/*
 * Copyright (C) 2007, 2008 Apple Inc.  All rights reserved.
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

import type * as Protocol from '../../generated/protocol.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
import * as Common from '../common/common.js';
import * as Platform from '../platform/platform.js';

import type {NetworkRequest} from './NetworkRequest.js';
import type {ResourceTreeFrame, ResourceTreeModel} from './ResourceTreeModel.js';

export class Resource implements TextUtils.ContentProvider.ContentProvider {
  readonly #resourceTreeModel: ResourceTreeModel;
  #request: NetworkRequest|null;
  #url!: Platform.DevToolsPath.UrlString;
  readonly #documentURL: Platform.DevToolsPath.UrlString;
  readonly #frameId: Protocol.Page.FrameId|null;
  readonly #loaderId: Protocol.Network.LoaderId|null;
  readonly #type: Common.ResourceType.ResourceType;
  #mimeType: string;
  #isGenerated: boolean;
  #lastModified: Date|null;
  readonly #contentSize: number|null;
  #parsedURL?: Common.ParsedURL.ParsedURL;
  #contentData: TextUtils.ContentData.ContentData|null = null;
  /**
   * There is always at most one CDP "getResourceContent" call in-flight. But once it's done
   * we'll hit the backend again in case we failed.
   */
  #pendingContentData: Promise<TextUtils.ContentData.ContentDataOrError>|null = null;

  constructor(
      resourceTreeModel: ResourceTreeModel, request: NetworkRequest|null, url: Platform.DevToolsPath.UrlString,
      documentURL: Platform.DevToolsPath.UrlString, frameId: Protocol.Page.FrameId|null,
      loaderId: Protocol.Network.LoaderId|null, type: Common.ResourceType.ResourceType, mimeType: string,
      lastModified: Date|null, contentSize: number|null) {
    this.#resourceTreeModel = resourceTreeModel;
    this.#request = request;
    this.url = url;

    this.#documentURL = documentURL;
    this.#frameId = frameId;
    this.#loaderId = loaderId;
    this.#type = type || Common.ResourceType.resourceTypes.Other;
    this.#mimeType = mimeType;
    this.#isGenerated = false;

    this.#lastModified = lastModified && Platform.DateUtilities.isValid(lastModified) ? lastModified : null;
    this.#contentSize = contentSize;
  }

  lastModified(): Date|null {
    if (this.#lastModified || !this.#request) {
      return this.#lastModified;
    }
    const lastModifiedHeader = this.#request.responseLastModified();
    const date = lastModifiedHeader ? new Date(lastModifiedHeader) : null;
    this.#lastModified = date && Platform.DateUtilities.isValid(date) ? date : null;
    return this.#lastModified;
  }

  contentSize(): number|null {
    if (typeof this.#contentSize === 'number' || !this.#request) {
      return this.#contentSize;
    }
    return this.#request.resourceSize;
  }

  get request(): NetworkRequest|null {
    return this.#request;
  }

  get url(): Platform.DevToolsPath.UrlString {
    return this.#url;
  }

  set url(x: Platform.DevToolsPath.UrlString) {
    this.#url = x;
    this.#parsedURL = new Common.ParsedURL.ParsedURL(x);
  }

  get parsedURL(): Common.ParsedURL.ParsedURL|undefined {
    return this.#parsedURL;
  }

  get documentURL(): Platform.DevToolsPath.UrlString {
    return this.#documentURL;
  }

  get frameId(): Protocol.Page.FrameId|null {
    return this.#frameId;
  }

  get loaderId(): Protocol.Network.LoaderId|null {
    return this.#loaderId;
  }

  get displayName(): string {
    return this.#parsedURL ? this.#parsedURL.displayName : '';
  }

  resourceType(): Common.ResourceType.ResourceType {
    return this.#request ? this.#request.resourceType() : this.#type;
  }

  get mimeType(): string {
    return this.#request ? this.#request.mimeType : this.#mimeType;
  }

  get content(): string|null {
    if (this.#contentData?.isTextContent) {
      return this.#contentData.text;
    }
    return this.#contentData?.base64 ?? null;
  }

  get isGenerated(): boolean {
    return this.#isGenerated;
  }

  set isGenerated(val: boolean) {
    this.#isGenerated = val;
  }

  contentURL(): Platform.DevToolsPath.UrlString {
    return this.#url;
  }

  contentType(): Common.ResourceType.ResourceType {
    if (this.resourceType() === Common.ResourceType.resourceTypes.Document &&
        this.mimeType.indexOf('javascript') !== -1) {
      return Common.ResourceType.resourceTypes.Script;
    }
    return this.resourceType();
  }

  async requestContentData(): Promise<TextUtils.ContentData.ContentDataOrError> {
    if (this.#contentData) {
      return this.#contentData;
    }
    if (this.#pendingContentData) {
      return await this.#pendingContentData;
    }
    this.#pendingContentData = this.innerRequestContent().then(contentData => {
      // If an error happended we don't set `this.#contentData` so future `requestContentData` will
      // attempt again to hit the backend for this Resource.
      if (!TextUtils.ContentData.ContentData.isError(contentData)) {
        this.#contentData = contentData;
      }
      this.#pendingContentData = null;
      return contentData;
    });
    return await this.#pendingContentData;
  }

  canonicalMimeType(): string {
    return this.contentType().canonicalMimeType() || this.mimeType;
  }

  async searchInContent(query: string, caseSensitive: boolean, isRegex: boolean):
      Promise<TextUtils.ContentProvider.SearchMatch[]> {
    if (!this.frameId) {
      return [];
    }
    if (this.request) {
      return await this.request.searchInContent(query, caseSensitive, isRegex);
    }
    const result = await this.#resourceTreeModel.target().pageAgent().invoke_searchInResource(
        {frameId: this.frameId, url: this.url, query, caseSensitive, isRegex});
    return TextUtils.TextUtils.performSearchInSearchMatches(result.result || [], query, caseSensitive, isRegex);
  }

  async populateImageSource(image: HTMLImageElement): Promise<void> {
    const contentData = await this.requestContentData();
    if (TextUtils.ContentData.ContentData.isError(contentData)) {
      return;
    }
    image.src = contentData.asDataUrl() ?? this.#url;
  }

  private async innerRequestContent(): Promise<TextUtils.ContentData.ContentDataOrError> {
    if (this.request) {
      // The `contentData` promise only resolves once the request is done.
      return await this.request.requestContentData();
    }

    const response = await this.#resourceTreeModel.target().pageAgent().invoke_getResourceContent(
        {frameId: this.frameId as Protocol.Page.FrameId, url: this.url});
    const error = response.getError();
    if (error) {
      return {error};
    }
    return new TextUtils.ContentData.ContentData(response.content, response.base64Encoded, this.mimeType);
  }

  frame(): ResourceTreeFrame|null {
    return this.#frameId ? this.#resourceTreeModel.frameForId(this.#frameId) : null;
  }

  statusCode(): number {
    return this.#request ? this.#request.statusCode : 0;
  }
}
