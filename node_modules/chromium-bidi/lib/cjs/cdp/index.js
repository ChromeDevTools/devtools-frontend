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
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketTransport = exports.CdpConnection = exports.CdpClient = void 0;
var cdpClient_js_1 = require("./cdpClient.js");
Object.defineProperty(exports, "CdpClient", { enumerable: true, get: function () { return cdpClient_js_1.CdpClient; } });
var cdpConnection_js_1 = require("./cdpConnection.js");
Object.defineProperty(exports, "CdpConnection", { enumerable: true, get: function () { return cdpConnection_js_1.CdpConnection; } });
var websocketTransport_js_1 = require("../utils/websocketTransport.js");
Object.defineProperty(exports, "WebSocketTransport", { enumerable: true, get: function () { return websocketTransport_js_1.WebSocketTransport; } });
//# sourceMappingURL=index.js.map