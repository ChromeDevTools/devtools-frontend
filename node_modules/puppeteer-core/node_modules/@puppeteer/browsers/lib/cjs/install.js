"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.canDownload = exports.getInstalledBrowsers = exports.uninstall = exports.install = void 0;
const assert_1 = __importDefault(require("assert"));
const fs_1 = require("fs");
const promises_1 = require("fs/promises");
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const browser_data_js_1 = require("./browser-data/browser-data.js");
const Cache_js_1 = require("./Cache.js");
const debug_js_1 = require("./debug.js");
const detectPlatform_js_1 = require("./detectPlatform.js");
const fileUtil_js_1 = require("./fileUtil.js");
const httpUtil_js_1 = require("./httpUtil.js");
const debugInstall = (0, debug_js_1.debug)('puppeteer:browsers:install');
const times = new Map();
function debugTime(label) {
    times.set(label, process.hrtime());
}
function debugTimeEnd(label) {
    const end = process.hrtime();
    const start = times.get(label);
    if (!start) {
        return;
    }
    const duration = end[0] * 1000 + end[1] / 1e6 - (start[0] * 1000 + start[1] / 1e6); // calculate duration in milliseconds
    debugInstall(`Duration for ${label}: ${duration}ms`);
}
/**
 * @public
 */
async function install(options) {
    options.platform ??= (0, detectPlatform_js_1.detectBrowserPlatform)();
    options.unpack ??= true;
    if (!options.platform) {
        throw new Error(`Cannot download a binary for the provided platform: ${os_1.default.platform()} (${os_1.default.arch()})`);
    }
    const url = getDownloadUrl(options.browser, options.platform, options.buildId, options.baseUrl);
    const fileName = url.toString().split('/').pop();
    (0, assert_1.default)(fileName, `A malformed download URL was found: ${url}.`);
    const structure = new Cache_js_1.Cache(options.cacheDir);
    const browserRoot = structure.browserRoot(options.browser);
    const archivePath = path_1.default.join(browserRoot, fileName);
    if (!(0, fs_1.existsSync)(browserRoot)) {
        await (0, promises_1.mkdir)(browserRoot, { recursive: true });
    }
    if (!options.unpack) {
        if ((0, fs_1.existsSync)(archivePath)) {
            return {
                path: archivePath,
                browser: options.browser,
                platform: options.platform,
                buildId: options.buildId,
            };
        }
        debugInstall(`Downloading binary from ${url}`);
        debugTime('download');
        await (0, httpUtil_js_1.downloadFile)(url, archivePath, options.downloadProgressCallback);
        debugTimeEnd('download');
        return {
            path: archivePath,
            browser: options.browser,
            platform: options.platform,
            buildId: options.buildId,
        };
    }
    const outputPath = structure.installationDir(options.browser, options.platform, options.buildId);
    if ((0, fs_1.existsSync)(outputPath)) {
        return {
            path: outputPath,
            browser: options.browser,
            platform: options.platform,
            buildId: options.buildId,
        };
    }
    try {
        debugInstall(`Downloading binary from ${url}`);
        try {
            debugTime('download');
            await (0, httpUtil_js_1.downloadFile)(url, archivePath, options.downloadProgressCallback);
        }
        finally {
            debugTimeEnd('download');
        }
        debugInstall(`Installing ${archivePath} to ${outputPath}`);
        try {
            debugTime('extract');
            await (0, fileUtil_js_1.unpackArchive)(archivePath, outputPath);
        }
        finally {
            debugTimeEnd('extract');
        }
    }
    finally {
        if ((0, fs_1.existsSync)(archivePath)) {
            await (0, promises_1.unlink)(archivePath);
        }
    }
    return {
        path: outputPath,
        browser: options.browser,
        platform: options.platform,
        buildId: options.buildId,
    };
}
exports.install = install;
/**
 *
 * @public
 */
async function uninstall(options) {
    options.platform ??= (0, detectPlatform_js_1.detectBrowserPlatform)();
    if (!options.platform) {
        throw new Error(`Cannot detect the browser platform for: ${os_1.default.platform()} (${os_1.default.arch()})`);
    }
    new Cache_js_1.Cache(options.cacheDir).uninstall(options.browser, options.platform, options.buildId);
}
exports.uninstall = uninstall;
/**
 * Returns metadata about browsers installed in the cache directory.
 *
 * @public
 */
async function getInstalledBrowsers(options) {
    return new Cache_js_1.Cache(options.cacheDir).getInstalledBrowsers();
}
exports.getInstalledBrowsers = getInstalledBrowsers;
/**
 * @public
 */
async function canDownload(options) {
    options.platform ??= (0, detectPlatform_js_1.detectBrowserPlatform)();
    if (!options.platform) {
        throw new Error(`Cannot download a binary for the provided platform: ${os_1.default.platform()} (${os_1.default.arch()})`);
    }
    return await (0, httpUtil_js_1.headHttpRequest)(getDownloadUrl(options.browser, options.platform, options.buildId, options.baseUrl));
}
exports.canDownload = canDownload;
function getDownloadUrl(browser, platform, buildId, baseUrl) {
    return new URL(browser_data_js_1.downloadUrls[browser](platform, buildId, baseUrl));
}
//# sourceMappingURL=install.js.map