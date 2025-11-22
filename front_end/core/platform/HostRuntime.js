// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore 'process' is not available when type-checking against browser types.
export const IS_NODE = typeof process !== 'undefined' && process.versions?.node !== null;
export const IS_BROWSER = 
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore 'window' is not available when type-checking against node.js types.
typeof window !== 'undefined' || (typeof self !== 'undefined' && typeof self.postMessage === 'function');
export const HOST_RUNTIME = await (async () => {
    if (IS_NODE) {
        return (await import('./node/node.js')).HostRuntime.HOST_RUNTIME;
    }
    if (IS_BROWSER) {
        return (await import('./browser/browser.js')).HostRuntime.HOST_RUNTIME;
    }
    throw new Error('Unknown runtime!');
})();
//# sourceMappingURL=HostRuntime.js.map