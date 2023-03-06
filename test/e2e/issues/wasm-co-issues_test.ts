// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// Copyright 2021 The Chromium Authors. All rights reserved.

import {goToResourceWithCustomHost} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {expandIssue, getIssueByTitle, navigateToIssuesTab} from '../helpers/issues-helpers.js';

describe('Wasm cross-origin sharing issue', async () => {
  beforeEach(async () => {
    await goToResourceWithCustomHost('a.devtools.test', 'issues/wasm-co-sharing.html');
  });

  it('should be deprecated when cross-origin sharing a wasm module', async () => {
    await navigateToIssuesTab();
    await expandIssue();
    await getIssueByTitle('Deprecated Feature Used');
  });
});
