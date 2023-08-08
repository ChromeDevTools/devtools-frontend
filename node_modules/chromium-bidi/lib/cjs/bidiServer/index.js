"use strict";
/**
 * Copyright 2021 Google LLC.
 * Copyright (c) Microsoft Corporation.
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
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const promises_1 = require("fs/promises");
const argparse_1 = __importDefault(require("argparse"));
const browsers_1 = require("@puppeteer/browsers");
const bidiServerRunner_js_1 = require("./bidiServerRunner.js");
const mapperServer_js_1 = require("./mapperServer.js");
const mapperReader_js_1 = __importDefault(require("./mapperReader.js"));
function parseArguments() {
    const parser = new argparse_1.default.ArgumentParser({
        add_help: true,
        exit_on_error: true,
    });
    parser.add_argument('-c', '--channel', {
        help: 'If set, the given installed Chrome Release Channel will be used ' +
            'instead of one pointed by Puppeteer version',
        choices: Object.values(browsers_1.ChromeReleaseChannel),
        default: browsers_1.ChromeReleaseChannel.DEV,
    });
    parser.add_argument('--headless', {
        help: 'Sets if browser should run in headless or headful mode. Default is true.',
        default: true,
    });
    parser.add_argument('-p', '--port', {
        help: 'Port that BiDi server should listen to. Default is 8080.',
        type: 'int',
        default: process.env['PORT'] ?? 8080,
    });
    parser.add_argument('-v', '--verbose', {
        help: 'If present, the Mapper debug log, including CDP commands and events will be logged into the server output.',
        action: 'store_true',
        default: process.env['VERBOSE'] === 'true' || false,
    });
    return parser.parse_known_args()[0];
}
(() => {
    try {
        const args = parseArguments();
        const { channel, port } = args;
        const headless = args.headless !== 'false';
        const verbose = args.verbose === true;
        (0, bidiServerRunner_js_1.debugInfo)('Launching BiDi server...');
        new bidiServerRunner_js_1.BidiServerRunner().run(port, (bidiServer) => {
            return onNewBidiConnectionOpen(channel, headless, bidiServer, verbose);
        });
        (0, bidiServerRunner_js_1.debugInfo)('BiDi server launched');
    }
    catch (e) {
        (0, bidiServerRunner_js_1.debugInfo)('Error', e);
    }
})();
/**
 * On each new BiDi connection:
 * 1. Launch Chromium (using Puppeteer for now).
 * 2. Get `BiDi-CDP` mapper JS binaries using `mapperReader`.
 * 3. Run `BiDi-CDP` mapper in launched browser.
 * 4. Bind `BiDi-CDP` mapper to the `BiDi server`.
 *
 * @return delegate to be called when the connection is closed
 */
async function onNewBidiConnectionOpen(channel, headless, bidiTransport, verbose) {
    // 1. Launch the browser using @puppeteer/browsers.
    const profileDir = await (0, promises_1.mkdtemp)(path_1.default.join(os_1.default.tmpdir(), 'web-driver-bidi-server-'));
    // See https://github.com/GoogleChrome/chrome-launcher/blob/main/docs/chrome-flags-for-tools.md
    const chromeArguments = [
        ...(headless ? ['--headless', '--hide-scrollbars', '--mute-audio'] : []),
        // keep-sorted start
        '--disable-component-update',
        '--disable-default-apps',
        '--disable-features=DialMediaRouteProvider',
        '--disable-notifications',
        '--disable-popup-blocking',
        '--enable-automation',
        '--no-default-browser-check',
        '--no-first-run',
        '--password-store=basic',
        '--remote-debugging-port=9222',
        '--use-mock-keychain',
        `--user-data-dir=${profileDir}`,
        // keep-sorted end
        'about:blank',
    ];
    const executablePath = process.env['BROWSER_BIN'] ??
        (0, browsers_1.computeSystemExecutablePath)({
            browser: browsers_1.Browser.CHROME,
            channel,
        });
    if (!executablePath) {
        throw new Error('Could not find Chrome binary');
    }
    const browser = (0, browsers_1.launch)({
        executablePath,
        args: chromeArguments,
    });
    const wsEndpoint = await browser.waitForLineOutput(browsers_1.CDP_WEBSOCKET_ENDPOINT_REGEX);
    // 2. Get `BiDi-CDP` mapper JS binaries using `mapperReader`.
    const bidiMapperScript = await (0, mapperReader_js_1.default)();
    // 3. Run `BiDi-CDP` mapper in launched browser.
    const mapperServer = await mapperServer_js_1.MapperServer.create(wsEndpoint, bidiMapperScript, verbose);
    // 4. Bind `BiDi-CDP` mapper to the `BiDi server`.
    // Forward messages from BiDi Mapper to the client.
    mapperServer.setOnMessage(async (message) => {
        await bidiTransport.sendMessage(message);
    });
    // Forward messages from the client to BiDi Mapper.
    bidiTransport.setOnMessage(async (message) => {
        await mapperServer.sendMessage(message);
    });
    // Return delegate to be called when the connection is closed.
    return async () => {
        // Close the mapper server.
        mapperServer.close();
        // Close browser.
        await browser.close();
    };
}
//# sourceMappingURL=index.js.map