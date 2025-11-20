// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Browser from './browser/browser.js';
import * as Node from './node/node.js';
export const HOST_RUNTIME = (() => {
    if (Node.HostRuntime.IS_NODE) {
        return Node.HostRuntime.HOST_RUNTIME;
    }
    if (Browser.HostRuntime.IS_BROWSER) {
        return Browser.HostRuntime.HOST_RUNTIME;
    }
    throw new Error('Unknown runtime!');
})();
//# sourceMappingURL=HostRuntime.js.map