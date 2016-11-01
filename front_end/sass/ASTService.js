// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @unrestricted
 */
WebInspector.ASTService = class {
  /**
   * @param {string} url
   * @param {string} text
   * @return {!Promise<!WebInspector.SASSSupport.AST>}
   */
  parseCSS(url, text) {
    return WebInspector.SASSSupport.parseSCSS(url, text);
  }

  /**
   * @param {string} url
   * @param {string} text
   * @return {!Promise<!WebInspector.SASSSupport.AST>}
   */
  parseSCSS(url, text) {
    return WebInspector.SASSSupport.parseSCSS(url, text);
  }
};
