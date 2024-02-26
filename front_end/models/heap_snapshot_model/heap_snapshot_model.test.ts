// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {describeWithEnvironment} from '../../../test/unittests/front_end/helpers/EnvironmentHelpers.js';

describeWithEnvironment('HeapSnapshotModel', () => {
  it('module can be imported', async () => {
    await import('./heap_snapshot_model.js');
  });
});
