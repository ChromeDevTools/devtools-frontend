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
import Protocol from 'devtools-protocol';
import { GeolocationOptions, MediaFeature, NewDocumentScriptEvaluation, Page as PageBase, ScreenshotOptions, WaitForOptions } from '../../api/Page.js';
import { Accessibility } from '../Accessibility.js';
import { CDPSession } from '../Connection.js';
import { Coverage } from '../Coverage.js';
import { PDFOptions } from '../PDFOptions.js';
import { Viewport } from '../PuppeteerViewport.js';
import { Tracing } from '../Tracing.js';
import { EvaluateFunc, HandleFor } from '../types.js';
import { Browser } from './Browser.js';
import { BrowserContext } from './BrowserContext.js';
import { BrowsingContext } from './BrowsingContext.js';
import { Frame } from './Frame.js';
import { HTTPRequest } from './HTTPRequest.js';
import { HTTPResponse } from './HTTPResponse.js';
import { Keyboard, Mouse, Touchscreen } from './Input.js';
/**
 * @internal
 */
export declare class Page extends PageBase {
    #private;
    _client(): CDPSession;
    constructor(browsingContext: BrowsingContext, browserContext: BrowserContext);
    _setBrowserContext(browserContext: BrowserContext): void;
    get accessibility(): Accessibility;
    get tracing(): Tracing;
    get coverage(): Coverage;
    get mouse(): Mouse;
    get touchscreen(): Touchscreen;
    get keyboard(): Keyboard;
    browser(): Browser;
    browserContext(): BrowserContext;
    mainFrame(): Frame;
    frames(): Frame[];
    frame(frameId?: string): Frame | null;
    childFrames(frameId: string): Frame[];
    getNavigationResponse(id: string | null): HTTPResponse | null;
    isClosed(): boolean;
    close(): Promise<void>;
    evaluateHandle<Params extends unknown[], Func extends EvaluateFunc<Params> = EvaluateFunc<Params>>(pageFunction: Func | string, ...args: Params): Promise<HandleFor<Awaited<ReturnType<Func>>>>;
    evaluate<Params extends unknown[], Func extends EvaluateFunc<Params> = EvaluateFunc<Params>>(pageFunction: Func | string, ...args: Params): Promise<Awaited<ReturnType<Func>>>;
    goto(url: string, options?: WaitForOptions & {
        referer?: string | undefined;
        referrerPolicy?: string | undefined;
    }): Promise<HTTPResponse | null>;
    reload(options?: WaitForOptions): Promise<HTTPResponse | null>;
    url(): string;
    setDefaultNavigationTimeout(timeout: number): void;
    setDefaultTimeout(timeout: number): void;
    getDefaultTimeout(): number;
    setContent(html: string, options?: WaitForOptions): Promise<void>;
    content(): Promise<string>;
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
    screenshot(options: ScreenshotOptions & {
        encoding: 'base64';
    }): Promise<string>;
    screenshot(options?: ScreenshotOptions & {
        encoding?: 'binary';
    }): never;
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
    title(): Promise<string>;
    createCDPSession(): Promise<CDPSession>;
    bringToFront(): Promise<void>;
    evaluateOnNewDocument<Params extends unknown[], Func extends (...args: Params) => unknown = (...args: Params) => unknown>(pageFunction: Func | string, ...args: Params): Promise<NewDocumentScriptEvaluation>;
    removeScriptToEvaluateOnNewDocument(id: string): Promise<void>;
}
//# sourceMappingURL=Page.d.ts.map