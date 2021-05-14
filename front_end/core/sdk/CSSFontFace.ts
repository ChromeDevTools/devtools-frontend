// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import type * as Protocol from '../../generated/protocol.js';

export class CSSFontFace {
  _fontFamily: string;
  _fontVariationAxes: Protocol.CSS.FontVariationAxis[];
  _fontVariationAxesByTag: Map<string, Protocol.CSS.FontVariationAxis>;
  constructor(payload: Protocol.CSS.FontFace) {
    this._fontFamily = payload.fontFamily;
    this._fontVariationAxes = payload.fontVariationAxes || [];
    this._fontVariationAxesByTag = new Map();
    for (const axis of this._fontVariationAxes) {
      this._fontVariationAxesByTag.set(axis.tag, axis);
    }
  }

  getFontFamily(): string {
    return this._fontFamily;
  }

  getVariationAxisByTag(tag: string): Protocol.CSS.FontVariationAxis|undefined {
    return this._fontVariationAxesByTag.get(tag);
  }
}
