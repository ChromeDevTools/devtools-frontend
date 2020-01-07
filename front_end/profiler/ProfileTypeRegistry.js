// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @unrestricted
 */
export default class ProfileTypeRegistry {
  constructor() {
    this.cpuProfileType = new Profiler.CPUProfileType();
    this.heapSnapshotProfileType = new Profiler.HeapSnapshotProfileType();
    this.samplingHeapProfileType = new Profiler.SamplingHeapProfileType();
    this.samplingNativeHeapProfileType = new Profiler.SamplingNativeHeapProfileType();
    this.samplingNativeHeapSnapshotBrowserType = new Profiler.SamplingNativeHeapSnapshotBrowserType();
    this.samplingNativeHeapSnapshotRendererType = new Profiler.SamplingNativeHeapSnapshotRendererType();
    this.trackingHeapSnapshotProfileType = new Profiler.TrackingHeapSnapshotProfileType();
  }
}

export const instance = new ProfileTypeRegistry();

/* Legacy exported object */
self.Profiler = self.Profiler || {};

/* Legacy exported object */
Profiler = Profiler || {};

/** @constructor */
Profiler.ProfileTypeRegistry = ProfileTypeRegistry;

Profiler.ProfileTypeRegistry.instance = instance;
