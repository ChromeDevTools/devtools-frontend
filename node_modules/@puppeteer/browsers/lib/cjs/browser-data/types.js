"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChromeReleaseChannel = exports.BrowserTag = exports.downloadUrls = exports.BrowserPlatform = exports.Browser = void 0;
const chrome = __importStar(require("./chrome.js"));
const firefox = __importStar(require("./firefox.js"));
/**
 * Supported browsers.
 *
 * @public
 */
var Browser;
(function (Browser) {
    Browser["CHROME"] = "chrome";
    Browser["CHROMIUM"] = "chromium";
    Browser["FIREFOX"] = "firefox";
    Browser["CHROMEDRIVER"] = "chromedriver";
})(Browser = exports.Browser || (exports.Browser = {}));
/**
 * Platform names used to identify a OS platfrom x architecture combination in the way
 * that is relevant for the browser download.
 *
 * @public
 */
var BrowserPlatform;
(function (BrowserPlatform) {
    BrowserPlatform["LINUX"] = "linux";
    BrowserPlatform["MAC"] = "mac";
    BrowserPlatform["MAC_ARM"] = "mac_arm";
    BrowserPlatform["WIN32"] = "win32";
    BrowserPlatform["WIN64"] = "win64";
})(BrowserPlatform = exports.BrowserPlatform || (exports.BrowserPlatform = {}));
exports.downloadUrls = {
    [Browser.CHROME]: chrome.resolveDownloadUrl,
    [Browser.CHROMIUM]: chrome.resolveDownloadUrl,
    [Browser.FIREFOX]: firefox.resolveDownloadUrl,
};
/**
 * @public
 */
var BrowserTag;
(function (BrowserTag) {
    BrowserTag["LATEST"] = "latest";
})(BrowserTag = exports.BrowserTag || (exports.BrowserTag = {}));
/**
 * @public
 */
var ChromeReleaseChannel;
(function (ChromeReleaseChannel) {
    ChromeReleaseChannel["STABLE"] = "stable";
    ChromeReleaseChannel["DEV"] = "dev";
    ChromeReleaseChannel["CANARY"] = "canary";
    ChromeReleaseChannel["BETA"] = "beta";
})(ChromeReleaseChannel = exports.ChromeReleaseChannel || (exports.ChromeReleaseChannel = {}));
//# sourceMappingURL=types.js.map