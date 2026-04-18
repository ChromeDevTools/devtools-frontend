// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
export class SymbolizedError {
    remoteError;
    stackTrace;
    cause;
    constructor(remoteError, stackTrace, cause) {
        this.remoteError = remoteError;
        this.stackTrace = stackTrace;
        this.cause = cause;
    }
}
//# sourceMappingURL=SymbolizedError.js.map