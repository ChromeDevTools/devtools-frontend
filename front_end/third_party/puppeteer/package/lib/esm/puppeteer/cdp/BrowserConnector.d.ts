/**
 * Copyright 2020 Google Inc. All rights reserved.
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
import type { BidiBrowser } from '../bidi/Browser.js';
import type { BrowserConnectOptions, ConnectOptions } from '../common/ConnectOptions.js';
import { CdpBrowser } from './Browser.js';
/**
 * Users should never call this directly; it's called when calling
 * `puppeteer.connect` with `protocol: 'cdp'`.
 *
 * @internal
 */
export declare function _connectToCdpBrowser(options: BrowserConnectOptions & ConnectOptions): Promise<CdpBrowser>;
/**
 * Users should never call this directly; it's called when calling
 * `puppeteer.connect` with `protocol: 'webDriverBiDi'`.
 *
 * @internal
 */
export declare function _connectToBiDiOverCdpBrowser(options: BrowserConnectOptions & ConnectOptions): Promise<BidiBrowser>;
//# sourceMappingURL=BrowserConnector.d.ts.map