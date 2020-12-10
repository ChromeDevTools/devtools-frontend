// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {goToResource} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {expandIssue, navigateToIssuesTab, revealViolatingSourcesLines} from '../helpers/issues-helpers.js';
import {waitForHighlightedLineWhichIncludesText} from '../helpers/sources-helpers.js';

describe('The Issues tab', async () => {
  // This test is failing on Windows.
  it.skip('[crbug.com/1157427]: should highlight a line in the Sources panel when the link is clicked', async () => {
    await goToResource('elements/element-reveal-inline-issue.html');

    await navigateToIssuesTab();
    await expandIssue();
    await revealViolatingSourcesLines();

    await waitForHighlightedLineWhichIncludesText('<script class="violating-script">');
  });
});
