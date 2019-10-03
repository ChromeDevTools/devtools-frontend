// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @interface
 */
export default class ContextFlavorListener {
  /**
   * @param {?Object} object
   */
  flavorChanged(object) {
  }
}

/* Legacy exported object*/
self.UI = self.UI || {};

/* Legacy exported object*/
UI = UI || {};

/** @interface */
UI.ContextFlavorListener = ContextFlavorListener;