// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @unrestricted
 */
Profiler.ProfileTypeRegistry = class {
  constructor() {
    this._profileTypes = [];

    this.cpuProfileType = new Profiler.CPUProfileType();
    this._addProfileType(this.cpuProfileType);
    this.heapSnapshotProfileType = new Profiler.HeapSnapshotProfileType();
    this._addProfileType(this.heapSnapshotProfileType);
    this.samplingHeapProfileType = new Profiler.SamplingHeapProfileType();
    this._addProfileType(this.samplingHeapProfileType);
    this.trackingHeapSnapshotProfileType = new Profiler.TrackingHeapSnapshotProfileType();
    this._addProfileType(this.trackingHeapSnapshotProfileType);
  }

  /**
   * @param {!Profiler.ProfileType} profileType
   */
  _addProfileType(profileType) {
    this._profileTypes.push(profileType);
  }

  /**
   * @return {!Array.<!Profiler.ProfileType>}
   */
  profileTypes() {
    return this._profileTypes;
  }
};

Profiler.ProfileTypeRegistry.instance = new Profiler.ProfileTypeRegistry();
