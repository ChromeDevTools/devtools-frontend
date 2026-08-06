// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export const UIStrings = {
  /**
   * @description Text to indicate the status of a heap snapshot in the Performance panel.
   */
  buildingEdgeIndexes: 'Building edge indexes…',
  /**
   * @description Text to indicate the status of a heap snapshot in the Performance panel.
   */
  buildingRetainers: 'Building retainers…',
  /**
   * @description Text to indicate the status of a heap snapshot in the Performance panel.
   */
  propagatingDomState: 'Propagating DOM state…',
  /**
   * @description Text to indicate the status of a heap snapshot in the Performance panel. Flag here
   * refers to the programming concept for a piece of binary data (yes/no).
   */
  calculatingNodeFlags: 'Calculating node flags…',
  /**
   * @description Text to indicate the status of a heap snapshot in the Performance panel.
   */
  calculatingDistances: 'Calculating distances…',
  /**
   * @description Text to indicate the status of a heap snapshot in the Performance panel.
   */
  calculatingShallowSizes: 'Calculating shallow sizes…',
  /**
   * @description Text to indicate the status of a heap snapshot in the Performance panel.
   */
  calculatingRetainedSizes: 'Calculating retained sizes…',
  /**
   * @description Text to indicate the status of a heap snapshot in the Performance panel.
   */
  buildingDominatedNodes: 'Building dominated nodes…',
  /**
   * @description Text to indicate the status of a heap snapshot in the Performance panel.
   * During this step, names are assigned to objects in the heap snapshot.
   */
  calculatingObjectNames: 'Calculating object names…',
  /**
   * @description Text to indicate the status of a heap snapshot in the Performance panel.
   */
  calculatingStatistics: 'Calculating statistics…',
  /**
   * @description Text to indicate the status of a heap snapshot in the Performance panel.
   */
  calculatingSamples: 'Calculating samples…',
  /**
   * @description Text to indicate the status of a heap snapshot in the Performance panel.
   */
  buildingLocations: 'Building locations…',
  /**
   * @description Text to indicate the status of a heap snapshot in the Performance panel.
   */
  calculatingNativeContextAttribution: 'Calculating native context attribution…',
  /**
   * @description Text to indicate the status of a heap snapshot in the Performance panel.
   */
  finishedProcessing: 'Finished processing.',
  /**
   * @description Text to indicate the status of a heap snapshot in the Performance panel.
   */
  buildingAllocationStatistics: 'Building allocation statistics…',
  /**
   * @description Text to indicate the status of a heap snapshot in the Performance panel.
   */
  done: 'Done',
  /**
   * @description Text in heap snapshot loader of the Memory panel when taking a heap snapshot.
   */
  processingSnapshot: 'Processing snapshot…',
  /**
   * @description Text to indicate the status of a heap snapshot in the Performance panel.
   */
  parsingStrings: 'Parsing strings…',
  /**
   * @description Text in heap snapshot loader of the Memory panel when taking a heap snapshot.
   */
  loadingSnapshotInfo: 'Loading snapshot info…',
  /**
   * @description Text in heap snapshot loader of the Memory panel when taking a heap snapshot.
   * @example {38} PH1
   */
  loadingNodesD: 'Loading nodes… {PH1}%',
  /**
   * @description Text in heap snapshot loader of the Memory panel when taking a heap snapshot.
   * @example {30} PH1
   */
  loadingEdgesD: 'Loading edges… {PH1}%',
  /**
   * @description Text in heap snapshot loader of the Memory panel when taking a heap snapshot.
   * @example {30} PH1
   */
  loadingAllocationTracesD: 'Loading allocation traces… {PH1}%',
  /**
   * @description Text in heap snapshot loader of the Memory panel when taking a heap snapshot.
   */
  loadingSamples: 'Loading samples…',
  /**
   * @description Text in heap snapshot loader of the Memory panel when taking a heap snapshot.
   */
  loadingLocations: 'Loading locations…',
  /**
   * @description Text in heap snapshot loader of the Memory panel when taking a heap snapshot.
   */
  loadingStrings: 'Loading strings…',
} as const;
