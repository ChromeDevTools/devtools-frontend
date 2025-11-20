// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
export const IS_NODE = typeof process !== 'undefined' && process.versions?.node !== null;
export const HOST_RUNTIME = {
    createWorker() {
        throw new Error('unimplemented');
    }
};
//# sourceMappingURL=HostRuntime.js.map