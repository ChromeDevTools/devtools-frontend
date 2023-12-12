// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import {type Loggable} from './Loggable.js';
import {type LoggingConfig} from './LoggingConfig.js';

export interface LoggingState {
  impressionLogged: boolean;
  processed: boolean;
  config: LoggingConfig;
  context: ContextProvider;
  veid: number;
  parent: LoggingState|null;
  processedForDebugging?: boolean;
}

const state = new WeakMap<Loggable, LoggingState>();

function nextVeId(): number {
  const result = new Uint32Array(1);
  crypto.getRandomValues(result);
  return result[0];
}

export function getOrCreateLoggingState(loggable: Loggable, config: LoggingConfig, parent?: Loggable): LoggingState {
  if (state.has(loggable)) {
    return state.get(loggable) as LoggingState;
  }
  if (config.parent && parentProviders.has(config.parent) && loggable instanceof Element) {
    parent = parentProviders.get(config.parent)?.(loggable);
  }

  const loggableState = {
    impressionLogged: false,
    processed: false,
    config,
    context: resolveContext(config.context),
    veid: nextVeId(),
    parent: parent ? getLoggingState(parent) : null,
  };
  state.set(loggable, loggableState);
  return loggableState;
}

export function getLoggingState(loggable: Loggable): LoggingState|null {
  return state.get(loggable) || null;
}

export type ContextProvider = (e: Loggable|Event) => Promise<number|undefined>;
const contextProviders = new Map<string, ContextProvider>();

export function registerContextProvider(name: string, provider: ContextProvider): void {
  if (contextProviders.has(name)) {
    throw new Error(`Context provider with the name '${name} is already registered'`);
  }
  contextProviders.set(name, provider);
}

const resolveContext = (context?: string): ContextProvider => {
  if (!context) {
    return () => Promise.resolve(undefined);
  }
  const contextProvider = contextProviders.get(context);
  if (contextProvider) {
    return contextProvider;
  }
  const number = parseInt(context, 10);
  if (!isNaN(number)) {
    return () => Promise.resolve(number);
  }
  const encoder = new TextEncoder();
  const data = encoder.encode(context);
  const hash = crypto.subtle ? crypto.subtle.digest('SHA-1', data).then(x => (new DataView(x)).getUint32(0, true)) :
                               // Layout tests run in an insecure context where crypto.subtle is not available.
                               Promise.resolve(0xDEADBEEF);
  return () => hash;
};

type ParentProvider = (e: Element) => Element|undefined;
const parentProviders = new Map<string, ParentProvider>();

export function registerParentProvider(name: string, provider: ParentProvider): void {
  if (parentProviders.has(name)) {
    throw new Error(`Parent provider with the name '${name} is already registered'`);
  }
  parentProviders.set(name, provider);
}
