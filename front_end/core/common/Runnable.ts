// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @interface
 */
/* eslint-disable rulesdir/no_underscored_properties */

export interface Runnable {
  run(): Promise<void>;
}

const registeredLateInitializationRunnables: (() => Runnable)[] = [];
export function registerLateInitializationRunnable(runnable: () => Runnable): void {
  registeredLateInitializationRunnables.push(runnable);
}

export function lateInitializationRunnables(): (() => Runnable)[] {
  return registeredLateInitializationRunnables;
}

const registeredEarlyInitializationRunnables: (() => Runnable)[] = [];

export function registerEarlyInitializationRunnable(runnable: () => Runnable): void {
  registeredEarlyInitializationRunnables.push(runnable);
}

export function earlyInitializationRunnables(): (() => Runnable)[] {
  return registeredEarlyInitializationRunnables;
}
