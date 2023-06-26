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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _Process_instances, _Process_executablePath, _Process_args, _Process_browserProcess, _Process_exited, _Process_hooksRan, _Process_onExitHook, _Process_browserProcessExiting, _Process_runHooks, _Process_configureStdio, _Process_clearListeners, _Process_onDriverProcessExit, _Process_onDriverProcessSignal;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimeoutError = exports.isErrnoException = exports.isErrorLike = exports.Process = exports.WEBDRIVER_BIDI_WEBSOCKET_ENDPOINT_REGEX = exports.CDP_WEBSOCKET_ENDPOINT_REGEX = exports.launch = exports.computeSystemExecutablePath = exports.computeExecutablePath = void 0;
const child_process_1 = __importDefault(require("child_process"));
const fs_1 = require("fs");
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const readline_1 = __importDefault(require("readline"));
const browser_data_js_1 = require("./browser-data/browser-data.js");
const Cache_js_1 = require("./Cache.js");
const debug_js_1 = require("./debug.js");
const detectPlatform_js_1 = require("./detectPlatform.js");
const debugLaunch = (0, debug_js_1.debug)('puppeteer:browsers:launcher');
/**
 * @public
 */
function computeExecutablePath(options) {
    options.platform ??= (0, detectPlatform_js_1.detectBrowserPlatform)();
    if (!options.platform) {
        throw new Error(`Cannot download a binary for the provided platform: ${os_1.default.platform()} (${os_1.default.arch()})`);
    }
    const installationDir = new Cache_js_1.Cache(options.cacheDir).installationDir(options.browser, options.platform, options.buildId);
    return path_1.default.join(installationDir, browser_data_js_1.executablePathByBrowser[options.browser](options.platform, options.buildId));
}
exports.computeExecutablePath = computeExecutablePath;
/**
 * @public
 */
function computeSystemExecutablePath(options) {
    options.platform ??= (0, detectPlatform_js_1.detectBrowserPlatform)();
    if (!options.platform) {
        throw new Error(`Cannot download a binary for the provided platform: ${os_1.default.platform()} (${os_1.default.arch()})`);
    }
    const path = (0, browser_data_js_1.resolveSystemExecutablePath)(options.browser, options.platform, options.channel);
    try {
        (0, fs_1.accessSync)(path);
    }
    catch (error) {
        throw new Error(`Could not find Google Chrome executable for channel '${options.channel}' at '${path}'.`);
    }
    return path;
}
exports.computeSystemExecutablePath = computeSystemExecutablePath;
/**
 * @public
 */
function launch(opts) {
    return new Process(opts);
}
exports.launch = launch;
/**
 * @public
 */
exports.CDP_WEBSOCKET_ENDPOINT_REGEX = /^DevTools listening on (ws:\/\/.*)$/;
/**
 * @public
 */
exports.WEBDRIVER_BIDI_WEBSOCKET_ENDPOINT_REGEX = /^WebDriver BiDi listening on (ws:\/\/.*)$/;
/**
 * @public
 */
