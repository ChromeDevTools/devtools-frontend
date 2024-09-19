// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import {type Loggable} from './Loggable.js';
import {type LoggingConfig, needsLogging} from './LoggingConfig.js';

export interface LoggingState {
  impressionLogged: boolean;
  processed: boolean;
  config: LoggingConfig;
  veid: number;
  parent: LoggingState|null;
  processedForDebugging?: boolean;
  size: DOMRect;
  selectOpen?: boolean;
  lastInputEventType?: string;
}

const state = new WeakMap<Loggable, LoggingState>();

function nextVeId(): number {
  const result = new BigInt64Array(1);
  crypto.getRandomValues(result);
  return Number(result[0] >> (64n - 53n));
}

export function getOrCreateLoggingState(loggable: Loggable, config: LoggingConfig, parent?: Loggable): LoggingState {
  if (config.parent && parentProviders.has(config.parent) && loggable instanceof Element) {
    parent = parentProviders.get(config.parent)?.(loggable);
    while (parent instanceof Element && !needsLogging(parent)) {
      parent = parent.parentElementOrShadowHost() ?? undefined;
    }
  }
  if (state.has(loggable)) {
    const currentState = state.get(loggable) as LoggingState;
    if (parent && currentState.parent !== getLoggingState(parent)) {
      currentState.parent = getLoggingState(parent);
    }
    return currentState;
  }

  const loggableState = {
    impressionLogged: false,
    processed: false,
    config,
    veid: nextVeId(),
    parent: parent ? getLoggingState(parent) : null,
    size: new DOMRect(0, 0, 0, 0),
  };
  state.set(loggable, loggableState);
  return loggableState;
}

export function getLoggingState(loggable: Loggable): LoggingState|null {
  return state.get(loggable) || null;
}

type ParentProvider = (e: Element) => Element|undefined;
const parentProviders = new Map<string, ParentProvider>();

export function registerParentProvider(name: string, provider: ParentProvider): void {
  if (parentProviders.has(name)) {
    throw new Error(`Parent provider with the name '${name} is already registered'`);
  }
  parentProviders.set(name, provider);
}

const parentMap = new WeakMap<Element, Element>();
registerParentProvider('mapped', (e: Element) => parentMap.get(e));

export function setMappedParent(element: Element, parent: Element): void {
  parentMap.set(element, parent);
}
