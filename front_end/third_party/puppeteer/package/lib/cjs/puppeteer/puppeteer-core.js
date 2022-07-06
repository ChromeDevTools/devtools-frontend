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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.launch = exports.executablePath = exports.defaultArgs = exports.createBrowserFetcher = exports.connect = void 0;
const initializePuppeteer_js_1 = require("./initializePuppeteer.js");
__exportStar(require("./common/NetworkConditions.js"), exports);
__exportStar(require("./common/QueryHandler.js"), exports);
__exportStar(require("./common/DeviceDescriptors.js"), exports);
__exportStar(require("./common/Errors.js"), exports);
const puppeteer = (0, initializePuppeteer_js_1.initializePuppeteer)('puppeteer-core');
exports.connect = puppeteer.connect, exports.createBrowserFetcher = puppeteer.createBrowserFetcher, exports.defaultArgs = puppeteer.defaultArgs, exports.executablePath = puppeteer.executablePath, exports.launch = puppeteer.launch;
exports.default = puppeteer;
//# sourceMappingURL=puppeteer-core.js.map