// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {DetachedElementsProfileType} from './HeapDetachedElementsView.js';
import {SamplingHeapProfileType} from './HeapProfileView.js';
import {HeapSnapshotProfileType, TrackingHeapSnapshotProfileType} from './HeapSnapshotView.js';

export class ProfileTypeRegistry {
  heapSnapshotProfileType: HeapSnapshotProfileType;
  samplingHeapProfileType: SamplingHeapProfileType;
  trackingHeapSnapshotProfileType: TrackingHeapSnapshotProfileType;
  detachedElementProfileType: DetachedElementsProfileType;
  constructor() {
    this.heapSnapshotProfileType = new HeapSnapshotProfileType();
    this.samplingHeapProfileType = new SamplingHeapProfileType();
    this.trackingHeapSnapshotProfileType = new TrackingHeapSnapshotProfileType();
    this.detachedElementProfileType = new DetachedElementsProfileType();
  }
}

export const instance = new ProfileTypeRegistry();
