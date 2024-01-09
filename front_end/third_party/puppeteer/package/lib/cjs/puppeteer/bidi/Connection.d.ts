/**
 * @license
 * Copyright 2017 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
import type * as Bidi from 'chromium-bidi/lib/cjs/protocol/protocol.js';
import type { ConnectionTransport } from '../common/ConnectionTransport.js';
import { EventEmitter } from '../common/EventEmitter.js';
import { type BrowsingContext } from './BrowsingContext.js';
/**
 * @internal
 */
export interface Commands {
    'script.evaluate': {
        params: Bidi.Script.EvaluateParameters;
        returnType: Bidi.Script.EvaluateResult;
    };
    'script.callFunction': {
        params: Bidi.Script.CallFunctionParameters;
        returnType: Bidi.Script.EvaluateResult;
    };
    'script.disown': {
        params: Bidi.Script.DisownParameters;
        returnType: Bidi.EmptyResult;
    };
    'script.addPreloadScript': {
        params: Bidi.Script.AddPreloadScriptParameters;
        returnType: Bidi.Script.AddPreloadScriptResult;
    };
    'script.removePreloadScript': {
        params: Bidi.Script.RemovePreloadScriptParameters;
        returnType: Bidi.EmptyResult;
    };
    'browser.close': {
        params: Bidi.EmptyParams;
        returnType: Bidi.EmptyResult;
    };
    'browsingContext.activate': {
        params: Bidi.BrowsingContext.ActivateParameters;
        returnType: Bidi.EmptyResult;
    };
    'browsingContext.create': {
        params: Bidi.BrowsingContext.CreateParameters;
        returnType: Bidi.BrowsingContext.CreateResult;
    };
    'browsingContext.close': {
        params: Bidi.BrowsingContext.CloseParameters;
        returnType: Bidi.EmptyResult;
    };
    'browsingContext.getTree': {
        params: Bidi.BrowsingContext.GetTreeParameters;
        returnType: Bidi.BrowsingContext.GetTreeResult;
    };
    'browsingContext.navigate': {
        params: Bidi.BrowsingContext.NavigateParameters;
        returnType: Bidi.BrowsingContext.NavigateResult;
    };
    'browsingContext.reload': {
        params: Bidi.BrowsingContext.ReloadParameters;
        returnType: Bidi.BrowsingContext.NavigateResult;
    };
    'browsingContext.print': {
        params: Bidi.BrowsingContext.PrintParameters;
        returnType: Bidi.BrowsingContext.PrintResult;
    };
    'browsingContext.captureScreenshot': {
        params: Bidi.BrowsingContext.CaptureScreenshotParameters;
        returnType: Bidi.BrowsingContext.CaptureScreenshotResult;
    };
    'browsingContext.handleUserPrompt': {
        params: Bidi.BrowsingContext.HandleUserPromptParameters;
        returnType: Bidi.EmptyResult;
    };
    'browsingContext.setViewport': {
        params: Bidi.BrowsingContext.SetViewportParameters;
        returnType: Bidi.EmptyResult;
    };
    'browsingContext.traverseHistory': {
        params: Bidi.BrowsingContext.TraverseHistoryParameters;
        returnType: Bidi.EmptyResult;
    };
    'input.performActions': {
        params: Bidi.Input.PerformActionsParameters;
        returnType: Bidi.EmptyResult;
    };
    'input.releaseActions': {
        params: Bidi.Input.ReleaseActionsParameters;
        returnType: Bidi.EmptyResult;
    };
    'session.end': {
        params: Bidi.EmptyParams;
        returnType: Bidi.EmptyResult;
    };
    'session.new': {
        params: Bidi.Session.NewParameters;
        returnType: Bidi.Session.NewResult;
    };
    'session.status': {
        params: object;
        returnType: Bidi.Session.StatusResult;
    };
    'session.subscribe': {
        params: Bidi.Session.SubscriptionRequest;
        returnType: Bidi.EmptyResult;
    };
    'session.unsubscribe': {
        params: Bidi.Session.SubscriptionRequest;
        returnType: Bidi.EmptyResult;
    };
    'cdp.sendCommand': {
        params: Bidi.Cdp.SendCommandParameters;
        returnType: Bidi.Cdp.SendCommandResult;
    };
    'cdp.getSession': {
        params: Bidi.Cdp.GetSessionParameters;
        returnType: Bidi.Cdp.GetSessionResult;
    };
}
/**
 * @internal
 */
export type BidiEvents = {
    [K in Bidi.ChromiumBidi.Event['method']]: Extract<Bidi.ChromiumBidi.Event, {
        method: K;
    }>['params'];
};
/**
 * @internal
 */
export declare class BidiConnection extends EventEmitter<BidiEvents> {
    #private;
    constructor(url: string, transport: ConnectionTransport, delay?: number, timeout?: number);
    get closed(): boolean;
    get url(): string;
    send<T extends keyof Commands>(method: T, params: Commands[T]['params']): Promise<{
        result: Commands[T]['returnType'];
    }>;
    /**
     * @internal
     */
    protected onMessage(message: string): Promise<void>;
    registerBrowsingContexts(context: BrowsingContext): void;
    getBrowsingContext(contextId: string): BrowsingContext;
    getTopLevelContext(contextId: string): BrowsingContext;
    unregisterBrowsingContexts(id: string): void;
    /**
     * Unbinds the connection, but keeps the transport open. Useful when the transport will
     * be reused by other connection e.g. with different protocol.
     * @internal
     */
    unbind(): void;
    /**
     * Unbinds the connection and closes the transport.
     */
    dispose(): void;
}
//# sourceMappingURL=Connection.d.ts.map