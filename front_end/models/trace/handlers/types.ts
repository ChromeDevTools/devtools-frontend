
// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export interface TraceEventHandler {
  reset(): void;
  initialize?(freshRecording?: boolean): void;
  handleEvent(data: {}): void;
  finalize?(): Promise<void>;
  data(): unknown;
  deps?(): TraceEventHandlerName[];
}
export type TraceEventHandlerName = keyof typeof ModelHandlers;

// This type maps TraceEventHandler names to the return type of their data
// function. So, for example, if we are given an object with a key of 'foo'
// and a value which is a TraceHandler containing a data() function that
// returns a string, this type will be { foo: string }.
//
// This allows us to model the behavior of the TraceProcessor in the model,
// which takes an object with TraceEventHandlers as part of its config, and
// which ultimately returns an object keyed off the names of the
// TraceEventHandlers, and with values that are derived from each
// TraceEventHandler's data function.
//
// So, concretely, we provide a TraceEventHandler for calculating the #time
// bounds of a trace called TraceBounds, whose data() function returns a
// TraceWindow. The HandlerData, therefore, would determine that the
// TraceProcessor would contain a key called 'TraceBounds' whose value is
// a TraceWindow.
export type HandlerData<T extends {[key: string]: TraceEventHandler}> = {
  // For every key in the object, look up the TraceEventHandler's data function
  // and use its return type as the value for the object.
  [K in keyof T]: ReturnType<T[K]['data']>;
};

import type * as ModelHandlers from './ModelHandlers.js';

export type TraceParseData = HandlerData<typeof ModelHandlers>;

export type Handlers = typeof ModelHandlers;

export const enum HandlerState {
  UNINITIALIZED = 1,
  INITIALIZED = 2,
  FINALIZED = 3,
}
