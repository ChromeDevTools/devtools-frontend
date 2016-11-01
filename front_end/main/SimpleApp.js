// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @implements {WebInspector.App}
 * @unrestricted
 */
WebInspector.SimpleApp = class {
  /**
   * @override
   * @param {!Document} document
   */
  presentUI(document) {
    var rootView = new WebInspector.RootView();
    WebInspector.inspectorView.show(rootView.element);
    rootView.attachToDocument(document);
  }
};

/**
 * @implements {WebInspector.AppProvider}
 * @unrestricted
 */
WebInspector.SimpleAppProvider = class {
  /**
   * @override
   * @return {!WebInspector.App}
   */
  createApp() {
    return new WebInspector.SimpleApp();
  }
};
