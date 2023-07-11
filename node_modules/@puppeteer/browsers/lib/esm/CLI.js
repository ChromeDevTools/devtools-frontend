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
var _CLI_instances, _CLI_cachePath, _CLI_rl, _CLI_defineBrowserParameter, _CLI_definePlatformParameter, _CLI_definePathParameter, _CLI_parseBrowser, _CLI_parseBuildId;
import { stdin as input, stdout as output } from 'process';
import * as readline from 'readline';
import ProgressBar from 'progress';
import { hideBin } from 'yargs/helpers';
import yargs from 'yargs/yargs';
import { resolveBuildId, BrowserPlatform, } from './browser-data/browser-data.js';
import { Cache } from './Cache.js';
import { detectBrowserPlatform } from './detectPlatform.js';
import { install } from './install.js';
import { computeExecutablePath, computeSystemExecutablePath, launch, } from './launch.js';
/**
 * @public
 */
export class CLI {
    constructor(cachePath = process.cwd(), rl) {
        _CLI_instances.add(this);
        _CLI_cachePath.set(this, void 0);
        _CLI_rl.set(this, void 0);
        __classPrivateFieldSet(this, _CLI_cachePath, cachePath, "f");
        __classPrivateFieldSet(this, _CLI_rl, rl, "f");
    }
    async run(argv) {
        const yargsInstance = yargs(hideBin(argv));
        await yargsInstance
            .scriptName('@puppeteer/browsers')
            .command('install <browser>', 'Download and install the specified browser. If successful, the command outputs the actual browser buildId that was installed and the absolute path to the browser executable (format: <browser>@<buildID> <path>).', yargs => {
            __classPrivateFieldGet(this, _CLI_instances, "m", _CLI_defineBrowserParameter).call(this, yargs);
            __classPrivateFieldGet(this, _CLI_instances, "m", _CLI_definePlatformParameter).call(this, yargs);
            __classPrivateFieldGet(this, _CLI_instances, "m", _CLI_definePathParameter).call(this, yargs);
            yargs.option('base-url', {
                type: 'string',
                desc: 'Base URL to download from',
            });
            yargs.example('$0 install chrome', 'Install the latest available build of the Chrome browser.');
            yargs.example('$0 install chrome@latest', 'Install the latest available build for the Chrome browser.');
            yargs.example('$0 install chromium@1083080', 'Install the revision 1083080 of the Chromium browser.');
            yargs.example('$0 install firefox', 'Install the latest available build of the Firefox browser.');
            yargs.example('$0 install firefox --platform mac', 'Install the latest Mac (Intel) build of the Firefox browser.');
            yargs.example('$0 install firefox --path /tmp/my-browser-cache', 'Install to the specified cache directory.');
        }, async (argv) => {
            const args = argv;
            args.platform ??= detectBrowserPlatform();
            if (!args.platform) {
                throw new Error(`Could not resolve the current platform`);
            }
            args.browser.buildId = await resolveBuildId(args.browser.name, args.platform, args.browser.buildId);
            await install({
                browser: args.browser.name,
                buildId: args.browser.buildId,
                platform: args.platform,
                cacheDir: args.path ?? __classPrivateFieldGet(this, _CLI_cachePath, "f"),
                downloadProgressCallback: makeProgressCallback(args.browser.name, args.browser.buildId),
                baseUrl: args.baseUrl,
            });
            console.log(`${args.browser.name}@${args.browser.buildId} ${computeExecutablePath({
                browser: args.browser.name,
                buildId: args.browser.buildId,
                cacheDir: args.path ?? __classPrivateFieldGet(this, _CLI_cachePath, "f"),
                platform: args.platform,
            })}`);
        })
            .command('launch <browser>', 'Launch the specified browser', yargs => {
            __classPrivateFieldGet(this, _CLI_instances, "m", _CLI_defineBrowserParameter).call(this, yargs);
            __classPrivateFieldGet(this, _CLI_instances, "m", _CLI_definePlatformParameter).call(this, yargs);
            __classPrivateFieldGet(this, _CLI_instances, "m", _CLI_definePathParameter).call(this, yargs);
            yargs.option('detached', {
                type: 'boolean',
                desc: 'Detach the child process.',
                default: false,
            });
            yargs.option('system', {
                type: 'boolean',
                desc: 'Search for a browser installed on the system instead of the cache folder.',
                default: false,
            });
            yargs.example('$0 launch chrome@1083080', 'Launch the Chrome browser identified by the revision 1083080.');
            yargs.example('$0 launch firefox@112.0a1', 'Launch the Firefox browser identified by the milestone 112.0a1.');
            yargs.example('$0 launch chrome@1083080 --detached', 'Launch the browser but detach the sub-processes.');
            yargs.example('$0 launch chrome@canary --system', 'Try to locate the Canary build of Chrome installed on the system and launch it.');
        }, async (argv) => {
            const args = argv;
            const executablePath = args.system
                ? computeSystemExecutablePath({
                    browser: args.browser.name,
                    // TODO: throw an error if not a ChromeReleaseChannel is provided.
                    channel: args.browser.buildId,
                    platform: args.platform,
                })
                : computeExecutablePath({
                    browser: args.browser.name,
                    buildId: args.browser.buildId,
                    cacheDir: args.path ?? __classPrivateFieldGet(this, _CLI_cachePath, "f"),
                    platform: args.platform,
                });
            launch({
                executablePath,
                detached: args.detached,
            });
        })
            .command('clear', 'Removes all installed browsers from the specified cache directory', yargs => {
            __classPrivateFieldGet(this, _CLI_instances, "m", _CLI_definePathParameter).call(this, yargs, true);
        }, async (argv) => {
            const args = argv;
            const cacheDir = args.path ?? __classPrivateFieldGet(this, _CLI_cachePath, "f");
            const rl = __classPrivateFieldGet(this, _CLI_rl, "f") ?? readline.createInterface({ input, output });
            rl.question(`Do you want to permanently and recursively delete the content of ${cacheDir} (yes/No)? `, answer => {
                rl.close();
                if (!['y', 'yes'].includes(answer.toLowerCase().trim())) {
                    console.log('Cancelled.');
                    return;
                }
                const cache = new Cache(cacheDir);
                cache.clear();
                console.log(`${cacheDir} cleared.`);
            });
        })
            .demandCommand(1)
            .help()
            .wrap(Math.min(120, yargsInstance.terminalWidth()))
            .parse();
    }
}
_CLI_cachePath = new WeakMap(), _CLI_rl = new WeakMap(), _CLI_instances = new WeakSet(), _CLI_defineBrowserParameter = function _CLI_defineBrowserParameter(yargs) {
    yargs.positional('browser', {
        description: 'Which browser to install <browser>[@<buildId|latest>]. `latest` will try to find the latest available build. `buildId` is a browser-specific identifier such as a version or a revision.',
        type: 'string',
        coerce: (opt) => {
            return {
                name: __classPrivateFieldGet(this, _CLI_instances, "m", _CLI_parseBrowser).call(this, opt),
                buildId: __classPrivateFieldGet(this, _CLI_instances, "m", _CLI_parseBuildId).call(this, opt),
            };
        },
    });
}, _CLI_definePlatformParameter = function _CLI_definePlatformParameter(yargs) {
    yargs.option('platform', {
        type: 'string',
        desc: 'Platform that the binary needs to be compatible with.',
        choices: Object.values(BrowserPlatform),
        defaultDescription: 'Auto-detected',
    });
}, _CLI_definePathParameter = function _CLI_definePathParameter(yargs, required = false) {
    yargs.option('path', {
        type: 'string',
        desc: 'Path to the root folder for the browser downloads and installation. The installation folder structure is compatible with the cache structure used by Puppeteer.',
        defaultDescription: 'Current working directory',
        ...(required ? {} : { default: process.cwd() }),
    });
    if (required) {
        yargs.demandOption('path');
    }
}, _CLI_parseBrowser = function _CLI_parseBrowser(version) {
    return version.split('@').shift();
}, _CLI_parseBuildId = function _CLI_parseBuildId(version) {
    return version.split('@').pop() ?? 'latest';
};
/**
 * @public
 */
export function makeProgressCallback(browser, buildId) {
    let progressBar;
    let lastDownloadedBytes = 0;
    return (downloadedBytes, totalBytes) => {
        if (!progressBar) {
            progressBar = new ProgressBar(`Downloading ${browser} r${buildId} - ${toMegabytes(totalBytes)} [:bar] :percent :etas `, {
                complete: '=',
                incomplete: ' ',
                width: 20,
                total: totalBytes,
            });
        }
        const delta = downloadedBytes - lastDownloadedBytes;
        lastDownloadedBytes = downloadedBytes;
        progressBar.tick(delta);
    };
}
function toMegabytes(bytes) {
    const mb = bytes / 1000 / 1000;
    return `${Math.round(mb * 10) / 10} MB`;
}
//# sourceMappingURL=CLI.js.map