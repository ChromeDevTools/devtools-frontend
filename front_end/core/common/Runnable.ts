// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export interface Runnable {
  run(): Promise<void>;
}

type LateInitializationLoader = () => Promise<Runnable>;
export interface LateInitializableRunnableSetting {
  id: string;
  loadRunnable: LateInitializationLoader;
}

const registeredLateInitializationRunnables = new Map<string, LateInitializationLoader>();

export function registerLateInitializationRunnable(setting: LateInitializableRunnableSetting): void {
  const {id, loadRunnable} = setting;
  if (registeredLateInitializationRunnables.has(id)) {
    throw new Error(`Duplicate late Initializable runnable id '${id}'`);
  }
  registeredLateInitializationRunnables.set(id, loadRunnable);
}

export function maybeRemoveLateInitializationRunnable(runnableId: string): boolean {
  return registeredLateInitializationRunnables.delete(runnableId);
}

export function lateInitializationRunnables(): Array<LateInitializationLoader> {
  return [...registeredLateInitializationRunnables.values()];
}

const registeredEarlyInitializationRunnables: (() => Runnable)[] = [];

export function registerEarlyInitializationRunnable(runnable: () => Runnable): void {
  registeredEarlyInitializationRunnables.push(runnable);
}

export function earlyInitializationRunnables(): (() => Runnable)[] {
  return registeredEarlyInitializationRunnables;
}
