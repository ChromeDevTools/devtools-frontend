/**
 * Copyright 2023 Google Inc. All rights reserved.
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
import type { ObservableInput, ObservedValueOf, OperatorFunction } from '../../third_party/rxjs/rxjs.js';
import type { PuppeteerLifeCycleEvent } from '../cdp/LifecycleWatcher.js';
/**
 * @internal
 */
export type BiDiNetworkIdle = Extract<PuppeteerLifeCycleEvent, 'networkidle0' | 'networkidle2'> | null;
/**
 * @internal
 */
export declare function getBiDiLifeCycles(event: PuppeteerLifeCycleEvent | PuppeteerLifeCycleEvent[]): [
    Extract<PuppeteerLifeCycleEvent, 'load' | 'domcontentloaded'>,
    BiDiNetworkIdle
];
/**
 * @internal
 */
export declare const lifeCycleToReadinessState: Map<PuppeteerLifeCycleEvent, Bidi.BrowsingContext.ReadinessState>;
export declare function getBiDiReadinessState(event: PuppeteerLifeCycleEvent | PuppeteerLifeCycleEvent[]): [Bidi.BrowsingContext.ReadinessState, BiDiNetworkIdle];
/**
 * @internal
 */
export declare const lifeCycleToSubscribedEvent: Map<PuppeteerLifeCycleEvent, "browsingContext.domContentLoaded" | "browsingContext.load">;
/**
 * @internal
 */
export declare function getBiDiLifecycleEvent(event: PuppeteerLifeCycleEvent | PuppeteerLifeCycleEvent[]): [
    'browsingContext.load' | 'browsingContext.domContentLoaded',
    BiDiNetworkIdle
];
/**
 * @internal
 */
export declare function rewriteNavigationError<T, R extends ObservableInput<T>>(message: string, ms: number): OperatorFunction<T, T | ObservedValueOf<R>>;
//# sourceMappingURL=lifecycle.d.ts.map