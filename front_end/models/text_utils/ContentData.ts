// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../core/platform/platform.js';

import { contentAsDataURL, type DeferredContent } from './ContentProvider.js';
import {Text} from './Text.js';

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
  readonly charset: string;

  #contentAsBase64?: string;
  #contentAsText?: string;

  #contentAsTextObj?: Text;

  constructor(data: string, isBase64: boolean, mimeType: string, charset?: string) {
    this.charset = charset || 'utf-8';
    if (isBase64) {
      this.#contentAsBase64 = data;
    } else {
      this.#contentAsText = data;
    }

    this.mimeType = mimeType;
    if (!this.mimeType) {
      // Tests or broken requests might pass an empty/undefined mime type. Fallback to
      // "default" mime types.
      this.mimeType = isBase64 ? 'application/octet-stream' : 'text/plain';
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
   * @throws if `mimeType` is not a text type.
   */
  get text(): string {
    if (this.#contentAsText !== undefined) {
      return this.#contentAsText;
    }

    if (!this.isTextContent) {
      throw new Error('Cannot interpret binary data as text');
    }

    const binaryString = window.atob(this.#contentAsBase64 as string);
    const bytes = Uint8Array.from(binaryString, m => m.codePointAt(0) as number);
    this.#contentAsText = new TextDecoder(this.charset).decode(bytes);
    return this.#contentAsText;
  }

  /** @returns true, if this `ContentData` was constructed from text content or the mime type indicates text that can be decoded */
  get isTextContent(): boolean {
    return this.#createdFromText || Platform.MimeType.isTextType(this.mimeType);
  }

  get isEmpty(): boolean {
    // Don't trigger unnecessary decoding. Only check if both of the strings are empty.
    return !Boolean(this.#contentAsBase64) && !Boolean(this.#contentAsText);
  }

  get createdFromBase64(): boolean {
    return this.#contentAsBase64 !== undefined;
  }

  get #createdFromText(): boolean {
    return this.#contentAsBase64 === undefined;
  }

  /**
   * Returns the text content as a `Text` object. The returned object is always the same to
   * minimize the number of times we have to calculate the line endings array.
   *
   * @throws if `mimeType` is not a text type.
   */
  get textObj(): Text {
    if (this.#contentAsTextObj === undefined) {
      this.#contentAsTextObj = new Text(this.text);
    }
    return this.#contentAsTextObj;
  }

  /**
   * @returns True, iff the contents (base64 or text) are equal.
   * Does not compare mime type and charset, but will decode base64 data if both
   * mime types indicate that it's text content.
   */
  contentEqualTo(other: ContentData): boolean {
    if (this.#contentAsBase64 !== undefined && other.#contentAsBase64 !== undefined) {
      return this.#contentAsBase64 === other.#contentAsBase64;
    }
    if (this.#contentAsText !== undefined && other.#contentAsText !== undefined) {
      return this.#contentAsText === other.#contentAsText;
    }
    if (this.isTextContent && other.isTextContent) {
      return this.text === other.text;
    }
    return false;
  }

  asDataUrl(): string|null {
    // To keep with existing behavior we prefer to return the content
    // encoded if that is how this ContentData was constructed with.
    if (this.#contentAsBase64 !== undefined) {
      const charset = this.isTextContent ? this.charset : null;
      return contentAsDataURL(this.#contentAsBase64, this.mimeType ?? '', true, charset);
    }
    return contentAsDataURL(this.text, this.mimeType ?? '', false, 'utf-8');
  }

  /**
   * @deprecated Used during migration from `DeferredContent` to `ContentData`.
   */
  asDeferedContent(): DeferredContent {
    // To prevent encoding mistakes, we'll return text content already decoded.
    if (this.isTextContent) {
      return {content: this.text, isEncoded: false};
    }
    if (this.#contentAsText !== undefined) {
      // Unknown text mime type, this should not really happen.
      return {content: this.#contentAsText, isEncoded: false};
    }
    if (this.#contentAsBase64 !== undefined) {
      return {content: this.#contentAsBase64, isEncoded: true};
    }
    throw new Error('Unreachable');
  }

  static isError(contentDataOrError: ContentDataOrError): contentDataOrError is {error: string} {
    return 'error' in contentDataOrError;
  }

  /** @returns `value` if the passed `ContentDataOrError` is an error, or the text content otherwise */
  static textOr<T>(contentDataOrError: ContentDataOrError, value: T): string|T {
    if (ContentData.isError(contentDataOrError)) {
      return value;
    }
    return contentDataOrError.text;
  }

  /** @returns an empty 'text/plain' content data if the passed `ContentDataOrError` is an error, or the content data itself otherwise */
  static contentDataOrEmpty(contentDataOrError: ContentDataOrError): ContentData {
    if (ContentData.isError(contentDataOrError)) {
      return EMPTY_TEXT_CONTENT_DATA;
    }
    return contentDataOrError;
  }

  /**
   * @deprecated Used during migration from `DeferredContent` to `ContentData`.
   */
  static asDeferredContent(contentDataOrError: ContentDataOrError): DeferredContent {
    if (ContentData.isError(contentDataOrError)) {
      return {error: contentDataOrError.error, content: null, isEncoded: false};
    }
    return contentDataOrError.asDeferedContent();
  }
}

export const EMPTY_TEXT_CONTENT_DATA = new ContentData('', /* isBase64 */ false, 'text/plain');

export type ContentDataOrError = ContentData|{error: string};
