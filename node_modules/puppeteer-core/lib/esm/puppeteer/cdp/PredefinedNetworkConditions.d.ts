/**
 * @license
 * Copyright 2021 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
import type { NetworkConditions } from './NetworkManager.js';
/**
 * A list of network conditions to be used with
 * {@link Page.emulateNetworkConditions}.
 *
 * @example
 *
 * ```ts
 * import {PredefinedNetworkConditions} from 'puppeteer';
 * const slow3G = PredefinedNetworkConditions['Slow 3G'];
 *
 * (async () => {
 *   const browser = await puppeteer.launch();
 *   const page = await browser.newPage();
 *   await page.emulateNetworkConditions(slow3G);
 *   await page.goto('https://www.google.com');
 *   // other actions...
 *   await browser.close();
 * })();
 * ```
 *
 * @public
 */
export declare const PredefinedNetworkConditions: Readonly<{
    'Slow 3G': NetworkConditions;
    'Fast 3G': NetworkConditions;
}>;
//# sourceMappingURL=PredefinedNetworkConditions.d.ts.map