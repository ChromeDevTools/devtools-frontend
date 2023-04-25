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
import * as chrome from './chrome.js';
import * as firefox from './firefox.js';
/**
 * Supported browsers.
 *
 * @public
 */
export var Browser;
(function (Browser) {
    Browser["CHROME"] = "chrome";
    Browser["CHROMIUM"] = "chromium";
    Browser["FIREFOX"] = "firefox";
    Browser["CHROMEDRIVER"] = "chromedriver";
})(Browser || (Browser = {}));
/**
 * Platform names used to identify a OS platfrom x architecture combination in the way
 * that is relevant for the browser download.
 *
 * @public
 */
export var BrowserPlatform;
(function (BrowserPlatform) {
    BrowserPlatform["LINUX"] = "linux";
    BrowserPlatform["MAC"] = "mac";
    BrowserPlatform["MAC_ARM"] = "mac_arm";
    BrowserPlatform["WIN32"] = "win32";
    BrowserPlatform["WIN64"] = "win64";
})(BrowserPlatform || (BrowserPlatform = {}));
export const downloadUrls = {
    [Browser.CHROME]: chrome.resolveDownloadUrl,
    [Browser.CHROMIUM]: chrome.resolveDownloadUrl,
    [Browser.FIREFOX]: firefox.resolveDownloadUrl,
};
/**
 * @public
 */
export var BrowserTag;
(function (BrowserTag) {
    BrowserTag["LATEST"] = "latest";
})(BrowserTag || (BrowserTag = {}));
/**
 * @public
 */
export var ChromeReleaseChannel;
(function (ChromeReleaseChannel) {
    ChromeReleaseChannel["STABLE"] = "stable";
    ChromeReleaseChannel["DEV"] = "dev";
    ChromeReleaseChannel["CANARY"] = "canary";
    ChromeReleaseChannel["BETA"] = "beta";
})(ChromeReleaseChannel || (ChromeReleaseChannel = {}));
//# sourceMappingURL=types.js.map