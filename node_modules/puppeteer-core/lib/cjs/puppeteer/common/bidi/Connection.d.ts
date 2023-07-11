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
import * as Bidi from 'chromium-bidi/lib/cjs/protocol/protocol.js';
import { ConnectionTransport } from '../ConnectionTransport.js';
import { EventEmitter } from '../EventEmitter.js';
import { BrowsingContext } from './BrowsingContext.js';
type Capability = {
    acceptInsecureCerts?: boolean;
    browserName?: string;
    browserVersion?: string;
};
/**
 * @internal
 */
interface Commands {
    'script.evaluate': {
        params: Bidi.Script.EvaluateParameters;
        returnType: Bidi.Script.EvaluateResult;
    };
    'script.callFunction': {
        params: Bidi.Script.CallFunctionParameters;
        returnType: Bidi.Script.CallFunctionResult;
    };
    'script.disown': {
        params: Bidi.Script.DisownParameters;
        returnType: Bidi.Script.DisownResult;
    };
    'script.addPreloadScript': {
        params: Bidi.Script.AddPreloadScriptParameters;
        returnType: Bidi.Script.AddPreloadScriptResult;
    };
    'browsingContext.create': {
        params: Bidi.BrowsingContext.CreateParameters;
        returnType: Bidi.BrowsingContext.CreateResult;
    };
    'browsingContext.close': {
        params: Bidi.BrowsingContext.CloseParameters;
        returnType: Bidi.Message.EmptyResult;
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
        returnType: Bidi.Message.EmptyResult;
    };
    'browsingContext.print': {
        params: Bidi.BrowsingContext.PrintParameters;
        returnType: Bidi.BrowsingContext.PrintResult;
    };
    'browsingContext.captureScreenshot': {
        params: Bidi.BrowsingContext.CaptureScreenshotParameters;
        returnType: Bidi.BrowsingContext.CaptureScreenshotResult;
    };
    'input.performActions': {
        params: Bidi.Input.PerformActionsParameters;
        returnType: Bidi.Message.EmptyResult;
    };
    'input.releaseActions': {
        params: Bidi.Input.ReleaseActionsParameters;
        returnType: Bidi.Message.EmptyResult;
    };
    'session.new': {
        params: {
            capabilities?: {
                alwaysMatch?: Capability;
            };
        };
        returnType: {
            result: {
                sessionId: string;
                capabilities: Capability;
            };
        };
    };
    'session.status': {
        params: object;
        returnType: Bidi.Session.StatusResult;
    };
    'session.subscribe': {
        params: Bidi.Session.SubscriptionRequest;
        returnType: Bidi.Message.EmptyResult;
    };
    'session.unsubscribe': {
        params: Bidi.Session.SubscriptionRequest;
        returnType: Bidi.Message.EmptyResult;
    };
    'cdp.sendCommand': {
        params: Bidi.Cdp.SendCommandParams;
        returnType: Bidi.Cdp.SendCommandResult;
    };
    'cdp.getSession': {
        params: Bidi.Cdp.GetSessionParams;
        returnType: Bidi.Cdp.GetSessionResult;
    };
}
/**
 * @internal
 */
export declare class Connection extends EventEmitter {
    #private;
    constructor(url: string, transport: ConnectionTransport, delay?: number, timeout?: number);
    get closed(): boolean;
    get url(): string;
    send<T extends keyof Commands>(method: T, params: Commands[T]['params']): Promise<Commands[T]['returnType']>;
    /**
     * @internal
     */
    protected onMessage(message: string): Promise<void>;
    registerBrowsingContexts(context: BrowsingContext): void;
    unregisterBrowsingContexts(id: string): void;
    dispose(): void;
}
export {};
//# sourceMappingURL=Connection.d.ts.map