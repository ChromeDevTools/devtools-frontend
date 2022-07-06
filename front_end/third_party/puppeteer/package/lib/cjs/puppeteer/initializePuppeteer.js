"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializePuppeteer = void 0;
const pkg_dir_1 = require("pkg-dir");
const constants_js_1 = require("./constants.js");
const Puppeteer_js_1 = require("./node/Puppeteer.js");
const revisions_js_1 = require("./revisions.js");
/**
 * @internal
 */
const initializePuppeteer = (packageName) => {
    const isPuppeteerCore = packageName === 'puppeteer-core';
    const puppeteerRootDirectory = (0, pkg_dir_1.sync)(constants_js_1.rootDirname);
    let preferredRevision = revisions_js_1.PUPPETEER_REVISIONS.chromium;
    // puppeteer-core ignores environment variables
    const productName = !isPuppeteerCore
        ? (process.env['PUPPETEER_PRODUCT'] ||
            process.env['npm_config_puppeteer_product'] ||
            process.env['npm_package_config_puppeteer_product'])
        : undefined;
    if (!isPuppeteerCore && productName === 'firefox') {
        preferredRevision = revisions_js_1.PUPPETEER_REVISIONS.firefox;
    }
    return new Puppeteer_js_1.PuppeteerNode({
        projectRoot: puppeteerRootDirectory,
        preferredRevision,
        isPuppeteerCore,
        productName,
    });
};
exports.initializePuppeteer = initializePuppeteer;
//# sourceMappingURL=initializePuppeteer.js.map