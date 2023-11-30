// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import {type Loggable} from './Loggable.js';
import {type LoggingConfig} from './LoggingConfig.js';

interface LoggableRegistration {
  loggable: Loggable;
  config: LoggingConfig;
  parent?: Loggable;
}

const registry: Map<Loggable, LoggableRegistration> = new Map();

export function registerLoggable(loggable: Loggable, config: LoggingConfig, parent?: Loggable): void {
  registry.set(loggable, {loggable, config, parent});
}

export function unregisterLoggable(loggable: Loggable): void {
  registry.delete(loggable);
}

export function getNonDomState(): {loggables: LoggableRegistration[]} {
  return {loggables: [...registry.values()]};
}

export function unregisterAllLoggables(): void {
  registry.clear();
}
