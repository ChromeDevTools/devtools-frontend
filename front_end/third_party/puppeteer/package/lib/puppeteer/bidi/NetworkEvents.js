/**
 * @license
 * Copyright 2026 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
// Network events are emitted on the page first, then on its browser context
// and finally on the browser.
/**
 * @internal
 */
export function emitRequest(page, request) {
    page.trustedEmitter.emit("request" /* PageEvent.Request */, request);
    page
        .browserContext()
        .trustedEmitter.emit("request" /* BrowserContextEvent.Request */, request);
    page.browser().trustedEmitter.emit("request" /* BrowserEvent.Request */, request);
}
/**
 * @internal
 */
export function emitRequestServedFromCache(page, request) {
    page.trustedEmitter.emit("requestservedfromcache" /* PageEvent.RequestServedFromCache */, request);
    page
        .browserContext()
        .trustedEmitter.emit("requestservedfromcache" /* BrowserContextEvent.RequestServedFromCache */, request);
    page
        .browser()
        .trustedEmitter.emit("requestservedfromcache" /* BrowserEvent.RequestServedFromCache */, request);
}
/**
 * @internal
 */
export function emitResponse(page, response) {
    page.trustedEmitter.emit("response" /* PageEvent.Response */, response);
    page
        .browserContext()
        .trustedEmitter.emit("response" /* BrowserContextEvent.Response */, response);
    page.browser().trustedEmitter.emit("response" /* BrowserEvent.Response */, response);
}
/**
 * @internal
 */
export function emitRequestFinished(page, request) {
    page.trustedEmitter.emit("requestfinished" /* PageEvent.RequestFinished */, request);
    page
        .browserContext()
        .trustedEmitter.emit("requestfinished" /* BrowserContextEvent.RequestFinished */, request);
    page.browser().trustedEmitter.emit("requestfinished" /* BrowserEvent.RequestFinished */, request);
}
/**
 * @internal
 */
export function emitRequestFailed(page, request) {
    page.trustedEmitter.emit("requestfailed" /* PageEvent.RequestFailed */, request);
    page
        .browserContext()
        .trustedEmitter.emit("requestfailed" /* BrowserContextEvent.RequestFailed */, request);
    page.browser().trustedEmitter.emit("requestfailed" /* BrowserEvent.RequestFailed */, request);
}
//# sourceMappingURL=NetworkEvents.js.map