"use strict";
/**
 * Copyright 2020 Google Inc. All rights reserved.
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
Object.defineProperty(exports, "__esModule", { value: true });
exports._connectToCdpBrowser = void 0;
const fetch_js_1 = require("../common/fetch.js");
const util_js_1 = require("../common/util.js");
const environment_js_1 = require("../environment.js");
const assert_js_1 = require("../util/assert.js");
const ErrorLike_js_1 = require("../util/ErrorLike.js");
const Browser_js_1 = require("./Browser.js");
const Connection_js_1 = require("./Connection.js");
const getWebSocketTransportClass = async () => {
    return environment_js_1.isNode
        ? (await Promise.resolve().then(() => __importStar(require('../node/NodeWebSocketTransport.js')))).NodeWebSocketTransport
        : (await Promise.resolve().then(() => __importStar(require('../common/BrowserWebSocketTransport.js'))))
            .BrowserWebSocketTransport;
};
/**
 * Users should never call this directly; it's called when calling
 * `puppeteer.connect`.
 *
 * @internal
 */
async function _connectToCdpBrowser(options) {
    const { browserWSEndpoint, browserURL, ignoreHTTPSErrors = false, defaultViewport = { width: 800, height: 600 }, transport, headers = {}, slowMo = 0, targetFilter, _isPageTarget: isPageTarget, protocolTimeout, } = options;
    (0, assert_js_1.assert)(Number(!!browserWSEndpoint) + Number(!!browserURL) + Number(!!transport) ===
        1, 'Exactly one of browserWSEndpoint, browserURL or transport must be passed to puppeteer.connect');
    let connection;
    if (transport) {
        connection = new Connection_js_1.Connection('', transport, slowMo, protocolTimeout);
    }
    else if (browserWSEndpoint) {
        const WebSocketClass = await getWebSocketTransportClass();
        const connectionTransport = await WebSocketClass.create(browserWSEndpoint, headers);
        connection = new Connection_js_1.Connection(browserWSEndpoint, connectionTransport, slowMo, protocolTimeout);
    }
    else if (browserURL) {
        const connectionURL = await getWSEndpoint(browserURL);
        const WebSocketClass = await getWebSocketTransportClass();
        const connectionTransport = await WebSocketClass.create(connectionURL);
        connection = new Connection_js_1.Connection(connectionURL, connectionTransport, slowMo, protocolTimeout);
    }
    const version = await connection.send('Browser.getVersion');
    const product = version.product.toLowerCase().includes('firefox')
        ? 'firefox'
        : 'chrome';
    const { browserContextIds } = await connection.send('Target.getBrowserContexts');
    const browser = await Browser_js_1.CdpBrowser._create(product || 'chrome', connection, browserContextIds, ignoreHTTPSErrors, defaultViewport, undefined, () => {
        return connection.send('Browser.close').catch(util_js_1.debugError);
    }, targetFilter, isPageTarget);
    return browser;
}
exports._connectToCdpBrowser = _connectToCdpBrowser;
async function getWSEndpoint(browserURL) {
    const endpointURL = new URL('/json/version', browserURL);
    const fetch = await (0, fetch_js_1.getFetch)();
    try {
        const result = await fetch(endpointURL.toString(), {
            method: 'GET',
        });
        if (!result.ok) {
            throw new Error(`HTTP ${result.statusText}`);
        }
        const data = await result.json();
        return data.webSocketDebuggerUrl;
    }
    catch (error) {
        if ((0, ErrorLike_js_1.isErrorLike)(error)) {
            error.message =
                `Failed to fetch browser webSocket URL from ${endpointURL}: ` +
                    error.message;
        }
        throw error;
    }
}
//# sourceMappingURL=BrowserConnector.js.map