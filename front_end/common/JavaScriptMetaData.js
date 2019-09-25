// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @interface
 */
export default class JavaScriptMetadata {
  /**
   * @param {string} name
   * @return {?Array<!Array<string>>}
   */
  signaturesForNativeFunction(name) {
  }

  /**
   * @param {string} name
   * @param {string} receiverClassName
   * @return {?Array<!Array<string>>}
   */
  signaturesForInstanceMethod(name, receiverClassName) {
  }

  /**
   * @param {string} name
   * @param {string} receiverConstructorName
   * @return {?Array<!Array<string>>}
   */
  signaturesForStaticMethod(name, receiverConstructorName) {
  }
}

/* Legacy exported object */
self.Common = self.Common || {};
Common = Common || {};

/**
 * @interface
 */
Common.JavaScriptMetadata = JavaScriptMetadata;
