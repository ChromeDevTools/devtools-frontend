// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../../front_end/core/common/common.js';

export class TestRevealer extends Common.Revealer.Revealer {
  #callback: (object: Object, omitFocus?: boolean|undefined) => Promise<void>;
  private constructor(callback: (object: Object, omitFocus?: boolean|undefined) => Promise<void>) {
    super();
    this.#callback = callback;
  }

  static install(callback: (object: Object, omitFocus?: boolean|undefined) => Promise<void>) {
    const revealer = new TestRevealer(callback);
    Common.Revealer.setRevealForTest((object, omitFocus) => {
      if (!object) {
        return Promise.resolve(undefined);
      }
      return revealer.reveal(object, omitFocus).then(() => undefined);
    });
  }

  reveal(object: Object, omitFocus?: boolean|undefined): Promise<void> {
    return this.#callback(object, omitFocus);
  }
}
