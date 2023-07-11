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
exports.Cache = exports.makeProgressCallback = exports.CLI = exports.createProfile = exports.ChromeReleaseChannel = exports.BrowserPlatform = exports.Browser = exports.resolveBuildId = exports.detectBrowserPlatform = exports.uninstall = exports.canDownload = exports.getInstalledBrowsers = exports.install = exports.Process = exports.WEBDRIVER_BIDI_WEBSOCKET_ENDPOINT_REGEX = exports.CDP_WEBSOCKET_ENDPOINT_REGEX = exports.TimeoutError = exports.computeSystemExecutablePath = exports.computeExecutablePath = exports.launch = void 0;
var launch_js_1 = require("./launch.js");
Object.defineProperty(exports, "launch", { enumerable: true, get: function () { return launch_js_1.launch; } });
Object.defineProperty(exports, "computeExecutablePath", { enumerable: true, get: function () { return launch_js_1.computeExecutablePath; } });
Object.defineProperty(exports, "computeSystemExecutablePath", { enumerable: true, get: function () { return launch_js_1.computeSystemExecutablePath; } });
Object.defineProperty(exports, "TimeoutError", { enumerable: true, get: function () { return launch_js_1.TimeoutError; } });
Object.defineProperty(exports, "CDP_WEBSOCKET_ENDPOINT_REGEX", { enumerable: true, get: function () { return launch_js_1.CDP_WEBSOCKET_ENDPOINT_REGEX; } });
Object.defineProperty(exports, "WEBDRIVER_BIDI_WEBSOCKET_ENDPOINT_REGEX", { enumerable: true, get: function () { return launch_js_1.WEBDRIVER_BIDI_WEBSOCKET_ENDPOINT_REGEX; } });
Object.defineProperty(exports, "Process", { enumerable: true, get: function () { return launch_js_1.Process; } });
var install_js_1 = require("./install.js");
Object.defineProperty(exports, "install", { enumerable: true, get: function () { return install_js_1.install; } });
Object.defineProperty(exports, "getInstalledBrowsers", { enumerable: true, get: function () { return install_js_1.getInstalledBrowsers; } });
Object.defineProperty(exports, "canDownload", { enumerable: true, get: function () { return install_js_1.canDownload; } });
Object.defineProperty(exports, "uninstall", { enumerable: true, get: function () { return install_js_1.uninstall; } });
var detectPlatform_js_1 = require("./detectPlatform.js");
Object.defineProperty(exports, "detectBrowserPlatform", { enumerable: true, get: function () { return detectPlatform_js_1.detectBrowserPlatform; } });
var browser_data_js_1 = require("./browser-data/browser-data.js");
Object.defineProperty(exports, "resolveBuildId", { enumerable: true, get: function () { return browser_data_js_1.resolveBuildId; } });
Object.defineProperty(exports, "Browser", { enumerable: true, get: function () { return browser_data_js_1.Browser; } });
Object.defineProperty(exports, "BrowserPlatform", { enumerable: true, get: function () { return browser_data_js_1.BrowserPlatform; } });
Object.defineProperty(exports, "ChromeReleaseChannel", { enumerable: true, get: function () { return browser_data_js_1.ChromeReleaseChannel; } });
Object.defineProperty(exports, "createProfile", { enumerable: true, get: function () { return browser_data_js_1.createProfile; } });
var CLI_js_1 = require("./CLI.js");
Object.defineProperty(exports, "CLI", { enumerable: true, get: function () { return CLI_js_1.CLI; } });
Object.defineProperty(exports, "makeProgressCallback", { enumerable: true, get: function () { return CLI_js_1.makeProgressCallback; } });
var Cache_js_1 = require("./Cache.js");
Object.defineProperty(exports, "Cache", { enumerable: true, get: function () { return Cache_js_1.Cache; } });
//# sourceMappingURL=main.js.map