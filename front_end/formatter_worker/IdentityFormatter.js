// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {FormattedContentBuilder} from './FormattedContentBuilder.js';  // eslint-disable-line no-unused-vars

/**
 * @unrestricted
 */
export class IdentityFormatter {
  /**
   * @param {!FormattedContentBuilder} builder
   */
  constructor(builder) {
    this._builder = builder;
  }

  /**
   * @param {string} text
   * @param {!Array<number>} lineEndings
   * @param {number} fromOffset
   * @param {number} toOffset
   */
  format(text, lineEndings, fromOffset, toOffset) {
    const content = text.substring(fromOffset, toOffset);
    this._builder.addToken(content, fromOffset);
  }
}
