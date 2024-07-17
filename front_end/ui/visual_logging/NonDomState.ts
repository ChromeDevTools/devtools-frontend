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

let registry = new WeakMap<Loggable, LoggableRegistration[]>();

function getLoggables(parent?: Loggable): LoggableRegistration[] {
  return registry.get(parent || nullParent) || [];
}

export function registerLoggable(loggable: Loggable, config: LoggingConfig, parent?: Loggable): void {
  const values = getLoggables(parent);
  values.push({loggable, config, parent});
  registry.set(parent || nullParent, values);
}

export function hasNonDomLoggables(parent?: Loggable): boolean {
  return registry.has(parent || nullParent);
}

export function getNonDomLoggables(parent?: Loggable): LoggableRegistration[] {
  return [...getLoggables(parent)];
}

export function unregisterLoggables(parent?: Loggable): void {
  registry.delete(parent || nullParent);
}

export function unregisterAllLoggables(): void {
  registry = new WeakMap();
}

const nullParent = {};
