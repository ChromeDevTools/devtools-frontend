// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @implements {Common.App}
 * @unrestricted
 */
export default class SimpleApp {
  /**
   * @override
   * @param {!Document} document
   */
  presentUI(document) {
    const rootView = new UI.RootView();
    UI.inspectorView.show(rootView.element);
    rootView.attachToDocument(document);
    rootView.focus();
  }
}

/**
 * @implements {Common.AppProvider}
 * @unrestricted
 */
export class SimpleAppProvider {
  /**
   * @override
   * @return {!Common.App}
   */
  createApp() {
    return new SimpleApp();
  }
}
