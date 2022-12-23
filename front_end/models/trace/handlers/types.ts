
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
  [K in keyof T]: Readonly<ReturnType<T[K]['data']>>;
};

import type * as ModelHandlers from './ModelHandlers.js';

export type TraceParseData = Readonly<HandlerData<typeof ModelHandlers>>;

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

export const enum KnownEventName {
  /* Task/Other */
  Program = 'Program',
  RunTask = 'RunTask',
  AsyncTask = 'AsyncTask',
  /* Load */
  XHRLoad = 'XHRLoad',
  XHRReadyStateChange = 'XHRReadyStateChange',
  /* Parse */
  ParseHTML = 'ParseHTML',
  ParseCSS = 'ParseAuthorStyleSheet',
  /* V8 */
  CompileScript = 'V8.CompileScript',
  CompileCode = 'V8.CompileCode',
  CompileModule = 'V8.CompileModule',
  Optimize = 'V8.OptimizeCode',
  WasmStreamFromResponseCallback = 'v8.wasm.streamFromResponseCallback',
  WasmCompiledModule = 'v8.wasm.compiledModule',
  WasmCachedModule = 'v8.wasm.cachedModule',
  WasmModuleCacheHit = 'v8.wasm.moduleCacheHit',
  WasmModuleCacheInvalid = 'v8.wasm.moduleCacheInvalid',
  /* Js */
  RunMicrotasks = 'RunMicrotasks',
  EvaluateScript = 'EvaluateScript',
  FunctionCall = 'FunctionCall',
  EventDispatch = 'EventDispatch',
  RequestMainThreadFrame = 'RequestMainThreadFrame',
  RequestAnimationFrame = 'RequestAnimationFrame',
  CancelAnimationFrame = 'CancelAnimationFrame',
  FireAnimationFrame = 'FireAnimationFrame',
  RequestIdleCallback = 'RequestIdleCallback',
  CancelIdleCallback = 'CancelIdleCallback',
  FireIdleCallback = 'FireIdleCallback',
  TimerInstall = 'TimerInstall',
  TimerRemove = 'TimerRemove',
  TimerFire = 'TimerFire',
  WebSocketCreate = 'WebSocketCreate',
  WebSocketSendHandshake = 'WebSocketSendHandshakeRequest',
  WebSocketReceiveHandshake = 'WebSocketReceiveHandshakeResponse',
  WebSocketDestroy = 'WebSocketDestroy',
  CryptoDoEncrypt = 'DoEncrypt',
  CryptoDoEncryptReply = 'DoEncryptReply',
  CryptoDoDecrypt = 'DoDecrypt',
  CryptoDoDecryptReply = 'DoDecryptReply',
  CryptoDoDigest = 'DoDigest',
  CryptoDoDigestReply = 'DoDigestReply',
  CryptoDoSign = 'DoSign',
  CryptoDoSignReply = 'DoSignReply',
  CryptoDoVerify = 'DoVerify',
  CryptoDoVerifyReply = 'DoVerifyReply',
  /* Gc */
  GC = 'GCEvent',
  DOMGC = 'BlinkGC.AtomicPhase',
  IncrementalGCMarking = 'V8.GCIncrementalMarking',
  MajorGC = 'MajorGC',
  MinorGC = 'MinorGC',
  /* Layout (a.k.a "Rendering") */
  ScheduleStyleRecalculation = 'ScheduleStyleRecalculation',
  RecalculateStyles = 'RecalculateStyles',
  Layout = 'Layout',
  UpdateLayoutTree = 'UpdateLayoutTree',
  InvalidateLayout = 'InvalidateLayout',
  LayoutInvalidationTracking = 'LayoutInvalidationTracking',
  ComputeIntersections = 'ComputeIntersections',
  HitTest = 'HitTest',
  PrePaint = 'PrePaint',
  /* Paint */
  ScrollLayer = 'ScrollLayer',
  UpdateLayer = 'UpdateLayer',
  PaintSetup = 'PaintSetup',
  Paint = 'Paint',
  PaintImage = 'PaintImage',
  Commit = 'Commit',
  CompositeLayers = 'CompositeLayers',
  RasterTask = 'RasterTask',
  ImageDecodeTask = 'ImageDecodeTask',
  ImageUploadTask = 'ImageUploadTask',
  DecodeImage = 'Decode Image',
  ResizeImage = 'Resize Image',
  DrawLazyPixelRef = 'Draw LazyPixelRef',
  DecodeLazyPixelRef = 'Decode LazyPixelRef',
  GPUTask = 'GPUTask',
}

