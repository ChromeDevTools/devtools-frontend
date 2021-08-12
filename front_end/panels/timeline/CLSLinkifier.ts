// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';

interface Color {
  r: number;
  g: number;
  b: number;
  a: number;
}

export class CLSRect {
  x: number;
  y: number;
  width: number;
  height: number;
  color: Color;
  outlineColor: Color;
  constructor([x, y, width, height]: [number, number, number, number]) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.color = {r: 238, g: 111, b: 99, a: 0.4};
    this.outlineColor = {r: 238, g: 111, b: 99, a: 0.7};
  }
}

let linkifierInstance: Linkifier;

export class Linkifier implements Common.Linkifier.Linkifier {
  static instance(opts: {
    forceNew: boolean|null,
  } = {forceNew: null}): Linkifier {
    const {forceNew} = opts;
    if (!linkifierInstance || forceNew) {
      linkifierInstance = new Linkifier();
    }

    return linkifierInstance;
  }

  linkify(object: Object, _options?: Common.Linkifier.Options): Node {
    const link = document.createElement('span');
    const rect = (object as CLSRect);
    const {x, y, width, height} = rect;
    link.textContent = `Location: [${x},${y}], Size: [${width}x${height}]`;

    link.addEventListener('mouseover', () => SDK.OverlayModel.OverlayModel.highlightRect(rect));
    link.addEventListener('mouseleave', () => SDK.OverlayModel.OverlayModel.clearHighlight());

    return link;
  }
}
