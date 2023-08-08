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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeProgressCallback = exports.CLI = void 0;
const process_1 = require("process");
const readline = __importStar(require("readline"));
const progress_1 = __importDefault(require("progress"));
const helpers_1 = require("yargs/helpers");
const yargs_1 = __importDefault(require("yargs/yargs"));
const browser_data_js_1 = require("./browser-data/browser-data.js");
const Cache_js_1 = require("./Cache.js");
const detectPlatform_js_1 = require("./detectPlatform.js");
const install_js_1 = require("./install.js");
const launch_js_1 = require("./launch.js");
/**
 * @public
 */
class CLI {
    #cachePath;
    #rl;
    constructor(cachePath = process.cwd(), rl) {
        this.#cachePath = cachePath;
        this.#rl = rl;
    }
    #defineBrowserParameter(yargs) {
        yargs.positional('browser', {
            description: 'Which browser to install <browser>[@<buildId|latest>]. `latest` will try to find the latest available build. `buildId` is a browser-specific identifier such as a version or a revision.',
            type: 'string',
            coerce: (opt) => {
                return {
                    name: this.#parseBrowser(opt),
                    buildId: this.#parseBuildId(opt),
                };
            },
        });
    }
    #definePlatformParameter(yargs) {
        yargs.option('platform', {
            type: 'string',
            desc: 'Platform that the binary needs to be compatible with.',
            choices: Object.values(browser_data_js_1.BrowserPlatform),
            defaultDescription: 'Auto-detected',
        });
    }
    #definePathParameter(yargs, required = false) {
        yargs.option('path', {
            type: 'string',
            desc: 'Path to the root folder for the browser downloads and installation. The installation folder structure is compatible with the cache structure used by Puppeteer.',
            defaultDescription: 'Current working directory',
            ...(required ? {} : { default: process.cwd() }),
        });
        if (required) {
            yargs.demandOption('path');
        }
    }
    async run(argv) {
        const yargsInstance = (0, yargs_1.default)((0, helpers_1.hideBin)(argv));
        await yargsInstance
            .scriptName('@puppeteer/browsers')
            .command('install <browser>', 'Download and install the specified browser. If successful, the command outputs the actual browser buildId that was installed and the absolute path to the browser executable (format: <browser>@<buildID> <path>).', yargs => {
            this.#defineBrowserParameter(yargs);
            this.#definePlatformParameter(yargs);
            this.#definePathParameter(yargs);
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
            args.platform ??= (0, detectPlatform_js_1.detectBrowserPlatform)();
            if (!args.platform) {
                throw new Error(`Could not resolve the current platform`);
            }
            args.browser.buildId = await (0, browser_data_js_1.resolveBuildId)(args.browser.name, args.platform, args.browser.buildId);
            await (0, install_js_1.install)({
                browser: args.browser.name,
                buildId: args.browser.buildId,
                platform: args.platform,
                cacheDir: args.path ?? this.#cachePath,
                downloadProgressCallback: makeProgressCallback(args.browser.name, args.browser.buildId),
                baseUrl: args.baseUrl,
            });
            console.log(`${args.browser.name}@${args.browser.buildId} ${(0, launch_js_1.computeExecutablePath)({
                browser: args.browser.name,
                buildId: args.browser.buildId,
                cacheDir: args.path ?? this.#cachePath,
                platform: args.platform,
            })}`);
        })
            .command('launch <browser>', 'Launch the specified browser', yargs => {
            this.#defineBrowserParameter(yargs);
            this.#definePlatformParameter(yargs);
            this.#definePathParameter(yargs);
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
                ? (0, launch_js_1.computeSystemExecutablePath)({
                    browser: args.browser.name,
                    // TODO: throw an error if not a ChromeReleaseChannel is provided.
                    channel: args.browser.buildId,
                    platform: args.platform,
                })
                : (0, launch_js_1.computeExecutablePath)({
                    browser: args.browser.name,
                    buildId: args.browser.buildId,
                    cacheDir: args.path ?? this.#cachePath,
                    platform: args.platform,
                });
            (0, launch_js_1.launch)({
                executablePath,
                detached: args.detached,
            });
        })
            .command('clear', 'Removes all installed browsers from the specified cache directory', yargs => {
            this.#definePathParameter(yargs, true);
        }, async (argv) => {
            const args = argv;
            const cacheDir = args.path ?? this.#cachePath;
            const rl = this.#rl ?? readline.createInterface({ input: process_1.stdin, output: process_1.stdout });
            rl.question(`Do you want to permanently and recursively delete the content of ${cacheDir} (yes/No)? `, answer => {
                rl.close();
                if (!['y', 'yes'].includes(answer.toLowerCase().trim())) {
                    console.log('Cancelled.');
                    return;
                }
                const cache = new Cache_js_1.Cache(cacheDir);
                cache.clear();
                console.log(`${cacheDir} cleared.`);
            });
        })
            .demandCommand(1)
            .help()
            .wrap(Math.min(120, yargsInstance.terminalWidth()))
            .parse();
    }
    #parseBrowser(version) {
        return version.split('@').shift();
    }
    #parseBuildId(version) {
        const parts = version.split('@');
        return parts.length === 2 ? parts[1] : 'latest';
    }
}
exports.CLI = CLI;
/**
 * @public
 */
function makeProgressCallback(browser, buildId) {
    let progressBar;
    let lastDownloadedBytes = 0;
    return (downloadedBytes, totalBytes) => {
        if (!progressBar) {
            progressBar = new progress_1.default(`Downloading ${browser} r${buildId} - ${toMegabytes(totalBytes)} [:bar] :percent :etas `, {
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
exports.makeProgressCallback = makeProgressCallback;
function toMegabytes(bytes) {
    const mb = bytes / 1000 / 1000;
    return `${Math.round(mb * 10) / 10} MB`;
}
//# sourceMappingURL=CLI.js.map