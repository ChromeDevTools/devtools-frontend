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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveBuildId = exports.relativeExecutablePath = exports.resolveDownloadPath = exports.resolveDownloadUrl = exports.resolveSystemExecutablePath = void 0;
const path_1 = __importDefault(require("path"));
const httpUtil_js_1 = require("../httpUtil.js");
const types_js_1 = require("./types.js");
var chrome_js_1 = require("./chrome.js");
Object.defineProperty(exports, "resolveSystemExecutablePath", { enumerable: true, get: function () { return chrome_js_1.resolveSystemExecutablePath; } });
function archive(platform, buildId) {
    switch (platform) {
        case types_js_1.BrowserPlatform.LINUX:
            return 'chrome-linux';
        case types_js_1.BrowserPlatform.MAC_ARM:
        case types_js_1.BrowserPlatform.MAC:
            return 'chrome-mac';
        case types_js_1.BrowserPlatform.WIN32:
        case types_js_1.BrowserPlatform.WIN64:
            // Windows archive name changed at r591479.
            return parseInt(buildId, 10) > 591479 ? 'chrome-win' : 'chrome-win32';
    }
}
function folder(platform) {
    switch (platform) {
        case types_js_1.BrowserPlatform.LINUX:
            return 'Linux_x64';
        case types_js_1.BrowserPlatform.MAC_ARM:
            return 'Mac_Arm';
        case types_js_1.BrowserPlatform.MAC:
            return 'Mac';
        case types_js_1.BrowserPlatform.WIN32:
            return 'Win';
        case types_js_1.BrowserPlatform.WIN64:
            return 'Win_x64';
    }
}
function resolveDownloadUrl(platform, buildId, baseUrl = 'https://storage.googleapis.com/chromium-browser-snapshots') {
    return `${baseUrl}/${resolveDownloadPath(platform, buildId).join('/')}`;
}
exports.resolveDownloadUrl = resolveDownloadUrl;
function resolveDownloadPath(platform, buildId) {
    return [folder(platform), buildId, `${archive(platform, buildId)}.zip`];
}
exports.resolveDownloadPath = resolveDownloadPath;
function relativeExecutablePath(platform, _buildId) {
    switch (platform) {
        case types_js_1.BrowserPlatform.MAC:
        case types_js_1.BrowserPlatform.MAC_ARM:
            return path_1.default.join('chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium');
        case types_js_1.BrowserPlatform.LINUX:
            return path_1.default.join('chrome-linux', 'chrome');
        case types_js_1.BrowserPlatform.WIN32:
        case types_js_1.BrowserPlatform.WIN64:
            return path_1.default.join('chrome-win', 'chrome.exe');
    }
}
exports.relativeExecutablePath = relativeExecutablePath;
async function resolveBuildId(platform, 
// We will need it for other channels/keywords.
_channel = 'latest') {
    return new Promise((resolve, reject) => {
        const request = (0, httpUtil_js_1.httpRequest)(new URL(`https://storage.googleapis.com/chromium-browser-snapshots/${folder(platform)}/LAST_CHANGE`), 'GET', response => {
            let data = '';
            if (response.statusCode && response.statusCode >= 400) {
                return reject(new Error(`Got status code ${response.statusCode}`));
            }
            response.on('data', chunk => {
                data += chunk;
            });
            response.on('end', () => {
                try {
                    return resolve(String(data));
                }
                catch {
                    return reject(new Error('Chrome version not found'));
                }
            });
        }, false);
        request.on('error', err => {
            reject(err);
        });
    });
}
exports.resolveBuildId = resolveBuildId;
//# sourceMappingURL=chromium.js.map