// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
export class SecurityOrigin {
    #urlOrigin;
    #opaqueUuid;
    constructor(urlOrigin, opaqueUuid) {
        this.#urlOrigin = urlOrigin;
        this.#opaqueUuid = opaqueUuid;
    }
    static create(urlOrigin) {
        return new SecurityOrigin(urlOrigin, undefined);
    }
    static createUniqueOpaque() {
        return new SecurityOrigin(undefined, crypto.randomUUID());
    }
    isSameOriginWith(other) {
        if (this.#opaqueUuid || other.#opaqueUuid) {
            return this.#opaqueUuid === other.#opaqueUuid;
        }
        if (this.isOpaque() || other.isOpaque()) {
            return false;
        }
        return this.#urlOrigin === other.#urlOrigin && this.#urlOrigin !== undefined;
    }
    isOpaque() {
        if (this.#opaqueUuid !== undefined) {
            return true;
        }
        if (this.#urlOrigin) {
            const lower = this.#urlOrigin.toLowerCase();
            return lower === '' || lower === 'null' || lower === 'data:' || lower.startsWith('about') ||
                lower.startsWith('blob:about') || lower.startsWith('blob:data') || lower.startsWith('blob:null') ||
                lower.startsWith('detached') || lower.startsWith('undefined');
        }
        return false;
    }
    siteId() {
        return this.#opaqueUuid ?? (this.#urlOrigin ?? 'unknown-origin');
    }
}
//# sourceMappingURL=SecurityOrigin.js.map