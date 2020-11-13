// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as HeapSnapshotModel from '../heap_snapshot_model/heap_snapshot_model.js';  // eslint-disable-line no-unused-vars

/**
 * @interface
 */
export class ChildrenProvider {
  dispose() {
  }

  /**
   * @param {number} snapshotObjectId
   * @return {!Promise<number>}
   */
  nodePosition(snapshotObjectId) {
    throw new Error('Not implemented yet');
  }

  /**
   * @return {!Promise<boolean>}
   */
  isEmpty() {
    throw new Error('Not implemented yet');
  }

  /**
   * @param {number} startPosition
   * @param {number} endPosition
   * @return {!Promise<!HeapSnapshotModel.HeapSnapshotModel.ItemsRange>}
   */
  serializeItemsRange(startPosition, endPosition) {
    throw new Error('Not implemented yet');
  }

  /**
   * @param {!HeapSnapshotModel.HeapSnapshotModel.ComparatorConfig} comparator
   * @return {!Promise<?>}
   */
  sortAndRewind(comparator) {
    throw new Error('Not implemented yet');
  }
}
