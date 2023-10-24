// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as AutocompleteTestRunner from './AutocompleteTestRunner.js';
import * as DebuggerTestRunner from './DebuggerTestRunner.js';
import * as EditorTestRunner from './EditorTestRunner.js';
import * as LiveEditTestRunner from './LiveEditTestRunner.js';
import * as SearchTestRunner from './SearchTestRunner.js';
import * as SourcesTestRunnerModule from './SourcesTestRunner.js';

export const SourcesTestRunner = {
  ...SourcesTestRunnerModule,
  ...DebuggerTestRunner,
  ...LiveEditTestRunner,
  ...SearchTestRunner,
  ...EditorTestRunner,
  ...AutocompleteTestRunner,
};
