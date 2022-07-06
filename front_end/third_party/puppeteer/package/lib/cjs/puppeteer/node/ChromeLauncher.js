"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChromeLauncher = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const assert_js_1 = require("../common/assert.js");
const Browser_js_1 = require("../common/Browser.js");
const BrowserRunner_js_1 = require("./BrowserRunner.js");
const ProductLauncher_js_1 = require("./ProductLauncher.js");
const util_js_1 = require("./util.js");
/**
 * @internal
 */
class ChromeLauncher {
    constructor(projectRoot, preferredRevision, isPuppeteerCore) {
        this._projectRoot = projectRoot;
        this._preferredRevision = preferredRevision;
        this._isPuppeteerCore = isPuppeteerCore;
    }
    async launch(options = {}) {
        const { ignoreDefaultArgs = false, args = [], dumpio = false, channel, executablePath, pipe = false, env = process.env, handleSIGINT = true, handleSIGTERM = true, handleSIGHUP = true, ignoreHTTPSErrors = false, defaultViewport = { width: 800, height: 600 }, slowMo = 0, timeout = 30000, waitForInitialPage = true, debuggingPort, } = options;
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
            chromeArguments.push(`--user-data-dir=${await fs_1.default.promises.mkdtemp(path_1.default.join((0, util_js_1.tmpdir)(), 'puppeteer_dev_chrome_profile-'))}`);
            userDataDirIndex = chromeArguments.length - 1;
        }
        const userDataDir = chromeArguments[userDataDirIndex].split('=', 2)[1];
        (0, assert_js_1.assert)(typeof userDataDir === 'string', '`--user-data-dir` is malformed');
        let chromeExecutable = executablePath;
        if (channel) {
            // executablePath is detected by channel, so it should not be specified by user.
            (0, assert_js_1.assert)(!chromeExecutable, '`executablePath` must not be specified when `channel` is given.');
            chromeExecutable = (0, ProductLauncher_js_1.executablePathForChannel)(channel);
        }
        else if (!chromeExecutable) {
            const { missingText, executablePath } = (0, ProductLauncher_js_1.resolveExecutablePath)(this);
            if (missingText) {
                throw new Error(missingText);
            }
            chromeExecutable = executablePath;
        }
        const usePipe = chromeArguments.includes('--remote-debugging-pipe');
        const runner = new BrowserRunner_js_1.BrowserRunner(this.product, chromeExecutable, chromeArguments, userDataDir, isTempUserDataDir);
        runner.start({
            handleSIGHUP,
            handleSIGTERM,
            handleSIGINT,
            dumpio,
            env,
            pipe: usePipe,
        });
        let browser;
        try {
            const connection = await runner.setupConnection({
                usePipe,
                timeout,
                slowMo,
                preferredRevision: this._preferredRevision,
            });
            browser = await Browser_js_1.Browser._create(connection, [], ignoreHTTPSErrors, defaultViewport, runner.proc, runner.close.bind(runner));
        }
        catch (error) {
            runner.kill();
            throw error;
        }
        if (waitForInitialPage) {
            try {
                await browser.waitForTarget(t => {
                    return t.type() === 'page';
                }, { timeout });
            }
            catch (error) {
                await browser.close();
                throw error;
            }
        }
        return browser;
    }
    defaultArgs(options = {}) {
        const chromeArguments = [
            '--allow-pre-commit-input',
            '--disable-background-networking',
            '--enable-features=NetworkServiceInProcess2',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-breakpad',
            '--disable-client-side-phishing-detection',
            '--disable-component-extensions-with-background-pages',
            '--disable-default-apps',
            '--disable-dev-shm-usage',
            '--disable-extensions',
            // TODO: remove AvoidUnnecessaryBeforeUnloadCheckSync below
            // once crbug.com/1324138 is fixed and released.
            '--disable-features=Translate,BackForwardCache,AvoidUnnecessaryBeforeUnloadCheckSync',
            '--disable-hang-monitor',
            '--disable-ipc-flooding-protection',
            '--disable-popup-blocking',
            '--disable-prompt-on-repost',
            '--disable-renderer-backgrounding',
            '--disable-sync',
            '--force-color-profile=srgb',
            '--metrics-recording-only',
            '--no-first-run',
            '--enable-automation',
            '--password-store=basic',
            '--use-mock-keychain',
            // TODO(sadym): remove '--enable-blink-features=IdleDetection'
            // once IdleDetection is turned on by default.
            '--enable-blink-features=IdleDetection',
            '--export-tagged-pdf',
        ];
        const { devtools = false, headless = !devtools, args = [], userDataDir, } = options;
        if (userDataDir) {
            chromeArguments.push(`--user-data-dir=${path_1.default.resolve(userDataDir)}`);
        }
        if (devtools) {
            chromeArguments.push('--auto-open-devtools-for-tabs');
        }
        if (headless) {
            chromeArguments.push(headless === 'chrome' ? '--headless=chrome' : '--headless', '--hide-scrollbars', '--mute-audio');
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
            return (0, ProductLauncher_js_1.executablePathForChannel)(channel);
        }
        else {
            const results = (0, ProductLauncher_js_1.resolveExecutablePath)(this);
            return results.executablePath;
        }
    }
    get product() {
        return 'chrome';
    }
}
exports.ChromeLauncher = ChromeLauncher;
//# sourceMappingURL=ChromeLauncher.js.map