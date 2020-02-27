// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @interface
 */
export class Runnable {
  /**
   * @return {!Promise.<void>}
   */
  run() {
    throw new Error('not implemented');
  }
}
