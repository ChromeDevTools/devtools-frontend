// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @interface
 */
export class Runnable {
  /**
   * @return {!Promise.<void>}
   */
  run() {
    throw new Error('not implemented');
  }
}

/** @type {!Array<function(): !Runnable>} */
const registeredLateInitializationRunnables = [];
/**
 * @param {function(): !Runnable} runnable
 */
export function registerLateInitializationRunnable(runnable) {
  registeredLateInitializationRunnables.push(runnable);
}

/**
 * @return {!Array<function(): !Runnable>}
 */
export function lateInitializationRunnables() {
  return registeredLateInitializationRunnables;
}

/** @type {!Array<function(): !Runnable>} */
const registeredEarlyInitializationRunnables = [];

/**
 * @param {function(): !Runnable} runnable
 */
export function registerEarlyInitializationRunnable(runnable) {
  registeredEarlyInitializationRunnables.push(runnable);
}

/**
 * @return {!Array<function(): !Runnable>}
 */
export function earlyInitializationRunnables() {
  return registeredEarlyInitializationRunnables;
}
