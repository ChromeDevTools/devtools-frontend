/**
 * @license
 * Copyright 2023 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
export { bufferCount, catchError, concatMap, defaultIfEmpty, defer, delay, EMPTY, filter, first, firstValueFrom, forkJoin, from, fromEvent, identity, ignoreElements, lastValueFrom, map, merge, mergeMap, NEVER, noop, of, pipe, race, raceWith, retry, startWith, switchMap, takeUntil, tap, throwIfEmpty, timer, } from 'rxjs';
export type * from 'rxjs';
export declare function filterAsync<T>(predicate: (value: T) => boolean | PromiseLike<boolean>): import("rxjs").OperatorFunction<T, T>;
