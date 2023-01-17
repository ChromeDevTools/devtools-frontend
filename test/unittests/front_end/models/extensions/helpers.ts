// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Extensions from '../../../../../front_end/models/extensions/extensions.js';
import {type Chrome} from '../../../../../extension-api/ExtensionAPI.js';
import {describeWithEnvironment} from '../../helpers/EnvironmentHelpers.js';

interface ExtensionContext {
  chrome: Partial<Chrome.DevTools.Chrome>;
}

export function describeWithDummyExtension(title: string, fn: (this: Mocha.Suite, context: ExtensionContext) => void) {
  const context: ExtensionContext = {
    chrome: {},
  };

  function setup() {
    const server = Extensions.ExtensionServer.ExtensionServer.instance({forceNew: true});
    const extensionDescriptor = {
      startPage: 'blank.html',
      name: 'TestExtension',
      exposeExperimentalAPIs: true,
    };
    server.addExtensionForTest(extensionDescriptor, window.location.origin);
    const chrome: Partial<Chrome.DevTools.Chrome> = {};
    (window as {chrome?: Partial<Chrome.DevTools.Chrome>}).chrome = chrome;
    self.injectedExtensionAPI(extensionDescriptor, 'main', 'dark', [], () => {}, 1, window);
    context.chrome = chrome;
  }

  function cleanup() {
    try {
      delete (window as {chrome?: Chrome.DevTools.Chrome}).chrome;
    } catch {
      // Eat errors in headful mode
    }
  }

  return describe(`with-extension-${title}`, function() {
    beforeEach(cleanup);
    beforeEach(setup);
    afterEach(cleanup);

    describeWithEnvironment(title, fn.bind(this, context));
  });
}

describeWithDummyExtension.only = function(title: string, fn: (this: Mocha.Suite, context: ExtensionContext) => void) {
  // eslint-disable-next-line rulesdir/no_only
  return describe.only('.only', function() {
    return describeWithDummyExtension(title, fn);
  });
};
