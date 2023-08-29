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
exports.resolveSystemExecutablePath = exports.createProfile = exports.resolveBuildId = exports.ChromeReleaseChannel = exports.BrowserPlatform = exports.Browser = exports.executablePathByBrowser = exports.downloadPaths = exports.downloadUrls = void 0;
const chromeHeadlessShell = __importStar(require("./chrome-headless-shell.js"));
const chrome = __importStar(require("./chrome.js"));
const chromedriver = __importStar(require("./chromedriver.js"));
const chromium = __importStar(require("./chromium.js"));
const firefox = __importStar(require("./firefox.js"));
const types_js_1 = require("./types.js");
Object.defineProperty(exports, "Browser", { enumerable: true, get: function () { return types_js_1.Browser; } });
Object.defineProperty(exports, "BrowserPlatform", { enumerable: true, get: function () { return types_js_1.BrowserPlatform; } });
Object.defineProperty(exports, "ChromeReleaseChannel", { enumerable: true, get: function () { return types_js_1.ChromeReleaseChannel; } });
exports.downloadUrls = {
    [types_js_1.Browser.CHROMEDRIVER]: chromedriver.resolveDownloadUrl,
    [types_js_1.Browser.CHROMEHEADLESSSHELL]: chromeHeadlessShell.resolveDownloadUrl,
    [types_js_1.Browser.CHROME]: chrome.resolveDownloadUrl,
    [types_js_1.Browser.CHROMIUM]: chromium.resolveDownloadUrl,
    [types_js_1.Browser.FIREFOX]: firefox.resolveDownloadUrl,
};
exports.downloadPaths = {
    [types_js_1.Browser.CHROMEDRIVER]: chromedriver.resolveDownloadPath,
    [types_js_1.Browser.CHROMEHEADLESSSHELL]: chromeHeadlessShell.resolveDownloadPath,
    [types_js_1.Browser.CHROME]: chrome.resolveDownloadPath,
    [types_js_1.Browser.CHROMIUM]: chromium.resolveDownloadPath,
    [types_js_1.Browser.FIREFOX]: firefox.resolveDownloadPath,
};
exports.executablePathByBrowser = {
    [types_js_1.Browser.CHROMEDRIVER]: chromedriver.relativeExecutablePath,
    [types_js_1.Browser.CHROMEHEADLESSSHELL]: chromeHeadlessShell.relativeExecutablePath,
    [types_js_1.Browser.CHROME]: chrome.relativeExecutablePath,
    [types_js_1.Browser.CHROMIUM]: chromium.relativeExecutablePath,
    [types_js_1.Browser.FIREFOX]: firefox.relativeExecutablePath,
};
/**
 * @public
 */
