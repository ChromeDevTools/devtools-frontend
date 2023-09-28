/**
 * Copyright 2022 Google Inc. All rights reserved.
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
import type Protocol from 'devtools-protocol';
import { type CDPSession } from '../api/CDPSession.js';
import { type WaitForOptions } from '../api/Frame.js';
import { Page, type GeolocationOptions, type MediaFeature, type NewDocumentScriptEvaluation, type ScreenshotOptions } from '../api/Page.js';
import { Accessibility } from '../cdp/Accessibility.js';
import { Coverage } from '../cdp/Coverage.js';
import { Tracing } from '../cdp/Tracing.js';
import { type PDFOptions } from '../common/PDFOptions.js';
import { type Awaitable } from '../common/types.js';
import { type Viewport } from '../common/Viewport.js';
import { type BidiBrowser } from './Browser.js';
import { type BidiBrowserContext } from './BrowserContext.js';
import { type BrowsingContext } from './BrowsingContext.js';
import { type BidiConnection } from './Connection.js';
import { BidiFrame } from './Frame.js';
import { type BidiHTTPRequest } from './HTTPRequest.js';
import { type BidiHTTPResponse } from './HTTPResponse.js';
import { BidiKeyboard, BidiMouse, BidiTouchscreen } from './Input.js';
import { type BidiJSHandle } from './JSHandle.js';
/**
 * @internal
 */
export declare class BidiPage extends Page {
    #private;
    _client(): CDPSession;
    constructor(browsingContext: BrowsingContext, browserContext: BidiBrowserContext);
    /**
     * @internal
     */
    get connection(): BidiConnection;
    setUserAgent(userAgent: string, userAgentMetadata?: Protocol.Emulation.UserAgentMetadata | undefined): Promise<void>;
    setBypassCSP(enabled: boolean): Promise<void>;
    queryObjects<Prototype>(prototypeHandle: BidiJSHandle<Prototype>): Promise<BidiJSHandle<Prototype[]>>;
    _setBrowserContext(browserContext: BidiBrowserContext): void;
    get accessibility(): Accessibility;
    get tracing(): Tracing;
    get coverage(): Coverage;
    get mouse(): BidiMouse;
    get touchscreen(): BidiTouchscreen;
    get keyboard(): BidiKeyboard;
    browser(): BidiBrowser;
    browserContext(): BidiBrowserContext;
    mainFrame(): BidiFrame;
    /**
     * @internal
     */
    focusedFrame(): Promise<BidiFrame>;
    frames(): BidiFrame[];
    frame(frameId?: string): BidiFrame | null;
    childFrames(frameId: string): BidiFrame[];
    getNavigationResponse(id: string | null): BidiHTTPResponse | null;
    isClosed(): boolean;
    close(): Promise<void>;
    reload(options?: WaitForOptions): Promise<BidiHTTPResponse | null>;
    setDefaultNavigationTimeout(timeout: number): void;
    setDefaultTimeout(timeout: number): void;
    getDefaultTimeout(): number;
    isJavaScriptEnabled(): boolean;
    setGeolocation(options: GeolocationOptions): Promise<void>;
    setJavaScriptEnabled(enabled: boolean): Promise<void>;
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
    pdf(options?: PDFOptions): Promise<Buffer>;
    createPDFStream(options?: PDFOptions | undefined): Promise<Readable>;
    _screenshot(options: Readonly<ScreenshotOptions>): Promise<string>;
    waitForRequest(urlOrPredicate: string | ((req: BidiHTTPRequest) => boolean | Promise<boolean>), options?: {
        timeout?: number;
    }): Promise<BidiHTTPRequest>;
    waitForResponse(urlOrPredicate: string | ((res: BidiHTTPResponse) => boolean | Promise<boolean>), options?: {
        timeout?: number;
    }): Promise<BidiHTTPResponse>;
    waitForNetworkIdle(options?: {
        idleTime?: number;
        timeout?: number;
    }): Promise<void>;
    createCDPSession(): Promise<CDPSession>;
    bringToFront(): Promise<void>;
    evaluateOnNewDocument<Params extends unknown[], Func extends (...args: Params) => unknown = (...args: Params) => unknown>(pageFunction: Func | string, ...args: Params): Promise<NewDocumentScriptEvaluation>;
    removeScriptToEvaluateOnNewDocument(id: string): Promise<void>;
    exposeFunction<Args extends unknown[], Ret>(name: string, pptrFunction: ((...args: Args) => Awaitable<Ret>) | {
        default: (...args: Args) => Awaitable<Ret>;
    }): Promise<void>;
    isDragInterceptionEnabled(): boolean;
    setCacheEnabled(enabled?: boolean): Promise<void>;
}
//# sourceMappingURL=Page.d.ts.map