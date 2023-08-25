// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as TraceEngine from '../../models/trace/trace.js';

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

export const EventStyles = new Map([
  /* Task/Other */
  [TraceEngine.Types.TraceEvents.KnownEventName.Program, {category: EventCategory.Other, label: 'Other'}],
  [TraceEngine.Types.TraceEvents.KnownEventName.RunTask, {category: EventCategory.Other, label: 'Run Task'}],
  [TraceEngine.Types.TraceEvents.KnownEventName.AsyncTask, {category: EventCategory.Other, label: 'Async Task'}],
  /* Load */
  [TraceEngine.Types.TraceEvents.KnownEventName.XHRLoad, {category: EventCategory.Load, label: 'Load'}],
  [
    TraceEngine.Types.TraceEvents.KnownEventName.XHRReadyStateChange,
    {category: EventCategory.Load, label: 'ReadyStateChange'},
  ],
  /* Parse */
  [TraceEngine.Types.TraceEvents.KnownEventName.ParseHTML, {category: EventCategory.Parse, label: 'Parse HTML'}],
  [TraceEngine.Types.TraceEvents.KnownEventName.ParseCSS, {category: EventCategory.Parse, label: 'Parse StyleSheet'}],
  /* V8 */
  [TraceEngine.Types.TraceEvents.KnownEventName.CompileScript, {category: EventCategory.V8, label: 'Compile Script'}],
  [TraceEngine.Types.TraceEvents.KnownEventName.CompileCode, {category: EventCategory.V8, label: 'Compile Code'}],
  [TraceEngine.Types.TraceEvents.KnownEventName.CompileModule, {category: EventCategory.V8, label: 'Compile Module'}],
  [TraceEngine.Types.TraceEvents.KnownEventName.Optimize, {category: EventCategory.V8, label: 'Optimize'}],
  [
    TraceEngine.Types.TraceEvents.KnownEventName.WasmStreamFromResponseCallback,
    {category: EventCategory.Js, label: 'Streaming Wasm Response'},
  ],
  [
    TraceEngine.Types.TraceEvents.KnownEventName.WasmCompiledModule,
    {category: EventCategory.Js, label: 'Compiled Wasm Module'},
  ],
  [
    TraceEngine.Types.TraceEvents.KnownEventName.WasmCachedModule,
    {category: EventCategory.Js, label: 'Cached Wasm Module'},
  ],
  [
    TraceEngine.Types.TraceEvents.KnownEventName.WasmModuleCacheHit,
    {category: EventCategory.Js, label: 'Wasm Module Cache Hit'},
  ],
  [
    TraceEngine.Types.TraceEvents.KnownEventName.WasmModuleCacheInvalid,
    {category: EventCategory.Js, label: 'Wasm Module Cache Invalid'},
  ],
  /* Js */
  [TraceEngine.Types.TraceEvents.KnownEventName.RunMicrotasks, {category: EventCategory.Js, label: 'Run Microtasks'}],
  [TraceEngine.Types.TraceEvents.KnownEventName.EvaluateScript, {category: EventCategory.Js, label: 'Evaluate Script'}],
  [TraceEngine.Types.TraceEvents.KnownEventName.FunctionCall, {category: EventCategory.Js, label: 'Function Call'}],
  [TraceEngine.Types.TraceEvents.KnownEventName.EventDispatch, {category: EventCategory.Js, label: 'Event'}],
  [TraceEngine.Types.TraceEvents.KnownEventName.EvaluateModule, {category: EventCategory.Js, label: 'Evaluate Module'}],
  [TraceEngine.Types.TraceEvents.KnownEventName.V8Execute, {category: EventCategory.Js, label: 'Execute'}],
  [TraceEngine.Types.TraceEvents.KnownEventName.ProfileCall, {category: EventCategory.Js, label: 'JS Call'}],

  [
    TraceEngine.Types.TraceEvents.KnownEventName.RequestMainThreadFrame,
    {category: EventCategory.Js, label: 'Request Main Thread Frame'},
  ],
  [
    TraceEngine.Types.TraceEvents.KnownEventName.RequestAnimationFrame,
    {category: EventCategory.Js, label: 'Request Animation Frame'},
  ],
  [
    TraceEngine.Types.TraceEvents.KnownEventName.CancelAnimationFrame,
    {category: EventCategory.Js, label: 'Cancel Animation Frame'},
  ],
  [
    TraceEngine.Types.TraceEvents.KnownEventName.FireAnimationFrame,
    {category: EventCategory.Js, label: 'Animation Frame'},
  ],
  [
    TraceEngine.Types.TraceEvents.KnownEventName.RequestIdleCallback,
    {category: EventCategory.Js, label: 'Request Idle Callback'},
  ],
  [
    TraceEngine.Types.TraceEvents.KnownEventName.CancelIdleCallback,
    {category: EventCategory.Js, label: 'Cancel Idle Callback'},
  ],
  [TraceEngine.Types.TraceEvents.KnownEventName.FireIdleCallback, {category: EventCategory.Js, label: 'Idle Callback'}],
  [TraceEngine.Types.TraceEvents.KnownEventName.TimerInstall, {category: EventCategory.Js, label: 'Timer Installed'}],
  [TraceEngine.Types.TraceEvents.KnownEventName.TimerRemove, {category: EventCategory.Js, label: 'Timer Removed'}],
  [TraceEngine.Types.TraceEvents.KnownEventName.TimerFire, {category: EventCategory.Js, label: 'Timer Fired'}],
  [
    TraceEngine.Types.TraceEvents.KnownEventName.WebSocketCreate,
    {category: EventCategory.Js, label: 'Create WebSocket'},
  ],
  [
    TraceEngine.Types.TraceEvents.KnownEventName.WebSocketSendHandshake,
    {category: EventCategory.Js, label: 'Send WebSocket Handshake'},
  ],
  [
    TraceEngine.Types.TraceEvents.KnownEventName.WebSocketReceiveHandshake,
    {category: EventCategory.Js, label: 'Receive WebSocket Handshake'},
  ],
  [
    TraceEngine.Types.TraceEvents.KnownEventName.WebSocketDestroy,
    {category: EventCategory.Js, label: 'Destroy WebSocket'},
  ],
  [TraceEngine.Types.TraceEvents.KnownEventName.CryptoDoEncrypt, {category: EventCategory.Js, label: 'Crypto Encrypt'}],
  [
    TraceEngine.Types.TraceEvents.KnownEventName.CryptoDoEncryptReply,
    {category: EventCategory.Js, label: 'Crypto Encrypt Reply'},
  ],
  [TraceEngine.Types.TraceEvents.KnownEventName.CryptoDoDecrypt, {category: EventCategory.Js, label: 'Crypto Decrypt'}],
  [
    TraceEngine.Types.TraceEvents.KnownEventName.CryptoDoDecryptReply,
    {category: EventCategory.Js, label: 'Crypto Decrypt Reply'},
  ],
  [TraceEngine.Types.TraceEvents.KnownEventName.CryptoDoDigest, {category: EventCategory.Js, label: 'Crypto Digest'}],
  [
    TraceEngine.Types.TraceEvents.KnownEventName.CryptoDoDigestReply,
    {category: EventCategory.Js, label: 'Crypto Digest Reply'},
  ],
  [TraceEngine.Types.TraceEvents.KnownEventName.CryptoDoSign, {category: EventCategory.Js, label: 'Crypto Sign'}],
  [
    TraceEngine.Types.TraceEvents.KnownEventName.CryptoDoSignReply,
    {category: EventCategory.Js, label: 'Crypto Sign Reply'},
  ],
  [TraceEngine.Types.TraceEvents.KnownEventName.CryptoDoVerify, {category: EventCategory.Js, label: 'Crypto Verify'}],
  [
    TraceEngine.Types.TraceEvents.KnownEventName.CryptoDoVerifyReply,
    {category: EventCategory.Js, label: 'Crypto Verify Reply'},
  ],
  /* Gc */
  [TraceEngine.Types.TraceEvents.KnownEventName.GC, {category: EventCategory.Gc, label: 'GC'}],
  [TraceEngine.Types.TraceEvents.KnownEventName.DOMGC, {category: EventCategory.Gc, label: 'DOM GC'}],
  [
    TraceEngine.Types.TraceEvents.KnownEventName.IncrementalGCMarking,
    {category: EventCategory.Gc, label: 'Incremental GC'},
  ],
  [TraceEngine.Types.TraceEvents.KnownEventName.MajorGC, {category: EventCategory.Gc, label: 'Major GC'}],
  [TraceEngine.Types.TraceEvents.KnownEventName.MinorGC, {category: EventCategory.Gc, label: 'Minor GC'}],
  /* Layout (a.k.a "Rendering") */
  [
    TraceEngine.Types.TraceEvents.KnownEventName.ScheduleStyleRecalculation,
    {category: EventCategory.Layout, label: 'Schedule Recalculate Style'},
  ],
  [
    TraceEngine.Types.TraceEvents.KnownEventName.RecalculateStyles,
    {category: EventCategory.Layout, label: 'Recalculate Style'},
  ],
  [TraceEngine.Types.TraceEvents.KnownEventName.Layout, {category: EventCategory.Layout, label: 'Layout'}],
  [
    TraceEngine.Types.TraceEvents.KnownEventName.UpdateLayoutTree,
    {category: EventCategory.Layout, label: 'Recalculate Style'},
  ],
  [
    TraceEngine.Types.TraceEvents.KnownEventName.InvalidateLayout,
    {category: EventCategory.Layout, label: 'Invalidate Layout'},
  ],
  [
    TraceEngine.Types.TraceEvents.KnownEventName.LayoutInvalidationTracking,
    {category: EventCategory.Layout, label: 'Layout Invalidation'},
  ],
  [
    TraceEngine.Types.TraceEvents.KnownEventName.ComputeIntersections,
    {category: EventCategory.Paint, label: 'Compute Intersections'},
  ],
  [TraceEngine.Types.TraceEvents.KnownEventName.HitTest, {category: EventCategory.Layout, label: 'Hit Test'}],
  [TraceEngine.Types.TraceEvents.KnownEventName.PrePaint, {category: EventCategory.Layout, label: 'Pre-Paint'}],
  /* Paint */
  [TraceEngine.Types.TraceEvents.KnownEventName.ScrollLayer, {category: EventCategory.Paint, label: 'Scroll'}],
  [TraceEngine.Types.TraceEvents.KnownEventName.UpdateLayer, {category: EventCategory.Paint, label: 'Update Layer'}],
  [TraceEngine.Types.TraceEvents.KnownEventName.PaintSetup, {category: EventCategory.Paint, label: 'Paint Setup'}],
  [TraceEngine.Types.TraceEvents.KnownEventName.Paint, {category: EventCategory.Paint, label: 'Paint'}],
  [TraceEngine.Types.TraceEvents.KnownEventName.PaintImage, {category: EventCategory.Paint, label: 'Paint Image'}],
  [TraceEngine.Types.TraceEvents.KnownEventName.Commit, {category: EventCategory.Paint, label: 'Commit'}],
  [
    TraceEngine.Types.TraceEvents.KnownEventName.CompositeLayers,
    {category: EventCategory.Paint, label: 'Composite Layers'},
  ],
  [TraceEngine.Types.TraceEvents.KnownEventName.RasterTask, {category: EventCategory.Paint, label: 'Raster'}],
  [
    TraceEngine.Types.TraceEvents.KnownEventName.ImageDecodeTask,
    {category: EventCategory.Paint, label: 'Decode Image Task'},
  ],
  [
    TraceEngine.Types.TraceEvents.KnownEventName.ImageUploadTask,
    {category: EventCategory.Paint, label: 'Upload Image Task'},
  ],
  [TraceEngine.Types.TraceEvents.KnownEventName.DecodeImage, {category: EventCategory.Paint, label: 'Decode Image'}],
  [TraceEngine.Types.TraceEvents.KnownEventName.ResizeImage, {category: EventCategory.Paint, label: 'Resize Image'}],
  [
    TraceEngine.Types.TraceEvents.KnownEventName.DrawLazyPixelRef,
    {category: EventCategory.Paint, label: 'Draw LazyPixelRef'},
  ],
  [
    TraceEngine.Types.TraceEvents.KnownEventName.DecodeLazyPixelRef,
    {category: EventCategory.Paint, label: 'Decode LazyPixelRef'},
  ],
  [TraceEngine.Types.TraceEvents.KnownEventName.GPUTask, {category: EventCategory.Paint, label: 'GPU Task'}],
]);
