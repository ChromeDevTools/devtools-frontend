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
import { CommonDataTypes } from '../../../protocol/protocol.js';
import { BrowsingContextImpl } from './browsingContextImpl.js';
/** Container class for browsing contexts. */
export declare class BrowsingContextStorage {
    #private;
    /** Gets all top-level contexts, i.e. those with no parent. */
    getTopLevelContexts(): BrowsingContextImpl[];
    /** Gets all contexts. */
    getAllContexts(): BrowsingContextImpl[];
    /** Deletes the context with the given ID. */
    deleteContext(contextId: CommonDataTypes.BrowsingContext): void;
    /** Adds the given context. */
    addContext(context: BrowsingContextImpl): void;
    /** Returns true whether there is an existing context with the given ID. */
    hasContext(contextId: CommonDataTypes.BrowsingContext): boolean;
    /** Gets the context with the given ID, if any. */
    findContext(contextId: CommonDataTypes.BrowsingContext): BrowsingContextImpl | undefined;
    /** Returns the top-level context ID of the given context, if any. */
    findTopLevelContextId(contextId: CommonDataTypes.BrowsingContext | null): CommonDataTypes.BrowsingContext | null;
    /** Gets the context with the given ID, if any, otherwise throws. */
    getContext(contextId: CommonDataTypes.BrowsingContext): BrowsingContextImpl;
}
