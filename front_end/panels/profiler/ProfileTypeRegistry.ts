// Copyright 2014 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type {DetachedElementsProfileType} from './HeapDetachedElementsView.js';
import type {SamplingHeapProfileType} from './HeapProfileView.js';
import type {HeapSnapshotProfileType, TrackingHeapSnapshotProfileType} from './HeapSnapshotView.js';

export interface ProfileTypeRegistry {
  heapSnapshotProfileType: HeapSnapshotProfileType;
  samplingHeapProfileType: SamplingHeapProfileType;
  trackingHeapSnapshotProfileType: TrackingHeapSnapshotProfileType;
  detachedElementProfileType: DetachedElementsProfileType;
}