async function resolveBuildId(browser, platform, tag) {
    switch (browser) {
        case types_js_1.Browser.FIREFOX:
            switch (tag) {
                case types_js_1.BrowserTag.LATEST:
                    return await firefox.resolveBuildId('FIREFOX_NIGHTLY');
                case types_js_1.BrowserTag.BETA:
                case types_js_1.BrowserTag.CANARY:
                case types_js_1.BrowserTag.DEV:
                case types_js_1.BrowserTag.STABLE:
                    throw new Error(`${tag} is not supported for ${browser}. Use 'latest' instead.`);
            }
        case types_js_1.Browser.CHROME: {
            switch (tag) {
                case types_js_1.BrowserTag.LATEST:
                    return await chrome.resolveBuildId(types_js_1.ChromeReleaseChannel.CANARY);
                case types_js_1.BrowserTag.BETA:
                    return await chrome.resolveBuildId(types_js_1.ChromeReleaseChannel.BETA);
                case types_js_1.BrowserTag.CANARY:
                    return await chrome.resolveBuildId(types_js_1.ChromeReleaseChannel.CANARY);
                case types_js_1.BrowserTag.DEV:
                    return await chrome.resolveBuildId(types_js_1.ChromeReleaseChannel.DEV);
                case types_js_1.BrowserTag.STABLE:
                    return await chrome.resolveBuildId(types_js_1.ChromeReleaseChannel.STABLE);
                default:
                    const result = await chrome.resolveBuildId(tag);
                    if (result) {
                        return result;
                    }
            }
            return tag;
        }
        case types_js_1.Browser.CHROMEDRIVER: {
            switch (tag) {
                case types_js_1.BrowserTag.LATEST:
                case types_js_1.BrowserTag.CANARY:
                    return await chromedriver.resolveBuildId(types_js_1.ChromeReleaseChannel.CANARY);
                case types_js_1.BrowserTag.BETA:
                    return await chromedriver.resolveBuildId(types_js_1.ChromeReleaseChannel.BETA);
                case types_js_1.BrowserTag.DEV:
                    return await chromedriver.resolveBuildId(types_js_1.ChromeReleaseChannel.DEV);
                case types_js_1.BrowserTag.STABLE:
                    return await chromedriver.resolveBuildId(types_js_1.ChromeReleaseChannel.STABLE);
                default:
                    const result = await chromedriver.resolveBuildId(tag);
                    if (result) {
                        return result;
                    }
            }
            return tag;
        }
        case types_js_1.Browser.CHROMEHEADLESSSHELL: {
            switch (tag) {
                case types_js_1.BrowserTag.LATEST:
                case types_js_1.BrowserTag.CANARY:
                    return await chromeHeadlessShell.resolveBuildId(types_js_1.ChromeReleaseChannel.CANARY);
                case types_js_1.BrowserTag.BETA:
                    return await chromeHeadlessShell.resolveBuildId(types_js_1.ChromeReleaseChannel.BETA);
                case types_js_1.BrowserTag.DEV:
                    return await chromeHeadlessShell.resolveBuildId(types_js_1.ChromeReleaseChannel.DEV);
                case types_js_1.BrowserTag.STABLE:
                    return await chromeHeadlessShell.resolveBuildId(types_js_1.ChromeReleaseChannel.STABLE);
                default:
                    const result = await chromeHeadlessShell.resolveBuildId(tag);
                    if (result) {
                        return result;
                    }
            }
            return tag;
        }
        case types_js_1.Browser.CHROMIUM:
            switch (tag) {
                case types_js_1.BrowserTag.LATEST:
                    return await chromium.resolveBuildId(platform);
                case types_js_1.BrowserTag.BETA:
                case types_js_1.BrowserTag.CANARY:
                case types_js_1.BrowserTag.DEV:
                case types_js_1.BrowserTag.STABLE:
                    throw new Error(`${tag} is not supported for ${browser}. Use 'latest' instead.`);
            }
    }
    // We assume the tag is the buildId if it didn't match any keywords.
    return tag;
}
exports.resolveBuildId = resolveBuildId;
/**
 * @public
 */
async function createProfile(browser, opts) {
    switch (browser) {
        case types_js_1.Browser.FIREFOX:
            return await firefox.createProfile(opts);
        case types_js_1.Browser.CHROME:
        case types_js_1.Browser.CHROMIUM:
            throw new Error(`Profile creation is not support for ${browser} yet`);
    }
}
exports.createProfile = createProfile;
/**
 * @public
 */
function resolveSystemExecutablePath(browser, platform, channel) {
    switch (browser) {
        case types_js_1.Browser.CHROMEDRIVER:
        case types_js_1.Browser.CHROMEHEADLESSSHELL:
        case types_js_1.Browser.FIREFOX:
        case types_js_1.Browser.CHROMIUM:
            throw new Error(`System browser detection is not supported for ${browser} yet.`);
        case types_js_1.Browser.CHROME:
            return chrome.resolveSystemExecutablePath(platform, channel);
    }
}
exports.resolveSystemExecutablePath = resolveSystemExecutablePath;
//# sourceMappingURL=browser-data.js.map