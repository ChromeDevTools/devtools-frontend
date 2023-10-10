// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import {getLoggingConfig, type LoggingConfig} from './LoggingConfig.js';

export interface LoggingState {
  impressionLogged: boolean;
  config: LoggingConfig;
  veid: number;
  parent: LoggingState|null;
}

const state = new WeakMap<Element, LoggingState>();

let nextVeId = 0;

export function resetStateForTesting(): void {
  nextVeId = 0;
}

export function getLoggingState(element: Element, parent?: Element): LoggingState {
  const elementState = state.get(element) || {
    impressionLogged: false,
    config: getLoggingConfig(element),
    veid: ++nextVeId,
    parent: parent ? getLoggingState(parent) : null,
  };
  state.set(element, elementState);
  return elementState;
}
