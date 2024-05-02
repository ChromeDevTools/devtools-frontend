// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as AutomappingTestRunner from './AutomappingTestRunner.js';
import * as BindingsTestRunnerModule from './BindingsTestRunner.js';
import * as IsolatedFilesystemTestRunner from './IsolatedFilesystemTestRunner.js';
import * as OverridesTestRunner from './OverridesTestRunner.js';
import * as PersistenceTestRunner from './PersistenceTestRunner.js';

export const BindingsTestRunner = {
  ...BindingsTestRunnerModule,
  ...IsolatedFilesystemTestRunner,
  ...AutomappingTestRunner,
  ...PersistenceTestRunner,
  ...OverridesTestRunner,
};
