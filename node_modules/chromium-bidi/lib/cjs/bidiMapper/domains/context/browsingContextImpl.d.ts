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
import type { Protocol } from 'devtools-protocol';
import { BrowsingContext, type CommonDataTypes, Message } from '../../../protocol/protocol.js';
import { type LoggerFn } from '../../../utils/log.js';
import type { IEventManager } from '../events/EventManager.js';
import { Realm } from '../script/realm.js';
import type { RealmStorage } from '../script/realmStorage.js';
import type { BrowsingContextStorage } from './browsingContextStorage.js';
import type { CdpTarget } from './cdpTarget.js';
export declare class BrowsingContextImpl {
    #private;
    private constructor();
    static create(cdpTarget: CdpTarget, realmStorage: RealmStorage, id: CommonDataTypes.BrowsingContext, parentId: CommonDataTypes.BrowsingContext | null, eventManager: IEventManager, browsingContextStorage: BrowsingContextStorage, logger?: LoggerFn): BrowsingContextImpl;
    static getTimestamp(): number;
    /**
     * @see https://html.spec.whatwg.org/multipage/document-sequences.html#navigable
     */
    get navigableId(): string | undefined;
    delete(): void;
    /** Returns the ID of this context. */
    get id(): CommonDataTypes.BrowsingContext;
    /** Returns the parent context ID. */
    get parentId(): CommonDataTypes.BrowsingContext | null;
    /** Returns the parent context. */
    get parent(): BrowsingContextImpl | null;
    /** Returns all direct children contexts. */
    get directChildren(): BrowsingContextImpl[];
    /** Returns all children contexts, flattened. */
    get allChildren(): BrowsingContextImpl[];
    /**
     * Returns true if this is a top-level context.
     * This is the case whenever the parent context ID is null.
     */
    isTopLevelContext(): boolean;
    get top(): BrowsingContextImpl;
    addChild(childId: CommonDataTypes.BrowsingContext): void;
    get cdpTarget(): CdpTarget;
    updateCdpTarget(cdpTarget: CdpTarget): void;
    get url(): string;
    awaitLoaded(): Promise<void>;
    awaitUnblocked(): Promise<void>;
    getOrCreateSandbox(sandbox: string | undefined): Promise<Realm>;
    serializeToBidiValue(maxDepth?: number, addParentField?: boolean): BrowsingContext.Info;
    onTargetInfoChanged(params: Protocol.Target.TargetInfoChangedEvent): void;
    navigate(url: string, wait: BrowsingContext.ReadinessState): Promise<BrowsingContext.NavigateResult>;
    reload(ignoreCache: boolean, wait: BrowsingContext.ReadinessState): Promise<Message.EmptyResult>;
    setViewport(viewport: BrowsingContext.Viewport | null): Promise<void>;
    captureScreenshot(): Promise<BrowsingContext.CaptureScreenshotResult>;
    print(params: BrowsingContext.PrintParameters): Promise<BrowsingContext.PrintResult>;
}
