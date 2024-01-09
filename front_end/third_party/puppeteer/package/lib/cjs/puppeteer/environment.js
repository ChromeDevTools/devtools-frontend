"use strict";
/**
 * @license
 * Copyright 2020 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFERRED_PROMISE_DEBUG_TIMEOUT = exports.isNode = void 0;
/**
 * @internal
 */
exports.isNode = !!(typeof process !== 'undefined' && process.version);
/**
 * @internal
 */
exports.DEFERRED_PROMISE_DEBUG_TIMEOUT = typeof process !== 'undefined' &&
    typeof process.env['PUPPETEER_DEFERRED_PROMISE_DEBUG_TIMEOUT'] !== 'undefined'
    ? Number(process.env['PUPPETEER_DEFERRED_PROMISE_DEBUG_TIMEOUT'])
    : -1;
//# sourceMappingURL=environment.js.map