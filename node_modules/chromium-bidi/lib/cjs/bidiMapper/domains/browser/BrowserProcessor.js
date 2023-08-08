"use strict";
/**
 * Copyright 2023 Google LLC.
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
exports.BrowserProcessor = void 0;
class BrowserProcessor {
    #cdpConnection;
    constructor(cdpConnection) {
        this.#cdpConnection = cdpConnection;
    }
    close() {
        const client = this.#cdpConnection.browserClient();
        // Insure that its put at the last place in the event loop
        // That way we send back the response before closing in tab
        setTimeout(() => client.sendCommand('Browser.close'), 0);
        return {};
    }
}
exports.BrowserProcessor = BrowserProcessor;
//# sourceMappingURL=BrowserProcessor.js.map