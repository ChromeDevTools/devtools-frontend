/**
 * Copyright 2023 Google Inc. All rights reserved.
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
import * as chromeHeadlessShell from './chrome-headless-shell.js';
import * as chrome from './chrome.js';
import * as chromedriver from './chromedriver.js';
import * as chromium from './chromium.js';
import * as firefox from './firefox.js';
import { Browser, BrowserPlatform, ChromeReleaseChannel, ProfileOptions } from './types.js';
export { ProfileOptions };
export declare const downloadUrls: {
    chromedriver: typeof chromedriver.resolveDownloadUrl;
    "chrome-headless-shell": typeof chromeHeadlessShell.resolveDownloadUrl;
    chrome: typeof chrome.resolveDownloadUrl;
    chromium: typeof chromium.resolveDownloadUrl;
    firefox: typeof firefox.resolveDownloadUrl;
};
export declare const downloadPaths: {
    chromedriver: typeof chromedriver.resolveDownloadPath;
    "chrome-headless-shell": typeof chromeHeadlessShell.resolveDownloadPath;
    chrome: typeof chrome.resolveDownloadPath;
    chromium: typeof chromium.resolveDownloadPath;
    firefox: typeof firefox.resolveDownloadPath;
};
export declare const executablePathByBrowser: {
    chromedriver: typeof chromedriver.relativeExecutablePath;
    "chrome-headless-shell": typeof chromeHeadlessShell.relativeExecutablePath;
    chrome: typeof chrome.relativeExecutablePath;
    chromium: typeof chromium.relativeExecutablePath;
    firefox: typeof firefox.relativeExecutablePath;
};
export { Browser, BrowserPlatform, ChromeReleaseChannel };
/**
 * @public
 */
export declare function resolveBuildId(browser: Browser, platform: BrowserPlatform, tag: string): Promise<string>;
/**
 * @public
 */
export declare function createProfile(browser: Browser, opts: ProfileOptions): Promise<void>;
/**
 * @public
 */
export declare function resolveSystemExecutablePath(browser: Browser, platform: BrowserPlatform, channel: ChromeReleaseChannel): string;
//# sourceMappingURL=browser-data.d.ts.map