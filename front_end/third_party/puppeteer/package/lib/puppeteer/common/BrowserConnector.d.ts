/**
 * @license
 * Copyright 2023 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
import type { Browser } from '../api/Browser.js';
import type { ConnectOptions } from './ConnectOptions.js';
import type { Logger } from './Debug.js';
/**
 * Users should never call this directly; it's called when calling
 * `puppeteer.connect`. This method attaches Puppeteer to an existing browser instance.
 *
 * @internal
 */
export declare function assertSupportedUrlRestrictions(options: {
    allowlist?: string[];
    blocklist?: string[];
    protocol?: string;
}): void;
/**
 * @internal
 */
export declare function _connectToBrowser(options: ConnectOptions & {
    logger: Logger;
}): Promise<Browser>;
//# sourceMappingURL=BrowserConnector.d.ts.map