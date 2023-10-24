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
exports.removeMatchingFlags = exports.getFeatures = exports.ChromeLauncher = void 0;
const promises_1 = require("fs/promises");
const path_1 = __importDefault(require("path"));
const browsers_1 = require("@puppeteer/browsers");
const util_js_1 = require("../common/util.js");
const assert_js_1 = require("../util/assert.js");
const ProductLauncher_js_1 = require("./ProductLauncher.js");
const fs_js_1 = require("./util/fs.js");
/**
 * @internal
 */
class ChromeLauncher extends ProductLauncher_js_1.ProductLauncher {
    constructor(puppeteer) {
        super(puppeteer, 'chrome');
    }
    launch(options = {}) {
        const headless = options.headless ?? true;
        if (headless === true &&
            this.puppeteer.configuration.logLevel === 'warn' &&
            !Boolean(process.env['PUPPETEER_DISABLE_HEADLESS_WARNING'])) {
            console.warn([
                '\x1B[1m\x1B[43m\x1B[30m',
                'Puppeteer old Headless deprecation warning:\x1B[0m\x1B[33m',
                '  In the near future `headless: true` will default to the new Headless mode',
                '  for Chrome instead of the old Headless implementation. For more',
                '  information, please see https://developer.chrome.com/articles/new-headless/.',
                '  Consider opting in early by passing `headless: "new"` to `puppeteer.launch()`',
                '  If you encounter any bugs, please report them to https://github.com/puppeteer/puppeteer/issues/new/choose.\x1B[0m\n',
            ].join('\n  '));
        }
        return super.launch(options);
    }
    /**
     * @internal
     */
    async computeLaunchArguments(options = {}) {
        const { ignoreDefaultArgs = false, args = [], pipe = false, debuggingPort, channel, executablePath, } = options;
        const chromeArguments = [];
        if (!ignoreDefaultArgs) {
            chromeArguments.push(...this.defaultArgs(options));
        }
        else if (Array.isArray(ignoreDefaultArgs)) {
            chromeArguments.push(...this.defaultArgs(options).filter(arg => {
                return !ignoreDefaultArgs.includes(arg);
            }));
        }
        else {
            chromeArguments.push(...args);
        }
        if (!chromeArguments.some(argument => {
            return argument.startsWith('--remote-debugging-');
        })) {
            if (pipe) {
                (0, assert_js_1.assert)(!debuggingPort, 'Browser should be launched with either pipe or debugging port - not both.');
                chromeArguments.push('--remote-debugging-pipe');
            }
            else {
                chromeArguments.push(`--remote-debugging-port=${debuggingPort || 0}`);
            }
        }
        let isTempUserDataDir = false;
        // Check for the user data dir argument, which will always be set even
        // with a custom directory specified via the userDataDir option.
        let userDataDirIndex = chromeArguments.findIndex(arg => {
            return arg.startsWith('--user-data-dir');
        });
        if (userDataDirIndex < 0) {
            isTempUserDataDir = true;
            chromeArguments.push(`--user-data-dir=${await (0, promises_1.mkdtemp)(this.getProfilePath())}`);
            userDataDirIndex = chromeArguments.length - 1;
        }
        const userDataDir = chromeArguments[userDataDirIndex].split('=', 2)[1];
        (0, assert_js_1.assert)(typeof userDataDir === 'string', '`--user-data-dir` is malformed');
        let chromeExecutable = executablePath;
        if (!chromeExecutable) {
            (0, assert_js_1.assert)(channel || !this.puppeteer._isPuppeteerCore, `An \`executablePath\` or \`channel\` must be specified for \`puppeteer-core\``);
            chromeExecutable = this.executablePath(channel);
        }
        return {
            executablePath: chromeExecutable,
            args: chromeArguments,
            isTempUserDataDir,
            userDataDir,
        };
    }
    /**
     * @internal
     */
    async cleanUserDataDir(path, opts) {
        if (opts.isTemp) {
            try {
                await (0, fs_js_1.rm)(path);
            }
            catch (error) {
                (0, util_js_1.debugError)(error);
                throw error;
            }
        }
    }
    defaultArgs(options = {}) {
        // See https://github.com/GoogleChrome/chrome-launcher/blob/main/docs/chrome-flags-for-tools.md
        const userDisabledFeatures = getFeatures('--disable-features', options.args);
        if (options.args && userDisabledFeatures.length > 0) {
            removeMatchingFlags(options.args, '--disable-features');
        }
        // Merge default disabled features with user-provided ones, if any.
        const disabledFeatures = [
            'Translate',
            // AcceptCHFrame disabled because of crbug.com/1348106.
            'AcceptCHFrame',
            'MediaRouter',
            'OptimizationHints',
            // https://crbug.com/1492053
            'ProcessPerSiteUpToMainFrameThreshold',
            ...userDisabledFeatures,
        ];
        const userEnabledFeatures = getFeatures('--enable-features', options.args);
        if (options.args && userEnabledFeatures.length > 0) {
            removeMatchingFlags(options.args, '--enable-features');
        }
        // Merge default enabled features with user-provided ones, if any.
        const enabledFeatures = [
            'NetworkServiceInProcess2',
            ...userEnabledFeatures,
        ];
        const chromeArguments = [
            '--allow-pre-commit-input',
            '--disable-background-networking',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-breakpad',
            '--disable-client-side-phishing-detection',
            '--disable-component-extensions-with-background-pages',
            '--disable-component-update',
            '--disable-default-apps',
            '--disable-dev-shm-usage',
            '--disable-extensions',
            `--disable-features=${disabledFeatures.join(',')}`,
            '--disable-hang-monitor',
            '--disable-ipc-flooding-protection',
            '--disable-popup-blocking',
            '--disable-prompt-on-repost',
            '--disable-renderer-backgrounding',
            '--disable-search-engine-choice-screen',
            '--disable-sync',
            '--enable-automation',
            // TODO(sadym): remove '--enable-blink-features=IdleDetection' once
            // IdleDetection is turned on by default.
            '--enable-blink-features=IdleDetection',
            `--enable-features=${enabledFeatures.join(',')}`,
            '--export-tagged-pdf',
            '--force-color-profile=srgb',
            '--metrics-recording-only',
            '--no-first-run',
            '--password-store=basic',
            '--use-mock-keychain',
        ];
        const { devtools = false, headless = !devtools, args = [], userDataDir, } = options;
        if (userDataDir) {
            chromeArguments.push(`--user-data-dir=${path_1.default.resolve(userDataDir)}`);
        }
        if (devtools) {
            chromeArguments.push('--auto-open-devtools-for-tabs');
        }
        if (headless) {
            chromeArguments.push(headless === 'new' ? '--headless=new' : '--headless', '--hide-scrollbars', '--mute-audio');
        }
        if (args.every(arg => {
            return arg.startsWith('-');
        })) {
            chromeArguments.push('about:blank');
        }
        chromeArguments.push(...args);
        return chromeArguments;
    }
    executablePath(channel) {
        if (channel) {
            return (0, browsers_1.computeSystemExecutablePath)({
                browser: browsers_1.Browser.CHROME,
                channel: convertPuppeteerChannelToBrowsersChannel(channel),
            });
        }
        else {
            return this.resolveExecutablePath();
        }
    }
}
exports.ChromeLauncher = ChromeLauncher;
function convertPuppeteerChannelToBrowsersChannel(channel) {
    switch (channel) {
        case 'chrome':
            return browsers_1.ChromeReleaseChannel.STABLE;
        case 'chrome-dev':
            return browsers_1.ChromeReleaseChannel.DEV;
        case 'chrome-beta':
            return browsers_1.ChromeReleaseChannel.BETA;
        case 'chrome-canary':
            return browsers_1.ChromeReleaseChannel.CANARY;
    }
}
/**
 * Extracts all features from the given command-line flag
 * (e.g. `--enable-features`, `--enable-features=`).
 *
 * Example input:
 * ["--enable-features=NetworkService,NetworkServiceInProcess", "--enable-features=Foo"]
 *
 * Example output:
 * ["NetworkService", "NetworkServiceInProcess", "Foo"]
 *
 * @internal
 */
function getFeatures(flag, options = []) {
    return options
        .filter(s => {
        return s.startsWith(flag.endsWith('=') ? flag : `${flag}=`);
    })
        .map(s => {
        return s.split(new RegExp(`${flag}` + '=\\s*'))[1]?.trim();
    })
        .filter(s => {
        return s;
    });
}
exports.getFeatures = getFeatures;
/**
 * Removes all elements in-place from the given string array
 * that match the given command-line flag.
 *
 * @internal
 */
function removeMatchingFlags(array, flag) {
    const regex = new RegExp(`^${flag}=.*`);
    let i = 0;
    while (i < array.length) {
        if (regex.test(array[i])) {
            array.splice(i, 1);
        }
        else {
            i++;
        }
    }
    return array;
}
exports.removeMatchingFlags = removeMatchingFlags;
//# sourceMappingURL=ChromeLauncher.js.map