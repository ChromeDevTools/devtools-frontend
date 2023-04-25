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
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveBuildId = exports.relativeExecutablePath = exports.resolveDownloadPath = exports.resolveDownloadUrl = void 0;
const httpUtil_js_1 = require("../httpUtil.js");
const types_js_1 = require("./types.js");
function archive(platform) {
    switch (platform) {
        case types_js_1.BrowserPlatform.LINUX:
            return 'chromedriver_linux64';
        case types_js_1.BrowserPlatform.MAC_ARM:
            return 'chromedriver_mac_arm64';
        case types_js_1.BrowserPlatform.MAC:
            return 'chromedriver_mac64';
        case types_js_1.BrowserPlatform.WIN32:
        case types_js_1.BrowserPlatform.WIN64:
            return 'chromedriver_win32';
    }
}
function resolveDownloadUrl(platform, buildId, baseUrl = 'https://chromedriver.storage.googleapis.com') {
    return `${baseUrl}/${resolveDownloadPath(platform, buildId).join('/')}`;
}
exports.resolveDownloadUrl = resolveDownloadUrl;
function resolveDownloadPath(platform, buildId) {
    return [buildId, `${archive(platform)}.zip`];
}
exports.resolveDownloadPath = resolveDownloadPath;
function relativeExecutablePath(platform, _buildId) {
    switch (platform) {
        case types_js_1.BrowserPlatform.MAC:
        case types_js_1.BrowserPlatform.MAC_ARM:
        case types_js_1.BrowserPlatform.LINUX:
            return 'chromedriver';
        case types_js_1.BrowserPlatform.WIN32:
        case types_js_1.BrowserPlatform.WIN64:
            return 'chromedriver.exe';
    }
}
exports.relativeExecutablePath = relativeExecutablePath;
async function resolveBuildId(_channel = 'latest') {
    return new Promise((resolve, reject) => {
        const request = (0, httpUtil_js_1.httpRequest)(new URL(`https://chromedriver.storage.googleapis.com/LATEST_RELEASE`), 'GET', response => {
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
//# sourceMappingURL=chromedriver.js.map