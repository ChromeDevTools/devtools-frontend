// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../test_runner/test_runner.js';
import '../../models/workspace/workspace-legacy.js';
import '../../models/breakpoints/breakpoints-legacy.js';
import '../../models/persistence/persistence-legacy.js';
import './BindingsTestRunner.js';
import './IsolatedFilesystemTestRunner.js';
import './AutomappingTestRunner.js';
import './PersistenceTestRunner.js';
import './OverridesTestRunner.js';

const {BindingsTestRunner} = self;
export {BindingsTestRunner};
