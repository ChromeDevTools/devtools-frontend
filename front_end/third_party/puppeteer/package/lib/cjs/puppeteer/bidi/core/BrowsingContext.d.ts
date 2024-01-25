/**
 * @license
 * Copyright 2024 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
import type * as Bidi from 'chromium-bidi/lib/cjs/protocol/protocol.js';
import { EventEmitter } from '../../common/EventEmitter.js';
import { disposeSymbol } from '../../util/disposable.js';
import type { AddPreloadScriptOptions } from './Browser.js';
import { Navigation } from './Navigation.js';
import { WindowRealm } from './Realm.js';
import { Request } from './Request.js';
import type { UserContext } from './UserContext.js';
import { UserPrompt } from './UserPrompt.js';
/**
 * @internal
 */
export type CaptureScreenshotOptions = Omit<Bidi.BrowsingContext.CaptureScreenshotParameters, 'context'>;
/**
 * @internal
 */
export type ReloadOptions = Omit<Bidi.BrowsingContext.ReloadParameters, 'context'>;
/**
 * @internal
 */
export type PrintOptions = Omit<Bidi.BrowsingContext.PrintParameters, 'context'>;
/**
 * @internal
 */
export type HandleUserPromptOptions = Omit<Bidi.BrowsingContext.HandleUserPromptParameters, 'context'>;
/**
 * @internal
 */
export type SetViewportOptions = Omit<Bidi.BrowsingContext.SetViewportParameters, 'context'>;
/**
 * @internal
 */
export declare class BrowsingContext extends EventEmitter<{
    /** Emitted when this context is closed. */
    closed: {
        /** The reason the browsing context was closed */
        reason: string;
    };
    /** Emitted when a child browsing context is created. */
    browsingcontext: {
        /** The newly created child browsing context. */
        browsingContext: BrowsingContext;
    };
    /** Emitted whenever a navigation occurs. */
    navigation: {
        /** The navigation that occurred. */
        navigation: Navigation;
    };
    /** Emitted whenever a request is made. */
    request: {
        /** The request that was made. */
        request: Request;
    };
    /** Emitted whenever a log entry is added. */
    log: {
        /** Entry added to the log. */
        entry: Bidi.Log.Entry;
    };
    /** Emitted whenever a prompt is opened. */
    userprompt: {
        /** The prompt that was opened. */
        userPrompt: UserPrompt;
    };
    /** Emitted whenever the frame emits `DOMContentLoaded` */
    DOMContentLoaded: void;
    /** Emitted whenever the frame emits `load` */
    load: void;
}> {
    #private;
    static from(userContext: UserContext, parent: BrowsingContext | undefined, id: string, url: string): BrowsingContext;
    readonly defaultRealm: WindowRealm;
    readonly id: string;
    readonly parent: BrowsingContext | undefined;
    readonly userContext: UserContext;
    private constructor();
    get children(): Iterable<BrowsingContext>;
    get closed(): boolean;
    get disposed(): boolean;
    get realms(): Iterable<WindowRealm>;
    get top(): BrowsingContext;
    get url(): string;
    private dispose;
    activate(): Promise<void>;
    captureScreenshot(options?: CaptureScreenshotOptions): Promise<string>;
    close(promptUnload?: boolean): Promise<void>;
    traverseHistory(delta: number): Promise<void>;
    navigate(url: string, wait?: Bidi.BrowsingContext.ReadinessState): Promise<Navigation>;
    reload(options?: ReloadOptions): Promise<Navigation>;
    print(options?: PrintOptions): Promise<string>;
    handleUserPrompt(options?: HandleUserPromptOptions): Promise<void>;
    setViewport(options?: SetViewportOptions): Promise<void>;
    performActions(actions: Bidi.Input.SourceActions[]): Promise<void>;
    releaseActions(): Promise<void>;
    createWindowRealm(sandbox: string): WindowRealm;
    addPreloadScript(functionDeclaration: string, options?: AddPreloadScriptOptions): Promise<string>;
    removePreloadScript(script: string): Promise<void>;
    [disposeSymbol](): void;
}
//# sourceMappingURL=BrowsingContext.d.ts.map