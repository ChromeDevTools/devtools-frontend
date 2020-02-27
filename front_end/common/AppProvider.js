// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {App} from './App.js';  // eslint-disable-line no-unused-vars

/**
 * @interface
 */
export class AppProvider {
  /**
   * @return {!App}
   */
  createApp() {
    throw new Error('not implemented');
  }
}
