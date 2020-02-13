// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';  // eslint-disable-line no-unused-vars
import * as UI from '../ui/ui.js';

/**
 * @implements {Common.App.App}
 * @unrestricted
 */
export default class SimpleApp {
  /**
   * @override
   * @param {!Document} document
   */
  presentUI(document) {
    const rootView = new UI.RootView.RootView();
    self.UI.inspectorView.show(rootView.element);
    rootView.attachToDocument(document);
    rootView.focus();
  }
}

/**
 * @implements {Common.AppProvider.AppProvider}
 * @unrestricted
 */
export class SimpleAppProvider {
  /**
   * @override
   * @return {!Common.App.App}
   */
  createApp() {
    return new SimpleApp();
  }
}
