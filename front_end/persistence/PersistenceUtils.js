// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

WebInspector.PersistenceUtils = class {
  /**
   * @param {!WebInspector.UISourceCode} uiSourceCode
   * @return {string}
   */
  static tooltipForUISourceCode(uiSourceCode) {
    var binding = WebInspector.persistence.binding(uiSourceCode);
    if (!binding)
      return '';
    if (uiSourceCode === binding.network)
      return WebInspector.UIString('Persisted to file system: %s', binding.fileSystem.url().trimMiddle(150));
    if (binding.network.contentType().isFromSourceMap())
      return WebInspector.UIString('Linked to source map: %s', binding.network.url().trimMiddle(150));
    return WebInspector.UIString('Linked to %s', binding.network.url().trimMiddle(150));
  }
};
