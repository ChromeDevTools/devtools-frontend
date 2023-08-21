// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../../front_end/core/common/common.js';

let originalReveal: null|((object: Object|null, omitFocus?: boolean|undefined) => Promise<void>) = null;

export class TestRevealer implements Common.Revealer.Revealer {
  #callback: (object: Object, omitFocus?: boolean|undefined) => Promise<void>;
  private constructor(callback: (object: Object, omitFocus?: boolean|undefined) => Promise<void>) {
    this.#callback = callback;
  }

  static install(callback: (object: Object, omitFocus?: boolean|undefined) => Promise<void>) {
    if (originalReveal) {
      throw new Error('Test revealer already installed');
    }
    originalReveal = Common.Revealer.reveal;
    const revealer = new TestRevealer(callback);
    Common.Revealer.setRevealForTest((object, omitFocus) => {
      if (!object) {
        return Promise.resolve(undefined);
      }
      return revealer.reveal(object, omitFocus).then(() => undefined);
    });
  }

  static reset() {
    if (!originalReveal) {
      throw new Error('No test revealer installed');
    }
    Common.Revealer.setRevealForTest(originalReveal);
    originalReveal = null;
  }

  reveal(object: Object, omitFocus?: boolean|undefined): Promise<void> {
    return this.#callback(object, omitFocus);
  }
}
