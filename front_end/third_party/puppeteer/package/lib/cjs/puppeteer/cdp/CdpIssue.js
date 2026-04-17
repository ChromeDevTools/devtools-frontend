"use strict";
/**
 * @license
 * Copyright 2026 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CdpIssue = void 0;
/**
 * @internal
 */
class CdpIssue {
    #code;
    #details;
    constructor(issue) {
        this.#code = issue.code;
        this.#details = issue.details;
    }
    get code() {
        return this.#code;
    }
    get details() {
        return this.#details;
    }
}
exports.CdpIssue = CdpIssue;
//# sourceMappingURL=CdpIssue.js.map