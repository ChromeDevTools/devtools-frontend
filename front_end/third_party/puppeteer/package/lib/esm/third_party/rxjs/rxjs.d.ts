/**
 * @license
 * Copyright 2023 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
export { bufferCount, catchError, combineLatest, concat, concatMap, debounceTime, defaultIfEmpty, defer, delay, EMPTY, filter, first, firstValueFrom, forkJoin, delayWhen, from, fromEvent, identity, ignoreElements, lastValueFrom, map, merge, mergeMap, mergeScan, NEVER, noop, Observable, of, pipe, race, raceWith, ReplaySubject, retry, startWith, switchMap, take, takeUntil, tap, throwIfEmpty, timer, zip, } from 'rxjs';
export type * from 'rxjs';
export declare function filterAsync<T>(predicate: (value: T) => boolean | PromiseLike<boolean>): import("rxjs").OperatorFunction<T, T>;
