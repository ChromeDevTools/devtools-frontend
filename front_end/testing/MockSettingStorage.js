// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
export class MockStore {
    #store = new Map();
    register() {
    }
    set(key, value) {
        this.#store.set(key, value);
    }
    get(key) {
        return this.#store.get(key);
    }
    remove(key) {
        this.#store.delete(key);
    }
    clear() {
        this.#store.clear();
    }
}
//# sourceMappingURL=MockSettingStorage.js.map