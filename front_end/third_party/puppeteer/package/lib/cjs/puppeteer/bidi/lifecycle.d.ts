/**
 * @license
 * Copyright 2023 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
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