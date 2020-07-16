// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export class CSSFontFace {
  /**
   * @param {!Protocol.CSS.FontFace} payload
   */
  constructor(payload) {
    this._fontFamily = payload.fontFamily;
    this._fontVariationAxes = payload.fontVariationAxes || [];
    /** @type {!Map<string, !Protocol.CSS.FontVariationAxis>} */
    this._fontVariationAxesByTag = new Map();
    for (const axis of this._fontVariationAxes) {
      this._fontVariationAxesByTag.set(axis.tag, axis);
    }
  }

  getFontFamily() {
    return this._fontFamily;
  }

  /**
   * @param {string} tag
   */
  getVariationAxisByTag(tag) {
    return this._fontVariationAxesByTag.get(tag);
  }
}
