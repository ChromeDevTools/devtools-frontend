
// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import type * as Types from './../types/types.js';
import type * as ModelHandlers from './ModelHandlers.js';

export interface Handler {
  reset(): void;
  initialize?(freshRecording?: boolean): void;
  handleEvent(data: {}): void;
  finalize?(): Promise<void>;
  data(): unknown;
  deps?(): HandlerName[];
  handleUserConfig?(config: Types.Configuration.Configuration): void;
}
export type HandlerName = keyof typeof ModelHandlers;

// This type maps Handler names to the return type of their data
// function. So, for example, if we are given an object with a key of 'foo'
// and a value which is a TraceHandler containing a data() function that
// returns a string, this type will be { foo: string }.
//
// This allows us to model the behavior of the TraceProcessor in the model,
// which takes an object with Handlers as part of its config, and
// which ultimately returns an object keyed off the names of the
// Handlers, and with values that are derived from each
// Handler's data function.
//
// So, concretely, we provide a Handler for calculating the #time
// bounds of a trace called TraceBounds, whose data() function returns a
// TraceWindow. The HandlerData, therefore, would determine that the
// TraceProcessor would contain a key called 'TraceBounds' whose value is
// a TraceWindow.
export type EnabledHandlerDataWithMeta<T extends {[key: string]: Handler}> = {
  // We allow the user to configure which handlers are created by passing them
  // in when constructing a model instance. However, we then ensure that the
  // Meta handler is added to that, as the Model relies on some of the data
  // from the Meta handler when creating the file. Therefore, this type
  // explicitly defines that the Meta data is present, before then extending it
  // with the index type to represent all the other handlers.
  // eslint-disable-next-line @typescript-eslint/naming-convention
  Meta: Readonly<ReturnType<typeof ModelHandlers['Meta']['data']>>,
}&{
  // For every key in the object, look up the Handler's data function
  // and use its return type as the value for the object.
  [K in keyof T]: Readonly<ReturnType<T[K]['data']>>;
};

export type HandlersWithMeta<T extends {[key: string]: Handler}> = {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  Meta: typeof ModelHandlers.Meta,
}&{
  [K in keyof T]: T[K];
};

// Represents the final parsed data from all of the handlers. If you instantiate a
// TraceProcessor with a subset of handlers, you should instead use
// `EnabledHandlerDataWithMeta<>`.
export type ParsedTrace = Readonly<EnabledHandlerDataWithMeta<typeof ModelHandlers>>;

type DeepWriteable<T> = {
  -readonly[P in keyof T]: DeepWriteable<T[P]>
};
export type ParsedTraceMutable = DeepWriteable<ParsedTrace>;

export type Handlers = typeof ModelHandlers;

export const enum HandlerState {
  UNINITIALIZED = 1,
  INITIALIZED = 2,
  FINALIZED = 3,
}
