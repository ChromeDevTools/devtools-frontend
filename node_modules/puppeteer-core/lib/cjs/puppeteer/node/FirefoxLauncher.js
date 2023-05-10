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
exports.FirefoxLauncher = void 0;
const fs_1 = __importDefault(require("fs"));
const promises_1 = require("fs/promises");
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const browsers_1 = require("@puppeteer/browsers");
const util_js_1 = require("../common/util.js");
const assert_js_1 = require("../util/assert.js");
const ProductLauncher_js_1 = require("./ProductLauncher.js");
const fs_js_1 = require("./util/fs.js");
/**
 * @internal
 */
class FirefoxLauncher extends ProductLauncher_js_1.ProductLauncher {
    constructor(puppeteer) {
        super(puppeteer, 'firefox');
    }
    /**
     * @internal
     */
    async computeLaunchArguments(options = {}) {
        const { ignoreDefaultArgs = false, args = [], executablePath, pipe = false, extraPrefsFirefox = {}, debuggingPort = null, } = options;
        const firefoxArguments = [];
        if (!ignoreDefaultArgs) {
            firefoxArguments.push(...this.defaultArgs(options));
        }
        else if (Array.isArray(ignoreDefaultArgs)) {
            firefoxArguments.push(...this.defaultArgs(options).filter(arg => {
                return !ignoreDefaultArgs.includes(arg);
            }));
        }
        else {
            firefoxArguments.push(...args);
        }
        if (!firefoxArguments.some(argument => {
            return argument.startsWith('--remote-debugging-');
        })) {
            if (pipe) {
                (0, assert_js_1.assert)(debuggingPort === null, 'Browser should be launched with either pipe or debugging port - not both.');
            }
            firefoxArguments.push(`--remote-debugging-port=${debuggingPort || 0}`);
        }
        let userDataDir;
        let isTempUserDataDir = true;
        // Check for the profile argument, which will always be set even
        // with a custom directory specified via the userDataDir option.
        const profileArgIndex = firefoxArguments.findIndex(arg => {
            return ['-profile', '--profile'].includes(arg);
        });
        if (profileArgIndex !== -1) {
            userDataDir = firefoxArguments[profileArgIndex + 1];
            if (!userDataDir || !fs_1.default.existsSync(userDataDir)) {
                throw new Error(`Firefox profile not found at '${userDataDir}'`);
            }
            // When using a custom Firefox profile it needs to be populated
            // with required preferences.
            isTempUserDataDir = false;
        }
        else {
            userDataDir = await (0, promises_1.mkdtemp)(this.getProfilePath());
            firefoxArguments.push('--profile');
            firefoxArguments.push(userDataDir);
        }
        await (0, browsers_1.createProfile)(browsers_1.Browser.FIREFOX, {
            path: userDataDir,
            preferences: extraPrefsFirefox,
        });
        let firefoxExecutable;
        if (this.puppeteer._isPuppeteerCore || executablePath) {
            (0, assert_js_1.assert)(executablePath, `An \`executablePath\` must be specified for \`puppeteer-core\``);
            firefoxExecutable = executablePath;
        }
        else {
            firefoxExecutable = this.executablePath();
        }
        return {
            isTempUserDataDir,
            userDataDir,
            args: firefoxArguments,
            executablePath: firefoxExecutable,
        };
    }
    /**
     * @internal
     */
    async cleanUserDataDir(userDataDir, opts) {
        if (opts.isTemp) {
            try {
                await (0, fs_js_1.rm)(userDataDir);
            }
            catch (error) {
                (0, util_js_1.debugError)(error);
                throw error;
            }
        }
        else {
            try {
                // When an existing user profile has been used remove the user
                // preferences file and restore possibly backuped preferences.
                await (0, promises_1.unlink)(path_1.default.join(userDataDir, 'user.js'));
                const prefsBackupPath = path_1.default.join(userDataDir, 'prefs.js.puppeteer');
                if (fs_1.default.existsSync(prefsBackupPath)) {
                    const prefsPath = path_1.default.join(userDataDir, 'prefs.js');
                    await (0, promises_1.unlink)(prefsPath);
                    await (0, promises_1.rename)(prefsBackupPath, prefsPath);
                }
            }
            catch (error) {
                (0, util_js_1.debugError)(error);
            }
        }
    }
    executablePath() {
        // replace 'latest' placeholder with actual downloaded revision
        if (this.puppeteer.browserRevision === 'latest') {
            const cache = new browsers_1.Cache(this.puppeteer.defaultDownloadPath);
            const installedFirefox = cache.getInstalledBrowsers().find(browser => {
                return (browser.platform === (0, browsers_1.detectBrowserPlatform)() &&
                    browser.browser === browsers_1.Browser.FIREFOX);
            });
            if (installedFirefox) {
                this.actualBrowserRevision = installedFirefox.buildId;
            }
        }
        return this.resolveExecutablePath();
    }
    defaultArgs(options = {}) {
        const { devtools = false, headless = !devtools, args = [], userDataDir = null, } = options;
        const firefoxArguments = ['--no-remote'];
        switch (os_1.default.platform()) {
            case 'darwin':
                firefoxArguments.push('--foreground');
                break;
            case 'win32':
                firefoxArguments.push('--wait-for-browser');
                break;
        }
        if (userDataDir) {
            firefoxArguments.push('--profile');
            firefoxArguments.push(userDataDir);
        }
        if (headless) {
            firefoxArguments.push('--headless');
        }
        if (devtools) {
            firefoxArguments.push('--devtools');
        }
        if (args.every(arg => {
            return arg.startsWith('-');
        })) {
            firefoxArguments.push('about:blank');
        }
        firefoxArguments.push(...args);
        return firefoxArguments;
    }
}
exports.FirefoxLauncher = FirefoxLauncher;
//# sourceMappingURL=FirefoxLauncher.js.map