/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

/**
 * @fileoverview Extern definitions for types missing in the Closure externs,
 * but used in TypeScript platform `.d.ts`.
 * We suppress checkTypes to handle the scenario where a user doesn't use the
 * Closure externs (e.g. in a service worker).
 * @externs
 * @suppress {checkTypes}
 */

/** @typedef {!IArrayLike} */
var ArrayLike;

/** @typedef {!IteratorIterable} */
var IterableIterator;

/** @typedef {!IIterableResult} */
var IteratorYieldResult;
/** @typedef {!IIterableResult} */
var IteratorReturnResult;

/** @typedef {!HTMLCollection} */
var HTMLCollectionOf;

/** @typedef {!HTMLTableCellElement} */
var HTMLTableDataCellElement;

/**
 * Does not have an equivalent in Closure's externs.
 * @typedef {!HTMLTableCellElement}
 */
var HTMLTableHeaderCellElement;

/**
 * Closure's NodeList is parameterized itself, there is no NodeListOf.
 * @constructor
 * @template T
 * @extends {NodeList<T>}
 */
var NodeListOf;

/**
 * Closure models this as a plain Array.
 * @typedef {!IArrayLike<string>|null}
 */
var RegExpExecArray;

/**
 * @record
 * @template T
 * @extends {Array<T>}
 */
function ReadonlyArray() {}

/**
 * @constructor
 * @template K, V
 * @extends {Map<K, V>}
 */
function ReadonlyMap() {}

/**
 * @constructor
 * @template T
 * @extends {Set<T>}
 */
function ReadonlySet() {}

/**
 * @record
 * @template T
 * @extends {IThenable<T>}
 */
function PromiseLike() {};

/** @typedef {function(new:Promise)} */
var PromiseConstructor;

/** @typedef {function(new:Promise, function(function(*=), function(*=)))} */
var PromiseConstructorLike;

/** @typedef {?} */
var SymbolConstructor;

/**
 * This is a placeholder for a Closure type to be determined.
 * @constructor
 */
function bigintPlaceholder() {}

/** @typedef {!Object} */
var GlobalFetch;

/**
 * @interface
 * @extends {WorkerGlobalScope}
 * @extends {Window}
 */
var WindowOrWorkerGlobalScope;

/** @record */
function CanvasDrawImage() {}

/** @constructor */
function CryptoKey() {};
/** @constructor */
function CryptoKeyPair() {};
