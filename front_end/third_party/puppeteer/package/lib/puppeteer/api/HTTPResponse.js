/**
 * @license
 * Copyright 2023 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
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
     * True if the response was successful (status in the range 200-299).
     */
    ok() {
        // TODO: document === 0 case?
        const status = this.status();
        return status === 0 || (status >= 200 && status <= 299);
    }
    /**
     * {@inheritDoc HTTPResponse.content}
     */
    async buffer() {
        const content = await this.content();
        return Buffer.from(content);
    }
    /**
     * Promise which resolves to a text (utf8) representation of response body.
     *
     * @remarks
     *
     * This method will throw if the content is not utf-8 string
     */
    async text() {
        const content = await this.content();
        return new TextDecoder('utf-8', { fatal: true }).decode(content);
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
     * Converts the response to a Fetch API Response instance.
     *
     * @remarks
     *
     * Headers are copied to the new Response instance, with multi-line
     * `set-cookie` headers parsed into individual header entries.
     * For responses with null body statuses (101, 204, 205, 304), the body is
     * omitted.
     *
     * @returns A promise which resolves to a Fetch API Response object.
     */
    async asFetchResponse() {
        const headers = new Headers();
        for (const [key, value] of Object.entries(this.headers())) {
            if (key === 'set-cookie') {
                for (const cookie of value.split('\n')) {
                    const trimmed = cookie.trim();
                    if (trimmed) {
                        headers.append(key, trimmed);
                    }
                }
            }
            else {
                headers.append(key, value);
            }
        }
        const status = this.status();
        const isNullBodyStatus = status === 101 || status === 204 || status === 205 || status === 304;
        const body = isNullBodyStatus
            ? null
            : (await this.content());
        return new Response(body, {
            status,
            statusText: this.statusText(),
            headers,
        });
    }
}
//# sourceMappingURL=HTTPResponse.js.map