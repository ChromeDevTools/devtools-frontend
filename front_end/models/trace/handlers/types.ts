
// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import type * as ModelHandlers from './ModelHandlers.js';
import * as Types from '../types/types.js';

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

export const enum EventCategory {
  Parse = 'Parse',
  V8 = 'V8',
  Js = 'Js',
  Gc = 'Gc',
  Layout = 'Layout',
  Paint = 'Paint',
  Load = 'Load',
  Other = 'Other',
}

export const KNOWN_EVENTS = new Map([
  /* Task/Other */
  [Types.TraceEvents.KnownEventName.Program, {category: EventCategory.Other, label: 'Other'}],
  [Types.TraceEvents.KnownEventName.RunTask, {category: EventCategory.Other, label: 'Run Task'}],
  [Types.TraceEvents.KnownEventName.AsyncTask, {category: EventCategory.Other, label: 'Async Task'}],
  /* Load */
  [Types.TraceEvents.KnownEventName.XHRLoad, {category: EventCategory.Load, label: 'Load'}],
  [Types.TraceEvents.KnownEventName.XHRReadyStateChange, {category: EventCategory.Load, label: 'ReadyStateChange'}],
  /* Parse */
  [Types.TraceEvents.KnownEventName.ParseHTML, {category: EventCategory.Parse, label: 'Parse HTML'}],
  [Types.TraceEvents.KnownEventName.ParseCSS, {category: EventCategory.Parse, label: 'Parse StyleSheet'}],
  /* V8 */
  [Types.TraceEvents.KnownEventName.CompileScript, {category: EventCategory.V8, label: 'Compile Script'}],
  [Types.TraceEvents.KnownEventName.CompileCode, {category: EventCategory.V8, label: 'Compile Code'}],
  [Types.TraceEvents.KnownEventName.CompileModule, {category: EventCategory.V8, label: 'Compile Module'}],
  [Types.TraceEvents.KnownEventName.Optimize, {category: EventCategory.V8, label: 'Optimize'}],
  [
    Types.TraceEvents.KnownEventName.WasmStreamFromResponseCallback,
    {category: EventCategory.Js, label: 'Streaming Wasm Response'},
  ],
  [Types.TraceEvents.KnownEventName.WasmCompiledModule, {category: EventCategory.Js, label: 'Compiled Wasm Module'}],
  [Types.TraceEvents.KnownEventName.WasmCachedModule, {category: EventCategory.Js, label: 'Cached Wasm Module'}],
  [Types.TraceEvents.KnownEventName.WasmModuleCacheHit, {category: EventCategory.Js, label: 'Wasm Module Cache Hit'}],
  [
    Types.TraceEvents.KnownEventName.WasmModuleCacheInvalid,
    {category: EventCategory.Js, label: 'Wasm Module Cache Invalid'},
  ],
  /* Js */
  [Types.TraceEvents.KnownEventName.RunMicrotasks, {category: EventCategory.Js, label: 'Run Microtasks'}],
  [Types.TraceEvents.KnownEventName.EvaluateScript, {category: EventCategory.Js, label: 'Evaluate Script'}],
  [Types.TraceEvents.KnownEventName.FunctionCall, {category: EventCategory.Js, label: 'Function Call'}],
  [Types.TraceEvents.KnownEventName.EventDispatch, {category: EventCategory.Js, label: 'Event'}],
  [Types.TraceEvents.KnownEventName.EvaluateModule, {category: EventCategory.Js, label: 'Evaluate Module'}],
  [Types.TraceEvents.KnownEventName.V8Execute, {category: EventCategory.Js, label: 'Execute'}],
  [
    Types.TraceEvents.KnownEventName.RequestMainThreadFrame,
    {category: EventCategory.Js, label: 'Request Main Thread Frame'},
  ],
  [
    Types.TraceEvents.KnownEventName.RequestAnimationFrame,
    {category: EventCategory.Js, label: 'Request Animation Frame'},
  ],
  [
    Types.TraceEvents.KnownEventName.CancelAnimationFrame,
    {category: EventCategory.Js, label: 'Cancel Animation Frame'},
  ],
  [Types.TraceEvents.KnownEventName.FireAnimationFrame, {category: EventCategory.Js, label: 'Animation Frame'}],
  [Types.TraceEvents.KnownEventName.RequestIdleCallback, {category: EventCategory.Js, label: 'Request Idle Callback'}],
  [Types.TraceEvents.KnownEventName.CancelIdleCallback, {category: EventCategory.Js, label: 'Cancel Idle Callback'}],
  [Types.TraceEvents.KnownEventName.FireIdleCallback, {category: EventCategory.Js, label: 'Idle Callback'}],
  [Types.TraceEvents.KnownEventName.TimerInstall, {category: EventCategory.Js, label: 'Timer Installed'}],
  [Types.TraceEvents.KnownEventName.TimerRemove, {category: EventCategory.Js, label: 'Timer Removed'}],
  [Types.TraceEvents.KnownEventName.TimerFire, {category: EventCategory.Js, label: 'Timer Fired'}],
  [Types.TraceEvents.KnownEventName.WebSocketCreate, {category: EventCategory.Js, label: 'Create WebSocket'}],
  [
    Types.TraceEvents.KnownEventName.WebSocketSendHandshake,
    {category: EventCategory.Js, label: 'Send WebSocket Handshake'},
  ],
  [
    Types.TraceEvents.KnownEventName.WebSocketReceiveHandshake,
    {category: EventCategory.Js, label: 'Receive WebSocket Handshake'},
  ],
  [Types.TraceEvents.KnownEventName.WebSocketDestroy, {category: EventCategory.Js, label: 'Destroy WebSocket'}],
  [Types.TraceEvents.KnownEventName.CryptoDoEncrypt, {category: EventCategory.Js, label: 'Crypto Encrypt'}],
  [Types.TraceEvents.KnownEventName.CryptoDoEncryptReply, {category: EventCategory.Js, label: 'Crypto Encrypt Reply'}],
  [Types.TraceEvents.KnownEventName.CryptoDoDecrypt, {category: EventCategory.Js, label: 'Crypto Decrypt'}],
  [Types.TraceEvents.KnownEventName.CryptoDoDecryptReply, {category: EventCategory.Js, label: 'Crypto Decrypt Reply'}],
  [Types.TraceEvents.KnownEventName.CryptoDoDigest, {category: EventCategory.Js, label: 'Crypto Digest'}],
  [Types.TraceEvents.KnownEventName.CryptoDoDigestReply, {category: EventCategory.Js, label: 'Crypto Digest Reply'}],
  [Types.TraceEvents.KnownEventName.CryptoDoSign, {category: EventCategory.Js, label: 'Crypto Sign'}],
  [Types.TraceEvents.KnownEventName.CryptoDoSignReply, {category: EventCategory.Js, label: 'Crypto Sign Reply'}],
  [Types.TraceEvents.KnownEventName.CryptoDoVerify, {category: EventCategory.Js, label: 'Crypto Verify'}],
  [Types.TraceEvents.KnownEventName.CryptoDoVerifyReply, {category: EventCategory.Js, label: 'Crypto Verify Reply'}],
  /* Gc */
  [Types.TraceEvents.KnownEventName.GC, {category: EventCategory.Gc, label: 'GC'}],
  [Types.TraceEvents.KnownEventName.DOMGC, {category: EventCategory.Gc, label: 'DOM GC'}],
  [Types.TraceEvents.KnownEventName.IncrementalGCMarking, {category: EventCategory.Gc, label: 'Incremental GC'}],
  [Types.TraceEvents.KnownEventName.MajorGC, {category: EventCategory.Gc, label: 'Major GC'}],
  [Types.TraceEvents.KnownEventName.MinorGC, {category: EventCategory.Gc, label: 'Minor GC'}],
  /* Layout (a.k.a "Rendering") */
  [
    Types.TraceEvents.KnownEventName.ScheduleStyleRecalculation,
    {category: EventCategory.Layout, label: 'Schedule Recalculate Style'},
  ],
  [Types.TraceEvents.KnownEventName.RecalculateStyles, {category: EventCategory.Layout, label: 'Recalculate Style'}],
  [Types.TraceEvents.KnownEventName.Layout, {category: EventCategory.Layout, label: 'Layout'}],
  [Types.TraceEvents.KnownEventName.UpdateLayoutTree, {category: EventCategory.Layout, label: 'Recalculate Style'}],
  [Types.TraceEvents.KnownEventName.InvalidateLayout, {category: EventCategory.Layout, label: 'Invalidate Layout'}],
  [
    Types.TraceEvents.KnownEventName.LayoutInvalidationTracking,
    {category: EventCategory.Layout, label: 'Layout Invalidation'},
  ],
  [
    Types.TraceEvents.KnownEventName.ComputeIntersections,
    {category: EventCategory.Paint, label: 'Compute Intersections'},
  ],
  [Types.TraceEvents.KnownEventName.HitTest, {category: EventCategory.Layout, label: 'Hit Test'}],
  [Types.TraceEvents.KnownEventName.PrePaint, {category: EventCategory.Layout, label: 'Pre-Paint'}],
  /* Paint */
  [Types.TraceEvents.KnownEventName.ScrollLayer, {category: EventCategory.Paint, label: 'Scroll'}],
  [Types.TraceEvents.KnownEventName.UpdateLayer, {category: EventCategory.Paint, label: 'Update Layer'}],
  [Types.TraceEvents.KnownEventName.PaintSetup, {category: EventCategory.Paint, label: 'Paint Setup'}],
  [Types.TraceEvents.KnownEventName.Paint, {category: EventCategory.Paint, label: 'Paint'}],
  [Types.TraceEvents.KnownEventName.PaintImage, {category: EventCategory.Paint, label: 'Paint Image'}],
  [Types.TraceEvents.KnownEventName.Commit, {category: EventCategory.Paint, label: 'Commit'}],
  [Types.TraceEvents.KnownEventName.CompositeLayers, {category: EventCategory.Paint, label: 'Composite Layers'}],
  [Types.TraceEvents.KnownEventName.RasterTask, {category: EventCategory.Paint, label: 'Raster'}],
  [Types.TraceEvents.KnownEventName.ImageDecodeTask, {category: EventCategory.Paint, label: 'Decode Image Task'}],
  [Types.TraceEvents.KnownEventName.ImageUploadTask, {category: EventCategory.Paint, label: 'Upload Image Task'}],
  [Types.TraceEvents.KnownEventName.DecodeImage, {category: EventCategory.Paint, label: 'Decode Image'}],
  [Types.TraceEvents.KnownEventName.ResizeImage, {category: EventCategory.Paint, label: 'Resize Image'}],
  [Types.TraceEvents.KnownEventName.DrawLazyPixelRef, {category: EventCategory.Paint, label: 'Draw LazyPixelRef'}],
  [Types.TraceEvents.KnownEventName.DecodeLazyPixelRef, {category: EventCategory.Paint, label: 'Decode LazyPixelRef'}],
  [Types.TraceEvents.KnownEventName.GPUTask, {category: EventCategory.Paint, label: 'GPU Task'}],
]);
