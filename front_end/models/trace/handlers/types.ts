
// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import type * as Types from './../types/types.js';
import type * as ModelHandlers from './ModelHandlers.js';

export interface TraceEventHandler {
  reset(): void;
  initialize?(freshRecording?: boolean): void;
  handleEvent(data: {}): void;
  finalize?(): Promise<void>;
  data(): unknown;
  deps?(): TraceEventHandlerName[];
  handleUserConfig?(config: Types.Configuration.Configuration): void;
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
export type EnabledHandlerDataWithMeta<T extends {[key: string]: TraceEventHandler}> = {
  // We allow the user to configure which handlers are created by passing them
  // in when constructing a model instance. However, we then ensure that the
  // Meta handler is added to that, as the Model relies on some of the data
  // from the Meta handler when creating the file. Therefore, this type
  // explicitly defines that the Meta data is present, before then extending it
  // with the index type to represent all the other handlers.
  // eslint-disable-next-line @typescript-eslint/naming-convention
  Meta: Readonly<ReturnType<typeof ModelHandlers['Meta']['data']>>,
}&{
  // For every key in the object, look up the TraceEventHandler's data function
  // and use its return type as the value for the object.
  [K in keyof T]: Readonly<ReturnType<T[K]['data']>>;
};

export type HandlersWithMeta<T extends {[key: string]: TraceEventHandler}> = {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  Meta: typeof ModelHandlers.Meta,
}&{
  [K in keyof T]: T[K];
};

// Represents the final parsed data from all of the handlers. Note that because
// we are currently in the middle of the migration of data engines, not all the
// handlers are enabled. Therefore for now you should use the type defined in
// models/trace/handlers/Migration.ts, `PartialTraceData`, which
// represents the final parsed data for only the enabled handlers.
export type TraceParseData = Readonly<EnabledHandlerDataWithMeta<typeof ModelHandlers>>;

export type Handlers = typeof ModelHandlers;

export const enum HandlerState {
  UNINITIALIZED = 1,
  INITIALIZED = 2,
  FINALIZED = 3,
}
