/**
 * Copyright 2017 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
export { Protocol } from 'devtools-protocol';
export * from './common/Device.js';
export * from './common/Errors.js';
export * from './common/PredefinedNetworkConditions.js';
export * from './common/Puppeteer.js';
/**
 * @deprecated Use the query handler API defined on {@link Puppeteer}
 */
export * from './common/QueryHandler.js';
export * from './node/BrowserFetcher.js';
import { PuppeteerNode } from './node/PuppeteerNode.js';
/**
 * @public
 */
declare const puppeteer: PuppeteerNode;
export declare const connect: (options: import("./common/Puppeteer.js").ConnectOptions) => Promise<import("./types.js").Browser>, 
/**
 * @deprecated Construct {@link BrowserFetcher} manually.
 *
 * @public
 */
createBrowserFetcher: (options: Partial<import("./node/BrowserFetcher.js").BrowserFetcherOptions>) => import("./node/BrowserFetcher.js").BrowserFetcher, defaultArgs: (options?: import("./types.js").BrowserLaunchArgumentOptions) => string[], executablePath: (channel?: import("./types.js").ChromeReleaseChannel | undefined) => string, launch: (options?: import("./node/PuppeteerNode.js").PuppeteerLaunchOptions) => Promise<import("./types.js").Browser>;
export default puppeteer;
//# sourceMappingURL=puppeteer-core.d.ts.map