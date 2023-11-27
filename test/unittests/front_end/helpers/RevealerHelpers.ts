// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../../front_end/core/common/common.js';

let originalReveal: ((revealable: unknown, omitFocus?: boolean) => Promise<void>)|null = null;

export class TestRevealer {
  static install(reveal: (revealable: unknown, omitFocus?: boolean) => Promise<void>) {
    if (originalReveal !== null) {
      throw new Error('Test revealer already installed');
    }
    originalReveal = Common.Revealer.reveal;
    Common.Revealer.setRevealForTest(reveal);
  }

  static reset() {
    if (originalReveal === null) {
      throw new Error('No test revealer installed');
    }
    Common.Revealer.setRevealForTest(originalReveal);
    originalReveal = null;
  }
}
