/**
 * Copyright 2017 Google Inc. All rights reserved.
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
/// <reference types="node" />
/// <reference types="node" />
import type { Readable } from 'stream';
import { type Protocol } from 'devtools-protocol';
import type { Browser } from '../api/Browser.js';
import type { BrowserContext } from '../api/BrowserContext.js';
import { type CDPSession } from '../api/CDPSession.js';
import { type Frame, type WaitForOptions } from '../api/Frame.js';
import { type HTTPRequest } from '../api/HTTPRequest.js';
import { type HTTPResponse } from '../api/HTTPResponse.js';
import { type JSHandle } from '../api/JSHandle.js';
import { Page, type GeolocationOptions, type MediaFeature, type Metrics, type NewDocumentScriptEvaluation, type ScreenshotOptions, type WaitTimeoutOptions } from '../api/Page.js';
import { FileChooser } from '../common/FileChooser.js';
import { type PDFOptions } from '../common/PDFOptions.js';
import { type Viewport } from '../common/Viewport.js';
import { Accessibility } from './Accessibility.js';
import { Coverage } from './Coverage.js';
import { type DeviceRequestPrompt } from './DeviceRequestPrompt.js';
import { type CdpFrame } from './Frame.js';
import { CdpKeyboard, CdpMouse, CdpTouchscreen } from './Input.js';
import { type Credentials, type NetworkConditions } from './NetworkManager.js';
import { type CdpTarget } from './Target.js';
import { Tracing } from './Tracing.js';
import { WebWorker } from './WebWorker.js';
/**
 * @internal
 */
export declare class CdpPage extends Page {
    #private;
    static _create(client: CDPSession, target: CdpTarget, ignoreHTTPSErrors: boolean, defaultViewport: Viewport | null): Promise<CdpPage>;
    constructor(client: CDPSession, target: CdpTarget, ignoreHTTPSErrors: boolean);
    _client(): CDPSession;
    isServiceWorkerBypassed(): boolean;
    isDragInterceptionEnabled(): boolean;
    isJavaScriptEnabled(): boolean;
    waitForFileChooser(options?: WaitTimeoutOptions): Promise<FileChooser>;
    setGeolocation(options: GeolocationOptions): Promise<void>;
    target(): CdpTarget;
    browser(): Browser;
    browserContext(): BrowserContext;
    mainFrame(): CdpFrame;
    get keyboard(): CdpKeyboard;
    get touchscreen(): CdpTouchscreen;
    get coverage(): Coverage;
    get tracing(): Tracing;
    get accessibility(): Accessibility;
    frames(): Frame[];
    workers(): WebWorker[];
    setRequestInterception(value: boolean): Promise<void>;
    setBypassServiceWorker(bypass: boolean): Promise<void>;
    setDragInterception(enabled: boolean): Promise<void>;
    setOfflineMode(enabled: boolean): Promise<void>;
    emulateNetworkConditions(networkConditions: NetworkConditions | null): Promise<void>;
    setDefaultNavigationTimeout(timeout: number): void;
    setDefaultTimeout(timeout: number): void;
    getDefaultTimeout(): number;
    queryObjects<Prototype>(prototypeHandle: JSHandle<Prototype>): Promise<JSHandle<Prototype[]>>;
    cookies(...urls: string[]): Promise<Protocol.Network.Cookie[]>;
    deleteCookie(...cookies: Protocol.Network.DeleteCookiesRequest[]): Promise<void>;
    setCookie(...cookies: Protocol.Network.CookieParam[]): Promise<void>;
    exposeFunction(name: string, pptrFunction: Function | {
        default: Function;
    }): Promise<void>;
    removeExposedFunction(name: string): Promise<void>;
    authenticate(credentials: Credentials): Promise<void>;
    setExtraHTTPHeaders(headers: Record<string, string>): Promise<void>;
    setUserAgent(userAgent: string, userAgentMetadata?: Protocol.Emulation.UserAgentMetadata): Promise<void>;
    metrics(): Promise<Metrics>;
    reload(options?: WaitForOptions): Promise<HTTPResponse | null>;
    createCDPSession(): Promise<CDPSession>;
    waitForRequest(urlOrPredicate: string | ((req: HTTPRequest) => boolean | Promise<boolean>), options?: {
        timeout?: number;
    }): Promise<HTTPRequest>;
    waitForResponse(urlOrPredicate: string | ((res: HTTPResponse) => boolean | Promise<boolean>), options?: {
        timeout?: number;
    }): Promise<HTTPResponse>;
    waitForNetworkIdle(options?: {
        idleTime?: number;
        timeout?: number;
    }): Promise<void>;
    goBack(options?: WaitForOptions): Promise<HTTPResponse | null>;
    goForward(options?: WaitForOptions): Promise<HTTPResponse | null>;
    bringToFront(): Promise<void>;
    setJavaScriptEnabled(enabled: boolean): Promise<void>;
    setBypassCSP(enabled: boolean): Promise<void>;
    emulateMediaType(type?: string): Promise<void>;
    emulateCPUThrottling(factor: number | null): Promise<void>;
    emulateMediaFeatures(features?: MediaFeature[]): Promise<void>;
    emulateTimezone(timezoneId?: string): Promise<void>;
    emulateIdleState(overrides?: {
        isUserActive: boolean;
        isScreenUnlocked: boolean;
    }): Promise<void>;
    emulateVisionDeficiency(type?: Protocol.Emulation.SetEmulatedVisionDeficiencyRequest['type']): Promise<void>;
    setViewport(viewport: Viewport): Promise<void>;
    viewport(): Viewport | null;
    evaluateOnNewDocument<Params extends unknown[], Func extends (...args: Params) => unknown = (...args: Params) => unknown>(pageFunction: Func | string, ...args: Params): Promise<NewDocumentScriptEvaluation>;
    removeScriptToEvaluateOnNewDocument(identifier: string): Promise<void>;
    setCacheEnabled(enabled?: boolean): Promise<void>;
    _screenshot(options: Readonly<ScreenshotOptions>): Promise<string>;
    createPDFStream(options?: PDFOptions): Promise<Readable>;
    pdf(options?: PDFOptions): Promise<Buffer>;
    close(options?: {
        runBeforeUnload?: boolean;
    }): Promise<void>;
    isClosed(): boolean;
    get mouse(): CdpMouse;
    /**
     * This method is typically coupled with an action that triggers a device
     * request from an api such as WebBluetooth.
     *
     * :::caution
     *
     * This must be called before the device request is made. It will not return a
     * currently active device prompt.
     *
     * :::
     *
     * @example
     *
     * ```ts
     * const [devicePrompt] = Promise.all([
     *   page.waitForDevicePrompt(),
     *   page.click('#connect-bluetooth'),
     * ]);
     * await devicePrompt.select(
     *   await devicePrompt.waitForDevice(({name}) => name.includes('My Device'))
     * );
     * ```
     */
    waitForDevicePrompt(options?: WaitTimeoutOptions): Promise<DeviceRequestPrompt>;
}
//# sourceMappingURL=Page.d.ts.map