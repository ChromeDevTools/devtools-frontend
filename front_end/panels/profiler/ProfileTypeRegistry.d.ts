import type { DetachedElementsProfileType } from './HeapDetachedElementsView.js';
import type { SamplingHeapProfileType } from './HeapProfileView.js';
import type { HeapSnapshotProfileType, TrackingHeapSnapshotProfileType } from './HeapSnapshotView.js';
export interface ProfileTypeRegistry {
    heapSnapshotProfileType: HeapSnapshotProfileType;
    samplingHeapProfileType: SamplingHeapProfileType;
    trackingHeapSnapshotProfileType: TrackingHeapSnapshotProfileType;
    detachedElementProfileType: DetachedElementsProfileType;
}
