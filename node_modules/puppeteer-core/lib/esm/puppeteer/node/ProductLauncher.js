var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _ProductLauncher_product;
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
import { existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { Browser as InstalledBrowser, CDP_WEBSOCKET_ENDPOINT_REGEX, launch, TimeoutError as BrowsersTimeoutError, WEBDRIVER_BIDI_WEBSOCKET_ENDPOINT_REGEX, computeExecutablePath, } from '@puppeteer/browsers';
import { CDPBrowser } from '../common/Browser.js';
import { Connection } from '../common/Connection.js';
import { TimeoutError } from '../common/Errors.js';
import { NodeWebSocketTransport as WebSocketTransport } from '../common/NodeWebSocketTransport.js';
import { debugError } from '../common/util.js';
import { PipeTransport } from './PipeTransport.js';
/**
 * Describes a launcher - a class that is able to create and launch a browser instance.
 *
 * @public
 */
export class ProductLauncher {
    /**
     * @internal
     */
    constructor(puppeteer, product) {
        _ProductLauncher_product.set(this, void 0);
        this.puppeteer = puppeteer;
        __classPrivateFieldSet(this, _ProductLauncher_product, product, "f");
    }
    get product() {
        return __classPrivateFieldGet(this, _ProductLauncher_product, "f");
    }
    async launch(options = {}) {
        const { dumpio = false, env = process.env, handleSIGINT = true, handleSIGTERM = true, handleSIGHUP = true, ignoreHTTPSErrors = false, defaultViewport = { width: 800, height: 600 }, slowMo = 0, timeout = 30000, waitForInitialPage = true, protocol, protocolTimeout, } = options;
        const launchArgs = await this.computeLaunchArguments(options);
        const usePipe = launchArgs.args.includes('--remote-debugging-pipe');
        const onProcessExit = async () => {
            await this.cleanUserDataDir(launchArgs.userDataDir, {
                isTemp: launchArgs.isTempUserDataDir,
            });
        };
        const browserProcess = launch({
            executablePath: launchArgs.executablePath,
            args: launchArgs.args,
            handleSIGHUP,
            handleSIGTERM,
            handleSIGINT,
            dumpio,
            env,
            pipe: usePipe,
            onExit: onProcessExit,
        });
        let browser;
        let connection;
        let closing = false;
        const browserCloseCallback = async () => {
            if (closing) {
                return;
            }
            closing = true;
            await this.closeBrowser(browserProcess, connection);
        };
        try {
            if (__classPrivateFieldGet(this, _ProductLauncher_product, "f") === 'firefox' && protocol === 'webDriverBiDi') {
                browser = await this.createBiDiBrowser(browserProcess, browserCloseCallback, {
                    timeout,
                    protocolTimeout,
                    slowMo,
                    defaultViewport,
                    ignoreHTTPSErrors,
                });
            }
            else {
                if (usePipe) {
                    connection = await this.createCDPPipeConnection(browserProcess, {
                        timeout,
                        protocolTimeout,
                        slowMo,
                    });
                }
                else {
                    connection = await this.createCDPSocketConnection(browserProcess, {
                        timeout,
                        protocolTimeout,
                        slowMo,
                    });
                }
                if (protocol === 'webDriverBiDi') {
                    browser = await this.createBiDiOverCDPBrowser(browserProcess, connection, browserCloseCallback, {
                        timeout,
                        protocolTimeout,
                        slowMo,
                        defaultViewport,
                        ignoreHTTPSErrors,
                    });
                }
                else {
                    browser = await CDPBrowser._create(this.product, connection, [], ignoreHTTPSErrors, defaultViewport, browserProcess.nodeProcess, browserCloseCallback, options.targetFilter);
                }
            }
        }
        catch (error) {
            void browserCloseCallback();
            if (error instanceof BrowsersTimeoutError) {
                throw new TimeoutError(error.message);
            }
            throw error;
        }
        if (waitForInitialPage && protocol !== 'webDriverBiDi') {
            await this.waitForPageTarget(browser, timeout);
        }
        return browser;
    }
    executablePath() {
        throw new Error('Not implemented');
    }
    defaultArgs() {
        throw new Error('Not implemented');
    }
    /**
     * Set only for Firefox, after the launcher resolves the `latest` revision to
     * the actual revision.
     * @internal
     */
    getActualBrowserRevision() {
        return this.actualBrowserRevision;
    }
    async computeLaunchArguments() {
        throw new Error('Not implemented');
    }
    async cleanUserDataDir() {
        throw new Error('Not implemented');
    }
    /**
     * @internal
     */
    async closeBrowser(browserProcess, connection) {
        if (connection) {
            // Attempt to close the browser gracefully
            try {
                await connection.closeBrowser();
                await browserProcess.hasClosed();
            }
            catch (error) {
                debugError(error);
                await browserProcess.close();
            }
        }
        else {
            await browserProcess.close();
        }
    }
    /**
     * @internal
     */
    async waitForPageTarget(browser, timeout) {
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
    /**
     * @internal
     */
    async createCDPSocketConnection(browserProcess, opts) {
        const browserWSEndpoint = await browserProcess.waitForLineOutput(CDP_WEBSOCKET_ENDPOINT_REGEX, opts.timeout);
        const transport = await WebSocketTransport.create(browserWSEndpoint);
        return new Connection(browserWSEndpoint, transport, opts.slowMo, opts.protocolTimeout);
    }
    /**
     * @internal
     */
    async createCDPPipeConnection(browserProcess, opts) {
        // stdio was assigned during start(), and the 'pipe' option there adds the
        // 4th and 5th items to stdio array
        const { 3: pipeWrite, 4: pipeRead } = browserProcess.nodeProcess.stdio;
        const transport = new PipeTransport(pipeWrite, pipeRead);
        return new Connection('', transport, opts.slowMo, opts.protocolTimeout);
    }
    /**
     * @internal
     */
    async createBiDiOverCDPBrowser(browserProcess, connection, closeCallback, opts) {
        // TODO: use other options too.
        const BiDi = await import(
        /* webpackIgnore: true */ '../common/bidi/bidi.js');
        const bidiConnection = await BiDi.connectBidiOverCDP(connection);
        return await BiDi.Browser.create({
            connection: bidiConnection,
            closeCallback,
            process: browserProcess.nodeProcess,
            defaultViewport: opts.defaultViewport,
            ignoreHTTPSErrors: opts.ignoreHTTPSErrors,
        });
    }
    /**
     * @internal
     */
    async createBiDiBrowser(browserProcess, closeCallback, opts) {
        const browserWSEndpoint = (await browserProcess.waitForLineOutput(WEBDRIVER_BIDI_WEBSOCKET_ENDPOINT_REGEX, opts.timeout)) + '/session';
        const transport = await WebSocketTransport.create(browserWSEndpoint);
        const BiDi = await import(
        /* webpackIgnore: true */ '../common/bidi/bidi.js');
        const bidiConnection = new BiDi.Connection(browserWSEndpoint, transport, opts.slowMo, opts.protocolTimeout);
        // TODO: use other options too.
        return await BiDi.Browser.create({
            connection: bidiConnection,
            closeCallback,
            process: browserProcess.nodeProcess,
            defaultViewport: opts.defaultViewport,
            ignoreHTTPSErrors: opts.ignoreHTTPSErrors,
        });
    }
    /**
     * @internal
     */
    getProfilePath() {
        return join(this.puppeteer.configuration.temporaryDirectory ?? tmpdir(), `puppeteer_dev_${this.product}_profile-`);
    }
    /**
     * @internal
     */
    resolveExecutablePath() {
        let executablePath = this.puppeteer.configuration.executablePath;
        if (executablePath) {
            if (!existsSync(executablePath)) {
                throw new Error(`Tried to find the browser at the configured path (${executablePath}), but no executable was found.`);
            }
            return executablePath;
        }
        function productToBrowser(product) {
            switch (product) {
                case 'chrome':
                    return InstalledBrowser.CHROME;
                case 'firefox':
                    return InstalledBrowser.FIREFOX;
            }
            return InstalledBrowser.CHROME;
        }
        executablePath = computeExecutablePath({
            cacheDir: this.puppeteer.defaultDownloadPath,
            browser: productToBrowser(this.product),
            buildId: this.puppeteer.browserRevision,
        });
        if (!existsSync(executablePath)) {
            if (this.puppeteer.configuration.browserRevision) {
                throw new Error(`Tried to find the browser at the configured path (${executablePath}) for revision ${this.puppeteer.browserRevision}, but no executable was found.`);
            }
            switch (this.product) {
                case 'chrome':
                    throw new Error(`Could not find Chrome (ver. ${this.puppeteer.browserRevision}). This can occur if either\n` +
                        ' 1. you did not perform an installation before running the script (e.g. `npm install`) or\n' +
                        ` 2. your cache path is incorrectly configured (which is: ${this.puppeteer.configuration.cacheDirectory}).\n` +
                        'For (2), check out our guide on configuring puppeteer at https://pptr.dev/guides/configuration.');
                case 'firefox':
                    throw new Error(`Could not find Firefox (rev. ${this.puppeteer.browserRevision}). This can occur if either\n` +
                        ' 1. you did not perform an installation for Firefox before running the script (e.g. `PUPPETEER_PRODUCT=firefox npm install`) or\n' +
                        ` 2. your cache path is incorrectly configured (which is: ${this.puppeteer.configuration.cacheDirectory}).\n` +
                        'For (2), check out our guide on configuring puppeteer at https://pptr.dev/guides/configuration.');
            }
        }
        return executablePath;
    }
}
_ProductLauncher_product = new WeakMap();
//# sourceMappingURL=ProductLauncher.js.map