// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {Context} from './Context.js';  // eslint-disable-line no-unused-vars

/**
 * @interface
 */
export class ActionDelegate {
  /**
   * @param {!Context} context
   * @param {string} actionId
   * @return {boolean}
   */
  handleAction(context, actionId) {
  }
}