export const KNOWN_EVENTS = new Map([
  /* Task/Other */
  [KnownEventName.Program, {category: EventCategory.Other, label: 'Other'}],
  [KnownEventName.RunTask, {category: EventCategory.Other, label: 'Run Task'}],
  [KnownEventName.AsyncTask, {category: EventCategory.Other, label: 'Async Task'}],
  /* Load */
  [KnownEventName.XHRLoad, {category: EventCategory.Load, label: 'Load'}],
  [KnownEventName.XHRReadyStateChange, {category: EventCategory.Load, label: 'ReadyStateChange'}],
  /* Parse */
  [KnownEventName.ParseHTML, {category: EventCategory.Parse, label: 'Parse HTML'}],
  [KnownEventName.ParseCSS, {category: EventCategory.Parse, label: 'Parse StyleSheet'}],
  /* V8 */
  [KnownEventName.CompileScript, {category: EventCategory.V8, label: 'Compile Script'}],
  [KnownEventName.CompileCode, {category: EventCategory.V8, label: 'Compile Code'}],
  [KnownEventName.CompileModule, {category: EventCategory.V8, label: 'Compile Module'}],
  [KnownEventName.Optimize, {category: EventCategory.V8, label: 'Optimize'}],
  [KnownEventName.WasmStreamFromResponseCallback, {category: EventCategory.Js, label: 'Streaming Wasm Response'}],
  [KnownEventName.WasmCompiledModule, {category: EventCategory.Js, label: 'Compiled Wasm Module'}],
  [KnownEventName.WasmCachedModule, {category: EventCategory.Js, label: 'Cached Wasm Module'}],
  [KnownEventName.WasmModuleCacheHit, {category: EventCategory.Js, label: 'Wasm Module Cache Hit'}],
  [KnownEventName.WasmModuleCacheInvalid, {category: EventCategory.Js, label: 'Wasm Module Cache Invalid'}],
  /* Js */
  [KnownEventName.RunMicrotasks, {category: EventCategory.Js, label: 'Run Microtasks'}],
  [KnownEventName.EvaluateScript, {category: EventCategory.Js, label: 'Evaluate Script'}],
  [KnownEventName.FunctionCall, {category: EventCategory.Js, label: 'Function Call'}],
  [KnownEventName.EventDispatch, {category: EventCategory.Js, label: 'Event'}],
  [KnownEventName.RequestMainThreadFrame, {category: EventCategory.Js, label: 'Request Main Thread Frame'}],
  [KnownEventName.RequestAnimationFrame, {category: EventCategory.Js, label: 'Request Animation Frame'}],
  [KnownEventName.CancelAnimationFrame, {category: EventCategory.Js, label: 'Cancel Animation Frame'}],
  [KnownEventName.FireAnimationFrame, {category: EventCategory.Js, label: 'Animation Frame'}],
  [KnownEventName.RequestIdleCallback, {category: EventCategory.Js, label: 'Request Idle Callback'}],
  [KnownEventName.CancelIdleCallback, {category: EventCategory.Js, label: 'Cancel Idle Callback'}],
  [KnownEventName.FireIdleCallback, {category: EventCategory.Js, label: 'Idle Callback'}],
  [KnownEventName.TimerInstall, {category: EventCategory.Js, label: 'Timer Installed'}],
  [KnownEventName.TimerRemove, {category: EventCategory.Js, label: 'Timer Removed'}],
  [KnownEventName.TimerFire, {category: EventCategory.Js, label: 'Timer Fired'}],
  [KnownEventName.WebSocketCreate, {category: EventCategory.Js, label: 'Create WebSocket'}],
  [KnownEventName.WebSocketSendHandshake, {category: EventCategory.Js, label: 'Send WebSocket Handshake'}],
  [KnownEventName.WebSocketReceiveHandshake, {category: EventCategory.Js, label: 'Receive WebSocket Handshake'}],
  [KnownEventName.WebSocketDestroy, {category: EventCategory.Js, label: 'Destroy WebSocket'}],
  [KnownEventName.CryptoDoEncrypt, {category: EventCategory.Js, label: 'Crypto Encrypt'}],
  [KnownEventName.CryptoDoEncryptReply, {category: EventCategory.Js, label: 'Crypto Encrypt Reply'}],
  [KnownEventName.CryptoDoDecrypt, {category: EventCategory.Js, label: 'Crypto Decrypt'}],
  [KnownEventName.CryptoDoDecryptReply, {category: EventCategory.Js, label: 'Crypto Decrypt Reply'}],
  [KnownEventName.CryptoDoDigest, {category: EventCategory.Js, label: 'Crypto Digest'}],
  [KnownEventName.CryptoDoDigestReply, {category: EventCategory.Js, label: 'Crypto Digest Reply'}],
  [KnownEventName.CryptoDoSign, {category: EventCategory.Js, label: 'Crypto Sign'}],
  [KnownEventName.CryptoDoSignReply, {category: EventCategory.Js, label: 'Crypto Sign Reply'}],
  [KnownEventName.CryptoDoVerify, {category: EventCategory.Js, label: 'Crypto Verify'}],
  [KnownEventName.CryptoDoVerifyReply, {category: EventCategory.Js, label: 'Crypto Verify Reply'}],
  /* Gc */
  [KnownEventName.GC, {category: EventCategory.Gc, label: 'GC'}],
  [KnownEventName.DOMGC, {category: EventCategory.Gc, label: 'DOM GC'}],
  [KnownEventName.IncrementalGCMarking, {category: EventCategory.Gc, label: 'Incremental GC'}],
  [KnownEventName.MajorGC, {category: EventCategory.Gc, label: 'Major GC'}],
  [KnownEventName.MinorGC, {category: EventCategory.Gc, label: 'Minor GC'}],
  /* Layout (a.k.a "Rendering") */
  [KnownEventName.ScheduleStyleRecalculation, {category: EventCategory.Layout, label: 'Schedule Recalculate Style'}],
  [KnownEventName.RecalculateStyles, {category: EventCategory.Layout, label: 'Recalculate Style'}],
  [KnownEventName.Layout, {category: EventCategory.Layout, label: 'Layout'}],
  [KnownEventName.UpdateLayoutTree, {category: EventCategory.Layout, label: 'Recalculate Style'}],
  [KnownEventName.InvalidateLayout, {category: EventCategory.Layout, label: 'Invalidate Layout'}],
  [KnownEventName.LayoutInvalidationTracking, {category: EventCategory.Layout, label: 'Layout Invalidation'}],
  [KnownEventName.ComputeIntersections, {category: EventCategory.Paint, label: 'Compute Intersections'}],
  [KnownEventName.HitTest, {category: EventCategory.Layout, label: 'Hit Test'}],
  [KnownEventName.PrePaint, {category: EventCategory.Layout, label: 'Pre-Paint'}],
  /* Paint */
  [KnownEventName.ScrollLayer, {category: EventCategory.Paint, label: 'Scroll'}],
  [KnownEventName.UpdateLayer, {category: EventCategory.Paint, label: 'Update Layer'}],
  [KnownEventName.PaintSetup, {category: EventCategory.Paint, label: 'Paint Setup'}],
  [KnownEventName.Paint, {category: EventCategory.Paint, label: 'Paint'}],
  [KnownEventName.PaintImage, {category: EventCategory.Paint, label: 'Paint Image'}],
  [KnownEventName.Commit, {category: EventCategory.Paint, label: 'Commit'}],
  [KnownEventName.CompositeLayers, {category: EventCategory.Paint, label: 'Composite Layers'}],
  [KnownEventName.RasterTask, {category: EventCategory.Paint, label: 'Raster'}],
  [KnownEventName.ImageDecodeTask, {category: EventCategory.Paint, label: 'Decode Image Task'}],
  [KnownEventName.ImageUploadTask, {category: EventCategory.Paint, label: 'Upload Image Task'}],
  [KnownEventName.DecodeImage, {category: EventCategory.Paint, label: 'Decode Image'}],
  [KnownEventName.ResizeImage, {category: EventCategory.Paint, label: 'Resize Image'}],
  [KnownEventName.DrawLazyPixelRef, {category: EventCategory.Paint, label: 'Draw LazyPixelRef'}],
  [KnownEventName.DecodeLazyPixelRef, {category: EventCategory.Paint, label: 'Decode LazyPixelRef'}],
  [KnownEventName.GPUTask, {category: EventCategory.Paint, label: 'GPU Task'}],
]);
