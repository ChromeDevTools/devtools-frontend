// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {goToResource} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {expandIssue, navigateToIssuesTab, revealViolatingSourcesLines} from '../helpers/issues-helpers.js';
import {waitForhighlightedLineWhichIncludesText} from '../helpers/sources-helpers.js';

describe('The Issues tab', async () => {
  // Flaky test
  it.skip('[crbug.com/1073406]: should highlight a line in the Sources panel when the link is clicked', async () => {
    await goToResource('elements/element-reveal-inline-issue.html');

    await navigateToIssuesTab();
    await expandIssue();
    await revealViolatingSourcesLines();

    await waitForhighlightedLineWhichIncludesText('<script class="violating-script">');
  });
});
