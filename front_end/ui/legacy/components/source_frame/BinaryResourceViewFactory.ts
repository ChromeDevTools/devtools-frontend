// Copyright 2019 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../../../core/common/common.js';
import type * as Platform from '../../../../core/platform/platform.js';
import * as TextUtils from '../../../../core/text_utils/text_utils.js';

import {ResourceSourceFrame} from './ResourceSourceFrame.js';
import {StreamingContentHexView} from './StreamingContentHexView.js';

export class BinaryResourceViewFactory {
  private streamingContent: TextUtils.StreamingContentData.StreamingContentData;
  private readonly contentUrl: Platform.DevToolsPath.UrlString;
  private readonly resourceType: Common.ResourceType.ResourceType;

  constructor(
      content: TextUtils.StreamingContentData.StreamingContentData, contentUrl: Platform.DevToolsPath.UrlString,
      resourceType: Common.ResourceType.ResourceType) {
    this.streamingContent = content;
    this.contentUrl = contentUrl;
    this.resourceType = resourceType;
  }

  hex(): string {
    const binaryString = window.atob(this.base64());
    const array = Uint8Array.from(binaryString, m => m.codePointAt(0) as number);
    return BinaryResourceViewFactory.#uint8ArrayToHexString(array);
  }

  base64(): string {
    return this.streamingContent.content().base64;
  }

  utf8(): string {
    return new TextUtils.ContentData.ContentData(this.base64(), /* isBase64 */ true, 'text/plain', 'utf-8').text;
  }

  createBase64View(element?: HTMLElement): ResourceSourceFrame {
    return new StreamingResourceSourceFrame(this.streamingContent, () => this.base64(), this.contentUrl,
                                            this.resourceType, {lineNumbers: false, lineWrapping: true}, element);
  }

  createHexView(element?: HTMLElement): StreamingContentHexView {
    return new StreamingContentHexView(this.streamingContent, element);
  }

  createUtf8View(element?: HTMLElement): ResourceSourceFrame {
    return new StreamingResourceSourceFrame(this.streamingContent, () => this.utf8(), this.contentUrl,
                                            this.resourceType, {lineNumbers: true, lineWrapping: true}, element);
  }

  static #uint8ArrayToHexString(uint8Array: Uint8Array): string {
    let output = '';
    for (let i = 0; i < uint8Array.length; i++) {
      output += BinaryResourceViewFactory.#numberToHex(uint8Array[i], 2);
    }
    return output;
  }

  static #numberToHex(number: number, padding: number): string {
    let hex = number.toString(16);
    while (hex.length < padding) {
      hex = '0' + hex;
    }
    return hex;
  }
}

class StreamingResourceSourceFrame extends ResourceSourceFrame {
  readonly #streamingContent: TextUtils.StreamingContentData.StreamingContentData;
  readonly #getContent: () => string;

  constructor(streamingContent: TextUtils.StreamingContentData.StreamingContentData, getContent: () => string,
              contentUrl: Platform.DevToolsPath.UrlString, resourceType: Common.ResourceType.ResourceType,
              options: {lineNumbers: boolean, lineWrapping: boolean}, element?: HTMLElement) {
    super(TextUtils.StaticContentProvider.StaticContentProvider.fromString(contentUrl, resourceType, getContent()),
          resourceType.canonicalMimeType(), options, element);
    this.#streamingContent = streamingContent;
    this.#getContent = getContent;
  }

  override wasShown(): void {
    super.wasShown();
    this.#streamingContent.addEventListener(TextUtils.StreamingContentData.Events.CHUNK_ADDED, this.#onChunkAdded,
                                            this);
  }

  override willHide(): void {
    super.willHide();
    this.#streamingContent.removeEventListener(TextUtils.StreamingContentData.Events.CHUNK_ADDED, this.#onChunkAdded,
                                               this);
  }

  #onChunkAdded(): void {
    void this.setContent(this.#getContent());
  }
}
