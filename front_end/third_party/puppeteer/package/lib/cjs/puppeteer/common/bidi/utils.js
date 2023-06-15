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
exports.createEvaluationError = exports.releaseReference = exports.debugError = void 0;
const Debug_js_1 = require("../Debug.js");
const util_js_1 = require("../util.js");
const Serializer_js_1 = require("./Serializer.js");
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
    await client.connection
        .send('script.disown', {
        target: { context: client.id },
        handles: [remoteReference.handle],
    })
        .catch((error) => {
        // Exceptions might happen in case of a page been navigated or closed.
        // Swallow these since they are harmless and we don't leak anything in this case.
        (0, exports.debugError)(error);
    });
}
exports.releaseReference = releaseReference;
/**
 * @internal
 */
function createEvaluationError(details) {
    if (details.exception.type !== 'error') {
        return Serializer_js_1.BidiSerializer.deserialize(details.exception);
    }
    const [name = '', ...parts] = details.text.split(': ');
    const message = parts.join(': ');
    const error = new Error(message);
    error.name = name;
    // The first line is this function which we ignore.
    const stackLines = [];
    if (details.stackTrace && stackLines.length < Error.stackTraceLimit) {
        for (const frame of details.stackTrace.callFrames.reverse()) {
            if (util_js_1.PuppeteerURL.isPuppeteerURL(frame.url) &&
                frame.url !== util_js_1.PuppeteerURL.INTERNAL_URL) {
                const url = util_js_1.PuppeteerURL.parse(frame.url);
                stackLines.unshift(`    at ${frame.functionName || url.functionName} (${url.functionName} at ${url.siteString}, <anonymous>:${frame.lineNumber}:${frame.columnNumber})`);
            }
            else {
                stackLines.push(`    at ${frame.functionName || '<anonymous>'} (${frame.url}:${frame.lineNumber}:${frame.columnNumber})`);
            }
            if (stackLines.length >= Error.stackTraceLimit) {
                break;
            }
        }
    }
    error.stack = [details.text, ...stackLines].join('\n');
    return error;
}
exports.createEvaluationError = createEvaluationError;
//# sourceMappingURL=utils.js.map