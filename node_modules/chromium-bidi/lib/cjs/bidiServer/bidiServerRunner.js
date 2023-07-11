"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BidiServerRunner = exports.debugInfo = void 0;
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
const http_1 = __importDefault(require("http"));
const debug_1 = __importDefault(require("debug"));
const websocket_1 = __importDefault(require("websocket"));
exports.debugInfo = (0, debug_1.default)('bidi:server:info');
const debugInternal = (0, debug_1.default)('bidi:server:internal');
const debugSend = (0, debug_1.default)('bidi:server:SEND ▸');
const debugRecv = (0, debug_1.default)('bidi:server:RECV ◂');
function getHttpRequestPayload(request) {
    return new Promise((resolve, reject) => {
        let data = '';
        request.on('data', (chunk) => {
            data += chunk;
        });
        request.on('end', () => {
            resolve(data);
        });
        request.on('error', (error) => {
            reject(error);
        });
    });
}
class BidiServerRunner {
    /**
     *
     * @param bidiPort port to start ws server on
     * @param onNewBidiConnectionOpen delegate to be called for each new
     * connection. `onNewBidiConnectionOpen` delegate should return another
     * `onConnectionClose` delegate, which will be called after the connection is
     * closed.
     */
    run(bidiPort, onNewBidiConnectionOpen) {
        const server = http_1.default.createServer(async (request, response) => {
            debugInternal(`${new Date().toString()} Received ${request.method ?? 'UNKNOWN METHOD'} request for ${request.url ?? 'UNKNOWN URL'}`);
            if (!request.url)
                return response.end(404);
            // https://w3c.github.io/webdriver-bidi/#transport, step 2.
            if (request.url === '/session') {
                response.writeHead(200, {
                    'Content-Type': 'application/json;charset=utf-8',
                    'Cache-Control': 'no-cache',
                });
                response.write(JSON.stringify({
                    value: {
                        sessionId: '1',
                        capabilities: {
                            webSocketUrl: `ws://localhost:${bidiPort}`,
                        },
                    },
                }));
            }
            else if (request.url.startsWith('/session')) {
                debugInternal(`Unknown session command ${request.method ?? 'UNKNOWN METHOD'} request for ${request.url} with payload ${await getHttpRequestPayload(request)}. 200 returned.`);
                response.writeHead(200, {
                    'Content-Type': 'application/json;charset=utf-8',
                    'Cache-Control': 'no-cache',
                });
                response.write(JSON.stringify({
                    value: {},
                }));
            }
            else {
                debugInternal(`Unknown ${JSON.stringify(request.method)} request for ${JSON.stringify(request.url)} with payload ${JSON.stringify(await getHttpRequestPayload(request))}. 404 returned.`);
                response.writeHead(404);
            }
            return response.end();
        });
        server.listen(bidiPort, () => {
            (0, exports.debugInfo)('Server is listening on port', bidiPort);
        });
        const wsServer = new websocket_1.default.server({
            httpServer: server,
            autoAcceptConnections: false,
        });
        wsServer.on('request', async (request) => {
            debugInternal('new WS request received:', request.resourceURL.path);
            const bidiServer = new BidiServer();
            const onBidiConnectionClosed = await onNewBidiConnectionOpen(bidiServer);
            const connection = request.accept();
            connection.on('message', (message) => {
                // 1. If |type| is not text, return.
                if (message.type !== 'utf8') {
                    this.#respondWithError(connection, {}, 'invalid argument', `not supported type (${message.type})`);
                    return;
                }
                const plainCommandData = message.utf8Data;
                debugRecv(plainCommandData);
                bidiServer.onMessage(plainCommandData);
            });
            connection.on('close', () => {
                debugInternal(`${new Date().toString()} Peer ${connection.remoteAddress} disconnected.`);
                onBidiConnectionClosed();
            });
            bidiServer.initialize((messageStr) => {
                return this.#sendClientMessageStr(messageStr, connection);
            });
        });
    }
    #sendClientMessageStr(messageStr, connection) {
        debugSend(messageStr);
        connection.sendUTF(messageStr);
        return Promise.resolve();
    }
    #sendClientMessage(messageObj, connection) {
        const messageStr = JSON.stringify(messageObj);
        return this.#sendClientMessageStr(messageStr, connection);
    }
    #respondWithError(connection, plainCommandData, errorCode, errorMessage) {
        const errorResponse = this.#getErrorResponse(plainCommandData, errorCode, errorMessage);
        void this.#sendClientMessage(errorResponse, connection);
    }
    #getErrorResponse(plainCommandData, errorCode, errorMessage) {
        // XXX: this is bizarre per spec. We reparse the payload and
        // extract the ID, regardless of what kind of value it was.
        let commandId;
        try {
            const commandData = JSON.parse(plainCommandData);
            if ('id' in commandData) {
                commandId = commandData.id;
            }
        }
        catch { }
        return {
            id: commandId,
            error: errorCode,
            message: errorMessage,
            // XXX: optional stacktrace field.
        };
    }
}
exports.BidiServerRunner = BidiServerRunner;
class BidiServer {
    #handlers = [];
    #sendBidiMessage = null;
    setOnMessage(handler) {
        this.#handlers.push(handler);
    }
    sendMessage(message) {
        if (!this.#sendBidiMessage)
            throw new Error('BiDi connection is not initialised yet');
        return this.#sendBidiMessage(message);
    }
    close() {
        // Intentionally empty.
    }
    initialize(sendBidiMessage) {
        this.#sendBidiMessage = sendBidiMessage;
    }
    onMessage(messageStr) {
        for (const handler of this.#handlers)
            handler(messageStr);
    }
}
//# sourceMappingURL=bidiServerRunner.js.map