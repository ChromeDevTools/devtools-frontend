// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
// The StorageItem is used as context for the Ai Assistance.
// If the user selects a row in e.g. the cookies table, the storageType and key
// will be populated.
export class StorageItem {
    origin;
    storageKey;
    storageType;
    key;
    constructor(data) {
        this.origin = data.origin;
        this.storageKey = data.storageKey;
        this.storageType = data.storageType;
        this.key = data.key;
    }
}
//# sourceMappingURL=StorageItem.js.map