/**
 * @license
 * Copyright 2017 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
export type { Protocol } from 'devtools-protocol';
export * from './api/api.js';
export * from './cdp/cdp.js';
export * from './common/common.js';
export * from './node/node.js';
export * from './revisions.js';
export * from './util/util.js';
/**
 * @deprecated Use the query handler API defined on {@link Puppeteer}
 */
export * from './common/CustomQueryHandler.js';
import { PuppeteerNode } from './node/PuppeteerNode.js';
/**
 * @public
 */
declare const puppeteer: PuppeteerNode;
export declare const 
/**
 * @public
 */
connect: (options: import("./common/ConnectOptions.js").ConnectOptions) => Promise<import("./api/Browser.js").Browser>, 
/**
 * @public
 */
defaultArgs: (options?: import("./node/LaunchOptions.js").BrowserLaunchArgumentOptions) => string[], 
/**
 * @public
 */
executablePath: (channel?: import("./node/LaunchOptions.js").ChromeReleaseChannel | undefined) => string, 
/**
 * @public
 */
launch: (options?: import("./node/PuppeteerNode.js").PuppeteerLaunchOptions) => Promise<import("./api/Browser.js").Browser>;
export default puppeteer;
//# sourceMappingURL=puppeteer-core.d.ts.map