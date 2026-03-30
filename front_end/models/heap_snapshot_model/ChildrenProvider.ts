// Copyright 2019 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type {ComparatorConfig, ItemsRange} from './HeapSnapshotModel.js';

export interface ChildrenProvider {
  dispose(): void;
  nodePosition(snapshotObjectId: number): Promise<number>;
  isEmpty(): Promise<boolean>;
  serializeItemsRange(startPosition: number, endPosition: number): Promise<ItemsRange>;
  sortAndRewind(comparator: ComparatorConfig): Promise<void>;
}
