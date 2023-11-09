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
exports.HTTPResponse = void 0;
/**
 * The HTTPResponse class represents responses which are received by the
 * {@link Page} class.
 *
 * @public
 */
class HTTPResponse {
    /**
     * @internal
     */
    constructor() { }
    /**
     * True if the response was successful (status in the range 200-299).
     */
    ok() {
        // TODO: document === 0 case?
        const status = this.status();
        return status === 0 || (status >= 200 && status <= 299);
    }
    /**
     * Promise which resolves to a text representation of response body.
     */
    async text() {
        const content = await this.buffer();
        return content.toString('utf8');
    }
    /**
     * Promise which resolves to a JSON representation of response body.
     *
     * @remarks
     *
     * This method will throw if the response body is not parsable via
     * `JSON.parse`.
     */
    async json() {
        const content = await this.text();
        return JSON.parse(content);
    }
}
exports.HTTPResponse = HTTPResponse;
//# sourceMappingURL=HTTPResponse.js.map