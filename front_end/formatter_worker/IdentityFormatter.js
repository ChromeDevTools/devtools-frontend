// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @unrestricted
 */
export class IdentityFormatter {
  /**
   * @param {!FormatterWorker.FormattedContentBuilder} builder
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

/* Legacy exported object */
self.FormatterWorker = self.FormatterWorker || {};

/* Legacy exported object */
FormatterWorker = FormatterWorker || {};

/** @constructor */
FormatterWorker.IdentityFormatter = IdentityFormatter;
