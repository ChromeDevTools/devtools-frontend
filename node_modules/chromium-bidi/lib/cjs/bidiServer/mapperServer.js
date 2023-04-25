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
exports.MapperServer = void 0;
const ws_1 = __importDefault(require("ws"));
const debug_1 = __importDefault(require("debug"));
const index_js_1 = require("../cdp/index.js");
const log_js_1 = require("../utils/log.js");
const debugInternal = (0, debug_1.default)('bidiMapper:internal');
const debugLog = (0, debug_1.default)('bidiMapper:log');
const mapperDebugLogOthers = (0, debug_1.default)('bidiMapper:mapperDebug:others');
const bidiMapperMapperDebugPrefix = 'bidiMapper:mapperDebug:';
class MapperServer {
    #handlers = [];
    #cdpConnection;
    #mapperCdpClient;
    static async create(cdpUrl, mapperContent, verbose) {
        const cdpConnection = await this.#establishCdpConnection(cdpUrl);
        try {
            const mapperCdpClient = await this.#initMapper(cdpConnection, mapperContent, verbose);
            return new MapperServer(cdpConnection, mapperCdpClient);
        }
        catch (e) {
            cdpConnection.close();
            throw e;
        }
    }
    constructor(cdpConnection, mapperCdpClient) {
        this.#cdpConnection = cdpConnection;
        this.#mapperCdpClient = mapperCdpClient;
        this.#mapperCdpClient.on('Runtime.bindingCalled', this.#onBindingCalled);
        this.#mapperCdpClient.on('Runtime.consoleAPICalled', this.#onConsoleAPICalled);
        // Catch unhandled exceptions in the mapper.
        this.#mapperCdpClient.on('Runtime.exceptionThrown', this.#onRuntimeExceptionThrown);
    }
    setOnMessage(handler) {
        this.#handlers.push(handler);
    }
    sendMessage(messageJson) {
        return this.#sendBidiMessage(messageJson);
    }
    close() {
        this.#cdpConnection.close();
    }
    static #establishCdpConnection(cdpUrl) {
        return new Promise((resolve, reject) => {
            debugInternal('Establishing session with cdpUrl: ', cdpUrl);
            const ws = new ws_1.default(cdpUrl);
            ws.once('error', reject);
            ws.on('open', () => {
                debugInternal('Session established.');
                const transport = new index_js_1.WebSocketTransport(ws);
                const connection = new index_js_1.CdpConnection(transport);
                resolve(connection);
            });
        });
    }
    async #sendBidiMessage(bidiMessageJson) {
        await this.#mapperCdpClient.sendCommand('Runtime.evaluate', {
            expression: `onBidiMessage(${JSON.stringify(bidiMessageJson)})`,
        });
    }
    #onBidiMessage(bidiMessage) {
        for (const handler of this.#handlers)
            handler(bidiMessage);
    }
    #onBindingCalled = (params) => {
        if (params.name === 'sendBidiResponse') {
            this.#onBidiMessage(params.payload);
        }
        if (params.name === 'sendDebugMessage') {
            this.#onDebugMessage(params.payload);
        }
    };
    #onDebugMessage = (debugMessageStr) => {
        try {
            const debugMessage = JSON.parse(debugMessageStr);
            // BiDi traffic is logged in `bidiServer:SEND ▸`
            if (debugMessage.logType === log_js_1.LogType.bidi) {
                return;
            }
            if (debugMessage.logType !== undefined &&
                debugMessage.messages !== undefined) {
                (0, debug_1.default)(bidiMapperMapperDebugPrefix + debugMessage.logType)(
                // No formatter is needed as the messages will be formatted
                // automatically.
                '', ...debugMessage.messages);
                return;
            }
        }
        catch { }
        // Fall back to raw log in case of unknown
        mapperDebugLogOthers(debugMessageStr);
    };
    #onConsoleAPICalled = (params) => {
        debugLog('consoleAPICalled %s %O', params.type, params.args.map((arg) => arg.value));
    };
    #onRuntimeExceptionThrown = (params) => {
        debugLog('exceptionThrown', params);
    };
    static async #initMapper(cdpConnection, mapperContent, verbose) {
        debugInternal('Connection opened.');
        const browserClient = cdpConnection.browserClient();
        const { targetId } = await browserClient.sendCommand('Target.createTarget', {
            url: 'about:blank',
        });
        const { sessionId: mapperSessionId } = await browserClient.sendCommand('Target.attachToTarget', { targetId, flatten: true });
        const mapperCdpClient = cdpConnection.getCdpClient(mapperSessionId);
        await mapperCdpClient.sendCommand('Runtime.enable');
        await browserClient.sendCommand('Target.exposeDevToolsProtocol', {
            bindingName: 'cdp',
            targetId,
        });
        await mapperCdpClient.sendCommand('Runtime.addBinding', {
            name: 'sendBidiResponse',
        });
        if (verbose) {
            // Needed to request verbose logs from Mapper.
            await mapperCdpClient.sendCommand('Runtime.addBinding', {
                name: 'sendDebugMessage',
            });
        }
        const launchedPromise = new Promise((resolve, reject) => {
            const onBindingCalled = ({ name, payload, }) => {
                // Needed to check when Mapper is launched on the frontend.
                if (name === 'sendBidiResponse') {
                    try {
                        const parsed = JSON.parse(payload);
                        if (parsed.launched) {
                            mapperCdpClient.off('Runtime.bindingCalled', onBindingCalled);
                            resolve();
                        }
                    }
                    catch (e) {
                        reject(new Error('Could not parse initial bidi response as JSON'));
                    }
                }
            };
            mapperCdpClient.on('Runtime.bindingCalled', onBindingCalled);
        });
        await mapperCdpClient.sendCommand('Runtime.evaluate', {
            expression: mapperContent,
        });
        // Let Mapper know what is it's TargetId to filter out related targets.
        await mapperCdpClient.sendCommand('Runtime.evaluate', {
            expression: `window.setSelfTargetId(${JSON.stringify(targetId)})`,
        });
        await launchedPromise;
        debugInternal('Launched!');
        return mapperCdpClient;
    }
}
exports.MapperServer = MapperServer;
//# sourceMappingURL=mapperServer.js.map