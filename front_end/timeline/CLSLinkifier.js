// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';  // eslint-disable-line no-unused-vars
import * as SDK from '../sdk/sdk.js';

export class CLSRect {
  /**
   *
   * @param {!Array<number>} data
   */
  constructor([x, y, width, height]) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.color = {r: 238, g: 111, b: 99, a: 0.4};
    this.outlineColor = {r: 238, g: 111, b: 99, a: 0.7};
  }
}

/**
 * @implements {Common.Linkifier.Linkifier}
 */
export class Linkifier {
  /**
   * @override
   * @param {!Object} object
   * @param {!Common.Linkifier.Options=} options
   * @return {!Node}
   */
  linkify(object, options) {
    const link = document.createElement('span');
    const rect = /** @type {!CLSRect} */ (object);
    const {x, y, width, height} = rect;
    link.textContent = `Location: [${x},${y}], Size: [${width}x${height}]`;

    link.addEventListener('mouseover', () => SDK.OverlayModel.OverlayModel.highlightRect(rect));
    link.addEventListener('mouseleave', () => SDK.OverlayModel.OverlayModel.clearHighlight());

    return link;
  }
}
