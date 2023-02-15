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
Object.defineProperty(exports, "__esModule", { value: true });
exports.releaseReference = exports.debugError = void 0;
const Debug_js_1 = require("../Debug.js");
/**
 * @internal
 */
exports.debugError = (0, Debug_js_1.debug)('puppeteer:error');
/**
 * @internal
 */
async function releaseReference(client, remoteReference) {
    if (!remoteReference.handle) {
        return;
    }
    await client
        .send('script.disown', {
        target: { realm: '', context: '' },
        handles: [remoteReference.handle],
    })
        .catch((error) => {
        // Exceptions might happen in case of a page been navigated or closed.
        // Swallow these since they are harmless and we don't leak anything in this case.
        (0, exports.debugError)(error);
    });
}
exports.releaseReference = releaseReference;
//# sourceMappingURL=utils.js.map