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
import { Protocol } from 'devtools-protocol';
import type { Browser } from '../api/Browser.js';
import type { BrowserContext } from '../api/BrowserContext.js';
import { Frame } from '../api/Frame.js';
import { HTTPRequest } from '../api/HTTPRequest.js';
import { HTTPResponse } from '../api/HTTPResponse.js';
import { JSHandle } from '../api/JSHandle.js';
import { GeolocationOptions, MediaFeature, Metrics, NewDocumentScriptEvaluation, Page, ScreenshotOptions, WaitForOptions, WaitTimeoutOptions } from '../api/Page.js';
import { Accessibility } from './Accessibility.js';
import { CDPSession } from './Connection.js';
import { Coverage } from './Coverage.js';
import { DeviceRequestPrompt } from './DeviceRequestPrompt.js';
import { FileChooser } from './FileChooser.js';
import { CDPKeyboard, CDPMouse, CDPTouchscreen } from './Input.js';
import { Credentials, NetworkConditions } from './NetworkManager.js';
import { PDFOptions } from './PDFOptions.js';
import { Viewport } from './PuppeteerViewport.js';
import { CDPTarget } from './Target.js';
import { TaskQueue } from './TaskQueue.js';
import { Tracing } from './Tracing.js';
import { EvaluateFunc, HandleFor } from './types.js';
import { WebWorker } from './WebWorker.js';
/**
 * @internal
 */
export declare class CDPPage extends Page {
    #private;
    /**
     * @internal
     */
    static _create(client: CDPSession, target: CDPTarget, ignoreHTTPSErrors: boolean, defaultViewport: Viewport | null, screenshotTaskQueue: TaskQueue): Promise<CDPPage>;
    /**
     * @internal
     */
    constructor(client: CDPSession, target: CDPTarget, ignoreHTTPSErrors: boolean, screenshotTaskQueue: TaskQueue);
    /**
     * @internal
     */
    _client(): CDPSession;
    isServiceWorkerBypassed(): boolean;
    isDragInterceptionEnabled(): boolean;
    isJavaScriptEnabled(): boolean;
    waitForFileChooser(options?: WaitTimeoutOptions): Promise<FileChooser>;
    setGeolocation(options: GeolocationOptions): Promise<void>;
    target(): CDPTarget;
    browser(): Browser;
    browserContext(): BrowserContext;
    mainFrame(): Frame;
    get keyboard(): CDPKeyboard;
    get touchscreen(): CDPTouchscreen;
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
    evaluateHandle<Params extends unknown[], Func extends EvaluateFunc<Params> = EvaluateFunc<Params>>(pageFunction: Func | string, ...args: Params): Promise<HandleFor<Awaited<ReturnType<Func>>>>;
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
    url(): string;
    content(): Promise<string>;
    setContent(html: string, options?: WaitForOptions): Promise<void>;
    goto(url: string, options?: WaitForOptions & {
        referer?: string;
        referrerPolicy?: string;
    }): Promise<HTTPResponse | null>;
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
    evaluate<Params extends unknown[], Func extends EvaluateFunc<Params> = EvaluateFunc<Params>>(pageFunction: Func | string, ...args: Params): Promise<Awaited<ReturnType<Func>>>;
    evaluateOnNewDocument<Params extends unknown[], Func extends (...args: Params) => unknown = (...args: Params) => unknown>(pageFunction: Func | string, ...args: Params): Promise<NewDocumentScriptEvaluation>;
    removeScriptToEvaluateOnNewDocument(identifier: string): Promise<void>;
    setCacheEnabled(enabled?: boolean): Promise<void>;
    screenshot(options: ScreenshotOptions & {
        encoding: 'base64';
    }): Promise<string>;
    screenshot(options?: ScreenshotOptions & {
        encoding?: 'binary';
    }): Promise<Buffer>;
    createPDFStream(options?: PDFOptions): Promise<Readable>;
    pdf(options?: PDFOptions): Promise<Buffer>;
    title(): Promise<string>;
    close(options?: {
        runBeforeUnload?: boolean;
    }): Promise<void>;
    isClosed(): boolean;
    get mouse(): CDPMouse;
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