// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Protocol from '../../generated/protocol.js';
import type * as Platform from '../platform/platform.js';

export class CSSFontFace {
  readonly #fontFamily: string;
  readonly #fontVariationAxes: Protocol.CSS.FontVariationAxis[];
  readonly #fontVariationAxesByTag: Map<string, Protocol.CSS.FontVariationAxis>;
  readonly #src: Platform.DevToolsPath.UrlString;
  readonly #fontDisplay: string;

  constructor(payload: Protocol.CSS.FontFace) {
    this.#fontFamily = payload.fontFamily;
    this.#fontVariationAxes = payload.fontVariationAxes || [];
    this.#fontVariationAxesByTag = new Map();
    this.#src = payload.src as Platform.DevToolsPath.UrlString;
    this.#fontDisplay = payload.fontDisplay;
    for (const axis of this.#fontVariationAxes) {
      this.#fontVariationAxesByTag.set(axis.tag, axis);
    }
  }

  getFontFamily(): string {
    return this.#fontFamily;
  }

  getSrc(): Platform.DevToolsPath.UrlString {
    return this.#src;
  }

  getFontDisplay(): string {
    return this.#fontDisplay;
  }

  getVariationAxisByTag(tag: string): Protocol.CSS.FontVariationAxis|undefined {
    return this.#fontVariationAxesByTag.get(tag);
  }
}
