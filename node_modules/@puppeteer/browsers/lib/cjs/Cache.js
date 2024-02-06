"use strict";
/**
 * @license
 * Copyright 2023 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Cache = exports.InstalledBrowser = void 0;
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const browser_data_js_1 = require("./browser-data/browser-data.js");
const detectPlatform_js_1 = require("./detectPlatform.js");
/**
 * @public
 */
class InstalledBrowser {
    browser;
    buildId;
    platform;
    executablePath;
    #cache;
    /**
     * @internal
     */
    constructor(cache, browser, buildId, platform) {
        this.#cache = cache;
        this.browser = browser;
        this.buildId = buildId;
        this.platform = platform;
        this.executablePath = cache.computeExecutablePath({
            browser,
            buildId,
            platform,
        });
    }
    /**
     * Path to the root of the installation folder. Use
     * {@link computeExecutablePath} to get the path to the executable binary.
     */
    get path() {
        return this.#cache.installationDir(this.browser, this.platform, this.buildId);
    }
}
exports.InstalledBrowser = InstalledBrowser;
/**
 * The cache used by Puppeteer relies on the following structure:
 *
 * - rootDir
 *   -- <browser1> | browserRoot(browser1)
 *   ---- <platform>-<buildId> | installationDir()
 *   ------ the browser-platform-buildId
 *   ------ specific structure.
 *   -- <browser2> | browserRoot(browser2)
 *   ---- <platform>-<buildId> | installationDir()
 *   ------ the browser-platform-buildId
 *   ------ specific structure.
 *   @internal
 */
class Cache {
    #rootDir;
    constructor(rootDir) {
        this.#rootDir = rootDir;
    }
    /**
     * @internal
     */
    get rootDir() {
        return this.#rootDir;
    }
    browserRoot(browser) {
        return path_1.default.join(this.#rootDir, browser);
    }
    installationDir(browser, platform, buildId) {
        return path_1.default.join(this.browserRoot(browser), `${platform}-${buildId}`);
    }
    clear() {
        fs_1.default.rmSync(this.#rootDir, {
            force: true,
            recursive: true,
            maxRetries: 10,
            retryDelay: 500,
        });
    }
    uninstall(browser, platform, buildId) {
        fs_1.default.rmSync(this.installationDir(browser, platform, buildId), {
            force: true,
            recursive: true,
            maxRetries: 10,
            retryDelay: 500,
        });
    }
    getInstalledBrowsers() {
        if (!fs_1.default.existsSync(this.#rootDir)) {
            return [];
        }
        const types = fs_1.default.readdirSync(this.#rootDir);
        const browsers = types.filter((t) => {
            return Object.values(browser_data_js_1.Browser).includes(t);
        });
        return browsers.flatMap(browser => {
            const files = fs_1.default.readdirSync(this.browserRoot(browser));
            return files
                .map(file => {
                const result = parseFolderPath(path_1.default.join(this.browserRoot(browser), file));
                if (!result) {
                    return null;
                }
                return new InstalledBrowser(this, browser, result.buildId, result.platform);
            })
                .filter((item) => {
                return item !== null;
            });
        });
    }
    computeExecutablePath(options) {
        options.platform ??= (0, detectPlatform_js_1.detectBrowserPlatform)();
        if (!options.platform) {
            throw new Error(`Cannot download a binary for the provided platform: ${os_1.default.platform()} (${os_1.default.arch()})`);
        }
        const installationDir = this.installationDir(options.browser, options.platform, options.buildId);
        return path_1.default.join(installationDir, browser_data_js_1.executablePathByBrowser[options.browser](options.platform, options.buildId));
    }
}
exports.Cache = Cache;
function parseFolderPath(folderPath) {
    const name = path_1.default.basename(folderPath);
    const splits = name.split('-');
    if (splits.length !== 2) {
        return;
    }
    const [platform, buildId] = splits;
    if (!buildId || !platform) {
        return;
    }
    return { platform, buildId };
}
//# sourceMappingURL=Cache.js.map