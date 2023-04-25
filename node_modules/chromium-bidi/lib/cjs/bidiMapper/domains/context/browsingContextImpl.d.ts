/**
 * Copyright 2022 Google LLC.
 * Copyright (c) Microsoft Corporation.
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
import { BrowsingContext, CommonDataTypes, Script } from '../../../protocol/protocol.js';
import { LoggerFn } from '../../../utils/log.js';
import { IEventManager } from '../events/EventManager.js';
import { Realm } from '../script/realm.js';
import { RealmStorage } from '../script/realmStorage.js';
import { BrowsingContextStorage } from './browsingContextStorage.js';
import { CdpTarget } from './cdpTarget';
export declare class BrowsingContextImpl {
    #private;
    private constructor();
    static create(cdpTarget: CdpTarget, realmStorage: RealmStorage, contextId: CommonDataTypes.BrowsingContext, parentId: CommonDataTypes.BrowsingContext | null, eventManager: IEventManager, browsingContextStorage: BrowsingContextStorage, logger?: LoggerFn): BrowsingContextImpl;
    /**
     * @see https://html.spec.whatwg.org/multipage/document-sequences.html#navigable
     */
    get navigableId(): string | null;
    delete(): void;
    /** Returns the ID of this context. */
    get contextId(): CommonDataTypes.BrowsingContext;
    /** Returns the parent context ID. */
    get parentId(): CommonDataTypes.BrowsingContext | null;
    /** Returns all children contexts. */
    get children(): BrowsingContextImpl[];
    /**
     * Returns true if this is a top-level context.
     * This is the case whenever the parent context ID is null.
     */
    isTopLevelContext(): boolean;
    addChild(child: BrowsingContextImpl): void;
    get cdpTarget(): CdpTarget;
    updateCdpTarget(cdpTarget: CdpTarget): void;
    get url(): string;
    awaitLoaded(): Promise<void>;
    awaitUnblocked(): Promise<void>;
    getOrCreateSandbox(sandbox: string | undefined): Promise<Realm>;
    serializeToBidiValue(maxDepth?: number, addParentFiled?: boolean): BrowsingContext.Info;
    navigate(url: string, wait: BrowsingContext.ReadinessState): Promise<BrowsingContext.NavigateResult>;
    captureScreenshot(): Promise<BrowsingContext.CaptureScreenshotResult>;
    print(params: BrowsingContext.PrintParameters): Promise<BrowsingContext.PrintResult>;
    addPreloadScript(params: Script.AddPreloadScriptParameters): Promise<Script.AddPreloadScriptResult>;
}
