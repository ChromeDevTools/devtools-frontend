// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as TextUtils from '../../models/text_utils/text_utils.js';

import {isTextType} from './MimeType.js';
import {type ContentData as LegacyContentData} from './NetworkRequest.js';

/**
 * This class is a small wrapper around either raw binary or text data.
 * As the binary data can actually contain textual data, we also store the
 * MIME type and if applicable, the charset.
 *
 * This information should be generally kept together, as interpreting text
 * from raw bytes requires an encoding.
 *
 * Note that we only rarely have to decode text ourselves in the frontend,
 * this is mostly handled by the backend. There are cases though (e.g. SVG,
 * or streaming response content) where we receive text data in
 * binary (base64-encoded) form.
 *
 * The class only implements decoding. We currently don't have a use-case
 * to re-encode text into base64 bytes using a specified charset.
 */
export class ContentData {
  readonly mimeType: string;
  readonly #charset?: string;

  #contentAsBase64?: string;
  #contentAsText?: string;

  constructor(data: string, isBase64: boolean, mimeType: string, charset?: string) {
    this.mimeType = mimeType;
    this.#charset = charset;
    if (isBase64) {
      this.#contentAsBase64 = data;
    } else {
      this.#contentAsText = data;
    }
  }

  /**
   * Returns the data as base64.
   *
   * @throws if this `ContentData` was constructed from text content.
   */
  get base64(): string {
    if (this.#contentAsBase64 === undefined) {
      throw new Error('Encoding text content as base64 is not supported');
    }
    return this.#contentAsBase64;
  }

  /**
   * Returns the content as text. If this `ContentData` was constructed with base64
   * encoded bytes, it will use the provided charset to attempt to decode the bytes.
   *
   * @throws if `resourceType` is not a text type.
   */
  get text(): string {
    if (this.#contentAsText !== undefined) {
      return this.#contentAsText;
    }

    if (!this.isTextContent) {
      throw new Error('Cannot interpret binary data as text');
    }

    const charset = this.#charset ?? 'utf-8';
    const binaryString = window.atob(this.#contentAsBase64 as string);
    const bytes = Uint8Array.from(binaryString, m => m.codePointAt(0) as number);
    this.#contentAsText = new TextDecoder(charset).decode(bytes);
    return this.#contentAsText;
  }

  get isTextContent(): boolean {
    return isTextType(this.mimeType);
  }

  get isEmpty(): boolean {
    // Don't trigger unnecessary decoding. Only check if both of the strings are empty.
    return !Boolean(this.#contentAsBase64) && !Boolean(this.#contentAsText);
  }

  asDataUrl(): string|null {
    // To keep with existing behavior we prefer to return the content
    // encoded if that is how this ContentData was constructed with.
    if (this.#contentAsBase64 !== undefined) {
      return TextUtils.ContentProvider.contentAsDataURL(
          this.#contentAsBase64, this.mimeType ?? '', true, this.#charset ?? null);
    }
    return TextUtils.ContentProvider.contentAsDataURL(this.text, this.mimeType ?? '', false);
  }

  /**
   * @deprecated Used during migration from `DeferredContent` to `ContentData`.
   */
  asDeferedContent(): TextUtils.ContentProvider.DeferredContent {
    // To keep with existing behavior we prefer to return the content
    // encoded if that is how this ContentData was constructed with.
    if (this.#contentAsBase64 !== undefined) {
      return {content: this.#contentAsBase64, isEncoded: true};
    }
    return {content: this.text, isEncoded: false};
  }

  /**
   * @deprecated Used during migration from `NetworkRequest.ContentData` to `ContentData`.
   */
  asLegacyContentData(): LegacyContentData {
    // To keep with existing behavior we prefer to return the content
    // encoded if that is how this ContentData was constructed with.
    if (this.#contentAsBase64 !== undefined) {
      return {error: null, content: this.#contentAsBase64, encoded: true};
    }
    return {error: null, content: this.text, encoded: false};
  }

  static isError(contentDataOrError: ContentDataOrError): contentDataOrError is {error: string} {
    return 'error' in contentDataOrError;
  }

  /**
   * @deprecated Used during migration from `DeferredContent` to `ContentData`.
   */
  static asDeferredContent(contentDataOrError: ContentDataOrError): TextUtils.ContentProvider.DeferredContent {
    if (ContentData.isError(contentDataOrError)) {
      return {error: contentDataOrError.error, content: null, isEncoded: false};
    }
    return contentDataOrError.asDeferedContent();
  }

  /**
   * @deprecated Used during migration from `DeferredContent` to `ContentData`.
   */
  static asLegacyContentData(contentDataOrError: ContentDataOrError): LegacyContentData {
    if (ContentData.isError(contentDataOrError)) {
      return {error: contentDataOrError.error, content: null, encoded: false};
    }
    return contentDataOrError.asLegacyContentData();
  }
}

export type ContentDataOrError = ContentData|{error: string};