class Process {
    constructor(opts) {
        _Process_instances.add(this);
        _Process_executablePath.set(this, void 0);
        _Process_args.set(this, void 0);
        _Process_browserProcess.set(this, void 0);
        _Process_exited.set(this, false);
        // The browser process can be closed externally or from the driver process. We
        // need to invoke the hooks only once though but we don't know how many times
        // we will be invoked.
        _Process_hooksRan.set(this, false);
        _Process_onExitHook.set(this, async () => { });
        _Process_browserProcessExiting.set(this, void 0);
        _Process_onDriverProcessExit.set(this, (_code) => {
            this.kill();
        });
        _Process_onDriverProcessSignal.set(this, (signal) => {
            switch (signal) {
                case 'SIGINT':
                    this.kill();
                    process.exit(130);
                case 'SIGTERM':
                case 'SIGHUP':
                    void this.close();
                    break;
            }
        });
        __classPrivateFieldSet(this, _Process_executablePath, opts.executablePath, "f");
        __classPrivateFieldSet(this, _Process_args, opts.args ?? [], "f");
        opts.pipe ??= false;
        opts.dumpio ??= false;
        opts.handleSIGINT ??= true;
        opts.handleSIGTERM ??= true;
        opts.handleSIGHUP ??= true;
        // On non-windows platforms, `detached: true` makes child process a
        // leader of a new process group, making it possible to kill child
        // process tree with `.kill(-pid)` command. @see
        // https://nodejs.org/api/child_process.html#child_process_options_detached
        opts.detached ??= process.platform !== 'win32';
        const stdio = __classPrivateFieldGet(this, _Process_instances, "m", _Process_configureStdio).call(this, {
            pipe: opts.pipe,
            dumpio: opts.dumpio,
        });
        debugLaunch(`Launching ${__classPrivateFieldGet(this, _Process_executablePath, "f")} ${__classPrivateFieldGet(this, _Process_args, "f").join(' ')}`, {
            detached: opts.detached,
            env: opts.env,
            stdio,
        });
        __classPrivateFieldSet(this, _Process_browserProcess, child_process_1.default.spawn(__classPrivateFieldGet(this, _Process_executablePath, "f"), __classPrivateFieldGet(this, _Process_args, "f"), {
            detached: opts.detached,
            env: opts.env,
            stdio,
        }), "f");
        debugLaunch(`Launched ${__classPrivateFieldGet(this, _Process_browserProcess, "f").pid}`);
        if (opts.dumpio) {
            __classPrivateFieldGet(this, _Process_browserProcess, "f").stderr?.pipe(process.stderr);
            __classPrivateFieldGet(this, _Process_browserProcess, "f").stdout?.pipe(process.stdout);
        }
        process.on('exit', __classPrivateFieldGet(this, _Process_onDriverProcessExit, "f"));
        if (opts.handleSIGINT) {
            process.on('SIGINT', __classPrivateFieldGet(this, _Process_onDriverProcessSignal, "f"));
        }
        if (opts.handleSIGTERM) {
            process.on('SIGTERM', __classPrivateFieldGet(this, _Process_onDriverProcessSignal, "f"));
        }
        if (opts.handleSIGHUP) {
            process.on('SIGHUP', __classPrivateFieldGet(this, _Process_onDriverProcessSignal, "f"));
        }
        if (opts.onExit) {
            __classPrivateFieldSet(this, _Process_onExitHook, opts.onExit, "f");
        }
        __classPrivateFieldSet(this, _Process_browserProcessExiting, new Promise((resolve, reject) => {
            __classPrivateFieldGet(this, _Process_browserProcess, "f").once('exit', async () => {
                debugLaunch(`Browser process ${__classPrivateFieldGet(this, _Process_browserProcess, "f").pid} onExit`);
                __classPrivateFieldGet(this, _Process_instances, "m", _Process_clearListeners).call(this);
                __classPrivateFieldSet(this, _Process_exited, true, "f");
                try {
                    await __classPrivateFieldGet(this, _Process_instances, "m", _Process_runHooks).call(this);
                }
                catch (err) {
                    reject(err);
                    return;
                }
                resolve();
            });
        }), "f");
    }
    get nodeProcess() {
        return __classPrivateFieldGet(this, _Process_browserProcess, "f");
    }
    async close() {
        await __classPrivateFieldGet(this, _Process_instances, "m", _Process_runHooks).call(this);
        if (!__classPrivateFieldGet(this, _Process_exited, "f")) {
            this.kill();
        }
        return __classPrivateFieldGet(this, _Process_browserProcessExiting, "f");
    }
    hasClosed() {
        return __classPrivateFieldGet(this, _Process_browserProcessExiting, "f");
    }
    kill() {
        debugLaunch(`Trying to kill ${__classPrivateFieldGet(this, _Process_browserProcess, "f").pid}`);
        // If the process failed to launch (for example if the browser executable path
        // is invalid), then the process does not get a pid assigned. A call to
        // `proc.kill` would error, as the `pid` to-be-killed can not be found.
        if (__classPrivateFieldGet(this, _Process_browserProcess, "f") &&
            __classPrivateFieldGet(this, _Process_browserProcess, "f").pid &&
            pidExists(__classPrivateFieldGet(this, _Process_browserProcess, "f").pid)) {
            try {
                debugLaunch(`Browser process ${__classPrivateFieldGet(this, _Process_browserProcess, "f").pid} exists`);
                if (process.platform === 'win32') {
                    try {
                        child_process_1.default.execSync(`taskkill /pid ${__classPrivateFieldGet(this, _Process_browserProcess, "f").pid} /T /F`);
                    }
                    catch (error) {
                        debugLaunch(`Killing ${__classPrivateFieldGet(this, _Process_browserProcess, "f").pid} using taskkill failed`, error);
                        // taskkill can fail to kill the process e.g. due to missing permissions.
                        // Let's kill the process via Node API. This delays killing of all child
                        // processes of `this.proc` until the main Node.js process dies.
                        __classPrivateFieldGet(this, _Process_browserProcess, "f").kill();
                    }
                }
                else {
                    // on linux the process group can be killed with the group id prefixed with
                    // a minus sign. The process group id is the group leader's pid.
                    const processGroupId = -__classPrivateFieldGet(this, _Process_browserProcess, "f").pid;
                    try {
                        process.kill(processGroupId, 'SIGKILL');
                    }
                    catch (error) {
                        debugLaunch(`Killing ${__classPrivateFieldGet(this, _Process_browserProcess, "f").pid} using process.kill failed`, error);
                        // Killing the process group can fail due e.g. to missing permissions.
                        // Let's kill the process via Node API. This delays killing of all child
                        // processes of `this.proc` until the main Node.js process dies.
                        __classPrivateFieldGet(this, _Process_browserProcess, "f").kill('SIGKILL');
                    }
                }
            }
            catch (error) {
                throw new Error(`${PROCESS_ERROR_EXPLANATION}\nError cause: ${isErrorLike(error) ? error.stack : error}`);
            }
        }
        __classPrivateFieldGet(this, _Process_instances, "m", _Process_clearListeners).call(this);
    }
    waitForLineOutput(regex, timeout) {
        if (!__classPrivateFieldGet(this, _Process_browserProcess, "f").stderr) {
            throw new Error('`browserProcess` does not have stderr.');
        }
        const rl = readline_1.default.createInterface(__classPrivateFieldGet(this, _Process_browserProcess, "f").stderr);
        let stderr = '';
        return new Promise((resolve, reject) => {
            rl.on('line', onLine);
            rl.on('close', onClose);
            __classPrivateFieldGet(this, _Process_browserProcess, "f").on('exit', onClose);
            __classPrivateFieldGet(this, _Process_browserProcess, "f").on('error', onClose);
            const timeoutId = timeout ? setTimeout(onTimeout, timeout) : 0;
            const cleanup = () => {
                if (timeoutId) {
                    clearTimeout(timeoutId);
                }
                rl.off('line', onLine);
                rl.off('close', onClose);
                __classPrivateFieldGet(this, _Process_browserProcess, "f").off('exit', onClose);
                __classPrivateFieldGet(this, _Process_browserProcess, "f").off('error', onClose);
            };
            function onClose(error) {
                cleanup();
                reject(new Error([
                    `Failed to launch the browser process!${error ? ' ' + error.message : ''}`,
                    stderr,
                    '',
                    'TROUBLESHOOTING: https://pptr.dev/troubleshooting',
                    '',
                ].join('\n')));
            }
            function onTimeout() {
                cleanup();
                reject(new TimeoutError(`Timed out after ${timeout} ms while waiting for the WS endpoint URL to appear in stdout!`));
            }
            function onLine(line) {
                stderr += line + '\n';
                const match = line.match(regex);
                if (!match) {
                    return;
                }
                cleanup();
                // The RegExp matches, so this will obviously exist.
                resolve(match[1]);
            }
        });
    }
}
exports.Process = Process;
_Process_executablePath = new WeakMap(), _Process_args = new WeakMap(), _Process_browserProcess = new WeakMap(), _Process_exited = new WeakMap(), _Process_hooksRan = new WeakMap(), _Process_onExitHook = new WeakMap(), _Process_browserProcessExiting = new WeakMap(), _Process_onDriverProcessExit = new WeakMap(), _Process_onDriverProcessSignal = new WeakMap(), _Process_instances = new WeakSet(), _Process_runHooks = async function _Process_runHooks() {
    if (__classPrivateFieldGet(this, _Process_hooksRan, "f")) {
        return;
    }
    __classPrivateFieldSet(this, _Process_hooksRan, true, "f");
    await __classPrivateFieldGet(this, _Process_onExitHook, "f").call(this);
}, _Process_configureStdio = function _Process_configureStdio(opts) {
    if (opts.pipe) {
        if (opts.dumpio) {
            return ['ignore', 'pipe', 'pipe', 'pipe', 'pipe'];
        }
        else {
            return ['ignore', 'ignore', 'ignore', 'pipe', 'pipe'];
        }
    }
    else {
        if (opts.dumpio) {
            return ['pipe', 'pipe', 'pipe'];
        }
        else {
            return ['pipe', 'ignore', 'pipe'];
        }
    }
}, _Process_clearListeners = function _Process_clearListeners() {
    process.off('exit', __classPrivateFieldGet(this, _Process_onDriverProcessExit, "f"));
    process.off('SIGINT', __classPrivateFieldGet(this, _Process_onDriverProcessSignal, "f"));
    process.off('SIGTERM', __classPrivateFieldGet(this, _Process_onDriverProcessSignal, "f"));
    process.off('SIGHUP', __classPrivateFieldGet(this, _Process_onDriverProcessSignal, "f"));
};
const PROCESS_ERROR_EXPLANATION = `Puppeteer was unable to kill the process which ran the browser binary.
This means that, on future Puppeteer launches, Puppeteer might not be able to launch the browser.
Please check your open processes and ensure that the browser processes that Puppeteer launched have been killed.
If you think this is a bug, please report it on the Puppeteer issue tracker.`;
/**
 * @internal
 */
function pidExists(pid) {
    try {
        return process.kill(pid, 0);
    }
    catch (error) {
        if (isErrnoException(error)) {
            if (error.code && error.code === 'ESRCH') {
                return false;
            }
        }
        throw error;
    }
}
/**
 * @internal
 */
function isErrorLike(obj) {
    return (typeof obj === 'object' && obj !== null && 'name' in obj && 'message' in obj);
}
exports.isErrorLike = isErrorLike;
/**
 * @internal
 */
function isErrnoException(obj) {
    return (isErrorLike(obj) &&
        ('errno' in obj || 'code' in obj || 'path' in obj || 'syscall' in obj));
}
exports.isErrnoException = isErrnoException;
/**
 * @public
 */
class TimeoutError extends Error {
    /**
     * @internal
     */
    constructor(message) {
        super(message);
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.TimeoutError = TimeoutError;
//# sourceMappingURL=launch.js.map