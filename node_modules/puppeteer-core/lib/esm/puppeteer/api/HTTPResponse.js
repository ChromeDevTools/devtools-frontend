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
/**
 * The HTTPResponse class represents responses which are received by the
 * {@link Page} class.
 *
 * @public
 */
export class HTTPResponse {
    /**
     * @internal
     */
    constructor() { }
    /**
     * @internal
     */
    _resolveBody(_err) {
        throw new Error('Not implemented');
    }
    /**
     * The IP address and port number used to connect to the remote
     * server.
     */
    remoteAddress() {
        throw new Error('Not implemented');
    }
    /**
     * The URL of the response.
     */
    url() {
        throw new Error('Not implemented');
    }
    /**
     * True if the response was successful (status in the range 200-299).
     */
    ok() {
        throw new Error('Not implemented');
    }
    /**
     * The status code of the response (e.g., 200 for a success).
     */
    status() {
        throw new Error('Not implemented');
    }
    /**
     * The status text of the response (e.g. usually an "OK" for a
     * success).
     */
    statusText() {
        throw new Error('Not implemented');
    }
    /**
     * An object with HTTP headers associated with the response. All
     * header names are lower-case.
     */
    headers() {
        throw new Error('Not implemented');
    }
    /**
     * {@link SecurityDetails} if the response was received over the
     * secure connection, or `null` otherwise.
     */
    securityDetails() {
        throw new Error('Not implemented');
    }
    /**
     * Timing information related to the response.
     */
    timing() {
        throw new Error('Not implemented');
    }
    /**
     * Promise which resolves to a buffer with response body.
     */
    buffer() {
        throw new Error('Not implemented');
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
    /**
     * A matching {@link HTTPRequest} object.
     */
    request() {
        throw new Error('Not implemented');
    }
    /**
     * True if the response was served from either the browser's disk
     * cache or memory cache.
     */
    fromCache() {
        throw new Error('Not implemented');
    }
    /**
     * True if the response was served by a service worker.
     */
    fromServiceWorker() {
        throw new Error('Not implemented');
    }
    /**
     * A {@link Frame} that initiated this response, or `null` if
     * navigating to error pages.
     */
    frame() {
        throw new Error('Not implemented');
    }
}
//# sourceMappingURL=HTTPResponse.js.map