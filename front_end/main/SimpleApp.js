// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';  // eslint-disable-line no-unused-vars
import * as UI from '../ui/ui.js';

/**
 * @implements {Common.App.App}
 */
export class SimpleApp {
  /**
   * @override
   * @param {!Document} document
   */
  presentUI(document) {
    const rootView = new UI.RootView.RootView();
    UI.InspectorView.InspectorView.instance().show(rootView.element);
    rootView.attachToDocument(document);
    rootView.focus();
  }
}


/** @type {!SimpleAppProvider} */
let simpleAppProviderInstance;


/**
 * @implements {Common.AppProvider.AppProvider}
 */
export class SimpleAppProvider {
  /**
   * @param {{forceNew: ?boolean}} opts
   */
  static instance(opts = {forceNew: null}) {
    const {forceNew} = opts;
    if (!simpleAppProviderInstance || forceNew) {
      simpleAppProviderInstance = new SimpleAppProvider();
    }

    return simpleAppProviderInstance;
  }

  /**
   * @override
   * @return {!Common.App.App}
   */
  createApp() {
    return new SimpleApp();
  }
}
